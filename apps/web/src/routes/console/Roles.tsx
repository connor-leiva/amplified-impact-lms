// /admin/roles (D-157, spec § 7.16): the Console's capability matrix, read-only, with a link to the
// existing Staff & Roles screen where staff and their roles are managed. Owner and Admin (`ops.read`).
// Net-new and not golden-pinned (D-079, D-110). Markup only: the words come from Roles.vm.ts.

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { RolesMatrix } from '@ai/core';
import { ConsolePage } from '../../components/console/ConsolePage';
import { DataTable } from '../../components/console/DataTable';
import type { Column } from '../../components/console/DataTable';
import { ErrorBlock, LoadingBlock } from '../../components/console/StateBlock';
import { StatusBadge } from '../../components/console/StatusBadge';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';
import { ROLES_COPY, rolesVM } from './Roles.vm';
import type { RolesRowVM } from './Roles.vm';
import { CONSOLE_SCREENS, errorCopy } from './console.vm';
import { Denied } from './Denied';
import { useConsoleGate } from './useConsoleGate';
import s from './Roles.module.css';

type Load = { kind: 'loading' } | { kind: 'error'; failure: ConsoleFailure } | { kind: 'denied' } | { kind: 'ready'; matrix: RolesMatrix };

function Matrix({ api, role }: { api: ConsoleApi; role: string }) {
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

  const vm = load.kind === 'ready' ? rolesVM(load.matrix) : null;
  const columns: Column<RolesRowVM>[] = [
    { key: 'cap', label: ROLES_COPY.capability, render: (r) => r.label },
    ...(vm?.roles ?? []).map(
      (roleName, i): Column<RolesRowVM> => ({
        key: roleName,
        label: roleName,
        render: (r) => <StatusBadge label={r.cells[i]!.text} tone={r.cells[i]!.tone} icon={r.cells[i]!.icon} />,
      }),
    ),
  ];

  return (
    <ConsolePage title={ROLES_COPY.title} description={ROLES_COPY.description}>
      <div className={s.note}>
        <p className={s.noteText}>{ROLES_COPY.staffNote}</p>
        <Link className={s.link} to={vm?.staffPath ?? '/admin/staff'}>
          {ROLES_COPY.staffLink}
        </Link>
      </div>

      <section className={s.section} aria-labelledby="console-roles-matrix">
        <div className={s.sectionHead}>
          <h2 className={s.h2} id="console-roles-matrix">
            {ROLES_COPY.matrixTitle}
          </h2>
          <p className={s.sub}>
            {ROLES_COPY.matrixNote}
            {vm?.noAccess ? ` ${vm.noAccess}` : ''}
          </p>
        </div>
        {load.kind === 'loading' ? (
          <LoadingBlock rows={8} />
        ) : load.kind === 'error' ? (
          <ErrorBlock copy={errorCopy(load.failure)} onRetry={() => setAttempt((n) => n + 1)} />
        ) : (
          <DataTable caption={ROLES_COPY.caption} columns={columns} rows={vm!.rows} rowKey={(r) => r.key} />
        )}
      </section>
    </ConsolePage>
  );
}

export function Component() {
  const gate = useConsoleGate('roles');
  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={CONSOLE_SCREENS.roles.title} role={gate.role} />;
  if (gate.kind === 'ready') return <Matrix api={gate.api} role={gate.me.role} />;
  return (
    <ConsolePage title={ROLES_COPY.title} description={ROLES_COPY.description}>
      {gate.kind === 'loading' ? <LoadingBlock rows={8} /> : <ErrorBlock copy={errorCopy(gate.failure)} onRetry={gate.retry} />}
    </ConsolePage>
  );
}

export default Component;
