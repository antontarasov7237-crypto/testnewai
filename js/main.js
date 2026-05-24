// Точка входа: сначала навешиваем обработчики кнопок, игру создаём лениво
// при первом клике «Играть», чтобы возможные ошибки Three.js / WebGL
// не ломали меню целиком.
import * as UI from './ui.js';
import * as Storage from './storage.js';

const canvas = document.getElementById('game-canvas');
let game = null;
let gameInitError = null;

async function ensureGame() {
  if (game || gameInitError) return game;
  try {
    const { Game } = await import('./game.js');
    game = new Game(canvas);
  } catch (err) {
    gameInitError = err;
    console.error('Не удалось инициализировать игру:', err);
    UI.notify('Ошибка инициализации игры: ' + (err?.message || err));
  }
  return game;
}

function onChange() {
  UI.refreshMenuStats();
  if (game && game.weapons) {
    game.weapons.setWeapon(game.weapons.currentWeaponId);
  }
}

function bindMenuButtons() {
  const on = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  on('btn-play', async () => {
    const g = await ensureGame();
    if (!g) return;
    g.start();
  });
  on('btn-shop', () => {
    UI.showScreen('#shop');
    UI.renderShop(onChange);
  });
  on('btn-cases', () => {
    UI.showScreen('#cases-screen');
    UI.renderCases(onChange);
  });
  on('btn-inventory', () => {
    UI.showScreen('#inventory-screen');
    UI.renderInventory(onChange);
  });
  on('btn-controls', () => UI.showScreen('#controls-screen'));

  document.querySelectorAll('.close-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      UI.showScreen('#menu');
      UI.refreshMenuStats();
    });
  });

  on('btn-replay', async () => {
    const g = await ensureGame();
    if (!g) return;
    g.start();
  });
  on('btn-back-menu', () => {
    document.getElementById('gameover')?.classList.add('hidden');
    UI.showScreen('#menu');
    UI.refreshMenuStats();
  });

  on('btn-resume', () => game && game.resume());
  on('btn-quit', () => game && game.quit());
}

function init() {
  bindMenuButtons();
  UI.refreshMenuStats();
  UI.showScreen('#menu');
  // Предзагружаем модуль игры, чтобы при клике «Играть» await разрешился из кэша
  // и не терял user-gesture (важно для pointer lock).
  import('./game.js').catch((err) => {
    console.warn('Не удалось предзагрузить game.js:', err);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

window.addEventListener('error', (e) => {
  console.error('Глобальная ошибка:', e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise:', e.reason);
});
