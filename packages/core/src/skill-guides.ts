// The guided setups (DECISIONS.md D-151): each skill's step-by-step setup, behind sign-in.
//
// The guided setup is what the Library sells ("most sites give you a PDF; we guide you step by step
// and you just click the buttons", Connor, 2026-11-12). Until D-151 every page on www carried the
// whole of it, so anyone could read any skill's setup for free. Now:
//
//   - www keeps each skill's page as its sales page: the problem it fixes, what it does, who it's for,
//     its sample, and a preview that is the setup's step TITLES only.
//   - The full setup (every step's words, its buttons, the words to paste, the downloads, "What to
//     say") is written at build time from the same page content into ONE server-only file,
//     `SKILL_GUIDES_FILE`, which no public route serves and no browser bundle imports.
//   - learn shows it at `/skill-library/<page>`, from `GET /api/skill-guides/:page`, which answers the
//     full setup only when the skill library's one access rule opens that skill for the signed-in
//     learner. A free skill needs a free account; a paid one needs its plan.
//
// One source of truth: the page files under `apps/web/src/guides/` hold the words, and both the www
// preview and the learn guide are drawn from them. These are the shapes that file holds, shared by the
// build (`apps/web/src/guides/setup-export.ts`), the API and the learn screen.

import { GROK_TEMPLATES } from './grok-templates';
import { SKILL_CATALOG } from './skills';

/** learn, where a buyer's skills open (the Skill Library and its guides). */
export const LEARN_ORIGIN = 'https://learn.amplifiedimpact.io';

/** The build's server-only file, under `apps/web/dist-private/` (never served, never bundled). */
export const SKILL_GUIDES_DIR = 'dist-private';
export const SKILL_GUIDES_FILE = 'skill-guides.json';

/** A page's path is lowercase words joined by hyphens: nothing else is ever a guide. */
const PAGE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A skill's www page (D-101): its id, unless the catalog names another (/content-strategist). */
export function guidePageOf(id: string): string {
  return SKILL_CATALOG.find((s) => s.id === id)?.page ?? id;
}

/** Every page that has a guided setup: each skill's, and each Grok Bot template's (its id). */
export const GUIDED_PAGES: readonly string[] = [...SKILL_CATALOG.map((s) => s.page ?? s.id), ...GROK_TEMPLATES.map((g) => g.id)];

export const isGuidedPage = (page: string): boolean => PAGE.test(page) && GUIDED_PAGES.includes(page);

/** The catalog id (the `skills` table's row) behind a guided page, or null. */
export function skillIdOfPage(page: string): string | null {
  if (!isGuidedPage(page)) return null;
  return SKILL_CATALOG.find((s) => (s.page ?? s.id) === page)?.id ?? GROK_TEMPLATES.find((g) => g.id === page)?.id ?? null;
}

/**
 * Every ZIP a guided setup offers (D-151): each skill's files and each Grok Bot template's, free and
 * paid. None is a public file any more; each opens in its guide, through the access-checked route.
 */
export const GUIDED_DOWNLOADS: readonly string[] = [
  ...SKILL_CATALOG.flatMap((s) => Object.values(s.files).filter((f): f is string => typeof f === 'string')),
  ...GROK_TEMPLATES.map((g) => g.file),
];

/** The guided page a ZIP belongs to, for an old `/downloads/<file>` link; null for any other file. */
export function guidedPageOfFile(name: string): string | null {
  const skill = SKILL_CATALOG.find((s) => Object.values(s.files).includes(name));
  if (skill) return skill.page ?? skill.id;
  return GROK_TEMPLATES.find((g) => g.file === name)?.id ?? null;
}

/** A guide's address in learn, as a path: `/skill-library/<page>`. */
export const skillGuidePath = (page: string): string => `/skill-library/${page}`;

/** The same, absolute, for a link from www or an email. */
export const skillGuideUrl = (page: string): string => `${LEARN_ORIGIN}${skillGuidePath(page)}`;

/**
 * Where a course step or a Library link to a page goes (D-151): a page with a guided setup opens its
 * guide in learn, same tab; any other page (/voice-profile, /ops-time-audit) is still on www.
 * `route` is the page's path, `/appointment-follow-up`.
 */
export function courseGuideHref(route: string, wwwOrigin: string): string {
  const page = route.replace(/^\//, '').split('#')[0] ?? '';
  return isGuidedPage(page) ? skillGuidePath(page) : `${wwwOrigin}${route}`;
}

/** The same, always absolute: for text a database row keeps (a course week's prompt, D-151). */
export function courseGuideUrl(route: string, wwwOrigin: string): string {
  const href = courseGuideHref(route, wwwOrigin);
  return href.startsWith('/') ? `${LEARN_ORIGIN}${href}` : href;
}

// --- the file's shapes ---------------------------------------------------------------------------------

/** A run of words: text, `{ strong }`, or `{ link }` (a new tab, unless `sameTab`). Hrefs are absolute or learn paths. */
export type GuideInline = string | { strong: string } | { link: string; href: string; sameTab?: boolean };

/** One of a skill's files, downloaded through `GET /api/skills/:id/download/:kind`. */
export type GuideFile = 'claude' | 'chatgpt' | 'practice' | 'grok';

/** A step's one button: one of the skill's files, or a page in the app (in a new tab). */
export type GuideAction = { kind: 'file'; file: GuideFile; label: string } | { kind: 'link'; label: string; href: string };

export interface GuideStep {
  title: string;
  body: GuideInline[];
  action?: GuideAction;
  /** Short words to say, copied with a tap. */
  copy?: string;
  /** Longer words to paste (a Project's instructions), drawn as a block. */
  copyBlock?: string;
  note?: GuideInline[];
}

export type GuideLaneId = 'claude' | 'chatgpt' | 'grok';

/** One app's steps: Claude, ChatGPT or Grok Bot. */
export interface GuideLane {
  id: GuideLaneId;
  label: string;
  steps: GuideStep[];
}

/** "What to say": words to copy, in groups. */
export interface GuidePrompts {
  heading: string;
  body: string;
  groups: { label: string; items: string[] }[];
}

/**
 * A skill's sample output (D-179): what www's page shows anyone under its "Made-Up Example", built from
 * the made-up practice files. Public, so a locked skill's preview may show it too; never part of the
 * setup. `body` says, in the page's own words, that it is made up.
 */
export type GuideSampleBlock =
  | { h: string }
  | { p: GuideInline[] }
  | { items: string[] }
  | { table: { caption: string; head: string[]; rows: string[][] } }
  | { email: { subject: string; body: string[] } };

export interface GuideSample {
  title: string;
  body: string;
  note: string;
  blocks: GuideSampleBlock[];
}

export interface SkillGuide {
  /** The www page's path without its slash, and the learn guide's: `/skill-library/<slug>`. */
  slug: string;
  /** The catalog id: the `skills` table's row the access rule reads. */
  skill: string;
  title: string;
  /** The line over the steps: "Set it up once, in about 10 minutes. It's easiest on a computer." */
  intro: string;
  /** "Which AI app do you use?", when there is more than one lane. */
  question: string | null;
  lanes: GuideLane[];
  prompts: GuidePrompts[];
  /** Its sample output, when its page has one (D-179). */
  sample?: GuideSample;
}

/** What every guide says the same way: the copy chip, the copy-and-open buttons, the step-by-step controls. */
export interface GuideUi {
  setupTitle: string;
  copy: { tag: string; copied: string; copiedGrok: string };
  copyOpen: Record<'claude' | 'chatgpt', { label: string; href: string; toast: string }>;
  guided: { progress: string; back: string; next: string; startOver: string };
}

/** The whole file. */
export interface SkillGuidesFile {
  version: 1;
  ui: GuideUi;
  guides: Record<string, SkillGuide>;
}

/** The preview anyone may see (www shows it too): each lane's step titles, nothing else. */
export interface SkillGuidePreview {
  lanes: { id: GuideLaneId; label: string; steps: string[] }[];
}

export function previewOf(guide: Pick<SkillGuide, 'lanes'>): SkillGuidePreview {
  return { lanes: guide.lanes.map((l) => ({ id: l.id, label: l.label, steps: l.steps.map((s) => s.title) })) };
}
