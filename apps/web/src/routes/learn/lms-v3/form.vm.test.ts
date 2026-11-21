// D-229: the form drawer's props from the course's intake and GET /api/intake (§7.4, B-14, B-17).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fmt, setViewerZone } from '@ai/core';
import { FORM_UI, formInitial, formRow, savedLabel } from './form.vm';

beforeEach(() => setViewerZone('America/Chicago'));
afterEach(() => setViewerZone(null));

const NOW = Date.parse('2026-11-20T21:18:00Z'); // Fri Nov 20, 3:18 PM CT

describe('the drawer’s stamps (B-17), in the mockup’s words for a Central-time viewer', () => {
  it('the same day, within the week, before that', () => {
    expect(savedLabel(Date.parse('2026-11-20T21:18:00Z'), NOW)).toBe('Saved 3:18 PM');
    expect(savedLabel(Date.parse('2026-11-19T22:02:00Z'), NOW)).toBe('Saved Thu 4:02 PM');
    expect(savedLabel(Date.parse('2026-11-12T22:02:00Z'), NOW)).toBe('Saved Nov 12, 4:02 PM');
  });
  it('fmt’s two new formatters', () => {
    expect(fmt.clockTime(NOW)).toBe('3:18 PM');
    expect(fmt.weekdayShort(NOW)).toBe('Fri');
  });
});

describe('formInitial', () => {
  it('new, draft and submitted, as the package’s samples have them', () => {
    expect(formInitial(null, NOW)).toEqual({ status: 'new', answers: {} });
    expect(
      formInitial({ answers: { name: 'Alex' }, updatedAt: Date.parse('2026-11-19T22:02:00Z'), submittedAt: null }, NOW),
    ).toEqual({ status: 'draft', answers: { name: 'Alex' }, savedLabel: 'Saved Thu 4:02 PM' });
    expect(
      formInitial({ answers: { name: 'Alex' }, updatedAt: 1, submittedAt: Date.parse('2026-11-19T22:02:00Z') }, NOW),
    ).toEqual({
      status: 'submitted',
      answers: { name: 'Alex' },
      savedLabel: 'Submitted Nov 19, 4:02 PM',
      submittedShort: 'Nov 19',
    });
  });
});

describe('formRow (B-14)', () => {
  it('the intake’s file row becomes the form’s row: its line and one button', () => {
    let opened = 0;
    const row = formRow(
      { icon: 'file', title: 'Week 0 Intake Form', meta: 'Step 1', href: '/api/files/resource/intake-form' },
      { row: { meta: '9 of 22 answered', label: 'Continue' } },
      () => (opened += 1),
    );
    expect(row).toMatchObject({
      icon: 'file',
      title: 'Week 0 Intake Form',
      meta: 'Step 1 · 9 of 22 answered',
      form: 'intake',
    });
    expect(row.href).toBeUndefined();
    expect(row.acts?.map((a) => [a.icon, a.label, a.act])).toEqual([['pen', 'Continue', 'form']]);
    row.acts![0]!.onClick!();
    expect(opened).toBe(1);
  });
  it('the drawer’s words are the package’s', () => expect(FORM_UI.submitLabel).toBe('Submit intake'));
});
