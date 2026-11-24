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

import { useId, useRef, useState } from 'react';
import clsx from 'clsx';
import type { AIEmployee, Db, ReplayVisibility, ResourceKind, ResourcePlatform, ResourceVisibility, SessionType, Step } from '@ai/core';
import type { AccordionBlock, AgendaItem, CalloutBlock, CheckAction, CheckBlock, ContentBlock, CourseSkill, LockedCopy, PathBlock, PlaybookCard, SampleOutput, SeatCard, SkillRole, VideoBlock } from '@ai/core/course-types';
import { titleWords } from '@ai/core/checklist';
import { chapterText, parseChapters } from '@ai/core';
import { isVideoUpload } from '@ai/core/course-types';
import { fileSizeLabel, uploadAccept } from '@ai/core/uploads';
import { uploadFile } from '../../data/files';
import { UPLOAD_COPY } from '../../data/upload';
import { Button, ButtonLink } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Confirm, Modal } from '../../components/r2/Modal';
import { KV, Pill, Sel, Tabs, TextArea, k } from '../../components/r2/kit';
import { COURSE_OPENS_AT } from '@ai/core/accelerator';
import { CourseBody } from '../course/Course';
import { ROLE_LABEL } from '../course/Course.vm';
import { LearnerWeekPreview } from '../learn/Preview';
import { IntakeCard } from './IntakeCard';
import { StackCard } from './StackCard';
import { SubmissionsCard } from './SubmissionsCard';
import { SeatCardsCard } from './SeatCardsCard';

import { TextBlock } from './TextBlock';
import { RichField } from './RichField';
import { useNow } from '../../data/hooks';
import type { useAct } from '../../data/hooks';
import {
  ACTION_KINDS,
  UPLOAD_KINDS,
  BLOCK_LABELS,
  CALLOUT_KINDS,
  CHECK_ROLES,
  CONTENT_KINDS,
  PATH_KINDS,
  VIDEO_KINDS,
  VIDEO_LABELS,
  nextCheckId,
  nextVideoId,
  mediaLines,
  mediaVideos,
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
  withDraft,
} from './WeekBuilder.vm';
import type { KitRow, PreviewAs, WeekDraft, WeekSessionRow } from './WeekBuilder.vm';
import s from './ModuleBuilder.module.css';
import w from './WeekBuilder.module.css';

/** D-236: the seat card's "Item to check" (its placeholder): saving it ready checks this item; signing, the one named. */
const SEAT_CARD_ITEM_HINT = 'The item the owner’s signature checks, as w1s6c-sign. Blank uses this item.';

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

/**
 * A list of blocks: a step's Claude or ChatGPT path (every kind, D-188's video too), a sample output
 * (the content kinds), or a week's Media videos (video only). Add, edit, reorder and remove.
 */
export interface BlockPicks {
  kit: { id: string; title: string }[];
  sessions: { id: string; title: string }[];
  /** Checklist ids already used on this step, so a new item does not reuse one. */
  ids: string[];
  /** D-193: glossary terms the Card action can list, from Course settings. */
  glossary?: { id: string; term: string }[];
  /** Video ids already used anywhere in this week (both paths of every step): a video's id is unique per week
   *  (course-rules `videoIssues`), so a new one does not reuse one. */
  videoIds?: string[];
}

export function Blocks({
  label,
  blocks,
  onChange,
  kinds = CONTENT_KINDS,
  picks,
}: {
  label: string;
  blocks: readonly PathBlock[];
  onChange: (b: PathBlock[]) => void;
  kinds?: readonly PathBlock['type'][];
  picks?: BlockPicks;
}) {
  const [add, setAdd] = useState<PathBlock['type']>(kinds[0] ?? 'text');
  const set = (i: number, b: PathBlock) => onChange(setAt(blocks, i, b));
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
          {b.type === 'text' ? <TextBlock label={`${label} block ${i + 1}`} block={b} onChange={(next) => set(i, next)} /> : null}
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
          {b.type === 'video' ? <VideoFields n={i + 1} block={b} ids={[...new Set([...(picks?.ids ?? []), ...blocks.flatMap((x) => (x.type === 'check' ? [x.id] : []))])]} onChange={(v) => set(i, v)} /> : null}
          {b.type === 'check' ? (
            <CheckFields
              n={i + 1}
              block={b}
              picks={picks}
              ids={blocks.flatMap((x) => (x.type === 'check' ? [x.id] : []))}
              videos={blocks.flatMap((x) => (x.type === 'video' && x.id ? [{ id: x.id, label: x.title?.trim() || x.id }] : []))}
              onChange={(v) => set(i, v)}
            />
          ) : null}
          {b.type === 'callout' ? <CalloutFields n={i + 1} block={b} onChange={(v) => set(i, v)} /> : null}
          {b.type === 'accordion' ? <AccordionFields n={i + 1} block={b} onChange={(v) => set(i, v)} /> : null}
        </div>
      ))}
      <div className={clsx(k.row, w.adder)}>
        {kinds.length > 1 ? (
          <Sel className={w.grow} aria-label={`${label}: kind of block to add`} value={add} onChange={(e) => setAdd(e.target.value as PathBlock['type'])}>
            {kinds.map((t) => (
              <option key={t} value={t}>
                {BLOCK_LABELS[t]}
              </option>
            ))}
          </Sel>
        ) : null}
        <Button
          kind="quiet"
          icon="r2Plus"
          onClick={() => {
            const block = newBlock(add);
            const withId =
              block.type === 'check' ? { ...block, id: nextCheckId([...(picks?.ids ?? []), ...blocks.flatMap((b) => (b.type === 'check' ? [b.id] : []))]) }
              : block.type === 'video' ? { ...block, id: nextVideoId([...(picks?.videoIds ?? []), ...blocks.flatMap((b) => (b.type === 'video' && b.id ? [b.id] : []))]) }
              : block;
            onChange([...blocks, withId]);
          }}
        >
          Add block
        </Button>
      </div>
    </fieldset>
  );
}

/**
 * D-188: a video block's source and title. A link (http or https; the save refuses anything else), or
 * an mp4 uploaded through `POST /api/files/upload-url` straight to the bucket (fixture mode records it
 * without sending it), with its progress and any refusal said here. The save runs the copy rules on
 * the title.
 */
function VideoFields({ n, block, ids, onChange }: { n: number; block: VideoBlock; ids: string[]; onChange: (b: VideoBlock) => void }) {
  const uploaded = isVideoUpload(block.source) ? block.source : null;
  const [mode, setMode] = useState<'link' | 'upload'>(uploaded ? 'upload' : 'link');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement | null>(null);
  const posterInput = useRef<HTMLInputElement | null>(null);
  const transcriptInput = useRef<HTMLInputElement | null>(null);
  const group = useId();
  const setSource = (source: VideoBlock['source']) => onChange({ ...block, source });
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setProgress(0);
    const out = await uploadFile(file, setProgress, true);
    setProgress(null);
    if (input.current) input.current.value = '';
    if (!out.ok) setError(out.error);
    else onChange({ ...block, source: { upload: out.file.key, name: out.file.name, size: out.file.size, type: 'video/mp4' } });
  };
  const pickSide = async (file: File | undefined, kind: 'poster' | 'transcript') => {
    if (!file) return;
    setError('');
    setProgress(0);
    const out = await uploadFile(file, setProgress);
    setProgress(null);
    const el = kind === 'poster' ? posterInput.current : transcriptInput.current;
    if (el) el.value = '';
    if (!out.ok) {
      setError(out.error);
      return;
    }
    if (kind === 'poster' && out.file.type !== 'image/jpeg') {
      setError('Choose a jpg.');
      return;
    }
    if (kind === 'transcript' && out.file.type !== 'text/vtt') {
      setError('Choose a vtt file.');
      return;
    }
    if (kind === 'poster') onChange({ ...block, poster: { upload: out.file.key, name: out.file.name, size: out.file.size, type: 'image/jpeg' } });
    else onChange({ ...block, transcript: { upload: out.file.key, name: out.file.name, size: out.file.size, type: 'text/vtt' } });
  };
  const without = (key: 'title' | 'poster' | 'transcript' | 'id'): VideoBlock => {
    const next = { ...block };
    delete next[key];
    return next;
  };
  return (
    <>
      <Line label={`Block ${n} ${VIDEO_LABELS.id.toLowerCase()}`} value={block.id ?? ''} hint={VIDEO_LABELS.idHint} onChange={(v) => onChange(v.trim() ? { ...block, id: v.trim() } : without('id'))} />
      <div className={clsx(k.row, k.nw)} role="radiogroup" aria-label={`Block ${n} ${VIDEO_LABELS.source.toLowerCase()}`}>
        <label className={clsx(k.row, k.nw, w.check)}>
          <input type="radio" name={group} checked={mode === 'link'} onChange={() => setMode('link')} />
          {VIDEO_LABELS.link}
        </label>
        <label className={clsx(k.row, k.nw, w.check)}>
          <input type="radio" name={group} checked={mode === 'upload'} onChange={() => setMode('upload')} />
          {VIDEO_LABELS.upload}
        </label>
      </div>
      {mode === 'link' ? (
        <Line label={`Block ${n} link`} value={uploaded ? '' : (block.source as { url: string }).url} hint={VIDEO_LABELS.linkHint} onChange={(url) => setSource({ url })} />
      ) : (
        <div className={clsx(k.row, w.adder)}>
          <span className={clsx(k.sp, uploaded ? undefined : k.mu)}>{uploaded ? `${uploaded.name} · ${fileSizeLabel(uploaded.size)}` : VIDEO_LABELS.noFile}</span>
          <Button kind="quiet" disabled={progress !== null} onClick={() => input.current?.click()}>
            {uploaded ? VIDEO_LABELS.chooseAnother : VIDEO_LABELS.choose}
          </Button>
        </div>
      )}
      <div className={clsx(k.row, w.adder)}>
        <span className={clsx(k.sp, block.poster ? undefined : k.mu)}>{block.poster ? `${block.poster.name} · ${fileSizeLabel(block.poster.size)}` : 'No poster yet.'}</span>
        <Button kind="quiet" disabled={progress !== null} onClick={() => posterInput.current?.click()}>
          {block.poster ? VIDEO_LABELS.posterAnother : VIDEO_LABELS.poster}
        </Button>
        {block.poster ? (
          <Button kind="quiet" onClick={() => onChange(without('poster'))}>
            {VIDEO_LABELS.removeFile}
          </Button>
        ) : null}
      </div>
      <div className={clsx(k.row, w.adder)}>
        <span className={clsx(k.sp, block.transcript ? undefined : k.mu)}>{block.transcript ? `${block.transcript.name} · ${fileSizeLabel(block.transcript.size)}` : 'No transcript yet.'}</span>
        <Button kind="quiet" disabled={progress !== null} onClick={() => transcriptInput.current?.click()}>
          {block.transcript ? VIDEO_LABELS.transcriptAnother : VIDEO_LABELS.transcript}
        </Button>
        {block.transcript ? (
          <Button kind="quiet" onClick={() => onChange(without('transcript'))}>
            {VIDEO_LABELS.removeFile}
          </Button>
        ) : null}
      </div>
      {/* The mp4 input stays last so the builder’s file test, which takes the last input, still finds it. */}
      <input ref={posterInput} type="file" accept=".jpg,.jpeg" hidden aria-label={`Block ${n} upload poster`} onChange={(e) => void pickSide(e.target.files?.[0], 'poster')} />
      <input ref={transcriptInput} type="file" accept=".vtt" hidden aria-label={`Block ${n} upload transcript`} onChange={(e) => void pickSide(e.target.files?.[0], 'transcript')} />
      {mode === 'upload' ? <input ref={input} type="file" accept={uploadAccept(true)} hidden aria-label={`Block ${n} ${VIDEO_LABELS.upload.toLowerCase()}`} onChange={(e) => void pick(e.target.files?.[0])} /> : null}
      <label className={clsx(k.row, k.nw, w.check)}>
        <input type="checkbox" checked={!!block.draft} onChange={(e) => onChange(e.target.checked ? { ...block, draft: true } : { ...block, draft: undefined })} />
        {VIDEO_LABELS.draft}
      </label>
      <ChaptersField n={n} chapters={block.chapters ?? []} ids={ids} onChange={(chapters) => onChange(chapters?.length ? { ...block, chapters } : { ...block, chapters: undefined })} />
      {progress !== null ? (
        <p role="status" className={clsx(k.p, k.me)}>
          {UPLOAD_COPY.progress(progress)}
        </p>
      ) : null}
      {error ? (
        <div role="alert" className={s.alert}>
          <p className={k.p}>{error}</p>
        </div>
      ) : null}
      <Line
        label={`Block ${n} ${VIDEO_LABELS.title.toLowerCase()}`}
        value={block.title ?? ''}
        hint={VIDEO_LABELS.titleHint}
        onChange={(v) => onChange(v.trim() ? { ...block, title: v } : without('title'))}
      />
    </>
  );
}

function ChaptersField({ n, chapters, ids, onChange }: { n: number; chapters: VideoBlock['chapters']; ids: string[]; onChange: (c: VideoBlock['chapters']) => void }) {
  const [text, setText] = useState(chapterText(chapters ?? []));
  const parsed = parseChapters(text);
  const apply = (next: string) => {
    setText(next);
    const result = parseChapters(next);
    if (!result.error) onChange(result.chapters.length ? result.chapters : undefined);
  };
  const setItem = (index: number, item: string) => {
    const next = parsed.chapters.map((c, i) => (i === index ? (item ? { ...c, item } : { t: c.t, label: c.label }) : c));
    apply(chapterText(next));
  };
  return (
    <div className={s.lab}>
      <span>{`Block ${n} ${VIDEO_LABELS.chapters.toLowerCase()}`}</span>
      <TextArea rows={4} aria-label={`Block ${n} ${VIDEO_LABELS.chapters.toLowerCase()}`} value={text} onChange={(e) => apply(e.target.value)} />
      <span className={clsx(k.me, w.hint)}>{VIDEO_LABELS.chaptersHint}</span>
      {parsed.error ? (
        <span role="alert" className={k.p}>{parsed.error}</span>
      ) : null}
      {parsed.error ? null : parsed.chapters.map((c, i) => (
        <span key={`${c.t}-${i}`} className={clsx(k.row, w.adder)}>
          <span className={k.sp}>{c.label}</span>
          <Sel aria-label={`Block ${n} chapter ${i + 1} item`} value={c.item ?? ''} onChange={(e) => setItem(i, e.target.value)}>
            <option value="">No checklist item</option>
            {ids.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
            {c.item && !ids.includes(c.item) ? <option value={c.item}>{c.item}</option> : null}
          </Sel>
        </span>
      ))}
    </div>
  );
}

function CheckFields({ n, block, picks, ids, videos, onChange }: { n: number; block: CheckBlock; picks?: BlockPicks; ids: string[]; videos: { id: string; label: string }[]; onChange: (b: CheckBlock) => void }) {
  const words = titleWords(block.title);
  const setAction = (type: string) => {
    const action: CheckAction | undefined =
      type === 'download' ? { type: 'download', kitItemIds: [] }
      : type === 'copy' ? { type: 'copy', label: 'Copy prompt', text: '' }
      : type === 'invite' ? { type: 'invite', label: 'Invite your AI Implementer' }
      : type === 'calendar' ? { type: 'calendar', sessionId: picks?.sessions[0]?.id ?? '' }
      : type === 'link' ? { type: 'link', label: 'Open', href: '' }
      : type === 'form' ? { type: 'form', formId: 'intake', label: 'Open the form' }
      : type === 'card' ? { type: 'card', terms: [] }
      : type === 'upload' ? { type: 'upload', kind: 'live_read' }
      : undefined;
    onChange(action ? { ...block, action } : { ...block, action: undefined });
  };
  const others = [...new Set([...(picks?.ids ?? []), ...ids])].filter((id) => id && id !== block.id);
  const stepIds = new Set(others);
  // One `step:N:id` per line. The text stays here while it is typed. A value drawn only from lines
  // that already start with `step:` clears on the first character and stores that character as a
  // same-step tick, then the next character, and so on. A tick is a checkbox for an id on this step.
  const [otherText, setOtherText] = useState(() =>
    (block.dependsOn ?? []).filter((d) => d.startsWith('step:') || !stepIds.has(d)).join('\n'),
  );
  const typed = new Set(listItems(otherText));
  const same = new Set((block.dependsOn ?? []).filter((d) => stepIds.has(d) && !typed.has(d)));
  const setDepends = (nextSame: Set<string>, text: string) => {
    const lines = listItems(text);
    const owned = new Set(lines);
    const ticks = [...nextSame].filter((id) => stepIds.has(id) && !owned.has(id));
    const dependsOn = [...ticks, ...lines];
    onChange(dependsOn.length ? { ...block, dependsOn } : { ...block, dependsOn: undefined });
  };
  return (
    <>
      <Line label={`Block ${n} id`} value={block.id} hint="Unique on this step. Don’t reuse an id you removed." onChange={(id) => onChange({ ...block, id })} />
      <Line label={`Block ${n} title`} value={block.title} hint={words > 8 ? `${words} words. Aim for 8 or fewer.` : '8 words or fewer.'} onChange={(title) => onChange({ ...block, title })} />
      <RichField label={`Block ${n} detail`} plain={block.detail ?? ''} rich={block.detailRich} onChange={(text, rich) => {
        const next = { ...block };
        if (text.trim()) next.detail = text;
        else delete next.detail;
        if (rich) next.detailRich = rich;
        else delete next.detailRich;
        onChange(next);
      }} />
      <label className={s.lab}>
        Role
        <Sel aria-label={`Block ${n} role`} value={block.role ?? ''} onChange={(e) => onChange({ ...block, role: (e.target.value || undefined) as CheckBlock['role'] })}>
          {CHECK_ROLES.map(([value, label]) => (
            <option key={value || 'none'} value={value}>{label}</option>
          ))}
        </Sel>
      </label>
      <label className={clsx(k.row, k.nw, w.check)}>
        <input type="checkbox" checked={!!block.optional} onChange={(e) => onChange({ ...block, optional: e.target.checked || undefined })} />
        Optional. A learner can mark the step done without it.
      </label>
      <Lines label={`Block ${n} click path`} items={block.clickPath ?? []} onChange={(clickPath) => onChange(clickPath.length ? { ...block, clickPath } : { ...block, clickPath: undefined })} />
      <Line label={`Block ${n} play at`} value={block.playAt ? String(block.playAt.t) : ''} hint="Seconds into this path’s video. Blank for none." onChange={(v) => {
        const n = Number(v);
        if (!v.trim() || !Number.isFinite(n)) onChange({ ...block, playAt: undefined });
        else onChange({ ...block, playAt: { t: Math.max(0, Math.round(n * 10) / 10), ...(block.playAt?.video ? { video: block.playAt.video } : {}) } });
      }} />
      <label className={clsx(k.row, k.nw, w.check)}>
        <input
          type="checkbox"
          checked={!!block.auto}
          onChange={(e) => onChange(e.target.checked ? { ...block, auto: { video: true, at: block.auto?.at ?? 90, ...(block.auto?.id ? { id: block.auto.id } : {}) } } : { ...block, auto: undefined })}
        />
        Checks itself once the video is watched
      </label>
      {block.auto ? (
        <Line
          label={`Block ${n} watched percent`}
          value={String(block.auto.at > 1 ? block.auto.at : Math.round(block.auto.at * 100))}
          hint="90 is most of the video. 0.9 means the same."
          onChange={(v) => {
            const at = Number(v);
            if (!Number.isFinite(at)) return;
            onChange({ ...block, auto: { video: true, at, ...(block.auto?.id ? { id: block.auto.id } : {}) } });
          }}
        />
      ) : null}
      {videos.length > 1 && (block.playAt || block.auto) ? (
        <label className={s.lab}>
          Video
          <Sel
            aria-label={`Block ${n} video`}
            value={block.playAt?.video ?? block.auto?.id ?? ''}
            onChange={(e) => {
              const id = e.target.value || undefined;
              const playAt = block.playAt ? { t: block.playAt.t, ...(id ? { video: id } : {}) } : undefined;
              const auto = block.auto ? { video: true as const, at: block.auto.at, ...(id ? { id } : {}) } : undefined;
              onChange({ ...block, ...(playAt ? { playAt } : {}), ...(auto ? { auto } : {}) });
            }}
          >
            <option value="">First video on this path</option>
            {videos.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </Sel>
        </label>
      ) : null}
      <Lines label={`Block ${n} tasks`} items={(block.subchecks ?? []).map((sub) => `${sub.id} | ${sub.label}`)} onChange={(lines) => {
        const subchecks = lines.map((line) => {
          const [id, ...rest] = line.split('|');
          return { id: (id ?? '').trim(), label: rest.join('|').trim() || (id ?? '').trim() };
        }).filter((sub) => sub.id);
        onChange(subchecks.length ? { ...block, subchecks } : { ...block, subchecks: undefined });
      }} />
      <p className={clsx(k.me, w.hint)}>One task per line, id | label. The item is checked when every task is.</p>
      <fieldset className={w.blocks}>
        <legend className={w.legend}>Depends on</legend>
        {others.map((id) => (
          <label key={id} className={clsx(k.row, k.nw, w.check)}>
            <input
              type="checkbox"
              checked={same.has(id)}
              onChange={(e) => {
                const next = new Set(same);
                if (e.target.checked) next.add(id);
                else next.delete(id);
                setDepends(next, otherText);
              }}
            />
            {id}
          </label>
        ))}
        <label className={s.lab}>
          Block {n} other steps
          <TextArea
            rows={3}
            aria-label={`Block ${n} other steps`}
            value={otherText}
            onChange={(e) => {
              const text = e.target.value;
              setOtherText(text);
              setDepends(same, text);
            }}
          />
          <span className={clsx(k.me, w.hint)}>One step:N:id per line, like step:6:s6-google.</span>
        </label>
      </fieldset>
      <label className={s.lab}>
        Button
        <Sel aria-label={`Block ${n} button`} value={block.action?.type ?? ''} onChange={(e) => setAction(e.target.value)}>
          {ACTION_KINDS.map(([value, label]) => (
            <option key={value || 'none'} value={value}>{label}</option>
          ))}
        </Sel>
      </label>
      {block.action?.type === 'download' ? (
        <fieldset className={w.blocks}>
          <legend className={w.legend}>Week kit</legend>
          {(picks?.kit ?? []).length === 0 ? <p className={clsx(k.p, k.mu)}>This week has no kit items yet.</p> : null}
          {(picks?.kit ?? []).map((item) => (
            <label key={item.id} className={clsx(k.row, k.nw, w.check)}>
              <input
                type="checkbox"
                checked={block.action?.type === 'download' && block.action.kitItemIds.includes(item.id)}
                onChange={(e) => {
                  if (block.action?.type !== 'download') return;
                  const kitItemIds = e.target.checked ? [...block.action.kitItemIds, item.id] : block.action.kitItemIds.filter((id) => id !== item.id);
                  onChange({ ...block, action: { type: 'download', kitItemIds } });
                }}
              />
              {item.title}
            </label>
          ))}
        </fieldset>
      ) : null}
      {block.action?.type === 'copy' ? (
        <>
          <Line label={`Block ${n} button label`} value={block.action.label} onChange={(label) => block.action?.type === 'copy' && onChange({ ...block, action: { ...block.action, label } })} />
          <Para label={`Block ${n} text to copy`} value={block.action.text} rows={4} onChange={(text) => block.action?.type === 'copy' && onChange({ ...block, action: { ...block.action, text } })} />
        </>
      ) : null}
      {block.action?.type === 'invite' ? <Line label={`Block ${n} button label`} value={block.action.label ?? ''} onChange={(label) => onChange({ ...block, action: { type: 'invite', ...(label.trim() ? { label } : {}) } })} /> : null}
      {block.action?.type === 'calendar' ? (
        <label className={s.lab}>
          Session
          <Sel aria-label={`Block ${n} session`} value={block.action.sessionId} onChange={(e) => onChange({ ...block, action: { type: 'calendar', sessionId: e.target.value } })}>
            <option value="">Choose a session</option>
            {(picks?.sessions ?? []).map((session) => (
              <option key={session.id} value={session.id}>{session.title}</option>
            ))}
          </Sel>
        </label>
      ) : null}
      {block.action?.type === 'link' ? (
        <>
          <Line label={`Block ${n} button label`} value={block.action.label} onChange={(label) => block.action?.type === 'link' && onChange({ ...block, action: { ...block.action, label } })} />
          <Line label={`Block ${n} link`} value={block.action.href} hint="A route like /learn/team, mailto: or https://" onChange={(href) => block.action?.type === 'link' && onChange({ ...block, action: { ...block.action, href } })} />
        </>
      ) : null}
      {block.action?.type === 'form' ? (
        <>
          <label className={s.lab}>
            Form
            <Sel aria-label={`Block ${n} form`} value={block.action.formId} onChange={(e) => block.action?.type === 'form' && onChange({ ...block, action: { ...block.action, formId: e.target.value as 'intake' | 'stack-card' | 'seat-card' } })}>
              <option value="intake">Intake</option>
              <option value="stack-card">Stack card</option>
              {/* D-236: the week's seat card, from its Seat Card card. */}
              <option value="seat-card">Seat card</option>
            </Sel>
          </label>
          <Line label={`Block ${n} button label`} value={block.action.label} onChange={(label) => block.action?.type === 'form' && onChange({ ...block, action: { ...block.action, label } })} />
          <Line label={`Block ${n} item to check`} value={block.action.itemId ?? ''} hint={block.action.formId === 'seat-card' ? SEAT_CARD_ITEM_HINT : 'The checklist item a submit checks. Blank uses this item.'} onChange={(itemId) => block.action?.type === 'form' && onChange({ ...block, action: { ...block.action, ...(itemId.trim() ? { itemId } : { itemId: undefined }) } })} />
        </>
      ) : null}
      {block.action?.type === 'upload' ? (
        <label className={s.lab}>
          Turns in
          <Sel aria-label={`Block ${n} turns in`} value={block.action.kind} onChange={(e) => block.action?.type === 'upload' && onChange({ ...block, action: { type: 'upload', kind: e.target.value as 'live_read' | 'checkpoint' } })}>
            {UPLOAD_KINDS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Sel>
        </label>
      ) : null}
      {block.action?.type === 'card' ? (
        <fieldset className={w.blocks}>
          <legend className={w.legend}>Glossary terms</legend>
          {(picks?.glossary ?? []).length === 0 ? <p className={clsx(k.p, k.mu)}>Add terms in Course settings. An id that is not there is skipped on the page.</p> : null}
          {(picks?.glossary ?? []).map((term) => (
            <label key={term.id} className={clsx(k.row, k.nw, w.check)}>
              <input
                type="checkbox"
                checked={block.action?.type === 'card' && block.action.terms.includes(term.id)}
                onChange={(e) => {
                  if (block.action?.type !== 'card') return;
                  const terms = e.target.checked ? [...block.action.terms, term.id] : block.action.terms.filter((id) => id !== term.id);
                  onChange({ ...block, action: { type: 'card', terms } });
                }}
              />
              {term.term}
            </label>
          ))}
          {block.action.terms.filter((id) => !(picks?.glossary ?? []).some((term) => term.id === id)).map((id) => (
            <label key={id} className={clsx(k.row, k.nw, w.check)}>
              <input
                type="checkbox"
                checked
                onChange={() => {
                  if (block.action?.type !== 'card') return;
                  onChange({ ...block, action: { type: 'card', terms: block.action.terms.filter((x) => x !== id) } });
                }}
              />
              {id}
            </label>
          ))}
        </fieldset>
      ) : null}
      <CondFields n={n} label="Hide If" cond={block.hideIf} onChange={(hideIf) => onChange({ ...block, hideIf })} />
      <CondFields n={n} label="Collapse If" cond={block.collapseIf} onChange={(collapseIf) => onChange({ ...block, collapseIf })} />
      <Line label={`Block ${n} Collapsed Note`} value={block.collapsedNote ?? ''} onChange={(collapsedNote) => onChange({ ...block, collapsedNote: collapsedNote.trim() ? collapsedNote : undefined })} />
    </>
  );
}

function CondFields({ n, label, cond, onChange }: { n: number; label: string; cond?: { field: string; equals: string }; onChange: (cond?: { field: string; equals: string }) => void }) {
  const write = (field: string, equals: string) => onChange(field.trim() || equals.trim() ? { field, equals } : undefined);
  return (
    <>
      <Line label={`Block ${n} ${label} Field`} value={cond?.field ?? ''} hint="An intake question id, such as operator, plan or google." onChange={(field) => write(field, cond?.equals ?? '')} />
      <Line label={`Block ${n} ${label} Equals`} value={cond?.equals ?? ''} hint="both matches I'm both." onChange={(equals) => write(cond?.field ?? '', equals)} />
    </>
  );
}

function CalloutFields({ n, block, onChange }: { n: number; block: CalloutBlock; onChange: (b: CalloutBlock) => void }) {
  return (
    <>
      <label className={s.lab}>
        Kind
        <Sel aria-label={`Block ${n} kind`} value={block.kind} onChange={(e) => onChange({ ...block, kind: e.target.value as CalloutBlock['kind'] })}>
          {CALLOUT_KINDS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Sel>
      </label>
      <RichField label={`Block ${n} text`} plain={block.text} rich={block.rich} onChange={(text, rich) => {
        const next = { ...block, text };
        if (rich) next.rich = rich;
        else delete next.rich;
        onChange(next);
      }} />
      <CondFields n={n} label="Show If" cond={block.showIf} onChange={(showIf) => onChange({ ...block, showIf })} />
    </>
  );
}

function AccordionFields({ n, block, onChange }: { n: number; block: AccordionBlock; onChange: (b: AccordionBlock) => void }) {
  return (
    <>
      <Line label={`Block ${n} title`} value={block.title} onChange={(title) => onChange({ ...block, title })} />
      <RichField label={`Block ${n} paragraphs`} plain={block.body.join('\n')} rich={block.bodyRich} onChange={(text, rich) => {
        const next = { ...block, body: text.length ? text.split('\n') : [] };
        if (rich) next.bodyRich = rich;
        else delete next.bodyRich;
        onChange(next);
      }} />
      <HeadField label={`Block ${n} table headings`} head={block.table?.head ?? []} onChange={(head) => onChange({ ...block, table: head.length || (block.table?.rows?.length ?? 0) || block.seatCard ? { ...(head.length ? { head } : {}), rows: block.table?.rows ?? [] } : undefined })} />
      {/* D-242: a table that is the week's Seat Card draws its rows from the card, so they are edited there. */}
      <label className={clsx(k.row, k.nw, w.check)}>
        <input
          type="checkbox"
          checked={!!block.seatCard}
          onChange={(e) => {
            const { seatCard: _was, ...rest } = block;
            onChange(e.target.checked ? { ...rest, seatCard: true, table: { ...(block.table?.head?.length ? { head: [...block.table.head] } : {}), rows: [] } } : rest);
          }}
        />
        The table is this week’s Seat card
      </label>
      {block.seatCard ? (
        <p className={clsx(k.me, w.hint)}>Its rows come from this week’s Seat card. Change them there.</p>
      ) : (
        <TableRowsField label={`Block ${n} table rows`} rows={block.table?.rows ?? []} onChange={(rows) => onChange({ ...block, table: rows.length || (block.table?.head?.length ?? 0) ? { ...(block.table?.head?.length ? { head: [...block.table.head] } : {}), rows } : undefined })} />
      )}
      <Line label={`Block ${n} link label`} value={block.link?.label ?? ''} onChange={(label) => onChange({ ...block, link: label.trim() || block.link?.href ? { label, href: block.link?.href ?? '' } : undefined })} />
      <Line label={`Block ${n} link`} value={block.link?.href ?? ''} hint="A route, mailto or https://" onChange={(href) => onChange({ ...block, link: href.trim() || block.link?.label ? { label: block.link?.label ?? '', href } : undefined })} />
    </>
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

const checkIds = (step: Step): string[] =>
  [...(step.paths?.claude?.blocks ?? []), ...(step.paths?.chatgpt?.blocks ?? [])].flatMap((b) => (b.type === 'check' ? [b.id] : []));

/** The step dialog's course fields, for a week's step. */
export function StepWeekFields({ step, onChange, picks }: { step: Step; onChange: (fn: (st: Step) => void) => void; picks?: Omit<BlockPicks, 'ids'> }) {
  // Both paths' videos count, with the rest of the week's: the Claude and ChatGPT paths share one id space.
  const videoIds = [...new Set([...(picks?.videoIds ?? []), ...(['claude', 'chatgpt'] as const).flatMap((which) => (step.paths?.[which]?.blocks ?? []).flatMap((b) => (b.type === 'video' && b.id ? [b.id] : [])))])];
  const opt = (v: string): string | undefined => (v.trim() ? v : undefined);
  const setOpt = <K extends 'who' | 'timeLabel' | 'doneWhen' | 'goal' | 'linkedSkill'>(key: K, v: string) =>
    onChange((st) => {
      const x = opt(v);
      if (x === undefined) delete st[key];
      else st[key] = x;
    });
  const paths = step.paths ?? {};
  const setPath = (which: 'claude' | 'chatgpt', blocks: PathBlock[]) =>
    onChange((st) => {
      const next = { ...(st.paths ?? {}) };
      if (blocks.length) next[which] = { blocks };
      else delete next[which];
      if (next.claude || next.chatgpt) st.paths = next;
      else delete st.paths;
    });
  return (
    <>
      <Line label="Who" value={step.who ?? ''} hint="Owner, AI Implementer, Each of you" onChange={(v) => setOpt('who', v)} />
      <Line label="Time" value={step.timeLabel ?? ''} hint="20 min" onChange={(v) => setOpt('timeLabel', v)} />
      <Para label="Done when" value={step.doneWhen ?? ''} onChange={(v) => setOpt('doneWhen', v)} />
      <Para label="Goal" value={step.goal ?? ''} hint="The paragraph under the step title." onChange={(v) => setOpt('goal', v)} />
      <Line label="Linked skill" value={step.linkedSkill ?? ''} hint="The Library route, like map-your-spend. Separate more than one with commas." onChange={(v) => setOpt('linkedSkill', v)} />
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
      <Blocks label="Claude path" kinds={PATH_KINDS} picks={{ kit: picks?.kit ?? [], sessions: picks?.sessions ?? [], ids: checkIds(step), glossary: picks?.glossary ?? [], videoIds }} blocks={paths.claude?.blocks ?? []} onChange={(b) => setPath('claude', b)} />
      <Blocks label="ChatGPT path" kinds={PATH_KINDS} picks={{ kit: picks?.kit ?? [], sessions: picks?.sessions ?? [], ids: checkIds(step), glossary: picks?.glossary ?? [], videoIds }} blocks={paths.chatgpt?.blocks ?? []} onChange={(b) => setPath('chatgpt', b)} />
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
      <IntakeCard {...props} />
      <StackCard {...props} />
      <SubmissionsCard {...props} />
      <SeatCardsCard {...props} />
      <AgendaCard {...props} which="liveBuild" />
      <AgendaCard {...props} which="officeHours" />
      <HireCardsCard {...props} />
      <WeekSessionsCard {...props} />
      <SkillsCard {...props} />
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
          { label: 'Outcome', value: draft.outcome || <span className={k.mu}>Not set</span> },
          { label: 'Owner time', value: c.time.owner },
          { label: 'AI Implementer time', value: c.time.operator },
          { label: 'Start Here', value: c.startHere?.title ?? <span className={k.mu}>Not set</span> },
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
          {/* D-214, D-220: the line under the week's question is the week's outcome, the one value learners
              read. There is no second copy: the retired promise goes on the next save (`saveBuilderModule`). */}
          <Line label="Outcome" value={draft.outcome} onChange={(v) => up((d) => (d.outcome = v))} />
          <Lines label="Why" items={c.why} onChange={(v) => set((x) => (x.why = v))} />
          <Para label="Owner line" value={c.owner} onChange={(v) => set((x) => (x.owner = v))} />
          <Para label="AI Implementer line" value={c.operator} onChange={(v) => set((x) => (x.operator = v))} />
          <div className={clsx(k.row, k.nw)}>
            <span className={k.sp}>
              <Line label="Owner time" value={c.time.owner} onChange={(v) => set((x) => (x.time.owner = v))} />
            </span>
            <span className={k.sp}>
              <Line label="AI Implementer time" value={c.time.operator} onChange={(v) => set((x) => (x.time.operator = v))} />
            </span>
          </div>
          {/* D-217: the week page's Tools section draws these two. */}
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
          <Lines label="Media" items={mediaLines(c.media)} onChange={(v) => set((x) => (x.media = [...v, ...mediaVideos(x.media)]))} />
          <Blocks label={VIDEO_LABELS.mediaVideos} kinds={VIDEO_KINDS} blocks={mediaVideos(c.media)} onChange={(b) => set((x) => (x.media = [...mediaLines(x.media), ...(b as VideoBlock[])]))} />
          {c.startHere ? (
            <>
              <Line label="Start here title" value={c.startHere.title} onChange={(v) => set((x) => (x.startHere = { ...x.startHere!, title: v }))} />
              <Line label="Start here subtitle" value={c.startHere.sub} onChange={(v) => set((x) => (x.startHere = { ...x.startHere!, sub: v }))} />
              <Para label="Start here line" value={c.startHere.line} onChange={(v) => set((x) => (x.startHere = { ...x.startHere!, line: v }))} />
              <Para label="Start here hint" value={c.startHere.hint} onChange={(v) => set((x) => (x.startHere = { ...x.startHere!, hint: v }))} />
              <div className={clsx(k.row, k.nw)}>
                <span className={k.sp}>
                  <Line label="Owner total" value={c.startHere.totals.owner} onChange={(v) => set((x) => (x.startHere = { ...x.startHere!, totals: { ...x.startHere!.totals, owner: v } }))} />
                </span>
                <span className={k.sp}>
                  <Line label="AI Implementer total" value={c.startHere.totals.operator} onChange={(v) => set((x) => (x.startHere = { ...x.startHere!, totals: { ...x.startHere!.totals, operator: v } }))} />
                </span>
              </div>
              <Button kind="quiet" onClick={() => set((x) => { delete x.startHere; })}>Remove Start Here</Button>
            </>
          ) : (
            <Button kind="quiet" onClick={() => set((x) => { x.startHere = { title: '', sub: '', line: '', hint: '', totals: { owner: '', operator: '' } }; })}>Add Start Here</Button>
          )}
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
  // The opening line starts empty: until it says something, the `locked.opens` copy string speaks (D-175).
  lockedCopy: { headline: '', line: '', opens: '' },
  statusLabels: {},
};

/**
 * D-217: every card here reaches learners: the seat and playbook cards and the sample output on the week page,
 * a locked week's copy, and the status labels on Home's week cards and in the sidebar (`not_started`, `built`).
 */
const SHOWN_CARDS: readonly CardKey[] = ['seatCard', 'playbookCard', 'sampleOutput', 'lockedCopy', 'statusLabels'];

function HireCardsCard({ draft, up }: WeekCardsProps) {
  const [open, setOpen] = useState<CardKey | null>(null);
  const [drop, setDrop] = useState<CardKey | null>(null);
  const c = draft.course;
  return (
    <Card title="Hire cards" pad={false}>
      {SHOWN_CARDS.map((key) => {
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
      <Blocks label="Sample" blocks={card.blocks} onChange={(b) => set((c) => (c.blocks = b as ContentBlock[]))} />
    </>
  );
}

function LockedFields({ card, set }: { card: LockedCopy; set: (fn: (c: LockedCopy) => void) => void }) {
  return (
    <>
      <Line label="Headline" value={card.headline} onChange={(v) => set((c) => (c.headline = v))} />
      <Para label="Line" value={card.line} onChange={(v) => set((c) => (c.line = v))} />
      <Line label="Opens" value={card.opens} onChange={(v) => set((c) => (c.opens = v))} />
      <p className={clsx(k.p, k.me)}>Write {'{date}'} where the week’s opening day and time go (Mountain Time). Leave it empty to use the course’s own line (Course settings, locked.opens).</p>
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
      <span className={clsx(k.me, w.hint)}>One per line: state, a colon, then the label (not_started: Not hired yet). Home and the sidebar read not_started and built.</span>
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

// --- the week's kit skills (saved with the module) ------------------------------------------------

/**
 * D-221: the Library skills a week's kit lists. The week page tags each with its role and Free, a step that
 * links one shows it in its aside, and a built week's run button opens the flagship's page.
 */
function SkillsCard({ draft, up }: WeekCardsProps) {
  const [at, setOpenAt] = useState<number | null>(null);
  const rows = draft.course.skills;
  const setRows = (next: CourseSkill[]) =>
    up((d) => {
      d.course!.skills = next;
    });
  const row = at !== null ? rows[at] : undefined;
  return (
    <Card
      title={`Kit skills · ${rows.length}`}
      pad={false}
      right={
        <Button
          kind="quiet"
          icon="r2Plus"
          onClick={() => {
            setRows([...rows, { title: '', route: '', role: 'supporting' }]);
            setOpenAt(rows.length);
          }}
        >
          Add skill
        </Button>
      }
    >
      {rows.length === 0 ? <p className={clsx(k.p, k.mu, w.pad)}>No skills in this week’s kit yet.</p> : null}
      {rows.map((x, i) => (
        <Row
          key={i}
          label={`kit skill ${i + 1}`}
          onEdit={() => setOpenAt(i)}
          movable
          onUp={i > 0 ? () => setRows(moveBy(rows, i, -1)) : undefined}
          onDown={i < rows.length - 1 ? () => setRows(moveBy(rows, i, 1)) : undefined}
          onRemove={() => setRows(removeAt(rows, i))}
        >
          <b>{x.title || 'Untitled'}</b>
          <span className={clsx(k.me, w.sub)}>{[ROLE_LABEL[x.role], x.free ? 'Free' : null, x.route || null].filter(Boolean).join(' · ')}</span>
        </Row>
      ))}
      {row && at !== null ? (
        <Modal
          title={`Kit skill ${at + 1}`}
          onClose={() => setOpenAt(null)}
          foot={
            <Button kind="primary" onClick={() => setOpenAt(null)}>
              Done
            </Button>
          }
        >
          <Line label="Skill title" value={row.title} onChange={(v) => setRows(setAt(rows, at, { ...row, title: v }))} />
          <Line
            label="Library route"
            value={row.route}
            hint="The skill’s Library page, like /map-your-spend. A page not built yet shows as coming."
            onChange={(v) => setRows(setAt(rows, at, { ...row, route: v.trim() }))}
          />
          <Choice<SkillRole> label="Role" value={row.role} options={ROLE_LABEL} onChange={(v) => v && setRows(setAt(rows, at, { ...row, role: v }))} />
          <label className={clsx(k.row, k.nw, w.check)}>
            <input
              type="checkbox"
              checked={!!row.free}
              onChange={(e) => {
                const { free: _f, ...rest } = row;
                setRows(setAt(rows, at, e.target.checked ? { ...rest, free: true } : rest));
              }}
            />
            Free
          </label>
        </Modal>
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

// --- the live preview: the learner's week page, from the unsaved draft -----------------------------

/**
 * Preview as Learner, for a course week: the learner portal's week page and step player (D-184) drawn
 * from the draft as it is now (nothing saved, nothing sent), as an owner, an AI Implementer, a Utah Life member
 * and a buyer before launch. The pages are the real ones, given the draft instead of the API's answer; a
 * plan without the course and a buyer before the preview still see the course page's own words for it.
 */
export function CoursePreview({ db, draft, phone, onClose }: { db: Db; draft: WeekDraft; phone: boolean; onClose: () => void }) {
  const [as, setAs] = useState<PreviewAs>('owner');
  const now = useNow(30_000);
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
        {load.kind === 'ready' ? (
          <LearnerWeekPreview key={as} payload={load.payload} db={withDraft(db, draft)} week={draft.course.week} now={now} />
        ) : (
          <CourseBody load={load} week={previewWeek(draft)} />
        )}
      </div>
    </Modal>
  );
}
