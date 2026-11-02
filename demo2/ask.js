/* Readipedia 2.0: ask about the book in a panel that stays open.
   Answers stream from the assistant API (server/): it reads the relevant
   entries, answers in layers with a short gloss for every person or place,
   and cites every claim to a verbatim sentence. Entries named in the answer
   open inside the panel, with the cited sentence marked, so reading them
   never ends the conversation. */
(function () {
  const DATA = window.READIPEDIA_DEMO2;
  const D = () => window.ReadipediaDemo2;
  if (!DATA) return;

  const isZh = () => Boolean(window.ReadipediaBridge?.isZh?.());
  const lang = () => (isZh() ? 'zh' : 'en');
  const T = (en, zh) => (isZh() ? zh : en);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Example questions for the first open; the answers come from the API.
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
      const cite = e.target.closest('[data-cite], [data-sid]');
      if (cite) {
        const st = turnsState.get(cite.closest('.askp-turn'));
        const c = cite.dataset.sid ? st?.quotes.get(cite.dataset.sid) : st?.cites[Number(cite.dataset.cite) - 1];
        if (c) push(c.entity, c.quote);
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
    window.addEventListener('readipedia:lang', () => { if (el) { controller?.abort(); history.length = 0; el.querySelector('.askp-chat').innerHTML = ''; turns = 0; stack.length = 0; showChat(); syncHead(); close(); } else entry(true); });
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
                ${followHtml(suggestions().map((x) => x.label))}
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
  // Answers stream from the assistant API (server/). Text arrives with
  // citations as [n] and entry links as {@entity-id|name}; citations,
  // the relation map, the story chain and follow-ups arrive as data.
  const API = () => window.READIPEDIA_ASSISTANT_URL || '/api/ask';
  const turnsState = new WeakMap();
  const history = [];
  let controller = null;

  function inline(text) {
    return text.split(/(\{@[^|{}]+\|[^{}]+\}|\[\d+\])/).map((part) => {
      const cite = part.match(/^\[(\d+)\]$/);
      if (cite) return `<button type="button" class="askp-cite" data-cite="${cite[1]}" aria-label="${T('Source', '来源')} ${cite[1]}">${cite[1]}</button>`;
      const ent = part.match(/^\{@([^|{}]+)\|([^{}]+)\}$/);
      if (ent) return `<a href="#${esc(ent[1])}" class="askp-ent" data-entity-id="${esc(ent[1])}">${esc(ent[2])}</a>`;
      return esc(part);
    }).join('');
  }

  // Raw answer text -> lead, then headings and paragraphs. Only blocks whose
  // text changed are touched, so streaming stays cheap.
  function renderText(turn) {
    const st = turnsState.get(turn);
    const blocks = st.raw.replace(/\r/g, '').split(/\n\s*\n|\n(?=#{2,3}\s)|(?<=^#{2,3}\s.*)\n/m).map((b) => b.trim()).filter(Boolean);
    blocks.forEach((block, i) => {
      const heading = block.match(/^#{2,3}\s+(.+)$/);
      const isLead = i === 0 && !heading;
      const tag = heading ? 'h3' : 'p';
      const cls = heading ? 'askp-h' : isLead ? 'askp-lead' : 'askp-p';
      let node = st.blocks[i];
      if (!node || node.tagName.toLowerCase() !== tag || node.className !== cls) {
        const fresh = document.createElement(tag);
        fresh.className = cls;
        if (node) node.replaceWith(fresh);
        else (isLead ? st.leadHost : st.bodyHost).appendChild(fresh);
        node = fresh;
        st.blocks[i] = node;
        st.html[i] = '';
      }
      const html = inline(heading ? heading[1].replace(/\{@[^|{}]+\|([^{}]+)\}/g, '$1') : block);
      if (st.html[i] !== html) { node.innerHTML = html; st.html[i] = html; }
    });
  }

  function scrollDown(chat) {
    const near = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 140;
    if (near) chat.scrollTop = chat.scrollHeight;
  }

  async function* events(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let at;
      while ((at = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, at);
        buf = buf.slice(at + 2);
        const data = chunk.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
        if (data) { try { yield JSON.parse(data); } catch (e) { /* skip */ } }
      }
    }
  }

  function setLabel(turn, text, working) {
    const label = turn.querySelector('.askp-steps-label');
    if (!label) return;
    label.textContent = text;
    label.classList.toggle('is-working', working);
  }

  async function ask(q) {
    open();
    if (stack.length) { stack.length = 0; showChat(); }
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    const chat = el.querySelector('.askp-chat');
    chat.querySelector('.askp-welcome')?.remove();
    turns += 1;
    syncHead();

    const turn = document.createElement('section');
    turn.className = 'askp-turn';
    turn.innerHTML = `<p class="askp-q">${esc(q)}</p>
      <div class="askp-steps"><span class="askp-steps-label is-working">${T('Reading entries', '正在读词条')}</span></div>
      <div class="askp-lead-host"></div><div class="askp-graph-host"></div><div class="askp-body-host"></div>`;
    chat.appendChild(turn);
    const st = {
      raw: '', blocks: [], html: [], cites: [], bySid: new Map(), quotes: new Map(), chain: [], follow: [], graph: null,
      leadHost: turn.querySelector('.askp-lead-host'), bodyHost: turn.querySelector('.askp-body-host')
    };
    turnsState.set(turn, st);
    turn.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });

    const fail = (msg) => {
      turn.querySelector('.askp-wait')?.remove();
      setLabel(turn, T('No answer', '没有回答'), false);
      turn.insertAdjacentHTML('beforeend', `<p class="askp-note">${esc(msg)}</p>${followHtml([q], T('Try again', '重新回答'))}`);
    };
    let response;
    try {
      response = await fetch(API(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ question: q, lang: lang(), history: history.slice(-3) }),
        signal
      });
    } catch (e) {
      if (!signal.aborted) fail(T('The assistant cannot be reached right now. Please try again in a moment.', '暂时连不上助手，请稍后再试。'));
      return;
    }
    if (!response.ok || !response.body) {
      fail(response.status === 429
        ? T('Too many questions in a short time. Please wait a few minutes.', '提问太频繁了，请过几分钟再试。')
        : T('The assistant is not available right now.', '助手暂时不可用。'));
      return;
    }

    let gotText = false;
    let gotDone = false;
    try {
      for await (const ev of events(response)) {
        if (signal.aborted) return;
        if (ev.type === 'read') {
          const steps = turn.querySelector('.askp-steps');
          ev.entities.forEach((e) => steps.insertAdjacentHTML('beforeend', `<a href="#${esc(e.id)}" class="askp-step askp-ent" data-entity-id="${esc(e.id)}">${esc(e.name)}</a>`));
          setLabel(turn, T(`Read ${ev.entities.length} entries`, `读了 ${ev.entities.length} 个词条`), false);
          st.leadHost.innerHTML = `<p class="askp-wait"><span class="askp-steps-label is-working">${T('Thinking…', '正在思考…')}</span></p>`;
        } else if (ev.type === 'cite') {
          st.cites[ev.n - 1] = ev;
          st.bySid.set(ev.sid, ev.n);
          st.quotes.set(ev.sid, ev);
        } else if (ev.type === 'text') {
          if (!gotText) {
            gotText = true;
            st.leadHost.querySelector('.askp-wait')?.remove();
          }
          st.raw += ev.text;
          renderText(turn);
          scrollDown(chat);
        } else if (ev.type === 'graph') {
          st.graph = ev;
          ev.edges.forEach((e) => { if (e.sid) st.quotes.set(e.sid, e); });
          const host = turn.querySelector('.askp-graph-host');
          host.innerHTML = '<div class="askp-graph rg"></div>';
          answerGraph(host.firstChild, turn);
        } else if (ev.type === 'chain') {
          st.chain = ev.steps;
          ev.steps.forEach((s) => st.quotes.set(s.sid, s));
        } else if (ev.type === 'follow') {
          st.follow = ev.questions;
        } else if (ev.type === 'done') {
          gotDone = true;
        } else if (ev.type === 'error') {
          fail(ev.error === 'not_configured'
            ? T('The assistant is not configured on this server.', '服务器还没有配置助手。')
            : T('The model did not answer. Please try again.', '模型没有返回回答，请再试一次。'));
          return;
        }
      }
    } catch (e) {
      if (signal.aborted) return;
      fail(T('The answer was cut off. Please try again.', '回答中断了，请再试一次。'));
      return;
    }
    if (signal.aborted) return;
    if (!gotText) { fail(T('The model did not answer. Please try again.', '模型没有返回回答，请再试一次。')); return; }
    if (!gotDone) {
      turn.insertAdjacentHTML('beforeend', `<p class="askp-note">${T('The answer was cut off.', '回答中断了。')}</p>${followHtml([q], T('Try again', '重新回答'))}`);
      scrollDown(chat);
      return;
    }
    history.push({ q, a: st.raw });
    linkNames(turn);
    finish(turn);
    scrollDown(chat);
  }

  // The model links entries with {@id|name}; when it skips one, link the
  // first plain mention of each entry the answer read or drew.
  function linkNames(turn) {
    const st = turnsState.get(turn);
    const linked = new Set([...turn.querySelectorAll('.askp-lead .askp-ent, .askp-p .askp-ent')].map((a) => a.dataset.entityId));
    const seen = new Set();
    const names = [];
    const add = (id, name) => {
      if (!id || !name || linked.has(id) || seen.has(`${id}|${name}`)) return;
      seen.add(`${id}|${name}`);
      names.push({ id, name });
    };
    const ents = [...turn.querySelectorAll('.askp-step')].map((a) => ({ id: a.dataset.entityId, name: a.textContent }));
    (st.graph?.nodes || []).forEach((n) => ents.push(n));
    ents.forEach(({ id, name }) => {
      add(id, name);
      if (!id.startsWith('character-')) return;
      if (name.includes('·')) add(id, name.split('·')[0]);
      else if (/^[A-Z][a-z'’]{3,}\s/.test(name) && !/^The\s/.test(name)) add(id, name.split(/\s/)[0]);
    });
    names.sort((a, b) => b.name.length - a.name.length);
    for (const { id, name } of names) {
      if (linked.has(id) || name.length < 2) continue;
      const walker = document.createTreeWalker(turn, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement.closest('.askp-lead, .askp-p') && !n.parentElement.closest('a, button') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
      });
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const at = node.nodeValue.indexOf(name);
        if (at < 0) continue;
        // Latin names must stand as words.
        if (/^[A-Za-z]/.test(name) && (/[A-Za-z]/.test(node.nodeValue[at - 1] || '') || /[A-Za-z]/.test(node.nodeValue[at + name.length] || ''))) continue;
        const rest = node.splitText(at);
        rest.nodeValue = rest.nodeValue.slice(name.length);
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.className = 'askp-ent';
        a.dataset.entityId = id;
        a.textContent = name;
        rest.parentNode.insertBefore(a, rest);
        linked.add(id);
        break;
      }
    }
  }

  function finish(turn) {
    const st = turnsState.get(turn);
    const chain = st.chain.map((s, i) => {
      return `<li><button type="button" class="askp-chain-step" data-sid="${esc(s.sid)}"><span class="askp-chain-dot">${i + 1}</span>`
        + `<span class="askp-chain-text"><span class="askp-chain-label">${esc(s.label)}</span><span class="askp-chain-ent">${esc(s.name)}</span></span></button></li>`;
    }).join('');
    const sources = st.cites.filter(Boolean).map((c) => (
      `<li><button type="button" class="askp-source" data-cite="${c.n}"><span class="askp-source-n">${c.n}</span>`
      + `<span class="askp-source-body"><span class="askp-source-name">${esc(c.name)}</span><span class="askp-source-quote">${esc(c.quote)}</span></span></button></li>`
    )).join('');
    const fold = (label, count, list) => `<button type="button" class="askp-toggle" aria-expanded="false">${label}<span class="askp-count">${count}</span>${ICON.chev}</button><div class="askp-fold">${list}</div>`;
    turn.insertAdjacentHTML('beforeend', `
      ${chain || sources ? `<div class="askp-more">
        ${chain ? fold(T('How it unfolds', '事件经过'), st.chain.length, `<ol class="askp-chain">${chain}</ol>`) : ''}
        ${sources ? fold(T('Sources', '来源'), st.cites.filter(Boolean).length, `<ol class="askp-sources">${sources}</ol>`) : ''}
      </div>` : ''}
      ${followHtml(st.follow)}`);
  }

  // Map of the answer: the most connected entry in the middle, the rest
  // around it in the order the model listed them.
  function answerGraph(host, turn) {
    const st = turnsState.get(turn);
    const W = host.clientWidth;
    const H = host.clientHeight;
    const list = st.graph.nodes.slice().sort((a, b) => Number(b.primary) - Number(a.primary));
    const cx = W / 2;
    const cy = H / 2;
    const rx = W / 2 - (W < 400 ? 48 : 64);
    const ry = H / 2 - 52;
    const ring = list.slice(1);
    const nodes = list.map((n, i) => {
      if (i === 0) return { id: n.id, name: n.name, x: cx, y: cy, r: 20, primary: true, labelSide: 'below', key: '' };
      const a = -Math.PI / 2 + ((i - 1) / ring.length) * Math.PI * 2 + (ring.length % 2 ? 0 : Math.PI / ring.length);
      const y = cy + ry * Math.sin(a);
      return { id: n.id, name: n.name, x: cx + rx * Math.cos(a), y, r: 16, labelSide: y < cy - 4 ? 'above' : 'below', key: '' };
    });
    // Labels sit nearer the outer node, clear of the centre's own name.
    // A pair linked both ways bends further apart.
    const centre = nodes[0].id;
    const pair = (e) => [e.source, e.target].sort().join('|');
    const both = new Set(st.graph.edges.filter((e) => st.graph.edges.some((f) => f.source === e.target && f.target === e.source)).map(pair));
    const edges = st.graph.edges.map((e, i) => ({
      key: e.sid ? `s${e.sid}` : `e${i}`, source: e.source, target: e.target, label: e.label, showLabel: true,
      curvature: both.has(pair(e)) ? 0.32 : 0.1,
      labelAt: e.source === centre ? 0.56 : e.target === centre ? 0.44 : 0.5
    }));
    D().drawGraph(host, { nodes, edges }, {
      onHover: (key) => lightCite(turn, key && key.startsWith('sS') ? st.bySid.get(key.slice(1)) ?? null : null),
      onPick: (key, id) => {
        const q = key && key.startsWith('sS') ? st.quotes.get(key.slice(1)) : null;
        if (q) push(q.entity, q.quote);
        else if (id) push(id);
      }
    });
    unclutter(host);
  }

  // Model-chosen relations can sit close together. Push each edge label
  // off any label, dot or name it overlaps, alternating up and down.
  function unclutter(host) {
    const box = host.getBoundingClientRect();
    const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top }; };
    const hit = (a, b) => a.l < b.r + 2 && b.l < a.r + 2 && a.t < b.b + 2 && b.t < a.b + 2;
    const placed = [...host.querySelectorAll('.rg-dot, .rg-name')].map(rect);
    host.querySelectorAll('.rg-edge-label').forEach((label) => {
      const top = parseFloat(label.style.top);
      let r = rect(label);
      for (let i = 1; i <= 12 && placed.some((p) => hit(r, p)); i += 1) {
        const dy = Math.ceil(i / 2) * 7 * (i % 2 ? 1 : -1);
        label.style.top = `${top + dy}px`;
        r = rect(label);
      }
      placed.push(r);
    });
  }

  // A citation and its relation light up together.
  function lightCite(turn, n, fromText) {
    if (!turn) return;
    turn.querySelectorAll('.askp-cite').forEach((c) => c.classList.toggle('is-hover', n !== null && Number(c.dataset.cite) === n));
    const host = turn.querySelector('.askp-graph');
    if (fromText && host) {
      const sid = n !== null ? turnsState.get(turn)?.cites[n - 1]?.sid : null;
      D().lightKey(host, sid ? `s${sid}` : null, 'is-hover');
    }
  }

  function followHtml(questions, label) {
    if (!questions?.length) return '';
    return `<div class="askp-follows">${questions.map((q) => (
      `<button type="button" class="askp-follow" data-q="${esc(q)}">${ICON.spark}<span>${esc(label || q)}</span></button>`
    )).join('')}</div>`;
  }

  window.addEventListener('readipedia:lang', () => { if (!el?.classList.contains('is-open')) entry(true); });
  // After app.js has settled the language.
  const start = () => setTimeout(() => entry(true), 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  window.ReadipediaAsk = { suggestions, ask, open, close };
})();
