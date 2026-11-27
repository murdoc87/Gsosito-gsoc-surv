// @ts-nocheck
// Armas del jugador (Domo-Fish, fusión, Tamper, Pérdida de comunicación, drones, bomba).
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
import Phaser from '../../phaser.js?v=8';
import { AudioSys } from '../../audio.js?v=8';
import { getWorldEntityDepth, setDepthIfChanged } from '../../utils.js?v=8';

export const WeaponMethods = {
  fireDomoFish360(st) {
    if (st?.fusionActive) return;
    const df = st?.domoFish;
    if (!df || !df.enabled) return;

    const rays = Math.max(4, df.rays || 4);
    const step = (Math.PI * 2) / rays;
    const offset = df.ringOffset || 0;
    const finalDmg = Math.max(1, Math.round(df.baseDamage * (st.globalDamageMult || 1)));

    for (let i = 0; i < rays; i++) {
      const angle = offset + i * step;
      const proj = this.projectiles.create(this.player.x, this.player.y - 8, 'domo_laser').setDepth(getWorldEntityDepth(this.player.y, 6000));
      proj.setRotation(angle);
      proj.setVelocity(Math.cos(angle) * df.projectileSpeed, Math.sin(angle) * df.projectileSpeed);
      proj.setData('proj', { damage: finalDmg, pierce: df.pierce, hitList: [] });
      this.time.delayedCall(1200, () => { if (proj.active) proj.destroy(); });
    }

    df.ringOffset = offset + step * 0.5;
    AudioSys.novaShoot();
  },

  fireFusedPurpleLasers(st) {
    if (!st || !st.fusionActive) return;
    const globalDmg = st.globalDamageMult || 1;
    const df = st.domoFish || {};
    const wp = st.weapon || {};

    const ringRays = Math.min(8, Math.max(4, Math.round(((df.rays || 4) + 1) * 0.52)));
    const step = (Math.PI * 2) / ringRays;
    const ringOffset = st.fusionRingOffset || 0;
    const combinedBaseDmg = Math.max(
      15,
      Math.round(((wp.damage || 18) * 0.62 + (df.baseDamage || 16) * 0.64) * globalDmg)
    );
    const pierce = Math.max(1, Math.min(3, Math.round(((wp.pierce || 1) + (df.pierce || 2)) * 0.5)));
    const speed = Math.max(255, Math.min(330, (wp.projectileSpeed || 320) * 0.88));

    for (let i = 0; i < ringRays; i++) {
      const angle = ringOffset + i * step;
      const proj = this.projectiles.create(this.player.x, this.player.y - 8, 'fusion_laser').setDepth(getWorldEntityDepth(this.player.y, 6010));
      proj.setScale(0.95);
      proj.setRotation(angle);
      proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      proj.setData('proj', {
        damage: combinedBaseDmg,
        pierce,
        isFusion: true,
        hitList: []
      });
      this.time.delayedCall(1050, () => { if (proj.active) proj.destroy(); });
    }
    st.fusionRingOffset = ringOffset + step * 0.5;

    const maxRange = 295;
    // Solo hace falta el más cercano: se busca sin filtrar ni ordenar la lista entera.
    const { targets } = this.findNearestEnemies(this.enemies.getChildren(), 1, maxRange, this.player.x, this.player.y);

    if (targets.length > 0) {
      const primary = targets[0];
      const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 8, primary.x, primary.y);
      this.player.setFlipX(Math.cos(baseAngle) < 0);

      const extraCount = Math.min(3, Math.max(1, Math.round((wp.projectileCount || 1) * 0.6)));
      const spread = 0.18;
      for (let j = 0; j < extraCount; j++) {
        const aimAngle = baseAngle + (j - (extraCount - 1) / 2) * spread;
        const proj = this.projectiles.create(this.player.x, this.player.y - 8, 'fusion_laser').setDepth(getWorldEntityDepth(this.player.y, 6015));
        proj.setScale(1.0);
        proj.setRotation(aimAngle);
        proj.setVelocity(Math.cos(aimAngle) * (speed * 1.02), Math.sin(aimAngle) * (speed * 1.02));
        proj.setData('proj', {
          damage: Math.round(combinedBaseDmg * 0.85),
          pierce: Math.min(3, pierce),
          isFusion: true,
          hitList: []
        });
        this.time.delayedCall(920, () => { if (proj.active) proj.destroy(); });
      }
    }

    AudioSys.fusionShoot();
  },

  fireCommLossAttack(st) {
    const cl = st?.commLoss;
    if (!cl || !cl.enabled) return;

    const candidates = this.enemies.getChildren().filter(e => {
      if (!e || !e.active) return false;
      const d = e.getData('enemy');
      return d && d.hp > 0;
    });

    if (candidates.length === 0) return;

    const minT = Math.max(1, cl.minTargets || 1);
    const maxT = Math.max(minT, cl.maxTargets || 2);
    const desiredCount = Phaser.Math.Between(minT, maxT);
    const count = Math.min(candidates.length, desiredCount);

    const chosen = Phaser.Utils.Array.Shuffle([...candidates]).slice(0, count);
    const baseStun = cl.stunDuration || 2.4;

    chosen.forEach(target => {
      const d = target.getData('enemy');
      if (!d) return;
      const duration = d.isBoss ? Math.max(1.0, baseStun * 0.55) : baseStun;
      d.stunTimer = Math.max(d.stunTimer || 0, duration);
      target.setVelocity(0, 0);
      this.addFloatingText(target.x, target.y - 24, '📡 ¡SIN SEÑAL!', '#38bdf8');
    });

    AudioSys.commLossStun();
  },

  fireTamperAttack(st) {
    const tp = st?.tamper;
    if (!tp || !tp.enabled) return;

    const activeEnemies = this.enemies.getChildren().filter(e => {
      if (!e || !e.active) return false;
      const d = e.getData('enemy');
      return d && d.hp > 0;
    });

    if (activeEnemies.length === 0) return;

    const targetCount = Math.min(activeEnemies.length, Math.max(1, tp.targets || 1));
    const chosen = Phaser.Utils.Array.Shuffle([...activeEnemies]).slice(0, targetCount);
    const finalDmg = Math.max(1, Math.round((tp.damage || 26) * (st.globalDamageMult || 1)));

    if (this.tamperFxGraphics) {
      this.tamperFxGraphics.clear();
      chosen.forEach(target => {
        if (!target || !target.active) return;
        const skyX = target.x + Phaser.Math.Between(-26, 26);
        const skyY = target.y - 240;
        const groundY = target.y + 4;

        this.tamperFxGraphics.lineStyle(5, 0x0284c7, 0.45);
        this.tamperFxGraphics.beginPath();
        this.tamperFxGraphics.moveTo(skyX, skyY);
        const segs = 5;
        for (let s = 1; s < segs; s++) {
          const t = s / segs;
          const jx = Phaser.Math.Linear(skyX, target.x, t) + Phaser.Math.Between(-14, 14);
          const jy = Phaser.Math.Linear(skyY, groundY, t);
          this.tamperFxGraphics.lineTo(jx, jy);
        }
        this.tamperFxGraphics.lineTo(target.x, groundY);
        this.tamperFxGraphics.strokePath();

        this.tamperFxGraphics.lineStyle(2.5, 0x38bdf8, 0.98);
        this.tamperFxGraphics.beginPath();
        this.tamperFxGraphics.moveTo(skyX, skyY);
        for (let s = 1; s < segs; s++) {
          const t = s / segs;
          const jx = Phaser.Math.Linear(skyX, target.x, t) + Phaser.Math.Between(-14, 14);
          const jy = Phaser.Math.Linear(skyY, groundY, t);
          this.tamperFxGraphics.lineTo(jx, jy);
        }
        this.tamperFxGraphics.lineTo(target.x, groundY);
        this.tamperFxGraphics.strokePath();

        this.tamperFxGraphics.fillStyle(0xe0f2fe, 0.95);
        this.tamperFxGraphics.fillCircle(target.x, groundY, 7);
        this.tamperFxGraphics.lineStyle(2, 0x38bdf8, 0.85);
        this.tamperFxGraphics.strokeEllipse(target.x, groundY + 2, 24, 10);
      });

      this.time.delayedCall(140, () => {
        if (this.tamperFxGraphics) this.tamperFxGraphics.clear();
      });
    }

    chosen.forEach(target => {
      if (!target || !target.active) return;
      this.damageEnemy(target, finalDmg);
    });

    AudioSys.tamperZap();
  },

  syncDrones(count) {
    while (this.drones.length < count) {
      const drone = this.add.sprite(this.player.x, this.player.y, 'drone').setDepth(getWorldEntityDepth(this.player.y, 7000));
      this.drones.push(drone);
    }
  },

  detonateBombDrop() {
    AudioSys.bombExplosion();
    this.cameras.main.shake(260, 0.018);
    this.cameras.main.flash(180, 255, 210, 120, false);
    this.addFloatingText(this.player.x, this.player.y - 26, '💥 ¡BOMBA DETONADA!', '#fb923c');

    const bombDamage = Math.round(165 * (1 + this.elapsedTime / 240));
    const snapshot = [...this.enemies.getChildren()];
    snapshot.forEach(enemy => {
      if (!enemy || !enemy.active) return;
      const eData = enemy.getData('enemy');
      if (!eData) return;
      const dmg = eData.isBoss ? Math.round(bombDamage * 0.55) : bombDamage;
      this.damageEnemy(enemy, dmg);
    });
  },

  onProjectileHit(proj, enemy) {
    if (!proj.active || !enemy.active) return;
    const pData = proj.getData('proj');
    if (!pData || pData.hitList.includes(enemy)) return;
    pData.hitList.push(enemy);

    this.damageEnemy(enemy, pData.damage);
    pData.pierce--;
    if (pData.pierce <= 0) proj.destroy();
  },

  // Temporizadores y disparo de todas las armas del jugador.
  updatePlayerWeapons(st, dt, enemies) {
    const globalRate = st.globalFirerateMult || 1;

    if (st.fusionActive) {
      if (st.domoFish) st.domoFish.enabled = false;
      st.fusionTimer = (st.fusionTimer ?? 0) - dt;
      if (st.fusionTimer <= 0) {
        const effectiveCd = Math.max(0.72, (st.fusionCooldown || 1.28) * Math.max(0.75, Math.min(1.2, st.weapon.cooldown)));
        st.fusionTimer = effectiveCd / globalRate;
        this.fireFusedPurpleLasers(st);
      }
    } else {
      st.weapon.timer -= dt * globalRate;
      if (st.weapon.timer <= 0) {
        st.weapon.timer = st.weapon.cooldown;
        this.fireBasicLaser(st, enemies);
      }

      if (st.domoFish && st.domoFish.enabled) {
        st.domoFish.timer = (st.domoFish.timer ?? 0) - dt * globalRate;
        if (st.domoFish.timer <= 0) {
          st.domoFish.timer = st.domoFish.baseCooldown || 3.2;
          this.fireDomoFish360(st);
        }
      }
    }

    if (st.tamper && st.tamper.enabled) {
      st.tamper.timer = (st.tamper.timer ?? 0) - dt * globalRate;
      if (st.tamper.timer <= 0) {
        st.tamper.timer = st.tamper.cooldown || 3.0;
        this.fireTamperAttack(st);
      }
    }

    if (st.commLoss && st.commLoss.enabled) {
      st.commLoss.timer = (st.commLoss.timer ?? 0) - dt * globalRate;
      if (st.commLoss.timer <= 0) {
        st.commLoss.timer = st.commLoss.cooldown || 11.5;
        this.fireCommLossAttack(st);
      }
    }
  },

  // Láser básico: un disparo hacia cada uno de los enemigos más cercanos (hasta projectileCount);
  // si hay menos enemigos que disparos, los sobrantes se abren en abanico.
  fireBasicLaser(st, enemies) {
    const maxLaserRange = 285;
    const count = st.weapon.projectileCount;
    const { targets } = this.findNearestEnemies(enemies, count, maxLaserRange, this.player.x, this.player.y);
    if (targets.length === 0) return;

    const globalDmg = st.globalDamageMult || 1;
    const primaryTarget = targets[0];
    const primaryAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 8, primaryTarget.x, primaryTarget.y);
    this.player.setFlipX(Math.cos(primaryAngle) < 0);
    const spread = 0.14;
    const finalLaserDmg = Math.max(1, Math.round(st.weapon.damage * globalDmg));

    for (let i = 0; i < count; i++) {
      let angle;
      if (i < targets.length) {
        const assignedEnemy = targets[i];
        angle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 8, assignedEnemy.x, assignedEnemy.y);
      } else {
        const overflowIdx = i - targets.length;
        angle = primaryAngle + (overflowIdx + 1) * spread * (overflowIdx % 2 === 0 ? 1 : -1);
      }
      const proj = this.projectiles.create(this.player.x, this.player.y - 8, 'laser').setDepth(getWorldEntityDepth(this.player.y, 6000));
      proj.setRotation(angle);
      proj.setVelocity(Math.cos(angle) * st.weapon.projectileSpeed, Math.sin(angle) * st.weapon.projectileSpeed);
      proj.setData('proj', { damage: finalLaserDmg, pierce: st.weapon.pierce, hitList: [] });
      this.time.delayedCall(900, () => { if (proj.active) proj.destroy(); });
    }
    AudioSys.shoot();
  },

  // Drones orbitales: posición y daño por contacto (cada enemigo tiene su propio enfriamiento).
  updateDrones(st, dt, enemies) {
    if (!st.dronesEnabled || st.orbitals <= 0) return;
    st.orbitalAngle += (st.droneOrbitSpeed || 2.1) * dt;
    const orbitR = st.droneOrbitRadius || 68;
    const droneDmg = Math.max(1, Math.round(14 * (st.globalDamageMult || 1)));
    const hitR = 26;
    const hitRSq = hitR * hitR;

    for (let idx = 0; idx < this.drones.length; idx++) {
      const drone = this.drones[idx];
      if (idx >= st.orbitals) {
        drone.setVisible(false);
        continue;
      }
      drone.setVisible(true);
      const a = st.orbitalAngle + (idx * Math.PI * 2) / st.orbitals;
      drone.x = this.player.x + Math.cos(a) * orbitR;
      drone.y = this.player.y - 6 + Math.sin(a) * orbitR;
      setDepthIfChanged(drone, getWorldEntityDepth(drone.y, 7000));

      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy.active) continue;
        // Descarte rápido por caja antes de calcular la distancia.
        const dx = enemy.x - drone.x;
        if (dx >= hitR || dx <= -hitR) continue;
        const dy = enemy.y - drone.y;
        if (dy >= hitR || dy <= -hitR) continue;
        if (dx * dx + dy * dy >= hitRSq) continue;
        const eData = enemy.getData('enemy');
        if (!eData || eData.hp <= 0) continue;
        // Contador propio (antes compartía orbCd con los orbes del jefe).
        eData.droneHitCd = (eData.droneHitCd ?? 0) - dt;
        if (eData.droneHitCd <= 0) {
          eData.droneHitCd = 0.35;
          this.damageEnemy(enemy, droneDmg);
        }
      }
    }
  }
};
