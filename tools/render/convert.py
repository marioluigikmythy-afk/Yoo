"""Turn the raw PNG renders into the site's compressed, responsive WebP files.

usage: python3 convert.py <folder with PNG renders> <site assets/img folder>
"""
import os
import sys

from PIL import Image

SRC, DST = sys.argv[1], sys.argv[2]
# scene name -> (file prefix, widths to export, aspect ratio)
JOBS = {
    'hero': ('hero', [800, 1200, 1600, 2400], 2400 / 1310),
    'welcome': ('welcome', [800, 1200, 1600, 2400], 2400 / 1040),
    'grow': ('grow', [700, 1200, 1800], 1800 / 750),
    'hacked': ('case-hacked', [600, 900, 1200], 4 / 3),
    'password': ('case-password', [600, 900, 1200], 4 / 3),
    'twostep': ('case-2sv', [600, 900, 1200], 4 / 3),
    'appeal': ('case-appeal', [600, 900, 1200], 4 / 3),
}
QUALITY = 76

for key, (prefix, widths, ratio) in JOBS.items():
    src = Image.open(os.path.join(SRC, key + '.png')).convert('RGB')
    for w in widths:
        out = os.path.join(DST, f'{prefix}-{w}.webp')
        src.resize((w, round(w / ratio)), Image.LANCZOS).save(out, 'WEBP', quality=QUALITY, method=6)
        print(out, os.path.getsize(out) // 1024, 'KB')
