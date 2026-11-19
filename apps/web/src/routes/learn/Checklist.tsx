// The one-step layout (D-190), drawn only when the open path has a checklist item. Markup from
// ChecklistLayoutVM. A week without one never reaches this file.

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { useMutate } from '../../data/hooks';
import { Blocks, CalLinks, VideoView } from './parts';
import type { VideoWatch } from './Video';
import { saveIcs } from './ics';
import { KnowCard, Marked, RichTextView } from './Glossary';
import { StartHereCard } from './StartHere';
import { LABELS } from './learn.vm';
import type { StartHereVM } from './Week.vm';
import { PLATFORM_LABEL, STEP, watchLength } from './Step.vm';
import type { AccordionVM, CalloutVM, CheckActionVM, CheckItemVM, ChecklistLayoutVM, PillVM, StepVM } from './Step.vm';
import s from './Checklist.module.css';
import l from './Learn.module.css';

const REDUCE = '(prefers-reduced-motion: reduce)';
const reduceMotion = (): boolean => typeof matchMedia === 'function' && matchMedia(REDUCE).matches;

function Pills({ pills, label }: { pills: PillVM[]; label: string }) {
  return (
    <nav className={s.pills} aria-label={label}>
      {pills.map((p) => {
        const tip = p.note ? `${p.title}. ${p.note}` : p.title;
        const current = p.on;
        return (
          <Link
            key={p.n}
            className={s.pill}
            to={p.href}
            data-status={p.status}
            data-on={current ? 'true' : undefined}
            aria-current={current ? 'step' : undefined}
            aria-label={p.note ? `${p.aria}. ${p.note}` : p.aria}
            title={tip}
          >
            <span className={s.pillN} aria-hidden="true">
              {p.status === 'done' && !current ? <Icon name="r2Check" size={14} strokeWidth={2.4} /> : p.n}
            </span>
            <span className={s.pillT}>{p.title}</span>
            <span className={s.tip} role="tooltip">{tip}</span>
            {p.note ? <span className={s.pillNote}>{p.note}</span> : null}
          </Link>
        );
      })}
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
      <div className={s.coCopy}>
        <strong>{c.label}</strong> {c.rich ? <RichTextView doc={c.rich} spans={c.spans} /> : <Marked text={c.text} spans={c.spans} />}
      </div>
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
            <a key={f.id} className={`${l.b} ${l.bi}`} href={f.href} onClick={flashDl}>
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
      <a className={`${l.b} ${l.bi}`} href={action.href} {...(/^https?:/.test(action.href) ? { target: '_blank', rel: 'noopener' } : {})}>
        {action.label}
      </a>
    ) : (
      <Link className={`${l.b} ${l.bi}`} to={action.href}>{action.label}</Link>
    );
  }
  if (!action.event) return null;
  return (
    <span className={s.acts}>
        <button type="button" className={`${l.b} ${l.bi}`} onClick={() => saveIcs([action.event!], Date.now(), 'amplified-impact-session.ics')}>
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
      <svg viewBox="0 0 16 16" className={s.tick}>
        <path pathLength={20} d="M3.5 8.5l3 3 6-7" />
      </svg>
    </span>
  );
}

/** A toggle that has not settled yet, laid over the server's row. */
function overlayItem(item: CheckItemVM, pending: Readonly<Record<string, boolean>>): CheckItemVM {
  if (!Object.keys(pending).length) return item;
  const subchecks = item.subchecks.map((sub) => {
    const key = `${item.id}:${sub.id}`;
    return key in pending ? { ...sub, checked: pending[key]! } : sub;
  });
  const checked = item.subchecks.length ? subchecks.every((sub) => sub.checked) : item.id in pending ? pending[item.id]! : item.checked;
  return checked === item.checked && subchecks.every((sub, i) => sub.checked === item.subchecks[i]?.checked) ? item : { ...item, checked, subchecks };
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
        {item.detail ? <div className={s.detail}>{item.detailRich ? <RichTextView doc={item.detailRich} spans={item.detailSpans} /> : <Marked text={item.detail} spans={item.detailSpans} />}</div> : null}
        {item.note ? <p className={s.opNote}>{item.note}</p> : null}
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
              <button type="button" className={`${l.b} ${l.bi} ${s.act}`} onClick={() => onPlay(item.playSeconds!, item.playVideo)}>
                <Icon name="play" size={14} filled />
                {item.playLabel}
              </button>
            ) : null}
            {item.autoLabel ? (
              <span className={s.auto}>
                <Icon name="r2Check" size={14} strokeWidth={2.2} />
                {item.autoLabel}
              </span>
            ) : null}
          </div>
        ) : null}
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
      <summary>
        {row.title}
        <Icon name="r2Chevd" size={18} strokeWidth={2} className={s.accChevron} />
      </summary>
      <div className={s.accBody}>
        {row.bodyRich ? <RichTextView doc={row.bodyRich} /> : row.body.map((p, i) => (
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

/** The step, when its open path is a checklist. */
export function ChecklistPlayer({
  vm,
  layout,
  platform,
  setPlatform,
  onPlay,
  watch,
  onLocalToggle,
  startHere,
}: {
  vm: StepVM;
  layout: ChecklistLayoutVM;
  platform: StepVM['tabs'][number];
  setPlatform: (p: StepVM['tabs'][number]) => void;
  onPlay: (seconds: number, videoId?: string | null) => void;
  watch?: VideoWatch;
  /** D-194: staff. Flip the box in memory and do not write. */
  onLocalToggle?: (itemId: string) => void;
  /** D-195: step 1's card, after the step's own heading. */
  startHere?: StartHereVM;
}) {
  const mutate = useMutate();
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [fault, setFault] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ ids: string[]; stepN: number } | null>(null);
  const [undo, setUndo] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [watchLen, setWatchLen] = useState<number | null>(null);
  const titleId = useId();
  const pops = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => {
    for (const t of pops.current) clearTimeout(t);
  }, []);
  const flashPop = (itemId: string) => {
    pops.current.push(setTimeout(() => setPop((cur) => (cur === itemId ? null : cur)), 220));
  };
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

  useEffect(() => {
    setPending((cur) => {
      if (!Object.keys(cur).length) return cur;
      const next = { ...cur };
      let changed = false;
      for (const item of layout.items) {
        if (item.id in next && next[item.id] === item.checked) {
          delete next[item.id];
          changed = true;
        }
        for (const sub of item.subchecks) {
          const key = `${item.id}:${sub.id}`;
          if (key in next && next[key] === sub.checked) {
            delete next[key];
            changed = true;
          }
        }
      }
      return changed ? next : cur;
    });
  }, [layout.items]);

  const shown = layout.items.map((item) => overlayItem(item, pending));

  const serverOn = (itemId: string): boolean => {
    for (const item of layout.items) {
      if (item.id === itemId) return item.checked;
      for (const sub of item.subchecks) if (`${item.id}:${sub.id}` === itemId) return sub.checked;
    }
    return false;
  };

  const dropPending = (itemId: string) => {
    setPending((cur) => {
      if (!(itemId in cur)) return cur;
      const next = { ...cur };
      delete next[itemId];
      return next;
    });
  };

  const write = async (itemId: string) => {
    if (!vm.mark.stepId) return;
    setPop(itemId);
    setFault(null);
    setPending((cur) => ({ ...cur, [itemId]: !(itemId in cur ? cur[itemId]! : serverOn(itemId)) }));
    if (onLocalToggle) {
      onLocalToggle(itemId);
      flashPop(itemId);
      return;
    }
    let error: string = STEP.checkFailed;
    try {
      const r = await mutate('toggleChecklistItem', { moduleId: vm.mark.moduleId, stepId: vm.mark.stepId, itemId });
      // A saved toggle has no toast. A toast here is a refusal (the week is not open) and the box did not change.
      if (!r.error && !r.toast) {
        flashPop(itemId);
        return;
      }
      error = r.error || r.toast?.msg || STEP.checkFailed;
    } catch {
      error = STEP.checkFailed;
    }
    dropPending(itemId);
    setFault(error);
    flashPop(itemId);
  };

  const writeMany = async (ids: string[]) => {
    if (!ids.length || busy) return;
    // A staff preview flips in memory. There is no request to wait on, so a second click is not locked out.
    if (onLocalToggle) {
      for (const id of ids) write(id);
      return;
    }
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

  const focusFirstOpen = () => {
    const box = document.querySelector<HTMLElement>('#step-checklist [role="checkbox"][aria-checked="false"]');
    if (!box) return;
    try {
      box.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
    } catch {
      /* jsdom has no scroll. */
    }
    box.focus();
  };

  const mark = async () => {
    if (!vm.mark.stepId || vm.mark.disabled || busy) return;
    if (layout.gate.locked) {
      focusFirstOpen();
      return;
    }
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

  const pct = layout.progress.total ? layout.progress.done / layout.progress.total : 0;

  return (
    <div className={s.main}>
      <header className={s.head}>
        <p className={s.eb}>{layout.eyebrow}</p>
        <h1 className={l.h0}>{vm.title}</h1>
        {vm.lede ? <p className={s.purpose}>{vm.lede}</p> : null}
        <div className={s.hrow}>
          <div className={s.meta}>
            {layout.time ? <span className={s.hc}><Icon name="r2Clock" size={14} strokeWidth={2} color="var(--r2-for)" />{layout.time}</span> : null}
            {layout.role ? <span className={s.hc}><Icon name="r2People" size={14} strokeWidth={2} color="var(--r2-for)" />{layout.role}</span> : null}
            {layout.due ? <span className={s.hc}><Icon name="r2Cal" size={14} strokeWidth={2} color="var(--r2-for)" />{layout.due}</span> : null}
          </div>
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
              <i style={{ ['--pct' as string]: String(pct) }} />
            </div>
            <p className={s.barL}>{layout.progress.label}</p>
          </div>
        ) : null}
      </header>

      {startHere ? <StartHereCard card={startHere} collapsible /> : null}

      {layout.videos.length ? (
        <section id="step-watch" aria-labelledby="step-watch-h">
          <h2 id="step-watch-h">
            {STEP.watch}
            {watchLen != null ? <small>{watchLength(watchLen)}</small> : null}
          </h2>
          {layout.videos.map((block, i) => (
            <VideoView key={i} block={block} watch={watch} onDuration={i === 0 ? setWatchLen : undefined} />
          ))}
        </section>
      ) : null}

      <section id="step-checklist" aria-labelledby="step-check-h">
        <h2 id="step-check-h">{STEP.yourChecklist}</h2>
        {onLocalToggle ? <p className={s.previewNote}>{STEP.previewChecks}</p> : null}
        {fault ? <p className={s.checkError} role="alert">{fault}</p> : null}
        {layout.leading.map((c, i) => (
          <Callout key={i} c={c} />
        ))}
        <ol className={s.list}>
          {shown.map((item) => (
            <Fragment key={item.id}>
              <Item item={item} pop={pop === item.id} onItem={onItem} onPlay={onPlay} />
              {item.callouts.map((c, i) => (
                <li key={`${item.id}-c${i}`} className={s.callRow}><Callout c={c} /></li>
              ))}
            </Fragment>
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
          <button type="button" className={`${l.b} ${l.bp} ${l.bi} ${s.markBtn}`} data-done={vm.mark.done ? 'true' : undefined} data-ring={celebrating ? 'true' : undefined} data-locked={layout.gate.locked ? 'true' : undefined} disabled={vm.mark.disabled || busy} onClick={() => void mark()}>
            <svg className={s.ck} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path pathLength={20} d="M3.5 8.5l3 3 6-7" />
            </svg>
            {vm.mark.done ? STEP.stepDone : STEP.markDone}
          </button>
          {layout.gate.reason ? <p className={s.why}>{layout.gate.reason}</p> : null}
          {vm.mark.done && undo ? (
            <button type="button" className={`${l.b} ${s.undo}`} onClick={() => void mark()}>
              {STEP.undo}
            </button>
          ) : null}
        </div>
        {layout.next ? (
          <Link className={s.next} to={layout.next.href} data-done={vm.mark.done ? 'true' : undefined} aria-label={`${STEP.next}: ${layout.next.title}`}>
            <span className={s.nextK}>{STEP.nextKicker}</span>
            <span className={s.nextT}>{layout.next.title}</span>
            {layout.next.meta ? <span className={s.nextM}>{layout.next.meta}</span> : null}
            <span className={s.nextBar} aria-hidden="true" />
            <span className={s.nextAr} aria-hidden="true"><Icon name="arrowR" size={20} strokeWidth={1.75} /></span>
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
  const [current, setCurrent] = useState(layout.jumps[0]?.id ?? '');
  useEffect(() => {
    const ids = layout.jumps.map((j) => j.id);
    if (!ids.length || typeof IntersectionObserver === 'undefined') return undefined;
    const seen = new Map<string, number>();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      const top = ids.find((id) => (seen.get(id) ?? 0) > 0);
      if (top) setCurrent(top);
    }, { rootMargin: '-30% 0px -60% 0px' });
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [layout.jumps]);
  return (
    <div className={s.rail}>
      <nav className={s.railCard} aria-label={STEP.onThisPage}>
        {layout.jumps.length ? (
          <>
            <h3>{STEP.onThisPage}</h3>
            <div className={s.jumps}>
              {layout.jumps.map((j) => (
                <a key={j.id} href={`#${j.id}`} aria-current={j.id === current ? 'true' : undefined}>{j.label}</a>
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
      </nav>
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
