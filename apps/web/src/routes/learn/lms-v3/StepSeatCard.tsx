// D-236: the seat card form's drawer, opened in place from the step's Form button. Loaded on the first open only, with
// the package's stylesheets, so the step page draws exactly as it does until then. The drawer is the intake's
// (`FormDrawer`); an agent's is locked (Connor, Nov 22).
import './lms.tokens.css';
import './lms.css';
import { createPortal } from 'react-dom';
import type { SeatCard } from '@ai/core/course-types';
import { FormDrawer } from './FormDrawer';
import { useSeatCardForm } from './seatcard.data';
import type { SeatCardRole } from './seatcard.vm';
import { NO_TAP } from './tap';
import { IconSprite } from './Icons';

export default function StepSeatCard({
  moduleId,
  card,
  at,
  role,
  now,
  open,
  onClose,
}: {
  moduleId: string;
  card: SeatCard;
  at: { week: number; step: number; signLabel?: string };
  role: SeatCardRole;
  now: number;
  open: boolean;
  onClose: () => void;
}) {
  const form = useSeatCardForm(moduleId, card, at, role, now);
  return createPortal(
    <div style={NO_TAP}>
      {/* The drawer's icons are the v3 sprite's, which the step page doesn't draw. */}
      <IconSprite />
      <FormDrawer f={form} open={open} onClose={onClose} locked={role === 'agent'} />
    </div>,
    document.body,
  );
}
