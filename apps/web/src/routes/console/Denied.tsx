import { useEffect, useState } from 'react';
import { Box } from '../../components/r2/Card';
import { Button, ButtonLink } from '../../components/r2/Button';
import { Empty, EmptyActions } from '../../components/r2/Empty';
import { Page } from '../../components/r2/Page';
import { consoleApi } from '../../data/console';
import { useViewer } from '../../data/hooks';
import { useAdminChrome } from '../../shell/admin/chrome';
import { NOT_FOUND_COPY, deniedCopy } from './console.vm';

// Denied and the Console 404 on R2 (D-160 R2-1b): the mockup's `Denied` and `NotFound`, a card holding
// the message (`Empty`, its title the page's h1) and the way out. "Go to Overview" stays until Health
// exists (Connor). "Search the admin" opens the ⌘K palette (D-160 R2-1c).

/** Denied: the viewer's role can't open `what` (a page's name), or "this page". */
export function Denied({ what, role }: { what: string | null; role: string | null }) {
  const copy = deniedCopy(what, role);
  return (
    <Page>
      <Box>
        <Empty icon="r2Lock" heading="h1" title={copy.title} body={copy.body} />
        <EmptyActions>
          <ButtonLink kind="primary" to={copy.action.to}>
            {copy.action.label}
          </ButtonLink>
        </EmptyActions>
      </Box>
    </Page>
  );
}

/** The Console 404: any `/admin/…` address that is no screen. */
export function NotFound() {
  const { openPalette } = useAdminChrome();
  return (
    <Page>
      <Box>
        <Empty icon="r2Search" heading="h1" title={NOT_FOUND_COPY.title} body={NOT_FOUND_COPY.body} />
        <EmptyActions>
          <ButtonLink kind="primary" to={NOT_FOUND_COPY.action.to}>
            {NOT_FOUND_COPY.action.label}
          </ButtonLink>
          <Button aria-haspopup="dialog" onClick={openPalette}>
            {NOT_FOUND_COPY.search}
          </Button>
        </EmptyActions>
      </Box>
    </Page>
  );
}

/**
 * The mockup's own "Access denied" screen, at `/admin/denied`: Denied with no page named, for the
 * viewer's role. FIXTURE BUILD ONLY (`fixtureRoutes.ts` registers the route there and nowhere else): it exists
 * so `parity:admin-r2` can compare the screen with its refs. In production Denied is a state of the
 * screen the role can't open.
 */
export function Component() {
  const viewer = useViewer();
  const [role, setRole] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void consoleApi()
      .then((api) => api.me())
      .then(
        (me) => alive && setRole(me.role),
        () => alive && setRole(null),
      );
    return () => {
      alive = false;
    };
  }, []);
  if (viewer.actor.kind !== 'staff' || role === undefined) return null;
  return <Denied what={null} role={role} />;
}

export default Component;
