// @ts-nocheck
// HUD dibujado en Phaser, textos flotantes, banner de horda y fuegos artificiales.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
import Phaser from '../../phaser.js?v=8';
import { AudioSys } from '../../audio.js?v=8';
import { HUD_BASE_DEPTH, getWorldEntityDepth, formatTime, getDpr } from '../../utils.js?v=8';

// Textos flotantes: duración de la animación, tope de números de daño a la vez y tamaño de la caché.
const FLOATING_LABEL_DURATION = 0.65;
const MAX_DAMAGE_NUMBERS = 40;
const FLOATING_LABEL_CACHE_MAX = 300;

export const HudMethods = {
  createHUD() {
    const dpr = getDpr();
    this.hudGraphics = this.add.graphics().setScrollFactor(0).setDepth(HUD_BASE_DEPTH);
    this.hudPortrait = this.add.image(31, 31, 'retrato_1').setScale(1).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 1);

    const fontStyle = {
      fontFamily: '"Chakra Petch", "Press Start 2P", monospace',
      fontStyle: 'bold',
      resolution: dpr,
      stroke: '#000000',
      strokeThickness: 2
    };

    this.hudLevelText = this.add.text(58, 10, 'NV.1', {
      ...fontStyle,
      fontSize: '12px',
      color: '#facc15'
    }).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    this.hudHpText = this.add.text(60, 24, '100/100', {
      ...fontStyle,
      fontSize: '10px',
      color: '#ffffff'
    }).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    this.hudXpText = this.add.text(60, 38, 'XP 0/15', {
      ...fontStyle,
      fontSize: '10px',
      color: '#e0f2fe'
    }).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    const hudInfoStyle = {
      fontFamily: '"Chakra Petch", "Press Start 2P", monospace',
      fontStyle: 'bold',
      resolution: dpr,
      stroke: '#000000',
      strokeThickness: 3
    };

    this.hudTimeText = this.add.text(this.scale.width / 2, 10, '00:00 / 12:00', {
      ...hudInfoStyle,
      fontSize: '16px',
      color: '#f8fafc'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    this.hudKillsText = this.add.text(10, 62, 'BAJAS: 0', {
      ...hudInfoStyle,
      fontSize: '13px',
      color: '#facc15'
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    const hudChapaTex = this.resolveCustomOrFallbackTexture('chapa', 'chapa_fallback');
    this.hudChapaIcon = this.add.image(18, 87, hudChapaTex)
      .setDisplaySize(15, 15)
      .setScrollFactor(0)
      .setDepth(HUD_BASE_DEPTH + 2);

    this.hudChapaText = this.add.text(30, 80, '0', {
      ...hudInfoStyle,
      fontSize: '13px',
      color: '#fde047'
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2);

    this.hordeBannerText = this.add.text(this.scale.width / 2, 92, '⚠️ SE ACERCA UNA HORDA DE ENEMIGOS ⚠️', {
      ...hudInfoStyle,
      fontSize: '14px',
      color: '#ef4444',
      backgroundColor: 'rgba(9, 13, 20, 0.78)',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2).setVisible(false);

    this.bossHudGraphics = this.add.graphics().setScrollFactor(0).setDepth(HUD_BASE_DEPTH);

    this.bossHudNameText = this.add.text(this.scale.width / 2, this.scale.height - 42, '', {
      ...hudInfoStyle,
      fontSize: '12px',
      color: '#e9d5ff'
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2).setVisible(false);

    this.bossHudHpText = this.add.text(this.scale.width / 2, this.scale.height - 23, '', {
      ...fontStyle,
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(HUD_BASE_DEPTH + 2).setVisible(false);
  },

  updateHUD() {
    const st = this.player.getData('stats');
    const g = this.hudGraphics;
    g.clear();

    g.fillStyle(0x06090f, 0.94);
    g.fillRect(7, 7, 188, 48);
    g.fillStyle(0x111827, 0.95);
    g.fillRect(8, 8, 186, 46);
    g.lineStyle(1.5, 0x64748b, 1);
    g.strokeRect(8, 8, 186, 46);
    g.lineStyle(1, 0x1e293b, 1);
    g.strokeRect(9, 9, 184, 44);

    g.fillStyle(0x090d16, 1);
    g.fillRect(12, 12, 38, 38);
    g.lineStyle(1.5, 0xfacc15, 0.75);
    g.strokeRect(12, 12, 38, 38);

    const hpRatio = Math.max(0, Math.min(1, st.hp / st.maxHp));
    const hpFillW = Math.round(126 * hpRatio);
    g.fillStyle(0x090d14, 1);
    g.fillRect(56, 24, 128, 11);
    g.lineStyle(1, 0x334155, 1);
    g.strokeRect(56, 24, 128, 11);
    if (hpFillW > 0) {
      g.fillStyle(0xdc2626, 1);
      g.fillRect(57, 25, hpFillW, 9);
      g.fillStyle(0xf87171, 0.85);
      g.fillRect(57, 25, hpFillW, 2);
      g.fillStyle(0x7f1d1d, 0.75);
      g.fillRect(57, 32, hpFillW, 2);
    }

    const xpRatio = Math.max(0, Math.min(1, st.xp / st.xpToNext));
    const xpFillW = Math.min(126, Math.round(126 * xpRatio));
    g.fillStyle(0x090d14, 1);
    g.fillRect(56, 37, 128, 11);
    g.lineStyle(1, 0x334155, 1);
    g.strokeRect(56, 37, 128, 11);
    if (xpFillW > 0) {
      g.fillStyle(0x2563eb, 1);
      g.fillRect(57, 38, xpFillW, 9);
      g.fillStyle(0x7dd3fc, 0.85);
      g.fillRect(57, 38, xpFillW, 2);
      g.fillStyle(0x1e3a8a, 0.75);
      g.fillRect(57, 45, xpFillW, 2);
    }

    this.hudLevelText.setText(`NV.${st.level}`);
    this.hudHpText.setText(`${Math.ceil(st.hp)}/${st.maxHp}`);
    this.hudXpText.setText(`XP ${st.xp}/${st.xpToNext}`);

    this.hudTimeText.setPosition(this.scale.width / 2, 10).setText(`${formatTime(this.elapsedTime)} / 12:00`);
    this.hudKillsText.setPosition(10, 62).setText(`BAJAS: ${this.kills}`);
    if (this.hudChapaIcon) this.hudChapaIcon.setPosition(18, 87);
    if (this.hudChapaText) this.hudChapaText.setPosition(30, 80).setText(`${this.runChapasCollected || 0}`);

    this.updateBossHUD();
    this.updatePortalArrowHUD();

    this.joyGraphics.clear();
    if (this.joystick.active) {
      const sx = this.joystick.startX;
      const sy = this.joystick.startY;
      const cx = sx + this.joystick.dx * this.joystick.maxR;
      const cy = sy + this.joystick.dy * this.joystick.maxR;
      this.joyGraphics.lineStyle(2, 0xfacc15, 0.5);
      this.joyGraphics.strokeCircle(sx, sy, this.joystick.maxR);
      this.joyGraphics.fillStyle(0xfacc15, 0.8);
      this.joyGraphics.fillCircle(cx, cy, 8);
    }
  },

  getActiveBossForHUD() {
    if (this.lastHitBossSprite && this.lastHitBossSprite.active) {
      const lastData = this.lastHitBossSprite.getData('enemy');
      if (lastData && lastData.isBoss && lastData.hp > 0) {
        return lastData;
      }
    }

    // Se llama en cada frame: se busca el primer jefe vivo sin crear arrays nuevos.
    const children = this.enemies.getChildren();
    for (let i = 0; i < children.length; i++) {
      const e = children[i];
      if (!e.active) continue;
      const d = e.getData('enemy');
      if (d && d.isBoss && d.hp > 0) {
        this.lastHitBossSprite = e;
        return d;
      }
    }

    this.lastHitBossSprite = null;
    return null;
  },

  updateBossHUD() {
    if (!this.bossHudGraphics) return;
    const g = this.bossHudGraphics;
    g.clear();

    const bossData = this.isInActiveRun() ? this.getActiveBossForHUD() : null;

    if (!bossData) {
      this.bossHudNameText.setVisible(false);
      this.bossHudHpText.setVisible(false);
      return;
    }

    const barW = Math.min(440, this.scale.width - 60);
    const barH = 16;
    const barX = Math.round((this.scale.width - barW) / 2);
    const barY = this.scale.height - 30;
    const pct = Math.max(0, Math.min(1, bossData.hp / bossData.maxHp));

    g.fillStyle(0x090d14, 0.92);
    g.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
    g.lineStyle(1.5, 0xc084fc, 1);
    g.strokeRect(barX - 3, barY - 3, barW + 6, barH + 6);

    g.fillStyle(0x3b0764, 1);
    g.fillRect(barX, barY, barW, barH);
    g.fillStyle(0xa855f7, 1);
    g.fillRect(barX, barY, Math.round(barW * pct), barH);

    g.fillStyle(0xd8b4fe, 0.35);
    g.fillRect(barX, barY, Math.round(barW * pct), 4);

    const bossTitle = bossData.name || 'JEFE PERIMETRAL';
    this.bossHudNameText
      .setPosition(this.scale.width / 2, barY - 5)
      .setText(bossTitle)
      .setVisible(true);

    this.bossHudHpText
      .setPosition(this.scale.width / 2, barY + barH / 2)
      .setText(`${Math.ceil(bossData.hp)} / ${bossData.maxHp}`)
      .setVisible(true);
  },

  updatePortalArrowHUD() {
    if (!this.portalArrowGraphics) return;
    const g = this.portalArrowGraphics;
    g.clear();

    if (this.gameState !== 'PLAYING' || this.inCraDimension) return;

    let targetPos = null;
    let arrowColor = 0x38bdf8;

    let activeChest = null;
    if (this.gems) {
      for (const gm of this.gems.getChildren()) {
        if (gm && gm.active) {
          const gd = gm.getData('gem');
          if (gd && gd.type === 'boss_chest') {
            activeChest = gm;
            break;
          }
        }
      }
    }

    if (activeChest) {
      targetPos = { x: activeChest.x, y: activeChest.y };
      arrowColor = 0xfacc15;
    } else if (this.levelCleared && this.exitDoorPos && this.exitDoorSprite && this.exitDoorSprite.active) {
      targetPos = this.exitDoorPos;
      arrowColor = 0xfacc15;
    } else if (
      this.dimensionPortalSpawned &&
      this.dimensionPortalPos &&
      this.dimensionPortalSprite &&
      this.dimensionPortalSprite.active
    ) {
      targetPos = this.dimensionPortalPos;
      arrowColor = 0x38bdf8;
    }

    if (!targetPos) return;

    const dx = targetPos.x - this.player.x;
    const dy = targetPos.y - this.player.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 150) {
      const angle = Math.atan2(dy, dx);
      const centerX = this.scale.width / 2;
      const centerY = this.scale.height / 2;
      const radiusX = Math.max(80, this.scale.width * 0.34);
      const radiusY = Math.max(60, this.scale.height * 0.32);

      const ax = centerX + Math.cos(angle) * radiusX;
      const ay = centerY + Math.sin(angle) * radiusY;

      const tipX = ax + Math.cos(angle) * 9;
      const tipY = ay + Math.sin(angle) * 9;
      const leftX = ax + Math.cos(angle + 2.42) * 8.5;
      const leftY = ay + Math.sin(angle + 2.42) * 8.5;
      const backX = ax + Math.cos(angle + Math.PI) * 4.5;
      const backY = ay + Math.sin(angle + Math.PI) * 4.5;
      const rightX = ax + Math.cos(angle - 2.42) * 8.5;
      const rightY = ay + Math.sin(angle - 2.42) * 8.5;

      g.fillStyle(0x090d14, 0.88);
      g.fillCircle(ax, ay, 14);
      g.lineStyle(2, arrowColor, 1);
      g.strokeCircle(ax, ay, 14);

      g.fillStyle(arrowColor, 1);
      g.fillPoints([
        { x: tipX, y: tipY },
        { x: leftX, y: leftY },
        { x: backX, y: backY },
        { x: rightX, y: rightY }
      ], true);
    }
  },

  // ---------------------------------------------------------------------------
  // TEXTOS FLOTANTES ("18", "-7", "+1 CHATARRA", "¡SIN SEÑAL!"...)
  //
  // Antes cada llamada creaba un Phaser.Text nuevo (canvas propio + textura nueva en la GPU)
  // y lo destruía a los 650 ms: en hordas eran cientos por segundo y en móvil ralentizaba mucho.
  // Ahora:
  //   1. Cada combinación texto+color se dibuja UNA vez con un Text "sello" y se guarda como
  //      textura (caché limitada; se descartan primero las menos usadas recientemente).
  //   2. Se muestran con Images reutilizables (pool) que se animan a mano, sin crear tweens.
  //   3. Los números de daño tienen un tope en pantalla; si se supera, se recicla el más antiguo.
  //      Los mensajes (jefes, portal, cofres…) nunca se reciclan.
  // El aspecto y la animación son los mismos: 11px negrita con contorno, sube 24 px y se
  // desvanece en 650 ms.
  // ---------------------------------------------------------------------------

  addFloatingText(x, y, text, color) {
    this.spawnFloatingLabel(x, y, text, color, false);
  },

  // Igual que addFloatingText pero para números de daño: cuenta para el tope en pantalla.
  addDamageNumber(x, y, text, color) {
    this.spawnFloatingLabel(x, y, text, color, true);
  },

  initFloatingLabels() {
    this.floatingLabelCache = new Map(); // clave -> { texKey, w, h, uses }
    this.floatingLabelActive = [];       // { img, entry, t, y0, isDamage }
    this.floatingLabelFree = [];         // Images ocultas listas para reutilizar
    this.floatingLabelTexSeq = 0;
    this.floatingLabelFontGen = 0;
    // Si la fuente Chakra Petch termina de cargar después, se regeneran las texturas nuevas con ella.
    if (document.fonts && document.fonts.addEventListener) {
      document.fonts.addEventListener('loadingdone', () => { this.floatingLabelFontGen++; });
    }
    this.floatingLabelStamp = this.add.text(-10000, -10000, '', {
      fontFamily: '"Chakra Petch", sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      resolution: getDpr()
    }).setVisible(false).setActive(false);
  },

  getFloatingLabelTexture(text, color) {
    const cache = this.floatingLabelCache;
    const key = `${this.floatingLabelFontGen}|${color}|${text}`;
    let entry = cache.get(key);
    if (entry) {
      // Se mueve al final del Map = usada recientemente.
      cache.delete(key);
      cache.set(key, entry);
      return entry;
    }

    const stamp = this.floatingLabelStamp;
    stamp.setColor(color);
    stamp.setText(String(text));
    const src = stamp.canvas;
    const copy = document.createElement('canvas');
    copy.width = src.width;
    copy.height = src.height;
    copy.getContext('2d').drawImage(src, 0, 0);
    const texKey = `__floatlabel_${this.floatingLabelTexSeq++}`;
    this.textures.addCanvas(texKey, copy);
    entry = { texKey, w: stamp.width, h: stamp.height, uses: 0 };
    cache.set(key, entry);

    // Límite de la caché: se eliminan las texturas más antiguas que no estén en pantalla.
    if (cache.size > FLOATING_LABEL_CACHE_MAX) {
      for (const [k, e] of cache) {
        if (cache.size <= FLOATING_LABEL_CACHE_MAX) break;
        if (e.uses > 0 || e === entry) continue;
        cache.delete(k);
        this.textures.remove(e.texKey);
      }
    }
    return entry;
  },

  spawnFloatingLabel(x, y, text, color, isDamage) {
    if (!this.floatingLabelCache) this.initFloatingLabels();
    const entry = this.getFloatingLabelTexture(text, color);
    const active = this.floatingLabelActive;

    let item = null;
    if (isDamage) {
      let damageCount = 0;
      let oldest = null;
      for (const it of active) {
        if (!it.isDamage) continue;
        damageCount++;
        if (!oldest || it.t > oldest.t) oldest = it;
      }
      if (damageCount >= MAX_DAMAGE_NUMBERS && oldest) {
        // Se recicla el número de daño más antiguo (el que más se ha desvanecido).
        oldest.entry.uses--;
        item = oldest;
      }
    }

    if (!item) {
      const img = this.floatingLabelFree.pop() || this.add.image(0, 0, entry.texKey).setOrigin(0.5);
      item = { img, entry: null, t: 0, y0: 0, isDamage };
      active.push(item);
    }

    entry.uses++;
    item.entry = entry;
    item.t = 0;
    item.y0 = y;
    item.isDamage = isDamage;
    item.img
      .setTexture(entry.texKey)
      .setDisplaySize(entry.w, entry.h)
      .setPosition(x, y)
      .setAlpha(1)
      .setVisible(true)
      .setActive(true)
      .setDepth(getWorldEntityDepth(y, 11000));
  },

  // Avanza la animación de todos los textos flotantes (se llama desde update()).
  updateFloatingLabels(dt) {
    const active = this.floatingLabelActive;
    if (!active || active.length === 0) return;
    let write = 0;
    for (let i = 0; i < active.length; i++) {
      const it = active[i];
      it.t += dt;
      const p = it.t / FLOATING_LABEL_DURATION;
      if (p >= 1) {
        this.releaseFloatingLabel(it);
        continue;
      }
      it.img.y = it.y0 - 24 * p;
      it.img.alpha = 1 - p;
      active[write++] = it;
    }
    active.length = write;
  },

  releaseFloatingLabel(it) {
    if (it.entry) it.entry.uses--;
    it.entry = null;
    it.img.setVisible(false).setActive(false);
    this.floatingLabelFree.push(it.img);
  },

  clearFloatingLabels() {
    if (!this.floatingLabelActive) return;
    for (const it of this.floatingLabelActive) this.releaseFloatingLabel(it);
    this.floatingLabelActive.length = 0;
  },

  showHordeBanner(msg, color = '#ef4444') {
    if (!this.hordeBannerText) return;
    this.tweens.killTweensOf(this.hordeBannerText);
    this.hordeBannerText
      .setPosition(this.scale.width / 2, 86)
      .setText(msg)
      .setColor(color)
      .setAlpha(1)
      .setVisible(true);

    this.tweens.add({
      targets: this.hordeBannerText,
      alpha: 0.15,
      duration: 280,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        if (this.hordeBannerText) {
          this.hordeBannerText.setVisible(false);
          this.hordeBannerText.setAlpha(1);
        }
      }
    });
  },

  spawnFireworkBurst() {
    const colors = [0xfacc15, 0x38bdf8, 0xf43f5e, 0xc084fc, 0x4ade80, 0xfb923c];
    const cx = Phaser.Math.Between(Math.round(this.scale.width * 0.15), Math.round(this.scale.width * 0.85));
    const cy = Phaser.Math.Between(Math.round(this.scale.height * 0.14), Math.round(this.scale.height * 0.55));
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = 26;

    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.15;
      const spd = Phaser.Math.Between(70, 210);
      this.fireworksParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0.9 + Math.random() * 0.35,
        maxLife: 1.25,
        color,
        size: Math.random() < 0.4 ? 3.5 : 2.5
      });
    }
    AudioSys.fireworkPop();
  },

  updateFireworks(dt) {
    if (!this.fireworksGraphics) return;
    const g = this.fireworksGraphics;
    g.clear();

    if ((this.gameState === 'LEVELUP' && this._currentTicketHasFireworks) || this.victoryFireworksActive) {
      this.fireworkSpawnTimer -= dt;
      if (this.fireworkSpawnTimer <= 0) {
        this.spawnFireworkBurst();
        this.fireworkSpawnTimer = this.victoryFireworksActive ? 0.38 : 0.65;
      }
    }

    if (!this.fireworksParticles || this.fireworksParticles.length === 0) return;

    const alive = [];
    for (const p of this.fireworksParticles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += 120 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      g.fillStyle(p.color, alpha);
      g.fillCircle(p.x, p.y, p.size);
      alive.push(p);
    }
    this.fireworksParticles = alive;
  },

  clearFireworks() {
    this.fireworksParticles = [];
    if (this.fireworksGraphics) this.fireworksGraphics.clear();
  }
};
