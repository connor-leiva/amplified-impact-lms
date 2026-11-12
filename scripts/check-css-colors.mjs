// Styling uses tokens. Raw hex, rgb(), hsl() and named colors are not allowed
// in component CSS: only var(--token) from tokens.css. See CLAUDE.md › Non-negotiables.
import { globSync, readFileSync } from 'node:fs';

// The CSS Modules, plus /ai101's plain stylesheet (DECISIONS.md D-028): that page is not a React
// route, so its styles are one global file rather than modules, under the same rule. The same goes
// for /terms and /privacy, whose one stylesheet is in apps/web/src/legal/. A Set, so a file more
// than one pattern matches is scanned once.
const files = [
  ...new Set(globSync(['apps/web/src/**/*.module.css', 'apps/web/src/ai101/**/*.css', 'apps/web/src/legal/**/*.css', 'apps/web/src/guides/**/*.css', 'apps/web/src/voice/**/*.css', 'apps/web/src/retool/**/*.css', 'apps/web/src/library/**/*.css', 'apps/web/src/offer/**/*.css', 'apps/web/src/home/**/*.css', 'apps/web/src/site/**/*.css', 'apps/web/src/pricing/**/*.css', 'apps/web/src/team-build/**/*.css', 'apps/web/src/teams/**/*.css', 'apps/web/src/agents/**/*.css', 'apps/web/src/free/**/*.css', 'apps/web/src/about/**/*.css', 'apps/web/src/kit/**/*.css'])),
];

const bad = [];
for (const f of files) {
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (
        // A named colour must stand alone as a value: `\b` alone also matched the `white` in
        // `white-space: nowrap`, which every card and button in the reference uses.
        /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|(?<![-\w])(white|black|red|blue|gray|grey)(?![-\w])/i.test(line) &&
        !/var\(--/.test(line)
      )
        bad.push(`${f}:${i + 1}  ${line.trim()}`);
    });
}
if (bad.length) {
  console.error('Raw colors are not allowed. Use tokens from tokens.css:\n' + bad.join('\n'));
  process.exit(1);
}
console.log(`check-css-colors: ok (${files.length} stylesheet(s) scanned)`);
