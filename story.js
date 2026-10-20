/* Storyline and StoryFlow pages.
 *
 *   #view-storyline        one screening page: the current scene (picture and
 *                          text) with every scene as a card in a strip below;
 *                          swipe the picture, use the arrow keys or pick a card
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

  // A scene in the current language: the Chinese title, date and text replace
  // the English ones when Chinese is on and a translation exists.
  function sceneAt(pos) {
    const evt = scenes()[pos];
    if (!evt) return null;
    const zh = isZh() ? window.WIKI_STORE_ZH?.storylines?.find((s) => s.index === evt.index) : null;
    return {
      pos,
      index: evt.index,
      date: zh?.date || evt.date || '',
      title: zh?.title || evt.title || '',
      description: zh?.description || evt.description || '',
      image: evt.local_image || localImage(evt.image_url)
    };
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

  function paragraphs(text) {
    return String(text || '')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${esc(p)}</p>`)
      .join('');
  }

  const capitalise = (s) => (isZh() ? s : s.charAt(0).toUpperCase() + s.slice(1));

  /* ---------- Storylines: one screening room ----------
   * The current scene sits in the middle (picture beside its text), with
   * arrows, swipe and the arrow keys to move; every scene waits below as a
   * card in a strip that scrolls sideways.
   */

  let currentScenePos = 0;
  let stripBuilt = false;

  function buildStrip() {
    const strip = el('sl-strip');
    if (!strip) return;
    const total = scenes().length;
    let html = '';
    for (let i = 0; i < total; i++) {
      const s = sceneAt(i);
      html += `<button type="button" class="sl-card" data-pos="${i}" aria-label="${esc(s.title)}">
        <span class="sl-card-media"><img src="${esc(s.image)}" alt="" loading="lazy" decoding="async"></span>
        <span class="sl-card-title">${esc(s.title)}</span>
      </button>`;
    }
    strip.innerHTML = html;
    stripBuilt = true;
  }

  function renderScene(pos, options = {}) {
    const s = sceneAt(pos);
    if (!s) return false;
    const changed = pos !== currentScenePos;
    currentScenePos = pos;
    if (!stripBuilt) buildStrip();

    const img = el('sl-img');
    if (img.getAttribute('src') !== s.image) img.src = s.image;
    img.alt = s.title;
    el('sl-date').textContent = capitalise(s.date);
    el('sl-title').textContent = s.title;
    el('sl-text').innerHTML = paragraphs(s.description);


    if (changed && !options.instant) {
      const stage = el('sl-stage');
      stage.classList.remove('is-swapping');
      void stage.offsetWidth;
      stage.classList.add('is-swapping');
    }

    const strip = el('sl-strip');
    let active = null;
    strip.querySelectorAll('.sl-card').forEach((card) => {
      const on = Number(card.dataset.pos) === pos;
      card.classList.toggle('is-active', on);
      card.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) active = card;
    });
    if (active && strip.clientWidth) {
      const left = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
      strip.scrollTo({ left, behavior: options.instant ? 'auto' : 'smooth' });
    }
    return true;
  }

  // Moving between scenes rewrites the address in place, so Back leaves the
  // page instead of stepping back through every scene.
  function goTo(pos) {
    if (pos < 0 || pos >= scenes().length || pos === currentScenePos) return;
    renderScene(pos);
    const id = `storyline/${scenes()[pos].index}`;
    try { history.replaceState({ type: 'story', id, timestamp: Date.now() }, '', `#${id}`); } catch (e) { /* ignore */ }
  }

  function bindTheater() {
    const strip = el('sl-strip');
    strip?.addEventListener('click', (e) => {
      const card = e.target.closest('.sl-card');
      if (card) goTo(Number(card.dataset.pos));
    });

    // Swipe the picture left or right to change scene.
    const media = el('sl-media');
    let start = null;
    media?.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY }; });
    media?.addEventListener('pointerup', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(currentScenePos + (dx < 0 ? 1 : -1));
    });
    media?.addEventListener('pointercancel', () => { start = null; });
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

  function renderFlow(id) {
    const flow = flowById(id);
    if (!flow) return false;
    currentFlowId = id;
    const nodes = flow.nodes || [];
    el('flow-title').textContent = flow.title;
    el('flow-sub').textContent = flow.description;

    const note = isZh() ? `<p class="lang-fallback-note" lang="zh-CN">${esc(t('enOnly'))}</p>` : '';
    el('flow-nodes').innerHTML = note + nodes.map((n, i) => {
      const md = nodeMarkdown(n.detail);
      // The node title is already the section heading; drop the copy at the top of the text.
      const body = md.trim().length > 8
        ? renderMarkdown(md.replace(/^\s*#\s+[^\n]*\n*/, ''))
        : `<p class="sf-missing">${esc(t('missing'))}</p>`;
      return `<section class="sf-node" id="sf-node-${i}">
        <h2 class="sf-node-title">${esc(n.title)}</h2>
        ${n.image ? `<div class="sf-node-media"><img src="${esc(localImage(n.image))}" alt="${esc(n.title)}" loading="lazy" decoding="async"></div>` : ''}
        <div class="prose markdown-prose" lang="en">${body}</div>
      </section>`;
    }).join('');

    return true;
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
    bridge().showView?.('view-storyline', { fromHistory: true });
    renderScene(pos, { instant: true });
    if (!options.fromHistory) bridge().pushHistory?.(`storyline/${scenes()[pos].index}`);
    return true;
  }

  async function openFlow(id, options = {}) {
    if (!flowById(id)) return false;
    await bridge().prepare?.();
    activateNav('btn-storyflow-hub');
    renderFlow(id);
    bridge().showView?.('view-story-flow', { fromHistory: true });
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
    buildStrip();
    renderScene(0, { instant: true });
    bindTheater();
    wireFlowCards();

    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      const flowLink = e.target.closest('a[data-flow]');
      if (flowLink) {
        e.preventDefault();
        openFlow(flowLink.dataset.flow);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!isShown('view-storyline') || e.altKey || e.metaKey || e.ctrlKey) return;
      if (/input|textarea|select/i.test(document.activeElement?.tagName || '')) return;
      if (e.key === 'ArrowLeft') goTo(currentScenePos - 1);
      if (e.key === 'ArrowRight') goTo(currentScenePos + 1);
    });

    document.addEventListener('readipedia:entity', (e) => appendRelatedFlows(e.detail));
    document.addEventListener('readipedia:lang', () => {
      buildStrip();
      renderScene(currentScenePos, { instant: true });
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
