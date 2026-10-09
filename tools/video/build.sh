#!/usr/bin/env bash
# Builds both TikToks into tools/video/out and copies the finished files to marketing/tiktok.
#   1. vertical 3D backgrounds (tools/render, needs `npm install` there)
#   2. voiceover clips, timelines and subtitles
#   3. frames -> H.264, original music + sound effects, loudness-normalised AAC
# Needs Node 18+, Python 3 with numpy, scipy and Pillow, and ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
OUT=out
mkdir -p "$OUT/vo" ../../marketing/tiktok

if [[ "${SKIP_RENDERS:-}" != 1 ]]; then
  for s in vhero vt1 vwelcome; do (cd ../render && node render.mjs "$s" 1080 1920 "../video/$OUT/$s.png"); done
  python3 - <<'PY'
from PIL import Image
for n in ('vhero', 'vt1', 'vwelcome'):
    Image.open(f'out/{n}.png').convert('RGB').save(f'stage/{n}.jpg', quality=92)
Image.open('../../assets/img/case-hacked-1200.webp').convert('RGB').save('stage/case-hacked.jpg', quality=92)
PY
fi
cp ../../assets/fonts/plus-jakarta-sans-latin.woff2 stage/

# Voice: Kokoro speaker 1 ("Bella"), slightly faster than default.
python3 - <<'PY'
import json, subprocess
for s in json.load(open('script.json')):
    subprocess.run(['node', 'say.cjs', '1', '1.06', f"out/vo/{s['id']}.wav", s['say']], check=True)
PY
(cd "$OUT" && python3 ../timeline.py)

for mode in voice silent; do
  node capture.mjs "$OUT/cfg_$mode.json" video "$OUT/video_$mode.mp4" 30
  (cd "$OUT" && python3 ../audio.py "$mode")
done
mux() {
  ffmpeg -y -loglevel error -i "$OUT/video_$1.mp4" -i "$OUT/audio_$1.wav" -map 0:v -map 1:a -c:v copy \
    -af "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$2"
}
mux voice ../../marketing/tiktok/tranom_tiktok_voice.mp4
mux silent ../../marketing/tiktok/tranom_tiktok_music.mp4
cp "$OUT/tranom_tiktok_voice.srt" ../../marketing/tiktok/
ffmpeg -y -loglevel error -ss 2.6 -i ../../marketing/tiktok/tranom_tiktok_voice.mp4 -frames:v 1 -q:v 2 ../../marketing/tiktok/cover.jpg
echo "Done: marketing/tiktok"
