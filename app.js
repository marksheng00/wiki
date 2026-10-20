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
    graphContext: null,
    isGraphExpanded: false,
    graphPhase: 'small',
    graphReturnSurface: 'article',
  };

  function getEl(id) {
    return document.getElementById(id);
  }

  /* Motion tokens live in style.css (:root). JS reads them instead of keeping
     its own numbers, so CSS and scripted motion always agree, and both drop
     to zero under prefers-reduced-motion. */
  // Every getter takes the full custom property name, e.g. motion.ms('--panel-open-dur').
  const motion = {
    raw(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    },
    ms(name) {
      const value = this.raw(name);
      const amount = parseFloat(value) || 0;
      return value.endsWith('ms') ? amount : (value.endsWith('s') ? amount * 1000 : amount);
    },
    ease(name) {
      return this.raw(name) || 'ease-out';
    },
    px(name) {
      return parseFloat(this.raw(name)) || 0;
    },
    number(name, fallback = 0) {
      const value = parseFloat(this.raw(name));
      return Number.isFinite(value) ? value : fallback;
    }
  };

  // JS-driven motion (graph camera, morphs, layout changes) follows the same
  // smooth-out curve as CSS, read from --ease-smooth-out.
  function createCubicBezier(x1, y1, x2, y2) {
    const ax = 3 * x1 - 3 * x2 + 1;
    const bx = 3 * x2 - 6 * x1;
    const cx = 3 * x1;
    const ay = 3 * y1 - 3 * y2 + 1;
    const by = 3 * y2 - 6 * y1;
    const cy = 3 * y1;
    const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t) => ((ay * t + by) * t + cy) * t;
    const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i += 1) {
        const error = sampleX(t) - x;
        if (Math.abs(error) < 1e-6) break;
        const slope = slopeX(t);
        if (Math.abs(slope) < 1e-6) break;
        t -= error / slope;
      }
      if (t < 0 || t > 1 || Math.abs(sampleX(t) - x) > 1e-4) {
        let lo = 0;
        let hi = 1;
        t = x;
        for (let i = 0; i < 30; i += 1) {
          if (sampleX(t) < x) lo = t; else hi = t;
          t = (lo + hi) / 2;
        }
      }
      return sampleY(t);
    };
  }

  let smoothOutEase = null;
  function easeSmoothOut(linear) {
    if (!smoothOutEase) {
      const match = motion.raw('--ease-smooth-out').match(/cubic-bezier\(([^)]+)\)/);
      const points = match ? match[1].split(',').map(Number) : [0.22, 1, 0.36, 1];
      smoothOutEase = createCubicBezier(...points);
    }
    return smoothOutEase(linear);
  }

  function scrollBehavior() {
    return prefersReducedMotion() ? 'auto' : 'smooth';
  }

  function canAnimate(el) {
    return Boolean(el && typeof el.animate === 'function' && !prefersReducedMotion());
  }

  /* Language. Every interface string is written in English in the page;
     ZH_UI maps it to Chinese. Book, storyline, storyflow and entity-name
     text comes from WIKI_STORE_ZH. Entity articles exist only in English. */
  const ZH_UI = {
    'Skip to content': '跳到正文',
    'Hide sidebar': '收起侧边栏',
    'Show sidebar': '展开侧边栏',
    'Readipedia home': 'Readipedia 首页',
    'Readify apps': 'Readify 应用',
    'Download': '下载',
    'Desktop': '桌面端',
    'Apple silicon and Intel': 'Apple 芯片与 Intel',
    'Windows 10 and later': 'Windows 10 及以上',
    'Mobile': '移动端',
    'iPhone and iPad': 'iPhone 和 iPad',
    'Phones and tablets': '手机和平板',
    'Browser': '浏览器',
    'Extension': '浏览器扩展',
    'Chrome and Edge': 'Chrome 和 Edge',
    'Web app': '网页版',
    'Nothing to install': '无需安装',
    'QR code for the Readify app': 'Readify 应用二维码',
    'On your phone?': '在手机上读？',
    'Scan to get Readify for iOS or Android.': '扫码获取 iOS 或 Android 版 Readify。',
    'Search (Ctrl K)': '搜索 (Ctrl K)',
    'Search': '搜索',
    'Open Readify': '打开 Readify',
    'Download for Mac': '下载 Mac 版',
    'Download for Windows': '下载 Windows 版',
    'Get the app': '下载 App',
    'Switch language': '切换语言',
    'Toggle theme': '切换主题',
    'Open menu': '打开菜单',
    'Close menu': '关闭菜单',
    'Expand graph': '展开图谱',
    'Close graph explorer': '关闭图谱',
    'Return to Knowledge Graph': '返回知识图谱',
    'Open Knowledge Graph': '打开知识图谱',
    'Return to article': '返回词条',
    'Book': '书籍',
    'Overview': '概览',
    'On this page': '本页目录',
    'Introduction': '作品概览',
    'Plot': '情节梗概',
    'Themes': '核心主题',
    'Legacy': '背景与影响',
    'Author': '作者',
    'Storylines': '故事线',
    'StoryFlow': '故事视角',
    'Entities': '词条',
    'Characters': '人物',
    'Locations': '地点',
    'Organizations': '组织',
    'Objects': '物件',
    'Creatures': '生物',
    'Events': '事件',
    'Actions': '行动',
    'Concepts': '概念',
    'Rules': '规则',
    'Time': '时间',
    'States': '超级大国',
    'Expressions': '名言',
    'Get Readify': '获取 Readify',
    'This device': '当前设备',
    'Browser extension': '浏览器扩展',
    'Nineteen Eighty-Four': '一九八四',
    'Nineteen Eighty-Four original cover': '《一九八四》初版封面',
    'George Orwell': '乔治·奥威尔',
    'Country': '国家',
    'United Kingdom': '英国',
    'Language': '原文语言',
    'English': '英语',
    'Genre': '类型',
    'Dystopian, Satire': '反乌托邦、讽刺',
    'Published': '出版',
    '8 June 1949': '1949年6月8日',
    'Read the book in Readify': '在 Readify 阅读本书',
    'Background and Legacy': '写作背景与影响',
    'About the Author': '关于作者',
    'George Orwell (Eric Arthur Blair, 1903 – 1950)': '乔治·奥威尔（埃里克·亚瑟·布莱尔，1903 – 1950）',
    'Previous entry': '上一个词条',
    'Next entry': '下一个词条',
    'Entity visual still': '词条配图',
    'Back to Nineteen Eighty-Four': '返回《一九八四》',
    '89 scenes, from Victory Mansions to the Chestnut Tree Café.': '89 个场景，从胜利大厦一路走到栗树咖啡馆。',
    'Previous scenes': '上一组场景',
    'Next scenes': '下一组场景',
    'Three threads through the novel, each told as one path.': '贯穿全书的三条线索，每条都是一段完整的路径。',
    'Read the book as a living encyclopedia.': '把一本书读成一部活的百科。',
    'Apps': '应用',
    'Read the original': '阅读原著',
    'Back to top': '回到顶部',
    'Search entries and pages...': '搜索词条和页面…',
    'No results': '没有结果',
    'Pages': '页面',
    'Entries': '词条',
    'Summary': '摘要',
    '89 scenes': '89 个场景',
    'Three threads': '三条线索',
    'Settings': '设置',
    'Site language': '界面语言',
    'Theme': '外观',
    'Light': '浅色',
    'Dark': '深色'
  };
  const LANG_KEY = 'readipedia-lang';
  const zhStore = () => window.WIKI_STORE_ZH || null;
  const isZh = () => state.lang === 'zh';

  function t(text) {
    return isZh() && ZH_UI[text] ? ZH_UI[text] : text;
  }

  // Display name of a graph entity in the current language. node.label stays
  // the English key used by articles, images and links.
  function entityName(id, fallback) {
    if (isZh()) {
      const zh = zhStore()?.graph_labels?.[id];
      if (zh) return zh;
    }
    if (fallback) return fallback;
    const node = getKnowledgeIndex()?.nodesById.get(id);
    return node?.label || id;
  }

  function storylineAt(index) {
    const evt = window.WIKI_STORE?.master?.storylines?.[index];
    if (!evt || !isZh()) return evt;
    const zh = zhStore()?.storylines?.find((s) => s.index === evt.index);
    if (!zh) return evt;
    // The scraped Chinese text stops mid-sentence, like the English excerpts.
    const desc = /[。！？”’…]$/.test(zh.description) ? zh.description : `${zh.description}……`;
    return { ...evt, date: zh.date, title: zh.title, description: desc };
  }

  function readStoredLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === 'en' || saved === 'zh') return saved;
    } catch (e) { /* storage blocked */ }
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^zh\b/i.test(nav) ? 'zh' : 'en';
  }

  // Swap static interface text in place. The English original of each text
  // node and attribute is remembered, so switching back needs no table.
  const i18nText = new WeakMap();
  const i18nAttr = new WeakMap();
  const I18N_SKIP = '#lang-dropdown, .prose, .reading-section > h2, .entity-toc-link, #entity-toc, .filmstrip-thumb, .storyflow-editorial-row, #cmdk-list, #storyline-hero-date, #storyline-hero-title, #view-entity-title, #mobile-continuum-title, script, style';
  const I18N_ATTRS = ['aria-label', 'title', 'alt', 'placeholder'];

  function swapString(current, record) {
    const en = record && current === record.zh ? record.en : current;
    const zh = ZH_UI[en];
    return { en, zh, value: isZh() && zh ? zh : en };
  }

  function translateStatic(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return node.parentElement?.closest(I18N_SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const raw = node.nodeValue;
      const trimmed = raw.trim();
      const res = swapString(trimmed, i18nText.get(node));
      if (!res.zh) return;
      i18nText.set(node, { en: res.en, zh: res.zh });
      if (res.value !== trimmed) node.nodeValue = raw.replace(trimmed, res.value);
    });
    root.querySelectorAll(I18N_ATTRS.map((a) => `[${a}]`).join(',')).forEach((el) => {
      if (el.closest(I18N_SKIP)) return;
      let records = i18nAttr.get(el);
      if (!records) { records = {}; i18nAttr.set(el, records); }
      I18N_ATTRS.forEach((attr) => {
        const current = el.getAttribute(attr);
        if (!current) return;
        const res = swapString(current, records[attr]);
        if (!res.zh) return;
        records[attr] = { en: res.en, zh: res.zh };
        if (res.value !== current) el.setAttribute(attr, res.value);
      });
    });
  }

  function translateEntityLinks() {
    document.querySelectorAll('.entity-toc-link[data-id]').forEach((link) => {
      if (!link.dataset.en) link.dataset.en = link.textContent.trim();
      link.textContent = entityName(link.dataset.id, link.dataset.en);
    });
  }

  function translateStoryflowCards() {
    const flows = window.WIKI_STORE?.master?.storyflows || [];
    const zhFlows = zhStore()?.storyflows || {};
    document.querySelectorAll('.storyflow-editorial-row').forEach((row, i) => {
      const flow = flows[i];
      const title = row.querySelector('.storyflow-row-title');
      const desc = row.querySelector('.storyflow-row-desc');
      const img = row.querySelector('img');
      const link = row.querySelector('.card-copy');
      if (!title || !desc) return;
      if (!row.dataset.enTitle) {
        row.dataset.enTitle = title.textContent;
        row.dataset.enDesc = desc.textContent;
      }
      const zh = isZh() && flow ? zhFlows[flow.id] : null;
      const name = zh ? zh.title : row.dataset.enTitle;
      title.textContent = name;
      desc.textContent = zh ? zh.description : row.dataset.enDesc;
      if (img) img.alt = name;
      if (link) link.setAttribute('aria-label', zh ? `查看「${name}」` : `Explore ${name}`);
    });
  }

  function translateFilmstrip() {
    document.querySelectorAll('.filmstrip-thumb[data-idx]').forEach((thumb) => {
      const evt = storylineAt(parseInt(thumb.dataset.idx, 10));
      if (!evt) return;
      thumb.title = evt.title;
      const img = thumb.querySelector('img');
      if (img) img.alt = evt.title;
    });
  }

  function applyLanguage(options = {}) {
    const zh = isZh();
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
    document.title = zh ? '一九八四 — Readipedia' : 'Nineteen Eighty-Four — Readipedia';
    const langLabel = getEl('lang-current-label');
    if (langLabel) langLabel.textContent = zh ? '中文' : 'EN';
    document.querySelectorAll('[data-set-lang]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.setLang === state.lang));
    });
    document.querySelectorAll('#lang-dropdown .wiki-dropdown-item').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-lang') === state.lang);
    });

    translateStatic();
    translateEntityLinks();
    translateStoryflowCards();
    translateFilmstrip();
    renderBookArticle();
    if (zh && !window.WIKI_ARTICLES_ZH) ensureZhArticles();
    if (options.initial) return;

    setStorylineScene(state.currentStorylineIndex, { force: true });
    if (state.currentEntityId && getEl('view-entity')?.style.display !== 'none') {
      const model = getEntityArticleModel(state.currentEntityId);
      if (model) renderEntityPage(model);
    }
    if (graphState.continuumEntityId) {
      const model = getEntityArticleModel(graphState.continuumEntityId);
      if (model) {
        renderEntityArticleInto(model, {
          title: getEl('mobile-continuum-title'),
          media: getEl('mobile-continuum-media'),
          image: getEl('mobile-continuum-image'),
          markdown: getEl('mobile-continuum-markdown')
        });
      }
    }
    if (getEl('view-book')?.style.display !== 'none') getEl('book-toc')?.__sync?.(true);
    document.dispatchEvent(new CustomEvent('readipedia:lang'));
  }

  // Chinese entity articles are a large file, fetched only once Chinese is on.
  let zhArticlesPromise = null;
  function ensureZhArticles() {
    if (window.WIKI_ARTICLES_ZH) return Promise.resolve(true);
    if (!zhArticlesPromise) {
      zhArticlesPromise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = './data/wiki_articles_zh.js?v=1';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      }).then((ok) => {
        if (ok) {
          window.__entityMdCache?.clear();
          if (isZh()) applyLanguage({ articlesOnly: true });
        }
        return ok;
      });
    }
    return zhArticlesPromise;
  }

  function setLanguage(lang) {
    if (lang === state.lang) return;
    state.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* storage blocked */ }
    applyLanguage();
  }

  function init() {
    state.lang = readStoredLang();
    renderBookArticle();
    initGraphControls();
    initNavHubClicks();
    initTOCEntityClicks();
    initStorylineTheater();
    initHeaderControls();
    initIcons();
    initDetailsAnimation();
    initMobileGraphContinuum();
    initMobileGestures();
    const initialRoute = getRouteFromHash();
    initNavHistory(initialRoute);
    initEntityMentionInteractions();
    initEntityPreview();
    initImageReveals();
    initBackToTopVisibility();
    initEntityArrows();
    initBookToc();
    initSearchPalette();
    initFooterLinks();
    initReadifyCtas();
    initReadifyApps();
    initEntityBackLink();
    initDrawerSettings();
    applyLanguage({ initial: true });

    // A view id in the URL is also an element id; keep the browser from
    // jumping to it, so every page opens at its title.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.addEventListener('load', () => {
      if (/^#view-/.test(location.hash)) window.scrollTo({ top: 0, behavior: 'instant' });
    }, { once: true });

    // A fresh visit lands on the book overview; a refresh restores the page in the URL.
    if (initialRoute.type === 'view') {
      initBalancedTopologyGraph(createGraphContext('overview'));
      showArticleView(initialRoute.id, { fromHistory: true });
    } else if (initialRoute.type === 'entity') {
      initBalancedTopologyGraph(createGraphContext('entity', initialRoute.id), { animate: false });
      openEntityArticle(initialRoute.id, { fromHistory: true, animateGraph: false });
    } else {
      openBookOverview({ fromHistory: true });
    }
  }

  /* Interface icons, drawn on a 16px grid with a 1.5px line so they stay
     crisp at the 14 to 18px sizes the site uses. Any icon not listed here
     (the logo's book) still comes from Lucide. */
  const UI_ICONS = {
      "search": "<circle cx=\"7.25\" cy=\"7.25\" r=\"4.5\"/><path d=\"M10.5 10.5 13.25 13.25\"/>",
      "x": "<path d=\"M4.25 4.25 11.75 11.75M11.75 4.25 4.25 11.75\"/>",
      "menu": "<rect x=\"2\" y=\"2.75\" width=\"12\" height=\"10.5\" rx=\"2.25\"/><path d=\"M6.25 2.75v10.5\"/>",
      "equal": "<path d=\"M3 6h10M3 10h10\"/>",
      "chevron-down": "<path d=\"M4.75 6.25 8 9.5l3.25-3.25\"/>",
      "chevron-left": "<path d=\"M9.75 4.75 6.5 8l3.25 3.25\"/>",
      "chevron-right": "<path d=\"M6.25 4.75 9.5 8l-3.25 3.25\"/>",
      "arrow-right": "<path d=\"M3.25 8h9.5M8.75 4l4 4-4 4\"/>",
      "arrow-left": "<path d=\"M12.75 8h-9.5M7.25 4l-4 4 4 4\"/>",
      "arrow-up": "<path d=\"M8 12.75v-9.5M4 7.25l4-4 4 4\"/>",
      "arrow-up-right": "<path d=\"M4.75 11.25 11.25 4.75M5.75 4.75h5.5v5.5\"/>",
      "arrow-down-to-line": "<path d=\"M8 2.75v7.25M4.75 6.75 8 10l3.25-3.25M3.25 13.25h9.5\"/>",
      "sun": "<circle cx=\"8\" cy=\"8\" r=\"2.75\"/><path d=\"M8 1.75V3M8 13v1.25M1.75 8H3M13 8h1.25M3.58 3.58l.88.88M11.54 11.54l.88.88M3.58 12.42l.88-.88M11.54 4.46l.88-.88\"/>",
      "moon": "<path d=\"M13.25 9.75A5.5 5.5 0 1 1 6.25 2.75a4.25 4.25 0 0 0 7 7Z\"/>",
      "languages": "<path d=\"M2.25 4h6.5M5.5 2.5V4M7.5 4c-.55 2.5-2.25 4.5-4.75 5.75M3.75 6.25c.85 1.5 2.15 2.65 3.75 3.4M8.5 13.5l2.5-6 2.5 6M9.3 11.6h3.4\"/>",
      "globe": "<circle cx=\"8\" cy=\"8\" r=\"6.25\"/><path d=\"M1.75 8h12.5M8 1.75c1.6 1.75 2.4 3.85 2.4 6.25S9.6 12.5 8 14.25C6.4 12.5 5.6 10.4 5.6 8S6.4 3.5 8 1.75Z\"/>",
      "book-open": "<path d=\"M8 4.5C6.85 3.55 5.1 3 2.75 3v9.5c2.35 0 4.1.55 5.25 1.5 1.15-.95 2.9-1.5 5.25-1.5V3C10.9 3 9.15 3.55 8 4.5Zm0 0V14\"/>",
      "network": "<circle cx=\"8\" cy=\"3.75\" r=\"1.75\"/><circle cx=\"3.75\" cy=\"12.25\" r=\"1.75\"/><circle cx=\"12.25\" cy=\"12.25\" r=\"1.75\"/><path d=\"M7.2 5.3 4.6 10.7M8.8 5.3l2.6 5.4M5.5 12.25h5\"/>",
      "film": "<rect x=\"2.75\" y=\"2.75\" width=\"10.5\" height=\"10.5\" rx=\"2\"/><path d=\"M5.5 2.75v10.5M10.5 2.75v10.5M2.75 8h2.75M10.5 8h2.75\"/>",
      "route": "<circle cx=\"4\" cy=\"12\" r=\"1.75\"/><circle cx=\"12\" cy=\"4\" r=\"1.75\"/><path d=\"M5.75 12H10a2 2 0 0 0 0-4H6a2 2 0 0 1 0-4h4.25\"/>",
      "shapes": "<path d=\"M4 2.25h5.25L12 5v8.75H4Z\"/><path d=\"M9.25 2.25V5H12M6.25 8.25h3.5M6.25 10.75h3.5\"/>"
  };

  function renderIcons(root = document) {
    root.querySelectorAll('i[data-lucide]').forEach((el) => {
      const name = el.getAttribute('data-lucide');
      const body = UI_ICONS[name];
      if (!body) return;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name !== 'data-lucide') svg.setAttribute(attr.name, attr.value);
      });
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.5');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true');
      svg.classList.add('lucide', 'ui-icon', `ui-icon-${name}`);
      svg.innerHTML = body;
      el.replaceWith(svg);
    });
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  function initIcons() {
    renderIcons();
  }

  function initDetailsAnimation() {
    const detailsEls = document.querySelectorAll('details.toc-group, details.toc-cat-details');
    // The Entities group is a fixed heading: clicking it never folds the list.
    const entitiesGroup = getEl('grp-entities');
    entitiesGroup?.querySelector('summary')?.addEventListener('click', (e) => e.preventDefault());
    detailsEls.forEach(details => {
      if (details === entitiesGroup) return;
      const summary = details.querySelector('summary');
      const content = details.querySelector('.toc-items, .toc-cat-list');
      if (!summary || !content) return;

      let isAnimating = false;
      details.dataset.expanded = details.hasAttribute('open') ? 'true' : 'false';

      // Accordion (transitions.dev): height plus a 2px cross-blur on the list,
      // opening slower than it closes.
      summary.addEventListener('click', (e) => {
        e.preventDefault();
        if (isAnimating) return;

        const closing = details.hasAttribute('open');
        details.dataset.expanded = closing ? 'false' : 'true';
        if (!closing) details.setAttribute('open', '');
        if (!canAnimate(content)) {
          if (closing) details.removeAttribute('open');
          return;
        }
        isAnimating = true;
        const blur = `blur(${motion.px('--blur-small')}px)`;
        const shown = { height: content.offsetHeight + 'px', opacity: 1, filter: 'blur(0px)', overflow: 'hidden' };
        const hidden = { height: '0px', opacity: 0, filter: blur, overflow: 'hidden' };
        const animation = content.animate(closing ? [shown, hidden] : [hidden, shown], {
          duration: motion.ms(closing ? '--acc-collapse' : '--acc-expand'),
          easing: motion.ease('--acc-ease'),
          fill: 'forwards'
        });
        animation.onfinish = () => {
          if (closing) details.removeAttribute('open');
          animation.cancel();
          isAnimating = false;
        };
      });
    });
  }

  function renderBookArticle() {
    const master = window.WIKI_STORE?.master;
    if (!master) return;
    const { article: art, author } = master;
    const paragraphs = (list) => list.map((p) => `<p>${p}</p>`).join('');
    const fill = (id, ready, render) => {
      const el = getEl(id);
      if (el && ready) el.innerHTML = render();
    };

    const h1 = getEl('article-h1');
    if (h1) h1.textContent = t('Nineteen Eighty-Four');
    const headings = { 'sec-overview': 'Overview', 'sec-plot': 'Plot', 'sec-themes': 'Themes', 'sec-background': 'Background and Legacy', 'sec-author': 'About the Author' };
    const zhBook = isZh() ? zhStore() : null;
    Object.entries(headings).forEach(([id, en], i) => {
      const h2 = document.querySelector(`#${id} > h2`);
      if (!h2) return;
      h2.textContent = zhBook ? (zhBook.book.sections[i]?.title || t(en)) : en;
    });
    if (zhBook) {
      const sections = zhBook.book.sections;
      const ids = ['text-overview', 'text-plot', 'text-themes', 'text-background'];
      ids.forEach((id, i) => fill(id, sections[i], () => paragraphs(sections[i].paragraphs)));
      fill('text-author', zhBook.author?.sections, () => zhBook.author.sections
        .map((s) => `<h3>${s.title}</h3>${paragraphs(s.paragraphs)}`)
        .join(''));
      return;
    }
    fill('text-overview', art.overview, () => `<p>${art.overview.content}</p>`);
    fill('text-plot', art.plot?.paragraphs, () => paragraphs(art.plot.paragraphs));
    fill('text-themes', art.themes, () => `<p>${art.themes.content}</p>`);
    fill('text-background', art.background_and_legacy?.paragraphs, () => paragraphs(art.background_and_legacy.paragraphs));
    fill('text-author', author?.sections, () => author.sections
      .map(
        (s) => `
        <h3>${s.title}</h3>
        <p>${s.content}</p>
      `
      )
      .join(''));
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
          : graphMs(isMobileGraphViewport() ? 180 : 420),
        destination: isSidebarNavigation ? 'sidebar' : 'article'
      });
    }
  }

  function clearEntityFocus() {
    state.currentEntityId = null;
    graphState.continuumEntityId = null;
    graphState.focusedNode = null;
    graphState.hoverNode = null;
    graphState.mobileFocusWeights.clear();
  }

  // Apply the overview graph immediately, discarding any deferred page graph.
  function showOverviewGraphNow() {
    const overviewContext = createGraphContext('overview');
    state.graphContext = overviewContext;
    graphState.pendingGraphContext = null;
    graphState.hasPendingData = false;
    graphState.pendingGraphData = null;
    initBalancedTopologyGraph(overviewContext, { animate: false });
  }

  async function openBookOverview(options = {}) {
    await prepareForPageNavigation();
    if (isMobileGraphViewport()) {
      deactivateMobileGraphContinuum();
    }
    clearEntityFocus();
    clearActiveNav();
    const btnBook = getEl('btn-book-home');
    if (btnBook) btnBook.classList.add('active');

    showOverviewGraphNow();

    showArticleView('view-book', options);
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
        scheduleGraphForPage(createGraphContext('overview'));
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
        scheduleGraphForPage(createGraphContext('overview'));
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
      const indicator = document.createElement('div');
      indicator.className = 'filmstrip-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      track.appendChild(indicator);
      track.addEventListener('click', (e) => {
        const thumb = e.target.closest('.filmstrip-thumb');
        const idx = thumb ? parseInt(thumb.getAttribute('data-idx'), 10) : NaN;
        if (!isNaN(idx)) setStorylineScene(idx);
      });
    }

    [['btn-filmstrip-prev', -320], ['btn-filmstrip-next', 320]].forEach(([id, left]) => {
      const btn = getEl(id);
      if (btn && track) btn.addEventListener('click', () => track.scrollBy({ left, behavior: scrollBehavior() }));
    });

    const scrollBox = getEl('liblib-narrative-scrollbox');
    if (scrollBox) {
      scrollBox.addEventListener('scroll', () => {
        scrollBox.classList[scrollBox.scrollTop > 8 ? 'add' : 'remove']('scrolled');
      }, { passive: true });
    }

    // Keyboard Arrow navigation for Storylines Theater
    window.addEventListener('keydown', (e) => {
      const viewStoryline = getEl('view-storyline');
      const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (viewStoryline?.style.display !== 'none' && step) {
        const total = getStorylinesTotal();
        setStorylineScene((state.currentStorylineIndex + step + total) % total);
      }
    });
  }

  function renderMarkdown(text) {
    return window.marked?.parse ? window.marked.parse(text) : `<p>${text.replace(/\n\n/g, '</p><p>')}</p>`;
  }

  function getStorylinesTotal() {
    const list = window.WIKI_STORE?.master?.storylines || [];
    return list.length || 89;
  }

  function setStorylineScene(index, options = {}) {
    const evt = storylineAt(index);
    if (!evt) return;

    const sceneChanged = index !== state.currentStorylineIndex || Boolean(options.force);
    state.currentStorylineIndex = index;

    const dateEl = getEl('storyline-hero-date');
    if (dateEl && evt.date) {
      const capDate = isZh() ? evt.date : evt.date.charAt(0).toUpperCase() + evt.date.slice(1);
      dateEl.textContent = capDate;
    }

    const imgEl = getEl('storyline-hero-img');
    if (imgEl) {
      if (imgEl.getAttribute('src') !== evt.local_image) imgEl.src = evt.local_image;
      imgEl.alt = evt.title;
      revealImage(imgEl);
    }

    const titleEl = getEl('storyline-hero-title');
    if (titleEl) titleEl.textContent = evt.title;

    const descEl = getEl('storyline-hero-desc');
    if (descEl) descEl.innerHTML = renderMarkdown(evt.description || '');

    // Reset internal narrative scrollbox position to top
    const scrollBox = getEl('liblib-narrative-scrollbox');
    if (scrollBox) scrollBox.scrollTop = 0;

    // Highlight active thumbnail and scroll into view
    const thumbs = document.querySelectorAll('.filmstrip-thumb');
    let activeThumb = null;
    thumbs.forEach((t) => {
      const isActive = parseInt(t.getAttribute('data-idx'), 10) === index;
      t.classList[isActive ? 'add' : 'remove']('active');
      if (isActive) activeThumb = t;
    });
    if (activeThumb) {
      // Scroll only the strip; scrollIntoView would also move the page.
      const track = getEl('liblib-filmstrip-track');
      if (track && track.clientWidth) {
        const left = activeThumb.offsetLeft - (track.clientWidth - activeThumb.offsetWidth) / 2;
        track.scrollTo({ left, behavior: scrollBehavior() });
      }
    }
    moveFilmstripIndicator(activeThumb);

    if (sceneChanged) {
      // A picture already in cache swaps instantly; give it the same soft
      // cross-blur a freshly loaded one gets from revealImage.
      if (imgEl && imgEl.dataset.reveal !== 'pending') playSoftSwap([imgEl]);
      playTextsReveal([dateEl, titleEl, descEl]);
    }
  }

  // Sliding indicator (transitions.dev tabs pattern) under the active thumb.
  function moveFilmstripIndicator(thumb) {
    const indicator = document.querySelector('.filmstrip-indicator');
    if (!indicator || !thumb || !thumb.offsetWidth) return;
    const firstPlacement = !indicator.dataset.placed;
    if (firstPlacement) indicator.classList.add('is-snapping');
    indicator.style.setProperty('--indicator-x', `${thumb.offsetLeft}px`);
    indicator.style.setProperty('--indicator-w', `${thumb.offsetWidth}px`);
    if (firstPlacement) {
      void indicator.offsetWidth;
      indicator.classList.remove('is-snapping');
      indicator.dataset.placed = 'true';
    }
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
    pendingGraphContext: null,
    pendingGraphData: null,
    pendingGraphBuildRevision: 0,
    hasPendingData: false,
    layoutCache: new Map(),
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

  const DESKTOP_GRAPH_CLICK_SLOP_PX = 9;
  const MOBILE_GRAPH_TAP_SLOP_PX = 10;
  const MOBILE_GRAPH_FOCUS_DURATION_MS = 240;
  const MOBILE_GRAPH_FOCUS_SCALE = 1.75;
  const MOBILE_GRAPH_FOCUS_MIN_GROWTH_PX = 10;
  const MOBILE_GRAPH_FOCUS_MAX_GROWTH_PX = 22;
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
    },
    // Upward-pointing Chevron indicating folding/sliding back up to the article floor
    chevronUp: {
      first: [6, 14, 12, 8],
      second: [12, 8, 18, 14],
      strokeWidth: 2.0
    }
  };
  const GRAPH_HOST_STATE_CLASSES = [
    'is-expanded',
    'is-sidebar-handoff',
    'is-sidebar-overlay-preview',
    'is-continuum-obscured',
    'is-viewport-transitioning'
  ];
  const CONTINUUM_ARTICLE_CLASSES = ['has-article', 'is-article-ready', 'is-article-resting', 'is-settling', 'is-tracking'];
  const GRAPH_NODE_HOME_STIFFNESS = 140;
  const GRAPH_LINK_SPRING_STIFFNESS = 55;
  const GRAPH_NODE_SPRING_DAMPING = 22;
  const GRAPH_NODE_MAX_RELEASE_SPEED = 900;

  const categoryThemeColors = {
    Characters: { light: '#e11d48', dark: '#fb7185' },
    Locations: { light: '#059669', dark: '#34d399' },
    Organizations: { light: '#4f46e5', dark: '#818cf8' },
    Concepts: { light: '#7c3aed', dark: '#a78bfa' },
    Rules: { light: '#ea580c', dark: '#fb923c' },
    Objects: { light: '#d97706', dark: '#fbbf24' },
    Events: { light: '#0284c7', dark: '#38bdf8' },
    Actions: { light: '#2563eb', dark: '#60a5fa' },
    Creatures: { light: '#9333ea', dark: '#c084fc' },
    States: { light: '#0d9488', dark: '#2dd4bf' },
    Expressions: { light: '#db2777', dark: '#f472b6' },
    Time: { light: '#64748b', dark: '#94a3b8' }
  };

  function getCategoryColor(type) {
    const isDark = state.theme === 'dark';
    return categoryThemeColors[type]?.[isDark ? 'dark' : 'light'] || (isDark ? '#60a5fa' : '#2563eb');
  }

  function getKnowledgeIndex() {
    const source = window.WIKI_STORE?.master?.knowledge_graph;
    if (!source) return null;
    if (graphState.knowledgeIndex?.source === source) {
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
        const list = categoryView?.value || (Array.isArray(categoryView) ? categoryView : []);
        list.forEach((node) => {
          if (!node || !node.id || nodesById.has(node.id)) return;
          nodesById.set(node.id, { ...node, type: node.type || 'Concepts' });
          if (node.label) labelToId.set(node.label.toLowerCase(), node.id);
        });
      });
    }

    const neighbors = new Map(Array.from(nodesById.keys(), (id) => [id, new Set()]));

    const undirectedEdgeMap = new Map();
    const sourceEdges = Array.isArray(source.all_edges) && source.all_edges.length
      ? source.all_edges
      : Array.from(nodesById.values()).flatMap((node) =>
          (node.targets || []).map((target) => ({ source: node.id, target }))
        );

    sourceEdges.forEach((edge) => {
      const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
      const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
      if (!nodesById.has(sourceId) || !nodesById.has(targetId) || sourceId === targetId) return;
      const undirectedKey = canonicalGraphEdgeKey(sourceId, targetId);
      if (!undirectedEdgeMap.has(undirectedKey)) {
        const [leftId, rightId] = compareStableText(sourceId, targetId) <= 0
          ? [sourceId, targetId]
          : [targetId, sourceId];
        undirectedEdgeMap.set(undirectedKey, { source: leftId, target: rightId });
      }
      neighbors.get(sourceId).add(targetId);
      neighbors.get(targetId).add(sourceId);
    });

    const degree = new Map(Array.from(neighbors, ([id, ids]) => [id, ids.size]));
    const undirectedEdges = Array.from(undirectedEdgeMap.values()).sort((left, right) => (
      compareStableText(
        canonicalGraphEdgeKey(left.source, left.target),
        canonicalGraphEdgeKey(right.source, right.target)
      )
    ));
    const coreNumber = computeGraphCoreNumbers(neighbors);

    graphState.knowledgeIndex = {
      source,
      nodesById,
      labelToId,
      undirectedEdges,
      neighbors,
      degree,
      coreNumber
    };
    return graphState.knowledgeIndex;
  }

  function resolveEntityId(entityId, index) {
    if (!entityId || !index) return null;
    if (index.nodesById.has(entityId)) return entityId;
    return index.labelToId.get(String(entityId).toLowerCase()) || null;
  }

  const GRAPH_LAYOUT_REVISION = 2;
  const GRAPH_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

  function compareStableText(left, right) {
    const leftText = String(left || '');
    const rightText = String(right || '');
    if (leftText === rightText) return 0;
    return leftText < rightText ? -1 : 1;
  }

  function hashGraphText(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function graphHashUnit(value) {
    return hashGraphText(value) / 4294967296;
  }

  function canonicalGraphEdgeKey(sourceId, targetId) {
    return compareStableText(sourceId, targetId) <= 0
      ? `${sourceId}\u0000${targetId}`
      : `${targetId}\u0000${sourceId}`;
  }

  function computeGraphCoreNumbers(neighbors) {
    const remaining = new Set(neighbors.keys());
    const liveDegree = new Map();
    const coreNumber = new Map();
    neighbors.forEach((values, id) => liveDegree.set(id, values.size));
    let currentCore = 0;

    while (remaining.size) {
      let nextId = null;
      remaining.forEach((id) => {
        if (nextId === null
          || liveDegree.get(id) < liveDegree.get(nextId)
          || (liveDegree.get(id) === liveDegree.get(nextId) && compareStableText(id, nextId) < 0)) {
          nextId = id;
        }
      });
      currentCore = Math.max(currentCore, liveDegree.get(nextId) || 0);
      coreNumber.set(nextId, currentCore);
      remaining.delete(nextId);
      (neighbors.get(nextId) || []).forEach((neighborId) => {
        if (remaining.has(neighborId)) {
          liveDegree.set(neighborId, Math.max(0, (liveDegree.get(neighborId) || 0) - 1));
        }
      });
    }
    return coreNumber;
  }

  function getGraphEnvironmentBudget() {
    const mobile = isMobileGraphViewport();
    const size = getExpandedGraphSize(mobile);
    const usableWidth = Math.max(1, size.width - 48);
    const usableHeight = Math.max(1, size.height - 64);
    const area = usableWidth * usableHeight;
    const cellSize = mobile ? 76 : 60;
    const nodeCap = Math.max(1, Math.min(
      Math.floor(area / (cellSize * cellSize)),
      mobile ? 64 : 96
    ));
    const edgeCap = Math.max(0, Math.min(
      Math.floor(area / (mobile ? 2500 : 1600)),
      Math.floor(nodeCap * (mobile ? 2.25 : 3)),
      mobile ? 144 : 288
    ));
    return {
      environment: mobile ? 'mobile' : 'desktop',
      width: size.width,
      height: size.height,
      nodeCap,
      edgeCap
    };
  }

  function createGraphContext(mode, rootId = null, overrides = {}) {
    const normalizedMode = mode === 'entity' ? 'entity' : 'overview';
    return {
      mode: normalizedMode,
      rootId: normalizedMode === 'entity' ? rootId : null,
      nodeSetId: overrides.nodeSetId || null,
      layoutRevision: GRAPH_LAYOUT_REVISION,
      budget: overrides.budget || getGraphEnvironmentBudget()
    };
  }

  function countInducedGraphEdges(index, selectedSet) {
    let count = 0;
    index.undirectedEdges.forEach((edge) => {
      if (selectedSet.has(edge.source) && selectedSet.has(edge.target)) count += 1;
    });
    return count;
  }

  function countSelectedGraphNeighbors(index, id, selectedSet) {
    let count = 0;
    (index.neighbors.get(id) || []).forEach((neighborId) => {
      if (selectedSet.has(neighborId)) count += 1;
    });
    return count;
  }

  function getStableGraphNodeOrder(index, ids) {
    return Array.from(ids).sort((leftId, rightId) => {
      const left = index.nodesById.get(leftId);
      const right = index.nodesById.get(rightId);
      const labelDelta = compareStableText(left?.label, right?.label);
      return labelDelta || compareStableText(leftId, rightId);
    });
  }

  function selectOverviewGraphNodes(index, budget) {
    const allIds = getStableGraphNodeOrder(index, index.nodesById.keys());
    const completeSet = new Set(allIds);
    if (allIds.length <= budget.nodeCap
      && countInducedGraphEdges(index, completeSet) <= budget.edgeCap) return allIds;

    const selected = new Set();
    const covered = new Set();
    let selectedEdgeCount = 0;
    while (selected.size < budget.nodeCap) {
      let best = null;
      allIds.forEach((id) => {
        if (selected.has(id)) return;
        const adjacentToSelection = !selected.size
          || Array.from(index.neighbors.get(id) || []).some((neighborId) => selected.has(neighborId));
        if (!adjacentToSelection) return;

        const addedEdges = countSelectedGraphNeighbors(index, id, selected);
        if (selectedEdgeCount + addedEdges > budget.edgeCap) return;
        const closedNeighborhood = new Set([id, ...(index.neighbors.get(id) || [])]);
        let coverageGain = 0;
        closedNeighborhood.forEach((candidateId) => {
          if (!covered.has(candidateId)) coverageGain += 1;
        });
        const candidate = {
          id,
          coverageGain,
          addedEdges,
          core: index.coreNumber.get(id) || 0,
          degree: index.degree.get(id) || 0
        };
        if (!best
          || candidate.coverageGain > best.coverageGain
          || (candidate.coverageGain === best.coverageGain && candidate.core > best.core)
          || (candidate.coverageGain === best.coverageGain && candidate.core === best.core && candidate.degree > best.degree)
          || (candidate.coverageGain === best.coverageGain && candidate.core === best.core && candidate.degree === best.degree
            && compareStableText(candidate.id, best.id) < 0)) {
          best = candidate;
        }
      });
      if (!best) break;
      selected.add(best.id);
      selectedEdgeCount += best.addedEdges;
      covered.add(best.id);
      (index.neighbors.get(best.id) || []).forEach((id) => covered.add(id));
    }
    return getStableGraphNodeOrder(index, selected);
  }

  function selectEntityGraphNodes(index, rootId, budget) {
    const neighborIds = Array.from(index.neighbors.get(rootId) || []);
    const fullSet = new Set([rootId, ...neighborIds]);
    if (fullSet.size <= budget.nodeCap
      && countInducedGraphEdges(index, fullSet) <= budget.edgeCap) {
      return [rootId, ...getStableGraphNodeOrder(index, neighborIds)];
    }

    const localDegree = new Map();
    fullSet.forEach((id) => {
      let degree = 0;
      (index.neighbors.get(id) || []).forEach((neighborId) => {
        if (fullSet.has(neighborId)) degree += 1;
      });
      localDegree.set(id, degree);
    });
    const rankedNeighbors = neighborIds.sort((leftId, rightId) => {
      const localDelta = (localDegree.get(rightId) || 0) - (localDegree.get(leftId) || 0);
      if (localDelta) return localDelta;
      const coreDelta = (index.coreNumber.get(rightId) || 0) - (index.coreNumber.get(leftId) || 0);
      if (coreDelta) return coreDelta;
      const degreeDelta = (index.degree.get(rightId) || 0) - (index.degree.get(leftId) || 0);
      if (degreeDelta) return degreeDelta;
      const left = index.nodesById.get(leftId);
      const right = index.nodesById.get(rightId);
      const labelDelta = compareStableText(left?.label, right?.label);
      return labelDelta || compareStableText(leftId, rightId);
    });

    const selected = new Set([rootId]);
    let selectedEdgeCount = 0;
    rankedNeighbors.some((id) => {
      if (selected.size >= budget.nodeCap) return true;
      const addedEdges = countSelectedGraphNeighbors(index, id, selected);
      if (selectedEdgeCount + addedEdges <= budget.edgeCap) {
        selected.add(id);
        selectedEdgeCount += addedEdges;
      }
      return false;
    });
    return [rootId, ...getStableGraphNodeOrder(index, Array.from(selected).filter((id) => id !== rootId))];
  }

  function getGraphNodeValue(isPrimary, degree) {
    const ordinary = Math.max(4.4, Math.min(6.8, 4.35 + Math.log2(2 + degree) * 0.42));
    return isPrimary ? Math.max(7.2, ordinary * 1.12) : ordinary;
  }

  function solveDeterministicOrganicLayout(context, selectedIds, edgePairs, nodeRadiusById) {
    if (!selectedIds.length) return new Map();
    const cacheKey = `${context.mode}|${context.rootId || ''}|${context.nodeSetId}|${context.layoutRevision}`;
    const cached = graphState.layoutCache.get(cacheKey);
    if (cached) return new Map(Array.from(cached, ([id, point]) => [id, { ...point }]));

    const orderedIds = Array.from(selectedIds).sort((leftId, rightId) => {
      const hashDelta = hashGraphText(`${cacheKey}|${leftId}`) - hashGraphText(`${cacheKey}|${rightId}`);
      return hashDelta || compareStableText(leftId, rightId);
    });
    const count = orderedIds.length;
    const desiredRadius = count <= 1
      ? 0
      : Math.min(116, (18 + 12 * Math.sqrt(Math.max(0, count - 2))) * (context.mode === 'overview' && count >= 8 ? 1.08 : 1));
    const indexById = new Map();
    const positionX = new Float64Array(count);
    const positionY = new Float64Array(count);
    const velocityX = new Float64Array(count);
    const velocityY = new Float64Array(count);
    const nodeRadius = new Float64Array(count);
    const baseRotation = graphHashUnit(cacheKey) * Math.PI * 2;
    orderedIds.forEach((id, rank) => {
      indexById.set(id, rank);
      const radialNoise = 0.88 + 0.24 * graphHashUnit(`${cacheKey}|radius|${id}`);
      const angleNoise = (graphHashUnit(`${cacheKey}|angle|${id}`) - 0.5) * 0.42;
      const radius = count <= 1
        ? 0
        : 0.82 * desiredRadius * Math.sqrt((rank + 0.5) / count) * radialNoise;
      const angle = baseRotation + rank * GRAPH_GOLDEN_ANGLE + angleNoise;
      positionX[rank] = Math.cos(angle) * radius;
      positionY[rank] = Math.sin(angle) * radius;
      nodeRadius[rank] = nodeRadiusById.get(id) || 5;
    });

    const degree = new Uint32Array(count);
    const links = edgePairs.map(([source, target]) => {
      const sourceIndex = indexById.get(source);
      const targetIndex = indexById.get(target);
      degree[sourceIndex] += 1;
      degree[targetIndex] += 1;
      return {
        source,
        target,
        sourceIndex,
        targetIndex,
        key: canonicalGraphEdgeKey(source, target)
      };
    }).sort((left, right) => compareStableText(left.key, right.key));
    const meanDegree = links.length * 2 / Math.max(1, count);
    const linkBase = Math.max(30, Math.min(40, 26 + 2.2 * Math.sqrt(count)));
    const linkCount = links.length;
    const linkSourceIndex = new Uint32Array(linkCount);
    const linkTargetIndex = new Uint32Array(linkCount);
    const linkRestLength = new Float64Array(linkCount);
    const linkStrength = new Float64Array(linkCount);
    const linkBias = new Float64Array(linkCount);
    links.forEach((link, linkIndex) => {
      const sourceIndex = link.sourceIndex;
      const targetIndex = link.targetIndex;
      const sourceDegree = degree[sourceIndex] || 1;
      const targetDegree = degree[targetIndex] || 1;
      linkSourceIndex[linkIndex] = sourceIndex;
      linkTargetIndex[linkIndex] = targetIndex;
      linkRestLength[linkIndex] = Math.max(
        nodeRadius[sourceIndex] + nodeRadius[targetIndex] + 5,
        linkBase + Math.min(10, 2 * Math.log2(2 + Math.max(sourceDegree, targetDegree)))
      );
      linkStrength[linkIndex] = Math.max(0.018, Math.min(
        0.18,
        0.18 / Math.sqrt(Math.max(1, Math.min(sourceDegree, targetDegree)))
          / Math.sqrt(Math.max(1, meanDegree / 4))
      ));
      linkBias[linkIndex] = sourceDegree / Math.max(1, sourceDegree + targetDegree);
    });

    const separatePair = (leftIndex, rightIndex, strength) => {
      let dx = positionX[rightIndex] - positionX[leftIndex];
      let dy = positionY[rightIndex] - positionY[leftIndex];
      let distance = Math.hypot(dx, dy);
      if (distance < 0.0001) {
        const angle = graphHashUnit(`${cacheKey}|pair|${canonicalGraphEdgeKey(orderedIds[leftIndex], orderedIds[rightIndex])}`) * Math.PI * 2;
        dx = Math.cos(angle) * 0.001;
        dy = Math.sin(angle) * 0.001;
        distance = 0.001;
      }
      const minimumDistance = nodeRadius[leftIndex] + nodeRadius[rightIndex] + 7;
      if (distance >= minimumDistance) return;
      const correction = (minimumDistance - distance) * strength * 0.5 / distance;
      positionX[leftIndex] -= dx * correction;
      positionY[leftIndex] -= dy * correction;
      positionX[rightIndex] += dx * correction;
      positionY[rightIndex] += dy * correction;
    };

    const translateTowardCentroid = (strength = 1) => {
      let centroidX = 0;
      let centroidY = 0;
      for (let index = 0; index < count; index += 1) {
        centroidX += positionX[index];
        centroidY += positionY[index];
      }
      centroidX /= count;
      centroidY /= count;
      for (let index = 0; index < count; index += 1) {
        positionX[index] -= centroidX * strength;
        positionY[index] -= centroidY * strength;
      }
    };

    const tickCount = 360;
    for (let tick = 0; tick < tickCount; tick += 1) {
      const alpha = Math.pow(0.015, tick / Math.max(1, tickCount - 1));
      for (let linkIndex = 0; linkIndex < linkCount; linkIndex += 1) {
        const sourceIndex = linkSourceIndex[linkIndex];
        const targetIndex = linkTargetIndex[linkIndex];
        const dx = positionX[targetIndex] - positionX[sourceIndex];
        const dy = positionY[targetIndex] - positionY[sourceIndex];
        const distance = Math.max(0.001, Math.hypot(dx, dy));
        const displacement = (distance - linkRestLength[linkIndex]) / distance
          * linkStrength[linkIndex] * alpha;
        const bias = linkBias[linkIndex];
        velocityX[sourceIndex] += dx * displacement * (1 - bias);
        velocityY[sourceIndex] += dy * displacement * (1 - bias);
        velocityX[targetIndex] -= dx * displacement * bias;
        velocityY[targetIndex] -= dy * displacement * bias;
      }

      for (let leftIndex = 0; leftIndex < count; leftIndex += 1) {
        const leftId = orderedIds[leftIndex];
        for (let rightIndex = leftIndex + 1; rightIndex < count; rightIndex += 1) {
          const rightId = orderedIds[rightIndex];
          let dx = positionX[rightIndex] - positionX[leftIndex];
          let dy = positionY[rightIndex] - positionY[leftIndex];
          let distance = Math.hypot(dx, dy);
          if (distance < 0.001) {
            const angle = graphHashUnit(`${cacheKey}|charge|${canonicalGraphEdgeKey(leftId, rightId)}`) * Math.PI * 2;
            dx = Math.cos(angle) * 0.001;
            dy = Math.sin(angle) * 0.001;
            distance = 0.001;
          }
          if (distance > 180) continue;
          const force = 34 * alpha / Math.max(16, distance * distance);
          velocityX[leftIndex] -= dx * force;
          velocityY[leftIndex] -= dy * force;
          velocityX[rightIndex] += dx * force;
          velocityY[rightIndex] += dy * force;
        }
      }

      for (let index = 0; index < count; index += 1) {
        const id = orderedIds[index];
        const gravity = 0.0012 + (context.mode === 'entity' && id === context.rootId ? 0.0032 : 0);
        velocityX[index] = (velocityX[index] - positionX[index] * gravity * alpha) * 0.68;
        velocityY[index] = (velocityY[index] - positionY[index] * gravity * alpha) * 0.68;
        positionX[index] += velocityX[index];
        positionY[index] += velocityY[index];
      }
      for (let pass = 0; pass < 2; pass += 1) {
        for (let leftIndex = 0; leftIndex < count; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < count; rightIndex += 1) {
            separatePair(leftIndex, rightIndex, 0.82);
          }
        }
      }
      translateTowardCentroid(0.035);
    }

    translateTowardCentroid(1);
    const radii = Array.from(positionX, (x, index) => Math.hypot(x, positionY[index]))
      .sort((left, right) => left - right);
    const percentileRadius = radii[Math.min(radii.length - 1, Math.floor((radii.length - 1) * 0.9))] || 1;
    const scale = desiredRadius > 0 ? desiredRadius / Math.max(0.001, percentileRadius) : 1;
    for (let index = 0; index < count; index += 1) {
      positionX[index] *= scale;
      positionY[index] *= scale;
    }
    if (context.mode === 'entity' && context.rootId && count > 1) {
      const rootIndex = indexById.get(context.rootId);
      if (rootIndex !== undefined) {
        const deltaX = -positionX[rootIndex] * 0.2;
        const deltaY = -positionY[rootIndex] * 0.2;
        positionX[rootIndex] += deltaX;
        positionY[rootIndex] += deltaY;
        for (let index = 0; index < count; index += 1) {
          if (index === rootIndex) continue;
          positionX[index] -= deltaX / (count - 1);
          positionY[index] -= deltaY / (count - 1);
        }
      }
    }
    for (let pass = 0; pass < 20; pass += 1) {
      for (let leftIndex = 0; leftIndex < count; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < count; rightIndex += 1) {
          separatePair(leftIndex, rightIndex, 1);
        }
      }
      translateTowardCentroid(1);
    }

    const finalLayout = new Map();
    orderedIds.forEach((id, index) => {
      finalLayout.set(id, {
        x: Math.round(positionX[index] * 1000) / 1000,
        y: Math.round(positionY[index] * 1000) / 1000
      });
    });
    graphState.layoutCache.set(cacheKey, finalLayout);
    return new Map(Array.from(finalLayout, ([id, point]) => [id, { ...point }]));
  }

  function buildGraphDataForContext(graphContext) {
    const index = getKnowledgeIndex();
    if (!index) {
      return {
        nodes: [],
        links: [],
        nodeMap: new Map(),
        context: graphContext,
        layout: { targetPositions: new Map() }
      };
    }
    const context = createGraphContext(
      graphContext?.mode,
      graphContext?.rootId,
      graphContext || {}
    );
    context.rootId = context.mode === 'entity' ? resolveEntityId(context.rootId, index) : null;
    if (context.mode === 'entity' && !context.rootId) {
      return buildGraphDataForContext(createGraphContext('overview', null, { budget: context.budget }));
    }

    const selectedIds = context.mode === 'entity'
      ? selectEntityGraphNodes(index, context.rootId, context.budget)
      : selectOverviewGraphNodes(index, context.budget);
    const selectedSet = new Set(selectedIds);
    const edgePairs = index.undirectedEdges
      .filter((edge) => selectedSet.has(edge.source) && selectedSet.has(edge.target))
      .map((edge) => [edge.source, edge.target]);
    context.nodeSetId = hashGraphText([
      ...selectedIds.slice().sort(compareStableText),
      ...edgePairs.map(([source, target]) => canonicalGraphEdgeKey(source, target)).sort(compareStableText)
    ].join('|')).toString(16);

    const nodeRadiusById = new Map(selectedIds.map((id) => [
      id,
      getGraphNodeValue(context.mode === 'entity' && id === context.rootId, index.degree.get(id) || 0)
    ]));
    const targetPositions = solveDeterministicOrganicLayout(
      context,
      selectedIds,
      edgePairs,
      nodeRadiusById
    );
    const nodeMap = new Map();
    selectedIds.forEach((id) => {
      const raw = index.nodesById.get(id);
      if (!raw) return;
      const target = targetPositions.get(id) || { x: 0, y: 0 };
      const node = createGraphNode(
        raw,
        context.mode === 'entity' && id === context.rootId,
        index.degree.get(id) || 0,
        target.x,
        target.y
      );
      nodeMap.set(id, node);
    });

    const links = edgePairs.map(([source, target]) => ({ source, target, transitionAlpha: 1 }));

    return {
      nodes: Array.from(nodeMap.values()),
      links,
      nodeMap,
      context,
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
      val: getGraphNodeValue(isPrimary, degree),
      transitionAlpha: 1,
      x,
      y
    };
    nodeObj.fx = x;
    nodeObj.fy = y;
    nodeObj.vx = 0;
    nodeObj.vy = 0;
    return nodeObj;
  }

  function drawGraphImageCover(ctx, img, x, y, size) {
    const sourceWidth = img.naturalWidth || img.width;
    const sourceHeight = img.naturalHeight || img.height;
    if (!sourceWidth || !sourceHeight || !size) return false;

    // Square crop: centered horizontally, upper-biased (20%) vertically to
    // match the editorial images' focal point.
    const crop = Math.min(sourceWidth, sourceHeight);
    ctx.drawImage(img, (sourceWidth - crop) / 2, (sourceHeight - crop) * 0.2, crop, crop, x, y, size, size);
    return true;
  }

  function isDesktopExpandedGraphInteraction() {
    return !isMobileGraphViewport()
      && state.isGraphExpanded
      && state.graphPhase === 'expanded';
  }

  function isMobileGraphViewport() {
    return window.innerWidth <= 768;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }


  // Graph motion keeps its original feel (420ms smoothstep, springy mobile
  // focus); only reduced motion turns it off.
  function graphMs(ms) {
    return prefersReducedMotion() ? 0 : ms;
  }

  function smoothstep(linear) {
    return linear * linear * (3 - 2 * linear);
  }

  function mobileGraphFocusEase(progress) {
    if (progress >= 1) return 1;
    const response = 4.6;
    const curve = (value) => 1 - (1 + response * value) * Math.exp(-response * value);
    return curve(progress) / curve(1);
  }

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function lerpGraphCamera(from, to, progress) {
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
      zoom: from.zoom + (to.zoom - from.zoom) * progress
    };
  }

  function isMobileExpandedGraphInteraction() {
    return isMobileGraphViewport()
      && state.isGraphExpanded
      && state.graphPhase === 'expanded'
      && !isMobileGraphSidebarOverlayLeaseActive();
  }

  function snapshotGraphNodes(graph) {
    const snapshot = new Map();
    const nodes = graph?.graphData?.()?.nodes || [];
    nodes.forEach(({ id, x, y, vx, vy, fx, fy }) => snapshot.set(id, { x, y, vx, vy, fx, fy }));
    return snapshot;
  }

  function restoreGraphNodes(graph, snapshot) {
    if (!graph || !snapshot) return;
    const nodes = graph.graphData?.()?.nodes || [];
    nodes.forEach((node) => {
      const saved = snapshot.get(node.id);
      if (saved) Object.assign(node, saved);
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
    if (graphState.layoutTransition) return null;
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
      if (getGraphItemTransitionAlpha(node) < 0.99) return;
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
      const point = graph.graph2ScreenCoords(node.x, node.y);
      const nodeX = rect.left + point.x * scaleX;
      const nodeY = rect.top + point.y * scaleY;
      const dx = clientX - nodeX;
      const dy = clientY - nodeY;
      const distanceSq = dx * dx + dy * dy;
      const mobile = isMobileGraphViewport();
      let renderedRadiusPx = mobile
        ? getMobileRenderedNodeRadiusPx(node, zoom)
        : (node.val || 5) * zoom;
      if (!mobile && graphState.focusedNode?.id === node.id) {
        renderedRadiusPx = Math.min(70, Math.max(renderedRadiusPx * 3.5, 42));
      } else if (!mobile && graphState.hoverNode?.id === node.id) {
        renderedRadiusPx = state.isGraphExpanded
          ? Math.min(32, Math.max(renderedRadiusPx * 1.8, 18))
          : renderedRadiusPx * 1.414;
      }
      const minimumHitRadiusPx = mobile ? 22 : (state.isGraphExpanded ? 14 : 10);
      const hitRadius = Math.max(minimumHitRadiusPx, renderedRadiusPx + (mobile ? 6 : 4)) * visualScale;
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
      if (graphState.layoutTransition) return;
      const isDesktop = isDesktopExpandedGraphInteraction();
      const isMobile = isMobileExpandedGraphInteraction();
      if ((!isDesktop && !isMobile) || event.button !== 0 || event.isPrimary === false) return;
      const graph = state.sidebarGraph;
      if (!graph) return;
      const pressedNode = getGraphNodeAtClientPoint(
        graph,
        container,
        event.clientX,
        event.clientY
      );

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
          const node = state.graphNodeMap?.get(currentGesture.pressedNodeId);
          if (node) handleGraphNodeActivation(node);
        }
        if (graphState.pointerGesture?.revision === revision) {
          graphState.pointerGesture = null;
        }
      });
    }, { passive: true });

    const cancelGesture = (event) => {
      const gesture = graphState.pointerGesture;
      if (!gesture || (event?.pointerId !== undefined && event.pointerId !== gesture.pointerId)) return;
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
    if (gesture) return Math.sqrt(gesture.maxDistanceSq);
    const zoom = graph?.zoom ? (graph.zoom() || 1) : 1;
    const graphDistance = translate
      ? Math.hypot(translate.x || 0, translate.y || 0) * zoom
      : 0;
    return graphDistance;
  }

  async function handleGraphNodeActivation(node) {
    if (!node || !node.id) return;
    if (graphState.layoutTransition || getGraphItemTransitionAlpha(node) < 0.99) return;
    if (state.graphPhase !== 'small' && state.graphPhase !== 'expanded') return;
    const gesture = graphState.pointerGesture;
    if (gesture) {
      if (gesture.handled) return;
      gesture.handled = true;
    }

    const isMobileDevice = isMobileGraphViewport();
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
    if (graphState.layoutTransition) return;
    if (!graphState.focusedNode) return;
    graphState.hoverNode = null;
    if (isMobileGraphViewport()) {
      transitionMobileGraphFocus(state.sidebarGraph, null, graphMs(220));
      return;
    }
    graphState.focusedNode = null;
    fitGraphToViewport(state.sidebarGraph, 260);
  }

  function getMobileVisualViewportHeight() {
    return Math.max(
      1,
      Math.round(window.visualViewport?.height || window.innerHeight)
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
      graphState.continuumGesture?.owner === 'floor'
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
      const progress = clamp01(previousPosition / previousGeometry.travel);
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
    ['viewport-height', 'peek', 'header-height', 'article-height'].forEach((name) => {
      continuum?.style.removeProperty(`--mobile-continuum-${name}`);
    });
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
      : (continuum?.classList.contains('is-active')
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

  // Left edge of the centered page on wide screens (0 when the page is full-width).
  function getHeaderHeight() {
    const header = document.querySelector('.wiki-header');
    return Math.max(0, header?.getBoundingClientRect().height || 68);
  }

  function getDesktopPageInsetLeft() {
    const sidebar = getEl('wiki-sidebar');
    return sidebar ? parseFloat(getComputedStyle(sidebar).left) || 0 : 0;
  }

  function getExpandedGraphSize(isMobile = isMobileGraphViewport()) {
    if (isMobile) {
      const height = graphState.continuumViewportHeight || getMobileVisualViewportHeight();
      return { width: window.innerWidth, height };
    }
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const usableHeight = Math.max(1, window.innerHeight - getHeaderHeight());
    const minWidth = Math.min(420, viewportWidth);
    const minHeight = Math.min(300, usableHeight);
    const width = Math.min(760, viewportWidth, Math.max(minWidth, Math.round(viewportWidth * 0.48)));
    const height = Math.min(560, usableHeight, Math.max(minHeight, Math.round(usableHeight * 0.58)));
    return { width, height };
  }

  function configureGraphPhysics(graph, isExpanded) {
    if (!graph) return;
    if (graph.backgroundColor) {
      const needsOpaqueCanvas = isExpanded && isMobileGraphViewport();
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
      width: Math.max(1, rect?.width || container?.clientWidth || slot?.clientWidth || 268),
      height: Math.max(1, rect?.height || container?.clientHeight || slot?.clientHeight || 145)
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
      if (positionMap && !positionMap.has(node.id)) return null;
      const position = positionMap?.get(node.id);
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
    if (transition?.frameId) cancelAnimationFrame(transition.frameId);
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
    if (transition?.frameId) cancelAnimationFrame(transition.frameId);
    graphState.mobileFocusTransition = null;
  }

  function clearMobileGraphFocusVisuals() {
    cancelMobileGraphFocusTransition();
    graphState.mobileFocusWeights.clear();
    requestGraphRedraw(state.sidebarGraph);
  }

  function syncMobileGraphContextRootFocus() {
    if (!isMobileGraphViewport()) return false;
    cancelMobileGraphFocusTransition();
    graphState.mobileFocusWeights.clear();
    const continuum = getEl('mobile-graph-continuum');
    const hasArticle = continuum?.classList.contains('has-article');
    if (!hasArticle && (!state.graphContext || state.graphContext.mode !== 'entity')) {
      graphState.focusedNode = null;
      requestGraphRedraw(state.sidebarGraph);
      return false;
    }
    const rootId = (state.graphContext?.mode === 'entity' && state.graphContext.rootId)
      || (hasArticle ? state.currentEntityId : null)
      || (hasArticle ? graphState.continuumEntityId : null)
      || null;
    const rootNode = rootId && state.graphNodeMap
      ? state.graphNodeMap.get(rootId)
      : null;
    graphState.focusedNode = rootNode || null;
    if (rootNode) graphState.mobileFocusWeights.set(rootNode.id, 1);
    requestGraphRedraw(state.sidebarGraph);
    return Boolean(rootNode);
  }

  function getMobileGraphFocusWeight(nodeId) {
    const value = graphState.mobileFocusWeights.get(nodeId);
    const focus = Number.isFinite(value)
      ? clamp01(value)
      : (graphState.focusedNode?.id === nodeId ? 1 : 0);
    return focus * clamp01(graphState.mobileExpansionProgress);
  }

  function getGraphRenderScale(globalScale) {
    return globalScale || (state.sidebarGraph ? state.sidebarGraph.zoom() : 1) || 1;
  }

  // Desktop focus/hover enlargement, in canvas units.
  function getDesktopNodeRadius(node, scale, isFocused, isHovered) {
    const radius = node.val || 5;
    if (isFocused) return Math.min(70 / scale, Math.max(radius * 3.5, 42 / scale));
    if (!isHovered) return radius;
    return state.isGraphExpanded ? Math.min(32 / scale, Math.max(radius * 1.8, 18 / scale)) : radius * 1.414;
  }

  function fillGraphCircle(ctx, x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fill();
  }

  function getMobileRenderedNodeRadiusPx(node, globalScale) {
    const scale = Math.max(0.01, getGraphRenderScale(globalScale));
    const previewRadiusFloor = 5 * (1 - clamp01(graphState.mobileExpansionProgress));
    const baseRadiusPx = Math.max(previewRadiusFloor, (node.val || 5) * scale);
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
      const linear = clamp01((now - startedAt) / duration);
      const eased = smoothstep(linear);
      applyGraphCamera(graph, lerpGraphCamera(startCamera, targetCamera, eased));
      if (linear < 1) {
        transition.frameId = requestAnimationFrame(tick);
      } else {
        graphState.cameraTransition = null;
      }
    };
    transition.frameId = requestAnimationFrame(tick);
  }

  function transitionMobileGraphFocus(graph, nextNode, duration = graphMs(MOBILE_GRAPH_FOCUS_DURATION_MS)) {
    if (!isMobileGraphViewport() || !graph) return false;
    const data = graph.graphData ? graph.graphData() : null;
    const nodes = data?.nodes || [];
    const previousFocusedId = graphState.focusedNode?.id;
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
    const reducedMotion = prefersReducedMotion();

    const apply = (progress) => {
      nodes.forEach((node) => {
        const from = fromWeights.get(node.id) || 0;
        const to = nextNode && node.id === nextNode.id ? 1 : 0;
        graphState.mobileFocusWeights.set(node.id, from + (to - from) * progress);
      });
      if (cameraNeedsMotion) applyGraphCamera(graph, lerpGraphCamera(startCamera, targetCamera, progress));
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
      const linear = clamp01((now - startedAt) / duration);
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
      : clamp01(options.expansionProgress);
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
    const reducedMotion = prefersReducedMotion();
    const initialTarget = getTargetRect();
    const startCamera = getCurrentGraphCamera(graph);
    cancelGraphCameraTransition();

    if (reducedMotion || duration <= 0) {
      applyFixedGraphRect(container, initialTarget);
      applyGraphCamera(graph, getGraphCameraForViewport(graph, initialTarget, toExpansion, graphState.activeTargetPositions));
      if (onProgress) onProgress(toExpansion);
      return Promise.resolve(initialTarget);
    }

    return new Promise((resolve) => {
      const startedAt = performance.now();
      const tick = (now) => {
        const linear = clamp01((now - startedAt) / duration);
        // Smooth acceleration and deceleration keeps the interpolation visible
        // instead of completing most of the distance in the first few frames.
        const eased = smoothstep(linear);
        if (onProgress) onProgress(toExpansion === 1 ? eased : 1 - eased);
        const target = getTargetRect();
        const rect = {};
        ['left', 'top', 'width', 'height'].forEach((key) => {
          rect[key] = fromRect[key] + (target[key] - fromRect[key]) * eased;
        });
        applyFixedGraphRect(container, rect);
        const targetCamera = getGraphCameraForViewport(graph, target, toExpansion, graphState.activeTargetPositions);
        applyGraphCamera(graph, startCamera && targetCamera
          ? lerpGraphCamera(startCamera, targetCamera, eased)
          : targetCamera);

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
    if (transition?.frameId) cancelAnimationFrame(transition.frameId);
    graphState.layoutTransition = null;
  }

  function settleGraphLayoutTransitionNodes() {
    const transition = graphState.layoutTransition;
    if (!transition) return;
    if (transition.frameId) cancelAnimationFrame(transition.frameId);
    graphState.layoutTransition = null;
    if (transition.finishNodes) transition.finishNodes();
  }

  function pauseGraphLayoutTransitionForViewportMorph() {
    const transition = graphState.layoutTransition;
    if (!transition || transition.committed) return null;
    if (transition.frameId) cancelAnimationFrame(transition.frameId);
    transition.frameId = null;
    transition.nodeMotions.forEach((motion) => {
      motion.start = {
        x: Number.isFinite(motion.node.x) ? motion.node.x : motion.end.x,
        y: Number.isFinite(motion.node.y) ? motion.node.y : motion.end.y
      };
      motion.startAlpha = getGraphItemTransitionAlpha(motion.node);
      motion.startValue = Number.isFinite(motion.node.val) ? motion.node.val : motion.endValue;
    });
    transition.linkMotions.forEach((motion) => {
      motion.startAlpha = getGraphItemTransitionAlpha(motion.link);
    });
    return transition;
  }

  function advanceGraphTransitionWithViewport(transition, progress) {
    if (!transition || transition.committed) return;
    transition.applyNodes(clamp01(progress));
    requestGraphRedraw(state.sidebarGraph);
  }

  function placeGraphNode(node, position) {
    if (!node || !position) return;
    Object.assign(node, { x: position.x, y: position.y, vx: 0, vy: 0, fx: position.x, fy: position.y });
  }

  function cancelAllGraphNodeSprings(settle = false) {
    if (graphState.nodeSpringFrame) cancelAnimationFrame(graphState.nodeSpringFrame);
    graphState.nodeSpringFrame = null;
    graphState.draggedNodeId = null;
    if (settle) {
      graphState.nodeSprings.forEach((spring) => placeGraphNode(spring.node, spring.target));
      if (state.sidebarGraph?.refresh) state.sidebarGraph.refresh();
    }
    graphState.nodeSprings.clear();
  }

  function getGraphGestureReleaseVelocity(graph, gesture) {
    if (!gesture || performance.now() - gesture.lastMoveAt > 90) return { x: 0, y: 0 };
    const zoom = graph?.zoom ? Math.max(0.01, graph.zoom() || 1) : 1;
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
    const nodes = data?.nodes || [];
    const links = data?.links || [];
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
      if (existing?.graph === graph) {
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
      const links = data?.links || [];

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

    const reducedMotion = prefersReducedMotion();
    if (reducedMotion) {
      cancelAllGraphNodeSprings(true);
      return;
    }
    ensureGraphSpringFrame(graph);
  }

  function getGraphItemTransitionAlpha(item, fallback = 1) {
    return Number.isFinite(item?.transitionAlpha)
      ? clamp01(item.transitionAlpha)
      : fallback;
  }

  function averageGraphPoints(points, fallback = { x: 0, y: 0 }) {
    if (!points.length) return { x: fallback.x, y: fallback.y };
    const sum = points.reduce((result, point) => {
      result.x += point.x;
      result.y += point.y;
      return result;
    }, { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  function createGraphDataTransitionPlan(graph, graphData) {
    const currentData = (graph.graphData && graph.graphData()) || { nodes: [], links: [] };
    const currentNodes = (currentData.nodes || []).filter((node) => node?.id);
    const currentNodeMap = new Map(currentNodes.map((node) => [node.id, node]));
    const nextTargets = graphData.layout.targetPositions;
    const nextNodeIds = new Set(graphData.nodes.map((node) => node.id));
    const finalCentroid = averageGraphPoints(Array.from(nextTargets.values()));
    const finalLinks = graphData.links.map((link) => ({
      source: getLinkEndpointId(link.source),
      target: getLinkEndpointId(link.target),
      transitionAlpha: 1
    }));
    const nextNeighborIds = new Map(graphData.nodes.map((node) => [node.id, []]));
    finalLinks.forEach((link) => {
      nextNeighborIds.get(link.source).push(link.target);
      nextNeighborIds.get(link.target).push(link.source);
    });

    const finalNodes = [];
    const finalNodeMap = new Map();
    const nodeMotions = [];
    graphData.nodes.forEach((nextNode) => {
      const existing = currentNodeMap.get(nextNode.id);
      const target = nextTargets.get(nextNode.id) || { x: nextNode.x || 0, y: nextNode.y || 0 };
      let renderNode = nextNode;
      let start;
      let startAlpha = 0;
      let startValue = nextNode.val;
      if (existing) {
        start = {
          x: Number.isFinite(existing.x) ? existing.x : target.x,
          y: Number.isFinite(existing.y) ? existing.y : target.y
        };
        startAlpha = getGraphItemTransitionAlpha(existing);
        startValue = Number.isFinite(existing.val) ? existing.val : nextNode.val;
        renderNode = existing;
        Object.keys(nextNode).forEach((key) => {
          if (!['x', 'y', 'fx', 'fy', 'vx', 'vy', 'val', 'transitionAlpha'].includes(key)) {
            renderNode[key] = nextNode[key];
          }
        });
      } else {
        const sharedNeighborPoints = (nextNeighborIds.get(nextNode.id) || [])
          .map((neighborId) => currentNodeMap.get(neighborId))
          .filter(Boolean)
          .map((node) => ({ x: node.x, y: node.y }))
          .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
        start = sharedNeighborPoints.length
          ? averageGraphPoints(sharedNeighborPoints, target)
          : {
              x: finalCentroid.x + (target.x - finalCentroid.x) * 0.58,
              y: finalCentroid.y + (target.y - finalCentroid.y) * 0.58
            };
        startValue = nextNode.val * 0.86;
      }
      placeGraphNode(renderNode, start);
      renderNode.val = startValue;
      renderNode.transitionAlpha = startAlpha;
      finalNodes.push(renderNode);
      finalNodeMap.set(renderNode.id, renderNode);
      nodeMotions.push({
        node: renderNode,
        start,
        end: target,
        startAlpha,
        endAlpha: 1,
        startValue,
        endValue: nextNode.val
      });
    });

    const currentNeighborIds = new Map(currentNodes.map((node) => [node.id, []]));
    (currentData.links || []).forEach((link) => {
      const sourceId = getLinkEndpointId(link.source);
      const targetId = getLinkEndpointId(link.target);
      if (currentNeighborIds.has(sourceId)) currentNeighborIds.get(sourceId).push(targetId);
      if (currentNeighborIds.has(targetId)) currentNeighborIds.get(targetId).push(sourceId);
    });
    const exitNodes = currentNodes.filter((node) => !nextNodeIds.has(node.id));
    exitNodes.forEach((node) => {
      const start = {
        x: Number.isFinite(node.x) ? node.x : finalCentroid.x,
        y: Number.isFinite(node.y) ? node.y : finalCentroid.y
      };
      const retainedNeighborTargets = (currentNeighborIds.get(node.id) || [])
        .filter((neighborId) => nextNodeIds.has(neighborId))
        .map((neighborId) => nextTargets.get(neighborId))
        .filter(Boolean);
      const end = averageGraphPoints(retainedNeighborTargets, finalCentroid);
      const startAlpha = getGraphItemTransitionAlpha(node);
      const startValue = Number.isFinite(node.val) ? node.val : 5;
      node.transitionAlpha = startAlpha;
      nodeMotions.push({
        node,
        start,
        end,
        startAlpha,
        endAlpha: 0,
        startValue,
        endValue: startValue * 0.84
      });
    });

    const currentLinkMap = new Map();
    (currentData.links || []).forEach((link) => {
      const sourceId = getLinkEndpointId(link.source);
      const targetId = getLinkEndpointId(link.target);
      if (!sourceId || !targetId) return;
      currentLinkMap.set(canonicalGraphEdgeKey(sourceId, targetId), {
        source: sourceId,
        target: targetId,
        alpha: getGraphItemTransitionAlpha(link)
      });
    });
    const finalLinkMap = new Map(finalLinks.map((link) => [
      canonicalGraphEdgeKey(link.source, link.target),
      link
    ]));
    const linkMotions = [];
    const unionLinks = [];
    new Set([...currentLinkMap.keys(), ...finalLinkMap.keys()]).forEach((key) => {
      const current = currentLinkMap.get(key);
      const next = finalLinkMap.get(key);
      const link = {
        source: next ? next.source : current.source,
        target: next ? next.target : current.target,
        transitionAlpha: current ? current.alpha : 0
      };
      unionLinks.push(link);
      linkMotions.push({
        link,
        startAlpha: link.transitionAlpha,
        endAlpha: next ? 1 : 0
      });
    });

    const finalData = { nodes: finalNodes, links: finalLinks };
    const unionData = { nodes: [...finalNodes, ...exitNodes], links: unionLinks };
    const transition = {
      revision: graphState.dataRevision,
      frameId: null,
      nodeMotions,
      linkMotions,
      finalData,
      finalNodeMap,
      committed: false,
      applyNodes(progress) {
        this.nodeMotions.forEach((motion) => {
          placeGraphNode(motion.node, {
            x: motion.start.x + (motion.end.x - motion.start.x) * progress,
            y: motion.start.y + (motion.end.y - motion.start.y) * progress
          });
          motion.node.val = motion.startValue + (motion.endValue - motion.startValue) * progress;
          motion.node.transitionAlpha = motion.startAlpha
            + (motion.endAlpha - motion.startAlpha) * progress;
        });
        this.linkMotions.forEach((motion) => {
          motion.link.transitionAlpha = motion.startAlpha
            + (motion.endAlpha - motion.startAlpha) * progress;
        });
      },
      commitFinal() {
        if (this.committed) return;
        this.committed = true;
        this.nodeMotions.forEach((motion) => {
          if (motion.endAlpha <= 0) return;
          placeGraphNode(motion.node, motion.end);
          motion.node.val = motion.endValue;
          motion.node.transitionAlpha = 1;
        });
        this.finalData.links.forEach((link) => { link.transitionAlpha = 1; });
        if (graphState.layoutTransition === this) graphState.layoutTransition = null;
        state.graphNodeMap = this.finalNodeMap;
        graph.graphData(this.finalData);
        if (isMobileGraphViewport()
          && state.isGraphExpanded
          && state.graphPhase === 'expanded') {
          syncMobileGraphContextRootFocus();
        }
        configureGraphPhysics(graph, state.isGraphExpanded);
        requestGraphRedraw(graph);
      }
    };
    transition.finishNodes = () => transition.commitFinal();
    return { transition, unionData };
  }

  function transitionGraphToLayout(graph, transition, targetCamera, duration) {
    if (!graph || !transition) return;
    const cameraStart = getCurrentGraphCamera(graph) || targetCamera;
    const apply = (progress) => {
      transition.applyNodes(progress);
      if (cameraStart && targetCamera) applyGraphCamera(graph, lerpGraphCamera(cameraStart, targetCamera, progress));
      requestGraphRedraw(graph);
    };

    const startedAt = performance.now();
    const tick = (now) => {
      if (graphState.layoutTransition !== transition || graphState.dataRevision !== transition.revision) return;
      const linear = clamp01((now - startedAt) / duration);
      const eased = smoothstep(linear);
      apply(eased);
      if (linear < 1) {
        transition.frameId = requestAnimationFrame(tick);
      } else {
        transition.commitFinal();
      }
    };
    transition.frameId = requestAnimationFrame(tick);
  }

  function commitGraphDataImmediately(graph, graphData, camera) {
    graphData.nodes.forEach((node) => {
      placeGraphNode(node, graphData.layout.targetPositions.get(node.id) || node);
      node.transitionAlpha = 1;
    });
    const links = graphData.links.map((link) => ({
      source: getLinkEndpointId(link.source),
      target: getLinkEndpointId(link.target),
      transitionAlpha: 1
    }));
    graph.graphData({ nodes: graphData.nodes, links });
    state.graphNodeMap = graphData.nodeMap;
    if (isMobileGraphViewport()
      && state.isGraphExpanded
      && state.graphPhase === 'expanded') {
      syncMobileGraphContextRootFocus();
    }
    applyGraphCamera(graph, camera);
    configureGraphPhysics(graph, state.isGraphExpanded);
    requestGraphRedraw(graph);
  }

  function applyGraphData(graph, graphData, animate = true, options = {}) {
    if (!graph) return;
    const reducedMotion = prefersReducedMotion();
    cancelGraphCameraTransition();
    if (isMobileGraphViewport()) clearMobileGraphFocusVisuals();
    cancelGraphLayoutTransition();
    cancelAllGraphNodeSprings(false);
    if (graphState.pointerGesture) graphState.pointerGesture.cancelled = true;
    graphState.pointerGesture = null;
    graphState.pointerGestureRevision += 1;
    ++graphState.dataRevision;
    const transitionDuration = animate && !reducedMotion ? 420 : 0;
    graphState.activeTargetPositions = graphData.layout?.targetPositions || new Map();
    state.graphContext = graphData.context;

    // The fitted camera depends on the graph's current data, so it is measured
    // after each graphData() swap below.
    const fitCamera = () => getGraphCameraForViewport(
      graph,
      options.viewportSize || getCurrentGraphViewportSize(),
      options.expansionProgress === undefined
        ? (state.isGraphExpanded ? 1 : 0)
        : options.expansionProgress,
      graphData.layout?.targetPositions
    );

    if (transitionDuration <= 0) {
      graph.graphData({ nodes: graphData.nodes, links: graphData.links });
      commitGraphDataImmediately(graph, graphData, fitCamera());
      return;
    }

    const plan = createGraphDataTransitionPlan(graph, graphData);
    graphState.layoutTransition = plan.transition;
    graph.graphData(plan.unionData);
    state.graphNodeMap = plan.transition.finalNodeMap;
    configureGraphPhysics(graph, state.isGraphExpanded);
    transitionGraphToLayout(graph, plan.transition, fitCamera(), transitionDuration);
  }

  function fitGraphTooltipToViewport(clientX, clientY) {
    const tooltip = document.querySelector('#canvas-sidebar-graph .graph-tooltip');
    const host = tooltip?.parentElement;
    const clip = getEl('sidebar-graph-container');
    if (!tooltip || !host || !clip || !tooltip.textContent || !tooltip.offsetWidth) return;
    const padding = 8;
    const hostRect = host.getBoundingClientRect();
    const clipRect = clip.getBoundingClientRect();
    const bounds = {
      left: Math.max(clipRect.left, 0) + padding,
      top: Math.max(clipRect.top, 0) + padding,
      right: Math.min(clipRect.right, window.innerWidth) - padding,
      bottom: Math.min(clipRect.bottom, window.innerHeight) - padding
    };
    // Wrap long labels to the visible window instead of the hidden canvas width.
    tooltip.style.maxWidth = `${Math.max(0, Math.min(240, bounds.right - bounds.left))}px`;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    // Keep ForceGraph's horizontal anchoring and default below-cursor
    // placement, flipping above or clamping only when it would be clipped.
    const anchorX = clientX - width * ((clientX - hostRect.left) / Math.max(1, hostRect.width));
    const left = Math.max(bounds.left, Math.min(anchorX, bounds.right - width));
    const below = clientY + 21;
    const above = clientY - height - 8;
    let top = hostRect.bottom - clientY < 100 ? above : below;
    if (top + height > bounds.bottom) top = above;
    if (top < bounds.top && below + height <= bounds.bottom) top = below;
    top = Math.max(bounds.top, Math.min(top, bounds.bottom - height));
    tooltip.style.transform = `translate(${left - clientX}px, ${top - clientY}px)`;
  }

  function initBalancedTopologyGraph(graphContext, options = {}) {
    const container = getEl('canvas-sidebar-graph');
    if (!window.ForceGraph || !container) return;

    const renderSize = getGraphRenderSizeForPresentation(options);
    const context = graphContext && (graphContext.mode === 'overview' || graphContext.mode === 'entity')
      ? graphContext
      : createGraphContext('overview');
    const graphData = options.graphData || buildGraphDataForContext(context);

    if (!state.sidebarGraph) {
      // Before construction there is no renderer to resize; initialize both the
      // host CSS size and the bookkeeping that the new ForceGraph will inherit.
      syncGraphRenderSize(null, renderSize);
      container.innerHTML = '';
      container.addEventListener('mouseleave', () => {
        graphState.hoverNode = null;
      });
      // ForceGraph places its label tooltip against the full render canvas,
      // which is larger than the clipped preview window. Re-fit it to the
      // visible window after ForceGraph positions it (and once more after the
      // label text updates on the next frame).
      container.addEventListener('pointermove', (event) => {
        fitGraphTooltipToViewport(event.clientX, event.clientY);
        requestAnimationFrame(() => fitGraphTooltipToViewport(event.clientX, event.clientY));
      }, { passive: true });

      const Graph = ForceGraph()(container)
        .width(renderSize.width)
        .height(renderSize.height)
        // Match ForceGraph's measured bounds to the radius used by our custom
        // canvas renderer; the previous value (25) made zoomToFit over-shrink.
        .nodeRelSize(4)
        .backgroundColor('rgba(0,0,0,0)')
        .nodeId('id')
        .nodeVal('val')
        .nodeLabel((node) => (
          !isMobileGraphViewport() && !graphState.layoutTransition
            ? entityName(node.id, node.label)
            : ''
        ))
        .linkCurvature(0.18)
        .linkWidth((link) => {
          const sourceId = getLinkEndpointId(link.source);
          const targetId = getLinkEndpointId(link.target);
          const baseWidth = 0.82;
          if (isMobileGraphViewport()) {
            const focusWeight = Math.max(
              getMobileGraphFocusWeight(sourceId),
              getMobileGraphFocusWeight(targetId)
            );
            return baseWidth + (1.28 - baseWidth) * focusWeight;
          }
          const activeId = graphState.focusedNode?.id || graphState.hoverNode?.id;
          return activeId && (sourceId === activeId || targetId === activeId) ? 1.5 : baseWidth;
        })
        .linkColor((link) => {
          const isDark = state.theme === 'dark';
          const transitionAlpha = getGraphItemTransitionAlpha(link);
          const makeColor = (alpha) => `rgba(${isDark ? '255,255,255' : '0,0,0'},${clamp01(alpha * transitionAlpha)})`;
          if (isMobileGraphViewport()) {
            const focusWeight = Math.max(
              getMobileGraphFocusWeight(getLinkEndpointId(link.source)),
              getMobileGraphFocusWeight(getLinkEndpointId(link.target))
            );
            const baseAlpha = isDark ? 0.22 : 0.16;
            const focusedAlpha = isDark ? 0.38 : 0.3;
            const alpha = baseAlpha + (focusedAlpha - baseAlpha) * focusWeight;
            return makeColor(alpha);
          }
          const activeId = graphState.focusedNode?.id
            || graphState.hoverNode?.id;
          if (activeId) {
            const isConnected = getLinkEndpointId(link.source) === activeId
              || getLinkEndpointId(link.target) === activeId;
            if (isConnected) return makeColor(isDark ? 0.42 : 0.34);
          }
          return makeColor(isDark ? 0.18 : 0.12);
        })
        .onNodeDrag((node) => {
          bindNodeDragToPointerGesture(node);
          beginGraphNodeDrag(Graph, node);
        })
        .onNodeDragEnd(async (node, translate) => {
          const gesture = graphState.pointerGesture;
          const isTrackedPointerDrag = gesture?.dragNodeId === node.id;
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
          if (graphState.layoutTransition) return;
          if (!graphState.focusedNode) graphState.hoverNode = node || null;
        })
        .onNodeClick(handleGraphNodeActivation)
        .onBackgroundClick(handleGraphBackgroundActivation)
        .nodePointerAreaPaint((node, color, ctx, globalScale) => {
          if (graphState.layoutTransition || getGraphItemTransitionAlpha(node) < 0.55) return;
          const scale = getGraphRenderScale(globalScale);
          let hitRadiusPx;
          if (isMobileGraphViewport()) {
            hitRadiusPx = Math.max(state.isGraphExpanded ? 22 : 18, getMobileRenderedNodeRadiusPx(node, scale) + 4);
          } else {
            // On desktop, the hit area tracks the visual radius with only 2.5px
            // of screen padding, so hover/click never trigger far from a node.
            const visualRadius = getDesktopNodeRadius(
              node,
              scale,
              graphState.focusedNode?.id === node.id,
              graphState.hoverNode?.id === node.id
            );
            hitRadiusPx = Math.max(state.isGraphExpanded ? 12 : 9, visualRadius * scale + 2.5);
          }
          fillGraphCircle(ctx, node.x, node.y, hitRadiusPx / scale, color);
        })
        .nodeCanvasObject((node, ctx, globalScale) => {
          const isMobileDevice = isMobileGraphViewport();
          const isFocused = graphState.focusedNode?.id === node.id;
          const isHovered = graphState.hoverNode?.id === node.id;
          const isPrimary = node.isPrimary;
          
          let alpha = 1;
          if (!isMobileDevice && graphState.focusedNode) {
            // Everything else blurs/dissolves deeply into a bokeh background
            alpha = isFocused ? 1 : 0.08;
          } else if (!isMobileDevice && graphState.hoverNode) {
            alpha = (isPrimary || isHovered) ? 1 : 0.65;
          }
          ctx.save();
          ctx.globalAlpha = alpha * getGraphItemTransitionAlpha(node);

          const scale = getGraphRenderScale(globalScale);
          const radius = isMobileDevice
            ? getMobileRenderedNodeRadiusPx(node, scale) / scale
            : getDesktopNodeRadius(node, scale, isFocused, isHovered);

          // Draw a borderless circular portrait when the image is ready,
          // otherwise a flat category-colored dot.
          const img = node.imgSrc && graphState.imgCache.get(node.imgSrc);
          if (img?.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.clip();
            drawGraphImageCover(ctx, img, node.x - radius, node.y - radius, radius * 2);
            ctx.restore();
          } else {
            fillGraphCircle(ctx, node.x, node.y, radius, getCategoryColor(node.type));
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

  function getGraphBudgetIdentity(budget) {
    return budget
      ? `${budget.environment}|${budget.nodeCap}|${budget.edgeCap}`
      : '';
  }

  function preparePendingGraphData(context) {
    const revision = ++graphState.pendingGraphBuildRevision;
    graphState.pendingGraphData = null;
    const build = () => {
      if (revision !== graphState.pendingGraphBuildRevision
        || !graphState.hasPendingData
        || graphState.pendingGraphContext !== context) return;
      const graphData = buildGraphDataForContext(context);
      if (revision === graphState.pendingGraphBuildRevision
        && graphState.hasPendingData
        && graphState.pendingGraphContext === context) {
        graphState.pendingGraphData = graphData;
      }
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(build, { timeout: 180 });
    } else {
      window.setTimeout(build, 0);
    }
  }

  function scheduleGraphForPage(graphContext, options = {}) {
    const context = createGraphContext(
      graphContext?.mode,
      graphContext?.rootId,
      graphContext || {}
    );
    const isViewportTransitioning = state.graphPhase !== 'small' && state.graphPhase !== 'expanded';
    const shouldDefer = isViewportTransitioning || (
      isMobileGraphViewport()
      && !state.isGraphExpanded
      && state.graphPhase === 'small'
    );
    if (shouldDefer) {
      graphState.pendingGraphContext = context;
      graphState.hasPendingData = true;
      preparePendingGraphData(context);
      return;
    }

    graphState.pendingGraphBuildRevision += 1;
    graphState.pendingGraphData = null;
    graphState.pendingGraphContext = null;
    graphState.hasPendingData = false;
    initBalancedTopologyGraph(context, options);
  }

  function flushPendingGraphData(options = {}) {
    if (!graphState.hasPendingData) return false;
    const pendingContext = graphState.pendingGraphContext;
    const currentBudget = getGraphEnvironmentBudget();
    const prepared = graphState.pendingGraphData;
    const canUsePrepared = prepared
      && prepared.context
      && getGraphBudgetIdentity(prepared.context.budget) === getGraphBudgetIdentity(currentBudget);
    const context = canUsePrepared
      ? prepared.context
      : createGraphContext(
          pendingContext?.mode,
          pendingContext?.rootId,
          { budget: currentBudget }
        );
    graphState.pendingGraphBuildRevision += 1;
    graphState.hasPendingData = false;
    graphState.pendingGraphContext = null;
    graphState.pendingGraphData = null;
    initBalancedTopologyGraph(context, {
      ...options,
      animate: false,
      graphData: canUsePrepared ? prepared : null
    });
    return true;
  }

  function reconcileGraphContextForEnvironment() {
    const context = state.graphContext;
    const graph = state.sidebarGraph;
    if (!context || !graph || !context.budget) return false;
    const nextBudget = getGraphEnvironmentBudget();
    const data = (graph.graphData && graph.graphData()) || { nodes: [], links: [] };
    const environmentChanged = context.budget.environment !== nextBudget.environment;
    const exceedsSafetyBudget = (data.nodes || []).length > nextBudget.nodeCap
      || (data.links || []).length > nextBudget.edgeCap;
    if (!environmentChanged && !exceedsSafetyBudget) return false;

    const nextContext = createGraphContext(context.mode, context.rootId, { budget: nextBudget });
    const continuum = getEl('mobile-graph-continuum');
    const hasActiveMobileArticle = !environmentChanged
      && isMobileGraphContinuumActive()
      && continuum
      && continuum.classList.contains('has-article');
    if (hasActiveMobileArticle) {
      // Do not replace the touched network under an active graph/article seam.
      // The next graph entry point commits this still-unrendered context using
      // the then-current viewport budget.
      graphState.pendingGraphContext = nextContext;
      graphState.hasPendingData = true;
      preparePendingGraphData(nextContext);
      return false;
    }

    initBalancedTopologyGraph(nextContext, { animate: false });
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
    container.style.zIndex = isMobileGraphViewport() ? '500' : '100';
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
    container.classList.remove(...GRAPH_HOST_STATE_CLASSES);
    resetGraphContainerStyles(container);
    document.body.classList.remove('graph-is-expanded', 'mobile-sidebar-graph-returning');
    if (sidebar) {
      sidebar.classList.remove('is-closing');
      sidebar.inert = false;
    }
    const continuum = getEl('mobile-graph-continuum');
    if (continuum?.classList.contains('is-active')) {
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
    const halfControl = controlRect?.width ? controlRect.width / 2 : 24;
    const viewportHeight = graphState.continuumViewportHeight || getMobileVisualViewportHeight();
    return {
      right: Math.max(0, window.innerWidth - (rect.left + rect.width / 2) - halfControl),
      bottom: Math.max(0, viewportHeight - (rect.top + rect.height / 2) - halfControl)
    };
  }

  function setMobileGraphControlShape(progress) {
    const normalized = clamp01(progress);
    const firstStroke = getEl('graph-control-morph-a');
    const secondStroke = getEl('graph-control-morph-b');
    const from = MOBILE_GRAPH_CONTROL_SHAPES.corner;
    const continuum = getEl('mobile-graph-continuum');
    const hasArticle = Boolean(
      continuum?.classList.contains('has-article')
      || graphState.continuumEntityId
      || (state.currentEntityId && getEl('view-entity') && getEl('view-entity').style.display === 'block')
    );
    const to = hasArticle ? MOBILE_GRAPH_CONTROL_SHAPES.chevronUp : MOBILE_GRAPH_CONTROL_SHAPES.close;
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
    const opacity = clamp01(Number(options.opacity) || 0);
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
      t(continuumReading ? 'Return to Knowledge Graph' : 'Open Knowledge Graph')
    );
  }

  function setMobileGraphExpansionProgress(
    progress,
    transitioning = false,
    surface = state.graphReturnSurface
  ) {
    if (!isMobileGraphViewport()) return;
    const normalized = clamp01(progress);
    const container = getEl('sidebar-graph-container');
    const expandButton = getEl('btn-graph-expand');
    const launcher = getEl('btn-mobile-graph-launcher');
    if (!container) return;

    graphState.mobileExpansionProgress = normalized;
    const returnsToArticle = surface === 'article';
    const launcherHandoff = returnsToArticle
      ? clamp01(normalized / 0.28)
      : 1;
    const expandedInsets = getMobileGraphControlExpandedInsets(launcher, expandButton);
    const controlRight = returnsToArticle
      ? expandedInsets.right
      : expandedInsets.right * normalized;
    const controlBottom = returnsToArticle
      ? expandedInsets.bottom
      : expandedInsets.bottom * normalized;
    const controlOpacity = returnsToArticle
      ? launcherHandoff
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
      expandButton.setAttribute('aria-label', t(isStableExpanded ? 'Close graph explorer' : 'Expand graph'));
    }
    if (launcher) {
      setMobileGraphLauncherPresentation(launcher, {
        opacity: returnsToArticle ? 1 - launcherHandoff : 0,
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
    return Math.max(0, (header?.getBoundingClientRect().height) || 52);
  }

  function getMobileGraphContinuumProgress(position = graphState.continuumPosition) {
    const travel = getMobileGraphContinuumGeometry().travel;
    return travel > 0 ? clamp01(position / travel) : 0;
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
      if (property !== 'all' && property !== 'transform' && property !== 'opacity') continue;
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
      // The phone menu fades rather than slides; it is gone once transparent.
      if (event.target !== sidebar || event.propertyName !== 'opacity') return;
      if (!sidebar.classList.contains('is-open')
        && parseFloat(getComputedStyle(sidebar).opacity) <= 0.01) complete();
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

  function expandMobileGraphSidebarOverlayLease(duration = graphMs(420)) {
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
      syncMobileGraphContextRootFocus();
      if (state.currentEntityId) {
        showMobileGraphContinuumArticle({ id: state.currentEntityId });
      } else {
        hideMobileGraphContinuumArticle();
      }

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
      opacity: reveal,
      interactive: isStableReading,
      continuumReading: reveal > 0.001,
      morphing: Boolean(
        graphState.continuumMotionTarget !== null
        || (graphState.continuumGesture?.owner === 'floor')
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
    const depthProgress = clamp01((progress - 0.04) / 0.96);
    const controlFade = 1 - clamp01((progress - 0.08) / 0.52);
    const controlLift = hasArticle
      ? geometry.previewPeek + Math.max(0, Math.min(geometry.travel, position))
      : 0;

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
      graphState.continuumGesture?.owner === 'floor'
    ));
    continuum.classList.toggle('is-article-resting', isMobileGraphContinuumStableReading());
    updateMobileGraphContinuumHeader(progress);
    updateMobileGraphContinuumLauncher(progress, hasArticle);

    const expandButton = getEl('btn-graph-expand');
    if (expandButton && continuumOwnsGraph && state.graphPhase === 'expanded') {
      const floorIsIdle = graphState.continuumMotionTarget === null
        && !(graphState.continuumGesture?.owner === 'floor');
      const closeIsInteractive = controlFade > 0.12
        && floorIsIdle
        && Math.abs(position) <= 0.5;
      expandButton.style.pointerEvents = closeIsInteractive ? 'auto' : 'none';
      expandButton.tabIndex = closeIsInteractive ? 0 : -1;
      expandButton.setAttribute('aria-hidden', closeIsInteractive ? 'false' : 'true');
      expandButton.setAttribute(
        'aria-label',
        t(hasArticle ? 'Return to article' : 'Close graph explorer')
      );
      setMobileGraphControlShape(1);
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
      || !entityId) return false;

    if (entityId === state.currentEntityId) {
      state.graphReturnSurface = 'article';
      return true;
    }

    // Reaching the article floor is the semantic navigation boundary. At this
    // point the sheet fully covers the graph, so promote its transient entity
    // to the canonical page without re-rendering or resetting the active continuum.
    cancelMobileGraphFocusTransition();
    clearActiveNav();
    state.graphReturnSurface = 'article';
    state.currentEntityId = entityId;
    updateNavHistory('entity', entityId);

    activateEntityTocLink(entityId);

    // Update background desktop state so resize to desktop is seamless
    renderEntityPage(getEntityArticleModel(entityId));

    // Schedule background graph for the new entity without visual transition
    scheduleGraphForPage(createGraphContext('entity', entityId), { animate: false });
    return true;
  }

  function finishMobileGraphContinuumSettle(target) {
    graphState.continuumMotionFrame = null;
    graphState.continuumMotionTarget = null;
    graphState.continuumVelocity = 0;
    graphState.continuumPosition = target;
    updateMobileGraphContinuumProgress();
    if (isMobileGraphContinuumStableReading()) {
      commitMobileGraphContinuumReadingContext();
    } else if (target <= 0.5) {
      syncMobileGraphContextRootFocus();
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

    if (prefersReducedMotion()) {
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
    const samples = gesture?.samples;
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
    continuum.classList.remove(...CONTINUUM_ARTICLE_CLASSES);
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
    setMobileGraphControlShape(1);
  }

  function hideMobileGraphContinuumArticle() {
    const continuum = getEl('mobile-graph-continuum');
    const article = getEl('mobile-graph-continuum-article');
    if (!continuum) return;
    cancelMobileGraphContinuumMotion();
    graphState.continuumGesture = null;
    graphState.continuumPosition = 0;
    graphState.continuumVelocity = 0;
    continuum.classList.remove(...CONTINUUM_ARTICLE_CLASSES);
    if (article) {
      article.scrollTop = 0;
      article.setAttribute('aria-hidden', 'true');
    }
    graphState.continuumEntityId = null;
    configureGraphPhysics(state.sidebarGraph, state.isGraphExpanded);
    setMobileGraphControlShape(1);
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
    const slot = getEl('sidebar-graph-slot');
    if (!continuum) return;
    hideMobileGraphContinuumArticle();
    continuum.classList.remove('is-active');
    continuum.setAttribute('aria-hidden', 'true');
    releaseMobileGraphContinuumViewport();
    updateMobileGraphContinuumHeader(0);
    if (container) {
      if (slot && container.parentElement !== slot) {
        slot.appendChild(container);
      }
      container.classList.remove(...GRAPH_HOST_STATE_CLASSES);
      resetGraphContainerStyles(container);
      container.style.removeProperty('--mobile-continuum-control-lift');
      container.style.setProperty(
        '--mobile-graph-effective-control-opacity',
        container.style.getPropertyValue('--mobile-graph-control-opacity') || '0.35'
      );
    }
    document.body.classList.remove('graph-is-expanded', 'mobile-sidebar-graph-returning');
    state.isGraphExpanded = false;
    state.graphPhase = 'small';
    setMobileGraphExpansionProgress(0, false, 'article');
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
    const entries = getEntityTocEntries();
    renderEntitySiblings(entries, entries.find((e) => e.id === model.id), {
      view: article,
      rowId: 'mobile-continuum-siblings',
      onPick: openEntityInContinuum
    });

    graphState.continuumEntityId = model.id;
    article.setAttribute('aria-hidden', 'false');
    continuum.classList.add('has-article');
    setMobileGraphControlShape(1);
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
      if (article?.scrollTop < 1) article.scrollTop = 0;
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
        if (expandButton?.contains(target)) return;
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
          if ((article?.scrollTop > 0.5) || deltaY < 0) {
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
      : graphMs(420);
    const isStable = state.graphPhase === 'small' || state.graphPhase === 'expanded';
    if (targetState === state.isGraphExpanded && isStable) return Promise.resolve();
    if (!isStable) {
      return graphState.containerTransitionPromise.then(() => toggleGraphExpand(targetState, options));
    }

    graphState.containerTransitionPromise = (async () => {
      const isMobile = isMobileGraphViewport();
      const requestedDestination = options.destination === 'sidebar'
        || options.destination === 'article'
        ? options.destination
        : null;
      let effectiveDestination = requestedDestination || state.graphReturnSurface;
      if (isMobile && !targetState && !requestedDestination) {
        const continuum = getEl('mobile-graph-continuum');
        if (continuum?.classList.contains('has-article') && graphState.continuumEntityId) {
          commitMobileGraphContinuumReadingContext();
          effectiveDestination = 'article';
          state.graphReturnSurface = 'article';
        }
      }
      const collapseDestination = isMobile && !targetState
        ? effectiveDestination
        : null;
      const consumesSidebarOverlayLease = isMobile
        && !targetState
        && collapseDestination === 'sidebar'
        && isMobileGraphSidebarOverlayLeaseActive();
      const launcher = getEl('btn-mobile-graph-launcher');
      // Window morphing owns the camera. On desktop, any unfinished data
      // transition joins the exact same interpolation instead of snapping to
      // its endpoint before the viewport begins moving.
      cancelGraphCameraTransition();
      const coordinatedGraphTransition = isMobile
        ? null
        : pauseGraphLayoutTransitionForViewportMorph();
      if (isMobile) settleGraphLayoutTransitionNodes();
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
        // Prime the current article's root while expansion progress is still
        // zero. Its restrained selection growth then rides the same viewport
        // morph instead of popping on after the canvas has landed.
        syncMobileGraphContextRootFocus();
      }
      const sidebar = getEl('wiki-sidebar');
      if (targetState && isMobile) {
        state.graphReturnSurface = sidebar?.classList.contains('is-open') ? 'sidebar' : 'article';
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
        const isReadingEntity = Boolean(
          state.currentEntityId
          && getEl('view-entity')
          && getEl('view-entity').style.display === 'block'
        );
        const mobileContinuum = isMobile ? activateMobileGraphContinuum() : null;
        if (mobileContinuum && isReadingEntity && state.currentEntityId) {
          showMobileGraphContinuumArticle({ id: state.currentEntityId });
          graphState.continuumPosition = 0;
          updateMobileGraphContinuumProgress();
        } else if (mobileContinuum) {
          hideMobileGraphContinuumArticle();
        }
        const expandedSize = getExpandedGraphSize(isMobile);
        syncGraphRenderSize(state.sidebarGraph, expandedSize);
        const getExpandedTarget = () => {
          // Lock the responsive mode for this morph. A breakpoint change queues
          // one host/geometry handoff after the current interpolation completes.
          const size = getExpandedGraphSize(isMobile);
          return {
            left: isMobile ? 0 : getDesktopPageInsetLeft(),
            top: isMobile ? 0 : getHeaderHeight() + 8,
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
          isMobile || coordinatedGraphTransition
            ? (progress) => {
                if (isMobile) setMobileGraphExpansionProgress(progress, true);
                advanceGraphTransitionWithViewport(coordinatedGraphTransition, progress);
              }
            : null
        );
        if (coordinatedGraphTransition) coordinatedGraphTransition.commitFinal();
        state.graphPhase = 'expanded';
        if (isMobile) {
          setMobileGraphExpansionProgress(1, false);
          stabilizeMobileGraphContinuum();
          syncMobileGraphContextRootFocus();
          const continuum = getEl('mobile-graph-continuum');
          const hasArticle = continuum?.classList.contains('has-article');
          if (!hasArticle && (!state.graphContext || state.graphContext.mode !== 'entity')) {
            fitGraphToViewport(state.sidebarGraph, 0, {
              size: getExpandedGraphSize(true),
              expansionProgress: 1
            });
          }
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
        const sidebarWasOpen = Boolean(sidebar?.classList.contains('is-open'));
        const revealsSidebarGraph = isMobile
          && collapseDestination === 'sidebar'
          && !sidebarWasOpen;
        if (isMobile && collapseDestination === 'sidebar') {
          // The drawer establishes the final coordinate system immediately.
          // Its own translate must not compete with the one Canvas morph.
          if (!sidebar || !sidebar.classList.contains('is-open')) openMobileSidebar({ animate: false });
        } else if (returnsToArticleLauncher && sidebar?.classList.contains('is-open')) {
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
          isMobile || coordinatedGraphTransition
            ? (progress) => {
                if (isMobile) {
                  setMobileGraphExpansionProgress(progress, true, collapseDestination);
                }
                advanceGraphTransitionWithViewport(coordinatedGraphTransition, 1 - progress);
              }
            : null
        );
        if (coordinatedGraphTransition) coordinatedGraphTransition.commitFinal();

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
      if (targetState || !isMobileGraphViewport()) flushPendingGraphData();
      if (graphState.resizePending) scheduleGraphResizeSync();
    })();

    return graphState.containerTransitionPromise;
  }

  async function navigateFromGraphNode(entityId, options = {}) {
    const collapseGraph = options.collapseGraph !== false;
    const isMobile = isMobileGraphViewport();
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
        duration: graphMs(isMobile ? 180 : 420),
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
    const isMobileDevice = isMobileGraphViewport() || ('ontouchstart' in window && window.innerWidth <= 1080);
    if (!isMobileDevice) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTrackingGlobal = false;

    // 1. Global Horizontal Swipe (Main Reading Area Left -> Right)
    document.addEventListener('touchstart', (e) => {
      if (!isMobileGraphViewport() || e.touches.length !== 1) return;
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

      const isMobile = isMobileGraphViewport();
      if (!isMobile) return;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Horizontal Swipe Check
      if (absX > 60 && absX > absY * 1.3 && elapsed < 600) {
        const sidebar = getEl('wiki-sidebar');
        const isOpen = sidebar?.classList.contains('is-open');
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
    const flushMobileRender = Boolean(options?.flushMobileRender === true);
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
      if (!isMobileGraphViewport()) flushPendingGraphData();
      reconcileGraphContextForEnvironment();
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
          left: isMobileGraphViewport() ? 0 : getDesktopPageInsetLeft(),
          top: isMobileGraphViewport() ? 0 : 52,
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
      if (isMobileGraphContinuumStableReading() && article?.scrollTop > 2) {
        article.scrollTo({ top: 0, behavior: scrollBehavior() });
      } else if (continuum.classList.contains('has-article')) {
        if (article) article.scrollTop = 0;
        startMobileGraphContinuumSettle(0, 0);
      }
      return;
    }
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
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
        if (isMobileGraphViewport() && isMobileGraphContinuumActive()) {
          const continuum = getEl('mobile-graph-continuum');
          if (continuum?.classList.contains('has-article')) {
            const geometry = getMobileGraphContinuumGeometry();
            if (graphState.continuumPosition < geometry.travel * 0.5) {
              startMobileGraphContinuumSettle(geometry.travel);
              return;
            }
          }
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
          if (continuum?.classList.contains('has-article')) {
            const geometry = getMobileGraphContinuumGeometry();
            if (graphState.continuumPosition > geometry.travel * 0.5) {
              startMobileGraphContinuumSettle(0);
              syncMobileGraphContextRootFocus();
            } else {
              startMobileGraphContinuumSettle(geometry.travel);
            }
            return;
          }
          return;
        }
        closeMobileSidebar();

        const bookView = getEl('view-book');
        const isHomepage = (!state.currentEntityId) || (bookView?.style.display !== 'none');
        if (isHomepage) {
          clearEntityFocus();
          hideMobileGraphContinuumArticle();
          showOverviewGraphNow();
        }
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

  /* ==========================================================================
     P1: Browser & Mobile Gesture History Navigation (pushState & popstate)
     ========================================================================== */
  let isNavigatingFromHistory = false;

  function updateNavHistory(type, id) {
    if (isNavigatingFromHistory) return;
    if (id === 'view-entity') return;
    try {
      const hash = type === 'entity' ? `#${id}` : (type === 'view' ? `#${id}` : '#book');
      const stateData = { type, id, timestamp: Date.now() };
      if (window.location.hash !== hash) {
        window.history.pushState(stateData, '', hash);
      } else {
        window.history.replaceState(stateData, '', hash);
      }
    } catch (e) {
      // Ignore in restricted environments
    }
  }

  function initNavHistory(initialRoute) {
    window.addEventListener('popstate', (event) => {
      const stateData = event.state;
      isNavigatingFromHistory = true;
      try {
        if (stateData?.type === 'entity' && stateData.id && stateData.id !== 'view-entity') {
          openEntityArticle(stateData.id, { fromHistory: true });
        } else if (stateData?.type === 'view' && stateData.id && stateData.id !== 'view-entity') {
          showArticleView(stateData.id, { fromHistory: true });
        } else if (stateData?.type === 'book') {
          openBookOverview({ fromHistory: true });
        } else {
          const hash = (window.location.hash || '').replace(/^#/, '');
          if (hash === 'view-storyline' || hash === 'view-storyflow') {
            showArticleView(hash, { fromHistory: true });
          } else if (hash && hash !== 'book' && hash !== 'view-book' && hash !== 'view-entity') {
            openEntityArticle(hash, { fromHistory: true });
          } else {
            openBookOverview({ fromHistory: true });
          }
        }
      } finally {
        setTimeout(() => { isNavigatingFromHistory = false; }, 60);
      }
    });

    try {
      const route = initialRoute || getRouteFromHash();
      if (route.type === 'book') {
        window.history.replaceState({ type: 'book', id: 'view-book', timestamp: Date.now() }, '', '#book');
      } else {
        window.history.replaceState({ type: route.type, id: route.id, timestamp: Date.now() }, '', `#${route.id}`);
      }
    } catch (e) {}
  }

  function getRouteFromHash() {
    let hash = (window.location.hash || '').replace(/^#/, '');
    try {
      hash = decodeURIComponent(hash);
    } catch (e) {}
    if (hash === 'view-storyline' || hash === 'view-storyflow') {
      return { type: 'view', id: hash };
    }
    if (hash && hash !== 'book' && hash !== 'view-book' && hash !== 'view-entity') {
      const entityId = resolveEntityId(hash, getKnowledgeIndex());
      if (entityId) return { type: 'entity', id: entityId };
    }
    return { type: 'book', id: 'view-book' };
  }

  /* ==========================================================================
     P2: Bidirectional Entity Linking & Graph Camera Linking
     ========================================================================== */
  let cachedEntityLinkerData = null;

  function getEntityLinkerData() {
    if (cachedEntityLinkerData?.lang === state.lang) return cachedEntityLinkerData.entries;
    const index = getKnowledgeIndex();
    if (!index || !index.nodesById) return null;
    const entries = [];
    index.nodesById.forEach((node, id) => {
      const label = (isZh() ? entityName(id, '') : (node.label || '')).trim();
      if (label.length >= (isZh() ? 2 : 3)) {
        entries.push({ id, label });
      }
    });
    entries.sort((a, b) => b.label.length - a.label.length);
    cachedEntityLinkerData = { lang: state.lang, entries };
    return entries;
  }

  function enrichHtmlWithEntityLinks(rawHtml, currentEntityId, currentLabel) {
    if (!rawHtml || typeof rawHtml !== 'string') return rawHtml;
    const entries = getEntityLinkerData();
    if (!entries || !entries.length) return rawHtml;

    const normalizedCurrentId = String(currentEntityId || '').toLowerCase();
    const normalizedCurrentLabel = String(currentLabel || '').toLowerCase();

    const candidates = entries.filter((e) => {
      const lower = e.label.toLowerCase();
      return lower !== normalizedCurrentLabel && String(e.id).toLowerCase() !== normalizedCurrentId;
    });
    if (!candidates.length) return rawHtml;

    const labelToId = new Map();
    const escapedTerms = [];
    candidates.forEach((c) => {
      const escaped = c.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      escapedTerms.push(escaped);
      labelToId.set(c.label.toLowerCase(), c.id);
    });

    // Chinese has no word boundaries; match names as they stand.
    const regex = isZh()
      ? new RegExp(`(${escapedTerms.join('|')})`, 'g')
      : new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');
    const parts = rawHtml.split(/(<[^>]+>)/g);
    let inProtectedTag = false;
    let protectedTagName = '';

    for (let i = 0; i < parts.length; i += 1) {
      if (i % 2 === 1) {
        const tag = parts[i];
        const openMatch = tag.match(/^<\s*(a|pre|code|h[1-6]|button)[>\s]/i);
        const closeMatch = tag.match(/^<\/\s*(a|pre|code|h[1-6]|button)[>\s]/i);
        if (openMatch) {
          inProtectedTag = true;
          protectedTagName = openMatch[1].toLowerCase();
        } else if (closeMatch && closeMatch[1].toLowerCase() === protectedTagName) {
          inProtectedTag = false;
          protectedTagName = '';
        }
      } else if (!inProtectedTag && parts[i]?.trim()) {
        parts[i] = parts[i].replace(regex, (match) => {
          const id = labelToId.get(match.toLowerCase());
          if (!id) return match;
          return `<a href="javascript:void(0)" class="entity-mention-chip" data-entity-id="${id}">${match}</a>`;
        });
      }
    }

    return parts.join('');
  }

  function initEntityMentionInteractions() {
    document.addEventListener('click', async (e) => {
      const chip = e.target.closest('.entity-mention-chip');
      if (!chip) return;
      e.preventDefault();
      e.stopPropagation();
      const entityId = chip.getAttribute('data-entity-id');
      if (!entityId) return;

      const isMobile = isMobileGraphViewport();

      // If user is currently reading inside the mobile Continuum, update the Continuum in-place!
      if (isMobile && isMobileGraphContinuumActive()) {
        const model = getEntityArticleModel(entityId);
        if (model) {
          showMobileGraphContinuumArticle(model);
          commitMobileGraphContinuumReadingContext(model.id);
          const node = state.graphNodeMap?.get(model.id);
          if (node) {
            transitionMobileGraphFocus(state.sidebarGraph, node);
          } else {
            scheduleGraphForPage(createGraphContext('entity', model.id));
          }
          return;
        }
      }

      await prepareForPageNavigation();
      cancelGraphCameraTransition();
      graphState.focusedNode = null;
      graphState.hoverNode = null;
      openEntityArticle(entityId);
    });

    document.addEventListener('mouseover', (e) => {
      if (isMobileGraphViewport()) return;
      const chip = e.target.closest('.entity-mention-chip');
      if (!chip) return;
      const entityId = chip.getAttribute('data-entity-id');
      if (!entityId || !state.sidebarGraph || !state.graphNodeMap) return;
      const node = state.graphNodeMap.get(entityId);
      if (node && (!graphState.hoverNode || graphState.hoverNode.id !== entityId)) {
        graphState.hoverNode = node;
        requestGraphRedraw(state.sidebarGraph);
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (isMobileGraphViewport()) return;
      const chip = e.target.closest('.entity-mention-chip');
      if (!chip) return;
      if (graphState.hoverNode) {
        graphState.hoverNode = null;
        requestGraphRedraw(state.sidebarGraph);
      }
    });
  }

  function showArticleView(targetViewId, options = {}) {
    if (targetViewId !== 'view-entity') {
      state.currentEntityId = null;
      graphState.continuumEntityId = null;
      graphState.focusedNode = null;
      graphState.hoverNode = null;
      scheduleGraphForPage(createGraphContext('overview'));
      if (isMobileGraphViewport()) {
        deactivateMobileGraphContinuum();
      }
    }
    document.querySelectorAll('.wiki-article-view').forEach((v) => {
      v.style.display = 'none';
      v.classList.remove('active');
    });
    const targetEl = getEl(targetViewId);
    if (targetEl) {
      targetEl.style.display = 'block';
      targetEl.classList.add('active');
    }
    getEl('book-toc')?.__sync?.(targetViewId === 'view-book');
    if (targetViewId !== 'view-entity') getEl('entity-toc')?.__sync?.(false);

    const mainArticle = document.querySelector('.wiki-main-article');
    if (mainArticle) {
      if (targetViewId === 'view-storyline' || targetViewId === 'view-storyflow') {
        mainArticle.classList.add('wide-stage');
      } else {
        mainArticle.classList.remove('wide-stage');
      }
    }

    if (!options.fromHistory) {
      const type = targetViewId === 'view-book' ? 'book' : 'view';
      updateNavHistory(type, targetViewId);
    }

    window.scrollTo(0, 0);
    initIcons();
    closeMobileSidebar();
    playPageEnter(targetEl);
  }

  /* ==========================================================================
     Page and content motion (patterns adapted from transitions.dev)
     ========================================================================== */
  let pageEnterAnimations = [];

  // Page side-by-side: the incoming page slides 8px in from the right out of
  // a 3px blur. The old page leaves at once, so navigation never waits.
  function playPageEnter(viewEl) {
    pageEnterAnimations.forEach((animation) => animation.cancel());
    pageEnterAnimations = [];
    if (!canAnimate(viewEl)) return;
    const distance = motion.px('--page-slide-distance');
    const blur = motion.px('--page-blur');
    pageEnterAnimations.push(
      viewEl.animate(
        [{ transform: `translateX(${distance}px)`, filter: `blur(${blur}px)` }, { transform: 'none', filter: 'blur(0px)' }],
        { duration: motion.ms('--page-slide-dur'), easing: motion.ease('--page-slide-ease') }
      ),
      viewEl.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: motion.ms('--page-fade-dur'), easing: motion.ease('--page-fade-ease') }
      )
    );
  }

  // Text swap soft: content replaced in place cross-blurs, with no movement.
  function playSoftSwap(elements) {
    const duration = motion.ms('--text-soft-dur');
    const blur = motion.px('--text-soft-blur');
    elements.forEach((el) => {
      if (!canAnimate(el)) return;
      el.animate([
        { opacity: 0, filter: `blur(${blur}px)` },
        { opacity: 1, filter: 'blur(0px)' }
      ], { duration, easing: motion.ease('--text-soft-ease') });
    });
  }

  // Texts reveal: stacked lines rise 12px out of a blur, staggered.
  function playTextsReveal(elements) {
    const duration = motion.ms('--stagger-dur');
    const stagger = motion.ms('--stagger-stagger');
    const distance = motion.px('--stagger-distance');
    const blur = motion.px('--stagger-blur');
    elements.filter(Boolean).forEach((el, index) => {
      if (!canAnimate(el)) return;
      el.animate([
        { opacity: 0, transform: `translateY(${distance}px)`, filter: `blur(${blur}px)` },
        { opacity: 1, transform: 'none', filter: 'blur(0px)' }
      ], { duration, delay: index * stagger, easing: motion.ease('--stagger-ease'), fill: 'backwards' });
    });
  }

  // Skeleton reveal for images. A picture that is already decoded shows at
  // once; one still loading waits behind a pulsing frame and then fades in.
  function revealImage(img, host = img?.parentElement) {
    if (!img || !img.getAttribute('src')) return;
    const finish = () => {
      if (img.dataset.reveal === 'pending') img.dataset.reveal = 'shown';
      host?.classList.remove('is-media-loading');
    };
    if (img.complete && img.naturalWidth > 0) {
      if (img.dataset.reveal === 'pending') finish();
      return;
    }
    img.classList.add('is-swapping');
    img.dataset.reveal = 'pending';
    void img.offsetWidth;
    img.classList.remove('is-swapping');
    host?.classList.add('is-media-loading');
    img.addEventListener('load', finish, { once: true });
    img.addEventListener('error', finish, { once: true });
  }

  function initImageReveals() {
    document.querySelectorAll(
      '.infobox-media img, .storyflow-row-media img, .filmstrip-thumb img'
    ).forEach((img) => revealImage(img));
  }

  // Back to top only shows once there is somewhere to go back to.
  function initBackToTopVisibility() {
    const btn = getEl('btn-back-to-top');
    if (!btn) return;
    let frame = null;
    const sync = () => {
      frame = null;
      btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6);
    };
    window.addEventListener('scroll', () => {
      if (frame === null) frame = requestAnimationFrame(sync);
    }, { passive: true });
    sync();
  }

  /* Entity preview bubble (transitions.dev tooltip pattern): one bubble for
     every entity link. CSS owns the 80ms appear delay and the 50ms hide;
     while it is open, moving to another link glides the same bubble there.
     Links in running text are separated by words rather than sitting side by
     side like toolbar buttons, so leaving a link waits one --tt-delay before
     hiding, long enough to reach a neighbouring link and glide. */
  function initEntityPreview() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const GAP_PX = 8;
    const EDGE_PX = 16;
    const MAX_WIDTH_PX = 320;

    const bubble = document.createElement('div');
    bubble.className = 'entity-preview';
    bubble.id = 'entity-preview';
    bubble.setAttribute('role', 'tooltip');
    bubble.setAttribute('aria-hidden', 'true');
    bubble.dataset.show = 'false';
    bubble.innerHTML = `
      <div class="entity-preview-inner">
        <div class="entity-preview-media"><img alt="" decoding="async" /></div>
        <div class="entity-preview-body">
          <div class="entity-preview-title"></div>
          <div class="entity-preview-text"></div>
        </div>
      </div>`;
    document.body.appendChild(bubble);

    const inner = bubble.querySelector('.entity-preview-inner');
    const media = bubble.querySelector('.entity-preview-media');
    const image = media.querySelector('img');
    const titleEl = bubble.querySelector('.entity-preview-title');
    const textEl = bubble.querySelector('.entity-preview-text');
    const excerptCache = new Map();
    let hideTimer = null;
    let currentChip = null;
    let pointer = { x: 0, y: 0 };

    const isShowing = () => bubble.dataset.show === 'true';

    function excerptFor(model) {
      if (excerptCache.has(`${state.lang}_${model.id}`)) return excerptCache.get(`${state.lang}_${model.id}`);
      const scratch = document.createElement('div');
      scratch.innerHTML = model.html || '';
      const first = Array.from(scratch.querySelectorAll('p'))
        .map((p) => p.textContent.replace(/\s+/g, ' ').trim())
        .find((text) => text.length > 40) || scratch.textContent.replace(/\s+/g, ' ').trim();
      let text = first || '';
      if (text.length > 220) text = `${text.slice(0, 220).replace(/\s+\S*$/, '')}…`;
      excerptCache.set(`${state.lang}_${model.id}`, text);
      return text;
    }

    function fill(entityId) {
      const model = getEntityArticleModel(entityId);
      if (!model) return false;
      titleEl.textContent = model.name || model.label;
      textEl.textContent = excerptFor(model);
      if (model.imagePath) {
        if (image.getAttribute('src') !== model.imagePath) image.src = model.imagePath;
        media.style.display = '';
      } else {
        image.removeAttribute('src');
        media.style.display = 'none';
      }
      return true;
    }

    function anchorRect(chip) {
      const rects = Array.from(chip.getClientRects());
      return rects.find((r) => pointer.y >= r.top - 2 && pointer.y <= r.bottom + 2) || rects[0] || chip.getBoundingClientRect();
    }

    function place(chip) {
      const entityId = chip.getAttribute('data-entity-id');
      if (!entityId || !fill(entityId)) return;
      currentChip = chip;
      chip.setAttribute('aria-describedby', bubble.id);

      const width = Math.min(MAX_WIDTH_PX, window.innerWidth - EDGE_PX * 2);
      bubble.style.setProperty('--preview-w', `${width}px`);
      const height = Math.ceil(inner.getBoundingClientRect().height);
      const r = anchorRect(chip);
      const fitsBelow = r.bottom + GAP_PX + height <= window.innerHeight - EDGE_PX;
      const y = fitsBelow ? r.bottom + GAP_PX : Math.max(EDGE_PX, r.top - GAP_PX - height);
      const x = Math.max(EDGE_PX, Math.min(window.innerWidth - EDGE_PX - width, r.left + r.width / 2 - width / 2));
      const origin = `${Math.round(r.left + r.width / 2 - x)}px ${fitsBelow ? '0%' : '100%'}`;

      const apply = () => {
        bubble.style.setProperty('--preview-h', `${height}px`);
        bubble.style.setProperty('--preview-x', `${Math.round(x)}px`);
        bubble.style.setProperty('--preview-y', `${Math.round(y)}px`);
        bubble.style.setProperty('--preview-origin', origin);
      };

      if (isShowing()) {
        apply();
        playSoftSwap([inner]);
      } else {
        // Snap the geometry while hidden so only the appear plays.
        bubble.classList.add('is-placing');
        apply();
        void bubble.offsetWidth;
        bubble.classList.remove('is-placing');
        bubble.dataset.show = 'true';
        bubble.setAttribute('aria-hidden', 'false');
      }
    }

    function hide() {
      clearTimeout(hideTimer);
      hideTimer = null;
      if (currentChip) currentChip.removeAttribute('aria-describedby');
      currentChip = null;
      bubble.dataset.show = 'false';
      bubble.setAttribute('aria-hidden', 'true');
    }

    function request(chip) {
      clearTimeout(hideTimer);
      hideTimer = null;
      if (chip === currentChip && isShowing()) return;
      place(chip);
    }

    function release() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, motion.ms('--tt-delay'));
    }

    document.addEventListener('pointermove', (e) => {
      pointer = { x: e.clientX, y: e.clientY };
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const chip = e.target.closest?.('.entity-mention-chip');
      if (chip) request(chip);
    });
    document.addEventListener('pointerout', (e) => {
      const chip = e.target.closest?.('.entity-mention-chip');
      if (!chip) return;
      if (e.relatedTarget && chip.contains(e.relatedTarget)) return;
      release();
    });
    document.addEventListener('focusin', (e) => {
      const chip = e.target.closest?.('.entity-mention-chip');
      if (chip && chip.matches(':focus-visible')) request(chip);
    });
    document.addEventListener('focusout', (e) => {
      if (e.target.closest?.('.entity-mention-chip')) release();
    });
    document.addEventListener('click', hide, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hide();
    });
    window.addEventListener('scroll', () => {
      if (isShowing()) hide();
    }, { passive: true, capture: true });
    window.addEventListener('resize', hide, { passive: true });
  }

  function getEntityArticleModel(entityId) {
    if (!entityId) return null;
    const knowledgeIndex = getKnowledgeIndex();
    const resolvedEntityId = resolveEntityId(entityId, knowledgeIndex) || entityId;
    const foundNode = knowledgeIndex?.nodesById.get(resolvedEntityId);
    const label = foundNode ? foundNode.label : resolvedEntityId;
    const images = window.WIKI_STORE?.images || {};
    const imagePath = images[label] || images[resolvedEntityId] || images[entityId] || null;

    if (!window.__entityMdCache) window.__entityMdCache = new Map();
    const cacheKey = `${state.lang}_${resolvedEntityId}`;
    let html = window.__entityMdCache.get(cacheKey);
    if (html === undefined) {
      const articles = window.WIKI_STORE?.articles || {};
      const zhMarkdown = isZh() ? window.WIKI_ARTICLES_ZH?.[resolvedEntityId] : null;
      const markdown = zhMarkdown || articles[label] || articles[resolvedEntityId] || articles[entityId] || `## Overview\n\n**${label}** is a canonical entity in George Orwell's *Nineteen Eighty-Four*.\n\n## Narrative Significance\n\nDirectly interlinked with Winston Smith's psychological struggle, the surveillance apparatus of the Party, and the reality control of Ingsoc.`;

      const cleanMarkdown = markdown
        .replace(/^#\s+[^\n]+\n*/, '')
        .replace(/>\s+\*\*分类\/标签\*\*:[^\n]*\n*/gi, '')
        .replace(/>\s+\*\*源文件\*\*:[^\n]*\n*/gi, '')
        .replace(/^---\s*\n*/gm, '')
        .replace(/^#\s+[^\n]+\n*/, '')
        .replace(/##\s+(Related StoryFlow|相关\s*(StoryFlow|故事)[^\n]*)[\s\S]*$/i, '')
        .trim();
      html = enrichHtmlWithEntityLinks(renderMarkdown(cleanMarkdown), resolvedEntityId, zhMarkdown ? entityName(resolvedEntityId, label) : label);
      if (isZh() && !zhMarkdown) {
        html = `<p class="lang-fallback-note" lang="zh-CN">本词条暂无中文版，以下为英文原文。</p><div lang="en">${html}</div>`;
      }
      window.__entityMdCache.set(cacheKey, html);
    }

    return {
      id: resolvedEntityId,
      label,
      name: entityName(resolvedEntityId, label),
      imagePath,
      html
    };
  }

  function renderEntityArticleInto(model, targets) {
    if (!model || !targets) return false;
    if (targets.title) targets.title.textContent = model.name || model.label;
    if (targets.markdown) targets.markdown.innerHTML = model.html;

    if (targets.media && targets.image) {
      if (model.imagePath) {
        targets.image.src = model.imagePath;
        targets.image.alt = model.name || model.label;
        targets.media.style.display = '';
        targets.media.setAttribute('aria-hidden', 'false');
      } else if (targets.keepMedia) {
        // The entry page keeps its Readify and back buttons without a still.
        targets.image.removeAttribute('src');
        targets.image.alt = '';
        targets.media.style.display = '';
        targets.media.setAttribute('aria-hidden', 'false');
      } else {
        targets.image.removeAttribute('src');
        targets.image.alt = '';
        targets.media.style.display = 'none';
        targets.media.setAttribute('aria-hidden', 'true');
      }
      targets.media.classList.toggle('is-imageless', !model.imagePath);
    }
    return true;
  }

  function renderEntityPage(model) {
    renderEntityArticleInto(model, {
      title: getEl('view-entity-title'),
      media: getEl('view-entity-media'),
      image: getEl('view-entity-img'),
      markdown: getEl('view-entity-markdown'),
      keepMedia: true
    });
    revealImage(getEl('view-entity-img'));
    renderEntityDetailChrome(model.id);
    renderEntityToc(model.id);
  }

  // Entries in sidebar order, used by the prev/next arrows and the search palette.
  function getEntityTocEntries() {
    return Array.from(document.querySelectorAll('.entity-toc-link')).map((link) => {
      const group = link.closest('details.toc-cat-details');
      const category = group?.querySelector('summary .docs-link-label')?.textContent.trim() || '';
      return { id: link.getAttribute('data-id'), label: link.textContent.trim(), category, link };
    });
  }

  function singularCategory(category) {
    if (/ies$/.test(category)) return category.replace(/ies$/, 'y');
    if (/s$/.test(category) && !/ss$/.test(category)) return category.slice(0, -1);
    return category;
  }

  // Subtitle and prev/next arrows of an entity page.
  function renderEntityDetailChrome(entityId) {
    const entries = getEntityTocEntries();
    const index = entries.findIndex((entry) => entry.id === entityId);
    const entry = entries[index];
    const sub = getEl('view-entity-sub');
    if (sub) {
      sub.textContent = entry
        ? `${singularCategory(entry.category)} in Nineteen Eighty-Four`
        : 'An entry in Nineteen Eighty-Four';
    }
    renderEntitySiblings(entries, entry);
    const prev = getEl('btn-entity-prev');
    const next = getEl('btn-entity-next');
    if (prev) {
      prev.disabled = index <= 0;
      prev.dataset.target = index > 0 ? entries[index - 1].id : '';
    }
    if (next) {
      next.disabled = index < 0 || index >= entries.length - 1;
      next.dataset.target = index >= 0 && index < entries.length - 1 ? entries[index + 1].id : '';
    }
  }

  // Phones (transitions.dev detail pattern): a sideways row of the other
  // entries in the same category stands in for the prev/next arrows.
  // Same-category entries as a sideways pill row. The entry page and the
  // graph's second floor each keep one row; `onPick` opens the chosen entry.
  function renderEntitySiblings(entries, entry, options = {}) {
    const view = options.view || getEl('view-entity');
    const rowId = options.rowId || 'entity-siblings';
    if (!view) return;
    let row = getEl(rowId);
    if (!row) {
      row = document.createElement('nav');
      row.id = rowId;
      row.className = 'entity-siblings';
      const onPick = options.onPick || openEntityArticle;
      row.addEventListener('click', (event) => {
        const link = event.target.closest('a[data-id]');
        if (!link) return;
        event.preventDefault();
        if (link.getAttribute('aria-current') !== 'page') onPick(link.dataset.id);
      });
      view.insertBefore(row, view.firstElementChild);
    }
    row.setAttribute('aria-label', entry?.category || t('Entries'));
    const siblings = entry ? entries.filter((e) => e.category === entry.category) : [];
    row.hidden = siblings.length < 2;
    row.innerHTML = siblings.map((e) => (
      `<a href="#${e.id}" class="entity-sibling" data-id="${e.id}"${e.id === entry.id ? ' aria-current="page"' : ''}>${e.label.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</a>`
    )).join('');
    requestAnimationFrame(() => {
      const current = row.querySelector('[aria-current="page"]');
      if (current && row.clientWidth) {
        row.scrollLeft = current.offsetLeft - (row.clientWidth - current.offsetWidth) / 2;
      }
    });
  }

  // A pill on the second floor swaps the article in place, as a graph tap does.
  function openEntityInContinuum(entityId) {
    const model = getEntityArticleModel(entityId);
    if (!model || !showMobileGraphContinuumArticle(model)) return;
    commitMobileGraphContinuumReadingContext(model.id);
    const node = state.graphNodeMap?.get(model.id);
    if (node) transitionMobileGraphFocus(state.sidebarGraph, node);
  }

  function initEntityArrows() {
    ['btn-entity-prev', 'btn-entity-next'].forEach((id) => {
      const button = getEl(id);
      if (!button) return;
      button.addEventListener('click', async () => {
        const target = button.dataset.target;
        if (!target) return;
        await prepareForPageNavigation();
        openEntityArticle(target);
      });
    });
  }

  /* Contents lists in the sidebar. The book's sits under Overview and an
     entry's under its own link; each opens only while its page shows, stays
     on screen as you read, and a bar marks the section in view. */
  const sectionTocs = new Set();

  function bindSectionToc(toc) {
    const links = Array.from(toc.querySelectorAll('.book-toc-link'));
    const indicator = toc.querySelector('.book-toc-indicator');
    let lockUntil = 0;

    const mark = (link, instant = false) => {
      links.forEach((l) => {
        l.classList.toggle('is-current', l === link);
        if (l === link) l.setAttribute('aria-current', 'location');
        else l.removeAttribute('aria-current');
      });
      if (!indicator || !link) return;
      if (instant) indicator.style.transition = 'none';
      indicator.style.height = `${link.offsetHeight}px`;
      indicator.style.transform = `translateY(${link.offsetTop}px)`;
      if (instant) {
        indicator.getBoundingClientRect();
        indicator.style.transition = '';
      }
    };

    const scrollToSection = (link) => {
      const section = getEl(link.dataset.target);
      if (!section) return;
      lockUntil = performance.now() + 900;
      mark(link);
      const top = link === links[0]
        ? 0
        : section.getBoundingClientRect().top + window.scrollY - getHeaderHeight() - 24;
      window.scrollTo({ top, behavior: scrollBehavior() });
    };

    const spy = () => {
      if (!toc.classList.contains('is-open') || !toc.isConnected || performance.now() < lockUntil) return;
      const line = getHeaderHeight() + 120;
      let current = links[0];
      links.forEach((link) => {
        const section = getEl(link.dataset.target);
        if (section && section.getBoundingClientRect().top <= line) current = link;
      });
      if (current && !current.classList.contains('is-current')) mark(current);
    };
    const place = () => mark(links.find((l) => l.classList.contains('is-current')) || links[0], true);

    toc.__scrollTo = scrollToSection;
    toc.__spy = spy;
    toc.__place = place;
    toc.__sync = (open) => {
      toc.classList.toggle('is-open', open);
      if (open) requestAnimationFrame(() => { place(); spy(); });
    };
    sectionTocs.add(toc);
    return links;
  }

  function initSectionTocTracking() {
    let frame = 0;
    window.addEventListener('scroll', () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sectionTocs.forEach((toc) => toc.__spy());
      });
    }, { passive: true });
    const placeAll = () => sectionTocs.forEach((toc) => toc.isConnected && toc.__place());
    window.addEventListener('resize', placeAll);
    if (document.fonts?.ready) document.fonts.ready.then(placeAll);
  }

  function initBookToc() {
    const toc = getEl('book-toc');
    if (!toc) return;
    initSectionTocTracking();
    const links = bindSectionToc(toc);
    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        if (!getEl('view-book')?.classList.contains('active')) {
          getEl('btn-book-home')?.click();
          setTimeout(() => toc.__scrollTo(link), 350);
          return;
        }
        toc.__scrollTo(link);
        if (window.innerWidth <= 768) getEl('btn-sidebar-close')?.click();
      });
    });
    requestAnimationFrame(toc.__place);
    toc.__sync(Boolean(getEl('view-book')?.classList.contains('active')));
  }

  // Builds the entry's contents from its section headings and nests it under
  // the entry's own sidebar link.
  function renderEntityToc(entityId) {
    getEl('entity-toc')?.remove();
    sectionTocs.forEach((toc) => { if (!toc.isConnected) sectionTocs.delete(toc); });
    const markdown = getEl('view-entity-markdown');
    const anchor = document.querySelector(`.entity-toc-link[data-id="${entityId}"]`);
    if (!markdown || !anchor) return;
    let headings = Array.from(markdown.querySelectorAll('h2'));
    if (headings.length < 2) headings = Array.from(markdown.querySelectorAll('h2, h3'));
    if (!headings.length) return;

    const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    const used = new Set();
    const items = headings.map((heading, i) => {
      const base = slug(heading.textContent);
      let id = `entry-${base === 'section' ? `section-${i + 1}` : base}`;
      while (used.has(id)) id += '-x';
      used.add(id);
      heading.id = id;
      return { id, label: heading.textContent.trim() };
    });
    const article = getEl('view-entity');
    const lead = markdown.firstElementChild;
    const leadIsHeading = lead && headings.includes(lead);
    if (!leadIsHeading) items.unshift({ id: 'view-entity', label: t('Summary') });

    const toc = document.createElement('div');
    toc.className = 'book-toc entity-section-toc';
    toc.id = 'entity-toc';
    const nav = document.createElement('nav');
    nav.className = 'book-toc-inner';
    nav.setAttribute('aria-label', t('On this page'));
    nav.innerHTML = '<span class="book-toc-indicator" aria-hidden="true"></span>';
    items.forEach((item, index) => {
      const link = document.createElement('a');
      link.className = `book-toc-link${index === 0 ? ' is-current' : ''}`;
      link.href = `#${item.id}`;
      link.dataset.target = item.id;
      link.textContent = item.label;
      nav.appendChild(link);
    });
    toc.appendChild(nav);
    anchor.after(toc);
    if (article && !article.id) article.id = 'view-entity';

    const links = bindSectionToc(toc);
    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toc.__scrollTo(link);
        if (window.innerWidth <= 768) getEl('btn-sidebar-close')?.click();
      });
    });
    requestAnimationFrame(() => toc.__sync(true));
  }

  /* Search palette (Ctrl K): pages and every entity, filtered as you type. */
  function initSearchPalette() {
    const overlay = getEl('cmdk');
    const input = getEl('cmdk-input');
    const list = getEl('cmdk-list');
    const trigger = getEl('btn-search');
    if (!overlay || !input || !list) return;

    const pages = [
      { kind: 'page', id: 'btn-book-home', label: 'Overview', hint: 'Nineteen Eighty-Four', icon: 'book-open' },
      { kind: 'page', id: 'btn-storylines-hub', label: 'Storylines', hint: '89 scenes', icon: 'film' },
      { kind: 'page', id: 'btn-storyflow-hub', label: 'StoryFlow', hint: 'Three threads', icon: 'route' }
    ];
    let entities = null;
    document.addEventListener('readipedia:lang', () => { entities = null; });
    let results = [];
    let activeIndex = 0;
    let closeTimer = 0;
    let lastFocus = null;

    const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const render = () => {
      const query = input.value.trim().toLowerCase();
      if (!entities) {
        entities = getEntityTocEntries().map((e) => ({
          kind: 'entity',
          id: e.id,
          label: e.label,
          alt: e.link.dataset.en || '',
          hint: isZh() ? e.category : singularCategory(e.category),
          icon: 'shapes'
        }));
      }
      const match = (item) => !query
        || item.label.toLowerCase().includes(query)
        || (item.alt && item.alt.toLowerCase().includes(query))
        || item.hint.toLowerCase().includes(query);
      const pageHits = pages
        .map((page) => ({ ...page, label: t(page.label), hint: t(page.hint), alt: page.label }))
        .filter(match);
      const entityHits = entities.filter(match)
        .sort((a, b) => {
          if (!query) return 0;
          const aStarts = a.label.toLowerCase().startsWith(query) ? 0 : 1;
          const bStarts = b.label.toLowerCase().startsWith(query) ? 0 : 1;
          return aStarts - bStarts;
        })
        .slice(0, query ? 60 : 12);
      results = [...pageHits, ...entityHits];
      activeIndex = Math.min(activeIndex, Math.max(0, results.length - 1));

      if (!results.length) {
        list.innerHTML = `<div class="cmdk-empty">${t('No results')}</div>`;
        return;
      }
      let html = '';
      let i = 0;
      const group = (title, items) => {
        if (!items.length) return;
        html += `<div class="cmdk-group-label">${title}</div>`;
        items.forEach((item) => {
          html += `<div class="cmdk-item" role="option" id="cmdk-opt-${i}" data-index="${i}" aria-selected="${i === activeIndex}">`
            + `<i data-lucide="${item.icon}" class="cmdk-item-ic"></i>`
            + `<span class="cmdk-item-label">${escapeHtml(item.label)}</span>`
            + `<span class="cmdk-item-hint">${escapeHtml(item.hint)}</span></div>`;
          i += 1;
        });
      };
      group(t('Pages'), pageHits);
      group(t('Entries'), entityHits);
      list.innerHTML = html;
      input.setAttribute('aria-activedescendant', `cmdk-opt-${activeIndex}`);
      renderIcons(list);
    };

    const setActive = (index) => {
      if (!results.length) return;
      activeIndex = (index + results.length) % results.length;
      list.querySelectorAll('.cmdk-item').forEach((el) => {
        el.setAttribute('aria-selected', String(Number(el.dataset.index) === activeIndex));
      });
      input.setAttribute('aria-activedescendant', `cmdk-opt-${activeIndex}`);
      list.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    };

    const open = () => {
      clearTimeout(closeTimer);
      lastFocus = document.activeElement;
      overlay.hidden = false;
      input.value = '';
      activeIndex = 0;
      render();
      overlay.getBoundingClientRect();
      overlay.classList.add('is-open');
      input.focus();
    };
    const close = () => {
      if (overlay.hidden) return;
      overlay.classList.remove('is-open');
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => { overlay.hidden = true; }, motion.ms('--modal-close-dur'));
      if (lastFocus?.focus) lastFocus.focus({ preventScroll: true });
    };
    const choose = async (item) => {
      if (!item) return;
      close();
      if (item.kind === 'page') {
        getEl(item.id)?.click();
      } else {
        await prepareForPageNavigation();
        openEntityArticle(item.id);
      }
    };

    trigger?.addEventListener('click', open);
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) close();
    });
    input.addEventListener('input', () => { activeIndex = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(results[activeIndex]); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    list.addEventListener('mousemove', (e) => {
      const item = e.target.closest('.cmdk-item');
      if (item && Number(item.dataset.index) !== activeIndex) setActive(Number(item.dataset.index));
    });
    list.addEventListener('click', (e) => {
      const item = e.target.closest('.cmdk-item');
      if (item) choose(results[Number(item.dataset.index)]);
    });
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (overlay.hidden) open(); else close();
      } else if (e.key === '/' && !typing && overlay.hidden) {
        e.preventDefault();
        open();
      }
    });
    if (trigger && /Mac|iPhone|iPad/.test(navigator.platform)) {
      const kbd = trigger.querySelector('.nav-search-kbd');
      if (kbd) kbd.textContent = '⌘K';
    }
  }

  // Footer links reuse the sidebar entries.
  // The Readify links carry the border beam (libraries.dev) so the jump out
  // to the full book is the most visible action on a page.
  function initReadifyCtas() {
    if (!window.BorderBeam) return;
    document.querySelectorAll('.cta-beam').forEach((el) => window.BorderBeam.mount(el));
  }

  /* Readify apps. Fill in each store or download link here; an app with no
     link yet stays listed but does nothing, and the header button falls back
     to the web app. */
  const READIFY_APPS = {
    mac: '',
    windows: '',
    ios: '',
    android: '',
    extension: '',
    web: 'https://app.readifyai.com'
  };

  function detectReadifyPlatform() {
    const ua = navigator.userAgent || '';
    const platform = navigator.userAgentData?.platform || navigator.platform || '';
    if (/iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return 'mac';
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'windows';
    return null;
  }

  function initReadifyApps() {
    const device = detectReadifyPlatform();
    document.querySelectorAll('[data-app]').forEach((link) => {
      const url = READIFY_APPS[link.dataset.app];
      if (url) {
        link.href = url;
      } else {
        link.href = '#';
        link.removeAttribute('target');
        link.setAttribute('aria-disabled', 'true');
        link.addEventListener('click', (e) => e.preventDefault());
      }
      if (link.dataset.app === device) {
        link.classList.add('is-device');
        const hint = link.querySelector('.apps-item-hint');
        if (hint) hint.textContent = 'This device';
      }
    });

    // The header button offers the download for the reader's own device.
    const cta = getEl('nav-get-app');
    const label = getEl('nav-get-app-label');
    const labels = { mac: 'Download for Mac', windows: 'Download for Windows', ios: 'Get the app', android: 'Get the app' };
    if (cta && label) {
      if (device && READIFY_APPS[device] && labels[device]) {
        cta.href = READIFY_APPS[device];
        label.textContent = labels[device];
        // Show the platform's own mark (Apple, Windows, App Store, Android).
        const glyph = document.querySelector(`.apps-item[data-app="${device}"] .brand-glyph`);
        const icon = cta.querySelector('.nav-get-pro-icon');
        if (glyph && icon) {
          const mark = glyph.cloneNode(true);
          mark.classList.add('nav-get-pro-icon');
          icon.replaceWith(mark);
        }
      } else {
        cta.href = READIFY_APPS.web;
        label.textContent = 'Open Readify';
        cta.classList.add('no-icon');
      }
    }

    // Download menu: opens on hover or click, closes on leave, Esc or a click elsewhere.
    const wrap = getEl('nav-apps');
    const button = getEl('btn-nav-apps');
    const panel = getEl('nav-apps-panel');
    if (!wrap || !button || !panel) return;
    let openTimer = 0;
    let closeTimer = 0;
    let settleTimer = 0;
    const open = () => {
      clearTimeout(closeTimer);
      clearTimeout(settleTimer);
      panel.classList.remove('is-closing');
      panel.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      clearTimeout(openTimer);
      if (!panel.classList.contains('is-open')) return;
      panel.classList.add('is-closing');
      panel.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      settleTimer = setTimeout(() => panel.classList.remove('is-closing'), motion.ms('--dropdown-close-dur'));
    };
    const canHover = window.matchMedia?.('(hover: hover)').matches;
    if (canHover) {
      wrap.addEventListener('pointerenter', () => {
        clearTimeout(closeTimer);
        openTimer = setTimeout(open, 80);
      });
      wrap.addEventListener('pointerleave', () => {
        clearTimeout(openTimer);
        closeTimer = setTimeout(close, 160);
      });
    }
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (panel.classList.contains('is-open')) close();
      else open();
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) {
        close();
        button.focus();
      }
    });
  }

  function initEntityBackLink() {
    ['btn-entity-back', 'btn-continuum-back'].forEach((id) => {
      getEl(id)?.addEventListener('click', (event) => {
        event.preventDefault();
        getEl('btn-book-home')?.click();
      });
    });
  }

  function initFooterLinks() {
    document.querySelectorAll('[data-footer-nav]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        getEl(link.dataset.footerNav)?.click();
      });
    });
  }

  function activateEntityTocLink(entityId) {
    const tocLink = document.querySelector(`.entity-toc-link[data-id="${entityId}"]`);
    if (tocLink) {
      tocLink.classList.add('active');
      let parentDetails = tocLink.closest('details');
      while (parentDetails) {
        parentDetails.open = true;
        parentDetails.dataset.expanded = 'true';
        parentDetails = parentDetails.parentElement?.closest('details');
      }
    }
    return tocLink;
  }

  function openEntityArticle(entityId, options = {}) {
    const model = getEntityArticleModel(entityId);
    if (!model) {
      openBookOverview(options);
      return;
    }
    entityId = model.id;
    state.currentEntityId = model.id;

    if (!options.fromHistory) {
      updateNavHistory('entity', entityId);
    }

    if (isMobileGraphViewport()) {
      state.graphReturnSurface = 'article';
    }

    // Reset global graph state to prevent ghost/orphaned nodes from dimming the new graph
    graphState.focusedNode = null;
    graphState.hoverNode = null;

    // Reset sidebar scroll top to strictly prevent slot from shifting upwards
    const stickyWrap = document.querySelector('.wiki-sidebar-sticky');
    if (stickyWrap) stickyWrap.scrollTop = 0;

    // Highlight and scroll matching TOC link
    clearActiveNav();
    const tocLink = activateEntityTocLink(entityId);
    if (tocLink) {
      const sidebar = getEl('wiki-sidebar');
      if (sidebar?.classList.contains('is-open')) {
        tocLink.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
      }
    }

    const animateGraph = options.animateGraph === undefined
      ? !isMobileGraphViewport()
      : options.animateGraph;
    scheduleGraphForPage(createGraphContext('entity', entityId), { animate: animateGraph });

    renderEntityPage(model);

    if (isMobileGraphViewport()) {
      deactivateMobileGraphContinuum();
    }

    showArticleView('view-entity', { ...options, fromHistory: true });
  }

  function syncThemeButtons() {
    document.querySelectorAll('[data-set-theme]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.setTheme === state.theme));
    });
  }

  // Phone menu: language, theme and search live in the drawer, not the header.
  function initDrawerSettings() {
    document.querySelectorAll('[data-set-lang]').forEach((btn) => {
      btn.addEventListener('click', () => setLanguage(btn.dataset.setLang));
    });
    document.querySelectorAll('[data-set-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.setTheme !== state.theme) toggleTheme();
      });
    });
    syncThemeButtons();
    getEl('btn-drawer-search')?.addEventListener('click', () => {
      requestMobileSidebarState(false);
      getEl('btn-search')?.click();
    });
  }

  function toggleTheme() {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      state.theme = newTheme;
      document.documentElement.setAttribute('data-theme', newTheme);
      syncThemeButtons();
      if (state.sidebarGraph) {
        configureGraphPhysics(state.sidebarGraph, state.isGraphExpanded);
        if (state.sidebarGraph.refresh) state.sidebarGraph.refresh();
      }
    };
    // The whole page, graph canvas included, cross-fades between themes in one
    // motion instead of each surface switching on its own.
    if (document.startViewTransition && !prefersReducedMotion()) {
      document.startViewTransition(apply);
    } else {
      apply();
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
      if (!sidebar || !isMobileGraphViewport()) return Promise.resolve();

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
    if (sidebar) {
      if (isMobileGraphViewport()) {
        return requestMobileSidebarState(!sidebar.classList.contains('is-open'));
      }
      document.body.classList.toggle('sidebar-collapsed', sidebar.classList.toggle('collapsed'));
    }
  }

  // The sidebar is fixed, so a wheel over any part of it that is not its own
  // scrolling list (the graph preview, padding) would otherwise scroll the page.
  function initSidebarScrollIsolation() {
    const sidebar = getEl('wiki-sidebar');
    if (!sidebar) return;
    sidebar.addEventListener('wheel', (event) => {
      if (isMobileGraphViewport() || event.ctrlKey) return;
      if (!event.target.closest('.wiki-nav-hub')) event.preventDefault();
    }, { passive: false });
  }

  function initHeaderControls() {
    initSidebarScrollIsolation();
    const btnToggleSidebar = getEl('btn-toggle-sidebar');
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', toggleMobileSidebar);
      // transitions.dev menu button: the header stays above the open menu and
      // the same button morphs from two lines into a cross, then back.
      const drawer = getEl('wiki-sidebar');
      const syncBurger = () => {
        const open = Boolean(drawer?.classList.contains('is-open')) && isMobileGraphViewport();
        document.body.classList.toggle('menu-open', open);
        btnToggleSidebar.setAttribute('aria-expanded', String(open));
        btnToggleSidebar.setAttribute('aria-label', t(open ? 'Close menu' : 'Open menu'));
      };
      if (drawer) new MutationObserver(syncBurger).observe(drawer, { attributes: true, attributeFilter: ['class'] });
      window.addEventListener('readipedia:lang', syncBurger);
      syncBurger();
    }

    // Desktop: the button left of the logo folds the sidebar away and back.
    const btnCollapseSidebar = getEl('btn-collapse-sidebar');
    if (btnCollapseSidebar) {
      btnCollapseSidebar.addEventListener('click', () => {
        toggleMobileSidebar();
        const collapsed = getEl('wiki-sidebar')?.classList.contains('collapsed');
        btnCollapseSidebar.setAttribute('aria-expanded', String(!collapsed));
        btnCollapseSidebar.setAttribute('aria-label', t(collapsed ? 'Show sidebar' : 'Hide sidebar'));
        btnCollapseSidebar.setAttribute('title', t(collapsed ? 'Show sidebar' : 'Hide sidebar'));
      });
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
        if (document.body.classList.contains('menu-open')) requestMobileSidebarState(false);
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
      let closeTimer = null;
      const openLang = () => {
        clearTimeout(closeTimer);
        langDropdown.classList.remove('is-closing');
        langDropdown.classList.add('is-open');
        btnLang.setAttribute('aria-expanded', 'true');
      };
      // Menu dropdown close: shrink to 0.99 and fade, faster than it opened.
      const closeLang = () => {
        if (!langDropdown.classList.contains('is-open')) return;
        langDropdown.classList.add('is-closing');
        langDropdown.classList.remove('is-open');
        btnLang.setAttribute('aria-expanded', 'false');
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => langDropdown.classList.remove('is-closing'), motion.ms('--dropdown-close-dur'));
      };
      btnLang.setAttribute('aria-haspopup', 'true');
      btnLang.setAttribute('aria-expanded', 'false');
      btnLang.addEventListener('click', (e) => {
        e.stopPropagation();
        if (langDropdown.classList.contains('is-open')) closeLang();
        else openLang();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLang();
      });
      
      const langItems = langDropdown.querySelectorAll('.wiki-dropdown-item:not(.disabled)');
      langItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const selectedLang = item.getAttribute('data-lang');
          if (selectedLang !== state.lang) {
            setLanguage(selectedLang);
            const view = Array.from(document.querySelectorAll('.wiki-article-view'))
              .find((el) => el.style.display !== 'none' && el.offsetParent !== null);
            if (view) playSoftSwap(Array.from(view.querySelectorAll('.article-h1, .reading-section > h2, .prose, .detail-sub')));
          }
          closeLang();
        });
      });

      document.addEventListener('click', (e) => {
        if (!langContainer.contains(e.target)) closeLang();
      });
    }

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
