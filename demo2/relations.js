/* Readipedia 2.0 demo: relations with sources.
   - RelGraph: draws a small labelled relation graph (HTML nodes over SVG arcs).
   - The entry page of any entity with relation data gets a "Relations"
     section: the entity in the middle, its relations around it in story order.
     Picking a relation shows the sentences it comes from; picking a sentence
     scrolls the article to it and marks it.
   - Evidence.mark(): finds a verbatim sentence in a rendered article and marks
     it, across entity links. Used by the agent answers too. */
(function () {
  const DATA = window.READIPEDIA_DEMO2;
  if (!DATA) return;

  const isZh = () => Boolean(window.ReadipediaBridge?.isZh?.());
  const lang = () => (isZh() ? 'zh' : 'en');
  const nodes = () => window.WIKI_STORE?.master?.knowledge_graph?.all_nodes || {};
  const nameOf = (id) => {
    const raw = nodes()[id];
    if (isZh()) {
      const zh = window.WIKI_STORE_ZH?.graph_labels?.[id];
      if (zh) return zh;
    }
    return raw?.label || id;
  };
  const thumbOf = (id) => {
    const raw = nodes()[id];
    return raw?.imageUrl ? `./assets/images/graph/${raw.imageUrl.split('/').pop()}` : '';
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (en, zh) => (isZh() ? zh : en);

  /* ---------------------------------------------------------------- Evidence */

  // Quotes and whitespace differ between sources and rendered HTML; compare
  // on a normalised copy and keep a map back to the text nodes.
  const normChar = (c) => (c === '‘' || c === '’' ? "'" : c === '“' || c === '”' ? '"' : c);

  function unmark(root = document) {
    root.querySelectorAll('mark.rel-mark').forEach((m) => {
      const parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
  }

  // Article text only: skip the relations section and its quotes.
  const textWalker = (root) => document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('.rel-section') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
  });

  function findRange(root, text) {
    const walker = textWalker(root);
    let flat = '';
    const map = [];
    let lastSpace = true;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const value = node.nodeValue;
      for (let i = 0; i < value.length; i += 1) {
        const c = normChar(value[i]);
        if (/\s/.test(c)) {
          if (lastSpace) continue;
          flat += ' ';
          lastSpace = true;
        } else {
          flat += c;
          lastSpace = false;
        }
        map.push([node, i]);
      }
    }
    const needle = Array.from(text).map(normChar).join('').replace(/\s+/g, ' ').trim();
    const at = flat.indexOf(needle);
    if (at < 0) return null;
    return { start: map[at], end: map[at + needle.length - 1] };
  }

  function mark(root, text, options = {}) {
    if (!root || !text) return null;
    const hit = findRange(root, text);
    if (!hit) return null;
    // Collect the text-node segments the sentence spans, then wrap each one.
    const segments = [];
    const walker = textWalker(root);
    let inside = false;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const isStart = node === hit.start[0];
      const isEnd = node === hit.end[0];
      if (isStart) inside = true;
      if (inside) {
        segments.push([node, isStart ? hit.start[1] : 0, isEnd ? hit.end[1] + 1 : node.nodeValue.length]);
      }
      if (isEnd) break;
    }
    const marks = segments.reverse().map(([node, from, to]) => {
      const range = document.createRange();
      range.setStart(node, from);
      range.setEnd(node, to);
      const el = document.createElement('mark');
      el.className = 'rel-mark';
      range.surroundContents(el);
      return el;
    }).reverse();
    if (options.scroll !== false && marks[0]) {
      marks[0].scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    requestAnimationFrame(() => marks.forEach((m) => m.classList.add('is-on')));
    return marks;
  }

  // Open an entry (if it is not the one on screen) and mark a sentence in it.
  let pendingMark = null;
  function openAndMark(entityId, text) {
    const md = document.getElementById('view-entity-markdown');
    const view = document.getElementById('view-entity');
    const onPage = view && view.style.display !== 'none' && md?.dataset.entity === entityId;
    if (onPage) {
      unmark(md);
      mark(md, text);
      return;
    }
    pendingMark = { entityId, text };
    window.ReadipediaNav?.openEntity(entityId);
  }

  /* ---------------------------------------------------------------- RelGraph */

  // A quadratic arc like the site graph's (curvature 0.18).
  // t places the label along the arc (0.5 is the middle). inset stops the
  // arc short of the target's edge, where an arrowhead can sit.
  function arcPath(a, b, curvature = 0.18, t = 0.5, inset = 0) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const cx = mx - dy * curvature;
    const cy = my + dx * curvature;
    let end = { x: b.x, y: b.y };
    let tip = null;
    if (inset) {
      const ux = b.x - cx;
      const uy = b.y - cy;
      const len = Math.hypot(ux, uy) || 1;
      end = { x: b.x - (ux / len) * inset, y: b.y - (uy / len) * inset };
      // A small filled arrowhead pointing along the arc's last stretch.
      const L = 7;
      const W = 3.5;
      const bx = end.x - (ux / len) * L;
      const by = end.y - (uy / len) * L;
      const px = (-uy / len) * W;
      const py = (ux / len) * W;
      tip = `M${end.x.toFixed(1)},${end.y.toFixed(1)} L${(bx + px).toFixed(1)},${(by + py).toFixed(1)} L${(bx - px).toFixed(1)},${(by - py).toFixed(1)} Z`;
    }
    const u = 1 - t;
    return {
      d: `M${a.x},${a.y} Q${cx},${cy} ${end.x},${end.y}`,
      tip,
      c: { x: cx, y: cy },
      end,
      mid: { x: u * u * a.x + 2 * u * t * cx + t * t * end.x, y: u * u * a.y + 2 * u * t * cy + t * t * end.y }
    };
  }

  /* ---------------------------------------------------------- Pen sketch */
  // Ink strokes for the notes look, like a pressure-sensitive pen: each line
  // starts thin, swells a little and tapers off at the end. Drawn as filled
  // outlines and revealed through a mask that follows the pen.
  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  const f1 = (v) => v.toFixed(1);
  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const polyline = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p.x)},${f1(p.y)}`).join('');

  // Outline of a stroke along pts with the given peak width.
  function inkOutline(pts, w, taperIn = 0.08, taperOut = 0.12) {
    const n = pts.length;
    const left = [];
    const right = [];
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1);
      const p = pts[i];
      const q = pts[Math.min(n - 1, i + 1)];
      const o = pts[Math.max(0, i - 1)];
      const dx = q.x - o.x;
      const dy = q.y - o.y;
      const l = Math.hypot(dx, dy) || 1;
      // Nearly even, like a fine pen: a soft start, a slight swell, a light lift at the end.
      const half = (w / 2) * (0.45 + 0.55 * smooth(0, taperIn, t)) * (1 - 0.4 * smooth(1 - taperOut, 1, t)) * (0.9 + 0.1 * Math.sin(Math.PI * t));
      left.push({ x: p.x - (dy / l) * half, y: p.y + (dx / l) * half });
      right.push({ x: p.x + (dy / l) * half, y: p.y - (dx / l) * half });
    }
    return `${polyline(left)}${polyline(right.reverse()).replace(/^M/, 'L')}Z`;
  }

  // The pen's path for a relation: the same arc, starting clear of the
  // source dot, with a slight natural bow, sampled every few pixels.
  function penPoints(a, c, b, rnd, startGap) {
    const bow = (rnd() - 0.5) * 0.08;
    const cx = c.x - (b.y - a.y) * bow;
    const cy = c.y + (b.x - a.x) * bow;
    const at = (t) => { const u = 1 - t; return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }; };
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(12, Math.round(len / 3));
    const pts = [];
    for (let k = 0; k <= steps; k += 1) {
      const p = at(k / steps);
      if (Math.hypot(p.x - a.x, p.y - a.y) >= startGap) pts.push(p);
    }
    return { pts, c: { x: cx, y: cy } };
  }

  // An open arrowhead in one stroke: wing, tip, other wing.
  function arrowPoints(from, tip, rnd) {
    const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
    const wing = (side) => {
      const a = ang + Math.PI + side * (0.5 + rnd() * 0.1);
      const len = 8.5 + rnd() * 2;
      return { x: tip.x + Math.cos(a) * len, y: tip.y + Math.sin(a) * len };
    };
    const w1 = wing(1);
    const w2 = wing(-1);
    const seg = (p, q, k) => Array.from({ length: k }, (_, i) => ({ x: p.x + ((q.x - p.x) * i) / k, y: p.y + ((q.y - p.y) * i) / k }));
    return [...seg(w1, tip, 6), ...seg(tip, w2, 6), w2];
  }

  let maskSeq = 0;

  /* graph: { nodes:[{id,x,y,r,primary,labelSide,sub,i}], edges:[{key,source,target,label,showLabel,arrow,i}] }
     Positions are in pixels of the host box. An edge with arrow points at its
     target; an edge with i is drawn in that order. graph.sketch draws it all
     by hand, like notes. */
  function drawGraph(host, graph, handlers = {}) {
    const width = host.clientWidth;
    const height = host.clientHeight;
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    let svg = `<svg class="rg-edges" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">`;
    let labels = '';
    graph.edges.forEach((e) => {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (!a || !b) return;
      const arc = arcPath(a, b, e.curvature ?? 0.18, e.labelAt ?? 0.5, e.arrow ? b.r + (graph.sketch ? 5 : 3) : 0);
      const order = e.i !== undefined ? ` style="--i:${e.i}"` : '';
      if (graph.sketch) {
        const rnd = seeded(`${e.source}>${e.target}`);
        const pen = penPoints(a, arc.c, arc.end, rnd, a.r + 6);
        const id = `rgm${(maskSeq += 1)}`;
        if (pen.pts.length > 2) {
          svg += `<mask id="${id}" maskUnits="userSpaceOnUse"><path class="rg-reveal" d="${polyline(pen.pts)}" pathLength="1"${order}/></mask>`;
          svg += `<path class="rg-edge is-pen" data-key="${e.key}" d="${inkOutline(pen.pts, 1.9)}" mask="url(#${id})"/>`;
        }
        if (e.arrow) {
          const from = pen.pts[Math.max(0, pen.pts.length - 4)] || pen.c;
          const tip = arrowPoints(from, arc.end, rnd);
          svg += `<mask id="${id}t" maskUnits="userSpaceOnUse"><path class="rg-reveal is-tip" d="${polyline(tip)}" pathLength="1"${order}/></mask>`;
          svg += `<path class="rg-arrow is-pen" data-key="${e.key}" d="${inkOutline(tip, 1.9, 0.15, 0.2)}" mask="url(#${id}t)"/>`;
        }
      } else {
        svg += `<path class="rg-edge${e.cross ? ' is-cross' : ''}${e.i !== undefined ? ' is-draw' : ''}" data-key="${e.key}" d="${arc.d}"${e.i !== undefined ? ' pathLength="1"' : ''}${order}/>`;
        if (arc.tip) svg += `<path class="rg-arrow" data-key="${e.key}" d="${arc.tip}"${order}/>`;
      }
      svg += `<path class="rg-hit" data-key="${e.key}" d="${arc.d}"/>`;
      if (e.showLabel && e.label) {
        labels += `<span class="rg-edge-label${e.cross ? ' is-cross' : ''}" data-key="${e.key}" style="left:${arc.mid.x}px;top:${arc.mid.y}px${e.i !== undefined ? `;--i:${e.i}` : ''}">${esc(e.label)}</span>`;
      }
    });
    svg += '</svg>';
    let html = '';
    graph.nodes.forEach((n, i) => {
      const src = thumbOf(n.id);
      const side = n.labelSide || 'below';
      html += `<button type="button" class="rg-node is-${side}${n.primary ? ' is-primary' : ''}" data-id="${n.id}" data-key="${n.key || ''}"`
        + ` style="left:${n.x}px;top:${n.y}px;--r:${n.r}px;--i:${n.i ?? i}">`
        + `<span class="rg-dot">${src ? `<img src="${src}" alt="" loading="lazy" decoding="async">` : ''}</span>`
        + `<span class="rg-text"><span class="rg-name">${esc(n.name || nameOf(n.id))}</span>${n.sub ? `<span class="rg-sub">${esc(n.sub)}</span>` : ''}</span>`
        + '</button>';
    });
    host.innerHTML = svg + labels + html;

    // Both ends of a relation stay lit with it.
    host.edgeEnds = new Map();
    graph.edges.forEach((e) => {
      const ends = host.edgeEnds.get(e.key) || new Set();
      ends.add(e.source); ends.add(e.target);
      host.edgeEnds.set(e.key, ends);
    });
    const setHover = (key) => {
      lightKey(host, key, 'is-hover');
      handlers.onHover?.(key);
    };
    host.querySelectorAll('.rg-node, .rg-hit').forEach((el) => {
      el.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse' && el.dataset.key) setHover(el.dataset.key); });
      el.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') setHover(null); });
      el.addEventListener('click', () => handlers.onPick?.(el.dataset.key || null, el.dataset.id || null));
    });
  }

  function lightKey(host, key, cls) {
    host.classList.toggle(cls === 'is-hover' ? 'has-hover' : 'has-selection', Boolean(key) && Boolean(host.edgeEnds?.has(key)));
    const ends = key ? host.edgeEnds?.get(key) : null;
    host.querySelectorAll('.rg-edge, .rg-arrow, .rg-hit, .rg-edge-label').forEach((el) => el.classList.toggle(cls, Boolean(key) && el.dataset.key === key));
    host.querySelectorAll('.rg-node').forEach((el) => el.classList.toggle(cls, Boolean(ends?.has(el.dataset.id))));
  }

  function setSelected(host, key) {
    lightKey(host, key, 'is-selected');
  }

  /* ------------------------------------------------------- Relations section */

  // Ring layout. Wide boxes put names beside the nodes on the sides; narrow
  // boxes stagger every other node inward and keep names under the nodes.
  function ringLayout(rel, width, height) {
    const narrow = width < 560;
    const cx = width / 2;
    const cy = height / 2;
    const count = rel.edges.length;
    const rx = narrow ? width / 2 - 40 : Math.min(width / 2 - 150, 330);
    const ry = narrow ? height / 2 - 46 : height / 2 - 52;
    if (narrow) {
      // Phones: a fan. The entity sits on the left, its relations run down
      // in story order with names and labels beside them.
      const step = (height - 24) / count;
      const out = [{ id: rel.center, x: 36, y: height / 2, r: 24, primary: true, labelSide: 'none', key: '' }];
      rel.edges.forEach((edge, i) => {
        out.push({ id: edge.target, x: Math.min(150, width * 0.42), y: 12 + step * (i + 0.5), r: 15, labelSide: 'right', key: `w${i}`, sub: edge.label[lang()] });
      });
      return out;
    }
    const nodesOut = [{ id: rel.center, x: cx, y: cy, r: narrow ? 24 : 28, primary: true, labelSide: 'below', key: '' }];
    // Near the top and bottom, names sit above or below their nodes; only the
    // node closest to each pole stays on the ring, the others step inward so
    // their names do not collide.
    const sinAt = (i) => Math.sin(-Math.PI / 2 + (i / count) * Math.PI * 2);
    const poleIndex = (sign) => {
      let best = -1;
      for (let i = 0; i < count; i += 1) {
        const v = sinAt(i) * sign;
        if (v > 0.9 && (best < 0 || v > sinAt(best) * sign + 1e-6)) best = i;
      }
      return best;
    };
    const poles = [poleIndex(-1), poleIndex(1)];
    rel.edges.forEach((edge, i) => {
      const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
      const nearPole = Math.abs(Math.sin(angle)) > 0.9;
      const inset = narrow && i % 2 === 1 ? 0.66 : (nearPole && !poles.includes(i) ? 0.8 : 1);
      const x = cx + Math.cos(angle) * rx * inset;
      const y = cy + Math.sin(angle) * ry * inset;
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      let labelSide = 'below';
      if (!narrow) {
        if (s < -0.82) labelSide = 'above';
        else if (s > 0.82) labelSide = 'below';
        else labelSide = c > 0 ? 'right' : 'left';
      } else if (s < -0.5) {
        labelSide = 'above';
      }
      nodesOut.push({ id: edge.target, x, y, r: narrow ? 15 : 18, labelSide, key: `w${i}`, sub: edge.label[lang()] });
    });
    return nodesOut;
  }

  function relationEdges(rel, narrow) {
    const order = rel.edges.map((e) => e.target);
    const edges = rel.edges.map((e, i) => ({ key: `w${i}`, source: rel.center, target: e.target, label: e.label[lang()], evidence: e.evidence, curvature: narrow ? 0 : 0.08 }));
    rel.cross.forEach((e, i) => {
      // In the fan both ends share a column: bend every cross arc to the left.
      const down = order.indexOf(e.target) > order.indexOf(e.source);
      edges.push({ key: `c${i}`, source: e.source, target: e.target, label: e.label[lang()], evidence: e.evidence, cross: true, showLabel: !narrow, curvature: narrow ? (down ? 0.45 : -0.45) : 0.22 });
    });
    return edges;
  }

  function renderDetail(detail, edge) {
    if (!edge) {
      detail.classList.remove('is-open');
      detail.innerHTML = '';
      return;
    }
    const quotes = edge.evidence.map((ev, i) => (
      `<button type="button" class="rel-quote" data-i="${i}"><span class="rel-quote-text">${esc(ev[lang()])}</span>`
      + `<span class="rel-quote-go">${T('In the article', '在原文中查看')}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.25v9.5M4 8.75l4 4 4-4"/></svg></span></button>`
    )).join('');
    detail.innerHTML = `<div class="rel-detail-inner"><div class="rel-detail-head"><a href="#${edge.source}" class="rel-detail-name" data-entity="${edge.source}">${esc(nameOf(edge.source))}</a>`
      + `<span class="rel-detail-label">${esc(edge.label)}</span>`
      + `<a href="#${edge.target}" class="rel-detail-name" data-entity="${edge.target}">${esc(nameOf(edge.target))}</a></div>`
      + `<div class="rel-quotes">${quotes}</div></div>`;
    detail.classList.remove('is-open');
    void detail.offsetWidth;
    detail.classList.add('is-open');
    detail.querySelectorAll('.rel-quote').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ev = edge.evidence[Number(btn.dataset.i)];
        leaveGraph().then(() => openAndMark(ev.entity, ev[lang()]));
      });
    });
    detail.querySelectorAll('.rel-detail-name').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        leaveGraph().then(() => window.ReadipediaNav?.openEntity(a.dataset.entity));
      });
    });
  }

  /* ------------------------------------------------- Inside the graph area */
  // The expanded graph (desktop overlay, phone full screen) gets a switch:
  // the usual mention graph, or the labelled relations of the current entry.
  // Nothing is added to the article itself.
  const container = () => document.getElementById('sidebar-graph-container');
  const expanded = () => Boolean(container()?.classList.contains('is-expanded'));
  let currentEntity = null;
  let mode = 'graph';
  let layer = null;
  let selected = null;

  function leaveGraph() {
    if (!expanded()) return Promise.resolve();
    document.getElementById('btn-graph-expand')?.click();
    return new Promise((r) => setTimeout(r, reducedMotion() ? 60 : 480));
  }
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ensureLayer() {
    const host = container();
    if (!host) return null;
    if (layer && host.contains(layer.root)) return layer;
    const root = document.createElement('div');
    root.className = 'relx';
    root.innerHTML = `<div class="relx-switch" role="tablist">
        <button type="button" role="tab" data-mode="graph"></button>
        <button type="button" role="tab" data-mode="rel"></button>
        <span class="relx-thumb" aria-hidden="true"></span>
      </div>
      <div class="relx-stage"><div class="relx-map rg"></div><div class="rel-detail relx-detail" aria-live="polite"></div></div>`;
    host.appendChild(root);
    root.querySelectorAll('.relx-switch button').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); setMode(btn.dataset.mode); });
    });
    // Keep clicks in the layer from reaching the canvas underneath.
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
    layer = { root, map: root.querySelector('.relx-map'), detail: root.querySelector('.relx-detail') };
    new ResizeObserver(() => { if (mode === 'rel' && expanded()) draw(); }).observe(root);
    return layer;
  }

  function sync() {
    const l = ensureLayer();
    if (!l) return;
    const rel = DATA.relations[currentEntity];
    const show = Boolean(rel) && expanded();
    l.root.classList.toggle('is-available', show);
    if (!rel) mode = 'graph';
    const [g, r] = l.root.querySelectorAll('.relx-switch button');
    g.textContent = T('Graph', '图谱');
    r.textContent = T('Relations', '关系');
    l.root.querySelectorAll('.relx-switch button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
    l.root.classList.toggle('is-rel', show && mode === 'rel');
    container()?.classList.toggle('relx-on', show && mode === 'rel');
    if (show && mode === 'rel') draw();
  }

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    selected = null;
    if (layer) renderDetail(layer.detail, null);
    sync();
  }

  function draw() {
    const rel = DATA.relations[currentEntity];
    if (!rel || !layer) return;
    const host = layer.map;
    const stage = layer.root.querySelector('.relx-stage');
    const narrow = stage.clientWidth < 560;
    const box = container().getBoundingClientRect();
    const outside = !narrow && window.innerWidth - box.right >= 372;
    layer.root.classList.toggle('detail-outside', outside);
    layer.root.style.setProperty('--relx-detail-x', `${box.right + 12}px`);
    const edges = relationEdges(rel, narrow);
    host.classList.toggle('is-fan', narrow);
    host.style.setProperty('--fan-text-w', `${Math.max(120, stage.clientWidth - Math.min(150, stage.clientWidth * 0.42) - 24)}px`);
    host.style.height = narrow ? `${rel.edges.length * 40 + 24}px` : `${stage.clientHeight}px`;
    drawGraph(host, { nodes: ringLayout(rel, host.clientWidth, host.clientHeight), edges }, {
      onPick: (key) => {
        selected = key && key !== selected ? key : null;
        setSelected(host, selected);
        renderDetail(layer.detail, edges.find((e) => e.key === selected));
      }
    });
    setSelected(host, selected);
  }

  function watchContainer() {
    const host = container();
    if (!host) { setTimeout(watchContainer, 300); return; }
    ensureLayer();
    new MutationObserver(() => sync()).observe(host, { attributes: true, attributeFilter: ['class'] });
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchContainer);
  else watchContainer();

  document.addEventListener('readipedia:entity', (event) => {
    const md = document.getElementById('view-entity-markdown');
    const id = event.detail?.id;
    if (id !== currentEntity) { selected = null; if (layer) renderDetail(layer.detail, null); }
    currentEntity = id;
    sync();
    if (!md) return;
    md.dataset.entity = id;
    if (pendingMark && pendingMark.entityId === id) {
      const { text } = pendingMark;
      pendingMark = null;
      // Let the page enter first, then scroll to the sentence.
      setTimeout(() => mark(md, text), 420);
    }
  });
  document.addEventListener('readipedia:lang', () => sync());

  window.ReadipediaDemo2 = { drawGraph, setSelected, lightKey, nameOf, thumbOf, mark, unmark, openAndMark, esc, T, lang };
})();
