// Alex: a stylised, toy-like adult gamer with a small face rig and two-bone IK arms.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const lerp = (a, b, t) => a + (b - a) * t;

export const MAT = {
  skin: () => new THREE.MeshStandardMaterial({ color: '#c98d68', roughness: 0.62, envMapIntensity: 0.6 }),
  hair: () => new THREE.MeshStandardMaterial({ color: '#2a1b17', roughness: 0.55, envMapIntensity: 0.6 }),
  hoodie: () => new THREE.MeshStandardMaterial({ color: '#7d74e6', roughness: 0.82, envMapIntensity: 0.55 }),
  jeans: () => new THREE.MeshStandardMaterial({ color: '#2d3157', roughness: 0.8, envMapIntensity: 0.4 }),
  sclera: () => new THREE.MeshStandardMaterial({ color: '#f6f3ff', roughness: 0.25, envMapIntensity: 0.8 }),
  iris: () => new THREE.MeshStandardMaterial({ color: '#4a3226', roughness: 0.3 }),
  pupil: () => new THREE.MeshStandardMaterial({ color: '#0d0907', roughness: 0.2 }),
  mouth: () => new THREE.MeshStandardMaterial({ color: '#4a1a22', roughness: 0.7, side: THREE.DoubleSide }),
  teeth: () => new THREE.MeshStandardMaterial({ color: '#f4efe9', roughness: 0.4, side: THREE.DoubleSide }),
  dark: (c = '#1d1930') => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.2, envMapIntensity: 0.7 }),
  white: () => new THREE.MeshStandardMaterial({ color: '#f1efff', roughness: 0.4, envMapIntensity: 0.6 }),
};

// head shape
const R = 0.15, SY = 1.07, SZ = 0.97;
const surfZ = (x, y) => SZ * Math.sqrt(Math.max(1e-6, R * R - x * x - (y / SY) ** 2));

function capsuleBetween(mesh, a, b) {
  const d = b.clone().sub(a); const len = d.length();
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  return len;
}

export function makeGuy() {
  const m = { skin: MAT.skin(), hair: MAT.hair(), hoodie: MAT.hoodie(), jeans: MAT.jeans(), sclera: MAT.sclera(), iris: MAT.iris(), pupil: MAT.pupil(), mouth: MAT.mouth(), teeth: MAT.teeth(), dark: MAT.dark(), white: MAT.white() };
  const stringM = new THREE.MeshStandardMaterial({ color: '#8f88d8', roughness: 0.8 });
  const root = new THREE.Group(); root.name = 'guy';
  const torso = new THREE.Group(); root.add(torso);

  // ---- torso and hoodie
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.2, 10, 32), m.hoodie);
  chest.scale.set(1.32, 1, 0.8); chest.position.y = 0.28; torso.add(chest);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 20), m.hoodie);
  belly.scale.set(1.05, 0.7, 0.82); belly.position.set(0, 0.1, 0.01); torso.add(belly);
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.042, 16, 40), m.hoodie);
  hood.rotation.x = Math.PI / 2 - 0.55; hood.scale.set(1.15, 1, 0.9); hood.position.set(0, 0.51, -0.075); torso.add(hood);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.02, 12, 36), m.hoodie);
  collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.545, 0.0); torso.add(collar);
  for (const sx of [-1, 1]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.1, 8), stringM);
    s.position.set(sx * 0.03, 0.485, 0.118); s.rotation.x = 0.28; torso.add(s);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.014, 10), stringM);
    tip.position.set(sx * 0.03, 0.43, 0.133); tip.rotation.x = 0.28; torso.add(tip);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.054, 0.12, 24), m.skin);
  neck.position.y = 0.585; torso.add(neck);

  // ---- head
  const headPivot = new THREE.Group(); headPivot.position.y = 0.6; torso.add(headPivot);
  const head = new THREE.Group(); head.position.y = 0.15; headPivot.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), m.skin);
  skull.scale.set(1, SY, SZ); head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(R * 0.82, 48, 32), m.skin);
  jaw.scale.set(1, 0.78, 0.98); jaw.position.set(0, -0.05, 0.012); head.add(jaw);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0165, 24, 16), m.skin);
  nose.scale.set(1.05, 0.95, 0.9); nose.position.set(0, -0.018, surfZ(0, -0.018) - 0.002); head.add(nose);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 16), m.skin);
    ear.scale.set(0.45, 1, 0.75); ear.position.set(sx * 0.147, -0.004, -0.01); ear.rotation.y = sx * 0.3; head.add(ear);
  }

  // eyes: socket (lids) + ball (gaze)
  const eyes = [];
  const lashM = MAT.dark('#1a1210');
  for (const sx of [-1, 1]) {
    const ex = sx * 0.05, ey = 0.016;
    const socket = new THREE.Group(); socket.position.set(ex, ey, surfZ(ex, ey) - 0.019); socket.scale.set(1, 1.1, 0.8);
    socket.rotation.y = sx * 0.16; head.add(socket);
    const ball = new THREE.Group(); socket.add(ball);
    ball.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 24), m.sclera));
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0302, 32, 12, 0, Math.PI * 2, 0, 0.7), m.iris); iris.rotation.x = Math.PI / 2; ball.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0304, 32, 8, 0, Math.PI * 2, 0, 0.36), m.pupil); pupil.rotation.x = Math.PI / 2; ball.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    glint.position.set(0.009, 0.01, 0.0285); ball.add(glint);
    const upper = new THREE.Mesh(new THREE.SphereGeometry(0.0309, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.skin); socket.add(upper);
    const lash = new THREE.Mesh(new THREE.TorusGeometry(0.0309, 0.0022, 8, 48, Math.PI * 1.1), lashM); lash.rotation.set(Math.PI / 2, 0, -Math.PI * 0.05 + Math.PI); upper.add(lash);
    const lower = new THREE.Mesh(new THREE.SphereGeometry(0.0306, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.skin); socket.add(lower);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0072, 0.04, 6, 16), m.hair);
    brow.rotation.z = Math.PI / 2; const browG = new THREE.Group(); browG.add(brow); head.add(browG);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0045, 10, 32, Math.PI * 0.8), lashM);
    arc.rotation.z = Math.PI * 0.1; arc.position.set(ex, ey - 0.012, surfZ(ex, ey) + 0.002); arc.rotation.y = sx * 0.3; arc.visible = false; head.add(arc);
    eyes.push({ sx, socket, ball, upper, lower, browG, pupil, arc });
  }

  // mouth (rebuilt when its shape changes)
  const mouthG = new THREE.Group(); head.add(mouthG);
  const mouthMesh = new THREE.Mesh(new THREE.BufferGeometry(), m.mouth); mouthG.add(mouthMesh);
  const teethMesh = new THREE.Mesh(new THREE.BufferGeometry(), m.teeth); mouthG.add(teethMesh);

  // hair: a dark base cap trimmed at the hairline, covered in small curls; short curly beard
  const hairline = (az) => R * (-0.32 + 0.82 * ((1 + Math.cos(az)) / 2) ** 0.85);
  const jawC = V(0, -0.05, 0.012), jawR = V(R * 0.82, R * 0.82 * 0.78, R * 0.82 * 0.98);
  const hitEllipsoid = (dir, c, r) => { // distance along dir from the head centre to the ellipsoid surface
    const o = c.clone().negate(); const A = (dir.x / r.x) ** 2 + (dir.y / r.y) ** 2 + (dir.z / r.z) ** 2;
    const B = 2 * (o.x * dir.x / r.x ** 2 + o.y * dir.y / r.y ** 2 + o.z * dir.z / r.z ** 2);
    const Cc = (o.x / r.x) ** 2 + (o.y / r.y) ** 2 + (o.z / r.z) ** 2 - 1; const disc = B * B - 4 * A * Cc;
    return disc < 0 ? 0 : (-B + Math.sqrt(disc)) / (2 * A);
  };
  const surface = (dir) => Math.max(hitEllipsoid(dir, V(0, 0, 0), V(R, R * SY, R * SZ)), hitEllipsoid(dir, jawC, jawR));
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const capGeo = new THREE.SphereGeometry(R * 1.012, 96, 64);
  { const p = capGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i) * SY, p.getZ(i) * SZ); const az = Math.atan2(v.x, v.z); if (v.y < hairline(az)) v.multiplyScalar(0.92); p.setXYZ(i, v.x, v.y, v.z); } capGeo.computeVertexNormals(); }
  head.add(new THREE.Mesh(capGeo, m.hair));
  const curls = [];
  for (let i = 0; i < 20000 && curls.length < 760; i++) {
    const d = V(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1); if (d.lengthSq() > 1 || d.lengthSq() < 0.01) continue; d.normalize();
    const r0 = surface(d); const pt = d.clone().multiplyScalar(r0); const az = Math.atan2(pt.x, pt.z);
    if (pt.y < hairline(az) - 0.004) continue;
    const r = 0.0105 + rnd() * 0.006; curls.push([pt.addScaledVector(d, r * 0.42), r]);
  }
  const beardTop = (az) => { const a = Math.abs(az); return a < 0.55 ? -0.082 : a < 1.25 ? lerp(-0.082, 0.0, (a - 0.55) / 0.7) : lerp(0.0, 0.03, Math.min(1, (a - 1.25) / 0.3)); };
  const beard = [];
  for (let i = 0; i < 30000 && beard.length < 1000; i++) {
    const d = V(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1); if (d.lengthSq() > 1 || d.lengthSq() < 0.01) continue; d.normalize();
    const pt = d.clone().multiplyScalar(surface(d)); const az = Math.atan2(pt.x, pt.z);
    if (Math.abs(az) > 1.5 || pt.y > beardTop(az) || pt.y < -0.165) continue;
    const r = 0.0045 + rnd() * 0.0025; beard.push([pt.addScaledVector(d, r * 0.15), r]);
  }
  const shellGeo = new THREE.SphereGeometry(1, 96, 64);
  { const p = shellGeo.attributes.position; for (let i = 0; i < p.count; i++) { const d = V(p.getX(i), p.getY(i), p.getZ(i)).normalize(); const pt = d.clone().multiplyScalar(surface(d) + 0.0012); const az = Math.atan2(pt.x, pt.z);
    if (Math.abs(az) > 1.6 || pt.y > beardTop(az) + 0.002) pt.multiplyScalar(0.9); p.setXYZ(i, pt.x, pt.y, pt.z); } shellGeo.computeVertexNormals(); }
  head.add(new THREE.Mesh(shellGeo, m.hair));
  const inst = (list, mat, detail) => {
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, detail), mat, list.length); const mx = new THREE.Matrix4();
    list.forEach(([p, r], i) => { mx.compose(p, new THREE.Quaternion(), V(r, r, r)); im.setMatrixAt(i, mx); im.setColorAt(i, new THREE.Color().setHSL(0.04, 0.3, 0.035 + rnd() * 0.04)); });
    im.instanceMatrix.needsUpdate = true; return im;
  };
  const curlMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, envMapIntensity: 0.6 });
  head.add(inst(curls, curlMat, 1), inst(beard, curlMat, 0));

  // headset
  const headset = new THREE.Group(); head.add(headset);
  const hsMat = MAT.dark('#221d3a');
  const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.25, 0.013, 12, 64, Math.PI), hsMat); band.position.y = 0.01; band.rotation.y = 0; headset.add(band);
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#a68bff').multiplyScalar(2.2), toneMapped: false });
  for (const sx of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 32), hsMat); cup.rotation.z = Math.PI / 2; cup.position.set(sx * 0.175, -0.005, 0); headset.add(cup);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.005, 8, 32), glowMat); ring.rotation.y = Math.PI / 2; ring.position.set(sx * 0.196, -0.005, 0); headset.add(ring);
  }
  const mic = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.185, -0.03, 0.02), V(-0.17, -0.08, 0.08), V(-0.1, -0.1, 0.13), V(-0.05, -0.095, 0.15)]), 24, 0.005, 8), hsMat);
  headset.add(mic);
  const micTip = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 8), hsMat); micTip.position.set(-0.05, -0.095, 0.15); headset.add(micTip);

  // ---- arms
  const arms = {};
  for (const [side, sx] of [['L', -1], ['R', 1]]) {
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 8, 20), m.hoodie);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.19, 8, 20), m.hoodie);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.012, 10, 24), m.hoodie);
    const hand = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 16), m.skin); palm.scale.set(0.9, 0.55, 1.2); palm.position.z = 0.03; hand.add(palm);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.03, 6, 12), m.skin); thumb.position.set(-sx * 0.032, 0.008, 0.02); thumb.rotation.set(Math.PI / 2, 0, -sx * 0.6); hand.add(thumb);
    root.add(upper, fore, cuff, hand);
    arms[side] = { sx, upper, fore, cuff, hand, shoulder: V(sx * 0.2, 0.44, 0) };
  }

  // ---- legs (seated)
  for (const sx of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.34, 8, 20), m.jeans);
    capsuleBetween(thigh, V(sx * 0.09, 0.03, 0.02), V(sx * 0.11, 0.04, 0.42)); root.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.36, 8, 20), m.jeans);
    capsuleBetween(shin, V(sx * 0.11, 0.02, 0.43), V(sx * 0.12, -0.4, 0.45)); root.add(shin);
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.08, 0.2, 6, 0.035), m.white); shoe.position.set(sx * 0.12, -0.47, 0.5); root.add(shoe);
  }

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // ---------- pose API ----------
  const state = { mouthKey: '' };
  function setMouth(smile, open, width) {
    const key = `${smile.toFixed(3)}|${open.toFixed(3)}|${width.toFixed(3)}`;
    if (key === state.mouthKey) return; state.mouthKey = key;
    const w = 0.05 * width, cy = -0.066, curve = 0.016 * smile;
    const thick = 0.0045 + 0.042 * open;
    const N = 24, pts = [], top = [];
    for (let i = 0; i <= N; i++) { const u = i / N, x = lerp(-w / 2, w / 2, u), k = 1 - (2 * u - 1) ** 2; top.push([x, cy - curve * k + (0.003 + 0.004 * open) * k]); }
    const bot = [];
    for (let i = N; i >= 0; i--) { const u = i / N, x = lerp(-w / 2, w / 2, u), k = 1 - (2 * u - 1) ** 2; bot.push([x, cy - curve * k - thick * k * (0.6 + 0.4 * Math.max(0, smile))]); }
    const toShape = (arr) => { const s = new THREE.Shape(); arr.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
    const project = (geo, lift) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, surfZ(x, y) + lift); } p.needsUpdate = true; geo.computeVertexNormals(); return geo; };
    mouthMesh.geometry.dispose(); mouthMesh.geometry = project(new THREE.ShapeGeometry(toShape([...top, ...bot]), 1), 0.0035);
    teethMesh.geometry.dispose();
    if (open > 0.12 && smile > 0.2) {
      const tb = top.map(([x, y]) => [x * 0.86, y - 0.002]); const tl = top.slice().reverse().map(([x, y]) => [x * 0.86, y - 0.002 - 0.0065 * Math.min(1, open * 2)]);
      teethMesh.geometry = project(new THREE.ShapeGeometry(toShape([...tb, ...tl]), 1), 0.0042);
    } else teethMesh.geometry = new THREE.BufferGeometry();
  }

  function solveArm(a, target, pole, handRot) {
    const S = root.worldToLocal(torso.localToWorld(a.shoulder.clone()));
    const la = 0.25, lb = 0.24;
    const d0 = target.clone().sub(S); let d = d0.length();
    d = Math.min(Math.max(d, 0.05), (la + lb) * 0.999);
    const dir = d0.normalize();
    const cosA = (la * la + d * d - lb * lb) / (2 * la * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const n = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const E = S.clone().add(dir.clone().multiplyScalar(la * cosA)).add(n.multiplyScalar(la * sinA));
    const T = S.clone().add(dir.multiplyScalar(d));
    capsuleBetween(a.upper, S, E);
    capsuleBetween(a.fore, E, T);
    const fd = T.clone().sub(E).normalize();
    a.cuff.position.copy(T).addScaledVector(fd, -0.012); a.cuff.quaternion.setFromUnitVectors(V(0, 0, 1), fd);
    a.hand.position.copy(T);
    // hand points along the forearm, then optional twist/bend
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), fd);
    if (handRot) q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...handRot)));
    a.hand.quaternion.copy(q);
  }

  // pose: { lean, turn, headYaw, headPitch, headRoll, gaze:[x,y], lids, lower, brows:[y, tilt], smile, open, width, hands:{L:{p,pole,rot}, R:{...}}, headset }
  function pose(p) {
    torso.rotation.set(p.lean ?? 0, p.turn ?? 0, p.roll ?? 0);
    headPivot.rotation.set(p.headPitch ?? 0, p.headYaw ?? 0, p.headRoll ?? 0);
    const [gx, gy] = p.gaze ?? [0, 0];
    for (const e of eyes) {
      e.ball.rotation.set(-gy * 0.45, gx * 0.55, 0);
      const hap = (p.happyEyes ?? 0) > 0.5; e.socket.visible = !hap; e.arc.visible = hap;
      e.upper.rotation.x = lerp(-0.5, Math.PI / 2 + 0.05, p.lids ?? 0) - (p.wide ?? 0) * 0.4;
      e.lower.rotation.x = lerp(0.72, 0.05, p.lower ?? 0);
      const [by, tilt] = p.brows ?? [0, 0];
      const bx = e.sx * 0.054, byy = 0.064 + by * 0.018;
      e.browG.position.set(bx, byy, surfZ(bx, byy) + 0.004);
      e.browG.rotation.set(-0.25, e.sx * 0.38, -e.sx * tilt * 0.45);
    }
    setMouth(p.smile ?? 0.3, p.open ?? 0, p.width ?? 1);
    headset.visible = p.headset ?? true;
    root.updateMatrixWorld(true);
    for (const side of ['L', 'R']) {
      const h = p.hands?.[side]; if (!h) continue;
      solveArm(arms[side], V(...h.p), V(...(h.pole ?? [arms[side].sx, -1, -0.4])), h.rot);
    }
  }
  return { root, torso, head, headPivot, pose, materials: m };
}

// Blend two poses (numbers and arrays of numbers; nested hand targets too).
export function mixPose(a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (y === undefined) out[k] = x; else if (x === undefined) out[k] = y;
    else if (typeof x === 'number') out[k] = lerp(x, y, t);
    else if (Array.isArray(x)) out[k] = x.map((v, i) => lerp(v, y[i], t));
    else if (typeof x === 'object') out[k] = mixPose(x, y, t);
    else out[k] = t < 0.5 ? x : y;
  }
  return out;
}
