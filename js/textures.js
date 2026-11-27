// @ts-nocheck
// Texturas pixel-art generadas por código (y respaldos si falta una imagen).

// --- GENERADOR DE TEXTURAS HI-RES PARA PHASER 4 ---
export function pxRect(g, x, y, w, h, color) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);

  if (typeof g.fillRect === 'function' && 'fillStyle' in g) {
    g.fillStyle = color;
    g.fillRect(rx, ry, rw, rh);
    return;
  }

  if (typeof g.fillStyle === 'function' && typeof g.fillRect === 'function') {
    const numColor = typeof color === 'string'
      ? parseInt(color.replace('#', ''), 16)
      : color;
    g.fillStyle(numColor, 1);
    g.fillRect(rx, ry, rw, rh);
  }
}

export function registerCanvasTexture(scene, key, w, h, drawFn) {
  if (scene.textures.exists(key)) return;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  drawFn(g, w, h);
  scene.textures.addCanvas(key, c);
}

export function buildAllTextures(scene) {
  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `crow_${frame}`, 32, 28, (g) => {
      const flap = frame === 1 ? -3 : 3;
      pxRect(g, 8, 12, 16, 10, '#090d16');
      pxRect(g, 9, 13, 14, 8, '#1e293b');
      pxRect(g, 11, 14, 10, 6, '#334155');
      pxRect(g, 4, 10 + flap, 7, 5, '#090d16');
      pxRect(g, 5, 11 + flap, 5, 3, '#475569');
      pxRect(g, 21, 10 - flap, 7, 5, '#090d16');
      pxRect(g, 22, 11 - flap, 5, 3, '#475569');
      pxRect(g, 22, 17, 6, 4, '#090d16');
      pxRect(g, 23, 18, 4, 2, '#64748b');
      pxRect(g, 4, 8, 9, 9, '#090d16');
      pxRect(g, 5, 9, 7, 7, '#334155');
      pxRect(g, 0, 11, 5, 3, '#facc15');
      pxRect(g, 1, 12, 3, 1, '#fef08a');
      pxRect(g, 7, 10, 2, 2, '#ef4444');
      pxRect(g, 7, 10, 1, 1, '#ffffff');
    });
  });

  ['orange', 'gray'].forEach(variant => {
    const cMain = variant === 'orange' ? '#ea580c' : '#64748b';
    const cLight = variant === 'orange' ? '#fb923c' : '#94a3b8';
    const cDark = variant === 'orange' ? '#9a3412' : '#334155';
    const cEye = variant === 'orange' ? '#facc15' : '#4ade80';
    const keyBase = variant === 'orange' ? 'catOrange' : 'catGray';

    [0, 1].forEach(frame => {
      registerCanvasTexture(scene, `${keyBase}_${frame}`, 32, 28, (g) => {
        const step = frame === 1 ? 1 : -1;
        pxRect(g, 25, 10 - step, 3, 9, '#0f1218');
        pxRect(g, 26, 11 - step, 2, 7, cMain);
        pxRect(g, 27, 8 - step, 3, 4, '#0f1218');
        pxRect(g, 28, 9 - step, 1, 3, cLight);
        pxRect(g, 8, 13, 18, 10, '#0f1218');
        pxRect(g, 9, 14, 16, 8, cMain);
        pxRect(g, 11, 14, 12, 3, cLight);
        pxRect(g, 12, 16, 2, 4, cDark);
        pxRect(g, 17, 16, 2, 4, cDark);
        pxRect(g, 9 + step, 22, 4, 5, '#0f1218');
        pxRect(g, 10 + step, 22, 2, 4, cLight);
        pxRect(g, 20 - step, 22, 4, 5, '#0f1218');
        pxRect(g, 21 - step, 22, 2, 4, cDark);
        pxRect(g, 3, 5, 15, 13, '#0f1218');
        pxRect(g, 4, 2, 4, 4, '#0f1218');
        pxRect(g, 13, 2, 4, 4, '#0f1218');
        pxRect(g, 5, 3, 2, 3, '#fda4af');
        pxRect(g, 14, 3, 2, 3, '#fda4af');
        pxRect(g, 4, 6, 13, 11, cMain);
        pxRect(g, 5, 6, 11, 4, cLight);
        pxRect(g, 5, 10, 4, 2, cEye);
        pxRect(g, 11, 10, 4, 2, cEye);
        pxRect(g, 6, 10, 1, 2, '#090b10');
        pxRect(g, 12, 10, 1, 2, '#090b10');
        pxRect(g, 8, 13, 3, 2, '#fda4af');
        pxRect(g, 7, 15, 1, 2, '#ffffff');
        pxRect(g, 11, 15, 1, 2, '#ffffff');
      });
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `forklift_${frame}`, 44, 34, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 8, 28, 32, 4, 'rgba(0,0,0,0.45)');
      pxRect(g, 1, 22, 11, 3, '#090d14');
      pxRect(g, 2, 23, 9, 1, '#cbd5e1');
      pxRect(g, 9, 12, 3, 12, '#090d14');
      pxRect(g, 10, 13, 1, 10, '#94a3b8');
      pxRect(g, 12, 14, 20, 12, '#090d14');
      pxRect(g, 13, 15, 18, 10, '#f59e0b');
      pxRect(g, 13, 15, 18, 3, '#fbbf24');
      pxRect(g, 14, 21, 16, 3, '#1e293b');
      pxRect(g, 28, 4, 3, 11, '#090d14');
      pxRect(g, 29, 5, 1, 9, '#475569');
      pxRect(g, 17, 4, 14, 2, '#090d14');
      pxRect(g, 18, 4, 12, 1, '#64748b');
      pxRect(g, 18, 8, 9, 7, '#090d14');
      pxRect(g, 19, 9, 7, 5, '#1d4ed8');
      pxRect(g, 19, 4, 7, 5, '#090d14');
      pxRect(g, 20, 5, 5, 4, '#fed7aa');
      pxRect(g, 19, 3, 8, 2, '#ef4444');
      pxRect(g, 20, 6, 2, 1, '#0f172a');
      pxRect(g, 13, 24, 7, 7, '#090d14');
      pxRect(g, 14, 25, 5, 5, '#334155');
      pxRect(g, 16, 26 + (step > 0 ? 1 : 0), 2, 2, '#e2e8f0');
      pxRect(g, 24, 24, 7, 7, '#090d14');
      pxRect(g, 25, 25, 5, 5, '#334155');
      pxRect(g, 27, 26 - (step > 0 ? 1 : 0), 2, 2, '#e2e8f0');
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `mutantRat_${frame}`, 32, 24, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 20, 13 - step, 6, 2, '#090d14');
      pxRect(g, 21, 13 - step, 5, 1, '#a3e635');
      pxRect(g, 25, 10 - step, 3, 3, '#090d14');
      pxRect(g, 26, 11 - step, 2, 2, '#84cc16');
      pxRect(g, 15 + step, 17, 4, 4, '#090d14');
      pxRect(g, 16 + step, 18, 2, 2, '#a3e635');
      pxRect(g, 8 - step, 17, 4, 4, '#090d14');
      pxRect(g, 9 - step, 18, 2, 2, '#a3e635');
      pxRect(g, 8, 10, 14, 9, '#090d14');
      pxRect(g, 9, 11, 12, 7, '#4d7c0f');
      pxRect(g, 10, 11, 10, 3, '#84cc16');
      pxRect(g, 12, 12, 3, 2, '#bef264');
      pxRect(g, 17, 13, 2, 2, '#a855f7');
      pxRect(g, 2, 8, 10, 8, '#090d14');
      pxRect(g, 3, 9, 8, 6, '#65a30d');
      pxRect(g, 1, 12, 3, 2, '#bef264');
      pxRect(g, 5, 4, 3, 4, '#090d14');
      pxRect(g, 9, 5, 3, 3, '#090d14');
      pxRect(g, 6, 5, 2, 3, '#d9f99d');
      pxRect(g, 10, 6, 1, 2, '#d9f99d');
      pxRect(g, 4, 10, 2, 2, '#ef4444');
      pxRect(g, 4, 10, 1, 1, '#fef08a');
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `thief_${frame}`, 38, 44, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 12, 31, 6, 11, '#0f1218');
      pxRect(g, 13, 31, 4, 9 + step, '#27272a');
      pxRect(g, 20, 31, 6, 11, '#0f1218');
      pxRect(g, 21, 31, 4, 9 - step, '#18181b');
      pxRect(g, 9, 18, 20, 14, '#090b10');
      pxRect(g, 10, 19, 18, 12, '#e2e8f0');
      pxRect(g, 10, 20, 18, 2, '#1e293b');
      pxRect(g, 10, 24, 18, 2, '#1e293b');
      pxRect(g, 10, 28, 18, 2, '#1e293b');
      pxRect(g, 11, 7, 16, 12, '#090b10');
      pxRect(g, 12, 8, 14, 10, '#fdba74');
      pxRect(g, 12, 10, 14, 4, '#0f172a');
      pxRect(g, 14, 11, 2, 2, '#f8fafc');
      pxRect(g, 21, 11, 2, 2, '#f8fafc');
      pxRect(g, 10, 4, 18, 4, '#090b10');
      pxRect(g, 11, 5, 16, 2, '#475569');
      pxRect(g, 24, 6, 6, 2, '#334155');
      pxRect(g, 3, 15, 8, 12, '#090b10');
      pxRect(g, 4, 16, 6, 10, '#b45309');
      pxRect(g, 5, 14, 4, 2, '#facc15');
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `execSuit_${frame}`, 40, 46, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 12, 32, 6, 12, '#090d14');
      pxRect(g, 13, 32, 4, 10 + step, '#1e293b');
      pxRect(g, 20, 32, 6, 12, '#090d14');
      pxRect(g, 21, 32, 4, 10 - step, '#0f172a');
      pxRect(g, 9, 18, 20, 15, '#090d14');
      pxRect(g, 10, 19, 18, 13, '#1e293b');
      pxRect(g, 16, 19, 6, 12, '#f8fafc');
      pxRect(g, 18, 20, 2, 9, '#dc2626');
      pxRect(g, 17, 29, 4, 2, '#dc2626');
      pxRect(g, 12, 6, 14, 12, '#090d14');
      pxRect(g, 13, 7, 12, 10, '#fed7aa');
      pxRect(g, 11, 4, 16, 4, '#090d14');
      pxRect(g, 12, 5, 14, 2, '#334155');
      pxRect(g, 15, 10, 2, 2, '#0f172a');
      pxRect(g, 21, 10, 2, 2, '#0f172a');
      pxRect(g, 27, 23, 11, 10, '#090d14');
      pxRect(g, 28, 24, 9, 8, '#78350f');
      pxRect(g, 28, 24, 9, 2, '#92400e');
      pxRect(g, 30, 21, 5, 3, '#090d14');
      pxRect(g, 31, 22, 3, 1, '#facc15');
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `logistics_${frame}`, 38, 44, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 12, 31, 6, 11, '#0f1218');
      pxRect(g, 13, 31, 4, 9 + step, '#1e3a8a');
      pxRect(g, 20, 31, 6, 11, '#0f1218');
      pxRect(g, 21, 31, 4, 9 - step, '#172554');
      pxRect(g, 9, 18, 20, 14, '#0f1218');
      pxRect(g, 10, 19, 18, 12, '#eab308');
      pxRect(g, 11, 19, 16, 4, '#facc15');
      pxRect(g, 10, 23, 18, 2, '#e2e8f0');
      pxRect(g, 10, 27, 18, 2, '#e2e8f0');
      pxRect(g, 18, 19, 2, 12, '#1e3a8a');
      pxRect(g, 11, 8, 16, 10, '#0f1218');
      pxRect(g, 12, 9, 14, 8, '#fdba74');
      pxRect(g, 14, 11, 2, 2, '#0f172a');
      pxRect(g, 21, 11, 2, 2, '#0f172a');
      pxRect(g, 9, 3, 20, 7, '#0f1218');
      pxRect(g, 10, 4, 18, 5, '#facc15');
      pxRect(g, 12, 4, 14, 2, '#fef08a');
      pxRect(g, 24, 20, 11, 10, '#0f1218');
      pxRect(g, 25, 21, 9, 8, '#b45309');
      pxRect(g, 25, 21, 9, 2, '#d97706');
      pxRect(g, 28, 21, 3, 8, '#fef08a');
    });
  });

  [0, 1].forEach(frame => {
    registerCanvasTexture(scene, `foreman_${frame}`, 44, 48, (g) => {
      const step = frame === 1 ? 1 : -1;
      pxRect(g, 13, 34, 7, 12, '#0f1218');
      pxRect(g, 14, 34, 5, 10 + step, '#1e3a8a');
      pxRect(g, 24, 34, 7, 12, '#0f1218');
      pxRect(g, 25, 34, 5, 10 - step, '#172554');
      pxRect(g, 8, 18, 28, 17, '#0f1218');
      pxRect(g, 9, 19, 26, 15, '#ea580c');
      pxRect(g, 10, 24, 24, 2, '#f8fafc');
      pxRect(g, 10, 29, 24, 2, '#f8fafc');
      pxRect(g, 13, 8, 18, 10, '#0f1218');
      pxRect(g, 14, 9, 16, 8, '#fdba74');
      pxRect(g, 14, 10, 16, 3, '#38bdf8');
      pxRect(g, 11, 2, 22, 7, '#0f1218');
      pxRect(g, 12, 3, 20, 5, '#f97316');
      pxRect(g, 28, 17, 14, 15, '#0f1218');
      pxRect(g, 29, 18, 12, 13, '#475569');
      pxRect(g, 30, 19, 10, 3, '#94a3b8');
      pxRect(g, 31, 24, 8, 3, '#facc15');
    });
  });

  registerCanvasTexture(scene, 'tolcrap_boss', 112, 64, (g) => {
    pxRect(g, 6, 52, 100, 10, 'rgba(0,0,0,0.5)');
    pxRect(g, 6, 10, 62, 38, '#090b10');
    pxRect(g, 8, 12, 58, 34, '#334155');
    pxRect(g, 8, 12, 58, 6, '#475569');
    pxRect(g, 10, 38, 54, 6, '#eab308');
    pxRect(g, 16, 38, 6, 6, '#0f172a');
    pxRect(g, 28, 38, 6, 6, '#0f172a');
    pxRect(g, 40, 38, 6, 6, '#0f172a');
    pxRect(g, 52, 38, 6, 6, '#0f172a');
    pxRect(g, 13, 20, 48, 15, '#1e293b');
    pxRect(g, 14, 21, 46, 13, '#0f172a');
    pxRect(g, 19, 23, 10, 2, '#facc15');
    pxRect(g, 23, 25, 2, 7, '#facc15');
    pxRect(g, 33, 23, 9, 2, '#ef4444');
    pxRect(g, 33, 25, 2, 5, '#ef4444');
    pxRect(g, 33, 30, 9, 2, '#ef4444');
    pxRect(g, 10, 14, 2, 2, '#94a3b8');
    pxRect(g, 62, 14, 2, 2, '#94a3b8');
    pxRect(g, 66, 4, 4, 22, '#090b10');
    pxRect(g, 67, 5, 2, 20, '#94a3b8');
    pxRect(g, 70, 14, 34, 34, '#090b10');
    pxRect(g, 72, 16, 30, 30, '#b91c1c');
    pxRect(g, 72, 16, 26, 5, '#ef4444');
    pxRect(g, 80, 10, 8, 4, '#090b10');
    pxRect(g, 81, 11, 6, 3, '#facc15');
    pxRect(g, 86, 21, 14, 10, '#0f172a');
    pxRect(g, 88, 22, 10, 8, '#38bdf8');
    pxRect(g, 90, 23, 4, 3, '#e0f2fe');
    pxRect(g, 91, 21, 2, 10, '#1e293b');
    pxRect(g, 96, 21, 2, 10, '#1e293b');
    pxRect(g, 102, 28, 6, 18, '#090d10');
    pxRect(g, 103, 29, 4, 16, '#64748b');
    pxRect(g, 107, 31, 4, 3, '#e2e8f0');
    pxRect(g, 107, 37, 4, 3, '#e2e8f0');
    pxRect(g, 107, 43, 4, 3, '#e2e8f0');
    pxRect(g, 101, 33, 3, 4, '#fef08a');
    [18, 46, 86].forEach(wx => {
      pxRect(g, wx - 7, 44, 14, 14, '#090b10');
      pxRect(g, wx - 5, 46, 10, 10, '#1e293b');
      pxRect(g, wx - 3, 48, 6, 6, '#94a3b8');
      pxRect(g, wx - 1, 50, 2, 2, '#0f172a');
    });
  });

  registerCanvasTexture(scene, 'corrupt_operator_boss', 64, 68, (g) => {
    pxRect(g, 12, 58, 40, 8, 'rgba(15, 23, 42, 0.25)');
    pxRect(g, 18, 40, 10, 18, '#0f172a');
    pxRect(g, 36, 40, 10, 18, '#1e293b');
    pxRect(g, 14, 20, 36, 21, '#090d16');
    pxRect(g, 16, 22, 32, 17, '#1e293b');
    pxRect(g, 28, 22, 8, 17, '#f8fafc');
    pxRect(g, 30, 23, 4, 13, '#ef4444');
    pxRect(g, 18, 4, 28, 16, '#090d16');
    pxRect(g, 20, 6, 24, 12, '#fde68a');
    pxRect(g, 16, 8, 4, 8, '#0284c7');
    pxRect(g, 22, 10, 6, 3, '#ef4444');
    pxRect(g, 36, 10, 6, 3, '#38bdf8');
    pxRect(g, 25, 15, 14, 2, '#0f172a');
    pxRect(g, 6, 24, 8, 12, '#090d16');
    pxRect(g, 8, 26, 4, 8, '#38bdf8');
    pxRect(g, 50, 24, 8, 12, '#090d16');
    pxRect(g, 52, 26, 4, 8, '#ef4444');
  });

  registerCanvasTexture(scene, 'dim_portal', 48, 56, (g) => {
    pxRect(g, 8, 48, 32, 6, 'rgba(14, 165, 233, 0.35)');
    pxRect(g, 10, 4, 28, 44, '#0f172a');
    pxRect(g, 12, 6, 24, 40, '#0284c7');
    pxRect(g, 15, 9, 18, 34, '#38bdf8');
    pxRect(g, 18, 13, 12, 26, '#e0f2fe');
    pxRect(g, 21, 18, 6, 16, '#ffffff');
  });

  registerCanvasTexture(scene, 'exit_door', 52, 64, (g) => {
    pxRect(g, 6, 56, 40, 6, 'rgba(250, 204, 21, 0.45)');
    pxRect(g, 8, 4, 36, 54, '#090d14');
    pxRect(g, 10, 6, 32, 50, '#ca8a04');
    pxRect(g, 12, 8, 28, 46, '#facc15');
    pxRect(g, 15, 11, 22, 42, '#fef08a');
    pxRect(g, 18, 14, 16, 38, '#ffffff');
    pxRect(g, 33, 32, 4, 4, '#b45309');
    pxRect(g, 19, 2, 14, 4, '#22c55e');
  });


  registerCanvasTexture(scene, 'tolcrap_saw', 22, 22, (g) => {
    pxRect(g, 9, 0, 4, 3, '#cbd5e1');
    pxRect(g, 9, 19, 4, 3, '#cbd5e1');
    pxRect(g, 0, 9, 3, 4, '#cbd5e1');
    pxRect(g, 19, 9, 3, 4, '#cbd5e1');
    pxRect(g, 2, 2, 3, 3, '#94a3b8');
    pxRect(g, 17, 2, 3, 3, '#94a3b8');
    pxRect(g, 2, 17, 3, 3, '#94a3b8');
    pxRect(g, 17, 17, 3, 3, '#94a3b8');
    pxRect(g, 4, 4, 14, 14, '#090d14');
    pxRect(g, 5, 5, 12, 12, '#e2e8f0');
    pxRect(g, 6, 6, 10, 10, '#94a3b8');
    pxRect(g, 8, 8, 6, 6, '#ef4444');
    pxRect(g, 10, 10, 2, 2, '#fef08a');
  });

  registerCanvasTexture(scene, 'purple_orb', 16, 16, (g) => {
    pxRect(g, 4, 1, 8, 14, '#090d14');
    pxRect(g, 1, 4, 14, 8, '#090d14');
    pxRect(g, 4, 2, 8, 12, '#7e22ce');
    pxRect(g, 2, 4, 12, 8, '#7e22ce');
    pxRect(g, 4, 3, 8, 10, '#c084fc');
    pxRect(g, 3, 5, 10, 6, '#c084fc');
    pxRect(g, 5, 4, 4, 4, '#f3e8ff');
    pxRect(g, 6, 5, 2, 2, '#ffffff');
  });

  registerCanvasTexture(scene, 'boss_0', 56, 60, (g) => {
    pxRect(g, 12, 4, 32, 30, '#09090b');
    pxRect(g, 10, 8, 36, 24, '#18181b');
    pxRect(g, 6, 28, 44, 24, '#09090b');
    pxRect(g, 8, 30, 40, 20, '#18181b');
    pxRect(g, 14, 50, 10, 9, '#09090b');
    pxRect(g, 32, 50, 10, 9, '#09090b');
    pxRect(g, 14, 14, 12, 9, '#38bdf8');
    pxRect(g, 30, 14, 12, 9, '#38bdf8');
    pxRect(g, 26, 17, 4, 2, '#94a3b8');
    pxRect(g, 16, 16, 8, 5, '#ffffff');
    pxRect(g, 32, 16, 8, 5, '#ffffff');
    pxRect(g, 11, 6, 2, 6, '#a855f7');
    pxRect(g, 43, 10, 2, 8, '#a855f7');
    pxRect(g, 7, 34, 2, 10, '#7e22ce');
  });

  registerCanvasTexture(scene, 'drone', 24, 20, (g) => {
    pxRect(g, 10, 1, 4, 3, '#64748b');
    pxRect(g, 4, 4, 16, 11, '#0f1218');
    pxRect(g, 5, 5, 14, 9, '#94a3b8');
    pxRect(g, 6, 5, 12, 3, '#e2e8f0');
    pxRect(g, 7, 8, 10, 5, '#0f172a');
    pxRect(g, 8, 9, 2, 2, '#38bdf8');
    pxRect(g, 14, 9, 2, 2, '#38bdf8');
    pxRect(g, 11, 11, 2, 1, '#ef4444');
    pxRect(g, 3, 13, 3, 5, '#ef4444');
    pxRect(g, 18, 13, 3, 5, '#ef4444');
  });

  registerCanvasTexture(scene, 'bolt', 16, 16, (g) => {
    pxRect(g, 5, 1, 6, 14, '#0f1218');
    pxRect(g, 3, 3, 10, 10, '#0f1218');
    pxRect(g, 4, 4, 8, 8, '#cbd5e1');
    pxRect(g, 5, 5, 6, 6, '#f8fafc');
    pxRect(g, 6, 6, 3, 3, '#ffffff');
  });

  registerCanvasTexture(scene, 'boss_chest', 32, 28, (g) => {
    pxRect(g, 4, 22, 24, 5, 'rgba(0,0,0,0.5)');
    pxRect(g, 3, 7, 26, 17, '#090d14');
    pxRect(g, 4, 8, 24, 15, '#78350f');
    pxRect(g, 5, 9, 22, 5, '#b45309');
    pxRect(g, 4, 14, 24, 2, '#090d14');
    pxRect(g, 4, 8, 3, 15, '#facc15');
    pxRect(g, 25, 8, 3, 15, '#facc15');
    pxRect(g, 4, 8, 24, 2, '#fde047');
    pxRect(g, 4, 21, 24, 2, '#eab308');
    pxRect(g, 13, 12, 6, 7, '#090d14');
    pxRect(g, 14, 13, 4, 5, '#facc15');
    pxRect(g, 15, 14, 2, 2, '#38bdf8');
  });

  registerCanvasTexture(scene, 'chapa_fallback', 16, 16, (g) => {
    pxRect(g, 4, 1, 8, 14, '#090d14');
    pxRect(g, 1, 4, 14, 8, '#090d14');
    pxRect(g, 3, 3, 10, 10, '#f59e0b');
    pxRect(g, 4, 4, 8, 8, '#facc15');
    pxRect(g, 6, 5, 4, 6, '#fef08a');
  });

  registerCanvasTexture(scene, 'medkit', 18, 16, (g) => {
    pxRect(g, 6, 1, 6, 3, '#0f1218');
    pxRect(g, 2, 3, 14, 11, '#0f1218');
    pxRect(g, 3, 4, 12, 9, '#dc2626');
    pxRect(g, 8, 6, 2, 5, '#ffffff');
    pxRect(g, 6, 8, 6, 1, '#ffffff');
  });

  registerCanvasTexture(scene, 'magnet_drop', 20, 20, (g) => {
    pxRect(g, 2, 2, 16, 16, '#090d14');
    pxRect(g, 3, 3, 5, 10, '#ef4444');
    pxRect(g, 12, 3, 5, 10, '#ef4444');
    pxRect(g, 4, 4, 2, 8, '#fca5a5');
    pxRect(g, 13, 4, 2, 8, '#fca5a5');
    pxRect(g, 3, 11, 14, 6, '#dc2626');
    pxRect(g, 7, 9, 6, 4, '#2b303b');
    pxRect(g, 3, 2, 5, 3, '#e2e8f0');
    pxRect(g, 12, 2, 5, 3, '#e2e8f0');
    pxRect(g, 4, 2, 2, 2, '#ffffff');
    pxRect(g, 13, 2, 2, 2, '#ffffff');
  });

  registerCanvasTexture(scene, 'bomb_drop', 22, 24, (g) => {
    pxRect(g, 15, 1, 2, 2, '#fef08a');
    pxRect(g, 14, 2, 4, 2, '#f97316');
    pxRect(g, 16, 0, 2, 2, '#ffffff');
    pxRect(g, 13, 3, 2, 2, '#d6b37c');
    pxRect(g, 11, 4, 2, 2, '#b68d52');
    pxRect(g, 9, 5, 6, 3, '#090d14');
    pxRect(g, 10, 6, 4, 2, '#94a3b8');
    pxRect(g, 5, 8, 12, 14, '#090d14');
    pxRect(g, 3, 10, 16, 10, '#090d14');
    pxRect(g, 6, 9, 10, 12, '#1e293b');
    pxRect(g, 4, 11, 14, 8, '#1e293b');
    pxRect(g, 5, 11, 12, 7, '#0f172a');
    pxRect(g, 6, 11, 3, 2, '#64748b');
    pxRect(g, 5, 13, 2, 2, '#475569');
  });

  registerCanvasTexture(scene, 'laser', 22, 6, (g) => {
    pxRect(g, 0, 0, 22, 6, 'rgba(239, 68, 68, 0.45)');
    pxRect(g, 2, 1, 18, 4, '#ef4444');
    pxRect(g, 4, 2, 14, 2, '#ffffff');
  });

  registerCanvasTexture(scene, 'domo_laser', 24, 8, (g) => {
    pxRect(g, 0, 0, 24, 8, 'rgba(34, 211, 238, 0.4)');
    pxRect(g, 2, 1, 20, 6, '#06b6d4');
    pxRect(g, 4, 2, 16, 4, '#a5f3fc');
    pxRect(g, 6, 3, 12, 2, '#ffffff');
  });

  registerCanvasTexture(scene, 'fusion_laser', 28, 10, (g) => {
    pxRect(g, 0, 0, 28, 10, 'rgba(250, 204, 21, 0.48)');
    pxRect(g, 2, 1, 24, 8, '#ca8a04');
    pxRect(g, 4, 2, 20, 6, '#facc15');
    pxRect(g, 6, 3, 16, 4, '#fef08a');
    pxRect(g, 9, 4, 10, 2, '#ffffff');
  });

  registerCanvasTexture(scene, 'ground_proc', 280, 280, (c) => {
    const blockW = 280;
    const blockH = 280;
    c.fillStyle = '#2b303b';
    c.fillRect(0, 0, blockW, blockH);
    c.fillStyle = '#1b1e26';
    c.fillRect(0, 0, blockW, 54);
    c.fillRect(0, 0, 54, blockH);
    c.fillStyle = '#64748b';
    c.fillRect(0, 54, blockW, 2);
    c.fillRect(54, 0, 2, blockH);
    c.fillStyle = '#0f1218';
    c.fillRect(0, 56, blockW, 2);
    c.fillRect(56, 0, 2, blockH);
    c.fillStyle = '#eab308';
    for (let m = 72; m < blockW - 16; m += 48) {
      c.fillRect(m, 26, 22, 3);
      c.fillRect(26, m, 3, 22);
    }
    c.fillStyle = '#363c4a';
    for (let sx = 58; sx < blockW; sx += 28) c.fillRect(sx, 58, 1, blockH - 58);
    for (let sy = 58; sy < blockH; sy += 28) c.fillRect(58, sy, blockW - 58, 1);
    c.fillStyle = '#14171f';
    c.fillRect(96, 115, 20, 2);
    c.fillRect(114, 117, 10, 2);
    c.fillRect(195, 205, 2, 18);
    c.fillStyle = '#3f6212';
    c.fillRect(62, 60, 4, 3);
    c.fillRect(150, 165, 5, 3);
  });

  registerCanvasTexture(scene, 'prop_barrel', 18, 24, (g) => {
    pxRect(g, 1, 18, 17, 5, 'rgba(0,0,0,0.42)');
    pxRect(g, 1, 0, 16, 20, '#0c0d10');
    pxRect(g, 2, 1, 14, 18, '#b91c1c');
    pxRect(g, 3, 1, 4, 18, '#ef4444');
    pxRect(g, 2, 7, 14, 5, '#facc15');
  });
  registerCanvasTexture(scene, 'prop_crate', 24, 24, (g) => {
    pxRect(g, 1, 18, 23, 5, 'rgba(0,0,0,0.42)');
    pxRect(g, 1, 0, 22, 20, '#0c0d10');
    pxRect(g, 2, 1, 20, 18, '#92400e');
    pxRect(g, 2, 1, 20, 4, '#d97706');
    pxRect(g, 9, 1, 6, 18, '#facc15');
  });
  registerCanvasTexture(scene, 'prop_barrier', 34, 20, (g) => {
    pxRect(g, 1, 14, 33, 6, 'rgba(0,0,0,0.42)');
    pxRect(g, 1, 0, 32, 16, '#0c0d10');
    pxRect(g, 2, 1, 30, 14, '#64748b');
    pxRect(g, 2, 1, 30, 4, '#94a3b8');
    pxRect(g, 7, 7, 5, 6, '#facc15');
    pxRect(g, 21, 7, 5, 6, '#facc15');
  });
  registerCanvasTexture(scene, 'prop_car', 54, 30, (g) => {
    pxRect(g, 1, 21, 53, 8, 'rgba(0,0,0,0.48)');
    pxRect(g, 1, 0, 52, 23, '#0c0d10');
    pxRect(g, 2, 7, 50, 14, '#9a3412');
    pxRect(g, 11, 1, 28, 7, '#475569');
    pxRect(g, 14, 3, 10, 4, '#0f172a');
    pxRect(g, 28, 3, 9, 4, '#0f172a');
    pxRect(g, 6, 10, 9, 5, '#c2410c');
    pxRect(g, 37, 13, 10, 5, '#c2410c');
    pxRect(g, 7, 18, 9, 6, '#090a0d');
    pxRect(g, 38, 18, 9, 6, '#090a0d');
  });
}
