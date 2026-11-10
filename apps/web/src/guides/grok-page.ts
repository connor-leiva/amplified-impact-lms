// What every Grok Bot template's page shares (D-100): the setup in Grok Bot, the routine, the sample
// and the guardrails, read from the template itself at build time, so the page and the ZIP can never
// say two different things. A template is not a Claude Skill: its page says so, sets `grok` rather
// than `skill`, and is free or paid by `FREE_GROK_TEMPLATES`, not `FREE_SKILLS`.
//
// FROM THE TEMPLATE (content/grok-bot-templates/<collection>/<id>/SKILL.md, the PM's finished source):
//   the name to mention (its frontmatter `name`), the schedule and the example cron ("Recommended
//   routine"), the routine prompt to save, word for word, the sample ("Sample output (EXAMPLE DATA
//   ONLY)", drawn as the page's picture) and the guardrails ("Guardrails", as "What it never does").
//   The procedure is the template's, and is not on the page.
// FROM THE README (content/grok-bot-templates/README.md, "How a member uses a template"): the setup
//   order (connect, answer the setup questions, save the routine, run it once by hand, approve
//   write-actions line by line), logins saved in the vault and never pasted in a chat, and the shared
//   rules the FAQ repeats: read-only and drafts by default, approval of named items in that same
//   conversation, support only and not tax, legal or compliance advice, Utah-first with a general mode.
// LEFT OPEN: Grok Bot's own screens. No click path is given for adding a skill or saving a routine,
//   because none was supplied or checked; the steps say what to do, not where to click.
//
// House rules: no em dashes, short plain sentences, one action a step.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { grokTemplate, type GrokTemplate } from '@ai/core/grok-templates';
import type { Guide, Inline, SampleBlock, Section, SetupStep, Step } from './content';

/** The repository's root: from the working directory up, to the folder that holds the templates. */
function root(): string {
  let dir = process.cwd();
  while (!existsSync(join(dir, 'content', 'grok-bot-templates', 'README.md')) && dirname(dir) !== dir) dir = dirname(dir);
  return dir;
}

/** A template's SKILL.md, as committed. Read at build time: a page's words never ship as a script. */
export function grokSource(t: GrokTemplate): string {
  return readFileSync(join(root(), 'content', 'grok-bot-templates', t.collection, t.id, 'SKILL.md'), 'utf8');
}

/** A `## heading` section's lines, without the heading, up to the next `## `. */
function section(text: string, heading: string): string[] {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## ${heading}`));
  if (start < 0) throw new Error(`No "## ${heading}" section`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return end < 0 ? rest : rest.slice(0, end);
}

/** Markdown's emphasis and code marks taken off, for a plain string. */
const plain = (s: string): string =>
  s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/ {2,}$/, '')
    .trim();

/** Code and italic marks taken off, the spacing kept, for a run inside a paragraph. */
const unmark = (s: string): string => s.replace(/`([^`]+)`/g, '$1').replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1$2');

/** A paragraph's runs: its bold as `{ strong }`, everything else as written. */
function runs(s: string): Inline[] {
  const out: Inline[] = [];
  s.split('**').forEach((part, i) => {
    if (part === '') return;
    out.push(i % 2 === 1 ? { strong: unmark(part) } : unmark(part));
  });
  return out;
}

const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isItem = (l: string) => /^\s*(?:[-*]|\d+\.)\s+/.test(l);
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => plain(c));

/**
 * The template's sample, as the page's blocks: a line that is all bold is a heading, a run of list
 * items a list, a pipe table a table, and every other run of lines a paragraph. Its words are the
 * template's, with only the Markdown marks taken off.
 */
export function sampleBlocks(text: string): SampleBlock[] {
  const lines = section(text, 'Sample output (EXAMPLE DATA ONLY)');
  const blocks: SampleBlock[] = [];
  let caption = 'Example';
  for (let i = 0; i < lines.length; ) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    const heading = /^\*\*([^*]+)\*\*\s*$/.exec(line.trim());
    if (heading) {
      caption = plain(heading[1] ?? '');
      blocks.push({ h: caption });
      i += 1;
    } else if (isRow(line)) {
      const rows: string[][] = [];
      while (i < lines.length && isRow(lines[i] ?? '')) {
        const row = cells(lines[i] ?? '');
        if (!row.every((c) => /^:?-+:?$/.test(c))) rows.push(row);
        i += 1;
      }
      const [head = [], ...body] = rows;
      blocks.push({ table: { caption, head, rows: body } });
    } else if (isItem(line)) {
      const items: string[] = [];
      while (i < lines.length && isItem(lines[i] ?? '')) {
        items.push(plain((lines[i] ?? '').replace(/^\s*(?:[-*]|\d+\.)\s+/, '')));
        i += 1;
      }
      blocks.push({ items });
    } else {
      const para: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim() !== '' && !isRow(lines[i] ?? '') && !isItem(lines[i] ?? '') && !/^\*\*[^*]+\*\*\s*$/.test((lines[i] ?? '').trim())) {
        para.push((lines[i] ?? '').trim());
        i += 1;
      }
      blocks.push({ p: runs(para.join(' ')) });
    }
  }
  return blocks;
}

/** The routine the template recommends: when, its first example cron, and the prompt to save. */
export function routineOf(text: string): { schedule: string; cron: string; prompt: string } {
  const body = section(text, 'Recommended routine').join('\n');
  const schedule = /\*\*Schedule:\*\*\s*(.+)/.exec(body)?.[1]?.trim();
  const cron = /\*\*Cron \([^)]*\):\*\*\s*`([^`]+)`/.exec(body)?.[1];
  const prompt = /\*\*Routine prompt to save:\*\*\s*\n+```\n([\s\S]+?)\n```/.exec(body)?.[1];
  if (!schedule || !cron || !prompt) throw new Error('The routine needs a schedule, a cron and a prompt');
  return { schedule, cron, prompt };
}

/** The guardrails, each as its bold title and the rest of its line. */
export function guardrailsOf(text: string): { title: string; body: string }[] {
  return section(text, 'Guardrails')
    .filter((l) => /^- \*\*/.test(l))
    .map((l) => {
      const m = /^- \*\*([^*]+)\*\*\s*(.*)$/.exec(l);
      return { title: plain(m?.[1] ?? '').replace(/[.:]$/, ''), body: plain(m?.[2] ?? '') };
    });
}

/** The name Grok Bot knows the skill by, which the setup and the routine prompt mention. */
export const nameOf = (text: string): string => /^name:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? '';

/** "Weekly", "Monthly", "Daily" or "Weekdays", read off the schedule, as the page's fact and hero step. */
function cadence(schedule: string): string {
  const first = /^(Weekly|Monthly|Daily|Weekdays)/.exec(schedule)?.[1];
  if (!first) throw new Error(`No cadence in "${schedule}"`);
  return first === 'Weekdays' ? 'on weekdays' : first.toLowerCase();
}

export interface GrokPage {
  /** The template's id: its page, its ZIP, the sign-up `source` and the GoHighLevel tag. */
  slug: string;
  meta: { title: string; description: string };
  /** The hero's small line, like "Free Grok Bot Template · Bookkeeping". */
  eyebrow: string;
  lede: string;
  /** The hero's third step: what the person ends up with. */
  outcome: Step;
  optInBody: string;
  /** What to connect in Grok Bot first, in the page's words, from the README's listing. */
  connect: readonly Inline[];
  /** The sample's title, over the template's own example. */
  sampleTitle: string;
  /** Questions this template alone answers, after the shared ones. */
  faq?: ReadonlyArray<{ q: string; a: readonly Inline[] }>;
  /** A pointer to a skill or another template, as the page's last line. */
  note?: readonly Inline[];
  /** localStorage: this device already opted in. */
  unlockKey: string;
}

/** A template's page, as a guide: its own words, the template's own routine and sample, and the shared steps. */
export function grokPage(p: GrokPage): Guide {
  const t = grokTemplate(p.slug);
  if (!t) throw new Error(`No Grok Bot template with the id "${p.slug}"`);
  const text = grokSource(t);
  const name = nameOf(text);
  const routine = routineOf(text);
  const when = cadence(routine.schedule);
  const support = t.collection === 'bookkeeping' ? 'bookkeeping' : 'transaction';
  const setup: SetupStep[] = [
    {
      title: 'Download the Template',
      body: ['One ZIP. ', { strong: 'Unzip it.' }, ' Inside is one file, ', { strong: 'SKILL.md' }, ', the template.'],
      action: 'download',
    },
    {
      title: 'Add It to Grok Bot',
      body: ['Add ', { strong: 'SKILL.md' }, ' to Grok Bot as a new skill.'],
      note: ['It’s a Grok Bot skill, not a Claude Skill. It doesn’t go in Claude.'],
    },
    {
      title: 'Connect What It Reads',
      body: p.connect,
      note: ['Save bank, card and other logins in the vault. Never paste a password or a code into the chat.'],
    },
    {
      title: 'Answer the Setup Questions',
      body: ['Start a chat in Grok Bot, mention ', { strong: `@${name}` }, ', and answer its setup questions one at a time. It remembers your answers.'],
    },
    {
      title: 'Save the Routine',
      body: ['Save the routine the template recommends. When: ', routine.schedule, ' Then paste this prompt.'],
      copyBlock: routine.prompt,
      note: [`Its example cron is ${routine.cron}, in Central time. Use your own time zone.`],
    },
    {
      title: 'Run It Once Today',
      body: ['Run it once by hand today, so the first report exists.'],
      note: ['When a run proposes a change, approve it line by line. Nothing changes until you do.'],
    },
  ];
  const sections: Section[] = [
    {
      kind: 'sample',
      eyebrow: 'Example Output',
      heading: 'What a run looks like',
      body: 'The template’s own example, word for word. Every name, number and address in it is made up.',
      title: p.sampleTitle,
      note: 'Example data only.',
      blocks: sampleBlocks(text),
    },
    { kind: 'list', heading: 'What it never does', items: guardrailsOf(text) },
    {
      kind: 'faq',
      heading: 'Questions',
      items: [
        {
          q: 'Is this a Claude Skill?',
          a: [
            'No. It’s a Grok Bot template: one file that Grok Bot loads and runs on the schedule you save. The ',
            { link: 'Claude Skills', href: '/library', sameTab: true },
            ' in the library are separate.',
          ],
        },
        {
          q: 'Will it change anything on its own?',
          a: ['No. It reads and drafts. It changes, sends or posts only the items you approve by name, in that same chat.'],
        },
        { q: 'When does it run?', a: [`The template recommends this: ${routine.schedule}`] },
        ...(/\bUtah\b/.test(text)
          ? [{ q: 'Does it work outside Utah?', a: ['Yes. It handles Utah files the Utah way first, and anything else in a general mode.'] }]
          : []),
        {
          q: `Is this ${t.collection === 'bookkeeping' ? 'tax, legal or compliance' : 'legal or compliance'} advice?`,
          a: [`No. It’s ${support} support only. Your ${t.collection === 'bookkeeping' ? 'CPA, broker or attorney' : 'broker or attorney'} makes those calls.`],
        },
        ...(p.faq ?? []),
      ],
    },
    ...(p.note ? [{ kind: 'note' as const, body: p.note }] : []),
  ];
  return {
    slug: p.slug,
    grok: t.id,
    meta: p.meta,
    hero: {
      eyebrow: p.eyebrow,
      title: t.title,
      lede: p.lede,
      steps: [
        { n: '01', title: 'Add It to Grok Bot', body: 'One file, set up once.' },
        { n: '02', title: 'Save the Routine', body: `It runs ${when}.` },
        { ...p.outcome, n: '03' },
      ],
    },
    optIn: { anchor: 'get-the-template', heading: 'Get the free template', body: p.optInBody, button: 'Get the Template' },
    download: {
      heading: 'It’s yours.',
      body: 'Set it up once in Grok Bot. Then it runs on its own schedule.',
      href: `/downloads/${t.file}`,
      filename: t.file,
      inApp: 'In the Instagram app? Tap the ••• menu and choose Open in browser, then download it there.',
      setup,
    },
    sections,
    unlockKey: p.unlockKey,
    layout: 'skill',
    facts: ['Free', `Runs ${when}`, 'Grok Bot'],
    bar: 'Get the Free Template',
  };
}
