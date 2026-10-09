"""Lays the ad's voiceover clips at fixed times, spreads caption words over the spoken parts,
and writes vo_full.wav, cfg_ad.json and tranom_ad.srt in the working directory. Clips are read from ./vo."""
import json, os, re, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 24000
DURATION = 57.0
START = {'intro': 0.6, 'dm': 4.6, 'login': 8.9, 'locked': 14.4, 'support': 19.0, 'found': 25.2, 'form': 27.8,
         'pay': 33.7, 'work': 37.2, 'restored': 45.0, 'secure': 48.0, 'end': 51.0}
# On-screen spelling where the voice script spells things out
DISPLAY = {'work': "We worked out what proof Roblox needed, wrote his support request, and T1, our case agent, followed up with Roblox every day.",
           'end': "Tranom. Recover what's yours, at tranom.com"}


def load(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def envelope(x, win=240):
    return np.sqrt(np.convolve(x ** 2, np.ones(win) / win, 'same'))


segs = json.load(open(os.path.join(HERE, 'script.json')))
buf = np.zeros(int(DURATION * SR), dtype=np.float32)
words, prev_end = [], 0
for si, s in enumerate(segs):
    x = load(f"vo/{s['id']}.wav"); env = envelope(x); thr = env.max() * 0.06
    idx = np.where(env > thr)[0]; a, b = max(0, idx[0] - 480), min(len(x), idx[-1] + 1200)
    x, env = x[a:b], env[a:b]; dur = len(x) / SR; t0 = START[s['id']]
    assert t0 >= prev_end + 0.2, f"{s['id']} starts {t0} but previous line ends {prev_end:.2f}"
    prev_end = t0 + dur
    i0 = int(t0 * SR); buf[i0:i0 + len(x)] += x
    on = env > thr; regions, start, quiet = [], None, 0
    for i, v in enumerate(on):
        if v:
            if start is None: start = i
            quiet = 0
        elif start is not None:
            quiet += 1
            if quiet >= int(0.14 * SR): regions.append((start / SR, (i - quiet) / SR)); start, quiet = None, 0
    if start is not None: regions.append((start / SR, len(on) / SR))
    speech = sum(q - p for p, q in regions)
    def real(frac):
        target = frac * speech
        for p, q in regions:
            if target <= q - p: return p + target
            target -= q - p
        return regions[-1][1]
    ws = DISPLAY.get(s['id'], s['say']).split(); wts = [len(w) + 2 for w in ws]; tot = sum(wts); acc = 0
    for w, wt in zip(ws, wts):
        words.append({'w': w, 'seg': si, 'start': round(t0 + real(acc / tot), 3), 'end': round(t0 + real((acc + wt) / tot), 3)}); acc += wt
    print(f"{s['id']:9s} {t0:6.2f} -> {t0 + dur:6.2f}")
buf = buf / np.abs(buf).max() * 0.89
with wave.open('vo_full.wav', 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((buf * 32767).astype(np.int16).tobytes())
json.dump({'duration': DURATION, 'words': words}, open('cfg_ad.json', 'w'))
chunks, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    if re.search(r'[,.?!:]$', w['w']) or len(cur) >= 3 or (i + 1 < len(words) and words[i + 1]['seg'] != w['seg']):
        chunks.append(cur); cur = []
if cur: chunks.append(cur)
def ts(x):
    h, r = divmod(x, 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"
cues = []
for i, ch in enumerate(chunks):
    end = min(ch[-1]['end'] + 0.35, chunks[i + 1][0]['start'] if i + 1 < len(chunks) else 1e9)
    cues.append(f"{i + 1}\n{ts(ch[0]['start'])} --> {ts(end)}\n{' '.join(w['w'] for w in ch)}\n")
open('tranom_ad.srt', 'w').write('\n'.join(cues))
print(len(words), 'words,', len(cues), 'subtitle cues')
