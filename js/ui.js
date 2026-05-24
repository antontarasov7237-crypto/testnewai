// UI: магазин, кейсы (рулетка), инвентарь, HUD, переходы экранов
import * as Storage from './storage.js';
import { WEAPONS, SKINS, CASES, WEAPON_PRICES, RARITY_INFO, RARITY_ORDER, getSkin } from './data.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let notifyTimer = null;
export function notify(msg) {
  const n = $('#notification');
  n.textContent = msg;
  n.classList.add('show');
  if (notifyTimer) clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => n.classList.remove('show'), 2200);
}

// ---------- HUD ----------
export function updateHUD(player, weapons, score, coins) {
  const hp = Math.max(0, player.hp);
  $('#health-fill').style.width = (hp / player.maxHp * 100) + '%';
  $('#health-text').textContent = Math.floor(hp);
  $('#armor-fill').style.width  = (player.armor / player.maxArmor * 100) + '%';
  $('#armor-text').textContent  = Math.floor(player.armor);
  $('#score-text').textContent  = score;
  $('#coins-text').textContent  = coins;
  const w = weapons.getCurrent();
  const a = weapons.getAmmo();
  $('#weapon-name').textContent = w.name + (weapons.reloading ? ' (перезарядка)' : '');
  $('#ammo-text').textContent   = `${a.mag} / ${a.reserve}`;
}

export function killFeed(text) {
  const feed = $('#kill-feed');
  const div = document.createElement('div');
  div.className = 'kill-msg';
  div.textContent = text;
  feed.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

export function showHitMarker() {
  const hm = $('#hit-marker');
  hm.classList.add('show');
  setTimeout(() => hm.classList.remove('show'), 100);
}

export function flashDamage() {
  const d = $('#damage-overlay');
  d.classList.add('hurt');
  setTimeout(() => d.classList.remove('hurt'), 250);
}

// ---------- Меню ----------
export function refreshMenuStats() {
  $('#menu-coins').textContent = Storage.get('coins');
  $('#menu-best').textContent  = Storage.get('best');
}

// ---------- Магазин ----------
export function renderShop(onChange) {
  const grid = $('#shop-grid');
  grid.innerHTML = '';
  const state = Storage.load();

  // Сначала — оружие
  Object.values(WEAPONS).forEach(w => {
    const card = document.createElement('div');
    card.className = 'card';
    const owned = state.ownedWeapons.includes(w.id);
    card.innerHTML = `
      <div class="preview" style="font-size:36px">🔫</div>
      <div class="title">${w.name}</div>
      <div class="desc">Урон ${w.damage} · скорострельность ${(60/w.fireRate)|0}/мин</div>
      <div class="price">${owned ? 'В наличии' : WEAPON_PRICES[w.id] + ' 💰'}</div>
    `;
    const btn = document.createElement('button');
    if (owned) {
      btn.textContent = 'Куплено';
      btn.disabled = true;
    } else {
      btn.textContent = 'Купить';
      btn.onclick = () => {
        const price = WEAPON_PRICES[w.id];
        if (state.coins < price) { notify('Недостаточно монет'); return; }
        Storage.addCoins(-price);
        state.ownedWeapons.push(w.id);
        Storage.save();
        notify('Оружие куплено: ' + w.name);
        renderShop(onChange);
        refreshMenuStats();
        onChange && onChange();
      };
    }
    card.appendChild(btn);
    grid.appendChild(card);
  });

  // Затем — скины (выбор/экипировка)
  Object.entries(SKINS).forEach(([weaponId, skins]) => {
    skins.forEach(skin => {
      const owned = state.ownedSkins[weaponId]?.includes(skin.id);
      const equipped = state.equipped[weaponId] === skin.id;
      const card = document.createElement('div');
      card.className = `card rarity-${skin.rarity}` + (owned ? ' owned' : '') + (equipped ? ' equipped' : '');
      card.innerHTML = `
        <div class="preview" style="background:#${skin.color.toString(16).padStart(6,'0')}"></div>
        <div class="rarity-tag rarity-${skin.rarity}">${RARITY_INFO[skin.rarity].name}</div>
        <div class="title">${WEAPONS[weaponId].name}: ${skin.name}</div>
        <div class="desc">${owned ? 'Уже в инвентаре' : 'Можно выбить из кейса'}</div>
      `;
      const btn = document.createElement('button');
      if (!owned) {
        btn.textContent = 'Только из кейса';
        btn.disabled = true;
      } else if (equipped) {
        btn.textContent = 'Экипировано';
        btn.disabled = true;
      } else {
        btn.textContent = 'Экипировать';
        btn.onclick = () => {
          Storage.equipSkin(weaponId, skin.id);
          notify('Экипировано: ' + skin.name);
          renderShop(onChange);
          onChange && onChange();
        };
      }
      card.appendChild(btn);
      grid.appendChild(card);
    });
  });
}

// ---------- Инвентарь ----------
export function renderInventory(onChange) {
  const grid = $('#inventory-grid');
  grid.innerHTML = '';
  const state = Storage.load();
  let any = false;
  Object.entries(state.ownedSkins).forEach(([weaponId, ids]) => {
    ids.forEach(skinId => {
      const skin = getSkin(weaponId, skinId);
      const equipped = state.equipped[weaponId] === skinId;
      any = true;
      const card = document.createElement('div');
      card.className = `card rarity-${skin.rarity}` + (equipped ? ' equipped' : '');
      card.innerHTML = `
        <div class="preview" style="background:#${skin.color.toString(16).padStart(6,'0')}"></div>
        <div class="rarity-tag rarity-${skin.rarity}">${RARITY_INFO[skin.rarity].name}</div>
        <div class="title">${WEAPONS[weaponId].name}: ${skin.name}</div>
        <div class="desc">${equipped ? 'Сейчас экипировано' : 'В коллекции'}</div>
      `;
      const btn = document.createElement('button');
      btn.textContent = equipped ? 'Экипировано' : 'Надеть';
      btn.disabled = equipped;
      btn.onclick = () => {
        Storage.equipSkin(weaponId, skinId);
        renderInventory(onChange);
        onChange && onChange();
      };
      card.appendChild(btn);
      grid.appendChild(card);
    });
  });
  if (!any) {
    grid.innerHTML = '<div style="grid-column:1/-1;color:#8a94a4;padding:20px">Инвентарь пуст — откройте кейс.</div>';
  }
}

// ---------- Кейсы ----------
export function renderCases(onChange) {
  const grid = $('#cases-grid');
  grid.innerHTML = '';
  $('#roulette-area').classList.add('hidden');
  $('#roulette-result').textContent = '';

  CASES.forEach(c => {
    const card = document.createElement('div');
    card.className = 'card';
    const weaponName = WEAPONS[c.weapon].name;
    card.innerHTML = `
      <div class="preview" style="font-size:42px">🎁</div>
      <div class="title">${c.name}</div>
      <div class="desc">${c.description} (${weaponName})</div>
      <div class="price">${c.price} 💰</div>
    `;
    const btn = document.createElement('button');
    btn.textContent = 'Открыть';
    btn.onclick = () => {
      if (Storage.get('coins') < c.price) { notify('Недостаточно монет'); return; }
      Storage.addCoins(-c.price);
      refreshMenuStats();
      onChange && onChange();
      runRoulette(c, onChange);
    };
    card.appendChild(btn);
    grid.appendChild(card);
  });
}

function pickRarity(odds) {
  const total = Object.values(odds).reduce((a,b)=>a+b, 0);
  let r = Math.random() * total;
  for (const rarity of RARITY_ORDER) {
    r -= (odds[rarity] || 0);
    if (r <= 0) return rarity;
  }
  return 'common';
}

function pickSkin(weaponId, rarity) {
  const pool = SKINS[weaponId].filter(s => s.rarity === rarity);
  if (pool.length === 0) {
    // Фоллбек — ищем ближайшую редкость
    for (const r of [...RARITY_ORDER].reverse()) {
      const p = SKINS[weaponId].filter(s => s.rarity === r);
      if (p.length) return p[Math.floor(Math.random() * p.length)];
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function runRoulette(caseObj, onChange) {
  const area = $('#roulette-area');
  const track = $('#roulette-track');
  const result = $('#roulette-result');
  result.textContent = '';
  area.classList.remove('hidden');

  // Заранее выберем итоговый скин по вероятностям
  const winRarity = pickRarity(caseObj.odds);
  const winSkin   = pickSkin(caseObj.weapon, winRarity);

  // Сгенерируем список из ~50 элементов, итог поставим в позицию 42
  const TOTAL = 50;
  const WIN_INDEX = 42;
  const items = [];
  for (let i = 0; i < TOTAL; i++) {
    if (i === WIN_INDEX) {
      items.push(winSkin);
    } else {
      const r = pickRarity(caseObj.odds);
      items.push(pickSkin(caseObj.weapon, r));
    }
  }

  // Рисуем
  track.style.transition = 'none';
  track.style.transform = 'translateX(0)';
  track.innerHTML = '';
  items.forEach(s => {
    const it = document.createElement('div');
    it.className = 'roulette-item';
    const color = '#' + s.color.toString(16).padStart(6,'0');
    it.innerHTML = `
      <div class="rcolor" style="background:${color};border-color:${color}"></div>
      <div class="rarity-tag rarity-${s.rarity}">${RARITY_INFO[s.rarity].name}</div>
      <div>${s.name}</div>
    `;
    track.appendChild(it);
  });

  // Запускаем после reflow
  requestAnimationFrame(() => {
    const itemW = 130;
    const containerW = track.parentElement.clientWidth;
    const offset = WIN_INDEX * itemW + itemW/2 - containerW/2 + (Math.random() - 0.5) * (itemW * 0.6);
    track.style.transition = 'transform 5s cubic-bezier(0.12, 0.6, 0.05, 1)';
    track.style.transform = `translateX(${-offset}px)`;
  });

  setTimeout(() => {
    // Добавляем награду или возвращаем деньги, если такой скин уже есть
    const isNew = Storage.addSkin(caseObj.weapon, winSkin.id);
    let msg;
    if (isNew) {
      msg = `🎉 Выбито: ${WEAPONS[caseObj.weapon].name} «${winSkin.name}» (${RARITY_INFO[winSkin.rarity].name})`;
    } else {
      const payout = RARITY_INFO[winSkin.rarity].payout;
      Storage.addCoins(payout);
      msg = `Дубликат «${winSkin.name}» — возврат ${payout} 💰`;
    }
    result.textContent = msg;
    refreshMenuStats();
    onChange && onChange();
  }, 5200);
}

// ---------- Управление экранами ----------
export function showScreen(id) {
  const screens = ['#menu', '#shop', '#cases-screen', '#inventory-screen', '#controls-screen', '#gameover', '#pause'];
  screens.forEach(s => $(s)?.classList.add('hidden'));
  $('#hud')?.classList.add('hidden');
  if (id === 'hud') {
    $('#hud').classList.remove('hidden');
  } else if (id) {
    $(id).classList.remove('hidden');
  }
}
