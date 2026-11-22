// D-236: the Week Builder's Seat Cards card: every team's card for the week, for staff. Where each stands (signed and
// by whom, ready for the owner, or in progress), its last change, and each row's answer.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SEAT_CARDS_CARD, SeatCardsCard, seatCardRows, seatCardState } from './SeatCardsCard';
import type { StaffSeatCard } from './SeatCardsCard';
import type { WeekCardsProps } from './WeekBuilder';

/** Wed, Nov 25, 2026, 3:18 PM CT (the test setup's viewer zone is Central). */
const AT = Date.parse('2026-11-25T21:18:00Z');
const card = (c: Partial<StaffSeatCard>): StaffSeatCard => ({ team: 'Northline Realty', answers: {}, updatedAt: null, updatedBy: null, readyAt: null, signedAt: null, signedBy: null, ...c });

describe('the Seat Cards card (D-236)', () => {
  it('says where each card stands', () => {
    expect(seatCardState(card({}))).toBe('In progress');
    expect(seatCardState(card({ readyAt: AT }))).toMatch(/^Ready for the owner · /);
    expect(seatCardState(card({ readyAt: AT, signedAt: AT, signedBy: 'Alex Morgan' }))).toMatch(/^Signed .+ · Alex Morgan$/);
  });
  it('lists its last change and every row, an empty one as not answered', () => {
    const rows = seatCardRows(card({ answers: { reportsTo: 'Alex Morgan', cantDo: 'Change the books' }, updatedAt: AT, updatedBy: 'Olive Operator' }));
    expect(rows.map((r) => r.label)).toEqual(['State', 'Last changed', 'Reports To', 'Runs', 'Pulls', 'Applies', 'Produces', 'Took Over', 'Can’t Do', 'First Run']);
    expect(rows[1]!.text).toMatch(/ · Olive Operator$/);
    expect(rows[2]!.text).toBe('Alex Morgan');
    expect(rows[3]!.text).toBe(SEAT_CARDS_CARD.notAnswered);
    expect(rows[8]!.text).toBe('Change the books');
    // A card never saved has no last change.
    expect(seatCardRows(card({})).map((r) => r.label)).not.toContain('Last changed');
  });
  it('isn’t drawn for a week that doesn’t ask for its seat card, and reads nothing', () => {
    const draft = { id: 'accelerator-week-1', checklist: [{ id: 'c1', text: 'x', mins: 5, paths: { claude: { blocks: [{ type: 'check', id: 'a', title: 'a' }] } } }] };
    const { container } = render(<SeatCardsCard {...({ draft } as unknown as WeekCardsProps)} />);
    expect(container.innerHTML).toBe('');
  });
});
