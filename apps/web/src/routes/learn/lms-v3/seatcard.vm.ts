// D-236: the seat card form's drawer props, from the week's seat card and `GET /api/seat-card`. Pure.
//
// The questions are core's `seatCardForm` (the week's rows, each standard its hint), so the builder's Seat Card card
// is where its words change. The drawer's own words follow the intake's (FORM_UI): the title is the seat's
// ("Finance Analyst Seat Card"), the kicker the step's. Connor, Nov 22: the Team Owner's main button signs; the
// Operations Lead's is "Ready for the owner"; an agent reads it locked; a change after signing keeps the signature.
import { fmt } from '@ai/core';
import type { SeatCard } from '@ai/core/course-types';
import { seatCardForm } from '@ai/core/seat-card';
import type { SeatCardRole } from '@ai/core/seat-card';
import { FORM_UI, savedLabel } from './form.vm';
import type { FormDef, FormInitial, FormUi } from './types';

export const SEAT_CARD_ID = 'seat-card';

export type { SeatCardRole };

/** What `GET /api/seat-card` and `PUT /api/seat-card` answer. */
export interface SeatCardBody {
  answers?: Record<string, string>;
  updatedAt?: number | null;
  updatedBy?: string | null;
  readyAt?: number | null;
  signedAt?: number | null;
  signedBy?: string | null;
  role?: SeatCardRole;
  preview?: boolean;
}

/** The drawer's words. Chrome, as the intake's are; the card's own words are the week's. */
export const SEAT_CARD_UI = {
  seatCard: 'Seat Card',
  kickerWho: 'Owner and AI Implementer',
  /** The owner's button when the action names no sign item; else that item's title (the builder's words). */
  sign: 'Sign',
  signed: 'Signed',
  ready: 'Ready for the owner',
  readyWord: 'Ready',
  signedTitle: 'Seat card signed.',
  readyTitle: 'Ready for the owner.',
  readyText: 'Your owner signs it here. Change anything here and it saves the same way.',
  again: 'Change anything here and it saves the same way.',
  locked: 'Your team’s owner and AI Implementer fill this in.',
} as const;

const when = (t: number): string => `${fmt.date(t)}, ${fmt.clockTime(t)}`;

/** "Signed by Alex Morgan, Nov 25." */
export const signedLine = (by: string | null | undefined, at: number): string => `${SEAT_CARD_UI.signed}${by ? ` by ${by}` : ''}, ${fmt.date(at)}.`;

/** The drawer's form: the week's rows, and the words for this viewer and the card's state. */
export function seatCardDef(card: SeatCard, at: { week: number; step: number; signLabel?: string }, role: SeatCardRole, state: Pick<SeatCardBody, 'signedAt' | 'signedBy'>): FormDef {
  const signedAt = state.signedAt ?? null;
  const ui: FormUi = {
    ...FORM_UI,
    title: `${card.seat} ${SEAT_CARD_UI.seatCard}`,
    kicker: `Week ${at.week} · Step ${at.step} · ${SEAT_CARD_UI.kickerWho}`,
    sub: role === 'agent' ? SEAT_CARD_UI.locked : FORM_UI.sub,
    submitLabel: role === 'owner' ? at.signLabel || SEAT_CARD_UI.sign : SEAT_CARD_UI.ready,
    submittedLabel: role === 'owner' ? SEAT_CARD_UI.signed : SEAT_CARD_UI.readyWord,
    submittedTitle: signedAt !== null || role === 'owner' ? SEAT_CARD_UI.signedTitle : SEAT_CARD_UI.readyTitle,
    submittedText:
      signedAt !== null
        ? role === 'agent'
          ? signedLine(state.signedBy, signedAt)
          : `${signedLine(state.signedBy, signedAt)} ${SEAT_CARD_UI.again}`
        : role === 'owner'
          ? SEAT_CARD_UI.again
          : SEAT_CARD_UI.readyText,
  };
  return { id: SEAT_CARD_ID, ui, intake: seatCardForm(card) };
}

/**
 * Where the drawer starts. Signed: the banner, with the signature or, after a later change, when it last saved. Ready
 * and the viewer is the operator: the banner that it waits for the owner (the owner gets the card to sign). Else a
 * draft with its last save, or new.
 */
export function seatCardInitial(body: SeatCardBody | null, role: SeatCardRole, now: number): FormInitial {
  const answers = body?.answers ?? {};
  const updatedAt = body?.updatedAt ?? null;
  const signedAt = body?.signedAt ?? null;
  const readyAt = body?.readyAt ?? null;
  const later = (t: number): boolean => updatedAt !== null && updatedAt > t;
  if (signedAt !== null)
    return { status: 'submitted', answers, savedLabel: later(signedAt) ? savedLabel(updatedAt!, now) : `${SEAT_CARD_UI.signed} ${when(signedAt)}`, submittedShort: fmt.date(signedAt) };
  if (readyAt !== null && role === 'operator')
    return { status: 'submitted', answers, savedLabel: later(readyAt) ? savedLabel(updatedAt!, now) : `${SEAT_CARD_UI.readyWord} ${when(readyAt)}`, submittedShort: fmt.date(readyAt) };
  if (Object.keys(answers).length) return { status: 'draft', answers, ...(updatedAt !== null ? { savedLabel: savedLabel(updatedAt, now) } : {}) };
  return { status: 'new', answers };
}
