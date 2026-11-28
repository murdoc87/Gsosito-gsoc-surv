// @ts-nocheck
// Punto de entrada: configuración de Phaser y arranque del juego.
import Phaser from './phaser.js?v=10';
import { SurvivorScene } from './scenes/SurvivorScene.js?v=10';
import { getDpr } from './utils.js?v=10';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 854,
  height: 480,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  backgroundColor: '#1b1e26',
  // Sin fps.limit de Phaser: en la 4.2.1 hacía que el juego fuera al doble de velocidad en
  // pantallas de 60 Hz. El límite a 60 FPS lo pone js/frameLimiter.js (ver SurvivorScene.create).
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
      // Paso de física variable: exactamente un paso por frame. Con paso fijo (el valor por
      // defecto), si un frame tardaba más de 16,7 ms Phaser hacía varios pasos seguidos para
      // recuperar, cargando aún más a un móvil que ya iba justo; y en pantallas de 120 Hz el
      // personaje se movía un frame sí y otro no.
      fixedStep: false,
      // El árbol espacial de Arcade se reconstruye en cada frame con todos los cuerpos. Desde que la
      // multitud (crowd.js) y las gemas no usan Arcade, quedan pocas colisiones y sale más barato sin él.
      useTree: false
    }
  },
  scene: [SurvivorScene]
};

new Phaser.Game(config);
