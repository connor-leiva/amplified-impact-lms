// /learn/week/0/intake (D-196). The week's intake questions, autosaved for the team. Markup only.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { learnerOf } from '@ai/core/learner';
import { fmt } from '@ai/core';
import { isLockedWeek } from '@ai/core/course';
import type { CourseIntake, IntakeQuestion } from '@ai/core/course-types';
import type { IntakeAnswers } from '@ai/core/intake';
import { cleanIntakeAnswers } from '@ai/core/intake';
import { Icon } from '../../components/Icon';
import { useLearn } from './data';
import { learnWeek } from './routes';
import { v3For } from './lms-v3/v3';
import s from './Intake.module.css';
import l from './Learn.module.css';

const WAIT = 600;

interface Saved {
  answers: IntakeAnswers;
  updatedAt: number | null;
  submittedAt: number | null;
  preview?: boolean;
}

function Field({ q, value, onChange }: { q: IntakeQuestion; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const id = `q-${q.id}`;
  if (q.kind === 'long') {
    return (
      <label className={s.field} htmlFor={id}>
        {q.label}
        {q.help ? <span className={s.help}>{q.help}</span> : null}
        <textarea id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }
  if (q.kind === 'choice') {
    return (
      <fieldset className={s.field}>
        <legend>{q.label}</legend>
        {q.help ? <span className={s.help}>{q.help}</span> : null}
        {(q.options ?? []).map((opt) => (
          <label key={opt} className={s.choice}>
            <input type="radio" name={q.id} checked={value === opt} onChange={() => onChange(opt)} />
            {opt}
          </label>
        ))}
      </fieldset>
    );
  }
  if (q.kind === 'multi') {
    const picked = Array.isArray(value) ? value : [];
    return (
      <fieldset className={s.field}>
        <legend>{q.label}</legend>
        {q.help ? <span className={s.help}>{q.help}</span> : null}
        {(q.options ?? []).map((opt) => (
          <label key={opt} className={s.choice}>
            <input
              type="checkbox"
              checked={picked.includes(opt)}
              onChange={(e) => onChange(e.target.checked ? [...picked, opt] : picked.filter((x) => x !== opt))}
            />
            {opt}
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <label className={s.field} htmlFor={id}>
      {q.label}
      {q.help ? <span className={s.help}>{q.help}</span> : null}
      <input id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
    </label>
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
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(answers);
  latest.current = answers;

  useEffect(() => {
    if (staff || !form) {
      setReady(true);
      return;
    }
    let alive = true;
    void fetch('/api/intake', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({})) as { error?: string }).error || 'Could not load the intake.');
        return res.json() as Promise<Saved>;
      })
      .then((body) => {
        if (!alive) return;
        setAnswers(body.answers ?? {});
        setSavedAt(body.updatedAt);
        setSubmittedAt(body.submittedAt);
        setReady(true);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [staff, form]);

  const save = (submit: boolean) => {
    if (!form) return;
    const body = cleanIntakeAnswers(form, latest.current);
    if (staff) {
      setSavedAt(Date.now());
      if (submit) setSubmittedAt(Date.now());
      return;
    }
    void fetch('/api/intake', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: body, submit }),
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as Saved & { error?: string };
        if (!res.ok) throw new Error(json.error || 'That did not save.');
        setSavedAt(json.updatedAt);
        setSubmittedAt(json.submittedAt);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  };

  const onChange = (id: string, value: string | string[]) => {
    setAnswers((cur) => ({ ...cur, [id]: value }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(false), WAIT);
  };

  const stamp = useMemo(() => (savedAt ? `Saved ${fmt.time(savedAt)}` : null), [savedAt]);

  if (course.kind !== 'ready') return null;
  if (!form) return <p className={s.intro}>This week has no intake.</p>;
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
      {error ? <p className={s.error} role="alert">{error}</p> : null}
      {ready
        ? form.sections.map((section) => (
            <section key={section.title} className={s.section} aria-labelledby={`sec-${section.title}`}>
              <h2 id={`sec-${section.title}`}>{section.title}</h2>
              {section.intro ? <p className={s.intro}>{section.intro}</p> : null}
              {section.questions.map((q) => (
                <Field key={q.id} q={q} value={answers[q.id]} onChange={(v) => onChange(q.id, v)} />
              ))}
            </section>
          ))
        : null}
      <div className={s.acts}>
        <button type="button" className={`${l.b} ${l.bp}`} onClick={() => save(true)}>Submit</button>
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
