// Styling uses tokens. Raw hex, rgb(), hsl() and named colors are not allowed
// in component CSS: only var(--token) from tokens.css. See CLAUDE.md › Non-negotiables.
import { globSync, readFileSync } from 'node:fs';

const bad = [];
for (const f of globSync('apps/web/src/**/*.module.css')) {
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (
        /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black|red|blue|gray|grey)\b/i.test(line) &&
        !/var\(--/.test(line)
      )
        bad.push(`${f}:${i + 1}  ${line.trim()}`);
    });
}
if (bad.length) {
  console.error('Raw colors are not allowed. Use tokens from tokens.css:\n' + bad.join('\n'));
  process.exit(1);
}
console.log(`check-css-colors: ok (${globSync('apps/web/src/**/*.module.css').length} module(s) scanned)`);
