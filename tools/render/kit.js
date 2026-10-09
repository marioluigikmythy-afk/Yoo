import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';

export { THREE };

export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const col = (s) => new THREE.Color(s);
function lerpStops(stops, y) {
  // stops: [[pos, color]] sorted desc by pos
  if (y >= stops[0][0]) return col(stops[0][1]);
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i], [p1, c1] = stops[i + 1];
    if (y <= p0 && y >= p1) {
      const t = (p0 - y) / (p0 - p1);
      return col(c0).lerp(col(c1), t);
    }
  }
  return col(stops[stops.length - 1][1]);
}

/* ---------- sky + environment ---------- */

export function skyTexture(stops, h = 1024) {
  // stops: [[0..1 from top, css color]]
  const c = document.createElement('canvas'); c.width = 4; c.height = h;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [p, s] of stops) gr.addColorStop(p, s);
  g.fillStyle = gr; g.fillRect(0, 0, 4, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeEnv(renderer, { warm = 0 } = {}) {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 96, 48);
  const pos = geo.attributes.position;
  const stops = [[1, '#ffffff'], [0.35, '#f3f1ff'], [0.05, '#dcd7fc'], [-0.08, '#b3a9ef'], [-0.22, '#7a6bd0'], [-0.45, '#3b2c8a'], [-1, '#17103c']];
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const c = lerpStops(stops, pos.getY(i) / 50);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w, h, p, k, tint = '#ffffff') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col(tint).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); s.add(m);
  };
  box(34, 14, [-22, 28, 18], 4.0);
  box(40, 16, [0, 12, 42], 1.6, '#f4f2ff');
  box(22, 10, [26, 16, 16], 1.8, warm ? '#fff1dc' : '#ffffff');
  box(50, 5, [0, 7, -42], 1.4, '#e9e4ff');
  box(12, 30, [40, 10, -10], 1.2);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.015).texture;
  pm.dispose();
  return tex;
}

/* ---------- materials ---------- */

export const M = {
  chrome: (c = '#e6e3ff', r = 0.1) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 1, roughness: r, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.25 }),
  satin: (c = '#b4b0f2', r = 0.3) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.05, roughness: r, clearcoat: 1, clearcoatRoughness: 0.18, sheen: 0.6, sheenColor: col('#ffffff'), sheenRoughness: 0.5, envMapIntensity: 1.1 }),
  dark: (c = '#231c45') => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.2, roughness: 0.35, clearcoat: 0.6, envMapIntensity: 0.8 }),
  glow: (c = '#ffffff', k = 1) => new THREE.MeshBasicMaterial({ color: col(c).multiplyScalar(k), toneMapped: true }),
};

/* ---------- flower field ---------- */

function flowerGeometry() {
  // 5 cupped petals around +Y plus a small centre
  const verts = [], cols = [];
  const petals = 5;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const pa = (x, z, y) => [x * ca - z * sa, y, x * sa + z * ca];
    const base = pa(0.08, 0, 0.0), l = pa(0.55, -0.32, 0.12), r = pa(0.55, 0.32, 0.12), tip = pa(1.0, 0, 0.3);
    const cb = [0.82, 0.82, 0.82], ce = [1, 1, 1];
    verts.push(...base, ...l, ...r, ...l, ...tip, ...r);
    cols.push(...cb, ...ce, ...ce, ...ce, ...ce, ...ce);
  }
  // centre bump
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    verts.push(0, 0.2, 0, Math.cos(a0) * 0.22, 0.05, Math.sin(a0) * 0.22, Math.cos(a1) * 0.22, 0.05, Math.sin(a1) * 0.22);
    cols.push(1.05, 0.95, 0.6, 0.9, 0.8, 0.45, 0.9, 0.8, 0.45);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  // flatten normals upward for soft, petal-like shading
  const nrm = g.attributes.normal;
  for (let i = 0; i < nrm.count; i++) {
    const v = new THREE.Vector3(nrm.getX(i), Math.abs(nrm.getY(i)) + 0.9, nrm.getZ(i)).normalize();
    nrm.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

function bladeGeometry(segs = 6) {
  const verts = [], cols = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const w = 0.011 * (1 - t * 0.92);
    const y = t, x = 0.18 * t * t;
    verts.push(x - w, y, 0, x + w, y, 0);
    const c0 = col('#8c7350'), c1 = col('#fff8e6');
    const c = c0.clone().lerp(c1, Math.pow(t, 0.7));
    cols.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function seedHeadGeometry() {
  // feathery grass plume: stem + elongated ellipsoid head
  const head = new THREE.SphereGeometry(1, 8, 6); head.scale(0.022, 0.14, 0.022); head.translate(0, 1.06, 0);
  const stem = new THREE.CylinderGeometry(0.0025, 0.005, 1, 4, 1); stem.translate(0, 0.5, 0);
  const g = mergeGeometries([stem.toNonIndexed(), head.toNonIndexed()]);
  const cols = [];
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const c = col(p.getY(i) > 0.95 ? '#f6ead0' : '#a88d62'); cols.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g;
}

function pickWeighted(R, list) {
  let tot = 0; for (const [, w] of list) tot += w;
  let r = R() * tot;
  for (const [c, w] of list) { if ((r -= w) <= 0) return c; }
  return list[list.length - 1][0];
}

export const PALETTE = {
  flowers: [['#ffffff', 0.3], ['#ece9ff', 0.2], ['#d0c9f8', 0.16], ['#aaa0ea', 0.13], ['#8879d8', 0.1], ['#6754c0', 0.07], ['#4c3a9e', 0.04]],
  buds: [['#4f3f98', 0.4], ['#3b2d7e', 0.35], ['#6d5eba', 0.25]],
  ramp: ['#ffffff', '#ebe6ff', '#c8bdf8', '#a291ee', '#7f6be0', '#634dcb', '#4c36ac', '#352482'],
  bush: '#1e1742',
  grass: [['#f2e4c6', 0.5], ['#e3cfa6', 0.35], ['#cdb48a', 0.15]],
};

export function makeField(scene, camera, opt = {}) {
  const {
    seed = 7, x0 = -18, x1 = 18, z0 = -34, z1 = 8,
    hillAmp = 0.9, hillFreq = 0.07, baseFn = null,
    bushDensity = 1.1, bushR = [0.35, 1.15], bushH = [0.45, 0.85],
    density = 420, flowerSize = [0.035, 0.07], refDist = 10,
    budRatio = 0.45, grassDensity = 2.2, grassH = [0.35, 0.95], grassPatch = 0.15,
    seedHeads = 0.25, palette = PALETTE, ndcMargin = 1.12, castShadows = true,
    mounds = [], tShift = 0.02, grassMinDist = 0,
  } = opt;
  const R = rng(seed);
  const noise = new SimplexNoise({ random: R });
  const base = (x, z) => {
    let h = hillAmp * (noise.noise(x * hillFreq, z * hillFreq) * 0.7 + noise.noise(x * hillFreq * 2.3 + 11, z * hillFreq * 2.3) * 0.3);
    if (baseFn) h += baseFn(x, z);
    for (const m of mounds) { // explicit hills [x, z, radius, height]
      const d2 = ((x - m[0]) ** 2 + (z - m[1]) ** 2) / (m[2] * m[2]);
      if (d2 < 1) h += m[3] * Math.pow(1 - d2, 1.6);
    }
    return h;
  };

  // bushes in a spatial hash
  const cell = 2.5, grid = new Map();
  const key = (i, j) => i + ',' + j;
  const nb = Math.floor((x1 - x0) * (z1 - z0) * bushDensity);
  for (let i = 0; i < nb; i++) {
    const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0);
    const dist = Math.max(1, Math.hypot(x - camera.position.x, z - camera.position.z));
    const grow = Math.max(1, dist / refDist * 0.8); // far bushes larger so the horizon stays lumpy
    const r = (bushR[0] + R() * (bushR[1] - bushR[0])) * grow;
    const b = { x, z, r, h: r * (bushH[0] + R() * (bushH[1] - bushH[0])) };
    const k = key(Math.floor(x / cell), Math.floor(z / cell));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(b);
  }
  const maxR = bushR[1] * 4;
  const reach = Math.ceil(maxR / cell);
  const dome = (x, z) => { // returns [height, normalised 0..1]
    const ci = Math.floor(x / cell), cj = Math.floor(z / cell);
    let best = 0, bn = 0;
    for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) {
      const list = grid.get(key(ci + i, cj + j)); if (!list) continue;
      for (const b of list) {
        const d2 = ((x - b.x) ** 2 + (z - b.z) ** 2) / (b.r * b.r);
        if (d2 < 1) { const v = Math.sqrt(1 - d2); const hh = b.h * v; if (hh > best) { best = hh; bn = v; } }
      }
    }
    return [best, bn];
  };
  const lump = (x, z) => 0.06 * noise.noise(x * 2.7, z * 2.7) + 0.03 * noise.noise(x * 7.1, z * 7.1);
  const surf = (x, z) => { const [d, n] = dome(x, z); return [base(x, z) + d + lump(x, z) * (0.4 + n), n]; };

  // ---- underlying bush surface mesh
  const sx = 520, sz = 300;
  const pg = new THREE.PlaneGeometry(x1 - x0, z1 - z0, sx, sz);
  pg.rotateX(-Math.PI / 2);
  pg.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pp = pg.attributes.position, sc = [];
  const bc = col(palette.bush), deep = col('#0f0a26');
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i), z = pp.getZ(i);
    const [h, n] = surf(x, z);
    pp.setY(i, h - 0.03);
    const c = deep.clone().lerp(bc, Math.min(1, 0.1 + n * 0.9));
    sc.push(c.r, c.g, c.b);
  }
  pg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  pg.computeVertexNormals();
  const ground = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, envMapIntensity: 0.25 }));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- sampling helpers
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  const v = new THREE.Vector3();
  const inView = (x, y, z, m = ndcMargin) => {
    v.set(x, y, z).project(camera);
    return v.z < 1 && Math.abs(v.x) < m && Math.abs(v.y) < m;
  };
  const normalAt = (x, z) => {
    const e = 0.04;
    const hx = surf(x + e, z)[0] - surf(x - e, z)[0];
    const hz = surf(x, z + e)[0] - surf(x, z - e)[0];
    return new THREE.Vector3(-hx, 2 * e, -hz).normalize();
  };

  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), mtx = new THREE.Matrix4(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  const fM = [], fC = [], bM = [], bC = [];
  const area = (x1 - x0) * (z1 - z0);
  const tries = Math.floor(area * density);
  for (let i = 0; i < tries; i++) {
    const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0);
    const dist = Math.hypot(x - camera.position.x, z - camera.position.z);
    const keep = Math.min(1, Math.pow(refDist / Math.max(dist, 0.5), 1.15));
    if (R() > keep) continue;
    const [h, n] = surf(x, z);
    const y = h + (R() - 0.3) * 0.05;
    if (!inView(x, y, z)) continue;
    const nrm = normalAt(x, z);
    nrm.x += (R() - 0.5) * 0.9; nrm.z += (R() - 0.5) * 0.9; nrm.y += 0.25; nrm.normalize();
    q.setFromUnitVectors(up, nrm);
    q2.setFromAxisAngle(up, R() * Math.PI * 2); q.multiply(q2);
    const grow = 1 / Math.sqrt(keep);
    const ao = 0.2 + 0.8 * Math.pow(Math.min(1, n * 1.1), 0.7);
    const isBud = R() < budRatio;
    const s = (flowerSize[0] + R() * (flowerSize[1] - flowerSize[0])) * grow * (isBud ? 0.6 : 1);
    s3.set(s, s * (isBud ? 1 : 1), s);
    p3.set(x, y, z);
    mtx.compose(p3, q, s3);
    let c;
    if (isBud) c = col(pickWeighted(R, palette.buds)).multiplyScalar(0.55 + ao * 0.5);
    else {
      const patch = noise.noise(x * 0.9 + 3, z * 0.9) * 0.5 + 0.5;
      let t = 0.7 * (1 - ao) + 0.3 * patch + (R() - 0.5) * 0.6 + tShift;
      t = Math.max(0, Math.min(0.999, t));
      const L = palette.ramp;
      const fi = t * (L.length - 1), i0 = Math.floor(fi);
      c = col(L[i0]).lerp(col(L[Math.min(L.length - 1, i0 + 1)]), fi - i0).multiplyScalar(0.75 + ao * 0.3 + R() * 0.1);
    }
    if (isBud) { bM.push(mtx.clone()); bC.push(c); } else { fM.push(mtx.clone()); fC.push(c); }
  }
  const mkInst = (geo, mat, Ms, Cs, shadow) => {
    const im = new THREE.InstancedMesh(geo, mat, Ms.length);
    for (let i = 0; i < Ms.length; i++) { im.setMatrixAt(i, Ms[i]); im.setColorAt(i, Cs[i]); }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false;
    scene.add(im); return im;
  };
  const flowerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, side: THREE.DoubleSide, emissive: col('#07041a'), envMapIntensity: 0.3 });
  mkInst(flowerGeometry(), flowerMat, fM, fC, castShadows);
  const budGeo = new THREE.IcosahedronGeometry(0.75, 1);
  mkInst(budGeo, new THREE.MeshStandardMaterial({ roughness: 0.7, envMapIntensity: 0.3 }), bM, bC, castShadows);

  // ---- grass blades + seed heads
  const gM = [], gC = [], hM = [], hC = [];
  const gt = Math.floor(area * grassDensity);
  for (let i = 0; i < gt; i++) {
    const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0);
    const patch = noise.noise(x * 0.35 + 50, z * 0.35);
    if (patch < grassPatch * 2 - 1 + 0.6) { if (R() > 0.25) continue; }
    const dist = Math.hypot(x - camera.position.x, z - camera.position.z);
    if (dist < grassMinDist) continue;
    const keep = Math.min(1, Math.pow(refDist / Math.max(dist, 0.5), 1.0));
    if (R() > keep) continue;
    const [h] = surf(x, z);
    if (!inView(x, h + 0.4, z, 1.2)) continue;
    const ht = (grassH[0] + R() * (grassH[1] - grassH[0])) * (0.8 + 0.4 / Math.sqrt(keep));
    const lean = (R() - 0.5) * 0.7;
    q.setFromEuler(new THREE.Euler(lean * 0.6, R() * Math.PI * 2, lean));
    p3.set(x, h - 0.1, z);
    const isHead = R() < seedHeads;
    s3.set(ht * (isHead ? 1 : 1.2), ht, ht);
    mtx.compose(p3, q, s3);
    const c = col(pickWeighted(R, palette.grass)).multiplyScalar(0.85 + R() * 0.3);
    if (isHead) { hM.push(mtx.clone()); hC.push(c); } else { gM.push(mtx.clone()); gC.push(c); }
  }
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide, emissive: col('#1a1206'), envMapIntensity: 0.5 });
  mkInst(bladeGeometry(), grassMat, gM, gC, true);
  mkInst(seedHeadGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, emissive: col('#2b1e08'), envMapIntensity: 0.5 }), hM, hC, true);

  window.__counts = { flowers: fM.length, buds: bM.length, grass: gM.length + hM.length };
  return { surf: (x, z) => surf(x, z)[0], counts: { flowers: fM.length, buds: bM.length, grass: gM.length + hM.length } };
}

/* ---------- objects ---------- */

export function makeKey({ chrome = M.chrome() } = {}) {
  const g = new THREE.Group();
  // bow: thick ring with an inner clover cut look
  const disc = new THREE.Shape(); disc.absarc(0, 0, 0.78, 0, Math.PI * 2, false);
  const hole = sparkShape(0.46); disc.holes.push(new THREE.Path(hole.getPoints(48).reverse()));
  const bowGeo = new THREE.ExtrudeGeometry(disc, { depth: 0.16, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 10, curveSegments: 96 });
  bowGeo.translate(0, 0, -0.08);
  { // dome both faces so reflections sweep across the bow
    const p = bowGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const r2 = (p.getX(i) ** 2 + p.getY(i) ** 2) / (0.88 * 0.88), z = p.getZ(i);
      p.setZ(i, z + Math.sign(z) * 0.14 * Math.max(0, 1 - r2));
    }
    bowGeo.computeVertexNormals();
  }
  const bow = new THREE.Mesh(bowGeo, chrome);
  bow.position.y = 2.3; g.add(bow);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.08, 32, 64), chrome);
  collar.rotation.x = Math.PI / 2; collar.position.y = 1.55; g.add(collar);
  const collar2 = collar.clone(); collar2.position.y = 1.42; g.add(collar2);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.7, 48), chrome);
  shaft.position.y = 0.3; g.add(shaft);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 16), chrome); tip.position.y = -1.05; g.add(tip);
  const bits = [[-0.55, 0.5], [-0.25, 0.32], [0.05, 0.42], [0.35, 0.28], [-0.85, 0.36]];
  for (const [y, w] of bits) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(w, 0.2, 0.16, 4, 0.05), chrome);
    b.position.set(0.13 + w / 2 - 0.04, y, 0); g.add(b);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function makePadlock({ body = M.chrome('#dedaff', 0.14), plateMat = M.satin('#aca7f0', 0.28), metal = M.chrome(), open = 0.75 } = {}) {
  const g = new THREE.Group();
  const bw = 2.2, bh = 1.75, bd = 0.85;
  const b = new THREE.Mesh(new RoundedBoxGeometry(bw, bh, bd, 8, 0.32), body);
  g.add(b);
  // front plate
  const plate = new THREE.Mesh(new RoundedBoxGeometry(bw * 0.8, bh * 0.76, 0.08, 6, 0.035), plateMat);
  plate.position.z = bd / 2 - 0.005; g.add(plate);
  // keyhole
  const kh = new THREE.Shape();
  kh.absarc(0, 0.12, 0.17, 0, Math.PI * 2, false);
  const kh2 = new THREE.Shape();
  kh2.moveTo(-0.08, 0.05); kh2.lineTo(0.08, 0.05); kh2.lineTo(0.12, -0.38); kh2.lineTo(-0.12, -0.38); kh2.lineTo(-0.08, 0.05);
  const kmat = M.dark('#1b1438');
  for (const s of [kh, kh2]) {
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.01, bevelSegments: 3 }), kmat);
    m.position.z = bd / 2 + 0.02; g.add(m);
  }
  // shackle: U path
  const sx = 0.62, legL = 0.55, top = 0.62;
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(new THREE.Vector3(-sx, -0.75, 0), new THREE.Vector3(-sx, legL, 0)));
  path.add(new THREE.CubicBezierCurve3(new THREE.Vector3(-sx, legL, 0), new THREE.Vector3(-sx, legL + top * 1.33, 0), new THREE.Vector3(sx, legL + top * 1.33, 0), new THREE.Vector3(sx, legL, 0)));
  path.add(new THREE.LineCurve3(new THREE.Vector3(sx, legL, 0), new THREE.Vector3(sx, open > 0 ? 0.15 : 0, 0)));
  const sh = new THREE.Mesh(new THREE.TubeGeometry(path, 160, 0.16, 32, false), metal);
  const capA = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 16), metal); capA.position.set(-sx, -0.75, 0);
  const capB = capA.clone(); capB.position.set(sx, open > 0 ? 0.15 : 0, 0);
  const shg = new THREE.Group(); shg.add(sh, capA, capB);
  // pivot around left leg
  const pivot = new THREE.Group(); pivot.position.set(-sx, bh / 2 - 0.05 + open * 0.38, 0);
  shg.position.set(sx, 0, 0); pivot.add(shg); pivot.rotation.y = -open * 0.9;
  g.add(pivot);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function shieldShape(w = 1, h = 1.2) {
  const s = new THREE.Shape();
  const r = 0.18 * w;
  s.moveTo(-w + r, h * 0.55);
  s.quadraticCurveTo(0, h * 0.72, w - r, h * 0.55);
  s.quadraticCurveTo(w, h * 0.53, w, h * 0.35);
  s.bezierCurveTo(w, -h * 0.25, w * 0.55, -h * 0.62, 0, -h * 0.85);
  s.bezierCurveTo(-w * 0.55, -h * 0.62, -w, -h * 0.25, -w, h * 0.35);
  s.quadraticCurveTo(-w, h * 0.53, -w + r, h * 0.55);
  return s;
}

export function makeShield({ body = M.satin('#9e99ee'), metal = M.chrome() } = {}) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape(1.15, 1.45), { depth: 0.35, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.16, bevelSegments: 12, curveSegments: 64 }), metal);
  outer.position.z = -0.18; g.add(outer);
  const inner = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape(0.9, 1.15), { depth: 0.3, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.12, bevelSegments: 12, curveSegments: 64 }), body);
  inner.position.z = 0.12; inner.position.y = 0.02; g.add(inner);
  // check mark
  const pts = [new THREE.Vector3(-0.42, 0.02, 0), new THREE.Vector3(-0.12, -0.3, 0), new THREE.Vector3(0.46, 0.34, 0)];
  const curve = new THREE.CatmullRomCurve3([pts[0], new THREE.Vector3(-0.27, -0.14, 0), pts[1], new THREE.Vector3(0.17, 0.02, 0), pts[2]], false, 'catmullrom', 0.05);
  const chk = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.1, 24, false), metal);
  chk.position.z = 0.62; g.add(chk);
  for (const p of [pts[0], pts[2]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 12), metal); c.position.copy(p); c.position.z = 0.62; g.add(c); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function makeBrick({ body = M.satin('#a7a3f1', 0.26), studs = 2, depthStuds = 2 } = {}) {
  const g = new THREE.Group();
  const u = 0.8, w = studs * u, d = depthStuds * u, h = 0.96;
  g.add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 8, 0.07), body));
  const prof = [new THREE.Vector2(0, 0), new THREE.Vector2(0.24, 0), new THREE.Vector2(0.24, 0.13), new THREE.Vector2(0.225, 0.165), new THREE.Vector2(0.19, 0.18), new THREE.Vector2(0, 0.18)];
  const sg = new THREE.LatheGeometry(prof, 64);
  for (let i = 0; i < studs; i++) for (let j = 0; j < depthStuds; j++) {
    const s = new THREE.Mesh(sg, body);
    s.position.set(-w / 2 + u / 2 + i * u, h / 2 - 0.01, -d / 2 + u / 2 + j * u);
    g.add(s);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function makeEchinacea({ R = rng(3), petals = 16, height = 3.2, bend = 0.35, petalColor = '#8d5ae0' } = {}) {
  const g = new THREE.Group();
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -1, 0), new THREE.Vector3(bend * 0.3, height * 0.4, 0.05), new THREE.Vector3(bend, height * 0.85, 0), new THREE.Vector3(bend * 0.9, height, 0)]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 80, 0.035, 12), new THREE.MeshStandardMaterial({ color: '#4f5236', roughness: 0.7 }));
  g.add(stem);
  const head = new THREE.Group(); head.position.copy(stemCurve.getPoint(1)); g.add(head);
  // cone
  const coneGeo = new THREE.SphereGeometry(0.32, 48, 32);
  coneGeo.scale(1, 0.85, 1);
  const coneMat = new THREE.MeshStandardMaterial({ color: '#7a3c1f', roughness: 0.95 });
  const cone = new THREE.Mesh(coneGeo, coneMat); cone.position.y = 0.12; head.add(cone);
  // spiky florets
  const sp = new THREE.ConeGeometry(0.035, 0.12, 6);
  const spikes = new THREE.InstancedMesh(sp, new THREE.MeshStandardMaterial({ color: '#c0601e', roughness: 0.7, emissive: '#2a0d00' }), 520);
  const m = new THREE.Matrix4(), qq = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 520; i++) {
    const phi = Math.acos(1 - R() * 1.1), th = R() * Math.PI * 2;
    const n = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
    const p = new THREE.Vector3(n.x * 0.32, n.y * 0.27 + 0.12, n.z * 0.32);
    qq.setFromUnitVectors(up, n);
    m.compose(p, qq, new THREE.Vector3(1, 0.8 + R() * 0.6, 1));
    spikes.setMatrixAt(i, m);
  }
  head.add(spikes);
  // drooping petals, built along +x then spun around the head
  const pmat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide, sheen: 1, sheenColor: '#ffd9ff', sheenRoughness: 0.4 });
  for (let i = 0; i < petals; i++) {
    const L = 1.05 + R() * 0.25, W = 0.2 + R() * 0.04;
    const pg = new THREE.PlaneGeometry(1, 1, 4, 18);
    const pos = pg.attributes.position, cols = [];
    const cTip = col(petalColor).lerp(col('#d2b6ff'), 0.4), cBase = col(petalColor).multiplyScalar(0.5);
    for (let k = 0; k < pos.count; k++) {
      const u = pos.getX(k) * 2, t = pos.getY(k) + 0.5; // u -1..1 across, t 0..1 along
      const width = W * (0.35 + 0.65 * Math.sin(Math.min(1, t * 1.1 + 0.1) * Math.PI * 0.9)) * (t > 0.9 ? Math.max(0.15, 1 - (t - 0.9) * 7) : 1);
      const x = 0.26 + t * L * 0.8;
      const y = 0.08 - Math.pow(t, 1.5) * 0.85 * L;
      const z = u * width / 2;
      const cup = (u * u) * 0.05;
      pos.setXYZ(k, x, y + cup, z);
      const c = cBase.clone().lerp(cTip, Math.pow(t, 0.55));
      cols.push(c.r, c.g, c.b);
    }
    pg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    pg.computeVertexNormals();
    const pm = new THREE.Mesh(pg, pmat);
    pm.rotation.y = (i / petals) * Math.PI * 2 + R() * 0.2;
    pm.rotation.z = (R() - 0.5) * 0.25;
    head.add(pm);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function makePhone({ frame = M.chrome('#d9d6fb', 0.16), screenTex } = {}) {
  const g = new THREE.Group();
  const w = 1.6, h = 3.25, d = 0.2;
  g.add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 10, 0.09), frame));
  const glass = new THREE.Mesh(new RoundedBoxGeometry(w - 0.1, h - 0.1, 0.02, 6, 0.008), new THREE.MeshPhysicalMaterial({ color: '#100c22', roughness: 0.05, metalness: 0.2, clearcoat: 1 }));
  glass.position.z = d / 2; g.add(glass);
  if (screenTex) {
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.18, h - 0.2), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
    scr.position.z = d / 2 + 0.012; g.add(scr);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function phoneScreen(font = 'Plus Jakarta Sans') {
  const c = document.createElement('canvas'); c.width = 720; c.height = 1460;
  const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, c.height);
  gr.addColorStop(0, '#f7f6ff'); gr.addColorStop(0.55, '#dcdaf8'); gr.addColorStop(1, '#b7b2ef');
  x.fillStyle = gr; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#2c2745';
  x.font = `500 44px "${font}"`; x.textAlign = 'center';
  x.fillText('Verification code', 360, 470);
  x.font = `400 30px "${font}"`; x.fillStyle = '#5b5677';
  x.fillText('Enter the 6-digit code', 360, 525);
  // code boxes
  const digits = '482913';
  for (let i = 0; i < 6; i++) {
    const bx = 70 + i * 100 + (i > 2 ? 0 : 0);
    x.fillStyle = '#ffffff';
    roundRect(x, bx, 600, 80, 104, 18); x.fill();
    x.strokeStyle = 'rgba(44,39,69,0.15)'; x.lineWidth = 3; x.stroke();
    x.fillStyle = '#2c2745'; x.font = `500 56px "${font}"`;
    x.fillText(digits[i], bx + 40, 672);
  }
  x.fillStyle = '#2c2745'; roundRect(x, 110, 820, 500, 96, 48); x.fill();
  x.fillStyle = '#ffffff'; x.font = `500 34px "${font}"`; x.fillText('Verify', 360, 880);
  // notch
  x.fillStyle = '#100c22'; roundRect(x, 270, 30, 180, 44, 22); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function roundRect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }

export function makeEnvelope({ paper = M.satin('#eceaff', 0.38), seal = M.chrome('#c9c3fb', 0.15) } = {}) {
  const g = new THREE.Group();
  const w = 3.0, h = 2.0, d = 0.16;
  g.add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 8, 0.07), paper));
  // flap (triangle) slightly raised
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + 0.06, h / 2 - 0.04); s.lineTo(w / 2 - 0.06, h / 2 - 0.04); s.lineTo(0, -0.12); s.lineTo(-w / 2 + 0.06, h / 2 - 0.04);
  const flapMat = M.satin('#dedbfd', 0.3);
  const flap = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 6 }), flapMat);
  flap.position.z = d / 2; g.add(flap);
  // lower folds
  const s2 = new THREE.Shape();
  s2.moveTo(-w / 2 + 0.06, -h / 2 + 0.06); s2.lineTo(w / 2 - 0.06, -h / 2 + 0.06); s2.lineTo(0, 0.18); s2.lineTo(-w / 2 + 0.06, -h / 2 + 0.06);
  const fold = new THREE.Mesh(new THREE.ExtrudeGeometry(s2, { depth: 0.015, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.02, bevelSegments: 4 }), paper);
  fold.position.z = d / 2 - 0.01; g.add(fold);
  // seal
  const sealGeo = new THREE.CylinderGeometry(0.36, 0.38, 0.1, 64);
  const sl = new THREE.Mesh(sealGeo, seal); sl.rotation.x = Math.PI / 2; sl.position.set(0, -0.1, d / 2 + 0.12); g.add(sl);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 16, 64), seal); ring.position.set(0, -0.1, d / 2 + 0.18); g.add(ring);
  const star = sparkShape(0.17);
  const st = new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), seal);
  st.position.set(0, -0.1, d / 2 + 0.17); g.add(st);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function sparkShape(r = 1) {
  // four-point star (the Tranom mark)
  const s = new THREE.Shape();
  const k = 0.22;
  s.moveTo(0, r);
  s.quadraticCurveTo(r * k, r * k, r, 0);
  s.quadraticCurveTo(r * k, -r * k, 0, -r);
  s.quadraticCurveTo(-r * k, -r * k, -r, 0);
  s.quadraticCurveTo(-r * k, r * k, 0, r);
  return s;
}

export function makeAvatar({ body = M.satin('#a8a4f2', 0.28), accent = M.satin('#6f68d2', 0.3), skin = M.satin('#eceaff', 0.3), wave = 1 } = {}) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  add(new RoundedBoxGeometry(2, 2, 1, 8, 0.12), body, 0, 0, 0); // torso
  add(new RoundedBoxGeometry(0.96, 2, 1, 8, 0.12), accent, -0.52, -2, 0); // legs
  add(new RoundedBoxGeometry(0.96, 2, 1, 8, 0.12), accent, 0.52, -2, 0);
  add(new RoundedBoxGeometry(0.96, 2, 1, 8, 0.12), skin, -1.5, 0, 0); // left arm
  const armPivot = new THREE.Group(); armPivot.position.set(1.2, 0.72, 0); g.add(armPivot);
  const arm = new THREE.Mesh(new RoundedBoxGeometry(0.96, 2, 1, 8, 0.12), skin); arm.position.y = -0.85; armPivot.add(arm);
  armPivot.rotation.z = wave * 2.95;
  // head: rounded cylinder via lathe
  const hp = [];
  const hr = 0.62, hh = 1.2, rr = 0.24;
  hp.push(new THREE.Vector2(0, -hh / 2));
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2); hp.push(new THREE.Vector2(hr - rr + Math.cos(a) * rr, -hh / 2 + rr + Math.sin(a) * rr)); }
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * (Math.PI / 2); hp.push(new THREE.Vector2(hr - rr + Math.cos(a) * rr, hh / 2 - rr + Math.sin(a) * rr)); }
  hp.push(new THREE.Vector2(0, hh / 2));
  const head = add(new THREE.LatheGeometry(hp, 64), skin, 0, 1.62, 0);
  head.scale.set(1.25, 1, 1.25);
  const neck = add(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 32), skin, 0, 1.05, 0);
  // face
  const eyeMat = M.dark('#1f1838');
  const eye = new THREE.SphereGeometry(0.075, 24, 16); eye.scale(1, 1.5, 0.5);
  add(eye, eyeMat, -0.22, 1.75, 0.76); add(eye, eyeMat, 0.22, 1.75, 0.76);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 12, 48, Math.PI * 0.75), eyeMat);
  smile.rotation.z = Math.PI + Math.PI * 0.125; smile.position.set(0, 1.55, 0.765); g.add(smile);
  // chest emblem: spark
  const em = new THREE.Mesh(new THREE.ExtrudeGeometry(sparkShape(0.36), { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 }), M.chrome('#f3f1ff', 0.12));
  em.position.set(0, 0.2, 0.5); g.add(em);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function makeSpark({ metal = M.chrome(), r = 1, depth = 0.25 } = {}) {
  const geo = new THREE.ExtrudeGeometry(sparkShape(r), { depth, bevelEnabled: true, bevelSize: 0.06 * r, bevelThickness: 0.08 * r, bevelSegments: 10, curveSegments: 64 });
  geo.center();
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const d = Math.hypot(p.getX(i), p.getY(i)) / r, z = p.getZ(i);
    p.setZ(i, z + Math.sign(z) * 0.22 * r * Math.max(0, 1 - d) ** 1.5);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, metal); m.castShadow = true;
  return m;
}

/* ---------- lights ---------- */

export function addLights(scene, { sun = [-6, 9, -4], sunK = 3.1, hemiK = 0.6, target = [0, 0, 0], shadowBox = 9, fill = 0.45 } = {}) {
  const hemi = new THREE.HemisphereLight('#f2f0ff', '#3b2b7a', hemiK);
  scene.add(hemi);
  const d = new THREE.DirectionalLight('#fff6ea', sunK);
  d.position.set(...sun); d.target.position.set(...target);
  d.castShadow = true;
  d.shadow.mapSize.set(4096, 4096);
  const c = d.shadow.camera; c.left = -shadowBox; c.right = shadowBox; c.top = shadowBox; c.bottom = -shadowBox; c.near = 0.5; c.far = 60;
  d.shadow.bias = -0.0004; d.shadow.normalBias = 0.02; d.shadow.radius = 6; d.shadow.blurSamples = 16;
  scene.add(d, d.target);
  const f = new THREE.DirectionalLight('#cfd0ff', fill); f.position.set(5, 4, 8); scene.add(f);
  return d;
}
