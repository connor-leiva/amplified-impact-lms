import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { csv as toCsv, rosterTeams } from '@ai/core';
import type { AIEmployee, CohortIntakeRow } from '@ai/core';
import { Button } from '../../../components/r2/Button';
import { Card } from '../../../components/r2/Card';
import { Empty } from '../../../components/r2/Empty';
import { Page } from '../../../components/r2/Page';
import { Status } from '../../../components/r2/Status';
import { Table } from '../../../components/r2/Table';
import type { Column } from '../../../components/r2/Table';
import { Bar, PageHead, Pill, Sel, Tabs, Two, k } from '../../../components/r2/kit';
import { useToaster } from '../../../components/primitives/Toaster';
import { useAct, useDb } from '../../../data/hooks';
import { teamPath } from '../../../shell/admin/addresses';
import { useViewportWidth } from '../../../shell/hooks';
import { downloadCsv } from '../../console/download';
import { SeatCardsCard } from '../SeatCardsCard';
import { SubmissionsCard } from '../SubmissionsCard';
import type { WeekDraft } from '../WeekBuilder.vm';
import { weekTitle } from '../program/program.vm';
import { LinkFacts } from './parts';
import { SUBS_COPY as C, answerText, asksVM, formOf, intakeVM, isSubsView, weeksOf } from './submissions.vm';
import type { AskVM, IntakeVM, SubRow, SubsView } from './submissions.vm';
import s from './Cohort.module.css';

// R-5 Phase 7 (D-268): Cohort › Submissions (`/admin/cohort/:cohortId/submissions`), the mockup's `CohortSubs`: four views,
// "Intake, added up", "Intake, team by team", "Turned in, by step" and "Turned in, every file" (`?view=`). The intake is
// every roster team's (`GET /api/admin/cohorts/:id/intake`, read once and audited); what teams turned in is the
// `ADMIN_SUBMISSIONS_PATH` route's, a week at a time. "Every file" is D-265's page: `SubmissionsCard` and `SeatCardsCard`
// unchanged, one of the cohort's weeks at a time (`?week=`), where a turn-in's staff-only status is set and its
// files-deleted line keeps D-237's rule.

const FIXTURE = import.meta.env.VITE_DATA_SOURCE === 'fixture';
const noop = () => {};

type Intake = { kind: 'loading' } | { kind: 'ready'; rows: CohortIntakeRow[] } | { kind: 'failed' };

export function Component() {
  const { cohortId = '' } = useParams();
  const db = useDb();
  const act = useAct();
  const navigate = useNavigate();
  const { toast } = useToaster();
  const phone = useViewportWidth() < 768;
  const [search, setSearch] = useSearchParams();
  const view: SubsView = isSubsView(search.get('view')) ? (search.get('view') as SubsView) : 'intake';
  const co = db.cohorts.find((c) => c.id === cohortId) ?? null;
  const teams = useMemo(() => rosterTeams(db, cohortId), [db, cohortId]);
  const weeks = useMemo(() => (co ? weeksOf(db, co.id) : []), [db, co]);
  const form = useMemo(() => formOf(db), [db]);
  const [intake, setIntake] = useState<Intake>({ kind: 'loading' });
  const [subs, setSubs] = useState<Record<string, SubRow[]>>({});
  const [status, setStatus] = useState('');
  const [question, setQuestion] = useState('');

  // The intake, once: every roster team's. The fixture has no server: its teams, none started.
  useEffect(() => {
    if (FIXTURE) {
      setIntake({ kind: 'ready', rows: teams.map((t) => ({ teamId: t.id, name: t.name, owner: db.users.find((u) => u.id === t.ownerId)?.name ?? '', status: 'not_started', updatedAt: null, submittedAt: null, ghl: 'none', answers: {} })) });
      return;
    }
    let alive = true;
    fetch(`/api/admin/cohorts/${encodeURIComponent(cohortId)}/intake`, { credentials: 'include', headers: { accept: 'application/json' } })
      .then((res) => (res.ok ? (res.json() as Promise<{ teams: CohortIntakeRow[] }>) : null))
      .then(
        (r) => alive && setIntake(r ? { kind: 'ready', rows: r.teams } : { kind: 'failed' }),
        () => alive && setIntake({ kind: 'failed' }),
      );
    return () => {
      alive = false;
    };
  }, [cohortId, teams, db.users]);

  // What teams turned in, each week of the run that asks for a file.
  const asked = useMemo(() => weeks.filter((w) => asksVMOf(w.module).length > 0).map((w) => w.module.id), [weeks]);
  useEffect(() => {
    if (FIXTURE || !asked.length) return;
    let alive = true;
    void Promise.all(
      asked.map((id) =>
        fetch(`/api/admin/submissions?moduleId=${encodeURIComponent(id)}`, { credentials: 'include', headers: { accept: 'application/json' } })
          .then((res) => (res.ok ? (res.json() as Promise<{ subs?: SubRow[] }>) : { subs: [] }))
          .then((r) => [id, r.subs ?? []] as const, () => [id, [] as SubRow[]] as const),
      ),
    ).then((pairs) => alive && setSubs(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, [asked]);

  const vm: IntakeVM | null = intake.kind === 'ready' ? intakeVM(form, intake.rows) : null;
  const asks = useMemo(() => (co ? asksVM(db, co.id, teams.map((t) => t.name), subs) : []), [db, co, teams, subs]);
  const turnedIn = Object.values(subs).reduce((a, x) => a + x.length, 0);
  if (!co) return null;

  const go = (v: SubsView, extra: Record<string, string> = {}) => setSearch({ view: v, ...extra }, { replace: true });
  const pick = weeks.find((w) => w.module.id === search.get('week')) ?? weeks[0] ?? null;
  const draft = pick ? (pick.module as AIEmployee as WeekDraft) : null;
  const q = form.questions.find((x) => x.id === question) ?? form.questions[0] ?? null;

  const exportCsv = () => {
    if (!vm) return;
    downloadCsv(
      toCsv([
        ['Team', 'Owner', 'Status', ...form.questions.map((x) => x.label)],
        ...vm.rows.map((r) => [r.name, r.owner, r.statusLabel, ...form.questions.map((x) => answerText(r.answers[x.id]))]),
      ]),
      `intake-${co.id}.csv`,
    );
    toast(C.exported);
  };

  const teamCols: Column<IntakeVM['rows'][number]>[] = [
    { key: 'n', label: C.columns.team, width: 'minmax(170px,1.2fr)', value: (r) => r.name, cell: (r) => <Two a={r.name} b={r.owner} /> },
    {
      key: 'st',
      label: C.columns.status,
      width: '200px',
      value: (r) => r.statusLabel,
      cell: (r) => (
        <div className={clsx(k.col, s.stw)}>
          <Pill tone={r.tone}>{r.statusLabel}</Pill>
          {r.when ? <span className={k.me}>{r.when}</span> : null}
        </div>
      ),
    },
    {
      key: 'done',
      label: C.columns.answered,
      width: '136px',
      value: (r) => r.answered,
      cell: (r) => (
        <span className={clsx(k.row, k.nw, s.barc)}>
          <Bar pct={vm && vm.questions ? (r.answered / vm.questions) * 100 : 0} pct2={0} />
          <span className={clsx(k.tn, s.barn)}>{C.of(r.answered, vm?.questions ?? 0)}</span>
        </span>
      ),
    },
    {
      key: 'ghl',
      label: C.columns.ghl,
      width: '104px',
      value: (r) => r.ghl?.label ?? '',
      cell: (r) => (r.ghl ? <Status tone={r.ghl.tone}>{r.ghl.label}</Status> : <span className={k.mu}>{C.none}</span>),
    },
  ];

  const askCols: Column<AskVM>[] = [
    { key: 'a', label: C.columns.ask, width: 'minmax(190px,1.3fr)', value: (a) => a.label, cell: (a) => <Two a={a.label} b={a.where} /> },
    {
      key: 'teams',
      label: C.columns.teamsIn,
      width: '190px',
      value: (a) => a.teamsIn,
      cell: (a) => (
        <span className={clsx(k.row, k.nw, s.barc)}>
          <Bar pct={teams.length ? (a.teamsIn / teams.length) * 100 : 0} pct2={0} />
          <span className={clsx(k.tn, s.barn)}>{C.of(a.teamsIn, teams.length)}</span>
        </span>
      ),
    },
    { key: 'r', label: C.columns.notLooked, width: '112px', value: (a) => a.received, cell: (a) => <span className={k.tn}>{a.received}</span> },
    { key: 'p', label: C.columns.picked, width: '80px', value: (a) => a.picked, cell: (a) => <span className={k.tn}>{a.picked}</span> },
    { key: 'v', label: C.columns.reviewed, width: '88px', value: (a) => a.reviewed, cell: (a) => <span className={k.tn}>{a.reviewed}</span> },
    { key: 'not', label: C.columns.notYet, width: 'minmax(220px,1.6fr)', noSort: true, hideLap: true, value: (a) => a.notYet, cell: (a) => <span className={clsx(k.me, k.el)}>{a.notYet}</span> },
  ];

  const tabs = [
    { id: 'intake' as const, label: C.views.intake },
    { id: 'teams' as const, label: C.views.teams, ...(vm ? { count: C.of(vm.submitted, vm.teams) } : {}) },
    { id: 'asks' as const, label: C.views.asks },
    { id: 'files' as const, label: C.views.files, ...(FIXTURE ? {} : { count: turnedIn }) },
  ];

  return (
    <Page>
      <PageHead title="Submissions" />
      {!teams.length ? (
        <div className={k.cd}>
          <Empty icon="r2File" title={C.quiet} />
        </div>
      ) : (
        <>
          <div className={k.row}>
            <Tabs label={C.section} phone={phone} value={view} onChange={(v) => go(v)} tabs={tabs} />
            <span className={k.sp} />
            <Button icon="download" disabled={!vm} onClick={exportCsv}>
              {C.export}
            </Button>
          </div>
          {view === 'intake' && vm ? (
            <>
              <LinkFacts
                items={[
                  { label: C.facts.form, value: C.form(vm.questions), to: form.to },
                  { label: C.facts.submitted, value: C.ofTeams(vm.submitted, vm.teams), onClick: () => go('teams', { status: 'submitted' }) },
                  { label: C.facts.draft, value: String(vm.draft), onClick: () => go('teams', { status: 'draft' }) },
                  { label: C.facts.notStarted, value: String(vm.notStarted), onClick: () => go('teams', { status: 'not_started' }) },
                  { label: C.facts.ghl, value: C.ghl(vm.synced, vm.failed), onClick: () => go('teams') },
                ]}
              />
              {vm.tallies.length ? (
                <div className={k.g3}>
                  {vm.tallies.map((t) => (
                    <Card key={t.id} title={t.title}>
                      <div className={clsx(k.col, k.colM)}>
                        {t.rows.map((r) => (
                          <div key={r.label} className={s.ty}>
                            <span className={k.el}>{r.label}</span>
                            <Bar pct={t.total ? (r.n / t.total) * 100 : 0} pct2={0} />
                            <span className={k.tn}>{r.n}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : null}
              {q ? (
                <Card title={C.read} sub={C.readSub}>
                  <div className={clsx(k.col, k.colM)}>
                    <Sel aria-label={C.question} value={q.id} onChange={(e) => setQuestion(e.target.value)}>
                      {form.questions.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </Sel>
                    <span className={k.me}>
                      {q.section}
                      {q.required ? ` · ${C.required}` : ''} · {C.answered(vm.rows.filter((r) => answerText(r.answers[q.id]).trim()).length, vm.teams)}
                    </span>
                    {vm.rows.map((r) => (
                      <div key={r.id} className={s.qa}>
                        <div className={k.col}>
                          <button type="button" className={clsx(k.lk, k.w5)} onClick={() => navigate(teamPath(r.id))}>
                            {r.name}
                          </button>
                          <span className={k.me}>{r.owner}</span>
                        </div>
                        <div>{answerText(r.answers[q.id]).trim() ? <p className={k.p}>{answerText(r.answers[q.id])}</p> : <span className={k.mu}>{r.status === 'not_started' ? C.statusLabel.not_started : C.notAnswered}</span>}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </>
          ) : null}
          {view === 'teams' && vm ? (
            <>
              <div className={k.row}>
                <Sel aria-label={C.status} value={search.get('status') ?? status} onChange={(e) => (setStatus(e.target.value), go('teams', e.target.value ? { status: e.target.value } : {}))}>
                  <option value="">{C.allStatuses}</option>
                  <option value="submitted">{C.statusLabel.submitted}</option>
                  <option value="draft">{C.statusLabel.draft}</option>
                  <option value="not_started">{C.statusLabel.not_started}</option>
                </Sel>
              </div>
              <Table
                label={C.views.teams}
                cols={teamCols}
                rows={vm.rows.filter((r) => !(search.get('status') ?? status) || r.status === (search.get('status') ?? status))}
                rowKey={(r) => r.id}
                onRow={(r) => navigate(teamPath(r.id))}
                menu={(r) => [{ label: C.open, onSelect: () => navigate(teamPath(r.id)) }]}
                empty={{ icon: 'r2File', title: C.noTeam, body: C.noTeamBody }}
              />
            </>
          ) : null}
          {(view === 'intake' || view === 'teams') && intake.kind === 'failed' ? <p className={clsx(k.p, k.mu)}>{C.quiet}</p> : null}
          {view === 'asks' ? (
            <>
              <Table title={C.asksTitle} label={C.asksTitle} cols={askCols} rows={asks} rowKey={(a) => a.key} onRow={(a) => go('files', { week: a.moduleId })} empty={{ icon: 'r2File', title: C.noAsks }} />
              <p className={clsx(k.p, k.me)}>{C.onlyStaff}</p>
            </>
          ) : null}
          {view === 'files' ? (
            weeks.length && draft ? (
              <>
                <Sel aria-label={C.week} value={pick?.module.id ?? ''} onChange={(e) => go('files', { week: e.target.value })}>
                  {weeks.map((w) => (
                    <option key={w.module.id} value={w.module.id}>
                      Week {w.n} · {weekTitle(w.module)}
                    </option>
                  ))}
                </Sel>
                <SubmissionsCard db={db} draft={draft} up={noop} act={act} />
                <SeatCardsCard db={db} draft={draft} up={noop} act={act} />
              </>
            ) : (
              <p className={clsx(k.p, k.s2)}>{C.noWeeks}</p>
            )
          ) : null}
        </>
      )}
    </Page>
  );
}

/** The steps of a week that ask for a file (`asksOf`), for which weeks to read. */
function asksVMOf(m: { checklist: AIEmployee['checklist']; course?: { week: number } | null }) {
  return (m.checklist ?? []).some((step) =>
    [...(step.paths?.claude?.blocks ?? []), ...(step.paths?.chatgpt?.blocks ?? [])].some((b) => b.type === 'check' && b.action?.type === 'upload'),
  )
    ? [true]
    : [];
}

export default Component;
