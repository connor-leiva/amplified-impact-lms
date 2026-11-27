import { Fragment, useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { StaffRole } from '@ai/core';

import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import type { MenuEntry } from '../../components/r2/Menu';
import { Page } from '../../components/r2/Page';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Avatar, PageHead, Sel, TapCheck, Two, k, Stamp } from '../../components/r2/kit';
import { useDb, useMutate, useViewer } from '../../data/hooks';
import { useViewportWidth } from '../../shell/hooks';
import { staffR2VM } from './Staff.vm';
import type { InviteRole, PermCell, PermRow, StaffR2Row } from './Staff.vm';
import s from './Staff.module.css';

// Admin Staff & Roles `/admin/staff` on the Admin redesign R2's components (D-160 R2-3). The mockup
// draws no Staff screen, so this is the old screen's content in the R2 kit (no mockup frame, no parity
// cell). Every write is the same @ai/core mutation as before:
//
//   - Invite staff: `inviteStaff`, its two refusals shown under the row.
//   - A member's role: `setStaffRole` (the Owner's is fixed); their "…": Remove (`removeStaff`).
//   - The `PermKey` matrix: each box toggles `togglePermission`; the Owner column is fixed (D11 keeps
//     roles and this matrix here; the Console's capabilities are on Roles & Permissions, read-only).

function Staff() {
  const db = useDb();
  const viewer = useViewer();
  const mutate = useMutate();
  const phone = useViewportWidth() < 768;
  const viewerId = viewer.actor.kind === 'staff' ? viewer.actor.staffId : null;
  const vm = useMemo(() => staffR2VM(db, viewerId), [db, viewerId]);

  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<InviteRole>('Instructor');
  const [err, setErr] = useState('');

  const invite = useCallback(async () => {
    const r = await mutate('inviteStaff', { email, role: newRole });
    setErr(r.error ?? '');
    // An invite that failed keeps what was typed, so the address can be corrected in place.
    if (!r.error) setEmail('');
  }, [email, mutate, newRole]);

  const setRole = useCallback(
    (row: StaffR2Row, role: StaffRole) => void mutate('setStaffRole', { id: row.id, role }),
    [mutate],
  );
  const remove = useCallback((row: StaffR2Row) => void mutate('removeStaff', { id: row.id }), [mutate]);
  const toggle = useCallback(
    (perm: PermRow, cell: PermCell) => {
      // The Owner column is fixed: no mutation, as before.
      if (cell.fixed) return;
      void mutate('togglePermission', { role: cell.role, perm: perm.key });
    },
    [mutate],
  );

  const cols: Column<StaffR2Row>[] = [
    {
      key: 'name',
      label: 'Staff member',
      width: 'minmax(200px,1.4fr)',
      value: (r) => r.plainName,
      cell: (r) => (
        <div className={clsx(k.row, k.nw, s.who)}>
          <Avatar initials={r.initials} />
          <Two a={r.name} b={r.email} />
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      width: '160px',
      overflow: true,
      value: (r) => r.role,
      cell: (r) => (
        <Sel
          aria-label={`Role · ${r.plainName}`}
          value={r.role}
          disabled={r.isOwner}
          className={s.role}
          onChange={(e) => setRole(r, e.target.value as StaffRole)}
        >
          {vm.roles.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Sel>
      ),
    },
    {
      key: 'last',
      label: 'Last active',
      width: '136px',
      noSort: true,
      value: (r) => r.lastAt,
      cell: (r) => <Stamp v={r.last} two />,
    },
  ];

  const menu = (r: StaffR2Row): MenuEntry[] => [{ label: 'Remove', danger: true, onSelect: () => remove(r) }];

  return (
    <Page>
      <PageHead title="Staff & Roles" description="Who can build, publish and manage the program." />

      <div className={clsx(k.col, k.colS)}>
        <div className={k.row}>
          <input
            className={clsx(k.in, s.email)}
            type="text"
            value={email}
            placeholder="name@amplifiedimpact.com"
            aria-label="Staff Email"
            aria-invalid={err ? true : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              setErr('');
            }}
          />
          <Sel aria-label="Invite Role" value={newRole} onChange={(e) => setNewRole(e.target.value as InviteRole)}>
            {vm.inviteRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Sel>
          <Button kind="primary" icon="r2Plus" onClick={() => void invite()}>
            Invite Staff
          </Button>
        </div>
        {err ? (
          <p className={clsx(k.p, k.me, s.err)} role="alert">
            {err}
          </p>
        ) : null}
      </div>

      <Table
        title="Team Members"
        label="Team members"
        cols={cols}
        rows={vm.rows}
        rowKey={(r) => r.id}
        menu={(r) => (r.isOwner ? [] : menu(r))}
        empty={{ icon: 'r2Roles', title: 'No staff yet' }}
      />

      <Card title="Permissions" sub="Owner Permissions Are Fixed" pad={false}>
        <div role="table" aria-label="Permissions">
          {phone ? null : (
            <div className={clsx(k.th, s.grid)} role="row">
              <span role="columnheader">Permission</span>
              {vm.roles.map((r) => (
                <span key={r} role="columnheader">
                  {r}
                </span>
              ))}
            </div>
          )}
          {vm.perms.map((p) =>
            phone ? (
              <div key={p.key} className={clsx(k.pc, s.card)} role="row" aria-label={p.label}>
                <span role="cell" className={k.w6}>
                  {p.label}
                </span>
                {p.cells.map((c) => (
                  <div key={c.role} role="cell" className={clsx(k.pcR, s.cardRow)}>
                    <span className={k.mu}>{c.role}</span>
                    <TapCheck
                      label={`${c.role} · ${p.label}`}
                      checked={c.on}
                      disabled={c.fixed}
                      onChange={() => toggle(p, c)}
                    />
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
                      <input
                        type="checkbox"
                        className={k.chk}
                        checked={c.on}
                        disabled={c.fixed}
                        aria-label={`${c.role} · ${p.label}`}
                        onChange={() => toggle(p, c)}
                      />
                    </span>
                  </Fragment>
                ))}
              </div>
            ),
          )}
        </div>
      </Card>
    </Page>
  );
}

export function Component() {
  return <Staff />;
}

export default Component;
