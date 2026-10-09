import { THREE, rng, skyTexture, makeEnv, M, makeField, makeKey, makePadlock, makeShield, makeBrick, makeEchinacea, makePhone, phoneScreen, makeEnvelope, makeAvatar, makeSpark, addLights } from './kit.js';

const HERO_SKY = [[0, '#f3f2fc'], [0.25, '#e8e8f9'], [0.45, '#dadcf6'], [0.62, '#cdcff2'], [0.8, '#c0c1ee'], [1, '#b5b5ea']];
const CARD_SKY = [[0, '#ffffff'], [0.45, '#f6f5fd'], [0.75, '#e4e3f8'], [1, '#d3d2f3']];

function base(renderer, w, h, { fov = 28, pos, look, sky = HERO_SKY, fog = ['#c9c9f0', 14, 46], env = {} }) {
  const scene = new THREE.Scene();
  scene.background = skyTexture(sky);
  scene.environment = makeEnv(renderer, env);
  scene.fog = new THREE.Fog(...fog);
  const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 200);
  camera.position.set(...pos); camera.lookAt(...look);
  camera.updateMatrixWorld();
  return { scene, camera };
}

function card(renderer, w, h, seed) {
  const { scene, camera } = base(renderer, w, h, { fov: 15, pos: [0, 2.0, 19], look: [0, 1.05, 0], sky: CARD_SKY, fog: ['#e1dff7', 17, 40] });
  const field = makeField(scene, camera, {
    seed, x0: -9, x1: 9, z0: -18, z1: 20, density: 700, refDist: 19, flowerSize: [0.024, 0.046],
    mounds: [[0, 0, 3.2, 0.35]], hillAmp: 0.45, bushDensity: 0.5, bushR: [0.5, 1.4], bushH: [0.4, 0.7], grassDensity: 1.6, grassMinDist: 11,
  });
  return { scene, camera, field };
}
function finishCard(scene, camera) {
  addLights(scene, { sun: [-6, 8, 7], target: [0, 0, 0], shadowBox: 6 });
  return { scene, camera, dof: { focus: 19, aperture: 0.0016, maxblur: 0.006 } };
}

function sink(field, obj, x, z, dy) { obj.position.set(x, field.surf(x, z) + dy, z); return obj; }

export const scenes = {
  hero(renderer, w, h) {
    const { scene, camera } = base(renderer, w, h, { fov: 26, pos: [0, 2.0, 12.5], look: [0, 1.75, 0], fog: ['#c6c7f0', 17, 48] });
    const field = makeField(scene, camera, {
      seed: 11, x0: -16, x1: 16, z0: -36, z1: 9, density: 1500, refDist: 11, flowerSize: [0.02, 0.04], grassDensity: 4,
      mounds: [[-4.4, 0.6, 4.2, 0.55], [4.6, 0.2, 4.4, 0.55], [0, 4.5, 6, -0.25], [-9, -6, 6, 0.6], [8, -8, 7, 0.7]],
      hillAmp: 0.7, grassMinDist: 6, bushDensity: 0.45, bushR: [0.6, 1.7], bushH: [0.4, 0.7],
    });
    const key = makeKey();
    key.scale.setScalar(0.6);
    sink(field, key, -3.15, 0.9, 0.2);
    key.rotation.set(0.05, 0.35, 0.58);
    scene.add(key);
    const lock = makePadlock({ open: 0.8 });
    lock.scale.setScalar(0.72);
    sink(field, lock, 3.35, 0.7, 0.72);
    lock.rotation.set(0.06, -0.38, -0.12);
    scene.add(lock);
    addLights(scene, { sun: [-8, 7, 4], target: [0, 0, 0], shadowBox: 10, hemiK: 0.45 });
    return { scene, camera, dof: { focus: 12.5, aperture: 0.0016, maxblur: 0.006 } };
  },

  grow(renderer, w, h) {
    // wide feature card: flowers gather in the bottom-right around a brick and a coneflower
    const { scene, camera } = base(renderer, w, h, { fov: 15, pos: [0, 2.3, 20], look: [0, 2.05, 0], sky: [[0, '#d6daf3'], [0.6, '#cdd2f1'], [1, '#c3c9ee']], fog: ['#c9cdef', 16, 40] });
    const ramp = (x) => { const t = Math.max(0, Math.min(1, (x - 0.2) / 3.2)); return -2.6 * (1 - t * t * (3 - 2 * t)); };
    const field = makeField(scene, camera, {
      seed: 21, x0: -3, x1: 12, z0: -14, z1: 21, density: 700, refDist: 20, flowerSize: [0.024, 0.046],
      mounds: [[3.9, 0.4, 3.0, 0.5]], hillAmp: 0.25, baseFn: (x) => ramp(x), bushDensity: 0.5, bushR: [0.5, 1.4], bushH: [0.4, 0.7], grassDensity: 1.8, grassMinDist: 12,
    });
    const brick = makeBrick({ studs: 2, depthStuds: 2 });
    brick.scale.setScalar(0.68);
    sink(field, brick, 3.0, 1.0, -0.12);
    brick.rotation.set(0.16, -0.55, 0.22);
    scene.add(brick);
    const fl = makeEchinacea({ height: 3.4, bend: -0.25 });
    fl.scale.setScalar(0.72);
    sink(field, fl, 3.85, 0.0, -0.25);
    fl.rotation.set(0, 0.5, 0);
    scene.add(fl);
    addLights(scene, { sun: [-6, 8, 7], target: [3, 0, 0], shadowBox: 6 });
    return { scene, camera, dof: { focus: 20, aperture: 0.0016, maxblur: 0.006 } };
  },

  hacked(renderer, w, h) {
    const { scene, camera, field } = card(renderer, w, h, 31);
    const sh = makeShield();
    sh.scale.setScalar(0.92);
    sh.position.set(0, 1.6, 0);
    sh.rotation.set(-0.06, -0.34, 0.05);
    scene.add(sh);
    return finishCard(scene, camera);
  },

  password(renderer, w, h) {
    const { scene, camera, field } = card(renderer, w, h, 41);
    const key = makeKey();
    key.scale.setScalar(0.68);
    key.position.set(0.3, 1.3, 0);
    key.rotation.set(0.12, -0.35, 0.78);
    scene.add(key);
    return finishCard(scene, camera);
  },

  twostep(renderer, w, h) {
    const { scene, camera, field } = card(renderer, w, h, 51);
    const ph = makePhone({ screenTex: phoneScreen() });
    ph.scale.setScalar(0.7);
    ph.position.set(0, 1.62, 0);
    ph.rotation.set(-0.16, -0.36, 0.1);
    scene.add(ph);
    return finishCard(scene, camera);
  },

  appeal(renderer, w, h) {
    const { scene, camera, field } = card(renderer, w, h, 61);
    const env = makeEnvelope();
    env.scale.setScalar(0.9);
    env.position.set(0, 1.68, 0);
    env.rotation.set(-0.1, -0.38, 0.1);
    scene.add(env);
    return finishCard(scene, camera);
  },

  welcome(renderer, w, h) {
    const { scene, camera } = base(renderer, w, h, { fov: 22, pos: [0, 2.05, 13.5], look: [0, 1.85, 0], fog: ['#c6c7f0', 17, 48] });
    const field = makeField(scene, camera, { seed: 71, x0: -16, x1: 16, z0: -34, z1: 14, density: 1300, refDist: 13, flowerSize: [0.02, 0.04], grassDensity: 4, mounds: [[3.6, 0.5, 4, 0.4], [-4.3, 0.4, 3.5, 0.35], [-6, -5, 6, 0.6], [8, -7, 6, 0.6]], hillAmp: 0.6, bushDensity: 0.45, bushR: [0.6, 1.7], bushH: [0.4, 0.7], grassMinDist: 7 });
    const av = makeAvatar({ wave: 1 });
    av.scale.setScalar(0.5);
    sink(field, av, 3.9, 0.6, 0.95);
    av.rotation.set(0, -0.4, 0.04);
    scene.add(av);
    addLights(scene, { sun: [-8, 7, 4], target: [0, 0, 0], shadowBox: 10, hemiK: 0.45 });
    return { scene, camera, dof: { focus: 13.2, aperture: 0.0016, maxblur: 0.006 } };
  },
};

