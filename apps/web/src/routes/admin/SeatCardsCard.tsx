// D-236: every team's seat card for this week, for staff. Each team's card: where it stands (signed, and by whom;
// ready for the owner; or in progress), when it last changed and by whom, and its answers, row by row. Read only: a
// card is the team's to change. Only a week whose steps ask for the seat card (a Form action set to it) has the card.
// The admin console's own kit, as the Submissions card.
import { useQuery } from '@tanstack/react-query';
import { fmt } from '@ai/core';
import { SEAT_CARD_FIELDS, SEAT_CARD_LABEL, seatCardAskOf } from '@ai/core/seat-card';
import { Card } from '../../components/r2/Card';
import { KV, k } from '../../components/r2/kit';
import type { WeekCardsProps } from './WeekBuilder';
import w from './WeekBuilder.module.css';

/** One team's card as `GET /api/admin/seat-cards` sends it. */
export interface StaffSeatCard {
  team: string;
  answers: Record<string, string>;
  updatedAt: number | null;
  updatedBy: string | null;
  readyAt: number | null;
  signedAt: number | null;
  signedBy: string | null;
}

export type StaffSeatCardsLoad = { kind: 'loading' } | { kind: 'ready'; cards: StaffSeatCard[] } | { kind: 'failed' };

async function load(moduleId: string): Promise<StaffSeatCardsLoad> {
  try {
    const res = await fetch(`/api/admin/seat-cards?moduleId=${encodeURIComponent(moduleId)}`, { credentials: 'include', headers: { accept: 'application/json' } });
    if (!res.ok) return { kind: 'failed' };
    return { kind: 'ready', cards: ((await res.json()) as { cards?: StaffSeatCard[] }).cards ?? [] };
  } catch {
    return { kind: 'failed' };
  }
}

/** The words the card shows. Chrome, not course words. */
export const SEAT_CARDS_CARD = {
  title: 'Seat Cards',
  none: 'No team has started its seat card yet.',
  failed: 'Seat cards didn’t load.',
  state: 'State',
  signed: 'Signed',
  ready: 'Ready for the owner',
  inProgress: 'In progress',
  changed: 'Last changed',
  notAnswered: 'Not answered',
} as const;

/** Where a card stands, as the card says it. Pure. */
export function seatCardState(c: StaffSeatCard): string {
  if (c.signedAt !== null) return `${SEAT_CARDS_CARD.signed} ${fmt.when(c.signedAt)}${c.signedBy ? ` · ${c.signedBy}` : ''}`;
  if (c.readyAt !== null) return `${SEAT_CARDS_CARD.ready} · ${fmt.when(c.readyAt)}`;
  return SEAT_CARDS_CARD.inProgress;
}

/** A card's lines, as the card lists them: where it stands, its last change, then each row's answer. Pure. */
export function seatCardRows(c: StaffSeatCard): { label: string; text: string }[] {
  return [
    { label: SEAT_CARDS_CARD.state, text: seatCardState(c) },
    ...(c.updatedAt !== null ? [{ label: SEAT_CARDS_CARD.changed, text: `${fmt.when(c.updatedAt)}${c.updatedBy ? ` · ${c.updatedBy}` : ''}` }] : []),
    ...SEAT_CARD_FIELDS.map((f) => ({ label: SEAT_CARD_LABEL[f], text: c.answers[f]?.trim() || SEAT_CARDS_CARD.notAnswered })),
  ];
}

/** Only a week that asks for its seat card has the card; nothing is read for any other. */
export function SeatCardsCard({ draft }: WeekCardsProps) {
  return seatCardAskOf(draft) ? <SeatCards moduleId={draft.id} /> : null;
}

function SeatCards({ moduleId }: { moduleId: string }) {
  const q = useQuery({ queryKey: ['admin', 'seat-cards', moduleId] as const, queryFn: () => load(moduleId) });
  const data: StaffSeatCardsLoad = q.data ?? { kind: 'loading' };
  const cards = data.kind === 'ready' ? data.cards : [];
  return (
    <Card title={`${SEAT_CARDS_CARD.title} · ${cards.length}`}>
      {data.kind === 'failed' ? <p className={k.mu}>{SEAT_CARDS_CARD.failed}</p> : null}
      {data.kind === 'ready' && !cards.length ? <p className={k.mu}>{SEAT_CARDS_CARD.none}</p> : null}
      {cards.map((c) => (
        <fieldset key={c.team} className={w.blocks}>
          <legend className={w.legend}>{c.team}</legend>
          <KV rows={seatCardRows(c).map((r) => ({ label: r.label, value: r.text }))} />
        </fieldset>
      ))}
    </Card>
  );
}
