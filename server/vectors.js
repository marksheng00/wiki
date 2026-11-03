/* Vector side of retrieval. Paragraph embeddings are built once by
   `npm run embeddings` (tools/build-embeddings.js) and committed as
   server/embeddings/<lang>.bin (int8, L2-normalised) with a .json index.
   At question time only the question is embedded, one short NIM call. */
'use strict';
const fs = require('fs');
const path = require('path');

const ENDPOINT = process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const EMBED_MODEL = process.env.NIM_EMBED_MODEL || 'nvidia/nemotron-3.5-embed-1b';
const DIR = path.join(__dirname, 'embeddings');

// One string per paragraph: the entry's name and section give it context.
function passageText(corpus, chunk, lang) {
  const ent = corpus.entities.get(chunk.entity);
  return `${ent.name[lang] || ent.name.en}${chunk.heading ? ` - ${chunk.heading}` : ''}\n${chunk.text}`.slice(0, 6000);
}
const chunkKey = (c) => `${c.entity}#${c.lang}#${c.i}`;

async function embed(texts, inputType, { signal, model = EMBED_MODEL } = {}) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error('NVIDIA_API_KEY is not set');
  const res = await fetch(`${ENDPOINT}/embeddings`, {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: texts, input_type: inputType, encoding_format: 'float', truncate: 'END' })
  });
  if (!res.ok) throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json.data.sort((a, b) => a.index - b.index).map((d) => normalise(d.embedding));
}
function normalise(v) {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return Float32Array.from(v, (x) => x / n);
}
const toInt8 = (v) => Int8Array.from(v, (x) => Math.max(-127, Math.min(127, Math.round(x * 127))));

// Loads the committed vectors for a language and lines them up with the
// corpus chunks. Chunks without a vector (articles changed since the build)
// simply rank by BM25 alone.
function load(corpus, lang) {
  const meta = path.join(DIR, `${lang}.json`);
  const bin = path.join(DIR, `${lang}.bin`);
  if (!fs.existsSync(meta) || !fs.existsSync(bin)) return null;
  const info = JSON.parse(fs.readFileSync(meta, 'utf8'));
  if (info.model !== EMBED_MODEL) return null;
  const data = new Int8Array(fs.readFileSync(bin).buffer.slice(0));
  const at = new Map(info.keys.map((k, i) => [k, i]));
  const rows = corpus.index[lang].chunks.map((c) => {
    const i = at.get(chunkKey(c));
    return i === undefined || info.hashes[i] !== hash(passageText(corpus, c, lang)) ? null : data.subarray(i * info.dim, (i + 1) * info.dim);
  });
  return { dim: info.dim, rows, missing: rows.filter((r) => !r).length };
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

function scores(table, query) {
  return table.rows.map((row) => {
    if (!row) return -1;
    let s = 0;
    for (let i = 0; i < row.length; i += 1) s += row[i] * query[i];
    return s / 127;
  });
}

module.exports = { embed, load, scores, passageText, chunkKey, hash, toInt8, EMBED_MODEL, DIR };
