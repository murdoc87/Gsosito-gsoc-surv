// @ts-nocheck
// Tabla de aparición de enemigos y valor de la XP.

export function getXpValueByTier(tier, baseEnemyXp) {
  const base = Math.max(6, Math.round((Number(baseEnemyXp) || 5) * 1.35));
  if (tier === 'red') return Math.max(30, Math.round(base * 4.2));
  if (tier === 'blue') return Math.max(14, Math.round(base * 2.0));
  return base;
}

// Enemigos normales por tramo de tiempo (segundos). Dentro de cada tramo se tira un número
// aleatorio y se elige la primera entrada con roll < upTo. key 'cat' = gato naranja o gris al azar.
// hp es la vida base: se multiplica por la dificultad (1 + t/270) y por hpScale.
export const ENEMY_SPAWN_TABLE = [
  {
    until: 60,
    entries: [
      { upTo: 0.55, key: 'cat', radius: 9, speed: 74, hp: 15, damage: 6, xp: 4, facingLeftByDefault: true },
      { upTo: Infinity, key: 'mutantRat', radius: 10, speed: 68, hp: 20, damage: 7, xp: 5, facingLeftByDefault: true }
    ]
  },
  {
    until: 160,
    entries: [
      { upTo: 0.28, key: 'cat', radius: 9, speed: 78, hp: 17, damage: 7, xp: 5, facingLeftByDefault: true },
      { upTo: 0.52, key: 'mutantRat', radius: 10, speed: 72, hp: 23, damage: 8, xp: 5, facingLeftByDefault: true },
      { upTo: 0.78, key: 'crow', radius: 10, speed: 90, hp: 22, damage: 8, xp: 6, facingLeftByDefault: true },
      { upTo: Infinity, key: 'thief', radius: 11, speed: 64, hp: 32, damage: 10, xp: 7, facingLeftByDefault: false }
    ]
  },
  {
    until: 270,
    entries: [
      { upTo: 0.16, key: 'cat', radius: 9, speed: 82, hp: 19, damage: 7, xp: 5, facingLeftByDefault: true },
      { upTo: 0.32, key: 'mutantRat', radius: 10, speed: 76, hp: 26, damage: 9, xp: 6, facingLeftByDefault: true },
      { upTo: 0.52, key: 'crow', radius: 10, speed: 94, hp: 26, damage: 9, xp: 7, facingLeftByDefault: true },
      { upTo: 0.70, key: 'thief', radius: 11, speed: 66, hp: 36, damage: 11, xp: 8, facingLeftByDefault: false },
      { upTo: 0.86, key: 'logistics', radius: 12, speed: 50, hp: 52, damage: 13, xp: 10, facingLeftByDefault: false },
      { upTo: Infinity, key: 'forklift', radius: 14, scale: 2, speed: 92, hp: 96, damage: 18, xp: 15, facingLeftByDefault: true }
    ]
  },
  {
    until: Infinity,
    entries: [
      { upTo: 0.12, key: 'cat', radius: 9, speed: 85, hp: 21, damage: 8, xp: 5, facingLeftByDefault: true },
      { upTo: 0.24, key: 'mutantRat', radius: 10, speed: 80, hp: 30, damage: 9, xp: 6, facingLeftByDefault: true },
      { upTo: 0.40, key: 'crow', radius: 10, speed: 98, hp: 30, damage: 10, xp: 7, facingLeftByDefault: true },
      { upTo: 0.54, key: 'thief', radius: 11, speed: 68, hp: 38, damage: 11, xp: 8, facingLeftByDefault: false },
      { upTo: 0.68, key: 'logistics', radius: 12, speed: 52, hp: 56, damage: 14, xp: 10, facingLeftByDefault: false },
      { upTo: 0.81, key: 'foreman', radius: 15, speed: 42, hp: 102, damage: 18, xp: 16, facingLeftByDefault: false },
      { upTo: 0.92, key: 'execSuit', radius: 14, speed: 48, hp: 155, damage: 22, xp: 22, facingLeftByDefault: false },
      { upTo: Infinity, key: 'forklift', radius: 14, scale: 2, speed: 96, hp: 136, damage: 21, xp: 18, facingLeftByDefault: true }
    ]
  }
];

export function pickEnemySpawnConfig(elapsedTime, roll) {
  const bracket = ENEMY_SPAWN_TABLE.find(b => elapsedTime < b.until) || ENEMY_SPAWN_TABLE[ENEMY_SPAWN_TABLE.length - 1];
  const entry = bracket.entries.find(e => roll < e.upTo) || bracket.entries[bracket.entries.length - 1];
  const key = entry.key === 'cat' ? (Math.random() > 0.45 ? 'catOrange' : 'catGray') : entry.key;
  return { ...entry, key, scale: entry.scale || 1 };
}
