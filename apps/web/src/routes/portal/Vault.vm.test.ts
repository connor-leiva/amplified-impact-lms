import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { phaseNow, seed, setViewerZone } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { vaultVM, type VaultUi, type VaultVM } from './Vault.vm';

// Differential test for the Portal Vault view-model (SCREENS § 3.5). Every expectation is the
// literal string the reference renders, not a recomputation of the logic under test.

const learner = (db: Db, id: string): Learner => db.users.find((u) => u.id === id)!;
const ui = (over: Partial<VaultUi> = {}): VaultUi => ({ tab: 'library', q: '', cat: '', type: '', ...over });
const titles = (vm: VaultVM): string[] => vm.rows.map((r) => r.title);
const chips = (vm: VaultVM): string[] => vm.chips.map((c) => `${c.label} ${c.count}`);
const row = (vm: VaultVM, id: string) => vm.rows.find((r) => r.id === id)!;

describe('vaultVM @g5', () => {
  // `fmt.date` reads the viewer zone, so pin it: `Dec 6` must not depend on the test machine.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  describe('Jamie Ortiz (Agent tier) · Week 2', () => {
    const db = seed('live');
    const now = phaseNow('live');
    const jamie = learner(db, 'u_jamie');
    const vm = vaultVM(db, jamie, now, ui());

    it('labels both tabs and locks the executive one', () => {
      expect(vm.tabs).toEqual([
        { id: 'library', label: 'Library', count: 13, locked: false },
        { id: 'exec', label: 'Executive Build Vault', count: 6, locked: true },
      ]);
    });

    it('counts the four library categories plus All', () => {
      expect(chips(vm)).toEqual([
        'All 13',
        'MLS & Fair Housing Compliance 3',
        'Lead Generation Scripts 4',
        'Sisu & CRM Webhook Guides 3',
        'TC Automation Workflows 3',
      ]);
      expect(vm.chips[0]!.active).toBe(true);
    });

    it('sorts newest first and keeps seed order within a day', () => {
      expect(titles(vm)).toEqual([
        'Inspection Deadline Tracker',
        'Sphere Reactivation Scripts',
        'Contract-to-Close Timeline Template',
        'TC Milestone Email Pack',
        'Sisu Closed-Deal Export to Claude',
        'Sisu Scorecard Webhook',
        'Expired & FSBO Outreach Scripts',
        'Open House Follow-up Sequence',
        'Speed-to-Lead Text Library',
        'CRM New-Lead Webhook Setup',
        'Fair Housing Language Checker',
        'MLS Public Remarks Rules',
        'Steering Language Reference',
      ]);
      expect(vm.empty).toBe(false);
      expect(vm.showList).toBe(true);
      expect(vm.execLocked).toBe(false);
    });

    it('marks the four resources updated within three days as New', () => {
      expect(vm.rows.filter((r) => r.isNew).map((r) => r.title)).toEqual([
        'Inspection Deadline Tracker',
        'Sphere Reactivation Scripts',
        'Contract-to-Close Timeline Template',
        'TC Milestone Email Pack',
      ]);
    });

    it('locks the four team-tier library resources and offers Upgrade', () => {
      const locked = vm.rows.filter((r) => r.locked);
      expect(locked.map((r) => r.title)).toEqual([
        'Inspection Deadline Tracker',
        'Contract-to-Close Timeline Template',
        'Sisu Closed-Deal Export to Claude',
        'Sisu Scorecard Webhook',
      ]);
      expect(locked.map((r) => r.teamOnly)).toEqual([true, true, true, true]);
      expect(locked.map((r) => r.actionLabel)).toEqual(['Upgrade', 'Upgrade', 'Upgrade', 'Upgrade']);
      expect(locked.map((r) => r.actionIcon)).toEqual(['lock', 'lock', 'lock', 'lock']);
      expect(locked.map((r) => r.icon)).toEqual(['fileCode', 'bot', 'fileCode', 'fileCode']);
    });

    it('renders the locked first row exactly', () => {
      expect(row(vm, 'r13')).toEqual({
        id: 'r13',
        title: 'Inspection Deadline Tracker',
        desc: 'Workflow that alerts the TC 48 hours before each contingency.',
        cat: 'TC Automation Workflows',
        type: 'Workflow JSON',
        size: '8 KB',
        updated: 'Updated Dec 6',
        meta: '8 KB · Updated Dec 6',
        isNew: true,
        teamOnly: true,
        locked: true,
        icon: 'fileCode',
        actionLabel: 'Upgrade',
        actionIcon: 'lock',
        notion: false,
        file: {
          name: 'inspection-deadline-tracker.json',
          mime: 'application/json',
          body: [
            '{',
            '  "name": "Inspection Deadline Tracker",',
            '  "type": "Workflow JSON",',
            '  "category": "TC Automation Workflows",',
            '  "version": "1.0.0",',
            '  "source": "Amplified Impact Resource Vault"',
            '}',
          ].join('\n'),
        },
      });
    });

    it('writes a Markdown file for a prompt pack', () => {
      expect(row(vm, 'r4').file).toEqual({
        name: 'expired-fsbo-outreach-scripts.md',
        mime: 'text/plain',
        body:
          '# Expired & FSBO Outreach Scripts\n\n' +
          'Call, text and letter scripts with a follow-up cadence.\n\n' +
          'Category: Lead Generation Scripts\n',
      });
      expect(row(vm, 'r2').file.name).toBe('mls-public-remarks-rules.pdf');
      expect(row(vm, 'r2').file.mime).toBe('text/plain');
    });

    it('lets the search narrow the rows and every chip count', () => {
      const s = vaultVM(db, jamie, now, ui({ q: 'Sisu' }));
      expect(titles(s)).toEqual([
        'Sisu Closed-Deal Export to Claude',
        'Sisu Scorecard Webhook',
        'CRM New-Lead Webhook Setup',
      ]);
      expect(chips(s)).toEqual([
        'All 3',
        'MLS & Fair Housing Compliance 0',
        'Lead Generation Scripts 0',
        'Sisu & CRM Webhook Guides 3',
        'TC Automation Workflows 0',
      ]);
    });

    it('lets the type filter narrow the rows and every chip count', () => {
      const t = vaultVM(db, jamie, now, ui({ type: 'PDF guide' }));
      expect(titles(t)).toEqual([
        'CRM New-Lead Webhook Setup',
        'MLS Public Remarks Rules',
        'Steering Language Reference',
      ]);
      expect(chips(t)).toEqual([
        'All 3',
        'MLS & Fair Housing Compliance 2',
        'Lead Generation Scripts 0',
        'Sisu & CRM Webhook Guides 1',
        'TC Automation Workflows 0',
      ]);
    });

    it('leaves the chip counts alone when a category is selected', () => {
      const c = vaultVM(db, jamie, now, ui({ cat: 'TC Automation Workflows' }));
      expect(titles(c)).toEqual([
        'Inspection Deadline Tracker',
        'Contract-to-Close Timeline Template',
        'TC Milestone Email Pack',
      ]);
      expect(chips(c)[0]).toBe('All 13');
      expect(c.chips.filter((x) => x.active).map((x) => x.label)).toEqual(['TC Automation Workflows']);
    });

    it('reports an empty result for a search that matches nothing', () => {
      const e = vaultVM(db, jamie, now, ui({ q: 'zzz' }));
      expect(e.rows).toEqual([]);
      expect(e.empty).toBe(true);
    });

    it('replaces the executive list with the upsell panel', () => {
      const x = vaultVM(db, jamie, now, ui({ tab: 'exec' }));
      expect(x.execLocked).toBe(true);
      expect(x.showList).toBe(false);
      expect(x.upsell).toEqual({ label: 'Book Upgrade Consultation', icon: 'calendar', requested: false });
      expect(x.execPreview).toEqual([
        { title: 'Team Operating System SOP', sub: 'Organizational SOPs · Notion template' },
        { title: 'Agent Accountability SOP', sub: 'Organizational SOPs · Notion template' },
        { title: 'Weekly Leadership Meeting Framework', sub: 'Leadership Meeting Frameworks · Notion template' },
        { title: 'Quarterly Planning Agenda', sub: 'Leadership Meeting Frameworks · PDF guide' },
        { title: 'Sisu to Sheets P&L Sync', sub: 'Finance Tracker Integrations · Workflow JSON' },
        { title: 'Commission Split Calculator', sub: 'Finance Tracker Integrations · Claude Project' },
      ]);
    });

    it('shows Consultation Requested once a request is open', () => {
      const d: Db = {
        ...db,
        requests: [
          { id: 'ur9', userId: 'u_jamie', name: 'Jamie Ortiz', email: 'jamie@ortizhomes.com', source: 'Executive Build Vault', at: now, status: 'new' },
          ...db.requests,
        ],
      };
      expect(vaultVM(d, jamie, now, ui({ tab: 'exec' })).upsell).toEqual({
        label: 'Consultation Requested',
        icon: 'check',
        requested: true,
      });
    });
  });

  describe('Alex Morgan (Team Owner) · Week 2', () => {
    const db = seed('live');
    const now = phaseNow('live');
    const alex = learner(db, 'u_alex');

    it('locks nothing in the library', () => {
      const vm = vaultVM(db, alex, now, ui());
      expect(vm.rows.some((r) => r.locked || r.teamOnly)).toBe(false);
      expect(vm.rows.map((r) => r.actionLabel)).toEqual(Array(13).fill('Download'));
      expect(vm.tabs[1]!.locked).toBe(false);
    });

    it('opens the executive list instead of the upsell panel', () => {
      const vm = vaultVM(db, alex, now, ui({ tab: 'exec' }));
      expect(vm.execLocked).toBe(false);
      expect(vm.showList).toBe(true);
      expect(titles(vm)).toEqual([
        'Sisu to Sheets P&L Sync',
        'Commission Split Calculator',
        'Weekly Leadership Meeting Framework',
        'Quarterly Planning Agenda',
        'Team Operating System SOP',
        'Agent Accountability SOP',
      ]);
      expect(chips(vm)).toEqual([
        'All 6',
        'Organizational SOPs 2',
        'Leadership Meeting Frameworks 2',
        'Finance Tracker Integrations 2',
      ]);
      expect(vm.rows.every((r) => !r.isNew)).toBe(true);
    });

    // The reference's label branch spells the type `Notion Template`, so it never matches and a
    // Notion row reads `Download` beside the `ext` glyph. The goldens were captured from it.
    it('reads Download beside the ext glyph on a Notion template', () => {
      const vm = vaultVM(db, alex, now, ui({ tab: 'exec' }));
      expect(row(vm, 'x1')).toEqual({
        id: 'x1',
        title: 'Team Operating System SOP',
        desc: 'How the team runs: roles, scorecards and meeting cadence.',
        cat: 'Organizational SOPs',
        type: 'Notion template',
        size: 'Template',
        updated: 'Updated Dec 1',
        meta: 'Template · Updated Dec 1',
        isNew: false,
        teamOnly: false,
        locked: false,
        icon: 'book',
        actionLabel: 'Download',
        actionIcon: 'ext',
        notion: true,
        file: {
          name: 'team-operating-system-sop.md',
          mime: 'text/plain',
          body:
            '# Team Operating System SOP\n\n' +
            'How the team runs: roles, scorecards and meeting cadence.\n\n' +
            'Category: Organizational SOPs\n',
        },
      });
      expect(vm.rows.filter((r) => r.actionIcon === 'ext').map((r) => r.id)).toEqual(['x3', 'x1', 'x2']);
    });
  });

  describe('Week 0', () => {
    const db = seed('week0');
    const now = phaseNow('week0');

    it('marks every resource New, because all are updated after the Week 0 instant', () => {
      const vm = vaultVM(db, learner(db, 'u_jamie'), now, ui());
      expect(vm.rows).toHaveLength(13);
      expect(vm.rows.every((r) => r.isNew)).toBe(true);
    });

    it('has no open upgrade request for Jamie', () => {
      const vm = vaultVM(db, learner(db, 'u_jamie'), now, ui({ tab: 'exec' }));
      expect(vm.upsell.label).toBe('Book Upgrade Consultation');
      expect(vm.execLocked).toBe(true);
    });

    it('still shows Alex the whole executive list', () => {
      const vm = vaultVM(db, learner(db, 'u_alex'), now, ui({ tab: 'exec' }));
      expect(vm.showList).toBe(true);
      expect(vm.rows).toHaveLength(6);
    });
  });

  describe('After Cohort', () => {
    const db = seed('post');
    const now = phaseNow('post');

    it('marks nothing New and keeps all 13 library rows', () => {
      const vm = vaultVM(db, learner(db, 'u_jamie'), now, ui());
      expect(vm.rows).toHaveLength(13);
      expect(vm.rows.some((r) => r.isNew)).toBe(false);
      expect(titles(vm)[0]).toBe('Inspection Deadline Tracker');
      expect(row(vm, 'r13').meta).toBe('8 KB · Updated Dec 6');
    });

    it('still locks the team-tier rows for Jamie and none for Alex', () => {
      expect(vaultVM(db, learner(db, 'u_jamie'), now, ui()).rows.filter((r) => r.locked)).toHaveLength(4);
      expect(vaultVM(db, learner(db, 'u_alex'), now, ui()).rows.filter((r) => r.locked)).toHaveLength(0);
    });
  });
});
