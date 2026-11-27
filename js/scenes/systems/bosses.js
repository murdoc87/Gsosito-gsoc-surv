// @ts-nocheck
// Jefes: Tolcrap, Coloso Supremo y Operador Corrupto; puerta de salida.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
import Phaser from '../../phaser.js?v=8';
import { AudioSys } from '../../audio.js?v=8';
import { getWorldEntityDepth, getEnemyDepth, getDpr } from '../../utils.js?v=8';

export const BossMethods = {
  getTolcrapBaseTexture() {
    if (this.hasValidTexture('tolcrap_side')) return 'tolcrap_side';
    if (this.hasValidTexture('tolcrap_custom')) return 'tolcrap_custom';
    return 'tolcrap_boss';
  },

  syncTolcrapHitbox(boss, mode = 'side') {
    if (!boss || !boss.body) return;
    const w = boss.width || 112;
    const h = boss.height || 64;

    if (mode === 'vertical') {
      const bw = Math.max(24, Math.round(w * 0.55));
      const bh = Math.max(24, Math.round(h * 0.72));
      const ox = Math.round((w - bw) / 2);
      const oy = Math.round((h - bh) / 2) + 4;
      boss.body.setSize(bw, bh);
      boss.body.setOffset(ox, oy);
    } else {
      const bw = Math.max(24, Math.round(w * 0.82));
      const bh = Math.max(24, Math.round(h * 0.65));
      const ox = Math.round((w - bw) / 2);
      const oy = Math.round((h - bh) / 2) + 4;
      boss.body.setSize(bw, bh);
      boss.body.setOffset(ox, oy);
    }
  },

  applyTolcrapDirectionSprite(boss, vx, vy) {
    const rightKey = this.hasValidTexture('tolcrap_side')
      ? 'tolcrap_side'
      : this.getTolcrapBaseTexture();
    const leftKey = this.hasValidTexture('tolcrap_custom')
      ? 'tolcrap_custom'
      : rightKey;
    const upKey = this.hasValidTexture('tolcrap_up') ? 'tolcrap_up' : rightKey;
    const downKey = this.hasValidTexture('tolcrap_down') ? 'tolcrap_down' : rightKey;

    if (Math.abs(vy) > Math.abs(vx)) {
      const nextKey = vy < 0 ? upKey : downKey;
      if (boss.texture.key !== nextKey) boss.setTexture(nextKey);
      boss.setFlipX(false);
      this.syncTolcrapHitbox(boss, 'vertical');
    } else if (vx < 0) {
      if (boss.texture.key !== leftKey) boss.setTexture(leftKey);
      boss.setFlipX(!this.hasValidTexture('tolcrap_custom'));
      this.syncTolcrapHitbox(boss, 'side');
    } else {
      if (boss.texture.key !== rightKey) boss.setTexture(rightKey);
      boss.setFlipX(false);
      this.syncTolcrapHitbox(boss, 'side');
    }
  },

  fireTolcrapSaw(boss) {
    if (!boss || !boss.active || !this.player || !this.player.active) return;
    const eData = boss.getData('enemy');
    const sawDmg = Math.max(12, Math.round((eData?.damage || 30) * 0.65));
    const speed = 245;
    const count = 3;
    const spread = 0.22;
    const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i - (count - 1) / 2) * spread;
      const spawnX = boss.x + Math.cos(angle) * 24;
      const spawnY = boss.y + Math.sin(angle) * 24;

      this.spawnEnemyProjectile(spawnX, spawnY, 'tolcrap_saw', angle, speed, sawDmg, 3400, {
        depth: getEnemyDepth(boss, true) + 2,
        bodyCircle: [9, 2, 2],
        angularVelocity: 580
      });
    }

    AudioSys.sawShoot();
  },

  fireTolcrapGiantSaw(boss) {
    if (!boss || !boss.active || !this.player || !this.player.active) return;
    const eData = boss.getData('enemy');
    const giantDmg = Math.max(20, Math.round((eData?.damage || 32) * 1.05));
    const speed = Phaser.Math.Between(185, 225);
    const toPlayer = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
    const randomOffset = (Math.random() - 0.5) * 0.75;
    const angle = toPlayer + randomOffset;
    const spawnX = boss.x + Math.cos(angle) * 28;
    const spawnY = boss.y + Math.sin(angle) * 28;

    this.spawnEnemyProjectile(spawnX, spawnY, 'tolcrap_saw', angle, speed, giantDmg, 4200, {
      depth: getEnemyDepth(boss, true) + 3,
      scale: 2.15,
      tint: 0xfca5a5,
      bodyCircle: [10, 1, 1],
      angularVelocity: 420
    });

    AudioSys.sawShoot();
  },

  fireWastelandBossPurpleOrbs(boss) {
    if (!boss || !boss.active || !this.player || !this.player.active) return;
    const eData = boss.getData('enemy');
    const orbDmg = Math.max(15, Math.round((eData?.damage || 38) * 0.68));
    const pattern = (eData.supremePatternIdx || 0) % 4;
    eData.supremePatternIdx = (eData.supremePatternIdx || 0) + 1;

    // Pulso visual morado en el boss al ejecutar un patrón
    boss.setTint(0xd8b4fe);
    this.time.delayedCall(150, () => { if (boss && boss.active) boss.clearTint(); });

    if (pattern === 0) {
      // Patrón 1: Nova radial morada de 360° (14 orbes)
      const count = 14;
      const offset = (eData.supremeSpiralAngle || 0);
      eData.supremeSpiralAngle = offset + 0.22;
      for (let i = 0; i < count; i++) {
        const a = offset + (Math.PI * 2 * i) / count;
        this.spawnEnemyProjectile(boss.x + Math.cos(a) * 28, boss.y + Math.sin(a) * 28, 'purple_orb', a, 185, orbDmg, 4000, {
          depth: getEnemyDepth(boss, true) + 2,
          scale: 1.12,
          bodyCircle: [6, 2, 2]
        });
      }
      this.addFloatingText(boss.x, boss.y - 44, '🔮 ¡NOVA DEL VACÍO!', '#d8b4fe');
      AudioSys.bossOrbShoot();
    } else if (pattern === 1) {
      // Patrón 2: Doble ráfaga dirigida en abanico morado
      const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
      [0, 1].forEach((wave) => {
        this.time.delayedCall(wave * 240, () => {
          if (!boss || !boss.active || this.gameState !== 'PLAYING') return;
          const count = wave === 0 ? 5 : 6;
          const spread = 0.21;
          for (let i = 0; i < count; i++) {
            const a = baseAngle + (i - (count - 1) / 2) * spread;
            this.spawnEnemyProjectile(boss.x + Math.cos(a) * 28, boss.y + Math.sin(a) * 28, 'purple_orb', a, 225, orbDmg, 3800, {
              depth: getEnemyDepth(boss, true) + 2,
              tint: 0xe879f9,
              scale: 1.18,
              bodyCircle: [6, 2, 2]
            });
          }
          AudioSys.bossOrbShoot();
        });
      });
      this.addFloatingText(boss.x, boss.y - 44, '⚡ ¡ANDANADA ABISAL!', '#c084fc');
    } else if (pattern === 2) {
      // Patrón 3: Espiral morada giratoria en 3 brazos
      const arms = 3;
      const steps = 5;
      for (let s = 0; s < steps; s++) {
        this.time.delayedCall(s * 110, () => {
          if (!boss || !boss.active || this.gameState !== 'PLAYING') return;
          eData.supremeSpiralAngle = (eData.supremeSpiralAngle || 0) + 0.34;
          for (let arm = 0; arm < arms; arm++) {
            const a = eData.supremeSpiralAngle + (arm * Math.PI * 2) / arms;
            this.spawnEnemyProjectile(boss.x + Math.cos(a) * 26, boss.y + Math.sin(a) * 26, 'purple_orb', a, 195, Math.max(12, Math.round(orbDmg * 0.85)), 3900, {
              depth: getEnemyDepth(boss, true) + 2,
              tint: 0xa855f7,
              scale: 1.08,
              bodyCircle: [6, 2, 2]
            });
          }
          AudioSys.bossOrbShoot();
        });
      }
      this.addFloatingText(boss.x, boss.y - 44, '🌀 ¡VÓRTICE MORADO!', '#e879f9');
    } else {
      // Patrón 4: Cargas gravitatorias moradas telegrafiadas sobre la zona del jugador
      const targets = [
        { x: this.player.x, y: this.player.y },
        { x: this.player.x + Phaser.Math.Between(-95, 95), y: this.player.y + Phaser.Math.Between(-95, 95) },
        { x: this.player.x + Phaser.Math.Between(-110, 110), y: this.player.y + Phaser.Math.Between(-110, 110) }
      ];
      targets.forEach((pt) => {
        const warnGfx = this.add.graphics().setDepth(getWorldEntityDepth(pt.y, -10));
        const radius = 56;
        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 950,
          onUpdate: (tw) => {
            if (!warnGfx || !warnGfx.scene) return;
            const p = tw.getValue();
            warnGfx.clear();
            warnGfx.fillStyle(0x7e22ce, 0.14 + p * 0.24);
            warnGfx.fillCircle(pt.x, pt.y, radius);
            warnGfx.lineStyle(2.5, 0xc084fc, 0.9);
            warnGfx.strokeCircle(pt.x, pt.y, radius);
            warnGfx.lineStyle(2, 0xf3e8ff, 0.85);
            warnGfx.strokeCircle(pt.x, pt.y, radius * p);
          },
          onComplete: () => this.detonateSingularity(pt, radius, orbDmg, warnGfx)
        });
      });
      this.addFloatingText(boss.x, boss.y - 44, '☄️ ¡SINGULARIDAD MORADA!', '#c084fc');
    }
  },

  // Detonación de una carga de la Singularidad. Si coincide con un ticket o el modal de fusión,
  // se aplaza con this.time (que está pausado en esos estados) en vez de perderse.
  detonateSingularity(pt, radius, orbDmg, warnGfx) {
    if (this.levelCleared || !this.isInActiveRun() || this.gameState === 'VICTORY') {
      if (warnGfx) warnGfx.destroy();
      return;
    }
    if (this.gameState !== 'PLAYING') {
      this.time.delayedCall(1, () => this.detonateSingularity(pt, radius, orbDmg, warnGfx));
      return;
    }
    if (warnGfx) warnGfx.destroy();

    AudioSys.bossOrbShoot();
    this.cameras.main.shake(110, 0.008);

    // Detonación morada visual + fragmentos
    const blast = this.add.graphics().setDepth(getWorldEntityDepth(pt.y, 100));
    blast.fillStyle(0xa855f7, 0.55);
    blast.fillCircle(pt.x, pt.y, radius);
    blast.lineStyle(3, 0xf3e8ff, 0.95);
    blast.strokeCircle(pt.x, pt.y, radius);
    this.tweens.add({
      targets: blast,
      alpha: 0,
      duration: 260,
      onComplete: () => blast.destroy()
    });

    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, pt.x, pt.y) <= radius + 8) {
      this.damagePlayer(Math.round(orbDmg * 1.15), { color: '#c084fc' });
    }
  },

  onSupremeBossDefeated(bossX, bossY) {
    if (this.levelCleared) return;
    this.levelCleared = true;
    this.hordeActiveTimer = 0;
    this.hordeTier = 0;

    this.enemies.getChildren().forEach(e => {
      if (!e || !e.active) return;
      this.addFloatingText(e.x, e.y - 10, '💥', '#facc15');
    });
    this.enemies.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    this.lastHitBossSprite = null;

    this.victoryFireworksActive = true;
    this.victoryFireworksTimer = 18;
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 220, () => {
        if (this.gameState === 'PLAYING' || this.gameState === 'VICTORY') {
          this.spawnFireworkBurst();
        }
      });
    }

    const chestX = bossX - 28;
    const chestY = bossY + 12;
    this.spawnBossLootChest(chestX, chestY, Phaser.Math.Between(45, 65));

    const doorX = bossX + 44;
    const doorY = bossY - 6;
    this.exitDoorPos = { x: doorX, y: doorY };
    this.exitDoorSprite = this.add.sprite(doorX, doorY, 'exit_door')
      .setDepth(getWorldEntityDepth(doorY, 6))
      .setScale(1.18);

    this.tweens.add({
      targets: this.exitDoorSprite,
      scale: { from: 1.12, to: 1.26 },
      duration: 580,
      yoyo: true,
      repeat: -1
    });

    const dpr = getDpr();
    this.exitDoorLabel = this.add.text(doorX, doorY - 46, '🚪 SALIDA DEL NIVEL', {
      fontFamily: '"Chakra Petch", monospace',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fef08a',
      backgroundColor: 'rgba(9, 13, 20, 0.88)',
      padding: { x: 7, y: 3 },
      stroke: '#ca8a04',
      strokeThickness: 2,
      resolution: dpr
    }).setOrigin(0.5).setDepth(getWorldEntityDepth(doorY, 20));

    this.tweens.add({
      targets: this.exitDoorLabel,
      y: doorY - 52,
      duration: 650,
      yoyo: true,
      repeat: -1
    });

    AudioSys.portalOpen();
    this.cameras.main.flash(320, 250, 204, 21, false);
    this.addFloatingText(this.player.x, this.player.y - 44, '🏆 ¡JEFE SUPREMO DERROTADO! RECOGE EL COFRE Y CRUZA LA PUERTA', '#facc15');
  },

  clearExitDoorVisuals() {
    if (this.exitDoorSprite) {
      this.tweens.killTweensOf(this.exitDoorSprite);
      this.exitDoorSprite.destroy();
      this.exitDoorSprite = null;
    }
    if (this.exitDoorLabel) {
      this.tweens.killTweensOf(this.exitDoorLabel);
      this.exitDoorLabel.destroy();
      this.exitDoorLabel = null;
    }
    this.exitDoorPos = null;
  },

  spawnCorruptOperatorBoss(bx, by) {
    const diff = 1 + this.elapsedTime / 140;
    const corruptTex = this.resolveCustomOrFallbackTexture('corrupt_operator_img', 'corrupt_operator_boss');
    const boss = this.enemies.create(bx, by, corruptTex)
      .setDepth(getEnemyDepth({ y: by }, true))
      .setScale(1.2);
    boss.body.setCircle(20, 12, 22);

    const maxHp = Math.round(1150 * Math.max(1, diff));

    boss.setData('enemy', {
      name: 'OPERADOR CORRUPTO',
      hp: maxHp,
      maxHp,
      speed: 58,
      damage: 28,
      xp: 220,
      isBoss: true,
      isCorruptOperator: true,
      facingLeftByDefault: false,
      purpleOrbTimer: 1.5,
      orbCd: 0
    });

    this.lastHitBossSprite = boss;
    this.addFloatingText(this.player.x, this.player.y - 36, '⚠️ SALA CRA BLANCA · OPERADOR CORRUPTO', '#0284c7');
  },

  updateCorruptOperatorAttacks(boss, eData, dt) {
    if (!boss || !boss.active || !this.player || !this.player.active) return;

    if (!this.updateCorruptAreaZones(boss, dt)) return;

    if (this.corruptDashState) {
      const ds = this.corruptDashState;
      ds.timer -= dt;
      if (ds.phase === 'telegraph') {
        boss.setVelocity(0, 0);
        if (ds.previewGfx) {
          ds.previewGfx.clear();
          ds.previewGfx.lineStyle(2.5, 0x0284c7, 0.85);
          ds.previewGfx.strokeRect(
            Math.min(boss.x, ds.targetX) - 18,
            Math.min(boss.y, ds.targetY) - 18,
            Math.abs(ds.targetX - boss.x) + 36,
            Math.abs(ds.targetY - boss.y) + 36
          );
          ds.previewGfx.lineStyle(2, 0x38bdf8, 0.95);
          ds.previewGfx.beginPath();
          ds.previewGfx.moveTo(boss.x, boss.y);
          ds.previewGfx.lineTo(ds.targetX, ds.targetY);
          ds.previewGfx.strokePath();
        }
        if (ds.timer <= 0) {
          if (ds.previewGfx) {
            ds.previewGfx.destroy();
            ds.previewGfx = null;
          }
          ds.phase = 'dash';
          ds.timer = 0.42;
          const angle = Phaser.Math.Angle.Between(boss.x, boss.y, ds.targetX, ds.targetY);
          const dashSpeed = 360;
          ds.vx = Math.cos(angle) * dashSpeed;
          ds.vy = Math.sin(angle) * dashSpeed;
          AudioSys.tamperZap();
        }
        return;
      } else if (ds.phase === 'dash') {
        boss.setVelocity(ds.vx, ds.vy);
        if (ds.timer <= 0) {
          boss.setVelocity(0, 0);
          this.corruptDashState = null;
        }
        return;
      }
    }

    this.corruptAttackTimer -= dt;
    if (this.corruptAttackTimer <= 0) {
      const pattern = this.corruptAttackIndex % 3;
      this.corruptAttackIndex++;

      if (pattern === 0) {
        this.fireCorruptFanVolley(boss, eData);
        this.corruptAttackTimer = 2.55;
      } else if (pattern === 1) {
        this.spawnCorruptAreaStrike(boss, eData);
        this.corruptAttackTimer = 2.85;
      } else {
        this.startCorruptDashStrike(boss, eData);
        this.corruptAttackTimer = 3.1;
      }
    }
  },

  // Avanza las zonas de impacto ya lanzadas (también mientras el jefe está aturdido).
  // Devuelve false si el jugador ha sido expulsado de la sala durante la detonación.
  updateCorruptAreaZones(boss, dt) {
    if (!Array.isArray(this.corruptAreaZones) || this.corruptAreaZones.length === 0) return true;
    const remaining = [];
    for (const z of this.corruptAreaZones) {
      if (!z || !z.gfx) continue;
      z.elapsed += dt;
      const g = z.gfx;
      g.clear();

      if (!z.detonated) {
        const warnRatio = Math.min(1, z.elapsed / z.warnDuration);
        g.fillStyle(0xef4444, 0.12 + warnRatio * 0.22);
        g.fillCircle(z.x, z.y, z.radius);
        g.lineStyle(2.5, 0xdc2626, 0.9);
        g.strokeCircle(z.x, z.y, z.radius);
        g.lineStyle(1.5, 0xf97316, 0.85);
        g.strokeCircle(z.x, z.y, z.radius * warnRatio);

        if (z.elapsed >= z.warnDuration) {
          z.detonated = true;
          z.blastTimer = 0.26;
          AudioSys.bossOrbShoot();
          this.cameras.main.shake(110, 0.008);

          const distPlayer = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.x, z.y);
          if (distPlayer <= z.radius + 10) {
            this.damagePlayer(z.damage);
            // Si el golpe nos ha expulsado de la sala, el jefe y las zonas ya no existen.
            if (!this.inCraDimension || !boss.active) return false;
          }
        }
        remaining.push(z);
      } else {
        z.blastTimer -= dt;
        const alpha = Math.max(0, z.blastTimer / 0.26);
        g.fillStyle(0xf97316, 0.45 * alpha);
        g.fillCircle(z.x, z.y, z.radius);
        g.lineStyle(3, 0xef4444, alpha);
        g.strokeCircle(z.x, z.y, z.radius);

        if (z.blastTimer > 0) {
          remaining.push(z);
        } else {
          g.destroy();
        }
      }
    }
    this.corruptAreaZones = remaining;
    return true;
  },

  fireCorruptFanVolley(boss, eData) {
    const dmg = Math.max(12, Math.round((eData?.damage || 28) * 0.6));
    const speed = 185;
    const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
    const offsets = [-0.46, -0.18, 0.18, 0.46];

    offsets.forEach((off, idx) => {
      const a = baseAngle + off;
      const texKey = idx % 2 === 0 ? 'purple_orb' : 'tolcrap_saw';
      const isSaw = texKey === 'tolcrap_saw';
      this.spawnEnemyProjectile(boss.x + Math.cos(a) * 24, boss.y + Math.sin(a) * 24, texKey, a, speed, dmg, 3400, {
        depth: getEnemyDepth(boss, true) + 2,
        bodyCircle: [7, 2, 2],
        scale: isSaw ? 0.82 : null,
        angularVelocity: isSaw ? 420 : 0
      });
    });

    this.addFloatingText(boss.x, boss.y - 34, '⚡ RÁFAGA CORRUPTA', '#c084fc');
    AudioSys.bossOrbShoot();
  },

  spawnCorruptAreaStrike(boss, eData) {
    const b = this.dimensionRoomBounds || { minX: -386, maxX: 386, minY: -266, maxY: 266 };
    const areaDmg = Math.max(15, Math.round((eData?.damage || 28) * 0.75));
    const radius = 58;

    const spots = [
      {
        x: Phaser.Math.Clamp(this.player.x, b.minX + radius, b.maxX - radius),
        y: Phaser.Math.Clamp(this.player.y, b.minY + radius, b.maxY - radius)
      }
    ];

    for (let i = 0; i < 2; i++) {
      spots.push({
        x: Phaser.Math.Between(b.minX + radius + 12, b.maxX - radius - 12),
        y: Phaser.Math.Between(b.minY + radius + 12, b.maxY - radius - 12)
      });
    }

    spots.forEach(sp => {
      const gfx = this.add.graphics().setDepth(-490);
      this.corruptAreaZones.push({
        x: sp.x,
        y: sp.y,
        radius,
        damage: areaDmg,
        warnDuration: 1.05,
        elapsed: 0,
        detonated: false,
        blastTimer: 0,
        gfx
      });
    });

    this.addFloatingText(boss.x, boss.y - 34, '🎯 ¡ZONAS DE IMPACTO!', '#f97316');
    AudioSys.hordeAlert();
  },

  startCorruptDashStrike(boss, eData) {
    const b = this.dimensionRoomBounds || { minX: -386, maxX: 386, minY: -266, maxY: 266 };
    const tx = Phaser.Math.Clamp(this.player.x, b.minX + 16, b.maxX - 16);
    const ty = Phaser.Math.Clamp(this.player.y, b.minY + 16, b.maxY - 16);
    const previewGfx = this.add.graphics().setDepth(-492);

    this.corruptDashState = {
      phase: 'telegraph',
      timer: 0.65,
      targetX: tx,
      targetY: ty,
      vx: 0,
      vy: 0,
      previewGfx
    };

    this.addFloatingText(boss.x, boss.y - 34, '🌀 ¡EMBESTIDA DEL OPERADOR!', '#0284c7');
  },

  clearCorruptBossEffects() {
    if (Array.isArray(this.corruptAreaZones)) {
      this.corruptAreaZones.forEach(z => {
        if (z && z.gfx) z.gfx.destroy();
      });
    }
    this.corruptAreaZones = [];
    if (this.corruptDashState && this.corruptDashState.previewGfx) {
      this.corruptDashState.previewGfx.destroy();
    }
    this.corruptDashState = null;
  }
};
