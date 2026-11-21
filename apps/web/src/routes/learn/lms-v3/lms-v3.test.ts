// D-225: the v3 stylesheets and icon sprite are the package's, byte for byte. A value changes only when the mockup
// changes and `npm run build` regenerates them in `handoff/lms-v3/src/`; then both copies move together.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lmsV3Enabled, v3On } from './v3';

const ROOT = join(__dirname, '../../../../../..');
const sha = (p: string) => createHash('sha256').update(readFileSync(join(ROOT, p))).digest('hex');

const FILES: [string, string, string][] = [
  ['apps/web/src/routes/learn/lms-v3/lms.tokens.css', 'handoff/lms-v3/src/lms.tokens.css', 'f067d092f27d68d0f9af463e28a22597bd85dac5e1d94fe3bcfdef77e907ab7d'],
  ['apps/web/src/routes/learn/lms-v3/lms.css', 'handoff/lms-v3/src/lms.css', '7343efded92492279b3a0cefacaf9a5dc0a53ce3a9112abf392fbc9c369db4e3'],
  ['apps/web/src/routes/learn/lms-v3/icons.generated.js', 'handoff/lms-v3/src/components/icons.generated.js', '0fa73d8503a47fc367133acfb6ac9f36b7c5da2d37928707001d2002d9e59894'],
];

describe('the v3 files are the package’s, byte for byte (D-225)', () => {
  it.each(FILES)('%s', (repo, pkg, want) => {
    expect(sha(repo)).toBe(want);
    expect(sha(pkg)).toBe(want);
  });

  it('the package’s mockup is the approved revision (v6)', () => {
    expect(sha('handoff/lms-v3/mockup/index.html')).toBe('0383d010513f2f7af819ed1a780b25075079b9d2e274a5405a22bfc77ad1562f');
  });
});

describe('who sees v3 (D-225)', () => {
  it('is off unless the build says exactly true', () => {
    expect(lmsV3Enabled({})).toBe(false);
    expect(lmsV3Enabled({ VITE_LMS_V3: 'false' })).toBe(false);
    expect(lmsV3Enabled({ VITE_LMS_V3: '1' })).toBe(false);
    expect(lmsV3Enabled({ VITE_LMS_V3: 'true' })).toBe(true);
  });

  it('shows the seeded test learner v3 whatever the flag, and no one else until the flag is on', () => {
    expect(v3On({ test: true }, false)).toBe(true);
    expect(v3On({}, false)).toBe(false);
    expect(v3On(null, false)).toBe(false);
    expect(v3On({}, true)).toBe(true);
  });
});
