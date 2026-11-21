// Turn in: how a team sends Connor what a step asks for (a report for a live read, a checkpoint).
//   <TurnInDrawer>  the brand's drawer (05) with the brand's upload (16): drop or choose files, a note, and for a
//                   checkpoint the minutes the hire took over; then what was turned in, and Turn in a new version
// It opens from the button on the step that asks for the file (the step page's `upload` action), never from the week
// page: there is no Turn in card. The team sees what they sent and when. It never shows what staff did with it:
// no Received / Picked / Reviewed, here or anywhere on the learner side.
// An agent has no button and no drawer: the step shows ui.agent in the button's place.
// Pixel-identical to mockup/index.html (black bar › Open turn in).
//
//   asks[]   { id, kind: 'live_read' | 'checkpoint', step, kicker }
//   subs     { [askId]: { files[{ name, size, href? }], note, minutes, by, when } }
//   can      the viewer is the Team Owner or the Operations Lead
//   upload(file, onProgress) → Promise   puts one file; calls onProgress(0..1)
//   onSubmit(askId, { files, note, minutes }) → Promise
//
// Rules shown to the learner (the server enforces them again): PDF, HTML, PNG, JPG, Excel or CSV; 25 MB a file; 5 files.
//
// D-230: `handoff/lms-v3/src/components/TurnIn.jsx`, converted to TSX (types added), plus C-22's failures in the slots
// the drawer already has: a file whose upload fails says so under the files (`.fm-msg`) and leaves the list, and a
// turn-in the server refuses says why in the foot (`.fm-note`), the button shaking back to Turn it in.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { AsyncBtn } from './Community';
import { Drawer, RollLabel, SignalMark, useDropZone } from '@brand/ai-motion';
import type { AsyncState, MotionStyle } from '@brand/ai-motion';
import type { TiAsk, TiFileIn, TiKind, TiSub, TurnInUi } from './types';

export const OK_EXT = ['pdf', 'html', 'htm', 'png', 'jpg', 'jpeg', 'xlsx', 'csv'];
export const bytes = (n: number): string => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

interface UpFile { id: number; i: number; name: string; size: string; p: number; file: File }

function Compose({ ui, cancel, a, k, upload, onSubmit, onSent }: { ui: TurnInUi; cancel: () => void; a: TiAsk; k: TiKind; upload: (file: File, onProgress: (p: number) => void) => Promise<unknown>; onSubmit: (askId: string, x: { files: TiFileIn[]; note: string; minutes: string }) => Promise<unknown>; onSent: () => void }) {
  const [files, setFiles] = useState<UpFile[]>([]), [err, setErr] = useState(''), [shake, setShake] = useState(0), [note, setNote] = useState(''), [minutes, setMinutes] = useState(''), [msg, setMsg] = useState(''), [state, setState] = useState<AsyncState>('idle');
  const seq = useRef(0), live = useRef(new Set<number>()), dropEl = useRef<HTMLDivElement | null>(null);
  const ready = files.length > 0 && files.every((f) => f.p >= 1);
  const add = (list: File[]) => {
    let e = ''; const next = [...files];
    for (const file of list) {
      const ext = file.name.split('.').pop()!.toLowerCase();
      if (!OK_EXT.includes(ext)) { e = `${file.name} ${ui.badType}`; continue; }
      if (file.size > 25e6) { e = `${file.name} ${ui.tooBig}`; continue; }
      if (next.length >= 5) { e = ui.tooMany; break; }
      const f: UpFile = { id: ++seq.current, i: next.length, name: file.name, size: bytes(file.size), p: 0, file }; next.push(f); live.current.add(f.id);
      upload(file, (p) => { if (live.current.has(f.id)) setFiles((cur) => cur.map((x) => (x.id === f.id ? { ...x, p } : x))); })
        // C-22: an upload that fails leaves the list and says so where a refused file does.
        .catch((x: unknown) => { if (!live.current.has(f.id)) return; live.current.delete(f.id); setFiles((cur) => cur.filter((y) => y.id !== f.id)); setErr(`${file.name} ${x instanceof Error ? x.message : String(x)}`); setShake((n) => n + 1); });
    }
    setFiles(next); setErr(e); if (e) setShake((n) => n + 1); setMsg('');
  };
  useEffect(() => { const el = dropEl.current; if (!shake || !el) return; el.dataset.state = 'idle'; void el.offsetWidth; el.dataset.state = 'error'; }, [shake]);
  const { props: drop } = useDropZone(add);
  const remove = (id: number) => { live.current.delete(id); setFiles((cur) => cur.filter((x) => x.id !== id)); };
  const submit = async () => {
    if (state === 'busy' || state === 'done') return;
    if (!ready) { setMsg(files.length ? ui.wait : ui.needFile); setState('error'); return; }
    setMsg(''); setState('busy');
    // C-22: a refusal says why in the foot, where "Add at least one file." goes.
    try { await onSubmit(a.id, { files: files.map((f) => ({ name: f.name, size: f.size, file: f.file })), note: note.trim(), minutes: minutes.trim() }); }
    catch (x) { setMsg(x instanceof Error ? x.message : String(x)); setState('error'); return; }
    setState('done'); setTimeout(onSent, 900);
  };
  return (
    <>
      <form className="fm-body" noValidate onSubmit={(e) => e.preventDefault()}>
        <div className="fm-field aim-in" style={{ '--i': 1 } as MotionStyle} data-field="files" data-state={err ? 'error' : undefined}>
          <div className="up-drop" ref={dropEl} {...drop} data-drag={drop['data-drag'] ? 'true' : undefined}>
            <Icon name="up" size={24} /><b>{ui.drop}</b><span>{ui.or}</span>
            <label className="wk-btn wk-btn-secondary wk-btn-sm up-pick"><RollLabel>{ui.choose}</RollLabel><input type="file" multiple accept={OK_EXT.map((x) => '.' + x).join(',')} aria-label={ui.choose} onChange={(e) => { add([...(e.target.files ?? [])]); e.target.value = ''; }} /></label>
            <span>{ui.types}</span>
          </div>
          <div className="up-files" aria-live="polite">
            {files.map((f) => (
              <div className="up-file" key={f.id} data-file={f.id} data-state={f.p >= 1 ? 'done' : 'busy'} style={{ '--i': f.i, '--v': f.p } as MotionStyle}>
                <span className="up-name">{f.name}<small>{f.size}</small></span>
                <span className="up-state">{f.p >= 1 ? <><svg className="up-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 8.5l2.8 2.8L12.5 5" pathLength={1} /></svg>{ui.uploaded}</> : `${Math.round(f.p * 100)}%`}</span>
                <button className="up-x" type="button" aria-label={`${ui.remove} ${f.name}`} onClick={() => remove(f.id)}><Icon name="x" size={16} /></button>
                <span className="up-bar" aria-hidden="true" />
              </div>
            ))}
          </div>
          {err && <p className="fm-msg">{err}</p>}
        </div>
        <div className="up-fields aim-in" style={{ '--i': 2 } as MotionStyle}>
          {k.privacy && <p className="up-privacy"><Icon name="users" size={16} /><span>{k.privacy}</span></p>}
          {k.minutesLabel && <div className="fm-field"><label className="fm-label" htmlFor="up-min">{k.minutesLabel}</label><p className="fm-hint">{k.minutesHint}</p><input className="fm-input up-short" id="up-min" type="text" maxLength={40} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></div>}
          <div className="fm-field"><label className="fm-label" htmlFor="up-note">{k.noteLabel}<span className="fm-opt">Optional</span></label><textarea className="fm-input" id="up-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
      </form>
      <footer className="fm-foot aim-in" style={{ '--i': 3 } as MotionStyle}>
        <AsyncBtn cls="wk-btn-primary up-submit" state={state} label={ui.submit} done={ui.submitted} onClick={submit} disabled={!ready} />
        <button className="wk-btn wk-btn-ghost" type="button" data-do="cancel" onClick={cancel}><RollLabel>Cancel</RollLabel></button>
        <p className="fm-note" role="alert">{msg || null}</p>
      </footer>
    </>
  );
}

export interface TurnInDrawerProps {
  ui: TurnInUi;
  asks: TiAsk[];
  subs: Record<string, TiSub>;
  can: boolean;
  askId: string | null;
  onClose: () => void;
  upload: (file: File, onProgress: (p: number) => void) => Promise<unknown>;
  onSubmit: (askId: string, x: { files: TiFileIn[]; note: string; minutes: string }) => Promise<unknown>;
}

export function TurnInDrawer({ ui, asks, subs, can, askId, onClose, upload, onSubmit }: TurnInDrawerProps) {
  const [composing, setComposing] = useState(false), [now, setNow] = useState(false), [shown, setShown] = useState(askId);
  useEffect(() => { if (askId) { setShown(askId); setComposing(!subs[askId]); setNow(false); } }, [askId]);   // opening: what was turned in, else the form
  const a = asks.find((x) => x.id === shown), k = a && ui.kinds[a.kind], sub = a && subs[a.id];
  return (
    <div data-ai="upload" id="up-host" data-drawer={askId ? 'open' : undefined}>
      <Drawer open={!!askId} onClose={onClose} label={k ? k.title : ''} className="fm-drawer up-drawer">
        {a && k && <>
          <header className="fm-head aim-in" style={{ '--i': 0 } as MotionStyle} key={composing ? 'c' : 's'}><div><p className="fm-kick">{a.kicker}</p><h2 className="fm-title">{k.title}</h2><p className="fm-sub">{k.sub}</p></div><button className="fm-close" type="button" onClick={onClose}>Close</button></header>
          {composing || !sub
            ? <Compose key={'c' + a.id} ui={ui} a={a} k={k} cancel={onClose} upload={upload} onSubmit={onSubmit} onSent={() => { setNow(true); setComposing(false); }} />
            : <>
              <div className="fm-body" key="s">
                <div className={'fm-banner' + (now ? ' aim-rise' : '')}><SignalMark play={now} /><div><b>{ui.bannerTitle}</b><p>{`${sub.when} ${ui.by} ${sub.by}`}</p></div></div>
                <div className="up-sent aim-in" style={{ '--i': 1 } as MotionStyle}>
                  <div className="up-status">{ui.sentTo}</div>
                  <section><h3>{ui.files}</h3><ul className="up-got">{sub.files.map((f) => <li key={f.name}><Icon name="file" size={16} /><a href={f.href || '#'} onClick={f.href ? undefined : (e) => e.preventDefault()}>{f.name}</a><small>{f.size}</small></li>)}</ul></section>
                  {sub.note && <section><h3>{k.noteLabel}</h3><p>{sub.note}</p></section>}
                  {sub.minutes && <section><h3>{k.minutesLabel}</h3><p>{sub.minutes}</p></section>}
                </div>
              </div>
              <footer className="fm-foot aim-in" style={{ '--i': 2 } as MotionStyle} key="sf">
                <button className="wk-btn wk-btn-primary" type="button" data-do="done" onClick={onClose}><RollLabel>{ui.done}</RollLabel></button>
                {can && <button className="wk-btn wk-btn-secondary" type="button" data-do="new" onClick={() => { setNow(false); setComposing(true); }}><Icon name="up" /><RollLabel>{ui.newVersion}</RollLabel></button>}
              </footer>
            </>}
        </>}
      </Drawer>
    </div>
  );
}
