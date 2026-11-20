// D-210: the v6 step page's props from the real loader. Week 0 step 2, entered as the mockup draws it
// (test/mockup-step2.ts), must map to the handoff's own sample props (handoff/step-page-v6/src/sample-data.js),
// word for word: that is what makes the live page render the mockup.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import type { PathBlock } from '@ai/core/course-types';
import { ACCELERATOR_GLOSSARY } from '@ai/core/seed/glossary-v1';
import { weekRows } from '../learn.vm';
import { stepVM } from '../Step.vm';
import type { StepVM } from '../Step.vm';
import { buildKitVM } from '../WeekContent.vm';
import { LEARNER_ID, PRELAUNCH_NOW, learnState } from '../test/fixture';
import { V6_LABELS, autoAtOf, stepPageStep, v6Gap } from './StepPage.vm';
import { stepOfPath, stepPageV6Enabled, tellTestAccount, v6Draws, v6On, v6StepAt } from './v6';
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
    const want = strip({ ...sampleStep, jumps: sampleStep.jumps.filter((j) => j.id !== 'styles') }) as Record<string, unknown>;
    // The current pill draws as current whatever its status says (StepRail's dataS), so it is not compared.
    const got = strip({ ...step, pills: step.pills.map((pill) => (pill.on ? { ...pill, status: 'progress' } : pill)) }) as Record<string, unknown>;
    const { video: wantVideo, ...wantRest } = want as { video: Record<string, unknown> };
    const { video: gotVideo, ...gotRest } = got as { video: Record<string, unknown> };
    expect(gotRest).toEqual(wantRest);
    const media = ['src', 'type', 'poster', 'captions', 'cues'];
    const omit = (v: Record<string, unknown>) => Object.fromEntries(Object.entries(v).filter(([k]) => !media.includes(k)));
    expect(omit(gotVideo)).toEqual(omit(wantVideo));
    expect(step.forStep[0]?.copyText).toBe(MOCKUP_PROMPT);
  });

  it('a step with anything the mockup does not draw keeps today’s player', () => {
    const { p, rows } = mockupState();
    const vm = stepVM(p, rows[0], 2, learner, PRELAUNCH_NOW) as StepVM;
    const layout = vm.layouts!.claude!;
    const kit = buildKitVM(rows[0]?.module, () => null);
    expect(v6Gap(vm, layout, kit, [], 'link')).toBe('video link');
    expect(v6Gap(vm, { ...layout, extras: [{ type: 'text', text: 'More.' }] }, kit, [], 'file')).toBe('extra content');
    const wait = { ...layout, items: layout.items.map((it, i) => (i === 0 ? { ...it, waiting: 1 } : it)) };
    expect(v6Gap(vm, wait, kit, [], 'file')).toBe('waiting item');
    const subs = { ...layout, items: layout.items.map((it, i) => (i === 0 ? { ...it, subchecks: [{ id: 'a', label: 'A', checked: false }] } : it)) };
    expect(v6Gap(vm, subs, kit, [], 'file')).toBe('sub-checks');
    // Steps 1, 3 and 8 of the seed have no checklist path at all.
    const s1 = stepVM(p, rows[0], 1, learner, PRELAUNCH_NOW);
    expect(v6Draws(s1, rows[0])).toBe(false);
  });

  it('the shell and the route ask one rule, and it is off unless the build sets the flag', () => {
    const { p, rows, me } = mockupState();
    expect(stepOfPath('/learn/week/0/step/2')).toEqual({ week: 0, step: 2 });
    expect(stepOfPath('/learn/week/0')).toBeNull();
    expect(v6StepAt('/learn/week/0/step/2', p, rows, learner, me, PRELAUNCH_NOW, true)).toBe(true);
    expect(v6StepAt('/learn/week/0/step/2', p, rows, learner, me, PRELAUNCH_NOW, false)).toBe(false);
    expect(v6StepAt('/learn/week/0/step/3', p, rows, learner, me, PRELAUNCH_NOW, true)).toBe(false);
    expect(stepPageV6Enabled({})).toBe(false);
    expect(stepPageV6Enabled({ VITE_STEP_PAGE_V6: 'false' })).toBe(false);
    expect(stepPageV6Enabled({ VITE_STEP_PAGE_V6: 'true' })).toBe(true);
  });

  it('with the build flag off, only the seeded test account sees it, and only it is told why a step does not', () => {
    const { p, rows, me } = mockupState();
    const tester = { ...me!, test: true as const };
    expect(v6On(null, false)).toBe(false);
    expect(v6On(me, false)).toBe(false);
    expect(v6On(tester, false)).toBe(true);
    expect(v6On(me, true)).toBe(true);
    expect(v6StepAt('/learn/week/0/step/2', p, rows, learner, tester, PRELAUNCH_NOW, v6On(tester, false))).toBe(true);
    expect(v6StepAt('/learn/week/0/step/2', p, rows, learner, me, PRELAUNCH_NOW, v6On(me, false))).toBe(false);
    const said: string[] = [];
    const info = vi.spyOn(console, 'info').mockImplementation((m: string) => void said.push(m));
    tellTestAccount('/learn/week/0/step/3', p, rows, learner, me, PRELAUNCH_NOW);
    expect(said).toEqual([]);
    tellTestAccount('/learn/week/0/step/3', p, rows, learner, tester, PRELAUNCH_NOW);
    tellTestAccount('/learn/week/0/step/3', p, rows, learner, tester, PRELAUNCH_NOW);
    tellTestAccount('/learn/week/0/step/2', p, rows, learner, tester, PRELAUNCH_NOW);
    expect(said).toEqual(["[v6 step page] /learn/week/0/step/3 keeps today's player: not a checklist step."]);
    info.mockRestore();
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
