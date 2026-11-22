// D-230 (B-24 to B-26): Turn in's rules. The files a team may turn in and their limits match the package's drawer
// (`handoff/lms-v3/src/components/TurnIn.jsx`: OK_EXT, 25 MB, 5 files; pinned against the package itself in the web
// app's `turnin.vm.test.ts`); the asks come from a week's upload actions.
import { describe, expect, it } from 'vitest';
import {
  SUBMISSION_KIND_LABEL,
  SUBMISSION_MAX_BYTES,
  SUBMISSION_MAX_FILES,
  SUBMISSION_STATUSES,
  SUBMISSION_TYPES,
  asksOf,
  bytesLabel,
  cleanMinutes,
  cleanNote,
  isSubmissionKind,
  isSubmissionStatus,
  mayTurnIn,
  submissionTypeFor,
} from '../src/submissions';

describe('Turn in (D-230)', () => {
  it('takes the drawer’s limits', () => {
    expect(Object.keys(SUBMISSION_TYPES)).toEqual(['pdf', 'html', 'htm', 'png', 'jpg', 'jpeg', 'xlsx', 'csv']);
    expect(SUBMISSION_MAX_BYTES).toBe(25e6);
    expect(SUBMISSION_MAX_FILES).toBe(5);
  });
  it('names each file’s type by its extension, whatever its case', () => {
    expect(submissionTypeFor('Map Your Spend report.HTML')).toBe('text/html');
    expect(submissionTypeFor('seat card.pdf')).toBe('application/pdf');
    expect(submissionTypeFor('first run.jpeg')).toBe('image/jpeg');
    expect(submissionTypeFor('first run.PNG')).toBe('image/png');
    expect(submissionTypeFor('baseline.xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(submissionTypeFor('archive.zip')).toBeNull();
    expect(submissionTypeFor('noext')).toBeNull();
    expect(submissionTypeFor('.pdf')).toBeNull();
  });
  it('labels each kind as the drawer heads it', () => {
    expect(SUBMISSION_KIND_LABEL).toEqual({ live_read: 'Report for a live read', checkpoint: 'Checkpoint' });
    expect(isSubmissionKind('live_read')).toBe(true);
    expect(isSubmissionKind('report')).toBe(false);
    expect(SUBMISSION_STATUSES).toEqual(['received', 'picked', 'reviewed']);
    expect(isSubmissionStatus('picked')).toBe(true);
    expect(isSubmissionStatus('approved')).toBe(false);
  });
  it('lets the owner and the operator turn in, and no one else', () => {
    expect(mayTurnIn('Team Owner')).toBe(true);
    expect(mayTurnIn('Operations Lead')).toBe(true);
    expect(mayTurnIn('Agent')).toBe(false);
    expect(mayTurnIn(null)).toBe(false);
  });
  it('finds a week’s asks from its upload actions, one per kind, with the drawer’s kicker', () => {
    const step = (id: string, blocks: unknown[]) => ({ id, paths: { claude: { blocks } } });
    const mod = {
      course: { week: 1 },
      checklist: [
        step('c1', [{ type: 'check', id: 'a', title: 'Run it' }]),
        step('c2', []),
        step('c3', []),
        step('c4', [{ type: 'check', id: 'r', title: 'Turn in the report', action: { type: 'upload', kind: 'live_read' } }]),
        step('c5', [{ type: 'check', id: 'r2', title: 'Again', action: { type: 'upload', kind: 'live_read' } }]),
        step('c6', [{ type: 'check', id: 'k', title: 'Checkpoint', action: { type: 'upload', kind: 'checkpoint' } }]),
      ],
    } as unknown as Parameters<typeof asksOf>[0];
    expect(asksOf(mod)).toEqual([
      { id: 'live_read', kind: 'live_read', step: 4, stepId: 'c4', itemId: 'r', itemIds: ['r'], kicker: 'Week 1 · Step 4' },
      { id: 'checkpoint', kind: 'checkpoint', step: 6, stepId: 'c6', itemId: 'k', itemIds: ['k'], kicker: 'Week 1 · Step 6' },
    ]);
  });
  it('names the asking item on both paths, so a turn-in ticks the ChatGPT path’s too (the Weeks 1 and 2 brief, §3)', () => {
    const upload = (id: string, kind: string) => ({ type: 'check', id, title: 'Turn it in', action: { type: 'upload', kind } });
    const mod = {
      course: { week: 1 },
      checklist: [
        { id: 'c4', paths: { claude: { blocks: [upload('w1s4c-submit', 'live_read')] }, chatgpt: { blocks: [{ type: 'check', id: 'w1s4g-run', title: 'Run it' }, upload('w1s4g-submit', 'live_read')] } } },
        { id: 'c6', paths: { claude: { blocks: [upload('w1s6c-checkpoint', 'checkpoint')] }, chatgpt: { blocks: [upload('w1s6g-checkpoint', 'checkpoint')] } } },
      ],
    } as unknown as Parameters<typeof asksOf>[0];
    expect(asksOf(mod).map((a) => [a.kind, a.stepId, a.itemIds])).toEqual([
      ['live_read', 'c4', ['w1s4c-submit', 'w1s4g-submit']],
      ['checkpoint', 'c6', ['w1s6c-checkpoint', 'w1s6g-checkpoint']],
    ]);
  });
  it('trims the note and the minutes to their limits, and sizes a file as the drawer does', () => {
    expect(cleanNote('  Look at advertising.  ')).toBe('Look at advertising.');
    expect(cleanNote('x'.repeat(2000))).toHaveLength(1000);
    expect(cleanNote(7)).toBe('');
    expect(cleanMinutes(' about 20 a day ')).toBe('about 20 a day');
    expect(cleanMinutes('y'.repeat(99))).toHaveLength(40);
    expect(bytesLabel(184_000)).toBe('184 KB');
    expect(bytesLabel(300)).toBe('1 KB');
    expect(bytesLabel(2_400_000)).toBe('2.4 MB');
  });
});
