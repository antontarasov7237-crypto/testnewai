// Процедурно сгенерированные low-poly модели (Three.js)
import * as THREE from 'three';

// ---------------- Игрок / враг ----------------

export function createCharacterModel({ color = 0xff6b35, headColor = 0xffe0bd } = {}) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const headMat = new THREE.MeshLambertMaterial({ color: headColor });
  const limbMat = new THREE.MeshLambertMaterial({ color: color * 0.75 | 0 });

  // Туловище
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), bodyMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);

  // Голова
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), headMat);
  head.position.y = 1.78;
  head.castShadow = true;
  head.name = 'head';
  group.add(head);

  // Глаза
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.07,0.07,0.04), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.1, 1.82, 0.23);
  eyeR.position.set( 0.1, 1.82, 0.23);
  group.add(eyeL, eyeR);

  // Руки
  const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
  const armL = new THREE.Mesh(armGeo, limbMat);
  const armR = new THREE.Mesh(armGeo, limbMat);
  armL.position.set(-0.4, 1.05, 0);
  armR.position.set( 0.4, 1.05, 0);
  armL.castShadow = armR.castShadow = true;
  group.add(armL, armR);

  // Ноги
  const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.25);
  const legL = new THREE.Mesh(legGeo, limbMat);
  const legR = new THREE.Mesh(legGeo, limbMat);
  legL.position.set(-0.15, 0.4, 0);
  legR.position.set( 0.15, 0.4, 0);
  legL.castShadow = legR.castShadow = true;
  group.add(legL, legR);

  group.userData.parts = { torso, head, armL, armR, legL, legR };
  return group;
}

// ---------------- Оружие ----------------

export function createWeaponModel(weaponId, skin) {
  const color = skin.color ?? 0x2a2f38;
  const params = { color };
  if (skin.emissive !== undefined) {
    params.emissive = skin.emissive;
    params.emissiveIntensity = 0.6;
  }
  const mat = new THREE.MeshStandardMaterial({
    ...params,
    metalness: skin.metalness ?? 0.4,
    roughness: 0.45,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a20, metalness: 0.6, roughness: 0.5,
  });

  const group = new THREE.Group();

  if (weaponId === 'pistol') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.32), mat);
    body.position.set(0, 0, -0.1);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.18), mat);
    barrel.position.set(0, 0.04, -0.32);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.12), darkMat);
    grip.position.set(0, -0.16, -0.04);
    grip.rotation.x = 0.18;
    group.add(body, barrel, grip);
    group.userData.muzzleOffset = new THREE.Vector3(0, 0.04, -0.46);
  }
  else if (weaponId === 'smg') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.55), mat);
    body.position.set(0, 0, -0.15);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.22), mat);
    barrel.position.set(0, 0.02, -0.5);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.12), darkMat);
    grip.position.set(0, -0.18, 0.0);
    const mag  = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.1), darkMat);
    mag.position.set(0, -0.18, -0.18);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.18), darkMat);
    stock.position.set(0, 0, 0.18);
    group.add(body, barrel, grip, mag, stock);
    group.userData.muzzleOffset = new THREE.Vector3(0, 0.02, -0.68);
  }
  else if (weaponId === 'rifle') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, 0.85), mat);
    body.position.set(0, 0, -0.25);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.35), mat);
    barrel.position.set(0, 0.02, -0.78);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.12), darkMat);
    grip.position.set(0, -0.18, -0.05);
    const mag  = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.12), darkMat);
    mag.position.set(0, -0.22, -0.25);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.3), darkMat);
    stock.position.set(0, -0.02, 0.28);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.18, 8), darkMat);
    scope.rotation.x = Math.PI/2;
    scope.position.set(0, 0.13, -0.2);
    group.add(body, barrel, grip, mag, stock, scope);
    group.userData.muzzleOffset = new THREE.Vector3(0, 0.02, -1.0);
  }

  return group;
}

// ---------------- Окружение ----------------

export function createMap() {
  const group = new THREE.Group();
  const SIZE = 80;

  // Пол
  const floorGeo = new THREE.PlaneGeometry(SIZE, SIZE, 16, 16);
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x5e7a4e });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  group.add(floor);

  // Сетка-разметка пола
  const grid = new THREE.GridHelper(SIZE, 32, 0x3a4a30, 0x3a4a30);
  grid.position.y = 0.02;
  group.add(grid);

  // Внешние стены
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8a8a92 });
  const wallH = 5;
  const wallT = 1;
  const walls = [
    { x: 0, z: -SIZE/2, w: SIZE, d: wallT },
    { x: 0, z:  SIZE/2, w: SIZE, d: wallT },
    { x: -SIZE/2, z: 0, w: wallT, d: SIZE },
    { x:  SIZE/2, z: 0, w: wallT, d: SIZE },
  ];
  const obstacles = [];
  walls.forEach(w => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w.w, wallH, w.d), wallMat);
    m.position.set(w.x, wallH/2, w.z);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.isObstacle = true;
    group.add(m);
    obstacles.push({
      min: new THREE.Vector3(m.position.x - w.w/2, 0, m.position.z - w.d/2),
      max: new THREE.Vector3(m.position.x + w.w/2, wallH, m.position.z + w.d/2),
      mesh: m,
    });
  });

  // Внутренние укрытия (детерминированные, чтобы карта одинаковая)
  const rng = mulberry32(20251201);
  const palette = [0xb55a3a, 0x4a6b8a, 0x8a7250, 0x6d5a8a, 0x4a8a5a];
  const N = 26;
  for (let i = 0; i < N; i++) {
    const w = 1.5 + rng() * 4;
    const d = 1.5 + rng() * 4;
    const h = 1.2 + rng() * 3.4;
    const x = (rng() - 0.5) * (SIZE - 8);
    const z = (rng() - 0.5) * (SIZE - 8);
    // Не ставить слишком близко к центру (зоне спавна)
    if (Math.hypot(x, z) < 5) continue;
    const color = palette[Math.floor(rng()*palette.length)];
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color })
    );
    m.position.set(x, h/2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.isObstacle = true;
    group.add(m);
    obstacles.push({
      min: new THREE.Vector3(x - w/2, 0, z - d/2),
      max: new THREE.Vector3(x + w/2, h, z + d/2),
      mesh: m,
    });
  }

  // Несколько "деревьев" для вайба
  for (let i = 0; i < 14; i++) {
    const x = (rng() - 0.5) * (SIZE - 6);
    const z = (rng() - 0.5) * (SIZE - 6);
    if (Math.hypot(x, z) < 5) continue;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 1.6, 6),
      new THREE.MeshLambertMaterial({ color: 0x6b4a2a })
    );
    trunk.position.set(x, 0.8, z);
    trunk.castShadow = true;
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 2.4, 7),
      new THREE.MeshLambertMaterial({ color: 0x2e7a3a })
    );
    leaves.position.set(x, 2.4, z);
    leaves.castShadow = true;
    group.add(trunk, leaves);
    obstacles.push({
      min: new THREE.Vector3(x - 0.35, 0, z - 0.35),
      max: new THREE.Vector3(x + 0.35, 1.6, z + 0.35),
      mesh: trunk,
    });
  }

  group.userData.size = SIZE;
  group.userData.obstacles = obstacles;
  return group;
}

// Простой детерминированный PRNG
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
