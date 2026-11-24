// Course settings `/admin/curriculum/course` (D-174, learner build PR 2c): what the cohort holds for
// the whole course, editable in the builder. Reached from a course week's Course page card.
//
//   - Release plan: the cohort's name and cadence line, when the pre-launch preview opens and the time
//     a week opens by default, in Mountain Time (the zone itself stays Mountain; the brief leaves the
//     picker out). Saved with `saveCohortPlan`.
//   - Shared pages: what every week shares (the course intro, the shared rules, the before and after
//     pages), in a draft of its own; "Save pages" saves it whole with `saveCohortCourse`.
//   - Copy strings: the learner-facing lines kept by key (Utah Life's lock line among them), each saved
//     with `saveCopyString`.
//
// Every write is audited and passes the copy rules on what it changes. Labels only here (D-173's guard).

import { useState } from 'react';
import clsx from 'clsx';
import type { CopyString } from '@ai/core';
import type { CohortCourse, GlossaryTerm } from '@ai/core/course-types';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Modal } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { PageHead, Sel, TextArea, k } from '../../components/r2/kit';
import { useAct, useDb } from '../../data/hooks';
import { useRecordCrumb } from '../../shell/admin/chrome';
import { copyRows, courseCohort, hintPairs, pairsText, planArgs, planForm, textPairs } from './CourseSettings.vm';
import type { PlanForm } from './CourseSettings.vm';
import { listItems, listText, moveBy, removeAt } from './WeekBuilder.vm';
import s from './ModuleBuilder.module.css';
import w from './WeekBuilder.module.css';

function Errors({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div role="alert" className={s.alert}>
      {error.split('\n').map((e) => (
        <p key={e} className={k.p}>
          {e}
        </p>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, hint, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; hint?: string; type?: string }) {
  return (
    <label className={s.lab}>
      {label}
      <input className={k.in} type={type} value={value} placeholder={hint} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Area({ label, value, onChange, rows = 3, note }: { label: string; value: string; onChange: (v: string) => void; rows?: number; note?: string }) {
  return (
    <label className={s.lab}>
      {label}
      <TextArea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      {note ? <span className={clsx(k.me, w.hint)}>{note}</span> : null}
    </label>
  );
}

export function Component() {
  const db = useDb();
  const co = courseCohort(db);
  // The breadcrumb: Admin / Build / Curriculum / Course settings.
  useRecordCrumb('Course settings');
  if (!co) {
    return (
      <Page>
        <PageHead title="Course settings" back={{ to: '/admin/curriculum', label: 'Curriculum' }} />
        <p className={k.p}>This database holds no course yet.</p>
      </Page>
    );
  }
  return (
    <Page>
      <PageHead
        title="Course settings"
        description="What the cohort holds for the whole course: when it opens, the pages every week shares, and the copy strings."
        back={{ to: '/admin/curriculum', label: 'Curriculum' }}
      />
      <ReleasePlan key={`plan-${co.id}`} cohortId={co.id} initial={planForm(co)} />
      {co.course ? <SharedPages key={`pages-${co.id}`} cohortId={co.id} initial={co.course} /> : null}
      <CopyStrings rows={copyRows(db)} />
    </Page>
  );
}

function ReleasePlan({ cohortId, initial }: { cohortId: string; initial: PlanForm }) {
  const act = useAct();
  const [f, setF] = useState(initial);
  const [error, setError] = useState('');
  const save = async () => {
    const out = await act('saveCohortPlan', planArgs(cohortId, f));
    setError(out.error ?? '');
  };
  return (
    <Card
      title="Release plan"
      right={
        <Button kind="primary" onClick={() => void save()}>
          Save plan
        </Button>
      }
    >
      <div className={k.col}>
        <Errors error={error} />
        <Field label="Cohort name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <Field label="Cadence" value={f.cadence} onChange={(v) => setF({ ...f, cadence: v })} hint="Wednesday builds at 12:00 PM MT" />
        <div className={clsx(k.row, k.nw, w.dt)}>
          <span className={k.sp}>
            <Field label="Preview opens (MT)" type="date" value={f.previewDate} onChange={(v) => setF({ ...f, previewDate: v })} />
          </span>
          <span className={k.sp}>
            <Field label="Time" type="time" value={f.previewTime} onChange={(v) => setF({ ...f, previewTime: v })} />
          </span>
        </div>
        <Field label="A week opens at (MT)" type="time" value={f.defaultOpenTime} onChange={(v) => setF({ ...f, defaultOpenTime: v })} />
        <div className={clsx(k.row, k.nw, w.dt)}>
          <span className={k.sp}>
            <Field label="Welcome email sends at (MT)" type="date" value={f.welcomeDate} onChange={(v) => setF({ ...f, welcomeDate: v })} />
          </span>
          <span className={k.sp}>
            <Field label="Time" type="time" value={f.welcomeTime} onChange={(v) => setF({ ...f, welcomeTime: v })} />
          </span>
        </div>
        <p className={clsx(k.p, k.me)}>Times are Mountain Time. Leave the preview date empty for no preview. Leave the welcome date empty to send when access opens.</p>
      </div>
    </Card>
  );
}

function SharedPages({ cohortId, initial }: { cohortId: string; initial: CohortCourse }) {
  const act = useAct();
  const [c, setC] = useState<CohortCourse>(initial);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const up = (fn: (x: CohortCourse) => void) =>
    setC((prev) => {
      const next = structuredClone(prev);
      fn(next);
      setDirty(true);
      return next;
    });
  const save = async () => {
    const out = await act('saveCohortCourse', { cohortId, course: c });
    setError(out.error ?? '');
    if (!out.error) setDirty(false);
  };
  // Lists of lines and "Label: text" pairs keep the text staff type; each change is read back at once.
  const [how, setHow] = useState(listText(initial.intro.how));
  const [rules, setRules] = useState(listText(initial.shared.officeHoursRules));
  const [intake, setIntake] = useState(listText(initial.before.intake));
  const [safe, setSafe] = useState(listText(initial.before.safeSharing));
  const [grad, setGrad] = useState(listText(initial.after.graduation));
  const [paths, setPaths] = useState(pairsText(initial.shared.paths));
  const [evidence, setEvidence] = useState(pairsText(initial.shared.evidence));
  const [afterPaths, setAfterPaths] = useState(pairsText(initial.after.paths));
  return (
    <>
    <Card
      title="Shared pages"
      right={
        <Button kind="primary" disabled={!dirty} onClick={() => void save()}>
          {dirty ? 'Save pages' : 'Saved'}
        </Button>
      }
    >
      <div className={k.col}>
        <Errors error={error} />
        <Field label="Course title" value={c.intro.title} onChange={(v) => up((x) => (x.intro.title = v))} />
        <Area label="Subtitle" value={c.intro.sub} onChange={(v) => up((x) => (x.intro.sub = v))} />
        <Area
          label="How it works"
          value={how}
          note="One per line."
          onChange={(v) => {
            setHow(v);
            up((x) => (x.intro.how = listItems(v)));
          }}
        />
        <Area label="The owner’s role" value={c.intro.roles.owner} onChange={(v) => up((x) => (x.intro.roles.owner = v))} />
        <Area label="The AI Implementer’s role" value={c.intro.roles.operator} onChange={(v) => up((x) => (x.intro.roles.operator = v))} />
        <Area label="Scope" value={c.intro.scope} onChange={(v) => up((x) => (x.intro.scope = v))} />
        <Area label="Support" value={c.intro.support} onChange={(v) => up((x) => (x.intro.support = v))} />
        {/* D-187: the learner portal's Cohort Community link, on Home. Empty hides it. */}
        <Field label="Community link" type="url" hint="https://" value={c.intro.community ?? ''} onChange={(v) => up((x) => (x.intro.community = v))} />
        <Field label="Instructor" value={c.intro.instructor} onChange={(v) => up((x) => (x.intro.instructor = v))} />
        <Area label="Holiday note" value={c.intro.holiday} onChange={(v) => up((x) => (x.intro.holiday = v))} />
        <Field label="Join label" value={c.intro.join.label} onChange={(v) => up((x) => (x.intro.join.label = v))} />
        <Area label="Join note" value={c.intro.join.note} onChange={(v) => up((x) => (x.intro.join.note = v))} />
        <Area
          label="Office hours rules"
          value={rules}
          note="One per line."
          onChange={(v) => {
            setRules(v);
            up((x) => (x.shared.officeHoursRules = listItems(v)));
          }}
        />
        <Area
          label="Evidence"
          value={evidence}
          note="One per line: a label, a colon, then the hint."
          onChange={(v) => {
            setEvidence(v);
            up((x) => (x.shared.evidence = hintPairs(v)));
          }}
        />
        <Area
          label="Paths"
          value={paths}
          note="One per line: a label, a colon, then the text."
          onChange={(v) => {
            setPaths(v);
            up((x) => (x.shared.paths = textPairs(v)));
          }}
        />
        <Area label="Missed a week" value={c.shared.missedAWeek} onChange={(v) => up((x) => (x.shared.missedAWeek = v))} />
        <Area label="Estimate note" value={c.shared.estimateNote} onChange={(v) => up((x) => (x.shared.estimateNote = v))} />
        <Area
          label="Before Week 1: intake"
          value={intake}
          note="One per line."
          onChange={(v) => {
            setIntake(v);
            up((x) => (x.before.intake = listItems(v)));
          }}
        />
        <Area label="Practice set note" value={c.before.practiceSetNote} onChange={(v) => up((x) => (x.before.practiceSetNote = v))} />
        <Area
          label="Safe sharing"
          value={safe}
          note="One per line."
          onChange={(v) => {
            setSafe(v);
            up((x) => (x.before.safeSharing = listItems(v)));
          }}
        />
        <Area
          label="After the cohort: graduation"
          value={grad}
          note="One per line."
          onChange={(v) => {
            setGrad(v);
            up((x) => (x.after.graduation = listItems(v)));
          }}
        />
        <Area label="Graduation note" value={c.after.graduationNote} onChange={(v) => up((x) => (x.after.graduationNote = v))} />
        <Area
          label="After the cohort: paths"
          value={afterPaths}
          note="One per line: a label, a colon, then the text."
          onChange={(v) => {
            setAfterPaths(v);
            up((x) => (x.after.paths = textPairs(v)));
          }}
        />
        <Area label="No paywall" value={c.after.noPaywall} onChange={(v) => up((x) => (x.after.noPaywall = v))} />
        <p className={clsx(k.p, k.me)}>The rubric, readiness gates, data pack, lanes and pilot questions keep their seeded rows here; PR 4’s new weeks bring their own.</p>
      </div>
    </Card>
    <GlossaryEditor
      terms={c.glossary ?? []}
      onChange={(glossary) => up((x) => {
        x.glossary = glossary;
      })}
    />
    </>
  );
}

function blankTerm(taken: readonly string[]): GlossaryTerm {
  let n = 1;
  while (taken.includes(`term-${n}`)) n += 1;
  return { id: `term-${n}`, term: '', short: '', long: '', aliases: [] };
}

function GlossaryEditor({ terms, onChange }: { terms: GlossaryTerm[]; onChange: (terms: GlossaryTerm[]) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const setAt = (i: number, term: GlossaryTerm) => onChange(terms.map((t, j) => (j === i ? term : t)));
  return (
    <Card title="Glossary">
      <div className={k.col}>
        <p className={clsx(k.p, k.me)}>Terms a step page can underline. Save pages stores them with the shared pages.</p>
        {terms.length === 0 ? <p className={clsx(k.p, k.mu)}>No terms yet.</p> : null}
        {terms.map((t, i) => (
          <div key={i} className={k.col}>
            <div className={clsx(k.row, k.nw)}>
              <span className={k.sp}>{t.term || 'New term'}</span>
              <Button kind="quiet" icon="r2Up" aria-label={`Move glossary term ${i + 1} up`} onClick={() => onChange(moveBy(terms, i, -1))} />
              <Button kind="quiet" icon="r2Down" aria-label={`Move glossary term ${i + 1} down`} onClick={() => onChange(moveBy(terms, i, 1))} />
              <Button kind="quiet" aria-label={`${open === i ? 'Close' : 'Edit'} glossary term ${i + 1}`} onClick={() => setOpen(open === i ? null : i)}>
                {open === i ? 'Close' : 'Edit'}
              </Button>
              <Button kind="quiet" aria-label={`Remove glossary term ${i + 1}`} onClick={() => { onChange(removeAt(terms, i)); setOpen(null); }}>
                Remove
              </Button>
            </div>
            {open === i ? (
              <>
                <Field label="Id" value={t.id} onChange={(id) => setAt(i, { ...t, id })} />
                <Field label="Term" value={t.term} onChange={(term) => setAt(i, { ...t, term })} />
                <Area label="Short" value={t.short} onChange={(short) => setAt(i, { ...t, short })} />
                <Area label="Long" value={t.long} rows={4} onChange={(long) => setAt(i, { ...t, long })} />
                <Area
                  label="Aliases"
                  value={t.aliases.join('\n')}
                  note="One per line. A whole word or phrase."
                  onChange={(v) => setAt(i, { ...t, aliases: v.split('\n').map((line) => line.trim()).filter(Boolean) })}
                />
                <Field
                  label="First step"
                  value={t.firstStep === undefined ? '' : String(t.firstStep)}
                  hint="Blank underlines it on every step."
                  onChange={(v) => {
                    const n = Number(v);
                    const next = { ...t };
                    if (v.trim() && Number.isInteger(n)) next.firstStep = n;
                    else delete next.firstStep;
                    setAt(i, next);
                  }}
                />
                <label className={clsx(k.row, k.nw, w.check)}>
                  <input
                    type="checkbox"
                    checked={t.underline !== false}
                    onChange={(e) => {
                      const next = { ...t };
                      if (e.target.checked) delete next.underline;
                      else next.underline = false;
                      setAt(i, next);
                    }}
                  />
                  Underline on pages
                </label>
              </>
            ) : null}
          </div>
        ))}
        <Button
          kind="quiet"
          icon="r2Plus"
          onClick={() => {
            onChange([...terms, blankTerm(terms.map((t) => t.id))]);
            setOpen(terms.length);
          }}
        >
          Add term
        </Button>
      </div>
    </Card>
  );
}

interface CopyForm {
  key: string;
  value: string;
  audience: 'learner' | 'staff';
  fresh: boolean;
}

function CopyStrings({ rows }: { rows: CopyString[] }) {
  const act = useAct();
  const [f, setF] = useState<CopyForm | null>(null);
  const [error, setError] = useState('');
  const save = async () => {
    if (!f) return;
    const out = await act('saveCopyString', { key: f.key, value: f.value, audience: f.audience });
    if (out.error) setError(out.error);
    else {
      setF(null);
      setError('');
    }
  };
  return (
    <Card
      title={`Copy strings · ${rows.length}`}
      pad={false}
      right={
        <Button kind="quiet" icon="r2Plus" onClick={() => setF({ key: '', value: '', audience: 'learner', fresh: true })}>
          Add copy string
        </Button>
      }
    >
      {rows.map((r) => (
        <div key={r.key} className={clsx(k.li, w.row)}>
          <div className={clsx(k.sp, w.text)}>
            <span className={k.mo}>{r.key}</span>
            <span className={w.sub}>{r.value}</span>
          </div>
          <Button kind="quiet" aria-label={`Edit ${r.key}`} onClick={() => setF({ key: r.key, value: r.value, audience: r.audience === 'staff' ? 'staff' : 'learner', fresh: false })}>
            Edit
          </Button>
        </div>
      ))}
      {f ? (
        <Modal
          title={f.fresh ? 'Add copy string' : f.key}
          onClose={() => setF(null)}
          foot={
            <>
              <Button onClick={() => setF(null)}>Cancel</Button>
              <Button kind="primary" onClick={() => void save()}>
                Save
              </Button>
            </>
          }
        >
          <Errors error={error} />
          {f.fresh ? <Field label="Key" value={f.key} hint="locked.opens" onChange={(v) => setF({ ...f, key: v })} /> : null}
          <Area label="Text" value={f.value} onChange={(v) => setF({ ...f, value: v })} />
          <label className={s.lab}>
            Audience
            <Sel className={k.full} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value === 'staff' ? 'staff' : 'learner' })}>
              <option value="learner">Learners</option>
              <option value="staff">Staff</option>
            </Sel>
          </label>
        </Modal>
      ) : null}
    </Card>
  );
}

export default Component;
