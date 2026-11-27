// @ts-nocheck
// Punto de entrada: configuración de Phaser y arranque del juego.
import Phaser from './phaser.js?v=8';
import { SurvivorScene } from './scenes/SurvivorScene.js?v=8';
import { getDpr } from './utils.js?v=8';

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
    resolution: getDpr()
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
      // El árbol espacial de Arcade se reconstruye en cada frame con todos los cuerpos. Desde que la
      // multitud (crowd.js) y las gemas no usan Arcade, quedan pocas colisiones y sale más barato sin él.
      useTree: false
    }
  },
  scene: [SurvivorScene]
};

new Phaser.Game(config);
