#!/usr/bin/env node
/*
 * Prerender the library pages to real paths, so search engines get every
 * book and entry link in the HTML they download (no JavaScript needed).
 *
 *   books/  books/page/<n>/  books/popular/
 *   entries/  entries/page/<n>/  entries/popular/
 *   categories/<id>/  categories/<id>/page/<n>/
 *
 * Each page is a copy of index.html with <base> pointing back to the site
 * root, the library view filled in and shown, its own <title> and canonical.
 * The app still starts as usual on top and routes by the path.
 *
 * Run from the repo root after changing index.html, library data or the
 * library code, with the site served locally:
 *   python3 -m http.server 8765 &
 *   node tools/prerender-library.js [--base http://localhost:8765/] [--origin https://example.com/]
 * --origin (the live site root) adds absolute canonicals and sitemap.xml.
 * Needs Playwright (npm i -g playwright).
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const BASE = opt('base', 'http://localhost:8765/');
const ORIGIN = opt('origin', '');
const LANG = opt('lang', 'en');
const ROOT = path.resolve(__dirname, '..');
const DIRS = ['books', 'entries', 'categories'];

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { /* fall through */ }
  const globalRoot = require('child_process').execSync('npm root -g').toString().trim();
  return require(path.join(globalRoot, 'playwright'));
}

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function pageHtml(template, page) {
  const depth = page.path.split('/').filter(Boolean).length;
  const up = '../'.repeat(depth);
  let html = template;
  const swap = (from, to) => {
    if (!html.includes(from)) throw new Error(`index.html changed: cannot find ${from.slice(0, 60)}`);
    html = html.replace(from, to);
  };
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${page.lang}"`);
  swap('<base href="./" />', `<base href="${up}" />`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(page.title)}</title>`);
  const canonical = ORIGIN ? new URL(page.path, ORIGIN).href : page.path;
  html = html.replace('</title>', `</title>\n  <link rel="canonical" href="${escAttr(canonical)}" />`);
  swap('<article id="view-library" class="wiki-article-view library-view" style="display:none;" aria-labelledby="library-title"></article>',
    `<article id="view-library" class="wiki-article-view library-view active" aria-labelledby="library-title" data-lang="${page.lang}">${page.view}</article>`);
  swap('<article id="view-book" class="wiki-article-view active">', '<article id="view-book" class="wiki-article-view" style="display:none;">');
  swap('<div class="library-nav" id="library-nav"></div>', `<div class="library-nav" id="library-nav">${page.nav}</div>`);
  return html;
}

(async () => {
  const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await ctx.addInitScript((lang) => { try { localStorage.setItem('readipedia-lang', lang); } catch (e) {} }, LANG);
  const tab = await ctx.newPage();
  const errors = [];
  tab.on('pageerror', (e) => errors.push(e.message));
  await tab.goto(new URL('#all-books', BASE).href, { waitUntil: 'networkidle' });
  await tab.waitForFunction(() => document.querySelector('#library-nav a'));

  // Every library page: the sidebar rows, then each page's pager links.
  const seen = new Set();
  const queue = await tab.$$eval('#library-nav [data-lib-cat]', (els) => els.map((a) => a.dataset.libCat));
  const pages = [];
  while (queue.length) {
    const cat = queue.shift();
    if (seen.has(cat)) continue;
    seen.add(cat);
    await tab.evaluate((c) => window.ReadipediaNav.openLibrary(c), cat);
    await tab.waitForFunction((c) => document.getElementById('view-library').dataset.page === c.split('/')[0], cat);
    await tab.waitForTimeout(50);
    const page = await tab.evaluate(() => {
      const clean = (el) => {
        const copy = el.cloneNode(true);
        copy.querySelectorAll('.lib-pending').forEach((x) => x.classList.remove('lib-pending'));
        copy.querySelectorAll('[style]').forEach((x) => x.removeAttribute('style'));
        return copy.innerHTML.trim();
      };
      return {
        path: window.ReadipediaNav.libraryPath(window.ReadipediaNav.libraryCategory()),
        title: document.title,
        lang: document.getElementById('view-library').dataset.lang || 'en',
        view: clean(document.getElementById('view-library')),
        nav: clean(document.getElementById('library-nav')),
        more: Array.from(document.querySelectorAll('#view-library [data-lib-cat]')).map((a) => a.dataset.libCat)
      };
    });
    page.more.forEach((c) => { if (!seen.has(c)) queue.push(c); });
    pages.push(page);
  }
  await browser.close();
  if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);

  // Start clean so removed categories or pages do not linger.
  DIRS.forEach((d) => fs.rmSync(path.join(ROOT, d), { recursive: true, force: true }));
  pages.forEach((page) => {
    const file = path.join(ROOT, page.path, 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, pageHtml(template, page));
  });

  if (ORIGIN) {
    const urls = [''].concat(pages.map((p) => p.path)).map((p) => `  <url><loc>${escText(new URL(p, ORIGIN).href)}</loc></url>`);
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  }
  console.log(`${pages.length} library pages written${ORIGIN ? ' + sitemap.xml' : ''}:`);
  pages.forEach((p) => console.log(`  ${p.path}  ${p.title}`));
})().catch((e) => { console.error(e.message || e); process.exit(1); });
