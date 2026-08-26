/**
 * Readipedia Pure Typographic Reader Controller
 * LibLib Detail Stage (Screenshot 1) + TapTV Grid (Screenshot 2)
 */

(function () {
  'use strict';

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  const state = {
    theme: 'light',
    font: 'sans',
    lang: 'en',
    currentEntityId: null,
    currentStorylineIndex: 0,
    sidebarGraph: null,
    isGraphExpanded: false,
    graphPhase: 'small',
    graphReturnSurface: 'article',
  };

  function getEl(id) {
    return document.getElementById(id);
  }

  function init() {
    renderBookArticle();
    initBalancedTopologyGraph();
    initGraphControls();
    initNavHubClicks();
    initTOCEntityClicks();
    initStorylineTheater();
    initHeaderControls();
    initIcons();
    initDetailsAnimation();
    initMobileGestures();
  }

  function initIcons() {
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  }

  function initDetailsAnimation() {
    const detailsEls = document.querySelectorAll('details.toc-group, details.toc-cat-details');
    detailsEls.forEach(details => {
      const summary = details.querySelector('summary');
      const content = details.querySelector('.toc-items, .toc-cat-list');
      if (!summary || !content) return;

      let isAnimating = false;

      summary.addEventListener('click', (e) => {
        e.preventDefault();
        if (isAnimating) return;
        isAnimating = true;

        if (details.hasAttribute('open')) {
          const startHeight = content.offsetHeight;
          const animation = content.animate([
            { height: startHeight + 'px', opacity: 1, overflow: 'hidden' },
            { height: '0px', opacity: 0, overflow: 'hidden' }
          ], {
            duration: 320,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards'
          });
          animation.onfinish = () => {
            details.removeAttribute('open');
            animation.cancel();
            isAnimating = false;
          };
        } else {
          details.setAttribute('open', '');
          const targetHeight = content.offsetHeight;
          const animation = content.animate([
            { height: '0px', opacity: 0, overflow: 'hidden' },
            { height: targetHeight + 'px', opacity: 1, overflow: 'hidden' }
          ], {
            duration: 320,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards'
          });
          animation.onfinish = () => {
            animation.cancel();
            isAnimating = false;
          };
        }
      });
    });
  }

  function renderBookArticle() {
    if (!window.WIKI_STORE || !window.WIKI_STORE.master) return;

    const art = window.WIKI_STORE.master.article;
    const author = window.WIKI_STORE.master.author;
    const isZh = state.lang === 'zh';

    const h1 = getEl('article-h1');
    if (h1) h1.textContent = isZh ? '一九八四 (Nineteen Eighty-Four)' : 'Nineteen Eighty-Four';

    const tOverview = getEl('text-overview');
    if (tOverview && art.overview) tOverview.innerHTML = `<p>${art.overview.content}</p>`;

    const tPlot = getEl('text-plot');
    if (tPlot && art.plot && art.plot.paragraphs) {
      tPlot.innerHTML = art.plot.paragraphs.map((p) => `<p>${p}</p>`).join('');
    }

    const tThemes = getEl('text-themes');
    if (tThemes && art.themes) tThemes.innerHTML = `<p>${art.themes.content}</p>`;

    const tBackground = getEl('text-background');
    if (tBackground && art.background_and_legacy && art.background_and_legacy.paragraphs) {
      tBackground.innerHTML = art.background_and_legacy.paragraphs.map((p) => `<p>${p}</p>`).join('');
    }

    const tAuthor = getEl('text-author');
    if (tAuthor && author && author.sections) {
      tAuthor.innerHTML = author.sections
        .map(
          (s) => `
        <h3>${s.title}</h3>
        <p>${s.content}</p>
      `
        )
        .join('');
    }
  }

  function clearActiveNav() {
    document.querySelectorAll('.nav-hub-item').forEach((i) => i.classList.remove('active'));
    document.querySelectorAll('.toc-item').forEach((i) => i.classList.remove('active'));
  }

  async function prepareForPageNavigation() {
    graphState.focusedNode = null;
    graphState.hoverNode = null;
    hideBoundlessInspector();
    if (state.isGraphExpanded || state.graphPhase !== 'small') {
      await toggleGraphExpand(false, { duration: window.innerWidth <= 768 ? 180 : 420 });
    }
  }

  async function openBookOverview() {
    await prepareForPageNavigation();
    state.currentEntityId = null;
    clearActiveNav();
    const btnBook = getEl('btn-book-home');
    if (btnBook) btnBook.classList.add('active');
    scheduleGraphForPage(null);
    showArticleView('view-book');
  }

  /**
   * Navigation Hub: Direct Full-Page Switches for Book Overview, Storylines & StoryFlow
   */
  function initNavHubClicks() {
    const btnBook = getEl('btn-book-home');
    if (btnBook) {
      btnBook.addEventListener('click', async (e) => {
        e.preventDefault();
        await openBookOverview();
      });
    }

    const btnStorylines = getEl('btn-storylines-hub');
    if (btnStorylines) {
      btnStorylines.addEventListener('click', async (e) => {
        e.preventDefault();
        await prepareForPageNavigation();
        state.currentEntityId = null;
        clearActiveNav();
        btnStorylines.classList.add('active');
        scheduleGraphForPage(null);
        showArticleView('view-storyline');
        setStorylineScene(state.currentStorylineIndex);
      });
    }

    const btnStoryflow = getEl('btn-storyflow-hub');
    if (btnStoryflow) {
      btnStoryflow.addEventListener('click', async (e) => {
        e.preventDefault();
        await prepareForPageNavigation();
        state.currentEntityId = null;
        clearActiveNav();
        btnStoryflow.classList.add('active');
        scheduleGraphForPage(null);
        showArticleView('view-storyflow');
      });
    }
  }

  /**
   * Entities Tree: Click to open individual Wiki Dossier
   */
  function initTOCEntityClicks() {
    const entContainer = getEl('toc-entities-items');
    if (!entContainer) return;

    entContainer.addEventListener('click', async (e) => {
      const target = e.target.closest('.entity-toc-link');
      if (!target) return;

      e.preventDefault();
      clearActiveNav();
      target.classList.add('active');

      const entityId = target.getAttribute('data-id');
      if (entityId) {
        await prepareForPageNavigation();
        openEntityArticle(entityId);
      }
    });
  }

  /**
   * LibLib Detail Page Style Interactive Theater & Filmstrip Track (Screenshot 1)
   */
  function initStorylineTheater() {
    const track = getEl('liblib-filmstrip-track');
    if (track) {
      track.addEventListener('click', (e) => {
        const thumb = e.target.closest('.filmstrip-thumb');
        if (!thumb) return;

        const idx = parseInt(thumb.getAttribute('data-idx'), 10);
        if (!isNaN(idx)) {
          setStorylineScene(idx);
        }
      });
    }



    const btnFsPrev = getEl('btn-filmstrip-prev');
    if (btnFsPrev && track) {
      btnFsPrev.addEventListener('click', () => {
        track.scrollBy({ left: -320, behavior: 'smooth' });
      });
    }

    const btnFsNext = getEl('btn-filmstrip-next');
    if (btnFsNext && track) {
      btnFsNext.addEventListener('click', () => {
        track.scrollBy({ left: 320, behavior: 'smooth' });
      });
    }

    const scrollBox = getEl('liblib-narrative-scrollbox');
    if (scrollBox) {
      scrollBox.addEventListener('scroll', () => {
        if (scrollBox.scrollTop > 8) {
          scrollBox.classList.add('scrolled');
        } else {
          scrollBox.classList.remove('scrolled');
        }
      }, { passive: true });
    }

    // Keyboard Arrow navigation for Storylines Theater
    window.addEventListener('keydown', (e) => {
      const viewStoryline = getEl('view-storyline');
      if (viewStoryline && viewStoryline.style.display !== 'none') {
        if (e.key === 'ArrowLeft') {
          const total = getStorylinesTotal();
          setStorylineScene((state.currentStorylineIndex - 1 + total) % total);
        } else if (e.key === 'ArrowRight') {
          const total = getStorylinesTotal();
          setStorylineScene((state.currentStorylineIndex + 1) % total);
        }
      }
    });
  }

  function getStorylinesTotal() {
    const list = (window.WIKI_STORE && window.WIKI_STORE.master && window.WIKI_STORE.master.storylines) || [];
    return list.length || 89;
  }

  function setStorylineScene(index) {
    const storylines = (window.WIKI_STORE && window.WIKI_STORE.master && window.WIKI_STORE.master.storylines) || [];
    const evt = storylines[index];
    if (!evt) return;

    state.currentStorylineIndex = index;

    const dateEl = getEl('storyline-hero-date');
    if (dateEl && evt.date) {
      const capDate = evt.date.charAt(0).toUpperCase() + evt.date.slice(1);
      dateEl.textContent = capDate;
    }

    const imgEl = getEl('storyline-hero-img');
    if (imgEl) {
      imgEl.src = evt.local_image;
      imgEl.alt = evt.title;
    }

    const titleEl = getEl('storyline-hero-title');
    if (titleEl) titleEl.textContent = evt.title;

    const descEl = getEl('storyline-hero-desc');
    if (descEl) {
      const rawText = evt.description || '';
      if (window.marked && window.marked.parse) {
        descEl.innerHTML = window.marked.parse(rawText);
      } else {
        descEl.innerHTML = `<p>${rawText.replace(/\n\n/g, '</p><p>')}</p>`;
      }
    }

    // Reset internal narrative scrollbox position to top
    const scrollBox = getEl('liblib-narrative-scrollbox');
    if (scrollBox) scrollBox.scrollTop = 0;

    // Highlight active thumbnail and scroll into view
    const thumbs = document.querySelectorAll('.filmstrip-thumb');
    thumbs.forEach((t) => {
      const tIdx = parseInt(t.getAttribute('data-idx'), 10);
      if (tIdx === index) {
        t.classList.add('active');
        t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        t.classList.remove('active');
      }
    });
  }

  /**
   * High-Aesthetic Force Graph Engine (Obsidian Extended Graph Grade)
   */
  const graphState = {
    highlightNodes: new Set(),
    highlightLinks: new Set(),
    hoverNode: null,
    focusedNode: null,
    imgCache: new Map(),
    knowledgeIndex: null,
    positionCache: new Map(),
    renderSize: null,
    dataRevision: 0,
    pendingEntityId: null,
    hasPendingData: false,
    containerTransitionPromise: Promise.resolve()
  };

  const categoryThemeColors = {
    Characters: { light: '#e11d48', dark: '#fb7185', sepia: '#b91c1c' },
    Locations: { light: '#059669', dark: '#34d399', sepia: '#047857' },
    Organizations: { light: '#4f46e5', dark: '#818cf8', sepia: '#4338ca' },
    Concepts: { light: '#7c3aed', dark: '#a78bfa', sepia: '#6d28d9' },
    Rules: { light: '#ea580c', dark: '#fb923c', sepia: '#c2410c' },
    Objects: { light: '#d97706', dark: '#fbbf24', sepia: '#b45309' },
    Events: { light: '#0284c7', dark: '#38bdf8', sepia: '#0369a1' },
    Actions: { light: '#2563eb', dark: '#60a5fa', sepia: '#1d4ed8' },
    Creatures: { light: '#9333ea', dark: '#c084fc', sepia: '#7e22ce' },
    States: { light: '#0d9488', dark: '#2dd4bf', sepia: '#0f766e' },
    Expressions: { light: '#db2777', dark: '#f472b6', sepia: '#be185d' },
    Time: { light: '#64748b', dark: '#94a3b8', sepia: '#475569' }
  };

  function getCategoryColor(type) {
    const themeKey = state.theme === 'dark' ? 'dark' : (state.theme === 'sepia' ? 'sepia' : 'light');
    return (categoryThemeColors[type] && categoryThemeColors[type][themeKey]) || (state.theme === 'dark' ? '#60a5fa' : '#2563eb');
  }

  function getKnowledgeIndex() {
    const source = window.WIKI_STORE && window.WIKI_STORE.master && window.WIKI_STORE.master.knowledge_graph;
    if (!source) return null;
    if (graphState.knowledgeIndex && graphState.knowledgeIndex.source === source) {
      return graphState.knowledgeIndex;
    }

    const nodesById = new Map();
    const labelToId = new Map();
    Object.values(source.all_nodes || {}).forEach((node) => {
      if (!node || !node.id) return;
      const normalized = { ...node, type: node.type || 'Concepts' };
      nodesById.set(normalized.id, normalized);
      if (normalized.label) labelToId.set(normalized.label.toLowerCase(), normalized.id);
    });

    // Compatibility fallback for older stores that only contain category views.
    if (!nodesById.size) {
      Object.values(source.subgraphs || {}).forEach((categoryView) => {
        const list = (categoryView && categoryView.value) || (Array.isArray(categoryView) ? categoryView : []);
        list.forEach((node) => {
          if (!node || !node.id || nodesById.has(node.id)) return;
          nodesById.set(node.id, { ...node, type: node.type || 'Concepts' });
          if (node.label) labelToId.set(node.label.toLowerCase(), node.id);
        });
      });
    }

    const outgoing = new Map();
    const incoming = new Map();
    nodesById.forEach((_, id) => {
      outgoing.set(id, new Set());
      incoming.set(id, new Set());
    });

    const edgeMap = new Map();
    const sourceEdges = Array.isArray(source.all_edges) && source.all_edges.length
      ? source.all_edges
      : Array.from(nodesById.values()).flatMap((node) =>
          (node.targets || []).map((target) => ({ source: node.id, target }))
        );

    sourceEdges.forEach((edge) => {
      const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
      const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
      if (!nodesById.has(sourceId) || !nodesById.has(targetId) || sourceId === targetId) return;
      const key = `${sourceId}\u0000${targetId}`;
      if (!edgeMap.has(key)) edgeMap.set(key, { source: sourceId, target: targetId });
      outgoing.get(sourceId).add(targetId);
      incoming.get(targetId).add(sourceId);
    });

    const degree = new Map();
    nodesById.forEach((_, id) => {
      degree.set(id, new Set([...(outgoing.get(id) || []), ...(incoming.get(id) || [])]).size);
    });

    graphState.knowledgeIndex = {
      source,
      nodesById,
      labelToId,
      edges: Array.from(edgeMap.values()),
      outgoing,
      incoming,
      degree
    };
    return graphState.knowledgeIndex;
  }

  function resolveEntityId(entityId, index) {
    if (!entityId || !index) return null;
    if (index.nodesById.has(entityId)) return entityId;
    return index.labelToId.get(String(entityId).toLowerCase()) || null;
  }

  function cacheCurrentGraphPositions() {
    graphState.positionCache.clear();
    if (!state.sidebarGraph) return graphState.positionCache;
    const data = state.sidebarGraph.graphData();
    (data.nodes || []).forEach((node) => {
      if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
        graphState.positionCache.set(node.id, {
          x: node.x,
          y: node.y,
          vx: Number.isFinite(node.vx) ? node.vx : 0,
          vy: Number.isFinite(node.vy) ? node.vy : 0
        });
      }
    });
    return graphState.positionCache;
  }

  function buildGraphDataForEntity(entityId) {
    const index = getKnowledgeIndex();
    if (!index) return { nodes: [], links: [], nodeMap: new Map() };

    const primaryId = resolveEntityId(entityId, index);
    let selectedIds = [];

    if (primaryId) {
      const neighborIds = new Set([
        ...(index.outgoing.get(primaryId) || []),
        ...(index.incoming.get(primaryId) || [])
      ]);
      const rankedNeighbors = Array.from(neighborIds).sort((a, b) => {
        const degreeDelta = (index.degree.get(b) || 0) - (index.degree.get(a) || 0);
        return degreeDelta || (index.nodesById.get(a).label || '').localeCompare(index.nodesById.get(b).label || '');
      });
      // This canvas is a one-hop navigation preview. Keep the strongest direct
      // relations legible instead of shrinking a 100+ node hub into pixels.
      selectedIds = [primaryId, ...rankedNeighbors.slice(0, 35)];
    } else {
      const priorityCategories = {
        Characters: 5,
        Locations: 4,
        Organizations: 3,
        Concepts: 2,
        Objects: 2
      };
      Object.entries(priorityCategories).forEach(([type, limit]) => {
        const candidates = Array.from(index.nodesById.values())
          .filter((node) => node.type === type)
          .sort((a, b) => {
            const degreeDelta = (index.degree.get(b.id) || 0) - (index.degree.get(a.id) || 0);
            return degreeDelta || (a.label || '').localeCompare(b.label || '');
          });
        selectedIds.push(...candidates.slice(0, limit).map((node) => node.id));
      });
    }

    const selectedSet = new Set(selectedIds);
    const anchorId = primaryId || selectedIds[0];
    const cachedAnchor = primaryId ? graphState.positionCache.get(anchorId) : null;
    const nodeMap = new Map();
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    selectedIds.forEach((id, indexInGraph) => {
      const raw = index.nodesById.get(id);
      if (!raw) return;
      const cached = graphState.positionCache.get(id);
      const radius = 12 + Math.sqrt(indexInGraph + 1) * 9;
      const angle = indexInGraph * goldenAngle;
      const canReuseCurrentPosition = !!(cachedAnchor && cached);
      const x = id === anchorId ? 0 : (canReuseCurrentPosition ? cached.x - cachedAnchor.x : Math.cos(angle) * radius);
      const y = id === anchorId ? 0 : (canReuseCurrentPosition ? cached.y - cachedAnchor.y : Math.sin(angle) * radius);
      const node = createGraphNode(raw, id === primaryId || (!primaryId && id === anchorId), index.degree.get(id) || 0, x, y);
      if (!node.isPrimary && canReuseCurrentPosition) {
        node.vx = cached.vx;
        node.vy = cached.vy;
      }
      nodeMap.set(id, node);
    });

    const links = [];
    const visualEdges = new Set();
    if (primaryId) {
      selectedIds.slice(1).forEach((neighborId) => {
        links.push({ source: primaryId, target: neighborId });
      });
    } else {
      index.edges.forEach((edge) => {
        if (!selectedSet.has(edge.source) || !selectedSet.has(edge.target)) return;
        const key = edge.source < edge.target
          ? `${edge.source}\u0000${edge.target}`
          : `${edge.target}\u0000${edge.source}`;
        if (visualEdges.has(key)) return;
        visualEdges.add(key);
        links.push({ source: edge.source, target: edge.target });
      });
    }

    return {
      nodes: Array.from(nodeMap.values()),
      links,
      nodeMap,
      cameraShift: cachedAnchor ? { x: cachedAnchor.x, y: cachedAnchor.y } : null
    };
  }

  function createGraphNode(raw, isPrimary, degree, x, y) {
    let localImg = null;
    if (raw.imageUrl) {
      const fileName = raw.imageUrl.split('/').pop();
      localImg = `./assets/images/${fileName}`;
      if (!graphState.imgCache.has(localImg)) {
        const imgObj = new Image();
        imgObj.src = localImg;
        graphState.imgCache.set(localImg, imgObj);
      }
    }
    const nodeObj = {
      id: raw.id,
      label: raw.label,
      type: raw.type || 'Concepts',
      imgSrc: localImg,
      isPrimary: !!isPrimary,
      val: isPrimary ? 8.5 : Math.max(4.5, Math.min(7, degree * 0.12 + 4.4)),
      x,
      y
    };
    if (isPrimary) {
      nodeObj.fx = 0;
      nodeObj.fy = 0;
    }
    return nodeObj;
  }

  function drawGraphImageCover(ctx, img, x, y, size) {
    const sourceWidth = img.naturalWidth || img.width;
    const sourceHeight = img.naturalHeight || img.height;
    if (!sourceWidth || !sourceHeight || !size) return false;

    const targetRatio = 1;
    const sourceRatio = sourceWidth / sourceHeight;
    let sourceX = 0;
    let sourceY = 0;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;

    if (sourceRatio > targetRatio) {
      cropWidth = sourceHeight * targetRatio;
      sourceX = (sourceWidth - cropWidth) / 2;
    } else if (sourceRatio < targetRatio) {
      cropHeight = sourceWidth / targetRatio;
      // Match the editorial images' upper-biased focal point without any
      // entity-specific coordinates.
      sourceY = (sourceHeight - cropHeight) * 0.2;
    }

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      x,
      y,
      size,
      size
    );
    return true;
  }

  function getActiveTitleElement() {
    const viewEntity = getEl('view-entity');
    if (viewEntity && viewEntity.style.display !== 'none') {
      return getEl('view-entity-title');
    }
    const viewBook = getEl('view-book');
    if (viewBook && viewBook.style.display !== 'none') {
      return getEl('article-h1');
    }
    return getEl('article-h1') || getEl('view-entity-title');
  }

  function updateGraphHUD(hoveredNode) {
    // Intentionally no-op to keep article h1 title 100% stable and prevent accidental title hijacking
  }

  function getExpandedGraphSize() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const usableHeight = Math.max(1, window.innerHeight - 52);
    const minWidth = Math.min(420, viewportWidth);
    const minHeight = Math.min(300, usableHeight);
    const width = Math.min(760, viewportWidth, Math.max(minWidth, Math.round(viewportWidth * 0.48)));
    const height = Math.min(560, usableHeight, Math.max(minHeight, Math.round(usableHeight * 0.58)));
    return { width, height };
  }

  function configureGraphPhysics(graph, isExpanded) {
    if (!graph) return;
    const nodeCount = Math.max(1, ((graph.graphData() || {}).nodes || []).length);
    const isOverview = !state.currentEntityId;
    // Window mode must never mutate graph topology. Small/expanded views share
    // one settled layout; only their camera and available viewport differ.
    const chargeStrength = isOverview ? -40 : -Math.min(72, 42 + nodeCount * 0.15);
    const linkDistance = isOverview ? 30 : Math.min(44, Math.max(32, 27 + Math.sqrt(nodeCount) * 1.15));

    if (graph.d3Force && graph.d3Force('charge')) {
      graph.d3Force('charge').strength(chargeStrength);
      graph.d3Force('link').distance(linkDistance).strength(0.35);
    }
    if (graph.backgroundColor) {
      const needsOpaqueCanvas = isExpanded && window.innerWidth <= 768;
      const pageColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-page').trim() || '#ffffff';
      graph.backgroundColor(needsOpaqueCanvas ? pageColor : 'rgba(0,0,0,0)');
    }
    if (graph.enableZoomInteraction) graph.enableZoomInteraction(isExpanded);
    if (graph.enablePanInteraction) graph.enablePanInteraction(isExpanded);
    if (graph.enableNodeDrag) graph.enableNodeDrag(isExpanded);
  }

  function getCurrentGraphViewportSize() {
    const container = getEl('sidebar-graph-container');
    const slot = getEl('sidebar-graph-slot');
    const rect = container ? container.getBoundingClientRect() : null;
    return {
      width: Math.max(1, (rect && rect.width) || (container && container.clientWidth) || (slot && slot.clientWidth) || 268),
      height: Math.max(1, (rect && rect.height) || (container && container.clientHeight) || (slot && slot.clientHeight) || 145)
    };
  }

  function syncGraphRenderSize(graph, requestedSize = getExpandedGraphSize()) {
    const surface = getEl('canvas-sidebar-graph');
    if (!surface) return false;
    const size = {
      width: Math.max(1, Math.round(requestedSize.width)),
      height: Math.max(1, Math.round(requestedSize.height))
    };
    surface.style.width = `${size.width}px`;
    surface.style.height = `${size.height}px`;
    const previous = graphState.renderSize;
    const changed = !previous || previous.width !== size.width || previous.height !== size.height;
    graphState.renderSize = size;
    if (graph && changed) graph.width(size.width).height(size.height);
    return changed;
  }

  function getGraphCameraForViewport(graph, size, expansionProgress) {
    if (!graph) return;
    const data = graph.graphData();
    if (!data || !data.nodes || !data.nodes.length) return;
    const positionedNodes = data.nodes.filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y));
    if (!positionedNodes.length) return;

    const maxVisualRadius = positionedNodes.reduce((max, node) => Math.max(max, node.val || 5), 5) + 5;
    const minX = Math.min(...positionedNodes.map((node) => node.x)) - maxVisualRadius;
    const maxX = Math.max(...positionedNodes.map((node) => node.x)) + maxVisualRadius;
    const minY = Math.min(...positionedNodes.map((node) => node.y)) - maxVisualRadius;
    const maxY = Math.max(...positionedNodes.map((node) => node.y)) + maxVisualRadius;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const shortestSide = Math.max(1, Math.min(size.width || 1, size.height || 1));
    const smallPadding = Math.max(12, Math.min(20, Math.round(shortestSide * 0.10)));
    const expandedPadding = Math.max(38, Math.min(70, Math.round(shortestSide * 0.11)));
    const padding = smallPadding + (expandedPadding - smallPadding) * expansionProgress;
    const availableWidth = Math.max(1, size.width - padding * 2);
    const availableHeight = Math.max(1, size.height - padding * 2);
    // Limit by the largest node's on-screen radius, not by an arbitrary zoom
    // number. Sparse graphs can then use a large viewport without turning a
    // portrait node into an oversized disk.
    const largestNodeRadius = positionedNodes.reduce((max, node) => Math.max(max, node.val || 5), 5);
    const maximumNodeRadius = 20 + 12 * expansionProgress;
    const maximumZoom = Math.min(3.6, maximumNodeRadius / largestNodeRadius);
    const targetZoom = Math.max(0.18, Math.min(maximumZoom, availableWidth / spanX, availableHeight / spanY));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    return { x: centerX, y: centerY, zoom: targetZoom };
  }

  function fitGraphToViewport(graph, duration = 0, options = {}) {
    const expansionProgress = options.expansionProgress === undefined
      ? (state.isGraphExpanded ? 1 : 0)
      : Math.max(0, Math.min(1, options.expansionProgress));
    const size = options.size || getCurrentGraphViewportSize();
    const camera = getGraphCameraForViewport(graph, size, expansionProgress);
    if (!camera) return;

    if (graph.centerAt) graph.centerAt(camera.x, camera.y, duration);
    if (graph.zoom) graph.zoom(camera.zoom, duration);
  }

  function morphGraphViewport(container, graph, fromRect, getTargetRect, duration, toExpansion) {
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const initialTarget = getTargetRect();
    const targetCamera = getGraphCameraForViewport(graph, initialTarget, toExpansion);

    if (reducedMotion || duration <= 0) {
      applyFixedGraphRect(container, initialTarget);
      fitGraphToViewport(graph, 0, { size: initialTarget, expansionProgress: toExpansion });
      return Promise.resolve(initialTarget);
    }

    // ForceGraph owns its camera interpolation. Issuing a new zero-duration
    // camera command on every frame builds an internal queue that can replay
    // stale transforms after the container has finished moving.
    if (targetCamera) {
      if (graph.centerAt) graph.centerAt(targetCamera.x, targetCamera.y, duration);
      if (graph.zoom) graph.zoom(targetCamera.zoom, duration);
    }

    return new Promise((resolve) => {
      const startedAt = performance.now();
      const tick = (now) => {
        const linear = Math.max(0, Math.min(1, (now - startedAt) / duration));
        // Smooth acceleration and deceleration keeps the interpolation visible
        // instead of completing most of the distance in the first few frames.
        const eased = linear * linear * (3 - 2 * linear);
        const target = getTargetRect();
        const rect = {
          left: fromRect.left + (target.left - fromRect.left) * eased,
          top: fromRect.top + (target.top - fromRect.top) * eased,
          width: fromRect.width + (target.width - fromRect.width) * eased,
          height: fromRect.height + (target.height - fromRect.height) * eased
        };
        applyFixedGraphRect(container, rect);

        if (linear < 1) {
          window.requestAnimationFrame(tick);
        } else {
          // Same-frame final authority: no timer and no second visible stage.
          fitGraphToViewport(graph, 0, { size: target, expansionProgress: toExpansion });
          resolve(target);
        }
      };
      window.requestAnimationFrame(tick);
    });
  }

  function getLinkEndpointId(endpoint) {
    return endpoint && typeof endpoint === 'object' ? endpoint.id : endpoint;
  }

  function getGraphEnterProgress(item) {
    if (!item || !item.enteredAt) return 1;
    const linear = Math.max(0, Math.min(1, (performance.now() - item.enteredAt) / 420));
    return linear * linear * (3 - 2 * linear);
  }

  function applyGraphData(graph, graphData, animate = true) {
    if (!graph) return;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousIds = new Set(((graph.graphData() || {}).nodes || []).map((node) => node.id));
    const previousCamera = graph.centerAt ? graph.centerAt() : null;
    const revision = ++graphState.dataRevision;
    const enteredAt = performance.now();
    graphData.nodes.forEach((node) => {
      node.enteredAt = animate && !reducedMotion && !previousIds.has(node.id) ? enteredAt : 0;
    });
    graphData.links.forEach((link) => {
      const sourceId = getLinkEndpointId(link.source);
      const targetId = getLinkEndpointId(link.target);
      link.enteredAt = animate && !reducedMotion && (!previousIds.has(sourceId) || !previousIds.has(targetId)) ? enteredAt : 0;
    });

    graph.graphData({ nodes: graphData.nodes, links: graphData.links });
    state.graphNodeMap = graphData.nodeMap;
    configureGraphPhysics(graph, state.isGraphExpanded);
    if (graphData.cameraShift && previousCamera && graph.centerAt) {
      // The new graph is translated so the clicked node becomes (0, 0).
      // Translate the camera by the same amount before the next paint; every
      // shared portrait therefore remains at exactly the same screen point.
      graph.centerAt(
        previousCamera.x - graphData.cameraShift.x,
        previousCamera.y - graphData.cameraShift.y,
        0
      );
    }
    if (graph.d3ReheatSimulation) graph.d3ReheatSimulation();
    window.requestAnimationFrame(() => {
      if (revision !== graphState.dataRevision) return;
      fitGraphToViewport(graph, animate && !reducedMotion ? 420 : 0);
    });
  }

  function initBalancedTopologyGraph(focusEntityId, options = {}) {
    const container = getEl('canvas-sidebar-graph');
    if (!window.ForceGraph || !container) return;

    const renderSize = getExpandedGraphSize();
    syncGraphRenderSize(null, renderSize);
    // Capture the actual visible frame before deriving the next graph's local
    // coordinate system. A long-lived cross-page cache mixes unrelated local
    // spaces and makes portraits appear at positions from an older article.
    cacheCurrentGraphPositions();
    const graphData = buildGraphDataForEntity(focusEntityId || state.currentEntityId);

    if (!state.sidebarGraph) {
      container.innerHTML = '';
      container.addEventListener('mouseleave', () => {
        graphState.hoverNode = null;
        updateGraphHUD(null);
      });

      const Graph = ForceGraph()(container)
        .width(renderSize.width)
        .height(renderSize.height)
        // Match ForceGraph's measured bounds to the radius used by our custom
        // canvas renderer; the previous value (25) made zoomToFit over-shrink.
        .nodeRelSize(4)
        .backgroundColor('rgba(0,0,0,0)')
        .nodeId('id')
        .nodeVal('val')
        .nodeLabel((node) => window.innerWidth > 768 ? (node.label || node.id) : '')
        .linkCurvature(0.18)
        .linkWidth((link) => {
          const sourceId = getLinkEndpointId(link.source);
          const targetId = getLinkEndpointId(link.target);
          const activeId = (graphState.focusedNode && graphState.focusedNode.id) || (graphState.hoverNode && graphState.hoverNode.id);
          const baseWidth = activeId
            ? (sourceId === activeId || targetId === activeId ? 1.8 : 0.45)
            : (sourceId === state.currentEntityId || targetId === state.currentEntityId ? 1.25 : 0.8);
          return baseWidth * getGraphEnterProgress(link);
        })
        .linkColor((link) => {
          const isDark = state.theme === 'dark';
          const isSepia = state.theme === 'sepia';
          if (graphState.focusedNode) {
            const fId = graphState.focusedNode.id;
            const isConnected = getLinkEndpointId(link.source) === fId || getLinkEndpointId(link.target) === fId;
            if (isConnected) {
              return isDark ? 'rgba(255,255,255,0.45)' : (isSepia ? 'rgba(45,38,30,0.45)' : 'rgba(0,0,0,0.35)');
            }
            return isDark ? 'rgba(255,255,255,0.02)' : (isSepia ? 'rgba(45,38,30,0.02)' : 'rgba(0,0,0,0.015)');
          }
          return isDark ? 'rgba(255,255,255,0.18)' : (isSepia ? 'rgba(45,38,30,0.18)' : 'rgba(0,0,0,0.12)');
        })
        .d3VelocityDecay(0.30)
        .onEngineStop(() => {
          cacheCurrentGraphPositions();
        })
        .onNodeDragEnd((node) => {
          if (!node.isPrimary) {
            node.fx = undefined;
            node.fy = undefined;
          }
          fitGraphToViewport(Graph, 260);
        })
        .onNodeHover((node) => {
          if (!graphState.focusedNode) {
            graphState.hoverNode = node || null;
            updateGraphHUD(node);
          }
        })
        .onNodeClick(async (node) => {
          if (!node || !node.id) return;
          const isMobileDevice = window.innerWidth <= 768;

          if (!isMobileDevice) {
            await navigateFromGraphNode(node.id, { collapseGraph: false });
            return;
          }

          if (graphState.focusedNode && graphState.focusedNode.id === node.id) {
            await navigateFromGraphNode(node.id);
            return;
          }

          graphState.focusedNode = node;
          graphState.hoverNode = node;
          if (state.sidebarGraph && state.sidebarGraph.centerAt) {
            // Preserve the mobile camera protocol: center the selected node,
            // with only the original small upward allowance for the bottom tray.
            const offsetY = state.isGraphExpanded ? 36 : 0;
            state.sidebarGraph.centerAt(node.x, node.y + offsetY, 180);
          }
          showBoundlessInspector(node);
        })
        .onBackgroundClick(() => {
          const isMobileDevice = window.innerWidth <= 768;
          if (graphState.focusedNode) {
            graphState.focusedNode = null;
            graphState.hoverNode = null;
            if (isMobileDevice) hideBoundlessInspector();
            fitGraphToViewport(Graph, 260);
          }
        })
        .nodePointerAreaPaint((node, color, ctx, globalScale) => {
          const scale = globalScale || (state.sidebarGraph ? state.sidebarGraph.zoom() : 1) || 1;
          const minHitR = (state.isGraphExpanded ? 24 : 16) / scale;
          let radius = Math.max((node.val || 5) * 1.5, minHitR);
          if (graphState.focusedNode && graphState.focusedNode.id === node.id) {
            const minCanvasR = 42 / scale;
            const maxCanvasR = 70 / scale;
            radius = Math.min(maxCanvasR, Math.max((node.val || 5) * 3.5, minCanvasR));
          }
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 8, 0, 2 * Math.PI, false);
          ctx.fill();
        })
        .nodeCanvasObject((node, ctx, globalScale) => {
          const isFocused = graphState.focusedNode && graphState.focusedNode.id === node.id;
          const isHovered = graphState.hoverNode && graphState.hoverNode.id === node.id;
          const isPrimary = (state.currentEntityId === node.id) || node.isPrimary;
          
          let alpha = 1;
          if (graphState.focusedNode) {
            // Everything else blurs/dissolves deeply into a bokeh background
            alpha = isFocused ? 1 : 0.08;
          } else if (graphState.hoverNode) {
            alpha = (isPrimary || isHovered) ? 1 : 0.65;
          }
          alpha *= getGraphEnterProgress(node);

          ctx.save();
          ctx.globalAlpha = alpha;

          const baseColor = getCategoryColor(node.type);
          let radius = node.val || 5;
          if (isFocused) {
            const scale = globalScale || (state.sidebarGraph ? state.sidebarGraph.zoom() : 1) || 1;
            const minCanvasR = 42 / scale; // Hero screen radius: 42px (84px diameter)
            const maxCanvasR = 70 / scale; // Hero screen ceiling: 70px (140px diameter)
            radius = Math.min(maxCanvasR, Math.max((node.val || 5) * 3.5, minCanvasR));
          } else if (isHovered) {
            if (state.isGraphExpanded) {
              const scale = globalScale || (state.sidebarGraph ? state.sidebarGraph.zoom() : 1) || 1;
              const minCanvasR = 18 / scale; // Floor: at least 36px diameter on screen
              const maxCanvasR = 32 / scale; // Ceiling: at most 64px diameter on screen
              radius = Math.min(maxCanvasR, Math.max(radius * 1.8, minCanvasR));
            } else {
              radius = radius * 1.414;
            }
          }

          // If node has cached image, draw pure borderless circular portrait
          let hasDrawnImage = false;
          if (node.imgSrc && graphState.imgCache.has(node.imgSrc)) {
            const img = graphState.imgCache.get(node.imgSrc);
            if (img && img.complete && img.naturalWidth > 0) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
              ctx.clip();
              drawGraphImageCover(ctx, img, node.x - radius, node.y - radius, radius * 2);
              ctx.restore();
              hasDrawnImage = true;
            }
          }

          // If no image, draw pure flat solid dot (100% Zero-Stroke, Zero-Ring)
          if (!hasDrawnImage) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = baseColor;
            ctx.fill();
          }

          ctx.restore();
        });

      state.sidebarGraph = Graph;
      graphState.renderSize = { width: Math.round(renderSize.width), height: Math.round(renderSize.height) };
      applyGraphData(Graph, graphData, false);
    } else {
      syncGraphRenderSize(state.sidebarGraph, renderSize);
      applyGraphData(state.sidebarGraph, graphData, options.animate !== false);
    }

    updateGraphHUD(null);
  }

  function scheduleGraphForPage(entityId, options = {}) {
    const shouldDefer = window.innerWidth <= 768
      && !state.isGraphExpanded
      && state.graphPhase === 'small';
    if (shouldDefer) {
      graphState.pendingEntityId = entityId;
      graphState.hasPendingData = true;
      return;
    }

    graphState.hasPendingData = false;
    initBalancedTopologyGraph(entityId, options);
  }

  function flushPendingGraphData() {
    if (!graphState.hasPendingData) return;
    const entityId = graphState.pendingEntityId;
    graphState.hasPendingData = false;
    initBalancedTopologyGraph(entityId, { animate: false });
  }

  function applyFixedGraphRect(container, rect) {
    container.style.position = 'fixed';
    container.style.inset = 'auto';
    container.style.left = `${rect.left}px`;
    container.style.top = `${rect.top}px`;
    container.style.width = `${rect.width}px`;
    container.style.height = `${rect.height}px`;
    container.style.margin = '0';
    container.style.zIndex = window.innerWidth <= 768 ? '500' : '100';
  }

  function resetGraphContainerStyles(container) {
    ['position', 'inset', 'left', 'top', 'width', 'height', 'margin', 'zIndex', 'background'].forEach((property) => {
      container.style[property] = '';
    });
  }

  function getMobileLauncherGraphRect(launcher) {
    const anchor = launcher.getBoundingClientRect();
    const width = Math.min(180, window.innerWidth);
    const height = Math.min(128, window.innerHeight);
    const centerX = anchor.left + anchor.width / 2;
    const centerY = anchor.top + anchor.height / 2;
    return {
      left: Math.max(0, Math.min(window.innerWidth - width, centerX - width / 2)),
      top: Math.max(0, Math.min(window.innerHeight - height, centerY - height / 2)),
      width,
      height
    };
  }

  function toggleGraphExpand(forceState, options = {}) {
    const container = getEl('sidebar-graph-container');
    const slot = getEl('sidebar-graph-slot') || (container ? container.parentElement : null);
    if (!container || !state.sidebarGraph || !slot) return Promise.resolve();

    const targetState = typeof forceState === 'boolean' ? forceState : !state.isGraphExpanded;
    const transitionDuration = Number.isFinite(options.duration)
      ? Math.max(0, options.duration)
      : 420;
    const isStable = state.graphPhase === 'small' || state.graphPhase === 'expanded';
    if (targetState === state.isGraphExpanded && isStable) return Promise.resolve();
    if (!isStable) {
      return graphState.containerTransitionPromise.then(() => toggleGraphExpand(targetState, options));
    }

    graphState.containerTransitionPromise = (async () => {
      const isMobile = window.innerWidth <= 768;
      const launcher = getEl('btn-mobile-graph-launcher');
      if (targetState && isMobile) flushPendingGraphData();
      const startRect = container.getBoundingClientRect();
      const sidebar = getEl('wiki-sidebar');
      if (targetState && isMobile) {
        state.graphReturnSurface = sidebar && sidebar.classList.contains('is-open') ? 'sidebar' : 'article';
      }
      state.isGraphExpanded = targetState;

      if (targetState) {
        state.graphPhase = 'expanding';
        if (launcher) {
          launcher.style.opacity = '0';
          launcher.style.pointerEvents = 'none';
        }

        const expandedSize = getExpandedGraphSize();
        syncGraphRenderSize(state.sidebarGraph, expandedSize);
        const targetRect = {
          left: 0,
          top: isMobile ? 0 : 52,
          width: expandedSize.width,
          height: expandedSize.height
        };
        document.body.appendChild(container);
        closeMobileSidebar();
        container.classList.add('is-expanded');
        document.body.classList.add('graph-is-expanded');
        // Interaction-mode changes can reset ForceGraph's zoom transform.
        // Apply them before capturing the transition camera so the single
        // interpolation below is the final authority over the whole motion.
        configureGraphPhysics(state.sidebarGraph, true);
        const originRect = isMobile && state.graphReturnSurface === 'article' && launcher
          ? getMobileLauncherGraphRect(launcher)
          : startRect;
        applyFixedGraphRect(container, originRect);
        await morphGraphViewport(
          container,
          state.sidebarGraph,
          originRect,
          () => targetRect,
          transitionDuration,
          1
        );
        state.graphPhase = 'expanded';
      } else {
        state.graphPhase = 'collapsing';
        graphState.focusedNode = null;
        graphState.hoverNode = null;
        hideBoundlessInspector();
        if (isMobile && state.graphReturnSurface === 'sidebar') openMobileSidebar();
        configureGraphPhysics(state.sidebarGraph, false);
        const returnsToArticleLauncher = isMobile && state.graphReturnSurface === 'article' && launcher;
        const getCollapseTarget = () => (
          returnsToArticleLauncher
            ? getMobileLauncherGraphRect(launcher)
            : slot.getBoundingClientRect()
        );
        await morphGraphViewport(
          container,
          state.sidebarGraph,
          startRect,
          getCollapseTarget,
          transitionDuration,
          0
        );

        slot.appendChild(container);
        container.classList.remove('is-expanded');
        document.body.classList.remove('graph-is-expanded');
        resetGraphContainerStyles(container);
        state.graphPhase = 'small';
        if (launcher) {
          launcher.style.opacity = '';
          launcher.style.pointerEvents = '';
        }
        // The launcher-origin preview collapses into an article-only control.
        // Once it is offscreen, prepare the sidebar camera for its next reveal.
        if (returnsToArticleLauncher) {
          const slotRect = slot.getBoundingClientRect();
          fitGraphToViewport(state.sidebarGraph, 0, {
            size: { width: slotRect.width || 268, height: slotRect.height || 145 },
            expansionProgress: 0
          });
        }
      }
    })();

    return graphState.containerTransitionPromise;
  }

  async function navigateFromGraphNode(entityId, options = {}) {
    const collapseGraph = options.collapseGraph !== false;
    const isMobile = window.innerWidth <= 768;
    hideBoundlessInspector();
    graphState.focusedNode = null;
    graphState.hoverNode = null;
    state.graphReturnSurface = 'article';
    if (collapseGraph && (state.isGraphExpanded || state.graphPhase !== 'small')) {
      await toggleGraphExpand(false, { duration: isMobile ? 180 : 420 });
    }
    closeMobileSidebar();
    clearActiveNav();
    openEntityArticle(entityId, { animateGraph: !isMobile });
  }

  function showBoundlessInspector(node) {
    const inspector = getEl('boundless-node-inspector');
    if (!inspector || !node) return;

    const title = getEl('boundless-title');
    if (title) {
      const label = node.label || node.id;
      title.textContent = label;

      // Intelligent Dynamic Auto-Fit: dynamically downscales for long or multi-line entity titles
      if (label.length > 36) {
        title.style.fontSize = '1.15rem';
        title.style.lineHeight = '1.25';
      } else if (label.length > 20) {
        title.style.fontSize = '1.45rem';
        title.style.lineHeight = '1.2';
      } else {
        title.style.fontSize = '';
        title.style.lineHeight = '';
      }
    }

    const enterArticle = async (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      await navigateFromGraphNode(node.id);
    };

    inspector.onclick = enterArticle;
    inspector.classList.add('is-active');
    initIcons();
  }

  function hideBoundlessInspector() {
    const inspector = getEl('boundless-node-inspector');
    if (inspector) inspector.classList.remove('is-active');
  }

  /**
   * Mobile Native Gesture Engine (手势滑动操控系统)
   * 1. Horizontal Drawer: Left-to-Right Swipe to Open, Right-to-Left to Close
   * 2. Pull-Down in Default State: Top Pull-Down on Sidebar / Small Graph to Expand Fullscreen
   * 3. Bottom 36% Hero Action Stage: Dedicated Touch Capture for Swipe-Up to Read & Tap to Read
   */
  function initMobileGestures() {
    // Strictly mobile-only gesture engine (<= 768px)
    const isMobileDevice = window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1080);
    if (!isMobileDevice) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTrackingGlobal = false;

    // 1. Global Horizontal Swipe (Main Reading Area Left -> Right)
    document.addEventListener('touchstart', (e) => {
      if (window.innerWidth > 768 || e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      isTrackingGlobal = true;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!isTrackingGlobal || e.changedTouches.length !== 1) return;
      isTrackingGlobal = false;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const elapsed = Date.now() - touchStartTime;

      const isMobile = window.innerWidth <= 1080;
      if (!isMobile) return;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Horizontal Swipe Check
      if (absX > 60 && absX > absY * 1.3 && elapsed < 600) {
        const sidebar = getEl('wiki-sidebar');
        const isOpen = sidebar && sidebar.classList.contains('is-open');

        if (deltaX > 0 && !isOpen && !state.isGraphExpanded) {
          // Swipe Left -> Right on Main Article: Open Horizontal Drawer
          toggleMobileSidebar();
        } else if (deltaX < 0 && isOpen) {
          // Swipe Right -> Left on Open Sidebar: Close Horizontal Drawer
          closeMobileSidebar();
        }
      }
    }, { passive: true });

    // 2. Sidebar Pull-Down in Default State (侧边栏处于默认/顶部状态时，下拉直接展开全屏大图谱)
    const sidebar = getEl('wiki-sidebar');
    if (sidebar) {
      let sbTouchStartY = 0;
      let sbTouchStartX = 0;
      let sbTouchTime = 0;
      let isSidebarTouching = false;

      sidebar.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        sbTouchStartX = e.touches[0].clientX;
        sbTouchStartY = e.touches[0].clientY;
        sbTouchTime = Date.now();
        isSidebarTouching = true;
      }, { passive: true });

      sidebar.addEventListener('touchend', (e) => {
        if (!isSidebarTouching || e.changedTouches.length !== 1) return;
        isSidebarTouching = false;

        const deltaY = e.changedTouches[0].clientY - sbTouchStartY;
        const deltaX = e.changedTouches[0].clientX - sbTouchStartX;
        const elapsed = Date.now() - sbTouchTime;

        const navHub = sidebar.querySelector('.wiki-nav-hub');
        const stickyWrap = sidebar.querySelector('.wiki-sidebar-sticky');
        const isAtTop = (!navHub || navHub.scrollTop <= 10) && (!stickyWrap || stickyWrap.scrollTop <= 10);

        // Pull Down Gesture: Triggered directly in default state on the very first pull!
        if (isAtTop && deltaY > 35 && deltaY > Math.abs(deltaX) * 1.05 && elapsed < 600 && !state.isGraphExpanded) {
          toggleGraphExpand(true);
        }
      }, { passive: true });
    }

    // 3. Dedicated Bottom 36% Hero Action Stage Touch Handling (专属大窗手势底栏)
    const boundlessInspector = getEl('boundless-node-inspector');
    if (boundlessInspector) {
      let inspStartY = 0;
      let inspStartX = 0;
      let inspStartTime = 0;

      boundlessInspector.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        inspStartX = e.touches[0].clientX;
        inspStartY = e.touches[0].clientY;
        inspStartTime = Date.now();
      }, { passive: true });

      boundlessInspector.addEventListener('touchend', (e) => {
        if (e.changedTouches.length !== 1) return;
        const deltaY = e.changedTouches[0].clientY - inspStartY;
        const deltaX = e.changedTouches[0].clientX - inspStartX;
        const elapsed = Date.now() - inspStartTime;
        const absY = Math.abs(deltaY);
        const absX = Math.abs(deltaX);

        if (absY > 25 && absY > absX * 1.1 && elapsed < 600) {
          if (deltaY < 0) {
            // Swipe UP in bottom zone: Immediately enter entity article!
            if (graphState.focusedNode) {
              const focusedId = graphState.focusedNode.id;
              navigateFromGraphNode(focusedId);
            } else {
              toggleGraphExpand(false);
            }
          } else if (deltaY > 35) {
            // Swipe DOWN: Collapse graph
            toggleGraphExpand(false);
          }
        } else if (absY < 15 && absX < 15 && elapsed < 400) {
          // Tap anywhere in bottom zone: Enter article
          if (graphState.focusedNode) {
            const focusedId = graphState.focusedNode.id;
            navigateFromGraphNode(focusedId);
          }
        }
      }, { passive: true });
    }

    // 4. Global Fullscreen Graph Swipe Collapse
    const graphContainer = getEl('sidebar-graph-container');
    if (graphContainer) {
      let graphTouchStartY = 0;
      let graphTouchStartX = 0;
      let graphTouchTime = 0;

      graphContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        graphTouchStartX = e.touches[0].clientX;
        graphTouchStartY = e.touches[0].clientY;
        graphTouchTime = Date.now();
      }, { passive: true });

      graphContainer.addEventListener('touchend', (e) => {
        if (!state.isGraphExpanded || e.changedTouches.length !== 1) return;
        const deltaY = e.changedTouches[0].clientY - graphTouchStartY;
        const deltaX = e.changedTouches[0].clientX - graphTouchStartX;
        const elapsed = Date.now() - graphTouchTime;
        const absY = Math.abs(deltaY);
        const absX = Math.abs(deltaX);

        if (absY > 40 && absY > absX * 1.2 && elapsed < 600) {
          if (deltaY < 0 && !graphState.focusedNode) {
            // Swipe UP when no node focused: Collapse to small window
            toggleGraphExpand(false);
          } else if (deltaY > 50) {
            // Swipe DOWN: Collapse to small window
            toggleGraphExpand(false);
          }
        }
      }, { passive: true });
    }
  }

  function initGraphControls() {
    const expandBtn = getEl('btn-graph-expand');
    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleGraphExpand(true);
      });
    }

    const mobileGraphCloseBtn = getEl('btn-mobile-graph-close');
    if (mobileGraphCloseBtn) {
      mobileGraphCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleGraphExpand(false);
      });
    }

    const mobileGraphLauncher = getEl('btn-mobile-graph-launcher');
    if (mobileGraphLauncher) {
      mobileGraphLauncher.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMobileSidebar();
        toggleGraphExpand(true);
      });
    }

    const backToTopBtn = getEl('btn-back-to-top');
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Click outside large window to close
    document.addEventListener('click', (e) => {
      if (!state.isGraphExpanded) return;
      const container = getEl('sidebar-graph-container');
      if (container && !container.contains(e.target)) {
        toggleGraphExpand(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isGraphExpanded) {
        toggleGraphExpand(false);
      }
    });

    let resizeRaf = null;
    const handleResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (!state.sidebarGraph || (state.graphPhase !== 'small' && state.graphPhase !== 'expanded')) return;
        if (window.innerWidth > 768) flushPendingGraphData();
        const container = getEl('sidebar-graph-container');
        const canvasContainer = getEl('canvas-sidebar-graph');
        if (!container || !canvasContainer) return;
        const expSize = getExpandedGraphSize();
        if (state.isGraphExpanded) {
          applyFixedGraphRect(container, {
            left: 0,
            top: window.innerWidth <= 768 ? 0 : 52,
            width: expSize.width,
            height: expSize.height
          });
          configureGraphPhysics(state.sidebarGraph, true);
        } else {
          configureGraphPhysics(state.sidebarGraph, false);
        }
        syncGraphRenderSize(state.sidebarGraph, expSize);
        // ForceGraph resets its camera when its backing store changes. Apply
        // the logical viewport camera on the next paint, after that reset.
        requestAnimationFrame(() => {
          if (state.graphPhase !== 'small' && state.graphPhase !== 'expanded') return;
          fitGraphToViewport(state.sidebarGraph, 0, {
            size: state.isGraphExpanded ? expSize : getCurrentGraphViewportSize(),
            expansionProgress: state.isGraphExpanded ? 1 : 0
          });
        });
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 150);
    }, { passive: true });

    if (window.ResizeObserver) {
      const slot = getEl('sidebar-graph-slot');
      if (slot) {
        const observer = new ResizeObserver(handleResize);
        observer.observe(slot);
      }
    }
  }

  function focusGraphNode(entityId) {
    if (!state.sidebarGraph || !state.graphNodeMap) return;
    const node = state.graphNodeMap.get(entityId);
    if (node && state.sidebarGraph.centerAt) {
      state.sidebarGraph.centerAt(node.x, node.y, 400);
      graphState.highlightNodes.clear();
      graphState.highlightLinks.clear();
      graphState.highlightNodes.add(node.id);
      if (node.neighbors) node.neighbors.forEach((nbr) => graphState.highlightNodes.add(nbr.id));
      if (node.links) node.links.forEach((l) => graphState.highlightLinks.add(l));
    }
  }

  function showArticleView(targetViewId) {
    document.querySelectorAll('.wiki-article-view').forEach((v) => {
      v.style.display = 'none';
    });
    const targetEl = getEl(targetViewId);
    if (targetEl) targetEl.style.display = 'block';

    const mainArticle = document.querySelector('.wiki-main-article');
    if (mainArticle) {
      if (targetViewId === 'view-storyline' || targetViewId === 'view-storyflow') {
        mainArticle.classList.add('wide-stage');
      } else {
        mainArticle.classList.remove('wide-stage');
      }
    }

    window.scrollTo(0, 0);
    initIcons();
    closeMobileSidebar();
  }

  function openEntityArticle(entityId, options = {}) {
    const knowledgeIndex = getKnowledgeIndex();
    const resolvedEntityId = resolveEntityId(entityId, knowledgeIndex) || entityId;
    entityId = resolvedEntityId;
    state.currentEntityId = resolvedEntityId;

    // Reset global graph state to prevent ghost/orphaned nodes from dimming the new graph
    graphState.focusedNode = null;
    graphState.hoverNode = null;
    hideBoundlessInspector();

    // Reset sidebar scroll top to strictly prevent slot from shifting upwards
    const stickyWrap = document.querySelector('.wiki-sidebar-sticky');
    if (stickyWrap) stickyWrap.scrollTop = 0;

    // Highlight and scroll matching TOC link
    document.querySelectorAll('.toc-item').forEach((i) => i.classList.remove('active'));
    const tocLink = document.querySelector(`.entity-toc-link[data-id="${entityId}"]`);
    if (tocLink) {
      tocLink.classList.add('active');
      const parentDetails = tocLink.closest('details');
      if (parentDetails) parentDetails.open = true;
      const sidebar = getEl('wiki-sidebar');
      if (sidebar && sidebar.classList.contains('is-open')) {
        tocLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    const animateGraph = options.animateGraph === undefined
      ? window.innerWidth > 768
      : options.animateGraph;
    scheduleGraphForPage(entityId, { animate: animateGraph });

    const foundNode = knowledgeIndex && knowledgeIndex.nodesById.get(resolvedEntityId);
    const foundCat = (foundNode && foundNode.type) || 'Characters';

    const label = foundNode ? foundNode.label : entityId;

    const catEl = getEl('view-entity-cat');
    if (catEl) catEl.textContent = foundCat.replace(/s$/, '');

    const titleEl = getEl('view-entity-title');
    if (titleEl) titleEl.textContent = label;

    // Load Entity Image (Pure Figure, No Artificial Text Labels)
    const images = (window.WIKI_STORE && window.WIKI_STORE.images) || {};
    const imgPath = images[label] || images[entityId];
    const mediaEl = getEl('view-entity-media');
    const imgEl = getEl('view-entity-img');

    if (mediaEl && imgEl) {
      if (imgPath) {
        imgEl.src = imgPath;
        imgEl.alt = label;
        mediaEl.style.display = 'block';
      } else {
        mediaEl.style.display = 'none';
      }
    }

    const mdEl = getEl('view-entity-markdown');
    if (mdEl) {
      if (!window.__entityMdCache) window.__entityMdCache = new Map();
      const cacheKey = `${state.lang}_${entityId}`;
      if (window.__entityMdCache.has(cacheKey)) {
        mdEl.innerHTML = window.__entityMdCache.get(cacheKey);
      } else {
        const articles = (window.WIKI_STORE && window.WIKI_STORE.articles) || {};
        let md = articles[label] || articles[entityId];
        if (!md) {
          md = `## Overview\n\n**${label}** is a canonical entity in George Orwell's *Nineteen Eighty-Four*.\n\n## Narrative Significance\n\nDirectly interlinked with Winston Smith's psychological struggle, the surveillance apparatus of the Party, and the reality control of Ingsoc.`;
        }

        // Clean internal raw extraction metadata, duplicate top h1, and dangling empty Related StoryFlow footer
        let cleanMd = md
          .replace(/^#\s+[^\n]+\n*/, '')
          .replace(/>\s+\*\*分类\/标签\*\*:[^\n]*\n*/gi, '')
          .replace(/>\s+\*\*源文件\*\*:[^\n]*\n*/gi, '')
          .replace(/^---\s*\n*/gm, '')
          .replace(/^#\s+[^\n]+\n*/, '')
          .replace(/##\s+Related StoryFlow[\s\S]*$/i, '')
          .trim();

        let parsed = '';
        if (window.marked && window.marked.parse) {
          parsed = window.marked.parse(cleanMd);
        } else {
          parsed = `<p>${cleanMd.replace(/\n\n/g, '</p><p>')}</p>`;
        }
        window.__entityMdCache.set(cacheKey, parsed);
        mdEl.innerHTML = parsed;
      }
    }

    showArticleView('view-entity');
  }

  function toggleTheme() {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    state.theme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    const themeIcon = getEl('icon-theme');
    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', newTheme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) window.lucide.createIcons();
    }
    if (state.sidebarGraph) {
      configureGraphPhysics(state.sidebarGraph, state.isGraphExpanded);
      if (state.sidebarGraph.refresh) state.sidebarGraph.refresh();
    }
  }

  function toggleFont() {
    state.font = state.font === 'sans' ? 'serif' : 'sans';
    document.documentElement.setAttribute('data-font', state.font);
    const fontBtn = getEl('btn-font-toggle');
    if (fontBtn) {
      const span = fontBtn.querySelector('span');
      if (span) span.textContent = state.font === 'sans' ? 'Serif' : 'Sans';
    }
  }

  function closeMobileSidebar() {
    const sidebar = getEl('wiki-sidebar');
    const backdrop = getEl('sidebar-backdrop');
    if (sidebar) {
      sidebar.classList.remove('is-open');
    }
    if (backdrop) {
      backdrop.classList.remove('is-visible');
    }
  }

  function openMobileSidebar() {
    const sidebar = getEl('wiki-sidebar');
    const backdrop = getEl('sidebar-backdrop');
    flushPendingGraphData();
    if (sidebar) sidebar.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-visible');
  }

  function toggleMobileSidebar() {
    const sidebar = getEl('wiki-sidebar');
    const backdrop = getEl('sidebar-backdrop');
    const isMobile = window.innerWidth <= 1080;
    if (sidebar) {
      if (isMobile) {
        const isOpen = sidebar.classList.contains('is-open');
        if (isOpen) {
          sidebar.classList.remove('is-open');
          if (backdrop) backdrop.classList.remove('is-visible');
        } else {
          openMobileSidebar();
        }
      } else {
        sidebar.classList.toggle('collapsed');
      }
    }
  }

  function initHeaderControls() {
    const btnToggleSidebar = getEl('btn-toggle-sidebar');
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', toggleMobileSidebar);
    }

    const btnSidebarClose = getEl('btn-sidebar-close');
    if (btnSidebarClose) {
      btnSidebarClose.addEventListener('click', closeMobileSidebar);
    }

    const backdrop = getEl('sidebar-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeMobileSidebar);
      backdrop.addEventListener('touchstart', closeMobileSidebar, { passive: true });
    }

    const wikiLogo = getEl('wiki-logo');
    if (wikiLogo) {
      wikiLogo.addEventListener('click', (e) => {
        e.preventDefault();
        openBookOverview();
      });
    }

    const btnThemeToggle = getEl('btn-theme-toggle');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', toggleTheme);
    }

    const langContainer = getEl('lang-menu-container');
    const btnLang = getEl('btn-lang');
    const langDropdown = getEl('lang-dropdown');
    
    if (btnLang && langDropdown && langContainer) {
      btnLang.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown.classList.toggle('is-open');
      });
      
      const langItems = langDropdown.querySelectorAll('.wiki-dropdown-item:not(.disabled)');
      langItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const selectedLang = item.getAttribute('data-lang');
          if (selectedLang !== state.lang) {
            state.lang = selectedLang;
            langItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            renderBookArticle();
          }
          langDropdown.classList.remove('is-open');
        });
      });

      document.addEventListener('click', (e) => {
        if (!langContainer.contains(e.target)) {
          langDropdown.classList.remove('is-open');
        }
      });
    }

    const btnBackToTop = getEl('btn-back-to-top');
    if (btnBackToTop) {
      btnBackToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
