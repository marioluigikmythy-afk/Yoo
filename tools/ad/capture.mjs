// Plays the ad stage frame by frame in headless Chromium and encodes it with ffmpeg.
// usage: node capture.mjs <cfg.json> stills <out-dir> <t1,t2,...>
//        node capture.mjs <cfg.json> video <out.mp4> [fps]
// Serves this folder at /, tools/render at /render/ and the website (repo root) at /site/ so the ad can show the real pages.
// Writes <cfg>.events.json (sound cues) for audio.py. Set CHROMIUM_PATH if Chromium isn't at /opt/pw-browsers/chromium.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [cfgPath, mode, out, arg] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const root = path.dirname(new URL(import.meta.url).pathname);
const site = process.env.SITE_ROOT || path.resolve(root, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  let f;
  if (u.startsWith('/site/')) f = path.join(site, u.slice(6) || 'index.html');
  else if (u.startsWith('/render/')) f = path.join(root, '..', u); // shared 3D helpers in tools/render
  else f = path.join(root, u === '/' ? 'stage/index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(0);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)); });
await p.goto(`http://localhost:${srv.address().port}/stage/index.html`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const { events } = await p.evaluate((c) => window.setup(c), cfg);
fs.writeFileSync(cfgPath.replace('.json', '.events.json'), JSON.stringify(events));
if (mode === 'stills') {
  fs.mkdirSync(out, { recursive: true });
  for (const t of arg.split(',').map(Number)) {
    await p.evaluate((tt) => window.renderAt(tt), t);
    await p.screenshot({ path: path.join(out, `t${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 85 });
  }
} else {
  const fps = +(arg || 30), n = Math.round(cfg.duration * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await p.evaluate((tt) => window.renderAt(tt), i / fps);
    const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('done', out, n, 'frames in', ((Date.now() - t0) / 1000).toFixed(0), 's');
}
await b.close();
srv.close();
