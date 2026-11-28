// @ts-nocheck
// Joystick táctil.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
import { AudioSys } from '../../audio.js?v=10';
import { HUD_BASE_DEPTH } from '../../utils.js?v=10';

// Joystick táctil: fracción del radio sin respuesta y a partir de la cual se va a velocidad máxima.
const JOY_DEAD_ZONE = 0.15;
const JOY_FULL_SPEED_AT = 0.65;

export const InputMethods = {
  setupTouchJoystick() {
    this.joystick = { active: false, pointerId: null, startX: 0, startY: 0, dx: 0, dy: 0, knobX: 0, knobY: 0, maxR: 42 };
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
      this.joystick.knobX = 0;
      this.joystick.knobY = 0;
    });

    this.input.on('pointermove', (pointer) => {
      const joy = this.joystick;
      if (!joy.active || pointer.id !== joy.pointerId) return;
      let diffX = pointer.x - joy.startX;
      let diffY = pointer.y - joy.startY;
      let dist = Math.hypot(diffX, diffY);

      // La base sigue al dedo cuando este sale del círculo. Antes la base se quedaba fija:
      // si arrastrabas lejos y luego cambiabas de sentido, había que deshacer todo el recorrido
      // y el personaje frenaba poco a poco antes de girar (sensación de "resbalar").
      if (dist > joy.maxR) {
        const excess = (dist - joy.maxR) / dist;
        joy.startX += diffX * excess;
        joy.startY += diffY * excess;
        diffX -= diffX * excess;
        diffY -= diffY * excess;
        dist = joy.maxR;
      }
      joy.knobX = diffX;
      joy.knobY = diffY;

      // Respuesta: zona muerta pequeña (evita derivas al apoyar el dedo) y velocidad máxima
      // antes de llegar al borde, para que no haya que estirar el dedo para ir a tope.
      const t = dist / joy.maxR;
      const mag = t <= JOY_DEAD_ZONE ? 0 : Math.min(1, (t - JOY_DEAD_ZONE) / (JOY_FULL_SPEED_AT - JOY_DEAD_ZONE));
      joy.dx = dist > 0 ? (diffX / dist) * mag : 0;
      joy.dy = dist > 0 ? (diffY / dist) * mag : 0;
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
    this.joystick.knobX = 0;
    this.joystick.knobY = 0;
    if (this.joyGraphics) this.joyGraphics.clear();
  }
};
