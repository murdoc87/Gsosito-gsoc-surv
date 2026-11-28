// @ts-nocheck
// Aparición de enemigos, proyectiles enemigos y hordas.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
import { AudioSys } from '../../audio.js?v=10';
import { pickEnemySpawnConfig } from '../../data/enemies.js?v=10';
import Phaser from '../../phaser.js?v=10';
import { getEnemyDepth, applyEnemyFacing, setDepthIfChanged } from '../../utils.js?v=10';

export const EnemyMethods = {
  computeCutOffSpawnPosition(slotIndex = 0, totalSlots = 1) {
    const dist = Math.hypot(this.scale.width / 2, this.scale.height / 2) + 55;
    const pVx = this.player?.body?.velocity?.x || 0;
    const pVy = this.player?.body?.velocity?.y || 0;
    const moving = Math.hypot(pVx, pVy) > 12;

    const headingAngle = moving
      ? Math.atan2(pVy, pVx)
      : (this.isLookingLeft ? Math.PI : 0);

    const cutOff = Math.random() < 0.65;
    const baseAngle = cutOff ? headingAngle : Math.random() * Math.PI * 2;
    const spreadArc = cutOff ? 1.15 : Math.PI * 2;
    const offset = totalSlots > 1
      ? ((slotIndex / (totalSlots - 1)) - 0.5) * spreadArc
      : (Math.random() - 0.5) * spreadArc;

    const finalAngle = baseAngle + offset;
    return {
      x: this.player.x + Math.cos(finalAngle) * dist,
      y: this.player.y + Math.sin(finalAngle) * dist
    };
  },

  spawnBlockingFormation(count = 4, isSupreme = false) {
    const steps = Math.max(2, count);
    for (let i = 0; i < steps; i++) {
      const pos = this.computeCutOffSpawnPosition(i, steps);
      this.spawnEnemy(false, false, pos.x, pos.y, isSupreme ? 1.15 : 1);
    }
  },

  spawnEnemy(forceBoss = false, isSupremeColossus = false, customX = null, customY = null, hpScale = 1, eliteOpts = null) {
    const pos = (typeof customX === 'number' && typeof customY === 'number')
      ? { x: customX, y: customY }
      : this.computeCutOffSpawnPosition(0, 1);
    const ex = pos.x;
    const ey = pos.y;
    const diff = 1 + this.elapsedTime / 270;

    if (forceBoss) {
      this.bossSpawnCount = (this.bossSpawnCount || 0) + 1;

      if (!isSupremeColossus) {
        const truckKey = this.getTolcrapBaseTexture();
        const boss = this.enemies.create(ex, ey, truckKey).setDepth(getEnemyDepth({ y: ey }, true));
        this.syncTolcrapHitbox(boss, 'side');
        const maxHp = Math.round(2150 * Math.max(1, diff));

        boss.setData('enemy', {
          name: 'MINI BOSS · TOLCRAP',
          hp: maxHp,
          maxHp,
          speed: 45,
          damage: 32,
          xp: 140,
          isBoss: true,
          isMiniBoss: true,
          isTolcrap: true,
          facingLeftByDefault: false,
          sawTimer: 1.4,
          giantSawTimer: 2.3,
          orbCd: 0
        });

        this.lastHitBossSprite = boss;
        AudioSys.hordeAlert();
        this.addFloatingText(this.player.x, this.player.y - 38, '⚠️ MINI BOSS: TOLCRAP HA APARECIDO!', '#facc15');
        return;
      }

      const boss = this.enemies.create(ex, ey, 'boss_0').setDepth(getEnemyDepth({ y: ey }, true));
      boss.setScale(1.65);
      boss.body.setCircle(22, 6, 10);
      const maxHp = Math.round(2800 * Math.max(1, diff));

      boss.setData('enemy', {
        name: 'BOSS · COLOSO SUPREMO',
        hp: maxHp,
        maxHp,
        speed: 46,
        damage: 38,
        xp: 260,
        isBoss: true,
        isSupremeBoss: true,
        isWastelandBoss: true,
        facingLeftByDefault: false,
        purpleOrbTimer: 1.4,
        supremePatternIdx: 0,
        supremeSpiralAngle: 0,
        orbCd: 0
      });

      this.lastHitBossSprite = boss;
      AudioSys.hordeAlert();
      this.cameras.main.shake(220, 0.012);
      this.addFloatingText(this.player.x, this.player.y - 40, '🔥 ¡BOSS COLOSO SUPREMO!', '#e879f9');
      return;
    }

    const baseCfg = pickEnemySpawnConfig(this.elapsedTime, Math.random());
    const cfg = { ...baseCfg, hp: baseCfg.hp * diff * hpScale };

    const speedMult = eliteOpts?.speedMult || 1;
    const dmgMult = eliteOpts?.dmgMult || 1;
    const finalSpeed = Math.round(cfg.speed * speedMult);
    const finalDamage = Math.round(cfg.damage * dmgMult);

    const spriteScale = cfg.scale || 1;
    const enemy = this.enemies.create(ex, ey, `${cfg.key}_0`).setDepth(getEnemyDepth({ y: ey }, false));
    enemy.play(`${cfg.key}_walk`);
    enemy.setScale(spriteScale);
    if (eliteOpts?.tint) {
      enemy.setTint(eliteOpts.tint);
    }
    enemy.body.setCircle(cfg.radius);

    enemy.setData('enemy', {
      hp: cfg.hp,
      maxHp: cfg.hp,
      speed: finalSpeed,
      damage: finalDamage,
      xp: cfg.xp,
      isBoss: false,
      facingLeftByDefault: Boolean(cfg.facingLeftByDefault),
      baseTint: eliteOpts?.tint ?? null,
      orbCd: 0
    });
  },

  // Crea un proyectil enemigo que viaja en línea recta y se autodestruye tras lifeMs.
  // opts: depth, scale, tint, bodyCircle [radio, offX, offY], angularVelocity.
  spawnEnemyProjectile(x, y, texKey, angle, speed, damage, lifeMs, opts = {}) {
    const proj = this.enemyProjectiles.create(x, y, texKey);
    if (opts.depth != null) proj.setDepth(opts.depth);
    if (opts.scale != null) proj.setScale(opts.scale);
    if (opts.tint != null) proj.setTint(opts.tint);
    if (opts.bodyCircle) proj.body.setCircle(...opts.bodyCircle);
    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    if (opts.angularVelocity) proj.setAngularVelocity(opts.angularVelocity);
    proj.setData('enemyProj', { damage });
    this.time.delayedCall(lifeMs, () => { if (proj && proj.active) proj.destroy(); });
    return proj;
  },

  triggerFirstHordeEvent() {
    if (this.horde1Triggered) return;
    this.horde1Triggered = true;
    this.hordeTier = 1;
    this.hordeActiveTimer = 36;

    AudioSys.hordeAlert();
    this.showHordeBanner('⚠️ ¡PRIMERA HORDA DE ENEMIGOS! ⚠️', '#f97316');

    this.spawnBlockingFormation(12, false);
    for (let i = 0; i < 8; i++) {
      this.spawnEnemy(false, false, null, null, 1.0);
    }
  },

  triggerSecondHordeEvent() {
    if (this.horde2Triggered) return;
    this.horde2Triggered = true;
    this.hordeTier = 2;
    this.hordeActiveTimer = 46;

    AudioSys.hordeAlert();
    this.cameras.main.shake(220, 0.012);
    this.showHordeBanner('🔥 ¡SEGUNDA HORDA MASIVA EN CAMINO! 🔥', '#ef4444');

    this.spawnBlockingFormation(18, true);
    for (let i = 0; i < 16; i++) {
      this.spawnEnemy(false, false, null, null, 1.25);
    }
  },

  triggerThirdDeadlyHordeEvent() {
    if (this.horde3Triggered) return;
    this.horde3Triggered = true;
    this.hordeTier = 3;
    this.hordeActiveTimer = 9999;

    AudioSys.hordeAlert();
    this.cameras.main.shake(320, 0.016);
    this.cameras.main.flash(240, 220, 38, 38, false);
    this.showHordeBanner('💀 ¡TERCERA HORDA MORTAL LIBERADA! 💀', '#dc2626');

    this.spawnDeadlyWave(26);
    // La segunda oleada se cuenta en update() para que respete pausas y tickets.
    this.horde3SecondWaveTimer = 2.5;
  },

  spawnDeadlyWave(count) {
    for (let i = 0; i < count; i++) {
      const pos = this.computeCutOffSpawnPosition(i, count);
      this.spawnEnemy(false, false, pos.x, pos.y, 1.75, {
        speedMult: 1.42,
        dmgMult: 1.45,
        tint: 0xfca5a5
      });
    }
  },

  // Aparición continua de enemigos según el tiempo y la horda activa.
  updateEnemySpawning(dt) {
    if (this.inCraDimension || this.levelCleared) return;
    const baseSpawnInterval = Math.max(0.45, 1.35 - this.elapsedTime / 280);
    const hordeIntervalMult = this.hordeTier === 3 ? 0.25 : (this.hordeTier === 2 ? 0.36 : (this.hordeTier === 1 ? 0.55 : 1));
    const spawnInterval = baseSpawnInterval * hordeIntervalMult;
    const maxActiveEnemies = this.hordeTier === 3 ? 165 : (this.hordeTier === 2 ? 125 : (this.hordeTier === 1 ? 95 : 70));

    this.spawnTimer += dt;
    if (this.spawnTimer < spawnInterval) return;
    // countActive() recorre todo el grupo: se cuenta una vez y se lleva la cuenta a mano.
    let activeCount = this.enemies.countActive(true);
    if (activeCount >= maxActiveEnemies) return;

    this.spawnTimer = 0;
    const burst = this.hordeTier === 3 ? 4 : (this.hordeTier === 2 ? 3 : (this.hordeTier === 1 ? 2 : 1));
    const hpMult = this.hordeTier === 3 ? 1.7 : (this.hordeTier === 2 ? 1.15 : 1);
    const eliteOpts = this.hordeTier === 3 ? { speedMult: 1.38, dmgMult: 1.4, tint: 0xfca5a5 } : null;
    for (let b = 0; b < burst && activeCount < maxActiveEnemies; b++) {
      this.spawnEnemy(false, false, null, null, hpMult, eliteOpts);
      activeCount++;
    }
  },

  // Lista de enemigos activos del frame. Se reutiliza el mismo array en cada frame (sin crear
  // basura para el recolector). Ojo: un enemigo puede morir a mitad de frame, por eso los
  // bucles que la usan comprueban enemy.active.
  collectActiveEnemies() {
    const list = this._frameEnemies || (this._frameEnemies = []);
    list.length = 0;
    const children = this.enemies.getChildren();
    for (let i = 0; i < children.length; i++) {
      const e = children[i];
      if (e && e.active) list.push(e);
    }
    return list;
  },

  // Los `count` enemigos vivos más cercanos a (px, py) dentro de maxRange, ordenados por
  // distancia, y cuántos hay en rango en total. Da el mismo resultado que filtrar y ordenar
  // toda la lista (empates incluidos), pero sin ordenarla entera ni calcular raíces cuadradas.
  findNearestEnemies(enemies, count, maxRange, px, py) {
    const maxSq = maxRange * maxRange;
    const targets = [];
    const dists = [];
    let inRange = 0;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const d = e.getData('enemy');
      if (!d || d.hp <= 0) continue;
      const dx = e.x - px;
      const dy = e.y - py;
      const dsq = dx * dx + dy * dy;
      if (dsq > maxSq) continue;
      inRange++;
      if (count <= 0) continue;
      if (targets.length === count && dsq >= dists[count - 1]) continue;
      let pos = targets.length;
      while (pos > 0 && dists[pos - 1] > dsq) pos--;
      targets.splice(pos, 0, e);
      dists.splice(pos, 0, dsq);
      if (targets.length > count) {
        targets.pop();
        dists.pop();
      }
    }
    return { targets, inRange };
  },

  // Movimiento, ataques de jefes, aturdimiento, parpadeo de golpe y barras de vida de los enemigos.
  updateEnemies(time, dt, enemies) {
    if (this.stunFxGraphics) this.stunFxGraphics.clear();
    if (this.enemyHpBarsGraphics) this.enemyHpBarsGraphics.clear();

    const camView = this.cameras?.main?.worldView;
    const cullPad = 60;
    const viewMinX = camView ? camView.x - cullPad : -Infinity;
    const viewMaxX = camView ? camView.right + cullPad : Infinity;
    const viewMinY = camView ? camView.y - cullPad : -Infinity;
    const viewMaxY = camView ? camView.bottom + cullPad : Infinity;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.active) continue;
      const eData = enemy.getData('enemy');
      if (!eData) continue;

      // Fin del parpadeo blanco de golpe (antes era un temporizador nuevo por cada golpe).
      if (eData.hitFlashTimer > 0) {
        eData.hitFlashTimer -= dt;
        if (eData.hitFlashTimer <= 0) {
          eData.hitFlashTimer = 0;
          this.restoreEnemyTint(enemy);
        }
      }

      if (eData.stunTimer && eData.stunTimer > 0) {
        eData.stunTimer = Math.max(0, eData.stunTimer - dt);
        enemy.setVelocity(0, 0);
        // Las zonas ya lanzadas por el Operador siguen su curso aunque esté aturdido.
        if (eData.isCorruptOperator && !this.updateCorruptAreaZones(enemy, dt)) continue;
        this.drawStunIcon(enemy, eData, time);
      } else if (eData.isCorruptOperator) {
        this.updateCorruptOperatorAttacks(enemy, eData, dt);
        if (!enemy.active) continue;
        if (!this.corruptDashState) {
          const vx = this.steerEnemyTowards(enemy, eData.speed, this.player.x, this.player.y);
          applyEnemyFacing(enemy, vx, eData.facingLeftByDefault);
        }
        if (this.dimensionRoomBounds) {
          const b = this.dimensionRoomBounds;
          enemy.x = Phaser.Math.Clamp(enemy.x, b.minX + 12, b.maxX - 12);
          enemy.y = Phaser.Math.Clamp(enemy.y, b.minY + 12, b.maxY - 12);
        }
      } else {
        const vx = this.steerEnemyTowards(enemy, eData.speed, this.player.x, this.player.y);

        if (eData.isTolcrap) {
          this.applyTolcrapDirectionSprite(enemy, vx, enemy.body.velocity.y);
          eData.sawTimer = (eData.sawTimer ?? 1.4) - dt;
          if (eData.sawTimer <= 0) {
            eData.sawTimer = 2.6;
            this.fireTolcrapSaw(enemy);
          }
          eData.giantSawTimer = (eData.giantSawTimer ?? 2.3) - dt;
          if (eData.giantSawTimer <= 0) {
            eData.giantSawTimer = Phaser.Math.FloatBetween(2.4, 4.4);
            this.fireTolcrapGiantSaw(enemy);
          }
        } else if (eData.isWastelandBoss) {
          applyEnemyFacing(enemy, vx, eData.facingLeftByDefault);
          eData.purpleOrbTimer = (eData.purpleOrbTimer ?? 1.4) - dt;
          if (eData.purpleOrbTimer <= 0) {
            eData.purpleOrbTimer = 2.45;
            this.fireWastelandBossPurpleOrbs(enemy);
          }
        } else {
          applyEnemyFacing(enemy, vx, eData.facingLeftByDefault);
        }
      }

      if (!enemy.active) continue;
      const enemyDepth = getEnemyDepth(enemy, Boolean(eData.isBoss));
      setDepthIfChanged(enemy, enemyDepth);

      if (this.enemyHpBarsGraphics && eData.hp > 0 && (eData.isBoss || eData.hp < eData.maxHp) &&
          enemy.x >= viewMinX && enemy.x <= viewMaxX && enemy.y >= viewMinY && enemy.y <= viewMaxY) {
        const bw = eData.isBoss ? 52 : 26;
        const bh = eData.isBoss ? 6 : 4;
        const yOffset = eData.isBoss ? 36 : 22;
        const bx = Math.round(enemy.x - bw / 2);
        const by = Math.round(enemy.y - yOffset);
        const pct = Math.max(0, Math.min(1, eData.hp / eData.maxHp));
        this.enemyHpBarsGraphics.fillStyle(0x000000, 0.75);
        this.enemyHpBarsGraphics.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        this.enemyHpBarsGraphics.fillStyle(eData.isBoss ? 0xa855f7 : 0xef4444, 1);
        this.enemyHpBarsGraphics.fillRect(bx, by, Math.round(bw * pct), bh);
      }

      if (eData.isBoss && !eData.isTolcrap && !eData.isSupremeBoss) {
        eData.orbCd -= dt;
        if (eData.orbCd <= 0) {
          eData.orbCd = 2.4;
          const orbAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          this.spawnEnemyProjectile(enemy.x, enemy.y, 'bolt', orbAngle, 165, Math.max(12, Math.round((eData.damage || 30) * 0.55)), 3500, {
            depth: enemyDepth + 2,
            tint: 0xe879f9,
            scale: 1.15
          });
        }
      }
    }
  },

  // Mueve el enemigo hacia (tx, ty) a `speed`. Igual que cos/sin del ángulo, pero sin trigonometría.
  // Devuelve la velocidad horizontal (para orientar el sprite).
  steerEnemyTowards(enemy, speed, tx, ty) {
    const dx = tx - enemy.x;
    const dy = ty - enemy.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    // Con distancia 0, atan2(0, 0) = 0: el original movía hacia la derecha. Se conserva.
    const vx = len > 0 ? (dx / len) * speed : speed;
    const vy = len > 0 ? (dy / len) * speed : 0;
    enemy.setVelocity(vx, vy);
    return vx;
  },

  drawStunIcon(enemy, eData, time) {
    if (!this.stunFxGraphics) return;
    const g = this.stunFxGraphics;
    const pulse = 0.72 + 0.28 * Math.sin((time || 0) * 0.014);
    const bob = Math.sin((time || 0) * 0.008) * 2;
    const iconY = Math.round(enemy.y - (eData.isBoss ? 54 : 34) + bob);
    const iconX = Math.round(enemy.x);

    g.fillStyle(0x090d14, 0.9 * pulse);
    g.fillRoundedRect(iconX - 13, iconY - 11, 26, 20, 4);
    g.lineStyle(1.5, 0x38bdf8, 0.95 * pulse);
    g.strokeRoundedRect(iconX - 13, iconY - 11, 26, 20, 4);

    g.fillStyle(0x94a3b8, 0.9 * pulse);
    g.fillRect(iconX - 8, iconY + 2, 3, 4);
    g.fillRect(iconX - 3, iconY - 1, 3, 7);
    g.fillStyle(0x475569, 0.8 * pulse);
    g.fillRect(iconX + 2, iconY - 4, 3, 10);
    g.fillRect(iconX + 7, iconY - 7, 3, 13);

    g.lineStyle(2.4, 0xef4444, pulse);
    g.beginPath();
    g.moveTo(iconX - 10, iconY + 7);
    g.lineTo(iconX + 10, iconY - 9);
    g.strokePath();

    g.fillStyle(0xfacc15, pulse);
    g.fillCircle(iconX - 8, iconY - 6, 2);
  }
};
