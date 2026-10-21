/* Storyline and StoryFlow pages.
 *
 *   #view-storyline        one screening page: the scene's picture with its
 *                          text over it, every scene as a thumbnail below
 *   #storyline/<index>     the same page, opened at that scene
 *   #view-storyflow        the StoryFlow cards (markup in index.html)
 *   #storyflow/<id>        one StoryFlow read as one article
 *
 * Entity pages get a "Related StoryFlow" block from the links Readify lists on
 * each entity page (data/entity_storyflows.js). All text comes from the raw
 * data as it is. app.js owns routing and history; it calls StoryPages.route()
 * for the storyline/ and storyflow/ hashes and exposes window.ReadipediaBridge.
 */
(function () {
  'use strict';

  const SCENE_ROUTE = /^storyline\/(\d+)$/;
  const FLOW_ROUTE = /^storyflow\/([a-z0-9-]+)$/;

  const UI = {
    en: {
      relatedFlows: 'Related StoryFlow',
      missing: 'This part has no text in the source data.',
      enOnly: 'This StoryFlow has no Chinese text yet; the original English follows.'
    },
    zh: {
      relatedFlows: '相关故事视角',
      missing: '原始数据中这一节没有正文。',
      enOnly: '本故事视角暂无中文版，以下为英文原文。'
    }
  };

  const bridge = () => window.ReadipediaBridge || {};
  const isZh = () => (bridge().isZh ? bridge().isZh() : /^zh/.test(document.documentElement.lang));
  const t = (key) => UI[isZh() ? 'zh' : 'en'][key];
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const localImage = (path) => (path ? `./assets/images/${String(path).split('/').pop()}` : '');

  /* ---------- data (read as is) ---------- */

  function scenes() {
    return window.WIKI_STORE?.master?.storylines || [];
  }

  function scenePosByIndex(index) {
    return scenes().findIndex((s) => String(s.index) === String(index));
  }

  function flows() {
    return window.STORYFLOWS_COMPLETE || [];
  }

  function flowById(id) {
    const flow = flows().find((f) => f.id === id);
    if (!flow) return null;
    const zh = isZh() ? window.WIKI_STORE_ZH?.storyflows?.[id] : null;
    return { ...flow, title: (zh && zh.title) || flow.title, description: (zh && zh.description) || flow.description, hasZhNodes: false };
  }

  // Node text arrives with escaped line breaks ("\" + newline); undo only that.
  function nodeMarkdown(detail) {
    return String(detail || '').replace(/\\\r?\n/g, '\n').replace(/\\n/g, '\n');
  }

  function renderMarkdown(text) {
    const r = bridge().renderMarkdown;
    if (r) return r(text);
    return text.split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('');
  }

  /* ---------- Storylines: one screening room ----------
   * Three things: see the picture, read its text (over the picture), change
   * scene. app.js plays the scene (the original td theater: soft swap, text
   * reveal, sliding indicator, arrow keys); this file adds the thumbnails,
   * swipe on touch screens and the #storyline/<index> address.
   */

  // Thumbnails go in before app.js starts, so its indicator and reveals find them.
  function buildStrip() {
    const track = el('liblib-filmstrip-track');
    if (!track || track.querySelector('.filmstrip-thumb')) return;
    track.insertAdjacentHTML('afterbegin', scenes().map((s, i) =>
      `<div class="filmstrip-thumb" data-idx="${i}" title="${esc(s.title)}"><img src="${esc(s.local_image || localImage(s.image_url))}" alt="${esc(s.title)}" loading="lazy" /></div>`
    ).join(''));
  }
  buildStrip();

  function bindTheater() {
    // Swipe the picture left or right on a touch screen.
    const stage = el('sl-stage');
    let start = null;
    stage?.addEventListener('pointerdown', (e) => {
      start = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
    });
    stage?.addEventListener('pointerup', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const next = (bridge().currentScene?.() ?? 0) + (dx < 0 ? 1 : -1);
      if (next >= 0 && next < scenes().length) bridge().setScene?.(next);
    });
    stage?.addEventListener('pointercancel', () => { start = null; });

    // With the pointer over the picture, the wheel or trackpad only ever
    // scrolls the scene text, never the page.
    stage?.addEventListener('wheel', (e) => {
      const box = el('liblib-narrative-scrollbox');
      if (!box || e.ctrlKey) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      box.scrollBy({ top: dy, behavior: 'instant' });
    }, { passive: false });

    // Changing scene rewrites the address in place, so Back leaves the page
    // instead of stepping back through every scene.
    document.addEventListener('readipedia:scene', (e) => {
      if (!isShown('view-storyline')) return;
      const id = `storyline/${e.detail.index}`;
      if (location.hash === `#${id}`) return;
      try { history.replaceState({ type: 'story', id, timestamp: Date.now() }, '', `#${id}`); } catch (err) { /* ignore */ }
    });
  }

  /* ---------- page 3: StoryFlow cards (markup lives in index.html) ---------- */

  function wireFlowCards() {
    const ids = (window.WIKI_STORE?.master?.storyflows || []).map((f) => f.id);
    document.querySelectorAll('#view-storyflow .storyflow-editorial-row').forEach((row, i) => {
      const id = ids[i];
      if (!id || row.dataset.flow) return;
      row.dataset.flow = id;
      const link = row.querySelector('.card-copy');
      if (link) link.setAttribute('href', `#storyflow/${id}`);
      row.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        openFlow(id);
      });
    });
  }

  /* ---------- page 4: one StoryFlow ---------- */

  let currentFlowId = null;

  // h2 -> h3 and h3 -> h4 in rendered text; the text itself is untouched.
  function demote(html) {
    return html.replace(/<(\/?)h([234])\b/g, (m, slash, n) => `<${slash}h${Math.min(Number(n) + 1, 5)}`);
  }

  // A canvas of story cards, one per node, joined in reading order. A card
  // opens into the whole node: picture, title and full text.
  function nodeBody(n) {
    const md = nodeMarkdown(n.detail);
    // The node title is the sheet heading; drop its copy at the top of the
    // text, and set headings inside the text one level below it.
    return md.trim().length > 8
      ? demote(renderMarkdown(md.replace(/^\s*#\s+[^\n]*\n*/, '')))
      : `<p class="sf-missing">${esc(t('missing'))}</p>`;
  }

  function renderFlow(id) {
    const flow = flowById(id);
    if (!flow) return false;
    currentFlowId = id;
    el('flow-title').textContent = flow.title;
    const note = isZh() ? `<p class="lang-fallback-note" lang="zh-CN">${esc(t('enOnly'))}</p>` : '';
    el('flow-lead').innerHTML = `<p>${esc(flow.description)}</p>${note}`;

    const board = el('flow-board');
    board.querySelectorAll('.sf-card').forEach((c) => c.remove());
    board.insertAdjacentHTML('beforeend', (flow.nodes || []).map((n, i) => `
      <button type="button" class="card sf-card" data-i="${i}" aria-haspopup="dialog">
        <span class="card-stage">${n.image ? `<img src="${esc(localImage(n.image))}" alt="" loading="lazy" decoding="async">` : ''}</span>
        <span class="card-meta"><span class="card-title" lang="en">${esc(n.title)}</span></span>
      </button>`).join(''));
    el('flow-canvas').scrollLeft = 0;
    requestAnimationFrame(drawLinks);
    return true;
  }

  // Curves from each card to the next, drawn under the cards.
  function drawLinks() {
    const board = el('flow-board');
    const svg = el('flow-links');
    if (!board || !svg || !board.offsetWidth) return;
    const cards = [...board.querySelectorAll('.sf-card')];
    const w = board.scrollWidth;
    const h = board.scrollHeight;
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const vertical = cards.length > 1 && cards[1].offsetTop >= cards[0].offsetTop + cards[0].offsetHeight;
    let d = '';
    for (let i = 0; i < cards.length - 1; i++) {
      const a = cards[i];
      const b = cards[i + 1];
      if (vertical) {
        const x = a.offsetLeft + a.offsetWidth / 2;
        d += `M${x} ${a.offsetTop + a.offsetHeight}V${b.offsetTop}`;
      } else {
        const x1 = a.offsetLeft + a.offsetWidth;
        const y1 = a.offsetTop + a.offsetHeight / 2;
        const x2 = b.offsetLeft;
        const y2 = b.offsetTop + b.offsetHeight / 2;
        const mx = (x1 + x2) / 2;
        d += `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
      }
    }
    svg.innerHTML = d ? `<path d="${d}" />` : '';
  }

  /* The open card: it grows out of its place on the canvas into a sheet,
     and shrinks back into it on close. */
  let openCard = null;
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function flipFrom(sheet, card) {
    const from = card.getBoundingClientRect();
    const to = sheet.getBoundingClientRect();
    return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
  }

  function openNode(card) {
    const flow = flowById(currentFlowId);
    const n = flow?.nodes?.[Number(card.dataset.i)];
    if (!n) return;
    openCard = card;
    const overlay = el('sf-sheet');
    const sheet = overlay.querySelector('.sf-sheet');
    el('sf-sheet-title').textContent = n.title;
    el('sf-sheet-text').innerHTML = nodeBody(n);
    const img = el('sf-sheet-img');
    img.src = n.image ? localImage(n.image) : '';
    img.alt = n.title;
    el('sf-sheet-media').hidden = !n.image;
    overlay.hidden = false;
    el('sf-sheet-scroll').scrollTop = 0;
    requestAnimationFrame(syncThumb);
    document.documentElement.classList.add('sf-sheet-open');
    if (!reduceMotion()) {
      sheet.style.transition = 'none';
      sheet.style.transformOrigin = 'top left';
      sheet.style.transform = flipFrom(sheet, card);
      void sheet.offsetWidth;
      sheet.style.transition = '';
      sheet.style.transform = '';
    }
    overlay.classList.add('is-open');
    card.classList.add('is-open');
    el('sf-sheet-close').focus({ preventScroll: true });
  }

  function closeNode() {
    const overlay = el('sf-sheet');
    if (!overlay || overlay.hidden) return;
    const sheet = overlay.querySelector('.sf-sheet');
    const card = openCard;
    openCard = null;
    overlay.classList.remove('is-open');
    document.documentElement.classList.remove('sf-sheet-open');
    const done = () => {
      overlay.hidden = true;
      sheet.style.transform = '';
      card?.classList.remove('is-open');
    };
    if (reduceMotion() || !card || !card.isConnected) { done(); card?.focus({ preventScroll: true }); return; }
    sheet.style.transform = flipFrom(sheet, card);
    sheet.addEventListener('transitionend', done, { once: true });
    setTimeout(() => { if (!overlay.hidden && !overlay.classList.contains('is-open')) done(); }, 400);
    card.focus({ preventScroll: true });
  }

  // The sheet's own scrollbar: a thin bar kept clear of the rounded corners,
  // hidden at rest and shown while scrolling or hovering the sheet.
  const THUMB_INSET = 20;
  let thumbTimer = 0;
  function syncThumb(show) {
    const box = el('sf-sheet-scroll');
    const thumb = el('sf-scroll-thumb');
    if (!box || !thumb) return;
    const overflow = box.scrollHeight - box.clientHeight;
    thumb.hidden = overflow <= 1;
    if (thumb.hidden) return;
    const track = box.clientHeight - THUMB_INSET * 2;
    const h = Math.max(32, Math.round(track * box.clientHeight / box.scrollHeight));
    const y = THUMB_INSET + Math.round((track - h) * (box.scrollTop / overflow));
    thumb.style.height = `${h}px`;
    thumb.style.transform = `translateY(${y}px)`;
    if (show === true) {
      thumb.classList.add('is-active');
      clearTimeout(thumbTimer);
      thumbTimer = setTimeout(() => thumb.classList.remove('is-active'), 900);
    }
  }

  function bindCanvas() {
    const canvas = el('flow-canvas');
    if (!canvas) return;
    canvas.addEventListener('click', (e) => {
      const card = e.target.closest('.sf-card');
      if (!card || canvas.dataset.dragged) return;
      openNode(card);
    });

    // Drag the canvas with the mouse to look along it.
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: canvas.scrollLeft, moved: false };
      delete canvas.dataset.dragged;
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 5) return;
      drag.moved = true;
      canvas.classList.add('is-dragging');
      canvas.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!drag) return;
      if (drag.moved) {
        canvas.dataset.dragged = '1';
        setTimeout(() => { delete canvas.dataset.dragged; }, 0);
      }
      drag = null;
      canvas.classList.remove('is-dragging');
    });

    // Over the canvas the wheel moves along it; at either end the page scrolls.
    canvas.addEventListener('wheel', (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = canvas.scrollWidth - canvas.clientWidth;
      if (max <= 1) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if ((dy < 0 && canvas.scrollLeft <= 0) || (dy > 0 && canvas.scrollLeft >= max - 1)) return;
      e.preventDefault();
      canvas.scrollBy({ left: dy, behavior: 'instant' });
    }, { passive: false });

    el('sf-sheet-scroll')?.addEventListener('scroll', () => syncThumb(true), { passive: true });
    window.addEventListener('resize', () => syncThumb());

    // The sheet lives on the body so no page transform can trap it.
    const overlay = el('sf-sheet');
    if (overlay) document.body.appendChild(overlay);
    window.addEventListener('popstate', closeNode);
    overlay?.addEventListener('click', (e) => { if (e.target === overlay || e.target.classList.contains('sf-sheet-frame')) closeNode(); });
    el('sf-sheet-close')?.addEventListener('click', closeNode);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNode(); });
    window.addEventListener('resize', () => { if (isShown('view-story-flow')) drawLinks(); });
  }



  /* ---------- related StoryFlow on entity pages ---------- */

  function appendRelatedFlows(detail) {
    const target = el('view-entity-markdown');
    if (!target || !detail) return;
    target.querySelector('.story-related')?.remove();
    const ids = window.ENTITY_STORYFLOWS?.[detail.label] || [];
    const list = ids.map(flowById).filter(Boolean);
    if (!list.length) return;
    const block = document.createElement('section');
    block.className = 'story-related';
    block.innerHTML = `<h2>${esc(t('relatedFlows'))}</h2><div class="story-related-cards">${list.map((f) => `
      <a class="story-related-card" href="#storyflow/${f.id}" data-flow="${f.id}">
        <span class="story-related-media"><img src="${esc(localImage(f.cover))}" alt="" loading="lazy" decoding="async"></span>
        <span class="story-related-body">
          <span class="story-related-name">${esc(f.title)}</span>
          <span class="story-related-desc">${esc(f.description)}</span>
        </span>
      </a>`).join('')}</div>`;
    target.appendChild(block);
  }

  /* ---------- navigation ---------- */

  function activateNav(id) {
    bridge().clearActiveNav?.();
    el(id)?.classList.add('active');
  }

  async function openScene(index, options = {}) {
    const pos = scenePosByIndex(index);
    if (pos < 0) return false;
    await bridge().prepare?.();
    activateNav('btn-storylines-hub');
    if (!options.fromHistory) bridge().pushHistory?.(`storyline/${scenes()[pos].index}`);
    bridge().showView?.('view-storyline', { fromHistory: true });
    bridge().setScene?.(pos);
    return true;
  }

  async function openFlow(id, options = {}) {
    if (!flowById(id)) return false;
    await bridge().prepare?.();
    activateNav('btn-storyflow-hub');
    closeNode();
    renderFlow(id);
    bridge().showView?.('view-story-flow', { fromHistory: true });
    requestAnimationFrame(drawLinks);
    if (!options.fromHistory) bridge().pushHistory?.(`storyflow/${id}`);
    return true;
  }

  function isRoute(hash) {
    return SCENE_ROUTE.test(hash) || FLOW_ROUTE.test(hash);
  }

  function route(hash, options = {}) {
    let m = SCENE_ROUTE.exec(hash);
    if (m) return openScene(m[1], options);
    m = FLOW_ROUTE.exec(hash);
    if (m) return openFlow(m[1], options);
    return false;
  }

  function isShown(id) {
    const v = el(id);
    return v && v.style.display !== 'none' && v.classList.contains('active');
  }

  function bind() {
    bindTheater();
    bindCanvas();
    wireFlowCards();

    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      const flowLink = e.target.closest('a[data-flow]');
      if (flowLink) {
        e.preventDefault();
        openFlow(flowLink.dataset.flow);
      }
    });

    document.addEventListener('readipedia:entity', (e) => appendRelatedFlows(e.detail));
    document.addEventListener('readipedia:lang', () => {
      if (isShown('view-story-flow') && currentFlowId) renderFlow(currentFlowId);
    });
  }

  window.StoryPages = { isRoute, route, openScene, openFlow };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
