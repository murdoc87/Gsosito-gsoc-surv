// @ts-nocheck
// Utilidades compartidas: profundidad de dibujado, daño, formato de tiempo.

export const WORLD_Y_SPAN = 12000;

export const WORLD_BASE_DEPTH = 2000;

export const HUD_BASE_DEPTH = 200000;

export function getWorldEntityDepth(y, offset = 0) {
  const clampedY = Math.max(-WORLD_Y_SPAN, Math.min(WORLD_Y_SPAN, Number(y) || 0));
  return Math.round(WORLD_BASE_DEPTH + clampedY + WORLD_Y_SPAN + offset);
}

export function getEnemyDepth(enemy, isBoss = false) {
  return getWorldEntityDepth(enemy?.y ?? 0, isBoss ? 25 : 0);
}

export function applyEnemyFacing(enemy, vx, facingLeftByDefault) {
  if (Math.abs(vx) < 0.01) return;
  const movingRight = vx > 0;
  enemy.setFlipX(facingLeftByDefault ? movingRight : !movingRight);
}

export function getReducedDamage(stats, rawDamage) {
  const reduction = Math.max(0, Math.min(0.75, stats?.damageReduction || 0));
  return Math.max(1, Math.round(rawDamage * (1 - reduction)));
}

// "mm:ss" a partir de segundos.
export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mins = String(Math.floor(s / 60)).padStart(2, '0');
  const secs = String(s % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

// Resolución de texto (devicePixelRatio limitado a 2).
export function getDpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

// setDepth() en Phaser siempre marca la escena para reordenar TODOS los objetos, aunque el valor
// no cambie. Esto solo lo llama si la profundidad es distinta.
export function setDepthIfChanged(obj, depth) {
  if (obj.depth !== depth) obj.setDepth(depth);
}
