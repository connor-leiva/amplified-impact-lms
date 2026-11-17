import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate, useParams } from 'react-router';
import { adminStamp } from '@ai/core';
import type { StaffNote } from '@ai/core';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Empty } from '../../components/r2/Empty';
import { Menu } from '../../components/r2/Menu';
import { Confirm } from '../../components/r2/Modal';
import { useToaster } from '../../components/primitives/Toaster';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Facts, KV, Note, PageHead, Pill, Tabs, Timeline, k } from '../../components/r2/kit';
import { Icon } from '../../components/Icon';
import { useViewportWidth } from '../../shell/hooks';
import { useAdminChrome, useRecordCrumb } from '../../shell/admin/chrome';
import { Denied, NotFound } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsoleRecord } from './useConsoleData';
import { useMasqueradeEntry } from './useMasqueradeEntry';
import { USER_COPY as C, USER_TABS, canReset, userVM } from './users.vm';
import type { UserTab, UserVM } from './users.vm';
import { NONE } from './workspaces.vm';

// /admin/users/:userId on R2 (D-160 R2-1c, spec § 7.4): the mockup's `User`. Key facts; the tabs
// Orders, Progress, Emails sent and Activity; Identity (existence only, never a hash) and staff notes
// beside them. "Send password reset…" is the one production send the Console adds (spec § 1): the
// existing reset email, audited, a staff member's by the Owner alone. There is no email change (spec
// § 7.4), so "Change email…" is locked. "Masquerade" opens the reason dialog (D-162 3b): Owner and
// Admin, a learner only.
// The reset's confirm is the R2 `Confirm` (the mockup's: it closes, then the action runs); the send's
// result is the R2 toast, or the app toaster's warning when it fails, as the shell's own Sign out does.

type Order = UserVM['orders'][number];

export function Component() {
  const { userId = '' } = useParams();
  const gate = useConsoleGate('users');
  const navigate = useNavigate();
  const phone = useViewportWidth() < 768;
  const { toast } = useAdminChrome();
  const toaster = useToaster();
  const api = gate.kind === 'ready' ? gate.api : null;
  const rec = useConsoleRecord(api, (a) => a.user(userId), userId);
  const vm = useMemo(() => (rec.data ? userVM(rec.data) : null), [rec.data]);
  const [tab, setTab] = useState<UserTab>('orders');
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [confirm, setConfirm] = useState(false);
  const entry = useMasqueradeEntry(gate.kind === 'ready' ? gate.me : null);
  useRecordCrumb(vm?.title ?? null);

  useEffect(() => {
    if (!api || !userId) return;
    let alive = true;
    api.notes('user', userId).then(
      (n) => alive && setNotes(n),
      () => alive && setNotes([]),
    );
    return () => {
      alive = false;
    };
  }, [api, userId]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what="Users" role={gate.role} />;
  if (rec.status === 'error' && rec.failure === 'not_found') return <NotFound />;
  if (gate.kind === 'error')
    return (
      <Page>
        <LoadError failure={gate.failure} retry={gate.retry} />
      </Page>
    );
  if (rec.status === 'error' && rec.failure)
    return (
      <Page>
        <LoadError failure={rec.failure} retry={rec.retry} />
      </Page>
    );
  if (!vm || !rec.data || gate.kind !== 'ready')
    return (
      <Page>
        <div role="status" aria-busy="true" aria-label="Loading" />
      </Page>
    );

  const user = rec.data.user;
  const mayReset = canReset(gate.me.role, user);
  const mq = entry.state(user.kind);
  const send = () => {
    gate.api.resetPassword(user.id).then(
      ({ link }) => toast(link === 'set' ? C.reset.setSent : C.reset.sent),
      () => toaster.toast(C.reset.failed, 'warn'),
    );
  };

  const orderCols: Column<Order>[] = [
    { key: 'id', label: C.orders.invoice, mono: true, width: 'minmax(150px,1.4fr)', value: (o) => o.id },
    { key: 'amt', label: C.orders.amount, num: true, width: '96px', value: (o) => o.cents, cell: (o) => o.amount },
    {
      key: 'st',
      label: C.orders.status,
      width: '104px',
      value: (o) => o.status.label,
      cell: (o) => <Status tone={o.status.tone}>{o.status.label}</Status>,
    },
    { key: 'd', label: C.orders.date, width: '112px', noSort: true, value: (o) => o.at, cell: (o) => o.date },
  ];
  const tabs = USER_TABS.map((id) => ({ id, label: C.tabs[id] }));

  return (
    <Page>
      <PageHead
        back={{ to: '/admin/users', label: C.back }}
        title={vm.title}
        meta={<Pill status={vm.status} />}
        right={
          <>
            {mq.show ? (
              <Button
                header
                icon="r2Masquerade"
                disabled={mq.off !== null}
                title={mq.off ?? undefined}
                onClick={() => entry.open({ id: user.id, name: user.name, workspace: user.workspace })}
              >
                {C.masquerade}
              </Button>
            ) : null}
            <Menu
              label={C.more}
              items={[
                { label: C.reset.item, locked: !mayReset, onSelect: () => setConfirm(true) },
                { label: C.changeEmail, locked: true, onSelect: () => {} },
              ]}
              trigger={(t) => (
                <Button
                  header
                  style={{ width: 'var(--r2-cp)', padding: 0 }}
                  aria-label={C.more}
                  {...t.props}
                  onClick={t.toggle}
                >
                  <Icon name="r2More" size={16} strokeWidth={2.6} />
                </Button>
              )}
            />
          </>
        }
      />
      <Facts
        items={[
          { label: C.facts.id, value: <span className={k.mo}>{vm.facts.id}</span> },
          { label: C.facts.email, value: <span className={k.mo}>{vm.facts.email}</span> },
          {
            label: C.facts.workspace,
            value: vm.facts.workspaceHref ? (
              <Link to={vm.facts.workspaceHref} className={clsx(k.lk, k.el)}>
                {vm.facts.workspace}
              </Link>
            ) : (
              vm.facts.workspace
            ),
          },
          { label: C.facts.role, value: vm.facts.role },
          { label: C.facts.tier, value: vm.facts.tier },
          { label: C.facts.last, value: vm.facts.last },
        ]}
      />
      <div className={k.gms}>
        <div className={k.col}>
          <Tabs tabs={tabs} value={tab} onChange={setTab} phone={phone} label={C.sections} />
          {tab === 'orders' ? (
            <Table
              label={C.orders.label}
              cols={orderCols}
              rows={vm.orders}
              rowKey={(o) => o.key}
              rowHref={(o) => o.href ?? ''}
              onRow={(o) => (o.href ? navigate(o.href) : undefined)}
              empty={{ icon: 'r2Billing', title: C.orders.empty }}
            />
          ) : null}
          {tab === 'progress' ? (
            <Card pad={false}>
              {vm.progress.length ? (
                vm.progress.map((p) => (
                  <div key={p.key} className={k.li}>
                    <span className={k.el} style={{ flex: 1 }}>
                      {p.name}
                    </span>
                    <Status tone={p.status.tone}>{p.status.label}</Status>
                  </div>
                ))
              ) : (
                <Empty icon="r2Curriculum" title={C.progress.empty} />
              )}
            </Card>
          ) : null}
          {tab === 'emails' ? (
            <Card pad={false}>
              <Empty icon="r2Email" title={C.emails.title} body={C.emails.body} />
            </Card>
          ) : null}
          {tab === 'activity' ? (
            <Card>
              {vm.activity.length ? (
                <Timeline items={vm.activity} />
              ) : (
                <p className={clsx(k.p, k.mu)}>{C.noActivity}</p>
              )}
            </Card>
          ) : null}
        </div>
        <div className={k.col}>
          <Card title={C.identity.title}>
            <KV
              rows={[
                { label: C.identity.verified, value: vm.identity.verified },
                { label: C.identity.signIn, value: vm.identity.signIn },
                { label: C.identity.staff, value: vm.identity.staff },
                {
                  label: C.identity.groups,
                  value: vm.identity.groups.length ? (
                    <span className={k.row} style={{ gap: 6 }}>
                      {vm.identity.groups.map((g) => (
                        <Pill key={g} tone="neutral">
                          {g}
                        </Pill>
                      ))}
                    </span>
                  ) : (
                    NONE
                  ),
                },
              ]}
            />
          </Card>
          <Card title={C.notes.title} sub={C.notes.sub}>
            <div className={clsx(k.col, k.colM)}>
              {notes.length ? (
                notes.map((n) => (
                  <Note key={n.id} who={n.author.name ?? 'Staff'} when={adminStamp(n.createdAt)} body={n.body} />
                ))
              ) : (
                <p className={clsx(k.p, k.mu)}>{C.notes.none}</p>
              )}
            </div>
          </Card>
        </div>
      </div>
      {entry.dialog}
      {confirm ? (
        <Confirm
          title={C.reset.title(user.name)}
          body={C.reset.body(user.email)}
          cta={C.reset.cta}
          audited
          onConfirm={send}
          onClose={() => setConfirm(false)}
        />
      ) : null}
    </Page>
  );
}

export default Component;
