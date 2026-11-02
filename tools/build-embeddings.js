/* Embeds every paragraph of every entry, for both languages, and writes
   server/embeddings/<lang>.{bin,json}. Re-run after the articles change:
     npm run embeddings
   Unchanged paragraphs are reused, so a re-run only embeds what changed. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch { /* use the environment */ }
const { build } = require('../server/corpus');
const V = require('../server/vectors');

const BATCH = 32;

(async () => {
  const corpus = build();
  fs.mkdirSync(V.DIR, { recursive: true });
  for (const lang of ['en', 'zh']) {
    const chunks = corpus.index[lang].chunks;
    const texts = chunks.map((c) => V.passageText(corpus, c, lang));
    const hashes = texts.map(V.hash);
    const keys = chunks.map(V.chunkKey);
    // Reuse vectors whose paragraph text is unchanged.
    const old = new Map();
    try {
      const info = JSON.parse(fs.readFileSync(path.join(V.DIR, `${lang}.json`), 'utf8'));
      if (info.model === V.EMBED_MODEL) {
        const data = new Int8Array(fs.readFileSync(path.join(V.DIR, `${lang}.bin`)).buffer.slice(0));
        info.keys.forEach((k, i) => old.set(`${k}|${info.hashes[i]}`, data.subarray(i * info.dim, (i + 1) * info.dim)));
      }
    } catch { /* first build */ }
    const rows = keys.map((k, i) => old.get(`${k}|${hashes[i]}`) || null);
    const todo = rows.map((r, i) => (r ? -1 : i)).filter((i) => i >= 0);
    console.log(`${lang}: ${chunks.length} paragraphs, ${todo.length} to embed with ${V.EMBED_MODEL}`);
    for (let b = 0; b < todo.length; b += BATCH) {
      const ids = todo.slice(b, b + BATCH);
      let vecs;
      for (let tryNo = 1; ; tryNo += 1) {
        try { vecs = await V.embed(ids.map((i) => texts[i]), 'passage'); break; } catch (e) {
          if (tryNo >= 4) throw e;
          console.warn(`  retry ${tryNo}: ${e.message}`);
          await new Promise((r) => setTimeout(r, 2000 * tryNo));
        }
      }
      ids.forEach((i, j) => { rows[i] = V.toInt8(vecs[j]); });
      process.stdout.write(`  ${Math.min(b + BATCH, todo.length)}/${todo.length}\r`);
    }
    const dim = rows[0].length;
    const out = new Int8Array(rows.length * dim);
    rows.forEach((r, i) => out.set(r, i * dim));
    fs.writeFileSync(path.join(V.DIR, `${lang}.bin`), Buffer.from(out.buffer));
    fs.writeFileSync(path.join(V.DIR, `${lang}.json`), JSON.stringify({ model: V.EMBED_MODEL, dim, keys, hashes }));
    console.log(`\n${lang}: wrote ${rows.length} x ${dim}`);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
