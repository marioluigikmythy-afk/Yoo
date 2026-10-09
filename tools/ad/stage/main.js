// Tranom ad: "Alex gets scammed, then gets his account back". Deterministic: window.renderAt(t) draws one frame.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { makeEnv } from '/render/kit.js';
import { makeGuy } from './char.js';
import { makeRoom, windowTex } from './room.js';

const W = 1080, H = 1920;
const $ = (s) => document.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  out: (x) => 1 - (1 - x) ** 3,
  back: (x) => { const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; },
  in: (x) => x * x * x,
};
const bump = (t, a, len) => { const x = (t - a) / len; return x < 0 || x > 1 ? 0 : Math.sin(Math.PI * x); };
const typed = (str, t, t0, cps) => str.slice(0, clamp(Math.floor((t - t0) * cps), 0, str.length));
const lerpV = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

/* ------------------------------------------------------------------ */
/* 3D world                                                            */
/* ------------------------------------------------------------------ */
let R3;
async function buildWorld() {
  const glCanvas = document.createElement('canvas'); glCanvas.width = W; glCanvas.height = H; // off-screen: the visible #gl is a 2D copy
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0e0b1c');
  const envNight = makeEnv(renderer, { dusk: true }), envDay = makeEnv(renderer, {});
  scene.environment = envNight; scene.environmentIntensity = 0.35;
  const load = (u) => new Promise((r) => new THREE.TextureLoader().load(u, (t) => { t.colorSpace = THREE.SRGBColorSpace; r(t); }));
  const [p1, p2] = await Promise.all([load('poster1.jpg'), load('poster2.jpg')]);
  const crop = (t, aspect) => { const ia = t.image.width / t.image.height; if (ia > aspect) { t.repeat.set(aspect / ia, 1); t.offset.set((1 - aspect / ia) / 2, 0); } else { t.repeat.set(1, ia / aspect); t.offset.set(0, (1 - ia / aspect) / 2); } };
  crop(p1, 0.56 / 0.4); crop(p2, 0.46 / 0.62);
  const room = makeRoom(renderer, { posterTex: [p1, p2] }); scene.add(room.room);
  const guy = makeGuy(); guy.root.position.set(0, 0.5, 0); scene.add(guy.root);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.03, 40);
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 1, aperture: 0.003, maxblur: 0.008 }); composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.35, 0.55, 0.9); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const fxaa = new ShaderPass(FXAAShader); fxaa.material.uniforms.resolution.value.set(1 / W, 1 / H); composer.addPass(fxaa);
  R3 = { glCanvas, ctx2d: $('#gl').getContext('2d'), renderer, scene, camera, composer, bokeh, bloom, room, guy, envNight, envDay, winNight: windowTex(false), winDay: windowTex(true), mood: '' };
}

function setMood(m) {
  if (R3.mood === m) return; R3.mood = m;
  const { scene, room } = R3, L = room.lights;
  const night = m !== 'day';
  scene.environment = night ? R3.envNight : R3.envDay;
  room.winMat.map = night ? R3.winNight : R3.winDay; room.winMat.needsUpdate = true;
  L.moon.color.set(night ? '#8090ff' : '#ffd8b0');
  if (m === 'night') { L.hemi.intensity = 0.32; L.hemi.color.set('#5a4ca0'); L.led.intensity = 1.6; L.ledFront.intensity = 0.7; L.moon.intensity = 1.3; L.lamp.intensity = 0.9; scene.environmentIntensity = 0.35; scene.background.set('#0e0b1c'); room.ledMat.color.set('#9b6bff').multiplyScalar(2.6); }
  if (m === 'cold') { L.hemi.intensity = 0.2; L.hemi.color.set('#3c3a7a'); L.led.intensity = 0.6; L.ledFront.intensity = 0.3; L.moon.intensity = 2.0; L.lamp.intensity = 0; scene.environmentIntensity = 0.22; scene.background.set('#080614'); room.ledMat.color.set('#6b4bd0').multiplyScalar(1.2); }
  if (m === 'day') { L.hemi.intensity = 1.0; L.hemi.color.set('#d6d0ff'); L.hemi.groundColor.set('#4a3f7a'); L.led.intensity = 0; L.ledFront.intensity = 0; L.moon.intensity = 2.6; L.lamp.intensity = 0; scene.environmentIntensity = 0.55; scene.background.set('#cfc8f5'); room.ledMat.color.set('#c9c2ff'); }
}

// monitor: a blocky lavender game, or "disconnected"
function drawGame(t, mode) {
  const s = R3.room.monitor.screen, x = s.x;
  const g = x.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, '#93a9ff'); g.addColorStop(0.7, '#d8d1ff'); g.addColorStop(1, '#efeaff');
  x.fillStyle = g; x.fillRect(0, 0, 1280, 720);
  x.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 4; i++) { const cx = ((i * 380 + t * 30) % 1500) - 110; x.beginPath(); x.ellipse(cx, 110 + (i % 2) * 60, 90, 26, 0, 0, Math.PI * 2); x.fill(); }
  const block = (bx, by, bw, bh, top = '#b9b2ff', side = '#7d74e6') => { x.fillStyle = side; x.fillRect(bx, by, bw, bh); x.fillStyle = top; x.fillRect(bx, by, bw, 18); };
  const scroll = (t * 140) % 320;
  for (let i = -1; i < 6; i++) block(i * 320 - scroll, 500 + ((i * 37) % 3) * 30, 260, 260);
  block(820 - scroll * 0.4, 330, 140, 40, '#ffd27a', '#e3a540');
  // avatar
  const ax = 380, ay = 430 - Math.abs(Math.sin(t * 3.2)) * 70;
  x.fillStyle = '#2d3157'; x.fillRect(ax + 8, ay + 70, 18, 40); x.fillRect(ax + 30, ay + 70, 18, 40);
  x.fillStyle = '#7d74e6'; x.fillRect(ax, ay + 22, 56, 50);
  x.fillStyle = '#c98d68'; x.fillRect(ax + 8, ay - 18, 40, 40);
  x.fillStyle = '#2a1b17'; x.fillRect(ax + 6, ay - 22, 44, 12);
  x.fillStyle = '#1d1838'; x.fillRect(ax + 18, ay - 4, 5, 7); x.fillRect(ax + 33, ay - 4, 5, 7);
  // HUD
  x.fillStyle = 'rgba(29,24,56,.75)'; x.beginPath(); x.roundRect(28, 26, 300, 64, 32); x.fill();
  x.fillStyle = '#c98d68'; x.beginPath(); x.arc(62, 58, 22, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#fff'; x.font = '700 30px PJS'; x.fillText('AlexBuilds', 96, 69);
  for (let i = 0; i < 6; i++) { x.fillStyle = i === 2 ? 'rgba(255,255,255,.9)' : 'rgba(29,24,56,.6)'; x.beginPath(); x.roundRect(400 + i * 82, 628, 70, 70, 14); x.fill(); }
  if (mode === 'off') {
    x.fillStyle = 'rgba(10,8,22,.86)'; x.fillRect(0, 0, 1280, 720);
    x.fillStyle = '#fff'; x.font = '800 64px PJS'; x.textAlign = 'center'; x.fillText('Disconnected', 640, 350);
    x.font = '500 34px PJS'; x.fillStyle = 'rgba(255,255,255,.6)'; x.fillText('You were logged out.', 640, 410); x.textAlign = 'left';
  }
  s.t.needsUpdate = true;
}

function drawPhone(mode) {
  const ps = R3.room.phone.userData.screen, x = ps.x;
  if (ps.mode === mode) return; ps.mode = mode;
  const g = x.createLinearGradient(0, 0, 0, 1110); g.addColorStop(0, '#2b2360'); g.addColorStop(1, '#0f0b24');
  x.fillStyle = g; x.fillRect(0, 0, 540, 1110);
  if (mode === 'off') { x.fillStyle = '#05040a'; x.fillRect(0, 0, 540, 1110); ps.t.needsUpdate = true; return; }
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '300 130px PJS'; x.fillText('11:46', 270, 260);
  x.font = '600 26px PJS'; x.fillStyle = 'rgba(255,255,255,.7)'; x.fillText('Thursday, October 8', 270, 120);
  x.textAlign = 'left';
  x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.roundRect(24, 360, 492, 210, 34); x.fill();
  const gg = x.createLinearGradient(50, 390, 120, 460); gg.addColorStop(0, '#ffd66b'); gg.addColorStop(1, '#ff9d2e');
  x.fillStyle = gg; x.beginPath(); x.roundRect(48, 392, 70, 70, 18); x.fill();
  x.fillStyle = '#fff'; x.font = '700 28px PJS'; x.fillText('RBX Rewards', 140, 420);
  x.font = '500 22px PJS'; x.fillStyle = 'rgba(255,255,255,.6)'; x.fillText('now', 450, 420);
  x.fillStyle = '#fff'; x.font = '500 26px PJS'; x.fillText("You've been picked for 10,000", 140, 470); x.fillText('FREE Robux! Tap to claim.', 140, 506);
  ps.t.needsUpdate = true;
}

const PH_HELD = { p: [0, 1.0, 0.33], r: [0.75, Math.PI, 0] };
const PH_DESK = { p: [-0.3, 0.7735, 0.56], r: [-Math.PI / 2, 0, Math.PI + 0.35] };
const holdHands = (dy = 0) => ({ L: { p: [-0.05, 0.47 + dy, 0.31], pole: [-1, -1, -0.2], rot: [0, 0, 0.6] }, R: { p: [0.05, 0.47 + dy, 0.31], pole: [1, -1, -0.2], rot: [0, 0, -0.6] } });
const typingHands = (t) => ({
  L: { p: [-0.12 + 0.012 * Math.sin(t * 7.3), 0.29 + 0.01 * Math.abs(Math.sin(t * 11)), 0.6], pole: [-1, -1, -0.5] },
  R: { p: [0.3 + 0.02 * Math.sin(t * 2.3), 0.29, 0.62 + 0.015 * Math.cos(t * 1.9)], pole: [1, -1, -0.5] },
});
const blink = (t, at) => at.reduce((m, a) => Math.max(m, bump(t, a, 0.16)), 0);

function setPhone(place, light = 0, color = '#cdc6ff') {
  const { phone, lights } = R3.room;
  phone.visible = !!place; if (!place) { lights.phone.intensity = 0; return; }
  phone.position.set(...place.p); phone.rotation.set(...place.r); phone.updateMatrixWorld();
  lights.phone.position.copy(new THREE.Vector3(0, 0, 0.06).applyMatrix4(phone.matrixWorld));
  lights.phone.intensity = light; lights.phone.color.set(color);
}

function cam(pos, look, fov, focus, aperture = 0.003) {
  const c = R3.camera; c.fov = fov; c.position.set(...pos); c.lookAt(...look); c.updateProjectionMatrix();
  R3.bokeh.enabled = !!focus;
  if (focus) { R3.bokeh.uniforms.focus.value = focus; R3.bokeh.uniforms.aperture.value = aperture; R3.bokeh.uniforms.maxblur.value = 0.009; }
}

// one entry per 3D shot: returns nothing, sets the world for local time lt
const SHOT = {
  room(t, lt) {
    setMood('night'); drawGame(t, 'play'); R3.room.monitor.group.visible = true;
    R3.room.lights.screen.color.set('#aab2ff'); R3.room.lights.screen.intensity = 5;
    setPhone(PH_DESK, 0); drawPhone('off');
    if (lt < 2.2) { // over the shoulder: the game on his monitor
      const k = E.io(seg(lt, 0, 2.2));
      cam(lerpV([0.66, 1.7, -0.8], [0.42, 1.56, -0.42], k), lerpV([0.08, 1.06, 0.98], [0.04, 1.08, 0.98], k), 38, lerp(1.95, 1.5, k), 0.0022);
    } else { // his face, lit by the screen
      const k = E.out(seg(lt, 2.2, 4.0));
      cam(lerpV([0.86, 1.38, 1.18], [0.74, 1.36, 1.05], k), [0, 1.22, 0.05], 30, lerp(1.45, 1.3, k), 0.0025);
    }
    R3.guy.pose({ lean: 0.1, headPitch: 0.03 + 0.012 * Math.sin(t * 1.7), headYaw: 0.04 * Math.sin(t * 0.9), gaze: [0.06 * Math.sin(t * 1.1), 0.1], smile: 0.6 + 0.1 * Math.sin(t * 0.7), brows: [0.15, 0], lids: blink(t, [1.3, 3.2]), hands: typingHands(t) });
  },
  buzz(t, lt) {
    setMood('night'); drawGame(t, 'play'); R3.room.monitor.group.visible = true;
    const on = lt > 0.2;
    drawPhone(on ? 'notif' : 'off');
    const shake = on && lt < 0.75 ? Math.sin(lt * 95) * 0.004 : 0;
    setPhone({ p: [PH_DESK.p[0] + shake, PH_DESK.p[1], PH_DESK.p[2]], r: PH_DESK.r }, on ? 0.35 : 0);
    const k = E.out(seg(lt, 0, 1.7));
    cam(lerpV([-0.2, 1.12, 0.42], [-0.22, 1.06, 0.45], k), [-0.3, 0.775, 0.56], 30, lerp(0.38, 0.32, k), 0.006);
    R3.guy.pose({ lean: 0.1, smile: 0.6, gaze: [0, 0.1], hands: typingHands(t) });
  },
  shock(t, lt) {
    setMood('night'); R3.room.monitor.group.visible = false;
    const g = lt > 0.78; // glitch moment
    const flick = g ? (Math.sin(lt * 70) > 0 ? 1.8 : 0.6) : 0.9;
    setPhone(PH_HELD, lt < 0.78 ? 0.75 : flick, g ? '#ff4060' : '#d8d2ff');
    R3.room.lights.screen.color.set('#9aa4ff'); R3.room.lights.screen.intensity = 1.2;
    const s = seg(lt, 0.95, 1.3), sh = g && lt < 1.4 ? 0.006 : 0;
    const j = [Math.sin(lt * 61) * sh, Math.cos(lt * 53) * sh, 0];
    const k = E.out(seg(lt, 0, 2.2));
    cam(lerpV([0.08, 1.18, 1.62], [0.05, 1.19, 1.36], k).map((v, i) => v + j[i]), [0, 1.14, 0], 28, lerp(1.62, 1.36, k), 0.0025);
    const calm = { lean: 0.12, headPitch: 0.36, gaze: [0, -0.65], smile: 0.55, brows: [0.25, 0], lids: blink(t, [12.4]), hands: holdHands() };
    const shock = { lean: -0.04, headPitch: 0.16, gaze: [0, -0.45], wide: 1, brows: [1, 0.85], smile: -0.55, open: 0.85, width: 0.65, hands: holdHands(0.02) };
    R3.guy.pose(mix(calm, shock, E.out(s)));
  },
  despair(t, lt) {
    setMood('cold'); R3.room.monitor.group.visible = false;
    R3.room.lights.screen.color.set('#5f6cff'); R3.room.lights.screen.intensity = 2;
    setPhone(null);
    const k = E.io(seg(lt, 0, 2.8));
    cam(lerpV([0.34, 1.22, 1.75], [0.22, 1.22, 1.45], k), [0, 1.12, 0], 32, lerp(1.75, 1.45, k), 0.0025);
    const a = { lean: -0.02, headPitch: 0.2, gaze: [0, -0.3], brows: [0.6, 0.9], smile: -0.6, open: 0.25, width: 0.7, hands: holdHands(-0.12) };
    const b = { lean: -0.13, headPitch: 0.34, headRoll: 0.05 * Math.sin(t), gaze: [0, -0.45], lids: 0.38, brows: [0.3, 1], smile: -0.8, open: 0.04, width: 0.8,
      hands: { L: { p: [-0.12, 0.82, 0.06], pole: [-1, 0.1, 0.6], rot: [0, -1.2, 0] }, R: { p: [0.12, 0.82, 0.06], pole: [1, 0.1, 0.6], rot: [0, 1.2, 0] } } };
    R3.guy.pose(mix(a, b, E.io(seg(lt, 0, 0.9))));
  },
  restored(t, lt) {
    setMood('day'); R3.room.monitor.group.visible = false;
    R3.room.lights.screen.color.set('#c8c2ff'); R3.room.lights.screen.intensity = 1.5;
    const joyK = E.out(seg(lt, 1.25, 1.65));
    setPhone({ p: [0, 1.0 - 0.03 * joyK, 0.33], r: PH_HELD.r }, 0.18 + 0.3 * bump(lt, 0.9, 0.8), lt > 0.9 ? '#b8ffd9' : '#e4e0ff');
    const k = E.out(seg(lt, 0, 3.2));
    cam(lerpV([0.07, 1.18, 1.6], [0.04, 1.19, 1.34], k), [0, 1.14, 0], 28, lerp(1.6, 1.34, k), 0.0025);
    const read = { lean: 0.12, headPitch: 0.36, gaze: [0, -0.65], smile: 0.05, brows: [0.45, 0.55], lids: blink(t, [45.0]), hands: holdHands() };
    const surprise = { lean: 0.05, headPitch: 0.28, gaze: [0, -0.55], wide: 0.8, brows: [1, 0.2], smile: 0.4, open: 0.5, width: 0.8, hands: holdHands() };
    const joy = { lean: -0.08, headPitch: -0.04, happyEyes: 1, brows: [0.7, -0.35], smile: 1, open: 0.65, width: 1.2, hands: holdHands(-0.03) };
    const p1 = mix(read, surprise, E.out(seg(lt, 0.95, 1.2)));
    R3.guy.pose(lt < 1.3 ? p1 : mix(surprise, joy, joyK));
  },
  secure(t, lt) {
    setMood('day'); drawGame(t, 'play'); R3.room.monitor.group.visible = true;
    R3.room.lights.screen.color.set('#c8c2ff'); R3.room.lights.screen.intensity = 3;
    setPhone(PH_DESK, 0); drawPhone('off');
    const k = E.io(seg(lt, 0, 2.8));
    cam(lerpV([1.3, 1.62, 1.42], [1.12, 1.55, 1.25], k), [0.0, 1.1, 0.3], 38, lerp(1.75, 1.55, k), 0.0018);
    R3.guy.pose({ lean: 0.08, headPitch: 0.02, gaze: [0.05, 0.12], smile: 0.85, brows: [0.25, -0.1], lids: blink(t, [49.2]), hands: typingHands(t) });
  },
};
function mix(a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? (typeof b[k] === 'number' ? 0 : b[k]), y = b[k] ?? (typeof a[k] === 'number' ? 0 : a[k]);
    if (typeof x === 'number') out[k] = lerp(x, y, t);
    else if (Array.isArray(x)) out[k] = x.map((v, i) => lerp(v, y[i], t));
    else if (x && typeof x === 'object') out[k] = mix(x, y, t);
    else out[k] = t < 0.5 ? x : y;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* timeline                                                            */
/* ------------------------------------------------------------------ */
const SCENES = [
  { id: 'room', a: 0, b: 4.0, kind: '3d' },
  { id: 'buzz', a: 4.0, b: 5.7, kind: '3d' },
  { id: 'dm', a: 5.7, b: 8.7, kind: 'ui' },
  { id: 'fake', a: 8.7, b: 12.1, kind: 'ui' },
  { id: 'shock', a: 12.1, b: 14.3, kind: '3d' },
  { id: 'locked', a: 14.3, b: 18.7, kind: 'ui' },
  { id: 'despair', a: 18.7, b: 21.5, kind: '3d' },
  { id: 'ticket', a: 21.5, b: 24.9, kind: 'ui' },
  { id: 'search', a: 24.9, b: 27.5, kind: 'ui' },
  { id: 'site', a: 27.5, b: 33.5, kind: 'ui' },
  { id: 'mail', a: 33.5, b: 37.1, kind: 'ui' },
  { id: 'work', a: 37.1, b: 44.7, kind: 'ui' },
  { id: 'restored', a: 44.7, b: 47.9, kind: '3d' },
  { id: 'secure', a: 47.9, b: 50.7, kind: '3d' },
  { id: 'end', a: 50.7, b: 57.0, kind: 'ui' },
];
const DURATION = 57.0;

const T = {
  dm: { pops: [5.85, 6.25, 6.75, 7.35], tap: 8.1 },
  fake: { user: [8.95, 18], pass: [9.6, 16], login: 10.3, step2: 10.5, code: [10.85, 10], claim: 11.55 },
  locked: { n: [14.5, 15.2, 15.9], modal: 16.8, title: 17.3 },
  ticket: { mark: 22.2 },
  search: { q: [24.95, 28], res: 25.95, tap: 26.7 },
  site: { chip: 29.05, name: [29.35, 22], email: [29.6, 36], user: [30.1, 34], details: [30.45, 95], consent: 31.1, ring: 31.75, submit: 32.65 },
  mail: { pay: 34.9, payBtn: 35.9 },
  work: { ticks: [37.6, 37.95, 38.3, 38.65], req: 38.9, stamp: 40.0, b: 40.6, upd: [41.2, 42.2, 43.2] },
  restored: { banner: 45.6 },
  secure: { card: 48.3, ticks: [48.5, 48.8, 49.1, 49.4] },
  end: { logo: 51.0, tag: 51.4, url: 51.8, price: 52.3, fine: 52.8 },
};
const STR = { user: 'AlexBuilds', pass: '••••••••••', code: '482913', q: 'hacked roblox account help', name: 'Alex', email: 'alex@example.com',
  details: 'I clicked a fake free Robux link and typed my password and code. Then my email and password were changed.' };

function sceneAt(t) { for (const s of SCENES) if (t >= s.a && t < s.b) return s; return SCENES[SCENES.length - 1]; }

/* ---------- UI helpers ---------- */
const st = (el, o) => { if (typeof el === 'string') el = $(el); Object.assign(el.style, o); return el; };
const pop = (el, t, at, dur = 0.32) => { const k = seg(t, at, at + dur); st(el, { opacity: k > 0 ? Math.min(1, k * 3) : 0, transform: `scale(${k > 0 ? lerp(0.6, 1, E.back(k)) : 0.6})` }); };
const slideUp = (el, t, at, dy = 80, dur = 0.4) => { const k = E.out(seg(t, at, at + dur)); st(el, { opacity: k, transform: `translateY(${(1 - k) * dy}px)` }); };
function tap(el, t, at, x, y) { const k = seg(t, at - 0.12, at + 0.3); st(el, { left: `${x}px`, top: `${y}px`, opacity: k <= 0 || k >= 1 ? 0 : Math.sin(Math.PI * k) * 0.95, transform: `scale(${lerp(0.5, 1.15, k)})` }); }
const POS = {}; // centres of tap targets, measured in setup
function centre(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

/* ---------- the real site in an iframe ---------- */
const Z = 2.7693;
let SITE;
async function prepSite() {
  const f = $('#site');
  $('#ui-site').style.display = 'block';
  await new Promise((r) => { f.onload = r; f.src = '/site/index.html'; });
  const d = f.contentDocument, w = f.contentWindow;
  const css = d.createElement('style');
  css.textContent = '#consent{display:none!important} html{scroll-behavior:auto!important} .adfocus{outline:3px solid #8f86ef!important;outline-offset:2px} *{caret-color:transparent!important}';
  d.head.appendChild(css);
  d.querySelectorAll('img').forEach((im) => { im.loading = 'eager'; im.decoding = 'sync'; });
  await d.fonts.ready;
  for (let y = 0; y < d.documentElement.scrollHeight; y += 500) { w.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
  await Promise.all([...d.images].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
  w.scrollTo(0, 0);
  const top = (sel) => { const el = d.querySelector(sel); const r = el.getBoundingClientRect(); return { el, y: r.top + w.scrollY, x: r.left, w: r.width, h: r.height }; };
  SITE = { d, w, start: top('#start-form'), chip: top('label[for="sit-hacked"], #sit-hacked'), name: top('#f-name'), email: top('#f-email'), user: top('#f-username'),
    details: top('#f-details'), consent: top('#f-consent'), submit: top('#submit-btn'), assure: top('.start__card .assure li') };
  SITE.chip = (() => { const el = d.querySelector('#sit-hacked').closest('label'); const r = el.getBoundingClientRect(); return { el, y: r.top + w.scrollY, x: r.left, w: r.width, h: r.height }; })();
}
function siteScrollAt(t) {
  const S = SITE, T5 = T.site, vh = 693.4;
  const keys = [
    [27.5, 0], [28.5, 110], [29.0, S.chip.y - 170], [29.25, S.chip.y - 170], [29.4, S.name.y - 260], [30.05, S.name.y - 230], [30.45, S.details.y - 250],
    [31.05, S.details.y - 230], [31.6, S.assure.y - vh * 0.45], [33.5, S.assure.y - vh * 0.45],
  ];
  for (let i = 0; i < keys.length - 1; i++) { const [a, ya] = keys[i], [b, yb] = keys[i + 1]; if (t <= b) return lerp(ya, yb, E.io(seg(t, a, b))); }
  return keys[keys.length - 1][1];
}
function drawSite(t) {
  const S = SITE, T5 = T.site, d = S.d;
  const y = siteScrollAt(t); S.w.scrollTo(0, y);
  d.querySelector('#sit-hacked').checked = t >= T5.chip;
  const set = (sel, v, focus) => { const el = d.querySelector(sel); if (el.value !== v) el.value = v; el.classList.toggle('adfocus', !!focus); };
  set('#f-name', typed(STR.name, t, T5.name[0], T5.name[1]), t >= T5.name[0] && t < T5.email[0]);
  set('#f-email', typed(STR.email, t, T5.email[0], T5.email[1]), t >= T5.email[0] && t < T5.user[0]);
  set('#f-username', typed(STR.user, t, T5.user[0], T5.user[1]), t >= T5.user[0] && t < T5.details[0]);
  set('#f-details', typed(STR.details, t, T5.details[0], T5.details[1]), t >= T5.details[0] && t < T5.consent);
  d.querySelector('#f-consent').checked = t >= T5.consent;
  const scr = (o) => [(o.x + o.w / 2) * Z, (o.y + o.h / 2 - y) * Z];
  const taps = [[T5.chip, S.chip], [T5.name[0] - 0.05, S.name], [T5.email[0] - 0.05, S.email], [T5.user[0] - 0.05, S.user], [T5.details[0] - 0.05, S.details], [T5.consent, S.consent], [T5.submit, S.submit]];
  let done = false;
  for (const [at, o] of taps) if (t > at - 0.15 && t < at + 0.32) { const [x, yy] = scr(o); tap($('#sttap'), t, at, x, yy); done = true; }
  if (!done) st('#sttap', { opacity: 0 });
  // highlight "Never asks for passwords, codes or cookies" and push in on it
  const rk = E.out(seg(t, T5.ring, T5.ring + 0.35)) * (1 - seg(t, T5.submit - 0.1, T5.submit + 0.1));
  const a = S.assure, [ax, ay] = scr(a);
  st('#ring', { opacity: rk, left: `${a.x * Z - 22}px`, top: `${(a.y - y) * Z - 18}px`, width: `${a.w * Z + 44}px`, height: `${a.h * Z + 36}px` });
  const zk = E.io(seg(t, T5.ring, T5.ring + 0.8)) * (1 - E.io(seg(t, T5.submit - 0.25, T5.submit + 0.1)));
  st('#site-wrap', { transformOrigin: `${ax}px ${ay}px`, transform: `scale(${1 + 0.22 * zk})` });
  slideUp($('#toast'), t, T5.submit + 0.15, -60, 0.35);
}

/* ---------- per-scene UI ---------- */
const UI = {
  dm(t) {
    T.dm.pops.forEach((at, i) => pop($(`#dm${i + 1}`), t, at));
    st('#dmtyping', { display: 'none' });
    const [x, y] = POS.dm3; tap($('#dmtap'), t, T.dm.tap, x, y);
    const press = bump(t, T.dm.tap, 0.3); if (t > T.dm.pops[2] + 0.32) st('#dm3', { transform: `scale(${1 - 0.04 * press})` });
  },
  fake(t) {
    const F = T.fake;
    const u = typed(STR.user, t, F.user[0], F.user[1]), p = typed(STR.pass, t, F.pass[0], F.pass[1]);
    const caret = '<span class="caret"></span>';
    $('#fk-user').innerHTML = u ? u + (t < F.pass[0] ? caret : '') : '<span class="ph">Username</span>';
    $('#fk-user').classList.toggle('on', t >= F.user[0] - 0.1 && t < F.pass[0]);
    $('#fk-pass').innerHTML = p ? `<span style="letter-spacing:.18em">${p}</span>` + (t < F.login ? caret : '') : '<span class="ph">Password</span>';
    $('#fk-pass').classList.toggle('on', t >= F.pass[0] - 0.1 && t < F.login);
    const k2 = E.out(seg(t, F.step2, F.step2 + 0.3));
    st('#fk-step1', { opacity: 1 - seg(t, F.step2 - 0.05, F.step2 + 0.15), transform: `translateX(${-k2 * 120}px)` });
    st('#fk-step2', { opacity: k2, transform: `translateX(${(1 - k2) * 160}px)` });
    const c = typed(STR.code, t, F.code[0], F.code[1]);
    [...$('#fk-code').children].forEach((sp, i) => { sp.textContent = c[i] || ''; sp.classList.toggle('on', i === c.length && t < F.claim); });
    const cl = $('#fk-claim'); cl.innerHTML = t >= F.claim + 0.08 ? '<div class="spin" style="transform:rotate(' + (t * 720) + 'deg)"></div>' : 'Claim reward';
    let tp = null; if (Math.abs(t - F.login) < 0.35) tp = [F.login, POS.fkLogin]; if (Math.abs(t - F.claim) < 0.35) tp = [F.claim, POS.fkClaim];
    if (tp) tap($('#fktap'), t, tp[0], ...tp[1]); else st('#fktap', { opacity: 0 });
  },
  locked(t) {
    const L = T.locked;
    L.n.forEach((at, i) => { const k = E.back(seg(t, at, at + 0.35)); st(`#n${i + 1}`, { top: `${470 + i * 215}px`, opacity: seg(t, at, at + 0.12) * (1 - 0.55 * seg(t, L.modal, L.modal + 0.2)), transform: `translateY(${(1 - k) * -140}px) scale(${lerp(0.9, 1, k)})` }); });
    const mk = E.back(seg(t, L.modal, L.modal + 0.35)); const shake = Math.sin((t - L.modal) * 60) * 18 * bump(t, L.modal + 0.35, 0.4);
    st('#lk-modal', { opacity: seg(t, L.modal, L.modal + 0.1), transform: `translateX(${shake}px) scale(${lerp(0.85, 1, mk)})` });
    const tk = seg(t, L.title, L.title + 0.25);
    const jit = t > L.title && Math.sin(t * 50) > 0.6 ? 14 : 0;
    st('#lk-title', { opacity: tk, transform: `translateX(${jit * (Math.sin(t * 91) > 0 ? 1 : -1)}px) scale(${lerp(1.3, 1, E.out(tk))})` });
  },
  ticket(t) {
    slideUp($('#tk-mail'), t, 21.5, 160, 0.4);
    st('#tk-mark', { backgroundSize: `${E.io(seg(t, T.ticket.mark, T.ticket.mark + 0.7)) * 100}% 100%` });
  },
  search(t) {
    const S = T.search; $('#sq').textContent = typed(STR.q, t, S.q[0], S.q[1]);
    st('#sqc', { opacity: t < S.res && Math.floor(t * 3) % 2 === 0 ? 1 : t < S.res ? 0.3 : 0 });
    slideUp($('#r1'), t, S.res, 40, 0.3); slideUp($('#r2'), t, S.res + 0.15, 40, 0.3);
    st('#r1', { background: t > S.tap ? 'rgba(143,134,239,.12)' : 'transparent', borderRadius: '30px' });
    tap($('#sqtap'), t, S.tap, ...POS.r1);
  },
  site: drawSite,
  mail(t) {
    const M = T.mail;
    slideUp($('#tm-mail'), t, 33.5, 160, 0.4);
    const sk = E.out(seg(t, M.pay + 0.1, M.pay + 0.45));
    st('#tm-dim', { opacity: sk }); st('#tm-sheet', { transform: `translateY(${(1 - sk) * 950}px)` });
    const ok = seg(t, M.payBtn + 0.2, M.payBtn + 0.5);
    st('#tm-ok', { opacity: ok }); st('#tm-okin', { transform: `scale(${lerp(0.6, 1, E.back(ok))})` });
    let tp = null; if (Math.abs(t - M.pay) < 0.35) tp = [M.pay, POS.tmPay]; if (Math.abs(t - M.payBtn) < 0.35) tp = [M.payBtn, POS.tmPayBtn];
    if (tp) tap($('#tmtap'), t, tp[0], ...tp[1]); else st('#tmtap', { opacity: 0 });
  },
  work(t) {
    const K = T.work, inB = t >= K.b;
    st('#wk-a', { display: inB ? 'none' : 'block' }); st('#wk-b', { display: inB ? 'block' : 'none' });
    if (!inB) {
      slideUp($('#wk-proof'), t, 37.1, 120, 0.4);
      document.querySelectorAll('#wk-proof .ck').forEach((el, i) => { el.classList.toggle('on', t >= K.ticks[i]); const k = seg(t, K.ticks[i], K.ticks[i] + 0.25); el.querySelector('.bx').style.transform = `scale(${t >= K.ticks[i] ? lerp(0.6, 1, E.back(k)) : 1})`; });
      slideUp($('#wk-req'), t, K.req, 120, 0.4);
      document.querySelectorAll('#wk-req .lines i').forEach((el, i) => { el.style.transform = `scaleX(${E.out(seg(t, K.req + 0.2 + i * 0.2, K.req + 0.5 + i * 0.2))})`; });
      pop($('#wk-stamp'), t, K.stamp, 0.3);
    } else {
      const lt = t - K.b;
      st('#work-bg', { transform: `scale(${1.0 + 0.04 * lt / 4})` });
      slideUp($('#wk-day'), t, K.b + 0.1, -40, 0.35);
      const slots = [1290, 1070, 850];
      K.upd.forEach((at, i) => {
        const newer = K.upd.filter((a) => t >= a + 0.0).length - 1 - i; // how many cards arrived after this one
        if (t < at) { st(`#u${i + 1}`, { opacity: 0 }); return; }
        const k = E.out(seg(t, at, at + 0.4));
        const shift = K.upd.slice(i + 1).reduce((s, a2) => s + E.out(seg(t, a2, a2 + 0.4)), 0);
        const y = slots[0] - shift * 220;
        st(`#u${i + 1}`, { top: `${y}px`, opacity: k * (1 - 0.25 * Math.min(1, shift)), transform: `translateY(${(1 - k) * 120}px) scale(${1 - 0.03 * shift})` });
        void newer;
      });
    }
  },
  end(t) {
    const N = T.end, lt = t - 50.7;
    st('#end-bg', { transform: `scale(${1.12 - 0.08 * E.out(seg(lt, 0, 6))})` });
    pop($('#e-logo'), t, N.logo, 0.4); slideUp($('#e-tag'), t, N.tag, 50, 0.4); pop($('#e-url'), t, N.url, 0.35);
    slideUp($('#e-price'), t, N.price, 30, 0.4); slideUp($('#e-fine'), t, N.fine, 30, 0.5);
  },
};

/* ---------- captions ---------- */
let CHUNKS = [];
function buildCaptions(words) {
  const chunks = []; let cur = [];
  words.forEach((w, i) => {
    cur.push(w);
    if (/[,.?!:]$/.test(w.w) || cur.length >= 3 || (i + 1 < words.length && words[i + 1].seg !== w.seg)) { chunks.push(cur); cur = []; }
  });
  if (cur.length) chunks.push(cur);
  CHUNKS = chunks.map((c, i) => ({ words: c, start: c[0].start, end: Math.min(c[c.length - 1].end + 0.35, chunks[i + 1] ? chunks[i + 1][0].start : 1e9) }));
}
function drawCaptions(t) {
  const c = t < 50.7 ? CHUNKS.find((x) => t >= x.start - 0.04 && t < x.end) : null;
  const cap = $('#cap');
  if (!c) { cap.innerHTML = ''; return; }
  const hi = /^(Tranom|T1|Tranom\.|tranom\.com)[.,]?$/;
  cap.innerHTML = '<div class="box">' + c.words.map((w) => `<span class="${t >= w.start - 0.02 ? (hi.test(w.w) ? 'hi' : 'on') : ''}">${w.w.replace('T1', '<span class="t1n">T1</span>')}</span>`).join(' ') + '</div>';
  const k = E.out(seg(t, c.start - 0.04, c.start + 0.12));
  st(cap.firstChild, { transform: `translateY(${(1 - k) * 18}px)`, opacity: k });
}

/* ---------- grain, flashes, glitch ---------- */
let grainCtx, grainImg;
function drawGrain(frame) {
  if (!grainCtx) { grainCtx = $('#grain').getContext('2d'); grainImg = grainCtx.createImageData(540, 960); }
  let s = (frame * 2654435761) >>> 0; const d = grainImg.data;
  for (let i = 0; i < d.length; i += 4) { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; const v = 128 + ((s & 255) - 128) * 0.9; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  grainCtx.putImageData(grainImg, 0, 0);
}
function drawFx(t) {
  // white flash into the site, red flicker at the hack, soft flash on the end card
  const white = Math.max(bump(t, 27.25, 0.5) * 0.9, bump(t, 50.55, 0.4) * 0.7, bump(t, 45.6, 0.35) * 0.35);
  const red = t > 12.88 && t < 13.5 ? (Math.sin(t * 80) > 0 ? 0.32 : 0.08) : t > 14.3 && t < 14.6 ? 0.25 * (1 - seg(t, 14.3, 14.6)) : 0;
  const f = $('#flash');
  if (red > white) st(f, { background: '#ff2050', opacity: red }); else st(f, { background: t > 27 && t < 28 ? '#efeaff' : '#ffffff', opacity: white });
  const glitch = (t > 12.88 && t < 13.6) || (t > 17.3 && t < 17.7);
  st('#scan', { opacity: glitch ? 0.8 : t > 14.3 && t < 18.7 ? 0.25 : 0 });
  const g = $('#gl');
  if (t > 12.88 && t < 13.6) { const o = Math.sin(t * 97) > 0.2 ? 1 : 0; st(g, { filter: o ? 'hue-rotate(-40deg) saturate(1.6) contrast(1.2)' : 'none', transform: o ? `translateX(${Math.sin(t * 131) * 16}px)` : 'none' }); }
  else st(g, { filter: 'none', transform: 'none' });
  st('#vig', { opacity: sceneAt(t).kind === '3d' ? 1 : 0.55 });
}

/* ---------- overlays on 3D shots ---------- */
function drawOverlays(t) {
  const b = $('#bn'); const bv = t >= T.restored.banner && t < 47.9;
  st(b, { display: bv ? 'flex' : 'none' });
  if (bv) { const k = E.back(seg(t, T.restored.banner, T.restored.banner + 0.4)); st(b, { transform: `translateY(${(1 - k) * -260}px)` }); }
  const l = $('#lc'); const lv = t >= T.secure.card && t < 50.7;
  st(l, { display: lv ? 'block' : 'none' });
  if (lv) {
    slideUp(l, t, T.secure.card, 100, 0.4);
    l.querySelectorAll('.ck').forEach((el, i) => { const k = seg(t, T.secure.ticks[i], T.secure.ticks[i] + 0.25); el.style.opacity = t >= T.secure.ticks[i] ? 1 : 0.25; el.querySelector('.bx').style.transform = `scale(${t >= T.secure.ticks[i] ? lerp(0.5, 1, E.back(k)) : 0.001})`; });
  }
}

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */
let frameNo = 0;
window.renderAt = (t) => {
  const s = sceneAt(t);
  document.querySelectorAll('.ui').forEach((el) => { el.style.display = el.id === `ui-${s.id}` ? 'block' : 'none'; });
  $('#gl').style.display = s.kind === '3d' ? 'block' : 'none';
  if (s.kind === '3d') {
    SHOT[s.id](t, t - s.a);
    R3.composer.render(); R3.renderer.getContext().finish();
    R3.ctx2d.drawImage(R3.glCanvas, 0, 0);
  } else UI[s.id](t);
  drawOverlays(t);
  drawCaptions(t);
  drawFx(t);
  drawGrain(frameNo++);
};

window.setup = async (cfg) => {
  await document.fonts.load('700 40px PJS'); await document.fonts.load('300 40px PJS'); await document.fonts.ready;
  await buildWorld();
  await prepSite();
  buildCaptions(cfg.words || []);
  // measure tap targets
  const show = (id) => document.querySelectorAll('.ui').forEach((el) => { el.style.display = el.id === id ? 'block' : 'none'; });
  show('ui-dm'); POS.dm3 = centre($('#dm3'));
  show('ui-fake'); POS.fkLogin = centre($('#fk-login')); POS.fkClaim = centre($('#fk-claim'));
  show('ui-search'); POS.r1 = centre($('#r1'));
  show('ui-mail'); POS.tmPay = centre($('#tm-pay')); st('#tm-sheet', { transform: 'none' }); POS.tmPayBtn = centre($('#tm-paybtn'));
  // warm up shaders for every shot
  for (const s of SCENES.filter((x) => x.kind === '3d')) { window.renderAt(s.a + 0.5); }
  frameNo = 0;
  // sound cues for the audio script
  const ev = [];
  const add = (t, type, extra = {}) => ev.push({ t: +t.toFixed(3), type, ...extra });
  const keys = (str, t0, cps, type = 'key') => { for (let i = 0; i < str.length; i++) add(t0 + (i + 1) / cps, type); };
  SCENES.forEach((s) => add(s.a, 'cut', { id: s.id }));
  add(4.2, 'buzz'); add(4.22, 'notif');
  T.dm.pops.forEach((a) => add(a, 'pop')); add(T.dm.tap, 'tap');
  keys(STR.user, T.fake.user[0], T.fake.user[1]); keys(STR.pass, T.fake.pass[0], T.fake.pass[1]); add(T.fake.login, 'tap'); add(T.fake.step2, 'swipe');
  keys(STR.code, T.fake.code[0], T.fake.code[1]); add(T.fake.claim, 'tap');
  add(12.85, 'tapestop'); add(12.88, 'glitch'); add(13.05, 'boom');
  T.locked.n.forEach((a) => add(a, 'alert')); add(T.locked.modal, 'error'); add(T.locked.title, 'glitch'); add(T.locked.title, 'hit');
  add(21.5, 'swipe'); add(T.ticket.mark, 'marker');
  keys(STR.q, T.search.q[0], T.search.q[1]); add(T.search.res, 'pop'); add(T.search.tap, 'tap'); add(25.6, 'riser', { len: 1.9 }); add(27.5, 'shine');
  add(T.site.chip, 'tap'); keys(STR.name, T.site.name[0], T.site.name[1]); keys(STR.email, T.site.email[0], T.site.email[1]); keys(STR.user, T.site.user[0], T.site.user[1]);
  keys(STR.details.slice(0, 50), T.site.details[0], T.site.details[1]); add(T.site.consent, 'tap'); add(T.site.ring, 'shimmer'); add(T.site.submit, 'tap'); add(T.site.submit + 0.15, 'success');
  add(33.5, 'swipe'); add(T.mail.pay, 'tap'); add(T.mail.pay + 0.1, 'swipe'); add(T.mail.payBtn, 'tap'); add(T.mail.payBtn + 0.25, 'success');
  add(37.1, 'swipe'); T.work.ticks.forEach((a) => add(a, 'check')); add(T.work.req, 'swipe'); add(T.work.stamp, 'stamp');
  add(T.work.b, 'whoosh'); T.work.upd.forEach((a) => add(a, 'notif'));
  add(T.restored.banner, 'notif'); add(T.restored.banner + 0.05, 'impact'); add(45.95, 'cheer');
  add(T.secure.card, 'swipe'); T.secure.ticks.forEach((a) => add(a, 'check'));
  add(50.6, 'whoosh'); add(T.end.logo, 'logo');
  ev.sort((a, b) => a.t - b.t);
  return { events: ev, duration: DURATION, scenes: SCENES };
};
window.__ready = true;
