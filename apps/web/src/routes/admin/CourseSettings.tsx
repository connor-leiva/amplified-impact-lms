// D-265 (R-5 Phase 6): Program › Course Settings (`/admin/program/course`), the mockup's `CourseSet`: what every cohort
// shares, in eight sections down the left, one on screen at a time (`?section=`): Course Intro, Roles, Rules and Support,
// Before Week 1, After the Cohort, Joining and Community, Glossary, Words. Every field says where learners see it. The
// cohort's own three words (the promise, how it works, the holiday note) are "From the cohort" blocks that link to that
// cohort's Settings, where Edit words changes them; they are not edited here.
//
//   - The shared words are the program record's (`programCourse`; December's row until the program step has run) and
//     save whole with `saveProgramCourse` (audited `program.course_save`, the copy rules on what changed).
//   - Glossary: the terms, each opening its dialog (Term, Short definition, Id, Long, Also matches, First step,
//     Underline), saved with the program's words.
//   - Words: the copy strings, found and filtered by who reads them, each saved with `saveCopyString`.
//   - The release plan is each cohort's (D-255): the "Looking for Dates?" note links to the cohort's Settings.
//
// PLAN § 6.2's placements: Paths beside After the cohort's paths, the Estimate note last in Rules and Support.

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useSearchParams } from 'react-router';
import { cohortWordsOf, programCourse, programIdOf } from '@ai/core';
import { firstLiveBuildDay } from '@ai/core/cohort-learner';
import type { CopyString } from '@ai/core';
import type { CohortCourse, GlossaryTerm } from '@ai/core/course-types';
import { Icon } from '../../components/Icon';
import { Button, buttonClass } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Modal } from '../../components/r2/Modal';
import { Find, PageHead, Pill, Sel, TextArea, k } from '../../components/r2/kit';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { cohortLabel } from '../../data/admin-shell';
import { useAct, useDb } from '../../data/hooks';
import { useAdminChrome } from '../../shell/admin/chrome';
import { useViewportWidth } from '../../shell/hooks';
import { copyRows, hintPairs, textPairs } from './CourseSettings.vm';
import { cohortPath } from './cohort/cohort.vm';
import { COURSE_SECTIONS, courseSectionOf, type CourseSection } from './program/program.vm';
import c from './cohort/Cohort.module.css';
import p from './program/Program.module.css';

function Errors({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div role="alert" className={p.alert}>
      {error.split('\n').map((e) => (
        <p key={e} className={k.p}>
          {e}
        </p>
      ))}
    </div>
  );
}

/** A field with the line that says where learners see it (the mockup's `Fld`). */
function Fld({
  label,
  at,
  value,
  onChange,
  rows,
  type = 'text',
  hint,
}: {
  label: string;
  at?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  type?: string;
  hint?: string;
}) {
  return (
    <label className={c.lab}>
      {label}
      {at ? <span className={c.fat}>Learners see it on {at}</span> : null}
      {rows ? (
        <TextArea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          className={k.in}
          type={type}
          placeholder={hint}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

/** A list of lines, each its own field, with a way to add and remove one (the mockup's `Lines`). */
function Lines({
  label,
  at,
  value,
  onChange,
}: {
  label: string;
  at?: string;
  value: readonly string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className={c.lab}>
      <span>{label}</span>
      {at ? <span className={c.fat}>Learners see it on {at}</span> : null}
      <div className={c.lns}>
        {value.map((r, i) => (
          <div key={i} className={p.ln}>
            <span className={p.grp} aria-hidden="true">
              <Icon name="r2Grip" size={14} strokeWidth={2.6} />
            </span>
            <input
              className={k.in}
              aria-label={`${label}, line ${i + 1}`}
              value={r}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <button
              type="button"
              className={k.ib}
              aria-label={`Remove line ${i + 1}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <Icon name="r2X" size={14} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>
      <Button kind="quiet" icon="r2Plus" className={p.addLine} onClick={() => onChange([...value, ''])}>
        Add a line
      </Button>
    </div>
  );
}

/** A word that is the cohort's, shown where the program's are edited (the mockup's `FromCohort`). */
function FromCohort({
  label,
  at,
  text,
  lines,
  link,
  to,
}: {
  label: string;
  at: string;
  text?: string;
  lines?: readonly string[];
  link: string;
  to: string;
}) {
  return (
    <div className={c.lab}>
      <span>{label}</span>
      <span className={c.fat}>Learners see it on {at}</span>
      <div className={p.cfb}>
        <Pill tone="info">From the cohort</Pill>
        {lines ? (
          <ul className={c.cfl}>
            {lines.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        ) : (
          <span className={p.cfbText}>{text}</span>
        )}
        <Link className={clsx(k.lk, p.lka)} to={to}>
          {link}
        </Link>
      </div>
    </div>
  );
}

/** "Label: text" lines as plain lines, and back (a path or an evidence line is a label and its words). */
const pairLines = (rows: readonly { label: string; text?: string; hint?: string }[]): string[] =>
  rows.map((r) => {
    const rest = r.text ?? r.hint ?? '';
    return rest ? `${r.label}: ${rest}` : r.label;
  });
const pairsOf = (lines: readonly string[], kind: 'text' | 'hint') =>
  lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parsed = kind === 'text' ? textPairs(l)[0] : hintPairs(l)[0];
      return parsed ?? (kind === 'text' ? { label: l, text: '' } : { label: l, hint: '' });
    });

export function Component() {
  const db = useDb();
  const act = useAct();
  const { cohort } = useAdminChrome();
  const phone = useViewportWidth() < 768;
  const [search, setSearch] = useSearchParams();
  const sec = courseSectionOf(search.get('section'));
  const stored = programCourse(db);
  const programId = programIdOf(cohort.id ? db.cohorts.find((x) => x.id === cohort.id) : null);
  const [draft, setDraft] = useState<CohortCourse | null>(stored ? structuredClone(stored) : null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const goSection = (v: CourseSection) =>
    setSearch(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v === 'intro') next.delete('section');
        else next.set('section', v);
        return next;
      },
      { replace: true },
    );

  const co = cohort.id ? (db.cohorts.find((x) => x.id === cohort.id) ?? null) : (db.cohorts[0] ?? null);
  const words = co ? cohortWordsOf(db, co.id) : null;
  const settingsTo = co ? cohortPath(co.id, 'settings') : '/admin/cohort';
  const settingsLink = co ? `${cohortLabel(co).replace(/ Cohort$/, '')} › Settings` : 'The cohort’s Settings';

  if (!draft) {
    return (
      <>
        <PageHead
          title="Course Settings"
          description="What every cohort shares: the intro, the rules, the pages before and after, the glossary and the words learners see. Anything that names a date, a weekday or a number of weeks is filled in from the cohort."
        />
        <p className={k.p}>This database holds no course yet.</p>
      </>
    );
  }

  const up = (fn: (x: CohortCourse) => void) => {
    setDraft((prev) => {
      const next = structuredClone(prev!);
      fn(next);
      return next;
    });
    setDirty(true);
  };
  const save = async (course: CohortCourse = draft) => {
    setSaving(true);
    const out = await act('saveProgramCourse', { programId, course });
    setSaving(false);
    setError(out.error ?? '');
    if (!out.error) setDirty(false);
    return !out.error;
  };
  const discard = () => {
    setDraft(stored ? structuredClone(stored) : null);
    setDirty(false);
    setError('');
  };
  const name = COURSE_SECTIONS.find((x) => x.id === sec)!.label;
  const counts: Partial<Record<CourseSection, number>> = {
    glossary: draft.glossary?.length ?? 0,
    words: (db.copy ?? []).length,
  };

  return (
    <>
      <PageHead
        title="Course Settings"
        description="What every cohort shares: the intro, the rules, the pages before and after, the glossary and the words learners see. Anything that names a date, a weekday or a number of weeks is filled in from the cohort."
        right={
          <a
            className={buttonClass({ header: true })}
            href={co ? `/course?cohort=${encodeURIComponent(co.id)}` : '/course'}
            target="_blank"
            rel="noopener"
          >
            <Icon name="r2Eye" size={16} strokeWidth={1.75} />
            Preview
          </a>
        }
      />
      <div className={p.srg}>
        <div className={p.railCol}>
          {phone ? (
            <Sel
              className={k.full}
              aria-label="Section"
              value={sec}
              onChange={(e) => goSection(e.target.value as CourseSection)}
            >
              {COURSE_SECTIONS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                  {counts[x.id] !== undefined ? ` · ${counts[x.id]}` : ''}
                </option>
              ))}
            </Sel>
          ) : (
            <nav className={p.srl} aria-label="Sections">
              {COURSE_SECTIONS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className={clsx(p.srb, sec === x.id && p.on)}
                  aria-current={sec === x.id ? 'true' : undefined}
                  onClick={() => goSection(x.id)}
                >
                  <span className={p.srbLabel}>{x.label}</span>
                  {counts[x.id] !== undefined ? <span className={p.srbCount}>{counts[x.id]}</span> : null}
                </button>
              ))}
            </nav>
          )}
          {!phone ? (
            <div className={clsx(k.note, k.col, k.colS)}>
              <span className={k.w5}>Looking for Dates?</span>
              <span className={k.me}>
                A cohort’s dates, its promise, how often it meets and when its emails send are on the cohort.
              </span>
              <Link className={clsx(k.lk, p.lka, p.selfStart)} to={settingsTo}>
                Open the cohort’s Settings
              </Link>
            </div>
          ) : null}
        </div>
        <div className={k.col}>
          <Errors error={error} />
          {sec === 'intro' ? (
            <Card title="Course Intro" sub="The first thing a new learner reads.">
              <div className={k.col}>
                <Fld
                  label="Course title"
                  at="Home"
                  value={draft.intro.title}
                  onChange={(v) => up((x) => void (x.intro.title = v))}
                />
                <FromCohort
                  label="The promise"
                  at="Home, under the title"
                  text={words?.promise ?? draft.intro.sub}
                  link={settingsLink}
                  to={settingsTo}
                />
                <FromCohort
                  label="How it works"
                  at="Home"
                  lines={words?.how ?? draft.intro.how}
                  link={settingsLink}
                  to={settingsTo}
                />
                <Fld
                  label="Instructor"
                  at="Home and each live build"
                  value={draft.intro.instructor}
                  onChange={(v) => up((x) => void (x.intro.instructor = v))}
                />
              </div>
            </Card>
          ) : null}
          {sec === 'roles' ? (
            <Card title="Roles" sub="The two seats every team fills.">
              <div className={k.col}>
                <Fld
                  label="The owner’s role"
                  at="Home and Week 0"
                  rows={3}
                  value={draft.intro.roles.owner}
                  onChange={(v) => up((x) => void (x.intro.roles.owner = v))}
                />
                <Fld
                  label="The AI Implementer’s role"
                  at="Home and Week 0"
                  rows={3}
                  value={draft.intro.roles.operator}
                  onChange={(v) => up((x) => void (x.intro.roles.operator = v))}
                />
              </div>
            </Card>
          ) : null}
          {sec === 'rules' ? (
            <Card title="Rules and Support" sub="What we will and won’t do, and where to get help.">
              <div className={k.col}>
                <Fld
                  label="Scope"
                  at="Home"
                  rows={2}
                  value={draft.intro.scope}
                  onChange={(v) => up((x) => void (x.intro.scope = v))}
                />
                <Fld
                  label="Support"
                  at="Home and Get help"
                  rows={2}
                  value={draft.intro.support}
                  onChange={(v) => up((x) => void (x.intro.support = v))}
                />
                <Lines
                  label="Office hours rules"
                  at="each Office hours row"
                  value={draft.shared.officeHoursRules}
                  onChange={(v) => up((x) => void (x.shared.officeHoursRules = v))}
                />
                <Lines
                  label="Evidence"
                  at="Reference"
                  value={pairLines(draft.shared.evidence)}
                  onChange={(v) => up((x) => void (x.shared.evidence = pairsOf(v, 'hint') as typeof x.shared.evidence))}
                />
                <Fld
                  label="Missed a week"
                  at="Reference"
                  rows={2}
                  value={draft.shared.missedAWeek}
                  onChange={(v) => up((x) => void (x.shared.missedAWeek = v))}
                />
                <FromCohort
                  label="Holiday note"
                  at="the Schedule"
                  text={(words ? words.holiday : draft.intro.holiday) || 'None. Every week has its sessions.'}
                  link={settingsLink}
                  to={settingsTo}
                />
                <Fld
                  label="Estimate note"
                  at="Reference"
                  rows={2}
                  value={draft.shared.estimateNote}
                  onChange={(v) => up((x) => void (x.shared.estimateNote = v))}
                />
              </div>
            </Card>
          ) : null}
          {sec === 'before' ? (
            <Card title="Before Week 1" sub="What a team reads between buying and the first live build.">
              <div className={k.col}>
                <Lines
                  label="Intake"
                  at="Week 0 · Step 1"
                  value={draft.before.intake}
                  onChange={(v) => up((x) => void (x.before.intake = v))}
                />
                {co ? (
                  <p className={clsx(k.p, k.me)}>
                    Words in braces are filled in from the cohort. For the {cohortLabel(co)}, {'{first live build}'}{' '}
                    reads {firstLiveBuildDay(co, db.sessions)}.
                  </p>
                ) : null}
                <Fld
                  label="Practice set note"
                  at="Week 0"
                  rows={2}
                  value={draft.before.practiceSetNote}
                  onChange={(v) => up((x) => void (x.before.practiceSetNote = v))}
                />
                <Lines
                  label="Safe sharing"
                  at="Week 0 and the Community"
                  value={draft.before.safeSharing}
                  onChange={(v) => up((x) => void (x.before.safeSharing = v))}
                />
              </div>
            </Card>
          ) : null}
          {sec === 'after' ? (
            <Card title="After the Cohort" sub="What a team reads when its last week is done.">
              <div className={k.col}>
                <Lines
                  label="Graduation"
                  at="the last week"
                  value={draft.after.graduation}
                  onChange={(v) => up((x) => void (x.after.graduation = v))}
                />
                <Fld
                  label="Graduation note"
                  at="the last week"
                  rows={2}
                  value={draft.after.graduationNote}
                  onChange={(v) => up((x) => void (x.after.graduationNote = v))}
                />
                <Lines
                  label="Paths"
                  at="the last week"
                  value={pairLines(draft.after.paths)}
                  onChange={(v) => up((x) => void (x.after.paths = pairsOf(v, 'text') as typeof x.after.paths))}
                />
                <Lines
                  label="Shared paths"
                  at="Reference"
                  value={pairLines(draft.shared.paths)}
                  onChange={(v) => up((x) => void (x.shared.paths = pairsOf(v, 'text') as typeof x.shared.paths))}
                />
                <Fld
                  label="No paywall"
                  at="the last week"
                  rows={2}
                  value={draft.after.noPaywall}
                  onChange={(v) => up((x) => void (x.after.noPaywall = v))}
                />
              </div>
            </Card>
          ) : null}
          {sec === 'join' ? (
            <Card
              title="Joining and Community"
              sub="The button that takes a learner into a live session, and where the cohort talks."
            >
              <div className={k.col}>
                <div className={c.g2}>
                  <Fld
                    label="Join label"
                    at="the top bar, 15 minutes before a session"
                    value={draft.intro.join.label}
                    onChange={(v) => up((x) => void (x.intro.join.label = v))}
                  />
                  <Fld
                    label="Community link"
                    at="Home, until the built-in Community replaces it"
                    type="url"
                    hint="https://"
                    value={draft.intro.community ?? ''}
                    onChange={(v) => up((x) => void (x.intro.community = v))}
                  />
                </div>
                <Fld
                  label="Join note"
                  at="under the Join button"
                  rows={2}
                  value={draft.intro.join.note}
                  onChange={(v) => up((x) => void (x.intro.join.note = v))}
                />
                <p className={clsx(k.p, k.me)}>
                  The cohort’s own threads are in{' '}
                  <Link className={clsx(k.lk, p.inlink)} to={co ? cohortPath(co.id, 'community') : '/admin/cohort'}>
                    Community
                  </Link>
                  . Leave the link empty to show only that.
                </p>
              </div>
            </Card>
          ) : null}
          {sec === 'glossary' ? (
            <Glossary
              terms={draft.glossary ?? []}
              onSave={async (glossary) => {
                const base = stored ? structuredClone(stored) : draft;
                const ok = await save({ ...base, glossary });
                if (ok) setDraft((prev) => (prev ? { ...prev, glossary } : prev));
                return ok;
              }}
            />
          ) : null}
          {sec === 'words' ? <Words rows={copyRows(db)} /> : null}
          {dirty && sec !== 'glossary' && sec !== 'words' ? (
            <div className={p.svb} role="status">
              <span className={p.svbText}>Unsaved changes to {name}</span>
              <Button onClick={discard}>Discard</Button>
              <Button kind="primary" disabled={saving} onClick={() => void save()}>
                Save changes
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function blankTerm(taken: readonly string[]): GlossaryTerm {
  let n = 1;
  while (taken.includes(`term-${n}`)) n += 1;
  return { id: `term-${n}`, term: '', short: '', long: '', aliases: [] };
}

/** "Week 0 · Step 2" style: the step a term is first underlined on, or every step. */
const firstUsed = (t: GlossaryTerm): string => (t.firstStep === undefined ? 'Every step' : `Step ${t.firstStep}`);

function Glossary({ terms, onSave }: { terms: GlossaryTerm[]; onSave: (terms: GlossaryTerm[]) => Promise<boolean> }) {
  const [ed, setEd] = useState<{ at: number | null; term: GlossaryTerm } | null>(null);
  const cols: Column<GlossaryTerm>[] = [
    {
      key: 'term',
      label: 'Term',
      width: '170px',
      value: (t) => t.term,
      cell: (t) => <span className={clsx(k.w5, k.el, p.block)}>{t.term}</span>,
    },
    {
      key: 'short',
      label: 'Short definition',
      width: 'minmax(240px,2fr)',
      value: (t) => t.short,
      cell: (t) => <span className={clsx(k.s2, p.cl2)}>{t.short}</span>,
    },
    {
      key: 'aliases',
      label: 'Also matches',
      width: '130px',
      hideLap: true,
      value: (t) => t.aliases.join(', '),
      cell: (t) => (t.aliases.length ? t.aliases.join(', ') : <span className={k.mu}>None</span>),
    },
    { key: 'first', label: 'First used', width: '140px', value: firstUsed },
  ];
  const at = ed?.at ?? null;
  const set = (patch: Partial<GlossaryTerm>) => setEd((e) => (e ? { ...e, term: { ...e.term, ...patch } } : e));
  return (
    <>
      <Table
        label="Glossary"
        title="Glossary"
        right={
          <Button icon="r2Plus" onClick={() => setEd({ at: null, term: blankTerm(terms.map((t) => t.id)) })}>
            Add a term
          </Button>
        }
        cols={cols}
        rows={terms}
        rowKey={(t) => t.id}
        onRow={(t) => setEd({ at: terms.indexOf(t), term: structuredClone(t) })}
        empty={{ icon: 'r2File', title: 'No terms yet', body: 'Add the first term a step page can underline.' }}
        card={(t) => (
          <>
            <span className={clsx(k.w6, p.cardName)}>{t.term}</span>
            <p className={clsx(k.p, k.s2)}>{t.short}</p>
            <span className={k.me}>First used: {firstUsed(t)}</span>
          </>
        )}
      />
      {ed ? (
        <Modal
          title={ed.term.term || 'New term'}
          width={560}
          onClose={() => setEd(null)}
          foot={
            <>
              {at !== null ? (
                <Button
                  kind="danger"
                  onClick={() => void onSave(terms.filter((_, j) => j !== at)).then((ok) => ok && setEd(null))}
                >
                  Remove term
                </Button>
              ) : null}
              <Button onClick={() => setEd(null)}>Cancel</Button>
              <Button
                kind="primary"
                onClick={() =>
                  void onSave(at === null ? [...terms, ed.term] : terms.map((t, j) => (j === at ? ed.term : t))).then(
                    (ok) => ok && setEd(null),
                  )
                }
              >
                Save
              </Button>
            </>
          }
        >
          <Fld label="Term" value={ed.term.term} onChange={(v) => set({ term: v })} />
          <Fld label="Short definition" rows={2} value={ed.term.short} onChange={(v) => set({ short: v })} />
          <Fld label="Id" value={ed.term.id} onChange={(v) => set({ id: v })} />
          <Fld label="Long" rows={4} value={ed.term.long} onChange={(v) => set({ long: v })} />
          <Fld
            label="Also matches"
            hint="Other words to underline, separated by commas"
            value={ed.term.aliases.join(', ')}
            onChange={(v) =>
              set({
                aliases: v
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
          <Fld
            label="First step"
            hint="Blank underlines it on every step."
            value={ed.term.firstStep === undefined ? '' : String(ed.term.firstStep)}
            onChange={(v) => {
              const n = Number(v);
              setEd((e) => {
                if (!e) return e;
                const term = { ...e.term };
                if (v.trim() && Number.isInteger(n)) term.firstStep = n;
                else delete term.firstStep;
                return { ...e, term };
              });
            }}
          />
          <label className={clsx(k.row, k.nw)}>
            <input
              type="checkbox"
              checked={ed.term.underline !== false}
              onChange={(e) =>
                setEd((x) => {
                  if (!x) return x;
                  const term = { ...x.term };
                  if (e.target.checked) delete term.underline;
                  else term.underline = false;
                  return { ...x, term };
                })
              }
            />
            Underline on pages
          </label>
        </Modal>
      ) : null}
    </>
  );
}

interface WordForm {
  key: string;
  value: string;
  audience: 'learner' | 'staff';
  fresh: boolean;
}

const WHO: Record<'learner' | 'staff', string> = { learner: 'Learners', staff: 'Staff' };
const whoOf = (r: CopyString): 'learner' | 'staff' => (r.audience === 'staff' ? 'staff' : 'learner');

function Words({ rows }: { rows: CopyString[] }) {
  const act = useAct();
  const [q, setQ] = useState('');
  const [au, setAu] = useState<'Everyone' | 'Learners' | 'Staff'>('Everyone');
  const [f, setF] = useState<WordForm | null>(null);
  const [error, setError] = useState('');
  const shown = useMemo(
    () =>
      rows.filter(
        (r) => (r.key + r.value).toLowerCase().includes(q.toLowerCase()) && (au === 'Everyone' || WHO[whoOf(r)] === au),
      ),
    [rows, q, au],
  );
  const save = async () => {
    if (!f) return;
    const out = await act('saveCopyString', { key: f.key, value: f.value, audience: f.audience });
    if (out.error) setError(out.error);
    else {
      setF(null);
      setError('');
    }
  };
  const cols: Column<CopyString>[] = [
    {
      key: 'value',
      label: 'What it says',
      width: 'minmax(240px,2fr)',
      value: (r) => r.value,
      cell: (r) => <span className={clsx(k.w5, p.cl2)}>{r.value}</span>,
    },
    { key: 'key', label: 'Key', width: 'minmax(190px,1fr)', mono: true, hideLap: true, value: (r) => r.key },
    {
      key: 'who',
      label: 'Who reads it',
      width: '112px',
      value: (r) => WHO[whoOf(r)],
      cell: (r) => <Pill tone={whoOf(r) === 'staff' ? 'neutral' : 'info'}>{WHO[whoOf(r)]}</Pill>,
    },
  ];
  return (
    <>
      <div className={k.row}>
        <Find value={q} onChange={setQ} placeholder="Find a line" />
        <Sel aria-label="Who reads it" value={au} onChange={(e) => setAu(e.target.value as typeof au)}>
          {(['Everyone', 'Learners', 'Staff'] as const).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Sel>
      </div>
      <Table
        label="Words"
        title="Words"
        right={
          <Button icon="r2Plus" onClick={() => setF({ key: '', value: '', audience: 'learner', fresh: true })}>
            Add a line
          </Button>
        }
        cols={cols}
        rows={shown}
        rowKey={(r) => r.key}
        filtered={q !== '' || au !== 'Everyone'}
        onRow={(r) => setF({ key: r.key, value: r.value, audience: whoOf(r), fresh: false })}
        empty={{ icon: 'r2File', title: 'No line matches', body: 'Try fewer letters.' }}
        card={(r) => (
          <>
            <span className={k.w6}>{r.value}</span>
            <span className={clsx(k.me, k.mo)}>{r.key}</span>
            <Pill tone={whoOf(r) === 'staff' ? 'neutral' : 'info'}>{WHO[whoOf(r)]}</Pill>
          </>
        )}
      />
      <p className={clsx(k.p, k.me)}>
        Short lines the portal shows in fixed places. A week’s own words are in the week.
      </p>
      {f ? (
        <Modal
          title={f.fresh ? f.key || 'New line' : f.key}
          width={560}
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
          <label className={c.lab}>
            Key
            <input
              className={clsx(k.in, k.mo)}
              placeholder="locked.opens"
              value={f.key}
              readOnly={!f.fresh}
              onChange={(e) => setF({ ...f, key: e.target.value })}
            />
          </label>
          <Fld label="What it says" rows={3} value={f.value} onChange={(v) => setF({ ...f, value: v })} />
          <label className={c.lab}>
            Who reads it
            <Sel
              className={k.full}
              value={f.audience}
              onChange={(e) => setF({ ...f, audience: e.target.value === 'staff' ? 'staff' : 'learner' })}
            >
              <option value="learner">Learners</option>
              <option value="staff">Staff</option>
            </Sel>
          </label>
        </Modal>
      ) : null}
    </>
  );
}

export default Component;
