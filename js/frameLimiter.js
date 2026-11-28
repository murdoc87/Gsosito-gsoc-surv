// @ts-nocheck
// Limitador de FPS propio.
//
// Por qué no se usa el de Phaser (config fps.limit): en Phaser 4.2.1 acumula el tiempo
// sobrante entre frames y se lo pasa al juego, así que en pantallas de 60 Hz el juego podía
// recibir ~33 ms por frame en vez de ~16,7 ms y TODO iba al doble de velocidad hasta que el
// sobrante se reajustaba solo.
//
// Este limitador:
//   · Deja pasar como mucho `targetFps` actualizaciones por segundo (en pantallas de 90/120/144 Hz
//     se salta los frames sobrantes; en 60 Hz no se salta ninguno).
//   · Pasa al juego el tiempo REAL transcurrido desde la última actualización, así que la
//     velocidad del juego es siempre la correcta.

// Devuelve una función que, dado el instante del frame (ms), devuelve el delta en ms que hay
// que pasar al juego, o -1 si este frame se debe saltar.
export function createFrameLimiter(targetFps = 60, toleranceMs = 2, maxDeltaMs = 200) {
  const interval = 1000 / targetFps;
  let lastRun = null;
  let nextDue = 0;
  return function frameDelta(now) {
    if (lastRun === null) {
      lastRun = now;
      nextDue = now + interval;
      return interval;
    }
    // Margen de tolerancia: un frame que llega un poco antes de tiempo no se salta.
    if (now < nextDue - toleranceMs) return -1;
    const delta = Math.min(now - lastRun, maxDeltaMs);
    lastRun = now;
    // Siguiente instante: se acumula (para dar 60 de media también a 90 o 144 Hz), pero nunca
    // más allá de "ahora + intervalo" (para no ir adelantándose y saltar frames en 60 Hz).
    nextDue = Math.min(nextDue + interval, now + interval);
    return delta;
  };
}

// Instala el limitador en el bucle de Phaser. Se llama una vez, con el juego ya en marcha.
export function installFrameLimiter(game, targetFps = 60) {
  const loop = game.loop;
  if (!loop || loop.__customLimiter) return;
  const original = loop.callback;
  if (typeof original !== 'function') return;
  const frameDelta = createFrameLimiter(targetFps, 2, 1000 / (loop.minFps || 5));
  loop.callback = (time, _phaserDelta) => {
    const delta = frameDelta(time);
    if (delta < 0) return; // frame saltado: el canvas conserva la imagen anterior
    original(time, delta);
  };
  loop.__customLimiter = true;
}
