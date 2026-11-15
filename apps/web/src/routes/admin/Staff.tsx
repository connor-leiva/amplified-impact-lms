import { useCallback, useMemo, useState } from 'react';

import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/primitives/Avatar';
import { useDb, useMutate, useNow } from '../../data/hooks';
import { STAFF_UI, staffVM } from './Staff.vm';
import type { InviteRole, PermCell, PermRow, StaffRow, StaffUi } from './Staff.vm';
import type { StaffRole } from '@ai/core';
import s from './Staff.module.css';

// Admin Staff & Roles `/admin/staff`, ported from design-reference/Admin Staff.dc.html.
// Contract: SCREENS § 4.9, phase 06 § 6.1.
//
// Markup only: every string, role option, activity line and checked box comes from `staffVM`, and
// all four writes go through `useMutate`, which already raises the toast — including the Owner's
// `The owner can’t be removed`, which `removeStaff` returns as a toast rather than an error. Casey
// Lin (`st1`, Owner) passes every staff permission, but the screen still calls the mutations rather
// than touching the snapshot.
//
// `inviteStaff` validates the address and the duplicate check itself and hands back the two exact
// messages SCREENS § 4.9 lists, so the screen holds no validation of its own: it renders `r.error`
// under the invite row and clears it as soon as the address changes, exactly as the prototype does.
//
// The permissions matrix declares `role="table"` with `role="row"` rows and `role="cell"` cells, and
// each 22px box is a `role="checkbox"` with `aria-checked` — what the gate 6 e2e selects
// (`getByRole('row', { name: /Publish modules/ }).getByRole('checkbox')`) and what axe's
// `aria-required-parent` needs. The Owner column is `aria-readonly`, never `disabled`: the
// reference leaves it clickable and inert, and the e2e clicks it and expects it still checked.

function Staff() {
  const db = useDb();
  const now = useNow();
  const mutate = useMutate();

  const [ui, setUi] = useState<StaffUi>(STAFF_UI);
  const vm = useMemo(() => staffVM(db, now, ui), [db, now, ui]);

  const invite = useCallback(async () => {
    const r = await mutate('inviteStaff', { email: ui.email, role: ui.newRole });
    // An invite that failed keeps what was typed, so the address can be corrected in place.
    setUi((u) => ({ ...u, err: r.error ?? '', email: r.error ? u.email : '' }));
  }, [mutate, ui.email, ui.newRole]);

  const setRole = useCallback(
    async (row: StaffRow, role: StaffRole) => {
      await mutate('setStaffRole', { id: row.id, role });
    },
    [mutate],
  );

  const remove = useCallback(
    async (row: StaffRow) => {
      await mutate('removeStaff', { id: row.id });
    },
    [mutate],
  );

  const toggle = useCallback(
    async (perm: PermRow, cell: PermCell) => {
      // The Owner column is inert, exactly as in the reference: no mutation, no toast, no error.
      if (cell.fixed) return;
      await mutate('togglePermission', { role: cell.role, perm: perm.key });
    },
    [mutate],
  );

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Staff &amp; Roles</h1>
          <p className={s.sub}>Who can build, publish and manage the program.</p>
        </div>
      </div>

      <section className={s.card}>
        <div className={s.inviteRow}>
          <div className={s.inviteTitle}>Team Members</div>
          <input
            className={s.email}
            data-phone="cell"
            type="text"
            value={vm.email}
            placeholder="name@amplifiedimpact.com"
            aria-label="Staff Email"
            aria-invalid={vm.err ? true : undefined}
            onChange={(e) => setUi((u) => ({ ...u, email: e.target.value, err: '' }))}
          />
          <select
            className={s.inviteRole}
            value={vm.newRole}
            aria-label="Invite Role"
            onChange={(e) => setUi((u) => ({ ...u, newRole: e.target.value as InviteRole }))}
          >
            {vm.inviteRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="button" className={s.invite} onClick={() => void invite()}>
            <Icon name="userPlus" size={14} strokeWidth={1.9} />
            Invite Staff
          </button>
        </div>

        {vm.err ? <div className={s.err}>{vm.err}</div> : null}

        {vm.rows.map((r) => (
          <div key={r.id} className={s.row} data-divider={r.divider ? 'true' : undefined}>
            <Avatar id={r.id} name={r.plainName} size={32} invited={r.invited} />
            <div className={s.nameStack}>
              <div className={s.name}>{r.name}</div>
              <div className={s.rowEmail}>{r.email}</div>
            </div>
            <span className={s.last} data-phone="cell">
              {r.last}
            </span>
            <select
              className={s.rowRole}
              value={r.role}
              disabled={r.isOwner}
              aria-label={`Role · ${r.plainName}`}
              onChange={(e) => void setRole(r, e.target.value as StaffRole)}
            >
              {vm.roles.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={s.remove}
              data-tone={r.removeTone}
              title="Remove"
              aria-label={`Remove · ${r.plainName}`}
              onClick={() => void remove(r)}
            >
              <Icon name="trash" size={14} strokeWidth={1.9} />
            </button>
          </div>
        ))}
      </section>

      <section className={s.card}>
        <div className={s.permHead}>
          <div className={s.cardTitle} id="staff-perms-title">
            Permissions
          </div>
          <div className={s.permSub}>Owner Permissions Are Fixed</div>
        </div>
        <div className={s.scroll} data-phone="tscroll">
          <div className={s.matrix} role="table" aria-labelledby="staff-perms-title" data-phone="tmin">
            <div className={s.matrixHead} role="row" data-phone="thead">
              <span role="columnheader">Permission</span>
              {vm.roles.map((r) => (
                <span key={r} role="columnheader" className={s.colHead}>
                  {r}
                </span>
              ))}
            </div>
            {vm.perms.map((p) => (
              <div key={p.key} className={s.matrixRow} role="row" aria-label={p.label} data-phone="card-grid">
                <span role="cell" className={s.permLabel} data-phone="cell">
                  {p.label}
                </span>
                {p.cells.map((c) => (
                  <div key={c.role} role="cell" className={s.cell} data-phone="cell-inline" data-label={c.role}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={c.on}
                      aria-readonly={c.fixed || undefined}
                      aria-label={`${c.role} · ${p.label}`}
                      className={s.check}
                      data-on={c.on ? 'true' : undefined}
                      data-fixed={c.fixed ? 'true' : undefined}
                      onClick={() => void toggle(p, c)}
                    >
                      {c.on ? (
                        <Icon name="check" size={13} strokeWidth={3} color="var(--action-on-primary)" />
                      ) : null}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function Component() {
  return <Staff />;
}

export default Component;
