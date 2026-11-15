// The Console 404 (D-157, spec § 7.17): any `/admin/…` address that is no screen, inside AppShell. The
// app's own `*` route still sends every other unknown address home. Learners never see it: AppShell
// sends them to their portal from any `/admin` address.

import { FullState } from '../../components/console/StateBlock';
import { useViewer } from '../../data/hooks';
import { NOT_FOUND_COPY } from './console.vm';

export function Component() {
  const viewer = useViewer();
  if (viewer.actor.kind !== 'staff') return null;
  return <FullState kind="notFound" copy={NOT_FOUND_COPY} />;
}

export default Component;
