// Renders the favicon PNGs and the 1200x630 social preview into ./out.
// build.sh runs it after the WebP files exist; finish-icons.py then copies the results into place.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const site = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const font = fs.readFileSync(`${site}/assets/fonts/plus-jakarta-sans-latin.woff2`).toString('base64');
const hero = fs.readFileSync(`${site}/assets/img/hero-2400.webp`).toString('base64');
const svg = fs.readFileSync(`${site}/assets/img/favicon.svg`, 'utf8');
const spark = '<path d="M12 0c.6 6.3 5.7 11.4 12 12-6.3.6-11.4 5.7-12 12-.6-6.3-5.7-11.4-12-12C6.3 11.4 11.4 6.3 12 0Z"/>';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });

// icons
for (const [name, size, pad] of [['apple-touch-icon.png', 180, 0], ['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 1], ['fav-48.png', 48, 0], ['fav-32.png', 32, 0], ['fav-16.png', 16, 0]]) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  const body = pad
    ? `<div style="width:100%;height:100%;background:#2c2745;display:grid;place-items:center"><svg viewBox="0 0 24 24" width="${size * 0.46}" height="${size * 0.46}" fill="#f3f2fc">${spark}</svg></div>`
    : svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
  await p.setContent(`<html><body style="margin:0;background:transparent">${body}</body></html>`);
  await p.screenshot({ path: `out/${name}`, omitBackground: true });
  await p.close();
}

// social preview 1200x630
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(`<html><head><style>
@font-face{font-family:PJS;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:400 600}
body{margin:0;font-family:PJS}
.c{position:relative;width:1200px;height:630px;overflow:hidden;background:#f3f2fc}
.c img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 100%}
.t{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding-top:62px;text-align:center;color:#25223d}
.brand{display:flex;align-items:center;gap:10px;font-size:26px;font-weight:500;letter-spacing:-.02em}
.brand svg{width:30px;height:30px;fill:#2c2745}
h1{margin:26px 0 14px;font-size:84px;font-weight:500;letter-spacing:-.045em;line-height:1}
p{margin:0;font-size:25px;color:#3d3a56;letter-spacing:-.01em}
</style></head><body><div class="c"><img src="data:image/webp;base64,${hero}"><div class="t">
<div class="brand"><svg viewBox="0 0 24 24">${spark}</svg>Tranom</div>
<h1>Recover What's Yours</h1><p>AI-powered Roblox account recovery</p></div></div></body></html>`);
await p.waitForTimeout(300);
await p.screenshot({ path: 'out/og.png' });
await b.close();
