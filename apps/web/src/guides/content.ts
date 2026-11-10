// The free guides: one landing page per lead magnet, each gated on an email opt-in, all built from
// one renderer (`render.ts`), one stylesheet and one script. DECISIONS.md D-038, D-039 and D-045.
//
// A guide's words live in its own file (`task-sync-starter.ts`, `ops-time-audit.ts`,
// `reel-editor.ts`); this file holds the shape they share, what every guide page says the same way
// (the consent line, the in-app browser hint, the footer), and the list of guides. To add one: write
// its file, add it to `GUIDES`, add `apps/web/<slug>.html` (a copy of another guide's shell), put its
// file in `public/downloads/`, add its slug to the API's `GUIDE_SLUGS`
// (`apps/api/src/routes/guide-list.ts`), and list it in the free library
// (`ENTRIES` in `src/library/content.ts`, D-050).
//
// Most guides are a PDF: saved, then read. A Claude skill (the Reel Editor, D-045) is a ZIP that has
// to be added to Claude before it does anything, so its download carries `setup`, the steps that
// follow, and `handoff`, the way a phone sends the page to a computer to do them.
//
// A PAID SKILL (D-079, D-081). Every skill page names its skill in the library's catalog (`skill`).
// Unless `FREE_SKILLS` names it, the skill is in the Skill Library on the platform: its page keeps
// the hero and the sample, and shows the Skill Library card in place of the sign-up and the setup,
// with no link to a ZIP (`inSkillLibrary`). Its own words and setup stay in its file, so naming it in
// `FREE_SKILLS` brings the download back with no other edit.
//
// Nothing here is markup: `render.ts` escapes every string. House rules: no em dashes, short plain
// sentences.

import { isFreeSkill } from '@ai/core/skills';
import { OPS_TIME_AUDIT } from './ops-time-audit';
import { REEL_EDITOR } from './reel-editor';
import { TASK_SYNC_STARTER } from './task-sync-starter';
import { DATABASE_HEALTH_CHECK } from './database-health-check';
import { RECRUITING_PREP } from './recruiting-prep';
import { TEAM_PLAYBOOK_BUILDER } from './team-playbook-builder';
import { CONTENT_STRATEGIST } from './content-strategist';
import { PERFECT_WEEK } from './perfect-week';
import { INBOX_MEETING_FOLLOW_THROUGH } from './inbox-meeting-follow-through';
import { DUE_DILIGENCE_REVIEW } from './due-diligence-review';
import { REPAIR_REQUEST_RESPONSE } from './repair-request-response';
import { COUNTER_EXPLAINER } from './counter-explainer';
import { OFFER_STRATEGY } from './offer-strategy';
import { OFFER_COMPARISON } from './offer-comparison';
import { PRICING_CONVERSATION_PREP } from './pricing-conversation-prep';
import { APPOINTMENT_FOLLOW_UP } from './appointment-follow-up';
import { SHOWING_TOUR_PREP } from './showing-tour-prep';
import { LOW_APPRAISAL_RESPONSE } from './low-appraisal-response';
import { TEAM_PNL_REVIEW } from './team-pnl-review';
import { NEW_CONSTRUCTION_REVIEW } from './new-construction-review';

/** A run of inline copy: text, `{ strong }`, or `{ link }` (a new tab, unless `sameTab`). */
export type Inline = string | { strong: string } | { link: string; href: string; sameTab?: boolean };

export interface Step {
  n: string;
  title: string;
  body: string;
}

export interface Tile {
  /** A small mono label above the title, like "Door A". */
  label?: string;
  title: string;
  body: string;
  /** A small note under the body, like "Any Claude plan". */
  tag?: string;
}

/** The parts of a page between the opt-in card and the footer, in order. */
export type Section =
  /** A sentence from a meeting and the task it becomes (the Task Sync Starter Kit). */
  | {
      kind: 'example';
      eyebrow: string;
      heading: string;
      body: string;
      quote: string;
      quoteSource: string;
      task: { title: string; rows: ReadonlyArray<{ label: string; value: string }> };
    }
  /** The report a guide produces, as a table, and its verdict (The Ops Time Audit). */
  | {
      kind: 'report';
      eyebrow: string;
      heading: string;
      body: string;
      title: string;
      note: string;
      rows: ReadonlyArray<{
        category: string;
        hours: string;
        evidence: string;
        tag: 'Run' | 'Draft' | 'Own';
        ready: string;
      }>;
      verdict: { lead: string; body: string };
    }
  /** A bulleted list of titled items ("What's inside"). */
  | { kind: 'list'; heading: string; items: ReadonlyArray<{ title: string; body: string }> }
  /**
   * A row of cards ("What you need"). `cta` adds a button back up to the opt-in. `columns: 2` lays
   * four cards out two by two from 640px, where three to a row would leave one alone.
   */
  | { kind: 'tiles'; heading: string; note?: string; items: readonly Tile[]; cta?: boolean; columns?: 2 }
  /**
   * Videos side by side, each with its label and a line under it: a raw clip and what the guide made
   * of it (the Reel Editor). `length` is shown with the label, as "1:05". Each is H.264 in an MP4
   * (every browser plays it; HEVC does not play in Firefox or on many Android phones), sized by its
   * `width` and `height` before it loads.
   */
  | {
      kind: 'compare';
      eyebrow: string;
      heading: string;
      body: string;
      clips: ReadonlyArray<{
        label: string;
        length: string;
        caption: string;
        src: string;
        poster: string;
        width: number;
        height: number;
      }>;
    }
  /** Things to say to Claude, in groups, each one copied with a tap (the Reel Editor). */
  | {
      kind: 'prompts';
      heading: string;
      body: string;
      groups: ReadonlyArray<{ label: string; items: readonly string[] }>;
    }
  /** Questions that open to their answers, with no script (the Reel Editor). */
  | { kind: 'faq'; heading: string; items: ReadonlyArray<{ q: string; a: readonly Inline[] }> }
  /**
   * A skill's output, shortened, drawn as a document (D-052): what comes back from a run on the
   * made-up practice files. `blocks` are its headings, paragraphs, lists, tables and draft emails, in
   * order. A table scrolls sideways inside the card on a phone, never the page.
   */
  | {
      kind: 'sample';
      eyebrow: string;
      heading: string;
      body: string;
      title: string;
      note: string;
      blocks: readonly SampleBlock[];
    }
  /** One short line, like a pointer to another guide. */
  | { kind: 'note'; body: readonly Inline[] };

/** One piece of a `sample`: a heading, a paragraph, a list, a table or a draft email. */
export type SampleBlock =
  | { h: string }
  | { p: readonly Inline[] }
  | { items: readonly string[] }
  | { table: { caption: string; head: readonly string[]; rows: ReadonlyArray<readonly string[]> } }
  | { email: { subject: string; body: readonly string[] } };

/**
 * One step of setting up a download that is not done once it is saved (a Claude skill, D-045).
 * `action` is the step's one button: the download itself, or a page in Claude, in a new tab. `copy`
 * is words to say, copied with a tap. `note` is a small line under them for what trips people up.
 */
export interface SetupStep {
  title: string;
  body: readonly Inline[];
  /**
   * `'download'` is the guide's own download. A link with `download` is another file to save under
   * that name, in place (a skill's ChatGPT version or practice files, D-052); without it, a page in
   * the app, in a new tab.
   */
  action?: 'download' | { label: string; href: string; download?: string };
  copy?: string;
  /** Longer words to paste, such as a Project's instructions: the same copy button, drawn as a block. */
  copyBlock?: string;
  note?: readonly Inline[];
}

/**
 * A skill that also works in ChatGPT (D-052): the unlocked card asks which app, with two radio
 * buttons and no script, and shows that app's steps. `setup` stays Claude's.
 */
export interface OtherApp {
  /** The question over the two buttons. */
  question: string;
  claude: string;
  chatgpt: string;
  setup: readonly SetupStep[];
}

/**
 * On a phone, the line that says to finish on a computer, and the button that gets the page there:
 * the share sheet where there is one (`share`), otherwise `href`, a `mailto:` that works with no
 * script.
 */
export interface Handoff {
  body: string;
  label: string;
  href: string;
  share: { title: string; url: string };
}

export interface Guide {
  /** The page's path without its slash, the HTML file's name, and the API's `source`. */
  slug: string;
  /**
   * The skill this page offers, by its id in the skill library's catalog (`SKILL_CATALOG` in
   * `@ai/core/skills`): its ZIP's name, which is not always the slug (/content-strategist). A guide
   * that is not a skill has none. A skill that is not free is drawn as `inSkillLibrary` says.
   */
  skill?: string;
  meta: { title: string; description: string };
  hero: { eyebrow: string; title: string; lede: string; steps: readonly Step[] };
  /** The opt-in. Its anchor is the link a slide or a DM can point at. */
  optIn: { anchor: string; heading: string; body: string; button: string };
  /**
   * What the visitor sees once they have opted in, and on every later visit from that device. With
   * `setup`, the download is one of its steps (the one whose `action` is `'download'`) rather than a
   * button on its own. `inApp` replaces the shared in-app browser line, which is about a PDF.
   */
  download: {
    heading: string;
    body: string;
    href: string;
    filename: string;
    setup?: readonly SetupStep[];
    /** With `setup`, the same skill's steps in ChatGPT, behind a Claude / ChatGPT switch (D-052). */
    chatgpt?: OtherApp;
    handoff?: Handoff;
    inApp?: string;
  };
  sections: readonly Section[];
  /** localStorage: this device already opted in, so the download shows straight away. */
  unlockKey: string;
  /**
   * `'skill'`: a free skill's page in the library's look (D-071), set by `skillPage()`. A white top bar
   * with the library breadcrumb, the sample beside the opt-in, the setup as a checklist. Without it, the
   * guide's green cover and one column (D-038).
   */
  layout?: 'skill';
  /** With `layout: 'skill'`, the short facts under the lede, as pills: "Free", the setup time, the apps. */
  facts?: readonly string[];
}

/** Every guide, by slug, as written. */
const WRITTEN: Readonly<Record<string, Guide>> = {
  [TASK_SYNC_STARTER.slug]: TASK_SYNC_STARTER,
  [OPS_TIME_AUDIT.slug]: OPS_TIME_AUDIT,
  [REEL_EDITOR.slug]: REEL_EDITOR,
  [DATABASE_HEALTH_CHECK.slug]: DATABASE_HEALTH_CHECK,
  [RECRUITING_PREP.slug]: RECRUITING_PREP,
  [TEAM_PLAYBOOK_BUILDER.slug]: TEAM_PLAYBOOK_BUILDER,
  [CONTENT_STRATEGIST.slug]: CONTENT_STRATEGIST,
  [PERFECT_WEEK.slug]: PERFECT_WEEK,
  [INBOX_MEETING_FOLLOW_THROUGH.slug]: INBOX_MEETING_FOLLOW_THROUGH,
  [DUE_DILIGENCE_REVIEW.slug]: DUE_DILIGENCE_REVIEW,
  [REPAIR_REQUEST_RESPONSE.slug]: REPAIR_REQUEST_RESPONSE,
  [COUNTER_EXPLAINER.slug]: COUNTER_EXPLAINER,
  [OFFER_STRATEGY.slug]: OFFER_STRATEGY,
  [OFFER_COMPARISON.slug]: OFFER_COMPARISON,
  [PRICING_CONVERSATION_PREP.slug]: PRICING_CONVERSATION_PREP,
  [APPOINTMENT_FOLLOW_UP.slug]: APPOINTMENT_FOLLOW_UP,
  [SHOWING_TOUR_PREP.slug]: SHOWING_TOUR_PREP,
  [LOW_APPRAISAL_RESPONSE.slug]: LOW_APPRAISAL_RESPONSE,
  [TEAM_PNL_REVIEW.slug]: TEAM_PNL_REVIEW,
  [NEW_CONSTRUCTION_REVIEW.slug]: NEW_CONSTRUCTION_REVIEW,
};

/**
 * A paid skill's page stops calling itself free (D-081): "Free" comes off its title, description and
 * eyebrow, and its first fact says where the skill is. Its own file keeps the free wording for the day
 * `FREE_SKILLS` names it again, so a free page is exactly as written.
 */
const unfree = (text: string): string =>
  text
    .replace(/\bA Free AI\b/g, 'An AI')
    .replace(/\ba free AI\b/g, 'an AI')
    .replace(/\b([Aa]) [Ff]ree /g, '$1 ')
    .replace(/^Free /, '')
    .replace(/ [Ff]ree /g, ' ');

function asPaid(guide: Guide): Guide {
  if (guide.skill === undefined || isFreeSkill(guide.skill)) return guide;
  return {
    ...guide,
    meta: { title: unfree(guide.meta.title), description: unfree(guide.meta.description) },
    hero: { ...guide.hero, eyebrow: unfree(guide.hero.eyebrow) },
    ...(guide.facts ? { facts: guide.facts.map((f) => (f === 'Free' ? 'In the Skill Library' : f)) } : {}),
  };
}

/** Every guide, by slug, with each paid skill's page worded as one. */
export const GUIDES: Readonly<Record<string, Guide>> = Object.fromEntries(
  Object.entries(WRITTEN).map(([slug, guide]) => [slug, asPaid(guide)]),
);

/**
 * Whether a page's skill is paid, and so in the Skill Library rather than a download (D-079, D-081).
 * Free fails closed, as in the catalog: a skill is free only when `FREE_SKILLS` names it.
 */
export const inSkillLibrary = (guide: Guide): boolean => guide.skill !== undefined && !isFreeSkill(guide.skill);

export const SITE = { name: 'Amplified Impact', origin: 'https://www.amplifiedimpact.io' } as const;

/**
 * Who a guide's opt-in agrees to hear from: Amplified Impact, LLC, as on every sign-up (D-041; it was
 * Amplified Impact and Connor under D-039). `CONSENT.guides` in `src/legal/content.ts` quotes the
 * line built from this, and a test holds the two equal.
 */
export const GUIDE_SENDERS = 'Amplified Impact, LLC';

/** What every guide page says the same way. */
export const SHARED = {
  logoAlt: 'Amplified Impact',
  fields: { firstName: 'First name', email: 'Email' },
  // Submitting is the opt-in: email consent and agreement to the Terms and Privacy Policy, said in
  // full under the button.
  legal: [
    'By signing up, you agree to our ',
    { link: 'Terms of Service', href: '/terms' },
    ' and ',
    { link: 'Privacy Policy', href: '/privacy' },
    ` and to emails from ${GUIDE_SENDERS}. Unsubscribe anytime.`,
  ] as readonly Inline[],
  downloadButton: 'Download Here',
  // Instagram's and Facebook's in-app browsers open a PDF instead of saving it. Shown there only.
  inApp:
    'In the Instagram app? If the PDF opens instead of saving, tap the ••• menu and choose Open in browser, then download it there.',
  // Words a visitor can copy with a tap (`prompts`, a setup step's `copy`): the tag on each, and what
  // the toast says once they are on the clipboard. Read by the script from the button's `data-toast`.
  copy: { tag: 'Copy', copied: 'Copied. Paste it into Claude.' },
  // A setup step's words, copied and the app opened with one tap (D-070): a blank chat, never a `?q=`
  // prefill (D-032). The words stay on the page as a copy chip too, for a second paste.
  copyOpen: {
    claude: { label: 'Copy & Open Claude', href: 'https://claude.ai/new', toast: 'Copied. Paste it into Claude.' },
    chatgpt: { label: 'Copy & Open ChatGPT', href: 'https://chatgpt.com/', toast: 'Copied. Paste it into ChatGPT.' },
  },
  // The setup, one step at a time once the script runs (D-070). `{n}` and `{total}` are filled in by
  // `main.ts`, which reads the template from the markup so no copy lives in the script.
  guided: { progress: 'Step {n} of {total}', back: 'Back', next: 'Next', startOver: 'Start Over' },
  // A skill page in the library's look (D-071): the breadcrumb back to the library, the checklist's
  // label, the sample's toggle (filled in by `main.ts` from the button) and the phone's sign-up bar.
  skill: {
    library: { label: 'Free Library', href: '/library' },
    setupTitle: 'Your setup',
    sampleMore: 'See the Full Example',
    sampleLess: 'Show Less',
    bar: 'Get the Free Skill',
  },
  // A paid skill's page (D-081): the card in the sign-up's place, which says where the skill is now.
  // "See Plans" goes to the offer's plans (D-074); "Sign In" is the platform's own sign-in, for
  // people who already bought a plan. Also the button under "What you need".
  skillLibrary: {
    anchor: 'skill-library',
    heading: 'In the Skill Library',
    body: 'This skill is part of the Skill Library in the Amplified Impact platform.',
    plans: { label: 'See Plans', href: '/offer#plans' },
    signIn: { lead: 'Already bought a plan?', label: 'Sign In', href: 'https://learn.amplifiedimpact.io/skill-library' },
  },
  footer: {
    byline: 'By Connor Leiva',
    links: [
      { link: 'Terms of Service', href: '/terms' },
      { link: 'Privacy Policy', href: '/privacy' },
    ],
  },
} as const;
