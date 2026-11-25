import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router';
import type { ConsoleUserRow } from '@ai/core';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Page } from '../../components/r2/Page';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { PageHead, Sel, Skel, Two, k } from '../../components/r2/kit';
import { Rules } from '../../components/masquerade/Rules';
import { Icon } from '../../components/Icon';
import { useNow } from '../../data/hooks';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsolePages } from './useConsoleData';
import { useMasqueradeEntry } from './useMasqueradeEntry';
import { MASQ_COPY as C, historyRowVM, pickLabel } from './masquerade.vm';
import type { HistoryRowVM } from './masquerade.vm';
import s from '../../components/masquerade/Masquerade.module.css';

// /admin/masquerade on R2 (D-162 3b, spec § 6): the mockup's `Masquerade()`. "Start a session" (a
// learner and "Masquerade…", or for a role that can't, the mockup's lock card), "Recent sessions"
// (the API's history, newest first), "Rules for every session" and "Not the same as Preview as
// Learner". The mockup's "Active session" card is the paused Console's (D2 pauses this page during a
// session). In production the picker lists the API's learners, its first page in its order, drawn as
// the mockup's `<select>`; the parity fixture's first is the mockup's "Elena Vargas · Northshore Group".

export function Component() {
  const gate = useConsoleGate('masquerade');
  const navigate = useNavigate();
  const now = useNow(60_000);
  const me = gate.kind === 'ready' ? gate.me : null;
  const entry = useMasqueradeEntry(me);
  const may = me ? me.caps.includes('masquerade.start') : false;
  const api = gate.kind === 'ready' && may ? gate.api : null;
  const list = useConsolePages(api, (a, cursor) => a.masqueradeSessions(cursor), 'sessions');
  const rows = useMemo(() => list.rows.map((r) => historyRowVM(r, now)), [list.rows, now]);
  const [users, setUsers] = useState<ConsoleUserRow[]>([]);
  const [pick, setPick] = useState('');

  useEffect(() => {
    if (!api) return;
    let alive = true;
    api.users({ kind: 'learner' }).then(
      (p) => {
        if (!alive) return;
        setUsers(p.rows);
        setPick((v) => v || (p.rows[0]?.id ?? ''));
      },
      () => alive && setUsers([]),
    );
    return () => {
      alive = false;
    };
  }, [api]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;

  const cols: Column<HistoryRowVM>[] = [
    {
      key: 'u',
      label: C.recent.asUser,
      width: 'minmax(120px,1fr)',
      value: (r) => r.user,
      cell: (r) => <Two a={r.user} b={r.by} />,
    },
    { key: 'r', label: C.recent.reason, width: 'minmax(160px,2fr)', noSort: true, value: (r) => r.reason },
    {
      key: 's',
      label: C.recent.started,
      width: '128px',
      noSort: true,
      hideLap: true,
      value: (r) => r.startedAt,
      cell: (r) => r.started,
    },
    { key: 'l', label: C.recent.length, width: '64px', num: true, value: (r) => r.minutes, cell: (r) => r.length },
    {
      key: 'e',
      label: C.recent.ended,
      width: '120px',
      value: (r) => r.ended,
      cell: (r, f) =>
        f.drop ? (
          <div className={clsx(k.col, k.col0)}>
            <span className={k.el}>{r.ended}</span>
            <span className={clsx(k.me, k.el)}>{r.started}</span>
          </div>
        ) : (
          r.ended
        ),
    },
  ];
  const chosen = users.find((u) => u.id === pick);
  const st = entry.state();

  return (
    <Page>
      <PageHead title={C.title} description={C.description} />
      {gate.kind === 'error' ? (
        <LoadError failure={gate.failure} retry={gate.retry} />
      ) : gate.kind === 'loading' ? (
        <Skel lines={6} />
      ) : (
        <div className={k.gms}>
          <div className={k.col}>
            <Card title={C.start.title}>
              {may ? (
                <div className={clsx(k.col, k.colM)}>
                  <div className={k.row}>
                    <Sel
                      aria-label={C.start.user}
                      style={{ flex: '1 1 240px' }}
                      value={pick}
                      onChange={(e) => setPick(e.target.value)}
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {pickLabel(u)}
                        </option>
                      ))}
                    </Sel>
                    <Button
                      kind="primary"
                      icon="r2Masquerade"
                      disabled={!chosen || (st.show && st.off !== null)}
                      title={st.show && st.off ? st.off : undefined}
                      onClick={() =>
                        chosen && entry.open({ id: chosen.id, name: chosen.name, workspace: chosen.workspace })
                      }
                    >
                      {C.start.cta}
                    </Button>
                  </div>
                  <p className={clsx(k.p, k.me)}>{C.start.help}</p>
                </div>
              ) : (
                <div className={clsx(k.row, k.nw)} style={{ alignItems: 'flex-start' }}>
                  <Icon name="r2Lock" size={16} strokeWidth={1.75} />
                  <p className={clsx(k.p, k.s2)}>{C.start.locked(gate.me.role)}</p>
                </div>
              )}
            </Card>
            {may ? (
              list.status === 'error' && list.failure ? (
                <LoadError failure={list.failure} retry={list.retry} />
              ) : (
                <Table
                  title={C.recent.title}
                  label={C.recent.title}
                  cols={cols}
                  rows={rows}
                  rowKey={(r) => r.key}
                  loading={list.status === 'loading'}
                  empty={{ icon: 'r2Masquerade', title: C.recent.empty }}
                  footer={
                    list.next ? (
                      <div className={k.more}>
                        <Button kind="quiet" onClick={list.more} disabled={list.loadingMore}>
                          Load more
                        </Button>
                      </div>
                    ) : null
                  }
                />
              )
            ) : null}
          </div>
          <div className={k.col}>
            <Rules />
            <Card title={C.preview.title}>
              <p className={clsx(k.p, k.s2)}>
                {C.preview.before}
                <button type="button" className={clsx(k.lk, s.link)} onClick={() => navigate('/admin/program')}>
                  {C.preview.link}
                </button>
                {C.preview.after}
              </p>
            </Card>
          </div>
        </div>
      )}
      {entry.dialog}
    </Page>
  );
}

export default Component;
