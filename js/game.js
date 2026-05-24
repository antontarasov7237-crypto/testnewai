// Главный цикл игры: сцена, рендер, обновление сущностей, столкновения пуль
import * as THREE from 'three';
import { Player, PlayerConfig } from './player.js';
import { WeaponSystem } from './weapons.js';
import { Bot } from './enemies.js';
import { createMap } from './models.js';
import * as Storage from './storage.js';
import * as UI from './ui.js';

const ROUND_TIME = 180; // 3 минуты раунд

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x87ceeb);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 120);

    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 500);
    this.scene.add(this.camera);

    this._addLights();

    this.map = createMap();
    this.scene.add(this.map);
    this.obstacles = this.map.userData.obstacles;

    this.player = new Player(this.camera, this.obstacles);

    const state = Storage.load();
    this.weapons = new WeaponSystem(
      this.scene,
      this.camera,
      (weapon) => Storage.load().equipped[weapon],
      state.ownedWeapons,
    );

    this.bots = [];
    this.bullets = []; // визуальные трассеры пуль
    this.botShots = []; // отложенные выстрелы ботов (для урона по игроку)

    this.running = false;
    this.paused = false;
    this.score = 0;
    this.kills = 0;
    this.startCoins = state.coins;
    this.timeLeft = ROUND_TIME;
    this.nextWaveTimer = 0;
    this.wave = 0;
    this.lastTime = performance.now();

    this._tmpVec = new THREE.Vector3();
    this._raycaster = new THREE.Raycaster();

    this._bindEvents();
    this._onResize();
  }

  _addLights() {
    const hemi = new THREE.HemisphereLight(0xb1d8ff, 0x668844, 0.55);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(40, 60, 20);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    const d = 60;
    dir.shadow.camera.left = -d; dir.shadow.camera.right = d;
    dir.shadow.camera.top = d; dir.shadow.camera.bottom = -d;
    dir.shadow.camera.near = 1; dir.shadow.camera.far = 200;
    this.scene.add(dir);
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._onResize());

    document.addEventListener('keydown', (e) => {
      if (!this.running) return;
      if (e.code === 'Escape') { this.togglePause(); return; }
      this.player.keys.add(e.code);
      if (e.code === 'KeyR') this.weapons.startReload();
      if (e.code === 'Digit1') this._switchWeapon('pistol');
      if (e.code === 'Digit2') this._switchWeapon('smg');
      if (e.code === 'Digit3') this._switchWeapon('rifle');
    });
    document.addEventListener('keyup', (e) => {
      this.player.keys.delete(e.code);
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.running || this.paused) return;
      if (document.pointerLockElement !== this.canvas) return;
      if (e.button === 0) this.weapons.startFire();
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.weapons.stopFire();
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.running || this.paused) return;
      if (document.pointerLockElement !== this.canvas) return;
      this.player.onMouseMove(e.movementX || 0, e.movementY || 0);
    });

    this.canvas.addEventListener('click', () => {
      if (this.running && !this.paused && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      if (this.running && !this.paused && document.pointerLockElement !== this.canvas) {
        // Пользователь вышел из захвата — ставим на паузу
        if (this.player.alive) this.togglePause(true);
      }
    });
  }

  _switchWeapon(id) {
    if (this.weapons.setWeapon(id)) {
      UI.notify('Оружие: ' + (id[0].toUpperCase() + id.slice(1)));
    }
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    this._clearBots();
    this._clearBullets();
    this.player.reset();
    this.weapons.refreshOwned(Storage.load().ownedWeapons);
    this.weapons.reset();
    this.score = 0;
    this.kills = 0;
    this.startCoins = Storage.get('coins');
    this.timeLeft = ROUND_TIME;
    this.wave = 0;
    this.nextWaveTimer = 0;
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    UI.showScreen('hud');
    this.canvas.requestPointerLock();
    this._loop();
  }

  togglePause(force) {
    if (!this.running) return;
    if (force === true) this.paused = true;
    else this.paused = !this.paused;
    if (this.paused) {
      document.exitPointerLock?.();
      document.getElementById('pause').classList.remove('hidden');
    } else {
      document.getElementById('pause').classList.add('hidden');
      this.canvas.requestPointerLock();
      this.lastTime = performance.now();
    }
  }

  resume() {
    if (this.paused) this.togglePause();
  }

  quit() {
    this.running = false;
    this.paused = false;
    document.exitPointerLock?.();
    document.getElementById('pause').classList.add('hidden');
    this._clearBots();
    this._clearBullets();
    UI.showScreen('#menu');
    UI.refreshMenuStats();
  }

  _clearBots() {
    this.bots.forEach(b => b.destroy());
    this.bots = [];
  }
  _clearBullets() {
    this.bullets.forEach(b => this.scene.remove(b.mesh));
    this.bullets = [];
  }

  _spawnWave() {
    this.wave++;
    const count = Math.min(2 + this.wave, 7);
    for (let i = 0; i < count; i++) this._spawnBot();
    UI.notify(`Волна ${this.wave}: ${count} врагов`);
  }

  _spawnBot() {
    // На безопасном расстоянии от игрока, не внутри препятствия
    for (let attempt = 0; attempt < 30; attempt++) {
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 18;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const pos = new THREE.Vector3(x, 0, z);
      if (this._isPositionClear(pos)) {
        const bot = new Bot(this.scene, pos, this.obstacles, this.wave);
        this.bots.push(bot);
        return;
      }
    }
  }

  _isPositionClear(pos) {
    for (const o of this.obstacles) {
      if (pos.x > o.min.x - 0.6 && pos.x < o.max.x + 0.6 &&
          pos.z > o.min.z - 0.6 && pos.z < o.max.z + 0.6) return false;
    }
    return true;
  }

  _loop() {
    if (!this.running) return;
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05; // защита от больших скачков

    if (!this.paused) this._update(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this._loop());
  }

  _update(dt) {
    if (!this.player.alive) {
      // Игрок мёртв — короткое ожидание перед экраном финиша
      this.deathTimer = (this.deathTimer || 0) + dt;
      this.player.update(dt);
      if (this.deathTimer > 2.2) {
        this._endRound();
        this.deathTimer = 0;
      }
      return;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this._endRound();
      return;
    }

    // Спавн волн
    this.nextWaveTimer -= dt;
    const aliveBots = this.bots.filter(b => b.alive).length;
    if (aliveBots === 0 && this.nextWaveTimer <= 0) {
      this._spawnWave();
      this.nextWaveTimer = 4;
    } else if (aliveBots < 3 && this.nextWaveTimer <= 0 && this.wave > 0) {
      // Подсыпем
      this._spawnBot();
      this.nextWaveTimer = 5;
    }

    // Игрок и оружие
    this.player.update(dt);
    const shots = this.weapons.update(dt, this.player.alive);
    for (const shot of shots) this._processPlayerShot(shot);

    // Боты
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      bot.update(dt, this.player, (b, dir, dmg) => this._botShoot(b, dir, dmg));
    }

    // Чистим мёртвых ботов через короткий тайм-аут
    for (const bot of this.bots) {
      if (!bot.alive) {
        bot.deathTimer = (bot.deathTimer || 0) + dt;
        if (bot.deathTimer > 3 && !bot._removed) {
          bot._removed = true;
          bot.destroy();
        }
      }
    }
    this.bots = this.bots.filter(b => !b._removed);

    // Трассеры пуль
    for (const b of this.bullets) {
      b.life -= dt;
      b.mesh.position.addScaledVector(b.dir, b.speed * dt);
      b.mesh.material.opacity = Math.max(0, b.life / b.maxLife);
    }
    this.bullets = this.bullets.filter(b => {
      if (b.life <= 0) { this.scene.remove(b.mesh); return false; }
      return true;
    });

    // HUD
    UI.updateHUD(this.player, this.weapons, this.score, Storage.get('coins'));
  }

  _processPlayerShot(shot) {
    // Рейкастим: ближайшее попадание — бот, иначе препятствие/мир
    this._raycaster.set(shot.origin, shot.direction);
    this._raycaster.far = shot.range;

    // Кандидаты
    const botMeshes = [];
    const botToMesh = new Map();
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      bot.model.traverse(c => {
        if (c.isMesh && c.geometry?.type === 'BoxGeometry') {
          botMeshes.push(c);
          botToMesh.set(c, bot);
        }
      });
    }
    const hitsB = this._raycaster.intersectObjects(botMeshes, false);

    // Препятствия (включая стены и землю)
    const obstacleMeshes = this.obstacles.map(o => o.mesh).filter(m => !!m);
    const floor = this.map.getObjectByName('floor');
    if (floor) obstacleMeshes.push(floor);
    const hitsO = this._raycaster.intersectObjects(obstacleMeshes, false);

    const firstBot = hitsB[0];
    const firstObs = hitsO[0];
    const useBot = firstBot && (!firstObs || firstBot.distance < firstObs.distance);

    let endPoint;
    if (useBot) {
      const bot = botToMesh.get(firstBot.object);
      // Хедшот?
      const isHead = firstBot.object.name === 'head' ||
                     firstBot.object === bot.model.userData.parts.head;
      const dmg = shot.damage * (isHead ? 2.0 : 1.0);
      const killed = bot.takeHit(dmg);
      UI.showHitMarker();
      if (killed) {
        this.kills++;
        this.score += bot.scoreReward + (isHead ? 50 : 0);
        Storage.addCoins(bot.coinReward);
        UI.killFeed(`Убит ${bot.name}${isHead ? ' 🎯 хедшот' : ''}  +${bot.coinReward}💰`);
      }
      endPoint = firstBot.point;
    } else if (firstObs) {
      endPoint = firstObs.point;
    } else {
      endPoint = shot.origin.clone().addScaledVector(shot.direction, shot.range);
    }

    this._spawnTracer(shot.origin, endPoint);
  }

  _botShoot(bot, dir, damage) {
    // Лучом проверяем, не перекрыта ли видимость препятствием
    const origin = bot.position.clone(); origin.y = 1.5;
    this._raycaster.set(origin, dir.clone().normalize());
    this._raycaster.far = 60;
    const obstacleMeshes = this.obstacles.map(o => o.mesh).filter(m => !!m);
    const hitsO = this._raycaster.intersectObjects(obstacleMeshes, false);
    const toPlayer = this.player.position.clone().sub(origin);
    const playerDist = toPlayer.length();
    let endPoint;
    let hitsPlayer = false;
    if (hitsO.length > 0 && hitsO[0].distance < playerDist - 0.5) {
      endPoint = hitsO[0].point;
    } else {
      // Проверяем близость линии огня к игроку (как цилиндр r=0.5)
      const projected = origin.clone().addScaledVector(dir, playerDist);
      const miss = projected.distanceTo(this.player.position);
      if (miss < 0.65 || Math.random() < 0.18) {
        hitsPlayer = true;
        endPoint = this.player.position.clone();
        this.player.takeDamage(damage);
        UI.flashDamage();
      } else {
        endPoint = origin.clone().addScaledVector(dir, 50);
      }
    }
    this._spawnTracer(origin, endPoint, 0xff6644);
    if (hitsPlayer && !this.player.alive) {
      UI.killFeed(`Вы убиты ботом ${bot.name}`);
    }
  }

  _spawnTracer(from, to, color = 0xfff2a8) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len < 0.1) return;
    dir.normalize();
    const geo = new THREE.CylinderGeometry(0.025, 0.025, len, 6, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    // Цилиндр по умолчанию вдоль Y, повернём вдоль dir
    mesh.position.copy(from).addScaledVector(dir, len/2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
    this.scene.add(mesh);
    this.bullets.push({ mesh, dir, speed: 60, life: 0.18, maxLife: 0.18 });
  }

  _endRound() {
    this.running = false;
    document.exitPointerLock?.();
    const earnedCoins = Storage.get('coins') - this.startCoins;
    Storage.setBest(this.score);
    document.getElementById('result-kills').textContent  = this.kills;
    document.getElementById('result-score').textContent  = this.score;
    document.getElementById('result-coins').textContent  = Math.max(0, earnedCoins);
    UI.showScreen('#gameover');
    UI.refreshMenuStats();
  }
}
