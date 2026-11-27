import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { DERIVED_SHAPE, cohortShapeOf, cohortWordsOf, programWeeks, runRows, zonedInputs } from '@ai/core';
import { Button } from '../../../components/r2/Button';
import { Modal } from '../../../components/r2/Modal';
import { TextArea, k } from '../../../components/r2/kit';
import { useAct, useDb } from '../../../data/hooks';
import { cohortLabel } from '../../../data/admin-shell';
import { datesForm, enrollmentForm, keyPriceLine, moveWeek1, newCohortVM, priceForm, runArgs, runChanged, stripePriceOf } from './cohort.vm';
import type { DatesForm, EnrollmentForm, PriceForm } from './cohort.vm';
import { cohortSelling, laterWords } from '@ai/core';
import type { CohortFacts } from '@ai/core';
import { dollars } from '@ai/core/offer';
import { Field, PlanList, ShapeFields, WeekPick, Wn } from './parts';
import type { ShapeForm } from './parts';
import c from './Cohort.module.css';

// D-255 (R-5 Phase 3): the Cohort page's dialogs, each the mockup's (p3-cohort.jsx), each saving through the audited
// admin actions: the weeks (`WeeksDlg`), the shape, Dates and Release (Week 1, the week's open time, the setup week,
// the welcome email, the included time and each week's Opens and Due: PLAN.md § 10.3), and Edit words. R-5 Phase 5
// (D-262): the price (its lookup keys, with Stripe's price under each: Q-30) and Edit enrollment.

function Errors({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div role="alert" className={c.err}>
      {error.split('\n').map((e) => (
        <p key={e} className={k.p}>
          {e}
        </p>
      ))}
    </div>
  );
}

const shapeArgs = (f: ShapeForm, hosts: string) => ({ setupWeek: f.setupWeek, slots: f.slots, hosts });

/** "The weeks the January 2027 Cohort runs" (`WeeksDlg`): pick from the program's weeks. */
export function WeeksDialog({ cohortId, onClose }: { cohortId: string; onClose: () => void }) {
  const db = useDb();
  const act = useAct();
  const co = db.cohorts.find((x) => x.id === cohortId)!;
  const view = cohortShapeOf(db, cohortId);
  const weeks = programWeeks(db);
  const picked = runRows(db, cohortId)
    .filter((w) => w.n > 0)
    .map((w) => w.moduleId);
  const [picks, setPicks] = useState(picked);
  const [error, setError] = useState(view?.stored ? '' : DERIVED_SHAPE);
  const words = cohortWordsOf(db, cohortId);
  const save = async () => {
    if (!view?.stored) return;
    const out = await act('saveCohortShape', {
      cohortId,
      picks,
      shape: shapeArgs({ picks, slots: view.shape.slots, setupWeek: view.shape.setupWeek }, view.shape.hosts),
    });
    if (out.error) setError(out.error);
    else onClose();
  };
  return (
    <Modal
      title={`The Weeks the ${cohortLabel(co)} Runs`}
      width={620}
      onClose={onClose}
      focusClose
      foot={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" disabled={!view?.stored} onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <p className={clsx(k.p, k.s2)}>
        Pick from the program’s weeks. What a week teaches is the same for every cohort. Its date is this cohort’s.
      </p>
      <div className={k.cd}>
        <WeekPick weeks={weeks} picks={picks} onChange={setPicks} />
      </div>
      <p className={clsx(k.p, k.me)}>
        {picks.length} weeks of building{view?.shape.setupWeek ? ', after the setup week' : ''}.
        {picks.length !== picked.length && words?.promise
          ? ` The promise says ${words.promise.split('.')[0]!.toLowerCase()}. Change it in Settings if it no longer fits.`
          : ''}
      </p>
      <Errors error={error} />
    </Modal>
  );
}

/** "Shape of the January 2027 Cohort": its rhythm, its weeks and its hosts. December's is read off its sessions: hosts only. */
export function ShapeDialog({ cohortId, onClose }: { cohortId: string; onClose: () => void }) {
  const db = useDb();
  const act = useAct();
  const co = db.cohorts.find((x) => x.id === cohortId)!;
  const view = cohortShapeOf(db, cohortId)!;
  const ids = programWeeks(db).map((w) => w.id);
  const rows = runRows(db, cohortId);
  const [f, setF] = useState<ShapeForm>({
    picks: rows.filter((w) => w.n > 0).map((w) => w.moduleId),
    slots: view.shape.slots.map((s) => ({ ...s })),
    setupWeek: view.shape.setupWeek,
  });
  const [hosts, setHosts] = useState(view.shape.hosts);
  const [error, setError] = useState('');
  const w1 = rows.find((w) => w.n === 1)?.opensAt ?? null;
  const start = w1 !== null ? zonedInputs(w1, co.timezone ?? 'America/Denver').date : '';
  const plan = useMemo(
    () =>
      newCohortVM(
        db,
        {
          name: co.name,
          from: '',
          promise: '',
          setupWeek: f.setupWeek,
          picks: f.picks,
          slots: f.slots,
          start,
          included: '',
          hosts,
        },
        '',
        cohortId,
      ).plan,
    [db, co.name, f, start, hosts, cohortId],
  );
  const save = async () => {
    const out = view.stored
      ? await act('saveCohortShape', { cohortId, picks: f.picks, shape: shapeArgs(f, hosts) })
      : await act('saveCohortHosts', { cohortId, hosts });
    if (out.error) setError(out.error);
    else onClose();
  };
  return (
    <Modal
      title={`Shape of the ${cohortLabel(co)}`}
      width={640}
      onClose={onClose}
      focusClose
      foot={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" onClick={() => void save()}>
            Save shape
          </Button>
        </>
      }
    >
      <ShapeFields f={f} up={(p) => setF({ ...f, ...p })} ids={ids} locked={!view.stored} />
      {!view.stored ? <p className={clsx(k.p, k.me)}>{DERIVED_SHAPE}</p> : null}
      <Field label="Hosts">
        <input className={k.in} value={hosts} onChange={(e) => setHosts(e.target.value)} />
      </Field>
      {view.stored ? (
        <div className={c.lab}>
          <span>What this makes</span>
          <PlanList plan={plan} />
        </div>
      ) : null}
      <Errors error={error} />
    </Modal>
  );
}

/**
 * Dates and Release (PLAN.md § 10.3): when Week 1 opens (moving it moves every week after it), the time a week opens,
 * when the setup week (the preview) opens, when the welcome email sends, when the included time ends, and each week's
 * Opens and Due. Saved as today: the run with `saveCohortRun`, the release plan with `saveCohortPlan` (its audit, as
 * today), the included time with `saveCohortIncluded`; each only when it changed.
 */
export function DatesDialog({ cohortId, frozen, onClose }: { cohortId: string; frozen: boolean; onClose: () => void }) {
  const db = useDb();
  const act = useAct();
  const co = db.cohorts.find((x) => x.id === cohortId)!;
  const initial = useMemo(() => datesForm(db, cohortId)!, [db, cohortId]);
  const [f, setF] = useState<DatesForm>(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setup = f.weeks.some((w) => w.setup);
  const up = (p: Partial<DatesForm>) => setF({ ...f, ...p });
  const week = (i: number, p: Partial<DatesForm['weeks'][number]>) =>
    setF({ ...f, weeks: f.weeks.map((w, j) => (j === i ? { ...w, ...p } : w)) });
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      if (runChanged(f, initial)) {
        const out = await act('saveCohortRun', runArgs(cohortId, f, runRows(db, cohortId), co.timezone));
        if (out.error) return setError(out.error);
      }
      const plan =
        f.previewDate !== initial.previewDate ||
        f.previewTime !== initial.previewTime ||
        f.openTime !== initial.openTime ||
        f.welcomeDate !== initial.welcomeDate ||
        f.welcomeTime !== initial.welcomeTime;
      if (plan) {
        const out = await act('saveCohortPlan', {
          cohortId,
          name: co.name,
          cadence: co.cadence,
          previewOpens: f.previewDate ? { date: f.previewDate, time: f.previewTime || f.openTime } : null,
          defaultOpenTime: f.openTime,
          welcomeSends: f.welcomeDate ? { date: f.welcomeDate, time: f.welcomeTime || f.openTime } : null,
        });
        if (out.error) return setError(out.error);
      }
      if (!frozen && f.included !== initial.included) {
        const out = await act('saveCohortIncluded', { cohortId, date: f.included || null });
        if (out.error) return setError(out.error);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Dates and Release"
      width={560}
      onClose={onClose}
      focusClose
      lock={busy}
      foot={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" disabled={busy} onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <div className={c.g2}>
        <Field label="Week 1 opens">
          <input className={k.in} type="date" value={f.week1} onChange={(e) => setF(moveWeek1(f, e.target.value))} />
        </Field>
        <Field label="A week opens at (MT)">
          <input className={k.in} type="time" value={f.openTime} onChange={(e) => up({ openTime: e.target.value })} />
        </Field>
      </div>
      <div className={c.g2}>
        <Field label={setup ? 'Setup week opens' : 'Preview opens'}>
          <input
            className={k.in}
            type="date"
            value={f.previewDate}
            onChange={(e) => up({ previewDate: e.target.value })}
          />
        </Field>
        <Field label="Time (MT)">
          <input
            className={k.in}
            type="time"
            value={f.previewTime}
            onChange={(e) => up({ previewTime: e.target.value })}
          />
        </Field>
      </div>
      <div className={c.g2}>
        <Field label="Welcome email sends at (MT)">
          <input
            className={k.in}
            type="date"
            value={f.welcomeDate}
            onChange={(e) => up({ welcomeDate: e.target.value })}
          />
        </Field>
        <Field label="Time (MT)">
          <input
            className={k.in}
            type="time"
            value={f.welcomeTime}
            onChange={(e) => up({ welcomeTime: e.target.value })}
          />
        </Field>
      </div>
      <p className={clsx(k.p, k.me)}>
        To move the whole cohort, change when Week 1 opens. Every week and session after it moves by the same number of
        days.
      </p>
      <Field
        label="Included time ends"
        hint={
          frozen
            ? 'A seat in this cohort is sold, so its included time stays as it is.'
            : 'A seat’s included time ends at the start of this day, Central time.'
        }
      >
        <input
          className={k.in}
          type="date"
          value={f.included}
          disabled={frozen}
          onChange={(e) => up({ included: e.target.value })}
        />
      </Field>
      <div className={c.lab}>
        <span>Each week</span>
        <span className={c.fat}>
          Move one week on its own, for a holiday break. Its sessions that haven’t happened move with it.
        </span>
        <div className={c.ewl}>
          <div className={clsx(c.ewr, c.ewh)} aria-hidden="true">
            <span />
            <span />
            <span>Opens</span>
            <span>Due</span>
          </div>
          {f.weeks.map((w, i) => (
            <div key={w.moduleId} className={c.ewr}>
              <Wn n={w.n} small />
              <span className={clsx(k.el)}>{w.title}</span>
              <label className={c.ewf}>
                <span className={c.ewk}>Opens</span>
                {w.setup ? (
                  <span className={k.me}>Set above</span>
                ) : (
                  <input
                    className={k.in}
                    type="date"
                    aria-label={`Week ${w.n} opens`}
                    value={w.opens}
                    onChange={(e) => week(i, { opens: e.target.value })}
                  />
                )}
              </label>
              <label className={c.ewf}>
                <span className={c.ewk}>Due</span>
                <input
                  className={k.in}
                  type="date"
                  aria-label={`Week ${w.n} is due`}
                  value={w.due}
                  onChange={(e) => week(i, { due: e.target.value })}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
      <Errors error={error} />
    </Modal>
  );
}

/** Edit words: the four as fields (spec § 7): name, the promise, how it works (a line each), the holiday note. */
export function WordsDialog({ cohortId, onClose }: { cohortId: string; onClose: () => void }) {
  const db = useDb();
  const act = useAct();
  const co = db.cohorts.find((x) => x.id === cohortId)!;
  const words = cohortWordsOf(db, cohortId);
  const [name, setName] = useState(co.name);
  const [promise, setPromise] = useState(words?.promise ?? '');
  const [how, setHow] = useState((words?.how ?? []).join('\n'));
  const [holiday, setHoliday] = useState(words?.holiday ?? '');
  const [error, setError] = useState('');
  const save = async () => {
    const out = await act('saveCohortWords', { cohortId, name, promise, how: how.split('\n'), holiday });
    if (out.error) setError(out.error);
    else onClose();
  };
  return (
    <Modal
      title="Words From This Cohort"
      width={560}
      onClose={onClose}
      focusClose
      foot={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" onClick={() => void save()}>
            Save words
          </Button>
        </>
      }
    >
      <Field label="Name">
        <input className={k.in} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="The promise" hint="One line. Learners see it on Home, under the program’s name.">
        <input className={k.in} value={promise} onChange={(e) => setPromise(e.target.value)} />
      </Field>
      <Field label="How it works" hint="A line each.">
        <TextArea rows={5} value={how} onChange={(e) => setHow(e.target.value)} />
      </Field>
      <Field label="Holiday note">
        <TextArea rows={2} value={holiday} onChange={(e) => setHoliday(e.target.value)} />
      </Field>
      <Errors error={error} />
    </Modal>
  );
}

/** Q-30's sentence (PLAN.md § 10.1), word for word. */
export const PRICE_SENTENCE = 'Prices and Payment Links are made in Stripe. This shows Stripe’s price for this cohort.';

/**
 * R-5 Phase 5 (D-262): "Price for a Seat in the January 2027 Cohort", the mockup's price dialog with § 10.5's change: no
 * typed price. The cohort's three lookup keys (made by hand in Stripe), each with Stripe's price under it, and whether
 * two payments are offered, with Stripe's own schedule. Saves `saveCohortPrice`.
 */
export function PriceDialog({ cohortId, facts, onClose }: { cohortId: string; facts: CohortFacts | null; onClose: () => void }) {
  const db = useDb();
  const act = useAct();
  const co = db.cohorts.find((x) => x.id === cohortId)!;
  const saved = cohortSelling(db, cohortId);
  const [f, setF] = useState<PriceForm>(() => priceForm(db, cohortId));
  const [error, setError] = useState('');
  const up = (p: Partial<PriceForm>) => setF({ ...f, ...p });
  const two = stripePriceOf(facts, saved.keys.twoPay);
  const later = two ? laterWords(two) : null;
  const save = async () => {
    const out = await act('saveCohortPrice', {
      cohortId,
      full: f.full.trim() || null,
      rollover: f.rollover.trim() || null,
      twoPay: f.twoPay.trim() || null,
      offerTwoPay: f.offerTwoPay,
    });
    if (out.error) setError(out.error);
    else onClose();
  };
  return (
    <Modal
      title={`Price for a Seat in the ${cohortLabel(co)}`}
      width={520}
      onClose={onClose}
      focusClose
      foot={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" disabled={!f.full.trim()} onClick={() => void save()}>
            Save price
          </Button>
        </>
      }
    >
      <Field label="Lookup key, paid in full" hint={keyPriceLine(facts, saved.keys.full, f.full)}>
        <input className={k.in} value={f.full} onChange={(e) => up({ full: e.target.value })} />
      </Field>
      <Field label="Lookup key, Insiders after" hint={keyPriceLine(facts, saved.keys.rollover, f.rollover)}>
        <input className={k.in} value={f.rollover} onChange={(e) => up({ rollover: e.target.value })} />
      </Field>
      <label className={c.ckr}>
        <input type="checkbox" checked={f.offerTwoPay} onChange={(e) => up({ offerTwoPay: e.target.checked })} />
        <span className={clsx(k.col, k.col0)}>
          <span className={k.w5}>Offer two payments</span>
          <span className={k.me}>
            {two && later
              ? `${dollars(two.unitAmount)} at checkout and ${dollars(two.unitAmount)} ${later}, as Stripe schedules it. Revenue shows the second as still to collect.`
              : 'Stripe’s price sets the schedule. Revenue shows the second payment as still to collect.'}
          </span>
        </span>
      </label>
      {f.offerTwoPay ? (
        <Field label="Lookup key, two payments" hint={keyPriceLine(facts, saved.keys.twoPay, f.twoPay)}>
          <input className={k.in} value={f.twoPay} onChange={(e) => up({ twoPay: e.target.value })} />
        </Field>
      ) : null}
      <p className={clsx(k.p, k.me)}>{PRICE_SENTENCE}</p>
      <Errors error={error} />
    </Modal>
  );
}

/**
 * R-5 Phase 5 (D-262): Edit enrollment, the rest of what a cohort sells through (PLAN.md § 10.10): founding and when it
 * closes (MT), its two Payment Link addresses, its seat cap and GoHighLevel's Cohort value. Saves `saveCohortEnrollment`.
 */
export function EnrollmentDialog({ cohortId, onClose }: { cohortId: string; onClose: () => void }) {
  const db = useDb();
  const act = useAct();
  const co = db.cohorts.find((x) => x.id === cohortId)!;
  const twoPay = cohortSelling(db, cohortId).twoPay;
  const [f, setF] = useState<EnrollmentForm>(() => enrollmentForm(db, cohortId));
  const [error, setError] = useState('');
  const up = (p: Partial<EnrollmentForm>) => setF({ ...f, ...p });
  const save = async () => {
    const out = await act('saveCohortEnrollment', {
      cohortId,
      founding: f.founding,
      foundingCloses: f.founding && f.closesDate ? { date: f.closesDate, time: f.closesTime || '23:59' } : null,
      linkFull: f.linkFull.trim() || null,
      linkTwoPay: f.linkTwoPay.trim() || null,
      capacity: Number(f.capacity),
      ghlValue: f.ghl.trim() || null,
    });
    if (out.error) setError(out.error);
    else onClose();
  };
  return (
    <Modal
      title={`Enrollment for the ${cohortLabel(co)}`}
      width={560}
      onClose={onClose}
      focusClose
      foot={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button kind="primary" onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <label className={c.ckr}>
        <input type="checkbox" checked={f.founding} onChange={(e) => up({ founding: e.target.checked })} />
        <span className={clsx(k.col, k.col0)}>
          <span className={k.w5}>A founding cohort</span>
          <span className={k.me}>Founding prices sell until founding closes. Its sold-out line says founding seats.</span>
        </span>
      </label>
      <div className={c.g2}>
        <Field label="Founding closes">
          <input className={k.in} type="date" value={f.closesDate} disabled={!f.founding} onChange={(e) => up({ closesDate: e.target.value })} />
        </Field>
        <Field label="Time (MT)">
          <input className={k.in} type="time" value={f.closesTime} disabled={!f.founding} onChange={(e) => up({ closesTime: e.target.value })} />
        </Field>
      </div>
      <Field label="Payment Link, paid in full">
        <input className={k.in} value={f.linkFull} onChange={(e) => up({ linkFull: e.target.value })} />
      </Field>
      {twoPay ? (
        <Field label="Payment Link, two payments">
          <input className={k.in} value={f.linkTwoPay} onChange={(e) => up({ linkTwoPay: e.target.value })} />
        </Field>
      ) : null}
      <div className={c.g2}>
        <Field label="Seats">
          <input className={k.in} type="number" min={1} value={f.capacity} onChange={(e) => up({ capacity: e.target.value })} />
        </Field>
        <Field label="GoHighLevel cohort value">
          <input className={k.in} value={f.ghl} onChange={(e) => up({ ghl: e.target.value })} />
        </Field>
      </div>
      <p className={clsx(k.p, k.me)}>
        {`A link sells this cohort when, in Stripe, its metadata says ai_cohort = ${cohortId}. A link without it sells December.`}
      </p>
      <Errors error={error} />
    </Modal>
  );
}
