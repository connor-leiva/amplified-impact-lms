// D-190: checklist items, the gate, dependencies and the progress count.
import { describe, expect, it } from 'vitest';
import { gateRemaining, itemChecked, localToggle, localWatch, orderGroups, pathHasCheck, pathRegions, progressCounts, waitingOn, weekHasCheck, checklistIssueLines, titleWords } from '../src/checklist';
import type { LocalChecks } from '../src/checklist';
import type { CheckBlock, PathBlock, VideoBlock } from '../src/course-types';
import type { Step } from '../src/types';
import { checklistIssues, moduleCopyFields, changedFields, copyIssues } from '../src/course-rules';
import { curriculumSeed } from '../seed/curriculum';
import type { AIEmployee } from '../src/types';

const check = (id: string, extra: Partial<CheckBlock> = {}): CheckBlock => ({ type: 'check', id, title: id, ...extra });

const on = (ids: string[]) => (itemId: string) => ids.includes(itemId);

describe('checklist blocks (D-190)', () => {
  it('a path with a checklist item is the new layout, and a path without one is not', () => {
    expect(pathHasCheck([{ type: 'text', text: 'Read this.' }])).toBe(false);
    expect(pathHasCheck([check('a')])).toBe(true);
    expect(weekHasCheck([{ paths: { claude: { blocks: [{ type: 'text', text: 'Hi' }] } } }])).toBe(false);
    expect(weekHasCheck([{ paths: { chatgpt: { blocks: [check('a')] } } }])).toBe(true);
  });

  it('warns past 8 words and does not treat that as a save error by itself', () => {
    expect(titleWords('Check your plan and training setting')).toBe(6);
    expect(titleWords('One two three four five six seven eight nine')).toBe(9);
  });

  it('checks an item when every sub-check is checked, and not before', () => {
    const seven = check('s3-seven', { subchecks: [{ id: 's3-t1', label: 'One' }, { id: 's3-t2', label: 'Two' }] });
    expect(itemChecked(seven, on([]))).toBe(false);
    expect(itemChecked(seven, on(['s3-seven:s3-t1']))).toBe(false);
    expect(itemChecked(seven, on(['s3-seven:s3-t1', 's3-seven:s3-t2']))).toBe(true);
    expect(itemChecked(check('plain'), on(['plain']))).toBe(true);
  });

  it('counts tasks when a path has sub-checks, and items otherwise', () => {
    const blocks: PathBlock[] = [
      check('s3-seven', { subchecks: [{ id: 's3-t1', label: 'A' }, { id: 's3-t2', label: 'B' }, { id: 's3-t3', label: 'C' }] }),
      check('other'),
    ];
    expect(progressCounts(blocks, on(['s3-seven:s3-t1']))).toEqual({ done: 1, total: 3, tasks: true });
    expect(progressCounts([check('a'), check('b', { optional: true })], on(['a']))).toEqual({ done: 1, total: 2, tasks: false });
  });

  it('gates on visible non-optional items, and a waiting item counts once it is checked', () => {
    const blocks: PathBlock[] = [check('a'), check('b', { optional: true }), check('c')];
    expect(gateRemaining(blocks, on([]))).toBe(2);
    expect(gateRemaining(blocks, on(['a']))).toBe(1);
    expect(gateRemaining(blocks, on(['a', 'c']))).toBe(0);
    // Optional never blocks. A checked waiting item (c) no longer counts.
    expect(gateRemaining(blocks, on(['a', 'b']))).toBe(1);
  });

  it('waits on an unmet cross-step dependency, including one that does not exist yet, and not on a same-step one', () => {
    const satisfied = (stepN: number, itemId: string) => stepN === 6 && itemId === 's6-google';
    expect(waitingOn(['s1-invite'], satisfied)).toBeNull();
    expect(waitingOn(['step:6:s6-google'], () => false)).toBe(6);
    expect(waitingOn(['step:6:s6-google'], satisfied)).toBeNull();
    expect(waitingOn(['step:6:missing'], satisfied)).toBe(6);
  });

  it('orders a same-step dependency ahead of the item that names it, and keeps callouts with their item', () => {
    const blocks: PathBlock[] = [
      check('later', { dependsOn: ['first'] }),
      { type: 'callout', kind: 'tip', text: 'After later.' },
      check('first'),
    ];
    const regions = pathRegions(blocks);
    expect(regions.groups.map((g) => g.item.id)).toEqual(['first', 'later']);
    expect(regions.groups[1]!.callouts.map((c) => c.text)).toEqual(['After later.']);
    expect(orderGroups(regions.groups).map((g) => g.item.id)).toEqual(['first', 'later']);
  });

  it('refuses a repeated id, a same-step dependency that is not on the step, and a time without MT in a title', () => {
    const bad = {
      paths: {
        claude: {
          blocks: [
            check('a', { title: 'Meet at 9:00 AM', dependsOn: ['missing'] }),
            check('a'),
            { type: 'callout' as const, kind: 'tip' as const, text: 'Use a comma — not this.' },
          ],
        },
      },
    };
    expect(checklistIssueLines([bad]).join('\n')).toMatch(/already used/);
    expect(checklistIssueLines([bad]).join('\n')).toMatch(/not an item on this step/);
    expect(checklistIssueLines([{ paths: { claude: { blocks: [check('only', { dependsOn: ['step:6:s6-google'] })] } } }])).toEqual([]);

    const week = curriculumSeed().modules.find((m) => m.kind === 'week')!;
    const draft = structuredClone(week) as AIEmployee;
    draft.checklist[0]!.paths = { claude: { blocks: [check('a', { title: 'Meet at 9:00 AM.' })] } };
    const issues = copyIssues(changedFields(moduleCopyFields(week), moduleCopyFields(draft)));
    expect(issues.map((i) => i.rule)).toContain('time_zone');
    draft.checklist[0]!.paths = { claude: { blocks: [check('a'), check('a')] } };
    expect(checklistIssues(draft).join('\n')).toMatch(/already used/);
  });
});

describe('staff preview checks stay in memory (D-194)', () => {
  const empty: LocalChecks = { checks: [], video: [] };
  const video: VideoBlock = { type: 'video', id: 'w0-02', source: { url: 'https://cdn.example.test/w.mp4' } };
  const step = (id: string, paths: Step['paths']): Step => ({ id, text: '', ch: '', mins: 1, t: 0, hint: '', paths });

  it('toggles a mark on and off, and a checked dependency is no longer waiting', () => {
    const on = localToggle(empty, { moduleId: 'accelerator-week-0', stepId: 'c6', itemId: 's6-google' }, 10);
    expect(on.checks).toEqual([{ moduleId: 'accelerator-week-0', stepId: 'c6', itemId: 's6-google', checked: true, auto: false, checkedAt: 10 }]);
    const off = localToggle(on, { moduleId: 'accelerator-week-0', stepId: 'c6', itemId: 's6-google' }, 11);
    expect(off.checks[0]).toMatchObject({ checked: false, auto: false });
    expect(off.checks[0]).not.toHaveProperty('checkedAt');
    const waiting = (checks: LocalChecks) => waitingOn(['step:6:s6-google'], (n, itemId) => checks.checks.some((c) => c.checked && c.stepId === `c${n}` && c.itemId === itemId));
    expect(waiting(empty)).toBe(6);
    expect(waiting(on)).toBeNull();
  });

  it('checks a video item once when the watch crosses 90%, and not again', () => {
    const steps: Step[] = [step('c2', { claude: { blocks: [video, check('s2-watch', { title: 'Watch the video', auto: { video: true, at: 0.9 } })] } })];
    const args = { moduleId: 'sales', videoId: 'w0-02' };
    const early = localWatch(empty, steps, { ...args, maxPct: 0.4, lastPositionS: 12 }, 1);
    expect(early.checks).toEqual([]);
    expect(early.video[0]).toMatchObject({ maxPct: 0.4, lastPositionS: 12 });
    const lower = localWatch(early, steps, { ...args, maxPct: 0.2, lastPositionS: 30 }, 2);
    expect(lower.video[0]).toMatchObject({ maxPct: 0.4, lastPositionS: 30 });
    const crossed = localWatch(lower, steps, { ...args, maxPct: 0.91, lastPositionS: 40 }, 3);
    expect(crossed.checks[0]).toMatchObject({ stepId: 'c2', itemId: 's2-watch', checked: true, auto: true });
    const again = localWatch(crossed, steps, { ...args, maxPct: 0.99, lastPositionS: 50 }, 4);
    expect(again.checks).toHaveLength(1);
    expect(again.checks[0]).toMatchObject({ checked: true, auto: true });
    expect(localWatch(empty, steps, { ...args, maxPct: 2, lastPositionS: 1 }, 5)).toBe(empty);
  });
});
