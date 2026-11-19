// SEED, NOT RUNTIME (D-193). The Accelerator glossary, Design Nov 18, 2026. A one-time data step sets
// it on the Accelerator cohort's course only when that course has no glossary yet. It never overwrites
// a glossary staff already saved, and it never runs twice, so a later edit stays. Runtime code may not
// import this file.
//
// `first_use_step` in the design is `firstStep` here. The underline switch is absent, which means on.
// Pure: no clock, no random source.

import { ACCELERATOR_COHORT_ID } from '../src/accelerator';
import type { GlossaryTerm } from '../src/course-types';
import type { Db } from '../src/types';
import type { DataStepOutcome } from './data-step';

/** The step's id, recorded in `data_migrations` once it has run. */
export const GLOSSARY_V1 = '2026-11-18-glossary';

const a = (
  term: string,
  short: string,
  long: string,
  firstStep: number,
  aliases: string[],
  id: string,
): GlossaryTerm => ({
  id,
  term,
  short,
  long,
  aliases,
  firstStep,
});

/** The design's 31 terms, in its order. Possessives keep the design's apostrophe. */
export const ACCELERATOR_GLOSSARY: readonly GlossaryTerm[] = [
  a(
    'Owner',
    'The team leader who bought the course and makes the calls.',
    'The team leader who bought the course. The owner reads what the skills find, signs each seat card and decides what goes out.',
    1,
    [],
    'owner',
  ),
  a(
    'Operator',
    'The teammate who sets up your AI and runs it alongside you.',
    'The teammate who sets up your AI and runs it alongside you. The owner can hold both roles.',
    1,
    ['your operator'],
    'operator',
  ),
  a(
    'Your AI',
    'Claude or ChatGPT, whichever your team picked.',
    'Claude or ChatGPT, whichever your team picked on the intake. Every setup step has a path for each.',
    1,
    ['Claude Path', 'ChatGPT Path'],
    'ai',
  ),
  a(
    'Skill',
    'A playbook we load into your AI.',
    'A playbook we load into your AI, as a zip file. Map Your Spend and Lead Source Review are the two cohort skills.',
    2,
    ['skills', 'cohort skill'],
    'skill',
  ),
  a(
    'AI hire',
    'A skill that runs on a schedule and leaves a draft on one person\u2019s desk.',
    'A skill that runs on a schedule and leaves a draft on one person\u2019s desk. It reads and drafts. It never sends anything or changes your books or your CRM. Also called an AI employee.',
    1,
    ['hire', 'hires', 'AI employee'],
    'ai-hire',
  ),
  a(
    'Draft',
    'Something a hire writes for a person to check.',
    'Something a hire writes for a person to check, like a Gmail draft or a report in the AI Office. Nothing goes out until a person sends it.',
    1,
    ['drafts', 'Gmail draft'],
    'draft',
  ),
  a(
    'Desk',
    'The one person a hire reports to.',
    'The one person a hire reports to, where its draft lands.',
    2,
    [],
    'desk',
  ),
  a(
    'Seat card',
    'A hire\u2019s job description.',
    'A hire\u2019s job description: its name, who it reports to, when it runs, what it reads, the playbook it applies, what it produces, the task it took over, what it can\u2019t do and its first run.',
    2,
    ['seat cards'],
    'seat-card',
  ),
  a(
    'AI Office',
    'A folder in your Google Drive where your hires read and save their work.',
    'A folder in your Google Drive where your hires read and save their work. Exports go in its inbox folder. Your AI Office project in Claude or ChatGPT uses the same name.',
    1,
    ['AI Office folder'],
    'ai-office',
  ),
  a(
    'Inbox folder',
    'The folder inside your AI Office where exports go.',
    'The folder inside your AI Office where you drop exports from tools your AI can\u2019t connect to.',
    1,
    ['inbox'],
    'inbox',
  ),
  a(
    'Stack',
    'The set of tools your business runs on.',
    'The set of tools your business runs on: your books, Sisu, your CRM, and your email, calendar and files.',
    1,
    [],
    'stack',
  ),
  a(
    'Stack card',
    'A one-page list of where your data lives and how your hires reach it.',
    'A one-page list of where your team\u2019s data lives and how your hires reach it. Your operator marks each source green or yellow and sends it back in Step 1.',
    1,
    [],
    'stack-card',
  ),
  a(
    'Green source',
    'A tool your AI reads through a connector, hands-off.',
    'A tool your AI reads through a connector, with nobody dropping in files. It passes when it answers a test question only that tool could answer.',
    1,
    ['green'],
    'green-source',
  ),
  a(
    'Yellow source',
    'A tool you export from and drop in the inbox.',
    'A tool your AI can\u2019t connect to yet, so someone exports a report and drops it in the AI Office inbox on a schedule. A fine way to finish Week 0.',
    1,
    ['yellow', 'export drop'],
    'yellow-source',
  ),
  a(
    'Connector',
    'The link that lets your AI read one of your tools.',
    'The link that lets your AI read one of your tools, like Google Drive, Gmail, QuickBooks or Sisu. ChatGPT calls these apps or plugins.',
    1,
    ['connectors', 'plugin', 'plugins'],
    'connector',
  ),
  a(
    'Write tool',
    'Anything that writes, sends, changes or deletes.',
    'Anything a connector can do that writes, sends, changes or deletes. We set them to Blocked, except saving drafts and saving to the AI Office.',
    2,
    ['write tools'],
    'write-tool',
  ),
  a(
    'Guardrails',
    'The settings that keep your hires read and draft only.',
    'The safety settings that keep your hires read and draft only: write tools blocked, plus the never-send line in your instructions.',
    2,
    [],
    'guardrails',
  ),
  a(
    'Never-send line',
    'One line in your instructions that backs up the guardrails.',
    '\u201cRead only. You may save drafts and files in the AI Office. Never send an email. Never change the books, a lead, or anything in a connected app.\u201d',
    2,
    [],
    'never-send',
  ),
  a(
    'Time baseline',
    'How long seven tasks take your team today.',
    'How long seven tasks take your team today, timed per occurrence. Each hire\u2019s seat card records the minutes it took over from this.',
    2,
    ['baseline'],
    'baseline',
  ),
  a(
    'Per occurrence',
    'One time you do a task, start to finish.',
    'One time you do a task, start to finish. Two 1:1s this week are two occurrences, each with its own minutes.',
    3,
    [],
    'per-occurrence',
  ),
  a(
    'Self-test',
    'A run on the skill\u2019s made-up sample team.',
    'A run of a skill on the made-up sample team that ships with it, to prove it works. None of your data goes in.',
    4,
    [],
    'self-test',
  ),
  a(
    'Sample Team',
    'A made-up team that ships with each skill.',
    'A made-up team that ships with each skill. Its numbers aren\u2019t real and aren\u2019t a benchmark.',
    4,
    [],
    'sample-team',
  ),
  a(
    'Project',
    'A container in your AI where every chat starts from what\u2019s inside.',
    'A container in Claude or ChatGPT. Every chat in it starts from its files and instructions. Ours is called AI Office.',
    5,
    ['projects'],
    'project',
  ),
  a(
    'AI Brain',
    'Everything your AI knows about your business.',
    'Everything your AI knows about your business: your AI Office project and your About My Business page.',
    2,
    [],
    'ai-brain',
  ),
  a(
    'About My Business',
    'The page your AI writes about your business.',
    'The page your AI writes from a short interview. It lives in your AI Office project and in your AI Office folder.',
    5,
    [],
    'about-my-business',
  ),
  a(
    'Live build',
    'Our 90-minute Wednesday session where we build each hire.',
    'Our 90-minute Wednesday session, 12:00 to 1:30 PM MT: the question, live reads, the hire lab and the commit.',
    2,
    [],
    'live-build',
  ),
  a(
    'Office hours',
    'A 60-minute session to get setups unstuck.',
    'A 60-minute group session after each live build to get setups unstuck and answer the week\u2019s questions.',
    2,
    [],
    'office-hours',
  ),
  a(
    'Checkpoint',
    'How we confirm a week is done.',
    'The signed seat card, a screenshot of the first run and the minutes the hire took over, before the next build.',
    2,
    [],
    'checkpoint',
  ),
  a(
    'Ready Check',
    'A prompt that checks your setup item by item.',
    'A prompt your operator pastes in Step 8. It checks your setup item by item and marks each green, amber or red, with the fix.',
    8,
    [],
    'ready-check',
  ),
  a(
    'Test hire',
    'A practice hire that runs on its own the next morning.',
    'A practice hire set up in Step 8. It runs the next morning with nobody there, reads only sample data and your About My Business page, and leaves a draft.',
    2,
    [],
    'test-hire',
  ),
  a(
    'MT',
    'Mountain Time. Every time in the course is in MT.',
    'Mountain Time. The course runs on MT, and every session and schedule is in MT.',
    1,
    ['Mountain time'],
    'mt',
  ),
];

/** Set the glossary on the Accelerator course when it has none. Any other cohort is left alone. */
export function planGlossaryV1(db: Db): DataStepOutcome {
  const co = db.cohorts.find((c) => c.id === ACCELERATOR_COHORT_ID);
  if (!co)
    return { db, changes: [], skipped: [{ id: ACCELERATOR_COHORT_ID, reason: 'the cohort is not in this database' }] };
  if (!co.course)
    return {
      db,
      changes: [],
      skipped: [{ id: ACCELERATOR_COHORT_ID, reason: 'the cohort has no course pages in this database' }],
    };
  if (co.course.glossary !== undefined)
    return {
      db,
      changes: [],
      skipped: [{ id: `${co.id}.course.glossary`, reason: 'the glossary was already set in the builder' }],
    };
  const glossary = ACCELERATOR_GLOSSARY.map((t) => ({ ...t, aliases: [...t.aliases] }));
  const course = { ...co.course, glossary };
  return {
    db: { ...db, cohorts: db.cohorts.map((c) => (c.id === co.id ? { ...c, course } : c)) },
    changes: [
      {
        target: { type: 'cohort', id: co.id, label: co.name },
        before: { glossary: 0 },
        after: { glossary: glossary.length },
      },
    ],
    skipped: [],
  };
}
