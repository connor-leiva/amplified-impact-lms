// D-183: a learner's snapshot carries the recording staff attached to a session (D-172's Attach replay)
// only when it is published to them. Everything else stays redacted, as before; staff are unchanged.
import { describe, expect, it } from 'vitest';
import { DEFAULT_REPLAY_VISIBILITY, learnerReplayUrl, replayVisibleTo, scopeSnapshot } from '../src/scope';
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
    const OPEN = { access: true, open: true };
    const LOCKED = { access: true, open: false };
    const OUT = { access: false, open: true };
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL }, OPEN)).toBe(URL);
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL, replayVisibility: 'published' }, OPEN)).toBe(URL);
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL, replayVisibility: 'after_open' }, OPEN)).toBe(URL);
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL, replayVisibility: 'after_open' }, LOCKED)).toBeNull();
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL, replayVisibility: 'hidden' }, OPEN)).toBeNull();
    expect(learnerReplayUrl({ replay: 'processing', replayUrl: URL }, OPEN)).toBeNull();
    expect(learnerReplayUrl({ replay: null, replayUrl: URL }, OPEN)).toBeNull();
    expect(learnerReplayUrl({ replay: 'ready' }, OPEN)).toBeNull();
    // Never outside the learner's plan, course or tier, whatever the visibility.
    for (const v of ['published', 'after_open', 'hidden', undefined] as const) expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL, replayVisibility: v }, OUT)).toBeNull();
  });

  it('D-187: Published shows as soon as the replay is ready, even in a week still locked by its date; After the week opens waits for the week @parity:E-1 @parity:C-3', () => {
    const LOCKED = { access: true, open: false };
    expect(learnerReplayUrl({ replay: 'ready', replayUrl: URL, replayVisibility: 'published' }, LOCKED)).toBe(URL);
    expect(replayVisibleTo({ replay: 'ready', replayVisibility: 'published' }, LOCKED)).toBe(true);
    expect(replayVisibleTo({ replay: 'ready', replayVisibility: 'after_open' }, LOCKED)).toBe(false);
    expect(replayVisibleTo({ replay: 'ready', replayVisibility: 'after_open' }, { access: true, open: true })).toBe(true);
    expect(replayVisibleTo({ replay: 'ready', replayVisibility: 'hidden' }, { access: true, open: true })).toBe(false);
    expect(replayVisibleTo({ replay: 'processing', replayVisibility: 'published' }, LOCKED)).toBe(false);
  });

  it('D-187: not set behaves as the Week Builder leaves it, After the week opens', () => {
    expect(DEFAULT_REPLAY_VISIBILITY).toBe('after_open');
    expect(replayVisibleTo({ replay: 'ready' }, { access: true, open: false })).toBe(false);
    expect(replayVisibleTo({ replay: 'ready' }, { access: true, open: true })).toBe(true);
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

  it('never for a locked week while its replay waits for the week (After the week opens, or not set): no replay and no link @parity:C-3', () => {
    for (const v of ['after_open', undefined] as const) {
      const s = seen(withReplay('dec26-s2', { replay: 'ready', ...(v ? { replayVisibility: v } : {}) }), 'dec26-s2')!;
      expect(s).not.toHaveProperty('replayUrl');
      expect(s.replay).toBeNull();
    }
  });

  it('D-187: a locked week’s Published replay is in the snapshot, its state and its link @parity:C-3 @parity:E-1', () => {
    const s = seen(withReplay('dec26-s2', { replay: 'ready', replayVisibility: 'published' }), 'dec26-s2')!;
    expect(s.replay).toBe('ready');
    expect(s.replayUrl).toBe(URL);
    expect(s.zoom).toBe('');
    // Still nothing of the locked week's content.
    const d = scopeSnapshot(withReplay('dec26-s2', { replay: 'ready', replayVisibility: 'published' }), { kind: 'learner', userId: 'u-dana' }, ACCESS);
    const wk2 = d.modules.find((m) => m.id === 'accelerator-week-2')!;
    expect(wk2.status).toBe('scheduled');
    expect(wk2.prompt).toBe('');
  });

  it('D-187: a Published replay never reaches a tier the week is not in', () => {
    const d = withReplay('dec26-s2', { replay: 'ready', replayVisibility: 'published' });
    d.users.find((u) => u.id === 'u-dana')!.tier = 'agent';
    d.modules = d.modules.map((m) => (m.id === 'accelerator-week-2' ? { ...m, tier: 'team' as const } : m));
    const s = seen(d, 'dec26-s2')!;
    expect(s).not.toHaveProperty('replayUrl');
    expect(s.replay).toBeNull();
  });

  it('D-187: Hidden is never, open week or locked', () => {
    expect(seen(withReplay('dec26-s2', { replay: 'ready', replayVisibility: 'hidden' }), 'dec26-s2')).not.toHaveProperty('replayUrl');
    expect(seen(withReplay('dec26-s1', { replay: 'ready', replayVisibility: 'hidden' }), 'dec26-s1')).not.toHaveProperty('replayUrl');
  });

  it('never for another cohort: the session isn’t in their snapshot at all', () => {
    const d = withReplay('dec26-s1', { replay: 'ready' }, 'feb27');
    expect(seen(d, 'dec26-s1')).toBeUndefined();
  });

  it('never for a plan without the course: its sessions are dropped, Published or not', () => {
    const d = withReplay('dec26-s1', { replay: 'ready', replayVisibility: 'published' });
    const db = scopeSnapshot(d, { kind: 'learner', userId: 'u-dana' }, { accelerator: false });
    expect(db.sessions.find((s) => s.id === 'dec26-s1')).toBeUndefined();
  });

  it('staff are unchanged: they see every link, published or not', () => {
    const d = withReplay('dec26-s2', { replay: 'processing' });
    const staffId = d.staff[0]!.id;
    expect(scopeSnapshot(d, { kind: 'staff', staffId }).sessions.find((s) => s.id === 'dec26-s2')!.replayUrl).toBe(URL);
  });
});
