// @ts-nocheck
// Efectos de sonido sintetizados con Web Audio.

// --- AUDIO SINTETIZADO ---
// Límites para que los sonidos repetidos (cientos de golpes por segundo en las hordas)
// no saturen el audio del móvil: cada efecto frecuente suena como mucho una vez cada X ms
// y nunca hay más de MAX_VOICES osciladores sonando a la vez.
const MAX_VOICES = 24;
const MIN_GAP_MS = { hit: 45, kill: 50, pickup: 35, scrapPickup: 50, hurt: 60 };

export const AudioSys = {
  ctx: null,
  activeVoices: 0,
  _lastPlayedAt: {},
  // Devuelve false si el efecto `key` sonó hace menos de su intervalo mínimo.
  canPlay(key) {
    const gap = MIN_GAP_MS[key];
    if (!gap) return true;
    const now = performance.now();
    if (now - (this._lastPlayedAt[key] ?? -Infinity) < gap) return false;
    this._lastPlayedAt[key] = now;
    return true;
  },
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
    if (!this.ctx || this.activeVoices >= MAX_VOICES) return;
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
      this.activeVoices++;
      osc.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1);
        osc.disconnect();
        gain.disconnect();
      };
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
  hit() { if (!this.canPlay('hit')) return; this.playTone(185, 'sawtooth', 0.055, 0.045, 80); },
  kill() { if (!this.canPlay('kill')) return; this.playTone(290, 'square', 0.1, 0.055, 65); },
  pickup() { if (!this.canPlay('pickup')) return; this.playTone(720, 'sine', 0.07, 0.05, 1240); },
  scrapPickup() {
    if (!this.canPlay('scrapPickup')) return;
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
  hurt() { if (!this.canPlay('hurt')) return; this.playTone(130, 'sawtooth', 0.2, 0.08, 48); }
};

function unlockAudioOnFirstInteraction() {
  AudioSys.init();
  window.removeEventListener('pointerdown', unlockAudioOnFirstInteraction);
  window.removeEventListener('touchstart', unlockAudioOnFirstInteraction);
}

window.addEventListener('pointerdown', unlockAudioOnFirstInteraction, { passive: true });

window.addEventListener('touchstart', unlockAudioOnFirstInteraction, { passive: true });
