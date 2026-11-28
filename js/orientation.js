// @ts-nocheck
// Detección de orientación vertical/horizontal y pausa automática.
import { rotateScreen } from './dom.js?v=10';

let activeSceneRef = null;

// La escena se registra desde create() para poder pausarla al girar el móvil.
export function setActiveScene(scene) {
  activeSceneRef = scene;
}

function getRotateScreenElement() {
  const el = document.getElementById('rotate-screen') || rotateScreen;
  if (el) return el;
  return null;
}

export function isPortraitViewport() {
  const vv = window.visualViewport;
  const w = (vv && vv.width) ? vv.width : (window.innerWidth || document.documentElement.clientWidth || 0);
  const h = (vv && vv.height) ? vv.height : (window.innerHeight || document.documentElement.clientHeight || 0);
  if (w > 0 && h > 0) {
    return h > w;
  }
  if (window.matchMedia) {
    return window.matchMedia('(orientation: portrait)').matches;
  }
  return false;
}

export function checkOrientation() {
  const screenEl = getRotateScreenElement();
  const isPortrait = isPortraitViewport();
  if (screenEl) {
    if (isPortrait) {
      screenEl.classList.remove('hidden');
      screenEl.style.removeProperty('display');
      if (getComputedStyle(screenEl).display === 'none') {
        screenEl.style.setProperty('display', 'flex', 'important');
      }
      screenEl.style.setProperty('z-index', '2147483647', 'important');
    } else {
      screenEl.classList.add('hidden');
      screenEl.style.setProperty('display', 'none', 'important');
    }
  }
  if (activeSceneRef && typeof activeSceneRef.handleOrientationPause === 'function') {
    activeSceneRef.handleOrientationPause(isPortrait);
  }
}

const scheduleOrientationCheck = () => {
  checkOrientation();
  requestAnimationFrame(checkOrientation);
  setTimeout(checkOrientation, 120);
  setTimeout(checkOrientation, 350);
};

window.addEventListener('resize', scheduleOrientationCheck);

window.addEventListener('orientationchange', scheduleOrientationCheck);

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleOrientationCheck);
}

if (screen && screen.orientation && typeof screen.orientation.addEventListener === 'function') {
  screen.orientation.addEventListener('change', scheduleOrientationCheck);
}

document.addEventListener('DOMContentLoaded', checkOrientation);
scheduleOrientationCheck();
