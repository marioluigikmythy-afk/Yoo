"""Builds every page of the site from one shared shell.

Run from the repository root:  python3 tools/pages/build_pages.py

Page bodies live in tools/pages/content/*.html. Business facts (prices, address,
email, reply time) live in BUSINESS below; content files use {{TOKENS}} for them,
so a price or address change happens in one place.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = Path(__file__).parent / "content"
SITE = "https://tranom.com"

BUSINESS = {
    "LEGAL_NAME": "Tranom Technologies LLC",
    "STREET": "524 W Riverside Ave, Suite N",
    "CITY": "Spokane",
    "REGION": "WA",
    "POSTAL": "99201",
    "COUNTRY": "United States",
    "EMAIL": "support@tranom.com",
    "REPLY": "within one business day",
    "STANDARD": "$49",
    "PRIORITY": "$99",
}
BUSINESS["ADDRESS"] = f'{BUSINESS["STREET"]}, {BUSINESS["CITY"]}, {BUSINESS["REGION"]} {BUSINESS["POSTAL"]}, {BUSINESS["COUNTRY"]}'
ROBLOX_SUPPORT = "https://www.roblox.com/support"
UPDATED = "October 9, 2026"

SPRITE = """<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <symbol id="spark" viewBox="0 0 24 24"><path d="M12 0c.6 6.3 5.7 11.4 12 12-6.3.6-11.4 5.7-12 12-.6-6.3-5.7-11.4-12-12C6.3 11.4 11.4 6.3 12 0Z"/></symbol>
  <symbol id="arrow" viewBox="0 0 24 24"><path d="M5 12h13m-5-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="external" viewBox="0 0 24 24"><path d="M14 5h5v5m0-5-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>"""

# Short "How we keep you safe" list shown under every main "Start recovery" button.
ASSURE_ITEMS = [
    "Never asks for passwords, codes or cookies",
    "Official Roblox channels only",
    "Not affiliated with Roblox",
    "Full refund if you cancel before work starts",
    "{{LEGAL_NAME}}, {{CITY}}, {{REGION}}",
]


def assure(light=False):
    items = "".join(f"<li>{t}</li>" for t in ASSURE_ITEMS)
    cls = "assure assure--light" if light else "assure"
    return f'<ul class="{cls}" aria-label="How we keep you safe">{items}</ul>'


def org_node():
    b = BUSINESS
    return {
        "@type": "Organization",
        "@id": f"{SITE}/#org",
        "name": "Tranom",
        "legalName": b["LEGAL_NAME"],
        "url": f"{SITE}/",
        "logo": f"{SITE}/assets/img/icon-512.png",
        "email": b["EMAIL"],
        "description": "Independent, paid, AI-assisted help with Roblox account recovery through Roblox's official support channels. Not affiliated with Roblox Corporation.",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": b["STREET"],
            "addressLocality": b["CITY"],
            "addressRegion": b["REGION"],
            "postalCode": b["POSTAL"],
            "addressCountry": "US",
        },
        "contactPoint": {"@type": "ContactPoint", "contactType": "customer support", "email": b["EMAIL"]},
    }


def service_node():
    return {
        "@type": "Service",
        "@id": f"{SITE}/pricing.html#service",
        "name": "Roblox account recovery assistance",
        "serviceType": "Account recovery assistance",
        "provider": {"@id": f"{SITE}/#org"},
        "url": f"{SITE}/pricing.html",
        "description": "Help working out what proof Roblox Support needs, a written support request or appeal, daily follow-ups with Roblox Support, and help securing the account afterwards. Tranom is not affiliated with Roblox and cannot guarantee that Roblox restores an account.",
        "offers": [
            {"@type": "Offer", "name": "Standard case", "price": "49.00", "priceCurrency": "USD", "url": f"{SITE}/pricing.html",
             "description": "For simpler problems, such as a forgotten password or username."},
            {"@type": "Offer", "name": "Priority case", "price": "99.00", "priceCurrency": "USD", "url": f"{SITE}/pricing.html",
             "description": "For complex cases: hacked accounts where the email or phone was changed, lost 2-Step Verification with no backup codes, and ban appeals."},
        ],
    }


def jsonld(*nodes):
    data = {"@context": "https://schema.org", "@graph": list(nodes)}
    return '<script type="application/ld+json">\n' + json.dumps(data, indent=2) + "\n</script>"


def fill(text, base="", prefix="index.html"):
    text = text.replace("{{ASSURE}}", assure()).replace("{{ASSURE_LIGHT}}", assure(light=True))
    text = text.replace("{{BASE}}", base).replace("{{HOME}}", prefix).replace("{{ROBLOX_SUPPORT}}", ROBLOX_SUPPORT).replace("{{UPDATED}}", UPDATED)
    for key, value in BUSINESS.items():
        text = text.replace("{{" + key + "}}", value)
    assert "{{" not in text, re.findall(r"\{\{\w+\}\}", text)
    return text


NAV = [  # (label, target, key) target "#x" = section on the home page
    ("How it works", "#how", "how"),
    ("Meet T1", "t1.html", "t1"),
    ("Pricing", "pricing.html", "pricing"),
    ("About", "about.html", "about"),
    ("FAQ", "#faq", "faq"),
    ("Contact", "contact.html", "contact"),
]
FOOTER = [
    ("Pricing", "pricing.html"), ("Meet T1", "t1.html"), ("About", "about.html"), ("Contact", "contact.html"),
    ("FAQ", "#faq"), ("Privacy Policy", "privacy.html"), ("Terms and Conditions", "terms.html"),
]


def shell(*, title, description, path, body, base="", prefix="index.html", robots="index, follow",
          current=None, head_extra="", ld=None, brand_href=None):
    canonical = f"{SITE}/{path}"
    href = lambda t: (prefix + t) if t.startswith("#") else (base + t)
    nav = "\n".join(
        f'      <a href="{href(t)}"{" aria-current=\"page\"" if k == current else ""}>{label}</a>' for label, t, k in NAV)
    foot = "\n".join(f'        <a href="{href(t)}">{label}</a>' for label, t in FOOTER)
    brand = brand_href or (prefix or "#top")
    ld_html = jsonld(*(ld or [org_node()]))
    page = f"""<!doctype html>
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
  <meta property="og:image:alt" content="Tranom: Recover What's Yours. A key and an open padlock in a lavender flower field.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="{SITE}/assets/img/og-image.jpg">
  <link rel="icon" href="{base}favicon.ico" sizes="48x48">
  <link rel="icon" href="{base}assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="{base}assets/img/apple-touch-icon.png">
  <link rel="manifest" href="{base}site.webmanifest">
  <link rel="preload" href="{base}assets/fonts/plus-jakarta-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
{head_extra}  <link rel="stylesheet" href="{base}assets/css/styles.css">
  {ld_html}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
{SPRITE}

<div class="page">
  <header class="nav" id="top">
    <a class="brand" href="{brand}" aria-label="Tranom home">
      <svg class="brand__mark" aria-hidden="true" focusable="false"><use href="#spark"/></svg>
      <span>Tranom</span>
    </a>
    <button class="nav__toggle" type="button" id="nav-toggle" aria-expanded="false" aria-controls="nav-links">
      <span class="sr-only">Menu</span><span class="nav__bars" aria-hidden="true"></span>
    </button>
    <nav class="nav__links" id="nav-links" aria-label="Main">
{nav}
    </nav>
    <a class="btn btn--navy nav__cta" href="{prefix}#start">Start recovery</a>
  </header>

{body}

  <footer class="footer">
    <div class="footer__top">
      <a class="brand" href="{brand}" aria-label="Tranom home">
        <svg class="brand__mark" aria-hidden="true" focusable="false"><use href="#spark"/></svg>
        <span>Tranom</span>
      </a>
      <nav class="footer__links" aria-label="Footer">
{foot}
        <a href="{ROBLOX_SUPPORT}" target="_blank" rel="noopener">Roblox Support (free)</a>
        <button type="button" class="footer__cookie" data-consent-open>Cookie settings</button>
      </nav>
    </div>
    <p class="footer__legal">{{{{LEGAL_NAME}}}}, {{{{ADDRESS}}}}. Email <a href="mailto:{{{{EMAIL}}}}">{{{{EMAIL}}}}</a>. Tranom is an independent, paid service. It is not affiliated with, endorsed by, or sponsored by Roblox Corporation, and contacting Roblox Support is free. Roblox is a trademark of Roblox Corporation. © 2026 {{{{LEGAL_NAME}}}}.</p>
  </footer>
</div>

<div class="consent" id="consent" role="region" aria-label="Cookie consent" hidden>
  <p class="consent__text"><svg class="consent__mark" aria-hidden="true" focusable="false"><use href="#spark"/></svg><span>We use cookies for analytics only if you allow them. Essential storage that keeps the site working is always on. <a href="{base}privacy.html#cookies">Cookie policy</a></span></p>
  <div class="consent__actions">
    <button type="button" class="consent__btn" data-consent-choice="reject">Reject</button>
    <button type="button" class="consent__btn consent__btn--accept" data-consent-choice="accept">Accept</button>
  </div>
</div>

<script src="{base}assets/js/main.js" defer></script>
</body>
</html>
"""
    return brand_t1(fill(page, base, prefix))


def brand_t1(html):
    """Wrap visible "T1" text in <span class="t1n"> so it uses the footed 1 and can't read as "Tl"."""
    head, sep, body = html.partition("<body>")
    if not sep:
        return html
    parts = re.split(r"(<[^>]+>)", body)
    for i, part in enumerate(parts):
        if part and not part.startswith("<") and not (i > 0 and parts[i - 1] == '<span class="t1n">'):
            parts[i] = re.sub(r"\bT1\b", '<span class="t1n">T1</span>', part)
    return head + sep + "".join(parts)


def legal(heading, toc, content):
    links = "\n".join(f'        <a href="#{sid}">{label}</a>' for sid, label in toc)
    return f"""  <main id="main" class="legal">
    <header class="legal__head">
      <p class="eyebrow">Legal</p>
      <h1>{heading}</h1>
      <p class="legal__meta">Last updated {{{{UPDATED}}}}</p>
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
    return re.findall(r'<section id="([^"]+)">\s*<h2>([^<]+)</h2>', html)


def write(name, html):
    (ROOT / name).write_text(html)
    print("wrote", name)


def read(name):
    return (CONTENT / name).read_text()


HERO_PRELOAD = """  <link rel="preload" as="image" fetchpriority="high"
        imagesrcset="assets/img/hero-800.webp 800w, assets/img/hero-1200.webp 1200w, assets/img/hero-1600.webp 1600w, assets/img/hero-2400.webp 2400w"
        imagesizes="(max-width: 620px) 205vw, (max-width: 1344px) 100vw, 1280px">
"""
T1_PRELOAD = """  <link rel="preload" as="image" fetchpriority="high"
        imagesrcset="assets/img/t1-hero-800.webp 800w, assets/img/t1-hero-1200.webp 1200w, assets/img/t1-hero-1600.webp 1600w, assets/img/t1-hero-2400.webp 2400w"
        imagesizes="(max-width: 620px) 860px, (max-width: 1344px) 100vw, 1280px">
"""

write("index.html", shell(
    title="Tranom | Roblox Account Recovery Help",
    description="Independent, paid help recovering a Roblox account through official Roblox channels. Roblox Support is free; Tranom adds proof guidance, written requests and daily follow-ups.",
    path="", body=read("index.html"), prefix="", brand_href="#top", head_extra=HERO_PRELOAD,
    ld=[org_node(), {"@type": "WebSite", "@id": f"{SITE}/#website", "url": f"{SITE}/", "name": "Tranom", "publisher": {"@id": f"{SITE}/#org"}}]))

write("t1.html", shell(
    title="Meet T1 | Tranom",
    description="T1 is Tranom's own case agent. Every day, T1 and our team check in with Roblox until your case is verified and complete.",
    path="t1.html", body=read("t1.html"), current="t1", head_extra=T1_PRELOAD))

write("pricing.html", shell(
    title="Pricing | Tranom",
    description="Standard case $49, Priority case $99. One-time price per case, no hidden fees, full refund if you cancel before work starts. Roblox Support itself is free.",
    path="pricing.html", body=read("pricing.html"), current="pricing", ld=[org_node(), service_node()]))

write("about.html", shell(
    title="About Tranom | Tranom Technologies LLC",
    description="Tranom is run by Tranom Technologies LLC in Spokane, WA. An independent, paid Roblox account recovery service, not affiliated with Roblox.",
    path="about.html", body=read("about.html"), current="about",
    ld=[org_node(), {"@type": "AboutPage", "url": f"{SITE}/about.html", "about": {"@id": f"{SITE}/#org"}}]))

write("contact.html", shell(
    title="Contact | Tranom",
    description="Email support@tranom.com. We reply within one business day. Tranom Technologies LLC, 524 W Riverside Ave, Suite N, Spokane, WA 99201.",
    path="contact.html", body=read("contact.html"), current="contact",
    ld=[org_node(), {"@type": "ContactPage", "url": f"{SITE}/contact.html", "about": {"@id": f"{SITE}/#org"}}]))

for kind, heading, title, desc in [
    ("privacy", "Privacy Policy", "Privacy Policy | Tranom",
     "How Tranom collects, uses and protects your information when you ask us for help recovering a Roblox account."),
    ("terms", "Terms and Conditions", "Terms and Conditions | Tranom",
     "The terms that apply when you use Tranom's Roblox account recovery service, including prices, refunds and acceptable use."),
]:
    content = read(f"{kind}.html")
    write(f"{kind}.html", shell(title=title, description=desc, path=f"{kind}.html", body=legal(heading, toc_from(content), content)))

write("404.html", shell(
    title="Page not found | Tranom",
    description="This page doesn't exist. Head back to Tranom to start your Roblox account recovery.",
    path="404.html", body=read("404.html"), base="/", prefix="/", robots="noindex, follow"))
