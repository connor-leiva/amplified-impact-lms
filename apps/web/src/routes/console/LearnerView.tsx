import { useNavigate } from 'react-router';
import { Button } from '../../components/r2/Button';
import { Box } from '../../components/r2/Card';
import { Empty } from '../../components/r2/Empty';
import { Page } from '../../components/r2/Page';
import { useRecordCrumb } from '../../shell/admin/chrome';
import { Denied } from './Denied';
import { useConsoleGate } from './useConsoleGate';
import { MASQ_COPY } from './masquerade.vm';

// /admin/masquerade/learner-view (D-162 3b): the mockup's `LearnerView` (`as`, crumb "Admin / Support /
// Masquerade / Learner view"). With no session it is the mockup's empty state, which is always what the
// Console shows: during a session every `/admin/*` address is the paused Console (D2), and the learner
// view is the real learner portal with the banner, so the mockup's stand-in ("Good morning, …") is not
// built.

const C = MASQ_COPY.learnerView;

export function Component() {
  const gate = useConsoleGate('masquerade');
  const navigate = useNavigate();
  useRecordCrumb(C.crumb);
  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={MASQ_COPY.title} role={gate.role} />;
  return (
    <Page>
      <Box>
        <Empty icon="r2Masquerade" heading="h1" title={C.title} body={C.body}>
          <Button style={{ marginTop: 10 }} onClick={() => navigate('/admin/masquerade')}>
            {C.cta}
          </Button>
        </Empty>
      </Box>
    </Page>
  );
}

export default Component;
