// Gate 2: the port must behave exactly like design-reference/lms-data.js.
// The oracle is the prototype itself, widened in ./oracle (it is browser-free at import time).
import { describe, it, expect, afterAll } from 'vitest';
import { ref, PHASES, ZONE_IDS } from './oracle';
import * as core from '../src';
import type { Session } from '../src';

// The oracle is untyped (see ./oracle), so its arrays need a shape to map over.
type Ided = { id: string };
const id = (x: Ided) => x.id;


afterAll(() => {
  ref.setViewerZone(null);
  core.setViewerZone(null);
});

describe('seed @g2', () => {
  for (const p of PHASES) it(`seed(${p}) is identical`, () => expect(core.seed(p)).toEqual(ref.seed(p)));
});

describe('constants @g2', () => {
  it('shares the primitives', () => {
    expect(core.DB_V).toBe(ref.DB_V);
    expect(core.DB_KEY).toBe(ref.DB_KEY);
    expect(core.DEMO_NOW).toBe(ref.DEMO_NOW);
    expect(core.PROGRAM_TZ).toBe(ref.PROGRAM_TZ);
    expect(core.STEPS).toBe(ref.STEPS);
  });
  it('shares the vocabularies', () => {
    expect([...core.CATEGORIES]).toEqual(ref.CATEGORIES);
    expect([...core.EXEC_CATEGORIES]).toEqual(ref.EXEC_CATEGORIES);
    expect([...core.TYPES]).toEqual(ref.TYPES);
    expect([...core.STAFF_ROLES]).toEqual(ref.STAFF_ROLES);
    expect(core.PERMS.map((p) => [...p])).toEqual(ref.PERMS);
    expect([...core.MODULE_ICONS]).toEqual(ref.MODULE_ICONS);
    expect([...core.ZONES].map((z) => [...z])).toEqual(ref.ZONES);
    expect(core.VARIANTS.map((v) => [...v])).toEqual(ref.VARIANTS);
  });
  it('shares the demo timeline', () => {
    expect(core.PHASES.map((p) => ({ ...p }))).toEqual(ref.PHASES);
    for (const p of PHASES) expect(core.phaseNow(p)).toBe(ref.phaseNow(p));
  });
  it('shares the status tones', () => {
    expect(core.TONES).toEqual(ref.TONES);
    expect(core.STATUS).toEqual(ref.STATUS);
  });
});

describe('time formatting @g2', () => {
  const times = [
    Date.parse('2026-12-09T13:00:00-06:00'),
    Date.parse('2027-03-15T09:30:00-05:00'),
    Date.parse('2026-12-31T23:59:00-06:00'),
  ];
  for (const z of ZONE_IDS)
    it(`fmt in ${z}`, () => {
      ref.setViewerZone(z);
      core.setViewerZone(z);
      for (const t of times)
        for (const k of ['date', 'day', 'dayPlain', 'weekday', 'time', 'timeOnly', 'when', 'abs'] as const)
          expect(core.fmt[k](t), `${k} ${t}`).toBe(ref.fmt[k](t));
    });

  it('relative + numeric helpers', () => {
    const now = Date.parse('2026-12-07T10:42:00-06:00');
    for (const d of [0, 30e3, 5 * 60e3, 3 * 3600e3, 26 * 3600e3, 4 * 864e5, 15 * 864e5, 40 * 864e5]) {
      expect(core.fmt.ago(now - d, now)).toBe(ref.fmt.ago(now - d, now));
      expect(core.fmt.agoInline(now - d, now)).toBe(ref.fmt.agoInline(now - d, now));
    }
    for (const d of [60e3, 45 * 60e3, 5 * 3600e3, 26 * 3600e3, 3 * 864e5])
      expect(core.fmt.until(now + d, now)).toBe(ref.fmt.until(now + d, now));
    for (const s of [0, 59, 65, 3504, 3725]) expect(core.fmt.clock(s)).toBe(ref.fmt.clock(s));
    for (const n of [0, 1, 999, 4995, 1234567]) {
      expect(core.fmt.money(n)).toBe(ref.fmt.money(n));
      expect(core.fmt.num(n)).toBe(ref.fmt.num(n));
    }
    for (const n of [0, 0.125, 0.5, 0.783, 1]) expect(core.fmt.pct(n)).toBe(ref.fmt.pct(n));
    for (const n of ['Jamie Ortiz', 'Alex Morgan', 'Casey', '', 'Jo Ann Van Der Berg'])
      expect(core.fmt.initials(n)).toBe(ref.fmt.initials(n));
    for (const t of times) {
      expect(core.fmt.isoDate(t)).toBe(ref.fmt.isoDate(t));
      expect(core.fmt.isoTime(t)).toBe(ref.fmt.isoTime(t));
    }
    expect(core.fmt.fromCT('2026-12-09', '15:00')).toBe(ref.fmt.fromCT('2026-12-09', '15:00'));
    expect(core.fmt.fromCT('2026-12-09')).toBe(ref.fmt.fromCT('2026-12-09'));
  });

  it('zone labels and abbreviations', () => {
    for (const z of [...ZONE_IDS, 'America/Detroit', 'Europe/London', '']) {
      expect(core.zoneAbbr(z, times[0]!)).toBe(ref.zoneAbbr(z, times[0]!));
      expect(core.zoneLabel(z)).toBe(ref.zoneLabel(z));
    }
  });
});

describe('view models @g2', () => {
  for (const p of PHASES)
    it(`cards + sessions in ${p}`, () => {
      const db = ref.seed(p);
      const now = ref.phaseNow(p);
      ref.setViewerZone('America/Chicago');
      core.setViewerZone('America/Chicago');
      for (const u of db.users)
        for (const m of db.modules) {
          expect(core.cardVM(db, u, m, now)).toEqual(ref.cardVM(db, u, m, now));
          expect(core.buildOf(u, m)).toEqual(ref.buildOf(u, m));
          expect(core.runtimeOf(u, m)).toBe(ref.runtimeOf(u, m));
          expect(core.statusOf(u, m)).toBe(ref.statusOf(u, m));
          expect(core.canAccess(u, m)).toBe(ref.canAccess(u, m));
          expect(core.isOpen(m, now)).toBe(ref.isOpen(m, now));
          expect(core.nextIncluded(db, u, m.id, now)?.id).toBe(ref.nextIncluded(db, u, m.id, now)?.id);
        }
      for (const u of db.users) {
        expect(core.cardSession(db, u, now)).toEqual(ref.cardSession(db, u, now));
        expect(core.accessibleSessions(db, u).map((s) => s.id)).toEqual(ref.accessibleSessions(db, u).map(id));
        expect(core.nextSession(db, u, now)?.id).toBe(ref.nextSession(db, u, now)?.id);
      }
      for (const s of db.sessions)
        for (const [v] of ref.VARIANTS)
          for (const tick of [0, 1000, 61_000])
            expect(core.sessionVM(db, s, v, core.variantNow(s, v, tick)), `${s.id} ${v} +${tick}`).toEqual(
              ref.sessionVM(db, s, v, ref.variantNow(s, v, tick)),
            );
      for (const c of db.cohorts) {
        expect(core.cohortLine(c, now)).toBe(ref.cohortLine(c, now));
        expect(core.cohortWeek(c, now)).toBe(ref.cohortWeek(c, now));
      }
      for (const who of (db.users as Ided[]).map(id).concat((db.teams as Ided[]).map(id)))
        expect(core.avatarColor(who)).toBe(ref.avatarColor(who));
      expect(core.sortedModules(db).map((m) => m.id)).toEqual(ref.sortedModules(db).map(id));
      expect(core.visibleModules(db).map((m) => m.id)).toEqual(ref.visibleModules(db).map(id));
    });

  it('join window', () => {
    const s = ref.seed('live').sessions[2]!;
    for (const off of [-16, -15, -1, 0, 1, 80]) {
      const t = s.start + off * 60e3;
      expect(core.joinMode(s, t), `${off} min`).toBe(ref.joinMode(s, t));
    }
  });

  it('session state and lookups', () => {
    const db = ref.seed('live');
    const now = ref.phaseNow('live');
    for (const s of db.sessions) {
      for (const off of [-864e5, -60e3, 0, 60e3, 80 * 60e3, 13 * 3600e3])
        expect(core.sessionState(s, s.start + off), `${s.id} ${off}`).toBe(ref.sessionState(s, s.start + off));
      expect(core.sessionEnd(s)).toBe(ref.sessionEnd(s));
      expect(core.sessionEvent(s)).toEqual(ref.sessionEvent(s));
      expect(core.moduleForSession(db, s)?.id).toBe(ref.moduleForSession(db, s)?.id);
    }
    for (const n of [1, 2, 3, 4, 5, 6, 7])
      expect(core.sessionFor(db, 'dec26', n)?.id).toBe(ref.sessionFor(db, 'dec26', n)?.id);
    expect(core.sessionState(null, now)).toBe(ref.sessionState(null, now));
  });

  it('ics / csv / skill files / tiers', () => {
    const db = ref.seed('live');
    expect(core.csv([['a', 'b"c'], [1, null]])).toBe(ref.csv([['a', 'b"c'], [1, null]]));
    for (const m of db.modules) for (const f of m.files) expect(core.skillPreview(f, m)).toBe(ref.skillPreview(f, m));
    const ev = core.sessionEvent(db.sessions[0]!);
    expect(core.ics([ev]).replace(/DTSTAMP:\d+T\d+Z/, '')).toBe(ref.ics([ev]).replace(/DTSTAMP:\d+T\d+Z/, ''));
    const all = db.sessions as Session[];
    expect(core.ics(all.map((s) => core.sessionEvent(s))).replace(/DTSTAMP:\d+T\d+Z/g, '')).toBe(
      ref.ics(all.map((s) => ref.sessionEvent(s))).replace(/DTSTAMP:\d+T\d+Z/g, ''),
    );
  });

  it('upgradeUser / downgradeUser mutate identically', () => {
    for (const uid of ['u_kenji', 'u_jamie', 'u_alex', 'nobody']) {
      const a = ref.seed('live');
      const b = core.seed('live');
      expect(core.upgradeUser(b, uid)?.id).toBe(ref.upgradeUser(a, uid)?.id);
      expect(b).toEqual(a);
      expect(core.downgradeUser(b, uid)?.id).toBe(ref.downgradeUser(a, uid)?.id);
      expect(b).toEqual(a);
    }
  });
});
