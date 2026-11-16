// /admin/roles (D-157, spec § 7.16) on the Admin redesign R2 (D-160 R2-3b): the signed-off mockup's
// `Roles` (AdminRedesign.jsx). The staff table and the permission matrix, READ-ONLY: the Console's
// capabilities are set in code (`CONSOLE_CAPS`, D11) and spec § 7.16 allows no write endpoint, so every
// box is drawn disabled, the Owner column checked, and Support's refund and masquerade locked "Fixed by
// product rules". The mockup's confirm ("Remove this permission from Admin?") is not built (Needs
// Connor's call). Staff and their roles are managed on Staff & Roles, which Invite staff and each
// member's "Change role…" open. Owner and Admin (`ops.read`). Markup only: the words come from
// Roles.vm.ts.

import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import type { RolesMatrix } from '@ai/core';
import { Button, ButtonLink } from '../../components/r2/Button';
import { Box, Card } from '../../components/r2/Card';
import type { MenuEntry } from '../../components/r2/Menu';
import { Page } from '../../components/r2/Page';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Avatar, CheckCell, ErrorState, PageHead, Pill, Skel, Two, k } from '../../components/r2/kit';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';
import { useDb, useViewer } from '../../data/hooks';
import { useViewportWidth } from '../../shell/hooks';
import { ROLES_COPY, ROLES_R2_COPY, rolesMatrixR2, rolesStaffR2 } from './Roles.vm';
import type { RolesR2Staff } from './Roles.vm';
import { CONSOLE_SCREENS, errorCopy } from './console.vm';
import { Denied } from './Denied';
import { useConsoleGate } from './useConsoleGate';
import s from './Roles.module.css';

type Load = { kind: 'loading' } | { kind: 'error'; failure: ConsoleFailure } | { kind: 'denied' } | { kind: 'ready'; matrix: RolesMatrix };

const STAFF_PATH = '/admin/staff';

function Head({ canManageStaff }: { canManageStaff: boolean }) {
  return (
    <PageHead
      title={ROLES_COPY.title}
      description={ROLES_R2_COPY.description}
      right={
        canManageStaff ? (
          <ButtonLink header kind="primary" icon="r2Plus" to={STAFF_PATH}>
            {ROLES_R2_COPY.invite}
          </ButtonLink>
        ) : (
          <Button header kind="primary" icon="r2Lock" aria-disabled="true" title="Your role cannot do this">
            {ROLES_R2_COPY.invite}
          </Button>
        )
      }
    />
  );
}

function Matrix({ api, role }: { api: ConsoleApi; role: string }) {
  const db = useDb();
  const viewer = useViewer();
  const navigate = useNavigate();
  const phone = useViewportWidth() < 768;
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoad({ kind: 'loading' });
    api.roles().then(
      (matrix) => alive && setLoad({ kind: 'ready', matrix }),
      (e: unknown) => {
        if (!alive) return;
        const failure = e instanceof ConsoleError ? e.kind : 'failed';
        setLoad(failure === 'forbidden' ? { kind: 'denied' } : { kind: 'error', failure });
      },
    );
    return () => {
      alive = false;
    };
  }, [api, attempt]);

  if (load.kind === 'denied') return <Denied what={CONSOLE_SCREENS.roles.title} role={role} />;

  const viewerId = viewer.actor.kind === 'staff' ? viewer.actor.staffId : null;
  const { staff, canManageStaff } = rolesStaffR2(db, viewerId);
  const vm = load.kind === 'ready' ? rolesMatrixR2(load.matrix, db) : null;

  const cols: Column<RolesR2Staff>[] = [
    {
      key: 'name',
      label: 'Staff member',
      width: 'minmax(200px,1.4fr)',
      value: (r) => r.name,
      cell: (r) => (
        <div className={clsx(k.row, k.nw, s.who)}>
          <Avatar initials={r.initials} />
          <Two a={r.name} b={r.email} />
        </div>
      ),
    },
    { key: 'role', label: 'Role', width: '104px', value: (r) => r.role, cell: (r) => <Pill tone={r.isOwner ? 'ok' : undefined}>{r.role}</Pill> },
    { key: 'last', label: 'Last sign-in', width: '136px', noSort: true, value: (r) => r.lastAt, cell: (r) => r.last },
  ];
  const menu = (r: RolesR2Staff): MenuEntry[] => [
    r.isOwner || !canManageStaff
      ? { label: ROLES_R2_COPY.changeRole, disabled: true, title: r.isOwner ? 'The Owner’s role is fixed' : 'Your role cannot do this', onSelect: () => {} }
      : { label: ROLES_R2_COPY.changeRole, onSelect: () => navigate(STAFF_PATH) },
  ];

  return (
    <Page>
      <Head canManageStaff={canManageStaff} />
      <Table
        title={ROLES_R2_COPY.staffTitle}
        label={ROLES_R2_COPY.staffTitle}
        cols={cols}
        rows={staff}
        rowKey={(r) => r.id}
        menu={menu}
        empty={{ icon: 'r2Roles', title: 'No staff yet' }}
      />
      {load.kind === 'error' ? (
        <Box>
          <ErrorState copy={errorCopy(load.failure)} onRetry={() => setAttempt((n) => n + 1)} />
        </Box>
      ) : vm ? (
        <Card title={ROLES_R2_COPY.matrixTitle} sub={ROLES_R2_COPY.matrixSub} pad={false}>
          <div role="table" aria-label={ROLES_COPY.caption}>
            {phone ? null : (
              <div className={clsx(k.th, s.grid)} role="row">
                <span role="columnheader">{ROLES_COPY.capability}</span>
                {vm.roles.map((r) => (
                  <span key={r} role="columnheader">
                    {r}
                  </span>
                ))}
              </div>
            )}
            {vm.rows.map((p) =>
              phone ? (
                <div key={p.key} className={clsx(k.pc, s.card)} role="row" aria-label={p.label}>
                  <span role="cell" className={k.w6}>
                    {p.label}
                  </span>
                  {p.cells.map((c) => (
                    <div key={c.role} role="cell" className={clsx(k.pcR, s.cardRow)} title={c.locked ? 'Fixed by product rules' : undefined}>
                      <span className={k.mu}>{c.role}</span>
                      <CheckCell phone label={`${p.label}, ${c.role}`} on={c.on} locked={c.locked} word={c.wordPhone} />
                    </div>
                  ))}
                </div>
              ) : (
                <div key={p.key} className={clsx(k.tr, s.grid, s.mrow)} role="row" aria-label={p.label}>
                  <span role="cell" className={k.el}>
                    {p.label}
                  </span>
                  {p.cells.map((c) => (
                    <Fragment key={c.role}>
                      <span role="cell">
                        <CheckCell label={`${p.label}, ${c.role}`} on={c.on} locked={c.locked} word={c.word} />
                      </span>
                    </Fragment>
                  ))}
                </div>
              ),
            )}
          </div>
        </Card>
      ) : (
        <Skel lines={8} />
      )}
    </Page>
  );
}

export function Component() {
  const gate = useConsoleGate('roles');
  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={CONSOLE_SCREENS.roles.title} role={gate.role} />;
  if (gate.kind === 'ready') return <Matrix api={gate.api} role={gate.me.role} />;
  return (
    <Page>
      <Head canManageStaff={false} />
      {gate.kind === 'loading' ? (
        <Skel lines={8} />
      ) : (
        <Box>
          <ErrorState copy={errorCopy(gate.failure)} onRetry={gate.retry} />
        </Box>
      )}
    </Page>
  );
}

export default Component;
