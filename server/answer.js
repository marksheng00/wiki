/* Turns the model's raw output into events for the page.
   - Text streams as it comes. Citations [S12] become [1], [2]... numbered in
     reading order, each sent once with its entry and verbatim sentence.
     Links {E3|name} become {@entity-id|name}.
   - @graph, @chain and @follow blocks are parsed whole and sent as data. */
'use strict';

const MAX_HOLD = 60;

class AnswerStream {
  constructor({ ctx, corpus, lang, emit }) {
    this.ctx = ctx;
    this.corpus = corpus;
    this.lang = lang;
    this.emit = emit;
    this.buf = '';
    this.mode = 'text';
    this.block = [];
    this.lineStart = true;
    this.cites = new Map(); // sid -> n
    this.linked = new Set();
    this.plain = '';
    this.graphSent = false;
  }

  name(id) { return this.corpus.entities.get(id)?.name[this.lang] || id; }

  cite(sid) {
    const s = this.ctx.sentences.get(sid);
    if (!s) return null;
    if (!this.cites.has(sid)) {
      const n = this.cites.size + 1;
      this.cites.set(sid, n);
      this.emit({ type: 'cite', n, sid, entity: s.entity, name: this.name(s.entity), quote: s.text });
    }
    return this.cites.get(sid);
  }

  transform(text) {
    return text
      .replace(/[[【]\s*(S\d+(?:\s*[,，、;；]\s*S?\d+)*)\s*[\]】]/g, (_, list) => list
        .split(/\s*[,，、;；]\s*/)
        .map((x) => (x.startsWith('S') ? x : `S${x}`))
        .map((sid) => this.cite(sid))
        .filter(Boolean)
        .map((n) => `[${n}]`)
        .join(''))
      .replace(/\{\s*E?(\d+)\s*[|｜]\s*([^{}\n]+?)\s*\}/g, (_, num, label) => {
        const id = this.ctx.keyToEntity.get(`E${num}`);
        if (!id || this.linked.has(id)) return label;
        this.linked.add(id);
        return `{@${id}|${label}}`;
      })
      // Stray markup the model was told not to write.
      .replace(/\*\*(.+?)\*\*/g, '$1');
  }

  sendText(raw) {
    if (!raw) return;
    const text = this.transform(raw);
    this.plain += raw;
    if (text) this.emit({ type: 'text', text });
  }

  push(chunk) {
    this.raw = (this.raw || '') + chunk;
    this.buf += chunk;
    this.drain(false);
  }

  end() {
    this.drain(true);
    if (this.mode !== 'text') this.closeBlock();
    if (this.buf) { this.sendText(this.buf); this.buf = ''; }
  }

  drain(final) {
    for (;;) {
      if (!this.buf) return;
      if (this.mode !== 'text') {
        const nl = this.buf.indexOf('\n');
        if (nl < 0 && !final) return;
        const line = nl < 0 ? this.buf : this.buf.slice(0, nl);
        const trimmed = line.trim();
        // A heading or a new block also ends a block whose @end went missing.
        if (/^#{1,3}\s/.test(trimmed) || /^@(graph|chain|follow)\b/i.test(trimmed)) {
          this.closeBlock();
          this.lineStart = true;
          continue;
        }
        this.buf = nl < 0 ? '' : this.buf.slice(nl + 1);
        if (/^@end\b/i.test(trimmed)) this.closeBlock();
        else if (trimmed) this.block.push(trimmed);
        if (nl < 0) return;
        continue;
      }
      if (this.lineStart) {
        const lead = this.buf.replace(/^[ \t]+/, '');
        if (lead.startsWith('@') || lead.startsWith('`')) {
          const nl = this.buf.indexOf('\n');
          if (nl < 0 && !final) return;
          const line = (nl < 0 ? this.buf : this.buf.slice(0, nl)).trim();
          const m = line.match(/^@(graph|chain|follow)\b/i);
          if (m || /^@end\b/i.test(line) || /^```/.test(line)) {
            this.buf = nl < 0 ? '' : this.buf.slice(nl + 1);
            if (m) { this.mode = m[1].toLowerCase(); this.block = []; }
            continue;
          }
        }
      }
      const nl = this.buf.indexOf('\n');
      let seg = nl >= 0 ? this.buf.slice(0, nl + 1) : this.buf;
      if (nl < 0 && !final) {
        // Hold back a citation or link that is still being written.
        const open = Math.max(seg.lastIndexOf('['), seg.lastIndexOf('【'), seg.lastIndexOf('{'), seg.lastIndexOf('*'));
        if (open >= 0 && !/[\]】}]/.test(seg.slice(open)) && seg.length - open < MAX_HOLD) seg = seg.slice(0, open);
      }
      if (!seg) return;
      this.sendText(seg);
      this.buf = this.buf.slice(seg.length);
      this.lineStart = seg.endsWith('\n');
      if (nl < 0) return;
    }
  }

  closeBlock() {
    const lines = this.block;
    const mode = this.mode;
    this.mode = 'text';
    this.block = [];
    if (mode === 'graph') this.graph(lines);
    else if (mode === 'chain') this.chain(lines);
    else if (mode === 'follow') {
      const questions = lines.map((l) => l.replace(/^[-*\d.、)\s]+/, '').trim()).filter(Boolean).slice(0, 3);
      if (questions.length) this.emit({ type: 'follow', questions });
    }
  }

  quoteOf(sid) {
    const s = this.ctx.sentences.get(sid);
    return s ? { sid, entity: s.entity, quote: s.text } : { sid: null, entity: null, quote: null };
  }

  graph(lines) {
    if (this.graphSent) return;
    const edges = [];
    const nodes = new Map();
    for (const line of lines) {
      const m = line.replace(/^[-*\s]+/, '').replace(/\[(E\d+)\]/g, '$1').match(/^(E\d+)\s*(?:>|->|→|—>|=>)\s*(E\d+)\s*[|｜]\s*([^|｜]+?)\s*(?:[|｜]\s*\[?(S\d+)\]?)?\s*$/);
      if (!m) continue;
      const a = this.ctx.keyToEntity.get(m[1]);
      const b = this.ctx.keyToEntity.get(m[2]);
      if (!a || !b || a === b) continue;
      if (edges.some((e) => e.source === a && e.target === b)) continue;
      edges.push({ source: a, target: b, label: m[3].slice(0, 24), ...this.quoteOf(m[4]) });
      for (const id of [a, b]) nodes.set(id, (nodes.get(id) || 0) + 1);
      if (edges.length >= 8) break;
    }
    if (edges.length < 2) return;
    const primary = [...nodes.entries()].sort((x, y) => y[1] - x[1])[0][0];
    this.graphSent = true;
    this.emit({
      type: 'graph',
      nodes: [...nodes.keys()].map((id) => ({ id, name: this.name(id), primary: id === primary })),
      edges
    });
  }

  chain(lines) {
    const steps = [];
    for (const line of lines) {
      const m = line.match(/^\[?(S\d+)\]?\s*[|｜:：]\s*(.+)$/);
      if (!m) continue;
      const q = this.quoteOf(m[1]);
      if (!q.sid) continue;
      steps.push({ ...q, name: this.name(q.entity), label: m[2].trim().slice(0, 40) });
    }
    if (steps.length) this.emit({ type: 'chain', steps: steps.slice(0, 8) });
  }
}

module.exports = { AnswerStream };
