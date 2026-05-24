// Управление оружием игрока: модель в руках, стрельба, перезарядка
import * as THREE from 'three';
import { WEAPONS, getSkin } from './data.js';
import { createWeaponModel } from './models.js';

export class WeaponSystem {
  constructor(scene, camera, getEquippedSkin, ownedWeapons) {
    this.scene = scene;
    this.camera = camera;
    this.getEquippedSkin = getEquippedSkin;
    this.ownedWeapons = ownedWeapons;

    // Контейнер, прикреплённый к камере
    this.handGroup = new THREE.Group();
    camera.add(this.handGroup);
    this.handGroup.position.set(0.32, -0.28, -0.55);

    this.currentWeaponId = ownedWeapons[0] || 'pistol';
    this.weaponModel = null;
    this.ammo = {}; // { weaponId: { mag, reserve } }
    for (const id of ownedWeapons) {
      const w = WEAPONS[id];
      this.ammo[id] = { mag: w.magazine, reserve: w.reserve };
    }

    this.cooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.firing = false;

    // Состояние "отдачи" / покачивания
    this.recoilT = 0;
    this.swayT = 0;
    this.muzzleFlash = null;

    this._tmp = new THREE.Vector3();
    this._tmpQ = new THREE.Quaternion();

    this.setWeapon(this.currentWeaponId);
  }

  refreshOwned(ownedWeapons) {
    this.ownedWeapons = ownedWeapons;
    for (const id of ownedWeapons) {
      if (!this.ammo[id]) {
        const w = WEAPONS[id];
        this.ammo[id] = { mag: w.magazine, reserve: w.reserve };
      }
    }
  }

  reset() {
    // Пополняем боезапас при респавне
    for (const id of this.ownedWeapons) {
      const w = WEAPONS[id];
      this.ammo[id] = { mag: w.magazine, reserve: w.reserve };
    }
    this.reloading = false;
    this.reloadTimer = 0;
    this.cooldown = 0;
    this.setWeapon(this.ownedWeapons[0] || 'pistol');
  }

  setWeapon(weaponId) {
    if (!this.ownedWeapons.includes(weaponId)) return false;
    this.currentWeaponId = weaponId;
    this.reloading = false;
    this.reloadTimer = 0;
    this.cooldown = 0;

    // Удаляем старую модель
    if (this.weaponModel) {
      this.handGroup.remove(this.weaponModel);
      this.weaponModel.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      this.weaponModel = null;
    }
    const skinId = this.getEquippedSkin(weaponId);
    const skin = getSkin(weaponId, skinId);
    this.weaponModel = createWeaponModel(weaponId, skin);
    this.handGroup.add(this.weaponModel);

    // Точка для огонька выстрела
    const muz = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0 })
    );
    const mo = this.weaponModel.userData.muzzleOffset || new THREE.Vector3(0,0,-0.5);
    muz.position.copy(mo);
    this.weaponModel.add(muz);
    this.muzzleFlash = muz;
    return true;
  }

  getCurrent() { return WEAPONS[this.currentWeaponId]; }
  getAmmo()    { return this.ammo[this.currentWeaponId]; }

  startFire() { this.firing = true; }
  stopFire()  { this.firing = false; }

  startReload() {
    const w = this.getCurrent();
    const a = this.getAmmo();
    if (this.reloading) return;
    if (a.mag >= w.magazine) return;
    if (a.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = w.reloadTime;
  }

  // Возвращает массив выпущенных "выстрелов" в этом кадре (для рейкастинга в game.js)
  update(dt, isAlive) {
    if (!isAlive) {
      this.firing = false;
    }

    // Покачивание / прицеливание
    this.swayT += dt;
    const baseX = 0.32, baseY = -0.28, baseZ = -0.55;
    const swayX = Math.sin(this.swayT * 4) * 0.005;
    const swayY = Math.cos(this.swayT * 8) * 0.005;
    this.handGroup.position.x = baseX + swayX;
    this.handGroup.position.y = baseY + swayY;
    this.handGroup.position.z = baseZ;

    // Отдача — отъезжаем назад и возвращаемся
    if (this.recoilT > 0) this.recoilT = Math.max(0, this.recoilT - dt * 6);
    this.handGroup.position.z += this.recoilT * 0.18;
    this.handGroup.rotation.x = -this.recoilT * 0.15;

    // Огонёк
    if (this.muzzleFlash) {
      this.muzzleFlash.material.opacity = Math.max(0, this.muzzleFlash.material.opacity - dt * 8);
      this.muzzleFlash.scale.setScalar(0.5 + this.muzzleFlash.material.opacity * 2);
    }

    if (this.cooldown > 0) this.cooldown -= dt;

    if (this.reloading) {
      this.reloadTimer -= dt;
      // Анимация качания при перезарядке
      this.handGroup.position.y += Math.sin((1 - this.reloadTimer / this.getCurrent().reloadTime) * Math.PI) * -0.1;
      if (this.reloadTimer <= 0) {
        const w = this.getCurrent();
        const a = this.getAmmo();
        const need = w.magazine - a.mag;
        const take = Math.min(need, a.reserve);
        a.mag += take;
        a.reserve -= take;
        this.reloading = false;
      }
      return [];
    }

    // Стрельба
    const shots = [];
    const w = this.getCurrent();
    if (this.firing && isAlive && this.cooldown <= 0) {
      const a = this.getAmmo();
      if (a.mag <= 0) {
        // Авто-перезарядка
        this.startReload();
      } else {
        a.mag -= 1;
        this.cooldown = w.fireRate;
        this.recoilT = Math.min(1, this.recoilT + 0.5);
        if (this.muzzleFlash) this.muzzleFlash.material.opacity = 1;

        // Направление с разбросом
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize();
        const up = new THREE.Vector3().crossVectors(right, dir).normalize();
        const spread = w.spread;
        dir.addScaledVector(right, (Math.random() - 0.5) * spread);
        dir.addScaledVector(up,    (Math.random() - 0.5) * spread);
        dir.normalize();

        const origin = new THREE.Vector3();
        this.camera.getWorldPosition(origin);
        shots.push({
          origin, direction: dir,
          damage: w.damage,
          range: w.range,
          weaponId: this.currentWeaponId,
        });

        // Авто-режим
        if (!w.auto) this.firing = false;
      }
    }
    return shots;
  }
}
