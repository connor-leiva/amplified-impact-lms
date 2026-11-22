// D-236: the seat card form's rules. The questions are the week's own seat card (the builder's Seat Card card); a step
// asks for it with a Form action set to the seat card; the Team Owner and the Operations Lead fill it in and only the
// Team Owner signs (Connor, Nov 20 and 22).
import { describe, expect, it } from 'vitest';
import type { CheckBlock, SeatCard } from '../src/course-types';
import { copyIssues } from '../src/course-rules';
import {
  SEAT_CARD_ANSWER_MAX,
  SEAT_CARD_FIELDS,
  SEAT_CARD_LABEL,
  cleanSeatCardAnswers,
  mayEditSeatCard,
  maySignSeatCard,
  seatCardAskOf,
  seatCardForm,
  seatCardMissing,
  seatCardRole,
} from '../src/seat-card';
import type { Step } from '../src/types';

const CARD: SeatCard = {
  seat: 'Finance Analyst',
  reportsTo: 'Owner',
  runs: 'Monthly, after the books close: the 5th at 6:00 AM MT, or the day after your close',
  pulls: 'Last month’s books and closings',
  applies: 'Your confirmed map in team-file.json and the Standard Chart',
  produces: 'Last month’s numbers at the top of the Owner Desk, with the date',
  tookOver: 'Baseline task 1, getting last month’s numbers in front of the owner',
  cantDo: 'Change the books, or fill a missing month with guesses. It says what is missing and stops',
};

const check = (id: string, action?: CheckBlock['action']): CheckBlock => ({ type: 'check', id, title: id, ...(action ? { action } : {}) });
const form = (itemId?: string): CheckBlock['action'] => ({ type: 'form', formId: 'seat-card', label: 'Open the seat card', ...(itemId ? { itemId } : {}) });
const step = (id: string, claude: CheckBlock[], chatgpt: CheckBlock[] = []): Step =>
  ({ id, text: id, mins: 10, paths: { claude: { blocks: claude }, chatgpt: { blocks: chatgpt } } }) as unknown as Step;

describe('the seat card form (D-236)', () => {
  it('asks the week’s own rows, the seat’s name over them and each standard as its hint', () => {
    const f = seatCardForm(CARD);
    expect(f.sections).toHaveLength(1);
    expect(f.sections[0]!.title).toBe('Finance Analyst');
    const qs = f.sections[0]!.questions;
    expect(qs.map((q) => q.id)).toEqual([...SEAT_CARD_FIELDS]);
    expect(qs.map((q) => q.label)).toEqual(['Reports To', 'Runs', 'Pulls', 'Applies', 'Produces', 'Took Over', 'Can’t Do', 'First Run']);
    expect(qs.find((q) => q.id === 'runs')).toEqual({ id: 'runs', label: 'Runs', help: CARD.runs, kind: 'long', required: true });
    expect(qs.find((q) => q.id === 'reportsTo')!.kind).toBe('short');
    // The week has no First Run standard: the row is asked, with no hint.
    expect(qs.find((q) => q.id === 'firstRun')).toEqual({ id: 'firstRun', label: 'First Run', kind: 'short', required: true });
    // A row changed in the builder is the form's new hint.
    expect(seatCardForm({ ...CARD, firstRun: 'Date and screenshot' }).sections[0]!.questions.at(-1)!.help).toBe('Date and screenshot');
  });

  it('labels its rows as the week page does, and the labels pass the course’s copy rules', () => {
    expect(SEAT_CARD_LABEL.cantDo).toBe('Can’t Do');
    expect(copyIssues(Object.entries(SEAT_CARD_LABEL).map(([k, text]) => ({ path: k, label: k, text })))).toEqual([]);
  });

  it('lets the owner and the operator fill it in, and only the owner sign', () => {
    expect(mayEditSeatCard('Team Owner')).toBe(true);
    expect(mayEditSeatCard('Operations Lead')).toBe(true);
    expect(mayEditSeatCard('Agent')).toBe(false);
    expect(maySignSeatCard('Team Owner')).toBe(true);
    expect(maySignSeatCard('Operations Lead')).toBe(false);
    expect(seatCardRole('Team Owner')).toBe('owner');
    expect(seatCardRole('Operations Lead')).toBe('operator');
    expect(seatCardRole('Agent')).toBe('agent');
    expect(seatCardRole(null)).toBe('agent');
  });

  it('finds the step that asks for it, and the items it fills and signs on both paths (the brief, §3)', () => {
    const week = {
      checklist: [
        step('c1', [check('w1s1c-run')]),
        step('c6', [check('w1s6c-fill', form('w1s6c-sign')), check('w1s6c-sign'), check('w1s6c-checkpoint')], [check('w1s6g-fill', form('w1s6g-sign')), check('w1s6g-sign')]),
      ],
    };
    // The owner's button takes the sign item's title: the builder's words.
    expect(seatCardAskOf(week)).toEqual({ stepId: 'c6', step: 2, fillIds: ['w1s6c-fill', 'w1s6g-fill'], signIds: ['w1s6c-sign', 'w1s6g-sign'], signLabel: 'w1s6c-sign' });
    // With no item named, signing checks the item itself.
    expect(seatCardAskOf({ checklist: [step('c6', [check('fill', form())])] })).toEqual({ stepId: 'c6', step: 1, fillIds: ['fill'], signIds: ['fill'] });
    // Another form, or no form, asks for nothing.
    expect(seatCardAskOf({ checklist: [step('c1', [check('x', { type: 'form', formId: 'intake', label: 'Open' })])] })).toBeNull();
    expect(seatCardAskOf(undefined)).toBeNull();
  });

  it('keeps only the card’s rows as trimmed text, and flags a password, an account number or an answer too long', () => {
    const out = cleanSeatCardAnswers({ reportsTo: '  Owner ', runs: 'Monthly', other: 'x', pulls: 5, applies: ['a'], produces: '' });
    expect(out).toEqual({ answers: { reportsTo: 'Owner', runs: 'Monthly' }, secret: false, long: false });
    expect(cleanSeatCardAnswers({ pulls: 'QuickBooks, password hunter2' }).secret).toBe(true);
    expect(cleanSeatCardAnswers({ pulls: 'Account 123456789' }).secret).toBe(true);
    expect(cleanSeatCardAnswers({ runs: 'x'.repeat(SEAT_CARD_ANSWER_MAX + 1) }).long).toBe(true);
    expect(cleanSeatCardAnswers(null)).toEqual({ answers: {}, secret: false, long: false });
    expect(cleanSeatCardAnswers(['reportsTo'])).toEqual({ answers: {}, secret: false, long: false });
  });

  it('names the rows still to answer', () => {
    expect(seatCardMissing({})).toEqual([...SEAT_CARD_FIELDS]);
    const all = Object.fromEntries(SEAT_CARD_FIELDS.map((f) => [f, 'x']));
    expect(seatCardMissing(all)).toEqual([]);
    expect(seatCardMissing({ ...all, firstRun: '  ' })).toEqual(['firstRun']);
  });
});
