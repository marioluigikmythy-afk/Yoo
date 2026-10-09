#!/usr/bin/env bash
# Builds the Tranom ad into tools/ad/out and copies the finished files to marketing/ad.
#   1. stage images: posters from assets/img, backgrounds from tools/video/stage, the site font
#   2. voiceover clips (offline Kokoro voice), timeline and subtitles
#   3. frames (3D shots, phone screens and the real site) -> H.264, score + sound effects, loudness-normalised AAC
# Needs Node 18+, Python 3 with numpy, scipy and Pillow, and ffmpeg. The 3D shots render on the CPU, so a full
# build takes about 45 minutes.
set -euo pipefail
cd "$(dirname "$0")"
OUT=out
mkdir -p "$OUT/vo" ../../marketing/ad

python3 - <<'PY'
from PIL import Image
for name, src in (('poster1', 'welcome-1200.webp'), ('poster2', 'hero-1200.webp')):
    im = Image.open(f'../../assets/img/{src}').convert('RGB'); im.thumbnail((1024, 1024)); im.save(f'stage/{name}.jpg', quality=88)
PY
cp ../video/stage/vt1.jpg ../video/stage/vhero.jpg stage/
cp ../../assets/fonts/plus-jakarta-sans-latin.woff2 stage/

# Voice: Kokoro speaker 1 ("Bella").
python3 - <<'PY'
import json, subprocess
for s in json.load(open('script.json')):
    subprocess.run(['node', 'say.cjs', '1', '1.02', f"out/vo/{s['id']}.wav", s['say']], check=True)
PY
(cd "$OUT" && python3 ../timeline.py)

node capture.mjs "$OUT/cfg_ad.json" video "$OUT/video_ad.mp4" 30
(cd "$OUT" && python3 ../audio.py)
ffmpeg -y -loglevel error -i "$OUT/video_ad.mp4" -i "$OUT/audio_ad.wav" -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart ../../marketing/ad/tranom_ad.mp4
cp "$OUT/tranom_ad.srt" ../../marketing/ad/
ffmpeg -y -loglevel error -ss 46.6 -i ../../marketing/ad/tranom_ad.mp4 -frames:v 1 -q:v 2 ../../marketing/ad/cover.jpg
echo "Done: marketing/ad"
