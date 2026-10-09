"""Copy icons and the social image rendered by social.mjs into the site."""
from pathlib import Path

from PIL import Image

OUT = Path(__file__).parent / 'out'
SITE = Path(__file__).resolve().parents[2]
IMG = SITE / 'assets' / 'img'

Image.open(OUT / 'og.png').convert('RGB').save(IMG / 'og-image.jpg', 'JPEG', quality=86, optimize=True, progressive=True)
icons = [Image.open(OUT / f'fav-{s}.png').convert('RGBA') for s in (16, 32, 48)]
icons[2].save(SITE / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=icons[:2])
Image.open(OUT / 'apple-touch-icon.png').convert('RGB').save(IMG / 'apple-touch-icon.png', optimize=True)
for name in ('icon-192.png', 'icon-512.png', 'icon-maskable-512.png'):
    Image.open(OUT / name).save(IMG / name, optimize=True)
print('icons and og-image.jpg updated')
