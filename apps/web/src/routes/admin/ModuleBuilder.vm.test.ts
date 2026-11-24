import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { phaseNow, seed, setViewerZone } from '@ai/core';
import type { AIEmployee, Db } from '@ai/core';
import {
  DEFAULT_OPENS,
  moduleBuilderVM,
  moveStep,
  nextFile,
  nextOrder,
  normalizeSaved,
  parseMinutes,
  parseReplayAt,
  seedDraft,
  builderR2VM,
  moveStepTo,
  opensFrom,
  opensInput,
} from './ModuleBuilder.vm';
import { parityDb } from '../../data/parity-r2-db';
import { BUILDER_FILES, BUILDER_STEPS, MODS0 } from '../../data/parity-r2';
import type { ModuleBuilderUi } from './ModuleBuilder.vm';

// Differential test for the Admin Module Builder view-model (SCREENS § 4.3, phase 06 § 6.1).
//
// Every expectation is a literal generated once from design-reference/Admin Module Builder.dc.html
// and then pinned — never a recomputation of the logic under test.
//
// The builder has no analytics, so `db.base` (phase 06 § 6.2) contributes nothing here: the one
// figure that could be mistaken for an aggregate, `totalMins`, is the sum of the six step minutes
// and must stay independent of the baseline. The last `describe` block pins that.

const ui = (over: Partial<ModuleBuilderUi> = {}): ModuleBuilderUi => ({
  pv: 'card',
  pvTier: 'agent',
  dirty: false,
  savedAt: null,
  errors: [],
  ...over,
});

/** A fixed instant for `blankModule`'s id, so `/new` expectations are stable. */
const NEW_AT = 1765000000000;
const NEW_ID = 'mmitvfg1s';

describe('moduleBuilderVM @g6', () => {
  // `fmt.day` and `fmt.isoDate` read the viewer zone, so pin it: `Tue, Dec 1` must not depend on
  // the machine running the test.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  const db: Db = seed('live');
  const now = phaseNow('live');

  // -------------------------------------------------------------------------
  // admin-builder-marketing · editing a published, Agent-tier AI Employee
  // -------------------------------------------------------------------------
  describe('Marketing AI Employee · Week 2', () => {
    const d = seedDraft(db, 'marketing', now);
    const vm = moduleBuilderVM(db, d, now, ui());

    it('seeds a deep copy of the saved module', () => {
      expect(d).not.toBe(db.modules.find((m) => m.id === 'marketing'));
      expect(d).toEqual(db.modules.find((m) => m.id === 'marketing'));
      expect(d.checklist[0]).not.toBe(db.modules.find((m) => m.id === 'marketing')!.checklist[0]);
    });

    it('titles the bar and shows the Published token', () => {
      expect(vm.title).toBe('Marketing AI Employee');
      expect(vm.pill).toEqual({ tone: 'success', icon: 'check', label: 'Published' });
    });

    it('reads as saved, with Save and Update Live Module, and cannot be deleted', () => {
      expect(vm.saveNote).toBe('All changes saved');
      expect(vm.dirty).toBe(false);
      expect(vm.saveLabel).toBe('Save');
      expect(vm.publishLabel).toBe('Update Live Module');
      expect(vm.canDelete).toBe(false);
      expect(vm.errors).toEqual([]);
    });

    it('marks megaphone as the chosen icon and offers all twelve MODULE_ICONS', () => {
      expect(vm.icons.map((i) => i.key)).toEqual([
        'megaphone',
        'zap',
        'database',
        'mic',
        'dollar',
        'workflow',
        'home',
        'users',
        'target',
        'briefcase',
        'chat',
        'trend',
      ]);
      expect(vm.icons.filter((i) => i.on).map((i) => i.key)).toEqual(['megaphone']);
      expect(vm.icons[0]!.path).toContain('M3.5 10.2v3.6');
    });

    it('notes both tiers and numbers the three outputs', () => {
      expect(vm.tierNote).toBe('Included in both tiers');
      expect(vm.outputs).toEqual([
        { n: 1, value: 'Fair-Housing-checked MLS description' },
        { n: 2, value: '5 social posts in your brand voice' },
        { n: 3, value: '1 just-listed email' },
      ]);
    });

    it('links Session 1 with no clash', () => {
      expect(vm.sessionStr).toBe('1');
      expect(vm.sessWarn).toBe('');
    });

    it('shows the attached Session 1 replay', () => {
      expect(vm.replay).toEqual({
        icon: 'checkCircle',
        tone: 'success',
        title: 'Session 1 replay attached',
        sub: '58:24 · 6 chapters from the build steps · transcript indexed',
        btn: 'Replace',
        toast: 'Upload started. Processing takes about 10 minutes.',
      });
    });

    it('lays out the six build steps with mm:ss replay marks and end-stop reorder guards', () => {
      expect(vm.steps).toHaveLength(6);
      expect(vm.steps.map((s) => [s.n, s.ch, s.t, s.mins])).toEqual([
        [1, 'Create the Project', '5:00', 5],
        [2, 'Add the System Prompt', '6:30', 8],
        [3, 'Teach It Your Voice', '18:40', 8],
        [4, 'Add the Skills', '23:22', 6],
        [5, 'Run the Test Listing', '32:15', 10],
        [6, 'Check Compliance', '40:40', 8],
      ]);
      expect(vm.steps[0]!.text).toBe('Create a Claude Project named “Marketing AI Employee”');
      expect(vm.steps[0]!.hint).toBe('Projects keep the prompt and skill files together.');
      expect(vm.steps[1]!.hint).toBe('Replace {{TEAM_NAME}}, {{MARKET}} and {{MLS_CHAR_LIMIT}} first.');
      expect(vm.steps[3]!.hint).toBe('');
      expect(vm.steps.map((s) => s.canUp)).toEqual([false, true, true, true, true, true]);
      expect(vm.steps.map((s) => s.canDown)).toEqual([true, true, true, true, true, false]);
    });

    it('totals 45 minutes of build', () => {
      expect(vm.totalMins).toBe(45);
    });

    it('counts the prompt and lists its three variables without braces', () => {
      expect(vm.promptStats).toBe('22 lines · about 232 tokens');
      expect(vm.vars).toEqual(['TEAM_NAME', 'MARKET', 'MLS_CHAR_LIMIT']);
      expect(vm.noVars).toBe(false);
      expect(vm.example).toBe('{{TEAM_NAME}}');
    });

    it('lists the three skill files with "{desc} · {size}"', () => {
      expect(vm.files).toEqual([
        {
          index: 0,
          name: 'listing-launch-packet.skill.json',
          type: 'JSON',
          meta: 'MLS copy, social posts and email from one listing · 4 KB',
        },
        {
          index: 1,
          name: 'fair-housing-check.skill.yaml',
          type: 'YAML',
          meta: 'Flags steering language and suggests rewrites · 2 KB',
        },
        {
          index: 2,
          name: 'Brand Voice Intake',
          type: 'Notion',
          meta: 'Tone, phrases to use and phrases to avoid · Template',
        },
      ]);
    });

    it('selects Published among the three publishing choices and hides Opens On', () => {
      expect(vm.statuses).toEqual([
        { key: 'draft', label: 'Draft', sub: 'Hidden from learners', on: false },
        { key: 'scheduled', label: 'Scheduled', sub: 'Visible as “Opens …”', on: false },
        { key: 'published', label: 'Published', sub: 'Available now', on: true },
      ]);
      expect(vm.isScheduled).toBe(false);
      expect(vm.opensDate).toBe('');
    });

    it('previews the real card at Agent tier', () => {
      expect(vm.pvCard).toBe(true);
      expect(vm.pvLocked).toBe(false);
      expect(vm.pvHeader).toBe(false);
      expect(vm.card.name).toBe('Marketing AI Employee');
      expect(vm.card.locked).toBe(false);
      expect(vm.card.soon).toBe(false);
      expect(vm.card.sessLine).toBe('Session 1 · Replay Ready');
      expect(vm.card.mins).toBe(45);
      expect(vm.card.state).toBe('not_started');
      expect(vm.card.cta).toBe('Start Build');
      expect(vm.card.primary).toBe(true);
    });

    it('builds the locked preview item from the draft', () => {
      expect(vm.lockedItems).toHaveLength(1);
      const item = vm.lockedItems[0]!;
      expect(item.id).toBe('marketing');
      expect(item.short).toBe('Marketing');
      expect(item.headline).toBe('Launch every listing in minutes, compliant on every channel.');
      expect(item.outputs).toEqual([
        'Fair-Housing-checked MLS description',
        '5 social posts in your brand voice',
        '1 just-listed email',
      ]);
      expect(item.sessLine).toBe('Session 1 · Tue, Dec 1');
    });

    it('writes the detail-header mock lines', () => {
      expect(vm.outcomeOrHint).toBe(
        'Paste an MLS listing → Fair-Housing-checked description, 5 social posts, 1 email.',
      );
      expect(vm.metaLine).toBe(
        'From Session 1 · The Autonomous Agent · 45 min build · For listing agents & marketing coordinators',
      );
    });

    it('links a live module into the Agent portal', () => {
      expect(vm.portal).toEqual({
        live: true,
        role: 'agent',
        path: '/employees/marketing',
        toast: 'Publish first. Drafts are hidden from learners.',
      });
    });
  });

  // -------------------------------------------------------------------------
  // admin-builder-locked · a Team-only AI Employee whose session has not run
  // -------------------------------------------------------------------------
  describe('Meetings AI Employee · Team only · Week 2', () => {
    const d = seedDraft(db, 'meetings', now);
    const vm = moduleBuilderVM(db, d, now, ui({ pv: 'locked', pvTier: 'team' }));

    it('notes that Agent tier sees the locked preview', () => {
      expect(vm.tierNote).toBe('Agent tier learners see the locked preview');
    });

    it('waits on the Session 4 replay', () => {
      expect(vm.sessionStr).toBe('4');
      expect(vm.replay).toEqual({
        icon: 'clock',
        tone: 'tertiary',
        title: 'Replay posts after Session 4',
        sub: 'Thu, Dec 10 · Zoom cloud recording imports automatically',
        btn: 'Upload Manually',
        toast: 'The replay imports from Zoom when the session ends',
      });
    });

    it('totals 35 minutes and counts the prompt', () => {
      expect(vm.totalMins).toBe(35);
      expect(vm.promptStats).toBe('15 lines · about 124 tokens');
      expect(vm.vars).toEqual(['TEAM_NAME']);
    });

    it('shows the Locked Preview pane with the draft’s three outputs', () => {
      expect([vm.pvCard, vm.pvLocked, vm.pvHeader]).toEqual([false, true, false]);
      const item = vm.lockedItems[0]!;
      expect(item.short).toBe('Meetings');
      expect(item.headline).toBe('Every leadership meeting ends with decisions, owners and next week’s agenda.');
      expect(item.outputs).toEqual([
        'Decisions, risks and open questions from any transcript',
        'Action items with an owner and due date',
        'Next week’s agenda, built from open items',
      ]);
      expect(item.sessLine).toBe('Session 4 · Thu, Dec 10');
    });

    it('previews unlocked at Team tier and locked at Agent tier', () => {
      expect(vm.card.locked).toBe(false);
      expect(vm.card.cta).toBe('Start Build');
      expect(vm.card.sessLine).toBe('Session 4 · Dec 10');
      const agent = moduleBuilderVM(db, d, now, ui({ pv: 'locked', pvTier: 'agent' }));
      expect(agent.card.locked).toBe(true);
      expect(agent.card.cta).toBe('Preview');
    });

    it('sends a Team-only preview to the Owner persona', () => {
      expect(vm.portal.role).toBe('owner');
      expect(vm.portal.path).toBe('/employees/meetings');
      expect(vm.portal.live).toBe(true);
    });

    it('writes the detail-header meta line from Session 4', () => {
      expect(vm.metaLine).toBe(
        'From Session 4 · The Meeting That Runs Itself · 35 min build · For team leaders & ops leads',
      );
    });
  });

  // -------------------------------------------------------------------------
  // admin-builder · /new
  // -------------------------------------------------------------------------
  describe('a new draft · /new', () => {
    const d = seedDraft(db, null, NEW_AT);
    const vm = moduleBuilderVM(db, d, now, ui());

    it('takes the next order and pads the outputs to three', () => {
      expect(nextOrder(db)).toBe(7);
      expect(d.order).toBe(7);
      expect(d.id).toBe(NEW_ID);
      expect(d.outputs).toEqual(['', '', '']);
      expect(d.status).toBe('draft');
      expect(d.short).toBe('New');
      expect(d.icon).toBe('home');
    });

    it('reads as an unsaved draft', () => {
      expect(vm.title).toBe('New AI Employee');
      expect(vm.pill).toEqual({ tone: 'neutral', icon: 'ring', label: 'Draft' });
      expect(vm.saveNote).toBe('Not saved yet');
      expect(vm.saveLabel).toBe('Save Draft');
      expect(vm.publishLabel).toBe('Publish');
      expect(vm.canDelete).toBe(false);
      expect(vm.statuses.map((s) => s.on)).toEqual([true, false, false]);
    });

    it('offers the optional walkthrough video, with no session linked', () => {
      expect(vm.sessionStr).toBe('');
      expect(vm.replay).toEqual({
        icon: 'video',
        tone: 'tertiary',
        title: 'Walkthrough video',
        sub: 'Optional for self-paced AI Employees',
        btn: 'Upload Video',
        toast: 'Upload started. Processing takes about 10 minutes.',
      });
    });

    it('starts from the six blank-module steps, 30 minutes in total', () => {
      expect(vm.steps.map((s) => [s.ch, s.t, s.mins])).toEqual([
        ['Create the Project', '4:00', 3],
        ['Add the System Prompt', '10:00', 5],
        ['Load Your Files', '18:20', 5],
        ['Add the Skills', '25:00', 5],
        ['Run the Test', '36:40', 6],
        ['Check the Output', '46:40', 6],
      ]);
      expect(vm.totalMins).toBe(30);
      expect(vm.promptStats).toBe('12 lines · about 35 tokens');
      expect(vm.vars).toEqual(['TEAM_NAME']);
      expect(vm.files).toEqual([]);
    });

    it('falls back to placeholder copy in both previews', () => {
      expect(vm.outcomeOrHint).toBe('Add an outcome line');
      expect(vm.metaLine).toBe('Self-paced · 30 min build · For all agents');
      const item = vm.lockedItems[0]!;
      expect(item.headline).toBe('Add an outcome headline');
      expect(item.outputs).toEqual(['Output 1', 'Output 2', 'Output 3']);
      expect(item.sessLine).toBe('Self-paced');
    });

    it('previews a draft card as Opens Soon', () => {
      expect(vm.card.soon).toBe(true);
      expect(vm.card.opensLabel).toBe('Opens Soon');
      expect(vm.card.sessLine).toBe('Self-Paced');
      expect(vm.card.mins).toBe(30);
      expect(vm.card.cta).toBe('View Details');
      expect(vm.card.primary).toBe(false);
    });

    it('refuses to open an unpublished draft in the portal', () => {
      expect(vm.portal.live).toBe(false);
      expect(vm.portal.toast).toBe('Publish first. Drafts are hidden from learners.');
    });

    it('warns when the chosen session already belongs to another AI Employee', () => {
      const clash = moduleBuilderVM(db, { ...d, session: 1 }, now, ui());
      expect(clash.sessWarn).toBe(
        'Marketing AI Employee is also linked to Session 1. Both will share that live build.',
      );
      expect(clash.replay.title).toBe('Replay posts after Session 1');
      expect(clash.replay.sub).toBe('Tue, Dec 1 · Zoom cloud recording imports automatically');
      expect(clash.metaLine).toBe('From Session 1 · The Autonomous Agent · 30 min build · For all agents');
    });
  });

  // -------------------------------------------------------------------------
  // The save-state note and the Scheduled branch
  // -------------------------------------------------------------------------
  describe('save state and scheduling', () => {
    const d = seedDraft(db, 'marketing', now);

    it('reads Unsaved changes while dirty', () => {
      expect(moduleBuilderVM(db, d, now, ui({ dirty: true })).saveNote).toBe('Unsaved changes');
    });

    it('reads Saved {relative} after a save in this session', () => {
      expect(moduleBuilderVM(db, d, now, ui({ savedAt: now })).saveNote).toBe('Saved just now');
      expect(moduleBuilderVM(db, d, now, ui({ savedAt: now - 4 * 60000 })).saveNote).toBe('Saved 4 min ago');
    });

    it('prefers the dirty note over the saved one', () => {
      expect(moduleBuilderVM(db, d, now, ui({ dirty: true, savedAt: now })).saveNote).toBe('Unsaved changes');
    });

    it('renders Opens On for a scheduled draft', () => {
      const sch: AIEmployee = { ...d, status: 'scheduled', opens: DEFAULT_OPENS };
      const vm = moduleBuilderVM(db, sch, now, ui());
      expect(vm.pill).toEqual({ tone: 'progress', icon: 'clock', label: 'Scheduled' });
      expect(vm.isScheduled).toBe(true);
      expect(vm.opensDate).toBe('2026-12-21');
      expect(vm.statuses.map((s) => s.on)).toEqual([false, true, false]);
    });

    it('offers Delete Draft only for a module that is saved AND still a draft', () => {
      const asDraft: AIEmployee = { ...d, status: 'draft' };
      // `marketing` is saved as `published`, so switching the local draft's status does not unlock
      // the destructive action: `canDelete` reads what is stored, not what is on screen.
      expect(moduleBuilderVM(db, asDraft, now, ui()).canDelete).toBe(false);
      const stored: Db = {
        ...db,
        modules: db.modules.map((m) => (m.id === 'marketing' ? { ...m, status: 'draft' as const } : m)),
      };
      expect(moduleBuilderVM(stored, asDraft, now, ui()).canDelete).toBe(true);
      expect(moduleBuilderVM(stored, asDraft, now, ui()).publishLabel).toBe('Publish');
      expect(moduleBuilderVM(stored, asDraft, now, ui()).saveLabel).toBe('Save Draft');
    });

    it('renders the validation messages it is handed, in order', () => {
      const errors = [
        'Add the outcome line. Learners see it under the title.',
        'Add all three outputs.',
        'The system prompt is too short to publish.',
        'Give all six build steps a title.',
      ];
      expect(moduleBuilderVM(db, d, now, ui({ errors })).errors).toEqual(errors);
    });
  });

  // -------------------------------------------------------------------------
  // The empty variables state
  // -------------------------------------------------------------------------
  describe('System Prompt variables', () => {
    const d = seedDraft(db, null, NEW_AT);

    it('reports no variables when nothing is wrapped in double braces', () => {
      const vm = moduleBuilderVM(db, { ...d, prompt: '# Role\nNo placeholders here.' }, now, ui());
      expect(vm.vars).toEqual([]);
      expect(vm.noVars).toBe(true);
      expect(vm.promptStats).toBe('2 lines · about 7 tokens');
    });

    it('de-duplicates and ignores lower-case placeholders', () => {
      const prompt = 'Hi {{TEAM_NAME}} and {{TEAM_NAME}} and {{market}} and {{MLS_CHAR_LIMIT}}';
      expect(moduleBuilderVM(db, { ...d, prompt }, now, ui()).vars).toEqual(['TEAM_NAME', 'MLS_CHAR_LIMIT']);
    });
  });

  // -------------------------------------------------------------------------
  // Pure draft shaping
  // -------------------------------------------------------------------------
  describe('draft shaping', () => {
    const d = seedDraft(db, 'marketing', now);

    it('parses the Replay At field', () => {
      expect(parseReplayAt('1:02:03')).toBe(3723);
      expect(parseReplayAt('58:24')).toBe(3504);
      expect(parseReplayAt('90')).toBe(90);
      expect(parseReplayAt('abc')).toBe(0);
      expect(parseReplayAt('')).toBe(0);
    });

    it('keeps Minutes at one or more', () => {
      expect(parseMinutes('12')).toBe(12);
      expect(parseMinutes('0')).toBe(1);
      expect(parseMinutes('-4')).toBe(1);
      expect(parseMinutes('')).toBe(1);
    });

    it('reorders steps and stops at both ends', () => {
      expect(moveStep(d.checklist, 0, 1).map((s) => s.ch)).toEqual([
        'Add the System Prompt',
        'Create the Project',
        'Teach It Your Voice',
        'Add the Skills',
        'Run the Test Listing',
        'Check Compliance',
      ]);
      expect(moveStep(d.checklist, 0, -1).map((s) => s.ch)).toEqual(d.checklist.map((s) => s.ch));
      expect(moveStep(d.checklist, 5, 1).map((s) => s.ch)).toEqual(d.checklist.map((s) => s.ch));
      // Always six. There is no add or remove (phase 06 § 6.3).
      expect(moveStep(d.checklist, 2, 1)).toHaveLength(6);
    });

    it('cycles the dashed drop zone through JSON, YAML and Notion', () => {
      const blank = { ...seedDraft(db, null, NEW_AT), files: [] };
      const a = nextFile(blank);
      const b = nextFile({ ...blank, files: [a] });
      const c = nextFile({ ...blank, files: [a, b] });
      const fourth = nextFile({ ...blank, files: [a, b, c] });
      expect([a, b, c, fourth].map((f) => [f.name, f.type, f.size])).toEqual([
        ['new-1.skill.json', 'JSON', '3 KB'],
        ['new-2.skill.yaml', 'YAML', '2 KB'],
        ['New SOP', 'Notion', 'Template'],
        ['new-4.skill.json', 'JSON', '3 KB'],
      ]);
      expect(a.desc).toBe('Uploaded just now');
      expect(a.steps).toEqual([]);
    });

    it('slugs the upload name from the sidebar label and carries the outputs', () => {
      const f = nextFile(d);
      expect(f.name).toBe('marketing-4.skill.json');
      expect(f.steps).toEqual([
        'Fair-Housing-checked MLS description',
        '5 social posts in your brand voice',
        '1 just-listed email',
      ]);
    });

    it('normalises on save: a new module’s c1…c6, build = Σ minutes, short = name minus " AI Employee"', () => {
      const blank = seedDraft(db, null, NEW_AT);
      const saved = normalizeSaved(
        { ...blank, name: 'Listing Coordinator AI Employee', short: '  ', opens: DEFAULT_OPENS },
        'published',
      );
      expect(saved.short).toBe('Listing Coordinator');
      expect(saved.status).toBe('published');
      expect(saved.opens).toBe(null);
      expect(saved.build).toBe(30);
      expect(saved.checklist.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
      // A new module's steps are numbered in their order.
      const moved = normalizeSaved({ ...blank, checklist: moveStep(blank.checklist, 0, 1) });
      expect(moved.checklist.map((s) => [s.id, s.ch])).toEqual([
        ['c1', 'Add the System Prompt'],
        ['c2', 'Create the Project'],
        ['c3', 'Load Your Files'],
        ['c4', 'Add the Skills'],
        ['c5', 'Run the Test'],
        ['c6', 'Check the Output'],
      ]);
    });

    it('takes the step ids the save answered, so a reordered step keeps its id (D-247)', () => {
      const moved = normalizeSaved({ ...d, checklist: moveStep(d.checklist, 0, 1) }, undefined, ['c2', 'c1', 'c3', 'c4', 'c5', 'c6']);
      expect(moved.checklist.map((s) => s.id)).toEqual(['c2', 'c1', 'c3', 'c4', 'c5', 'c6']);
      expect(moved.checklist[0]!.text).toBe(d.checklist[1]!.text);
      // A list that doesn't match the steps is not used.
      expect(normalizeSaved(d, undefined, ['c9']).checklist.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
    });

    it('keeps an explicit sidebar label and leaves a saved status alone', () => {
      const saved = normalizeSaved(d);
      expect(saved.short).toBe('Marketing');
      expect(saved.status).toBe('published');
      expect(saved.build).toBe(45);
    });

    it('never mutates the draft it is given', () => {
      const before = structuredClone(d);
      normalizeSaved(d, 'published');
      moveStep(d.checklist, 0, 1);
      nextFile(d);
      expect(d).toEqual(before);
    });
  });

  // -------------------------------------------------------------------------
  // phase 06 § 6.2: the builder's figures never touch `db.base`
  // -------------------------------------------------------------------------
  describe('no baseline arithmetic', () => {
    it('reports the same build totals with and without `db.base`', () => {
      const zeroed: Db = {
        ...db,
        base: { learners: 0, agent: 0, teamSeats: 0, teams: 0, mod: {}, daily: [0] },
      };
      const d = seedDraft(db, 'marketing', now);
      const withBase = moduleBuilderVM(db, d, now, ui());
      const without = moduleBuilderVM(zeroed, d, now, ui());
      expect(db.base.learners).toBe(134);
      expect(withBase.totalMins).toBe(45);
      expect(without.totalMins).toBe(45);
      expect(without.card).toEqual(withBase.card);
      expect(without.metaLine).toBe(withBase.metaLine);
      expect(without.steps).toEqual(withBase.steps);
    });
  });
});

// ================================================================================================
// R2 (D-160 R2-2): the mockup's Module Builder.
// ================================================================================================

describe('builderR2VM (D-160 R2-2)', () => {
  const NOW = Date.parse('2026-12-10T16:30:00Z');
  const pdb = parityDb();
  const m1 = seedDraft(pdb, 'm1', NOW);

  it('draws m1 as the mockup does: its steps, files and settings', () => {
    const vm = builderR2VM(pdb, m1, { dirty: false, saved: true }, NOW);
    expect(vm.list.map((x) => x.name)).toEqual(MODS0.map((m) => m.n));
    expect(vm.list.filter((x) => x.on).map((x) => x.id)).toEqual(['m1']);
    expect(vm.list.map((x) => x.tone).slice(0, 10)).toEqual([
      'ok',
      'ok',
      'ok',
      'ok',
      'ok',
      'info',
      'info',
      'info',
      'info',
      'off',
    ]);
    expect(vm.name).toBe('Marketing AI Employee');
    expect(vm.summary).toBe('Paste an MLS listing → Fair-Housing-checked copy');
    expect(vm.steps.map((x) => [x.kind, x.text, x.length])).toEqual(BUILDER_STEPS.map((x) => [...x]));
    expect(vm.files).toEqual(BUILDER_FILES.map(([name, desc, size]) => ({ name, desc, size })));
    expect(vm.status).toEqual({ label: 'Published', tone: 'ok' });
    expect(vm.session).toBeNull();
    expect(vm.opens).toEqual({ text: 'Open now', muted: false });
    expect(vm.linked).toBe(true);
    expect(vm.saveLabel).toBe('Saved');
    expect(builderR2VM(pdb, m1, { dirty: true, saved: true }, NOW).saveLabel).toBe('Save changes');
    expect(builderR2VM(pdb, m1, { dirty: false, saved: false }, NOW).saveLabel).toBe('Save changes');
  });

  it('prints a live session and an opening day in MST', () => {
    const m7 = builderR2VM(pdb, seedDraft(pdb, 'm7', NOW), { dirty: false, saved: true }, NOW);
    expect(m7.session).toEqual({ title: 'Session 3 · Database Live Build', when: 'Wed, Dec 16 · 12:00 PM MST' });
    expect(m7.opens).toEqual({ text: 'Dec 14', muted: false });
    const m3 = builderR2VM(pdb, seedDraft(pdb, 'm3', NOW), { dirty: false, saved: true }, NOW);
    expect(m3.session!.when).toBe('Wed, Dec 2 · 12:00 PM MST · Replay ready');
    const m12 = builderR2VM(pdb, seedDraft(pdb, 'm12', NOW), { dirty: false, saved: true }, NOW);
    expect(m12.opens).toEqual({ text: 'Not scheduled', muted: true });
    expect(m12.linked).toBe(false);
    expect(m12.steps.every((x) => x.kind === '')).toBe(true);
    expect(m3.sessionOptions.map((o) => o.label)).toEqual([
      'Self-paced',
      'Session 1 · Lead-Source ROI Live Build',
      'Session 2 · Morning Brief Live Build',
      'Session 3 · Database Live Build',
      'Session 4 · Scorecard Live Build',
      'Session 5 · Contract to Close',
      'Session 6 · Handoff',
    ]);
  });

  it('drags a step to any place, one swap at a time', () => {
    const steps = seedDraft(pdb, 'm1', NOW).checklist;
    expect(moveStepTo(steps, 0, 3).map((x) => x.text)).toEqual([
      'Before you start: what to have open',
      'Install the skill file',
      'Run it on your first real input',
      'What this AI Employee does',
      'Review the output against the checklist',
      'Mark as deployed',
    ]);
    expect(
      moveStepTo(steps, 5, 4)
        .map((x) => x.text)
        .slice(4),
    ).toEqual(['Mark as deployed', 'Review the output against the checklist']);
    expect(moveStepTo(steps, 2, 2)).toEqual(steps);
  });

  it('reads and writes the opening day in MST', () => {
    const t = opensFrom('2026-12-14')!;
    expect(t).toBe(Date.parse('2026-12-14T09:00:00-07:00'));
    expect(opensInput(t)).toBe('2026-12-14');
    expect(opensFrom('')).toBeNull();
    expect(opensInput(null)).toBe('');
  });
});
