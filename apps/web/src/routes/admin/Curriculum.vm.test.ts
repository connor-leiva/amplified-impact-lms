import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { phaseNow, seed, setViewerZone, ZERO_BASE } from '@ai/core';
import type { Db } from '@ai/core';
import { curriculumR2VM, curriculumVM, movesFor, previewUrl, tierWords, type CurriculumRow } from './Curriculum.vm';
import { parityDb } from '../../data/parity-r2-db';
import { MODS0 } from '../../data/parity-r2';

// Admin Curriculum at the three demo instants, Week 2 first (phase 06 § 6.1).
//
// Every figure is a hard-coded literal, generated once from design-reference/Admin
// Curriculum.dc.html and then pinned: the point is to catch a change in `renderVals`' output,
// which is the half of the comparison the fingerprint checks pixel-side.
//
// The Deployed column is where `db.base` (phase 06 § 6.2) lives, so it is covered per phase AND
// against `ZERO_BASE`, which is what the API returns in http mode. The same function must produce
// both without ever asking where the data came from.

const WEEK0 = phaseNow('week0'); // Fri 2026-11-27 10:42 CT
const WEEK2 = phaseNow('live'); // Mon 2026-12-07 10:42 CT
const POST = phaseNow('post'); // Tue 2027-01-12 10:42 CT

const field = <K extends keyof CurriculumRow>(db: Db, now: number, k: K): CurriculumRow[K][] =>
  curriculumVM(db, now).rows.map((r) => r[k]);

describe('curriculumVM @g6', () => {
  // `fmt.day` and `fmt.time` read the viewer zone, so pin it: `Tue, Dec 1 · Replay ready` must
  // not depend on the test machine.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  describe('Week 2 · five published, Session 6 still scheduled', () => {
    const db = seed('live');
    const vm = curriculumVM(db, WEEK2);

    it('counts the AI Employees and the tier split in the subline', () => {
      expect(vm.summary).toBe('6 AI Employees · 3 in Agent Tier, all in Team Tier');
    });

    it('lists all six in curriculum order, numbered from 1', () => {
      expect(vm.rows.map((r) => r.id)).toEqual(['marketing', 'sales', 'database', 'meetings', 'finance', 'operations']);
      expect(field(db, WEEK2, 'order')).toEqual([1, 2, 3, 4, 5, 6]);
      expect(field(db, WEEK2, 'name')).toEqual([
        'Marketing AI Employee',
        'Sales AI Employee',
        'Database AI Employee',
        'Meetings AI Employee',
        'Finance AI Employee',
        'Operations AI Employee',
      ]);
      expect(field(db, WEEK2, 'icon')).toEqual(['megaphone', 'zap', 'database', 'mic', 'dollar', 'workflow']);
    });

    it('disables the up chevron on the first row and the down chevron on the last', () => {
      expect(field(db, WEEK2, 'canMoveUp')).toEqual([false, true, true, true, true, true]);
      expect(field(db, WEEK2, 'canMoveDown')).toEqual([true, true, true, true, true, false]);
    });

    it('puts the outcome line under the name', () => {
      expect(field(db, WEEK2, 'sub')).toEqual([
        'Paste an MLS listing → Fair-Housing-checked description, 5 social posts, 1 email.',
        'Paste a new lead → a first reply in your voice, 2 objection responses, a consult brief.',
        'Upload your contact export → 10 weekly check-ins, a 3-touch reactivation sequence, anniversary notes.',
        'Paste a meeting transcript → decisions, owners and due dates, next week’s agenda.',
        'Upload a Sisu export → net commission by agent, categorized expenses, margin flags.',
        'Upload an executed contract → a deadline timeline, milestone emails, a 30-day onboarding plan.',
      ]);
    });

    it('gates the three leadership AI Employees to the Team tier', () => {
      expect(field(db, WEEK2, 'tier')).toEqual(['agent', 'agent', 'agent', 'team', 'team', 'team']);
    });

    it('names each live session and says Replay ready once it has been held', () => {
      expect(field(db, WEEK2, 'sess')).toEqual([
        'Session 1 · The Autonomous Agent',
        'Session 2 · Speed to Lead',
        'Session 3 · The Living Database',
        'Session 4 · The Meeting That Runs Itself',
        'Session 5 · Numbers on Autopilot',
        'Session 6 · Contract to Close',
      ]);
      expect(field(db, WEEK2, 'sessSub')).toEqual([
        'Tue, Dec 1 · Replay ready',
        'Thu, Dec 3 · Replay ready',
        'Wed, Dec 9 · 1:00 PM CT',
        'Thu, Dec 10 · 1:00 PM CT',
        'Tue, Dec 15 · 1:00 PM CT',
        'Thu, Dec 17 · 1:00 PM CT',
      ]);
    });

    it('shows steps and files when published, and the open date when scheduled', () => {
      expect(field(db, WEEK2, 'status')).toEqual([
        'published',
        'published',
        'published',
        'published',
        'published',
        'scheduled',
      ]);
      expect(field(db, WEEK2, 'statusLabel')).toEqual([
        'Published',
        'Published',
        'Published',
        'Published',
        'Published',
        'Scheduled',
      ]);
      expect(field(db, WEEK2, 'stSub')).toEqual([
        '6 steps · 3 files',
        '6 steps · 3 files',
        '6 steps · 3 files',
        '6 steps · 3 files',
        '6 steps · 3 files',
        'Opens Dec 14',
      ]);
    });

    it('offers Unpublish on a published row and Publish Now on a scheduled one', () => {
      expect(field(db, WEEK2, 'actLabel')).toEqual([
        'Unpublish',
        'Unpublish',
        'Unpublish',
        'Unpublish',
        'Unpublish',
        'Publish Now',
      ]);
      expect(field(db, WEEK2, 'publishes')).toEqual([false, false, false, false, false, true]);
    });

    it('previews a Team-only AI Employee as the Team Owner and the rest as an Agent', () => {
      expect(field(db, WEEK2, 'previewAs')).toEqual(['agent', 'agent', 'agent', 'owner', 'owner', 'owner']);
    });

    it('opens the http-mode preview tab with the preview flag, never ?as= (D-138)', () => {
      const rows = curriculumVM(db, WEEK2).rows;
      expect(rows.map(previewUrl)).toEqual([
        '/employees/marketing?preview=agent',
        '/employees/sales?preview=agent',
        '/employees/database?preview=agent',
        '/employees/meetings?preview=owner',
        '/employees/finance?preview=owner',
        '/employees/operations?preview=owner',
      ]);
    });

    // base.mod = marketing [88,27,19] sales [54,38,42] database [21,30,83]
    //            meetings [6,9,20] finance [2,5,28] operations [0,0,35]
    // Agent-tier rows add all 14 modelled learners, Team-tier rows only the 9 on the Team tier:
    //   marketing   (88 + 10) / (134 + 14) = 98/148 = 66%
    //   sales       (54 +  4) / (134 + 14) = 58/148 = 39%
    //   database    (21 +  3) / (134 + 14) = 24/148 = 16%
    //   meetings    ( 6 +  2) / ( 35 +  9) =  8/44  = 18%
    //   finance     ( 2 +  0) / ( 35 +  9) =  2/44  =  5%
    //   operations  ( 0 +  0) / ( 35 +  9) =  0/44  =  0%
    it('adds db.base to both sides of the Deployed ratio', () => {
      expect(field(db, WEEK2, 'dep')).toEqual(['66%', '39%', '16%', '18%', '5%', '0%']);
    });

    it('reports only the modelled learners when the baseline is zero, same code path', () => {
      const live: Db = { ...db, base: ZERO_BASE };
      expect(field(live, WEEK2, 'dep')).toEqual(['71%', '29%', '21%', '22%', '0%', '0%']);
      // Everything that does not depend on the baseline is untouched.
      expect(curriculumVM(live, WEEK2).summary).toBe(vm.summary);
      expect(field(live, WEEK2, 'stSub')).toEqual(field(db, WEEK2, 'stSub'));
    });
  });

  describe('Week 0 · nothing held and nobody built', () => {
    const db = seed('week0');

    it('keeps the same subline, because no AI Employee is a draft yet', () => {
      expect(curriculumVM(db, WEEK0).summary).toBe('6 AI Employees · 3 in Agent Tier, all in Team Tier');
    });

    it('shows Session 3 on the date it was first scheduled, before the move to Wed Dec 9', () => {
      expect(field(db, WEEK0, 'sessSub')).toEqual([
        'Tue, Dec 1 · 1:00 PM CT',
        'Thu, Dec 3 · 1:00 PM CT',
        'Tue, Dec 8 · 1:00 PM CT',
        'Thu, Dec 10 · 1:00 PM CT',
        'Tue, Dec 15 · 1:00 PM CT',
        'Thu, Dec 17 · 1:00 PM CT',
      ]);
    });

    // Week 0 moves the whole baseline into "not started", so every numerator is 0 — but the
    // denominators still carry base.mod, which is what makes these 0% and not an em dash.
    it('reports 0% everywhere while still counting the baseline audience', () => {
      expect(field(db, WEEK0, 'dep')).toEqual(['0%', '0%', '0%', '0%', '0%', '0%']);
    });
  });

  describe('After Cohort · every session held and Session 6 published', () => {
    const db = seed('post');

    it('turns the scheduled row into a published one with steps and files', () => {
      expect(field(db, POST, 'status')).toEqual(Array<string>(6).fill('published'));
      expect(field(db, POST, 'actLabel')).toEqual(Array<string>(6).fill('Unpublish'));
      expect(field(db, POST, 'stSub')).toEqual(Array<string>(6).fill('6 steps · 3 files'));
    });

    it('says Replay ready on all six', () => {
      expect(field(db, POST, 'sessSub')).toEqual([
        'Tue, Dec 1 · Replay ready',
        'Thu, Dec 3 · Replay ready',
        'Wed, Dec 9 · Replay ready',
        'Thu, Dec 10 · Replay ready',
        'Tue, Dec 15 · Replay ready',
        'Thu, Dec 17 · Replay ready',
      ]);
    });

    // base.mod = marketing [118,8,8] sales [101,17,16] database [92,22,20]
    //            meetings [28,4,3] finance [25,6,4] operations [22,8,5]
    // Omar and Lena never finish, so 12 of the 14 modelled learners deploy every Agent-tier
    // AI Employee and 8 of the 9 Team-tier learners deploy every leadership one.
    it('adds the post-cohort baseline to the Deployed ratio', () => {
      expect(field(db, POST, 'dep')).toEqual(['88%', '76%', '70%', '82%', '75%', '68%']);
    });
  });

  describe('a draft AI Employee', () => {
    const base = seed('live');
    const db: Db = {
      ...base,
      modules: base.modules.map((m) => (m.id === 'operations' ? { ...m, status: 'draft' as const } : m)),
    };

    it('counts the draft in the subline', () => {
      expect(curriculumVM(db, WEEK2).summary).toBe('6 AI Employees · 3 in Agent Tier, all in Team Tier · 1 draft');
    });

    it('hides it from learners, offers Publish, and dashes out the Deployed column', () => {
      expect(curriculumVM(db, WEEK2).rows[5]!).toMatchObject({
        status: 'draft',
        statusLabel: 'Draft',
        stSub: 'Hidden from learners',
        dep: '—',
        actLabel: 'Publish',
        publishes: true,
      });
    });
  });

  describe('an AI Employee with no live session', () => {
    const base = seed('live');
    const db: Db = {
      ...base,
      modules: base.modules.map((m) => (m.id === 'finance' ? { ...m, session: null, outcome: '' } : m)),
    };

    it('reads Self-paced, with the reference placeholder for a missing outcome line', () => {
      expect(curriculumVM(db, WEEK2).rows[4]!).toMatchObject({
        sess: 'Self-paced',
        sessSub: 'No live session',
        sub: 'No outcome line yet',
      });
    });
  });

  describe('a viewer outside Central time', () => {
    it('puts the viewer zone first and the program zone in parentheses', () => {
      setViewerZone('America/New_York');
      try {
        expect(field(seed('live'), WEEK2, 'sessSub')[2]).toBe('Wed, Dec 9 · 2:00 PM ET (1:00 PM CT)');
      } finally {
        setViewerZone('America/Chicago');
      }
    });
  });
});

// ================================================================================================
// R2 (D-160 R2-2): the mockup's Curriculum, from the parity snapshot and from the ordinary fixture.
// ================================================================================================

describe('curriculumR2VM (D-160 R2-2)', () => {
  const NOW = Date.parse('2026-12-10T16:30:00Z'); // the mockup's "now": Thu, Dec 10, 9:30 AM MT / 10:30 AM CT
  const vm = curriculumR2VM(parityDb(), NOW);
  const row = (id: string) => vm.rows.find((r) => r.id === id)!;

  it('has the mockup’s summary, with the drafts kept together', () => {
    expect(vm.summary).toBe('15 AI Employees · 3 in Agent Tier, all in Team Tier · 6\u00A0draft');
    expect(vm.summaryPhone).toBe('15 AI Employees · 3 in Agent\u00A0Tier\u00A0·\u00A06\u00A0draft');
    expect(vm.started).toBe(true);
  });

  it('lists MODS0 in order, with statuses, lines and Deployed', () => {
    expect(vm.rows.map((r) => r.name)).toEqual(MODS0.map((m) => m.n));
    expect(vm.rows.map((r) => r.statusLabel)).toEqual(MODS0.map((m) => m.st));
    expect(row('m1')).toMatchObject({
      order: 1,
      statusLine: '6 steps · 3 files',
      deployed: 66,
      tier: 'agent',
      icon: 'r2Announce',
    });
    expect(row('m6')).toMatchObject({
      statusLine: 'Opens Dec 14',
      deployed: null,
      depLabel: 'Not started',
      statusTone: 'info',
    });
    expect(row('m10')).toMatchObject({
      statusLine: 'Hidden from learners',
      deployed: null,
      depLabel: 'Not published',
      statusTone: 'off',
    });
    expect(vm.rows.filter((r) => r.deployed !== null).map((r) => r.deployed)).toEqual([66, 91, 74, 35, 38]);
  });

  it('prints each live session in MT and CT, in every form the table needs (D-267)', () => {
    expect(row('m3').session).toEqual({
      title: 'Session 1 · Lead-Source ROI Live Build',
      when: 'Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT · Replay ready',
      full: 'Session 1 · Lead-Source ROI Live Build · Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT · Replay ready',
      short: 'Lead-Source ROI',
      date: 'Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT',
      brief: 'Session 1 · Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT',
      n: 'Session 1',
      day: 'Wed, Dec 2',
    });
    expect(row('m7').session!.when).toBe('Wed, Dec 16 · 12:00 PM MT / 1:00 PM CT');
    expect(row('m13').session!.short).toBe('Handoff');
    expect(row('m1').session).toBeNull();
    for (const r of vm.rows) expect(JSON.stringify(r)).not.toMatch(/\bMST\b/); // D-267: MT, with CT after it
  });

  it('writes the phone card’s meta line as the mockup does', () => {
    expect(row('m1').meta).toBe('Self-paced · 66% deployed');
    expect(row('m3').meta).toBe('Session 1 · Wed, Dec 2 · 74% deployed');
    expect(row('m7').meta).toBe('Session 3 · Wed, Dec 16');
    expect(row('m11').meta).toBe('Hidden from learners · Wed, Dec 30');
    expect(row('m12').meta).toBe('Hidden from learners · Self-paced');
  });

  it('before the cohort opens, nothing is deployed yet', () => {
    const early = curriculumR2VM(parityDb(), Date.parse('2026-11-20T16:00:00Z'));
    expect(early.started).toBe(false);
    expect(early.rows[0]).toMatchObject({ deployed: null, depLabel: 'Not started', meta: 'Self-paced · Not started' });
  });

  it('reads the ordinary fixture the same way, the baseline included (phase 06 § 6.2)', () => {
    const live = curriculumR2VM(seed('live'), WEEK2);
    expect(live.rows.map((r) => r.id)).toEqual(['marketing', 'sales', 'database', 'meetings', 'finance', 'operations']);
    expect(live.rows.map((r) => r.publishes)).toEqual(curriculumVM(seed('live'), WEEK2).rows.map((r) => r.publishes));
    const zero = curriculumR2VM({ ...seed('live'), base: ZERO_BASE, users: [] }, WEEK2);
    expect(zero.rows.filter((r) => r.status === 'published').every((r) => r.deployed === 0)).toBe(true);
  });

  it('turns a drag into one-place moves', () => {
    expect(movesFor(4, 1)).toEqual({ dir: -1, times: 3 });
    expect(movesFor(0, 2)).toEqual({ dir: 1, times: 2 });
    expect(tierWords('agent')).toBe('Agent + Team');
    expect(tierWords('team')).toBe('Team only');
  });
});
