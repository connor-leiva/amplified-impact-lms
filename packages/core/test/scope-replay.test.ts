// D-183: a learner's snapshot carries the recording staff attached to a session (D-172's Attach replay)
// only when it is published to them. Everything else stays redacted, as before; staff are unchanged.
import { describe, expect, it } from 'vitest';
import { learnerReplayUrl, scopeSnapshot } from '../src/scope';
import type { Db, Learner, Session } from '../src/types';
import { planContentV2 } from '../seed/content-v2';
import { planCopyV1 } from '../seed/copy-v1';
import { seedProduction } from '../seed/curriculum';
import { planReleaseV1 } from '../seed/release-plan-v1';

const URL = 'https://zoom.us/rec/share/abc123';
const deployed = (): Db => planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const dana = (cohortId = 'dec26'): Learner => ({ id: 'u-dana', name: 'Dana Ross', email: 'dana@example.com', tier: 'team', role: 'Team Owner', teamId: null, cohortId, joined: 0, last: null, status: 'active', progress: {} });
/** Dec 5, 2026: Week 1 (its build Dec 2) open, Week 2 (Dec 9) locked. */
const AT = Date.parse('2026-12-05T19:00:00Z');
const ACCESS = { accelerator: true, at: AT, preview: false };

function withReplay(id: string, x: Partial<Session>, cohortId?: string): Db {
  const d = deployed();
  d.users.push(dana(cohortId));
  Object.assign(d.sessions.find((s) => s.id === id)!, { replayUrl: URL, ...x });
  return d;
}
const seen = (d: Db, id: string) => scopeSnapshot(d, { kind: 'learner', userId: 'u-dana' }, ACCESS).sessions.find((s) => s.id === id);

describe('the replay link a learner receives (D-183)', () => {
  it('the rule: ready, and its visibility allows it, in a week the learner can open @parity:E-1 @parity:C-3', () => {
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL }, true)).toBe(URL);
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL, replayVisibility: 'published' }, true)).toBe(URL);
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL, replayVisibility: 'after_open' }, true)).toBe(URL);
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL, replayVisibility: 'after_open' }, false)).toBeNull();
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL, replayVisibility: 'published' }, false)).toBeNull();
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL, replayVisibility: 'hidden' }, true)).toBeNull();
    expect(learnerReplayUrl({ replay: 'processing', replayUrl: URL }, true)).toBeNull();
    expect(learnerReplayUrl({ replay: null, replayUrl: URL }, true)).toBeNull();
    expect(learnerReplayUrl({ replay: 'ready' }, true)).toBeNull();
  });

  it('a learner sees the link once the replay is published, and not before; the Zoom link stays blank @parity:C-3 @parity:M-3', () => {
    expect(seen(withReplay('dec26-s1', { replay: 'processing' }), 'dec26-s1')).not.toHaveProperty('replayUrl');
    const s = seen(withReplay('dec26-s1', { replay: 'ready' }), 'dec26-s1')!;
    expect(s.replayUrl).toBe(URL);
    expect(s.zoom).toBe('');
  });

  it('never when staff hid the replay', () => {
    expect(seen(withReplay('dec26-s1', { replay: 'ready', replayVisibility: 'hidden' }), 'dec26-s1')).not.toHaveProperty('replayUrl');
  });

  it('never for a locked week: its session keeps no replay and no link', () => {
    const s = seen(withReplay('dec26-s2', { replay: 'ready' }), 'dec26-s2')!;
    expect(s).not.toHaveProperty('replayUrl');
    expect(s.replay).toBeNull();
  });

  it('never for another cohort: the session isn’t in their snapshot at all', () => {
    const d = withReplay('dec26-s1', { replay: 'ready' }, 'feb27');
    expect(seen(d, 'dec26-s1')).toBeUndefined();
  });

  it('never for a plan without the course: its sessions are dropped', () => {
    const d = withReplay('dec26-s1', { replay: 'ready' });
    const db = scopeSnapshot(d, { kind: 'learner', userId: 'u-dana' }, { accelerator: false });
    expect(db.sessions.find((s) => s.id === 'dec26-s1')).toBeUndefined();
  });

  it('staff are unchanged: they see every link, published or not', () => {
    const d = withReplay('dec26-s2', { replay: 'processing' });
    const staffId = d.staff[0]!.id;
    expect(scopeSnapshot(d, { kind: 'staff', staffId }).sessions.find((s) => s.id === 'dec26-s2')!.replayUrl).toBe(URL);
  });
});
