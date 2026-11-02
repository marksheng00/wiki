'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { AnswerStream } = require('../answer');

const corpus = { entities: new Map([['w', { name: { zh: '温斯顿' } }], ['j', { name: { zh: '朱莉娅' } }], ['r', { name: { zh: '101室' } }]]) };
const ctx = {
  keyToEntity: new Map([['E1', 'w'], ['E2', 'j'], ['E3', 'r']]),
  sentences: new Map([['S1', { entity: 'w', text: '甲。' }], ['S2', { entity: 'j', text: '乙。' }], ['S3', { entity: 'r', text: '丙。' }]])
};
const RAW = `{E1|温斯顿}背叛了{E2|朱莉娅}[S2][S1]。

@graph
E1 > E2 | 出卖 | S2
E3 > E1 | 逼迫 | S3
@end

## 经过
在{E3|101室}里[S3]，他又见到{E2|朱莉娅}【S1, S2】。

@chain
S3 | 101室
@end

@follow
朱莉娅后来怎样？
@end`;

function run(chunks) {
  const events = [];
  const s = new AnswerStream({ ctx, corpus, lang: 'zh', emit: (e) => events.push(e) });
  chunks.forEach((c) => s.push(c));
  s.end();
  return events;
}

test('parses the answer whatever the chunking', () => {
  const whole = run([RAW]);
  const byChar = run([...RAW]);
  const random = [];
  for (let i = 0; i < RAW.length;) { const n = 1 + Math.floor(Math.random() * 7); random.push(RAW.slice(i, i + n)); i += n; }
  for (const events of [whole, byChar, run(random)]) {
    const text = events.filter((e) => e.type === 'text').map((e) => e.text).join('');
    assert.strictEqual(text, '{@w|温斯顿}背叛了{@j|朱莉娅}[1][2]。\n\n\n## 经过\n在{@r|101室}里[3]，他又见到朱莉娅[2][1]。\n\n\n');
    const cites = events.filter((e) => e.type === 'cite').map((e) => [e.n, e.sid]);
    assert.deepStrictEqual(cites, [[1, 'S2'], [2, 'S1'], [3, 'S3']]);
    const graph = events.find((e) => e.type === 'graph');
    assert.strictEqual(graph.edges.length, 2);
    assert.strictEqual(graph.nodes.find((n) => n.primary).id, 'w');
    assert.deepStrictEqual(events.find((e) => e.type === 'chain').steps.map((s) => s.sid), ['S3']);
    assert.deepStrictEqual(events.find((e) => e.type === 'follow').questions, ['朱莉娅后来怎样？']);
  }
});

test('drops unknown ids and closes a block without @end', () => {
  const events = run(['结论[S9]{E7|某人}。\n\n@graph\nE1 > E2 | 出卖 | S2\nE1 > E3 | 去 | S3\n## 小标题\n正文。']);
  const text = events.filter((e) => e.type === 'text').map((e) => e.text).join('');
  assert.ok(text.startsWith('结论某人。'));
  assert.ok(text.includes('## 小标题\n正文。'));
  assert.ok(events.find((e) => e.type === 'graph'));
});

test('a long link split across chunks still converts', () => {
  const label = '一个非常长的显示名'.repeat(12);
  const raw = `开头{E1|${label}}结尾[S1]。`;
  const pieces = [];
  for (let i = 0; i < raw.length; i += 3) pieces.push(raw.slice(i, i + 3));
  const text = run(pieces).filter((e) => e.type === 'text').map((e) => e.text).join('');
  assert.strictEqual(text, `开头{@w|${label}}结尾[1]。`);
});
