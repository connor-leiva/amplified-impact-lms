// D-241: every word the $37 skill buyer's pages say, in one place, built from the product's own copy wherever it already
// exists so nothing is typed twice:
//   the plans, their prices and terms     @ai/core/offer (SKILL_PURCHASE, AGENT_TRAINING, PLAN_NAMES), site/offers-content
//   weekly training and office hours      agents/content (ROTATION, OFFICE_HOURS)
//   the AI Accelerator's promise           pricing (COMPARE: what it includes, its AI employees, its live builds)
// The course's own weeks (titles, questions, outcomes) are not here: they are data (D-173) and reach the page from
// `GET /api/course`, as the outline shows a locked week (`courseOutline`). The approved mockup
// (`handoff/lms-mockup/buyer.html`) reads this same module (its `tools/make-data.ts` writes it out), so the mockup and
// the build say the same thing. Pure data, no imports of the app's.
//
// Copy rules (Connor, Nov 24): Title Case for headings and buttons, no em dashes, no invented number, MT after a clock
// time, hires read and draft only, Claude and ChatGPT look equal. `buyer.vm.test.ts` holds them.
import { AGENT_TRAINING, PLAN_NAMES, SKILL_PURCHASE } from '@ai/core/offer';
import type { CartId, SkillSet } from '@ai/core/offer';
import { LIBRARY_ORIGIN } from '@ai/core/accelerator';
import { OFFICE_HOURS, ROTATION } from '../../../agents/content';
import { COMPARE } from '../../../pricing/content';
import { PROGRAM_PAGES } from '../../../site/content';
import { AGENT_INSIDERS, AGENT_PLAN } from '../../../site/offers-content';
import { LMS_V3 } from '../lms-v3/v3';

/**
 * Office hours' time, Thursdays at noon Mountain. With LMS v3 on, the learner portal's one line (D-259, Connor, Nov 25:
 * "Times everywhere in the learner portal use one line: '12:00 PM MT / 1:00 PM CT'"); with it off, the words as they were.
 */
const OH_TIME = LMS_V3 ? '12:00 PM MT / 1:00 PM CT' : '12:00 PM MT';
const OH_PM = LMS_V3 ? 'PM MT / 1:00 PM CT' : 'PM MT';

/** Title Case for a heading made from a sentence-case line ("Leads and follow-up" → "Leads and Follow-Up"). */
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
export function titleCase(s: string): string {
  return s
    .split(' ')
    .map((w, i) => w.split('-').map((p, j) => (i > 0 && j === 0 && SMALL.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('-'))
    .join(' ');
}

/** One Insiders plan, as the buyer's pages show it. */
export interface BuyerPlan {
  key: 'leader' | 'agent';
  cart: CartId;
  name: string;
  /** The chip on a locked row: which plan opens it. */
  chip: string;
  who: string;
  amount: string;
  terms: string;
  /** The hero's button: the plan and its price. */
  button: string;
  /** The upgrade card's button, under the price. */
  short: string;
  line: string;
  checks: readonly string[];
  /** The library's upgrade band, and a locked skill's hero. */
  every: string;
  getAll: string;
}

const MINIMUM = '3-Month Minimum.';

/**
 * The Insiders upsell follows the skill's set, as the library's does (`skillUpsell`): agent skills open Agent Insiders
 * ($79), owner, ops and both open Team Leader Insiders ($169). Each button's href is its cart's Payment Link.
 */
export const PLANS: Readonly<Record<'leader' | 'agent', BuyerPlan>> = {
  leader: {
    key: 'leader',
    cart: SKILL_PURCHASE.teamLeaderCart,
    name: PLAN_NAMES.membership,
    chip: PLAN_NAMES.membership,
    who: 'For team leaders',
    amount: '$169',
    terms: MINIMUM,
    button: 'Upgrade to Amplified Insiders, $169/Month',
    short: 'Upgrade to Amplified Insiders',
    line: 'Every owner, ops and agent skill, plus weekly office hours.',
    checks: [COMPARE.rows[0]!.cells[0] as string, `Weekly office hours, Thursdays at ${OH_TIME}`, 'New skills and updates as they come out'],
    every: 'Open Every Skill in the Library',
    getAll: 'Get This Skill and Every Other One',
  },
  agent: {
    key: 'agent',
    cart: SKILL_PURCHASE.agentInsidersCart,
    name: AGENT_INSIDERS.name,
    chip: 'Agent Insiders',
    who: 'For agents',
    amount: AGENT_INSIDERS.amount,
    terms: `${AGENT_INSIDERS.terms[0]} ${AGENT_INSIDERS.terms[2]}`,
    button: 'Upgrade to Agent Insiders, $79/Month',
    short: 'Upgrade to Agent Insiders',
    line: AGENT_INSIDERS.terms[1],
    checks: ['Every agent skill', `Weekly office hours, Thursdays at ${OH_TIME}`],
    every: 'Open Every Agent Skill',
    getAll: 'Get This Skill and Every Agent Skill',
  },
};

export const planFor = (sets: SkillSet): BuyerPlan => (sets === 'agent' ? PLANS.agent : PLANS.leader);

/** Weekly live training: the Agent Plan (offer.ts AGENT_TRAINING, the Agent Plan's card). */
export const AGENT_PLAN_UP = {
  cart: AGENT_TRAINING.cart as CartId,
  name: PLAN_NAMES.agent_plan,
  amount: AGENT_PLAN.price.amount,
  button: AGENT_TRAINING.upgrade,
  body: AGENT_TRAINING.body,
  lines: AGENT_PLAN.lines,
} as const;

/** The 4-week rotation, its topics as headings. */
export const TRAINING = {
  title: AGENT_TRAINING.title,
  lede: ROTATION.lede,
  when: ROTATION.when.replace(/\.$/, ''),
  weekLabel: ROTATION.weekLabel,
  weeks: ROTATION.weeks.map((w) => ({ n: w.n, topic: titleCase(w.topic), skills: w.skills })),
} as const;

/** Office hours (the Agent Plan page's words; the time is `OH_TIME`, D-259). */
export const OFFICE = {
  body: `Every Thursday, ${OH_TIME}, 60 minutes. Drop in with a real file and get help.`,
  lede: `Drop in with a real file and get help. ${OFFICE_HOURS.recorded}`,
} as const;

/** "7, with at least 5 running by Feb 3": the Accelerator's column of the pricing table. */
const [HIRES_N, HIRES_REST] = (COMPARE.rows[1]!.cells[0] as string).split(', ');

export const ACCEL = {
  name: PLAN_NAMES.cohort,
  hiresN: HIRES_N!,
  hiresRest: `${HIRES_REST!.charAt(0).toUpperCase()}${HIRES_REST!.slice(1)}.`,
  builds: COMPARE.rows[2]!.cells[0] as string,
  checks: [COMPARE.rows[0]!.cells[0] as string, `${HIRES_N} AI employees built with you`, COMPARE.rows[2]!.cells[0] as string, 'Office hours'],
} as const;

/** The words of the buyer's pages. */
export const COPY = {
  shell: {
    program: 'Amplified Skill',
    bought: (n: number) => (n === 1 ? '1 skill bought' : `${n} skills bought`),
    home: 'Home',
    library: 'Skill library',
    office: 'Office hours',
    training: 'Weekly training',
    weeks: 'AI Accelerator',
    help: 'Get help',
    yourSkill: 'Your skill',
    yourSkills: 'Your skills',
    more: (n: number) => `and ${n} more`,
    openGuide: 'Open the Setup Guide',
    openSkills: 'Open Your Skills',
    logo: 'Amplified Impact Academy, Home',
    locked: 'Locked',
  },
  here: { home: 'Home', library: 'Skill Library', training: 'Weekly Live Training', office: 'Office Hours', accelerator: 'AI Accelerator', account: 'Account' },
  greeting: (hour: number) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'),
  home: {
    one: 'Your skill is ready. Open its Setup Guide to add it to Claude or ChatGPT.',
    many: 'Your skills are ready. Open a Setup Guide to add one to Claude or ChatGPT.',
    kick: 'Your skill',
    kickMany: (n: number) => `Your skills · 1 of ${n}`,
    whatItDoes: 'What it does',
    seeAll: 'See All Your Skills',
    downloads: 'Downloads',
    setOnce: 'Set it up once. It’s easiest on a computer.',
    alsoTitle: 'Also in the Academy',
    alsoSum: 'Not in your plan yet. Open any of them to see what’s inside.',
    everyOther: 'Every Other Skill',
    everyOtherAll: (n: number) => `${n} more skills, each with its Setup Guide to preview.`,
    everyOtherSome: (n: number, chip: string, opens: number) => `${n} more skills to preview. ${chip} opens ${opens} of them.`,
    office: 'Office Hours',
    training: 'Weekly Live Training',
    trainingLine: 'One 60 minute session a week, building one skill live on a real file.',
    trainingChip: 'Agent Plan',
    week0: (title: string) => `Week 0: ${title}`,
    hires: (last: number) => `AI Hires, Weeks 1 to ${last}`,
    hiresLine: 'Each week answers one question about your business and adds one AI employee.',
    accelChip: 'AI Accelerator',
    nextTitle: 'Skills to Open Next',
    nextSum: (set: string, many: boolean) => `From ${set}, the same set as ${many ? 'your first skill' : 'yours'}.`,
    preview: 'Preview the Setup',
    keeps: (title: string | null) => (title ? `${title} stays yours` : 'The skills you bought stay yours'),
    aMonth: 'a month',
  },
  library: {
    title: 'Skill Library',
    lede: (many: boolean) => `${many ? 'Your skills come first.' : 'Your skill comes first.'} Every other skill is here to preview, with what it does and who it’s for.`,
    yours: (many: boolean) => (many ? 'Your Skills' : 'Your Skill'),
    every: 'Every Skill',
    everySum: 'Open a locked skill to see its setup. Any one of them is also $37 on its own.',
    lockedNow: 'Locked now',
    skills: 'skills',
    opensLeader: 'Every one of them opens with Insiders.',
    opensAgent: 'The agent skills and the skills for everyone open with Agent Insiders.',
    yoursChip: 'Yours',
    free: 'Free',
    showAll: (n: number) => `Show All ${n}`,
    meta: (n: number, mine: number, free: number) => [`${n} skills`, mine ? `${mine} yours` : '', free ? `${free} free` : ''].filter(Boolean).join(' · '),
  },
  lead: { problem: 'The problem', outcome: 'What it does for you', forRole: 'Who it’s for' },
  sets: { owner_ops: 'Owner and Operations Skills', agent: 'Agent Skills', both: 'Skills for Everyone' } as Record<SkillSet, string>,
  setOne: { owner_ops: 'Owner and Operations Skill', agent: 'Agent Skill', both: 'Skill for Everyone' } as Record<SkillSet, string>,
  skill: {
    kick: (plan: string) => `Locked · In ${plan}`,
    orThis: 'Or just this one',
    price: '$37',
    once: 'once',
    keep: 'Yours to keep, including future updates.',
    get: SKILL_PURCHASE.get,
    starting: SKILL_PURCHASE.starting,
    failed: SKILL_PURCHASE.failed,
    setup: 'The Setup',
    yourAi: 'Your AI',
    getTitle: 'What You’ll Get',
    getGuide: 'Its step-by-step setup guide',
    getBoth: 'Downloads for Claude and ChatGPT',
    getClaude: 'The download for Claude',
    getGrok: 'The Grok Bot template',
    getPractice: 'Practice files to try it safely',
    practiceTag: 'Practice files included',
    steps: (lane: string) => `${lane} steps`,
  },
  training: {
    kick: 'Locked · In the Agent Plan',
    hero: 'Build One Skill Live, Every Week',
    body: 'Agent Plan',
    perWeek: 'One topic a week',
    topics: 'topics',
    cover: 'You cover every topic in 4 weeks.',
    rotation: 'The Rotation',
    minutes: '60 minutes',
    forAgents: 'For agents',
    yours: 'Yours',
    free: 'Free',
  },
  office: {
    title: 'Office Hours',
    hero: 'Get Help on a Real File, Every Thursday',
    every: 'Every Thursday',
    time: `${OH_TIME}, 60 minutes`,
    recorded: 'Recorded',
    clock: '12:00',
    pm: OH_PM,
    live: '60 minutes, live, then recorded.',
  },
  accel: {
    title: 'AI Accelerator',
    lede: 'Week 0 sets up the office. Then one AI hire a week, built on your own numbers.',
    weeks: 'The Weeks',
    owners: 'Owners and AI Implementers',
    kick: 'Locked · Part of the AI Accelerator',
    how: 'How it works',
    howLine: 'Every week answers one question about your business.',
    see: 'See the AI Accelerator',
    back: 'Back to Home',
    employees: 'AI employees',
    builtWithYou: 'built with you',
    inIt: 'In the AI Accelerator',
    fine: 'Every hire reads and drafts. Nothing is sent without you.',
  },
  week: 'Week',
  questions: 'Questions?',
  support: 'support@amplifiedimpact.io',
  locked: 'Locked',
} as const;

/** Where "See the AI Accelerator" goes: the Accelerator's own page on www. */
export const ACCELERATOR_HREF = `${LIBRARY_ORIGIN}${PROGRAM_PAGES.cohort}`;
