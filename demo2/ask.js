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
          const g = host.firstChild;
          // Wait briefly for the handwriting fonts so labels are placed at their real size.
          const fonts = document.fonts ? Promise.all([document.fonts.load('500 19px Caveat'), document.fonts.load('16px "LXGW WenKai Screen"', ev.edges.map((e) => e.label).join('') || '关系')]) : null;
          Promise.race([fonts, new Promise((r) => setTimeout(r, 900))].filter(Boolean)).catch(() => {}).then(() => { if (g.isConnected) answerGraph(g, turn); });
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

  // Map of the answer: the most connected entry in the middle, the rest on a
  // ring. The ring order is the one with the fewest crossings and no line
  // running through a node it does not belong to.
  function answerGraph(host, turn) {
    const st = turnsState.get(turn);
    // More entries get more height, so their labels have room.
    host.style.height = `${[400, 400, 400, 400, 400, 420, 460, 500, 520][Math.min(8, st.graph.nodes.length)]}px`;
    const W = host.clientWidth;
    const H = host.clientHeight;
    const list = st.graph.nodes.slice().sort((a, b) => Number(b.primary) - Number(a.primary));
    const cx = W / 2;
    const cy = H / 2;
    const rx = W / 2 - (W < 400 ? 52 : 72);
    const ry = H / 2 - 56;
    const centre = list[0].id;
    const ring = list.slice(1);
    const n = ring.length;
    const slot = (k) => {
      const a = -Math.PI / 2 + (k / n) * Math.PI * 2 + (n % 2 ? 0 : Math.PI / n);
      return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
    };
    const graphEdges = st.graph.edges.filter((e) => list.some((x) => x.id === e.source) && list.some((x) => x.id === e.target));
    const order = bestRing(ring.map((r) => r.id), graphEdges, centre, { x: cx, y: cy }, slot);
    const pos = new Map([[centre, { x: cx, y: cy }]]);
    order.forEach((id, k) => pos.set(id, slot(k)));
    const nodes = list.map((nd) => {
      const p = pos.get(nd.id);
      const primary = nd.id === centre;
      return { id: nd.id, name: nd.name, x: p.x, y: p.y, r: primary ? 20 : 16, primary, labelSide: primary || p.y >= cy - 4 ? 'below' : 'above', key: '' };
    });
    // Each name goes on the side of its portrait that no line leaves from.
    const sides = [['below', Math.PI / 2], ['above', -Math.PI / 2], ['right', 0], ['left', Math.PI]];
    nodes.forEach((nd) => {
      const dirs = graphEdges.filter((e) => e.source === nd.id || e.target === nd.id).map((e) => {
        const o = pos.get(e.source === nd.id ? e.target : e.source);
        return Math.atan2(o.y - nd.y, o.x - nd.x);
      });
      if (!dirs.length) return;
      const gap = (a) => Math.min(...dirs.map((d) => { const x = Math.abs(((a - d) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); return x; }));
      // Sideways names need room: only on the outer edge of the map.
      const est = [...(nd.name || '')].reduce((w, ch) => w + (/[\u2e80-\u9fff]/.test(ch) ? 13 : 7.2), 0);
      const ok = sides.filter(([s]) => (s === 'right' ? nd.x > W * 0.6 && nd.x + 24 + est < W - 6
        : s === 'left' ? nd.x < W * 0.4 && nd.x - 24 - est > 6 : true));
      const pref = { below: 0.05, above: 0.03, right: 0, left: 0 };
      nd.labelSide = ok.map(([s, a]) => [s, gap(a) + pref[s]]).sort((x, y) => y[1] - x[1])[0][0];
    });
    const pair = (e) => [e.source, e.target].sort().join('|');
    const both = new Set(graphEdges.filter((e) => graphEdges.some((f) => f.source === e.target && f.target === e.source)).map(pair));
    const edges = graphEdges.map((e, i) => {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      let curvature = both.has(pair(e)) ? 0.3 : (e.source === centre || e.target === centre ? 0.06 : 0.16);
      // Lines between two ring entries bow outwards, away from the middle.
      if (!both.has(pair(e)) && e.source !== centre && e.target !== centre) {
        const nx = -(b.y - a.y);
        const ny = b.x - a.x;
        if (nx * ((a.x + b.x) / 2 - cx) + ny * ((a.y + b.y) / 2 - cy) < 0) curvature = -curvature;
      }
      return { key: e.sid ? `s${e.sid}` : `e${i}`, source: e.source, target: e.target, label: e.label, showLabel: true, curvature, arrow: true, i };
    });
    // Relations appear one by one in the order the model gave them; each
    // entry appears with the first relation that reaches it.
    nodes.forEach((nd) => { const k = edges.findIndex((e) => e.source === nd.id || e.target === nd.id); nd.i = k < 0 ? 0 : k; });
    D().drawGraph(host, { nodes, edges, sketch: true }, {
      onHover: (key) => lightCite(turn, key && key.startsWith('sS') ? st.bySid.get(key.slice(1)) ?? null : null),
      onPick: (key, id) => {
        const q = key && key.startsWith('sS') ? st.quotes.get(key.slice(1)) : null;
        if (q) push(q.entity, q.quote);
        else if (id) push(id);
      }
    });
    placeLabels(host, edges, pos);
  }

  function bestRing(ids, edges, centre, mid, slot) {
    if (ids.length < 3) return ids;
    const segOf = (pos, e) => [pos.get(e.source), pos.get(e.target)];
    const cross = (p, q, r, s) => {
      const d = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      return d(p, q, r) * d(p, q, s) < 0 && d(r, s, p) * d(r, s, q) < 0;
    };
    const near = (p, a, b) => {
      const vx = b.x - a.x; const vy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy || 1)));
      return Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy);
    };
    let best = ids;
    let bestScore = Infinity;
    const first = ids[0];
    const rest = ids.slice(1);
    const perms = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])));
    for (const p of perms(rest)) {
      const order = [first, ...p];
      const pos = new Map([[centre, mid]]);
      order.forEach((id, k) => pos.set(id, slot(k)));
      let score = 0;
      edges.forEach((e, i) => {
        const [a, b] = segOf(pos, e);
        score += Math.hypot(b.x - a.x, b.y - a.y) / 400;
        for (const [id, q] of pos) {
          if (id === e.source || id === e.target) continue;
          if (near(q, a, b) < 40) score += 12;
          // and clear of that entry's name, under or over its portrait
          if (near({ x: q.x, y: q.y + (q.y < mid.y - 4 ? -34 : 34) }, a, b) < 30) score += 12;
        }
        for (let j = i + 1; j < edges.length; j += 1) {
          const f = edges[j];
          if ([f.source, f.target].some((x) => x === e.source || x === e.target)) continue;
          const [c, d] = segOf(pos, f);
          if (cross(a, b, c, d)) score += 10;
        }
      });
      if (score < bestScore) { bestScore = score; best = order; }
    }
    return best;
  }

  // Each relation label slides along its own line to the first spot that
  // clears every dot, name and label already placed.
  function placeLabels(host, edges, pos) {
    host.classList.add('rg-still'); // measure at rest: nodes scale in
    const box = host.getBoundingClientRect();
    const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top }; };
    const overlap = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l) + 3) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t) + 3);
    const placed = [...host.querySelectorAll('.rg-dot, .rg-name')].map(rect);
    // Every inked point, so a label never sits on a line or an arrow.
    const ink = [];
    host.querySelectorAll('.rg-reveal').forEach((el) => {
      for (const m of el.getAttribute('d').matchAll(/(-?[\d.]+),(-?[\d.]+)/g)) ink.push({ x: +m[1], y: +m[2] });
    });
    const inkIn = (r) => ink.reduce((n, p) => n + (p.x > r.l - 4 && p.x < r.r + 4 && p.y > r.t - 4 && p.y < r.b + 4 ? 1 : 0), 0);
    const labels = host.querySelectorAll('.rg-edge-label');
    edges.forEach((e, i) => {
      const label = labels[i];
      if (!label) return;
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      const qx = (a.x + b.x) / 2 - (b.y - a.y) * e.curvature;
      const qy = (a.y + b.y) / 2 + (b.x - a.x) * e.curvature;
      const at = (t) => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * qx + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * qy + t * t * b.y });
      // Written beside the line, as in notes, on whichever side is free.
      const lw = label.offsetWidth;
      const lh = label.offsetHeight;
      const side = (t) => {
        const u = 1 - t;
        const tx = 2 * u * (qx - a.x) + 2 * t * (b.x - qx);
        const ty = 2 * u * (qy - a.y) + 2 * t * (b.y - qy);
        const l = Math.hypot(tx, ty) || 1;
        const nx = -ty / l;
        const ny = tx / l;
        const d = Math.abs(nx) * lw / 2 + Math.abs(ny) * lh / 2 + 3;
        return { nx: nx * d, ny: ny * d };
      };
      let best = null;
      const spots = [];
      for (const push of [0, 8, 18]) for (const t of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74]) for (const sgn of [1, -1]) spots.push([t, sgn, push]);
      for (const [t, sgn, push] of spots) {
        const c = at(t);
        const o = side(t);
        const k = 1 + push / (Math.hypot(o.nx, o.ny) || 1);
        const p = { x: c.x + o.nx * sgn * k, y: c.y + o.ny * sgn * k };
        label.style.left = `${p.x}px`;
        label.style.top = `${p.y}px`;
        const r = rect(label);
        const bad = placed.reduce((s, q) => s + overlap(r, q), 0) + inkIn(r) * 60 + (r.l < 0 || r.r > box.width || r.t < 0 || r.b > box.height ? 500 : 0);
        const cost = bad + push;
        if (!best || cost < best.cost) best = { cost, bad, p, r };
        if (cost === push && cost === 0) break;
      }
      label.style.left = `${best.p.x}px`;
      label.style.top = `${best.p.y}px`;
      // No free spot: keep it out of sight until its line is hovered or picked.
      if (best.bad > 0) { label.classList.add('is-tucked'); return; }
      placed.push(best.r);
    });
    void host.offsetWidth;
    host.classList.remove('rg-still');
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
