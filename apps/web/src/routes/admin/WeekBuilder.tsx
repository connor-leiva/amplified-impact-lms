// The Module Builder's course-week sections (D-174, learner build PR 2b). A module of kind `week`
// gets these cards under its steps and files; an AI Employee never does, so the R2 builder the mockup
// draws (and its enforced parity cells) is unchanged.
//
//   - Course page, Live build and Office hours, Hire cards: the week's words, in the draft. They save
//     with the rest of the module ("Save changes", one audited `module.save`), so Discard undoes them.
//   - Sessions and Kit: rows of their own tables, each saved at once through its own audited action
//     (`saveSession`, `deleteSession`, `editResource`), as the Vault's Edit details already is.
//   - A step's course fields (who, time, done when, its Claude and ChatGPT paths, preview) are in the
//     step's "Edit step details" dialog (`StepWeekFields`).
//
// Every word shown here is the draft's or the database's; this file holds labels only (D-173's guard).

import { useState } from 'react';
import clsx from 'clsx';
import type { AIEmployee, Db, ReplayVisibility, ResourceKind, ResourcePlatform, ResourceVisibility, SessionType, Step } from '@ai/core';
import type { AgendaItem, ContentBlock, LockedCopy, PlaybookCard, SampleOutput, SeatCard } from '@ai/core/course-types';
import { Button, ButtonLink } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Confirm, Modal } from '../../components/r2/Modal';
import { KV, Pill, Sel, Tabs, TextArea, k } from '../../components/r2/kit';
import { COURSE_OPENS_AT } from '@ai/core/accelerator';
import { CourseBody } from '../course/Course';
import type { useAct } from '../../data/hooks';
import {
  BLOCK_LABELS,
  PLATFORM_LABELS,
  REPLAY_LABELS,
  RESOURCE_KIND_LABELS,
  SESSION_KIND_LABELS,
  VISIBILITY_LABELS,
  PREVIEW_AS_LABELS,
  listItems,
  listText,
  moveBy,
  mtFrom,
  mtInputs,
  newBlock,
  previewLoad,
  previewWeek,
  removeAt,
  setAt,
  tableRows,
  tableText,
  unattached,
  weekKit,
  weekSessions,
} from './WeekBuilder.vm';
import type { KitRow, PreviewAs, WeekDraft, WeekSessionRow } from './WeekBuilder.vm';
import s from './ModuleBuilder.module.css';
import w from './WeekBuilder.module.css';

type Up = (fn: (d: AIEmployee) => void) => void;
type Act = ReturnType<typeof useAct>;

// --- small fields ----------------------------------------------------------------------------------

function Line({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className={s.lab}>
      {label}
      <input className={k.in} value={value} placeholder={hint} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Para({ label, value, onChange, rows = 3, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <label className={s.lab}>
      {label}
      <TextArea rows={rows} value={value} placeholder={hint} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** A list of lines: one item per line. */
function Lines({ label, items, onChange, rows = 3 }: { label: string; items: readonly string[]; onChange: (v: string[]) => void; rows?: number }) {
  const [text, setText] = useState(listText(items));
  return (
    <label className={s.lab}>
      {label}
      <TextArea
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(listItems(e.target.value));
        }}
      />
      <span className={clsx(k.me, w.hint)}>One per line.</span>
    </label>
  );
}

function Choice<T extends string>({ label, value, options, onChange, none }: { label: string; value: T | null; options: Readonly<Record<T, string>>; onChange: (v: T | null) => void; none?: string }) {
  return (
    <label className={s.lab}>
      {label}
      <Sel className={k.full} value={value ?? ''} onChange={(e) => onChange((e.target.value || null) as T | null)}>
        {none !== undefined ? <option value="">{none}</option> : null}
        {(Object.keys(options) as T[]).map((key) => (
          <option key={key} value={key}>
            {options[key]}
          </option>
        ))}
      </Sel>
    </label>
  );
}

export function DateTime({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (t: number | null) => void }) {
  const v = mtInputs(value);
  return (
    <div className={clsx(k.row, k.nw, w.dt)} role="group" aria-label={label}>
      <label className={clsx(s.lab, k.sp)}>
        {`${label} (MT)`}
        <input className={k.in} type="date" value={v.date} onChange={(e) => onChange(mtFrom(e.target.value, v.time))} />
      </label>
      <label className={clsx(s.lab, k.sp)}>
        Time
        <input className={k.in} type="time" value={v.time} disabled={!v.date} onChange={(e) => onChange(mtFrom(v.date, e.target.value))} />
      </label>
    </div>
  );
}

/**
 * One row of a small editable list: its text, and Edit, Move up, Move down and Remove. A movable row
 * always draws both arrows (disabled at the ends), so every row's actions line up.
 */
function Row({
  children,
  label,
  onEdit,
  movable,
  onUp,
  onDown,
  onRemove,
}: {
  children: React.ReactNode;
  label: string;
  onEdit?: () => void;
  movable?: boolean;
  onUp?: () => void;
  onDown?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className={clsx(k.li, w.row)}>
      <div className={clsx(k.sp, w.text)}>{children}</div>
      <span className={clsx(k.row, k.nw, w.acts)}>
        {onEdit ? (
          <Button kind="quiet" aria-label={`Edit ${label}`} onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        {movable ? (
          <>
            <Button kind="quiet" icon="r2Up" aria-label={`Move ${label} up`} disabled={!onUp} onClick={onUp} />
            <Button kind="quiet" icon="r2Down" aria-label={`Move ${label} down`} disabled={!onDown} onClick={onDown} />
          </>
        ) : null}
        {onRemove ? (
          <Button kind="quiet" aria-label={`Remove ${label}`} onClick={onRemove}>
            Remove
          </Button>
        ) : null}
      </span>
    </div>
  );
}

// --- blocks: a step's Claude and ChatGPT paths, a sample output ------------------------------------

export function Blocks({ label, blocks, onChange }: { label: string; blocks: readonly ContentBlock[]; onChange: (b: ContentBlock[]) => void }) {
  const [add, setAdd] = useState<ContentBlock['type']>('text');
  const set = (i: number, b: ContentBlock) => onChange(setAt(blocks, i, b));
  return (
    <fieldset className={w.blocks}>
      <legend className={w.legend}>{label}</legend>
      {blocks.length === 0 ? <p className={clsx(k.p, k.mu)}>No blocks yet.</p> : null}
      {blocks.map((b, i) => (
        <div key={i} className={w.block}>
          <div className={clsx(k.row, k.nw)}>
            <Pill>{BLOCK_LABELS[b.type]}</Pill>
            <span className={k.sp} />
            <Button kind="quiet" icon="r2Up" aria-label={`Move ${label} block ${i + 1} up`} onClick={() => onChange(moveBy(blocks, i, -1))} />
            <Button kind="quiet" icon="r2Down" aria-label={`Move ${label} block ${i + 1} down`} onClick={() => onChange(moveBy(blocks, i, 1))} />
            <Button kind="quiet" aria-label={`Remove ${label} block ${i + 1}`} onClick={() => onChange(removeAt(blocks, i))}>
              Remove
            </Button>
          </div>
          {b.type === 'text' ? <Para label={`Block ${i + 1}`} value={b.text} onChange={(text) => set(i, { ...b, text })} /> : null}
          {b.type === 'copy' ? (
            <>
              <Line label={`Block ${i + 1} label`} value={b.label ?? ''} hint="Optional, like Prompt" onChange={(v) => set(i, v ? { ...b, label: v } : { type: 'copy', text: b.text })} />
              <Para label={`Block ${i + 1} text to copy`} value={b.text} rows={5} onChange={(text) => set(i, { ...b, text })} />
            </>
          ) : null}
          {b.type === 'list' ? <Lines label={`Block ${i + 1} items`} items={b.items} onChange={(items) => set(i, { ...b, items })} /> : null}
          {b.type === 'table' ? (
            <>
              <HeadField label={`Block ${i + 1} headings`} head={b.head ?? []} onChange={(head) => set(i, head.length ? { ...b, head } : { type: 'table', rows: b.rows })} />
              <TableRowsField label={`Block ${i + 1} rows`} rows={b.rows} onChange={(rows) => set(i, { ...b, rows })} />
            </>
          ) : null}
        </div>
      ))}
      <div className={clsx(k.row, w.adder)}>
        <Sel className={w.grow} aria-label={`${label}: kind of block to add`} value={add} onChange={(e) => setAdd(e.target.value as ContentBlock['type'])}>
          {(Object.keys(BLOCK_LABELS) as ContentBlock['type'][]).map((t) => (
            <option key={t} value={t}>
              {BLOCK_LABELS[t]}
            </option>
          ))}
        </Sel>
        <Button kind="quiet" icon="r2Plus" onClick={() => onChange([...blocks, newBlock(add)])}>
          Add block
        </Button>
      </div>
    </fieldset>
  );
}

/** A table's headings as staff type them, cells split by "|": kept as typed, read on each change. */
function HeadField({ label, head, onChange }: { label: string; head: readonly string[]; onChange: (h: string[]) => void }) {
  const [text, setText] = useState(head.join(' | '));
  return (
    <label className={s.lab}>
      {label}
      <input
        className={k.in}
        value={text}
        placeholder="Column | Column"
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.trim() ? e.target.value.split('|').map((c) => c.trim()) : []);
        }}
      />
    </label>
  );
}

function TableRowsField({ label, rows, onChange }: { label: string; rows: readonly (readonly string[])[]; onChange: (r: string[][]) => void }) {
  const [text, setText] = useState(tableText(rows));
  return (
    <label className={s.lab}>
      {label}
      <TextArea
        rows={4}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(tableRows(e.target.value));
        }}
      />
      <span className={clsx(k.me, w.hint)}>One row per line, cells split by |.</span>
    </label>
  );
}

// --- a step's course fields ------------------------------------------------------------------------

/** The step dialog's course fields, for a week's step. */
export function StepWeekFields({ step, onChange }: { step: Step; onChange: (fn: (st: Step) => void) => void }) {
  const opt = (v: string): string | undefined => (v.trim() ? v : undefined);
  const setOpt = <K extends 'who' | 'timeLabel' | 'doneWhen' | 'linkedSkill'>(key: K, v: string) =>
    onChange((st) => {
      const x = opt(v);
      if (x === undefined) delete st[key];
      else st[key] = x;
    });
  const paths = step.paths ?? {};
  const setPath = (which: 'claude' | 'chatgpt', blocks: ContentBlock[]) =>
    onChange((st) => {
      const next = { ...(st.paths ?? {}) };
      if (blocks.length) next[which] = { blocks };
      else delete next[which];
      if (next.claude || next.chatgpt) st.paths = next;
      else delete st.paths;
    });
  return (
    <>
      <Line label="Who" value={step.who ?? ''} hint="Owner, Operator, Each of you" onChange={(v) => setOpt('who', v)} />
      <Line label="Time" value={step.timeLabel ?? ''} hint="20 min" onChange={(v) => setOpt('timeLabel', v)} />
      <Para label="Done when" value={step.doneWhen ?? ''} onChange={(v) => setOpt('doneWhen', v)} />
      <Line label="Linked skill" value={step.linkedSkill ?? ''} hint="The Library route, like map-your-spend" onChange={(v) => setOpt('linkedSkill', v)} />
      <label className={clsx(k.row, k.nw, w.check)}>
        <input
          type="checkbox"
          checked={!!step.openInPreview}
          onChange={(e) => {
            const on = e.target.checked;
            onChange((st) => {
              if (on) st.openInPreview = true;
              else delete st.openInPreview;
            });
          }}
        />
        Open in the pre-launch preview
      </label>
      <Blocks label="Claude path" blocks={paths.claude?.blocks ?? []} onChange={(b) => setPath('claude', b)} />
      <Blocks label="ChatGPT path" blocks={paths.chatgpt?.blocks ?? []} onChange={(b) => setPath('chatgpt', b)} />
    </>
  );
}

// --- the cards -------------------------------------------------------------------------------------

export interface WeekCardsProps {
  db: Db;
  draft: WeekDraft;
  up: Up;
  act: Act;
}

export function WeekCards(props: WeekCardsProps) {
  return (
    <>
      <CoursePageCard {...props} />
      <AgendaCard {...props} which="liveBuild" />
      <AgendaCard {...props} which="officeHours" />
      <HireCardsCard {...props} />
      <WeekSessionsCard {...props} />
      <KitCard {...props} />
    </>
  );
}

function CoursePageCard({ draft, up }: WeekCardsProps) {
  const [open, setOpen] = useState(false);
  const c = draft.course;
  const set = (fn: (c: WeekDraft['course']) => void) => up((d) => fn(d.course!));
  return (
    <Card
      title={`Course page · Week ${c.week}`}
      right={
        <span className={clsx(k.row, k.nw)}>
          <ButtonLink kind="quiet" to="/admin/curriculum/course">
            Course settings
          </ButtonLink>
          <Button kind="quiet" onClick={() => setOpen(true)}>
            Edit
          </Button>
        </span>
      }
    >
      <KV
        rows={[
          { label: 'Title', value: c.title },
          { label: 'Question', value: c.question },
          { label: 'Promise', value: c.promise ?? <span className={k.mu}>Not set</span> },
          { label: 'Owner time', value: c.time.owner },
          { label: 'Operator time', value: c.time.operator },
        ]}
      />
      {open ? (
        <Modal
          title={`Course page · Week ${c.week}`}
          width={640}
          onClose={() => setOpen(false)}
          foot={
            <Button kind="primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          }
        >
          <Line label="Week title" value={c.title} onChange={(v) => set((x) => (x.title = v))} />
          <Line label="Question" value={c.question} onChange={(v) => set((x) => (x.question = v))} />
          <Line
            label="Promise"
            value={c.promise ?? ''}
            onChange={(v) =>
              set((x) => {
                if (v.trim()) x.promise = v;
                else delete x.promise;
              })
            }
          />
          <Lines label="Why" items={c.why} onChange={(v) => set((x) => (x.why = v))} />
          <Para label="Owner line" value={c.owner} onChange={(v) => set((x) => (x.owner = v))} />
          <Para label="Operator line" value={c.operator} onChange={(v) => set((x) => (x.operator = v))} />
          <div className={clsx(k.row, k.nw)}>
            <span className={k.sp}>
              <Line label="Owner time" value={c.time.owner} onChange={(v) => set((x) => (x.time.owner = v))} />
            </span>
            <span className={k.sp}>
              <Line label="Operator time" value={c.time.operator} onChange={(v) => set((x) => (x.time.operator = v))} />
            </span>
          </div>
          <Line
            label="Flagship"
            value={c.flagship ?? ''}
            onChange={(v) =>
              set((x) => {
                if (v.trim()) x.flagship = v;
                else delete x.flagship;
              })
            }
          />
          <Lines
            label="Tools"
            items={c.tools ?? []}
            onChange={(v) =>
              set((x) => {
                if (v.length) x.tools = v;
                else delete x.tools;
              })
            }
          />
          <Lines label="By week’s end" items={c.homework.byWeekEnd} onChange={(v) => set((x) => (x.homework.byWeekEnd = v))} />
          <Lines label="Assignment" items={c.homework.assignment} onChange={(v) => set((x) => (x.homework.assignment = v))} />
          <Lines label="Checkpoint" items={c.homework.acceptance} onChange={(v) => set((x) => (x.homework.acceptance = v))} />
          <Para label="Use evidence" value={c.homework.useEvidence} onChange={(v) => set((x) => (x.homework.useEvidence = v))} />
          <Lines label="Materials" items={c.materials} onChange={(v) => set((x) => (x.materials = v))} />
          <Lines label="Media" items={c.media} onChange={(v) => set((x) => (x.media = v))} />
        </Modal>
      ) : null}
    </Card>
  );
}

const minutes = (a: AgendaItem): string => `${a.from} to ${a.to} min`;

function AgendaCard({ draft, up, which }: WeekCardsProps & { which: 'liveBuild' | 'officeHours' }) {
  const [rowAt, setRowAt] = useState<number | null>(null);
  const [page, setPage] = useState(false);
  const c = draft.course;
  const title = which === 'liveBuild' ? 'Live build' : 'Office hours';
  if (which === 'liveBuild' && !c.liveBuild) return null;
  if (which === 'officeHours' && !c.officeHours) return null;
  const rows: AgendaItem[] = which === 'liveBuild' ? c.liveBuild!.agenda : (c.officeHours!.format ?? []);
  const setRows = (next: AgendaItem[]) =>
    up((d) => {
      if (which === 'liveBuild') d.course!.liveBuild!.agenda = next;
      else d.course!.officeHours!.format = next;
    });
  const row = rowAt !== null ? rows[rowAt] : undefined;
  return (
    <Card
      title={`${title} · Run of show`}
      pad={false}
      right={
        <span className={clsx(k.row, k.nw)}>
          <Button kind="quiet" onClick={() => setPage(true)}>
            Page
          </Button>
          <Button
            kind="quiet"
            icon="r2Plus"
            onClick={() => {
              const last = rows[rows.length - 1];
              const from = last ? last.to : 0;
              setRows([...rows, { from, to: from + 10, activity: '', why: '' }]);
              setRowAt(rows.length);
            }}
          >
            Add row
          </Button>
        </span>
      }
    >
      {rows.length === 0 ? <p className={clsx(k.p, k.mu, w.pad)}>No rows yet.</p> : null}
      {rows.map((a, i) => (
        <Row
          key={i}
          label={`${title} row ${i + 1}`}
          onEdit={() => setRowAt(i)}
          movable
          onUp={i > 0 ? () => setRows(moveBy(rows, i, -1)) : undefined}
          onDown={i < rows.length - 1 ? () => setRows(moveBy(rows, i, 1)) : undefined}
          onRemove={() => setRows(removeAt(rows, i))}
        >
          <span className={clsx(k.me, k.tn)}>{minutes(a)}</span> <b>{a.activity || 'Untitled'}</b>
          {a.why ? <span className={clsx(k.mu, w.sub)}>{a.why}</span> : null}
        </Row>
      ))}
      {row && rowAt !== null ? (
        <Modal
          title={`${title} · Row ${rowAt + 1}`}
          onClose={() => setRowAt(null)}
          foot={
            <Button kind="primary" onClick={() => setRowAt(null)}>
              Done
            </Button>
          }
        >
          <div className={clsx(k.row, k.nw)}>
            <label className={clsx(s.lab, k.sp)}>
              From (minute)
              <input className={k.in} type="number" min={0} value={row.from} onChange={(e) => setRows(setAt(rows, rowAt, { ...row, from: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
            </label>
            <label className={clsx(s.lab, k.sp)}>
              To (minute)
              <input className={k.in} type="number" min={0} value={row.to} onChange={(e) => setRows(setAt(rows, rowAt, { ...row, to: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
            </label>
          </div>
          <Line label="Label" value={row.activity} onChange={(v) => setRows(setAt(rows, rowAt, { ...row, activity: v }))} />
          <Para label="Text" value={row.why} onChange={(v) => setRows(setAt(rows, rowAt, { ...row, why: v }))} />
        </Modal>
      ) : null}
      {page ? (
        <Modal
          title={`${title} page`}
          width={640}
          onClose={() => setPage(false)}
          foot={
            <Button kind="primary" onClick={() => setPage(false)}>
              Done
            </Button>
          }
        >
          {which === 'liveBuild' ? <LiveBuildPageFields draft={draft} up={up} /> : <OfficeHoursPageFields draft={draft} up={up} />}
        </Modal>
      ) : null}
    </Card>
  );
}

function LiveBuildPageFields({ draft, up }: { draft: WeekDraft; up: Up }) {
  const lb = draft.course.liveBuild!;
  const set = (fn: (x: NonNullable<WeekDraft['course']['liveBuild']>) => void) => up((d) => fn(d.course!.liveBuild!));
  return (
    <>
      <Para label="Lesson" value={lb.lesson} onChange={(v) => set((x) => (x.lesson = v))} />
      <Para label="Exercise" value={lb.exercise} onChange={(v) => set((x) => (x.exercise = v))} />
      <Para label="Required outcome" value={lb.required} onChange={(v) => set((x) => (x.required = v))} />
      <Para label="Advanced option" value={lb.advanced} onChange={(v) => set((x) => (x.advanced = v))} />
      <Para label="Owner approval" value={lb.ownerApproval} onChange={(v) => set((x) => (x.ownerApproval = v))} />
      <Lines label="Working at the end" items={lb.workingAtEnd} onChange={(v) => set((x) => (x.workingAtEnd = v))} />
    </>
  );
}

function OfficeHoursPageFields({ draft, up }: { draft: WeekDraft; up: Up }) {
  const oh = draft.course.officeHours!;
  const set = (fn: (x: NonNullable<WeekDraft['course']['officeHours']>) => void) => up((d) => fn(d.course!.officeHours!));
  return (
    <>
      <Line label="Title" value={oh.title} onChange={(v) => set((x) => (x.title = v))} />
      <Para label="Note" value={oh.note} onChange={(v) => set((x) => (x.note = v))} />
      <Lines
        label="What you leave with"
        items={oh.outputs ?? []}
        onChange={(v) =>
          set((x) => {
            if (v.length) x.outputs = v;
            else delete x.outputs;
          })
        }
      />
    </>
  );
}

// --- hire cards ------------------------------------------------------------------------------------

type CardKey = 'seatCard' | 'playbookCard' | 'sampleOutput' | 'lockedCopy' | 'statusLabels';
const CARD_LABELS: Readonly<Record<CardKey, string>> = {
  seatCard: 'Seat card',
  playbookCard: 'Playbook card',
  sampleOutput: 'Sample output',
  lockedCopy: 'Locked copy',
  statusLabels: 'Status labels',
};
const EMPTY: { [K in CardKey]: NonNullable<WeekDraft['course'][K]> } = {
  seatCard: { seat: '', reportsTo: '', runs: '', pulls: '', applies: '', produces: '', tookOver: '', cantDo: '' },
  playbookCard: { number: '', question: '', play: '', signedOff: false },
  sampleOutput: { title: '', madeUpLabel: 'Made-up data', blocks: [] },
  lockedCopy: { headline: '', line: '', opens: 'Opens {date}' },
  statusLabels: {},
};

function HireCardsCard({ draft, up }: WeekCardsProps) {
  const [open, setOpen] = useState<CardKey | null>(null);
  const [drop, setDrop] = useState<CardKey | null>(null);
  const c = draft.course;
  return (
    <Card title="Hire cards" pad={false}>
      {(Object.keys(CARD_LABELS) as CardKey[]).map((key) => {
        const has = c[key] !== undefined;
        return (
          <Row key={key} label={CARD_LABELS[key]} onEdit={() => {
            if (!has) up((d) => ((d.course as unknown as Record<string, unknown>)[key] = structuredClone(EMPTY[key])));
            setOpen(key);
          }} onRemove={has ? () => setDrop(key) : undefined}>
            <b>{CARD_LABELS[key]}</b> <span className={k.mu}>{has ? 'Set' : 'Not set'}</span>
          </Row>
        );
      })}
      {open ? (
        <Modal
          title={CARD_LABELS[open]}
          width={640}
          onClose={() => setOpen(null)}
          foot={
            <Button kind="primary" onClick={() => setOpen(null)}>
              Done
            </Button>
          }
        >
          {open === 'seatCard' && c.seatCard ? <SeatCardFields card={c.seatCard} set={(fn) => up((d) => fn(d.course!.seatCard!))} /> : null}
          {open === 'playbookCard' && c.playbookCard ? <PlaybookFields card={c.playbookCard} set={(fn) => up((d) => fn(d.course!.playbookCard!))} /> : null}
          {open === 'sampleOutput' && c.sampleOutput ? <SampleFields card={c.sampleOutput} set={(fn) => up((d) => fn(d.course!.sampleOutput!))} /> : null}
          {open === 'lockedCopy' && c.lockedCopy ? <LockedFields card={c.lockedCopy} set={(fn) => up((d) => fn(d.course!.lockedCopy!))} /> : null}
          {open === 'statusLabels' && c.statusLabels ? (
            <StatusLabelFields
              labels={c.statusLabels}
              onChange={(v) =>
                up((d) => {
                  d.course!.statusLabels = v;
                })
              }
            />
          ) : null}
        </Modal>
      ) : null}
      {drop ? (
        <Confirm
          title={`Remove the ${CARD_LABELS[drop].toLowerCase()}?`}
          body="It is removed when you save."
          cta="Remove"
          danger
          onConfirm={() => {
            const key = drop;
            up((d) => {
              delete (d.course as unknown as Record<string, unknown>)[key];
            });
          }}
          onClose={() => setDrop(null)}
        />
      ) : null}
    </Card>
  );
}

function SeatCardFields({ card, set }: { card: SeatCard; set: (fn: (c: SeatCard) => void) => void }) {
  const f = (label: string, key: Exclude<keyof SeatCard, 'firstRun'>) => <Line key={key} label={label} value={card[key]} onChange={(v) => set((c) => (c[key] = v))} />;
  return (
    <>
      {f('Seat', 'seat')}
      {f('Reports to', 'reportsTo')}
      {f('Runs', 'runs')}
      {f('Pulls', 'pulls')}
      {f('Applies', 'applies')}
      {f('Produces', 'produces')}
      {f('Took over', 'tookOver')}
      {f('Can’t do', 'cantDo')}
      <Line
        label="First run"
        value={card.firstRun ?? ''}
        onChange={(v) =>
          set((c) => {
            if (v.trim()) c.firstRun = v;
            else delete c.firstRun;
          })
        }
      />
    </>
  );
}

function PlaybookFields({ card, set }: { card: PlaybookCard; set: (fn: (c: PlaybookCard) => void) => void }) {
  return (
    <>
      <Line
        label="Name"
        value={card.name ?? ''}
        onChange={(v) =>
          set((c) => {
            if (v.trim()) c.name = v;
            else delete c.name;
          })
        }
      />
      <Line label="Number" value={card.number} onChange={(v) => set((c) => (c.number = v))} />
      <Line label="Question" value={card.question} onChange={(v) => set((c) => (c.question = v))} />
      <Para label="Play" value={card.play} onChange={(v) => set((c) => (c.play = v))} />
      <Line
        label="Source section"
        value={card.source ?? ''}
        onChange={(v) =>
          set((c) => {
            if (v.trim()) c.source = v;
            else delete c.source;
          })
        }
      />
      <label className={clsx(k.row, k.nw, w.check)}>
        <input type="checkbox" checked={card.signedOff} onChange={(e) => set((c) => (c.signedOff = e.target.checked))} />
        Signed off
      </label>
    </>
  );
}

function SampleFields({ card, set }: { card: SampleOutput; set: (fn: (c: SampleOutput) => void) => void }) {
  return (
    <>
      <Line label="Title" value={card.title} onChange={(v) => set((c) => (c.title = v))} />
      <Line label="Made-up label" value={card.madeUpLabel} hint="Made-up data" onChange={(v) => set((c) => (c.madeUpLabel = v))} />
      <Blocks label="Sample" blocks={card.blocks} onChange={(b) => set((c) => (c.blocks = b))} />
    </>
  );
}

function LockedFields({ card, set }: { card: LockedCopy; set: (fn: (c: LockedCopy) => void) => void }) {
  return (
    <>
      <Line label="Headline" value={card.headline} onChange={(v) => set((c) => (c.headline = v))} />
      <Para label="Line" value={card.line} onChange={(v) => set((c) => (c.line = v))} />
      <Line label="Opens" value={card.opens} hint="Opens {date}" onChange={(v) => set((c) => (c.opens = v))} />
      <p className={clsx(k.p, k.me)}>{'{date}'} becomes the week’s opening day and time, in Mountain Time.</p>
    </>
  );
}

function StatusLabelFields({ labels, onChange }: { labels: Readonly<Record<string, string>>; onChange: (v: Record<string, string>) => void }) {
  const [text, setText] = useState(Object.entries(labels).map(([key, v]) => `${key}: ${v}`).join('\n'));
  return (
    <label className={s.lab}>
      Labels
      <TextArea
        rows={5}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const out: Record<string, string> = {};
          for (const line of e.target.value.split('\n')) {
            const at = line.indexOf(':');
            if (at > 0 && line.slice(at + 1).trim()) out[line.slice(0, at).trim()] = line.slice(at + 1).trim();
          }
          onChange(out);
        }}
      />
      <span className={clsx(k.me, w.hint)}>One per line: state, a colon, then the label (not_started: Not hired yet).</span>
    </label>
  );
}

// --- the week's sessions (saved at once) -----------------------------------------------------------

interface SessionForm {
  id?: string;
  kind: SessionType;
  title: string;
  date: string;
  time: string;
  mins: string;
  zoom: string;
  replayVisibility: ReplayVisibility | null;
}

const formOf = (r: WeekSessionRow): SessionForm => ({
  id: r.id,
  kind: r.session.kind ?? 'other',
  title: r.session.title,
  ...mtInputs(r.session.start),
  mins: String(r.session.mins),
  zoom: r.session.zoom,
  replayVisibility: r.session.replayVisibility ?? null,
});

function WeekSessionsCard({ db, draft, act }: WeekCardsProps) {
  const rows = weekSessions(db, draft);
  const [form, setForm] = useState<SessionForm | null>(null);
  const [error, setError] = useState('');
  const [del, setDel] = useState<WeekSessionRow | null>(null);
  const cohortId = rows[0]?.session.cohortId ?? db.cohorts[0]?.id ?? '';
  const save = async () => {
    if (!form) return;
    const out = await act('saveSession', {
      ...(form.id ? { id: form.id } : {}),
      cohortId,
      moduleId: draft.id,
      kind: form.kind,
      title: form.title,
      date: form.date,
      time: form.time,
      mins: form.mins,
      zoom: form.zoom,
      replayVisibility: form.replayVisibility,
    });
    if (out.error) setError(out.error);
    else {
      setForm(null);
      setError('');
    }
  };
  return (
    <Card
      title={`Sessions · ${rows.length}`}
      pad={false}
      right={
        <Button kind="quiet" icon="r2Plus" onClick={() => setForm({ kind: 'office_hours', title: '', date: '', time: '12:00', mins: '60', zoom: '', replayVisibility: null })}>
          Add session
        </Button>
      }
    >
      {rows.length === 0 ? <p className={clsx(k.p, k.mu, w.pad)}>No sessions yet.</p> : null}
      {rows.map((r) => (
        <Row key={r.id} label={r.title} onEdit={() => setForm(formOf(r))} onRemove={r.named ? undefined : () => setDel(r)}>
          <Pill>{r.kind}</Pill> <b>{r.title}</b>
          <span className={clsx(k.me, w.sub)}>
            {r.when} · {r.mins} min
          </span>
        </Row>
      ))}
      <p className={clsx(k.p, k.me, w.pad)}>Sessions save as soon as you save the dialog. Times are Mountain Time.</p>
      {form ? (
        <Modal
          title={form.id ? 'Edit session' : 'Add session'}
          onClose={() => setForm(null)}
          foot={
            <>
              <Button onClick={() => setForm(null)}>Cancel</Button>
              <Button kind="primary" onClick={() => void save()}>
                Save session
              </Button>
            </>
          }
        >
          {error ? (
            <div role="alert" className={s.alert}>
              {error.split('\n').map((e) => (
                <p key={e} className={k.p}>
                  {e}
                </p>
              ))}
            </div>
          ) : null}
          <Choice label="Kind" value={form.kind} options={SESSION_KIND_LABELS} onChange={(v) => setForm({ ...form, kind: v ?? 'other' })} />
          <Line label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <div className={clsx(k.row, k.nw)}>
            <label className={clsx(s.lab, k.sp)}>
              Date (MT)
              <input className={k.in} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label className={clsx(s.lab, k.sp)}>
              Start (MT)
              <input className={k.in} type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </label>
          </div>
          <Line label="Length (minutes)" value={form.mins} onChange={(v) => setForm({ ...form, mins: v })} />
          <Line label="Zoom link" value={form.zoom} onChange={(v) => setForm({ ...form, zoom: v })} />
          <Choice label="Replay" value={form.replayVisibility} options={REPLAY_LABELS} none="Not set" onChange={(v) => setForm({ ...form, replayVisibility: v })} />
        </Modal>
      ) : null}
      {del ? (
        <Confirm
          title={`Delete “${del.title}”?`}
          body="The session leaves the calendar now. A session that has run stays on the record and can’t be deleted."
          cta="Delete session"
          danger
          onConfirm={() => void act('deleteSession', { id: del.id })}
          onClose={() => setDel(null)}
        />
      ) : null}
    </Card>
  );
}

// --- the week's kit (saved at once) ----------------------------------------------------------------

interface KitForm {
  row: KitRow;
  kind: ResourceKind | null;
  stepId: string | null;
  visibility: ResourceVisibility | null;
  platform: ResourcePlatform | null;
}

function KitCard({ db, draft, act }: WeekCardsProps) {
  const rows = weekKit(db, draft);
  const free = unattached(db);
  const [form, setForm] = useState<KitForm | null>(null);
  const [pick, setPick] = useState('');
  const write = async (r: KitRow['resource'], module: string | null, kit: { kind: ResourceKind | null; stepId: string | null; visibility: ResourceVisibility | null; platform: ResourcePlatform | null }) =>
    act('editResource', { id: r.id, title: r.title, desc: r.desc, cat: r.cat, tier: r.tier, module, kit });
  return (
    <Card title={`Kit · ${rows.length}`} pad={false}>
      {rows.length === 0 ? <p className={clsx(k.p, k.mu, w.pad)}>Nothing in this week’s kit yet.</p> : null}
      {rows.map((r) => (
        <Row
          key={r.id}
          label={r.title}
          onEdit={() => setForm({ row: r, kind: r.resource.kind ?? null, stepId: r.resource.stepId ?? null, visibility: r.resource.visibility ?? null, platform: r.resource.platform ?? null })}
          onRemove={() => void write(r.resource, null, { kind: null, stepId: null, visibility: null, platform: null })}
        >
          <b>{r.title}</b>
          <span className={clsx(k.me, w.sub)}>
            {r.kind} · {r.step} · {r.visibility} · {r.platform}
          </span>
        </Row>
      ))}
      <div className={clsx(k.row, w.pad, w.adder)}>
        <Sel className={w.grow} aria-label="A vault item to attach" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Attach from the vault…</option>
          {free.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </Sel>
        <Button
          kind="quiet"
          disabled={!pick}
          onClick={() => {
            const r = free.find((x) => x.id === pick);
            if (r) void write(r, draft.id, { kind: r.kind ?? null, stepId: null, visibility: r.visibility ?? 'hidden_until_open', platform: r.platform ?? null });
            setPick('');
          }}
        >
          Attach
        </Button>
      </div>
      {form ? (
        <Modal
          title={form.row.title}
          onClose={() => setForm(null)}
          foot={
            <>
              <Button onClick={() => setForm(null)}>Cancel</Button>
              <Button
                kind="primary"
                onClick={() => {
                  void write(form.row.resource, draft.id, { kind: form.kind, stepId: form.stepId, visibility: form.visibility, platform: form.platform });
                  setForm(null);
                }}
              >
                Save placement
              </Button>
            </>
          }
        >
          <Choice label="What it is" value={form.kind} options={RESOURCE_KIND_LABELS} none="Not set" onChange={(v) => setForm({ ...form, kind: v })} />
          <label className={s.lab}>
            Step
            <Sel className={k.full} value={form.stepId ?? ''} onChange={(e) => setForm({ ...form, stepId: e.target.value || null })}>
              <option value="">The whole week</option>
              {draft.checklist.map((st, i) => (
                <option key={st.id} value={st.id}>
                  {`Step ${i + 1} · ${st.text}`}
                </option>
              ))}
            </Sel>
          </label>
          <Choice label="Who sees it, and when" value={form.visibility} options={VISIBILITY_LABELS} none="Not set" onChange={(v) => setForm({ ...form, visibility: v })} />
          <Choice label="Platform" value={form.platform} options={PLATFORM_LABELS} none="Not set" onChange={(v) => setForm({ ...form, platform: v })} />
        </Modal>
      ) : null}
    </Card>
  );
}

export type { WeekDraft };

// --- the live preview: the learner's course page, from the unsaved draft ---------------------------

/**
 * Preview as Learner, for a course week: the learner's course page drawn from the draft as it is now
 * (nothing saved, nothing sent), as an owner, an operator, a Utah Life member and a buyer before
 * launch. The page is the real one (`CourseBody`), given the draft instead of the API's answer.
 */
export function CoursePreview({ db, draft, phone, onClose }: { db: Db; draft: WeekDraft; phone: boolean; onClose: () => void }) {
  const [as, setAs] = useState<PreviewAs>('owner');
  const load = previewLoad(db, draft, as, COURSE_OPENS_AT);
  return (
    <Modal
      title={`Preview · Week ${draft.course.week}`}
      width={1100}
      onClose={onClose}
      foot={
        <Button kind="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <Tabs
        label="Preview as"
        phone={phone}
        value={as}
        onChange={setAs}
        tabs={(Object.keys(PREVIEW_AS_LABELS) as PreviewAs[]).map((id) => ({ id, label: PREVIEW_AS_LABELS[id] }))}
      />
      <p className={clsx(k.p, k.me)}>From the unsaved draft. Nothing here is saved or sent; learners see it after you save.</p>
      <div className={w.preview} data-testid="course-preview">
        <CourseBody load={load} week={previewWeek(draft)} />
      </div>
    </Modal>
  );
}
