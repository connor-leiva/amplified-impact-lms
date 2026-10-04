import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router';
import { canAccess, visibleModules } from '@ai/core';
import type { AIEmployee, Db, Learner } from '@ai/core';

import { Icon } from '../../components/Icon';
import { JoinButton } from '../../components/JoinButton';
import { StatusToken } from '../../components/StatusToken';
import { Avatar } from '../../components/primitives/Avatar';
import { Drawer } from '../../components/primitives/Drawer';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useMutate, useNow, useViewer } from '../../data/hooks';
import { employeeDetailVM, initialUi, moduleReset, SPEEDS, TickerEngine } from './EmployeeDetail.vm';
import type { AssetVM, DrawerRef, EmployeeDetailUi, Speed, VideoEngine, VmAction } from './EmployeeDetail.vm';
import s from './EmployeeDetail.module.css';

// Employee detail `/employees/:employeeId`. Ported from design-reference/Portal Workspace.dc.html.
// Contract: SCREENS § 3.2, phase 05 § 5.2.
//
// MARKUP ONLY plus the wiring the browser owns: the ticker engine, the clipboard, the Blob
// download, the two timers and `localStorage`. Every string, tone, icon, download payload and
// navigation target comes from `employeeDetailVM`; nothing here reads the clock or recomputes
// status, and no business rule lives in this file — `toggleStep`, `markDeployed`, `setRuntime` and
// `recordRun` are @ai/core mutations run through `useMutate`.

/** `localStorage['ai-lms-pos-' + id]`, the prototype's playback position (SCREENS § 3.2). */
const posKey = (id: string) => `ai-lms-pos-${id}`;

function loadPos(id: string): number {
  try {
    return Number(localStorage.getItem(posKey(id))) || 0;
  } catch {
    return 0; // private mode, blocked storage — start from the top
  }
}

function savePos(id: string, t: number): void {
  try {
    localStorage.setItem(posKey(id), String(Math.floor(t)));
  } catch {
    /* best-effort, exactly as the prototype treats it */
  }
}

/** The reference's `act.download`: a Blob, a synthetic anchor click, then the toast. */
function saveFile(name: string, content: string, mime: string): void {
  try {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch {
    /* Download blocked. The reference toasts regardless, so the confirmation still appears. */
  }
}

/** Every tick is 250 ms, so 20 of them is the 5 s the position-save interval asks for. */
const SAVE_EVERY = 20;

/** The playhead jump also brings the player back into view when the page is scrolled away. */
const SCROLL_BACK_AT = 120;

function Workspace({ db, user, m }: { db: Db; user: Learner; m: AIEmployee }) {
  const now = useNow();
  const navigate = useNavigate();
  const mutate = useMutate();
  const { toast } = useToaster();

  const [st, setSt] = useState(() => ({ mid: m.id, ui: initialUi(m, loadPos(m.id)) }));

  const engine = useRef<VideoEngine | null>(null);
  const ticks = useRef(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read by the unmount and `pagehide` saves, which must not re-run when the playhead moves.
  const pos = useRef({ id: st.mid, t: st.ui.t });
  pos.current = { id: st.mid, t: st.ui.t };

  const patch = useCallback((p: Partial<EmployeeDetailUi>) => {
    setSt((prev) => ({ ...prev, ui: { ...prev.ui, ...p } }));
  }, []);

  // ---- the stubbed player (phase 05 § 5.2) ----------------------------------------------------
  useEffect(() => {
    const e = new TickerEngine(m.dur, pos.current.t);
    engine.current = e;
    ticks.current = 0;
    const offTime = e.onTime((t) => {
      setSt((prev) => (prev.ui.t === t ? prev : { ...prev, ui: { ...prev.ui, t } }));
      if (++ticks.current % SAVE_EVERY === 0) savePos(m.id, t);
    });
    const offEnded = e.onEnded(() => {
      patch({ playing: false });
    });
    return () => {
      e.pause();
      offTime();
      offEnded();
      engine.current = null;
    };
  }, [m.id, m.dur, patch]);

  useEffect(() => {
    engine.current?.setRate(st.ui.speed);
  }, [st.ui.speed]);

  // The position persists on unmount. A hard navigation (the e2e suite's `page.goto`) unloads the
  // document instead, which never runs React cleanup, so `pagehide` saves it there.
  useEffect(() => {
    const save = () => savePos(pos.current.id, pos.current.t);
    window.addEventListener('pagehide', save);
    return () => {
      window.removeEventListener('pagehide', save);
      save();
    };
  }, []);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (runTimer.current) clearTimeout(runTimer.current);
    },
    [],
  );

  // ---- actions --------------------------------------------------------------------------------
  const act = useCallback(
    (a: VmAction) => {
      if (a.kind === 'toast') toast(a.msg, a.tone);
      else if (a.kind === 'copy') {
        try {
          void navigator.clipboard.writeText(a.text);
        } catch {
          /* no clipboard permission; the reference confirms regardless */
        }
        toast(a.toast, 'success');
      } else {
        saveFile(a.name, a.content, a.mime);
        toast(a.toast, 'success');
      }
    },
    [toast],
  );

  const seek = useCallback(
    (t: number, play = false) => {
      const e = engine.current;
      if (!e || !m.dur) return;
      const next = Math.max(0, Math.min(m.dur, t));
      e.seek(next);
      patch(play ? { t: next, playing: true } : { t: next });
      if (!play) return;
      e.play();
      const main = document.querySelector('main');
      if (main && main.scrollTop > SCROLL_BACK_AT) main.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [m.dur, patch],
  );

  const openDrawer = useCallback(
    (d: DrawerRef) => {
      patch(d.kind === 'run' ? { drawer: d, lastDrawer: d, runState: 'idle' } : { drawer: d, lastDrawer: d });
    },
    [patch],
  );

  const copyPrompt = useCallback(() => {
    act({ kind: 'copy', text: m.prompt, toast: 'System prompt copied' });
    patch({ copied: true });
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => {
      patch({ copied: false });
    }, 2000);
  }, [act, m.prompt, patch]);

  // ---- the reference's sync(): a different AI Employee, same mounted screen -------------------
  // Saving here is what the prototype's `sync()` does before it resets the state, and it has to
  // happen while the previous module's playhead is still in hand.
  if (st.mid !== m.id) {
    savePos(st.mid, st.ui.t);
    setSt({ mid: m.id, ui: { ...st.ui, ...moduleReset(m, loadPos(m.id)) } });
    return null; // discarded: React re-renders immediately with the synced state
  }

  const ui = st.ui;
  const vm = employeeDetailVM(db, user, m, now, ui);
  const { hd, meta, v, ck, dp, dr, run } = vm;

  const togglePlay = () => {
    const e = engine.current;
    if (!e || !m.dur) return;
    const atEnd = ui.t >= m.dur;
    const next = !ui.playing;
    if (atEnd) e.seek(0);
    if (next) e.play();
    else e.pause();
    patch(atEnd ? { playing: next, t: 0 } : { playing: next });
  };

  const onSeekBar = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * m.dur);
  };

  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(ui.speed);
    patch({ speed: SPEEDS[(i + 1) % SPEEDS.length] as Speed });
  };

  const asset = (a: AssetVM) => {
    if (a.kind === 'copyPrompt') copyPrompt();
    else if (a.kind === 'viewPrompt') openDrawer({ kind: 'prompt' });
    else {
      const f = vm.files[a.file];
      if (f) act(f.get);
    }
  };

  const deployPrimary = () => {
    const action = dp.primary.action;
    if (action === 'run') openDrawer({ kind: 'run' });
    else if (action === 'resume' || action === 'reconnect')
      void mutate('setRuntime', { moduleId: m.id, runtime: 'deployed' });
    else if (action === 'markDeployed') void mutate('markDeployed', { moduleId: m.id });
  };

  const runGo = () => {
    const record = run.record;
    patch({ runState: 'running' });
    if (runTimer.current) clearTimeout(runTimer.current);
    runTimer.current = setTimeout(() => {
      patch({ runState: 'done' });
      void mutate('recordRun', { moduleId: m.id, title: record.title, preview: record.preview });
    }, 1400);
  };

  return (
    <>
      <div className={s.page}>
        <header className={s.header}>
          <div className={s.tile} data-tone={hd.tone}>
            <Icon name={hd.icon} size={22} strokeWidth={1.7} />
          </div>
          <div className={s.headMain}>
            <div className={s.titleRow}>
              <h1 className={s.h1}>{vm.name}</h1>
              <StatusToken kind="runtime" state={hd.runtime} size="md" title={hd.runtimeTip} />
            </div>
            <p className={s.outcome}>{vm.outcome}</p>
            <p className={s.metaRow}>
              {meta.hasSession ? (
                <>
                  <span>From Session {meta.n}</span>
                  <span aria-hidden="true">·</span>
                  <a
                    href="/sessions"
                    className={s.metaLink}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/sessions');
                    }}
                  >
                    {meta.title}
                  </a>
                  <span aria-hidden="true">·</span>
                </>
              ) : null}
              {meta.selfPaced ? (
                <>
                  <span>Self-Paced</span>
                  <span aria-hidden="true">·</span>
                </>
              ) : null}
              <span>{vm.build} Min Build</span>
              <span aria-hidden="true">·</span>
              <span>For {vm.forWho}</span>
            </p>
          </div>
        </header>

        {vm.soon ? (
          <div className={s.soon}>
            <StatusToken kind="custom" tone="neutral" icon="clock" label={vm.soon.label} />
            {vm.soon.text}
          </div>
        ) : null}

        <div className={s.body}>
          <div className={s.main}>
            <section aria-label="Session replay" className={s.player}>
              {/* The reference's poster is a bare click target. It stays one: play/pause, seeking and
                  every other action it offers also has a labelled button in the controls below. */}
              <div
                className={s.poster}
                data-playable={v.has ? 'true' : undefined}
                onClick={() => {
                  if (v.has) togglePlay();
                }}
              >
                <div className={s.posterText}>
                  <div className={s.kicker}>Amplified Impact · Session {v.n}</div>
                  <div className={s.posterTitle}>{v.title}</div>
                  <div className={s.posterSub}>{v.sub}</div>
                </div>

                {v.has ? <span className={s.chip}>Replay · {v.speedLabel}</span> : null}

                {v.showBigPlay ? (
                  <div className={s.bigPlay}>
                    <Icon name="play" size={24} filled className={s.bigPlayGlyph} />
                  </div>
                ) : null}

                {v.caption ? <div className={s.caption}>{v.caption}</div> : null}

                {v.none ? (
                  // `stopProp` in the reference: a click on the join block must not reach the poster.
                  // The note span always renders, empty or not — the reference's column gap counts it.
                  <div className={s.noneBlock} onClick={(e) => e.stopPropagation()}>
                    <span className={s.noneWhen}>{v.noneWhen}</span>
                    <div className={s.noneRow}>
                      {v.showJoin ? (
                        <JoinButton mode={v.joinMode} hint="" url={v.zoom} onDark onJoin={() => act(v.join)} />
                      ) : null}
                      {v.showCal ? (
                        <button
                          type="button"
                          className={s.calBtn}
                          onClick={() => {
                            if (v.cal) act(v.cal);
                          }}
                        >
                          Add to Calendar
                        </button>
                      ) : null}
                    </div>
                    <span className={s.noneNote}>{v.noneNote}</span>
                  </div>
                ) : null}
              </div>

              {v.has ? (
                <div className={s.controls}>
                  {/* The reference's seek bar is a click-only `role="slider"`. The focus stop and the
                      arrow keys are the keyboard half of that same control, which CLAUDE.md requires
                      of every interactive element — no new UI, and no pixels change. */}
                  <div
                    className={s.seek}
                    role="slider"
                    tabIndex={0}
                    aria-label="Seek"
                    aria-valuemin={0}
                    aria-valuemax={vm.dur}
                    aria-valuenow={v.tNow}
                    onClick={onSeekBar}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') seek(ui.t - 10);
                      else if (e.key === 'ArrowRight') seek(ui.t + 10);
                      else return;
                      e.preventDefault();
                    }}
                  >
                    <div className={s.seekRail} />
                    <div className={s.seekFill} style={{ '--pct': v.pct } as CSSProperties} />
                    {vm.rail.map((mk) => (
                      <div
                        key={mk.n}
                        title={mk.label}
                        className={s.marker}
                        data-done={mk.done ? 'true' : undefined}
                        style={{ '--left': mk.left } as CSSProperties}
                      />
                    ))}
                    <div className={s.thumb} style={{ '--pct': v.pct } as CSSProperties} />
                  </div>

                  <div className={s.ctlRow}>
                    <button type="button" className={s.ctlBtn} aria-label={v.playTitle} onClick={togglePlay}>
                      <Icon name={v.playIcon} size={16} filled />
                    </button>
                    <button
                      type="button"
                      className={s.ctlBtn}
                      data-tone="secondary"
                      aria-label="Back 10 seconds"
                      onClick={() => seek(ui.t - 10)}
                    >
                      <Icon name="reset" size={16} strokeWidth={1.9} />
                    </button>
                    <span className={s.time}>
                      {v.time} <span className={s.timeTotal}>/ {v.total}</span>
                    </span>
                    <span className={s.chapterNow}>{v.chapter}</span>
                    <button type="button" className={s.speedBtn} aria-label="Playback speed" onClick={cycleSpeed}>
                      {v.speedLabel}
                    </button>
                    <button
                      type="button"
                      className={s.ctlBtn}
                      data-tone="cc"
                      aria-pressed={v.cc}
                      aria-label="Captions"
                      onClick={() => patch({ cc: !ui.cc })}
                    >
                      <Icon name="cc" size={17} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      className={s.trBtn}
                      aria-pressed={vm.trOn}
                      onClick={() => patch({ transcript: !ui.transcript })}
                    >
                      <Icon name="lines" size={14} strokeWidth={1.9} />
                      Transcript
                    </button>
                  </div>
                </div>
              ) : null}

              <div className={s.rail}>
                <div className={s.railHead}>
                  <span className={s.railTitle}>{vm.railTitle}</span>
                  <span className={s.railNote}>Chapters Follow the 6 Build Steps</span>
                </div>
                <div className={s.railGrid}>
                  {vm.rail.map((ch) => (
                    <button
                      key={ch.n}
                      type="button"
                      className={s.chapter}
                      data-active={ch.active ? 'true' : undefined}
                      data-seekable={ch.seek === null ? undefined : 'true'}
                      aria-current={ch.active ? 'step' : undefined}
                      title={ch.tip}
                      onClick={() => {
                        if (ch.seek !== null) seek(ch.seek, true);
                      }}
                    >
                      <span className={s.chapterTop}>
                        <span>
                          Step {ch.n} · {ch.t}
                        </span>
                        {ch.done ? (
                          <Icon name="check" size={13} strokeWidth={2.4} label="Verified" className={s.chapterCheck} />
                        ) : null}
                      </span>
                      <span className={s.chapterName}>{ch.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {vm.trOpen ? (
              <section aria-label="Transcript" className={s.transcript}>
                <div className={s.trHead}>
                  <div className={s.trField}>
                    <Icon name="search" size={15} strokeWidth={1.9} className={s.trIcon} />
                    <input
                      className={s.trInput}
                      value={ui.q}
                      onChange={(e) => patch({ q: e.target.value })}
                      placeholder="Search the transcript"
                      aria-label="Search the transcript"
                    />
                  </div>
                  <span className={s.trCount}>{vm.qCount}</span>
                </div>
                {vm.noTranscript ? <div className={s.trEmpty}>{vm.noTranscriptMsg}</div> : null}
                <div className={s.trList}>
                  {vm.lines.map((ln) => (
                    <button
                      key={ln.at}
                      type="button"
                      className={s.trLine}
                      data-current={ln.current ? 'true' : undefined}
                      onClick={() => seek(ln.at, true)}
                    >
                      <span className={s.trTime}>{ln.t}</span>
                      <span className={s.trText}>
                        {ln.parts.map((pt, i) => (
                          <span key={i} className={s.trPart} data-hit={pt.hit ? 'true' : undefined}>
                            {pt.s}
                          </span>
                        ))}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section aria-label="Build checklist" className={s.checklist}>
              <div className={s.ckHead}>
                <div className={s.ckHeadTop}>
                  <div className={s.ckTitles}>
                    <h2 className={s.h2}>Build Checklist</h2>
                    <span className={s.ckCount}>
                      {ck.done} of {ck.total} Steps Verified
                    </span>
                  </div>
                  <StatusToken kind="build" state={ck.state} n={ck.done} total={ck.total} title={ck.tip} />
                </div>
                <div role="img" aria-label={`${ck.done} of ${ck.total} steps verified`} className={s.ckSegs}>
                  {ck.segs.map((sg, i) => (
                    <span key={i} className={s.ckSeg} data-state={sg} />
                  ))}
                </div>
              </div>
              <ol className={s.steps}>
                {ck.items.map((step) => (
                  <li key={step.id} className={s.step} data-next={step.isNext ? 'true' : undefined}>
                    <span
                      className={s.stepNum}
                      data-state={step.on ? 'on' : step.isNext ? 'next' : undefined}
                    >
                      {step.n}
                    </span>
                    <div className={s.stepMain}>
                      <span className={s.stepText} data-on={step.on ? 'true' : undefined}>
                        {step.text}
                      </span>
                      {step.hint ? <span className={s.stepHint}>{step.hint}</span> : null}
                      <div className={s.stepMeta}>
                        <span>About {step.mins} Min</span>
                        {step.watch === null ? null : (
                          <button
                            type="button"
                            className={s.watch}
                            onClick={() => {
                              if (step.watch !== null) seek(step.watch, true);
                            }}
                          >
                            <Icon name="play" size={10} filled />
                            Watch at {step.t}
                          </button>
                        )}
                        {step.assets.map((a) => (
                          <button
                            key={`${a.kind}:${a.label}`}
                            type="button"
                            className={s.asset}
                            onClick={() => asset(a)}
                          >
                            <Icon name={a.icon} size={12} strokeWidth={2} />
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={s.stepRight}>
                      {step.on ? (
                        <button
                          type="button"
                          className={s.tokenBtn}
                          title={step.undoTip}
                          onClick={() => void mutate('toggleStep', { moduleId: m.id, stepId: step.id })}
                        >
                          <StatusToken kind="step" state="verified" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={s.markBtn}
                          data-next={step.isNext ? 'true' : undefined}
                          onClick={() => void mutate('toggleStep', { moduleId: m.id, stepId: step.id })}
                        >
                          Mark Verified
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className={s.aside}>
            <section aria-label="Your deployment" className={s.deploy} data-tone={dp.tone}>
              <div className={s.dpHead}>
                <h2 className={s.h2}>Your Deployment</h2>
                <StatusToken kind="runtime" state={hd.runtime} title={hd.runtimeTip} />
              </div>

              <div className={s.platform}>
                <span className={s.platformTile}>
                  <Icon name="bot" size={15} strokeWidth={1.8} />
                </span>
                <div className={s.platformText}>
                  <div className={s.platformLabel}>Platform</div>
                  <div className={s.platformValue}>{vm.platform}</div>
                </div>
                {dp.canOpen ? (
                  <a
                    href="#"
                    className={s.openLink}
                    onClick={(e) => {
                      e.preventDefault();
                      act(dp.open);
                    }}
                  >
                    Open
                    <Icon name="arrowUR" size={12} strokeWidth={2} />
                  </a>
                ) : null}
              </div>

              {dp.when ? (
                <div className={s.dpWhen} title={dp.whenAbs}>
                  {dp.when}
                </div>
              ) : null}

              {dp.issue ? <div className={s.dpIssue}>{dp.issue}</div> : null}

              {dp.last ? (
                <div className={s.dpLast}>
                  <div className={s.dpLastHead}>
                    <span>Last Output</span>
                    <span title={dp.last.abs}>{dp.last.ago}</span>
                  </div>
                  <div className={s.dpLastBox}>
                    <span className={s.dpLastTitle}>{dp.last.title}</span>
                    <span className={s.dpLastPreview}>{dp.last.preview}</span>
                  </div>
                </div>
              ) : null}

              {dp.note ? <div className={s.dpNote}>{dp.note}</div> : null}

              <div className={s.dpActions}>
                <button
                  type="button"
                  className={s.dpPrimary}
                  aria-disabled={dp.primary.disabled ? 'true' : undefined}
                  onClick={deployPrimary}
                >
                  <Icon name={dp.primary.icon} size={15} strokeWidth={1.9} />
                  {dp.primary.label}
                </button>
                {dp.secondary ? (
                  <button
                    type="button"
                    className={s.dpSecondary}
                    onClick={() => void mutate('setRuntime', { moduleId: m.id, runtime: 'paused' })}
                  >
                    {dp.secondary.label}
                  </button>
                ) : null}
              </div>
            </section>

            <section aria-label="Build kit" className={s.kit}>
              <div className={s.kitHead}>
                <h2 className={s.h2}>Build Kit</h2>
                <span className={s.kitNote}>{vm.kitNote}</span>
              </div>

              <div className={s.promptBox}>
                <div className={s.promptRow}>
                  <div className={s.promptText}>
                    <div className={s.promptTitle}>System Prompt</div>
                    <div className={s.promptStats}>{vm.promptStats}</div>
                  </div>
                  <button type="button" className={s.viewBtn} onClick={() => openDrawer({ kind: 'prompt' })}>
                    View
                  </button>
                  <button
                    type="button"
                    className={s.copyBtn}
                    data-copied={vm.cp.copied ? 'true' : undefined}
                    onClick={copyPrompt}
                  >
                    <Icon name={vm.cp.icon} size={13} strokeWidth={2} />
                    {vm.cp.label}
                  </button>
                </div>
                {vm.vars.length ? (
                  <div className={s.fillIn}>
                    Fill In
                    {vm.vars.map((vv) => (
                      <span key={vv} className={s.varChip}>
                        {vv}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {vm.files.map((f) => (
                <div key={f.name} className={s.fileRow}>
                  <span className={s.typeBadge}>{f.type}</span>
                  <div className={s.rowText}>
                    <div className={s.fileName} data-mono={f.mono ? 'true' : undefined}>
                      {f.name}
                    </div>
                    <div className={s.fileDesc}>{f.desc}</div>
                  </div>
                  <button
                    type="button"
                    className={s.rowBtn}
                    aria-label={`Preview ${f.name}`}
                    onClick={() => openDrawer({ kind: 'file', i: f.i })}
                  >
                    <Icon name="eye" size={14} strokeWidth={1.9} />
                  </button>
                  <button
                    type="button"
                    className={s.rowBtn}
                    aria-label={f.getLabel}
                    title={f.getLabel}
                    onClick={() => act(f.get)}
                  >
                    <Icon name={f.getIcon} size={14} strokeWidth={1.9} />
                  </button>
                </div>
              ))}

              {vm.resources.map((r) => (
                <div key={r.name} className={s.resRow}>
                  <span className={s.typeBadge}>{r.type}</span>
                  <div className={s.rowText}>
                    <div className={s.resName}>{r.name}</div>
                    <div className={s.resSize}>{r.size}</div>
                  </div>
                  <button
                    type="button"
                    className={s.resBtn}
                    aria-disabled={r.pending ? 'true' : undefined}
                    aria-label={`Download ${r.name}`}
                    onClick={() => {
                      if (r.get) act(r.get);
                    }}
                  >
                    <Icon name="download" size={14} strokeWidth={1.9} />
                  </button>
                </div>
              ))}
            </section>

            <section aria-label="Instructor notes" className={s.notes}>
              <Avatar id={vm.instructor} name={vm.instructor} size={34} />
              <div className={s.notesMain}>
                <div className={s.notesHead}>
                  <span className={s.notesTitle}>Instructor Notes</span>
                  <span className={s.notesWho}>{vm.instructor}</span>
                </div>
                <p className={s.notesBody}>{vm.notes}</p>
              </div>
            </section>
          </aside>
        </div>

        <footer className={s.footer}>
          <button type="button" className={s.nextBtn} onClick={() => navigate(vm.nextUp.to)}>
            {vm.nextUp.label}
            <Icon name="arrowR" size={15} strokeWidth={2} />
          </button>
        </footer>
      </div>

      <Drawer
        open={dr.open}
        onClose={() => patch({ drawer: null })}
        title={dr.name}
        description={dr.desc}
        width={560}
        className={dr.isCode ? s.codeDrawer : undefined}
        footer={
          dr.isRun ? (
            <>
              {run.done ? (
                <button type="button" className={s.copyAll} onClick={() => act(run.copy)}>
                  Copy All
                </button>
              ) : null}
              <button type="button" className={s.runGo} onClick={runGo}>
                <Icon name="play" size={13} filled />
                {run.btn}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={s.codeCopy} onClick={() => act(dr.copy)}>
                <Icon name="copy" size={14} strokeWidth={1.9} />
                Copy
              </button>
              <button type="button" className={s.codeGet} onClick={() => act(dr.get)}>
                <Icon name={dr.getIcon} size={14} strokeWidth={1.9} />
                {dr.getLabel}
              </button>
            </>
          )
        }
      >
        {dr.isRun ? (
          <>
            <label className={s.runLabel}>
              {run.inputLabel}
              <textarea
                className={s.runInput}
                value={run.text}
                onChange={(e) => patch({ runText: e.target.value })}
              />
            </label>
            {run.running ? (
              <div className={s.runWorking}>
                <Icon name="spinner" size={16} strokeWidth={2.2} className={s.spin} />
                {vm.short} AI Employee Is Working…
              </div>
            ) : null}
            {run.out.map((o) => (
              <div key={o.label} className={s.runOut}>
                <span className={s.runOutLabel}>{o.label}</span>
                <span className={s.runOutBody}>{o.body}</span>
              </div>
            ))}
          </>
        ) : (
          <div className={s.code}>
            {dr.lines.map((pl) => (
              <div key={pl.n} className={s.codeLine}>
                <span className={s.codeNum}>{pl.n}</span>
                <span className={s.codeText}>
                  {pl.parts.map((pp, i) => (
                    <span key={i} className={s.codePart} data-kind={pp.kind}>
                      {pp.t}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}

function EmployeeDetail() {
  const db = useDb();
  const viewer = useViewer();
  const { employeeId } = useParams();

  const actor = viewer.actor;
  const user = actor.kind === 'learner' ? (db.users.find((u) => u.id === actor.userId) ?? null) : null;
  const m = user ? (visibleModules(db).find((x) => x.id === employeeId) ?? null) : null;

  // The shell owns this route's guards (SCREENS § 3.2): an unknown id goes to `/`, and a locked AI
  // Employee lands on the first accessible one and opens the Locked Preview instead. Render nothing
  // until that redirect commits, so a locked employee is never a page.
  if (!user || !m || !canAccess(user, m)) return null;

  return <Workspace db={db} user={user} m={m} />;
}

/** The route module React Router lazy-loads (`lazy: () => import('./routes/portal/EmployeeDetail')`). */
export function Component() {
  return <EmployeeDetail />;
}

export default Component;
