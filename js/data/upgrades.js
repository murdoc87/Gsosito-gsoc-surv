// @ts-nocheck
// Mejoras de subida de nivel y reglas de la fusión de armas.

export function applyVeterancyUpgrade(p) {
  p.veterancyLevel = (p.veterancyLevel || 0) + 1;
  const stepGain = 0.06 + (p.veterancyLevel - 1) * 0.025;
  p.damageReduction = Math.min(0.75, Number(((p.damageReduction || 0) + stepGain).toFixed(4)));
}

export function activateDomoFish(p) {
  p.domoFish.enabled = true;
  p.domoFish.pickups = Math.max(1, Number(p.domoFish.pickups) || 0);
  p.domoFish.level = Math.max(1, Number(p.domoFish.level) || 1);
  p.domoFish.rays = Math.max(4, p.domoFish.rays || 4);
  p.domoFish.baseDamage = Math.max(16, p.domoFish.baseDamage || 16);
  p.domoFish.baseCooldown = Math.min(3.2, p.domoFish.baseCooldown || 3.2);
  p.domoFish.timer = 0.05;
}

export function registerDomoFishUpgradePickup(p) {
  p.domoFish.enabled = true;
  p.domoFish.pickups = (Number(p.domoFish.pickups) || 0) + 1;
  p.domoFish.level = p.domoFish.pickups;
}

export function activateDrones(p) {
  p.dronesEnabled = true;
  p.orbitals = Math.max(1, p.orbitals || 0);
}

export function upgradeTamperAttack(p) {
  const nextLvl = (p.tamper.level || 0) + 1;
  p.tamper.level = nextLvl;
  p.tamper.enabled = true;
  if (nextLvl === 1) {
    p.tamper.cooldown = 3.0;
    p.tamper.targets = 1;
    p.tamper.damage = 26;
    p.tamper.timer = 0.25;
  } else {
    p.tamper.damage = Math.round(p.tamper.damage * 1.24);
  }
}

export function activateCommLoss(p) {
  p.commLoss.enabled = true;
  p.commLoss.level = 1;
  p.commLoss.cooldown = 11.5;
  p.commLoss.minTargets = 1;
  p.commLoss.maxTargets = 2;
  p.commLoss.stunDuration = 2.4;
  p.commLoss.timer = 0.8;
}

export const ACTIVATOR_UPGRADE_IDS = new Set(['domofish360', 'tamper_attack', 'orbital', 'comm_loss_attack']);

export const BASIC_LASER_UPGRADE_IDS = new Set(['firerate', 'damage', 'multishot', 'pierce']);

export function getBasicLaserUpgradesCount(stats) {
  const counts = stats?.upgradeCounts || {};
  let total = 0;
  BASIC_LASER_UPGRADE_IDS.forEach(id => {
    total += Number(counts[id]) || 0;
  });
  return total;
}

export function canFuseWeapons(stats) {
  if (!stats || stats.fusionActive) return false;
  const domoPickups = Number(stats.domoFish?.pickups) || 0;
  const basicLaserUps = getBasicLaserUpgradesCount(stats);
  return Boolean(stats.domoFish?.enabled) && domoPickups >= 5 && basicLaserUps >= 5;
}

export function getUpgradeTagLabel(upg, stats) {
  if (ACTIVATOR_UPGRADE_IDS.has(upg.id)) {
    return 'ACTIVAR';
  }
  const takenCount = Number(stats?.upgradeCounts?.[upg.id]) || 0;
  return `NV.${takenCount + 1}`;
}

export const DOMO_ICON = '🔮';

export const DRONE_ICON = '🤖';

export const TAMPER_ICON = '🌩️';

export const COMMLOSS_ICON = '📡';

export const UPGRADES = [
  {
    id: 'firerate',
    icon: '🔴',
    title: 'Overclocking',
    desc: 'Aumenta cadencia de disparo del láser básico',
    requires: (p) => !p.fusionActive,
    apply: (p) => { p.weapon.cooldown *= 0.78; }
  },
  {
    id: 'damage',
    icon: '🔴',
    title: 'Alta Potencia',
    desc: 'Aumenta daño base del láser básico',
    requires: (p) => !p.fusionActive,
    apply: (p) => { p.weapon.damage = Math.round(p.weapon.damage * 1.32); }
  },
  {
    id: 'multishot',
    icon: '🔴',
    title: 'Bi-Spectrum',
    desc: '+1 disparo láser simultáneo',
    requires: (p) => !p.fusionActive,
    apply: (p) => { p.weapon.projectileCount += 1; }
  },
  {
    id: 'pierce',
    icon: '🔴',
    title: 'Láser Perforante',
    desc: 'Cada láser básico atraviesa +1 enemigo',
    requires: (p) => !p.fusionActive,
    apply: (p) => { p.weapon.pierce += 1; }
  },
  {
    id: 'domofish360',
    icon: DOMO_ICON,
    title: 'Domo-Fish 360',
    desc: 'Activa un anillo circular de 4 láseres alrededor de ti',
    requires: (p) => !p.domoFish?.enabled && !p.fusionActive,
    apply: (p) => { activateDomoFish(p); }
  },
  {
    id: 'domofish_rays',
    icon: DOMO_ICON,
    title: 'Ráfaga Domo',
    desc: '+2 proyectiles por anillo de Domo-Fish 360',
    requires: (p) => Boolean(p.domoFish?.enabled) && !p.fusionActive && (p.domoFish.rays || 4) < 36,
    apply: (p) => {
      p.domoFish.rays = Math.min(36, (p.domoFish.rays || 4) + 2);
      registerDomoFishUpgradePickup(p);
    }
  },
  {
    id: 'domofish_firerate',
    icon: DOMO_ICON,
    title: 'Cadencia Domo',
    desc: 'Aumenta la velocidad de disparo de Domo-Fish',
    requires: (p) => Boolean(p.domoFish?.enabled) && !p.fusionActive && (p.domoFish.baseCooldown || 3.2) > 1.1,
    apply: (p) => {
      p.domoFish.baseCooldown = Math.max(1.1, Number((p.domoFish.baseCooldown / 1.2).toFixed(3)));
      registerDomoFishUpgradePickup(p);
    }
  },
  {
    id: 'domofish_damage',
    icon: DOMO_ICON,
    title: 'Potencia Domo',
    desc: 'Aumenta el daño de los láseres de Domo-Fish',
    requires: (p) => Boolean(p.domoFish?.enabled) && !p.fusionActive,
    apply: (p) => {
      p.domoFish.baseDamage = Math.round(p.domoFish.baseDamage * 1.3);
      registerDomoFishUpgradePickup(p);
    }
  },
  {
    id: 'tamper_attack',
    icon: TAMPER_ICON,
    title: 'Ataque Tamper',
    desc: 'Cada 3s cae un rayo del cielo sobre 1 enemigo aleatorio',
    requires: (p) => !p.tamper?.enabled,
    apply: (p) => { upgradeTamperAttack(p); }
  },
  {
    id: 'tamper_cd',
    icon: TAMPER_ICON,
    title: 'Pulso Tamper',
    desc: 'Reduce el tiempo entre rayos de Ataque Tamper',
    requires: (p) => Boolean(p.tamper?.enabled) && (p.tamper.cooldown || 3.0) > 1.0,
    apply: (p) => { p.tamper.cooldown = Math.max(1.0, Number((p.tamper.cooldown * 0.82).toFixed(3))); }
  },
  {
    id: 'tamper_targets',
    icon: TAMPER_ICON,
    title: 'Arco Tamper',
    desc: '+1 enemigo aleatorio golpeado por Ataque Tamper',
    requires: (p) => Boolean(p.tamper?.enabled) && (p.tamper.targets || 1) < 8,
    apply: (p) => { p.tamper.targets = Math.min(8, (p.tamper.targets || 1) + 1); }
  },
  {
    id: 'tamper_dmg',
    icon: TAMPER_ICON,
    title: 'Voltaje Tamper',
    desc: 'Aumenta el daño de los rayos de Ataque Tamper',
    requires: (p) => Boolean(p.tamper?.enabled),
    apply: (p) => { p.tamper.damage = Math.round(p.tamper.damage * 1.3); }
  },
  {
    id: 'comm_loss_attack',
    icon: COMMLOSS_ICON,
    title: 'Pérdida de comunicación parcial',
    desc: 'Cada 11.5s desconecta y aturde en el sitio a 1-2 enemigos aleatorios',
    requires: (p) => !p.commLoss?.enabled,
    apply: (p) => { activateCommLoss(p); }
  },
  {
    id: 'comm_loss_cd',
    icon: COMMLOSS_ICON,
    title: 'Interferencia Continua',
    desc: 'Reduce el tiempo de recarga de Pérdida de comunicación parcial',
    requires: (p) => Boolean(p.commLoss?.enabled) && (p.commLoss.cooldown || 11.5) > 3.2,
    apply: (p) => { p.commLoss.cooldown = Math.max(3.2, Number((p.commLoss.cooldown * 0.82).toFixed(2))); }
  },
  {
    id: 'comm_loss_targets',
    icon: COMMLOSS_ICON,
    title: 'Caída de Red Masiva',
    desc: 'Aumenta el número aleatorio de enemigos stuneados por pulso (+1/+2)',
    requires: (p) => Boolean(p.commLoss?.enabled) && (p.commLoss.maxTargets || 2) < 12,
    apply: (p) => {
      p.commLoss.minTargets = Math.min(8, (p.commLoss.minTargets || 1) + 1);
      p.commLoss.maxTargets = Math.min(12, (p.commLoss.maxTargets || 2) + 2);
    }
  },
  {
    id: 'comm_loss_duration',
    icon: COMMLOSS_ICON,
    title: 'Reconexión Lenta',
    desc: 'Aumenta la duración del aturdimiento por pérdida de señal (+0.7s)',
    requires: (p) => Boolean(p.commLoss?.enabled) && (p.commLoss.stunDuration || 2.4) < 6.0,
    apply: (p) => { p.commLoss.stunDuration = Math.min(6.0, Number(((p.commLoss.stunDuration || 2.4) + 0.7).toFixed(2))); }
  },
  {
    id: 'orbital',
    icon: DRONE_ICON,
    title: 'Dron de Vigilancia',
    desc: 'Activa un dron orbital que daña a los enemigos cercanos',
    requires: (p) => !p.dronesEnabled,
    apply: (p) => { activateDrones(p); }
  },
  {
    id: 'drone_count',
    icon: DRONE_ICON,
    title: 'Enjambre de Drones',
    desc: '+1 dron defensor orbital girando a tu alrededor',
    requires: (p) => Boolean(p.dronesEnabled) && (p.orbitals || 1) < 8,
    apply: (p) => { p.orbitals = Math.min(8, (p.orbitals || 1) + 1); }
  },
  {
    id: 'drone_speed',
    icon: DRONE_ICON,
    title: 'Propulsores de Dron',
    desc: 'Aumenta la velocidad de giro de los drones orbitales',
    requires: (p) => Boolean(p.dronesEnabled),
    apply: (p) => { p.droneOrbitSpeed = Number((p.droneOrbitSpeed * 1.35).toFixed(3)); }
  },
  {
    id: 'drone_area',
    icon: DRONE_ICON,
    title: 'Alcance de Dron',
    desc: 'Aumenta el radio de órbita y mayor área de patrulla de los drones',
    requires: (p) => Boolean(p.dronesEnabled) && (p.droneOrbitRadius || 68) < 145,
    apply: (p) => { p.droneOrbitRadius = Math.min(145, p.droneOrbitRadius + 12); }
  },
  {
    id: 'global_damage',
    icon: '☢️',
    title: 'Operativa',
    desc: 'Aumenta el daño de TODOS tus ataques y drones',
    apply: (p) => { p.globalDamageMult = Number((p.globalDamageMult * 1.18).toFixed(3)); }
  },
  {
    id: 'global_firerate',
    icon: '☕',
    title: 'Cafeína',
    desc: 'Aumenta la cadencia de TODOS tus ataques',
    apply: (p) => { p.globalFirerateMult = Number((p.globalFirerateMult * 1.15).toFixed(3)); }
  },
  {
    id: 'speed',
    icon: '🥾',
    title: 'Botas de seguridad',
    desc: 'Aumenta tu velocidad de movimiento',
    apply: (p) => { p.speed *= 1.16; }
  },
  {
    id: 'maxhp',
    icon: '❤️',
    title: 'Blindaje Reforzado',
    desc: '+30 salud máxima y curación total',
    // Cura por completo: pensada como salvavidas en situaciones críticas.
    apply: (p) => { p.maxHp += 30; p.hp = p.maxHp; }
  },
  {
    id: 'veterancy',
    icon: '🛡️',
    title: 'Veteranía',
    desc: 'Aumenta la reducción de daño recibido (cada nivel aporta más)',
    requires: (p) => (p.damageReduction || 0) < 0.75,
    apply: (p) => { applyVeterancyUpgrade(p); }
  },
  {
    id: 'magnet',
    icon: '🧲',
    title: 'Imán de Suministros',
    desc: 'Aumenta tu radio de recolección pasiva',
    apply: (p) => { p.pickupRange *= 1.45; }
  }
];
