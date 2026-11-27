// @ts-nocheck
// Progreso permanente (chatarra y mejoras compradas) guardado en localStorage.

export const META_STORAGE_KEY = 'gsosito_survivor_meta_v1';

export function getEmptyMeta() {
  return {
    chapas: 0,
    levels: {
      perm_hp: 0,
      perm_speed: 0,
      perm_dmg: 0,
      perm_dmg_red: 0,
      perm_xp: 0
    }
  };
}

export function loadMeta() {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      chapas: Number(parsed?.chapas) || 0,
      levels: {
        perm_hp: Number(parsed?.levels?.perm_hp) || 0,
        perm_speed: Number(parsed?.levels?.perm_speed) || 0,
        perm_dmg: Number(parsed?.levels?.perm_dmg) || 0,
        perm_dmg_red: Number(parsed?.levels?.perm_dmg_red) || 0,
        perm_xp: Number(parsed?.levels?.perm_xp) || 0
      }
    };
  } catch (e) {
    return getEmptyMeta();
  }
}

export function saveMeta(meta) {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  } catch (e) {}
}

export function resetMeta() {
  const empty = getEmptyMeta();
  saveMeta(empty);
  refreshMenuChatarraUI();
  return empty;
}

export function getUpgradeCost(upg, currentLevel) {
  return upg.baseCost + currentLevel * upg.stepCost;
}

export function refreshMenuChatarraUI() {
  const meta = loadMeta();
  const menuEl = document.getElementById('menu-chapas-val');
  const shopEl = document.getElementById('shop-chapas-val');
  if (menuEl) menuEl.textContent = String(meta.chapas);
  if (shopEl) shopEl.textContent = String(meta.chapas);
}
