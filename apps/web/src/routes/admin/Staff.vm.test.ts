import { describe, expect, it } from 'vitest';
import { PERMS, phaseNow, seed, setViewerZone, STAFF_ROLES, ZERO_BASE } from '@ai/core';
import { STAFF_UI, staffVM } from './Staff.vm';
import type { StaffUi, StaffVM } from './Staff.vm';

// Phase 06 § 6.1 step 3: explicit expectations at Week 2. Every literal below was generated once
// from the reference's `renderVals()` — cross-checked against compliance/goldens/admin-staff-main.json,
// which is the copy-and-typography oracle — and is now pinned. If the view-model drifts, the test
// must say what it now produces rather than agree with it.
//
// The program zone is pinned so `fmt.agoInline` is deterministic: a CT viewer sees a single zone,
// which is the state the goldens were captured in.
//
// The last block is the phase 06 § 6.2 rule under test. Staff & Roles is the one admin screen with
// no aggregate figure, so the obligation here is the other half of the rule: the identical VM run
// over the fixture's `base` and over `ZERO_BASE` — what the API returns in http mode — produces
// exactly the same output, because nothing on this screen reads `db.base` or the data source.

const CT = 'America/Chicago';

const at = (ui: Partial<StaffUi> = {}): StaffVM => {
  setViewerZone(CT);
  return staffVM(seed('live'), phaseNow('live'), { ...STAFF_UI, ...ui });
};

describe('staffVM @g6', () => {
  // ---- Team Members rows ------------------------------------------------------------------------
  describe('team member rows', () => {
    it('renders the four seeded staff, the first one marked as the viewer', () => {
      expect(at().rows).toEqual([
        {
          id: 'st1',
          name: 'Casey Lin (you)',
          plainName: 'Casey Lin',
          email: 'casey@amplifiedimpact.com',
          role: 'Owner',
          isOwner: true,
          invited: false,
          last: 'Active 2 min ago',
          divider: false,
          removeTone: 'disabled',
        },
        {
          id: 'st2',
          name: 'Jordan Hale',
          plainName: 'Jordan Hale',
          email: 'jordan@amplifiedimpact.com',
          role: 'Instructor',
          isOwner: false,
          invited: false,
          last: 'Active 1 hour ago',
          divider: true,
          removeTone: 'default',
        },
        {
          id: 'st3',
          name: 'Maya Chen',
          plainName: 'Maya Chen',
          email: 'maya@amplifiedimpact.com',
          role: 'Content Editor',
          isOwner: false,
          invited: false,
          last: 'Active 17 hours ago',
          divider: true,
          removeTone: 'default',
        },
        {
          id: 'st4',
          name: 'Luis Romero',
          plainName: 'Luis Romero',
          email: 'luis@amplifiedimpact.com',
          role: 'Support',
          isOwner: false,
          invited: false,
          last: 'Active 2 hours ago',
          divider: true,
          removeTone: 'default',
        },
      ]);
    });

    it('appends ` (you)` to the first row only, whoever the row happens to be', () => {
      const vm = at();
      expect(vm.rows.filter((r) => r.name.endsWith(' (you)'))).toHaveLength(1);
      // The suffix is display only: everything that addresses the person uses the bare name.
      expect(vm.rows[0]?.plainName).toBe('Casey Lin');
    });

    it('shows `Invite pending` and a dashed avatar for a staff member who has never signed in', () => {
      setViewerZone(CT);
      const db = seed('live');
      db.staff.push({
        id: 'st9',
        name: 'Robin Vale',
        email: 'robin@amplifiedimpact.com',
        role: 'Support',
        last: null,
      });
      const row = staffVM(db, phaseNow('live'), STAFF_UI).rows[4];
      expect(row).toEqual({
        id: 'st9',
        name: 'Robin Vale',
        plainName: 'Robin Vale',
        email: 'robin@amplifiedimpact.com',
        role: 'Support',
        isOwner: false,
        invited: true,
        last: 'Invite pending',
        divider: true,
        removeTone: 'default',
      });
    });

    it('marks only the Owner as fixed, which is what disables their select and dims their remove', () => {
      const vm = at();
      expect(vm.rows.map((r) => r.isOwner)).toEqual([true, false, false, false]);
      expect(vm.rows.map((r) => r.removeTone)).toEqual(['disabled', 'default', 'default', 'default']);
    });
  });

  // ---- The role selects --------------------------------------------------------------------------
  describe('role options', () => {
    it('offers all five roles on a row, in STAFF_ROLES order', () => {
      expect(at().roles).toEqual(['Owner', 'Admin', 'Instructor', 'Content Editor', 'Support']);
      expect(at().roles).toEqual([...STAFF_ROLES]);
    });

    it('offers every role but Owner on the invite row', () => {
      expect(at().inviteRoles).toEqual(['Admin', 'Instructor', 'Content Editor', 'Support']);
    });

    it('opens the invite select on Instructor', () => {
      expect(at().newRole).toBe('Instructor');
      expect(STAFF_UI).toEqual({ email: '', newRole: 'Instructor', err: '' });
    });
  });

  // ---- The permissions matrix ---------------------------------------------------------------------
  describe('permissions matrix', () => {
    it('is the eight PERMS by the five STAFF_ROLES, with the seeded grid', () => {
      const vm = at();
      expect(vm.perms.map((p) => [p.key, p.label, p.cells.map((c) => c.on)])).toEqual([
        ['curriculum', 'Edit curriculum', [true, true, true, true, false]],
        ['publish', 'Publish modules', [true, true, false, false, false]],
        ['cohorts', 'Manage cohorts & sessions', [true, true, true, false, false]],
        ['viewLearners', 'View learners', [true, true, true, true, true]],
        ['seats', 'Manage learners & seats', [true, true, false, false, true]],
        ['announce', 'Send announcements', [true, true, true, false, false]],
        ['billing', 'Manage pricing & upgrades', [true, true, false, false, false]],
        ['staff', 'Manage staff', [true, false, false, false, false]],
      ]);
    });

    it('keeps the rows in PERMS order and the columns in STAFF_ROLES order', () => {
      const vm = at();
      expect(vm.perms.map((p) => p.key)).toEqual(PERMS.map(([k]) => k));
      expect(vm.perms.map((p) => p.label)).toEqual(PERMS.map(([, label]) => label));
      for (const p of vm.perms) expect(p.cells.map((c) => c.role)).toEqual([...STAFF_ROLES]);
    });

    it('fixes the Owner column and nothing else', () => {
      for (const p of at().perms) {
        expect(p.cells.map((c) => c.fixed)).toEqual([true, false, false, false, false]);
      }
    });

    it('has the Owner holding every permission, so the fixed column is all checked', () => {
      for (const p of at().perms) expect(p.cells[0]).toEqual({ role: 'Owner', on: true, fixed: true });
    });

    it('turns a cell on when the stored grid changes, and never reads it any other way', () => {
      setViewerZone(CT);
      const db = seed('live');
      db.perms.Support.publish = 1;
      const row = staffVM(db, phaseNow('live'), STAFF_UI).perms.find((p) => p.key === 'publish');
      expect(row?.cells.map((c) => c.on)).toEqual([true, true, false, false, true]);
    });

    it('treats a role missing from the grid as holding nothing, rather than throwing', () => {
      setViewerZone(CT);
      const db = seed('live');
      // What a snapshot scoped by the API, or one written before a role existed, can look like.
      delete (db.perms as Partial<typeof db.perms>).Support;
      const vm = staffVM(db, phaseNow('live'), STAFF_UI);
      expect(vm.perms.every((p) => p.cells[4]?.on === false)).toBe(true);
    });
  });

  // ---- The invite form's own state ----------------------------------------------------------------
  describe('invite form', () => {
    it('passes the typed email and the chosen role straight through', () => {
      const vm = at({ email: 'robin@amplifiedimpact.com', newRole: 'Admin' });
      expect(vm.email).toBe('robin@amplifiedimpact.com');
      expect(vm.newRole).toBe('Admin');
      expect(vm.err).toBe('');
    });

    it('renders whichever of the two inviteStaff errors the screen is holding', () => {
      expect(at({ err: 'Enter a valid email address.' }).err).toBe('Enter a valid email address.');
      expect(at({ err: 'That person is already on staff.' }).err).toBe('That person is already on staff.');
    });

    it('defaults to no error, which is the state the golden was captured in', () => {
      expect(at().err).toBe('');
    });
  });

  // ---- phase 06 § 6.2: the same arithmetic in fixture and http mode --------------------------------
  describe('db.base (phase 06 § 6.2)', () => {
    it('produces an identical view-model over ZERO_BASE, because nothing here is an aggregate', () => {
      setViewerZone(CT);
      const now = phaseNow('live');
      const fixture = staffVM(seed('live'), now, STAFF_UI);
      const http = staffVM({ ...seed('live'), base: ZERO_BASE }, now, STAFF_UI);
      expect(http).toEqual(fixture);
    });

    it('still reads every staff member and permission from the snapshot itself', () => {
      setViewerZone(CT);
      const vm = staffVM({ ...seed('live'), base: ZERO_BASE }, phaseNow('live'), STAFF_UI);
      expect(vm.rows).toHaveLength(4);
      expect(vm.perms).toHaveLength(8);
      expect(vm.perms[0]?.cells).toHaveLength(5);
    });
  });
});
