/* Storyline and StoryFlow pages.
 *
 * Four pages, all drawn from the raw data as it is:
 *   #view-storyline        every storyline scene, top to bottom, in story order
 *   #storyline/<index>     one scene: picture, date, full text, previous / next
 *   #view-storyflow        the StoryFlow cards (already in index.html)
 *   #storyflow/<id>        one StoryFlow read as one article, node by node
 *
 * Entity pages get a "Related StoryFlow" block from the links Readify lists on
 * each entity page (data/entity_storyflows.js).
 * app.js owns routing and history; it calls StoryPages.route() for the
 * storyline/ and storyflow/ hashes and exposes window.ReadipediaBridge.
 */
(function () {
  'use strict';

  const SCENE_ROUTE = /^storyline\/(\d+)$/;
  const FLOW_ROUTE = /^storyflow\/([a-z0-9-]+)$/;

  const UI = {
    en: {
      scene: (n, total) => `Scene ${n} of ${total}`,
      backLines: 'All storylines',
      backFlows: 'All StoryFlow',
      prev: 'Previous scene',
      next: 'Next scene',
      step: (n, total) => `${n} / ${total}`,
      inFlow: 'In this StoryFlow',
      relatedEntities: 'Entries in this StoryFlow',
      relatedFlows: 'Related StoryFlow',
      missing: 'This part has no text in the source data.',
      enOnly: 'This StoryFlow has no Chinese text yet; the original English follows.',
      read: 'Read'
    },
    zh: {
      scene: (n, total) => `第 ${n} 幕，共 ${total} 幕`,
      backLines: '全部故事线',
      backFlows: '全部故事视角',
      prev: '上一幕',
      next: '下一幕',
      step: (n, total) => `${n} / ${total}`,
      inFlow: '本故事视角包含',
      relatedEntities: '本故事视角涉及的词条',
      relatedFlows: '相关故事视角',
      missing: '原始数据中这一节没有正文。',
      enOnly: '本故事视角暂无中文版，以下为英文原文。',
      read: '阅读'
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

  /* ---------- page 1: all storylines ---------- */

  function renderStorylineIndex() {
    const list = el('story-line-list');
    if (!list) return;
    const total = scenes().length;
    let html = '';
    for (let i = 0; i < total; i++) {
      const s = sceneAt(i);
      html += `<li><a class="sl-row" href="#storyline/${s.index}" data-scene="${s.index}">
        <span class="sl-num">${s.index}</span>
        <span class="sl-thumb"><img src="${esc(s.image)}" alt="" loading="lazy" decoding="async"></span>
        <span class="sl-body">
          <span class="sl-date">${esc(capitalise(s.date))}</span>
          <span class="sl-title">${esc(s.title)}</span>
          <span class="sl-desc">${esc(s.description.replace(/\s+/g, ' '))}</span>
        </span>
      </a></li>`;
    }
    list.innerHTML = html;
    const sub = el('story-line-sub');
    if (sub) {
      sub.textContent = isZh()
        ? `${total} 幕，按故事发生的顺序排列。点开任意一幕阅读全文。`
        : `${total} scenes in story order. Open any scene to read it in full.`;
    }
  }

  /* ---------- page 2: one scene ---------- */

  let currentScenePos = -1;

  function renderScene(pos) {
    const s = sceneAt(pos);
    if (!s) return false;
    currentScenePos = pos;
    const total = scenes().length;
    el('scene-title').textContent = s.title;
    el('scene-sub').textContent = `${t('scene')(pos + 1, total)} · ${capitalise(s.date)}`;
    const img = el('scene-img');
    img.src = s.image;
    img.alt = s.title;
    el('scene-text').innerHTML = paragraphs(s.description);
    el('scene-back-label').textContent = t('backLines');

    const prev = sceneAt(pos - 1);
    const next = sceneAt(pos + 1);
    el('btn-scene-prev').disabled = !prev;
    el('btn-scene-next').disabled = !next;
    el('btn-scene-prev').setAttribute('aria-label', t('prev'));
    el('btn-scene-next').setAttribute('aria-label', t('next'));
    el('scene-pager').innerHTML = [
      prev ? pagerCard(prev, 'prev') : '<span></span>',
      next ? pagerCard(next, 'next') : '<span></span>'
    ].join('');
    return true;
  }

  function pagerCard(s, dir) {
    return `<a class="story-pager-card is-${dir}" href="#storyline/${s.index}" data-scene="${s.index}">
      <span class="story-pager-label">${esc(t(dir))}</span>
      <span class="story-pager-title">${esc(s.title)}</span>
    </a>`;
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
    el('flow-back-label').textContent = t('backFlows');

    const toc = nodes.map((n, i) => `<li><a href="#storyflow/${id}" data-node="${i}"><span class="sf-toc-num">${i + 1}</span><span>${esc(n.title)}</span></a></li>`).join('');
    el('flow-toc').innerHTML = `<p class="sf-toc-label">${esc(t('inFlow'))}</p><ol>${toc}</ol>`;

    const note = isZh() ? `<p class="lang-fallback-note" lang="zh-CN">${esc(t('enOnly'))}</p>` : '';
    el('flow-nodes').innerHTML = note + nodes.map((n, i) => {
      const md = nodeMarkdown(n.detail);
      // The node title is already the section heading; drop the copy at the top of the text.
      const body = md.trim().length > 8
        ? renderMarkdown(md.replace(/^\s*#\s+[^\n]*\n*/, ''))
        : `<p class="sf-missing">${esc(t('missing'))}</p>`;
      return `<section class="sf-node" id="sf-node-${i}">
        <div class="sf-node-meta"><span class="sf-step">${t('step')(i + 1, nodes.length)}</span><span class="sf-chapter">${esc(n.chapter || '')}</span></div>
        <h2 class="sf-node-title">${esc(n.title)}</h2>
        ${n.image ? `<div class="sf-node-media"><img src="${esc(localImage(n.image))}" alt="${esc(n.title)}" loading="lazy" decoding="async"></div>` : ''}
        <div class="prose markdown-prose" lang="en">${body}</div>
      </section>`;
    }).join('');

    // Entries Readify links to this StoryFlow, in sidebar order.
    const linked = entityEntries().filter((e) => (window.ENTITY_STORYFLOWS?.[e.label] || []).includes(id));
    el('flow-entities').innerHTML = linked.length
      ? `<h2 class="sf-related-title">${esc(t('relatedEntities'))}</h2><div class="sf-chips">${linked.map((e) => `<a href="#${esc(e.id)}" class="sf-chip" data-entity="${esc(e.id)}">${esc(e.name)}</a>`).join('')}</div>`
      : '';
    return true;
  }

  function entityEntries() {
    return Array.from(document.querySelectorAll('.entity-toc-link')).map((link) => ({
      id: link.dataset.id,
      label: link.dataset.en || link.textContent.trim(),
      name: link.textContent.trim()
    }));
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
    renderScene(pos);
    bridge().showView?.('view-story-scene', { fromHistory: true });
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
    renderStorylineIndex();
    wireFlowCards();

    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      const sceneLink = e.target.closest('[data-scene]');
      if (sceneLink) {
        e.preventDefault();
        openScene(sceneLink.dataset.scene);
        return;
      }
      const flowLink = e.target.closest('a[data-flow]');
      if (flowLink) {
        e.preventDefault();
        openFlow(flowLink.dataset.flow);
        return;
      }
      const nodeLink = e.target.closest('#flow-toc a[data-node]');
      if (nodeLink) {
        e.preventDefault();
        el(`sf-node-${nodeLink.dataset.node}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const chip = e.target.closest('.sf-chip[data-entity]');
      if (chip) {
        e.preventDefault();
        bridge().prepare?.().then(() => bridge().openEntity?.(chip.dataset.entity));
        return;
      }
      if (e.target.closest('#btn-scene-prev')) step(-1);
      else if (e.target.closest('#btn-scene-next')) step(1);
      else if (e.target.closest('#scene-back')) { e.preventDefault(); el('btn-storylines-hub')?.click(); }
      else if (e.target.closest('#flow-back')) { e.preventDefault(); el('btn-storyflow-hub')?.click(); }
    });

    window.addEventListener('keydown', (e) => {
      if (!isShown('view-story-scene') || e.altKey || e.metaKey || e.ctrlKey) return;
      if (/input|textarea|select/i.test(document.activeElement?.tagName || '')) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });

    document.addEventListener('readipedia:entity', (e) => appendRelatedFlows(e.detail));
    document.addEventListener('readipedia:lang', () => {
      renderStorylineIndex();
      if (isShown('view-story-scene') && currentScenePos >= 0) renderScene(currentScenePos);
      if (isShown('view-story-flow') && currentFlowId) renderFlow(currentFlowId);
    });
  }

  function step(delta) {
    const next = scenes()[currentScenePos + delta];
    if (next) openScene(next.index);
  }

  window.StoryPages = { isRoute, route, openScene, openFlow };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
