import { useMemo } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { Card } from '../../components/r2/Card';
import { Empty } from '../../components/r2/Empty';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Bar, PageHead, Pill, Skel, Stat, k } from '../../components/r2/kit';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsoleRecord } from './useConsoleData';
import { HEALTH_COPY as C, healthVM } from './health.vm';
import type { SideCardVM } from './health.vm';
import s from './Health.module.css';

// /admin/health on R2 (D-169, spec § 7.1): the mockup's `Health()`, the Console's home (D15). Read-only.
// The eight tiles (each its own link, each degrading on its own), Needs attention (six at most, each a
// link to its screen), and the side column: "Seat pressure" (production) or the mockup's "Services"
// (the fixture's sample), then the latest deploys for a role that reads them. Loading is the mockup's
// `Gate` skeleton; an error is its `ErrBox` with Retry. Markup only: every word is the view-model's.

export function Component() {
  const gate = useConsoleGate('health');
  const api = gate.kind === 'ready' ? gate.api : null;
  const health = useConsoleRecord(api, (a) => a.health(), 'health');
  // The fixture's mockup-only pieces ("Live sessions", "Services", …); the http client has none.
  const vm = useMemo(() => (health.data ? healthVM(health.data, api?.healthSample?.() ?? null) : null), [health.data, api]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;
  const failure = gate.kind === 'error' ? gate : health.status === 'error' && health.failure ? { failure: health.failure, retry: health.retry } : null;

  return (
    <Page>
      <PageHead title={C.title} meta={vm ? <Pill status={vm.pill} /> : undefined} description={C.description} />
      {failure ? (
        <LoadError failure={failure.failure} retry={failure.retry} />
      ) : !vm ? (
        <Skel lines={8} />
      ) : (
        <>
          <div className={k.g4}>
            {vm.tiles.map((t) => (
              <Stat key={t.key} label={t.label} value={t.value} sub={t.sub} tone={t.tone} to={t.to} />
            ))}
          </div>
          <div className={k.gms}>
            <Card title={C.attention} pad={false}>
              {vm.attention.length ? (
                vm.attention.map((a) => (
                  <div key={a.key} className={k.li}>
                    <div className={clsx(k.col, k.col0, s.what)}>
                      <Link to={a.to} className={clsx(k.lk, k.el)}>
                        {a.title}
                      </Link>
                      <span className={k.me}>{a.meta}</span>
                    </div>
                    <Pill status={a.pill} />
                  </div>
                ))
              ) : (
                <Empty icon="r2Check" title={C.nothing.title} body={C.nothing.body} />
              )}
            </Card>
            <div className={k.col}>
              {vm.side.map((c) => (
                <SideCard key={c.kind} card={c} />
              ))}
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function SideCard({ card }: { card: SideCardVM }) {
  if (card.kind === 'services')
    return (
      <Card title={card.title} pad={false}>
        {card.rows.map((r) => (
          <div key={r.name} className={k.li}>
            <span className={k.sp}>{r.name}</span>
            <Status tone={r.status.tone}>{r.status.label}</Status>
          </div>
        ))}
      </Card>
    );
  if (card.kind === 'seats')
    return (
      <Card title={card.title} pad={false}>
        {card.rows === null ? (
          <div className={k.li}>
            <span className={k.mu}>{C.unavailable.failed}</span>
          </div>
        ) : card.rows.length ? (
          card.rows.map((r) => (
            <div key={r.key} className={k.li}>
              <Link to={r.to} className={clsx(k.lk, k.el, s.seatName)}>
                {r.name}
              </Link>
              <Bar pct={r.pct} kind={r.bar} />
              <span className={clsx(k.tn, s.seatText)}>{r.text}</span>
            </div>
          ))
        ) : (
          <div className={k.li}>
            <span className={k.mu}>{C.noSeats}</span>
          </div>
        )}
      </Card>
    );
  return (
    <Card
      title={card.title}
      right={
        <Link to={card.link.to} className={clsx(k.lk, s.accent)}>
          {card.link.label}
        </Link>
      }
    >
      {card.state === 'unavailable' ? (
        <span className={k.mu}>{C.unavailable.failed}</span>
      ) : card.state === 'not_configured' && !card.rows.length ? (
        <Status tone="warn">{C.notConfigured}</Status>
      ) : (
        <div className={clsx(k.col, s.deploys)}>
          {card.rows.map((d) => (
            <div key={d.sha} className={clsx(k.col, k.colM)}>
              <div className={clsx(k.row, k.nw)}>
                <span className={k.mo}>{d.sha}</span>
                {d.status ? <Status tone={d.status.tone}>{d.status.label}</Status> : null}
                {card.state === 'not_configured' ? <Status tone="warn">{C.notConfigured}</Status> : null}
              </div>
              <span className={k.el}>{d.message}</span>
              {d.byline ? <span className={k.me}>{d.byline}</span> : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default Component;
