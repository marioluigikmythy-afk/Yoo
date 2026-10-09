"""Original music bed + sound effects for the Tranom TikToks, fully synthesized (no samples, no licensing).

usage: python3 audio.py voice|silent
  voice  -> music ducked under the voiceover, lighter SFX, mixed with vo_full.wav
  silent -> fuller music, more present SFX, no voice
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
BPM = 120.0
BEAT = 60.0 / BPM
rng = np.random.default_rng(7)
MODE = sys.argv[1]
CFG = json.load(open(f'cfg_{MODE}.json'))
EVENTS = json.load(open(f'cfg_{MODE}.events.json'))
DUR = CFG['duration']
N = int(DUR * SR)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def adsr(n, a=0.01, d=0.1, s=0.7, r=0.2, sus=None):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    sus_n = max(0, n - a_n - d_n - r_n) if sus is None else int(sus * SR)
    env = np.concatenate([np.linspace(0, 1, max(a_n, 1)), np.linspace(1, s, max(d_n, 1)), np.full(sus_n, s), np.linspace(s, 0, max(r_n, 1))])
    return np.pad(env, (0, max(0, n - len(env))))[:n]


def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low'); return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high'); return signal.lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band'); return signal.lfilter(b, a, x)


def saw(f, t, phase=0.0):
    return 2 * ((f * t + phase) % 1.0) - 1


def place(buf, x, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    x = x[:len(buf) - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414
    buf[i:i + len(x), 1] += x * gain * r * 1.414


def reverb(x, sec=1.6, wet=0.25, seed=1):
    # separate decaying-noise impulse per channel gives a wide, mono-safe tail
    out = np.zeros_like(x)
    for c in range(x.shape[1]):
        g = np.random.default_rng(seed * 10 + c)
        n = int(sec * SR)
        ir = lp(g.standard_normal(n) * np.exp(-np.linspace(0, 6.5, n)), 6000)
        ir /= np.sqrt(np.sum(ir ** 2))
        out[:, c] = signal.fftconvolve(x[:, c], ir)[:len(x)]
    return x * (1 - wet) + out * wet


# ---------------------------------------------------------------- music
# Fmaj9 - Dm9 - Bbmaj9 - C6/9, one chord per bar (2 s)
CHORDS = [
    [53, 60, 64, 67, 69],   # F  C  E  G  A
    [50, 57, 60, 64, 65],   # D  A  C  E  F
    [46, 57, 60, 62, 65],   # Bb A  C  D  F
    [48, 55, 60, 62, 64],   # C  G  C  D  E
]
BASS = [41, 38, 34, 36]
BAR = 4 * BEAT


def music(full_from, end_at, energy):
    """full_from: when drums come in; end_at: when the arrangement resolves; energy: 0..1 overall level."""
    mus = np.zeros((N, 2))
    pad = np.zeros((N, 2)); pluck = np.zeros((N, 2)); drums = np.zeros((N, 2)); bass = np.zeros(N)
    nbars = int(np.ceil(DUR / BAR))
    for b in range(nbars):
        t0 = b * BAR
        if t0 >= end_at:
            break
        ch = CHORDS[b % 4]
        dur = BAR + 0.25
        tt = t_axis(dur)
        env = adsr(len(tt), a=0.35, d=0.4, s=0.75, r=0.5)
        for k, note in enumerate(ch):
            f = midi(note + 12)
            for det, pan in ((-0.11, -0.6), (0.0, 0.0), (0.12, 0.6)):
                v = saw(f * 2 ** (det / 12), tt, phase=rng.random()) * env * 0.05
                place(pad, v, t0, 1.0, pan)
        # bass: root on beats 1 and 3, octave pickup on 4-and
        for beat, oct_, ln in ((0, 0, 0.9), (2, 0, 0.7), (3.5, 12, 0.35)):
            f = midi(BASS[b % 4] + oct_)
            tb = t_axis(ln)
            v = (np.sin(2 * np.pi * f * tb) + 0.25 * np.sin(4 * np.pi * f * tb)) * adsr(len(tb), a=0.005, d=0.15, s=0.6, r=0.1)
            i = int((t0 + beat * BEAT) * SR); bass[i:i + len(v)] += v[:max(0, N - i)] * 0.42
        # pluck arpeggio in 16ths after the drums enter
        if t0 + 0.01 >= full_from - BAR:
            pattern = [0, 2, 4, 3, 1, 3, 4, 2]
            for s16 in range(16):
                if s16 % 4 == 3 and b % 2:   # leave a little space
                    continue
                note = ch[1:][pattern[s16 % 8] % 4] + 12
                tn = t_axis(0.32)
                f = midi(note)
                v = (saw(f, tn) * 0.5 + np.sin(2 * np.pi * f * tn)) * np.exp(-tn * 14)
                v = lp(v, 3800)
                place(pluck, v, t0 + s16 * BEAT / 4, 0.055, -0.35 if s16 % 2 else 0.35)
    pad = np.column_stack([lp(pad[:, 0], 1600), lp(pad[:, 1], 1600)])
    # drums
    kick_t = t_axis(0.42)
    kick = np.sin(2 * np.pi * np.cumsum(45 + 85 * np.exp(-kick_t * 28)) / SR) * np.exp(-kick_t * 9)
    kick += 0.3 * np.exp(-kick_t * 160) * rng.standard_normal(len(kick_t))
    clap_t = t_axis(0.3)
    clapn = bp(rng.standard_normal(len(clap_t)), 900, 5000)
    clap = clapn * (np.exp(-clap_t * 30) + 0.6 * np.exp(-np.maximum(clap_t - 0.012, 0) * 40) * (clap_t > 0.012) + 0.5 * np.exp(-np.maximum(clap_t - 0.024, 0) * 26) * (clap_t > 0.024))
    hat_t = t_axis(0.06); hat = hp(rng.standard_normal(len(hat_t)), 7000) * np.exp(-hat_t * 70)
    ohat_t = t_axis(0.22); ohat = hp(rng.standard_normal(len(ohat_t)), 6500) * np.exp(-ohat_t * 16)
    sidechain = np.ones(N)
    beats = int(DUR / BEAT) + 1
    for k in range(beats):
        tb = k * BEAT
        if tb < full_from - 2 * BEAT or tb >= end_at:
            if full_from - 2 * BEAT <= tb < full_from:   # little pickup
                place(drums, hat, tb, 0.09)
            continue
        if k % 2 == 0:
            place(drums, kick, tb, 0.85)
            i = int(tb * SR); dip = 1 - 0.45 * np.exp(-t_axis(0.4) * 9); sidechain[i:i + len(dip)] = np.minimum(sidechain[i:i + len(dip)], dip[:max(0, N - i)])
        if k % 4 in (1, 3):
            place(drums, clap, tb, 0.30, 0.05)
        place(drums, hat, tb + BEAT / 2, 0.10, 0.25)
        place(drums, hat, tb, 0.05, -0.25)
        if k % 4 == 3:
            place(drums, ohat, tb + BEAT / 2, 0.06, 0.3)
    # intro filter sweep: pad + pluck open up over the first bars
    open_env = np.clip(t_axis(DUR)[:N] / max(full_from, 0.1), 0, 1)
    for c in range(2):
        pad[:, c] *= sidechain
        pluck[:, c] *= sidechain
    mus += pad * (0.55 + 0.45 * open_env[:, None]) + pluck
    mus += np.column_stack([bass * sidechain, bass * sidechain]) * 0.8
    mus = reverb(mus, 1.8, 0.22)
    mus += drums
    # final resolving chord + fade
    tail = t_axis(DUR - end_at + 0.2)
    for note in [53, 60, 64, 69, 72]:
        f = midi(note + 12)
        v = (np.sin(2 * np.pi * f * tail) + 0.3 * np.sin(4 * np.pi * f * tail)) * np.exp(-tail * 0.9) * adsr(len(tail), a=0.02, d=0.3, s=0.8, r=0.8)
        place(mus, v, end_at, 0.06, rng.uniform(-0.4, 0.4))
    fade = np.ones(N); fl = int(1.2 * SR); fade[-fl:] = np.linspace(1, 0, fl)
    return mus * fade[:, None] * energy


# ---------------------------------------------------------------- sound effects
def noise(sec):
    return rng.standard_normal(int(sec * SR))


def sweep_noise(sec, f0, f1, q=1.5):
    x = noise(sec); n = len(x); out = np.zeros(n); blk = 512
    for i in range(0, n, blk):
        f = f0 * (f1 / f0) ** (i / n)
        lo, hi = max(40, f / q), min(SR / 2 - 200, f * q)
        out[i:i + blk] = bp(x[max(0, i - 2048):i + blk], lo, hi)[-len(x[i:i + blk]):]
    return out


def sfx(kind):
    t = None
    if kind in ('whoosh', 'whoosh-soft', 'swoosh'):
        sec = {'whoosh': 0.55, 'whoosh-soft': 0.4, 'swoosh': 0.32}[kind]
        x = sweep_noise(sec, 300, 4200 if kind != 'swoosh' else 6000)
        e = np.sin(np.linspace(0, np.pi, len(x))) ** 2
        return x * e * {'whoosh': 0.5, 'whoosh-soft': 0.28, 'swoosh': 0.32}[kind], -0.2 if kind == 'swoosh' else 0.25
    if kind == 'pop':
        t = t_axis(0.09); f = 900 * np.exp(-t * 18) + 380
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38) * 0.5, 0.0
    if kind in ('tick', 'tick-soft'):
        t = t_axis(0.05)
        x = (np.sin(2 * np.pi * 2600 * t) * 0.6 + np.sin(2 * np.pi * 5200 * t) * 0.25) * np.exp(-t * 95)
        return x * (0.42 if kind == 'tick' else 0.2), 0.15
    if kind == 'key':
        t = t_axis(0.03)
        x = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 220) + np.sin(2 * np.pi * rng.uniform(1600, 2200) * t) * np.exp(-t * 180) * 0.3
        return x * rng.uniform(0.12, 0.2), rng.uniform(-0.2, 0.2)
    if kind == 'click':
        t = t_axis(0.06)
        x = hp(rng.standard_normal(len(t)), 1800) * (np.exp(-t * 300) + 0.6 * np.exp(-np.maximum(t - 0.025, 0) * 300) * (t > 0.025))
        return x * 0.35, 0.0
    if kind == 'stamp':
        t = t_axis(0.35)
        x = np.sin(2 * np.pi * np.cumsum(70 + 110 * np.exp(-t * 30)) / SR) * np.exp(-t * 14) + lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 40) * 0.5
        return x * 0.55, 0.0
    if kind == 'thud':
        t = t_axis(0.5)
        x = np.sin(2 * np.pi * np.cumsum(48 + 70 * np.exp(-t * 25)) / SR) * np.exp(-t * 8) + lp(rng.standard_normal(len(t)), 1200) * np.exp(-t * 60) * 0.4
        return x * 0.55, 0.0
    if kind == 'blip':
        t = t_axis(0.08)
        return np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 45) * 0.16, rng.uniform(-0.3, 0.3)
    if kind in ('success', 'chime'):
        notes = [88, 93] if kind == 'success' else [84, 88, 91, 96]
        out = np.zeros(int(1.6 * SR))
        for j, n in enumerate(notes):
            t = t_axis(1.2); f = midi(n)
            v = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 6) + 0.2 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 12)) * np.exp(-t * 3.2)
            i = int(j * 0.09 * SR); out[i:i + len(v)] += v[:len(out) - i]
        return out * (0.16 if kind == 'success' else 0.2), 0.1
    raise ValueError(kind)


def riser(end_t, sec=1.6):
    x = sweep_noise(sec, 400, 9000, q=1.3)
    e = np.linspace(0, 1, len(x)) ** 2.2
    t = t_axis(sec); tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (t / sec * 2)) / SR) * e * 0.15
    return (x * e * 0.32 + tone), end_t - sec


def sfx_track(level):
    buf = np.zeros((N, 2))
    for ev in EVENTS:
        k = ev['type']
        if k == 'riser-end':
            x, t0 = riser(ev['t']); place(buf, x, t0, level * 0.9)
            continue
        x, pan = sfx(k)
        place(buf, x, ev['t'], level, pan)
    return reverb(buf, 0.9, 0.18, seed=3)


# ---------------------------------------------------------------- mix
scenes = CFG['scenes']
first_step = next(s['start'] for s in scenes if s['id'] == 'free')
end_at = next(s['start'] for s in scenes if s['id'] == 'cta') + 2 * BAR
if MODE == 'voice':
    mus = music(full_from=first_step, end_at=min(end_at, DUR - 1.0), energy=1.0)
    w = wave.open('vo_full.wav'); vo = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    vo = signal.resample_poly(vo, SR, w.getframerate())[:N]
    vo = np.pad(vo, (0, N - len(vo)))
    # gentle presence boost + light compression feel
    vo = vo + 0.25 * hp(vo, 3000)
    env = np.sqrt(np.maximum(lp(vo ** 2, 6), 0)); env = np.clip(env / (env.max() + 1e-9) * 3, 0, 1)
    duck = 1 - 0.62 * lp(env, 3)          # about -8 dB under speech
    music_bus = mus * duck[:, None] * 0.32
    mix = music_bus + sfx_track(0.55) + np.column_stack([vo, vo]) * 0.95
else:
    mus = music(full_from=first_step - BAR, end_at=min(end_at, DUR - 1.0), energy=1.0)
    mix = mus * 0.8 + sfx_track(0.9)
mix = np.nan_to_num(mix)
mix = mix / (np.abs(mix).max() + 1e-9) * 0.9
with wave.open(f'audio_{MODE}.wav', 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((mix * 32767).astype(np.int16).tobytes())
print(MODE, 'audio', round(N / SR, 2), 's,', len(EVENTS), 'sound cues')
