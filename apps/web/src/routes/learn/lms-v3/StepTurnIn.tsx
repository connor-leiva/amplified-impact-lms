// D-230 (B-27): the step's Turn in button opens the drawer in place, on the step page. Loaded on the first open only,
// with the package's stylesheets, so the step page draws exactly as it does until then (as StepIntake does).
import './lms.tokens.css';
import './lms.css';
import { createPortal } from 'react-dom';
import { TurnInDrawer } from './TurnIn';
import { NO_TAP } from './tap';
import { IconSprite } from './Icons';
import type { TurnInDrawerProps } from './TurnIn';

export default function StepTurnIn(props: TurnInDrawerProps) {
  return createPortal(
    <div style={NO_TAP}>
      {/* The drawer's icons are the v3 sprite's, which the step page doesn't draw. */}
      <IconSprite />
      <TurnInDrawer {...props} />
    </div>,
    document.body,
  );
}
