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
    const isMobile = isMobileGraphViewport();
    const isClosingExpandedMobileGraph = isMobile
      && (state.isGraphExpanded || state.graphPhase !== 'small');
    if (!isClosingExpandedMobileGraph) {
      graphState.focusedNode = null;
      graphState.hoverNode = null;
    } else {
      cancelMobileGraphFocusTransition();
    }
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
    resizeFrame: null,
    resizePending: false,
    containerTransitionPromise: Promise.resolve()
  };

  const DESKTOP_GRAPH_CLICK_SLOP_PX = 6;
  const MOBILE_GRAPH_TAP_SLOP_PX = 10;
  const MOBILE_GRAPH_FOCUS_DURATION_MS = 240;
  const MOBILE_GRAPH_FOCUS_SCALE = 1.5;
  const MOBILE_GRAPH_FOCUS_MIN_RADIUS_PX = 18;
  const MOBILE_GRAPH_FOCUS_MAX_RADIUS_PX = 30;
  const MOBILE_GRAPH_CONTROL_ICON_INSET_PX = 13;
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
      && state.graphPhase === 'expanded';
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

  function initGraphPointerIntent(container) {
    if (!container || graphState.pointerIntentBound) return;
    graphState.pointerIntentBound = true;

    container.addEventListener('pointerdown', (event) => {
      cancelGraphCameraTransition();
      const isDesktop = isDesktopExpandedGraphInteraction();
      const isMobile = isMobileExpandedGraphInteraction();
      if ((!isDesktop && !isMobile) || event.button !== 0 || event.isPrimary === false) return;
      if (isMobile) cancelMobileGraphFocusTransition();
      const graph = state.sidebarGraph;
      if (!graph) return;
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
        dragNodeId: null,
        platform: isMobile ? 'mobile' : 'desktop',
        clickSlopPx: isMobile ? MOBILE_GRAPH_TAP_SLOP_PX : DESKTOP_GRAPH_CLICK_SLOP_PX,
        snapshot: snapshotGraphNodes(graph),
        cancelled: false,
        handled: false
      };
    }, { passive: true });

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

    if (graphState.focusedNode && graphState.focusedNode.id === node.id) {
      await navigateFromGraphNode(node.id);
      return;
    }

    graphState.hoverNode = node;
    transitionMobileGraphFocus(state.sidebarGraph, node);
    showBoundlessInspector(node);
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
      && !graphState.layoutTransition;
    if (graph.enableZoomInteraction) graph.enableZoomInteraction(canInteract);
    if (graph.enablePanInteraction) graph.enablePanInteraction(canInteract);
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

  function cancelMobileGraphFocusTransition() {
    const transition = graphState.mobileFocusTransition;
    if (transition && transition.frameId) cancelAnimationFrame(transition.frameId);
    graphState.mobileFocusTransition = null;
  }

  function clearMobileGraphFocusVisuals() {
    cancelMobileGraphFocusTransition();
    graphState.mobileFocusWeights.clear();
    if (state.sidebarGraph && state.sidebarGraph.refresh) state.sidebarGraph.refresh();
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
    const focusRadiusPx = Math.max(
      baseRadiusPx,
      Math.min(
        MOBILE_GRAPH_FOCUS_MAX_RADIUS_PX,
        Math.max(MOBILE_GRAPH_FOCUS_MIN_RADIUS_PX, baseRadiusPx * MOBILE_GRAPH_FOCUS_SCALE)
      )
    );
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

  function getMobileGraphSafeRect(size) {
    const container = getEl('sidebar-graph-container');
    const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport ? visualViewport.offsetLeft : 0;
    const viewportTop = visualViewport ? visualViewport.offsetTop : 0;
    const visibleWidth = Math.min(size.width, visualViewport ? visualViewport.width : size.width);
    const visibleHeight = Math.min(size.height, visualViewport ? visualViewport.height : size.height);
    const localLeft = Math.max(0, viewportLeft - containerRect.left);
    const localTop = Math.max(0, viewportTop - containerRect.top);
    const horizontalInset = Math.max(36, Math.min(52, visibleWidth * 0.12));
    const topInset = Math.max(64, Math.min(96, visibleHeight * 0.10));
    const bottomInset = Math.max(88, Math.min(120, visibleHeight * 0.12));
    const inspector = getEl('boundless-node-inspector');
    const inspectorRect = inspector ? inspector.getBoundingClientRect() : null;
    const inspectorTop = inspectorRect && inspectorRect.height
      ? inspectorRect.top - containerRect.top
      : localTop + visibleHeight;
    const top = localTop + topInset;
    const bottom = Math.max(top, Math.min(
      localTop + visibleHeight - bottomInset,
      inspectorTop - 28
    ));
    return {
      left: localLeft + horizontalInset,
      right: localLeft + visibleWidth - horizontalInset,
      top,
      bottom
    };
  }

  function getMobileFocusSafeCamera(
    graph,
    baseCamera,
    isExpanded = state.isGraphExpanded,
    focusedNode = graphState.focusedNode
  ) {
    if (!isMobileGraphViewport()
      || !graph
      || !baseCamera
      || !focusedNode
      || !isExpanded) return baseCamera;
    const home = graphState.activeTargetPositions.get(focusedNode.id) || focusedNode;
    if (!Number.isFinite(home.x) || !Number.isFinite(home.y)) return baseCamera;
    const size = getCurrentGraphViewportSize();
    const safeRect = getMobileGraphSafeRect(size);
    const zoom = Math.max(0.01, baseCamera.zoom || 1);
    const screenX = (home.x - baseCamera.x) * zoom + size.width / 2;
    const screenY = (home.y - baseCamera.y) * zoom + size.height / 2;
    const safeX = Math.max(safeRect.left, Math.min(safeRect.right, screenX));
    const safeY = Math.max(safeRect.top, Math.min(safeRect.bottom, screenY));
    if (Math.abs(safeX - screenX) < 0.5 && Math.abs(safeY - screenY) < 0.5) return baseCamera;
    return {
      x: home.x - (safeX - size.width / 2) / zoom,
      y: home.y - (safeY - size.height / 2) / zoom,
      zoom
    };
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
    const focusBaseCamera = nextNode && startCamera ? startCamera : fittedCamera;
    const targetCamera = nextNode
      ? getMobileFocusSafeCamera(graph, focusBaseCamera, state.isGraphExpanded, nextNode)
      : fittedCamera;
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
      if (graph.refresh) graph.refresh();
    };

    if (reducedMotion || duration <= 0) {
      apply(1);
      graphState.mobileFocusWeights.clear();
      if (nextNode) graphState.mobileFocusWeights.set(nextNode.id, 1);
      return true;
    }

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

  function ensureMobileFocusedGraphNodeVisible(duration = 0) {
    const graph = state.sidebarGraph;
    const node = graphState.focusedNode;
    if (!isMobileGraphViewport() || !state.isGraphExpanded || !graph || !node) return false;
    const camera = getCurrentGraphCamera(graph);
    if (!camera) return false;
    animateGraphCamera(graph, getMobileFocusSafeCamera(graph, camera), duration);
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
      applyGraphCamera(graph, getMobileFocusSafeCamera(graph, fitCamera, toExpansion === 1));
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
        const targetCamera = getMobileFocusSafeCamera(graph, fitCamera, toExpansion === 1);
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

  function applyGraphData(graph, graphData, animate = true) {
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
      getCurrentGraphViewportSize(),
      state.isGraphExpanded ? 1 : 0,
      graphData.layout && graphData.layout.targetPositions
    );
    transitionGraphToLayout(graph, graphData.layout, camera, transitionDuration);
  }

  function initBalancedTopologyGraph(focusEntityId, options = {}) {
    const container = getEl('canvas-sidebar-graph');
    if (!window.ForceGraph || !container) return;

    const renderSize = getExpandedGraphSize();
    syncGraphRenderSize(null, renderSize);
    // The outgoing frame is only the animation source. Destination geometry is
    // computed solely from that destination's data and never learned from it.
    const visiblePose = captureVisibleGraphPose();
    const graphData = buildGraphDataForEntity(focusEntityId || state.currentEntityId, visiblePose);

    if (!state.sidebarGraph) {
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
        .onBackgroundClick(() => {
          const isMobileDevice = window.innerWidth <= 768;
          if (graphState.focusedNode) {
            graphState.hoverNode = null;
            if (isMobileDevice) {
              hideBoundlessInspector();
              transitionMobileGraphFocus(Graph, null, 220);
            } else {
              graphState.focusedNode = null;
              fitGraphToViewport(Graph, 260);
            }
          }
        })
        .nodePointerAreaPaint((node, color, ctx, globalScale) => {
          const scale = globalScale || (state.sidebarGraph ? state.sidebarGraph.zoom() : 1) || 1;
          if (isMobileGraphViewport()) {
            const visualRadiusPx = getMobileRenderedNodeRadiusPx(node, scale);
            const minimumHitRadiusPx = state.isGraphExpanded ? 24 : 22;
            const hitRadiusPx = Math.min(34, Math.max(minimumHitRadiusPx, visualRadiusPx + 3));
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
      applyGraphData(Graph, graphData, false);
    } else {
      syncGraphRenderSize(state.sidebarGraph, renderSize);
      applyGraphData(state.sidebarGraph, graphData, options.animate !== false);
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

  function getMobileGraphControlExpandedInsets(launcher, control) {
    if (!launcher) return { right: 17, bottom: 17 };
    const rect = launcher.getBoundingClientRect();
    const controlRect = control ? control.getBoundingClientRect() : null;
    const halfControl = controlRect && controlRect.width ? controlRect.width / 2 : 24;
    return {
      right: Math.max(0, window.innerWidth - (rect.left + rect.width / 2) - halfControl),
      bottom: Math.max(0, window.innerHeight - (rect.top + rect.height / 2) - halfControl)
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

  function setMobileGraphExpansionProgress(progress, transitioning = false) {
    if (!isMobileGraphViewport()) return;
    const normalized = Math.max(0, Math.min(1, progress));
    const container = getEl('sidebar-graph-container');
    const expandButton = getEl('btn-graph-expand');
    const launcher = getEl('btn-mobile-graph-launcher');
    if (!container) return;

    graphState.mobileExpansionProgress = normalized;
    const returnsToArticle = state.graphReturnSurface === 'article';
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
    const inspectorProgress = Math.max(0, Math.min(1, (normalized - 0.45) / 0.55));
    container.style.setProperty('--mobile-graph-expansion-progress', String(normalized));
    container.style.setProperty('--mobile-graph-control-right', `${controlRight}px`);
    container.style.setProperty('--mobile-graph-control-bottom', `${controlBottom}px`);
    container.style.setProperty('--mobile-graph-control-opacity', String(controlOpacity));
    container.style.setProperty('--mobile-graph-control-glyph-inset', `${glyphInset}px`);
    container.style.setProperty('--mobile-inspector-opacity', String(inspectorProgress));
    container.style.setProperty('--mobile-inspector-shift', `${16 * (1 - inspectorProgress)}px`);
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
      launcher.classList.toggle('is-graph-morphing', transitioning);
      launcher.style.opacity = String(returnsToArticle ? 0.85 * (1 - launcherHandoff) : 0);
      launcher.style.pointerEvents = isStableSmall && returnsToArticle ? '' : 'none';
    }
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
      // Window morphing owns the camera. Finish only the current node geometry
      // first so page-layout and viewport-layout animations can never compete.
      cancelGraphCameraTransition();
      settleGraphLayoutTransitionNodes();
      if (targetState && isMobile) flushPendingGraphData();
      const startRect = container.getBoundingClientRect();
      const sidebar = getEl('wiki-sidebar');
      if (targetState && isMobile) {
        state.graphReturnSurface = sidebar && sidebar.classList.contains('is-open') ? 'sidebar' : 'article';
      }
      state.isGraphExpanded = targetState;

      if (targetState) {
        state.graphPhase = 'expanding';
        if (isMobile) {
          setMobileGraphExpansionProgress(0, true);
        } else if (launcher) {
          launcher.style.opacity = '0';
          launcher.style.pointerEvents = 'none';
        }

        const expandedSize = getExpandedGraphSize();
        syncGraphRenderSize(state.sidebarGraph, expandedSize);
        const getExpandedTarget = () => {
          const size = getExpandedGraphSize();
          return {
            left: 0,
            top: window.innerWidth <= 768 ? 0 : 52,
            width: size.width,
            height: size.height
          };
        };
        document.body.appendChild(container);
        const openedFromMobileSidebar = isMobile && state.graphReturnSurface === 'sidebar';
        if (!openedFromMobileSidebar) closeMobileSidebar();
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
        if (isMobile) setMobileGraphExpansionProgress(1, false);
        configureGraphPhysics(state.sidebarGraph, true);
      } else {
        state.graphPhase = 'collapsing';
        if (isMobile) {
          cancelMobileGraphFocusTransition();
          setMobileGraphExpansionProgress(1, true);
        } else {
          graphState.focusedNode = null;
          graphState.hoverNode = null;
          hideBoundlessInspector();
        }
        const returnsToArticleLauncher = isMobile && state.graphReturnSurface === 'article' && launcher;
        if (isMobile && state.graphReturnSurface === 'sidebar') {
          if (!sidebar || !sidebar.classList.contains('is-open')) openMobileSidebar();
        } else if (returnsToArticleLauncher && sidebar && sidebar.classList.contains('is-open')) {
          closeMobileSidebar({ animate: false });
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
          transitionDuration,
          0,
          isMobile ? (progress) => setMobileGraphExpansionProgress(progress, true) : null
        );

        if (isMobile) {
          graphState.focusedNode = null;
          graphState.hoverNode = null;
          clearMobileGraphFocusVisuals();
          hideBoundlessInspector();
          setMobileGraphExpansionProgress(0, false);
        }
        slot.appendChild(container);
        container.classList.remove('is-expanded');
        document.body.classList.remove('graph-is-expanded');
        resetGraphContainerStyles(container);
        state.graphPhase = 'small';
        if (launcher) {
          launcher.classList.remove('is-graph-morphing');
          launcher.style.opacity = '';
          launcher.style.pointerEvents = '';
        }
        // The launcher-origin preview collapses into an article-only control.
        // Once it is offscreen, prepare the sidebar camera for its next reveal.
        if (returnsToArticleLauncher) {
          const slotRect = getGraphSlotContentRect(slot);
          fitGraphToViewport(state.sidebarGraph, 0, {
            size: { width: slotRect.width || 268, height: slotRect.height || 145 },
            expansionProgress: 0
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
    hideBoundlessInspector();
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
    state.graphReturnSurface = 'article';
    if (collapseGraph && (state.isGraphExpanded || state.graphPhase !== 'small')) {
      await toggleGraphExpand(false, { duration: isMobile ? 180 : 420 });
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
      const suppressUntil = Number(inspector.dataset.suppressClickUntil || 0);
      if (suppressUntil) delete inspector.dataset.suppressClickUntil;
      if (performance.now() < suppressUntil) {
        return;
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
          // This swipe owns the gesture. Ignore only the compatibility click
          // that some touch browsers synthesize after touchend.
          boundlessInspector.dataset.suppressClickUntil = String(performance.now() + 600);
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

  function scheduleGraphResizeSync() {
    if (graphState.resizeFrame) cancelAnimationFrame(graphState.resizeFrame);
    graphState.resizeFrame = requestAnimationFrame(() => {
      graphState.resizeFrame = null;
      if (!state.sidebarGraph) return;
      if (state.graphPhase !== 'small' && state.graphPhase !== 'expanded') {
        graphState.resizePending = true;
        return;
      }

      graphState.resizePending = false;
      cancelGraphCameraTransition();
      settleGraphLayoutTransitionNodes();
      if (window.innerWidth > 768) flushPendingGraphData();
      const container = getEl('sidebar-graph-container');
      const canvasContainer = getEl('canvas-sidebar-graph');
      if (!container || !canvasContainer) return;
      const expandedSize = getExpandedGraphSize();
      if (isMobileGraphViewport()) {
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
        if (state.graphPhase !== 'small' && state.graphPhase !== 'expanded') {
          graphState.resizePending = true;
          return;
        }
        fitGraphToViewport(state.sidebarGraph, 0, {
          size: state.isGraphExpanded ? expandedSize : getCurrentGraphViewportSize(),
          expansionProgress: state.isGraphExpanded ? 1 : 0
        });
        ensureMobileFocusedGraphNodeVisible(0);
      });
    });
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
        toggleGraphExpand(state.graphPhase === 'small');
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

    window.addEventListener('resize', scheduleGraphResizeSync, { passive: true });
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

  function closeMobileSidebar(options = {}) {
    const sidebar = getEl('wiki-sidebar');
    const backdrop = getEl('sidebar-backdrop');
    if (sidebar) {
      const suppressTransition = options.animate === false;
      if (suppressTransition) sidebar.classList.add('is-transition-suppressed');
      sidebar.classList.remove('is-open');
      if (suppressTransition) {
        // Commit the hidden state while the fullscreen graph still covers it,
        // then restore the drawer's normal transition for the next gesture.
        sidebar.getBoundingClientRect();
        requestAnimationFrame(() => sidebar.classList.remove('is-transition-suppressed'));
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

  function openMobileSidebar() {
    const sidebar = getEl('wiki-sidebar');
    const backdrop = getEl('sidebar-backdrop');
    flushPendingGraphData();
    if (sidebar) sidebar.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-visible');
    if (isMobileGraphViewport() && !state.isGraphExpanded && state.graphPhase === 'small') {
      state.graphReturnSurface = 'sidebar';
      setMobileGraphExpansionProgress(0, false);
    }
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
