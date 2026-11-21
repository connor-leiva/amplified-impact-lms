// Sample props for <WeekPage>, word for word from mockup/index.html. `sampleWeek(preview)` returns the week in one of
// the mockup's four preview states: 's1' (1 of 8 done, the seeded test learner), 's7' (one step left: step 5, which waited on step 6),
// 's8' (all done) or 'deployed'.
// In the LMS, build the same shape from the week's view-model.
import { sessionEnd, sessionState } from './components/session.js';

const STATUS = {
  s1: ['done', 'idle', 'progress', 'idle', 'waiting', 'idle', 'idle', 'idle'],
  s7: ['done', 'done', 'done', 'done', 'idle', 'done', 'done', 'done'],
  s8: Array(8).fill('done'),
  deployed: Array(8).fill('done'),
};

/** status: 'done' | 'progress' | 'waiting' | 'idle'. waiting = one of the step's boxes can't be ticked until another step
 *  is done (the LMS's stepChecklistStatus); waitsOn is that step's number (waitingOn()). The row reads "Waiting on step 6". */
const steps = [
  { n: 1, title: 'Fill In Your Intake and Name Your Operator', role: 'Owner', who: ['owner'], time: '10 min', minutes: 10, doneWhen: 'Intake in, operator invited, stack card sent back.' },
  { n: 2, title: 'Watch the Orientation', role: 'Owner and operator', who: ['owner', 'operator'], time: '30 min', minutes: 30, doneWhen: 'Both know how a week runs and what a hire is.' },
  { n: 3, title: 'Start Your Time Baseline', role: 'Owner', who: ['owner'], time: '20 min, over two weeks', minutes: 20, doneWhen: 'Six tasks timed per occurrence, or marked not done today.' },
  { n: 4, title: 'Get Your AI Ready', role: 'Operator', who: ['operator'], time: '20 min', minutes: 20, doneWhen: 'Paid plan, training off, skills on, both cohort skills pass their self-test, on the Claude Path or the ChatGPT Path.' },
  { n: 5, title: 'Set Up Your AI Brain', role: 'Each of you', who: ['owner', 'operator'], time: '30 min', minutes: 30, waitsOn: 6, doneWhen: 'A new chat knows the business, and About My Business is in the AI Office.' },
  { n: 6, title: 'Connect Your Data', role: 'Operator', who: ['operator'], time: '30 min', minutes: 30, doneWhen: 'Each green source answers a test question; each yellow source’s export is in the inbox.' },
  { n: 7, title: 'Lock the Guardrails', role: 'Operator', who: ['operator'], time: '10 min', minutes: 10, doneWhen: 'Every write tool Blocked except drafts and AI Office saves, on your platform.' },
  { n: 8, title: 'Run the Ready Check and Your Test Hire', role: 'Operator', who: ['operator'], time: '20 min, plus a next-morning check', minutes: 20, doneWhen: 'Ready Check is green and the test hire ran with nobody there.' },
];

const down = (label) => ({ icon: 'down', label });

export const sampleWeek = (preview = 's1') => ({
  n: 0,
  title: 'Foundations',
  open: true,
  question: 'Is our office ready for its first hire?',
  purpose: 'Every team at the same starting line by Mon, Nov 30.',
  crumbs: [{ label: 'Home', href: '#' }, { label: 'Foundations' }],
  tags: [
    { icon: 'clock', label: 'Self-paced' },
    { icon: 'users', label: 'Owners and operators' },
    { icon: 'cal', label: 'Due Mon, Nov 30, 1:00 PM CT' },
  ],
  steps: steps.map((s, i) => ({ ...s, status: STATUS[preview][i], href: '#' })),
  /** The role filter: label, count and the one-line summary shown when it is chosen. */
  roles: [
    { id: 'all', label: 'All', count: 8, summary: 'About 2 hr 50 min in all. Steps 3 and 5 can run alongside the others.' },
    { id: 'owner', label: 'Owner', count: 4, summary: '4 steps for the owner, about 1 hr 30 min.' },
    { id: 'operator', label: 'Operator', count: 6, summary: '6 steps for the operator, about 2 hr 20 min.' },
  ],
  deployed: preview === 'deployed',
  deployedWhen: 'Ready Check is green and the test hire ran with nobody there. Every write tool Blocked except drafts and AI Office saves.',
  platform: 'Claude or ChatGPT',
  next: { n: 1, title: 'Where the Money Goes', href: '#week-1' },
  libraryHref: '#',
  supportEmail: 'support@amplifiedimpact.io',
  note: { initials: 'CL', name: 'Connor Leiva', text: 'Every team starts Week 1 on the same setup, so the live builds go to hiring, not troubleshooting. The hires will be measured against the time you record now.' },
  kit: [
    { label: 'Skills', rows: [
      { icon: 'book', title: 'AI Brain Setup', meta: 'Open now', href: '#', tags: [{ label: 'Flagship', hi: true }, { label: 'Free' }] },
      { icon: 'book', title: 'Map Your Spend', meta: 'Step 4 · Supporting', href: '#', acts: [down('Zip')] },
      { icon: 'book', title: 'Lead Source Review', meta: 'Step 4 · Supporting', href: '#', acts: [down('Zip')] },
    ] },
    { label: 'Files', rows: [
      { icon: 'file', title: 'Week 0 Intake Form', meta: 'Step 1', form: 'intake' },
      { icon: 'file', title: 'Week 0 Stack Card', meta: 'Step 1', href: '#' },
      { icon: 'file', title: 'Time Baseline', meta: 'Step 3', acts: [down('Excel'), down('CSV')] },
      { icon: 'file', title: 'Test Hire Sample Week', meta: 'Step 8', href: '#' },
    ] },
    { label: 'For your AI', rows: [
      { icon: 'key', title: 'System prompt', meta: '6 lines · about 63 tokens', acts: [{ icon: 'eye', label: 'View' }, { icon: 'copy', label: 'Copy', copyText: 'System prompt' }] },
    ] },
  ],
  reference: [
    { title: 'How the program works', blocks: [
      { type: 'ul', items: [
        'Every week has one operating question, one flagship skill from the Library and one required output.',
        'You get the finished skill ahead of time. Live building means setting it up, testing it and putting it to work.',
        '“Working at the end of class” and “implemented by week’s end” aren’t the same thing. We track both.',
        'The rest of the Library stays open the whole time. This week’s skills are just the ones in the spotlight.' ] },
      { type: 'fine', text: 'No private coaching calls, no custom integrations, no bookkeeping cleanup and no full database cleanup. Those are outside the program.' } ] },
    { title: 'Owner and operator', blocks: [
      { type: 'dl', rows: [
        { dt: 'Owner', dd: ['Comes to the build, makes the business decisions, approves one real run each week and protects a weekly operating review.', 'This week: fill in your intake, name your operator, watch the orientation, start your time baseline and set up your AI Brain.'], small: 'About 1 hr 30 min' },
        { dt: 'Operator', dd: ['Maintains the workflows: refreshes inputs, reruns outputs, finds failures and follows the repair steps. An owner can hold both roles, on purpose.', 'This week: get your AI ready, set up your AI Brain, connect your data, lock the guardrails, and run the Ready Check and your test hire.'], small: 'About 2 hr 20 min' } ] },
      { type: 'fine', text: 'These are planning estimates, not guarantees.' } ] },
    { title: 'What done looks like', blocks: [
      { type: 'dl', rows: [
        { dt: 'Acceptance test', dd: ['Ready Check is green and the test hire ran with nobody there.', 'Every write tool Blocked except drafts and AI Office saves.'] },
        { dt: 'Adopted means', dd: 'Six tasks timed per occurrence, or marked not done today.' },
        { dt: 'Before the next session', dd: 'Keep timing the six tasks per occurrence until each has one, or mark it not done today.' } ] },
      { type: 'fine', text: 'Missed a week? Do the core path first: the preconfigured skill, the minimum-data build and one reviewed real use. Extras can wait.' } ] },
    { title: 'Evidence packet', blocks: [
      { type: 'dl', rows: [
        { dt: 'Skill and Version Link', dd: 'A link to the skill and the version you ran.' },
        { dt: 'One Redacted Output', dd: 'One real output, with client and employee details removed.' },
        { dt: 'Test Checklist', dd: 'Normal, missing and misleading inputs, and what happened on each.' },
        { dt: 'Use Log', dd: 'When it ran, who ran it, what it was for, and prep and review time.' },
        { dt: 'Three-Sentence Account', dd: 'The action you took because of it. A two-minute recording works too.' } ] } ] },
    { title: 'Rubric', blocks: [
      { type: 'scale', items: [[0, 'Not demonstrated'], [1, 'Needs correction'], [2, 'Meets standard']] },
      { type: 'dl', rows: [
        { dt: 'Business Fit', dd: 'Solves a named operating problem and informs an action.' },
        { dt: 'Evidence Quality', dd: 'Required facts trace to inputs. Missing information is visible.' },
        { dt: 'Output Quality', dd: 'Meets your team’s actual acceptance standard.' },
        { dt: 'Control', dd: 'Human approval, access limits and safe failure are explicit.' },
        { dt: 'Repeatability', dd: 'A named maintainer can rerun it at the agreed trigger.' } ] },
      { type: 'ul', items: [
        'Tested: 8 or more out of 10, with no zero in Evidence Quality or Control.',
        'Adopted: tested, plus this week’s use evidence. No score stands in for actual use.' ] } ] },
    { title: 'Readiness', blocks: [
      { type: 'dl', rows: [
        { dt: 'Green', dd: 'Accounts work, permissions are confirmed, your operator is named and the minimum data is there. Build on your own data.' },
        { dt: 'Amber', dd: 'Accounts work, but a data gap remains. Build on the practice set while a named person fixes the gap, then rerun on your real data. Until you do, the week shows “data repair required.”' },
        { dt: 'Red', dd: 'No authorized access, no maintainer, or no time to implement. Sort it out before the start, or defer. Don’t let it become an open-ended support problem.' } ] } ] },
    { title: 'Tools this week', blocks: [
      { type: 'dl', rows: [
        { dt: 'Flagship', dd: 'Foundations' },
        { dt: 'You’ll use', dd: 'Claude or ChatGPT, QuickBooks Online, Sisu and Google.' } ] } ] },
  ],
});

/** The chrome words, as the mockup prints them. */
export const sampleLabels = {
  open: 'Open', upNext: 'Up next', doneWhen: 'Done when', deployedWhen: 'Deployed when',
  start: 'Start', continue: 'Continue', markDeployed: 'Mark as deployed', undo: 'Undo',
  deployed: 'Deployed', deployedTitle: 'Your office is ready for its first hire.',
  stepsDone: 'Steps done', allDone: 'All steps done',
  stepsTitle: 'Eight steps', showStepsFor: 'Show steps for',
  done: 'Done', inProgress: 'In progress', waitingOn: 'Waiting on step', ready: 'Ready',
  forThisWeek: 'For this week', inStepOrder: 'In step order', openLibrary: 'Open your Skill Library', copied: 'Copied',
  instructorNote: 'Instructor note', whyThisWeek: 'Why this week matters', questions: 'Questions?',
  reference: 'Reference', nextWeek: 'Next week',
};

/* ---------- shell, schedule, locked weeks (v2, v5) ---------- */
const CALENDAR = [{ icon: 'down', label: 'Calendar file (.ics)', href: '#' }, { icon: 'cal', label: 'Google Calendar', href: '#' }, { icon: 'cal', label: 'Outlook', href: '#' }];
/** The sessions that have a clock time in the samples. label = the top bar's words while it is the next one. */
const SESSIONS = [
  { id: 'b1', week: 1, kind: 'Live build', label: 'Next live build', cta: 'See what you’ll build', title: 'Map Your Spend Live Build', day: 'Wed', date: '2', when: 'Wed, Dec 2 · 1:00 PM CT', time: '1:00 PM CT', length: '1 hr 30 min', where: 'Zoom', start: '2026-12-02T19:00:00Z', minutes: 90, joinBefore: 15, replayAt: '2026-12-03T15:00:00Z' },
  { id: 'o1', week: 1, kind: 'Office hours', label: 'Next office hours', cta: 'Open Week 1', title: 'Map Your Spend Office Hours', day: 'Thu', date: '3', when: 'Thu, Dec 3 · 1:00 PM CT', time: '1:00 PM CT', length: '1 hr', where: 'Zoom', start: '2026-12-03T19:00:00Z', minutes: 60, joinBefore: 15 },
  { id: 'b2', week: 2, kind: 'Live build', label: 'Next live build', cta: 'See what you’ll build', title: 'Lead Source Review Live Build', day: 'Wed', date: '9', when: 'Wed, Dec 9 · 1:00 PM CT', time: '1:00 PM CT', length: '1 hr 30 min', where: 'Zoom', start: '2026-12-09T19:00:00Z', minutes: 90, joinBefore: 15 },
].map((x) => ({ ...x, joinHref: '#', calendar: CALENDAR }));
/** The MOCKUP bar's Clock. 'today' is the real clock; the others stand still at a moment around the first live build. */
export const SAMPLE_CLOCKS = { soon: '2026-12-02T18:51:00Z', live: '2026-12-02T19:12:00Z', ended: '2026-12-02T21:00:00Z', nextday: '2026-12-03T16:00:00Z' };
export const sampleNow = (clock = 'today') => () => (SAMPLE_CLOCKS[clock] ? Date.parse(SAMPLE_CLOCKS[clock]) : Date.now());
const WEEK_TITLES = ['Foundations', 'Where the Money Goes', 'Leads That Pay', 'Numbers on the 5th', 'Protect the Pipeline', 'Coach from Evidence', 'Delegate an Outcome', 'Make the Workflow Repeatable', 'Sustain and Expand'];
/** Each week's question and when it opens: at its live build's start. */
const LOCKS = [null,
  { question: 'Where does our money go, and is it the right amount?', opens: 'Wed, Dec 2 · 1:00 PM CT', opensAt: '2026-12-02T19:00:00Z' },
  { question: 'Which lead sources pay, and is every lead worked?', opens: 'Wed, Dec 9 · 1:00 PM CT', opensAt: '2026-12-09T19:00:00Z' },
  { question: 'What did we make last month, and what do I do about it?', opens: 'Wed, Dec 16 · 1:00 PM CT', opensAt: '2026-12-16T19:00:00Z' },
  { question: 'Where is execution slipping?', opens: 'Wed, Jan 6 · 1:00 PM CT', opensAt: '2027-01-06T19:00:00Z' },
  { question: 'What behavior should change for this agent?', opens: 'Wed, Jan 13 · 1:00 PM CT', opensAt: '2027-01-13T19:00:00Z' },
  { question: 'What work can leave the owner’s desk without lowering standards?', opens: 'Wed, Jan 20 · 1:00 PM CT', opensAt: '2027-01-20T19:00:00Z' },
  { question: 'Can our operator adapt and run the next workflow without the instructor?', opens: 'Wed, Jan 27 · 1:00 PM CT', opensAt: '2027-01-27T19:00:00Z' },
  { question: 'What stays, what stops, and what should agents adopt next?', opens: 'Wed, Feb 3 · 1:00 PM CT', opensAt: '2027-02-03T19:00:00Z' }];
const isLocked = (n, t) => n > 0 && t < Date.parse(LOCKS[n].opensAt);
/** Is week n locked at this clock? (the harness routes #week-N with it) */
export const sampleIsLocked = (n, clock = 'today') => isLocked(n, sampleNow(clock)());
const nextSession = (t) => SESSIONS.find((x) => t < sessionEnd(x)) || SESSIONS[SESSIONS.length - 1];
/** Week 0's page is the only open week drawn here; a locked week has its own page; an open later week goes nowhere. */
const weekHref = (n, t) => (n === 0 ? '#week-0' : isLocked(n, t) ? `#week-${n}` : '#');
const week0 = (preview) => { const done = STATUS[preview].filter((x) => x === 'done').length; return { status: preview === 'deployed' ? 'done' : done ? 'progress' : 'idle', done, total: 8 }; };

/** <AppShell shell>. week.status: 'idle' | 'progress' | 'done'; week.locked. next: the next session (session.js). */
export const sampleShell = (preview = 's1', clock = 'today') => { const t = sampleNow(clock)(); return {
  homeHref: '#', helpHref: '#',
  // the brand's files (brand/logos/, byte for byte). use: 'app' (the "ai academy" lockup) or 'full' (the full name)
  logo: { label: 'Amplified Impact Academy, Home', app: 'logos/amplified-impact-academy-app.svg', full: 'logos/amplified-impact-academy.svg', mark: 'logos/favicon.svg', use: 'app' },
  cohort: ['Amplified AI Accelerator', 'December 2026 Cohort · Starts Dec 2'],
  nav: [
    { icon: 'home', label: 'Home', href: '#' },
    { icon: 'cal', label: 'Schedule', href: '#schedule', id: 'schedule' },
    { icon: 'talk', label: 'Community', href: '#community', id: 'community' },
    { icon: 'grid', label: 'Skill library', href: '#' },
    { icon: 'users', label: 'Team Hub', href: '#' },
    { icon: 'folder', label: 'Resource vault', href: '#' },
  ],
  weeksLabel: 'Weeks',
  weeks: WEEK_TITLES.map((title, n) => { const locked = isLocked(n, t); return { n, title, href: weekHref(n, t), id: n === 0 || locked ? `week-${n}` : undefined, locked, ...(n === 0 ? week0(preview) : { status: 'idle' }) }; }),
  next: nextSession(t),
  account: { initials: 'AM', aria: 'Your account' },   // the account menu's trigger; the menu is the LMS's own
  here: 'Foundations',
}; };

const sess = (icon, title, when, id) => ({ icon, title, when, id });
const GROUPS = [
  { label: 'Now', note: 'Self-paced, before the first build', rows: [
    { week: 0, tile: ['Due', '30'], outcome: 'Every team at the same starting line by Mon, Nov 30.', sessions: [sess('clock', 'Self-paced, due Mon, Nov 30'), sess('users', 'Owner about 1 hr 30 min · operator about 2 hr 20 min')] } ] },
  { label: 'December 2026', rows: [
    { week: 1, tile: ['Wed', '2'], outcome: 'See every dollar of GCI on one chart, and what each gap costs you a year.', sessions: [sess('radio', 'Map Your Spend Live Build', 'Wed, Dec 2 · 1:00 PM CT', 'b1'), sess('users', 'Map Your Spend Office Hours', 'Thu, Dec 3', 'o1')] },
    { week: 2, tile: ['Wed', '9'], outcome: 'Know which lead sources pay you back, and catch every new lead that isn’t worked to standard.', sessions: [sess('radio', 'Lead Source Review Live Build', 'Wed, Dec 9', 'b2'), sess('users', 'Goal-Planning Session 1 and Office Hours', 'Thu, Dec 10'), sess('users', 'Lead Source Review Office Hours', 'Fri, Dec 11')] },
    { week: 3, tile: ['Wed', '16'], outcome: 'Get last month’s numbers against your standard every month, without anyone building a spreadsheet.', sessions: [sess('radio', 'Monthly Numbers Live Build', 'Wed, Dec 16'), sess('users', 'Goal-Planning Session 2 and Office Hours', 'Thu, Dec 17'), sess('users', 'Monthly Numbers Office Hours', 'Fri, Dec 18')] },
    { break: 'Holiday break', text: 'No sessions on Dec 23 or Dec 30. No new build until Jan 6.' } ] },
  { label: 'January 2027', rows: [
    { week: 4, tile: ['Wed', '6'], outcome: 'A ranked list of where deals are slipping, each with a record reference and a next step.', sessions: [sess('radio', 'FUB Pipeline Review Live Build', 'Wed, Jan 6'), sess('users', 'FUB Pipeline Review Office Hours', 'Thu, Jan 7')] },
    { week: 5, tile: ['Wed', '13'], outcome: 'A coaching packet that keeps facts, hypotheses and questions apart, and one agreed behavior to change.', sessions: [sess('radio', 'Agent 1:1 Prep Live Build', 'Wed, Jan 13'), sess('users', 'Agent 1:1 Prep Office Hours', 'Thu, Jan 14')] },
    { week: 6, tile: ['Wed', '20'], outcome: 'One recurring deliverable off the owner’s desk, with a responsibility card and a review checklist.', sessions: [sess('radio', 'Team Playbook Builder Live Build', 'Wed, Jan 20'), sess('users', 'Team Playbook Builder Office Hours', 'Thu, Jan 21')] },
    { week: 7, tile: ['Wed', '27'], outcome: 'A versioned onboarding skill your operator can explain, test and repair without the instructor.', sessions: [sess('radio', 'New Agent Onboarding Plan Live Build', 'Wed, Jan 27'), sess('users', 'New Agent Onboarding Plan Office Hours', 'Thu, Jan 28')] } ] },
  { label: 'February 2027', rows: [
    { week: 8, tile: ['Wed', '3'], outcome: 'A cohort-end review: what stays, what stops, and a 90-day plan your team runs without us.', sessions: [sess('radio', 'Cohort-End Review Live Build', 'Wed, Feb 3'), sess('users', 'Cohort-End Review Office Hours', 'Thu, Feb 4')] } ] },
];
const stateOf = (s, t) => (s.id ? sessionState(SESSIONS.find((x) => x.id === s.id), t) : undefined);
/** <SchedulePage schedule>. row.live: one of its sessions is live. row.next: it holds the next session. session.state:
 *  session.js › sessionState, only for a session that has a clock time. */
export const sampleSchedule = (preview = 's1', clock = 'today') => { const t = sampleNow(clock)(), nx = nextSession(t); return {
  title: 'Nine weeks',
  sub: 'Wed builds and Thu office hours · 1:00 PM CT',
  calendarHref: '#', calendarAllHref: '#',
  next: { ...nx, weekHref: isLocked(nx.week, t) ? `#week-${nx.week}` : '#' },
  groups: GROUPS.map((g) => ({ ...g, rows: g.rows.map((r) => (r.break ? r : {
    status: 'idle', ...r, ...(r.week === 0 ? week0(preview) : {}), title: WEEK_TITLES[r.week], href: weekHref(r.week, t), next: nx.week === r.week,
    sessions: r.sessions.map((s) => ({ ...s, state: stateOf(s, t), replayHref: '#' })), live: r.sessions.some((s) => stateOf(s, t) === 'live'),
  })) })),
}; };

/** <LockedWeekPage week>, for weeks 1 to 8. */
export const sampleLockedWeek = (n) => { const r = GROUPS.flatMap((g) => g.rows).find((x) => x.week === n); return {
  n, title: WEEK_TITLES[n], outcome: r.outcome, ...LOCKS[n], calendarHref: '#',
  sessions: r.sessions.map((s) => { const m = /^(\w+), \w+ (\d+)/.exec(s.when); return { title: s.title, kind: s.icon === 'radio' ? 'Live build' : 'Office hours', when: s.when, tile: [m[1], m[2]] }; }),
  back: { label: 'Back to Week 0', href: '#week-0' },
  crumbs: [{ label: 'Home', href: '#' }, { label: WEEK_TITLES[n] }],
}; };

/* ---------- forms (v3) ---------- */
export { default as intakeForm } from './forms/week-0-intake.json';
export { default as intakeSamples } from './forms/week-0-intake.samples.json';
/** Puts a form's state on its kit row: the meta line and the one button that opens the drawer. `f` is useForm()'s result. */
export const withForm = (week, f, onOpen) => ({ ...week, kit: week.kit.map((g) => ({ ...g, rows: g.rows.map((r) => (r.form === f.form.id
  ? { ...r, meta: `Step 1 · ${f.row.meta}`, acts: [{ icon: 'pen', label: f.row.label, act: 'form', onClick: onOpen }] } : r)) })) });

/* ---------- community and turn in (v4). Made-up people and words: Northline Realty (Alex Morgan), the skills' Sample Team. ---------- */
export { default as communitySamples } from './data/community.samples.json';
export { default as turnInSamples } from './data/turn-in.samples.json';
