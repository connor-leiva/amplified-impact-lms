// Request validation for POST /api/mutate/:name, phase 07 § 7.3.
//
// One schema per mutation in the phase 02 catalog. The registry's type is the point:
//
//   const SCHEMAS: { [K in MutationName]: z.ZodType<MutationArgs<K>> }
//
// so `tsc` proves every mutation has a schema AND that each schema's output is exactly the
// argument type that mutation declares. A field added to a mutation's args in `@ai/core` fails the
// typecheck here until the schema catches up — which is the only reason to keep the schemas in one
// file rather than beside each route.
//
// Every object is strict: an unexpected key is a 400, not something silently dropped. The client
// is our own view-models, so an unknown key means the two have drifted and the loud answer is the
// useful one.
//
// What these schemas do NOT do is authorize. They decide whether a payload is well formed; whether
// this actor may send it is `can()` and `requirePerm()` inside the mutation, and the oracle and
// authorization-matrix tests in Gate 7 cover that.
import { z } from 'zod';
import { ICONS, PERMS, STAFF_ROLES, VIDEO_URL_MAX } from '@ai/core';
import { MAX_FILE_BYTES, MAX_VIDEO_BYTES, UPLOAD_KEY } from '@ai/core/uploads';
import type { IconName, PermKey, StaffRole } from '@ai/core';
import type { MutationArgs, MutationName } from '@ai/core';

// --- shared leaves ---------------------------------------------------------

/** An id the client echoes back from a snapshot. Non-empty is all the shape there is. */
const id = z.string().min(1);
const tier = z.enum(['agent', 'team']);
const moduleStatus = z.enum(['draft', 'scheduled', 'published']);
const runtime = z.enum(['deployed', 'paused', 'needs_attention']);
const learnerRole = z.enum(['Agent', 'Team Owner', 'Operations Lead', 'Sales Agent']);
/** Only these three can be handed out by an invite; `Agent` is what an unteamed learner already is. */
const invitableRole = z.enum(['Operations Lead', 'Sales Agent', 'Team Owner']);
/**
 * These three are checked against the real exports rather than against a copy of their values, so
 * adding a staff role, a permission or an icon to `@ai/core` cannot leave a stale list behind here.
 * `z.enum` would need a literal tuple and would be exactly such a copy.
 */
const staffRole = z.custom<StaffRole>(
  (v) => typeof v === 'string' && (STAFF_ROLES as readonly string[]).includes(v),
  'Unknown staff role',
);
const permKey = z.custom<PermKey>(
  (v) => typeof v === 'string' && PERMS.some(([k]) => k === v),
  'Unknown permission',
);
/** The only icon set that exists; CLAUDE.md allows no icon library to add to it. */
const iconName = z.custom<IconName>(
  (v) => typeof v === 'string' && Object.prototype.hasOwnProperty.call(ICONS, v),
  'Unknown icon',
);

/** A date and a time as the session form sends them; `updateSession` parses them in PROGRAM_TZ. */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const isoTime = z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM');

// --- D-173: the course's shapes (`packages/core/src/course-types.ts`) ---------------------------
//
// A course week's module carries its words (`course`) and its steps carry the builder's per-step
// fields. The Module Builder saves the whole draft it holds, so these must be accepted, and checked,
// on every save: without them a week's draft is a 400 (strict objects), and without `course` a save
// would replace the module without its words.

const skillRole = z.enum(['flagship', 'supporting', 'optional', 'pilot', 'alternative']);
// D-221: `use` is retired (an older draft may still carry it; a save drops it).
const courseSkill = z.strictObject({ title: z.string(), route: z.string(), role: skillRole, use: z.string().optional(), free: z.boolean().optional() });
const setupStep = z.strictObject({ text: z.string(), route: z.string().optional(), also: z.array(z.string()).optional() });
const agendaItem = z.strictObject({ from: z.number(), to: z.number(), activity: z.string(), why: z.string() });
const liveBuildPage = z.strictObject({
  sessionId: z.string(),
  agenda: z.array(agendaItem),
  lesson: z.string(),
  exercise: z.string(),
  required: z.string(),
  advanced: z.string(),
  ownerApproval: z.string(),
  workingAtEnd: z.array(z.string()),
});
const officeHoursPage = z.strictObject({
  sessionId: z.string(),
  title: z.string(),
  note: z.string(),
  format: z.array(agendaItem).nullable(),
  outputs: z.array(z.string()).optional(),
});
const homework = z.strictObject({
  byWeekEnd: z.array(z.string()),
  assignment: z.array(z.string()),
  acceptance: z.array(z.string()),
  useEvidence: z.string(),
});
const richMark = z.union([
  z.strictObject({ type: z.literal('bold') }),
  z.strictObject({ type: z.literal('italic') }),
  z.strictObject({ type: z.literal('textStyle'), attrs: z.strictObject({ color: z.string().max(120).optional(), fontFamily: z.string().max(80).optional(), fontSize: z.string().max(8).optional() }).optional() }),
  z.strictObject({ type: z.literal('highlight'), attrs: z.strictObject({ color: z.string().max(160).optional() }).optional() }),
]);
const richText = z.strictObject({
  type: z.literal('doc'),
  content: z.array(z.strictObject({
    type: z.literal('paragraph'),
    content: z.array(z.strictObject({ type: z.literal('text'), text: z.string().max(4000), marks: z.array(richMark).max(8).optional() })).max(80).optional(),
  })).max(40),
});
const contentBlock = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), text: z.string(), rich: richText.optional() }),
  z.strictObject({ type: z.literal('copy'), label: z.string().optional(), text: z.string() }),
  z.strictObject({ type: z.literal('list'), items: z.array(z.string()) }),
  z.strictObject({ type: z.literal('table'), head: z.array(z.string()).optional(), rows: z.array(z.array(z.string())) }),
]);
// D-188: a video, in a step's paths and in a week's Media. Its source is an uploaded mp4 (a key the
// upload route minted, with the file's name, size and type) or a link. The link's scheme (http or https
// only) is checked by `saveBuilderModule`, which refuses a bad one inline as it does a copy rule.
const blockId = z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);
const videoFile = {
  upload: z.string().regex(UPLOAD_KEY),
  name: z.string().min(1).max(200),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
};
const videoChapter = z.strictObject({
  t: z.number().min(0).max(86400),
  label: z.string().min(1).max(200),
  item: blockId.optional(),
});
const videoBlock = z.strictObject({
  type: z.literal('video'),
  source: z.union([
    z.strictObject({
      upload: z.string().regex(UPLOAD_KEY),
      name: z.string().min(1).max(200),
      size: z.number().int().positive().max(MAX_VIDEO_BYTES),
      type: z.literal('video/mp4'),
    }),
    z.strictObject({ url: z.string().min(1).max(VIDEO_URL_MAX) }),
  ]),
  title: z.string().max(300).optional(),
  // D-191: all optional, so a video saved before them still parses.
  id: blockId.optional(),
  poster: z.strictObject({ ...videoFile, type: z.literal('image/jpeg') }).optional(),
  transcript: z.strictObject({ ...videoFile, type: z.literal('text/vtt') }).optional(),
  chapters: z.array(videoChapter).max(80).optional(),
  draft: z.boolean().optional(),
}).superRefine((block, ctx) => {
  const chapters = block.chapters ?? [];
  for (let i = 1; i < chapters.length; i++) {
    if (chapters[i]!.t < chapters[i - 1]!.t) {
      ctx.addIssue({ code: 'custom', message: 'Chapters go in time order.', path: ['chapters', i, 't'] });
      break;
    }
  }
});
const checkId = z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);
const checkCond = z.strictObject({ field: z.string().min(1).max(80), equals: z.string().max(200) });
const checkAction = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('download'), kitItemIds: z.array(z.string().min(1).max(80)).max(12) }),
  z.strictObject({ type: z.literal('copy'), label: z.string().max(80), text: z.string().max(8000) }),
  z.strictObject({ type: z.literal('invite'), label: z.string().max(80).optional() }),
  z.strictObject({ type: z.literal('calendar'), sessionId: z.string().min(1).max(80) }),
  z.strictObject({ type: z.literal('link'), label: z.string().max(80), href: z.string().max(VIDEO_URL_MAX) }),
  z.strictObject({ type: z.literal('form'), formId: z.enum(['intake', 'stack-card', 'seat-card']), label: z.string().max(80), itemId: z.string().max(80).optional() }),
  z.strictObject({ type: z.literal('card'), terms: z.array(z.string().max(80)).max(24) }),
  // D-230: Turn in. The kind is all it holds; the button's words are the drawer's.
  z.strictObject({ type: z.literal('upload'), kind: z.enum(['live_read', 'checkpoint']) }),
]);
// D-190: a checklist item, a callout and an accordion. Ids and links are checked again on save
// (`checklistIssues`); the copy rules cover every string a learner reads.
const checkBlock = z.strictObject({
  type: z.literal('check'),
  id: checkId,
  title: z.string().max(200),
  detail: z.string().max(2000).optional(),
  detailRich: richText.optional(),
  role: z.enum(['owner', 'operator', 'each', '']).optional(),
  action: checkAction.optional(),
  clickPath: z.array(z.string().max(80)).max(12).optional(),
  playAt: z.strictObject({ t: z.number().min(0).max(86400), video: blockId.optional() }).optional(),
  dependsOn: z.array(z.string().min(1).max(120)).max(20).optional(),
  hideIf: checkCond.optional(),
  collapseIf: checkCond.optional(),
  collapsedNote: z.string().max(400).optional(),
  optional: z.boolean().optional(),
  auto: z.strictObject({ video: z.literal(true), at: z.number().min(0).max(100), id: blockId.optional() }).optional(),
  subchecks: z.array(z.strictObject({ id: checkId, label: z.string().max(200) })).max(24).optional(),
});
const calloutBlock = z.strictObject({
  type: z.literal('callout'),
  kind: z.enum(['tip', 'heads_up', 'diy']),
  text: z.string().max(4000),
  rich: richText.optional(),
  showIf: checkCond.optional(),
});
const accordionBlock = z.strictObject({
  type: z.literal('accordion'),
  title: z.string().max(200),
  body: z.array(z.string().max(4000)).max(40),
  bodyRich: richText.optional(),
  table: z.strictObject({ head: z.array(z.string().max(200)).max(12).optional(), rows: z.array(z.array(z.string().max(2000)).max(12)).max(40) }).optional(),
  // D-240: the table is the week's Seat Card, drawn from the card.
  seatCard: z.literal(true).optional(),
  link: z.strictObject({ label: z.string().max(80), href: z.string().max(VIDEO_URL_MAX) }).optional(),
});
const pathBlock = z.union([contentBlock, videoBlock, checkBlock, calloutBlock, accordionBlock]);
const stepPath = z.strictObject({ blocks: z.array(pathBlock) });
const stepPaths = z.strictObject({ claude: stepPath.optional(), chatgpt: stepPath.optional() });
const seatCard = z.strictObject({
  seat: z.string(),
  reportsTo: z.string(),
  runs: z.string(),
  pulls: z.string(),
  applies: z.string(),
  produces: z.string(),
  tookOver: z.string(),
  cantDo: z.string(),
  firstRun: z.string().optional(),
});
const playbookCard = z.strictObject({
  name: z.string().optional(),
  number: z.string(),
  question: z.string(),
  play: z.string(),
  source: z.string().optional(),
  signedOff: z.boolean(),
});
const sampleOutput = z.strictObject({ title: z.string(), madeUpLabel: z.string(), blocks: z.array(contentBlock) });
const lockedCopy = z.strictObject({ headline: z.string(), line: z.string(), opens: z.string() });
/** A week's words (`AIEmployee.course`, a `ModuleCourse`). */
const moduleCourse = z.strictObject({
  week: z.number().int().min(0),
  title: z.string(),
  question: z.string(),
  why: z.array(z.string()),
  owner: z.string(),
  operator: z.string(),
  time: z.strictObject({ owner: z.string(), operator: z.string() }),
  skills: z.array(courseSkill),
  setup: z.array(setupStep).optional(), // D-221: retired; a save drops it
  liveBuild: liveBuildPage.nullable(),
  officeHours: officeHoursPage.nullable(),
  homework,
  media: z.array(z.union([z.string(), videoBlock])),
  materials: z.array(z.string()),
  promise: z.string().optional(),
  flagship: z.string().optional(),
  tools: z.array(z.string()).optional(),
  seatCard: seatCard.optional(),
  playbookCard: playbookCard.optional(),
  sampleOutput: sampleOutput.optional(),
  lockedCopy: lockedCopy.optional(),
  statusLabels: z.record(z.string(), z.string()).optional(),
  // D-195: the Start Here card's words. The step rows are the week's steps.
  startHere: z.strictObject({
    title: z.string().max(200),
    sub: z.string().max(300),
    line: z.string().max(1000),
    hint: z.string().max(500),
    totals: z.strictObject({ owner: z.string().max(80), operator: z.string().max(80) }),
  }).optional(),
  // D-196: the intake's questions. Answers are not on the course.
  intake: z.strictObject({
    intro: z.string().max(2000).optional(),
    sections: z.array(z.strictObject({
      title: z.string().max(200),
      intro: z.string().max(2000).optional(),
      questions: z.array(z.strictObject({
        id: z.string().min(1).max(80),
        label: z.string().max(500),
        help: z.string().max(1000).optional(),
        kind: z.enum(['short', 'long', 'choice', 'multi']),
        options: z.array(z.string().max(200)).max(20).optional(),
        // B-16 (D-229): Submit refuses until it has an answer.
        required: z.boolean().optional(),
      })).max(40),
    })).max(12),
  }).optional(),
  stackCard: z.strictObject({
    sources: z.array(z.strictObject({
      id: z.string().min(1).max(40),
      name: z.string().max(120),
      green: z.string().max(500),
      yellow: z.string().max(500),
    })).max(8),
    exampleLabel: z.string().max(80),
    exampleTeam: z.string().max(120),
    example: z.array(z.strictObject({
      source: z.string().max(120),
      tool: z.string().max(200),
      plan: z.enum(['green', 'yellow']),
      who: z.string().max(200),
    })).max(8),
  }).optional(),
});

// D-193: one glossary term. The id, the step and the underline are checked again on save.
const glossaryTerm = z.strictObject({
  id: z.string().min(1).max(80),
  term: z.string().max(200),
  short: z.string().max(1000),
  long: z.string().max(4000),
  aliases: z.array(z.string().max(200)).max(20),
  firstStep: z.number().optional(),
  underline: z.boolean().optional(),
});

// D-174: what every week shares (`Cohort.course`, a `CohortCourse`), as the builder saves it whole.
const labelHint = z.strictObject({ label: z.string(), hint: z.string() });
const labelText = z.strictObject({ label: z.string(), text: z.string() });
export const cohortCourse = z.strictObject({
  intro: z.strictObject({
    title: z.string(),
    sub: z.string(),
    how: z.array(z.string()),
    roles: z.strictObject({ owner: z.string(), operator: z.string() }),
    scope: z.string(),
    support: z.string(),
    instructor: z.string(),
    holiday: z.string(),
    join: z.strictObject({ label: z.string(), note: z.string(), path: z.string() }),
    // D-187: the cohort community's link; the action checks it is an http or https address.
    community: z.string().max(2048).optional(),
  }),
  shared: z.strictObject({
    liveBuildMins: z.number(),
    officeHoursMins: z.number(),
    officeHoursRules: z.array(z.string()),
    issueForm: z.array(labelHint),
    evidence: z.array(labelHint),
    rubric: z.array(z.strictObject({ label: z.string(), meets: z.string() })),
    rubricScale: z.array(z.strictObject({ score: z.union([z.literal(0), z.literal(1), z.literal(2)]), label: z.string() })),
    rubricRules: z.array(z.string()),
    readiness: z.array(z.strictObject({ gate: z.enum(['Green', 'Amber', 'Red']), text: z.string() })),
    paths: z.array(labelText),
    missedAWeek: z.string(),
    estimateNote: z.string(),
  }),
  before: z.strictObject({
    intake: z.array(z.string()),
    orientation: z.strictObject({ minutes: z.number(), topics: z.array(z.string()), media: z.string() }),
    dataPack: z.array(z.strictObject({ input: z.string(), preferred: z.string(), minimum: z.string() })),
    practiceSetNote: z.string(),
    safeSharing: z.array(z.string()),
    lanes: z.array(labelText),
  }),
  after: z.strictObject({
    graduation: z.array(z.string()),
    graduationNote: z.string(),
    paths: z.array(labelText),
    noPaywall: z.string(),
    pilotQuestions: z.array(labelText),
  }),
  glossary: z.array(glossaryTerm).max(80).optional(),
});

const step = z.strictObject({
  id: z.string(),
  text: z.string(),
  ch: z.string(),
  mins: z.number(),
  t: z.number(),
  hint: z.string(),
  // D-173: the builder's per-step fields, each optional, so an AI Employee's steps are unchanged.
  who: z.string().optional(),
  timeLabel: z.string().optional(),
  doneWhen: z.string().optional(),
  goal: z.string().optional(),
  paths: stepPaths.optional(),
  linkedSkill: z.string().optional(),
  openInPreview: z.boolean().optional(),
});

const skillFile = z.strictObject({
  name: z.string(),
  type: z.enum(['JSON', 'YAML', 'Notion']),
  size: z.string(),
  desc: z.string(),
  steps: z.array(z.string()),
});

const moduleResource = z.strictObject({ name: z.string(), type: z.string(), size: z.string() });

/** `[seconds, line]`, the replay transcript shape. */
const transcriptLine = z.tuple([z.number(), z.string()]);

/** The whole AI Employee, because the Module Builder saves the draft it holds, not a patch. */
const draft = z.strictObject({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  tier,
  icon: iconName,
  forWho: z.string(),
  headline: z.string(),
  outcome: z.string(),
  outputs: z.array(z.string()),
  platform: z.string(),
  runLabel: z.string(),
  build: z.number(),
  session: z.number().nullable(),
  status: moduleStatus,
  opens: z.number().nullable(),
  order: z.number(),
  dur: z.number(),
  instructor: z.string(),
  transcript: z.array(transcriptLine),
  notes: z.string(),
  prompt: z.string(),
  files: z.array(skillFile),
  resources: z.array(moduleResource),
  checklist: z.array(step),
  runDemo: z
    .strictObject({ input: z.string(), sections: z.array(z.tuple([z.string(), z.string()])) })
    .optional(),
  // D-173: a course week's own fields, each optional, so an AI Employee's draft is unchanged.
  kind: z.enum(['week', 'skill']).optional(),
  dueAt: z.number().optional(),
  tone: z.string().optional(),
  course: moduleCourse.optional(),
});

/**
 * D-172: the Module Builder's audited save (`POST /api/admin/actions/saveBuilderModule`) sends the same
 * draft, with each step's optional `kind` (the R2 builder's Type, which its Add step sets). Exported for
 * that route; `saveModule`'s own schema below is unchanged.
 */
export const builderDraft = draft.extend({
  checklist: z.array(step.extend({ kind: z.enum(['Watch', 'Read', 'Build', 'Check', 'Ship']).optional() })),
});

// --- the registry ----------------------------------------------------------

/**
 * Every mutation, in the order `mutations.ts` declares them. `z.ZodType<MutationArgs<K>>` is what
 * makes this a contract rather than a list: the schema's output type has to BE the argument type.
 */
export const SCHEMAS: { [K in MutationName]: z.ZodType<MutationArgs<K>> } = {
  // Learner
  dismissAnnouncement: z.strictObject({ id }),
  toggleStep: z.strictObject({ moduleId: id, stepId: id }),
  toggleChecklistItem: z.strictObject({ moduleId: id, stepId: id, itemId: z.string().min(1).max(161) }),
  setPref: z.strictObject({ key: z.string().min(1).max(200), value: z.string().max(8) }),
  saveVideoProgress: z.strictObject({
    moduleId: id,
    videoId: z.string().min(1).max(300),
    maxPct: z.number().min(0).max(1),
    lastPositionS: z.number().min(0).max(86400),
  }),
  markDeployed: z.strictObject({ moduleId: id }),
  unmarkDeployed: z.strictObject({ moduleId: id }),
  setRuntime: z.strictObject({ moduleId: id, runtime }),
  recordRun: z.strictObject({ moduleId: id, title: z.string(), preview: z.string() }),
  requestUpgrade: z.strictObject({ source: z.string() }),
  downloadResource: z.strictObject({ id }),

  // Team owner
  inviteMember: z.strictObject({ email: z.string(), name: z.string().optional(), role: invitableRole }),
  remindMembers: z.strictObject({ userIds: z.array(id) }),
  setMemberRole: z.strictObject({ userId: id, role: learnerRole }),
  removeMember: z.strictObject({ userId: id }),

  // Staff · learners
  nudgeLearners: z.strictObject({ userIds: z.array(id) }),
  setLearnerTier: z.strictObject({ userId: id, tier }),

  // Staff · curriculum
  moveModule: z.strictObject({ id, dir: z.number() }),
  setModuleTier: z.strictObject({ id, tier }),
  publishModule: z.strictObject({ id }),
  unpublishModule: z.strictObject({ id }),
  saveModule: z.strictObject({ draft, status: moduleStatus.optional() }),
  deleteModule: z.strictObject({ id }),

  // Staff · cohorts and sessions
  createCohort: z.strictObject({}),
  openEnrollment: z.strictObject({ cohortId: id }),
  goLive: z.strictObject({ sessionId: id }),
  endSession: z.strictObject({ sessionId: id }),
  publishReplay: z.strictObject({ sessionId: id, durationSec: z.number().optional() }),
  updateSession: z.strictObject({
    id,
    title: z.string(),
    date: isoDate,
    time: isoTime,
    // The form sends what the number input holds, which is a string; core coerces it, and a
    // schema that coerced it first would hide an empty field from core's own validation.
    mins: z.union([z.number(), z.string()]),
    zoom: z.string(),
  }),

  // Staff · vault
  uploadResource: z.strictObject({
    title: z.string(),
    desc: z.string().optional(),
    cat: z.string(),
    type: z.string(),
    tier,
    file: z.string().nullable().optional(),
  }),
  setResourceTier: z.strictObject({ id }),
  setResourceStatus: z.strictObject({ id }),
  deleteResource: z.strictObject({ id }),

  // Staff · announcements
  sendAnnouncement: z.strictObject({
    title: z.string(),
    body: z.string(),
    audience: z.enum(['all', 'agent', 'team', 'owners']),
    inapp: z.boolean(),
    email: z.boolean(),
    when: z.enum(['now', 'later']),
    at: z.string().optional(),
    severity: z.enum(['info', 'warning']).optional(),
    // `''` is what the form's "no action" option sends.
    action: z.union([z.enum(['calendar', 'sessions']), z.literal(''), z.null()]).optional(),
  }),
  toggleReminder: z.strictObject({ id }),

  // Staff · tiers and upgrades
  setTierPrice: z.strictObject({ tierId: id, price: z.number() }),
  setRequestStatus: z.strictObject({ id, status: z.enum(['new', 'contacted', 'converted', 'closed']) }),

  // Staff · staff and roles
  inviteStaff: z.strictObject({ email: z.string(), role: staffRole }),
  setStaffRole: z.strictObject({ id, role: staffRole }),
  removeStaff: z.strictObject({ id }),
  togglePermission: z.strictObject({ role: staffRole, perm: permKey }),
};

/** `POST /api/mutate/:name` for a name that is not a mutation is a 404, decided here. */
export const schemaFor = (name: string): z.ZodType<unknown> | null =>
  Object.prototype.hasOwnProperty.call(SCHEMAS, name) ? (SCHEMAS as Record<string, z.ZodType<unknown>>)[name]! : null;

export type { MutationName };
