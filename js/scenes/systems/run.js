// @ts-nocheck
// Ciclo de vida de la partida: empezar, pausar, terminar, volver al menú.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
import { AudioSys } from '../../audio.js?v=8';
import { startScreen, pauseScreen, optionsModal, confirmResetModal, gameoverScreen, removeDomElement } from '../../dom.js?v=8';
import { loadMeta, saveMeta, refreshMenuChatarraUI } from '../../meta.js?v=8';
import { checkOrientation } from '../../orientation.js?v=8';
import { formatTime } from '../../utils.js?v=8';

export const RunMethods = {
  handleOrientationPause(isPortrait) {
    if (isPortrait) {
      if (this.gameState === 'PLAYING') {
        this._pausedByPortrait = true;
        this.gameState = 'PAUSED';
        this.physics.pause();
        this.resetJoystick();
        this.updatePauseButtonVisibility();
      }
    } else if (this._pausedByPortrait) {
      this._pausedByPortrait = false;
      const isPauseMenuOpen = pauseScreen && !pauseScreen.classList.contains('hidden');
      const isOptionsOpen = optionsModal && !optionsModal.classList.contains('hidden');
      const isFusionOpen = Boolean(document.getElementById('fusion-evolution-modal'));
      if (this.gameState === 'PAUSED' && !isPauseMenuOpen && !isOptionsOpen && !isFusionOpen) {
        this.physics.resume();
        this.gameState = 'PLAYING';
        this.updatePauseButtonVisibility();
      }
    }
  },

  // physics.pause() no detiene this.time ni los tweens. Esto los sincroniza con el estado:
  // - PAUSED: se congelan temporizadores y tweens (sierras, cargas del Coloso, textos…).
  // - LEVELUP / FUSION_MODAL: solo temporizadores (el ticket térmico se anima con tweens).
  syncWorldClock() {
    const timersPaused = this.gameState === 'PAUSED' || this.gameState === 'LEVELUP' || this.gameState === 'FUSION_MODAL';
    if (this.time.paused !== timersPaused) this.time.paused = timersPaused;
    const tweensPaused = this.gameState === 'PAUSED';
    if (tweensPaused && !this.tweens.paused) this.tweens.pauseAll();
    else if (!tweensPaused && this.tweens.paused) this.tweens.resumeAll();
  },

  pauseGame() {
    if (this.gameState !== 'PLAYING') return;
    this._pausedByPortrait = false;
    this.gameState = 'PAUSED';
    this.physics.pause();
    this.resetJoystick();
    if (pauseScreen) pauseScreen.classList.remove('hidden');
    this.updatePauseButtonVisibility();
  },

  resumeGame() {
    if (this.gameState !== 'PAUSED') return;
    this._pausedByPortrait = false;
    if (confirmResetModal) confirmResetModal.classList.add('hidden');
    if (optionsModal) optionsModal.classList.add('hidden');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    this.physics.resume();
    this.gameState = 'PLAYING';
    this.updatePauseButtonVisibility();
  },

  togglePause() {
    if (this.gameState === 'PLAYING') {
      this.pauseGame();
    } else if (this.gameState === 'PAUSED') {
      this.resumeGame();
    }
  },

  // Destruye todo lo que pertenece a una partida (enemigos, gemas, proyectiles, drones,
  // portal, sala CRA, puerta, modales y fuegos artificiales) y deja el mundo exterior visible.
  clearRunEntities() {
    this.clearFloatingLabels();
    this.clearPortalVisuals();
    this.clearDimensionRoomVisuals();
    this.clearExitDoorVisuals();
    removeDomElement('fusion-evolution-modal');
    removeDomElement('victory-screen-modal');
    this.clearFireworks();
    this.victoryFireworksActive = false;
    this.victoryFireworksTimer = 0;
    this._currentTicketHasFireworks = false;

    this.inCraDimension = false;
    this.dimensionReturnPos = null;
    this.dimensionSavedEnemies = [];
    this.dimensionSavedGems = [];
    this.dimensionTransitionLock = false;
    if (this.bgTile) this.bgTile.setVisible(true);
    this.setOverworldPropsActive(true);

    // Los enemigos/gemas guardados al entrar en la sala CRA siguen dentro de sus grupos,
    // así que clear() también los destruye.
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);
    this.gems.getChildren().forEach(gm => this.destroyChestBeam(gm));
    this.gems.clear(true, true);
    this.drones.forEach(d => d.destroy());
    this.drones = [];
    if (this.tamperFxGraphics) this.tamperFxGraphics.clear();
    if (this.enemyHpBarsGraphics) this.enemyHpBarsGraphics.clear();
    if (this.stunFxGraphics) this.stunFxGraphics.clear();

    this.lastHitBossSprite = null;
    this._pausedByPortrait = false;

    if (this.hordeBannerText) {
      this.tweens.killTweensOf(this.hordeBannerText);
      this.hordeBannerText.setVisible(false).setAlpha(1);
    }
  },

  // Valores iniciales de todos los contadores y banderas de una partida.
  resetRunState() {
    this.elapsedTime = 0;
    this.score = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.runChapasCollected = 0;
    this.bonusChapasEarned = 0;
    this.bossSpawnCount = 0;
    this.tolcrapSpawned = false;
    this.supremeColossusSpawned = false;
    this.spawnTimer = 0;
    this.lastHitBossSprite = null;
    this.pendingLevelUps = 0;
    this.levelUpHoldTimer = 0;

    this.runPortalRollDone = false;
    this.runHasDimensionPortal = false;
    this.dimensionEventChecked = false;
    this.dimensionPortalSpawned = false;
    this.portalCheckTimer = 8;
    this.corruptAreaZones = [];
    this.corruptAttackTimer = 1.6;
    this.corruptAttackIndex = 0;
    this.corruptDashState = null;

    this.horde1Triggered = false;
    this.horde2Triggered = false;
    this.horde3Triggered = false;
    this.horde3SecondWaveTimer = 0;
    this.hordeActiveTimer = 0;
    this.hordeTier = 0;
    this.levelCleared = false;
    this.victoryFireworksActive = false;
    this.victoryFireworksTimer = 0;
  },

  // Muestra/oculta los props del mapa exterior y activa/desactiva sus colisiones.
  setOverworldPropsActive(active) {
    this.solidProps.getChildren().forEach(p => {
      if (!p) return;
      p.setVisible(active);
      if (p.body) p.body.enable = active;
    });
  },

  // Detiene la partida en un estado final (GAMEOVER o VICTORY).
  freezeRun(finalState) {
    this.clearPortalVisuals();
    this.clearDimensionRoomVisuals();
    this.clearExitDoorVisuals();
    removeDomElement('fusion-evolution-modal');
    removeDomElement('victory-screen-modal');
    this._currentTicketHasFireworks = false;
    this.inCraDimension = false;
    this.gameState = finalState;
    this.physics.pause();
    this.resetJoystick();
    this._pausedByPortrait = false;
    this.updatePauseButtonVisibility();
  },

  // Suma la chatarra de la partida al guardado permanente y devuelve el total ganado.
  commitRunChapas() {
    const earnedChapas = (this.runChapasCollected || 0) + (this.bonusChapasEarned || 0);
    const meta = loadMeta();
    meta.chapas += earnedChapas;
    saveMeta(meta);
    refreshMenuChatarraUI();
    return earnedChapas;
  },

  startGame() {
    AudioSys.init();
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }

    this.clearRunEntities();
    this.resetRunState();

    this.player.setPosition(0, 0);
    this.player.setVelocity(0, 0);
    this.player.setData('stats', this.getDefaultStats());

    startScreen.classList.add('hidden');
    this.hideAllMenuOverlays();

    this.physics.resume();
    this.gameState = 'PLAYING';
    this.updatePauseButtonVisibility();
    checkOrientation();
  },

  returnToMenu() {
    this.clearRunEntities();
    this.player.setPosition(0, 0);
    this.player.setVelocity(0, 0);

    refreshMenuChatarraUI();
    this.hideAllMenuOverlays();
    startScreen.classList.remove('hidden');
    this.gameState = 'MENU';
    this.updatePauseButtonVisibility();
  },

  endGame() {
    if (this.gameState === 'GAMEOVER') return;
    this.freezeRun('GAMEOVER');
    this.clearFireworks();
    this.victoryFireworksActive = false;
    this.victoryFireworksTimer = 0;

    const st = this.player.getData('stats');
    const earnedChapas = this.commitRunChapas();

    document.getElementById('final-time').textContent = formatTime(this.elapsedTime);
    document.getElementById('final-level').textContent = String(st.level);
    document.getElementById('final-kills').textContent = String(this.kills);
    document.getElementById('final-score').textContent = String(this.score);
    const finalChatarraEl = document.getElementById('final-chapas');
    if (finalChatarraEl) finalChatarraEl.textContent = `+${earnedChapas}`;
    gameoverScreen.classList.remove('hidden');
  },

  completeLevelVictory() {
    if (this.gameState === 'VICTORY' || this.gameState === 'GAMEOVER') return;
    // Los fuegos artificiales de victoria siguen detrás del modal; se paran al volver al menú o reiniciar.
    this.freezeRun('VICTORY');

    AudioSys.fusionUnlock();

    const st = this.player.getData('stats');
    const clearBonusChapas = 30;
    this.bonusChapasEarned = (this.bonusChapasEarned || 0) + clearBonusChapas;
    const earnedChapas = this.commitRunChapas();
    const timeLabel = formatTime(this.elapsedTime);

    const hasEndImg = this.hasValidTexture('end_bg');

    const victoryModal = document.createElement('div');
    victoryModal.id = 'victory-screen-modal';

    victoryModal.innerHTML = `
      <div class="victory-card">
        <div class="victory-badge">🏆 ¡NIVEL COMPLETADO! 🏆</div>

        <h2 class="victory-title">¡ENHORABUENA!</h2>

        ${hasEndImg ? `
          <div class="victory-image">
            <img src="img/end.jpg" alt="Victoria" class="victory-image-img">
          </div>
        ` : `
          <div class="victory-fallback">
            🎆 ¡Has sobrevivido al perímetro y derrotado al Jefe Supremo! 🎆
          </div>
        `}

        <div class="victory-stats">
          <div>⏱️ Tiempo: <strong style="color:#38bdf8;">${timeLabel}</strong></div>
          <div>⭐ Nivel: <strong style="color:#facc15;">NV.${st.level}</strong></div>
          <div>💀 Bajas: <strong style="color:#f87171;">${this.kills}</strong></div>
          <div>🎯 Puntos: <strong style="color:#c084fc;">${this.score}</strong></div>
          <div class="victory-total">
            <span>⚙️ Chatarra total obtenida (+${clearBonusChapas} bonus):</span>
            <strong style="color:#fde047;font-size:15px;">+${earnedChapas}</strong>
          </div>
        </div>

        <div class="victory-buttons">
          <button id="victory-restart-btn" type="button" class="action-btn victory-btn">🔄 Jugar de nuevo</button>
          <button id="victory-menu-btn" type="button" class="action-btn victory-btn">🏠 Menú principal</button>
        </div>
      </div>
    `;

    document.body.appendChild(victoryModal);

    const vRestartBtn = document.getElementById('victory-restart-btn');
    if (vRestartBtn) {
      vRestartBtn.onclick = (e) => {
        e.stopPropagation();
        victoryModal.remove();
        this.startGame();
      };
    }

    const vMenuBtn = document.getElementById('victory-menu-btn');
    if (vMenuBtn) {
      vMenuBtn.onclick = (e) => {
        e.stopPropagation();
        victoryModal.remove();
        this.returnToMenu();
      };
    }
  },

  // Eventos de la partida por tiempo: fuegos de victoria, portal, hordas y jefes.
  updateRunEvents(dt) {
    if (this.victoryFireworksTimer > 0) {
      this.victoryFireworksTimer = Math.max(0, this.victoryFireworksTimer - dt);
      if (this.victoryFireworksTimer <= 0) {
        this.victoryFireworksActive = false;
      }
    }

    if (!this.inCraDimension && !this.levelCleared) {
      this.tryRollDimensionPortal(dt);
      this.updateDimensionPortalTimer(dt);
    }

    // Hordas y jefes del mapa exterior: esperan a que el jugador salga de la sala CRA
    // (antes podían aparecer dentro de la sala si se alargaba el combate).
    if (!this.levelCleared && !this.inCraDimension) {
      if (!this.horde1Triggered && this.elapsedTime >= 240) {
        this.triggerFirstHordeEvent();
      }

      if (!this.tolcrapSpawned && this.elapsedTime >= 330) {
        this.tolcrapSpawned = true;
        this.spawnEnemy(true, false);
      }

      if (!this.horde2Triggered && this.elapsedTime >= 540) {
        this.triggerSecondHordeEvent();
      }

      if (!this.supremeColossusSpawned && this.elapsedTime >= 720) {
        this.supremeColossusSpawned = true;
        this.spawnEnemy(true, true);
        this.spawnBlockingFormation(7, true);
      }

      if (!this.horde3Triggered && this.elapsedTime >= 1080) {
        this.triggerThirdDeadlyHordeEvent();
      }

      if (this.horde3SecondWaveTimer > 0) {
        this.horde3SecondWaveTimer -= dt;
        if (this.horde3SecondWaveTimer <= 0) {
          this.horde3SecondWaveTimer = 0;
          this.spawnDeadlyWave(20);
        }
      }
    }

    if (this.hordeActiveTimer > 0) {
      this.hordeActiveTimer = Math.max(0, this.hordeActiveTimer - dt);
      if (this.hordeActiveTimer <= 0) {
        this.hordeTier = 0;
      }
    }
  }
};
