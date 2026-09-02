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
    initMobileGraphContinuum();
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
    const isMobile = isMobileGraphViewport();
    const isClosingExpandedMobileGraph = isMobile
      && (state.isGraphExpanded || state.graphPhase !== 'small');
    const sidebar = getEl('wiki-sidebar');
    const isSidebarNavigation = Boolean(
      isClosingExpandedMobileGraph
      && sidebar
      && sidebar.classList.contains('is-open')
    );
    const sidebarOwnsOverlayGraph = isSidebarNavigation
      && isMobileGraphSidebarOverlayLeaseActive();
    if (!isClosingExpandedMobileGraph) {
      graphState.focusedNode = null;
      graphState.hoverNode = null;
    } else {
      cancelMobileGraphFocusTransition();
    }
    if (state.isGraphExpanded || state.graphPhase !== 'small') {
      const directReadingNavigation = isClosingExpandedMobileGraph
        && !isSidebarNavigation
        && isMobileGraphContinuumStableReading();
      await toggleGraphExpand(false, {
        // A header link changes reading destinations; it is not a request to
        // watch the hidden graph shrink. Commit that swap atomically before the
        // next paint. A choice made inside the opaque drawer may safely keep the
        // short host handoff behind it.
        duration: directReadingNavigation || sidebarOwnsOverlayGraph
          ? 0
          : (window.innerWidth <= 768 ? 180 : 420),
        destination: isSidebarNavigation ? 'sidebar' : 'article'
      });
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
    hoverNode: null,
    focusedNode: null,
    imgCache: new Map(),
    knowledgeIndex: null,
    layoutTransition: null,
    cameraTransition: null,
    activeTargetPositions: new Map(),
    nodeSprings: new Map(),
    nodeSpringFrame: null,
    draggedNodeId: null,
    renderSize: null,
    dataRevision: 0,
    pendingEntityId: null,
    hasPendingData: false,
    pointerGesture: null,
    pointerGestureRevision: 0,
    pointerIntentBound: false,
    mobileFocusWeights: new Map(),
    mobileFocusTransition: null,
    mobileExpansionProgress: 0,
    mobileNodeGestureUntil: 0,
    continuumEntityId: null,
    continuumPosition: 0,
    continuumVelocity: 0,
    continuumMotionFrame: null,
    continuumMotionGeneration: 0,
    continuumMotionTarget: null,
    continuumGesture: null,
    continuumViewportWidth: null,
    continuumViewportHeight: null,
    continuumHeaderHeight: null,
    continuumPreviewPeek: null,
    continuumRenderResizeTimer: null,
    continuumRenderResizePending: false,
    sidebarOverlayLease: null,
    sidebarOverlayLeaseRestore: null,
    resizeFrame: null,
    resizeRevision: 0,
    resizePending: false,
    containerTransitionPromise: Promise.resolve()
  };

  const DESKTOP_GRAPH_CLICK_SLOP_PX = 6;
  const MOBILE_GRAPH_TAP_SLOP_PX = 10;
  const MOBILE_GRAPH_FOCUS_DURATION_MS = 240;
  const MOBILE_GRAPH_FOCUS_SCALE = 1.5;
  const MOBILE_GRAPH_FOCUS_MIN_GROWTH_PX = 6;
  const MOBILE_GRAPH_FOCUS_MAX_GROWTH_PX = 10;
  const MOBILE_GRAPH_CONTROL_ICON_INSET_PX = 13;
  const MOBILE_CONTINUUM_HEADER_REVEAL_START = 0.62;
  const MOBILE_CONTINUUM_TOUCH_SLOP_PX = 7;
  const MOBILE_CONTINUUM_VELOCITY_WINDOW_MS = 120;
  const MOBILE_CONTINUUM_VELOCITY_STALE_MS = 140;
  const MOBILE_CONTINUUM_MAX_RELEASE_SPEED = 1900;
  const MOBILE_CONTINUUM_FLING_SPEED = 620;
  const MOBILE_CONTINUUM_PROJECTION_SECONDS = 0.16;
  const MOBILE_CONTINUUM_OPEN_COMMIT_PROGRESS = 0.32;
  const MOBILE_CONTINUUM_CLOSE_COMMIT_PROGRESS = 0.68;
  const MOBILE_CONTINUUM_SPRING_FREQUENCY = 14;
  const MOBILE_GRAPH_CONTROL_SHAPES = {
    // The corner geometry is the desktop 10px L mapped into the bottom-right
    // of a fixed 22px icon viewport, including its 1.5px rendered stroke.
    corner: {
      first: [14.1818, 22.9091, 22.9091, 22.9091],
      second: [22.9091, 14.1818, 22.9091, 22.9091],
      strokeWidth: 1.6364
    },
    // Lucide's canonical X geometry, matching the 22px sidebar close icon.
    close: {
      first: [6, 6, 18, 18],
      second: [18, 6, 6, 18],
      strokeWidth: 1.8
    }
  };
  const GRAPH_NODE_HOME_STIFFNESS = 140;
  const GRAPH_LINK_SPRING_STIFFNESS = 55;
  const GRAPH_NODE_SPRING_DAMPING = 22;
  const GRAPH_NODE_MAX_RELEASE_SPEED = 900;

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

  function captureVisibleGraphPose(graph = state.sidebarGraph) {
    const pose = new Map();
    const data = graph && graph.graphData ? graph.graphData() : null;
    (data && data.nodes ? data.nodes : []).forEach((node) => {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
      pose.set(node.id, {
        x: node.x,
        y: node.y
      });
    });
    return pose;
  }

  const GRAPH_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const DETAIL_RING_CAPACITIES = [8, 14, 20];
  const DETAIL_RING_RADII = [32, 58, 86];

  function compareStableText(left, right) {
    const leftText = String(left || '');
    const rightText = String(right || '');
    if (leftText === rightText) return 0;
    return leftText < rightText ? -1 : 1;
  }

  function getStableGraphRotation(anchorId) {
    const text = String(anchorId || 'overview');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) / 4294967296) * Math.PI * 2;
  }

  /**
   * Produce the final graph geometry as a pure function of the selected entity
   * and its stable node order. The force engine is only a renderer here: it may
   * never "learn" or overwrite these coordinates, so reload timing, navigation
   * history and the current viewport cannot change where a graph settles.
   */
  function getDeterministicGraphPosition(indexInGraph, nodeCount, isEntityGraph, rotation) {
    if (indexInGraph === 0) return { x: 0, y: 0 };

    if (!isEntityGraph) {
      const radius = 24 + Math.sqrt(indexInGraph) * 14;
      const angle = rotation + indexInGraph * GRAPH_GOLDEN_ANGLE;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    }

    let ringNodeIndex = indexInGraph - 1;
    let remainingNodes = Math.max(0, nodeCount - 1);
    for (let ringIndex = 0; ringIndex < DETAIL_RING_CAPACITIES.length; ringIndex += 1) {
      const ringCount = Math.min(DETAIL_RING_CAPACITIES[ringIndex], remainingNodes);
      if (ringNodeIndex < ringCount) {
        const angle = rotation + ringIndex * 0.17 + (Math.PI * 2 * ringNodeIndex) / Math.max(1, ringCount);
        const radius = DETAIL_RING_RADII[ringIndex];
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      }
      ringNodeIndex -= ringCount;
      remainingNodes -= ringCount;
    }

    // Future-proof the layout if the one-hop preview limit grows beyond the
    // current 35 neighbours. Extra nodes form deterministic outer rings.
    const overflowRing = Math.floor(ringNodeIndex / 24);
    const overflowIndex = ringNodeIndex % 24;
    const radius = DETAIL_RING_RADII[DETAIL_RING_RADII.length - 1] + (overflowRing + 1) * 28;
    const angle = rotation + 0.51 + (Math.PI * 2 * overflowIndex) / 24;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  }

  function buildGraphDataForEntity(entityId, visiblePose = new Map()) {
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
        if (degreeDelta) return degreeDelta;
        const labelDelta = compareStableText(index.nodesById.get(a).label, index.nodesById.get(b).label);
        return labelDelta || compareStableText(a, b);
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
            if (degreeDelta) return degreeDelta;
            const labelDelta = compareStableText(a.label, b.label);
            return labelDelta || compareStableText(a.id, b.id);
          });
        selectedIds.push(...candidates.slice(0, limit).map((node) => node.id));
      });
    }

    const selectedSet = new Set(selectedIds);
    const anchorId = primaryId || selectedIds[0];
    const edgePairs = [];
    const visualEdges = new Set();
    if (primaryId) {
      selectedIds.slice(1).forEach((neighborId) => {
        edgePairs.push([primaryId, neighborId]);
      });
    } else {
      index.edges.forEach((edge) => {
        if (!selectedSet.has(edge.source) || !selectedSet.has(edge.target)) return;
        const key = edge.source < edge.target
          ? `${edge.source}\u0000${edge.target}`
          : `${edge.target}\u0000${edge.source}`;
        if (visualEdges.has(key)) return;
        visualEdges.add(key);
        edgePairs.push([edge.source, edge.target]);
      });
    }

    const visibleAnchor = visiblePose.get(anchorId);
    const nodeMap = new Map();
    const targetPositions = new Map();
    const rotation = getStableGraphRotation(anchorId);

    selectedIds.forEach((id, indexInGraph) => {
      const raw = index.nodesById.get(id);
      if (!raw) return;
      const target = getDeterministicGraphPosition(
        indexInGraph,
        selectedIds.length,
        !!primaryId,
        rotation
      );
      const visible = visiblePose.get(id);
      const canContinueFromVisiblePose = !!(visibleAnchor && visible);
      const start = id === anchorId
        ? { x: 0, y: 0 }
        : (canContinueFromVisiblePose
          ? { x: visible.x - visibleAnchor.x, y: visible.y - visibleAnchor.y }
          : (visibleAnchor
            ? { x: target.x * 0.55, y: target.y * 0.55 }
            : target));
      const node = createGraphNode(raw, id === primaryId || (!primaryId && id === anchorId), index.degree.get(id) || 0, start.x, start.y);
      targetPositions.set(id, { x: target.x, y: target.y });
      // Pin every node before graphData reaches ForceGraph. This prevents its
      // asynchronous simulation from inserting a path-dependent intermediate
      // layout between our transition frames.
      node.fx = start.x;
      node.fy = start.y;
      node.vx = 0;
      node.vy = 0;
      nodeMap.set(id, node);
    });

    const links = edgePairs.map(([source, target]) => ({ source, target }));

    return {
      nodes: Array.from(nodeMap.values()),
      links,
      nodeMap,
      cameraShift: visibleAnchor ? { x: visibleAnchor.x, y: visibleAnchor.y } : null,
      layout: {
        targetPositions
      }
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

  function isDesktopExpandedGraphInteraction() {
    return window.innerWidth > 768
      && state.isGraphExpanded
      && state.graphPhase === 'expanded';
  }

  function isMobileGraphViewport() {
    return window.innerWidth <= 768;
  }

  function isMobileExpandedGraphInteraction() {
    return isMobileGraphViewport()
      && state.isGraphExpanded
      && state.graphPhase === 'expanded'
      && !isMobileGraphSidebarOverlayLeaseActive();
  }

  function snapshotGraphNodes(graph) {
    const snapshot = new Map();
    const nodes = ((graph && graph.graphData && graph.graphData()) || {}).nodes || [];
    nodes.forEach((node) => {
      snapshot.set(node.id, {
        x: node.x,
        y: node.y,
        vx: node.vx,
        vy: node.vy,
        fx: node.fx,
        fy: node.fy
      });
    });
    return snapshot;
  }

  function restoreGraphNodes(graph, snapshot) {
    if (!graph || !snapshot) return;
    const nodes = ((graph.graphData && graph.graphData()) || {}).nodes || [];
    nodes.forEach((node) => {
      const saved = snapshot.get(node.id);
      if (!saved) return;
      node.x = saved.x;
      node.y = saved.y;
      node.vx = saved.vx;
      node.vy = saved.vy;
      node.fx = saved.fx;
      node.fy = saved.fy;
    });
    if (graph.refresh) graph.refresh();
  }

  function updateGraphPointerDistance(gesture, event) {
    if (!gesture || !event || event.pointerId !== gesture.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    gesture.maxDistanceSq = Math.max(gesture.maxDistanceSq, dx * dx + dy * dy);
    if (event.type !== 'pointermove') return;

    const now = performance.now();
    const sampleDx = event.clientX - gesture.lastX;
    const sampleDy = event.clientY - gesture.lastY;
    const elapsed = Math.max(1, now - gesture.lastSampleAt);
    if (sampleDx || sampleDy) {
      const blend = Math.min(0.72, elapsed / 24);
      gesture.velocityX += (sampleDx / elapsed - gesture.velocityX) * blend;
      gesture.velocityY += (sampleDy / elapsed - gesture.velocityY) * blend;
      gesture.lastMoveAt = now;
    }
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
    gesture.lastSampleAt = now;
  }

  function getGraphNodeAtClientPoint(graph, container, clientX, clientY) {
    if (!graph || !container || !graph.graph2ScreenCoords || !graph.graphData) return null;
    const canvas = container.querySelector('.force-graph-container canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = Math.max(1, canvas.clientWidth || rect.width);
    const canvasHeight = Math.max(1, canvas.clientHeight || rect.height);
    const scaleX = rect.width / canvasWidth;
    const scaleY = rect.height / canvasHeight;
    const visualScale = Math.max(scaleX, scaleY);
    const zoom = (graph.zoom && graph.zoom()) || 1;
    const nodes = (graph.graphData().nodes || []);
    let nearest = null;
    let nearestDistanceSq = Number.POSITIVE_INFINITY;

    nodes.forEach((node) => {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
      const point = graph.graph2ScreenCoords(node.x, node.y);
      const nodeX = rect.left + point.x * scaleX;
      const nodeY = rect.top + point.y * scaleY;
      const dx = clientX - nodeX;
      const dy = clientY - nodeY;
      const distanceSq = dx * dx + dy * dy;
      const hitRadius = Math.max(24, getMobileRenderedNodeRadiusPx(node, zoom) + 3)
        * visualScale;
      if (distanceSq <= hitRadius * hitRadius && distanceSq < nearestDistanceSq) {
        nearest = node;
        nearestDistanceSq = distanceSq;
      }
    });
    return nearest;
  }

  function mobileContinuumOwnsBackgroundGesture() {
    const continuum = getEl('mobile-graph-continuum');
    return Boolean(
      isMobileExpandedGraphInteraction()
      && continuum
      && continuum.classList.contains('is-active')
      && continuum.classList.contains('has-article')
    );
  }

  function initGraphPointerIntent(container) {
    if (!container || graphState.pointerIntentBound) return;
    graphState.pointerIntentBound = true;

    container.addEventListener('pointerdown', (event) => {
      cancelGraphCameraTransition();
      const isDesktop = isDesktopExpandedGraphInteraction();
      const isMobile = isMobileExpandedGraphInteraction();
      if ((!isDesktop && !isMobile) || event.button !== 0 || event.isPrimary === false) return;
      const graph = state.sidebarGraph;
      if (!graph) return;
      const pressedNode = isMobile
        ? getGraphNodeAtClientPoint(graph, container, event.clientX, event.clientY)
        : null;

      // A touch is assigned exactly once at pointer-down. Empty graph space
      // belongs to the floor controller; an actual node belongs to D3's
      // two-dimensional drag. Capture prevents ForceGraph from half-claiming a
      // background scroll and retaining stale pressed/dragging state after the
      // browser issues pointercancel.
      if (event.pointerType === 'touch'
        && mobileContinuumOwnsBackgroundGesture()
        && !pressedNode) {
        event.stopPropagation();
        return;
      }

      const now = performance.now();
      graphState.pointerGesture = {
        revision: ++graphState.pointerGestureRevision,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        lastSampleAt: now,
        lastMoveAt: now,
        velocityX: 0,
        velocityY: 0,
        maxDistanceSq: 0,
        pressedNodeId: pressedNode ? pressedNode.id : null,
        dragNodeId: null,
        platform: isMobile ? 'mobile' : 'desktop',
        clickSlopPx: isMobile ? MOBILE_GRAPH_TAP_SLOP_PX : DESKTOP_GRAPH_CLICK_SLOP_PX,
        snapshot: snapshotGraphNodes(graph),
        cancelled: false,
        handled: false
      };
    }, { passive: true, capture: true });

    container.addEventListener('touchstart', (event) => {
      if (!mobileContinuumOwnsBackgroundGesture() || event.touches.length !== 1) return;
      const graph = state.sidebarGraph;
      const touch = event.touches[0];
      if (graph && !getGraphNodeAtClientPoint(graph, container, touch.clientX, touch.clientY)) {
        event.stopPropagation();
      }
    }, { passive: true, capture: true });

    window.addEventListener('pointermove', (event) => {
      updateGraphPointerDistance(graphState.pointerGesture, event);
    }, { passive: true });

    window.addEventListener('pointerup', (event) => {
      const gesture = graphState.pointerGesture;
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      updateGraphPointerDistance(gesture, event);
      const revision = gesture.revision;
      // ForceGraph dispatches a valid node click in requestAnimationFrame.
      // Clear our gesture after its callback has had the first chance to consume it.
      window.requestAnimationFrame(() => {
        const currentGesture = graphState.pointerGesture;
        if (!currentGesture || currentGesture.revision !== revision) return;
        if (!currentGesture.handled
          && !currentGesture.cancelled
          && currentGesture.pressedNodeId
          && currentGesture.maxDistanceSq <= currentGesture.clickSlopPx * currentGesture.clickSlopPx) {
          const node = state.graphNodeMap && state.graphNodeMap.get(currentGesture.pressedNodeId);
          if (node) handleGraphNodeActivation(node);
        }
        if (graphState.pointerGesture && graphState.pointerGesture.revision === revision) {
          graphState.pointerGesture = null;
        }
      });
    }, { passive: true });

    const cancelGesture = (event) => {
      const gesture = graphState.pointerGesture;
      if (!gesture || (event && event.pointerId !== undefined && event.pointerId !== gesture.pointerId)) return;
      gesture.cancelled = true;
      if (!gesture.handled && gesture.dragNodeId && state.graphNodeMap) {
        startGraphNodeReturn(state.sidebarGraph, state.graphNodeMap.get(gesture.dragNodeId));
      } else if (!gesture.handled) {
        restoreGraphNodes(state.sidebarGraph, gesture.snapshot);
      }
      graphState.pointerGesture = null;
    };
    window.addEventListener('pointercancel', cancelGesture, { passive: true, capture: true });
    window.addEventListener('blur', cancelGesture, { passive: true });
  }

  function bindNodeDragToPointerGesture(node) {
    const gesture = graphState.pointerGesture;
    if (!gesture
      || !node
      || (!isDesktopExpandedGraphInteraction() && !isMobileExpandedGraphInteraction())) return;
    gesture.dragNodeId = node.id;
  }

  function getGraphGestureDistancePx(graph, gesture, translate) {
    const pointerDistance = gesture ? Math.sqrt(gesture.maxDistanceSq) : Number.POSITIVE_INFINITY;
    const zoom = graph && graph.zoom ? (graph.zoom() || 1) : 1;
    const graphDistance = translate
      ? Math.hypot(translate.x || 0, translate.y || 0) * zoom
      : 0;
    return Math.max(pointerDistance, graphDistance);
  }

  async function handleGraphNodeActivation(node) {
    if (!node || !node.id) return;
    if (state.graphPhase !== 'small' && state.graphPhase !== 'expanded') return;
    const gesture = graphState.pointerGesture;
    if (gesture) {
      if (gesture.handled) return;
      gesture.handled = true;
    }

    const isMobileDevice = window.innerWidth <= 768;
    if (!isMobileDevice) {
      await navigateFromGraphNode(node.id, { collapseGraph: false });
      return;
    }

    // The mobile small graph is a preview. Fullscreen selection extends the
    // current space with the real entity article instead of navigating away.
    if (!isMobileExpandedGraphInteraction()) return;

    graphState.hoverNode = node;
    showMobileGraphContinuumArticle(node);
    transitionMobileGraphFocus(state.sidebarGraph, node);
  }

  function handleGraphBackgroundActivation() {
    if (!graphState.focusedNode) return;
    graphState.hoverNode = null;
    if (isMobileGraphViewport()) {
      hideMobileGraphContinuumArticle();
      transitionMobileGraphFocus(state.sidebarGraph, null, 220);
      return;
    }
    graphState.focusedNode = null;
    fitGraphToViewport(state.sidebarGraph, 260);
  }

  function getMobileVisualViewportHeight() {
    return Math.max(
      1,
      Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight)
    );
  }

  function captureMobileGraphContinuumViewport(force = false) {
    const continuum = getEl('mobile-graph-continuum');
    if (!continuum || !isMobileGraphViewport()) return;
    const previousGeometry = getMobileGraphContinuumGeometry();
    const previousPosition = graphState.continuumPosition;
    const previousVelocity = graphState.continuumVelocity;
    const previousTarget = graphState.continuumMotionTarget;
    const hadContinuumGesture = Boolean(graphState.continuumGesture);
    const interruptedFloorGesture = Boolean(
      graphState.continuumGesture && graphState.continuumGesture.owner === 'floor'
    );
    const viewportWidth = window.innerWidth;
    const widthChanged = graphState.continuumViewportWidth === null
      || Math.abs(viewportWidth - graphState.continuumViewportWidth) > 1;
    if (!force && !widthChanged && graphState.continuumViewportHeight) return;
    const viewportHeight = getMobileVisualViewportHeight();
    graphState.continuumViewportWidth = viewportWidth;
    graphState.continuumViewportHeight = viewportHeight;
    continuum.style.setProperty('--mobile-continuum-viewport-height', `${viewportHeight}px`);
    const previewPeek = viewportHeight <= 500
      ? 104
      : Math.min(168, Math.max(112, Math.round(viewportHeight * 0.18)));
    graphState.continuumPreviewPeek = previewPeek;
    continuum.style.setProperty('--mobile-continuum-peek', `${previewPeek}px`);
    const headerHeight = getMobileGraphContinuumHeaderHeight();
    graphState.continuumHeaderHeight = headerHeight;
    continuum.style.setProperty('--mobile-continuum-header-height', `${headerHeight}px`);
    continuum.style.setProperty(
      '--mobile-continuum-article-height',
      `${Math.max(1, viewportHeight - headerHeight)}px`
    );

    // Any real visual-viewport change establishes one new geometry snapshot.
    // Preserve physical progress (and an interrupted settle's direction) rather
    // than replaying an old pixel target in a differently sized viewport.
    if (continuum.classList.contains('has-article') && previousGeometry.travel > 0) {
      const progress = Math.max(0, Math.min(1, previousPosition / previousGeometry.travel));
      const nextGeometry = getMobileGraphContinuumGeometry();
      const velocityScale = nextGeometry.travel / previousGeometry.travel;
      cancelMobileGraphContinuumMotion({ resetVelocity: false });
      if (hadContinuumGesture) graphState.continuumGesture = null;
      graphState.continuumPosition = progress * nextGeometry.travel;
      graphState.continuumVelocity = previousVelocity * velocityScale;
      if (previousTarget !== null) {
        startMobileGraphContinuumSettle(
          previousTarget >= previousGeometry.travel / 2 ? nextGeometry.travel : 0,
          graphState.continuumVelocity
        );
      } else if (interruptedFloorGesture) {
        startMobileGraphContinuumSettle(
          progress >= 0.5 ? nextGeometry.travel : 0,
          0
        );
      }
    }
  }

  function releaseMobileGraphContinuumViewport() {
    const continuum = getEl('mobile-graph-continuum');
    if (continuum) {
      continuum.style.removeProperty('--mobile-continuum-viewport-height');
      continuum.style.removeProperty('--mobile-continuum-peek');
      continuum.style.removeProperty('--mobile-continuum-header-height');
      continuum.style.removeProperty('--mobile-continuum-article-height');
    }
    graphState.continuumViewportWidth = null;
    graphState.continuumViewportHeight = null;
    graphState.continuumHeaderHeight = null;
    graphState.continuumPreviewPeek = null;
    clearDeferredMobileGraphRenderResize();
  }

  function getMobileGraphContinuumGeometry() {
    const continuum = getEl('mobile-graph-continuum');
    const fallbackHeight = graphState.continuumViewportHeight
      ? null
      : (continuum && continuum.classList.contains('is-active')
        ? continuum.getBoundingClientRect().height
        : null);
    const viewportHeight = Math.max(
      1,
      graphState.continuumViewportHeight
        || fallbackHeight
        || getMobileVisualViewportHeight()
    );
    const headerHeight = Math.max(
      0,
      Math.min(
        viewportHeight - 1,
        graphState.continuumHeaderHeight === null
          ? getMobileGraphContinuumHeaderHeight()
          : graphState.continuumHeaderHeight
      )
    );
    const previewPeek = Math.max(
      1,
      Math.min(
        viewportHeight - headerHeight - 1,
        graphState.continuumPreviewPeek
          || (viewportHeight <= 500
            ? 104
            : Math.min(168, Math.max(112, Math.round(viewportHeight * 0.18))))
      )
    );
    const expandedY = headerHeight;
    const collapsedY = Math.max(expandedY + 1, viewportHeight - previewPeek);
    const travel = Math.max(1, collapsedY - expandedY);
    const elasticLimit = Math.min(96, Math.max(52, viewportHeight * 0.12));
    return {
      viewportHeight,
      headerHeight,
      previewPeek,
      expandedY,
      collapsedY,
      travel,
      elasticLimit
    };
  }

  function getExpandedGraphSize(isMobile = window.innerWidth <= 768) {
    if (isMobile) {
      const height = graphState.continuumViewportHeight || getMobileVisualViewportHeight();
      return { width: window.innerWidth, height };
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
    if (graph.backgroundColor) {
      const needsOpaqueCanvas = isExpanded && window.innerWidth <= 768;
      const pageColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-page').trim() || '#ffffff';
      graph.backgroundColor(needsOpaqueCanvas ? pageColor : 'rgba(0,0,0,0)');
    }
    // Page-layout interpolation owns node positions and the camera until its
    // final frame. Keep node hit testing/clicks alive, but temporarily suspend
    // gestures that could write competing positions or transforms.
    const canInteract = isExpanded
      && state.graphPhase === 'expanded'
      && !graphState.layoutTransition
      && !isMobileGraphSidebarOverlayLeaseActive();
    const continuum = getEl('mobile-graph-continuum');
    const articleOwnsVerticalGesture = isMobileGraphViewport()
      && continuum
      && continuum.classList.contains('is-active')
      && continuum.classList.contains('has-article');
    // Once an article is attached, empty graph space joins the native
    // continuum. Node dragging remains interactive, while background pan/zoom
    // can no longer compete for the same one-finger gesture.
    const canPanOrZoom = canInteract && !articleOwnsVerticalGesture;
    if (graph.enableZoomInteraction) graph.enableZoomInteraction(canPanOrZoom);
    if (graph.enablePanInteraction) graph.enablePanInteraction(canPanOrZoom);
    if (graph.enableNodeDrag) graph.enableNodeDrag(canInteract);
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

  function getMobileSidebarGraphSize() {
    const slot = getEl('sidebar-graph-slot');
    if (!slot) return getCurrentGraphViewportSize();
    const rect = getGraphSlotContentRect(slot);
    return {
      width: Math.max(1, rect.width || slot.clientWidth || 268),
      height: Math.max(1, rect.height || slot.clientHeight || 145)
    };
  }

  function getGraphRenderSizeForPresentation(options = {}) {
    if (options.renderSize) return options.renderSize;
    if (!isMobileGraphViewport()) return getExpandedGraphSize(false);
    const expandedPresentation = options.expandedPresentation === undefined
      ? (state.isGraphExpanded && !isMobileGraphSidebarOverlayLeaseActive())
      : options.expandedPresentation;
    return expandedPresentation ? getExpandedGraphSize(true) : getMobileSidebarGraphSize();
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

  function getGraphCameraForViewport(graph, size, expansionProgress, positionMap = null) {
    if (!graph) return;
    const data = graph.graphData();
    if (!data || !data.nodes || !data.nodes.length) return;
    const positionedNodes = data.nodes.map((node) => {
      const position = positionMap && positionMap.get(node.id);
      const x = position ? position.x : node.x;
      const y = position ? position.y : node.y;
      return Number.isFinite(x) && Number.isFinite(y) ? { ...node, x, y } : null;
    }).filter(Boolean);
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

  function getCurrentGraphCamera(graph) {
    if (!graph) return null;
    const center = graph.centerAt ? graph.centerAt() : null;
    const zoom = graph.zoom ? graph.zoom() : null;
    return center
      && Number.isFinite(center.x)
      && Number.isFinite(center.y)
      && Number.isFinite(zoom)
      ? { x: center.x, y: center.y, zoom }
      : null;
  }

  function applyGraphCamera(graph, camera) {
    if (!graph || !camera) return;
    if (graph.centerAt) graph.centerAt(camera.x, camera.y, 0);
    if (graph.zoom) graph.zoom(camera.zoom, 0);
  }

  function cancelGraphCameraTransition() {
    const transition = graphState.cameraTransition;
    if (transition && transition.frameId) cancelAnimationFrame(transition.frameId);
    graphState.cameraTransition = null;
  }

  function requestGraphRedraw(graph) {
    if (!graph) return;
    if (typeof graph.refresh === 'function') {
      graph.refresh();
      return;
    }
    // force-graph 1.43.5 has no refresh() method. Re-applying the exact same
    // zoom is its public, side-effect-free way to mark the canvas for redraw;
    // the camera value and deterministic node geometry remain unchanged.
    if (typeof graph.zoom === 'function') {
      const currentZoom = graph.zoom();
      if (Number.isFinite(currentZoom)) graph.zoom(currentZoom, 0);
    }
  }

  function cancelMobileGraphFocusTransition() {
    const transition = graphState.mobileFocusTransition;
    if (transition && transition.frameId) cancelAnimationFrame(transition.frameId);
    graphState.mobileFocusTransition = null;
  }

  function clearMobileGraphFocusVisuals() {
    cancelMobileGraphFocusTransition();
    graphState.mobileFocusWeights.clear();
    requestGraphRedraw(state.sidebarGraph);
  }

  function getMobileGraphFocusWeight(nodeId) {
    const value = graphState.mobileFocusWeights.get(nodeId);
    const focus = Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : (graphState.focusedNode && graphState.focusedNode.id === nodeId ? 1 : 0);
    return focus * Math.max(0, Math.min(1, graphState.mobileExpansionProgress));
  }

  function getMobileRenderedNodeRadiusPx(node, globalScale) {
    const scale = Math.max(0.01, globalScale || (state.sidebarGraph ? state.sidebarGraph.zoom() : 1) || 1);
    const baseRadiusPx = (node.val || 5) * scale;
    // Focus is a restrained increment over the node's actual rendered size,
    // never an absolute radius ceiling. The old 30px ceiling produced a zero
    // delta for already-large or user-zoomed nodes, so selection state changed
    // while the portrait appeared not to react at all.
    const focusGrowthPx = Math.min(
      MOBILE_GRAPH_FOCUS_MAX_GROWTH_PX,
      Math.max(
        MOBILE_GRAPH_FOCUS_MIN_GROWTH_PX,
        baseRadiusPx * (MOBILE_GRAPH_FOCUS_SCALE - 1)
      )
    );
    const focusRadiusPx = baseRadiusPx + focusGrowthPx;
    const focusWeight = getMobileGraphFocusWeight(node.id);
    return baseRadiusPx + (focusRadiusPx - baseRadiusPx) * focusWeight;
  }

  function animateGraphCamera(graph, targetCamera, duration = 0) {
    cancelGraphCameraTransition();
    if (!graph || !targetCamera) return;
    const startCamera = getCurrentGraphCamera(graph) || targetCamera;
    if (duration <= 0) {
      applyGraphCamera(graph, targetCamera);
      return;
    }

    const transition = { frameId: null };
    graphState.cameraTransition = transition;
    const startedAt = performance.now();
    const tick = (now) => {
      if (graphState.cameraTransition !== transition) return;
      const linear = Math.max(0, Math.min(1, (now - startedAt) / duration));
      const eased = linear * linear * (3 - 2 * linear);
      applyGraphCamera(graph, {
        x: startCamera.x + (targetCamera.x - startCamera.x) * eased,
        y: startCamera.y + (targetCamera.y - startCamera.y) * eased,
        zoom: startCamera.zoom + (targetCamera.zoom - startCamera.zoom) * eased
      });
      if (linear < 1) {
        transition.frameId = requestAnimationFrame(tick);
      } else {
        graphState.cameraTransition = null;
      }
    };
    transition.frameId = requestAnimationFrame(tick);
  }

  function mobileGraphFocusEase(progress) {
    if (progress >= 1) return 1;
    const response = 4.6;
    const curve = (value) => 1 - (1 + response * value) * Math.exp(-response * value);
    return curve(progress) / curve(1);
  }

  function transitionMobileGraphFocus(graph, nextNode, duration = MOBILE_GRAPH_FOCUS_DURATION_MS) {
    if (!isMobileGraphViewport() || !graph) return false;
    const data = graph.graphData ? graph.graphData() : null;
    const nodes = (data && data.nodes) || [];
    const previousFocusedId = graphState.focusedNode && graphState.focusedNode.id;
    const fromWeights = new Map(nodes.map((node) => {
      const existing = graphState.mobileFocusWeights.get(node.id);
      return [node.id, Number.isFinite(existing) ? existing : (node.id === previousFocusedId ? 1 : 0)];
    }));

    cancelMobileGraphFocusTransition();
    cancelGraphCameraTransition();
    graphState.focusedNode = nextNode || null;

    const size = getCurrentGraphViewportSize();
    const expansionProgress = state.isGraphExpanded ? 1 : 0;
    const fittedCamera = getGraphCameraForViewport(
      graph,
      size,
      expansionProgress,
      graphState.activeTargetPositions
    );
    const startCamera = getCurrentGraphCamera(graph) || fittedCamera;
    // Selection is content state, not camera state. A tap must never relocate
    // the graph; only clearing the selection returns a user-panned view to the
    // authoritative fitted camera.
    const targetCamera = nextNode ? startCamera : fittedCamera;
    const cameraNeedsMotion = startCamera && targetCamera && (
      Math.abs(startCamera.x - targetCamera.x) > 0.001
      || Math.abs(startCamera.y - targetCamera.y) > 0.001
      || Math.abs(startCamera.zoom - targetCamera.zoom) > 0.001
    );
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const apply = (progress) => {
      nodes.forEach((node) => {
        const from = fromWeights.get(node.id) || 0;
        const to = nextNode && node.id === nextNode.id ? 1 : 0;
        graphState.mobileFocusWeights.set(node.id, from + (to - from) * progress);
      });
      if (cameraNeedsMotion) {
        applyGraphCamera(graph, {
          x: startCamera.x + (targetCamera.x - startCamera.x) * progress,
          y: startCamera.y + (targetCamera.y - startCamera.y) * progress,
          zoom: startCamera.zoom + (targetCamera.zoom - startCamera.zoom) * progress
        });
      }
      requestGraphRedraw(graph);
    };

    if (reducedMotion || duration <= 0) {
      apply(1);
      graphState.mobileFocusWeights.clear();
      if (nextNode) graphState.mobileFocusWeights.set(nextNode.id, 1);
      return true;
    }

    // Commit the interpolation's exact starting weights before the next paint.
    // Otherwise focusedNode already points at the destination while the Map is
    // still empty, making the getter briefly jump to weight 1 and then backwards.
    apply(0);
    const transition = { frameId: null };
    graphState.mobileFocusTransition = transition;
    const startedAt = performance.now();
    const tick = (now) => {
      if (graphState.mobileFocusTransition !== transition) return;
      const linear = Math.max(0, Math.min(1, (now - startedAt) / duration));
      apply(mobileGraphFocusEase(linear));
      if (linear < 1) {
        transition.frameId = requestAnimationFrame(tick);
      } else {
        graphState.mobileFocusTransition = null;
        graphState.mobileFocusWeights.clear();
        if (nextNode) graphState.mobileFocusWeights.set(nextNode.id, 1);
      }
    };
    transition.frameId = requestAnimationFrame(tick);
    return true;
  }

  function fitGraphToViewport(graph, duration = 0, options = {}) {
    const expansionProgress = options.expansionProgress === undefined
      ? (state.isGraphExpanded ? 1 : 0)
      : Math.max(0, Math.min(1, options.expansionProgress));
    const size = options.size || getCurrentGraphViewportSize();
    const positionMap = Object.prototype.hasOwnProperty.call(options, 'positionMap')
      ? options.positionMap
      : graphState.activeTargetPositions;
    const camera = getGraphCameraForViewport(graph, size, expansionProgress, positionMap);
    if (!camera) return;
    animateGraphCamera(graph, camera, duration);
  }

  function morphGraphViewport(
    container,
    graph,
    fromRect,
    getTargetRect,
    duration,
    toExpansion,
    onProgress = null
  ) {
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const initialTarget = getTargetRect();
    const startCamera = getCurrentGraphCamera(graph);
    cancelGraphCameraTransition();

    if (reducedMotion || duration <= 0) {
      applyFixedGraphRect(container, initialTarget);
      const fitCamera = getGraphCameraForViewport(
        graph,
        initialTarget,
        toExpansion,
        graphState.activeTargetPositions
      );
      applyGraphCamera(graph, fitCamera);
      if (onProgress) onProgress(toExpansion);
      return Promise.resolve(initialTarget);
    }

    return new Promise((resolve) => {
      const startedAt = performance.now();
      const tick = (now) => {
        const linear = Math.max(0, Math.min(1, (now - startedAt) / duration));
        // Smooth acceleration and deceleration keeps the interpolation visible
        // instead of completing most of the distance in the first few frames.
        const eased = linear * linear * (3 - 2 * linear);
        if (onProgress) onProgress(toExpansion === 1 ? eased : 1 - eased);
        const target = getTargetRect();
        const rect = {
          left: fromRect.left + (target.left - fromRect.left) * eased,
          top: fromRect.top + (target.top - fromRect.top) * eased,
          width: fromRect.width + (target.width - fromRect.width) * eased,
          height: fromRect.height + (target.height - fromRect.height) * eased
        };
        applyFixedGraphRect(container, rect);
        const fitCamera = getGraphCameraForViewport(
          graph,
          target,
          toExpansion,
          graphState.activeTargetPositions
        );
        const targetCamera = fitCamera;
        if (startCamera && targetCamera) {
          applyGraphCamera(graph, {
            x: startCamera.x + (targetCamera.x - startCamera.x) * eased,
            y: startCamera.y + (targetCamera.y - startCamera.y) * eased,
            zoom: startCamera.zoom + (targetCamera.zoom - startCamera.zoom) * eased
          });
        } else {
          applyGraphCamera(graph, targetCamera);
        }

        if (linear < 1) {
          window.requestAnimationFrame(tick);
        } else {
          resolve(target);
        }
      };
      window.requestAnimationFrame(tick);
    });
  }

  function getLinkEndpointId(endpoint) {
    return endpoint && typeof endpoint === 'object' ? endpoint.id : endpoint;
  }

  function cancelGraphLayoutTransition() {
    const transition = graphState.layoutTransition;
    if (transition && transition.frameId) cancelAnimationFrame(transition.frameId);
    graphState.layoutTransition = null;
  }

  function settleGraphLayoutTransitionNodes() {
    const transition = graphState.layoutTransition;
    if (!transition) return;
    if (transition.frameId) cancelAnimationFrame(transition.frameId);
    graphState.layoutTransition = null;
    if (transition.finishNodes) transition.finishNodes();
  }

  function placeGraphNode(node, position) {
    if (!node || !position) return;
    node.x = position.x;
    node.y = position.y;
    node.vx = 0;
    node.vy = 0;
    node.fx = position.x;
    node.fy = position.y;
  }

  function cancelAllGraphNodeSprings(settle = false) {
    if (graphState.nodeSpringFrame) cancelAnimationFrame(graphState.nodeSpringFrame);
    graphState.nodeSpringFrame = null;
    graphState.draggedNodeId = null;
    if (settle) {
      graphState.nodeSprings.forEach((spring) => placeGraphNode(spring.node, spring.target));
      if (state.sidebarGraph && state.sidebarGraph.refresh) state.sidebarGraph.refresh();
    }
    graphState.nodeSprings.clear();
  }

  function getGraphGestureReleaseVelocity(graph, gesture) {
    if (!gesture || performance.now() - gesture.lastMoveAt > 90) return { x: 0, y: 0 };
    const zoom = graph && graph.zoom ? Math.max(0.01, graph.zoom() || 1) : 1;
    let x = (gesture.velocityX * 1000) / zoom;
    let y = (gesture.velocityY * 1000) / zoom;
    const speed = Math.hypot(x, y);
    if (speed > GRAPH_NODE_MAX_RELEASE_SPEED) {
      const scale = GRAPH_NODE_MAX_RELEASE_SPEED / speed;
      x *= scale;
      y *= scale;
    }
    return { x, y };
  }

  function ensureGraphSpringNetwork(graph) {
    if (!graph || graph !== state.sidebarGraph) return false;
    const data = graph.graphData ? graph.graphData() : null;
    const nodes = (data && data.nodes) || [];
    const links = (data && data.links) || [];
    const degrees = new Map(nodes.map((node) => [node.id, 0]));
    links.forEach((link) => {
      const sourceId = getLinkEndpointId(link.source);
      const targetId = getLinkEndpointId(link.target);
      degrees.set(sourceId, (degrees.get(sourceId) || 0) + 1);
      degrees.set(targetId, (degrees.get(targetId) || 0) + 1);
    });
    nodes.forEach((node) => {
      const target = graphState.activeTargetPositions.get(node.id);
      if (!target) return;
      const existing = graphState.nodeSprings.get(node.id);
      if (existing && existing.graph === graph) {
        existing.degreeScale = Math.sqrt(Math.max(1, degrees.get(node.id) || 0));
        return;
      }
      graphState.nodeSprings.set(node.id, {
        graph,
        node,
        target: { x: target.x, y: target.y },
        degreeScale: Math.sqrt(Math.max(1, degrees.get(node.id) || 0)),
        velocityX: 0,
        velocityY: 0
      });
    });
    return graphState.nodeSprings.size > 0;
  }

  function ensureGraphSpringFrame(graph) {
    if (graphState.nodeSpringFrame || !graphState.nodeSprings.size) return;
    let previousTime = performance.now();
    const tick = (now) => {
      graphState.nodeSpringFrame = null;
      if (graph !== state.sidebarGraph) {
        cancelAllGraphNodeSprings(false);
        return;
      }

      const elapsed = Math.max(0.001, Math.min(0.034, (now - previousTime) / 1000));
      previousTime = now;
      const stepCount = Math.max(1, Math.ceil(elapsed / (1 / 120)));
      const step = elapsed / stepCount;
      const data = graph.graphData ? graph.graphData() : null;
      const links = (data && data.links) || [];

      for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
        const forces = new Map();
        graphState.nodeSprings.forEach((spring, nodeId) => {
          if (nodeId === graphState.draggedNodeId) {
            spring.velocityX = 0;
            spring.velocityY = 0;
            return;
          }
          forces.set(nodeId, {
            x: -GRAPH_NODE_HOME_STIFFNESS * (spring.node.x - spring.target.x)
              - GRAPH_NODE_SPRING_DAMPING * spring.velocityX,
            y: -GRAPH_NODE_HOME_STIFFNESS * (spring.node.y - spring.target.y)
              - GRAPH_NODE_SPRING_DAMPING * spring.velocityY
          });
        });

        links.forEach((link) => {
          const sourceId = getLinkEndpointId(link.source);
          const targetId = getLinkEndpointId(link.target);
          const source = graphState.nodeSprings.get(sourceId);
          const target = graphState.nodeSprings.get(targetId);
          if (!source || !target) return;
          const deltaX = target.node.x - source.node.x;
          const deltaY = target.node.y - source.node.y;
          const distance = Math.max(0.001, Math.hypot(deltaX, deltaY));
          const restLength = Math.max(
            0.001,
            Math.hypot(target.target.x - source.target.x, target.target.y - source.target.y)
          );
          const stretch = distance - restLength;
          const linkForceX = GRAPH_LINK_SPRING_STIFFNESS * stretch * (deltaX / distance);
          const linkForceY = GRAPH_LINK_SPRING_STIFFNESS * stretch * (deltaY / distance);
          const sourceForce = forces.get(sourceId);
          const targetForce = forces.get(targetId);
          if (sourceForce) {
            sourceForce.x += linkForceX / source.degreeScale;
            sourceForce.y += linkForceY / source.degreeScale;
          }
          if (targetForce) {
            targetForce.x -= linkForceX / target.degreeScale;
            targetForce.y -= linkForceY / target.degreeScale;
          }
        });

        graphState.nodeSprings.forEach((spring, nodeId) => {
          const force = forces.get(nodeId);
          if (!force) return;
          spring.velocityX += force.x * step;
          spring.velocityY += force.y * step;
          spring.node.x += spring.velocityX * step;
          spring.node.y += spring.velocityY * step;
        });
      }

      let maximumDistance = 0;
      let maximumSpeed = 0;
      graphState.nodeSprings.forEach((spring) => {
        spring.node.vx = 0;
        spring.node.vy = 0;
        spring.node.fx = spring.node.x;
        spring.node.fy = spring.node.y;
        maximumDistance = Math.max(
          maximumDistance,
          Math.hypot(spring.node.x - spring.target.x, spring.node.y - spring.target.y)
        );
        maximumSpeed = Math.max(maximumSpeed, Math.hypot(spring.velocityX, spring.velocityY));
      });

      if (!graphState.draggedNodeId && maximumDistance < 0.08 && maximumSpeed < 1.5) {
        cancelAllGraphNodeSprings(true);
        return;
      }
      if (graph.refresh) graph.refresh();
      graphState.nodeSpringFrame = requestAnimationFrame(tick);
    };
    graphState.nodeSpringFrame = requestAnimationFrame(tick);
  }

  function beginGraphNodeDrag(graph, node) {
    if (!graph || !node || !ensureGraphSpringNetwork(graph)) return;
    graphState.draggedNodeId = node.id;
    const spring = graphState.nodeSprings.get(node.id);
    if (spring) {
      spring.velocityX = 0;
      spring.velocityY = 0;
    }
    ensureGraphSpringFrame(graph);
  }

  function startGraphNodeReturn(graph, node, releaseVelocity = { x: 0, y: 0 }) {
    if (!graph || !node || !ensureGraphSpringNetwork(graph)) return;
    graphState.draggedNodeId = null;
    const spring = graphState.nodeSprings.get(node.id);
    if (spring) {
      spring.velocityX = Number.isFinite(releaseVelocity.x) ? releaseVelocity.x : 0;
      spring.velocityY = Number.isFinite(releaseVelocity.y) ? releaseVelocity.y : 0;
    }

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      cancelAllGraphNodeSprings(true);
      return;
    }
    ensureGraphSpringFrame(graph);
  }

  function transitionGraphToLayout(graph, layout, targetCamera, duration) {
    if (!graph || !layout) return;
    const data = graph.graphData ? graph.graphData() : null;
    const nodes = (data && data.nodes) || [];
    const starts = new Map();
    nodes.forEach((node) => {
      const target = layout.targetPositions.get(node.id);
      starts.set(node.id, {
        x: Number.isFinite(node.x) ? node.x : target.x,
        y: Number.isFinite(node.y) ? node.y : target.y
      });
    });
    const cameraStart = getCurrentGraphCamera(graph) || targetCamera;

    const applyNodes = (progress) => {
      nodes.forEach((node) => {
        const start = starts.get(node.id);
        const target = layout.targetPositions.get(node.id);
        if (!start || !target) return;
        placeGraphNode(node, {
          x: start.x + (target.x - start.x) * progress,
          y: start.y + (target.y - start.y) * progress
        });
      });
    };

    const apply = (progress) => {
      applyNodes(progress);
      if (cameraStart && targetCamera) {
        const camera = {
          x: cameraStart.x + (targetCamera.x - cameraStart.x) * progress,
          y: cameraStart.y + (targetCamera.y - cameraStart.y) * progress,
          zoom: cameraStart.zoom + (targetCamera.zoom - cameraStart.zoom) * progress
        };
        // Immediate camera writes keep camera and nodes under the same
        // revision-token RAF. No uncancellable ForceGraph tween survives a
        // rapid page change and moves the next graph afterwards.
        applyGraphCamera(graph, camera);
      }
      if (graph.refresh) graph.refresh();
    };

    if (duration <= 0) {
      apply(1);
      return;
    }

    const transition = {
      revision: graphState.dataRevision,
      frameId: null,
      finishNodes: () => {
        applyNodes(1);
        if (graph.refresh) graph.refresh();
      }
    };
    graphState.layoutTransition = transition;
    configureGraphPhysics(graph, state.isGraphExpanded);
    const startedAt = performance.now();
    const tick = (now) => {
      if (graphState.layoutTransition !== transition || graphState.dataRevision !== transition.revision) return;
      const linear = Math.max(0, Math.min(1, (now - startedAt) / duration));
      const eased = linear * linear * (3 - 2 * linear);
      apply(eased);
      if (linear < 1) {
        transition.frameId = requestAnimationFrame(tick);
      } else {
        graphState.layoutTransition = null;
        configureGraphPhysics(graph, state.isGraphExpanded);
      }
    };
    transition.frameId = requestAnimationFrame(tick);
  }

  function applyGraphData(graph, graphData, animate = true, options = {}) {
    if (!graph) return;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cancelGraphCameraTransition();
    if (isMobileGraphViewport()) clearMobileGraphFocusVisuals();
    cancelGraphLayoutTransition();
    cancelAllGraphNodeSprings(false);
    const previousCamera = getCurrentGraphCamera(graph);
    ++graphState.dataRevision;
    const transitionDuration = animate && !reducedMotion ? 420 : 0;
    graphState.activeTargetPositions = (graphData.layout && graphData.layout.targetPositions) || new Map();

    graph.graphData({ nodes: graphData.nodes, links: graphData.links });
    state.graphNodeMap = graphData.nodeMap;
    configureGraphPhysics(graph, state.isGraphExpanded);
    if (graphData.cameraShift && previousCamera) {
      // The new graph is translated so the clicked node becomes (0, 0).
      // Translate the camera by the same amount before the next paint; every
      // shared portrait therefore remains at exactly the same screen point.
      applyGraphCamera(graph, {
        x: previousCamera.x - graphData.cameraShift.x,
        y: previousCamera.y - graphData.cameraShift.y,
        zoom: previousCamera.zoom
      });
    }

    const camera = getGraphCameraForViewport(
      graph,
      options.viewportSize || getCurrentGraphViewportSize(),
      options.expansionProgress === undefined
        ? (state.isGraphExpanded ? 1 : 0)
        : options.expansionProgress,
      graphData.layout && graphData.layout.targetPositions
    );
    transitionGraphToLayout(graph, graphData.layout, camera, transitionDuration);
  }

  function initBalancedTopologyGraph(focusEntityId, options = {}) {
    const container = getEl('canvas-sidebar-graph');
    if (!window.ForceGraph || !container) return;

    const renderSize = getGraphRenderSizeForPresentation(options);
    // The outgoing frame is only the animation source. Destination geometry is
    // computed solely from that destination's data and never learned from it.
    const visiblePose = captureVisibleGraphPose();
    const graphData = buildGraphDataForEntity(focusEntityId || state.currentEntityId, visiblePose);

    if (!state.sidebarGraph) {
      // Before construction there is no renderer to resize; initialize both the
      // host CSS size and the bookkeeping that the new ForceGraph will inherit.
      syncGraphRenderSize(null, renderSize);
      container.innerHTML = '';
      container.addEventListener('mouseleave', () => {
        graphState.hoverNode = null;
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
          if (isMobileGraphViewport()) {
            const focusWeight = Math.max(
              getMobileGraphFocusWeight(sourceId),
              getMobileGraphFocusWeight(targetId)
            );
            const touchesCurrent = sourceId === state.currentEntityId || targetId === state.currentEntityId;
            const baseWidth = touchesCurrent ? 1.1 : 0.8;
            return baseWidth + (1.3 - baseWidth) * focusWeight;
          }
          const activeId = (graphState.focusedNode && graphState.focusedNode.id) || (graphState.hoverNode && graphState.hoverNode.id);
          const baseWidth = activeId
            ? (sourceId === activeId || targetId === activeId ? 1.8 : 0.45)
            : (sourceId === state.currentEntityId || targetId === state.currentEntityId ? 1.25 : 0.8);
          return baseWidth;
        })
        .linkColor((link) => {
          const isDark = state.theme === 'dark';
          const isSepia = state.theme === 'sepia';
          if (isMobileGraphViewport()) {
            const focusWeight = Math.max(
              getMobileGraphFocusWeight(getLinkEndpointId(link.source)),
              getMobileGraphFocusWeight(getLinkEndpointId(link.target))
            );
            const baseAlpha = isDark ? 0.22 : (isSepia ? 0.18 : 0.16);
            const focusedAlpha = isDark ? 0.42 : (isSepia ? 0.36 : 0.34);
            const alpha = baseAlpha + (focusedAlpha - baseAlpha) * focusWeight;
            if (isDark) return `rgba(255,255,255,${alpha})`;
            if (isSepia) return `rgba(45,38,30,${alpha})`;
            return `rgba(0,0,0,${alpha})`;
          }
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
        .onNodeDrag((node) => {
          bindNodeDragToPointerGesture(node);
          beginGraphNodeDrag(Graph, node);
        })
        .onNodeDragEnd(async (node, translate) => {
          const gesture = graphState.pointerGesture;
          const isTrackedPointerDrag = gesture && gesture.dragNodeId === node.id;
          const dragDistancePx = getGraphGestureDistancePx(Graph, gesture, translate);

          if (isTrackedPointerDrag && gesture.platform === 'mobile') {
            graphState.mobileNodeGestureUntil = performance.now() + 120;
          }

          if (isTrackedPointerDrag
            && !gesture.cancelled
            && dragDistancePx <= gesture.clickSlopPx) {
            cancelAllGraphNodeSprings(false);
            restoreGraphNodes(Graph, gesture.snapshot);
            await handleGraphNodeActivation(node);
            return;
          }

          if (isTrackedPointerDrag) gesture.handled = true;
          // Dragging temporarily deforms the relation network. Every affected
          // node remains anchored to deterministic geometry, so the whole
          // network settles home without moving the camera.
          startGraphNodeReturn(Graph, node, getGraphGestureReleaseVelocity(Graph, gesture));
        })
        .onNodeHover((node) => {
          if (!graphState.focusedNode) {
            graphState.hoverNode = node || null;
          }
        })
        .onNodeClick(handleGraphNodeActivation)
        .onBackgroundClick(handleGraphBackgroundActivation)
        .nodePointerAreaPaint((node, color, ctx, globalScale) => {
          const scale = globalScale || (state.sidebarGraph ? state.sidebarGraph.zoom() : 1) || 1;
          if (isMobileGraphViewport()) {
            const visualRadiusPx = getMobileRenderedNodeRadiusPx(node, scale);
            const minimumHitRadiusPx = state.isGraphExpanded ? 24 : 22;
            const hitRadiusPx = Math.max(minimumHitRadiusPx, visualRadiusPx + 3);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, hitRadiusPx / scale, 0, 2 * Math.PI, false);
            ctx.fill();
            return;
          }
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
          const isMobileDevice = isMobileGraphViewport();
          const isFocused = graphState.focusedNode && graphState.focusedNode.id === node.id;
          const isHovered = graphState.hoverNode && graphState.hoverNode.id === node.id;
          const isPrimary = (state.currentEntityId === node.id) || node.isPrimary;
          
          let alpha = 1;
          if (!isMobileDevice && graphState.focusedNode) {
            // Everything else blurs/dissolves deeply into a bokeh background
            alpha = isFocused ? 1 : 0.08;
          } else if (!isMobileDevice && graphState.hoverNode) {
            alpha = (isPrimary || isHovered) ? 1 : 0.65;
          }
          ctx.save();
          ctx.globalAlpha = alpha;

          const baseColor = getCategoryColor(node.type);
          let radius = node.val || 5;
          if (isMobileDevice) {
            const scale = globalScale || (state.sidebarGraph ? state.sidebarGraph.zoom() : 1) || 1;
            radius = getMobileRenderedNodeRadiusPx(node, scale) / scale;
          } else if (isFocused) {
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
      initGraphPointerIntent(container);
      graphState.renderSize = { width: Math.round(renderSize.width), height: Math.round(renderSize.height) };
      applyGraphData(Graph, graphData, false, options);
    } else {
      syncGraphRenderSize(state.sidebarGraph, renderSize);
      applyGraphData(state.sidebarGraph, graphData, options.animate !== false, options);
    }
  }

  function scheduleGraphForPage(entityId, options = {}) {
    const isViewportTransitioning = state.graphPhase !== 'small' && state.graphPhase !== 'expanded';
    const shouldDefer = isViewportTransitioning || (
      window.innerWidth <= 768
      && !state.isGraphExpanded
      && state.graphPhase === 'small'
    );
    if (shouldDefer) {
      graphState.pendingEntityId = entityId;
      graphState.hasPendingData = true;
      return;
    }

    graphState.hasPendingData = false;
    initBalancedTopologyGraph(entityId, options);
  }

  function flushPendingGraphData(options = {}) {
    if (!graphState.hasPendingData) return false;
    const entityId = graphState.pendingEntityId;
    graphState.hasPendingData = false;
    initBalancedTopologyGraph(entityId, { ...options, animate: false });
    return true;
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

  /**
   * Reconcile the one mobile Canvas with the canonical small-window state.
   * Page data, DOM ownership, backing-store size and camera are committed as
   * one presentation; none of the sidebar/launcher entry points owns a private
   * recovery path.
   */
  function commitMobileSmallGraphPresentation(options = {}) {
    if (!isMobileGraphViewport()
      || state.isGraphExpanded
      || state.graphPhase !== 'small') return false;

    const sidebar = getEl('wiki-sidebar');
    const slot = getEl('sidebar-graph-slot');
    const container = getEl('sidebar-graph-container');
    if (!slot || !container) return false;

    cancelMobileGraphSidebarOverlayLeaseRestore();
    if (isMobileGraphSidebarOverlayLeaseActive()) {
      finishMobileGraphSidebarOverlayLease({ restoreExpanded: false });
    }
    if (container.parentElement !== slot) slot.appendChild(container);
    container.classList.remove(
      'is-expanded',
      'is-sidebar-handoff',
      'is-sidebar-overlay-preview',
      'is-continuum-obscured',
      'is-viewport-transitioning'
    );
    resetGraphContainerStyles(container);
    document.body.classList.remove('graph-is-expanded', 'mobile-sidebar-graph-returning');
    if (sidebar) {
      sidebar.classList.remove('is-closing');
      sidebar.inert = false;
    }
    const continuum = getEl('mobile-graph-continuum');
    if (continuum && continuum.classList.contains('is-active')) {
      deactivateMobileGraphContinuum();
    }

    const surface = options.surface || state.graphReturnSurface;
    setMobileGraphExpansionProgress(0, false, surface);
    const previewSize = getMobileSidebarGraphSize();
    if (options.flushPendingData !== false) {
      flushPendingGraphData({
        renderSize: previewSize,
        viewportSize: previewSize,
        expansionProgress: 0,
        expandedPresentation: false
      });
    }
    if (!state.sidebarGraph) return true;

    cancelGraphCameraTransition();
    settleGraphLayoutTransitionNodes();
    syncGraphRenderSize(state.sidebarGraph, previewSize);
    configureGraphPhysics(state.sidebarGraph, false);
    fitGraphToViewport(state.sidebarGraph, 0, {
      size: previewSize,
      expansionProgress: 0
    });
    requestGraphRedraw(state.sidebarGraph);

    // ForceGraph may rebuild its transform after a backing-store resize. Refit
    // once after layout, guarded by the same canonical presentation state.
    const revision = graphState.dataRevision;
    requestAnimationFrame(() => {
      if (revision !== graphState.dataRevision
        || state.isGraphExpanded
        || state.graphPhase !== 'small'
        || container.parentElement !== slot) return;
      const settledSize = getMobileSidebarGraphSize();
      syncGraphRenderSize(state.sidebarGraph, settledSize);
      fitGraphToViewport(state.sidebarGraph, 0, {
        size: settledSize,
        expansionProgress: 0
      });
      requestGraphRedraw(state.sidebarGraph);
    });
    return true;
  }

  function getGraphSlotContentRect(slot) {
    const rect = slot.getBoundingClientRect();
    const style = getComputedStyle(slot);
    const insetLeft = (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.paddingLeft) || 0);
    const insetRight = (parseFloat(style.borderRightWidth) || 0) + (parseFloat(style.paddingRight) || 0);
    const insetTop = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.paddingTop) || 0);
    const insetBottom = (parseFloat(style.borderBottomWidth) || 0) + (parseFloat(style.paddingBottom) || 0);
    return {
      left: rect.left + insetLeft,
      top: rect.top + insetTop,
      width: Math.max(1, rect.width - insetLeft - insetRight),
      height: Math.max(1, rect.height - insetTop - insetBottom)
    };
  }

  function getMobileLauncherGraphRect(launcher) {
    const anchor = launcher.getBoundingClientRect();
    const width = Math.min(180, window.innerWidth);
    const viewportHeight = graphState.continuumViewportHeight || getMobileVisualViewportHeight();
    const height = Math.min(128, viewportHeight);
    const centerX = anchor.left + anchor.width / 2;
    const centerY = anchor.top + anchor.height / 2;
    return {
      left: Math.max(0, Math.min(window.innerWidth - width, centerX - width / 2)),
      top: Math.max(0, Math.min(viewportHeight - height, centerY - height / 2)),
      width,
      height
    };
  }

  function getMobileGraphControlExpandedInsets(launcher, control) {
    if (!launcher) return { right: 17, bottom: 17 };
    const rect = launcher.getBoundingClientRect();
    const controlRect = control ? control.getBoundingClientRect() : null;
    const halfControl = controlRect && controlRect.width ? controlRect.width / 2 : 24;
    const viewportHeight = graphState.continuumViewportHeight || getMobileVisualViewportHeight();
    return {
      right: Math.max(0, window.innerWidth - (rect.left + rect.width / 2) - halfControl),
      bottom: Math.max(0, viewportHeight - (rect.top + rect.height / 2) - halfControl)
    };
  }

  function setMobileGraphControlShape(progress) {
    const normalized = Math.max(0, Math.min(1, progress));
    const firstStroke = getEl('graph-control-morph-a');
    const secondStroke = getEl('graph-control-morph-b');
    const from = MOBILE_GRAPH_CONTROL_SHAPES.corner;
    const to = MOBILE_GRAPH_CONTROL_SHAPES.close;
    const attributes = ['x1', 'y1', 'x2', 'y2'];
    const applyStroke = (stroke, start, end) => {
      if (!stroke) return;
      attributes.forEach((attribute, index) => {
        stroke.setAttribute(attribute, String(start[index] + (end[index] - start[index]) * normalized));
      });
      stroke.setAttribute(
        'stroke-width',
        String(from.strokeWidth + (to.strokeWidth - from.strokeWidth) * normalized)
      );
    };
    applyStroke(firstStroke, from.first, to.first);
    applyStroke(secondStroke, from.second, to.second);
  }

  function setMobileGraphLauncherPresentation(launcher, options = {}) {
    if (!launcher) return;
    const opacity = Math.max(0, Math.min(1, Number(options.opacity) || 0));
    const interactive = options.interactive === true;
    const continuumReading = options.continuumReading === true;
    launcher.classList.toggle('is-graph-morphing', options.morphing === true);
    launcher.classList.toggle('is-continuum-reading', continuumReading);
    launcher.style.opacity = String(opacity);
    launcher.style.pointerEvents = interactive ? '' : 'none';
    launcher.tabIndex = interactive ? 0 : -1;
    launcher.setAttribute('aria-hidden', interactive ? 'false' : 'true');
    launcher.setAttribute(
      'aria-label',
      continuumReading ? 'Return to Knowledge Graph' : 'Open Knowledge Graph'
    );
  }

  function setMobileGraphExpansionProgress(
    progress,
    transitioning = false,
    surface = state.graphReturnSurface
  ) {
    if (!isMobileGraphViewport()) return;
    const normalized = Math.max(0, Math.min(1, progress));
    const container = getEl('sidebar-graph-container');
    const expandButton = getEl('btn-graph-expand');
    const launcher = getEl('btn-mobile-graph-launcher');
    if (!container) return;

    graphState.mobileExpansionProgress = normalized;
    const returnsToArticle = surface === 'article';
    const launcherHandoff = returnsToArticle
      ? Math.max(0, Math.min(1, normalized / 0.28))
      : 1;
    const expandedInsets = getMobileGraphControlExpandedInsets(launcher, expandButton);
    const controlRight = returnsToArticle
      ? expandedInsets.right
      : expandedInsets.right * normalized;
    const controlBottom = returnsToArticle
      ? expandedInsets.bottom
      : expandedInsets.bottom * normalized;
    const controlOpacity = returnsToArticle
      ? launcherHandoff * (0.85 + 0.15 * normalized)
      : 0.35 + 0.65 * normalized;
    const glyphInset = returnsToArticle
      ? MOBILE_GRAPH_CONTROL_ICON_INSET_PX
      : MOBILE_GRAPH_CONTROL_ICON_INSET_PX * normalized;
    container.style.setProperty('--mobile-graph-expansion-progress', String(normalized));
    container.style.setProperty('--mobile-graph-control-right', `${controlRight}px`);
    container.style.setProperty('--mobile-graph-control-bottom', `${controlBottom}px`);
    container.style.setProperty('--mobile-graph-control-opacity', String(controlOpacity));
    container.style.setProperty('--mobile-graph-effective-control-opacity', String(controlOpacity));
    container.style.setProperty('--mobile-graph-control-glyph-inset', `${glyphInset}px`);
    container.classList.toggle('is-viewport-transitioning', transitioning);
    setMobileGraphControlShape(normalized);

    const isStableSmall = normalized <= 0.001 && !transitioning;
    const isStableExpanded = normalized >= 0.999 && !transitioning;
    if (expandButton) {
      const isInteractive = isStableSmall || isStableExpanded;
      expandButton.style.pointerEvents = isInteractive ? 'auto' : 'none';
      expandButton.tabIndex = isInteractive ? 0 : -1;
      expandButton.setAttribute('aria-hidden', isInteractive ? 'false' : 'true');
      expandButton.setAttribute('aria-expanded', isStableExpanded ? 'true' : 'false');
      expandButton.setAttribute('aria-label', isStableExpanded ? 'Close graph explorer' : 'Expand graph');
    }
    if (launcher) {
      setMobileGraphLauncherPresentation(launcher, {
        opacity: returnsToArticle ? 0.85 * (1 - launcherHandoff) : 0,
        interactive: isStableSmall && returnsToArticle,
        morphing: transitioning
      });
    }
  }

  function isMobileGraphContinuumActive() {
    const continuum = getEl('mobile-graph-continuum');
    return Boolean(
      isMobileGraphViewport()
      && state.isGraphExpanded
      && continuum
      && continuum.classList.contains('is-active')
    );
  }

  function getMobileGraphContinuumHeaderHeight() {
    const header = document.querySelector('.wiki-header');
    return Math.max(0, (header && header.getBoundingClientRect().height) || 52);
  }

  function getMobileGraphContinuumProgress(position = graphState.continuumPosition) {
    const travel = getMobileGraphContinuumGeometry().travel;
    return travel > 0 ? Math.max(0, Math.min(1, position / travel)) : 0;
  }

  function getMobileGraphContinuumChromeReveal(progress) {
    return Math.max(0, Math.min(
      1,
      (progress - MOBILE_CONTINUUM_HEADER_REVEAL_START)
        / (1 - MOBILE_CONTINUUM_HEADER_REVEAL_START)
    ));
  }

  function isMobileGraphContinuumStableReading() {
    const continuum = getEl('mobile-graph-continuum');
    if (!continuum || !continuum.classList.contains('has-article')) return false;
    const geometry = getMobileGraphContinuumGeometry();
    const floorGesture = graphState.continuumGesture
      && graphState.continuumGesture.owner === 'floor';
    return Math.abs(graphState.continuumPosition - geometry.travel) <= 1
      && graphState.continuumMotionTarget === null
      && !floorGesture;
  }

  function isMobileGraphSidebarOverlayLeaseActive() {
    return Boolean(graphState.sidebarOverlayLease);
  }

  function cancelMobileGraphSidebarOverlayLeaseRestore() {
    const pending = graphState.sidebarOverlayLeaseRestore;
    if (!pending) return;
    graphState.sidebarOverlayLeaseRestore = null;
    document.body.classList.remove('mobile-sidebar-graph-returning');
    if (pending.sidebar && pending.onTransitionFinish) {
      pending.sidebar.classList.remove('is-closing');
      pending.sidebar.inert = false;
      pending.sidebar.removeEventListener('transitionend', pending.onTransitionFinish);
    }
    if (pending.timer) clearTimeout(pending.timer);
  }

  function getCssTimeMs(value) {
    const token = String(value || '').trim();
    const amount = parseFloat(token);
    if (!Number.isFinite(amount)) return 0;
    return token.endsWith('ms') ? amount : amount * 1000;
  }

  function getTransformTransitionBudgetMs(element) {
    const style = getComputedStyle(element);
    const properties = style.transitionProperty.split(',').map((value) => value.trim());
    const durations = style.transitionDuration.split(',').map(getCssTimeMs);
    const delays = style.transitionDelay.split(',').map(getCssTimeMs);
    const count = Math.max(properties.length, durations.length, delays.length);
    let budget = 0;
    for (let index = 0; index < count; index += 1) {
      const property = properties[index % properties.length];
      if (property !== 'all' && property !== 'transform') continue;
      budget = Math.max(
        budget,
        durations[index % durations.length] + delays[index % delays.length]
      );
    }
    return Math.max(0, budget);
  }

  function scheduleMobileGraphSidebarOverlayLeaseRestore(sidebar, lease) {
    if (!sidebar || !lease) return;
    cancelMobileGraphSidebarOverlayLeaseRestore();
    const pending = {
      sidebar,
      lease,
      timer: null,
      onTransitionFinish: null
    };
    const complete = () => {
      if (graphState.sidebarOverlayLeaseRestore !== pending) return;
      cancelMobileGraphSidebarOverlayLeaseRestore();
      if (graphState.sidebarOverlayLease === lease
        && !sidebar.classList.contains('is-open')) {
        finishMobileGraphSidebarOverlayLease();
      }
    };
    pending.onTransitionFinish = (event) => {
      if (event.target !== sidebar || event.propertyName !== 'transform') return;
      const rect = sidebar.getBoundingClientRect();
      if (!sidebar.classList.contains('is-open') && rect.right <= 1) complete();
    };
    sidebar.addEventListener('transitionend', pending.onTransitionFinish);
    graphState.sidebarOverlayLeaseRestore = pending;
    document.body.classList.add('mobile-sidebar-graph-returning');
    sidebar.inert = true;
    pending.timer = setTimeout(() => {
      if (graphState.sidebarOverlayLeaseRestore !== pending) return;
      if (graphState.sidebarOverlayLease === lease
        && !sidebar.classList.contains('is-open')) {
        complete();
      } else {
        cancelMobileGraphSidebarOverlayLeaseRestore();
      }
    }, getTransformTransitionBudgetMs(sidebar) + 80);
  }

  function layoutMobileGraphSidebarOverlayPreview(lease = graphState.sidebarOverlayLease) {
    if (!lease || graphState.sidebarOverlayLease !== lease || !state.sidebarGraph) return false;
    const slot = getEl('sidebar-graph-slot');
    const container = getEl('sidebar-graph-container');
    if (!slot || !container || !slot.contains(container)) return false;

    const slotRect = getGraphSlotContentRect(slot);
    const previewSize = {
      width: Math.max(1, slotRect.width),
      height: Math.max(1, slotRect.height)
    };
    syncGraphRenderSize(state.sidebarGraph, previewSize);
    const previewCamera = getGraphCameraForViewport(
      state.sidebarGraph,
      previewSize,
      0,
      graphState.activeTargetPositions
    );
    applyGraphCamera(state.sidebarGraph, previewCamera);
    requestGraphRedraw(state.sidebarGraph);
    return true;
  }

  function beginMobileGraphSidebarOverlayLease() {
    if (graphState.sidebarOverlayLease) {
      cancelMobileGraphSidebarOverlayLeaseRestore();
      return true;
    }
    if (!isMobileGraphViewport()
      || !state.isGraphExpanded
      || state.graphPhase !== 'expanded'
      || !isMobileGraphContinuumStableReading()) return false;

    const container = getEl('sidebar-graph-container');
    const slot = getEl('sidebar-graph-slot');
    const mobileSlot = getEl('mobile-graph-continuum-graph-slot');
    if (!container || !slot || !mobileSlot || !mobileSlot.contains(container)) return false;

    cancelGraphCameraTransition();
    settleGraphLayoutTransitionNodes();
    const expandedSize = getExpandedGraphSize(true);
    const lease = {
      expandedCamera: getCurrentGraphCamera(state.sidebarGraph),
      expandedSize: { width: expandedSize.width, height: expandedSize.height }
    };
    graphState.sidebarOverlayLease = lease;

    // The drawer borrows the one persistent Canvas before its first visible
    // frame. The continuum and its article remain mounted and keep every bit of
    // reading state; only graph presentation ownership changes temporarily.
    slot.appendChild(container);
    container.classList.add('is-sidebar-overlay-preview');
    container.classList.remove('is-continuum-obscured');
    container.style.removeProperty('--mobile-continuum-control-lift');
    resetGraphContainerStyles(container);
    setMobileGraphExpansionProgress(0, false, 'sidebar');
    configureGraphPhysics(state.sidebarGraph, false);
    layoutMobileGraphSidebarOverlayPreview(lease);

    // Opening the drawer changes its transformed coordinate space, but not the
    // graph's identity. Re-read the final slot geometry on the next paint.
    requestAnimationFrame(() => {
      if (graphState.sidebarOverlayLease !== lease) return;
      layoutMobileGraphSidebarOverlayPreview(lease);
    });
    return true;
  }

  function finishMobileGraphSidebarOverlayLease(options = {}) {
    const lease = graphState.sidebarOverlayLease;
    if (!lease) return null;
    cancelMobileGraphSidebarOverlayLeaseRestore();
    const restoreExpanded = options.restoreExpanded !== false;
    const container = getEl('sidebar-graph-container');
    const mobileSlot = getEl('mobile-graph-continuum-graph-slot');
    graphState.sidebarOverlayLease = null;
    if (container) container.classList.remove('is-sidebar-overlay-preview');

    if (restoreExpanded && !isMobileGraphViewport()) {
      syncExpandedGraphHostForViewport();
      return lease;
    }
    if (!restoreExpanded
      || !container
      || !mobileSlot
      || !state.isGraphExpanded
      || state.graphPhase !== 'expanded') return lease;

    mobileSlot.appendChild(container);
    resetGraphContainerStyles(container);
    container.classList.add('is-expanded');
    const expandedSize = getExpandedGraphSize(true);
    applyFixedGraphRect(container, {
      left: 0,
      top: 0,
      width: expandedSize.width,
      height: expandedSize.height
    });
    syncGraphRenderSize(state.sidebarGraph, expandedSize);

    const viewportChanged = !lease.expandedSize
      || Math.abs(expandedSize.width - lease.expandedSize.width) > 1
      || Math.abs(expandedSize.height - lease.expandedSize.height) > 1;
    const expandedCamera = viewportChanged
      ? getGraphCameraForViewport(
        state.sidebarGraph,
        expandedSize,
        1,
        graphState.activeTargetPositions
      )
      : lease.expandedCamera;
    applyGraphCamera(state.sidebarGraph, expandedCamera);
    setMobileGraphExpansionProgress(1, false, state.graphReturnSurface);
    configureGraphPhysics(state.sidebarGraph, true);
    updateMobileGraphContinuumProgress();
    requestGraphRedraw(state.sidebarGraph);

    // ForceGraph may rebuild its backing transform after a width/height write.
    // Reassert the same saved camera once, only if this lease was not reopened.
    requestAnimationFrame(() => {
      if (graphState.sidebarOverlayLease
        || !state.isGraphExpanded
        || state.graphPhase !== 'expanded'
        || !mobileSlot.contains(container)) return;
      applyGraphCamera(state.sidebarGraph, expandedCamera);
      requestGraphRedraw(state.sidebarGraph);
    });
    return lease;
  }

  function expandMobileGraphSidebarOverlayLease(duration = 420) {
    const lease = graphState.sidebarOverlayLease;
    const container = getEl('sidebar-graph-container');
    const mobileSlot = getEl('mobile-graph-continuum-graph-slot');
    if (!lease || !container || !mobileSlot || state.graphPhase !== 'expanded') {
      return Promise.resolve();
    }

    graphState.containerTransitionPromise = (async () => {
      const startRect = container.getBoundingClientRect();
      const startCamera = getCurrentGraphCamera(state.sidebarGraph);
      state.graphPhase = 'expanding';
      state.graphReturnSurface = 'sidebar';
      setMobileGraphExpansionProgress(0, true, 'sidebar');
      hideMobileGraphContinuumArticle();

      // The opaque drawer is committed closed in the same task that transfers
      // the Canvas, so neither host can expose an empty frame between them.
      closeMobileSidebar({ animate: false, restoreGraphLease: false });
      finishMobileGraphSidebarOverlayLease({ restoreExpanded: false });
      mobileSlot.appendChild(container);
      resetGraphContainerStyles(container);
      container.classList.add('is-expanded');
      applyFixedGraphRect(container, startRect);

      const expandedSize = getExpandedGraphSize(true);
      syncGraphRenderSize(state.sidebarGraph, expandedSize);
      applyGraphCamera(state.sidebarGraph, startCamera);
      configureGraphPhysics(state.sidebarGraph, true);
      const getExpandedTarget = () => {
        const size = getExpandedGraphSize(true);
        return { left: 0, top: 0, width: size.width, height: size.height };
      };
      await morphGraphViewport(
        container,
        state.sidebarGraph,
        startRect,
        getExpandedTarget,
        duration,
        1,
        (progress) => setMobileGraphExpansionProgress(progress, true, 'sidebar')
      );
      state.graphPhase = 'expanded';
      setMobileGraphExpansionProgress(1, false, 'sidebar');
      configureGraphPhysics(state.sidebarGraph, true);
      stabilizeMobileGraphContinuum();
      if (graphState.resizePending) scheduleGraphResizeSync();
    })();
    return graphState.containerTransitionPromise;
  }

  function updateMobileGraphContinuumHeader(progress) {
    const reveal = getMobileGraphContinuumChromeReveal(progress);
    const isActive = reveal > 0.001;
    const isStableReading = isMobileGraphContinuumStableReading();
    document.body.classList.toggle('mobile-continuum-header-active', isActive);
    if (isActive) {
      document.body.style.setProperty('--mobile-continuum-header-opacity', String(reveal));
      document.body.style.setProperty('--mobile-continuum-header-shift', `${-8 * (1 - reveal)}px`);
    } else {
      document.body.style.removeProperty('--mobile-continuum-header-opacity');
      document.body.style.removeProperty('--mobile-continuum-header-shift');
    }
    // Visibility follows the continuous scroll, while hit testing belongs only
    // to the settled reading state. This keeps the emerging header out of the
    // active finger path without adding a second timer-driven state machine.
    document.body.classList.toggle(
      'mobile-continuum-header-interactive',
      isActive && isStableReading
    );
  }

  function updateMobileGraphContinuumLauncher(progress, hasArticle) {
    if (state.graphPhase !== 'expanded') return;
    const launcher = getEl('btn-mobile-graph-launcher');
    if (!launcher) return;
    const reveal = hasArticle ? getMobileGraphContinuumChromeReveal(progress) : 0;
    const isStableReading = hasArticle && isMobileGraphContinuumStableReading();
    setMobileGraphLauncherPresentation(launcher, {
      opacity: 0.85 * reveal,
      interactive: isStableReading,
      continuumReading: reveal > 0.001,
      morphing: Boolean(
        graphState.continuumMotionTarget !== null
        || (graphState.continuumGesture && graphState.continuumGesture.owner === 'floor')
      )
    });
  }

  function updateMobileGraphContinuumProgress() {
    const continuum = getEl('mobile-graph-continuum');
    const container = getEl('sidebar-graph-container');
    if (!continuum || !container || !continuum.classList.contains('is-active')) return;

    const hasArticle = continuum.classList.contains('has-article');
    const geometry = getMobileGraphContinuumGeometry();
    if (!hasArticle) {
      graphState.continuumPosition = 0;
      graphState.continuumVelocity = 0;
    }
    const position = hasArticle ? graphState.continuumPosition : 0;
    const progress = hasArticle ? getMobileGraphContinuumProgress(position) : 0;
    const sheetY = geometry.collapsedY - position;
    // A single physical position drives the sheet and every secondary depth
    // cue. No class, scroll offset, or independent CSS transition may move a
    // second surface on its own.
    const depthProgress = Math.max(0, Math.min(1, (progress - 0.04) / 0.96));
    const controlFade = 1 - Math.max(0, Math.min(1, (progress - 0.08) / 0.52));
    const controlLift = hasArticle
      ? geometry.previewPeek + Math.max(0, Math.min(geometry.travel, position))
      : 0;

    continuum.style.setProperty('--mobile-continuum-progress', String(progress));
    continuum.style.setProperty('--mobile-continuum-sheet-y', `${sheetY}px`);
    continuum.style.setProperty(
      '--mobile-continuum-graph-shift',
      `${-14 * depthProgress}px`
    );
    continuum.style.setProperty(
      '--mobile-continuum-graph-scale',
      String(1 - 0.016 * depthProgress)
    );
    continuum.style.setProperty(
      '--mobile-continuum-graph-opacity',
      String(1 - 0.18 * depthProgress)
    );
    const continuumOwnsGraph = continuum.contains(container);
    if (continuumOwnsGraph) {
      const baseControlOpacity = parseFloat(
        container.style.getPropertyValue('--mobile-graph-control-opacity') || '1'
      );
      container.style.setProperty('--mobile-continuum-control-lift', `${controlLift}px`);
      container.style.setProperty(
        '--mobile-graph-effective-control-opacity',
        String(baseControlOpacity * controlFade)
      );
      container.classList.toggle('is-continuum-obscured', progress >= 0.96);
    }
    continuum.classList.toggle('is-settling', graphState.continuumMotionTarget !== null);
    continuum.classList.toggle('is-tracking', Boolean(
      graphState.continuumGesture && graphState.continuumGesture.owner === 'floor'
    ));
    continuum.classList.toggle('is-article-resting', isMobileGraphContinuumStableReading());
    updateMobileGraphContinuumHeader(progress);
    updateMobileGraphContinuumLauncher(progress, hasArticle);

    const expandButton = getEl('btn-graph-expand');
    if (expandButton && continuumOwnsGraph && state.graphPhase === 'expanded') {
      const floorIsIdle = graphState.continuumMotionTarget === null
        && !(graphState.continuumGesture && graphState.continuumGesture.owner === 'floor');
      const closeIsInteractive = controlFade > 0.12
        && floorIsIdle
        && Math.abs(position) <= 0.5;
      expandButton.style.pointerEvents = closeIsInteractive ? 'auto' : 'none';
      expandButton.tabIndex = closeIsInteractive ? 0 : -1;
      expandButton.setAttribute('aria-hidden', closeIsInteractive ? 'false' : 'true');
    }

  }

  function getElasticMobileGraphContinuumPosition(rawPosition, geometry) {
    if (rawPosition < 0) {
      return -geometry.elasticLimit
        * (1 - Math.exp(rawPosition / geometry.elasticLimit));
    }
    if (rawPosition > geometry.travel) {
      const overflow = rawPosition - geometry.travel;
      return geometry.travel + geometry.elasticLimit
        * (1 - Math.exp(-overflow / geometry.elasticLimit));
    }
    return rawPosition;
  }

  function cancelMobileGraphContinuumMotion(options = {}) {
    graphState.continuumMotionGeneration += 1;
    if (graphState.continuumMotionFrame) {
      cancelAnimationFrame(graphState.continuumMotionFrame);
      graphState.continuumMotionFrame = null;
    }
    graphState.continuumMotionTarget = null;
    if (options.resetVelocity !== false) graphState.continuumVelocity = 0;
  }

  function setMobileGraphContinuumPosition(position, velocity = graphState.continuumVelocity) {
    graphState.continuumPosition = Number.isFinite(position) ? position : 0;
    graphState.continuumVelocity = Number.isFinite(velocity) ? velocity : 0;
    updateMobileGraphContinuumProgress();
  }

  function commitMobileGraphContinuumReadingContext() {
    const continuum = getEl('mobile-graph-continuum');
    const entityId = graphState.continuumEntityId;
    if (!isMobileGraphViewport()
      || !continuum
      || !continuum.classList.contains('has-article')
      || !entityId
      || entityId === state.currentEntityId) return false;

    // Reaching the article floor is the semantic navigation boundary. At this
    // point the sheet fully covers the graph, so promote its transient entity
    // to the canonical page and rebuild that entity's graph without exposing a
    // second visual transition. A mere node peek/background cancellation never
    // reaches this commit point and therefore cannot navigate by accident.
    cancelMobileGraphFocusTransition();
    clearActiveNav();
    openEntityArticle(entityId, { animateGraph: false });
    return state.currentEntityId === entityId;
  }

  function finishMobileGraphContinuumSettle(target) {
    graphState.continuumMotionFrame = null;
    graphState.continuumMotionTarget = null;
    graphState.continuumVelocity = 0;
    graphState.continuumPosition = target;
    updateMobileGraphContinuumProgress();
    if (isMobileGraphContinuumStableReading()) {
      commitMobileGraphContinuumReadingContext();
    }
  }

  function startMobileGraphContinuumSettle(targetPosition, initialVelocity = 0) {
    const continuum = getEl('mobile-graph-continuum');
    if (!continuum || !continuum.classList.contains('has-article')) return;
    const geometry = getMobileGraphContinuumGeometry();
    const target = targetPosition >= geometry.travel / 2 ? geometry.travel : 0;
    cancelMobileGraphContinuumMotion({ resetVelocity: false });
    const generation = ++graphState.continuumMotionGeneration;
    graphState.continuumMotionTarget = target;
    let releaseVelocity = Math.max(
      -MOBILE_CONTINUUM_MAX_RELEASE_SPEED,
      Math.min(MOBILE_CONTINUUM_MAX_RELEASE_SPEED, initialVelocity || 0)
    );
    // Preserve the release energy across the legal track, then dissipate the
    // impossible remainder as the sheet reaches a hard floor. This is the
    // no-overshoot branch of the same critically damped system, not a second
    // boundary animation.
    const remaining = target - graphState.continuumPosition;
    const maxArrivalVelocity = Math.abs(remaining) * MOBILE_CONTINUUM_SPRING_FREQUENCY * 0.92;
    if (remaining > 0 && releaseVelocity > 0) {
      releaseVelocity = Math.min(releaseVelocity, maxArrivalVelocity);
    } else if (remaining < 0 && releaseVelocity < 0) {
      releaseVelocity = Math.max(releaseVelocity, -maxArrivalVelocity);
    }
    graphState.continuumVelocity = releaseVelocity;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishMobileGraphContinuumSettle(target);
      return;
    }

    let lastTime = performance.now();
    const step = (now) => {
      if (generation !== graphState.continuumMotionGeneration) return;
      const dt = Math.max(0, (now - lastTime) / 1000);
      lastTime = now;
      const omega = MOBILE_CONTINUUM_SPRING_FREQUENCY;
      const displacement = graphState.continuumPosition - target;
      const velocity = graphState.continuumVelocity;
      const coefficient = velocity + omega * displacement;
      const decay = Math.exp(-omega * dt);

      // Exact critically-damped solution. Unlike a frame-stepped Euler spring,
      // this consumes the real elapsed time, so dropped frames or a temporarily
      // hidden tab cannot slow the sheet and then end in a deadline snap.
      const nextDisplacement = (displacement + coefficient * dt) * decay;
      const nextVelocity = (velocity - omega * coefficient * dt) * decay;
      if (!Number.isFinite(nextDisplacement) || !Number.isFinite(nextVelocity)) {
        finishMobileGraphContinuumSettle(target);
        return;
      }
      graphState.continuumPosition = target + nextDisplacement;
      graphState.continuumVelocity = nextVelocity;
      updateMobileGraphContinuumProgress();

      const isSettled = Math.abs(graphState.continuumPosition - target) <= 0.5
        && Math.abs(graphState.continuumVelocity) <= 8;
      if (isSettled) {
        finishMobileGraphContinuumSettle(target);
        return;
      }
      graphState.continuumMotionFrame = requestAnimationFrame(step);
    };
    updateMobileGraphContinuumProgress();
    graphState.continuumMotionFrame = requestAnimationFrame(step);
  }

  function getMobileGraphContinuumReleaseVelocity(gesture, now = performance.now()) {
    const samples = gesture && gesture.samples;
    if (!samples || samples.length < 2) return 0;
    const last = samples[samples.length - 1];
    if (now - last.time > MOBILE_CONTINUUM_VELOCITY_STALE_MS) return 0;
    const cutoff = last.time - MOBILE_CONTINUUM_VELOCITY_WINDOW_MS;
    let first = samples[0];
    for (let index = samples.length - 2; index >= 0; index -= 1) {
      first = samples[index];
      if (first.time <= cutoff) break;
    }
    const elapsed = Math.max(1, last.time - first.time);
    const velocity = (last.position - first.position) / elapsed * 1000;
    if (Math.abs(velocity) < 20) return 0;
    return Math.max(
      -MOBILE_CONTINUUM_MAX_RELEASE_SPEED,
      Math.min(MOBILE_CONTINUUM_MAX_RELEASE_SPEED, velocity)
    );
  }

  function settleMobileGraphContinuumGesture(gesture, cancelled = false) {
    if (!gesture || gesture.owner !== 'floor') return;
    const geometry = getMobileGraphContinuumGeometry();
    const position = graphState.continuumPosition;
    const velocity = cancelled ? 0 : getMobileGraphContinuumReleaseVelocity(gesture);
    if (cancelled) {
      const cancelTarget = gesture.cancelTarget >= geometry.travel / 2
        ? geometry.travel
        : 0;
      startMobileGraphContinuumSettle(cancelTarget, 0);
      return;
    }
    const projected = Math.max(
      0,
      Math.min(
        geometry.travel,
        position + velocity * MOBILE_CONTINUUM_PROJECTION_SECONDS
      )
    );
    const origin = Math.max(0, Math.min(geometry.travel, gesture.floorStartPosition));
    let target;

    // Direction lock already consumed the touch slop. Requiring another fixed
    // distance here would discard a legitimate short, fast release and make the
    // floor feel as if it deliberately resisted the user.
    if (velocity >= MOBILE_CONTINUUM_FLING_SPEED) {
      target = geometry.travel;
    } else if (velocity <= -MOBILE_CONTINUUM_FLING_SPEED) {
      target = 0;
    } else if (origin <= geometry.travel * 0.1) {
      target = projected >= geometry.travel * MOBILE_CONTINUUM_OPEN_COMMIT_PROGRESS
        ? geometry.travel
        : 0;
    } else if (origin >= geometry.travel * 0.9) {
      target = projected <= geometry.travel * MOBILE_CONTINUUM_CLOSE_COMMIT_PROGRESS
        ? 0
        : geometry.travel;
    } else {
      target = projected >= geometry.travel / 2 ? geometry.travel : 0;
    }
    startMobileGraphContinuumSettle(target, velocity);
  }

  function activateMobileGraphContinuum() {
    const continuum = getEl('mobile-graph-continuum');
    if (!continuum) return null;
    // Fullscreen graph/article is the sole visible mobile surface. Preserve
    // graphReturnSurface as navigation history, but never preserve a live
    // `is-open` drawer underneath: later z-index changes must not reveal stale
    // UI state. Centralizing the invariant here also covers viewport host sync.
    closeMobileSidebar({ animate: false });
    cancelMobileGraphContinuumMotion();
    graphState.continuumGesture = null;
    graphState.continuumPosition = 0;
    graphState.continuumVelocity = 0;
    captureMobileGraphContinuumViewport(true);
    continuum.classList.remove(
      'has-article',
      'is-article-ready',
      'is-article-resting',
      'is-settling',
      'is-tracking'
    );
    continuum.classList.add('is-active');
    continuum.setAttribute('aria-hidden', 'false');
    const article = getEl('mobile-graph-continuum-article');
    if (article) {
      article.scrollTop = 0;
      article.setAttribute('aria-hidden', 'true');
    }
    graphState.continuumEntityId = null;
    updateMobileGraphContinuumProgress();
    return continuum;
  }

  function stabilizeMobileGraphContinuum() {
    const continuum = getEl('mobile-graph-continuum');
    if (!continuum) return;
    updateMobileGraphContinuumProgress();
  }

  function hideMobileGraphContinuumArticle() {
    const continuum = getEl('mobile-graph-continuum');
    const article = getEl('mobile-graph-continuum-article');
    if (!continuum) return;
    cancelMobileGraphContinuumMotion();
    graphState.continuumGesture = null;
    graphState.continuumPosition = 0;
    graphState.continuumVelocity = 0;
    continuum.classList.remove(
      'has-article',
      'is-article-ready',
      'is-article-resting',
      'is-settling',
      'is-tracking'
    );
    if (article) {
      article.scrollTop = 0;
      article.setAttribute('aria-hidden', 'true');
    }
    graphState.continuumEntityId = null;
    configureGraphPhysics(state.sidebarGraph, state.isGraphExpanded);
    updateMobileGraphContinuumProgress();
  }

  function prepareMobileGraphContinuumForCollapse() {
    const continuum = getEl('mobile-graph-continuum');
    if (!continuum) return;
    hideMobileGraphContinuumArticle();
  }

  function deactivateMobileGraphContinuum() {
    const continuum = getEl('mobile-graph-continuum');
    const container = getEl('sidebar-graph-container');
    if (!continuum) return;
    hideMobileGraphContinuumArticle();
    continuum.classList.remove('is-active');
    continuum.setAttribute('aria-hidden', 'true');
    releaseMobileGraphContinuumViewport();
    updateMobileGraphContinuumHeader(0);
    if (container) {
      container.classList.remove('is-continuum-obscured');
      container.style.removeProperty('--mobile-continuum-control-lift');
      container.style.setProperty(
        '--mobile-graph-effective-control-opacity',
        container.style.getPropertyValue('--mobile-graph-control-opacity') || '0.35'
      );
    }
  }

  function syncExpandedGraphHostForViewport() {
    if (!state.isGraphExpanded || state.graphPhase !== 'expanded') return;
    const container = getEl('sidebar-graph-container');
    const continuum = getEl('mobile-graph-continuum');
    const mobileSlot = getEl('mobile-graph-continuum-graph-slot');
    if (!container || !continuum || !mobileSlot) return;

    // A foreground drawer temporarily owns the one Canvas while the second-floor
    // article remains alive underneath. Mobile resize synchronization must not
    // steal that lease back; crossing out of the mobile viewport ends it first.
    if (isMobileGraphSidebarOverlayLeaseActive()) {
      if (isMobileGraphViewport()) return;
      finishMobileGraphSidebarOverlayLease({ restoreExpanded: false });
    }

    const isInMobileHost = mobileSlot.contains(container);
    if (isMobileGraphViewport()) {
      if (!continuum.classList.contains('is-active')) activateMobileGraphContinuum();
      if (!isInMobileHost) mobileSlot.appendChild(container);
      stabilizeMobileGraphContinuum();
      return;
    }

    if (isInMobileHost || continuum.classList.contains('is-active')) {
      document.body.appendChild(container);
      deactivateMobileGraphContinuum();
      graphState.focusedNode = null;
      graphState.hoverNode = null;
      clearMobileGraphFocusVisuals();
    }
  }

  function showMobileGraphContinuumArticle(node) {
    const continuum = getEl('mobile-graph-continuum');
    const article = getEl('mobile-graph-continuum-article');
    if (!node || !node.id || !article || !isMobileGraphContinuumActive()) return false;

    const model = getEntityArticleModel(node.id);
    if (!model) return false;
    const hadArticle = continuum.classList.contains('has-article')
      && article.getAttribute('aria-hidden') !== 'true';
    const isReplacing = Boolean(
      graphState.continuumEntityId
      && graphState.continuumEntityId !== model.id
    );
    // The first node creates the second floor from the graph's origin. Later
    // node choices replace only its content; the physical sheet position is
    // retained while the new article starts at its own natural top.
    if (!hadArticle) {
      cancelMobileGraphContinuumMotion();
      graphState.continuumPosition = 0;
      graphState.continuumVelocity = 0;
    }
    if (!hadArticle || isReplacing) article.scrollTop = 0;
    renderEntityArticleInto(model, {
      title: getEl('mobile-continuum-title'),
      media: getEl('mobile-continuum-media'),
      image: getEl('mobile-continuum-image'),
      markdown: getEl('mobile-continuum-markdown')
    });

    graphState.continuumEntityId = model.id;
    article.setAttribute('aria-hidden', 'false');
    continuum.classList.add('has-article');
    updateMobileGraphContinuumProgress();
    configureGraphPhysics(state.sidebarGraph, true);
    if (!continuum.classList.contains('is-article-ready')) {
      const revealEntityId = model.id;
      article.getBoundingClientRect();
      requestAnimationFrame(() => {
        if (graphState.continuumEntityId !== revealEntityId
          || !continuum.classList.contains('has-article')
          || article.getAttribute('aria-hidden') === 'true') return;
        continuum.classList.add('is-article-ready');
      });
    }
    requestAnimationFrame(() => {
      if (graphState.continuumEntityId !== model.id) return;
      updateMobileGraphContinuumProgress();
    });
    initIcons();
    return true;
  }

  function initMobileGraphContinuum() {
    const continuum = getEl('mobile-graph-continuum');
    if (!continuum) return;

    const findTouch = (touches, identifier) => {
      for (let index = 0; index < touches.length; index += 1) {
        if (touches[index].identifier === identifier) return touches[index];
      }
      return null;
    };

    const beginFloorGesture = (gesture, touch) => {
      const geometry = getMobileGraphContinuumGeometry();
      const interruptedTarget = graphState.continuumMotionTarget;
      const currentPosition = graphState.continuumPosition;
      const recognitionDelta = touch.clientY - gesture.startY;
      const recognizedDirection = Math.sign(recognitionDelta) || 1;
      const excessAfterSlop = recognizedDirection * Math.max(
        0,
        Math.abs(recognitionDelta) - MOBILE_CONTINUUM_TOUCH_SLOP_PX
      );
      cancelMobileGraphContinuumMotion();
      gesture.owner = 'floor';
      // The slop itself remains invisible, but displacement beyond it belongs to
      // the user. Preserving that excess also preserves a one-move short flick.
      gesture.baseY = touch.clientY - excessAfterSlop;
      gesture.basePosition = currentPosition;
      gesture.floorStartPosition = currentPosition;
      gesture.cancelTarget = interruptedTarget !== null
        ? interruptedTarget
        : (currentPosition >= geometry.travel / 2 ? geometry.travel : 0);
      gesture.lastY = touch.clientY;
      gesture.samples = [{ time: gesture.startTime, position: currentPosition }];
      const article = getEl('mobile-graph-continuum-article');
      if (article && article.scrollTop < 1) article.scrollTop = 0;
      updateMobileGraphContinuumProgress();
    };

    continuum.addEventListener('touchstart', (event) => {
      if (!isMobileGraphContinuumActive()
        || !continuum.classList.contains('has-article')
        || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const target = event.target instanceof Element ? event.target : null;
      const article = getEl('mobile-graph-continuum-article');
      const graphContainer = getEl('sidebar-graph-container');
      const expandButton = getEl('btn-graph-expand');
      let source = null;

      if (article && target && article.contains(target)) {
        source = 'article';
      } else if (graphContainer && target && graphContainer.contains(target)) {
        if (expandButton && expandButton.contains(target)) return;
        const graphNode = getGraphNodeAtClientPoint(
          state.sidebarGraph,
          graphContainer,
          touch.clientX,
          touch.clientY
        );
        if (graphNode) return;
        source = 'graph';
      }
      if (!source) return;

      const now = performance.now();
      graphState.continuumGesture = {
        touchId: touch.identifier,
        source,
        owner: 'pending',
        startTime: now,
        startX: touch.clientX,
        startY: touch.clientY,
        lastY: touch.clientY,
        maxDistanceSq: 0,
        floorStartPosition: graphState.continuumPosition,
        basePosition: graphState.continuumPosition,
        baseY: touch.clientY,
        samples: [{ time: now, position: graphState.continuumPosition }]
      };
      updateMobileGraphContinuumProgress();
    }, { passive: true, capture: true });

    continuum.addEventListener('touchmove', (event) => {
      const gesture = graphState.continuumGesture;
      if (!gesture) return;
      if (event.touches.length !== 1) {
        const releasedGesture = graphState.continuumGesture;
        graphState.continuumGesture = null;
        settleMobileGraphContinuumGesture(releasedGesture, true);
        if (graphState.resizePending) scheduleGraphResizeSync();
        return;
      }
      const touch = findTouch(event.touches, gesture.touchId);
      if (!touch) return;
      const now = performance.now();
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      gesture.maxDistanceSq = Math.max(
        gesture.maxDistanceSq,
        deltaX * deltaX + deltaY * deltaY
      );
      const geometry = getMobileGraphContinuumGeometry();

      if (gesture.owner === 'pending') {
        if (Math.max(absX, absY) < MOBILE_CONTINUUM_TOUCH_SLOP_PX) return;
        if (absX > absY) {
          gesture.owner = 'ignored';
          return;
        }

        const isAtArticle = graphState.continuumPosition >= geometry.travel - 1;
        const article = getEl('mobile-graph-continuum-article');
        if (gesture.source === 'article' && isAtArticle) {
          if ((article && article.scrollTop > 0.5) || deltaY < 0) {
            gesture.owner = 'article-scroll';
            gesture.lastY = touch.clientY;
            return;
          }
        }
        // Reset the origin on the direction-lock frame. The touch slop decides
        // intent but is never replayed as a visible jump.
        beginFloorGesture(gesture, touch);
      } else if (gesture.owner === 'article-scroll') {
        // Once native article scrolling owns a touch, it keeps that touch until
        // release. Browsers cannot reliably transfer an already-started native
        // pan into a custom transform without cancellation or a visible jump.
        gesture.lastY = touch.clientY;
        return;
      }

      if (gesture.owner !== 'floor') return;
      event.preventDefault();
      event.stopPropagation();
      const rawPosition = gesture.basePosition + gesture.baseY - touch.clientY;
      const nextPosition = getElasticMobileGraphContinuumPosition(rawPosition, geometry);
      const previousSample = gesture.samples[gesture.samples.length - 1];
      const elapsed = Math.max(1, now - previousSample.time);
      const velocity = (nextPosition - previousSample.position) / elapsed * 1000;
      gesture.samples.push({ time: now, position: nextPosition });
      while (gesture.samples.length > 12
        || (gesture.samples.length > 2 && now - gesture.samples[0].time > 220)) {
        gesture.samples.shift();
      }
      gesture.lastY = touch.clientY;
      setMobileGraphContinuumPosition(nextPosition, velocity);
    }, { passive: false, capture: true });

    const finishTouch = (event, cancelled) => {
      const gesture = graphState.continuumGesture;
      const touch = gesture && findTouch(event.changedTouches, gesture.touchId);
      if (!gesture || !touch) return;
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;
      gesture.maxDistanceSq = Math.max(
        gesture.maxDistanceSq,
        deltaX * deltaX + deltaY * deltaY
      );
      graphState.continuumGesture = null;
      if (gesture.owner === 'floor') {
        settleMobileGraphContinuumGesture(gesture, cancelled);
      } else if (!cancelled && gesture.source === 'graph') {
        // Empty-space taps and rejected background moves share this one gesture
        // classifier. Always suppress the synthetic click so ForceGraph cannot
        // classify the same touch again after the continuum owner has finished.
        event.preventDefault();
        event.stopPropagation();
        if (gesture.owner === 'pending'
          && gesture.maxDistanceSq <= MOBILE_GRAPH_TAP_SLOP_PX * MOBILE_GRAPH_TAP_SLOP_PX) {
          handleGraphBackgroundActivation();
        } else {
          updateMobileGraphContinuumProgress();
        }
      } else {
        updateMobileGraphContinuumProgress();
      }
      if (graphState.resizePending) scheduleGraphResizeSync();
    };
    continuum.addEventListener('touchend', (event) => finishTouch(event, false), {
      passive: false,
      capture: true
    });
    continuum.addEventListener('touchcancel', (event) => finishTouch(event, true), {
      passive: true,
      capture: true
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden || !graphState.continuumGesture) return;
      const gesture = graphState.continuumGesture;
      graphState.continuumGesture = null;
      settleMobileGraphContinuumGesture(gesture, true);
      if (graphState.resizePending) scheduleGraphResizeSync();
    });
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
      const requestedDestination = options.destination === 'sidebar'
        || options.destination === 'article'
        ? options.destination
        : null;
      const collapseDestination = isMobile && !targetState
        ? (requestedDestination || state.graphReturnSurface)
        : null;
      const consumesSidebarOverlayLease = isMobile
        && !targetState
        && collapseDestination === 'sidebar'
        && isMobileGraphSidebarOverlayLeaseActive();
      const launcher = getEl('btn-mobile-graph-launcher');
      // Window morphing owns the camera. Finish only the current node geometry
      // first so page-layout and viewport-layout animations can never compete.
      cancelGraphCameraTransition();
      settleGraphLayoutTransitionNodes();
      if (targetState && isMobile) {
        // Expansion always starts from one fully committed sidebar presentation.
        // The pending page graph is then allocated for the destination backing
        // store while retaining the small-window camera as the morph source.
        commitMobileSmallGraphPresentation({
          flushPendingData: false,
          surface: state.graphReturnSurface
        });
        flushPendingGraphData({
          renderSize: getExpandedGraphSize(true),
          viewportSize: getMobileSidebarGraphSize(),
          expansionProgress: 0,
          expandedPresentation: true
        });
      }
      const sidebar = getEl('wiki-sidebar');
      if (targetState && isMobile) {
        state.graphReturnSurface = sidebar && sidebar.classList.contains('is-open') ? 'sidebar' : 'article';
      }
      state.isGraphExpanded = targetState;

      if (targetState) {
        const startRect = container.getBoundingClientRect();
        state.graphPhase = 'expanding';
        if (isMobile) {
          setMobileGraphExpansionProgress(0, true);
        } else if (launcher) {
          launcher.style.opacity = '0';
          launcher.style.pointerEvents = 'none';
        }

        // Capture mobile visual-viewport geometry before sizing either the DOM
        // host or ForceGraph's backing store. Both surfaces must start from the
        // exact same snapshot, including when browser chrome is visible.
        const mobileContinuum = isMobile ? activateMobileGraphContinuum() : null;
        const expandedSize = getExpandedGraphSize(isMobile);
        syncGraphRenderSize(state.sidebarGraph, expandedSize);
        const getExpandedTarget = () => {
          // Lock the responsive mode for this morph. A breakpoint change queues
          // one host/geometry handoff after the current interpolation completes.
          const size = getExpandedGraphSize(isMobile);
          return {
            left: 0,
            top: isMobile ? 0 : 52,
            width: size.width,
            height: size.height
          };
        };
        const expansionHost = mobileContinuum
          ? getEl('mobile-graph-continuum-graph-slot')
          : document.body;
        (expansionHost || document.body).appendChild(container);
        if (!isMobile) closeMobileSidebar();
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
          getExpandedTarget,
          transitionDuration,
          1,
          isMobile ? (progress) => setMobileGraphExpansionProgress(progress, true) : null
        );
        state.graphPhase = 'expanded';
        if (isMobile) {
          setMobileGraphExpansionProgress(1, false);
          stabilizeMobileGraphContinuum();
        }
        configureGraphPhysics(state.sidebarGraph, true);
      } else {
        state.graphPhase = 'collapsing';
        if (isMobile) {
          cancelMobileGraphFocusTransition();
          // Return the shared floor controller to its graph endpoint before
          // measuring the collapse origin. The viewport morph must always begin
          // from the stable canvas plane, never from a partially covered sheet.
          prepareMobileGraphContinuumForCollapse();
          setMobileGraphExpansionProgress(1, true, collapseDestination);
        } else {
          graphState.focusedNode = null;
          graphState.hoverNode = null;
        }
        const startRect = container.getBoundingClientRect();
        const returnsToArticleLauncher = isMobile && collapseDestination === 'article' && launcher;
        const sidebarWasOpen = Boolean(sidebar && sidebar.classList.contains('is-open'));
        const revealsSidebarGraph = isMobile
          && collapseDestination === 'sidebar'
          && !sidebarWasOpen;
        if (isMobile && collapseDestination === 'sidebar') {
          // The drawer establishes the final coordinate system immediately.
          // Its own translate must not compete with the one Canvas morph.
          if (!sidebar || !sidebar.classList.contains('is-open')) openMobileSidebar({ animate: false });
        } else if (returnsToArticleLauncher && sidebar && sidebar.classList.contains('is-open')) {
          closeMobileSidebar({ animate: false });
        }

        if (revealsSidebarGraph && sidebar) {
          // FLIP host handoff: use a viewport-level portal while the one Canvas
          // shrinks over the already committed drawer. This avoids both the
          // drawer's transformed fixed-position coordinate system and the
          // scroll clipping inside its final slot.
          document.body.appendChild(container);
          container.classList.add('is-sidebar-handoff');
          applyFixedGraphRect(container, startRect);
        }
        configureGraphPhysics(state.sidebarGraph, false);
        const getCollapseTarget = () => (
          returnsToArticleLauncher
            ? getMobileLauncherGraphRect(launcher)
            : getGraphSlotContentRect(slot)
        );
        await morphGraphViewport(
          container,
          state.sidebarGraph,
          startRect,
          getCollapseTarget,
          consumesSidebarOverlayLease ? 0 : transitionDuration,
          0,
          isMobile
            ? (progress) => setMobileGraphExpansionProgress(progress, true, collapseDestination)
            : null
        );

        if (isMobile) {
          graphState.focusedNode = null;
          graphState.hoverNode = null;
          clearMobileGraphFocusVisuals();
          state.graphReturnSurface = collapseDestination;
          setMobileGraphExpansionProgress(0, false, collapseDestination);
        }
        if (container.parentElement !== slot) slot.appendChild(container);
        container.classList.remove('is-sidebar-handoff');
        container.classList.remove('is-expanded');
        if (consumesSidebarOverlayLease) {
          // The borrowed preview is already the destination small graph. Consume
          // the lease atomically after the zero-duration state commit.
          finishMobileGraphSidebarOverlayLease({ restoreExpanded: false });
        }
        document.body.classList.remove('graph-is-expanded');
        resetGraphContainerStyles(container);
        state.graphPhase = 'small';
        if (isMobile) deactivateMobileGraphContinuum();
        if (launcher) {
          launcher.classList.remove('is-graph-morphing');
          launcher.style.opacity = '';
          launcher.style.pointerEvents = '';
        }
        if (isMobile) {
          commitMobileSmallGraphPresentation({
            flushPendingData: false,
            surface: collapseDestination
          });
        }
      }
      if (targetState || window.innerWidth > 768) flushPendingGraphData();
      if (graphState.resizePending) scheduleGraphResizeSync();
    })();

    return graphState.containerTransitionPromise;
  }

  async function navigateFromGraphNode(entityId, options = {}) {
    const collapseGraph = options.collapseGraph !== false;
    const isMobile = window.innerWidth <= 768;
    const preserveFocusThroughCollapse = isMobile
      && collapseGraph
      && (state.isGraphExpanded || state.graphPhase !== 'small');
    if (preserveFocusThroughCollapse) {
      cancelMobileGraphFocusTransition();
    } else {
      graphState.focusedNode = null;
      graphState.hoverNode = null;
      if (isMobile) clearMobileGraphFocusVisuals();
    }
    if (collapseGraph && (state.isGraphExpanded || state.graphPhase !== 'small')) {
      await toggleGraphExpand(false, {
        duration: isMobile ? 180 : 420,
        destination: 'article'
      });
    }
    if (isMobile) {
      graphState.focusedNode = null;
      graphState.hoverNode = null;
      clearMobileGraphFocusVisuals();
    }
    closeMobileSidebar();
    clearActiveNav();
    openEntityArticle(entityId, { animateGraph: !isMobile });
  }

  /**
   * Mobile Native Gesture Engine (手势滑动操控系统)
   * 1. Horizontal Drawer: Left-to-Right Swipe to Open, Right-to-Left to Close
   * 2. Pull-Down in Default State: Top Pull-Down on Sidebar / Small Graph to Expand Fullscreen
   * The graph/article seam has its own boundary gesture engine and is not
   * handled here, so navigation gestures never compete with graph gestures.
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
        // An open drawer sits above the continuum and owns its closing swipe.
        // With the drawer closed, the fullscreen graph/article surface keeps all
        // navigation gestures so a floor interaction can never open the drawer.
        if (isMobileGraphContinuumActive() && !isOpen) return;

        if (deltaX > 0 && !isOpen && !state.isGraphExpanded) {
          // Swipe Left -> Right on Main Article: Open Horizontal Drawer
          requestMobileSidebarState(true);
        } else if (deltaX < 0 && isOpen) {
          // Swipe Right -> Left on Open Sidebar: Close Horizontal Drawer
          requestMobileSidebarState(false);
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
        if (isAtTop
          && deltaY > 35
          && deltaY > Math.abs(deltaX) * 1.05
          && elapsed < 600
          && !state.isGraphExpanded
          && state.graphPhase === 'small') {
          toggleGraphExpand(true);
        }
      }, { passive: true });
    }

    // 3. Legacy fullscreen graph swipe collapse. The continuous mobile reader
    // explicitly owns vertical movement, so this path is disabled there.
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
        if (isMobileGraphContinuumActive()) return;
        if (performance.now() < graphState.mobileNodeGestureUntil) return;
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

  function clearDeferredMobileGraphRenderResize() {
    if (graphState.continuumRenderResizeTimer) {
      clearTimeout(graphState.continuumRenderResizeTimer);
      graphState.continuumRenderResizeTimer = null;
    }
    graphState.continuumRenderResizePending = false;
  }

  function deferMobileGraphRenderResize() {
    if (graphState.continuumRenderResizeTimer) {
      clearTimeout(graphState.continuumRenderResizeTimer);
    }
    graphState.continuumRenderResizePending = true;
    graphState.continuumRenderResizeTimer = setTimeout(() => {
      graphState.continuumRenderResizeTimer = null;
      scheduleGraphResizeSync({ flushMobileRender: true });
    }, 120);
  }

  function scheduleGraphResizeSync(options = {}) {
    const flushMobileRender = Boolean(options && options.flushMobileRender === true);
    const resizeRevision = ++graphState.resizeRevision;
    if (graphState.resizeFrame) cancelAnimationFrame(graphState.resizeFrame);
    graphState.resizeFrame = requestAnimationFrame(() => {
      graphState.resizeFrame = null;
      if (resizeRevision !== graphState.resizeRevision) return;
      if (!state.sidebarGraph) return;
      if (state.graphPhase !== 'small' && state.graphPhase !== 'expanded') {
        graphState.resizePending = true;
        return;
      }

      if (isMobileGraphContinuumActive()) {
        const floorGesture = graphState.continuumGesture
          && graphState.continuumGesture.owner === 'floor';
        if (floorGesture) {
          // Never change the travel distance underneath the active finger. The
          // touch-end path replays this pending resize against the released
          // physical position.
          graphState.resizePending = true;
          return;
        }
        const widthChanged = graphState.continuumViewportWidth === null
          || Math.abs(window.innerWidth - graphState.continuumViewportWidth) > 1;
        const visualHeight = getMobileVisualViewportHeight();
        const heightChanged = graphState.continuumViewportHeight === null
          || Math.abs(visualHeight - graphState.continuumViewportHeight) > 1;
        // Browser chrome changes are real viewport changes too. Remap the one
        // physical floor position to the new travel distance so the landed
        // article keeps its header seam and never leaves a dead strip below it.
        if (!widthChanged && !heightChanged && !flushMobileRender) {
          graphState.resizePending = false;
          updateMobileGraphContinuumProgress();
          return;
        }
        if (widthChanged || heightChanged) captureMobileGraphContinuumViewport(true);

        // Browser chrome can emit a resize every frame while native article
        // scrolling remains active. Update the lightweight sheet geometry now,
        // but coalesce the hidden ForceGraph backing-store allocation and camera
        // fit until that height stream has been quiet for one short interval.
        if (!flushMobileRender
          && !widthChanged
          && heightChanged
          && isMobileGraphContinuumStableReading()) {
          graphState.resizePending = false;
          deferMobileGraphRenderResize();
          return;
        }
        clearDeferredMobileGraphRenderResize();
      } else if (graphState.continuumRenderResizePending) {
        clearDeferredMobileGraphRenderResize();
      }

      graphState.resizePending = false;
      cancelGraphCameraTransition();
      settleGraphLayoutTransitionNodes();
      if (window.innerWidth > 768) flushPendingGraphData();
      const container = getEl('sidebar-graph-container');
      const canvasContainer = getEl('canvas-sidebar-graph');
      if (!container || !canvasContainer) return;
      if (isMobileGraphViewport() && isMobileGraphSidebarOverlayLeaseActive()) {
        const lease = graphState.sidebarOverlayLease;
        setMobileGraphExpansionProgress(0, false, 'sidebar');
        configureGraphPhysics(state.sidebarGraph, false);
        layoutMobileGraphSidebarOverlayPreview(lease);
        requestAnimationFrame(() => {
          if (resizeRevision !== graphState.resizeRevision
            || graphState.sidebarOverlayLease !== lease) return;
          layoutMobileGraphSidebarOverlayPreview(lease);
        });
        return;
      }
      if (isMobileGraphViewport()
        && !state.isGraphExpanded
        && state.graphPhase === 'small') {
        commitMobileSmallGraphPresentation({
          flushPendingData: false,
          surface: state.graphReturnSurface
        });
        return;
      }
      const continuumWasActive = isMobileGraphContinuumActive();
      syncExpandedGraphHostForViewport();
      const expandedSize = getExpandedGraphSize();
      if (isMobileGraphViewport() && !continuumWasActive) {
        setMobileGraphExpansionProgress(state.isGraphExpanded ? 1 : 0, false);
      }
      if (state.isGraphExpanded) {
        applyFixedGraphRect(container, {
          left: 0,
          top: window.innerWidth <= 768 ? 0 : 52,
          width: expandedSize.width,
          height: expandedSize.height
        });
        configureGraphPhysics(state.sidebarGraph, true);
      } else {
        configureGraphPhysics(state.sidebarGraph, false);
      }
      syncGraphRenderSize(state.sidebarGraph, expandedSize);

      // Backing-store changes can reset ForceGraph's transform. Reapply one
      // authoritative camera on the next paint, then restore mobile selection.
      requestAnimationFrame(() => {
        if (resizeRevision !== graphState.resizeRevision) return;
        if (state.graphPhase !== 'small' && state.graphPhase !== 'expanded') {
          graphState.resizePending = true;
          return;
        }
        fitGraphToViewport(state.sidebarGraph, 0, {
          size: state.isGraphExpanded ? expandedSize : getCurrentGraphViewportSize(),
          expansionProgress: state.isGraphExpanded ? 1 : 0
        });
        if (isMobileGraphContinuumActive()) updateMobileGraphContinuumProgress();
      });
    });
  }

  function scrollReaderToTop() {
    const continuum = getEl('mobile-graph-continuum');
    if (isMobileGraphContinuumActive() && continuum) {
      const article = getEl('mobile-graph-continuum-article');
      if (isMobileGraphContinuumStableReading() && article && article.scrollTop > 2) {
        article.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (continuum.classList.contains('has-article')) {
        if (article) article.scrollTop = 0;
        startMobileGraphContinuumSettle(0, 0);
      }
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function initGraphControls() {
    const expandBtn = getEl('btn-graph-expand');
    if (expandBtn) {
      const claimGraphMorphControl = (e) => {
        if (e) e.stopPropagation();
        cancelGraphCameraTransition();
        cancelMobileGraphFocusTransition();
      };
      expandBtn.addEventListener('pointerdown', claimGraphMorphControl);
      expandBtn.addEventListener('click', (e) => {
        claimGraphMorphControl(e);
        if (state.graphPhase !== 'small' && state.graphPhase !== 'expanded') return;
        if (isMobileGraphSidebarOverlayLeaseActive()) {
          expandMobileGraphSidebarOverlayLease();
          return;
        }
        toggleGraphExpand(state.graphPhase === 'small');
      });
    }

    const mobileGraphLauncher = getEl('btn-mobile-graph-launcher');
    if (mobileGraphLauncher) {
      mobileGraphLauncher.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isMobileGraphContinuumActive()) {
          const continuum = getEl('mobile-graph-continuum');
          if (continuum && continuum.classList.contains('has-article')) {
            // The persistent shortcut is a direct entry into the standalone
            // fullscreen explorer, not a request to park the current article as
            // a second-floor preview. Remove that floor state and return the
            // graph selection to its neutral presentation.
            hideMobileGraphContinuumArticle();
            graphState.hoverNode = null;
            transitionMobileGraphFocus(state.sidebarGraph, null, 220);
            return;
          }
          return;
        }
        closeMobileSidebar();
        toggleGraphExpand(true);
      });
    }

    const backToTopBtn = getEl('btn-back-to-top');
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', scrollReaderToTop);
    }

    // Click outside large window to close
    document.addEventListener('click', (e) => {
      if (!state.isGraphExpanded) return;
      if (isMobileGraphContinuumActive()) return;
      const container = getEl('sidebar-graph-container');
      if (container && !container.contains(e.target)) {
        toggleGraphExpand(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isGraphExpanded) {
        if (isMobileGraphSidebarOverlayLeaseActive()) {
          requestMobileSidebarState(false);
          return;
        }
        toggleGraphExpand(false);
      }
    });

    window.addEventListener('resize', scheduleGraphResizeSync, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', scheduleGraphResizeSync, { passive: true });
    }
    window.addEventListener('orientationchange', () => {
      setTimeout(scheduleGraphResizeSync, 150);
    }, { passive: true });

    if (window.ResizeObserver) {
      const slot = getEl('sidebar-graph-slot');
      if (slot) {
        const observer = new ResizeObserver(scheduleGraphResizeSync);
        observer.observe(slot);
      }
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

  function getEntityArticleModel(entityId) {
    if (!entityId) return null;
    const knowledgeIndex = getKnowledgeIndex();
    const resolvedEntityId = resolveEntityId(entityId, knowledgeIndex) || entityId;
    const foundNode = knowledgeIndex && knowledgeIndex.nodesById.get(resolvedEntityId);
    const label = foundNode ? foundNode.label : resolvedEntityId;
    const category = ((foundNode && foundNode.type) || 'Characters').replace(/s$/, '');
    const images = (window.WIKI_STORE && window.WIKI_STORE.images) || {};
    const imagePath = images[label] || images[resolvedEntityId] || images[entityId] || null;

    if (!window.__entityMdCache) window.__entityMdCache = new Map();
    const cacheKey = `${state.lang}_${resolvedEntityId}`;
    let html = window.__entityMdCache.get(cacheKey);
    if (html === undefined) {
      const articles = (window.WIKI_STORE && window.WIKI_STORE.articles) || {};
      let markdown = articles[label] || articles[resolvedEntityId] || articles[entityId];
      if (!markdown) {
        markdown = `## Overview\n\n**${label}** is a canonical entity in George Orwell's *Nineteen Eighty-Four*.\n\n## Narrative Significance\n\nDirectly interlinked with Winston Smith's psychological struggle, the surveillance apparatus of the Party, and the reality control of Ingsoc.`;
      }

      const cleanMarkdown = markdown
        .replace(/^#\s+[^\n]+\n*/, '')
        .replace(/>\s+\*\*分类\/标签\*\*:[^\n]*\n*/gi, '')
        .replace(/>\s+\*\*源文件\*\*:[^\n]*\n*/gi, '')
        .replace(/^---\s*\n*/gm, '')
        .replace(/^#\s+[^\n]+\n*/, '')
        .replace(/##\s+Related StoryFlow[\s\S]*$/i, '')
        .trim();
      html = window.marked && window.marked.parse
        ? window.marked.parse(cleanMarkdown)
        : `<p>${cleanMarkdown.replace(/\n\n/g, '</p><p>')}</p>`;
      window.__entityMdCache.set(cacheKey, html);
    }

    return {
      id: resolvedEntityId,
      label,
      category,
      imagePath,
      html
    };
  }

  function renderEntityArticleInto(model, targets) {
    if (!model || !targets) return false;
    if (targets.category) targets.category.textContent = model.category;
    if (targets.title) targets.title.textContent = model.label;
    if (targets.markdown) targets.markdown.innerHTML = model.html;

    if (targets.media && targets.image) {
      if (model.imagePath) {
        targets.image.src = model.imagePath;
        targets.image.alt = model.label;
        targets.media.style.display = 'block';
        targets.media.setAttribute('aria-hidden', 'false');
      } else {
        targets.image.removeAttribute('src');
        targets.image.alt = '';
        targets.media.style.display = 'none';
        targets.media.setAttribute('aria-hidden', 'true');
      }
    }
    return true;
  }

  function openEntityArticle(entityId, options = {}) {
    const model = getEntityArticleModel(entityId);
    if (!model) return;
    entityId = model.id;
    state.currentEntityId = model.id;

    // Reset global graph state to prevent ghost/orphaned nodes from dimming the new graph
    graphState.focusedNode = null;
    graphState.hoverNode = null;

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

    renderEntityArticleInto(model, {
      category: getEl('view-entity-cat'),
      title: getEl('view-entity-title'),
      media: getEl('view-entity-media'),
      image: getEl('view-entity-img'),
      markdown: getEl('view-entity-markdown')
    });

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

  function closeMobileSidebar(options = {}) {
    const sidebar = getEl('wiki-sidebar');
    const backdrop = getEl('sidebar-backdrop');
    const suppressTransition = options.animate === false;
    const lease = graphState.sidebarOverlayLease;
    const defersGraphRestore = Boolean(
      options.restoreGraphLease !== false
      && lease
      && sidebar
      && sidebar.classList.contains('is-open')
      && !suppressTransition
    );
    if (options.restoreGraphLease !== false && !defersGraphRestore) {
      // An atomic/no-motion close returns ownership before the same task hides
      // the drawer. Animated closes keep the Canvas inside until it is offscreen.
      finishMobileGraphSidebarOverlayLease();
    }
    if (sidebar) {
      if (suppressTransition) sidebar.classList.add('is-transition-suppressed');
      if (defersGraphRestore) sidebar.classList.add('is-closing');
      sidebar.classList.remove('is-open');
      if (suppressTransition) {
        // Commit the hidden state while the fullscreen graph still covers it,
        // then restore the drawer's normal transition for the next gesture.
        sidebar.getBoundingClientRect();
        requestAnimationFrame(() => sidebar.classList.remove('is-transition-suppressed'));
      }
      if (defersGraphRestore) {
        scheduleMobileGraphSidebarOverlayLeaseRestore(sidebar, lease);
      }
    }
    if (backdrop) {
      backdrop.classList.remove('is-visible');
    }
    if (isMobileGraphViewport() && !state.isGraphExpanded && state.graphPhase === 'small') {
      state.graphReturnSurface = 'article';
      setMobileGraphExpansionProgress(0, false);
    }
  }

  function openMobileSidebar(options = {}) {
    const sidebar = getEl('wiki-sidebar');
    const backdrop = getEl('sidebar-backdrop');
    const committedSmallGraph = commitMobileSmallGraphPresentation({
      flushPendingData: true,
      surface: 'sidebar'
    });
    if (!committedSmallGraph) flushPendingGraphData();
    if (sidebar) {
      // Acquire foreground graph ownership before the drawer becomes visible.
      // For ordinary articles/small graphs the invariant is inapplicable and
      // this is intentionally a no-op.
      beginMobileGraphSidebarOverlayLease();
      const suppressTransition = options.animate === false;
      if (suppressTransition) sidebar.classList.add('is-transition-suppressed');
      sidebar.classList.add('is-open');
      if (suppressTransition) {
        // Commit the final drawer geometry before the graph reads its target.
        sidebar.getBoundingClientRect();
        requestAnimationFrame(() => sidebar.classList.remove('is-transition-suppressed'));
      }
    }
    if (backdrop) backdrop.classList.add('is-visible');
    if (isMobileGraphViewport() && !state.isGraphExpanded && state.graphPhase === 'small') {
      state.graphReturnSurface = 'sidebar';
      setMobileGraphExpansionProgress(0, false);
    }
  }

  function requestMobileSidebarState(desiredOpen) {
    const execute = () => {
      const sidebar = getEl('wiki-sidebar');
      if (!sidebar || window.innerWidth > 1080) return Promise.resolve();

      // User intent must never mutate the drawer halfway through a graph-host
      // transfer. Replay the explicit desired state after the current transfer;
      // do not defer a toggle, because the transfer itself may open the drawer.
      const graphIsStable = state.graphPhase === 'small' || state.graphPhase === 'expanded';
      if (!graphIsStable) {
        return graphState.containerTransitionPromise.then(execute);
      }

      const isOpen = sidebar.classList.contains('is-open');
      if (desiredOpen) {
        if (isOpen) return Promise.resolve();
        if (isMobileGraphViewport() && state.graphPhase === 'expanded') {
          const continuum = getEl('mobile-graph-continuum');
          const canOverlayReadingSurface = continuum
            && continuum.classList.contains('has-article')
            && isMobileGraphContinuumStableReading();
          if (canOverlayReadingSurface) {
            // The second floor is a normal reading surface. Its header opens the
            // drawer above it, exactly like a normal article, and closing the
            // drawer returns to the same reading position. The drawer borrows
            // the one graph Canvas for its preview; it does not collapse the
            // graph or discard the article.
            openMobileSidebar();
            return Promise.resolve();
          }
          // The graph has one persistent canvas. Return it through the existing
          // viewport morph before the sidebar becomes the stable destination.
          return toggleGraphExpand(false, { destination: 'sidebar' });
        }
        openMobileSidebar();
      } else if (isOpen) {
        closeMobileSidebar();
      }
      return Promise.resolve();
    };

    return execute();
  }

  function toggleMobileSidebar() {
    const sidebar = getEl('wiki-sidebar');
    const isMobile = window.innerWidth <= 1080;
    if (sidebar) {
      if (isMobile) {
        return requestMobileSidebarState(!sidebar.classList.contains('is-open'));
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
      btnSidebarClose.addEventListener('click', () => requestMobileSidebarState(false));
    }

    const backdrop = getEl('sidebar-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => requestMobileSidebarState(false));
      backdrop.addEventListener('touchstart', () => requestMobileSidebarState(false), { passive: true });
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

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
