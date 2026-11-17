/* SłupDrewniany – raport obliczeniowy (pełny, statyka, „jak obliczono”), eksport .odt */
(function () {
'use strict';
const SDR = window.SDR = {};
const E = window.EC5, G = window.SDG;
const U = () => window.SD;
const f = (v, d) => E.fx(v, d === undefined ? 2 : d);
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sym = s => esc(s).replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>').replace(/_([0-9A-Za-ząćęłńóśźżφθλ]+(?:,[0-9A-Za-ząćęłńóśźż]+)*)/g, '<sub>$1</sub>');
// odwołania do norm – w znacznikach usuwanych przez noRefs()
const rf = t => `<span class="rf"> (${t})</span>`;
const line = (t, ref) => `<div class="eq">${t}${ref ? `<span class="r">[${ref}]</span>` : ''}</div>`;
// lhs = wzór = podstawienie = wynik [jedn.]
const eq = (lhs, fx, sub, val, unit, ref, stt) => {
  let s = `<div class="eq">${sym(lhs)}`;
  if (fx) s += ` = ${sym(fx)}`;
  if (sub) s += ` = ${sym(sub)}`;
  if (val !== undefined && val !== null && val !== '') s += ` = <b>${val}</b>`;
  if (unit) s += ` ${unit}`;
  if (stt) s += ` <span class="${stt[0]}">${stt[1]}</span>`;
  if (ref) s += `<span class="r">[${ref}]</span>`;
  return s + '</div>';
};
const okS = (good, txt) => good ? ['ok', '✔ ' + (txt || 'warunek spełniony')] : ['fail', '✖ ' + (txt || 'warunek NIESPEŁNIONY')];
const cmp = (a, rel, b, unit, d, ref) => { const good = rel === '≤' ? a <= b + 1e-9 : a >= b - 1e-9; return line(`${f(a, d)} ${rel} ${f(b, d)} ${unit || ''} <span class="${good ? 'ok' : 'fail'}">${good ? '✔ warunek spełniony' : '✖ warunek NIESPEŁNIONY'}</span>`, ref); };
const kv = pairs => pairs.filter(q => q && q[1] !== '' && q[1] !== undefined).map(([k, v]) => `<div class="eq">${k}: ${v}</div>`).join('');
const stx = (R, i) => E.stX(R, i) / 1000;
const coTxt = co => co ? `${co.type === 'acc' ? 'KW' : co.type === 'fi' ? 'KP' : 'K'}${co.no || ''} (${esc(co.eq)}${co.lead ? `, wiodące: ${esc(co.lead.name)}` : ''}): ${esc(co.desc)}${co.kmod ? `; klasa trwania: ${esc(E.DUR[co.dur].n)}, k<sub>mod</sub> = ${f(co.kmod, 2)}` : ''}` : '';
const gTxt = (R, S) => G.secTxt(R, S);
const tbl = (head, rows, cls) => `<table class="rt ${cls || ''}"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

/* ------------------------------------------------------------ części raportu */
function partHeader(R, S, title) {
  const d = new Date().toLocaleDateString('pl-PL');
  return `<h1>${esc(title)}</h1><table class="hdrtab"><tr><td>Element: <b>${esc(S.meta.name || 'Słup')}</b></td><td>Data: ${d}</td></tr><tr><td colspan="2">${esc(gTxt(R, S))}, L = ${f(S.geom.L, 2)} m, ${esc(R.m.name)}, klasa użytkowania ${S.mat.sc}</td></tr></table>`;
}
function partData(R, S) {
  const g = R.g, sp = S.supp;
  const sup = p => `podstawa – ${esc(E.SUPP_BASE[sp[p].base])}${sp[p].base === 'fix' && sp[p].kb !== '' ? ` (podatność k<sub>φ</sub> = ${f(+sp[p].kb, 0)} kNm/rad)` : ''}; głowica – ${esc(E.SUPP_TOP[sp[p].top])}${R.braces[p].length ? `; stężenia na wysokościach ${R.braces[p].map(x => f(x / 1000, 2)).join('; ')} m` : ''}`;
  return kv([
    ['Słup', `wysokość L = <b>${f(S.geom.L, 3)} m</b>; przekrój ${esc(gTxt(R, S))}${S.geom.hole > 0 ? `; osłabienie otworami ΔA = ${f(S.geom.hole, 0)}%` : ''}`],
    ['Płaszczyzna x–z (wyboczenie względem osi y)', sup('z')],
    ['Płaszczyzna x–y (wyboczenie względem osi z)', sup('y')],
    ['Materiał', `${esc(R.m.name)} – ${esc(R.m.kindName)} (${esc(R.m.std)}); klasa użytkowania ${S.mat.sc}`],
    ['Metoda sprawdzenia stateczności', S.buck.method === 'kc' ? 'współczynnik wyboczeniowy k<sub>c</sub>' + rf('6.3.2') : 'analiza II rzędu z imperfekcjami' + rf('5.4.4')],
    ['Oparcie', `podstawa: ${esc(G.baseTxt(S))}; głowica: ${esc(G.topTxt(S))}`],
    ['Odporność ogniowa', S.fire.R ? `R${S.fire.R}` : 'nie sprawdzana'],
  ]) + `<p class="note">Oś x – oś słupa (od podstawy). Wymiar h leży wzdłuż osi z, wymiar b wzdłuż osi y; M<sub>y</sub>, H<sub>z</sub>, e<sub>z</sub> – płaszczyzna x–z; M<sub>z</sub>, H<sub>y</sub>, e<sub>y</sub> – płaszczyzna x–y.</p>`;
}
function partMat(R, S) {
  const m = R.m;
  let o = kv([
    ['Wartości charakterystyczne', `f<sub>m,k</sub> = ${f(m.fmk, 1)}, f<sub>t,0,k</sub> = ${f(m.ft0k, 1)}, f<sub>c,0,k</sub> = ${f(m.fc0k, 1)}, f<sub>c,90,k</sub> = ${f(m.fc90k, 2)}, f<sub>v,k</sub> = ${f(m.fvk, 1)} MPa`],
    ['Sztywność', `E<sub>0,mean</sub> = ${f(m.E0mean, 0)} MPa, E<sub>0,05</sub> = ${f(m.E005, 0)} MPa, G<sub>mean</sub> = ${f(m.Gmean, 0)} MPa, G<sub>0,05</sub> = ${f(m.G005, 0)} MPa`],
    ['Gęstość', `ρ<sub>k</sub> = ${f(m.rhok, 0)} kg/m³, ρ<sub>mean</sub> = ${f(m.rhomean, 0)} kg/m³; ciężar objętościowy γ = ${f(m.gamma, 2)} kN/m³`],
    ['Współczynniki', `γ<sub>M</sub> = ${f(m.gM, 2)}${rf('tab. 2.3')}; k<sub>def</sub> = ${f(m.kdef, 2)}${rf('tab. 3.2')}; β<sub>c</sub> = ${f(m.betaC, 1)}${rf('6.29')}; k<sub>cr</sub> = ${f(m.kcr, 2)}${rf('6.1.7(2)')}; k<sub>sys</sub> = ${f(m.ksys, 2)}${rf('6.6')}`],
    ['k<sub>mod</sub>' + rf('tab. 3.1'), E.DUR_KEYS.map(k => `${E.DUR[k].n} ${f(m.kmodT[k], 2)}`).join('; ')],
    ['Współczynnik wysokości', `${sym(R.kh.y.t)} (zginanie M<sub>y</sub>); ${sym(R.kh.z.t)} (M<sub>z</sub>); ${sym(R.kh.t.t)} (rozciąganie)`],
  ]);
  o += line('Wytrzymałość obliczeniowa: f<sub>d</sub> = k<sub>mod</sub>·k<sub>sys</sub>·k<sub>h</sub>·f<sub>k</sub>/γ<sub>M</sub>; k<sub>mod</sub> dla kombinacji – wg obciążenia o najkrótszym czasie trwania' + rf('3.1.3(2)'), '2.4.1');
  return o;
}
function partSection(R, S) {
  const g = R.g;
  let o = `<div class="fig">${G.sectionSVG(R, S, { W: 300, H: 290, fire: true })}</div>`;
  o += kv([
    ['Pole przekroju', `A = ${f(g.A, 0)} mm² = ${f(g.A / 100, 2)} cm²`],
    ['Momenty bezwładności', `I<sub>y</sub> = ${f(g.Iy / 1e4, 1)} cm⁴, I<sub>z</sub> = ${f(g.Iz / 1e4, 1)} cm⁴${g.type === 'spaced' ? ' (I<sub>z</sub> – cały przekrój z Steinerem, I<sub>tot</sub>)' : ''}`],
    ['Wskaźniki wytrzymałości', `W<sub>y</sub> = ${f(g.Wy / 1e3, 1)} cm³, W<sub>z</sub> = ${f(g.Wz / 1e3, 1)} cm³`],
    ['Promienie bezwładności', `i<sub>y</sub> = ${f(g.iy, 2)} mm, i<sub>z</sub> = ${f(g.iz, 2)} mm`],
    ['Moment bezwładności na skręcanie', `I<sub>tor</sub> = ${f(g.It / 1e4, 1)} cm⁴`],
    ['Współczynnik k<sub>m</sub>' + rf('6.1.6(2)'), `${f(g.km, 1)}${g.type === 'round' ? ' – przekrój okrągły: moment wypadkowy' : ''}`],
    ['Ciężar własny', `g = γ·A = ${f(R.m.gamma, 2)}·${f(g.A * 1e-6, 5)} = ${f(R.m.gamma * g.A * 1e-6, 4)} kN/m`],
  ]);
  return o;
}
function partLoads(R, S) {
  let o = `<div class="fig">${G.schemeSVG(R, S, { W: 520, H: 430 })}</div>`;
  const rows = R.cases.map(c => {
    const it = c.item;
    const comp = c.id === 'G0' ? `g = ${f(c.g, 4)} kN/m (oś x)` : (it ? (window.SD ? '' : '') + itemComp(it, c.sgn) : '');
    return [`<b>${esc(c.id)}</b>`, esc(c.name), esc(E.DUR[c.dur].n), c.kind === 'perm' || c.kind === 'acc' ? '—' : `${f(c.psi.p0, 1)} / ${f(c.psi.p1, 1)} / ${f(c.psi.p2, 1)}`, comp];
  });
  o += tbl(['Id', 'Obciążenie', 'Klasa trwania', 'ψ₀ / ψ₁ / ψ₂', 'Wartości charakterystyczne'], rows);
  const gens = S.loads.items.filter(it => it.gen);
  gens.forEach(it => {
    try {
      if (it.kind === 'snow') o += line(`${esc(it.name)}: ${sym(E.genSnow(it.gen).txt)}`, 'PN-EN 1991-1-3');
      else if (it.kind === 'wind') { const w = E.genWind(it.gen); o += line(`${esc(it.name)}: ${sym(w.txt)} → q = ${f(w.q, 3)} kN/m`, 'PN-EN 1991-1-4'); }
      else if (it.kind === 'imp') o += line(`${esc(it.name)}: ${sym(E.genArea(Object.assign({}, it.gen, { cat: it.cat })).txt)}`, 'PN-EN 1991-1-1');
    } catch (e) { /* */ }
  });
  o += `<p class="note">Siła N dodatnia – ściskająca. Obciążenia „(±)” liczone w obu kierunkach poziomych (warianty wykluczające się). Pozycje śniegu i wiatru są wariantami wykluczającymi się w ramach danego oddziaływania.</p>`;
  return o;
}
function itemComp(it, sgn) {
  const s = sgn || 1, p = [];
  if (it.N) p.push(`N = ${f(it.N, 2)} kN${it.ez ? `, e<sub>z</sub> = ${f(it.ez, 0)} mm` : ''}${it.ey ? `, e<sub>y</sub> = ${f(it.ey, 0)} mm` : ''}`);
  if (it.Hz) p.push(`H<sub>z</sub> = ${f(s * it.Hz, 2)} kN`); if (it.Hy) p.push(`H<sub>y</sub> = ${f(s * it.Hy, 2)} kN`);
  if (it.My) p.push(`M<sub>y</sub> = ${f(s * it.My, 2)} kNm`); if (it.Mz) p.push(`M<sub>z</sub> = ${f(s * it.Mz, 2)} kNm`);
  const rg = it.qa !== '' || it.qb !== '' ? ` na x = ${f(it.qa === '' ? 0 : it.qa, 2)}…${it.qb === '' ? 'L' : f(it.qb, 2)} m` : '';
  if (it.qz) p.push(`q<sub>z</sub> = ${f(s * it.qz, 3)} kN/m${rg}`); if (it.qy) p.push(`q<sub>y</sub> = ${f(s * it.qy, 3)} kN/m${rg}`);
  it.pts.forEach(q => p.push(`x = ${f(q.x, 2)} m: ${[q.N ? `N = ${f(q.N, 2)} kN` : '', q.ez ? `e<sub>z</sub> = ${f(q.ez, 0)}` : '', q.ey ? `e<sub>y</sub> = ${f(q.ey, 0)}` : '', q.Hz ? `H<sub>z</sub> = ${f(s * q.Hz, 2)}` : '', q.Hy ? `H<sub>y</sub> = ${f(s * q.Hy, 2)}` : ''].filter(Boolean).join(', ')}`));
  return p.join('; ') || '—';
}
function partCombos(R, S) {
  const C = R.combos, ld = S.loads;
  let o = line(ld.comb === '610ab' ? `SGN – mniej korzystne z 6.10a: Σγ<sub>G,j</sub>G<sub>k,j</sub> + Σγ<sub>Q,i</sub>ψ<sub>0,i</sub>Q<sub>k,i</sub> i 6.10b: Σξγ<sub>G,j</sub>G<sub>k,j</sub> + γ<sub>Q,1</sub>Q<sub>k,1</sub> + Σγ<sub>Q,i</sub>ψ<sub>0,i</sub>Q<sub>k,i</sub>; γ<sub>G,sup</sub> = ${f(ld.gG, 2)}, γ<sub>G,inf</sub> = ${f(ld.gGinf, 2)}, γ<sub>Q</sub> = ${f(ld.gQ, 2)}, ξ = ${f(ld.xi, 2)}` : `SGN – 6.10: Σγ<sub>G,j</sub>G<sub>k,j</sub> + γ<sub>Q,1</sub>Q<sub>k,1</sub> + Σγ<sub>Q,i</sub>ψ<sub>0,i</sub>Q<sub>k,i</sub>; γ<sub>G,sup</sub> = ${f(ld.gG, 2)}, γ<sub>G,inf</sub> = ${f(ld.gGinf, 2)}, γ<sub>Q</sub> = ${f(ld.gQ, 2)}`, 'PN-EN 1990');
  o += line(`SGU – charakterystyczna 6.14b: ΣG<sub>k</sub> + Q<sub>k,1</sub> + Σψ<sub>0,i</sub>Q<sub>k,i</sub>; quasi-stała 6.16b: ΣG<sub>k</sub> + Σψ<sub>2,i</sub>Q<sub>k,i</sub>${C.acc.length || S.fire.R ? `; wyjątkowa / pożarowa 6.11b: ΣG<sub>k</sub> + A<sub>d</sub> + ${ld.accPsi === 'psi2' ? 'ψ<sub>2,1</sub>' : 'ψ<sub>1,1</sub>'}Q<sub>k,1</sub> + Σψ<sub>2,i</sub>Q<sub>k,i</sub>` : ''}`);
  o += line(`Liczba kombinacji: SGN ${C.uls.length}${C.acc.length ? `, wyjątkowych ${C.acc.length}` : ''}, SGU charakterystycznych ${C.chr.length}, quasi-stałych ${C.qp.length}${S.fire.R ? `, pożarowych ${C.fi.length}` : ''}. Generowane są kombinacje z każdym obciążeniem wiodącym oraz z podzbiorami obciążeń zmiennych (k<sub>mod</sub> wg obciążenia o najkrótszym czasie trwania) i ze stałymi korzystnymi.`);
  const top = C.uls.slice().sort((a, b) => (b.util || 0) - (a.util || 0)).slice(0, 8);
  o += `<h3>Kombinacje SGN decydujące (największe wytężenie)</h3>` + tbl(['Nr', 'Wzór', 'Kombinacja', 'Klasa trwania', 'k<sub>mod</sub>', 'η<sub>max</sub>'], top.map(c => [`K${c.no}`, esc(c.eq), esc(c.desc) + (c.lead ? ` <i>(wiodące ${esc(c.lead.name)})</i>` : ''), esc(E.DUR[c.dur].n), f(c.kmod, 2), f((c.util || 0) * 100, 1) + '%']));
  return o;
}
function partStatics(R, S) {
  const ne = R.xs.length - 1, xs = []; for (let e = 0; e < ne; e++) xs.push(R.xs[e], R.xs[e + 1]);
  const ch = (key, t, u, k, d, c, fl, dp) => G.vChart({ key, W: 150, H: 300, title: t, unit: u, xs, L: R.L, series: [{ v: R.env[k].max.map(v => v / d), c, fill: fl }, { v: R.env[k].min.map(v => v / d), c, fill: fl }], dp });
  let o = line('Siły wewnętrzne wyznaczono metodą elementów skończonych (pręt Eulera–Bernoulliego, dwie płaszczyzny, analiza liniowo-sprężysta I rzędu; rozkład sił – sztywność E<sub>0,mean</sub>). Wykresy – obwiednie wszystkich kombinacji SGN.');
  o += `<div class="fig">${ch('N', 'N [kN]', '+ ściskanie', 'N', 1e3, G.C.d1, G.C.f1, 1)}${ch('My', 'M_y [kNm]', 'x–z', 'My', 1e6, G.C.d2, G.C.f2, 2)}${ch('Mz', 'M_z [kNm]', 'x–y', 'Mz', 1e6, G.C.d3, G.C.f3, 2)}${ch('Vz', 'V_z [kN]', 'x–z', 'Vz', 1e3, G.C.d2, '', 2)}${ch('Vy', 'V_y [kN]', 'x–y', 'Vy', 1e3, G.C.d3, '', 2)}</div>`;
  const X = R.ext;
  o += kv([
    ['N<sub>Ed</sub>', `max ${f(X.Nmax.v / 1e3, 2)} kN (x = ${f(X.Nmax.x / 1000, 2)} m), min ${f(X.Nmin.v / 1e3, 2)} kN`],
    ['M<sub>y,Ed</sub>', `max ${f(X.Mymax.v / 1e6, 3)} kNm, min ${f(X.Mymin.v / 1e6, 3)} kNm`],
    ['M<sub>z,Ed</sub>', `max ${f(X.Mzmax.v / 1e6, 3)} kNm, min ${f(X.Mzmin.v / 1e6, 3)} kNm`],
    ['V<sub>z,Ed</sub> / V<sub>y,Ed</sub>', `|max| ${f(Math.max(Math.abs(X.Vzmax.v), Math.abs(X.Vzmin.v)) / 1e3, 2)} / ${f(Math.max(Math.abs(X.Vymax.v), Math.abs(X.Vymin.v)) / 1e3, 2)} kN`],
  ]);
  const c = R.conn;
  o += `<h3>Reakcje (siły w podstawie, SGN)</h3>` + kv([
    ['N<sub>Ed,max</sub>', `${f(c.Nb.v / 1e3, 2)} kN – ${coTxt(c.Nb.co)}`],
    ['N<sub>Ed,min</sub>', `${f(c.Nbmin.v / 1e3, 2)} kN${c.Nbmin.v < 0 ? ' (odrywanie)' : ''} – ${coTxt(c.Nbmin.co)}`],
    ['V<sub>Ed</sub> (wypadkowa)', `${f(c.Vb.v / 1e3, 2)} kN${c.Vb.co ? ' – ' + coTxt(c.Vb.co) : ''}`],
    ['M<sub>Ed</sub> (wypadkowy)', `${f(c.Mb.v / 1e6, 2)} kNm${c.Mb.co && c.Mb.v > 0 ? ' – ' + coTxt(c.Mb.co) : ''}`],
  ]);
  return o;
}
function partBuck(R, S) {
  const m = R.m, sq = Math.sqrt(m.fc0k / m.E005);
  let o = line(`Długości wyboczeniowe – ${R.buck.z.manual || R.buck.y.manual ? 'podane ręcznie lub ' : ''}z rozwiązania zagadnienia własnego MES (K − λ·K<sub>G</sub>)φ = 0 dla stałej siły ściskającej, z uwzględnieniem podpór, stężeń i podatności: l<sub>ef</sub> = π·√(EI/N<sub>cr</sub>).`);
  o += `<div class="fig">${G.modeSVG(R, S, { W: 420, H: 330 })}${G.kcSVG(R, { W: 400, H: 240 })}</div>`;
  ['z', 'y'].forEach(p => {
    const b = R.buck[p], ax = p === 'z' ? 'y' : 'z';
    o += `<h3>Wyboczenie względem osi ${ax} (płaszczyzna x–${p})</h3>`;
    o += eq(`l_{ef,${ax}}`, b.manual ? '' : 'β·L', b.manual ? '' : `${f(b.beta, 3)}·${f(R.L / 1000, 3)}`, f(b.lef / 1000, 3), 'm' + (b.manual ? ' (podana ręcznie)' : ''));
    if (b.spaced && R.sp) {
      const P = R.sp, sp = S.geom.sp;
      o += eq('λ', 'l_{ef}·√(A_{tot}/I_{tot})', `${f(b.lef, 0)}·√(${f(R.g.A, 0)}/${f(R.g.Iz, 0)})`, f(P.lamZ, 2), '', 'C.16');
      o += eq('λ_{1}', '√12·l_{1}/t', `√12·${f(P.l1, 0)}/${f(sp.t, 0)}`, f(P.lam1, 2), P.lam1 < 30 ? '→ przyjęto 30' : '', 'C.17');
      o += eq('λ_{ef}', '√(λ² + η·n/2·λ_{1}²)', `√(${f(P.lamZ, 2)}² + ${f(P.long.eta, 1)}·${R.g.n}/2·${f(P.lam1c, 2)}²)`, f(P.long.lamEf, 2), `(η = ${f(P.long.eta, 1)} – obciążenia stałe i długotrwałe; dla średnio- i krótkotrwałych η = ${f(P.short.eta, 1)}, λ<sub>ef</sub> = ${f(P.short.lamEf, 2)})`, 'C.15');
    } else o += eq(`λ_{${ax}}`, `l_{ef,${ax}}/i_{${ax}}`, `${f(b.lef, 0)}/${f(b.i, 2)}`, f(b.lam, 2), '', '6.21');
    o += eq(`λ_{rel,${ax}}`, `λ_{${ax}}/π·√(f_{c,0,k}/E_{0,05})`, `${f(b.lam, 2)}/π·√(${f(m.fc0k, 1)}/${f(m.E005, 0)})`, f(b.lamRel, 4), '', '6.21');
    if (b.lamRel <= 0.3) o += line(`λ<sub>rel,${ax}</sub> ≤ 0,3 → k<sub>c,${ax}</sub> = 1,0`, '6.3.2(2)');
    else {
      o += eq(`k_{${ax}}`, `0,5·[1 + β_{c}·(λ_{rel,${ax}} − 0,3) + λ_{rel,${ax}}²]`, `0,5·[1 + ${f(m.betaC, 1)}·(${f(b.lamRel, 4)} − 0,3) + ${f(b.lamRel, 4)}²]`, f(b.k, 4), '', '6.27');
      o += eq(`k_{c,${ax}}`, `1/(k_{${ax}} + √(k_{${ax}}² − λ_{rel,${ax}}²))`, `1/(${f(b.k, 4)} + √(${f(b.k, 4)}² − ${f(b.lamRel, 4)}²))`, f(b.kc, 4), '', '6.25');
    }
  });
  void sq;
  if (R.ltb) {
    const l = R.ltb, g = R.g, st = l.strong;
    o += `<h3>Zwichrzenie – zginanie względem osi ${st}${rf('6.3.3')}</h3>`;
    o += eq('l_{ef,m}', l.manual ? '' : `${f(l.kL, 1)}·l`, l.manual ? '' : `${f(l.kL, 1)}·${f(l.lseg / 1000, 3)}`, f(l.lef / 1000, 3), 'm' + (l.manual ? ' (podana ręcznie)' : ` – ${esc(E.LTB_CASES[l.caseK].n)}, l – odległość podparć bocznych krawędzi ściskanej`), 'tab. 6.1');
    o += eq('σ_{m,crit}', `π·√(E_{0,05}·I_{${st === 'y' ? 'z' : 'y'}}·G_{0,05}·I_{tor})/(l_{ef}·W_{${st}})`, `π·√(${f(m.E005, 0)}·${f((st === 'y' ? g.Iz : g.Iy), 0)}·${f(m.G005, 0)}·${f(g.It, 0)})/(${f(l.lef, 0)}·${f(st === 'y' ? g.Wy : g.Wz, 0)})`, f(l.scrit, 2), 'MPa', '6.31');
    o += eq('λ_{rel,m}', '√(f_{m,k}/σ_{m,crit})', `√(${f(m.fmk, 1)}/${f(l.scrit, 2)})`, f(l.lamRel, 4), '', '6.30');
    o += eq('k_{crit}', l.lamRel <= 0.75 ? '1,0 (λ_{rel,m} ≤ 0,75)' : l.lamRel <= 1.4 ? '1,56 − 0,75·λ_{rel,m}' : '1/λ_{rel,m}²', '', f(l.kcrit, 4), '', '6.34');
  }
  if (R.II && (S.buck.method === 'II' || S.buck.both)) {
    const II = R.II;
    o += `<h3>Analiza II rzędu z imperfekcjami${S.buck.method === 'II' ? '' : ' – informacyjnie'}${rf('5.4.4, 2.4.1(2)')}</h3>`;
    o += line(`Sztywność obliczeniowa E<sub>d</sub> = ${II.Ebase === m.E005 ? 'E<sub>0,05</sub>' : 'E<sub>0,mean</sub>'}/γ<sub>M</sub> = ${f(II.Ebase, 0)}/${f(m.gM, 2)} = ${f(II.Ed, 0)} MPa; MES z macierzą geometryczną dla rozkładu N(x) w kombinacji; imperfekcja w kształcie postaci wyboczenia, w jednej płaszczyźnie naraz.`);
    ['z', 'y'].forEach(p => { const q = II.planes[p]; o += line(`Płaszczyzna x–${p}: N<sub>cr,d</sub> = π²E<sub>d</sub>I/l<sub>ef</sub>² = ${f(q.Ncr / 1e3, 1)} kN; amplituda imperfekcji e = ${q.sway ? `max(l<sub>ef</sub>/${f(q.e0r, 0)}; φ·L), φ = ${f(q.phi, 4)}` : `l<sub>ef</sub>/${f(q.e0r, 0)}`} = ${f(q.amp, 2)} mm`); });
  }
  return o;
}
// szczegóły sprawdzenia z obliczeniami w przekroju decydującym
function stationTxt(R, b) { const co = b.combo || b.co, r = co.res; return { co, r, i: b.i, x: stx(R, b.i), N: r.N[b.i], My: r.My[b.i], Mz: r.Mz[b.i], Vy: r.Vy[b.i], Vz: r.Vz[b.i] }; }
function fdLines(R, S, co, keys) {
  const m = R.m, fd = co.fd || {};
  const kmod = co.kmod, gM = fd.gM || m.gM, k = `${f(kmod, 2)}·${f(m.ksys, 2)}`;
  const o = [];
  if (keys.includes('c')) o.push(eq('f_{c,0,d}', 'k_{mod}·k_{sys}·f_{c,0,k}/γ_{M}', `${k}·${f(m.fc0k, 1)}/${f(gM, 2)}`, f(fd.fc0d, 3), 'MPa'));
  if (keys.includes('t')) o.push(eq('f_{t,0,d}', 'k_{mod}·k_{sys}·k_{h}·f_{t,0,k}/γ_{M}', `${k}·${f(R.kh.t.k, 3)}·${f(m.ft0k, 1)}/${f(gM, 2)}`, f(fd.ft0d, 3), 'MPa'));
  if (keys.includes('m')) o.push(eq('f_{m,y,d}', 'k_{mod}·k_{sys}·k_{h,y}·f_{m,k}/γ_{M}', `${k}·${f(R.kh.y.k, 3)}·${f(m.fmk, 1)}/${f(gM, 2)}`, f(fd.fmyd, 3), 'MPa') + eq('f_{m,z,d}', '', `${k}·${f(R.kh.z.k, 3)}·${f(m.fmk, 1)}/${f(gM, 2)}`, f(fd.fmzd, 3), 'MPa'));
  if (keys.includes('v')) o.push(eq('f_{v,d}', 'k_{mod}·k_{sys}·f_{v,k}/γ_{M}', `${k}·${f(m.fvk, 1)}/${f(gM, 2)}`, f(fd.fvd, 3), 'MPa'));
  return o.join('');
}
function forcesLine(R, s) { return line(`Kombinacja ${coTxt(s.co)}`) + line(`Przekrój decydujący x = ${f(s.x, 3)} m: N<sub>Ed</sub> = ${f(s.N / 1e3, 3)} kN, M<sub>y,Ed</sub> = ${f(s.My / 1e6, 3)} kNm, M<sub>z,Ed</sub> = ${f(s.Mz / 1e6, 3)} kNm`); }
function stressLines(R, S, s) {
  const g = R.g, h = S.geom.hole / 100;
  let o = '';
  if (s.N > 0) o += eq('σ_{c,0,d}', 'N_{Ed}/A', `${f(s.N, 0)}/${f(g.A, 0)}`, f(s.N / g.A, 3), 'MPa');
  else if (s.N < 0) o += eq('σ_{t,0,d}', h ? 'N_{Ed}/A_{net}' : 'N_{Ed}/A', `${f(-s.N, 0)}/${f(g.A * (1 - h), 0)}`, f(-s.N / (g.A * (1 - h)), 3), 'MPa');
  const Wz = (s.Wz || g.Wz) * (1 - h);
  if (g.type === 'round') o += eq('σ_{m,d}', '√(M_{y}² + M_{z}²)/W', `√(${f(s.My / 1e6, 3)}² + ${f(s.Mz / 1e6, 3)}²)·10⁶/${f(g.Wy * (1 - h), 0)}`, f(Math.hypot(s.My, s.Mz) / (g.Wy * (1 - h)), 3), 'MPa');
  else {
    if (s.My) o += eq('σ_{m,y,d}', '|M_{y,Ed}|/W_{y}' + (h ? '_{,net}' : ''), `${f(Math.abs(s.My), 0)}/${f(g.Wy * (1 - h), 0)}`, f(Math.abs(s.My) / (g.Wy * (1 - h)), 3), 'MPa');
    if (s.Mz) o += eq('σ_{m,z,d}', '|M_{z,Ed}|/W_{z}' + (g.type === 'spaced' ? '_{,ef}' : '') + (h ? '_{,net}' : ''), `${f(Math.abs(s.Mz), 0)}/${f(Wz, 0)}`, f(Math.abs(s.Mz) / Wz, 3), 'MPa');
  }
  return o;
}
function checkDetail(R, S, c) {
  const b = c.b, m = R.m, g = R.g;
  const st = ok => okS(ok);
  const km = f(g.km, 1);
  let o = '';
  const id = c.id;
  if (['c0', 't0', 'cb', 'tb', 'v', 'b1', 'b2', 'ltb'].includes(id) && b && (b.combo || b.co)) {
    const s = stationTxt(R, b);
    if (g.type === 'spaced' && s.co.res) s.Wz = g.A * Math.pow(R.buck.y.lef / (DUR_LONG(s.co) ? R.sp.long : R.sp.short).lamEf, 2) / (g.b / 2);
    o += forcesLine(R, s);
    const o2 = b.o, fd = b.f;
    if (id === 'c0') { o += stressLines(R, S, s) + fdLines(R, S, s.co, ['c']) + eq('σ_{c,0,d}/f_{c,0,d}', '', `${f(o2.sc, 3)}/${f(fd.fc0d, 3)}`, f(o2.c0, 3), '', '6.2', st(o2.c0 <= 1)); }
    if (id === 't0') { o += stressLines(R, S, s) + fdLines(R, S, s.co, ['t']) + eq('σ_{t,0,d}/f_{t,0,d}', '', `${f(o2.st, 3)}/${f(fd.ft0d, 3)}`, f(o2.t0, 3), '', '6.1', st(o2.t0 <= 1)); }
    if (id === 'cb' || id === 'tb') {
      o += stressLines(R, S, s) + fdLines(R, S, s.co, [id === 'cb' ? 'c' : 't', 'm']);
      const rr = (o2.smy / fd.fmyd), rz = (o2.smz / fd.fmzd);
      if (id === 'cb') {
        o += eq('(σ_{c,0,d}/f_{c,0,d})² + σ_{m,y,d}/f_{m,y,d} + k_{m}·σ_{m,z,d}/f_{m,z,d}', '', `${f(o2.c0, 3)}² + ${f(rr, 3)} + ${km}·${f(rz, 3)}`, f(o2.cb1, 3), '', '6.19', st(o2.cb1 <= 1));
        o += eq('(σ_{c,0,d}/f_{c,0,d})² + k_{m}·σ_{m,y,d}/f_{m,y,d} + σ_{m,z,d}/f_{m,z,d}', '', `${f(o2.c0, 3)}² + ${km}·${f(rr, 3)} + ${f(rz, 3)}`, f(o2.cb2, 3), '', '6.20', st(o2.cb2 <= 1));
      } else {
        o += eq('σ_{t,0,d}/f_{t,0,d} + σ_{m,y,d}/f_{m,y,d} + k_{m}·σ_{m,z,d}/f_{m,z,d}', '', `${f(o2.t0, 3)} + ${f(rr, 3)} + ${km}·${f(rz, 3)}`, f(o2.tb1, 3), '', '6.17', st(o2.tb1 <= 1));
        o += eq('σ_{t,0,d}/f_{t,0,d} + k_{m}·σ_{m,y,d}/f_{m,y,d} + σ_{m,z,d}/f_{m,z,d}', '', `${f(o2.t0, 3)} + ${km}·${f(rr, 3)} + ${f(rz, 3)}`, f(o2.tb2, 3), '', '6.18', st(o2.tb2 <= 1));
      }
    }
    if (id === 'v') {
      o += line(`Siły poprzeczne: V<sub>z,Ed</sub> = ${f(s.Vz / 1e3, 3)} kN, V<sub>y,Ed</sub> = ${f(s.Vy / 1e3, 3)} kN`);
      o += eq('τ_{d}', g.type === 'round' ? '4/3·√(V_{y}² + V_{z}²)/(k_{cr}·A)' : '1,5·√(V_{y}² + V_{z}²)/(k_{cr}·b·h)', `${g.type === 'round' ? '4/3' : '1,5'}·${f(Math.hypot(s.Vy, s.Vz), 0)}/(${f(m.kcr, 2)}·${f(g.A, 0)})`, f(o2.tau, 3), 'MPa', '6.13a');
      o += fdLines(R, S, s.co, ['v']) + eq('τ_{d}/f_{v,d}', '', `${f(o2.tau, 3)}/${f(fd.fvd, 3)}`, f(o2.v, 3), '', '6.13', st(o2.v <= 1));
      o += `<p class="note">Przy ścinaniu w dwóch kierunkach przyjęto naprężenie wypadkowe w środku przekroju (oba maksima występują w osi).</p>`;
    }
    if (id === 'b1' || id === 'b2') {
      o += stressLines(R, S, s) + fdLines(R, S, s.co, ['c', 'm']);
      const rr = o2.smy / fd.fmyd, rz = o2.smz / fd.fmzd;
      o += line(`k<sub>c,y</sub> = ${f(b.kcy, 4)}, k<sub>c,z</sub> = ${f(b.kcz, 4)}${R.sp ? ' (słup wielogałęziowy – k<sub>c,z</sub> z λ<sub>ef</sub> dla klasy trwania kombinacji)' : ''}`);
      if (id === 'b1') o += eq('σ_{c,0,d}/(k_{c,y}·f_{c,0,d}) + σ_{m,y,d}/f_{m,y,d} + k_{m}·σ_{m,z,d}/f_{m,z,d}', '', `${f(o2.sc, 3)}/(${f(b.kcy, 4)}·${f(fd.fc0d, 3)}) + ${f(rr, 3)} + ${km}·${f(rz, 3)}`, f(o2.b1, 3), '', '6.23', st(o2.b1 <= 1));
      else o += eq('σ_{c,0,d}/(k_{c,z}·f_{c,0,d}) + k_{m}·σ_{m,y,d}/f_{m,y,d} + σ_{m,z,d}/f_{m,z,d}', '', `${f(o2.sc, 3)}/(${f(b.kcz, 4)}·${f(fd.fc0d, 3)}) + ${km}·${f(rr, 3)} + ${f(rz, 3)}`, f(o2.b2, 3), '', '6.24', st(o2.b2 <= 1));
    }
    if (id === 'ltb' && R.ltb) {
      const l = R.ltb, sS = l.strong === 'y' ? o2.smy : o2.smz, fS = l.strong === 'y' ? fd.fmyd : fd.fmzd, sW = l.strong === 'y' ? o2.smz : o2.smy, fW = l.strong === 'y' ? fd.fmzd : fd.fmyd, kcw = l.strong === 'y' ? b.kcz : b.kcy;
      o += stressLines(R, S, s) + fdLines(R, S, s.co, ['c', 'm']);
      o += eq('(σ_{m,d}/(k_{crit}·f_{m,d}))² + σ_{c,d}/(k_{c}·f_{c,0,d}) + σ_{m,słaba}/f_{m,d}', '', `(${f(sS, 3)}/(${f(l.kcrit, 4)}·${f(fS, 3)}))² + ${f(o2.sc, 3)}/(${f(kcw, 4)}·${f(fd.fc0d, 3)}) + ${f(sW, 3)}/${f(fW, 3)}`, f(o2.ltb, 3), '', '6.35', st(o2.ltb <= 1));
      o += `<p class="note">Składnik zginania wokół osi słabej dodano przy zginaniu dwukierunkowym (praktyka projektowa); bez niego warunek ma postać (6.35).</p>`;
    }
    return o;
  }
  if (id === 'II' || id === 'IIinfo') {
    const bb = R.II.best;
    if (!bb || !bb.co) return line('Brak kombinacji do analizy II rzędu.');
    if (!isFinite(bb.r)) return line(`Kombinacja ${coTxt(bb.co)}: siła ściskająca N = ${f(bb.Nm / 1e3, 2)} kN ≥ N<sub>cr,d</sub> – utrata stateczności.`) + `<span class="fail">✖ warunek NIESPEŁNIONY</span>`;
    const r = bb.co.res, i = bb.i, sol = bb.sol, pl = bb.imp, fd = bb.f;
    const Myy = (pl === 'z' ? sol.z.imp : sol.z.no).M[i], Mzz = (pl === 'y' ? sol.y.imp : sol.y.no).M[i];
    o += line(`Kombinacja ${coTxt(bb.co)}; imperfekcja w płaszczyźnie x–${pl}`);
    o += line(`Przekrój x = ${f(stx(R, i), 3)} m: N<sub>Ed</sub> = ${f(r.N[i] / 1e3, 3)} kN, M<sub>y,Ed</sub><sup>II</sup> = ${f(Myy / 1e6, 3)} kNm (I rząd ${f(r.My[i] / 1e6, 3)}), M<sub>z,Ed</sub><sup>II</sup> = ${f(Mzz / 1e6, 3)} kNm (I rząd ${f(r.Mz[i] / 1e6, 3)})`);
    const o2 = bb.o;
    o += eq('σ_{c,0,d}', 'N/A', '', f(o2.sc, 3), 'MPa') + eq('σ_{m,y,d}', '', '', f(o2.smy, 3), 'MPa') + eq('σ_{m,z,d}', '', '', f(o2.smz, 3), 'MPa');
    o += fdLines(R, S, bb.co, ['c', 'm']);
    o += eq(R.II.lin ? 'σ_{c,0,d}/f_{c,0,d} + σ_{m,y,d}/f_{m,y,d} + k_{m}·σ_{m,z,d}/f_{m,z,d}' : '(σ_{c,0,d}/f_{c,0,d})² + σ_{m,y,d}/f_{m,y,d} + k_{m}·σ_{m,z,d}/f_{m,z,d}', '', '', f(bb.r, 3), '(maksimum obu warunków)', R.II.lin ? '' : '6.19', okS(bb.r <= 1));
    return o;
  }
  if (id === 'b12info' || id === 'b0') return checkDetail(R, S, Object.assign({}, c, { id: c.b && c.b.o && c.b.o.b1 >= c.b.o.b2 ? 'b1' : 'b2' })) || partBuck(R, S);
  if (id === 'ltb0' && R.ltb) return line(`λ<sub>rel,m</sub> = ${f(R.ltb.lamRel, 3)} ≤ 0,75 → k<sub>crit</sub> = 1,0 – zwichrzenie nie redukuje nośności na zginanie (σ<sub>m,crit</sub> = ${f(R.ltb.scrit, 1)} MPa).`, '6.3.3');
  if (id === 'slim') return eq('λ_{max}', 'max(λ_{y}, λ_{z})', `max(${f(R.buck.z.lam, 1)}; ${f(R.buck.y.lam, 1)})`, f(Math.max(R.buck.z.lam, R.buck.y.lam), 1), `${Math.max(R.buck.z.lam, R.buck.y.lam) <= c.Rd ? '≤' : '>'} λ<sub>lim</sub> = ${f(c.Rd, 0)}`) + `<p class="note">${sym(c.note || '')}</p>`;
  if (id === 'spc' || id === 'spm' || id === 'spT') {
    const P = R.sp, sp = S.geom.sp;
    o += line(`Przedziałów: ${P.nb} (wymagane ≥ 3); a = ${f(sp.a, 0)} mm, ${sp.conn === 'pack' ? '3' : '6'}·t = ${f((sp.conn === 'pack' ? 3 : 6) * sp.t, 0)} mm; l<sub>2</sub> = ${f(P.l2, 0)} mm, ${sp.conn === 'pack' ? '1,5' : '2'}·a = ${f((sp.conn === 'pack' ? 1.5 : 2) * sp.a, 0)} mm`, 'C.3.1');
    if (P.Vd !== undefined) {
      const le = P.long.lamEf;
      o += eq('V_{d}', le < 30 ? 'F_{c,d}/(120·k_{c})' : le < 60 ? 'F_{c,d}·λ_{ef}/(3600·k_{c})' : 'F_{c,d}/(60·k_{c})', le < 30 ? `${f(P.Fc, 0)}/(120·${f(P.long.kc, 4)})` : le < 60 ? `${f(P.Fc, 0)}·${f(le, 2)}/(3600·${f(P.long.kc, 4)})` : `${f(P.Fc, 0)}/(60·${f(P.long.kc, 4)})`, f(P.Vd / 1e3, 3), 'kN', 'C.2.4');
      o += eq('T_{d}', 'V_{d}·l_{1}/a_{1}', `${f(P.Vd / 1e3, 3)}·${f(P.l1, 0)}/${f(g.a1, 0)}`, f(P.Td / 1e3, 3), 'kN – siła na łączniki jednej przekładki/nakładki', 'C.18');
    }
    return o + (c.note ? `<p class="note">${sym(c.note)}</p>` : '');
  }
  if (id === 'c90b' || id === 'c90t') {
    const s = id === 'c90b' ? R.conn.sill : R.conn.beam, bb = s.best, mm = s.mm;
    o += line(`${id === 'c90b' ? 'Podwalina' : 'Belka (oczep)'}: ${esc(mm.name)}; szerokość ${f(s.w, 0)} mm; długość styku wzdłuż włókien l = ${f(s.l, 0)} mm, szerokość styku b = ${f(s.bc, 0)} mm`);
    o += eq('l_{ef}', 'l + min(30; a; l) z każdej strony', `${f(s.l, 0)} + ${f(s.lef - s.l, 0)}`, f(s.lef, 0), 'mm', '6.1.5(1)');
    o += eq('A_{ef}', 'b·l_{ef}', `${f(s.bc, 0)}·${f(s.lef, 0)}`, f(s.Aef, 0), 'mm²');
    if (bb.co) {
      o += line(`Kombinacja ${coTxt(bb.co)}: F<sub>c,90,d</sub> = ${f(bb.N / 1e3, 3)} kN`);
      o += eq('σ_{c,90,d}', 'F_{c,90,d}/A_{ef}', `${f(bb.N, 0)}/${f(s.Aef, 0)}`, f(bb.sig, 3), 'MPa');
      o += eq('f_{c,90,d}', 'k_{mod}·f_{c,90,k}/γ_{M}', `${f(bb.co.kmod, 2)}·${f(mm.fc90k, 2)}/${f(mm.gM, 2)}`, f(bb.f, 3), 'MPa');
      o += eq('k_{c,90}', '', '', f(s.kc90, 2), `– ${esc(s.kTxt)}`);
      o += eq('σ_{c,90,d}/(k_{c,90}·f_{c,90,d})', '', `${f(bb.sig, 3)}/(${f(s.kc90, 2)}·${f(bb.f, 3)})`, f(bb.r, 3), '', '6.3', okS(bb.r <= 1));
    }
    return o;
  }
  if (id === 'conc') {
    const p = R.conn.plate;
    o += line(`Blacha ${f(p.a, 0)}×${f(p.b, 0)} mm na betonie ${esc(S.conn.plate.conc)}: f<sub>cd</sub> = α<sub>cc</sub>·f<sub>ck</sub>/γ<sub>c</sub> = ${f(p.acc, 2)}·${f(p.fck, 0)}/${f(p.gc, 2)} = ${f(p.fcd, 2)} MPa`);
    o += eq('A_{c0}', 'a·b', `${f(p.a, 0)}·${f(p.b, 0)}`, f(p.Ac0, 0), 'mm²') + eq('A_{c1}', 'min(B_{1}; 3a)·min(B_{2}; 3b)', `${f(p.d1, 0)}·${f(p.d2, 0)}`, f(p.Ac1, 0), 'mm²');
    o += eq('F_{Rdu}', 'A_{c0}·f_{cd}·√(A_{c1}/A_{c0}) ≤ 3·f_{cd}·A_{c0}', `${f(p.Ac0, 0)}·${f(p.fcd, 2)}·√(${f(p.Ac1, 0)}/${f(p.Ac0, 0)})`, f(p.FRdu / 1e3, 2), 'kN', 'EC2 6.63');
    o += line(`Kombinacja ${coTxt(p.co)}`) + cmp(p.NEd / 1e3, '≤', p.FRdu / 1e3, 'kN', 2);
    o += `<p class="note">Docisk czoła słupa do blachy (ściskanie wzdłuż włókien) – jak warunek σ<sub>c,0,d</sub> ≤ f<sub>c,0,d</sub>.</p>`;
    return o;
  }
  if (['upl', 'Vb', 'Mb'].includes(id)) return line(`${sym(c.name)}: ${f(c.Ed, 2)} ${c.unit}`) + (c.combo ? line(`Kombinacja: ${esc(c.combo)}`) : '') + (c.note ? `<p class="note">${sym(c.note)}</p>` : '');
  if (/^br/.test(id)) { const p = id.slice(2), q = R.conn.brace[p]; return eq('F_{d}', 'N_{d}/k_{f}', `${f(q.Nd / 1e3, 2)}/${f(q.kf, 0)}`, f(q.Fd / 1e3, 3), 'kN', '9.36') + eq('k_{s}', '2·(1 + cos(π/m))', `2·(1 + cos(π/${q.mbays}))`, f(q.ks, 3), '', '9.35') + eq('C', 'k_{s}·N_{d}/a', `${f(q.ks, 3)}·${f(q.Nd, 0)}/${f(q.a, 0)}`, f(q.Creq, 1), 'N/mm – minimalna sztywność stężenia', '9.34'); }
  if (id === 'uinst' || id === 'ufin') {
    const s = R.sls[id === 'uinst' ? 'inst' : 'fin'];
    o += line(`Płaszczyzna x–${s.p}, odcinek l = ${f(s.len / 1000, 3)} m${s.cant ? ' (wspornikowy)' : ''}; maksimum w x = ${f(s.x / 1000, 2)} m`);
    if (id === 'ufin') o += line(`u<sub>fin</sub> = u<sub>inst,G</sub>·(1 + k<sub>def</sub>) + u<sub>inst,Q1</sub>·(1 + ψ<sub>2,1</sub>·k<sub>def</sub>) + Σu<sub>inst,Qi</sub>·(ψ<sub>0,i</sub> + ψ<sub>2,i</sub>·k<sub>def</sub>), k<sub>def</sub> = ${f(m.kdef, 2)}; mnożniki przypadków: ${esc(s.co.f.map(([q, k]) => `${f(k, 3)}·${q.id}`).join(' + '))}`, '2.3.2.2');
    else o += line(`Kombinacja charakterystyczna ${esc(s.co.eq)}: ${esc(s.co.desc)}; sztywność E<sub>0,mean</sub> = ${f(m.E0mean, 0)} MPa`);
    o += cmp(s.u, '≤', s.lim, `mm (l/${id === 'uinst' ? R.sls.limI : R.sls.limF})`, 2, '7.2');
    return o;
  }
  if (id === 'dl') { const d = R.sls.dl; return line(`Δl<sub>inst</sub> = ∫N<sub>k</sub>/(E<sub>0,mean</sub>A)dx = ${f(d.inst, 3)} mm (kombinacja charakterystyczna o największej sile); Δl<sub>qp</sub> = ${f(d.qp, 3)} mm; Δl<sub>fin</sub> = Δl<sub>inst</sub> + k<sub>def</sub>·Δl<sub>qp</sub> = ${f(d.inst, 3)} + ${f(m.kdef, 2)}·${f(d.qp, 3)} = <b>${f(d.fin, 3)} mm</b>`); }
  if (/^fi/.test(id)) return partFire(R, S, c);
  return line(sym(c.name));
}
const DUR_LONG = co => E.DUR[co.dur].r <= 1;
function partFire(R, S, c) {
  const F = R.fire, m = R.m;
  if (!F) return '';
  let o = '';
  o += line(`Wymagana odporność R${F.t}; strony ogrzewane: ${[['t', 'góra (+z)'], ['b', 'dół (−z)'], ['l', 'lewa (−y)'], ['r', 'prawa (+y)']].filter(([k]) => F.faces[k]).map(q => q[1]).join(', ') || 'brak'}; ochrona: ${esc({ none: 'brak', gk: 'płyty g-k typu A/H', gf: 'płyty g-k typu F', wood: 'okładzina drewnopochodna', manual: 't_ch, t_f podane' }[S.fire.prot])}`);
  o += line(`Prędkości zwęglania: β<sub>0</sub> = ${f(m.beta0, 2)} mm/min, β<sub>n</sub> = ${f(m.betan, 2)} mm/min`, 'EN 1995-1-2 tab. 3.1');
  o += line(sym(F.ch.txt), 'EN 1995-1-2 3.4');
  o += eq('d_{ef}', 'd_{char,n} + k_{0}·d_{0}', `${f(F.ch.dchar, 2)} + ${f(F.ch.k0, 3)}·${f(F.ch.d0, 0)}`, f(F.def, 2), 'mm', 'EN 1995-1-2 4.2.2');
  if (!F.ok) return o + line('<span class="fail">✖ Przekrój ulega całkowitemu zwęgleniu – odporność ogniowa niespełniona.</span>');
  const gf = F.gf;
  o += line(`Przekrój resztkowy: ${sym(F.desc)}; A<sub>fi</sub> = ${f(gf.A, 0)} mm², W<sub>y,fi</sub> = ${f(gf.Wy, 0)} mm³, W<sub>z,fi</sub> = ${f(gf.Wz, 0)} mm³${F.shift.y || F.shift.z ? `; przesunięcie środka ciężkości Δe<sub>y</sub> = ${f(F.shift.y, 1)} mm, Δe<sub>z</sub> = ${f(F.shift.z, 1)} mm → dodatkowe momenty N·Δe` : ''}`);
  o += eq('f_{c,0,d,fi}', 'k_{mod,fi}·k_{fi}·f_{c,0,k}/γ_{M,fi}', `1,0·${f(m.kfi, 2)}·${f(m.fc0k, 1)}/${f(F.f.gM, 2)}`, f(F.f.fc0d, 3), 'MPa', 'EN 1995-1-2 2.3') + eq('f_{m,y,d,fi}', 'k_{fi}·k_{h}·f_{m,k}/γ_{M,fi}', `${f(m.kfi, 2)}·${f(F.kh.y, 3)}·${f(m.fmk, 1)}`, f(F.f.fmyd, 3), 'MPa');
  ['z', 'y'].forEach(p => { const b = F.bk[p], ax = p === 'z' ? 'y' : 'z'; o += line(`Oś ${ax}: l<sub>ef</sub> = ${f(b.lef / 1000, 3)} m, i<sub>fi</sub> = ${f(b.i, 2)} mm, λ = ${f(b.lam, 2)}, λ<sub>rel</sub> = ${f(b.lamRel, 4)}, k<sub>c,${ax},fi</sub> = <b>${f(b.kc, 4)}</b>`, '6.3.2'); });
  if (F.ltb) o += line(`Zwichrzenie: σ<sub>m,crit,fi</sub> = ${f(F.ltb.scrit, 2)} MPa, λ<sub>rel,m</sub> = ${f(F.ltb.lamRel, 3)}, k<sub>crit</sub> = ${f(F.ltb.kcrit, 3)}`);
  const show = (key, lab, ref) => {
    const b = F.best[key]; if (!b || !(b.r > 0) || !b.o) return '';
    let s = line(`Kombinacja pożarowa: ${esc(b.co.eta ? b.co.desc : `${b.co.eq}${b.co.lead ? ', wiodące ' + b.co.lead.name : ''}: ${b.co.desc}`)}; x = ${f(stx(R, b.i), 3)} m: N = ${f(b.N / 1e3, 3)} kN, M<sub>y</sub> = ${f(b.My / 1e6, 3)} kNm, M<sub>z</sub> = ${f(b.Mz / 1e6, 3)} kNm`);
    s += line(`σ<sub>c,0,d</sub> = ${f(b.o.sc, 3)} MPa, σ<sub>m,y,d</sub> = ${f(b.o.smy, 3)} MPa, σ<sub>m,z,d</sub> = ${f(b.o.smz, 3)} MPa`);
    return s + eq(lab, '', '', f(b.r, 3), '', ref, okS(b.r <= 1));
  };
  if (!c || c.id === 'fic') { o += show('b1', 'σ_{c,0,d}/(k_{c,y,fi}·f_{c,0,d,fi}) + σ_{m,y,d}/f_{m,y,d,fi} + k_{m}·σ_{m,z,d}/f_{m,z,d,fi}', '6.23'); o += show('b2', 'σ_{c,0,d}/(k_{c,z,fi}·f_{c,0,d,fi}) + k_{m}·σ_{m,y,d}/f_{m,y,d,fi} + σ_{m,z,d}/f_{m,z,d,fi}', '6.24'); }
  if (c && c.id === 'fim') o += show(F.best.cb.r > F.best.tb.r ? 'cb' : 'tb', 'warunek przekroju (6.19/6.20 lub 6.17/6.18)', '');
  if (!c || c.id === 'filtb') o += show('ltb', '(σ_{m,d}/(k_{crit}·f_{m,d,fi}))² + σ_{c,d}/(k_{c,fi}·f_{c,0,d,fi})', '6.35');
  if (!c || c.id === 'fiv') { const b = F.best.v; if (b && b.r > 0) o += eq('τ_{d,fi}/f_{v,d,fi}', '', `${f(b.o.tau, 3)}/${f(F.f.fvd, 3)}`, f(b.r, 3), '', '6.13', okS(b.r <= 1)); }
  return o;
}
function partChecks(R, S) {
  const grpOrder = ['SGN – nośność przekroju', 'SGN – stateczność', 'Oparcie i docisk', 'SGU – przemieszczenia', 'Warunki konstrukcyjne'];
  let o = '';
  grpOrder.forEach(gname => {
    const list = R.checks.filter(c => c.grp === gname);
    if (!list.length) return;
    o += `<h2 data-h2="1">${esc(gname)}</h2>`;
    list.forEach(c => { o += `<h3>${sym(c.name)}${rf(c.ref)}</h3>` + checkDetail(R, S, c); });
  });
  return o;
}

/* ------------------------------------------------------------ raporty */
SDR.build = function (R, S) {
  if (!R || R.errors.length) return `<p class="fail">Błędy danych: ${(R ? R.errors : []).map(esc).join('; ')}</p>`;
  let hn = 0; const H2 = t => `<h2>${++hn}. ${t}</h2>`;
  let o = partHeader(R, S, 'Obliczenia statyczne – słup drewniany');
  o += line('Podstawa: PN-EN 1995-1-1:2010 (Eurokod 5) z Załącznikiem Krajowym, PN-EN 1995-1-2 (pożar), PN-EN 1990 (kombinacje), PN-EN 338:2016 i PN-EN 14080:2013 (klasy drewna), PN-EN 1991 (obciążenia).');
  o += H2('Dane wejściowe') + partData(R, S);
  o += H2('Materiał') + partMat(R, S);
  o += H2('Przekrój') + partSection(R, S);
  o += H2('Obciążenia – wartości charakterystyczne') + partLoads(R, S);
  o += H2('Kombinacje oddziaływań') + partCombos(R, S);
  o += H2('Siły wewnętrzne') + partStatics(R, S);
  o += H2('Stateczność – parametry') + partBuck(R, S);
  // sprawdzenia
  const body = partChecks(R, S).replace(/<h2 data-h2="1">/g, () => `<h2>${++hn}. `);
  o += body;
  if (R.fire) { o += H2(`Odporność ogniowa R${R.fire.t} – metoda zredukowanego przekroju`) + partFire(R, S, null); }
  // zestawienie
  o += H2('Zestawienie sprawdzeń');
  const ticks = S.meta.ticks || {};
  const list = R.checks.filter(c => ticks[c.key]);
  const all = list.length ? list : R.checks;
  if (!list.length) o += `<p class="note">Brak odhaczonych sprawdzeń – zestawienie obejmuje wszystkie sprawdzenia (odhacz je w zakładce Podsumowanie).</p>`;
  let grp = '';
  all.forEach(c => {
    if (c.grp !== grp) { grp = c.grp; o += `<h3>${esc(grp)}</h3>`; }
    const cond = U().ckCond(c);
    o += line(`${sym(c.name)}${cond ? `: ${cond}` : ''}${c.status === 'info' || !isFinite(c.ratio) || c.fmt === 'text' ? '' : `, η = ${f(c.ratio * 100, 0)}%`} – <span class="${c.status}">${U().STL[c.status]}</span>`, c.ref);
  });
  const fails = all.filter(c => c.status === 'fail'), mx = Math.max(0, ...all.filter(c => c.status !== 'info' && isFinite(c.ratio) && c.fmt !== 'text' && !c.warnOnly).map(c => c.ratio));
  o += `<p class="verdict"><span class="${fails.length ? 'fail' : 'ok'}">${fails.length ? `✖ Niespełnione warunki: ${fails.length}.` : `✔ Przedstawione warunki normowe są spełnione. Maksymalne wykorzystanie η = ${f(mx * 100, 0)}%.`}</span></p>`;
  return o;
};
SDR.buildStatic = function (R, S) {
  if (!R || R.errors.length) return `<p class="fail">Błędy danych: ${(R ? R.errors : []).map(esc).join('; ')}</p>`;
  let hn = 0; const H2 = t => `<h2>${++hn}. ${t}</h2>`;
  let o = partHeader(R, S, 'Statyka – słup drewniany');
  o += H2('Dane wejściowe') + partData(R, S);
  o += H2('Przekrój i materiał') + partSection(R, S) + kv([['Materiał', `${esc(R.m.name)}: E<sub>0,mean</sub> = ${f(R.m.E0mean, 0)} MPa, γ = ${f(R.m.gamma, 2)} kN/m³`]]);
  o += H2('Obciążenia – wartości charakterystyczne') + partLoads(R, S);
  o += H2('Kombinacje oddziaływań') + partCombos(R, S);
  o += H2('Siły wewnętrzne i reakcje') + partStatics(R, S);
  o += H2('Długości wyboczeniowe') + ['z', 'y'].map(p => line(`Płaszczyzna x–${p}: l<sub>ef</sub> = ${f(R.buck[p].lef / 1000, 3)} m (β = ${f(R.buck[p].beta, 3)})`)).join('');
  return o;
};
// „jak obliczono” – fragment raportu dla jednego sprawdzenia
SDR.explain = function (R, S, c) {
  let o = `<p class="note">${esc(c.grp)} · ${esc(c.ref)}${c.combo ? ' · ' + esc(c.combo) : ''}</p>`;
  if (['b1', 'b2', 'b0', 'ltb', 'ltb0', 'II', 'IIinfo', 'b12info', 'slim'].includes(c.id)) o += `<h3>Parametry stateczności</h3>` + partBuck(R, S).replace(/<div class="fig">[\s\S]*?<\/svg><\/div>/, '');
  o += `<h3>Sprawdzenie</h3>` + checkDetail(R, S, c);
  return S.meta.refs ? o : SDR.noRefs(o);
};
// raport bez odwołań do punktów norm (zostają numery wzorów kombinacji)
SDR.noRefs = function (html) {
  const t = document.createElement('template'); t.innerHTML = html;
  t.content.querySelectorAll('span.rf').forEach(n => n.remove());
  t.content.querySelectorAll('span.r').forEach(sp => sp.remove());
  return t.innerHTML;
};

/* ------------------------------------------------- raport do edytowalnego pliku OpenDocument (.odt) */
SDR.odt = async function (html, title) {
  const x = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;'; host.innerHTML = html; document.body.appendChild(host);
  const pics = [];
  const svgPng = async svg => {
    const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;
    const w = vb ? vb.width : (+svg.getAttribute('width') || 800), h = vb ? vb.height : (+svg.getAttribute('height') || 400);
    const cl = svg.cloneNode(true); cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); cl.setAttribute('width', w); cl.setAttribute('height', h); cl.removeAttribute('style');
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(cl).replace(/var\(--[^,)]+,\s*([^)]+\)?)\)/g, '$1').replace(/var\(--[^)]+\)/g, '#1b2230'));
    const img = new Image(); await new Promise(res => { img.onload = res; img.onerror = res; img.src = src; });
    const k = 2, cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const cx = cv.getContext('2d'); cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, cv.width, cv.height); try { cx.drawImage(img, 0, 0, cv.width, cv.height); } catch (e) { /* */ }
    const b64 = cv.toDataURL('image/png').split(',')[1], bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const name = `Pictures/r${pics.length + 1}.png`; pics.push({ name, data: u });
    const wcm = Math.min(17, w / 96 * 2.54 * 0.85), hcm = wcm * h / w;
    return `<draw:frame draw:name="r${pics.length}" text:anchor-type="as-char" svg:width="${wcm.toFixed(2)}cm" svg:height="${hcm.toFixed(2)}cm"><draw:image xlink:href="${name}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
  };
  const inline = async el => {
    let o = '';
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { o += x(n.nodeValue.replace(/\s+/g, ' ')); continue; }
      if (n.nodeType !== 1) continue;
      const t = n.tagName.toLowerCase();
      if (t === 'svg') { o += await svgPng(n); continue; }
      if (t === 'br') { o += '<text:line-break/>'; continue; }
      if (t === 'sub') { o += `<text:span text:style-name="Tsub">${await inline(n)}</text:span>`; continue; }
      if (t === 'sup') { o += `<text:span text:style-name="Tsup">${await inline(n)}</text:span>`; continue; }
      if (t === 'b' || t === 'strong' || t === 'th') { o += `<text:span text:style-name="Tb">${await inline(n)}</text:span>`; continue; }
      if (t === 'i' || t === 'em') { o += `<text:span text:style-name="Ti">${await inline(n)}</text:span>`; continue; }
      if (n.classList && (n.classList.contains('ok') || n.classList.contains('fail') || n.classList.contains('warn'))) { o += `<text:span text:style-name="${n.classList.contains('ok') ? 'Tok' : n.classList.contains('fail') ? 'Tfail' : 'Twarn'}">${await inline(n)}</text:span>`; continue; }
      if (n.classList && n.classList.contains('r')) { o += `<text:tab/>${await inline(n)}`; continue; }
      o += await inline(n);
    }
    return o;
  };
  let body = `<text:p text:style-name="Title">${x(title || 'Raport obliczeń')}</text:p>`;
  const block = async el => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { if (n.nodeValue.trim()) body += `<text:p text:style-name="Body">${x(n.nodeValue.trim())}</text:p>`; continue; }
      if (n.nodeType !== 1) continue;
      const t = n.tagName.toLowerCase();
      if (t === 'br') continue;
      if (/^h[1-4]$/.test(t)) { body += `<text:h text:style-name="H${t[1]}" text:outline-level="${+t[1] > 1 ? +t[1] - 1 : 1}">${await inline(n)}</text:h>`; continue; }
      if (t === 'table') {
        if (n.classList.contains('pwrap')) { const tb = n.querySelector('td.pbody'); if (tb) await block(tb); continue; }
        const rows = [...n.querySelectorAll('tr')]; if (!rows.length) continue;
        const nc = Math.max(...rows.map(r => [...r.children].reduce((a, c) => a + (+c.getAttribute('colspan') || 1), 0)));
        body += `<table:table table:style-name="Tab"><table:table-column table:number-columns-repeated="${nc}"/>`;
        for (const r of rows) { body += '<table:table-row>'; for (const c of r.children) { const cs = +c.getAttribute('colspan') || 1; body += `<table:table-cell table:style-name="Cell" office:value-type="string"${cs > 1 ? ` table:number-columns-spanned="${cs}"` : ''}><text:p text:style-name="${c.tagName === 'TH' ? 'Th' : 'Td'}">${await inline(c)}</text:p></table:table-cell>`; for (let k = 1; k < cs; k++) body += '<table:covered-table-cell/>'; } body += '</table:table-row>'; }
        body += '</table:table>'; continue;
      }
      if (t === 'div' && n.classList.contains('fig')) { body += `<text:p text:style-name="Fig">${await inline(n)}</text:p>`; continue; }
      if (t === 'ul' || t === 'ol') { for (const li of n.children) body += `<text:p text:style-name="Li">• ${await inline(li)}</text:p>`; continue; }
      if (t === 'div' && n.children.length && [...n.children].some(c => /^(h[1-4]|table|div|p|ul|ol)$/i.test(c.tagName)) && !n.classList.contains('eq')) { await block(n); continue; }
      const st = n.classList.contains('eq') ? 'Eq' : n.classList.contains('note') ? 'Note' : n.classList.contains('verdict') ? 'Verdict' : 'Body';
      const tx = await inline(n); if (tx.trim()) body += `<text:p text:style-name="${st}">${tx}</text:p>`;
    }
  };
  try { await block(host); } finally { host.remove(); }
  const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2"';
  const ps = (n, o) => `<style:style style:name="${n}" style:family="paragraph"><style:paragraph-properties fo:margin-top="${o.mt || '0cm'}" fo:margin-bottom="${o.mb || '0.1cm'}"${o.ml ? ` fo:margin-left="${o.ml}"` : ''}${o.tab ? '><style:tab-stops><style:tab-stop style:position="16.5cm" style:type="right"/></style:tab-stops></style:paragraph-properties>' : '/>'}<style:text-properties fo:font-size="${o.fs || '10pt'}"${o.b ? ' fo:font-weight="bold"' : ''}${o.c ? ` fo:color="${o.c}"` : ''}${o.it ? ' fo:font-style="italic"' : ''}/></style:style>`;
  const styles = `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS}><office:styles><style:default-style style:family="paragraph"><style:text-properties style:font-name="Calibri" fo:font-family="Calibri, Arial, sans-serif" fo:font-size="10pt" fo:language="pl" fo:country="PL"/></style:default-style></office:styles><office:automatic-styles><style:page-layout style:name="PL"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="1.8cm" fo:margin-bottom="1.8cm" fo:margin-left="2cm" fo:margin-right="1.8cm"/></style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PL"/></office:master-styles></office:document-styles>`;
  const content = `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}><office:automatic-styles>` +
    ps('Title', { fs: '16pt', b: true, mb: '0.3cm' }) + ps('H1', { fs: '14pt', b: true, mt: '0.3cm', mb: '0.15cm' }) + ps('H2', { fs: '12.5pt', b: true, mt: '0.4cm', mb: '0.15cm', c: '#1d3f78' }) + ps('H3', { fs: '11pt', b: true, mt: '0.25cm', mb: '0.1cm' }) + ps('H4', { fs: '10pt', b: true, mt: '0.2cm' }) +
    ps('Body', {}) + ps('Eq', { ml: '0.4cm', tab: true }) + ps('Note', { fs: '9pt', it: true, c: '#4a5466' }) + ps('Verdict', { fs: '11pt', b: true, mt: '0.3cm' }) + ps('Li', { ml: '0.4cm' }) + ps('Fig', { mt: '0.2cm', mb: '0.2cm' }) + ps('Td', { fs: '9pt', mb: '0cm' }) + ps('Th', { fs: '9pt', b: true, mb: '0cm' }) +
    `<style:style style:name="Tsub" style:family="text"><style:text-properties style:text-position="sub 58%"/></style:style><style:style style:name="Tsup" style:family="text"><style:text-properties style:text-position="super 58%"/></style:style><style:style style:name="Tb" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style><style:style style:name="Ti" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>` +
    `<style:style style:name="Tok" style:family="text"><style:text-properties fo:color="#1d7f3c" fo:font-weight="bold"/></style:style><style:style style:name="Tfail" style:family="text"><style:text-properties fo:color="#c0262d" fo:font-weight="bold"/></style:style><style:style style:name="Twarn" style:family="text"><style:text-properties fo:color="#a35d00" fo:font-weight="bold"/></style:style>` +
    `<style:style style:name="Tab" style:family="table"><style:table-properties style:width="17cm" table:align="left" fo:margin-top="0.15cm" fo:margin-bottom="0.15cm"/></style:style><style:style style:name="Cell" style:family="table-cell"><style:table-cell-properties fo:padding="0.05cm" fo:border="0.5pt solid #9aa3b0"/></style:style>` +
    `</office:automatic-styles><office:body><office:text>${body}</office:text></office:body></office:document-content>`;
  const manifest = `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text" manifest:version="1.2"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>${pics.map(p => `<manifest:file-entry manifest:full-path="${p.name}" manifest:media-type="image/png"/>`).join('')}</manifest:manifest>`;
  const enc = new TextEncoder();
  return SDR.zip([{ name: 'mimetype', data: enc.encode('application/vnd.oasis.opendocument.text') }, { name: 'META-INF/manifest.xml', data: enc.encode(manifest) }, { name: 'styles.xml', data: enc.encode(styles) }, { name: 'content.xml', data: enc.encode(content) }, ...pics]);
};
// ZIP (metoda „stored”, CRC-32) – wystarcza dla OpenDocument
SDR.zip = function (files) {
  const T = SDR._crcT || (SDR._crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })());
  const crc = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = T[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  const d = new Date(), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  files.forEach(fl => {
    const nm = enc.encode(fl.name), c = crc(fl.data), sz = fl.data.length;
    const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, tm, true); lh.setUint16(12, dt, true); lh.setUint32(14, c, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), nm, fl.data);
    const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, tm, true); ch.setUint16(14, dt, true); ch.setUint32(16, c, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
    cen.push(new Uint8Array(ch.buffer), nm);
    off += 30 + nm.length + sz;
  });
  const cs = cen.reduce((a, u) => a + u.length, 0), ed = new DataView(new ArrayBuffer(22)); ed.setUint32(0, 0x06054b50, true); ed.setUint16(8, files.length, true); ed.setUint16(10, files.length, true); ed.setUint32(12, cs, true); ed.setUint32(16, off, true);
  const all = [...parts, ...cen, new Uint8Array(ed.buffer)], n = all.reduce((a, u) => a + u.length, 0), out = new Uint8Array(n); let p = 0; all.forEach(u => { out.set(u, p); p += u.length; });
  return out;
};
})();
