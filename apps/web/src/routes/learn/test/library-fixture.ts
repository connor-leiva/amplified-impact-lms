// Test data for the learner portal v2's Skill Library (D-179): `GET /api/skills` as the API answers it
// from the catalog, for a buyer before the first live build (the free skills open, the rest opening Dec 2)
// and for a Utah Life member (the agent skills open, the rest locked, with the seed's
// `locked.utah_life` line), and a small guide answer. Tests only: under a `test/` folder.

import { FREE_SKILLS, LAUNCH_RELEASE, SKILL_CATALOG } from '@ai/core/skills';
import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { SEED_COPY } from '@ai/core/seed/curriculum';
import type { GuideUi, SkillGuide } from '@ai/core/skill-guides';
import type { ApiSkill, FileKind, GuideAnswer, SkillsPayload } from '../Library.vm';

/** Wed, Dec 2, 2026, 12:00 PM MT: the first live build, when a buyer's plan opens. */
export const OPENS = Date.parse('2026-12-02T19:00:00Z');
export const UTAH_LINE = SEED_COPY.find((c) => c.key === 'locked.utah_life')!.value;

const rows = (): Omit<ApiSkill, 'state' | 'opensAt'>[] =>
  [
    ...SKILL_CATALOG.map((s) => ({ id: s.id, title: s.title, summary: s.summary, sets: s.sets, files: Object.keys(s.files) as FileKind[] })),
    ...GROK_TEMPLATES.map((g) => ({ id: g.id, title: g.title, summary: g.summary, sets: g.sets, files: ['grok'] as FileKind[] })),
  ]
    .map((s) => ({ ...s, free: FREE_SKILLS.includes(s.id), releasedAt: LAUNCH_RELEASE }))
    .sort((a, b) => a.title.localeCompare(b.title));

export function buyerSkills(): SkillsPayload {
  return {
    skills: rows().map((s) => ({ ...s, state: s.free ? 'open' : 'upcoming', opensAt: s.free ? null : OPENS })),
    accessGroups: [],
    lockedLines: {},
    paused: false,
  };
}

export function utahSkills(): SkillsPayload {
  return {
    skills: rows().map((s) => ({ ...s, state: s.free || s.sets !== 'owner_ops' ? 'open' : 'locked', opensAt: null })),
    accessGroups: [{ id: 'utah-life', name: 'Utah Life', covers: ['agent', 'both'] }],
    lockedLines: { 'utah-life': UTAH_LINE },
    paused: false,
  };
}

export const UI: GuideUi = {
  setupTitle: 'Set it up',
  copy: { tag: 'Copy', copied: 'Copied.', copiedGrok: 'Copied.' },
  copyOpen: {
    claude: { label: 'Copy & Open Claude', href: 'https://claude.ai/new', toast: 'Copied.' },
    chatgpt: { label: 'Copy & Open ChatGPT', href: 'https://chatgpt.com/', toast: 'Copied.' },
  },
  guided: { progress: 'Step {n} of {total}', back: 'Back', next: 'Next', startOver: 'Start Over' },
};

/** A guide in the export's shape, with marker words, so a leak into a locked page is a failure. */
export const guideOf = (slug: string, skill: string, title: string): SkillGuide => ({
  slug,
  skill,
  title,
  intro: 'Set it up once.',
  question: 'Which AI app do you use?',
  lanes: [
    {
      id: 'claude',
      label: 'Claude',
      steps: [
        { title: 'First Step', body: ['SECRET-STEP-1 open Settings.'], action: { kind: 'link', label: 'Open Settings', href: 'https://claude.ai/settings' } },
        { title: 'Second Step', body: ['SECRET-STEP-2 download it.'], action: { kind: 'file', file: 'claude', label: 'Download Here' }, copy: 'SECRET-COPY say this' },
      ],
    },
    { id: 'chatgpt', label: 'ChatGPT', steps: [{ title: 'Paste It', body: ['SECRET-STEP-3 paste.'], copyBlock: 'SECRET-BLOCK instructions' }] },
  ],
  prompts: [{ heading: 'What to say', body: 'Tap to copy.', groups: [{ label: 'To start', items: ['SECRET-PROMPT start'] }] }],
  sample: {
    title: `${title}: Example File`,
    body: 'What it wrote from the made-up practice files.',
    note: 'Made-up example. Shortened.',
    blocks: [{ h: 'Bottom line' }, { p: ['Two documents are missing.'] }, { items: ['One flag.'] }, { table: { caption: 'Dates', head: ['Deadline', 'Date', 'Days left'], rows: [['Settlement', 'Fri, Dec 4', '24']] } }],
  },
});

/** What `GET /api/skill-guides/:slug` answers: the setup only when the skill is open. */
export function answerOf(p: SkillsPayload, slug: string, id: string): GuideAnswer {
  const k = p.skills.find((x) => x.id === id)!;
  const g = guideOf(slug, id, k.title);
  const open = k.state === 'open';
  return { slug, skill: id, title: k.title, state: k.state, opensAt: k.opensAt ?? null, preview: { lanes: g.lanes.map((l) => ({ id: l.id, label: l.label, steps: l.steps.map((s) => s.title) })) }, sample: g.sample ?? null, guide: open ? g : null, ui: open ? UI : null };
}
