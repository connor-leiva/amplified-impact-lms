import { describe, expect, it } from 'vitest';
import { seedProduction } from '@ai/core/seed/curriculum';
import { planContentV2 } from '@ai/core/seed/content-v2';
import { planCopyV1 } from '@ai/core/seed/copy-v1';
import { planCopyV3 } from '@ai/core/seed/copy-v3';
import { planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import { ACCELERATOR_MODULE_IDS } from '@ai/core/accelerator';
import { courseFor } from '@ai/core/course';
import type { LearnerCourse } from '@ai/core/course';
import type { Db, Resource, ResourcePlatform, ResourceVisibility } from '@ai/core';
import { weekRows } from '../learn/learn.vm';
import { stepVM } from '../learn/Step.vm';
import {
  BLOCK_LABELS,
  CONTENT_KINDS,
  PATH_KINDS,
  VIDEO_KINDS,
  mediaLines,
  mediaVideos,
  draftIssues,
  isWeekDraft,
  previewLoad,
  withDraft,
  listItems,
  listText,
  moveBy,
  mtFrom,
  mtInputs,
  mtWhen,
  newBlock,
  removeAt,
  setAt,
  tableRows,
  tableText,
  weekKit,
  weekSessions,
} from './WeekBuilder.vm';
import type { WeekDraft } from './WeekBuilder.vm';

const prod = (): Db => seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
const week = (db: Db, n: number): WeekDraft => {
  const m = structuredClone(db.modules.find((x) => x.id === ACCELERATOR_MODULE_IDS[n])!);
  if (!isWeekDraft(m)) throw new Error('not a week');
  return m;
};

describe('the week builder’s view-model (D-174)', () => {
  it('tells a course week from an AI Employee', () => {
    const db = prod();
    expect(isWeekDraft(db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!)).toBe(true);
    const { kind: _k, ...plain } = db.modules[0]!;
    expect(isWeekDraft(plain)).toBe(false);
  });

  it('shows times in Mountain Time with MT, and reads typed ones back, noon by default', () => {
    const t = Date.parse('2026-12-09T19:00:00Z');
    expect(mtWhen(t)).toBe('Wed, Dec 9 · 12:00 PM MT / 1:00 PM CT');
    expect(mtInputs(t)).toEqual({ date: '2026-12-09', time: '12:00' });
    expect(mtInputs(null)).toEqual({ date: '', time: '' });
    expect(mtFrom('2026-12-09', '')).toBe(t);
    expect(mtFrom('2026-12-09', '12:00')).toBe(t);
    expect(mtFrom('', '12:00')).toBeNull();
  });

  it('lists a week’s sessions: its own and the ones its pages name, by start, the named ones kept', () => {
    const db = prod();
    const w2 = week(db, 2);
    const rows = weekSessions(db, w2);
    expect(rows.map((r) => r.id)).toEqual(['dec26-s2', 'dec26-oh2']);
    expect(rows.every((r) => r.named)).toBe(true);
    expect(rows[0]!.kind).toBe('Live build');
    expect(rows[0]!.when).toMatch(/ MT \/ \d{1,2}:\d{2} [AP]M CT$/);
    db.sessions.push({
      ...structuredClone(db.sessions[0]!),
      id: 's_new',
      moduleId: w2.id,
      start: db.sessions[0]!.start + 864e5 * 30,
    });
    expect(weekSessions(db, w2).find((r) => r.id === 's_new')!.named).toBe(false);
  });

  it('lists a week’s kit with where each item sits', () => {
    const db = prod();
    const w0 = week(db, 0);
    db.resources.push({
      id: 'r1',
      title: 'Ready Check prompt',
      desc: '',
      cat: 'Prompts',
      type: 'TXT',
      tier: 'agent',
      size: '2 KB',
      dl: 0,
      updated: 0,
      exec: false,
      status: 'published',
      module: w0.id,
      kind: 'prompt',
      stepId: 'c2',
      visibility: 'open_in_preview',
      platform: 'chatgpt',
    });
    db.resources.push({
      id: 'r2',
      title: 'Elsewhere',
      desc: '',
      cat: 'Prompts',
      type: 'TXT',
      tier: 'agent',
      size: '2 KB',
      dl: 0,
      updated: 0,
      exec: false,
      status: 'published',
    });
    expect(weekKit(db, w0).map(({ resource: _r, ...x }) => x)).toEqual([
      {
        id: 'r1',
        title: 'Ready Check prompt',
        kind: 'Prompt',
        visibility: 'Open in the preview',
        platform: 'ChatGPT',
        step: 'Step 2',
      },
    ]);
  });

  it('says what Save would refuse, for what changed only', () => {
    const db = prod();
    const stored = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[2])!;
    const draft = week(db, 2);
    expect(draftIssues(stored, draft)).toEqual([]);
    draft.course.question = 'Which pay—really?';
    expect(draftIssues(stored, draft)).toEqual(['Question: Use a comma, a colon or a period instead of an em dash.']);
  });

  it('edits lists, blocks and tables as staff type them', () => {
    expect(setAt(['a', 'b'], 1, 'c')).toEqual(['a', 'c']);
    expect(removeAt(['a', 'b'], 0)).toEqual(['b']);
    expect(moveBy(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveBy(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(listItems(' one \n\n two ')).toEqual(['one', 'two']);
    expect(listText(['one', 'two'])).toBe('one\ntwo');
    expect(tableRows('a | b\n\nc|d ')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(tableText([['a', 'b']])).toBe('a | b');
    expect(newBlock('copy')).toEqual({ type: 'copy', label: '', text: '' });
    expect(newBlock('table')).toEqual({ type: 'table', rows: [] });
  });
});

describe('a video block in the builder (D-188)', () => {
  it('starts a new video as an empty link, which the save refuses until it is one', () => {
    expect(newBlock('video')).toEqual({ type: 'video', source: { url: '' } });
    const stored = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }).modules.find(
      (m) => m.id === ACCELERATOR_MODULE_IDS[2],
    )!;
    const draft = structuredClone(stored);
    draft.checklist[0]!.paths = { claude: { blocks: [newBlock('video')] } };
    expect(draftIssues(stored, draft)).toEqual([
      'Step 1, Claude path, block 1: Use an http or https link for a video, or upload an mp4.',
    ]);
    draft.checklist[0]!.paths = { claude: { blocks: [{ type: 'video', source: { url: 'https://youtu.be/x' } }] } };
    expect(draftIssues(stored, draft)).toEqual([]);
  });

  it('offers video in a step’s paths and the Media videos, never in a sample output', () => {
    expect(BLOCK_LABELS.video).toBe('Video');
    expect(BLOCK_LABELS.check).toBe('Checklist item');
    expect(PATH_KINDS).toEqual(['text', 'copy', 'list', 'table', 'video', 'check', 'callout', 'accordion']);
    expect(CONTENT_KINDS).not.toContain('video');
    expect(VIDEO_KINDS).toEqual(['video']);
  });

  it('splits Media into its lines and its videos, in order', () => {
    const v = { type: 'video' as const, source: { url: 'https://x.test/a.mp4' } };
    expect(mediaLines(['a', v, 'b'])).toEqual(['a', 'b']);
    expect(mediaVideos(['a', v, 'b'])).toEqual([v]);
  });
});

const deployed = (): Db =>
  planCopyV3(
    planContentV2(
      planCopyV1(
        planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db,
      ).db,
    ).db,
  ).db;

const NOW = Date.parse('2026-11-18T21:00:00Z');

function placed(
  id: string,
  title: string,
  stepId: string,
  visibility: ResourceVisibility,
  platform: ResourcePlatform | null,
  status: Resource['status'] = 'published',
): Resource {
  return {
    id,
    title,
    desc: '',
    cat: 'Files',
    type: 'ZIP',
    tier: 'agent',
    size: '1 KB',
    dl: 0,
    updated: 0,
    exec: false,
    status,
    module: ACCELERATOR_MODULE_IDS[0],
    kind: 'file',
    stepId,
    visibility,
    ...(platform ? { platform } : {}),
  };
}

/** Week 0 as it is live: Step 4 links two skills that are not in the Library, and the zips sit on that step. */
function week0Kit(): { db: Db; draft: WeekDraft } {
  const db = deployed();
  const mod = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!;
  const step4 = mod.checklist[3]!;
  const step5 = mod.checklist[4]!;
  step4.linkedSkill = 'map-your-spend, lead-source-review';
  db.resources.push(
    placed('zip-spend', 'Spend workbook', step4.id, 'open_in_preview', 'both'),
    placed('zip-leads', 'Source workbook', step4.id, 'open_in_preview', 'both'),
    placed('zip-gpt', 'ChatGPT only workbook', step4.id, 'open_in_preview', 'chatgpt'),
    placed('zip-other', 'Another step workbook', step5.id, 'open_in_preview', 'both'),
    placed('zip-hidden', 'Hidden workbook', step4.id, 'hidden', 'both'),
  );
  const draft = structuredClone(mod);
  if (!isWeekDraft(draft)) throw new Error('not a week');
  return { db, draft };
}

function titles(db: Db, course: LearnerCourse, tab: 'claude' | 'chatgpt'): string[] {
  const payload = { open: true as const, preview: false, course, sessions: [], copy: {} };
  const row = weekRows(payload, db, null).find((r) => r.week === 0);
  const vm = stepVM(payload, row, 4, { kind: 'staff', staffId: 'preview' }, NOW, {
    fileUrl: (id) => `/api/files/resource/${id}`,
    tab,
  });
  if (vm.kind !== 'step') throw new Error('missing step');
  return vm.forStep.map((r) => r.title);
}

describe('Preview as Learner includes a step’s kit (D-192)', () => {
  it('an owner’s preview of Step 4 lists the zips placed on it, and a learner’s course already did', () => {
    const { db, draft } = week0Kit();
    const owner = previewLoad(db, draft, 'owner', 0);
    const operator = previewLoad(db, draft, 'operator', 0);
    if (owner.kind !== 'ready' || operator.kind !== 'ready') throw new Error('preview did not open');
    const onClaude = ['Spend workbook', 'Source workbook'];
    expect(titles(withDraft(db, draft), owner.payload.course, 'claude')).toEqual(onClaude);
    expect(titles(withDraft(db, draft), operator.payload.course, 'claude')).toEqual(onClaude);
    expect(titles(withDraft(db, draft), owner.payload.course, 'chatgpt')).toEqual([
      'Spend workbook',
      'Source workbook',
      'ChatGPT only workbook',
    ]);
    // The live answer, for a learner in the course with Week 0 open: the same zips. The skills stay off
    // this step because their Library pages are not built; the zips are the rows.
    const live = courseFor(db, NOW, { open: true, preview: false });
    expect(titles(db, live!, 'claude')).toEqual(onClaude);
    const duringPreview = courseFor(db, NOW, { open: true, preview: true });
    expect(titles(db, duringPreview!, 'claude')).toEqual(onClaude);
  });

  it('a checklist step in that preview keeps the one-step layout and still lists the kit in For this step', () => {
    const { db, draft } = week0Kit();
    const step4 = draft.checklist[3]!;
    const claude = step4.paths?.claude?.blocks ?? [];
    step4.paths = {
      ...(step4.paths ?? {}),
      claude: { blocks: [...claude, { type: 'check', id: 's4-zip', title: 'Download the workbooks' }] },
    };
    const owner = previewLoad(db, draft, 'owner', 0);
    if (owner.kind !== 'ready') throw new Error('preview did not open');
    const payload = { open: true as const, preview: false, course: owner.payload.course, sessions: [], copy: {} };
    const row = weekRows(payload, withDraft(db, draft), null).find((r) => r.week === 0);
    const vm = stepVM(payload, row, 4, { kind: 'staff', staffId: 'preview' }, NOW, {
      fileUrl: (id) => `/api/files/resource/${id}`,
      tab: 'claude',
    });
    if (vm.kind !== 'step') throw new Error('missing step');
    expect(vm.pills?.length).toBeGreaterThan(0);
    expect(vm.layouts?.claude?.items.map((item) => item.title)).toContain('Download the workbooks');
    expect(vm.forStep.map((r) => r.title)).toEqual(['Spend workbook', 'Source workbook']);
  });

  it('a learner’s step 1 resolves Download from the course kit, and Invite does not need the kit', () => {
    const db = deployed();
    const mod = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!;
    const step1 = mod.checklist[0]!;
    step1.paths = {
      claude: {
        blocks: [
          {
            type: 'check',
            id: 's1-intake',
            title: 'Fill in your intake',
            action: { type: 'download', kitItemIds: ['intake-form'] },
          },
          {
            type: 'check',
            id: 's1-invite',
            title: 'Bring your operator in',
            action: { type: 'invite', label: 'Invite your operator' },
          },
          {
            type: 'check',
            id: 's1-stack',
            title: 'Fill in your stack card',
            action: { type: 'download', kitItemIds: ['stack-card'] },
          },
        ],
      },
    };
    const file = (id: string, title: string): Resource => ({
      id,
      title,
      desc: '',
      cat: 'Files',
      type: 'PDF',
      tier: 'agent',
      size: '1 KB',
      dl: 0,
      updated: 0,
      exec: false,
      status: 'published',
      module: mod.id,
      kind: 'file',
      stepId: step1.id,
      visibility: 'open_in_preview',
      platform: 'both',
    });
    db.resources.push(file('intake-form', 'Week 0 Intake Form'), file('stack-card', 'Week 0 Stack Card'));
    const course = courseFor(db, NOW, { open: true, preview: false })!;
    const payload = { open: true as const, preview: false, course, sessions: [], copy: {} };
    const row = weekRows(payload, db, null).find((r) => r.week === 0);
    const vm = stepVM(payload, row, 1, { kind: 'learner', userId: 'u-dana' }, NOW, {
      fileUrl: (id) => `/api/files/resource/${id}`,
    });
    if (vm.kind !== 'step' || !vm.layouts?.claude) throw new Error('missing layout');
    const byId = new Map(vm.layouts.claude.items.map((item) => [item.id, item.action]));
    expect(byId.get('s1-intake')).toEqual({
      type: 'download',
      files: [{ id: 'intake-form', title: 'Week 0 Intake Form', href: '/api/files/resource/intake-form' }],
    });
    expect(byId.get('s1-stack')).toEqual({
      type: 'download',
      files: [{ id: 'stack-card', title: 'Week 0 Stack Card', href: '/api/files/resource/stack-card' }],
    });
    expect(byId.get('s1-invite')).toEqual({ type: 'invite', label: 'Invite your operator', href: '/learn/team' });
    const draft = structuredClone(mod);
    if (!isWeekDraft(draft)) throw new Error('not a week');
    const owner = previewLoad(db, draft, 'owner', 0);
    if (owner.kind !== 'ready') throw new Error('preview did not open');
    const previewVm = stepVM(
      { open: true, preview: false, course: owner.payload.course, sessions: [], copy: {} },
      weekRows(
        { open: true, preview: false, course: owner.payload.course, sessions: [], copy: {} },
        withDraft(db, draft),
        null,
      ).find((r) => r.week === 0),
      1,
      { kind: 'staff', staffId: 'preview' },
      NOW,
      { fileUrl: (id) => `/api/files/resource/${id}` },
    );
    if (previewVm.kind !== 'step' || !previewVm.layouts?.claude) throw new Error('preview layout missing');
    expect(previewVm.layouts.claude.items.map((item) => item.action)).toEqual(
      vm.layouts.claude.items.map((item) => item.action),
    );
  });
});
