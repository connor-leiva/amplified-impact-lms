// Phase 08 § 8.1's subject table. The type system already proves that every template has exactly
// one builder and that each builder takes that template's data (see the annotation on `SUBJECTS`),
// so these tests exist for the one thing a type cannot check: that the strings are the spec's
// strings.
//
// Every expectation below is written out as a literal rather than derived from `SUBJECTS`, which is
// the whole point — a test that built its expectation from the implementation would pass whatever
// the implementation said. If a subject is edited, exactly one of these fails and names it.
//
// Two of them guard characters that are invisible in a diff:
//   - `staff-invite` must carry U+2019 (’), not ASCII U+0027 (')
//   - the three session subjects must carry U+00B7 (·) with a space on each side
// An editor, a shell heredoc or an autocorrect pass flattening either one would ship an inbox
// subject that does not match the spec and would otherwise be invisible to review, so the code
// points are asserted numerically as well as inside the literals.
import { describe, it, expect } from 'vitest';
import { seedForDatabase } from '@ai/core';
import { SUBJECTS, TEMPLATE_NAMES, subjectFor } from './subjects';
import type { SubjectData, TemplateName } from './subjects';

/**
 * One valid payload per template, used by the whole-table sweeps below. Typed by the same map as
 * the builders, so a change to a subject's data shape fails here too rather than being silently
 * cast away.
 */
const SAMPLE: { [K in TemplateName]: SubjectData[K] } = {
  'sign-in': {},
  'team-invite': { inviter: 'Alex Rivera', team: 'Northline Realty' },
  'staff-invite': {},
  announcement: { title: 'Session 4 moved' },
  'session-24h': { n: 3, title: 'The Living Database' },
  'session-1h': { n: 3, title: 'The Living Database' },
  'replay-ready': { n: 2, title: 'Speed to Lead' },
  'build-reminder': { employee: 'Marketing AI Employee' },
  'weekly-digest': {},
};

describe('email subjects @g8', () => {
  // --- § 8.1's table, one assertion per row ------------------------------------------------

  it('builds the sign-in subject exactly as § 8.1 gives it', () => {
    expect(SUBJECTS['sign-in']({})).toBe('Your Amplified Impact sign-in link');
  });

  it('builds the team-invite subject exactly as § 8.1 gives it', () => {
    expect(SUBJECTS['team-invite']({ inviter: 'Alex Rivera', team: 'Northline Realty' })).toBe(
      'Alex Rivera invited you to Northline Realty on Amplified Impact',
    );
  });

  it('builds the staff-invite subject exactly as § 8.1 gives it', () => {
    expect(SUBJECTS['staff-invite']({})).toBe(
      'You’ve been added to the Amplified Impact admin console',
    );
  });

  it('builds the announcement subject as the announcement title, with nothing added', () => {
    // § 8.1's subject for `announcement` is `{title}` alone: no "Amplified Impact:" prefix, no
    // cohort name. The real seed's titles already read as subjects.
    expect(SUBJECTS.announcement({ title: 'Session 3 moved to Wed Dec 9 · 1:00 PM CT' })).toBe(
      'Session 3 moved to Wed Dec 9 · 1:00 PM CT',
    );
  });

  it('builds the session-24h subject exactly as § 8.1 gives it', () => {
    expect(SUBJECTS['session-24h']({ n: 3, title: 'The Living Database' })).toBe(
      'Tomorrow: Session 3 · The Living Database',
    );
  });

  it('builds the session-1h subject exactly as § 8.1 gives it', () => {
    expect(SUBJECTS['session-1h']({ n: 3, title: 'The Living Database' })).toBe(
      'Starting in 1 hour: Session 3 · The Living Database',
    );
  });

  it('builds the replay-ready subject exactly as § 8.1 gives it', () => {
    expect(SUBJECTS['replay-ready']({ n: 2, title: 'Speed to Lead' })).toBe(
      'Replay is up: Session 2 · Speed to Lead',
    );
  });

  it('builds the build-reminder subject exactly as § 8.1 gives it', () => {
    expect(SUBJECTS['build-reminder']({ employee: 'Marketing AI Employee' })).toBe(
      'Finish your Marketing AI Employee',
    );
  });

  it('builds the weekly-digest subject exactly as § 8.1 gives it', () => {
    expect(SUBJECTS['weekly-digest']({})).toBe('Your team this week');
  });

  // --- the characters a diff hides ---------------------------------------------------------

  it('spells You’ve with U+2019, not an ASCII apostrophe', () => {
    const subject = SUBJECTS['staff-invite']({});
    // Index 3 is the apostrophe in "You’ve". Asserted by code point because `'` and `’` are
    // indistinguishable in most review surfaces.
    expect(subject.codePointAt(3)).toBe(0x2019);
    expect(subject).not.toContain("'");
    expect(subject.startsWith('You’ve ')).toBe(true);
  });

  it('separates the session number from the title with a spaced U+00B7 middle dot', () => {
    const sessionSubjects = [
      SUBJECTS['session-24h'](SAMPLE['session-24h']),
      SUBJECTS['session-1h'](SAMPLE['session-1h']),
      SUBJECTS['replay-ready'](SAMPLE['replay-ready']),
    ];
    for (const subject of sessionSubjects) {
      const at = subject.indexOf('·');
      expect(at, `no middle dot in "${subject}"`).toBeGreaterThan(-1);
      expect(subject.codePointAt(at)).toBe(0x00b7);
      // A space on each side. `·` with no spaces, or an en dash, hyphen or bullet instead, all
      // read as "close enough" in a diff and are all wrong.
      expect(subject[at - 1]).toBe(' ');
      expect(subject[at + 1]).toBe(' ');
      expect(subject).not.toMatch(/[-–—•]/);
    }
  });

  // --- the whole table at once --------------------------------------------------------------

  it('has one builder per template in § 8.1 and no others', () => {
    // The annotation on SUBJECTS makes both halves of this a typecheck failure already. It is
    // asserted at runtime too because the typecheck is what a hurried `// @ts-expect-error` can
    // silence, and because this is the list the deferred /api/test/outbox route will trust.
    expect(Object.keys(SUBJECTS).sort()).toEqual([...TEMPLATE_NAMES].sort());
    expect(TEMPLATE_NAMES).toHaveLength(9);
    expect(new Set(TEMPLATE_NAMES).size).toBe(9);
  });

  it('leaves no § 8.1 placeholder uninterpolated', () => {
    // Catches the failure a "is it a non-empty string?" check would wave through: a builder that
    // returns its template verbatim, so a learner receives "Finish your {employee}".
    for (const template of TEMPLATE_NAMES) {
      const subject = subjectFor(template, SAMPLE[template]);
      expect(subject.length, template).toBeGreaterThan(0);
      expect(subject, template).not.toMatch(/[{}]/);
      expect(subject.trim(), template).toBe(subject);
    }
  });

  it('routes subjectFor through the same builders, so there is only one copy of the strings', () => {
    // Generic rather than a direct `SUBJECTS[template](SAMPLE[template])` in the loop: indexing a
    // map of differently-shaped callables with a union key gives TypeScript a union of signatures,
    // whose callable form takes the *intersection* of the parameters — so the direct form does not
    // typecheck even though it is sound. Narrowing to one K at a time is the fix.
    const bothWays = <K extends TemplateName>(template: K): [string, string] => [
      subjectFor(template, SAMPLE[template]),
      SUBJECTS[template](SAMPLE[template]),
    ];
    for (const template of TEMPLATE_NAMES) {
      const [viaHelper, viaRegistry] = bothWays(template);
      expect(viaHelper, template).toBe(viaRegistry);
    }
  });

  // --- against the real seed ----------------------------------------------------------------

  it('interpolates a real session row, not just hand-written test data', () => {
    // Gate 8 drives the scheduler at 2026-12-08T13:00 CT and expects `session-24h` for Session 3.
    // Pinning the subject to the seeded row proves `{n}` and `{title}` map to `Session.n` and
    // `Session.title` — a builder reading `session.id` or an index would pass every literal above
    // and produce "Session dec26-s3" here.
    const db = seedForDatabase('live');
    const s3 = db.sessions.find((s) => s.id === 'dec26-s3');
    expect(s3).toBeDefined();
    expect(subjectFor('session-24h', { n: s3!.n, title: s3!.title })).toBe(
      'Tomorrow: Session 3 · The Living Database',
    );
    expect(subjectFor('session-1h', { n: s3!.n, title: s3!.title })).toBe(
      'Starting in 1 hour: Session 3 · The Living Database',
    );
  });
});
