// @ts-nocheck
// Referencias a elementos del DOM usados por el juego.

export const rotateScreen = document.getElementById('rotate-screen');

export const startScreen = document.getElementById('start-screen');

export const levelupScreen = document.getElementById('levelup-screen');

export const pauseScreen = document.getElementById('pause-screen');

export const optionsModal = document.getElementById('options-modal');

export const confirmResetModal = document.getElementById('confirm-reset-modal');

export const gameoverScreen = document.getElementById('gameover-screen');

export const cardsContainer = document.getElementById('cards-container');

export const upgradesModal = document.getElementById('upgrades-modal');

export const charactersModal = document.getElementById('characters-modal');

export const shopUpgradesList = document.getElementById('shop-upgrades-list');

export const hudPauseBtn = document.getElementById('hud-pause-btn');

export function removeDomElement(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
