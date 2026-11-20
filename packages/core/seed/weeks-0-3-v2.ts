// SEED, NOT RUNTIME (D-176). Weeks 0 to 3 of the Amplified AI Accelerator as Connor's Nov 17, 2026 Build
// Spec writes them (`weeks-0-3.ts` in the learner build handoff), in the repo's own course shapes. A
// one-time, audited data step (`content-v2.ts`) puts them into a database whose Weeks 0 to 3 are still
// exactly as `accelerator-v1.ts` seeded them; from then on they are the builder's, like every other word
// of the course. Runtime code may not import this file.
//
// Every string is the spec's wording unless the handoff tagged it:
//   ADJUSTED  spec text changed only for Connor's Nov 17 calls (Week 0 due Mon, Nov 30, 12:00 PM MT;
//             Claude AND ChatGPT).
//   DRAFT     no spec text exists; the handoff wrote it.
// The tags stay on the lines below so the PM can find each one in the builder.
//
// Two Library pages the weeks name, /map-your-spend and /lead-source-review, are not built yet. The
// course page shows a skill whose page isn't in the Library as "Coming With Week 1" with no link (the
// `skill.coming` copy string), so nothing here links to a page that doesn't exist.
//
// Pure: no clock, no random source.

import { ACCELERATOR_COHORT_ID, LIBRARY_ORIGIN, acceleratorModuleId, buildSessionId } from '../src/accelerator';
import type { AgendaItem, CourseWeek, ModuleCourse, PlaybookCard, SeatCard } from '../src/course-types';
import { courseWithoutRetired } from '../src/course-retired';
import { courseGuideUrl } from '../src/skill-guides';
import type { AIEmployee, Session, Step } from '../src/types';
import { ACCELERATOR_INSTRUCTOR, OFFICE_HOURS_FORMAT, OFFICE_HOURS_MINS, OWNER_APPROVAL, WEEK_TIME, weekModule } from './accelerator-v1';

// --- the loop every week runs (spec, "What Every Week Contains") -------------------------------------

/** The spec's run-of-show for Weeks 1 to 3. Replaces LIVE_BUILD_AGENDA there; Weeks 4 to 8 keep theirs. */
export const HIRE_LOOP_AGENDA: readonly AgendaItem[] = [
  { from: 0, to: 10, activity: 'The question', why: 'The owner question, the number and why it matters this month.' },
  { from: 10, to: 50, activity: 'Live reads', why: 'Connor reads three or four member reports against his standard: the number, the question he’d ask, the play.' },
  { from: 50, to: 80, activity: 'Hire lab', why: 'Everyone builds the seat together: scheduled task, prompt, guardrail check, first run.' },
  { from: 80, to: 90, activity: 'Commit', why: 'Each team names the task the hire takes over and who it reports to.' },
];

/** The spec's checkpoint, before the next build: Weeks 1 to 3's `homework.acceptance`. */
export const CHECKPOINT: readonly string[] = ['The signed seat card.', 'A screenshot of the first run.', 'The minutes the hire took over.'];

export const BEFORE_THE_BUILD =
  'By Tuesday night, the operator runs the week’s skill on the team’s own data and the owner reads it. Teams that want a live read submit their report in the LMS.';

// --- Week 0's spec pieces -----------------------------------------------------------------------------

export interface Week0Step {
  n: number;
  step: string;
  who: string;
  time: string;
  doneWhen: string;
}

export const WEEK0_STEPS: readonly Week0Step[] = [
  { n: 1, step: 'Fill In Your Intake and Name Your Operator', who: 'Owner', time: '10 min', doneWhen: 'Intake in, operator invited, stack card sent back' },
  { n: 2, step: 'Watch the Orientation', who: 'Owner and operator', time: '30 min', doneWhen: 'Both know how a week runs and what a hire is' },
  { n: 3, step: 'Start Your Time Baseline', who: 'Owner', time: '20 min, over two weeks', doneWhen: 'Six tasks timed per occurrence, or marked not done today' },
  // ADJUSTED: spec "Get Claude Ready".
  { n: 4, step: 'Get Your AI Ready', who: 'Operator', time: '20 min', doneWhen: 'Paid plan, training off, skills on, both cohort skills pass their self-test, on the Claude Path or the ChatGPT Path' },
  { n: 5, step: 'Set Up Your AI Brain', who: 'Each of you', time: '30 min', doneWhen: 'A new chat knows the business, and About My Business is in the AI Office' },
  { n: 6, step: 'Connect Your Data', who: 'Operator', time: '25 min', doneWhen: 'Each green source answers a test question; each yellow source’s export is in the inbox' },
  // ADJUSTED: "on your platform" added; ChatGPT per-tool blocking is Test B.
  { n: 7, step: 'Lock the Guardrails', who: 'Operator', time: '10 min', doneWhen: 'Every write tool Blocked except drafts and AI Office saves, on your platform' },
  { n: 8, step: 'Run the Ready Check and Your Test Hire', who: 'Operator', time: '20 min, plus a next-morning check', doneWhen: 'Ready Check is green and the test hire ran with nobody there' },
];

/** Step 4's two paths. ADJUSTED: the ChatGPT Path. */
export const GET_YOUR_AI_READY = {
  claude: ['A paid Claude plan', 'Training off', 'Skills on', 'Both cohort skills uploaded and passing their self-test'],
  chatgpt: [
    'A paid ChatGPT plan',
    'Training off (Improve the model for everyone, in Data Controls)',
    'Skills on, or the cohort GPT if your plan has no skills (Test A)',
    'Both cohort skills uploaded and passing their self-test (Test A)',
  ],
} as const;

/** Step 6's stack card: green is hands-off, yellow is an export drop. */
export const STACK_CARD: readonly { source: string; green: string; yellow: string }[] = [
  { source: 'Books', green: 'QuickBooks Online connector', yellow: 'Ledger or P&L export into the inbox each month' },
  { source: 'Closings and production', green: 'Sisu connector', yellow: 'Closings export with GCI into the inbox' },
  { source: 'Leads and follow-up', green: 'Sisu, only if test 5 passes', yellow: 'The CRM’s speed-to-lead report, weekly' },
  { source: 'Email, calendar, files', green: 'Google connectors', yellow: 'Not on Google: flag at intake, because drafts and the AI Office folder need another path' },
];
/** ADJUSTED: the handoff's note for the stack card on the ChatGPT Path. */
export const STACK_CARD_CHATGPT_NOTE = 'On the ChatGPT Path, QuickBooks (Test 4C) and Sisu (Test 5C) are green only once tested.';

/** Step 3's six tasks, in each hire's "Took Over" words. */
export const SIX_TASK_BASELINE: readonly { n: number; task: string; hire: string; week: string }[] = [
  { n: 1, task: 'Getting last month’s numbers in front of the owner', hire: 'Finance Analyst', week: '1 and 3' },
  { n: 2, task: 'Checking who worked which new leads', hire: 'Lead Desk Monitor', week: '2' },
  { n: 3, task: 'Prepping a recruiting appointment and writing the week’s pipeline follow-ups', hire: 'Recruiting Coordinator', week: '4' },
  { n: 4, task: 'Checking a week of new-agent progress', hire: 'Onboarding Coordinator', week: '5' },
  { n: 5, task: 'Prepping one 1:1', hire: '1:1 Prep', week: '6' },
  { n: 6, task: 'Building one scorecard and writing one recap', hire: 'Meeting Manager', week: '7' },
];

// --- the spec's cards ---------------------------------------------------------------------------------

interface SpecCard {
  week: 0 | 1 | 2 | 3;
  title: string;
  promise: string;
  question: string;
  why: string[];
  owner: string;
  operator: string;
  flagship: string;
  tools: string[];
  outputs: [string, string, string];
  steps: string[];
  build: string | null;
  oh: string | null;
}

const SPEC_CARDS: readonly SpecCard[] = [
  {
    week: 0,
    title: 'Foundations: Set Up the Office',
    promise:
      'Get to the same starting line as every team, with your AI set up, your data connected, write tools blocked, a test hire that ran on its own and your six-task baseline started.', // DRAFT from the spec intro
    question: 'Is our office ready for its first hire?', // DRAFT
    why: [
      'Every team starts Week 1 on the same setup, so the live builds go to hiring, not troubleshooting.', // DRAFT from the intro
      'The hires will be measured against the time you record now.', // DRAFT
    ],
    owner: 'Fill in your intake, name your operator, watch the orientation, start your time baseline and set up your AI Brain.', // DRAFT from step owners
    operator: 'Get your AI ready, set up your AI Brain, connect your data, lock the guardrails, and run the Ready Check and your test hire.', // DRAFT from step owners
    flagship: 'Foundations', // DRAFT
    tools: ['Claude or ChatGPT', 'QuickBooks Online', 'Sisu', 'Google'], // ADJUSTED
    outputs: [
      'Your Ready Check green, and your test hire ran with nobody there', // DRAFT from Done When
      'Every write tool blocked except drafts and AI Office saves', // DRAFT from Done When
      'Your six-task baseline started, timed per occurrence', // DRAFT from Done When
    ],
    steps: WEEK0_STEPS.map((s) => s.step),
    build: null,
    oh: null, // Week 0 Setup Session: Connor to set
  },
  {
    week: 1,
    title: 'Where the Money Goes',
    promise: 'See every dollar of GCI on one chart, and what each gap costs you a year.',
    question: 'Where does our money go, and is it the right amount?',
    why: [
      'Your books grew one account at a time, so you’ve never seen your spend sorted the same way twice.',
      'One chart, one standard and every gap in dollars is how you know what to fix first.',
    ],
    owner: 'Answer the flags, confirm the map and pick the one gap you’ll act on this month.',
    operator: 'Pull twelve months of books and closings, run Map Your Spend and save the team file to the AI Office.',
    flagship: 'Map Your Spend',
    tools: ['Claude or ChatGPT', 'QuickBooks Online', 'Sisu'], // ADJUSTED
    outputs: ['Your Map Your Spend report on the Standard Chart', 'A confirmed map, saved as your team file', 'The Finance Analyst’s seat card, signed'],
    steps: [
      'Run Map Your Spend on the last 12 full months',
      'Answer every flag and confirm the totals by bucket',
      'Read your six lines: on, watch or off, and the gaps in dollars',
      'Submit your report for a live read, or bring one question',
      'Save the team file to AI Office / Map Your Spend',
      'Fill in the Finance Analyst’s seat card and have the owner sign it',
    ],
    build: 'Map Your Spend Live Build',
    oh: 'Map Your Spend Office Hours',
  },
  {
    week: 2,
    title: 'Leads That Pay',
    promise: 'Know which lead sources pay you back, and catch every new lead that isn’t worked to standard.',
    question: 'Which lead sources pay, and is every lead worked?',
    why: [
      'Most teams judge a source by its GCI. The real question is what it returns on company dollar, after splits and fees.',
      'A good source still fails when new leads wait, so the review and the daily check belong together.',
    ],
    owner: 'Make the fix, hold or scale call on each paid source, and decide who gets the misses list.',
    operator: 'Run Lead Source Review, save its team file and set up the Lead Desk Monitor.',
    flagship: 'Lead Source Review',
    tools: ['Claude or ChatGPT', 'Sisu', 'Your CRM’s reports'], // ADJUSTED
    outputs: ['Your Lead Source Review report', 'Your lead source team file, saved for next quarter', 'The Lead Desk Monitor running, with its first misses list'],
    steps: [
      'Run Lead Source Review on the last 12 months of closings by source',
      'Answer the flagged labels and confirm the bucket table',
      'Read the six tests, cost per closing and speed to lead',
      'Submit your report for a live read, or bring one question',
      'Schedule the Lead Desk Monitor and name who it reports to',
      'Check its first misses list against what you know',
    ],
    build: 'Lead Source Review Live Build',
    oh: 'Lead Source Review Office Hours',
  },
  {
    week: 3,
    title: 'Numbers on the 5th',
    promise: 'Get last month’s numbers against your standard every month, without anyone building a spreadsheet.',
    question: 'What did we make last month, and what do I do about it?',
    why: [
      'The baseline told you where you stand. The monthly run tells you what moved while it’s still fixable.',
      'It ends on one decision, so your leadership meeting starts with the call, not the digging.',
    ],
    owner: 'Read the monthly report with your leadership team, make the one decision it asks, and check it next month.',
    operator: 'Schedule the Finance Analyst, confirm it reaches the team file and last month’s books, and rerun it after a late close.',
    flagship: 'Map Your Spend, monthly run',
    tools: ['Claude or ChatGPT scheduled tasks', 'QuickBooks Online', 'Sisu'], // ADJUSTED
    outputs: ['November’s monthly report, with what moved and the one decision', 'The Finance Analyst on a schedule', 'Its seat card, signed, with the minutes it takes over'],
    steps: [
      'Confirm November’s books are closed (use October if not)',
      'Run the monthly run for November from your team file',
      'Read what moved more than 2 points, and the one decision',
      'Schedule the Finance Analyst with the cohort prompt for Claude or ChatGPT', // ADJUSTED
      'Run it once on demand and check it saved the report and the team file',
      'Have the owner sign the seat card',
    ],
    build: 'Monthly Numbers Live Build',
    oh: 'Monthly Numbers Office Hours',
  },
];

// --- playbooks and seat cards (spec) ------------------------------------------------------------------

/** The spec's playbooks. None is signed off yet; Weeks 1 and 2's questions are for Connor to confirm. */
export const PLAYBOOKS: Readonly<Record<1 | 2 | 3, PlaybookCard>> = {
  1: {
    name: 'The Standard Chart',
    number:
      'Company dollar at least 50% of GCI. Advertising at most 5%. Staffing about 10%. All other operating cost about 5%. Total operating cost at most 20%. Net operating income at least 30%, after the leader is paid a commission.',
    question: 'What do you pay yourself for the deals you close, before you call the rest profit?',
    play: 'The standard’s first moves. Fix splits and lead cost before you cut people. Staffing over 10%: give the repeat work to an AI Employee or a VA. Advertising over 5%: pull cost per closing by source first, which is Week 2. All other cost over 5%: audit software and occupancy.',
    signedOff: false,
  },
  2: {
    name: 'The Lead Source Standard',
    number:
      'Sphere at least 40% of closings, with a ceiling by stage (70% rainmaker, 60% hybrid, 50% leader-led). No other bucket over half of closings, and no single outside company over a quarter. Return on company dollar under 150% is below the floor, 300% is good, 900% is excellent. A human call or text within 5 minutes of an online inquiry, and 8 call attempts in the first week.',
    question: 'How much of your business depends on one company, and what does that company keep?',
    play: 'At the final read, below the floor means fix it or cut it, fair means hold, good or better means scale. A paid source with slow follow-up has a follow-up problem before it has a price problem.',
    signedOff: false,
  },
  3: {
    name: 'The Standard Chart, monthly',
    number: 'The same six lines, judged on the trailing 12 months. A line that moves more than 2 points from the month before is the early warning.',
    question: 'The one decision the run writes about the month’s biggest move, in the skill’s words: is that a one-month swing, or a change to act on now?',
    play: 'It drafts, the owner decides. Read it with the leadership team, pick one gap, make one decision and check it next month.',
    signedOff: false,
  },
};

export const SEAT_CARDS: Readonly<Record<1 | 2 | 3, SeatCard>> = {
  1: {
    seat: 'Finance Analyst, onboarding',
    reportsTo: 'Owner',
    runs: 'Once this week, with the operator; goes on a schedule in Week 3.',
    pulls:
      'A 12-month ledger or transaction detail export, plus closings from Sisu or an export. Connected teams still export the ledger once, because the QuickBooks connector’s P&L looks to come back by account, not by vendor (test 4).',
    applies: 'The Standard Chart and its three rules: revenue booked gross, the leader paid a commission, every expense in one home.',
    produces: 'The baseline report and team-file.json, saved to AI Office / Map Your Spend.',
    tookOver: 'Baseline task 1, getting last month’s numbers in front of the owner. It starts doing that in Week 3.',
    cantDo: 'Change the books. It reads and never posts.',
  },
  2: {
    seat: 'Lead Desk Monitor',
    reportsTo: 'The team lead, or whoever owns the lead desk.',
    runs: 'Weekdays at 7:00 AM MT for connected teams; Mondays for export teams.',
    pulls:
      'New leads with their first touch and call attempts: from Sisu if test 5 passes, otherwise from the CRM’s speed-to-lead report dropped in AI Office / Lead Desk / inbox.',
    applies: 'The speed-to-lead standard: a human within 5 minutes, 8 call attempts in week one, referrals within the hour, after-hours leads by 9 the next morning.',
    produces: 'A misses list as a Gmail draft to the team lead: each lead by CRM link or ID (never a client name), source, agent, minutes to first touch, attempts so far.',
    tookOver: 'Baseline task 2, checking who worked which new leads. If nobody does it today, the gain is coverage, and the seat card says so.',
    cantDo: 'Call, text, reassign or update a lead.',
  },
  3: {
    seat: 'Finance Analyst, on the clock',
    reportsTo: 'Owner',
    // ADJUSTED: ChatGPT clause added.
    runs: 'Monthly, after the books close. On Claude, the schedule picker offers hourly, daily, weekly, weekdays or manual, so ask Create with Claude for the 5th of each month (test 6). On ChatGPT, ask ChatGPT in the chat to schedule it for the 5th of each month at 6:00 AM MT and check it in Scheduled (test 6, Test C). If it can’t, run weekly on Mondays at 6:00 AM MT with the guard line in the prompt.',
    pulls: 'Last month from QuickBooks and Sisu, or last month’s exports in AI Office / Map Your Spend / inbox.',
    applies: 'The confirmed map in team-file.json and the Standard Chart.',
    produces: 'The monthly report in AI Office / Map Your Spend / reports, the updated team file, and a Gmail draft to the owner with the four-line summary.',
    tookOver: 'Baseline task 1, getting last month’s numbers in front of the owner.',
    cantDo: 'Change the books, or fill a missing month with guesses. It says what’s missing and stops.',
  },
};

export const FINANCE_ANALYST_PROMPT = {
  /** Spec, verbatim. */
  claude: [
    'Run the Map Your Spend monthly run for [team name]. Use the map-your-spend skill and follow references/monthly.md.',
    'First: if today is before the 5th, or last month’s report is already in AI Office / Map Your Spend / reports, reply "Nothing to run" and stop.',
    'The team file is AI Office / Map Your Spend / team-file.json. Pull last month from QuickBooks and Sisu [export teams: last month’s files are in AI Office / Map Your Spend / inbox].',
    'Map last month, score it with --month for last month, build the report, and save the report and the updated team file back to the folder.',
    'Save a Gmail draft to [owner email] with the headline, what moved more than 2 points, anything new that needs a home, and the one decision.',
    'If last month’s files are missing, say what is missing in the draft and stop. Read only. Never change the books. Never send.',
  ].join('\n'),
  /** ADJUSTED from the spec prompt. Depends on Tests A, C, D, E and 4C. */
  chatgpt: [
    'Run the Map Your Spend monthly run for [team name]. Use the @map-your-spend skill and follow references/monthly.md.',
    'First: if today is before the 5th, or last month’s report is already in AI Office / Map Your Spend / reports in Google Drive, reply "Nothing to run" and stop.',
    'The team file is AI Office / Map Your Spend / team-file.json in Google Drive. Pull last month from QuickBooks and Sisu [export teams, or if either isn’t connected in ChatGPT: last month’s files are in AI Office / Map Your Spend / inbox].',
    'Map last month, score it with --month for last month, build the report, and save the report and the updated team file back to the folder.',
    'Save a Gmail draft to [owner email] with the headline, what moved more than 2 points, anything new that needs a home, and the one decision.',
    'If last month’s files are missing, say what is missing in the draft and stop. Read only. Never change the books. Never send.',
  ].join('\n'),
} as const;

// --- the sessions -------------------------------------------------------------------------------------

/**
 * Week 2 and Week 3's office hours (Connor, Nov 17: "Move Week 2 and Week 3 office hours to Fri, Dec 11
 * and Fri, Dec 18, 12:00 to 1:00 PM MT"). The Thursday goal-planning sessions stay as they are, so these
 * are new rows in the office-hours series: the id ends `-oh<week>` (so `sessionWeek` reads the week off
 * it, as for every office hour) and `n` is 200 + week, which no module's `session` and no other
 * session's `n` uses.
 */
export const fridayOfficeHoursId = (week: number): string => `${ACCELERATOR_COHORT_ID}-fri-oh${week}`;
export const fridayOfficeHoursN = (week: number): number => 200 + week;

/** Noon, Mountain Time, on a winter day (MST, UTC-7). */
const noonMT = (day: string): number => Date.parse(`${day}T12:00:00-07:00`);

export function fridayOfficeHours(): Session[] {
  return [
    [2, '2026-12-11'],
    [3, '2026-12-18'],
  ].map(([week, day]) => ({
    id: fridayOfficeHoursId(week as number),
    cohortId: ACCELERATOR_COHORT_ID,
    n: fridayOfficeHoursN(week as number),
    title: SPEC_CARDS[week as number]!.oh!,
    start: noonMT(day as string),
    mins: OFFICE_HOURS_MINS,
    zoom: '',
    live: false,
    attended: null,
    replay: null,
    views: 0,
    kind: 'office_hours',
    moduleId: acceleratorModuleId(week as number),
  }));
}

/** The build titles Weeks 1 to 3 take (and Week 1's Thursday office hour, still on Thu, Dec 3). */
export const SESSION_TITLES_V2: Readonly<Record<string, string>> = {
  [buildSessionId(1)]: SPEC_CARDS[1]!.build!,
  [buildSessionId(2)]: SPEC_CARDS[2]!.build!,
  [buildSessionId(3)]: SPEC_CARDS[3]!.build!,
  [`${ACCELERATOR_COHORT_ID}-oh1`]: SPEC_CARDS[1]!.oh!,
};

// --- the weeks, in the repo's CourseWeek shape -------------------------------------------------------

/** The Library pages the weeks name that aren't built yet. The course page shows them unlinked. */
export const PENDING_LIBRARY_ROUTES: readonly string[] = ['/map-your-spend', '/lead-source-review'];

const OH_NOTE = 'Unstick setups and answer the week’s questions as a group.';
const card = (n: 0 | 1 | 2 | 3): SpecCard => SPEC_CARDS[n]!;

const S = (text: string, ch: string, mins: number, minute: number, hint = '', more: Partial<Step> = {}): Omit<Step, 'id'> => ({ text, ch, mins, t: minute * 60, hint, ...more });

const officeHours = (sessionId: string, title: string) => ({ sessionId, title, note: OH_NOTE, format: OFFICE_HOURS_FORMAT });

const list = (items: readonly string[]) => ({ type: 'list' as const, items: [...items] });

/** Week 0's step paths: step 3's baseline, step 4's two ways to get ready, step 6's stack card. */
function week0Paths(n: number): Step['paths'] | undefined {
  if (n === 3) {
    const table = { type: 'table' as const, head: ['#', 'Task', 'The hire that takes it over', 'Week'], rows: SIX_TASK_BASELINE.map((t) => [String(t.n), t.task, t.hire, t.week]) };
    return { claude: { blocks: [table] }, chatgpt: { blocks: [table] } };
  }
  if (n === 4) return { claude: { blocks: [list(GET_YOUR_AI_READY.claude)] }, chatgpt: { blocks: [list(GET_YOUR_AI_READY.chatgpt)] } };
  if (n === 6) {
    const table = { type: 'table' as const, head: ['Source', 'Green', 'Yellow'], rows: STACK_CARD.map((r) => [r.source, r.green, r.yellow]) };
    return { claude: { blocks: [table] }, chatgpt: { blocks: [table, { type: 'text', text: STACK_CARD_CHATGPT_NOTE }] } };
  }
  return undefined;
}

const outputs3 = (n: 0 | 1 | 2 | 3): [string, string, string] => [...card(n).outputs];

export const WEEKS_0_3: readonly CourseWeek[] = [
  {
    week: 0,
    // Connor to pick: Foundations (spec) or Get Ready (admin). Full spec title: "Foundations: Set Up the Office".
    title: 'Foundations',
    question: card(0).question,
    why: card(0).why,
    owner: card(0).owner,
    operator: card(0).operator,
    time: { owner: 'About 1 hr 30 min.', operator: 'About 2 hr 15 min.' }, // spec
    skills: [
      { title: 'AI Brain Setup', route: '/ai-brain-setup', role: 'flagship', use: 'Set Up Your AI Brain, on Claude or ChatGPT: a new chat knows the business.', free: true }, // use: DRAFT from step 5
      { title: 'Map Your Spend', route: '/map-your-spend', role: 'supporting', use: 'Cohort skill. Passes its self-test in Get Your AI Ready.' }, // use: DRAFT
      { title: 'Lead Source Review', route: '/lead-source-review', role: 'supporting', use: 'Cohort skill. Passes its self-test in Get Your AI Ready.' }, // use: DRAFT
    ],
    setup: WEEK0_STEPS.map((s) => ({ text: `${s.step}. ${s.doneWhen}.`, ...(s.n === 5 ? { route: '/ai-brain-setup' } : {}) })),
    liveBuild: null,
    officeHours: null, // Week 0 Setup Session: Connor to set a date
    homework: {
      byWeekEnd: WEEK0_STEPS.map((s) => `${s.doneWhen}.`),
      assignment: ['Keep timing the six tasks per occurrence until each has one, or mark it not done today.'], // DRAFT from step 3
      acceptance: ['Ready Check is green and the test hire ran with nobody there.', 'Every write tool Blocked except drafts and AI Office saves.'], // spec Done When lines
      useEvidence: 'Six tasks timed per occurrence, or marked not done today.', // spec
    },
    media: ['[VIDEO: orientation, to be recorded]', '[VIDEO: Claude Path setup, to be recorded]', '[VIDEO: ChatGPT Path setup, to be recorded]'], // ADJUSTED
    materials: ['The intake form and stack card', 'The two cohort skill files', 'The Ready Check prompt, for Claude and for ChatGPT', 'The test hire prompt, for Claude and for ChatGPT'], // spec kit, ADJUSTED
    module: {
      icon: 'listChecks',
      platform: 'Claude or ChatGPT', // ADJUSTED
      runLabel: 'Run the Ready Check', // DRAFT
      outcome: 'Every team at the same starting line by Mon, Nov 30.', // ADJUSTED from the spec intro
      outputs: outputs3(0),
      // Eight steps, the spec's. Times are the spec's; Who, Time and Done When ride on each step too.
      checklist: WEEK0_STEPS.map((s) => {
        const paths = week0Paths(s.n);
        const goal = s.n === 2
          ? 'The goal of this step is that both of you know how a week runs and what an AI hire is before we start building. Watch it together if you can.'
          : undefined;
        return S(s.doneWhen, s.step, parseInt(s.time, 10), 0, `${s.who}. ${s.time}.`, { who: s.who, timeLabel: s.time, doneWhen: s.doneWhen, ...(goal ? { goal } : {}), ...(paths ? { paths } : {}) });
      }),
    },
  },
  {
    week: 1,
    title: card(1).title,
    question: card(1).question,
    why: card(1).why,
    owner: card(1).owner,
    operator: card(1).operator,
    time: { ...WEEK_TIME }, // existing repo estimate; spec has none per week
    skills: [{ title: 'Map Your Spend', route: '/map-your-spend', role: 'flagship', use: 'Maps twelve months of books onto Connor’s Standard Chart.' }],
    setup: card(1).steps.map((text, i) => (i === 0 ? { text, route: '/map-your-spend' } : { text })),
    liveBuild: {
      sessionId: buildSessionId(1),
      agenda: [...HIRE_LOOP_AGENDA],
      lesson: 'The leader-commission restatement is usually where profit drops on screen, so Connor explains As Booked versus Restated once, early.',
      exercise: 'Live reads: three or four member reports against the Standard Chart.',
      required: 'The hire lab checks that team-file.json opens from the AI Office folder in a fresh chat, because Week 3’s schedule depends on it.',
      advanced: 'Use the What If sliders on the one gap you’ll act on.', // DRAFT
      ownerApproval: OWNER_APPROVAL,
      workingAtEnd: [...card(1).outputs],
    },
    officeHours: officeHours(`${ACCELERATOR_COHORT_ID}-oh1`, 'Map Your Spend Office Hours'),
    homework: {
      byWeekEnd: [...card(1).outputs],
      assignment: [BEFORE_THE_BUILD],
      acceptance: [...CHECKPOINT],
      useEvidence: 'The signed seat card, a screenshot of the first run and the minutes the hire took over.',
    },
    media: ['[VIDEO: week 1 pre-work lesson, 5 to 8 min, to be recorded]', '[VIDEO: week 1 live build replay, posts after the session]'],
    materials: [
      'Export guides: QuickBooks Online transaction detail, QuickBooks Desktop, Xero and “my bookkeeper has it”',
      'Reading Your Report: six lines, As Booked vs Restated, What If sliders, vendor flags',
      'A sample-team run using the skill’s own made-up team',
      'The Finance Analyst seat card, filled for the sample team, plus a blank',
    ],
    module: {
      icon: 'dollar',
      platform: 'Claude or ChatGPT', // ADJUSTED
      runLabel: 'Run on Your Books', // DRAFT
      outcome: card(1).promise,
      outputs: outputs3(1),
      // Step text is the spec's. Short labels (`ch`), minutes and class minute marks are DRAFT (same for Weeks 2 and 3).
      checklist: card(1).steps.map((t, i) =>
        S(t, ['Run Map Your Spend', 'Answer the Flags', 'Read Your Six Lines', 'Submit for a Live Read', 'Save the Team File', 'Sign the Seat Card'][i]!, [15, 15, 10, 5, 5, 10][i]!, [0, 0, 10, 10, 50, 80][i]!),
      ),
    },
  },
  {
    week: 2,
    title: card(2).title,
    question: card(2).question,
    why: card(2).why,
    owner: card(2).owner,
    operator: card(2).operator,
    time: { ...WEEK_TIME },
    skills: [{ title: 'Lead Source Review', route: '/lead-source-review', role: 'flagship', use: 'Grades each lead source against Connor’s Lead Source Standard.' }], // use: DRAFT
    setup: card(2).steps.map((text, i) => (i === 0 ? { text, route: '/lead-source-review' } : { text })),
    liveBuild: {
      sessionId: buildSessionId(2),
      agenda: [...HIRE_LOOP_AGENDA],
      lesson: 'The six tests, the return tiers, and first read versus final read.',
      exercise: 'Live reads: three or four member reports against the Lead Source Standard.',
      required: 'The Lead Desk Monitor scheduled, with its first misses list.',
      advanced: 'Make the fix, hold or scale call on every paid source.', // DRAFT
      ownerApproval: OWNER_APPROVAL,
      workingAtEnd: [...card(2).outputs],
    },
    officeHours: officeHours(fridayOfficeHoursId(2), 'Lead Source Review Office Hours'),
    homework: {
      byWeekEnd: [...card(2).outputs],
      assignment: [BEFORE_THE_BUILD],
      acceptance: [...CHECKPOINT],
      useEvidence: 'The signed seat card, a screenshot of the first run and the minutes the hire took over.',
    },
    media: ['[VIDEO: week 2 pre-work lesson, 5 to 8 min, to be recorded]', '[VIDEO: week 2 live build replay, posts after the session]'],
    materials: [
      'The TCPA callout from the standard, as written (a compliance flag, not legal advice)',
      'Speed-to-lead export guides for Follow Up Boss, KW Command, Brivity, GoHighLevel and others on the intake',
      'A one-pager on the six tests, the return tiers, and first read versus final read',
      'The Lead Desk Monitor seat card, filled for the sample team, plus a blank',
    ],
    module: {
      icon: 'filter',
      platform: 'Claude or ChatGPT', // ADJUSTED
      runLabel: 'Run on Your Closings', // DRAFT
      outcome: card(2).promise,
      outputs: outputs3(2),
      checklist: card(2).steps.map((t, i) =>
        S(t, ['Run Lead Source Review', 'Confirm the Buckets', 'Read the Six Tests', 'Submit for a Live Read', 'Schedule the Monitor', 'Check the Misses List'][i]!, [15, 10, 10, 5, 15, 5][i]!, [0, 0, 10, 10, 50, 80][i]!),
      ),
    },
  },
  {
    week: 3,
    title: card(3).title,
    question: card(3).question,
    why: card(3).why,
    owner: card(3).owner,
    operator: card(3).operator,
    time: { ...WEEK_TIME },
    skills: [{ title: 'Map Your Spend', route: '/map-your-spend', role: 'flagship', use: 'The monthly run: last month on the confirmed map, what moved and the one decision.' }],
    setup: card(3).steps.map((text, i) => (i === 1 ? { text, route: '/map-your-spend' } : { text })),
    liveBuild: {
      sessionId: buildSessionId(3),
      agenda: [...HIRE_LOOP_AGENDA],
      lesson: 'A line that moves more than 2 points from the month before is the early warning.',
      exercise: 'Run November live for one volunteer team, or on Utah Life’s books if none has closed.', // ADJUSTED (Connor)
      required: 'Everyone schedules the hire in the lab and runs it once on demand, so January’s unattended run isn’t its first.',
      advanced: 'Read the run with your leadership team before Jan 6.', // DRAFT
      ownerApproval: OWNER_APPROVAL,
      workingAtEnd: [...card(3).outputs],
    },
    officeHours: officeHours(fridayOfficeHoursId(3), 'Monthly Numbers Office Hours'),
    homework: {
      byWeekEnd: [...card(3).outputs],
      assignment: ['Late close? Rerun on demand after it closes. Running the same month twice is safe.'],
      acceptance: [...CHECKPOINT],
      useEvidence: 'The signed seat card, a screenshot of the first run and the minutes the hire took over.',
    },
    media: ['[VIDEO: week 3 pre-work lesson, 5 to 8 min, to be recorded]', '[VIDEO: week 3 live build replay, posts after the session]'],
    materials: ['The Finance Analyst scheduled-task prompt, for Claude and for ChatGPT', 'The Finance Analyst seat card, filled for the sample team, plus a blank'],
    module: {
      icon: 'trend',
      platform: 'Claude or ChatGPT', // ADJUSTED
      runLabel: 'Schedule the Monthly Run', // DRAFT
      outcome: card(3).promise,
      outputs: outputs3(3),
      checklist: card(3).steps.map((t, i) =>
        S(
          t,
          ['Confirm the Close', 'Run November', 'Read What Moved', 'Schedule the Finance Analyst', 'Run It Once', 'Sign the Seat Card'][i]!,
          [5, 15, 10, 15, 10, 5][i]!,
          [0, 0, 10, 50, 65, 80][i]!,
          '',
          // Step 4's two paths: the cohort prompt, verbatim for Claude, adjusted for ChatGPT.
          i === 3
            ? {
                paths: {
                  claude: { blocks: [{ type: 'copy', label: 'The Finance Analyst prompt', text: FINANCE_ANALYST_PROMPT.claude }] },
                  chatgpt: { blocks: [{ type: 'copy', label: 'The Finance Analyst prompt', text: FINANCE_ANALYST_PROMPT.chatgpt }] },
                },
              }
            : {},
        ),
      ),
    },
  },
];

/**
 * The builder's newer cards for each week: the spec's flagship, tools, and Weeks 1 to 3's seat and playbook cards.
 * D-220: the spec's promise is the week's outcome line (`module.outcome`, which learners read), never a second copy.
 */
function cardsOf(n: 0 | 1 | 2 | 3): Pick<ModuleCourse, 'flagship' | 'tools' | 'seatCard' | 'playbookCard'> {
  const c = card(n);
  return {
    flagship: c.flagship,
    tools: [...c.tools],
    ...(n === 0 ? {} : { seatCard: { ...SEAT_CARDS[n] }, playbookCard: { ...PLAYBOOKS[n] } }),
  };
}

/**
 * Week `n` (0 to 3) as the module row the step writes: the seed's own shape (`weekModule`), its course
 * words with the spec's cards, and the prompt pointer without a link to a Library page that isn't built.
 */
export function weekModuleV2(n: 0 | 1 | 2 | 3, instructor: string = ACCELERATOR_INSTRUCTOR): AIEmployee {
  const w = WEEKS_0_3[n]!;
  const m = weekModule(w, instructor);
  const { module: _portal, ...words } = w;
  const prompt = m.prompt
    .split('\n')
    .map((line) => {
      const pending = w.skills.find((s) => PENDING_LIBRARY_ROUTES.includes(s.route) && line === `- ${s.title}: ${courseGuideUrl(s.route, LIBRARY_ORIGIN)}`);
      return pending ? `- ${pending.title}: coming with Week 1, in the Library` : line;
    })
    .join('\n');
  return structuredClone({ ...m, prompt, kind: 'week' as const, course: courseWithoutRetired({ ...words, ...cardsOf(n) }) });
}

/** The ids the step writes. */
export const WEEKS_0_3_IDS: readonly string[] = [0, 1, 2, 3].map(acceleratorModuleId);
