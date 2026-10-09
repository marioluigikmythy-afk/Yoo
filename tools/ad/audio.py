"""Original score and sound effects for the Tranom ad, fully synthesized (no samples, nothing to license).

Run in the working directory after capture.mjs has written cfg_ad.events.json:
  python3 audio.py            -> audio_ad.wav (voiceover + ducked score + sound effects)
Story beats the score follows:
  0-12.85   chill lo-fi while Alex games       12.85  tape stop at the hack
  13-25     dark drone and heartbeat           25.6   riser into Tranom
  27.5-36.5 hopeful piano                      36.5   build while T1 works
  45.6      account restored: full chorus      51.0   logo sting, fade out
"""
import json
import wave

import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(11)
CFG = json.load(open('cfg_ad.json'))
EVENTS = json.load(open('cfg_ad.events.json'))
DUR = CFG['duration']
N = int(DUR * SR)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    sus_n = max(0, n - a_n - d_n - r_n)
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
    i = int(round(t0 * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    x = x[:len(buf) - i]
    if buf.ndim == 1:
        buf[i:i + len(x)] += x * gain; return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414
    buf[i:i + len(x), 1] += x * gain * r * 1.414


def reverb(x, sec=1.6, wet=0.25, seed=1):
    out = np.zeros_like(x)
    for c in range(x.shape[1]):
        g = np.random.default_rng(seed * 10 + c)
        n = int(sec * SR)
        ir = lp(g.standard_normal(n) * np.exp(-np.linspace(0, 6.5, n)), 6000)
        ir /= np.sqrt(np.sum(ir ** 2))
        out[:, c] = signal.fftconvolve(x[:, c], ir)[:len(x)]
    return x * (1 - wet) + out * wet


def gate(buf, a, b, fade_in=0.05, fade_out=0.05):
    """Keep only [a, b) of a buffer, with short fades."""
    env = np.zeros(len(buf)); t = np.arange(len(buf)) / SR
    env[(t >= a) & (t < b)] = 1
    env = np.minimum(env, np.clip((t - a) / max(fade_in, 1e-3), 0, 1)) * np.clip((b - t) / max(fade_out, 1e-3), 0, 1)
    return buf * (env[:, None] if buf.ndim == 2 else env)


# ---------------------------------------------------------------- instruments
def epiano(f, sec, vel=1.0):
    t = t_axis(sec)
    x = np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 3)) * np.exp(-t * 1.6)
    x += 0.15 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 6)
    return x * (1 + 0.15 * np.sin(2 * np.pi * 4.5 * t)) * adsr(len(t), 0.005, 0.2, 0.8, 0.25) * vel


def piano(f, sec, vel=1.0):
    t = t_axis(sec)
    x = sum(a * np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k * k)) * np.exp(-t * (1.4 + 1.6 * k)) for k, a in ((1, 1), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06)))
    x += 0.05 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 80)
    return x * adsr(len(t), 0.002, 0.1, 0.9, 0.3) * vel


def pad_chord(notes, sec, bright=1600, level=0.05):
    t = t_axis(sec); env = adsr(len(t), a=min(0.6, sec / 3), d=0.4, s=0.85, r=min(0.8, sec / 3))
    out = np.zeros((len(t), 2))
    for n in notes:
        f = midi(n)
        for det, pan in ((-0.09, -0.7), (0.0, 0.0), (0.1, 0.7)):
            v = saw(f * 2 ** (det / 12), t, rng.random()) * env * level
            place(out, v, 0, 1.0, pan)
    return np.column_stack([lp(out[:, 0], bright), lp(out[:, 1], bright)])


def bass_note(f, sec):
    t = t_axis(sec)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.1 * np.sin(6 * np.pi * f * t)) * adsr(len(t), 0.005, 0.12, 0.7, 0.08)


def kick(soft=False):
    t = t_axis(0.42)
    x = np.sin(2 * np.pi * np.cumsum(45 + (60 if soft else 90) * np.exp(-t * 28)) / SR) * np.exp(-t * (11 if soft else 8))
    return x + (0.15 if soft else 0.3) * np.exp(-t * 160) * rng.standard_normal(len(t))


def snare(lofi=False):
    t = t_axis(0.25)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    nz = bp(rng.standard_normal(len(t)), 1200, 6000 if not lofi else 3500) * np.exp(-t * (22 if not lofi else 30))
    return body * 0.5 + nz


def clap():
    t = t_axis(0.3); n = bp(rng.standard_normal(len(t)), 900, 5000)
    return n * (np.exp(-t * 30) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 40) * (t > 0.012) + 0.5 * np.exp(-np.maximum(t - 0.024, 0) * 26) * (t > 0.024))


def hat(open_=False):
    t = t_axis(0.22 if open_ else 0.06)
    return hp(rng.standard_normal(len(t)), 6500 if open_ else 7000) * np.exp(-t * (16 if open_ else 70))


def shaker():
    t = t_axis(0.09)
    return hp(rng.standard_normal(len(t)), 5000) * np.sin(np.pi * np.clip(t / 0.09, 0, 1)) ** 2


# ---------------------------------------------------------------- score
def section_lofi(end=12.85):
    bpm = 90; beat = 60 / bpm; bar = 4 * beat
    chords = [[65, 69, 72, 76], [64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71]]  # Fmaj7 Em7 Dm7 Cmaj7
    roots = [41, 40, 38, 36]
    keys = np.zeros((N, 2)); drums = np.zeros((N, 2)); bass = np.zeros(N)
    nb = int(np.ceil(end / bar)) + 1
    for b in range(nb):
        t0 = b * bar; ch = chords[b % 4]
        for j, n in enumerate(ch):  # strummed e-piano chord + a pushed repeat
            place(keys, epiano(midi(n), bar * 0.9, 0.5), t0 + j * 0.018, 0.09, -0.3 + j * 0.2)
            place(keys, epiano(midi(n), beat * 1.2, 0.3), t0 + 2.5 * beat + j * 0.015, 0.07, -0.3 + j * 0.2)
        place(keys, epiano(midi(ch[-1] + 12), beat, 0.4), t0 + 3.5 * beat, 0.05, 0.4)
        if b >= 1:
            for bt, ln in ((0, 1.2), (1.5, 0.5), (2.5, 0.9)):
                place(bass, bass_note(midi(roots[b % 4]), ln * beat), t0 + bt * beat, 0.35)
            for k in range(4):
                tb = t0 + k * beat
                if k in (0,): place(drums, kick(True), tb, 0.7)
                if k == 2: place(drums, kick(True), tb + beat / 2, 0.55)
                if k in (1, 3): place(drums, snare(True), tb, 0.22, 0.05)
                place(drums, hat(), tb, 0.05, -0.2); place(drums, hat(), tb + beat * 0.58, 0.07, 0.2)  # swung 8ths
    keys = np.column_stack([lp(keys[:, 0], 3200), lp(keys[:, 1], 3200)])
    crackle = np.zeros(N)
    for _ in range(int(end * 9)):
        place(crackle, hp(rng.standard_normal(60), 3000) * rng.uniform(0.1, 0.4), rng.uniform(0, end))
    mix = reverb(keys + np.column_stack([bass, bass]) * 0.8, 1.4, 0.2, seed=2) + drums + np.column_stack([crackle, crackle]) * 0.05
    mix = lp_stereo(mix, 7000)
    # tape stop: the last 0.5 s slows to a halt
    ts, length = end, 0.5
    i0 = int(ts * SR); n = int(length * SR)
    rate = np.linspace(1, 0, n) ** 1.3
    pos = i0 + np.cumsum(rate)
    stop = np.column_stack([np.interp(pos, np.arange(len(mix)), mix[:, c]) for c in range(2)]) * np.linspace(1, 0.2, n)[:, None]
    mix[i0:i0 + n] = stop[:max(0, N - i0)]
    mix[i0 + n:] = 0
    return mix


def lp_stereo(x, fc):
    return np.column_stack([lp(x[:, 0], fc), lp(x[:, 1], fc)])


def section_dark(a=13.05, b=26.0):
    out = np.zeros((N, 2))
    t = t_axis(b - a)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * t)
    drone = np.zeros((len(t), 2))
    for n, pan in ((38, -0.4), (45, 0.4), (26, 0)):
        f = midi(n)
        v = (saw(f * 0.998, t) + saw(f * 1.003, t, 0.3)) * 0.5
        drone[:, 0] += v * np.cos((pan + 1) * np.pi / 4); drone[:, 1] += v * np.sin((pan + 1) * np.pi / 4)
    drone = np.column_stack([lp(drone[:, c], 300) for c in range(2)]) * (0.6 + 0.4 * lfo)[:, None]
    env = np.clip(t / 1.4, 0, 1) * np.clip((b - a - t) / 1.6, 0, 1)
    place(out, drone[:, 0] * env, a, 0.11, -1); place(out, drone[:, 1] * env, a, 0.11, 1)
    # eerie high pad once he's hands-on-head
    t2 = t_axis(b - 18.7)
    eerie = sum(np.sin(2 * np.pi * midi(n) * t2 * (1 + 0.003 * np.sin(2 * np.pi * 5 * t2))) for n in (74, 77, 81)) * np.clip(t2 / 2, 0, 1) * np.clip((b - 18.7 - t2) / 1.5, 0, 1)
    place(out, eerie, 18.7, 0.012, 0.2)
    # heartbeat (lub-dub), slowing down
    tb = 14.3
    while tb < 24.2:
        for off, g in ((0, 0.55), (0.17, 0.38)):
            tt = t_axis(0.3); hb = np.sin(2 * np.pi * np.cumsum(38 + 30 * np.exp(-tt * 30)) / SR) * np.exp(-tt * 16)
            place(out, hb, tb + off, g)
        tb += 0.82 + (tb - 14.3) * 0.02
    return out


HOPE_T0, HBAR = 27.5, 2.2625     # grid chosen so the restore lands on a downbeat at 45.6
HBEAT = HBAR / 4


def section_hope():
    out = np.zeros((N, 2)); drums = np.zeros((N, 2)); bass = np.zeros(N); arp = np.zeros((N, 2)); pads = np.zeros((N, 2)); lead = np.zeros((N, 2))
    prog = [[53, 57, 60, 64, 67], [48, 55, 59, 62, 64], [50, 57, 60, 64, 65], [46, 53, 57, 62, 65]]  # Fmaj9 C(add9) Dm9 Bbmaj9
    roots = [41, 36, 38, 34]
    build_at, drop_at, chorus_at, end_at = 36.55, 44.9, 45.6, 50.13
    b = 0
    while True:
        t0 = HOPE_T0 + b * HBAR
        if t0 >= end_at: break
        ch = prog[b % 4]
        chorus = t0 >= chorus_at - 0.01
        build = t0 >= build_at - 0.01
        # pad
        place(pads, pad_chord([n + 12 for n in ch[1:]], HBAR + 0.3, 1400 if not chorus else 3200, 0.03 if not chorus else 0.05)[:, 0], t0, 1, -1)
        place(pads, pad_chord([n + 12 for n in ch[1:]], HBAR + 0.3, 1400 if not chorus else 3200, 0.03 if not chorus else 0.05)[:, 1], t0, 1, 1)
        # piano arpeggio: 8ths, then 16ths in the build and chorus
        steps = 16 if build else 8
        pat = [0, 2, 4, 1, 3, 4, 2, 4]
        for s in range(steps):
            ts = t0 + s * HBAR / steps
            if drop_at <= ts < chorus_at: continue
            n = ch[1:][pat[s % 8] % 4] + 12 + (12 if chorus and s % 4 == 0 else 0)
            place(arp, piano(midi(n), 0.9, 0.9 if s % 4 == 0 else 0.6), ts, 0.07, -0.35 if s % 2 else 0.35)
        if b % 2 == 0 and not build:
            place(arp, piano(midi(ch[0]), HBAR * 1.8, 0.8), t0, 0.08)
        # bass + drums once the work starts
        if build:
            for k in range(8):
                tk = t0 + k * HBEAT / 2
                if drop_at <= tk < chorus_at: continue
                place(bass, bass_note(midi(roots[b % 4] + (12 if k % 2 else 0)), HBEAT * 0.45), tk, 0.3 if not chorus else 0.38)
            for k in range(4):
                tk = t0 + k * HBEAT
                if drop_at <= tk < chorus_at: continue
                place(drums, kick(not chorus), tk, 0.6 if not chorus else 0.85)
                if k in (1, 3) and (t0 >= 38.8 or chorus): place(drums, clap(), tk, 0.22 if not chorus else 0.3, 0.05)
                place(drums, hat(), tk + HBEAT / 2, 0.07, 0.25)
                if chorus and k == 3: place(drums, hat(True), tk + HBEAT / 2, 0.06, 0.3)
        elif t0 >= 32.0:
            for k in range(8):
                place(drums, shaker(), t0 + k * HBEAT / 2, 0.05 if k % 2 else 0.03, 0.3)
        # chorus lead: a simple rising bell motif
        if chorus:
            motif = [(0, 72), (0.75, 74), (1.5, 77), (2.5, 76), (3, 72)] if b % 2 == 0 else [(0, 77), (0.75, 76), (1.5, 74), (2.5, 72), (3, 69)]
            for bt, n in motif:
                tt = t_axis(0.9); f = midi(n + 12)
                v = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2.0 * f * tt) * np.exp(-tt * 5)) * np.exp(-tt * 3.5)
                place(lead, v, t0 + bt * HBEAT, 0.06, 0.15)
        b += 1
    # snare roll into the restore, then a breath
    roll_t = 43.34
    while roll_t < drop_at:
        k = (roll_t - 43.34) / (drop_at - 43.34)
        place(drums, snare(), roll_t, 0.08 + 0.2 * k, 0.05)
        roll_t += HBEAT / (2 if k < 0.5 else 4)
    out = pads + reverb(arp + lead, 2.2, 0.3, seed=4) + np.column_stack([bass, bass]) * 0.7 + drums
    # sidechain feel under the chorus kicks
    # final chord + fade to the end
    tail = t_axis(DUR - end_at)
    chord = pad_chord([65, 69, 72, 76, 79], DUR - end_at, 2600, 0.045)
    out[int(end_at * SR):int(end_at * SR) + len(chord)] += chord[:N - int(end_at * SR)]
    for n in (41, 53, 60, 65, 69, 72):
        place(out, piano(midi(n), DUR - end_at, 0.9), end_at + 0.02 * (n % 5), 0.07, rng.uniform(-0.4, 0.4))
    # gentle fade in at the start and a fade out at the end
    t = np.arange(N) / SR
    env = np.clip((t - HOPE_T0 + 0.1) / 0.6, 0, 1) * np.clip((DUR - t) / 2.5, 0, 1)
    return reverb(out, 1.4, 0.12, seed=5) * env[:, None]


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


def tone(f, sec, decay=8, kind='sin'):
    t = t_axis(sec)
    w = np.sin(2 * np.pi * f * t) if kind == 'sin' else np.sign(np.sin(2 * np.pi * f * t)) * 0.5
    return w * np.exp(-t * decay)


def sfx(ev):
    k = ev['type']
    if k == 'cut':
        snd = {'dm': 'swoosh', 'fake': 'swoosh', 'search': 'swoosh', 'secure': 'swoosh', 'restored': 'whoosh'}.get(ev.get('id'))
        return sfx({'type': snd}) if snd else (None, 0)
    if k in ('whoosh', 'swoosh', 'swipe'):
        sec = {'whoosh': 0.55, 'swoosh': 0.32, 'swipe': 0.28}[k]
        x = sweep_noise(sec, 300, 4200 if k == 'whoosh' else 6000)
        return x * np.sin(np.linspace(0, np.pi, len(x))) ** 2 * {'whoosh': 0.5, 'swoosh': 0.3, 'swipe': 0.22}[k], 0.2
    if k == 'pop':
        t = t_axis(0.09); f = 900 * np.exp(-t * 18) + 380
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38) * 0.45, -0.1
    if k == 'tap':
        t = t_axis(0.05)
        return (hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 260) * 0.6 + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 120) * 0.3) * 0.5, 0.05
    if k == 'key':
        t = t_axis(0.03)
        x = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 220) + np.sin(2 * np.pi * rng.uniform(1600, 2200) * t) * np.exp(-t * 180) * 0.3
        return x * rng.uniform(0.1, 0.16), rng.uniform(-0.2, 0.2)
    if k == 'buzz':  # phone vibrating on a desk: two pulses
        t = t_axis(0.75)
        am = ((t % 0.37) < 0.24).astype(float)
        x = np.sign(np.sin(2 * np.pi * 172 * t)) * 0.6 + np.sin(2 * np.pi * 172 * t)
        x = lp(x * am, 900) + lp(rng.standard_normal(len(t)), 400) * am * 0.4
        return x * 0.35, -0.15
    if k == 'notif':
        out = np.zeros(int(0.5 * SR))
        for j, f in enumerate((1318.5, 1760)):
            v = tone(f, 0.4, 9) + 0.3 * tone(f * 2, 0.4, 14)
            i = int(j * 0.085 * SR); out[i:i + len(v)] += v[:len(out) - i]
        return out * 0.16, 0.1
    if k == 'glitch':
        t = t_axis(0.6); x = np.zeros(len(t)); i = 0
        while i < len(t):
            ln = int(rng.uniform(0.015, 0.06) * SR)
            if rng.random() < 0.6:
                f = rng.choice([220, 440, 880, 1760, 3520]); seg = np.sign(np.sin(2 * np.pi * f * t[:ln]))
            else:
                seg = np.round(rng.standard_normal(ln) * 3) / 3
            x[i:i + ln] = seg[:len(x) - i] * rng.uniform(0.3, 1)
            i += ln + int(rng.uniform(0, 0.02) * SR)
        return hp(x, 200) * 0.22, 0.0
    if k == 'boom':
        t = t_axis(2.4)
        x = np.sin(2 * np.pi * np.cumsum(30 + 50 * np.exp(-t * 4)) / SR) * np.exp(-t * 1.6)
        x += lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 7) * 0.5
        return x * 0.75, 0.0
    if k == 'alert':
        out = np.zeros(int(0.45 * SR))
        for j, f in enumerate((880, 660)):
            v = lp(tone(f, 0.22, 10, 'sq'), 3000)
            i = int(j * 0.12 * SR); out[i:i + len(v)] += v[:len(out) - i]
        return out * 0.3, 0.1
    if k == 'error':
        t = t_axis(0.38)
        x = lp((np.sign(np.sin(2 * np.pi * 110 * t)) + np.sign(np.sin(2 * np.pi * 117 * t))) * 0.5, 1800) * adsr(len(t), 0.005, 0.05, 0.9, 0.06)
        return x * 0.3, 0.0
    if k in ('hit', 'impact'):
        t = t_axis(1.8)
        x = np.sin(2 * np.pi * np.cumsum(42 + 90 * np.exp(-t * 18)) / SR) * np.exp(-t * 3.5)
        x += bp(rng.standard_normal(len(t)), 300, 9000) * np.exp(-t * (9 if k == 'hit' else 5)) * 0.5
        return x * (0.6 if k == 'hit' else 0.55), 0.0
    if k == 'marker':
        x = sweep_noise(0.65, 2200, 3600, q=1.2)
        return x * np.sin(np.linspace(0, np.pi, len(x))) * 0.12, 0.2
    if k in ('shine', 'shimmer', 'cheer', 'logo', 'success', 'chime'):
        notes = {'shine': [84, 88, 91, 96, 100], 'shimmer': [91, 96, 100], 'cheer': [77, 81, 84, 89], 'logo': [72, 79, 84, 88, 91],
                 'success': [88, 93], 'chime': [84, 88, 91, 96]}[k]
        step = {'shine': 0.06, 'shimmer': 0.05, 'cheer': 0.07, 'logo': 0.11, 'success': 0.09, 'chime': 0.09}[k]
        out = np.zeros(int((len(notes) * step + 2.2) * SR))
        for j, n in enumerate(notes):
            t = t_axis(2.0); f = midi(n)
            v = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 6) + 0.2 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 12)) * np.exp(-t * 2.6)
            i = int(j * step * SR); out[i:i + len(v)] += v[:len(out) - i]
        if k == 'logo':
            t = t_axis(1.5); out[:len(t)] += np.sin(2 * np.pi * np.cumsum(55 + 40 * np.exp(-t * 6)) / SR) * np.exp(-t * 3) * 1.5
        return out * {'shine': 0.14, 'shimmer': 0.09, 'cheer': 0.12, 'logo': 0.16, 'success': 0.15, 'chime': 0.18}[k], 0.1
    if k == 'check':
        t = t_axis(0.12)
        return (np.sin(2 * np.pi * 1500 * t) + 0.5 * np.sin(2 * np.pi * 2250 * t)) * np.exp(-t * 35) * 0.14, rng.uniform(-0.3, 0.3)
    if k == 'stamp':
        t = t_axis(0.35)
        x = np.sin(2 * np.pi * np.cumsum(70 + 110 * np.exp(-t * 30)) / SR) * np.exp(-t * 14) + lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 40) * 0.5
        return x * 0.45, 0.0
    if k == 'riser':
        sec = ev.get('len', 1.6)
        x = sweep_noise(sec, 400, 9000, q=1.3); e = np.linspace(0, 1, len(x)) ** 2.2
        t = t_axis(sec); tn = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (t / sec * 2)) / SR) * e * 0.15
        return (x * e * 0.3 + tn), 0.0
    if k == 'tapestop':
        return None, 0
    return None, 0


def sfx_track():
    buf = np.zeros((N, 2))
    for ev in EVENTS:
        x, pan = sfx(ev)
        if x is not None:
            place(buf, x, ev['t'], 1.0, pan)
    # reverse cymbal into the restore
    sw = hp(rng.standard_normal(int(0.9 * SR)), 5000) * np.linspace(0, 1, int(0.9 * SR)) ** 3
    place(buf, sw, 45.6 - 0.9, 0.12)
    return reverb(buf, 0.9, 0.16, seed=3)


# ---------------------------------------------------------------- mix
score = section_lofi() * 0.9 + section_dark() + section_hope()
w = wave.open('vo_full.wav'); vo = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
vo = signal.resample_poly(vo, SR, w.getframerate())[:N]; vo = np.pad(vo, (0, N - len(vo)))
vo = vo + 0.25 * hp(vo, 3000)
env = np.sqrt(np.maximum(lp(vo ** 2, 6), 0)); env = np.clip(env / (env.max() + 1e-9) * 3, 0, 1)
duck = 1 - 0.6 * lp(env, 3)
mix = score * duck[:, None] * 0.42 + sfx_track() * 0.6 + np.column_stack([vo, vo]) * 0.95
mix = np.nan_to_num(mix)
mix = mix / (np.abs(mix).max() + 1e-9) * 0.9
with wave.open('audio_ad.wav', 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ad audio', round(N / SR, 2), 's,', len(EVENTS), 'sound cues')
