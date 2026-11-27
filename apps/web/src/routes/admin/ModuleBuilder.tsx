import { useCallback, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import clsx from 'clsx';
import {
  MODULE_ICONS,
  addStep,
  can,
  duplicateStep,
  fmt,
  moduleVersion,
  moduleVideos,
  programCourse,
  publishNeededMessage,
  removeStep,
  savePublishes,
} from '@ai/core';
import type { AIEmployee, Db, ModuleStatus } from '@ai/core';

import { Icon } from '../../components/Icon';
import { useToaster } from '../../components/primitives/Toaster';
import { Button, ButtonLink } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Menu } from '../../components/r2/Menu';
import { Confirm, Modal } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { TierPill } from '../../components/r2/TierPill';
import { PageHead, Sel, TextArea, k } from '../../components/r2/kit';
import { cohortLabel } from '../../data/admin-shell';
import { isFixture } from '../../data/boot';
import { useAct, useDb, useNow, useViewer } from '../../data/hooks';
import { clock } from '../../lib/clock';
import { useViewportWidth } from '../../shell/hooks';
import {
  builderR2VM,
  moveStepTo,
  newWeekDraft,
  nextFile,
  normalizeSaved,
  parseMinutes,
  parseReplayAt,
  seedDraft,
} from './ModuleBuilder.vm';
import {
  AgendaCard,
  CoursePageCard,
  CoursePreview,
  HireCardsCard,
  KitCard,
  SkillsCard,
  StepWeekFields,
} from './WeekBuilder';
import { IntakeCard } from './IntakeCard';
import { StackCard } from './StackCard';
import { WhereItRuns } from './cohort/WhereItRuns';
import { cohortPath } from './cohort/cohort.vm';
import { TONES, TONE_LABELS, draftIssues, isWeekDraft, weekKit, weekSessions } from './WeekBuilder.vm';
import {
  WEEK_SECTIONS,
  neighbours,
  runsOf,
  sectionCounts,
  sectionOf,
  stepRows,
  weekSections,
  weekTitle,
} from './program/program.vm';
import type { WeekSection } from './program/program.vm';
import s from './ModuleBuilder.module.css';
import c from './cohort/Cohort.module.css';
import p from './program/Program.module.css';
import { weekPath } from '../../shell/admin/addresses';
import { useAdminChrome, useRecordCrumb } from '../../shell/admin/chrome';

/** A section's name in the rail. */
const sectionLabel = (id: WeekSection): string => WEEK_SECTIONS.find((x) => x.id === id)!.label;

// D-265 (R-5 Phase 6): Program › a week (`/admin/program/weeks/:moduleId`, `/admin/program/weeks/new`), the mockup's
// `WeekEdit`: today's week builder regrouped into sections down the left, one on screen at a time (`?section=`): Basics,
// Steps, Course Page, Live Sessions, Hire Cards, Kit, and on the setup week a seventh, Forms (PLAN.md § 10.1 Q-31,
// § 10.6). No field is added or removed (PLAN § 6.1's placements):
//
//   - Head: back to Curriculum, the week's status, the previous and next week, Preview, Save changes.
//   - Basics: Title and Outcome; Where It Runs (each cohort's week number, opening and due date, a link to that cohort's
//     Dates and Release, where they are edited, D-255); then what "Edit details" held (sidebar label, headline, for,
//     icon, the three outputs, run label, platform, tier access, tone, notes, system prompt).
//   - Steps: in order; a step opens its words, who does it, its time and both paths (`StepWeekFields`).
//   - Course Page, Live Sessions (the admin's cohort's sessions, read-only, each a link to Schedule, spec § 4 rule 4;
//     then each run of show), Hire Cards, Kit (skills, vault items, the module's files), Forms (Week 0's intake and
//     stack card). `SubmissionsCard` and `SeatCardsCard` left for Cohort › Submissions (PLAN § 6.1).
//
// The draft, the unsaved-changes prompt (phase 06 § 6.3) and every write (`saveBuilderModule`, one audited
// `module.save` row, D-247's version check) are as before. A course week's Opens and Due are its cohorts'; the save
// keeps the stored ones (D-265). "Add a week" starts a draft week (`newWeekDraft`).

type TextKey = 'short' | 'headline' | 'forWho' | 'prompt' | 'notes' | 'platform' | 'runLabel';

interface BuilderState {
  key: string;
  draft: AIEmployee;
  dirty: boolean;
  errors: string[];
  /**
   * D-247 (H-6): the version of the stored module this draft was opened from (`moduleVersion`), or null
   * for a new one. Every save sends it; the server refuses a save whose module has moved on (409), and
   * a save answers the next one.
   */
  base: string | null;
}

const versionOf = (db: Db, id: string | null): string | null => {
  const m = id ? db.modules.find((x) => x.id === id) : null;
  return m ? moduleVersion(m) : null;
};

const seedState = (db: Db, id: string | null): BuilderState => ({
  key: id ?? '',
  draft: id ? seedDraft(db, id, clock.now()) : newWeekDraft(db, clock.now()),
  dirty: false,
  errors: [],
  base: versionOf(db, id),
});

export function Component() {
  const db = useDb();
  const now = useNow();
  const act = useAct();
  const viewer = useViewer();
  const navigate = useNavigate();
  const { toast } = useToaster();
  const params = useParams();
  const phone = useViewportWidth() < 768;
  const [search, setSearch] = useSearchParams();
  // D-265: the builder previews, counts and links sessions in the admin's own cohort (the picker's, D-253).
  const cohortId = useAdminChrome().cohort.id;

  const raw = params.employeeId;
  const routeId = !raw || raw === 'new' ? null : raw;
  const [st, setSt] = useState<BuilderState>(() => seedState(db, routeId));
  const [stepAt, setStepAt] = useState<number | null>(null);
  const [removeAt, setRemoveAt] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  // D-253: a week is a record of Program › Curriculum; the crumb names it (`Admin / Program / Curriculum / {name}`).
  useRecordCrumb(weekTitle(st.draft) || null);

  // A brand-new draft just saved: `/new` must not reseed over it while the navigation is in flight.
  const savedNew = useRef<string | null>(null);
  if (savedNew.current !== null && routeId !== null) savedNew.current = null;
  if (st.key !== (routeId ?? '') && savedNew.current === null) setSt(seedState(db, routeId));

  const bypass = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (bypass.current) {
      bypass.current = false;
      return false;
    }
    // D-265: moving between the week's sections (`?section=`) keeps the draft, so only leaving the week asks.
    return st.dirty && currentLocation.pathname !== nextLocation.pathname;
  });

  const up = useCallback((fn: (d: AIEmployee) => void) => {
    setSt((prev) => {
      const draft = structuredClone(prev.draft);
      fn(draft);
      return { ...prev, draft, dirty: true, errors: [] };
    });
  }, []);
  const setText = (key: TextKey, v: string) =>
    up((d) => {
      d[key] = v;
    });

  // D-247 (H-6): one save at a time. Save and the Status menu wait while a save is on its way, so a
  // double click is one request.
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  const save = useCallback(
    async (status?: ModuleStatus) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setSaving(true);
      const isNew = !st.key;
      const draft = structuredClone(st.draft);
      // D-255: a course week's dates are its cohort's. Publishing a scheduled week keeps it scheduled on its date; the
      // builder neither dates nor undates it (one editor at a time).
      if (
        status === 'published' &&
        isWeekDraft(draft) &&
        db.modules.find((m) => m.id === draft.id)?.status === 'scheduled'
      )
        status = 'scheduled';
      let out: Awaited<ReturnType<typeof act>>;
      try {
        out = await act('saveBuilderModule', { draft, status, base: st.base });
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
      if (out.error) {
        // A refusal (inline) or a failed request (a 403, a 409, no network; the error toast said it too):
        // the draft stays as it is, so nothing typed is lost.
        setSt((prev) => ({ ...prev, errors: out.error!.split('\n') }));
        return;
      }
      const saved = normalizeSaved(draft, status, out.saved?.stepIds);
      const base = out.saved?.version ?? null;
      setSt((prev) => ({ ...prev, key: saved.id, draft: saved, dirty: false, errors: [], base }));
      if (isNew) {
        savedNew.current = saved.id;
        bypass.current = true;
        void navigate(weekPath(saved.id));
      }
    },
    [act, navigate, st.base, st.draft, st.key],
  );

  const d = st.draft;
  const vm = builderR2VM(db, d, { dirty: st.dirty, saved: !!st.key }, now, cohortId ?? undefined);
  // D-174: a course week gets the course's cards; an AI Employee is drawn as the R2 mockup draws it.
  const week = isWeekDraft(d) ? d : null;
  // D-174: what Save would be refused for, while staff type (the copy rules on what changed).
  const issues = st.dirty ? draftIssues(db.modules.find((m) => m.id === d.id) ?? null, d, db.modules) : [];
  const live = db.modules.some((m) => m.id === d.id && m.status === 'published');
  // D-247 (H-8): a published or scheduled module saves only with the Publish modules permission. Said up
  // front, in the notice the builder already uses, so nobody edits for ten minutes and then learns it.
  const storedStatus = db.modules.find((m) => m.id === d.id)?.status;
  const needsPublish =
    !!st.key &&
    storedStatus !== undefined &&
    storedStatus !== 'draft' &&
    savePublishes(d) &&
    !can(db, viewer.actor, 'publish');

  /** Preview as Learner: the published AI Employee as the learner its tier calls for (phase 06 § 6.4). */
  const preview = () => {
    // D-174: a course week previews the learner's course page from the unsaved draft, in place.
    if (week) {
      setPreviewing(true);
      return;
    }
    if (!live) {
      toast('Publish first. Drafts are hidden from learners.', 'info');
      return;
    }
    const path = `/employees/${d.id}`;
    const role = d.tier === 'team' ? 'owner' : 'agent';
    if (isFixture) window.location.assign(`${path}?as=${role}`);
    else window.open(`${path}?preview=${role}`, '_blank', 'noopener');
  };

  const open = (id: string) => void navigate(weekPath(id));

  const step = stepAt !== null ? d.checklist[stepAt] : null;
  const steps = stepRows(d);
  const sections = weekSections(d);
  const sec = sectionOf(d, search.get('section'));
  const counts = sectionCounts(db, d, cohortId);
  const near = neighbours(db, d.id);
  const title = weekTitle(d);
  const goSection = (v: WeekSection) =>
    setSearch(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v === 'steps') next.delete('section');
        else next.set('section', v);
        return next;
      },
      { replace: true },
    );
  const discard = () => setSt(seedState(db, routeId));
  const field = (label: string, at: string | null, value: string, on: (v: string) => void, rows?: number) => (
    <label className={c.lab}>
      {label}
      {at ? <span className={c.fat}>Learners see it on {at}</span> : null}
      {rows ? (
        <TextArea rows={rows} value={value} onChange={(e) => on(e.target.value)} />
      ) : (
        <input className={k.in} value={value} onChange={(e) => on(e.target.value)} />
      )}
    </label>
  );
  const mySessions = cohortId
    ? db.sessions.filter((x) => x.cohortId === cohortId && x.moduleId === d.id).sort((a, b) => a.start - b.start)
    : [];
  const myCohort = cohortId ? (db.cohorts.find((x) => x.id === cohortId) ?? null) : null;
  const runsHere = week && myCohort ? runsOf(db, d.id).some((r) => r.cohortId === myCohort.id) : false;

  return (
    <Page>
      <PageHead
        back={{ to: '/admin/program', label: 'Curriculum' }}
        title={title}
        meta={
          <Status tone={d.status === 'draft' ? 'off' : 'ok'}>{d.status === 'draft' ? 'Draft' : 'Published'}</Status>
        }
        description={d.outcome || undefined}
        right={
          <>
            <span className={clsx(k.row, k.nw)} style={{ gap: 0 }}>
              <button
                type="button"
                className={k.ib}
                aria-label="Previous week"
                disabled={!near.prev}
                onClick={() => near.prev && open(near.prev)}
              >
                <Icon name="r2Back" size={16} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className={clsx(k.ib, p.flip)}
                aria-label="Next week"
                disabled={!near.next}
                onClick={() => near.next && open(near.next)}
              >
                <Icon name="r2Back" size={16} strokeWidth={1.75} />
              </button>
            </span>
            <Button header icon="r2Eye" onClick={preview}>
              Preview
            </Button>
            <Button
              header
              kind="primary"
              disabled={saving || (!st.dirty && !!st.key)}
              aria-busy={saving || undefined}
              onClick={() => void save()}
            >
              Save changes
            </Button>
          </>
        }
      />
      {st.errors.length ? (
        <div role="alert" className={p.alert}>
          {st.errors.map((e) => (
            <p key={e} className={k.p}>
              {e}
            </p>
          ))}
        </div>
      ) : null}
      {needsPublish && !st.errors.length ? (
        <div role="status" className={p.alert}>
          <p className={k.p}>{publishNeededMessage(d)}</p>
        </div>
      ) : null}
      {issues.length && !st.errors.length ? (
        <div role="status" className={p.alert}>
          <p className={k.p}>Fix these before you save:</p>
          {issues.map((e) => (
            <p key={e} className={k.p}>
              {e}
            </p>
          ))}
        </div>
      ) : null}
      <div className={p.srg}>
        {phone ? (
          <Sel
            className={k.full}
            aria-label="Section"
            value={sec}
            onChange={(e) => goSection(e.target.value as WeekSection)}
          >
            {sections.map((id) => (
              <option key={id} value={id}>
                {sectionLabel(id)}
                {counts[id] !== undefined ? ` · ${counts[id]}` : ''}
              </option>
            ))}
          </Sel>
        ) : (
          <nav className={p.srl} aria-label="Sections">
            {sections.map((id) => (
              <button
                key={id}
                type="button"
                className={clsx(p.srb, sec === id && p.on)}
                aria-current={sec === id ? 'true' : undefined}
                onClick={() => goSection(id)}
              >
                <span className={p.srbLabel}>{sectionLabel(id)}</span>
                {counts[id] !== undefined ? <span className={p.srbCount}>{counts[id]}</span> : null}
              </button>
            ))}
          </nav>
        )}
        <div className={k.col}>
          {sec === 'basics' ? (
            <Card title="Basics" sub="What the week is called and what it is for.">
              <div className={k.col}>
                {field('Title', 'the sidebar and the week page', d.name, (v) => up((x) => void (x.name = v)))}
                {field('Outcome', 'the week page, under the title', d.outcome, (v) => up((x) => void (x.outcome = v)))}
                {week ? <WhereItRuns db={db} moduleId={week.id} /> : null}
                {week && cohortId ? (
                  <p className={clsx(k.p, k.me)}>
                    What teams turned in for this week is on{' '}
                    <Link
                      className={clsx(k.lk, p.inlink)}
                      to={`${cohortPath(cohortId, 'submissions')}?week=${encodeURIComponent(week.id)}`}
                    >
                      Cohort › Submissions
                    </Link>
                    .
                  </p>
                ) : null}
                {field('Sidebar label', null, d.short, (v) => setText('short', v))}
                {field('Outcome headline', null, d.headline, (v) => setText('headline', v))}
                {field('For', null, d.forWho, (v) => setText('forWho', v))}
                <div className={c.lab} role="group" aria-label="Icon">
                  Icon
                  <div className={k.row}>
                    {MODULE_ICONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        className={clsx(s.tile, s.mt, d.icon === ic && s.mtOn)}
                        aria-label={`Icon ${ic}`}
                        aria-pressed={d.icon === ic}
                        onClick={() => up((x) => void (x.icon = ic))}
                      >
                        <Icon name={ic} size={16} strokeWidth={1.75} />
                      </button>
                    ))}
                  </div>
                </div>
                {d.outputs.map((o, i) => (
                  <label key={i} className={c.lab}>
                    {`Output ${i + 1}`}
                    <input
                      className={k.in}
                      placeholder="What it produces"
                      value={o}
                      onChange={(e) => up((x) => void (x.outputs[i] = e.target.value))}
                    />
                  </label>
                ))}
                {field('Run button label', null, d.runLabel, (v) => setText('runLabel', v))}
                {field('Platform', null, d.platform, (v) => setText('platform', v))}
                <div className={c.lab}>
                  Tier access
                  <span>
                    <TierPill tier={d.tier} onChange={(t) => up((x) => void (x.tier = t))} />
                  </span>
                </div>
                {week ? (
                  <label className={c.lab}>
                    Tone
                    <Sel
                      className={k.full}
                      value={week.tone ?? ''}
                      onChange={(e) =>
                        up((x) => (e.target.value ? void (x.tone = e.target.value) : void delete x.tone))
                      }
                    >
                      <option value="">Not set</option>
                      {TONES.map((t) => (
                        <option key={t} value={t}>
                          {TONE_LABELS[t]}
                        </option>
                      ))}
                    </Sel>
                  </label>
                ) : (
                  <label className={c.lab}>
                    Live session
                    <Sel
                      className={k.full}
                      value={d.session ? String(d.session) : ''}
                      onChange={(e) => up((x) => void (x.session = e.target.value ? Number(e.target.value) : null))}
                    >
                      {vm.sessionOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Sel>
                  </label>
                )}
                {field('Instructor notes', null, d.notes, (v) => setText('notes', v), 3)}
                <label className={c.lab}>
                  System prompt
                  <TextArea
                    rows={6}
                    className={k.mo}
                    value={d.prompt}
                    onChange={(e) => setText('prompt', e.target.value)}
                  />
                </label>
              </div>
            </Card>
          ) : null}
          {sec === 'steps' ? (
            <section className={k.cd} aria-label="Steps">
              <div className={k.cdh}>
                <div className={clsx(k.col, k.colS, p.grow)} style={{ gap: 0 }}>
                  <h2 className={k.h2}>Steps</h2>
                  <span className={k.me}>
                    {steps.length ? 'In order. A learner ticks each one off.' : 'This week has no steps yet.'}
                  </span>
                </div>
                <Button icon="r2Plus" onClick={() => up((x) => void (x.checklist = addStep(x.checklist)))}>
                  Add a step
                </Button>
              </div>
              {steps.length ? (
                <div className={c.wkl}>
                  {steps.map((r, i) => (
                    <div key={r.key} className={clsx(p.wkr, p.stp)} data-step={i + 1}>
                      {!phone ? (
                        <button
                          type="button"
                          className={p.grp}
                          aria-label={`Move step ${i + 1}: press Alt with an arrow key`}
                          onKeyDown={(e) => {
                            if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
                            e.preventDefault();
                            const to = e.key === 'ArrowUp' ? i - 1 : i + 1;
                            if (to >= 0 && to < steps.length)
                              up((x) => void (x.checklist = moveStepTo(x.checklist, i, to)));
                          }}
                        >
                          <Icon name="r2Grip" size={14} strokeWidth={2.6} />
                        </button>
                      ) : null}
                      <span className={clsx(c.wn, c.sm)}>{i + 1}</span>
                      <button type="button" className={p.wkm} onClick={() => setStepAt(i)}>
                        <span className={clsx(k.w5, k.el, p.wkt)}>{r.title}</span>
                        <span className={clsx(k.me, k.el)}>{r.doneWhen}</span>
                      </button>
                      <div className={p.wkc}>
                        <span className={p.who}>
                          {r.who.map((x) => (
                            <span key={x} className={clsx(k.pl, x === 'Owner' ? k.info : k.ok)}>
                              {x}
                            </span>
                          ))}
                        </span>
                      </div>
                      <div className={clsx(p.wks, k.tn)}>{r.time}</div>
                      <Menu
                        className={p.menu}
                        label={`Actions for step ${i + 1}`}
                        items={[
                          { label: 'Edit step', onSelect: () => setStepAt(i) },
                          {
                            label: 'Move up',
                            disabled: i === 0,
                            onSelect: () => up((x) => void (x.checklist = moveStepTo(x.checklist, i, i - 1))),
                          },
                          {
                            label: 'Move down',
                            disabled: i === steps.length - 1,
                            onSelect: () => up((x) => void (x.checklist = moveStepTo(x.checklist, i, i + 1))),
                          },
                          {
                            label: 'Duplicate step',
                            onSelect: () => up((x) => void (x.checklist = duplicateStep(x.checklist, i))),
                          },
                          'separator',
                          { label: 'Remove step', danger: true, onSelect: () => setRemoveAt(i) },
                        ]}
                        placement={i >= steps.length - 2 ? 'above' : 'below-right'}
                        trigger={(t) => (
                          <button
                            type="button"
                            className={k.ib}
                            aria-label="More actions"
                            {...t.props}
                            onClick={t.toggle}
                          >
                            <Icon name="r2More" size={16} strokeWidth={2.6} />
                          </button>
                        )}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={k.cdb}>
                  <p className={clsx(k.p, k.s2)}>Add the first step, or duplicate a built week and change it.</p>
                </div>
              )}
            </section>
          ) : null}
          {sec === 'page' && week ? (
            <>
              <CoursePageCard db={db} draft={week} up={up} act={act} />
              <p className={clsx(k.p, k.me)}>
                What every week shares (the course intro, the rules, the glossary) is in{' '}
                <Link className={clsx(k.lk, p.inlink)} to="/admin/program/course">
                  Course Settings
                </Link>
                .
              </p>
            </>
          ) : null}
          {sec === 'live' && week ? (
            <>
              <section className={k.cd} aria-label="Live Sessions">
                <div className={k.cdh}>
                  <div className={clsx(k.col, k.colS, p.grow)} style={{ gap: 0 }}>
                    <h2 className={k.h2}>Live Sessions</h2>
                    <span className={k.me}>
                      Sessions belong to the cohort. This week only says what happens in them.
                    </span>
                  </div>
                  {cohortId ? <ButtonLink to={cohortPath(cohortId, 'schedule')}>Open Schedule</ButtonLink> : null}
                </div>
                {mySessions.length ? (
                  <div className={c.wkl}>
                    {mySessions.map((x) => (
                      <div key={x.id} className={clsx(p.wkr, p.stp)}>
                        <span className={c.mt}>
                          <Icon
                            name={x.kind === 'live_build' ? 'r2Play' : 'r2Community'}
                            size={16}
                            strokeWidth={1.75}
                          />
                        </span>
                        <Link className={p.wkm} to={cohortPath(x.cohortId, 'schedule')}>
                          <span className={clsx(k.w5, k.el, p.wkt)}>{x.title}</span>
                          <span className={clsx(k.me, k.el)}>
                            {fmt.mtDay(x.start)} · {fmt.mtCt(x.start)}
                          </span>
                        </Link>
                        <div className={p.wks}>
                          {x.zoom ? <Status tone="ok">Ready</Status> : <Status tone="warn">Waiting</Status>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={k.cdb}>
                    <p className={clsx(k.p, k.s2)}>
                      {week.course.week === 0
                        ? 'The setup week is self-paced. It has no sessions.'
                        : myCohort
                          ? runsHere
                            ? `The ${cohortLabel(myCohort)} has no sessions for this week yet. `
                            : `The ${cohortLabel(myCohort)} doesn’t run this week. `
                          : ''}
                      {week.course.week > 0 && myCohort && runsHere ? (
                        <Link className={clsx(k.lk, p.inlink)} to={cohortPath(myCohort.id, 'schedule')}>
                          Add them in Schedule
                        </Link>
                      ) : null}
                    </p>
                  </div>
                )}
              </section>
              <AgendaCard db={db} draft={week} up={up} act={act} which="liveBuild" />
              <AgendaCard db={db} draft={week} up={up} act={act} which="officeHours" />
            </>
          ) : null}
          {sec === 'cards' && week ? <HireCardsCard db={db} draft={week} up={up} act={act} /> : null}
          {sec === 'kit' ? (
            <>
              {week ? <SkillsCard db={db} draft={week} up={up} act={act} /> : null}
              {week ? <KitCard db={db} draft={week} up={up} act={act} /> : null}
              <Card
                title={`Files · ${vm.files.length}`}
                pad={false}
                right={
                  <Button kind="quiet" icon="r2Plus" onClick={() => up((x) => void x.files.push(nextFile(x)))}>
                    Attach
                  </Button>
                }
              >
                {vm.files.map((f, i) => (
                  <div key={`${i}:${f.name}`} className={k.li}>
                    <Icon name="r2File" size={16} strokeWidth={1.75} />
                    <span className={clsx(k.mo, k.el, k.sp)}>{f.name}</span>
                    <span className={k.mu}>{f.desc}</span>
                    <span className={clsx(k.me, k.tn, s.size)}>{f.size}</span>
                    <Button
                      kind="quiet"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => up((x) => void x.files.splice(i, 1))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div className={k.cdb}>
                  <span className={clsx(k.row, k.me)}>Skill guide: {vm.linked ? 'Linked' : 'Not linked'}</span>
                </div>
              </Card>
              <p className={clsx(k.p, k.me)}>
                Files live in the{' '}
                <Link className={clsx(k.lk, p.inlink)} to="/admin/program/vault">
                  Resource Vault
                </Link>
                . A week only points at them.
              </p>
            </>
          ) : null}
          {sec === 'forms' && week ? (
            <>
              <IntakeCard db={db} draft={week} up={up} act={act} />
              <StackCard db={db} draft={week} up={up} act={act} />
            </>
          ) : null}
          {st.dirty ? (
            <div className={p.svb} role="status">
              <span className={p.svbText}>Unsaved changes to {title}</span>
              <Button onClick={discard}>Discard</Button>
              <Button kind="primary" disabled={saving} onClick={() => void save()}>
                Save changes
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {step && stepAt !== null ? (
        <Modal
          title={`Step ${stepAt + 1}`}
          width={880}
          onClose={() => setStepAt(null)}
          foot={
            <Button kind="primary" onClick={() => setStepAt(null)}>
              Done
            </Button>
          }
        >
          <label className={c.lab}>
            Title
            <input
              className={k.in}
              value={d.kind === 'week' ? step.ch || step.text : step.text}
              onChange={(e) => {
                const v = e.target.value;
                // D-212: on a course week the title the learner sees is `ch`, so the title edits it.
                up((x) =>
                  x.kind === 'week' ? void (x.checklist[stepAt]!.ch = v) : void (x.checklist[stepAt]!.text = v),
                );
              }}
            />
          </label>
          <label className={c.lab}>
            Hint
            <input
              className={k.in}
              placeholder="Optional hint"
              value={step.hint}
              onChange={(e) => up((x) => void (x.checklist[stepAt]!.hint = e.target.value))}
            />
          </label>
          <label className={c.lab}>
            Chapter
            <input
              className={k.in}
              value={step.ch}
              onChange={(e) => up((x) => void (x.checklist[stepAt]!.ch = e.target.value))}
            />
          </label>
          <div className={clsx(k.row, k.nw)}>
            <label className={clsx(c.lab, k.sp)}>
              Replay at
              <input
                className={k.in}
                defaultValue={`${Math.floor(step.t / 60)}:${String(step.t % 60).padStart(2, '0')}`}
                onChange={(e) => {
                  const v = parseReplayAt(e.target.value);
                  up((x) => void (x.checklist[stepAt]!.t = v));
                }}
              />
            </label>
            <label className={clsx(c.lab, k.sp)}>
              Minutes
              <input
                className={k.in}
                type="number"
                min={1}
                value={step.mins}
                onChange={(e) => {
                  const v = parseMinutes(e.target.value);
                  up((x) => void (x.checklist[stepAt]!.mins = v));
                }}
              />
            </label>
          </div>
          {week ? (
            <StepWeekFields
              step={step}
              picks={{
                kit: weekKit(db, week).map((item) => ({ id: item.id, title: item.title })),
                sessions: weekSessions(db, week).map((item) => ({ id: item.id, title: item.title })),
                glossary: (programCourse(db)?.glossary ?? []).map((t) => ({ id: t.id, term: t.term })),
                videoIds: moduleVideos(d).flatMap((v) => (v.block.id ? [v.block.id] : [])),
              }}
              onChange={(fn) => up((x) => void fn(x.checklist[stepAt]!))}
            />
          ) : null}
        </Modal>
      ) : null}

      {week && previewing ? (
        <CoursePreview
          db={db}
          draft={week}
          phone={phone}
          cohortId={cohortId ?? undefined}
          onClose={() => setPreviewing(false)}
        />
      ) : null}

      {/* D-172: Remove step asks first (Connor's request). The step leaves the draft; Save changes persists it. */}
      {removeAt !== null && d.checklist[removeAt] ? (
        <Confirm
          title={`Remove step ${removeAt + 1}?`}
          body={`“${d.checklist[removeAt]!.text}” is removed when you save. Learners’ checks on it are cleared.`}
          cta="Remove step"
          danger
          onConfirm={() => {
            const at = removeAt;
            up((x) => void (x.checklist = removeStep(x.checklist, at)));
          }}
          onClose={() => setRemoveAt(null)}
        />
      ) : null}

      {/* The approved net-new interaction (phase 06 § 6.3, D-015): leaving with unsaved changes asks first. */}
      {blocker.state === 'blocked' ? (
        <Modal
          title="Discard unsaved changes?"
          width={420}
          onClose={() => blocker.reset?.()}
          foot={
            <>
              <Button onClick={() => blocker.reset?.()}>Keep Editing</Button>
              <Button kind="primary" onClick={() => blocker.proceed?.()}>
                Discard
              </Button>
            </>
          }
        >
          {null}
        </Modal>
      ) : null}
    </Page>
  );
}

export default Component;
