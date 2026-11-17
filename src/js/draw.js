/* SłupDrewniany – rysunki SVG (przekrój, schemat, wykresy, stateczność, rysunek słupa) – wspólne dla zakładek i raportu */
(function () {
'use strict';
const E = window.EC5;
const C = {
  ink: 'var(--ink,#1b2230)', ink2: 'var(--ink2,#4a5466)', ink3: 'var(--ink3,#7a8494)', line: 'var(--line,#d9dde3)', line2: 'var(--line2,#e8ebef)',
  wood: 'var(--wood,#ecd3a9)', wood2: 'var(--wood2,#d7b27c)', woodln: 'var(--woodln,#8a5a22)', char: 'var(--char,#3a3a3a)', steel: 'var(--steel,#8a96a8)', conc: 'var(--conc,#c9ced6)',
  acc: 'var(--acc,#1d5bb8)', fail: 'var(--fail,#c0262d)', ok: 'var(--ok,#1d7f3c)', warn: 'var(--warn,#a35d00)',
  d1: 'var(--dg1,#c0262d)', d2: 'var(--dg2,#1d5bb8)', d3: 'var(--dg3,#1d7f3c)', f1: 'var(--dgfill1,rgba(192,38,45,.10))', f2: 'var(--dgfill2,rgba(29,91,184,.10))', f3: 'var(--dgfill3,rgba(29,127,60,.10))',
  panel: 'var(--panel,#ffffff)',
};
const fx = (v, d) => E.fx(v, d === undefined ? 2 : d);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// indeksy dolne w tekście SVG: x_{ab} lub x_ab → <tspan>
const subT = t => String(t).replace(/_\{([^}]*)\}/g, '<tspan baseline-shift="sub" font-size="78%">$1</tspan>').replace(/_([\p{L}\p{N}]+(?:,[\p{L}\p{N}]+)*)/gu, '<tspan baseline-shift="sub" font-size="78%">$1</tspan>');
const T = (x, y, t, o) => { o = o || {}; return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.fs || 11}" text-anchor="${o.a || 'middle'}"${o.b ? ' font-weight="600"' : ''}${o.rot ? ` transform="rotate(${o.rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''} style="fill:${o.c || C.ink}"${o.cls ? ` class="${o.cls}"` : ''}>${subT(t)}</text>`; };
const Ln = (x1, y1, x2, y2, c, w, dash) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" style="stroke:${c || C.ink};stroke-width:${w || 1}${dash ? ';stroke-dasharray:' + dash : ''}"/>`;
// wymiar poziomy / pionowy z kreskami
const dimH = (x1, x2, y, label, o) => { o = o || {}; const c = o.c || C.ink2; return Ln(x1, y, x2, y, c, 0.8) + Ln(x1, y - 4, x1, y + 4, c, 0.8) + Ln(x2, y - 4, x2, y + 4, c, 0.8) + Ln(x1 - 3, y + 3, x1 + 3, y - 3, c, 0.9) + Ln(x2 - 3, y + 3, x2 + 3, y - 3, c, 0.9) + T((x1 + x2) / 2, y - 4, label, { fs: o.fs || 10.5, c }); };
const dimV = (x, y1, y2, label, o) => { o = o || {}; const c = o.c || C.ink2; return Ln(x, y1, x, y2, c, 0.8) + Ln(x - 4, y1, x + 4, y1, c, 0.8) + Ln(x - 4, y2, x + 4, y2, c, 0.8) + Ln(x - 3, y1 + 3, x + 3, y1 - 3, c, 0.9) + Ln(x - 3, y2 + 3, x + 3, y2 - 3, c, 0.9) + T(x - 5, (y1 + y2) / 2, label, { fs: o.fs || 10.5, c, rot: -90 }); };
const arrow = (x1, y1, x2, y2, c, w) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 7; return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" style="stroke:${c};stroke-width:${w || 1.6};fill:none"/><path d="M${x2.toFixed(1)} ${y2.toFixed(1)}L${(x2 - h * Math.cos(a - 0.38)).toFixed(1)} ${(y2 - h * Math.sin(a - 0.38)).toFixed(1)}L${(x2 - h * Math.cos(a + 0.38)).toFixed(1)} ${(y2 - h * Math.sin(a + 0.38)).toFixed(1)}Z" style="fill:${c}"/>`; };
const svgOpen = (W, H, cls, extra) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"${cls ? ` class="${cls}"` : ''}${extra || ''} style="max-width:100%;height:auto">`;
const hatch = (id, c) => `<defs><pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" style="stroke:${c};stroke-width:1.1"/></pattern></defs>`;
let uid = 0;

/* ------------------------------------------------------------ przekrój */
function sectionSVG(R, S, o) {
  o = o || {};
  const g = R.g, W = o.W || 340, H = o.H || 320, pad = 46;
  const bw = g.type === 'round' ? g.d : g.b, hh = g.type === 'round' ? g.d : g.h;
  const sc = Math.min((W - 2 * pad - 20) / bw, (H - 2 * pad) / hh);
  const cx = W / 2 + 6, cy = H / 2 - 4;
  const X = y => cx + y * sc, Y = z => cy - z * sc;
  const id = 'h' + (++uid);
  let s = svgOpen(W, H, o.cls || '', o.click ? ' data-sec="1"' : '') + hatch(id, C.char);
  const woodRect = (y0, z0, w, h) => `<rect x="${X(y0).toFixed(1)}" y="${Y(z0 + h).toFixed(1)}" width="${(w * sc).toFixed(1)}" height="${(h * sc).toFixed(1)}" style="fill:${C.wood};stroke:${C.woodln};stroke-width:1.4"/>` +
    // słoje (umowne)
    [0.3, 0.55, 0.8].map(k => `<path d="M${X(y0 + w * 0.15).toFixed(1)} ${Y(z0 + h * k).toFixed(1)} q ${(w * sc * 0.35).toFixed(1)} ${(-h * sc * 0.06).toFixed(1)} ${(w * sc * 0.7).toFixed(1)} 0" style="stroke:${C.wood2};fill:none;stroke-width:1"/>`).join('');
  if (g.type === 'rect') s += woodRect(-g.b / 2, -g.h / 2, g.b, g.h);
  else if (g.type === 'round') s += `<circle cx="${cx}" cy="${cy}" r="${(g.d / 2 * sc).toFixed(1)}" style="fill:${C.wood};stroke:${C.woodln};stroke-width:1.4"/>` + [0.25, 0.5, 0.75].map(k => `<circle cx="${cx}" cy="${cy}" r="${(g.d / 2 * sc * k).toFixed(1)}" style="fill:none;stroke:${C.wood2};stroke-width:0.8"/>`).join('');
  else {
    g.ys.forEach(yc => { s += woodRect(yc - g.t / 2, -g.w / 2, g.t, g.w); });
    // przekładka (w widoku – zarys przerywany)
    s += `<rect x="${X(-g.b / 2).toFixed(1)}" y="${Y(g.w / 2).toFixed(1)}" width="${(g.b * sc).toFixed(1)}" height="${(g.w * sc).toFixed(1)}" style="fill:none;stroke:${C.ink3};stroke-dasharray:4 3;stroke-width:0.9"/>`;
    for (let i = 0; i < g.n - 1; i++) { const ya = g.ys[i] + g.t / 2; s += T(X(ya + g.a / 2), Y(0) + 4, g.conn === 'gusset' ? '' : 'przekł.', { fs: 8.5, c: C.ink3 }); }
  }
  // pożar – przekrój resztkowy
  if (o.fire && R.fire && R.fire.t) {
    const F = R.fire, d = F.def, fc = F.faces;
    if (g.type === 'rect') {
      const y0 = -g.b / 2 + (fc.l ? d : 0), y1 = g.b / 2 - (fc.r ? d : 0), z0 = -g.h / 2 + (fc.b ? d : 0), z1 = g.h / 2 - (fc.t ? d : 0);
      s += `<path d="M${X(-g.b / 2)} ${Y(-g.h / 2)}H${X(g.b / 2)}V${Y(g.h / 2)}H${X(-g.b / 2)}Z M${X(y0)} ${Y(z0)}V${Y(z1)}H${X(y1)}V${Y(z0)}Z" style="fill:url(#${id});fill-rule:evenodd;opacity:.55"/>`;
      if (F.ok) s += `<rect x="${X(y0).toFixed(1)}" y="${Y(z1).toFixed(1)}" width="${((y1 - y0) * sc).toFixed(1)}" height="${((z1 - z0) * sc).toFixed(1)}" style="fill:none;stroke:${C.fail};stroke-width:1.4;stroke-dasharray:5 3"/>`;
    } else if (g.type === 'round') {
      s += `<circle cx="${cx}" cy="${cy}" r="${((g.d / 2 - d / 2) * sc).toFixed(1)}" style="fill:none;stroke:url(#${id});stroke-width:${(d * sc).toFixed(1)};opacity:.55"/>`;
      if (F.ok) s += `<circle cx="${cx}" cy="${cy}" r="${((g.d / 2 - d) * sc).toFixed(1)}" style="fill:none;stroke:${C.fail};stroke-width:1.4;stroke-dasharray:5 3"/>`;
    } else if (F.gf) {
      g.ys.forEach(yc => { const tf = F.gf.t, wf = F.gf.w, zc = ((fc.b ? d : 0) - (fc.t ? d : 0)) / 2; s += `<rect x="${X(yc - tf / 2).toFixed(1)}" y="${Y(zc + wf / 2).toFixed(1)}" width="${(tf * sc).toFixed(1)}" height="${(wf * sc).toFixed(1)}" style="fill:none;stroke:${C.fail};stroke-width:1.3;stroke-dasharray:5 3"/>`; });
    }
  }
  // osie
  const ex = (g.type === 'round' ? g.d : g.b) / 2 * sc + 18, ez = (g.type === 'round' ? g.d : g.h) / 2 * sc + 16;
  s += Ln(cx - ex, cy, cx + ex, cy, C.acc, 0.9, '8 3 2 3') + Ln(cx, cy + ez, cx, cy - ez, C.acc, 0.9, '8 3 2 3');
  s += arrow(cx + ex - 8, cy, cx + ex + 2, cy, C.acc, 1) + T(cx + ex + 8, cy + 4, 'y', { c: C.acc, b: true });
  s += arrow(cx, cy - ez + 8, cx, cy - ez - 2, C.acc, 1) + T(cx + 9, cy - ez + 2, 'z', { c: C.acc, b: true });
  // wymiary
  const bot = cy + (g.type === 'round' ? g.d : g.h) / 2 * sc, lft = cx - (g.type === 'round' ? g.d : g.b) / 2 * sc;
  if (g.type === 'rect') { s += dimH(X(-g.b / 2), X(g.b / 2), bot + 22, `b = ${fx(g.b, 0)}`) + dimV(lft - 22, Y(g.h / 2), Y(-g.h / 2), `h = ${fx(g.h, 0)}`); }
  else if (g.type === 'round') s += dimH(X(-g.d / 2), X(g.d / 2), bot + 22, `d = ${fx(g.d, 0)}`);
  else {
    s += dimH(X(-g.b / 2), X(g.b / 2), bot + 30, `${fx(g.b, 0)}`) + dimV(lft - 22, Y(g.w / 2), Y(-g.w / 2), `w = ${fx(g.w, 0)}`);
    const y0 = g.ys[0] - g.t / 2; s += dimH(X(y0), X(y0 + g.t), bot + 14, `t=${fx(g.t, 0)}`, { fs: 9 }); if (g.n > 1) s += dimH(X(y0 + g.t), X(y0 + g.t + g.a), bot + 14, `a=${fx(g.a, 0)}`, { fs: 9 });
  }
  if (o.fire && R.fire && R.fire.t) s += T(W - 6, H - 6, `R${R.fire.t}: d_ef = ${fx(R.fire.def, 1)} mm`, { a: 'end', fs: 10, c: C.fail });
  if (o.click) s += `<rect x="0" y="0" width="${W}" height="${H}" style="fill:transparent" class="svgclick" data-act="geo"><title>Kliknij, aby zmienić wymiary przekroju</title></rect>`;
  return s + '</svg>';
}

/* ------------------------------------------------------------ schemat statyczny (dwie płaszczyzny) */
function supportBase(x, y, type, c) {
  if (type === 'fix') return `<rect x="${x - 16}" y="${y}" width="32" height="7" style="fill:url(#hb${uid});stroke:${c};stroke-width:1"/>` + Ln(x - 18, y, x + 18, y, c, 1.8);
  return `<path d="M${x} ${y}L${x - 10} ${y + 13}H${x + 10}Z" style="fill:${C.panel};stroke:${c};stroke-width:1.4"/>` + Ln(x - 15, y + 13, x + 15, y + 13, c, 1.4) + `<rect x="${x - 15}" y="${y + 13}" width="30" height="5" style="fill:url(#hb${uid})"/>`;
}
function supportTop(x, y, type, c, side) {
  const d = side || 1;
  if (type === 'free') return '';
  if (type === 'pin') return Ln(x, y, x + d * 20, y, c, 1.3) + `<circle cx="${x + d * 3}" cy="${y}" r="2.5" style="fill:${C.panel};stroke:${c}"/>` + Ln(x + d * 20, y - 9, x + d * 20, y + 9, c, 1.6) + `<rect x="${d > 0 ? x + 20 : x - 25}" y="${y - 9}" width="5" height="18" style="fill:url(#hb${uid})"/>`;
  if (type === 'fix') return `<rect x="${x - 16}" y="${y - 7}" width="32" height="7" style="fill:url(#hb${uid});stroke:${c};stroke-width:1"/>` + Ln(x - 18, y, x + 18, y, c, 1.8);
  // przesuwne: blokada obrotu, swobodny przesuw – dwie rolki nad płytką
  return Ln(x - 14, y - 3, x + 14, y - 3, c, 1.6) + `<circle cx="${x - 7}" cy="${y - 8}" r="3.4" style="fill:${C.panel};stroke:${c}"/><circle cx="${x + 7}" cy="${y - 8}" r="3.4" style="fill:${C.panel};stroke:${c}"/>` + Ln(x - 16, y - 12, x + 16, y - 12, c, 1.6) + `<rect x="${x - 16}" y="${y - 17}" width="32" height="5" style="fill:url(#hb${uid})"/>`;
}
function schemeSVG(R, S, o) {
  o = o || {};
  const W = o.W || 520, H = o.H || 440;
  uid++;
  const top = 92, bot = H - 70, L = S.geom.L * 1000, Hs = (bot - top) / L;
  const Y = x => bot - x * Hs;
  let s = svgOpen(W, H, 'schemesvg') + `<defs><pattern id="hb${uid}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" style="stroke:${C.ink2};stroke-width:1"/></pattern></defs>`;
  const items = S.loads.items;
  const planes = [{ p: 'z', x: W * 0.27, t: 'Płaszczyzna x–z', st: 'wyboczenie wzgl. osi y (h)', H: 'Hz', q: 'qz', e: 'ez', M: 'My' }, { p: 'y', x: W * 0.73, t: 'Płaszczyzna x–y', st: 'wyboczenie wzgl. osi z (b)', H: 'Hy', q: 'qy', e: 'ey', M: 'Mz' }];
  const colW = 12;
  planes.forEach(pl => {
    const cx = pl.x, sp = S.supp[pl.p];
    s += T(cx, 18, pl.t, { fs: 12, b: true }) + T(cx, 32, pl.st, { fs: 10, c: C.ink3 });
    // słup
    s += `<g class="hot" data-act="geo"><rect x="${cx - colW / 2}" y="${Y(L)}" width="${colW}" height="${(L * Hs).toFixed(1)}" style="fill:${C.wood};stroke:${C.woodln};stroke-width:1.3"/><title>Słup – kliknij, aby zmienić przekrój i wysokość</title></g>`;
    // podpory
    s += `<g class="hot" data-act="supp" data-p="${pl.p}">${supportBase(cx, bot, sp.base, C.ink)}${supportTop(cx + colW / 2, Y(L), sp.top, C.ink, 1)}<rect x="${cx - 30}" y="${bot - 4}" width="60" height="26" style="fill:transparent"/><rect x="${cx - 30}" y="${Y(L) - 20}" width="70" height="26" style="fill:transparent"/><title>Warunki podparcia – kliknij, aby zmienić</title></g>`;
    if (sp.base === 'fix' && sp.kb !== '' && +sp.kb > 0) s += T(cx + 22, bot + 4, `k_φ = ${fx(+sp.kb, 0)}`, { fs: 9.5, a: 'start', c: C.ink3 });
    // stężenia
    (R && R.braces ? R.braces[pl.p] : E.parseList(sp.braces).map(v => v * 1000)).forEach(xb => {
      if (xb <= 0 || xb >= L) return;
      const yb = Y(xb);
      s += `<g class="hot" data-act="supp" data-p="${pl.p}">` + Ln(cx + colW / 2, yb, cx + colW / 2 + 18, yb, C.acc, 1.3) + Ln(cx + colW / 2 + 18, yb - 8, cx + colW / 2 + 18, yb + 8, C.acc, 1.6) + `<rect x="${cx + colW / 2 + 18}" y="${yb - 8}" width="5" height="16" style="fill:url(#hb${uid})"/>` + T(cx + colW / 2 + 28, yb + 4, fx(xb / 1000, 2), { fs: 9.5, a: 'start', c: C.acc }) + '<title>Stężenie boczne</title></g>';
    });
    // obciążenia
    let nOff = 0, hOff = 0;
    const qItems = items.map((it, i) => ({ it, i })).filter(q => q.it[pl.q]);
    // obciążenie rozłożone – strzałki z lewej
    qItems.forEach(({ it, i }, k) => {
      const xa = it.qa === '' ? 0 : it.qa * 1000, xb = it.qb === '' ? L : it.qb * 1000, v = it[pl.q], sg = v > 0 ? 1 : -1;
      const off = 26 + k * 30, x0 = cx - colW / 2 - off, len = 20;
      let g2 = `<g class="hot" data-act="load" data-i="${i}">`;
      g2 += Ln(x0 - (sg > 0 ? len : 0), Y(Math.min(xa, xb)), x0 - (sg > 0 ? len : 0), Y(Math.max(xa, xb)), C.d2, 1);
      const n = Math.max(3, Math.round((Math.abs(xb - xa) * Hs) / 22));
      for (let j = 0; j <= n; j++) { const yy = Y(xa + (xb - xa) * j / n); g2 += sg > 0 ? arrow(x0 - len, yy, x0 - 1, yy, C.d2, 1.1) : arrow(x0, yy, x0 - len + 1, yy, C.d2, 1.1); }
      g2 += T(x0 - len / 2, Y(Math.max(xa, xb)) - 5, `${esc(loadId(S, i))}: ${fx(Math.abs(v), 2)}`, { fs: 9.5, c: C.d2 }) + `<title>${esc(it.name)} – q = ${fx(v, 2)} kN/m${it.rev ? ' (±)' : ''}</title></g>`;
      s += g2;
    });
    // siły w głowicy
    items.forEach((it, i) => {
      const id = loadId(S, i);
      if (it.N) {
        const ex = it[pl.e] || 0, xx = cx + clampPx(ex * 0.12) + nOff * 9, up = it.N < 0;
        s += `<g class="hot" data-act="load" data-i="${i}">` + (up ? arrow(xx, Y(L) - 4, xx, Y(L) - 34, C.d1, 1.8) : arrow(xx, Y(L) - 34, xx, Y(L) - 3, C.d1, 1.8)) + `<title>${esc(it.name)}: N = ${fx(it.N, 2)} kN${ex ? `, e = ${fx(ex, 0)} mm` : ''}</title></g>`;
        nOff++;
      }
      if (it[pl.H]) {
        const v = it[pl.H], yy = Y(L) + 10 + hOff * 12;
        s += `<g class="hot" data-act="load" data-i="${i}">` + (v > 0 ? arrow(cx - 48, yy, cx - colW / 2 - 2, yy, C.d3, 1.6) : arrow(cx - colW / 2 - 2, yy, cx - 48, yy, C.d3, 1.6)) + T(cx - 52, yy + 4, `${esc(id)}: ${fx(Math.abs(v), 1)} kN${it.rev ? ' ±' : ''}`, { fs: 9.5, a: 'end', c: C.d3 }) + `<title>${esc(it.name)}: H = ${fx(v, 2)} kN</title></g>`;
        hOff++;
      }
      if (it[pl.M]) {
        const yy = Y(L) + 4, r = 14;
        s += `<g class="hot" data-act="load" data-i="${i}"><path d="M${cx + r} ${yy}A${r} ${r} 0 1 1 ${cx} ${yy - r}" style="fill:none;stroke:${C.d3};stroke-width:1.4"/>` + T(cx + r + 4, yy + 12, `M = ${fx(it[pl.M], 1)}`, { fs: 9.5, a: 'start', c: C.d3 }) + '</g>';
      }
      it.pts.forEach(p => {
        const yy = Y(p.x * 1000);
        if (p.N) s += `<g class="hot" data-act="load" data-i="${i}">` + (p.N > 0 ? arrow(cx + colW / 2 + 6 + clampPx((p[pl.e] || 0) * 0.12), yy - 30, cx + colW / 2 + 6, yy - 2, C.d1, 1.5) : arrow(cx + colW / 2 + 6, yy - 2, cx + colW / 2 + 6, yy - 30, C.d1, 1.5)) + T(cx + colW / 2 + 12, yy - 18, `${esc(id)}: ${fx(Math.abs(p.N), 1)}`, { fs: 9, a: 'start', c: C.d1 }) + '</g>';
        if (p[pl.H]) s += `<g class="hot" data-act="load" data-i="${i}">` + (p[pl.H] > 0 ? arrow(cx - 44, yy, cx - colW / 2 - 2, yy, C.d3, 1.4) : arrow(cx - colW / 2 - 2, yy, cx - 44, yy, C.d3, 1.4)) + T(cx - 48, yy - 3, `${esc(id)}: ${fx(Math.abs(p[pl.H]), 1)}`, { fs: 9, a: 'end', c: C.d3 }) + '</g>';
      });
    });
    // wymiar wysokości
    s += dimV(cx + 62, Y(L), bot, `L = ${fx(S.geom.L, 2)} m`);
    if (R && R.buck && R.buck[pl.p]) s += T(cx, bot + 40, `l_ef = ${fx(R.buck[pl.p].lef / 1000, 3)} m (β = ${fx(R.buck[pl.p].beta, 3)})`, { fs: 10, c: C.acc });
  });
  // podpis sił osiowych
  const nl = items.map((it, i) => it.N ? `${loadId(S, i)} = ${fx(it.N, 1)}` : '').filter(Boolean);
  if (nl.length) s += T(W / 2, 50, `N w głowicy [kN]: ${nl.join(', ')}`, { fs: 10, c: C.d1 });
  if (S.loads.sw && R && R.m) s += T(W / 2, H - 8, `ciężar własny g = ${fx(R.m.gamma * R.g.A * 1e-6, 3)} kN/m (γ = ${fx(R.m.gamma, 2)} kN/m³)`, { fs: 9.5, c: C.ink3 });
  return s + '</svg>';
}
const clampPx = v => Math.max(-30, Math.min(30, v));
function loadId(S, i) {
  let nG = 0, nQ = 0, nA = 0, id = '';
  S.loads.items.forEach((it, k) => { const t = it.kind === 'perm' ? 'G' + (++nG) : it.kind === 'acc' ? 'A' + (++nA) : 'Q' + (++nQ); if (k === i) id = t; });
  return id;
}

/* ------------------------------------------------------------ wykres pionowy (wzdłuż wysokości słupa) */
// o: { W, H, title, unit, xs (stacje [mm]), series: [{ v: [], c, fill, l, dash }], L, dp }
function vChart(o) {
  const W = o.W || 170, H = o.H || 360, top = 30, bot = H - 24, L = o.L;
  const all = o.series.reduce((a, se) => a.concat(se.v.filter(isFinite)), [0]);
  let mn = Math.min(...all), mx = Math.max(...all);
  if (mx - mn < 1e-9) { mx += 1; mn -= 1; }
  const padL = 26, padR = 26, sc = (W - padL - padR) / (mx - mn);
  const X = v => padL + (v - mn) * sc, Y = x => bot - x / L * (bot - top);
  let s = svgOpen(W, H, 'vchart', ` data-chart="${o.key || ''}" data-mn="${mn}" data-mx="${mx}" data-l="${L}" data-top="${top}" data-bot="${bot}"`);
  s += T(W / 2, 13, o.title, { fs: 11, b: true }) + T(W / 2, 25, o.unit || '', { fs: 9.5, c: C.ink3 });
  s += Ln(X(0), top - 2, X(0), bot + 2, C.ink, 1.3);
  [0, 0.25, 0.5, 0.75, 1].forEach(k => { s += Ln(padL - 4, Y(k * L), W - padR + 4, Y(k * L), C.line2, 0.6); });
  o.series.forEach(se => {
    const pts = se.v.map((v, i) => [X(isFinite(v) ? v : 0), Y(o.xs[i])]);
    if (se.fill) s += `<path d="M${X(0)} ${Y(o.xs[0])}${pts.map(p => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')}L${X(0)} ${Y(o.xs[o.xs.length - 1])}Z" style="fill:${se.fill};stroke:none"/>`;
    s += `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')}" style="fill:none;stroke:${se.c};stroke-width:${se.w || 1.6}${se.dash ? ';stroke-dasharray:' + se.dash : ''}"/>`;
  });
  // wartości ekstremalne
  const lab = (v, i, c) => { if (!isFinite(v) || Math.abs(v) < 1e-9) return ''; const x = X(v), y = Y(o.xs[i]); const right = x > W / 2; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" style="fill:${c}"/>` + T(right ? Math.min(W - 2, x + 2) : Math.max(2, x - 2), Math.max(top + 9, Math.min(bot - 3, y - 5)), fx(v, o.dp === undefined ? 1 : o.dp), { fs: 9.5, a: right ? 'end' : 'start', c, b: true }); };
  o.series.filter(se => !se.nolab).forEach(se => {
    let imx = -1, imn = -1; se.v.forEach((v, i) => { if (imx < 0 || v > se.v[imx]) imx = i; if (imn < 0 || v < se.v[imn]) imn = i; });
    if (imx >= 0 && se.v[imx] > 1e-9) s += lab(se.v[imx], imx, se.c);
    if (imn >= 0 && se.v[imn] < -1e-9) s += lab(se.v[imn], imn, se.c);
  });
  s += T(3, bot + 14, '0', { fs: 9, a: 'start', c: C.ink3 }) + T(3, top - 1, fx(L / 1000, 2), { fs: 9, a: 'start', c: C.ink3 });
  s += `<line class="curline" x1="${padL - 4}" x2="${W - padR + 4}" y1="-10" y2="-10" style="stroke:${C.acc};stroke-dasharray:3 3"/><text class="curtxt" x="${W - 2}" y="-10" font-size="10" text-anchor="end" style="fill:${C.acc}"></text>`;
  return s + '</svg>';
}

/* ------------------------------------------------------------ postacie wyboczenia */
function modeSVG(R, S, o) {
  o = o || {};
  const W = o.W || 420, H = o.H || 360, top = 62, bot = H - 50, L = R.L;
  uid++;
  let s = svgOpen(W, H) + `<defs><pattern id="hb${uid}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" style="stroke:${C.ink2};stroke-width:1"/></pattern></defs>`;
  const Y = x => bot - x / L * (bot - top);
  [['z', W * 0.27, 'x–z (wokół osi y)'], ['y', W * 0.73, 'x–y (wokół osi z)']].forEach(([p, cx, t]) => {
    const b = R.buck[p], sp = S.supp[p];
    s += T(cx, 16, `Płaszczyzna ${t}`, { fs: 11.5, b: true });
    s += Ln(cx, Y(0), cx, Y(L), C.line, 3);
    s += supportBase(cx, bot, sp.base, C.ink) + supportTop(cx + 1.5, Y(L), sp.top, C.ink, 1);
    R.braces[p].forEach(xb => { s += Ln(cx, Y(xb), cx + 20, Y(xb), C.acc, 1.3) + Ln(cx + 20, Y(xb) - 7, cx + 20, Y(xb) + 7, C.acc, 1.5); });
    if (b.mode) {
      const amp = 46;
      s += `<path d="${R.xs.map((x, i) => `${i ? 'L' : 'M'}${(cx + b.mode[i] * amp).toFixed(1)} ${Y(x).toFixed(1)}`).join('')}" style="fill:none;stroke:${C.d1};stroke-width:2"/>`;
    }
    s += T(cx, bot + 34, `l_ef = ${fx(b.lef / 1000, 3)} m, β = ${fx(b.beta, 3)}${b.manual ? ' (ręcznie)' : ''}`, { fs: 10.5, c: C.acc });
    s += T(cx, 32, `λ = ${fx(b.lam, 1)}, λ_rel = ${fx(b.lamRel, 3)}, k_c = ${fx(b.kc, 3)}`, { fs: 10, c: C.ink2 });
  });
  return s + '</svg>';
}

/* ------------------------------------------------------------ krzywa k_c(λ_rel) */
function kcSVG(R, o) {
  o = o || {};
  const W = o.W || 440, H = o.H || 260, l = 44, r = 14, t = 20, b = 36, xmax = 3;
  const X = v => l + v / xmax * (W - l - r), Y = v => H - b - v * (H - t - b);
  let s = svgOpen(W, H);
  for (let i = 0; i <= 6; i++) { const v = i * 0.5; s += Ln(X(v), Y(0), X(v), Y(1), C.line2, 0.6) + T(X(v), H - b + 14, fx(v, 1), { fs: 9.5, c: C.ink3 }); }
  for (let i = 0; i <= 5; i++) { const v = i * 0.2; s += Ln(X(0), Y(v), X(xmax), Y(v), C.line2, 0.6) + T(l - 5, Y(v) + 3, fx(v, 1), { fs: 9.5, a: 'end', c: C.ink3 }); }
  s += Ln(X(0), Y(0), X(xmax), Y(0), C.ink, 1) + Ln(X(0), Y(0), X(0), Y(1.02), C.ink, 1);
  s += T(W / 2, H - 6, 'λ_rel', { fs: 10.5 }) + T(12, H / 2, 'k_c', { fs: 10.5, rot: -90 });
  const curve = (bc, c, dash) => { let d = ''; for (let i = 0; i <= 120; i++) { const v = i / 120 * xmax; d += `${i ? 'L' : 'M'}${X(v).toFixed(1)} ${Y(E.kcOf(v, bc).kc).toFixed(1)}`; } return `<path d="${d}" style="fill:none;stroke:${c};stroke-width:1.6${dash ? ';stroke-dasharray:' + dash : ''}"/>`; };
  s += curve(0.2, C.d1, R.m.betaC === 0.2 ? '' : '5 3') + curve(0.1, C.d2, R.m.betaC === 0.1 ? '' : '5 3');
  let euler = ''; for (let i = 0; i <= 100; i++) { const v = 0.6 + i / 100 * (xmax - 0.6); euler += `${i ? 'L' : 'M'}${X(v).toFixed(1)} ${Y(Math.min(1, 1 / (v * v))).toFixed(1)}`; }
  s += `<path d="${euler}" style="fill:none;stroke:${C.ink3};stroke-width:1;stroke-dasharray:2 3"/>`;
  s += T(X(2.2), Y(0.36), 'β_c = 0,2 (lite)', { fs: 9.5, c: C.d1, a: 'start' }) + T(X(1.55), Y(0.62), 'β_c = 0,1 (klejone, LVL)', { fs: 9.5, c: C.d2, a: 'start' }) + T(X(1.25), Y(0.82), '1/λ² (Euler)', { fs: 9, c: C.ink3, a: 'start' });
  [['z', 'y', C.d1], ['y', 'z', C.d2]].forEach(([p, ax]) => { const bk = R.buck[p]; const v = Math.min(xmax, bk.lamRel); s += `<circle cx="${X(v).toFixed(1)}" cy="${Y(bk.kc).toFixed(1)}" r="4.5" style="fill:${C.panel};stroke:${C.ink};stroke-width:1.6"/>` + T(X(v) + 7, Y(bk.kc) - 6, `k_c,${ax} = ${fx(bk.kc, 3)}`, { fs: 10, a: 'start', b: true }); });
  if (R.fire && R.fire.bk) ['z', 'y'].forEach(p => { const bk = R.fire.bk[p], v = Math.min(xmax, bk.lamRel); s += `<rect x="${(X(v) - 3.5).toFixed(1)}" y="${(Y(bk.kc) - 3.5).toFixed(1)}" width="7" height="7" style="fill:${C.fail}"/>`; });
  return s + '</svg>';
}

/* ------------------------------------------------------------ wykres interakcji (6.23 / 6.24) */
function interSVG(R, o) {
  o = o || {};
  const W = o.W || 440, H = o.H || 300, l = 50, r = 16, t = 22, b = 40;
  const pts = [];
  (R.combos.uls || []).forEach(co => {
    if (!co.res) return;
    const r2 = co.res, f = co.fd;
    let best = null;
    for (let i = 0; i < r2.N.length; i++) {
      const N = r2.N[i]; if (N <= 0) continue;
      const g = R.g, sc = N / g.A;
      const smy = g.type === 'round' ? Math.hypot(r2.My[i], r2.Mz[i]) / g.Wy : Math.abs(r2.My[i]) / g.Wy, smz = g.type === 'round' ? 0 : Math.abs(r2.Mz[i]) / g.Wz;
      const a1 = sc / (co.kcy * f.fc0d), m1 = smy / f.fmyd + g.km * smz / f.fmzd;
      const a2 = sc / (co.kcz * f.fc0d), m2 = g.km * smy / f.fmyd + smz / f.fmzd;
      const c1 = a1 + m1 > a2 + m2 ? [m1, a1, 'y'] : [m2, a2, 'z'];
      if (!best || c1[0] + c1[1] > best[0] + best[1]) best = c1;
    }
    if (best) pts.push({ m: best[0], n: best[1], ax: best[2], co });
  });
  const mx = Math.max(1.1, ...pts.map(p => p.m), ...pts.map(p => p.n));
  const X = v => l + v / mx * (W - l - r), Y = v => H - b - v / mx * (H - t - b);
  let s = svgOpen(W, H);
  for (let i = 0; i <= 5; i++) { const v = i * mx / 5; s += Ln(X(v), Y(0), X(v), Y(mx), C.line2, 0.6) + T(X(v), H - b + 14, fx(v, 2), { fs: 9.5, c: C.ink3 }) + Ln(X(0), Y(v), X(mx), Y(v), C.line2, 0.6) + T(l - 5, Y(v) + 3, fx(v, 2), { fs: 9.5, a: 'end', c: C.ink3 }); }
  s += `<path d="M${X(0)} ${Y(1)}L${X(1)} ${Y(0)}L${X(0)} ${Y(0)}Z" style="fill:${C.f3};stroke:none"/>` + Ln(X(0), Y(1), X(1), Y(0), C.ok, 1.6);
  s += Ln(X(0), Y(0), X(mx), Y(0), C.ink, 1) + Ln(X(0), Y(0), X(0), Y(mx), C.ink, 1);
  s += T((W + l) / 2, H - 8, 'udział zginania: σ_m,y,d/f_m,y,d + k_m·σ_m,z,d/f_m,z,d', { fs: 10 }) + T(14, (H - b + t) / 2, 'σ_c,0,d/(k_c·f_c,0,d)', { fs: 10, rot: -90 });
  pts.forEach(p => { const u = p.m + p.n; s += `<circle cx="${X(p.m).toFixed(1)}" cy="${Y(p.n).toFixed(1)}" r="3.2" style="fill:${u > 1 ? C.fail : C.acc};opacity:.75"><title>${p.co.eq}${p.co.lead ? ' – wiodące ' + esc(p.co.lead.name) : ''}: ${fx(u * 100, 0)}% (oś ${p.ax})</title></circle>`; });
  s += T(X(1) + 4, Y(0) - 6, '1,0', { fs: 9.5, a: 'start', c: C.ok });
  return s + '</svg>';
}

/* ------------------------------------------------------------ rysunek słupa (widoki, przekrój, szczegóły) */
function elevSVG(R, S, o) {
  o = o || {};
  const W = o.W || 900, H = o.H || 560, g = R.g, L = R.L;
  uid++;
  const id = 'he' + uid;
  const top = 60, bot = H - 90, sc = (bot - top) / (L + 700);
  const Y = x => bot - 160 * sc / sc - x * sc;
  const yb = bot - 120 * sc - 40;
  const Yc = x => yb - x * sc;
  let s = svgOpen(W, H) + hatch(id, C.ink3);
  const dims = { z: g.type === 'round' ? g.d : g.type === 'spaced' ? g.w : g.h, y: g.type === 'round' ? g.d : g.b };
  const views = [{ p: 'z', x: W * 0.2, t: 'Widok A (płaszczyzna x–z)', w: dims.y }, { p: 'y', x: W * 0.47, t: 'Widok B (płaszczyzna x–y)', w: dims.z }];
  const cn = S.conn;
  const wsc = Math.max(sc, 0.06);
  views.forEach((v, vi) => {
    const cx = v.x, hw = v.w / 2 * wsc;
    s += T(cx, 18, v.t, { fs: 12, b: true });
    // podstawa
    if (cn.base === 'steel') {
      const pa = (vi === 0 ? +cn.plate.a : +cn.plate.b) || 200, B = (vi === 0 ? +cn.plate.B1 : +cn.plate.B2) || 400;
      s += `<rect x="${cx - B / 2 * wsc}" y="${Yc(0) + 10}" width="${B * wsc}" height="46" style="fill:url(#${id});stroke:${C.ink2}"/>` + T(cx, Yc(0) + 72, 'fundament / cokół', { fs: 9.5, c: C.ink3 });
      s += `<rect x="${cx - pa / 2 * wsc}" y="${Yc(0)}" width="${pa * wsc}" height="10" style="fill:${C.steel};stroke:${C.ink}"/>`;
      s += `<rect x="${cx - hw - 4}" y="${Yc(0) - 46}" width="4" height="46" style="fill:${C.steel};stroke:${C.ink}"/><rect x="${cx + hw}" y="${Yc(0) - 46}" width="4" height="46" style="fill:${C.steel};stroke:${C.ink}"/>`;
      for (let k = 0; k < 2; k++) s += `<circle cx="${cx}" cy="${Yc(0) - 14 - k * 18}" r="2.6" style="fill:${C.panel};stroke:${C.ink}"/>`;
    } else if (cn.base === 'sill') {
      const sw = +cn.sill.w || 140;
      const along = (cn.sill.dir === 'y') === (vi === 0);
      s += along ? `<rect x="${cx - 140}" y="${Yc(0)}" width="280" height="${sw * wsc}" style="fill:${C.wood2};stroke:${C.woodln}"/>` : `<rect x="${cx - sw / 2 * wsc}" y="${Yc(0)}" width="${sw * wsc}" height="${sw * wsc}" style="fill:${C.wood2};stroke:${C.woodln}"/>`;
      s += T(cx, Yc(0) + sw * wsc + 14, 'podwalina', { fs: 9.5, c: C.ink3 });
    } else s += Ln(cx - 60, Yc(0), cx + 60, Yc(0), C.ink, 1.5) + `<rect x="${cx - 60}" y="${Yc(0)}" width="120" height="8" style="fill:url(#${id})"/>`;
    // słup
    if (g.type === 'spaced' && vi === 0) {
      g.ys.forEach(yc => { s += `<rect x="${cx + (yc - g.t / 2) * wsc}" y="${Yc(L)}" width="${g.t * wsc}" height="${L * sc}" style="fill:${C.wood};stroke:${C.woodln};stroke-width:1.2"/>`; });
      const nb = R.sp ? R.sp.nb : 3, l2 = R.sp ? R.sp.l2 : 200;
      for (let k = 0; k <= nb; k++) { const xm = Math.min(L - l2 / 2, Math.max(l2 / 2, k * L / nb)); s += `<rect x="${cx - g.b / 2 * wsc}" y="${Yc(xm + l2 / 2)}" width="${g.b * wsc}" height="${l2 * sc}" style="fill:${C.wood2};stroke:${C.woodln};stroke-width:1;opacity:.85"/>`; }
    } else {
      s += `<rect x="${cx - hw}" y="${Yc(L)}" width="${2 * hw}" height="${L * sc}" style="fill:${C.wood};stroke:${C.woodln};stroke-width:1.2"/>`;
      for (let k = 1; k <= 3; k++) s += Ln(cx - hw + 2 * hw * k / 4, Yc(L) + 4, cx - hw + 2 * hw * k / 4 + (k % 2 ? 2 : -2), Yc(0) - 4, C.wood2, 0.8);
    }
    // głowica
    if (cn.top === 'beam') {
      const bwd = +cn.beam.w || 140, along = (cn.beam.dir === 'y') === (vi === 0);
      s += along ? `<rect x="${cx - 150}" y="${Yc(L) - bwd * wsc * 1.4}" width="300" height="${bwd * wsc * 1.4}" style="fill:${C.wood2};stroke:${C.woodln}"/>` : `<rect x="${cx - bwd / 2 * wsc}" y="${Yc(L) - bwd * wsc * 1.4}" width="${bwd * wsc}" height="${bwd * wsc * 1.4}" style="fill:${C.wood2};stroke:${C.woodln}"/>`;
      s += T(cx, Yc(L) - bwd * wsc * 1.4 - 6, 'belka / oczep', { fs: 9.5, c: C.ink3 });
    }
    // stężenia
    R.braces[v.p].forEach(xb => { s += Ln(cx + hw, Yc(xb), cx + hw + 34, Yc(xb), C.acc, 2) + T(cx + hw + 38, Yc(xb) + 4, `stężenie ${fx(xb / 1000, 2)} m`, { fs: 9.5, a: 'start', c: C.acc }); });
    // wymiary
    s += dimV(cx - hw - 34, Yc(L), Yc(0), `${fx(L, 0)}`);
    s += dimH(cx - hw, cx + hw, Yc(L) - (cn.top === 'beam' ? 60 : 16), fx(v.w, 0), { fs: 10 });
    // przekrój A-A
    if (vi === 0) s += Ln(cx - hw - 20, Yc(L * 0.55), cx - hw - 6, Yc(L * 0.55), C.ink, 1.6) + Ln(cx + hw + 6, Yc(L * 0.55), cx + hw + 20, Yc(L * 0.55), C.ink, 1.6) + T(cx - hw - 24, Yc(L * 0.55) + 4, 'A', { fs: 11, b: true, a: 'end' }) + T(cx + hw + 24, Yc(L * 0.55) + 4, 'A', { fs: 11, b: true, a: 'start' });
  });
  // przekrój A–A
  const sx = W * 0.8;
  s += T(sx, 18, 'Przekrój A–A', { fs: 12, b: true });
  s += `<g transform="translate(${sx - 150} 30)">${sectionSVG(R, S, { W: 300, H: 280 }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>`;
  // opis materiału
  const desc = [`Materiał: ${esc(R.m.name)} (${esc(R.m.std)}), klasa użytkowania ${S.mat.sc}`, `Przekrój: ${secTxt(R, S)}`, `Wysokość L = ${fx(S.geom.L, 2)} m; podstawa: ${esc(baseTxt(S))}; głowica: ${esc(topTxt(S))}`];
  if (R.fire && R.fire.t) desc.push(`Odporność ogniowa R${R.fire.t}`);
  const maxc = Math.max(30, Math.floor((W - sx + 150) / 6.2)), lines = [];
  desc.forEach(t => { let cur = ''; t.split(' ').forEach(w => { if ((cur + ' ' + w).trim().length > maxc) { lines.push(cur); cur = '   ' + w; } else cur = (cur + ' ' + w).trim() === '' ? w : (cur ? cur + ' ' + w : w); }); if (cur) lines.push(cur); });
  lines.forEach((t, i) => { s += T(sx - 150, 340 + i * 16, t, { fs: 10.5, a: 'start' }); });
  return s + '</svg>';
}
function secTxt(R, S) { const g = R.g; return g.type === 'round' ? `okrągły ⌀${fx(g.d, 0)} mm` : g.type === 'spaced' ? `wielogałęziowy ${g.n} × ${fx(g.t, 0)}×${fx(g.w, 0)} mm, odstęp a = ${fx(g.a, 0)} mm (${S.geom.sp.conn === 'pack' ? 'przekładki' : 'nakładki'})` : `prostokątny b×h = ${fx(g.b, 0)}×${fx(g.h, 0)} mm`; }
function baseTxt(S) { return S.conn.base === 'steel' ? `stopa stalowa ${S.conn.plate.a}×${S.conn.plate.b} mm na betonie ${S.conn.plate.conc}` : S.conn.base === 'sill' ? `podwalina drewniana szer. ${S.conn.sill.w} mm` : 'bez sprawdzenia'; }
function topTxt(S) { return S.conn.top === 'beam' ? `belka/oczep szer. ${S.conn.beam.w} mm oparty na głowicy` : 'bez sprawdzenia oparcia'; }

/* ------------------------------------------------------------ wykres linii (np. zwęglenie w czasie) */
function lineChart(o) {
  const W = o.W || 420, H = o.H || 220, l = 44, r = 14, t = 24, b = 34;
  const xs = o.series.reduce((a, se) => a.concat(se.x), []), ys = o.series.reduce((a, se) => a.concat(se.y), [0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(0, ...ys), y1 = Math.max(...ys) * 1.08 || 1;
  const X = v => l + (v - x0) / ((x1 - x0) || 1) * (W - l - r), Y = v => H - b - (v - y0) / ((y1 - y0) || 1) * (H - t - b);
  let s = svgOpen(W, H) + T(W / 2, 14, o.title || '', { fs: 11, b: true });
  for (let i = 0; i <= 5; i++) { const v = x0 + i * (x1 - x0) / 5, w = y0 + i * (y1 - y0) / 5; s += Ln(X(v), Y(y0), X(v), Y(y1), C.line2, 0.6) + T(X(v), H - b + 14, fx(v, 0), { fs: 9.5, c: C.ink3 }) + Ln(X(x0), Y(w), X(x1), Y(w), C.line2, 0.6) + T(l - 5, Y(w) + 3, fx(w, 1), { fs: 9.5, a: 'end', c: C.ink3 }); }
  s += Ln(X(x0), Y(y0), X(x1), Y(y0), C.ink, 1) + Ln(X(x0), Y(y0), X(x0), Y(y1), C.ink, 1);
  o.series.forEach(se => { s += `<path d="${se.x.map((v, i) => `${i ? 'L' : 'M'}${X(v).toFixed(1)} ${Y(se.y[i]).toFixed(1)}`).join('')}" style="fill:none;stroke:${se.c};stroke-width:1.7${se.dash ? ';stroke-dasharray:' + se.dash : ''}"/>`; });
  if (o.xl) s += T(W / 2, H - 6, o.xl, { fs: 10 });
  if (o.yl) s += T(12, H / 2, o.yl, { fs: 10, rot: -90 });
  (o.marks || []).forEach(mk => { s += Ln(X(mk.x), Y(y0), X(mk.x), Y(y1), mk.c || C.fail, 1, '4 3') + T(X(mk.x) + 3, Y(y1) + 10, mk.l, { fs: 9.5, a: 'start', c: mk.c || C.fail }); });
  return s + '</svg>';
}

window.SDG = { C, sectionSVG, schemeSVG, vChart, modeSVG, kcSVG, interSVG, elevSVG, lineChart, loadId, secTxt, baseTxt, topTxt, dimH, dimV, arrow, T, Ln, svgOpen };
})();
