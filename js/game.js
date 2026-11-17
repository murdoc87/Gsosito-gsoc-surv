// @ts-nocheck
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'));
const ctx = canvas.getContext('2d', { alpha: false });

// ===== FONDO PERSONALIZADO =====
// Si existe el archivo img/block.png (280x280 px, que encaje al repetirse), se usa como fondo.
// Si no existe, el juego dibuja el fondo por código, como antes.
const blockImg = new Image();
blockImg.src = 'img/block.png';

const rotateScreen = document.getElementById('rotate-screen');
const startScreen = document.getElementById('start-screen');
const levelupScreen = document.getElementById('levelup-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const cardsContainer = document.getElementById('cards-container');

// --- AUDIO SINTETIZADO ---
const AudioSys = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
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
  hit() { this.playTone(185, 'sawtooth', 0.055, 0.045, 80); },
  kill() { this.playTone(290, 'square', 0.1, 0.055, 65); },
  pickup() { this.playTone(720, 'sine', 0.07, 0.05, 1240); },
  levelUp() {
    [440, 554.37, 659.25, 880].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.14, 0.07), i * 65);
    });
  },
  hurt() { this.playTone(130, 'sawtooth', 0.2, 0.08, 48); }
};

// --- MOTOR DE SPRITES HI-RES PIXEL ART (48x48 Y 36x36 CON ANTI-ALIASING DE PÍXEL Y SOMBRAS SUAVES) ---
function createHiResSprite(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  drawFn(g, w, h);
  return c;
}

// Helper para píxel con contorno limpio
function pxRect(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// 1. GSOSITO (44x52 Hi-Res Pixel Art inspirado en la hoja de sprites de referencia)
function buildGsositoSprite(frame) {
  return createHiResSprite(44, 52, (g) => {
    const bob = frame === 1 ? -1 : 0;

    // Piernas pantalón caqui + sombreado + botas marrones con suela
    const leftLegY = frame === 1 ? 37 : 39;
    const rightLegY = frame === 1 ? 40 : 38;
    // Pierna izq
    pxRect(g, 13, 36, 7, 7, '#0f1218');
    pxRect(g, 14, 36, 5, 6, '#c29b6e');
    pxRect(g, 14, 36, 2, 6, '#d9b68c');
    pxRect(g, 12, leftLegY + 3, 8, 5, '#0f1218');
    pxRect(g, 13, leftLegY + 4, 6, 3, '#6b3e21');
    pxRect(g, 13, leftLegY + 6, 6, 1, '#3b200e');

    // Pierna der
    pxRect(g, 24, 36, 7, 7, '#0f1218');
    pxRect(g, 25, 36, 5, 6, '#b08657');
    pxRect(g, 25, 36, 2, 6, '#c29b6e');
    pxRect(g, 24, rightLegY + 3, 8, 5, '#0f1218');
    pxRect(g, 25, rightLegY + 4, 6, 3, '#573118');
    pxRect(g, 25, rightLegY + 6, 6, 1, '#3b200e');

    // Torso polo blanco corporativo + cuello + sombras azuladas
    pxRect(g, 11, 25 + bob, 22, 13, '#0f1218');
    pxRect(g, 12, 26 + bob, 20, 11, '#e2e8f0');
    pxRect(g, 13, 26 + bob, 18, 8, '#f8fafc');
    // Pliegues camisa y cinturón
    pxRect(g, 12, 35 + bob, 20, 2, '#573118');
    pxRect(g, 21, 35 + bob, 3, 2, '#facc15');
    // Texto/Logo GSOSITO azul en el pecho
    pxRect(g, 23, 29 + bob, 7, 2, '#1d4ed8');
    pxRect(g, 23, 32 + bob, 5, 1, '#64748b');

    // Brazos peludos beige
    const armShift = frame === 1 ? 1 : -1;
    pxRect(g, 7, 26 + bob + armShift, 5, 9, '#0f1218');
    pxRect(g, 8, 27 + bob + armShift, 3, 7, '#e7d5b8');
    pxRect(g, 32, 26 + bob - armShift, 5, 9, '#0f1218');
    pxRect(g, 33, 27 + bob - armShift, 3, 7, '#d6be9c');

    // Cabeza casco peludo de oso (alta definición con textura de pelo)
    pxRect(g, 8, 4 + bob, 28, 23, '#0f1218');
    pxRect(g, 9, 5 + bob, 26, 21, '#cbb089');
    pxRect(g, 10, 5 + bob, 24, 19, '#e7d5b8');
    pxRect(g, 12, 6 + bob, 20, 4, '#f5ebd6'); // luz superior peluche

    // Visor oscuro y lente óptica de cámara con reflejos
    pxRect(g, 12, 9 + bob, 20, 15, '#090b10');
    pxRect(g, 13, 10 + bob, 18, 13, '#1e2430');
    // Aro exterior objetivo cámara
    pxRect(g, 16, 11 + bob, 12, 11, '#475569');
    pxRect(g, 17, 12 + bob, 10, 9, '#0f172a');
    // Lente roja brillante
    pxRect(g, 19, 14 + bob, 6, 5, '#dc2626');
    pxRect(g, 20, 15 + bob, 4, 3, '#ef4444');
    pxRect(g, 20, 15 + bob, 2, 1, '#fecaca'); // brillo cristal
    // LED piloto inferior
    pxRect(g, 21, 22 + bob, 2, 1, '#ef4444');

    // Auriculares tácticos y micrófono
    pxRect(g, 5, 10 + bob, 4, 11, '#0f1218');
    pxRect(g, 6, 11 + bob, 3, 9, '#64748b');
    pxRect(g, 7, 12 + bob, 1, 7, '#cbd5e1');

    pxRect(g, 35, 10 + bob, 4, 11, '#0f1218');
    pxRect(g, 35, 11 + bob, 3, 9, '#475569');
    // Brazo micrófono
    pxRect(g, 27, 22 + bob, 10, 2, '#0f1218');
    pxRect(g, 25, 21 + bob, 3, 3, '#334155');
  });
}

// 2. GATO CALLEJERO MUTANTE (32x28 Hi-Res Pixel Art)
function buildCatSprite(variant, frame) {
  const cMain = variant === 'orange' ? '#ea580c' : '#64748b';
  const cLight = variant === 'orange' ? '#fb923c' : '#94a3b8';
  const cDark = variant === 'orange' ? '#9a3412' : '#334155';
  const cEye = variant === 'orange' ? '#facc15' : '#4ade80';

  return createHiResSprite(32, 28, (g) => {
    const step = frame === 1 ? 1 : -1;
    // Cola erizada
    pxRect(g, 25, 10 - step, 3, 9, '#0f1218');
    pxRect(g, 26, 11 - step, 2, 7, cMain);
    pxRect(g, 27, 8 - step, 3, 4, '#0f1218');
    pxRect(g, 28, 9 - step, 1, 3, cLight);

    // Cuerpo agazapado
    pxRect(g, 8, 13, 18, 10, '#0f1218');
    pxRect(g, 9, 14, 16, 8, cMain);
    pxRect(g, 11, 14, 12, 3, cLight);
    pxRect(g, 12, 16, 2, 4, cDark);
    pxRect(g, 17, 16, 2, 4, cDark);

    // Patas
    pxRect(g, 9 + step, 22, 4, 5, '#0f1218');
    pxRect(g, 10 + step, 22, 2, 4, cLight);
    pxRect(g, 20 - step, 22, 4, 5, '#0f1218');
    pxRect(g, 21 - step, 22, 2, 4, cDark);

    // Cabeza con orejas puntiagudas y expresión fiera
    pxRect(g, 3, 5, 15, 13, '#0f1218');
    pxRect(g, 4, 2, 4, 4, '#0f1218');
    pxRect(g, 13, 2, 4, 4, '#0f1218');
    pxRect(g, 5, 3, 2, 3, '#fda4af');
    pxRect(g, 14, 3, 2, 3, '#fda4af');

    pxRect(g, 4, 6, 13, 11, cMain);
    pxRect(g, 5, 6, 11, 4, cLight);
    // Ojos rasgados brillantes
    pxRect(g, 5, 10, 4, 2, cEye);
    pxRect(g, 11, 10, 4, 2, cEye);
    pxRect(g, 6, 10, 1, 2, '#090b10');
    pxRect(g, 12, 10, 1, 2, '#090b10');
    // Hocico y colmillos
    pxRect(g, 8, 13, 3, 2, '#fda4af');
    pxRect(g, 7, 15, 1, 2, '#ffffff');
    pxRect(g, 11, 15, 1, 2, '#ffffff');
  });
}

// 3. LADRÓN ENCAPUCHADO (38x44 Hi-Res Pixel Art)
function buildThiefSprite(frame) {
  return createHiResSprite(38, 44, (g) => {
    const step = frame === 1 ? 1 : -1;
    // Piernas
    pxRect(g, 12, 31, 6, 11, '#0f1218');
    pxRect(g, 13, 31, 4, 9 + step, '#334155');
    pxRect(g, 20, 31, 6, 11, '#0f1218');
    pxRect(g, 21, 31, 4, 9 - step, '#1e293b');

    // Sudadera oscura con capucha y bandolera
    pxRect(g, 9, 18, 20, 14, '#0f1218');
    pxRect(g, 10, 19, 18, 12, '#1e293b');
    pxRect(g, 12, 19, 14, 5, '#334155');
    // Bandolera gris
    pxRect(g, 11, 20, 16, 2, '#94a3b8');

    // Capucha y máscara
    pxRect(g, 10, 4, 18, 15, '#0f1218');
    pxRect(g, 11, 5, 16, 13, '#334155');
    pxRect(g, 13, 8, 12, 8, '#fdba74'); // rostro
    // Antifaz negro y ojos rojos
    pxRect(g, 13, 9, 12, 4, '#0f172a');
    pxRect(g, 15, 10, 2, 2, '#ef4444');
    pxRect(g, 21, 10, 2, 2, '#ef4444');
    // Pañuelo boca
    pxRect(g, 13, 13, 12, 4, '#475569');

    // Brazo con palanca metálica
    pxRect(g, 29, 20, 4, 9, '#0f1218');
    pxRect(g, 30, 21, 2, 7, '#fdba74');
    pxRect(g, 31, 12, 3, 14, '#94a3b8');
    pxRect(g, 32, 12, 1, 13, '#f8fafc');
    pxRect(g, 31, 10, 5, 3, '#ef4444');
  });
}

// 4. TRABAJADOR DE LOGÍSTICA (38x44 Hi-Res Pixel Art)
function buildLogisticsSprite(frame) {
  return createHiResSprite(38, 44, (g) => {
    const step = frame === 1 ? 1 : -1;
    // Pantalón azul trabajo y botas
    pxRect(g, 12, 31, 6, 11, '#0f1218');
    pxRect(g, 13, 31, 4, 9 + step, '#1e3a8a');
    pxRect(g, 20, 31, 6, 11, '#0f1218');
    pxRect(g, 21, 31, 4, 9 - step, '#172554');

    // Torso con chaleco reflectante amarillo neón
    pxRect(g, 9, 18, 20, 14, '#0f1218');
    pxRect(g, 10, 19, 18, 12, '#eab308');
    pxRect(g, 11, 19, 16, 4, '#facc15');
    // Bandas reflectantes plateadas
    pxRect(g, 10, 23, 18, 2, '#e2e8f0');
    pxRect(g, 10, 27, 18, 2, '#e2e8f0');
    pxRect(g, 18, 19, 2, 12, '#1e3a8a');

    // Casco de obra amarillo y rostro
    pxRect(g, 11, 8, 16, 10, '#0f1218');
    pxRect(g, 12, 9, 14, 8, '#fdba74');
    pxRect(g, 14, 11, 2, 2, '#0f172a');
    pxRect(g, 21, 11, 2, 2, '#0f172a');
    // Casco
    pxRect(g, 9, 3, 20, 7, '#0f1218');
    pxRect(g, 10, 4, 18, 5, '#facc15');
    pxRect(g, 12, 4, 14, 2, '#fef08a');

    // Caja de paquetería en manos
    pxRect(g, 24, 20, 11, 10, '#0f1218');
    pxRect(g, 25, 21, 9, 8, '#b45309');
    pxRect(g, 25, 21, 9, 2, '#d97706');
    pxRect(g, 28, 21, 3, 8, '#fef08a');
  });
}

// 5. CAPATAZ LOGÍSTICA PESADO (44x48 Hi-Res Pixel Art)
function buildForemanSprite(frame) {
  return createHiResSprite(44, 48, (g) => {
    const step = frame === 1 ? 1 : -1;
    pxRect(g, 13, 34, 7, 12, '#0f1218');
    pxRect(g, 14, 34, 5, 10 + step, '#1e3a8a');
    pxRect(g, 24, 34, 7, 12, '#0f1218');
    pxRect(g, 25, 34, 5, 10 - step, '#172554');

    // Cuerpo robusto chaleco naranja industrial
    pxRect(g, 8, 18, 28, 17, '#0f1218');
    pxRect(g, 9, 19, 26, 15, '#ea580c');
    pxRect(g, 10, 24, 24, 2, '#f8fafc');
    pxRect(g, 10, 29, 24, 2, '#f8fafc');

    // Cabeza con casco naranja y gafas protectoras
    pxRect(g, 13, 8, 18, 10, '#0f1218');
    pxRect(g, 14, 9, 16, 8, '#fdba74');
    pxRect(g, 14, 10, 16, 3, '#38bdf8');
    pxRect(g, 11, 2, 22, 7, '#0f1218');
    pxRect(g, 12, 3, 20, 5, '#f97316');

    // Palé / Contenedor metálico pesado
    pxRect(g, 28, 17, 14, 15, '#0f1218');
    pxRect(g, 29, 18, 12, 13, '#475569');
    pxRect(g, 30, 19, 10, 3, '#94a3b8');
    pxRect(g, 31, 24, 8, 3, '#facc15');
  });
}

// 6. JEFE SOMBRA DE LA PORTADA (56x60 Hi-Res Pixel Art)
function buildBossSprite() {
  return createHiResSprite(56, 60, (g) => {
    // Silueta sombría texturizada
    pxRect(g, 12, 4, 32, 30, '#09090b');
    pxRect(g, 10, 8, 36, 24, '#18181b');
    pxRect(g, 6, 28, 44, 24, '#09090b');
    pxRect(g, 8, 30, 40, 20, '#18181b');
    pxRect(g, 14, 50, 10, 9, '#09090b');
    pxRect(g, 32, 50, 10, 9, '#09090b');

    // Gafas rectangulares brillantes icónicas
    pxRect(g, 14, 14, 12, 9, '#38bdf8');
    pxRect(g, 30, 14, 12, 9, '#38bdf8');
    pxRect(g, 26, 17, 4, 2, '#94a3b8');
    pxRect(g, 16, 16, 8, 5, '#ffffff');
    pxRect(g, 32, 16, 8, 5, '#ffffff');

    // Aura violeta
    pxRect(g, 11, 6, 2, 6, '#a855f7');
    pxRect(g, 43, 10, 2, 8, '#a855f7');
    pxRect(g, 7, 34, 2, 10, '#7e22ce');
  });
}

// 7. DRON DE GUARDIA (24x20 inspirado en la hoja de sprites de referencia)
function buildDroneSprite() {
  return createHiResSprite(24, 20, (g) => {
    pxRect(g, 10, 1, 4, 3, '#64748b');
    pxRect(g, 4, 4, 16, 11, '#0f1218');
    pxRect(g, 5, 5, 14, 9, '#94a3b8');
    pxRect(g, 6, 5, 12, 3, '#e2e8f0');
    pxRect(g, 7, 8, 10, 5, '#0f172a');
    pxRect(g, 8, 9, 2, 2, '#38bdf8');
    pxRect(g, 14, 9, 2, 2, '#38bdf8');
    pxRect(g, 11, 11, 2, 1, '#ef4444');
    // Pinzas inferiores
    pxRect(g, 3, 13, 3, 5, '#ef4444');
    pxRect(g, 18, 13, 3, 5, '#ef4444');
  });
}

// 8. OBJETOS DEL YERMO (18x18)
function buildLootSprites() {
  const bolt = createHiResSprite(16, 16, (g) => {
    pxRect(g, 5, 1, 6, 14, '#0f1218');
    pxRect(g, 3, 3, 10, 10, '#0f1218');
    pxRect(g, 4, 4, 8, 8, '#eab308');
    pxRect(g, 5, 5, 6, 6, '#fef08a');
    pxRect(g, 6, 6, 3, 3, '#ffffff');
  });
  const medkit = createHiResSprite(18, 16, (g) => {
    pxRect(g, 6, 1, 6, 3, '#0f1218');
    pxRect(g, 2, 3, 14, 11, '#0f1218');
    pxRect(g, 3, 4, 12, 9, '#dc2626');
    pxRect(g, 8, 6, 2, 5, '#ffffff');
    pxRect(g, 6, 8, 6, 1, '#ffffff');
  });
  const battery = createHiResSprite(16, 18, (g) => {
    pxRect(g, 5, 1, 6, 3, '#0f1218');
    pxRect(g, 3, 3, 10, 13, '#0f1218');
    pxRect(g, 4, 4, 8, 11, '#16a34a');
    pxRect(g, 5, 5, 6, 3, '#86efac');
    pxRect(g, 5, 10, 6, 3, '#86efac');
  });
  return { bolt, medkit, battery };
}

const LOOT = buildLootSprites();
const SPRITES = {
  gsosito: [buildGsositoSprite(0), buildGsositoSprite(1)],
  catOrange: [buildCatSprite('orange', 0), buildCatSprite('orange', 1)],
  catGray: [buildCatSprite('gray', 0), buildCatSprite('gray', 1)],
  thief: [buildThiefSprite(0), buildThiefSprite(1)],
  logistics: [buildLogisticsSprite(0), buildLogisticsSprite(1)],
  foreman: [buildForemanSprite(0), buildForemanSprite(1)],
  boss: [buildBossSprite(), buildBossSprite()],
  drone: buildDroneSprite(),
  bolt: LOOT.bolt,
  medkit: LOOT.medkit,
  battery: LOOT.battery
};

// --- DETECCIÓN DE ORIENTACIÓN Y RESOLUCIÓN HI-RES ---
let vWidth = 680;
let vHeight = 382;
let isPortraitBlocked = false;

function getViewportSize() {
  if (window.visualViewport) {
    return { w: window.visualViewport.width, h: window.visualViewport.height };
  }
  return {
    w: window.innerWidth || document.documentElement.clientWidth,
    h: window.innerHeight || document.documentElement.clientHeight
  };
}

function checkOrientationAndResize() {
  const { w, h } = getViewportSize();
  if (!w || !h) return;

  isPortraitBlocked = h > w;

  if (isPortraitBlocked) {
    rotateScreen.style.display = 'flex';
    return;
  } else {
    rotateScreen.style.display = 'none';
  }

  // Resolución interna HD (382p) para Hi-Res Pixel Art detallado sin aspecto retro de pocos píxeles
  const targetH = 382;
  const aspect = Math.max(1.3, Math.min(2.35, w / h));
  vHeight = targetH;
  vWidth = Math.round(targetH * aspect);

  canvas.width = vWidth;
  canvas.height = vHeight;
  ctx.imageSmoothingEnabled = false;

  if (gameState !== 'PLAYING') {
    drawWorld(0, 0);
  }
}

function scheduleOrientationChecks() {
  checkOrientationAndResize();
  setTimeout(checkOrientationAndResize, 60);
  setTimeout(checkOrientationAndResize, 220);
  setTimeout(checkOrientationAndResize, 480);
}

window.addEventListener('resize', scheduleOrientationChecks);
window.addEventListener('orientationchange', scheduleOrientationChecks);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleOrientationChecks);
}
// La primera comprobación se hace al final del archivo, cuando todas las variables ya existen.

// --- ESTADO DEL JUEGO ---
let gameState = 'MENU';
let lastTime = 0;
let elapsedTime = 0;
let score = 0;
let kills = 0;
let screenShake = 0;
let bossSpawnTimer = 60;

const player = {
  x: 0,
  y: 0,
  radius: 13,
  speed: 118,
  hp: 100,
  maxHp: 100,
  xp: 0,
  xpToNext: 22,
  level: 1,
  pickupRange: 62,
  facing: 1,
  animTimer: 0,
  animFrame: 0,
  invulnTimer: 0,
  weapon: {
    damage: 18,
    cooldown: 0.42,
    timer: 0,
    projectileSpeed: 340,
    projectileCount: 1,
    pierce: 1
  },
  orbitals: 0,
  orbitalAngle: 0
};

let enemies = [];
let projectiles = [];
let gems = [];
let floatingTexts = [];
let particles = [];
let spawnTimer = 0;
let props = [];
let ashParticles = [];

function generateWastelandProps() {
  props = [];
  const types = ['car', 'barrier', 'barrel', 'crater', 'puddle', 'crate'];
  for (let i = 0; i < 165; i++) {
    const px = (Math.random() - 0.5) * 3800;
    const py = (Math.random() - 0.5) * 3800;
    if (Math.hypot(px, py) < 130) continue;
    const type = types[Math.floor(Math.random() * types.length)];
    let solid = false;
    let r = 0;
    if (type === 'car') { solid = true; r = 21; }
    else if (type === 'barrier') { solid = true; r = 13; }
    else if (type === 'barrel') { solid = true; r = 9; }
    else if (type === 'crate') { solid = true; r = 11; }
    props.push({
      x: px,
      y: py,
      type,
      solid,
      r,
      variant: Math.floor(Math.random() * 3)
    });
  }

  ashParticles = [];
  for (let i = 0; i < 45; i++) {
    ashParticles.push({
      x: Math.random() * 900,
      y: Math.random() * 500,
      vx: -12 - Math.random() * 16,
      vy: 7 + Math.random() * 12,
      size: Math.random() > 0.65 ? 2 : 1
    });
  }
}
generateWastelandProps();

// --- CONTROLES ---
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

const joystick = {
  active: false,
  id: null,
  startX: 0,
  startY: 0,
  currX: 0,
  currY: 0,
  dx: 0,
  dy: 0,
  maxRadius: 42
};

function screenToVirtual(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * vWidth,
    y: ((clientY - rect.top) / rect.height) * vHeight
  };
}

canvas.addEventListener('pointerdown', e => {
  if (gameState !== 'PLAYING' || isPortraitBlocked) return;
  AudioSys.init();
  if (!joystick.active) {
    const pos = screenToVirtual(e.clientX, e.clientY);
    joystick.active = true;
    joystick.id = e.pointerId;
    joystick.startX = pos.x;
    joystick.startY = pos.y;
    joystick.currX = pos.x;
    joystick.currY = pos.y;
    joystick.dx = 0;
    joystick.dy = 0;
  }
});

canvas.addEventListener('pointermove', e => {
  if (!joystick.active || e.pointerId !== joystick.id) return;
  const pos = screenToVirtual(e.clientX, e.clientY);
  joystick.currX = pos.x;
  joystick.currY = pos.y;
  const diffX = joystick.currX - joystick.startX;
  const diffY = joystick.currY - joystick.startY;
  const dist = Math.hypot(diffX, diffY);
  if (dist > 0) {
    const clamped = Math.min(dist, joystick.maxRadius);
    joystick.dx = (diffX / dist) * (clamped / joystick.maxRadius);
    joystick.dy = (diffY / dist) * (clamped / joystick.maxRadius);
  } else {
    joystick.dx = 0;
    joystick.dy = 0;
  }
});

function endJoystick(e) {
  if (joystick.active && e.pointerId === joystick.id) {
    joystick.active = false;
    joystick.id = null;
    joystick.dx = 0;
    joystick.dy = 0;
  }
}
canvas.addEventListener('pointerup', endJoystick);
canvas.addEventListener('pointercancel', endJoystick);

// --- CARTAS DE MEJORA ---
const UPGRADES = [
  {
    id: 'firerate',
    icon: '🔴',
    title: 'Overclock Óptico',
    desc: '+22% cadencia de disparo láser',
    apply: () => { player.weapon.cooldown *= 0.78; }
  },
  {
    id: 'damage',
    icon: '⚡',
    title: 'Diodo de Alta Potencia',
    desc: '+30% daño del haz láser',
    apply: () => { player.weapon.damage = Math.round(player.weapon.damage * 1.3); }
  },
  {
    id: 'multishot',
    icon: '💠',
    title: 'Prisma Multi-Haz',
    desc: '+1 disparo láser simultáneo',
    apply: () => { player.weapon.projectileCount += 1; }
  },
  {
    id: 'pierce',
    icon: '🔦',
    title: 'Haz Perforante',
    desc: 'Cada láser atraviesa +1 enemigo',
    apply: () => { player.weapon.pierce += 1; }
  },
  {
    id: 'speed',
    icon: '🥾',
    title: 'Botas Tácticas',
    desc: '+16% velocidad de desplazamiento',
    apply: () => { player.speed *= 1.16; }
  },
  {
    id: 'maxhp',
    icon: '🧰',
    title: 'Blindaje Reforzado',
    desc: '+30 salud máxima y curación',
    apply: () => {
      player.maxHp += 30;
      player.hp = Math.min(player.maxHp, player.hp + 45);
    }
  },
  {
    id: 'magnet',
    icon: '🧲',
    title: 'Imán de Suministros',
    desc: '+45% radio de recolección',
    apply: () => { player.pickupRange *= 1.45; }
  },
  {
    id: 'orbital',
    icon: '🤖',
    title: 'Dron de Vigilancia',
    desc: '+1 dron orbital protector',
    apply: () => { player.orbitals += 1; }
  }
];

function triggerLevelUp() {
  gameState = 'LEVELUP';
  joystick.active = false;
  joystick.dx = 0;
  joystick.dy = 0;
  AudioSys.levelUp();

  const pool = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
  cardsContainer.innerHTML = '';

  pool.forEach(upg => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${upg.icon}</div>
        <div class="card-title">${upg.title}</div>
      </div>
      <div class="card-desc">${upg.desc}</div>
    `;
    card.onclick = () => {
      upg.apply();
      levelupScreen.classList.add('hidden');
      gameState = 'PLAYING';
      lastTime = performance.now();
    };
    cardsContainer.appendChild(card);
  });

  levelupScreen.classList.remove('hidden');
}

// --- INICIO, REINICIO Y VOLVER AL MENÚ ---
function startGame() {
  AudioSys.init();

  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }

  player.x = 0;
  player.y = 0;
  player.hp = 100;
  player.maxHp = 100;
  player.xp = 0;
  player.xpToNext = 22;
  player.level = 1;
  player.speed = 118;
  player.pickupRange = 62;
  player.invulnTimer = 0;
  player.weapon = {
    damage: 18,
    cooldown: 0.42,
    timer: 0,
    projectileSpeed: 340,
    projectileCount: 1,
    pierce: 1
  };
  player.orbitals = 0;
  player.orbitalAngle = 0;

  enemies = [];
  projectiles = [];
  gems = [];
  floatingTexts = [];
  particles = [];
  elapsedTime = 0;
  score = 0;
  kills = 0;
  spawnTimer = 0;
  bossSpawnTimer = 60;

  generateWastelandProps();

  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  levelupScreen.classList.add('hidden');

  gameState = 'PLAYING';
  lastTime = performance.now();
}

function returnToMenu() {
  joystick.active = false;
  joystick.dx = 0;
  joystick.dy = 0;
  enemies = [];
  projectiles = [];
  gems = [];
  floatingTexts = [];
  particles = [];
  player.x = 0;
  player.y = 0;

  gameoverScreen.classList.add('hidden');
  levelupScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  gameState = 'MENU';
  drawWorld(0, 0);
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('menu-btn').addEventListener('click', returnToMenu);

// --- SPAWNER ---
function spawnEnemy(forceBoss = false) {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.hypot(vWidth / 2, vHeight / 2) + 45;
  const ex = player.x + Math.cos(angle) * dist;
  const ey = player.y + Math.sin(angle) * dist;

  const diff = 1 + elapsedTime / 55;

  if (forceBoss) {
    enemies.push({
      x: ex,
      y: ey,
      radius: 20,
      speed: 44,
      hp: Math.round(560 * diff),
      maxHp: Math.round(560 * diff),
      damage: 28,
      xp: 65,
      spriteKey: 'boss',
      flash: 0,
      animOffset: 0,
      facing: 1,
      isBoss: true
    });
    addFloatingText(player.x, player.y - 38, '¡JEFE DEL YERMO!', '#c084fc');
    return;
  }

  const roll = Math.random();
  let type = {
    radius: 11,
    speed: 55 + Math.random() * 14,
    hp: 28 * diff,
    damage: 10,
    xp: 6,
    spriteKey: 'thief',
    isBoss: false
  };

  if (roll < 0.36) {
    type = {
      radius: 9,
      speed: 88 + Math.random() * 16,
      hp: 16 * diff,
      damage: 7,
      xp: 4,
      spriteKey: Math.random() > 0.45 ? 'catOrange' : 'catGray',
      isBoss: false
    };
  } else if (roll < 0.68) {
    type = {
      radius: 11,
      speed: 62 + Math.random() * 12,
      hp: 30 * diff,
      damage: 11,
      xp: 6,
      spriteKey: 'thief',
      isBoss: false
    };
  } else if (roll < 0.90) {
    type = {
      radius: 12,
      speed: 48 + Math.random() * 10,
      hp: 48 * diff,
      damage: 14,
      xp: 9,
      spriteKey: 'logistics',
      isBoss: false
    };
  } else {
    type = {
      radius: 15,
      speed: 35 + Math.random() * 8,
      hp: 100 * diff,
      damage: 20,
      xp: 18,
      spriteKey: 'foreman',
      isBoss: false
    };
  }

  enemies.push({
    x: ex,
    y: ey,
    ...type,
    maxHp: type.hp,
    flash: 0,
    animOffset: Math.random() * 10,
    facing: 1
  });
}

function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 0.72 });
}

function spawnParticles(x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 30 + Math.random() * 75;
    particles.push({
      x, y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 0.28 + Math.random() * 0.2,
      color,
      size: Math.random() > 0.5 ? 2 : 3
    });
  }
}

function resolvePropCollisions(entity) {
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    if (!p.solid) continue;
    const dx = entity.x - p.x;
    const dy = entity.y - p.y;
    const minDist = entity.radius + p.r;
    const distSq = dx * dx + dy * dy;
    if (distSq < minDist * minDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const push = minDist - dist;
      entity.x += (dx / dist) * push;
      entity.y += (dy / dist) * push;
    }
  }
}

// --- ACTUALIZACIÓN ---
function update(dt) {
  if (gameState !== 'PLAYING' || isPortraitBlocked) return;

  elapsedTime += dt;
  bossSpawnTimer -= dt;
  if (bossSpawnTimer <= 0) {
    spawnEnemy(true);
    bossSpawnTimer = 65;
  }

  if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 30);
  if (player.invulnTimer > 0) player.invulnTimer -= dt;

  // Movimiento
  let moveX = 0;
  let moveY = 0;
  if (keys['w'] || keys['arrowup']) moveY -= 1;
  if (keys['s'] || keys['arrowdown']) moveY += 1;
  if (keys['a'] || keys['arrowleft']) moveX -= 1;
  if (keys['d'] || keys['arrowright']) moveX += 1;

  if (joystick.active) {
    moveX = joystick.dx;
    moveY = joystick.dy;
  } else if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY);
    moveX /= len;
    moveY /= len;
  }

  if (Math.abs(moveX) > 0.05) {
    player.facing = moveX < 0 ? -1 : 1;
  }

  player.x += moveX * player.speed * dt;
  player.y += moveY * player.speed * dt;
  resolvePropCollisions(player);

  if (Math.hypot(moveX, moveY) > 0.05) {
    player.animTimer += dt * 9;
    player.animFrame = Math.floor(player.animTimer) % 2;
  } else {
    player.animFrame = 0;
  }

  for (const a of ashParticles) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    if (a.x < 0) a.x += vWidth;
    if (a.y > vHeight) a.y -= vHeight;
  }

  // Disparo Láser Automático desde la cámara
  player.weapon.timer -= dt;
  if (player.weapon.timer <= 0 && enemies.length > 0) {
    let nearest = null;
    let minDist = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }
    if (nearest && minDist < 340) {
      player.weapon.timer = player.weapon.cooldown;
      const baseAngle = Math.atan2(nearest.y - (player.y - 8), nearest.x - player.x);
      player.facing = Math.cos(baseAngle) < 0 ? -1 : 1;
      const count = player.weapon.projectileCount;
      const spread = 0.15;
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * spread;
        const angle = baseAngle + offset;
        projectiles.push({
          x: player.x + player.facing * 6,
          y: player.y - 8,
          vx: Math.cos(angle) * player.weapon.projectileSpeed,
          vy: Math.sin(angle) * player.weapon.projectileSpeed,
          angle: angle,
          damage: player.weapon.damage,
          pierce: player.weapon.pierce,
          hitList: [],
          life: 1.05
        });
      }
      AudioSys.shoot();
    }
  }

  // Drones orbitales
  if (player.orbitals > 0) {
    player.orbitalAngle += dt * 3.8;
    const orbitR = 40;
    for (let i = 0; i < player.orbitals; i++) {
      const a = player.orbitalAngle + (i * Math.PI * 2) / player.orbitals;
      const ox = player.x + Math.cos(a) * orbitR;
      const oy = player.y + Math.sin(a) * orbitR;
      for (const e of enemies) {
        if (Math.hypot(e.x - ox, e.y - oy) < e.radius + 9) {
          if (!e.orbHitCooldown || e.orbHitCooldown <= 0) {
            damageEnemy(e, Math.round(player.weapon.damage * 0.72));
            e.orbHitCooldown = 0.32;
          }
        }
      }
    }
  }

  // Proyectiles láser
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      projectiles.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (p.hitList.includes(e)) continue;
      if (Math.hypot(p.x - e.x, p.y - e.y) < e.radius + 6) {
        p.hitList.push(e);
        damageEnemy(e, p.damage);
        p.pierce--;
        if (p.pierce <= 0) {
          projectiles.splice(i, 1);
          break;
        }
      }
    }
  }

  // Oleadas
  const spawnRate = Math.max(0.24, 1.15 - elapsedTime / 80);
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEnemy(false);
    if (elapsedTime > 30 && Math.random() < 0.4) spawnEnemy(false);
    if (elapsedTime > 75 && Math.random() < 0.45) spawnEnemy(false);
    spawnTimer = spawnRate;
  }

  // Enemigos
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.flash > 0) e.flash -= dt;
    if (e.orbHitCooldown > 0) e.orbHitCooldown -= dt;

    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    e.facing = Math.cos(angle) < 0 ? -1 : 1;
    e.x += Math.cos(angle) * e.speed * dt;
    e.y += Math.sin(angle) * e.speed * dt;

    for (let j = i - 1; j >= 0; j--) {
      const other = enemies[j];
      const dx = e.x - other.x;
      const dy = e.y - other.y;
      const d = Math.hypot(dx, dy);
      const minD = e.radius + other.radius;
      if (d > 0 && d < minD) {
        const push = (minD - d) * 0.45;
        e.x += (dx / d) * push;
        e.y += (dy / d) * push;
      }
    }

    if (!e.isBoss) resolvePropCollisions(e);

    if (Math.hypot(player.x - e.x, player.y - e.y) < player.radius + e.radius - 2) {
      if (player.invulnTimer <= 0) {
        player.hp -= e.damage;
        player.invulnTimer = 0.5;
        screenShake = 6;
        AudioSys.hurt();
        addFloatingText(player.x, player.y - 22, `-${e.damage}`, '#ef4444');
        if (player.hp <= 0) {
          player.hp = 0;
          endGame();
          return;
        }
      }
    }
  }

  // Botín
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const d = Math.hypot(player.x - g.x, player.y - g.y);
    if (d < player.pickupRange) {
      const a = Math.atan2(player.y - g.y, player.x - g.x);
      g.x += Math.cos(a) * 230 * dt;
      g.y += Math.sin(a) * 230 * dt;
    }
    if (d < player.radius + 9) {
      AudioSys.pickup();
      if (g.type === 'medkit') {
        player.hp = Math.min(player.maxHp, player.hp + 25);
        addFloatingText(player.x, player.y - 18, '+25 PS', '#4ade80');
      } else {
        player.xp += g.value;
        score += g.value * 10;
        if (player.xp >= player.xpToNext) {
          player.xp -= player.xpToNext;
          player.level++;
          player.xpToNext = Math.round(player.xpToNext * 1.32 + 8);
          gems.splice(i, 1);
          triggerLevelUp();
          return;
        }
      }
      gems.splice(i, 1);
    }
  }

  // Partículas y textos flotantes
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y -= 28 * dt;
    ft.life -= dt;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

function damageEnemy(e, dmg) {
  e.hp -= dmg;
  e.flash = 0.08;
  AudioSys.hit();
  addFloatingText(e.x, e.y - e.radius - 6, `${dmg}`, '#fef08a');
  spawnParticles(e.x, e.y, '#ef4444', 4);

  if (e.hp <= 0) {
    const idx = enemies.indexOf(e);
    if (idx !== -1) {
      enemies.splice(idx, 1);
      kills++;
      score += e.xp * 20;
      AudioSys.kill();
      spawnParticles(e.x, e.y, e.isBoss ? '#c084fc' : '#f97316', e.isBoss ? 20 : 9);

      const r = Math.random();
      if (r < 0.07) {
        gems.push({ x: e.x, y: e.y, type: 'medkit', value: 0 });
      } else if (e.xp >= 15 || e.isBoss) {
        gems.push({ x: e.x, y: e.y, type: 'battery', value: e.xp });
      } else {
        gems.push({ x: e.x, y: e.y, type: 'bolt', value: e.xp });
      }
    }
  }
}

function endGame() {
  gameState = 'GAMEOVER';
  joystick.active = false;
  const mins = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
  const secs = String(Math.floor(elapsedTime % 60)).padStart(2, '0');
  document.getElementById('final-time').textContent = `${mins}:${secs}`;
  document.getElementById('final-level').textContent = String(player.level);
  document.getElementById('final-kills').textContent = String(kills);
  document.getElementById('final-score').textContent = String(score);
  gameoverScreen.classList.remove('hidden');
}

// --- RENDERIZADO HI-RES PIXEL ART ---
function drawProp(p) {
  const x = Math.round(p.x);
  const y = Math.round(p.y);

  if (p.type === 'crater') {
    ctx.fillStyle = '#181b22';
    ctx.fillRect(x - 14, y - 7, 28, 14);
    ctx.fillStyle = '#101218';
    ctx.fillRect(x - 10, y - 4, 20, 8);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 13, y + 6, 26, 2);
  } else if (p.type === 'puddle') {
    ctx.fillStyle = '#14532d';
    ctx.fillRect(x - 15, y - 5, 30, 10);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x - 10, y - 3, 20, 6);
    ctx.fillStyle = '#bbf7d0';
    ctx.fillRect(x - 5, y - 1, 8, 2);
  } else if (p.type === 'barrel') {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(x - 8, y + 6, 17, 5);
    ctx.fillStyle = '#0c0d10';
    ctx.fillRect(x - 8, y - 12, 16, 20);
    ctx.fillStyle = p.variant === 0 ? '#15803d' : '#b91c1c';
    ctx.fillRect(x - 7, y - 11, 14, 18);
    ctx.fillStyle = p.variant === 0 ? '#22c55e' : '#ef4444';
    ctx.fillRect(x - 6, y - 11, 4, 18);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x - 7, y - 5, 14, 5);
  } else if (p.type === 'crate') {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(x - 11, y + 7, 23, 5);
    ctx.fillStyle = '#0c0d10';
    ctx.fillRect(x - 11, y - 11, 22, 20);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(x - 10, y - 10, 20, 18);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(x - 10, y - 10, 20, 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x - 3, y - 10, 6, 18);
  } else if (p.type === 'barrier') {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(x - 16, y + 5, 33, 6);
    ctx.fillStyle = '#0c0d10';
    ctx.fillRect(x - 16, y - 9, 32, 16);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - 15, y - 8, 30, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - 15, y - 8, 30, 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x - 10, y - 2, 5, 6);
    ctx.fillRect(x + 4, y - 2, 5, 6);
  } else if (p.type === 'car') {
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(x - 26, y + 8, 53, 8);
    ctx.fillStyle = '#0c0d10';
    ctx.fillRect(x - 26, y - 13, 52, 23);
    ctx.fillStyle = p.variant === 0 ? '#9a3412' : (p.variant === 1 ? '#334155' : '#1e3a8a');
    ctx.fillRect(x - 25, y - 6, 50, 14);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 16, y - 12, 28, 7);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 13, y - 10, 10, 4);
    ctx.fillRect(x + 1, y - 10, 9, 4);
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(x - 21, y - 3, 9, 5);
    ctx.fillRect(x + 10, y, 10, 5);
    ctx.fillStyle = '#090a0d';
    ctx.fillRect(x - 20, y + 5, 9, 6);
    ctx.fillRect(x + 11, y + 5, 9, 6);
  }
}

function drawBlockProcedural(c, gx, gy) {
  const blockW = 280;
  const blockH = 280;
  // Acera losetas urbanas detalladas
  c.fillStyle = '#2b303b';
  c.fillRect(gx, gy, blockW, blockH);

  // Calzada de asfalto
  c.fillStyle = '#1b1e26';
  c.fillRect(gx, gy, blockW, 54);
  c.fillRect(gx, gy, 54, blockH);

  // Bordillo con luz y sombra
  c.fillStyle = '#64748b';
  c.fillRect(gx, gy + 54, blockW, 2);
  c.fillRect(gx + 54, gy, 2, blockH);
  c.fillStyle = '#0f1218';
  c.fillRect(gx, gy + 56, blockW, 2);
  c.fillRect(gx + 56, gy, 2, blockH);

  // Marcas viales amarillas
  c.fillStyle = '#eab308';
  for (let m = 72; m < blockW - 16; m += 48) {
    c.fillRect(gx + m, gy + 26, 22, 3);
    c.fillRect(gx + 26, gy + m, 3, 22);
  }

  // Baldosas de acera (cuadrícula fina hi-res)
  c.fillStyle = '#363c4a';
  for (let sx = gx + 58; sx < gx + blockW; sx += 28) {
    c.fillRect(sx, gy + 58, 1, blockH - 58);
  }
  for (let sy = gy + 58; sy < gy + blockH; sy += 28) {
    c.fillRect(gx + 58, sy, blockW - 58, 1);
  }

  // Grietas y vegetación post-apocalíptica
  c.fillStyle = '#14171f';
  c.fillRect(gx + 96, gy + 115, 20, 2);
  c.fillRect(gx + 114, gy + 117, 10, 2);
  c.fillRect(gx + 195, gy + 205, 2, 18);

  c.fillStyle = '#3f6212';
  c.fillRect(gx + 62, gy + 60, 4, 3);
  c.fillRect(gx + 150, gy + 165, 5, 3);
}

function drawWorld(camX, camY) {
  ctx.fillStyle = '#232730';
  ctx.fillRect(0, 0, vWidth, vHeight);

  ctx.save();
  ctx.translate(Math.round(vWidth / 2 - camX), Math.round(vHeight / 2 - camY));

  const blockW = 280;
  const blockH = 280;
  const startX = Math.floor((camX - vWidth / 2) / blockW) * blockW - blockW;
  const endX = camX + vWidth / 2 + blockW;
  const startY = Math.floor((camY - vHeight / 2) / blockH) * blockH - blockH;
  const endY = camY + vHeight / 2 + blockH;

  for (let gx = startX; gx < endX; gx += blockW) {
    for (let gy = startY; gy < endY; gy += blockH) {
      if (blockImg.complete && blockImg.naturalWidth > 0) {
        ctx.drawImage(blockImg, gx, gy, blockW, blockH);
      } else {
        drawBlockProcedural(ctx, gx, gy);
      }
    }
  }

  for (const p of props) {
    if (Math.abs(p.x - camX) > vWidth / 2 + 55 || Math.abs(p.y - camY) > vHeight / 2 + 55) continue;
    drawProp(p);
  }

  ctx.restore();
}

function draw() {
  if (isPortraitBlocked) return;

  const shakeX = screenShake > 0 ? Math.round((Math.random() - 0.5) * screenShake) : 0;
  const shakeY = screenShake > 0 ? Math.round((Math.random() - 0.5) * screenShake) : 0;
  const camX = player.x + shakeX;
  const camY = player.y + shakeY;

  drawWorld(camX, camY);

  ctx.save();
  ctx.translate(Math.round(vWidth / 2 - camX), Math.round(vHeight / 2 - camY));

  // Botín
  for (const g of gems) {
    const spr = SPRITES[g.type];
    const bob = Math.round(Math.sin(elapsedTime * 6 + g.x) * 2);
    ctx.drawImage(spr, Math.round(g.x - spr.width / 2), Math.round(g.y - spr.height / 2 + bob));
  }

  // Enemigos
  for (const e of enemies) {
    const frame = Math.floor((elapsedTime * 7 + e.animOffset)) % 2;
    const spr = SPRITES[e.spriteKey][frame];
    const ex = Math.round(e.x);
    const ey = Math.round(e.y);

    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(ex - Math.round(spr.width * 0.34), ey + Math.round(spr.height * 0.38), Math.round(spr.width * 0.68), 4);

    ctx.save();
    ctx.translate(ex, ey);
    if (e.facing < 0) ctx.scale(-1, 1);
    if (e.flash > 0) ctx.filter = 'brightness(3)';
    ctx.drawImage(spr, -Math.round(spr.width / 2), -Math.round(spr.height / 2));
    ctx.restore();

    if (!e.isBoss && e.hp < e.maxHp) {
      const bw = 20;
      ctx.fillStyle = '#0c0d10';
      ctx.fillRect(ex - bw / 2 - 1, ey - Math.round(spr.height / 2) - 6, bw + 2, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(ex - bw / 2, ey - Math.round(spr.height / 2) - 5, Math.max(1, Math.round(bw * (e.hp / e.maxHp))), 2);
    }
  }

  // GSOSITO
  const pSpr = SPRITES.gsosito[player.animFrame];
  const px = Math.round(player.x);
  const py = Math.round(player.y);

  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.fillRect(px - 11, py + 18, 22, 5);

  if (player.invulnTimer <= 0 || Math.floor(player.invulnTimer * 18) % 2 === 0) {
    ctx.save();
    ctx.translate(px, py);
    if (player.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(pSpr, -Math.round(pSpr.width / 2), -Math.round(pSpr.height / 2));
    ctx.restore();
  }

  // Drones orbitales
  if (player.orbitals > 0) {
    const orbitR = 40;
    for (let i = 0; i < player.orbitals; i++) {
      const a = player.orbitalAngle + (i * Math.PI * 2) / player.orbitals;
      const ox = Math.round(player.x + Math.cos(a) * orbitR);
      const oy = Math.round(player.y + Math.sin(a) * orbitR);
      ctx.drawImage(SPRITES.drone, ox - 12, oy - 10);
    }
  }

  // Proyectiles láser con núcleo brillante
  for (const p of projectiles) {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.fillRect(-11, -3, 22, 6);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-9, -2, 18, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, -1, 14, 2);
    ctx.restore();
  }

  // Partículas
  for (const pt of particles) {
    ctx.fillStyle = pt.color;
    ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
  }

  // Textos flotantes nítidos
  ctx.font = 'bold 9px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  for (const ft of floatingTexts) {
    const tx = Math.round(ft.x);
    const ty = Math.round(ft.y);
    ctx.fillStyle = '#000';
    ctx.fillText(ft.text, tx + 1, ty + 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, tx, ty);
  }

  ctx.restore();

  // Ceniza ambiental
  ctx.fillStyle = 'rgba(226, 232, 240, 0.3)';
  for (const a of ashParticles) {
    ctx.fillRect(Math.round(a.x % vWidth), Math.round(a.y % vHeight), a.size, a.size);
  }

  // --- HUD ESTILO CONTEMPORÁNEO INSPIRADO EN LA HOJA DE REFERENCIA ---
  if (gameState === 'PLAYING' || gameState === 'LEVELUP') {
    drawHUD();
  }

  // Joystick virtual
  if (joystick.active) {
    const sx = Math.round(joystick.startX);
    const sy = Math.round(joystick.startY);
    const cx = Math.round(joystick.startX + joystick.dx * joystick.maxRadius);
    const cy = Math.round(joystick.startY + joystick.dy * joystick.maxRadius);

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, joystick.maxRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(250, 204, 21, 0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHUD() {
  // Panel de retrato y barras estilo referencia
  ctx.fillStyle = 'rgba(15, 20, 28, 0.88)';
  ctx.fillRect(8, 8, 168, 42);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(8.5, 8.5, 167, 41);

  // Marco retrato
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(11, 11, 36, 36);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(11.5, 11.5, 35, 35);
  ctx.drawImage(SPRITES.gsosito[0], 11, 10, 36, 42);

  // Nivel y valores numéricos
  ctx.font = 'bold 10px "Chakra Petch", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#facc15';
  ctx.fillText(`NV.${player.level}`, 53, 20);

  // Barra de Salud roja
  ctx.fillStyle = '#090d14';
  ctx.fillRect(53, 23, 116, 9);
  ctx.fillStyle = '#ef4444';
  const hpW = Math.max(0, Math.round(114 * (player.hp / player.maxHp)));
  ctx.fillRect(54, 24, hpW, 7);
  ctx.font = 'bold 7px "Chakra Petch", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, 57, 30);

  // Barra de Experiencia azul
  ctx.fillStyle = '#090d14';
  ctx.fillRect(53, 35, 116, 9);
  ctx.fillStyle = '#3b82f6';
  const xpW = Math.min(114, Math.round(114 * (player.xp / player.xpToNext)));
  ctx.fillRect(54, 36, xpW, 7);
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(`XP ${player.xp}/${player.xpToNext}`, 57, 42);

  // Temporizador y Bajas arriba a la derecha
  const mins = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
  const secs = String(Math.floor(elapsedTime % 60)).padStart(2, '0');
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px "Chakra Petch", sans-serif';
  ctx.fillStyle = '#000';
  ctx.fillText(`${mins}:${secs}`, vWidth - 11, 22);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`${mins}:${secs}`, vWidth - 12, 21);

  ctx.font = 'bold 10px "Chakra Petch", sans-serif';
  ctx.fillStyle = '#000';
  ctx.fillText(`BAJAS: ${kills}`, vWidth - 11, 36);
  ctx.fillStyle = '#facc15';
  ctx.fillText(`BAJAS: ${kills}`, vWidth - 12, 35);

  // Barra de vida Jefe Activo
  const activeBoss = enemies.find(e => e.isBoss);
  if (activeBoss) {
    const bw = 220;
    const bx = Math.round(vWidth / 2 - bw / 2);
    const by = 10;
    ctx.fillStyle = '#090d14';
    ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
    ctx.strokeStyle = '#c084fc';
    ctx.strokeRect(bx - 1.5, by - 1.5, bw + 3, 11);
    ctx.fillStyle = '#9333ea';
    ctx.fillRect(bx, by, Math.max(1, Math.round(bw * (activeBoss.hp / activeBoss.maxHp))), 8);
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('CAPATAZ SOMBRA', Math.round(vWidth / 2), by + 20);
  }
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

scheduleOrientationChecks();
requestAnimationFrame(gameLoop);
