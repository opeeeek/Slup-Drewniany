/* SłupDrewniany – interfejs użytkownika */
(function () {
'use strict';
const E = window.EC5, G = window.SDG;
const U = window.SD = {};                  // współdzielone z report.js
let S = E.defaultState();
let R = null;
let filePath = '';
let dirty = false;
let rendered = {};

/* ------------------------------------------------------------ narzędzia */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (v, dp) => E.fx(v, dp === undefined ? 2 : dp);
const sym = s => esc(s).replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>')
  .replace(/_([0-9A-Za-ząćęłńóśźżφθλ]+(?:,[0-9A-Za-ząćęłńóśźż]+)*)/g, '<sub>$1</sub>');
const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setP = (o, p, v) => { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] === undefined || a[ks[i]] === null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; };
const parseNum = s => { if (typeof s === 'number') return s; const x = parseFloat(String(s).replace(',', '.').replace(/\s/g, '')); return isFinite(x) ? x : null; };
const showNum = v => (v === '' || v === null || v === undefined) ? '' : String(v).replace('.', ',');
const rng = (a, b, st) => { const r = []; for (let v = a; v <= b + 1e-9; v += st) r.push(+v.toFixed(3)); return r; };
Object.assign(U, { esc, fmt, sym, getP });
const DUR_O = E.DUR_KEYS.map(k => [k, `${E.DUR[k].n} (${E.DUR[k].d})`]);
const SC_O = [[1, 'klasa 1 – wnętrza ogrzewane (w ≤ 12%)'], [2, 'klasa 2 – zadaszone, nieogrzewane (w ≤ 20%)'], [3, 'klasa 3 – na zewnątrz, bez osłony']];
const isRect = s => s.geom.type === 'rect', isRound = s => s.geom.type === 'round', isSp = s => s.geom.type === 'spaced';
const matOpts = () => E.MAT_GROUPS.map(([gl, ids]) => [gl, ids.map(id => [id, id === 'user' ? 'Materiał własny (parametry podane)' : (E.MATS[id].name + (E.MATS[id].kind === 'lvl' ? ' – wg producenta' : ''))])]);
const matOptsOpt = () => [['', [['', 'jak słup']]], ...matOpts().filter(g => g[0] !== 'Inne')];
const dimList = () => (S.mat.cls !== 'user' && E.MATS[S.mat.cls] && E.MATS[S.mat.cls].kind === 'glulam' ? E.DIMS_GL_H : E.DIMS_SOLID);
const lefPh = p => () => R && R.buck && R.buck[p] && isFinite(R.buck[p].lefAuto) ? `auto (MES): ${fmt(R.buck[p].lefAuto / 1000, 3)} m` : 'auto (MES)';
const KIND_N = { perm: 'stałe', imp: 'użytkowe', snow: 'śnieg', wind: 'wiatr', other: 'inne zmienne', acc: 'wyjątkowe' };

/* ---------------------------------------------------------- definicja pól */
function suppItems(p) {
  const nm = p === 'z' ? 'płaszczyzna x–z (wyboczenie wzgl. osi y, wymiar h)' : 'płaszczyzna x–y (wyboczenie wzgl. osi z, wymiar b)';
  return [
    { t: 'sub', l: 'Warunki podparcia – ' + nm },
    { k: `supp.${p}.base`, t: 'sel', l: 'Podstawa', o: Object.entries(E.SUPP_BASE), wide: true, re: true },
    { k: `supp.${p}.kb`, t: 'num', l: 'Podatność utwierdzenia k_{φ}', u: 'kNm/rad', list: ['', 100, 200, 500, 1000, 2000, 5000], opt: true, min: 0, ph: 'sztywne', show: s => s.supp[p].base === 'fix' },
    { k: `supp.${p}.top`, t: 'sel', l: 'Głowica', o: Object.entries(E.SUPP_TOP), wide: true, re: true },
    { k: `supp.${p}.braces`, t: 'txt', l: 'Stężenia pośrednie – wysokości od podstawy [m]', ph: 'brak (np. 1,5; 3,0)', wide: true },
  ];
}
const GEO_ITEMS = [
  { k: 'geom.L', t: 'num', l: 'Wysokość słupa L', u: 'm', list: [2, 2.4, 2.5, 2.7, 2.8, 3, 3.2, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10], min: 0.2, max: 40 },
  { k: 'geom.type', t: 'sel', l: 'Przekrój', o: [['rect', 'prostokątny (lity, klejony, LVL)'], ['round', 'okrągły (drewno okrągłe)'], ['spaced', 'wielogałęziowy z przekładkami / nakładkami (zał. C.3)']], wide: true, re: true },
  { k: 'geom.b', t: 'num', l: 'Szerokość b (wzdłuż osi y)', u: 'mm', list: () => dimList(), min: 20, show: isRect },
  { k: 'geom.h', t: 'num', l: 'Wysokość h (wzdłuż osi z)', u: 'mm', list: () => dimList(), min: 20, show: isRect },
  { k: 'geom.d', t: 'num', l: 'Średnica d', u: 'mm', list: E.DIMS_ROUND, min: 40, show: isRound },
  { k: 'geom.sp.n', t: 'sel', l: 'Liczba gałęzi n', o: [[2, '2 gałęzie'], [3, '3 gałęzie'], [4, '4 gałęzie']], num: true, show: isSp },
  { k: 'geom.sp.t', t: 'num', l: 'Grubość gałęzi t (wzdłuż osi y)', u: 'mm', list: [32, 38, 45, 50, 63, 75, 80, 100, 120], min: 16, show: isSp },
  { k: 'geom.sp.w', t: 'num', l: 'Szerokość gałęzi w (wzdłuż osi z)', u: 'mm', list: [100, 120, 140, 160, 175, 180, 200, 225, 250], min: 30, show: isSp },
  { k: 'geom.sp.a', t: 'num', l: 'Prześwit między gałęziami a', u: 'mm', list: [32, 38, 45, 50, 63, 75, 100, 120, 150], min: 0, show: isSp },
  { k: 'geom.sp.conn', t: 'sel', l: 'Połączenie gałęzi', o: [['pack', 'przekładki (wkładki między gałęziami)'], ['gusset', 'nakładki (deski po bokach)']], wide: true, show: isSp, re: true },
  { k: 'geom.sp.fast', t: 'sel', l: 'Łączniki', o: s => s.geom.sp.conn === 'pack' ? [['glue', 'klej'], ['nail', 'gwoździe'], ['bolt', 'śruby z wkładkami']] : [['glue', 'klej'], ['nail', 'gwoździe']], wide: true, show: isSp },
  { k: 'geom.sp.nb', t: 'num', l: 'Liczba przedziałów (pól między przekładkami)', u: '', list: [3, 4, 5, 6, 8], min: 1, max: 30, show: isSp },
  { k: 'geom.sp.l2', t: 'num', l: 'Długość przekładki / nakładki l_{2}', u: 'mm', list: ['', 150, 200, 250, 300, 400], opt: true, ph: () => R && R.sp ? `auto ${fmt(R.sp.l2auto, 0)}` : 'auto', show: isSp },
  { t: 'hint', show: isSp, h: () => R && R.sp ? `l<sub>1</sub> = L/${R.sp.nb} = ${fmt(R.sp.l1, 0)} mm, λ<sub>1</sub> = ${fmt(R.sp.lam1, 1)}, η = ${fmt(R.sp.long.eta, 1)} / ${fmt(R.sp.short.eta, 1)} (stałe-długotrwałe / średnio-krótkotrwałe), λ<sub>ef</sub> = ${fmt(R.sp.long.lamEf, 1)}.` : '' },
  { k: 'geom.hole', t: 'num', l: 'Osłabienie przekroju otworami ΔA', u: '%', list: [0, 5, 10, 15, 20, 25], min: 0, max: 60 },
  { t: 'hint', ex: true, exT: 'Osie i oznaczenia', h: () => 'Oś x – oś słupa (od podstawy w górę). Wymiar <b>h</b> leży wzdłuż osi z, wymiar <b>b</b> wzdłuż osi y. Moment M<sub>y</sub> (wokół osi y) i siła H<sub>z</sub> działają w płaszczyźnie x–z; M<sub>z</sub> i H<sub>y</sub> – w płaszczyźnie x–y. Mimośród e<sub>z</sub> daje moment M<sub>y</sub> = N·e<sub>z</sub>. Osłabienie ΔA pomniejsza pole i wskaźniki przy rozciąganiu i zginaniu (ściskanie – otwory wypełnione łącznikami pomija się).' },
  ...suppItems('z'), ...suppItems('y'),
  { t: 'hint', h: () => hintSupp() },
];
function hintSupp() {
  if (!R || !R.buck) return '';
  return `Długości wyboczeniowe (MES – zagadnienie własne): l<sub>ef,y</sub> = <b>${fmt(R.buck.z.lefAuto / 1000, 3)} m</b> (β = ${fmt(R.buck.z.betaAuto, 3)}), l<sub>ef,z</sub> = <b>${fmt(R.buck.y.lefAuto / 1000, 3)} m</b> (β = ${fmt(R.buck.y.betaAuto, 3)}). Klasyczne β: przegub–przegub 1,0; utwierdzenie–swobodny 2,0; utwierdzenie–przegub 0,7; utwierdzenie–utwierdzenie 0,5; utwierdzenie–przesuwne 1,0.`;
}
const MAT_ITEMS = [
  { k: 'mat.cls', t: 'selg', l: 'Klasa drewna', o: matOpts, wide: true, re: true },
  { t: 'html', h: () => `<div class="row wide"><span></span><button class="btn sm" data-act="mattab">Parametry klas drewna…</button></div>` },
  { t: 'sub', l: 'Materiał własny', show: s => s.mat.cls === 'user' },
  { k: 'mat.user.kind', t: 'sel', l: 'Rodzaj materiału', o: Object.entries(E.KIND).map(([k, v]) => [k, v.name]), wide: true, show: s => s.mat.cls === 'user' },
  ...[['fmk', 'f_{m,k}', 'MPa'], ['ft0k', 'f_{t,0,k}', 'MPa'], ['fc0k', 'f_{c,0,k}', 'MPa'], ['fc90k', 'f_{c,90,k}', 'MPa'], ['fvk', 'f_{v,k}', 'MPa'], ['E0mean', 'E_{0,mean}', 'MPa'], ['E005', 'E_{0,05}', 'MPa'], ['Gmean', 'G_{mean}', 'MPa'], ['G005', 'G_{0,05}', 'MPa'], ['rhok', 'ρ_{k}', 'kg/m³'], ['rhomean', 'ρ_{mean}', 'kg/m³']]
    .map(([k, l, u]) => ({ k: 'mat.user.' + k, t: 'num', l, u, min: 0, show: s => s.mat.cls === 'user' })),
  { k: 'mat.sc', t: 'sel', l: 'Klasa użytkowania', o: SC_O, num: true, wide: true },
  { k: 'mat.gM', t: 'num', l: 'Współczynnik materiałowy γ_{M}', list: ['', 1.0, 1.2, 1.25, 1.3], opt: true, min: 1, ph: () => R && R.m ? `auto ${fmt(R.m.gMdef, 2)}` : 'auto' },
  { k: 'mat.gamma', t: 'num', l: 'Ciężar objętościowy γ', u: 'kN/m³', list: ['', 4.0, 4.2, 4.5, 5.0, 6.0, 7.0], opt: true, min: 0, ph: () => R && R.m ? `auto ${fmt(R.m.gammaDef, 2)}` : 'auto' },
  { k: 'mat.ksys', t: 'num', l: 'Wytrzymałość systemowa k_{sys}', list: [1.0, 1.1], min: 1, max: 1.2 },
  { k: 'mat.kcr', t: 'num', l: 'Współczynnik pęknięć k_{cr}', list: ['', 0.67, 1.0], opt: true, min: 0.3, max: 1, ph: () => R && R.m ? `auto ${fmt(R.m.kcrDef, 2)}` : 'auto' },
  { k: 'mat.kh', t: 'chk', l: 'Uwzględnij współczynnik wysokości k_{h} (3.2(3), 3.3(3), 3.4(3))' },
  { t: 'hint', h: () => matHint() },
];
function matHint() {
  if (!R || !R.m) return '';
  const m = R.m;
  return [`<b>${esc(m.name)}</b> (${esc(m.std)}): f<sub>c,0,k</sub> = ${fmt(m.fc0k, 1)}, f<sub>m,k</sub> = ${fmt(m.fmk, 1)}, f<sub>v,k</sub> = ${fmt(m.fvk, 1)} MPa, E<sub>0,05</sub> = ${fmt(m.E005, 0)} MPa, ρ<sub>k</sub> = ${fmt(m.rhok, 0)} kg/m³; γ<sub>M</sub> = ${fmt(m.gM, 2)}, k<sub>def</sub> = ${fmt(m.kdef, 2)}, β<sub>c</sub> = ${fmt(m.betaC, 1)}.`,
    `k<sub>mod</sub> (klasa użytkowania ${m.sc}): stałe ${fmt(m.kmodT.perm, 2)}, długotrwałe ${fmt(m.kmodT.long, 2)}, średniotrwałe ${fmt(m.kmodT.med, 2)}, krótkotrwałe ${fmt(m.kmodT.short, 2)}, chwilowe ${fmt(m.kmodT.inst, 2)}.`];
}
const COMB_ITEMS = [
  { k: 'loads.comb', t: 'sel', l: 'Kombinacja SGN (PN-EN 1990)', o: [['610ab', 'wzory 6.10a i 6.10b'], ['610', 'wzór 6.10']], wide: true },
  { k: 'loads.gG', t: 'num', l: 'γ_{G,sup}', list: [1.0, 1.15, 1.35], min: 0 },
  { k: 'loads.gGinf', t: 'num', l: 'γ_{G,inf} (stałe korzystne)', list: [0.9, 1.0], min: 0 },
  { k: 'loads.gQ', t: 'num', l: 'γ_{Q}', list: [0, 1.0, 1.5], min: 0 },
  { k: 'loads.xi', t: 'num', l: 'ξ (redukcja obc. stałych w 6.10b)', list: [0.85, 0.9, 1.0], min: 0, show: s => s.loads.comb === '610ab' },
  { k: 'loads.accPsi', t: 'sel', l: 'Wiodące zmienne w 6.11b (pożar, wyjątkowe)', o: [['psi1', 'ψ₁ – wartość częsta'], ['psi2', 'ψ₂ – wartość quasi-stała']], wide: true },
  { t: 'hint', h: () => combHint() },
];
function combHint() {
  if (!R || !R.combos) return '';
  const C = R.combos;
  return [`Wygenerowano kombinacji: SGN <b>${C.uls.length}</b>${C.acc.length ? `, wyjątkowych ${C.acc.length}` : ''}, SGU charakterystycznych ${C.chr.length}, quasi-stałych ${C.qp.length}${S.fire.R ? `, pożarowych ${C.fi.length}` : ''}.`,
    'Każde obciążenie zmienne kolejno jako wiodące; sprawdzane są także kombinacje z częścią obciążeń zmiennych (inne k<sub>mod</sub>) i z obciążeniami stałymi korzystnymi (γ<sub>G,inf</sub>). Obciążenia śniegiem i wiatrem z kilku pozycji są wariantami wykluczającymi się (np. różne kierunki wiatru).'];
}
const STAB_ITEMS = [
  { k: 'buck.method', t: 'sel', l: 'Metoda sprawdzenia stateczności', o: [['kc', 'metoda współczynnika wyboczeniowego k_c (6.3.2)'], ['II', 'analiza II rzędu z imperfekcjami (5.4.4)']], wide: true, re: true },
  { k: 'buck.both', t: 'chk', l: 'Oblicz kontrolnie drugą metodę (informacyjnie)', re: true },
  { k: 'buck.lefY', t: 'num', l: 'Długość wyboczeniowa l_{ef,y} (płaszczyzna x–z)', u: 'm', list: () => ['', ...[0.5, 0.7, 0.8, 1.0, 1.2, 1.5, 2.0].map(b => +(b * S.geom.L).toFixed(3))], opt: true, min: 0.05, ph: lefPh('z') },
  { k: 'buck.lefZ', t: 'num', l: 'Długość wyboczeniowa l_{ef,z} (płaszczyzna x–y)', u: 'm', list: () => ['', ...[0.5, 0.7, 0.8, 1.0, 1.2, 1.5, 2.0].map(b => +(b * S.geom.L).toFixed(3))], opt: true, min: 0.05, ph: lefPh('y') },
  { k: 'buck.ltb', t: 'sel', l: 'Zwichrzenie – przypadek (tab. 6.1)', o: () => [['auto', 'auto (wspornik 0,8·l, inne 1,0·l)'], ...Object.entries(E.LTB_CASES).map(([k, v]) => [k, `${v.n} – ${fmt(v.k, 1)}·l`])], wide: true, show: isRect },
  { k: 'buck.ltbL', t: 'num', l: 'Długość zwichrzenia l_{ef,m}', u: 'm', list: ['', 1, 1.5, 2, 2.5, 3, 4, 5, 6], opt: true, min: 0.05, ph: () => R && R.ltb ? `auto ${fmt(R.ltb.lef / 1000, 3)} m` : 'auto', show: isRect },
  { k: 'buck.slim', t: 'num', l: 'Smukłość graniczna λ_{lim} (zalecenie)', list: [0, 120, 150, 175, 200], min: 0 },
  { t: 'sub', l: 'Analiza II rzędu', show: s => s.buck.method === 'II' || s.buck.both },
  { k: 'buck.e0', t: 'num', l: 'Imperfekcja łukowa e_{0} = l_{ef}/…', list: [300, 400, 500], min: 100, show: s => s.buck.method === 'II' || s.buck.both },
  { k: 'buck.IIE', t: 'sel', l: 'Sztywność w analizie II rzędu', o: [['mean', 'E_0,mean/γ_M (2.4.1(2)P)'], ['05', 'E_0,05/γ_M (zachowawczo)']], wide: true, show: s => s.buck.method === 'II' || s.buck.both },
  { k: 'buck.IIint', t: 'sel', l: 'Warunek przekroju po analizie II rzędu', o: [['lin', 'liniowy: σc/fc + σm/fm ≤ 1 (zachowawczo)'], ['sq', 'jak 6.19/6.20: (σc/fc)² + σm/fm ≤ 1']], wide: true, show: s => s.buck.method === 'II' || s.buck.both },
  { t: 'hint', ex: true, exT: 'Objaśnienie metod', h: () => 'Metoda k<sub>c</sub> (6.3.2) – podstawowa metoda PN-EN 1995-1-1: imperfekcje i efekty II rzędu ujęte współczynnikiem k<sub>c</sub>. Analiza II rzędu (5.4.4, 2.4.1(2)P): MES z macierzą geometryczną, imperfekcja w kształcie postaci wyboczenia (e = l<sub>ef</sub>/400; przechyłka φ dla układów przesuwnych), w jednej płaszczyźnie naraz; sprawdzenie przekroju bez k<sub>c</sub>. Długości wyboczeniowe wyznaczane są MES dla rzeczywistych podpór, stężeń i podatności – można je nadpisać.' },
];
const CONN_ITEMS = [
  { k: 'conn.base', t: 'sel', l: 'Oparcie podstawy', o: [['steel', 'stopa stalowa na fundamencie betonowym'], ['sill', 'podwalina drewniana (docisk ⊥ do włókien)'], ['none', 'bez sprawdzenia oparcia']], wide: true, re: true },
  { k: 'conn.plate.a', t: 'num', l: 'Blacha podstawy – wymiar wzdłuż y', u: 'mm', list: [120, 150, 160, 180, 200, 220, 250, 300], min: 20, show: s => s.conn.base === 'steel' },
  { k: 'conn.plate.b', t: 'num', l: 'Blacha podstawy – wymiar wzdłuż z', u: 'mm', list: [120, 150, 160, 180, 200, 220, 250, 300], min: 20, show: s => s.conn.base === 'steel' },
  { k: 'conn.plate.conc', t: 'sel', l: 'Klasa betonu fundamentu', o: Object.keys(E.CONC).map(k => [k, k]), show: s => s.conn.base === 'steel' },
  { k: 'conn.plate.B1', t: 'num', l: 'Wymiar cokołu / fundamentu wzdłuż y', u: 'mm', list: [300, 400, 500, 600, 800, 1000], min: 20, show: s => s.conn.base === 'steel' },
  { k: 'conn.plate.B2', t: 'num', l: 'Wymiar cokołu / fundamentu wzdłuż z', u: 'mm', list: [300, 400, 500, 600, 800, 1000], min: 20, show: s => s.conn.base === 'steel' },
  { k: 'conn.sill.cls', t: 'selg', l: 'Klasa drewna podwaliny', o: matOptsOpt, wide: true, show: s => s.conn.base === 'sill' },
  { k: 'conn.sill.w', t: 'num', l: 'Szerokość podwaliny', u: 'mm', list: [100, 120, 140, 160, 180, 200], min: 20, show: s => s.conn.base === 'sill' },
  { k: 'conn.sill.dir', t: 'sel', l: 'Podwalina biegnie wzdłuż osi', o: [['y', 'y (wzdłuż wymiaru b)'], ['z', 'z (wzdłuż wymiaru h)']], show: s => s.conn.base === 'sill' },
  { k: 'conn.sill.end', t: 'num', l: 'Odległość krawędzi słupa od końca podwaliny', u: 'mm', list: ['', 0, 30, 50, 100], opt: true, min: 0, ph: 'ciągła', show: s => s.conn.base === 'sill' },
  { k: 'conn.sill.kc90', t: 'sel', l: 'k_{c,90}', o: [['auto', 'auto (6.1.5)'], ['1.0', '1,0'], ['1.25', '1,25'], ['1.5', '1,5'], ['1.75', '1,75']], show: s => s.conn.base === 'sill' },
  { k: 'conn.top', t: 'sel', l: 'Oparcie na głowicy', o: [['none', 'bez sprawdzenia'], ['beam', 'belka / oczep oparty na głowicy (docisk ⊥)']], wide: true, re: true },
  { k: 'conn.beam.cls', t: 'selg', l: 'Klasa drewna belki', o: matOptsOpt, wide: true, show: s => s.conn.top === 'beam' },
  { k: 'conn.beam.w', t: 'num', l: 'Szerokość belki', u: 'mm', list: [100, 120, 140, 160, 180, 200, 240], min: 20, show: s => s.conn.top === 'beam' },
  { k: 'conn.beam.dir', t: 'sel', l: 'Belka biegnie wzdłuż osi', o: [['y', 'y (wzdłuż wymiaru b)'], ['z', 'z (wzdłuż wymiaru h)']], show: s => s.conn.top === 'beam' },
  { k: 'conn.beam.end', t: 'num', l: 'Wysięg belki poza krawędź słupa', u: 'mm', list: ['', 0, 30, 50, 100], opt: true, min: 0, ph: 'ciągła', show: s => s.conn.top === 'beam' },
  { k: 'conn.beam.kc90', t: 'sel', l: 'k_{c,90}', o: [['auto', 'auto (6.1.5)'], ['1.0', '1,0'], ['1.25', '1,25'], ['1.5', '1,5'], ['1.75', '1,75']], show: s => s.conn.top === 'beam' },
  { t: 'hint', h: () => connHint() },
];
function connHint() {
  if (!R || !R.conn) return '';
  const c = R.conn, o = [];
  if (c.Nb.v > -Infinity) o.push(`N<sub>Ed,max</sub> w podstawie = <b>${fmt(c.Nb.v / 1e3, 1)} kN</b>`);
  if (c.Nbmin.v < 0) o.push(`siła odrywająca N<sub>t,Ed</sub> = <b>${fmt(-c.Nbmin.v / 1e3, 1)} kN</b>`);
  if (c.Vb.v > 0) o.push(`V<sub>Ed</sub> = ${fmt(c.Vb.v / 1e3, 2)} kN`);
  if (c.Mb.v > 0) o.push(`M<sub>Ed</sub> = ${fmt(c.Mb.v / 1e6, 2)} kNm`);
  return 'Siły do zaprojektowania połączenia podstawy: ' + o.join(', ') + '.';
}
const SLS_ITEMS = [
  { k: 'sls.on', t: 'chk', l: 'Sprawdzaj przemieszczenia poziome (SGU)', re: true },
  { k: 'sls.limI', t: 'num', l: 'Granica u_{inst}: l/…', list: [150, 200, 250, 300, 400, 500], min: 50, show: s => s.sls.on },
  { k: 'sls.limF', t: 'num', l: 'Granica u_{fin}: l/…', list: [100, 150, 200, 250, 300], min: 50, show: s => s.sls.on },
  { t: 'hint', h: () => 'l – odcinek między podparciami bocznymi (dla wspornika: od ostatniego podparcia do głowicy). u<sub>fin</sub> z pełzaniem wg 2.3.2.2 (k<sub>def</sub>). PN-EN 1995-1-1 nie podaje granic dla przemieszczeń poziomych słupów – wartości uzgadnia się z inwestorem.' },
];
const FIRE_ITEMS = [
  { k: 'fire.R', t: 'sel', l: 'Wymagana odporność ogniowa', o: [[0, 'nie sprawdzać'], [15, 'R15'], [30, 'R30'], [45, 'R45'], [60, 'R60'], [90, 'R90'], [120, 'R120']], num: true, re: true },
  { t: 'faces', show: s => s.fire.R > 0 },
  { k: 'fire.prot', t: 'sel', l: 'Ochrona przeciwpożarowa', o: [['none', 'brak (drewno nieosłonięte)'], ['gk', 'płyty g-k typu A / H'], ['gf', 'płyty g-k typu F'], ['wood', 'okładzina drewnopochodna'], ['manual', 't_ch i t_f podane ręcznie']], wide: true, re: true, show: s => s.fire.R > 0 },
  { k: 'fire.hp', t: 'num', l: 'Grubość okładziny h_{p}', u: 'mm', list: [12.5, 15, 18, 25, 2 * 12.5, 2 * 15], min: 1, show: s => s.fire.R > 0 && s.fire.prot !== 'none' && s.fire.prot !== 'manual' },
  { k: 'fire.tch', t: 'num', l: 'Początek zwęglania t_{ch}', u: 'min', list: ['', 10, 15, 20, 25, 30], opt: true, min: 0, ph: () => R && R.fire ? `auto ${fmt(R.fire.ch.tch, 1)}` : 'auto', show: s => s.fire.R > 0 && s.fire.prot !== 'none' },
  { k: 'fire.tf', t: 'num', l: 'Czas odpadnięcia okładziny t_{f}', u: 'min', list: ['', 20, 30, 45, 60], opt: true, min: 0, ph: () => R && R.fire ? `auto ${fmt(R.fire.ch.tf, 1)}` : 'auto', show: s => s.fire.R > 0 && (s.fire.prot === 'gf' || s.fire.prot === 'manual') },
  { k: 'fire.mode', t: 'sel', l: 'Efekty oddziaływań w pożarze', o: [['comb', 'kombinacja wyjątkowa 6.11b'], ['eta', 'E_d,fi = η_fi·E_d (2.4.2)']], wide: true, show: s => s.fire.R > 0 },
  { k: 'fire.eta', t: 'num', l: 'η_{fi}', list: [0.6, 0.65, 0.7], min: 0.1, max: 1, show: s => s.fire.R > 0 && s.fire.mode === 'eta' },
  { k: 'fire.lef', t: 'num', l: 'Długość wyboczeniowa w pożarze', u: 'm', list: ['', 1, 1.5, 2, 2.5, 3], opt: true, min: 0.05, ph: '= l_ef', show: s => s.fire.R > 0 },
  { t: 'hint', show: s => s.fire.R > 0, h: () => R && R.fire ? `${sym(R.fire.ch.txt)}; d<sub>ef</sub> = d<sub>char,n</sub> + k<sub>0</sub>·d<sub>0</sub> = ${fmt(R.fire.ch.dchar, 1)} + ${fmt(R.fire.ch.k0, 2)}·${fmt(R.fire.ch.d0, 0)} = <b>${fmt(R.fire.def, 1)} mm</b>; ${sym(R.fire.desc)}.` : '' },
];
const COEF_ITEMS = [
  { k: 'coef.gMsolid', t: 'num', l: 'γ_{M} – drewno lite', list: [1.3], min: 1 },
  { k: 'coef.gMgl', t: 'num', l: 'γ_{M} – drewno klejone', list: [1.25], min: 1 },
  { k: 'coef.gMlvl', t: 'num', l: 'γ_{M} – LVL', list: [1.2], min: 1 },
  { k: 'coef.gMA', t: 'num', l: 'γ_{M} – sytuacja wyjątkowa', list: [1.0], min: 1 },
  { k: 'coef.gMfi', t: 'num', l: 'γ_{M,fi} – pożar', list: [1.0], min: 1 },
  { k: 'coef.kf1', t: 'num', l: 'k_{f,1} – stężenia, drewno lite (9.2.5.2)', list: [50, 60], min: 1 },
  { k: 'coef.kf2', t: 'num', l: 'k_{f,2} – stężenia, klejone / LVL', list: [80, 100], min: 1 },
  { k: 'coef.phi0', t: 'num', l: 'Przechyłka φ₀ (5.4.4)', list: [0.005, 0.0033], min: 0 },
  { k: 'coef.d0', t: 'num', l: 'd_{0} – warstwa zerowej wytrzymałości (pożar)', u: 'mm', list: [7], min: 0 },
  { k: 'coef.gc', t: 'num', l: 'γ_{c} – beton (docisk, EC2)', list: [1.4, 1.5], min: 1 },
  { k: 'coef.acc', t: 'num', l: 'α_{cc} – beton', list: [0.85, 1.0], min: 0.5 },
];
const GROUPS = [
  { id: 'geo', title: 'Geometria i schemat statyczny', items: GEO_ITEMS },
  { id: 'mat', title: 'Materiał', items: MAT_ITEMS },
  { id: 'load', title: 'Obciążenia (wartości charakterystyczne)', items: [{ k: 'loads.sw', t: 'chk', l: 'Ciężar własny słupa (G0)' }, { t: 'loads' }, { t: 'hint', h: () => 'Kliknij pozycję, aby ją zmienić. Siła N dodatnia – ściskająca (w dół). Pozycje „±” liczone są w obu kierunkach poziomych. W oknie obciążenia są generatory: z powierzchni zbierania (PN-EN 1991-1-1), śnieg (PN-EN 1991-1-3) i wiatr (PN-EN 1991-1-4, ZK PL).' }] },
  { id: 'comb', title: 'Kombinacje (PN-EN 1990)', items: COMB_ITEMS },
  { id: 'stab', title: 'Stateczność', items: STAB_ITEMS },
  { id: 'conn', title: 'Oparcie i połączenia', items: CONN_ITEMS },
  { id: 'sls', title: 'SGU – przemieszczenia', items: SLS_ITEMS },
  { id: 'fire', title: 'Odporność ogniowa (PN-EN 1995-1-2)', items: FIRE_ITEMS },
  { id: 'coef', title: 'Współczynniki (Załącznik krajowy PL)', closed: true, items: COEF_ITEMS },
];

/* ------------------------------------------------------- render formularza */
const optionsOf = f => (typeof f.o === 'function' ? f.o(S) : f.o);
const listOf = f => (typeof f.list === 'function' ? f.list(S) : f.list);
const phOf = f => (typeof f.ph === 'function' ? f.ph(S) : f.ph || '');
function hintHTML(f) {
  let h = f.h(S); if (!h) return '';
  let more = '';
  if (Array.isArray(h)) { more = h[1]; h = h[0]; }
  if (f.ex) return `<details class="ex"><summary>${esc(f.exT || 'Objaśnienie')}</summary><p class="hint">${h}${more ? ' ' + more : ''}</p></details>`;
  return `<p class="hint${f.keep ? ' keep' : ''}">${h}</p>${more ? `<details class="ex"><summary>Objaśnienie</summary><p class="hint">${more}</p></details>` : ''}`;
}
let fid = 0;
function fieldsHTML(items) {
  let o = '';
  items.forEach(f => {
    const vis = !f.show || f.show(S);
    const hide = vis ? '' : ' hidden';
    if (f.t === 'sub') { o += `<div class="sub"${hide} data-show="${fid}">${sym(f.l)}</div>`; f._id = fid++; return; }
    if (f.t === 'hint') { o += `<div class="hintw"${hide} data-hint="${fid}">${vis ? hintHTML(f) : ''}</div>`; f._id = fid++; return; }
    if (f.t === 'html') { o += `<div${hide} data-html="${fid}">${vis ? f.h(S) : ''}</div>`; f._id = fid++; return; }
    if (f.t === 'loads') { o += `<div data-loads="1">${loadsHTML()}</div>`; return; }
    if (f.t === 'faces') { o += `<div class="row wide"${hide} data-show="${fid}"><label>Strony ogrzewane (pożar)</label><div class="chkrow">${[['t', 'góra (+z)'], ['b', 'dół (−z)'], ['l', 'lewa (−y)'], ['r', 'prawa (+y)']].map(([k, l]) => `<label class="chk"><input type="checkbox" data-k="fire.faces.${k}" data-t="chk"${S.fire.faces[k] ? ' checked' : ''}>${l}</label>`).join('')}</div></div>`; f._id = fid++; return; }
    const v = getP(S, f.k), id = 'f' + (fid++); f._id = id;
    const lab = `<label for="${id}">${sym(f.l)}</label>`;
    if (f.t === 'chk') { o += `<label class="chk"${hide} data-show="${id}"><input type="checkbox" id="${id}" data-k="${f.k}" data-t="chk"${v ? ' checked' : ''}${f.re ? ' data-re="1"' : ''}>${sym(f.l)}</label>`; return; }
    if (f.t === 'sel' || f.t === 'selg') {
      let opts;
      if (f.t === 'selg') opts = optionsOf(f).map(([gl, arr]) => `<optgroup label="${esc(gl)}">${arr.map(([k, l]) => `<option value="${esc(k)}"${String(k) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</optgroup>`).join('');
      else opts = optionsOf(f).map(([k, l]) => `<option value="${esc(k)}"${String(k) === String(v) ? ' selected' : ''}>${sym(l)}</option>`).join('');
      o += `<div class="row ${f.wide ? 'wide' : ''}"${hide} data-show="${id}">${lab}<select id="${id}" data-k="${f.k}" data-t="sel"${f.num ? ' data-num="1"' : ''}${f.re ? ' data-re="1"' : ''}>${opts}</select>${f.wide ? '' : '<span></span>'}</div>`;
      return;
    }
    if (f.t === 'txt') { o += `<div class="row ${f.wide ? 'wide' : ''}"${hide} data-show="${id}">${lab}<input class="txt" id="${id}" data-k="${f.k}" data-t="txt" value="${esc(v === undefined ? '' : v)}" placeholder="${esc(phOf(f))}" spellcheck="false">${f.wide ? '' : '<span></span>'}</div>`; return; }
    // num
    const lst = listOf(f);
    o += `<div class="row"${hide} data-show="${id}">${lab}<div class="combo"><input id="${id}" data-k="${f.k}" data-t="num" inputmode="decimal" value="${esc(showNum(v))}" placeholder="${esc(phOf(f))}"${f.opt ? ' data-opt="1"' : ''}${f.min !== undefined ? ` data-min="${f.min}"` : ''}${f.max !== undefined ? ` data-max="${f.max}"` : ''}${f.re ? ' data-re="1"' : ''}>${lst && lst.length ? `<button type="button" tabindex="-1" data-list="${id}" aria-label="lista wartości">▾</button>` : ''}</div><span class="unit">${esc(f.u || '')}</span></div>`;
  });
  return o;
}
const FIELD_MAP = {};
function indexFields(items) { items.forEach(f => { if (f._id !== undefined) FIELD_MAP[f._id] = f; }); }
function renderInputs() {
  const host = $('#inputs');
  const open = {}; $$('details.grp', host).forEach(d => { open[d.dataset.g] = d.open; });
  fid = 0;
  let o = '';
  GROUPS.forEach(g => {
    const isOpen = open[g.id] !== undefined ? open[g.id] : !g.closed;
    o += `<details class="grp" data-g="${g.id}"${isOpen ? ' open' : ''}><summary>${esc(g.title)}</summary><div class="fields">${fieldsHTML(g.items)}</div></details>`;
  });
  host.innerHTML = o;
  GROUPS.forEach(g => indexFields(g.items));
}
// odświeżenie podpowiedzi, widoczności i podpowiedzi „auto” bez przebudowy formularza (zachowuje fokus)
function refreshHints(root, items) {
  root = root || $('#inputs');
  const all = items || GROUPS.reduce((a, g) => a.concat(g.items), []);
  all.forEach(f => {
    if (f._id === undefined) return;
    const vis = !f.show || f.show(S);
    if (f.t === 'hint') { const el = $(`[data-hint="${f._id}"]`, root); if (!el) return; el.hidden = !vis; const h = vis ? hintHTML(f) : ''; if (el.innerHTML !== h) { const op = $('details', el); const wasOpen = op && op.open; el.innerHTML = h; if (wasOpen && $('details', el)) $('details', el).open = true; } return; }
    if (f.t === 'html') { const el = $(`[data-html="${f._id}"]`, root); if (!el) return; el.hidden = !vis; if (vis) el.innerHTML = f.h(S); return; }
    const row = $(`[data-show="${f._id}"]`, root); if (row) row.hidden = !vis;
    if (f.t === 'num' || f.t === 'txt') { const inp = $('#' + f._id, root); if (inp && f.ph) inp.placeholder = phOf(f); if (inp && document.activeElement !== inp && f.k) { const v = showNum(getP(S, f.k)); if (inp.value !== v && !inp.classList.contains('bad')) inp.value = v; } }
  });
  const ld = $('[data-loads]', root); if (ld) ld.innerHTML = loadsHTML();
}
function bindInputs(host, items, after) {
  const commit = (el, rerender) => {
    const k = el.dataset.k, t = el.dataset.t;
    if (t === 'chk') setP(S, k, el.checked);
    else if (t === 'sel') setP(S, k, el.dataset.num ? +el.value : el.value);
    else if (t === 'txt') setP(S, k, el.value);
    else {
      const raw = el.value.trim();
      if (raw === '' && el.dataset.opt) { setP(S, k, ''); el.classList.remove('bad'); }
      else {
        const x = parseNum(raw);
        const mn = el.dataset.min !== undefined ? +el.dataset.min : -Infinity, mx = el.dataset.max !== undefined ? +el.dataset.max : Infinity;
        if (x === null || x < mn || x > mx) { el.classList.add('bad'); el.title = x === null ? 'Wpisz liczbę' : `Zakres: ${mn > -Infinity ? fmt(mn, 2) : '…'} ÷ ${mx < Infinity ? fmt(mx, 2) : '…'}`; return; }
        el.classList.remove('bad'); el.title = ''; setP(S, k, x);
      }
    }
    changed(rerender || !!el.dataset.re, after);
  };
  host.addEventListener('change', e => { const el = e.target.closest('[data-k]'); if (!el || !host.contains(el)) return; commit(el); });
  host.addEventListener('keydown', e => { const el = e.target.closest('input[data-t="num"],input[data-t="txt"]'); if (el && e.key === 'Enter') { e.preventDefault(); commit(el); el.select && el.select(); } });
  host.addEventListener('input', e => { const el = e.target.closest('input[data-t="num"]'); if (!el) return; const raw = el.value.trim(); el.classList.toggle('bad', !(raw === '' ? !!el.dataset.opt : parseNum(raw) !== null)); });
  host.addEventListener('click', e => {
    const b = e.target.closest('[data-list]'); if (b) { openList(b); return; }
    const a = e.target.closest('[data-act]'); if (a && host.contains(a)) { act(a.dataset.act, a); return; }
    const li = e.target.closest('[data-ld]'); if (li) { loadPopup(+li.dataset.ld); return; }
    const ad = e.target.closest('[data-add]'); if (ad) { addLoad(ad.dataset.add); return; }
  });
  void items;
}
// lista wartości (combo)
let popFor = null;
function openList(btn) {
  const inp = $('#' + btn.dataset.list);
  const f = Object.values(FIELD_MAP).find(q => q._id === btn.dataset.list) || POP_FIELDS[btn.dataset.list];
  const pop = $('#pop');
  if (popFor === inp && pop.style.display === 'block') { closeList(); return; }
  const lst = f ? listOf(f) : [];
  pop.innerHTML = lst.map(v => `<div data-v="${v}" class="${String(v) === String(getP(S, inp.dataset.k)) ? 'cur' : ''}">${v === '' ? '<i>' + esc(phOf(f) || 'auto') + '</i>' : esc(showNum(v))}</div>`).join('');
  const r = inp.getBoundingClientRect();
  pop.style.display = 'block'; pop.style.minWidth = (r.width + 24) + 'px';
  const h = Math.min(260, pop.scrollHeight);
  pop.style.left = Math.max(4, Math.min(window.innerWidth - pop.offsetWidth - 4, r.left)) + 'px';
  pop.style.top = (r.bottom + h + 4 > window.innerHeight ? Math.max(4, r.top - h - 2) : r.bottom + 2) + 'px';
  popFor = inp;
  pop.onclick = e => { const d = e.target.closest('[data-v]'); if (!d) return; inp.value = showNum(d.dataset.v); inp.dispatchEvent(new Event('change', { bubbles: true })); closeList(); };
}
function closeList() { $('#pop').style.display = 'none'; popFor = null; }
document.addEventListener('mousedown', e => { if (!e.target.closest('#pop') && !e.target.closest('[data-list]')) closeList(); });
const POP_FIELDS = {};

/* ------------------------------------------------------------ obciążenia */
const KINDS = [['perm', 'Obciążenia stałe G'], ['imp', 'Obciążenia użytkowe Q (PN-EN 1991-1-1)'], ['snow', 'Śnieg S (PN-EN 1991-1-3)'], ['wind', 'Wiatr W (PN-EN 1991-1-4)'], ['other', 'Inne obciążenia zmienne (ψ podane)'], ['acc', 'Oddziaływania wyjątkowe A_d']];
function itemDesc(it) {
  const p = [];
  if (it.N) p.push(`N = ${fmt(it.N, 2)} kN${it.ez ? `, e<sub>z</sub> = ${fmt(it.ez, 0)}` : ''}${it.ey ? `, e<sub>y</sub> = ${fmt(it.ey, 0)}` : ''}${it.ez || it.ey ? ' mm' : ''}`);
  if (it.Hz) p.push(`H<sub>z</sub> = ${fmt(it.Hz, 2)} kN`); if (it.Hy) p.push(`H<sub>y</sub> = ${fmt(it.Hy, 2)} kN`);
  if (it.My) p.push(`M<sub>y</sub> = ${fmt(it.My, 2)} kNm`); if (it.Mz) p.push(`M<sub>z</sub> = ${fmt(it.Mz, 2)} kNm`);
  if (it.qz) p.push(`q<sub>z</sub> = ${fmt(it.qz, 2)} kN/m`); if (it.qy) p.push(`q<sub>y</sub> = ${fmt(it.qy, 2)} kN/m`);
  if (it.pts && it.pts.length) p.push(`siły na wysokości: ${it.pts.length}`);
  return (p.join('; ') || '<i>brak wartości</i>') + (it.rev ? ' (±)' : '');
}
function loadsHTML() {
  const items = S.loads.items;
  let o = '<div class="ldl">';
  KINDS.forEach(([k, t]) => {
    const list = items.map((it, i) => ({ it, i })).filter(q => q.it.kind === k);
    o += `<h5>${sym(t)}<span class="sp"></span><button class="addb" data-add="${k}" title="Dodaj obciążenie">+ dodaj</button></h5>`;
    list.forEach(({ it, i }) => {
      const ps = E.psiOf(it);
      o += `<div class="ldi" data-ld="${i}" title="Kliknij, aby zmienić"><span class="id">${esc(G.loadId(S, i))}</span><span><span class="nm">${esc(it.name || KIND_N[k])}</span> <span class="ds">${itemDesc(it)}</span></span><span class="du">${esc(E.DUR[it.dur].n)}${k !== 'perm' && k !== 'acc' ? `<br>ψ₀ ${fmt(ps.p0, 1)} · ψ₂ ${fmt(ps.p2, 1)}` : ''}</span></div>`;
    });
  });
  return o + '</div>';
}
function addLoad(kind) {
  if (S.loads.items.length >= 40) { toast('Maksymalnie 40 obciążeń.'); return; }
  const n = S.loads.items.filter(q => q.kind === kind).length + 1;
  const base = { perm: { name: `Stałe ${n}`, N: 10 }, imp: { name: `Użytkowe ${n}`, cat: 'B', N: 10 }, snow: { name: n > 1 ? `Śnieg ${n}` : 'Śnieg', N: 10 }, wind: { name: n > 1 ? `Wiatr ${n}` : 'Wiatr', qz: 0.5, rev: true }, other: { name: `Inne ${n}`, N: 5, p0: 0.7, p1: 0.5, p2: 0.3 }, acc: { name: `Wyjątkowe ${n}`, Hz: 10 } }[kind];
  S.loads.items.push(E.normItem(Object.assign({ kind }, base)));
  changed(false);
  loadPopup(S.loads.items.length - 1);
}
function loadPopup(i) {
  const it = S.loads.items[i]; if (!it) return;
  const P = `loads.items.${i}.`;
  const k = it.kind;
  const items = [
    { k: P + 'name', t: 'txt', l: 'Nazwa', wide: true },
    { k: P + 'cat', t: 'sel', l: 'Kategoria (PN-EN 1991-1-1)', o: Object.entries(E.PSI).filter(([c]) => 'ABCDEFGH'.includes(c)).map(([c, v]) => [c, v.name]), wide: true, show: () => k === 'imp', re: true },
    { k: P + 'alt', t: 'sel', l: 'Położenie', o: [['low', 'H ≤ 1000 m n.p.m. (ψ₀ = 0,5; ψ₂ = 0)'], ['high', 'H > 1000 m n.p.m. (ψ₀ = 0,7; ψ₂ = 0,2)']], wide: true, show: () => k === 'snow' },
    { k: P + 'p0', t: 'num', l: 'ψ_{0}', list: [0, 0.5, 0.6, 0.7, 1.0], min: 0, max: 1, show: () => k === 'other' },
    { k: P + 'p1', t: 'num', l: 'ψ_{1}', list: [0, 0.2, 0.5, 0.7, 0.9], min: 0, max: 1, show: () => k === 'other' },
    { k: P + 'p2', t: 'num', l: 'ψ_{2}', list: [0, 0.2, 0.3, 0.6, 0.8], min: 0, max: 1, show: () => k === 'other' },
    { k: P + 'dur', t: 'sel', l: 'Klasa trwania obciążenia', o: DUR_O, wide: true },
    { t: 'hint', h: () => `Domyślnie: ${esc(E.DUR[E.defDur(it)].n)} – ${k === 'snow' ? 'śnieg wg ZK PL krótkotrwały' : k === 'wind' ? 'wiatr – chwilowe' : k === 'imp' ? 'obciążenie użytkowe stropów – średniotrwałe, magazyny – długotrwałe' : k === 'perm' ? 'obciążenia stałe' : k === 'acc' ? 'oddziaływania wyjątkowe – chwilowe' : 'wg rodzaju obciążenia'}. Klasa trwania decyduje o k<sub>mod</sub>.` },
    { t: 'sub', l: 'Siły w głowicy słupa (x = L)' },
    { k: P + 'N', t: 'num', l: 'Siła osiowa N (+ ściskanie)', u: 'kN', list: [-50, -20, 0, 5, 10, 20, 30, 50, 75, 100, 150, 200] },
    { k: P + 'ez', t: 'num', l: 'Mimośród e_{z} (→ M_{y} = N·e_{z})', u: 'mm', list: [0, 10, 20, 30, 50, 70, 100] },
    { k: P + 'ey', t: 'num', l: 'Mimośród e_{y} (→ M_{z} = N·e_{y})', u: 'mm', list: [0, 10, 20, 30, 50, 70, 100] },
    { k: P + 'Hz', t: 'num', l: 'Siła pozioma H_{z}', u: 'kN', list: [0, 0.5, 1, 2, 3, 5, 10] },
    { k: P + 'Hy', t: 'num', l: 'Siła pozioma H_{y}', u: 'kN', list: [0, 0.5, 1, 2, 3, 5, 10] },
    { k: P + 'My', t: 'num', l: 'Moment M_{y} w głowicy', u: 'kNm', list: [0, 0.5, 1, 2, 5] },
    { k: P + 'Mz', t: 'num', l: 'Moment M_{z} w głowicy', u: 'kNm', list: [0, 0.5, 1, 2, 5] },
    { t: 'sub', l: 'Obciążenie poziome rozłożone wzdłuż wysokości' },
    { k: P + 'qz', t: 'num', l: 'q_{z} (działa w kierunku z)', u: 'kN/m', list: [0, 0.2, 0.3, 0.5, 0.8, 1.0, 1.5, 2.0] },
    { k: P + 'qy', t: 'num', l: 'q_{y} (działa w kierunku y)', u: 'kN/m', list: [0, 0.2, 0.3, 0.5, 0.8, 1.0, 1.5, 2.0] },
    { k: P + 'qa', t: 'num', l: 'Zakres obciążenia rozłożonego – od', u: 'm', list: ['', 0, 0.5, 1, 1.5, 2], opt: true, min: 0, ph: '0' },
    { k: P + 'qb', t: 'num', l: '– do', u: 'm', list: ['', 1, 1.5, 2, 2.5, 3], opt: true, min: 0, ph: '= L' },
    { k: P + 'rev', t: 'chk', l: 'Działanie poziome w obu kierunkach (±) – dwa warianty wykluczające się', show: () => k !== 'perm' },
  ];
  const m = $('#modal');
  const render = () => {
    fid = 1000;
    const it2 = S.loads.items[i];
    if (!it2) { m.style.display = 'none'; return; }
    m.innerHTML = `<div class="dlg mid"><h3>${esc(G.loadId(S, i))} – ${esc(KIND_N[k])}: ${esc(it2.name)}</h3><div class="fields">${fieldsHTML(items)}</div>
      <div class="sub">Siły skupione na wysokości słupa (np. belka stropu pośredniego)</div>${ptsHTML(it2)}
      ${genHTML(it2)}
      <div class="dbtn"><button class="btn dng" id="ldDel">Usuń</button><button class="btn" id="ldDup">Duplikuj</button><span class="sp"></span><button class="btn pri" id="ldOk">Zamknij</button></div></div>`;
    items.forEach(f => { if (f._id !== undefined) POP_FIELDS[f._id] = f; });
    m.style.display = 'flex';
    const dlg = $('.dlg', m);
    bindInputs(dlg, items, () => { refreshHints(dlg, items); const h = $('h3', dlg); if (h) h.textContent = `${G.loadId(S, i)} – ${KIND_N[k]}: ${S.loads.items[i].name}`; const ta = $('#ptsBox', dlg); if (ta && !ta.contains(document.activeElement)) ta.outerHTML = ptsHTML(S.loads.items[i]); });
    $('#ldOk', m).onclick = () => { m.style.display = 'none'; };
    $('#ldDel', m).onclick = async () => { if (!(await ask(`Usunąć obciążenie „${esc(it2.name)}”?`, 'Usuń', true))) { render(); return; } S.loads.items.splice(i, 1); m.style.display = 'none'; changed(false); };
    $('#ldDup', m).onclick = () => { const c = JSON.parse(JSON.stringify(S.loads.items[i])); c.name += ' (kopia)'; S.loads.items.push(E.normItem(c)); changed(false); loadPopup(S.loads.items.length - 1); };
    dlg.addEventListener('click', e => {
      const a = e.target.closest('[data-pt]'); if (a) {
        const it3 = S.loads.items[i];
        if (a.dataset.pt === 'add') it3.pts.push({ x: +(S.geom.L / 2).toFixed(2), N: 10, ey: 0, ez: 0, Hy: 0, Hz: 0 });
        else it3.pts.splice(+a.dataset.pt, 1);
        changed(false); render(); return;
      }
      const gb = e.target.closest('[data-gen]'); if (gb) { applyGen(i, gb.dataset.gen, dlg); render(); }
    });
    dlg.addEventListener('change', e => {
      const p = e.target.closest('[data-ptk]'); if (p) { const [r, f] = p.dataset.ptk.split('.'); const x = parseNum(p.value); if (x === null) { p.classList.add('bad'); return; } S.loads.items[i].pts[+r][f] = x; changed(false); }
      const gi = e.target.closest('[data-gk]'); if (gi) { const it3 = S.loads.items[i]; it3.gen = it3.gen || {}; it3.gen[gi.dataset.gk] = gi.tagName === 'SELECT' ? gi.value : (gi.type === 'checkbox' ? gi.checked : gi.value); const res = $('#genRes', dlg); if (res) res.innerHTML = genPreview(it3); }
    });
  };
  render();
}
function ptsHTML(it) {
  const rows = it.pts.map((p, r) => `<tr>${['x', 'N', 'ez', 'ey', 'Hz', 'Hy'].map(f => `<td><input data-ptk="${r}.${f}" value="${esc(showNum(p[f]))}" inputmode="decimal"></td>`).join('')}<td><button class="x" data-pt="${r}" title="Usuń">×</button></td></tr>`).join('');
  return `<div id="ptsBox"><table class="ptab"><thead><tr><th>x [m]</th><th>N [kN]</th><th>e<sub>z</sub> [mm]</th><th>e<sub>y</sub> [mm]</th><th>H<sub>z</sub> [kN]</th><th>H<sub>y</sub> [kN]</th><th></th></tr></thead><tbody>${rows}</tbody></table><button class="addb" data-pt="add">+ siła na wysokości x</button></div>`;
}
// generatory obciążeń
function genDefaults(it) {
  const g = it.gen || {};
  if (it.kind === 'snow') return Object.assign({ zone: '2', alt: '200', slope: '10', area: '10', Ce: '1.0', Ct: '1.0' }, g);
  if (it.kind === 'wind') return Object.assign({ zone: '1', alt: '200', terr: 'III', z: String(S.geom.L), c: '1.1', width: '3.0', dir: 'qz' }, g);
  return Object.assign({ cat: it.cat || 'B', sub: it.sub || '', qk: '', area: '10', nfl: '1', red: false, gk: '1.5' }, g);
}
function genPreview(it) {
  const g = genDefaults(it);
  try {
    if (it.kind === 'snow') { const r = E.genSnow(g); return `${sym(r.txt)} → <b>N = s·A = ${fmt(r.s, 3)}·${fmt(r.Ar, 2)} = ${fmt(r.N, 2)} kN</b>`; }
    if (it.kind === 'wind') { const r = E.genWind(g); return `${sym(r.txt)} → <b>${g.dir === 'qy' ? 'q<sub>y</sub>' : 'q<sub>z</sub>'} = q<sub>p</sub>·c·b = ${fmt(r.q, 3)} kN/m</b>`; }
    if (it.kind === 'imp') { const r = E.genArea(Object.assign({}, g, { cat: it.cat })); return `${sym(r.txt)} → <b>N = ${fmt(r.N, 2)} kN</b>`; }
    const gk = E.num(g.gk, 0), A = E.num(g.area, 0), n = Math.max(1, Math.round(E.num(g.nfl, 1)));
    return `${fmt(gk, 2)} kN/m² × ${fmt(A, 2)} m²${n > 1 ? ` × ${n}` : ''} → <b>N = ${fmt(gk * A * n, 2)} kN</b>`;
  } catch (e) { return ''; }
}
function genHTML(it) {
  const g = genDefaults(it);
  const inp = (k, l, u, w) => `<label class="chk" style="display:inline-flex">${l} <input class="txt" style="width:${w || 70}px" data-gk="${k}" value="${esc(g[k])}"> ${u || ''}</label>`;
  const sel = (k, l, o) => `<label class="chk" style="display:inline-flex">${l} <select style="width:auto" data-gk="${k}">${o.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(g[k]) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  let body = '', title = '';
  if (it.kind === 'snow') { title = 'Generator: obciążenie śniegiem z powierzchni dachu (PN-EN 1991-1-3, ZK PL)'; body = sel('zone', 'Strefa', Object.entries(E.SNOW_ZONES).map(([k, v]) => [k, v.n])) + inp('alt', 'A [m n.p.m.]', '', 60) + inp('slope', 'nachylenie α', '°', 50) + inp('area', 'powierzchnia zbierania', 'm²', 60) + inp('Ce', 'C<sub>e</sub>', '', 46) + inp('Ct', 'C<sub>t</sub>', '', 46); }
  else if (it.kind === 'wind') { title = 'Generator: wiatr na ścianę / słup (PN-EN 1991-1-4, ZK PL)'; body = sel('zone', 'Strefa', Object.entries(E.WIND_ZONES).map(([k, v]) => [k, v.n])) + inp('alt', 'A [m n.p.m.]', '', 60) + sel('terr', 'Teren', Object.entries(E.TERRAIN).map(([k, v]) => [k, v.n])) + inp('z', 'wysokość z', 'm', 50) + inp('c', 'współczynnik c (c<sub>pe</sub>−c<sub>pi</sub> lub c<sub>f</sub>)', '', 50) + inp('width', 'pasmo zbierania b', 'm', 50) + sel('dir', 'kierunek', [['qz', 'q_z (płaszczyzna x–z)'], ['qy', 'q_y (płaszczyzna x–y)']]); }
  else if (it.kind === 'imp') { const L = E.IMP_EC1[it.cat] || E.IMP_EC1.B; title = 'Generator: obciążenie użytkowe z powierzchni zbierania (PN-EN 1991-1-1)'; body = sel('sub', 'Rodzaj', L.map(q => [q.id, `${q.n} (${fmt(q.q[0], 1)}–${fmt(q.q[1], 1)} kN/m²)`])) + inp('qk', 'q<sub>k</sub> (puste – górna granica)', 'kN/m²', 60) + inp('area', 'powierzchnia zbierania A', 'm²', 60) + inp('nfl', 'liczba kondygnacji n', '', 40) + `<label class="chk" style="display:inline-flex"><input type="checkbox" data-gk="red"${g.red ? ' checked' : ''}> redukcja α<sub>n</sub> (6.3.1.2(11))</label>`; }
  else { title = 'Generator: obciążenie z powierzchni zbierania'; body = inp('gk', 'obciążenie powierzchniowe', 'kN/m²', 60) + inp('area', 'powierzchnia zbierania A', 'm²', 60) + inp('nfl', 'liczba kondygnacji', '', 40); }
  return `<div class="gen"><h5>${title}</h5><div class="chkrow">${body}</div><div class="res" id="genRes">${genPreview(it)}</div><button class="btn sm" data-gen="${it.kind}">Przyjmij wartość</button></div>`;
}
function applyGen(i, kind, dlg) {
  const it = S.loads.items[i], g = genDefaults(it);
  it.gen = g;
  if (kind === 'snow') it.N = +E.genSnow(g).N.toFixed(3);
  else if (kind === 'wind') { const q = +E.genWind(g).q.toFixed(3); if (g.dir === 'qy') it.qy = q; else it.qz = q; }
  else if (kind === 'imp') { const r = E.genArea(Object.assign({}, g, { cat: it.cat })); it.N = +r.N.toFixed(3); it.sub = r.q.id; }
  else { it.N = +(E.num(g.gk, 0) * E.num(g.area, 0) * Math.max(1, Math.round(E.num(g.nfl, 1)))).toFixed(3); }
  changed(false); toast('Przyjęto wartość z generatora.'); void dlg;
}

/* ------------------------------------------------------------ okna pól (podpory, przekrój) */
function fieldPopup(title, items, wide) {
  const m = $('#modal');
  const render = () => {
    fid = 2000;
    m.innerHTML = `<div class="dlg ${wide ? 'mid' : ''}"><h3>${esc(title)}</h3><div class="fields">${fieldsHTML(items)}</div><div class="dbtn"><button class="btn pri" id="fpOk">Zamknij</button></div></div>`;
    items.forEach(f => { if (f._id !== undefined) POP_FIELDS[f._id] = f; });
    m.style.display = 'flex';
    const dlg = $('.dlg', m);
    bindInputs(dlg, items, (re) => { if (re) render(); else refreshHints(dlg, items); });
    $('#fpOk', m).onclick = () => { m.style.display = 'none'; };
  };
  render();
}
function act(a, el) {
  if (a === 'geo') fieldPopup('Przekrój i wysokość słupa', GEO_ITEMS.filter(f => f.k && /^geom/.test(f.k) || f.t === 'hint' && f.show === isSp), true);
  else if (a === 'supp') { const p = el.dataset.p || 'z'; fieldPopup(`Warunki podparcia – płaszczyzna x–${p}`, [...suppItems(p), { t: 'hint', h: () => hintSupp() }]); }
  else if (a === 'load') loadPopup(+el.dataset.i);
  else if (a === 'mattab') matTablePopup();
}
function matTablePopup() {
  const m = $('#modal');
  const cols = [['fmk', 'f_m,k'], ['ft0k', 'f_t,0,k'], ['ft90k', 'f_t,90,k'], ['fc0k', 'f_c,0,k'], ['fc90k', 'f_c,90,k'], ['fvk', 'f_v,k'], ['E0mean', 'E_0,mean'], ['E005', 'E_0,05'], ['Gmean', 'G_mean'], ['G005', 'G_0,05'], ['rhok', 'ρ_k'], ['rhomean', 'ρ_mean']];
  const rows = Object.values(E.MATS).map(q => `<tr data-cls="${q.id}" class="${q.id === S.mat.cls ? 'cur' : ''}"><td>${esc(q.name)}</td>${cols.map(([k]) => `<td>${fmt(q[k], k.startsWith('E') || k.startsWith('G') || k.startsWith('rho') ? 0 : 1)}</td>`).join('')}</tr>`).join('');
  m.innerHTML = `<div class="dlg wide"><h3>Parametry klas drewna</h3><p>Wartości charakterystyczne [MPa, kg/m³] wg PN-EN 338:2016 (C, D), PN-EN 14080:2013 (GL) i deklaracji producenta (LVL). Kliknij wiersz, aby wybrać klasę.</p><div class="tscroll"><table class="mattab"><thead><tr><th>Klasa</th>${cols.map(([, l]) => `<th>${sym(l.replace(/_([^ ]+)/, '_{$1}'))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><div class="dbtn"><button class="btn" id="mtUser">Materiał własny…</button><span class="sp"></span><button class="btn pri" id="mtOk">Zamknij</button></div></div>`;
  m.style.display = 'flex';
  $$('tr[data-cls]', m).forEach(tr => tr.onclick = () => { S.mat.cls = tr.dataset.cls; m.style.display = 'none'; changed(true); toast('Wybrano klasę ' + tr.dataset.cls); });
  $('#mtOk', m).onclick = () => { m.style.display = 'none'; };
  $('#mtUser', m).onclick = () => { if (S.mat.cls !== 'user') { const b = E.MATS[S.mat.cls]; if (b) Object.assign(S.mat.user, { kind: b.kind, fmk: b.fmk, ft0k: b.ft0k, ft90k: b.ft90k, fc0k: b.fc0k, fc90k: b.fc90k, fvk: b.fvk, E0mean: b.E0mean, E005: b.E005, E90mean: b.E90mean, Gmean: b.Gmean, G005: b.G005, rhok: b.rhok, rhomean: b.rhomean }); S.mat.cls = 'user'; } m.style.display = 'none'; changed(true); fieldPopup('Materiał własny', MAT_ITEMS.filter(f => f.k && /^mat\.user/.test(f.k)), true); };
}

/* ----------------------------------------------------------- obliczenia */
let calcT = null;
function changed(rerender, after) {
  dirty = true; updateTitle();
  if (rerender) renderInputs();
  clearTimeout(calcT);
  calcT = setTimeout(() => { recalc(); if (typeof after === 'function') after(rerender); }, 40);
  autosave();
}
function recalc() {
  const t0 = performance.now();
  try { R = E.calc(S); } catch (e) { console.error(e); R = { errors: ['Błąd obliczeń: ' + e.message], warnings: [], checks: [] }; }
  U.R = R; U.S = S;
  autoTicks();
  rendered = {};
  renderStatus(); renderDsum(); refreshHints(); renderDataSide(); renderActive();
  U.lastMs = performance.now() - t0;
}
// sprawdzenia, które przestały być spełnione, są odznaczane; spełnione ponownie – zaznaczane, jeśli wcześniej odznaczono automatycznie
let prevStat = null;
function autoTicks() {
  if (!R || !R.checks) return;
  const t = S.meta.ticks = S.meta.ticks || {}, auto = S.meta.autoUn = S.meta.autoUn || {};
  const cur = {}; R.checks.forEach(c => { cur[c.key] = c.status; });
  if (prevStat) R.checks.forEach(c => {
    const was = prevStat[c.key];
    if (c.status === 'fail' && t[c.key]) { delete t[c.key]; auto[c.key] = true; }
    else if (c.status !== 'fail' && was === 'fail' && auto[c.key]) { t[c.key] = true; delete auto[c.key]; }
  });
  prevStat = cur;
}

/* ------------------------------------------------------------ status, pasek wyników */
function renderStatus() {
  const el = $('#status');
  const set = (cls, txt) => { el.className = cls; el.textContent = txt; };
  if (!R || (R.errors && R.errors.length)) { set('fail', '✖ Błąd danych'); return; }
  const fails = R.checks.filter(c => c.status === 'fail').length, warns = R.checks.filter(c => c.status === 'warn').length;
  if (fails) set('fail', `✖ Niespełnione warunki: ${fails}`);
  else if (warns) set('warn', `✔ Nośność OK · uwagi: ${warns} · η = ${fmt(R.maxUtil * 100, 0)}%`);
  else set('ok', `✔ Wszystkie warunki spełnione · η = ${fmt(R.maxUtil * 100, 0)}%`);
}
const CHIP_GRPS = [['SGN – nośność przekroju', 'Przekrój'], ['SGN – stateczność', 'Stateczność'], ['Oparcie i docisk', 'Oparcie'], ['SGU – przemieszczenia', 'SGU'], ['Odporność ogniowa', 'Pożar'], ['Warunki konstrukcyjne', 'Konstrukcja']];
function renderDsum() {
  const el = $('#dsum');
  if (!R || R.errors.length) { el.innerHTML = (R ? R.errors : []).map(e => `<span class="chip fail"><b>✖</b> ${esc(e)}</span>`).join(''); return; }
  el.innerHTML = CHIP_GRPS.map(([g, n]) => {
    const list = R.checks.filter(c => c.grp === g && c.status !== 'info'); if (!list.length) return '';
    const nF = list.filter(c => c.status === 'fail').length, nW = list.filter(c => c.status === 'warn').length;
    const mx = list.filter(c => isFinite(c.ratio) && c.fmt !== 'text').reduce((a, c) => Math.max(a, c.ratio), 0);
    const cls = nF ? 'fail' : nW ? 'warn' : 'ok';
    return `<button class="chip ${cls}" data-chip="${esc(g)}" title="${esc(g)} – przejdź do podsumowania"><b>${nF ? '✖' : nW ? '⚠' : '✔'} ${n}</b> ${fmt(mx * 100, 0)}%${nF ? ` · ${nF} ✖` : ''}</button>`;
  }).join('') + (R.warnings || []).map(w => `<span class="chip warn" title="${esc(w)}"><b>⚠</b> ${esc(w.slice(0, 60))}${w.length > 60 ? '…' : ''}</span>`).join('');
  $$('[data-chip]', el).forEach(b => b.onclick = () => U.selectTab('sum'));
}
function renderAutoBar() {
  const el = $('#autobar');
  const lim = S.meta.autoLim || 100;
  el.innerHTML = `<button class="btn" id="aSec" title="Najmniejszy przekrój (wymiary handlowe), dla którego wszystkie warunki są spełnione przy zadanym wytężeniu">⚙ Dobierz przekrój</button><button class="btn" id="aCls" title="Najniższa klasa drewna z tej samej grupy (C, D, GL h, GL c) spełniająca warunki">⚙ Dobierz klasę drewna</button>${isRect(S) ? `<label class="chk"><input type="checkbox" id="aSq"${S.meta.autoSq ? ' checked' : ''}> tylko kwadratowe</label>` : ''}<span class="sp"></span><span class="lim">wytężenie ≤ <input id="aLim" value="${lim}" inputmode="decimal"> %</span>`;
  $('#aLim', el).onchange = e => { const v = parseNum(e.target.value); if (v > 10 && v <= 150) { S.meta.autoLim = v; autosave(); } else e.target.value = lim; };
  const sq = $('#aSq', el); if (sq) sq.onchange = () => { S.meta.autoSq = sq.checked; autosave(); };
  $('#aSec', el).onclick = () => {
    toast('Dobór przekroju…', 1200);
    setTimeout(() => {
      const r = E.autoDesign(S, { lim: S.meta.autoLim || 100, square: !!S.meta.autoSq });
      if (!r.ok) { toast('Nie znaleziono przekroju spełniającego warunki – zmień klasę drewna, warunki podparcia lub dodaj stężenia.', 4500); return; }
      const before = secName();
      S.geom = Object.assign(S.geom, r.geom); changed(true);
      toast(`Dobrano przekrój: ${secName()} (było ${before}), η = ${fmt(r.util * 100, 0)}%`, 4000);
    }, 30);
  };
  $('#aCls', el).onclick = () => {
    const r = E.autoClass(S, { lim: S.meta.autoLim || 100 });
    if (!r.ok) { toast('Żadna klasa z tej grupy nie spełnia warunków – zwiększ przekrój.', 4000); return; }
    const was = S.mat.cls; S.mat.cls = r.cls; changed(true); toast(`Dobrano klasę ${r.cls} (było ${was}), η = ${fmt(r.util * 100, 0)}%`, 4000);
  };
}
const secName = () => isRound(S) ? `⌀${S.geom.d}` : isSp(S) ? `${S.geom.sp.n}×${S.geom.sp.t}×${S.geom.sp.w}` : `${S.geom.b}×${S.geom.h}`;

/* ------------------------------------------------------------ panel boczny (schemat) */
function renderDataSide() {
  const el = $('#dataside');
  let o = beamTabsHTML();
  o += `<div class="box"><h4>Schemat statyczny i obciążenia <small>kliknij słup, podporę lub obciążenie</small></h4><div class="schemewrap">${G.schemeSVG(R && !R.errors.length ? R : null, S, { W: 520, H: 460 })}</div></div>`;
  if (R && !R.errors.length) {
    const ne = R.xs.length - 1, xs = []; for (let e = 0; e < ne; e++) xs.push(R.xs[e], R.xs[e + 1]);
    const ch = (key, title, unit, k, div, c, fill) => G.vChart({ key, W: 124, H: 250, title, unit, xs, L: R.L, series: [{ v: R.env[k].max.map(v => v / div), c, fill }, { v: R.env[k].min.map(v => v / div), c, fill, dash: '' }], dp: 1 });
    o += `<div class="box"><h4>Obwiednie SGN <small>wartości obliczeniowe</small></h4><div class="flex" style="gap:6px">${ch('N', 'N [kN]', '+ ściskanie', 'N', 1e3, G.C.d1, G.C.f1)}${ch('My', 'M_y [kNm]', 'płaszcz. x–z', 'My', 1e6, G.C.d2, G.C.f2)}${ch('Mz', 'M_z [kNm]', 'płaszcz. x–y', 'Mz', 1e6, G.C.d3, G.C.f3)}${ch('Vz', 'V_z [kN]', '', 'Vz', 1e3, G.C.d2, '')}</div></div>`;
    const gov = R.checks.filter(c => c.status !== 'info' && isFinite(c.ratio) && c.fmt !== 'text' && !c.warnOnly).sort((a, b) => b.ratio - a.ratio)[0];
    if (gov) o += `<p class="hint">Decyduje: <b>${sym(gov.name)}</b> – η = ${fmt(gov.ratio * 100, 0)}%${gov.combo ? ` (${esc(gov.combo)})` : ''}. Obliczenia: ${fmt(U.lastMs || 0, 0)} ms.</p>`;
  }
  el.innerHTML = o;
  el.onclick = e => {
    const h = e.target.closest('[data-act]'); if (h) { act(h.dataset.act, h); return; }
  };
}

/* ------------------------------------------------------------ zakładki */
function renderActive() {
  const t = ($('.tabs button.on') || {}).dataset;
  const tab = t ? t.tab : 'data';
  if (tab === 'data' || rendered[tab]) return;
  rendered[tab] = true;
  const el = $('#p-' + tab);
  if (!R || (R.errors && R.errors.length)) { el.innerHTML = errBox(); return; }
  try {
    ({ sec: renderSection, chart: renderCharts, stab: renderStab, draw: renderDraw, sum: renderSummary, report: renderReport })[tab](el);
  } catch (e) { console.error(e); el.innerHTML = `<div class="msg err">Błąd wyświetlania: ${esc(e.message)}</div>`; }
}
function errBox() { return `<div class="msgs">${((R && R.errors) || ['Brak wyników']).map(e => `<div class="msg err">${esc(e)}</div>`).join('')}</div><p class="hint">Popraw dane w zakładce Dane.</p>`; }

/* ---- przekrój i materiał */
function renderSection(el) {
  const g = R.g, m = R.m;
  const kv = rows => `<table class="kv">${rows.map(r => `<tr${r[3] ? ' class="hl"' : ''}><td>${sym(r[0])}</td><td>${r[1]}</td><td>${sym(r[2] || '')}</td></tr>`).join('')}</table>`;
  const props = [['Pole przekroju A', fmt(g.A / 100, 2), 'cm²'], ['I_{y}', fmt(g.Iy / 1e4, 1), 'cm⁴'], ['I_{z}', fmt(g.Iz / 1e4, 1), 'cm⁴'], ['W_{y}', fmt(g.Wy / 1e3, 1), 'cm³'], ['W_{z}', fmt(g.Wz / 1e3, 1), 'cm³' + (g.type === 'spaced' ? ' (pełna współpraca – do obliczeń I_{ef})' : '')], ['i_{y}', fmt(g.iy, 1), 'mm'], ['i_{z}', fmt(g.iz, 1), 'mm'], ['I_{tor}', fmt(g.It / 1e4, 1), 'cm⁴'], ['k_{m}', fmt(g.km, 1), g.type === 'round' ? 'przekrój okrągły – moment wypadkowy' : ''], ['k_{h,y} / k_{h,z}', `${fmt(R.kh.y.k, 3)} / ${fmt(R.kh.z.k, 3)}`, ''], ['Ciężar własny g', fmt(m.gamma * g.A * 1e-6, 3), 'kN/m']];
  if (S.geom.hole > 0) props.push(['Osłabienie ΔA', fmt(S.geom.hole, 0), '%']);
  // wartości obliczeniowe dla kolejnych klas trwania
  const vals = E.DUR_KEYS.map(k => { const km = m.kmodT[k], f = km * m.ksys / m.gM; return `<tr><td>${E.DUR[k].n}</td><td class="n">${fmt(km, 2)}</td><td class="n">${fmt(f * m.fc0k, 2)}</td><td class="n">${fmt(f * m.fmk * R.kh.y.k, 2)}</td><td class="n">${fmt(f * m.fmk * R.kh.z.k, 2)}</td><td class="n">${fmt(f * m.ft0k * R.kh.t.k, 2)}</td><td class="n">${fmt(f * m.fvk, 2)}</td><td class="n">${fmt(f * m.fc90k, 2)}</td></tr>`; }).join('');
  let o = `<div class="h2">Przekrój i materiał <small>kliknij przekrój, aby zmienić wymiary</small></div><div class="flex">`;
  o += `<div class="box"><h4>Przekrój poprzeczny${R.fire && R.fire.t ? ` <small>z przekrojem resztkowym R${R.fire.t}</small>` : ''}</h4>${G.sectionSVG(R, S, { W: 360, H: 340, click: true, fire: true })}<p class="hint">${esc(G.secTxt(R, S))}</p></div>`;
  o += `<div class="box"><h4>Charakterystyki geometryczne</h4>${kv(props)}</div>`;
  o += `<div class="box"><h4>${esc(m.name)} <small>${esc(m.std)}, ${esc(m.kindName)}</small></h4>${kv([['f_{m,k}', fmt(m.fmk, 1), 'MPa'], ['f_{t,0,k}', fmt(m.ft0k, 1), 'MPa'], ['f_{c,0,k}', fmt(m.fc0k, 1), 'MPa'], ['f_{c,90,k}', fmt(m.fc90k, 2), 'MPa'], ['f_{v,k}', fmt(m.fvk, 1), 'MPa'], ['E_{0,mean}', fmt(m.E0mean, 0), 'MPa'], ['E_{0,05}', fmt(m.E005, 0), 'MPa'], ['G_{mean} / G_{0,05}', `${fmt(m.Gmean, 0)} / ${fmt(m.G005, 0)}`, 'MPa'], ['ρ_{k} / ρ_{mean}', `${fmt(m.rhok, 0)} / ${fmt(m.rhomean, 0)}`, 'kg/m³'], ['γ_{M}', fmt(m.gM, 2), ''], ['k_{def} (klasa ' + m.sc + ')', fmt(m.kdef, 2), ''], ['β_{c}', fmt(m.betaC, 1), ''], ['k_{cr}', fmt(m.kcr, 2), ''], ['k_{sys}', fmt(m.ksys, 2), '']])}</div>`;
  o += `</div><div class="box" style="margin-top:14px"><h4>Wytrzymałości obliczeniowe f<sub>d</sub> = k<sub>mod</sub>·k<sub>sys</sub>·(k<sub>h</sub>)·f<sub>k</sub>/γ<sub>M</sub> [MPa] <small>klasa użytkowania ${m.sc}</small></h4><div class="tscroll"><table class="sched"><thead><tr><th>Klasa trwania</th><th>k<sub>mod</sub></th><th>f<sub>c,0,d</sub></th><th>f<sub>m,y,d</sub></th><th>f<sub>m,z,d</sub></th><th>f<sub>t,0,d</sub></th><th>f<sub>v,d</sub></th><th>f<sub>c,90,d</sub></th></tr></thead><tbody>${vals}</tbody></table></div></div>`;
  if (R.fire && R.fire.t) {
    const F = R.fire;
    const ts = [], dd = []; for (let t = 0; t <= Math.max(F.t, 30) * 1.25; t += 1) { ts.push(t); dd.push(E.charDepth(Object.assign({}, S.fire, { d0: S.coef.d0 }), m, t).def); }
    o += `<div class="flex" style="margin-top:14px"><div class="box"><h4>Odporność ogniowa R${F.t} – metoda zredukowanego przekroju</h4>${kv([['β_{0} / β_{n}', `${fmt(m.beta0, 2)} / ${fmt(m.betan, 2)}`, 'mm/min'], ['Zwęglenie', sym(F.ch.txt), ''], ['d_{ef} = d_{char,n} + k_{0}·d_{0}', fmt(F.def, 1), 'mm'], ['Przekrój resztkowy', F.ok ? sym(F.desc) : '<span style="color:var(--fail)">brak</span>', ''], ['k_{fi}', fmt(m.kfi, 2), ''], ...(F.ok ? [['f_{c,0,d,fi}', fmt(F.f.fc0d, 2), 'MPa'], ['f_{m,d,fi}', fmt(F.f.fmyd, 2), 'MPa'], ['λ_{rel,y,fi} / k_{c,y,fi}', `${fmt(F.bk.z.lamRel, 3)} / ${fmt(F.bk.z.kc, 3)}`, ''], ['λ_{rel,z,fi} / k_{c,z,fi}', `${fmt(F.bk.y.lamRel, 3)} / ${fmt(F.bk.y.kc, 3)}`, '']] : [])])}</div>`;
    o += `<div class="box"><h4>Efektywna głębokość zwęglenia d<sub>ef</sub>(t)</h4>${G.lineChart({ W: 420, H: 220, series: [{ x: ts, y: dd, c: G.C.fail }], xl: 't [min]', yl: 'd_ef [mm]', marks: [{ x: F.t, l: `R${F.t}` }] })}</div></div>`;
  }
  el.innerHTML = o;
  $$('[data-act="geo"]', el).forEach(b => b.addEventListener('click', () => act('geo', b)));
}

/* ---- wykresy */
let chartSel = 'env';
function chartSeries() {
  const ne = R.xs.length - 1, xs = []; for (let e = 0; e < ne; e++) xs.push(R.xs[e], R.xs[e + 1]);
  const nodes = R.xs;
  const out = { xs, nodes, s: {} };
  if (chartSel === 'env') {
    const pick = (k, d) => [R.env[k].max.map(v => v / d), R.env[k].min.map(v => v / d)];
    out.s = { N: pick('N', 1e3), My: pick('My', 1e6), Mz: pick('Mz', 1e6), Vz: pick('Vz', 1e3), Vy: pick('Vy', 1e3) };
    // przemieszczenia – kombinacja charakterystyczna o największym u
    const co = R.sls && R.sls.inst && R.sls.inst.co ? R.sls.inst.co : R.combos.chr[0];
    const r = co ? E.combine(R, co) : null;
    out.u = r ? { uz: r.uz, uy: r.uy, name: co.eq + ': ' + co.desc } : null;
    out.name = 'Obwiednia kombinacji SGN (max / min)';
  } else {
    const [t, n] = chartSel.split(':'), list = t === 'chr' ? R.combos.chr : t === 'acc' ? R.combos.acc : R.combos.uls, co = list[+n];
    const r = co ? (co.res || E.combine(R, co)) : null;
    if (!r) { chartSel = 'env'; return chartSeries(); }
    out.s = { N: [r.N.map(v => v / 1e3)], My: [r.My.map(v => v / 1e6)], Mz: [r.Mz.map(v => v / 1e6)], Vz: [r.Vz.map(v => v / 1e3)], Vy: [r.Vy.map(v => v / 1e3)] };
    out.u = { uz: r.uz, uy: r.uy, name: co.desc };
    out.name = `${co.eq}: ${co.desc}${co.kmod ? ` (k_mod = ${fmt(co.kmod, 2)})` : ''}`;
  }
  return out;
}
function renderCharts(el) {
  const cs = chartSeries();
  const opt = [['env', 'Obwiednia SGN (max / min)'], ...R.combos.uls.map((c, i) => [`uls:${i}`, `K${c.no}: ${c.eq} – ${c.desc}${c.lead ? ' (wiodące ' + c.lead.name + ')' : ''} · k_mod ${fmt(c.kmod, 2)} · η ${fmt((c.util || 0) * 100, 0)}%`]), ...R.combos.acc.map((c, i) => [`acc:${i}`, `KW${c.no}: ${c.eq} – ${c.desc}`]), ...R.combos.chr.map((c, i) => [`chr:${i}`, `SGU ${c.eq}: ${c.desc}`])];
  const H = 400;
  const mk = (key, title, unit, arr, c, f, dp) => G.vChart({ key, W: 150, H, title, unit, xs: cs.xs, L: R.L, series: arr.map((v, j) => ({ v, c, fill: f, dash: j ? '' : '' })), dp });
  let o = `<div class="toolrow"><label>Wykresy dla: <select id="chSel">${opt.map(([v, t]) => `<option value="${v}"${v === chartSel ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label><span class="sp"></span><span class="hint">Najedź kursorem na wykres – wartości na tej samej wysokości we wszystkich wykresach.</span></div>`;
  o += `<div class="box"><h4>${sym(cs.name)}</h4><div class="flex" style="gap:4px" id="vcharts">`;
  o += mk('N', 'N [kN]', '+ ściskanie', cs.s.N, G.C.d1, G.C.f1, 1) + mk('My', 'M_y [kNm]', 'płaszczyzna x–z', cs.s.My, G.C.d2, G.C.f2, 2) + mk('Mz', 'M_z [kNm]', 'płaszczyzna x–y', cs.s.Mz, G.C.d3, G.C.f3, 2) + mk('Vz', 'V_z [kN]', 'płaszczyzna x–z', cs.s.Vz, G.C.d2, '', 2) + mk('Vy', 'V_y [kN]', 'płaszczyzna x–y', cs.s.Vy, G.C.d3, '', 2);
  if (cs.u) o += G.vChart({ key: 'uz', W: 130, H, title: 'u_z [mm]', unit: 'SGU char.', xs: cs.nodes, L: R.L, series: [{ v: cs.u.uz, c: G.C.d2, fill: G.C.f2 }], dp: 2 }) + G.vChart({ key: 'uy', W: 130, H, title: 'u_y [mm]', unit: 'SGU char.', xs: cs.nodes, L: R.L, series: [{ v: cs.u.uy, c: G.C.d3, fill: G.C.f3 }], dp: 2 });
  o += `</div>${cs.u ? `<p class="hint">Przemieszczenia: ${sym(cs.u.name)} (E<sub>0,mean</sub>, bez pełzania).</p>` : ''}</div>`;
  // reakcje
  const rea = R.combos.uls.map(c => ({ c, r: c.res })).filter(q => q.r);
  const top = R.xs.length * 2 - 3;
  const ext = (f) => rea.reduce((a, q) => { const v = f(q.r); return !a || v > a.v ? { v, c: q.c } : a; }, null);
  const rows = [
    ['N<sub>Ed,max</sub> w podstawie (ściskanie)', ext(r => r.N[0]), 1e3, 'kN'], ['N<sub>Ed,min</sub> w podstawie', ext(r => -r.N[0]), -1e3, 'kN'],
    ['|V<sub>z,Ed</sub>| w podstawie', ext(r => Math.abs(r.Vz[0])), 1e3, 'kN'], ['|V<sub>y,Ed</sub>| w podstawie', ext(r => Math.abs(r.Vy[0])), 1e3, 'kN'],
    ['|M<sub>y,Ed</sub>| w podstawie', ext(r => Math.abs(r.My[0])), 1e6, 'kNm'], ['|M<sub>z,Ed</sub>| w podstawie', ext(r => Math.abs(r.Mz[0])), 1e6, 'kNm'],
    ['|V<sub>z,Ed</sub>| w głowicy (reakcja stężenia)', ext(r => Math.abs(r.Vz[top])), 1e3, 'kN'], ['|V<sub>y,Ed</sub>| w głowicy (reakcja stężenia)', ext(r => Math.abs(r.Vy[top])), 1e3, 'kN'],
  ].filter(q => q[1] && Math.abs(q[1].v) > 1e-6);
  o += `<div class="flex" style="margin-top:14px"><div class="box"><h4>Siły w podporach – wartości ekstremalne SGN</h4><table class="sched"><thead><tr><th>Wielkość</th><th>Wartość</th><th>Kombinacja</th></tr></thead><tbody>${rows.map(q => `<tr><td>${q[0]}</td><td class="n">${fmt(q[1].v / Math.abs(q[2]) * Math.sign(q[2]), 2)} ${q[3]}</td><td>K${q[1].c.no}: ${esc(q[1].c.eq)} – ${esc(q[1].c.desc)}</td></tr>`).join('')}</tbody></table></div>`;
  // przypadki obciążeń
  o += `<div class="box"><h4>Przypadki obciążeń (wartości charakterystyczne)</h4><table class="sched"><thead><tr><th>Id</th><th>Nazwa</th><th>Trwanie</th><th>ψ₀ / ψ₁ / ψ₂</th><th>N<sub>k</sub> podst. [kN]</th><th>max|M<sub>y,k</sub>|</th><th>max|M<sub>z,k</sub>|</th></tr></thead><tbody>${R.cases.map(c => { const r = R.resp[c.id]; const mx = a => Math.max(...a.map(Math.abs)); return `<tr><td>${esc(c.id)}</td><td>${esc(c.name)}</td><td>${esc(E.DUR[c.dur].n)}</td><td class="n">${c.kind === 'perm' || c.kind === 'acc' ? '—' : `${fmt(c.psi.p0, 1)} / ${fmt(c.psi.p1, 1)} / ${fmt(c.psi.p2, 1)}`}</td><td class="n">${fmt(r.N[0] / 1e3, 2)}</td><td class="n">${fmt(mx(r.My) / 1e6, 2)}</td><td class="n">${fmt(mx(r.Mz) / 1e6, 2)}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  // kombinacje
  const top10 = R.combos.uls.slice().sort((a, b) => (b.util || 0) - (a.util || 0)).slice(0, 12);
  o += `<div class="box" style="margin-top:14px"><h4>Kombinacje SGN – najbardziej wytężone <small>łącznie ${R.combos.uls.length}; kliknij wiersz, aby pokazać wykresy</small></h4><div class="tscroll"><table class="sched click"><thead><tr><th>Nr</th><th>Wzór</th><th>Kombinacja</th><th>Wiodące</th><th>Klasa trwania</th><th>k<sub>mod</sub></th><th>η<sub>max</sub></th></tr></thead><tbody>${top10.map(c => `<tr data-cs="uls:${R.combos.uls.indexOf(c)}" class="${chartSel === 'uls:' + R.combos.uls.indexOf(c) ? 'cur' : ''}"><td>K${c.no}</td><td>${esc(c.eq)}</td><td>${esc(c.desc)}</td><td>${esc(c.lead ? c.lead.name : '—')}</td><td>${esc(E.DUR[c.dur].n)}</td><td class="n">${fmt(c.kmod, 2)}</td><td class="n">${fmt((c.util || 0) * 100, 1)}%</td></tr>`).join('')}</tbody></table></div></div>`;
  el.innerHTML = o;
  $('#chSel', el).onchange = e => { chartSel = e.target.value; renderCharts(el); };
  $$('[data-cs]', el).forEach(tr => tr.onclick = () => { chartSel = tr.dataset.cs; renderCharts(el); el.scrollTop = 0; });
  bindChartCursor($('#vcharts', el), cs);
}
function bindChartCursor(root, cs) {
  if (!root) return;
  const charts = $$('svg.vchart', root);
  const valAt = (key, x) => {
    const arr = key === 'uz' || key === 'uy' ? [cs.u[key]] : cs.s[key]; const xs = key === 'uz' || key === 'uy' ? cs.nodes : cs.xs;
    if (!arr) return '';
    return arr.map(a => { let best = 0, bd = Infinity; xs.forEach((v, i) => { const d = Math.abs(v - x); if (d < bd) { bd = d; best = i; } }); return fmt(a[best], 2); }).join(' / ');
  };
  const move = e => {
    const svg = e.target.closest('svg.vchart'); if (!svg) return;
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, y = (e.clientY - r.top) / r.height * vb.height;
    const top = +svg.dataset.top, bot = +svg.dataset.bot, L = +svg.dataset.l;
    const x = Math.max(0, Math.min(L, (bot - y) / (bot - top) * L));
    charts.forEach(c => { const yy = bot - x / L * (bot - top); const ln = $('.curline', c), tx = $('.curtxt', c); ln.setAttribute('y1', yy); ln.setAttribute('y2', yy); tx.setAttribute('y', yy - 3); tx.textContent = valAt(c.dataset.chart, x); });
    const t = $('.curtxt', charts[0]); if (t) t.textContent = `x = ${fmt(x / 1000, 2)} m: ` + valAt(charts[0].dataset.chart, x);
  };
  root.addEventListener('mousemove', move);
  root.addEventListener('mouseleave', () => charts.forEach(c => { $('.curline', c).setAttribute('y1', -10); $('.curline', c).setAttribute('y2', -10); $('.curtxt', c).textContent = ''; }));
}

/* ---- stateczność */
function renderStab(el) {
  const b = R.buck, m = R.m;
  const row = (p, ax) => { const q = b[p]; return `<tr><td>${ax}</td><td class="n">${fmt(q.lef / 1000, 3)}${q.manual ? ' (ręcznie)' : ''}</td><td class="n">${fmt(q.beta, 3)}</td><td class="n">${fmt(q.i, 1)}</td><td class="n">${fmt(q.lam, 1)}${q.spaced ? ' (λ<sub>ef</sub>)' : ''}</td><td class="n">${fmt(q.lamRel, 3)}</td><td class="n">${fmt(q.k, 3)}</td><td class="n"><b>${fmt(q.kc, 3)}</b></td></tr>`; };
  let o = `<div class="h2">Stateczność <small>metoda: ${S.buck.method === 'kc' ? 'współczynnik wyboczeniowy k<sub>c</sub> (6.3.2)' : 'analiza II rzędu z imperfekcjami (5.4.4)'}</small></div>`;
  o += `<div class="flex"><div class="box"><h4>Postacie wyboczenia (MES) i długości wyboczeniowe</h4>${G.modeSVG(R, S, { W: 440, H: 380 })}</div>`;
  o += `<div class="box"><h4>Współczynniki wyboczeniowe <small>β<sub>c</sub> = ${fmt(m.betaC, 1)}, √(f<sub>c,0,k</sub>/E<sub>0,05</sub>) = ${fmt(Math.sqrt(m.fc0k / m.E005), 4)}</small></h4><table class="sched"><thead><tr><th>Oś</th><th>l<sub>ef</sub> [m]</th><th>β</th><th>i [mm]</th><th>λ</th><th>λ<sub>rel</sub></th><th>k</th><th>k<sub>c</sub></th></tr></thead><tbody>${row('z', 'y (płaszczyzna x–z)')}${row('y', 'z (płaszczyzna x–y)')}</tbody></table>${G.kcSVG(R, { W: 440, H: 250 })}<p class="hint">Kółka – słup; kwadraty – przekrój resztkowy w pożarze.</p></div></div>`;
  o += `<div class="flex" style="margin-top:14px"><div class="box"><h4>Interakcja ściskania z wyboczeniem i zginania (6.23 / 6.24) <small>każdy punkt – kombinacja SGN (przekrój decydujący)</small></h4>${G.interSVG(R, { W: 460, H: 310 })}</div>`;
  let side = '';
  if (R.ltb) { const l = R.ltb; side += `<div class="box"><h4>Zwichrzenie (6.3.3)</h4><table class="kv"><tr><td>oś mocna</td><td>${l.strong}</td><td>h/b = ${fmt(l.hh / l.bb, 2)}</td></tr><tr><td>l<sub>ef,m</sub></td><td>${fmt(l.lef / 1000, 3)} m</td><td>${l.manual ? 'ręcznie' : `${esc(E.LTB_CASES[l.caseK].n)}: ${fmt(l.kL, 1)}·${fmt(l.lseg / 1000, 2)} m`}</td></tr><tr><td>σ<sub>m,crit</sub></td><td>${fmt(l.scrit, 1)} MPa</td><td>(6.31); uproszczony (6.32): ${fmt(l.scritS, 1)} MPa</td></tr><tr><td>λ<sub>rel,m</sub></td><td>${fmt(l.lamRel, 3)}</td><td></td></tr><tr><td>k<sub>crit</sub></td><td>${fmt(l.kcrit, 3)}</td><td>${l.kcrit < 1 ? 'redukcja nośności na zginanie' : 'bez redukcji'}</td></tr></table></div>`; }
  if (R.II) { const II = R.II, bb = II.best; side += `<div class="box"><h4>Analiza II rzędu ${S.buck.method === 'II' ? '' : '<small>informacyjnie</small>'}</h4><table class="kv"><tr><td>E<sub>d</sub></td><td>${fmt(II.Ed, 0)} MPa</td><td>${II.Ebase === m.E005 ? 'E<sub>0,05</sub>' : 'E<sub>0,mean</sub>'}/γ<sub>M</sub></td></tr>${['z', 'y'].map(p => `<tr><td>N<sub>cr,${p === 'z' ? 'y' : 'z'}</sub></td><td>${fmt(II.planes[p].Ncr / 1e3, 1)} kN</td><td>imperfekcja ${fmt(II.planes[p].amp, 1)} mm${II.planes[p].sway ? ` (przechyłka φ = ${fmt(II.planes[p].phi, 4)})` : ''}</td></tr>`).join('')}<tr><td>η<sub>max</sub></td><td>${isFinite(bb.r) ? fmt(bb.r * 100, 1) + '%' : 'N ≥ N<sub>cr</sub>'}</td><td>${bb.co ? `K${bb.co.no} – imperfekcja w płaszczyźnie x–${bb.imp || ''}` : ''}</td></tr><tr><td>Warunek</td><td colspan="2">${II.lin ? 'liniowy σc/fc + σm/fm' : '6.19/6.20'}</td></tr></table></div>`; }
  if (R.sp) { const P = R.sp; side += `<div class="box"><h4>Słup wielogałęziowy (zał. C.3)</h4><table class="kv"><tr><td>l<sub>1</sub></td><td>${fmt(P.l1, 0)} mm</td><td>${P.nb} przedziały</td></tr><tr><td>λ (oś z)</td><td>${fmt(P.lamZ, 1)}</td><td>l·√(A/I<sub>tot</sub>)</td></tr><tr><td>λ<sub>1</sub></td><td>${fmt(P.lam1, 1)}</td><td>${P.lam1 < 30 ? 'przyjęto 30' : ''}</td></tr><tr><td>η</td><td>${fmt(P.long.eta, 1)} / ${fmt(P.short.eta, 1)}</td><td>tab. C.1</td></tr><tr><td>λ<sub>ef</sub></td><td>${fmt(P.long.lamEf, 1)} / ${fmt(P.short.lamEf, 1)}</td><td>(C.15)</td></tr><tr><td>k<sub>c,z</sub></td><td>${fmt(P.long.kc, 3)} / ${fmt(P.short.kc, 3)}</td><td></td></tr>${P.Td !== undefined ? `<tr><td>V<sub>d</sub> / T<sub>d</sub></td><td>${fmt(P.Vd / 1e3, 2)} / ${fmt(P.Td / 1e3, 2)} kN</td><td>siła w łącznikach przekładki</td></tr>` : ''}</table></div>`; }
  const br = R.conn.brace; Object.entries(br).forEach(([p, q]) => { side += `<div class="box"><h4>Stężenia – płaszczyzna x–${p} (9.2.5.2)</h4><table class="kv"><tr><td>a (największy przedział)</td><td>${fmt(q.a / 1000, 3)} m</td><td>m = ${q.mbays}</td></tr><tr><td>k<sub>s</sub></td><td>${fmt(q.ks, 3)}</td><td>2(1+cos π/m)</td></tr><tr><td>N<sub>d</sub></td><td>${fmt(q.Nd / 1e3, 2)} kN</td><td></td></tr><tr><td>F<sub>d</sub> = N<sub>d</sub>/k<sub>f</sub></td><td>${fmt(q.Fd / 1e3, 2)} kN</td><td>k<sub>f</sub> = ${fmt(q.kf, 0)}</td></tr><tr><td>C<sub>min</sub></td><td>${fmt(q.Creq, 1)} N/mm</td><td>k<sub>s</sub>·N<sub>d</sub>/a</td></tr></table></div>`; });
  o += `<div style="display:flex;flex-direction:column;gap:14px">${side}</div></div>`;
  el.innerHTML = o;
}

/* ---- rysunek i zestawienie */
function renderDraw(el) {
  const g = R.g, m = R.m, L = S.geom.L;
  const rows = [];
  if (g.type === 'spaced') {
    rows.push([`Gałęzie ${fmt(g.t, 0)}×${fmt(g.w, 0)} mm`, g.n, L, g.n * g.A1 * L * 1e-6]);
    const nP = (R.sp ? R.sp.nb : 3) + 1, l2 = R.sp ? R.sp.l2 : 200;
    if (S.geom.sp.conn === 'pack') rows.push([`Przekładki ${fmt(g.a, 0)}×${fmt(g.w, 0)} mm, l₂ = ${fmt(l2, 0)}`, nP * (g.n - 1), l2 / 1000, nP * (g.n - 1) * g.a * g.w * l2 * 1e-9]);
    else rows.push([`Nakładki 2 × ${fmt(25, 0)}×${fmt(g.w, 0)} mm, l₂ = ${fmt(l2, 0)}`, nP * 2, l2 / 1000, nP * 2 * 25 * g.w * l2 * 1e-9]);
  } else rows.push([G.secTxt(R, S), 1, L, g.A * L * 1e-6]);
  const vol = rows.reduce((a, r) => a + r[3], 0), mass = vol * m.rhomean;
  let o = `<div class="toolrow"><span class="h2" style="margin:0">Rysunek słupa i zestawienie materiałów</span><span class="sp"></span><button class="btn" id="bDxf">Zapisz rysunek DXF…</button></div>`;
  o += `<div class="box">${G.elevSVG(R, S, { W: 940, H: 600 })}</div>`;
  o += `<div class="flex" style="margin-top:14px"><div class="box"><h4>Zestawienie drewna</h4><table class="sched"><thead><tr><th>Element</th><th>Szt.</th><th>Długość [m]</th><th>Objętość [m³]</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td class="n">${r[1]}</td><td class="n">${fmt(r[2], 2)}</td><td class="n">${fmt(r[3], 4)}</td></tr>`).join('')}<tr class="tot"><td>Razem (${esc(m.name)})</td><td></td><td></td><td class="n">${fmt(vol, 4)}</td></tr></tbody></table><p class="hint">Masa ≈ ${fmt(mass, 1)} kg (ρ<sub>mean</sub> = ${fmt(m.rhomean, 0)} kg/m³). Bez naddatków na obróbkę.</p></div>`;
  const cn = R.conn;
  o += `<div class="box"><h4>Siły do wymiarowania połączeń (SGN)</h4><table class="kv"><tr><td>N<sub>Ed,max</sub> w podstawie</td><td>${fmt(cn.Nb.v / 1e3, 2)} kN</td><td>${cn.Nb.co ? 'K' + cn.Nb.co.no : ''}</td></tr><tr><td>N<sub>Ed,min</sub> w podstawie</td><td>${fmt(cn.Nbmin.v / 1e3, 2)} kN</td><td>${cn.Nbmin.v < 0 ? '<b style="color:var(--warn)">odrywanie – zakotwić</b>' : ''}</td></tr><tr><td>V<sub>Ed</sub> w podstawie</td><td>${fmt(cn.Vb.v / 1e3, 2)} kN</td><td>${cn.Vb.co ? 'K' + cn.Vb.co.no : ''}</td></tr><tr><td>M<sub>Ed</sub> w podstawie</td><td>${fmt(cn.Mb.v / 1e6, 2)} kNm</td><td>${S.supp.z.base === 'fix' || S.supp.y.base === 'fix' ? 'utwierdzenie' : 'przegub – 0'}</td></tr><tr><td>N<sub>Ed,max</sub> w głowicy</td><td>${fmt(cn.Nt.v / 1e3, 2)} kN</td><td></td></tr></table></div></div>`;
  el.innerHTML = o;
  $('#bDxf', el).onclick = exportDXF;
}

/* ---- podsumowanie */
const STL = { ok: 'OK', fail: 'NIE', warn: 'UWAGA', info: 'INFO' };
const CHECK_DP = { kN: 2, kNm: 2, mm: 2, MPa: 2, '': 3 };
function ckVal(c, v) { if (c.fmt === 'text') return ''; const dp = typeof c.fmt === 'number' ? c.fmt : (CHECK_DP[c.unit] !== undefined ? CHECK_DP[c.unit] : 2); return fmt(v, dp); }
function ckCond(c) {
  if (c.fmt === 'text') return `${esc(c.EdTxt || '')}`;
  const u = c.unit ? ' ' + c.unit : '';
  if (c.status === 'info' && !(c.Rd > 0)) return `${ckVal(c, c.Ed)}${u}`;
  if (!isFinite(c.Ed)) return `N ≥ N<sub>cr</sub>`;
  return `${ckVal(c, c.Ed)} ≤ ${ckVal(c, c.Rd)}${u}`;
}
U.ckCond = ckCond; U.STL = STL; U.ckVal = ckVal;
function utilBar(c) {
  if (c.status === 'info' || c.fmt === 'text' || (!isFinite(c.ratio) && c.status !== 'fail')) return '';
  const r = isFinite(c.ratio) ? c.ratio : 9.99, w = Math.min(100, r * 100);
  const cls = c.status === 'fail' ? 'fail' : (c.status === 'warn' || r > 0.9) ? 'warn' : '';
  return `<span class="ub ${cls}"><i style="width:${w}%"></i></span><span class="pct">${isFinite(c.ratio) ? fmt(r * 100, 0) + '%' : '∞'}</span>`;
}
function renderSummary(el) {
  const c = R.checks;
  const worst = pred => { const a = c.filter(pred).filter(x => x.status !== 'info' && x.fmt !== 'text'); if (!a.length) return null; return a.reduce((p, q) => ((isFinite(q.ratio) ? q.ratio : 99) > (isFinite(p.ratio) ? p.ratio : 99) ? q : p)); };
  const card = (t, v, s, ck) => `<div class="card ${ck ? (ck.status === 'fail' ? 'fail' : ck.status === 'warn' ? 'warn' : 'ok') : ''}"><div class="t">${t}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  let cards = '';
  const wb = worst(x => ['b1', 'b2', 'II', 'b0'].includes(x.id)), wc = worst(x => x.grp === 'SGN – nośność przekroju'), wl = worst(x => x.id === 'ltb'), wu = worst(x => /^u/.test(x.id)), wf = worst(x => x.grp === 'Odporność ogniowa'), wo = worst(x => x.grp === 'Oparcie i docisk');
  cards += card('Siła osiowa', `${fmt(R.ext.Nmax.v / 1e3, 1)} kN`, `N<sub>Ed,max</sub> (ściskanie)${R.ext.Nmin.v < 0 ? ` · rozciąganie ${fmt(-R.ext.Nmin.v / 1e3, 1)} kN` : ''}`, wc);
  if (wb) cards += card('Wyboczenie', `${isFinite(wb.ratio) ? fmt(wb.ratio * 100, 0) + '%' : '∞'}`, `λ<sub>rel,y</sub> = ${fmt(R.buck.z.lamRel, 2)}, λ<sub>rel,z</sub> = ${fmt(R.buck.y.lamRel, 2)} · k<sub>c</sub> = ${fmt(Math.min(R.buck.z.kc, R.buck.y.kc), 3)}`, wb);
  const Mmax = Math.max(Math.abs(R.ext.Mymax.v), Math.abs(R.ext.Mymin.v)) / 1e6, Mzm = Math.max(Math.abs(R.ext.Mzmax.v), Math.abs(R.ext.Mzmin.v)) / 1e6;
  if (Mmax > 1e-6 || Mzm > 1e-6) cards += card('Zginanie', `${fmt(Mmax, 2)} / ${fmt(Mzm, 2)}`, `|M<sub>y,Ed</sub>| / |M<sub>z,Ed</sub>| [kNm]${wl ? ` · zwichrzenie ${fmt(wl.ratio * 100, 0)}%` : ''}`, wl || wc);
  if (wu) cards += card('Przemieszczenie', `${fmt(wu.Ed, 1)} mm`, `${sym(wu.name.replace(/ ≤.*/, ''))} ≤ ${fmt(wu.Rd, 1)} mm`, wu);
  if (wf) cards += card(`Pożar R${R.fire.t}`, `${isFinite(wf.ratio) ? fmt(wf.ratio * 100, 0) + '%' : '✖'}`, `d<sub>ef</sub> = ${fmt(R.fire.def, 1)} mm · ${sym(R.fire.desc)}`, wf);
  if (wo) cards += card('Oparcie', `${fmt(wo.ratio * 100, 0)}%`, sym(wo.name.replace(/ σ.*| N_.*/, '')), wo);
  let html = `<div class="cards">${cards}</div>`;
  const msgs = [...(R.errors || []).map(e => `<div class="msg err">${esc(e)}</div>`), ...(R.warnings || []).map(e => `<div class="msg wrn">${esc(e)}</div>`)];
  if (msgs.length) html += `<div class="msgs">${msgs.join('')}</div>`;
  const ticks = S.meta.ticks || {};
  const nT = c.filter(x => ticks[x.key]).length;
  const nF = c.filter(x => x.status === 'fail').length;
  if (nF) html += `<div class="failnav">Niespełnione warunki: ${c.map((x, i) => x.status === 'fail' ? `<button class="goto" data-goto2="${i}">${sym(x.name)}</button>` : '').join('')}</div>`;
  html += `<div class="tickbar"><span id="tickCnt">Odhaczono: <b>${nT}</b> z ${c.length}</span><button class="btn sm" id="tickOk">Odhacz spełnione</button><button class="btn sm" id="tickClr">Wyczyść znaczniki</button><span class="hint">Kliknij numer punktu normy – objaśnienie; kliknij warunek lub pasek – jak obliczono. Raport obejmuje odhaczone sprawdzenia.</span></div>`;
  html += `<div class="tscroll"><table class="ctab"><thead><tr><th class="tk" title="Sprawdzone">✓</th><th>Sprawdzenie</th><th>Punkt normy</th><th style="text-align:right">Warunek</th><th>Wykorzystanie</th><th>Status</th><th>Kombinacja / miejsce</th><th class="nt">Uwagi</th></tr></thead><tbody>`;
  let grp = '';
  c.forEach((x, i) => {
    if (x.grp !== grp) { grp = x.grp; html += `<tr class="g"><td colspan="8">${esc(grp)}</td></tr>`; }
    const on = !!ticks[x.key];
    html += `<tr class="${on ? 'done' : ''}" data-ci="${i}"><td class="tk"><input type="checkbox" data-tick="${i}" ${on ? 'checked' : ''} aria-label="sprawdzone"></td><td>${sym(x.name)}</td><td class="ref"><button class="nref" data-ref="${i}" title="Objaśnienie punktu normy">${esc(x.ref)}</button></td><td class="val">${ckCond(x)}</td><td class="bar" style="white-space:nowrap">${utilBar(x)}</td><td class="stc"><span class="st ${x.status}">${STL[x.status]}</span>${x.status === 'fail' || x.status === 'warn' ? `<button class="goto" data-goto="${i}" title="Przejdź do miejsca, którego dotyczy warunek">pokaż →</button>` : ''}</td><td class="cb">${esc(x.combo || '')}${x.x !== undefined && x.x !== null && x.combo ? `<br>x = ${fmt(x.x, 2)} m` : ''}</td><td class="nt">${x.note ? sym(x.note) : ''}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  el.innerHTML = html;
  const upd = () => { const n = c.filter(x => (S.meta.ticks || {})[x.key]).length; $('#tickCnt', el).innerHTML = `Odhaczono: <b>${n}</b> z ${c.length}`; };
  const setTick = (x, v) => { S.meta.ticks = S.meta.ticks || {}; if (v) S.meta.ticks[x.key] = true; else delete S.meta.ticks[x.key]; };
  $$('[data-tick]', el).forEach(cb => cb.addEventListener('change', () => { const x = c[+cb.dataset.tick]; setTick(x, cb.checked); cb.closest('tr').classList.toggle('done', cb.checked); upd(); dirty = true; updateTitle(); autosave(); rendered.report = false; }));
  $('#tickOk', el).onclick = () => { c.forEach(x => { if (x.status !== 'fail') setTick(x, true); }); dirty = true; updateTitle(); autosave(); rendered.report = false; renderSummary(el); };
  $('#tickClr', el).onclick = () => { S.meta.ticks = {}; dirty = true; updateTitle(); autosave(); rendered.report = false; renderSummary(el); };
  $$('[data-ref]', el).forEach(b => b.addEventListener('click', () => normPopup(c[+b.dataset.ref])));
  $$('tr[data-ci] td.val, tr[data-ci] td.bar', el).forEach(td => { td.classList.add('xclick'); td.title = 'Kliknij – jak obliczono (wzór, podstawienie, punkt normy)'; td.addEventListener('click', () => explainPopup(c[+td.closest('tr').dataset.ci])); });
  $$('[data-goto]', el).forEach(b => b.addEventListener('click', () => gotoCheck(c[+b.dataset.goto])));
  $$('[data-goto2]', el).forEach(b => b.addEventListener('click', () => gotoCheck(c[+b.dataset.goto2])));
}
const normLab = k => /^fi/.test(k) ? `PN-EN 1995-1-2, ${k.slice(2)}` : /^1990-/.test(k) ? `PN-EN 1990, ${k.slice(5)}` : /^ec2-/.test(k) ? `PN-EN 1992-1-1, ${k.slice(4)}` : k === 'slim' ? 'Praktyka projektowa' : k === 'conn' ? 'PN-EN 1995-1-1, rozdz. 8' : `PN-EN 1995-1-1, ${/^C/.test(k) ? 'zał. ' : 'pkt '}${k}`;
function normBody(keys) {
  return keys.filter(k => window.SDN.N[k]).map(k => { const e = window.SDN.N[k]; return `<div class="nsec"><div class="nlab">${esc(normLab(k))}</div><h4>${e.t}</h4><p>${e.s}</p>${e.f ? `<div class="nf">${e.f}</div>` : ''}${e.h ? `<div class="nh"><b>Podpowiedź:</b> ${e.h}</div>` : ''}</div>`; }).join('');
}
function normPopup(x) {
  const keys = window.SDN.find(x.ref, x.grp);
  const m = $('#modal');
  let body = normBody(keys); if (!body) body = `<p>Brak objaśnienia dla odnośnika „${esc(x.ref)}”.</p>`;
  const cond = ckCond(x);
  m.innerHTML = `<div class="dlg norm"><h3>[${esc(x.ref)}]</h3><div class="ncur"><b>W tym projekcie:</b> ${sym(x.name)}${cond ? ` – ${cond}` : ''}${x.status !== 'info' && isFinite(x.ratio) ? `, wykorzystanie ${fmt(x.ratio * 100, 0)}%` : ''} · <span class="st ${x.status}">${STL[x.status]}</span>${x.note ? `<br><small>${sym(x.note)}</small>` : ''}</div>${body}<p class="ndisc">Streszczenie i podpowiedź opracowane na potrzeby programu – nie zastępują treści norm (z Załącznikami Krajowymi).</p><div class="dbtn"><button class="btn" id="nXp">Jak obliczono…</button><span class="sp"></span><button class="btn pri" id="nClose">Zamknij</button></div></div>`;
  m.style.display = 'flex';
  $('#nClose', m).onclick = () => { m.style.display = 'none'; };
  $('#nXp', m).onclick = () => explainPopup(x);
  $('#nClose', m).focus();
}
function explainPopup(x) {
  const m = $('#modal');
  let h = ''; try { h = window.SDR.explain(R, S, x); } catch (e) { console.error(e); h = `<p>Brak szczegółów (${esc(e.message)}).</p>`; }
  m.innerHTML = `<div class="dlg mid"><h3>Jak obliczono: ${sym(x.name)}</h3><div class="xp">${h}</div><div class="dbtn"><button class="btn" id="xNorm">Punkt normy [${esc(x.ref)}]</button><button class="btn" id="xGo">Pokaż miejsce →</button><span class="sp"></span><button class="btn pri" id="xClose">Zamknij</button></div></div>`;
  m.style.display = 'flex';
  $('#xClose', m).onclick = () => { m.style.display = 'none'; };
  $('#xNorm', m).onclick = () => normPopup(x);
  $('#xGo', m).onclick = () => { m.style.display = 'none'; gotoCheck(x); };
}
function gotoCheck(c) {
  const id = c.id;
  const map = { c0: 'sec', t0: 'sec', cb: 'sec', tb: 'sec', v: 'chart', b1: 'stab', b2: 'stab', b0: 'stab', II: 'stab', IIinfo: 'stab', b12info: 'stab', ltb: 'stab', ltb0: 'stab', slim: 'stab', spc: 'stab', spm: 'stab', spT: 'stab', bry: 'stab', brz: 'stab', uinst: 'chart', ufin: 'chart', dl: 'chart', fic: 'sec', fim: 'sec', filtb: 'sec', fiv: 'sec', fi0: 'sec' };
  const grpMap = { c90b: 'conn', c90t: 'conn', conc: 'conn', upl: 'load', Vb: 'conn', Mb: 'geo', slim: 'geo', spc: 'geo', b1: 'geo', b2: 'geo', fic: 'fire', fi0: 'fire', uinst: 'sls', ufin: 'sls' };
  if (c.status === 'fail' && grpMap[id]) { goData(grpMap[id]); return; }
  U.selectTab(map[id] || 'data');
  if (!map[id] && grpMap[id]) goData(grpMap[id]);
}
function goData(gid) {
  U.selectTab('data');
  const d = $(`details.grp[data-g="${gid}"]`); if (!d) return;
  d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); d.classList.remove('flash'); void d.offsetWidth; d.classList.add('flash');
}

/* -------------------------------------------------------------- raport */
const wrapPrint = html => `<table class="pwrap"><thead><tr><td><div class="psp"></div></td></tr></thead><tfoot><tr><td><div class="psp"></div></td></tr></tfoot><tbody><tr><td class="pbody">${html}</td></tr></tbody></table>`;
const repMode = () => (S.meta && S.meta.repMode === 'static' ? 'static' : 'full');
const repView = () => (S.meta && S.meta.repMode === 'own' ? 'own' : repMode());
const repBuild = () => { const h = repMode() === 'static' ? window.SDR.buildStatic(R, S) : window.SDR.build(R, S); return S.meta.refs ? h : window.SDR.noRefs(h); };
function renderReport(el) {
  const tools = ART
    ? (Cap.dl ? `<button class="btn pri" id="bExp">Pobierz raport (HTML)</button><button class="btn" id="bOdt">Pobierz .odt (edytowalny)</button>` : `<p class="hint keep">Pobieranie plików nie jest dostępne w tym widoku – raport możesz przeczytać poniżej.</p>`)
    : `<button class="btn" id="bExp">Zapisz raport HTML…</button><button class="btn" id="bOdt" title="Raport do edycji: OpenDocument Text (.odt) – LibreOffice Writer, MS Word">Zapisz .odt (edytowalny)…</button><button class="btn pri" id="bPrint">Drukuj / zapisz PDF</button>`;
  const mode = repMode();
  const seg = `<div class="segsw" role="tablist" aria-label="Rodzaj raportu"><button data-rm="full" class="${mode === 'full' && repView() !== 'own' ? 'on' : ''}" title="Pełny tok obliczeń: dane, materiał, obciążenia i kombinacje, statyka, wszystkie sprawdzenia ze wzorami i podstawieniami">Raport pełny</button><button data-rm="static" class="${mode === 'static' && repView() !== 'own' ? 'on' : ''}" title="Dane, schemat, obciążenia, kombinacje, wykresy sił wewnętrznych i reakcje">Statyka</button><button data-rm="own" class="${repView() === 'own' ? 'on' : ''}" title="Raport do własnej edycji – zapisywany w projekcie">Raport własny</button></div><label class="chk" title="Pokaż numery punktów, wzorów i tablic norm w raporcie"><input type="checkbox" id="bRefs"${S.meta.refs ? ' checked' : ''}> odwołania do norm</label>`;
  const bindSeg = () => { $$('[data-rm]', el).forEach(b => b.addEventListener('click', () => { S.meta.repMode = b.dataset.rm; dirty = true; updateTitle(); autosave(); renderReport(el); })); const rf = $('#bRefs', el); if (rf) rf.onchange = () => { S.meta.refs = rf.checked; dirty = true; updateTitle(); autosave(); renderReport(el); }; };
  if (repView() === 'own') { renderOwn(el, seg); bindSeg(); return; }
  el.innerHTML = `<div class="rtools">${seg}<span class="sp"></span>${tools}</div><div id="report">${wrapPrint(repBuild())}</div>`;
  bindSeg();
  const bp = $('#bPrint', el), be = $('#bExp', el), bo = $('#bOdt', el);
  if (bp) bp.onclick = doPrint; if (be) be.onclick = exportHTML; if (bo) bo.onclick = exportODT;
}
function cleanHTML(html) {
  const t = document.createElement('template'); t.innerHTML = html || '';
  t.content.querySelectorAll('script, iframe, object, embed, link, meta, base, form, input, button, select, textarea').forEach(n => n.remove());
  t.content.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value)) || a.name === 'contenteditable') n.removeAttribute(a.name); }));
  return t.innerHTML;
}
let ownT = 0;
function renderOwn(el, seg) {
  const own = S.meta.ownOn === true;
  if (!own && (!R || (R.errors && R.errors.length))) { el.innerHTML = `<div class="rtools">${seg || ''}</div>` + errBox(); return; }
  const B = (cmd, lab, tit, val) => `<button data-oc="${cmd}"${val ? ` data-ov="${val}"` : ''} title="${tit}">${lab}</button>`;
  const exp = ART ? (Cap.dl ? `<button class="btn" id="oExp">Pobierz HTML</button><button class="btn" id="oOdt">Pobierz .odt</button>` : '') : `<button class="btn" id="oExp">Zapisz HTML…</button><button class="btn" id="oOdt" title="OpenDocument Text – LibreOffice Writer, MS Word">Zapisz .odt…</button><button class="btn pri" id="oPrint">Drukuj / PDF</button>`;
  const stTxt = 'Raport własny – zapisywany w projekcie przy każdej zmianie; nie zmienia się po zmianie danych (aktualne obliczenia: „Wstaw raport pełny” / „Wstaw statykę”).';
  el.innerHTML = `<div class="rtools">${seg || ''}<span class="sp"></span>${exp}</div><div class="rtools owntools">
      <span class="grp">${B('bold', '<b>B</b>', 'Pogrubienie (Ctrl+B)')}${B('italic', '<i>I</i>', 'Kursywa (Ctrl+I)')}${B('underline', '<u>U</u>', 'Podkreślenie (Ctrl+U)')}${B('removeFormat', 'T̸', 'Usuń formatowanie zaznaczenia')}</span>
      <span class="grp">${B('formatBlock', 'H1', 'Tytuł', 'h1')}${B('formatBlock', 'H2', 'Nagłówek rozdziału', 'h2')}${B('formatBlock', 'H3', 'Podtytuł', 'h3')}${B('formatBlock', '¶', 'Zwykły akapit', 'p')}${B('insertUnorderedList', '•', 'Lista punktowana')}${B('insertOrderedList', '1.', 'Lista numerowana')}</span>
      <span class="grp">${B('undo', '↶', 'Cofnij (Ctrl+Z)')}${B('redo', '↷', 'Ponów (Ctrl+Y)')}</span>
      <button class="btn sm" id="oIns">Wstaw raport pełny</button><button class="btn sm" id="oInsS">Wstaw statykę</button><button class="btn sm" id="oDate">Wstaw datę</button>
      <button class="btn sm" id="oReset" ${own ? '' : 'disabled'}>Przywróć raport obliczeń</button><button class="btn sm" id="oClr">Wyczyść</button></div>
    <p class="ownstate" id="oState">${own ? stTxt : 'Podgląd bieżącego raportu obliczeń – kliknij w tekst i pisz albo usuwaj; po pierwszej zmianie raport staje się Twoją kopią zapisywaną w projekcie.'}</p>
    <div class="ownwrap">${wrapPrint(`<div id="ownrep" contenteditable="true" spellcheck="true" lang="pl">${own ? cleanHTML(S.meta.own || '') : repBuild()}</div>`)}</div>`;
  const ed = $('#ownrep', el), st = $('#oState', el);
  const save = () => { clearTimeout(ownT); ownT = setTimeout(() => { S.meta.own = ed.innerHTML; S.meta.ownOn = true; dirty = true; updateTitle(); autosave(); st.textContent = stTxt; const rb = $('#oReset', el); if (rb) rb.disabled = false; }, 350); };
  ed.addEventListener('input', save);
  ed.addEventListener('focus', () => { try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* */ } });
  $$('[data-oc]', el).forEach(b => { b.addEventListener('mousedown', ev => ev.preventDefault()); b.addEventListener('click', () => { ed.focus(); try { document.execCommand(b.dataset.oc, false, b.dataset.ov ? `<${b.dataset.ov}>` : null); } catch (e) { /* */ } save(); }); });
  const insertAtCaret = html => {
    const sel = window.getSelection(), inEd = sel && sel.rangeCount && ed.contains(sel.getRangeAt(0).commonAncestorContainer);
    const t = document.createElement('template'); t.innerHTML = html; const frag = t.content;
    const isBlock = [...frag.childNodes].some(n => n.nodeType === 1 && /^(h[1-6]|div|table|p|ul|ol)$/i.test(n.tagName) && !(frag.childNodes.length === 1 && /^p$/i.test(n.tagName)));
    if (inEd && isBlock) { let top = sel.getRangeAt(0).startContainer; while (top && top.parentNode !== ed) top = top.parentNode; if (top && top !== ed) ed.insertBefore(frag, top.nextSibling); else ed.appendChild(frag); }
    else if (inEd) { const r = sel.getRangeAt(0); r.deleteContents(); r.insertNode(frag); r.collapse(false); } else ed.appendChild(frag);
    save();
  };
  const insRep = kind => { if (!R || (R.errors && R.errors.length)) { toast('Usuń błędy danych – raport obliczeń jest niedostępny.'); return; } const h = kind === 'static' ? window.SDR.buildStatic(R, S) : window.SDR.build(R, S); insertAtCaret(S.meta.refs ? h : window.SDR.noRefs(h)); toast(kind === 'static' ? 'Wstawiono raport statyki.' : 'Wstawiono raport obliczeń.', 1800); };
  $('#oIns', el).onclick = () => insRep('full'); $('#oInsS', el).onclick = () => insRep('static');
  $('#oDate', el).onclick = () => { const d = new Date(); insertAtCaret(`<p>${esc(S.meta.name || '')} – ${d.toLocaleDateString('pl-PL')}</p>`); };
  $('#oReset', el).onclick = async () => { if (!(await ask('Usunąć własne zmiany? Raport własny znowu pokaże bieżący raport obliczeń.', 'Przywróć', true))) return; S.meta.own = ''; S.meta.ownOn = false; dirty = true; updateTitle(); autosave(); renderReport(el); };
  $('#oClr', el).onclick = async () => { if (!(await ask('Usunąć całą treść raportu własnego?', 'Wyczyść', true))) return; S.meta.own = ''; S.meta.ownOn = true; dirty = true; updateTitle(); autosave(); renderReport(el); };
  const bp = $('#oPrint', el); if (bp) bp.onclick = () => setTimeout(() => window.print(), 50);
  const be = $('#oExp', el); if (be) be.onclick = () => exportOwn('html');
  const bo = $('#oOdt', el); if (bo) bo.onclick = () => exportOwn('odt');
}
function ownHTML() { const ed = $('#ownrep'); return ed ? ed.innerHTML : (S.meta.ownOn ? cleanHTML(S.meta.own || '') : repBuild()); }
async function exportOwn(kind) {
  const html = ownHTML(), title = (S.meta.name || 'Słup') + ' – raport';
  if (kind === 'html') { await saveOut(safeName(' – raport własny.html'), reportDoc(html, title), 'html', 'text/html', 'Raport pobrany – otwórz go i wydrukuj (Ctrl+P).'); return; }
  await saveODT(html, title, safeName(' – raport własny.odt'));
}

/* ------------------------------------------------- kolory rysunków (motyw) */
function setTheme(t) {
  const r = document.documentElement;
  if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t); else r.removeAttribute('data-theme');
  try { localStorage.setItem('slup-theme', t || ''); } catch (e) { /* */ }
}
function cycleTheme() { const cur = document.documentElement.getAttribute('data-theme') || ''; const nx = cur === '' ? 'dark' : cur === 'dark' ? 'light' : ''; setTheme(nx); toast(nx === 'dark' ? 'Motyw ciemny' : nx === 'light' ? 'Motyw jasny' : 'Motyw systemowy', 1200); }

/* ------------------------------------------------------------- host / pliki */
const ART = !!window.__ARTIFACT;
const Cap = { dl: null, db: null, col: null, uid: null, list: [], ready: false, slow: false, err: null };
let cloudId = null, cloudName = '';
const pending = {}; let reqId = 0;
window.__hostReply = (id, res) => { const p = pending[id]; if (p) { delete pending[id]; p(res); } };
function hostCall(op, args) {
  return new Promise(res => {
    const id = ++reqId; pending[id] = res;
    try { window.hostRequest(JSON.stringify(Object.assign({ id, op }, args))); } catch (e) { delete pending[id]; res({ ok: false, err: String(e) }); }
  });
}
const inHost = () => typeof window.hostRequest === 'function';
function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => { t.style.display = 'none'; }, ms || 2600); }
U.toast = toast;
function baseName(p) { return (p || '').split(/[\\/]/).pop(); }
const safeName = ext => (S.meta.name || 'slup').replace(/[\\/:*?"<>|]+/g, '_').trim() + ext;
function updateTitle() {
  if (ART) { const lab = cloudId ? '☁ ' + (cloudName || 'projekt') : (filePath ? baseName(filePath) : 'nowy projekt'); $('#fileName').textContent = (dirty ? '● ' : '') + lab; return; }
  const fn = filePath ? baseName(filePath) : 'bez nazwy';
  $('#fileName').textContent = (dirty ? '● ' : '') + fn;
  const t = `SłupDrewniany – ${S.meta.name || 'słup'} [${fn}${dirty ? ' *' : ''}]`;
  document.title = t;
  if (typeof window.hostTitle === 'function') { try { window.hostTitle(t); } catch (e) { /* */ } }
}
// kilka słupów w projekcie (zakładki 1…10): każdy z własnymi danymi i obliczeniami; plik projektu zawiera wszystkie
let BEAMS = null, curB = 0;
const beamsSync = () => { if (!BEAMS) BEAMS = [S]; BEAMS[curB] = S; };
const beamsOut = () => { beamsSync(); return BEAMS.length > 1 ? { cols: BEAMS.map(b => b), cur: curB } : {}; };
function beamsIn(o, st) {
  if (o && Array.isArray(o.cols) && o.cols.length > 1) { BEAMS = o.cols.slice(0, 10).map(b => E.normalize(b)); curB = Math.max(0, Math.min(BEAMS.length - 1, +o.cur || 0)); return BEAMS[curB]; }
  BEAMS = null; curB = 0; return st;
}
function switchBeam(i) { beamsSync(); if (i === curB || !BEAMS[i]) return; curB = i; S = BEAMS[i]; prevStat = null; $('#projName').value = S.meta.name || ''; renderInputs(); renderAutoBar(); recalc(); updateTitle(); autosave(); }
function addBeam() {
  beamsSync(); if (BEAMS.length >= 10) { toast('Maksymalnie 10 słupów w projekcie.'); return; }
  const n = E.defaultState(); ['mat', 'coef', 'sls', 'fire', 'conn'].forEach(k => { n[k] = JSON.parse(JSON.stringify(S[k])); }); n.meta.name = `Słup S-${BEAMS.length + 1}`;
  BEAMS.push(E.normalize(n)); dirty = true; switchBeam(BEAMS.length - 1);
}
function delBeam(i) { beamsSync(); if (BEAMS.length < 2) return; BEAMS.splice(i, 1); if (i < curB) curB--; curB = Math.min(curB, BEAMS.length - 1); S = BEAMS[curB]; dirty = true; $('#projName').value = S.meta.name || ''; prevStat = null; renderInputs(); recalc(); updateTitle(); autosave(); }
function beamTabsHTML() {
  beamsSync();
  return `<div class="beamtabs" role="tablist" aria-label="Słupy w projekcie">${BEAMS.map((b, i) => `<button class="btab ${i === curB ? 'on' : ''}" data-btab="${i}" title="${esc(b.meta.name || 'Słup ' + (i + 1))} – kliknij, aby przełączyć; dwuklik – zmiana nazwy">${i + 1}<span>${esc((b.meta.name || '').slice(0, 14))}</span>${i === curB && BEAMS.length > 1 ? `<i data-bdel="${i}" title="Usuń ten słup">×</i>` : ''}</button>`).join('')}${BEAMS.length < 10 ? '<button class="btab add" data-badd="1" title="Dodaj kolejny słup (maks. 10) – osobne dane i obliczenia">+</button>' : ''}</div>`;
}
document.addEventListener('click', async e => {
  const d = e.target.closest && e.target.closest('[data-bdel]'); if (d) { e.stopPropagation(); const i = +d.dataset.bdel; if (await ask(`Usunąć słup „${esc(BEAMS[i].meta.name || i + 1)}” z projektu?`, 'Usuń')) delBeam(i); return; }
  const t = e.target.closest && e.target.closest('[data-btab]'); if (t) { switchBeam(+t.dataset.btab); return; }
  if (e.target.closest && e.target.closest('[data-badd]')) addBeam();
});
document.addEventListener('dblclick', e => { const t = e.target.closest && e.target.closest('[data-btab]'); if (!t) return; const i = +t.dataset.btab; if (i !== curB) switchBeam(i); const f = $('#projName'); if (f) { f.focus(); f.select(); } });
let asT = null;
function autosave() {
  clearTimeout(asT);
  asT = setTimeout(() => {
    const data = JSON.stringify(Object.assign({ state: S, filePath, cloudId, cloudName }, beamsOut()));
    if (typeof window.hostStore === 'function') { try { window.hostStore(data); } catch (e) { /* */ } }
    else { try { localStorage.setItem('slupdrewniany-autosave', data); } catch (e) { /* */ } }
  }, 600);
}
function projectJSON() { return JSON.stringify(Object.assign({ app: 'SlupDrewniany', version: 1, saved: new Date().toISOString(), state: S }, beamsOut()), null, 2); }
function ask(msg, okLabel, danger) {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="dlg sm"><p>${msg}</p><div class="dbtn"><button class="btn" data-a="0">Anuluj</button><button class="btn ${danger ? 'dng' : 'pri'}" data-a="1">${okLabel}</button></div></div>`;
    m.style.display = 'flex';
    const done = v => { m.style.display = 'none'; m.onclick = null; document.removeEventListener('keydown', kd, true); res(v); };
    const kd = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    document.addEventListener('keydown', kd, true);
    m.onclick = e => { const b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === '1'); else if (e.target === m) done(false); };
    $('[data-a="1"]', m).focus();
  });
}
async function offerFile(name, data, okMsg) {
  if (!Cap.dl) { toast('Pobieranie plików nie jest dostępne w tym widoku.'); return false; }
  try { await Cap.dl.save({ filename: name, data }); toast(okMsg); return true; }
  catch (e) { const c = e && e.code; if (c === 'declined') return false; toast(c === 'rate_limited' ? 'Poczekaj chwilę – poprzednie pobieranie jeszcze trwa.' : 'Nie udało się pobrać pliku' + (c ? ` (${c})` : '') + '.'); return false; }
}
function download(name, content, mime) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: mime + ';charset=utf-8' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
// zapis pliku wynikowego: host (okno zapisu), artefakt (pobieranie) lub przeglądarka
async function saveOut(name, content, filter, mime, okMsg) {
  if (inHost()) { const r = await hostCall('save', { path: '', name, content, filter }); if (r && r.ok) toast('Zapisano: ' + baseName(r.path)); else if (r && r.err) toast('Błąd: ' + r.err); }
  else if (ART) await offerFile(name, content, okMsg || 'Plik pobrany.');
  else download(name, content, mime);
}
async function saveODT(html, title, name) {
  toast('Tworzenie pliku .odt…', 1500);
  let u; try { u = await window.SDR.odt(html, title); } catch (e) { console.error(e); toast('Błąd tworzenia .odt: ' + e.message); return; }
  if (inHost()) { let b = ''; for (let i = 0; i < u.length; i += 0x8000) b += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); const r = await hostCall('save', { path: '', name, content: btoa(b), b64: true, filter: 'odt' }); if (r && r.ok) toast('Zapisano raport: ' + baseName(r.path)); else if (r && r.err) toast('Błąd: ' + r.err); return; }
  const blob = new Blob([u], { type: 'application/vnd.oasis.opendocument.text' });
  if (ART) { await offerFile(name, blob, 'Raport .odt pobrany – otwórz w edytorze tekstu.'); return; }
  download(name, blob);
}
async function saveFile(as) {
  if (inHost()) {
    const r = await hostCall('save', { path: as ? '' : filePath, name: safeName('.slup'), content: projectJSON(), filter: 'project' });
    if (r && r.ok) { filePath = r.path; dirty = false; updateTitle(); autosave(); toast('Zapisano: ' + baseName(filePath)); } else if (r && r.err) toast('Błąd zapisu: ' + r.err);
  } else if (ART) {
    if (Cap.col && !as) { await cloudSave(false); return; }
    if (await offerFile(safeName('.json'), projectJSON(), 'Plik projektu pobrany.')) { dirty = false; updateTitle(); }
    else if (!Cap.dl && !Cap.col) toast('Zapis niedostępny w tym widoku – zmiany są pamiętane tylko w tej przeglądarce.', 4000);
  } else { download(safeName('.slup'), projectJSON(), 'application/json'); dirty = false; updateTitle(); }
}
function applyState(st, path, quiet) {
  S = E.normalize(st); if (BEAMS) BEAMS[curB] = S; filePath = path || ''; dirty = false; prevStat = null;
  $('#projName').value = S.meta.name || '';
  renderInputs(); renderAutoBar(); recalc(); updateTitle(); autosave();
  if (!quiet) toast('Wczytano: ' + (baseName(path) || S.meta.name || 'projekt'));
}
function loadProject(text, path) {
  let o; try { o = JSON.parse(text); } catch (e) { toast('To nie jest plik projektu SłupDrewniany (.slup / .json).'); return; }
  if (!o || (o.app && o.app !== 'SlupDrewniany')) { toast('To nie jest plik projektu SłupDrewniany.'); return; }
  cloudId = null; cloudName = '';
  applyState(beamsIn(o, o.state || o), path);
}
async function openFile() {
  if (dirty && !(await ask('Niezapisane zmiany zostaną utracone. Otworzyć inny projekt?', 'Otwórz'))) return;
  if (inHost()) { const r = await hostCall('open', { filter: 'project' }); if (r && r.ok) loadProject(r.content, r.path); else if (r && r.err) toast('Błąd odczytu: ' + r.err); }
  else { const inp = $('#fileIn'); inp.value = ''; inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then(t => loadProject(t, f.name)); }; inp.click(); }
}
async function newProject() {
  if (dirty && !(await ask('Niezapisane zmiany zostaną utracone. Utworzyć nowy projekt?', 'Nowy projekt'))) return;
  cloudId = null; cloudName = '';
  S = E.defaultState(); BEAMS = null; curB = 0; filePath = ''; dirty = false; prevStat = null;
  $('#projName').value = S.meta.name; renderInputs(); renderAutoBar(); recalc(); updateTitle(); autosave();
}
function reportDoc(body, title) {
  const cssEl = $('#appcss'); const css = cssEl ? cssEl.textContent : '';
  return `<!doctype html><html lang="pl" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title || 'Raport – ' + S.meta.name)}</title><style>${css}\nhtml,body{height:auto}body{overflow:auto;padding:20px 16px;background:#fff}.rtools{margin-bottom:14px}@media print{body{padding:0}}</style></head><body>` +
    `<div class="rtools"><button class="btn pri" onclick="window.print()">Drukuj / zapisz PDF</button><span class="hint" style="margin-left:10px">Nagłówki i stopki przeglądarki są wyłączone przez ustawienia strony raportu.</span></div><div id="report">${wrapPrint(body !== undefined ? body : repBuild())}</div></body></html>`;
}
async function exportHTML() {
  if (repView() === 'own') return exportOwn('html');
  if (!R || R.errors.length) { toast('Usuń błędy danych przed eksportem raportu.'); return; }
  await saveOut(safeName(repMode() === 'static' ? ' – statyka.html' : ' – raport.html'), reportDoc(), 'html', 'text/html', 'Raport pobrany – otwórz go i wydrukuj (Ctrl+P).');
}
async function exportODT() {
  if (repView() === 'own') return exportOwn('odt');
  if (!R || (R.errors && R.errors.length)) { toast('Usuń błędy danych przed eksportem raportu.'); return; }
  await saveODT(repBuild(), (S.meta.name || 'Słup') + (repMode() === 'static' ? ' – statyka' : ' – raport obliczeń'), safeName(repMode() === 'static' ? ' – statyka.odt' : ' – raport.odt'));
}
async function exportDXF() {
  if (!R || R.errors.length) { toast('Usuń błędy danych przed eksportem rysunku.'); return; }
  let txt; try { txt = window.SDD.build(R, S); } catch (e) { console.error(e); toast('Błąd tworzenia DXF: ' + e.message); return; }
  await saveOut(safeName(' – rysunek.dxf'), txt, 'dxf', 'application/dxf', 'Rysunek DXF pobrany.');
}
function doPrint() {
  if (ART) { U.selectTab('report'); if (Cap.dl) exportHTML(); return; }
  U.selectTab('report');
  setTimeout(() => window.print(), 80);
}

/* --------------------------------------------- moje projekty (konto, db) – wersja przeglądarkowa */
async function initCapabilities() {
  if (!ART || !window.claude || typeof window.claude.use !== 'function') return;
  window.claude.use('downloads').then(dl => { Cap.dl = dl || null; $('#bExport').hidden = !Cap.dl; if (rendered.report) { rendered.report = false; renderActive(); } }, () => { /* */ });
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const uid = await user.id(); if (!uid) return;
    Cap.db = db; Cap.uid = uid; Cap.col = db.collection('data/users/' + uid);
    $('#bCloud').hidden = false;
    const tmo = setTimeout(() => { if (!Cap.ready) { Cap.slow = true; renderCloud(); } }, 10000);
    Cap.col.orderBy('saved', 'desc').onSnapshot(snap => { Cap.list = snap.docs.filter(d => d.exists).map(d => Object.assign({ id: d.id }, d.data())); if (!snap.metadata.fromCache) { Cap.ready = true; Cap.slow = false; clearTimeout(tmo); } renderCloud(); }, e => { Cap.err = e && e.code; Cap.ready = true; clearTimeout(tmo); renderCloud(); });
  } catch (e) { /* bez zapisu na koncie */ }
}
const fmtDate = iso => { try { const d = new Date(iso); return d.toLocaleDateString('pl-PL') + ' ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
let cloudOpen = false;
function openCloud() { cloudOpen = true; renderCloud(); $('#modal').style.display = 'flex'; }
function renderCloud() {
  if (!cloudOpen) return;
  const m = $('#modal');
  let list;
  if (Cap.err) list = `<p class="pempty">Nie udało się odczytać zapisanych projektów (${esc(Cap.err)}). Zapis do pliku nadal działa.</p>`;
  else if (!Cap.ready && !Cap.list.length) list = `<p class="pempty">${Cap.slow ? 'Nie można teraz połączyć się z zapisanymi projektami. Spróbuj za chwilę.' : 'Wczytywanie zapisanych projektów…'}</p>`;
  else if (!Cap.list.length) list = `<p class="pempty">Nie masz jeszcze zapisanych projektów. Kliknij „Zapisz bieżący”.</p>`;
  else list = `<ul class="plist">${Cap.list.map(p => `<li class="${p.id === cloudId ? 'cur' : ''}"><div class="pn"><b>${esc(p.name || 'bez nazwy')}</b><small>zapisano ${esc(fmtDate(p.saved))}${p.summary ? ' · ' + esc(p.summary) : ''}</small></div><button class="btn" data-po="${esc(p.id)}">Otwórz</button><button class="btn dng" data-pd="${esc(p.id)}">Usuń</button></li>`).join('')}</ul>`;
  m.innerHTML = `<div class="dlg"><h3>Moje projekty</h3><p>Projekty zapisane na Twoim koncie – widoczne tylko dla Ciebie.</p><div class="dbtn" style="justify-content:flex-start;position:static"><button class="btn pri" id="pcSave">${cloudId ? 'Zapisz zmiany' : 'Zapisz bieżący'}</button>${cloudId ? '<button class="btn" id="pcNew">Zapisz jako nowy</button>' : ''}${Cap.dl ? '<button class="btn" id="pcFile">Pobierz plik .json</button>' : ''}</div>${list}<div class="dbtn"><button class="btn" id="pcClose">Zamknij</button></div></div>`;
  m.style.display = 'flex';
  $('#pcClose', m).onclick = () => { cloudOpen = false; m.style.display = 'none'; };
  $('#pcSave', m).onclick = () => cloudSave(false);
  if ($('#pcNew', m)) $('#pcNew', m).onclick = () => cloudSave(true);
  if ($('#pcFile', m)) $('#pcFile', m).onclick = () => offerFile(safeName('.json'), projectJSON(), 'Plik projektu pobrany.');
  $$('[data-po]', m).forEach(b => { b.onclick = () => cloudLoad(b.dataset.po); });
  $$('[data-pd]', m).forEach(b => { b.onclick = () => cloudDelete(b.dataset.pd); });
}
const summaryLine = () => `${secName()} mm, L = ${String(S.geom.L).replace('.', ',')} m, ${S.mat.cls}` + (R && R.checks ? (R.ok ? ' · OK' : ' · niespełnione warunki') : '');
let cloudBusy = false;
async function cloudSave(asNew) {
  if (!Cap.col || cloudBusy) return; cloudBusy = true;
  const ref = (!asNew && cloudId) ? Cap.col.doc(cloudId) : Cap.col.doc();
  const body = JSON.parse(JSON.stringify(Object.assign({ app: 'SlupDrewniany', version: 1, name: S.meta.name || 'bez nazwy', saved: new Date().toISOString(), summary: summaryLine(), state: S }, beamsOut())));
  try {
    try { await ref.set(body); } catch (e) { if (e && e.code === 'unavailable') { await new Promise(r => setTimeout(r, 600)); await ref.set(body); } else throw e; }
    cloudId = ref.id; cloudName = body.name; dirty = false; updateTitle(); autosave(); toast('Zapisano na koncie: ' + body.name); renderCloud();
  } catch (e) { const c = e && e.code; toast(c === 'quota_exceeded' ? 'Brak miejsca na kolejne projekty – usuń niepotrzebne.' : 'Nie udało się zapisać' + (c ? ` (${c})` : '') + '.', 4000); }
  finally { cloudBusy = false; }
}
async function cloudLoad(id) {
  const p = Cap.list.find(x => x.id === id); if (!p) return;
  if (dirty && id !== cloudId && !(await ask('Niezapisane zmiany zostaną utracone. Otworzyć projekt „' + esc(p.name || '') + '”?', 'Otwórz'))) { renderCloud(); return; }
  cloudOpen = false; $('#modal').style.display = 'none'; cloudId = p.id; cloudName = p.name || '';
  applyState(beamsIn(p, p.state || {}), '', true); toast('Otwarto: ' + (p.name || 'projekt'));
}
async function cloudDelete(id) {
  const p = Cap.list.find(x => x.id === id); if (!p) return;
  if (await ask(`Usunąć projekt „${esc(p.name || 'bez nazwy')}” z konta? Tej operacji nie można cofnąć.`, 'Usuń', true)) {
    try { await Cap.col.doc(id).delete(); if (id === cloudId) { cloudId = null; cloudName = ''; updateTitle(); autosave(); } toast('Usunięto projekt.'); } catch (e) { toast('Nie udało się usunąć projektu.'); }
  }
  openCloud();
}

function about() {
  const m = $('#modal');
  m.innerHTML = `<div class="dlg"><h3>SłupDrewniany 1.0 – słupy drewniane wg Eurokodu 5</h3>
  <p>Wymiarowanie i sprawdzanie słupów drewnianych wg PN-EN 1995-1-1 (z Załącznikiem Krajowym PL), odporność ogniowa wg PN-EN 1995-1-2 (metoda zredukowanego przekroju), kombinacje wg PN-EN 1990, klasy drewna wg PN-EN 338:2016 i PN-EN 14080:2013, obciążenia wg PN-EN 1991-1-1, -1-3, -1-4 (generatory).</p>
  <ul>
  <li><b>Przekroje</b> – prostokątne (lite, klejone, LVL), okrągłe, wielogałęziowe z przekładkami lub nakładkami (zał. C.3); osłabienia otworami.</li>
  <li><b>Statyka</b> – MES w dwóch płaszczyznach: podstawa przegubowa lub utwierdzona (także podatnie), głowica swobodna, przegubowa, utwierdzona lub przesuwna, stężenia pośrednie; siły osiowe z mimośrodami, siły i momenty w głowicy, obciążenia rozłożone na całej wysokości lub odcinku, siły na dowolnej wysokości, ciężar własny.</li>
  <li><b>Kombinacje</b> – 6.10 albo 6.10a/b z każdym obciążeniem wiodącym, z podzbiorami obciążeń zmiennych (k<sub>mod</sub> wg najkrótszego obciążenia), z obciążeniami stałymi korzystnymi; warianty wiatru ±; kombinacje wyjątkowe i pożarowe 6.11b; SGU charakterystyczne i quasi-stałe.</li>
  <li><b>SGN</b> – ściskanie i rozciąganie (6.1.2, 6.1.4), zginanie dwukierunkowe, ścinanie (6.1.7), interakcje 6.2.3 i 6.2.4, stateczność metodą k<sub>c</sub> (6.3.2) z długościami wyboczeniowymi z MES (zagadnienie własne) lub ręcznymi, zwichrzenie (6.3.3), analiza II rzędu z imperfekcjami (5.4.4) – jako metoda decydująca lub kontrolna, słupy wielogałęziowe (C.3, λ<sub>ef</sub>, siły w łącznikach), stężenia (9.2.5.2).</li>
  <li><b>Oparcie</b> – docisk do podwaliny i belki na głowicy (6.1.5, k<sub>c,90</sub>), docisk stopy stalowej do betonu (PN-EN 1992-1-1, 6.7), siły do zaprojektowania zakotwienia (odrywanie, ścinanie, moment).</li>
  <li><b>SGU</b> – przemieszczenia poziome natychmiastowe i końcowe z pełzaniem (2.3.2.2, k<sub>def</sub>), skrócenie osiowe.</li>
  <li><b>Pożar</b> – zwęglanie β<sub>n</sub>, ochrona okładzinami (t<sub>ch</sub>, t<sub>f</sub>, k<sub>2</sub>, k<sub>3</sub>), d<sub>ef</sub> = d<sub>char,n</sub> + k<sub>0</sub>d<sub>0</sub>, strony ogrzewane, przesunięcie środka ciężkości, wyboczenie i zwichrzenie przekroju resztkowego.</li></ul>
  <p>Dane wprowadzasz w zakładce <b>Dane</b> – obok formularza jest schemat słupa: kliknij słup, podporę lub obciążenie, aby je zmienić. Pola z podpowiedzią „auto” można nadpisać własną wartością (puste – wartość automatyczna). Kliknij numer punktu normy w podsumowaniu – objaśnienie; kliknij warunek – pełny tok obliczeń („jak obliczono”). Sprawdzenia można odhaczać – raport obejmuje zestawienie odhaczonych.</p>
  <p>Skróty: F2 – raport, Ctrl+S – zapisz, Ctrl+Shift+S – zapisz jako, Ctrl+O – otwórz, Ctrl+N – nowy, Ctrl+P – drukuj raport.</p>
  <p style="font-size:12px;color:var(--ink3)">Program jest narzędziem pomocniczym. Wyniki wymagają weryfikacji przez osobę z odpowiednimi uprawnieniami budowlanymi. Wartości parametrów krajowych i klas trwania obciążeń należy potwierdzić z aktualnym Załącznikiem Krajowym.</p>
  <div class="dbtn"><button class="btn pri" id="abClose">Zamknij</button></div></div>`;
  m.style.display = 'flex';
  $('#abClose', m).onclick = () => { m.style.display = 'none'; };
}

/* -------------------------------------------------------------- start */
function initSplit() {
  const sp = $('#dsplit'), wrap = $('#datawrap');
  const apply = r => { wrap.style.setProperty('--dl', r + 'fr'); wrap.style.setProperty('--dr', (2 - r) + 'fr'); };
  let r0 = 1.15; try { const v = +localStorage.getItem('slup-split'); if (v > 0.4 && v < 1.6) r0 = v; } catch (e) { /* */ }
  apply(r0);
  sp.addEventListener('mousedown', e => {
    e.preventDefault(); const rect = wrap.getBoundingClientRect();
    const mv = ev => { const f = Math.max(0.2, Math.min(0.8, (ev.clientX - rect.left) / rect.width)); r0 = 2 * f; apply(r0); };
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); try { localStorage.setItem('slup-split', r0); } catch (e2) { /* */ } renderDataSide(); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  });
  sp.addEventListener('dblclick', () => { r0 = 1.15; apply(r0); try { localStorage.removeItem('slup-split'); } catch (e) { /* */ } });
}
function init() {
  try { const t = localStorage.getItem('slup-theme'); if (t) setTheme(t); } catch (e) { /* */ }
  let saved = window.__AUTOSAVE || null;
  if (!saved) { try { saved = JSON.parse(localStorage.getItem('slupdrewniany-autosave') || 'null'); } catch (e) { saved = null; } }
  if (saved && saved.state) {
    try { S = E.normalize(beamsIn(saved, saved.state)); filePath = saved.filePath || ''; cloudId = saved.cloudId || null; cloudName = saved.cloudName || ''; }
    catch (e) { S = E.defaultState(); }
  }
  if (ART) { $('#bPrint').hidden = true; $('#bSaveAs').hidden = true; $('#bExport').hidden = true; $('#bOpen').title = 'Otwórz plik projektu (.json / .slup)'; }
  $('#projName').value = S.meta.name || '';
  $('#projName').addEventListener('input', e => { S.meta.name = e.target.value; dirty = true; updateTitle(); autosave(); rendered.report = false; const bt = $(`.btab[data-btab="${curB}"] span`); if (bt) bt.textContent = S.meta.name.slice(0, 14); });
  $$('.tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + b.dataset.tab));
    renderActive();
  }));
  $$('[data-act]', $('#top')).forEach(b => b.addEventListener('click', () => ({ new: newProject, open: openFile, save: () => saveFile(false), saveas: () => saveFile(true), cloud: openCloud, print: doPrint, exporthtml: exportHTML, about, theme: cycleTheme })[b.dataset.act]()));
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase();
    if (!ART && (e.key === 'F5' || (e.ctrlKey && k === 'r'))) { e.preventDefault(); return; }
    if ($('#modal').style.display === 'flex' && e.key !== 'Escape') return;
    if (e.ctrlKey && k === 's') { e.preventDefault(); saveFile(e.shiftKey); }
    else if (e.ctrlKey && k === 'o') { e.preventDefault(); openFile(); }
    else if (e.ctrlKey && k === 'n' && !ART) { e.preventDefault(); newProject(); }
    else if (e.ctrlKey && k === 'p') { e.preventDefault(); doPrint(); }
    else if (e.key === 'F2') { e.preventDefault(); U.selectTab('report'); }
    else if (e.key === 'Escape') { closeList(); cloudOpen = false; $('#modal').style.display = 'none'; }
  });
  $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal' && !$('[data-a]', e.currentTarget)) { cloudOpen = false; e.currentTarget.style.display = 'none'; } });
  let rz = null, lastW = window.innerWidth;
  window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - lastW) < 40) return; lastW = window.innerWidth; clearTimeout(rz); rz = setTimeout(() => { rendered = {}; renderActive(); }, 150); });
  window.addEventListener('beforeunload', e => { if (dirty && !inHost() && !ART) { e.preventDefault(); e.returnValue = ''; } });
  renderInputs();
  bindInputs($('#inputs'));
  renderAutoBar();
  initSplit();
  recalc();
  updateTitle();
  initCapabilities();
}
U.setState = s => { S = E.normalize(s); prevStat = null; renderInputs(); recalc(); };
U.getState = () => S;
U.selectTab = t => { const b = $(`.tabs button[data-tab="${t}"]`); if (b) b.click(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
