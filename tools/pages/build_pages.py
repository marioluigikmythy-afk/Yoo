"""Builds privacy.html, terms.html and 404.html from one shared page shell.

Run from the repository root:  python3 tools/pages/build_pages.py
Edit the policy text in tools/pages/content/*.html, then rebuild.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = Path(__file__).parent / "content"
SITE = "https://tranom.com"

SPRITE = """<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <symbol id="spark" viewBox="0 0 24 24"><path d="M12 0c.6 6.3 5.7 11.4 12 12-6.3.6-11.4 5.7-12 12-.6-6.3-5.7-11.4-12-12C6.3 11.4 11.4 6.3 12 0Z"/></symbol>
</svg>"""


def shell(*, title, description, path, body, base="", robots="index, follow", home="index.html"):
    canonical = f"{SITE}/{path}"
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="{canonical}">
  <meta name="robots" content="{robots}">
  <meta name="theme-color" content="#f5f5f5">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Tranom">
  <meta property="og:url" content="{canonical}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="{SITE}/assets/img/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="{SITE}/assets/img/og-image.jpg">
  <link rel="icon" href="{base}favicon.ico" sizes="48x48">
  <link rel="icon" href="{base}assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="{base}assets/img/apple-touch-icon.png">
  <link rel="manifest" href="{base}site.webmanifest">
  <link rel="preload" href="{base}assets/fonts/plus-jakarta-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="{base}assets/css/styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
{SPRITE}

<div class="page">
  <header class="nav" id="top">
    <a class="brand" href="{home}" aria-label="Tranom home">
      <svg class="brand__mark" aria-hidden="true" focusable="false"><use href="#spark"/></svg>
      <span>Tranom</span>
    </a>
    <button class="nav__toggle" type="button" id="nav-toggle" aria-expanded="false" aria-controls="nav-links">
      <span class="sr-only">Menu</span><span class="nav__bars" aria-hidden="true"></span>
    </button>
    <nav class="nav__links" id="nav-links" aria-label="Main">
      <a href="{home}#about">About</a>
      <a href="{home}#use-cases">Use cases</a>
      <a href="{home}#how">How it works</a>
      <a href="{home}#safety">Safety</a>
      <a href="{home}#faq">FAQ</a>
    </nav>
    <a class="btn btn--navy nav__cta" href="{home}#start">Start recovery</a>
  </header>

{body}

  <footer class="footer">
    <div class="footer__top">
      <a class="brand" href="{home}" aria-label="Tranom home">
        <svg class="brand__mark" aria-hidden="true" focusable="false"><use href="#spark"/></svg>
        <span>Tranom</span>
      </a>
      <nav class="footer__links" aria-label="Footer">
        <a href="{home}#use-cases">Use cases</a>
        <a href="{home}#faq">FAQ</a>
        <a href="{base}privacy.html">Privacy Policy</a>
        <a href="{base}terms.html">Terms and Conditions</a>
        <button type="button" class="footer__cookie" data-consent-open>Cookie settings</button>
      </nav>
    </div>
    <p class="footer__legal">Questions? Email <a href="mailto:support@tranom.com">support@tranom.com</a>. Tranom is not affiliated with, endorsed by, or sponsored by Roblox Corporation. Roblox is a trademark of Roblox Corporation. © 2026 Tranom.</p>
  </footer>
</div>

<div class="consent" id="consent" role="region" aria-label="Cookie consent" hidden>
  <p><strong>Cookies.</strong> We use essential storage to run this site. With your permission, we'll also use analytics cookies to see which pages help people most. <a href="{base}privacy.html#cookies">How we use cookies</a></p>
  <div class="consent__actions">
    <button type="button" class="btn btn--ghost btn--sm" data-consent-choice="reject">Reject</button>
    <button type="button" class="btn btn--navy btn--sm" data-consent-choice="accept">Accept</button>
  </div>
</div>

<script src="{base}assets/js/main.js" defer></script>
</body>
</html>
"""


def legal(kind, heading, updated, toc, content):
    links = "\n".join(f'        <a href="#{sid}">{label}</a>' for sid, label in toc)
    return f"""  <main id="main" class="legal">
    <header class="legal__head">
      <p class="eyebrow">Legal</p>
      <h1>{heading}</h1>
      <p class="legal__meta">Last updated {updated}</p>
    </header>
    <div class="legal__body">
      <nav class="legal__toc" aria-label="On this page">
        <p>On this page</p>
{links}
      </nav>
      <article class="legal__content">
{content}
      </article>
    </div>
  </main>"""


def toc_from(html):
    import re
    return re.findall(r'<section id="([^"]+)">\s*<h2>([^<]+)</h2>', html)


UPDATED = "October 9, 2026"

for kind, heading, title, desc in [
    ("privacy", "Privacy Policy", "Privacy Policy | Tranom",
     "How Tranom collects, uses and protects your information when you ask us for help recovering a Roblox account."),
    ("terms", "Terms and Conditions", "Terms and Conditions | Tranom",
     "The terms that apply when you use Tranom's Roblox account recovery service, including fees, refunds and acceptable use."),
]:
    content = (CONTENT / f"{kind}.html").read_text()
    body = legal(kind, heading, UPDATED, toc_from(content), content)
    (ROOT / f"{kind}.html").write_text(shell(title=title, description=desc, path=f"{kind}.html", body=body))
    print("wrote", kind + ".html")

notfound = """  <main id="main">
    <section class="notfound" aria-labelledby="nf-title">
      <img src="/assets/img/welcome-1200.webp"
           srcset="/assets/img/welcome-800.webp 800w, /assets/img/welcome-1200.webp 1200w, /assets/img/welcome-1600.webp 1600w"
           sizes="(max-width: 620px) 1015px, 100vw" width="2400" height="1040" decoding="async"
           alt="A friendly blocky character waving from a field of lavender flowers">
      <div class="notfound__content">
        <p class="notfound__code">ERROR 404</p>
        <h1 id="nf-title">This page got lost</h1>
        <p>The link may be broken or the page may have moved. Let's get you back on track.</p>
        <a class="btn btn--black" href="/#start">Start recovery</a>
        <a class="link-arrow" href="/">Go to the homepage</a>
      </div>
    </section>
  </main>"""
(ROOT / "404.html").write_text(shell(
    title="Page not found | Tranom",
    description="This page doesn't exist. Head back to Tranom to start your Roblox account recovery.",
    path="404.html", body=notfound, base="/", robots="noindex, follow", home="/"))
print("wrote 404.html")
