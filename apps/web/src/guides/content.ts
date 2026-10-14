// The free guides: one landing page per lead magnet, each gated on an email opt-in, all built from
// one renderer (`render.ts`), one stylesheet and one script. DECISIONS.md D-038 and D-039.
//
// A guide's words live in its own file (`task-sync-starter.ts`, `ops-time-audit.ts`); this file holds
// the shape they share, what every guide page says the same way (the consent line, the in-app
// browser hint, the footer), and the list of guides. To add one: write its file, add it to `GUIDES`,
// add `apps/web/<slug>.html` (a copy of another guide's shell), put its PDF in `public/downloads/`,
// and add its slug to the API's `GUIDE_SLUGS` (`apps/api/src/routes/guide-list.ts`).
//
// Nothing here is markup: `render.ts` escapes every string. House rules: no em dashes, short plain
// sentences.

import { OPS_TIME_AUDIT } from './ops-time-audit';
import { TASK_SYNC_STARTER } from './task-sync-starter';

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
  /** A row of cards ("What you need"). `cta` adds a button back up to the opt-in. */
  | { kind: 'tiles'; heading: string; note?: string; items: readonly Tile[]; cta?: boolean }
  /** One short line, like a pointer to another guide. */
  | { kind: 'note'; body: readonly Inline[] };

export interface Guide {
  /** The page's path without its slash, the HTML file's name, and the API's `source`. */
  slug: string;
  meta: { title: string; description: string };
  hero: { eyebrow: string; title: string; lede: string; steps: readonly Step[] };
  /** The opt-in. Its anchor is the link a slide or a DM can point at. */
  optIn: { anchor: string; heading: string; body: string; button: string };
  /** What the visitor sees once they have opted in, and on every later visit from that device. */
  download: { heading: string; body: string; href: string; filename: string };
  sections: readonly Section[];
  /** localStorage: this device already opted in, so the download shows straight away. */
  unlockKey: string;
}

/** Every guide, by slug. */
export const GUIDES: Readonly<Record<string, Guide>> = {
  [TASK_SYNC_STARTER.slug]: TASK_SYNC_STARTER,
  [OPS_TIME_AUDIT.slug]: OPS_TIME_AUDIT,
};

export const SITE = { name: 'Amplified Impact', origin: 'https://www.amplifiedimpact.io' } as const;

/**
 * Who a guide's opt-in agrees to hear from (D-039): Amplified Impact and Connor, nobody else. The
 * /ai101 waitlist names more senders; the guides are Connor's own. `CONSENT.guides` in
 * `src/legal/content.ts` quotes the line built from this, and a test holds the two equal.
 */
export const GUIDE_SENDERS = 'Amplified Impact and Connor';

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
  footer: {
    byline: 'By Connor Leiva',
    links: [
      { link: 'Terms of Service', href: '/terms' },
      { link: 'Privacy Policy', href: '/privacy' },
    ],
  },
} as const;
