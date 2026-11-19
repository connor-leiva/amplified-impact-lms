import { describe, expect, it } from 'vitest';
import { seedProduction } from '@ai/core/seed/curriculum';
import { ACCELERATOR_MODULE_IDS } from '@ai/core/accelerator';
import type { Db } from '@ai/core';
import {
  BLOCK_LABELS,
  CONTENT_KINDS,
  PATH_KINDS,
  VIDEO_KINDS,
  mediaLines,
  mediaVideos,
  draftIssues,
  isWeekDraft,
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
    expect(mtWhen(t)).toBe('Wed, Dec 9 · 12:00 PM MT');
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
    expect(rows[0]!.when).toMatch(/ MT$/);
    db.sessions.push({ ...structuredClone(db.sessions[0]!), id: 's_new', moduleId: w2.id, start: db.sessions[0]!.start + 864e5 * 30 });
    expect(weekSessions(db, w2).find((r) => r.id === 's_new')!.named).toBe(false);
  });

  it('lists a week’s kit with where each item sits', () => {
    const db = prod();
    const w0 = week(db, 0);
    db.resources.push({ id: 'r1', title: 'Ready Check prompt', desc: '', cat: 'Prompts', type: 'TXT', tier: 'agent', size: '2 KB', dl: 0, updated: 0, exec: false, status: 'published', module: w0.id, kind: 'prompt', stepId: 'c2', visibility: 'open_in_preview', platform: 'chatgpt' });
    db.resources.push({ id: 'r2', title: 'Elsewhere', desc: '', cat: 'Prompts', type: 'TXT', tier: 'agent', size: '2 KB', dl: 0, updated: 0, exec: false, status: 'published' });
    expect(weekKit(db, w0).map(({ resource: _r, ...x }) => x)).toEqual([{ id: 'r1', title: 'Ready Check prompt', kind: 'Prompt', visibility: 'Open in the preview', platform: 'ChatGPT', step: 'Step 2' }]);
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
    expect(tableRows('a | b\n\nc|d ')).toEqual([['a', 'b'], ['c', 'd']]);
    expect(tableText([['a', 'b']])).toBe('a | b');
    expect(newBlock('copy')).toEqual({ type: 'copy', label: '', text: '' });
    expect(newBlock('table')).toEqual({ type: 'table', rows: [] });
  });
});

describe('a video block in the builder (D-188)', () => {
  it('starts a new video as an empty link, which the save refuses until it is one', () => {
    expect(newBlock('video')).toEqual({ type: 'video', source: { url: '' } });
    const stored = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }).modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[2])!;
    const draft = structuredClone(stored);
    draft.checklist[0]!.paths = { claude: { blocks: [newBlock('video')] } };
    expect(draftIssues(stored, draft)).toEqual(['Step 1, Claude path, block 1: Use an http or https link for a video, or upload an mp4.']);
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
