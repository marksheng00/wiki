/**
 * Library: the books home (#books) and one page per category
 * (#categories/<id>). Both are hub pages: every book, every category and the
 * popular entries link from here, and each category page links to the rest.
 * Data comes from window.READIPEDIA_LIBRARY (data/library.js); app.js owns
 * routing and history and announces each library page with 'readipedia:library'.
 * The one book this site hosts opens its wiki here; every other book opens on
 * readifyai.com.
 */
(function () {
  'use strict';

  const READIFY = 'https://readifyai.com';
  const HOME_PER_CATEGORY = 6;
  const ICON = {
    out: '<svg class="lib-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>',
    right: '<svg class="lib-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    left: '<svg class="lib-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    sort: '<svg class="lib-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M2 3.33H12.67V4.67H2V3.33ZM12.67 6.67V11.06L14 9.72L14.94 10.67L12 13.61L9.06 10.67L10 9.72L11.33 11.06V6.67H12.67ZM2 7.33H8V8.67H2V7.33ZM2 11.33H6.67V12.67H2V11.33Z" fill="currentColor"/></svg>',
    check: '<svg class="lib-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 8.4268L6.46155 11.19223L12 4.97001" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevron: '<svg class="lib-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'
  };

  const COPY = {
    en: {
      library: 'Library',
      allBooks: 'All books',
      categories: 'Categories',
      sub: (books, cats) => `Character maps, world wikis and reading guides for ${books} books across ${cats} categories.`,
      catSub: (n) => `${n} ${n === 1 ? 'book' : 'books'} with character maps, world wikis and reading guides.`,
      popular: 'Popular books',
      entries: 'Popular entries',
      moreEntries: 'More entries',
      viewAll: (n) => `View all ${n}`,
      sortLabel: 'Sort books',
      sorts: { default: 'Default', title: 'By title', author: 'By author' },
      moreOnReadify: 'More on Readify',
      type: { character: 'Character', location: 'Location', event: 'Event' },
      prevCat: 'Previous category',
      nextCat: 'Next category',
      openBook: (t) => `Open the ${t} wiki`,
      openReadify: (t) => `Open ${t} on Readify`,
      title: (page) => `${page} — Readipedia`,
      bookTitle: 'Nineteen Eighty-Four — Readipedia'
    },
    zh: {
      library: '书库',
      allBooks: '全部书籍',
      categories: '分类',
      sub: (books, cats) => `人物关系图谱、世界观百科与阅读指南，共 ${books} 本书，${cats} 个分类。`,
      catSub: (n) => `${n} 本书的人物关系图谱、世界观百科与阅读指南。`,
      popular: '热门书籍',
      entries: '热门词条',
      moreEntries: '更多词条',
      viewAll: (n) => `查看全部 ${n} 本`,
      sortLabel: '书籍排序',
      sorts: { default: '默认', title: '按书名', author: '按作者' },
      moreOnReadify: '在 Readify 查看更多',
      type: { character: '人物', location: '地点', event: '事件' },
      prevCat: '上一个分类',
      nextCat: '下一个分类',
      openBook: (t) => `进入《${t}》百科`,
      openReadify: (t) => `在 Readify 打开《${t}》`,
      title: (page) => `${page} — Readipedia`,
      bookTitle: '一九八四 — Readipedia'
    }
  };

  let page = 'all';
  let sort = 'default';

  // Follows the site language. Until app.js reports a switch, read the same
  // stored choice it starts from.
  let appLang = null;
  function lang() {
    if (appLang) return appLang;
    if (/^zh/i.test(document.documentElement.lang || '')) return 'zh';
    try {
      const saved = localStorage.getItem('readipedia-lang');
      if (saved === 'en' || saved === 'zh') return saved;
    } catch (e) { /* storage blocked */ }
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^zh\b/i.test(nav) ? 'zh' : 'en';
  }

  const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const data = () => window.READIPEDIA_LIBRARY;

  /* ---------- Model ---------- */

  // Every book as one shape; the hosted book leads its category and the
  // popular list.
  function allBooks() {
    const d = data();
    const local = d.local;
    const hosted = {
      slug: local.zh.title,
      cat: local.category,
      zh: [local.zh.title, local.zh.author],
      en: [local.en.title, local.en.author],
      cover: local.cover,
      local: true
    };
    return [hosted].concat(d.books);
  }

  function categoriesWithBooks() {
    const books = allBooks();
    return data().categories
      .map((cat) => ({ ...cat, books: books.filter((b) => b.cat === cat.id) }))
      .filter((cat) => cat.books.length);
  }

  function popularBooks() {
    const books = allBooks();
    const bySlug = new Map(books.map((b) => [b.slug, b]));
    return [books[0]].concat(data().popular.map((slug) => bySlug.get(slug)).filter(Boolean));
  }

  // Title and author sorts follow the reader's language (pinyin for Chinese).
  function sorted(books, l) {
    if (sort === 'default') return books;
    const collator = new Intl.Collator(l === 'zh' ? 'zh-Hans-CN-u-co-pinyin' : 'en', { sensitivity: 'base' });
    const at = sort === 'author' ? 1 : 0;
    return books.slice().sort((a, b) => collator.compare(a[l][at], b[l][at]) || collator.compare(a[l][0], b[l][0]));
  }

  const catHash = (id) => (id === 'all' ? '#books' : `#categories/${id}`);

  function bookHref(book, l) {
    if (book.local) return '#book';
    return `${READIFY}/${l}/books/${encodeURIComponent(l === 'zh' ? book.slug : book.en[0])}`;
  }

  function entryHref(entry, book, l) {
    const bookName = l === 'zh' ? book.slug : book.en[0];
    return `${READIFY}/${l}/books/${encodeURIComponent(bookName)}/wiki/${encodeURIComponent(entry[l][0])}`;
  }

  // A soft tint per book, taken from its title.
  function hue(text) {
    let h = 0;
    for (const ch of text) h = (h * 31 + ch.codePointAt(0)) % 360;
    return h;
  }

  /* ---------- Pieces ---------- */

  // A paper cover with the folded corner and window of the Readipedia mark.
  function cover(book, l) {
    if (book.local) {
      return `<span class="lib-cover lib-cover--image"><img src="${book.cover}" alt="" loading="lazy" decoding="async" /></span>`;
    }
    return `<span class="lib-cover" style="--cover-hue:${hue(book.slug)}"><span class="lib-cover-page">
      <span class="lib-cover-title">${esc(book[l][0])}</span>
      <span class="lib-cover-window"></span>
    </span></span>`;
  }

  // The hover arrow is glued to the title's last character, so it never
  // wraps onto a line of its own.
  function titleWithMark(title) {
    const chars = Array.from(title);
    const last = chars.pop() || '';
    return `${esc(chars.join(''))}<span class="lib-book-tail">${esc(last)}<span class="lib-book-out">${ICON.out}</span></span>`;
  }

  // A book is its cover with the title and author under it: no frame.
  function bookCard(book, l, c) {
    const [title, author] = book[l];
    const external = !book.local;
    const label = external ? c.openReadify(title) : c.openBook(title);
    return `<a class="lib-book" href="${bookHref(book, l)}"${external ? ' target="_blank" rel="noopener"' : ' data-lib-book'} aria-label="${esc(label)}">
      <span class="lib-book-cover" aria-hidden="true">${cover(book, l)}</span>
      <span class="lib-book-title">${external ? titleWithMark(title) : esc(title)}</span>
      <span class="lib-book-author">${esc(author)}</span>
    </a>`;
  }

  // On phones a home-page row scrolls sideways instead of wrapping.
  const cards = (books, l, c, row = false) => `<div class="lib-books${row ? ' lib-books--row' : ''}">${books.map((b) => bookCard(b, l, c)).join('')}</div>`;

  function sectionHead(title, action, id) {
    return `<div class="lib-section-head">
      <h2 class="lib-h2" id="${id}">${title}</h2>
      ${action || ''}
    </div>`;
  }

  // The transitions.dev library sort button and its dropdown, beside the
  // category arrows. Categories themselves are in the sidebar.
  function sortControl(c) {
    return `<div class="lib-sort-anchor">
        <button type="button" class="detail-arrow lib-sort" aria-label="${esc(c.sortLabel)}" aria-haspopup="menu" aria-expanded="false">${ICON.sort}</button>
        <div class="wiki-dropdown-menu lib-sort-menu" role="menu" aria-label="${esc(c.sortLabel)}">
          ${Object.keys(c.sorts).map((key) => `<button type="button" class="wiki-dropdown-item lib-sort-opt${sort === key ? ' active' : ''}" role="menuitemradio" data-sort="${key}" aria-checked="${sort === key}"><span>${esc(c.sorts[key])}</span>${ICON.check}</button>`).join('')}
        </div>
      </div>`;
  }

  /* ---------- Pages ---------- */

  // Entries of the book hosted here. These link within
  // the site, so they lead the popular entries.
  const LOCAL_ENTRIES = 21;
  function localEntries(l, c) {
    const nodes = Object.values(window.WIKI_STORE?.master?.knowledge_graph?.all_nodes || {});
    const zh = window.WIKI_STORE_ZH || {};
    const title = data().local[l].title;
    // Three of each main kind, best connected first, so the list mixes
    // people, places and ideas instead of filling up with one kind.
    const inbound = new Map();
    nodes.forEach((n) => (n?.targets || []).forEach((t) => inbound.set(t, (inbound.get(t) || 0) + 1)));
    const degree = (n) => (n.targets?.length || 0) + (inbound.get(n.id) || 0);
    const picked = ['Characters', 'Locations', 'Organizations', 'Events', 'Concepts', 'Objects', 'Rules']
      .flatMap((type) => nodes.filter((n) => n?.id && n.label && n.type === type).sort((a, b) => degree(b) - degree(a)).slice(0, 3));
    return picked
      .slice(0, LOCAL_ENTRIES)
      .map((n) => {
        const key = String(n.type || 'Concepts').toLowerCase().replace(/s$/, '');
        const name = l === 'zh' ? (zh.graph_labels?.[n.id] || n.label) : n.label;
        const type = l === 'zh' ? (zh.category_names?.[key] || '') : key.charAt(0).toUpperCase() + key.slice(1);
        return `<a class="lib-entry" href="#${esc(n.id)}" data-lib-entity="${esc(n.id)}">
        <span class="lib-entry-name">${esc(name)}</span>
        <span class="lib-entry-meta">${esc(title)}<span class="lib-dot" aria-hidden="true">·</span>${esc(type)}</span>
      </a>`;
      }).join('');
  }

  function homePage(l, c) {
    const cats = categoriesWithBooks();
    const total = allBooks().length;
    const books = allBooks();
    const bySlug = new Map(books.map((b) => [b.slug, b]));

    const entries = data().entries.map((e) => {
      const book = bySlug.get(e.book);
      const [name] = e[l];
      // One line per entry: a hub page earns more from more links than from
      // summaries that repeat the entry pages.
      return `<a class="lib-entry" href="${entryHref(e, book, l)}" target="_blank" rel="noopener">
        <span class="lib-entry-name">${esc(name)}</span>
        <span class="lib-entry-meta">${esc(book[l][0])}<span class="lib-dot" aria-hidden="true">·</span>${esc(c.type[e.type] || e.type)}</span>
      </a>`;
    }).join('');

    const catSections = cats.map((cat) => {
      const more = cat.books.length > HOME_PER_CATEGORY
        ? `<a class="lib-more" href="${catHash(cat.id)}" data-lib-cat="${cat.id}">${esc(c.viewAll(cat.books.length))}${ICON.chevron}</a>`
        : `<a class="lib-more" href="${catHash(cat.id)}" data-lib-cat="${cat.id}">${esc(cat[l])}${ICON.chevron}</a>`;
      return `<section class="lib-section" aria-labelledby="lib-cat-${cat.id}">
        ${sectionHead(`<a href="${catHash(cat.id)}" data-lib-cat="${cat.id}">${esc(cat[l])}</a>`, more, `lib-cat-${cat.id}`)}
        ${cards(cat.books.slice(0, HOME_PER_CATEGORY), l, c, true)}
      </section>`;
    }).join('');

    return `
      <header class="article-masthead detail-head">
        <div class="detail-title-row"><h1 class="article-h1 detail-title" id="library-title">${esc(c.library)}</h1></div>
        <p class="detail-sub">${esc(c.sub(total, cats.length))}</p>
      </header>

      <section class="lib-section lib-section--first" aria-labelledby="lib-popular-h">
        ${sectionHead(esc(c.popular), '', 'lib-popular-h')}
        ${cards(popularBooks(), l, c, true)}
      </section>

      <section class="lib-section" aria-labelledby="lib-entries-h">
        ${sectionHead(esc(c.entries), `<a class="lib-more" href="${READIFY}/${l}/hot-entries" target="_blank" rel="noopener">${esc(c.moreEntries)}${ICON.out}</a>`, 'lib-entries-h')}
        <div class="lib-entries">${localEntries(l, c)}${entries}</div>
      </section>

      ${catSections}
    `;
  }

  function categoryPage(id, l, c) {
    const cats = categoriesWithBooks();
    const index = cats.findIndex((cat) => cat.id === id);
    const cat = cats[index];
    const prev = cats[(index - 1 + cats.length) % cats.length];
    const next = cats[(index + 1) % cats.length];

    return `
      <header class="article-masthead detail-head">
        <div class="detail-title-row">
          <h1 class="article-h1 detail-title" id="library-title">${esc(cat[l])}</h1>
          <div class="detail-arrows">
            ${sortControl(c)}
            <a class="detail-arrow" href="${catHash(prev.id)}" data-lib-cat="${prev.id}" aria-label="${esc(`${c.prevCat}: ${prev[l]}`)}">${ICON.left}</a>
            <a class="detail-arrow" href="${catHash(next.id)}" data-lib-cat="${next.id}" aria-label="${esc(`${c.nextCat}: ${next[l]}`)}">${ICON.right}</a>
          </div>
        </div>
        <p class="detail-sub">${esc(c.catSub(cat.books.length))}</p>
      </header>

      <section class="lib-section lib-section--first" aria-labelledby="library-title">
        ${cards(sorted(cat.books, l), l, c)}
        <div class="lib-foot">
          <a class="lib-more" href="${READIFY}/${l}/categories/${cat.id}" target="_blank" rel="noopener">${esc(c.moreOnReadify)}${ICON.out}</a>
        </div>
      </section>
    `;
  }

  // Sidebar: the library's own contents, in the same rows as the book's.
  function renderNav(l, c) {
    const nav = document.getElementById('library-nav');
    if (!nav) return;
    const cats = categoriesWithBooks();
    const row = (id, label, count) => `<a href="${catHash(id)}" class="nav-hub-item docs-link${page === id ? ' active' : ''}" data-lib-cat="${id}"${page === id ? ' aria-current="page"' : ''}>
      <span class="docs-link-label">${esc(label)}</span><span class="docs-count">${count}</span></a>`;
    nav.innerHTML = `
      <div class="docs-group-label">${esc(c.library)}</div>
      ${row('all', c.allBooks, allBooks().length)}
      <div class="docs-group-label lib-nav-group">${esc(c.categories)}</div>
      ${cats.map((cat) => row(cat.id, cat[l], cat.books.length)).join('')}
    `;
  }

  // Texts reveal (transitions.dev): the books on screen rise 12px out of a
  // blur, 40ms apart. Off-screen ones are left alone.
  const motionVar = (name, fallback) => {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  function reveal(root, { withHead = false } = {}) {
    if (!root.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const duration = motionVar('--stagger-dur', 500);
    const stagger = motionVar('--stagger-stagger', 40);
    const distance = motionVar('--stagger-distance', 12);
    const blur = motionVar('--stagger-blur', 3);
    const easing = getComputedStyle(document.documentElement).getPropertyValue('--stagger-ease').trim() || 'cubic-bezier(0.22, 1, 0.36, 1)';
    const fold = window.innerHeight;
    const items = Array.from(root.querySelectorAll(withHead ? '.detail-head > *, .lib-book, .lib-entry, .lib-section-head' : '.detail-head > *, .lib-book'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < fold && r.right > 0 && r.left < window.innerWidth;
      })
      .slice(0, 24);
    items.forEach((el, i) => el.animate([
      { opacity: 0, transform: `translateY(${distance}px)`, filter: `blur(${blur}px)` },
      { opacity: 1, transform: 'none', filter: 'blur(0px)' }
    ], { duration, delay: i * stagger, easing, fill: 'backwards' }));
  }

  function render(how = {}) {
    const root = document.getElementById('view-library');
    if (!data() || !root) return;
    const l = lang();
    const c = COPY[l];
    if (page !== 'all' && !categoriesWithBooks().some((cat) => cat.id === page)) page = 'all';
    root.dataset.lang = l;
    root.dataset.page = page;
    root.innerHTML = page === 'all' ? homePage(l, c) : categoryPage(page, l, c);
    renderNav(l, c);
    syncTitle();
    if (how.inPlace) {
      window.scrollTo(0, 0);
      reveal(root, { withHead: page === 'all' });
    } else if (how.sorted) {
      reveal(root);
    }
  }

  function syncTitle() {
    const view = document.getElementById('view-library');
    if (!view?.classList.contains('active')) return;
    const c = COPY[lang()];
    const cat = categoriesWithBooks().find((x) => x.id === page);
    document.title = c.title(cat ? `${cat[lang()]} · ${c.library}` : c.library);
  }

  /* ---------- Navigation ---------- */

  function go(category) {
    if (window.ReadipediaNav) window.ReadipediaNav.openLibrary(category);
    else location.hash = catHash(category);
  }

  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const catLink = e.target.closest('[data-lib-cat]');
    if (catLink) {
      e.preventDefault();
      if (document.body.classList.contains('menu-open')) document.getElementById('btn-sidebar-close')?.click();
      go(catLink.dataset.libCat);
      return;
    }
    const entity = e.target.closest('[data-lib-entity]');
    if (entity && window.ReadipediaNav?.openEntity) {
      e.preventDefault();
      window.ReadipediaNav.openEntity(entity.dataset.libEntity);
      return;
    }
    const book = e.target.closest('[data-lib-book]');
    if (book) {
      e.preventDefault();
      if (window.ReadipediaNav) window.ReadipediaNav.openBook();
      else document.getElementById('btn-book-home')?.click();
    }
  }

  // The site's dropdown (transitions.dev menu): opens slower than it closes.
  function initSortMenu() {
    const root = document.getElementById('view-library');
    if (!root) return;
    let closeTimer = null;
    const menu = () => root.querySelector('.lib-sort-menu');
    const button = () => root.querySelector('.lib-sort');
    function close() {
      const m = menu();
      if (!m || !m.classList.contains('is-open')) return;
      m.classList.remove('is-open');
      m.classList.add('is-closing');
      button()?.setAttribute('aria-expanded', 'false');
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => m.classList.remove('is-closing'), motionVar('--dropdown-close-dur', 150));
    }
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.lib-sort');
      if (btn) {
        e.stopPropagation();
        const m = menu();
        if (m.classList.contains('is-open')) { close(); return; }
        clearTimeout(closeTimer);
        m.classList.remove('is-closing');
        m.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        m.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true });
        return;
      }
      const opt = e.target.closest('.lib-sort-opt');
      if (opt) {
        const next = opt.dataset.sort;
        close();
        if (next !== sort) {
          sort = next;
          render({ sorted: true });
          root.querySelector('.lib-sort')?.focus({ preventScroll: true });
        }
      }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.lib-sort-anchor')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  function init() {
    document.getElementById('view-library')?.addEventListener('click', onClick);
    document.getElementById('library-nav')?.addEventListener('click', onClick);

    document.addEventListener('readipedia:library', (e) => {
      const next = e.detail?.category || 'all';
      if (next !== page) sort = 'default';
      page = next;
      render({ inPlace: e.detail?.inPlace });
    });
    initSortMenu();
    document.addEventListener('readipedia:lang', () => {
      appLang = /^zh/i.test(document.documentElement.lang || '') ? 'zh' : 'en';
      render();
      if (!document.getElementById('view-library')?.classList.contains('active')) {
        document.title = COPY[lang()].bookTitle;
      }
    });

    // Leaving the library hands the tab title back to the book.
    const view = document.getElementById('view-library');
    if (view) {
      let wasActive = false;
      new MutationObserver(() => {
        const active = view.classList.contains('active');
        if (wasActive && !active) document.title = COPY[lang()].bookTitle;
        if (active) syncTitle();
        wasActive = active;
      }).observe(view, { attributes: true, attributeFilter: ['class'] });
    }

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
