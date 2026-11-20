// D-212: the curriculum builder and the v6 step page are one source. Every word a step shows comes from a field
// the builder edits (WeekBuilder's StepWeekFields, its path blocks and the module's own fields), so a value typed
// there reaches the page unchanged, and an empty step shows only the page's chrome: nothing course-specific is
// written into the page's code.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import type { PathBlock } from '@ai/core/course-types';
import type { Step } from '@ai/core';
import { weekRows } from '../learn.vm';
import { stepVM } from '../Step.vm';
import type { StepVM } from '../Step.vm';
import { buildKitVM } from '../WeekContent.vm';
import { LEARNER_ID, PRELAUNCH_NOW, learnState } from '../test/fixture';
import { stepPageStep } from './StepPage.vm';
import { builderR2VM } from '../../admin/ModuleBuilder.vm';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const learner = { kind: 'learner', userId: LEARNER_ID } as const;
type Weeks = { module: { checklist: Step[] } }[];

/** Every block field the builder edits, filled with a marker the page must show. */
const BLOCKS: PathBlock[] = [
  {
    type: 'video',
    id: 'zz-video',
    title: 'ZZ play label',
    source: { upload: 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa.mp4', name: 'a.mp4', size: 1, type: 'video/mp4' },
    transcript: { upload: 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-0000000000cc.vtt', name: 'a.vtt', size: 1, type: 'text/vtt' },
    chapters: [{ t: 0, label: 'ZZ chapter one' }, { t: 30, label: 'ZZ chapter two' }],
  },
  { type: 'check', id: 'zz-a', title: 'ZZ item title', detail: 'ZZ item detail', clickPath: ['ZZ menu', 'ZZ setting'], action: { type: 'link', label: 'ZZ link label', href: 'https://example.com/zz' } },
  { type: 'callout', kind: 'tip', text: 'ZZ tip text' },
  { type: 'check', id: 'zz-b', title: 'ZZ second item', action: { type: 'copy', label: 'ZZ copy label', text: 'ZZ copy text' }, subchecks: [{ id: 's1', label: 'ZZ sub one' }, { id: 's2', label: 'ZZ sub two' }] },
  { type: 'check', id: 'zz-c', title: 'ZZ third item', auto: { video: true, at: 0.9 } },
  { type: 'accordion', title: 'ZZ reference title', body: ['ZZ reference line'], table: { head: ['ZZ head'], rows: [['ZZ cell']] }, link: { label: 'ZZ reference link', href: 'https://example.com/ref' } },
];

function stateWith(fill: (step: Step) => void, prompt?: string) {
  const st = learnState(PRELAUNCH_NOW, true, { 0: ['c1'] });
  const p = structuredClone(st.payload);
  const weeks = p.course.weeks as unknown as Weeks;
  fill(weeks[0]!.module.checklist[1]!);
  const db = structuredClone(st.db);
  const mod = db.modules.find((m) => m.id === 'accelerator-week-0')!;
  mod.prompt = prompt ?? '';
  mod.files = [];
  const me = learnerOf(db, LEARNER_ID);
  const rows = weekRows(p, db, me);
  const vm = stepVM(p, rows[0], 2, learner, PRELAUNCH_NOW, { checks: me?.checks, prefs: me?.coursePrefs }) as StepVM;
  const kit = buildKitVM(rows[0]?.module, () => null);
  return { vm, kit };
}

/** The page's props as text: rich nodes and blocks drawn as their words, handlers dropped. */
function words(vm: StepVM, kit: ReturnType<typeof buildKitVM>): string {
  const layout = vm.layouts?.claude;
  const text = (b: PathBlock): string =>
    b.type === 'text' ? b.text : b.type === 'list' ? b.items.join(' ') : b.type === 'copy' ? `${b.label ?? ''} ${b.text}` : b.type === 'table' ? b.rows.flat().join(' ') : b.type === 'video' ? b.title ?? '' : '';
  const nodes = {
    marked: (t: string) => t,
    rich: (doc: unknown) => JSON.stringify(doc),
    callouts: (list: { text: string }[]) => list.map((c) => c.text).join(' '),
    blocks: (blocks: readonly PathBlock[]) => blocks.map(text).join(' '),
  };
  const step = stepPageStep(vm, layout, kit, { duration: 60, cues: [], poster: undefined, captions: undefined }, { onCalendar: () => undefined, onViewPrompt: () => undefined, nodes });
  return JSON.stringify(step, (k, v: unknown) => (typeof v === 'function' ? undefined : v));
}

describe('the builder and the v6 step page are one source (D-212)', () => {
  it('every field the builder edits on a step reaches the page as typed', () => {
    const { vm, kit } = stateWith((s) => {
      s.ch = 'ZZ step title';
      s.goal = 'ZZ step goal';
      s.timeLabel = 'ZZ time label';
      s.who = 'ZZ who';
      s.doneWhen = 'ZZ done when';
      s.paths = { claude: { blocks: BLOCKS } };
    }, 'ZZ system prompt');
    const page = words(vm, kit);
    for (const marker of [
      'ZZ step title', 'ZZ step goal', 'ZZ time label', 'ZZ who',
      'ZZ play label', 'ZZ chapter one', 'ZZ chapter two',
      'ZZ item title', 'ZZ item detail', 'ZZ menu', 'ZZ setting', 'ZZ link label', 'ZZ tip text',
      'ZZ second item', 'ZZ copy label', 'ZZ copy text', 'ZZ sub one', 'ZZ sub two', 'ZZ third item',
      'ZZ reference title', 'ZZ reference line', 'ZZ head', 'ZZ cell', 'ZZ reference link',
      'ZZ system prompt',
    ])
      expect(page, marker).toContain(marker);
  });

  it('a step with no content shows the page’s chrome only: no items, video, reference or content of its own', () => {
    const { vm, kit } = stateWith((s) => {
      s.paths = { claude: { blocks: [] } };
      delete s.goal;
      delete s.doneWhen;
    });
    const layout = vm.layouts?.claude;
    const step = stepPageStep(vm, layout, kit, { duration: null, cues: [], poster: undefined, captions: undefined }, { onCalendar: () => undefined, onViewPrompt: () => undefined });
    expect(step.items).toEqual([]);
    expect(step.video).toBeNull();
    expect(step.accordions).toEqual([]);
    expect(step.extras).toBeUndefined();
    expect(step.leading).toBeUndefined();
    expect(step.forStep).toEqual([]);
  });

  it('the builder’s step title is the title the learner sees, on every step of a week', () => {
    const st = learnState(PRELAUNCH_NOW, true, { 0: ['c1'] });
    const mod = st.db.modules.find((m) => m.id === 'accelerator-week-0')!;
    const rows = builderR2VM(st.db, mod, { dirty: false, saved: true }, PRELAUNCH_NOW).steps;
    const me = learnerOf(st.db, LEARNER_ID);
    const weeks = weekRows(st.payload, st.db, me);
    mod.checklist.forEach((_, i) => {
      const vm = stepVM(st.payload, weeks[0], i + 1, learner, PRELAUNCH_NOW) as StepVM;
      expect(rows[i]!.text, `step ${i + 1}`).toBe(vm.title);
    });
  });
});
