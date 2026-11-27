// Sube el número de versión de todos los archivos del juego para que los navegadores
// (sobre todo en móvil) no usen copias antiguas guardadas en caché.
//
// Uso:
//   npm run bump          -> versión actual + 1
//   npm run bump -- 15    -> fija la versión 15
//
// Qué hace:
//   · En index.html: css/style.css?v=N y js/game.js?v=N
//   · En todos los .js de js/ (menos js/backup): cada import/export relativo
//     ('./x.js', '../y.js') pasa a terminar en ?v=N.
//
// IMPORTANTE: todas las importaciones de un mismo archivo deben llevar la MISMA versión.
// Si un archivo se importa con dos URL distintas (con y sin ?v, o con dos números), el
// navegador lo carga dos veces como módulos separados. Por eso, si añades un import nuevo,
// basta con volver a ejecutar este script: lo deja todo con el mismo número.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'index.html');
const index = readFileSync(indexPath, 'utf8');

const current = Number((index.match(/js\/game\.js\?v=(\d+)/) || [])[1] || 0);
const arg = process.argv[2];
const next = arg !== undefined ? Number(arg) : current + 1;
if (!Number.isInteger(next) || next < 0) {
  console.error(`Versión no válida: ${arg}`);
  process.exit(1);
}

// index.html
const newIndex = index
  .replace(/(href="css\/style\.css)(\?v=[^"]*)?"/, `$1?v=${next}"`)
  .replace(/(src="js\/game\.js)(\?v=[^"]*)?"/, `$1?v=${next}"`);
writeFileSync(indexPath, newIndex);

// Módulos JS
const jsDir = join(root, 'js');
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== 'backup') walk(full);
    } else if (name.endsWith('.js')) {
      files.push(full);
    }
  }
})(jsDir);

// import ... from './x.js'   |   export ... from '../y.js'   |   import './z.js'
const IMPORT_RE = /((?:\bfrom|^\s*import)\s*)(['"])(\.{1,2}\/[^'"?]+\.js)(?:\?v=[^'"]*)?\2/gm;
let total = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let count = 0;
  const out = src.replace(IMPORT_RE, (_, pre, q, path) => {
    count++;
    return `${pre}${q}${path}?v=${next}${q}`;
  });
  if (out !== src) writeFileSync(file, out);
  total += count;
  if (count) console.log(`  ${relative(root, file)}: ${count} import(s)`);
}

console.log(`Versión ${current} -> ${next} (${total} imports en ${files.length} archivos + index.html)`);
