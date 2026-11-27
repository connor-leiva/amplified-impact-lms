import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate, useParams } from 'react-router';
import { consoleCan } from '@ai/core';
import { Icon } from '../../../components/Icon';
import { Button } from '../../../components/r2/Button';
import { Card } from '../../../components/r2/Card';
import { Menu } from '../../../components/r2/Menu';
import { AUDITED, Modal, modalStyles as ms } from '../../../components/r2/Modal';
import { Page } from '../../../components/r2/Page';
import { Table } from '../../../components/r2/Table';
import type { Column } from '../../../components/r2/Table';
import { Bar, Find, KV, PageHead, Stamp, Two, k } from '../../../components/r2/kit';
import { useDb, useNow } from '../../../data/hooks';
import { personPath } from '../../../shell/admin/addresses';
import { useAdminChrome } from '../../../shell/admin/chrome';
import { Denied, NotFound } from '../../console/Denied';
import { LoadError } from '../../console/LoadError';
import { downloadCsv } from '../../console/download';
import { useConsoleGate } from '../../console/useConsoleGate';
import { useConsoleRecord } from '../../console/useConsoleData';
import { LinkFacts } from '../cohort/parts';
import { GROUP_COPY as C, LOCKED_GROUP_KEY, groupVM } from './people.vm';
import type { GroupAgentRow } from './people.vm';
import { refreshAudiences } from './useAudiences';
import p from './People.module.css';

// R-5 Phase 7 (D-268): People › an access group's tab (`/admin/people/groups/:groupId`, "Utah Life"), the mockup's
// `Groups` (handoff/admin-mockup/ia-screens.jsx) in full: its facts, its agents (first sign-in, last active, skills
// opened), what they can open, what they open most, where they are counted, Export, and the menu's two writes ("Add an
// address outside the domain…" and "End access…", Owner and Admin, each confirmed and audited, PLAN.md § 10.7). D-267
// drew its first half read-only. Its people are the learners in it by their address who are in no cohort, so they are
// counted here and nowhere else. Every time prints MT / CT.

export function Component() {
  const { groupId = '' } = useParams();
  const gate = useConsoleGate('users');
  const db = useDb();
  const now = useNow();
  const navigate = useNavigate();
  const { toast } = useAdminChrome();
  const [q, setQ] = useState('');
  const [dialog, setDialog] = useState<'add' | 'end' | null>(null);
  const [field, setField] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = gate.kind === 'ready' ? gate.api : null;
  const rec = useConsoleRecord(api, (a) => a.group(groupId), groupId);
  const vm = useMemo(() => (rec.data ? groupVM(rec.data, now, q) : null), [rec.data, now, q]);
  // The line a locked skill shows the group's members is a copy string (Words); without it, no line.
  const locked = db.copy?.find((c) => c.key === LOCKED_GROUP_KEY)?.value ?? null;

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
  if (!vm || !rec.data)
    return (
      <Page>
        <div role="status" aria-busy="true" aria-label="Loading" />
      </Page>
    );

  const role = gate.kind === 'ready' ? gate.me.role : null;
  const canWrite = consoleCan(role, 'access_group.write');
  const canExport = consoleCan(role, 'export');
  const close = () => {
    setDialog(null);
    setField('');
    setError(null);
    setBusy(false);
  };
  const run = (write: () => Promise<void>, done: string) => {
    setBusy(true);
    setError(null);
    write().then(
      () => {
        close();
        toast(done);
        refreshAudiences();
        rec.retry();
      },
      (e: unknown) => {
        setBusy(false);
        setError(e instanceof Error && e.message ? e.message : 'That didn’t save. Try again.');
      },
    );
  };
  const exportAgents = () => {
    if (!api) return;
    api.exportGroup(groupId).then(
      ({ csv, filename }) => {
        downloadCsv(csv, filename);
        toast(C.exported);
      },
      () => undefined,
    );
  };
  const toTable = () => document.getElementById('group-agents')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const cols: Column<GroupAgentRow>[] = [
    { key: 'name', label: C.columns.agent, width: 'minmax(200px,1.5fr)', value: (r) => r.name, cell: (r) => <Two a={r.name} b={r.email} /> },
    { key: 'first', label: C.columns.first, width: '120px', noSort: true, value: (r) => r.first },
    { key: 'last', label: C.columns.last, width: '170px', noSort: true, value: (r) => r.lastAt, cell: (r) => <Stamp v={r.last} two /> },
    { key: 'opened', label: C.columns.opened, width: '110px', num: true, value: (r) => r.opened },
  ];
  const top = vm.most[0]?.count ?? 0;

  return (
    <Page>
      <PageHead
        title={vm.name}
        description={groupDescriptionOf(rec.data.emailDomain, vm.planLabel)}
        right={
          <>
            <Button header icon="download" disabled={!canExport} title={canExport ? undefined : 'Your role cannot do this'} onClick={exportAgents}>
              {C.export}
            </Button>
            <Menu
              label={C.more}
              items={[
                { label: C.addAddress, locked: !canWrite, disabled: vm.ended, onSelect: () => setDialog('add') },
                'separator',
                { label: C.endAccess, danger: true, locked: !canWrite, disabled: vm.ended, onSelect: () => setDialog('end') },
              ]}
              trigger={(t) => (
                <button type="button" className={k.ib} aria-label={C.more} {...t.props} onClick={t.toggle}>
                  <Icon name="r2More" size={16} strokeWidth={2.6} />
                </button>
              )}
            />
          </>
        }
      />
      <LinkFacts
        items={[
          { label: C.facts.signedIn, value: String(vm.facts.signedIn), onClick: toTable },
          { label: C.facts.active, value: String(vm.facts.active), onClick: toTable },
          { label: C.facts.gets, value: vm.facts.gets, to: '/admin/program/course?section=words' },
          { label: C.facts.qualifies, value: vm.facts.qualifies },
          { label: C.facts.since, value: vm.facts.since },
          { label: C.facts.ends, value: vm.facts.ends },
        ]}
      />
      <div className={k.gms}>
        <div className={k.col} id="group-agents">
          <div className={k.row}>
            <Find value={q} onChange={setQ} placeholder={C.find} />
          </div>
          <Table
            title={C.table}
            label={vm.name}
            cols={cols}
            rows={vm.rows}
            rowKey={(r) => r.id}
            onRow={(r) => navigate(personPath(r.id))}
            empty={{ icon: 'r2Learners', title: C.empty }}
          />
          <p className={clsx(k.p, k.me)}>{C.showing(vm.rows.length, vm.total)}</p>
        </div>
        <div className={k.col}>
          <Card title={C.canOpen}>
            <div className={clsx(k.col, k.colM)}>
              <div className={p.canRow}>
                <span className={p.mt}>
                  <Icon name="r2Check" size={16} strokeWidth={1.75} />
                </span>
                <span className={p.canText}>
                  <span className={k.w5}>{vm.open.title}</span>
                  <span className={k.me}>{vm.open.sub}</span>
                </span>
              </div>
              <div className={p.canRow}>
                <span className={clsx(p.mt, p.mtOff)}>
                  <Icon name="r2Lock" size={16} strokeWidth={1.75} />
                </span>
                <span className={p.canText}>
                  <span className={k.w5}>{vm.open.not}</span>
                  {locked ? <span className={k.me}>{C.lockedSays(locked)}</span> : null}
                </span>
              </div>
              <Link className={clsx(k.lk, p.left, p.lka)} to="/admin/program/course?section=words">
                {C.changeLine}
              </Link>
            </div>
          </Card>
          <Card title={C.mostOpened} sub={C.last30}>
            <div className={clsx(k.col, k.colM)}>
              {vm.most.length ? (
                vm.most.map((m) => (
                  <div key={m.title} className={p.rdy}>
                    <span className={clsx(k.el, p.rdyName)}>{m.title}</span>
                    <Bar pct={top ? (m.count / top) * 100 : 0} pct2={0} />
                    <span className={clsx(k.tn, k.w5, p.rdn)}>{m.count}</span>
                  </div>
                ))
              ) : (
                <p className={clsx(k.p, k.mu)}>{C.nothingOpened}</p>
              )}
            </div>
          </Card>
          <Card title={C.counted}>
            <div className={p.kvsLast}>
              <KV rows={C.countedRows.map(([label, value]) => ({ label, value }))} stacked />
            </div>
          </Card>
        </div>
      </div>
      {dialog === 'add' && api ? (
        <Modal
          title={C.add.title(vm.name)}
          onClose={close}
          foot={
            <>
              <Button onClick={close}>Cancel</Button>
              <Button kind="primary" disabled={!field.trim() || busy || !!error} onClick={() => run(() => api.addGroupAddress(groupId, field.trim()), C.add.done)}>
                {C.add.cta}
              </Button>
            </>
          }
        >
          <p className={ms.body}>{C.add.body}</p>
          <label className={ms.lab}>
            {C.add.field}
            <input
              className={k.in}
              type="email"
              autoFocus
              autoComplete="off"
              value={field}
              onChange={(e) => {
                setField(e.target.value);
                setError(null);
              }}
            />
          </label>
          {error ? (
            <p className={ms.error} role="alert">
              {error}
            </p>
          ) : null}
          <p className={ms.note}>{AUDITED}</p>
        </Modal>
      ) : null}
      {dialog === 'end' && api ? (
        <Modal
          title={C.end.title(vm.name)}
          onClose={close}
          foot={
            <>
              <Button onClick={close}>Cancel</Button>
              <Button kind="primary-danger" disabled={field.trim().length < 10 || busy || !!error} onClick={() => run(() => api.endGroup(groupId, field.trim()), C.end.done)}>
                {C.end.cta}
              </Button>
            </>
          }
        >
          <p className={ms.body}>{C.end.body(vm.total, vm.planLabel)}</p>
          <label className={ms.lab}>
            {C.end.reason}
            <input
              className={k.in}
              autoFocus
              value={field}
              placeholder="Required"
              onChange={(e) => {
                setField(e.target.value);
                setError(null);
              }}
            />
          </label>
          {error ? (
            <p className={ms.error} role="alert">
              {error}
            </p>
          ) : null}
          <p className={ms.note}>{AUDITED}</p>
        </Modal>
      ) : null}
    </Page>
  );
}

/** The group's own words (D-267's line), from its record: who is in it, and what it grants. */
function groupDescriptionOf(domain: string | null, plan: string): string {
  const who = domain ? `Agents with a ${domain} address` : 'Agents on its list';
  return `${who} get the ${plan}’s skills at no charge. They are counted here: not in a cohort, not as teams, and not in revenue.`;
}

export default Component;
