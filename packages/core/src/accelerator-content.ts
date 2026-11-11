// The Amplified AI Accelerator's words: Week 0 and the eight weeks (DECISIONS.md D-110).
//
// CONNECTING MATERIAL ONLY. Every week piggybacks on the Library: its skills are the Library's own
// pages (`apps/web/src/library/content.ts` ENTRIES), linked by their Library title and route, and their
// guided setups and copy-to-clipboard prompts stay on those pages. What is written here is what the
// Library does not have: the operating question, why it matters, who does what, the order to open the
// setups in, the live-build and office-hours pages, the homework, the evidence packet and the rubric.
// The source is the PM's course plan (docs/COURSE-PLAN.txt), which is final; the calendar is
// `accelerator.ts`.
//
// HOUSE RULES for every learner-facing string here: Spring's voice (contractions, short sentences), no
// em dashes, no prices, no income or results promises, no invented numbers. Time budgets are
// estimates. Media are placeholders until a real recording exists.
//
// SERVED, NOT BUNDLED. The API sends these words to a buyer whose plan opens the course
// (`GET /api/course`). The web app never imports this file outside its tests, so the course is not
// readable in the public JavaScript bundle.

import {
  ACCELERATOR_INSTRUCTOR,
  ACCELERATOR_SUPPORT_EMAIL,
  BUILD_MINS,
  OFFICE_HOURS_MINS,
  acceleratorModuleId,
  buildSessionId,
  coursePath,
  libraryHref,
  officeHoursSessionId,
} from './accelerator';
import type { IconName } from './icons';
import type { AIEmployee, Step } from './types';

// --- shapes ----------------------------------------------------------------------------------------

export type SkillRole = 'flagship' | 'supporting' | 'optional' | 'pilot' | 'alternative';

/** A Library item, by its Library title and route. Never a new skill. */
export interface CourseSkill {
  title: string;
  route: string;
  role: SkillRole;
  /** What it does for this week, in one line. */
  use: string;
  /** Free to everyone, as the Library has it. */
  free?: boolean;
}

/** One numbered setup step. `route` opens that Library item's guided setup. */
export interface SetupStep {
  text: string;
  route?: string;
}

export interface AgendaItem {
  from: number;
  to: number;
  activity: string;
  why: string;
}

export interface LiveBuildPage {
  sessionId: string;
  agenda: readonly AgendaItem[];
  lesson: string;
  exercise: string;
  /** The one required outcome. */
  required: string;
  /** The harder option, for the same outcome. */
  advanced: string;
  /** The owner approves a real run in class. */
  ownerApproval: string;
  /** Working at the end of class. */
  workingAtEnd: readonly string[];
}

export interface OfficeHoursPage {
  sessionId: string;
  title: string;
  /** What the hour is for, beyond the standard format. */
  note: string;
  format: readonly AgendaItem[] | null;
  /** For a goal-planning session: what you leave with. */
  outputs?: readonly string[];
}

export interface Homework {
  /** Implemented by week's end. */
  byWeekEnd: readonly string[];
  /** The between-session assignment. */
  assignment: readonly string[];
  /** The acceptance test. */
  acceptance: readonly string[];
  /** What "adopted" needs beyond a passing rubric. */
  useEvidence: string;
}

export interface CourseWeek {
  week: number;
  title: string;
  question: string;
  why: readonly string[];
  owner: string;
  operator: string;
  time: { owner: string; operator: string };
  skills: readonly CourseSkill[];
  setup: readonly SetupStep[];
  liveBuild: LiveBuildPage | null;
  officeHours: OfficeHoursPage | null;
  homework: Homework;
  /** Clearly marked placeholders. Nothing here is a recording yet. */
  media: readonly string[];
  /** Course material shipped with the week, by name. */
  materials: readonly string[];
  /** The AI Employee this week is in the portal: its icon, platform, outputs and six steps. */
  module: {
    icon: IconName;
    platform: string;
    runLabel: string;
    outcome: string;
    outputs: readonly [string, string, string];
    checklist: readonly Omit<Step, 'id'>[];
  };
}

// --- shared across every week -----------------------------------------------------------------------

export const ESTIMATE_NOTE = 'These are planning estimates, not guarantees.';

const WEEK_TIME = { owner: 'About 2 to 2.5 hours, including the 90-minute build and real use.', operator: 'About 3 to 4 hours, including the build, practice, refreshing inputs and office hours if you need them.' };

/** The 90-minute live build, weeks 1 to 7. */
export const LIVE_BUILD_AGENDA: readonly AgendaItem[] = [
  { from: 0, to: 10, activity: 'Review last week’s use and one failure', why: 'Using it matters more than showing up.' },
  { from: 10, to: 25, activity: 'Business lesson and decision case', why: 'Why this workflow matters, and where your judgment comes in.' },
  { from: 25, to: 35, activity: 'Demo the minimum working version', why: 'You see the target without it eating the session.' },
  { from: 35, to: 60, activity: 'Owner and operator build time', why: 'Set up your real data, roles, thresholds and outputs.' },
  { from: 60, to: 75, activity: 'Test normal, missing and misleading inputs', why: 'Quality control you can see.' },
  { from: 75, to: 85, activity: 'Rehearse the real business use', why: 'Practice the decision, the meeting or the handoff.' },
  { from: 85, to: 90, activity: 'Commit to a trigger, an owner and an evidence submission', why: 'Put the use on the calendar.' },
];

/** Week 8's 90 minutes: no demo, mostly decisions. */
export const WEEK8_AGENDA: readonly AgendaItem[] = [
  { from: 0, to: 10, activity: 'Results review', why: 'What got used, what got accepted, what broke.' },
  { from: 10, to: 30, activity: 'Assemble the review packet', why: 'Your logs and outputs, in one place.' },
  { from: 30, to: 55, activity: 'Owner and operator decisions', why: 'Keep, fix or retire each workflow.' },
  { from: 55, to: 75, activity: 'Peer teach-backs in staffed groups', why: 'Explain it so you know you can run it.' },
  { from: 75, to: 85, activity: 'Agent rollout choices', why: 'A real go or no-go, from the pilot.' },
  { from: 85, to: 90, activity: 'Final commitments', why: 'The next four weekly reviews, on the calendar.' },
];

/** The 60-minute office hour. */
export const OFFICE_HOURS_FORMAT: readonly AgendaItem[] = [
  { from: 0, to: 10, activity: 'Patterns from submitted issues', why: 'Fixes that help the whole room.' },
  { from: 10, to: 50, activity: 'Four pre-triaged cases, about ten minutes each', why: 'Common blockers first. Access rotates.' },
  { from: 50, to: 60, activity: 'Retest, commit and update the shared support log', why: 'Leave with a fix you’ve checked.' },
];

export const OFFICE_HOURS_RULES: readonly string[] = [
  'Office hours are optional. Come when you’re stuck.',
  'Not everyone gets a hot seat every week. Common blockers come first, and access rotates.',
  'Every team gets its rubric result whether or not it comes.',
  'No private coaching calls. Troubleshooting happens here, in the group.',
];

/** The short issue form. Submit it before the hour so nobody spends 20 minutes finding the problem. */
export const ISSUE_FORM_FIELDS: readonly { label: string; hint: string }[] = [
  { label: 'Expected Result', hint: 'What you expected the skill to give you.' },
  { label: 'Actual Result', hint: 'What it actually gave you.' },
  { label: 'Redacted Input', hint: 'The input, with client and employee details removed.' },
  { label: 'What You Tried', hint: 'The fix you already attempted.' },
  { label: 'Platform', hint: 'Claude, ChatGPT or Grok Bot, plus your CRM.' },
];

/** The weekly evidence packet. Small on purpose, so you keep doing it. */
export const EVIDENCE_PACKET: readonly { label: string; hint: string }[] = [
  { label: 'Skill and Version Link', hint: 'A link to the skill and the version you ran.' },
  { label: 'One Redacted Output', hint: 'One real output, with client and employee details removed.' },
  { label: 'Test Checklist', hint: 'Normal, missing and misleading inputs, and what happened on each.' },
  { label: 'Use Log', hint: 'When it ran, who ran it, what it was for, and prep and review time.' },
  { label: 'Three-Sentence Account', hint: 'The action you took because of it. A two-minute recording works too.' },
];

export interface RubricDimension {
  label: string;
  meets: string;
}

/** Scored 0, 1 or 2 on each. */
export const RUBRIC: readonly RubricDimension[] = [
  { label: 'Business Fit', meets: 'Solves a named operating problem and informs an action.' },
  { label: 'Evidence Quality', meets: 'Required facts trace to inputs. Missing information is visible.' },
  { label: 'Output Quality', meets: 'Meets your team’s actual acceptance standard.' },
  { label: 'Control', meets: 'Human approval, access limits and safe failure are explicit.' },
  { label: 'Repeatability', meets: 'A named maintainer can rerun it at the agreed trigger.' },
];

export const RUBRIC_SCALE: readonly { score: 0 | 1 | 2; label: string }[] = [
  { score: 0, label: 'Not demonstrated' },
  { score: 1, label: 'Needs correction' },
  { score: 2, label: 'Meets standard' },
];

export const RUBRIC_RULES: readonly string[] = [
  'Tested: 8 or more out of 10, with no zero in Evidence Quality or Control.',
  'Adopted: tested, plus this week’s use evidence. No score stands in for actual use.',
];

/** Rubric totals, worked out the one way. `tested` needs 8 of 10 and no zero in evidence or control. */
export function rubricResult(scores: readonly (0 | 1 | 2)[]): { total: number; tested: boolean } {
  if (scores.length !== RUBRIC.length) throw new Error(`rubricResult: expected ${RUBRIC.length} scores`);
  const total = scores.reduce<number>((a, s) => a + s, 0);
  const evidence = scores[RUBRIC.findIndex((d) => d.label === 'Evidence Quality')]!;
  const control = scores[RUBRIC.findIndex((d) => d.label === 'Control')]!;
  return { total, tested: total >= 8 && evidence > 0 && control > 0 };
}

export const READINESS: readonly { gate: 'Green' | 'Amber' | 'Red'; text: string }[] = [
  { gate: 'Green', text: 'Accounts work, permissions are confirmed, your operator is named and the minimum data is there. Build on your own data.' },
  { gate: 'Amber', text: 'Accounts work, but a data gap remains. Build on the practice set while a named person fixes the gap, then rerun on your real data. Until you do, the week shows “data repair required.”' },
  { gate: 'Red', text: 'No authorized access, no maintainer, or no time to implement. Sort it out before the start, or defer. Don’t let it become an open-ended support problem.' },
];

export const PATHS_IN_CLASS: readonly { label: string; text: string }[] = [
  { label: 'Core Path', text: 'The preconfigured skill, an annotated input example, a minimum-data build, and one reviewed real-world use.' },
  { label: 'Advanced Path', text: 'The same outcome, plus a harder reconciliation, an edge-case test or a safely scoped connection. Not a second curriculum.' },
  { label: 'Owner Requirement', text: 'Explain one financial or operating conclusion and approve an action. Your operator can’t do this part for you.' },
  { label: 'Operator Requirement', text: 'Refresh the input, reproduce an output, find a failure and follow the repair steps.' },
];

export const MISSED_A_WEEK = 'Missed a week? Do the core path first: the preconfigured skill, the minimum-data build and one reviewed real use. Extras can wait.';

// --- before Week 1 ---------------------------------------------------------------------------------

export const INTAKE_FIELDS: readonly string[] = [
  'Team size',
  'Your operator, or that the owner holds both roles',
  'Your CRM, and whether you use Sisu',
  'Who owns accounting and reports',
  'Where your tasks live',
  'Your meeting cadence',
  'Three recurring problems',
  'Known access restrictions',
];

export const ORIENTATION: { minutes: number; topics: readonly string[]; media: string } = {
  minutes: 30,
  topics: [
    'How each week works: one question, one flagship skill, one required output.',
    'Checking facts: every number needs a source and a period.',
    'Approved data handling: what goes in, what stays out.',
    'The test checklist: normal, missing and misleading inputs.',
  ],
  media: '[VIDEO: orientation, about 30 minutes, to be recorded]',
};

/** Usable data, not perfect data. The minimum is a fine place to start. */
export const DATA_PACK: readonly { input: string; preferred: string; minimum: string }[] = [
  { input: 'Production', preferred: 'The prior 12 months, plus your current pipeline.', minimum: 'The last 90 days, labeled provisional.' },
  { input: 'Accounting', preferred: 'Monthly P&L for the prior 12 months, with the reporting basis noted.', minimum: 'Your latest closed monthly P&L and known spend for the sources in scope.' },
  { input: 'Lead Sources', preferred: 'Spend, created leads and closings by source, with source IDs and dates.', minimum: 'Your three largest identifiable sources, plus an “unknown” bucket.' },
  { input: 'Team Structure', preferred: 'Names or IDs, roles, responsibilities and meeting cadence.', minimum: 'The owner, the operator and the people in the workflows you pick.' },
  { input: 'Tasks and Meetings', preferred: 'Your current task list and one authorized transcript or set of notes.', minimum: 'A redacted meeting summary.' },
  { input: 'Pipeline', preferred: 'Active records with owner, stage, next action and the relevant dates.', minimum: 'A checked list of 10 to 20 records, or all of them if you have fewer.' },
  { input: 'Agent Pilot', preferred: 'One recurring task and a representative past output.', minimum: 'A timed, supervised baseline run.' },
];

export const PRACTICE_SET_NOTE =
  'The practice set is synthetic. The numbers are made up for practice and aren’t a benchmark. One input is missing on purpose, so you can see the worksheet say “unknown” instead of $0.';

export const SAFE_SHARING: readonly string[] = [
  'Redact client and employee details before anything leaves your private folder.',
  'Never upload tax IDs, bank details, identity documents, full transaction files or unrelated personnel records.',
  'Keep your originals. Send the program only redacted evidence.',
  'Keep the cohort’s peer-sharing folder free of client and employee information.',
  'Use one approved AI workspace, and check its data settings before you use live client or employee information.',
  'Drafts by default. Sending, publishing, merging records or writing to your CRM needs a person to approve it.',
  'We won’t use your testimonial, logo, screenshot, numbers or recording publicly without your specific permission.',
];

export const LANES: readonly { label: string; text: string }[] = [
  { label: 'Connected', text: 'An authorized connector you’ve tested. Start read-only. Turn on writes only where a person reviews them.' },
  { label: 'Exported', text: 'CSV or Excel reports and controlled uploads. The default, and a perfectly good finished build.' },
  { label: 'Manual Minimum', text: 'A checked form or a small extract. Same standards. Just don’t call it automated.' },
];

// --- after Week 8 ----------------------------------------------------------------------------------

/** An operating standard, not a guarantee. */
export const GRADUATION: readonly string[] = [
  'Four core routines in use, each with at least three real cycles: daily prioritization, the weekly numbers review, weekly decision-to-task follow-through and the pipeline exception review.',
  'One checked economics review: a completed baseline, a documented data-quality check, and at least one source decision or a justified decision to collect more data.',
  'One coaching example and one delegation example, in real use with a team member.',
  'One skill you adapted on your own that passes the three tests: a normal case, a missing-information case and a failure case.',
  'One handoff and a 90-day plan: a maintainer other than the instructor, refresh instructions and fallback steps.',
];

export const GRADUATION_NOTE =
  'This is an operating standard, not a promise about results. Attendance and implementation are reported separately. You can come to every session and still be “not yet implemented,” and that’s useful to know.';

export const WEEK8_PATHS: readonly { label: string; text: string }[] = [
  { label: 'Lead It Yourselves', text: 'Leave with a 30-day internal rollout plan, the pilot skill, a practice agenda and a scorecard. It’s a real option, and it works without buying anything else.' },
  { label: 'Get Guided Help', text: 'The Amplified Agent Plan or the Amplified Team Plan runs practice and feedback with your agents. Ask us about the next intake. Any later charges are spelled out before you decide.' },
  { label: 'Defer', text: 'Keep your owner routines running and revisit agent rollout after you’ve fixed capacity, quality or data issues.' },
];

export const NO_PAYWALL =
  'No surprise paywall and no automatic enrollment. Your workflows keep working without any future purchase, and your program isn’t incomplete without one.';

// --- the weeks ------------------------------------------------------------------------------------

const S = (text: string, ch: string, mins: number, minute: number, hint = ''): Omit<Step, 'id'> => ({ text, ch, mins, t: minute * 60, hint });

const officeHours = (week: number, title: string, note = 'Bring the issue form. The first ten minutes cover patterns from everyone’s submissions.'): OfficeHoursPage => ({
  sessionId: officeHoursSessionId(week),
  title,
  note,
  format: OFFICE_HOURS_FORMAT,
});

const OWNER_APPROVAL = 'The owner reviews and approves one real run during class, even if the operator did the setup. Delegate the maintenance, not the understanding.';

export const ACCELERATOR_WEEKS_CONTENT: readonly CourseWeek[] = [
  {
    week: 0,
    title: 'Get Ready',
    question: 'Are we ready to start on our own data?',
    why: [
      'Week 1 goes fastest when your accounts work, your operator is named and your data is in one place.',
      'None of this is hard. It just has to happen before Dec 2, not during the first build.',
    ],
    owner: 'Name your operator, fill in the intake and set up your own AI Brain. Protect a weekly time for the operating review.',
    operator: 'Check access, gather the data pack, set up the working folder and run the readiness exercise.',
    time: { owner: 'About 45 to 60 minutes.', operator: 'About 2 to 3 hours, when your data is easy to reach.' },
    skills: [
      { title: 'AI Brain Setup', route: '/ai-brain-setup', role: 'flagship', use: 'Your Claude or ChatGPT workspace: instructions, an About My Business file and memory.', free: true },
      { title: 'Sounds Like You: Your AI Voice Profile', route: '/voice-profile', role: 'flagship', use: 'So drafts sound like you, not like a robot.', free: true },
      { title: 'Team AI Brain', route: '/team-ai-brain', role: 'flagship', use: 'Your team’s shared workspace, built from your own SOPs and standards.' },
      { title: 'The Ops Time Audit', route: '/ops-time-audit', role: 'supporting', use: 'Your time baseline, before anything changes.' },
    ],
    setup: [
      { text: 'Fill in the intake. Your intake form arrives with your welcome email.' },
      { text: 'Watch the orientation. It’s about 30 minutes.' },
      { text: 'Pick your primary AI workspace. Check its plan settings, uploads, approved tools and who has access.' },
      { text: 'Open AI Brain Setup and follow its guided setup to the end.', route: '/ai-brain-setup' },
      { text: 'Open Sounds Like You and build your voice profile.', route: '/voice-profile' },
      { text: 'Owner: open Team AI Brain and build the team’s shared workspace.', route: '/team-ai-brain' },
      { text: 'Open The Ops Time Audit and record your baseline: report prep, meeting prep, follow-up admin and one agent task.', route: '/ops-time-audit' },
      { text: 'Set up a working folder with separate places for approved inputs, outputs, workflow versions, runbooks and private evidence.' },
      { text: 'Gather the data pack. The minimum is fine to start.' },
      { text: 'Run the readiness exercise: the Week 1 worksheet on the practice set. Find the input that’s missing on purpose.' },
      { text: 'Check your readiness gate: green, amber or red.' },
    ],
    liveBuild: null,
    officeHours: null,
    homework: {
      byWeekEnd: ['Intake in.', 'Orientation watched.', 'AI Brain set up.', 'Time baseline recorded.', 'Readiness gate checked.'],
      assignment: ['Fix anything amber before Dec 2, or name who’s fixing it and when.'],
      acceptance: [
        'Your operator is named, or the owner has taken both roles on purpose.',
        'Your accounts and permissions work.',
        'The readiness exercise shows “unknown” for the missing input, not $0.',
      ],
      useEvidence: 'A time baseline you recorded before Week 1, not one remembered later.',
    },
    media: ['[VIDEO: orientation, about 30 minutes, to be recorded]', '[VIDEO: week 0 setup walkthrough, to be recorded]'],
    materials: ['The intake form', 'The data pack list', 'The synthetic practice set', 'The safe-sharing rules'],
    module: {
      icon: 'listChecks',
      platform: 'Claude or ChatGPT',
      runLabel: 'Run on the Practice Set',
      outcome: 'Your accounts, operator, baseline and data pack, ready before the first build on Dec 2.',
      outputs: ['Intake in and operator named', 'AI Brain set up and time baseline recorded', 'Readiness gate checked on the practice set'],
      checklist: [
        S('Fill in the intake and name your operator', 'Fill In the Intake', 10, 0, 'Your intake form arrives with your welcome email.'),
        S('Watch the orientation', 'Watch the Orientation', 30, 0, 'About 30 minutes.'),
        S('Open AI Brain Setup and finish its guided setup', 'Set Up Your AI Brain', 30, 0, 'It’s free. The prompts stay on its Library page.'),
        S('Record your time baseline with The Ops Time Audit', 'Record Your Baseline', 20, 0, 'Report prep, meeting prep, follow-up admin and one agent task.'),
        S('Gather the data pack', 'Gather the Data Pack', 45, 0, 'Usable data, not perfect data. The minimum is fine.'),
        S('Run the readiness exercise on the practice set', 'Run the Readiness Check', 15, 0, 'Find the input that’s missing on purpose.'),
      ],
    },
  },
  {
    week: 1,
    title: 'Know the Business',
    question: 'What are we paying for leads, and what can we trust?',
    why: [
      'Before you change spend or push agents, you need to tell production, revenue, acquisition cost, contribution and data uncertainty apart.',
      'We start with checked spend and lead counts, then go only as far as the data supports.',
    ],
    owner: 'Review the exceptions at a fixed weekly time. Decide what you can conclude, what you can’t yet, and what you’d need to know.',
    operator: 'Refresh the weekly numbers view and fill in the worksheet. Refresh source economics monthly, after the books close.',
    time: WEEK_TIME,
    skills: [
      { title: 'Lead-Source ROI', route: '/lead-source-roi', role: 'flagship', use: 'Your lead spend next to what closed, by source. A Grok Bot template.' },
      { title: 'FUB Pipeline Review', route: '/fub-pipeline-review', role: 'supporting', use: 'The weekly numbers view.' },
      { title: 'Team P&L Review', route: '/team-pnl-review', role: 'supporting', use: 'The accounting input, from your latest closed month.', free: true },
    ],
    setup: [
      { text: 'Open Lead-Source ROI and follow its guided setup to the end.', route: '/lead-source-roi' },
      { text: 'Open FUB Pipeline Review and set up the weekly numbers view.', route: '/fub-pipeline-review' },
      { text: 'Open Team P&L Review and run it on your latest closed month.', route: '/team-pnl-review' },
      { text: 'Download the Week 1 worksheet. The math happens there, never in chat.' },
      { text: 'Fill in one period for your three largest sources and the unknown bucket. Leave missing inputs blank.' },
      { text: 'Run the three tests, then bring one decision question to the owner.' },
    ],
    liveBuild: {
      sessionId: buildSessionId(1),
      agenda: LIVE_BUILD_AGENDA,
      lesson: 'Cost per lead, period cost per closing, coverage and unknowns. What each one can and can’t tell you, and why contribution isn’t net profit.',
      exercise: 'Two sources with different lead costs, close rates and team-retained commission. Decide what you can conclude, what you can’t, and what evidence you’d need.',
      required: 'One checked worksheet for at least one usable source, its unknowns named, and one decision question.',
      advanced: 'Reconcile a second source, or test one more assumption.',
      ownerApproval: OWNER_APPROVAL,
      workingAtEnd: [
        'Production totals tied to the report you named as the source.',
        'A first worksheet calculation for at least one usable source.',
        'Explicit unknowns.',
        'One decision question.',
      ],
    },
    officeHours: officeHours(1, 'Lead-Source ROI Office Hours'),
    homework: {
      byWeekEnd: [
        'A team baseline.',
        'The best three-source view you can get.',
        'Either a justified action or a dated data-repair assignment.',
        'One financial metric frozen, ideally cost per lead, with its definition written down.',
        'The reporting task timed, prep and review included.',
      ],
      assignment: [
        'Review disputed totals with whoever keeps the books.',
        'Pick one restrained experiment or tracking fix. Not a wholesale budget change.',
      ],
      acceptance: [
        'Every key number has a source and a period.',
        'Denominators are defined.',
        'No missing cost is treated as zero.',
        'The owner can tell contribution from net profit.',
      ],
      useEvidence: 'One checked source analysis, baseline hours, the frozen metric, and one decision or repair assignment.',
    },
    media: ['[VIDEO: week 1 Lead-Source ROI demo, to be recorded]', '[VIDEO: week 1 live build replay, posts after the session]'],
    materials: ['The Week 1 worksheet: cost per lead, period cost per closing, coverage and unknowns', 'The synthetic practice set'],
    module: {
      icon: 'dollar',
      platform: 'Grok Bot',
      runLabel: 'Run on Your Numbers',
      outcome: 'A checked view of what your leads cost by source, with every unknown named.',
      outputs: ['Production totals tied to their source report', 'A worksheet for at least one source, unknowns named', 'One decision or a dated data-repair assignment'],
      checklist: [
        S('Open Lead-Source ROI and finish its guided setup', 'Set Up Lead-Source ROI', 15, 35, 'Follow the setup on its Library page. The prompts stay there.'),
        S('Load one period of spend, leads and closings for your three largest sources', 'Load Your Inputs', 10, 42, 'Your last closed month. Label anything provisional.'),
        S('Fill in the Week 1 worksheet for at least one usable source', 'Run the Worksheet', 10, 50, 'The worksheet does the math. Missing inputs stay unknown.'),
        S('Test a normal input and tie the totals to your production report', 'Normal Test', 5, 60, ''),
        S('Test a missing input and confirm it shows as unknown, not zero', 'Missing-Input Test', 5, 65, ''),
        S('Test a misleading input, then have the owner approve one real run', 'Misleading-Input Test', 5, 70, 'The owner signs off in class.'),
      ],
    },
  },
  {
    week: 2,
    title: 'Own the Day',
    question: 'What needs attention, and who owns the next action?',
    why: [
      'The goal isn’t a prettier summary. It’s fewer commitments with nobody’s name on them.',
      'You get one consistent way to decide what deserves your attention each morning.',
    ],
    owner: 'Review the brief for ten minutes. Accept only tasks with a named owner, a due date and a definition of done.',
    operator: 'Refresh the inputs at a fixed time: the Week 1 numbers view, the task list and one authorized meeting or email thread.',
    time: WEEK_TIME,
    skills: [
      { title: 'Morning Brief', route: '/morning-brief', role: 'flagship', use: 'A one-page brief: up to three priorities, the exceptions that need a decision, and the next owned actions.' },
      { title: 'Task Sync Starter Kit', route: '/task-sync-starter', role: 'supporting', use: 'Turns one authorized meeting or email thread into owned, dated tasks.' },
      { title: 'Inbox and Meeting Follow-Through', route: '/inbox-meeting-follow-through', role: 'supporting', use: 'The daily pass over email and meetings, once the brief proves useful.' },
    ],
    setup: [
      { text: 'Open Morning Brief and follow its guided setup to the end.', route: '/morning-brief' },
      { text: 'Open Task Sync Starter Kit. Start with one authorized transcript or email thread, not your whole inbox.', route: '/task-sync-starter' },
      { text: 'Pick one task destination. Use the one you already have. Manual paste is fine.' },
      { text: 'Feed the brief your Week 1 numbers view and your current task list. Add calendar only if it’s already connected.' },
      { text: 'Run the three tests, then have the owner approve one real brief.' },
      { text: 'Later, if the brief earns it: open Inbox and Meeting Follow-Through.', route: '/inbox-meeting-follow-through' },
    ],
    liveBuild: {
      sessionId: buildSessionId(2),
      agenda: LIVE_BUILD_AGENDA,
      lesson: 'What makes a commitment real: an owner, a date and a definition of done. Why a brief that invents those is worse than no brief.',
      exercise: 'A transcript says “someone should follow up next week.” The skill has to flag the missing owner and date, not invent them. You resolve it.',
      required: 'A saved Morning Brief, one checked brief and one task destination.',
      advanced: 'Reconcile one meeting’s tasks against your task list, with no duplicates.',
      ownerApproval: OWNER_APPROVAL,
      workingAtEnd: ['A saved skill.', 'One checked brief.', 'A single task destination. No second task board.'],
    },
    officeHours: {
      sessionId: officeHoursSessionId(2),
      title: 'Goal-Planning Session 1 and Office Hours',
      note: 'Thursday, Dec 10 is the first goal-planning session, for every buyer, with a short Week 1 office-hours segment. 60 minutes in all. Reflect on 2026 before you set an AI goal. No new integrations and no required December homework.',
      format: null,
      outputs: ['A draft 2027 business goal.', 'A list of the numbers you know and the ones you don’t.', 'One operating bottleneck.'],
    },
    homework: {
      byWeekEnd: ['Five brief uses.', 'One reconciled meeting-to-task run.', 'No duplicate task board.', 'Prep time and review time recorded separately.'],
      assignment: [
        'Run it on real work. Mark what you ignored or what was wrong.',
        'Cut the sections that don’t earn their place.',
        'Add connections only after the output proves useful.',
      ],
      acceptance: [
        'Every proposed action traces to an input.',
        'Ambiguities stay visible.',
        'The owner can explain why the top three items made the cut.',
      ],
      useEvidence: 'Five brief uses and one checked task list.',
    },
    media: ['[VIDEO: week 2 Morning Brief demo, to be recorded]', '[VIDEO: week 2 live build replay, posts after the session]'],
    materials: [],
    module: {
      icon: 'sun',
      platform: 'Your AI workspace',
      runLabel: 'Run on This Morning',
      outcome: 'A ten-minute morning brief where every action has an owner, a date and a source.',
      outputs: ['A saved brief and one checked run', 'One task destination, no duplicate board', 'Five uses and one reconciled meeting-to-task run'],
      checklist: [
        S('Open Morning Brief and finish its guided setup', 'Set Up Morning Brief', 15, 35, 'The prompts stay on its Library page.'),
        S('Connect one authorized meeting or email thread with Task Sync Starter Kit', 'Add One Input', 10, 42, 'One thread first, not the whole inbox.'),
        S('Pick your one task destination', 'Pick a Destination', 5, 52, 'The one you already use. Manual paste counts.'),
        S('Test a normal morning: three priorities, each traced to an input', 'Normal Test', 5, 60, ''),
        S('Test “someone should follow up” and check it flags the missing owner and date', 'Missing-Input Test', 5, 65, ''),
        S('Test a conflicting input, then have the owner approve one real brief', 'Misleading-Input Test', 5, 70, 'The owner signs off in class.'),
      ],
    },
  },
  {
    week: 3,
    title: 'Turn Insight into a Decision',
    question: 'What should we solve this week?',
    why: [
      'A report is only worth something if it changes a decision or a behavior.',
      'This should shorten your meeting prep and sharpen the issues you discuss. It shouldn’t add a meeting.',
    ],
    owner: 'Pick the highest-priority issue and make the call. AI can help frame options. It doesn’t make the decision.',
    operator: 'Prepare the packet the day before your existing leadership meeting, from the Week 1 numbers, the Week 2 commitments and the issue list.',
    time: WEEK_TIME,
    skills: [
      { title: 'L10 Meeting Prep', route: '/l10-meeting-prep', role: 'flagship', use: 'Preps the weekly meeting. Don’t run EOS? Call it your weekly leadership meeting. It works the same.' },
      { title: 'Task Sync Starter Kit', route: '/task-sync-starter', role: 'supporting', use: 'Carries each decision into the same task system as Week 2.' },
    ],
    setup: [
      { text: 'Open L10 Meeting Prep and follow its guided setup to the end. Not on EOS? Use the weekly leadership meeting labels.', route: '/l10-meeting-prep' },
      { text: 'Bring in your Week 1 numbers view and your Week 2 commitments.' },
      { text: 'Write one issue: the observed gap, the evidence, the business impact, the decision needed and who’s responsible.' },
      { text: 'Use the Task Sync Starter Kit you set up in Week 2 to carry decisions into your task system.', route: '/task-sync-starter' },
      { text: 'Start a decision log. Keep “no action” decisions and the reasons for them.' },
      { text: 'Run the three tests, then have the owner approve the packet.' },
    ],
    liveBuild: {
      sessionId: buildSessionId(3),
      agenda: LIVE_BUILD_AGENDA,
      lesson: 'Facts aren’t causes. How to write an issue that points at a measured gap, so the meeting decides something.',
      exercise: 'Turn “agents need to work harder” into a specific issue tied to a measured gap. Separate what you observed from what might be causing it. Challenge the diagnosis before you ask AI to polish it.',
      required: 'A usable agenda, one evidence-backed issue and a decision-log template.',
      advanced: 'Write a second issue from a different data source, and test it the same way.',
      ownerApproval: OWNER_APPROVAL,
      workingAtEnd: ['A usable agenda.', 'One evidence-backed issue.', 'A decision-log template.'],
    },
    officeHours: {
      sessionId: officeHoursSessionId(3),
      title: 'Goal-Planning Session 2 and Office Hours',
      note: 'Thursday, Dec 17 is the second goal-planning session, with your agents invited, plus a short office-hours segment. 60 minutes in all. Simplify before you automate.',
      format: null,
      outputs: ['A one-page implementation charter: what you’ll stop doing, the owner, the operator, the data you need and the weekly time you’ll reserve.'],
    },
    homework: {
      byWeekEnd: [
        'One real meeting with a recorded decision, an owner, a due date and a follow-up check.',
        '“No action” decisions kept, with their reasons.',
      ],
      assignment: [
        'Compare your prep time with your baseline.',
        'Check follow-through at the next meeting.',
        'Count closed decisions and overdue actions, not pages generated.',
      ],
      acceptance: ['The issue cites evidence.', 'The decision is explicit.', 'The action shows up in the same task system you used in Week 2.'],
      useEvidence: 'One real meeting, its decision and the owned follow-through.',
    },
    media: ['[VIDEO: week 3 L10 Meeting Prep demo, to be recorded]', '[VIDEO: week 3 live build replay, posts after the session]'],
    materials: ['A decision-log template'],
    module: {
      icon: 'target',
      platform: 'Claude or ChatGPT',
      runLabel: 'Run on This Week’s Meeting',
      outcome: 'A meeting packet that ends in a recorded decision, with an owner and a date.',
      outputs: ['A usable agenda and one evidence-backed issue', 'A decision log, “no action” decisions included', 'One real meeting with owned follow-through'],
      checklist: [
        S('Open L10 Meeting Prep and finish its guided setup', 'Set Up L10 Meeting Prep', 15, 35, 'Not on EOS? Use the weekly leadership meeting labels.'),
        S('Bring in your Week 1 numbers and Week 2 commitments', 'Load Your Inputs', 5, 45, ''),
        S('Write one issue with its evidence, impact and the decision needed', 'Write One Issue', 10, 50, 'Facts first. Causes are a guess until you check them.'),
        S('Test a normal week: one issue, its evidence and a clear decision', 'Normal Test', 5, 60, ''),
        S('Test an issue with no evidence and check it asks instead of guessing', 'Missing-Input Test', 5, 65, ''),
        S('Test the flawed “agents need to work harder” issue, then have the owner approve the packet', 'Misleading-Input Test', 5, 70, 'The owner signs off in class.'),
      ],
    },
  },
  {
    week: 4,
    title: 'Protect the Pipeline',
    question: 'Where is execution slipping?',
    why: [
      'The point is to send attention to the gaps, not to restate every record in your CRM.',
      'A missing update isn’t the same as a stalled deal. The review has to tell them apart.',
    ],
    owner: 'Before your pipeline review, confirm the exceptions with the responsible agents and record a next action for each.',
    operator: 'Run the review before your existing pipeline meeting. Start with active deals and one small priority segment.',
    time: WEEK_TIME,
    skills: [
      { title: 'FUB Pipeline Review', route: '/fub-pipeline-review', role: 'flagship', use: 'The weekly pipeline review, from your Follow Up Boss exports.' },
      { title: 'Contract-to-Close Deadline Tracker', route: '/contract-to-close-deadlines', role: 'optional', use: 'What’s overdue and due soon across your files, with the date math shown.' },
      { title: 'Stalled Lender, Title & Escrow Follow-Up', route: '/stalled-item-follow-up', role: 'optional', use: 'Spots items that should have moved and drafts the follow-up.' },
      { title: 'TC File Audit', route: '/tc-file-audit', role: 'optional', use: 'One file against your checklist and its contract dates.' },
      { title: 'Database Health Check', route: '/database-health-check', role: 'optional', use: 'Only if your identifiers are messy. A cleanup list, not a cleanup project.', free: true },
    ],
    setup: [
      { text: 'Open FUB Pipeline Review and follow its guided setup to the end.', route: '/fub-pipeline-review' },
      { text: 'Export your active deals and one small priority segment. Not the whole database.' },
      { text: 'Run it and rank the exceptions: overdue next actions, missing owners, stale stages, unconfirmed dates and records that disagree.' },
      { text: 'Run the three tests. It has to stop and ask about look-alike names and conflicting dates.' },
      { text: 'Optional: open Contract-to-Close Deadline Tracker, Stalled Lender, Title & Escrow Follow-Up or TC File Audit for the transaction side.', route: '/contract-to-close-deadlines' },
      { text: 'Only if your identifiers are messy: open Database Health Check.', route: '/database-health-check' },
    ],
    liveBuild: {
      sessionId: buildSessionId(4),
      agenda: LIVE_BUILD_AGENDA,
      lesson: 'What counts as an exception, and why your transaction system, not the AI, is the authority on contract dates and obligations.',
      exercise: 'Two people with similar names and a deal with conflicting dates. The workflow has to stop and ask, not merge the people or assert a deadline it can’t verify.',
      required: 'A ranked exception list with record references and proposed next steps.',
      advanced: 'Add one optional transaction-side extension and test it the same way.',
      ownerApproval: OWNER_APPROVAL,
      workingAtEnd: [
        'A ranked exception list with record references and proposed next steps.',
        'No automatic merges, record edits, messages or contract interpretation.',
      ],
    },
    officeHours: officeHours(4, 'FUB Pipeline Review Office Hours'),
    homework: {
      byWeekEnd: [
        'The top five exceptions reviewed, or all of them if you have fewer.',
        'Each one’s disposition and owner written down.',
        'The review run again, to see which exceptions remain.',
      ],
      assignment: [
        'Track verified exceptions resolved, not “deals saved.”',
        'Keep full database cleanup out of this week. It’s too easy for it to become a CRM repair project.',
      ],
      acceptance: [
        'Dates and stages trace to records.',
        'Suspected matches are marked uncertain.',
        'Missing source information isn’t presented as something that happened.',
      ],
      useEvidence: 'Reviewed exceptions with assigned next actions.',
    },
    media: ['[VIDEO: week 4 FUB Pipeline Review demo, to be recorded]', '[VIDEO: week 4 live build replay, posts after the session]'],
    materials: [],
    module: {
      icon: 'filter',
      platform: 'Claude or ChatGPT',
      runLabel: 'Run on Your Pipeline',
      outcome: 'A ranked list of where deals are slipping, each with a record reference and a next step.',
      outputs: ['A ranked exception list with record references', 'A disposition and an owner for the top five', 'A rerun showing what’s still open'],
      checklist: [
        S('Open FUB Pipeline Review and finish its guided setup', 'Set Up FUB Pipeline Review', 15, 35, 'The prompts stay on its Library page.'),
        S('Export your active deals and one small priority segment', 'Load Your Pipeline', 10, 42, 'Not the whole database.'),
        S('Rank the exceptions and propose a next step for each', 'Rank the Exceptions', 5, 52, ''),
        S('Test your active deals and check every date traces to a record', 'Normal Test', 5, 60, ''),
        S('Test a deal with a missing date and check it isn’t reported as an event', 'Missing-Input Test', 5, 65, ''),
        S('Test two similar names and conflicting dates, then have the owner approve one real run', 'Misleading-Input Test', 5, 70, 'It has to stop and ask. The owner signs off in class.'),
      ],
    },
  },
  {
    week: 5,
    title: 'Coach from Evidence',
    question: 'What behavior should change for this agent?',
    why: [
      'Missing activity, weak conversion, a bad process and incomplete tracking all look alike on a scorecard. Coaching depends on telling them apart.',
      'AI helps you prepare a better conversation. It doesn’t judge people.',
    ],
    owner: 'Before the 1:1, verify the numbers. In it, ask about context, agree on one behavior to change and set the next review date.',
    operator: 'Prepare the packet from agreed activity definitions, production context, prior commitments and the agent’s own perspective.',
    time: WEEK_TIME,
    skills: [
      { title: 'Agent 1:1 Prep', route: '/agent-1on1-prep', role: 'flagship', use: 'Walk into the 1:1 with the pace math, last time’s commitments and the questions to ask.' },
      { title: 'FUB Pipeline Review', route: '/fub-pipeline-review', role: 'supporting', use: 'Context for the conversation, from Week 4.' },
      { title: 'Listing Appointment Prep', route: '/listing-appointment-prep', role: 'pilot', use: 'For the agent pilot, not a second class build.' },
      { title: 'Appointment Follow-Up', route: '/appointment-follow-up', role: 'pilot', use: 'For the agent pilot, not a second class build.', free: true },
    ],
    setup: [
      { text: 'Open Agent 1:1 Prep and follow its guided setup to the end.', route: '/agent-1on1-prep' },
      { text: 'Agree on the activity definitions with the agent before you use them.' },
      { text: 'Add context from your Week 4 FUB Pipeline Review.', route: '/fub-pipeline-review' },
      { text: 'Build one packet: facts, hypotheses and questions, kept apart.' },
      { text: 'Run the three tests, then have the owner approve the packet.' },
      { text: 'Pick the pilot task: Listing Appointment Prep or Appointment Follow-Up. In January agent training already? Use that work for the pilot instead of doing it twice.', route: '/listing-appointment-prep' },
    ],
    liveBuild: {
      sessionId: buildSessionId(5),
      agenda: LIVE_BUILD_AGENDA,
      lesson: 'Diagnose before you prescribe. The same number can mean four different problems.',
      exercise: 'Two agents with similar closings but different activity and opportunity mix. Explain why the same coaching would be wrong for one of them.',
      required: 'One checked packet, three diagnostic questions and one proposed behavior experiment.',
      advanced: 'Build a second packet for a different agent and compare what changes.',
      ownerApproval: OWNER_APPROVAL,
      workingAtEnd: ['One checked packet.', 'Three diagnostic questions.', 'One proposed behavior experiment.'],
    },
    officeHours: officeHours(5, 'Agent 1:1 Prep Office Hours'),
    homework: {
      byWeekEnd: [
        'Two real coaching conversations, each ending with a commitment the agent owns and a follow-up date.',
        'A small team can use two conversations with the same agent.',
      ],
      assignment: [
        'Invite two willing agents, or one on a very small team, into a limited workflow pilot.',
        'Pick one upcoming task, record a baseline and agree on a quality standard.',
        'In January agent training already? Use that work here. Don’t duplicate it.',
      ],
      acceptance: [
        'The packet keeps facts, hypotheses and questions apart.',
        'It doesn’t infer motivation, character or protected characteristics from activity data.',
      ],
      useEvidence: 'Two real coaching conversations with follow-up dates.',
    },
    media: ['[VIDEO: week 5 Agent 1:1 Prep demo, to be recorded]', '[VIDEO: week 5 live build replay, posts after the session]'],
    materials: [],
    module: {
      icon: 'users',
      platform: 'Claude or ChatGPT',
      runLabel: 'Run on One Agent',
      outcome: 'A coaching packet that keeps facts, hypotheses and questions apart, and one agreed behavior to change.',
      outputs: ['One checked packet and three diagnostic questions', 'One proposed behavior experiment', 'Two real conversations with follow-up dates'],
      checklist: [
        S('Open Agent 1:1 Prep and finish its guided setup', 'Set Up Agent 1:1 Prep', 15, 35, 'The prompts stay on its Library page.'),
        S('Agree on the activity definitions and load one agent’s numbers', 'Load One Agent', 10, 42, ''),
        S('Draft three diagnostic questions and one behavior experiment', 'Draft the Questions', 5, 52, ''),
        S('Test one agent’s packet: facts, hypotheses and questions kept apart', 'Normal Test', 5, 60, ''),
        S('Test missing activity data and check it says so', 'Missing-Input Test', 5, 65, ''),
        S('Test two agents with similar closings and different activity, then have the owner approve the packet', 'Misleading-Input Test', 5, 70, 'The owner signs off in class.'),
      ],
    },
  },
  {
    week: 6,
    title: 'Delegate an Outcome',
    question: 'What work can leave the owner’s desk without lowering standards?',
    why: [
      'A task that says “handle this” doesn’t define quality or who decides.',
      'AI can draft the work. A person still owns the result and knows when to escalate.',
    ],
    owner: 'Define the outcome, the boundaries and the acceptance standard. Then accept or return the first cycle against the checklist.',
    operator: 'Run it, or hand it to the team member who now owns it. Check the draft and submit it through your existing approval process.',
    time: WEEK_TIME,
    skills: [
      { title: 'Team Playbook Builder', route: '/team-playbook-builder', role: 'flagship', use: 'Turns your SOPs into a playbook. This week you pull one responsibility card from it.' },
      { title: 'Inbox and Meeting Follow-Through', route: '/inbox-meeting-follow-through', role: 'supporting', use: 'The drafting engine for the delegated deliverable.' },
      { title: 'Task Sync Starter Kit', route: '/task-sync-starter', role: 'supporting', use: 'Carries approved work into the task system you already use.' },
    ],
    setup: [
      { text: 'Open Team Playbook Builder and follow its guided setup to the end.', route: '/team-playbook-builder' },
      { text: 'Pick one recurring deliverable stuck with the owner. A weekly internal update, a meeting follow-up or a recruiting interview summary all work.' },
      { text: 'Write its responsibility card from the playbook: the outcome, the boundaries, the acceptance standard and who approves it.' },
      { text: 'Open Inbox and Meeting Follow-Through to draft the first deliverable from approved inputs.', route: '/inbox-meeting-follow-through' },
      { text: 'Carry the approved work into your task system with Task Sync Starter Kit.', route: '/task-sync-starter' },
      { text: 'Run the three tests, then have the owner accept or return the draft against the checklist.' },
    ],
    liveBuild: {
      sessionId: buildSessionId(6),
      agenda: LIVE_BUILD_AGENDA,
      lesson: 'Delegate the deliverable, not just the task. A spec names the audience, the evidence it needs, what it must leave out, the deadline and who approves it.',
      exercise: 'Compare “prepare our team update” with a spec that names the audience, the required evidence, the prohibited information, the deadline and the approval authority.',
      required: 'One responsibility card from your playbook and one tested first draft, with an explicit review checklist.',
      advanced: 'Write a second card for a different deliverable and have someone else run it.',
      ownerApproval: OWNER_APPROVAL,
      workingAtEnd: ['A responsibility card.', 'A tested first draft.', 'An explicit review checklist.'],
    },
    officeHours: officeHours(6, 'Team Playbook Builder Office Hours'),
    homework: {
      byWeekEnd: [
        'The new owner completes one real cycle, and the business owner accepts or returns it against the checklist.',
        'Review and correction time recorded, not just drafting time.',
      ],
      assignment: [
        'Repeat the delegated workflow and run the first agent pilot task.',
        'Collect a before-and-after example and ask what supervision was still needed.',
        'If owner review time just moved from drafting to correcting, don’t call it saved.',
      ],
      acceptance: [
        'Someone other than the instructor can run it.',
        'Authority is clear.',
        'Sensitive information is left out.',
        'Sending or publishing still needs approval.',
      ],
      useEvidence: 'One recurring deliverable completed and accepted by its new owner.',
    },
    media: ['[VIDEO: week 6 Team Playbook Builder demo, to be recorded]', '[VIDEO: week 6 live build replay, posts after the session]'],
    materials: ['A responsibility card template: outcome, boundaries, acceptance standard, approval authority'],
    module: {
      icon: 'briefcase',
      platform: 'Claude',
      runLabel: 'Run on One Deliverable',
      outcome: 'One recurring deliverable off the owner’s desk, with a responsibility card and a review checklist.',
      outputs: ['A responsibility card from your playbook', 'A tested first draft and a review checklist', 'One real cycle accepted by the owner'],
      checklist: [
        S('Open Team Playbook Builder and finish its guided setup', 'Set Up Team Playbook Builder', 15, 35, 'The prompts stay on its Library page.'),
        S('Write one responsibility card: outcome, boundaries, acceptance standard, approval authority', 'Write the Card', 10, 42, ''),
        S('Draft the first deliverable with Inbox and Meeting Follow-Through', 'Draft the Deliverable', 5, 52, ''),
        S('Test the card on one real deliverable', 'Normal Test', 5, 60, ''),
        S('Test a missing input and check the draft flags it', 'Missing-Input Test', 5, 65, ''),
        S('Test a request that includes information it must leave out, then have the owner accept or return the draft', 'Misleading-Input Test', 5, 70, 'The owner signs off in class.'),
      ],
    },
  },
  {
    week: 7,
    title: 'Make the Workflow Repeatable',
    question: 'Can our operator adapt and run the next workflow without the instructor?',
    why: [
      'This is how you scale what feels unscalable: write down how your team brings someone up to standard, and keep the human coaching and decisions.',
      'It’s also the independence test. Your team should be able to explain it, test it and fix it without us.',
    ],
    owner: 'Supply the approved role, standards and resources. Review the plan and assign every checkpoint to a real person.',
    operator: 'Adapt the supplied plan, run the three tests, write the runbook and hand it to a second person to rerun.',
    time: WEEK_TIME,
    skills: [
      { title: 'New Agent Onboarding Plan', route: '/new-agent-onboarding-plan', role: 'flagship', use: 'A new agent’s first 30 days around your standards, responsibilities and checkpoints.' },
      { title: 'Team Playbook Builder', route: '/team-playbook-builder', role: 'supporting', use: 'The standards the plan is built on, from Week 6.' },
      { title: 'Recruiting Prep', route: '/recruiting-prep', role: 'alternative', use: 'Recruiting but not onboarding? Use this instead, with the same three tests.' },
    ],
    setup: [
      { text: 'Open New Agent Onboarding Plan and follow its guided setup to the end.', route: '/new-agent-onboarding-plan' },
      { text: 'Recruiting but not onboarding right now? Open Recruiting Prep instead. Same tests, same standard.', route: '/recruiting-prep' },
      { text: 'Bring in your standards and responsibilities from your Week 6 playbook.', route: '/team-playbook-builder' },
      { text: 'Make the first 30 days useful before you add detail to days 60 and 90.' },
      { text: 'Run the three tests and show how it fails safely.' },
      { text: 'Write the runbook: the trigger, the data it needs, where people decide and how to repair it.' },
    ],
    liveBuild: {
      sessionId: buildSessionId(7),
      agenda: LIVE_BUILD_AGENDA,
      lesson: 'A versioned skill you can explain, test and repair is worth more than a clever one you can’t.',
      exercise: 'In pairs, adapt the supplied package without a click-by-click walkthrough, swap redacted tests and explain one correction. Advanced? Write a new component. Nobody faces a blank-page exam.',
      required: 'A versioned skill with three passing tests: normal inputs, missing inputs and a misleading or conflicting input.',
      advanced: 'Write one new component for the package and test it the same way.',
      ownerApproval: OWNER_APPROVAL,
      workingAtEnd: ['A versioned skill.', 'Three tests: normal, missing and misleading or conflicting inputs.', 'A safe failure you can show.'],
    },
    officeHours: officeHours(7, 'New Agent Onboarding Plan Office Hours'),
    homework: {
      byWeekEnd: [
        'A second person follows the runbook and gets an acceptable result.',
        'No new hire or recruit right now? Call it “tested and ready,” not “adopted” or “saving time.”',
      ],
      assignment: [
        'Finish the two-agent pilot and gather the real output and how much supervision it took.',
        'Get your Week 8 review ready.',
        'Recruiting: keep outreach in draft, and keep candidate decisions with people, against consistent job-related criteria.',
      ],
      acceptance: ['Your team can explain the trigger, the data it needs, where people decide and how to repair it, without the instructor taking over.'],
      useEvidence: 'A configured skill, its tests, a teach-back and the handoff.',
    },
    media: ['[VIDEO: week 7 New Agent Onboarding Plan demo, to be recorded]', '[VIDEO: week 7 live build replay, posts after the session]'],
    materials: ['A runbook template: trigger, required data, judgment points, repair steps'],
    module: {
      icon: 'userPlus',
      platform: 'Your AI workspace',
      runLabel: 'Run on a New Hire',
      outcome: 'A versioned onboarding skill your operator can explain, test and repair without the instructor.',
      outputs: ['A versioned skill with three passing tests', 'A runbook a second person can follow', 'A handoff, or “tested and ready” if there’s no hire yet'],
      checklist: [
        S('Open New Agent Onboarding Plan and finish its guided setup', 'Set Up the Onboarding Plan', 15, 35, 'Recruiting instead? Use Recruiting Prep.'),
        S('Adapt it to your standards and the first 30 days', 'Adapt the First 30 Days', 10, 42, ''),
        S('Write the runbook: trigger, required data, judgment points, repair steps', 'Write the Runbook', 5, 52, ''),
        S('Test normal inputs for one role', 'Normal Test', 5, 60, ''),
        S('Test missing inputs and check it fails safely', 'Missing-Input Test', 5, 65, ''),
        S('Test a misleading or conflicting input, then have a second person rerun it', 'Misleading-Input Test', 5, 70, 'The owner signs off in class.'),
      ],
    },
  },
  {
    week: 8,
    title: 'Sustain and Expand',
    question: 'What stays, what stops, and what should agents adopt next?',
    why: [
      'This week keeps the work from fading once the cohort ends.',
      'It’s also where you decide what not to scale. That’s just as useful.',
    ],
    owner: 'Make the keep, fix or retire call on each workflow, sign the 90-day plan and make a real go or no-go on agent rollout.',
    operator: 'Gather the logs and outputs from Weeks 1 to 7, rerun the Week 1 numbers on the same definitions and assemble the review.',
    time: WEEK_TIME,
    skills: [
      { title: 'Lead-Source ROI', route: '/lead-source-roi', role: 'supporting', use: 'Rerun on the same definitions as your Week 1 baseline.' },
      { title: 'FUB Pipeline Review', route: '/fub-pipeline-review', role: 'supporting', use: 'Rerun to see which exceptions stayed fixed.' },
    ],
    setup: [
      { text: 'Gather your run logs and outputs from Weeks 1 to 7.' },
      { text: 'Rerun Lead-Source ROI on the same definitions as your Week 1 baseline. Flag anything provisional.', route: '/lead-source-roi' },
      { text: 'Rerun FUB Pipeline Review and compare it with Week 4.', route: '/fub-pipeline-review' },
      { text: 'Fill in the keep, fix or retire worksheet for each workflow.' },
      { text: 'Fill in the agent go or no-go worksheet from your pilot evidence.' },
      { text: 'Draft the 90-day plan with owners, dates and measures.' },
    ],
    liveBuild: {
      sessionId: buildSessionId(8),
      agenda: WEEK8_AGENDA,
      lesson: 'A cohort-end review, not a quarter end. Which routines got used, which outputs got accepted, what changed, what broke and what’s still unproven.',
      exercise: 'Label every benefit claim measured, estimated or unverified. A lower cost per lead isn’t automatically a win, and a higher one can just mean you can finally see it.',
      required: 'An evidence-backed scorecard, a keep, fix or retire call for each workflow, and a 90-day plan with owners, dates and measures.',
      advanced: 'Teach one workflow back to the group and take its repair questions.',
      ownerApproval: 'The owner signs the 90-day plan and makes the agent rollout call in class.',
      workingAtEnd: [
        'A concise, evidence-backed scorecard.',
        'A keep, fix or retire decision for each workflow.',
        'A 90-day plan with owners, dates and measures.',
      ],
    },
    officeHours: officeHours(8, 'Cohort-End Review Office Hours', 'The last office hour. Bring your open evidence questions and anything that broke during the review.'),
    homework: {
      byWeekEnd: [
        'Final corrections done.',
        'Skills and runbooks handed off.',
        'Support boundaries understood.',
        'Your first post-cohort operating review on the calendar.',
      ],
      assignment: ['Commit to the next four weekly reviews.'],
      acceptance: [
        'Every benefit claim is labeled measured, estimated or unverified.',
        'The maintainer can run the core workflows.',
        'Agent rollout has a real go or no-go decision.',
      ],
      useEvidence: 'An evidence-backed review, maintained core workflows and a rollout decision.',
    },
    media: ['[VIDEO: week 8 cohort-end review walkthrough, to be recorded]', '[VIDEO: week 8 live build replay, posts after the session]'],
    materials: ['The keep, fix or retire worksheet', 'The 90-day plan worksheet', 'The agent go or no-go worksheet'],
    module: {
      icon: 'trend',
      platform: 'Your Week 1 to 7 skills',
      runLabel: 'Run on Your Logs',
      outcome: 'A cohort-end review: what stays, what stops, and a 90-day plan your team runs without us.',
      outputs: ['An evidence-backed scorecard', 'Keep, fix or retire for each workflow', 'A 90-day plan and an agent go or no-go'],
      checklist: [
        S('Gather your run logs and outputs from Weeks 1 to 7', 'Gather Your Logs', 10, 10, ''),
        S('Rerun Lead-Source ROI and FUB Pipeline Review on your Week 1 definitions', 'Rerun the Numbers', 10, 15, 'Same definitions, or the comparison isn’t fair.'),
        S('Fill in keep, fix or retire for each workflow', 'Keep, Fix or Retire', 10, 30, ''),
        S('Label every benefit claim measured, estimated or unverified', 'Label the Claims', 5, 45, ''),
        S('Make the agent rollout call: go or no-go', 'Decide on Rollout', 5, 75, ''),
        S('Have the owner sign the 90-day plan and the next four weekly reviews', 'Commit to 90 Days', 5, 85, 'The owner signs off in class.'),
      ],
    },
  },
];

/** The pilot questions owners answer in Week 8. */
export const PILOT_QUESTIONS: readonly { label: string; text: string }[] = [
  { label: 'Usefulness', text: 'Did the workflow improve a task that matters?' },
  { label: 'Adoption', text: 'Did agents use it when the task came up, without being chased?' },
  { label: 'Quality', text: 'What still needed correcting or coaching?' },
  { label: 'Readiness', text: 'Do we have a sponsor, a maintainer and time to practice?' },
  { label: 'Next Step', text: 'Expand it, fix the pilot or stop?' },
];

/** The course's front page. */
export const COURSE_INTRO = {
  title: 'Amplified AI Accelerator',
  sub: 'Eight weeks of installing finished, real estate workflows in your own business, with your operator beside you.',
  how: [
    'Every week has one operating question, one flagship skill from the Library and one required output.',
    'You get the finished skill ahead of time. Live building means setting it up, testing it and putting it to work.',
    '“Working at the end of class” and “implemented by week’s end” aren’t the same thing. We track both.',
    'The rest of the Library stays open the whole time. This week’s skills are just the ones in the spotlight.',
  ],
  roles: {
    owner: 'Comes to the build, makes the business decisions, approves one real run each week and protects a weekly operating review.',
    operator: 'Maintains the workflows: refreshes inputs, reruns outputs, finds failures and follows the repair steps. An owner can hold both roles, on purpose.',
  },
  scope: 'No private coaching calls, no custom integrations, no bookkeeping cleanup and no full database cleanup. Those are outside the program.',
  support: `Questions? Write to ${ACCELERATOR_SUPPORT_EMAIL}.`,
  instructor: ACCELERATOR_INSTRUCTOR,
  holiday: 'Holiday break: no sessions on Dec 23 or Dec 30. No new build until Jan 6.',
  /**
   * How a learner joins a live session: from the portal's Sessions page, whose Join opens 15 minutes
   * before (the join route's window, `JOIN_WINDOW_SHUT`). Never a Zoom URL here: staff set it on the
   * session, and only the join route hands it out, inside that window.
   */
  join: { label: 'Join in Sessions', note: 'opens 15 min before', path: '/sessions' },
} as const;

// --- the portal's AI Employees -----------------------------------------------------------------------

const ids6 = (steps: readonly Omit<Step, 'id'>[]): Step[] => steps.map((s, i) => ({ id: `c${i + 1}`, ...s }));

/**
 * The course as the portal's nine AI Employees: Week 0 (self-paced) and Weeks 1 to 8, each tied to its
 * Wednesday build. The `AIEmployee` shape and its six-step checklist are kept as they are. Every
 * field that describes a recording is empty until one exists: no transcript, no `dur`, no replay.
 *
 * `prompt` is not a prompt. The copy-to-clipboard prompts stay in the Library skill, so the portal's
 * prompt panel points there, and `files` is empty: there is no course prompt pack. Team tier, because
 * every Accelerator buyer's account is; who may open the course at all is `acceleratorOpen`.
 */
export function acceleratorModules(instructor: string = ACCELERATOR_INSTRUCTOR): AIEmployee[] {
  return ACCELERATOR_WEEKS_CONTENT.map((w): AIEmployee => {
    const checklist = ids6(w.module.checklist);
    // Week 8 has no flagship of its own: it reruns earlier weeks' skills, so it points at those.
    const flagships = w.skills.some((s) => s.role === 'flagship') ? w.skills.filter((s) => s.role === 'flagship') : w.skills;
    const lines = [
      `# Week ${w.week} · ${w.title}`,
      'The prompts for this week stay in the Library, not here.',
      'Open each guided setup and copy the prompts from there:',
      ...flagships.map((s) => `- ${s.title}: ${libraryHref(s.route)}`),
      '',
      `The full week is at ${coursePath(w.week)}.`,
    ];
    return {
      id: acceleratorModuleId(w.week),
      name: `Week ${w.week} · ${w.title}`,
      short: `Week ${w.week}`,
      tier: 'team',
      icon: w.module.icon,
      forWho: 'team owners and their operators',
      headline: w.question,
      outcome: w.module.outcome,
      outputs: [...w.module.outputs],
      platform: w.module.platform,
      runLabel: w.module.runLabel,
      build: checklist.reduce((a, s) => a + s.mins, 0),
      session: w.week === 0 ? null : w.week,
      status: 'published',
      opens: null,
      order: w.week + 1,
      dur: 0,
      instructor,
      transcript: [],
      notes: `${w.why.join(' ')} Owner: ${w.owner} Operator: ${w.operator} Time: owner ${w.time.owner.charAt(0).toLowerCase()}${w.time.owner.slice(1)} Operator ${w.time.operator.charAt(0).toLowerCase()}${w.time.operator.slice(1)} ${ESTIMATE_NOTE} The full week, with the live build, office hours, homework, evidence packet and rubric, is at ${coursePath(w.week)}.`,
      prompt: lines.join('\n'),
      files: [],
      resources: [],
      checklist,
    };
  });
}

/** The course, as `GET /api/course` sends it to a buyer whose plan opens it. */
export function courseContent() {
  return {
    intro: COURSE_INTRO,
    weeks: ACCELERATOR_WEEKS_CONTENT,
    shared: {
      liveBuildMins: BUILD_MINS,
      officeHoursMins: OFFICE_HOURS_MINS,
      officeHoursRules: OFFICE_HOURS_RULES,
      issueForm: ISSUE_FORM_FIELDS,
      evidence: EVIDENCE_PACKET,
      rubric: RUBRIC,
      rubricScale: RUBRIC_SCALE,
      rubricRules: RUBRIC_RULES,
      readiness: READINESS,
      paths: PATHS_IN_CLASS,
      missedAWeek: MISSED_A_WEEK,
      estimateNote: ESTIMATE_NOTE,
    },
    before: {
      intake: INTAKE_FIELDS,
      orientation: ORIENTATION,
      dataPack: DATA_PACK,
      practiceSetNote: PRACTICE_SET_NOTE,
      safeSharing: SAFE_SHARING,
      lanes: LANES,
    },
    after: {
      graduation: GRADUATION,
      graduationNote: GRADUATION_NOTE,
      paths: WEEK8_PATHS,
      noPaywall: NO_PAYWALL,
      pilotQuestions: PILOT_QUESTIONS,
    },
  };
}

export type CourseContent = ReturnType<typeof courseContent>;
