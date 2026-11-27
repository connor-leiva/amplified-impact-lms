import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { phaseNow, seed, seedForDatabase, setViewerZone } from '@ai/core';
import type { Session } from '@ai/core';
import { cohortsR2VM, cohortsVM, sessionArgsR2, sessionForm, sessionFormR2, type CohortsVM } from './Cohorts.vm';
import { parityDb } from '../../data/parity-r2-db';

// Week 2 (`seed('live')`, `phaseNow('live')` = Mon 2026-12-07 10:42 CT), which is what the
// `admin-cohorts` and `admin-cohorts-edit` parity scenarios capture.
//
// Every expectation is a hard-coded literal, not a recomputation (phase 06 § 6.1): these strings
// were generated once from design-reference/Admin Cohorts.dc.html and are now pinned, so a change
// in `renderVals`' output fails here before it fails the fingerprint.

const WEEK2 = phaseNow('live');

const vmFor = (selected = 'dec26'): CohortsVM => cohortsVM(seed('live'), WEEK2, selected);
const session = (id: string): Session => seed('live').sessions.find((s) => s.id === id)!;

describe('cohortsVM @g6', () => {
  // `fmt.date` / `fmt.day` / `fmt.time` read the viewer zone, so pin it: `Tue, Dec 1` and
  // `1:00 PM CT` must not depend on the test machine.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  describe('the cohort cards', () => {
    it('draws the three seeded cohorts with their status, range, cadence and enrollment', () => {
      expect(vmFor().cohorts).toEqual([
        {
          id: 'dec26',
          name: 'December 2026',
          statusLabel: 'Live',
          tone: 'success',
          range: 'Dec 1 – Jan 8',
          cadence: 'Tue & Thu · 1:00 PM CT',
          enrolled: 148,
          capacity: 200,
          fill: '74%',
          selected: true,
        },
        {
          id: 'feb27',
          name: 'February 2027',
          statusLabel: 'Enrolling',
          tone: 'progress',
          range: 'Feb 2 – Mar 12',
          cadence: 'Tue & Thu · 1:00 PM CT',
          enrolled: 37,
          capacity: 200,
          fill: '19%',
          selected: false,
        },
        {
          id: 'apr27',
          name: 'April 2027',
          statusLabel: 'Draft',
          tone: 'neutral',
          range: 'Apr 6 – May 14',
          cadence: 'Tue & Thu · 1:00 PM CT',
          enrolled: 0,
          capacity: 200,
          fill: '0%',
          selected: false,
        },
      ]);
    });

    it('moves the selection, and only the selection, when another card is picked', () => {
      expect(vmFor('apr27').cohorts.map((c) => c.selected)).toEqual([false, false, true]);
      expect(vmFor('apr27').selectedId).toBe('apr27');
    });

    it('falls back to the first cohort when the selected id is gone', () => {
      const vm = vmFor('nope');
      expect(vm.selectedId).toBe('dec26');
      expect(vm.head!.title).toBe('December 2026 Schedule');
    });
  });

  describe('the schedule header', () => {
    it('reads the live cohort as in progress, with the whole learner population', () => {
      expect(vmFor().head).toEqual({
        cohortId: 'dec26',
        title: 'December 2026 Schedule',
        note: 'In progress · 148 learners · Tue & Thu · 1:00 PM CT',
        canOpen: false,
      });
    });

    it('reads an enrolling cohort as a count and a start day, and still offers no Open Enrollment', () => {
      expect(vmFor('feb27').head).toEqual({
        cohortId: 'feb27',
        title: 'February 2027 Schedule',
        note: '37 enrolled · starts Tue, Feb 2',
        canOpen: false,
      });
    });

    it('offers Open Enrollment on a draft cohort only', () => {
      expect(vmFor('apr27').head).toEqual({
        cohortId: 'apr27',
        title: 'April 2027 Schedule',
        note: 'Draft · not visible on the sales page',
        canOpen: true,
      });
    });
  });

  describe('the schedule table at Week 2', () => {
    it('lays the six dec26 sessions out in start order, with their linked AI Employee', () => {
      expect(vmFor().rows.map((r) => [r.n, r.title, r.module])).toEqual([
        [1, 'The Autonomous Agent', 'Marketing AI Employee'],
        [2, 'Speed to Lead', 'Sales AI Employee'],
        [3, 'The Living Database', 'Database AI Employee'],
        [4, 'The Meeting That Runs Itself', 'Meetings AI Employee · Team Tier'],
        [5, 'Numbers on Autopilot', 'Finance AI Employee · Team Tier'],
        [6, 'Contract to Close', 'Operations AI Employee · Team Tier'],
      ]);
    });

    it('prints the day and the time through fmt, with the duration appended', () => {
      expect(vmFor().rows.map((r) => `${r.day} · ${r.time}`)).toEqual([
        'Tue, Dec 1 · 1:00 PM CT · 75 min',
        'Thu, Dec 3 · 1:00 PM CT · 75 min',
        'Wed, Dec 9 · 1:00 PM CT · 75 min',
        'Thu, Dec 10 · 1:00 PM CT · 75 min',
        'Tue, Dec 15 · 1:00 PM CT · 75 min',
        'Thu, Dec 17 · 1:00 PM CT · 75 min',
      ]);
    });

    it('strips the scheme from the displayed Zoom link but copies the whole one', () => {
      const rows = vmFor().rows;
      expect(rows.map((r) => r.zoom)).toEqual([
        'zoom.us/j/8841200610',
        'zoom.us/j/8841201981',
        'zoom.us/j/8841203352',
        'zoom.us/j/8841204723',
        'zoom.us/j/8841206094',
        'zoom.us/j/8841207465',
      ]);
      expect(rows[0]!.zoomUrl).toBe('https://zoom.us/j/8841200610');
    });

    it('holds the two past sessions as Replay Ready and the rest as Scheduled, bar the next one', () => {
      expect(vmFor().rows.map((r) => [r.statusLabel, r.tone, r.pulse])).toEqual([
        ['Replay Ready', 'success', false],
        ['Replay Ready', 'success', false],
        ['Next Up', 'progress', false],
        ['Scheduled', 'neutral', false],
        ['Scheduled', 'neutral', false],
        ['Scheduled', 'neutral', false],
      ]);
    });

    it('tints Session 3 only, and gives it the Go Live button', () => {
      const rows = vmFor().rows;
      expect(rows.map((r) => r.isNext)).toEqual([false, false, true, false, false, false]);
      expect(rows[2]!.primary).toEqual({ label: 'Go Live', mutation: 'goLive', variant: 'success' });
      expect(rows.filter((r) => r.primary)).toHaveLength(1);
    });

    it('gives an enrolling cohort no next session and therefore no primary action', () => {
      const rows = vmFor('feb27').rows;
      expect(rows).toHaveLength(6);
      expect(rows.map((r) => r.statusLabel)).toEqual(Array(6).fill('Scheduled'));
      expect(rows.map((r) => r.isNext)).toEqual(Array(6).fill(false));
      expect(rows.map((r) => r.primary)).toEqual(Array(6).fill(null));
      expect(rows.map((r) => r.att)).toEqual(Array(6).fill('—'));
    });

    it('offers End Session on a live row and Publish Replay on a processing one', () => {
      const db = seed('live');
      const s3 = db.sessions.find((s) => s.id === 'dec26-s3')!;
      s3.live = true;
      expect(cohortsVM(db, WEEK2, 'dec26').rows[2]).toMatchObject({
        statusLabel: 'Live Now',
        tone: 'success',
        pulse: true,
        primary: { label: 'End Session', mutation: 'endSession', variant: 'outline' },
      });

      s3.live = false;
      s3.start = WEEK2 - 2 * 3600e3;
      s3.replay = 'processing';
      expect(cohortsVM(db, WEEK2, 'dec26').rows[2]).toMatchObject({
        statusLabel: 'Replay Processing',
        tone: 'neutral',
        pulse: false,
        primary: { label: 'Publish Replay', mutation: 'publishReplay', variant: 'primary' },
      });
    });
  });

  // phase 06 § 6.2 — the figures that must carry `db.base`.
  describe('db.base', () => {
    it('counts the 134 aggregate learners plus the 14 modelled ones', () => {
      expect(vmFor().learners).toBe(148);
    });

    it('divides attendance by that whole population, and em-dashes a session with none', () => {
      // 121 / 148 = 82%, 109 / 148 = 74%.
      expect(vmFor().rows.map((r) => r.att)).toEqual(['121 · 82%', '109 · 74%', '—', '—', '—', '—']);
    });

    it('shows live numbers from the same code when the API returns ZERO_BASE', () => {
      // `seedForDatabase` is `seed()` with `base: ZERO_BASE`, which is what http mode serves. The
      // VM does not branch: the base simply drops to 0 and the modelled learners stand alone.
      const vm = cohortsVM(seedForDatabase('live'), WEEK2, 'dec26');
      expect(vm.learners).toBe(14);
      expect(vm.head!.note).toBe('In progress · 14 learners · Tue & Thu · 1:00 PM CT');
      expect(vm.rows.map((r) => r.att).slice(0, 2)).toEqual(['121 · 864%', '109 · 779%']);
    });
  });

  describe('the edit drawer form', () => {
    it('seeds Session 3 — the row the admin-cohorts-edit scenario opens — in Central Time', () => {
      expect(sessionForm(session('dec26-s3'))).toEqual({
        title: 'The Living Database',
        date: '2026-12-09',
        time: '13:00',
        mins: '75',
        zoom: 'https://zoom.us/j/8841203352',
      });
    });

    it('round-trips: the seeded date and time reproduce the session start through fmt.fromCT', () => {
      const s = session('dec26-s1');
      const f = sessionForm(s);
      expect(f).toEqual({
        title: 'The Autonomous Agent',
        date: '2026-12-01',
        time: '13:00',
        mins: '75',
        zoom: 'https://zoom.us/j/8841200610',
      });
      expect(Date.parse(`${f.date}T${f.time}:00-06:00`)).toBe(s.start);
    });
  });
});

// ================================================================================================
// R2 (D-160 R2-2b): the mockup's Cohorts & Sessions, every time in MST.
// ================================================================================================

describe('cohortsR2VM (D-160 R2-2b)', () => {
  const NOW = Date.parse('2026-12-10T16:30:00Z');
  // The retired Cohorts & Sessions screen read a running cohort as `live`. R-5 Phase 5 (D-262) keeps the parity
  // world's December `enrolling` (taking sales, as its Enrollment card says), so this vm is read on its old status.
  const db = parityDb();
  db.cohorts = db.cohorts.map((c) => (c.id === 'dec26' ? { ...c, status: 'live' as const } : c));
  const vm = cohortsR2VM(db, NOW, 'dec26')!;

  it('has the cohort’s key facts', () => {
    expect(vm.facts).toEqual({
      cohort: 'December 2026',
      status: { label: 'Active', tone: 'ok' },
      opens: 'Wed, Dec 2 · 12:00 PM MST',
      week: '2 of 6',
      enrolled: '148 learners',
      cadence: 'Wednesdays, weekly',
    });
  });

  it('lists the sessions as the mockup does: invite, replay and attendance, "—" when there is none', () => {
    expect(
      vm.rows.map((r) => [r.title, r.when, r.week, r.invite.label, r.replay?.label ?? '—', r.attendance ?? '—']),
    ).toEqual([
      ['Session 1 · Lead-Source ROI Live Build', 'Wed, Dec 2 · 12:00 PM MST', 'Week 1', 'Sent', 'Ready', '82%'],
      ['Session 2 · Morning Brief Live Build', 'Wed, Dec 9 · 12:00 PM MST', 'Week 2', 'Sent', 'Ready', '74%'],
      ['Session 3 · Database Live Build', 'Wed, Dec 16 · 12:00 PM MST', 'Week 3', 'Scheduled', '—', '—'],
      ['Session 4 · Scorecard Live Build', 'Wed, Dec 23 · 12:00 PM MST', 'Week 4', 'Scheduled', '—', '—'],
      ['Session 5 · Contract to Close', 'Wed, Dec 30 · 12:00 PM MST', 'Week 5', 'Draft', '—', '—'],
      ['Session 6 · Handoff', 'Wed, Jan 6 · 12:00 PM MST', 'Week 6', 'Draft', '—', '—'],
    ]);
    expect(vm.rows.map((r) => r.primary?.label ?? null)).toEqual([null, null, 'Go Live', null, null, null]);
    expect(JSON.stringify(vm)).not.toMatch(/\bCT\b|Central/);
  });

  it('sends the invite once the 24-hour reminder window opens', () => {
    const day = cohortsR2VM(db, Date.parse('2026-12-15T19:30:00Z'), 'dec26')!;
    expect(day.rows[2]!.invite).toEqual({ label: 'Sent', tone: 'ok' });
    expect(day.rows[3]!.invite).toEqual({ label: 'Scheduled', tone: 'info' });
  });

  it('before the cohort opens: Scheduled, not started', () => {
    const early = cohortsR2VM(db, Date.parse('2026-11-20T16:00:00Z'), 'dec26')!;
    expect(early.facts.status).toEqual({ label: 'Scheduled', tone: 'info' });
    expect(early.facts.week).toBe('Not started');
  });

  it('edits a session in MST and saves the same instant in Central Time, which updateSession reads', () => {
    const s3 = db.sessions[2]!;
    const form = sessionFormR2(s3);
    expect(form).toEqual({
      title: 'Database Live Build',
      date: '2026-12-16',
      time: '12:00',
      mins: '60',
      zoom: s3.zoom,
    });
    expect(sessionArgsR2(s3.id, { ...form, time: '14:00' })).toEqual({
      id: s3.id,
      title: 'Database Live Build',
      date: '2026-12-16',
      time: '15:00',
      mins: '60',
      zoom: s3.zoom,
    });
  });

  it('reads the ordinary fixture too', () => {
    const live = cohortsR2VM(seed('live'), phaseNow('live'), 'dec26')!;
    expect(live.rows).toHaveLength(seed('live').sessions.filter((s) => s.cohortId === 'dec26').length);
    expect(live.rows.some((r) => r.primary)).toBe(true);
  });
});
