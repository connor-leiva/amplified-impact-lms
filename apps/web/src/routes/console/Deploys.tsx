// /admin/deploys on R2 (D-168, spec § 7.11): the mockup's `Deploys`. The live commit is the running
// build's `RAILWAY_GIT_COMMIT_SHA`; the list is Railway's deployments or GitHub's commits on main, only
// when Connor has added a read-only token (presence-checked on the server, never sent here), and
// otherwise says "Not configured". Read-only. Owner and Admin (`ops.read`).

import clsx from 'clsx';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Facts, PageHead, Two, k } from '../../components/r2/kit';
import { DEPLOYS_COPY as C, deploysVM } from './ops.vm';
import type { DeployRowVM } from './ops.vm';
import { OpsFrame } from './OpsFrame';
import s from './Ops.module.css';

const cols: Column<DeployRowVM>[] = [
  {
    key: 'm',
    label: C.columns.commit,
    width: 'minmax(260px,2.4fr)',
    value: (d) => d.message,
    cell: (d) => (
      <div className={clsx(k.row, k.nw, s.dotRow)}>
        <Status tone={d.deploy.tone} />
        <Two a={d.message} b={d.line} mono />
      </div>
    ),
  },
  {
    key: 'st',
    label: C.columns.deploy,
    width: '112px',
    value: (d) => d.deploy.label,
    cell: (d) => <span className={d.deploy.tone === 'bad' ? clsx(k.w5, s.bad) : undefined}>{d.deploy.label}</span>,
  },
  { key: 'dur', label: C.columns.build, width: '72px', num: true, noSort: true, value: (d) => d.buildMs, cell: (d) => d.build },
  { key: 'a', label: C.columns.author, width: '128px', hideLap: true, value: (d) => d.author },
  { key: 't', label: C.columns.time, width: '136px', noSort: true, value: (d) => d.at, cell: (d) => d.time },
];

export function Component() {
  return (
    <OpsFrame screen="deploys" lines={3} head={<PageHead title={C.title} description={C.description} />} read={(a) => a.deploys()}>
      {(d) => {
        const vm = deploysVM(d);
        return (
          <>
            <Facts
              items={[
                { label: C.facts.repository, value: <span className={k.mo}>{vm.facts.repository}</span> },
                { label: C.facts.branch, value: <span className={k.mo}>{vm.facts.branch}</span> },
                { label: C.facts.service, value: <span className={k.mo}>{vm.facts.service}</span> },
                { label: C.facts.environment, value: vm.facts.environment },
                {
                  label: C.facts.live,
                  value: vm.facts.live ? (
                    <span className={clsx(k.row, k.nw, s.liveRow)}>
                      <span className={k.mo}>{vm.facts.live}</span>
                      <Status tone="ok">Live</Status>
                    </span>
                  ) : (
                    C.unknownCommit
                  ),
                },
              ]}
            />
            <Table label={C.label} cols={cols} rows={vm.rows} rowKey={(r) => r.key} empty={{ icon: 'r2Deploys', ...vm.empty }} />
          </>
        );
      }}
    </OpsFrame>
  );
}

export default Component;
