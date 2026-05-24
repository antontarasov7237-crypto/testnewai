// Боты: патрулирование, преследование, стрельба
import * as THREE from 'three';
import { createCharacterModel } from './models.js';

const BOT_PALETTE = [
  { body: 0xc94f4f, head: 0xffd1a8, name: 'Red' },
  { body: 0x4f8fc9, head: 0xffd1a8, name: 'Blue' },
  { body: 0x4fc97a, head: 0xffd1a8, name: 'Green' },
  { body: 0xc9a44f, head: 0xffd1a8, name: 'Sand' },
  { body: 0x9c4fc9, head: 0xffd1a8, name: 'Purple' },
  { body: 0xc94fa4, head: 0xffd1a8, name: 'Pink' },
];

export class Bot {
  constructor(scene, position, obstacles, level = 1) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.level = level;
    this.palette = BOT_PALETTE[Math.floor(Math.random() * BOT_PALETTE.length)];
    this.name = this.palette.name + '-' + Math.floor(Math.random()*99);

    this.model = createCharacterModel({ color: this.palette.body, headColor: this.palette.head });
    this.model.position.copy(position);
    this.model.userData.bot = this;
    scene.add(this.model);

    this.position = this.model.position;
    this.velocity = new THREE.Vector3();
    this.hp = 60 + level * 10;
    this.maxHp = this.hp;
    this.alive = true;

    this.fireCooldown = 1.0 + Math.random();
    this.shotInterval = Math.max(0.45, 1.3 - level * 0.08);
    this.shotDamage = 7 + Math.min(level, 6) * 1.2;
    this.sightRange = 32;
    this.attackRange = 28;
    this.speed = 2.8 + Math.random() * 0.9;

    this.state = 'wander';
    this.wanderTarget = this._pickWander();
    this.wanderTimer = 2 + Math.random()*2;

    // Награда
    this.coinReward = 12 + Math.floor(Math.random()*8) + level * 2;
    this.scoreReward = 100 + level * 25;

    // Прицеливание (плавно поворачивается)
    this.facing = Math.random() * Math.PI * 2;

    // Лёгкая анимация ног
    this.animT = Math.random() * 10;
  }

  _pickWander() {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 60,
      0,
      (Math.random() - 0.5) * 60
    );
  }

  takeHit(damage) {
    if (!this.alive) return false;
    this.hp -= damage;
    // Подсветка получения урона
    this.model.userData.parts.torso.material.emissive = new THREE.Color(0xaa0000);
    this.model.userData.parts.torso.material.emissiveIntensity = 0.7;
    setTimeout(() => {
      if (this.model.userData.parts.torso.material) {
        this.model.userData.parts.torso.material.emissiveIntensity = 0;
      }
    }, 90);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.alive = false;
    // Падение модели
    this.model.rotation.z = Math.PI / 2;
    this.model.position.y = 0.4;
    // Подсветка
    this.model.userData.parts.torso.material.color = new THREE.Color(0x444444);
  }

  destroy() {
    this.scene.remove(this.model);
    this.model.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  // Проверка линии видимости к точке
  hasLineOfSight(targetPos) {
    const origin = this.position.clone();
    origin.y = 1.5;
    const dir = targetPos.clone().sub(origin);
    const dist = dir.length();
    dir.normalize();
    // Простая проверка: шагами 0.5м, не пересекает ли AABB препятствие
    const steps = Math.ceil(dist / 0.5);
    const p = new THREE.Vector3();
    for (let i = 1; i < steps; i++) {
      p.copy(origin).addScaledVector(dir, i * 0.5);
      for (const o of this.obstacles) {
        if (p.x > o.min.x && p.x < o.max.x &&
            p.y > o.min.y && p.y < o.max.y &&
            p.z > o.min.z && p.z < o.max.z) return false;
      }
    }
    return true;
  }

  update(dt, player, onShoot) {
    if (!this.alive) return;

    const playerPos = player.position;
    const toPlayer = playerPos.clone().sub(this.position);
    toPlayer.y = 0;
    const distToPlayer = toPlayer.length();

    // Линия видимости
    const canSee = distToPlayer < this.sightRange && this.hasLineOfSight(playerPos);

    if (canSee) {
      this.state = 'attack';
    } else if (this.state === 'attack') {
      this.state = 'wander';
    }

    let desired = new THREE.Vector3();
    if (this.state === 'attack') {
      // Держим дистанцию ~10-18м
      const ideal = 14;
      if (distToPlayer > ideal + 4) {
        desired.copy(toPlayer).normalize();
      } else if (distToPlayer < ideal - 4) {
        desired.copy(toPlayer).normalize().negate();
      } else {
        // Стрейф
        const perp = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
        desired.copy(perp).multiplyScalar(Math.sin(this.animT * 0.5) > 0 ? 1 : -1);
      }
      // Прицеливание на игрока
      const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
      const dYaw = wrapAngle(targetYaw - this.facing);
      this.facing += Math.sign(dYaw) * Math.min(Math.abs(dYaw), dt * 4.5);

      // Стрельба
      this.fireCooldown -= dt;
      if (this.fireCooldown <= 0 && distToPlayer < this.attackRange) {
        this.fireCooldown = this.shotInterval + (Math.random() - 0.5) * 0.3;
        const aim = new THREE.Vector3(
          playerPos.x + (Math.random()-0.5) * 1.2,
          playerPos.y + (Math.random()-0.5) * 0.6,
          playerPos.z + (Math.random()-0.5) * 1.2
        );
        const dir = aim.sub(this.position.clone().setY(1.5)).normalize();
        onShoot && onShoot(this, dir, this.shotDamage);
      }
    } else {
      // Бродим
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0 || this.position.distanceTo(this.wanderTarget) < 1.5) {
        this.wanderTarget = this._pickWander();
        this.wanderTimer = 3 + Math.random() * 3;
      }
      desired.copy(this.wanderTarget).sub(this.position);
      desired.y = 0;
      if (desired.length() > 0.001) desired.normalize();
      const targetYaw = Math.atan2(desired.x, desired.z);
      const dYaw = wrapAngle(targetYaw - this.facing);
      this.facing += Math.sign(dYaw) * Math.min(Math.abs(dYaw), dt * 3);
    }

    // Движение с коллизиями
    this.velocity.copy(desired).multiplyScalar(this.speed);
    this._moveWithCollisions(dt);

    // Применяем поворот к модели
    this.model.rotation.y = this.facing + Math.PI;

    // Анимация ног (имитация шага)
    this.animT += dt * Math.min(this.velocity.length(), 6);
    const parts = this.model.userData.parts;
    if (parts) {
      const a = Math.sin(this.animT * 3) * 0.5;
      parts.legL.rotation.x = a;
      parts.legR.rotation.x = -a;
      parts.armL.rotation.x = -a * 0.6;
      parts.armR.rotation.x = a * 0.6;
    }
  }

  _moveWithCollisions(dt) {
    const R = 0.45;
    const tryMove = (axis) => {
      const delta = this.velocity[axis] * dt;
      if (delta === 0) return;
      const next = this.position.clone();
      next[axis] += delta;
      for (const o of this.obstacles) {
        if (next.x + R > o.min.x && next.x - R < o.max.x &&
            next.z + R > o.min.z && next.z - R < o.max.z &&
            next.y + 1.0 > o.min.y && next.y < o.max.y) {
          this.velocity[axis] = 0;
          return;
        }
      }
      // Границы карты (запас 1.5)
      if (axis === 'x' && Math.abs(next.x) > 38) { this.velocity.x *= -1; return; }
      if (axis === 'z' && Math.abs(next.z) > 38) { this.velocity.z *= -1; return; }
      this.position[axis] = next[axis];
    };
    tryMove('x');
    tryMove('z');
  }
}

function wrapAngle(a) {
  while (a > Math.PI) a -= 2*Math.PI;
  while (a < -Math.PI) a += 2*Math.PI;
  return a;
}
