// Игровые данные: оружие, скины, кейсы

export const WEAPONS = {
  pistol: {
    id: 'pistol',
    name: 'Pistol',
    damage: 18,
    fireRate: 0.22,     // секунд между выстрелами
    magazine: 12,
    reserve: 60,
    reloadTime: 1.1,
    spread: 0.012,
    range: 80,
    auto: false,
    bulletSpeed: 110,
  },
  smg: {
    id: 'smg',
    name: 'SMG',
    damage: 11,
    fireRate: 0.085,
    magazine: 30,
    reserve: 120,
    reloadTime: 1.6,
    spread: 0.035,
    range: 70,
    auto: true,
    bulletSpeed: 120,
  },
  rifle: {
    id: 'rifle',
    name: 'Rifle',
    damage: 32,
    fireRate: 0.16,
    magazine: 20,
    reserve: 80,
    reloadTime: 2.0,
    spread: 0.015,
    range: 130,
    auto: true,
    bulletSpeed: 160,
  },
};

// Скины задают цвет + материал оружия. Default — всегда есть.
export const SKINS = {
  pistol: [
    { id: 'default',  name: 'Стандарт',     color: 0x2a2f38, rarity: 'common' },
    { id: 'ocean',    name: 'Океан',        color: 0x1e7fb5, rarity: 'uncommon' },
    { id: 'fire',     name: 'Пламя',        color: 0xff5722, rarity: 'rare' },
    { id: 'toxic',    name: 'Токсичный',    color: 0x7cff3a, rarity: 'epic',     emissive: 0x33aa00 },
    { id: 'gold',     name: 'Золото',       color: 0xffcc00, rarity: 'legendary', metalness: 0.9 },
    { id: 'cosmic',   name: 'Космос',       color: 0xb66bff, rarity: 'mythic',   emissive: 0x4400aa },
  ],
  smg: [
    { id: 'default',  name: 'Стандарт',     color: 0x33384a, rarity: 'common' },
    { id: 'forest',   name: 'Лес',          color: 0x4b7a3a, rarity: 'uncommon' },
    { id: 'urban',    name: 'Город',        color: 0x9aa3b0, rarity: 'rare' },
    { id: 'neon',     name: 'Неон',         color: 0xff39c0, rarity: 'epic',     emissive: 0x880066 },
    { id: 'royal',    name: 'Король',       color: 0xb98c2f, rarity: 'legendary', metalness: 0.8 },
    { id: 'void',     name: 'Бездна',       color: 0x0a0a18, rarity: 'mythic',   emissive: 0x6633ff },
  ],
  rifle: [
    { id: 'default',  name: 'Стандарт',     color: 0x3b3f4d, rarity: 'common' },
    { id: 'sand',     name: 'Песок',        color: 0xc2a878, rarity: 'uncommon' },
    { id: 'crimson',  name: 'Багровый',     color: 0xa1252b, rarity: 'rare' },
    { id: 'ice',      name: 'Лёд',          color: 0x8be2ff, rarity: 'epic',     emissive: 0x226699 },
    { id: 'platinum', name: 'Платина',      color: 0xe6e6ff, rarity: 'legendary', metalness: 1.0 },
    { id: 'dragon',   name: 'Дракон',       color: 0xff2a2a, rarity: 'mythic',   emissive: 0x880000 },
  ],
};

export const RARITY_INFO = {
  common:    { name: 'Обычный',     weight: 60, payout: 30 },
  uncommon:  { name: 'Необычный',   weight: 25, payout: 80 },
  rare:      { name: 'Редкий',      weight: 10, payout: 200 },
  epic:      { name: 'Эпический',   weight: 4,  payout: 500 },
  legendary: { name: 'Легендарный', weight: 0.9,payout: 1500 },
  mythic:    { name: 'Мифический',  weight: 0.1,payout: 5000 },
};

export const RARITY_ORDER = ['common','uncommon','rare','epic','legendary','mythic'];

// Доступные кейсы. weapon — оружие, для которого падают скины
export const CASES = [
  {
    id: 'starter',
    name: 'Стартовый',
    weapon: 'pistol',
    price: 100,
    description: 'Шанс получить скин для пистолета',
    odds: { common: 65, uncommon: 25, rare: 8, epic: 1.7, legendary: 0.29, mythic: 0.01 },
  },
  {
    id: 'smg_box',
    name: 'Тактический',
    weapon: 'smg',
    price: 250,
    description: 'Скины для SMG',
    odds: { common: 50, uncommon: 30, rare: 14, epic: 5,   legendary: 0.95, mythic: 0.05 },
  },
  {
    id: 'rifle_box',
    name: 'Снайперский',
    weapon: 'rifle',
    price: 500,
    description: 'Скины для винтовки',
    odds: { common: 35, uncommon: 35, rare: 20, epic: 7,   legendary: 2.8,  mythic: 0.2 },
  },
  {
    id: 'premium',
    name: 'Премиум',
    weapon: 'rifle',
    price: 1500,
    description: 'Высокие шансы на легендарку',
    odds: { common: 10, uncommon: 25, rare: 35, epic: 22,  legendary: 7,    mythic: 1 },
  },
];

// Стоимость покупки оружия в магазине
export const WEAPON_PRICES = {
  pistol: 0,
  smg: 600,
  rifle: 1200,
};

export function getSkin(weapon, skinId) {
  return SKINS[weapon].find(s => s.id === skinId) || SKINS[weapon][0];
}
