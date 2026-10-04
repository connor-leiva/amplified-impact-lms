// Icons come only from ICONS in @ai/core. No icon library may be installed anywhere.
import { globSync, readFileSync, existsSync } from 'node:fs';

const FORBIDDEN = [
  'lucide-react',
  'lucide',
  'react-icons',
  'phosphor-react',
  '@phosphor-icons/react',
  'react-feather',
  'feather-icons',
  '@heroicons/react',
  '@tabler/icons-react',
  'bootstrap-icons',
  'tailwindcss',
  'styled-components',
  '@emotion/react',
  '@emotion/styled',
];

const bad = [];
for (const f of ['package.json', ...globSync('{apps,packages}/*/package.json')]) {
  if (!existsSync(f)) continue;
  const pkg = JSON.parse(readFileSync(f, 'utf8'));
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const dep of Object.keys(pkg[field] ?? {})) if (FORBIDDEN.includes(dep)) bad.push(`${f}  ${field}.${dep}`);
  }
}
if (bad.length) {
  console.error('Forbidden dependency. Icons come from @ai/core; styling is CSS Modules over tokens.css:\n' + bad.join('\n'));
  process.exit(1);
}
console.log('check-no-icon-libs: ok');
