const fs = require('fs');
const path = require('path');

const src = 'skins-pro';
const dest = 'dist';

const dirs = fs.readdirSync(src, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

dirs.forEach(dir => {
  fs.cpSync(path.join(src, dir), path.join(dest, dir), { recursive: true, force: true });
});

// Generate skin list for compile-time injection
fs.writeFileSync(
  path.join('src', 'skins.generated.ts'),
  `export const SKINS: readonly string[] = ${JSON.stringify(dirs)};\nexport const DEFAULT_SKIN: string = SKINS[0] || '${dirs[0] || 'default'}';\n`,
);

