// Renders one scene from scenes.js to a PNG with headless Chromium.
// usage: node render.mjs <scene> <width> <height> <out.png>
// Set CHROMIUM_PATH if Chromium isn't at /opt/pw-browsers/chromium.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [scene, w, h, out, extra = ''] = process.argv.slice(2);
const root = path.dirname(new URL(import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const srv = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = srv.address().port;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text().slice(0, 300)); });
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
await p.goto(`http://localhost:${port}/scene.html?scene=${scene}&w=${w}&h=${h}${extra}`);
await p.waitForFunction(() => window.__done, null, { timeout: 590000, polling: 500 });
const err = await p.evaluate(() => window.__err);
if (err) { console.log('ERR', err); process.exit(1); }
console.log(scene, await p.evaluate(() => JSON.stringify(window.__info)));
const data = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
await b.close(); srv.close();
