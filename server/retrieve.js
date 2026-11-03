/* Picks the passages an answer should rest on.
   1. Entities named in the question (and in the previous question, for
      follow-ups) come first.
   2. BM25 over every paragraph adds the entries the wording points to.
   3. Each chosen entry contributes its opening paragraph plus its best
      matching paragraphs, within a character budget.
   Every sentence gets a short id (S1, S2, ...) the model cites by, so a
   quote is always verbatim and can be marked in the article. */
'use strict';
const { tokenize } = require('./corpus');

const MAX_ENTITIES = 7;
const PER_ENTITY = { en: 3200, zh: 1500 };
const TOTAL = { en: 18000, zh: 8500 };

// Names that usually mean the novel itself, not the entry of that name.
const GENERIC = new Set(['the book', 'book', '书', '这本书', 'the novel']);

function namedIn(corpus, text) {
  const lower = String(text || '').toLowerCase();
  const hits = [];
  for (const ent of corpus.entities.values()) {
    let best = 0;
    for (const alias of ent.aliases) {
      if (GENERIC.has(alias)) continue;
      const at = lower.indexOf(alias);
      if (at < 0) continue;
      // Latin names must stand as words.
      if (/^[a-z0-9]/.test(alias)) {
        const before = lower[at - 1];
        const after = lower[at + alias.length];
        if ((before && /[a-z0-9]/.test(before)) || (after && /[a-z0-9]/.test(after))) continue;
      }
      // The whole name beats a part of it ("Winston" names the character
      // more than the event "Winston buys a diary"); longer beats shorter.
      const full = alias === ent.name.en.toLowerCase() || alias === ent.name.zh.toLowerCase();
      best = Math.max(best, alias.length + (full ? 100 : 0));
    }
    if (best) hits.push({ id: ent.id, len: best + (/^(Characters|Locations)$/.test(ent.type) ? 10 : 0) });
  }
  hits.sort((a, b) => b.len - a.len);
  return hits.map((h) => h.id);
}

// Reciprocal rank fusion: a paragraph near the top of either list ranks
// well, without having to calibrate BM25 scores against cosine similarity.
function fuse(lists, k = 60, depth = 60) {
  const out = new Array(lists[0].length).fill(0);
  for (const list of lists) {
    if (!list) continue;
    list.map((s, i) => [s, i]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, depth)
      .forEach(([, i], rank) => { out[i] += 1 / (k + rank + 1); });
  }
  return out;
}

/* vector: optional similarity of every paragraph to the question (see
   vectors.js). Without it, retrieval is BM25 alone. */
function retrieve(corpus, { question, previous = '', lang = 'en', vector = null }) {
  const { index, entities } = corpus;
  const { chunks, bm } = index[lang];
  const lexical = bm.scores([...tokenize(question), ...tokenize(question), ...tokenize(previous)]);
  const scores = vector ? fuse([lexical, vector]) : lexical;

  const named = namedIn(corpus, question);
  const namedBefore = namedIn(corpus, previous).filter((id) => !named.includes(id));

  // Entity score: its best paragraph plus a share of the rest.
  const byEntity = new Map();
  chunks.forEach((c, i) => {
    const s = scores[i];
    if (!s) return;
    const cur = byEntity.get(c.entity) || { best: 0, sum: 0 };
    cur.best = Math.max(cur.best, s);
    cur.sum += s;
    byEntity.set(c.entity, cur);
  });
  const ranked = [...byEntity.entries()]
    .map(([id, v]) => ({ id, score: v.best + 0.15 * v.sum }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.id);

  const chosen = [];
  const add = (id) => { if (id && !chosen.includes(id) && entities.has(id) && chosen.length < MAX_ENTITIES) chosen.push(id); };
  named.slice(0, 4).forEach(add);
  namedBefore.slice(0, 2).forEach(add);
  ranked.forEach(add);

  // Paragraphs per entity: the opening one, then the best scoring.
  let budget = TOTAL[lang];
  const passages = [];
  for (const id of chosen) {
    const own = chunks
      .map((c, i) => ({ c, s: scores[i] }))
      .filter((x) => x.c.entity === id);
    if (!own.length) continue;
    const first = own.find((x) => x.c.i === 0) || own[0];
    const rest = own.filter((x) => x !== first).sort((a, b) => b.s - a.s);
    const picked = [first];
    let size = first.c.text.length;
    const cap = Math.min(PER_ENTITY[lang] * (named.includes(id) ? 1.5 : 1), budget);
    for (const x of rest) {
      if (x.s <= 0) break;
      if (size + x.c.text.length > cap) continue;
      picked.push(x);
      size += x.c.text.length;
    }
    if (size > budget && passages.length) break;
    budget -= size;
    picked.sort((a, b) => a.c.i - b.c.i);
    passages.push({ entity: id, paragraphs: picked.map((x) => x.c) });
  }

  // Close neighbours the answer may name or draw without quoting.
  const nearby = [];
  for (const id of chosen.slice(0, 3)) {
    for (const n of entities.get(id).neighbors) {
      if (!chosen.includes(n) && !nearby.includes(n)) nearby.push(n);
    }
  }
  return { chosen: passages.map((p) => p.entity), passages, nearby: nearby.slice(0, 40) };
}

/* Numbers the entities (E1...) and sentences (S1...) and keeps the tables to
   turn them back into ids and quotes. */
function buildContext(corpus, retrieval, lang) {
  const { entities } = corpus;
  const entityKeys = new Map();
  const keyToEntity = new Map();
  const sentences = new Map();
  const keyFor = (id) => {
    if (!entityKeys.has(id)) {
      const key = `E${entityKeys.size + 1}`;
      entityKeys.set(id, key);
      keyToEntity.set(key, id);
    }
    return entityKeys.get(id);
  };
  const lines = [];
  let n = 0;
  for (const p of retrieval.passages) {
    const ent = entities.get(p.entity);
    lines.push(`### [${keyFor(ent.id)}] ${ent.name[lang]}${ent.typeName[lang] ? ` (${ent.typeName[lang]})` : ''}`);
    let lastHeading = null;
    for (const para of p.paragraphs) {
      if (para.heading && para.heading !== lastHeading) lines.push(`## ${para.heading}`);
      lastHeading = para.heading;
      const sents = ent.paragraphs[para.lang][para.i].sentences;
      for (const s of sents) {
        n += 1;
        const sid = `S${n}`;
        sentences.set(sid, { entity: ent.id, text: s });
        lines.push(`${sid}: ${s}`);
      }
    }
    lines.push('');
  }
  const others = retrieval.nearby.map((id) => `[${keyFor(id)}] ${entities.get(id).name[lang]}`);
  return {
    text: lines.join('\n'),
    others: others.join('; '),
    keyToEntity,
    sentences
  };
}

module.exports = { retrieve, buildContext, namedIn, fuse };
