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
// FROM GROK BOT'S DOCS (docs.x.ai/grok-bot, read 2026-11-10): every label in the setup. Create a Bot
//   with + (New Bot) and Create; a skill is saved by asking in chat (no upload control is documented
//   for a personal Bot); Connect apps, Authorize, Installed and Reconnect; Settings > Vault (New item,
//   Login, Save login); the timezone in Settings, under Bot; a routine's Details, When to run, Edit and
//   Test (Running…); the approval card's Allow once, Always allow and Deny; Open computer and Take
//   control. QuickBooks Online is not among the apps the docs name, so a bookkeeping template's setup
//   gives the template's own fallback (a CSV export) and a custom connector.
//
// House rules: no em dashes, short plain sentences, one action a step.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { grokTemplate, isFreeGrokTemplate, type GrokTemplate } from '@ai/core/grok-templates';
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

/** What the template's first run returns: its chat summary's parts and its workbook's sheets. */
export function resultOf(text: string): { summary: string[]; sheets: string[] } {
  const lines = section(text, 'Output format');
  const take = (start: RegExp, item: RegExp) => {
    const at = lines.findIndex((l) => start.test(l));
    if (at < 0) return [];
    const out: string[] = [];
    for (const l of lines.slice(at + 1)) {
      if (l.trim() === '') {
        if (out.length) break;
        continue;
      }
      const m = item.exec(l);
      if (!m) break;
      out.push(plain(m[1] ?? ''));
    }
    return out;
  };
  const summary = take(/^\*\*Chat (summary|digest)/, /^- (.+)$/).filter((s) => !/^One line:/.test(s));
  const sheets = take(/^\*\*Workbook sheets:\*\*/, /^\d+\.\s+`([^`]+)`/);
  if (!summary.length) throw new Error('The output format needs a chat summary');
  return { summary, sheets };
}

/** One app, two apps, or "a, b and c", each in bold, for a step's words. */
function apps(names: readonly string[]): Inline[] {
  const out: Inline[] = [];
  names.forEach((n, i) => {
    if (i > 0) out.push(i === names.length - 1 ? ' and ' : ', ');
    out.push({ strong: n });
  });
  return out;
}

/** The docs this page's Grok Bot steps follow, read 2026-11-10 (D-100). */
const GROK_DOCS = 'https://docs.x.ai/grok-bot/get-started';

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
  /** The apps to add in Grok Bot's Connect apps, from the template's "What it connects to". */
  apps: readonly string[];
  /** What this template alone needs connected besides them, in the page's words. */
  connectNote?: readonly Inline[];
  /** The sample's title, over the template's own example. */
  sampleTitle: string;
  /** Questions this template alone answers, after the shared ones. */
  faq?: ReadonlyArray<{ q: string; a: readonly Inline[] }>;
  /** A pointer to a skill or another template, as the page's last line. */
  note?: readonly Inline[];
  /** localStorage: this device already opted in. */
  unlockKey: string;
}

/** What the guided setup in Grok Bot needs to know about one template (D-100, D-108). */
export interface GrokSetup {
  /** The Bot's name: the template's title. */
  title: string;
  /** The template itself, its SKILL.md as committed. */
  text: string;
  /** Its ZIP under `apps/web/public/downloads`. */
  file: string;
  /** A free template's step 2 copies the whole template; a paid one's says to get it from the Skill Library (D-101). */
  free: boolean;
  /** The apps to add in Connect apps. */
  apps: readonly string[];
  /** The Connect Its Apps step's first note: what the template reads beyond those apps, and its fallback. */
  appsNote: readonly Inline[];
  /** Anything else this template alone needs connected, after it. */
  connectNote?: readonly Inline[];
  /** The last step's words, when a good first result is not a chat summary and a dated workbook. */
  firstResult?: string;
}

/**
 * The seven steps in Grok Bot every template's setup shares (Connor, 2026-11-10: the setup is the
 * primary path, and the ZIP an extra): create the Bot, save the template as a skill, connect its apps,
 * answer its setup questions, save its routine, run a first test and check it. Every label is Grok
 * Bot's own, from docs.x.ai/grok-bot. The shelf's pages (`grokPage`) and a skill's Grok Bot lane
 * (Morning Brief, D-108) both draw it.
 */
export function grokSetup(s: GrokSetup): SetupStep[] {
  const text = s.text;
  const name = nameOf(text);
  const routine = routineOf(text);
  const run = `Run @${name} now`;
  const save = `Save these instructions as a skill called "${name}". Keep them exactly as written.`;
  return [
    {
      title: 'Create the Bot',
      body: [
        'In Grok Bot, click ',
        { strong: '+' },
        ' at the top of the sidebar (',
        { strong: 'New Bot' },
        '). Name it ',
        { strong: s.title },
        ', pick a shape and a color, then click ',
        { strong: 'Create' },
        '.',
      ],
      action: { label: 'Open the Grok Bot Guide', href: GROK_DOCS },
      note: [
        'On a team, ',
        { strong: '+' },
        ' opens a menu: choose ',
        { strong: 'Create a Bot' },
        '. To check your plan includes Grok Bot, open ',
        { strong: 'Settings > Usage & Billing' },
        '.',
      ],
    },
    s.free
      ? {
          title: 'Save the Template as a Skill',
          body: ['In the new Bot’s chat, paste this and send it. It saves the whole template as a skill called ', { strong: name }, '.'],
          copyBlock: `${save}\n\n${text.trimEnd()}`,
          // The ZIP, as a second button under the words: the guided setup is the way in (Connor, 2026-11-10).
          action: { label: 'Download the File', href: `/downloads/${s.file}`, download: s.file },
          note: ['The file is the same template, to keep. You don’t need it for this step.'],
        }
      : {
          // A paid template's words stay in the Skill Library (D-101): the page says what to paste
          // them under, and its button goes there for the file.
          title: 'Save the Template as a Skill',
          body: [
            'Download the template from the Skill Library and unzip it. In the new Bot’s chat, paste these words, then paste everything in ',
            { strong: 'SKILL.md' },
            ' under them and send. It saves the whole template as a skill called ',
            { strong: name },
            '.',
          ],
          copy: save,
          action: { label: 'Download the File', href: `/downloads/${s.file}`, download: s.file },
          note: ['Paste all of SKILL.md, top to bottom, and change nothing in it.'],
        },
    {
      title: 'Connect Its Apps',
      body: [
        'Click ',
        { strong: 'Connect apps' },
        ' in the sidebar. Search for each of these, add it, choose ',
        { strong: 'Authorize' },
        ' and finish signing in: ',
        ...apps(s.apps),
        '. Each is ready when it shows under ',
        { strong: 'Installed' },
        '.',
      ],
      note: [
        ...s.appsNote,
        ...(s.connectNote ? [' ', ...s.connectNote] : []),
        ' Save any other login in ',
        { strong: 'Settings > Vault' },
        ' (',
        { strong: 'New item' },
        ', ',
        { strong: 'Login' },
        ', ',
        { strong: 'Save login' },
        '). The Bot never sees a saved password. Never paste a password or a code into the chat.',
      ],
    },
    {
      title: 'Answer the Setup Questions',
      body: ['Paste this in the Bot’s chat. It asks its setup questions one at a time and remembers your answers.'],
      copy: `Set up @${name}. Ask me your setup questions one at a time, and remember my answers.`,
      note: ['There’s no memory screen. To check what it kept, ask: ', { strong: 'What do you remember about this setup?' }],
    },
    {
      title: 'Set the Schedule',
      body: [
        'In ',
        { strong: 'Settings' },
        ', under ',
        { strong: 'Bot' },
        ', check ',
        { strong: 'Timezone' },
        ' (',
        { strong: 'Auto-detect' },
        ' follows this computer). Then paste this in the chat. It saves the routine on the template’s schedule: ',
        routine.schedule,
      ],
      copyBlock: `Set up a routine to run @${name} on this schedule: ${routine.schedule}\n\nEach time, use this prompt:\n\n${routine.prompt}`,
      note: [
        'To check it, click the Bot’s name at the top of the chat, open ',
        { strong: 'Details' },
        ' and look at ',
        { strong: 'When to run' },
        '. ',
        { strong: 'Edit' },
        ` changes it. The template’s cron is ${routine.cron}. A new routine waits for its next time; it doesn’t run when it’s saved.`,
      ],
    },
    {
      title: 'Run a First Test',
      body: [
        'Open the routine in ',
        { strong: 'Details' },
        ' and choose ',
        { strong: 'Test' },
        '. It reads ',
        { strong: 'Running…' },
        ' and the result comes back in the chat. Or paste this to run it now.',
      ],
      copy: `${run} as a first test. Use what you remember, ask me anything still missing, and change nothing.`,
      note: [
        'A test does real work and counts toward your usage. Before it changes anything, an approval card asks first: ',
        { strong: 'Allow once' },
        ', ',
        { strong: 'Always allow' },
        ' or ',
        { strong: 'Deny' },
        '. An email waits as a draft until you press ',
        { strong: 'Send' },
        '.',
      ],
    },
    {
      title: 'Check the First Result',
      body: [s.firstResult ?? 'Compare it with the example on this page. A good first result has a short chat summary and a dated workbook, and changes nothing.'],
      note: ['Something looks wrong? See ', { strong: 'If something goes wrong' }, ', below.'],
    },
  ];
}

/**
 * A template's page, as a guide: its own words, the template's own instructions, routine, sample and
 * guardrails, and the guided setup every template shares (Connor, 2026-11-10: the setup is the
 * primary path, and the ZIP an extra). The setup's labels are Grok Bot's own, from docs.x.ai/grok-bot
 * (get-started, bots, skills-routines-and-automations, computer-and-apps, vault,
 * approvals-security-and-privacy), read 2026-11-10.
 */
export function grokPage(p: GrokPage): Guide {
  const t = grokTemplate(p.slug);
  if (!t) throw new Error(`No Grok Bot template with the id "${p.slug}"`);
  const text = grokSource(t);
  const routine = routineOf(text);
  const result = resultOf(text);
  const when = cadence(routine.schedule);
  const books = t.collection === 'bookkeeping';
  const support = books ? 'bookkeeping' : 'transaction';
  const run = `Run @${nameOf(text)} now`;
  // Bookkeeping reads QuickBooks Online, which Grok Bot's docs do not list as an app; the template's own
  // fallback is an export. A transaction template reads whatever system the team uses (its own words).
  const collectionNote: Inline[] = books
    ? [
        'If Connect apps doesn’t list QuickBooks Online, export the report the Bot asks for from QuickBooks as a CSV and attach it in the chat, or add a QuickBooks connector you trust with ',
        { strong: 'Add a custom connector' },
        ' at the bottom of Connect apps.',
      ]
    : [
        'Your transaction system: Dotloop, SkySlope, Brokermint, Lone Wolf, Paperless Pipeline or Open to Close. Add it in Connect apps if it’s listed. If not, save its login in the Vault so the Bot can read it in its own browser, or keep exports in a Google Drive folder. No system? A Google Sheet and Gmail work.',
      ];
  const setup = grokSetup({
    title: t.title,
    text,
    file: t.file,
    free: isFreeGrokTemplate(t.id),
    apps: p.apps,
    appsNote: collectionNote,
    ...(p.connectNote ? { connectNote: p.connectNote } : {}),
  });
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
    {
      kind: 'list',
      heading: 'What a good first result looks like',
      items: [
        { title: 'In the chat', body: `A short summary: ${result.summary.map((s) => s.replace(/\.$/, '')).join('; ')}.` },
        ...(result.sheets.length ? [{ title: 'In Google Drive', body: `A dated workbook with these sheets: ${result.sheets.join(', ')}.` }] : []),
        { title: books ? 'In your books' : 'In your files', body: 'Nothing changed. Anything it proposes waits for your approval.' },
      ],
    },
    { kind: 'list', heading: 'What it never does', items: guardrailsOf(text) },
    {
      kind: 'faq',
      heading: 'If something goes wrong',
      items: [
        {
          q: 'An app says Added, but the Bot can’t read it.',
          a: ['Added means installed, not signed in. In ', { strong: 'Connect apps' }, ', choose ', { strong: 'Reconnect' }, ' and finish the sign-in. It’s ready when it shows under ', { strong: 'Installed' }, '.'],
        },
        books
          ? { q: 'It can’t find QuickBooks.', a: ['Export the report it asks for from QuickBooks Online as a CSV and attach it in the chat. It works from the export.'] }
          : { q: 'It can’t read our transaction system.', a: ['Save its login in the Vault so the Bot can read it in its own browser, or put an export in a Google Drive folder and tell the Bot where. A Google Sheet and Gmail also work.'] },
        {
          q: 'It asks for a password or a code.',
          a: ['Don’t paste it in the chat. Save the login in ', { strong: 'Settings > Vault' }, ', or choose ', { strong: 'Open computer' }, ', then ', { strong: 'Take control' }, ', finish the step yourself and tell the Bot to continue.'],
        },
        {
          q: 'It ran at the wrong time.',
          a: ['Check ', { strong: 'Timezone' }, ' in ', { strong: 'Settings' }, ', under ', { strong: 'Bot' }, '. Then open the routine in ', { strong: 'Details' }, ' and check ', { strong: 'When to run' }, '.'],
        },
        {
          q: 'There’s no Test button, or it says Couldn’t start a test run.',
          a: ['Check its apps show under ', { strong: 'Installed' }, ', then run it from the chat instead: ', { strong: run }, '.'],
        },
        {
          q: 'It used an old answer.',
          a: ['Tell it what changed in the chat, starting ', { strong: 'That’s out of date.' }, ' It updates what it remembers.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Questions',
      items: [
        {
          q: 'Is this a Claude Skill?',
          a: [
            'No. It’s a Grok Bot template: one set of instructions Grok Bot saves as a skill and runs on the schedule you set. The ',
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
          q: `Is this ${books ? 'tax, legal or compliance' : 'legal or compliance'} advice?`,
          a: [`No. It’s ${support} support only. Your ${books ? 'CPA, broker or attorney' : 'broker or attorney'} makes those calls.`],
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
        { n: '01', title: 'Create the Bot', body: 'In Grok Bot, step by step, with every prompt to copy.' },
        { n: '02', title: 'Save the Routine', body: `It runs ${when}.` },
        { ...p.outcome, n: '03' },
      ],
    },
    optIn: { anchor: 'get-the-template', heading: 'Get the free template', body: p.optInBody, button: 'Get the Template' },
    download: {
      heading: 'It’s yours.',
      body: 'Set it up once in Grok Bot, one step at a time. Then it runs on its own schedule.',
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
