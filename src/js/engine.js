/* =====================================================================
   SłupDrewniany – silnik obliczeń słupów drewnianych wg PN-EN 1995-1-1
   (z uwzględnieniem Załącznika Krajowego PL), PN-EN 1995-1-2 (pożar),
   PN-EN 1990 (kombinacje), PN-EN 338 / PN-EN 14080 (klasy drewna),
   PN-EN 1991-1-1/-1-3/-1-4 (generatory obciążeń), PN-EN 1992-1-1 6.7 (docisk do betonu).
   Jednostki wewnętrzne: N, mm, MPa.  Wyniki: kN, kNm, mm.
   ===================================================================== */
(function (root) {
'use strict';

/* ---------------------------------------------------------------- tabele */
// id, fm,k, ft,0,k, ft,90,k, fc,0,k, fc,90,k, fv,k [MPa], E0,mean, E0,05, E90,mean, Gmean [MPa], ρk, ρmean [kg/m³]
// PN-EN 338:2016 – drewno lite iglaste (C) i liściaste (D)
const C_ROWS = [
  ['C14', 14, 7.2, 0.4, 16, 2.0, 3.0, 7000, 4700, 230, 440, 290, 350],
  ['C16', 16, 8.5, 0.4, 17, 2.2, 3.2, 8000, 5400, 270, 500, 310, 370],
  ['C18', 18, 10, 0.4, 18, 2.2, 3.4, 9000, 6000, 300, 560, 320, 380],
  ['C20', 20, 11.5, 0.4, 19, 2.3, 3.6, 9500, 6400, 320, 590, 330, 400],
  ['C22', 22, 13, 0.4, 20, 2.4, 3.8, 10000, 6700, 330, 630, 340, 410],
  ['C24', 24, 14.5, 0.4, 21, 2.5, 4.0, 11000, 7400, 370, 690, 350, 420],
  ['C27', 27, 16.5, 0.4, 22, 2.5, 4.0, 11500, 7700, 380, 720, 360, 430],
  ['C30', 30, 19, 0.4, 24, 2.7, 4.0, 12000, 8000, 400, 750, 380, 460],
  ['C35', 35, 22.5, 0.4, 25, 2.7, 4.0, 13000, 8700, 430, 810, 390, 470],
  ['C40', 40, 26, 0.4, 27, 2.8, 4.0, 14000, 9400, 470, 880, 400, 480],
  ['C45', 45, 30, 0.4, 29, 2.9, 4.0, 15000, 10100, 500, 940, 410, 490],
  ['C50', 50, 33.5, 0.4, 30, 3.0, 4.0, 16000, 10700, 530, 1000, 430, 520],
];
const D_ROWS = [
  ['D18', 18, 11, 0.6, 18, 4.8, 3.5, 9500, 8000, 630, 590, 475, 570],
  ['D24', 24, 14, 0.6, 21, 4.9, 3.7, 10000, 8400, 670, 620, 485, 580],
  ['D27', 27, 16, 0.6, 22, 5.1, 3.8, 10500, 8800, 700, 660, 510, 610],
  ['D30', 30, 18, 0.6, 24, 5.3, 3.9, 11000, 9200, 730, 690, 530, 640],
  ['D35', 35, 21, 0.6, 25, 5.4, 4.1, 12000, 10100, 800, 750, 540, 650],
  ['D40', 40, 24, 0.6, 27, 5.5, 4.2, 13000, 10900, 870, 810, 550, 660],
  ['D45', 45, 27, 0.6, 29, 5.8, 4.4, 13500, 11300, 900, 840, 580, 700],
  ['D50', 50, 30, 0.6, 30, 6.2, 4.5, 14000, 11800, 930, 880, 620, 740],
  ['D55', 55, 33, 0.6, 32, 6.6, 4.7, 15500, 13000, 1030, 970, 660, 790],
  ['D60', 60, 36, 0.6, 33, 10.5, 4.8, 17000, 14300, 1130, 1060, 700, 840],
  ['D65', 65, 39, 0.6, 35, 11.3, 5.0, 18500, 15500, 1230, 1160, 750, 900],
  ['D70', 70, 42, 0.6, 36, 12.0, 5.0, 20000, 16800, 1330, 1250, 800, 960],
  ['D75', 75, 45, 0.6, 37, 12.8, 5.0, 22000, 18500, 1470, 1380, 850, 1020],
  ['D80', 80, 48, 0.6, 38, 13.5, 5.0, 24000, 20200, 1600, 1500, 900, 1080],
];
// PN-EN 14080:2013 – drewno klejone warstwowo: id, fm,g,k, ft,0,g,k, ft,90,g,k, fc,0,g,k, fc,90,g,k, fv,g,k, E0,g,mean, E0,g,05, E90,g,mean, Gg,mean, ρg,k, ρg,mean (Gg,05 = 540 MPa)
const GL_ROWS = [
  ['GL20h', 20, 16, 0.5, 20, 2.5, 3.5, 8400, 7000, 300, 650, 340, 370],
  ['GL22h', 22, 17.6, 0.5, 22, 2.5, 3.5, 10500, 8800, 300, 650, 370, 410],
  ['GL24h', 24, 19.2, 0.5, 24, 2.5, 3.5, 11500, 9600, 300, 650, 385, 420],
  ['GL26h', 26, 20.8, 0.5, 26, 2.5, 3.5, 12100, 10100, 300, 650, 405, 445],
  ['GL28h', 28, 22.3, 0.5, 28, 2.5, 3.5, 12600, 10500, 300, 650, 425, 460],
  ['GL30h', 30, 24, 0.5, 30, 2.5, 3.5, 13600, 11300, 300, 650, 430, 480],
  ['GL32h', 32, 25.6, 0.5, 32, 2.5, 3.5, 14200, 11800, 300, 650, 440, 490],
  ['GL20c', 20, 15, 0.5, 18.5, 2.5, 3.5, 10400, 8600, 300, 650, 355, 390],
  ['GL22c', 22, 16, 0.5, 20, 2.5, 3.5, 10400, 8600, 300, 650, 355, 390],
  ['GL24c', 24, 17, 0.5, 21.5, 2.5, 3.5, 11000, 9100, 300, 650, 365, 400],
  ['GL26c', 26, 19, 0.5, 23.5, 2.5, 3.5, 12000, 10000, 300, 650, 385, 420],
  ['GL28c', 28, 19.5, 0.5, 24, 2.5, 3.5, 12500, 10400, 300, 650, 390, 420],
  ['GL30c', 30, 19.5, 0.5, 24.5, 2.5, 3.5, 13000, 10800, 300, 650, 390, 430],
  ['GL32c', 32, 19.5, 0.5, 24.5, 2.5, 3.5, 13500, 11200, 300, 650, 400, 440],
];
// LVL – wartości przykładowe wg deklaracji producenta (Kerto-S, krawędziowo): fm,0,edge,k, ft,0,k, ft,90,edge,k, fc,0,k, fc,90,edge,k, fv,0,edge,k, E0,mean, E0,05, E90,mean, Gmean, ρk, ρmean; G0,05 = 400 MPa, s = 0,12
const LVL_ROWS = [
  ['LVL-S', 44, 35, 0.8, 35, 6.0, 4.2, 13800, 11600, 430, 600, 480, 510],
];
const KIND = {
  solid: { name: 'drewno lite iglaste', gM: 1.3, betaC: 0.2, kfi: 1.25, b0: 0.65, bn: 0.8, kcr: 0.67 },
  hard: { name: 'drewno lite liściaste', gM: 1.3, betaC: 0.2, kfi: 1.25, b0: 0.50, bn: 0.55, kcr: 0.67 },
  glulam: { name: 'drewno klejone warstwowo', gM: 1.25, betaC: 0.1, kfi: 1.15, b0: 0.65, bn: 0.7, kcr: 0.67 },
  lvl: { name: 'LVL (fornir klejony warstwowo)', gM: 1.2, betaC: 0.1, kfi: 1.1, b0: 0.65, bn: 0.7, kcr: 1.0 },
};
const mkMat = (r, kind, extra) => Object.assign({ id: r[0], name: r[0], kind, fmk: r[1], ft0k: r[2], ft90k: r[3], fc0k: r[4], fc90k: r[5], fvk: r[6], E0mean: r[7], E005: r[8], E90mean: r[9], Gmean: r[10], rhok: r[11], rhomean: r[12] }, extra || {});
const MATS = {};
C_ROWS.forEach(r => { MATS[r[0]] = mkMat(r, 'solid', { G005: Math.round(r[10] * r[8] / r[7]), std: 'PN-EN 338:2016' }); });
D_ROWS.forEach(r => { MATS[r[0]] = mkMat(r, 'hard', { G005: Math.round(r[10] * r[8] / r[7]), std: 'PN-EN 338:2016' }); });
GL_ROWS.forEach(r => { MATS[r[0]] = mkMat(r, 'glulam', { G005: 540, std: 'PN-EN 14080:2013' }); });
LVL_ROWS.forEach(r => { MATS[r[0]] = mkMat(r, 'lvl', { G005: 400, s: 0.12, name: 'LVL (Kerto-S)', std: 'deklaracja producenta (EN 14374)' }); });
const MAT_GROUPS = [
  ['Drewno lite iglaste – PN-EN 338', C_ROWS.map(r => r[0])],
  ['Drewno lite liściaste – PN-EN 338', D_ROWS.map(r => r[0])],
  ['Drewno klejone jednorodne (h) – PN-EN 14080', GL_ROWS.slice(0, 7).map(r => r[0])],
  ['Drewno klejone kombinowane (c) – PN-EN 14080', GL_ROWS.slice(7).map(r => r[0])],
  ['LVL – dane producenta', ['LVL-S']],
  ['Inne', ['user']],
];

// kmod (tab. 3.1) – drewno lite, klejone, LVL; klasy użytkowania 1, 2, 3
const KMOD = {
  1: { perm: 0.60, long: 0.70, med: 0.80, short: 0.90, inst: 1.10 },
  2: { perm: 0.60, long: 0.70, med: 0.80, short: 0.90, inst: 1.10 },
  3: { perm: 0.50, long: 0.55, med: 0.65, short: 0.70, inst: 0.90 },
};
// kdef (tab. 3.2)
const KDEF = { 1: 0.60, 2: 0.80, 3: 2.00 };
// klasy trwania obciążenia (tab. 2.1, 2.2)
const DUR = {
  perm: { n: 'stałe', r: 0, d: '> 10 lat (ciężar własny)' },
  long: { n: 'długotrwałe', r: 1, d: '6 miesięcy – 10 lat (składowanie)' },
  med: { n: 'średniotrwałe', r: 2, d: '1 tydzień – 6 miesięcy (obciążenia użytkowe stropów)' },
  short: { n: 'krótkotrwałe', r: 3, d: '< 1 tydzień (śnieg wg ZK PL)' },
  inst: { n: 'chwilowe', r: 4, d: 'wiatr, oddziaływania wyjątkowe' },
};
const DUR_KEYS = ['perm', 'long', 'med', 'short', 'inst'];

// PN-EN 1990 tab. A1.1 (ZK PL)
const PSI = {
  A: { name: 'Kat. A – powierzchnie mieszkalne', p0: 0.7, p1: 0.5, p2: 0.3, dur: 'med' },
  B: { name: 'Kat. B – biura', p0: 0.7, p1: 0.5, p2: 0.3, dur: 'med' },
  C: { name: 'Kat. C – miejsca zebrań', p0: 0.7, p1: 0.7, p2: 0.6, dur: 'med' },
  D: { name: 'Kat. D – powierzchnie handlowe', p0: 0.7, p1: 0.7, p2: 0.6, dur: 'med' },
  E: { name: 'Kat. E – magazyny', p0: 1.0, p1: 0.9, p2: 0.8, dur: 'long' },
  F: { name: 'Kat. F – ruch pojazdów ≤ 30 kN', p0: 0.7, p1: 0.7, p2: 0.6, dur: 'short' },
  G: { name: 'Kat. G – ruch pojazdów 30–160 kN', p0: 0.7, p1: 0.5, p2: 0.3, dur: 'short' },
  H: { name: 'Kat. H – dachy', p0: 0.0, p1: 0.0, p2: 0.0, dur: 'short' },
  S: { name: 'Śnieg (H ≤ 1000 m n.p.m.)', p0: 0.5, p1: 0.2, p2: 0.0, dur: 'short' },
  SH: { name: 'Śnieg (H > 1000 m n.p.m.)', p0: 0.7, p1: 0.5, p2: 0.2, dur: 'short' },
  W: { name: 'Wiatr', p0: 0.6, p1: 0.2, p2: 0.0, dur: 'inst' },
};
// PN-EN 1991-1-1: obciążenia użytkowe – zakresy q_k [kN/m²] (tabl. 6.2, 6.4, 6.8, 6.10)
const IMP_EC1 = {
  A: [{ id: 'A', n: 'stropy', q: [1.5, 2.0] }, { id: 'As', n: 'schody', q: [2.0, 4.0] }, { id: 'Ab', n: 'balkony', q: [2.5, 4.0] }],
  B: [{ id: 'B', n: 'biura', q: [2.0, 3.0] }],
  C: [{ id: 'C1', n: 'C1 – ze stołami', q: [2.0, 3.0] }, { id: 'C2', n: 'C2 – z zamocowanymi siedzeniami', q: [3.0, 4.0] }, { id: 'C3', n: 'C3 – bez przeszkód dla ruchu ludzi', q: [3.0, 5.0] }, { id: 'C4', n: 'C4 – aktywność fizyczna', q: [4.5, 5.0] }, { id: 'C5', n: 'C5 – dostępne dla tłumu', q: [5.0, 7.5] }],
  D: [{ id: 'D1', n: 'D1 – sklepy detaliczne', q: [4.0, 5.0] }, { id: 'D2', n: 'D2 – domy towarowe', q: [4.0, 5.0] }],
  E: [{ id: 'E1', n: 'E1 – składowanie', q: [7.5, 7.5] }],
  F: [{ id: 'F', n: 'F – pojazdy ≤ 30 kN', q: [1.5, 2.5] }],
  G: [{ id: 'G', n: 'G – pojazdy 30–160 kN', q: [5.0, 5.0] }],
  H: [{ id: 'H', n: 'H – dachy bez dostępu', q: [0.0, 1.0] }],
};
// śnieg – strefy PN-EN 1991-1-3 ZK PL: s_k [kN/m²] od wysokości A [m n.p.m.]
const SNOW_ZONES = {
  1: { n: 'Strefa 1', f: A => Math.max(0.7, 0.007 * A - 1.4), t: 's_k = 0,007·A − 1,4 ≥ 0,70' },
  2: { n: 'Strefa 2', f: () => 0.9, t: 's_k = 0,9' },
  3: { n: 'Strefa 3', f: A => Math.max(1.2, 0.006 * A - 0.6), t: 's_k = 0,006·A − 0,6 ≥ 1,2' },
  4: { n: 'Strefa 4', f: () => 1.6, t: 's_k = 1,6' },
  5: { n: 'Strefa 5', f: A => Math.max(2.0, 0.93 * Math.exp(0.00134 * A)), t: 's_k = 0,93·exp(0,00134·A) ≥ 2,0' },
};
// wiatr – PN-EN 1991-1-4 ZK PL: v_b,0 [m/s]; c_e(z) dla kategorii terenu
const WIND_ZONES = {
  1: { n: 'Strefa 1', f: A => (A <= 300 ? 22 : 22 * (1 + 0.0006 * (A - 300))) },
  2: { n: 'Strefa 2', f: () => 26 },
  3: { n: 'Strefa 3', f: A => (A <= 300 ? 22 : 22 * (1 + 0.0006 * (A - 300))) },
};
const TERRAIN = {
  '0': { n: '0 – morze, brzeg morski', c: 3.0, k: 0.17, zmin: 1 },
  'I': { n: 'I – jeziora, teren płaski bez przeszkód', c: 2.8, k: 0.19, zmin: 1 },
  'II': { n: 'II – niska roślinność, pojedyncze przeszkody', c: 2.3, k: 0.24, zmin: 2 },
  'III': { n: 'III – podmiejski, wsie, las', c: 1.9, k: 0.26, zmin: 5 },
  'IV': { n: 'IV – miejski (≥ 15% pow. zabudowane, h > 15 m)', c: 1.5, k: 0.29, zmin: 10 },
};
// beton (do sprawdzenia docisku stopy stalowej) – f_ck [MPa]
const CONC = { 'C12/15': 12, 'C16/20': 16, 'C20/25': 20, 'C25/30': 25, 'C30/37': 30, 'C35/45': 35, 'C40/50': 40 };
// wymiary handlowe
const DIMS_SOLID = [60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300];
const DIMS_GL_B = [80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280];
const DIMS_GL_H = [80, 100, 120, 140, 160, 180, 200, 220, 240, 280, 320, 360, 400, 440, 480, 520, 560, 600, 640, 720, 800];
const DIMS_ROUND = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 350, 400];

const SUPP_BASE = { pin: 'przegub (podparcie przegubowe)', fix: 'utwierdzenie' };
const SUPP_TOP = { pin: 'przegub nieprzesuwny (głowica stężona)', free: 'swobodny koniec (wspornik)', fix: 'utwierdzenie nieprzesuwne', guided: 'utwierdzenie przesuwne (bez obrotu)' };
const LTB_CASES = {
  const: { n: 'stały moment', k: 1.0 }, udl: { n: 'obciążenie równomierne', k: 0.9 }, pt: { n: 'siła skupiona w środku', k: 0.8 },
  cudl: { n: 'wspornik – obciążenie równomierne', k: 0.5 }, cpt: { n: 'wspornik – siła na końcu', k: 0.8 },
};

/* --------------------------------------------------------------- pomocnicze */
const num = (v, d) => { if (v === '' || v === null || v === undefined) return d; const x = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.').replace(/\s/g, '')); return isFinite(x) ? x : d; };
const optNum = v => (v === '' || v === null || v === undefined || !isFinite(num(v, NaN))) ? '' : num(v, 0);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fx = (v, dp) => {
  if (dp === undefined) dp = 2;
  if (v === null || v === undefined || !isFinite(v)) return '—';
  let s = (Math.abs(v) < 0.5 * Math.pow(10, -dp) ? 0 : v).toFixed(dp);
  const neg = s[0] === '-'; if (neg) s = s.slice(1);
  let [i, f] = s.split('.'); i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '−' : '') + i + (f !== undefined ? ',' + f : '');
};
const parseList = s => String(s || '').split(/[;\s]+/).map(t => num(t, NaN)).filter(v => isFinite(v));
const deep = o => JSON.parse(JSON.stringify(o));

/* --------------------------------------------------------------- stan */
function defaultState() {
  return {
    meta: { name: 'Słup S-1', author: '', note: '', ticks: {}, repMode: 'full', own: '', ownOn: false, refs: false },
    geom: { type: 'rect', b: 140, h: 140, d: 200, L: 3.0, hole: 0,
      sp: { n: 2, t: 63, w: 160, a: 63, conn: 'pack', fast: 'nail', nb: 4, l2: '' } },
    mat: { cls: 'C24', sc: 1, gM: '', gamma: '', ksys: 1.0, kcr: '', kh: true,
      user: { kind: 'solid', fmk: 24, ft0k: 14.5, ft90k: 0.4, fc0k: 21, fc90k: 2.5, fvk: 4.0, E0mean: 11000, E005: 7400, E90mean: 370, Gmean: 690, G005: 460, rhok: 350, rhomean: 420 } },
    supp: {
      z: { base: 'pin', top: 'pin', kb: '', braces: '' },
      y: { base: 'pin', top: 'pin', kb: '', braces: '' },
    },
    buck: { method: 'kc', lefY: '', lefZ: '', ltb: 'auto', ltbL: '', slim: 150, e0: 400, both: true, IIint: 'lin', IIE: 'mean' },
    loads: {
      sw: true, comb: '610ab', gG: 1.35, gGinf: 1.0, gQ: 1.5, xi: 0.85, accPsi: 'psi1',
      items: [
        { kind: 'perm', name: 'Stałe z dachu/stropu', dur: 'perm', N: 40, ey: 0, ez: 0 },
        { kind: 'snow', name: 'Śnieg', dur: 'short', alt: 'low', N: 25 },
        { kind: 'wind', name: 'Wiatr', dur: 'inst', qz: 0.8, rev: true },
      ].map(normItem),
    },
    sls: { limI: 300, limF: 150, on: true },
    fire: { R: 0, faces: { t: true, b: true, l: true, r: true }, prot: 'none', hp: 15, tch: '', tf: '', mode: 'comb', eta: 0.6, lef: '' },
    conn: {
      base: 'steel',
      sill: { cls: '', w: 140, dir: 'z', end: '', kc90: 'auto' },
      plate: { a: 200, b: 200, conc: 'C20/25', B1: 400, B2: 400 },
      top: 'none',
      beam: { cls: '', w: 140, dir: 'y', end: '', kc90: 'auto' },
    },
    coef: { gMsolid: 1.3, gMgl: 1.25, gMlvl: 1.2, gMA: 1.0, gMfi: 1.0, kf1: 50, kf2: 80, phi0: 0.005, d0: 7, gc: 1.4, acc: 1.0,
      kmod_perm: '', kmod_long: '', kmod_med: '', kmod_short: '', kmod_inst: '', kdef: '', betaC: '', kfi: '' },
  };
}

function normItem(it) {
  const kinds = ['perm', 'imp', 'snow', 'wind', 'other', 'acc'];
  const o = Object.assign({ kind: 'perm', name: '', dur: '', cat: 'B', sub: '', alt: 'low', p0: 0.7, p1: 0.5, p2: 0.3,
    N: 0, ey: 0, ez: 0, Hy: 0, Hz: 0, My: 0, Mz: 0, qy: 0, qz: 0, qa: '', qb: '', pts: [], rev: false, gen: null }, it || {});
  if (!kinds.includes(o.kind)) o.kind = 'perm';
  ['N', 'ey', 'ez', 'Hy', 'Hz', 'My', 'Mz', 'qy', 'qz'].forEach(k => { o[k] = num(o[k], 0); });
  o.qa = optNum(o.qa); o.qb = optNum(o.qb);
  o.pts = (Array.isArray(o.pts) ? o.pts : []).slice(0, 12).map(p => ({ x: num(p.x, 0), N: num(p.N, 0), ey: num(p.ey, 0), ez: num(p.ez, 0), Hy: num(p.Hy, 0), Hz: num(p.Hz, 0) }));
  if (!DUR[o.dur]) o.dur = defDur(o);
  if (o.kind === 'imp' && !PSI[o.cat]) o.cat = 'B';
  if (o.kind === 'imp') { const L = IMP_EC1[o.cat] || IMP_EC1.B; if (!L.some(q => q.id === o.sub)) o.sub = L[0].id; }
  o.p0 = clamp(num(o.p0, 0.7), 0, 1); o.p1 = clamp(num(o.p1, 0.5), 0, 1); o.p2 = clamp(num(o.p2, 0.3), 0, 1);
  o.rev = o.rev === true;
  if (o.gen && typeof o.gen !== 'object') o.gen = null;
  return o;
}
function defDur(it) {
  if (it.kind === 'perm') return 'perm';
  if (it.kind === 'imp') return (PSI[it.cat] || PSI.B).dur;
  if (it.kind === 'snow') return 'short';
  if (it.kind === 'wind' || it.kind === 'acc') return 'inst';
  return 'med';
}
function psiOf(it) {
  if (it.kind === 'imp') return PSI[it.cat] || PSI.B;
  if (it.kind === 'snow') return it.alt === 'high' ? PSI.SH : PSI.S;
  if (it.kind === 'wind') return PSI.W;
  if (it.kind === 'other') return { name: 'Inne (ψ podane)', p0: it.p0, p1: it.p1, p2: it.p2 };
  return { name: '', p0: 1, p1: 1, p2: 1 };
}
function normalize(st) {
  const D = defaultState();
  const S = deep(st || {});
  const merge = (d, s) => { if (!s || typeof s !== 'object' || Array.isArray(s)) return d; Object.keys(d).forEach(k => { if (s[k] === undefined) return; if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) d[k] = merge(d[k], s[k]); else d[k] = s[k]; }); Object.keys(s).forEach(k => { if (d[k] === undefined) d[k] = s[k]; }); return d; };
  const o = merge(D, S);
  if (st && st.loads && Array.isArray(st.loads.items)) o.loads.items = st.loads.items;
  o.loads.items = (Array.isArray(o.loads.items) ? o.loads.items : []).slice(0, 40).map(normItem);
  o.geom.type = ['rect', 'round', 'spaced'].includes(o.geom.type) ? o.geom.type : 'rect';
  o.geom.b = clamp(num(o.geom.b, 140), 20, 2000); o.geom.h = clamp(num(o.geom.h, 140), 20, 3000);
  o.geom.d = clamp(num(o.geom.d, 200), 40, 1500); o.geom.L = clamp(num(o.geom.L, 3), 0.2, 40);
  o.geom.hole = clamp(num(o.geom.hole, 0), 0, 60);
  const sp = o.geom.sp; sp.n = clamp(Math.round(num(sp.n, 2)), 2, 4); sp.t = clamp(num(sp.t, 50), 16, 400); sp.w = clamp(num(sp.w, 160), 30, 1000);
  sp.a = clamp(num(sp.a, 60), 0, 1000); sp.nb = clamp(Math.round(num(sp.nb, 3)), 1, 30); sp.l2 = optNum(sp.l2);
  if (!['pack', 'gusset'].includes(sp.conn)) sp.conn = 'pack'; if (!['glue', 'nail', 'bolt'].includes(sp.fast)) sp.fast = 'nail';
  if (!MATS[o.mat.cls] && o.mat.cls !== 'user') o.mat.cls = 'C24';
  o.mat.sc = [1, 2, 3].includes(+o.mat.sc) ? +o.mat.sc : 1;
  ['z', 'y'].forEach(p => { const q = o.supp[p]; if (!SUPP_BASE[q.base]) q.base = 'pin'; if (!SUPP_TOP[q.top]) q.top = 'pin'; q.kb = optNum(q.kb); q.braces = String(q.braces || ''); });
  o.buck.lefY = optNum(o.buck.lefY); o.buck.lefZ = optNum(o.buck.lefZ); o.buck.ltbL = optNum(o.buck.ltbL);
  if (!['kc', 'II'].includes(o.buck.method)) o.buck.method = 'kc';
  if (o.buck.ltb !== 'auto' && !LTB_CASES[o.buck.ltb]) o.buck.ltb = 'auto';
  o.fire.R = clamp(Math.round(num(o.fire.R, 0)), 0, 240);
  o.meta.ticks = o.meta.ticks && typeof o.meta.ticks === 'object' ? o.meta.ticks : {};
  return o;
}

/* ------------------------------------------------------------- materiał */
function matOf(S, clsOverride) {
  const cls = clsOverride || S.mat.cls;
  let base;
  if (cls === 'user') { const u = S.mat.user || {}; base = Object.assign({ id: 'user', name: 'Materiał własny', std: 'dane użytkownika' }, defaultState().mat.user, u); ['fmk', 'ft0k', 'ft90k', 'fc0k', 'fc90k', 'fvk', 'E0mean', 'E005', 'E90mean', 'Gmean', 'G005', 'rhok', 'rhomean'].forEach(k => { base[k] = num(base[k], 0); }); if (!KIND[base.kind]) base.kind = 'solid'; }
  else base = Object.assign({}, MATS[cls] || MATS.C24);
  const K = KIND[base.kind];
  const C = S.coef;
  const gMdef = base.kind === 'glulam' ? num(C.gMgl, 1.25) : base.kind === 'lvl' ? num(C.gMlvl, 1.2) : num(C.gMsolid, 1.3);
  const m = Object.assign(base, {
    kindName: K.name, gMdef, gM: !clsOverride && S.mat.gM !== '' && num(S.mat.gM, 0) > 0 ? num(S.mat.gM, gMdef) : gMdef,
    betaC: K.betaC, kfi: K.kfi, kcrDef: K.kcr,
    kcr: !clsOverride && S.mat.kcr !== '' && num(S.mat.kcr, 0) > 0 ? num(S.mat.kcr, K.kcr) : K.kcr,
    gammaDef: Math.round(base.rhomean) / 100,
    sc: S.mat.sc, kdef: KDEF[S.mat.sc], kmodT: Object.assign({}, KMOD[S.mat.sc]),
    ksys: clamp(num(S.mat.ksys, 1), 1, 1.2),
  });
  m.gamma = !clsOverride && S.mat.gamma !== '' && num(S.mat.gamma, 0) > 0 ? num(S.mat.gamma, m.gammaDef) : m.gammaDef;
  // wartości nadpisane ręcznie (puste – wartości normowe)
  m.kmodAuto = Object.assign({}, m.kmodT); m.kdefAuto = m.kdef; m.betaCAuto = m.betaC; m.kfiAuto = m.kfi;
  DUR_KEYS.forEach(k => { const v = C['kmod_' + k]; if (v !== '' && v !== undefined && num(v, 0) > 0) m.kmodT[k] = num(v, m.kmodT[k]); });
  if (C.kdef !== '' && C.kdef !== undefined && num(C.kdef, -1) >= 0) m.kdef = num(C.kdef, m.kdef);
  if (C.betaC !== '' && C.betaC !== undefined && num(C.betaC, 0) > 0) m.betaC = num(C.betaC, m.betaC);
  if (C.kfi !== '' && C.kfi !== undefined && num(C.kfi, 0) > 0) m.kfi = num(C.kfi, m.kfi);
  // zwęglanie (PN-EN 1995-1-2 tab. 3.1)
  if (base.kind === 'hard') { const t = clamp((base.rhok - 290) / (450 - 290), 0, 1); m.beta0 = 0.65 - 0.15 * t; m.betan = 0.7 - 0.15 * t; }
  else { m.beta0 = K.b0; m.betan = K.bn; }
  if (base.kind === 'solid' && base.rhok < 290) { m.beta0 = 0.65; m.betan = 0.8; }
  return m;
}
// współczynnik wysokości kh (3.2(3), 3.3(3), 3.4(3))
function khOf(m, h, on) {
  if (on === false) return { k: 1, t: 'k_h = 1,0 (nie uwzględniono)' };
  if (m.kind === 'solid' || m.kind === 'hard') {
    if (m.rhok > 700 || h >= 150) return { k: 1, t: m.rhok > 700 ? 'ρ_k > 700 kg/m³ → k_h = 1,0' : `h = ${fx(h, 0)} ≥ 150 mm → k_h = 1,0`, ref: '3.2(3)' };
    const k = Math.min(Math.pow(150 / h, 0.2), 1.3); return { k, t: `k_h = min{(150/${fx(h, 0)})^{0,2}; 1,3} = ${fx(k, 3)}`, ref: '3.2(3)' };
  }
  if (m.kind === 'glulam') {
    if (h >= 600) return { k: 1, t: `h = ${fx(h, 0)} ≥ 600 mm → k_h = 1,0`, ref: '3.3(3)' };
    const k = Math.min(Math.pow(600 / h, 0.1), 1.1); return { k, t: `k_h = min{(600/${fx(h, 0)})^{0,1}; 1,1} = ${fx(k, 3)}`, ref: '3.3(3)' };
  }
  const s = m.s || 0.12;
  if (h >= 300) return { k: 1, t: `h = ${fx(h, 0)} ≥ 300 mm → k_h = 1,0`, ref: '3.4(3)' };
  const k = Math.min(Math.pow(300 / h, s), 1.2); return { k, t: `k_h = min{(300/${fx(h, 0)})^{${fx(s, 2)}}; 1,2} = ${fx(k, 3)}`, ref: '3.4(3)' };
}

/* -------------------------------------------------------------- przekrój */
const torBeta = (a, b) => { const r = Math.min(a, b) / Math.max(a, b); return 1 / 3 - 0.21 * r * (1 - Math.pow(r, 4) / 12); };
function rectProps(b, h) {
  const A = b * h, Iy = b * h * h * h / 12, Iz = h * b * b * b / 12;
  const lo = Math.min(b, h), hi = Math.max(b, h);
  return { type: 'rect', b, h, A, Iy, Iz, Wy: b * h * h / 6, Wz: h * b * b / 6, iy: h / Math.sqrt(12), iz: b / Math.sqrt(12), It: torBeta(b, h) * hi * lo * lo * lo, km: 0.7, hY: h, hZ: b, Bmax: Math.max(b, h) };
}
function roundProps(d) {
  const A = Math.PI * d * d / 4, I = Math.PI * Math.pow(d, 4) / 64, W = Math.PI * d * d * d / 32;
  return { type: 'round', d, b: d, h: d, A, Iy: I, Iz: I, Wy: W, Wz: W, iy: d / 4, iz: d / 4, It: 2 * I, km: 1.0, hY: d, hZ: d, Bmax: d };
}
function spacedProps(sp) {
  const n = sp.n, t = sp.t, w = sp.w, a = sp.a;
  const A1 = t * w, A = n * A1;
  const ys = []; for (let i = 0; i < n; i++) ys.push((i - (n - 1) / 2) * (t + a));
  const Iz = ys.reduce((s, y) => s + w * t * t * t / 12 + A1 * y * y, 0);
  const Iy = n * t * w * w * w / 12;
  const B = n * t + (n - 1) * a;
  return { type: 'spaced', n, t, w, a, b: B, h: w, A, A1, Iy, Iz, Wy: n * t * w * w / 6, Wz: Iz / (B / 2), WzShaft: n * w * t * t / 6, iy: w / Math.sqrt(12), iz: Math.sqrt(Iz / A), It: n * torBeta(t, w) * Math.max(t, w) * Math.pow(Math.min(t, w), 3), km: 0.7, hY: w, hZ: t, Bmax: Math.max(w, t), ys, a1: t + a };
}
function sectionOf(S) {
  const G = S.geom;
  if (G.type === 'round') return roundProps(G.d);
  if (G.type === 'spaced') return spacedProps(G.sp);
  return rectProps(G.b, G.h);
}

/* ------------------------------------------------------------ MES pręta */
// pręt pionowy x ∈ [0, L] (0 – podstawa), w płaszczyźnie: przemieszczenie w, obrót θ = dw/dx; M = EI·w''
function gaussSolve(Ain, bin) {
  const n = bin.length, A = Ain.map(r => r.slice()), b = bin.slice();
  let maxd = 0; for (let i = 0; i < n; i++) maxd = Math.max(maxd, Math.abs(A[i][i]));
  for (let c = 0; c < n; c++) {
    let p = c, mv = Math.abs(A[c][c]);
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > mv) { mv = Math.abs(A[r][c]); p = r; }
    if (mv < 1e-11 * (maxd || 1)) return null;
    if (p !== c) { const t = A[p]; A[p] = A[c]; A[c] = t; const tb = b[p]; b[p] = b[c]; b[c] = tb; }
    const inv = 1 / A[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] * inv; if (f === 0) continue;
      const Ar = A[r], Ac = A[c];
      for (let k = c; k < n; k++) Ar[k] -= f * Ac[k];
      b[r] -= f * b[c];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
  return x;
}
// LU (bez wyboru elementu – macierz dodatnio określona po warunkach brzegowych) do wielokrotnych rozwiązań
function luFactor(Ain) {
  const n = Ain.length, A = Ain.map(r => r.slice());
  let maxd = 0; for (let i = 0; i < n; i++) maxd = Math.max(maxd, Math.abs(A[i][i]));
  for (let c = 0; c < n; c++) {
    if (Math.abs(A[c][c]) < 1e-10 * (maxd || 1)) return null;
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; A[r][c] = f; if (f === 0) continue; for (let k = c + 1; k < n; k++) A[r][k] -= f * A[c][k]; }
  }
  return A;
}
function luSolve(LU, b) {
  const n = b.length, y = b.slice();
  for (let r = 0; r < n; r++) for (let k = 0; k < r; k++) y[r] -= LU[r][k] * y[k];
  for (let r = n - 1; r >= 0; r--) { for (let k = r + 1; k < n; k++) y[r] -= LU[r][k] * y[k]; y[r] /= LU[r][r]; }
  return y;
}
function buildMesh(L, extra) {
  const pts = [0, L, ...extra.filter(x => x > 1e-6 && x < L - 1e-6)].sort((a, b) => a - b);
  const u = []; pts.forEach(x => { if (!u.length || x - u[u.length - 1] > 1) u.push(x); });
  const target = L / 48, xs = [];
  for (let i = 0; i < u.length - 1; i++) { const a = u[i], b = u[i + 1], n = Math.max(1, Math.ceil((b - a) / target)); for (let k = 0; k < n; k++) xs.push(a + (b - a) * k / n); }
  xs.push(L);
  return xs;
}
const nodeAt = (xs, x) => { let bi = 0, bd = Infinity; xs.forEach((v, i) => { const d = Math.abs(v - x); if (d < bd) { bd = d; bi = i; } }); return bi; };
// macierze elementu
function keBeam(EI, l) { const a = EI / (l * l * l); return [[12 * a, 6 * l * a, -12 * a, 6 * l * a], [6 * l * a, 4 * l * l * a, -6 * l * a, 2 * l * l * a], [-12 * a, -6 * l * a, 12 * a, -6 * l * a], [6 * l * a, 2 * l * l * a, -6 * l * a, 4 * l * l * a]]; }
function kgBeam(N, l) { const a = N / (30 * l); return [[36 * a, 3 * l * a, -36 * a, 3 * l * a], [3 * l * a, 4 * l * l * a, -3 * l * a, -l * l * a], [-36 * a, -3 * l * a, 36 * a, -3 * l * a], [3 * l * a, -l * l * a, -3 * l * a, 4 * l * l * a]]; }
// model płaszczyzny: stopnie swobody, warunki brzegowe
function planeModel(xs, sup, EI) {
  const nn = xs.length, nd = 2 * nn;
  const fixed = new Array(nd).fill(false), springs = [];
  fixed[0] = true;                                   // podstawa – przesuw zablokowany
  if (sup.base === 'fix') { if (sup.kb > 0) springs.push([1, sup.kb * 1e6]); else fixed[1] = true; }
  const t = nn - 1;
  if (sup.top === 'pin' || sup.top === 'fix') fixed[2 * t] = true;
  if (sup.top === 'fix' || sup.top === 'guided') fixed[2 * t + 1] = true;
  (sup.braceNodes || []).forEach(i => { fixed[2 * i] = true; });
  const free = []; for (let i = 0; i < nd; i++) if (!fixed[i]) free.push(i);
  const map = new Array(nd).fill(-1); free.forEach((d, k) => { map[d] = k; });
  return { xs, nn, nd, fixed, springs, free, map, EI };
}
function assemble(md, Nel) {
  const nf = md.free.length, K = Array.from({ length: nf }, () => new Array(nf).fill(0));
  for (let e = 0; e < md.nn - 1; e++) {
    const l = md.xs[e + 1] - md.xs[e];
    const ke = keBeam(md.EI, l), kg = Nel ? kgBeam(Nel[e], l) : null;
    const dofs = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3];
    for (let i = 0; i < 4; i++) { const I = md.map[dofs[i]]; if (I < 0) continue; for (let j = 0; j < 4; j++) { const J = md.map[dofs[j]]; if (J < 0) continue; K[I][J] += ke[i][j] - (kg ? kg[i][j] : 0); } }
  }
  md.springs.forEach(([d, k]) => { const I = md.map[d]; if (I >= 0) K[I][I] += k; });
  return K;
}
function assembleKG(md, Nel) {
  const nf = md.free.length, K = Array.from({ length: nf }, () => new Array(nf).fill(0));
  for (let e = 0; e < md.nn - 1; e++) {
    const l = md.xs[e + 1] - md.xs[e], kg = kgBeam(Nel[e], l), dofs = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3];
    for (let i = 0; i < 4; i++) { const I = md.map[dofs[i]]; if (I < 0) continue; for (let j = 0; j < 4; j++) { const J = md.map[dofs[j]]; if (J < 0) continue; K[I][J] += kg[i][j]; } }
  }
  return K;
}
// obciążenie płaszczyzny: siły węzłowe F[nd] (w, M), obciążenie równomierne na elementach qe[ne]
function feq(q, l) { return [q * l / 2, q * l * l / 12, q * l / 2, -q * l * l / 12]; }
function loadVector(md, ld) {
  const F = ld.F.slice();
  for (let e = 0; e < md.nn - 1; e++) { const q = ld.qe[e]; if (!q) continue; const l = md.xs[e + 1] - md.xs[e], f = feq(q, l); F[2 * e] += f[0]; F[2 * e + 1] += f[1]; F[2 * e + 2] += f[2]; F[2 * e + 3] += f[3]; }
  return F;
}
// siły w elementach z przemieszczeń: stacje 2e (dół elementu), 2e+1 (góra)
function memberForces(md, u, ld, EIoverride) {
  const ne = md.nn - 1, M = new Array(2 * ne), V = new Array(2 * ne);
  for (let e = 0; e < ne; e++) {
    const l = md.xs[e + 1] - md.xs[e], ke = keBeam(EIoverride || md.EI, l), ue = [u[2 * e], u[2 * e + 1], u[2 * e + 2], u[2 * e + 3]];
    const f = [0, 0, 0, 0]; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) f[i] += ke[i][j] * ue[j];
    const q = ld && ld.qe ? ld.qe[e] : 0;
    if (q) { const fe = feq(q, l); for (let i = 0; i < 4; i++) f[i] -= fe[i]; }
    M[2 * e] = -f[1]; M[2 * e + 1] = f[3]; V[2 * e] = f[0]; V[2 * e + 1] = -f[2];
  }
  return { M, V };
}
function solvePlane(md, ld, Nel) {
  const K = assemble(md, Nel), F = loadVector(md, ld);
  const Ff = md.free.map(d => F[d]);
  const x = gaussSolve(K, Ff);
  if (!x) return null;
  const u = new Array(md.nd).fill(0); md.free.forEach((d, k) => { u[d] = x[k]; });
  const fr = memberForces(md, u, ld);
  // reakcje: R = K_full·u − F (stopnie zablokowane i sprężyny)
  return { u, M: fr.M, V: fr.V };
}
// wyboczenie: najmniejsza wartość własna K φ = λ KG φ (iteracja odwrotna)
function bucklePlane(md, Nel) {
  const K = assemble(md, null), KG = assembleKG(md, Nel), nf = md.free.length;
  if (!nf) return null;
  const LU = luFactor(K); if (!LU) return null;
  let x = md.free.map((d, k) => (d % 2 === 0 ? Math.sin(Math.PI * (md.xs[d / 2] / md.xs[md.nn - 1]) * 0.9 + 0.1) + 0.05 : 0.01));
  let lam = 0;
  const mv = (A, v) => A.map(r => r.reduce((s, a, j) => s + a * v[j], 0));
  for (let it = 0; it < 200; it++) {
    const y = luSolve(LU, mv(KG, x));
    const nrm = Math.sqrt(y.reduce((s, v) => s + v * v, 0)); if (!(nrm > 0)) return null;
    const yn = y.map(v => v / nrm);
    const Ky = mv(K, yn), KGy = mv(KG, yn);
    const num_ = yn.reduce((s, v, i) => s + v * Ky[i], 0), den = yn.reduce((s, v, i) => s + v * KGy[i], 0);
    const l2 = den > 0 ? num_ / den : Infinity;
    const conv = Math.abs(l2 - lam) < 1e-9 * Math.abs(l2);
    lam = l2; x = yn;
    if (conv && it > 5) break;
  }
  const u = new Array(md.nd).fill(0); md.free.forEach((d, k) => { u[d] = x[k]; });
  let mx = 0; for (let i = 0; i < md.nn; i++) if (Math.abs(u[2 * i]) > Math.abs(mx)) mx = u[2 * i];
  const mode = []; for (let i = 0; i < md.nn; i++) mode.push(mx ? u[2 * i] / mx : 0);
  const modeU = u.map(v => (mx ? v / mx : 0));
  return { lam, mode, modeU };
}

/* ---------------------------------------- statyka: przypadki obciążeń */
// przypadek obciążenia → zestaw sił: osiowe (punkty), poprzeczne w płaszczyznach y i z
function lcResponse(model, lc) {
  const { xs, L, md } = model, ne = xs.length - 1;
  // siła osiowa N(x) – ściskanie dodatnie; punkty: [x, N]
  const Nst = new Array(2 * ne).fill(0);
  for (let e = 0; e < ne; e++) {
    const xa = xs[e], xb = xs[e + 1];
    let Nab = 0; lc.ax.forEach(([x, N]) => { if (x >= xb - 1e-6) Nab += N; });
    Nst[2 * e] = Nab + lc.g * (L - xa); Nst[2 * e + 1] = Nab + lc.g * (L - xb);
  }
  const out = { N: Nst, pl: {} };
  ['y', 'z'].forEach(p => {
    const m = md[p];
    if (!m) return;
    const F = new Array(m.nd).fill(0), qe = new Array(ne).fill(0);
    lc.pl[p].P.forEach(([x, P]) => { F[2 * nodeAt(xs, x)] += P; });
    lc.pl[p].Mn.forEach(([x, Mv]) => { F[2 * nodeAt(xs, x) + 1] += Mv; });
    lc.pl[p].q.forEach(([a, b, q]) => { for (let e = 0; e < ne; e++) { const xm = (xs[e] + xs[e + 1]) / 2; if (xm >= a - 1e-6 && xm <= b + 1e-6) qe[e] += q; } });
    const r = solvePlane(m, { F, qe });
    if (!r) { out.err = p; return; }
    out.pl[p] = { M: r.M, V: r.V, u: r.u.filter((v, i) => i % 2 === 0), th: r.u.filter((v, i) => i % 2 === 1), ld: { F, qe } };
  });
  return out;
}

/* ---------------------------------------- przypadki obciążeń z danych */
// konwencja: płaszczyzna z – przemieszczenia w kierunku z (wymiar h), moment My; płaszczyzna y – kierunek y (wymiar b), moment Mz
function buildCases(S, m, g) {
  const L = S.geom.L * 1000, cases = [];
  if (S.loads.sw) cases.push({ id: 'G0', name: 'Ciężar własny słupa', kind: 'perm', dur: 'perm', psi: { p0: 1, p1: 1, p2: 1 }, ax: [], g: m.gamma * g.A * 1e-6, pl: { y: { P: [], Mn: [], q: [] }, z: { P: [], Mn: [], q: [] } }, src: null });
  let nG = 0, nQ = 0, nA = 0;
  S.loads.items.forEach((it, idx) => {
    const isG = it.kind === 'perm', isA = it.kind === 'acc';
    const base = isG ? 'G' : isA ? 'A' : 'Q';
    const id = base + (isG ? ++nG : isA ? ++nA : ++nQ);
    const mk = (sgn, suf) => {
      const c = { id: id + (suf || ''), name: (it.name || id) + (suf === '+' ? ' (+)' : suf === '−' ? ' (−)' : ''), kind: it.kind, dur: it.dur, psi: psiOf(it), ax: [], g: 0, pl: { y: { P: [], Mn: [], q: [] }, z: { P: [], Mn: [], q: [] } }, src: idx, sgn, item: it };
      const N = it.N * 1e3;
      if (N) c.ax.push([L, N]);
      // mimośród: moment N·e (e w kierunku osi przemieszczenia)
      if (N && it.ez) c.pl.z.Mn.push([L, N * it.ez]);
      if (N && it.ey) c.pl.y.Mn.push([L, N * it.ey]);
      if (it.Hz) c.pl.z.P.push([L, sgn * it.Hz * 1e3]);
      if (it.Hy) c.pl.y.P.push([L, sgn * it.Hy * 1e3]);
      if (it.My) c.pl.z.Mn.push([L, sgn * it.My * 1e6]);
      if (it.Mz) c.pl.y.Mn.push([L, sgn * it.Mz * 1e6]);
      const qa = it.qa === '' ? 0 : clamp(it.qa * 1000, 0, L), qb = it.qb === '' ? L : clamp(it.qb * 1000, 0, L);
      if (it.qz) c.pl.z.q.push([Math.min(qa, qb), Math.max(qa, qb), sgn * it.qz]);
      if (it.qy) c.pl.y.q.push([Math.min(qa, qb), Math.max(qa, qb), sgn * it.qy]);
      it.pts.forEach(p => {
        const x = clamp(p.x * 1000, 0, L), Np = p.N * 1e3;
        if (Np) c.ax.push([x, Np]);
        if (Np && p.ez) c.pl.z.Mn.push([x, Np * p.ez]);
        if (Np && p.ey) c.pl.y.Mn.push([x, Np * p.ey]);
        if (p.Hz) c.pl.z.P.push([x, sgn * p.Hz * 1e3]);
        if (p.Hy) c.pl.y.P.push([x, sgn * p.Hy * 1e3]);
      });
      return c;
    };
    const hasH = it.Hy || it.Hz || it.qy || it.qz || it.My || it.Mz || it.pts.some(p => p.Hy || p.Hz);
    if (it.rev && hasH && !isG) { const a = mk(1, '+'), b = mk(-1, '−'); a.grp = id; b.grp = id; cases.push(a, b); }
    else { const c = mk(1, ''); c.grp = id; cases.push(c); }
  });
  return cases;
}

/* ---------------------------------------- kombinacje PN-EN 1990 */
// akcje zmienne: niezależne (użytkowe, inne) + grupy wykluczające (śnieg – jeden wariant; wiatr – jeden wariant/kierunek)
function variableActions(cases) {
  const V = cases.filter(c => !['perm', 'acc'].includes(c.kind));
  const acts = [];
  const byGrp = {}; V.forEach(c => { (byGrp[c.grp] = byGrp[c.grp] || []).push(c); });
  const snow = [], wind = [];
  Object.values(byGrp).forEach(arr => { const k = arr[0].kind; if (k === 'snow') snow.push(...arr); else if (k === 'wind') wind.push(...arr); else acts.push({ name: arr[0].item.name || arr[0].grp, kind: k, alts: arr }); });
  if (snow.length) acts.push({ name: 'Śnieg', kind: 'snow', alts: snow });
  if (wind.length) acts.push({ name: 'Wiatr', kind: 'wind', alts: wind });
  return acts;
}
function durMin(list) { let r = 0; list.forEach(c => { r = Math.max(r, DUR[c.dur].r); }); return DUR_KEYS[r]; }
function makeCombos(S, cases, m) {
  const P = cases.filter(c => c.kind === 'perm'), A = cases.filter(c => c.kind === 'acc');
  const acts = variableActions(cases);
  const ld = S.loads, gG = num(ld.gG, 1.35), gGi = num(ld.gGinf, 1.0), gQ = num(ld.gQ, 1.5), xi = num(ld.xi, 0.85);
  const uls = [], fi = [], acc = [], chr = [], fr = [], qp = [];
  // wybory: dla każdej akcji – brak lub jedna z alternatyw
  const choices = [];
  const rec = (i, cur) => { if (i === acts.length) { choices.push(cur.slice()); return; } rec(i + 1, cur.concat([null])); acts[i].alts.forEach(a => rec(i + 1, cur.concat([a]))); };
  rec(0, []);
  const limit = 6000;
  let trimmed = false;
  const pushU = (o) => { if (uls.length < limit) uls.push(o); else trimmed = true; };
  const fG = (f) => P.map(c => [c, f]);
  choices.forEach(ch => {
    const on = ch.filter(Boolean);
    const durK = durMin(P.concat(on));
    const kmod = m.kmodT[durK];
    ['sup', 'inf'].forEach(gs => {
      const g = gs === 'sup' ? gG : gGi;
      if (!on.length) {
        if (ld.comb === '610ab') pushU({ eq: '6.10a', f: fG(g), lead: null, gs, dur: durK, kmod, on });
        else pushU({ eq: '6.10', f: fG(g), lead: null, gs, dur: durK, kmod, on });
        return;
      }
      if (ld.comb === '610ab') {
        // 6.10a: γG·G + γQ·ψ0·Q (wszystkie towarzyszące)
        pushU({ eq: '6.10a', f: fG(g).concat(on.map(c => [c, gQ * c.psi.p0])), lead: null, gs, dur: durK, kmod, on });
        on.forEach(L => { pushU({ eq: '6.10b', f: fG(gs === 'sup' ? xi * g : g).concat(on.map(c => [c, c === L ? gQ : gQ * c.psi.p0])), lead: L, gs, dur: durK, kmod, on }); });
      } else {
        on.forEach(L => { pushU({ eq: '6.10', f: fG(g).concat(on.map(c => [c, c === L ? gQ : gQ * c.psi.p0])), lead: L, gs, dur: durK, kmod, on }); });
      }
    });
    // SGU: charakterystyczna, częsta, quasi-stała (bez wariantów γG)
    if (!on.length) { chr.push({ eq: '6.14b', f: fG(1), lead: null, on, dur: durK }); qp.push({ eq: '6.16b', f: fG(1), lead: null, on, dur: durK }); }
    else {
      on.forEach(L => { chr.push({ eq: '6.14b', f: fG(1).concat(on.map(c => [c, c === L ? 1 : c.psi.p0])), lead: L, on, dur: durK }); });
      qp.push({ eq: '6.16b', f: fG(1).concat(on.map(c => [c, c.psi.p2])), lead: null, on, dur: durK });
    }
    // pożar (6.11b): G + ψ1,1 (ψ2,1)·Q1 + Σψ2·Qi
    const pk = ld.accPsi === 'psi2' ? 'p2' : 'p1';
    if (!on.length) fi.push({ eq: '6.11b', f: fG(1), lead: null, on, dur: durK });
    else on.forEach(L => { fi.push({ eq: '6.11b', f: fG(1).concat(on.map(c => [c, c === L ? c.psi[pk] : c.psi.p2])), lead: L, on, dur: durK }); });
    // wyjątkowe (6.11b) z A_d
    A.forEach(Ad => {
      if (!on.length) acc.push({ eq: '6.11b', f: fG(1).concat([[Ad, 1]]), lead: null, ad: Ad, on, dur: 'inst', kmod: m.kmodT.inst });
      else on.forEach(L => { acc.push({ eq: '6.11b', f: fG(1).concat([[Ad, 1]]).concat(on.map(c => [c, c === L ? c.psi[pk] : c.psi.p2])), lead: L, ad: Ad, on, dur: 'inst', kmod: m.kmodT.inst }); });
    });
  });
  // odrzucenie duplikatów kombinacji SGU
  const uniq = arr => { const seen = new Set(); return arr.filter(c => { const k = c.f.map(([q, f]) => q.id + ':' + f.toFixed(4)).sort().join('|'); if (seen.has(k)) return false; seen.add(k); return true; }); };
  const out = { uls: uniq(uls), chr: uniq(chr), qp: uniq(qp), fi: uniq(fi), acc: uniq(acc), acts, trimmed };
  const nameOf = (c, prefix) => {
    const parts = c.f.filter(([, f]) => f !== 0).map(([q, f]) => `${fx(f, f === 1 ? 0 : 3).replace(/,?0+$/, '')}·${q.id}`);
    return parts.join(' + ');
  };
  ['uls', 'chr', 'qp', 'fi', 'acc'].forEach(k => out[k].forEach((c, i) => { c.no = i + 1; c.type = k; c.desc = nameOf(c); c.leadName = c.lead ? c.lead.name : ''; }));
  return out;
}

/* ---------------------------------------- superpozycja */
function combine(R, combo) {
  const ne = R.xs.length - 1, n = 2 * ne, nn = R.xs.length;
  const o = { N: new Array(n).fill(0), My: new Array(n).fill(0), Mz: new Array(n).fill(0), Vy: new Array(n).fill(0), Vz: new Array(n).fill(0), uy: new Array(nn).fill(0), uz: new Array(nn).fill(0) };
  combo.f.forEach(([c, f]) => {
    const r = R.resp[c.id]; if (!r || !f) return;
    for (let i = 0; i < n; i++) { o.N[i] += f * r.N[i]; o.My[i] += f * r.My[i]; o.Mz[i] += f * r.Mz[i]; o.Vz[i] += f * r.Vz[i]; o.Vy[i] += f * r.Vy[i]; }
    for (let i = 0; i < nn; i++) { o.uz[i] += f * r.uz[i]; o.uy[i] += f * r.uy[i]; }
  });
  return o;
}

/* ---------------------------------------- pożar – zwęglanie */
function charDepth(F, m, t) {
  // PN-EN 1995-1-2: 3.4.2 (bez ochrony), 3.4.3 (z ochroną – fazy t_ch, t_f, t_a)
  const bn = m.betan, b0 = m.beta0;
  if (!t) return { dchar: 0, k0: 0, def: 0, txt: 'brak' };
  let dchar, tch = 0, tf = 0, ta = 0, k2 = 1, txt;
  if (F.prot === 'none') { dchar = bn * t; txt = `d_{char,n} = β_n·t = ${fx(bn, 2)}·${t} = ${fx(dchar, 1)} mm`; }
  else {
    const hp = num(F.hp, 15);
    if (F.prot === 'gk') { tch = num(F.tch, 2.8 * hp - 14); tf = tch; }
    else if (F.prot === 'gf') { tch = num(F.tch, 2.8 * hp - 14); tf = num(F.tf, tch + 15); k2 = clamp(1 - 0.018 * hp, 0.05, 1); }
    else if (F.prot === 'wood') { tch = num(F.tch, hp / 0.9 - 4); tf = tch; }
    else { tch = num(F.tch, 0); tf = Math.max(tch, num(F.tf, tch)); k2 = 1; }
    tch = Math.max(0, tch); tf = Math.max(tch, tf);
    const k3 = 2;
    // faza 2 (t_ch – t_f): k2·βn; faza 3 (t_f – t_a): k3·βn do 25 mm; potem βn
    const d2 = k2 * bn * Math.max(0, Math.min(t, tf) - tch);
    ta = Math.min(2 * tf, 25 / (k3 * bn) + tf);
    if (t <= tch) dchar = 0;
    else if (t <= tf) dchar = d2;
    else if (t <= ta) dchar = d2 + k3 * bn * (t - tf);
    else dchar = d2 + k3 * bn * (ta - tf) + bn * (t - ta);
    txt = `t_{ch} = ${fx(tch, 1)} min, t_f = ${fx(tf, 1)} min, t_a = ${fx(ta, 1)} min → d_{char,n} = ${fx(dchar, 1)} mm`;
  }
  const d0 = num(F.d0, 7);
  // k0 (tab. 4.1): bez ochrony – t/20 dla t < 20 min; z ochroną t_ch > 20 min – liniowo 0…1 w przedziale 0…t_ch
  let k0;
  if (F.prot !== 'none' && tch > 20) k0 = Math.min(1, t / tch); else k0 = Math.min(1, t / 20);
  const def = dchar + k0 * d0;
  return { dchar, k0, d0, def, tch, tf, ta, k2, txt };
}

/* ---------------------------------------- współczynniki wyboczeniowe */
function kcOf(lamRel, betaC) {
  const k = 0.5 * (1 + betaC * (lamRel - 0.3) + lamRel * lamRel);
  const kc = lamRel <= 0.3 ? 1 : Math.min(1, 1 / (k + Math.sqrt(Math.max(0, k * k - lamRel * lamRel))));
  return { k, kc };
}
function kcritOf(lr) { return lr <= 0.75 ? 1 : lr <= 1.4 ? 1.56 - 0.75 * lr : 1 / (lr * lr); }
// zał. C.3 – słup wielogałęziowy: η wg tab. C.1
const ETA_C1 = { pack: { glue: [1, 1], nail: [4, 3], bolt: [3.5, 2.5] }, gusset: { glue: [3, 2], nail: [6, 4.5], bolt: [6, 4.5] } };

/* ======================================================================
   OBLICZENIA
   ====================================================================== */
function calc(Sin) {
  const S = normalize(Sin);
  const R = { S, errors: [], warnings: [], notes: [], checks: [] };
  const m = matOf(S), g = sectionOf(S);
  R.m = m; R.g = g;
  const L = S.geom.L * 1000; R.L = L;
  // walidacja
  const mpos = ['fmk', 'fc0k', 'fvk', 'E0mean', 'E005', 'rhok'].filter(k => !(m[k] > 0));
  if (mpos.length) R.errors.push('Parametry materiału muszą być dodatnie: ' + mpos.join(', ') + '.');
  if (S.geom.type === 'spaced' && S.geom.sp.a <= 0) R.warnings.push('Odstęp gałęzi a = 0 – przekrój pracuje jak lity (pomiń zał. C, zastosuj przekrój prostokątny).');
  // podparcia
  const braces = { y: parseList(S.supp.y.braces).map(v => v * 1000).filter(x => x > 1 && x < L - 1), z: parseList(S.supp.z.braces).map(v => v * 1000).filter(x => x > 1 && x < L - 1) };
  R.braces = braces;
  // przypadki
  const cases = buildCases(S, m, g);
  R.cases = cases;
  const extra = [...braces.y, ...braces.z];
  cases.forEach(c => { c.ax.forEach(([x]) => extra.push(x)); ['y', 'z'].forEach(p => { c.pl[p].P.forEach(([x]) => extra.push(x)); c.pl[p].Mn.forEach(([x]) => extra.push(x)); c.pl[p].q.forEach(([a, b]) => extra.push(a, b)); }); });
  const xs = buildMesh(L, extra); R.xs = xs;
  const ne = xs.length - 1;
  const EIy = m.E0mean * g.Iy, EIz = m.E0mean * g.Iz;     // sztywność do statyki (rozkład sił) i SGU – E0,mean
  const sup = p => { const q = S.supp[p]; return { base: q.base, top: q.top, kb: q.kb === '' ? 0 : +q.kb, braceNodes: braces[p].map(x => nodeAt(xs, x)) }; };
  const md = { z: planeModel(xs, sup('z'), EIy), y: planeModel(xs, sup('y'), EIz) };
  R.md = md;
  // sprawdzenie geometrycznej zmienności
  ['z', 'y'].forEach(p => {
    const q = S.supp[p];
    if (q.base === 'pin' && (q.top === 'free' || q.top === 'guided') && !braces[p].length) R.errors.push(`Płaszczyzna x–${p}: podstawa przegubowa i ${q.top === 'free' ? 'swobodna głowica' : 'głowica przesuwna'} bez stężeń – układ geometrycznie zmienny. Zmień warunki podparcia.`);
  });
  if (R.errors.length) return finish(R);
  const model = { xs, L, md };
  R.resp = {};
  for (const c of cases) {
    const r = lcResponse(model, c);
    if (r.err) { R.errors.push(`Nie można rozwiązać układu w płaszczyźnie x–${r.err} (układ zmienny lub osobliwy).`); return finish(R); }
    // M_y – moment w płaszczyźnie x–z (wokół osi y); M_z – w płaszczyźnie x–y (wokół osi z)
    const z = r.pl.z, y = r.pl.y;
    R.resp[c.id] = { N: r.N, My: z.M, Mz: y.M, Vz: z.V, Vy: y.V, uz: z.u, uy: y.u, thz: z.th, thy: y.th, ldz: z.ld, ldy: y.ld };
  }
  const C = makeCombos(S, cases, m); R.combos = C;
  if (C.trimmed) R.warnings.push('Liczba kombinacji SGN ograniczona do 6000 – zmniejsz liczbę obciążeń zmiennych.');
  /* -------- wyboczenie (MES – wartości własne) */
  const Nunit = new Array(ne).fill(1);
  R.buck = {};
  ['z', 'y'].forEach(p => {
    const mdp = md[p], bk = bucklePlane(mdp, Nunit);
    const I = p === 'z' ? g.Iy : g.Iz;
    const lefAuto = bk && isFinite(bk.lam) && bk.lam > 0 ? Math.PI * Math.sqrt(mdp.EI / bk.lam) : NaN;
    const man = p === 'z' ? S.buck.lefY : S.buck.lefZ;
    const lef = man !== '' && +man > 0 ? man * 1000 : lefAuto;
    R.buck[p] = { lefAuto, lef, manual: man !== '' && +man > 0, beta: lef / L, betaAuto: lefAuto / L, mode: bk ? bk.mode : null, modeU: bk ? bk.modeU : null, I, axis: p === 'z' ? 'y' : 'z' };
  });
  if (!(R.buck.z.lef > 0) || !(R.buck.y.lef > 0)) { R.errors.push('Nie udało się wyznaczyć długości wyboczeniowych – sprawdź warunki podparcia.'); return finish(R); }
  // smukłości
  const sqF = Math.sqrt(m.fc0k / m.E005);
  const bkP = (p) => {
    const b = R.buck[p], i = p === 'z' ? g.iy : g.iz;
    b.i = i; b.lam = b.lef / i; b.lamRel = b.lam / Math.PI * sqF;
    Object.assign(b, kcOf(b.lamRel, m.betaC));
  };
  bkP('z'); bkP('y');
  // słup wielogałęziowy – smukłość zastępcza względem osi z (zał. C.3)
  if (g.type === 'spaced') {
    const sp = S.geom.sp, b = R.buck.y;
    const nb = Math.max(1, sp.nb), l1 = L / nb, lam1 = Math.sqrt(12) * l1 / sp.t, lam1c = Math.max(30, lam1);
    const lamZ = b.lef * Math.sqrt(g.A / g.Iz);
    const conn = sp.conn, fast = conn === 'gusset' && sp.fast === 'bolt' ? 'nail' : sp.fast;
    const etaL = ETA_C1[conn][fast][0], etaS = ETA_C1[conn][fast][1];
    const lefOf = eta => Math.sqrt(lamZ * lamZ + eta * g.n / 2 * lam1c * lam1c);
    const mk = eta => { const le = lefOf(eta), lr = le / Math.PI * sqF, k = kcOf(lr, m.betaC); return { eta, lamEf: le, lamRel: lr, k: k.k, kc: k.kc }; };
    const l2auto = conn === 'pack' ? Math.max(Math.ceil(1.5 * sp.a / 10) * 10, 150) : Math.max(Math.ceil(2 * sp.a / 10) * 10, 250);
    R.sp = { l1, lam1, lam1c, lamZ, long: mk(etaL), short: mk(etaS), conn, fast, l2: sp.l2 !== '' ? +sp.l2 : l2auto, l2auto, nb };
    b.lam = R.sp.long.lamEf; b.lamRel = R.sp.long.lamRel; b.k = R.sp.long.k; b.kc = R.sp.long.kc; b.spaced = true;
  }
  /* -------- zwichrzenie (6.3.3) */
  const strong = g.type !== 'rect' || Math.max(g.h, g.b) / Math.min(g.h, g.b) < 1.001 ? null : (g.h > g.b ? 'y' : 'z');
  R.ltb = null;
  if (strong) {
    // moment wokół osi mocnej: y → płaszczyzna z (M_y), boczne podparcie krawędzi ściskanej: stężenia w płaszczyźnie y
    const pl = strong === 'y' ? 'z' : 'y', lat = strong === 'y' ? 'y' : 'z';
    const hh = strong === 'y' ? g.h : g.b, bb = strong === 'y' ? g.b : g.h;
    const pts = [0, ...braces[lat], ...(S.supp[lat].top !== 'free' ? [L] : [])].sort((a, b) => a - b);
    let lseg = 0; for (let i = 0; i < pts.length - 1; i++) lseg = Math.max(lseg, pts[i + 1] - pts[i]);
    if (S.supp[lat].top === 'free') lseg = Math.max(lseg, L - pts[pts.length - 1]);
    const cant = S.supp[pl].top === 'free';
    const caseK = S.buck.ltb === 'auto' ? (cant ? 'cpt' : 'const') : S.buck.ltb;
    const kL = LTB_CASES[caseK].k;
    const lef = S.buck.ltbL !== '' && +S.buck.ltbL > 0 ? S.buck.ltbL * 1000 : kL * lseg;
    const Iminor = strong === 'y' ? g.Iz : g.Iy, Wstrong = strong === 'y' ? g.Wy : g.Wz;
    const scrit = Math.PI * Math.sqrt(m.E005 * Iminor * m.G005 * g.It) / (lef * Wstrong);
    const scritS = 0.78 * bb * bb * m.E005 / (hh * lef);
    const lr = Math.sqrt(m.fmk / scrit), kcrit = kcritOf(lr);
    R.ltb = { strong, pl, lat, lseg, caseK, kL, lef, manual: S.buck.ltbL !== '' && +S.buck.ltbL > 0, scrit, scritS, lamRel: lr, kcrit, hh, bb };
  }
  /* -------- obwiednie i sprawdzenia */
  R.kh = { y: khOf(m, g.hY, S.mat.kh), z: khOf(m, g.hZ, S.mat.kh), t: khOf(m, g.Bmax, S.mat.kh) };
  const ch = runChecks(R, S, m, g, C);
  R.ck = ch;
  /* -------- SGU */
  slsCalc(R, S, m, g, C);
  /* -------- oparcie, stężenia */
  connCalc(R, S, m, g, C);
  /* -------- pożar */
  if (S.fire.R > 0) fireCalc(R, S, m, g, C);
  /* -------- II rząd */
  if (S.buck.method === 'II' || S.buck.both) secondOrder(R, S, m, g, C);
  buildChecks(R, S, m, g);
  return finish(R);
}
function finish(R) {
  R.checks = R.checks || [];
  const act = R.checks.filter(c => c.status !== 'info');
  R.maxUtil = act.filter(c => !c.warnOnly && c.fmt !== 'text').reduce((a, c) => Math.max(a, isFinite(c.ratio) ? c.ratio : 9.99), 0);
  R.ok = !R.errors.length && !R.checks.some(c => c.status === 'fail');
  return R;
}

/* ---------------------------------------- sprawdzenia SGN (wszystkie kombinacje) */
function designVals(m, kmod, R, gM) {
  const k = kmod * m.ksys / gM;
  return { kmod, gM, fc0d: k * m.fc0k, ft0d: k * R.kh.t.k * m.ft0k, fmyd: k * R.kh.y.k * m.fmk, fmzd: k * R.kh.z.k * m.fmk, fvd: k * m.fvk, fc90d: k * m.fc90k };
}
function evalStation(R, S, m, g, f, N, My, Mz, Vy, Vz, kcy, kcz, kcrit, extra) {
  // naprężenia
  const hole = S.geom.hole / 100;
  const An = g.A * (1 - hole), Wyn = g.Wy * (1 - hole), Wzn = (g.type === 'spaced' ? (extra && extra.Wz ? extra.Wz : g.Wz) : g.Wz) * (1 - hole);
  let smy, smz;
  // przekrój okrągły: moment wypadkowy (brak osi mocnej i słabej), k_m = 1,0
  if (g.type === 'round') { smy = Math.sqrt(My * My + Mz * Mz) / Wyn; smz = 0; }
  else { smy = Math.abs(My) / Wyn; smz = Math.abs(Mz) / Wzn; }
  const sc = N > 0 ? N / g.A : 0, st = N < 0 ? -N / An : 0;
  const km = g.km;
  const ry = smy / f.fmyd, rz = smz / f.fmzd;
  const o = { sc, st, smy, smz };
  o.c0 = sc / f.fc0d;
  o.t0 = st / f.ft0d;
  o.cb = N >= 0 ? Math.max(o.c0 * o.c0 + ry + km * rz, o.c0 * o.c0 + km * ry + rz) : 0;
  o.cb1 = o.c0 * o.c0 + ry + km * rz; o.cb2 = o.c0 * o.c0 + km * ry + rz;
  o.tb = N < 0 ? Math.max(o.t0 + ry + km * rz, o.t0 + km * ry + rz) : 0;
  o.tb1 = o.t0 + ry + km * rz; o.tb2 = o.t0 + km * ry + rz;
  o.m = Math.max(ry + km * rz, km * ry + rz);
  o.b1 = sc / (kcy * f.fc0d) + ry + km * rz;            // (6.23)
  o.b2 = sc / (kcz * f.fc0d) + km * ry + rz;            // (6.24)
  // zwichrzenie (6.33, 6.35 + rozszerzenie o moment wokół osi słabej)
  if (R.ltb) {
    const sS = R.ltb.strong === 'y' ? smy : smz, fS = R.ltb.strong === 'y' ? f.fmyd : f.fmzd, sW = R.ltb.strong === 'y' ? smz : smy, fW = R.ltb.strong === 'y' ? f.fmzd : f.fmyd;
    const kcw = R.ltb.strong === 'y' ? kcz : kcy;
    o.ltb = Math.pow(sS / (kcrit * fS), 2) + sc / (kcw * f.fc0d) + sW / fW;
    o.ltbM = sS / (kcrit * fS);
  }
  // ścinanie (6.1.7): τ = 1,5·V/(k_cr·b·h); okrągły 4/3·V/(k_cr·A); wypadkowa obu kierunków
  const kcr = m.kcr;
  const tau = g.type === 'round' ? 4 / 3 * Math.sqrt(Vy * Vy + Vz * Vz) / (kcr * g.A) : 1.5 * Math.sqrt(Vy * Vy + Vz * Vz) / (kcr * g.A);
  o.tau = tau; o.v = tau / f.fvd;
  return o;
}
function runChecks(R, S, m, g, C) {
  const xs = R.xs, ne = xs.length - 1;
  const ckDefs = ['c0', 't0', 'cb', 'tb', 'b1', 'b2', 'ltb', 'v'];
  const best = {}; ckDefs.forEach(k => { best[k] = { r: 0, combo: null, i: -1, o: null, f: null }; });
  const env = { N: { max: new Array(2 * ne).fill(-Infinity), min: new Array(2 * ne).fill(Infinity) }, My: { max: new Array(2 * ne).fill(-Infinity), min: new Array(2 * ne).fill(Infinity) }, Mz: { max: new Array(2 * ne).fill(-Infinity), min: new Array(2 * ne).fill(Infinity) }, Vy: { max: new Array(2 * ne).fill(-Infinity), min: new Array(2 * ne).fill(Infinity) }, Vz: { max: new Array(2 * ne).fill(-Infinity), min: new Array(2 * ne).fill(Infinity) } };
  const run = (list, gM, isAcc) => list.forEach(co => {
    const r = combine(R, co);
    co.res = r;
    const f = designVals(m, co.kmod, R, gM);
    co.fd = f;
    let kcy = R.buck.z.kc, kcz = R.buck.y.kc, Wz;
    if (R.sp) { const sp = DUR[co.dur].r <= 1 ? R.sp.long : R.sp.short; kcz = sp.kc; co.spKc = sp; Wz = g.A * Math.pow(R.buck.y.lef / sp.lamEf, 2) / (g.b / 2); }
    co.kcy = kcy; co.kcz = kcz;
    const kcrit = R.ltb ? R.ltb.kcrit : 1;
    let mx = 0;
    for (let i = 0; i < 2 * ne; i++) {
      const o = evalStation(R, S, m, g, f, r.N[i], r.My[i], r.Mz[i], r.Vy[i], r.Vz[i], kcy, kcz, kcrit, { Wz });
      ckDefs.forEach(k => { const v = o[k]; if (v !== undefined && v > best[k].r) best[k] = { r: v, combo: co, i, o, f, kcy, kcz, acc: isAcc }; });
      mx = Math.max(mx, o.cb, o.tb, o.b1, o.b2, o.ltb || 0, o.v);
      if (!isAcc) ['N', 'My', 'Mz', 'Vy', 'Vz'].forEach(q => { const v = r[q][i]; if (v > env[q].max[i]) env[q].max[i] = v; if (v < env[q].min[i]) env[q].min[i] = v; });
    }
    co.util = mx;
  });
  run(C.uls, m.gM, false);
  run(C.acc, num(S.coef.gMA, 1.0), true);
  R.env = env;
  // ekstremalne siły
  const ext = (q, sgn) => { let bi = 0, bv = -Infinity; env[q][sgn > 0 ? 'max' : 'min'].forEach((v, i) => { const a = sgn * v; if (a > bv) { bv = a; bi = i; } }); return { v: sgn * bv, i: bi, x: stX(R, bi) }; };
  R.ext = { Nmax: ext('N', 1), Nmin: ext('N', -1), Mymax: ext('My', 1), Mymin: ext('My', -1), Mzmax: ext('Mz', 1), Mzmin: ext('Mz', -1), Vymax: ext('Vy', 1), Vymin: ext('Vy', -1), Vzmax: ext('Vz', 1), Vzmin: ext('Vz', -1) };
  return best;
}
const stX = (R, i) => R.xs[(i >> 1) + (i & 1)];

/* ---------------------------------------- SGU – przemieszczenia poziome */
function slsCalc(R, S, m, g, C) {
  const nn = R.xs.length, kdef = m.kdef, L = R.L;
  // u_inst – kombinacja charakterystyczna; u_fin wg 2.3.2.2: G(1+kdef) + Q1(1+ψ2,1·kdef) + Qi(ψ0,i + ψ2,i·kdef)
  const finCombos = C.chr.map(co => {
    const f = co.f.map(([c, k]) => {
      if (c.kind === 'perm') return [c, 1 + kdef];
      if (c === co.lead) return [c, 1 + c.psi.p2 * kdef];
      return [c, c.psi.p0 + c.psi.p2 * kdef];
    });
    return { eq: '2.3.2.2', f, lead: co.lead, desc: co.desc, base: co };
  });
  // odcinki między podparciami bocznymi; głowica swobodna lub przesuwna – odcinek końcowy jak wspornik
  const segs = p => {
    const q = S.supp[p], held = q.top === 'pin' || q.top === 'fix';
    const pts = [0, ...R.braces[p], ...(held ? [L] : [])].sort((a, b) => a - b), s = [];
    for (let i = 0; i < pts.length - 1; i++) s.push({ a: pts[i], b: pts[i + 1], cant: false });
    if (!held) s.push({ a: pts[pts.length - 1], b: L, cant: true });
    return s.filter(q2 => q2.b - q2.a > 1);
  };
  const res = { inst: null, fin: null, limI: num(S.sls.limI, 300), limF: num(S.sls.limF, 150) };
  const scan = (list, key) => {
    let best = { r: 0 };
    list.forEach(co => {
      const r = combine(R, co);
      co.res = r;
      ['y', 'z'].forEach(p => {
        const u = r['u' + p];
        segs(p).forEach(sg => {
          let mx = 0, xi = 0;
          for (let i = 0; i < nn; i++) { const x = R.xs[i]; if (x < sg.a - 1 || x > sg.b + 1) continue; const v = Math.abs(u[i]); if (v > mx) { mx = v; xi = x; } }
          const len = sg.b - sg.a, lim = len / (key === 'inst' ? res.limI : res.limF);
          const ratio = lim > 0 ? mx / lim : 0;
          if (ratio > best.r) best = { r: ratio, u: mx, lim, len, p, x: xi, co, cant: sg.cant };
        });
      });
    });
    return best;
  };
  res.inst = scan(C.chr, 'inst');
  res.fin = scan(finCombos, 'fin');
  res.finCombos = finCombos;
  // skrócenie osiowe (informacyjnie): Δl = ∫N/(E·A) dx dla kombinacji quasi-stałej (pełzanie) i charakterystycznej
  let dlI = 0, dlF = 0;
  const chMax = C.chr.reduce((a, co) => { const r = co.res || combine(R, co); const n0 = r.N[0]; return !a || n0 > a.N ? { co, N: n0, r } : a; }, null);
  if (chMax) {
    for (let e = 0; e < R.xs.length - 1; e++) { const l = R.xs[e + 1] - R.xs[e]; dlI += (chMax.r.N[2 * e] + chMax.r.N[2 * e + 1]) / 2 * l / (m.E0mean * g.A); }
    const qpMax = C.qp.reduce((a, co) => { const r = combine(R, co); const n0 = r.N[0]; return !a || n0 > a.N ? { co, N: n0, r } : a; }, null);
    let dlq = 0; if (qpMax) for (let e = 0; e < R.xs.length - 1; e++) { const l = R.xs[e + 1] - R.xs[e]; dlq += (qpMax.r.N[2 * e] + qpMax.r.N[2 * e + 1]) / 2 * l / (m.E0mean * g.A); }
    dlF = dlI + kdef * dlq;
    res.dl = { inst: dlI, fin: dlF, qp: dlq, co: chMax.co, qpco: qpMax ? qpMax.co : null };
  }
  R.sls = res;
}

/* ---------------------------------------- oparcie, docisk, stężenia */
function connCalc(R, S, m, g, C) {
  const cn = S.conn, out = {};
  // siły w podstawie i głowicy (z kombinacji SGN)
  let Nb = { v: -Infinity }, Nbmin = { v: Infinity }, Nt = { v: -Infinity }, Vb = { v: 0 }, Mb = { v: 0 };
  const top = 2 * (R.xs.length - 2) + 1;
  C.uls.forEach(co => {
    const r = co.res; if (!r) return;
    if (r.N[0] > Nb.v) Nb = { v: r.N[0], co };
    if (r.N[0] < Nbmin.v) Nbmin = { v: r.N[0], co };
    if (r.N[top] > Nt.v) Nt = { v: r.N[top], co };
    const V = Math.hypot(r.Vy[0], r.Vz[0]); if (V > Vb.v) Vb = { v: V, co, Vy: r.Vy[0], Vz: r.Vz[0] };
    const M = Math.hypot(r.My[0], r.Mz[0]); if (M > Mb.v) Mb = { v: M, co, My: r.My[0], Mz: r.Mz[0] };
  });
  out.Nb = Nb; out.Nbmin = Nbmin; out.Nt = Nt; out.Vb = Vb; out.Mb = Mb;
  // docisk prostopadły do włókien (6.1.5): kryterium dla każdej kombinacji – k_mod zależy od kombinacji
  const bearing = (kind, cfg, Nkey) => {
    const mm = matOf(S, cfg.cls && cfg.cls !== '' ? cfg.cls : (S.mat.cls === 'user' ? 'C24' : S.mat.cls));
    if (S.mat.cls === 'user' && (!cfg.cls || cfg.cls === '')) Object.assign(mm, { fc90k: num(S.mat.user.fc90k, 2.5), kind: S.mat.user.kind });
    const along = cfg.dir === 'y' ? (g.type === 'round' ? g.d : g.b) : (g.type === 'round' ? g.d : g.h);
    const across = cfg.dir === 'y' ? (g.type === 'round' ? g.d : g.h) : (g.type === 'round' ? g.d : g.b);
    const w = num(cfg.w, across), bc = Math.min(w, across);
    const l = along;
    const endA = cfg.end === '' ? Infinity : num(cfg.end, Infinity);
    const ext = s => Math.min(30, s, l);
    const lef = l + ext(Infinity) + ext(endA);
    const Aef = bc * lef;
    let kc90 = 1.0, kTxt = '';
    const soft = mm.kind === 'solid', gl = mm.kind === 'glulam';
    if (cfg.kc90 !== 'auto' && num(cfg.kc90, 0) > 0) { kc90 = num(cfg.kc90, 1); kTxt = 'podany ręcznie'; }
    else if (kind === 'sill') { kc90 = soft ? 1.25 : gl ? 1.5 : 1.0; kTxt = soft ? 'element na podłożu ciągłym, drewno lite iglaste (6.1.5(4))' : gl ? 'element na podłożu ciągłym, drewno klejone iglaste (6.1.5(4))' : 'k_c,90 = 1,0 (6.1.5(1))'; }
    else { kc90 = (l <= 400) ? (soft ? 1.5 : gl ? 1.75 : 1.0) : 1.0; kTxt = l <= 400 ? (soft ? 'podpora dyskretna, l ≤ 400 mm, drewno lite iglaste (6.1.5(5))' : gl ? 'podpora dyskretna, l ≤ 400 mm, drewno klejone iglaste (6.1.5(5))' : 'k_c,90 = 1,0') : 'l > 400 mm → k_c,90 = 1,0'; }
    let best = { r: -1 };
    C.uls.forEach(co => {
      const r = co.res; if (!r) return;
      const N = Nkey === 'base' ? r.N[0] : r.N[top] - 0;
      if (!(N > 0)) return;
      const f = co.kmod * mm.fc90k / mm.gM;
      const sig = N / Aef, ratio = sig / (kc90 * f);
      if (ratio > best.r) best = { r: ratio, N, sig, f, co };
    });
    return { mm, l, bc, w, lef, Aef, kc90, kTxt, endA, best };
  };
  if (cn.base === 'sill') out.sill = bearing('sill', cn.sill, 'base');
  if (cn.top === 'beam') {
    // siła w głowicy bez ciężaru własnego słupa – N tuż pod głowicą
    out.beam = bearing('beam', cn.beam, 'top');
  }
  if (cn.base === 'steel') {
    const p = cn.plate, a = num(p.a, 200), b = num(p.b, 200), fck = CONC[p.conc] || 20;
    const gc = num(S.coef.gc, 1.4), acc = num(S.coef.acc, 1.0), fcd = acc * fck / gc;
    const Ac0 = a * b;
    const d1 = Math.min(num(p.B1, a), 3 * a), d2 = Math.min(num(p.B2, b), 3 * b);
    const Ac1 = Math.max(Ac0, d1 * d2);
    const FRdu = Math.min(Ac0 * fcd * Math.sqrt(Ac1 / Ac0), 3 * fcd * Ac0);
    out.plate = { a, b, fck, fcd, Ac0, Ac1, d1, d2, FRdu, NEd: Math.max(0, Nb.v), co: Nb.co, gc, acc };
    // docisk czoła słupa do blachy – σ_c,0 ≤ f_c,0,d (jak ściskanie)
  }
  // stężenia (9.2.5.2)
  out.brace = {};
  ['y', 'z'].forEach(p => {
    const bz = R.braces[p]; if (!bz.length) return;
    const pts = [0, ...bz, L_(R)].sort((a, b) => a - b), segs = []; for (let i = 0; i < pts.length - 1; i++) segs.push(pts[i + 1] - pts[i]);
    const a = Math.max(...segs), mbays = segs.length, ks = Math.min(4, 2 * (1 + Math.cos(Math.PI / mbays)));
    const kf = (m.kind === 'glulam' || m.kind === 'lvl') ? num(S.coef.kf2, 80) : num(S.coef.kf1, 50);
    const Nd = Math.max(0, R.ext.Nmax.v);
    out.brace[p] = { n: bz.length, a, mbays, ks, kf, Nd, Fd: Nd / kf, Creq: ks * Nd / a };
  });
  R.conn = out;
}
const L_ = R => R.L;

/* ---------------------------------------- pożar (PN-EN 1995-1-2, 4.2.2) */
function fireCalc(R, S, m, g, C) {
  const F = Object.assign({}, S.fire, { d0: S.coef.d0 });
  const t = S.fire.R, ch = charDepth(F, m, t), d = ch.def;
  const fc = S.fire.faces;
  let gf, shift = { y: 0, z: 0 }, ok = true, desc;
  if (g.type === 'rect') {
    const bF = g.b - d * ((fc.l ? 1 : 0) + (fc.r ? 1 : 0)), hF = g.h - d * ((fc.t ? 1 : 0) + (fc.b ? 1 : 0));
    ok = bF > 0 && hF > 0;
    gf = ok ? rectProps(bF, hF) : null;
    shift = { y: d * ((fc.l ? 1 : 0) - (fc.r ? 1 : 0)) / 2, z: d * ((fc.b ? 1 : 0) - (fc.t ? 1 : 0)) / 2 };
    desc = `b_{fi} = ${fx(bF, 1)} mm, h_{fi} = ${fx(hF, 1)} mm`;
  } else if (g.type === 'round') {
    const dF = g.d - 2 * d; ok = dF > 0; gf = ok ? roundProps(dF) : null; desc = `d_{fi} = ${fx(dF, 1)} mm`;
  } else {
    // gałęzie zwęglane ze wszystkich stron w szczelinach (zachowawczo), zewnętrzne wg zaznaczenia
    const sp = S.geom.sp, n = sp.n;
    const tF = sp.t - 2 * d, wF = sp.w - d * ((fc.t ? 1 : 0) + (fc.b ? 1 : 0));
    const tOut = sp.t - d - (n === 1 ? d : 0);
    ok = tF > 0 && wF > 0;
    if (ok) { gf = spacedProps({ n, t: Math.min(tF, tOut), w: wF, a: sp.a + 2 * d, nb: sp.nb }); }
    desc = `gałęzie t_{fi} = ${fx(tF, 1)} mm, w_{fi} = ${fx(wF, 1)} mm (zwęglanie w szczelinach ze wszystkich stron)`;
  }
  const fi = { t, ch, def: d, gf, ok, desc, shift, faces: fc, mode: S.fire.mode, eta: num(S.fire.eta, 0.6) };
  R.fire = fi;
  if (!ok) return;
  const kfi = m.kfi, gMfi = num(S.coef.gMfi, 1.0);
  const khy = khOf(m, gf.hY, S.mat.kh).k, khz = khOf(m, gf.hZ, S.mat.kh).k;
  const f = { kmod: 1, gM: gMfi, fc0d: kfi * m.fc0k / gMfi, ft0d: kfi * m.ft0k * khOf(m, gf.Bmax, S.mat.kh).k / gMfi, fmyd: kfi * khy * m.fmk / gMfi, fmzd: kfi * khz * m.fmk / gMfi, fvd: kfi * m.fvk / gMfi };
  fi.f = f; fi.kh = { y: khy, z: khz };
  // wyboczenie w pożarze: λ_rel jak w temperaturze normalnej (k_fi skraca się), przekrój resztkowy
  const sqF = Math.sqrt(m.fc0k / m.E005);
  const lefFi = S.fire.lef !== '' && num(S.fire.lef, 0) > 0 ? num(S.fire.lef, 0) * 1000 : null;
  const bk = {};
  ['z', 'y'].forEach(p => { const lef = lefFi || R.buck[p].lef, i = p === 'z' ? gf.iy : gf.iz, lam = lef / i, lr = lam / Math.PI * sqF, k = kcOf(lr, m.betaC); bk[p] = { lef, i, lam, lamRel: lr, k: k.k, kc: k.kc }; });
  if (g.type === 'spaced' && R.sp) {
    const sp = S.geom.sp, lam1 = Math.sqrt(12) * R.sp.l1 / gf.t, lam1c = Math.max(30, lam1), lamZ = bk.y.lef * Math.sqrt(gf.A / gf.Iz);
    const eta = R.sp.short.eta, le = Math.sqrt(lamZ * lamZ + eta * gf.n / 2 * lam1c * lam1c), lr = le / Math.PI * sqF, k = kcOf(lr, m.betaC);
    bk.y = Object.assign(bk.y, { lam: le, lamRel: lr, k: k.k, kc: k.kc, spaced: true }); void sp;
  }
  fi.bk = bk;
  let ltb = null;
  if (R.ltb && gf.type === 'rect') {
    const st = R.ltb.strong, Iminor = st === 'y' ? gf.Iz : gf.Iy, Wst = st === 'y' ? gf.Wy : gf.Wz;
    const scrit = Math.PI * Math.sqrt(m.E005 * Iminor * m.G005 * gf.It) / (R.ltb.lef * Wst), lr = Math.sqrt(m.fmk / scrit);
    ltb = { scrit, lamRel: lr, kcrit: kcritOf(lr), strong: st };
  }
  fi.ltb = ltb;
  // kombinacje pożarowe
  const list = S.fire.mode === 'eta' ? C.uls.map(co => Object.assign({}, co, { f: co.f.map(([c, k]) => [c, k * fi.eta]), eta: true, desc: `η_fi·(${co.desc})`, type: 'fi' })) : C.fi;
  const best = {}; ['c0', 'cb', 'b1', 'b2', 'ltb', 'v', 't0', 'tb'].forEach(k => { best[k] = { r: 0 }; });
  const ne = R.xs.length - 1;
  list.forEach(co => {
    const r = combine(R, co);
    for (let i = 0; i < 2 * ne; i++) {
      // dodatkowy moment od przesunięcia środka ciężkości przekroju resztkowego (zwęglanie niesymetryczne)
      const N = r.N[i], My = r.My[i] + N * shift.z, Mz = r.Mz[i] + N * shift.y;
      const Wz = gf.type === 'spaced' ? gf.A * Math.pow(bk.y.lef / bk.y.lam, 2) / (gf.b / 2) : undefined;
      const R2 = Object.assign({}, R, { ltb: ltb ? Object.assign({}, R.ltb, ltb) : null });
      const o = evalStation(R2, S, m, gf, f, N, My, Mz, r.Vy[i], r.Vz[i], bk.z.kc, bk.y.kc, ltb ? ltb.kcrit : 1, { Wz });
      Object.keys(best).forEach(k => { const v = o[k]; if (v !== undefined && v > best[k].r) best[k] = { r: v, co, i, o, N, My, Mz }; });
    }
  });
  fi.best = best; fi.list = list;
}

/* ---------------------------------------- analiza II rzędu (5.4.4, 2.4.1(2)) */
// sztywność E_d = E_0,mean/γ_M (2.4.1(2)P) albo E_0,05/γ_M; imperfekcja łukowa e = l_ef/x (5.4.4: 0,0025·l) w kształcie postaci wyboczenia,
// dla układów przesuwnych przechyłka φ = 0,005·√(5/h) ≤ 0,005; imperfekcje w jednej płaszczyźnie naraz (druga płaszczyzna – II rząd bez imperfekcji)
function secondOrder(R, S, m, g, C) {
  const ne = R.xs.length - 1, L = R.L;
  const Ebase = S.buck.IIE === '05' ? m.E005 : m.E0mean;
  const Ed = Ebase / m.gM;
  const lin = S.buck.IIint !== 'sq';
  const out = { Ed, Ebase, lin, planes: {}, res: [] };
  const h = L / 1000, phi = num(S.coef.phi0, 0.005) * (h <= 5 ? 1 : Math.sqrt(5 / h));
  const e0r = num(S.buck.e0, 400);
  ['z', 'y'].forEach(p => {
    const q = S.supp[p], sway = q.top === 'free' || q.top === 'guided';
    const I = p === 'z' ? g.Iy : (g.type === 'spaced' && R.sp ? g.A * Math.pow(R.buck.y.lef / R.sp.long.lamEf, 2) : g.Iz);
    const bk = R.buck[p];
    const amp = Math.max(bk.lef / e0r, sway ? phi * L : 0);
    const Ncr = Math.pow(Math.PI, 2) * Ed * I / (bk.lef * bk.lef);
    out.planes[p] = { amp, sway, phi, Ncr, I, EI: Ed * I, e0r };
  });
  const cand = C.uls.slice().sort((a, b) => (b.util || 0) - (a.util || 0)).slice(0, 24);
  const nmax = C.uls.reduce((a, co) => (co.res && (!a || co.res.N[0] > a.res.N[0]) ? co : a), null);
  if (nmax && !cand.includes(nmax)) cand.push(nmax);
  const solveII = (co, r, p, Nel, withImp) => {
    const pl = out.planes[p], mdl = R.md[p], md2 = Object.assign({}, mdl, { EI: pl.EI });
    const F = new Array(mdl.nd).fill(0), qe = new Array(ne).fill(0);
    co.f.forEach(([c, k]) => { const ld = R.resp[c.id]['ld' + p]; if (!ld || !k) return; for (let i = 0; i < F.length; i++) F[i] += k * ld.F[i]; for (let e = 0; e < ne; e++) qe[e] += k * ld.qe[e]; });
    const Fl = loadVector(md2, { F, qe }), Ff = md2.free.map(d => Fl[d]);
    const K = assemble(md2, Nel);
    let rhs = Ff;
    if (withImp) {
      const w0f = md2.free.map(d => (R.buck[p].modeU ? R.buck[p].modeU[d] * pl.amp : 0));
      const u1 = gaussSolve(assemble(md2, null), Ff) || Ff.map(() => 0);
      const sg = u1.reduce((s2, v, i) => s2 + v * w0f[i], 0) < 0 ? -1 : 1;
      const KG = assembleKG(md2, Nel);
      rhs = Ff.map((v, i) => v + KG[i].reduce((s2, a, j) => s2 + a * sg * w0f[j], 0));
    }
    const x = gaussSolve(K, rhs);
    if (!x) return null;
    const u = new Array(md2.nd).fill(0); md2.free.forEach((d, k) => { u[d] = x[k]; });
    const fr = memberForces(md2, u, { qe });
    fr.u = u.filter((v, i) => i % 2 === 0);
    return fr;
  };
  let best = { r: 0 };
  cand.forEach(co => {
    const r = co.res || combine(R, co);
    const Nel = []; for (let e = 0; e < ne; e++) Nel.push(Math.max(0, (r.N[2 * e] + r.N[2 * e + 1]) / 2));
    const Nm = Math.max(...Nel);
    const unstable = ['z', 'y'].some(p => Nm >= out.planes[p].Ncr * 0.999);
    const sol = {};
    if (!unstable) ['z', 'y'].forEach(p => { sol[p] = { imp: solveII(co, r, p, Nel, true), no: solveII(co, r, p, Nel, false) }; });
    const ok = !unstable && ['z', 'y'].every(p => sol[p].imp && sol[p].no);
    const f = designVals(m, co.kmod, R, m.gM);
    let mx = 0, mi = -1, mo = null, mv = '';
    const WzE = g.type === 'spaced' ? out.planes.y.I / (g.b / 2) : undefined;
    if (ok) ['z', 'y'].forEach(pi => {
      const Mzz = pi === 'z' ? sol.z.imp : sol.z.no, Myy = pi === 'y' ? sol.y.imp : sol.y.no;
      for (let i = 0; i < 2 * ne; i++) {
        const o = evalStation(R, S, m, g, f, r.N[i], Mzz.M[i], Myy.M[i], Myy.V[i], Mzz.V[i], 1, 1, R.ltb ? R.ltb.kcrit : 1, { Wz: WzE });
        const ry = o.smy / f.fmyd, rz = o.smz / f.fmzd, km = g.km;
        const cterm = lin ? o.c0 : o.c0 * o.c0;
        let v = r.N[i] >= 0 ? Math.max(cterm + ry + km * rz, cterm + km * ry + rz) : o.tb;
        if (R.ltb && r.N[i] >= 0) v = Math.max(v, Math.pow(o.ltbM, 2) + o.c0 + (R.ltb.strong === 'y' ? rz : ry));
        if (v > mx) { mx = v; mi = i; mo = o; mv = pi; }
      }
    });
    const rr = ok ? mx : Infinity;
    if (rr > best.r || (!isFinite(rr) && isFinite(best.r))) best = { r: rr, co, i: mi, o: mo, sol, f, N: mi >= 0 ? r.N[mi] : Nm, imp: mv, unstable, Nm };
  });
  out.best = best;
  R.II = out;
}

/* ---------------------------------------- lista sprawdzeń */
function buildChecks(R, S, m, g) {
  const ck = R.ck, out = [];
  const meth = S.buck.method;
  const st = (r, warnOnly) => (!isFinite(r) ? 'fail' : r <= 1 + 1e-9 ? (r > 0.98 ? 'ok' : 'ok') : (warnOnly ? 'warn' : 'fail'));
  const add = (o) => { o.ratio = o.Rd > 0 ? o.Ed / o.Rd : (o.status === 'info' ? NaN : o.Ed > 0 ? Infinity : 0); if (o.ratioOverride !== undefined) o.ratio = o.ratioOverride; if (!o.status) o.status = st(o.ratio, o.warnOnly); if (!o.key) o.key = o.id; out.push(o); };
  const coName = co => co ? `${co.type === 'acc' ? 'KW' : co.type === 'fi' ? 'KP' : 'K'}${co.no}: ${co.eq}${co.lead ? ' – wiodące ' + co.lead.name : ''}` : '';
  const xAt = b => (b && b.i >= 0 ? stX(R, b.i) / 1000 : 0);
  const G1 = 'SGN – nośność przekroju', G2 = 'SGN – stateczność', G3 = 'Oparcie i docisk', G4 = 'SGU – przemieszczenia', G5 = 'Odporność ogniowa', G6 = 'Warunki konstrukcyjne';
  const anyComp = ck.c0.r > 0, anyTens = ck.t0.r > 0;
  const dimTxt = g.type === 'round' ? `⌀${fx(g.d, 0)}` : g.type === 'spaced' ? `${g.n}×${fx(g.t, 0)}×${fx(g.w, 0)}` : `${fx(g.b, 0)}×${fx(g.h, 0)}`;
  if (anyComp) add({ id: 'c0', grp: G1, name: 'Ściskanie wzdłuż włókien σ_{c,0,d} ≤ f_{c,0,d}', ref: '6.1.4', Ed: ck.c0.o.sc, Rd: ck.c0.f.fc0d, unit: 'MPa', b: ck.c0, combo: coName(ck.c0.combo), x: xAt(ck.c0) });
  if (anyTens) add({ id: 't0', grp: G1, name: 'Rozciąganie wzdłuż włókien σ_{t,0,d} ≤ f_{t,0,d}', ref: '6.1.2', Ed: ck.t0.o.st, Rd: ck.t0.f.ft0d, unit: 'MPa', b: ck.t0, combo: coName(ck.t0.combo), x: xAt(ck.t0) });
  if (ck.cb.r > 0) add({ id: 'cb', grp: G1, name: 'Zginanie ze ściskaniem – nośność przekroju (6.19), (6.20)', ref: '6.2.4', Ed: ck.cb.r, Rd: 1, unit: '', b: ck.cb, combo: coName(ck.cb.combo), x: xAt(ck.cb) });
  if (ck.tb.r > 0) add({ id: 'tb', grp: G1, name: 'Zginanie z rozciąganiem (6.17), (6.18)', ref: '6.2.3', Ed: ck.tb.r, Rd: 1, unit: '', b: ck.tb, combo: coName(ck.tb.combo), x: xAt(ck.tb) });
  if (ck.v.r > 0) add({ id: 'v', grp: G1, name: 'Ścinanie τ_{d} ≤ f_{v,d}', ref: '6.1.7', Ed: ck.v.o.tau, Rd: ck.v.f.fvd, unit: 'MPa', b: ck.v, combo: coName(ck.v.combo), x: xAt(ck.v) });
  // stateczność
  const needB = R.buck.z.lamRel > 0.3 || R.buck.y.lamRel > 0.3;
  if (meth === 'kc') {
    if (anyComp && needB) {
      add({ id: 'b1', grp: G2, name: 'Ściskanie ze zginaniem z wyboczeniem – wyboczenie względem osi y (6.23)', ref: '6.3.2', Ed: ck.b1.r, Rd: 1, unit: '', b: ck.b1, combo: coName(ck.b1.combo), x: xAt(ck.b1) });
      add({ id: 'b2', grp: G2, name: 'Ściskanie ze zginaniem z wyboczeniem – wyboczenie względem osi z (6.24)', ref: '6.3.2', Ed: ck.b2.r, Rd: 1, unit: '', b: ck.b2, combo: coName(ck.b2.combo), x: xAt(ck.b2) });
    } else if (anyComp) add({ id: 'b0', grp: G2, name: 'Wyboczenie – λ_{rel,y}, λ_{rel,z} ≤ 0,3: wystarcza sprawdzenie przekroju (6.19, 6.20)', ref: '6.3.2(2)', Ed: Math.max(R.buck.z.lamRel, R.buck.y.lamRel), Rd: 0.3, unit: '', fmt: 3, status: 'info' });
  } else if (R.II) {
    const b = R.II.best;
    add({ id: 'II', grp: G2, name: 'Analiza II rzędu z imperfekcjami – nośność przekroju (6.19, 6.20)', ref: '5.4.4', Ed: b.r, Rd: 1, unit: '', b, combo: coName(b.co), x: b.i >= 0 ? stX(R, b.i) / 1000 : 0 });
  }
  if (R.ltb && (ck.ltb.r > 0) && ck.ltb.o && ck.ltb.o.ltbM > 0) {
    const lt = R.ltb, nm = lt.strong === 'y' ? 'M_{y}' : 'M_{z}';
    if (lt.kcrit < 1) add({ id: 'ltb', grp: G2, name: `Zwichrzenie przy zginaniu ${nm} ze ściskaniem (6.35)`, ref: '6.3.3', Ed: ck.ltb.r, Rd: 1, unit: '', b: ck.ltb, combo: coName(ck.ltb.combo), x: xAt(ck.ltb) });
    else add({ id: 'ltb0', grp: G2, name: `Zwichrzenie: λ_{rel,m} ≤ 0,75 → k_{crit} = 1,0 – nie redukuje nośności`, ref: '6.3.3', Ed: lt.lamRel, Rd: 0.75, unit: '', fmt: 3, status: 'info' });
  }
  // metoda alternatywna informacyjnie
  if (meth === 'kc' && R.II && R.II.best && anyComp) {
    const b = R.II.best;
    add({ id: 'IIinfo', grp: G2, name: 'Kontrolnie: analiza II rzędu z imperfekcjami (6.19, 6.20)', ref: '5.4.4', Ed: b.r, Rd: 1, unit: '', status: 'info', b, combo: coName(b.co), note: 'Metoda alternatywna – informacyjnie (decyduje metoda współczynnika k_c).' });
  }
  if (meth === 'II' && anyComp && needB) {
    add({ id: 'b12info', grp: G2, name: 'Kontrolnie: metoda k_c (6.23), (6.24)', ref: '6.3.2', Ed: Math.max(ck.b1.r, ck.b2.r), Rd: 1, unit: '', status: 'info', b: ck.b1.r >= ck.b2.r ? ck.b1 : ck.b2, combo: coName((ck.b1.r >= ck.b2.r ? ck.b1 : ck.b2).combo), note: 'Metoda alternatywna – informacyjnie (decyduje analiza II rzędu).' });
  }
  // smukłość
  const lmax = Math.max(R.buck.z.lam, R.buck.y.lam), slim = num(S.buck.slim, 150);
  if (slim > 0) add({ id: 'slim', grp: G6, name: 'Smukłość λ_{max} ≤ λ_{lim} (zalecenie)', ref: 'λ', Ed: lmax, Rd: slim, unit: '', fmt: 1, warnOnly: true, note: 'PN-EN 1995-1-1 nie ogranicza smukłości; wartość graniczna wg praktyki projektowej (np. PN-B-03150: 150 dla słupów).' });
  // zał. C – słup wielogałęziowy
  if (R.sp) {
    const sp = S.geom.sp, P = R.sp;
    const cond = [];
    if (P.nb < 3) cond.push(`liczba przedziałów ${P.nb} < 3`);
    const amax = sp.conn === 'pack' ? 3 * sp.t : 6 * sp.t; if (sp.a > amax + 1e-6) cond.push(`a = ${fx(sp.a, 0)} > ${sp.conn === 'pack' ? 3 : 6}·t = ${fx(amax, 0)} mm`);
    const l2min = sp.conn === 'pack' ? 1.5 * sp.a : 2 * sp.a; if (P.l2 < l2min - 1e-6) cond.push(`l₂ = ${fx(P.l2, 0)} < ${sp.conn === 'pack' ? '1,5' : '2'}·a = ${fx(l2min, 0)} mm`);
    if (sp.conn === 'gusset' && sp.fast === 'bolt') cond.push('nakładki łączone na śruby – tab. C.1 nie podaje η (przyjęto jak gwoździe)');
    add({ id: 'spc', grp: G6, name: 'Słup wielogałęziowy – warunki stosowania zał. C.3.1', ref: 'C.3.1', Ed: cond.length, Rd: 0, unit: '', fmt: 'text', RdTxt: 'spełnione', EdTxt: cond.length ? cond.join('; ') : 'spełnione', status: cond.length ? 'fail' : 'ok', ratioOverride: cond.length ? 1.5 : 0 });
    const hasM = R.ext.Mymax.v > 1 || R.ext.Mymin.v < -1 || R.ext.Mzmax.v > 1 || R.ext.Mzmin.v < -1;
    if (hasM) add({ id: 'spm', grp: G6, name: 'Słup wielogałęziowy – zał. C zakłada obciążenie osiowe', ref: 'C.3.1', Ed: 0, Rd: 0, fmt: 'text', EdTxt: 'występują momenty', RdTxt: 'osiowe', status: 'warn', ratioOverride: 0, note: 'Momenty zginające uwzględniono zachowawczo: M_{z} z I_{ef} = A·(l_{ef}/λ_{ef})², M_{y} – suma gałęzi.' });
    // siły w przekładkach / nakładkach (C.2.4, C.18)
    const Fc = Math.max(0, R.ext.Nmax.v), sh = P.long, lef = sh.lamEf, kc = sh.kc;
    const Vd = lef < 30 ? Fc / (120 * kc) : lef < 60 ? Fc * lef / (3600 * kc) : Fc / (60 * kc);
    const Td = Vd * P.l1 / g.a1;
    P.Vd = Vd; P.Td = Td; P.Fc = Fc;
    add({ id: 'spT', grp: G2, name: 'Słup wielogałęziowy – siła ścinająca w łącznikach przekładki/nakładki T_{d} (do wymiarowania łączników)', ref: 'C.3.3', Ed: Td / 1e3, Rd: 0, unit: 'kN', status: 'info', fmt: 2, note: `V_{d} = ${fx(Vd / 1e3, 2)} kN, T_{d} = V_{d}·l_{1}/a_{1}; łączniki zaprojektuj wg rozdz. 8.` });
  }
  // oparcie
  const cn = R.conn;
  if (cn.sill && cn.sill.best.r >= 0) { const s = cn.sill, b = s.best; add({ id: 'c90b', grp: G3, name: 'Docisk słupa do podwaliny σ_{c,90,d} ≤ k_{c,90}·f_{c,90,d}', ref: '6.1.5', Ed: b.sig, Rd: s.kc90 * b.f, unit: 'MPa', b, combo: coName(b.co) }); }
  if (cn.beam && cn.beam.best.r >= 0) { const s = cn.beam, b = s.best; add({ id: 'c90t', grp: G3, name: 'Docisk belki (oczepu) do głowicy słupa σ_{c,90,d} ≤ k_{c,90}·f_{c,90,d}', ref: '6.1.5', Ed: b.sig, Rd: s.kc90 * b.f, unit: 'MPa', b, combo: coName(b.co) }); }
  if (cn.plate && cn.plate.NEd > 0) { const p = cn.plate; add({ id: 'conc', grp: G3, name: 'Docisk blachy podstawy do betonu N_{Ed} ≤ F_{Rdu}', ref: 'EC2 6.7', Ed: p.NEd / 1e3, Rd: p.FRdu / 1e3, unit: 'kN', combo: coName(p.co) }); }
  if (cn.Nbmin.v < -1) add({ id: 'upl', grp: G3, name: 'Siła odrywająca w podstawie N_{t,Ed} – wymagane zakotwienie', ref: 'zakotw.', Ed: -cn.Nbmin.v / 1e3, Rd: 0, unit: 'kN', status: 'warn', ratioOverride: 0, fmt: 2, combo: coName(cn.Nbmin.co), note: 'Zaprojektuj połączenie słupa z fundamentem na rozciąganie (kotwy, blachy, łączniki) – rozdz. 8.' });
  if (cn.Vb.v > 1) add({ id: 'Vb', grp: G3, name: 'Siła pozioma w podstawie V_{Ed} (do wymiarowania połączenia)', ref: 'reakcja', Ed: cn.Vb.v / 1e3, Rd: 0, unit: 'kN', status: 'info', fmt: 2, combo: coName(cn.Vb.co) });
  if (cn.Mb.v > 1e3 && (S.supp.z.base === 'fix' || S.supp.y.base === 'fix')) add({ id: 'Mb', grp: G3, name: 'Moment utwierdzenia w podstawie M_{Ed} (do wymiarowania połączenia)', ref: 'reakcja', Ed: cn.Mb.v / 1e6, Rd: 0, unit: 'kNm', status: 'warn', ratioOverride: 0, fmt: 2, combo: coName(cn.Mb.co), note: 'Utwierdzenie słupa drewnianego wymaga połączenia przenoszącego moment (np. stopa stalowa z kotwami i łącznikami trzpieniowymi) – zaprojektuj osobno.' });
  Object.entries(cn.brace || {}).forEach(([p, b]) => add({ id: 'br' + p, key: 'br' + p, grp: G2, name: `Stężenia w płaszczyźnie x–${p}: siła F_{d} = N_{d}/k_{f} i sztywność C ≥ k_{s}·N_{d}/a`, ref: '9.2.5.2', Ed: b.Fd / 1e3, Rd: 0, unit: 'kN', status: 'info', fmt: 2, note: `C_{min} = ${fx(b.Creq, 1)} N/mm (k_{s} = ${fx(b.ks, 2)}, a = ${fx(b.a / 1000, 2)} m) – wymagania dla stężeń.` }));
  // SGU
  if (S.sls.on && R.sls) {
    const s = R.sls;
    if (s.inst && s.inst.r > 0) add({ id: 'uinst', grp: G4, name: `Przemieszczenie poziome natychmiastowe u_{inst} ≤ l/${s.limI}`, ref: '7.2', Ed: s.inst.u, Rd: s.inst.lim, unit: 'mm', combo: s.inst.co ? `${s.inst.co.eq}: ${s.inst.co.desc}` : '', note: `płaszczyzna x–${s.inst.p}, odcinek l = ${fx(s.inst.len / 1000, 2)} m${s.inst.cant ? ' (wspornikowy)' : ''}` });
    if (s.fin && s.fin.r > 0) add({ id: 'ufin', grp: G4, name: `Przemieszczenie poziome końcowe u_{fin} ≤ l/${s.limF}`, ref: '2.3.2.2, 7.2', Ed: s.fin.u, Rd: s.fin.lim, unit: 'mm', combo: s.fin.co ? s.fin.co.desc : '', note: `u_{fin} = u_{inst,G}(1+k_{def}) + u_{inst,Q1}(1+ψ_{2,1}k_{def}) + Σu_{inst,Qi}(ψ_{0,i}+ψ_{2,i}k_{def}); k_{def} = ${fx(m.kdef, 2)}` });
    if (s.dl) add({ id: 'dl', grp: G4, name: 'Skrócenie osiowe słupa Δl_{fin} (informacyjnie)', ref: '2.3.2.2', Ed: s.dl.fin, Rd: 0, unit: 'mm', status: 'info', fmt: 2, note: `Δl_{inst} = ${fx(s.dl.inst, 2)} mm (char.), Δl_{fin} = Δl_{inst} + k_{def}·Δl_{qp}` });
  }
  // pożar
  if (R.fire) {
    const F = R.fire;
    if (!F.ok) add({ id: 'fi0', grp: G5, name: `Przekrój resztkowy po ${F.t} min – brak (d_{ef} = ${fx(F.def, 1)} mm)`, ref: 'EN 1995-1-2 4.2.2', Ed: 1, Rd: 0, unit: '', status: 'fail', ratioOverride: Infinity, fmt: 'text', EdTxt: 'brak przekroju', RdTxt: 'przekrój resztkowy' });
    else {
      const b = F.best, nB = Math.max(b.b1.r, b.b2.r), wb = b.b1.r >= b.b2.r ? b.b1 : b.b2;
      const cn2 = co => co ? `${co.eta ? 'η_fi·' : ''}${co.eq}${co.lead ? ' – wiodące ' + co.lead.name : ''}` : '';
      if (b.c0.r > 0) add({ id: 'fic', grp: G5, name: `R${F.t}: ściskanie ze zginaniem z wyboczeniem – przekrój resztkowy (6.23, 6.24)`, ref: 'EN 1995-1-2 4.2.2', Ed: (F.bk.z.lamRel > 0.3 || F.bk.y.lamRel > 0.3) ? nB : b.cb.r, Rd: 1, unit: '', b: wb, combo: cn2(wb.co) });
      else if (b.tb.r > 0 || b.cb.r > 0) add({ id: 'fim', grp: G5, name: `R${F.t}: zginanie – przekrój resztkowy`, ref: 'EN 1995-1-2 4.2.2', Ed: Math.max(b.cb.r, b.tb.r), Rd: 1, unit: '', b: b.cb.r > b.tb.r ? b.cb : b.tb, combo: cn2((b.cb.r > b.tb.r ? b.cb : b.tb).co) });
      if (F.ltb && b.ltb.r > 0) add({ id: 'filtb', grp: G5, name: `R${F.t}: zwichrzenie ze ściskaniem – przekrój resztkowy (6.35)`, ref: 'EN 1995-1-2 4.2.2', Ed: b.ltb.r, Rd: 1, unit: '', b: b.ltb, combo: cn2(b.ltb.co) });
      if (b.v.r > 0) add({ id: 'fiv', grp: G5, name: `R${F.t}: ścinanie – przekrój resztkowy`, ref: 'EN 1995-1-2 4.2.2', Ed: b.v.o.tau, Rd: F.f.fvd, unit: 'MPa', b: b.v, combo: cn2(b.v.co) });
    }
  }
  void dimTxt;
  R.checks = out;
}

/* ---------------------------------------- dobór przekroju */
function autoDesign(S0, opt) {
  opt = opt || {};
  const lim = (opt.lim || 100) / 100;
  const S = normalize(S0);
  const m = matOf(S);
  const glu = m.kind === 'glulam' || m.kind === 'lvl';
  const cands = [];
  if (S.geom.type === 'round') DIMS_ROUND.forEach(d => cands.push({ d, A: d * d }));
  else if (S.geom.type === 'spaced') { [32, 38, 45, 50, 63, 75, 80, 100].forEach(t => [100, 120, 140, 160, 180, 200, 220, 240].forEach(w => { if (w >= t) cands.push({ t, w, A: t * w }); })); }
  else {
    const B = glu ? DIMS_GL_B : DIMS_SOLID, H = glu ? DIMS_GL_H : DIMS_SOLID;
    B.forEach(b => H.forEach(h => { if (h < b) return; if (opt.square && h !== b) return; if (h > 4 * b) return; cands.push({ b, h, A: b * h }); }));
  }
  cands.sort((a, b) => a.A - b.A || (a.h || 0) - (b.h || 0));
  for (const c of cands) {
    const T = deep(S);
    if (T.geom.type === 'round') T.geom.d = c.d;
    else if (T.geom.type === 'spaced') { T.geom.sp.t = c.t; T.geom.sp.w = c.w; }
    else {
      // orientacja: większy wymiar w płaszczyźnie większego wytężenia (domyślnie h – oś y)
      T.geom.b = c.b; T.geom.h = c.h;
    }
    if (T.buck.method === 'kc') T.buck.both = false;
    const R = calc(T);
    if (R.errors.length) continue;
    const u = R.checks.filter(k => k.status !== 'info' && !k.warnOnly && k.fmt !== 'text').reduce((a, k) => Math.max(a, isFinite(k.ratio) ? k.ratio : 99), 0);
    if (u <= lim + 1e-9) {
      // dla prostokąta sprawdź też orientację odwrotną, gdy daje mniejsze wytężenie
      if (T.geom.type === 'rect' && c.b !== c.h) {
        const T2 = deep(T); T2.geom.b = c.h; T2.geom.h = c.b; const R2 = calc(T2);
        const u2 = R2.checks.filter(k => k.status !== 'info' && !k.warnOnly && k.fmt !== 'text').reduce((a, k) => Math.max(a, isFinite(k.ratio) ? k.ratio : 99), 0);
        if (!R2.errors.length && u2 < u) return { ok: true, geom: T2.geom, util: u2 };
      }
      return { ok: true, geom: T.geom, util: u };
    }
  }
  return { ok: false };
}
function autoClass(S0, opt) {
  const S = normalize(S0), lim = ((opt && opt.lim) || 100) / 100;
  const cur = S.mat.cls;
  const fam = MAT_GROUPS.find(gr => gr[1].includes(cur));
  if (!fam || cur === 'user') return { ok: false };
  for (const cls of fam[1]) {
    const T = deep(S); T.mat.cls = cls; const R = calc(T);
    if (R.errors.length) continue;
    const u = R.checks.filter(k => k.status !== 'info' && !k.warnOnly && k.fmt !== 'text').reduce((a, k) => Math.max(a, isFinite(k.ratio) ? k.ratio : 99), 0);
    if (u <= lim + 1e-9) return { ok: true, cls, util: u };
  }
  return { ok: false };
}

/* ---------------------------------------- generatory obciążeń */
function genSnow(o) {
  const z = SNOW_ZONES[o.zone] || SNOW_ZONES[2], A = num(o.alt, 200), sk = z.f(A);
  const a = num(o.slope, 0), mu = a <= 30 ? 0.8 : a < 60 ? 0.8 * (60 - a) / 30 : 0;
  const Ce = num(o.Ce, 1), Ct = num(o.Ct, 1), s = mu * Ce * Ct * sk, Ar = num(o.area, 0);
  return { sk, mu, Ce, Ct, s, Ar, N: s * Ar, txt: `${z.n}, A = ${fx(A, 0)} m n.p.m.: ${z.t} → s_k = ${fx(sk, 2)} kN/m²; μ₁ = ${fx(mu, 2)} (α = ${fx(a, 0)}°), C_e = ${fx(Ce, 1)}, C_t = ${fx(Ct, 1)} → s = ${fx(s, 3)} kN/m²` };
}
function genWind(o) {
  const z = WIND_ZONES[o.zone] || WIND_ZONES[1], A = num(o.alt, 200), vb0 = z.f(A), cdir = 1, cseas = 1, vb = cdir * cseas * vb0;
  const qb = 0.5 * 1.25 * vb * vb / 1000;
  const T = TERRAIN[o.terr] || TERRAIN.III, zz = Math.max(num(o.z, 5), T.zmin), ce = T.c * Math.pow(zz / 10, T.k);
  const qp = ce * qb, c = num(o.c, 1.0), w = num(o.width, 1);
  return { vb0, vb, qb, ce, qp, c, w, q: qp * c * w, txt: `${z.n}: v_{b,0} = ${fx(vb0, 1)} m/s, q_b = ${fx(qb, 3)} kN/m²; teren ${T.n}, z = ${fx(zz, 1)} m: c_e(z) = ${fx(T.c, 1)}·(z/10)^{${fx(T.k, 2)}} = ${fx(ce, 3)} → q_p = ${fx(qp, 3)} kN/m²; c = ${fx(c, 2)}, pasmo ${fx(w, 2)} m` };
}
function genArea(o) {
  const L = IMP_EC1[o.cat] || IMP_EC1.B, q = L.find(z => z.id === o.sub) || L[0];
  const qk = o.qk !== '' && o.qk !== undefined && isFinite(num(o.qk, NaN)) ? num(o.qk, 0) : q.q[1];
  const Ar = num(o.area, 0), nfl = Math.max(1, Math.round(num(o.nfl, 1)));
  // redukcja α_n dla słupów (6.3.1.2(11), wzór 6.6): α_n = (2 + (n − 2)·ψ0)/n dla n > 2 kondygnacji (kat. A–D)
  const psi0 = (PSI[o.cat] || PSI.B).p0;
  const an = o.red && nfl > 2 && ['A', 'B', 'C', 'D'].includes(o.cat) ? (2 + (nfl - 2) * psi0) / nfl : 1;
  return { q, qk, Ar, nfl, an, N: qk * Ar * nfl * an, txt: `${q.n}: q_k = ${fx(qk, 2)} kN/m² (zakres ${fx(q.q[0], 1)}–${fx(q.q[1], 1)}), A = ${fx(Ar, 2)} m²${nfl > 1 ? `, kondygnacji n = ${nfl}${an < 1 ? `, α_n = ${fx(an, 3)}` : ''}` : ''}` };
}

/* ---------------------------------------- eksport API */
const API = {
  MATS, MAT_GROUPS, KIND, KMOD, KDEF, DUR, DUR_KEYS, PSI, IMP_EC1, SNOW_ZONES, WIND_ZONES, TERRAIN, CONC, SUPP_BASE, SUPP_TOP, LTB_CASES, ETA_C1,
  DIMS_SOLID, DIMS_GL_B, DIMS_GL_H, DIMS_ROUND,
  defaultState, normalize, normItem, defDur, psiOf, matOf, sectionOf, khOf, kcOf, kcritOf, charDepth, rectProps, roundProps, spacedProps,
  calc, combine, autoDesign, autoClass, genSnow, genWind, genArea, stX, num, fx, parseList,
};
root.EC5 = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
