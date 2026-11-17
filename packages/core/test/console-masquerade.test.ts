// Masquerade's rules, PR 3a (D-162, spec § 6): the 15 / +15 / 60 clock, the reason and `startedFrom`
// bounds, the error sentences, and what a masquerading request may do (`masqueradeVerdict`), against
// the spec's allowlist, D2's paused Console and the table of GET handlers that write.
import { describe, expect, it } from 'vitest';
import {
  CONSOLE_ERRORS,
  MASQUERADE_ALLOWLIST,
  MASQUERADE_DURATION_MS,
  MASQUERADE_ENABLED_DEFAULT,
  MASQUERADE_END_REASONS,
  MASQUERADE_EXTEND_MS,
  MASQUERADE_GET_WRITES,
  MASQUERADE_MAX_MS,
  MASQUERADE_PATHS,
  cleanMasqueradeReason,
  cleanStartedFrom,
  extendedExpiry,
  masqueradeCanExtend,
  masqueradeLive,
  masqueradeTimes,
  masqueradeVerdict,
} from '../src/index';

const MIN = 60_000;
const T = Date.parse('2026-12-07T16:42:00Z');

describe('the clock (D7) @console', () => {
  it('is 15 minutes, +15 per Extend, never past 60', () => {
    expect([MASQUERADE_DURATION_MS, MASQUERADE_EXTEND_MS, MASQUERADE_MAX_MS]).toEqual([15 * MIN, 15 * MIN, 60 * MIN]);
    const { expiresAt, hardExpiresAt } = masqueradeTimes(T);
    expect([expiresAt, hardExpiresAt]).toEqual([T + 15 * MIN, T + 60 * MIN]);
    let e: number | null = expiresAt;
    const seen: number[] = [];
    while (e !== null) {
      seen.push(e);
      e = extendedExpiry(e, hardExpiresAt);
    }
    expect(seen).toEqual([T + 15 * MIN, T + 30 * MIN, T + 45 * MIN, T + 60 * MIN]);
    // `min(expires + 15m, start + 60m)`: a part of a step is all that is left near the cap.
    expect(extendedExpiry(T + 50 * MIN, T + 60 * MIN)).toBe(T + 60 * MIN);
  });

  it('runs until its expiry, exclusive, and offers Extend only below the cap', () => {
    const s = { expiresAt: T + 15 * MIN, hardExpiresAt: T + 60 * MIN, endedAt: null };
    expect(masqueradeLive(s, T + 15 * MIN - 1)).toBe(true);
    expect(masqueradeLive(s, T + 15 * MIN)).toBe(false);
    expect(masqueradeLive({ ...s, endedAt: T }, T)).toBe(false);
    expect(masqueradeCanExtend(s, T)).toBe(true);
    expect(masqueradeCanExtend({ ...s, expiresAt: T + 60 * MIN }, T)).toBe(false);
    expect(masqueradeCanExtend(s, T + 15 * MIN)).toBe(false);
  });

  it('is on unless the Owner turns it off (D8)', () => {
    expect(MASQUERADE_ENABLED_DEFAULT).toBe(true);
  });
});

describe('reasons and where Exit returns @console', () => {
  it('takes 10 to 500 characters, trimmed', () => {
    expect(cleanMasqueradeReason('x'.repeat(9))).toBeNull();
    expect(cleanMasqueradeReason(`  ${'x'.repeat(10)}  `)).toBe('x'.repeat(10));
    expect(cleanMasqueradeReason('x'.repeat(500))).toBe('x'.repeat(500));
    expect(cleanMasqueradeReason('x'.repeat(501))).toBeNull();
    expect(cleanMasqueradeReason(12345678901)).toBeNull();
  });

  it('returns only to a Console page on this site', () => {
    expect(cleanStartedFrom(undefined)).toBeUndefined();
    expect(cleanStartedFrom('')).toBeUndefined();
    for (const ok of ['/admin', '/admin/', '/admin/users/u_jamie', '/admin/workspaces/northline']) expect(cleanStartedFrom(ok), ok).toBe(ok);
    for (const bad of ['https://evil.example/admin', '//evil.example', '/admin/../sign-in', '/admin/./x', '/administrator', '/admin?x=1', '/', 'admin', `/admin/${'x'.repeat(200)}`, 7]) {
      expect(cleanStartedFrom(bad), String(bad)).toBeNull();
    }
  });

  it('ends one of four ways (migration 0018’s check)', () => {
    expect(MASQUERADE_END_REASONS).toEqual(['exit', 'expired', 'signed_out', 'revoked']);
  });
});

describe('the error sentences (spec §§ 5-6) @console', () => {
  it('gives each masquerade code its status and one sentence', () => {
    expect({
      reason_required: CONSOLE_ERRORS.reason_required,
      masquerade_target_staff: CONSOLE_ERRORS.masquerade_target_staff,
      masquerade_active: CONSOLE_ERRORS.masquerade_active,
      masquerade_max_reached: CONSOLE_ERRORS.masquerade_max_reached,
      masquerade_disabled: CONSOLE_ERRORS.masquerade_disabled,
      masquerade_ended: CONSOLE_ERRORS.masquerade_ended,
      masquerade_blocked: CONSOLE_ERRORS.masquerade_blocked,
    }).toEqual({
      reason_required: { status: 422, message: 'Give a reason of 10 to 500 characters.' },
      masquerade_target_staff: { status: 403, message: 'You can only masquerade as a learner.' },
      masquerade_active: { status: 409, message: 'Exit the current masquerade session first.' },
      masquerade_max_reached: { status: 409, message: 'This session can’t go past 60 minutes.' },
      masquerade_disabled: { status: 403, message: 'Masquerade is turned off.' },
      masquerade_ended: { status: 409, message: 'This masquerade session has ended.' },
      masquerade_blocked: { status: 403, message: 'Blocked while masquerading. Exit to continue.' },
    });
  });
});

describe('what a masquerading request may do (D1, D2) @console', () => {
  it('allows exactly the spec’s three writes', () => {
    expect(MASQUERADE_ALLOWLIST).toEqual([
      { method: 'POST', path: '/api/console/masquerade/extend' },
      { method: 'POST', path: '/api/console/masquerade/exit' },
      { method: 'POST', path: '/api/auth/sign-out' },
    ]);
    for (const a of MASQUERADE_ALLOWLIST) expect(masqueradeVerdict(a.method, a.path), a.path).toBe('allow');
    expect(masqueradeVerdict('post', '/api/auth/sign-out')).toBe('allow');
  });

  it('refuses every other write, wherever it goes', () => {
    for (const [m, p] of [
      ['POST', '/api/mutate/:name'],
      ['PATCH', '/api/me/prefs'],
      ['POST', '/api/checkout'],
      ['POST', '/api/ai101/waitlist'],
      ['POST', '/api/auth/request'],
      ['PUT', '/anything'],
      ['DELETE', '/api/anything'],
      ['GET', MASQUERADE_PATHS.extend],
      ['PATCH', MASQUERADE_PATHS.exit],
    ] as const) {
      expect(masqueradeVerdict(m, p), `${m} ${p}`).toBe('block');
    }
  });

  it('pauses the Console but for current, Extend and Exit', () => {
    for (const p of ['/api/console/me', '/api/console/audit', '/api/console/users/:userId', MASQUERADE_PATHS.start, MASQUERADE_PATHS.sessions]) {
      expect(masqueradeVerdict('GET', p), p).toBe('block');
      expect(masqueradeVerdict('POST', p), p).toBe('block');
    }
    expect(masqueradeVerdict('GET', MASQUERADE_PATHS.current)).toBe('allow');
    expect(masqueradeVerdict('HEAD', MASQUERADE_PATHS.current)).toBe('allow');
  });

  it('blocks the GET handlers that write, and reads everything else', () => {
    expect(MASQUERADE_GET_WRITES.map((g) => [g.path, g.handling])).toEqual([
      ['/api/sessions/:id/join', 'block'],
      ['/api/billing/portal', 'block'],
      ['/api/auth/google', 'block'],
      ['/api/auth/google/callback', 'block'],
      ['/api/files/resource/:id', 'skip'],
      ['/api/files/module/:moduleId/:fileName', 'skip'],
      ['/api/skills/:id/download/:kind', 'allow'],
      ['/api/skill-guides/:slug', 'skip'],
      ['/api/events', 'allow'],
    ]);
    for (const g of MASQUERADE_GET_WRITES) {
      expect(g.why, g.path).toMatch(/\S/);
      for (const m of ['GET', 'HEAD']) expect(masqueradeVerdict(m, g.path), `${m} ${g.path}`).toBe(g.handling === 'block' ? 'block' : 'allow');
    }
    for (const p of ['/api/snapshot', '/api/me', '/api/skills', '/api/course', '/api/offer', '/sign-in']) expect(masqueradeVerdict('GET', p), p).toBe('allow');
    expect(masqueradeVerdict('OPTIONS', '/api/sessions/:id/join')).toBe('allow');
  });
});
