/**
 * Library: the books home (#all-books), popular books (#books) and one page per category
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
      categories: 'Categories',
      popular: 'Popular books',
      entries: 'Popular entries',
      allBooks: 'All books',
      allEntries: 'All entries',
      all: 'All',
      filterLabel: 'Filter',
      pages: 'Pages',
      pageN: (n) => `Page ${n}`,
      prevPage: 'Previous page',
      nextPage: 'Next page',
      openBook: (t) => `Open the ${t} wiki`,
      openReadify: (t) => `Open ${t} on Readify`,
      title: (page) => `${page} — Readipedia`,
      bookTitle: 'Nineteen Eighty-Four — Readipedia'
    },
    zh: {
      library: '书库',
      categories: '分类',
      popular: '热门书籍',
      entries: '热门词条',
      allBooks: '全部书籍',
      allEntries: '全部词条',
      all: '全部',
      filterLabel: '筛选',
      pages: '分页',
      pageN: (n) => `第 ${n} 页`,
      prevPage: '上一页',
      nextPage: '下一页',
      openBook: (t) => `进入《${t}》百科`,
      openReadify: (t) => `在 Readify 打开《${t}》`,
      title: (page) => `${page} — Readipedia`,
      bookTitle: '一九八四 — Readipedia'
    }
  };

  let page = 'all-books';
  let pageNum = 1;
  let filter = 'all';

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

  // Library tabs live at their own hashes; categories under #categories/.
  const TABS = { all: '#books', entries: '#entries', 'all-books': '#all-books', 'all-entries': '#all-entries' };
  const catHash = (id) => TABS[id] || `#categories/${id}`;

  function bookHref(book, l) {
    if (book.local) return '#book';
    return `${READIFY}/${l}/books/${encodeURIComponent(l === 'zh' ? book.slug : book.en[0])}`;
  }

  function entryHref(entry, book, l) {
    const bookName = l === 'zh' ? book.slug : book.en[0];
    return `${READIFY}/${l}/books/${encodeURIComponent(bookName)}/wiki/${encodeURIComponent(entry[l][0])}`;
  }

  /* ---------- Pieces ---------- */

  // A cover is a transitions.dev stage: the grey rounded panel the library
  // cards show their demo in, with the book's title in the middle.
  function cover(book, l) {
    if (book.local) {
      return `<span class="lib-cover lib-cover--image"><img src="${book.cover}" alt="" loading="lazy" decoding="async" /></span>`;
    }
    return `<span class="lib-cover"><span class="lib-cover-title">${esc(book[l][0])}</span></span>`;
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

  /* ---------- Pages ---------- */

  // Entries of the book hosted here, which link within the site. Kinds go
  // people first, then places and groups, then ideas; within a kind the best
  // connected entry comes first.
  const KIND_ORDER = ['Characters', 'Locations', 'Organizations', 'Events', 'Concepts', 'Objects', 'Rules', 'Expressions', 'States', 'Actions', 'Time', 'Creatures'];
  function localKinds(l) {
    const nodes = Object.values(window.WIKI_STORE?.master?.knowledge_graph?.all_nodes || {}).filter((n) => n?.id && n.label);
    const zh = window.WIKI_STORE_ZH || {};
    const inbound = new Map();
    nodes.forEach((n) => (n.targets || []).forEach((t) => inbound.set(t, (inbound.get(t) || 0) + 1)));
    const degree = (n) => (n.targets?.length || 0) + (inbound.get(n.id) || 0);
    const kinds = Array.from(new Set(nodes.map((n) => n.type || 'Concepts')))
      .sort((a, b) => (KIND_ORDER.indexOf(a) + 1 || 99) - (KIND_ORDER.indexOf(b) + 1 || 99));
    return kinds.map((type) => {
      const key = String(type).toLowerCase().replace(/s$/, '');
      return {
        key,
        label: l === 'zh' ? (zh.category_names?.[key] || type) : type,
        entries: nodes.filter((n) => (n.type || 'Concepts') === type)
          .sort((a, b) => degree(b) - degree(a))
          .map((n) => ({ id: n.id, rank: degree(n), name: l === 'zh' ? (zh.graph_labels?.[n.id] || n.label) : n.label }))
      };
    }).filter((k) => k.entries.length);
  }

  // One line per entry: a hub page earns more from more links than from
  // summaries that repeat the entry pages.
  function entryRow(href, name, meta, internalId) {
    const attrs = internalId ? ` data-lib-entity="${esc(internalId)}"` : ' target="_blank" rel="noopener"';
    return `<a class="lib-entry" href="${esc(href)}"${attrs}>
        <span class="lib-entry-name">${esc(name)}</span>
        ${meta ? `<span class="lib-entry-meta">${meta}</span>` : ''}
      </a>`;
  }
  const dotted = (...parts) => parts.filter(Boolean).map(esc).join('<span class="lib-dot" aria-hidden="true">·</span>');



  function entryCount() {
    return localKinds('en').reduce((n, k) => n + k.entries.length, 0) + data().entries.length;
  }

  // The popular entries page: every entry of the hosted book by kind, then
  // the popular entries on Readify.
  // Entries across books, one flat list: each row is the entry and its book.
  // Popular entries take turns between books, best first, so no book fills a
  // run; all entries go in name order.
  function entryItems(l) {
    const local = data().local[l].title;
    const localItems = localKinds(l)
      .flatMap((k) => k.entries.map((e) => ({ kind: k.key, rank: e.rank, name: e.name, html: entryRow(`#${e.id}`, e.name, dotted(local), e.id) })))
      .sort((a, b) => b.rank - a.rank);
    const bySlug = new Map(allBooks().map((b) => [b.slug, b]));
    const readifyItems = data().entries.map((e) => {
      const book = bySlug.get(e.book);
      return { kind: e.type, name: e[l][0], html: entryRow(entryHref(e, book, l), e[l][0], dotted(book[l][0])) };
    });
    const mixed = [];
    for (let i = 0; i < Math.max(localItems.length, readifyItems.length); i += 1) {
      if (localItems[i]) mixed.push(localItems[i]);
      if (readifyItems[i]) mixed.push(readifyItems[i]);
    }
    return mixed;
  }

  // The transitions.dev library filter: one capsule per kind, the current one
  // filled. It filters in place; paging starts again from page 1.
  function filterBar(options, c) {
    if (options.length < 2) return '';
    const pill = (key, label) => `<button type="button" class="td-filter" data-filter="${esc(key)}" data-active="${filter === key}" aria-pressed="${filter === key}">${esc(label)}</button>`;
    return `<div class="td-filters lib-filters" role="group" aria-label="${esc(c.filterLabel)}">${pill('all', c.all)}${options.map((o) => pill(o.key, o.label)).join('')}</div>`;
  }
  const applyFilter = (items, keyOf) => (filter === 'all' ? items : items.filter((x) => keyOf(x) === filter));

  function entryKindOptions(items, l) {
    const zh = window.WIKI_STORE_ZH || {};
    const present = new Set(items.map((x) => x.kind));
    const order = KIND_ORDER.map((t) => t.toLowerCase().replace(/s$/, ''));
    return Array.from(present)
      .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
      .map((key) => ({ key, label: l === 'zh' ? (zh.category_names?.[key] || key) : `${key.charAt(0).toUpperCase()}${key.slice(1)}s` }));
  }

  function bookCatOptions(books, l) {
    const present = new Set(books.map((b) => b.cat));
    return data().categories.filter((cat) => present.has(cat.id)).map((cat) => ({ key: cat.id, label: cat[l] }));
  }

  function entriesPage(l, c) {
    const all = entryItems(l);
    const rows = applyFilter(all, (x) => x.kind).slice(0, POPULAR_ENTRIES).map((x) => x.html);
    return `
      <h1 class="lib-sr-only" id="library-title">${esc(c.entries)}</h1>
      ${filterBar(entryKindOptions(all, l), c)}
      <div class="lib-entries">${rows.join('')}</div>
    `;
  }

  function allEntriesPage(l, c) {
    const collator = new Intl.Collator(l === 'zh' ? 'zh-Hans-CN-u-co-pinyin' : 'en', { sensitivity: 'base' });
    const all = entryItems(l).slice().sort((a, b) => collator.compare(a.name, b.name));
    const { shown, nav } = paged(applyFilter(all, (x) => x.kind), ENTRIES_PER_PAGE, 'all-entries', c);
    return `
      <h1 class="lib-sr-only" id="library-title">${esc(c.allEntries)}</h1>
      ${filterBar(entryKindOptions(all, l), c)}
      <div class="lib-entries">${shown.map((x) => x.html).join('')}</div>
      ${nav}
    `;
  }

  // All books: every book, flat and paged, like popular books.
  function allBooksPage(l, c) {
    const books = allBooks();
    const { shown, nav } = paged(applyFilter(books, (b) => b.cat), ALL_BOOKS_PER_PAGE, 'all-books', c);
    return `
      <h1 class="lib-sr-only" id="library-title">${esc(c.allBooks)}</h1>
      ${filterBar(bookCatOptions(books, l), c)}
      ${cards(shown, l, c)}
      ${nav}
    `;
  }




  // Popular books: just the books, laid out flat. The heading is for screen
  // readers and search engines only; the sidebar already names the page.
  function homePage(l, c) {
    const books = popularBooks();
    return `
      <h1 class="lib-sr-only" id="library-title">${esc(c.popular)}</h1>
      ${filterBar(bookCatOptions(books, l), c)}
      ${cards(applyFilter(books, (b) => b.cat), l, c)}
    `;
  }

  // A category is paged; page 1 lives at #categories/<id>, the rest at
  // #categories/<id>/<n>, so every page is its own link.
  const PER_PAGE = 12;
  const ALL_BOOKS_PER_PAGE = 24;
  const ENTRIES_PER_PAGE = 60;
  const POPULAR_ENTRIES = 30;
  const pageHash = (id, n) => (n > 1 ? `${catHash(id)}/${n}` : catHash(id));

  function pager(id, current, total, c) {
    if (total < 2) return '';
    const link = (n, label, cls, aria) => `<a class="${cls}" href="${pageHash(id, n)}" data-lib-cat="${id}${n > 1 ? `/${n}` : ''}"${aria}>${label}</a>`;
    const pages = Array.from({ length: total }, (_, i) => i + 1).map((n) => (n === current
      ? `<span class="lib-page is-current" aria-current="page">${n}</span>`
      : link(n, n, 'lib-page', ` aria-label="${esc(c.pageN(n))}"`))).join('');
    const prev = current > 1 ? link(current - 1, ICON.left, 'detail-arrow lib-page-step', ` aria-label="${esc(c.prevPage)}"`) : `<span class="detail-arrow lib-page-step is-disabled" aria-hidden="true">${ICON.left}</span>`;
    const next = current < total ? link(current + 1, ICON.right, 'detail-arrow lib-page-step', ` aria-label="${esc(c.nextPage)}"`) : `<span class="detail-arrow lib-page-step is-disabled" aria-hidden="true">${ICON.right}</span>`;
    return `<nav class="lib-pager" aria-label="${esc(c.pages)}">${prev}<div class="lib-pages">${pages}</div>${next}</nav>`;
  }

  function paged(items, per, id, c) {
    const total = Math.max(1, Math.ceil(items.length / per));
    const current = Math.min(Math.max(1, pageNum), total);
    return { shown: items.slice((current - 1) * per, current * per), nav: pager(id, current, total, c) };
  }

  function categoryPage(id, l, c) {
    const cat = categoriesWithBooks().find((x) => x.id === id);
    const { shown, nav } = paged(cat.books, PER_PAGE, id, c);
    return `
      <header class="article-masthead detail-head">
        <div class="detail-title-row">
          <h1 class="article-h1 detail-title" id="library-title">${esc(cat[l])}</h1>
        </div>
      </header>
      ${cards(shown, l, c)}
      ${nav}
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
      ${row('all-books', c.allBooks, allBooks().length)}
      ${row('all', c.popular, popularBooks().length)}
      ${row('all-entries', c.allEntries, entryCount())}
      ${row('entries', c.entries, Math.min(POPULAR_ENTRIES, entryCount()))}
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
    const items = Array.from(root.querySelectorAll(withHead ? '.detail-head > *, .lib-book, .lib-entry' : '.lib-book, .lib-entry'))
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
    if (!(page in TABS) && !categoriesWithBooks().some((cat) => cat.id === page)) page = 'all-books';
    root.dataset.lang = l;
    root.dataset.page = page;
    const pages = { all: homePage, entries: entriesPage, 'all-books': allBooksPage, 'all-entries': allEntriesPage };
    root.innerHTML = (pages[page] || ((ll, cc) => categoryPage(page, ll, cc)))(l, c);
    renderNav(l, c);
    syncTitle();
    if (how.filtered) {
      reveal(root);
    } else if (how.inPlace) {
      window.scrollTo(0, 0);
      reveal(root, { withHead: true });
    }
  }

  function syncTitle() {
    const view = document.getElementById('view-library');
    if (!view?.classList.contains('active')) return;
    const c = COPY[lang()];
    const cat = categoriesWithBooks().find((x) => x.id === page);
    const tab = { all: c.popular, entries: c.entries, 'all-books': c.allBooks, 'all-entries': c.allEntries }[page];
    const base = tab || (cat ? cat[lang()] : c.popular);
    const name = pageNum > 1 ? `${base} · ${c.pageN(pageNum)}` : base;
    document.title = c.title(name ? `${name} · ${c.library}` : c.library);
  }

  /* ---------- Navigation ---------- */

  function go(category) {
    if (window.ReadipediaNav) window.ReadipediaNav.openLibrary(category);
    else location.hash = catHash(category);
  }

  function onFilter(e) {
    const pill = e.target.closest('.td-filter');
    if (!pill) return false;
    const next = pill.dataset.filter;
    if (next === filter) return true;
    filter = next;
    if (pageNum > 1) {
      // Page numbers belong to the old filter; go back to the tab's page 1.
      go(page);
    } else {
      render({ filtered: true });
    }
    return true;
  }

  function onClick(e) {
    if (onFilter(e)) return;
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

  function init() {
    document.getElementById('view-library')?.addEventListener('click', onClick);
    document.getElementById('library-nav')?.addEventListener('click', onClick);

    document.addEventListener('readipedia:library', (e) => {
      const [next, n] = String(e.detail?.category || 'all-books').split('/');
      if (next !== page) filter = 'all';
      page = next;
      pageNum = Number(n) || 1;
      render({ inPlace: e.detail?.inPlace });
    });
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
