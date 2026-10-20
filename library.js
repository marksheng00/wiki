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
      categories: 'Categories',
      popular: 'Popular books',
      entries: 'Popular entries',
      moreOnReadify: 'More on Readify',
      type: { character: 'Character', location: 'Location', event: 'Event' },
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
      moreOnReadify: '在 Readify 查看更多',
      type: { character: '人物', location: '地点', event: '事件' },
      openBook: (t) => `进入《${t}》百科`,
      openReadify: (t) => `在 Readify 打开《${t}》`,
      title: (page) => `${page} — Readipedia`,
      bookTitle: '一九八四 — Readipedia'
    }
  };

  let page = 'all';

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

  const catHash = (id) => (id === 'all' ? '#books' : id === 'entries' ? '#entries' : `#categories/${id}`);

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

  /* ---------- Pages ---------- */

  // Entries of the book hosted here, which link within the site. Kinds go
  // people first, then places and groups, then ideas; within a kind the best
  // connected entry comes first.
  const KIND_ORDER = ['Characters', 'Locations', 'Organizations', 'Events', 'Concepts', 'Objects', 'Rules', 'Expressions', 'States', 'Actions', 'Time', 'Creatures'];
  const HOME_PER_KIND = 4;
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
        typeLabel: l === 'zh' ? (zh.category_names?.[key] || '') : key.charAt(0).toUpperCase() + key.slice(1),
        entries: nodes.filter((n) => (n.type || 'Concepts') === type)
          .sort((a, b) => degree(b) - degree(a))
          .map((n) => ({ id: n.id, name: l === 'zh' ? (zh.graph_labels?.[n.id] || n.label) : n.label }))
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

  function readifyEntryRows(l, c, withBook = true) {
    const bySlug = new Map(allBooks().map((b) => [b.slug, b]));
    return data().entries.map((e) => {
      const book = bySlug.get(e.book);
      return entryRow(entryHref(e, book, l), e[l][0], withBook ? dotted(book[l][0], c.type[e.type] || e.type) : dotted(c.type[e.type] || e.type));
    }).join('');
  }

  function entryCount() {
    return localKinds('en').reduce((n, k) => n + k.entries.length, 0) + data().entries.length;
  }

  // The popular entries page: every entry of the hosted book by kind, then
  // the popular entries on Readify.
  function entriesPage(l, c) {
    const local = data().local[l].title;
    const kinds = localKinds(l);
    const readifyBook = allBooks().find((b) => b.slug === data().entries[0]?.book);
    const localTotal = kinds.reduce((n, k) => n + k.entries.length, 0);
    // Grouped by book, then by kind; the kind label replaces a per-row field.
    const groups = kinds.map((k) => `<div class="lib-kind">
          <h3 class="lib-kind-label" id="lib-kind-${k.key}">${esc(k.label)}<span class="lib-h2-count">${k.entries.length}</span></h3>
          <div class="lib-entries" aria-labelledby="lib-kind-${k.key}">${k.entries.map((e) => entryRow(`#${e.id}`, e.name, '', e.id)).join('')}</div>
        </div>`).join('');
    return `
      <header class="article-masthead detail-head">
        <div class="detail-title-row"><h1 class="article-h1 detail-title" id="library-title">${esc(c.entries)}</h1></div>
      </header>
      <section class="lib-section lib-section--first" aria-labelledby="lib-book-local">
        ${sectionHead(`<a href="#book" data-lib-book>${esc(local)}</a><span class="lib-h2-count">${localTotal}</span>`, '', 'lib-book-local')}
        ${groups}
      </section>
      <section class="lib-section" aria-labelledby="lib-readify-entries">
        ${sectionHead(`${esc(readifyBook ? readifyBook[l][0] : 'Readify')}<span class="lib-h2-count">${data().entries.length}</span>`, `<a class="lib-more" href="${READIFY}/${l}/hot-entries" target="_blank" rel="noopener">${esc(c.moreOnReadify)}${ICON.out}</a>`, 'lib-readify-entries')}
        <div class="lib-entries">${readifyEntryRows(l, c, false)}</div>
      </section>
    `;
  }


  function homePage(l, c) {
    const cats = categoriesWithBooks();
    const total = allBooks().length;
    const books = allBooks();
    const bySlug = new Map(books.map((b) => [b.slug, b]));

    const title = data().local[l].title;
    const entries = localKinds(l)
      .flatMap((k) => k.entries.slice(0, HOME_PER_KIND).map((e) => entryRow(`#${e.id}`, e.name, dotted(title, k.typeLabel), e.id)))
      .join('') + readifyEntryRows(l, c);

    const catSections = cats.map((cat) => {
      return `<section class="lib-section" aria-labelledby="lib-cat-${cat.id}">
        ${sectionHead(`<a href="${catHash(cat.id)}" data-lib-cat="${cat.id}">${esc(cat[l])}${ICON.chevron}</a>`, '', `lib-cat-${cat.id}`)}
        ${cards(cat.books.slice(0, HOME_PER_CATEGORY), l, c, true)}
      </section>`;
    }).join('');

    return `
      <header class="article-masthead detail-head">
        <div class="detail-title-row"><h1 class="article-h1 detail-title" id="library-title">${esc(c.library)}</h1></div>
      </header>

      <section class="lib-section lib-section--first" aria-labelledby="lib-popular-h">
        ${sectionHead(esc(c.popular), '', 'lib-popular-h')}
        ${cards(popularBooks(), l, c, true)}
      </section>

      <section class="lib-section" aria-labelledby="lib-entries-h">
        ${sectionHead(`<a href="#entries" data-lib-cat="entries">${esc(c.entries)}${ICON.chevron}</a>`, '', 'lib-entries-h')}
        <div class="lib-entries">${entries}</div>
      </section>

      ${catSections}
    `;
  }

  function categoryPage(id, l, c) {
    const cats = categoriesWithBooks();
    const index = cats.findIndex((cat) => cat.id === id);
    const cat = cats[index];

    return `
      <header class="article-masthead detail-head">
        <div class="detail-title-row">
          <h1 class="article-h1 detail-title" id="library-title">${esc(cat[l])}</h1>
        </div>
      </header>

      <section class="lib-section lib-section--first" aria-labelledby="library-title">
        ${cards(cat.books, l, c)}
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
      ${row('all', c.popular, popularBooks().length)}
      ${row('entries', c.entries, entryCount())}
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
    if (page !== 'all' && page !== 'entries' && !categoriesWithBooks().some((cat) => cat.id === page)) page = 'all';
    root.dataset.lang = l;
    root.dataset.page = page;
    root.innerHTML = page === 'all' ? homePage(l, c) : page === 'entries' ? entriesPage(l, c) : categoryPage(page, l, c);
    renderNav(l, c);
    syncTitle();
    if (how.inPlace) {
      window.scrollTo(0, 0);
      reveal(root, { withHead: page !== 'all' ? page === 'entries' : true });
    }
  }

  function syncTitle() {
    const view = document.getElementById('view-library');
    if (!view?.classList.contains('active')) return;
    const c = COPY[lang()];
    const cat = categoriesWithBooks().find((x) => x.id === page);
    const name = page === 'entries' ? c.entries : cat ? cat[lang()] : null;
    document.title = c.title(name ? `${name} · ${c.library}` : c.library);
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

  function init() {
    document.getElementById('view-library')?.addEventListener('click', onClick);
    document.getElementById('library-nav')?.addEventListener('click', onClick);

    document.addEventListener('readipedia:library', (e) => {
      const next = e.detail?.category || 'all';
      page = next;
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
