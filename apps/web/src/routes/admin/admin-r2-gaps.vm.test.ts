// D-172 R2-gaps: the view-model helpers behind the Vault's Download and Edit details, Cohorts' Add
// session and Attach replay, and Announcements' Edit. The writes themselves are `@ai/core`'s
// (`packages/core/test/admin-actions.test.ts`).
import { describe, expect, it } from 'vitest';
import { phaseNow, seed } from '@ai/core';
import { addSessionArgsR2, blankSessionFormR2, cohortsR2VM } from './Cohorts.vm';
import { announcementFields, announcementFormOf, editable } from './Announcements.vm';
import { attachOptions, forcesTeam, vaultEditArgs, vaultEditForm, vaultFileOf } from './VaultManager.vm';

describe('Vault: Download and Edit details (D-172)', () => {
  it('saves the reference’s stand-in file in the fixture build', () => {
    expect(vaultFileOf({ title: 'Standard chart of accounts', type: 'Sheet', desc: 'D', cat: 'C' })).toEqual({
      name: 'standard-chart-of-accounts.md',
      body: '# Standard chart of accounts\n\nD\n\nCategory: C\n',
      mime: 'text/plain',
    });
    expect(vaultFileOf({ title: 'A b', type: 'Claude Project', desc: '', cat: 'C' }).name).toBe('a-b.json');
    expect(JSON.parse(vaultFileOf({ title: 'A b', type: 'Workflow JSON', desc: '', cat: 'C' }).body)).toMatchObject({ name: 'A b', category: 'C' });
    expect(vaultFileOf({ title: 'A', type: 'PDF guide', desc: '', cat: 'C' })).toMatchObject({ name: 'a.pdf', mime: 'text/plain' });
  });

  it('fills the dialog from a row and hands editResource null for "None"', () => {
    const db = seed('live');
    const r = db.resources[0]!;
    const f = vaultEditForm(r);
    expect(f).toEqual({ id: r.id, title: r.title, desc: r.desc, cat: r.cat, tier: r.tier, module: '' });
    expect(vaultEditArgs(f).module).toBeNull();
    expect(vaultEditArgs({ ...f, module: 'sales' }).module).toBe('sales');
    expect(vaultEditForm({ ...r, module: 'sales' }).module).toBe('sales');
    const opts = attachOptions(db);
    expect(opts[0]).toEqual({ value: '', label: 'None' });
    expect(opts.slice(1).map((o) => o.value)).toEqual([...db.modules].sort((a, b) => a.order - b.order).map((m) => m.id));
    expect(forcesTeam('Organizational SOPs')).toBe(true);
    expect(forcesTeam('Lead Generation Scripts')).toBe(false);
  });
});

describe('Cohorts: Add session and Attach replay (D-172)', () => {
  it('starts Add session at the program’s time and length, and hands addSession the cohort on screen', () => {
    expect(blankSessionFormR2()).toEqual({ title: '', date: '', time: '12:00', mins: '75', zoom: '' });
    expect(addSessionArgsR2('dec26', { ...blankSessionFormR2(), title: 'X', date: '2027-01-13' })).toEqual({
      cohortId: 'dec26',
      title: 'X',
      date: '2027-01-13',
      time: '12:00',
      mins: '75',
      zoom: '',
    });
  });

  it('marks a row ended once it is over, and carries its replay link', () => {
    const db = seed('live');
    db.sessions[0]!.replayUrl = 'https://example.com/r';
    const vm = cohortsR2VM(db, phaseNow('live'), 'dec26')!;
    expect(vm.rows.map((r) => r.ended)).toEqual([true, true, false, false, false, false]);
    expect(vm.rows[0]!.replayUrl).toBe('https://example.com/r');
    expect(vm.rows[1]!.replayUrl).toBe('');
  });
});

describe('Announcements: Edit (D-172)', () => {
  it('edits drafts and scheduled ones only, and fills the dialog from the row (a schedule in MST)', () => {
    const db = seed('live');
    const sent = db.announcements.find((a) => a.status === 'sent')!;
    const scheduled = db.announcements.find((a) => a.status === 'scheduled')!;
    expect(editable(sent)).toBe(false);
    expect(editable(scheduled)).toBe(true);
    expect(editable({ status: 'draft' })).toBe(true);
    const f = announcementFormOf(scheduled);
    // a3 is Fri, Dec 11, 8:00 AM CT: 7:00 AM MST.
    expect(f).toMatchObject({ title: scheduled.title, when: 'later', at: '2026-12-11T07:00', audience: 'owners', inapp: false, email: true });
    expect(announcementFormOf(sent)).toMatchObject({ when: 'now', inapp: true, email: true, action: 'calendar' });
    expect(announcementFields(f)).toEqual({ title: f.title, body: f.body, audience: 'owners', inapp: false, email: true, severity: 'info', action: '', at: '2026-12-11T07:00' });
  });
});
