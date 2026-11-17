// /admin/db on R2 (D-168, spec § 7.12): the mockup's `Db`. Postgres's own figures, read in one READ ONLY
// transaction with a two-second limit and cached for a minute on the server: connections, size, the
// largest tables, the migrations against the journal, and the slow queries only where
// `pg_stat_statements` already exists (never turned on here). Nothing on this page can change data.
// Owner and Admin (`ops.read`). The page has no control, so the two lists are keyboard stops (a
// focusable region, as D-156's drawer body is): without one, a keyboard couldn't scroll it (axe's
// `scrollable-region-focusable`).

import clsx from 'clsx';
import { Card } from '../../components/r2/Card';
import { Empty } from '../../components/r2/Empty';
import { PageHead, Pill, Stat, k } from '../../components/r2/kit';
import { DB_COPY as C, dbVM } from './infra.vm';
import { InfraFrame } from './InfraFrame';
import s from './Infra.module.css';

export function Component() {
  return (
    <InfraFrame
      screen="db"
      lines={8}
      head={<PageHead title={C.title} meta={<Pill>{C.readOnly}</Pill>} description={C.description} />}
      read={(a) => a.dbHealth()}
    >
      {(v) => {
        const vm = dbVM(v);
        return (
          <>
            <div className={s.g4}>
              {vm.stats.map((x) => (
                <Stat key={x.label} label={x.label} value={x.value} sub={x.sub} tone={x.tone ?? null} />
              ))}
            </div>
            <Card title={C.slowTitle} sub={C.slowSub}>
              {vm.slow ? (
                <div className={k.col}>
                  {vm.slow.map((q, i) => (
                    <div key={i} className={clsx(k.col, k.colM)}>
                      <span className={k.me}>{q.line}</span>
                      <pre className={s.pre}>{q.query}</pre>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty icon="r2Db" title={C.slowNone.title} body={C.slowNone.body} />
              )}
            </Card>
            <div className={s.g2}>
              <Card title={C.tables} pad={false}>
                <div className={s.region} role="region" aria-label={C.tables} tabIndex={0}>
                  {vm.tables.map((t) => (
                    <div key={t.name} className={k.li}>
                      <span className={clsx(k.mo, s.grow)}>{t.name}</span>
                      <span className={k.tn}>{t.size}</span>
                      <span className={clsx(k.tn, k.mu, s.rowsCount)}>{t.rows}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title={C.migrations} sub={C.migrationsSub} pad={false}>
                <div className={s.region} role="region" aria-label={C.migrations} tabIndex={0}>
                  {vm.migrations.map((m) => (
                    <div key={m.tag} className={k.li}>
                      <span className={clsx(k.mo, k.el, s.grow)}>{m.tag}</span>
                      {m.pill ? <Pill tone={m.pill.tone}>{m.pill.label}</Pill> : null}
                      {m.time ? <span className={clsx(k.me, s.nowrap)}>{m.time}</span> : null}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        );
      }}
    </InfraFrame>
  );
}

export default Component;
