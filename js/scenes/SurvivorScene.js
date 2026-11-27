// @ts-nocheck
// Escena principal del juego: creación del mundo y bucle update().
import Phaser from '../phaser.js?v=8';
import { SHOP_UPGRADES } from '../data/shop.js?v=8';
import { loadMeta } from '../meta.js?v=8';
import { isPortraitViewport, checkOrientation, setActiveScene } from '../orientation.js?v=8';
import { buildAllTextures } from '../textures.js?v=8';
import { HUD_BASE_DEPTH, getWorldEntityDepth, setDepthIfChanged } from '../utils.js?v=8';
import { RunMethods } from './systems/run.js?v=8';
import { UiMethods } from './systems/ui.js?v=8';
import { HudMethods } from './systems/hud.js?v=8';
import { InputMethods } from './systems/input.js?v=8';
import { LevelUpMethods } from './systems/levelup.js?v=8';
import { WeaponMethods } from './systems/weapons.js?v=8';
import { CombatMethods } from './systems/combat.js?v=8';
import { EnemyMethods } from './systems/enemies.js?v=8';
import { BossMethods } from './systems/bosses.js?v=8';
import { DimensionMethods } from './systems/dimension.js?v=8';
import { CrowdMethods } from './systems/crowd.js?v=8';

export class SurvivorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SurvivorScene' });
    this._uiBound = false;
    this._lastThermalDims = null;
    this._pausedByPortrait = false;
    this._toastTimeout = null;
  }

  preload() {
    this.load.on('loaderror', () => {});

    this.load.image('custom_block', 'img/block.png');
    this.load.image('retrato_1', 'img/retrato_1.png');
    this.load.image('chapa', 'img/chapa.png');
    this.load.image('prop_barrel', 'img/prop_barrel.png');
    this.load.image('prop_barrel_2', 'img/prop_barrel_2.png');
    this.load.image('prop_car', 'img/prop_car.png');
    this.load.image('prop_car_2', 'img/prop_car_2.png');
    this.load.image('prop_car_3', 'img/prop_car_3.png');
    this.load.image('prop_crate', 'img/prop_crate.png');
    this.load.image('prop_crate_2', 'img/prop_crate_2.png');
    this.load.image('prop_barrier', 'img/prop_barrier.png');
    this.load.image('tolcrap_custom', 'img/tolcrap.png');
    this.load.image('tolcrap_side', 'img/tolcrap_side.png');
    this.load.image('tolcrap_up', 'img/tolcrap_up.png');
    this.load.image('tolcrap_down', 'img/tolcrap_down.png');
    this.load.image('dim_portal_img', 'img/dim_portal.png');
    this.load.image('corrupt_operator_img', 'img/corrupt_operator.png');
    this.load.image('cra_white_floor_img', 'img/cra_white_floor.png');

    this.load.image('gsosito_idle_front', 'img/gsosito/idle_front.png');
    this.load.image('gsosito_idle_back', 'img/gsosito/idle_back.png');
    this.load.image('gsosito_idle_side', 'img/gsosito/idle_side.png');

    this.load.spritesheet('gsosito_walk_down', 'img/gsosito/walk_down_sheet.png', {
      frameWidth: 32, frameHeight: 48
    });
    this.load.spritesheet('gsosito_walk_up', 'img/gsosito/walk_up_sheet.png', {
      frameWidth: 33, frameHeight: 48
    });
    this.load.spritesheet('gsosito_walk_side', 'img/gsosito/walk_side_sheet.png', {
      frameWidth: 31, frameHeight: 48
    });
    this.load.image('ticket_img', 'img/ticket.png');
    this.load.image('end_bg', 'img/end.jpg');
  }

  hasValidTexture(key) {
    return Boolean(key && this.textures.exists(key) && this.textures.get(key).key !== '__MISSING');
  }

  resolveCustomOrFallbackTexture(customKey, fallbackKey) {
    return this.hasValidTexture(customKey) ? customKey : fallbackKey;
  }

  create() {
    setActiveScene(this);
    this.selectedShopUpgradeId = SHOP_UPGRADES[0].id;
    buildAllTextures(this);
    this.createAnimations();
    this.initFloatingLabels();

    this.gameState = 'MENU';
    this.resetRunState();

    this.fireworksParticles = [];
    this.fireworkSpawnTimer = 0;
    this._currentTicketHasFireworks = false;

    this.dimensionPortalSprite = null;
    this.dimensionPortalPos = null;
    this.dimensionPortalTimer = 0;
    this.dimensionPortalCountdownText = null;
    this.inCraDimension = false;
    this.dimensionReturnPos = null;
    this.dimensionSavedEnemies = [];
    this.dimensionSavedGems = [];
    this.dimensionRoomGraphics = null;
    this.dimensionRoomBounds = null;
    this.dimensionTransitionLock = false;

    this.exitDoorSprite = null;
    this.exitDoorPos = null;
    this.exitDoorLabel = null;

    this.lastDirection = 'down';
    this.isLookingLeft = false;

    const groundTex = this.hasValidTexture('custom_block') ? 'custom_block' : 'ground_proc';

    this.bgTile = this.add.tileSprite(0, 0, 1280, 720, groundTex)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-1000);
    this.bgTile.setTileScale(1, 1);

    this.solidProps = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    // Gemas, chatarra, botiquines, imanes, bombas y cofres. No usan el motor de física: se mueven
    // y se recogen en updateGems() (con cientos de gemas en el suelo, la física era muy costosa).
    this.gems = this.add.group();
    this.drones = [];
    this.enemyHpBarsGraphics = this.add.graphics().setDepth(getWorldEntityDepth(0, 11850));
    this.tamperFxGraphics = this.add.graphics().setDepth(getWorldEntityDepth(0, 12000));
    this.stunFxGraphics = this.add.graphics().setDepth(getWorldEntityDepth(0, 11900));
    this.portalArrowGraphics = this.add.graphics().setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 4);
    this.fireworksGraphics = this.add.graphics().setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 800);

    this.generateWastelandProps();
    this.buildPropGrid();

    this.player = this.physics.add.sprite(0, 0, 'gsosito_idle_front');
    this.player.setDepth(getWorldEntityDepth(this.player.y));
    this.player.body.setCircle(12, 10, 24);
    this.player.setData('stats', this.getDefaultStats());

    this.cameras.main.startFollow(this.player, true, 1, 1);

    this.physics.add.collider(this.player, this.solidProps);
    // Enemigos ↔ obstáculos y enemigos ↔ enemigos: ver scenes/systems/crowd.js (más rápido que Arcade).
    this.physics.add.overlap(this.projectiles, this.enemies, this.onProjectileHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.player, this.enemyProjectiles, this.onEnemyProjectileHit, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.setupTouchJoystick();

    this.createHUD();
    this.bindUIEvents();
    this.updatePauseButtonVisibility();
    checkOrientation();

    this.scale.on('resize', () => {
      if (this.gameState === 'LEVELUP' && this._lastThermalDims) {
        const { finalW, finalH, finalY } = this._lastThermalDims;
        this.syncThermalBoxToTicketGraphic(finalW, finalH, finalY);
      }
      this.updateHUD();
    });
  }

  isInActiveRun() {
    return this.gameState === 'PLAYING' || this.gameState === 'PAUSED' || this.gameState === 'LEVELUP' || this.gameState === 'FUSION_MODAL' || this.gameState === 'VICTORY';
  }

  getDefaultStats() {
    const meta = loadMeta();
    const hpBonus = (meta.levels.perm_hp || 0) * 15;
    const speedMult = 1 + (meta.levels.perm_speed || 0) * 0.08;
    const dmgMult = 1 + (meta.levels.perm_dmg || 0) * 0.15;
    const baseDmgReduction = Math.min(0.5, (meta.levels.perm_dmg_red || 0) * 0.05);
    const xpValueMult = 1 + (meta.levels.perm_xp || 0) * 0.15;

    return {
      hp: 100 + hpBonus,
      maxHp: 100 + hpBonus,
      xp: 0,
      xpToNext: 15,
      level: 1,
      speed: Math.round(100 * speedMult),
      pickupRange: 65,
      invulnTimer: 0,
      damageReduction: baseDmgReduction,
      xpValueMult: xpValueMult,
      veterancyLevel: 0,
      upgradeCounts: {},
      dronesEnabled: false,
      orbitals: 0,
      orbitalAngle: 0,
      droneOrbitRadius: 68,
      droneOrbitSpeed: 2.1,
      globalDamageMult: dmgMult,
      globalFirerateMult: 1,
      fusionActive: false,
      fusionTimer: 0,
      fusionCooldown: 1.28,
      fusionRingOffset: 0,
      weapon: {
        damage: 18,
        cooldown: 1,
        timer: 0,
        projectileSpeed: 350,
        projectileCount: 1,
        pierce: 1
      },
      domoFish: {
        enabled: false,
        level: 0,
        pickups: 0,
        rays: 4,
        baseDamage: 16,
        baseCooldown: 3.2,
        timer: 0,
        ringOffset: 0,
        projectileSpeed: 290,
        pierce: 2
      },
      tamper: {
        enabled: false,
        level: 0,
        cooldown: 3.0,
        targets: 1,
        damage: 26,
        timer: 0
      },
      commLoss: {
        enabled: false,
        level: 0,
        cooldown: 11.5,
        minTargets: 1,
        maxTargets: 2,
        stunDuration: 2.4,
        timer: 0
      }
    };
  }

  createAnimations() {
    this.anims.create({
      key: 'gsosito_down',
      frames: this.anims.generateFrameNumbers('gsosito_walk_down', { start: 0, end: 1 }),
      frameRate: 4,
      repeat: -1
    });

    this.anims.create({
      key: 'gsosito_up',
      frames: this.anims.generateFrameNumbers('gsosito_walk_up', { start: 0, end: 1 }),
      frameRate: 4,
      repeat: -1
    });

    this.anims.create({
      key: 'gsosito_side',
      frames: this.anims.generateFrameNumbers('gsosito_walk_side', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    const animsList = [
      { key: 'catOrange_walk', prefix: 'catOrange', rate: 10 },
      { key: 'catGray_walk', prefix: 'catGray', rate: 10 },
      { key: 'mutantRat_walk', prefix: 'mutantRat', rate: 11 },
      { key: 'thief_walk', prefix: 'thief', rate: 7 },
      { key: 'logistics_walk', prefix: 'logistics', rate: 6 },
      { key: 'foreman_walk', prefix: 'foreman', rate: 5 },
      { key: 'crow_walk', prefix: 'crow', rate: 11 },
      { key: 'execSuit_walk', prefix: 'execSuit', rate: 5 },
      { key: 'forklift_walk', prefix: 'forklift', rate: 12 }
    ];

    animsList.forEach(a => {
      if (!this.anims.exists(a.key)) {
        this.anims.create({
          key: a.key,
          frames: [{ key: `${a.prefix}_0` }, { key: `${a.prefix}_1` }],
          frameRate: a.rate,
          repeat: -1
        });
      }
    });
  }

  generateWastelandProps() {
    this.solidProps.clear(true, true);
    const propTypes = [
      { key: 'prop_car', solid: true, w: 181, h: 83, weight: 2 },
      { key: 'prop_car_2', solid: true, w: 192, h: 72, weight: 2 },
      { key: 'prop_car_3', solid: true, w: 82, h: 193, weight: 2 },
      { key: 'prop_barrier', solid: true, w: 28, h: 12, weight: 3 },
      { key: 'prop_barrel', solid: true, w: 27, h: 32, weight: 3 },
      { key: 'prop_barrel_2', solid: true, w: 27, h: 32, weight: 3 },
      { key: 'prop_crate', solid: true, w: 48, h: 32, weight: 3 },
      { key: 'prop_crate_2', solid: true, w: 48, h: 32, weight: 3 }
    ].filter(t => this.hasValidTexture(t.key));

    if (propTypes.length === 0) return;

    const placed = [];
    const minSpacing = 125;
    const sameTypeRadius = 380;
    const mapMin = -2200;
    const mapMax = 2200;
    const cellSize = 420;

    const cells = [];
    for (let gx = mapMin; gx < mapMax; gx += cellSize) {
      for (let gy = mapMin; gy < mapMax; gy += cellSize) {
        cells.push({ gx, gy });
      }
    }
    Phaser.Utils.Array.Shuffle(cells);

    for (const cell of cells) {
      const margin = 45;
      const px = Phaser.Math.Between(cell.gx + margin, Math.min(mapMax, cell.gx + cellSize - margin));
      const py = Phaser.Math.Between(cell.gy + margin, Math.min(mapMax, cell.gy + cellSize - margin));

      if (Math.hypot(px, py) < 185) continue;

      if (placed.some(p => Math.hypot(p.x - px, p.y - py) < minSpacing)) continue;

      const nearbyKeys = new Set(
        placed
          .filter(p => Math.hypot(p.x - px, p.y - py) < sameTypeRadius)
          .map(p => p.key)
      );

      let candidates = propTypes.filter(t => !nearbyKeys.has(t.key));
      if (candidates.length === 0) candidates = propTypes;

      const totalWeight = candidates.reduce((acc, t) => acc + t.weight, 0);
      let r = Math.random() * totalWeight;
      let chosen = candidates[0];
      for (const item of candidates) {
        r -= item.weight;
        if (r <= 0) {
          chosen = item;
          break;
        }
      }

      placed.push({ x: px, y: py, key: chosen.key });

      if (chosen.solid) {
        const obj = this.solidProps.create(px, py, chosen.key);
        obj.setDepth(getWorldEntityDepth(py));
        obj.body.setSize(chosen.w, chosen.h);
        obj.refreshBody();
      } else {
        this.add.image(px, py, chosen.key).setDepth(-5);
      }
    }
  }

  // Bucle principal (~60 veces por segundo). Cada paso está en su propio método, en el archivo
  // del sistema al que pertenece; el orden es el mismo que tenía el update() original.
  update(time, delta) {
    const dt = delta / 1000;
    this.bgTile.tilePositionX = this.cameras.main.scrollX;
    this.bgTile.tilePositionY = this.cameras.main.scrollY;
    this.updateFireworks(dt);
    this.syncWorldClock();
    // Los textos flotantes siguen animándose en tickets y modales (como hacían sus tweens), no en pausa.
    if (this.gameState !== 'PAUSED') this.updateFloatingLabels(dt);

    if (isPortraitViewport()) {
      checkOrientation();
    }
    if (this.gameState !== 'PLAYING') {
      this.updateHUD();
      return;
    }

    this.elapsedTime += dt;
    const st = this.player.getData('stats');

    // Cada uno de estos pasos puede abrir un ticket, entrar en la sala CRA o terminar el nivel:
    // en ese caso se corta el frame aquí, igual que antes.
    if (!this.updateLevelUpQueue(dt)) return this.updateHUD();
    this.updateRunEvents(dt);
    if (!this.updatePlayer(st, dt)) return this.updateHUD();
    this.updateEnemySpawning(dt);

    const enemies = this.collectActiveEnemies();
    this.updateCrowdCollisions(enemies);
    this.updatePlayerWeapons(st, dt, enemies);
    this.updateEnemies(time, dt, enemies);
    this.updateDrones(st, dt, enemies);
    this.updateGems(st, dt);

    this.updateHUD();
  }

  // Invulnerabilidad, movimiento, límites de la sala CRA, portal, puerta de salida y animación.
  // Devuelve false si el jugador ha entrado en el portal o cruzado la puerta.
  updatePlayer(st, dt) {
    if (st.invulnTimer > 0) {
      st.invulnTimer -= dt;
      this.player.setAlpha(Math.floor(st.invulnTimer * 18) % 2 === 0 ? 1 : 0.4);
    } else {
      this.player.setAlpha(1);
    }

    let mx = 0, my = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) mx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) mx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) my -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) my += 1;

    if (this.joystick.active) {
      mx = this.joystick.dx;
      my = this.joystick.dy;
    } else if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
    }

    this.player.setVelocity(mx * st.speed, my * st.speed);

    if (this.inCraDimension && this.dimensionRoomBounds) {
      const b = this.dimensionRoomBounds;
      this.player.x = Phaser.Math.Clamp(this.player.x, b.minX, b.maxX);
      this.player.y = Phaser.Math.Clamp(this.player.y, b.minY, b.maxY);
      if ((this.player.x <= b.minX && this.player.body.velocity.x < 0) || (this.player.x >= b.maxX && this.player.body.velocity.x > 0)) {
        this.player.setVelocityX(0);
      }
      if ((this.player.y <= b.minY && this.player.body.velocity.y < 0) || (this.player.y >= b.maxY && this.player.body.velocity.y > 0)) {
        this.player.setVelocityY(0);
      }
    }

    setDepthIfChanged(this.player, getWorldEntityDepth(this.player.y));

    if (
      !this.inCraDimension &&
      !this.dimensionTransitionLock &&
      this.dimensionPortalSpawned &&
      this.dimensionPortalPos &&
      this.dimensionPortalSprite &&
      this.dimensionPortalSprite.active
    ) {
      const distPortal = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.dimensionPortalPos.x,
        this.dimensionPortalPos.y
      );
      if (distPortal <= 34) {
        this.enterCraWhiteDimension();
        return false;
      }
    }

    if (
      !this.inCraDimension &&
      this.levelCleared &&
      this.exitDoorPos &&
      this.exitDoorSprite &&
      this.exitDoorSprite.active
    ) {
      const distDoor = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.exitDoorPos.x,
        this.exitDoorPos.y
      );
      if (distDoor <= 36) {
        this.completeLevelVictory();
        return false;
      }
    }

    const isMoving = Math.abs(mx) > 0.05 || Math.abs(my) > 0.05;
    if (isMoving) {
      if (Math.abs(mx) > Math.abs(my)) {
        this.lastDirection = 'side';
        this.isLookingLeft = mx < 0;
        this.player.setFlipX(this.isLookingLeft);
        if (this.player.anims.currentAnim?.key !== 'gsosito_side') {
          this.player.play('gsosito_side', true);
        }
      } else if (my < 0) {
        this.lastDirection = 'up';
        this.player.setFlipX(false);
        if (this.player.anims.currentAnim?.key !== 'gsosito_up') {
          this.player.play('gsosito_up', true);
        }
      } else {
        this.lastDirection = 'down';
        this.player.setFlipX(false);
        if (this.player.anims.currentAnim?.key !== 'gsosito_down') {
          this.player.play('gsosito_down', true);
        }
      }
    } else {
      if (this.player.anims.isPlaying) this.player.anims.stop();
      const idleKey = this.lastDirection === 'side'
        ? 'gsosito_idle_side'
        : (this.lastDirection === 'up' ? 'gsosito_idle_back' : 'gsosito_idle_front');
      // Solo se cambia la textura si hace falta (antes se reasignaba en cada frame).
      if (this.player.texture.key !== idleKey) this.player.setTexture(idleKey);
      this.player.setFlipX(this.lastDirection === 'side' ? this.isLookingLeft : false);
    }
    return true;
  }
}

// Cada sistema vive en su propio archivo; sus métodos se copian al prototipo de la escena,
// así todo el código sigue llamándolos como this.metodo().
Object.assign(
  SurvivorScene.prototype,
  RunMethods,
  UiMethods,
  HudMethods,
  InputMethods,
  LevelUpMethods,
  WeaponMethods,
  CombatMethods,
  EnemyMethods,
  BossMethods,
  DimensionMethods,
  CrowdMethods
);
