/**
 * Readipedia Pure Typographic Reader Controller
 * LibLib Detail Stage (Screenshot 1) + TapTV Grid (Screenshot 2)
 */

(function () {
  'use strict';

  const state = {
    theme: 'light',
    font: 'sans',
    lang: 'en',
    currentEntityId: null,
    currentStorylineIndex: 0,
    sidebarGraph: null,
    isGraphExpanded: false,
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

  function openBookOverview() {
    state.currentEntityId = null;
    clearActiveNav();
    const btnBook = getEl('btn-book-home');
    if (btnBook) btnBook.classList.add('active');
    initBalancedTopologyGraph(null);
    showArticleView('view-book');
  }

  /**
   * Navigation Hub: Direct Full-Page Switches for Book Overview, Storylines & StoryFlow
   */
  function initNavHubClicks() {
    const btnBook = getEl('btn-book-home');
    if (btnBook) {
      btnBook.addEventListener('click', (e) => {
        e.preventDefault();
        openBookOverview();
      });
    }

    const btnStorylines = getEl('btn-storylines-hub');
    if (btnStorylines) {
      btnStorylines.addEventListener('click', (e) => {
        e.preventDefault();
        state.currentEntityId = null;
        clearActiveNav();
        btnStorylines.classList.add('active');
        initBalancedTopologyGraph(null);
        showArticleView('view-storyline');
        setStorylineScene(state.currentStorylineIndex);
      });
    }

    const btnStoryflow = getEl('btn-storyflow-hub');
    if (btnStoryflow) {
      btnStoryflow.addEventListener('click', (e) => {
        e.preventDefault();
        state.currentEntityId = null;
        clearActiveNav();
        btnStoryflow.classList.add('active');
        initBalancedTopologyGraph(null);
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

    entContainer.addEventListener('click', (e) => {
      const target = e.target.closest('.entity-toc-link');
      if (!target) return;

      e.preventDefault();
      clearActiveNav();
      target.classList.add('active');

      const entityId = target.getAttribute('data-id');
      if (entityId) openEntityArticle(entityId);
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
    imgCache: new Map()
  };

  const categoryThemeColors = {
    Characters: { light: '#e11d48', dark: '#fb7185', sepia: '#b91c1c' },
    Locations: { light: '#059669', dark: '#34d399', sepia: '#047857' },
    Organizations: { light: '#4f46e5', dark: '#818cf8', sepia: '#4338ca' },
    Concepts: { light: '#7c3aed', dark: '#a78bfa', sepia: '#6d28d9' },
    Rules: { light: '#ea580c', dark: '#fb923c', sepia: '#c2410c' },
    Objects: { light: '#d97706', dark: '#fbbf24', sepia: '#b45309' },
    Events: { light: '#0284c7', dark: '#38bdf8', sepia: '#0369a1' },
    States: { light: '#0d9488', dark: '#2dd4bf', sepia: '#0f766e' },
    Expressions: { light: '#db2777', dark: '#f472b6', sepia: '#be185d' },
    Time: { light: '#64748b', dark: '#94a3b8', sepia: '#475569' }
  };

  function getCategoryColor(type) {
    const themeKey = state.theme === 'dark' ? 'dark' : (state.theme === 'sepia' ? 'sepia' : 'light');
    return (categoryThemeColors[type] && categoryThemeColors[type][themeKey]) || (state.theme === 'dark' ? '#60a5fa' : '#2563eb');
  }

  function buildGraphDataForEntity(entityId) {
    const subgraphs = (window.WIKI_STORE && window.WIKI_STORE.master && window.WIKI_STORE.master.knowledge_graph && window.WIKI_STORE.master.knowledge_graph.subgraphs) || {};
    
    // 1. Build map of all entities
    const allRawNodes = new Map();
    for (const [catName, catObj] of Object.entries(subgraphs)) {
      const nList = (catObj && catObj.value) || (Array.isArray(catObj) ? catObj : []);
      nList.forEach((n) => {
        allRawNodes.set(n.id, { ...n, category: catName });
        if (n.label) allRawNodes.set(n.label.toLowerCase(), { ...n, category: catName });
      });
    }

    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    const primaryRaw = entityId ? (allRawNodes.get(entityId) || allRawNodes.get(entityId.toLowerCase())) : null;

    if (primaryRaw) {
      // 1-Degree ONLY Mode: Primary Node + 1st Degree Direct Connections
      // Strictly anchor the primary node to (0, 0) to prevent center-of-mass drift!
      const primaryNode = createGraphNode(primaryRaw, primaryRaw.category, true, 0, 0);
      nodeMap.set(primaryRaw.id, primaryNode);
      nodes.push(primaryNode);

      // Add outgoing 1-degree targets
      if (primaryRaw.targets && Array.isArray(primaryRaw.targets)) {
        primaryRaw.targets.forEach((tId) => {
          const targetRaw = allRawNodes.get(tId);
          if (targetRaw && !nodeMap.has(targetRaw.id)) {
            const targetNode = createGraphNode(targetRaw, targetRaw.category, false);
            nodeMap.set(targetRaw.id, targetNode);
            nodes.push(targetNode);
          }
        });
      }

      // Add incoming 1-degree sources
      for (const [nId, rawN] of allRawNodes.entries()) {
        if (rawN.targets && Array.isArray(rawN.targets) && rawN.targets.includes(primaryRaw.id)) {
          if (!nodeMap.has(rawN.id)) {
            const srcNode = createGraphNode(rawN, rawN.category, false);
            nodeMap.set(rawN.id, srcNode);
            nodes.push(srcNode);
          }
        }
      }

      // Create strictly 1-degree links between primary node and all its 1-degree neighbors
      nodes.forEach((n) => {
        if (n.id !== primaryRaw.id) {
          links.push({ source: primaryRaw.id, target: n.id });
        }
      });
    } else {
      // Default Global Overview Backbone (~16 nodes) when on Book Overview
      const priorityCategories = {
        Characters: 5,
        Locations: 4,
        Organizations: 3,
        Concepts: 2,
        Objects: 2
      };
      let isFirst = true;
      Object.entries(priorityCategories).forEach(([catKey, limit]) => {
        const catObj = subgraphs[catKey];
        const cNodes = (catObj && catObj.value) || (Array.isArray(catObj) ? catObj : []);
        cNodes.slice(0, limit).forEach((n) => {
          if (!nodeMap.has(n.id)) {
            // Anchor central node at (0, 0) to strictly prevent center-of-mass vertical drift
            const nodeObj = createGraphNode(n, catKey, isFirst, isFirst ? 0 : undefined, isFirst ? 0 : undefined);
            if (isFirst) isFirst = false;
            nodeMap.set(n.id, nodeObj);
            nodes.push(nodeObj);
          }
        });
      });
      nodes.forEach((n) => {
        const rawN = allRawNodes.get(n.id);
        if (rawN && rawN.targets) {
          rawN.targets.forEach((tId) => {
            if (nodeMap.has(tId)) {
              links.push({ source: n.id, target: tId });
            }
          });
        }
      });
    }

    return { nodes, links, nodeMap };
  }

  function createGraphNode(raw, category, isPrimary, fx, fy) {
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
      type: category,
      imgSrc: localImg,
      isPrimary: !!isPrimary,
      val: isPrimary ? 8.5 : Math.max(4.5, Math.min(7, (raw.targets && raw.targets.length ? raw.targets.length : 1) * 0.5 + 4))
    };
    if (fx !== undefined) nodeObj.fx = fx;
    if (fy !== undefined) nodeObj.fy = fy;
    return nodeObj;
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
    const titleEl = getActiveTitleElement();
    if (!titleEl) return;

    if (hoveredNode) {
      if (!titleEl.dataset.defaultTitle) {
        titleEl.dataset.defaultTitle = titleEl.textContent;
      }
      titleEl.textContent = hoveredNode.label || hoveredNode.id;
      titleEl.classList.add('is-graph-hovering');
    } else {
      titleEl.classList.remove('is-graph-hovering');
      if (titleEl.dataset.defaultTitle) {
        titleEl.textContent = titleEl.dataset.defaultTitle;
        delete titleEl.dataset.defaultTitle;
      }
    }
  }

  function getExpandedGraphSize() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      // True 100% Fullscreen Mobile Explorer Mode (100vw × 100vh)
      return { width: window.innerWidth, height: window.innerHeight };
    }
    // Desktop: Top-Left quadrant = exactly 50% viewport width × 50% usable viewport height (below 52px header)
    // Area = 0.50 * 0.50 = 25% of total screen area, invariant across 1080p, 2K, 4K!
    const w = Math.round(window.innerWidth * 0.50);
    const h = Math.round((window.innerHeight - 52) * 0.50);
    return { width: w, height: h };
  }

  function applyDynamicGeometry(graph, isExp, canvasW, canvasH, duration = 0, isBookOverview = false) {
    const nodes = graph.graphData().nodes;
    const N = (nodes && nodes.length) || 1;
    
    // D3 link distance is 30. Spring force creates a stiff boundary.
    // Slightly relaxed baseline to add a perfect "breathing room" margin and guarantee no clipping.
    let predictedR = isExp ? 60 * Math.pow(N / 16, 0.36) : 45 * Math.pow(N / 16, 0.36);
    
    // BookOverview uses an arbitrary web topology (not a star graph).
    // It naturally stretches out much wider. We apply a 1.7x safety multiplier.
    if (isBookOverview) {
      predictedR *= 1.7;
    }
    
    // Generous padding to prevent label clipping and physics jiggle
    const padding = isExp ? 45 : 25; 
    
    const internalW = predictedR * 2 + padding * 2; 
    const internalH = predictedR * 2 + padding * 2;
    
    const zoomW = canvasW / internalW;
    const zoomH = canvasH / internalH;
    
    // This perfectly framing zoom will now optimally utilize exactly 80-85% of the screen!
    const targetZoom = Math.min(zoomW, zoomH);
    
    if (graph.zoom && graph.centerAt) {
      graph.centerAt(0, 0, duration); 
      graph.zoom(targetZoom, duration);     
    }
  }

  function initBalancedTopologyGraph(focusEntityId) {
    const container = getEl('canvas-sidebar-graph');
    if (!window.ForceGraph || !container) return;

    const isExp = state.isGraphExpanded;
    const expSize = getExpandedGraphSize();
    const width = isExp ? expSize.width : (container.clientWidth || 300);
    const height = isExp ? expSize.height : 145;

    const isDark = state.theme === 'dark';
    const isSepia = state.theme === 'sepia';

    const { nodes, links, nodeMap } = buildGraphDataForEntity(focusEntityId || state.currentEntityId);

    if (!state.sidebarGraph) {
      container.innerHTML = '';
      container.addEventListener('mouseleave', () => {
        graphState.hoverNode = null;
        updateGraphHUD(null);
      });

      const Graph = ForceGraph()(container)
        .width(width)
        .height(height)
        .backgroundColor('rgba(0,0,0,0)')
        .nodeId('id')
        .nodeVal('val')
        .nodeLabel(() => '')
        .linkCurvature(0.18)
        .linkWidth((link) => (link.source === state.currentEntityId || link.target === state.currentEntityId || graphState.hoverNode || graphState.focusedNode ? 1.8 : 0.8))
        .linkColor((link) => {
          if (graphState.focusedNode) {
            const fId = graphState.focusedNode.id;
            const isConnected = link.source === fId || link.target === fId || link.source.id === fId || link.target.id === fId;
            if (isConnected) {
              return isDark ? 'rgba(255,255,255,0.45)' : (isSepia ? 'rgba(45,38,30,0.45)' : 'rgba(0,0,0,0.35)');
            }
            return isDark ? 'rgba(255,255,255,0.02)' : (isSepia ? 'rgba(45,38,30,0.02)' : 'rgba(0,0,0,0.015)');
          }
          return isDark ? 'rgba(255,255,255,0.18)' : (isSepia ? 'rgba(45,38,30,0.18)' : 'rgba(0,0,0,0.12)');
        })
        .d3VelocityDecay(0.35)
        .onNodeHover((node) => {
          if (!graphState.focusedNode) {
            graphState.hoverNode = node || null;
            updateGraphHUD(node);
          }
        })
        .onNodeClick((node) => {
          if (!node || !node.id) return;
          if (graphState.focusedNode === node) {
            // Second click on focused node: navigate directly to article
            hideBoundlessInspector();
            graphState.focusedNode = null;
            if (state.isGraphExpanded) toggleGraphExpand(false);
            closeMobileSidebar();
            clearActiveNav();
            openEntityArticle(node.id);
            return;
          }

          // First click: Spotlight Focus + Boundless Text Unfold
          graphState.focusedNode = node;
          graphState.hoverNode = node;
          if (state.sidebarGraph && state.sidebarGraph.centerAt) {
            // Offset camera slightly down so node renders gracefully in upper half, leaving spacious room for title below
            const offsetY = state.isGraphExpanded ? 28 : 0;
            state.sidebarGraph.centerAt(node.x, node.y - offsetY, 350);
          }
          showBoundlessInspector(node);
        })
        .onBackgroundClick(() => {
          if (graphState.focusedNode) {
            graphState.focusedNode = null;
            graphState.hoverNode = null;
            hideBoundlessInspector();
            if (state.sidebarGraph && state.sidebarGraph.centerAt) {
              state.sidebarGraph.centerAt(0, 0, 350);
            }
          }
        })
        .nodePointerAreaPaint((node, color, ctx, globalScale) => {
          const isFocused = graphState.focusedNode === node;
          const isHovered = graphState.hoverNode === node || isFocused;
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
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI, false);
          ctx.fill();
        })
        .nodeCanvasObject((node, ctx, globalScale) => {
          const isFocused = graphState.focusedNode === node;
          const isHovered = graphState.hoverNode === node;
          const isPrimary = (state.currentEntityId === node.id) || node.isPrimary;
          
          let alpha = 1;
          if (graphState.focusedNode) {
            // Everything else blurs/dissolves deeply into a bokeh background
            alpha = isFocused ? 1 : 0.08;
          } else if (graphState.hoverNode) {
            alpha = (isPrimary || isHovered) ? 1 : 0.65;
          }

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
              ctx.drawImage(img, node.x - radius, node.y - radius, radius * 2, radius * 2);
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

      // Keep charge constant so large graphs can expand beautifully and spaciously!
      Graph.d3Force('charge').strength(isExp ? -160 : -60);

      Graph.graphData({ nodes, links });

      const cvsW = isExp ? expSize.width : (container.clientWidth || 300);
      const cvsH = isExp ? expSize.height : 145;
      applyDynamicGeometry(Graph, isExp, cvsW, cvsH, 0, !state.currentEntityId);

      if (!isExp) {
        setTimeout(() => {
          const data = Graph.graphData();
          if (data && data.nodes) cacheSmallLayout(focusEntityId || state.currentEntityId, data.nodes);
        }, 300);
      }

      state.sidebarGraph = Graph;
      state.graphNodeMap = nodeMap;
    } else {
      // Re-feed strictly 1-degree scoped data into existing instance
      state.sidebarGraph.graphData({ nodes, links });
      
      // Update charge for existing graph
      state.sidebarGraph.d3Force('charge').strength(isExp ? -160 : -60);
      
      const cvsW = isExp ? expSize.width : (container.clientWidth || 300);
      const cvsH = isExp ? expSize.height : 145;
      applyDynamicGeometry(state.sidebarGraph, isExp, cvsW, cvsH, 0, !state.currentEntityId);

      state.graphNodeMap = nodeMap;
      if (!isExp) {
        setTimeout(() => {
          const data = state.sidebarGraph ? state.sidebarGraph.graphData() : null;
          if (data && data.nodes) cacheSmallLayout(focusEntityId || state.currentEntityId, data.nodes);
        }, 300);
      }
    }

    updateGraphHUD(null);
  }

  const smallLayoutCache = new Map();

  function cacheSmallLayout(entityId, nodes) {
    if (!nodes || !nodes.length) return;
    const posMap = new Map();
    nodes.forEach((n) => {
      if (typeof n.x === 'number' && !isNaN(n.x) && typeof n.y === 'number' && !isNaN(n.y)) {
        posMap.set(n.id, { x: n.x, y: n.y });
      }
    });
    if (posMap.size > 0) {
      smallLayoutCache.set(entityId || '__default__', posMap);
    }
  }

  function restoreSmallLayout(entityId, nodes) {
    const key = entityId || '__default__';
    if (!smallLayoutCache.has(key)) return false;
    const posMap = smallLayoutCache.get(key);
    let count = 0;
    nodes.forEach((n) => {
      if (posMap.has(n.id)) {
        const p = posMap.get(n.id);
        n.x = p.x;
        n.y = p.y;
        n.vx = 0;
        n.vy = 0;
        count++;
      }
    });
    return count > 0;
  }

  let isGraphAnimating = false;

  function toggleGraphExpand(forceState) {
    const container = getEl('sidebar-graph-container');
    const slot = getEl('sidebar-graph-slot') || (container ? container.parentElement : null);
    if (!container || !state.sidebarGraph || isGraphAnimating || !slot) return;

    const targetState = typeof forceState === 'boolean' ? forceState : !state.isGraphExpanded;
    if (targetState === state.isGraphExpanded) return;

    state.isGraphExpanded = targetState;
    isGraphAnimating = true;

    const isMobile = window.innerWidth <= 768;
    const expSize = getExpandedGraphSize();

    if (state.isGraphExpanded) {
      // 1. SMALL -> BIG
      const currentSmallData = state.sidebarGraph.graphData();
      if (currentSmallData && currentSmallData.nodes) {
        cacheSmallLayout(state.currentEntityId, currentSmallData.nodes);
      }

      // Hide launcher FAB during expansion
      const launcher = getEl('btn-mobile-graph-launcher');
      if (launcher) {
        launcher.style.opacity = '0';
        launcher.style.pointerEvents = 'none';
      }

      if (isMobile) {
        // Teleport container to document.body on mobile to escape sidebar transform containing block
        document.body.appendChild(container);
        container.classList.add('is-expanded');
        container.style.position = 'fixed';
        container.style.inset = '0';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.zIndex = '500';
        container.style.margin = '0';
        container.style.background = 'var(--bg-page)';

        state.sidebarGraph.width(window.innerWidth).height(window.innerHeight);
        if (state.sidebarGraph.d3Force && state.sidebarGraph.d3Force('charge')) {
          state.sidebarGraph.d3Force('charge').strength(-160);
        }
        const { nodes, links, nodeMap } = buildGraphDataForEntity(state.currentEntityId);
        state.sidebarGraph.graphData({ nodes, links });
        state.graphNodeMap = nodeMap;
        applyDynamicGeometry(state.sidebarGraph, true, window.innerWidth, window.innerHeight, 0, !state.currentEntityId);

        isGraphAnimating = false;
      } else {
        // Desktop WAAPI 2D Morph
        const slotRect = slot.getBoundingClientRect();
        const bigRect = {
          left: 0,
          top: 52,
          width: expSize.width,
          height: expSize.height
        };

        container.style.position = 'fixed';
        container.style.left = `${slotRect.left}px`;
        container.style.top = `${slotRect.top}px`;
        container.style.width = `${slotRect.width}px`;
        container.style.height = `${slotRect.height}px`;
        container.style.margin = '0';
        container.style.zIndex = '100';
        container.classList.add('is-expanded');

        state.sidebarGraph.width(bigRect.width).height(bigRect.height);
        if (state.sidebarGraph.d3Force && state.sidebarGraph.d3Force('charge')) {
          state.sidebarGraph.d3Force('charge').strength(-160);
        }
        const { nodes, links, nodeMap } = buildGraphDataForEntity(state.currentEntityId);

        if (currentSmallData && currentSmallData.nodes) {
          const pMap = new Map();
          currentSmallData.nodes.forEach((n) => {
            if (typeof n.x === 'number') pMap.set(n.id, { x: n.x, y: n.y });
          });
          nodes.forEach((n) => {
            if (pMap.has(n.id)) {
              const p = pMap.get(n.id);
              n.x = p.x;
              n.y = p.y;
            }
          });
        }

        state.sidebarGraph.graphData({ nodes, links });
        state.graphNodeMap = nodeMap;

        applyDynamicGeometry(state.sidebarGraph, true, expSize.width, expSize.height, 300, !state.currentEntityId);

        const anim = container.animate([
          {
            left: `${slotRect.left}px`,
            top: `${slotRect.top}px`,
            width: `${slotRect.width}px`,
            height: `${slotRect.height}px`
          },
          {
            left: `${bigRect.left}px`,
            top: `${bigRect.top}px`,
            width: `${bigRect.width}px`,
            height: `${bigRect.height}px`
          }
        ], {
          duration: 300,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        });

        anim.onfinish = () => {
          container.style.left = `${bigRect.left}px`;
          container.style.top = `${bigRect.top}px`;
          container.style.width = `${bigRect.width}px`;
          container.style.height = `${bigRect.height}px`;
          anim.cancel();
          isGraphAnimating = false;
        };
      }
    } else {
      // 2. BIG -> SMALL
      if (isMobile) {
        // Return container back to slot on mobile
        slot.appendChild(container);
        container.classList.remove('is-expanded');
        container.style.position = '';
        container.style.inset = '';
        container.style.top = '';
        container.style.left = '';
        container.style.width = '';
        container.style.height = '';
        container.style.margin = '';
        container.style.zIndex = '';
        container.style.background = '';

        const smallWidth = slot.clientWidth || 268;
        const smallHeight = 145;
        if (state.sidebarGraph.d3Force && state.sidebarGraph.d3Force('charge')) {
          state.sidebarGraph.d3Force('charge').strength(-60);
        }
        const { nodes, links, nodeMap } = buildGraphDataForEntity(state.currentEntityId);
        restoreSmallLayout(state.currentEntityId, nodes);
        state.sidebarGraph.width(smallWidth).height(smallHeight);
        state.sidebarGraph.graphData({ nodes, links });
        state.graphNodeMap = nodeMap;
        applyDynamicGeometry(state.sidebarGraph, false, smallWidth, smallHeight, 0, !state.currentEntityId);

        const launcher = getEl('btn-mobile-graph-launcher');
        if (launcher) {
          launcher.style.opacity = '';
          launcher.style.pointerEvents = '';
        }
        hideBoundlessInspector();
        isGraphAnimating = false;
      } else {
        // Desktop WAAPI 2D Morph
        const currentRect = container.getBoundingClientRect();
        const targetSlotRect = slot.getBoundingClientRect();

        const smallWidth = targetSlotRect.width || 268;
        const smallHeight = targetSlotRect.height || 145;

        if (state.sidebarGraph.d3Force && state.sidebarGraph.d3Force('charge')) {
          state.sidebarGraph.d3Force('charge').strength(-60);
        }
        const { nodes, links, nodeMap } = buildGraphDataForEntity(state.currentEntityId);
        restoreSmallLayout(state.currentEntityId, nodes);
        state.sidebarGraph.width(smallWidth).height(smallHeight);
        state.sidebarGraph.graphData({ nodes, links });
        state.graphNodeMap = nodeMap;

        const containerW = slot.clientWidth || 300;
        applyDynamicGeometry(state.sidebarGraph, false, containerW, 145, 300, !state.currentEntityId);

        const anim = container.animate([
          {
            left: `${currentRect.left}px`,
            top: `${currentRect.top}px`,
            width: `${currentRect.width}px`,
            height: `${currentRect.height}px`
          },
          {
            left: `${targetSlotRect.left}px`,
            top: `${targetSlotRect.top}px`,
            width: `${targetSlotRect.width}px`,
            height: `${targetSlotRect.height}px`
          }
        ], {
          duration: 300,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        });

        anim.onfinish = () => {
          anim.cancel();
          container.classList.remove('is-expanded');
          container.style.position = '';
          container.style.left = '';
          container.style.top = '';
          container.style.width = '';
          container.style.height = '';
          container.style.margin = '';
          container.style.zIndex = '';
          const launcher = getEl('btn-mobile-graph-launcher');
          if (launcher) {
            launcher.style.opacity = '';
            launcher.style.pointerEvents = '';
          }
          hideBoundlessInspector();
          isGraphAnimating = false;
        };
      }
    }
  }

  function showBoundlessInspector(node) {
    const inspector = getEl('boundless-node-inspector');
    if (!inspector || !node) return;

    const title = getEl('boundless-title');
    if (title) {
      title.textContent = node.label || node.id;
    }

    const enterArticle = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      hideBoundlessInspector();
      graphState.focusedNode = null;
      if (state.isGraphExpanded) toggleGraphExpand(false);
      closeMobileSidebar();
      clearActiveNav();
      openEntityArticle(node.id);
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
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTrackingGlobal = false;

    // 1. Global Horizontal Swipe (Main Reading Area Left -> Right)
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
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
          closeMobileSidebar();
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
              hideBoundlessInspector();
              graphState.focusedNode = null;
              toggleGraphExpand(false);
              closeMobileSidebar();
              clearActiveNav();
              openEntityArticle(focusedId);
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
            hideBoundlessInspector();
            graphState.focusedNode = null;
            toggleGraphExpand(false);
            closeMobileSidebar();
            clearActiveNav();
            openEntityArticle(focusedId);
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
        if (!state.sidebarGraph) return;
        if (state.isGraphExpanded) {
          const expSize = getExpandedGraphSize();
          const container = getEl('sidebar-graph-container');
          if (container) {
            container.style.width = `${expSize.width}px`;
            container.style.height = `${expSize.height}px`;
          }
          state.sidebarGraph.width(expSize.width).height(expSize.height);
          applyDynamicGeometry(state.sidebarGraph, true, expSize.width, expSize.height, 0, !state.currentEntityId);
        } else {
          const slot = getEl('sidebar-graph-slot');
          const smallW = (slot && slot.clientWidth) || getEl('canvas-sidebar-graph')?.clientWidth || 268;
          state.sidebarGraph.width(smallW).height(145);
          applyDynamicGeometry(state.sidebarGraph, false, smallW, 145, 0, !state.currentEntityId);
        }
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 150);
    }, { passive: true });
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
      const h1 = v.querySelector('.article-h1, h1');
      if (h1) {
        delete h1.dataset.defaultTitle;
        h1.classList.remove('is-graph-hovering');
      }
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

    window.scrollTo({ top: 0, behavior: 'smooth' });
    initIcons();
    closeMobileSidebar();
  }

  function openEntityArticle(entityId) {
    state.currentEntityId = entityId;

    // Reset title hover caches
    const activeTitle = getActiveTitleElement();
    if (activeTitle) {
      delete activeTitle.dataset.defaultTitle;
      activeTitle.classList.remove('is-graph-hovering');
    }

    // Highlight and scroll matching TOC link
    document.querySelectorAll('.toc-item').forEach((i) => i.classList.remove('active'));
    const tocLink = document.querySelector(`.entity-toc-link[data-id="${entityId}"]`);
    if (tocLink) {
      tocLink.classList.add('active');
      const parentDetails = tocLink.closest('details');
      if (parentDetails) parentDetails.open = true;
      tocLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    initBalancedTopologyGraph(entityId);

    let foundNode = null;
    let foundCat = 'Characters';
    const subgraphs = (window.WIKI_STORE && window.WIKI_STORE.master && window.WIKI_STORE.master.knowledge_graph && window.WIKI_STORE.master.knowledge_graph.subgraphs) || {};

    for (const [catName, catObj] of Object.entries(subgraphs)) {
      const nList = (catObj && catObj.value) || (Array.isArray(catObj) ? catObj : []);
      const match = nList.find((n) => n.id === entityId || (n.label && n.label.toLowerCase() === entityId.toLowerCase()));
      if (match) {
        foundNode = match;
        foundCat = catName;
        break;
      }
    }

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
    if (state.sidebarGraph) initBalancedTopologyGraph();
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
          sidebar.classList.add('is-open');
          if (backdrop) backdrop.classList.add('is-visible');
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
