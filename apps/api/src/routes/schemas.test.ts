// Request validation, § 7.3. The strongest guarantee here is not in this file: the registry is
// typed `{ [K in MutationName]: z.ZodType<MutationArgs<K>> }`, so `tsc` already proves that every
// mutation has a schema and that each schema's output IS that mutation's argument type. Verified by
// breaking two schemas and watching the typecheck fail, not assumed.
//
// What a type cannot prove is that the payloads our own screens actually send get through, and that
// anything else does not. That is what these tests do, with one real payload per mutation — the
// same list Gate 7's oracle will drive the API with.
import { describe, it, expect } from 'vitest';
import { ICONS, PERMS, STAFF_ROLES, seedForDatabase } from '@ai/core';
import type { MutationName } from '@ai/core';
import * as M from '@ai/core/mutations';
import { SCHEMAS, builderDraft, schemaFor } from './schemas';
import { curriculumSeed } from '@ai/core/seed/curriculum';

const db = seedForDatabase('live');
const learner = db.users[0]!;
const mod = db.modules[0]!;
const sess = db.sessions[0]!;
const res = db.resources[0]!;
const ann = db.announcements[0]!;
const req = db.requests[0]!;
const staff = db.staff[0]!;

/**
 * One payload per mutation, built from the real seed rather than from invented ids: a schema that
 * only accepts hand-written test data is not validating the thing the screens send.
 */
const VALID: { [K in MutationName]: unknown } = {
  dismissAnnouncement: { id: ann.id },
  toggleStep: { moduleId: mod.id, stepId: mod.checklist[0]!.id },
  toggleChecklistItem: { moduleId: mod.id, stepId: mod.checklist[0]!.id, itemId: 'item-1' },
  setPref: { key: `acc:${mod.id}:${mod.checklist[0]!.id}:0`, value: '1' },
  saveVideoProgress: { moduleId: mod.id, videoId: 'intro', maxPct: 0.25, lastPositionS: 12 },
  markDeployed: { moduleId: mod.id },
  setRuntime: { moduleId: mod.id, runtime: 'needs_attention' },
  recordRun: { moduleId: mod.id, title: 'Nightly follow-ups', preview: '14 replies drafted' },
  requestUpgrade: { source: 'Team tier page' },
  downloadResource: { id: res.id },
  inviteMember: { email: 'new@northlinerealty.com', role: 'Sales Agent' },
  remindMembers: { userIds: [learner.id] },
  setMemberRole: { userId: learner.id, role: 'Operations Lead' },
  removeMember: { userId: learner.id },
  nudgeLearners: { userIds: [learner.id] },
  setLearnerTier: { userId: learner.id, tier: 'team' },
  moveModule: { id: mod.id, dir: -1 },
  setModuleTier: { id: mod.id, tier: 'team' },
  publishModule: { id: mod.id },
  unpublishModule: { id: mod.id },
  saveModule: { draft: mod, status: 'published' },
  deleteModule: { id: mod.id },
  createCohort: {},
  openEnrollment: { cohortId: db.cohorts[0]!.id },
  goLive: { sessionId: sess.id },
  endSession: { sessionId: sess.id },
  publishReplay: { sessionId: sess.id, durationSec: 3600 },
  updateSession: {
    id: sess.id,
    title: sess.title,
    date: '2026-12-15',
    time: '13:00',
    mins: '90',
    zoom: sess.zoom,
  },
  uploadResource: { title: 'Listing audit prompt pack', cat: res.cat, type: res.type, tier: 'agent' },
  setResourceTier: { id: res.id },
  setResourceStatus: { id: res.id },
  deleteResource: { id: res.id },
  sendAnnouncement: {
    title: 'Session 4 moved',
    body: 'Thursday at 1:00 PM CT.',
    audience: 'all',
    inapp: true,
    email: false,
    when: 'now',
  },
  toggleReminder: { id: db.reminders[0]!.id },
  setTierPrice: { tierId: 'team', price: 2400 },
  setRequestStatus: { id: req.id, status: 'contacted' },
  inviteStaff: { email: 'new@amplifiedimpact.ai', role: 'Instructor' },
  setStaffRole: { id: staff.id, role: 'Admin' },
  removeStaff: { id: staff.id },
  togglePermission: { role: 'Instructor', perm: 'publish' },
};

/** `createCohort` takes no arguments, so `{}` is its valid payload and cannot also be its invalid one. */
const NO_ARGS: readonly MutationName[] = ['createCohort'];

const names = Object.keys(SCHEMAS) as MutationName[];

describe('§7.3 mutation request schemas @g7', () => {
  it('covers every mutation and nothing else @g7', () => {
    // The type already requires this. At runtime it also pins the one thing the type cannot say
    // out loud: `MutationError` is a class, so `typeof` calls it a function, and it must not be
    // treated as a mutation with a schema and a route.
    const callable = Object.keys(M).filter((k) => typeof (M as Record<string, unknown>)[k] === 'function');
    expect(callable).toContain('MutationError');
    expect(names.sort()).toEqual(callable.filter((k) => k !== 'MutationError').sort());
    expect(names).toHaveLength(40);
  });

  it('accepts the payload each screen actually sends @g7', () => {
    for (const name of names) {
      const parsed = SCHEMAS[name].safeParse(VALID[name]);
      expect(parsed.success, `${name}: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`).toBe(true);
    }
  });

  it('rejects an unexpected key on every mutation @g7', () => {
    // Strict objects, so drift between a view-model and its schema is a 400 rather than a field
    // that silently never arrives.
    for (const name of names) {
      const payload = { ...(VALID[name] as object), __injected: 'x' };
      expect(SCHEMAS[name].safeParse(payload).success, name).toBe(false);
    }
  });

  it('rejects an empty payload wherever arguments are required @g7', () => {
    for (const name of names) {
      if (NO_ARGS.includes(name)) continue;
      expect(SCHEMAS[name].safeParse({}).success, name).toBe(false);
    }
  });

  it('rejects a payload that is not an object at all @g7', () => {
    for (const name of names) {
      for (const junk of [null, undefined, 'id', 7, [], true]) {
        expect(SCHEMAS[name].safeParse(junk).success, `${name} accepted ${JSON.stringify(junk) ?? 'undefined'}`).toBe(
          false,
        );
      }
    }
  });
});

describe('§7.3 the shared leaves track their source of truth @g7', () => {
  it('accepts every staff role core defines, and no other @g7', () => {
    for (const role of STAFF_ROLES) {
      expect(SCHEMAS.inviteStaff.safeParse({ email: 'a@b.co', role }).success, role).toBe(true);
    }
    expect(SCHEMAS.inviteStaff.safeParse({ email: 'a@b.co', role: 'Superuser' }).success).toBe(false);
  });

  it('accepts every permission key core defines, and no other @g7', () => {
    for (const [perm] of PERMS) {
      expect(SCHEMAS.togglePermission.safeParse({ role: 'Admin', perm }).success, perm).toBe(true);
    }
    expect(SCHEMAS.togglePermission.safeParse({ role: 'Admin', perm: 'everything' }).success).toBe(false);
  });

  it('accepts every icon in the only icon set there is, and no other @g7', () => {
    for (const icon of Object.keys(ICONS)) {
      expect(SCHEMAS.saveModule.safeParse({ draft: { ...mod, icon } }).success, icon).toBe(true);
    }
    // Not 'rocket' or another plausible name: the set is large and the point is a name that is
    // definitely not in it.
    expect(Object.keys(ICONS)).not.toContain('not-an-icon');
    expect(SCHEMAS.saveModule.safeParse({ draft: { ...mod, icon: 'not-an-icon' } }).success).toBe(false);
  });

  it('rejects an empty id rather than passing it to core @g7', () => {
    expect(SCHEMAS.publishModule.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('§7.3 the shapes worth checking individually @g7', () => {
  it('saveModule accepts a real AI Employee, with and without its demo @g7', () => {
    const withDemo = db.modules.find((m) => m.runDemo)!;
    const without = db.modules.find((m) => !m.runDemo);
    expect(SCHEMAS.saveModule.safeParse({ draft: withDemo }).success).toBe(true);
    // Every seeded module may carry a demo; construct the other case rather than skip it.
    const stripped = { ...withDemo };
    delete stripped.runDemo;
    expect(SCHEMAS.saveModule.safeParse({ draft: without ?? stripped }).success).toBe(true);
    // And every module in the seed, so the nested schema is not fitted to one of them.
    for (const m of db.modules) expect(SCHEMAS.saveModule.safeParse({ draft: m }).success, m.id).toBe(true);
  });

  it('saveModule and the builder’s audited save take a course week’s whole draft, words and all, and keep every field (D-173) @g7', () => {
    // The Module Builder saves the module it holds (`seedDraft` is a structuredClone of the stored row),
    // so a week's `kind`, `dueAt` and `course` arrive on every save. Rejected, the builder could not save
    // a course week; dropped, a save would wipe the week's words.
    const weeks = curriculumSeed().modules;
    expect(weeks).toHaveLength(9);
    for (const m of weeks) {
      expect(m.course, m.id).toBeDefined();
      const viaMutate = SCHEMAS.saveModule.safeParse({ draft: m });
      expect(viaMutate.success, m.id).toBe(true);
      expect(viaMutate.data?.draft, m.id).toEqual(m);
      const viaBuilder = builderDraft.safeParse(m);
      expect(viaBuilder.success, m.id).toBe(true);
      expect(viaBuilder.data, m.id).toEqual(m);
    }
    // A step with every per-step field the builder edits, and a card of each kind.
    const week = structuredClone(weeks[2]!);
    week.checklist[0] = {
      ...week.checklist[0]!,
      who: 'Operator',
      timeLabel: 'About 20 min',
      doneWhen: 'The brief runs on yesterday’s data.',
      linkedSkill: 'morning-brief',
      openInPreview: true,
      paths: {
        claude: { blocks: [{ type: 'text', text: 'Open a new project.' }, { type: 'copy', label: 'Prompt', text: 'You are…' }] },
        chatgpt: { blocks: [{ type: 'list', items: ['One', 'Two'] }, { type: 'table', head: ['A', 'B'], rows: [['1', '2']] }] },
      },
    };
    week.course = {
      ...week.course!,
      promise: 'A brief every morning.',
      seatCard: { seat: 'Ops', reportsTo: 'Owner', runs: 'Daily', pulls: 'CRM', applies: 'Rules', produces: 'A brief', tookOver: 'Inbox triage', cantDo: 'Send email' },
      playbookCard: { number: '2', question: 'Who owns the next action?', play: 'Assign it.', signedOff: false },
      sampleOutput: { title: 'Sample brief', madeUpLabel: 'Made-up data', blocks: [{ type: 'text', text: 'Three items.' }] },
      lockedCopy: { headline: 'Opens soon', line: 'Week 2 opens on {date}.', opens: 'Opens {date}' },
      statusLabels: { not_started: 'Not hired yet' },
    };
    expect(builderDraft.parse(week)).toEqual(week);
    // Still strict inside the words: an unknown key or a wrong type is a 400, not a silent drop.
    expect(builderDraft.safeParse({ ...week, course: { ...week.course, extra: 1 } }).success).toBe(false);
    expect(builderDraft.safeParse({ ...week, course: { ...week.course, week: 'two' } }).success).toBe(false);
    expect(builderDraft.safeParse({ ...week, kind: 'lesson' }).success).toBe(false);
    expect(builderDraft.safeParse({ ...week, checklist: [{ ...week.checklist[0]!, paths: { claude: { blocks: [{ type: 'video', url: 'x' }] } } }] }).success).toBe(false);
  });

  it('saveModule rejects a draft missing a field core will read @g7', () => {
    const broken = { ...mod } as Record<string, unknown>;
    delete broken.checklist;
    expect(SCHEMAS.saveModule.safeParse({ draft: broken }).success).toBe(false);
  });

  it('updateSession takes the minutes field as the form holds it @g7', () => {
    const base = VALID.updateSession as Record<string, unknown>;
    // A number input's value is a string. Core coerces it and validates it; a schema that coerced
    // first would hide an empty field from core's own message.
    expect(SCHEMAS.updateSession.safeParse({ ...base, mins: '90' }).success).toBe(true);
    expect(SCHEMAS.updateSession.safeParse({ ...base, mins: 90 }).success).toBe(true);
    expect(SCHEMAS.updateSession.safeParse({ ...base, mins: '' }).success).toBe(true);
    expect(SCHEMAS.updateSession.safeParse({ ...base, mins: null }).success).toBe(false);
  });

  it('updateSession rejects a date or time it cannot interpret @g7', () => {
    const base = VALID.updateSession as Record<string, unknown>;
    expect(SCHEMAS.updateSession.safeParse({ ...base, date: '15/12/2026' }).success).toBe(false);
    expect(SCHEMAS.updateSession.safeParse({ ...base, time: '1:00 PM' }).success).toBe(false);
  });

  it("sendAnnouncement accepts the form's empty action @g7", () => {
    const base = VALID.sendAnnouncement as Record<string, unknown>;
    for (const action of ['calendar', 'sessions', '', null, undefined]) {
      expect(SCHEMAS.sendAnnouncement.safeParse({ ...base, action }).success, String(action)).toBe(true);
    }
    expect(SCHEMAS.sendAnnouncement.safeParse({ ...base, action: 'elsewhere' }).success).toBe(false);
  });

  it('inviteMember will not hand out a role the Team Hub cannot @g7', () => {
    // SCREENS § 3.4 offers three; `Agent` is what an unteamed learner already is, and an invite
    // that set it would put someone on a team with no team role.
    for (const role of ['Operations Lead', 'Sales Agent', 'Team Owner']) {
      expect(SCHEMAS.inviteMember.safeParse({ email: 'a@b.co', role }).success, role).toBe(true);
    }
    expect(SCHEMAS.inviteMember.safeParse({ email: 'a@b.co', role: 'Agent' }).success).toBe(false);
  });
});

describe('§7.3 schemaFor @g7', () => {
  it('finds every mutation by name @g7', () => {
    for (const name of names) expect(schemaFor(name)).toBe(SCHEMAS[name]);
  });

  it('answers null for a name that is not a mutation @g7', () => {
    expect(schemaFor('dropEverything')).toBeNull();
  });

  it('does not fall through to Object.prototype @g7', () => {
    // `name in SCHEMAS` would answer true for these, and the route would then call `.parse` on a
    // function. The route returns 404 instead.
    for (const inherited of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) {
      expect(schemaFor(inherited), inherited).toBeNull();
    }
  });
});
