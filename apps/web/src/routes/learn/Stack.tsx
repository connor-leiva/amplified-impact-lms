// /learn/week/0/stack (D-197). The team's stack card. Send Back stays in the portal.
// H-10 (D-247): editable only once the card has loaded (a failed load says so, with Retry). Send Back sends only the
// rows changed since the load, each as it was (`stackEdit`), so a teammate's other rows stay; a row they changed too
// is refused (409) and the page says to reload, what was typed still on screen to copy.

import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { isLockedWeek } from '@ai/core/course';
import type { StackCardContent } from '@ai/core/course-types';
import { stackEdit } from '@ai/core/stack';
import type { StackRow } from '@ai/core/stack';
import { Icon } from '../../components/Icon';
import { useLearn } from './data';
import { learnWeek } from './routes';
import s from './Intake.module.css';
import l from './Learn.module.css';

export function StackPage({ week }: { week: number }) {
  const { course, viewer } = useLearn();
  const staff = viewer.actor.kind === 'staff';
  const open = course.kind === 'ready' ? course.payload.course.weeks.find((w) => w.week === week && !isLockedWeek(w)) : undefined;
  const card: StackCardContent | undefined = open && 'stackCard' in open ? open.stackCard : undefined;
  const [rows, setRows] = useState<StackRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [example, setExample] = useState(false);
  const [sent, setSent] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [stale, setStale] = useState(false);
  const base = useRef<StackRow[]>([]);

  useEffect(() => {
    if (!card) return;
    if (staff) {
      setRows(card.sources.map((source) => ({ source: source.name, tool: '', plan: 'yellow', who: '' })));
      setLoaded(true);
      return;
    }
    let alive = true;
    setLoaded(false);
    setRetry(false);
    void fetch('/api/stack', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const refused = res.status === 403;
          throw Object.assign(new Error((refused && ((await res.json().catch(() => ({}))) as { error?: string }).error) || 'Could not load the card.'), { refused });
        }
        const body = (await res.json()) as { rows?: StackRow[]; sentAt?: number | null };
        if (!Array.isArray(body.rows)) throw new Error('Could not load the card.');
        return body as { rows: StackRow[]; sentAt: number | null };
      })
      .then((body) => {
        if (!alive) return;
        base.current = body.rows;
        setRows(body.rows);
        setSent(body.sentAt !== null);
        setError(null);
        setLoaded(true);
      })
      .catch((e: Error & { refused?: boolean }) => {
        if (!alive) return;
        setError(e.message);
        setRetry(!e.refused);
      });
    return () => {
      alive = false;
    };
  }, [card, staff, attempt]);

  const send = () => {
    if (staff) {
      setSent(true);
      return;
    }
    if (!loaded || stale) return;
    const edit = stackEdit(base.current, rows);
    void fetch('/api/stack', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...edit, send: true }),
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as { error?: string; sentAt?: number | null };
        if (res.status === 409) setStale(true);
        if (!res.ok) throw new Error(json.error || 'That did not save.');
        base.current = base.current.map((r) => edit.changes[r.source] ?? r);
        setSent(json.sentAt != null);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  };

  if (!card) return <p className={s.intro}>This week has no stack card.</p>;
  return (
    <div className={s.page}>
      <Link className={l.back} to={learnWeek(week)}>
        <Icon name="r2Back" size={14} strokeWidth={1.75} />
        Back
      </Link>
      <h1 className={l.h0}>Stack card</h1>
      <p className={s.help}>Never a password.</p>
      {staff ? <p className={s.saved}>Preview: Answers Aren’t Saved</p> : null}
      {error ? (
        <div className={s.failed}>
          <p className={s.error} role="alert">{error}</p>
          {retry && !loaded ? (
            <button type="button" className={`${l.b} ${l.bq}`} onClick={() => setAttempt((n) => n + 1)}>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      {(loaded ? rows : []).map((row, i) => {
        const source = card.sources.find((s) => s.name === row.source);
        return (
          <section key={row.source} className={s.section}>
            <h2>{row.source}</h2>
            {source ? <p className={s.help}>Green: {source.green}. Yellow: {source.yellow}</p> : null}
            <label className={s.field}>
              Tool
              <input value={row.tool} readOnly={stale} onChange={(e) => setRows((cur) => cur.map((r, n) => (n === i ? { ...r, tool: e.target.value } : r)))} />
            </label>
            <label className={s.field}>
              Who
              <input value={row.who} readOnly={stale} onChange={(e) => setRows((cur) => cur.map((r, n) => (n === i ? { ...r, who: e.target.value } : r)))} />
            </label>
            <label className={s.choice}>
              <input type="radio" name={`plan-${i}`} disabled={stale} checked={row.plan === 'green'} onChange={() => setRows((cur) => cur.map((r, n) => (n === i ? { ...r, plan: 'green' } : r)))} />
              Green
            </label>
            <label className={s.choice}>
              <input type="radio" name={`plan-${i}`} disabled={stale} checked={row.plan === 'yellow'} onChange={() => setRows((cur) => cur.map((r, n) => (n === i ? { ...r, plan: 'yellow' } : r)))} />
              Yellow
            </label>
          </section>
        );
      })}
      <div className={s.acts}>
        <button type="button" className={`${l.b} ${l.bq}`} onClick={() => setExample(true)}>Show Example</button>
        <button type="button" className={`${l.b} ${l.bp}`} disabled={!loaded || stale} onClick={send}>{sent ? 'Sent back' : 'Send Back'}</button>
      </div>
      {example ? (
        <section className={s.section} role="dialog" aria-modal="true" aria-label={card.exampleLabel}>
          <h2>{card.exampleTeam}</h2>
          <p className={s.saved}>{card.exampleLabel}</p>
          {card.example.map((row) => (
            <p key={row.source} className={s.help}>{row.source}: {row.tool}, {row.plan}, {row.who}</p>
          ))}
          <button type="button" className={`${l.b} ${l.bq}`} onClick={() => setExample(false)}>Close</button>
        </section>
      ) : null}
    </div>
  );
}

export function Component() {
  const week = Number(useParams().week);
  return <StackPage week={Number.isFinite(week) ? week : 0} />;
}

export default Component;
