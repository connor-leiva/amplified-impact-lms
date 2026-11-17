// /admin/integrations on R2 (D-168, spec § 7.13): the mockup's `Integrations`. One card per service:
// its state, last success and last error, each secret's presence (never a value: there is nothing to
// reveal, copy or replace, D9), and Test connection. Test connection is "Check now" for Stripe and
// Resend only, read-only, and audited; on the other four it is drawn, as the mockup draws it, and inert
// (Needs Connor's call). GA4 and the Meta Pixel are www's (D-155): their public ids, nothing checked.
// Owner and Admin (`ops.read`). Markup only: the words come from infra.vm.ts.

import { useState } from 'react';
import clsx from 'clsx';
import { consoleCan, probeMessage } from '@ai/core';
import type { IntegrationView, ProbeIntegration } from '@ai/core';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Status } from '../../components/r2/Status';
import { KV, PageHead, k } from '../../components/r2/kit';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi } from '../../data/console';
import { useAdminChrome } from '../../shell/admin/chrome';
import { errorCopy } from './console.vm';
import { INTEGRATIONS_COPY as C, integrationCardVM } from './infra.vm';
import type { IntegrationCardVM } from './infra.vm';
import { InfraFrame } from './InfraFrame';
import s from './Infra.module.css';

function Cards({ list, api, canProbe }: { list: IntegrationView[]; api: ConsoleApi; canProbe: boolean }) {
  const { toast } = useAdminChrome();
  const [busy, setBusy] = useState<string | null>(null);
  const check = (id: ProbeIntegration) => {
    setBusy(id);
    api.checkIntegration(id).then(
      (r) => {
        setBusy(null);
        toast(probeMessage(r));
      },
      (e: unknown) => {
        setBusy(null);
        toast(errorCopy(e instanceof ConsoleError ? e.kind : 'failed').title);
      },
    );
  };
  const cards: IntegrationCardVM[] = list.map((i) => integrationCardVM(i, canProbe));
  return (
    <div className={s.g2}>
      {cards.map((c) => (
        <Card key={c.id} title={c.name} sub={c.use} right={<Status tone={c.status.tone}>{c.status.label}</Status>}>
          <div className={k.col}>
            <KV
              rows={c.rows.map((r) => ({
                label: r.label,
                value: r.status ? <Status tone={r.status.tone}>{r.status.label}</Status> : <span className={k.mo}>{r.mono}</span>,
              }))}
            />
            {c.action === 'www' ? (
              <p className={clsx(k.p, k.me)}>{C.wwwOnly}</p>
            ) : (
              <div>
                {c.action === 'test' ? (
                  <Button icon="r2Refresh" aria-busy={busy === c.id} onClick={() => busy === null && check(c.id as ProbeIntegration)}>
                    {C.test}
                  </Button>
                ) : (
                  <Button icon="r2Refresh" aria-disabled="true" title={C.noCheck} className={s.inert}>
                    {C.test}
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function Component() {
  return (
    <InfraFrame screen="integrations" lines={8} head={<PageHead title={C.title} description={C.description} />} read={(a) => a.integrations()}>
      {(list, { api, me }) => <Cards list={list} api={api} canProbe={consoleCan(me.role, 'integrations.probe')} />}
    </InfraFrame>
  );
}

export default Component;
