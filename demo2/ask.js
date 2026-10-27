/* Readipedia 2.0 demo: "search or ask" in the search palette.
   The answers are presets (demo2/data.js); the flow is the one 2.0 would
   ship: read the relevant entries, answer in its own words with every claim
   cited to a verbatim sentence, and draw the relations the answer used.
   Citations, sources and graph edges all lead back to the sentence in its
   entry. */
(function () {
  const DATA = window.READIPEDIA_DEMO2;
  const D = () => window.ReadipediaDemo2;
  if (!DATA) return;

  const isZh = () => Boolean(window.ReadipediaBridge?.isZh?.());
  const lang = () => (isZh() ? 'zh' : 'en');
  const T = (en, zh) => (isZh() ? zh : en);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const QUESTION_RE = /[?？]|^(why|what|how|who|where|when|which|does|do|is|are|can)\b|为什么|为何|什么|怎么|如何|怎样|谁|哪|吗|呢|是否|意味/i;
  const looksLikeQuestion = (q) => QUESTION_RE.test(q.trim());

  function find(q) {
    const text = q.toLowerCase();
    return DATA.answers.find((a) => a.q[lang()].toLowerCase() === text)
      || DATA.answers.find((a) => a.match[lang()].some((k) => text.includes(k.toLowerCase())))
      || DATA.answers.find((a) => [...a.match.en, ...a.match.zh].some((k) => text.includes(k.toLowerCase())))
      || null;
  }

  const suggestions = () => DATA.answers.map((a) => ({ id: a.id, label: a.q[lang()] }));

  let runId = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));

  function tokens(text) {
    // Chinese streams two characters at a time, English a word at a time;
    // [n] markers become citation buttons.
    const parts = text.split(/(\[\d+\])/);
    const out = [];
    parts.forEach((part) => {
      const cite = part.match(/^\[(\d+)\]$/);
      if (cite) { out.push({ cite: Number(cite[1]) }); return; }
      if (isZh()) {
        for (let i = 0; i < part.length; i += 2) out.push({ text: part.slice(i, i + 2) });
      } else {
        part.split(/(\s+)/).forEach((w) => { if (w) out.push({ text: w }); });
      }
    });
    return out;
  }

  function answerGraph(host, answer) {
    const W = host.clientWidth;
    const H = host.clientHeight;
    const padX = W < 480 ? 34 : 64;
    const padTop = answer.graph.nodes.some((n) => n.side === 'above') ? 44 : 26;
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
      key: `k${e.cite}`, source: e.source, target: e.target, label: e.label[lang()], showLabel: true, curvature: 0.12
    }));
    D().drawGraph(host, { nodes, edges }, {
      onHover: (key) => highlightCite(host.closest('.ask'), key ? Number(key.slice(1)) : null, 'graph'),
      onPick: (key, id) => {
        if (key) openCite(answer, Number(key.slice(1)));
        else if (id) { ctxRef?.close(); window.ReadipediaNav?.openEntity(id); }
      }
    });
  }

  function highlightCite(root, n, from) {
    if (!root) return;
    root.querySelectorAll('.ask-cite').forEach((el) => el.classList.toggle('is-hover', n !== null && Number(el.dataset.n) === n));
    root.querySelectorAll('.ask-source').forEach((el) => el.classList.toggle('is-hover', n !== null && Number(el.dataset.n) === n));
    if (from !== 'graph') {
      const host = root.querySelector('.ask-graph');
      if (host) D().lightKey(host, n !== null ? `k${n}` : null, 'is-hover');
    }
  }

  let ctxRef = null;
  function openCite(answer, n) {
    const cite = answer.cites[n - 1];
    if (!cite) return;
    ctxRef?.close();
    D().openAndMark(cite.entity, cite[lang()]);
  }

  function bindAnswer(root, answer) {
    root.addEventListener('click', (e) => {
      const target = e.target.closest('.ask-cite, .ask-source');
      if (target) openCite(answer, Number(target.dataset.n));
    });
    root.addEventListener('pointerover', (e) => {
      const target = e.target.closest('.ask-cite, .ask-source');
      if (e.pointerType === 'mouse') highlightCite(root, target ? Number(target.dataset.n) : null);
    });
    root.addEventListener('pointerleave', () => highlightCite(root, null));
  }

  function renderNoMatch(root) {
    root.innerHTML = `<p class="ask-note">${T('This demo answers three preset questions. In 2.0 the assistant reads the entries and answers any question about the book.', '演示版只预置了下面三个问题。正式版会实时读词条，回答关于这本书的任何问题。')}</p>`
      + `<div class="ask-presets">${suggestions().map((s) => `<button type="button" class="ask-preset" data-id="${s.id}">${SPARK}<span>${esc(s.label)}</span></button>`).join('')}</div>`;
    root.querySelectorAll('.ask-preset').forEach((btn) => btn.addEventListener('click', () => {
      const a = DATA.answers.find((x) => x.id === btn.dataset.id);
      ctxRef.input.value = a.q[lang()];
      run({ label: a.q[lang()] }, ctxRef);
    }));
  }

  async function run(item, ctx) {
    ctxRef = ctx;
    const id = ++runId;
    const alive = () => id === runId;
    ctx.panel.classList.add('is-answering');
    ctx.list.scrollTop = 0;
    const answer = find(item.label);
    ctx.list.innerHTML = '<div class="ask"></div>';
    const root = ctx.list.firstElementChild;
    if (!answer) { renderNoMatch(root); return; }

    const nameOf = D().nameOf;
    root.innerHTML = `<div class="ask-steps"><span class="ask-steps-label is-working">${T('Reading entries', '正在读词条')}</span></div><div class="ask-answer"></div>`;
    const steps = root.querySelector('.ask-steps');
    const label = steps.querySelector('.ask-steps-label');
    for (const entity of answer.read) {
      await wait(280);
      if (!alive()) return;
      steps.insertAdjacentHTML('beforeend', `<span class="ask-step">${esc(nameOf(entity))}</span>`);
    }
    await wait(360);
    if (!alive()) return;
    label.classList.remove('is-working');
    label.textContent = T(`Read ${answer.read.length} entries`, `读了 ${answer.read.length} 个词条`);

    const body = root.querySelector('.ask-answer');
    const list = tokens(answer.text[lang()]);
    for (let i = 0; i < list.length; i += 1) {
      const tok = list[i];
      if (tok.cite) {
        body.insertAdjacentHTML('beforeend', `<button type="button" class="ask-cite ask-word" data-n="${tok.cite}" aria-label="${T('Source', '来源')} ${tok.cite}">${tok.cite}</button>`);
      } else {
        body.insertAdjacentHTML('beforeend', `<span class="ask-word">${esc(tok.text)}</span>`);
      }
      if (i % 2 === 1) await wait(isZh() ? 26 : 22);
      if (!alive()) return;
    }
    await wait(160);
    if (!alive()) return;

    root.insertAdjacentHTML('beforeend', '<div class="ask-graph rg"></div>');
    answerGraph(root.querySelector('.ask-graph'), answer);
    const sources = answer.cites.map((c, i) => (
      `<button type="button" class="ask-source" data-n="${i + 1}"><span class="ask-source-n">${i + 1}</span>`
      + `<span class="ask-source-name">${esc(nameOf(c.entity))}</span>`
      + `<span class="ask-source-quote">${esc(c[lang()])}</span></button>`
    )).join('');
    root.insertAdjacentHTML('beforeend', `<div class="ask-sources">${sources}</div>`);
    bindAnswer(root, answer);
  }

  function reset(ctx) {
    runId += 1;
    ctx?.panel?.classList.remove('is-answering');
  }

  const SPARK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.25c.35 2.9 1.85 4.4 4.75 4.75-2.9.35-4.4 1.85-4.75 4.75C7.65 8.85 6.15 7.35 3.25 7 6.15 6.65 7.65 5.15 8 2.25Z"/><path d="M12.5 10.5c.12.95.6 1.43 1.5 1.5-.9.12-1.38.6-1.5 1.5-.12-.9-.6-1.38-1.5-1.5.9-.07 1.38-.55 1.5-1.5Z"/></svg>';

  window.ReadipediaAsk = { suggestions, looksLikeQuestion, find, run, reset };
})();
