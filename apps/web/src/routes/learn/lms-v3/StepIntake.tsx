// D-229 (B-15): a step's form action opens the intake's drawer in place, on the step page. Loaded on the first open
// only, with the package's stylesheets, so the step page draws exactly as it does until then. The step's own button
// is the step page's and doesn't change; this module only answers its click.
import './lms.tokens.css';
import './lms.css';
import { createPortal } from 'react-dom';
import type { CourseIntake } from '@ai/core/course-types';
import { FormDrawer } from './FormDrawer';
import { useIntakeForm } from './V3Week';
import { NO_TAP } from './tap';
import { IconSprite } from './Icons';

export default function StepIntake({
  intake,
  now,
  open,
  onClose,
}: {
  intake: CourseIntake;
  now: number;
  open: boolean;
  onClose: () => void;
}) {
  const form = useIntakeForm(intake, now);
  return form
    ? createPortal(
        <div style={NO_TAP}>
          {/* The drawer's icons are the v3 sprite's, which the step page doesn't draw. */}
          <IconSprite />
          <FormDrawer f={form} open={open} onClose={onClose} />
        </div>,
        document.body,
      )
    : null;
}
