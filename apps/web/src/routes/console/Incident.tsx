import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useParams } from 'react-router';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { AUDITED, Confirm, Modal } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Facts, PageHead, Pill, TextArea, Timeline, k } from '../../components/r2/kit';
import { Icon } from '../../components/Icon';
import { useToaster } from '../../components/primitives/Toaster';
import { INCIDENTS_CHANGED } from '../../data/console';
import type { IncidentDetail } from '@ai/core';
import { useAdminChrome, useRecordCrumb } from '../../shell/admin/chrome';
import { Denied, NotFound } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsoleRecord } from './useConsoleData';
import { INCIDENTS_PATH, INCIDENT_COPY as C, incidentVM } from './incidents.vm';
import s from './Incidents.module.css';

// /admin/incidents/:id on R2 (D-167, spec § 7.14): the mockup's `Incident()`. The severity pill, the
// key facts, the timeline (stacked on a phone) and what it links to. Acknowledge (Owner, Admin and
// Support) while it is open and Resolve (Owner and Admin; hidden for Support, D3) until it is resolved
// sit where the mockup draws them; Resolve needs a note. Each is the stack's R2 dialog, then one
// audited write; the answer is the incident as it now is. The notes endpoint has no control here: the
// mockup draws no place for one (the eye check: no chrome it doesn't draw), so it waits for Connor.

type Dialog = 'ack' | 'resolve' | null;

export function Component() {
  const { id = '' } = useParams();
  const gate = useConsoleGate('incidents');
  const { toast } = useAdminChrome();
  const toaster = useToaster();
  const api = gate.kind === 'ready' ? gate.api : null;
  const rec = useConsoleRecord(api, (a) => a.incident(id), id);
  const [fresh, setFresh] = useState<IncidentDetail | null>(null);
  const data = fresh?.id === id ? fresh : rec.data;
  const role = gate.kind === 'ready' ? gate.me.role : null;
  const vm = useMemo(() => (data ? incidentVM(data, role) : null), [data, role]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [text, setText] = useState('');
  useRecordCrumb(vm?.id ?? null);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what="Incidents" role={gate.role} />;
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
  if (!vm || gate.kind !== 'ready')
    return (
      <Page>
        <div role="status" aria-busy="true" aria-label="Loading" />
      </Page>
    );

  const write = (go: () => Promise<IncidentDetail>, done: string) => {
    go().then(
      (next) => {
        setFresh(next);
        window.dispatchEvent(new Event(INCIDENTS_CHANGED));
        toast(done);
      },
      () => {
        rec.retry();
        toaster.toast(C.failed, 'warn');
      },
    );
  };
  const close = () => {
    setDialog(null);
    setText('');
  };
  const submit = () => {
    const words = text.trim();
    if (!words) return;
    write(() => gate.api.resolveIncident(vm.id, words), C.resolved(vm.id));
    close();
  };

  return (
    <Page>
      <PageHead
        back={{ to: INCIDENTS_PATH, label: C.back }}
        title={vm.title}
        meta={<Pill status={vm.severity} />}
        right={
          vm.canAck || vm.canResolve ? (
            <>
              {vm.canAck ? (
                <Button header onClick={() => setDialog('ack')}>
                  {C.ack}
                </Button>
              ) : null}
              {vm.canResolve ? (
                <Button header kind="primary" onClick={() => setDialog('resolve')}>
                  {C.resolve}
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      />
      <Facts
        items={[
          { label: C.facts.id, value: <span className={k.mo}>{vm.facts.id}</span> },
          { label: C.facts.status, value: <Status tone={vm.status.tone}>{vm.status.label}</Status> },
          { label: C.facts.severity, value: vm.facts.severity },
          { label: C.facts.owner, value: vm.facts.owner },
          { label: C.facts.opened, value: vm.facts.opened },
        ]}
      />
      <div className={k.gms}>
        <Card title={C.timeline}>
          <Timeline items={vm.timeline} />
        </Card>
        <Card title={C.linked} pad={false}>
          {vm.linked.length ? (
            vm.linked.map((l) => (
              <div key={l.key} className={k.li}>
                <Icon name={l.icon} size={16} strokeWidth={1.75} />
                <Link to={l.to} className={clsx(k.lk, s.grow)}>
                  {l.label}
                </Link>
                <Icon name="r2Chev" size={16} strokeWidth={1.75} />
              </div>
            ))
          ) : (
            <p className={clsx(k.li, k.p, k.mu)}>{C.noLinks}</p>
          )}
        </Card>
      </div>
      {dialog === 'ack' ? (
        <Confirm
          title={C.ackConfirm.title(vm.id)}
          body={C.ackConfirm.body}
          cta={C.ackConfirm.cta}
          audited
          onClose={close}
          onConfirm={() => write(() => gate.api.ackIncident(vm.id), C.acked(vm.id))}
        />
      ) : null}
      {dialog === 'resolve' ? (
        <Modal
          title={C.resolveDialog.title(vm.id)}
          onClose={close}
          foot={
            <>
              <Button onClick={close}>{C.cancel}</Button>
              <Button kind="primary" disabled={!text.trim()} onClick={submit}>
                {C.resolveDialog.cta}
              </Button>
            </>
          }
        >
          <label className={clsx(k.col, k.colS)}>
            <span className={k.w5}>{C.resolveDialog.label}</span>
            <TextArea
              rows={4}
              maxLength={2000}
              value={text}
              placeholder={C.resolveDialog.placeholder}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <p className={clsx(k.p, k.me)}>{AUDITED}</p>
        </Modal>
      ) : null}
    </Page>
  );
}

export default Component;
