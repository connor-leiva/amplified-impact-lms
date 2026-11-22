// D-236: the seat card form. A team fills in its hire's seat card in the portal and the Team Owner signs it, instead of
// a blank PDF (Connor, Nov 20). Pure: no clock, no I/O.
//
// The questions are the week's own seat card (`course.seatCard`, the Week Builder's Seat Card card): each row the team
// writes is asked with the week's standard as its hint, so a row changed in the builder changes the form (Connor's
// rule, Nov 21: the builder owns every word). A step asks for it with a checklist item's Form action
// (`{ type: 'form', formId: 'seat-card', label }`, the Week Builder's Form option). Saving the filled-in card checks that
// item for the team, on both paths; the owner's signature checks the item the action names (`itemId`, the builder's
// "Item to check", or the item itself), on both paths.
//
// Who (Connor, Nov 22): the Team Owner and the Operations Lead fill it in (the intake's rule); only the Team Owner
// signs. The Operations Lead's main button is "Ready for the owner": every answer in, saved, the fill item checked.
// Agents read it, locked. A change after signing saves and the card stays signed. One card per team per week.
// Nothing is emailed, and nothing goes to GHL.
import type { CheckBlock, CourseIntake, IntakeQuestion, PathBlock, SeatCard } from './course-types';
import { mayEditIntake } from './intake';
import { looksSecret } from './stack';
import type { AIEmployee } from './types';

export const SEAT_CARD_FORM_ID = 'seat-card';

/** The card's rows as the learner reads them: the week page's Reference and the form label them alike. */
export const SEAT_CARD_LABEL: Readonly<Record<keyof SeatCard, string>> = {
  seat: 'Seat',
  reportsTo: 'Reports To',
  runs: 'Runs',
  pulls: 'Pulls',
  applies: 'Applies',
  produces: 'Produces',
  tookOver: 'Took Over',
  cantDo: 'Can’t Do',
  firstRun: 'First Run',
};

/** What the team writes, in the card's order: every row but the seat itself, which is the week's. */
export const SEAT_CARD_FIELDS = ['reportsTo', 'runs', 'pulls', 'applies', 'produces', 'tookOver', 'cantDo', 'firstRun'] as const;
export type SeatCardField = (typeof SEAT_CARD_FIELDS)[number];
export type SeatCardAnswers = Partial<Record<SeatCardField, string>>;

/**
 * D-240: the card as a table's rows, label then words, the seat first and then the card's order: what a step's Seat
 * Card table shows (an accordion marked `seatCard`). A row with no words is left out.
 */
export function seatCardRows(card: SeatCard): string[][] {
  return (['seat', ...SEAT_CARD_FIELDS] as const).flatMap((k) => {
    const words = (card[k] ?? '').trim();
    return words ? [[SEAT_CARD_LABEL[k], words]] : [];
  });
}

/** The rows answered on one line; the rest take a few. */
const SHORT: ReadonlySet<SeatCardField> = new Set(['reportsTo', 'firstRun']);

/** The longest answer a row keeps. */
export const SEAT_CARD_ANSWER_MAX = 1000;

/** Who fills it in: the Team Owner and the Operations Lead. */
export const mayEditSeatCard = (role: string | null | undefined): boolean => mayEditIntake(role);
/** Who signs it: the Team Owner alone. */
export const maySignSeatCard = (role: string | null | undefined): boolean => role === 'Team Owner';

/** Which drawer a teammate gets: the owner's signs it, the operator's marks it ready, an agent's is locked. */
export type SeatCardRole = 'owner' | 'operator' | 'agent';
export const seatCardRole = (role: string | null | undefined): SeatCardRole => (maySignSeatCard(role) ? 'owner' : mayEditSeatCard(role) ? 'operator' : 'agent');

/** The card's questions, from the week's seat card: one section under the seat's name, each row's standard its hint. */
export function seatCardForm(card: SeatCard): CourseIntake {
  const questions: IntakeQuestion[] = SEAT_CARD_FIELDS.map((id) => ({
    id,
    label: SEAT_CARD_LABEL[id],
    ...((card[id] ?? '').trim() ? { help: (card[id] ?? '').trim() } : {}),
    kind: SHORT.has(id) ? 'short' : 'long',
    required: true,
  }));
  return { sections: [{ title: card.seat, questions }] };
}

/** Where a week asks for its seat card: the step, the items saving checks and the items signing checks (both paths). */
export interface SeatCardAsk {
  stepId: string;
  /** The step's number in the week. */
  step: number;
  fillIds: string[];
  signIds: string[];
  /**
   * The owner's button: the title of the item the signature checks, when the action names one ("Sign the seat card"),
   * so its words are the builder's.
   */
  signLabel?: string;
}

/** The first step with a seat card Form action, or null. A week asks for one seat card. */
export function seatCardAskOf(mod: Pick<AIEmployee, 'checklist'> | undefined): SeatCardAsk | null {
  if (!mod) return null;
  for (const [i, step] of mod.checklist.entries()) {
    const blocks: PathBlock[] = [...(step.paths?.claude?.blocks ?? []), ...(step.paths?.chatgpt?.blocks ?? [])];
    const fillIds: string[] = [];
    const signIds: string[] = [];
    let signLabel = '';
    for (const b of blocks) {
      if (b.type !== 'check' || b.action?.type !== 'form' || b.action.formId !== SEAT_CARD_FORM_ID) continue;
      if (!fillIds.includes(b.id)) fillIds.push(b.id);
      const sign = b.action.itemId?.trim() || b.id;
      if (!signIds.includes(sign)) signIds.push(sign);
      if (!signLabel && sign !== b.id) signLabel = blocks.find((x): x is CheckBlock => x.type === 'check' && x.id === sign)?.title.trim() ?? '';
    }
    if (fillIds.length && step.id) return { stepId: step.id, step: i + 1, fillIds, signIds, ...(signLabel ? { signLabel } : {}) };
  }
  return null;
}

/**
 * The answers a save keeps: the card's rows only, as text, trimmed at the ends. `secret` when one looks like a password
 * or an account number (refused, as the stack card refuses one); `long` when one is over `SEAT_CARD_ANSWER_MAX`.
 */
export function cleanSeatCardAnswers(raw: unknown): { answers: SeatCardAnswers; secret: boolean; long: boolean } {
  const answers: SeatCardAnswers = {};
  let secret = false;
  let long = false;
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  for (const id of SEAT_CARD_FIELDS) {
    const v = src[id];
    if (typeof v !== 'string') continue;
    const text = v.trim();
    if (!text) continue;
    if (text.length > SEAT_CARD_ANSWER_MAX) long = true;
    if (looksSecret(text)) secret = true;
    answers[id] = text;
  }
  return { answers, secret, long };
}

/** The rows still to answer before the card can go to the owner or be signed. */
export const seatCardMissing = (answers: SeatCardAnswers): SeatCardField[] => SEAT_CARD_FIELDS.filter((id) => !(answers[id] ?? '').trim());
