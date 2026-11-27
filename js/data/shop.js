// @ts-nocheck
// Mejoras permanentes de la tienda (máquina expendedora).

export const SHOP_UPGRADES = [
  {
    id: 'perm_hp',
    icon: '❤️',
    name: 'Blindaje Base',
    desc: 'Aumenta tus puntos de salud máxima al iniciar cada turno.',
    effectLabel: '+15 PS máximos por nivel',
    getCurrentBonusLabel: (lvl) => `Bonificación actual: +${lvl * 15} PS máximos`,
    baseCost: 25,
    stepCost: 20,
    maxLevel: 5
  },
  {
    id: 'perm_speed',
    icon: '🥾',
    name: 'Servo-Botas',
    desc: 'Incrementa tu velocidad base de desplazamiento por el perímetro.',
    effectLabel: '+8% velocidad inicial por nivel',
    getCurrentBonusLabel: (lvl) => `Bonificación actual: +${lvl * 8}% velocidad inicial`,
    baseCost: 30,
    stepCost: 25,
    maxLevel: 5
  },
  {
    id: 'perm_dmg',
    icon: '🔴',
    name: 'Láser Calibrado',
    desc: 'Potencia el daño base de tu armamento desde el primer segundo.',
    effectLabel: '+15% daño inicial por nivel',
    getCurrentBonusLabel: (lvl) => `Bonificación actual: +${lvl * 15}% daño inicial`,
    baseCost: 35,
    stepCost: 30,
    maxLevel: 5
  },
  {
    id: 'perm_dmg_red',
    icon: '🛡️',
    name: 'Chasis Reactivo',
    desc: 'Reduce de forma permanente todo el daño recibido por impactos.',
    effectLabel: '+5% reducción de daño por nivel',
    getCurrentBonusLabel: (lvl) => `Bonificación actual: -${lvl * 5}% daño recibido`,
    baseCost: 40,
    stepCost: 35,
    maxLevel: 5
  },
  {
    id: 'perm_xp',
    icon: '⚡',
    name: 'Extractor XP',
    desc: 'Incrementa el valor base de cada cristal de experiencia recogido en partida.',
    effectLabel: '+15% valor XP base por nivel',
    getCurrentBonusLabel: (lvl) => `Bonificación actual: +${lvl * 15}% valor XP base`,
    baseCost: 35,
    stepCost: 30,
    maxLevel: 5
  }
];
