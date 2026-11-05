// Promo dialog: bilingual A/B copy, countdown, when to show it, how often,
// closing, and tracking. The markup lives in index.html.
//
// When: only to a reader who is already engaged, and only at a quiet moment.
//   - they opened a second page on the site and stayed on it a few seconds,
//   - or they stayed on one page for a while (also covers StoryFlow, which
//     barely scrolls),
//   - or, on desktop, the pointer heads for the tab bar after a short stay.
//   Then it waits until nothing else is open, no text is selected and the
//   reader has stopped scrolling for a moment.
// How often: once per visit at most; not again for a few days after a
//   close; never again after the call to action is clicked; a cap per
//   campaign. Not at all once the offer has ended.
// Preview: ?promo=<variant> shows it at once and skips every rule.
(function () {
  var modal = document.getElementById('promo-modal');
  if (!modal) return;
  var dialog = modal.querySelector('.promo-dialog');

  var CAMPAIGN = 'free-2026';
  var RULES = {
    secondPageSeconds: 5,  // on the 2nd page or later, after this long
    singlePageSeconds: 25, // or on any one page, after this long
    exitIntentSeconds: 8,  // desktop: pointer leaves for the tab bar after this long
    quietMs: 800,          // no scrolling for this long before it opens
    snoozeDays: 3,         // after a close, wait this long
    maxShows: 3            // per campaign, per browser
  };

  // A/B copy: each reader is randomly given one variant and keeps it.
  var VARIANT_KEY = 'readipedia-promo-variant';
  var STATE_KEY = 'readipedia-promo-' + CAMPAIGN;
  var VARIANTS = {
    voices: {
      zh: { title: '限时免费：一本书，一整个剧组为你朗读', sub: '旁白和每个角色各有其声，听书像听广播剧。', cta: '免费试听' },
      en: { title: 'Free for now: a full cast reads your book', sub: 'A narrator plus a voice for every character, like an audio drama.', cta: 'Listen free' }
    },
    library: {
      zh: { title: '千万本好书，限时免费读、免费听', sub: '打开就能读，点一下就能听。', cta: '免费去读' },
      en: { title: 'Ten million books, free to read and hear', sub: 'Open one and read, or press play and listen.', cta: 'Browse free' }
    },
    claude: {
      zh: { title: '限时免费：和 Claude 聊你正在读的书', sub: '人物、情节、观点，读到哪问到哪。', cta: '免费开聊' },
      en: { title: 'Free for now: talk to Claude about your book', sub: 'Ask about characters, plot and ideas as you read.', cta: 'Chat free' }
    },
    import: {
      zh: { title: '你的书和文章，都能导进来听', sub: '电子书、PDF、网页和博客文章，导入就能朗读，限时免费。', cta: '免费导入' },
      en: { title: 'Bring any book or article and listen', sub: 'Ebooks, PDFs, web pages and blog posts, read aloud. Free for now.', cta: 'Import free' }
    },
    all: {
      zh: { title: 'Readify 限时免费，全部功能开放', sub: '多角色朗读、千万书库、和 Claude 聊书，无需绑卡。', cta: '免费领取' },
      en: { title: 'Readify is free for a limited time', sub: 'Full-cast narration, ten million books and Claude chat. No card needed.', cta: 'Get it free' }
    }
  };
  var UI = {
    zh: { label: '距活动结束', close: '关闭', days: '天' },
    en: { label: 'Ends in', close: 'Close', days: 'd' }
  };

  // app.js rewrites the address before this file runs, so the inline script
  // in <head> keeps the original query for the preview switch.
  var query = window.__promoQuery != null ? window.__promoQuery : location.search;
  var forced = (query.match(/[?&]promo=([a-z]+)/) || [])[1];
  var preview = !!forced;

  function store(kind) {
    try { return window[kind]; } catch (e) { return null; }
  }
  function readJSON(kind, key) {
    try { return JSON.parse(store(kind).getItem(key)) || {}; } catch (e) { return {}; }
  }
  function writeJSON(kind, key, value) {
    try { store(kind).setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
  }

  function pickVariant() {
    if (forced && VARIANTS[forced]) return forced;
    var saved = null;
    try { saved = localStorage.getItem(VARIANT_KEY); } catch (e) { /* storage blocked */ }
    if (saved && VARIANTS[saved]) return saved;
    var ids = Object.keys(VARIANTS);
    var id = ids[Math.floor(Math.random() * ids.length)];
    try { localStorage.setItem(VARIANT_KEY, id); } catch (e) { /* storage blocked */ }
    return id;
  }

  var variant = pickVariant();
  modal.dataset.variant = variant;
  var end = Date.parse(modal.dataset.end || '');
  var state = readJSON('localStorage', STATE_KEY); // { shows, closedAt, clickedAt }
  var session = readJSON('sessionStorage', STATE_KEY); // { shown, pages }

  function lang() {
    return /^zh/i.test(document.documentElement.lang || '') ? 'zh' : 'en';
  }

  // Which page the reader is on, for the events.
  function pageType() {
    var view = document.querySelector('.wiki-article-view.active');
    return view ? view.id.replace(/^view-/, '') : 'unknown';
  }

  // Every event goes to dataLayer and to a readipedia:promo DOM event, with
  // the same fields, so any analytics on the page can take them.
  function track(action, extra) {
    var data = {
      campaign: CAMPAIGN,
      surface: 'modal',
      variant: variant,
      action: action,
      page_type: pageType(),
      lang: lang(),
      show_n: state.shows || 0,
      preview: preview
    };
    for (var k in extra) data[k] = extra[k];
    var row = { event: 'promo_' + action };
    for (var key in data) row['promo_' + key] = data[key];
    try { (window.dataLayer = window.dataLayer || []).push(row); } catch (e) {}
    document.dispatchEvent(new CustomEvent('readipedia:promo', { detail: data }));
  }

  /* ---------- copy and countdown ---------- */

  var cta = modal.querySelector('.promo-cta');
  try {
    var url = new URL(cta.href);
    url.searchParams.set('utm_source', 'readipedia');
    url.searchParams.set('utm_medium', 'promo-modal');
    url.searchParams.set('utm_campaign', CAMPAIGN);
    url.searchParams.set('utm_content', variant);
    cta.href = url.toString();
  } catch (e) { /* keep the plain link */ }

  var countEl = modal.querySelector('.promo-count');
  var timeEl = modal.querySelector('.promo-count-time');
  var timer = null;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Write the time digit by digit so only the digits that change animate
  // (transitions.dev Number pop-in).
  function paint(text) {
    var spans = timeEl.children;
    if (spans.length !== text.length) {
      timeEl.textContent = '';
      for (var i = 0; i < text.length; i++) {
        var s = document.createElement('span');
        s.className = 'promo-digit';
        s.textContent = text[i];
        timeEl.appendChild(s);
      }
      return;
    }
    var step = 0;
    for (var j = 0; j < text.length; j++) {
      if (spans[j].textContent === text[j]) continue;
      spans[j].textContent = text[j];
      spans[j].style.setProperty('--digit-step', Math.min(step++, 2));
      spans[j].classList.remove('is-new');
      void spans[j].offsetWidth;
      spans[j].classList.add('is-new');
    }
  }

  function tick() {
    var left = Math.floor((end - Date.now()) / 1000);
    if (!(left > 0)) {
      countEl.hidden = true;
      clearInterval(timer);
      timer = null;
      return;
    }
    var d = Math.floor(left / 86400);
    var h = Math.floor(left % 86400 / 3600);
    var m = Math.floor(left % 3600 / 60);
    var s = left % 60;
    paint((d ? d + UI[lang()].days + ' ' : '') + pad(h) + ':' + pad(m) + ':' + pad(s));
  }

  function render() {
    var c = VARIANTS[variant][lang()];
    var ui = UI[lang()];
    modal.querySelector('.promo-title').textContent = c.title;
    modal.querySelector('.promo-sub').textContent = c.sub;
    modal.querySelector('.promo-count-label').textContent = ui.label;
    modal.querySelector('.promo-cta-label').textContent = c.cta;
    modal.querySelector('.promo-close').setAttribute('aria-label', ui.close);
    timeEl.textContent = '';
    if (isFinite(end)) tick(); else countEl.hidden = true;
  }

  /* ---------- open and close ---------- */

  var openedAt = 0;
  var returnFocus = null;
  var isOpen = false;

  function reduceMotion() {
    return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function isPhone() {
    return window.matchMedia && matchMedia('(max-width: 768px)').matches;
  }

  function open(trigger) {
    if (isOpen) return;
    isOpen = true;
    render();
    if (isFinite(end) && !timer) timer = setInterval(tick, 1000);
    returnFocus = document.activeElement;
    document.body.appendChild(modal); // no page transform can trap it
    modal.hidden = false;
    document.documentElement.classList.add('promo-modal-open');
    void dialog.offsetWidth;
    modal.classList.add('is-open');
    dialog.focus({ preventScroll: true });
    openedAt = Date.now();
    if (!preview) {
      state.shows = (state.shows || 0) + 1;
      state.lastShownAt = openedAt;
      writeJSON('localStorage', STATE_KEY, state);
      session.shown = true;
      writeJSON('sessionStorage', STATE_KEY, session);
    }
    track('impression', { trigger: trigger, pages_in_visit: session.pages || 1 });
  }

  function close(method) {
    if (!isOpen) return;
    isOpen = false;
    var dwell = Date.now() - openedAt;
    if (method === 'cta') {
      state.clickedAt = Date.now();
    } else {
      state.closedAt = Date.now();
      track('dismiss', { method: method, dwell_ms: dwell });
    }
    if (!preview) writeJSON('localStorage', STATE_KEY, state);
    clearInterval(timer);
    timer = null;
    modal.classList.remove('is-open');
    modal.style.removeProperty('--dim');
    document.documentElement.classList.remove('promo-modal-open');
    var done = function () {
      modal.hidden = true;
      dialog.style.transform = '';
      dialog.style.transition = '';
    };
    if (reduceMotion()) done();
    else {
      dialog.style.transform = '';
      dialog.style.transition = '';
      var out = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(isPhone() ? '--duration-medium' : '--duration-quick')) || 300;
      setTimeout(done, out + 20);
    }
    if (returnFocus && returnFocus.focus && method !== 'cta') returnFocus.focus({ preventScroll: true });
  }

  modal.querySelector('.promo-close').addEventListener('click', function () { close('close_button'); });
  modal.querySelector('.promo-scrim').addEventListener('click', function () { close('backdrop'); });
  cta.addEventListener('click', function () {
    track('click', { dwell_ms: Date.now() - openedAt });
    close('cta');
  });
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.stopPropagation(); close('esc'); return; }
    // Keep Tab inside the dialog: it holds only the close button and the link.
    if (e.key === 'Tab') {
      var items = [modal.querySelector('.promo-close'), cta];
      var i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
    }
  }, true);
  document.addEventListener('readipedia:lang', function () { if (isOpen) render(); });
  window.addEventListener('popstate', function () { if (isOpen) close('navigate'); });

  // Drag the phone sheet down to close it; a short flick also closes it.
  (function bindDrag() {
    var g = null;
    dialog.addEventListener('touchstart', function (e) {
      if (!isPhone() || e.touches.length !== 1) return;
      var t = e.touches[0];
      g = { y: t.clientY, x: t.clientX, dy: 0, on: false, samples: [[t.clientY, e.timeStamp]] };
    }, { passive: true });
    dialog.addEventListener('touchmove', function (e) {
      if (!g) return;
      var t = e.touches[0];
      var dy = t.clientY - g.y;
      if (!g.on) {
        if (Math.abs(t.clientX - g.x) > Math.abs(dy)) { g = null; return; }
        if (dy <= 4 || dialog.scrollTop > 0) return;
        g.on = true;
        g.y = t.clientY;
        modal.classList.add('is-dragging');
      }
      e.preventDefault();
      g.dy = Math.max(0, t.clientY - g.y);
      g.samples.push([t.clientY, e.timeStamp]);
      if (g.samples.length > 5) g.samples.shift();
      dialog.style.transform = 'translateY(' + g.dy + 'px)';
      modal.style.setProperty('--dim', String(Math.max(0, 1 - g.dy / dialog.offsetHeight)));
    }, { passive: false });
    function endDrag() {
      if (!g) return;
      var drag = g;
      g = null;
      if (!drag.on) return;
      modal.classList.remove('is-dragging');
      var a = drag.samples[0];
      var b = drag.samples[drag.samples.length - 1];
      var v = (b[0] - a[0]) / Math.max(1, b[1] - a[1]);
      if (drag.dy > dialog.offsetHeight * 0.25 || v > 0.5) {
        dialog.style.transform = 'translateY(100%)';
        close('swipe');
      } else {
        dialog.style.transform = '';
        modal.style.removeProperty('--dim');
      }
    }
    dialog.addEventListener('touchend', endDrag);
    dialog.addEventListener('touchcancel', endDrag);
  })();

  /* ---------- when to show it ---------- */

  render();

  if (preview) {
    // Wait a frame so the page under it has painted.
    requestAnimationFrame(function () { open('preview'); });
    return;
  }

  var DAY = 86400000;
  var now = Date.now();
  if (isFinite(end) && now >= end) return;               // offer is over
  if (state.clickedAt) return;                           // already took it
  if ((state.shows || 0) >= RULES.maxShows) return;      // seen enough
  if (state.closedAt && now - state.closedAt < RULES.snoozeDays * DAY) return;
  if (session.shown) return;                             // once per visit

  // Count pages within this visit. app.js moves between pages with
  // pushState, so watch that and the back button.
  session.pages = (session.pages || 0) + 1;
  writeJSON('sessionStorage', STATE_KEY, session);
  var pageSeconds = 0;
  var totalSeconds = 0;
  var lastHref = location.href;
  function onPage() {
    if (location.href === lastHref) return;
    lastHref = location.href;
    session.pages = (session.pages || 0) + 1;
    writeJSON('sessionStorage', STATE_KEY, session);
    pageSeconds = 0;
  }
  var push = history.pushState;
  history.pushState = function () {
    var r = push.apply(this, arguments);
    onPage();
    return r;
  };
  window.addEventListener('popstate', onPage);

  var lastScroll = 0;
  window.addEventListener('scroll', function () { lastScroll = Date.now(); }, { passive: true });

  // Something else on screen that the dialog must not land on top of.
  function busy() {
    var b = document.body.classList;
    var h = document.documentElement.classList;
    var cmdk = document.getElementById('cmdk');
    var sel = window.getSelection && String(window.getSelection());
    var el = document.activeElement;
    return (cmdk && !cmdk.hidden)
      || h.contains('sf-sheet-open')
      || b.contains('menu-open')
      || b.contains('graph-is-expanded')
      || b.contains('mobile-continuum-header-active')
      || !!document.querySelector('.dropdown.is-open, [aria-expanded="true"].is-open')
      || (sel && sel.length > 0)
      || (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
      || Date.now() - lastScroll < RULES.quietMs;
  }

  var pending = null;
  function want(trigger) {
    if (!pending) pending = trigger;
  }

  // Ticks four times a second: time counts in whole seconds, and the quiet
  // check runs often enough that the dialog opens soon after scrolling stops.
  // Only time with the tab in front counts.
  var quarters = 0;
  var clock = setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    quarters += 1;
    if (quarters % 4 === 0) {
      pageSeconds += 1;
      totalSeconds += 1;
      if ((session.pages || 1) >= 2 && pageSeconds >= RULES.secondPageSeconds) want('second_page');
      else if (pageSeconds >= RULES.singlePageSeconds) want('time_on_page');
    }
    if (pending && !busy()) {
      clearInterval(clock);
      document.removeEventListener('mouseout', onLeave);
      open(pending);
    }
  }, 250);

  // Desktop exit intent: the pointer leaves the window across the top edge.
  function onLeave(e) {
    if (e.relatedTarget || e.clientY > 0) return;
    if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (totalSeconds >= RULES.exitIntentSeconds) want('exit_intent');
  }
  document.addEventListener('mouseout', onLeave);
})();
