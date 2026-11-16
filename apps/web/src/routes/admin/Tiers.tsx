import { useCallback, useMemo } from 'react';
import clsx from 'clsx';

import { Icon } from '../../components/Icon';
import { Button } from '../../components/r2/Button';
import { Box, Card } from '../../components/r2/Card';
import { Empty } from '../../components/r2/Empty';
import type { MenuEntry } from '../../components/r2/Menu';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { PageHead, Pill, k } from '../../components/r2/kit';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useMutate } from '../../data/hooks';
import { useViewportWidth } from '../../shell/hooks';
import { tiersR2VM } from './Tiers.vm';
import type { AccessR2Row, RequestAction, RequestR2Row } from './Tiers.vm';
import s from './Tiers.module.css';

// Admin Tiers & Upgrades `/admin/tiers` on the Admin redesign R2 (D-160 R2-3): the signed-off mockup's
// `Tiers` (AdminRedesign.jsx), drawn from `tiersR2VM`. Every write is the same @ai/core mutation as
// before; only the presentation changed.
//
//   - A tier's price: `setTierPrice`, as typed (a price must stay above zero, as before).
//   - Access matrix: an Agent cell includes or gates that AI Employee (`setModuleTier`); Team Tier
//     always includes everything.
//   - Upgrade requests: each request's "…" holds the old actions (`setRequestStatus`): Mark Contacted,
//     Convert to Team, and Decline (the old Close). The mockup's Approve (an email with a checkout link)
//     is drawn and does nothing: it would be a new production send and a Stripe link (Needs Connor's
//     call, D-160 R2-3).

const NOT_YET = 'Not available yet';

export function Component() {
  const db = useDb();
  const mutate = useMutate();
  const { toast } = useToaster();
  const phone = useViewportWidth() < 768;
  const vm = useMemo(() => tiersR2VM(db), [db]);

  // `useMutate` raises the success toast; a refusal is a warning, as before.
  const run = useCallback(
    async (p: Promise<{ error?: string }>) => {
      const r = await p;
      if (r.error) toast(r.error, 'warn');
    },
    [toast],
  );
  const setPrice = useCallback(
    (tierId: string, raw: string) => {
      const price = parseInt(raw.replace(/\D/g, ''), 10);
      if (price > 0) void run(mutate('setTierPrice', { tierId, price }));
    },
    [mutate, run],
  );
  const setStatus = useCallback(
    (id: string, status: RequestAction['status']) => void run(mutate('setRequestStatus', { id, status })),
    [mutate, run],
  );
  const toggle = useCallback((r: AccessR2Row) => void run(mutate('setModuleTier', r.toggle)), [mutate, run]);

  const cols: Column<RequestR2Row>[] = [
    { key: 'name', label: 'From', width: 'minmax(140px,1fr)', value: (r) => r.name, cell: (r) => <span className={k.w5}>{r.name}</span> },
    { key: 'ask', label: 'Request', width: 'minmax(180px,1.4fr)', value: (r) => r.ask },
    { key: 'value', label: 'Value', width: '80px', num: true, value: (r) => r.value },
    { key: 'received', label: 'Received', width: '136px', noSort: true, hideLap: true, value: (r) => r.at, cell: (r) => r.received },
    {
      key: 'status',
      label: 'Status',
      width: '104px',
      value: (r) => r.status.label,
      cell: (r) => <Status tone={r.status.tone}>{r.status.label}</Status>,
    },
  ];

  const menu = (r: RequestR2Row): MenuEntry[] =>
    r.actions.flatMap((a): MenuEntry[] => [
      ...(a.status === 'closed' && r.actions.length > 1 ? (['separator'] as const) : []),
      { label: a.label, danger: a.status === 'closed', onSelect: () => setStatus(r.id, a.status) },
    ]);

  return (
    <Page>
      <PageHead title="Tiers & Upgrades" description={vm.summary} />

      {vm.cards.length ? (
        <div className={k.g3}>
          {vm.cards.map((t) => (
            <section key={t.key} className={clsx(k.cd, k.col, s.card)}>
              <div className={clsx(k.row, k.nw)}>
                <h2 className={k.h2}>{t.title}</h2>
                <Pill>{t.seats}</Pill>
                <span className={k.sp} />
                <span className={k.me}>{t.count}</span>
              </div>
              <div className={clsx(k.row, k.nw, s.priceRow)}>
                <span className={clsx(k.row, k.nw, s.price)}>
                  <span className={k.mu}>$</span>
                  <input
                    className={clsx(k.tn, s.priceIn)}
                    inputMode="numeric"
                    aria-label={`${t.title} ${t.seats} price`}
                    value={String(t.price)}
                    onChange={(e) => setPrice(t.id, e.target.value)}
                  />
                </span>
                <span className={k.me}>{t.per}</span>
              </div>
              <p className={clsx(k.p, k.s2)}>{t.blurb}</p>
              <div className={clsx(k.col, s.features)}>
                {t.features.map((f) => (
                  <span key={f} className={clsx(k.row, k.nw, s.feature)}>
                    <span className={s.tick}>
                      <Icon name="r2Check" size={16} strokeWidth={1.75} />
                    </span>
                    <span>{f}</span>
                  </span>
                ))}
              </div>
              <div className={clsx(k.row, k.nw, s.revenue)}>
                <span className={k.mu}>Cohort revenue</span>
                <span className={k.sp} />
                <span className={clsx(k.w6, k.tn)}>{t.revenue}</span>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Box>
          <Empty icon="r2Tiers" title="No tier prices yet" body="Tier prices are set in Stripe." />
        </Box>
      )}

      <Table
        title="Upgrade requests"
        label="Upgrade requests"
        cols={cols}
        rows={vm.requests}
        rowKey={(r) => r.id}
        actionsWidth="124px"
        primary={(r) =>
          r.open ? (
            <Button aria-disabled="true" title={NOT_YET}>
              Approve
            </Button>
          ) : null
        }
        menu={menu}
        empty={{ icon: 'r2Tiers', title: 'No upgrade requests' }}
      />

      <Card
        title="Access matrix"
        sub="Click an Agent cell to include or gate a module. Team Tier always includes everything."
        pad={false}
      >
        <div role="table" aria-label="Access matrix">
          {phone ? null : (
            <div className={clsx(k.th, s.grid)} role="row">
              <span role="columnheader">Included</span>
              <span role="columnheader" className={s.center}>
                Agent
              </span>
              <span role="columnheader" className={s.center}>
                Team
              </span>
            </div>
          )}
          {vm.matrix.map((m) => (
            <div key={m.id} className={clsx(k.tr, s.grid, s.mrow)} role="row">
              <span role="cell" className={k.el}>
                {m.name}
              </span>
              <span role="cell" className={s.center}>
                <button
                  type="button"
                  className={clsx(s.mx, !m.agent && s.gated)}
                  aria-label={`${m.name}, Agent Tier: ${m.agent ? 'included' : 'gated'}`}
                  title={m.agent ? 'Gate to Team only' : 'Include in Agent Tier'}
                  onClick={() => toggle(m)}
                >
                  <Icon name={m.agent ? 'r2Check' : 'r2Lock'} size={14} strokeWidth={1.75} />
                </button>
              </span>
              <span role="cell" className={s.center}>
                <button type="button" className={s.mx} disabled aria-label={`${m.name}, Team Tier: included`}>
                  <Icon name="r2Check" size={14} strokeWidth={1.75} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}

export default Component;
