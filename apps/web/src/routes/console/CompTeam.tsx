import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Page } from '../../components/r2/Page';
import { PageHead, Sel, k } from '../../components/r2/kit';
import { ConsoleError } from '../../data/console';
import { useAdminChrome, useRecordCrumb } from '../../shell/admin/chrome';
import { teamPath } from '../../shell/admin/addresses';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';

// Comp an Accelerator team: a $0 order, the existing provisioning, and no Stripe checkout.
// Owner and Admin. The Teams list links here in the live admin; the fixture build does not, so the
// signed-off Teams screen stays as the mockup draws it.

const COPY = {
  title: 'Comp a Team',
  description: 'Enroll a team in a cohort at no charge. They get a 2-seat AI Accelerator, the cohort welcome, and no Stripe charge.',
  email: 'Owner Email',
  name: 'Owner Name',
  team: 'Team Name',
  cohort: 'Cohort',
  submit: 'Comp This Team',
  working: 'Working',
  done: 'Team comped. The owner gets the set-password email if they have not signed in.',
  again: 'This owner was already comped. Nothing new was charged.',
  failed: 'That team was not comped. Nothing was changed.',
} as const;

export function Component() {
  const gate = useConsoleGate('comp');
  const navigate = useNavigate();
  const { toast } = useAdminChrome();
  useRecordCrumb(COPY.title);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = gate.kind === 'ready' ? gate.api : null;

  useEffect(() => {
    if (!api) return;
    let alive = true;
    api.compCohorts().then(
      (list) => {
        if (!alive) return;
        setCohorts(list.cohorts);
        setCohortId(list.defaultCohortId);
      },
      () => alive && setCohorts([]),
    );
    return () => {
      alive = false;
    };
  }, [api]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={COPY.title} role={gate.role} />;
  if (gate.kind === 'error')
    return (
      <Page>
        <LoadError failure={gate.failure} retry={gate.retry} />
      </Page>
    );

  const submit = () => {
    if (gate.kind !== 'ready' || busy) return;
    setBusy(true);
    setError(null);
    gate.api.compTeam({ email, name, teamName: team, cohortId }).then(
      (out) => {
        setBusy(false);
        toast(out.already ? COPY.again : COPY.done);
        if (out.teamId) navigate(teamPath(out.teamId));
      },
      (e: unknown) => {
        setBusy(false);
        setError(e instanceof ConsoleError && e.message ? e.message : COPY.failed);
      },
    );
  };

  return (
    <Page>
      <PageHead back={{ to: '/admin/people/teams', label: 'Teams' }} title={COPY.title} description={COPY.description} />
      <Card title="Accelerator team">
        <form
          className={k.col}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className={k.col} style={{ gap: 6 }}>
            <span className={k.w5}>{COPY.email}</span>
            <input className={k.in} type="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className={k.col} style={{ gap: 6 }}>
            <span className={k.w5}>{COPY.name}</span>
            <input className={k.in} type="text" autoComplete="off" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className={k.col} style={{ gap: 6 }}>
            <span className={k.w5}>{COPY.team}</span>
            <input className={k.in} type="text" autoComplete="off" required maxLength={80} value={team} onChange={(e) => setTeam(e.target.value)} />
          </label>
          <label className={k.col} style={{ gap: 6 }}>
            <span className={k.w5}>{COPY.cohort}</span>
            <Sel aria-label={COPY.cohort} value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Sel>
          </label>
          {error ? (
            <p role="alert" className={k.mu}>
              {error}
            </p>
          ) : null}
          <div>
            <Button kind="primary" type="submit" disabled={busy || gate.kind !== 'ready'}>
              {busy ? COPY.working : COPY.submit}
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}

export default Component;
