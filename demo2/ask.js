/* Readipedia 2.0 demo: ask about the book in a panel that stays open.
   A question typed in the search palette opens the panel. Answers are
   presets (demo2/data.js) but follow the flow 2.0 would ship: read the
   relevant entries, answer in layers with a short gloss for every person or
   place, and cite every claim to a verbatim sentence. Entries named in the
   answer open inside the panel, with the cited sentence marked, so reading
   them never ends the conversation. */
(function () {
  const DATA = window.READIPEDIA_DEMO2;
  const D = () => window.ReadipediaDemo2;
  if (!DATA) return;

  const isZh = () => Boolean(window.ReadipediaBridge?.isZh?.());
  const lang = () => (isZh() ? 'zh' : 'en');
  const T = (en, zh) => (isZh() ? zh : en);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));
  const nameOf = (id) => D().nameOf(id);

  const QUESTION_RE = /[?？]|^(why|what|how|who|where|when|which|does|do|is|are|can)\b|为什么|为何|什么|怎么|如何|怎样|谁|哪|吗|呢|是否|意味/i;
  const looksLikeQuestion = (q) => QUESTION_RE.test(q.trim());

  function find(q) {
    const text = q.toLowerCase();
    return DATA.answers.find((a) => a.q[lang()].toLowerCase() === text)
      || DATA.answers.find((a) => a.match[lang()].some((k) => text.includes(k.toLowerCase())))
      || DATA.answers.find((a) => [...a.match.en, ...a.match.zh].some((k) => text.includes(k.toLowerCase())))
      || null;
  }
  const byId = (id) => DATA.answers.find((a) => a.id === id);
  const suggestions = () => DATA.answers.map((a) => ({ id: a.id, label: a.q[lang()] }));

  const ICON = {
    spark: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.25c.35 2.9 1.85 4.4 4.75 4.75-2.9.35-4.4 1.85-4.75 4.75C7.65 8.85 6.15 7.35 3.25 7 6.15 6.65 7.65 5.15 8 2.25Z"/><path d="M12.5 10.5c.12.95.6 1.43 1.5 1.5-.9.12-1.38.6-1.5 1.5-.12-.9-.6-1.38-1.5-1.5.9-.07 1.38-.55 1.5-1.5Z"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    back: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg>',
    open: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 2.75h3.75V6.5M13.25 2.75 7.5 8.5M11.5 9.5v3.75h-8.75V4.5h3.75"/></svg>',
    send: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V3.5M3.75 7.5 8 3.25l4.25 4.25"/></svg>',
    chev: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 6.25 3.5 3.5 3.5-3.5"/></svg>'
  };

  /* ---------- panel ---------- */
  let el = null;
  const stack = [];      // entries opened from the conversation, newest last
  let chatScroll = 0;
  let runId = 0;
  let turns = 0;

  function build() {
    if (el) return el;
    el = document.createElement('aside');
    el.className = 'askp';
    el.setAttribute('aria-label', T('Ask about the book', '关于这本书的提问'));
    el.innerHTML = `
      <div class="askp-head">
        <button type="button" class="askp-icon askp-back" aria-label="${T('Back to the conversation', '返回对话')}">${ICON.back}</button>
        <div class="askp-title"></div>
        <button type="button" class="askp-icon askp-full" aria-label="${T('Open the full entry', '打开完整词条')}">${ICON.open}</button>
        <button type="button" class="askp-icon askp-close" aria-label="${T('Close', '关闭')}">${ICON.close}</button>
      </div>
      <div class="askp-body">
        <div class="askp-chat"></div>
        <div class="askp-entry" hidden></div>
      </div>
      <form class="askp-form">
        <input class="askp-input" type="text" autocomplete="off" enterkeyhint="send">
        <button type="submit" class="askp-send" aria-label="${T('Ask', '提问')}">${ICON.send}</button>
      </form>`;
    document.body.appendChild(el);

    el.querySelector('.askp-close').addEventListener('click', close);
    el.querySelector('.askp-back').addEventListener('click', back);
    el.querySelector('.askp-full').addEventListener('click', () => {
      const top = stack[stack.length - 1];
      if (!top) return;
      if (matchMedia('(max-width: 760px)').matches) close();
      window.ReadipediaNav?.openEntity(top.id);
    });
    el.querySelector('.askp-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = el.querySelector('.askp-input');
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      ask(q);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); if (stack.length) back(); else close(); }
    });
    // Links inside the panel open in the panel: entity mentions in answers
    // and in entries, citations, sources and chain steps.
    el.addEventListener('click', (e) => {
      const chip = e.target.closest('.entity-mention-chip, .askp-ent');
      if (chip && el.contains(chip)) {
        e.preventDefault();
        e.stopPropagation();
        push(chip.dataset.entityId);
        return;
      }
      const cite = e.target.closest('[data-cite]');
      if (cite) {
        const turn = cite.closest('.askp-turn');
        const answer = byId(turn?.dataset.answer);
        const c = answer?.cites[Number(cite.dataset.cite) - 1];
        if (c) push(c.entity, c[lang()]);
        return;
      }
      const toggle = e.target.closest('.askp-toggle');
      if (toggle) {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        toggle.nextElementSibling.classList.toggle('is-open', open);
        return;
      }
      const follow = e.target.closest('.askp-follow');
      if (follow) ask(follow.dataset.q);
    });
    el.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse') return;
      const cite = e.target.closest('.askp-cite');
      const turn = e.target.closest('.askp-turn');
      if (turn?.querySelector('.askp-graph')) lightCite(turn, cite ? Number(cite.dataset.cite) : null, true);
    });
    window.addEventListener('readipedia:lang', () => { if (el) { el.querySelector('.askp-chat').innerHTML = ''; turns = 0; stack.length = 0; showChat(); syncHead(); close(); } else entry(true); });
    syncHead();
    return el;
  }

  function syncHead() {
    const top = stack[stack.length - 1];
    el.classList.toggle('is-entry', Boolean(top));
    el.querySelector('.askp-title').innerHTML = top
      ? esc(top.name)
      : `${ICON.spark}<span>${T('Ask about Nineteen Eighty-Four', '问《一九八四》')}</span>`;
    el.querySelector('.askp-input').placeholder = turns ? T('Ask a follow-up...', '继续追问…') : T('Ask a question...', '问一个问题…');
  }

  function open() {
    build();
    document.documentElement.classList.add('askp-open');
    el.classList.add('is-open');
    entry(false);
    if (!turns) renderWelcome();
    requestAnimationFrame(() => el.querySelector('.askp-input')?.focus({ preventScroll: true }));
  }
  function close() {
    if (!el) return;
    el.classList.remove('is-open');
    document.documentElement.classList.remove('askp-open');
    entry(true);
  }

  // Its own entry, apart from search: a quiet pill in the corner, as in
  // Craft. It steps aside while the panel is open.
  let pill = null;
  function entry(show) {
    if (!pill) {
      pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'askp-pill';
      pill.addEventListener('click', open);
      document.body.appendChild(pill);
    }
    pill.innerHTML = `${ICON.spark}<span>${T('Assistant', '助手')}</span>`;
    pill.classList.toggle('is-on', show);
  }

  function renderWelcome() {
    const chat = el.querySelector('.askp-chat');
    chat.innerHTML = `<section class="askp-welcome">
        <p class="askp-welcome-h">${T('Ask anything about Nineteen Eighty-Four', '关于《一九八四》，想问什么都可以')}</p>
        <p class="askp-note">${T('Answers come from the entries, and every claim links to the sentence it rests on.', '回答来自词条，每个说法都能点回原文那一句。')}</p>
        ${followHtml(DATA.answers.map((a) => a.id))}
      </section>`;
  }

  /* ---------- entries inside the panel ---------- */
  function push(id, quote) {
    const model = window.ReadipediaBridge?.articleModel?.(id);
    if (!model) return;
    const chat = el.querySelector('.askp-chat');
    if (!stack.length) chatScroll = chat.scrollTop;
    stack.push({ id: model.id, name: model.name, quote });
    renderEntry(model, quote);
  }
  function back() {
    stack.pop();
    const top = stack[stack.length - 1];
    if (top) renderEntry(window.ReadipediaBridge.articleModel(top.id), top.quote);
    else showChat();
  }
  function renderEntry(model, quote) {
    const view = el.querySelector('.askp-entry');
    const chat = el.querySelector('.askp-chat');
    view.innerHTML = `${model.imagePath ? `<img class="askp-entry-img" src="${esc(model.imagePath)}" alt="">` : ''}<div class="askp-entry-text md">${model.html}</div>`;
    chat.hidden = true;
    view.hidden = false;
    view.classList.remove('is-in');
    void view.offsetWidth;
    view.classList.add('is-in');
    view.scrollTop = 0;
    syncHead();
    if (quote) requestAnimationFrame(() => D().mark(view.querySelector('.askp-entry-text'), quote));
  }
  function showChat() {
    const view = el.querySelector('.askp-entry');
    const chat = el.querySelector('.askp-chat');
    view.hidden = true;
    view.innerHTML = '';
    chat.hidden = false;
    chat.classList.remove('is-in');
    void chat.offsetWidth;
    chat.classList.add('is-in');
    chat.scrollTop = chatScroll;
    syncHead();
  }

  /* ---------- answers ---------- */
  // "{@key|text}" links an entry, "[n]" cites a sentence.
  function tokens(text) {
    const out = [];
    text.split(/(\{@\w+\|[^}]+\}|\[\d+\])/).forEach((part) => {
      if (!part) return;
      const cite = part.match(/^\[(\d+)\]$/);
      if (cite) { out.push({ html: `<button type="button" class="askp-cite" data-cite="${cite[1]}" aria-label="${T('Source', '来源')} ${cite[1]}">${cite[1]}</button>` }); return; }
      const ent = part.match(/^\{@(\w+)\|([^}]+)\}$/);
      if (ent) { out.push({ html: `<a href="#${DATA.ids[ent[1]]}" class="askp-ent" data-entity-id="${DATA.ids[ent[1]]}">${esc(ent[2])}</a>` }); return; }
      if (isZh()) for (let i = 0; i < part.length; i += 3) out.push({ html: esc(part.slice(i, i + 3)) });
      else part.split(/(\s+)/).forEach((w) => { if (w) out.push({ html: esc(w) }); });
    });
    return out;
  }

  async function stream(host, text, alive) {
    const list = tokens(text);
    for (let i = 0; i < list.length; i += 1) {
      host.insertAdjacentHTML('beforeend', list[i].html);
      if (i % 3 === 2) await wait(16);
      if (!alive()) return false;
    }
    return true;
  }

  function scrollDown(chat) {
    const near = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 140;
    if (near) chat.scrollTop = chat.scrollHeight;
  }

  async function ask(q) {
    open();
    if (stack.length) { stack.length = 0; showChat(); }
    const id = ++runId;
    const alive = () => id === runId;
    const chat = el.querySelector('.askp-chat');
    chat.querySelector('.askp-welcome')?.remove();
    const answer = find(q);
    turns += 1;
    syncHead();
    const turn = document.createElement('section');
    turn.className = 'askp-turn';
    if (answer) turn.dataset.answer = answer.id;
    turn.innerHTML = `<p class="askp-q">${esc(q)}</p>`;
    chat.appendChild(turn);
    turn.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });

    if (!answer) {
      turn.insertAdjacentHTML('beforeend', `<p class="askp-note">${T('This demo answers three preset questions. In 2.0 the assistant reads the entries and answers any question about the book.', '演示版只预置了三个问题。正式版会实时读词条，回答关于这本书的任何问题。')}</p>${followHtml(DATA.answers.map((a) => a.id))}`);
      return;
    }

    turn.insertAdjacentHTML('beforeend', `<div class="askp-steps"><span class="askp-steps-label is-working">${T('Reading entries', '正在读词条')}</span></div>`);
    const steps = turn.querySelector('.askp-steps');
    for (const entity of answer.read) {
      await wait(240);
      if (!alive()) return;
      steps.insertAdjacentHTML('beforeend', `<a href="#${entity}" class="askp-step askp-ent" data-entity-id="${entity}">${esc(nameOf(entity))}</a>`);
    }
    await wait(300);
    if (!alive()) return;
    const label = steps.querySelector('.askp-steps-label');
    label.classList.remove('is-working');
    label.textContent = T(`Read ${answer.read.length} entries`, `读了 ${answer.read.length} 个词条`);

    const lead = document.createElement('p');
    lead.className = 'askp-lead';
    turn.appendChild(lead);
    if (!await stream(lead, answer.lead[lang()], alive)) return;
    // Right under the conclusion, a map of who did what to whom, so the
    // sections below read against it. Edges carry the citation numbers and
    // light up with them.
    turn.insertAdjacentHTML('beforeend', '<div class="askp-graph rg"></div>');
    answerGraph(turn.querySelector('.askp-graph'), answer);
    await wait(260);
    if (!alive()) return;
    for (const section of answer.sections) {
      turn.insertAdjacentHTML('beforeend', `<h3 class="askp-h">${esc(section.h[lang()])}</h3>`);
      const p = document.createElement('p');
      p.className = 'askp-p';
      turn.appendChild(p);
      scrollDown(chat);
      if (!await stream(p, section.text[lang()], alive)) return;
    }
    await wait(120);
    if (!alive()) return;

    const chain = answer.chain.map((s, i) => (
      `<li><button type="button" class="askp-chain-step" data-cite="${s.cite}"><span class="askp-chain-dot">${i + 1}</span>`
      + `<span class="askp-chain-text"><span class="askp-chain-label">${esc(s.label[lang()])}</span>${s.label[lang()].replace(/[“”"]/g, '') === nameOf(s.entity) ? '' : `<span class="askp-chain-ent">${esc(nameOf(s.entity))}</span>`}</span></button></li>`
    )).join('');
    const sources = answer.cites.map((c, i) => (
      `<li><button type="button" class="askp-source" data-cite="${i + 1}"><span class="askp-source-n">${i + 1}</span>`
      + `<span class="askp-source-body"><span class="askp-source-name">${esc(nameOf(c.entity))}</span><span class="askp-source-quote">${esc(c[lang()])}</span></span></button></li>`
    )).join('');
    turn.insertAdjacentHTML('beforeend', `
      <div class="askp-more">
        <button type="button" class="askp-toggle" aria-expanded="false">${T('How it unfolds', '事件经过')}<span class="askp-count">${answer.chain.length}</span>${ICON.chev}</button>
        <div class="askp-fold"><ol class="askp-chain">${chain}</ol></div>
        <button type="button" class="askp-toggle" aria-expanded="false">${T('Sources', '来源')}<span class="askp-count">${answer.cites.length}</span>${ICON.chev}</button>
        <div class="askp-fold"><ol class="askp-sources">${sources}</ol></div>
      </div>
      ${followHtml(answer.follow)}`);
    scrollDown(chat);
  }

  function answerGraph(host, answer) {
    const W = host.clientWidth;
    const H = host.clientHeight;
    const padX = W < 400 ? 40 : 52;
    const padTop = answer.graph.nodes.some((n) => n.side === 'above') ? 40 : 22;
    const padBottom = 44;
    const nodes = answer.graph.nodes.map((n) => ({
      id: n.id,
      name: n.name?.[lang()],
      x: padX + n.x * (W - padX * 2),
      y: padTop + n.y * (H - padTop - padBottom),
      r: n.primary ? 20 : 16,
      primary: n.primary,
      labelSide: n.side || 'below',
      key: ''
    }));
    const edges = answer.graph.edges.map((e) => ({
      key: `k${e.cite}`, source: e.source, target: e.target, label: e.label[lang()], showLabel: true, curvature: e.curve ?? 0.14
    }));
    D().drawGraph(host, { nodes, edges }, {
      onHover: (key) => lightCite(host.closest('.askp-turn'), key ? Number(key.slice(1)) : null),
      onPick: (key, id) => {
        if (key) {
          const c = answer.cites[Number(key.slice(1)) - 1];
          if (c) push(c.entity, c[lang()]);
        } else if (id) push(id);
      }
    });
  }

  // A citation and its relation light up together.
  function lightCite(turn, n, fromText) {
    if (!turn) return;
    turn.querySelectorAll('.askp-cite').forEach((c) => c.classList.toggle('is-hover', n !== null && Number(c.dataset.cite) === n));
    const host = turn.querySelector('.askp-graph');
    if (fromText && host) D().lightKey(host, n !== null ? `k${n}` : null, 'is-hover');
  }

  function followHtml(ids) {
    return `<div class="askp-follows">${ids.map((id) => {
      const q = byId(id).q[lang()];
      return `<button type="button" class="askp-follow" data-q="${esc(q)}">${ICON.spark}<span>${esc(q)}</span></button>`;
    }).join('')}</div>`;
  }

  window.addEventListener('readipedia:lang', () => { if (!el?.classList.contains('is-open')) entry(true); });
  // After app.js has settled the language.
  const start = () => setTimeout(() => entry(true), 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  window.ReadipediaAsk = { suggestions, looksLikeQuestion, find, ask, open, close };
})();
