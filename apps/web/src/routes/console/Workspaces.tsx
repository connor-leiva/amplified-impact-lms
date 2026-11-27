import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, ButtonLink } from '../../components/r2/Button';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Find, PageHead, Pill, Sel, Two, k } from '../../components/r2/kit';
import { isFixture } from '../../data/boot';
import { useAdminChrome } from '../../shell/admin/chrome';
import type { WorkspaceFilters } from '@ai/core';
import type { PlanKind } from '@ai/core/offer';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsolePages, useSettled } from './useConsoleData';
import { useMasqueradeEntry } from './useMasqueradeEntry';
import { WORKSPACES_COPY } from './workspaces.vm';
import { PRODUCT_OPTIONS, TEAMS_COPY as C, teamRow } from '../admin/people/people.vm';
import type { TeamRow } from '../admin/people/people.vm';
import { useAudiences } from '../admin/people/useAudiences';
import p from '../admin/people/People.module.css';

// R-5 Phase 7 (D-268): People › Teams (`/admin/people/teams`), the mockup's `TeamsPg` (handoff/admin-mockup/ia-screens.jsx):
// today's Workspaces, in the mockup's columns (Team, Holds, Seats used, Paying, Status) with Find and Product. A team of
// one made for an access group's member is left out (core's `groupTeamOfOne`, the API's list), and the line under the
// table says how many. A row opens the team. "Masquerade as owner…" stays on a row's menu (D-162 3b: Owner and Admin).

export function Component() {
  const gate = useConsoleGate('workspaces');
  const navigate = useNavigate();
  const { cohort } = useAdminChrome();
  const [text, setText] = useState('');
  const [holds, setHolds] = useState<'' | PlanKind>('');
  const q = useSettled(text);
  const api = gate.kind === 'ready' ? gate.api : null;
  const audiences = useAudiences(gate.kind === 'ready');
  const query = useMemo((): WorkspaceFilters => {
    const t = q.trim().slice(0, 100);
    return { ...(t ? { q: t } : {}), ...(holds ? { holds } : {}) };
  }, [q, holds]);
  const list = useConsolePages(api, (a, cursor) => a.workspaces(query, cursor), JSON.stringify(query));
  const rows = useMemo(() => list.rows.map(teamRow), [list.rows]);
  const raw = useMemo(() => new Map(list.rows.map((w) => [w.teamId, w])), [list.rows]);
  const entry = useMasqueradeEntry(gate.kind === 'ready' ? gate.me : null);
  const cohortPeople = cohort.id ? `/admin/cohort/${encodeURIComponent(cohort.id)}/people` : '/admin/cohort';

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={WORKSPACES_COPY.title} role={gate.role} />;

  const cols: Column<TeamRow>[] = [
    {
      key: 'n',
      label: C.columns.team,
      width: 'minmax(200px,1.4fr)',
      value: (t) => t.name,
      cell: (t, f) => <Two a={t.name} b={t.owner} to={f.phone ? undefined : t.href} />,
    },
    {
      key: 'holds',
      label: C.columns.holds,
      width: 'minmax(190px,1fr)',
      noSort: true,
      value: (t) => t.holds.map((h) => h.label).join(', '),
      cell: (t) => (
        <span className={p.holds}>
          {t.holds.map((h) => (
            <Pill key={h.label} tone={h.tone}>
              {h.label}
            </Pill>
          ))}
        </span>
      ),
    },
    { key: 'seats', label: C.columns.seats, width: '110px', value: (t) => t.used, cell: (t) => <span className={k.tn}>{t.seats}</span> },
    { key: 'paying', label: C.columns.paying, width: '150px', hideLap: true, value: (t) => t.paying },
    {
      key: 'status',
      label: C.columns.status,
      width: '104px',
      value: (t) => t.status.label,
      cell: (t) => <Status tone={t.status.tone}>{t.status.label}</Status>,
    },
  ];

  return (
    <Page>
      <PageHead
        title={WORKSPACES_COPY.title}
        description={C.description}
        right={
          !isFixture && gate.kind === 'ready' && gate.me.caps.includes('billing.comp') ? (
            <ButtonLink kind="primary" to="/admin/people/comp">
              Comp a Team
            </ButtonLink>
          ) : undefined
        }
      />
      <div className={k.row}>
        <Find value={text} onChange={setText} placeholder={C.find} />
        <Sel aria-label={C.product} value={holds} onChange={(e) => setHolds(e.target.value as '' | PlanKind)}>
          {PRODUCT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Sel>
      </div>
      {gate.kind === 'error' ? (
        <LoadError failure={gate.failure} retry={gate.retry} />
      ) : list.status === 'error' && list.failure ? (
        <LoadError failure={list.failure} retry={list.retry} />
      ) : (
        <Table
          label={WORKSPACES_COPY.title}
          cols={cols}
          rows={rows}
          rowKey={(t) => t.key}
          loading={list.status === 'loading' || gate.kind === 'loading'}
          onRow={(t) => navigate(t.href)}
          menu={(t) => {
            const r = raw.get(t.key);
            return [
              { label: C.open, onSelect: () => navigate(t.href) },
              ...(t.inCohort ? [{ label: C.inCohort, onSelect: () => navigate(cohortPeople) }] : []),
              ...(r?.ownerId ? entry.item(WORKSPACES_COPY.masquerade, { id: r.ownerId, name: r.ownerName ?? t.owner, workspace: r.name }) : []),
            ];
          }}
          empty={{ icon: 'r2Workspaces', title: C.empty }}
          filtered={holds !== '' || text.trim() !== ''}
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
      )}
      {list.status === 'ready' && audiences?.leftOut.length ? (
        <p className={clsx(k.p, k.me)}>
          {audiences.leftOut.map((g) => (
            <span key={g.id}>
              {C.leftOut(g.count, g.name)}{' '}
              <Link className={p.inl} to={`/admin/people/groups/${encodeURIComponent(g.id)}`}>
                {g.name}
              </Link>
              {' · '}
            </span>
          ))}
          <Link className={p.inl} to="/admin/people">
            {C.everyone}
          </Link>
        </p>
      ) : null}
      {entry.dialog}
    </Page>
  );
}

export default Component;
