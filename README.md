# Tranom

Landing page and recovery assistant for **Tranom**, an AI helper that gets players back into their Roblox accounts through Roblox's official recovery channels.

The design follows a soft lavender, "flower field" art direction: rounded cards on light grey, Plus Jakarta Sans type, and 3D renders of a key, padlock, shield, phone and envelope growing out of purple blossoms.

## What's on the page

- **Hero, intro and feature cards** with the 3D artwork.
- **Use cases**: hacked accounts, forgotten password or username, lost 2-Step Verification, and ban appeals. Each card links into the assistant with that situation preselected.
- **Recovery assistant**: four questions produce a recovery path, ordered steps with links to the official Roblox pages, a proof-of-ownership meter, and an editable message for Roblox Support (or an appeal) with a copy button.
- **Security checklist** for after the account is back. Ticks are remembered in the browser.
- Safety promises, FAQ, and a closing call to action.

The assistant runs entirely in the browser. Nothing is sent to a server, and it never asks for passwords, cookies or verification codes.

## Run it

It's a static site with no build step. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

It deploys as-is to GitHub Pages, Netlify, Vercel or any static host.

## Project layout

```
index.html            page markup
assets/css/styles.css design tokens and all styles
assets/js/main.js     mobile menu, recovery assistant, checklist
assets/img/           WebP renders, favicon, social image
tools/render/         Three.js scenes that generate the images
```

## Regenerating the images

Every image is rendered from code in `tools/render`, so you can change colours, objects or camera angles and re-render.

```bash
cd tools/render
npm install
npm run build   # renders all scenes and writes assets/img/*.webp
```

Rendering uses headless Chromium through `playwright-core`. Set `CHROMIUM_PATH` if your Chromium isn't at `/opt/pw-browsers/chromium`. `convert.py` needs Python with Pillow.

- `kit.js` holds the flower-field generator, materials, lighting and the 3D objects.
- `scenes.js` composes each image (camera, objects, field settings).
- `node render.mjs <scene> <width> <height> <out.png>` renders a single scene.

## Making the assistant use a real AI model

The current assistant is rule-based so it works offline and keeps data on the device. To add a language model (for example, to rewrite the support message in the user's own tone), put a small server endpoint in front of the model API and call it from `buildMessage` in `assets/js/main.js`. Keep API keys on the server, never in the page.

## Legal

Tranom is not affiliated with, endorsed by, or sponsored by Roblox Corporation. Roblox is a trademark of Roblox Corporation.
