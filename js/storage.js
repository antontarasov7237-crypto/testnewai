// Локальное хранилище для прогресса игрока
const KEY = 'poxel_clone_save_v1';

const DEFAULT_STATE = {
  coins: 250,
  best: 0,
  ownedSkins: { pistol: ['default'], smg: ['default'], rifle: ['default'] },
  equipped:    { pistol: 'default', smg: 'default', rifle: 'default' },
  ownedWeapons: ['pistol', 'smg', 'rifle'],
};

let cache = null;

export function load() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cache = { ...DEFAULT_STATE, ...parsed,
        ownedSkins: { ...DEFAULT_STATE.ownedSkins, ...(parsed.ownedSkins||{}) },
        equipped:   { ...DEFAULT_STATE.equipped,   ...(parsed.equipped  ||{}) },
      };
    } else {
      cache = structuredClone(DEFAULT_STATE);
    }
  } catch {
    cache = structuredClone(DEFAULT_STATE);
  }
  return cache;
}

export function save() {
  if (!cache) return;
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
}

export function get(key) { return load()[key]; }

export function addCoins(amount) {
  const s = load();
  s.coins = Math.max(0, s.coins + amount);
  save();
  return s.coins;
}

export function setBest(score) {
  const s = load();
  if (score > s.best) { s.best = score; save(); return true; }
  return false;
}

export function ownsSkin(weapon, skinId) {
  const s = load();
  return (s.ownedSkins[weapon] || []).includes(skinId);
}

export function addSkin(weapon, skinId) {
  const s = load();
  if (!s.ownedSkins[weapon]) s.ownedSkins[weapon] = [];
  if (!s.ownedSkins[weapon].includes(skinId)) {
    s.ownedSkins[weapon].push(skinId);
    save();
    return true;
  }
  return false;
}

export function equipSkin(weapon, skinId) {
  const s = load();
  if (!ownsSkin(weapon, skinId)) return false;
  s.equipped[weapon] = skinId;
  save();
  return true;
}

export function reset() {
  cache = structuredClone(DEFAULT_STATE);
  save();
}
