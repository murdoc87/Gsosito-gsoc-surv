// @ts-nocheck
// Joystick táctil.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
import { AudioSys } from '../../audio.js?v=8';
import { HUD_BASE_DEPTH } from '../../utils.js?v=8';

export const InputMethods = {
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
      this.resetJoystick();
    };

    this.input.on('pointerup', releaseJoystick);
    this.input.on('pointercancel', releaseJoystick);
  },

  resetJoystick() {
    if (!this.joystick) return;
    this.joystick.active = false;
    this.joystick.pointerId = null;
    this.joystick.dx = 0;
    this.joystick.dy = 0;
    if (this.joyGraphics) this.joyGraphics.clear();
  }
};
