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
    name: 'Blindaje Base',
    desc: '+15 PS máximos iniciales',
    baseCost: 25,
    stepCost: 20,
    maxLevel: 5
  },
  {
    id: 'perm_speed',
    name: 'Servo-Botas',
    desc: '+8% velocidad inicial',
    baseCost: 30,
    stepCost: 25,
    maxLevel: 5
  },
  {
    id: 'perm_dmg',
    name: 'Láser Calibrado',
    desc: '+15% daño láser inicial',
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
      perm_dmg: 0
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
        perm_dmg: Number(parsed?.levels?.perm_dmg) || 0
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
  refreshMenuChapasUI();
  return empty;
}

function getUpgradeCost(upg, currentLevel) {
  return upg.baseCost + currentLevel * upg.stepCost;
}

function refreshMenuChapasUI() {
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
  tamperZap() {
    this.playTone(1480, 'sawtooth', 0.09, 0.065, 320);
    setTimeout(() => this.playTone(860, 'square', 0.08, 0.045, 190), 35);
  },
  bossOrbShoot() { this.playTone(310, 'sine', 0.16, 0.065, 110); },
  sawShoot() { this.playTone(340, 'sawtooth', 0.16, 0.055, 140); },
  hit() { this.playTone(185, 'sawtooth', 0.055, 0.045, 80); },
  kill() { this.playTone(290, 'square', 0.1, 0.055, 65); },
  pickup() { this.playTone(720, 'sine', 0.07, 0.05, 1240); },
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
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
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

  // Rata mutante en Canvas (2 fotogramas de movimiento; cabeza orientada a la izquierda)
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
      pxRect(g, 9 - step, 18, 2, 2, '#84cc16');
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
      pxRect(g, 13, 31, 4, 9 + step, '#334155');
      pxRect(g, 20, 31, 6, 11, '#0f1218');
      pxRect(g, 21, 31, 4, 9 - step, '#1e293b');
      pxRect(g, 9, 18, 20, 14, '#0f1218');
      pxRect(g, 10, 19, 18, 12, '#1e293b');
      pxRect(g, 12, 19, 14, 5, '#334155');
      pxRect(g, 11, 20, 16, 2, '#94a3b8');
      pxRect(g, 10, 4, 18, 15, '#0f1218');
      pxRect(g, 11, 5, 16, 13, '#334155');
      pxRect(g, 13, 8, 12, 8, '#fdba74');
      pxRect(g, 13, 9, 12, 4, '#0f172a');
      pxRect(g, 15, 10, 2, 2, '#ef4444');
      pxRect(g, 21, 10, 2, 2, '#ef4444');
      pxRect(g, 13, 13, 12, 4, '#475569');
      pxRect(g, 29, 20, 4, 9, '#0f1218');
      pxRect(g, 30, 21, 2, 7, '#fdba74');
      pxRect(g, 31, 12, 3, 14, '#94a3b8');
      pxRect(g, 32, 12, 1, 13, '#f8fafc');
      pxRect(g, 31, 10, 5, 3, '#ef4444');
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
    pxRect(g, 102, 28, 6, 18, '#090b10');
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
    pxRect(g, 4, 4, 8, 8, '#eab308');
    pxRect(g, 5, 5, 6, 6, '#fef08a');
    pxRect(g, 6, 6, 3, 3, '#ffffff');
  });
  registerCanvasTexture(scene, 'medkit', 18, 16, (g) => {
    pxRect(g, 6, 1, 6, 3, '#0f1218');
    pxRect(g, 2, 3, 14, 11, '#0f1218');
    pxRect(g, 3, 4, 12, 9, '#dc2626');
    pxRect(g, 8, 6, 2, 5, '#ffffff');
    pxRect(g, 6, 8, 6, 1, '#ffffff');
  });
  registerCanvasTexture(scene, 'battery', 20, 20, (g) => {
    pxRect(g, 6, 1, 8, 18, '#09111e');
    pxRect(g, 4, 3, 12, 14, '#09111e');
    pxRect(g, 2, 6, 16, 8, '#09111e');
    pxRect(g, 5, 4, 10, 12, '#0284c7');
    pxRect(g, 3, 6, 14, 8, '#0284c7');
    pxRect(g, 6, 5, 8, 10, '#38bdf8');
    pxRect(g, 4, 7, 12, 6, '#38bdf8');
    pxRect(g, 6, 6, 5, 5, '#bae6fd');
    pxRect(g, 7, 7, 3, 3, '#ffffff');
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

function getEnemyDepth(enemy, isBoss = false) {
  return Math.round(enemy.y + 2000 + (isBoss ? 25 : 0));
}

function applyEnemyFacing(enemy, vx, facingLeftByDefault) {
  if (Math.abs(vx) < 0.01) return;
  const movingRight = vx > 0;
  enemy.setFlipX(facingLeftByDefault ? movingRight : !movingRight);
}

function applyVeterancyUpgrade(p) {
  p.veterancyLevel = (p.veterancyLevel || 0) + 1;
  // Cada nivel aporta un poco más de reducción de daño (rendimiento creciente) hasta un máximo del 75%
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

function activateDrones(p) {
  p.dronesEnabled = true;
  p.orbitals = Math.max(1, p.orbitals || 0);
}

function upgradeTamperAttack(p) {
  const nextLvl = (p.tamper.level || 0) + 1;
  p.tamper.level = nextLvl;
  p.tamper.enabled = true;
  if (nextLvl === 1) {
    p.tamper.cooldown = 5.0;
    p.tamper.targets = 1;
    p.tamper.damage = 34;
    p.tamper.timer = 0.25;
  } else {
    p.tamper.damage = Math.round(p.tamper.damage * 1.24);
  }
}

const ACTIVATOR_UPGRADE_IDS = new Set(['domofish360', 'tamper_attack', 'orbital']);

function getUpgradeTagLabel(upg, stats) {
  if (ACTIVATOR_UPGRADE_IDS.has(upg.id)) {
    return 'ACTIVAR';
  }
  const takenCount = Number(stats?.upgradeCounts?.[upg.id]) || 0;
  return `NV.${takenCount + 1}`;
}

const DOMO_ICON = '🔮';
const DRONE_ICON = '🤖';
const TAMPER_ICON = '🌩️';

const UPGRADES = [
  {
    id: 'firerate',
    icon: '🔴',
    title: 'Overclocking',
    desc: 'Aumenta cadencia de disparo del láser básico',
    apply: (p) => { p.weapon.cooldown *= 0.78; }
  },
  {
    id: 'damage',
    icon: '🔴',
    title: 'Alta Potencia',
    desc: 'Aumenta daño base del láser básico',
    apply: (p) => { p.weapon.damage = Math.round(p.weapon.damage * 1.32); }
  },
  {
    id: 'multishot',
    icon: '🔴',
    title: 'Bi-Spectrum',
    desc: '+1 disparo láser simultáneo',
    apply: (p) => { p.weapon.projectileCount += 1; }
  },
  {
    id: 'pierce',
    icon: '🔴',
    title: 'Láser Perforante',
    desc: 'Cada láser básico atraviesa +1 enemigo',
    apply: (p) => { p.weapon.pierce += 1; }
  },
  {
    id: 'domofish360',
    icon: DOMO_ICON,
    title: 'Domo-Fish 360',
    desc: 'Activa un anillo circular de 4 láseres alrededor de ti',
    requires: (p) => !p.domoFish?.enabled,
    apply: (p) => { activateDomoFish(p); }
  },
  {
    id: 'domofish_rays',
    icon: DOMO_ICON,
    title: 'Ráfaga Domo',
    desc: '+2 proyectiles por anillo de Domo-Fish 360',
    requires: (p) => Boolean(p.domoFish?.enabled),
    apply: (p) => { p.domoFish.rays = Math.min(36, (p.domoFish.rays || 4) + 2); }
  },
  {
    id: 'domofish_firerate',
    icon: DOMO_ICON,
    title: 'Cadencia Domo',
    desc: 'Aumenta la velocidad de disparo de Domo-Fish',
    requires: (p) => Boolean(p.domoFish?.enabled),
    apply: (p) => { p.domoFish.baseCooldown = Math.max(1.1, Number((p.domoFish.baseCooldown / 1.2).toFixed(3))); }
  },
  {
    id: 'domofish_damage',
    icon: DOMO_ICON,
    title: 'Potencia Domo',
    desc: 'Aumenta el daño de los láseres de Domo-Fish',
    requires: (p) => Boolean(p.domoFish?.enabled),
    apply: (p) => { p.domoFish.baseDamage = Math.round(p.domoFish.baseDamage * 1.3); }
  },
  {
    id: 'tamper_attack',
    icon: TAMPER_ICON,
    title: 'Ataque Tamper',
    desc: 'Cada 5s un rayo golpea a 1 enemigo aleatorio',
    requires: (p) => !p.tamper?.enabled,
    apply: (p) => { upgradeTamperAttack(p); }
  },
  {
    id: 'tamper_cd',
    icon: TAMPER_ICON,
    title: 'Pulso Tamper',
    desc: 'Reduce el tiempo entre rayos de Ataque Tamper',
    requires: (p) => Boolean(p.tamper?.enabled),
    apply: (p) => { p.tamper.cooldown = Math.max(1.2, Number((p.tamper.cooldown * 0.82).toFixed(3))); }
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
    icon: '⚙️',
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

class SurvivorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SurvivorScene' });
    this._uiBound = false;
    this._lastThermalDims = null;
  }

  preload() {
    this.load.on('loaderror', () => {
      // Permite añadir sprites direccionales de TOLCRAP de forma opcional sin bloquear el arranque
    });

    this.load.image('custom_block', 'img/block.png');
    this.load.image('gameover_bg', 'img/gameover_bg.png');
    this.load.image('retrato_1', 'img/retrato_1.png');
    this.load.image('chapa', 'img/chapa.png');
    this.load.image('prop_barrel', 'img/prop_barrel.png');
    this.load.image('prop_car', 'img/prop_car.png');
    this.load.image('prop_car_2', 'img/prop_car_2.png');
    this.load.image('prop_crate', 'img/prop_crate.png');
    this.load.image('tolcrap_custom', 'img/tolcrap.png');
    this.load.image('tolcrap_side', 'img/tolcrap_side.png');
    this.load.image('tolcrap_up', 'img/tolcrap_up.png');
    this.load.image('tolcrap_down', 'img/tolcrap_down.png');

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
  }

  hasValidTexture(key) {
    return Boolean(key && this.textures.exists(key) && this.textures.get(key).key !== '__MISSING');
  }

  create() {
    buildAllTextures(this);
    this.createAnimations();

    this.gameState = 'MENU';
    this.elapsedTime = 0;
    this.score = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.bossSpawnCount = 0;
    this.bossSpawnTimer = 180;
    this.wastelandBossSpawnedAt8Min = false;
    this.spawnTimer = 0;
    this.lastHitBossSprite = null;

    this.hordeTriggered = false;
    this.hordeActiveTimer = 0;
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
    this.tamperFxGraphics = this.add.graphics().setDepth(9500);

    this.generateWastelandProps();

    this.player = this.physics.add.sprite(0, 0, 'gsosito_idle_front');
    this.player.setDepth(this.player.y + 2000);
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

    this.scale.on('resize', () => {
      if (this.gameState === 'LEVELUP' && this._lastThermalDims) {
        const { finalW, finalH, finalY } = this._lastThermalDims;
        this.syncThermalBoxToTicketGraphic(finalW, finalH, finalY);
      }
      this.updateHUD();
    });
  }

  isInActiveRun() {
    return this.gameState === 'PLAYING' || this.gameState === 'PAUSED' || this.gameState === 'LEVELUP';
  }

  getDefaultStats() {
    const meta = loadMeta();
    const hpBonus = (meta.levels.perm_hp || 0) * 15;
    const speedMult = 1 + (meta.levels.perm_speed || 0) * 0.08;
    const dmgMult = 1 + (meta.levels.perm_dmg || 0) * 0.15;

    return {
      hp: 100 + hpBonus,
      maxHp: 100 + hpBonus,
      xp: 0,
      xpToNext: 22,
      level: 1,
      speed: Math.round(100 * speedMult),
      pickupRange: 65,
      invulnTimer: 0,
      damageReduction: 0,
      veterancyLevel: 0,
      upgradeCounts: {},
      dronesEnabled: false,
      orbitals: 0,
      orbitalAngle: 0,
      droneOrbitRadius: 68,
      droneOrbitSpeed: 2.1,
      globalDamageMult: dmgMult,
      globalFirerateMult: 1,
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
        cooldown: 5.0,
        targets: 1,
        damage: 34,
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
      frameRate: 4,
      repeat: -1
    });

    const animsList = [
      { key: 'catOrange_walk', prefix: 'catOrange', rate: 10 },
      { key: 'catGray_walk', prefix: 'catGray', rate: 10 },
      { key: 'mutantRat_walk', prefix: 'mutantRat', rate: 11 },
      { key: 'thief_walk', prefix: 'thief', rate: 7 },
      { key: 'logistics_walk', prefix: 'logistics', rate: 6 },
      { key: 'foreman_walk', prefix: 'foreman', rate: 5 }
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
    const weightedTypes = [
      { key: 'prop_car', solid: true, w: 181, h: 83 },
      { key: 'prop_car_2', solid: true, w: 192, h: 72 },
      { key: 'prop_barrier', solid: true, w: 28, h: 12 },
      { key: 'prop_barrel', solid: true, w: 27, h: 32 },
      { key: 'prop_crate', solid: true, w: 18, h: 16 }
    ];

    const placed = [];
    const minSpacing = 120;

    for (let i = 0; i < 95; i++) {
      const px = Phaser.Math.Between(-2200, 2200);
      const py = Phaser.Math.Between(-2200, 2200);
      if (Math.hypot(px, py) < 165) continue;

      const tooClose = placed.some(p => Math.hypot(p.x - px, p.y - py) < minSpacing);
      if (tooClose) continue;

      const t = Phaser.Utils.Array.GetRandom(weightedTypes);
      const texKey = this.hasValidTexture(t.key) ? t.key : null;
      if (!texKey) continue;

      placed.push({ x: px, y: py });

      if (t.solid) {
        const obj = this.solidProps.create(px, py, texKey);
        obj.setDepth(py + 2000);
        obj.body.setSize(t.w, t.h);
        obj.refreshBody();
      } else {
        this.add.image(px, py, texKey).setDepth(-5);
      }
    }
  }

  setupTouchJoystick() {
    this.joystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0, maxR: 42 };
    this.joyGraphics = this.add.graphics().setScrollFactor(0).setDepth(9003);

    this.input.on('pointerdown', (pointer) => {
      if (this.gameState !== 'PLAYING') return;
      const targetEl = pointer.event && pointer.event.target;
      if (targetEl && targetEl.closest && targetEl.closest('button, .modern-panel, .overlay:not(.hidden)')) {
        return;
      }
      AudioSys.init();
      this.joystick.active = true;
      this.joystick.startX = pointer.x;
      this.joystick.startY = pointer.y;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
    });

    this.input.on('pointermove', (pointer) => {
      if (!this.joystick.active) return;
      const diffX = pointer.x - this.joystick.startX;
      const diffY = pointer.y - this.joystick.startY;
      const dist = Math.hypot(diffX, diffY);
      if (dist > 0) {
        const clamped = Math.min(dist, this.joystick.maxR);
        this.joystick.dx = (diffX / dist) * (clamped / this.joystick.maxR);
        this.joystick.dy = (diffY / dist) * (clamped / this.joystick.maxR);
      }
    });

    this.input.on('pointerup', () => {
      this.joystick.active = false;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      this.joyGraphics.clear();
    });
  }

  createHUD() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.hudGraphics = this.add.graphics().setScrollFactor(0).setDepth(9000);
    this.hudPortrait = this.add.image(31, 31, 'retrato_1').setScale(1).setScrollFactor(0).setDepth(9001);

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
    }).setScrollFactor(0).setDepth(9002);

    this.hudHpText = this.add.text(60, 24, '100/100', {
      ...fontStyle,
      fontSize: '10px',
      color: '#ffffff'
    }).setScrollFactor(0).setDepth(9002);

    this.hudXpText = this.add.text(60, 38, 'XP 0/22', {
      ...fontStyle,
      fontSize: '10px',
      color: '#e0f2fe'
    }).setScrollFactor(0).setDepth(9002);

    const hudInfoStyle = {
      fontFamily: '"Chakra Petch", "Press Start 2P", monospace',
      fontStyle: 'bold',
      resolution: dpr,
      stroke: '#000000',
      strokeThickness: 3
    };

    this.hudTimeText = this.add.text(this.scale.width / 2, 10, '00:00', {
      ...hudInfoStyle,
      fontSize: '16px',
      color: '#f8fafc'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(9002);

    this.hudKillsText = this.add.text(10, 62, 'BAJAS: 0', {
      ...hudInfoStyle,
      fontSize: '13px',
      color: '#facc15'
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(9002);

    this.hordeBannerText = this.add.text(this.scale.width / 2, 92, '⚠️ SE ACERCA UNA HORDA DE ENEMIGOS ⚠️', {
      ...hudInfoStyle,
      fontSize: '14px',
      color: '#ef4444',
      backgroundColor: 'rgba(9, 13, 20, 0.78)',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(9002).setVisible(false);

    this.bossHudGraphics = this.add.graphics().setScrollFactor(0).setDepth(9000);

    this.bossHudNameText = this.add.text(this.scale.width / 2, this.scale.height - 42, '', {
      ...hudInfoStyle,
      fontSize: '12px',
      color: '#e9d5ff'
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(9002).setVisible(false);

    this.bossHudHpText = this.add.text(this.scale.width / 2, this.scale.height - 23, '', {
      ...fontStyle,
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(9002).setVisible(false);
  }

  triggerHordeEvent() {
    if (this.hordeTriggered) return;
    this.hordeTriggered = true;
    this.hordeActiveTimer = 38;

    AudioSys.hordeAlert();

    if (this.hordeBannerText) {
      this.tweens.killTweensOf(this.hordeBannerText);
      this.hordeBannerText
        .setPosition(this.scale.width / 2, 86)
        .setAlpha(1)
        .setVisible(true);

      this.tweens.add({
        targets: this.hordeBannerText,
        alpha: 0.12,
        duration: 260,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          if (this.hordeBannerText) {
            this.hordeBannerText.setVisible(false);
            this.hordeBannerText.setAlpha(1);
          }
        }
      });
    }

    for (let i = 0; i < 18; i++) {
      this.spawnEnemy(false);
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

    const bossTitle = bossData.name || 'JEFE DEL YERMO';
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
    this.hudTimeText.setPosition(this.scale.width / 2, 10).setText(`${mins}:${secs}`);
    this.hudKillsText.setPosition(10, 62).setText(`BAJAS: ${this.kills}`);

    this.updateBossHUD();

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
    this.gameState = 'PAUSED';
    this.physics.pause();
    this.joystick.active = false;
    this.joyGraphics.clear();
    if (pauseScreen) pauseScreen.classList.remove('hidden');
    this.updatePauseButtonVisibility();
  }

  resumeGame() {
    if (this.gameState !== 'PAUSED') return;
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

  showIOSFullscreenHint() {
    const feedbackEl = document.getElementById('reset-data-feedback');
    if (feedbackEl && optionsModal && !optionsModal.classList.contains('hidden')) {
      feedbackEl.style.color = '#facc15';
      feedbackEl.textContent = 'En iPhone/Safari usa "Compartir → Añadir a pantalla de inicio" para modo pantalla completa.';
      return;
    }
    this.addFloatingText(
      this.player.x,
      this.player.y - 34,
      'En iOS usa "Añadir a inicio" para pantalla completa',
      '#facc15'
    );
  }

  bindUIEvents() {
    refreshMenuChapasUI();
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
        refreshMenuChapasUI();
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
          feedbackEl.textContent = '✓ Datos borrados. Chapas y mejoras reiniciadas a 0.';
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
        AudioSys.init();
        const targetEl = document.documentElement;
        const isStandaloneIOS = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          const reqFs = targetEl.requestFullscreen || targetEl.webkitRequestFullscreen;
          if (reqFs) {
            Promise.resolve(reqFs.call(targetEl)).catch((err) => {
              console.warn('Pantalla completa no disponible en este dispositivo/navegador:', err);
              if (!isStandaloneIOS) {
                this.showIOSFullscreenHint();
              }
            });
          } else if (!isStandaloneIOS) {
            this.showIOSFullscreenHint();
          }
        } else {
          const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
          if (exitFs) {
            Promise.resolve(exitFs.call(document)).catch(() => {});
          }
        }
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

    this.player.setPosition(0, 0);
    this.player.setData('stats', this.getDefaultStats());
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    this.gems.clear(true, true);
    this.drones.forEach(d => d.destroy());
    this.drones = [];
    if (this.tamperFxGraphics) this.tamperFxGraphics.clear();

    this.elapsedTime = 0;
    this.score = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.bossSpawnCount = 0;
    this.bossSpawnTimer = 180;
    this.wastelandBossSpawnedAt8Min = false;
    this.spawnTimer = 0;
    this.lastHitBossSprite = null;
    this.hordeTriggered = false;
    this.hordeActiveTimer = 0;
    this.magnetPullActive = false;

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
  }

  openUpgradesModal() {
    if (!upgradesModal || !shopUpgradesList) return;
    this.renderShopUpgrades();
    upgradesModal.classList.remove('hidden');
  }

  renderShopUpgrades() {
    if (!shopUpgradesList) return;
    const meta = loadMeta();
    refreshMenuChapasUI();
    shopUpgradesList.innerHTML = '';

    SHOP_UPGRADES.forEach(upg => {
      const currentLvl = meta.levels[upg.id] || 0;
      const isMax = currentLvl >= upg.maxLevel;
      const cost = getUpgradeCost(upg, currentLvl);
      const canAfford = !isMax && meta.chapas >= cost;

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(15,23,42,0.85);border:1px solid #334155;border-radius:6px;padding:8px 10px;';

      const info = document.createElement('div');
      info.style.textAlign = 'left';
      info.innerHTML = `
        <div style="font-weight:bold;color:#f8fafc;font-size:12.5px;">${upg.name} <span style="color:#facc15;font-size:10.5px;">(Nv.${currentLvl}/${upg.maxLevel})</span></div>
        <div style="color:#cbd5e1;font-size:11px;">${upg.desc}</div>
      `;

      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.style.cssText = 'pointer-events:auto;white-space:nowrap;padding:7px 11px;font-size:11.5px;';
      if (isMax) {
        btn.textContent = 'MÁXIMO';
        btn.disabled = true;
      } else {
        btn.textContent = `Comprar (${cost})`;
        btn.disabled = !canAfford;
        btn.onclick = (e) => {
          e.stopPropagation();
          const latest = loadMeta();
          const lvl = latest.levels[upg.id] || 0;
          const price = getUpgradeCost(upg, lvl);
          if (lvl < upg.maxLevel && latest.chapas >= price) {
            latest.chapas -= price;
            latest.levels[upg.id] = lvl + 1;
            saveMeta(latest);
            this.renderShopUpgrades();
          }
        };
      }

      row.appendChild(info);
      row.appendChild(btn);
      shopUpgradesList.appendChild(row);
    });
  }

  returnToMenu() {
    this.enemies.getChildren().forEach(e => {
      const eData = e.getData('enemy');
      if (eData && eData.hpBar) eData.hpBar.destroy();
    });
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    this.gems.clear(true, true);
    this.drones.forEach(d => d.destroy());
    this.drones = [];
    if (this.tamperFxGraphics) this.tamperFxGraphics.clear();
    this.player.setPosition(0, 0);
    this.player.setVelocity(0, 0);
    this.lastHitBossSprite = null;
    this.magnetPullActive = false;

    if (this.hordeBannerText) {
      this.tweens.killTweensOf(this.hordeBannerText);
      this.hordeBannerText.setVisible(false).setAlpha(1);
    }

    refreshMenuChapasUI();
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

  fireWastelandBossPurpleOrbs(boss) {
    if (!boss || !boss.active || !this.player || !this.player.active) return;
    const eData = boss.getData('enemy');
    const orbDmg = Math.max(16, Math.round((eData?.damage || 34) * 0.72));
    const orbSpeed = 175;
    const count = 5;
    const spread = 0.24;
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

  spawnEnemy(forceBoss = false, isMinute8WastelandBoss = false) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.hypot(this.scale.width / 2, this.scale.height / 2) + 60;
    const ex = this.player.x + Math.cos(angle) * dist;
    const ey = this.player.y + Math.sin(angle) * dist;
    const diff = 1 + this.elapsedTime / 90;

    if (forceBoss) {
      this.bossSpawnCount = (this.bossSpawnCount || 0) + 1;
      const isTolcrap = !isMinute8WastelandBoss && this.bossSpawnCount === 1;

      if (isTolcrap) {
        const truckKey = this.getTolcrapBaseTexture();
        const boss = this.enemies.create(ex, ey, truckKey).setDepth(getEnemyDepth({ y: ey }, true));
        this.syncTolcrapHitbox(boss, 'side');
        const hpBar = this.add.graphics().setDepth(getEnemyDepth({ y: ey }, true) + 1);
        const maxHp = Math.round(780 * diff);

        boss.setData('enemy', {
          name: 'TOLCRAP',
          hp: maxHp,
          maxHp,
          speed: 43,
          damage: 30,
          xp: 110,
          isBoss: true,
          isTolcrap: true,
          facingLeftByDefault: false,
          sawTimer: 1.5,
          orbCd: 0,
          hpBar
        });

        this.lastHitBossSprite = boss;
        this.addFloatingText(this.player.x, this.player.y - 38, '¡ALERTA: CAMIÓN TOLCRAP!', '#facc15');
        return;
      }

      const boss = this.enemies.create(ex, ey, 'boss_0').setDepth(getEnemyDepth({ y: ey }, true));
      const bossScale = isMinute8WastelandBoss ? 1.55 : 1.15;
      boss.setScale(bossScale);
      boss.body.setCircle(22, 6, 10);
      const hpBar = this.add.graphics().setDepth(getEnemyDepth({ y: ey }, true) + 1);
      const maxHp = isMinute8WastelandBoss
        ? Math.round(2150 * Math.max(1, diff))
        : Math.round(720 * diff);

      boss.setData('enemy', {
        name: isMinute8WastelandBoss
          ? 'SEÑOR SUPREMO DEL YERMO'
          : `COLOSO DEL YERMO #${this.bossSpawnCount}`,
        hp: maxHp,
        maxHp,
        speed: isMinute8WastelandBoss ? 48 : 52,
        damage: isMinute8WastelandBoss ? 36 : 30,
        xp: isMinute8WastelandBoss ? 180 : 80,
        isBoss: true,
        isWastelandBoss: isMinute8WastelandBoss,
        facingLeftByDefault: false,
        purpleOrbTimer: isMinute8WastelandBoss ? 1.6 : 2.8,
        orbCd: 0,
        hpBar
      });

      this.lastHitBossSprite = boss;
      this.addFloatingText(
        this.player.x,
        this.player.y - 38,
        isMinute8WastelandBoss ? '¡EL JEFE DEL YERMO HA LLEGADO!' : '¡JEFE HA APARECIDO!',
        '#c084fc'
      );
      return;
    }

    const roll = Math.random();
    const t = this.elapsedTime;
    let cfg = {
      key: 'mutantRat',
      radius: 10,
      speed: 78,
      hp: 20 * diff,
      damage: 7,
      xp: 5,
      facingLeftByDefault: true
    };

    if (t < 120) {
      if (roll < 0.52) {
        cfg = {
          key: Math.random() > 0.45 ? 'catOrange' : 'catGray',
          radius: 9,
          speed: 86,
          hp: 16 * diff,
          damage: 6,
          xp: 4,
          facingLeftByDefault: true
        };
      } else {
        cfg = {
          key: 'mutantRat',
          radius: 10,
          speed: 78,
          hp: 21 * diff,
          damage: 7,
          xp: 5,
          facingLeftByDefault: true
        };
      }
    } else if (t < 210) {
      if (roll < 0.32) {
        cfg = {
          key: Math.random() > 0.45 ? 'catOrange' : 'catGray',
          radius: 9,
          speed: 90,
          hp: 18 * diff,
          damage: 7,
          xp: 4,
          facingLeftByDefault: true
        };
      } else if (roll < 0.62) {
        cfg = {
          key: 'mutantRat',
          radius: 10,
          speed: 84,
          hp: 25 * diff,
          damage: 8,
          xp: 5,
          facingLeftByDefault: true
        };
      } else if (roll < 0.85) {
        cfg = {
          key: 'thief',
          radius: 11,
          speed: 66,
          hp: 31 * diff,
          damage: 10,
          xp: 6,
          facingLeftByDefault: false
        };
      } else {
        cfg = {
          key: 'logistics',
          radius: 12,
          speed: 51,
          hp: 48 * diff,
          damage: 12,
          xp: 9,
          facingLeftByDefault: false
        };
      }
    } else {
      if (roll < 0.22) {
        cfg = {
          key: Math.random() > 0.45 ? 'catOrange' : 'catGray',
          radius: 9,
          speed: 95,
          hp: 20 * diff,
          damage: 8,
          xp: 4,
          facingLeftByDefault: true
        };
      } else if (roll < 0.44) {
        cfg = {
          key: 'mutantRat',
          radius: 10,
          speed: 89,
          hp: 30 * diff,
          damage: 9,
          xp: 6,
          facingLeftByDefault: true
        };
      } else if (roll < 0.66) {
        cfg = {
          key: 'thief',
          radius: 11,
          speed: 70,
          hp: 36 * diff,
          damage: 11,
          xp: 6,
          facingLeftByDefault: false
        };
      } else if (roll < 0.85) {
        cfg = {
          key: 'logistics',
          radius: 12,
          speed: 54,
          hp: 54 * diff,
          damage: 14,
          xp: 9,
          facingLeftByDefault: false
        };
      } else {
        cfg = {
          key: 'foreman',
          radius: 15,
          speed: 41,
          hp: 98 * diff,
          damage: 18,
          xp: 18,
          facingLeftByDefault: false
        };
      }
    }

    const enemy = this.enemies.create(ex, ey, `${cfg.key}_0`).setDepth(getEnemyDepth({ y: ey }, false));
    enemy.play(`${cfg.key}_walk`);
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
    }).setOrigin(0.5).setDepth(9400);

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

    const bombDamage = Math.round(165 * (1 + this.elapsedTime / 120));
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
    const df = st?.domoFish;
    if (!df || !df.enabled) return;

    const rays = Math.max(4, df.rays || 4);
    const step = (Math.PI * 2) / rays;
    const offset = df.ringOffset || 0;
    const finalDmg = Math.max(1, Math.round(df.baseDamage * (st.globalDamageMult || 1)));

    for (let i = 0; i < rays; i++) {
      const angle = offset + i * step;
      const proj = this.projectiles.create(this.player.x, this.player.y - 8, 'domo_laser').setDepth(9200);
      proj.setRotation(angle);
      proj.setVelocity(Math.cos(angle) * df.projectileSpeed, Math.sin(angle) * df.projectileSpeed);
      proj.setData('proj', { damage: finalDmg, pierce: df.pierce, hitList: [] });
      this.time.delayedCall(1200, () => { if (proj.active) proj.destroy(); });
    }

    df.ringOffset = offset + step * 0.5;
    AudioSys.novaShoot();
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
    const finalDmg = Math.max(1, Math.round((tp.damage || 34) * (st.globalDamageMult || 1)));

    const startX = this.player.x;
    const startY = this.player.y - 10;

    if (this.tamperFxGraphics) {
      this.tamperFxGraphics.clear();
      this.tamperFxGraphics.lineStyle(3, 0x38bdf8, 0.95);
      chosen.forEach(target => {
        if (!target || !target.active) return;
        this.tamperFxGraphics.beginPath();
        this.tamperFxGraphics.moveTo(startX, startY);
        const midX = (startX + target.x) / 2 + Phaser.Math.Between(-16, 16);
        const midY = (startY + target.y) / 2 + Phaser.Math.Between(-16, 16);
        this.tamperFxGraphics.lineTo(midX, midY);
        this.tamperFxGraphics.lineTo(target.x, target.y);
        this.tamperFxGraphics.strokePath();
        this.tamperFxGraphics.fillStyle(0xe0f2fe, 0.9);
        this.tamperFxGraphics.fillCircle(target.x, target.y, 6);
      });

      this.time.delayedCall(120, () => {
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
      st.hp = 0;
      this.endGame();
    }
  }

  damageEnemy(enemy, dmg) {
    if (!enemy.active) return;
    const eData = enemy.getData('enemy');
    if (!eData) return;
    eData.hp -= dmg;

    if (eData.isBoss) {
      this.lastHitBossSprite = enemy;
    }

    enemy.setTintFill(0xffffff);
    this.time.delayedCall(70, () => { if (enemy.active) enemy.clearTint(); });

    AudioSys.hit();
    this.addFloatingText(enemy.x, enemy.y - 16, `${dmg}`, '#fef08a');

    if (eData.hp <= 0) {
      if (this.lastHitBossSprite === enemy) {
        this.lastHitBossSprite = null;
      }
      if (eData.hpBar) eData.hpBar.destroy();

      this.kills++;
      if (eData.isBoss) this.bossKills++;
      this.score += eData.xp * 20;
      AudioSys.kill();

      const r = Math.random();
      let gemKey = 'bolt';
      let val = eData.xp;

      if (r < 0.014) {
        gemKey = 'medkit';
        val = 0;
      } else if (r < 0.022) {
        gemKey = 'magnet_drop';
        val = 0;
      } else if (r < 0.025) {
        gemKey = 'bomb_drop';
        val = 0;
      } else if (eData.xp >= 15 || eData.isBoss) {
        gemKey = 'battery';
      }

      const gem = this.gems.create(enemy.x, enemy.y, gemKey).setDepth(Math.round(enemy.y + 1995));
      gem.setData('gem', { type: gemKey, value: val });
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
      st.hp = 0;
      this.endGame();
    }
  }

  onCollectGem(player, gem) {
    if (this.gameState !== 'PLAYING' || !gem.active) return;
    const st = player.getData('stats');
    const gData = gem.getData('gem');
    if (!st || !gData) return;

    gem.destroy();

    if (gData.type === 'bomb_drop') {
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
      st.xp += gData.value;
      this.score += gData.value * 10;
      if (st.xp >= st.xpToNext) {
        st.xp -= st.xpToNext;
        st.level++;
        st.xpToNext = Math.round(st.xpToNext * 1.32 + 8);
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
    const topFactor = isCompact ? 0.56 : 0.34;
    const bottomFactor = isCompact ? 0.36 : 0.44;
    const minTopSafePx = canvasRect.top + Math.max(48, canvasRect.height * (isCompact ? 0.13 : 0.14));
    const maxBottomSafePx = canvasRect.bottom - Math.max(8, canvasRect.height * 0.025);

    const graphicTopPx = canvasRect.top + (finalY - finalH * topFactor) * scaleY;
    const graphicBottomPx = canvasRect.top + (finalY + finalH * bottomFactor) * scaleY;

    const clampedTopPx = Math.max(minTopSafePx, graphicTopPx);
    const clampedBottomPx = Math.min(maxBottomSafePx, Math.max(clampedTopPx + 120, graphicBottomPx));
    const availableCenterYPx = (clampedTopPx + clampedBottomPx) / 2;
    const maxBoxHeightPx = Math.max(120, clampedBottomPx - clampedTopPx);

    const widthRatio = isCompact ? 0.86 : 0.78;
    const availableWidthPx = Math.min(540, Math.max(250, finalW * widthRatio * scaleX));

    panel.style.position = 'fixed';
    panel.style.left = `${Math.round(canvasRect.left + (this.scale.width / 2) * scaleX)}px`;
    panel.style.top = `${Math.round(availableCenterYPx)}px`;
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.marginTop = '0px';
    panel.style.width = `${Math.round(availableWidthPx)}px`;
    panel.style.maxWidth = '92vw';
    panel.style.maxHeight = `${Math.round(maxBoxHeightPx)}px`;
    panel.style.overflowY = 'auto';
  }

  createThermalPaperGraphic(centerX, targetY, width, height) {
    this.hideThermalPaperGraphic();

    const topMargin = this.scale.height < 420 ? 54 : 74;
    const maxAllowedH = Math.max(180, this.scale.height - topMargin);
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

    const finalY = this.scale.height - finalH / 2 - 4;
    const startY = this.scale.height + finalH / 2 + 12;

    this.syncThermalBoxToTicketGraphic(finalW, finalH, finalY);

    const container = this.add.container(centerX, startY).setScrollFactor(0).setDepth(5000);

    if (hasTicketTex) {
      const ticketSprite = this.add.image(0, 0, 'ticket_img');
      ticketSprite.setDisplaySize(finalW, finalH);
      ticketSprite.setAlpha(1);
      ticketSprite.setTint(0xf8fafc);
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
    this.updatePauseButtonVisibility();
    AudioSys.levelUp();
    AudioSys.ticketPrint();

    const st = this.player.getData('stats');
    const availableUpgrades = UPGRADES.filter(u => !u.requires || u.requires(st));
    const pool = Phaser.Utils.Array.Shuffle([...availableUpgrades]).slice(0, 3);
    const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.elapsedTime % 60)).padStart(2, '0');
    const ticketNum = String(st.level).padStart(3, '0');

    cardsContainer.innerHTML = `
      <div class="thermal-ticket" id="thermal-ticket-box">
        <div class="thermal-header">
          <div class="thermal-brand">*** CRA SUMINISTRO TÉRMICO ***</div>
          <div class="thermal-meta">TICKET #${ticketNum} · NV.${st.level} · TIEMPO ${mins}:${secs}</div>
        </div>
        <div class="thermal-items" id="thermal-items-list"></div>
        <div class="thermal-footer">
          <span>SELECCIONA 1 ÍTEM</span>
          <span>YERMO-01</span>
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
        st.upgradeCounts = st.upgradeCounts || {};
        st.upgradeCounts[upg.id] = (Number(st.upgradeCounts[upg.id]) || 0) + 1;
        upg.apply(st);
        this.syncDrones(st.dronesEnabled ? st.orbitals : 0);
        this.hideThermalPaperGraphic();
        levelupScreen.classList.add('hidden');
        this.physics.resume();
        this.gameState = 'PLAYING';
        this.updatePauseButtonVisibility();
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
      const drone = this.add.sprite(this.player.x, this.player.y, 'drone').setDepth(9300);
      this.drones.push(drone);
    }
  }

  endGame() {
    if (this.gameState === 'GAMEOVER') return;
    this.gameState = 'GAMEOVER';
    this.physics.pause();
    this.joystick.active = false;
    this.updatePauseButtonVisibility();

    const st = this.player.getData('stats');
    const timeBonus = Math.floor(this.elapsedTime / 60) * 2;
    const bossBonus = (this.bossKills || 0) * 5;
    const earnedChapas = Math.floor(this.kills * 0.22 + this.score / 2400) + timeBonus + bossBonus;
    const meta = loadMeta();
    meta.chapas += earnedChapas;
    saveMeta(meta);
    refreshMenuChapasUI();

    const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.elapsedTime % 60)).padStart(2, '0');
    document.getElementById('final-time').textContent = `${mins}:${secs}`;
    document.getElementById('final-level').textContent = String(st.level);
    document.getElementById('final-kills').textContent = String(this.kills);
    document.getElementById('final-score').textContent = String(this.score);
    const finalChapasEl = document.getElementById('final-chapas');
    if (finalChapasEl) finalChapasEl.textContent = `+${earnedChapas}`;
    gameoverScreen.classList.remove('hidden');
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.bgTile.tilePositionX = this.cameras.main.scrollX;
    this.bgTile.tilePositionY = this.cameras.main.scrollY;

    if (this.gameState !== 'PLAYING') {
      this.updateHUD();
      return;
    }

    this.elapsedTime += dt;
    const st = this.player.getData('stats');

    if (!this.wastelandBossSpawnedAt8Min && this.elapsedTime >= 480) {
      this.wastelandBossSpawnedAt8Min = true;
      this.spawnEnemy(true, true);
    }

    if (!this.hordeTriggered && this.elapsedTime >= 270) {
      this.triggerHordeEvent();
    }
    if (this.hordeActiveTimer > 0) {
      this.hordeActiveTimer = Math.max(0, this.hordeActiveTimer - dt);
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
    this.player.setDepth(this.player.y + 2000);

    if (Math.hypot(mx, my) > 0.05) {
      if (Math.abs(my) > Math.abs(mx)) {
        if (my > 0) {
          this.player.play('gsosito_down', true);
          this.lastDirection = 'down';
        } else {
          this.player.play('gsosito_up', true);
          this.lastDirection = 'up';
        }
        this.player.setFlipX(false);
      } else {
        this.player.play('gsosito_side', true);
        this.lastDirection = 'side';
        if (mx < 0) {
          this.player.setFlipX(true);
          this.isLookingLeft = true;
        } else {
          this.player.setFlipX(false);
          this.isLookingLeft = false;
        }
      }
    } else {
      this.player.stop();
      if (this.lastDirection === 'up') {
        this.player.setTexture('gsosito_idle_back');
        this.player.setFlipX(false);
      } else if (this.lastDirection === 'down') {
        this.player.setTexture('gsosito_idle_front');
        this.player.setFlipX(false);
      } else {
        this.player.setTexture('gsosito_idle_side');
        this.player.setFlipX(this.isLookingLeft);
      }
    }

    const globalDmg = st.globalDamageMult || 1;
    const globalRate = st.globalFirerateMult || 1;

    st.weapon.timer -= dt;
    if (st.weapon.timer <= 0 && this.enemies.getLength() > 0) {
      let nearest = null;
      let minDist = 340;
      this.enemies.getChildren().forEach(e => {
        if (!e.active) return;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
        if (d < minDist) { minDist = d; nearest = e; }
      });

      if (nearest) {
        st.weapon.timer = st.weapon.cooldown / globalRate;
        const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 8, nearest.x, nearest.y);
        this.player.setFlipX(Math.cos(baseAngle) < 0);

        const count = st.weapon.projectileCount;
        const spread = 0.15;
        const laserDmg = Math.max(1, Math.round(st.weapon.damage * globalDmg));

        for (let i = 0; i < count; i++) {
          const angle = baseAngle + (i - (count - 1) / 2) * spread;
          const proj = this.projectiles.create(this.player.x, this.player.y - 8, 'laser').setDepth(9200);
          proj.setRotation(angle);
          proj.setVelocity(Math.cos(angle) * st.weapon.projectileSpeed, Math.sin(angle) * st.weapon.projectileSpeed);
          proj.setData('proj', { damage: laserDmg, pierce: st.weapon.pierce, hitList: [] });
          this.time.delayedCall(1050, () => { if (proj.active) proj.destroy(); });
        }
        AudioSys.shoot();
      }
    }

    if (st.domoFish && st.domoFish.enabled) {
      st.domoFish.timer -= dt;
      if (st.domoFish.timer <= 0) {
        st.domoFish.timer = st.domoFish.baseCooldown / globalRate;
        this.fireDomoFish360(st);
      }
    }

    if (st.tamper && st.tamper.enabled) {
      st.tamper.timer -= dt;
      if (st.tamper.timer <= 0) {
        st.tamper.timer = (st.tamper.cooldown || 5.0) / globalRate;
        this.fireTamperAttack(st);
      }
    }

    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const eData = e.getData('enemy');
      if (!eData) return;

      if (eData.orbCd > 0) {
        eData.orbCd = Math.max(0, eData.orbCd - dt);
      }

      if (eData.isTolcrap) {
        eData.sawTimer = (eData.sawTimer ?? 1.5) - dt;
        const distToPlayer = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
        if (eData.sawTimer <= 0 && distToPlayer <= 480) {
          this.fireTolcrapSaw(e);
          eData.sawTimer = 2.1;
        }
      }

      if (eData.isBoss && !eData.isTolcrap) {
        eData.purpleOrbTimer = (eData.purpleOrbTimer ?? (eData.isWastelandBoss ? 1.6 : 2.8)) - dt;
        const distToPlayer = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
        if (eData.purpleOrbTimer <= 0 && distToPlayer <= 520) {
          this.fireWastelandBossPurpleOrbs(e);
          eData.purpleOrbTimer = eData.isWastelandBoss ? 1.85 : 2.9;
        }
      }

      const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
      const vx = Math.cos(angle) * eData.speed;
      const vy = Math.sin(angle) * eData.speed;
      e.setVelocity(vx, vy);

      const enemyDepth = getEnemyDepth(e, Boolean(eData.isBoss));
      e.setDepth(enemyDepth);

      if (eData.isTolcrap) {
        this.applyTolcrapDirectionSprite(e, vx, vy);
      } else {
        applyEnemyFacing(e, vx, Boolean(eData.facingLeftByDefault));
      }

      const hpBar = eData.hpBar;
      if (hpBar) {
        hpBar.setDepth(enemyDepth + 1);
        hpBar.clear();
        if (!eData.isBoss && eData.hp < eData.maxHp) {
          const barWidth = 24;
          const barHeight = 4;
          const bx = e.x - barWidth / 2;
          const by = e.y - (e.height * e.scaleY) / 2 - 8;

          hpBar.fillStyle(0x000000, 0.7);
          hpBar.fillRect(bx, by, barWidth, barHeight);

          const healthPercent = Math.max(0, eData.hp / eData.maxHp);
          const barColor = healthPercent > 0.3 ? 0x22c55e : 0xef4444;

          hpBar.fillStyle(barColor, 1);
          hpBar.fillRect(bx, by, barWidth * healthPercent, barHeight);
        }
      }
    });

    if (st.dronesEnabled && this.drones.length > 0) {
      const orbitSpeed = st.droneOrbitSpeed || 2.1;
      const orbitRadius = st.droneOrbitRadius || 68;
      const hitRadius = Math.max(22, Math.round(orbitRadius * 0.34));
      st.orbitalAngle += dt * orbitSpeed;
      const droneDmg = Math.max(1, Math.round(st.weapon.damage * 0.72 * globalDmg));
      this.drones.forEach((drone, i) => {
        const a = st.orbitalAngle + (i * Math.PI * 2) / this.drones.length;
        drone.setPosition(this.player.x + Math.cos(a) * orbitRadius, this.player.y + Math.sin(a) * orbitRadius);
        this.enemies.getChildren().forEach(e => {
          if (!e.active) return;
          const eData = e.getData('enemy');
          if (!eData) return;
          if (Phaser.Math.Distance.Between(drone.x, drone.y, e.x, e.y) < hitRadius && eData.orbCd <= 0) {
            this.damageEnemy(e, droneDmg);
            eData.orbCd = 0.32 / globalRate;
          }
        });
      });
    }

    this.bossSpawnTimer -= dt;
    if (this.bossSpawnTimer <= 0) {
      this.spawnEnemy(true, false);
      this.bossSpawnTimer += 180;
    }

    const isHorde = this.hordeActiveTimer > 0;
    const progress = Math.min(1, this.elapsedTime / 150);
    const baseSpawnRate = Math.max(0.4, 1.24 - progress * 0.84);
    const spawnRate = isHorde ? baseSpawnRate * 0.58 : baseSpawnRate;
    const maxActiveEnemies = Math.round(20 + progress * 46) + (isHorde ? 30 : 0);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      if (this.enemies.getLength() < maxActiveEnemies) {
        this.spawnEnemy(false);
        const extraChance = isHorde
          ? 0.78
          : (this.elapsedTime > 35 ? Math.min(0.48, (this.elapsedTime - 35) / 190) : 0);
        if (Math.random() < extraChance && this.enemies.getLength() < maxActiveEnemies) {
          this.spawnEnemy(false);
        }
      }
      this.spawnTimer = spawnRate;
    }

    let remainingGems = 0;
    this.gems.getChildren().forEach(g => {
      if (!g.active) return;
      remainingGems++;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, g.x, g.y);
      if (this.magnetPullActive) {
        this.physics.moveToObject(g, this.player, 390);
      } else if (d < st.pickupRange) {
        this.physics.moveToObject(g, this.player, 240);
      } else {
        g.setVelocity(0, 0);
      }
    });
    if (remainingGems === 0) {
      this.magnetPullActive = false;
    }

    this.updateHUD();
  }
}

function checkOrientation() {
  const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const isPortrait = vh > vw;
  rotateScreen.style.display = isPortrait ? 'flex' : 'none';
}
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', checkOrientation);
}
checkOrientation();

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 854,
  height: 480,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [SurvivorScene]
};

new Phaser.Game(config);