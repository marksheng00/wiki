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

  function renderFlow(id) {
    const flow = flowById(id);
    if (!flow) return false;
    currentFlowId = id;
    const nodes = flow.nodes || [];
    el('flow-title').textContent = flow.title;

    // Like an entity page: the flow's own description opens the article, then
    // one section per node, headings in the sidebar's table of contents.
    const lead = `<p>${esc(flow.description)}</p>`;
    const note = isZh() ? `<p class="lang-fallback-note" lang="zh-CN">${esc(t('enOnly'))}</p>` : '';
    el('flow-nodes').innerHTML = lead + note + nodes.map((n, i) => {
      const md = nodeMarkdown(n.detail);
      // The node title is already the section heading; drop the copy at the top of the text.
      // The node's own title is the section heading, so headings inside the
      // text sit one level below it, as on an entity page.
      const body = md.trim().length > 8
        ? demote(renderMarkdown(md.replace(/^\s*#\s+[^\n]*\n*/, '')))
        : `<p class="sf-missing">${esc(t('missing'))}</p>`;
      return `<section class="reading-section sf-node" id="sf-node-${i}">
        ${n.image ? `<div class="sf-node-media"><img src="${esc(localImage(n.image))}" alt="${esc(n.title)}" loading="lazy" decoding="async"></div>` : ''}
        <h2>${esc(n.title)}</h2>
        <div lang="en">${body}</div>
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
    if (!options.fromHistory) bridge().pushHistory?.(`storyline/${scenes()[pos].index}`);
    bridge().showView?.('view-storyline', { fromHistory: true });
    bridge().setScene?.(pos);
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
