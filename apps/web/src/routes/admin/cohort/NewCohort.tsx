import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router';
import { can, cohortShortName, cohortWordsOf, defaultSourceId, layoutWarnings, newCohortSources, programWeeks } from '@ai/core';
import { Icon } from '../../../components/Icon';
import { Button } from '../../../components/r2/Button';
import { Card } from '../../../components/r2/Card';
import { Page } from '../../../components/r2/Page';
import { PageHead, Pill, Sel, k } from '../../../components/r2/kit';
import { PROGRAM, PROGRAM_KEY, cohortLabel } from '../../../data/admin-shell';
import { useAct, useDb, useViewer } from '../../../data/hooks';
import { programLogo } from '../../../home/program-logo';
import { Denied } from '../../console/Denied';
import { cohortPath, newCohortVM, otherRhythmLine } from './cohort.vm';
import type { NewCohortForm } from './cohort.vm';
import { Field, PlanList, ShapeFields, WeekPick } from './parts';
import c from './Cohort.module.css';

// D-255 (R-5 Phase 3): New cohort (`/admin/cohort/new`), the mockup's `NewCohort`: one page. Say its shape and when it
// starts; the right side lays the calendar out as the form changes, with both warnings (a session at the same time as
// another cohort's, a U.S. federal holiday). "Create cohort" makes the draft (`createCohortFromShape`) and opens its
// Overview. Its words start as December's, flagged "Read them once" (PLAN.md § 10.3), and its included time is
// prefilled to the last live build + 90 days. No price: Phase 5's, read from Stripe.
//
// R-5 Phase 5 (D-262, PLAN § 10.10): "Start from" lists every cohort that is not archived, not December by id; it opens
// on the newest past its draft (the one running now). A new cohort copies its source's seats, founding and two
// payments, and its GoHighLevel value is prefilled from its own start ("jan27").

const TILE = `data:image/svg+xml,${encodeURIComponent(programLogo(PROGRAM_KEY, { variant: 'tile', size: 40, title: '' }))}`;

/** Connor's example: six weeks of building, twice a week, starting in early January (the mockup's `JAN_F`). */
const START: NewCohortForm = {
  name: null,
  from: '',
  promise: null,
  setupWeek: true,
  picks: [],
  slots: [
    { day: 2, time: '12:00', kind: 'live_build', mins: 90 },
    { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
  ],
  start: '2027-01-03',
  included: null,
  hosts: 'Connor Leiva and Spring',
};

export function Component() {
  const db = useDb();
  const viewer = useViewer();
  const act = useAct();
  const navigate = useNavigate();
  const weeks = useMemo(() => programWeeks(db), [db]);
  const ids = weeks.map((w) => w.id);
  const sources = useMemo(() => newCohortSources(db), [db]);
  const fallback = defaultSourceId(db) ?? '';
  const [f, setF] = useState<NewCohortForm>(() => ({ ...START, from: fallback, picks: ids.slice(0, 6) }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // A blank cohort still takes its seats, zone and open time from a cohort: the one "Start from" opens on.
  const sourceId = f.from || fallback;
  const source = cohortWordsOf(db, sourceId);
  const vm = useMemo(() => newCohortVM(db, f, source?.promise ?? ''), [db, f, source?.promise]);
  const warnings = useMemo(() => layoutWarnings(db, null, vm.laid), [db, vm.laid]);
  const other = useMemo(() => otherRhythmLine(db, warnings), [db, warnings]);
  const up = (p: Partial<NewCohortForm>) => setF({ ...f, ...p });
  if (!can(db, viewer.actor, 'cohorts')) return <Denied what="New Cohort" role={viewer.role} />;
  const picked = sources.find((x) => x.id === f.from);
  const seatsFrom = sources.find((x) => x.id === sourceId);

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const out = await act('createCohortFromShape', {
        name: (vm.name.trim() || vm.autoName).trim(),
        start: f.start,
        sourceCohortId: sourceId,
        picks: f.picks,
        shape: { setupWeek: f.setupWeek, slots: f.slots, hosts: f.hosts },
        words:
          f.from && source
            ? { promise: vm.promise, how: source.how, holiday: source.holiday }
            : f.from
              ? undefined
              : { promise: vm.promise, how: [], holiday: '' },
        includedUntil: vm.included || null,
      });
      if (out.error) return setError(out.error);
      const id = (out as { cohort?: { cohortId: string } }).cohort?.cohortId;
      if (id) void navigate(cohortPath(id));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHead
        title="New Cohort"
        back={{ to: '/admin/cohort', label: 'Cohort' }}
        description="One group going through the program. Say how long it runs, how often you meet and when it starts. The portal lays out the weeks and the sessions. You can change any of it afterwards."
      />
      <div className={k.gms}>
        <div className={k.col}>
          <Card title="The Cohort">
            <div className={k.col}>
              <div className={c.g2}>
                <Field label="Name">
                  <input className={k.in} value={vm.name} onChange={(e) => up({ name: e.target.value })} />
                </Field>
                <div className={c.lab}>
                  <span>Start from</span>
                  <Sel aria-label="Start from" value={f.from} onChange={(e) => up({ from: e.target.value })}>
                    {sources.map((x) => (
                      <option key={x.id} value={x.id}>
                        {cohortLabel(x)}
                      </option>
                    ))}
                    <option value="">A blank cohort</option>
                  </Sel>
                </div>
              </div>
              <Field label="The promise" hint="One line. Learners see it on Home, under the program’s name.">
                <input className={k.in} value={vm.promise} onChange={(e) => up({ promise: e.target.value })} />
              </Field>
              {picked ? (
                <p className={clsx(k.p, k.me)}>
                  Copied from {cohortShortName(picked)}: its seats, its intake form, its emails and its community rules.
                  Nothing about {cohortShortName(picked)} changes.
                </p>
              ) : null}
            </div>
          </Card>
          <Card title="Its Shape" sub="How long it runs and how often you meet">
            <ShapeFields f={f} up={up} ids={ids} />
          </Card>
          <Card title="When It Starts">
            <div className={c.g2}>
              <Field label="Week 1 opens">
                <input
                  className={k.in}
                  type="date"
                  value={f.start}
                  onChange={(e) => e.target.value && up({ start: e.target.value })}
                />
              </Field>
              <div className={c.lab}>
                <span>That makes</span>
                <span className={k.s2} style={{ fontWeight: 400 }}>
                  {vm.setupOpens ? `The setup week opens ${vm.setupOpens}. ` : ''}
                  {vm.firstSession
                    ? `The first session is ${vm.firstSession} and the last is ${vm.lastSession}.`
                    : 'No sessions yet.'}
                </span>
              </div>
            </div>
          </Card>
          <section className={k.cd}>
            <div className={k.cdh}>
              <div className={clsx(k.col, k.colS, c.grow)} style={{ gap: 0 }}>
                <h2 className={k.h2}>What It Covers</h2>
                <span className={k.me}>Pick from the program’s weeks. They keep the curriculum’s order.</span>
              </div>
              <Pill tone="ok">
                {f.picks.length} of {weeks.length} weeks
              </Pill>
            </div>
            <WeekPick weeks={weeks} picks={f.picks} onChange={(picks) => up({ picks })} />
            {vm.drafts > 0 ? (
              <div className={k.cdb} style={{ borderTop: '1px solid var(--r2-line)' }}>
                <p className={clsx(k.p, k.me)}>
                  {vm.drafts} of these {vm.drafts === 1 ? 'is' : 'are'} still {vm.drafts === 1 ? 'a draft' : 'drafts'}{' '}
                  in the curriculum. A draft week stays locked for learners until it is published.
                </p>
              </div>
            ) : null}
          </section>
          <Card title="Seats, Time and Hosts">
            <div className={k.col}>
              <div className={c.g2}>
                <div className={c.lab}>
                  <span>Seats</span>
                  <span className={c.fat}>A seat is a team: an owner and an AI Implementer.</span>
                  <span className={k.s2} style={{ fontWeight: 400 }}>
                    {seatsFrom?.capacity ?? 0}, copied from {seatsFrom ? cohortShortName(seatsFrom) : 'December'}
                  </span>
                </div>
                <Field label="Included time ends" hint="90 days after the last live build.">
                  <input
                    className={k.in}
                    type="date"
                    value={vm.included}
                    onChange={(e) => up({ included: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Hosts">
                <input className={k.in} value={f.hosts} onChange={(e) => up({ hosts: e.target.value })} />
              </Field>
            </div>
          </Card>
        </div>
        <div className={k.col}>
          <section className={clsx(k.cd, c.sticky)}>
            <div className={clsx(k.cdb, k.col)}>
              <div className={c.nameRow}>
                <img className={c.tile} src={TILE} width={40} height={40} alt="" />
                <span className={clsx(k.col, k.col0, c.grow)}>
                  <span className={c.bigName}>{vm.name || vm.autoName}</span>
                  <span className={k.me}>{PROGRAM}</span>
                </span>
              </div>
              <div className={c.skf}>
                <div>
                  <b className={k.tn}>{f.picks.length}</b>
                  <span className={k.me}>weeks of building</span>
                </div>
                <div>
                  <b className={k.tn}>{vm.sessions}</b>
                  <span className={k.me}>sessions</span>
                </div>
                <div>
                  <b className={k.tn}>{seatsFrom?.capacity ?? 0}</b>
                  <span className={k.me}>team seats</span>
                </div>
              </div>
              <PlanList plan={vm.plan} free />
              {vm.clash ? (
                <div className={c.warnNote}>
                  <Icon name="r2Incidents" size={16} strokeWidth={1.75} />
                  <span className={c.noteText}>
                    <b>
                      {vm.clash.n} sessions are at the same time as {vm.clash.words}.
                    </b>{' '}
                    {other ? `${other} ` : ''}Pick another day or hour, or keep them if you mean to run them together.
                  </span>
                </div>
              ) : null}
              {vm.holidays.length ? (
                <div className={c.infoNote}>
                  <Icon name="r2Cal" size={16} strokeWidth={1.75} />
                  <span className={c.noteText}>{vm.holidays.join('. ')}.</span>
                </div>
              ) : null}
              {error || vm.problem ? (
                <p role="alert" className={clsx(k.p, c.err)}>
                  {error || vm.problem}
                </p>
              ) : null}
              <Button kind="primary" disabled={busy || !!vm.problem} onClick={() => void create()}>
                Create cohort
              </Button>
              <p className={clsx(k.p, k.me)}>
                Creates a draft. No one is enrolled, nothing is for sale and no one is emailed.
              </p>
            </div>
          </section>
        </div>
      </div>
    </Page>
  );
}

export default Component;
