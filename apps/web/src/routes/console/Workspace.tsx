import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate, useParams } from 'react-router';
import { adminStamp, cleanNoteBody } from '@ai/core';
import type { StaffNote } from '@ai/core';
import { Button, ButtonLink } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import {
  Avatar,
  Bar,
  Facts,
  KV,
  Locked,
  Note,
  PageHead,
  Pill,
  Tabs,
  TextArea,
  Timeline,
  Two,
  k,
} from '../../components/r2/kit';
import { useViewportWidth } from '../../shell/hooks';
import { useAdminChrome, useRecordCrumb } from '../../shell/admin/chrome';
import { Denied, NotFound } from './Denied';
import { downloadBlob } from './download';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsoleRecord } from './useConsoleData';
import { useMasqueradeEntry } from './useMasqueradeEntry';
import { WorkspaceUsageTab } from './RecordTabs';
import { NONE, WORKSPACE_COPY as C, WORKSPACE_TABS, workspaceVM } from './workspaces.vm';
import type { MemberVM, WorkspaceTab } from './workspaces.vm';

// /admin/workspaces/:teamId on R2 (D-160 R2-1c, spec § 7.3): the mockup's `Workspace`. Key facts; the
// tabs Members, Plan & entitlements, Usage, Billing and Activity; and Staff notes beside them. Billing
// is the app's own order records (Stripe's reads are the Billing PR); Usage is the last 7 days' counts
// (D-166). "Masquerade as owner" and a member's "Masquerade…" open the reason dialog (D-162 3b): Owner
// and Admin only.

export function Component() {
  const { teamId = '' } = useParams();
  const gate = useConsoleGate('workspaces');
  const navigate = useNavigate();
  const phone = useViewportWidth() < 768;
  const { toast } = useAdminChrome();
  const api = gate.kind === 'ready' ? gate.api : null;
  const rec = useConsoleRecord(api, (a) => a.workspace(teamId), teamId);
  const vm = useMemo(() => (rec.data ? workspaceVM(rec.data) : null), [rec.data]);
  const [tab, setTab] = useState<WorkspaceTab>('members');
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [draft, setDraft] = useState('');
  const [intake, setIntake] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const entry = useMasqueradeEntry(gate.kind === 'ready' ? gate.me : null);
  useRecordCrumb(vm?.title ?? null);

  useEffect(() => {
    if (!api || !teamId) return;
    let alive = true;
    api.notes('workspace', teamId).then(
      (n) => alive && setNotes(n),
      () => alive && setNotes([]),
    );
    return () => {
      alive = false;
    };
  }, [api, teamId]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what="Workspaces" role={gate.role} />;
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
  if (!vm)
    return (
      <Page>
        <div role="status" aria-busy="true" aria-label="Loading" />
      </Page>
    );

  const team = rec.data?.team;
  const owner = entry.state();
  // D-246: the team's intake as the server prints it (`GET …/intake/pdf`, audited as `intake.pdf`), saved under its name.
  const downloadPdf = () => {
    if (!api || pdfBusy) return;
    setPdfBusy(true);
    api.teamIntakePdf(teamId).then(
      ({ blob, filename }) => {
        downloadBlob(blob, filename);
        setPdfBusy(false);
      },
      () => {
        setPdfBusy(false);
        toast(C.intakePdfFailed);
      },
    );
  };
  const save = () => {
    const body = cleanNoteBody(draft);
    if (!api || !body) return;
    setSaving(true);
    api.addNote('workspace', teamId, body).then(
      (n) => {
        setNotes((xs) => [n, ...xs]);
        setDraft('');
        setSaving(false);
        toast(C.notes.saved);
      },
      () => setSaving(false),
    );
  };

  const memberCols: Column<MemberVM>[] = [
    {
      key: 'n',
      label: C.members.name,
      width: 'minmax(180px,1.5fr)',
      value: (m) => m.name,
      cell: (m, f) => (
        <div className={clsx(k.row, k.nw)} style={{ gap: 10 }}>
          <Avatar initials={m.initials} />
          <Two a={m.name} b={m.email} to={f.phone ? undefined : m.href} />
        </div>
      ),
    },
    { key: 'role', label: C.members.role, width: '104px', value: (m) => m.role },
    {
      key: 'status',
      label: C.members.status,
      width: '96px',
      value: (m) => m.status.label,
      cell: (m) => <Status tone={m.status.tone}>{m.status.label}</Status>,
    },
  ];
  const tabs = WORKSPACE_TABS.map((id) => ({
    id,
    label: C.tabs[id],
    ...(id === 'members' ? { count: vm.members.length } : {}),
  }));
  const pills = (names: string[]) =>
    names.length ? (
      <span className={k.row} style={{ gap: 6 }}>
        {names.map((g) => (
          <Pill key={g} tone="neutral">
            {g}
          </Pill>
        ))}
      </span>
    ) : (
      NONE
    );

  return (
    <Page>
      <PageHead
        back={{ to: '/admin/people/teams', label: C.back }}
        title={vm.title}
        meta={<Pill status={vm.status} />}
        right={
          owner.show && team?.ownerId ? (
            <Button
              header
              icon="r2Masquerade"
              disabled={owner.off !== null}
              title={owner.off ?? undefined}
              onClick={() =>
                entry.open({ id: team.ownerId, name: team.ownerName ?? vm.facts.owner, workspace: team.name })
              }
            >
              {C.masquerade}
            </Button>
          ) : undefined
        }
      />
      <Card
        title="Intake"
        right={
          <span className={k.row}>
            <Button
              kind="quiet"
              onClick={() => {
                if (!api) return;
                api.teamIntake(teamId).then(
                  (row) => setIntake(JSON.stringify(row.answers, null, 2) || 'No answers yet.'),
                  () => setIntake('Could not load the intake.'),
                );
              }}
            >
              View intake
            </Button>
            <Button kind="quiet" icon="download" disabled={pdfBusy} aria-busy={pdfBusy || undefined} onClick={downloadPdf}>
              {C.intakePdf}
            </Button>
          </span>
        }
      >
        {intake ? <pre className={k.mo}>{intake}</pre> : <span className={k.mu}>Not loaded</span>}
        <Button
          kind="quiet"
          onClick={() => {
            if (!api) return;
            api.teamStack(teamId).then(
              (row) => setIntake(row.rows.map((r) => `${r.source}: ${r.tool} (${r.plan})`).join('\n') || 'No stack card yet.'),
              () => setIntake('Could not load the stack card.'),
            );
          }}
        >
          View stack card
        </Button>
      </Card>
      <Facts
        items={[
          { label: C.facts.id, value: <span className={k.mo}>{vm.facts.id}</span> },
          { label: C.facts.plan, value: vm.facts.plan },
          { label: C.facts.seats, value: vm.facts.seats },
          { label: C.facts.owner, value: vm.facts.owner },
          { label: C.facts.mrr, value: vm.facts.mrr },
          { label: C.facts.last, value: vm.facts.last },
          ...(vm.facts.welcome ? [{ label: C.facts.welcome, value: vm.facts.welcome }] : []),
        ]}
      />
      <div className={k.gms}>
        <div className={k.col}>
          <Tabs tabs={tabs} value={tab} onChange={setTab} phone={phone} label={C.sections} />
          {tab === 'members' ? (
            <Table
              label={C.members.label}
              cols={memberCols}
              rows={vm.members}
              rowKey={(m) => m.key}
              onRow={(m) => navigate(m.href)}
              menu={(m) => [
                { label: C.members.open, onSelect: () => navigate(m.href) },
                ...entry.item(C.members.masquerade, { id: m.key, name: m.name, workspace: vm.title }),
              ]}
              empty={{ icon: 'r2Users', title: C.members.empty }}
            />
          ) : null}
          {tab === 'plan' ? (
            <Card>
              <KV
                rows={[
                  { label: C.plan.plan, value: vm.plan.plan },
                  { label: C.plan.status, value: <Status tone={vm.plan.status.tone}>{vm.plan.status.label}</Status> },
                  {
                    label: C.plan.seats,
                    value: (
                      <span className={clsx(k.row, k.nw)} style={{ maxWidth: 260 }}>
                        <Bar pct={vm.plan.seats.pct} kind={vm.plan.seats.bar} />
                        <span className={k.tn}>{vm.plan.seats.text}</span>
                      </span>
                    ),
                  },
                  {
                    label: C.plan.tier,
                    value: vm.plan.tier.locked ? <Locked>{vm.plan.tier.text}</Locked> : vm.plan.tier.text,
                  },
                  { label: C.plan.groups, value: pills(vm.plan.groups) },
                  { label: C.plan.renews, value: vm.plan.renews },
                ]}
              />
            </Card>
          ) : null}
          {tab === 'usage' && api ? <WorkspaceUsageTab api={api} teamId={teamId} /> : null}
          {tab === 'billing' ? (
            <Card>
              <div className={k.col}>
                <KV
                  rows={[
                    { label: C.billing.customer, value: <span className={k.mo}>{vm.billing.customer}</span> },
                    { label: C.billing.subscription, value: <span className={k.mo}>{vm.billing.subscription}</span> },
                    { label: C.billing.mrr, value: vm.billing.mrr },
                    {
                      label: C.billing.invoice,
                      value: vm.billing.invoice ? (
                        <span className={k.row} style={{ gap: 8 }}>
                          <span className={k.mo}>{vm.billing.invoice.id}</span>
                          <Status tone={vm.billing.invoice.status.tone}>{vm.billing.invoice.status.label}</Status>
                        </span>
                      ) : (
                        NONE
                      ),
                    },
                  ]}
                />
                <div>
                  <ButtonLink to={C.billing.to}>{C.billing.open}</ButtonLink>
                </div>
              </div>
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
        <Card title={C.notes.title} sub={C.notes.sub}>
          <div className={clsx(k.col, k.colM)}>
            <TextArea
              rows={3}
              aria-label={C.notes.field}
              placeholder={C.notes.placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
            />
            <div>
              <Button disabled={!draft.trim() || saving} onClick={save}>
                {C.notes.save}
              </Button>
            </div>
            {notes.map((n) => (
              <Note key={n.id} who={n.author.name ?? 'Staff'} when={adminStamp(n.createdAt)} body={n.body} />
            ))}
          </div>
        </Card>
      </div>
      {entry.dialog}
    </Page>
  );
}

export default Component;
