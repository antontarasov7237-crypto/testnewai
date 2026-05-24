import * as THREE from 'three';

const GRAVITY = 24;
const JUMP_VEL = 8.2;
const PLAYER_RADIUS = 0.4;
const PLAYER_HEIGHT = 1.7;
const EYE_HEIGHT = 1.6;
const MOVE_SPEED = 6.0;
const RUN_MULT = 1.55;

export class Player {
  constructor(camera, mapObstacles) {
    this.camera = camera;
    this.obstacles = mapObstacles;

    this.position = new THREE.Vector3(0, EYE_HEIGHT, 0);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;

    this.hp = 100;
    this.maxHp = 100;
    this.armor = 0;
    this.maxArmor = 100;
    this.alive = true;

    this.keys = new Set();
    this.mouseSens = 0.0025;

    this._tmp = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.velocity.set(0,0,0);
  }

  reset() {
    this.hp = this.maxHp;
    this.armor = 0;
    this.alive = true;
    this.setPosition(0, EYE_HEIGHT, 0);
    this.yaw = 0; this.pitch = 0;
  }

  onMouseMove(dx, dy) {
    if (!this.alive) return;
    this.yaw -= dx * this.mouseSens;
    this.pitch -= dy * this.mouseSens;
    const limit = Math.PI/2 - 0.05;
    if (this.pitch > limit) this.pitch = limit;
    if (this.pitch < -limit) this.pitch = -limit;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.6);
      this.armor -= absorbed;
      amount -= absorbed;
    }
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  update(dt) {
    if (!this.alive) {
      // Камера остаётся на месте, но небольшая просадка
      this.camera.position.copy(this.position);
      this.camera.position.y -= 0.5;
      this._applyCamRotation();
      return;
    }

    // Направление движения
    this._forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).negate();
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    let mx = 0, mz = 0;
    if (this.keys.has('KeyW')) mz += 1;
    if (this.keys.has('KeyS')) mz -= 1;
    if (this.keys.has('KeyA')) mx -= 1;
    if (this.keys.has('KeyD')) mx += 1;

    const moving = (mx !== 0 || mz !== 0);
    let speed = MOVE_SPEED;
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) speed *= RUN_MULT;

    if (moving) {
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      const wishX = this._forward.x * mz + this._right.x * mx;
      const wishZ = this._forward.z * mz + this._right.z * mx;
      // Сглаженный разгон
      const accel = this.onGround ? 60 : 12;
      this.velocity.x += wishX * speed * accel * dt;
      this.velocity.z += wishZ * speed * accel * dt;
      // Ограничение горизонтальной скорости
      const horiz = Math.hypot(this.velocity.x, this.velocity.z);
      if (horiz > speed) {
        this.velocity.x *= speed / horiz;
        this.velocity.z *= speed / horiz;
      }
    } else if (this.onGround) {
      // Трение
      const dec = 14;
      const horiz = Math.hypot(this.velocity.x, this.velocity.z);
      const drop = Math.max(0, horiz - dec * dt);
      const factor = horiz > 0 ? drop / horiz : 0;
      this.velocity.x *= factor;
      this.velocity.z *= factor;
    }

    // Прыжок
    if ((this.keys.has('Space')) && this.onGround) {
      this.velocity.y = JUMP_VEL;
      this.onGround = false;
    }

    // Гравитация
    this.velocity.y -= GRAVITY * dt;

    // Перемещение по осям с проверкой коллизий (AABB vs cylinder approx)
    this._moveAxis('x', this.velocity.x * dt);
    this._moveAxis('z', this.velocity.z * dt);
    this._moveAxis('y', this.velocity.y * dt);

    // Пол
    if (this.position.y <= EYE_HEIGHT) {
      this.position.y = EYE_HEIGHT;
      this.velocity.y = 0;
      this.onGround = true;
    }

    this.camera.position.copy(this.position);
    this._applyCamRotation();
  }

  _applyCamRotation() {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  _moveAxis(axis, delta) {
    if (delta === 0) return;
    const next = this.position.clone();
    next[axis] += delta;

    // Проверка границ карты (стены уже добавлены как obstacles)
    for (const o of this.obstacles) {
      // Расширяем AABB на радиус игрока
      const minX = o.min.x - PLAYER_RADIUS;
      const maxX = o.max.x + PLAYER_RADIUS;
      const minZ = o.min.z - PLAYER_RADIUS;
      const maxZ = o.max.z + PLAYER_RADIUS;
      const minY = o.min.y;
      const maxY = o.max.y;
      const feetY = next.y - EYE_HEIGHT;
      const headY = next.y;
      if (next.x > minX && next.x < maxX &&
          next.z > minZ && next.z < maxZ &&
          headY > minY && feetY < maxY) {
        // Столкновение
        if (axis === 'y') {
          if (delta < 0) {
            // Стоим на крыше препятствия
            next.y = maxY + EYE_HEIGHT;
            this.velocity.y = 0;
            this.onGround = true;
          } else {
            next.y = minY - 0.01 + EYE_HEIGHT;
            this.velocity.y = 0;
          }
          this.position.copy(next);
          return;
        } else {
          this.velocity[axis] = 0;
          return;
        }
      }
    }
    this.position.copy(next);
    if (axis === 'y' && delta < 0) {
      // не на земле, пока не столкнулись
    }
  }

  getViewDirection() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }
}

export const PlayerConfig = { PLAYER_RADIUS, PLAYER_HEIGHT, EYE_HEIGHT };
