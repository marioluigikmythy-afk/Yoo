"""Builds both video timelines. Run it in the working directory after the voice clips are in ./vo.

- Trims each voiceover clip, finds its pauses and spreads the caption words over the spoken parts.
- Writes vo_full.wav, cfg_voice.json (scenes + word timings), cfg_silent.json (fixed scenes + one caption
  each) and tranom_tiktok_voice.srt.
"""
import json, os, re, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 24000
GAP, LEAD = 0.30, 0.35

def load(path):
    w = wave.open(path); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return x

def envelope(x, win=240):  # 10 ms
    return np.sqrt(np.convolve(x ** 2, np.ones(win) / win, 'same'))

segs = json.load(open(os.path.join(HERE, 'script.json')))
# On-screen captions use the brand spelling; the voice script spells numbers and "T one" out.
display = {
    'step3': "Step three. T1, our case agent, and our team follow up with Roblox every day, until your case is verified and complete.",
    'price': "A Standard case is $49. A Priority case is $99. Cancel before we start, and you get a full refund.",
    'cta': "Tranom. Recover what's yours, at tranom.com",
}
t = LEAD
out = []
audio = []
for s in segs:
    x = load(f"vo/{s['id']}.wav")
    env = envelope(x); thr = env.max() * 0.06
    idx = np.where(env > thr)[0]
    a, b = max(0, idx[0] - 480), min(len(x), idx[-1] + 1200)
    x = x[a:b]; env = env[a:b]
    dur = len(x) / SR
    # voiced regions separated by pauses >= 140 ms
    on = env > thr
    regions, start, quiet = [], None, 0
    for i, v in enumerate(on):
        if v:
            if start is None: start = i
            quiet = 0
        elif start is not None:
            quiet += 1
            if quiet >= int(0.14 * SR):
                regions.append((start, i - quiet)); start, quiet = None, 0
    if start is not None: regions.append((start, len(on) - 1))
    text = display.get(s['id'], s['say'])
    phrases = [p.strip() for p in re.split(r'(?<=[,.?!])\s+', text) if p.strip()]
    # Spread words over spoken time only: map cumulative word weight onto the voiced regions.
    spans_r = [(r0 / SR, r1 / SR) for r0, r1 in regions] or [(0, dur)]
    speech = sum(b - a for a, b in spans_r)
    def to_real(frac):
        target = frac * speech
        for a, b in spans_r:
            if target <= b - a: return a + target
            target -= b - a
        return spans_r[-1][1]
    all_words = []
    for pi, ph in enumerate(phrases):
        for w in ph.split(): all_words.append((pi, w))
    wts = [len(w) + 2 for _, w in all_words]; tot = sum(wts); acc = 0
    words = []
    for (pi, w), wt in zip(all_words, wts):
        words.append({'w': w, 'p': pi, 'start': round(t + to_real(acc / tot), 3), 'end': round(t + to_real((acc + wt) / tot), 3)}); acc += wt
    spans = []
    for pi in range(len(phrases)):
        pw = [x for x in words if x['p'] == pi]
        spans.append((pw[0]['start'] - t, pw[-1]['end'] - t))
    mode = f'{len(regions)} voiced regions'
    out.append({'id': s['id'], 'start': round(t, 3), 'end': round(t + dur, 3), 'text': text,
                'phrases': [{'text': ph, 'start': round(t + p0, 3), 'end': round(t + p1, 3)} for (p0, p1), ph in zip(spans, phrases)],
                'words': words})
    print(f"{s['id']:7s} {t:6.2f} → {t + dur:6.2f}  {mode}")
    audio.append((t, x))
    t += dur + GAP
total = t - GAP + 1.6
buf = np.zeros(int(total * SR) + SR, dtype=np.float32)
for st, x in audio:
    i = int(st * SR); buf[i:i + len(x)] += x
buf = buf[:int(total * SR)]
buf = buf / np.abs(buf).max() * 0.89
import wave as W
with W.open('vo_full.wav', 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((buf * 32767).astype(np.int16).tobytes())

# Voice version: each scene starts just before its line.
scenes = []
for i, s in enumerate(out):
    scenes.append({'id': s['id'], 'start': 0.0 if i == 0 else round(s['start'] - 0.25, 3)})
for i, sc in enumerate(scenes):
    sc['end'] = scenes[i + 1]['start'] if i + 1 < len(scenes) else round(total, 3)
words = [dict(w, seg=i) for i, s in enumerate(out) for w in s['words']]
json.dump({'mode': 'voice', 'duration': round(total, 3), 'scenes': scenes, 'words': words}, open('cfg_voice.json', 'w'))

# Music-only version: fixed scene lengths and one caption per scene.
plan = [('hook', 4.0, "Here's how Tranom helps. Honestly."), ('free', 4.5, 'You can always contact them yourself.'),
        ('who', 5.5, "That's where Tranom comes in."), ('step1', 4.5, 'One short form. Free to send.'),
        ('step2', 6.0, 'Then we write your support request for you.'), ('step3', 6.0, 'T1 + our team check in with Roblox daily.'),
        ('step4', 4.5, 'We help you secure the account.'), ('safe', 5.0, 'No passwords. No tricks. No special access.'),
        ('honest', 4.5, 'Honest from the start.'), ('price', 5.5, 'One-time price. No hidden fees.'), ('cta', 5.5, 'Start at tranom.com')]
t = 0; sc2 = []; kick = []
for sid, d, k in plan:
    sc2.append({'id': sid, 'start': round(t, 3), 'end': round(t + d, 3)})
    kick.append({'text': k, 'start': round(t + 1.0, 3), 'end': round(t + d - 0.15, 3)})
    t += d
json.dump({'mode': 'silent', 'duration': round(t + 0.5, 3), 'scenes': sc2, 'kickers': kick}, open('cfg_silent.json', 'w'))

# Subtitles for the voice version, chunked the same way as the on-screen captions.
chunks, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    if w['w'][-1] in ',.?!' or len(cur) >= 3 or (i + 1 < len(words) and words[i + 1]['seg'] != w['seg']):
        chunks.append(cur); cur = []
if cur: chunks.append(cur)
def ts(x):
    h, r = divmod(x, 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"
cues = []
for i, ch in enumerate(chunks):
    end = min(ch[-1]['end'] + 0.35, chunks[i + 1][0]['start'] if i + 1 < len(chunks) else 1e9)
    cues.append(f"{i + 1}\n{ts(ch[0]['start'])} --> {ts(end)}\n{' '.join(w['w'] for w in ch)}\n")
open('tranom_tiktok_voice.srt', 'w').write('\n'.join(cues))
print(f'voice {total:.2f}s, music-only {t + 0.5:.2f}s, {len(cues)} subtitle cues')
