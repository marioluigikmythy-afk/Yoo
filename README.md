# Tranom

Website for **Tranom**, a paid, AI-assisted service that helps players get their Roblox accounts back through Roblox's official recovery channels.

The design follows a soft lavender, "flower field" art direction: rounded cards on light grey, Plus Jakarta Sans type, and 3D renders of a key, padlock, shield, phone and envelope growing out of purple blossoms.

## Before launch

Fill these in before the site goes live:

| What | Where |
| --- | --- |
| **Form endpoint.** The "Start recovery" form needs a service to receive submissions. Create a form on [Formspree](https://formspree.io) (or a similar service that accepts `POST` requests) and paste its URL into `data-endpoint=""` on `#start-form`. Until then the form tells visitors to email you instead. | `tools/pages/content/index.html` |
| **Domain.** Every absolute URL uses `https://tranom.com`. Replace it if your domain is different. | `tools/pages/build_pages.py` (`SITE`), `sitemap.xml`, `robots.txt` |
| **Governing law.** The Terms use the State of Washington, based on the Spokane address. Change it if Tranom Technologies LLC is registered in another state. | `tools/pages/content/terms.html` |
| **Policy review.** The Privacy Policy and Terms are a starting point, not legal advice. Have them checked, especially data retention and the refund rules. | `tools/pages/content/privacy.html`, `terms.html` |

## Editing pages and business facts

Every HTML page, including the home page, is generated. Edit the files in `tools/pages/`, then rebuild:

```bash
python3 tools/pages/build_pages.py
```

- **Business facts** (legal name, address, email, reply time, prices) live in one place: `BUSINESS` at the top of `tools/pages/build_pages.py`. Page text uses tokens such as `{{STANDARD}}`, `{{PRIORITY}}`, `{{EMAIL}}` and `{{ADDRESS}}`, so a price change updates every page, the Terms and the structured data together.
- **Page text** lives in `tools/pages/content/*.html`.
- **Header, footer, cookie banner and the "How we keep you safe" list** are defined once in `build_pages.py`. Put `{{ASSURE}}` under any new "Start recovery" button to show the list.
- **Structured data:** every page has the Organization schema (legal name, address, email, logo). The pricing page adds a Service schema with both prices as Offers. There is no phone, `sameAs` or rating schema, because there are no phone line, review profiles or reviews yet. Add `sameAs` links in `org_node()` once real profiles exist, and add ratings only for real, verifiable reviews.

## What's on the site

- `index.html`: hero, an honest **Free vs. Tranom** comparison that links to the free Roblox Support form, use cases, how it works, the **Start recovery** form, **How we keep you safe**, FAQ (including "Is Tranom legit?" and "Why pay when Roblox support is free?") and a closing call to action.
- `pricing.html`: Standard case $49 and Priority case $99, what both include, no hidden fees, the refund promise and how to request a refund.
- `about.html`: company details (Tranom Technologies LLC, Spokane address), why Tranom exists, how people check T1, and what Tranom is and isn't.
- `contact.html`: email, reply within one business day, business address, and a link to free Roblox Support.
- `t1.html`: **Meet T1**, the case agent that follows up with Roblox every day.
- `privacy.html`, `terms.html` and a custom `404.html`.
- A short "How we keep you safe" list under every main "Start recovery" button: no passwords, codes or cookies; official Roblox channels only; not affiliated with Roblox; refund promise; registered business address.
- Cookie consent banner, `sitemap.xml`, `robots.txt`, `site.webmanifest`, favicons and a social preview image.

### The recovery form

- Validates each field as you go and again on submit: required fields, email format, Roblox username rules (3 to 20 characters, letters, numbers and one underscore), and a 20-character minimum for the description.
- Refuses messages that contain a password or a Roblox cookie, because Tranom never needs them.
- Spam protection: a hidden honeypot field (`_gotcha`, which Formspree also understands), a minimum fill time of 3 seconds, a limit of one request per minute per browser, and a maximum of two links per message. Bots that trip a check see a normal success message and nothing is sent.
- For stronger protection, turn on your form service's spam filtering, or add Cloudflare Turnstile or hCaptcha.

### Adding analytics later

Analytics should only load after a visitor clicks **Accept**. Add the script like this and `main.js` activates it after consent:

```html
<script type="text/plain" data-consent-category="analytics" data-src="https://example-analytics.com/script.js"></script>
```

## Performance and quality

Lighthouse (mobile): every page scores 100 for Accessibility, Best Practices and SEO, and 96 to 100 for Performance.

- Fonts are self-hosted (`assets/fonts`, SIL Open Font License), so no request goes to Google.
- Images are WebP in several sizes with `srcset`, and only the hero loads up front.
- Text colours meet WCAG AA contrast (4.5:1 or better).

## Run it locally

It's a static site with no build step:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

It deploys as-is to Netlify, Cloudflare Pages, GitHub Pages, Vercel or any static host. `404.html` uses root-relative paths (`/assets/...`), so serve the site from the root of its domain.

## Project layout

```
index.html, pricing.html, about.html, contact.html, t1.html, privacy.html, terms.html, 404.html   (generated)
assets/css/styles.css   design tokens and all styles
assets/js/main.js       mobile menu, cookie consent, form validation and spam checks
assets/fonts/           Plus Jakarta Sans (self-hosted)
assets/img/             WebP renders, icons, social image
tools/pages/            page generator, business facts and the text of every page
tools/render/           Three.js scenes that generate the images
tools/video/            source for the TikTok videos (stage, voice script, music and sound effects)
tools/ad/               source for the ad (3D character and room, phone screens, voice, score)
marketing/tiktok/       finished TikTok videos, cover, subtitles and post copy
marketing/ad/           finished ad, cover, subtitles and post copy
```

## Regenerating the images

Every image is rendered from code in `tools/render`, so you can change colours, objects or camera angles and render again:

```bash
cd tools/render
npm install
npm run build   # renders all scenes, writes assets/img/*.webp, icons and og-image.jpg
```

Rendering uses headless Chromium through `playwright-core`. Set `CHROMIUM_PATH` if Chromium isn't at `/opt/pw-browsers/chromium`. The Python steps need Pillow.

## TikTok videos

`marketing/tiktok/` has two finished vertical videos plus a cover, subtitles and captions to paste (`post-copy.md`):

- `tranom_tiktok_voice.mp4` (1:00): a voiceover explains the whole service, with word-by-word captions.
- `tranom_tiktok_music.mp4` (0:56): the same story with music, sound effects and on-screen text, no voice.

Both are built from code in `tools/video`, so a price or wording change is a rebuild, not a re-edit:

```bash
cd tools/render && npm install      # 3D backgrounds
cd ../video && npm install          # browser, offline voice model (about 190 MB)
npm run build                       # renders, voices, mixes and writes marketing/tiktok
```

- **Words:** the voiceover lines are in `tools/video/script.json`. The on-screen text and the captions for the music-only version are in `stage/index.html` and `timeline.py`.
- **Voice:** Kokoro (Apache-2.0), speaker 1 "Bella", run offline through sherpa-onnx. Nothing is sent to a speech service.
- **Music and sound effects:** synthesized from scratch in `audio.py`, so there's nothing to license.
- Needs Node 18+, ffmpeg, and Python 3 with numpy, scipy and Pillow. A full build took about 10 minutes on the machine used to make them. Set `SKIP_RENDERS=1` to reuse the background images already in `stage/`.

## The ad

`marketing/ad/tranom_ad.mp4` is a 57-second vertical ad. Alex clicks a fake "free Robux" link, types his password and 2-step code, and is locked out. Roblox Support can't verify him. He finds tranom.com, sends the free form (the ad points out that Tranom never asks for a password), is told the price up front, and pays. Tranom lists the proof Roblox needs and writes his support request, and T1 follows up every day until Roblox verifies the account. Then he locks it down. The end card carries the "Dramatization" note, the not-affiliated line and the fact that Roblox Support is free. `post-copy.md` has the scene list, a caption and posting notes.

It's built from code in `tools/ad`:

- `stage/char.js` and `stage/room.js`: the 3D character (face rig and posable arms) and his bedroom, in Three.js.
- `stage/index.html` and `stage/main.js`: the timeline, every phone screen, and the real site loaded in a frame, scrolled and filled in.
- `script.json` (narration), `timeline.py` (voice placement and captions), `audio.py` (score and sound effects).

```bash
cd tools/ad && npm install && npm run build   # about 45 minutes; writes marketing/ad
```

## Legal

Tranom is not affiliated with, endorsed by, or sponsored by Roblox Corporation. Roblox is a trademark of Roblox Corporation.
