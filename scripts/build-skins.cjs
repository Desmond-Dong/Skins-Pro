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

// Generate skin list + strings for compile-time injection
const stringsMap = {};
dirs.forEach(dir => {
  const file = path.join(src, dir, 'strings.json');
  stringsMap[dir] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
});

fs.writeFileSync(
  path.join('src', 'skins.generated.ts'),
  'export const SKINS: readonly string[] = ' + JSON.stringify(dirs) + ';\n' +
  'export const DEFAULT_SKIN: string = SKINS[0] || ' + JSON.stringify(dirs[0] || 'default') + ';\n' +
  'export const SKIN_STRINGS: Record<string, Record<string, string>> = ' + JSON.stringify(stringsMap) + ';\n',
);


