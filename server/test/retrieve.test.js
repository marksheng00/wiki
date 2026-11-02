'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { build } = require('../corpus');
const { retrieve, buildContext } = require('../retrieve');

const corpus = build();
const WINSTON = 'character-recall-character-winston-smith-1910e4339629';
const JULIA = 'character-recall-character-julia-dd9a6077f139';

test('named entities come first, in both languages', () => {
  assert.deepStrictEqual(retrieve(corpus, { question: 'Why does Winston betray Julia?', lang: 'en' }).chosen.slice(0, 2).sort(), [JULIA, WINSTON].sort());
  const zh = retrieve(corpus, { question: '温斯顿为什么会背叛朱莉娅？', lang: 'zh' }).chosen;
  assert.ok(zh.includes(WINSTON) && zh.includes(JULIA));
});

test('every sentence id maps to a verbatim sentence of its entry', () => {
  const r = retrieve(corpus, { question: 'What is doublethink?', lang: 'en' });
  const ctx = buildContext(corpus, r, 'en');
  assert.ok(ctx.sentences.size > 20);
  for (const [sid, s] of ctx.sentences) {
    assert.match(sid, /^S\d+$/);
    const all = corpus.entities.get(s.entity).paragraphs.en.flatMap((p) => p.sentences);
    assert.ok(all.includes(s.text));
  }
});

test('a follow-up keeps the earlier subject', () => {
  const r = retrieve(corpus, { question: '他后来怎么样了？', previous: '奥布莱恩是谁？', lang: 'zh' });
  assert.ok(r.chosen.includes('character-recall-character-o-brien-abeb498acd48'));
});
