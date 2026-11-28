// @ts-nocheck
// Daño a enemigos y jugador, botín y recogida de objetos.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
import Phaser from '../../phaser.js?v=10';
import { AudioSys } from '../../audio.js?v=10';
import { getXpValueByTier } from '../../data/enemies.js?v=10';
import { getWorldEntityDepth, getReducedDamage, setDepthIfChanged } from '../../utils.js?v=10';

export const CombatMethods = {
  damageEnemy(enemy, dmg) {
    if (!enemy.active) return;
    const eData = enemy.getData('enemy');
    if (!eData) return;
    eData.hp -= dmg;

    if (eData.isBoss) {
      this.lastHitBossSprite = enemy;
    }

    // Parpadeo blanco de 70 ms. El fin lo gestiona updateEnemies() con eData.hitFlashTimer
    // (antes se creaba un temporizador nuevo por cada golpe).
    if (!(eData.hitFlashTimer > 0)) {
      if (typeof enemy.setTintMode === 'function' && Phaser.TintModes && Phaser.TintModes.FILL !== undefined) {
        enemy.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      } else {
        enemy.setTint(0xffffff);
      }
    }
    eData.hitFlashTimer = 0.07;

    AudioSys.hit();
    this.addDamageNumber(enemy.x, enemy.y - 16, `${dmg}`, '#fef08a');

    if (eData.hp <= 0) {
      const wasCorruptOperator = Boolean(eData.isCorruptOperator);
      if (this.lastHitBossSprite === enemy) {
        this.lastHitBossSprite = null;
      }

      this.kills++;
      if (eData.isBoss) this.bossKills++;
      this.score += eData.xp * 20;
      AudioSys.kill();

      if (wasCorruptOperator && this.inCraDimension) {
        enemy.destroy();
        this.exitCraDimension(true);
        return;
      }

      if (eData.isSupremeBoss) {
        const bx = enemy.x;
        const by = enemy.y;
        enemy.destroy();
        this.onSupremeBossDefeated(bx, by);
        return;
      }

      if (eData.isBoss) {
        // (El Coloso Supremo ya ha salido arriba con onSupremeBossDefeated.)
        const chestScrap = Phaser.Math.Between(12, 18);
        this.spawnBossLootChest(enemy.x, enemy.y, chestScrap);

        const xpDrop = this.rollXpTierDrop(eData);
        const bossXp = this.gems.create(enemy.x - 22, enemy.y + 8, 'bolt')
          .setDepth(getWorldEntityDepth(enemy.y + 8, -5))
          .setTint(xpDrop.tint)
          .setScale(xpDrop.scale);
        bossXp.setData('gem', {
          type: 'xp_tier',
          tier: xpDrop.tier,
          value: xpDrop.value
        });
      } else {
        const r = Math.random();
        if (r < 0.012) {
          const med = this.gems.create(enemy.x, enemy.y, 'medkit').setDepth(getWorldEntityDepth(enemy.y, -5));
          med.setData('gem', { type: 'medkit', value: 0 });
        } else if (r < 0.019) {
          const mag = this.gems.create(enemy.x, enemy.y, 'magnet_drop').setDepth(getWorldEntityDepth(enemy.y, -5));
          mag.setData('gem', { type: 'magnet_drop', value: 0 });
        } else if (r < 0.022) {
          const bmb = this.gems.create(enemy.x, enemy.y, 'bomb_drop').setDepth(getWorldEntityDepth(enemy.y, -5));
          bmb.setData('gem', { type: 'bomb_drop', value: 0 });
        } else if (r < 0.772) {
          const xpDrop = this.rollXpTierDrop(eData);
          const gem = this.gems.create(enemy.x, enemy.y, 'bolt')
            .setDepth(getWorldEntityDepth(enemy.y, -5))
            .setTint(xpDrop.tint)
            .setScale(xpDrop.scale);
          gem.setData('gem', {
            type: 'xp_tier',
            tier: xpDrop.tier,
            value: xpDrop.value
          });
        } else {
          const chapaTex = this.resolveCustomOrFallbackTexture('chapa', 'chapa_fallback');
          const scrap = this.gems.create(enemy.x, enemy.y, chapaTex)
            .setDepth(getWorldEntityDepth(enemy.y, -5))
            .setDisplaySize(16, 16);
          scrap.setData('gem', {
            type: 'scrap_chapa',
            value: 1
          });
        }
      }

      enemy.destroy();
    }
  },

  // Quita el parpadeo blanco y vuelve al tinte propio del enemigo (p. ej. élite rojo de la 3ª horda).
  restoreEnemyTint(enemy) {
    if (!enemy || !enemy.active) return;
    enemy.clearTint();
    const eData = enemy.getData('enemy');
    if (eData && eData.baseTint != null) enemy.setTint(eData.baseTint);
  },

  // Punto único para todo el daño que recibe el jugador: invulnerabilidad, reducción de daño,
  // feedback (temblor, sonido, texto) y muerte / expulsión de la sala CRA.
  damagePlayer(rawDamage, opts = {}) {
    if (this.gameState !== 'PLAYING') return false;
    const st = this.player.getData('stats');
    if (!st || st.invulnTimer > 0) return false;

    const dmg = getReducedDamage(st, rawDamage);
    st.hp -= dmg;
    st.invulnTimer = 0.5;
    this.cameras.main.shake(150, opts.shakeIntensity ?? 0.01);
    AudioSys.hurt();
    this.addFloatingText(this.player.x, this.player.y - 22, `-${dmg}`, opts.color || '#ef4444');

    if (st.hp <= 0) {
      if (this.inCraDimension) {
        this.exitCraDimension(false);
      } else {
        st.hp = 0;
        this.endGame();
      }
    }
    return true;
  },

  onPlayerHit(player, enemy) {
    const eData = enemy.getData('enemy');
    if (!eData) return;
    this.damagePlayer(eData.damage);
  },

  onEnemyProjectileHit(player, saw) {
    if (this.gameState !== 'PLAYING' || !saw || !saw.active) return;
    const st = player.getData('stats');
    const pData = saw.getData('enemyProj');
    if (!st || !pData) return;

    saw.destroy();
    this.damagePlayer(pData.damage || 18, { shakeIntensity: 0.012 });
  },

  rollXpTierDrop(eData) {
    const t = this.elapsedTime || 0;
    const st = this.player ? this.player.getData('stats') : null;
    const lvl = st ? (Number(st.level) || 1) : 1;

    if (eData.isBoss) {
      const bossTier = t < 120 ? 'yellow' : ((lvl >= 8 || t >= 240) ? 'red' : 'blue');
      const bossTint = bossTier === 'red' ? 0xef4444 : (bossTier === 'blue' ? 0x38bdf8 : 0xfacc15);
      return { tier: bossTier, tint: bossTint, scale: 1.35, value: getXpValueByTier(bossTier, eData.xp) };
    }

    if (t < 75) {
      return { tier: 'yellow', tint: 0xfacc15, scale: 1, value: getXpValueByTier('yellow', eData.xp) };
    }

    const r = Math.random();
    const canDropRed = lvl >= 6 || t >= 180;

    if (canDropRed) {
      const redChance = Math.min(0.14, 0.04 + Math.max(0, lvl - 6) * 0.01 + Math.max(0, t - 180) / 6000);
      if (r < redChance) {
        return { tier: 'red', tint: 0xef4444, scale: 1.25, value: getXpValueByTier('red', eData.xp) };
      }
    }

    const blueProgress = Math.min(1, (t - 75) / 150);
    const blueChance = 0.16 + blueProgress * 0.22;
    if (r < (canDropRed ? 0.07 : 0) + blueChance) {
      return { tier: 'blue', tint: 0x38bdf8, scale: 1.1, value: getXpValueByTier('blue', eData.xp) };
    }

    return { tier: 'yellow', tint: 0xfacc15, scale: 1, value: getXpValueByTier('yellow', eData.xp) };
  },

  onCollectGem(player, gem) {
    if (this.gameState !== 'PLAYING' || !gem.active) return;
    const st = player.getData('stats');
    const gData = gem.getData('gem');
    if (!st || !gData) return;

    gem.destroy();

    if (gData.type === 'boss_chest') {
      if (gData.beamTween) gData.beamTween.stop();
      if (gData.beamGfx) gData.beamGfx.destroy();
      const amount = Math.max(1, Number(gData.value) || 10);
      const healAmount = Math.max(15, Math.round(st.maxHp * 0.25));
      st.hp = Math.min(st.maxHp, st.hp + healAmount);
      this.runChapasCollected = (this.runChapasCollected || 0) + amount;
      this.score += amount * 35;
      AudioSys.chestPickup();
      this.cameras.main.flash(240, 250, 204, 21, false);
      this.cameras.main.shake(140, 0.008);
      this.playChestRewardCelebration(gem.x, gem.y, amount, healAmount);
    } else if (gData.type === 'scrap_chapa') {
      const amount = Math.max(1, Number(gData.value) || 1);
      this.runChapasCollected = (this.runChapasCollected || 0) + amount;
      this.score += amount * 25;
      AudioSys.scrapPickup();
      this.addFloatingText(player.x, player.y - 18, `+${amount} CHATARRA`, '#fde047');
    } else if (gData.type === 'bomb_drop') {
      this.detonateBombDrop();
    } else if (gData.type === 'magnet_drop') {
      this.gems.getChildren().forEach(otherGem => {
        if (!otherGem || !otherGem.active) return;
        const ogData = otherGem.getData('gem');
        if (!ogData || ogData.type === 'boss_chest') return;
        ogData.magnetPulled = true;
      });
      AudioSys.magnetPickup();
      this.addFloatingText(player.x, player.y - 20, '¡IMÁN ACTIVADO!', '#38bdf8');
    } else if (gData.type === 'medkit') {
      AudioSys.pickup();
      st.hp = Math.min(st.maxHp, st.hp + 25);
      this.addFloatingText(player.x, player.y - 18, '+25 PS', '#4ade80');
    } else {
      AudioSys.pickup();
      const gainedXp = Math.max(1, Math.round((gData.value || 5) * (st.xpValueMult || 1)));
      this.score += gainedXp * 10;
      if (gData.tier === 'red') {
        this.addFloatingText(player.x, player.y - 20, `+${gainedXp} XP ROJA!`, '#f87171');
      } else if (gData.tier === 'blue') {
        this.addFloatingText(player.x, player.y - 16, `+${gainedXp} XP`, '#38bdf8');
      }
      this.addXp(gainedXp);
    }
  },

  spawnBossLootChest(x, y, scrapAmount) {
    const chest = this.gems.create(x, y, 'boss_chest')
      .setDepth(getWorldEntityDepth(y, 5))
      .setScale(1.15);

    chest.setData('gem', {
      type: 'boss_chest',
      value: scrapAmount,
      beamGfx: null,
      beamTween: null
    });
    this.attachChestBeam(chest);
  },

  // Para el tween y destruye el haz de luz de un cofre (si lo tiene).
  destroyChestBeam(gem) {
    const gd = gem && gem.getData ? gem.getData('gem') : null;
    if (!gd) return;
    if (gd.beamTween) gd.beamTween.stop();
    if (gd.beamGfx) gd.beamGfx.destroy();
    gd.beamTween = null;
    gd.beamGfx = null;
  },

  // Crea (o recrea) el haz de luz pulsante de un cofre de jefe.
  attachChestBeam(chest) {
    const gd = chest.getData('gem');
    if (!gd) return;
    this.destroyChestBeam(chest);

    const beamGfx = this.add.graphics().setDepth(getWorldEntityDepth(chest.y, 4));
    const drawBeam = (pulse) => {
      if (!beamGfx || !beamGfx.scene) return;
      beamGfx.clear();
      const cx = chest.x;
      const cy = chest.y;
      beamGfx.fillStyle(0xf97316, 0.24 + pulse * 0.14);
      beamGfx.fillEllipse(cx, cy + 8, 42 + pulse * 8, 16 + pulse * 4);
      beamGfx.lineStyle(2, 0xfacc15, 0.85);
      beamGfx.strokeEllipse(cx, cy + 8, 38 + pulse * 6, 14 + pulse * 3);

      beamGfx.fillStyle(0xf97316, 0.22 + pulse * 0.1);
      beamGfx.fillRect(cx - 11, cy - 155, 22, 163);
      beamGfx.fillStyle(0xfacc15, 0.34 + pulse * 0.14);
      beamGfx.fillRect(cx - 5, cy - 175, 10, 183);
      beamGfx.fillStyle(0xfef9c3, 0.65 + pulse * 0.2);
      beamGfx.fillRect(cx - 2, cy - 190, 4, 198);
    };
    drawBeam(0.5);

    const beamTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 650,
      yoyo: true,
      repeat: -1,
      onUpdate: (tw) => {
        if (!chest.active) {
          beamGfx.destroy();
          tw.stop();
          return;
        }
        drawBeam(tw.getValue());
      }
    });

    gd.beamGfx = beamGfx;
    gd.beamTween = beamTween;
  },

  playChestRewardCelebration(cx, cy, scrapAmount, healAmount) {
    const chapaTex = this.resolveCustomOrFallbackTexture('chapa', 'chapa_fallback');
    const visualCount = Math.min(14, Math.max(8, Math.round(scrapAmount / 2)));

    // Onda expansiva dorada
    const ring = this.add.graphics().setDepth(getWorldEntityDepth(cy, 11500));
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 520,
      ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        if (!ring || !ring.scene) return;
        const t = tw.getValue();
        ring.clear();
        ring.lineStyle(3.5 * (1 - t * 0.6), 0xfacc15, 1 - t);
        ring.strokeCircle(this.player.x, this.player.y, 16 + t * 88);
        ring.lineStyle(2, 0xfef08a, (1 - t) * 0.85);
        ring.strokeCircle(this.player.x, this.player.y, 8 + t * 56);
      },
      onComplete: () => {
        if (ring) ring.destroy();
      }
    });

    // Fuente de chapas voladoras que salen del cofre y van hacia el jugador
    for (let i = 0; i < visualCount; i++) {
      const spreadAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
      const popDist = Phaser.Math.Between(36, 78);
      const peakX = cx + Math.cos(spreadAngle) * popDist;
      const peakY = cy + Math.sin(spreadAngle) * popDist - 18;

      const coin = this.add.image(cx, cy, chapaTex)
        .setDisplaySize(18, 18)
        .setDepth(getWorldEntityDepth(cy, 11600));

      this.tweens.add({
        targets: coin,
        x: peakX,
        y: peakY,
        scale: { from: 0.7, to: 1.25 },
        duration: 240 + i * 18,
        ease: 'Back.easeOut',
        onComplete: () => {
          if (!coin || !coin.scene) return;
          this.tweens.add({
            targets: coin,
            x: this.player.x,
            y: this.player.y - 10,
            alpha: { from: 1, to: 0.2 },
            scale: 0.75,
            duration: 240,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              if (coin) coin.destroy();
            }
          });
        }
      });
    }

    // Carteles escalonados de recompensa
    this.addFloatingText(this.player.x, this.player.y - 34, `🧰 ¡BOTÍN DEL COFRE! +${scrapAmount} CHATARRA`, '#facc15');
    this.time.delayedCall(220, () => {
      if (this.player && this.player.active) {
        this.addFloatingText(this.player.x, this.player.y - 50, `❤️ +${healAmount} PS RESTAURADOS`, '#4ade80');
      }
    });
    this.time.delayedCall(420, () => {
      if (this.player && this.player.active) {
        this.addFloatingText(this.player.x, this.player.y - 66, `⭐ +${scrapAmount * 35} PTS`, '#38bdf8');
      }
    });
  },

  // Gemas y objetos del suelo: atracción hacia el jugador (radio de recogida o imán) y recogida.
  // Sustituye a la física de Arcade con el mismo comportamiento:
  //  · Se mueven a 230 px/s (410 con imán) hacia el jugador, igual que con setVelocity.
  //  · Se recogen cuando el círculo de colisión del jugador (radio 12) toca la caja de la gema,
  //    la misma prueba que hacía Arcade (punto más cercano de la caja dentro del círculo).
  updateGems(st, dt) {
    const player = this.player;
    const pb = player.body;
    // Centro y radio del círculo de colisión del jugador, calculados desde el sprite.
    const pcx = player.x + player.scaleX * (pb.offset.x - player.displayOriginX) + pb.halfWidth;
    const pcy = player.y + player.scaleY * (pb.offset.y - player.displayOriginY) + pb.halfHeight;
    const pr = pb.halfWidth;
    const prSq = pr * pr;

    const px = player.x;
    const py = player.y;
    const rangeSq = st.pickupRange * st.pickupRange;
    const gems = this.gems.getChildren();
    const touched = this._touchedGems || (this._touchedGems = []);
    touched.length = 0;

    for (let i = 0; i < gems.length; i++) {
      const gem = gems[i];
      if (!gem.active) continue;
      const gData = gem.getData('gem');
      if (gData && gData.type === 'boss_chest') {
        setDepthIfChanged(gem, getWorldEntityDepth(gem.y, 5));
        if (gData.beamGfx) setDepthIfChanged(gData.beamGfx, getWorldEntityDepth(gem.y, 4));
      } else {
        const dx = px - gem.x;
        const dy = py - gem.y;
        const distSq = dx * dx + dy * dy;
        const isMagnetPulled = Boolean(gData && gData.magnetPulled);
        if ((isMagnetPulled || distSq < rangeSq) && distSq > 1) {
          const pullSpeed = isMagnetPulled ? 410 : 230;
          const step = (pullSpeed * dt) / Math.sqrt(distSq);
          gem.x += dx * step;
          gem.y += dy * step;
        }
        setDepthIfChanged(gem, getWorldEntityDepth(gem.y, -5));
      }

      // ¿Toca al jugador? (caja de la gema según su tamaño en pantalla, centrada en su posición)
      const hw = gem.displayWidth * 0.5;
      const hh = gem.displayHeight * 0.5;
      const qx = pcx < gem.x - hw ? gem.x - hw : (pcx > gem.x + hw ? gem.x + hw : pcx);
      const qy = pcy < gem.y - hh ? gem.y - hh : (pcy > gem.y + hh ? gem.y + hh : pcy);
      const ox = pcx - qx;
      const oy = pcy - qy;
      if (ox * ox + oy * oy <= prSq) touched.push(gem);
    }

    // Se recogen después del recorrido: recoger puede destruir gemas o crear otras (bomba).
    for (let i = 0; i < touched.length; i++) {
      if (touched[i].active) this.onCollectGem(player, touched[i]);
    }
    touched.length = 0;
  }
};
