import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import { Icon } from '../../components/Icon';
import { Button } from '../../components/r2/Button';
import { Drawer } from '../../components/r2/Drawer';
import { Empty } from '../../components/r2/Empty';
import type { MenuEntry } from '../../components/r2/Menu';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Avatar, Bar, Find, KV, PageHead, Pill, Stamp, Tabs, Two, k } from '../../components/r2/kit';
import { useToaster } from '../../components/primitives/Toaster';
import { refusal, useDb, useEmailLearner, useMutate, useNow } from '../../data/hooks';
import { useViewportWidth } from '../../shell/hooks';
import { useMasqueradeEntry } from '../console/useMasqueradeEntry';
import { downloadCsv } from '../console/download';
import { LEARNERS_UI, learnerR2Details, learnersVM } from './Learners.vm';
import { COHORT_PEOPLE_COPY as C, cohortPeopleVM } from './cohort/people.vm';
import type { CohortLearnerRowVM, CohortTeamRowVM } from './cohort/people.vm';
import { useCohortFacts } from './cohort/useCohortFacts';
import { cohortPath } from './cohort/cohort.vm';
import s from './Learners.module.css';
import { personPath, teamPath } from '../../shell/admin/addresses';

// R-5 Phase 7 (D-268): Cohort › People (`/admin/cohort/:cohortId/people`), the mockup's `CohortPeople`
// (handoff/admin-mockup/p3-cohort.jsx). It replaces Learners & Teams; its drawer and its export stay.
//
//   - Teams (first) and Learners, the cohort's roster by the one rule (D-267): each team's people signed in of its seats,
//     Paid and Intake (the cohort facts' `teamRows`), its progress on the week the cohort is on (the run's) and when it
//     was last active; each learner's team, seat, progress and last active. Every time prints MT / CT.
//   - A team opens the team; a learner opens the person. A learner's menu still opens their details (the drawer:
//     Upgrade to Team Tier / Move to Agent Tier, `setLearnerTier`, and Send Nudge / Resend Invite, a real email, D-247).
//     "Masquerade…" opens the reason dialog (D-162 3b): Owner and Admin only.
//   - Export downloads the roster as CSV (the old screen's export, which stays).

type PeopleTab = 'teams' | 'learners';

function Week({ done, total }: { done: number; total: number }) {
  return (
    <span className={clsx(k.row, k.nw, s.builds)}>
      <Bar pct={total ? (done / total) * 100 : 0} pct2={0} />
      <span className={clsx(k.tn, s.of)}>{C.of(done, total)}</span>
    </span>
  );
}

function Learners() {
  const db = useDb();
  const now = useNow();
  const mutate = useMutate();
  const emailLearner = useEmailLearner();
  const { toast } = useToaster();
  const phone = useViewportWidth() < 768;
  const navigate = useNavigate();
  const entry = useMasqueradeEntry();
  const { cohortId = '' } = useParams();
  const [search] = useSearchParams();
  const facts = useCohortFacts(cohortId);

  const [tab, setTab] = useState<PeopleTab>(search.get('tab') === 'learners' ? 'learners' : 'teams');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);

  const vm = useMemo(() => cohortPeopleVM(db, cohortId, now, facts, q), [db, cohortId, now, facts, q]);
  const person = useMemo(() => learnersVM(db, now, { ...LEARNERS_UI, sel }).drawer.person, [db, now, sel]);
  const details = person ? learnerR2Details(db, person) : null;

  const changeTier = useCallback(async () => {
    if (!person) return;
    const e = refusal(await mutate('setLearnerTier', { userId: person.id, tier: person.tierTarget }));
    if (e) toast(e, 'warn');
  }, [mutate, person, toast]);

  // D-247 (H-9): Send Nudge and Resend Invite send a real email; the toast is the server's.
  const [sending, setSending] = useState(false);
  const nudge = useCallback(
    async (userId: string, invited: boolean) => {
      setSending(true);
      try {
        const e = refusal(await emailLearner(invited ? 'invite' : 'nudge', userId));
        if (e) toast(e, 'warn');
      } finally {
        setSending(false);
      }
    },
    [emailLearner, toast],
  );

  const weekLabel = vm.week?.label ?? 'Week';
  const teamCols: Column<CohortTeamRowVM>[] = [
    { key: 'name', label: C.columns.team, width: 'minmax(200px,1.5fr)', value: (t) => t.name, cell: (t) => <Two a={t.name} b={t.owner} /> },
    { key: 'people', label: C.columns.people, width: '120px', value: (t) => t.people, cell: (t) => <span className={k.tn}>{t.people}</span> },
    {
      key: 'pay',
      label: C.columns.paid,
      width: '140px',
      hideLap: true,
      value: (t) => t.pay?.label ?? '',
      cell: (t) =>
        !t.pay ? <span className={k.mu}>{C.none}</span> : t.pay.pill ? <Pill tone="info">{t.pay.label}</Pill> : <Status tone="ok">{t.pay.label}</Status>,
    },
    {
      key: 'intake',
      label: C.columns.intake,
      width: '120px',
      value: (t) => t.intake.label,
      cell: (t) => <Status tone={t.intake.tone}>{t.intake.label}</Status>,
    },
    // The week the cohort is on (its run's); a cohort whose run holds no week (a draft with none, the R2 reference's December) has no column.
    ...(vm.week ? [{ key: 'week', label: weekLabel, width: '150px', value: (t: CohortTeamRowVM) => t.done, cell: (t: CohortTeamRowVM) => <Week done={t.done} total={t.total} /> }] : []),
    { key: 'last', label: C.columns.last, width: '150px', noSort: true, hideLap: true, value: (t) => t.lastAt, cell: (t) => <Stamp v={t.last} two /> },
  ];

  const learnerCols: Column<CohortLearnerRowVM>[] = [
    { key: 'name', label: C.columns.learner, width: 'minmax(210px,1.5fr)', value: (u) => u.name, cell: (u) => <Two a={u.name} b={u.email} /> },
    { key: 'team', label: C.columns.team, width: 'minmax(160px,1fr)', value: (u) => u.team },
    { key: 'seat', label: C.columns.seat, width: '190px', hideLap: true, value: (u) => u.seat },
    ...(vm.week ? [{ key: 'week', label: weekLabel, width: '150px', value: (u: CohortLearnerRowVM) => u.done, cell: (u: CohortLearnerRowVM) => <Week done={u.done} total={u.total} /> }] : []),
    {
      key: 'last',
      label: C.columns.last,
      width: '150px',
      noSort: true,
      value: (u) => u.lastAt,
      cell: (u) => (u.invited ? <Pill tone="warn">{u.last}</Pill> : <Stamp v={u.last} two />),
    },
  ];

  const learnerMenu = (u: CohortLearnerRowVM): MenuEntry[] => [
    { label: C.menu.person, onSelect: () => navigate(personPath(u.id)) },
    { label: C.menu.details, onSelect: () => setSel(u.id) },
    ...entry.item('Masquerade…', { id: u.id, name: u.name, workspace: u.team }),
  ];
  const teamMenu = (t: CohortTeamRowVM): MenuEntry[] => [
    { label: C.menu.open, onSelect: () => navigate(teamPath(t.id)) },
    { label: C.menu.intake, onSelect: () => navigate(`${cohortPath(cohortId, 'submissions')}?view=teams`) },
    { label: C.menu.turnedIn, onSelect: () => navigate(`${cohortPath(cohortId, 'submissions')}?view=files`) },
  ];

  const none = vm.teamsCount === 0 && vm.learnersCount === 0 && !q;

  return (
    <Page>
      <PageHead title="People" />
      {/* the mockup's `CohortPeople` is a `.col` (16px between its rows), not a page's 20px */}
      <div className={k.col}>
      {none ? (
        <div className={k.cd}>
          <Empty icon="r2Learners" title={C.empty.title} body={vm.enrolling ? C.empty.open : C.empty.closed} />
        </div>
      ) : (
        <>
          <div className={k.row}>
            <Tabs
              label={C.section}
              phone={phone}
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'teams', label: C.teams, count: vm.cap ? `${vm.teamsCount} of ${vm.cap}` : vm.teamsCount },
                { id: 'learners', label: C.learners, count: vm.learnersCount },
              ]}
            />
            <Find value={q} onChange={setQ} placeholder={tab === 'teams' ? C.findTeam : C.findPerson} />
            <span className={k.sp} />
            <Button
              icon="download"
              onClick={() => {
                downloadCsv(vm.csv.text, vm.csv.name);
                toast(C.exported);
              }}
            >
              {C.export}
            </Button>
          </div>
          {tab === 'teams' ? (
            <Table
              label={C.teams}
              cols={teamCols}
              rows={vm.teams}
              rowKey={(t) => t.id}
              onRow={(t) => navigate(teamPath(t.id))}
              menu={teamMenu}
              filtered={q !== ''}
              empty={{ icon: 'r2Workspaces', title: C.empty.title }}
            />
          ) : (
            <>
              <Table
                label={C.learners}
                cols={learnerCols}
                rows={vm.learners}
                rowKey={(u) => u.id}
                onRow={(u) => navigate(personPath(u.id))}
                menu={learnerMenu}
                filtered={q !== ''}
                empty={{ icon: 'r2Learners', title: C.empty.title }}
              />
              <p className={clsx(k.p, k.me)}>{C.showing(vm.learners.length, vm.learnersCount)}</p>
            </>
          )}
          <p className={clsx(k.p, k.me)}>{C.roster}</p>
        </>
      )}
      </div>

      {person && details ? (
        <Drawer
          title={person.name}
          description={person.email}
          leading={<Avatar initials={person.name.slice(0, 2)} />}
          onClose={() => setSel(null)}
          foot={
            <>
              <Button kind={person.tierUpgrade ? 'primary' : 'secondary'} onClick={() => void changeTier()}>
                {person.tierLabel}
              </Button>
              <Button disabled={sending} aria-busy={sending || undefined} onClick={() => void nudge(person.id, person.invited)}>
                {person.nudgeLabel}
              </Button>
            </>
          }
        >
          <KV rows={details.facts} />
          <div className={clsx(k.col, k.colM)}>
            <h3 className={s.h3}>Build Progress</h3>
            <div className={s.mods}>
              {details.mods.map((m) => (
                <div key={m.id} className={clsx(k.li, s.mod)}>
                  <span className={clsx(s.modName, !m.access && k.mu)}>{m.name}</span>
                  {m.access ? (
                    <Status tone={m.buildTone}>{m.build}</Status>
                  ) : (
                    <span className={clsx(k.row, k.nw, k.mu, s.locked)}>
                      <Icon name="r2Lock" size={14} strokeWidth={1.75} />
                      {m.build}
                    </span>
                  )}
                  {m.runtime ? <Pill tone={m.runtime === 'Deployed' ? 'ok' : m.runtime === 'Paused' ? 'warn' : 'bad'}>{m.runtime}</Pill> : null}
                </div>
              ))}
            </div>
          </div>
        </Drawer>
      ) : null}
      {entry.dialog}
    </Page>
  );
}

export function Component() {
  return <Learners />;
}

export default Component;
