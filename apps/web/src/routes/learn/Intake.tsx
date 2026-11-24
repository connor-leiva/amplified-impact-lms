// /learn/week/0/intake (D-196). The week's intake questions, autosaved for the team. Markup only.
// D-246: once the team has submitted, Download Your Answers (PDF) hands the learner their team's answers as a PDF
// (`GET /api/intake/pdf`, which takes the team from the session). A staff preview has no team, so no button.
// H-10 (D-248): editable only once the answers have loaded (a failed load says so, with Retry); a save sends only what
// changed (`intake-sync.ts`), and a teammate's change to the same question stops the page with a reload message, what
// was typed still on screen to copy. H-11 (D-248): a question not required says "Optional", as the v3 drawer does
// (D-229), and a submit with a required answer missing names the questions, marks each and moves to the first.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { learnerOf } from '@ai/core/learner';
import { fmt } from '@ai/core';
import { isLockedWeek } from '@ai/core/course';
import type { CourseIntake, IntakeQuestion } from '@ai/core/course-types';
import type { IntakeAnswers } from '@ai/core/intake';
import { cleanIntakeAnswers, intakeMissing, intakeQuestions } from '@ai/core/intake';
import { Icon } from '../../components/Icon';
import { useLearn } from './data';
import { DOWNLOAD_ANSWERS_LABEL, downloadIntakePdf } from './intake-pdf';
import { learnWeek } from './routes';
import { v3For } from './lms-v3/v3';
import { FORM_UI } from './lms-v3/form.vm';
import { intakeSaver, loadIntake } from './intake-sync';
import type { IntakeSave, IntakeSaver } from './intake-sync';
import s from './Intake.module.css';
import l from './Learn.module.css';

const WAIT = 600;
/** D-246: the download didn't reach the browser (the route refused, or the request failed). */
export const PDF_FAILED = 'Your answers didn’t download. Try again.';

/** The words a submit with a required answer missing says, the server's own. */
export const INTAKE_MISSING = 'Some required answers are missing.';

/** Where a question's field is: its text box, or its first choice. */
export const fieldId = (q: Pick<IntakeQuestion, 'id' | 'kind'>): string => (q.kind === 'choice' || q.kind === 'multi' ? `q-${q.id}-0` : `q-${q.id}`);

type Load = { kind: 'loading' } | { kind: 'ready' } | { kind: 'failed'; error: string; retry: boolean };

interface FieldProps {
  q: IntakeQuestion;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  /** A required answer a submit found missing. */
  invalid: boolean;
  /** After a refused save (409): what was typed stays to copy, and nothing more is taken. */
  readOnly: boolean;
}

function Field({ q, value, onChange, invalid, readOnly }: FieldProps) {
  const id = `q-${q.id}`;
  const msgId = `${id}-msg`;
  // D-229's marker, the drawer's word: a question not required says so, so the required ones stand out.
  const opt = q.required ? null : <> <span className={s.opt}>{FORM_UI.optional}</span></>;
  const picks = q.kind === 'choice' || q.kind === 'multi';
  const msg = invalid ? (
    <span className={s.msg} id={msgId}>
      {picks ? FORM_UI.needChoice : FORM_UI.needText}
    </span>
  ) : null;
  const text = {
    id,
    readOnly,
    'aria-required': q.required ? true : undefined,
    'aria-invalid': invalid ? true : undefined,
    'aria-describedby': invalid ? msgId : undefined,
  };
  if (q.kind === 'long') {
    return (
      <div className={s.item}>
        <label className={s.field} htmlFor={id} data-state={invalid ? 'error' : undefined}>
          <span>
            {q.label}
            {opt}
          </span>
          {q.help ? <span className={s.help}>{q.help}</span> : null}
          <textarea {...text} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
        </label>
        {msg}
      </div>
    );
  }
  if (picks) {
    const multi = q.kind === 'multi';
    const picked = Array.isArray(value) ? value : [];
    return (
      <fieldset
        className={s.field}
        data-state={invalid ? 'error' : undefined}
        aria-labelledby={`${id}-l`}
        aria-describedby={invalid ? msgId : undefined}
        {...(multi ? {} : { role: 'radiogroup', 'aria-required': q.required ? true : undefined, 'aria-invalid': invalid ? true : undefined })}
      >
        <legend id={`${id}-l`}>
          {q.label}
          {opt}
        </legend>
        {q.help ? <span className={s.help}>{q.help}</span> : null}
        {(q.options ?? []).map((opt, i) => (
          <label key={opt} className={s.choice}>
            {multi ? (
              <input
                id={`${id}-${i}`}
                type="checkbox"
                disabled={readOnly}
                aria-invalid={invalid ? true : undefined}
                checked={picked.includes(opt)}
                onChange={(e) => onChange(e.target.checked ? [...picked, opt] : picked.filter((x) => x !== opt))}
              />
            ) : (
              <input id={`${id}-${i}`} type="radio" name={q.id} disabled={readOnly} checked={value === opt} onChange={() => onChange(opt)} />
            )}
            {opt}
          </label>
        ))}
        {msg}
      </fieldset>
    );
  }
  return (
    <div className={s.item}>
      <label className={s.field} htmlFor={id} data-state={invalid ? 'error' : undefined}>
        <span>
          {q.label}
          {opt}
        </span>
        {q.help ? <span className={s.help}>{q.help}</span> : null}
        <input {...text} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
      </label>
      {msg}
    </div>
  );
}

export function IntakePage({ week }: { week: number }) {
  const { course, viewer } = useLearn();
  const staff = viewer.actor.kind === 'staff';
  const open = course.kind === 'ready' ? course.payload.course.weeks.find((w) => w.week === week && !isLockedWeek(w)) : undefined;
  const form: CourseIntake | undefined = open && 'intake' in open ? open.intake : undefined;
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [load, setLoad] = useState<Load>(staff || !form ? { kind: 'ready' } : { kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [missing, setMissing] = useState<string[]>([]);
  const [stale, setStale] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saver = useRef<IntakeSaver | null>(null);
  const latest = useRef(answers);
  latest.current = answers;
  const alertRef = useRef<HTMLDivElement>(null);
  // Where focus goes next: the refused save's message, or the first missing answer's field (`n` makes each new).
  const [focus, setFocus] = useState<{ id: string | null; n: number } | null>(null);

  useEffect(() => {
    if (staff || !form) {
      setLoad({ kind: 'ready' });
      return;
    }
    // No step back to 'loading' on a Retry or a reload: a failed page stays disabled, a loaded one stays on screen.
    let alive = true;
    void loadIntake().then((out) => {
      if (!alive) return;
      if (out.kind === 'failed') {
        saver.current = null;
        setLoad({ kind: 'failed', error: out.error, retry: out.retry });
        return;
      }
      saver.current = intakeSaver(form, out.body.answers);
      setAnswers(out.body.answers);
      setSavedAt(out.body.updatedAt);
      setSubmittedAt(out.body.submittedAt);
      setError(null);
      setLoad({ kind: 'ready' });
    });
    return () => {
      alive = false;
    };
  }, [staff, form, attempt]);

  // A refused save brings its message into view (what was typed stays, read-only); missing answers move to the first.
  // Centred rather than at the edge, so the shell's sticky header never covers it.
  useEffect(() => {
    if (!focus) return;
    const el = focus.id === null ? alertRef.current : document.getElementById(focus.id);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView?.({ block: 'center' });
  }, [focus]);

  const showMissing = (ids: string[]) => {
    if (!form) return;
    setMissing(ids);
    setError(INTAKE_MISSING);
    const first = intakeQuestions(form).find((q) => ids.includes(q.id));
    setFocus((f) => ({ id: first ? fieldId(first) : null, n: (f?.n ?? 0) + 1 }));
  };

  const after = (out: IntakeSave, submit: boolean) => {
    if (out.kind === 'unchanged') return;
    if (out.kind === 'saved') {
      setSavedAt(out.updatedAt);
      setSubmittedAt(out.submittedAt);
      setError(null);
      if (submit) setMissing([]);
      return;
    }
    if (out.kind === 'missing') return showMissing(out.missing);
    if (out.kind === 'conflict') {
      setStale(true);
      if (timer.current) clearTimeout(timer.current);
      setFocus((f) => ({ id: null, n: (f?.n ?? 0) + 1 }));
    }
    setError(out.error);
  };

  const save = (submit: boolean) => {
    if (!form) return;
    if (staff) {
      setSavedAt(Date.now());
      if (submit) setSubmittedAt(Date.now());
      return;
    }
    const to = saver.current;
    if (!to || stale) return;
    if (submit) {
      const gaps = intakeMissing(form, cleanIntakeAnswers(form, latest.current));
      if (gaps.length) return showMissing(gaps);
      if (timer.current) clearTimeout(timer.current);
    }
    void to.save(latest.current, submit).then((out) => after(out, submit));
  };

  const onChange = (id: string, value: string | string[]) => {
    if (stale) return;
    setAnswers((cur) => ({ ...cur, [id]: value }));
    if (missing.includes(id)) setMissing((cur) => cur.filter((x) => x !== id));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(false), WAIT);
  };

  const stamp = useMemo(() => (savedAt ? `Saved ${fmt.time(savedAt)}` : null), [savedAt]);

  const downloadPdf = () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    void downloadIntakePdf().then((ok) => {
      setPdfBusy(false);
      setError(ok ? null : PDF_FAILED);
    });
  };

  if (course.kind !== 'ready') return null;
  if (!form) return <p className={s.intro}>This week has no intake.</p>;
  const editable = load.kind === 'ready';
  const gaps = intakeQuestions(form).filter((q) => missing.includes(q.id));
  return (
    <div className={s.page}>
      <Link className={l.back} to={learnWeek(week)}>
        <Icon name="r2Back" size={14} strokeWidth={1.75} />
        Back
      </Link>
      <h1 className={l.h0}>Week 0 Intake</h1>
      {form.intro ? <p className={s.intro}>{form.intro}</p> : null}
      {staff ? <p className={s.saved}>Preview: Answers Aren’t Saved</p> : null}
      {stamp ? <p className={s.saved} role="status">{stamp}</p> : null}
      {submittedAt ? <p className={s.saved}>Submitted {fmt.time(submittedAt)}</p> : null}
      {load.kind === 'failed' ? (
        <div className={s.failed}>
          <p className={s.error} role="alert">{load.error}</p>
          {load.retry ? (
            <button type="button" className={`${l.b} ${l.bq}`} onClick={() => setAttempt((n) => n + 1)}>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div className={s.alert} role="alert" ref={alertRef} tabIndex={-1}>
          <p className={s.error}>{error}</p>
          {gaps.length ? (
            <ul className={s.gaps}>
              {gaps.map((q) => (
                <li key={q.id}>
                  <a
                    href={`#${fieldId(q)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(fieldId(q));
                      el?.focus({ preventScroll: true });
                      el?.scrollIntoView?.({ block: 'center' });
                    }}
                  >
                    {q.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {load.kind !== 'loading' ? (
        <fieldset className={s.lock} disabled={!editable}>
          {form.sections.map((section) => (
            <section key={section.title} className={s.section} aria-labelledby={`sec-${section.title}`}>
              <h2 id={`sec-${section.title}`}>{section.title}</h2>
              {section.intro ? <p className={s.intro}>{section.intro}</p> : null}
              {section.questions.map((q) => (
                <Field key={q.id} q={q} value={answers[q.id]} invalid={missing.includes(q.id)} readOnly={stale} onChange={(v) => onChange(q.id, v)} />
              ))}
            </section>
          ))}
        </fieldset>
      ) : null}
      <div className={s.acts}>
        <button type="button" className={`${l.b} ${l.bp}`} disabled={!editable || stale} onClick={() => save(true)}>
          Submit
        </button>
        {submittedAt && !staff ? (
          <button type="button" className={l.b} onClick={downloadPdf} disabled={pdfBusy} aria-busy={pdfBusy || undefined}>
            <Icon name="download" size={14} strokeWidth={1.75} />
            {DOWNLOAD_ANSWERS_LABEL}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Component() {
  const week = Number(useParams().week);
  const { db, viewer } = useLearn();
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const w = Number.isFinite(week) ? week : 0;
  // B-15 (D-229): for a learner v3 draws for, the intake is the form drawer on its week's page.
  if (v3For(viewer, me)) return <Navigate to={`${learnWeek(w)}?form=intake`} replace />;
  return <IntakePage week={w} />;
}

export default Component;
