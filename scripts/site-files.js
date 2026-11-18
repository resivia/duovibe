/* Shared allowlist for the production build and the local static server. */
const { copyFileSync, mkdirSync, rmSync } = require('node:fs');
const { join } = require('node:path');

const files = [
  'index.html', 'style.css', 'config.js', 'supabase-lite.js', 'app.js', 'banks.js', 'deck.js',
  'features.js', 'minigames.js', 'partygames.js', 'social.js', 'duogames.js',
  'icons.js', 'sw.js', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png'
];

if (require.main === module) {
  const root = join(__dirname, '..');
  const dist = join(root, 'dist');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  for (const file of [...files, '_headers', '_redirects']) copyFileSync(join(root, file), join(dist, file));
  console.log(`Copied ${files.length} public assets to dist/`);
}
module.exports = files;
