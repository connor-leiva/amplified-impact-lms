import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useLocation, useParams } from 'react-router';
import { enrollmentRefusal } from '@ai/core';
import { Button } from '../../../components/r2/Button';
import { Card } from '../../../components/r2/Card';
import { Confirm } from '../../../components/r2/Modal';
import { KV, Pill, k } from '../../../components/r2/kit';
import { useToaster } from '../../../components/primitives/Toaster';
import { Status } from '../../../components/r2/Status';
import { cohortLabel } from '../../../data/admin-shell';
import { useAct, useDb } from '../../../data/hooks';
import { CohortFilesButton } from '../CohortFiles';
import { cohortPath, openEnrollmentBody, settingsVM } from './cohort.vm';
import { DatesDialog, EnrollmentDialog, PriceDialog, ShapeDialog, WeeksDialog, WordsDialog } from './dialogs';
import { useCohortFacts } from './useCohortFacts';
import c from './Cohort.module.css';

// D-255 (R-5 Phase 3): Cohort › Settings (`/admin/cohort/:cohortId/settings`), the mockup's `CohortSettings`: Shape (Edit,
// and its weeks), Dates and Release (PLAN.md § 10.3), Enrollment (read-only until Phase 5: the one source of seats),
// Words From This Cohort (Edit words), and Clean-up, which holds Delete turned-in files (D-237), moved off Schedule.
// Archive is Phase 9's and is not drawn.
//
// R-5 Phase 5 (D-262): Enrollment is what the cohort sells through (PLAN.md § 10.5's "Sells through"): its seats, its
// price (Stripe's, under its lookup keys, Q-30), two payments (Stripe's schedule), founding and when it closes, its
// Payment Links and GoHighLevel's value; and the mockup's Open enrollment or Close enrollment, Set the price, and Edit
// enrollment. Each saves through an audited admin action on the `billing` permission; Open is refused, in its dialog,
// with Before It Opens' first line not done.

type Open = 'shape' | 'weeks' | 'dates' | 'words' | 'price' | 'enroll' | 'open' | 'close' | null;

export function Component() {
  const { cohortId = '' } = useParams();
  const { hash } = useLocation();
  const db = useDb();
  const facts = useCohortFacts(cohortId);
  const vm = useMemo(() => settingsVM(db, cohortId, facts), [db, cohortId, facts]);
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const act = useAct();
  const { toast } = useToaster();
  // An address that names a card (`#dates`, `#enrollment`, `#words`) scrolls it into view, as a "Before it opens" line does.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(`cohort-${hash.slice(1)}`)?.scrollIntoView({ block: 'start' });
  }, [hash]);
  if (!vm) return null;
  const co = db.cohorts.find((x) => x.id === cohortId)!;
  const enrollAct = async (name: 'openCohortEnrollment' | 'closeCohortEnrollment') => {
    setBusy(true);
    try {
      const out = await act(name, { cohortId });
      if (out.error) setRefused(out.error);
      else {
        setOpen(null);
        if (out.toast) toast(out.toast.msg);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={k.col}>
      <div className={c.set2}>
        <div className={k.col}>
          <div id="cohort-shape" className={c.anchor}>
            <Card
              title="Shape"
              sub="How long it runs and how often you meet"
              right={<Button onClick={() => setOpen('shape')}>Edit</Button>}
            >
              <div className={c.kvTail}>
                <KV
                  stacked
                  rows={[
                    ...vm.shape.rows,
                    {
                      label: 'Its weeks',
                      value: (
                        <button type="button" className={k.lk} onClick={() => setOpen('weeks')}>
                          {vm.shape.weeks}
                        </button>
                      ),
                    },
                    { label: 'Hosts', value: vm.shape.hosts },
                  ]}
                />
              </div>
              <p className={clsx(k.p, k.me)} style={{ marginTop: 12 }}>
                {vm.shape.stored
                  ? 'Change the shape and the sessions that haven’t happened are laid out again. Past sessions keep their dates.'
                  : 'This cohort’s shape is read from its own sessions. Only its hosts change here.'}
              </p>
            </Card>
          </div>
          <div id="cohort-dates" className={c.anchor}>
            <Card title="Dates and Release" right={<Button onClick={() => setOpen('dates')}>Edit</Button>}>
              <div className={c.kvTail}>
                <KV stacked rows={vm.dates} />
              </div>
            </Card>
          </div>
        </div>
        <div className={k.col}>
          <div id="cohort-enrollment" className={c.anchor}>
            <Card
              title="Enrollment"
              right={<Status tone={vm.enrollment.open ? 'ok' : 'off'}>{vm.enrollment.open ? 'Open' : 'Closed'}</Status>}
            >
              <div className={c.kvTail}>
                <KV
                  stacked
                  rows={[
                    {
                      label: 'Seats',
                      value: (
                        <Link className={k.lk} to={cohortPath(cohortId, 'people')}>
                          {vm.enrollment.seats}
                        </Link>
                      ),
                    },
                    { label: 'A seat is', value: 'A team: an owner and an AI Implementer' },
                    { label: 'Price', value: vm.enrollment.price.warn ? <Pill tone="warn">{vm.enrollment.price.text}</Pill> : vm.enrollment.price.text },
                    { label: 'Two payments', value: vm.enrollment.twoPay },
                    { label: 'Founding', value: vm.enrollment.founding },
                    { label: 'Payment Links', value: vm.enrollment.links.warn ? <Pill tone="warn">{vm.enrollment.links.text}</Pill> : vm.enrollment.links.text },
                    { label: 'GoHighLevel', value: vm.enrollment.ghl },
                    { label: 'Who lands here', value: 'A team that buys a seat while enrollment is open' },
                  ]}
                />
              </div>
              <div className={k.row} style={{ marginTop: 12 }}>
                {vm.enrollment.open ? (
                  <Button onClick={() => (setRefused(null), setOpen('close'))}>Close enrollment</Button>
                ) : (
                  <Button kind="primary" onClick={() => (setRefused(enrollmentRefusal(db, cohortId, facts ?? undefined)), setOpen('open'))}>
                    Open enrollment
                  </Button>
                )}
                <Button onClick={() => setOpen('price')}>{vm.enrollment.priceButton}</Button>
                <Button onClick={() => setOpen('enroll')}>Edit enrollment</Button>
              </div>
            </Card>
          </div>
          <div id="cohort-words" className={c.anchor}>
            <Card title="Words From This Cohort" sub="Learners see them on Home and the Schedule.">
              <div className={clsx(k.col, k.colM)}>
                {vm.words?.unread ? (
                  <span className={c.flag}>
                    <Pill tone="warn">Read them once</Pill>
                  </span>
                ) : null}
                <div className={c.cfx}>
                  <span className={k.me}>Name</span>
                  <span>{vm.words?.name ?? ''}</span>
                </div>
                <div className={c.cfx}>
                  <span className={k.me}>The promise</span>
                  <span>{vm.words?.promise || 'Not set'}</span>
                </div>
                <div className={c.cfx}>
                  <span className={k.me}>How it works</span>
                  {vm.words?.how.length ? (
                    <ul className={c.cfl}>
                      {vm.words.how.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  ) : (
                    <span>Not set</span>
                  )}
                </div>
                <div className={c.cfx}>
                  <span className={k.me}>Holiday note</span>
                  <span>{vm.words?.holiday || 'None. Every week has its sessions.'}</span>
                </div>
                <div className={k.row}>
                  <Button aria-label="Edit this cohort’s words" onClick={() => setOpen('words')}>
                    Edit words
                  </Button>
                  <Link className={clsx(k.lk, c.plain)} to="/admin/program/course">
                    What every cohort shares is in Course Settings
                  </Link>
                </div>
              </div>
            </Card>
          </div>
          <Card title="Clean-Up">
            <div className={c.cleanRow}>
              <span className={clsx(k.col, k.col0, c.grow)}>
                <span className={k.w5}>Delete turned-in files</span>
                <span className={k.me}>
                  Removes every file teams turned in. The record that they turned it in stays.
                </span>
              </span>
              <CohortFilesButton cohortId={cohortId} label="Delete…" />
            </div>
          </Card>
        </div>
      </div>
      {open === 'shape' ? <ShapeDialog cohortId={cohortId} onClose={() => setOpen(null)} /> : null}
      {open === 'weeks' ? <WeeksDialog cohortId={cohortId} onClose={() => setOpen(null)} /> : null}
      {open === 'dates' ? (
        <DatesDialog cohortId={cohortId} frozen={vm.includedFrozen} onClose={() => setOpen(null)} />
      ) : null}
      {open === 'words' ? <WordsDialog cohortId={cohortId} onClose={() => setOpen(null)} /> : null}
      {open === 'price' ? <PriceDialog cohortId={cohortId} facts={facts} onClose={() => setOpen(null)} /> : null}
      {open === 'enroll' ? <EnrollmentDialog cohortId={cohortId} onClose={() => setOpen(null)} /> : null}
      {open === 'open' ? (
        <Confirm
          title={`Open enrollment for the ${cohortLabel(co)}?`}
          body={openEnrollmentBody(db, cohortId)}
          cta="Open enrollment"
          keepOpen
          busy={busy}
          error={refused}
          onConfirm={() => void enrollAct('openCohortEnrollment')}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === 'close' ? (
        <Confirm
          title={`Close enrollment for the ${cohortLabel(co)}?`}
          body={`No new team can buy a seat in this cohort. The ${facts?.teams ?? 0} already in it are not affected.`}
          cta="Close enrollment"
          keepOpen
          busy={busy}
          error={refused}
          onConfirm={() => void enrollAct('closeCohortEnrollment')}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

export default Component;
