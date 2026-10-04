// Gate 2: the explicit expectation suite.
//
// Every bullet in docs/phases/02-core-domain.md §2.4 is encoded here as a literal `expect`.
// Unlike differential.test.ts, this file NEVER imports design-reference/lms-data.js: the expected
// strings are hard-coded from the spec, so these tests keep documenting intent even if the
// reference prototype changes underneath the port.
//
// Every instant is an explicit-offset `Date.parse`, and the viewer zone is set in `beforeEach`,
// so nothing here depends on the machine's time zone.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as core from '../src';

// ---------- Anchors ----------
/** Session 3 of the December 2026 cohort: 2026-12-09T13:00 CT. */
const S3_START = Date.parse('2026-12-09T13:00:00-06:00');
/** The `live` phase instant (Week 2 of the December cohort), i.e. DEMO_NOW. */
const WEEK2_NOW = Date.parse('2026-12-07T10:42:00-06:00');
/** The `post` phase instant, after the December cohort has completed. */
const POST_NOW = Date.parse('2027-01-12T10:42:00-06:00');

const CHICAGO = 'America/Chicago';
const NEW_YORK = 'America/New_York';
const LOS_ANGELES = 'America/Los_Angeles';

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

beforeEach(() => {
  // Explicit, not inherited from the host: every string below is a Central-Time viewer's string
  // unless the test overrides the zone itself.
  core.setViewerZone(CHICAGO);
});

afterAll(() => {
  core.setViewerZone(null);
});

const liveDb = () => core.seed('live');
const session3 = () => core.sessionFor(liveDb(), 'dec26', 3)!;
const decCohort = () => liveDb().cohorts.find((c) => c.id === 'dec26')!;
const moduleById = (id: string) => liveDb().modules.find((m) => m.id === id)!;
const userById = (id: string) => liveDb().users.find((u) => u.id === id)!;

describe('§2.4 times @g2', () => {
  it('anchors Session 3 at 2026-12-09T13:00 CT @g2', () => {
    expect(session3().start).toBe(S3_START);
    expect(WEEK2_NOW).toBe(core.DEMO_NOW);
    expect(POST_NOW).toBe(core.phaseNow('post'));
  });

  it('fmt.time for a Chicago viewer is "1:00 PM CT" @g2', () => {
    core.setViewerZone(CHICAGO);
    expect(core.fmt.time(S3_START)).toBe('1:00 PM CT');
    core.setViewerZone(null);
  });

  it('fmt.time for a New York viewer is "2:00 PM ET (1:00 PM CT)" @g2', () => {
    core.setViewerZone(NEW_YORK);
    expect(core.fmt.time(S3_START)).toBe('2:00 PM ET (1:00 PM CT)');
    core.setViewerZone(null);
  });

  it('fmt.time for a Los Angeles viewer is "11:00 AM PT (1:00 PM CT)" @g2', () => {
    core.setViewerZone(LOS_ANGELES);
    expect(core.fmt.time(S3_START)).toBe('11:00 AM PT (1:00 PM CT)');
    core.setViewerZone(null);
  });

  it('fmt.when for a Chicago viewer is "Wed, Dec 9 · 1:00 PM CT" @g2', () => {
    core.setViewerZone(CHICAGO);
    expect(core.fmt.when(S3_START)).toBe('Wed, Dec 9 · 1:00 PM CT');
    core.setViewerZone(null);
  });
});

describe('§2.4 clock and money @g2', () => {
  it('fmt.clock drops the hour when there is none @g2', () => {
    expect(core.fmt.clock(3504)).toBe('58:24');
  });

  it('fmt.clock keeps the hour and zero-pads the minutes @g2', () => {
    expect(core.fmt.clock(3725)).toBe('1:02:05');
  });

  it('fmt.money groups thousands and drops cents @g2', () => {
    expect(core.fmt.money(4995)).toBe('$4,995');
  });
});

describe('§2.4 relative time @g2', () => {
  it('walks the whole fmt.ago ladder @g2', () => {
    expect(core.fmt.ago(WEEK2_NOW - 30_000, WEEK2_NOW)).toBe('Just now');
    expect(core.fmt.ago(WEEK2_NOW - 12 * MIN, WEEK2_NOW)).toBe('12 min ago');
    expect(core.fmt.ago(WEEK2_NOW - 3 * HOUR, WEEK2_NOW)).toBe('3 hours ago');
    expect(core.fmt.ago(WEEK2_NOW - 26 * HOUR, WEEK2_NOW)).toBe('Yesterday');
    expect(core.fmt.ago(WEEK2_NOW - 4 * DAY, WEEK2_NOW)).toBe('4 days ago');
    expect(core.fmt.ago(WEEK2_NOW - 15 * DAY, WEEK2_NOW)).toBe('2 weeks ago');
  });

  it('falls back to a plain date past four weeks @g2', () => {
    // 2026-12-02 seen from the post-cohort instant is 41 days back, past the 28-day ladder.
    const dec2 = Date.parse('2026-12-02T10:42:00-06:00');
    expect(core.fmt.ago(dec2, POST_NOW)).toBe('Dec 2');
  });

  it('fmt.agoInline lowercases the first letter @g2', () => {
    expect(core.fmt.agoInline(WEEK2_NOW - 26 * HOUR, WEEK2_NOW)).toBe('yesterday');
  });

  it('fmt.agoInline prefixes "on" for the date fallback @g2', () => {
    const dec2 = Date.parse('2026-12-02T10:42:00-06:00');
    expect(core.fmt.agoInline(dec2, POST_NOW)).toBe('on Dec 2');
  });
});

describe('§2.4 cohort line @g2', () => {
  it('names the start date before the cohort begins @g2', () => {
    expect(core.cohortLine(decCohort(), core.phaseNow('week0'))).toBe('December 2026 Cohort · Starts Dec 1');
  });

  it('counts the week while the cohort runs @g2', () => {
    expect(core.cohortLine(decCohort(), core.phaseNow('live'))).toBe('December 2026 Cohort · Week 2 of 6');
  });

  it('reads Completed after the cohort @g2', () => {
    expect(core.cohortLine(decCohort(), core.phaseNow('post'))).toBe('December 2026 Cohort · Completed');
  });
});

describe('§2.4 join window @g2', () => {
  it('is disabled 16 minutes before the start @g2', () => {
    const s = session3();
    expect(core.joinMode(s, s.start - 16 * MIN)).toBe('disabled');
  });

  it('is ready exactly 15 minutes before the start @g2', () => {
    const s = session3();
    expect(core.joinMode(s, s.start - 15 * MIN)).toBe('ready');
  });

  it('is live one minute after the start @g2', () => {
    const s = session3();
    expect(core.joinMode(s, s.start + 1 * MIN)).toBe('live');
  });
});

describe('§2.4 session card, scheduled @g2', () => {
  const vm = () => {
    const db = liveDb();
    const s = core.sessionFor(db, 'dec26', 3)!;
    return core.sessionVM(db, s, 'scheduled', core.variantNow(s, 'scheduled', 0));
  };

  it('counts down in days, hours and minutes @g2', () => {
    expect(vm().countdown).toEqual([
      { v: '02', l: 'Days' },
      { v: '02', l: 'Hours' },
      { v: '18', l: 'Min' },
    ]);
  });

  it('shows no seconds unit, because more than an hour remains @g2', () => {
    const units = vm().countdown!;
    expect(units.some((u) => u.l === 'Sec')).toBe(false);
    expect(units).toHaveLength(3);
  });

  it('reads "Starts in 2 days 2 hours" to a screen reader @g2', () => {
    expect(vm().aria).toBe('Starts in 2 days 2 hours');
  });

  it('offers calendar as the primary action and disables join @g2', () => {
    expect(vm().primary).toBe('calendar');
    expect(vm().join).toBe('disabled');
  });
});

describe('§2.4 session card, starting soon @g2', () => {
  const vm = () => {
    const db = liveDb();
    const s = core.sessionFor(db, 'dec26', 3)!;
    return core.sessionVM(db, s, 'starting_soon', core.variantNow(s, 'starting_soon', 0));
  };

  it('counts down in minutes and seconds @g2', () => {
    expect(vm().countdown).toEqual([
      { v: '11', l: 'Min' },
      { v: '40', l: 'Sec' },
    ]);
  });

  it('reads "Starts within 20 minutes" to a screen reader @g2', () => {
    expect(vm().aria).toBe('Starts within 20 minutes');
  });

  it('promotes join to the primary action @g2', () => {
    expect(vm().primary).toBe('join');
  });
});

describe('§2.4 employee cards for Jamie at Week 2 @g2', () => {
  const card = (moduleId: string) => core.cardVM(liveDb(), userById('u_jamie'), moduleById(moduleId), WEEK2_NOW);

  it('Sales is a half-built card that owns the primary action @g2', () => {
    const c = card('sales');
    expect(c.state).toBe('in_progress');
    expect(c.n).toBe(3);
    expect(c.cta).toBe('Continue Build');
    expect(c.primary).toBe(true);
    expect(c.sessLine).toBe('Session 2 · Replay Ready');
  });

  it('Marketing is verified and steps back from the primary action @g2', () => {
    const c = card('marketing');
    expect(c.state).toBe('verified');
    expect(c.cta).toBe('Open');
    expect(c.primary).toBe(false);
  });

  it('Meetings is locked behind the Team tier @g2', () => {
    const c = card('meetings');
    expect(c.locked).toBe(true);
    expect(c.cta).toBe('Preview');
  });
});

describe('§2.4 scheduled employees for Alex at Week 2 @g2', () => {
  it('Operations is unlocked but not yet open @g2', () => {
    const c = core.cardVM(liveDb(), userById('u_alex'), moduleById('operations'), WEEK2_NOW);
    expect(c.locked).toBe(false);
    expect(c.soon).toBe(true);
    expect(c.opensLabel).toBe('Opens Dec 14');
    expect(c.cta).toBe('View Details');
  });
});
