/* Readipedia server: the static site plus the assistant API.
   No dependencies; Node 20.12+.

     POST /api/ask   { question, lang: "en"|"zh", history?: [{q, a}] }
                     -> text/event-stream of JSON events (see README)
     GET  /api/health

   The NVIDIA key is read from the environment (NVIDIA_API_KEY) or a local
   .env file, and never leaves the server. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch { /* no .env: use the real environment */ }

const { build } = require('./corpus');
const { retrieve, buildContext } = require('./retrieve');
const { messages } = require('./prompt');
const { chat, MODEL, THINKING } = require('./llm');
const { AnswerStream } = require('./answer');

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '127.0.0.1';
const SERVE_STATIC = process.env.SERVE_STATIC !== '0';
const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const RATE = { max: Number(process.env.RATE_LIMIT || 20), windowMs: 10 * 60 * 1000 };

const corpus = build();
console.log(`[assistant] ${corpus.entities.size} entries indexed, model ${MODEL}${process.env.NVIDIA_API_KEY ? '' : ' (NVIDIA_API_KEY missing)'}`);

/* ---------- small helpers ---------- */
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < RATE.windowMs)) hits.delete(k);
  return list.length > RATE.max;
}
function clientIp(req) {
  const fwd = process.env.TRUST_PROXY === '1' ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
  return fwd || req.socket.remoteAddress || '';
}
function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && (ORIGINS.includes('*') || ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}
function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else parts.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
const plainAnswer = (a) => String(a || '').replace(/\[\d+\]/g, '').replace(/\{@[^|}]+\|([^}]+)\}/g, '$1');

/* ---------- /api/ask ---------- */
async function ask(req, res) {
  if (limited(clientIp(req))) return json(res, 429, { error: 'rate_limited' });
  let body;
  try { body = await readJson(req); } catch { return json(res, 400, { error: 'bad_request' }); }
  const question = String(body.question || '').trim().slice(0, 500);
  const lang = body.lang === 'zh' ? 'zh' : 'en';
  if (!question) return json(res, 400, { error: 'empty_question' });
  const history = Array.isArray(body.history)
    ? body.history.slice(-3).map((t) => ({ q: String(t?.q || '').slice(0, 500), a: plainAnswer(t?.a).slice(0, 1500) }))
    : [];

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  const emit = (event) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`); };
  const abort = new AbortController();
  res.on('close', () => abort.abort());
  let timedOut = false;
  const limit = setTimeout(() => { timedOut = true; abort.abort(); }, Number(process.env.ANSWER_TIMEOUT_MS || 300000));
  const started = Date.now();
  // Keep the stream alive through long thinking: proxies in front of hosts
  // like Render drop a connection that stays silent for about 100 seconds.
  const ping = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 10000);

  try {
    const previous = history.length ? history[history.length - 1].q : '';
    const found = retrieve(corpus, { question, previous, lang });
    const ctx = buildContext(corpus, found, lang);
    emit({ type: 'read', entities: found.chosen.map((id) => ({ id, name: corpus.entities.get(id).name[lang] })) });

    const stream = new AnswerStream({ ctx, corpus, lang, emit });
    const msgs = messages({ question, history, ctx, background: corpus.book[lang], lang, bookTitle: corpus.bookTitle });
    let first = 0;
    let thinking = false;
    // A busy or failing upstream is retried once, as long as nothing has
    // reached the reader yet.
    for (let attempt = 1; ; attempt += 1) {
      try {
        for await (const piece of chat(msgs, { signal: abort.signal })) {
          if (piece === THINKING) {
            if (!thinking && !first) emit({ type: 'thinking' });
            thinking = true;
            continue;
          }
          if (!first) first = Date.now();
          stream.push(piece);
        }
        break;
      } catch (err) {
        const retriable = !first && attempt < 2 && !abort.signal.aborted && err.code !== 'no_key'
          && (!err.status || err.status === 429 || err.status >= 500);
        if (!retriable) throw err;
        console.warn('[assistant] retrying after:', err.message);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    stream.end();
    emit({ type: 'done' });
    if (process.env.ASSISTANT_LOG_RAW === '1') console.log(`[assistant] raw output:\n${stream.raw || ''}\n[assistant] end of raw output`);
    console.log(`[assistant] ${lang} ${JSON.stringify(question.slice(0, 60))} first ${first ? first - started : '-'}ms total ${Date.now() - started}ms cites ${stream.cites.size}`);
  } catch (err) {
    if (abort.signal.aborted && !timedOut) return;
    if (timedOut) err = Object.assign(new Error('answer timed out'), { code: 'timeout' });
    console.error('[assistant] error:', err.code || '', err.message);
    emit({ type: 'error', error: err.code === 'no_key' ? 'not_configured' : 'upstream' });
  } finally {
    clearInterval(ping);
    clearTimeout(limit);
    res.end();
  }
}

/* ---------- static files ---------- */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.pdf': 'application/pdf'
};
function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return json(res, 400, { error: 'bad_path' }); }
  const parts = rel.split('/').filter(Boolean);
  // Never serve dotfiles (.env, .git) or the server's own code.
  if (parts.some((p) => p.startsWith('.')) || ['server', 'node_modules'].includes(parts[0])) return json(res, 404, { error: 'not_found' });
  let file = path.join(ROOT, ...parts);
  if (!file.startsWith(ROOT)) return json(res, 404, { error: 'not_found' });
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) { file = path.join(file, 'index.html'); }
    fs.stat(file, (err2, st2) => {
      if (err2 || !st2.isFile()) return json(res, 404, { error: 'not_found' });
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st2.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname.startsWith('/api/')) {
    cors(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (pathname === '/api/ask' && req.method === 'POST') return ask(req, res);
    if (pathname === '/api/health') return json(res, 200, { ok: true, model: MODEL, configured: Boolean(process.env.NVIDIA_API_KEY) });
    return json(res, 404, { error: 'not_found' });
  }
  if (SERVE_STATIC && (req.method === 'GET' || req.method === 'HEAD')) return serveStatic(req, res, pathname);
  return json(res, 404, { error: 'not_found' });
});
server.listen(PORT, HOST, () => console.log(`[assistant] http://${HOST}:${PORT}`));
