/* Budowanie: jeden plik HTML (dist/SlupDrewniany.html) z osadzonym CSS i JS – używany przez przeglądarkę i host Windows (host/web/index.html). */
'use strict';
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, 'src');
let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(src, 'css', 'app.css'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="css\/app\.css" id="appcsslink">/, () => `<style id="appcss">\n${css}</style>`);
html = html.replace(/<script src="js\/([a-z]+)\.js"><\/script>/g, (m, n) => {
  const js = fs.readFileSync(path.join(src, 'js', n + '.js'), 'utf8');
  if (/<\/script/i.test(js)) throw new Error(`${n}.js zawiera "</script"`);
  return `<script>\n${js}</script>`;
});
for (const out of [path.join(__dirname, 'dist', 'SlupDrewniany.html'), path.join(__dirname, 'host', 'web', 'index.html')]) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log('zapisano', path.relative(__dirname, out), (html.length / 1024).toFixed(0) + ' kB');
}
