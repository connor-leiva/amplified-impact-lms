import { useMemo } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Empty } from '../../components/r2/Empty';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { KV, Locked, PageHead, k } from '../../components/r2/kit';
import { ADMIN_COHORT } from '../../data/admin-shell';
import { useDb, useNow } from '../../data/hooks';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsolePages } from './useConsoleData';
import { BUILD_COPY as C, buildHubVM, skillVM } from './build.vm';
import type { SkillVM } from './build.vm';
import s from './BuildHub.module.css';

// /admin/build (D-169, spec § 7.2): the Build hub. NO MOCKUP FRAME: built from R2's parts only (the
// page head, Card and its list rows, KV, Status, the lock, Table), so it has no parity cell; its review
// images are under docs/pr-review/. The five builder screens (each row its link), the cohort (its seat
// cap locked, D-154), and the skill library from `GET /api/console/skills`, read-only: no row opens,
// no row has a menu. Reached from the ⌘K palette and from the "Build" crumb on every Build screen.

const MIN = 60_000;

export function Component() {
  const gate = useConsoleGate('build');
  const db = useDb();
  const now = useNow(MIN);
  const vm = useMemo(() => buildHubVM(db, now, ADMIN_COHORT), [db, now]);
  const api = gate.kind === 'ready' ? gate.api : null;
  const skills = useConsolePages(api, (a, cursor) => a.skills(cursor), 'skills');

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;

  const cols: Column<SkillVM>[] = [
    { key: 'title', label: C.columns.skill, width: 'minmax(200px,2fr)', value: (r) => r.title, cell: (r) => <span className={k.w5}>{r.title}</span> },
    { key: 'set', label: C.columns.set, width: '104px', value: (r) => r.set },
    { key: 'access', label: C.columns.access, width: '80px', value: (r) => r.access },
    { key: 'status', label: C.columns.status, width: '112px', value: (r) => r.status.label, cell: (r) => <Status tone={r.status.tone}>{r.status.label}</Status> },
    { key: 'released', label: C.columns.released, width: '120px', value: (r) => r.released },
  ];

  return (
    <Page>
      <PageHead title={C.title} description={C.description} />
      <div className={k.gms}>
        <div className={k.col}>
          <Card title={C.screens} pad={false}>
            {vm.links.map((l) => (
              <div key={l.key} className={k.li}>
                <span className={s.icon} aria-hidden="true">
                  <Icon name={l.icon} size={16} strokeWidth={1.75} />
                </span>
                <div className={clsx(k.col, k.col0, s.what)}>
                  <Link to={l.to} className={clsx(k.lk, k.w5)}>
                    {l.label}
                  </Link>
                  <span className={k.me}>{l.description}</span>
                </div>
                {l.meta ? <span className={clsx(k.me, s.meta)}>{l.meta}</span> : null}
              </div>
            ))}
          </Card>
          {gate.kind === 'error' ? (
            <LoadError failure={gate.failure} retry={gate.retry} />
          ) : skills.status === 'error' && skills.failure ? (
            <LoadError failure={skills.failure} retry={skills.retry} />
          ) : (
            <Table
              title={C.skills}
              label={C.skills}
              cols={cols}
              rows={skills.rows.map(skillVM)}
              rowKey={(r) => r.id}
              loading={skills.status === 'loading'}
              empty={{ icon: 'r2File', title: C.skillsEmpty }}
              footer={
                skills.next ? (
                  <div className={k.more}>
                    <Button kind="quiet" onClick={skills.more} disabled={skills.loadingMore}>
                      {C.more}
                    </Button>
                  </div>
                ) : null
              }
            />
          )}
        </div>
        {vm.cohort ? (
          <Card title={vm.cohort.name} right={<Status tone={vm.cohort.status.tone}>{vm.cohort.status.label}</Status>}>
            <KV rows={[...vm.cohort.rows, { label: C.cohort.cap, value: <Locked>{vm.cohort.cap}</Locked> }]} />
          </Card>
        ) : (
          <Card>
            <Empty icon="r2Cohorts" title={C.noCohort} />
          </Card>
        )}
      </div>
    </Page>
  );
}

export default Component;
