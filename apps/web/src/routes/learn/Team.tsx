// /learn/team (D-182): the Team Hub, inside the learner shell. The first portal's screen
// (`routes/portal/TeamHub.tsx`, SCREENS § 3.4) is the one place an owner invites their operator or their
// agents, and the learner mockup draws no screen for it, so it moved here as it is, under its old rule:
// a Team tier learner on a team opens it (`hasTeamHub`); anyone else (an Agent tier learner, staff) goes
// Home.

import { Navigate } from 'react-router';
import { learnerOf } from '@ai/core/learner';
import { useDb, useViewer } from '../../data/hooks';
import { Component as TeamHub } from '../portal/TeamHub';
import { hasTeamHub } from './learn.vm';
import { learnHome } from './routes';

export function Component() {
  const db = useDb();
  const viewer = useViewer();
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  if (!hasTeamHub(db, me)) return <Navigate to={learnHome()} replace />;
  return <TeamHub />;
}

export default Component;
