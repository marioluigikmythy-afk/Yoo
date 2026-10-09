"""Downsample the raw PNG renders and save them as the site's WebP assets."""
import os
import sys

from PIL import Image

SRC, DST = sys.argv[1], sys.argv[2]
JOBS = {
    'hero': ('hero.webp', (2400, 1310)),
    'welcome': ('welcome.webp', (2400, 1040)),
    'grow': ('grow.webp', (1800, 750)),
    'hacked': ('case-hacked.webp', (1200, 900)),
    'password': ('case-password.webp', (1200, 900)),
    'twostep': ('case-2sv.webp', (1200, 900)),
    'appeal': ('case-appeal.webp', (1200, 900)),
}
for key, (name, size) in JOBS.items():
    im = Image.open(os.path.join(SRC, key + '.png')).convert('RGB').resize(size, Image.LANCZOS)
    im.save(os.path.join(DST, name), 'WEBP', quality=82, method=6)
    print(name, size)

hero = Image.open(os.path.join(SRC, 'hero.png')).convert('RGB')
w, h = hero.size
th = int(w * 630 / 1200)
hero.crop((0, h - th, w, h)).resize((1200, 630), Image.LANCZOS).save(os.path.join(DST, 'og.jpg'), 'JPEG', quality=85, optimize=True, progressive=True)
print('og.jpg', (1200, 630))
