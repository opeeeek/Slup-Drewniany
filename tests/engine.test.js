/* Testy silnika SłupDrewniany – porównanie z obliczeniami ręcznymi (node tests/engine.test.js) */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', 'src', 'js', 'engine.js'));
let n = 0, bad = 0;
const near = (name, v, ref, tol) => { n++; const ok = Math.abs(v - ref) <= (tol || 1e-3) * Math.max(1, Math.abs(ref)); if (!ok) { bad++; console.log(`✖ ${name}: ${v} ≠ ${ref}`); } else console.log(`✔ ${name}: ${+v.toFixed(5)}`); };
const truthy = (name, c) => { n++; if (!c) { bad++; console.log('✖ ' + name); } else console.log('✔ ' + name); };

/* 1. Materiał C24 (PN-EN 338:2016) */
const S0 = E.defaultState();
const m = E.matOf(S0);
near('C24 fc0k', m.fc0k, 21); near('C24 E005', m.E005, 7400); near('C24 γM', m.gM, 1.3); near('kmod SC1 short', m.kmodT.short, 0.9);
near('kh h=140 (lite)', E.khOf(m, 140).k, Math.pow(150 / 140, 0.2));
near('kh GL h=200', E.khOf(E.matOf(Object.assign(E.defaultState(), { mat: Object.assign(E.defaultState().mat, { cls: 'GL24h' }) })), 200).k, Math.min(1.1, Math.pow(3, 0.1)));

/* 2. Współczynnik wyboczeniowy (6.25–6.29): λrel = 1,2587; βc = 0,2 */
const k1 = E.kcOf(1.2587159960301502, 0.2);
near('k (6.27)', k1.k, 0.5 * (1 + 0.2 * (1.2587159960301502 - 0.3) + 1.2587159960301502 ** 2));
near('kc (6.25)', k1.kc, 1 / (k1.k + Math.sqrt(k1.k ** 2 - 1.2587159960301502 ** 2)));
near('kcrit λ=1,0', E.kcritOf(1.0), 0.81); near('kcrit λ=2', E.kcritOf(2), 0.25);

/* 3. Słup przegubowy 140×140 C24, L = 3 m, N: G = 40 kN, S = 25 kN (śnieg wiodący) */
const R = E.calc(E.defaultState());
truthy('brak błędów', !R.errors.length);
near('l_ef,y (MES) = L', R.buck.z.lef, 3000, 1e-6);
const lam = 3000 / (140 / Math.sqrt(12)); near('λ_y', R.buck.z.lam, lam);
near('λ_rel,y', R.buck.z.lamRel, lam / Math.PI * Math.sqrt(21 / 7400));
const sw = 4.2 * 0.14 * 0.14 * 3;                      // ciężar własny [kN]
const NEd = 0.85 * 1.35 * (40 + sw) + 1.5 * 25;          // 6.10b, śnieg wiodący
near('N_Ed (6.10b)', R.conn.plate.NEd / 1e3, NEd);
const c0 = R.checks.find(c => c.id === 'c0'); near('σc,0,d', c0.Ed, NEd * 1e3 / 19600); near('fc,0,d (kmod 0,9)', c0.Rd, 0.9 * 21 / 1.3);
const b1 = R.checks.find(c => c.id === 'b1'); near('(6.23) wykorzystanie', b1.Ed, NEd * 1e3 / 19600 / (R.buck.z.kc * 0.9 * 21 / 1.3));

/* 4. Wspornik: l_ef = 2L; moment w utwierdzeniu od q = 0,8 kN/m (wiatr wiodący, 1,5): M = 1,5·0,8·3²/2 */
const S4 = E.defaultState(); S4.supp.z = { base: 'fix', top: 'free', kb: '', braces: '' }; S4.supp.y = { base: 'fix', top: 'free', kb: '', braces: '' };
const R4 = E.calc(S4);
near('wspornik l_ef = 2L', R4.buck.z.lef, 6000, 1e-6);
near('M w utwierdzeniu', R4.conn.Mb.v / 1e6, 1.5 * 0.8 * 9 / 2, 1e-4);
const u = 0.8 * 3000 ** 4 / (8 * 11000 * 140 ** 4 / 12);  // u = q·L⁴/(8EI)
near('u_inst wierzchołka (q·L⁴/8EI)', R4.sls.inst.u, u, 1e-3);

/* 5. Przegub–przegub, q = 0,8 kN/m: M_max = q·L²/8 (wiatr wiodący 1,5) */
const S5 = E.defaultState(); S5.loads.items = [{ kind: 'wind', name: 'W', qz: 0.8 }]; S5.loads.sw = false;
const R5 = E.calc(S5);
near('|M_y|max = 1,5·q·L²/8', Math.max(Math.abs(R5.ext.Mymax.v), Math.abs(R5.ext.Mymin.v)) / 1e6, 1.5 * 0.8 * 9 / 8, 1e-4);
near('u = 5qL⁴/384EI', R5.sls.inst.u, 5 * 0.8 * 3000 ** 4 / (384 * 11000 * 140 ** 4 / 12), 1e-3);

/* 6. Utwierdzenie–przegub: l_ef ≈ 0,699·L */
const S6 = E.defaultState(); S6.supp.z = { base: 'fix', top: 'pin', kb: '', braces: '' };
near('l_ef utwierdzenie–przegub', E.calc(S6).buck.z.lef / 3000, 0.6992, 2e-3);
const S7 = E.defaultState(); S7.supp.z = { base: 'fix', top: 'fix', kb: '', braces: '' };
near('l_ef utwierdzenie–utwierdzenie', E.calc(S7).buck.z.lef / 3000, 0.5, 2e-3);
const S8 = E.defaultState(); S8.supp.z = { base: 'fix', top: 'guided', kb: '', braces: '' };
near('l_ef utwierdzenie–przesuwne', E.calc(S8).buck.z.lef / 3000, 1.0, 2e-3);
const S9 = E.defaultState(); S9.supp.y.braces = '1,5';
near('l_ef ze stężeniem w połowie', E.calc(S9).buck.y.lef / 3000, 0.5, 2e-3);

/* 7. Pożar R30, GL24h: d_char,n = 0,7·30, d_ef = d_char + 7 */
const ch = E.charDepth({ prot: 'none', d0: 7 }, E.matOf(Object.assign(E.defaultState(), { mat: Object.assign(E.defaultState().mat, { cls: 'GL24h' }) })), 30);
near('d_ef R30 GL', ch.def, 28);
const ch15 = E.charDepth({ prot: 'none', d0: 7 }, m, 15); near('d_ef R15 C24 (k0 = 0,75)', ch15.def, 0.8 * 15 + 0.75 * 7);

/* 8. Słup wielogałęziowy (zał. C.3): λ_ef = √(λ² + η·n/2·λ1²) */
const S10 = E.defaultState(); S10.geom.type = 'spaced'; S10.loads.items[2].qz = 0;
const R10 = E.calc(S10), sp = S10.geom.sp;
const Iz = 2 * (sp.w * sp.t ** 3 / 12 + sp.w * sp.t * ((sp.t + sp.a) / 2) ** 2), A = 2 * sp.w * sp.t;
const lamz = 3000 * Math.sqrt(A / Iz), lam1 = Math.max(30, Math.sqrt(12) * 3000 / sp.nb / sp.t);
near('λ_ef (C.15), η = 4', R10.sp.long.lamEf, Math.sqrt(lamz ** 2 + 4 * 2 / 2 * lam1 ** 2));

/* 9. Kombinacje: liczba i k_mod */
truthy('kombinacja z wiatrem ma k_mod = 1,1', R.combos.uls.some(c => c.on.some(q => q.kind === 'wind') && c.kmod === 1.1));
truthy('kombinacja tylko stałych ma k_mod = 0,6', R.combos.uls.some(c => !c.on.length && c.kmod === 0.6));

/* 10. Śnieg – strefa 2: s = 0,8·0,9 = 0,72 kN/m² */
near('śnieg strefa 2', E.genSnow({ zone: 2, alt: 200, slope: 10, area: 10 }).N, 7.2);
near('wiatr q_p (strefa 1, teren III, z = 10 m)', E.genWind({ zone: 1, alt: 200, terr: 'III', z: 10, c: 1, width: 1 }).qp, 1.9 * 0.5 * 1.25 * 22 * 22 / 1000);

console.log(`\n${n - bad}/${n} testów zaliczonych`);
process.exit(bad ? 1 : 0);
