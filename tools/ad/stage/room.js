// Alex's bedroom at night: desk, monitor, phone, chair, window, posters and LED strip.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const C = (s) => new THREE.Color(s);
const phys = ({ sheen, sheenColor, clearcoat, clearcoatRoughness, ...o }) => new THREE.MeshStandardMaterial({ envMapIntensity: 0.5, ...o });

export function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { c, x: c.getContext('2d'), t };
}

export function windowTex(day = false) {
  const { x, t } = canvasTex(512, 640);
  const g = x.createLinearGradient(0, 0, 0, 640);
  if (day) { g.addColorStop(0, '#9fb4ff'); g.addColorStop(0.55, '#d9d2ff'); g.addColorStop(1, '#ffd9c2'); }
  else { g.addColorStop(0, '#120f33'); g.addColorStop(0.6, '#2b2470'); g.addColorStop(1, '#5a4bb5'); }
  x.fillStyle = g; x.fillRect(0, 0, 512, 640);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  if (day) {
    const sg = x.createRadialGradient(140, 470, 10, 140, 470, 260); sg.addColorStop(0, 'rgba(255,240,215,.95)'); sg.addColorStop(1, 'rgba(255,240,215,0)');
    x.fillStyle = sg; x.fillRect(0, 0, 512, 640);
    for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(60 + i * 110, 120 + (i % 2) * 70, 70, 18, 0, 0, Math.PI * 2); x.fill(); }
  } else {
    const mg = x.createRadialGradient(370, 150, 10, 370, 150, 140); mg.addColorStop(0, 'rgba(230,225,255,.55)'); mg.addColorStop(1, 'rgba(230,225,255,0)');
    x.fillStyle = mg; x.fillRect(0, 0, 512, 640);
    x.fillStyle = '#efeaff'; x.beginPath(); x.arc(370, 150, 38, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; x.fillRect(r() * 512, r() * 380, 1.6, 1.6); }
  }
  const sky = day ? '#6f68b8' : '#0d0a24';
  x.fillStyle = sky;
  let bx = 0; while (bx < 512) { const bw = 30 + r() * 60, bh = 90 + r() * 200; x.fillRect(bx, 640 - bh, bw, bh);
    if (!day) for (let wy = 640 - bh + 10; wy < 630; wy += 16) for (let wx = bx + 6; wx < bx + bw - 6; wx += 12) if (r() < 0.28) { x.fillStyle = r() < 0.5 ? 'rgba(255,214,150,.85)' : 'rgba(190,180,255,.75)'; x.fillRect(wx, wy, 5, 7); x.fillStyle = sky; }
    bx += bw + 4; }
  t.needsUpdate = true;
  return t;
}

export function makeRoom(renderer, { posterTex = [] } = {}) {
  const room = new THREE.Group();
  const wallM = phys({ color: '#2a2452', roughness: 0.9 });
  const floorM = phys({ color: '#231c33', roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const deskM = phys({ color: '#1b1730', roughness: 0.35, clearcoat: 0.6 });
  const matM = phys({ color: '#8f88ef', roughness: 0.85, sheen: 1, sheenColor: C('#d8d4ff') });
  const blackM = phys({ color: '#14111f', roughness: 0.3, metalness: 0.3, clearcoat: 1 });
  const glow = (c, k) => new THREE.MeshBasicMaterial({ color: C(c).multiplyScalar(k), toneMapped: false });
  const add = (geo, mat, x, y, z, parent = room) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  // shell
  const floor = add(new THREE.PlaneGeometry(8, 8), floorM, 0, 0, 0); floor.rotation.x = -Math.PI / 2;
  add(new THREE.PlaneGeometry(8, 3.2), wallM, 0, 1.6, -1.55);
  const front = add(new THREE.PlaneGeometry(8, 3.2), wallM, 0, 1.6, 1.55); front.rotation.y = Math.PI;
  const left = add(new THREE.PlaneGeometry(4, 3.2), wallM, -2.2, 1.6, 0); left.rotation.y = Math.PI / 2;
  const right = add(new THREE.PlaneGeometry(4, 3.2), wallM, 2.2, 1.6, 0); right.rotation.y = -Math.PI / 2;
  // LED strips (back and front walls)
  const led = glow('#9b6bff', 2.6); const ledMat = led;
  add(new THREE.BoxGeometry(4.4, 0.025, 0.02), led, 0, 2.35, -1.53);
  add(new THREE.BoxGeometry(4.4, 0.025, 0.02), led, 0, 2.35, 1.53);

  // window on the back wall
  const win = new THREE.Group(); win.position.set(-1.0, 1.55, -1.54); room.add(win);
  const winMat = new THREE.MeshBasicMaterial({ map: windowTex(false), toneMapped: false, color: C('#ffffff').multiplyScalar(0.85) });
  add(new THREE.PlaneGeometry(0.9, 1.12), winMat, 0, 0, 0.005, win);
  const frameM = phys({ color: '#3a3366', roughness: 0.5 });
  for (const [w, h, x, y] of [[0.98, 0.05, 0, 0.585], [0.98, 0.05, 0, -0.585], [0.05, 1.2, -0.465, 0], [0.05, 1.2, 0.465, 0], [0.9, 0.03, 0, 0], [0.03, 1.12, 0, 0]])
    add(new RoundedBoxGeometry(w, h, 0.05, 2, 0.01), frameM, x, y, 0.02, win);
  const curtainM = phys({ color: '#4b3f8c', roughness: 0.95, sheen: 1, sheenColor: C('#9b8cff') });
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
    const f = add(new THREE.CylinderGeometry(0.055, 0.055, 1.6, 16), curtainM, sx * (0.56 + i * 0.075), -0.1, 0.09 + (i % 2) * 0.02, win); f.scale.z = 0.6;
  }

  // posters on the back wall
  posterTex.forEach((tex, i) => {
    const p = new THREE.Group(); p.position.set(0.55 + i * 0.66, 1.62 - i * 0.1, -1.535); room.add(p);
    const w = i ? 0.46 : 0.56, h = i ? 0.62 : 0.4;
    add(new RoundedBoxGeometry(w + 0.04, h + 0.04, 0.025, 2, 0.006), phys({ color: '#e9e6ff', roughness: 0.5 }), 0, 0, 0, p);
    add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: C('#ffffff').multiplyScalar(0.55) }), 0, 0, 0.014, p);
  });
  // shelf with a plant and books
  const shelf = new THREE.Group(); shelf.position.set(0.85, 1.12, -1.42); room.add(shelf);
  add(new RoundedBoxGeometry(0.8, 0.03, 0.22, 2, 0.008), deskM, 0, 0, 0, shelf);
  ['#7d74e6', '#f0ecff', '#4b3f8c', '#a99ff5'].forEach((c, i) => add(new RoundedBoxGeometry(0.04, 0.2 + (i % 2) * 0.03, 0.15, 2, 0.006), phys({ color: c, roughness: 0.6 }), -0.3 + i * 0.045, 0.115, 0, shelf));
  add(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 24), phys({ color: '#efeaff', roughness: 0.4, clearcoat: 1 }), 0.25, 0.065, 0, shelf);
  for (let i = 0; i < 7; i++) { const l = add(new THREE.SphereGeometry(0.05, 16, 12), phys({ color: '#5f8f6b', roughness: 0.6 }), 0.25 + Math.cos(i) * 0.04, 0.15 + (i % 3) * 0.03, Math.sin(i * 2) * 0.04, shelf); l.scale.set(0.6, 1.2, 0.4); l.rotation.z = Math.cos(i * 1.7) * 0.6; }

  // bed corner (back left)
  add(new RoundedBoxGeometry(1.2, 0.36, 1.0, 4, 0.08), phys({ color: '#3b3270', roughness: 0.9, sheen: 1, sheenColor: C('#9488f0') }), -1.55, 0.2, -0.9);
  add(new RoundedBoxGeometry(0.5, 0.14, 0.3, 4, 0.06), phys({ color: '#d9d4ff', roughness: 0.9 }), -1.55, 0.44, -1.25);

  // desk
  const desk = new THREE.Group(); room.add(desk);
  add(new RoundedBoxGeometry(1.7, 0.045, 0.7, 4, 0.012), deskM, 0, 0.74, 0.8, desk);
  for (const sx of [-1, 1]) add(new RoundedBoxGeometry(0.05, 0.72, 0.6, 2, 0.01), deskM, sx * 0.78, 0.36, 0.8, desk);
  add(new RoundedBoxGeometry(1.0, 0.006, 0.4, 2, 0.003), matM, 0.05, 0.765, 0.66, desk);
  // keyboard with underglow
  const kb = add(new RoundedBoxGeometry(0.42, 0.022, 0.135, 3, 0.008), blackM, -0.02, 0.779, 0.63, desk);
  const keys = canvasTex(512, 160);
  keys.x.fillStyle = '#1c1830'; keys.x.fillRect(0, 0, 512, 160);
  for (let r = 0; r < 5; r++) for (let k = 0; k < 15; k++) { keys.x.fillStyle = r === 4 && k > 4 && k < 10 ? '#2c2747' : '#2a2545'; keys.x.fillRect(8 + k * 33.5, 8 + r * 30, 29, 26); }
  keys.t.needsUpdate = true;
  const keyTop = add(new THREE.PlaneGeometry(0.4, 0.12), phys({ map: keys.t, roughness: 0.5 }), -0.02, 0.7905, 0.63, desk); keyTop.rotation.x = -Math.PI / 2;
  const kbGlow = glow('#8e6bff', 1.6); add(new THREE.BoxGeometry(0.43, 0.004, 0.14), kbGlow, -0.02, 0.768, 0.63, desk);
  // mouse
  const mouse = add(new THREE.SphereGeometry(0.035, 24, 16), blackM, 0.33, 0.775, 0.64, desk); mouse.scale.set(0.8, 0.45, 1.3);
  // mug
  add(new THREE.CylinderGeometry(0.042, 0.038, 0.1, 32), phys({ color: '#efeaff', roughness: 0.3, clearcoat: 1 }), 0.52, 0.81, 0.78, desk);
  const handle = add(new THREE.TorusGeometry(0.026, 0.008, 10, 24), phys({ color: '#efeaff', roughness: 0.3, clearcoat: 1 }), 0.565, 0.81, 0.78, desk); handle.rotation.y = Math.PI / 2;
  // lamp
  const lampM = phys({ color: '#e7e3ff', roughness: 0.35, clearcoat: 1 });
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 32), lampM, -0.66, 0.772, 0.95, desk);
  const arm = add(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 12), lampM, -0.66, 0.95, 0.95, desk); arm.rotation.z = -0.25;
  const shade = add(new THREE.ConeGeometry(0.07, 0.09, 32, 1, true), phys({ color: '#e7e3ff', roughness: 0.35, side: THREE.DoubleSide }), -0.6, 1.12, 0.9, desk); shade.rotation.z = -0.5;
  add(new THREE.SphereGeometry(0.025, 16, 12), glow('#ffd6a8', 3), -0.6, 1.1, 0.9, desk);

  // monitor
  const mon = new THREE.Group(); mon.position.set(0, 1.08, 0.98); room.add(mon);
  add(new RoundedBoxGeometry(0.66, 0.39, 0.03, 4, 0.01), blackM, 0, 0, 0, mon);
  const screen = canvasTex(1280, 720);
  const scrMat = new THREE.MeshBasicMaterial({ map: screen.t, toneMapped: false, color: C('#ffffff').multiplyScalar(0.8) });
  const scr = add(new THREE.PlaneGeometry(0.63, 0.355), scrMat, 0, 0.004, -0.016, mon); scr.rotation.y = Math.PI;
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 16), blackM, 0, -0.27, 0.03, mon);
  add(new RoundedBoxGeometry(0.24, 0.012, 0.16, 2, 0.005), blackM, 0, -0.395, 0.03, mon);

  // phone (screen faces +z in its own frame)
  const phone = new THREE.Group(); room.add(phone);
  add(new RoundedBoxGeometry(0.074, 0.152, 0.008, 6, 0.009), phys({ color: '#d9d6fb', metalness: 0.9, roughness: 0.2, clearcoat: 1 }), 0, 0, 0, phone);
  const phoneScreen = canvasTex(540, 1110);
  const pscr = add(new THREE.PlaneGeometry(0.068, 0.146), new THREE.MeshBasicMaterial({ map: phoneScreen.t, toneMapped: false, color: C('#ffffff').multiplyScalar(0.6) }), 0, 0, 0.0042, phone);
  phone.userData = { screen: phoneScreen, mesh: pscr };

  // gaming chair
  const chair = new THREE.Group(); chair.position.set(0, 0, -0.02); room.add(chair);
  const chairM = phys({ color: '#1e1a33', roughness: 0.45, clearcoat: 0.5 });
  const accentM = phys({ color: '#5a52b8', roughness: 0.6 });
  add(new RoundedBoxGeometry(0.56, 0.1, 0.52, 4, 0.04), chairM, 0, 0.42, 0.05, chair);
  const back = new THREE.Group(); back.position.set(0, 0.48, -0.2); back.rotation.x = -0.12; chair.add(back);
  add(new RoundedBoxGeometry(0.54, 0.85, 0.1, 4, 0.05), chairM, 0, 0.45, 0, back);
  for (const sx of [-1, 1]) add(new RoundedBoxGeometry(0.06, 0.8, 0.104, 2, 0.02), accentM, sx * 0.17, 0.45, 0.001, back);
  add(new RoundedBoxGeometry(0.28, 0.12, 0.07, 4, 0.03), phys({ color: '#6f68c8', roughness: 0.85 }), 0, 0.78, 0.07, back);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 12), blackM, 0, 0.21, 0.05, chair);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const l = add(new RoundedBoxGeometry(0.3, 0.03, 0.04, 2, 0.01), blackM, Math.cos(a) * 0.14, 0.05, 0.05 + Math.sin(a) * 0.14, chair); l.rotation.y = -a; }

  room.traverse((o) => { if (o.isMesh && !(o.material.isMeshBasicMaterial)) { o.castShadow = true; o.receiveShadow = true; } });

  // lights
  const lights = {};
  lights.hemi = new THREE.HemisphereLight('#5a4ca0', '#120e22', 0.32); room.add(lights.hemi);
  // monitor glow (a wide soft spot is much cheaper than an area light in software rendering)
  lights.screen = new THREE.SpotLight('#a9b0ff', 14, 5, 1.25, 1, 1.2); lights.screen.position.set(0, 1.08, 0.94); lights.screen.target.position.set(0, 1.1, 0); room.add(lights.screen, lights.screen.target);
  // LED strips as cheap directional rim/top lights
  lights.led = new THREE.DirectionalLight('#9064ff', 1.6); lights.led.position.set(0.4, 2.33, -1.48); lights.led.target.position.set(0, 1.1, 0.2); room.add(lights.led, lights.led.target);
  lights.ledFront = new THREE.DirectionalLight('#9064ff', 0.7); lights.ledFront.position.set(0, 2.33, 1.48); lights.ledFront.target.position.set(0, 1.0, -0.2); room.add(lights.ledFront, lights.ledFront.target);
  lights.moon = new THREE.DirectionalLight('#8090ff', 1.3); lights.moon.position.set(-1.2, 2.2, -3); lights.moon.target.position.set(0, 1, 0); room.add(lights.moon, lights.moon.target);
  lights.lamp = new THREE.PointLight('#ffb37d', 0.9, 2.4, 1.6); lights.lamp.position.set(-0.58, 1.06, 0.88); room.add(lights.lamp);
  lights.phone = new THREE.PointLight('#cdc6ff', 0, 0.7, 1.4); room.add(lights.phone);

  return { room, monitor: { group: mon, screen, mat: scrMat }, phone, lights, desk, winMat, ledMat, kbGlow };
}
