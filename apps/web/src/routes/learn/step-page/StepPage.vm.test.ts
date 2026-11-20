// D-210: the v6 step page's props from the real loader. Week 0 step 2, entered as the mockup draws it
// (test/mockup-step2.ts), must map to the handoff's own sample props (handoff/step-page-v6/src/sample-data.js),
// word for word: that is what makes the live page render the mockup.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import type { PathBlock } from '@ai/core/course-types';
import { ACCELERATOR_GLOSSARY } from '@ai/core/seed/glossary-v1';
import { weekRows } from '../learn.vm';
import { stepVM } from '../Step.vm';
import type { ChecklistLayoutVM, StepVM } from '../Step.vm';
import { buildKitVM } from '../WeekContent.vm';
import { LEARNER_ID, PRELAUNCH_NOW, learnState } from '../test/fixture';
import { V6_LABELS, autoAtOf, stepPageStep, v6Gap } from './StepPage.vm';
import { stepOfPath, stepPageV6Enabled, v6Draws, v6On, v6StepAt } from './v6';
import { MOCKUP_PROMPT, MOCKUP_STEP4_BLOCKS, MOCKUP_STEP5_BLOCKS, mockupStep2Blocks } from './test/mockup-step2';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLE = pathToFileURL(resolve(HERE, '../../../../../../handoff/step-page-v6/src/sample-data.js')).href;

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const learner = { kind: 'learner', userId: LEARNER_ID } as const;
type Weeks = { module: { checklist: { paths?: { claude?: { blocks: PathBlock[] } } }[] } }[];

/** The pre-launch course with step 1 done and Week 0's steps 2, 4 and 5 entered as the mockup draws them. */
function mockupState() {
  const st = learnState(PRELAUNCH_NOW, true, { 0: ['c1'] });
  const p = structuredClone(st.payload);
  const firstBuild = [...p.sessions].filter((x) => x.kind === 'build').sort((a, b) => a.start - b.start)[0]!;
  const weeks = p.course.weeks as unknown as Weeks;
  const media = { video: 'v/orientation.mp4', poster: 'v/orientation.jpg', transcript: 'v/orientation.vtt' };
  weeks[0]!.module.checklist[1]!.paths = { claude: { blocks: mockupStep2Blocks(media, firstBuild.id) } };
  weeks[0]!.module.checklist[3]!.paths = { claude: { blocks: MOCKUP_STEP4_BLOCKS } };
  weeks[0]!.module.checklist[4]!.paths = { claude: { blocks: MOCKUP_STEP5_BLOCKS } };
  (p.course as { glossary?: unknown }).glossary = ACCELERATOR_GLOSSARY;
  const db = structuredClone(st.db);
  const mod = db.modules.find((m) => m.id === 'accelerator-week-0')!;
  mod.prompt = MOCKUP_PROMPT;
  mod.files = [];
  const me = learnerOf(db, LEARNER_ID);
  const rows = weekRows(p, db, me);
  return { st, p, db, me, rows, firstBuild };
}

describe('the v6 step page’s props (D-210)', () => {
  it('Week 0 step 2 maps to the mockup’s own props, word for word', async () => {
    const { p, rows } = mockupState();
    const vm = stepVM(p, rows[0], 2, learner, PRELAUNCH_NOW);
    if (vm.kind !== 'step') throw new Error('missing');
    const layout = vm.layouts?.claude;
    if (!layout) throw new Error('no checklist layout');
    const kit = buildKitVM(rows[0]?.module, () => null);
    expect(v6Gap(vm, layout, kit, [], 'file')).toBeNull();
    expect(v6Draws(vm, rows[0])).toBe(true);

    const step = stepPageStep(vm, layout, kit, { duration: 468.87, cues: [], poster: '/p.jpg', captions: '/c.vtt' }, { onCalendar: () => undefined, onViewPrompt: () => undefined });
    const { sampleStep, sampleLabels } = (await import(/* @vite-ignore */ SAMPLE)) as { sampleStep: Record<string, unknown> & { jumps: { id: string }[] }; sampleLabels: Record<string, string> };
    expect(V6_LABELS).toEqual(sampleLabels);

    // Links go to real routes here and to `#` in the mockup; handlers and media URLs are the page's own.
    const strip = (x: unknown): unknown =>
      JSON.parse(JSON.stringify(x, (k, v: unknown) => (k === 'href' || k === 'onClick' || k === 'onView' || k === 'copyText' ? undefined : v)));
    // The rail's name is only read aloud: it names the week, as the old player's did (E-16), not "Week 0 steps".
    expect(step.railLabel).toBe(vm.railLabel);
    expect(vm.railLabel).toMatch(/ steps$/);
    const want = strip({ ...sampleStep, railLabel: undefined, jumps: sampleStep.jumps.filter((j) => j.id !== 'styles') }) as Record<string, unknown>;
    // The current pill draws as current whatever its status says (StepRail's dataS), so it is not compared.
    const got = strip({ ...step, railLabel: undefined, pills: step.pills.map((pill) => (pill.on ? { ...pill, status: 'progress' } : pill)) }) as Record<string, unknown>;
    const { video: wantVideo, ...wantRest } = want as { video: Record<string, unknown> };
    const { video: gotVideo, ...gotRest } = got as { video: Record<string, unknown> };
    expect(gotRest).toEqual(wantRest);
    const media = ['src', 'type', 'poster', 'captions', 'cues'];
    const omit = (v: Record<string, unknown>) => Object.fromEntries(Object.entries(v).filter(([k]) => !media.includes(k)));
    expect(omit(gotVideo)).toEqual(omit(wantVideo));
    expect(step.forStep[0]?.copyText).toBe(MOCKUP_PROMPT);
  });

  it('every kind of step content draws: extra content, waiting items, sub-checks, actions, a step with no checklist', () => {
    const { p, rows } = mockupState();
    const vm = stepVM(p, rows[0], 2, learner, PRELAUNCH_NOW) as StepVM;
    const layout = vm.layouts!.claude!;
    const kit = buildKitVM(rows[0]?.module, () => null);
    expect(v6Gap(vm, layout, kit, [], 'link')).toBeNull();
    const drawn: string[] = [];
    const nodes = {
      marked: (text: string) => text,
      rich: () => 'rich',
      callouts: (list: { text: string }[]) => list.map((c) => c.text).join('|'),
      blocks: (blocks: readonly PathBlock[]) => { drawn.push(blocks.map((b) => b.type).join(',')); return 'blocks'; },
    };
    const media = { duration: null, cues: [], poster: undefined, captions: undefined };
    const handlers = { onCalendar: () => undefined, onViewPrompt: () => undefined, nodes };
    const rich: ChecklistLayoutVM = {
      ...layout,
      leading: [{ kind: 'heads_up', label: 'Heads up', text: 'Read first.' }],
      extras: [{ type: 'text', text: 'More.' }, { type: 'copy', label: 'Prompt', text: 'Do it.' }],
      items: layout.items.map((it, i) =>
        i === 0 ? { ...it, waiting: 1, subchecks: [{ id: 'a', label: 'A', checked: true }, { id: 'b', label: 'B', checked: false }], clickPath: ['Settings', 'Capabilities'], note: 'Jordan: 1 of 2' }
        : i === 2 ? { ...it, action: { type: 'download', files: [{ id: 'f', title: 'Sheet', href: '/api/files/x' }] } }
        : it),
    };
    const step = stepPageStep(vm, rich, kit, media, handlers);
    expect(step.leading).toBe('Read first.');
    expect(step.extras).toBe('blocks');
    expect(drawn).toEqual(['text,copy']);
    expect(step.items[0]).toMatchObject({ waiting: 1, clickPath: ['Settings', 'Capabilities'], note: 'Jordan: 1 of 2', subchecks: [{ id: 'a', checked: true }, { id: 'b', checked: false }] });
    expect(step.items[2]!.action).toEqual({ type: 'download', files: [{ id: 'f', title: 'Sheet', href: '/api/files/x' }] });
    // A video that can't be the page's own player plays in the content instead.
    const noHero = stepPageStep(vm, layout, kit, { ...media, hero: false }, handlers);
    expect(noHero.video).toBeNull();
    expect(drawn.at(-1)).toBe('video');
    expect(noHero.jumps.map((j) => j.id)).toEqual(['checklist', 'reference']);
    // Step 3 of the seed has no checklist: its path's blocks are the content, with the step's own tags and Next card.
    const s3 = stepVM(p, rows[0], 3, learner, PRELAUNCH_NOW) as StepVM;
    expect(v6Draws(s3, rows[0])).toBe(true);
    const plain = stepPageStep(s3, undefined, kit, media, handlers);
    expect(plain.items).toEqual([]);
    expect(plain.blocks).toBe('blocks');
    expect(plain.eyebrow).toBe('Week 0 · Step 3');
    expect(plain.tags.map((t) => t.label)).toEqual(['20 min, over two weeks', 'Owner', 'Due Mon, Nov 30, 12:00 PM MT']);
    expect(plain.next).toMatchObject({ n: 4, title: 'Get Your AI Ready' });
    expect(plain.jumps).toEqual([{ id: 'checklist', label: 'Do this' }]);
    expect(plain.doneWhen).toMatch(/^Done when: /);
    // A step staff haven't written yet (no blocks on either path): no "Do this" section and no jump to it.
    const empty = stepPageStep({ ...s3, paths: {} } as StepVM, undefined, kit, media, handlers);
    expect(empty.items).toEqual([]);
    expect(empty.blocks).toBeUndefined();
    expect(empty.jumps).toEqual([]);
    expect(empty.next).toMatchObject({ n: 4 });
  });

  it('the shell and the route ask one rule, on for everyone unless a build turns it off', () => {
    const { p, rows, me } = mockupState();
    expect(stepOfPath('/learn/week/0/step/2')).toEqual({ week: 0, step: 2 });
    expect(stepOfPath('/learn/week/0')).toBeNull();
    expect(v6StepAt('/learn/week/0/step/2', p, rows, learner, me, PRELAUNCH_NOW, true)).toBe(true);
    expect(v6StepAt('/learn/week/0/step/3', p, rows, learner, me, PRELAUNCH_NOW, true)).toBe(true);
    expect(v6StepAt('/learn/week/0/step/2', p, rows, learner, me, PRELAUNCH_NOW, false)).toBe(false);
    expect(v6StepAt('/learn/week/0/step/99', p, rows, learner, me, PRELAUNCH_NOW, true)).toBe(false);
    expect(stepPageV6Enabled({})).toBe(true);
    expect(stepPageV6Enabled({ VITE_STEP_PAGE_V6: 'true' })).toBe(true);
    expect(stepPageV6Enabled({ VITE_STEP_PAGE_V6: 'false' })).toBe(false);
  });

  it('a build that turns it off still shows it to the seeded test account', () => {
    const { p, rows, me } = mockupState();
    const tester = { ...me!, test: true as const };
    expect(v6On(null, false)).toBe(false);
    expect(v6On(me, false)).toBe(false);
    expect(v6On(tester, false)).toBe(true);
    expect(v6On(me, true)).toBe(true);
    expect(v6StepAt('/learn/week/0/step/2', p, rows, learner, tester, PRELAUNCH_NOW, v6On(tester, false))).toBe(true);
    expect(v6StepAt('/learn/week/0/step/2', p, rows, learner, me, PRELAUNCH_NOW, v6On(me, false))).toBe(false);
  });

  it('a step with a Claude path and a ChatGPT path draws both, as a switch in the header', () => {
    const { p, rows } = mockupState();
    const weeks = p.course.weeks as unknown as Weeks;
    const step2 = weeks[0]!.module.checklist[1]! as { paths?: { claude?: { blocks: PathBlock[] }; chatgpt?: { blocks: PathBlock[] } } };
    step2.paths = { claude: step2.paths!.claude!, chatgpt: { blocks: structuredClone(step2.paths!.claude!.blocks) } };
    const vm = stepVM(p, rows[0], 2, learner, PRELAUNCH_NOW) as StepVM;
    expect(vm.tabs).toEqual(['claude', 'chatgpt']);
    expect(v6Draws(vm, rows[0])).toBe(true);
    const picked: string[] = [];
    const kit = buildKitVM(rows[0]?.module, () => null);
    const step = stepPageStep(vm, vm.layouts!.chatgpt!, kit, { duration: null, cues: [], poster: undefined, captions: undefined, on: 'chatgpt', choose: (t) => void picked.push(t) }, { onCalendar: () => undefined, onViewPrompt: () => undefined });
    expect(step.tabs).toEqual([{ id: 'claude', label: 'Claude' }, { id: 'chatgpt', label: 'ChatGPT' }]);
    expect(step.tab).toBe('chatgpt');
    expect(step.tabsLabel).toBe('Your AI');
    step.onTab?.('claude');
    expect(picked).toEqual(['claude']);
  });

  it('reads the checks-itself fraction off the item’s label', () => {
    expect(autoAtOf('Checks itself at 90%')).toBe(0.9);
    expect(autoAtOf(null)).toBeUndefined();
  });
});
