/* The book as the assistant sees it: every entity article, split into
   paragraphs and sentences, with a small BM25 index over the paragraphs.
   The data files are the same ones the site loads, read as-is. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['data/wiki_store.js', 'data/wiki_store_zh.js', 'data/wiki_articles_zh.js'];

function loadWindow() {
  const window = {};
  const ctx = vm.createContext({ window });
  for (const file of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
  return window;
}

// Same cleanup app.js applies before rendering an entry, then markdown to
// plain text so a quoted sentence matches what the reader sees.
function cleanMarkdown(md) {
  return String(md || '')
    .replace(/^#\s+[^\n]+\n*/, '')
    .replace(/>\s+\*\*分类\/标签\*\*:[^\n]*\n*/gi, '')
    .replace(/>\s+\*\*源文件\*\*:[^\n]*\n*/gi, '')
    .replace(/^---\s*\n*/gm, '')
    .replace(/^#\s+[^\n]+\n*/, '')
    .replace(/##\s+(Related StoryFlow|相关\s*(StoryFlow|故事)[^\n]*)[\s\S]*$/i, '')
    .trim();
}
function plain(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text, lang) {
  const parts = lang === 'zh'
    ? text.split(/(?<=[。！？!?][”’」』）)]*)/)
    : text.split(/(?<=[.!?]['"’”)\]]*)\s+(?=['"‘“(\[]?[A-Z0-9])/);
  return parts.map((s) => s.trim()).filter((s) => s.length > 1);
}

function parseArticle(md, lang) {
  const paragraphs = [];
  let heading = '';
  for (const block of cleanMarkdown(md).split(/\n\s*\n/)) {
    const h = block.match(/^#{2,6}\s+(.+)$/m);
    if (h && block.trim().startsWith('#')) {
      heading = plain(h[1]);
      const rest = block.replace(/^#{2,6}\s+.+$/m, '').trim();
      if (!rest) continue;
      paragraphs.push({ heading, sentences: splitSentences(plain(rest), lang) });
      continue;
    }
    const text = plain(block);
    if (text) paragraphs.push({ heading, sentences: splitSentences(text, lang) });
  }
  return paragraphs.filter((p) => p.sentences.length);
}

/* ---------- tokens ---------- */
const STOP = new Set('a an the and or but of to in on at by for with from as is are was were be been being it its this that these those he she they them his her their him who whom what which why how when where does do did can could would should will not no into than then so such there here about after before over under also only very more most just'.split(' '));
function stem(w) {
  if (w.length > 5 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith('es') && !w.endsWith('ses')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  return w;
}
const HAN = /[㐀-鿿]/;
function tokenize(text) {
  const out = [];
  const lower = String(text).toLowerCase().replace(/[’']/g, '');
  for (const word of lower.match(/[a-z0-9]+/g) || []) {
    if (!STOP.has(word)) out.push(stem(word));
  }
  // Chinese: character bigrams, which hold names and terms well.
  const runs = lower.match(/[㐀-鿿]+/g) || [];
  for (const run of runs) {
    if (run.length === 1) out.push(run);
    for (let i = 0; i + 1 < run.length; i += 1) out.push(run.slice(i, i + 2));
  }
  return out;
}

class BM25 {
  constructor(docs, k1 = 1.4, b = 0.72) {
    this.k1 = k1; this.b = b;
    this.docs = docs.map((tokens) => {
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
      return { tf, len: tokens.length };
    });
    this.avg = this.docs.reduce((s, d) => s + d.len, 0) / Math.max(1, this.docs.length);
    const df = new Map();
    for (const d of this.docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    const N = this.docs.length;
    this.idf = new Map([...df].map(([t, n]) => [t, Math.log(1 + (N - n + 0.5) / (n + 0.5))]));
  }
  scores(queryTokens) {
    const q = [...new Set(queryTokens)].filter((t) => this.idf.has(t));
    return this.docs.map((d) => {
      let s = 0;
      for (const t of q) {
        const f = d.tf.get(t);
        if (!f) continue;
        s += this.idf.get(t) * (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * d.len / this.avg));
      }
      return s;
    });
  }
}

/* ---------- names ---------- */
const WEAK = new Set(['the', 'mr', 'mrs', 'big', 'party', 'room', 'house', 'book', 'man', 'two', 'one', 'great', 'new', 'old']);
function aliasesOf(en, zh) {
  const out = new Set();
  const add = (s) => { const v = String(s || '').trim().toLowerCase(); if (v.length >= 2) out.add(v); };
  add(en); add(zh);
  add(String(en || '').replace(/^the\s+/i, ''));
  // "Winston Smith" -> "winston"; "温斯顿·史密斯" -> "温斯顿"
  String(en || '').split(/\s+/).forEach((part) => {
    const p = part.toLowerCase().replace(/[^a-z']/g, '');
    if (p.length >= 4 && !WEAK.has(p) && !STOP.has(p)) out.add(p);
  });
  String(zh || '').split(/[·・]/).forEach((part) => { if (part.length >= 2 && part !== zh) add(part); });
  return [...out];
}

function build() {
  const w = loadWindow();
  const store = w.WIKI_STORE;
  const zhStore = w.WIKI_STORE_ZH || {};
  const zhArticles = w.WIKI_ARTICLES_ZH || {};
  const graph = store.master.knowledge_graph;
  const nodes = Object.values(graph.all_nodes || {});
  const typeNames = zhStore.category_names || {};

  const entities = new Map();
  for (const node of nodes) {
    const enMd = store.articles[node.label] || store.articles[node.id];
    const zhMd = zhArticles[node.id];
    const zhName = zhStore.graph_labels?.[node.id] || node.label;
    const typeKey = String(node.type || '').toLowerCase().replace(/s$/, '');
    entities.set(node.id, {
      id: node.id,
      type: node.type,
      name: { en: node.label, zh: zhName },
      typeName: { en: String(node.type || '').replace(/s$/, ''), zh: typeNames[typeKey] || '' },
      aliases: aliasesOf(node.label, zhName),
      paragraphs: { en: enMd ? parseArticle(enMd, 'en') : [], zh: zhMd ? parseArticle(zhMd, 'zh') : [] },
      neighbors: new Set()
    });
  }
  for (const e of graph.all_edges || []) {
    const a = entities.get(e.source);
    const b = entities.get(e.target);
    if (!a || !b || a === b) continue;
    a.neighbors.add(b.id);
    b.neighbors.add(a.id);
  }

  const index = {};
  for (const lang of ['en', 'zh']) {
    const chunks = [];
    for (const ent of entities.values()) {
      // A Chinese reader is shown the English article when there is no
      // translation, so it is searched the same way.
      const own = ent.paragraphs[lang].length ? lang : 'en';
      ent.paragraphs[own].forEach((p, i) => {
        chunks.push({ entity: ent.id, lang: own, i, heading: p.heading, text: p.sentences.join(lang === 'zh' ? '' : ' ') });
      });
    }
    // Names count in every paragraph of their entry.
    const bm = new BM25(chunks.map((c) => {
      const ent = entities.get(c.entity);
      return tokenize(`${ent.name.en} ${ent.name.zh} ${c.heading} ${c.text}`);
    }));
    index[lang] = { chunks, bm };
  }

  // Plot summary as background, for readers who have not read the book.
  // It is not an entry, so the assistant never cites it.
  const book = {
    en: [store.master.article?.overview?.content, store.master.article?.plot?.content].filter(Boolean).join('\n\n'),
    zh: (zhStore.book?.sections || []).filter((s) => /概览|梗概/.test(s.title)).map((s) => s.paragraphs.join('')).join('\n\n')
  };
  const bookTitle = { en: store.master.book?.title || 'Nineteen Eighty-Four', zh: zhStore.book?.title || '一九八四' };
  return { entities, index, book, bookTitle, images: store.images || {} };
}

module.exports = { build, tokenize, splitSentences, parseArticle, plain };
