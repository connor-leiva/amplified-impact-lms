// What every free skill's page says the same way (DECISIONS.md D-052): the hero's steps, the opt-in,
// and the setup that follows it, in Claude and, for a skill with a ChatGPT version, in ChatGPT. A
// skill's page file (`<slug>.ts`) holds only its own words and calls `skillPage()`.
//
// The setup is the Reel Editor's (D-045) plus what a skill for client files needs: training turned
// off before any real file goes in, and a made-up example to practise on first. Each click path is
// the vendor's own, checked against its help center:
//   - Claude: Settings > Capabilities, "Code execution and file creation", on by default for Free,
//     Pro, Max and Ultra and called "Create and edit files" in the newer settings (Claude's help
//     center, "Create and edit files with Claude", modified 2026-11-05); Customize > Skills, +,
//     Create skill, Upload a skill ("Use skills in Claude", modified 2026-10-30); Settings > Privacy,
//     the switch that starts "Help improve" (D-048; the Privacy Center names it "Help Improve our AI
//     models" at claude.ai/settings/data-privacy-controls); Team and Enterprise chats are not used for
//     training (Anthropic's Privacy Center). Checked 2026-11-08.
//   - ChatGPT: a Project, never a custom GPT (OpenAI retires custom GPTs on December 11, 2026). New
//     project, the name, Create project; the three dots, Project settings, Instructions, Save; files
//     on the Sources tab; Data controls, "Improve the model for everyone", Done; a thumbs up or down
//     can still send a chat for training (all as /retool has them, checked 2026-10-22, D-048, D-049).
//     Free ChatGPT holds 5 files in a Project, and `scripts/skills.mjs` holds every ChatGPT version
//     to 4.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Guide, Inline, Section, SetupStep, Step } from './content';

/**
 * The words for a skill's ChatGPT Project Instructions box, read from its source,
 * `skills/<name>/chatgpt/paste.txt`, so the page and the ZIP can never say two different things. Read
 * at build time: a page's words are rendered by Vite into HTML and never ship to the browser. From
 * the working directory up to the repository root, which holds `skills/README.md`.
 */
export function chatgptPaste(name: string): string {
  let dir = process.cwd();
  while (!existsSync(join(dir, 'skills', 'README.md')) && dirname(dir) !== dir) dir = dirname(dir);
  return readFileSync(join(dir, 'skills', name, 'chatgpt', 'paste.txt'), 'utf8');
}

const ORIGIN = 'https://www.amplifiedimpact.io';

export interface SkillPage {
  /** The page's path without its slash: also the sign-up `source` and the GoHighLevel tag. */
  slug: string;
  /** The skill's own name (its ZIP and folder), when it is not the slug. */
  skill?: string;
  /** The skill's name on the page, as in "Download for ChatGPT" and the Project's name. */
  title: string;
  meta: { title: string; description: string };
  /** The hero's small line, like "Free Claude Skill · For Buyer's Agents". */
  eyebrow: string;
  lede: string;
  /** The hero's third step: what the person ends up with. */
  outcome: Step;
  optInBody: string;
  /** About how many minutes setup takes, said on the unlocked card. */
  setupMinutes: number;
  /**
   * What to say with the practice files attached, and anything to add under it. `zip`: attach the
   * practice ZIP as it is rather than its files, for a practice set too big to attach file by file
   * (a Claude chat takes 20 files; Claude unpacks a ZIP itself).
   */
  practice: { prompt: string; note?: readonly Inline[]; zip?: boolean };
  /** The last step: using it on real files. */
  real: { body: readonly Inline[]; prompt?: string; note?: readonly Inline[] };
  /** The skill's ChatGPT Project version: the words for the Project's Instructions box (its `chatgpt/paste.txt`). */
  chatgpt?: { paste: string };
  /**
   * Steps this skill alone needs in Claude, such as an account to make or a connector to switch on.
   * They come after the practice, which needs neither, and before the person's own files.
   */
  extraClaudeSteps?: readonly SetupStep[];
  sections: readonly Section[];
  /** localStorage: this device already opted in. */
  unlockKey: string;
}

/** The voice profile guide, for drafts that sound like the person (D-040). */
const VOICE: readonly Inline[] = [
  'Made your voice profile with ',
  { link: 'our free guide', href: '/voice-profile' },
  '? Start these chats inside your ',
  { strong: 'My Voice' },
  ' project, so drafts sound like you.',
];

const CHECK_BEFORE_SENDING: readonly Inline[] = [
  'Before anything goes out, check every date, dollar amount and page number in the ',
  { strong: 'Check before sending' },
  ' list against your documents.',
];

function claudeSetup(p: SkillPage, skill: string): SetupStep[] {
  return [
    {
      title: 'Check Code Execution Is On',
      body: [
        'In Claude, open ',
        { strong: 'Settings > Capabilities' },
        ' and make sure ',
        { strong: 'Code execution and file creation' },
        ' is on. Skills need it. It’s on unless someone turned it off.',
      ],
      action: { label: 'Open Claude Settings', href: 'https://claude.ai/settings/capabilities' },
      note: [
        'In Claude’s newer settings it’s called Create and edit files. On a Team or Enterprise plan, an owner turns it on in Organization settings.',
      ],
    },
    {
      title: 'Download the Skill',
      body: ['One ZIP file. ', { strong: 'Don’t unzip it.' }],
      action: 'download',
      note: [`On a Mac, Safari may unzip it for you. If you get a ${skill} folder, right-click it and choose Compress.`],
    },
    {
      title: 'Add It to Claude',
      body: [
        'Open ',
        { strong: 'Customize > Skills' },
        ', click ',
        { strong: '+' },
        ', then ',
        { strong: 'Create skill > Upload a skill' },
        ', and choose the ZIP. Make sure it’s switched on.',
      ],
      action: { label: 'Open Claude Skills', href: 'https://claude.ai/customize/skills' },
    },
    {
      title: 'Turn Off Training First',
      body: [
        'Before any real client file goes in, click your name in the bottom left corner of Claude, then ',
        { strong: 'Settings' },
        ', then ',
        { strong: 'Privacy' },
        '. Turn off the switch that starts with ',
        { strong: 'Help improve' },
        '.',
      ],
      action: { label: 'Open Claude Privacy Settings', href: 'https://claude.ai/settings/data-privacy-controls' },
      note: [
        'On a Team or Enterprise plan, chats aren’t used for training. In chats with real client files, don’t tap thumbs up or thumbs down.',
      ],
    },
    practiseStep(p, skill, 'Start a new chat in Claude', VOICE),
    ...(p.extraClaudeSteps ?? []),
    realStep(p),
  ];
}

function chatgptSetup(p: SkillPage, skill: string, paste: string): SetupStep[] {
  return [
    {
      title: 'Turn Off Training First',
      body: [
        'Before any real client file goes in, click your name in the bottom left corner of ChatGPT, then ',
        { strong: 'Settings' },
        ', then ',
        { strong: 'Data controls' },
        '. Turn off ',
        { strong: 'Improve the model for everyone' },
        ', then click ',
        { strong: 'Done' },
        '.',
      ],
      action: { label: 'Open ChatGPT', href: 'https://chatgpt.com/' },
      note: ['In chats with real client files, don’t tap thumbs up or thumbs down. A rating can still send the chat to OpenAI.'],
    },
    {
      title: 'Download the ChatGPT Version',
      body: ['One ZIP. ', { strong: 'Unzip it.' }, ' Inside are the files for a ChatGPT Project.'],
      action: { label: 'Download for ChatGPT', href: `/downloads/${skill}-chatgpt.zip`, download: `${skill}-chatgpt.zip` },
    },
    {
      title: 'Make a Project',
      body: [
        'On the left side of ChatGPT, click ',
        { strong: 'New project' },
        '. Type ',
        { strong: p.title },
        ' as the name, then click ',
        { strong: 'Create project' },
        '.',
      ],
      note: ['A Project is a folder in ChatGPT that keeps instructions and files together. Free ChatGPT allows 5 files in a Project. This one needs 4 or fewer.'],
    },
    {
      title: 'Add the Files',
      body: [
        'Open the Project and click the ',
        { strong: 'Sources' },
        ' tab. Add each file from the ZIP whose name ends in ',
        { strong: '.md' },
        ', one at a time.',
      ],
    },
    {
      title: 'Paste the Instructions',
      body: [
        'Click the three dots (',
        { strong: '•••' },
        ') at the top right of the Project page, then ',
        { strong: 'Project settings' },
        '. Click in the ',
        { strong: 'Instructions' },
        ' box, paste these words, then click ',
        { strong: 'Save' },
        '.',
      ],
      copyBlock: paste,
      note: ['Made your voice profile? Paste its QUICK CARD at the end, where the words say to.'],
    },
    // No My Voice line here: in ChatGPT the skill is its own Project, and the voice comes from the
    // QUICK CARD pasted into that Project's instructions (the step before).
    practiseStep(p, skill, 'In the Project, start a new chat', []),
    realStep(p),
  ];
}

function practiseStep(p: SkillPage, skill: string, where: string, voice: readonly Inline[]): SetupStep {
  const body: readonly Inline[] = p.practice.zip
    ? ['Download the practice files. ', { strong: 'Don’t unzip them.' }, ` ${where}, attach the ZIP, and say this.`]
    : [`Download the practice files and unzip them. ${where}, attach the files, and say this.`];
  return {
    title: 'Practise on the Made-Up Example',
    body,
    action: { label: 'Download Practice Files', href: `/downloads/${skill}-practice.zip`, download: `${skill}-practice.zip` },
    copy: p.practice.prompt,
    note: [...(p.practice.note ?? ['Every name, address and number in them is made up. ']), ...voice],
  };
}

function realStep(p: SkillPage): SetupStep {
  return {
    title: 'Use It on Your Own Files',
    body: p.real.body,
    ...(p.real.prompt === undefined ? {} : { copy: p.real.prompt }),
    note: p.real.note ?? CHECK_BEFORE_SENDING,
  };
}

/** A skill's page, as a guide: its own words, and everything every skill page says the same way. */
export function skillPage(p: SkillPage): Guide {
  const skill = p.skill ?? p.slug;
  const sendUrl = `${ORIGIN}/${p.slug}#download`;
  const sendTitle = `${p.title}: set it up on your computer`;
  const first: Step = p.chatgpt
    ? { n: '01', title: 'Set It Up Once', body: `In Claude or ChatGPT, about ${p.setupMinutes} minutes.` }
    : { n: '01', title: 'Add It to Claude', body: `One file, about ${p.setupMinutes} minutes, once.` };
  return {
    slug: p.slug,
    meta: p.meta,
    hero: {
      eyebrow: p.eyebrow,
      title: p.title,
      lede: p.lede,
      steps: [first, { n: '02', title: 'Practise First', body: 'On a made-up example we include.' }, { ...p.outcome, n: '03' }],
    },
    optIn: { anchor: 'get-the-skill', heading: 'Get the free skill', body: p.optInBody, button: 'Get the Skill' },
    download: {
      heading: 'It’s yours.',
      body: `Set it up once, in about ${p.setupMinutes} minutes. It’s easiest on a computer.`,
      href: `/downloads/${skill}.zip`,
      filename: `${skill}.zip`,
      handoff: {
        body: 'On a phone or tablet? Setting up a skill is easiest on a computer. Send yourself this page and finish there.',
        label: 'Send This to My Computer',
        href: `mailto:?subject=${encodeURIComponent(sendTitle)}&body=${encodeURIComponent(`Open this on your computer:\n${sendUrl}`)}`,
        share: { title: sendTitle, url: sendUrl },
      },
      inApp: 'In the Instagram app? Tap the ••• menu and choose Open in browser, then download it there.',
      setup: claudeSetup(p, skill),
      ...(p.chatgpt
        ? {
            chatgpt: {
              question: 'Which AI app do you use?',
              claude: 'Claude',
              chatgpt: 'ChatGPT',
              setup: chatgptSetup(p, skill, p.chatgpt.paste.trim()),
            },
          }
        : {}),
    },
    sections: p.sections,
    unlockKey: p.unlockKey,
  };
}
