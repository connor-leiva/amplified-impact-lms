// D-190: checklist items, the gate, dependencies and the progress count.
import { describe, expect, it } from 'vitest';
import { gateRemaining, itemChecked, orderGroups, pathHasCheck, pathRegions, progressCounts, waitingOn, weekHasCheck, checklistIssueLines, titleWords } from '../src/checklist';
import type { CheckBlock, PathBlock } from '../src/course-types';
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
