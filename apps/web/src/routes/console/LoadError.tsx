import { Box } from '../../components/r2/Card';
import { Button } from '../../components/r2/Button';
import { Empty } from '../../components/r2/Empty';
import type { ConsoleFailure } from '../../data/console';
import { errorCopy } from './console.vm';

// A Console read that failed, on R2 (D-160 R2-1c): the mockup's `ErrBox` in a card, in the Console's
// words (spec § 7: "Too many requests." on a 429), with Retry.
export function LoadError({ failure, retry, detail }: { failure: ConsoleFailure; retry: () => void; detail?: string | null }) {
  const copy = errorCopy(failure, detail);
  return (
    <Box>
      <Empty icon="r2Incidents" tone="bad" role="alert" title={copy.title} body={copy.body}>
        <Button icon="r2Refresh" onClick={retry} style={{ marginTop: 10 }}>
          {copy.retry}
        </Button>
      </Empty>
    </Box>
  );
}
