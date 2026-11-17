// /admin/roles (D-157, spec § 7.16) on the Admin redesign R2 (D-160 R2-3b): the signed-off mockup's
// `Roles` (AdminRedesign.jsx). The staff table and the permission matrix, EDITABLE by the Owner (Connor,
// Nov 16, 2026, 8:27 AM MST, superseding the spec's D11): a box opens the mockup's confirm ("Remove this
// permission from Admin?"), which asks the server for a preview as it opens and makes the change with the
// preview's confirm token (`POST /api/console/roles/preview`, then `POST /api/console/roles`); the server
// refuses anything past `CONSOLE_CAPS` and writes one audit row, and its refusals show in the dialog.
// The Owner column is fixed, a box past the ceiling is locked ("Fixed by product rules"), the `build` row
// is set in Staff & Roles, and everyone but the Owner sees the matrix read-only. Staff and their roles
// are managed on Staff & Roles, which Invite staff and each member's "Change role…" open. Owner and Admin
// (`ops.read`). Markup only: the words come from Roles.vm.ts.

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import { CONSOLE_ERRORS, fixedByProductMessage } from '@ai/core';
import type { ConsoleMe, RolesMatrix } from '@ai/core';
import { Button, ButtonLink } from '../../components/r2/Button';
import { Box, Card } from '../../components/r2/Card';
import { Confirm } from '../../components/r2/Modal';
import { useToaster } from '../../components/primitives/Toaster';
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
import type { RolesR2Cell, RolesR2Staff } from './Roles.vm';
import { CONSOLE_SCREENS, errorCopy } from './console.vm';
import { Denied } from './Denied';
import { useConsoleGate } from './useConsoleGate';
import s from './Roles.module.css';

type Load = { kind: 'loading' } | { kind: 'error'; failure: ConsoleFailure } | { kind: 'denied' } | { kind: 'ready'; matrix: RolesMatrix };

/** The open confirm: its words, the preview's token once it answers, and a refusal in words. */
interface Dialog {
  change: NonNullable<RolesR2Cell['change']>;
  token: string | null;
  busy: boolean;
  error: string | null;
}

/**
 * A refusal's sentence: past the ceiling, "Fixed by product rules." and why; otherwise the Console's own
 * for a guard or a token (`CONSOLE_ERRORS`), else the generic one.
 */
function refusalCopy(e: unknown, change: Dialog['change']): string {
  if (e instanceof ConsoleError) {
    if (e.code === 'fixed_by_product') return fixedByProductMessage(change.capability);
    const own = e.code ? CONSOLE_ERRORS[e.code].message : null;
    if (own && e.kind !== 'failed') return own;
    if (e.kind === 'rate_limited') return `${errorCopy('rate_limited').title} ${errorCopy('rate_limited').body}`;
  }
  return errorCopy('failed').body;
}

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

function Matrix({ api, me }: { api: ConsoleApi; me: ConsoleMe }) {
  const role = me.role;
  const db = useDb();
  const viewer = useViewer();
  const navigate = useNavigate();
  const { toast } = useToaster();
  const phone = useViewportWidth() < 768;
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  // A box: the confirm opens at once with the mockup's words; the server's preview (and its guards)
  // answers behind it, and the action waits for its token.
  const open = useCallback(
    (change: Dialog['change']) => {
      setDialog({ change, token: null, busy: true, error: null });
      api.previewRole({ role: change.role, capability: change.capability, allowed: change.allowed }).then(
        (p) => setDialog((d) => (d && d.change === change ? { ...d, token: p.confirmToken, busy: false } : d)),
        (e: unknown) => setDialog((d) => (d && d.change === change ? { ...d, busy: false, error: refusalCopy(e, change) } : d)),
      );
    },
    [api],
  );
  const confirm = useCallback(() => {
    if (!dialog?.token) return;
    const { change, token } = dialog;
    setDialog({ ...dialog, busy: true });
    api.changeRole(token).then(
      (matrix) => {
        setLoad({ kind: 'ready', matrix });
        setDialog(null);
        toast(ROLES_R2_COPY.updated);
      },
      (e: unknown) => setDialog((d) => (d && d.change === change ? { ...d, busy: false, error: refusalCopy(e, change) } : d)),
    );
  }, [api, dialog, toast]);
  const close = useCallback(() => setDialog(null), []);

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
  const vm = load.kind === 'ready' ? rolesMatrixR2(load.matrix, db, { canEdit: me.caps.includes('roles.write'), role }) : null;

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
                    <label key={c.role} role="cell" className={clsx(k.pcR, s.cardRow)} title={c.locked ? 'Fixed by product rules' : c.title}>
                      <span className={k.mu}>{c.role}</span>
                      <CheckCell
                        phone
                        label={c.aria}
                        on={c.on}
                        locked={c.locked}
                        word={c.wordPhone}
                        title={c.title}
                        onToggle={c.change ? () => open(c.change!) : undefined}
                      />
                    </label>
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
                        <CheckCell
                          label={c.aria}
                          on={c.on}
                          locked={c.locked}
                          word={c.word}
                          title={c.title}
                          onToggle={c.change ? () => open(c.change!) : undefined}
                        />
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
      {dialog ? (
        <Confirm
          title={dialog.change.title}
          body={dialog.change.body}
          cta={dialog.change.cta}
          keepOpen
          busy={dialog.busy}
          error={dialog.error}
          onConfirm={confirm}
          onClose={close}
        />
      ) : null}
    </Page>
  );
}

export function Component() {
  const gate = useConsoleGate('roles');
  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={CONSOLE_SCREENS.roles.title} role={gate.role} />;
  if (gate.kind === 'ready') return <Matrix api={gate.api} me={gate.me} />;
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
