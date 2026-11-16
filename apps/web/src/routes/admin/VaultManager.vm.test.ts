import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ZERO_BASE, phaseNow, seed, setViewerZone } from '@ai/core';
import type { Db, Resource, Tier } from '@ai/core';
import { blankUploadForm, vaultManagerVM, vaultR2VM } from './VaultManager.vm';
import { parityDb } from '../../data/parity-r2-db';
import { VAULT } from '../../data/parity-r2';
import type { VaultManagerUi, VaultManagerVM, VaultTabId, VaultUploadForm } from './VaultManager.vm';

// Differential test for the admin Resource Vault view-model (SCREENS § 4.6). Every expectation is
// a literal generated once from design-reference/Admin Vault.dc.html at Week 2 and then pinned
// (phase 06 § 6.1) — never a recomputation of the logic under test.

const ui = (over: Partial<VaultManagerUi> = {}): VaultManagerUi => ({
  tab: 'all',
  form: blankUploadForm(),
  err: '',
  ...over,
});

const form = (over: Partial<VaultUploadForm> = {}): VaultUploadForm => ({
  ...blankUploadForm(),
  ...over,
});

const ids = (vm: VaultManagerVM): string[] => vm.rows.map((r) => r.id);
const row = (vm: VaultManagerVM, id: string) => vm.rows.find((r) => r.id === id)!;

/** `seed('live')` with one resource switched to `hidden`, to exercise the Status switch's row. */
function withHidden(db: Db, id: string): Db {
  return {
    ...db,
    resources: db.resources.map((r): Resource => (r.id === id ? { ...r, status: 'hidden' } : r)),
  };
}

describe('vaultManagerVM @g6', () => {
  // `fmt.date` reads the viewer zone, so pin it: `Dec 6` must not depend on the test machine.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  describe('Casey Lin (Owner) · Week 2', () => {
    const db = seed('live');
    const vm = vaultManagerVM(db, ui());

    it('is a Week 2 snapshot of 19 published resources', () => {
      // Nothing on this screen depends on `now`; the VM takes none. Asserted so a later edit that
      // reaches for the clock has to change this test first.
      expect(phaseNow('live')).toBe(Date.parse('2026-12-07T10:42:00-06:00'));
      expect(db.resources).toHaveLength(19);
    });

    it('sublines the published, executive and download totals', () => {
      expect(vm.summary).toBe('19 published · 6 in the Executive Build Vault · 2,586 downloads');
    });

    // phase 06 § 6.2: the admin analytics screens add `db.base`. This one has no such figure —
    // every number above is a property of an individually modelled resource — so the identical
    // string must come back from a `ZERO_BASE` snapshot, which is what the API returns in http
    // mode. The VM never branches on the data source to achieve that.
    it('reads the same against a ZERO_BASE snapshot (http mode)', () => {
      const live = vaultManagerVM({ ...db, base: ZERO_BASE }, ui());
      expect(live.summary).toBe('19 published · 6 in the Executive Build Vault · 2,586 downloads');
      expect(ids(live)).toEqual(ids(vm));
    });

    it('labels the three tabs and marks the selected one', () => {
      expect(vm.tabs).toEqual([
        { id: 'all', label: 'All', active: true },
        { id: 'library', label: 'Library', active: false },
        { id: 'exec', label: 'Executive Vault', active: false },
      ]);
      expect(vaultManagerVM(db, ui({ tab: 'exec' })).tabs.map((t) => t.active)).toEqual([
        false,
        false,
        true,
      ]);
    });

    it('sorts newest first and keeps seed order within a day', () => {
      expect(ids(vm)).toEqual([
        'r13',
        'r7',
        'r11',
        'r12',
        'r9',
        'r10',
        'x5',
        'x6',
        'r4',
        'r5',
        'r6',
        'r8',
        'x3',
        'x4',
        'r1',
        'x1',
        'x2',
        'r2',
        'r3',
      ]);
    });

    it('renders every column of the table', () => {
      expect(
        vm.rows.map((r) => [r.title, r.cat, r.type, r.access, r.dl, r.updated, r.status]),
      ).toEqual([
        ['Inspection Deadline Tracker', 'TC Automation Workflows', 'Workflow JSON', 'Team only', '27', 'Dec 6', 'Published'],
        ['Sphere Reactivation Scripts', 'Lead Generation Scripts', 'Prompt pack', 'Agent + Team', '133', 'Dec 5', 'Published'],
        ['Contract-to-Close Timeline Template', 'TC Automation Workflows', 'Claude Project', 'Team only', '39', 'Dec 5', 'Published'],
        ['TC Milestone Email Pack', 'TC Automation Workflows', 'Prompt pack', 'Agent + Team', '174', 'Dec 5', 'Published'],
        ['Sisu Closed-Deal Export to Claude', 'Sisu & CRM Webhook Guides', 'Workflow JSON', 'Team only', '61', 'Dec 4', 'Published'],
        ['Sisu Scorecard Webhook', 'Sisu & CRM Webhook Guides', 'Workflow JSON', 'Team only', '48', 'Dec 4', 'Published'],
        ['Sisu to Sheets P&L Sync', 'Finance Tracker Integrations', 'Workflow JSON', 'Team only', '36', 'Dec 4', 'Published'],
        ['Commission Split Calculator', 'Finance Tracker Integrations', 'Claude Project', 'Team only', '41', 'Dec 4', 'Published'],
        ['Expired & FSBO Outreach Scripts', 'Lead Generation Scripts', 'Prompt pack', 'Agent + Team', '198', 'Dec 3', 'Published'],
        ['Open House Follow-up Sequence', 'Lead Generation Scripts', 'Workflow JSON', 'Agent + Team', '164', 'Dec 3', 'Published'],
        ['Speed-to-Lead Text Library', 'Lead Generation Scripts', 'Prompt pack', 'Agent + Team', '241', 'Dec 3', 'Published'],
        ['CRM New-Lead Webhook Setup', 'Sisu & CRM Webhook Guides', 'PDF guide', 'Agent + Team', '219', 'Dec 2', 'Published'],
        ['Weekly Leadership Meeting Framework', 'Leadership Meeting Frameworks', 'Notion template', 'Team only', '52', 'Dec 2', 'Published'],
        ['Quarterly Planning Agenda', 'Leadership Meeting Frameworks', 'PDF guide', 'Team only', '23', 'Dec 2', 'Published'],
        ['Fair Housing Language Checker', 'MLS & Fair Housing Compliance', 'Claude Project', 'Agent + Team', '412', 'Dec 1', 'Published'],
        ['Team Operating System SOP', 'Organizational SOPs', 'Notion template', 'Team only', '44', 'Dec 1', 'Published'],
        ['Agent Accountability SOP', 'Organizational SOPs', 'Notion template', 'Team only', '31', 'Dec 1', 'Published'],
        ['MLS Public Remarks Rules', 'MLS & Fair Housing Compliance', 'PDF guide', 'Agent + Team', '287', 'Nov 28', 'Published'],
        ['Steering Language Reference', 'MLS & Fair Housing Compliance', 'PDF guide', 'Agent + Team', '356', 'Nov 28', 'Published'],
      ]);
    });

    it('carries the second line of the Resource column', () => {
      expect(row(vm, 'r13').desc).toBe(
        'Workflow that alerts the TC 48 hours before each contingency.',
      );
      expect(row(vm, 'x1').desc).toBe('How the team runs: roles, scorecards and meeting cadence.');
    });

    it('flags executive rows, whose access pill only toasts', () => {
      expect(vm.rows.filter((r) => r.exec).map((r) => r.id)).toEqual(['x5', 'x6', 'x3', 'x4', 'x1', 'x2']);
      expect(row(vm, 'r13').exec).toBe(false);
      // Every executive item is Team only, so the pill never offers Agent + Team for one.
      expect(vm.rows.filter((r) => r.exec).every((r) => r.teamOnly && r.access === 'Team only')).toBe(true);
    });

    it('pairs the access pill label with its tier flag', () => {
      expect([row(vm, 'r11').teamOnly, row(vm, 'r11').access]).toEqual([true, 'Team only']);
      expect([row(vm, 'r12').teamOnly, row(vm, 'r12').access]).toEqual([false, 'Agent + Team']);
    });
  });

  describe('tab filter', () => {
    const db = seed('live');

    it('Library drops the six executive resources', () => {
      const vm = vaultManagerVM(db, ui({ tab: 'library' }));
      expect(ids(vm)).toEqual(['r13', 'r7', 'r11', 'r12', 'r9', 'r10', 'r4', 'r5', 'r6', 'r8', 'r1', 'r2', 'r3']);
      expect(vm.rows.some((r) => r.exec)).toBe(false);
    });

    it('Executive Vault keeps only them, newest first', () => {
      const vm = vaultManagerVM(db, ui({ tab: 'exec' }));
      expect(ids(vm)).toEqual(['x5', 'x6', 'x3', 'x4', 'x1', 'x2']);
    });

    it('leaves the subline on the whole pool, whichever tab is open', () => {
      for (const tab of ['all', 'library', 'exec'] as VaultTabId[]) {
        expect(vaultManagerVM(db, ui({ tab })).summary).toBe(
          '19 published · 6 in the Executive Build Vault · 2,586 downloads',
        );
      }
    });
  });

  describe('a hidden resource', () => {
    const db = withHidden(seed('live'), 'r1');
    const vm = vaultManagerVM(db, ui());

    it('still lists the row, switched to Hidden', () => {
      expect(row(vm, 'r1').status).toBe('Hidden');
      expect(row(vm, 'r1').published).toBe(false);
      expect(ids(vm)).toHaveLength(19);
    });

    it('drops out of the published count but not the download total', () => {
      expect(vm.summary).toBe('18 published · 6 in the Executive Build Vault · 2,586 downloads');
    });
  });

  describe('the upload drawer', () => {
    const db = seed('live');

    it('starts on Lead Generation Scripts · Prompt pack · Agent', () => {
      expect(blankUploadForm()).toEqual({
        title: '',
        desc: '',
        cat: 'Lead Generation Scripts',
        type: 'Prompt pack',
        tier: 'agent',
        file: null,
      });
    });

    it('prompts for a file before one is attached', () => {
      // Title Case is the reference's own `fz.label`; SCREENS § 4.6 quotes it in sentence case and
      // the reference wins (CLAUDE.md › Sources of truth).
      expect(vaultManagerVM(db, ui()).drop).toEqual({
        label: 'Drop a File or Click to Browse',
        sub: 'JSON, PDF, Markdown or Notion export · up to 25 MB',
        icon: 'upload',
        ready: false,
        nextFile: 'new-resource.md',
      });
    });

    it('becomes the file name once one is attached', () => {
      const vm = vaultManagerVM(db, ui({ form: form({ title: 'Buyer Consult Prep', file: 'buyer-consult-prep.md' }) }));
      expect(vm.drop).toEqual({
        label: 'buyer-consult-prep.md',
        sub: 'Ready to publish · click to replace',
        icon: 'checkCircle',
        ready: true,
        nextFile: 'buyer-consult-prep.md',
      });
    });

    it('slugs the title and extends it by Type', () => {
      const name = (over: Partial<VaultUploadForm>): string =>
        vaultManagerVM(db, ui({ form: form(over) })).drop.nextFile;
      expect(name({ title: 'Listing Appointment Prep Prompt' })).toBe('listing-appointment-prep-prompt.md');
      expect(name({ title: 'Sisu & CRM: Webhook Guide!' })).toBe('sisu-crm-webhook-guide-.md');
      expect(name({ title: 'Deal Desk', type: 'Claude Project' })).toBe('deal-desk.json');
      expect(name({ title: 'Deal Desk', type: 'Workflow JSON' })).toBe('deal-desk.json');
      expect(name({ title: 'Deal Desk', type: 'PDF guide' })).toBe('deal-desk.pdf');
      expect(name({ title: 'Deal Desk', type: 'Notion template' })).toBe('deal-desk.zip');
    });

    it('honours the Access control for a library category', () => {
      for (const tier of ['agent', 'team'] as Tier[]) {
        const vm = vaultManagerVM(db, ui({ form: form({ tier }) }));
        expect(vm.form.tierEff).toBe(tier);
        expect(vm.form.exec).toBe(false);
      }
    });

    it('forces Team for each executive category', () => {
      for (const cat of ['Organizational SOPs', 'Leadership Meeting Frameworks', 'Finance Tracker Integrations']) {
        const vm = vaultManagerVM(db, ui({ form: form({ cat, tier: 'agent' }) }));
        expect(vm.form.tierEff).toBe('team');
        expect(vm.form.exec).toBe(true);
        // The raw draft is untouched: switching back to a library category restores Agent.
        expect(vm.form.tier).toBe('agent');
      }
    });

    it('passes the validation message straight through', () => {
      expect(vaultManagerVM(db, ui({ err: 'Add a title.' })).form.err).toBe('Add a title.');
      expect(vaultManagerVM(db, ui({ err: 'Attach a file first.' })).form.err).toBe('Attach a file first.');
      expect(vaultManagerVM(db, ui()).form.err).toBe('');
    });
  });
});

// ================================================================================================
// R2 (D-160 R2-2b): the mockup's Resource Vault.
// ================================================================================================

describe('vaultR2VM (D-160 R2-2b)', () => {
  it('lists the vault in its own order, in the mockup’s words, dates in MST', () => {
    const vm = vaultR2VM(parityDb());
    expect(vm.rows.map((r) => [r.title, r.type, r.attached, r.tierLabel, r.size, r.updated, r.opens])).toEqual(
      VAULT.map((r) => [...r]),
    );
    expect(vm.rows.map((r) => r.video)).toEqual([false, false, false, true, true, true, false]);
    expect(vm.types).toEqual(['All types', 'PDF', 'Sheet', 'Video', 'Prompt']);
  });

  it('reads the ordinary fixture: nothing attached reads "—", hidden and executive items are flagged', () => {
    const db = seed('live');
    const vm = vaultR2VM(db);
    expect(vm.rows.map((r) => r.id)).toEqual(db.resources.map((r) => r.id));
    expect(vm.rows.every((r) => r.attached === '—')).toBe(true);
    expect(vm.rows.filter((r) => r.hidden).map((r) => r.id)).toEqual(
      db.resources.filter((r) => r.status === 'hidden').map((r) => r.id),
    );
    expect(vm.rows.filter((r) => r.exec)).toHaveLength(db.resources.filter((r) => r.exec).length);
    expect(vm.types[0]).toBe('All types');
  });
});
