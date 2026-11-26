// /learn and every address under it, with the flag on (D-182): the learner portal for a learner with the
// course and for staff (as before), and for a learner without it the first portal's page for the address
// (`firstPortalPathFor`: the Skill Library, a skill's guide, the vault, the Team Hub, `/account`), with
// its query and fragment kept, so they keep exactly what `main` serves them.
// D-257: with LMS v3 on, a learner without the course (a $37 buyer aside) has the learner portal in the v3 frame
// instead, with the pages they have today inside it (`learnFrameFor`).

import { Suspense, lazy } from 'react';
import { Navigate, useLocation } from 'react-router';
import { skillOnlyBuyer } from '@ai/core/offer';
import { useDb, useViewer } from '../../../data/hooks';
import { Component as LearnerShell } from '../../../shell/learner/LearnerShell';
import { hasPortal } from '../../../shell/navModel';
import { firstPortalPathFor, learnFrameFor } from '../audience';
import { useSkills } from '../skills-data';

// Lazily, so the buyer's stylesheets (the v3 shell's among them) reach only a buyer, as the members' v3 frame's do.
const Buyer = lazy(() => import('../buyer/Buyer'));

/** D-241: a learner without the course who bought a $37 skill and holds no plan or group has the buyer's LMS here. */
function NoCourse() {
  const skills = useSkills();
  const { pathname, search, hash } = useLocation();
  if (skills.kind === 'loading') return null;
  const frame = learnFrameFor({ course: false, buyer: skills.kind === 'ready' && skillOnlyBuyer(skills.payload) });
  if (frame === 'buyer')
    return (
      <Suspense fallback={null}>
        <Buyer />
      </Suspense>
    );
  if (frame === 'portal') return <LearnerShell />;
  return <Navigate to={`${firstPortalPathFor(pathname)}${search}${hash}`} replace />;
}

function Learner() {
  const db = useDb();
  return hasPortal(db) ? <LearnerShell /> : <NoCourse />;
}

export function Component() {
  const viewer = useViewer();
  return viewer.actor.kind === 'learner' ? <Learner /> : <LearnerShell />;
}

export default Component;
