// The Console 404 (D-157, spec § 7.17; on R2 since D-160 R2-1b): any `/admin/…` address that is no
// screen, inside the admin shell. The app's own `*` route still sends every other unknown address
// home. Learners never see it: AppShell sends them to their portal from any `/admin` address.

import { useViewer } from '../../data/hooks';
import { NotFound } from './Denied';

export function Component() {
  const viewer = useViewer();
  if (viewer.actor.kind !== 'staff') return null;
  return <NotFound />;
}

export default Component;
