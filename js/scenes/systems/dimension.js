// @ts-nocheck
// Portal dimensional y Sala CRA blanca.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
import Phaser from '../../phaser.js?v=8';
import { AudioSys } from '../../audio.js?v=8';
import { getWorldEntityDepth, formatTime, getDpr } from '../../utils.js?v=8';

export const DimensionMethods = {
  clearPortalVisuals() {
    if (this.dimensionPortalSprite) {
      this.tweens.killTweensOf(this.dimensionPortalSprite);
      this.dimensionPortalSprite.destroy();
      this.dimensionPortalSprite = null;
    }
    if (this.dimensionPortalCountdownText) {
      this.dimensionPortalCountdownText.destroy();
      this.dimensionPortalCountdownText = null;
    }
    this.dimensionPortalPos = null;
    this.dimensionPortalTimer = 0;
    if (this.portalArrowGraphics) {
      this.portalArrowGraphics.clear();
    }
  },

  clearDimensionRoomVisuals() {
    this.clearCorruptBossEffects();
    if (this.dimensionRoomFloorTile) {
      this.dimensionRoomFloorTile.destroy();
      this.dimensionRoomFloorTile = null;
    }
    if (this.dimensionRoomGraphics) {
      this.dimensionRoomGraphics.destroy();
      this.dimensionRoomGraphics = null;
    }
    this.dimensionRoomBounds = null;
  },

  tryRollDimensionPortal(dt) {
    if (this.dimensionEventChecked || this.dimensionPortalSpawned || this.inCraDimension) return;

    if (!this.runPortalRollDone) {
      this.runPortalRollDone = true;
      this.runHasDimensionPortal = Math.random() < 0.05;
    }

    if (!this.runHasDimensionPortal) {
      this.dimensionEventChecked = true;
      return;
    }

    if (this.elapsedTime < 90) return;

    this.portalCheckTimer -= dt;
    if (this.portalCheckTimer > 0) return;
    this.portalCheckTimer = 4;

    this.dimensionEventChecked = true;
    this.spawnDimensionPortal();
  },

  spawnDimensionPortal() {
    if (this.dimensionPortalSpawned) return;
    this.dimensionPortalSpawned = true;
    this.dimensionPortalTimer = 60;

    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(360, 560);
    const px = Math.round(this.player.x + Math.cos(angle) * dist);
    const py = Math.round(this.player.y + Math.sin(angle) * dist);

    this.dimensionPortalPos = { x: px, y: py };
    const portalTex = this.resolveCustomOrFallbackTexture('dim_portal_img', 'dim_portal');
    this.dimensionPortalSprite = this.add.sprite(px, py, portalTex)
      .setDepth(getWorldEntityDepth(py, -2))
      .setScale(1.1);

    const dpr = getDpr();
    this.dimensionPortalCountdownText = this.add.text(px, py - 40, '01:00', {
      fontFamily: '"Chakra Petch", monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#e0f2fe',
      backgroundColor: 'rgba(9, 13, 20, 0.85)',
      padding: { x: 6, y: 2 },
      stroke: '#0284c7',
      strokeThickness: 2,
      resolution: dpr
    }).setOrigin(0.5).setDepth(getWorldEntityDepth(py, 15));

    this.tweens.add({
      targets: this.dimensionPortalSprite,
      scale: { from: 1.02, to: 1.2 },
      alpha: { from: 0.88, to: 1 },
      duration: 650,
      yoyo: true,
      repeat: -1
    });

    AudioSys.portalOpen();
    this.addFloatingText(this.player.x, this.player.y - 36, '🌀 ¡PORTAL ABIERTO! (1:00 PARA ENTRAR)', '#38bdf8');
  },

  updateDimensionPortalTimer(dt) {
    if (
      this.inCraDimension ||
      !this.dimensionPortalSpawned ||
      !this.dimensionPortalSprite ||
      !this.dimensionPortalSprite.active
    ) {
      return;
    }

    this.dimensionPortalTimer = Math.max(0, (this.dimensionPortalTimer || 0) - dt);

    if (this.dimensionPortalCountdownText && this.dimensionPortalCountdownText.active && this.dimensionPortalPos) {
      const rem = Math.ceil(this.dimensionPortalTimer);
      this.dimensionPortalCountdownText
        .setPosition(this.dimensionPortalPos.x, this.dimensionPortalPos.y - 40)
        .setText(formatTime(rem))
        .setColor(rem <= 10 ? '#fca5a5' : '#e0f2fe');
    }

    if (this.dimensionPortalTimer <= 0) {
      const px = this.dimensionPortalPos ? this.dimensionPortalPos.x : this.player.x;
      const py = this.dimensionPortalPos ? this.dimensionPortalPos.y : this.player.y;
      this.clearPortalVisuals();
      this.addFloatingText(px, py - 24, '💨 EL PORTAL SE HA CERRADO', '#94a3b8');
    }
  },

  enterCraWhiteDimension() {
    if (this.inCraDimension || this.dimensionTransitionLock) return;
    this.dimensionTransitionLock = true;

    this.dimensionReturnPos = { x: this.player.x, y: this.player.y };

    this.dimensionSavedEnemies = [];
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      this.dimensionSavedEnemies.push({
        sprite: e,
        x: e.x,
        y: e.y,
        vx: e.body ? e.body.velocity.x : 0,
        vy: e.body ? e.body.velocity.y : 0
      });
      e.setActive(false).setVisible(false);
      if (e.body) e.body.enable = false;
    });

    this.dimensionSavedGems = [];
    this.gems.getChildren().forEach(gm => {
      if (!gm.active) return;
      this.dimensionSavedGems.push({ sprite: gm });
      this.destroyChestBeam(gm);
      gm.setActive(false).setVisible(false);
    });

    this.projectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    if (this.tamperFxGraphics) this.tamperFxGraphics.clear();
    if (this.enemyHpBarsGraphics) this.enemyHpBarsGraphics.clear();

    if (this.dimensionPortalSprite) {
      this.dimensionPortalSprite.setVisible(false);
    }
    if (this.dimensionPortalCountdownText) {
      this.dimensionPortalCountdownText.setVisible(false);
    }
    if (this.portalArrowGraphics) {
      this.portalArrowGraphics.clear();
    }

    const roomHalfW = 400;
    const roomHalfH = 280;
    const playerRadiusPad = 14;
    this.dimensionRoomBounds = {
      minX: -roomHalfW + playerRadiusPad,
      maxX: roomHalfW - playerRadiusPad,
      minY: -roomHalfH + playerRadiusPad,
      maxY: roomHalfH - playerRadiusPad
    };

    this.clearDimensionRoomVisuals();
    const rg = this.add.graphics().setDepth(-500);

    rg.fillStyle(0x090d14, 1);
    rg.fillRect(-roomHalfW - 600, -roomHalfH - 600, (roomHalfW + 600) * 2, (roomHalfH + 600) * 2);

    if (this.hasValidTexture('cra_white_floor_img')) {
      const floorTile = this.add.tileSprite(0, 0, roomHalfW * 2, roomHalfH * 2, 'cra_white_floor_img')
        .setOrigin(0.5, 0.5)
        .setDepth(-499);
      this.dimensionRoomFloorTile = floorTile;
    } else {
      const tileSize = 80;
      for (let tx = -roomHalfW; tx < roomHalfW; tx += tileSize) {
        for (let ty = -roomHalfH; ty < roomHalfH; ty += tileSize) {
          const ix = Math.round((tx + roomHalfW) / tileSize);
          const iy = Math.round((ty + roomHalfH) / tileSize);
          const isAlt = ((ix + iy) % 2) === 0;
          rg.fillStyle(isAlt ? 0xffffff : 0xf1f5f9, 1);
          rg.fillRect(tx, ty, tileSize, tileSize);
          rg.lineStyle(1, 0xcbd5e1, 1);
          rg.strokeRect(tx, ty, tileSize, tileSize);
        }
      }
    }

    rg.lineStyle(2, 0x94a3b8, 0.65);
    rg.strokeCircle(0, 0, 95);
    rg.lineStyle(4, 0x0f172a, 1);
    rg.strokeRect(-roomHalfW, -roomHalfH, roomHalfW * 2, roomHalfH * 2);
    rg.lineStyle(2, 0x38bdf8, 0.85);
    rg.strokeRect(-roomHalfW + 4, -roomHalfH + 4, roomHalfW * 2 - 8, roomHalfH * 2 - 8);

    this.dimensionRoomGraphics = rg;
    this.bgTile.setVisible(false);
    // Ocultar Y desactivar colisiones: si no, los props del mapa exterior serían muros invisibles en la sala.
    this.setOverworldPropsActive(false);

    this.inCraDimension = true;
    this.lastHitBossSprite = null;
    this.corruptAttackTimer = 1.6;
    this.corruptAttackIndex = 0;
    this.corruptDashState = null;
    this.player.setPosition(0, 120);
    this.player.setVelocity(0, 0);

    AudioSys.dimensionShift();
    this.cameras.main.flash(260, 240, 249, 255, false);

    this.spawnCorruptOperatorBoss(0, -65);

    this.time.delayedCall(250, () => {
      this.dimensionTransitionLock = false;
    });
  },

  exitCraDimension(defeatedBoss) {
    if (!this.inCraDimension || this.dimensionTransitionLock) return;
    this.dimensionTransitionLock = true;

    // Solo se destruye lo ACTIVO (el jefe y lo creado dentro de la sala). Los enemigos y gemas
    // del mapa exterior están desactivados dentro de los mismos grupos y se restauran abajo.
    [...this.enemies.getChildren()].forEach(e => {
      if (e && e.active) e.destroy();
    });
    [...this.gems.getChildren()].forEach(gm => {
      if (!gm || !gm.active) return;
      this.destroyChestBeam(gm);
      gm.destroy();
    });
    this.projectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    if (this.tamperFxGraphics) this.tamperFxGraphics.clear();
    if (this.enemyHpBarsGraphics) this.enemyHpBarsGraphics.clear();
    if (this.stunFxGraphics) this.stunFxGraphics.clear();

    this.clearDimensionRoomVisuals();
    this.bgTile.setVisible(true);
    this.setOverworldPropsActive(true);

    if (Array.isArray(this.dimensionSavedEnemies)) {
      this.dimensionSavedEnemies.forEach(item => {
        const sp = item.sprite;
        if (!sp || !sp.scene) return;
        sp.setActive(true).setVisible(true);
        sp.setPosition(item.x, item.y);
        if (sp.body) {
          sp.body.enable = true;
          sp.setVelocity(item.vx, item.vy);
        }
      });
    }
    this.dimensionSavedEnemies = [];

    if (Array.isArray(this.dimensionSavedGems)) {
      this.dimensionSavedGems.forEach(item => {
        const gm = item.sprite;
        if (!gm || !gm.scene) return;
        gm.setActive(true).setVisible(true);
        const gd = gm.getData('gem');
        if (gd && gd.type === 'boss_chest') this.attachChestBeam(gm);
      });
    }
    this.dimensionSavedGems = [];

    const retPos = this.dimensionReturnPos || { x: 0, y: 0 };
    this.inCraDimension = false;
    this.dimensionReturnPos = null;
    this.lastHitBossSprite = null;

    this.clearPortalVisuals();

    this.player.setPosition(retPos.x, retPos.y);
    this.player.setVelocity(0, 0);

    const st = this.player.getData('stats');
    st.invulnTimer = Math.max(st.invulnTimer || 0, 1.4);

    if (defeatedBoss) {
      const rewardChapas = Phaser.Math.Between(18, 26);
      this.score += 2500;
      st.hp = Math.min(st.maxHp, st.hp + Math.round(st.maxHp * 0.45));

      this.spawnBossLootChest(retPos.x + 28, retPos.y - 10, rewardChapas);

      const drop = this.gems.create(retPos.x - 24, retPos.y - 20, 'bolt')
        .setDepth(getWorldEntityDepth(retPos.y - 20, -5))
        .setTint(0xef4444)
        .setScale(1.35);
      drop.setData('gem', { type: 'xp_tier', tier: 'red', value: 45 });

      AudioSys.levelUp();
      this.addFloatingText(
        retPos.x,
        retPos.y - 38,
        '🏆 ¡OPERADOR CORRUPTO DERROTADO! RECOGE EL COFRE',
        '#4ade80'
      );

      // Pequeña espera antes de abrir el ticket para que se vea la vuelta al mapa.
      this.addXp(45, { holdSeconds: 0.26 });
    } else {
      st.hp = Math.max(30, Math.round(st.maxHp * 0.35));
      AudioSys.dimensionShift();
      this.addFloatingText(
        retPos.x,
        retPos.y - 34,
        '⚡ ¡EXPULSADO DE LA SALA CRA CON VIDA DE EMERGENCIA!',
        '#facc15'
      );
    }

    this.time.delayedCall(250, () => {
      this.dimensionTransitionLock = false;
    });
  }
};
