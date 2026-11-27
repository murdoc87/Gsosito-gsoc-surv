// @ts-nocheck
// Menús y modales HTML: opciones, tienda, pantalla completa, avisos.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
import { AudioSys } from '../../audio.js?v=8';
import { SHOP_UPGRADES } from '../../data/shop.js?v=8';
import { levelupScreen, pauseScreen, optionsModal, confirmResetModal, gameoverScreen, upgradesModal, charactersModal, shopUpgradesList, hudPauseBtn } from '../../dom.js?v=8';
import { loadMeta, saveMeta, resetMeta, getUpgradeCost, refreshMenuChatarraUI } from '../../meta.js?v=8';

export const UiMethods = {
  updatePauseButtonVisibility() {
    // Se llama en cada cambio de estado, así que también sincroniza el reloj del mundo.
    this.syncWorldClock();
    if (!hudPauseBtn) return;
    if (this.gameState === 'PLAYING' || this.gameState === 'PAUSED') {
      hudPauseBtn.classList.remove('hidden');
      hudPauseBtn.textContent = this.gameState === 'PAUSED' ? '▶' : '⏸';
    } else {
      hudPauseBtn.classList.add('hidden');
    }
  },

  hideAllMenuOverlays() {
    gameoverScreen.classList.add('hidden');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    if (confirmResetModal) confirmResetModal.classList.add('hidden');
    if (optionsModal) optionsModal.classList.add('hidden');
    if (charactersModal) charactersModal.classList.add('hidden');
    if (upgradesModal) upgradesModal.classList.add('hidden');
    document.body.classList.remove('shop-modal-open');
    this.hideThermalPaperGraphic();
    levelupScreen.classList.add('hidden');
  },

  ensureInRunOptionsControls() {
    if (!optionsModal) return;
    let container = document.getElementById('inrun-options-actions');
    if (!container) {
      container = document.createElement('div');
      container.id = 'inrun-options-actions';
      container.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:10px;';

      const restartRunBtn = document.createElement('button');
      restartRunBtn.type = 'button';
      restartRunBtn.className = 'action-btn';
      restartRunBtn.textContent = '🔄 Reiniciar partida';
      restartRunBtn.onclick = (e) => {
        e.stopPropagation();
        this.startGame();
      };

      const returnMenuRunBtn = document.createElement('button');
      returnMenuRunBtn.type = 'button';
      returnMenuRunBtn.className = 'action-btn';
      returnMenuRunBtn.textContent = '🏠 Volver al menú principal';
      returnMenuRunBtn.onclick = (e) => {
        e.stopPropagation();
        this.returnToMenu();
      };

      container.appendChild(restartRunBtn);
      container.appendChild(returnMenuRunBtn);

      const closeBtn = document.getElementById('close-options-btn');
      if (closeBtn && closeBtn.parentElement) {
        closeBtn.parentElement.insertBefore(container, closeBtn);
      } else {
        optionsModal.appendChild(container);
      }
    }

    const inRun = this.isInActiveRun();
    container.style.display = inRun ? 'flex' : 'none';

    const resetBtn = document.getElementById('reset-data-btn');
    const resetBox = resetBtn ? resetBtn.parentElement : null;
    const feedbackEl = document.getElementById('reset-data-feedback');
    if (resetBox) {
      resetBox.style.display = inRun ? 'none' : '';
    } else if (resetBtn) {
      resetBtn.style.display = inRun ? 'none' : '';
    }
    if (feedbackEl) {
      feedbackEl.style.display = inRun ? 'none' : '';
      if (!inRun) feedbackEl.textContent = '';
    }
  },

  openOptionsModal() {
    if (!optionsModal) return;
    this.ensureInRunOptionsControls();
    optionsModal.classList.remove('hidden');
  },

  isIOSDevice() {
    const ua = navigator.userAgent || '';
    const iOSByUA = /iPad|iPhone|iPod/.test(ua);
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return iOSByUA || iPadOS;
  },

  isStandaloneApp() {
    return (
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    );
  },

  showToastMessage(text, duration = 4500) {
    const toast = document.getElementById('ios-fs-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.remove('hidden');
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  },

  showIOSFullscreenHint() {
    if (this.isStandaloneApp()) {
      this.showToastMessage('Ya estás ejecutando el juego en modo pantalla completa de iOS.', 3000);
      return;
    }
    this.showToastMessage(
      'En iPhone/iPad: pulsa Compartir (↑) en Safari y elige "Añadir a pantalla de inicio" para jugar a pantalla completa.',
      5500
    );
  },

  triggerFullscreenOrIOSGuide() {
    AudioSys.init();

    const isFullscreenNow = Boolean(
      document.fullscreenElement || document.webkitFullscreenElement
    );

    if (isFullscreenNow) {
      const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
      if (exitFs) {
        Promise.resolve(exitFs.call(document)).catch(() => {});
      }
      return;
    }

    const targetEl = document.documentElement;
    const reqFs = targetEl.requestFullscreen || targetEl.webkitRequestFullscreen;

    if (reqFs && !this.isIOSDevice()) {
      Promise.resolve(reqFs.call(targetEl)).catch(() => {
        this.showIOSFullscreenHint();
      });
      return;
    }

    try {
      window.scrollTo(0, 1);
    } catch (e) {}
    this.showIOSFullscreenHint();
  },

  bindUIEvents() {
    refreshMenuChatarraUI();
    if (this._uiBound) return;
    this._uiBound = true;

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.onclick = (e) => {
        e.stopPropagation();
        this.startGame();
      };
    }

    const upgradesBtn = document.getElementById('upgrades-btn');
    if (upgradesBtn) {
      upgradesBtn.onclick = (e) => {
        e.stopPropagation();
        this.openUpgradesModal();
      };
    }

    const closeUpgradesBtn = document.getElementById('close-upgrades-btn');
    if (closeUpgradesBtn) {
      closeUpgradesBtn.onclick = (e) => {
        e.stopPropagation();
        if (upgradesModal) upgradesModal.classList.add('hidden');
        document.body.classList.remove('shop-modal-open');
        refreshMenuChatarraUI();
      };
    }

    const charactersBtn = document.getElementById('characters-btn');
    if (charactersBtn) {
      charactersBtn.onclick = (e) => {
        e.stopPropagation();
        if (charactersModal) charactersModal.classList.remove('hidden');
      };
    }

    const closeCharactersBtn = document.getElementById('close-characters-btn');
    if (closeCharactersBtn) {
      closeCharactersBtn.onclick = (e) => {
        e.stopPropagation();
        if (charactersModal) charactersModal.classList.add('hidden');
      };
    }

    const optionsBtn = document.getElementById('options-btn');
    if (optionsBtn) {
      optionsBtn.onclick = (e) => {
        e.stopPropagation();
        this.openOptionsModal();
      };
    }

    const pauseOptionsBtn = document.getElementById('pause-options-btn');
    if (pauseOptionsBtn) {
      pauseOptionsBtn.onclick = (e) => {
        e.stopPropagation();
        this.openOptionsModal();
      };
    }

    const closeOptionsBtn = document.getElementById('close-options-btn');
    if (closeOptionsBtn) {
      closeOptionsBtn.onclick = (e) => {
        e.stopPropagation();
        if (optionsModal) optionsModal.classList.add('hidden');
      };
    }

    const resetDataBtn = document.getElementById('reset-data-btn');
    const confirmResetYesBtn = document.getElementById('confirm-reset-yes-btn');
    const confirmResetNoBtn = document.getElementById('confirm-reset-no-btn');

    if (resetDataBtn) {
      resetDataBtn.onclick = (e) => {
        e.stopPropagation();
        if (this.isInActiveRun()) return;
        if (confirmResetModal) {
          confirmResetModal.classList.remove('hidden');
        } else {
          resetMeta();
        }
      };
    }

    if (confirmResetNoBtn) {
      confirmResetNoBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirmResetModal) confirmResetModal.classList.add('hidden');
      };
    }

    if (confirmResetYesBtn) {
      confirmResetYesBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirmResetModal) confirmResetModal.classList.add('hidden');
        if (this.isInActiveRun()) return;
        resetMeta();
        if (shopUpgradesList && upgradesModal && !upgradesModal.classList.contains('hidden')) {
          this.renderShopUpgrades();
        }
        const feedbackEl = document.getElementById('reset-data-feedback');
        if (feedbackEl) {
          feedbackEl.style.color = '#4ade80';
          feedbackEl.textContent = '✓ Datos borrados. Chatarra y mejoras reiniciadas a 0.';
        }
      };
    }

    if (hudPauseBtn) {
      hudPauseBtn.onclick = (e) => {
        e.stopPropagation();
        this.togglePause();
      };
    }

    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      resumeBtn.onclick = (e) => {
        e.stopPropagation();
        this.resumeGame();
      };
    }

    const pauseMenuBtn = document.getElementById('pause-menu-btn');
    if (pauseMenuBtn) {
      pauseMenuBtn.onclick = (e) => {
        e.stopPropagation();
        this.returnToMenu();
      };
    }

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.onclick = (e) => {
        e.stopPropagation();
        this.startGame();
      };
    }

    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
      menuBtn.onclick = (e) => {
        e.stopPropagation();
        this.returnToMenu();
      };
    }

    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
      fsBtn.onclick = (e) => {
        e.stopPropagation();
        this.triggerFullscreenOrIOSGuide();
      };

      const onFsChange = () => {
        const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        fsBtn.textContent = active ? '✕' : '⛶';
        fsBtn.title = active ? 'Salir de pantalla completa' : 'Pantalla completa';
      };

      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);
    }

    const toastEl = document.getElementById('ios-fs-toast');
    if (toastEl) {
      toastEl.onclick = (e) => {
        e.stopPropagation();
        toastEl.classList.add('hidden');
      };
    }
  },

  openUpgradesModal() {
    if (!upgradesModal || !shopUpgradesList) return;
    this.renderShopUpgrades();
    upgradesModal.classList.remove('hidden');
    document.body.classList.add('shop-modal-open');
  },

  renderShopUpgrades() {
    const inspectorEl = document.getElementById('shop-upgrade-inspector');
    if (!shopUpgradesList || !inspectorEl) return;
    const meta = loadMeta();
    refreshMenuChatarraUI();

    if (!this.selectedShopUpgradeId || !SHOP_UPGRADES.some(u => u.id === this.selectedShopUpgradeId)) {
      this.selectedShopUpgradeId = SHOP_UPGRADES[0]?.id;
    }

    const selectedUpg = SHOP_UPGRADES.find(u => u.id === this.selectedShopUpgradeId) || SHOP_UPGRADES[0];

    const buySelectedUpgrade = (upg) => {
      const latest = loadMeta();
      const lvl = latest.levels[upg.id] || 0;
      const price = getUpgradeCost(upg, lvl);
      if (lvl < upg.maxLevel && latest.chapas >= price) {
        latest.chapas -= price;
        latest.levels[upg.id] = lvl + 1;
        saveMeta(latest);
        AudioSys.pickup();
        this.renderShopUpgrades();
      }
    };

    shopUpgradesList.innerHTML = '';
    SHOP_UPGRADES.forEach(upg => {
      const currentLvl = meta.levels[upg.id] || 0;
      const isMax = currentLvl >= upg.maxLevel;
      const cost = getUpgradeCost(upg, currentLvl);
      const isSelected = selectedUpg && upg.id === selectedUpg.id;

      const slotBtn = document.createElement('button');
      slotBtn.type = 'button';
      slotBtn.className = `vending-slot${isSelected ? ' is-selected' : ''}`;
      slotBtn.innerHTML = `
        <span class="vending-slot-icon">${upg.icon || '⚙️'}</span>
        <span class="vending-slot-name">${upg.name}</span>
        <span class="vending-slot-price${isMax ? ' is-max' : ''}">
          ${isMax ? 'MÁX' : `<img src="img/chapa.png" alt="" width="11" height="11" style="image-rendering:pixelated;">${cost}`}
        </span>
      `;

      slotBtn.onclick = (e) => {
        e.stopPropagation();
        this.selectedShopUpgradeId = upg.id;
        AudioSys.pickup();
        this.renderShopUpgrades();
      };

      shopUpgradesList.appendChild(slotBtn);
    });

    if (!selectedUpg) {
      inspectorEl.innerHTML = '';
      return;
    }

    const selLvl = meta.levels[selectedUpg.id] || 0;
    const selIsMax = selLvl >= selectedUpg.maxLevel;
    const selCost = getUpgradeCost(selectedUpg, selLvl);
    const canAfford = !selIsMax && meta.chapas >= selCost;

    inspectorEl.innerHTML = `
      <div>
        <div class="vending-inspector-head">
          <div class="vending-inspector-icon">${selectedUpg.icon || '⚙️'}</div>
          <div>
            <div class="vending-inspector-title">${selectedUpg.name}</div>
            <div class="vending-inspector-level">NIVEL ${selLvl} / ${selectedUpg.maxLevel}</div>
          </div>
        </div>
        <p class="vending-inspector-desc" style="margin-top: 10px;">${selectedUpg.desc}</p>
        <div class="vending-inspector-stat" style="margin-top: 8px;">
          <div>${selectedUpg.effectLabel}</div>
          <div style="color: #facc15; margin-top: 3px; font-size: 11.5px;">${selectedUpg.getCurrentBonusLabel ? selectedUpg.getCurrentBonusLabel(selLvl) : ''}</div>
        </div>
        <div class="vending-cost-banner">
          ${
            selIsMax
              ? '<span>MEJORA COMPLETADA</span>'
              : `<img src="img/chapa.png" alt="" width="15" height="15" style="image-rendering:pixelated;"><span>COSTE: ${selCost} CHATARRA</span>`
          }
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button id="vending-confirm-buy-btn" type="button" class="action-btn vending-buy-btn" ${canAfford ? '' : 'disabled'}>
          ${selIsMax ? 'MÁXIMO ALCANZADO' : (canAfford ? 'COMPRAR' : 'CHATARRA INSUFICIENTE')}
        </button>
      </div>
    `;

    const confirmBtn = document.getElementById('vending-confirm-buy-btn');
    if (confirmBtn && canAfford) {
      confirmBtn.onclick = (e) => {
        e.stopPropagation();
        buySelectedUpgrade(selectedUpg);
      };
    }
  }
};
