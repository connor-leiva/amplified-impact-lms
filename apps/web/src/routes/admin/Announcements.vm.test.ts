import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ZERO_BASE, phaseNow, seed, setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import {
  announceR2Rows,
  announcementsVM,
  atForSend,
  blankAnnouncementForm,
  channelsFrom,
  channelsOf,
  defaultScheduleMst,
} from './Announcements.vm';
import { parityDb } from '../../data/parity-r2-db';
import { ANNOUNCEMENTS, mockCt } from '../../data/parity-r2';
import type { AnnouncementForm, AnnouncementsUi, AnnouncementsVM } from './Announcements.vm';

// Differential test for the Admin Announcements view-model (SCREENS § 4.7).
//
// Every expectation is a literal generated once from design-reference/Admin Announcements.dc.html
// at Week 2 and then pinned (phase 06 § 6.1) — never a recomputation of the logic under test. The
// `Reaches …` figures are the `db.base` cases phase 06 § 6.2 calls out, and each one is asserted
// twice: against `seed('live')`, and against the same snapshot with `ZERO_BASE`, which is what the
// API returns in http mode.

const ui = (over: Partial<AnnouncementForm> = {}, err = ''): AnnouncementsUi => ({
  form: { ...blankAnnouncementForm(), ...over },
  err,
});

const labels = (os: readonly { label: string }[]): string[] => os.map((o) => o.label);
const onValue = <T>(os: readonly { value: T; on: boolean }[]): T[] => os.filter((o) => o.on).map((o) => o.value);

/** The snapshot the http API serves: live rows, no baseline aggregate. */
const zeroed = (db: Db): Db => ({ ...db, base: ZERO_BASE });

describe('announcementsVM @g6', () => {
  // `fmt.date` and `fmt.time` read the viewer zone, so pin it: `Dec 11, 8:00 AM CT` must not
  // depend on the test machine.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  describe('Casey Lin (Owner) · Week 2', () => {
    const db = seed('live');
    const vm: AnnouncementsVM = announcementsVM(db, ui());

    it('is a Week 2 snapshot of 14 modelled learners, 3 teams and 3 announcements', () => {
      // Nothing this screen renders depends on `now` — every stamp is absolute and the preview's
      // is the literal `Just now` — so the VM takes no clock. Asserted so a later edit that
      // reaches for the clock has to change this test first.
      expect(phaseNow('live')).toBe(Date.parse('2026-12-07T10:42:00-06:00'));
      expect(db.users.filter((u) => u.status !== 'invited')).toHaveLength(14);
      expect(db.teams).toHaveLength(3);
      expect(db.announcements).toHaveLength(3);
      expect(db.reminders).toHaveLength(5);
    });

    // -----------------------------------------------------------------------------------------
    // phase 06 § 6.2 — every `Reaches …` figure adds `db.base`
    // -----------------------------------------------------------------------------------------

    it('reaches 148 learners for All Learners: base.learners 134 + the 14 modelled learners', () => {
      expect(db.base.learners).toBe(134);
      expect(vm.reach).toBe('Reaches 148 learners');
    });

    it('reaches 104 for Agent Tier: base.agent 99 + the 5 modelled agents', () => {
      expect(db.base.agent).toBe(99);
      expect(announcementsVM(db, ui({ audience: 'agent' })).reach).toBe('Reaches 104 learners');
    });

    it('reaches 44 for Team Tier: base.teamSeats 35 + the 9 modelled team seats', () => {
      expect(db.base.teamSeats).toBe(35);
      expect(announcementsVM(db, ui({ audience: 'team' })).reach).toBe('Reaches 44 learners');
    });

    it('reaches 7 Team Owners, and says `team owners` rather than `learners`', () => {
      expect(db.base.teams).toBe(4);
      expect(announcementsVM(db, ui({ audience: 'owners' })).reach).toBe('Reaches 7 team owners');
    });

    it('drops to the live counts against a ZERO_BASE snapshot (http mode)', () => {
      // The same arithmetic, the same code path: the VM never branches on the data source.
      const live = zeroed(db);
      expect(announcementsVM(live, ui()).reach).toBe('Reaches 14 learners');
      expect(announcementsVM(live, ui({ audience: 'agent' })).reach).toBe('Reaches 5 learners');
      expect(announcementsVM(live, ui({ audience: 'team' })).reach).toBe('Reaches 9 learners');
      expect(announcementsVM(live, ui({ audience: 'owners' })).reach).toBe('Reaches 3 team owners');
    });

    it('formats a five-figure reach with a thousands separator', () => {
      const big = { ...db, base: { ...db.base, learners: 12_345 } };
      expect(announcementsVM(big, ui()).reach).toBe('Reaches 12,359 learners');
    });

    // -----------------------------------------------------------------------------------------
    // The composer's controls
    // -----------------------------------------------------------------------------------------

    it('starts from the reference`s own draft: All Learners, both channels, Info, None, Send Now', () => {
      expect(blankAnnouncementForm()).toEqual({
        title: '',
        body: '',
        audience: 'all',
        inapp: true,
        email: true,
        when: 'now',
        at: '2026-12-09T09:00',
        severity: 'info',
        action: '',
      });
    });

    it('labels the four audiences in order and marks the selected one', () => {
      expect(labels(vm.audience)).toEqual(['All Learners', 'Agent Tier', 'Team Tier', 'Team Owners']);
      expect(onValue(vm.audience)).toEqual(['all']);
      expect(onValue(announcementsVM(db, ui({ audience: 'owners' })).audience)).toEqual(['owners']);
    });

    it('labels both channels and starts with both on', () => {
      expect(labels(vm.channels)).toEqual(['In-App Banner', 'Email']);
      expect(onValue(vm.channels)).toEqual(['inapp', 'email']);
      expect(onValue(announcementsVM(db, ui({ inapp: false })).channels)).toEqual(['email']);
      expect(onValue(announcementsVM(db, ui({ email: false })).channels)).toEqual(['inapp']);
    });

    it('labels the two severities and the three action buttons', () => {
      expect(labels(vm.severities)).toEqual(['Info', 'Warning']);
      expect(onValue(vm.severities)).toEqual(['info']);
      expect(onValue(announcementsVM(db, ui({ severity: 'warning' })).severities)).toEqual(['warning']);

      expect(labels(vm.actions)).toEqual(['None', 'Update Calendar', 'Open Sessions']);
      expect(onValue(vm.actions)).toEqual(['']);
      expect(onValue(announcementsVM(db, ui({ action: 'sessions' })).actions)).toEqual(['sessions']);
    });

    it('labels When, hides the schedule input until Schedule is picked, and renames the button', () => {
      expect(labels(vm.whens)).toEqual(['Send Now', 'Schedule']);
      expect(onValue(vm.whens)).toEqual(['now']);
      expect(vm.scheduling).toBe(false);
      expect(vm.sendLabel).toBe('Send Now');

      const later = announcementsVM(db, ui({ when: 'later' }));
      expect(onValue(later.whens)).toEqual(['later']);
      expect(later.scheduling).toBe(true);
      expect(later.sendLabel).toBe('Schedule');
      expect(later.form.at).toBe('2026-12-09T09:00');
    });

    it('passes an inline error straight through', () => {
      expect(vm.err).toBe('');
      expect(announcementsVM(db, ui({}, 'Pick at least one channel.')).err).toBe('Pick at least one channel.');
    });

    // -----------------------------------------------------------------------------------------
    // The banner preview
    // -----------------------------------------------------------------------------------------

    it('previews the empty draft with the reference`s placeholder copy and no action button', () => {
      expect(vm.preview).toEqual({
        severity: 'info',
        title: 'Your announcement title',
        body: 'Your message appears here on every learner dashboard in the audience.',
        when: 'Just now',
        actionLabel: '',
        dim: false,
      });
    });

    it('previews what has been typed, with the chosen severity and action label', () => {
      expect(
        announcementsVM(
          db,
          ui({
            title: 'Office hours moved to 2:00 PM MT / 3:00 PM CT',
            body: 'Same link as always.',
            severity: 'warning',
            action: 'calendar',
          }),
        ).preview,
      ).toEqual({
        severity: 'warning',
        title: 'Office hours moved to 2:00 PM MT / 3:00 PM CT',
        body: 'Same link as always.',
        when: 'Just now',
        actionLabel: 'Update Calendar',
        dim: false,
      });
      expect(announcementsVM(db, ui({ action: 'sessions' })).preview.actionLabel).toBe('Open Sessions');
    });

    it('dims the preview to 40% when the in-app channel is off', () => {
      expect(announcementsVM(db, ui({ inapp: false })).preview.dim).toBe(true);
      expect(announcementsVM(db, ui({ inapp: true, email: false })).preview.dim).toBe(false);
    });

    // -----------------------------------------------------------------------------------------
    // Automated Reminders
    // -----------------------------------------------------------------------------------------

    it('lists the five reminders with the channel and the state in the text', () => {
      expect(vm.reminders).toEqual([
        { id: 'rm1', label: '24 hours before each live session', channel: 'Email · On', on: true },
        { id: 'rm2', label: '1 hour before each live session', channel: 'Email + SMS · On', on: true },
        { id: 'rm3', label: 'Replay is ready', channel: 'Email · On', on: true },
        {
          id: 'rm4',
          label: 'Build not finished 48 hours after its session',
          channel: 'Email · On',
          on: true,
        },
        {
          id: 'rm5',
          label: 'Weekly progress digest for team owners',
          channel: 'Email · Off',
          on: false,
        },
      ]);
    });

    // -----------------------------------------------------------------------------------------
    // History
    // -----------------------------------------------------------------------------------------

    it('orders history newest first, so the scheduled digest leads', () => {
      expect(vm.history.map((h) => h.id)).toEqual(['a3', 'a1', 'a2']);
    });

    it('renders the scheduled row with an em dash for Opened', () => {
      expect(vm.history[0]).toEqual({
        id: 'a3',
        title: 'Weekly team progress digest',
        body: 'Who has built, who is stuck, and what to review before Thursday.',
        aud: 'Team Owners',
        ch: 'Email',
        status: 'Scheduled',
        sent: false,
        at: 'Dec 11, 8:00 AM CT',
        opens: '—',
      });
    });

    it('joins both channels and rounds the open rate on the sent rows', () => {
      expect(vm.history[1]).toEqual({
        id: 'a1',
        title: 'Session 3 moved to Wed Dec 9 · 1:00 PM CT',
        body: '',
        aud: 'All Learners',
        ch: 'In-app + Email',
        status: 'Sent',
        sent: true,
        at: 'Dec 6, 3:00 PM CT',
        opens: '71%',
      });
      expect(vm.history[2]).toEqual({
        id: 'a2',
        title: 'Replay is up: Session 2 · Speed to Lead',
        body: 'The replay, chapters and transcript are on the Sales AI Employee page.',
        aud: 'All Learners',
        ch: 'Email',
        status: 'Sent',
        sent: true,
        at: 'Dec 3, 5:30 PM CT',
        opens: '64%',
      });
    });

    it('reads history identically against a ZERO_BASE snapshot (http mode)', () => {
      // No History column is an aggregate, so dropping the baseline must change nothing here.
      expect(announcementsVM(zeroed(db), ui()).history).toEqual(vm.history);
      expect(announcementsVM(zeroed(db), ui()).reminders).toEqual(vm.reminders);
    });

    it('leaves the snapshot`s own announcement order untouched', () => {
      announcementsVM(db, ui());
      expect(db.announcements.map((a) => a.id)).toEqual(['a1', 'a2', 'a3']);
    });
  });
});

// ================================================================================================
// R2 (D-160 R2-2b): the mockup's Announcements, send times in MST.
// ================================================================================================

describe('announceR2Rows (D-160 R2-2b)', () => {
  it('lists the announcements newest first, in the mockup’s words; a draft has no send time', () => {
    expect(
      announceR2Rows(parityDb()).map((r) => [r.title, r.audience, r.channels, r.status.label, r.sendTime]),
    ).toEqual(ANNOUNCEMENTS.map((r) => [...r.slice(0, 4), mockCt(r[4])]));
    expect(announceR2Rows(parityDb()).map((r) => r.status.tone)).toEqual(['ok', 'ok', 'info', 'off']);
  });

  it('keeps the snapshot’s order, which is newest first', () => {
    const db = seed('live');
    expect(announceR2Rows(db).map((r) => r.id)).toEqual(db.announcements.map((a) => a.id));
  });

  it('maps the Channels select to the two switches and back', () => {
    expect(channelsOf({ inapp: true, email: true })).toBe('both');
    expect(channelsOf({ inapp: false, email: true })).toBe('email');
    expect(channelsOf({ inapp: true, email: false })).toBe('inapp');
    expect(channelsFrom('both')).toEqual({ inapp: true, email: true });
    expect(channelsFrom('email')).toEqual({ inapp: false, email: true });
  });

  it('schedules in MST and hands sendAnnouncement the same instant in Central Time', () => {
    expect(atForSend('2026-12-15T12:00')).toBe('2026-12-15T13:00');
    expect(defaultScheduleMst(blankAnnouncementForm().at)).toBe('2026-12-09T08:00');
  });
});
