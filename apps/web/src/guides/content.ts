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
// A PAID SKILL (D-080, D-082). Every skill page names its skill in the library's catalog (`skill`).
// Unless `FREE_SKILLS` names it, the skill is in the Skill Library on the platform: its page keeps
// the hero and the sample, and shows the Skill Library card in place of the sign-up, with no link to
// a ZIP (`inSkillLibrary`). The card holds the same guided setup as the free page (D-101), and each
// step's file is a button to the Skill Library instead of a download. Its own words and setup stay in
// its file, so naming it in `FREE_SKILLS` brings the download back with no other edit.
//
// Nothing here is markup: `render.ts` escapes every string. House rules: no em dashes, short plain
// sentences.

import { GROK_TEMPLATES, isFreeGrokTemplate } from '@ai/core/grok-templates';
import { isFreeSkill, SKILL_CATALOG } from '@ai/core/skills';
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
import { LISTING_DESCRIPTION_WRITER } from './listing-description-writer';
import { MARKET_UPDATE_EMAIL } from './market-update-email';
import { L10_MEETING_PREP } from './l10-meeting-prep';
import { OPEN_HOUSE_FOLLOW_UP } from './open-house-follow-up';
import { SPHERE_TOUCH_PLAN } from './sphere-touch-plan';
import { FUB_PIPELINE_REVIEW } from './fub-pipeline-review';
import { SPEED_TO_LEAD_REPLY } from './speed-to-lead-reply';
import { FUB_AUTOMATION_AUDIT } from './fub-automation-audit';
import { SELLER_LISTING_UPDATE } from './seller-listing-update';
import { LISTING_APPOINTMENT_PREP } from './listing-appointment-prep';
import { EXPIRED_FSBO_OUTREACH } from './expired-fsbo-outreach';
import { AGENT_1ON1_PREP } from './agent-1on1-prep';
import { TC_FILE_AUDIT } from './tc-file-audit';
import { POST_CLOSING_CLIENT_CARE } from './post-closing-client-care';
import { TEAM_AI_BRAIN } from './team-ai-brain';
import { AI_BRAIN_TUNEUP } from './ai-brain-tuneup';
import { AI_BRAIN_SETUP } from './ai-brain-setup';
import { NEW_AGENT_ONBOARDING_PLAN } from './new-agent-onboarding-plan';
import { CARD_BANK_FEED_AUDIT } from './card-bank-feed-audit';
import { COMMISSION_TIE_OUT } from './commission-tie-out';
import { TEAM_PAYOUT_JOURNALS } from './team-payout-journals';
import { MONTH_END_CLOSE } from './month-end-close';
import { TRUST_EARNEST_WATCH } from './trust-earnest-watch';
import { VENDOR_1099_READINESS } from './vendor-1099-readiness';
import { QUARTERLY_TAX_PROFIT_FIRST } from './quarterly-tax-profit-first';
import { LEAD_SOURCE_ROI } from './lead-source-roi';
import { CONTRACT_TO_CLOSE_DEADLINES } from './contract-to-close-deadlines';
import { NEW_CONTRACT_INTAKE } from './new-contract-intake';
import { MISSING_DOCUMENTS_AUDIT } from './missing-documents-audit';
import { WEEKLY_STATUS_UPDATES } from './weekly-status-updates';
import { STALLED_ITEM_FOLLOW_UP } from './stalled-item-follow-up';
import { CLOSING_WEEK_CHECKLIST } from './closing-week-checklist';
import { LISTING_TO_LIVE } from './listing-to-live';
import { POST_CLOSE_FILE_CLOSEOUT } from './post-close-file-closeout';
import { MORNING_BRIEF } from './morning-brief';

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
 * A skill that also ships a Grok Bot template (Morning Brief, D-108): its guided setup in Grok Bot, the
 * first of three choices in the app switch, checked to start, before Claude and ChatGPT. The steps are
 * the Grok Bot shelf's own (`grokSetup` in `grok-page.ts`): copied words toast "Paste it into Grok
 * Bot", and no button opens an app.
 */
export interface GrokLane {
  /** The switch's label: "Grok Bot". */
  label: string;
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
  /**
   * The Grok Bot template this page offers, by its id in `GROK_TEMPLATES` (`@ai/core/grok-templates`,
   * D-100). Not a skill: a page has one or the other. A template that is not free is drawn as
   * `inSkillLibrary` says, the same way a paid skill is.
   */
  grok?: string;
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
    /** With `chatgpt`, a Grok Bot lane first in the switch (D-108). */
    grok?: GrokLane;
    handoff?: Handoff;
    inApp?: string;
  };
  sections: readonly Section[];
  /** localStorage: this device already opted in, so the download shows straight away. */
  unlockKey: string;
  /**
   * `'skill'`: the page in the library's look (D-071), set by `skillPage()` for every free skill, and by
   * the Reel Editor and the Task Sync Starter Kit themselves (D-072). A white top bar with the library
   * breadcrumb, the page's picture (its sample, its before and after, or its example) beside the
   * opt-in, the setup as a checklist. Without it, the guide's green cover and one column (D-038).
   */
  layout?: 'skill';
  /** With `layout: 'skill'`, the short facts under the lede, as pills: "Free", the setup time, the apps. */
  facts?: readonly string[];
  /** With `layout: 'skill'`, the phone's sign-up bar, when it is not "Get the Free Skill" (a kit's is "Get the Free Kit"). */
  bar?: string;
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
  [LISTING_DESCRIPTION_WRITER.slug]: LISTING_DESCRIPTION_WRITER,
  [MARKET_UPDATE_EMAIL.slug]: MARKET_UPDATE_EMAIL,
  [L10_MEETING_PREP.slug]: L10_MEETING_PREP,
  [OPEN_HOUSE_FOLLOW_UP.slug]: OPEN_HOUSE_FOLLOW_UP,
  [SPHERE_TOUCH_PLAN.slug]: SPHERE_TOUCH_PLAN,
  [FUB_PIPELINE_REVIEW.slug]: FUB_PIPELINE_REVIEW,
  [SPEED_TO_LEAD_REPLY.slug]: SPEED_TO_LEAD_REPLY,
  [FUB_AUTOMATION_AUDIT.slug]: FUB_AUTOMATION_AUDIT,
  [SELLER_LISTING_UPDATE.slug]: SELLER_LISTING_UPDATE,
  [LISTING_APPOINTMENT_PREP.slug]: LISTING_APPOINTMENT_PREP,
  [EXPIRED_FSBO_OUTREACH.slug]: EXPIRED_FSBO_OUTREACH,
  [AGENT_1ON1_PREP.slug]: AGENT_1ON1_PREP,
  [TC_FILE_AUDIT.slug]: TC_FILE_AUDIT,
  [POST_CLOSING_CLIENT_CARE.slug]: POST_CLOSING_CLIENT_CARE,
  [TEAM_AI_BRAIN.slug]: TEAM_AI_BRAIN,
  [AI_BRAIN_TUNEUP.slug]: AI_BRAIN_TUNEUP,
  [AI_BRAIN_SETUP.slug]: AI_BRAIN_SETUP,
  [NEW_AGENT_ONBOARDING_PLAN.slug]: NEW_AGENT_ONBOARDING_PLAN,
  [CARD_BANK_FEED_AUDIT.slug]: CARD_BANK_FEED_AUDIT,
  [COMMISSION_TIE_OUT.slug]: COMMISSION_TIE_OUT,
  [TEAM_PAYOUT_JOURNALS.slug]: TEAM_PAYOUT_JOURNALS,
  [MONTH_END_CLOSE.slug]: MONTH_END_CLOSE,
  [TRUST_EARNEST_WATCH.slug]: TRUST_EARNEST_WATCH,
  [VENDOR_1099_READINESS.slug]: VENDOR_1099_READINESS,
  [QUARTERLY_TAX_PROFIT_FIRST.slug]: QUARTERLY_TAX_PROFIT_FIRST,
  [LEAD_SOURCE_ROI.slug]: LEAD_SOURCE_ROI,
  [CONTRACT_TO_CLOSE_DEADLINES.slug]: CONTRACT_TO_CLOSE_DEADLINES,
  [NEW_CONTRACT_INTAKE.slug]: NEW_CONTRACT_INTAKE,
  [MISSING_DOCUMENTS_AUDIT.slug]: MISSING_DOCUMENTS_AUDIT,
  [WEEKLY_STATUS_UPDATES.slug]: WEEKLY_STATUS_UPDATES,
  [STALLED_ITEM_FOLLOW_UP.slug]: STALLED_ITEM_FOLLOW_UP,
  [CLOSING_WEEK_CHECKLIST.slug]: CLOSING_WEEK_CHECKLIST,
  [LISTING_TO_LIVE.slug]: LISTING_TO_LIVE,
  [POST_CLOSE_FILE_CLOSEOUT.slug]: POST_CLOSE_FILE_CLOSEOUT,
  [MORNING_BRIEF.slug]: MORNING_BRIEF,
};

/**
 * A paid skill's page stops calling itself free (D-082): "Free" comes off its title, description and
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
  if (!inSkillLibrary(guide)) return guide;
  return {
    ...guide,
    meta: { title: unfree(guide.meta.title), description: unfree(guide.meta.description) },
    hero: { ...guide.hero, eyebrow: unfree(guide.hero.eyebrow) },
    ...(guide.facts ? { facts: guide.facts.map((f) => (f === 'Free' ? 'In the Amplified Skill Library' : f)) } : {}),
  };
}

/** Every guide, by slug, with each paid skill's page worded as one. */
export const GUIDES: Readonly<Record<string, Guide>> = Object.fromEntries(
  Object.entries(WRITTEN).map(([slug, guide]) => [slug, asPaid(guide)]),
);

/**
 * Whether a page's skill is paid, and so in the Skill Library rather than a download (D-080, D-082).
 * Free fails closed, as in the catalog: a skill is free only when `FREE_SKILLS` names it, and a Grok
 * Bot template only when `FREE_GROK_TEMPLATES` does (D-100).
 */
export function inSkillLibrary(guide: Guide): boolean {
  if (guide.skill !== undefined) return !isFreeSkill(guide.skill);
  // A Grok Bot template (D-100) by its own free list, never `FREE_SKILLS`.
  if (guide.grok !== undefined) return !isFreeGrokTemplate(guide.grok);
  return false;
}

/**
 * Which plan unlocks a paid guide (D-115), by its set: an agent-only skill or template opens with the
 * Amplified Agent Plan, anything for owners and ops (or both) with Amplified Insiders.
 */
export function unlockFor(guide: Guide): 'insiders' | 'agentPlan' {
  const sets = guide.skill !== undefined ? SKILL_CATALOG.find((s) => s.id === guide.skill)?.sets : guide.grok !== undefined ? GROK_TEMPLATES.find((g) => g.id === guide.grok)?.sets : undefined;
  return sets === 'agent' ? 'agentPlan' : 'insiders';
}

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
  copy: { tag: 'Copy', copied: 'Copied. Paste it into Claude.', copiedGrok: 'Copied. Paste it into Grok Bot.' },
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
    // "The Library", as on the homepage and /library itself (D-103): most of it is paid now.
    library: { label: 'The Library', href: '/library' },
    setupTitle: 'Your setup',
    sampleMore: 'See the Full Example',
    sampleLess: 'Show Less',
    bar: 'Get the Free Skill',
  },
  // A paid skill's page (D-082): the card in the sign-up's place, which says how to unlock the skill
  // (D-115). The overnight brief's locked-skill buttons are "Buy this skill for $37" or "Get Amplified
  // Insiders": no $37 cart exists yet, so the card has the plan's button alone. Which plan is the
  // skill's set's: Amplified Insiders opens the owner and ops skills and the ones for both, and an
  // agent-only skill opens with the Amplified Agent Plan, so its button says that plan's exact name
  // (`unlockFor`). "Sign In" is the platform's own sign-in, for people who already have a plan. Also
  // the button under "What you need".
  skillLibrary: {
    anchor: 'skill-library',
    heading: 'Get this skill',
    insiders: {
      body: 'It’s part of Amplified Insiders: every owner and ops skill, 2 new skills a month, and weekly office hours.',
      label: 'Get Amplified Insiders',
      href: '/pricing#insiders',
    },
    agentPlan: {
      body: 'It’s part of the Amplified Agent Plan: every agent skill, and live training every week.',
      label: 'Get Amplified Agent Plan',
      href: '/pricing#agent-plan',
    },
    signIn: { lead: 'Already a member?', label: 'Sign In', href: 'https://learn.amplifiedimpact.io/skill-library' },
    // A setup step's file, on a paid page (D-101): the same step, with its file in the platform's
    // library, which is where a paid ZIP is downloaded.
    get: { label: 'Download After You Sign In', href: 'https://learn.amplifiedimpact.io/skill-library' },
  },
  footer: {
    byline: 'By Connor Leiva',
    links: [
      { link: 'Terms of Service', href: '/terms' },
      { link: 'Privacy Policy', href: '/privacy' },
    ],
  },
} as const;
