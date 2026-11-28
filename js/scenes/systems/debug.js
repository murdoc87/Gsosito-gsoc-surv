// @ts-nocheck
// Panel de diagnóstico de rendimiento. Solo aparece si la URL lleva ?debug=1
// (por ejemplo: https://tu-sitio/index.html?debug=1). No afecta al juego normal.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.

// Versión de los archivos que se están ejecutando (el ?v=N con el que se cargó este módulo).
const LOADED_VERSION = new URL(import.meta.url).searchParams.get('v') || '?';

export const DebugMethods = {
  setupDebugOverlay() {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    if (this._debugOverlay) return;

    const el = document.createElement('div');
    el.id = 'debug-overlay';
    el.style.cssText = [
      'position:fixed', 'left:6px', 'bottom:6px', 'z-index:2147483646',
      'background:rgba(0,0,0,0.72)', 'color:#a7f3d0', 'font:11px/1.35 monospace',
      'padding:5px 7px', 'border-radius:6px', 'pointer-events:none', 'white-space:pre'
    ].join(';');
    document.body.appendChild(el);
    this._debugOverlay = el;

    // Mide el tiempo de lógica (step) y de dibujado (render) de cada frame.
    const stats = { logic: 0, render: 0, frames: 0, worst: 0, physSteps: 0 };
    let cur = 0;
    const sys = this.sys;
    const origStep = sys.step.bind(sys);
    const origRender = sys.render.bind(sys);
    sys.step = (t, d) => { const a = performance.now(); origStep(t, d); cur = performance.now() - a; stats.logic += cur; };
    sys.render = (r) => {
      const a = performance.now(); origRender(r);
      const rr = performance.now() - a;
      stats.render += rr; stats.frames++;
      if (cur + rr > stats.worst) stats.worst = cur + rr;
    };
    this.physics.world.on('worldstep', () => { stats.physSteps++; });

    let last = performance.now();
    const tick = () => {
      if (!this._debugOverlay) return;
      const now = performance.now();
      const secs = (now - last) / 1000;
      last = now;
      const f = Math.max(1, stats.frames);
      const gl = this.sys.renderer && this.sys.renderer.gl;
      const lines = [
        `v${LOADED_VERSION} · ${(stats.frames / secs).toFixed(0)} FPS (Phaser ${this.sys.game.loop.actualFps.toFixed(0)}) · ${this.gameState}`,
        `lógica ${(stats.logic / f).toFixed(1)} ms · dibujo ${(stats.render / f).toFixed(1)} ms · peor ${stats.worst.toFixed(0)} ms`,
        `física ${(stats.physSteps / f).toFixed(2)} pasos/frame`,
        `enemigos ${this.enemies.countActive(true)} · gemas ${this.gems.countActive(true)} · balas ${this.projectiles.countActive(true)} · balas-enem ${this.enemyProjectiles.countActive(true)}`,
        `textos ${this.floatingLabelActive ? this.floatingLabelActive.length : 0} · objetos ${this.children.list.length} · t ${Math.floor(this.elapsedTime)}s`,
        `canvas ${this.sys.game.canvas.width}x${this.sys.game.canvas.height} · dpr ${window.devicePixelRatio} · ${gl ? 'WebGL' : 'Canvas'}`
      ];
      el.textContent = lines.join('\n');
      stats.logic = stats.render = stats.frames = stats.worst = stats.physSteps = 0;
    };
    this._debugTimer = setInterval(tick, 1000);
  }
};
