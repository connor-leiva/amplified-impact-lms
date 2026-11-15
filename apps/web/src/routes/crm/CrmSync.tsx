// /admin/crm-sync (D-134): the GoHighLevel sync log, for the Owner and Admins.
//
// Net-new and outside the shell, like /course and /skill-library, so no console golden moves and no
// sidebar item is added: it is reached by its URL (the README names it). It reads
// `GET /api/admin/crm-sync`; signed out it goes to /sign-in, as another staff role it says who the
// page is for, and in the fixture build (no API) it says the log isn't available.
//
// Markup only: every string and time is computed in CrmSync.vm.ts. States are words, never colour alone.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { BrandSlot } from '../../shell/BrandSlot';
import { COPY, crmView } from './CrmSync.vm';
import type { CrmKind, CrmSyncReport, RowVM } from './CrmSync.vm';
import s from './CrmSync.module.css';

type Load = { kind: 'loading' } | { kind: 'ready'; report: CrmSyncReport } | { kind: 'forbidden' } | { kind: 'unavailable' };

export async function loadReport(): Promise<Load> {
  try {
    const res = await fetch('/api/admin/crm-sync', { credentials: 'include', headers: { accept: 'application/json' } });
    if (res.status === 401) {
      location.assign('/sign-in');
      return { kind: 'loading' };
    }
    if (res.status === 403) return { kind: 'forbidden' };
    if (!res.ok) return { kind: 'unavailable' };
    return { kind: 'ready', report: (await res.json()) as CrmSyncReport };
  } catch {
    return { kind: 'unavailable' };
  }
}

async function postRetry(kind: CrmKind, id: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/crm-sync/retry', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, id }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function Rows({ rows, label, empty, onRetry, notes }: { rows: RowVM[]; label: string; empty: string; onRetry?: (r: RowVM) => void; notes: Record<string, string> }) {
  if (!rows.length) return <p className={s.empty}>{empty}</p>;
  return (
    // Scrolls sideways on a phone, so it takes focus (and a name) for a keyboard to scroll it.
    <div className={s.scroll} role="region" aria-label={label} tabIndex={0}>
      <table className={s.table} aria-label={label}>
        <thead>
          <tr>
            <th scope="col">{COPY.rowColumns.email}</th>
            <th scope="col">{COPY.rowColumns.kind}</th>
            <th scope="col">{COPY.rowColumns.state}</th>
            <th scope="col" className={s.num}>
              {COPY.rowColumns.attempts}
            </th>
            <th scope="col">{COPY.rowColumns.last}</th>
            <th scope="col">{COPY.rowColumns.reason}</th>
            {onRetry ? <th scope="col">{COPY.rowColumns.action}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className={s.email}>{r.email}</td>
              <td data-label={COPY.rowColumns.kind}>{r.kindLabel}</td>
              <td data-label={COPY.rowColumns.state}>
                <span className={`${s.tag} ${s[r.tone]}`}>{r.state}</span>
              </td>
              <td className={s.num} data-label={COPY.rowColumns.attempts}>
                {r.attempts}
              </td>
              <td data-label={COPY.rowColumns.last}>{r.last}</td>
              <td data-label={COPY.rowColumns.reason}>{r.reason}</td>
              {onRetry ? (
                <td>
                  {r.canRetry ? (
                    notes[r.key] ? (
                      <span role="status">{notes[r.key]}</span>
                    ) : (
                      <button type="button" className={s.button} onClick={() => onRetry(r)}>
                        {COPY.retry}
                      </button>
                    )
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Component() {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => setLoad(await loadReport()), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Outside `AppShell`, so the page marks the body ready itself, as /course does.
  useEffect(() => {
    if (load.kind !== 'loading') document.body.dataset.appReady = 'true';
  }, [load.kind]);
  useEffect(() => {
    document.title = `${COPY.title} · Amplified Impact`;
  }, []);

  const view = useMemo(() => (load.kind === 'ready' ? crmView(load.report) : null), [load]);

  const retry = async (r: RowVM) => {
    const ok = await postRetry(r.kind, r.id);
    setNotes((n) => ({ ...n, [r.key]: ok ? COPY.retried : COPY.retryFailed }));
  };

  return (
    <main className={s.page}>
      <header className={s.head}>
        <BrandSlot kind="lockup" />
        <a className={s.back} href="/admin">
          <Icon name="chevL" size={16} strokeWidth={2} />
          {COPY.back}
        </a>
        <h1 className={s.h1}>{COPY.title}</h1>
        <p className={s.sub}>{COPY.sub}</p>
      </header>

      {load.kind === 'loading' ? (
        <div className={s.status} role="status" aria-busy="true">
          <Icon name="spinner" size={20} strokeWidth={2.2} className={s.spin} label={COPY.loading} />
        </div>
      ) : load.kind === 'forbidden' ? (
        <p className={s.notice}>{COPY.forbidden}</p>
      ) : load.kind === 'unavailable' || !view ? (
        <p className={s.notice}>{COPY.unavailable}</p>
      ) : (
        <>
          <section className={s.section} aria-labelledby="crm-settings">
            <h2 className={s.srOnly} id="crm-settings">
              {COPY.statusLabel}
            </h2>
            <dl className={s.facts}>
              <div className={s.fact}>
                <dt>{COPY.statusLabel}</dt>
                <dd>{view.status}</dd>
              </div>
              <div className={s.fact}>
                <dt>{COPY.fieldsLabel}</dt>
                <dd>{view.fields}</dd>
              </div>
              <div className={s.fact}>
                <dt>{COPY.pipelineLabel}</dt>
                <dd>{view.pipeline}</dd>
              </div>
            </dl>
          </section>

          <section className={s.section} aria-labelledby="crm-counts">
            <h2 className={s.h2} id="crm-counts">
              {COPY.countsHeading}
            </h2>
            <div className={s.scroll} role="region" aria-label={COPY.countsHeading} tabIndex={0}>
              <table className={s.table}>
                <caption className={s.srOnly}>{COPY.countsCaption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{COPY.columns.kind}</th>
                    <th scope="col" className={s.num}>
                      {COPY.columns.synced}
                    </th>
                    <th scope="col" className={s.num}>
                      {COPY.columns.waiting}
                    </th>
                    <th scope="col" className={s.num}>
                      {COPY.columns.retrying}
                    </th>
                    <th scope="col" className={s.num}>
                      {COPY.columns.gaveUp}
                    </th>
                    <th scope="col" className={s.num}>
                      {COPY.columns.total}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.counts.map((c) => (
                    <tr key={c.kind}>
                      <th scope="row">{c.label}</th>
                      <td className={s.num} data-label={COPY.columns.synced}>
                        {c.synced}
                      </td>
                      <td className={s.num} data-label={COPY.columns.waiting}>
                        {c.waiting}
                      </td>
                      <td className={s.num} data-label={COPY.columns.retrying}>
                        {c.retrying}
                      </td>
                      <td className={s.num} data-label={COPY.columns.gaveUp}>
                        {c.gaveUp}
                      </td>
                      <td className={s.num} data-label={COPY.columns.total}>
                        {c.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={s.section} aria-labelledby="crm-problems">
            <h2 className={s.h2} id="crm-problems">
              {COPY.problemsHeading}
            </h2>
            <Rows rows={view.problems} label={COPY.problemsHeading} empty={COPY.problemsEmpty} onRetry={(r) => void retry(r)} notes={notes} />
          </section>

          <section className={s.section} aria-labelledby="crm-recent">
            <h2 className={s.h2} id="crm-recent">
              {COPY.recentHeading}
            </h2>
            <Rows rows={view.recent} label={COPY.recentHeading} empty={COPY.recentEmpty} notes={notes} />
          </section>
        </>
      )}
    </main>
  );
}

export default Component;
