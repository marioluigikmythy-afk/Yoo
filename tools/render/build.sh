#!/usr/bin/env bash
# Renders every scene, writes responsive WebP files, then rebuilds icons and the social image.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
node render.mjs hero 2800 1528 out/hero.png
node render.mjs welcome 3000 1300 out/welcome.png
node render.mjs grow 2400 1000 out/grow.png
for s in hacked password twostep appeal; do node render.mjs "$s" 1600 1200 "out/$s.png"; done
python3 convert.py out ../../assets/img
node social.mjs
python3 finish-icons.py
