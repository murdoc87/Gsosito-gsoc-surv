// @ts-nocheck
// Choques de la multitud de enemigos: entre ellos y contra los obstáculos del mapa.
// Métodos de SurvivorScene: se añaden a su prototipo en scenes/SurvivorScene.js.
//
// Antes lo hacían dos "colliders" de Phaser Arcade (enemigos↔enemigos y enemigos↔props).
// Con 165 enemigos eso era ~60 % del tiempo de lógica en móvil: Phaser busca en un árbol
// espacial por cada enemigo y frame. Aquí se hace lo mismo con rejillas espaciales simples:
//   · Enemigo ↔ enemigo: mismo cálculo que Arcade (círculo-círculo: suma de radios menos
//     distancia; cada uno se aparta la mitad, porque todos tienen la misma masa).
//     El Tolcrap usa un rectángulo: se resuelve círculo-rectángulo / rectángulo-rectángulo.
//   · Enemigo ↔ obstáculo: el obstáculo no se mueve; el enemigo sale por el lado más corto.
// El jugador sigue chocando con los obstáculos mediante Phaser (es un solo cuerpo).

// Tamaño de celda de la rejilla de obstáculos (los props están en una rejilla de 420 px).
const PROP_CELL = 128;

export const CrowdMethods = {
  // Rejilla fija con las cajas de colisión de los obstáculos. Se llama tras generar el mapa.
  buildPropGrid() {
    const grid = new Map();
    for (const prop of this.solidProps.getChildren()) {
      const b = prop.body;
      if (!b) continue;
      const bx = b.position.x, by = b.position.y;
      const x0 = Math.floor(bx / PROP_CELL), x1 = Math.floor((bx + b.width) / PROP_CELL);
      const y0 = Math.floor(by / PROP_CELL), y1 = Math.floor((by + b.height) / PROP_CELL);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          const key = gx * 100003 + gy;
          let cell = grid.get(key);
          if (!cell) grid.set(key, (cell = []));
          cell.push(b);
        }
      }
    }
    this.propGrid = grid;
  },

  // Forma de colisión de cada enemigo en este frame, calculada desde el sprite (no desde el
  // cuerpo, que puede ir un frame por detrás si el sprite se acaba de teletransportar).
  readCrowdShapes(enemies) {
    const n = enemies.length;
    const S = this._crowd || (this._crowd = { cx: [], cy: [], hw: [], hh: [], circle: [], idx: [] });
    S.cx.length = S.cy.length = S.hw.length = S.hh.length = S.circle.length = S.idx.length = 0;
    let maxExtent = 0;
    for (let i = 0; i < n; i++) {
      const e = enemies[i];
      const b = e.body;
      if (!e.active || !b || !b.enable) continue;
      const left = e.x + e.scaleX * (b.offset.x - e.displayOriginX);
      const top = e.y + e.scaleY * (b.offset.y - e.displayOriginY);
      S.cx.push(left + b.halfWidth);
      S.cy.push(top + b.halfHeight);
      S.hw.push(b.halfWidth);
      S.hh.push(b.halfHeight);
      S.circle.push(b.isCircle);
      S.idx.push(i);
      const ext = b.isCircle ? b.halfWidth : Math.hypot(b.halfWidth, b.halfHeight);
      if (ext > maxExtent) maxExtent = ext;
    }
    S.maxExtent = maxExtent;
    return S;
  },

  // Paso completo de la multitud: obstáculos primero y después entre enemigos (mismo orden
  // en que se registraban los colliders de Phaser).
  updateCrowdCollisions(enemies) {
    if (enemies.length === 0) return;
    const S = this.readCrowdShapes(enemies);
    const count = S.cx.length;
    if (count === 0) return;

    // Posiciones iniciales para calcular al final cuánto se ha movido cada uno.
    const startX = this._crowdStartX || (this._crowdStartX = []);
    const startY = this._crowdStartY || (this._crowdStartY = []);
    startX.length = startY.length = 0;
    for (let k = 0; k < count; k++) { startX.push(S.cx[k]); startY.push(S.cy[k]); }

    if (!this.inCraDimension && this.propGrid) this.separateCrowdFromProps(S);
    this.separateCrowd(S);

    for (let k = 0; k < count; k++) {
      const dx = S.cx[k] - startX[k];
      const dy = S.cy[k] - startY[k];
      if (dx !== 0 || dy !== 0) {
        const e = enemies[S.idx[k]];
        e.x += dx;
        e.y += dy;
      }
    }
  },

  separateCrowdFromProps(S) {
    const grid = this.propGrid;
    const seen = this._propSeen || (this._propSeen = new Set());
    for (let k = 0; k < S.cx.length; k++) {
      const hw = S.hw[k], hh = S.hh[k];
      const x0 = Math.floor((S.cx[k] - hw) / PROP_CELL), x1 = Math.floor((S.cx[k] + hw) / PROP_CELL);
      const y0 = Math.floor((S.cy[k] - hh) / PROP_CELL), y1 = Math.floor((S.cy[k] + hh) / PROP_CELL);
      seen.clear();
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          const cell = grid.get(gx * 100003 + gy);
          if (!cell) continue;
          for (let c = 0; c < cell.length; c++) {
            const pb = cell[c];
            if (!pb.enable || seen.has(pb)) continue;
            seen.add(pb);
            const pl = pb.position.x, pt = pb.position.y;
            const push = S.circle[k]
              ? circleRectPush(S.cx[k], S.cy[k], hw, pl, pt, pl + pb.width, pt + pb.height)
              : rectRectPush(S.cx[k], S.cy[k], hw, hh, pl, pt, pl + pb.width, pt + pb.height);
            if (push) {
              // El obstáculo es fijo: el enemigo sale entero.
              S.cx[k] += push.x;
              S.cy[k] += push.y;
            }
          }
        }
      }
    }
  },

  separateCrowd(S) {
    const count = S.cx.length;
    // Celda = diámetro del cuerpo más grande: dos cuerpos que se tocan están siempre en celdas
    // vecinas, así que basta con mirar la propia celda y 4 vecinas (sin repetir parejas).
    const cell = Math.max(48, Math.ceil(S.maxExtent * 2));
    const grid = this._crowdGrid || (this._crowdGrid = new Map());
    for (const arr of grid.values()) arr.length = 0;
    const cellKey = this._crowdCellKey || (this._crowdCellKey = []);
    cellKey.length = 0;
    for (let k = 0; k < count; k++) {
      const gx = Math.floor(S.cx[k] / cell);
      const gy = Math.floor(S.cy[k] / cell);
      const key = gx * 100003 + gy;
      cellKey.push(key);
      let arr = grid.get(key);
      if (!arr) grid.set(key, (arr = []));
      arr.push(k);
    }
    // Evita que el Map crezca sin límite si los enemigos recorren todo el mapa.
    if (grid.size > 4096) {
      for (const [key, arr] of grid) if (arr.length === 0) grid.delete(key);
    }

    // Vecinas (gx, gy+1), (gx+1, gy-1), (gx+1, gy), (gx+1, gy+1) con clave gx*100003+gy.
    const NEIGHBORS = [1, 100003 - 1, 100003, 100003 + 1];
    for (const [key, arr] of grid) {
      const len = arr.length;
      if (len === 0) continue;
      // Parejas dentro de la misma celda.
      for (let a = 0; a < len; a++) {
        for (let b = a + 1; b < len; b++) this.resolveCrowdPair(S, arr[a], arr[b]);
      }
      // Parejas con las celdas vecinas "hacia delante" (cada pareja se mira una sola vez).
      for (let n = 0; n < NEIGHBORS.length; n++) {
        const other = grid.get(key + NEIGHBORS[n]);
        if (!other || other.length === 0) continue;
        for (let a = 0; a < len; a++) {
          for (let b = 0; b < other.length; b++) this.resolveCrowdPair(S, arr[a], other[b]);
        }
      }
    }
  },

  // Separa dos enemigos que se solapan; cada uno se mueve la mitad.
  resolveCrowdPair(S, a, b) {
    let px, py;
    if (S.circle[a] && S.circle[b]) {
      const dx = S.cx[b] - S.cx[a];
      const dy = S.cy[b] - S.cy[a];
      const minDist = S.hw[a] + S.hw[b];
      if (dx >= minDist || dx <= -minDist || dy >= minDist || dy <= -minDist) return;
      const distSq = dx * dx + dy * dy;
      if (distSq >= minDist * minDist) return;
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      // Mismo criterio que Arcade si los centros coinciden: ángulo 0 (separar en horizontal).
      const nx = dist > 0 ? dx / dist : 1;
      const ny = dist > 0 ? dy / dist : 0;
      px = nx * overlap * 0.5;
      py = ny * overlap * 0.5;
    } else {
      // Al menos uno es rectángulo (Tolcrap): se resuelve contra la caja del rectángulo.
      const rectIsB = !S.circle[b];
      const r = rectIsB ? b : a;
      const o = rectIsB ? a : b;
      const rl = S.cx[r] - S.hw[r], rr = S.cx[r] + S.hw[r];
      const rt = S.cy[r] - S.hh[r], rb = S.cy[r] + S.hh[r];
      const push = S.circle[o]
        ? circleRectPush(S.cx[o], S.cy[o], S.hw[o], rl, rt, rr, rb)
        : rectRectPush(S.cx[o], S.cy[o], S.hw[o], S.hh[o], rl, rt, rr, rb);
      if (!push) return;
      // push saca `o` de `r`: `o` se mueve +push/2 y `r` -push/2.
      // Abajo se aplica a -= p, b += p, así que p = -push/2 si o es a, y +push/2 si o es b.
      const sign = rectIsB ? -1 : 1;
      px = push.x * 0.5 * sign;
      py = push.y * 0.5 * sign;
    }
    S.cx[a] -= px; S.cy[a] -= py;
    S.cx[b] += px; S.cy[b] += py;
  }
};

// Vector que saca un círculo (cx, cy, r) de un rectángulo [l, t, rgt, btm], o null si no se tocan.
const _push = { x: 0, y: 0 };
function circleRectPush(cx, cy, r, l, t, rgt, btm) {
  const qx = cx < l ? l : (cx > rgt ? rgt : cx);
  const qy = cy < t ? t : (cy > btm ? btm : cy);
  const dx = cx - qx;
  const dy = cy - qy;
  const distSq = dx * dx + dy * dy;
  if (distSq > 0) {
    if (distSq >= r * r) return null;
    const dist = Math.sqrt(distSq);
    const k = (r - dist) / dist;
    _push.x = dx * k;
    _push.y = dy * k;
    return _push;
  }
  // El centro está dentro del rectángulo: se sale por el lado más cercano.
  const toL = cx - l + r, toR = rgt - cx + r, toT = cy - t + r, toB = btm - cy + r;
  const m = Math.min(toL, toR, toT, toB);
  _push.x = m === toL ? -toL : (m === toR ? toR : 0);
  _push.y = m === toT ? -toT : (m === toB ? toB : 0);
  if (_push.x !== 0) _push.y = 0;
  return _push;
}

// Vector que saca una caja centrada en (cx, cy) de un rectángulo, por el eje de menor solape.
function rectRectPush(cx, cy, hw, hh, l, t, rgt, btm) {
  const ox1 = rgt - (cx - hw), ox2 = (cx + hw) - l;
  const oy1 = btm - (cy - hh), oy2 = (cy + hh) - t;
  if (ox1 <= 0 || ox2 <= 0 || oy1 <= 0 || oy2 <= 0) return null;
  const ox = ox1 < ox2 ? ox1 : -ox2;
  const oy = oy1 < oy2 ? oy1 : -oy2;
  if (Math.abs(ox) < Math.abs(oy)) { _push.x = ox; _push.y = 0; } else { _push.x = 0; _push.y = oy; }
  return _push;
}
