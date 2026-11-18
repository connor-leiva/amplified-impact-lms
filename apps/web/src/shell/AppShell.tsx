import { useViewer } from '../data/hooks';
import { ToasterProvider } from '../components/primitives/Toaster';
import { LearnerRedirect } from '../routes/learn/redirects';
import { ConfettiProvider } from './Confetti';
import { AdminShell } from './admin/AdminShell';

// The frame of every address under `/`: the Admin Console's (`admin/AdminShell.tsx`, D-160 R2-1b) for
// staff, which keeps them on `/admin`.
//
// D-182: the first learner portal's shell lived here too (its sidebar, header, profile menu and Locked
// Employee Preview, ported from design-reference/Amplified Impact LMS.dc.html), with the dashboard,
// Sessions, the AI Employee pages, the Team Hub, the vault and Team Tier inside it. The learner portal at
// /learn replaced it. A learner who opens any address here, a staff member's "Preview as learner" tab
// among them (its actor is the read-only learner, D-138), is sent to the learner portal's page for it
// (`routes/learn/redirects.tsx`), worked out while rendering, so nothing of this shell is drawn on the way.

/**
 * The route module React Router lazy-loads. The toast and confetti viewports wrap the outlet, not
 * the other way round, because `useMutate()` — which every screen calls — resolves both from
 * context.
 */
export function Component() {
  return (
    <ToasterProvider>
      <ConfettiProvider>
        <Frame />
      </ConfettiProvider>
    </ToasterProvider>
  );
}

function Frame() {
  const viewer = useViewer();
  return viewer.actor.kind === 'staff' ? <AdminShell /> : <LearnerRedirect />;
}

export default Component;
