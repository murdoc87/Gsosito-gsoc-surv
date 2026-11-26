// @ts-nocheck
import Phaser from 'https://esm.sh/phaser@4';

const rotateScreen = document.getElementById('rotate-screen');
const startScreen = document.getElementById('start-screen');
const levelupScreen = document.getElementById('levelup-screen');
const pauseScreen = document.getElementById('pause-screen');
const optionsModal = document.getElementById('options-modal');
const confirmResetModal = document.getElementById('confirm-reset-modal');
const gameoverScreen = document.getElementById('gameover-screen');
const cardsContainer = document.getElementById('cards-container');
const upgradesModal = document.getElementById('upgrades-modal');
const charactersModal = document.getElementById('characters-modal');
const shopUpgradesList = document.getElementById('shop-upgrades-list');
const hudPauseBtn = document.getElementById('hud-pause-btn');

const META_STORAGE_KEY = 'gsosito_survivor_meta_v1';

const SHOP_UPGRADES = [
  {
    id: 'perm_hp',
    icon: '❤️',
    name: 'Blindaje Base',
    desc: 'Aumenta tus puntos de salud máxima al iniciar cada turno.',
    effectLabel: '+15 PS máximos por nivel',
    getCurrentBonusLabel: (lvl) => `Bonificación actual: +${lvl * 15} PS máximos`,
    baseCost: 25,
    stepCost: 20,
    maxLevel: 5
  },
  {
    id: 'perm_speed',
    icon: '🥾',
    name: 'Servo-Botas',
    desc: 'Incrementa tu velocidad base de desplazamiento por el perímetro.',
    effectLabel: '+8% velocidad inicial por nivel',
    getCurrentBonusLabel: (lvl) => `Bonificación actual: +${lvl * 8}% velocidad inicial`,
    baseCost: 30,
    stepCost: 25,
    maxLevel: 5
  },
  {
    id: 'perm_dmg',
    icon: '🔴',
    name: 'Láser Calibrado',
    desc: 'Potencia el daño base de tu armamento desde el primer segundo.',
    effectLabel: '+15% daño inicial por nivel',
    getCurrentBonusLabel: (lvl) => `Bonificación actual: +${lvl * 15}% daño inicial`,
    baseCost: 35,
    stepCost: 30,
    maxLevel: 5
  },
  {
    id: 'perm_dmg_red',
    icon: '🛡️',
    name: 'Chasis Reactivo',
    desc: 'Reduce de forma permanente todo el daño recibido por impactos.',
    effectLabel: '+5% reducción de daño por nivel',
    getCurrentBonusLabel: (lvl) => `Bonificación actual: -${lvl * 5}% daño recibido`,
    baseCost: 40,
    stepCost: 35,
    maxLevel: 5
  },
  {
    id: 'perm_xp',
    icon: '⚡',
    name: 'Extractor XP',
    desc: 'Incrementa el valor base de cada cristal de experiencia recogido en partida.',
    effectLabel: '+15% valor XP base por nivel',
    getCurrentBonusLabel: (lvl) => `Bonificación actual: +${lvl * 15}% valor XP base`,
    baseCost: 35,
    stepCost: 30,
    maxLevel: 5
  }
];

function getEmptyMeta() {
  return {
    chapas: 0,
    levels: {
      perm_hp: 0,
      perm_speed: 0,
      perm_dmg: 0,
      perm_dmg_red: 0,
      perm_xp: 0
    }
  };
}

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      chapas: Number(parsed?.chapas) || 0,
      levels: {
        perm_hp: Number(parsed?.levels?.perm_hp) || 0,
        perm_speed: Number(parsed?.levels?.perm_speed) || 0,
        perm_dmg: Number(parsed?.levels?.perm_dmg) || 0,
        perm_dmg_red: Number(parsed?.levels?.perm_dmg_red) || 0,
        perm_xp: Number(parsed?.levels?.perm_xp) || 0
      }
    };
  } catch (e) {
    return getEmptyMeta();
  }
}

function saveMeta(meta) {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  } catch (e) {}
}

function resetMeta() {
  const empty = getEmptyMeta();
  saveMeta(empty);
  refreshMenuChatarraUI();
  return empty;
}

function getUpgradeCost(upg, currentLevel) {
  return upg.baseCost + currentLevel * upg.stepCost;
}

function refreshMenuChatarraUI() {
  const meta = loadMeta();
  const menuEl = document.getElementById('menu-chapas-val');
  const shopEl = document.getElementById('shop-chapas-val');
  if (menuEl) menuEl.textContent = String(meta.chapas);
  if (shopEl) shopEl.textContent = String(meta.chapas);
}

// --- AUDIO SINTETIZADO ---
const AudioSys = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },
  playTone(freq, type, duration, vol = 0.07, slideTo = null) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), this.ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  },
  shoot() { this.playTone(980, 'triangle', 0.06, 0.045, 260); },
  novaShoot() { this.playTone(620, 'sawtooth', 0.14, 0.055, 190); },
  fusionShoot() {
    this.playTone(760, 'sawtooth', 0.13, 0.06, 280);
    setTimeout(() => this.playTone(1140, 'triangle', 0.11, 0.05, 420), 25);
  },
  fusionUnlock() {
    [330, 440, 554.37, 659.25, 880, 1108.73].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.18, 0.075, f * 1.12), i * 55);
    });
  },
  fireworkPop() {
    this.playTone(420, 'sine', 0.18, 0.06, 980);
    setTimeout(() => this.playTone(180, 'sawtooth', 0.22, 0.06, 55), 140);
  },
  tamperZap() {
    this.playTone(1480, 'sawtooth', 0.09, 0.065, 320);
    setTimeout(() => this.playTone(860, 'square', 0.08, 0.045, 190), 35);
  },
  bossOrbShoot() { this.playTone(310, 'sine', 0.16, 0.065, 110); },
  sawShoot() { this.playTone(340, 'sawtooth', 0.16, 0.055, 140); },
  hit() { this.playTone(185, 'sawtooth', 0.055, 0.045, 80); },
  kill() { this.playTone(290, 'square', 0.1, 0.055, 65); },
  pickup() { this.playTone(720, 'sine', 0.07, 0.05, 1240); },
  scrapPickup() {
    this.playTone(920, 'triangle', 0.06, 0.055, 1380);
    setTimeout(() => this.playTone(1380, 'sine', 0.07, 0.05, 1760), 35);
  },
  chestPickup() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.16, 0.075, f * 1.15), i * 55);
    });
  },
  commLossStun() {
    this.playTone(540, 'square', 0.08, 0.05, 220);
    setTimeout(() => this.playTone(310, 'sawtooth', 0.11, 0.045, 140), 45);
  },
  magnetPickup() {
    [520, 740, 1020].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.11, 0.06, f * 1.25), i * 55);
    });
  },
  bombExplosion() {
    this.playTone(150, 'sawtooth', 0.36, 0.11, 32);
    setTimeout(() => this.playTone(95, 'square', 0.28, 0.08, 28), 55);
  },
  hordeAlert() {
    [220, 180, 220].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.22, 0.07, f * 0.75), i * 320);
    });
  },
  portalOpen() {
    [330, 495, 660, 990].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.18, 0.06, f * 1.18), i * 65);
    });
  },
  dimensionShift() {
    this.playTone(180, 'sawtooth', 0.35, 0.08, 740);
    setTimeout(() => this.playTone(620, 'triangle', 0.28, 0.07, 220), 120);
  },
  ticketPrint() {
    const pulses = 11;
    for (let i = 0; i < pulses; i++) {
      setTimeout(() => {
        const baseFreq = 1350 + (i % 3) * 140;
        this.playTone(baseFreq, 'square', 0.022, 0.032, baseFreq * 0.72);
      }, i * 38);
    }
  },
  levelUp() {
    [440, 554.37, 659.25, 880].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.14, 0.07), i * 65);
    });
  },
  hurt() { this.playTone(130, 'sawtooth', 0.2, 0.08, 48); }
};

function unlockAudioOnFirstInteraction() {
  AudioSys.init();
  window.removeEventListener('pointerdown', unlockAudioOnFirstInteraction);
  window.removeEventListener('touchstart', unlockAudioOnFirstInteraction);
}
window.addEventListener('pointerdown', unlockAudioOnFirstInteraction, { passive: true });
window.addEventListener('touchstart', unlockAudioOnFirstInteraction, { passive: true });

// --- GENERADOR DE TEXTURAS HI-RES PARA PHASER 4 ---
function pxRect(g, x, y, w, h, color) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);

  if (typeof g.fillRect === 'function' && 'fillStyle' in g) {
    g.fillStyle = color;
    g.fillRect(rx, ry, rw, rh);
    return;
  }

  if (typeof g.fillStyle === 'function' && typeof g.fillRect === 'function') {
    const numColor = typeof color === 'string'
      ? parseInt(color.replace('#', ''), 16)
      : color;
    g.fillStyle(numColor, 1);
    g.fillRect(rx, ry, rw, rh);
  }
}

function registerCanvasTexture(scene, key, w, h, drawFn) {
  if (scene.textures.exists(key)) return;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  drawFn(g, w, h);
  scene.textures.addCanvas(key, c);
}

function buildAllTextures(scene) {
  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `crow_${frame}`, 32, 28, (g) => {
      const flap = frame === 1 ? -3 : 3;
      pxRect(g, 8, 12, 16, 10, '#090d16');
      pxRect(g, 9, 13, 14, 8, '#1e293b');
      pxRect(g, 11, 14, 10, 6, '#334155');
      pxRect(g, 4, 10 + flap, 7, 5, '#090d16');
      pxRect(g, 5, 11 + flap, 5, 3, '#475569');
      pxRect(g, 21, 10 - flap, 7, 5, '#090d16');
      pxRect(g, 22, 11 - flap, 5, 3, '#475569');
      pxRect(g, 22, 17, 6, 4, '#090d16');
      pxRect(g, 23, 18, 4, 2, '#64748b');
      pxRect(g, 4, 8, 9, 9, '#090d16');
      pxRect(g, 5, 9, 7, 7, '#334155');
      pxRect(g, 0, 11, 5, 3, '#facc15');
      pxRect(g, 1, 12, 3, 1, '#fef08a');
      pxRect(g, 7, 10, 2, 2, '#ef4444');
      pxRect(g, 7, 10, 1, 1, '#ffffff');
    });
  });

  ['orange', 'gray'].forEach(variant => {
    const cMain = variant === 'orange' ? '#ea580c' : '#64748b';
    const cLight = variant === 'orange' ? '#fb923c' : '#94a3b8';
    const cDark = variant === 'orange' ? '#9a3412' : '#334155';
    const cEye = variant === 'orange' ? '#facc15' : '#4ade80';
    const keyBase = variant === 'orange' ? 'catOrange' : 'catGray';

    [0, 1].forEach(frame => {
      registerCanvasTexture(scene, `${keyBase}_${frame}`, 32, 28, (g) => {
        const step = frame === 1 ? 1 : -1;
        pxRect(g, 25, 10 - step, 3, 9, '#0f1218');
        pxRect(g, 26, 11 - step, 2, 7, cMain);
        pxRect(g, 27, 8 - step, 3, 4, '#0f1218');
        pxRect(g, 28, 9 - step, 1, 3, cLight);
        pxRect(g, 8, 13, 18, 10, '#0f1218');
        pxRect(g, 9, 14, 16, 8, cMain);
        pxRect(g, 11, 14, 12, 3, cLight);
        pxRect(g, 12, 16, 2, 4, cDark);
        pxRect(g, 17, 16, 2, 4, cDark);
        pxRect(g, 9 + step, 22, 4, 5, '#0f1218');
        pxRect(g, 10 + step, 22, 2, 4, cLight);
        pxRect(g, 20 - step, 22, 4, 5, '#0f1218');
        pxRect(g, 21 - step, 22, 2, 4, cDark);
        pxRect(g, 3, 5, 15, 13, '#0f1218');
        pxRect(g, 4, 2, 4, 4, '#0f1218');
        pxRect(g, 13, 2, 4, 4, '#0f1218');
        pxRect(g, 5, 3, 2, 3, '#fda4af');
        pxRect(g, 14, 3, 2, 3, '#fda4af');
        pxRect(g, 4, 6, 13, 11, cMain);
        pxRect(g, 5, 6, 11, 4, cLight);
        pxRect(g, 5, 10, 4, 2, cEye);
        pxRect(g, 11, 10, 4, 2, cEye);
        pxRect(g, 6, 10, 1, 2, '#090b10');
        pxRect(g, 12, 10, 1, 2, '#090b10');
        pxRect(g, 8, 13, 3, 2, '#fda4af');
        pxRect(g, 7, 15, 1, 2, '#ffffff');
        pxRect(g, 11, 15, 1, 2, '#ffffff');
      });
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `forklift_${frame}`, 44, 34, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 8, 28, 32, 4, 'rgba(0,0,0,0.45)');
      pxRect(g, 1, 22, 11, 3, '#090d14');
      pxRect(g, 2, 23, 9, 1, '#cbd5e1');
      pxRect(g, 9, 12, 3, 12, '#090d14');
      pxRect(g, 10, 13, 1, 10, '#94a3b8');
      pxRect(g, 12, 14, 20, 12, '#090d14');
      pxRect(g, 13, 15, 18, 10, '#f59e0b');
      pxRect(g, 13, 15, 18, 3, '#fbbf24');
      pxRect(g, 14, 21, 16, 3, '#1e293b');
      pxRect(g, 28, 4, 3, 11, '#090d14');
      pxRect(g, 29, 5, 1, 9, '#475569');
      pxRect(g, 17, 4, 14, 2, '#090d14');
      pxRect(g, 18, 4, 12, 1, '#64748b');
      pxRect(g, 18, 8, 9, 7, '#090d14');
      pxRect(g, 19, 9, 7, 5, '#1d4ed8');
      pxRect(g, 19, 4, 7, 5, '#090d14');
      pxRect(g, 20, 5, 5, 4, '#fed7aa');
      pxRect(g, 19, 3, 8, 2, '#ef4444');
      pxRect(g, 20, 6, 2, 1, '#0f172a');
      pxRect(g, 13, 24, 7, 7, '#090d14');
      pxRect(g, 14, 25, 5, 5, '#334155');
      pxRect(g, 16, 26 + (step > 0 ? 1 : 0), 2, 2, '#e2e8f0');
      pxRect(g, 24, 24, 7, 7, '#090d14');
      pxRect(g, 25, 25, 5, 5, '#334155');
      pxRect(g, 27, 26 - (step > 0 ? 1 : 0), 2, 2, '#e2e8f0');
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `mutantRat_${frame}`, 32, 24, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 20, 13 - step, 6, 2, '#090d14');
      pxRect(g, 21, 13 - step, 5, 1, '#a3e635');
      pxRect(g, 25, 10 - step, 3, 3, '#090d14');
      pxRect(g, 26, 11 - step, 2, 2, '#84cc16');
      pxRect(g, 15 + step, 17, 4, 4, '#090d14');
      pxRect(g, 16 + step, 18, 2, 2, '#a3e635');
      pxRect(g, 8 - step, 17, 4, 4, '#090d14');
      pxRect(g, 9 - step, 18, 2, 2, '#a3e635');
      pxRect(g, 8, 10, 14, 9, '#090d14');
      pxRect(g, 9, 11, 12, 7, '#4d7c0f');
      pxRect(g, 10, 11, 10, 3, '#84cc16');
      pxRect(g, 12, 12, 3, 2, '#bef264');
      pxRect(g, 17, 13, 2, 2, '#a855f7');
      pxRect(g, 2, 8, 10, 8, '#090d14');
      pxRect(g, 3, 9, 8, 6, '#65a30d');
      pxRect(g, 1, 12, 3, 2, '#bef264');
      pxRect(g, 5, 4, 3, 4, '#090d14');
      pxRect(g, 9, 5, 3, 3, '#090d14');
      pxRect(g, 6, 5, 2, 3, '#d9f99d');
      pxRect(g, 10, 6, 1, 2, '#d9f99d');
      pxRect(g, 4, 10, 2, 2, '#ef4444');
      pxRect(g, 4, 10, 1, 1, '#fef08a');
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `thief_${frame}`, 38, 44, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 12, 31, 6, 11, '#0f1218');
      pxRect(g, 13, 31, 4, 9 + step, '#27272a');
      pxRect(g, 20, 31, 6, 11, '#0f1218');
      pxRect(g, 21, 31, 4, 9 - step, '#18181b');
      pxRect(g, 9, 18, 20, 14, '#090b10');
      pxRect(g, 10, 19, 18, 12, '#e2e8f0');
      pxRect(g, 10, 20, 18, 2, '#1e293b');
      pxRect(g, 10, 24, 18, 2, '#1e293b');
      pxRect(g, 10, 28, 18, 2, '#1e293b');
      pxRect(g, 11, 7, 16, 12, '#090b10');
      pxRect(g, 12, 8, 14, 10, '#fdba74');
      pxRect(g, 12, 10, 14, 4, '#0f172a');
      pxRect(g, 14, 11, 2, 2, '#f8fafc');
      pxRect(g, 21, 11, 2, 2, '#f8fafc');
      pxRect(g, 10, 4, 18, 4, '#090b10');
      pxRect(g, 11, 5, 16, 2, '#475569');
      pxRect(g, 24, 6, 6, 2, '#334155');
      pxRect(g, 3, 15, 8, 12, '#090b10');
      pxRect(g, 4, 16, 6, 10, '#b45309');
      pxRect(g, 5, 14, 4, 2, '#facc15');
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `execSuit_${frame}`, 40, 46, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 12, 32, 6, 12, '#090d14');
      pxRect(g, 13, 32, 4, 10 + step, '#1e293b');
      pxRect(g, 20, 32, 6, 12, '#090d14');
      pxRect(g, 21, 32, 4, 10 - step, '#0f172a');
      pxRect(g, 9, 18, 20, 15, '#090d14');
      pxRect(g, 10, 19, 18, 13, '#1e293b');
      pxRect(g, 16, 19, 6, 12, '#f8fafc');
      pxRect(g, 18, 20, 2, 9, '#dc2626');
      pxRect(g, 17, 29, 4, 2, '#dc2626');
      pxRect(g, 12, 6, 14, 12, '#090d14');
      pxRect(g, 13, 7, 12, 10, '#fed7aa');
      pxRect(g, 11, 4, 16, 4, '#090d14');
      pxRect(g, 12, 5, 14, 2, '#334155');
      pxRect(g, 15, 10, 2, 2, '#0f172a');
      pxRect(g, 21, 10, 2, 2, '#0f172a');
      pxRect(g, 27, 23, 11, 10, '#090d14');
      pxRect(g, 28, 24, 9, 8, '#78350f');
      pxRect(g, 28, 24, 9, 2, '#92400e');
      pxRect(g, 30, 21, 5, 3, '#090d14');
      pxRect(g, 31, 22, 3, 1, '#facc15');
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `logistics_${frame}`, 38, 44, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 12, 31, 6, 11, '#0f1218');
      pxRect(g, 13, 31, 4, 9 + step, '#1e3a8a');
      pxRect(g, 20, 31, 6, 11, '#0f1218');
      pxRect(g, 21, 31, 4, 9 - step, '#172554');
      pxRect(g, 9, 18, 20, 14, '#0f1218');
      pxRect(g, 10, 19, 18, 12, '#eab308');
      pxRect(g, 11, 19, 16, 4, '#facc15');
      pxRect(g, 10, 23, 18, 2, '#e2e8f0');
      pxRect(g, 10, 27, 18, 2, '#e2e8f0');
      pxRect(g, 18, 19, 2, 12, '#1e3a8a');
      pxRect(g, 11, 8, 16, 10, '#0f1218');
      pxRect(g, 12, 9, 14, 8, '#fdba74');
      pxRect(g, 14, 11, 2, 2, '#0f172a');
      pxRect(g, 21, 11, 2, 2, '#0f172a');
      pxRect(g, 9, 3, 20, 7, '#0f1218');
      pxRect(g, 10, 4, 18, 5, '#facc15');
      pxRect(g, 12, 4, 14, 2, '#fef08a');
      pxRect(g, 24, 20, 11, 10, '#0f1218');
      pxRect(g, 25, 21, 9, 8, '#b45309');
      pxRect(g, 25, 21, 9, 2, '#d97706');
      pxRect(g, 28, 21, 3, 8, '#fef08a');
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `foreman_${frame}`, 44, 48, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 13, 34, 7, 12, '#0f1218');
      pxRect(g, 14, 34, 5, 10 + step, '#1e3a8a');
      pxRect(g, 24, 34, 7, 12, '#0f1218');
      pxRect(g, 25, 34, 5, 10 - step, '#172554');
      pxRect(g, 8, 18, 28, 17, '#0f1218');
      pxRect(g, 9, 19, 26, 15, '#ea580c');
      pxRect(g, 10, 24, 24, 2, '#f8fafc');
      pxRect(g, 10, 29, 24, 2, '#f8fafc');
      pxRect(g, 13, 8, 18, 10, '#0f1218');
      pxRect(g, 14, 9, 16, 8, '#fdba74');
      pxRect(g, 14, 10, 16, 3, '#38bdf8');
      pxRect(g, 11, 2, 22, 7, '#0f1218');
      pxRect(g, 12, 3, 20, 5, '#f97316');
      pxRect(g, 28, 17, 14, 15, '#0f1218');
      pxRect(g, 29, 18, 12, 13, '#475569');
      pxRect(g, 30, 19, 10, 3, '#94a3b8');
      pxRect(g, 31, 24, 8, 3, '#facc15');
    });
  });

  registerCanvasTexture(scene, 'tolcrap_boss', 112, 64, (g) => {
    pxRect(g, 6, 52, 100, 10, 'rgba(0,0,0,0.5)');
    pxRect(g, 6, 10, 62, 38, '#090b10');
    pxRect(g, 8, 12, 58, 34, '#334155');
    pxRect(g, 8, 12, 58, 6, '#475569');
    pxRect(g, 10, 38, 54, 6, '#eab308');
    pxRect(g, 16, 38, 6, 6, '#0f172a');
    pxRect(g, 28, 38, 6, 6, '#0f172a');
    pxRect(g, 40, 38, 6, 6, '#0f172a');
    pxRect(g, 52, 38, 6, 6, '#0f172a');
    pxRect(g, 13, 20, 48, 15, '#1e293b');
    pxRect(g, 14, 21, 46, 13, '#0f172a');
    pxRect(g, 19, 23, 10, 2, '#facc15');
    pxRect(g, 23, 25, 2, 7, '#facc15');
    pxRect(g, 33, 23, 9, 2, '#ef4444');
    pxRect(g, 33, 25, 2, 5, '#ef4444');
    pxRect(g, 33, 30, 9, 2, '#ef4444');
    pxRect(g, 10, 14, 2, 2, '#94a3b8');
    pxRect(g, 62, 14, 2, 2, '#94a3b8');
    pxRect(g, 66, 4, 4, 22, '#090b10');
    pxRect(g, 67, 5, 2, 20, '#94a3b8');
    pxRect(g, 70, 14, 34, 34, '#090b10');
    pxRect(g, 72, 16, 30, 30, '#b91c1c');
    pxRect(g, 72, 16, 26, 5, '#ef4444');
    pxRect(g, 80, 10, 8, 4, '#090b10');
    pxRect(g, 81, 11, 6, 3, '#facc15');
    pxRect(g, 86, 21, 14, 10, '#0f172a');
    pxRect(g, 88, 22, 10, 8, '#38bdf8');
    pxRect(g, 90, 23, 4, 3, '#e0f2fe');
    pxRect(g, 91, 21, 2, 10, '#1e293b');
    pxRect(g, 96, 21, 2, 10, '#1e293b');
    pxRect(g, 102, 28, 6, 18, '#090d10');
    pxRect(g, 103, 29, 4, 16, '#64748b');
    pxRect(g, 107, 31, 4, 3, '#e2e8f0');
    pxRect(g, 107, 37, 4, 3, '#e2e8f0');
    pxRect(g, 107, 43, 4, 3, '#e2e8f0');
    pxRect(g, 101, 33, 3, 4, '#fef08a');
    [18, 46, 86].forEach(wx => {
      pxRect(g, wx - 7, 44, 14, 14, '#090b10');
      pxRect(g, wx - 5, 46, 10, 10, '#1e293b');
      pxRect(g, wx - 3, 48, 6, 6, '#94a3b8');
      pxRect(g, wx - 1, 50, 2, 2, '#0f172a');
    });
  });

  registerCanvasTexture(scene, 'corrupt_operator_boss', 64, 68, (g) => {
    pxRect(g, 12, 58, 40, 8, 'rgba(15, 23, 42, 0.25)');
    pxRect(g, 18, 40, 10, 18, '#0f172a');
    pxRect(g, 36, 40, 10, 18, '#1e293b');
    pxRect(g, 14, 20, 36, 21, '#090d16');
    pxRect(g, 16, 22, 32, 17, '#1e293b');
    pxRect(g, 28, 22, 8, 17, '#f8fafc');
    pxRect(g, 30, 23, 4, 13, '#ef4444');
    pxRect(g, 18, 4, 28, 16, '#090d16');
    pxRect(g, 20, 6, 24, 12, '#fde68a');
    pxRect(g, 16, 8, 4, 8, '#0284c7');
    pxRect(g, 22, 10, 6, 3, '#ef4444');
    pxRect(g, 36, 10, 6, 3, '#38bdf8');
    pxRect(g, 25, 15, 14, 2, '#0f172a');
    pxRect(g, 6, 24, 8, 12, '#090d16');
    pxRect(g, 8, 26, 4, 8, '#38bdf8');
    pxRect(g, 50, 24, 8, 12, '#090d16');
    pxRect(g, 52, 26, 4, 8, '#ef4444');
  });

  registerCanvasTexture(scene, 'dim_portal', 48, 56, (g) => {
    pxRect(g, 8, 48, 32, 6, 'rgba(14, 165, 233, 0.35)');
    pxRect(g, 10, 4, 28, 44, '#0f172a');
    pxRect(g, 12, 6, 24, 40, '#0284c7');
    pxRect(g, 15, 9, 18, 34, '#38bdf8');
    pxRect(g, 18, 13, 12, 26, '#e0f2fe');
    pxRect(g, 21, 18, 6, 16, '#ffffff');
  });

  registerCanvasTexture(scene, 'exit_door', 52, 64, (g) => {
    pxRect(g, 6, 56, 40, 6, 'rgba(250, 204, 21, 0.45)');
    pxRect(g, 8, 4, 36, 54, '#090d14');
    pxRect(g, 10, 6, 32, 50, '#ca8a04');
    pxRect(g, 12, 8, 28, 46, '#facc15');
    pxRect(g, 15, 11, 22, 42, '#fef08a');
    pxRect(g, 18, 14, 16, 38, '#ffffff');
    pxRect(g, 33, 32, 4, 4, '#b45309');
    pxRect(g, 19, 2, 14, 4, '#22c55e');
  });

  registerCanvasTexture(scene, 'cra_white_tile', 160, 160, (c) => {
    c.fillStyle = '#f8fafc';
    c.fillRect(0, 0, 160, 160);
    c.fillStyle = '#f1f5f9';
    c.fillRect(0, 0, 80, 80);
    c.fillRect(80, 80, 80, 80);
    c.strokeStyle = '#cbd5e1';
    c.lineWidth = 2;
    c.strokeRect(1, 1, 158, 158);
    c.beginPath();
    c.moveTo(80, 0);
    c.lineTo(80, 160);
    c.moveTo(0, 80);
    c.lineTo(160, 80);
    c.stroke();
    c.fillStyle = '#94a3b8';
    c.fillRect(10, 10, 4, 4);
    c.fillRect(146, 146, 4, 4);
  });

  registerCanvasTexture(scene, 'tolcrap_saw', 22, 22, (g) => {
    pxRect(g, 9, 0, 4, 3, '#cbd5e1');
    pxRect(g, 9, 19, 4, 3, '#cbd5e1');
    pxRect(g, 0, 9, 3, 4, '#cbd5e1');
    pxRect(g, 19, 9, 3, 4, '#cbd5e1');
    pxRect(g, 2, 2, 3, 3, '#94a3b8');
    pxRect(g, 17, 2, 3, 3, '#94a3b8');
    pxRect(g, 2, 17, 3, 3, '#94a3b8');
    pxRect(g, 17, 17, 3, 3, '#94a3b8');
    pxRect(g, 4, 4, 14, 14, '#090d14');
    pxRect(g, 5, 5, 12, 12, '#e2e8f0');
    pxRect(g, 6, 6, 10, 10, '#94a3b8');
    pxRect(g, 8, 8, 6, 6, '#ef4444');
    pxRect(g, 10, 10, 2, 2, '#fef08a');
  });

  registerCanvasTexture(scene, 'purple_orb', 16, 16, (g) => {
    pxRect(g, 4, 1, 8, 14, '#090d14');
    pxRect(g, 1, 4, 14, 8, '#090d14');
    pxRect(g, 4, 2, 8, 12, '#7e22ce');
    pxRect(g, 2, 4, 12, 8, '#7e22ce');
    pxRect(g, 4, 3, 8, 10, '#c084fc');
    pxRect(g, 3, 5, 10, 6, '#c084fc');
    pxRect(g, 5, 4, 4, 4, '#f3e8ff');
    pxRect(g, 6, 5, 2, 2, '#ffffff');
  });

  registerCanvasTexture(scene, 'boss_0', 56, 60, (g) => {
    pxRect(g, 12, 4, 32, 30, '#09090b');
    pxRect(g, 10, 8, 36, 24, '#18181b');
    pxRect(g, 6, 28, 44, 24, '#09090b');
    pxRect(g, 8, 30, 40, 20, '#18181b');
    pxRect(g, 14, 50, 10, 9, '#09090b');
    pxRect(g, 32, 50, 10, 9, '#09090b');
    pxRect(g, 14, 14, 12, 9, '#38bdf8');
    pxRect(g, 30, 14, 12, 9, '#38bdf8');
    pxRect(g, 26, 17, 4, 2, '#94a3b8');
    pxRect(g, 16, 16, 8, 5, '#ffffff');
    pxRect(g, 32, 16, 8, 5, '#ffffff');
    pxRect(g, 11, 6, 2, 6, '#a855f7');
    pxRect(g, 43, 10, 2, 8, '#a855f7');
    pxRect(g, 7, 34, 2, 10, '#7e22ce');
  });

  registerCanvasTexture(scene, 'drone', 24, 20, (g) => {
    pxRect(g, 10, 1, 4, 3, '#64748b');
    pxRect(g, 4, 4, 16, 11, '#0f1218');
    pxRect(g, 5, 5, 14, 9, '#94a3b8');
    pxRect(g, 6, 5, 12, 3, '#e2e8f0');
    pxRect(g, 7, 8, 10, 5, '#0f172a');
    pxRect(g, 8, 9, 2, 2, '#38bdf8');
    pxRect(g, 14, 9, 2, 2, '#38bdf8');
    pxRect(g, 11, 11, 2, 1, '#ef4444');
    pxRect(g, 3, 13, 3, 5, '#ef4444');
    pxRect(g, 18, 13, 3, 5, '#ef4444');
  });

  registerCanvasTexture(scene, 'bolt', 16, 16, (g) => {
    pxRect(g, 5, 1, 6, 14, '#0f1218');
    pxRect(g, 3, 3, 10, 10, '#0f1218');
    pxRect(g, 4, 4, 8, 8, '#cbd5e1');
    pxRect(g, 5, 5, 6, 6, '#f8fafc');
    pxRect(g, 6, 6, 3, 3, '#ffffff');
  });

  registerCanvasTexture(scene, 'boss_chest', 32, 28, (g) => {
    pxRect(g, 4, 22, 24, 5, 'rgba(0,0,0,0.5)');
    pxRect(g, 3, 7, 26, 17, '#090d14');
    pxRect(g, 4, 8, 24, 15, '#78350f');
    pxRect(g, 5, 9, 22, 5, '#b45309');
    pxRect(g, 4, 14, 24, 2, '#090d14');
    pxRect(g, 4, 8, 3, 15, '#facc15');
    pxRect(g, 25, 8, 3, 15, '#facc15');
    pxRect(g, 4, 8, 24, 2, '#fde047');
    pxRect(g, 4, 21, 24, 2, '#eab308');
    pxRect(g, 13, 12, 6, 7, '#090d14');
    pxRect(g, 14, 13, 4, 5, '#facc15');
    pxRect(g, 15, 14, 2, 2, '#38bdf8');
  });

  registerCanvasTexture(scene, 'chapa_fallback', 16, 16, (g) => {
    pxRect(g, 4, 1, 8, 14, '#090d14');
    pxRect(g, 1, 4, 14, 8, '#090d14');
    pxRect(g, 3, 3, 10, 10, '#f59e0b');
    pxRect(g, 4, 4, 8, 8, '#facc15');
    pxRect(g, 6, 5, 4, 6, '#fef08a');
  });

  registerCanvasTexture(scene, 'medkit', 18, 16, (g) => {
    pxRect(g, 6, 1, 6, 3, '#0f1218');
    pxRect(g, 2, 3, 14, 11, '#0f1218');
    pxRect(g, 3, 4, 12, 9, '#dc2626');
    pxRect(g, 8, 6, 2, 5, '#ffffff');
    pxRect(g, 6, 8, 6, 1, '#ffffff');
  });

  registerCanvasTexture(scene, 'magnet_drop', 20, 20, (g) => {
    pxRect(g, 2, 2, 16, 16, '#090d14');
    pxRect(g, 3, 3, 5, 10, '#ef4444');
    pxRect(g, 12, 3, 5, 10, '#ef4444');
    pxRect(g, 4, 4, 2, 8, '#fca5a5');
    pxRect(g, 13, 4, 2, 8, '#fca5a5');
    pxRect(g, 3, 11, 14, 6, '#dc2626');
    pxRect(g, 7, 9, 6, 4, '#2b303b');
    pxRect(g, 3, 2, 5, 3, '#e2e8f0');
    pxRect(g, 12, 2, 5, 3, '#e2e8f0');
    pxRect(g, 4, 2, 2, 2, '#ffffff');
    pxRect(g, 13, 2, 2, 2, '#ffffff');
  });

  registerCanvasTexture(scene, 'bomb_drop', 22, 24, (g) => {
    pxRect(g, 15, 1, 2, 2, '#fef08a');
    pxRect(g, 14, 2, 4, 2, '#f97316');
    pxRect(g, 16, 0, 2, 2, '#ffffff');
    pxRect(g, 13, 3, 2, 2, '#d6b37c');
    pxRect(g, 11, 4, 2, 2, '#b68d52');
    pxRect(g, 9, 5, 6, 3, '#090d14');
    pxRect(g, 10, 6, 4, 2, '#94a3b8');
    pxRect(g, 5, 8, 12, 14, '#090d14');
    pxRect(g, 3, 10, 16, 10, '#090d14');
    pxRect(g, 6, 9, 10, 12, '#1e293b');
    pxRect(g, 4, 11, 14, 8, '#1e293b');
    pxRect(g, 5, 11, 12, 7, '#0f172a');
    pxRect(g, 6, 11, 3, 2, '#64748b');
    pxRect(g, 5, 13, 2, 2, '#475569');
  });

  registerCanvasTexture(scene, 'laser', 22, 6, (g) => {
    pxRect(g, 0, 0, 22, 6, 'rgba(239, 68, 68, 0.45)');
    pxRect(g, 2, 1, 18, 4, '#ef4444');
    pxRect(g, 4, 2, 14, 2, '#ffffff');
  });

  registerCanvasTexture(scene, 'domo_laser', 24, 8, (g) => {
    pxRect(g, 0, 0, 24, 8, 'rgba(34, 211, 238, 0.4)');
    pxRect(g, 2, 1, 20, 6, '#06b6d4');
    pxRect(g, 4, 2, 16, 4, '#a5f3fc');
    pxRect(g, 6, 3, 12, 2, '#ffffff');
  });

  registerCanvasTexture(scene, 'fusion_laser', 28, 10, (g) => {
    pxRect(g, 0, 0, 28, 10, 'rgba(168, 85, 247, 0.45)');
    pxRect(g, 2, 1, 24, 8, '#9333ea');
    pxRect(g, 4, 2, 20, 6, '#c084fc');
    pxRect(g, 6, 3, 16, 4, '#f3e8ff');
    pxRect(g, 9, 4, 10, 2, '#ffffff');
  });

  registerCanvasTexture(scene, 'ground_proc', 280, 280, (c) => {
    const blockW = 280;
    const blockH = 280;
    c.fillStyle = '#2b303b';
    c.fillRect(0, 0, blockW, blockH);
    c.fillStyle = '#1b1e26';
    c.fillRect(0, 0, blockW, 54);
    c.fillRect(0, 0, 54, blockH);
    c.fillStyle = '#64748b';
    c.fillRect(0, 54, blockW, 2);
    c.fillRect(54, 0, 2, blockH);
    c.fillStyle = '#0f1218';
    c.fillRect(0, 56, blockW, 2);
    c.fillRect(56, 0, 2, blockH);
    c.fillStyle = '#eab308';
    for (let m = 72; m < blockW - 16; m += 48) {
      c.fillRect(m, 26, 22, 3);
      c.fillRect(26, m, 3, 22);
    }
    c.fillStyle = '#363c4a';
    for (let sx = 58; sx < blockW; sx += 28) c.fillRect(sx, 58, 1, blockH - 58);
    for (let sy = 58; sy < blockH; sy += 28) c.fillRect(58, sy, blockW - 58, 1);
    c.fillStyle = '#14171f';
    c.fillRect(96, 115, 20, 2);
    c.fillRect(114, 117, 10, 2);
    c.fillRect(195, 205, 2, 18);
    c.fillStyle = '#3f6212';
    c.fillRect(62, 60, 4, 3);
    c.fillRect(150, 165, 5, 3);
  });

  registerCanvasTexture(scene, 'prop_crater', 30, 16, (g) => {
    pxRect(g, 1, 1, 28, 14, '#181b22');
    pxRect(g, 5, 4, 20, 8, '#101218');
    pxRect(g, 2, 14, 26, 2, '#475569');
  });
  registerCanvasTexture(scene, 'prop_puddle', 32, 12, (g) => {
    pxRect(g, 1, 1, 30, 10, '#14532d');
    pxRect(g, 6, 3, 20, 6, '#22c55e');
    pxRect(g, 11, 5, 8, 2, '#bbf7d0');
  });
  registerCanvasTexture(scene, 'prop_barrel', 18, 24, (g) => {
    pxRect(g, 1, 18, 17, 5, 'rgba(0,0,0,0.42)');
    pxRect(g, 1, 0, 16, 20, '#0c0d10');
    pxRect(g, 2, 1, 14, 18, '#b91c1c');
    pxRect(g, 3, 1, 4, 18, '#ef4444');
    pxRect(g, 2, 7, 14, 5, '#facc15');
  });
  registerCanvasTexture(scene, 'prop_crate', 24, 24, (g) => {
    pxRect(g, 1, 18, 23, 5, 'rgba(0,0,0,0.42)');
    pxRect(g, 1, 0, 22, 20, '#0c0d10');
    pxRect(g, 2, 1, 20, 18, '#92400e');
    pxRect(g, 2, 1, 20, 4, '#d97706');
    pxRect(g, 9, 1, 6, 18, '#facc15');
  });
  registerCanvasTexture(scene, 'prop_barrier', 34, 20, (g) => {
    pxRect(g, 1, 14, 33, 6, 'rgba(0,0,0,0.42)');
    pxRect(g, 1, 0, 32, 16, '#0c0d10');
    pxRect(g, 2, 1, 30, 14, '#64748b');
    pxRect(g, 2, 1, 30, 4, '#94a3b8');
    pxRect(g, 7, 7, 5, 6, '#facc15');
    pxRect(g, 21, 7, 5, 6, '#facc15');
  });
  registerCanvasTexture(scene, 'prop_car', 54, 30, (g) => {
    pxRect(g, 1, 21, 53, 8, 'rgba(0,0,0,0.48)');
    pxRect(g, 1, 0, 52, 23, '#0c0d10');
    pxRect(g, 2, 7, 50, 14, '#9a3412');
    pxRect(g, 11, 1, 28, 7, '#475569');
    pxRect(g, 14, 3, 10, 4, '#0f172a');
    pxRect(g, 28, 3, 9, 4, '#0f172a');
    pxRect(g, 6, 10, 9, 5, '#c2410c');
    pxRect(g, 37, 13, 10, 5, '#c2410c');
    pxRect(g, 7, 18, 9, 6, '#090a0d');
    pxRect(g, 38, 18, 9, 6, '#090a0d');
  });
}

const WORLD_Y_SPAN = 12000;
const WORLD_BASE_DEPTH = 2000;
const HUD_BASE_DEPTH = 200000;

function getWorldEntityDepth(y, offset = 0) {
  const clampedY = Math.max(-WORLD_Y_SPAN, Math.min(WORLD_Y_SPAN, Number(y) || 0));
  return Math.round(WORLD_BASE_DEPTH + clampedY + WORLD_Y_SPAN + offset);
}

function getEnemyDepth(enemy, isBoss = false) {
  return getWorldEntityDepth(enemy?.y ?? 0, isBoss ? 25 : 0);
}

function applyEnemyFacing(enemy, vx, facingLeftByDefault) {
  if (Math.abs(vx) < 0.01) return;
  const movingRight = vx > 0;
  enemy.setFlipX(facingLeftByDefault ? movingRight : !movingRight);
}

function applyVeterancyUpgrade(p) {
  p.veterancyLevel = (p.veterancyLevel || 0) + 1;
  const stepGain = 0.06 + (p.veterancyLevel - 1) * 0.025;
  p.damageReduction = Math.min(0.75, Number(((p.damageReduction || 0) + stepGain).toFixed(4)));
}

function getReducedDamage(stats, rawDamage) {
  const reduction = Math.max(0, Math.min(0.75, stats?.damageReduction || 0));
  return Math.max(1, Math.round(rawDamage * (1 - reduction)));
}

function activateDomoFish(p) {
  p.domoFish.enabled = true;
  p.domoFish.level = Math.max(1, p.domoFish.level || 0);
  p.domoFish.rays = Math.max(4, p.domoFish.rays || 4);
  p.domoFish.baseDamage = Math.max(16, p.domoFish.baseDamage || 16);
  p.domoFish.baseCooldown = Math.min(3.2, p.domoFish.baseCooldown || 3.2);
  p.domoFish.timer = 0.05;
}

function incrementDomoFishLevel(p) {
  p.domoFish.level = (p.domoFish.level || 1) + 1;
}

function activateDrones(p) {
  p.dronesEnabled = true;
  p.orbitals = Math.max(1, p.orbitals || 0);
}

function upgradeTamperAttack(p) {
  const nextLvl = (p.tamper.level || 0) + 1;
  p.tamper.level = nextLvl;
  p.tamper.enabled = true;
  if (nextLvl === 1) {
    p.tamper.cooldown = 3.0;
    p.tamper.targets = 1;
    p.tamper.damage = 26;
    p.tamper.timer = 0.25;
  } else {
    p.tamper.damage = Math.round(p.tamper.damage * 1.24);
  }
}

function activateCommLoss(p) {
  p.commLoss.enabled = true;
  p.commLoss.level = 1;
  p.commLoss.cooldown = 11.5;
  p.commLoss.minTargets = 1;
  p.commLoss.maxTargets = 2;
  p.commLoss.stunDuration = 2.4;
  p.commLoss.timer = 0.8;
}

const ACTIVATOR_UPGRADE_IDS = new Set(['domofish360', 'tamper_attack', 'orbital', 'comm_loss_attack']);
const BASIC_LASER_UPGRADE_IDS = new Set(['firerate', 'damage', 'multishot', 'pierce']);

function getBasicLaserUpgradesCount(stats) {
  const counts = stats?.upgradeCounts || {};
  let total = 0;
  BASIC_LASER_UPGRADE_IDS.forEach(id => {
    total += Number(counts[id]) || 0;
  });
  return total;
}

function canFuseWeapons(stats) {
  if (!stats || stats.fusionActive) return false;
  const domoLvl = Number(stats.domoFish?.level) || 0;
  const basicLaserUps = getBasicLaserUpgradesCount(stats);
  return Boolean(stats.domoFish?.enabled) && domoLvl >= 5 && basicLaserUps >= 5;
}

function getXpValueByTier(tier, baseEnemyXp) {
  const base = Math.max(4, Number(baseEnemyXp) || 5);
  if (tier === 'red') return Math.max(22, Math.round(base * 4.2));
  if (tier === 'blue') return Math.max(10, Math.round(base * 1.9));
  return base;
}

function getUpgradeTagLabel(upg, stats) {
  if (ACTIVATOR_UPGRADE_IDS.has(upg.id)) {
    return 'ACTIVAR';
  }
  if (upg.id.startsWith('domofish_')) {
    const nextDomoLvl = (Number(stats?.domoFish?.level) || 1) + 1;
    return `DOMO NV.${nextDomoLvl}`;
  }
  const takenCount = Number(stats?.upgradeCounts?.[upg.id]) || 0;
  return `NV.${takenCount + 1}`;
}

const DOMO_ICON = '🔮';
const DRONE_ICON = '🤖';
const TAMPER_ICON = '🌩️';
const COMMLOSS_ICON = '📡';

const UPGRADES = [
  {
    id: 'firerate',
    icon: '🔴',
    title: 'Overclocking',
    desc: 'Aumenta cadencia de disparo del láser básico',
    requires: (p) => !p.fusionActive,
    apply: (p) => { p.weapon.cooldown *= 0.78; }
  },
  {
    id: 'damage',
    icon: '🔴',
    title: 'Alta Potencia',
    desc: 'Aumenta daño base del láser básico',
    requires: (p) => !p.fusionActive,
    apply: (p) => { p.weapon.damage = Math.round(p.weapon.damage * 1.32); }
  },
  {
    id: 'multishot',
    icon: '🔴',
    title: 'Bi-Spectrum',
    desc: '+1 disparo láser simultáneo',
    requires: (p) => !p.fusionActive,
    apply: (p) => { p.weapon.projectileCount += 1; }
  },
  {
    id: 'pierce',
    icon: '🔴',
    title: 'Láser Perforante',
    desc: 'Cada láser básico atraviesa +1 enemigo',
    requires: (p) => !p.fusionActive,
    apply: (p) => { p.weapon.pierce += 1; }
  },
  {
    id: 'domofish360',
    icon: DOMO_ICON,
    title: 'Domo-Fish 360',
    desc: 'Activa un anillo circular de 4 láseres alrededor de ti',
    requires: (p) => !p.domoFish?.enabled && !p.fusionActive,
    apply: (p) => { activateDomoFish(p); }
  },
  {
    id: 'domofish_rays',
    icon: DOMO_ICON,
    title: 'Ráfaga Domo',
    desc: '+2 proyectiles por anillo de Domo-Fish 360 (sube nivel Domo)',
    requires: (p) => Boolean(p.domoFish?.enabled) && !p.fusionActive,
    apply: (p) => {
      p.domoFish.rays = Math.min(36, (p.domoFish.rays || 4) + 2);
      incrementDomoFishLevel(p);
    }
  },
  {
    id: 'domofish_firerate',
    icon: DOMO_ICON,
    title: 'Cadencia Domo',
    desc: 'Aumenta la velocidad de disparo de Domo-Fish (sube nivel Domo)',
    requires: (p) => Boolean(p.domoFish?.enabled) && !p.fusionActive,
    apply: (p) => {
      p.domoFish.baseCooldown = Math.max(1.1, Number((p.domoFish.baseCooldown / 1.2).toFixed(3)));
      incrementDomoFishLevel(p);
    }
  },
  {
    id: 'domofish_damage',
    icon: DOMO_ICON,
    title: 'Potencia Domo',
    desc: 'Aumenta el daño de los láseres de Domo-Fish (sube nivel Domo)',
    requires: (p) => Boolean(p.domoFish?.enabled) && !p.fusionActive,
    apply: (p) => {
      p.domoFish.baseDamage = Math.round(p.domoFish.baseDamage * 1.3);
      incrementDomoFishLevel(p);
    }
  },
  {
    id: 'tamper_attack',
    icon: TAMPER_ICON,
    title: 'Ataque Tamper',
    desc: 'Cada 3s cae un rayo del cielo sobre 1 enemigo aleatorio',
    requires: (p) => !p.tamper?.enabled,
    apply: (p) => { upgradeTamperAttack(p); }
  },
  {
    id: 'tamper_cd',
    icon: TAMPER_ICON,
    title: 'Pulso Tamper',
    desc: 'Reduce el tiempo entre rayos de Ataque Tamper',
    requires: (p) => Boolean(p.tamper?.enabled),
    apply: (p) => { p.tamper.cooldown = Math.max(1.0, Number((p.tamper.cooldown * 0.82).toFixed(3))); }
  },
  {
    id: 'tamper_targets',
    icon: TAMPER_ICON,
    title: 'Arco Tamper',
    desc: '+1 enemigo aleatorio golpeado por Ataque Tamper',
    requires: (p) => Boolean(p.tamper?.enabled),
    apply: (p) => { p.tamper.targets = Math.min(8, (p.tamper.targets || 1) + 1); }
  },
  {
    id: 'tamper_dmg',
    icon: TAMPER_ICON,
    title: 'Voltaje Tamper',
    desc: 'Aumenta el daño de los rayos de Ataque Tamper',
    requires: (p) => Boolean(p.tamper?.enabled),
    apply: (p) => { p.tamper.damage = Math.round(p.tamper.damage * 1.3); }
  },
  {
    id: 'comm_loss_attack',
    icon: COMMLOSS_ICON,
    title: 'Pérdida de comunicación parcial',
    desc: 'Cada 11.5s desconecta y aturde en el sitio a 1-2 enemigos aleatorios',
    requires: (p) => !p.commLoss?.enabled,
    apply: (p) => { activateCommLoss(p); }
  },
  {
    id: 'comm_loss_cd',
    icon: COMMLOSS_ICON,
    title: 'Interferencia Continua',
    desc: 'Reduce el tiempo de recarga de Pérdida de comunicación parcial',
    requires: (p) => Boolean(p.commLoss?.enabled),
    apply: (p) => { p.commLoss.cooldown = Math.max(3.2, Number((p.commLoss.cooldown * 0.82).toFixed(2))); }
  },
  {
    id: 'comm_loss_targets',
    icon: COMMLOSS_ICON,
    title: 'Caída de Red Masiva',
    desc: 'Aumenta el número aleatorio de enemigos stuneados por pulso (+1/+2)',
    requires: (p) => Boolean(p.commLoss?.enabled),
    apply: (p) => {
      p.commLoss.minTargets = Math.min(8, (p.commLoss.minTargets || 1) + 1);
      p.commLoss.maxTargets = Math.min(12, (p.commLoss.maxTargets || 2) + 2);
    }
  },
  {
    id: 'comm_loss_duration',
    icon: COMMLOSS_ICON,
    title: 'Reconexión Lenta',
    desc: 'Aumenta la duración del aturdimiento por pérdida de señal (+0.7s)',
    requires: (p) => Boolean(p.commLoss?.enabled),
    apply: (p) => { p.commLoss.stunDuration = Math.min(6.0, Number(((p.commLoss.stunDuration || 2.4) + 0.7).toFixed(2))); }
  },
  {
    id: 'orbital',
    icon: DRONE_ICON,
    title: 'Dron de Vigilancia',
    desc: 'Activa un dron orbital que daña a los enemigos cercanos',
    requires: (p) => !p.dronesEnabled,
    apply: (p) => { activateDrones(p); }
  },
  {
    id: 'drone_count',
    icon: DRONE_ICON,
    title: 'Enjambre de Drones',
    desc: '+1 dron defensor orbital girando a tu alrededor',
    requires: (p) => Boolean(p.dronesEnabled),
    apply: (p) => { p.orbitals = Math.min(8, (p.orbitals || 1) + 1); }
  },
  {
    id: 'drone_speed',
    icon: DRONE_ICON,
    title: 'Propulsores de Dron',
    desc: 'Aumenta la velocidad de giro de los drones orbitales',
    requires: (p) => Boolean(p.dronesEnabled),
    apply: (p) => { p.droneOrbitSpeed = Number((p.droneOrbitSpeed * 1.35).toFixed(3)); }
  },
  {
    id: 'drone_area',
    icon: DRONE_ICON,
    title: 'Alcance de Dron',
    desc: 'Aumenta el radio de órbita y mayor área de patrulla de los drones',
    requires: (p) => Boolean(p.dronesEnabled),
    apply: (p) => { p.droneOrbitRadius = Math.min(145, p.droneOrbitRadius + 12); }
  },
  {
    id: 'global_damage',
    icon: '☢️',
    title: 'Operativa',
    desc: 'Aumenta el daño de TODOS tus ataques y drones',
    apply: (p) => { p.globalDamageMult = Number((p.globalDamageMult * 1.18).toFixed(3)); }
  },
  {
    id: 'global_firerate',
    icon: '☕',
    title: 'Cafeína',
    desc: 'Aumenta la cadencia de TODOS tus ataques',
    apply: (p) => { p.globalFirerateMult = Number((p.globalFirerateMult * 1.15).toFixed(3)); }
  },
  {
    id: 'speed',
    icon: '🥾',
    title: 'Botas de seguridad',
    desc: 'Aumenta tu velocidad de movimiento',
    apply: (p) => { p.speed *= 1.16; }
  },
  {
    id: 'maxhp',
    icon: '❤️',
    title: 'Blindaje Reforzado',
    desc: '+30 salud máxima y curación total',
    apply: (p) => { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 45); }
  },
  {
    id: 'veterancy',
    icon: '🛡️',
    title: 'Veteranía',
    desc: 'Aumenta la reducción de daño recibido (cada nivel aporta más)',
    apply: (p) => { applyVeterancyUpgrade(p); }
  },
  {
    id: 'magnet',
    icon: '🧲',
    title: 'Imán de Suministros',
    desc: 'Aumenta tu radio de recolección pasiva',
    apply: (p) => { p.pickupRange *= 1.45; }
  }
];

let activeSceneRef = null;

class SurvivorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SurvivorScene' });
    this._uiBound = false;
    this._lastThermalDims = null;
    this._pausedByPortrait = false;
    this._toastTimeout = null;
  }

  preload() {
    this.load.on('loaderror', () => {});

    this.load.image('custom_block', 'img/block.png');
    this.load.image('gameover_bg', 'img/gameover_bg.png');
    this.load.image('retrato_1', 'img/retrato_1.png');
    this.load.image('chapa', 'img/chapa.png');
    this.load.image('prop_barrel', 'img/prop_barrel.png');
    this.load.image('prop_barrel_2', 'img/prop_barrel_2.png');
    this.load.image('prop_car', 'img/prop_car.png');
    this.load.image('prop_car_2', 'img/prop_car_2.png');
    this.load.image('prop_car_3', 'img/prop_car_3.png');
    this.load.image('prop_crate', 'img/prop_crate.png');
    this.load.image('prop_crate_2', 'img/prop_crate_2.png');
    this.load.image('prop_barrier', 'img/prop_barrier.png');
    this.load.image('tolcrap_custom', 'img/tolcrap.png');
    this.load.image('tolcrap_side', 'img/tolcrap_side.png');
    this.load.image('tolcrap_up', 'img/tolcrap_up.png');
    this.load.image('tolcrap_down', 'img/tolcrap_down.png');
    this.load.image('dim_portal_img', 'img/dim_portal.png');
    this.load.image('corrupt_operator_img', 'img/corrupt_operator.png');
    this.load.image('cra_white_floor_img', 'img/cra_white_floor.png');

    this.load.image('gsosito_idle_front', 'img/gsosito/idle_front.png');
    this.load.image('gsosito_idle_back', 'img/gsosito/idle_back.png');
    this.load.image('gsosito_idle_side', 'img/gsosito/idle_side.png');

    this.load.spritesheet('gsosito_walk_down', 'img/gsosito/walk_down_sheet.png', {
      frameWidth: 32, frameHeight: 48
    });
    this.load.spritesheet('gsosito_walk_up', 'img/gsosito/walk_up_sheet.png', {
      frameWidth: 33, frameHeight: 48
    });
    this.load.spritesheet('gsosito_walk_side', 'img/gsosito/walk_side_sheet.png', {
      frameWidth: 31, frameHeight: 48
    });
    this.load.image('ticket_img', 'img/ticket.png');
    this.load.image('end_bg', 'img/end.png');
  }

  hasValidTexture(key) {
    return Boolean(key && this.textures.exists(key) && this.textures.get(key).key !== '__MISSING');
  }

  resolveCustomOrFallbackTexture(customKey, fallbackKey) {
    return this.hasValidTexture(customKey) ? customKey : fallbackKey;
  }

  create() {
    activeSceneRef = this;
    this.selectedShopUpgradeId = SHOP_UPGRADES[0].id;
    buildAllTextures(this);
    this.createAnimations();

    this.gameState = 'MENU';
    this.elapsedTime = 0;
    this.score = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.runChapasCollected = 0;
    this.bonusChapasEarned = 0;
    this.bossSpawnCount = 0;
    this.tolcrapSpawned = false;
    this.supremeColossusSpawned = false;
    this.spawnTimer = 0;
    this.lastHitBossSprite = null;

    this.fireworksParticles = [];
    this.fireworkSpawnTimer = 0;
    this._currentTicketHasFireworks = false;

    this.runPortalRollDone = false;
    this.runHasDimensionPortal = false;
    this.dimensionEventChecked = false;
    this.dimensionPortalSpawned = false;
    this.dimensionPortalSprite = null;
    this.dimensionPortalPos = null;
    this.dimensionPortalTimer = 0;
    this.dimensionPortalCountdownText = null;
    this.corruptAreaZones = [];
    this.corruptAttackTimer = 1.6;
    this.corruptAttackIndex = 0;
    this.corruptDashState = null;
    this.inCraDimension = false;
    this.dimensionReturnPos = null;
    this.dimensionSavedEnemies = [];
    this.dimensionSavedGems = [];
    this.dimensionRoomGraphics = null;
    this.dimensionRoomBounds = null;
    this.dimensionTransitionLock = false;
    this.portalCheckTimer = 8;

    this.horde1Triggered = false;
    this.horde2Triggered = false;
    this.hordeActiveTimer = 0;
    this.hordeTier = 0;
    this.levelCleared = false;
    this.exitDoorSprite = null;
    this.exitDoorPos = null;
    this.exitDoorLabel = null;
    this.victoryFireworksActive = false;
    this.victoryFireworksTimer = 0;
    this.magnetPullActive = false;

    this.lastDirection = 'down';
    this.isLookingLeft = false;

    const groundTex = this.hasValidTexture('custom_block') ? 'custom_block' : 'ground_proc';

    this.bgTile = this.add.tileSprite(0, 0, 1280, 720, groundTex)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-1000);
    this.bgTile.setTileScale(1, 1);

    this.solidProps = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    this.gems = this.physics.add.group();
    this.drones = [];
    this.tamperFxGraphics = this.add.graphics().setDepth(getWorldEntityDepth(0, 12000));
    this.stunFxGraphics = this.add.graphics().setDepth(getWorldEntityDepth(0, 11900));
    this.portalArrowGraphics = this.add.graphics().setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 4);
    this.fireworksGraphics = this.add.graphics().setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 800);

    this.generateWastelandProps();

    this.player = this.physics.add.sprite(0, 0, 'gsosito_idle_front');
    this.player.setDepth(getWorldEntityDepth(this.player.y));
    this.player.body.setCircle(12, 10, 24);
    this.player.setData('stats', this.getDefaultStats());

    this.cameras.main.startFollow(this.player, true, 1, 1);

    this.physics.add.collider(this.player, this.solidProps);
    this.physics.add.collider(this.enemies, this.solidProps);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.projectiles, this.enemies, this.onProjectileHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.player, this.enemyProjectiles, this.onEnemyProjectileHit, null, this);
    this.physics.add.overlap(this.player, this.gems, this.onCollectGem, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.setupTouchJoystick();

    this.createHUD();
    this.bindUIEvents();
    this.updatePauseButtonVisibility();
    checkOrientation();

    this.scale.on('resize', () => {
      if (this.gameState === 'LEVELUP' && this._lastThermalDims) {
        const { finalW, finalH, finalY } = this._lastThermalDims;
        this.syncThermalBoxToTicketGraphic(finalW, finalH, finalY);
      }
      this.updateHUD();
    });
  }

  isInActiveRun() {
    return this.gameState === 'PLAYING' || this.gameState === 'PAUSED' || this.gameState === 'LEVELUP' || this.gameState === 'FUSION_MODAL' || this.gameState === 'VICTORY';
  }

  handleOrientationPause(isPortrait) {
    if (isPortrait) {
      if (this.gameState === 'PLAYING') {
        this._pausedByPortrait = true;
        this.gameState = 'PAUSED';
        this.physics.pause();
        this.joystick.active = false;
        this.joystick.dx = 0;
        this.joystick.dy = 0;
        if (this.joyGraphics) this.joyGraphics.clear();
        this.updatePauseButtonVisibility();
      }
    } else if (this._pausedByPortrait) {
      this._pausedByPortrait = false;
      const isPauseMenuOpen = pauseScreen && !pauseScreen.classList.contains('hidden');
      const isOptionsOpen = optionsModal && !optionsModal.classList.contains('hidden');
      const isFusionOpen = Boolean(document.getElementById('fusion-evolution-modal'));
      if (this.gameState === 'PAUSED' && !isPauseMenuOpen && !isOptionsOpen && !isFusionOpen) {
        this.physics.resume();
        this.gameState = 'PLAYING';
        this.updatePauseButtonVisibility();
      }
    }
  }

  getDefaultStats() {
    const meta = loadMeta();
    const hpBonus = (meta.levels.perm_hp || 0) * 15;
    const speedMult = 1 + (meta.levels.perm_speed || 0) * 0.08;
    const dmgMult = 1 + (meta.levels.perm_dmg || 0) * 0.15;
    const baseDmgReduction = Math.min(0.5, (meta.levels.perm_dmg_red || 0) * 0.05);
    const xpValueMult = 1 + (meta.levels.perm_xp || 0) * 0.15;

    return {
      hp: 100 + hpBonus,
      maxHp: 100 + hpBonus,
      xp: 0,
      xpToNext: 20,
      level: 1,
      speed: Math.round(100 * speedMult),
      pickupRange: 65,
      invulnTimer: 0,
      damageReduction: baseDmgReduction,
      xpValueMult: xpValueMult,
      veterancyLevel: 0,
      upgradeCounts: {},
      dronesEnabled: false,
      orbitals: 0,
      orbitalAngle: 0,
      droneOrbitRadius: 68,
      droneOrbitSpeed: 2.1,
      globalDamageMult: dmgMult,
      globalFirerateMult: 1,
      fusionActive: false,
      fusionTimer: 0,
      fusionCooldown: 1.28,
      fusionRingOffset: 0,
      weapon: {
        damage: 18,
        cooldown: 1,
        timer: 0,
        projectileSpeed: 350,
        projectileCount: 1,
        pierce: 1
      },
      domoFish: {
        enabled: false,
        level: 0,
        rays: 4,
        baseDamage: 16,
        baseCooldown: 3.2,
        timer: 0,
        ringOffset: 0,
        projectileSpeed: 290,
        pierce: 2
      },
      tamper: {
        enabled: false,
        level: 0,
        cooldown: 3.0,
        targets: 1,
        damage: 26,
        timer: 0
      },
      commLoss: {
        enabled: false,
        level: 0,
        cooldown: 11.5,
        minTargets: 1,
        maxTargets: 2,
        stunDuration: 2.4,
        timer: 0
      }
    };
  }

  createAnimations() {
    this.anims.create({
      key: 'gsosito_down',
      frames: this.anims.generateFrameNumbers('gsosito_walk_down', { start: 0, end: 1 }),
      frameRate: 4,
      repeat: -1
    });

    this.anims.create({
      key: 'gsosito_up',
      frames: this.anims.generateFrameNumbers('gsosito_walk_up', { start: 0, end: 1 }),
      frameRate: 4,
      repeat: -1
    });

    this.anims.create({
      key: 'gsosito_side',
      frames: this.anims.generateFrameNumbers('gsosito_walk_side', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    const animsList = [
      { key: 'catOrange_walk', prefix: 'catOrange', rate: 10 },
      { key: 'catGray_walk', prefix: 'catGray', rate: 10 },
      { key: 'mutantRat_walk', prefix: 'mutantRat', rate: 11 },
      { key: 'thief_walk', prefix: 'thief', rate: 7 },
      { key: 'logistics_walk', prefix: 'logistics', rate: 6 },
      { key: 'foreman_walk', prefix: 'foreman', rate: 5 },
      { key: 'crow_walk', prefix: 'crow', rate: 11 },
      { key: 'execSuit_walk', prefix: 'execSuit', rate: 5 },
      { key: 'forklift_walk', prefix: 'forklift', rate: 12 }
    ];

    animsList.forEach(a => {
      if (!this.anims.exists(a.key)) {
        this.anims.create({
          key: a.key,
          frames: [{ key: `${a.prefix}_0` }, { key: `${a.prefix}_1` }],
          frameRate: a.rate,
          repeat: -1
        });
      }
    });
  }

  generateWastelandProps() {
    this.solidProps.clear(true, true);
    const propTypes = [
      { key: 'prop_car', solid: true, w: 181, h: 83, weight: 2 },
      { key: 'prop_car_2', solid: true, w: 192, h: 72, weight: 2 },
      { key: 'prop_car_3', solid: true, w: 82, h: 193, weight: 2 },
      { key: 'prop_barrier', solid: true, w: 28, h: 12, weight: 3 },
      { key: 'prop_barrel', solid: true, w: 27, h: 32, weight: 3 },
      { key: 'prop_barrel_2', solid: true, w: 27, h: 32, weight: 3 },
      { key: 'prop_crate', solid: true, w: 48, h: 32, weight: 3 },
      { key: 'prop_crate_2', solid: true, w: 48, h: 32, weight: 3 }
    ].filter(t => this.hasValidTexture(t.key));

    if (propTypes.length === 0) return;

    const placed = [];
    const minSpacing = 125;
    const sameTypeRadius = 380;
    const mapMin = -2200;
    const mapMax = 2200;
    const cellSize = 420;

    const cells = [];
    for (let gx = mapMin; gx < mapMax; gx += cellSize) {
      for (let gy = mapMin; gy < mapMax; gy += cellSize) {
        cells.push({ gx, gy });
      }
    }
    Phaser.Utils.Array.Shuffle(cells);

    for (const cell of cells) {
      const margin = 45;
      const px = Phaser.Math.Between(cell.gx + margin, Math.min(mapMax, cell.gx + cellSize - margin));
      const py = Phaser.Math.Between(cell.gy + margin, Math.min(mapMax, cell.gy + cellSize - margin));

      if (Math.hypot(px, py) < 185) continue;

      if (placed.some(p => Math.hypot(p.x - px, p.y - py) < minSpacing)) continue;

      const nearbyKeys = new Set(
        placed
          .filter(p => Math.hypot(p.x - px, p.y - py) < sameTypeRadius)
          .map(p => p.key)
      );

      let candidates = propTypes.filter(t => !nearbyKeys.has(t.key));
      if (candidates.length === 0) candidates = propTypes;

      const totalWeight = candidates.reduce((acc, t) => acc + t.weight, 0);
      let r = Math.random() * totalWeight;
      let chosen = candidates[0];
      for (const item of candidates) {
        r -= item.weight;
        if (r <= 0) {
          chosen = item;
          break;
        }
      }

      placed.push({ x: px, y: py, key: chosen.key });

      if (chosen.solid) {
        const obj = this.solidProps.create(px, py, chosen.key);
        obj.setDepth(getWorldEntityDepth(py));
        obj.body.setSize(chosen.w, chosen.h);
        obj.refreshBody();
      } else {
        this.add.image(px, py, chosen.key).setDepth(-5);
      }
    }
  }

  setupTouchJoystick() {
    this.joystick = { active: false, pointerId: null, startX: 0, startY: 0, dx: 0, dy: 0, maxR: 42 };
    this.joyGraphics = this.add.graphics().setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 3);

    this.input.on('pointerdown', (pointer) => {
      if (this.gameState !== 'PLAYING' || this.joystick.active) return;
      const targetEl = pointer.event && pointer.event.target;
      if (targetEl && targetEl.closest && targetEl.closest('button, .modern-panel, .overlay:not(.hidden), #ios-fs-toast, #fusion-evolution-modal')) {
        return;
      }
      AudioSys.init();
      this.joystick.active = true;
      this.joystick.pointerId = pointer.id;
      this.joystick.startX = pointer.x;
      this.joystick.startY = pointer.y;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
    });

    this.input.on('pointermove', (pointer) => {
      if (!this.joystick.active || pointer.id !== this.joystick.pointerId) return;
      const diffX = pointer.x - this.joystick.startX;
      const diffY = pointer.y - this.joystick.startY;
      const dist = Math.hypot(diffX, diffY);
      if (dist > 0) {
        const clamped = Math.min(dist, this.joystick.maxR);
        this.joystick.dx = (diffX / dist) * (clamped / this.joystick.maxR);
        this.joystick.dy = (diffY / dist) * (clamped / this.joystick.maxR);
      }
    });

    const releaseJoystick = (pointer) => {
      if (!this.joystick.active || pointer.id !== this.joystick.pointerId) return;
      this.joystick.active = false;
      this.joystick.pointerId = null;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      this.joyGraphics.clear();
    };

    this.input.on('pointerup', releaseJoystick);
    this.input.on('pointercancel', releaseJoystick);
  }

  createHUD() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.hudGraphics = this.add.graphics().setScrollFactor(0).setDepth(HUD_BASE_DEPTH);
    this.hudPortrait = this.add.image(31, 31, 'retrato_1').setScale(1).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 1);

    const fontStyle = {
      fontFamily: '"Chakra Petch", "Press Start 2P", monospace',
      fontStyle: 'bold',
      resolution: dpr,
      stroke: '#000000',
      strokeThickness: 2
    };

    this.hudLevelText = this.add.text(58, 10, 'NV.1', {
      ...fontStyle,
      fontSize: '12px',
      color: '#facc15'
    }).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    this.hudHpText = this.add.text(60, 24, '100/100', {
      ...fontStyle,
      fontSize: '10px',
      color: '#ffffff'
    }).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    this.hudXpText = this.add.text(60, 38, 'XP 0/20', {
      ...fontStyle,
      fontSize: '10px',
      color: '#e0f2fe'
    }).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    const hudInfoStyle = {
      fontFamily: '"Chakra Petch", "Press Start 2P", monospace',
      fontStyle: 'bold',
      resolution: dpr,
      stroke: '#000000',
      strokeThickness: 3
    };

    this.hudTimeText = this.add.text(this.scale.width / 2, 10, '00:00 / 12:00', {
      ...hudInfoStyle,
      fontSize: '16px',
      color: '#f8fafc'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    this.hudKillsText = this.add.text(10, 62, 'BAJAS: 0', {
      ...hudInfoStyle,
      fontSize: '13px',
      color: '#facc15'
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    const hudChapaTex = this.resolveCustomOrFallbackTexture('chapa', 'chapa_fallback');
    this.hudChapaIcon = this.add.image(18, 87, hudChapaTex)
      .setDisplaySize(15, 15)
      .setScrollFactor(0)
      .setDepth(HUD_BASE_DEPTH + 2);

    this.hudChapaText = this.add.text(30, 80, '0', {
      ...hudInfoStyle,
      fontSize: '13px',
      color: '#fde047'
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    this.hordeBannerText = this.add.text(this.scale.width / 2, 92, '⚠️ SE ACERCA UNA HORDA DE ENEMIGOS ⚠️', {
      ...hudInfoStyle,
      fontSize: '14px',
      color: '#ef4444',
      backgroundColor: 'rgba(9, 13, 20, 0.78)',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2).setVisible(false);

    this.bossHudGraphics = this.add.graphics().setScrollFactor(0).setDepth(HUD_BASE_DEPTH);

    this.bossHudNameText = this.add.text(this.scale.width / 2, this.scale.height - 42, '', {
      ...hudInfoStyle,
      fontSize: '12px',
      color: '#e9d5ff'
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2).setVisible(false);

    this.bossHudHpText = this.add.text(this.scale.width / 2, this.scale.height - 23, '', {
      ...fontStyle,
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2).setVisible(false);
  }

  spawnFireworkBurst() {
    const colors = [0xfacc15, 0x38bdf8, 0xf43f5e, 0xc084fc, 0x4ade80, 0xfb923c];
    const cx = Phaser.Math.Between(Math.round(this.scale.width * 0.15), Math.round(this.scale.width * 0.85));
    const cy = Phaser.Math.Between(Math.round(this.scale.height * 0.14), Math.round(this.scale.height * 0.55));
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = 26;

    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.15;
      const spd = Phaser.Math.Between(70, 210);
      this.fireworksParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0.9 + Math.random() * 0.35,
        maxLife: 1.25,
        color,
        size: Math.random() < 0.4 ? 3.5 : 2.5
      });
    }
    AudioSys.fireworkPop();
  }

  updateFireworks(dt) {
    if (!this.fireworksGraphics) return;
    const g = this.fireworksGraphics;
    g.clear();

    if ((this.gameState === 'LEVELUP' && this._currentTicketHasFireworks) || this.victoryFireworksActive) {
      this.fireworkSpawnTimer -= dt;
      if (this.fireworkSpawnTimer <= 0) {
        this.spawnFireworkBurst();
        this.fireworkSpawnTimer = this.victoryFireworksActive ? 0.38 : 0.65;
      }
    }

    if (!this.fireworksParticles || this.fireworksParticles.length === 0) return;

    const alive = [];
    for (const p of this.fireworksParticles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += 120 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      g.fillStyle(p.color, alpha);
      g.fillCircle(p.x, p.y, p.size);
      alive.push(p);
    }
    this.fireworksParticles = alive;
  }

  clearFireworks() {
    this.fireworksParticles = [];
    if (this.fireworksGraphics) this.fireworksGraphics.clear();
  }

  // --- NOTIFICACIÓN MODAL ESPECTACULAR DE FUSIÓN DE ARMAMENTO ---
  showFusionUnlockBanner() {
    this._pausedByPortrait = false;
    this.gameState = 'FUSION_MODAL';
    this.physics.pause();
    this.joystick.active = false;
    this.joystick.pointerId = null;
    this.joystick.dx = 0;
    this.joystick.dy = 0;
    if (this.joyGraphics) this.joyGraphics.clear();
    this.updatePauseButtonVisibility();

    this.cameras.main.flash(360, 192, 132, 252, false);
    this.cameras.main.shake(260, 0.014);
    AudioSys.fusionUnlock();

    let modal = document.getElementById('fusion-evolution-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'fusion-evolution-modal';
    modal.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483000',
      'pointer-events:auto',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:14px',
      'background:radial-gradient(circle at center, rgba(88,28,135,0.78) 0%, rgba(6,9,15,0.94) 85%)',
      'backdrop-filter:blur(4px)',
      'animation:fusionFadeIn 0.25s ease-out'
    ].join(';');

    modal.innerHTML = `
      <style>
        @keyframes fusionFadeIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fusionPulseIcon {
          0%, 100% { transform: scale(1) rotate(-3deg); filter: drop-shadow(0 0 10px #c084fc); }
          50% { transform: scale(1.12) rotate(3deg); filter: drop-shadow(0 0 20px #facc15); }
        }
        #fusion-evolution-card {
          width: min(490px, 94vw);
          background: linear-gradient(165deg, #1b0b2e 0%, #0f172a 55%, #1e1035 100%);
          border: 2.5px solid #c084fc;
          box-shadow: 0 0 32px rgba(168,85,247,0.65), inset 0 0 18px rgba(250,204,21,0.18);
          border-radius: 14px;
          padding: 16px 18px;
          color: #f8fafc;
          font-family: "Chakra Petch", sans-serif;
          text-align: center;
          position: relative;
          pointer-events: auto;
        }
        .fusion-badge {
          display: inline-block;
          background: linear-gradient(90deg, #9333ea, #c026d3);
          color: #fef08a;
          font-family: "Silkscreen", monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid #facc15;
          margin-bottom: 8px;
        }
        .fusion-hero-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 6px 0 10px;
        }
        .fusion-ingredient {
          background: rgba(15,23,42,0.85);
          border: 1.5px solid #64748b;
          border-radius: 10px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 700;
          color: #cbd5e1;
        }
        .fusion-result-icon {
          width: 62px;
          height: 62px;
          border-radius: 14px;
          background: radial-gradient(circle, #581c87 0%, #1e1b4b 100%);
          border: 2.5px solid #facc15;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          animation: fusionPulseIcon 1.4s infinite ease-in-out;
        }
        .fusion-title {
          font-family: "Silkscreen", monospace;
          font-size: 16px;
          color: #facc15;
          text-shadow: 0 2px 8px rgba(192,132,252,0.8);
          margin: 2px 0 6px;
        }
        .fusion-desc {
          font-size: 13px;
          line-height: 1.4;
          color: #e2e8f0;
          background: rgba(9,13,20,0.65);
          border: 1px solid rgba(192,132,252,0.35);
          border-radius: 9px;
          padding: 9px 12px;
          margin-bottom: 12px;
        }
        .fusion-desc strong { color: #e879f9; }
        #fusion-accept-btn {
          width: 100%;
          padding: 11px 16px;
          font-family: "Silkscreen", monospace;
          font-size: 13px;
          font-weight: 700;
          color: #090d14;
          background: linear-gradient(90deg, #facc15, #fde047);
          border: 2px solid #ffffff;
          border-radius: 9px;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(250,204,21,0.45);
          pointer-events: auto;
        }
        #fusion-accept-btn:active { transform: scale(0.98); }
      </style>
      <div id="fusion-evolution-card">
        <div class="fusion-badge">⚡ EVOLUCIÓN DE ARMAMENTO DESBLOQUEADA ⚡</div>
        <div class="fusion-hero-row">
          <div class="fusion-ingredient">🔴 Láser<br><span style="color:#facc15;font-size:10px;">NV. 5+</span></div>
          <div style="font-size:18px;color:#facc15;font-weight:900;">+</div>
          <div class="fusion-result-icon">🟣⚡</div>
          <div style="font-size:18px;color:#facc15;font-weight:900;">+</div>
          <div class="fusion-ingredient">🔮 Domo-Fish<br><span style="color:#38bdf8;font-size:10px;">NV. 5+</span></div>
        </div>
        <div class="fusion-title">RAYO OMEGA MORADO</div>
        <div class="fusion-desc">
          Tus dos sistemas láser se han fundido en un único núcleo de plasma violeta: emite un <strong>anillo giratorio de 360°</strong> con perforación y dispara <strong>ráfagas concentradas</strong> contra el objetivo más cercano.
        </div>
        <button id="fusion-accept-btn" type="button">¡ENTENDIDO, A REPARTIR CAÑA! ▶</button>
      </div>
    `;

    document.body.appendChild(modal);

    const closeFusionModal = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      AudioSys.pickup();
      const currentModal = document.getElementById('fusion-evolution-modal');
      if (currentModal) currentModal.remove();
      this._pausedByPortrait = false;
      this.gameState = 'PLAYING';
      this.physics.resume();
      this.updatePauseButtonVisibility();
      checkOrientation();
    };

    const acceptBtn = document.getElementById('fusion-accept-btn');
    if (acceptBtn) {
      acceptBtn.style.pointerEvents = 'auto';
      acceptBtn.style.position = 'relative';
      acceptBtn.style.zIndex = '2';
      acceptBtn.onclick = closeFusionModal;
      acceptBtn.onpointerup = closeFusionModal;
    }
  }

  checkAndTriggerFusion(st) {
    if (!canFuseWeapons(st)) return false;
    st.fusionActive = true;
    st.fusionTimer = 0.05;
    st.domoFish.enabled = false;
    this.showFusionUnlockBanner();
    return true;
  }

  clearPortalVisuals() {
    if (this.dimensionPortalSprite) {
      this.tweens.killTweensOf(this.dimensionPortalSprite);
      this.dimensionPortalSprite.destroy();
      this.dimensionPortalSprite = null;
    }
    if (this.dimensionPortalCountdownText) {
      this.dimensionPortalCountdownText.destroy();
      this.dimensionPortalCountdownText = null;
    }
    this.dimensionPortalPos = null;
    this.dimensionPortalTimer = 0;
    if (this.portalArrowGraphics) {
      this.portalArrowGraphics.clear();
    }
  }

  clearCorruptBossEffects() {
    if (Array.isArray(this.corruptAreaZones)) {
      this.corruptAreaZones.forEach(z => {
        if (z && z.gfx) z.gfx.destroy();
      });
    }
    this.corruptAreaZones = [];
    if (this.corruptDashState && this.corruptDashState.previewGfx) {
      this.corruptDashState.previewGfx.destroy();
    }
    this.corruptDashState = null;
  }

  clearDimensionRoomVisuals() {
    this.clearCorruptBossEffects();
    if (this.dimensionRoomFloorTile) {
      this.dimensionRoomFloorTile.destroy();
      this.dimensionRoomFloorTile = null;
    }
    if (this.dimensionRoomGraphics) {
      this.dimensionRoomGraphics.destroy();
      this.dimensionRoomGraphics = null;
    }
    this.dimensionRoomBounds = null;
  }

  tryRollDimensionPortal(dt) {
    if (this.dimensionEventChecked || this.dimensionPortalSpawned || this.inCraDimension) return;

    if (!this.runPortalRollDone) {
      this.runPortalRollDone = true;
      this.runHasDimensionPortal = Math.random() < 0.05;
    }

    if (!this.runHasDimensionPortal) {
      this.dimensionEventChecked = true;
      return;
    }

    if (this.elapsedTime < 90) return;

    this.portalCheckTimer -= dt;
    if (this.portalCheckTimer > 0) return;
    this.portalCheckTimer = 4;

    this.dimensionEventChecked = true;
    this.spawnDimensionPortal();
  }

  spawnDimensionPortal() {
    if (this.dimensionPortalSpawned) return;
    this.dimensionPortalSpawned = true;
    this.dimensionPortalTimer = 60;

    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(360, 560);
    const px = Math.round(this.player.x + Math.cos(angle) * dist);
    const py = Math.round(this.player.y + Math.sin(angle) * dist);

    this.dimensionPortalPos = { x: px, y: py };
    const portalTex = this.resolveCustomOrFallbackTexture('dim_portal_img', 'dim_portal');
    this.dimensionPortalSprite = this.add.sprite(px, py, portalTex)
      .setDepth(getWorldEntityDepth(py, -2))
      .setScale(1.1);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dimensionPortalCountdownText = this.add.text(px, py - 40, '01:00', {
      fontFamily: '"Chakra Petch", monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#e0f2fe',
      backgroundColor: 'rgba(9, 13, 20, 0.85)',
      padding: { x: 6, y: 2 },
      stroke: '#0284c7',
      strokeThickness: 2,
      resolution: dpr
    }).setOrigin(0.5).setDepth(getWorldEntityDepth(py, 15));

    this.tweens.add({
      targets: this.dimensionPortalSprite,
      scale: { from: 1.02, to: 1.2 },
      alpha: { from: 0.88, to: 1 },
      duration: 650,
      yoyo: true,
      repeat: -1
    });

    AudioSys.portalOpen();
    this.addFloatingText(this.player.x, this.player.y - 36, '🌀 ¡PORTAL ABIERTO! (1:00 PARA ENTRAR)', '#38bdf8');
  }

  updateDimensionPortalTimer(dt) {
    if (
      this.inCraDimension ||
      !this.dimensionPortalSpawned ||
      !this.dimensionPortalSprite ||
      !this.dimensionPortalSprite.active
    ) {
      return;
    }

    this.dimensionPortalTimer = Math.max(0, (this.dimensionPortalTimer || 0) - dt);

    if (this.dimensionPortalCountdownText && this.dimensionPortalCountdownText.active && this.dimensionPortalPos) {
      const rem = Math.ceil(this.dimensionPortalTimer);
      const mm = String(Math.floor(rem / 60)).padStart(2, '0');
      const ss = String(rem % 60).padStart(2, '0');
      this.dimensionPortalCountdownText
        .setPosition(this.dimensionPortalPos.x, this.dimensionPortalPos.y - 40)
        .setText(`${mm}:${ss}`)
        .setColor(rem <= 10 ? '#fca5a5' : '#e0f2fe');
    }

    if (this.dimensionPortalTimer <= 0) {
      const px = this.dimensionPortalPos ? this.dimensionPortalPos.x : this.player.x;
      const py = this.dimensionPortalPos ? this.dimensionPortalPos.y : this.player.y;
      this.clearPortalVisuals();
      this.addFloatingText(px, py - 24, '💨 EL PORTAL SE HA CERRADO', '#94a3b8');
    }
  }

  updatePortalArrowHUD() {
    if (!this.portalArrowGraphics) return;
    const g = this.portalArrowGraphics;
    g.clear();

    if (this.gameState !== 'PLAYING' || this.inCraDimension) return;

    let targetPos = null;
    let arrowColor = 0x38bdf8;

    if (this.levelCleared && this.exitDoorPos && this.exitDoorSprite && this.exitDoorSprite.active) {
      targetPos = this.exitDoorPos;
      arrowColor = 0xfacc15;
    } else if (
      this.dimensionPortalSpawned &&
      this.dimensionPortalPos &&
      this.dimensionPortalSprite &&
      this.dimensionPortalSprite.active
    ) {
      targetPos = this.dimensionPortalPos;
      arrowColor = 0x38bdf8;
    }

    if (!targetPos) return;

    const dx = targetPos.x - this.player.x;
    const dy = targetPos.y - this.player.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 150) {
      const angle = Math.atan2(dy, dx);
      const centerX = this.scale.width / 2;
      const centerY = this.scale.height / 2;
      const radiusX = Math.max(80, this.scale.width * 0.34);
      const radiusY = Math.max(60, this.scale.height * 0.32);

      const ax = centerX + Math.cos(angle) * radiusX;
      const ay = centerY + Math.sin(angle) * radiusY;

      const tipX = ax + Math.cos(angle) * 9;
      const tipY = ay + Math.sin(angle) * 9;
      const leftX = ax + Math.cos(angle + 2.42) * 8.5;
      const leftY = ay + Math.sin(angle + 2.42) * 8.5;
      const backX = ax + Math.cos(angle + Math.PI) * 4.5;
      const backY = ay + Math.sin(angle + Math.PI) * 4.5;
      const rightX = ax + Math.cos(angle - 2.42) * 8.5;
      const rightY = ay + Math.sin(angle - 2.42) * 8.5;

      g.fillStyle(0x090d14, 0.88);
      g.fillCircle(ax, ay, 14);
      g.lineStyle(2, arrowColor, 1);
      g.strokeCircle(ax, ay, 14);

      g.fillStyle(arrowColor, 1);
      g.fillPoints([
        { x: tipX, y: tipY },
        { x: leftX, y: leftY },
        { x: backX, y: backY },
        { x: rightX, y: rightY }
      ], true);
    }
  }

  enterCraWhiteDimension() {
    if (this.inCraDimension || this.dimensionTransitionLock) return;
    this.dimensionTransitionLock = true;

    this.dimensionReturnPos = { x: this.player.x, y: this.player.y };

    this.dimensionSavedEnemies = [];
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const d = e.getData('enemy');
      if (d && d.hpBar) d.hpBar.setVisible(false);
      this.dimensionSavedEnemies.push({
        sprite: e,
        x: e.x,
        y: e.y,
        vx: e.body ? e.body.velocity.x : 0,
        vy: e.body ? e.body.velocity.y : 0
      });
      e.setActive(false).setVisible(false);
      if (e.body) e.body.enable = false;
    });

    this.dimensionSavedGems = [];
    this.gems.getChildren().forEach(gm => {
      if (!gm.active) return;
      this.dimensionSavedGems.push({ sprite: gm });
      gm.setActive(false).setVisible(false);
      if (gm.body) gm.body.enable = false;
    });

    this.projectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    if (this.tamperFxGraphics) this.tamperFxGraphics.clear();

    if (this.dimensionPortalSprite) {
      this.dimensionPortalSprite.setVisible(false);
    }
    if (this.dimensionPortalCountdownText) {
      this.dimensionPortalCountdownText.setVisible(false);
    }
    if (this.portalArrowGraphics) {
      this.portalArrowGraphics.clear();
    }

    const roomHalfW = 400;
    const roomHalfH = 280;
    const playerRadiusPad = 14;
    this.dimensionRoomBounds = {
      minX: -roomHalfW + playerRadiusPad,
      maxX: roomHalfW - playerRadiusPad,
      minY: -roomHalfH + playerRadiusPad,
      maxY: roomHalfH - playerRadiusPad
    };

    this.clearDimensionRoomVisuals();
    const rg = this.add.graphics().setDepth(-500);

    rg.fillStyle(0x090d14, 1);
    rg.fillRect(-roomHalfW - 600, -roomHalfH - 600, (roomHalfW + 600) * 2, (roomHalfH + 600) * 2);

    if (this.hasValidTexture('cra_white_floor_img')) {
      const floorTile = this.add.tileSprite(0, 0, roomHalfW * 2, roomHalfH * 2, 'cra_white_floor_img')
        .setOrigin(0.5, 0.5)
        .setDepth(-499);
      this.dimensionRoomFloorTile = floorTile;
    } else {
      const tileSize = 80;
      for (let tx = -roomHalfW; tx < roomHalfW; tx += tileSize) {
        for (let ty = -roomHalfH; ty < roomHalfH; ty += tileSize) {
          const ix = Math.round((tx + roomHalfW) / tileSize);
          const iy = Math.round((ty + roomHalfH) / tileSize);
          const isAlt = ((ix + iy) % 2) === 0;
          rg.fillStyle(isAlt ? 0xffffff : 0xf1f5f9, 1);
          rg.fillRect(tx, ty, tileSize, tileSize);
          rg.lineStyle(1, 0xcbd5e1, 1);
          rg.strokeRect(tx, ty, tileSize, tileSize);
        }
      }
    }

    rg.lineStyle(2, 0x94a3b8, 0.65);
    rg.strokeCircle(0, 0, 95);
    rg.lineStyle(4, 0x0f172a, 1);
    rg.strokeRect(-roomHalfW, -roomHalfH, roomHalfW * 2, roomHalfH * 2);
    rg.lineStyle(2, 0x38bdf8, 0.85);
    rg.strokeRect(-roomHalfW + 4, -roomHalfH + 4, roomHalfW * 2 - 8, roomHalfH * 2 - 8);

    this.dimensionRoomGraphics = rg;
    this.bgTile.setVisible(false);
    this.solidProps.getChildren().forEach(p => p.setVisible(false));

    this.inCraDimension = true;
    this.lastHitBossSprite = null;
    this.corruptAttackTimer = 1.6;
    this.corruptAttackIndex = 0;
    this.corruptDashState = null;
    this.player.setPosition(0, 120);
    this.player.setVelocity(0, 0);

    AudioSys.dimensionShift();
    this.cameras.main.flash(260, 240, 249, 255, false);

    this.spawnCorruptOperatorBoss(0, -65);

    this.time.delayedCall(250, () => {
      this.dimensionTransitionLock = false;
    });
  }

  spawnCorruptOperatorBoss(bx, by) {
    const diff = 1 + this.elapsedTime / 140;
    const corruptTex = this.resolveCustomOrFallbackTexture('corrupt_operator_img', 'corrupt_operator_boss');
    const boss = this.enemies.create(bx, by, corruptTex)
      .setDepth(getEnemyDepth({ y: by }, true))
      .setScale(1.2);
    boss.body.setCircle(20, 12, 22);

    const hpBar = this.add.graphics().setDepth(getEnemyDepth({ y: by }, true) + 2);
    const maxHp = Math.round(1150 * Math.max(1, diff));

    boss.setData('enemy', {
      name: 'OPERADOR CORRUPTO',
      hp: maxHp,
      maxHp,
      speed: 58,
      damage: 28,
      xp: 220,
      isBoss: true,
      isCorruptOperator: true,
      facingLeftByDefault: false,
      purpleOrbTimer: 1.5,
      orbCd: 0,
      hpBar
    });

    this.lastHitBossSprite = boss;
    this.addFloatingText(this.player.x, this.player.y - 36, '⚠️ SALA CRA BLANCA · OPERADOR CORRUPTO', '#0284c7');
  }

  exitCraDimension(defeatedBoss) {
    if (!this.inCraDimension || this.dimensionTransitionLock) return;
    this.dimensionTransitionLock = true;

    this.enemies.getChildren().forEach(e => {
      const d = e.getData('enemy');
      if (d && d.hpBar) d.hpBar.destroy();
    });
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    this.gems.getChildren().forEach(gm => {
      const gd = gm && gm.getData ? gm.getData('gem') : null;
      if (gd && gd.beamTween) gd.beamTween.stop();
      if (gd && gd.beamGfx) gd.beamGfx.destroy();
    });
    this.gems.clear(true, true);
    if (this.tamperFxGraphics) this.tamperFxGraphics.clear();

    this.clearDimensionRoomVisuals();
    this.bgTile.setVisible(true);
    this.solidProps.getChildren().forEach(p => { if (p && p.setVisible) p.setVisible(true); });

    if (Array.isArray(this.dimensionSavedEnemies)) {
      this.dimensionSavedEnemies.forEach(item => {
        const sp = item.sprite;
        if (!sp || !sp.scene) return;
        sp.setActive(true).setVisible(true);
        sp.setPosition(item.x, item.y);
        if (sp.body) {
          sp.body.enable = true;
          sp.setVelocity(item.vx, item.vy);
        }
        const d = sp.getData('enemy');
        if (d && d.hpBar) d.hpBar.setVisible(true);
      });
    }
    this.dimensionSavedEnemies = [];

    if (Array.isArray(this.dimensionSavedGems)) {
      this.dimensionSavedGems.forEach(item => {
        const gm = item.sprite;
        if (!gm || !gm.scene) return;
        gm.setActive(true).setVisible(true);
        if (gm.body) gm.body.enable = true;
      });
    }
    this.dimensionSavedGems = [];

    const retPos = this.dimensionReturnPos || { x: 0, y: 0 };
    this.inCraDimension = false;
    this.dimensionReturnPos = null;
    this.lastHitBossSprite = null;

    this.clearPortalVisuals();

    this.player.setPosition(retPos.x, retPos.y);
    this.player.setVelocity(0, 0);

    const st = this.player.getData('stats');
    st.invulnTimer = Math.max(st.invulnTimer || 0, 1.4);

    if (defeatedBoss) {
      const rewardChapas = Phaser.Math.Between(18, 26);
      this.score += 2500;
      st.hp = Math.min(st.maxHp, st.hp + Math.round(st.maxHp * 0.45));
      st.xp += 45;

      this.spawnBossLootChest(retPos.x + 28, retPos.y - 10, rewardChapas);

      const drop = this.gems.create(retPos.x - 24, retPos.y - 20, 'bolt')
        .setDepth(getWorldEntityDepth(retPos.y - 20, -5))
        .setTint(0xef4444)
        .setScale(1.35);
      drop.setData('gem', { type: 'xp_tier', tier: 'red', value: 45 });

      AudioSys.levelUp();
      this.addFloatingText(
        retPos.x,
        retPos.y - 38,
        '🏆 ¡OPERADOR CORRUPTO DERROTADO! RECOGE EL COFRE',
        '#4ade80'
      );

      if (st.xp >= st.xpToNext) {
        st.xp -= st.xpToNext;
        st.level++;
        st.xpToNext = Math.round(st.xpToNext * 1.24 + 8);
        this.time.delayedCall(260, () => {
          if (this.gameState === 'PLAYING') this.triggerLevelUp();
        });
      }
    } else {
      st.hp = Math.max(30, Math.round(st.maxHp * 0.35));
      AudioSys.dimensionShift();
      this.addFloatingText(
        retPos.x,
        retPos.y - 34,
        '⚡ ¡EXPULSADO DE LA SALA CRA CON VIDA DE EMERGENCIA!',
        '#facc15'
      );
    }

    this.time.delayedCall(250, () => {
      this.dimensionTransitionLock = false;
    });
  }

  showHordeBanner(msg, color = '#ef4444') {
    if (!this.hordeBannerText) return;
    this.tweens.killTweensOf(this.hordeBannerText);
    this.hordeBannerText
      .setPosition(this.scale.width / 2, 86)
      .setText(msg)
      .setColor(color)
      .setAlpha(1)
      .setVisible(true);

    this.tweens.add({
      targets: this.hordeBannerText,
      alpha: 0.15,
      duration: 280,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        if (this.hordeBannerText) {
          this.hordeBannerText.setVisible(false);
          this.hordeBannerText.setAlpha(1);
        }
      }
    });
  }

  triggerFirstHordeEvent() {
    if (this.horde1Triggered) return;
    this.horde1Triggered = true;
    this.hordeTier = 1;
    this.hordeActiveTimer = 36;

    AudioSys.hordeAlert();
    this.showHordeBanner('⚠️ ¡PRIMERA HORDA DE ENEMIGOS! ⚠️', '#f97316');

    this.spawnBlockingFormation(12, false);
    for (let i = 0; i < 8; i++) {
      this.spawnEnemy(false, false, null, null, 1.15);
    }
  }

  triggerSecondHordeEvent() {
    if (this.horde2Triggered) return;
    this.horde2Triggered = true;
    this.hordeTier = 2;
    this.hordeActiveTimer = 46;

    AudioSys.hordeAlert();
    this.cameras.main.shake(220, 0.012);
    this.showHordeBanner('🔥 ¡SEGUNDA HORDA MASIVA EN CAMINO! 🔥', '#ef4444');

    this.spawnBlockingFormation(18, true);
    for (let i = 0; i < 16; i++) {
      this.spawnEnemy(false, false, null, null, 1.65);
    }
  }

  clearExitDoorVisuals() {
    if (this.exitDoorSprite) {
      this.tweens.killTweensOf(this.exitDoorSprite);
      this.exitDoorSprite.destroy();
      this.exitDoorSprite = null;
    }
    if (this.exitDoorLabel) {
      this.tweens.killTweensOf(this.exitDoorLabel);
      this.exitDoorLabel.destroy();
      this.exitDoorLabel = null;
    }
    this.exitDoorPos = null;
  }

  onSupremeBossDefeated(bossX, bossY) {
    if (this.levelCleared) return;
    this.levelCleared = true;
    this.hordeActiveTimer = 0;
    this.hordeTier = 0;

    this.enemies.getChildren().forEach(e => {
      if (!e || !e.active) return;
      const d = e.getData('enemy');
      if (d && d.hpBar) d.hpBar.destroy();
      this.addFloatingText(e.x, e.y - 10, '💥', '#facc15');
    });
    this.enemies.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    this.lastHitBossSprite = null;

    this.victoryFireworksActive = true;
    this.victoryFireworksTimer = 18;
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 220, () => {
        if (this.gameState === 'PLAYING' || this.gameState === 'VICTORY') {
          this.spawnFireworkBurst();
        }
      });
    }

    const chestX = bossX - 28;
    const chestY = bossY + 12;
    this.spawnBossLootChest(chestX, chestY, Phaser.Math.Between(45, 65));

    const doorX = bossX + 44;
    const doorY = bossY - 6;
    this.exitDoorPos = { x: doorX, y: doorY };
    this.exitDoorSprite = this.add.sprite(doorX, doorY, 'exit_door')
      .setDepth(getWorldEntityDepth(doorY, 6))
      .setScale(1.18);

    this.tweens.add({
      targets: this.exitDoorSprite,
      scale: { from: 1.12, to: 1.26 },
      duration: 580,
      yoyo: true,
      repeat: -1
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.exitDoorLabel = this.add.text(doorX, doorY - 46, '🚪 SALIDA DEL NIVEL', {
      fontFamily: '"Chakra Petch", monospace',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fef08a',
      backgroundColor: 'rgba(9, 13, 20, 0.88)',
      padding: { x: 7, y: 3 },
      stroke: '#ca8a04',
      strokeThickness: 2,
      resolution: dpr
    }).setOrigin(0.5).setDepth(getWorldEntityDepth(doorY, 20));

    this.tweens.add({
      targets: this.exitDoorLabel,
      y: doorY - 52,
      duration: 650,
      yoyo: true,
      repeat: -1
    });

    AudioSys.portalOpen();
    this.cameras.main.flash(320, 250, 204, 21, false);
    this.addFloatingText(this.player.x, this.player.y - 44, '🏆 ¡JEFE SUPREMO DERROTADO! RECOGE EL COFRE Y CRUZA LA PUERTA', '#facc15');
  }

  completeLevelVictory() {
    if (this.gameState === 'VICTORY' || this.gameState === 'GAMEOVER') return;
    this.clearPortalVisuals();
    this.clearDimensionRoomVisuals();
    this.clearExitDoorVisuals();
    const _fm = document.getElementById('fusion-evolution-modal'); if (_fm) _fm.remove();
    this._currentTicketHasFireworks = false;
    this.inCraDimension = false;
    this.gameState = 'VICTORY';
    this.physics.pause();
    this.joystick.active = false;
    this.joystick.pointerId = null;
    this._pausedByPortrait = false;
    this.updatePauseButtonVisibility();

    AudioSys.fusionUnlock();

    const st = this.player.getData('stats');
    const clearBonusChapas = 30;
    this.bonusChapasEarned = (this.bonusChapasEarned || 0) + clearBonusChapas;
    const earnedChapas = (this.runChapasCollected || 0) + (this.bonusChapasEarned || 0);
    const meta = loadMeta();
    meta.chapas += earnedChapas;
    saveMeta(meta);
    refreshMenuChatarraUI();

    const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.elapsedTime % 60)).padStart(2, '0');

    let victoryModal = document.getElementById('victory-screen-modal');
    if (victoryModal) victoryModal.remove();

    const hasEndImg = this.hasValidTexture('end_bg');

    victoryModal = document.createElement('div');
    victoryModal.id = 'victory-screen-modal';
    victoryModal.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:13000',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:14px',
      'background:radial-gradient(circle at center, rgba(202,138,4,0.42) 0%, rgba(6,9,15,0.94) 85%)',
      'backdrop-filter:blur(4px)'
    ].join(';');

    victoryModal.innerHTML = `
      <div style="
        width:min(520px, 94vw);
        max-height:92vh;
        overflow-y:auto;
        background:linear-gradient(165deg, #111827 0%, #090d16 65%, #1c1917 100%);
        border:2.5px solid #facc15;
        box-shadow:0 0 36px rgba(250,204,21,0.55), inset 0 0 20px rgba(250,204,21,0.14);
        border-radius:14px;
        padding:16px 18px;
        color:#f8fafc;
        font-family:'Chakra Petch', sans-serif;
        text-align:center;
      ">
        <div style="
          display:inline-block;
          background:linear-gradient(90deg, #ca8a04, #eab308);
          color:#090d14;
          font-family:'Silkscreen', monospace;
          font-size:10px;
          font-weight:700;
          padding:4px 12px;
          border-radius:999px;
          border:1px solid #fef08a;
          margin-bottom:8px;
        ">🏆 ¡NIVEL COMPLETADO! 🏆</div>

        <h2 style="
          font-family:'Silkscreen', monospace;
          font-size:20px;
          color:#facc15;
          text-shadow:0 2px 10px rgba(250,204,21,0.65);
          margin:2px 0 8px;
        ">¡ENHORABUENA!</h2>

        ${hasEndImg ? `
          <div style="margin:6px auto 10px;border-radius:10px;overflow:hidden;border:2px solid #facc15;max-height:165px;">
            <img src="img/end.png" alt="Victoria" style="width:100%;height:165px;object-fit:cover;display:block;">
          </div>
        ` : `
          <div style="
            margin:6px auto 10px;
            padding:12px;
            border-radius:10px;
            background:rgba(15,23,42,0.8);
            border:1.5px dashed rgba(250,204,21,0.55);
            color:#fef08a;
            font-size:13px;
          ">
            🎆 ¡Has sobrevivido al perímetro y derrotado al Jefe Supremo! 🎆
          </div>
        `}

        <div style="
          display:grid;
          grid-template-columns:repeat(2, 1fr);
          gap:8px;
          background:rgba(9,13,20,0.75);
          border:1px solid rgba(148,163,184,0.3);
          border-radius:10px;
          padding:10px 12px;
          margin-bottom:12px;
          font-size:13px;
          text-align:left;
        ">
          <div>⏱️ Tiempo: <strong style="color:#38bdf8;">${mins}:${secs}</strong></div>
          <div>⭐ Nivel: <strong style="color:#facc15;">NV.${st.level}</strong></div>
          <div>💀 Bajas: <strong style="color:#f87171;">${this.kills}</strong></div>
          <div>🎯 Puntos: <strong style="color:#c084fc;">${this.score}</strong></div>
          <div style="grid-column:1 / -1;border-top:1px solid rgba(148,163,184,0.2);padding-top:6px;display:flex;align-items:center;justify-content:space-between;">
            <span>⚙️ Chatarra total obtenida (+${clearBonusChapas} bonus):</span>
            <strong style="color:#fde047;font-size:15px;">+${earnedChapas}</strong>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button id="victory-restart-btn" type="button" class="action-btn" style="flex:1;min-width:150px;">🔄 Jugar de nuevo</button>
          <button id="victory-menu-btn" type="button" class="action-btn" style="flex:1;min-width:150px;">🏠 Menú principal</button>
        </div>
      </div>
    `;

    document.body.appendChild(victoryModal);

    const vRestartBtn = document.getElementById('victory-restart-btn');
    if (vRestartBtn) {
      vRestartBtn.onclick = (e) => {
        e.stopPropagation();
        victoryModal.remove();
        this.startGame();
      };
    }

    const vMenuBtn = document.getElementById('victory-menu-btn');
    if (vMenuBtn) {
      vMenuBtn.onclick = (e) => {
        e.stopPropagation();
        victoryModal.remove();
        this.returnToMenu();
      };
    }
  }

  getActiveBossForHUD() {
    if (this.lastHitBossSprite && this.lastHitBossSprite.active) {
      const lastData = this.lastHitBossSprite.getData('enemy');
      if (lastData && lastData.isBoss && lastData.hp > 0) {
        return lastData;
      }
    }

    const activeBosses = this.enemies.getChildren().filter(e => {
      if (!e.active) return false;
      const d = e.getData('enemy');
      return d && d.isBoss && d.hp > 0;
    });

    if (activeBosses.length > 0) {
      this.lastHitBossSprite = activeBosses[0];
      return activeBosses[0].getData('enemy');
    }

    this.lastHitBossSprite = null;
    return null;
  }

  updateBossHUD() {
    if (!this.bossHudGraphics) return;
    const g = this.bossHudGraphics;
    g.clear();

    const bossData = this.isInActiveRun() ? this.getActiveBossForHUD() : null;

    if (!bossData) {
      this.bossHudNameText.setVisible(false);
      this.bossHudHpText.setVisible(false);
      return;
    }

    const barW = Math.min(440, this.scale.width - 60);
    const barH = 16;
    const barX = Math.round((this.scale.width - barW) / 2);
    const barY = this.scale.height - 30;
    const pct = Math.max(0, Math.min(1, bossData.hp / bossData.maxHp));

    g.fillStyle(0x090d14, 0.92);
    g.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
    g.lineStyle(1.5, 0xc084fc, 1);
    g.strokeRect(barX - 3, barY - 3, barW + 6, barH + 6);

    g.fillStyle(0x3b0764, 1);
    g.fillRect(barX, barY, barW, barH);
    g.fillStyle(0xa855f7, 1);
    g.fillRect(barX, barY, Math.round(barW * pct), barH);

    g.fillStyle(0xd8b4fe, 0.35);
    g.fillRect(barX, barY, Math.round(barW * pct), 4);

    const bossTitle = bossData.name || 'JEFE PERIMETRAL';
    this.bossHudNameText
      .setPosition(this.scale.width / 2, barY - 5)
      .setText(bossTitle)
      .setVisible(true);

    this.bossHudHpText
      .setPosition(this.scale.width / 2, barY + barH / 2)
      .setText(`${Math.ceil(bossData.hp)} / ${bossData.maxHp}`)
      .setVisible(true);
  }

  updateHUD() {
    const st = this.player.getData('stats');
    const g = this.hudGraphics;
    g.clear();

    g.fillStyle(0x06090f, 0.94);
    g.fillRect(7, 7, 188, 48);
    g.fillStyle(0x111827, 0.95);
    g.fillRect(8, 8, 186, 46);
    g.lineStyle(1.5, 0x64748b, 1);
    g.strokeRect(8, 8, 186, 46);
    g.lineStyle(1, 0x1e293b, 1);
    g.strokeRect(9, 9, 184, 44);

    g.fillStyle(0x090d16, 1);
    g.fillRect(12, 12, 38, 38);
    g.lineStyle(1.5, 0xfacc15, 0.75);
    g.strokeRect(12, 12, 38, 38);

    const hpRatio = Math.max(0, Math.min(1, st.hp / st.maxHp));
    const hpFillW = Math.round(126 * hpRatio);
    g.fillStyle(0x090d14, 1);
    g.fillRect(56, 24, 128, 11);
    g.lineStyle(1, 0x334155, 1);
    g.strokeRect(56, 24, 128, 11);
    if (hpFillW > 0) {
      g.fillStyle(0xdc2626, 1);
      g.fillRect(57, 25, hpFillW, 9);
      g.fillStyle(0xf87171, 0.85);
      g.fillRect(57, 25, hpFillW, 2);
      g.fillStyle(0x7f1d1d, 0.75);
      g.fillRect(57, 32, hpFillW, 2);
    }

    const xpRatio = Math.max(0, Math.min(1, st.xp / st.xpToNext));
    const xpFillW = Math.min(126, Math.round(126 * xpRatio));
    g.fillStyle(0x090d14, 1);
    g.fillRect(56, 37, 128, 11);
    g.lineStyle(1, 0x334155, 1);
    g.strokeRect(56, 37, 128, 11);
    if (xpFillW > 0) {
      g.fillStyle(0x2563eb, 1);
      g.fillRect(57, 38, xpFillW, 9);
      g.fillStyle(0x7dd3fc, 0.85);
      g.fillRect(57, 38, xpFillW, 2);
      g.fillStyle(0x1e3a8a, 0.75);
      g.fillRect(57, 45, xpFillW, 2);
    }

    this.hudLevelText.setText(`NV.${st.level}`);
    this.hudHpText.setText(`${Math.ceil(st.hp)}/${st.maxHp}`);
    this.hudXpText.setText(`XP ${st.xp}/${st.xpToNext}`);

    const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.elapsedTime % 60)).padStart(2, '0');
    this.hudTimeText.setPosition(this.scale.width / 2, 10).setText(`${mins}:${secs} / 12:00`);
    this.hudKillsText.setPosition(10, 62).setText(`BAJAS: ${this.kills}`);
    if (this.hudChapaIcon) this.hudChapaIcon.setPosition(18, 87);
    if (this.hudChapaText) this.hudChapaText.setPosition(30, 80).setText(`${this.runChapasCollected || 0}`);

    this.updateBossHUD();
    this.updatePortalArrowHUD();

    this.joyGraphics.clear();
    if (this.joystick.active) {
      const sx = this.joystick.startX;
      const sy = this.joystick.startY;
      const cx = sx + this.joystick.dx * this.joystick.maxR;
      const cy = sy + this.joystick.dy * this.joystick.maxR;
      this.joyGraphics.lineStyle(2, 0xfacc15, 0.5);
      this.joyGraphics.strokeCircle(sx, sy, this.joystick.maxR);
      this.joyGraphics.fillStyle(0xfacc15, 0.8);
      this.joyGraphics.fillCircle(cx, cy, 8);
    }
  }

  updatePauseButtonVisibility() {
    if (!hudPauseBtn) return;
    if (this.gameState === 'PLAYING' || this.gameState === 'PAUSED') {
      hudPauseBtn.classList.remove('hidden');
      hudPauseBtn.textContent = this.gameState === 'PAUSED' ? '▶' : '⏸';
    } else {
      hudPauseBtn.classList.add('hidden');
    }
  }

  pauseGame() {
    if (this.gameState !== 'PLAYING') return;
    this._pausedByPortrait = false;
    this.gameState = 'PAUSED';
    this.physics.pause();
    this.joystick.active = false;
    this.joystick.pointerId = null;
    this.joyGraphics.clear();
    if (pauseScreen) pauseScreen.classList.remove('hidden');
    this.updatePauseButtonVisibility();
  }

  resumeGame() {
    if (this.gameState !== 'PAUSED') return;
    this._pausedByPortrait = false;
    if (confirmResetModal) confirmResetModal.classList.add('hidden');
    if (optionsModal) optionsModal.classList.add('hidden');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    this.physics.resume();
    this.gameState = 'PLAYING';
    this.updatePauseButtonVisibility();
  }

  togglePause() {
    if (this.gameState === 'PLAYING') {
      this.pauseGame();
    } else if (this.gameState === 'PAUSED') {
      this.resumeGame();
    }
  }

  ensureInRunOptionsControls() {
    if (!optionsModal) return;
    let container = document.getElementById('inrun-options-actions');
    if (!container) {
      container = document.createElement('div');
      container.id = 'inrun-options-actions';
      container.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:10px;';

      const restartRunBtn = document.createElement('button');
      restartRunBtn.type = 'button';
      restartRunBtn.className = 'action-btn';
      restartRunBtn.textContent = '🔄 Reiniciar partida';
      restartRunBtn.onclick = (e) => {
        e.stopPropagation();
        this.startGame();
      };

      const returnMenuRunBtn = document.createElement('button');
      returnMenuRunBtn.type = 'button';
      returnMenuRunBtn.className = 'action-btn';
      returnMenuRunBtn.textContent = '🏠 Volver al menú principal';
      returnMenuRunBtn.onclick = (e) => {
        e.stopPropagation();
        this.returnToMenu();
      };

      container.appendChild(restartRunBtn);
      container.appendChild(returnMenuRunBtn);

      const closeBtn = document.getElementById('close-options-btn');
      if (closeBtn && closeBtn.parentElement) {
        closeBtn.parentElement.insertBefore(container, closeBtn);
      } else {
        optionsModal.appendChild(container);
      }
    }

    const inRun = this.isInActiveRun();
    container.style.display = inRun ? 'flex' : 'none';

    const resetBtn = document.getElementById('reset-data-btn');
    const resetBox = resetBtn ? resetBtn.parentElement : null;
    const feedbackEl = document.getElementById('reset-data-feedback');
    if (resetBox) {
      resetBox.style.display = inRun ? 'none' : 'flex';
    } else if (resetBtn) {
      resetBtn.style.display = inRun ? 'none' : '';
    }
    if (feedbackEl) {
      feedbackEl.style.display = inRun ? 'none' : '';
      if (!inRun) feedbackEl.textContent = '';
    }
  }

  openOptionsModal() {
    if (!optionsModal) return;
    this.ensureInRunOptionsControls();
    optionsModal.classList.remove('hidden');
  }

  isIOSDevice() {
    const ua = navigator.userAgent || '';
    const iOSByUA = /iPad|iPhone|iPod/.test(ua);
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return iOSByUA || iPadOS;
  }

  isStandaloneApp() {
    return (
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    );
  }

  showToastMessage(text, duration = 4500) {
    const toast = document.getElementById('ios-fs-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.remove('hidden');
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  showIOSFullscreenHint() {
    if (this.isStandaloneApp()) {
      this.showToastMessage('Ya estás ejecutando el juego en modo pantalla completa de iOS.', 3000);
      return;
    }
    this.showToastMessage(
      'En iPhone/iPad: pulsa Compartir (↑) en Safari y elige "Añadir a pantalla de inicio" para jugar a pantalla completa.',
      5500
    );
  }

  triggerFullscreenOrIOSGuide() {
    AudioSys.init();

    const isFullscreenNow = Boolean(
      document.fullscreenElement || document.webkitFullscreenElement
    );

    if (isFullscreenNow) {
      const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
      if (exitFs) {
        Promise.resolve(exitFs.call(document)).catch(() => {});
      }
      return;
    }

    const targetEl = document.documentElement;
    const reqFs = targetEl.requestFullscreen || targetEl.webkitRequestFullscreen;

    if (reqFs && !this.isIOSDevice()) {
      Promise.resolve(reqFs.call(targetEl)).catch(() => {
        this.showIOSFullscreenHint();
      });
      return;
    }

    try {
      window.scrollTo(0, 1);
    } catch (e) {}
    this.showIOSFullscreenHint();
  }

  bindUIEvents() {
    refreshMenuChatarraUI();
    if (this._uiBound) return;
    this._uiBound = true;

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.onclick = (e) => {
        e.stopPropagation();
        this.startGame();
      };
    }

    const upgradesBtn = document.getElementById('upgrades-btn');
    if (upgradesBtn) {
      upgradesBtn.onclick = (e) => {
        e.stopPropagation();
        this.openUpgradesModal();
      };
    }

    const closeUpgradesBtn = document.getElementById('close-upgrades-btn');
    if (closeUpgradesBtn) {
      closeUpgradesBtn.onclick = (e) => {
        e.stopPropagation();
        if (upgradesModal) upgradesModal.classList.add('hidden');
        refreshMenuChatarraUI();
      };
    }

    const charactersBtn = document.getElementById('characters-btn');
    if (charactersBtn) {
      charactersBtn.onclick = (e) => {
        e.stopPropagation();
        if (charactersModal) charactersModal.classList.remove('hidden');
      };
    }

    const closeCharactersBtn = document.getElementById('close-characters-btn');
    if (closeCharactersBtn) {
      closeCharactersBtn.onclick = (e) => {
        e.stopPropagation();
        if (charactersModal) charactersModal.classList.add('hidden');
      };
    }

    const optionsBtn = document.getElementById('options-btn');
    if (optionsBtn) {
      optionsBtn.onclick = (e) => {
        e.stopPropagation();
        this.openOptionsModal();
      };
    }

    const pauseOptionsBtn = document.getElementById('pause-options-btn');
    if (pauseOptionsBtn) {
      pauseOptionsBtn.onclick = (e) => {
        e.stopPropagation();
        this.openOptionsModal();
      };
    }

    const closeOptionsBtn = document.getElementById('close-options-btn');
    if (closeOptionsBtn) {
      closeOptionsBtn.onclick = (e) => {
        e.stopPropagation();
        if (optionsModal) optionsModal.classList.add('hidden');
      };
    }

    const resetDataBtn = document.getElementById('reset-data-btn');
    const confirmResetYesBtn = document.getElementById('confirm-reset-yes-btn');
    const confirmResetNoBtn = document.getElementById('confirm-reset-no-btn');

    if (resetDataBtn) {
      resetDataBtn.onclick = (e) => {
        e.stopPropagation();
        if (this.isInActiveRun()) return;
        if (confirmResetModal) {
          confirmResetModal.classList.remove('hidden');
        } else {
          resetMeta();
        }
      };
    }

    if (confirmResetNoBtn) {
      confirmResetNoBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirmResetModal) confirmResetModal.classList.add('hidden');
      };
    }

    if (confirmResetYesBtn) {
      confirmResetYesBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirmResetModal) confirmResetModal.classList.add('hidden');
        if (this.isInActiveRun()) return;
        resetMeta();
        if (shopUpgradesList && upgradesModal && !upgradesModal.classList.contains('hidden')) {
          this.renderShopUpgrades();
        }
        const feedbackEl = document.getElementById('reset-data-feedback');
        if (feedbackEl) {
          feedbackEl.style.color = '#4ade80';
          feedbackEl.textContent = '✓ Datos borrados. Chatarra y mejoras reiniciadas a 0.';
        }
      };
    }

    if (hudPauseBtn) {
      hudPauseBtn.onclick = (e) => {
        e.stopPropagation();
        this.togglePause();
      };
    }

    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      resumeBtn.onclick = (e) => {
        e.stopPropagation();
        this.resumeGame();
      };
    }

    const pauseMenuBtn = document.getElementById('pause-menu-btn');
    if (pauseMenuBtn) {
      pauseMenuBtn.onclick = (e) => {
        e.stopPropagation();
        this.returnToMenu();
      };
    }

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.onclick = (e) => {
        e.stopPropagation();
        this.startGame();
      };
    }

    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
      menuBtn.onclick = (e) => {
        e.stopPropagation();
        this.returnToMenu();
      };
    }

    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
      fsBtn.onclick = (e) => {
        e.stopPropagation();
        this.triggerFullscreenOrIOSGuide();
      };

      const onFsChange = () => {
        const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        fsBtn.textContent = active ? '✕' : '⛶';
        fsBtn.title = active ? 'Salir de pantalla completa' : 'Pantalla completa';
      };

      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);
    }

    const toastEl = document.getElementById('ios-fs-toast');
    if (toastEl) {
      toastEl.onclick = (e) => {
        e.stopPropagation();
        toastEl.classList.add('hidden');
      };
    }
  }

  startGame() {
    AudioSys.init();
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }

    this.enemies.getChildren().forEach(e => {
      const eData = e.getData('enemy');
      if (eData && eData.hpBar) eData.hpBar.destroy();
    });

    this.clearPortalVisuals();
    this.clearDimensionRoomVisuals();
    this.clearExitDoorVisuals();
    const _fm = document.getElementById('fusion-evolution-modal'); if (_fm) _fm.remove();
    const _vm = document.getElementById('victory-screen-modal'); if (_vm) _vm.remove();
    this.clearFireworks();
    this._currentTicketHasFireworks = false;
    this.runPortalRollDone = false;
    this.runHasDimensionPortal = false;
    this.dimensionEventChecked = false;
    this.dimensionPortalSpawned = false;
    this.inCraDimension = false;
    this.dimensionReturnPos = null;
    this.dimensionSavedEnemies = [];
    this.dimensionSavedGems = [];
    this.dimensionTransitionLock = false;
    this.portalCheckTimer = 8;
    if (this.bgTile) this.bgTile.setVisible(true);
    this.solidProps.getChildren().forEach(p => p.setVisible(true));

    this.player.setPosition(0, 0);
    this.player.setData('stats', this.getDefaultStats());
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    this.gems.getChildren().forEach(gm => {
      const gd = gm && gm.getData ? gm.getData('gem') : null;
      if (gd && gd.beamTween) gd.beamTween.stop();
      if (gd && gd.beamGfx) gd.beamGfx.destroy();
    });
    this.gems.clear(true, true);
    this.drones.forEach(d => d.destroy());
    this.drones = [];
    if (this.tamperFxGraphics) this.tamperFxGraphics.clear();

    this.elapsedTime = 0;
    this.score = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.runChapasCollected = 0;
    this.bonusChapasEarned = 0;
    this.bossSpawnCount = 0;
    this.tolcrapSpawned = false;
    this.supremeColossusSpawned = false;
    this.spawnTimer = 0;
    this.lastHitBossSprite = null;
    this.horde1Triggered = false;
    this.horde2Triggered = false;
    this.hordeActiveTimer = 0;
    this.hordeTier = 0;
    this.levelCleared = false;
    this.exitDoorSprite = null;
    this.exitDoorPos = null;
    this.exitDoorLabel = null;
    this.victoryFireworksActive = false;
    this.victoryFireworksTimer = 0;
    this.magnetPullActive = false;
    this._pausedByPortrait = false;

    if (this.hordeBannerText) {
      this.tweens.killTweensOf(this.hordeBannerText);
      this.hordeBannerText.setVisible(false).setAlpha(1);
    }

    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    if (confirmResetModal) confirmResetModal.classList.add('hidden');
    if (optionsModal) optionsModal.classList.add('hidden');
    if (charactersModal) charactersModal.classList.add('hidden');
    this.hideThermalPaperGraphic();
    levelupScreen.classList.add('hidden');

    this.physics.resume();
    this.gameState = 'PLAYING';
    this.updatePauseButtonVisibility();
    checkOrientation();
  }

  openUpgradesModal() {
    if (!upgradesModal || !shopUpgradesList) return;
    this.renderShopUpgrades();
    upgradesModal.classList.remove('hidden');
  }

  renderShopUpgrades() {
    const inspectorEl = document.getElementById('shop-upgrade-inspector');
    if (!shopUpgradesList || !inspectorEl) return;
    const meta = loadMeta();
    refreshMenuChatarraUI();

    if (!this.selectedShopUpgradeId || !SHOP_UPGRADES.some(u => u.id === this.selectedShopUpgradeId)) {
      this.selectedShopUpgradeId = SHOP_UPGRADES[0]?.id;
    }

    const selectedUpg = SHOP_UPGRADES.find(u => u.id === this.selectedShopUpgradeId) || SHOP_UPGRADES[0];

    const buySelectedUpgrade = (upg) => {
      const latest = loadMeta();
      const lvl = latest.levels[upg.id] || 0;
      const price = getUpgradeCost(upg, lvl);
      if (lvl < upg.maxLevel && latest.chapas >= price) {
        latest.chapas -= price;
        latest.levels[upg.id] = lvl + 1;
        saveMeta(latest);
        AudioSys.pickup();
        this.renderShopUpgrades();
      }
    };

    shopUpgradesList.innerHTML = '';
    SHOP_UPGRADES.forEach(upg => {
      const currentLvl = meta.levels[upg.id] || 0;
      const isMax = currentLvl >= upg.maxLevel;
      const cost = getUpgradeCost(upg, currentLvl);
      const isSelected = selectedUpg && upg.id === selectedUpg.id;

      const slotBtn = document.createElement('button');
      slotBtn.type = 'button';
      slotBtn.className = `vending-slot${isSelected ? ' is-selected' : ''}`;
      slotBtn.innerHTML = `
        <span class="vending-slot-icon">${upg.icon || '⚙️'}</span>
        <span class="vending-slot-name">${upg.name}</span>
        <span class="vending-slot-price${isMax ? ' is-max' : ''}">
          ${isMax ? 'MÁX' : `<img src="img/chapa.png" alt="" width="11" height="11" style="image-rendering:pixelated;">${cost}`}
        </span>
      `;

      slotBtn.onclick = (e) => {
        e.stopPropagation();
        this.selectedShopUpgradeId = upg.id;
        AudioSys.pickup();
        this.renderShopUpgrades();
      };

      shopUpgradesList.appendChild(slotBtn);
    });

    if (!selectedUpg) {
      inspectorEl.innerHTML = '';
      return;
    }

    const selLvl = meta.levels[selectedUpg.id] || 0;
    const selIsMax = selLvl >= selectedUpg.maxLevel;
    const selCost = getUpgradeCost(selectedUpg, selLvl);
    const canAfford = !selIsMax && meta.chapas >= selCost;

    inspectorEl.innerHTML = `
      <div>
        <div class="vending-inspector-head">
          <div class="vending-inspector-icon">${selectedUpg.icon || '⚙️'}</div>
          <div>
            <div class="vending-inspector-title">${selectedUpg.name}</div>
            <div class="vending-inspector-level">NIVEL ${selLvl} / ${selectedUpg.maxLevel}</div>
          </div>
        </div>
        <p class="vending-inspector-desc" style="margin-top: 10px;">${selectedUpg.desc}</p>
        <div class="vending-inspector-stat" style="margin-top: 8px;">
          <div>${selectedUpg.effectLabel}</div>
          <div style="color: #facc15; margin-top: 3px; font-size: 11.5px;">${selectedUpg.getCurrentBonusLabel ? selectedUpg.getCurrentBonusLabel(selLvl) : ''}</div>
        </div>
        <div class="vending-cost-banner">
          ${
            selIsMax
              ? '<span>MEJORA COMPLETADA</span>'
              : `<img src="img/chapa.png" alt="" width="15" height="15" style="image-rendering:pixelated;"><span>COSTE: ${selCost} CHATARRA</span>`
          }
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button id="vending-confirm-buy-btn" type="button" class="action-btn vending-buy-btn" ${canAfford ? '' : 'disabled'}>
          ${selIsMax ? 'MÁXIMO ALCANZADO' : (canAfford ? 'COMPRAR' : 'CHATARRA INSUFICIENTE')}
        </button>
      </div>
    `;

    const confirmBtn = document.getElementById('vending-confirm-buy-btn');
    if (confirmBtn && canAfford) {
      confirmBtn.onclick = (e) => {
        e.stopPropagation();
        buySelectedUpgrade(selectedUpg);
      };
    }
  }

  returnToMenu() {
    this.enemies.getChildren().forEach(e => {
      const eData = e.getData('enemy');
      if (eData && eData.hpBar) eData.hpBar.destroy();
    });
    if (Array.isArray(this.dimensionSavedEnemies)) {
      this.dimensionSavedEnemies.forEach(item => {
        const sp = item.sprite;
        const d = sp && sp.getData ? sp.getData('enemy') : null;
        if (d && d.hpBar) d.hpBar.destroy();
        if (sp && sp.destroy) sp.destroy();
      });
    }
    this.dimensionSavedEnemies = [];
    this.dimensionSavedGems = [];
    this.clearPortalVisuals();
    this.clearDimensionRoomVisuals();
    this.clearExitDoorVisuals();
    const _fm = document.getElementById('fusion-evolution-modal'); if (_fm) _fm.remove();
    const _vm = document.getElementById('victory-screen-modal'); if (_vm) _vm.remove();
    this.clearFireworks();
    this._currentTicketHasFireworks = false;
    this.inCraDimension = false;
    this.dimensionReturnPos = null;
    if (this.bgTile) this.bgTile.setVisible(true);
    this.solidProps.getChildren().forEach(p => p.setVisible(true));

    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    this.gems.getChildren().forEach(gm => {
      const gd = gm && gm.getData ? gm.getData('gem') : null;
      if (gd && gd.beamTween) gd.beamTween.stop();
      if (gd && gd.beamGfx) gd.beamGfx.destroy();
    });
    this.gems.clear(true, true);
    this.drones.forEach(d => d.destroy());
    this.drones = [];
    if (this.tamperFxGraphics) this.tamperFxGraphics.clear();
    this.player.setPosition(0, 0);
    this.player.setVelocity(0, 0);
    this.lastHitBossSprite = null;
    this.magnetPullActive = false;
    this._pausedByPortrait = false;

    if (this.hordeBannerText) {
      this.tweens.killTweensOf(this.hordeBannerText);
      this.hordeBannerText.setVisible(false).setAlpha(1);
    }

    refreshMenuChatarraUI();
    gameoverScreen.classList.add('hidden');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    if (confirmResetModal) confirmResetModal.classList.add('hidden');
    if (optionsModal) optionsModal.classList.add('hidden');
    this.hideThermalPaperGraphic();
    levelupScreen.classList.add('hidden');
    if (upgradesModal) upgradesModal.classList.add('hidden');
    if (charactersModal) charactersModal.classList.add('hidden');
    startScreen.classList.remove('hidden');
    this.gameState = 'MENU';
    this.updatePauseButtonVisibility();
  }

  getTolcrapBaseTexture() {
    if (this.hasValidTexture('tolcrap_side')) return 'tolcrap_side';
    if (this.hasValidTexture('tolcrap_custom')) return 'tolcrap_custom';
    return 'tolcrap_boss';
  }

  syncTolcrapHitbox(boss, mode = 'side') {
    if (!boss || !boss.body) return;
    const w = boss.width || 112;
    const h = boss.height || 64;

    if (mode === 'vertical') {
      const bw = Math.max(24, Math.round(w * 0.55));
      const bh = Math.max(24, Math.round(h * 0.72));
      const ox = Math.round((w - bw) / 2);
      const oy = Math.round((h - bh) / 2) + 4;
      boss.body.setSize(bw, bh);
      boss.body.setOffset(ox, oy);
    } else {
      const bw = Math.max(24, Math.round(w * 0.82));
      const bh = Math.max(24, Math.round(h * 0.65));
      const ox = Math.round((w - bw) / 2);
      const oy = Math.round((h - bh) / 2) + 4;
      boss.body.setSize(bw, bh);
      boss.body.setOffset(ox, oy);
    }
  }

  applyTolcrapDirectionSprite(boss, vx, vy) {
    const rightKey = this.hasValidTexture('tolcrap_side')
      ? 'tolcrap_side'
      : this.getTolcrapBaseTexture();
    const leftKey = this.hasValidTexture('tolcrap_custom')
      ? 'tolcrap_custom'
      : rightKey;
    const upKey = this.hasValidTexture('tolcrap_up') ? 'tolcrap_up' : rightKey;
    const downKey = this.hasValidTexture('tolcrap_down') ? 'tolcrap_down' : rightKey;

    if (Math.abs(vy) > Math.abs(vx)) {
      const nextKey = vy < 0 ? upKey : downKey;
      if (boss.texture.key !== nextKey) boss.setTexture(nextKey);
      boss.setFlipX(false);
      this.syncTolcrapHitbox(boss, 'vertical');
    } else if (vx < 0) {
      if (boss.texture.key !== leftKey) boss.setTexture(leftKey);
      boss.setFlipX(!this.hasValidTexture('tolcrap_custom'));
      this.syncTolcrapHitbox(boss, 'side');
    } else {
      if (boss.texture.key !== rightKey) boss.setTexture(rightKey);
      boss.setFlipX(false);
      this.syncTolcrapHitbox(boss, 'side');
    }
  }

  fireTolcrapSaw(boss) {
    if (!boss || !boss.active || !this.player || !this.player.active) return;
    const eData = boss.getData('enemy');
    const sawDmg = Math.max(12, Math.round((eData?.damage || 30) * 0.65));
    const speed = 245;
    const count = 3;
    const spread = 0.22;
    const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i - (count - 1) / 2) * spread;
      const spawnX = boss.x + Math.cos(angle) * 24;
      const spawnY = boss.y + Math.sin(angle) * 24;

      const saw = this.enemyProjectiles.create(spawnX, spawnY, 'tolcrap_saw').setDepth(getEnemyDepth(boss, true) + 2);
      saw.body.setCircle(9, 2, 2);
      saw.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      saw.setAngularVelocity(580);
      saw.setData('enemyProj', { damage: sawDmg });

      this.time.delayedCall(3400, () => {
        if (saw && saw.active) saw.destroy();
      });
    }

    AudioSys.sawShoot();
  }

  updateCorruptOperatorAttacks(boss, eData, dt) {
    if (!boss || !boss.active || !this.player || !this.player.active) return;

    if (Array.isArray(this.corruptAreaZones) && this.corruptAreaZones.length > 0) {
      const remaining = [];
      for (const z of this.corruptAreaZones) {
        if (!z || !z.gfx) continue;
        z.elapsed += dt;
        const g = z.gfx;
        g.clear();

        if (!z.detonated) {
          const warnRatio = Math.min(1, z.elapsed / z.warnDuration);
          g.fillStyle(0xef4444, 0.12 + warnRatio * 0.22);
          g.fillCircle(z.x, z.y, z.radius);
          g.lineStyle(2.5, 0xdc2626, 0.9);
          g.strokeCircle(z.x, z.y, z.radius);
          g.lineStyle(1.5, 0xf97316, 0.85);
          g.strokeCircle(z.x, z.y, z.radius * warnRatio);

          if (z.elapsed >= z.warnDuration) {
            z.detonated = true;
            z.blastTimer = 0.26;
            AudioSys.bossOrbShoot();
            this.cameras.main.shake(110, 0.008);

            const st = this.player.getData('stats');
            const distPlayer = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.x, z.y);
            if (st && st.invulnTimer <= 0 && distPlayer <= z.radius + 10) {
              const dmg = getReducedDamage(st, z.damage);
              st.hp -= dmg;
              st.invulnTimer = 0.5;
              this.addFloatingText(this.player.x, this.player.y - 22, `-${dmg}`, '#ef4444');
              if (st.hp <= 0) {
                if (this.inCraDimension) this.exitCraDimension(false);
                else { st.hp = 0; this.endGame(); }
              }
            }
          }
          remaining.push(z);
        } else {
          z.blastTimer -= dt;
          const alpha = Math.max(0, z.blastTimer / 0.26);
          g.fillStyle(0xf97316, 0.45 * alpha);
          g.fillCircle(z.x, z.y, z.radius);
          g.lineStyle(3, 0xef4444, alpha);
          g.strokeCircle(z.x, z.y, z.radius);

          if (z.blastTimer > 0) {
            remaining.push(z);
          } else {
            g.destroy();
          }
        }
      }
      this.corruptAreaZones = remaining;
    }

    if (this.corruptDashState) {
      const ds = this.corruptDashState;
      ds.timer -= dt;
      if (ds.phase === 'telegraph') {
        boss.setVelocity(0, 0);
        if (ds.previewGfx) {
          ds.previewGfx.clear();
          ds.previewGfx.lineStyle(2.5, 0x0284c7, 0.85);
          ds.previewGfx.strokeRect(
            Math.min(boss.x, ds.targetX) - 18,
            Math.min(boss.y, ds.targetY) - 18,
            Math.abs(ds.targetX - boss.x) + 36,
            Math.abs(ds.targetY - boss.y) + 36
          );
          ds.previewGfx.lineStyle(2, 0x38bdf8, 0.95);
          ds.previewGfx.beginPath();
          ds.previewGfx.moveTo(boss.x, boss.y);
          ds.previewGfx.lineTo(ds.targetX, ds.targetY);
          ds.previewGfx.strokePath();
        }
        if (ds.timer <= 0) {
          if (ds.previewGfx) {
            ds.previewGfx.destroy();
            ds.previewGfx = null;
          }
          ds.phase = 'dash';
          ds.timer = 0.42;
          const angle = Phaser.Math.Angle.Between(boss.x, boss.y, ds.targetX, ds.targetY);
          const dashSpeed = 360;
          ds.vx = Math.cos(angle) * dashSpeed;
          ds.vy = Math.sin(angle) * dashSpeed;
          AudioSys.tamperZap();
        }
        return;
      } else if (ds.phase === 'dash') {
        boss.setVelocity(ds.vx, ds.vy);
        if (ds.timer <= 0) {
          boss.setVelocity(0, 0);
          this.corruptDashState = null;
        }
        return;
      }
    }

    this.corruptAttackTimer -= dt;
    if (this.corruptAttackTimer <= 0) {
      const pattern = this.corruptAttackIndex % 3;
      this.corruptAttackIndex++;

      if (pattern === 0) {
        this.fireCorruptFanVolley(boss, eData);
        this.corruptAttackTimer = 2.55;
      } else if (pattern === 1) {
        this.spawnCorruptAreaStrike(boss, eData);
        this.corruptAttackTimer = 2.85;
      } else {
        this.startCorruptDashStrike(boss, eData);
        this.corruptAttackTimer = 3.1;
      }
    }
  }

  fireCorruptFanVolley(boss, eData) {
    const dmg = Math.max(12, Math.round((eData?.damage || 28) * 0.6));
    const speed = 185;
    const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
    const offsets = [-0.46, -0.18, 0.18, 0.46];

    offsets.forEach((off, idx) => {
      const a = baseAngle + off;
      const texKey = idx % 2 === 0 ? 'purple_orb' : 'tolcrap_saw';
      const proj = this.enemyProjectiles.create(
        boss.x + Math.cos(a) * 24,
        boss.y + Math.sin(a) * 24,
        texKey
      ).setDepth(getEnemyDepth(boss, true) + 2);
      proj.body.setCircle(7, 2, 2);
      proj.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
      if (texKey === 'tolcrap_saw') {
        proj.setAngularVelocity(420);
        proj.setScale(0.82);
      }
      proj.setData('enemyProj', { damage: dmg });
      this.time.delayedCall(3400, () => {
        if (proj && proj.active) proj.destroy();
      });
    });

    this.addFloatingText(boss.x, boss.y - 34, '⚡ RÁFAGA CORRUPTA', '#c084fc');
    AudioSys.bossOrbShoot();
  }

  spawnCorruptAreaStrike(boss, eData) {
    const b = this.dimensionRoomBounds || { minX: -386, maxX: 386, minY: -266, maxY: 266 };
    const areaDmg = Math.max(15, Math.round((eData?.damage || 28) * 0.75));
    const radius = 58;

    const spots = [
      {
        x: Phaser.Math.Clamp(this.player.x, b.minX + radius, b.maxX - radius),
        y: Phaser.Math.Clamp(this.player.y, b.minY + radius, b.maxY - radius)
      }
    ];

    for (let i = 0; i < 2; i++) {
      spots.push({
        x: Phaser.Math.Between(b.minX + radius + 12, b.maxX - radius - 12),
        y: Phaser.Math.Between(b.minY + radius + 12, b.maxY - radius - 12)
      });
    }

    spots.forEach(sp => {
      const gfx = this.add.graphics().setDepth(-490);
      this.corruptAreaZones.push({
        x: sp.x,
        y: sp.y,
        radius,
        damage: areaDmg,
        warnDuration: 1.05,
        elapsed: 0,
        detonated: false,
        blastTimer: 0,
        gfx
      });
    });

    this.addFloatingText(boss.x, boss.y - 34, '🎯 ¡ZONAS DE IMPACTO!', '#f97316');
    AudioSys.hordeAlert();
  }

  startCorruptDashStrike(boss, eData) {
    const b = this.dimensionRoomBounds || { minX: -386, maxX: 386, minY: -266, maxY: 266 };
    const tx = Phaser.Math.Clamp(this.player.x, b.minX + 16, b.maxX - 16);
    const ty = Phaser.Math.Clamp(this.player.y, b.minY + 16, b.maxY - 16);
    const previewGfx = this.add.graphics().setDepth(-492);

    this.corruptDashState = {
      phase: 'telegraph',
      timer: 0.65,
      targetX: tx,
      targetY: ty,
      vx: 0,
      vy: 0,
      damage: Math.max(16, Math.round((eData?.damage || 28) * 0.8)),
      previewGfx
    };

    this.addFloatingText(boss.x, boss.y - 34, '🌀 ¡EMBESTIDA DEL OPERADOR!', '#0284c7');
  }

  fireWastelandBossPurpleOrbs(boss) {
    if (!boss || !boss.active || !this.player || !this.player.active) return;
    const eData = boss.getData('enemy');
    const isCorrupt = Boolean(eData?.isCorruptOperator);
    const orbDmg = Math.max(14, Math.round((eData?.damage || 30) * 0.68));
    const orbSpeed = isCorrupt ? 195 : 175;
    const count = isCorrupt ? 6 : 5;
    const spread = isCorrupt ? 0.28 : 0.24;
    const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);

    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i - (count - 1) / 2) * spread;
      const orb = this.enemyProjectiles.create(
        boss.x + Math.cos(a) * 26,
        boss.y + Math.sin(a) * 26,
        'purple_orb'
      ).setDepth(getEnemyDepth(boss, true) + 2);
      orb.body.setCircle(6, 2, 2);
      orb.setVelocity(Math.cos(a) * orbSpeed, Math.sin(a) * orbSpeed);
      orb.setData('enemyProj', { damage: orbDmg });

      this.time.delayedCall(3800, () => {
        if (orb && orb.active) orb.destroy();
      });
    }

    AudioSys.bossOrbShoot();
  }

  computeCutOffSpawnPosition(slotIndex = 0, totalSlots = 1) {
    const dist = Math.hypot(this.scale.width / 2, this.scale.height / 2) + 55;
    const pVx = this.player?.body?.velocity?.x || 0;
    const pVy = this.player?.body?.velocity?.y || 0;
    const moving = Math.hypot(pVx, pVy) > 12;

    const headingAngle = moving
      ? Math.atan2(pVy, pVx)
      : (this.isLookingLeft ? Math.PI : 0);

    const cutOff = Math.random() < 0.65;
    const baseAngle = cutOff ? headingAngle : Math.random() * Math.PI * 2;
    const spreadArc = cutOff ? 1.15 : Math.PI * 2;
    const offset = totalSlots > 1
      ? ((slotIndex / (totalSlots - 1)) - 0.5) * spreadArc
      : (Math.random() - 0.5) * spreadArc;

    const finalAngle = baseAngle + offset;
    return {
      x: this.player.x + Math.cos(finalAngle) * dist,
      y: this.player.y + Math.sin(finalAngle) * dist
    };
  }

  spawnBlockingFormation(count = 4, isSupreme = false) {
    const steps = Math.max(2, count);
    for (let i = 0; i < steps; i++) {
      const pos = this.computeCutOffSpawnPosition(i, steps);
      this.spawnEnemy(false, false, pos.x, pos.y, isSupreme ? 1.15 : 1);
    }
  }

  spawnEnemy(forceBoss = false, isSupremeColossus = false, customX = null, customY = null, hpScale = 1) {
    const pos = (typeof customX === 'number' && typeof customY === 'number')
      ? { x: customX, y: customY }
      : this.computeCutOffSpawnPosition(0, 1);
    const ex = pos.x;
    const ey = pos.y;
    const diff = 1 + this.elapsedTime / 210;

    if (forceBoss) {
      this.bossSpawnCount = (this.bossSpawnCount || 0) + 1;

      if (!isSupremeColossus) {
        const truckKey = this.getTolcrapBaseTexture();
        const boss = this.enemies.create(ex, ey, truckKey).setDepth(getEnemyDepth({ y: ey }, true));
        this.syncTolcrapHitbox(boss, 'side');
        const hpBar = this.add.graphics().setDepth(getEnemyDepth({ y: ey }, true) + 1);
        const maxHp = Math.round(2150 * Math.max(1, diff));

        boss.setData('enemy', {
          name: 'MINI BOSS · TOLCRAP',
          hp: maxHp,
          maxHp,
          speed: 45,
          damage: 32,
          xp: 140,
          isBoss: true,
          isMiniBoss: true,
          isTolcrap: true,
          facingLeftByDefault: false,
          sawTimer: 1.4,
          orbCd: 0,
          hpBar
        });

        this.lastHitBossSprite = boss;
        AudioSys.hordeAlert();
        this.addFloatingText(this.player.x, this.player.y - 38, '⚠️ MINI BOSS: TOLCRAP HA APARECIDO!', '#facc15');
        return;
      }

      const boss = this.enemies.create(ex, ey, 'boss_0').setDepth(getEnemyDepth({ y: ey }, true));
      boss.setScale(1.65);
      boss.body.setCircle(22, 6, 10);
      const hpBar = this.add.graphics().setDepth(getEnemyDepth({ y: ey }, true) + 1);
      const maxHp = Math.round(2800 * Math.max(1, diff));

      boss.setData('enemy', {
        name: 'BOSS · COLOSO SUPREMO',
        hp: maxHp,
        maxHp,
        speed: 46,
        damage: 38,
        xp: 260,
        isBoss: true,
        isSupremeBoss: true,
        isWastelandBoss: true,
        facingLeftByDefault: false,
        purpleOrbTimer: 1.5,
        orbCd: 0,
        hpBar
      });

      this.lastHitBossSprite = boss;
      AudioSys.hordeAlert();
      this.cameras.main.shake(220, 0.012);
      this.addFloatingText(this.player.x, this.player.y - 40, '🔥 ¡BOSS COLOSO SUPREMO (PLACEHOLDER)!', '#e879f9');
      return;
    }

    const roll = Math.random();
    const t = this.elapsedTime;
    let cfg = {
      key: 'mutantRat',
      radius: 10,
      scale: 1,
      speed: 80,
      hp: 18 * diff * hpScale,
      damage: 7,
      xp: 6,
      facingLeftByDefault: true
    };

    if (t < 60) {
      if (roll < 0.55) {
        cfg = {
          key: Math.random() > 0.45 ? 'catOrange' : 'catGray',
          radius: 9,
          scale: 1,
          speed: 88,
          hp: 15 * diff * hpScale,
          damage: 6,
          xp: 4,
          facingLeftByDefault: true
        };
      } else {
        cfg = {
          key: 'mutantRat',
          radius: 10,
          scale: 1,
          speed: 80,
          hp: 20 * diff * hpScale,
          damage: 7,
          xp: 5,
          facingLeftByDefault: true
        };
      }
    } else if (t < 160) {
      if (roll < 0.28) {
        cfg = {
          key: Math.random() > 0.45 ? 'catOrange' : 'catGray',
          radius: 9,
          scale: 1,
          speed: 92,
          hp: 17 * diff * hpScale,
          damage: 7,
          xp: 5,
          facingLeftByDefault: true
        };
      } else if (roll < 0.52) {
        cfg = {
          key: 'mutantRat',
          radius: 10,
          scale: 1,
          speed: 85,
          hp: 23 * diff * hpScale,
          damage: 8,
          xp: 5,
          facingLeftByDefault: true
        };
      } else if (roll < 0.78) {
        cfg = {
          key: 'crow',
          radius: 10,
          scale: 1,
          speed: 106,
          hp: 22 * diff * hpScale,
          damage: 8,
          xp: 6,
          facingLeftByDefault: true
        };
      } else {
        cfg = {
          key: 'thief',
          radius: 11,
          scale: 1,
          speed: 72,
          hp: 32 * diff * hpScale,
          damage: 10,
          xp: 7,
          facingLeftByDefault: false
        };
      }
    } else if (t < 270) {
      if (roll < 0.16) {
        cfg = {
          key: Math.random() > 0.45 ? 'catOrange' : 'catGray',
          radius: 9,
          scale: 1,
          speed: 95,
          hp: 19 * diff * hpScale,
          damage: 7,
          xp: 5,
          facingLeftByDefault: true
        };
      } else if (roll < 0.32) {
        cfg = {
          key: 'mutantRat',
          radius: 10,
          scale: 1,
          speed: 88,
          hp: 26 * diff * hpScale,
          damage: 9,
          xp: 6,
          facingLeftByDefault: true
        };
      } else if (roll < 0.52) {
        cfg = {
          key: 'crow',
          radius: 10,
          scale: 1,
          speed: 112,
          hp: 26 * diff * hpScale,
          damage: 9,
          xp: 7,
          facingLeftByDefault: true
        };
      } else if (roll < 0.70) {
        cfg = {
          key: 'thief',
          radius: 11,
          scale: 1,
          speed: 74,
          hp: 36 * diff * hpScale,
          damage: 11,
          xp: 8,
          facingLeftByDefault: false
        };
      } else if (roll < 0.86) {
        cfg = {
          key: 'logistics',
          radius: 12,
          scale: 1,
          speed: 55,
          hp: 52 * diff * hpScale,
          damage: 13,
          xp: 10,
          facingLeftByDefault: false
        };
      } else {
        cfg = {
          key: 'forklift',
          radius: 14,
          scale: 2,
          speed: 120,
          hp: 96 * diff * hpScale,
          damage: 18,
          xp: 15,
          facingLeftByDefault: true
        };
      }
    } else {
      if (roll < 0.12) {
        cfg = {
          key: Math.random() > 0.45 ? 'catOrange' : 'catGray',
          radius: 9,
          scale: 1,
          speed: 98,
          hp: 21 * diff * hpScale,
          damage: 8,
          xp: 5,
          facingLeftByDefault: true
        };
      } else if (roll < 0.24) {
        cfg = {
          key: 'mutantRat',
          radius: 10,
          scale: 1,
          speed: 92,
          hp: 30 * diff * hpScale,
          damage: 9,
          xp: 6,
          facingLeftByDefault: true
        };
      } else if (roll < 0.40) {
        cfg = {
          key: 'crow',
          radius: 10,
          scale: 1,
          speed: 116,
          hp: 30 * diff * hpScale,
          damage: 10,
          xp: 7,
          facingLeftByDefault: true
        };
      } else if (roll < 0.54) {
        cfg = {
          key: 'thief',
          radius: 11,
          scale: 1,
          speed: 76,
          hp: 38 * diff * hpScale,
          damage: 11,
          xp: 8,
          facingLeftByDefault: false
        };
      } else if (roll < 0.68) {
        cfg = {
          key: 'logistics',
          radius: 12,
          scale: 1,
          speed: 56,
          hp: 56 * diff * hpScale,
          damage: 14,
          xp: 10,
          facingLeftByDefault: false
        };
      } else if (roll < 0.81) {
        cfg = {
          key: 'foreman',
          radius: 15,
          scale: 1,
          speed: 44,
          hp: 102 * diff * hpScale,
          damage: 18,
          xp: 16,
          facingLeftByDefault: false
        };
      } else if (roll < 0.92) {
        cfg = {
          key: 'execSuit',
          radius: 14,
          scale: 1,
          speed: 50,
          hp: 155 * diff * hpScale,
          damage: 22,
          xp: 22,
          facingLeftByDefault: false
        };
      } else {
        cfg = {
          key: 'forklift',
          radius: 14,
          scale: 2,
          speed: 126,
          hp: 136 * diff * hpScale,
          damage: 21,
          xp: 18,
          facingLeftByDefault: true
        };
      }
    }

    const spriteScale = cfg.scale || 1;
    const enemy = this.enemies.create(ex, ey, `${cfg.key}_0`).setDepth(getEnemyDepth({ y: ey }, false));
    enemy.play(`${cfg.key}_walk`);
    enemy.setScale(spriteScale);
    enemy.body.setCircle(cfg.radius);

    const hpBar = this.add.graphics().setDepth(getEnemyDepth({ y: ey }, false) + 1);

    enemy.setData('enemy', {
      hp: cfg.hp,
      maxHp: cfg.hp,
      speed: cfg.speed,
      damage: cfg.damage,
      xp: cfg.xp,
      isBoss: false,
      facingLeftByDefault: Boolean(cfg.facingLeftByDefault),
      orbCd: 0,
      hpBar
    });
  }

  addFloatingText(x, y, text, color) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const txt = this.add.text(x, y, text, {
      fontFamily: '"Chakra Petch", sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: color,
      stroke: '#000000',
      strokeThickness: 2,
      resolution: dpr
    }).setOrigin(0.5).setDepth(getWorldEntityDepth(y, 11000));

    this.tweens.add({
      targets: txt,
      y: y - 24,
      alpha: 0,
      duration: 650,
      onComplete: () => txt.destroy()
    });
  }

  detonateBombDrop() {
    AudioSys.bombExplosion();
    this.cameras.main.shake(260, 0.018);
    this.cameras.main.flash(180, 255, 210, 120, false);
    this.addFloatingText(this.player.x, this.player.y - 26, '💥 ¡BOMBA DETONADA!', '#fb923c');

    const bombDamage = Math.round(165 * (1 + this.elapsedTime / 240));
    const snapshot = [...this.enemies.getChildren()];
    snapshot.forEach(enemy => {
      if (!enemy || !enemy.active) return;
      const eData = enemy.getData('enemy');
      if (!eData) return;
      const dmg = eData.isBoss ? Math.round(bombDamage * 0.55) : bombDamage;
      this.damageEnemy(enemy, dmg);
    });
  }

  fireDomoFish360(st) {
    if (st?.fusionActive) return;
    const df = st?.domoFish;
    if (!df || !df.enabled) return;

    const rays = Math.max(4, df.rays || 4);
    const step = (Math.PI * 2) / rays;
    const offset = df.ringOffset || 0;
    const finalDmg = Math.max(1, Math.round(df.baseDamage * (st.globalDamageMult || 1)));

    for (let i = 0; i < rays; i++) {
      const angle = offset + i * step;
      const proj = this.projectiles.create(this.player.x, this.player.y - 8, 'domo_laser').setDepth(getWorldEntityDepth(this.player.y, 6000));
      proj.setRotation(angle);
      proj.setVelocity(Math.cos(angle) * df.projectileSpeed, Math.sin(angle) * df.projectileSpeed);
      proj.setData('proj', { damage: finalDmg, pierce: df.pierce, hitList: [] });
      this.time.delayedCall(1200, () => { if (proj.active) proj.destroy(); });
    }

    df.ringOffset = offset + step * 0.5;
    AudioSys.novaShoot();
  }

  fireFusedPurpleLasers(st) {
    if (!st || !st.fusionActive) return;
    const globalDmg = st.globalDamageMult || 1;
    const df = st.domoFish || {};
    const wp = st.weapon || {};

    const ringRays = Math.min(8, Math.max(4, Math.round(((df.rays || 4) + 1) * 0.52)));
    const step = (Math.PI * 2) / ringRays;
    const ringOffset = st.fusionRingOffset || 0;
    const combinedBaseDmg = Math.max(
      12,
      Math.round(((wp.damage || 18) * 0.52 + (df.baseDamage || 16) * 0.54) * globalDmg)
    );
    const pierce = Math.max(1, Math.min(3, Math.round(((wp.pierce || 1) + (df.pierce || 2)) * 0.5)));
    const speed = Math.max(255, Math.min(330, (wp.projectileSpeed || 320) * 0.88));

    for (let i = 0; i < ringRays; i++) {
      const angle = ringOffset + i * step;
      const proj = this.projectiles.create(this.player.x, this.player.y - 8, 'fusion_laser').setDepth(getWorldEntityDepth(this.player.y, 6010));
      proj.setScale(0.95);
      proj.setRotation(angle);
      proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      proj.setData('proj', {
        damage: combinedBaseDmg,
        pierce,
        isFusion: true,
        hitList: []
      });
      this.time.delayedCall(1050, () => { if (proj.active) proj.destroy(); });
    }
    st.fusionRingOffset = ringOffset + step * 0.5;

    const maxRange = 295;
    const candidates = this.enemies.getChildren()
      .filter(e => {
        if (!e || !e.active) return false;
        const dData = e.getData('enemy');
        return dData && dData.hp > 0 && Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) <= maxRange;
      })
      .sort((a, b) => (
        Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
        Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y)
      ));

    if (candidates.length > 0) {
      const primary = candidates[0];
      const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 8, primary.x, primary.y);
      this.player.setFlipX(Math.cos(baseAngle) < 0);

      const extraCount = Math.min(3, Math.max(1, Math.round((wp.projectileCount || 1) * 0.6)));
      const spread = 0.18;
      for (let j = 0; j < extraCount; j++) {
        const aimAngle = baseAngle + (j - (extraCount - 1) / 2) * spread;
        const proj = this.projectiles.create(this.player.x, this.player.y - 8, 'fusion_laser').setDepth(getWorldEntityDepth(this.player.y, 6015));
        proj.setScale(1.0);
        proj.setRotation(aimAngle);
        proj.setVelocity(Math.cos(aimAngle) * (speed * 1.02), Math.sin(aimAngle) * (speed * 1.02));
        proj.setData('proj', {
          damage: Math.round(combinedBaseDmg * 0.85),
          pierce: Math.min(3, pierce),
          isFusion: true,
          hitList: []
        });
        this.time.delayedCall(920, () => { if (proj.active) proj.destroy(); });
      }
    }

    AudioSys.fusionShoot();
  }

  spawnBossLootChest(x, y, scrapAmount) {
    const chest = this.gems.create(x, y, 'boss_chest')
      .setDepth(getWorldEntityDepth(y, 5))
      .setScale(1.15);

    const beamGfx = this.add.graphics().setDepth(getWorldEntityDepth(y, 4));
    const drawBeam = (pulse) => {
      if (!beamGfx || !beamGfx.scene) return;
      beamGfx.clear();
      const cx = chest.x;
      const cy = chest.y;
      beamGfx.fillStyle(0xf97316, 0.24 + pulse * 0.14);
      beamGfx.fillEllipse(cx, cy + 8, 42 + pulse * 8, 16 + pulse * 4);
      beamGfx.lineStyle(2, 0xfacc15, 0.85);
      beamGfx.strokeEllipse(cx, cy + 8, 38 + pulse * 6, 14 + pulse * 3);

      beamGfx.fillStyle(0xf97316, 0.22 + pulse * 0.1);
      beamGfx.fillRect(cx - 11, cy - 155, 22, 163);
      beamGfx.fillStyle(0xfacc15, 0.34 + pulse * 0.14);
      beamGfx.fillRect(cx - 5, cy - 175, 10, 183);
      beamGfx.fillStyle(0xfef9c3, 0.65 + pulse * 0.2);
      beamGfx.fillRect(cx - 2, cy - 190, 4, 198);
    };
    drawBeam(0.5);

    const beamTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 650,
      yoyo: true,
      repeat: -1,
      onUpdate: (tw) => {
        if (!chest.active) {
          beamGfx.destroy();
          tw.stop();
          return;
        }
        drawBeam(tw.getValue());
      }
    });

    chest.setData('gem', {
      type: 'boss_chest',
      value: scrapAmount,
      beamGfx,
      beamTween
    });
  }

  fireCommLossAttack(st) {
    const cl = st?.commLoss;
    if (!cl || !cl.enabled) return;

    const candidates = this.enemies.getChildren().filter(e => {
      if (!e || !e.active) return false;
      const d = e.getData('enemy');
      return d && d.hp > 0;
    });

    if (candidates.length === 0) return;

    const minT = Math.max(1, cl.minTargets || 1);
    const maxT = Math.max(minT, cl.maxTargets || 2);
    const desiredCount = Phaser.Math.Between(minT, maxT);
    const count = Math.min(candidates.length, desiredCount);

    const chosen = Phaser.Utils.Array.Shuffle([...candidates]).slice(0, count);
    const baseStun = cl.stunDuration || 2.4;

    chosen.forEach(target => {
      const d = target.getData('enemy');
      if (!d) return;
      const duration = d.isBoss ? Math.max(1.0, baseStun * 0.55) : baseStun;
      d.stunTimer = Math.max(d.stunTimer || 0, duration);
      target.setVelocity(0, 0);
      this.addFloatingText(target.x, target.y - 24, '📡 ¡SIN SEÑAL!', '#38bdf8');
    });

    AudioSys.commLossStun();
  }

  fireTamperAttack(st) {
    const tp = st?.tamper;
    if (!tp || !tp.enabled) return;

    const activeEnemies = this.enemies.getChildren().filter(e => {
      if (!e || !e.active) return false;
      const d = e.getData('enemy');
      return d && d.hp > 0;
    });

    if (activeEnemies.length === 0) return;

    const targetCount = Math.min(activeEnemies.length, Math.max(1, tp.targets || 1));
    const chosen = Phaser.Utils.Array.Shuffle([...activeEnemies]).slice(0, targetCount);
    const finalDmg = Math.max(1, Math.round((tp.damage || 26) * (st.globalDamageMult || 1)));

    if (this.tamperFxGraphics) {
      this.tamperFxGraphics.clear();
      chosen.forEach(target => {
        if (!target || !target.active) return;
        const skyX = target.x + Phaser.Math.Between(-26, 26);
        const skyY = target.y - 240;
        const groundY = target.y + 4;

        this.tamperFxGraphics.lineStyle(5, 0x0284c7, 0.45);
        this.tamperFxGraphics.beginPath();
        this.tamperFxGraphics.moveTo(skyX, skyY);
        const segs = 5;
        for (let s = 1; s < segs; s++) {
          const t = s / segs;
          const jx = Phaser.Math.Linear(skyX, target.x, t) + Phaser.Math.Between(-14, 14);
          const jy = Phaser.Math.Linear(skyY, groundY, t);
          this.tamperFxGraphics.lineTo(jx, jy);
        }
        this.tamperFxGraphics.lineTo(target.x, groundY);
        this.tamperFxGraphics.strokePath();

        this.tamperFxGraphics.lineStyle(2.5, 0x38bdf8, 0.98);
        this.tamperFxGraphics.beginPath();
        this.tamperFxGraphics.moveTo(skyX, skyY);
        for (let s = 1; s < segs; s++) {
          const t = s / segs;
          const jx = Phaser.Math.Linear(skyX, target.x, t) + Phaser.Math.Between(-14, 14);
          const jy = Phaser.Math.Linear(skyY, groundY, t);
          this.tamperFxGraphics.lineTo(jx, jy);
        }
        this.tamperFxGraphics.lineTo(target.x, groundY);
        this.tamperFxGraphics.strokePath();

        this.tamperFxGraphics.fillStyle(0xe0f2fe, 0.95);
        this.tamperFxGraphics.fillCircle(target.x, groundY, 7);
        this.tamperFxGraphics.lineStyle(2, 0x38bdf8, 0.85);
        this.tamperFxGraphics.strokeEllipse(target.x, groundY + 2, 24, 10);
      });

      this.time.delayedCall(140, () => {
        if (this.tamperFxGraphics) this.tamperFxGraphics.clear();
      });
    }

    chosen.forEach(target => {
      if (!target || !target.active) return;
      this.damageEnemy(target, finalDmg);
    });

    AudioSys.tamperZap();
  }

  onProjectileHit(proj, enemy) {
    if (!proj.active || !enemy.active) return;
    const pData = proj.getData('proj');
    if (!pData || pData.hitList.includes(enemy)) return;
    pData.hitList.push(enemy);

    this.damageEnemy(enemy, pData.damage);
    pData.pierce--;
    if (pData.pierce <= 0) proj.destroy();
  }

  onEnemyProjectileHit(player, saw) {
    if (this.gameState !== 'PLAYING' || !saw || !saw.active) return;
    const st = player.getData('stats');
    const pData = saw.getData('enemyProj');
    if (!st || !pData) return;

    const dmg = getReducedDamage(st, pData.damage || 18);
    saw.destroy();

    if (st.invulnTimer > 0) return;

    st.hp -= dmg;
    st.invulnTimer = 0.5;
    this.cameras.main.shake(150, 0.012);
    AudioSys.hurt();
    this.addFloatingText(player.x, player.y - 22, `-${dmg}`, '#ef4444');

    if (st.hp <= 0) {
      if (this.inCraDimension) {
        this.exitCraDimension(false);
      } else {
        st.hp = 0;
        this.endGame();
      }
    }
  }

  rollXpTierDrop(eData) {
    const t = this.elapsedTime || 0;
    const st = this.player ? this.player.getData('stats') : null;
    const lvl = st ? (Number(st.level) || 1) : 1;

    if (eData.isBoss) {
      const bossTier = t < 120 ? 'yellow' : ((lvl >= 8 || t >= 240) ? 'red' : 'blue');
      const bossTint = bossTier === 'red' ? 0xef4444 : (bossTier === 'blue' ? 0x38bdf8 : 0xfacc15);
      return { tier: bossTier, tint: bossTint, scale: 1.35, value: getXpValueByTier(bossTier, eData.xp) };
    }

    if (t < 120) {
      return { tier: 'yellow', tint: 0xfacc15, scale: 1, value: getXpValueByTier('yellow', eData.xp) };
    }

    const r = Math.random();
    const canDropRed = lvl >= 8 || t >= 240;

    if (canDropRed) {
      const redChance = Math.min(0.09, 0.025 + Math.max(0, lvl - 8) * 0.008 + Math.max(0, t - 240) / 8000);
      if (r < redChance) {
        return { tier: 'red', tint: 0xef4444, scale: 1.25, value: getXpValueByTier('red', eData.xp) };
      }
    }

    const blueProgress = Math.min(1, (t - 120) / 180);
    const blueChance = 0.09 + blueProgress * 0.14;
    if (r < (canDropRed ? 0.05 : 0) + blueChance) {
      return { tier: 'blue', tint: 0x38bdf8, scale: 1.1, value: getXpValueByTier('blue', eData.xp) };
    }

    return { tier: 'yellow', tint: 0xfacc15, scale: 1, value: getXpValueByTier('yellow', eData.xp) };
  }

  damageEnemy(enemy, dmg) {
    if (!enemy.active) return;
    const eData = enemy.getData('enemy');
    if (!eData) return;
    eData.hp -= dmg;

    if (eData.isBoss) {
      this.lastHitBossSprite = enemy;
    }

    if (typeof enemy.setTintMode === 'function' && Phaser.TintModes && Phaser.TintModes.FILL !== undefined) {
      enemy.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    } else {
      enemy.setTint(0xffffff);
    }
    this.time.delayedCall(70, () => { if (enemy.active) enemy.clearTint(); });

    AudioSys.hit();
    this.addFloatingText(enemy.x, enemy.y - 16, `${dmg}`, '#fef08a');

    if (eData.hp <= 0) {
      const wasCorruptOperator = Boolean(eData.isCorruptOperator);
      if (this.lastHitBossSprite === enemy) {
        this.lastHitBossSprite = null;
      }
      if (eData.hpBar) eData.hpBar.destroy();

      this.kills++;
      if (eData.isBoss) this.bossKills++;
      this.score += eData.xp * 20;
      AudioSys.kill();

      if (wasCorruptOperator && this.inCraDimension) {
        enemy.destroy();
        this.exitCraDimension(true);
        return;
      }

      if (eData.isSupremeBoss) {
        const bx = enemy.x;
        const by = enemy.y;
        enemy.destroy();
        this.onSupremeBossDefeated(bx, by);
        return;
      }

      if (eData.isBoss) {
        const chestScrap = eData.isSupremeBoss
          ? Phaser.Math.Between(25, 35)
          : Phaser.Math.Between(12, 18);
        this.spawnBossLootChest(enemy.x, enemy.y, chestScrap);

        const xpDrop = this.rollXpTierDrop(eData);
        const bossXp = this.gems.create(enemy.x - 22, enemy.y + 8, 'bolt')
          .setDepth(getWorldEntityDepth(enemy.y + 8, -5))
          .setTint(xpDrop.tint)
          .setScale(xpDrop.scale);
        bossXp.setData('gem', {
          type: 'xp_tier',
          tier: xpDrop.tier,
          value: xpDrop.value
        });
      } else {
        const r = Math.random();
        if (r < 0.012) {
          const med = this.gems.create(enemy.x, enemy.y, 'medkit').setDepth(getWorldEntityDepth(enemy.y, -5));
          med.setData('gem', { type: 'medkit', value: 0 });
        } else if (r < 0.019) {
          const mag = this.gems.create(enemy.x, enemy.y, 'magnet_drop').setDepth(getWorldEntityDepth(enemy.y, -5));
          mag.setData('gem', { type: 'magnet_drop', value: 0 });
        } else if (r < 0.022) {
          const bmb = this.gems.create(enemy.x, enemy.y, 'bomb_drop').setDepth(getWorldEntityDepth(enemy.y, -5));
          bmb.setData('gem', { type: 'bomb_drop', value: 0 });
        } else if (r < 0.772) {
          const xpDrop = this.rollXpTierDrop(eData);
          const gem = this.gems.create(enemy.x, enemy.y, 'bolt')
            .setDepth(getWorldEntityDepth(enemy.y, -5))
            .setTint(xpDrop.tint)
            .setScale(xpDrop.scale);
          gem.setData('gem', {
            type: 'xp_tier',
            tier: xpDrop.tier,
            value: xpDrop.value
          });
        } else {
          const chapaTex = this.resolveCustomOrFallbackTexture('chapa', 'chapa_fallback');
          const scrap = this.gems.create(enemy.x, enemy.y, chapaTex)
            .setDepth(getWorldEntityDepth(enemy.y, -5))
            .setDisplaySize(16, 16);
          scrap.setData('gem', {
            type: 'scrap_chapa',
            value: 1
          });
        }
      }

      enemy.destroy();
    }
  }

  onPlayerHit(player, enemy) {
    if (this.gameState !== 'PLAYING') return;
    const st = player.getData('stats');
    const eData = enemy.getData('enemy');
    if (!st || !eData || st.invulnTimer > 0) return;

    const dmg = getReducedDamage(st, eData.damage);
    st.hp -= dmg;
    st.invulnTimer = 0.5;
    this.cameras.main.shake(150, 0.01);
    AudioSys.hurt();
    this.addFloatingText(player.x, player.y - 22, `-${dmg}`, '#ef4444');

    if (st.hp <= 0) {
      if (this.inCraDimension) {
        this.exitCraDimension(false);
      } else {
        st.hp = 0;
        this.endGame();
      }
    }
  }

  onCollectGem(player, gem) {
    if (this.gameState !== 'PLAYING' || !gem.active) return;
    const st = player.getData('stats');
    const gData = gem.getData('gem');
    if (!st || !gData) return;

    gem.destroy();

    if (gData.type === 'boss_chest') {
      if (gData.beamTween) gData.beamTween.stop();
      if (gData.beamGfx) gData.beamGfx.destroy();
      const amount = Math.max(1, Number(gData.value) || 10);
      this.runChapasCollected = (this.runChapasCollected || 0) + amount;
      this.score += amount * 35;
      AudioSys.chestPickup();
      this.cameras.main.flash(180, 250, 204, 21, false);
      this.addFloatingText(player.x, player.y - 26, `🧰 +${amount} CHATARRA!`, '#facc15');
    } else if (gData.type === 'scrap_chapa') {
      const amount = Math.max(1, Number(gData.value) || 1);
      this.runChapasCollected = (this.runChapasCollected || 0) + amount;
      this.score += amount * 25;
      AudioSys.scrapPickup();
      this.addFloatingText(player.x, player.y - 18, `+${amount} CHATARRA`, '#fde047');
    } else if (gData.type === 'bomb_drop') {
      this.detonateBombDrop();
    } else if (gData.type === 'magnet_drop') {
      this.magnetPullActive = true;
      AudioSys.magnetPickup();
      this.addFloatingText(player.x, player.y - 20, '¡IMÁN ACTIVADO!', '#38bdf8');
    } else if (gData.type === 'medkit') {
      AudioSys.pickup();
      st.hp = Math.min(st.maxHp, st.hp + 25);
      this.addFloatingText(player.x, player.y - 18, '+25 PS', '#4ade80');
    } else {
      AudioSys.pickup();
      const gainedXp = Math.max(1, Math.round((gData.value || 5) * (st.xpValueMult || 1)));
      st.xp += gainedXp;
      this.score += gainedXp * 10;
      if (gData.tier === 'red') {
        this.addFloatingText(player.x, player.y - 20, `+${gainedXp} XP ROJA!`, '#f87171');
      } else if (gData.tier === 'blue') {
        this.addFloatingText(player.x, player.y - 16, `+${gainedXp} XP`, '#38bdf8');
      }
      if (st.xp >= st.xpToNext) {
        st.xp -= st.xpToNext;
        st.level++;
        st.xpToNext = Math.round(st.xpToNext * 1.34 + 14);
        this.triggerLevelUp();
      }
    }
  }

  syncThermalBoxToTicketGraphic(finalW, finalH, finalY) {
    const panel = document.querySelector('#levelup-screen .thermal-panel');
    if (!panel) return;

    this._lastThermalDims = { finalW, finalH, finalY };

    const canvasRect = this.sys.game.canvas.getBoundingClientRect();
    const viewW = this.scale.width || 854;
    const viewH = this.scale.height || 480;
    const scaleX = canvasRect.width / viewW;
    const scaleY = canvasRect.height / viewH;

    const isCompact = window.innerHeight <= 500 || canvasRect.height <= 420;
    const topFactor = isCompact ? 0.23 : 0.34;
    const bottomFactor = isCompact ? 0.45 : 0.44;
    const minTopSafePx = canvasRect.top + Math.max(46, canvasRect.height * (isCompact ? 0.22 : 0.14));
    const maxBottomSafePx = canvasRect.bottom - Math.max(6, canvasRect.height * 0.02);

    const graphicTopPx = canvasRect.top + (finalY - finalH * topFactor) * scaleY;
    const graphicBottomPx = canvasRect.top + (finalY + finalH * bottomFactor) * scaleY;

    const clampedTopPx = Math.max(minTopSafePx, graphicTopPx);
    const clampedBottomPx = Math.min(maxBottomSafePx, Math.max(clampedTopPx + 110, graphicBottomPx));
    const availableCenterYPx = (clampedTopPx + clampedBottomPx) / 2;
    const maxBoxHeightPx = Math.max(110, clampedBottomPx - clampedTopPx);

    const widthRatio = isCompact ? 0.72 : 0.78;
    const availableWidthPx = Math.min(540, Math.max(240, finalW * widthRatio * scaleX));

    panel.style.position = 'fixed';
    panel.style.left = `${Math.round(canvasRect.left + (this.scale.width / 2) * scaleX)}px`;
    panel.style.top = `${Math.round(availableCenterYPx)}px`;
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.marginTop = '0px';
    panel.style.width = `${Math.round(availableWidthPx)}px`;
    panel.style.maxWidth = '90vw';
    panel.style.maxHeight = `${Math.round(maxBoxHeightPx)}px`;
    panel.style.overflowY = 'auto';
  }

  createThermalPaperGraphic(centerX, targetY, width, height) {
    this.hideThermalPaperGraphic();

    const topMargin = this.scale.height < 420 ? 34 : 68;
    const maxAllowedH = Math.max(200, this.scale.height - topMargin);
    let finalW = width;
    let finalH = maxAllowedH;

    const hasTicketTex = this.hasValidTexture('ticket_img');
    if (hasTicketTex) {
      const srcImg = this.textures.get('ticket_img').getSourceImage();
      const aspect = (srcImg && srcImg.width && srcImg.height) ? (srcImg.width / srcImg.height) : (1533 / 1762);
      finalH = maxAllowedH;
      finalW = Math.round(finalH * aspect);
      if (finalW > this.scale.width * 0.92) {
        finalW = Math.round(this.scale.width * 0.92);
        finalH = Math.round(finalW / aspect);
      }
    }

    const finalY = this.scale.height - finalH / 2 - 2;
    const startY = this.scale.height + finalH / 2 + 12;

    this.syncThermalBoxToTicketGraphic(finalW, finalH, finalY);

    const container = this.add.container(centerX, startY).setScrollFactor(0).setDepth(HUD_BASE_DEPTH - 100);

    if (hasTicketTex) {
      const ticketSprite = this.add.image(0, 0, 'ticket_img');
      ticketSprite.setDisplaySize(finalW, finalH);
      ticketSprite.setAlpha(1);
      ticketSprite.setTint(this._currentTicketHasFireworks ? 0xfef08a : 0xf8fafc);
      container.add(ticketSprite);
    } else {
      const g = this.add.graphics();
      const left = -finalW / 2;
      const top = -finalH / 2;
      g.fillStyle(0xf8fafc, 1);
      g.fillRect(left, top, finalW, finalH);
      g.lineStyle(1.5, 0x94a3b8, 1);
      g.strokeRect(left, top, finalW, finalH);
      container.add(g);
    }

    this.thermalPaperObj = container;

    return new Promise((resolve) => {
      this.tweens.add({
        targets: container,
        y: finalY,
        duration: 460,
        ease: 'Cubic.easeOut',
        onComplete: () => resolve()
      });
    });
  }

  hideThermalPaperGraphic() {
    this._lastThermalDims = null;
    if (this.thermalPaperObj) {
      this.tweens.killTweensOf(this.thermalPaperObj);
      if (this.thermalPaperObj.clearMask) {
        this.thermalPaperObj.clearMask(true);
      }
      this.thermalPaperObj.destroy();
      this.thermalPaperObj = null;
    }
    if (this.thermalPaperMaskG) {
      this.thermalPaperMaskG.destroy();
      this.thermalPaperMaskG = null;
    }
  }

  triggerLevelUp() {
    if (this.gameState === 'LEVELUP') return;
    this.gameState = 'LEVELUP';
    this.physics.pause();
    this.joystick.active = false;
    this.joystick.pointerId = null;
    this.updatePauseButtonVisibility();
    AudioSys.levelUp();
    AudioSys.ticketPrint();

    const st = this.player.getData('stats');
    const availableUpgrades = UPGRADES.filter(u => !u.requires || u.requires(st));

    const rareFourChoice = availableUpgrades.length >= 4 && Math.random() < 0.035;
    const optionCount = rareFourChoice ? Math.min(4, availableUpgrades.length) : Math.min(3, availableUpgrades.length);
    this._currentTicketHasFireworks = rareFourChoice;
    const _fm = document.getElementById('fusion-evolution-modal'); if (_fm) _fm.remove();
    this.clearFireworks();
    if (rareFourChoice) {
      this.spawnFireworkBurst();
      this.fireworkSpawnTimer = 0.25;
    }

    const pool = Phaser.Utils.Array.Shuffle([...availableUpgrades]).slice(0, optionCount);
    const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.elapsedTime % 60)).padStart(2, '0');
    const ticketNum = String(st.level).padStart(3, '0');

    cardsContainer.innerHTML = `
      <div class="thermal-ticket${rareFourChoice ? ' is-fireworks' : ''}" id="thermal-ticket-box">
        <div class="thermal-header">
          <div class="thermal-brand">${rareFourChoice ? '🎆 *** TICKET DORADO · 4 MEJORAS *** 🎆' : '*** CRA SUMINISTRO TÉRMICO ***'}</div>
          <div class="thermal-meta">TICKET #${ticketNum} · NV.${st.level} · TIEMPO ${mins}:${secs}</div>
        </div>
        <div class="thermal-items" id="thermal-items-list"></div>
        <div class="thermal-footer">
          <span>${rareFourChoice ? 'EVENTO RARO: 4 OPCIONES' : 'SELECCIONA 1 MEJORA'}</span>
          <span>--UNION--</span>
        </div>
      </div>
    `;

    const itemsList = document.getElementById('thermal-items-list');
    const ticketBox = document.getElementById('thermal-ticket-box');
    const allOptionButtons = [];

    pool.forEach((upg, idx) => {
      const tagText = getUpgradeTagLabel(upg, st);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thermal-option';
      btn.innerHTML = `
        <div class="thermal-option-main">
          <span class="thermal-icon">${upg.icon}</span>
          <div>
            <div class="thermal-title">0${idx + 1}. ${upg.title}</div>
            <div class="thermal-desc">${upg.desc}</div>
          </div>
        </div>
        <span class="thermal-tag">${tagText}</span>
      `;
      btn.onclick = (e) => {
        e.stopPropagation();
        if (btn.disabled || this.gameState !== 'LEVELUP') return;
        allOptionButtons.forEach(b => { b.disabled = true; });
        const _staleModal = document.getElementById('fusion-evolution-modal');
        if (_staleModal) _staleModal.remove();

        st.upgradeCounts = st.upgradeCounts || {};
        st.upgradeCounts[upg.id] = (Number(st.upgradeCounts[upg.id]) || 0) + 1;
        upg.apply(st);
        const triggeredFusion = this.checkAndTriggerFusion(st);
        this.syncDrones(st.dronesEnabled ? st.orbitals : 0);
        this._currentTicketHasFireworks = false;
        this.clearFireworks();
        this.hideThermalPaperGraphic();
        levelupScreen.classList.add('hidden');

        if (triggeredFusion) {
          this.physics.pause();
          this.gameState = 'FUSION_MODAL';
          this.updatePauseButtonVisibility();
        } else {
          this._pausedByPortrait = false;
          this.gameState = 'PLAYING';
          this.physics.resume();
          this.updatePauseButtonVisibility();
          checkOrientation();
        }
      };
      allOptionButtons.push(btn);
      itemsList.appendChild(btn);
    });

    levelupScreen.classList.remove('hidden');

    const paperW = Math.min(520, this.scale.width * 0.72);
    const paperH = Math.min(340, this.scale.height * 0.72);
    this.createThermalPaperGraphic(this.scale.width / 2, this.scale.height / 2, paperW, paperH)
      .then(() => {
        if (this.gameState === 'LEVELUP' && ticketBox) {
          ticketBox.classList.add('is-ready');
        }
      });
  }

  syncDrones(count) {
    while (this.drones.length < count) {
      const drone = this.add.sprite(this.player.x, this.player.y, 'drone').setDepth(getWorldEntityDepth(this.player.y, 7000));
      this.drones.push(drone);
    }
  }

  endGame() {
    if (this.gameState === 'GAMEOVER') return;
    this.clearPortalVisuals();
    this.clearDimensionRoomVisuals();
    this.clearExitDoorVisuals();
    const _fm = document.getElementById('fusion-evolution-modal'); if (_fm) _fm.remove();
    const _vm = document.getElementById('victory-screen-modal'); if (_vm) _vm.remove();
    this.clearFireworks();
    this._currentTicketHasFireworks = false;
    this.inCraDimension = false;
    this.gameState = 'GAMEOVER';
    this.physics.pause();
    this.joystick.active = false;
    this.joystick.pointerId = null;
    this._pausedByPortrait = false;
    this.updatePauseButtonVisibility();

    const st = this.player.getData('stats');
    const earnedChapas = (this.runChapasCollected || 0) + (this.bonusChapasEarned || 0);
    const meta = loadMeta();
    meta.chapas += earnedChapas;
    saveMeta(meta);
    refreshMenuChatarraUI();

    const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.elapsedTime % 60)).padStart(2, '0');
    document.getElementById('final-time').textContent = `${mins}:${secs}`;
    document.getElementById('final-level').textContent = String(st.level);
    document.getElementById('final-kills').textContent = String(this.kills);
    document.getElementById('final-score').textContent = String(this.score);
    const finalChatarraEl = document.getElementById('final-chapas');
    if (finalChatarraEl) finalChatarraEl.textContent = `+${earnedChapas}`;
    gameoverScreen.classList.remove('hidden');
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.bgTile.tilePositionX = this.cameras.main.scrollX;
    this.bgTile.tilePositionY = this.cameras.main.scrollY;
    this.updateFireworks(dt);

    if (this.gameState !== 'PLAYING') {
      this.updateHUD();
      return;
    }

    this.elapsedTime += dt;
    const st = this.player.getData('stats');

    if (this.victoryFireworksTimer > 0) {
      this.victoryFireworksTimer = Math.max(0, this.victoryFireworksTimer - dt);
      if (this.victoryFireworksTimer <= 0) {
        this.victoryFireworksActive = false;
      }
    }

    if (!this.inCraDimension && !this.levelCleared) {
      this.tryRollDimensionPortal(dt);
      this.updateDimensionPortalTimer(dt);
    }

    if (!this.levelCleared) {
      if (!this.horde1Triggered && this.elapsedTime >= 240) {
        this.triggerFirstHordeEvent();
      }

      if (!this.tolcrapSpawned && this.elapsedTime >= 330) {
        this.tolcrapSpawned = true;
        this.spawnEnemy(true, false);
      }

      if (!this.horde2Triggered && this.elapsedTime >= 540) {
        this.triggerSecondHordeEvent();
      }

      if (!this.supremeColossusSpawned && this.elapsedTime >= 720) {
        this.supremeColossusSpawned = true;
        this.spawnEnemy(true, true);
        this.spawnBlockingFormation(7, true);
      }
    }

    if (this.hordeActiveTimer > 0) {
      this.hordeActiveTimer = Math.max(0, this.hordeActiveTimer - dt);
      if (this.hordeActiveTimer <= 0) {
        this.hordeTier = 0;
      }
    }

    if (st.invulnTimer > 0) {
      st.invulnTimer -= dt;
      this.player.setAlpha(Math.floor(st.invulnTimer * 18) % 2 === 0 ? 1 : 0.4);
    } else {
      this.player.setAlpha(1);
    }

    let mx = 0, my = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) mx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) mx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) my -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) my += 1;

    if (this.joystick.active) {
      mx = this.joystick.dx;
      my = this.joystick.dy;
    } else if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
    }

    this.player.setVelocity(mx * st.speed, my * st.speed);

    if (this.inCraDimension && this.dimensionRoomBounds) {
      const b = this.dimensionRoomBounds;
      this.player.x = Phaser.Math.Clamp(this.player.x, b.minX, b.maxX);
      this.player.y = Phaser.Math.Clamp(this.player.y, b.minY, b.maxY);
      if ((this.player.x <= b.minX && this.player.body.velocity.x < 0) || (this.player.x >= b.maxX && this.player.body.velocity.x > 0)) {
        this.player.setVelocityX(0);
      }
      if ((this.player.y <= b.minY && this.player.body.velocity.y < 0) || (this.player.y >= b.maxY && this.player.body.velocity.y > 0)) {
        this.player.setVelocityY(0);
      }
    }

    this.player.setDepth(getWorldEntityDepth(this.player.y));

    if (
      !this.inCraDimension &&
      !this.dimensionTransitionLock &&
      this.dimensionPortalSpawned &&
      this.dimensionPortalPos &&
      this.dimensionPortalSprite &&
      this.dimensionPortalSprite.active
    ) {
      const distPortal = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.dimensionPortalPos.x,
        this.dimensionPortalPos.y
      );
      if (distPortal <= 34) {
        this.enterCraWhiteDimension();
        this.updateHUD();
        return;
      }
    }

    if (
      !this.inCraDimension &&
      this.levelCleared &&
      this.exitDoorPos &&
      this.exitDoorSprite &&
      this.exitDoorSprite.active
    ) {
      const distDoor = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.exitDoorPos.x,
        this.exitDoorPos.y
      );
      if (distDoor <= 36) {
        this.completeLevelVictory();
        this.updateHUD();
        return;
      }
    }

    const isMoving = Math.abs(mx) > 0.05 || Math.abs(my) > 0.05;
    if (isMoving) {
      if (Math.abs(mx) > Math.abs(my)) {
        this.lastDirection = 'side';
        this.isLookingLeft = mx < 0;
        this.player.setFlipX(this.isLookingLeft);
        if (this.player.anims.currentAnim?.key !== 'gsosito_side') {
          this.player.play('gsosito_side', true);
        }
      } else if (my < 0) {
        this.lastDirection = 'up';
        this.player.setFlipX(false);
        if (this.player.anims.currentAnim?.key !== 'gsosito_up') {
          this.player.play('gsosito_up', true);
        }
      } else {
        this.lastDirection = 'down';
        this.player.setFlipX(false);
        if (this.player.anims.currentAnim?.key !== 'gsosito_down') {
          this.player.play('gsosito_down', true);
        }
      }
    } else {
      this.player.anims.stop();
      if (this.lastDirection === 'side') {
        this.player.setTexture('gsosito_idle_side');
        this.player.setFlipX(this.isLookingLeft);
      } else if (this.lastDirection === 'up') {
        this.player.setTexture('gsosito_idle_back');
        this.player.setFlipX(false);
      } else {
        this.player.setTexture('gsosito_idle_front');
        this.player.setFlipX(false);
      }
    }

    if (!this.inCraDimension && !this.levelCleared) {
      const baseSpawnInterval = Math.max(0.45, 1.35 - this.elapsedTime / 280);
      const hordeIntervalMult = this.hordeTier === 2 ? 0.36 : (this.hordeTier === 1 ? 0.55 : 1);
      const spawnInterval = baseSpawnInterval * hordeIntervalMult;
      const maxActiveEnemies = this.hordeTier === 2 ? 125 : (this.hordeTier === 1 ? 95 : 70);

      this.spawnTimer += dt;
      if (this.spawnTimer >= spawnInterval && this.enemies.countActive(true) < maxActiveEnemies) {
        this.spawnTimer = 0;
        const burst = this.hordeTier === 2 ? 3 : (this.hordeTier === 1 ? 2 : 1);
        for (let b = 0; b < burst && this.enemies.countActive(true) < maxActiveEnemies; b++) {
          this.spawnEnemy(false, false, null, null, this.hordeTier === 2 ? 1.35 : 1);
        }
      }
    }

    const globalRate = st.globalFirerateMult || 1;
    const globalDmg = st.globalDamageMult || 1;

    if (st.fusionActive) {
      if (st.domoFish) st.domoFish.enabled = false;
      st.fusionTimer = (st.fusionTimer ?? 0) - dt;
      if (st.fusionTimer <= 0) {
        const effectiveCd = Math.max(0.72, (st.fusionCooldown || 1.28) * Math.max(0.75, Math.min(1.2, st.weapon.cooldown)));
        st.fusionTimer = effectiveCd / globalRate;
        this.fireFusedPurpleLasers(st);
      }
    } else {
      st.weapon.timer -= dt * globalRate;
      if (st.weapon.timer <= 0) {
        st.weapon.timer = st.weapon.cooldown;
        const maxLaserRange = 285;
        const nearbyEnemies = this.enemies.getChildren()
          .filter(e => {
            if (!e || !e.active) return false;
            const dData = e.getData('enemy');
            return dData && dData.hp > 0 && Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) <= maxLaserRange;
          })
          .sort((a, b) => (
            Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
            Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y)
          ));

        if (nearbyEnemies.length > 0) {
          const target = nearbyEnemies[0];
          const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 8, target.x, target.y);
          this.player.setFlipX(Math.cos(baseAngle) < 0);
          const count = st.weapon.projectileCount;
          const spread = 0.14;
          const finalLaserDmg = Math.max(1, Math.round(st.weapon.damage * globalDmg));

          for (let i = 0; i < count; i++) {
            const angle = baseAngle + (i - (count - 1) / 2) * spread;
            const proj = this.projectiles.create(this.player.x, this.player.y - 8, 'laser').setDepth(getWorldEntityDepth(this.player.y, 6000));
            proj.setRotation(angle);
            proj.setVelocity(Math.cos(angle) * st.weapon.projectileSpeed, Math.sin(angle) * st.weapon.projectileSpeed);
            proj.setData('proj', { damage: finalLaserDmg, pierce: st.weapon.pierce, hitList: [] });
            this.time.delayedCall(900, () => { if (proj.active) proj.destroy(); });
          }
          AudioSys.shoot();
        }
      }

      if (st.domoFish && st.domoFish.enabled) {
        st.domoFish.timer = (st.domoFish.timer ?? 0) - dt * globalRate;
        if (st.domoFish.timer <= 0) {
          st.domoFish.timer = st.domoFish.baseCooldown || 3.2;
          this.fireDomoFish360(st);
        }
      }
    }

    if (st.tamper && st.tamper.enabled) {
      st.tamper.timer = (st.tamper.timer ?? 0) - dt * globalRate;
      if (st.tamper.timer <= 0) {
        st.tamper.timer = st.tamper.cooldown || 3.0;
        this.fireTamperAttack(st);
      }
    }

    if (st.commLoss && st.commLoss.enabled) {
      st.commLoss.timer = (st.commLoss.timer ?? 0) - dt * globalRate;
      if (st.commLoss.timer <= 0) {
        st.commLoss.timer = st.commLoss.cooldown || 11.5;
        this.fireCommLossAttack(st);
      }
    }

    if (this.stunFxGraphics) {
      this.stunFxGraphics.clear();
    }

    const activeEnemiesList = this.enemies.getChildren().filter(e => e && e.active);
    activeEnemiesList.forEach(enemy => {
      const eData = enemy.getData('enemy');
      if (!eData) return;

      if (eData.stunTimer && eData.stunTimer > 0) {
        eData.stunTimer = Math.max(0, eData.stunTimer - dt);
        enemy.setVelocity(0, 0);
        if (this.stunFxGraphics) {
          const pulse = 0.65 + 0.35 * Math.sin((time || 0) * 0.015);
          this.stunFxGraphics.lineStyle(2, 0x38bdf8, pulse);
          this.stunFxGraphics.strokeEllipse(enemy.x, enemy.y - 24, 20, 7);
          this.stunFxGraphics.fillStyle(0x7dd3fc, pulse);
          this.stunFxGraphics.fillCircle(enemy.x - 6, enemy.y - 24, 2.2);
          this.stunFxGraphics.fillCircle(enemy.x + 6, enemy.y - 24, 2.2);
        }
      } else if (eData.isCorruptOperator) {
        this.updateCorruptOperatorAttacks(enemy, eData, dt);
        if (!this.corruptDashState) {
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          const vx = Math.cos(angle) * eData.speed;
          const vy = Math.sin(angle) * eData.speed;
          enemy.setVelocity(vx, vy);
          applyEnemyFacing(enemy, vx, eData.facingLeftByDefault);
        }
        if (this.dimensionRoomBounds) {
          const b = this.dimensionRoomBounds;
          enemy.x = Phaser.Math.Clamp(enemy.x, b.minX + 12, b.maxX - 12);
          enemy.y = Phaser.Math.Clamp(enemy.y, b.minY + 12, b.maxY - 12);
        }
      } else {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const vx = Math.cos(angle) * eData.speed;
        const vy = Math.sin(angle) * eData.speed;
        enemy.setVelocity(vx, vy);

        if (eData.isTolcrap) {
          this.applyTolcrapDirectionSprite(enemy, vx, vy);
          eData.sawTimer = (eData.sawTimer ?? 1.4) - dt;
          if (eData.sawTimer <= 0) {
            eData.sawTimer = 2.6;
            this.fireTolcrapSaw(enemy);
          }
        } else if (eData.isWastelandBoss) {
          applyEnemyFacing(enemy, vx, eData.facingLeftByDefault);
          eData.purpleOrbTimer = (eData.purpleOrbTimer ?? 1.5) - dt;
          if (eData.purpleOrbTimer <= 0) {
            eData.purpleOrbTimer = 2.8;
            this.fireWastelandBossPurpleOrbs(enemy);
          }
        } else {
          applyEnemyFacing(enemy, vx, eData.facingLeftByDefault);
        }
      }

      const enemyDepth = getEnemyDepth(enemy, Boolean(eData.isBoss));
      enemy.setDepth(enemyDepth);

      if (eData.hpBar) {
        eData.hpBar.setDepth(enemyDepth + 1);
        const bw = eData.isBoss ? 52 : 26;
        const bh = eData.isBoss ? 6 : 4;
        const yOffset = eData.isBoss ? 36 : 22;
        const bx = enemy.x - bw / 2;
        const by = enemy.y - yOffset;
        const pct = Math.max(0, eData.hp / eData.maxHp);
        eData.hpBar.clear();
        eData.hpBar.fillStyle(0x000000, 0.75);
        eData.hpBar.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        eData.hpBar.fillStyle(eData.isBoss ? 0xa855f7 : 0xef4444, 1);
        eData.hpBar.fillRect(bx, by, bw * pct, bh);
      }

      if (eData.isBoss) {
        eData.orbCd -= dt;
        if (eData.orbCd <= 0) {
          eData.orbCd = 2.4;
          const orbAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          const orb = this.enemyProjectiles.create(enemy.x, enemy.y, 'bolt')
            .setDepth(enemyDepth + 2)
            .setTint(0xe879f9)
            .setScale(1.15);
          orb.setVelocity(Math.cos(orbAngle) * 165, Math.sin(orbAngle) * 165);
          this.time.delayedCall(3500, () => { if (orb.active) orb.destroy(); });
        }
      }
    });

    if (st.dronesEnabled && st.orbitals > 0) {
      st.orbitalAngle += (st.droneOrbitSpeed || 2.1) * dt;
      const orbitR = st.droneOrbitRadius || 68;
      const droneDmg = Math.max(1, Math.round(14 * globalDmg));
      this.drones.forEach((drone, idx) => {
        if (idx >= st.orbitals) {
          drone.setVisible(false);
          return;
        }
        drone.setVisible(true);
        const a = st.orbitalAngle + (idx * Math.PI * 2) / st.orbitals;
        drone.x = this.player.x + Math.cos(a) * orbitR;
        drone.y = this.player.y - 6 + Math.sin(a) * orbitR;
        drone.setDepth(getWorldEntityDepth(drone.y, 7000));

        activeEnemiesList.forEach(enemy => {
          const eData = enemy.getData('enemy');
          if (!eData || eData.hp <= 0) return;
          if (Phaser.Math.Distance.Between(drone.x, drone.y, enemy.x, enemy.y) < 26) {
            eData.orbCd -= dt;
            if (eData.orbCd <= 0) {
              eData.orbCd = 0.35;
              this.damageEnemy(enemy, droneDmg);
            }
          }
        });
      });
    }

    this.gems.getChildren().forEach(gem => {
      if (!gem.active) return;
      const gData = gem.getData('gem');
      if (gData && gData.type === 'boss_chest') {
        gem.setDepth(getWorldEntityDepth(gem.y, 5));
        if (gData.beamGfx) gData.beamGfx.setDepth(getWorldEntityDepth(gem.y, 4));
        return;
      }

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, gem.x, gem.y);
      const isPulling = this.magnetPullActive || dist < st.pickupRange;
      if (isPulling && dist > 1) {
        const pullSpeed = this.magnetPullActive ? 410 : 230;
        const a = Phaser.Math.Angle.Between(gem.x, gem.y, this.player.x, this.player.y);
        gem.setVelocity(Math.cos(a) * pullSpeed, Math.sin(a) * pullSpeed);
      } else {
        gem.setVelocity(0, 0);
      }
      gem.setDepth(getWorldEntityDepth(gem.y, -5));
    });

    this.updateHUD();
  }
}

function checkOrientation() {
  if (!rotateScreen) return;
  const isPortrait = window.innerHeight > window.innerWidth;
  if (isPortrait) {
    rotateScreen.classList.remove('hidden');
  } else {
    rotateScreen.classList.add('hidden');
  }
  if (activeSceneRef && typeof activeSceneRef.handleOrientationPause === 'function') {
    activeSceneRef.handleOrientationPause(isPortrait);
  }
}

window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 120));
checkOrientation();

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 854,
  height: 480,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  backgroundColor: '#1b1e26',
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    resolution: Math.min(window.devicePixelRatio || 1, 2)
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [SurvivorScene]
};

new Phaser.Game(config);
