// /admin/flags on R2 (D-168, spec § 7.13, D8-D10): the mockup's `Flags`. The modes, the flags and each
// secret's presence: booleans and modes only, never a value, and no reveal or replace (D9).
//
// Production lists the Console's own flag (`masquerade_enabled`) and the env switches the app's readers
// already read (OFFER_OPEN, GHL_SYNC_ENABLED), read-only (D10). The mockup draws no control, so a Console
// flag's On/Off is its switch, for a viewer holding the capability its sensitivity asks (the Owner's
// `flags.write_sensitive` for `masquerade_enabled`, from `/me`'s caps):
// the R2 Confirm, with the key typed, then one audit row. Owner and Admin read it (`ops.read`).

import { useState } from 'react';
import clsx from 'clsx';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Confirm } from '../../components/r2/Modal';
import { Status } from '../../components/r2/Status';
import { Facts, PageHead, Pill, k } from '../../components/r2/kit';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi } from '../../data/console';
import type { OpsEnv } from '@ai/core';
import { useAdminChrome } from '../../shell/admin/chrome';
import { errorCopy } from './console.vm';
import { FLAGS_COPY as C, flagsVM, flipLabel } from './infra.vm';
import type { FlagRowVM } from './infra.vm';
import { InfraFrame } from './InfraFrame';
import s from './Infra.module.css';

function FlagsBody({ env, api, caps, reload }: { env: OpsEnv; api: ConsoleApi; caps: readonly string[]; reload: () => void }) {
  const { toast } = useAdminChrome();
  const [ask, setAsk] = useState<FlagRowVM | null>(null);
  const vm = flagsVM(env, caps);
  const flip = (r: FlagRowVM, typed?: string) => {
    if (!r.flip) return;
    api.flipFlag(r.key, r.flip.to, typed).then(
      (out) => {
        toast(`${out.flag.key} is ${out.flag.on ? 'on' : 'off'}`);
        reload();
      },
      (e: unknown) => toast(e instanceof ConsoleError && e.kind === 'invalid' ? e.message : errorCopy(e instanceof ConsoleError ? e.kind : 'failed').title),
    );
  };
  return (
    <>
      <Facts
        items={[
          { label: C.facts.environment, value: vm.facts.environment },
          { label: C.facts.stripe, value: <Status tone={vm.facts.stripe.tone}>{vm.facts.stripe.label}</Status> },
          { label: C.facts.email, value: vm.facts.email },
          { label: C.facts.on, value: vm.facts.on },
        ]}
      />
      <div className={clsx(s.g2, s.start)}>
        <Card title={C.flagsTitle} pad={false}>
          {vm.flags.map((f) => (
            <div key={f.key} className={k.li}>
              <div className={clsx(k.col, s.flagText)}>
                <span className={clsx(k.mo, k.el)}>{f.key}</span>
                <span className={k.me}>{f.label}</span>
              </div>
              {f.flip ? (
                <button type="button" className={s.flip} aria-label={flipLabel(f)} aria-haspopup="dialog" onClick={() => setAsk(f)}>
                  <Status tone={f.status.tone}>{f.status.label}</Status>
                </button>
              ) : (
                <Status tone={f.status.tone}>{f.status.label}</Status>
              )}
            </div>
          ))}
        </Card>
        <Card title={C.secretsTitle} sub={C.secretsSub} pad={false}>
          {vm.secrets.map((x) => (
            <div key={x.name} className={k.li}>
              <span className={s.grow}>{x.name}</span>
              <Status tone={x.status.tone}>{x.status.label}</Status>
            </div>
          ))}
        </Card>
      </div>
      {vm.flags.some((f) => f.key === 'cohort_welcome_email' && f.flip) ? <WelcomeTest api={api} /> : null}
      {ask?.flip ? (
        <Confirm
          title={ask.flip.confirm.title}
          body={ask.flip.confirm.body}
          cta={ask.flip.confirm.cta}
          danger={ask.flip.confirm.danger}
          typed={ask.flip.confirm.typed}
          audited
          onClose={() => setAsk(null)}
          onConfirm={(typed) => flip(ask, typed)}
        />
      ) : null}
    </>
  );
}

function WelcomeTest({ api }: { api: ConsoleApi }) {
  const { toast } = useAdminChrome();
  const [to, setTo] = useState('accelerator-test@amplifiedimpact.io');
  const [cohortId, setCohortId] = useState('dec26');
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Send a test welcome" sub="Only accelerator-test@amplifiedimpact.io, unless an allowlist adds another address. This does not email a learner.">
      <div className={k.col}>
        <label className={k.col}>
          <span className={k.me}>To</span>
          <input className={k.in} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className={k.col}>
          <span className={k.me}>Cohort</span>
          <input className={k.in} value={cohortId} onChange={(e) => setCohortId(e.target.value)} />
        </label>
        <Button
          kind="primary"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            api
              .sendWelcomeTest(to, cohortId)
              .then(
                (out) => toast(out.subject),
                (e: unknown) => toast(e instanceof ConsoleError ? e.message : 'The welcome was not sent.'),
              )
              .finally(() => setBusy(false));
          }}
        >
          {busy ? 'Sending' : 'Send Test'}
        </Button>
      </div>
    </Card>
  );
}

export function Component() {
  return (
    <InfraFrame
      screen="flags"
      lines={8}
      head={<PageHead title={C.title} meta={<Pill>{C.readOnly}</Pill>} description={C.description} />}
      read={(a) => a.opsEnv()}
    >
      {(env, { api, me, reload }) => <FlagsBody env={env} api={api} caps={me.caps} reload={reload} />}
    </InfraFrame>
  );
}

export default Component;
