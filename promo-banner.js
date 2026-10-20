// Promo card: bilingual A/B copy, the countdown and close.
// The markup lives in index.html; a tiny inline script in <head> adds
// html.has-promo on every load; closing only hides it until the next refresh.
(function () {
  var bar = document.getElementById('promo-bar');
  if (!bar) return;

  // A/B copy: each reader is randomly given one variant and keeps it.
  // Preview a specific one with ?promo=voices (or tts, library, claude, import, all).
  var VARIANT_KEY = 'readipedia-promo-variant';
  var VARIANTS = {
    voices: {
      zh: { title: '限时免费 · 一本书，一整个剧组为你朗读', short: '多角色 AI 朗读，限时免费', sub: '旁白和每个角色各有其声，听书像听广播剧', cta: '免费试听' },
      en: { title: 'Free for now: a full cast reads your book', short: 'Full-cast AI narration, free', sub: 'A narrator plus a voice for every character, like an audio drama.', cta: 'Listen free' }
    },
    library: {
      zh: { title: '千万本好书，限时免费读、免费听', short: '千万本好书，限时免费', sub: '千万级免费书库，打开就能读，点一下就能听', cta: '免费去读' },
      en: { title: 'Ten million books, free to read and hear', short: '10M+ books, free', sub: 'A free library of over ten million titles. Open one and press play.', cta: 'Browse free' }
    },
    claude: {
      zh: { title: '限时免费：和 Claude 聊你正在读的书', short: '免费和 Claude 聊书', sub: '内置 Claude Agent，人物、情节、观点随时问', cta: '免费开聊' },
      en: { title: 'Free for now: talk to Claude about your book', short: 'Chat with Claude, free', sub: 'A built-in Claude agent that answers about characters, plot and ideas.', cta: 'Chat free' }
    },
    import: {
      zh: { title: '你的书和文章，都能导进来听', short: '任意格式导入，限时免费', sub: '电子书、PDF、网页和博客文章，导入就能朗读', cta: '免费导入' },
      en: { title: 'Bring any book or article and listen', short: 'Import anything, free', sub: 'Ebooks, PDFs, web pages and blog posts, read aloud.', cta: 'Import free' }
    },
    all: {
      zh: { title: 'Readify 限时免费 · 全部功能开放', short: 'Readify 全部功能限时免费', sub: '多角色朗读、千万书库、Claude 对话，无需绑卡', cta: '免费领取' },
      en: { title: 'Readify is free for a limited time', short: 'Readify is free for now', sub: 'Full-cast narration, ten million books and Claude chat. No card needed.', cta: 'Get it free' }
    }
  };
  var UI = {
    zh: { label: '距活动结束', close: '关闭', days: '天' },
    en: { label: 'Ends in', close: 'Close', days: 'd' }
  };

  function pickVariant() {
    var ids = Object.keys(VARIANTS);
    var forced = (location.search.match(/[?&]promo=([a-z]+)/) || [])[1];
    if (forced && VARIANTS[forced]) return forced;
    var saved = null;
    try { saved = localStorage.getItem(VARIANT_KEY); } catch (e) { /* storage blocked */ }
    if (saved && VARIANTS[saved]) return saved;
    var id = ids[Math.floor(Math.random() * ids.length)];
    try { localStorage.setItem(VARIANT_KEY, id); } catch (e) { /* storage blocked */ }
    return id;
  }

  var variant = pickVariant();
  bar.dataset.variant = variant;

  // Hand each event to whatever analytics is on the page (dataLayer, or a
  // listener for readipedia:promo).
  function track(action) {
    var detail = { campaign: 'free-2026', variant: variant, action: action };
    try { (window.dataLayer = window.dataLayer || []).push({ event: 'promo_' + action, promo_variant: variant }); } catch (e) {}
    document.dispatchEvent(new CustomEvent('readipedia:promo', { detail: detail }));
  }

  var cta = bar.querySelector('.promo-cta');
  try {
    var url = new URL(cta.href);
    url.searchParams.set('utm_source', 'readipedia');
    url.searchParams.set('utm_medium', 'promo-card');
    url.searchParams.set('utm_campaign', 'free-2026');
    url.searchParams.set('utm_content', variant);
    cta.href = url.toString();
  } catch (e) { /* keep the plain link */ }

  var end = Date.parse(bar.dataset.end || '');
  var timeEl = bar.querySelector('.promo-count-time');
  var timer = null;

  function lang() {
    return /^zh/i.test(document.documentElement.lang || '') ? 'zh' : 'en';
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Write the time digit by digit so only the digits that change animate.
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
    for (var j = 0; j < text.length; j++) {
      if (spans[j].textContent === text[j]) continue;
      spans[j].textContent = text[j];
      spans[j].classList.remove('is-new');
      void spans[j].offsetWidth;
      spans[j].classList.add('is-new');
    }
  }

  function tick() {
    var left = Math.floor((end - Date.now()) / 1000);
    if (!(left > 0)) {
      bar.querySelector('.promo-count').hidden = true;
      bar.querySelector('.promo-rule').hidden = true;
      clearInterval(timer);
      return;
    }
    var d = Math.floor(left / 86400);
    var h = Math.floor(left % 86400 / 3600);
    var m = Math.floor(left % 3600 / 60);
    var s = left % 60;
    paint(pad(d) + UI[lang()].days + '\u00a0' + pad(h) + ':' + pad(m) + ':' + pad(s));
  }

  function render() {
    var c = VARIANTS[variant][lang()];
    var ui = UI[lang()];
    bar.querySelector('.promo-title-long').textContent = c.title;
    bar.querySelector('.promo-title-short').textContent = c.short;
    bar.querySelector('.promo-sub').textContent = c.sub;
    bar.querySelector('.promo-count-label').textContent = ui.label;
    bar.querySelector('.promo-cta-label').textContent = c.cta;
    bar.querySelector('.promo-close').setAttribute('aria-label', ui.close);
    timeEl.textContent = '';
    tick();
  }

  function close() {
    track('close');
    clearInterval(timer);
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    bar.classList.add('is-leaving');
    setTimeout(function () {
      document.documentElement.classList.remove('has-promo');
      bar.remove();
    }, reduce ? 0 : 260);
  }

  render();
  timer = setInterval(tick, 1000);
  document.addEventListener('readipedia:lang', render);
  bar.querySelector('.promo-close').addEventListener('click', close);
  cta.addEventListener('click', function () { track('click'); });
  if (document.documentElement.classList.contains('has-promo')) track('view');
})();
