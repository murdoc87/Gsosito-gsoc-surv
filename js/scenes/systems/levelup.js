// @ts-nocheck
// XP, subidas de nivel, ticket térmico y fusión de armas.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
import Phaser from '../../phaser.js?v=10';
import { AudioSys } from '../../audio.js?v=10';
import { canFuseWeapons, getUpgradeTagLabel, UPGRADES } from '../../data/upgrades.js?v=10';
import { levelupScreen, cardsContainer, removeDomElement } from '../../dom.js?v=10';
import { checkOrientation } from '../../orientation.js?v=10';
import { HUD_BASE_DEPTH, formatTime } from '../../utils.js?v=10';

export const LevelUpMethods = {
  // Suma XP y encola TODAS las subidas de nivel que alcance (antes solo se procesaba una).
  addXp(amount, opts = {}) {
    const st = this.player.getData('stats');
    if (!st) return;
    st.xp += amount;
    while (st.xp >= st.xpToNext) {
      st.xp -= st.xpToNext;
      st.level++;
      st.xpToNext = Math.round(st.xpToNext * 1.21 + 8);
      this.pendingLevelUps = (this.pendingLevelUps || 0) + 1;
    }
    if (opts.holdSeconds) {
      this.levelUpHoldTimer = Math.max(this.levelUpHoldTimer || 0, opts.holdSeconds);
    }
    this.tryOpenPendingLevelUp();
  },

  // Abre el siguiente ticket pendiente si la partida está en juego. Se llama también desde update(),
  // así ninguna subida se pierde aunque llegue durante una pausa, un ticket o el modal de fusión.
  tryOpenPendingLevelUp() {
    if (!this.pendingLevelUps || this.gameState !== 'PLAYING' || (this.levelUpHoldTimer || 0) > 0) return;
    this.pendingLevelUps--;
    this.triggerLevelUp();
  },

  triggerLevelUp() {
    if (this.gameState === 'LEVELUP') return;
    this.gameState = 'LEVELUP';
    this.physics.pause();
    this.resetJoystick();
    this.updatePauseButtonVisibility();
    AudioSys.levelUp();
    AudioSys.ticketPrint();

    const st = this.player.getData('stats');
    const availableUpgrades = UPGRADES.filter(u => !u.requires || u.requires(st));

    const rareFourChoice = availableUpgrades.length >= 4 && Math.random() < 0.035;
    const optionCount = rareFourChoice ? Math.min(4, availableUpgrades.length) : Math.min(3, availableUpgrades.length);
    this._currentTicketHasFireworks = rareFourChoice;
    removeDomElement('fusion-evolution-modal');
    this.clearFireworks();
    if (rareFourChoice) {
      this.spawnFireworkBurst();
      this.fireworkSpawnTimer = 0.25;
    }

    const pool = Phaser.Utils.Array.Shuffle([...availableUpgrades]).slice(0, optionCount);
    // Con varias subidas encoladas, st.level ya es el final: se muestra el nivel de ESTE ticket.
    const ticketLevel = st.level - (this.pendingLevelUps || 0);
    const ticketNum = String(ticketLevel).padStart(3, '0');

    cardsContainer.innerHTML = `
      <div class="thermal-ticket${rareFourChoice ? ' is-fireworks' : ''}" id="thermal-ticket-box">
        <div class="thermal-header">
          <div class="thermal-brand">${rareFourChoice ? '🎆 *** TICKET DORADO · 4 MEJORAS *** 🎆' : '*** CRA SUMINISTRO TÉRMICO ***'}</div>
          <div class="thermal-meta">TICKET #${ticketNum} · NV.${ticketLevel} · TIEMPO ${formatTime(this.elapsedTime)}</div>
        </div>
        <div class="thermal-items" id="thermal-items-list"></div>
        <div class="thermal-footer">
          <span>${rareFourChoice ? 'EVENTO RARO: 4 OPCIONES' : 'SELECCIONA 1 MEJORA'}</span>
          <span>--UNION--</span>
        </div>
      </div>
    `;

    const itemsList = document.getElementById('thermal-items-list');
    const allOptionButtons = [];

    pool.forEach((upg, idx) => {
      const tagText = getUpgradeTagLabel(upg, st);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thermal-option';
      btn.innerHTML = `
        <div class="thermal-option-top">
          <div class="thermal-option-main">
            <span class="thermal-icon">${upg.icon}</span>
            <div class="thermal-title">0${idx + 1}. ${upg.title}</div>
          </div>
          <span class="thermal-tag">${tagText}</span>
        </div>
        <div class="thermal-desc">${upg.desc}</div>
      `;
      btn.onclick = (e) => {
        e.stopPropagation();
        if (btn.disabled || this.gameState !== 'LEVELUP') return;
        allOptionButtons.forEach(b => { b.disabled = true; });
        removeDomElement('fusion-evolution-modal');

        st.upgradeCounts = st.upgradeCounts || {};
        st.upgradeCounts[upg.id] = (Number(st.upgradeCounts[upg.id]) || 0) + 1;
        upg.apply(st);
        const triggeredFusion = this.checkAndTriggerFusion(st);
        this.syncDrones(st.dronesEnabled ? st.orbitals : 0);
        this._currentTicketHasFireworks = false;
        this.clearFireworks();
        this.hideThermalPaperGraphic();
        levelupScreen.classList.add('hidden');

        if (triggeredFusion) {
          this.physics.pause();
          this.gameState = 'FUSION_MODAL';
          this.updatePauseButtonVisibility();
        } else {
          this._pausedByPortrait = false;
          this.gameState = 'PLAYING';
          this.physics.resume();
          this.updatePauseButtonVisibility();
          checkOrientation();
        }
      };
      allOptionButtons.push(btn);
      itemsList.appendChild(btn);
    });

    levelupScreen.classList.remove('hidden');

    const paperW = Math.min(520, this.scale.width * 0.72);
    const paperH = Math.min(340, this.scale.height * 0.72);
    this.createThermalPaperGraphic(this.scale.width / 2, this.scale.height / 2, paperW, paperH);
  },

  syncThermalBoxToTicketGraphic(finalW, finalH, finalY) {
    const panel = document.querySelector('#levelup-screen .thermal-panel');
    if (!panel) return;

    this._lastThermalDims = { finalW, finalH, finalY };

    const canvasRect = this.sys.game.canvas.getBoundingClientRect();
    const viewW = this.scale.width || 854;
    const viewH = this.scale.height || 480;
    const scaleX = canvasRect.width / viewW;
    const scaleY = canvasRect.height / viewH;

    const isCompact = window.innerHeight <= 500 || canvasRect.height <= 420;
    const topFactor = isCompact ? 0.21 : 0.32;
    const bottomFactor = isCompact ? 0.47 : 0.45;
    const minTopSafePx = canvasRect.top + Math.max(44, canvasRect.height * (isCompact ? 0.20 : 0.13));
    const maxBottomSafePx = canvasRect.bottom - Math.max(6, canvasRect.height * 0.02);

    const graphicTopPx = canvasRect.top + (finalY - finalH * topFactor) * scaleY;
    const graphicBottomPx = canvasRect.top + (finalY + finalH * bottomFactor) * scaleY;

    const clampedTopPx = Math.max(minTopSafePx, graphicTopPx);
    const clampedBottomPx = Math.min(maxBottomSafePx, Math.max(clampedTopPx + 116, graphicBottomPx));
    const availableCenterYPx = (clampedTopPx + clampedBottomPx) / 2;
    const maxBoxHeightPx = Math.max(116, clampedBottomPx - clampedTopPx);

    const widthRatio = isCompact ? 0.92 : 0.90;
    const availableWidthPx = Math.min(680, Math.max(280, Math.max(finalW * widthRatio * scaleX, canvasRect.width * (isCompact ? 0.78 : 0.66))));

    panel.style.position = 'fixed';
    panel.style.left = `${Math.round(canvasRect.left + (this.scale.width / 2) * scaleX)}px`;
    panel.style.top = `${Math.round(availableCenterYPx)}px`;
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.marginTop = '0px';
    panel.style.width = `${Math.round(availableWidthPx)}px`;
    panel.style.maxWidth = '90vw';
    panel.style.maxHeight = `${Math.round(maxBoxHeightPx)}px`;
    panel.style.overflowY = 'auto';
  },

  createThermalPaperGraphic(centerX, targetY, width, height) {
    this.hideThermalPaperGraphic();

    const topMargin = this.scale.height < 420 ? 34 : 68;
    const maxAllowedH = Math.max(200, this.scale.height - topMargin);
    let finalW = width;
    let finalH = maxAllowedH;

    const hasTicketTex = this.hasValidTexture('ticket_img');
    if (hasTicketTex) {
      const srcImg = this.textures.get('ticket_img').getSourceImage();
      const aspect = (srcImg && srcImg.width && srcImg.height) ? (srcImg.width / srcImg.height) : (1533 / 1762);
      finalH = maxAllowedH;
      finalW = Math.round(finalH * aspect);
      if (finalW > this.scale.width * 0.92) {
        finalW = Math.round(this.scale.width * 0.92);
        finalH = Math.round(finalW / aspect);
      }
    }

    const finalY = this.scale.height - finalH / 2 - 2;
    const startY = this.scale.height + finalH / 2 + 12;

    this.syncThermalBoxToTicketGraphic(finalW, finalH, finalY);

    const container = this.add.container(centerX, startY).setScrollFactor(0).setDepth(HUD_BASE_DEPTH - 100);

    if (hasTicketTex) {
      const ticketSprite = this.add.image(0, 0, 'ticket_img');
      ticketSprite.setDisplaySize(finalW, finalH);
      ticketSprite.setAlpha(1);
      ticketSprite.setTint(this._currentTicketHasFireworks ? 0xfef08a : 0xf8fafc);
      container.add(ticketSprite);
    } else {
      const g = this.add.graphics();
      const left = -finalW / 2;
      const top = -finalH / 2;
      g.fillStyle(0xf8fafc, 1);
      g.fillRect(left, top, finalW, finalH);
      g.lineStyle(1.5, 0x94a3b8, 1);
      g.strokeRect(left, top, finalW, finalH);
      container.add(g);
    }

    this.thermalPaperObj = container;

    return new Promise((resolve) => {
      this.tweens.add({
        targets: container,
        y: finalY,
        duration: 460,
        ease: 'Cubic.easeOut',
        onComplete: () => resolve()
      });
    });
  },

  hideThermalPaperGraphic() {
    this._lastThermalDims = null;
    if (this.thermalPaperObj) {
      this.tweens.killTweensOf(this.thermalPaperObj);
      if (this.thermalPaperObj.clearMask) {
        this.thermalPaperObj.clearMask(true);
      }
      this.thermalPaperObj.destroy();
      this.thermalPaperObj = null;
    }
  },

  // --- NOTIFICACIÓN MODAL ESPECTACULAR DE FUSIÓN DE ARMAMENTO ---
  showFusionUnlockBanner() {
    this._pausedByPortrait = false;
    this.gameState = 'FUSION_MODAL';
    this.physics.pause();
    this.resetJoystick();
    this.updatePauseButtonVisibility();

    this.cameras.main.flash(360, 250, 204, 21, false);
    this.cameras.main.shake(260, 0.014);
    AudioSys.fusionUnlock();

    removeDomElement('fusion-evolution-modal');
    const modal = document.createElement('div');
    modal.id = 'fusion-evolution-modal';

    modal.innerHTML = `
      <div id="fusion-evolution-card">
        <div class="fusion-badge">⚡ EVOLUCIÓN DE ARMAMENTO DESBLOQUEADA ⚡</div>
        <div class="fusion-hero-row">
          <div class="fusion-ingredient">🔴 Láser<br><span style="color:#facc15;font-size:10px;">NV. 5+</span></div>
          <div style="font-size:18px;color:#facc15;font-weight:900;">+</div>
          <div class="fusion-result-icon">🟡⚡</div>
          <div style="font-size:18px;color:#facc15;font-weight:900;">+</div>
          <div class="fusion-ingredient">🔮 Domo-Fish<br><span style="color:#38bdf8;font-size:10px;">NV. 5+</span></div>
        </div>
        <div class="fusion-title">RAYO OMEGA SOLAR</div>
        <div class="fusion-desc">
          Tus dos sistemas láser se han fundido en un único núcleo de plasma dorado: emite un <strong>anillo giratorio de 360°</strong> con perforación y dispara <strong>ráfagas concentradas</strong> contra el objetivo más cercano.
        </div>
        <button id="fusion-accept-btn" type="button">¡ENTENDIDO, A REPARTIR CAÑA! ▶</button>
      </div>
    `;

    document.body.appendChild(modal);

    let closed = false;
    const closeFusionModal = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (closed) return;
      closed = true;
      AudioSys.pickup();
      removeDomElement('fusion-evolution-modal');
      this._pausedByPortrait = false;
      this.gameState = 'PLAYING';
      this.physics.resume();
      this.updatePauseButtonVisibility();
      checkOrientation();
    };

    const acceptBtn = document.getElementById('fusion-accept-btn');
    if (acceptBtn) {
      acceptBtn.style.pointerEvents = 'auto';
      acceptBtn.style.position = 'relative';
      acceptBtn.style.zIndex = '2';
      acceptBtn.onclick = closeFusionModal;
    }
  },

  checkAndTriggerFusion(st) {
    if (!canFuseWeapons(st)) return false;
    st.fusionActive = true;
    st.fusionTimer = 0.05;
    st.domoFish.enabled = false;
    this.showFusionUnlockBanner();
    return true;
  },

  // Cuenta atrás de espera y apertura de tickets pendientes. Devuelve false si se ha abierto uno.
  updateLevelUpQueue(dt) {
    if (this.levelUpHoldTimer > 0) {
      this.levelUpHoldTimer = Math.max(0, this.levelUpHoldTimer - dt);
    }
    if (this.pendingLevelUps > 0) {
      this.tryOpenPendingLevelUp();
      if (this.gameState !== 'PLAYING') return false;
    }
    return true;
  }
};
