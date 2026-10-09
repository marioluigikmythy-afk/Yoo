# Tranom

Website for **Tranom**, a paid, AI-assisted service that helps players get their Roblox accounts back through Roblox's official recovery channels.

The design follows a soft lavender, "flower field" art direction: rounded cards on light grey, Plus Jakarta Sans type, and 3D renders of a key, padlock, shield, phone and envelope growing out of purple blossoms.

## Before launch

Fill these in before the site goes live:

| What | Where |
| --- | --- |
| **Form endpoint.** The "Start recovery" form needs a service to receive submissions. Create a form on [Formspree](https://formspree.io) (or a similar service that accepts `POST` requests) and paste its URL into `data-endpoint=""` on `#start-form`. Until then the form tells visitors to email you instead. | `index.html` |
| **Domain.** Every absolute URL uses `https://tranom.com`. Replace it if your domain is different. | `index.html`, `tools/pages/build_pages.py`, `sitemap.xml`, `robots.txt` |
| **Support email.** `support@tranom.com` is used throughout. | `index.html`, `assets/js/main.js`, `tools/pages/build_pages.py`, `tools/pages/content/*.html` |
| **Governing law.** The Terms use the State of Washington, based on the Spokane address. Change it if Tranom Technologies LLC is registered in another state. | `tools/pages/content/terms.html` |
| **Policy review.** The Privacy Policy and Terms are a starting point, not legal advice. Have them checked, especially the 90-day data retention, the refund rules, and the statement that a person reviews AI-assisted work. | same files |

After editing anything in `tools/pages/`, rebuild the pages:

```bash
python3 tools/pages/build_pages.py
```

## What's on the site

- `index.html`: hero, features, use cases, how it works, the **Start recovery** form, safety, FAQ and a closing call to action. Every button leads to the same form.
- `privacy.html` and `terms.html`: Privacy Policy and Terms and Conditions.
- `404.html`: custom "page not found" page. Most static hosts serve it automatically.
- Cookie consent banner on every page, with equal Accept and Reject buttons and a "Cookie settings" link in the footer.
- `sitemap.xml`, `robots.txt`, `site.webmanifest`, favicons and a 1200×630 social preview image.

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

Lighthouse (mobile) for the homepage: Performance 98, Accessibility 100, Best Practices 100, SEO 100. Before these changes it was 86, 96, 100 and 100.

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
index.html, privacy.html, terms.html, 404.html
assets/css/styles.css   design tokens and all styles
assets/js/main.js       mobile menu, cookie consent, form validation and spam checks
assets/fonts/           Plus Jakarta Sans (self-hosted)
assets/img/             WebP renders, icons, social image
tools/pages/            generator and text for the Privacy, Terms and 404 pages
tools/render/           Three.js scenes that generate the images
```

## Regenerating the images

Every image is rendered from code in `tools/render`, so you can change colours, objects or camera angles and render again:

```bash
cd tools/render
npm install
npm run build   # renders all scenes, writes assets/img/*.webp, icons and og-image.jpg
```

Rendering uses headless Chromium through `playwright-core`. Set `CHROMIUM_PATH` if Chromium isn't at `/opt/pw-browsers/chromium`. The Python steps need Pillow.

## Legal

Tranom is not affiliated with, endorsed by, or sponsored by Roblox Corporation. Roblox is a trademark of Roblox Corporation.
