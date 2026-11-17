/* SłupDrewniany – eksport rysunku słupa do DXF (AutoCAD R12, ASCII). Model w milimetrach (1:1):
   widok A (płaszczyzna x–z), widok B (płaszczyzna x–y), przekrój A–A, wymiary, opis materiału. */
(function () {
'use strict';
const SDD = window.SDD = {};
const E = window.EC5;
const LAYERS = [['DREWNO', 30, 'CONTINUOUS'], ['STAL', 8, 'CONTINUOUS'], ['BETON', 9, 'CONTINUOUS'], ['OSIE', 1, 'CONTINUOUS'], ['WYMIARY', 3, 'CONTINUOUS'], ['OPIS', 7, 'CONTINUOUS'], ['STEZENIA', 5, 'CONTINUOUS'], ['POZAR', 1, 'CONTINUOUS']];
function writer() {
  const out = [];
  const add = (...a) => { for (let i = 0; i < a.length; i += 2) out.push(String(a[i]), typeof a[i + 1] === 'number' ? (+a[i + 1].toFixed(4)).toString() : String(a[i + 1])); };
  return {
    out: () => out, add,
    line: (ly, x1, y1, x2, y2) => add(0, 'LINE', 8, ly, 10, x1, 20, y1, 30, 0, 11, x2, 21, y2, 31, 0),
    rect: function (ly, x, y, w, h) { this.line(ly, x, y, x + w, y); this.line(ly, x + w, y, x + w, y + h); this.line(ly, x + w, y + h, x, y + h); this.line(ly, x, y + h, x, y); },
    circle: (ly, x, y, r) => add(0, 'CIRCLE', 8, ly, 10, x, 20, y, 30, 0, 40, r),
    text: (ly, x, y, h, t, al, rot) => { const a = al === 'c' ? 1 : al === 'r' ? 2 : 0; add(0, 'TEXT', 8, ly, 10, x, 20, y, 30, 0, 40, h, 1, ascii(t)); if (rot) add(50, rot); if (a) add(72, a, 11, x, 21, y, 31, 0); },
  };
}
// DXF R12 – znaki spoza ASCII jako \U+XXXX
const ascii = s => String(s).replace(/[^\x20-\x7e]/g, c => '\\U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
function dimH(D, x1, x2, y, t, th) { D.line('WYMIARY', x1, y, x2, y); D.line('WYMIARY', x1, y - th * 0.6, x1, y + th * 0.6); D.line('WYMIARY', x2, y - th * 0.6, x2, y + th * 0.6); D.line('WYMIARY', x1 - th * 0.4, y - th * 0.4, x1 + th * 0.4, y + th * 0.4); D.line('WYMIARY', x2 - th * 0.4, y - th * 0.4, x2 + th * 0.4, y + th * 0.4); D.text('WYMIARY', (x1 + x2) / 2, y + th * 0.4, th, t, 'c'); }
function dimV(D, x, y1, y2, t, th) { D.line('WYMIARY', x, y1, x, y2); D.line('WYMIARY', x - th * 0.6, y1, x + th * 0.6, y1); D.line('WYMIARY', x - th * 0.6, y2, x + th * 0.6, y2); D.line('WYMIARY', x - th * 0.4, y1 - th * 0.4, x + th * 0.4, y1 + th * 0.4); D.line('WYMIARY', x - th * 0.4, y2 - th * 0.4, x + th * 0.4, y2 + th * 0.4); D.text('WYMIARY', x - th * 0.4, (y1 + y2) / 2, th, t, 'c', 90); }
SDD.build = function (R, S) {
  const D = writer(), g = R.g, L = R.L, cn = S.conn, th = Math.max(40, L / 60);
  const wY = g.type === 'round' ? g.d : g.b, wZ = g.type === 'round' ? g.d : g.type === 'spaced' ? g.w : g.h;
  const gap = Math.max(1500, 6 * Math.max(wY, wZ));
  const views = [{ x0: 0, w: wY, t: 'WIDOK A (plaszczyzna x-z)', p: 'z', vi: 0 }, { x0: gap, w: wZ, t: 'WIDOK B (plaszczyzna x-y)', p: 'y', vi: 1 }];
  views.forEach(v => {
    const cx = v.x0;
    // podstawa
    if (cn.base === 'steel') {
      const pa = v.vi === 0 ? +cn.plate.a : +cn.plate.b, B = v.vi === 0 ? +cn.plate.B1 : +cn.plate.B2;
      D.rect('STAL', cx - pa / 2, -15, pa, 15);
      D.rect('BETON', cx - B / 2, -15 - 400, B, 400);
      D.rect('STAL', cx - v.w / 2 - 8, 0, 8, 200); D.rect('STAL', cx + v.w / 2, 0, 8, 200);
      D.text('OPIS', cx, -15 - 400 - th * 1.6, th * 0.8, 'fundament / cokol', 'c');
    } else if (cn.base === 'sill') {
      const sw = +cn.sill.w || 140, along = (cn.sill.dir === 'y') === (v.vi === 0);
      if (along) D.rect('DREWNO', cx - 1000, -sw, 2000, sw); else D.rect('DREWNO', cx - sw / 2, -sw, sw, sw);
      D.text('OPIS', cx, -sw - th * 1.6, th * 0.8, 'podwalina', 'c');
    } else D.line('BETON', cx - 500, 0, cx + 500, 0);
    // słup
    if (g.type === 'spaced' && v.vi === 0) {
      g.ys.forEach(yc => D.rect('DREWNO', cx + yc - g.t / 2, 0, g.t, L));
      const nb = R.sp ? R.sp.nb : 3, l2 = R.sp ? R.sp.l2 : 200;
      for (let k = 0; k <= nb; k++) { const xm = Math.min(L - l2 / 2, Math.max(l2 / 2, k * L / nb)); for (let i = 0; i < g.n - 1; i++) D.rect('DREWNO', cx + g.ys[i] + g.t / 2, xm - l2 / 2, g.a, l2); }
    } else D.rect('DREWNO', cx - v.w / 2, 0, v.w, L);
    // oś
    D.line('OSIE', cx, -200, cx, L + 200);
    // głowica
    if (cn.top === 'beam') { const bw = +cn.beam.w || 140, along = (cn.beam.dir === 'y') === (v.vi === 0), hb = Math.max(1.4 * bw, 200); if (along) D.rect('DREWNO', cx - 1000, L, 2000, hb); else D.rect('DREWNO', cx - bw / 2, L, bw, hb); D.text('OPIS', cx, L + hb + th * 0.6, th * 0.8, 'belka / oczep', 'c'); }
    // stężenia
    R.braces[v.p].forEach(xb => { D.line('STEZENIA', cx + v.w / 2, xb, cx + v.w / 2 + 600, xb); D.text('STEZENIA', cx + v.w / 2 + 650, xb, th * 0.8, `stezenie x = ${E.fx(xb / 1000, 2)} m`); });
    // wymiary
    dimV(D, cx - v.w / 2 - 4 * th, 0, L, E.fx(L, 0), th);
    dimH(D, cx - v.w / 2, cx + v.w / 2, L + (cn.top === 'beam' ? Math.max(1.4 * (+cn.beam.w || 140), 200) + 3 * th : 2 * th), E.fx(v.w, 0), th);
    D.text('OPIS', cx, -900, th * 1.2, v.t, 'c');
    if (v.vi === 0) { D.line('OSIE', cx - v.w / 2 - 2.5 * th, L * 0.55, cx - v.w / 2 - 0.5 * th, L * 0.55); D.line('OSIE', cx + v.w / 2 + 0.5 * th, L * 0.55, cx + v.w / 2 + 2.5 * th, L * 0.55); D.text('OPIS', cx - v.w / 2 - 3 * th, L * 0.55, th, 'A', 'r'); D.text('OPIS', cx + v.w / 2 + 3 * th, L * 0.55, th, 'A'); }
  });
  // przekrój A–A (skala 1:1, ustawiony obok)
  const sx = 2 * gap, sy = L * 0.6;
  D.text('OPIS', sx, sy + Math.max(wY, wZ) / 2 + 3 * th, th * 1.2, 'PRZEKROJ A-A', 'c');
  if (g.type === 'rect') D.rect('DREWNO', sx - g.b / 2, sy - g.h / 2, g.b, g.h);
  else if (g.type === 'round') D.circle('DREWNO', sx, sy, g.d / 2);
  else g.ys.forEach(yc => D.rect('DREWNO', sx + yc - g.t / 2, sy - g.w / 2, g.t, g.w));
  D.line('OSIE', sx - wY / 2 - 2 * th, sy, sx + wY / 2 + 2 * th, sy); D.line('OSIE', sx, sy - wZ / 2 - 2 * th, sx, sy + wZ / 2 + 2 * th);
  D.text('OSIE', sx + wY / 2 + 2.3 * th, sy, th * 0.8, 'y'); D.text('OSIE', sx, sy + wZ / 2 + 2.3 * th, th * 0.8, 'z', 'c');
  dimH(D, sx - wY / 2, sx + wY / 2, sy - wZ / 2 - 3 * th, E.fx(wY, 0), th);
  dimV(D, sx - wY / 2 - 3 * th, sy - wZ / 2, sy + wZ / 2, E.fx(wZ, 0), th);
  if (R.fire && R.fire.ok && g.type === 'rect') { const d = R.fire.def, fc = R.fire.faces; D.rect('POZAR', sx - g.b / 2 + (fc.l ? d : 0), sy - g.h / 2 + (fc.b ? d : 0), g.b - d * ((fc.l ? 1 : 0) + (fc.r ? 1 : 0)), g.h - d * ((fc.t ? 1 : 0) + (fc.b ? 1 : 0))); D.text('POZAR', sx, sy - wZ / 2 - 5.5 * th, th * 0.7, `przekroj resztkowy R${R.fire.t} (d_ef = ${E.fx(d, 1)} mm)`, 'c'); }
  // opis
  const desc = [`Element: ${S.meta.name || 'Slup'}`, `Material: ${R.m.name} (${R.m.std}), klasa uzytkowania ${S.mat.sc}`, `Przekroj: ${window.SDG.secTxt(R, S)}`, `Wysokosc L = ${E.fx(S.geom.L, 2)} m`, `Podstawa: ${window.SDG.baseTxt(S)}`, `Glowica: ${window.SDG.topTxt(S)}`];
  if (R.fire && R.fire.t) desc.push(`Odpornosc ogniowa R${R.fire.t}`);
  desc.forEach((t, i) => D.text('OPIS', sx - Math.max(wY, 600), sy - wZ / 2 - 9 * th - i * th * 1.6, th * 0.8, t));
  // nagłówek DXF
  const H = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '9', '$EXTMIN', '10', '-3000', '20', '-3000', '30', '0', '9', '$EXTMAX', '10', String(Math.round(3 * gap)), '20', String(Math.round(L + 3000)), '30', '0', '0', 'ENDSEC'];
  const T = ['0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LTYPE', '70', '1', '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0', '0', 'ENDTAB', '0', 'TABLE', '2', 'LAYER', '70', String(LAYERS.length + 1), '0', 'LAYER', '2', '0', '70', '0', '62', '7', '6', 'CONTINUOUS'];
  LAYERS.forEach(([nm, col, lt]) => T.push('0', 'LAYER', '2', nm, '70', '0', '62', String(col), '6', lt));
  T.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'BLOCKS', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
  return H.concat(T, D.out(), ['0', 'ENDSEC', '0', 'EOF']).join('\r\n') + '\r\n';
};
})();
