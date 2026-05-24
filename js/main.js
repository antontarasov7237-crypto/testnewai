// Точка входа: монтирует игру, навешивает обработчики на меню
import { Game } from './game.js';
import * as UI from './ui.js';
import * as Storage from './storage.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

UI.refreshMenuStats();
UI.showScreen('#menu');

function open(screenId, render) {
  UI.showScreen(screenId);
  render && render();
}

document.getElementById('btn-play').addEventListener('click', () => game.start());
document.getElementById('btn-shop').addEventListener('click', () => open('#shop', () => UI.renderShop(onChange)));
document.getElementById('btn-cases').addEventListener('click', () => open('#cases-screen', () => UI.renderCases(onChange)));
document.getElementById('btn-inventory').addEventListener('click', () => open('#inventory-screen', () => UI.renderInventory(onChange)));
document.getElementById('btn-controls').addEventListener('click', () => UI.showScreen('#controls-screen'));

document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', () => UI.showScreen('#menu'));
});

document.getElementById('btn-replay').addEventListener('click', () => game.start());
document.getElementById('btn-back-menu').addEventListener('click', () => {
  document.getElementById('gameover').classList.add('hidden');
  UI.showScreen('#menu');
  UI.refreshMenuStats();
});

document.getElementById('btn-resume').addEventListener('click', () => game.resume());
document.getElementById('btn-quit').addEventListener('click', () => game.quit());

function onChange() {
  UI.refreshMenuStats();
  // Если экипировка изменилась — обновим модель оружия в руках
  if (game && game.weapons) {
    game.weapons.setWeapon(game.weapons.currentWeaponId);
  }
}

// Сообщение при отсутствии WebGL
window.addEventListener('error', (e) => {
  console.error('Ошибка:', e.message);
});
