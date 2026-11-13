// Each skill's full guided setup, as data, for learn only (DECISIONS.md D-151). Run at build time by
// `vite-plugin.ts`, which writes it to `apps/web/dist-private/skill-guides.json`: outside `dist/`, so
// no route serves it, and never imported by the learn app, so no browser bundle carries it. The API
// reads it at boot and answers one guide at a time, only to a learner the access rule lets in.
//
// ONE SOURCE OF TRUTH. The words are the page files' own (`<slug>.ts`, `skill-page.ts`,
// `grok-page.ts`), the same objects `render.ts` draws www's preview from: www shows the step titles
// (`previewOf`), learn shows everything. Nothing here is written twice.
//
// WHAT CHANGES ON THE WAY. Only addresses: a step's link to another guided page becomes that page's
// guide in learn (same tab); any other link on www becomes absolute; a ZIP becomes the skill's file
// kind, which learn downloads through the access-checked route. A file this cannot place is a build
// error, never a dead button.

import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { SKILL_CATALOG } from '@ai/core/skills';
import { isGuidedPage, skillGuidePath } from '@ai/core/skill-guides';
import type { GuideAction, GuideFile, GuideInline, GuideLane, GuidePrompts, GuideStep, SkillGuide, SkillGuidesFile } from '@ai/core/skill-guides';
import { GUIDES, isGuided, SHARED, SITE } from './content';
import type { Guide, Inline, SetupStep } from './content';

export { isGuided };

/** The catalog id behind a guided page: the `skills` table's row. */
const idOf = (guide: Guide): string => guide.skill ?? guide.grok ?? '';

/** A link as learn should follow it: another guide in learn (same tab), www made absolute, an anchor dropped. */
function inlineOut(seg: Inline): GuideInline | null {
  if (typeof seg === 'string' || 'strong' in seg) return seg;
  const href = seg.href;
  if (href.startsWith('#')) return seg.link;
  if (href.startsWith('/') && !href.startsWith('//')) {
    const page = href.slice(1).split('#')[0] ?? '';
    if (isGuidedPage(page)) return { link: seg.link, href: skillGuidePath(page), sameTab: true };
    return { link: seg.link, href: `${SITE.origin}${href}` };
  }
  return { link: seg.link, href, ...(seg.sameTab ? { sameTab: true } : {}) };
}

const inlinesOut = (segs: readonly Inline[]): GuideInline[] =>
  segs.map(inlineOut).filter((s): s is GuideInline => s !== null);

/** The catalog's files for a guide, by kind. */
function filesOf(guide: Guide): Partial<Record<GuideFile, string>> {
  if (guide.grok !== undefined) {
    const t = GROK_TEMPLATES.find((g) => g.id === guide.grok);
    return t ? { grok: t.file } : {};
  }
  return SKILL_CATALOG.find((s) => s.id === guide.skill)?.files ?? {};
}

function actionOut(guide: Guide, action: SetupStep['action'], lane: GuideLane['id']): GuideAction | undefined {
  if (action === undefined) return undefined;
  const files = filesOf(guide);
  const fileKind = (name: string): GuideFile => {
    const kind = (Object.keys(files) as GuideFile[]).find((k) => files[k] === name);
    if (!kind) throw new Error(`${guide.slug}: a setup step offers ${name}, which is not one of its catalog files.`);
    return kind;
  };
  if (action === 'download') {
    const kind: GuideFile = lane === 'grok' && files.grok ? 'grok' : guide.grok !== undefined ? 'grok' : 'claude';
    if (!files[kind]) throw new Error(`${guide.slug}: its download step has no ${kind} file in the catalog.`);
    return { kind: 'file', file: kind, label: SHARED.downloadButton };
  }
  if (action.download !== undefined) return { kind: 'file', file: fileKind(action.download), label: action.label };
  const out = inlineOut({ link: action.label, href: action.href });
  return { kind: 'link', label: action.label, href: typeof out === 'object' && out !== null && 'href' in out ? out.href : action.href };
}

function stepsOut(guide: Guide, steps: readonly SetupStep[], lane: GuideLane['id']): GuideStep[] {
  return steps.map((s) => {
    const action = actionOut(guide, s.action, lane);
    return {
      title: s.title,
      body: inlinesOut(s.body),
      ...(action ? { action } : {}),
      ...(s.copy !== undefined ? { copy: s.copy } : {}),
      ...(s.copyBlock !== undefined ? { copyBlock: s.copyBlock } : {}),
      ...(s.note ? { note: inlinesOut(s.note) } : {}),
    };
  });
}

/** A guided page's lanes, in www's order: Grok Bot first when there is one, then Claude, then ChatGPT. */
function lanesOf(guide: Guide): GuideLane[] {
  const d = guide.download;
  const setup = d.setup ?? [];
  if (guide.grok !== undefined) return [{ id: 'grok', label: 'Grok Bot', steps: stepsOut(guide, setup, 'grok') }];
  return [
    ...(d.grok ? [{ id: 'grok' as const, label: d.grok.label, steps: stepsOut(guide, d.grok.setup, 'grok') }] : []),
    { id: 'claude' as const, label: d.chatgpt?.claude ?? 'Claude', steps: stepsOut(guide, setup, 'claude') },
    ...(d.chatgpt ? [{ id: 'chatgpt' as const, label: d.chatgpt.chatgpt, steps: stepsOut(guide, d.chatgpt.setup, 'chatgpt') }] : []),
  ];
}

/** One guided page's full setup, as learn shows it. */
export function exportGuide(guide: Guide): SkillGuide {
  if (!isGuided(guide)) throw new Error(`${guide.slug} has no skill or Grok Bot template, so no guided setup.`);
  const prompts: GuidePrompts[] = guide.sections.flatMap((s) =>
    s.kind === 'prompts' ? [{ heading: s.heading, body: s.body, groups: s.groups.map((g) => ({ label: g.label, items: [...g.items] })) }] : [],
  );
  const lanes = lanesOf(guide);
  return {
    slug: guide.slug,
    skill: idOf(guide),
    title: guide.hero.title,
    intro: guide.download.body,
    question: lanes.length > 1 ? (guide.download.chatgpt?.question ?? null) : null,
    lanes,
    prompts,
  };
}

/** Every guided page's setup, and the words every guide shares: the file `vite-plugin.ts` writes. */
export function exportSkillGuides(): SkillGuidesFile {
  return {
    version: 1,
    ui: {
      setupTitle: SHARED.skill.setupTitle,
      copy: { ...SHARED.copy },
      copyOpen: { claude: { ...SHARED.copyOpen.claude }, chatgpt: { ...SHARED.copyOpen.chatgpt } },
      guided: { ...SHARED.guided },
    },
    guides: Object.fromEntries(Object.values(GUIDES).filter(isGuided).map((g) => [g.slug, exportGuide(g)])),
  };
}
