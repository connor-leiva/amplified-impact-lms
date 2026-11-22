// D-236: the seat card form's drawer. Its questions are the week's seat card; the owner's main button signs, the
// operator's marks it ready for the owner, an agent's drawer is locked (only Close and Download PDF work); a refusal
// says why in the foot; a change after signing keeps the signature (Connor, Nov 22).
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SeatCard } from '@ai/core/course-types';
import { FormDrawer } from './FormDrawer';
import { SEAT_CARD_FAILED, useSeatCardForm } from './seatcard.data';
import { SEAT_CARD_UI, seatCardDef, seatCardInitial } from './seatcard.vm';
import type { SeatCardBody, SeatCardRole } from './seatcard.vm';

const CARD: SeatCard = {
  seat: 'Finance Analyst',
  reportsTo: 'Owner',
  runs: 'Monthly, after the books close',
  pulls: 'Last month’s books and closings',
  applies: 'The Standard Chart',
  produces: 'Last month’s numbers at the top of the Owner Desk',
  tookOver: 'Baseline task 1',
  cantDo: 'Change the books',
};
const AT = { week: 1, step: 6, signLabel: 'Sign the seat card' };
const FULL = { reportsTo: 'Alex Morgan', runs: 'The 5th', pulls: 'QuickBooks', applies: 'Our map', produces: 'Owner Desk', tookOver: 'Task 1, 90 minutes', cantDo: 'Change the books', firstRun: 'Dec 5' };
/** Wed, Nov 25, 2026, 3:18 PM CT (the test setup's viewer zone is Central). */
const SIGNED = Date.parse('2026-11-25T21:18:00Z');

describe('the seat card’s words (D-236)', () => {
  it('takes its title from the seat, its kicker from the step, and its questions from the week’s rows', () => {
    const def = seatCardDef(CARD, AT, 'owner', {});
    expect(def.ui.title).toBe('Finance Analyst Seat Card');
    expect(def.ui.kicker).toBe('Week 1 · Step 6 · Owner and operator');
    expect(def.intake.sections[0]!.title).toBe('Finance Analyst');
    expect(def.intake.sections[0]!.questions.map((q) => [q.label, q.help ?? null])).toEqual([
      ['Reports To', 'Owner'], ['Runs', CARD.runs], ['Pulls', CARD.pulls], ['Applies', CARD.applies], ['Produces', CARD.produces],
      ['Took Over', CARD.tookOver], ['Can’t Do', CARD.cantDo], ['First Run', null],
    ]);
  });
  it('gives the owner Sign, the operator Ready for the owner, and an agent the locked line', () => {
    const owner = seatCardDef(CARD, AT, 'owner', {}).ui;
    expect([owner.submitLabel, owner.submittedLabel, owner.submittedTitle]).toEqual(['Sign the seat card', 'Signed', 'Seat card signed.']);
    const op = seatCardDef(CARD, AT, 'operator', {}).ui;
    expect([op.submitLabel, op.submittedLabel, op.submittedTitle, op.submittedText]).toEqual(['Ready for the owner', 'Ready', 'Ready for the owner.', SEAT_CARD_UI.readyText]);
    expect(seatCardDef(CARD, AT, 'agent', {}).ui.sub).toBe('Your team’s owner and operator fill this in.');
    // The owner's button is the sign item's title (the builder's words), or "Sign" when the action names none.
    expect(seatCardDef(CARD, { week: 1, step: 6 }, 'owner', {}).ui.submitLabel).toBe('Sign');
    // Signed: who and when, for everyone; the editors also hear that a change saves.
    expect(seatCardDef(CARD, AT, 'operator', { signedAt: SIGNED, signedBy: 'Alex Morgan' }).ui.submittedText).toBe('Signed by Alex Morgan, Nov 25. Change anything here and it saves the same way.');
    expect(seatCardDef(CARD, AT, 'agent', { signedAt: SIGNED, signedBy: 'Alex Morgan' }).ui.submittedText).toBe('Signed by Alex Morgan, Nov 25.');
  });
  it('starts signed with its signature (or, after a later change, that change); ready for the operator only; else a draft', () => {
    const body: SeatCardBody = { answers: FULL, updatedAt: SIGNED, readyAt: SIGNED, signedAt: SIGNED, signedBy: 'Alex Morgan' };
    expect(seatCardInitial(body, 'agent', SIGNED)).toEqual({ status: 'submitted', answers: FULL, savedLabel: 'Signed Nov 25, 3:18 PM', submittedShort: 'Nov 25' });
    expect(seatCardInitial({ ...body, updatedAt: SIGNED + 60_000 }, 'owner', SIGNED + 120_000).savedLabel).toBe('Saved 3:19 PM');
    const ready: SeatCardBody = { answers: FULL, updatedAt: SIGNED, readyAt: SIGNED, signedAt: null };
    expect(seatCardInitial(ready, 'operator', SIGNED)).toMatchObject({ status: 'submitted', savedLabel: 'Ready Nov 25, 3:18 PM' });
    expect(seatCardInitial(ready, 'owner', SIGNED)).toMatchObject({ status: 'draft', savedLabel: 'Saved 3:18 PM' });
    expect(seatCardInitial({ answers: {} }, 'owner', SIGNED)).toEqual({ status: 'new', answers: {} });
  });
});

describe('the seat card drawer (D-236)', () => {
  let calls: { method: string; url: string; body: Record<string, unknown> | null }[];
  let answer: (method: string, body: Record<string, unknown> | null) => { status: number; json: unknown };
  beforeEach(() => {
    calls = [];
    answer = (method) => (method === 'GET' ? { status: 200, json: { answers: {}, role: 'owner', preview: false } } : { status: 200, json: { answers: {}, signedAt: null, signedBy: null } });
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      calls.push({ method, url, body });
      const r = answer(method, body);
      return new Response(JSON.stringify(r.json), { status: r.status, headers: { 'content-type': 'application/json' } });
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function Drawer({ role }: { role: SeatCardRole }) {
    const f = useSeatCardForm('accelerator-week-1', CARD, AT, role, SIGNED);
    return <FormDrawer f={f} open onClose={() => {}} locked={role === 'agent'} />;
  }
  const fill = async (c: HTMLElement) => {
    for (const [id, v] of Object.entries(FULL)) await act(async () => { fireEvent.change(c.querySelector(`[id="fm-${id}"]`)!, { target: { value: v } }); });
  };

  it('locks an agent’s drawer: every answer shown read-only, no main button, Download PDF still there', async () => {
    answer = () => ({ status: 200, json: { answers: FULL, role: 'agent', preview: false, signedAt: SIGNED, signedBy: 'Alex Morgan', updatedAt: SIGNED } });
    const c = render(<Drawer role="agent" />).container;
    await act(async () => { await Promise.resolve(); });
    const runs = c.querySelector<HTMLTextAreaElement>('[id="fm-runs"]')!;
    expect(runs.readOnly).toBe(true);
    expect(runs.value).toBe('The 5th');
    expect(c.querySelector('.fm-submit')).toBeNull();
    expect(c.querySelector('.fm-done')).toBeNull();
    expect(c.querySelector('.fm-pdf')!.textContent).toMatch(/Download PDF/);
    expect(c.querySelector('.fm-banner')!.textContent).toBe('Seat card signed.Signed by Alex Morgan, Nov 25.');
    fireEvent.change(runs, { target: { value: 'Weekly' } });
    expect(calls.filter((x) => x.method === 'PUT')).toEqual([]);
  });

  it('signs for the owner: every answer, then one PUT with sign', async () => {
    answer = (method) => (method === 'GET' ? { status: 200, json: { answers: {}, role: 'owner' } } : { status: 200, json: { answers: FULL, signedAt: SIGNED, signedBy: 'Alex Morgan' } });
    const c = render(<Drawer role="owner" />).container;
    await act(async () => { await Promise.resolve(); });
    expect(c.querySelector('.fm-submit')!.textContent).toMatch(/^Sign the seat card/);
    await fill(c);
    await act(async () => { fireEvent.click(c.querySelector('.fm-submit')!); });
    await act(async () => { await Promise.resolve(); });
    const signs = calls.filter((x) => x.method === 'PUT' && x.body?.sign === true);
    expect(signs).toHaveLength(1);
    expect(signs[0]!.body).toEqual({ moduleId: 'accelerator-week-1', answers: FULL, sign: true });
    expect(c.querySelector('.fm-banner')!.textContent).toBe('Seat card signed.Signed by Alex Morgan, Nov 25. Change anything here and it saves the same way.');
  });

  it('marks it ready for the operator, and says why in the foot when the server refuses', async () => {
    answer = (method, body) =>
      method === 'GET' ? { status: 200, json: { answers: {}, role: 'operator' } } : body?.ready ? { status: 422, json: { error: 'Never a password.' } } : { status: 200, json: { answers: {} } };
    const c = render(<Drawer role="operator" />).container;
    await act(async () => { await Promise.resolve(); });
    expect(c.querySelector('.fm-submit')!.textContent).toMatch(/^Ready for the owner/);
    await fill(c);
    await act(async () => { fireEvent.click(c.querySelector('.fm-submit')!); });
    await act(async () => { await Promise.resolve(); });
    expect(calls.some((x) => x.method === 'PUT' && x.body?.ready === true && x.body.sign === undefined)).toBe(true);
    expect(c.querySelector('.fm-note')!.textContent).toBe('Never a password.');
    expect(c.querySelector('.fm-submit')!.getAttribute('data-state')).toBe('error');
    expect(c.querySelector('.fm-banner')).toBeNull();
    // A dropped connection says so in the drawer's own words.
    answer = (method) => (method === 'PUT' ? { status: 500, json: {} } : { status: 200, json: {} });
    await act(async () => { fireEvent.click(c.querySelector('.fm-submit')!); });
    await act(async () => { await Promise.resolve(); });
    expect(c.querySelector('.fm-note')!.textContent).toBe(SEAT_CARD_FAILED);
  });
});
