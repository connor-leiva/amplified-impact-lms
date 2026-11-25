// D-225: the v3 stylesheets and icon sprite are the package's, byte for byte. A value changes only when the mockup
// changes and `npm run build` regenerates them in `handoff/lms-v3/src/`; then both copies move together.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { communityFor, isCommunityPath, lmsV3Enabled, v3FrameAt, v3On } from './v3';

const ROOT = join(__dirname, '../../../../../..');
const sha = (p: string) => createHash('sha256').update(readFileSync(join(ROOT, p))).digest('hex');

const FILES: [string, string, string][] = [
  ['apps/web/src/routes/learn/lms-v3/lms.tokens.css', 'handoff/lms-v3/src/lms.tokens.css', 'f067d092f27d68d0f9af463e28a22597bd85dac5e1d94fe3bcfdef77e907ab7d'],
  ['apps/web/src/routes/learn/lms-v3/lms.css', 'handoff/lms-v3/src/lms.css', 'd0bb864c74f984f0b58546560953a57d2c993c75f60a8bf1341cae05e6a8a869'],
  ['apps/web/src/routes/learn/lms-v3/icons.generated.js', 'handoff/lms-v3/src/components/icons.generated.js', '0fa73d8503a47fc367133acfb6ac9f36b7c5da2d37928707001d2002d9e59894'],
];

describe('the v3 files are the package’s, byte for byte (D-225)', () => {
  it.each(FILES)('%s', (repo, pkg, want) => {
    expect(sha(repo)).toBe(want);
    expect(sha(pkg)).toBe(want);
  });

  // B-41 (v7, D-233): the one academy logo the shell draws, the brand's file as Connor uploaded it (brand/logos/SHA256SUMS).
  it.each(['amplified-impact-academy-app.svg'])('the logo %s', (f) => {
    const sums = readFileSync(join(ROOT, 'handoff/lms-v3/brand/logos/SHA256SUMS'), 'utf8');
    const want = sums.split('\n').find((l) => l.endsWith(`  ${f}`))?.split(' ')[0];
    expect(want).toMatch(/^[0-9a-f]{64}$/);
    expect(sha(`apps/web/src/routes/learn/lms-v3/logos/${f}`)).toBe(want);
    expect(sha(`handoff/lms-v3/brand/logos/${f}`)).toBe(want);
  });

  // B-42 (R-2, D-256): every logo in brand/logos/SHA256SUMS, wherever the repo keeps a copy, is the brand's file byte
  // for byte. Never redrawn, recoloured, cropped or re-exported (IMPLEMENTATION-SPEC.md §2.1).
  const SUMS: [string, string][] = readFileSync(join(ROOT, 'handoff/lms-v3/brand/logos/SHA256SUMS'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [hash, file] = l.split(/ {2}/);
      return [file!, hash!];
    });
  const COPIES = [
    'apps/web/src/assets/brand',
    'design-reference/brand',
    'apps/web/src/routes/learn/lms-v3/logos',
    'handoff/lms-v3/mockup/logos',
    'handoff/admin-mockup/logos',
  ];
  it('SHA256SUMS lists the five brand files', () => {
    expect(SUMS.map(([f]) => f).sort()).toEqual([
      'amplified-impact-academy-app-reversed.svg',
      'amplified-impact-academy-app.svg',
      'amplified-impact-academy-reversed.svg',
      'amplified-impact-academy.svg',
      'favicon.svg',
    ]);
    for (const [, hash] of SUMS) expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it.each(SUMS)('every copy of %s', (f, want) => {
    expect(sha(`handoff/lms-v3/brand/logos/${f}`)).toBe(want);
    for (const dir of COPIES) if (existsSync(join(ROOT, dir, f))) expect(sha(`${dir}/${f}`), `${dir}/${f}`).toBe(want);
  });
  // The files `BrandSlot` and `AcademyLogo` draw are in both brand folders, the app's and the reference's.
  it.each(['amplified-impact-academy-app.svg', 'amplified-impact-academy-app-reversed.svg', 'favicon.svg'])('%s is in both brand folders', (f) => {
    const want = SUMS.find(([n]) => n === f)?.[1];
    expect(sha(`apps/web/src/assets/brand/${f}`)).toBe(want);
    expect(sha(`design-reference/brand/${f}`)).toBe(want);
  });

  it('the package’s mockup is the approved revision (v7)', () => {
    expect(sha('handoff/lms-v3/mockup/index.html')).toBe('ab62643b34ce0d4d060b9004aeb695c0f264303410cacdf482247527b96d9d1d');
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

describe('who opens the Community (D-231)', () => {
  const learner = { actor: { kind: 'learner' } };
  const staff = { actor: { kind: 'staff' } };
  const preview = { actor: { kind: 'staff' }, preview: 'owner' };
  it('knows its addresses', () => {
    expect(isCommunityPath('/learn/community')).toBe(true);
    expect(isCommunityPath('/learn/community/')).toBe(true);
    expect(isCommunityPath('/learn/community/2')).toBe(true);
    expect(isCommunityPath('/learn/community/2/x')).toBe(false);
    expect(isCommunityPath('/learn/communityx')).toBe(false);
    expect(isCommunityPath('/learn/schedule')).toBe(false);
  });
  it('is a learner v3 draws for, and staff whatever the flag, but not a staff preview', () => {
    expect(communityFor(learner, { test: true }, false)).toBe(true);
    expect(communityFor(learner, {}, false)).toBe(false);
    expect(communityFor(learner, {}, true)).toBe(true);
    expect(communityFor(staff, null, false)).toBe(true);
    expect(communityFor(preview, null, false)).toBe(false);
    expect(communityFor(preview, null, true)).toBe(false);
  });
  it('gives staff the v3 frame on the Community only', () => {
    expect(v3FrameAt('/learn/community/2', staff, null, false)).toBe(true);
    expect(v3FrameAt('/learn/week/0', staff, null, false)).toBe(false);
    expect(v3FrameAt('/learn/community', preview, null, false)).toBe(false);
    expect(v3FrameAt('/learn/week/0', learner, { test: true }, false)).toBe(true);
    expect(v3FrameAt('/learn/community', learner, {}, false)).toBe(false);
  });
});
