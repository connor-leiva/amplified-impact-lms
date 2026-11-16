import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Box, Card } from '../../components/r2/Card';
import { Empty } from '../../components/r2/Empty';
import { Page } from '../../components/r2/Page';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Bar, PageHead, Sel, Skel, Stat, k } from '../../components/r2/kit';
import { clock } from '../../lib/clock';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsoleRecord } from './useConsoleData';
import { DEFAULT_USAGE_FILTERS, PLAN_OPTIONS, RANGE_OPTIONS, USAGE_COPY as C, rangeLabel, usageQueryFor, usageVM } from './usage.vm';
import type { StatVM, UsageRowVM } from './usage.vm';
import s from './Usage.module.css';

// /admin/usage on R2 (D-166, spec § 7.7): the mockup's `Usage`. The filters (workspace, plan, range),
// six tiles, sign-ins per day and the By-workspace table, all counted by the API and none estimated: a
// figure with no source reads "Unavailable", and before anything is counted the tiles and chart say
// when counting starts. The workspace options are the running workspaces the API names.

export const StatTile = ({ stat }: { stat: StatVM }) => <Stat label={stat.label} value={stat.value} sub={stat.sub} />;

export function Component() {
  const gate = useConsoleGate('usage');
  const [filters, setFilters] = useState(DEFAULT_USAGE_FILTERS);
  const api = gate.kind === 'ready' ? gate.api : null;
  const query = useMemo(() => usageQueryFor(filters, clock.now()), [filters]);
  const rec = useConsoleRecord(api, (a) => a.usage(query), JSON.stringify(query));
  const vm = useMemo(() => (rec.data ? usageVM(rec.data) : null), [rec.data]);
  // The workspace options stay while a new range or filter loads.
  const [options, setOptions] = useState<{ value: string; label: string }[]>([{ value: '', label: C.allWorkspaces }]);
  useEffect(() => {
    if (vm) setOptions(vm.workspaces);
  }, [vm]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;

  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch }));
  const cols: Column<UsageRowVM>[] = [
    { key: 'n', label: C.columns.name, width: 'minmax(180px,1.5fr)', value: (w) => w.name, cell: (w) => <span className={k.w5}>{w.name}</span> },
    { key: 'plan', label: C.columns.plan, width: 'minmax(150px,1fr)', hideLap: true, value: (w) => w.plan },
    { key: 'si', label: C.columns.signIns, num: true, width: '88px', value: (w) => w.signInsN, cell: (w) => w.signIns },
    { key: 'lp', label: C.columns.lessonPlays, num: true, width: '104px', value: (w) => w.lessonPlaysN, cell: (w) => w.lessonPlays },
    {
      key: 'seat',
      label: C.columns.seats,
      width: '160px',
      value: (w) => w.seats.pct,
      cell: (w) => (
        <span className={clsx(k.row, k.nw)} style={{ gap: 10 }}>
          <Bar pct={w.seats.pct} kind={w.seats.bar} />
          <span className={clsx(k.tn, s.seatPct)}>{w.seatPct}</span>
        </span>
      ),
    },
  ];
  const failure = gate.kind === 'error' ? { failure: gate.failure, retry: gate.retry } : rec.status === 'error' && rec.failure ? { failure: rec.failure, retry: rec.retry } : null;

  return (
    <Page>
      <PageHead title={C.title} description={C.description} />
      <div className={k.row}>
        <Sel aria-label={C.workspace} value={filters.teamId} onChange={(e) => set({ teamId: e.target.value })}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Sel>
        <Sel aria-label={C.plan} value={filters.plan} onChange={(e) => set({ plan: e.target.value })}>
          {PLAN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Sel>
        <Sel aria-label={C.range} value={filters.days} onChange={(e) => set({ days: e.target.value })}>
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Sel>
      </div>
      {failure ? (
        <LoadError failure={failure.failure} retry={failure.retry} />
      ) : !vm ? (
        <Skel lines={8} />
      ) : vm.state.kind !== 'data' ? (
        <Box>
          <Empty icon="r2Usage" title={vm.state.title} />
        </Box>
      ) : (
        <>
          <div className={s.st2}>
            {vm.stats.map((st) => (
              <StatTile key={st.key} stat={st} />
            ))}
          </div>
          <Card title={C.chart} sub={rangeLabel(filters)}>
            <div className={s.chart} role="img" aria-label={vm.chartLabel}>
              {vm.bars.map((b) => (
                <i key={b.key} className={clsx(b.low && s.low)} style={{ height: `${b.pct}%` }} />
              ))}
            </div>
            <div className={clsx(k.row, k.nw, k.me, k.mo, s.axis)}>
              <span>{vm.first}</span>
              <span className={k.sp} />
              <span>{vm.last}</span>
            </div>
          </Card>
        </>
      )}
      {vm && !failure ? (
        <Table title={C.byWorkspace} label={C.byWorkspace} cols={cols} rows={vm.rows} rowKey={(w) => w.key} empty={{ icon: 'r2Usage', title: C.empty }} />
      ) : null}
    </Page>
  );
}

export default Component;
