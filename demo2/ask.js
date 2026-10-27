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
    window.addEventListener('readipedia:lang', () => { if (el) { el.querySelector('.askp-chat').innerHTML = ''; turns = 0; stack.length = 0; showChat(); syncHead(); close(); } });
    syncHead();
    return el;
  }

  function syncHead() {
    const top = stack[stack.length - 1];
    el.classList.toggle('is-entry', Boolean(top));
    el.querySelector('.askp-title').innerHTML = top
      ? esc(top.name)
      : `${ICON.spark}<span>${T('Ask about Nineteen Eighty-Four', '问《一九八四》')}</span>`;
    el.querySelector('.askp-input').placeholder = T('Ask a follow-up...', '继续追问…');
  }

  function open() {
    build();
    document.documentElement.classList.add('askp-open');
    el.classList.add('is-open');
    resumePill(false);
  }
  function close() {
    if (!el) return;
    el.classList.remove('is-open');
    document.documentElement.classList.remove('askp-open');
    resumePill(turns > 0);
  }

  // After closing, one quiet pill brings the conversation back.
  let pill = null;
  function resumePill(show) {
    if (!pill) {
      pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'askp-pill';
      pill.addEventListener('click', open);
      document.body.appendChild(pill);
    }
    pill.innerHTML = `${ICON.spark}<span>${T('Back to the conversation', '回到对话')}</span>`;
    pill.classList.toggle('is-on', show);
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
    const answer = find(q);
    turns += 1;
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

  function followHtml(ids) {
    return `<div class="askp-follows">${ids.map((id) => {
      const q = byId(id).q[lang()];
      return `<button type="button" class="askp-follow" data-q="${esc(q)}">${ICON.spark}<span>${esc(q)}</span></button>`;
    }).join('')}</div>`;
  }

  window.ReadipediaAsk = { suggestions, looksLikeQuestion, find, ask, open, close };
})();
