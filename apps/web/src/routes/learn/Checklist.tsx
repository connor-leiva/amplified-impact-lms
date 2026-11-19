// The one-step layout (D-190), drawn only when the open path has a checklist item. Markup from
// ChecklistLayoutVM. A week without one never reaches this file.

import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { useMutate } from '../../data/hooks';
import { Blocks, CalLinks, VideoView } from './parts';
import type { VideoWatch } from './Video';
import { saveIcs } from './ics';
import { KnowCard, Marked } from './Glossary';
import { LABELS } from './learn.vm';
import { PLATFORM_LABEL, STEP } from './Step.vm';
import type { AccordionVM, CalloutVM, CheckActionVM, CheckItemVM, ChecklistLayoutVM, PillVM, StepVM } from './Step.vm';
import s from './Checklist.module.css';
import l from './Learn.module.css';

const REDUCE = '(prefers-reduced-motion: reduce)';
const reduceMotion = (): boolean => typeof matchMedia === 'function' && matchMedia(REDUCE).matches;

function Pills({ pills, label }: { pills: PillVM[]; label: string }) {
  return (
    <nav className={s.pills} aria-label={label}>
      {pills.map((p) => (
        <Link key={p.n} className={s.pill} to={p.href} data-status={p.status} data-on={p.on ? 'true' : undefined} aria-current={p.on ? 'step' : undefined} aria-label={p.aria} title={p.title}>
          <span className={s.pillN} aria-hidden="true">
            {p.status === 'done' ? <Icon name="r2Check" size={12} strokeWidth={2.4} /> : p.n}
          </span>
          <span className={s.pillT}>{p.title}</span>
        </Link>
      ))}
    </nav>
  );
}

function Callout({ c }: { c: CalloutVM }) {
  const icon = c.kind === 'heads_up' ? 'alert' : c.kind === 'diy' ? 'r2Users' : 'lvInfo';
  return (
    <div className={s.co} data-kind={c.kind}>
      <span className={s.coIc} aria-hidden="true">
        <Icon name={icon} size={14} strokeWidth={1.8} />
      </span>
      <p>
        <strong>{c.label}</strong> <Marked text={c.text} spans={c.spans} />
      </p>
    </div>
  );
}

function ClickPath({ parts }: { parts: string[] }) {
  if (!parts.length) return null;
  return (
    <div className={s.chips}>
      {parts.map((part, i) => (
        <span key={`${i}:${part}`} className={s.chipRow}>
          {i > 0 ? <span className={s.sep} aria-hidden="true">›</span> : null}
          <span className={s.chip}>{part}</span>
        </span>
      ))}
    </div>
  );
}

function useFlash(ms = 2000): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return [on, () => {
    setOn(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), ms);
  }];
}

function Action({ action }: { action: CheckActionVM }) {
  const [copied, flashCopy] = useFlash();
  const [downloaded, flashDl] = useFlash();
  if (action.type === 'copy') {
    return (
      <div className={s.copy}>
        <code>{action.text}</code>
        <button
          type="button"
          className={`${l.b} ${l.bp}`}
          onClick={() => {
            void navigator.clipboard?.writeText(action.text).then(flashCopy, () => undefined);
          }}
        >
          <Icon name={copied ? 'r2Check' : 'lvCopy'} size={14} strokeWidth={1.75} />
          {copied ? STEP.copied : action.label}
        </button>
      </div>
    );
  }
  if (action.type === 'download') {
    return (
      <span className={s.acts}>
        {action.files.map((f) =>
          f.href ? (
            <a key={f.id} className={`${l.b} ${l.bq} ${l.bi}`} href={f.href} onClick={flashDl}>
              <Icon name="r2Download" size={14} strokeWidth={1.75} />
              {downloaded ? STEP.downloaded : f.title}
            </a>
          ) : (
            <span key={f.id} className={`${l.b} ${l.bq} ${l.bi}`}>{f.title}</span>
          ),
        )}
      </span>
    );
  }
  if (action.type === 'invite') {
    return (
      <Link className={`${l.b} ${l.bp} ${l.bi}`} to={action.href}>
        <Icon name="lvInvite" size={14} strokeWidth={1.75} />
        {action.label}
      </Link>
    );
  }
  if (action.type === 'link') {
    const outer = /^https?:\/\//.test(action.href) || action.href.startsWith('mailto:');
    return outer ? (
      <a className={`${l.b} ${l.bq} ${l.bi}`} href={action.href} {...(/^https?:/.test(action.href) ? { target: '_blank', rel: 'noopener' } : {})}>
        {action.label}
      </a>
    ) : (
      <Link className={`${l.b} ${l.bq} ${l.bi}`} to={action.href}>{action.label}</Link>
    );
  }
  if (!action.event) return null;
  return (
    <span className={s.acts}>
        <button type="button" className={`${l.b} ${l.bq} ${l.bi}`} onClick={() => saveIcs([action.event!], Date.now(), 'amplified-impact-session.ics')}>
        <Icon name="lvCalAdd" size={14} strokeWidth={1.75} />
        {LABELS.addToCalendar}
      </button>
      <CalLinks event={action.event} />
    </span>
  );
}

function Box({ checked }: { checked: boolean }) {
  return (
    <span className={s.box} data-on={checked ? 'true' : undefined} aria-hidden="true">
      {checked ? (
        <svg viewBox="0 0 16 16" className={s.tick}>
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      ) : null}
    </span>
  );
}

function Item({
  item,
  pop,
  onItem,
  onPlay,
}: {
  item: CheckItemVM;
  pop: boolean;
  onItem: (item: CheckItemVM, subId: string | null) => void;
  onPlay: (t: number, videoId?: string | null) => void;
}) {
  const mixed = item.subchecks.length > 0 && item.subchecks.some((s) => s.checked) && !item.checked;
  return (
    <li className={s.item} id={item.id} data-checked={item.checked ? 'true' : undefined} data-wait={item.waiting !== null && !item.checked ? 'true' : undefined} data-pop={pop ? 'true' : undefined}>
      <button
        type="button"
        className={s.boxBtn}
        role="checkbox"
        aria-checked={mixed ? 'mixed' : item.checked}
        aria-label={item.title}
        onClick={() => onItem(item, null)}
      >
        <Box checked={item.checked} />
      </button>
      <div className={s.body}>
        {item.card?.length ? (
          <KnowCard
            titleId={`${item.id}-title`}
            title={item.title}
            spans={item.titleSpans}
            titleClass={s.title!}
            rowClass={s.titleRow!}
            chips={
              <>
                {item.role ? <span className={s.role}>{item.role}</span> : null}
                {item.waiting !== null && !item.checked ? <span className={s.wait}>{STEP.waiting} {item.waiting}</span> : null}
              </>
            }
            terms={item.card}
          />
        ) : (
          <div className={s.titleRow}>
            <span className={s.title}><Marked text={item.title} spans={item.titleSpans} /></span>
            {item.role ? <span className={s.role}>{item.role}</span> : null}
            {item.waiting !== null && !item.checked ? <span className={s.wait}>{STEP.waiting} {item.waiting}</span> : null}
          </div>
        )}
        {item.detail ? <p className={s.detail}><Marked text={item.detail} spans={item.detailSpans} /></p> : null}
        {item.subchecks.length ? (
          <ul className={s.subs}>
            {item.subchecks.map((sub) => (
              <li key={sub.id}>
                <button type="button" className={s.sub} role="checkbox" aria-checked={sub.checked} onClick={() => onItem(item, `${item.id}:${sub.id}`)}>
                  <Box checked={sub.checked} />
                  <span>{sub.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <ClickPath parts={item.clickPath} />
        {item.action || item.playLabel ? (
          <div className={s.acts}>
            {item.action ? <Action action={item.action} /> : null}
            {item.playSeconds !== null && item.playLabel ? (
              <button type="button" className={s.play} onClick={() => onPlay(item.playSeconds!, item.playVideo)}>
                <Icon name="r2Play" size={12} strokeWidth={1.75} />
                {item.playLabel}
              </button>
            ) : null}
          </div>
        ) : null}
        {item.callouts.map((c, i) => (
          <Callout key={i} c={c} />
        ))}
      </div>
    </li>
  );
}

function Accordion({ row, onToggle }: { row: AccordionVM; onToggle: (key: string, open: boolean) => void }) {
  return (
    <details
      className={s.acc}
      open={row.open}
      onToggle={(e) => {
        if (e.currentTarget.open !== row.open) onToggle(row.prefKey, e.currentTarget.open);
      }}
    >
      <summary>{row.title}</summary>
      <div className={s.accBody}>
        {row.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {row.table ? (
          <div className={s.tableWrap}>
            <table>
              {row.table.head ? (
                <thead>
                  <tr>
                    {row.table.head.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {row.table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {row.link ? (
          row.link.href.startsWith('/') && !row.link.href.startsWith('//') ? (
            <Link to={row.link.href}>{row.link.label}</Link>
          ) : (
            <a href={row.link.href} {...(/^https?:/.test(row.link.href) ? { target: '_blank', rel: 'noopener' } : {})}>{row.link.label}</a>
          )
        ) : null}
      </div>
    </details>
  );
}

function Confetti({ on }: { on: boolean }) {
  if (!on) return null;
  const dots = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className={s.celebrate} aria-hidden="true">
      <span className={s.banner}>{STEP.stepDone}</span>
      {dots.map((i) => (
        <i key={i} className={s.dot} data-c={i % 2 === 0 ? 'for' : 'energy'} style={{ '--x': `${(i * 37) % 100}%`, '--d': `${(i % 8) * 40}ms`, '--r': `${(i % 5) * 18 - 36}px` } as CSSProperties} />
      ))}
    </div>
  );
}

/** The step, when its open path is a checklist. */
export function ChecklistPlayer({
  vm,
  layout,
  platform,
  setPlatform,
  onPlay,
  watch,
}: {
  vm: StepVM;
  layout: ChecklistLayoutVM;
  platform: StepVM['tabs'][number];
  setPlatform: (p: StepVM['tabs'][number]) => void;
  onPlay: (seconds: number, videoId?: string | null) => void;
  watch?: VideoWatch;
}) {
  const mutate = useMutate();
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ ids: string[]; stepN: number } | null>(null);
  const [undo, setUndo] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const titleId = useId();
  const wasDone = useRef(vm.mark.done);
  const wasChecked = useRef(layout.items.filter((item) => item.checked).map((item) => item.id).join(','));

  useEffect(() => {
    if (vm.mark.done && !wasDone.current) {
      setCelebrating(true);
      setUndo(true);
      const t = setTimeout(() => setUndo(false), 10_000);
      wasDone.current = true;
      return () => clearTimeout(t);
    }
    wasDone.current = vm.mark.done;
    if (!vm.mark.done) setCelebrating(false);
    return undefined;
  }, [vm.mark.done]);

  useEffect(() => {
    const prev = new Set(wasChecked.current.split(',').filter(Boolean));
    const now = layout.items.filter((item) => item.checked);
    wasChecked.current = now.map((item) => item.id).join(',');
    const fresh = now.find((item) => !prev.has(item.id));
    if (!fresh) return undefined;
    setPop(fresh.id);
    const t = setTimeout(() => setPop((cur) => (cur === fresh.id ? null : cur)), reduceMotion() ? 0 : 220);
    return () => clearTimeout(t);
  }, [layout.items]);

  const write = async (itemId: string) => {
    if (!vm.mark.stepId) return;
    setPop(itemId);
    await mutate('toggleChecklistItem', { moduleId: vm.mark.moduleId, stepId: vm.mark.stepId, itemId });
    setTimeout(() => setPop((cur) => (cur === itemId ? null : cur)), 220);
  };

  const writeMany = async (ids: string[]) => {
    if (!ids.length || busy) return;
    setBusy(true);
    try {
      for (const id of ids) await write(id);
    } finally {
      setBusy(false);
    }
  };

  const onItem = (item: CheckItemVM, subId: string | null) => {
    if (subId) {
      void writeMany([subId]);
      return;
    }
    if (item.subchecks.length) {
      const turnOn = !item.checked;
      const ids = item.subchecks.filter((sub) => sub.checked !== turnOn).map((sub) => `${item.id}:${sub.id}`);
      if (turnOn && item.waiting !== null) setConfirm({ ids, stepN: item.waiting });
      else void writeMany(ids);
      return;
    }
    if (!item.checked && item.waiting !== null) setConfirm({ ids: [item.id], stepN: item.waiting });
    else void writeMany([item.id]);
  };

  const mark = async () => {
    if (!vm.mark.stepId || vm.mark.disabled || layout.gate.locked || busy) return;
    setBusy(true);
    try {
      await mutate('toggleStep', { moduleId: vm.mark.moduleId, stepId: vm.mark.stepId });
    } finally {
      setBusy(false);
    }
  };

  const setOpen = (key: string, open: boolean) => {
    if (vm.mark.disabled) return;
    void mutate('setPref', { key, value: open ? '1' : '0' });
  };

  const pct = layout.progress.total ? Math.round((layout.progress.done / layout.progress.total) * 100) : 0;

  return (
    <div className={s.main}>
      <header className={s.head}>
        <p className={s.eb}>{layout.eyebrow}</p>
        <h1 className={l.h0}>{vm.title}</h1>
        {vm.lede ? <p className={s.purpose}>{vm.lede}</p> : null}
        <div className={s.hrow}>
          {layout.time ? <span className={s.hc}>{layout.time}</span> : null}
          {layout.role ? <span className={s.hc}>{layout.role}</span> : null}
          {layout.countdown ? <span className={s.hc}>{layout.countdown}</span> : null}
          {vm.tabs.length > 1 ? (
            <span
              className={l.seg}
              role="radiogroup"
              aria-label={STEP.yourAi}
              onKeyDown={(e: KeyboardEvent<HTMLSpanElement>) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                const i = vm.tabs.indexOf(platform);
                const next = vm.tabs[(i + (e.key === 'ArrowRight' ? 1 : vm.tabs.length - 1)) % vm.tabs.length]!;
                setPlatform(next);
              }}
            >
              {vm.tabs.map((p) => (
                <button key={p} type="button" role="radio" data-p={p} aria-checked={p === platform} tabIndex={p === platform ? 0 : -1} onClick={() => setPlatform(p)}>
                  {PLATFORM_LABEL[p]}
                </button>
              ))}
            </span>
          ) : null}
        </div>
        {layout.progress.total ? (
          <div className={s.barWrap}>
            <div className={s.bar} role="progressbar" aria-valuemin={0} aria-valuemax={layout.progress.total} aria-valuenow={layout.progress.done} aria-label={layout.progress.label}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <p className={s.barL}>{layout.progress.label}</p>
          </div>
        ) : null}
      </header>

      {layout.videos.length ? (
        <section id="step-watch" aria-labelledby="step-watch-h">
          <h2 id="step-watch-h">{STEP.watch}</h2>
          {layout.videos.map((block, i) => (
            <VideoView key={i} block={block} watch={watch} />
          ))}
        </section>
      ) : null}

      <section id="step-checklist" aria-labelledby="step-check-h">
        <h2 id="step-check-h">{STEP.yourChecklist}</h2>
        {layout.leading.map((c, i) => (
          <Callout key={i} c={c} />
        ))}
        <ol className={s.list}>
          {layout.items.map((item) => (
            <Item key={item.id} item={item} pop={pop === item.id} onItem={onItem} onPlay={onPlay} />
          ))}
        </ol>
        {layout.extras.length ? <Blocks blocks={layout.extras} marks={layout.extraMarks} /> : null}
      </section>

      {layout.accordions.length ? (
        <section id="step-reference" aria-labelledby="step-ref-h">
          <h2 id="step-ref-h">{STEP.reference}</h2>
          {layout.accordions.map((row) => (
            <Accordion key={row.prefKey} row={row} onToggle={setOpen} />
          ))}
        </section>
      ) : null}

      <div className={s.foot}>
        <div className={s.mark}>
          <button type="button" className={`${l.b} ${l.bp} ${l.bi}`} data-done={vm.mark.done ? 'true' : undefined} disabled={vm.mark.disabled || layout.gate.locked || busy} onClick={() => void mark()}>
            <Icon name={vm.mark.done ? 'r2Check' : 'r2Check'} size={14} strokeWidth={2.2} />
            {vm.mark.done ? STEP.stepDone : STEP.markDone}
          </button>
          {vm.mark.done && undo ? (
            <button type="button" className={`${l.b} ${l.bq}`} onClick={() => void mark()}>
              {STEP.undo}
            </button>
          ) : null}
          {layout.gate.reason ? <p className={s.why}>{layout.gate.reason}</p> : null}
          <Confetti on={celebrating && vm.mark.done} />
        </div>
        {layout.next ? (
          <Link className={s.next} to={layout.next.href} data-done={vm.mark.done ? 'true' : undefined}>
            <span className={s.nextK}>{STEP.nextKicker}</span>
            <span className={s.nextT}>{layout.next.title}</span>
            {layout.next.meta ? <span className={s.nextM}>{layout.next.meta}</span> : null}
          </Link>
        ) : null}
      </div>

      {confirm ? (
        <div className={s.scrim} role="presentation" onClick={() => setConfirm(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={s.dialog} onClick={(e) => e.stopPropagation()}>
            <h2 id={titleId}>{STEP.waiting} {confirm.stepN}</h2>
            <p>This is waiting on Step {confirm.stepN}. Check it off anyway?</p>
            <div className={s.dialogActs}>
              <button type="button" className={`${l.b} ${l.bq}`} onClick={() => setConfirm(null)}>{STEP.notNow}</button>
              <button type="button" className={`${l.b} ${l.bp}`} onClick={() => { const ids = confirm.ids; setConfirm(null); void writeMany(ids); }}>{STEP.checkAnyway}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ChecklistRail({ layout }: { layout: ChecklistLayoutVM }) {
  return (
    <div className={s.rail}>
      {layout.jumps.length ? (
        <>
          <h3>{STEP.onThisPage}</h3>
          <div className={s.jumps}>
            {layout.jumps.map((j) => (
              <a key={j.id} href={`#${j.id}`}>{j.label}</a>
            ))}
          </div>
        </>
      ) : null}
      {layout.items.length ? (
        <>
          <h3>{STEP.checklist}</h3>
          <ul>
            {layout.items.map((item) => (
              <li key={item.id} data-checked={item.checked ? 'true' : undefined}>
                <a href={`#${item.id}`}>
                  <span className={s.mini} aria-hidden="true" />
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {layout.due ? <p className={s.due}><strong>{layout.due}</strong></p> : null}
    </div>
  );
}

export function ChecklistPills({ vm }: { vm: StepVM }) {
  if (!vm.pills) return null;
  return <Pills pills={vm.pills} label={vm.railLabel} />;
}

/** Seek this path's video and bring it into view. `videoId` picks one when the path has several; otherwise the first. */
export function playAt(seconds: number, videoId?: string | null): void {
  const named = videoId ? document.querySelector<HTMLVideoElement>(`[data-video-block][data-video-id="${CSS.escape(videoId)}"]`) : null;
  const video = named ?? document.querySelector<HTMLVideoElement>('[data-video-block]');
  const reduce = reduceMotion();
  if (!video) return;
  video.currentTime = seconds;
  const played = video.play?.();
  void played?.catch(() => undefined);
  video.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
}
