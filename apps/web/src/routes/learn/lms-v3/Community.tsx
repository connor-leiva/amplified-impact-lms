// The cohort Community: threads in spaces. Three pieces, pixel-identical to mockup/index.html (#community, #thread-N):
//   <CommunityPage>      the list: spaces, pinned threads, threads by newest activity, How this works
//   <ThreadPage>         one thread: the first post, replies, Reply, About this thread, and the staff-only card
//   <StartThreadDrawer>  Start a thread, in the brand's drawer (05)
// They hold only what is on screen (the text being typed, which post is being edited, a pending delete). Every change
// goes out through a callback that returns a promise, and the page draws what comes back in `threads` / `thread`.
// Nothing here sends an email or a notification, and the page says so.
//
// Motion (Amplified Impact Motion v1): blocks rise on arrival; rows change colour on hover and the arrow nudges 3px;
// buttons roll and press; Post reply and Post thread are brand 03; a new reply rises in; errors shake (07).
//
// D-231: `handoff/lms-v3/src/components/Community.jsx`, converted to TSX (types added), plus C-22's failures, each in a
// slot the mockup already has and drawing nothing when there is none: a refused reply under the reply box (`.fm-msg`,
// the box shaking as for an empty one), a refused thread under its field (`.fm-msg`; Details when the refusal names
// no field) with the button shaking back to Post thread, and a page-level `notice` in the reply box's slot.
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Icon, IconSprite } from './Icons';
import { Drawer, HairlineSweep, RollLabel, SignalMark } from '@brand/ai-motion';
import type { AsyncState, MotionStyle } from '@brand/ai-motion';
import type { CmPerson, CmPost, CmSpace, CmThread, CmThreadRow, CommunityUi } from './types';

const stop = (href: string) => (href === '#' ? (e: MouseEvent) => e.preventDefault() : undefined);
export const repliesText = (ui: CommunityUi, n: number): string => (n === 0 ? ui.noReplies : n === 1 ? '1 reply' : `${n} replies`);
const paras = (b: string) => b.split(/\n{2,}/).map((x, i) => <p key={i}>{x.split('\n').flatMap((l, j) => (j ? [<br key={j} />, l] : [l]))}</p>);

function Avatar({ p }: { p: CmPerson }) { return <span className="wk-av cm-av" data-staff={p.staff ? '' : undefined} aria-hidden="true">{p.initials}</span>; }
function Tags({ ui, t }: { ui: CommunityUi; t: { pinned?: boolean; hidden?: boolean } }) {
  return <>{t.pinned && <span className="wk-st" data-s="progress"><Icon name="pin" />{ui.pinned}</span>}{t.hidden && <span className="wk-st" data-s="waiting">{ui.hidden}</span>}</>;
}
export function AsyncBtn({ cls, state, label, done, icon, onClick, disabled }: { cls: string; state: AsyncState; label: string; done: string; icon?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className={`wk-btn ${cls} aim-async`} type="button" data-state={state} aria-disabled={disabled == null ? undefined : String(disabled) as 'true' | 'false'} onClick={onClick}>
      <span className="aim-async__label">{icon && <Icon name={icon} />}<RollLabel>{label}</RollLabel></span><HairlineSweep /><span className="aim-async__done"><SignalMark />{done}</span>
    </button>
  );
}

export interface CommunityPageProps {
  ui: CommunityUi;
  spaces: CmSpace[];
  space: string;
  onSpace: (id: string) => void;
  /** [{ id, href, space, title, pinned, hidden, activity, replies, excerpt, by }] in activity order. */
  threads: CmThreadRow[];
  people: Record<string, CmPerson>;
  onStart: () => void;
}

/** threads: [{ id, href, space, title, pinned, hidden, activity, replies, excerpt, by }] in activity order. */
export function CommunityPage({ ui, spaces, space, onSpace, threads, people, onStart }: CommunityPageProps) {
  const name = (id: string) => spaces.find((x) => x.id === id)!.label;
  const row = (t: CmThreadRow) => { const a = people[t.by]!; return (
    <li className="cm-row" key={t.id} data-hidden={t.hidden ? '' : undefined} data-thread={t.id}>
      <Avatar p={a} />
      <div>
        <div className="cm-row-t"><a className="cm-a" href={t.href} onClick={stop(t.href)}>{t.title}</a><Tags ui={ui} t={t} /></div>
        <p className="cm-meta">{`${a.name} · ${a.staff ? ui.staff : a.team} · ${name(t.space)}`}</p><p className="cm-ex">{t.excerpt}</p>
      </div>
      <div className="cm-act">{`${repliesText(ui, t.replies)} · ${t.activity}`}<Icon name="right" size={20} className="wk-chev wk-arrow" /></div>
    </li>
  ); };
  const pinned = threads.filter((t) => t.pinned), rest = threads.filter((t) => !t.pinned);
  return (
    <div data-ai="community" data-community-page="" id="view-community">
      <IconSprite />
      <div className="wk-page">
        <header className="sc-head aim-rise" style={{ '--i': 0 } as MotionStyle}>
          <div><h1 className="wk-h1">{ui.title}</h1><p className="wk-purpose">{ui.lede}</p></div>
          <div className="sc-head-acts"><button className="wk-btn wk-btn-primary" type="button" id="cm-start" onClick={onStart}><Icon name="pen" /><RollLabel>{ui.start}</RollLabel></button></div>
        </header>
        <div className="cm-spaces aim-rise" style={{ '--i': 1 } as MotionStyle} id="cm-spaces" role="radiogroup" aria-label={ui.spaces}>
          {[{ id: 'all', label: ui.all }, ...spaces].map((x) => <label className="fm-chip" key={x.id}><input type="radio" name="cm-space" value={x.id} checked={x.id === space} onChange={() => onSpace(x.id)} />{x.label}</label>)}
        </div>
        <div className="cm-layout">
          <div className="cm-main aim-rise" style={{ '--i': 2 } as MotionStyle} id="cm-list">
            {pinned.length > 0 && <div><h2 className="sc-month">{ui.pinned}</h2><ol className="sc-list">{pinned.map(row)}</ol></div>}
            <div><h2 className="sc-month">{ui.threads}<small>{ui.newest}</small></h2>{rest.length ? <ol className="sc-list">{rest.map(row)}</ol> : <div className="sc-list cm-empty">{ui.none}</div>}</div>
          </div>
          <aside className="cm-rail aim-rise" style={{ '--i': 3 } as MotionStyle} aria-label={ui.how}>
            <section className="wk-card"><div className="wk-card-h"><h2 className="wk-h3">{ui.how}</h2></div><ul className="cm-how">{ui.howLines.map((x) => <li key={x}>{x}</li>)}</ul></section>
          </aside>
        </div>
      </div>
    </div>
  );
}

type PostAct = 'edit' | 'cancel' | 'save' | 'delete' | 'hide' | 'delete-yes';

function Post({ ui, x, first, people, me, staff, edit, ask, act }: { ui: CommunityUi; x: CmPost; first: boolean; people: Record<string, CmPerson>; me: string; staff: boolean; edit: boolean; ask: boolean; act: (d: PostAct, x: CmPost, value?: string) => void }) {
  const a = people[x.by]!, mine = x.by === me, ta = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { if (edit) ta.current?.focus(); }, [edit]);
  const btn = (d: PostAct, l: string, cls = 'wk-btn-ghost') => <button key={d} className={`wk-btn ${cls} wk-btn-sm`} type="button" data-do={d} onClick={() => act(d, x, ta.current?.value)}><RollLabel>{l}</RollLabel></button>;
  const acts = ask
    ? [<span key="q">{first ? ui.deleteThread : ui.deleteReply}</span>, btn('delete-yes', ui.delete, 'wk-btn-secondary'), btn('cancel', ui.cancel)]
    : [mine && btn('edit', ui.edit), (mine || staff) && btn('delete', ui.delete), staff && !first && btn('hide', x.hidden ? ui.show : ui.hide)].filter(Boolean);
  return (
    <article className={'cm-post' + (x.fresh ? ' aim-rise' : '')} data-post={x.id} data-hidden={x.hidden ? '' : undefined}>
      <div className="cm-by"><Avatar p={a} /><span>{a.name}{a.staff && <span className="wk-chip wk-chip-hi">{ui.staff}</span>}{x.hidden && <span className="wk-chip">{ui.hidden}</span>}<small>{`${a.team} · ${x.when}${x.edited ? ` · ${ui.edited}` : ''}`}</small></span></div>
      {edit
        ? <div className="cm-edit fm-field"><textarea className="fm-input" rows={4} aria-label={ui.edit} defaultValue={x.body} ref={ta} /><div>{btn('save', ui.save, 'wk-btn-primary')}{btn('cancel', ui.cancel)}</div></div>
        : <><div className="cm-body">{paras(x.body)}</div>{acts.length > 0 && <div className="cm-acts">{acts}</div>}</>}
    </article>
  );
}

export interface ThreadPageProps {
  ui: CommunityUi;
  /** { id, space, spaceLabel, title, pinned, hidden, posts[] } with the posts this viewer may see. */
  thread: CmThread;
  people: Record<string, CmPerson>;
  me: string;
  staff: boolean;
  backHref: string;
  onReply: (body: string) => Promise<unknown>;
  onEdit: (postId: CmPost['id'], body: string) => unknown;
  onDelete: (postId: CmPost['id']) => unknown;
  onHidePost: (postId: CmPost['id']) => unknown;
  onPin: () => unknown;
  onHideThread: () => unknown;
  /** C-22: an edit, delete, hide or pin that didn't go through, in the reply box's message slot. */
  notice?: string;
}

/** thread: { id, space, spaceLabel, title, pinned, hidden, posts[] } with the posts this viewer may see. */
export function ThreadPage({ ui, thread: t, people, me, staff, backHref, onReply, onEdit, onDelete, onHidePost, onPin, onHideThread, notice }: ThreadPageProps) {
  const [edit, setEdit] = useState<CmPost['id'] | null>(null), [ask, setAsk] = useState<CmPost['id'] | null>(null), [text, setText] = useState(''), [err, setErr] = useState(false), [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState('');
  const ta = useRef<HTMLTextAreaElement | null>(null), rs = t.posts.slice(1), last = rs[rs.length - 1], a = people[t.posts[0]!.by]!;
  const act = (d: PostAct, x: CmPost, value?: string) => {
    if (d === 'edit') { setEdit(x.id); setAsk(null); } else if (d === 'cancel') { setEdit(null); setAsk(null); }
    else if (d === 'save') { const v = (value || '').trim(); if (!v) return; setEdit(null); onEdit(x.id, v); }
    else if (d === 'delete') { setAsk(x.id); setEdit(null); } else if (d === 'hide') onHidePost(x.id);
    else if (d === 'delete-yes') { setAsk(null); onDelete(x.id); }
  };
  const reply = async () => {
    if (busy) return; const v = text.trim();
    if (!v) { setRefused(''); setErr(true); ta.current?.focus(); return; }
    setErr(false); setBusy(true);
    // C-22: the server's refusal (the hourly limit, a thread that's gone, a failed save) where "Write a reply first." goes.
    try { await onReply(v); } catch (e) { setRefused(e instanceof Error ? e.message : String(e)); setErr(true); setBusy(false); return; }
    setText(''); setBusy(false);
  };
  const post = (x: CmPost, first: boolean) => <Post key={x.id} ui={ui} x={x} first={first} people={people} me={me} staff={staff} edit={edit === x.id} ask={ask === x.id} act={act} />;
  return (
    <div data-ai="thread" data-thread-page="" id="view-thread">
      <IconSprite />
      <div className="wk-page">
        <nav className="wk-crumbs aim-rise" style={{ '--i': 0 } as MotionStyle} aria-label="Back"><a href={backHref} onClick={stop(backHref)}>{ui.back}</a><span aria-hidden="true">/</span><span>{t.spaceLabel}</span></nav>
        <header className="cm-thead aim-rise" style={{ '--i': 0 } as MotionStyle}><h1 className="cm-h1" id="cm-title">{t.title}</h1><div className="cm-tags" id="cm-tags"><Tags ui={ui} t={t} /></div></header>
        <div className="cm-layout">
          <div className="cm-main">
            <section className="wk-card aim-rise" style={{ '--i': 1 } as MotionStyle} id="cm-first">{post(t.posts[0]!, true)}</section>
            <section className="wk-card aim-rise" style={{ '--i': 2 } as MotionStyle} id="cm-replies" hidden={!rs.length}>
              {rs.length > 0 && <><div className="wk-card-h"><h2 className="wk-h3">{repliesText(ui, rs.length)}</h2></div>{rs.map((x) => post(x, false))}</>}
            </section>
            <section className="wk-card aim-rise" style={{ '--i': 3 } as MotionStyle} aria-labelledby="cm-reply-h">
              <div className="wk-card-h"><h2 className="wk-h3" id="cm-reply-h">{ui.reply}</h2></div>
              <div className="cm-reply fm-field" id="cm-replybox" data-state={err ? 'error' : undefined}>
                <textarea className="fm-input" rows={3} placeholder={ui.replyHint} aria-labelledby="cm-reply-h" ref={ta} value={text} onChange={(e) => { setText(e.target.value); setErr(false); }} />
                <div className="cm-reply-f"><span>{ui.replyReads}</span><AsyncBtn cls="wk-btn-primary" state={busy ? 'busy' : 'idle'} label={ui.postReply} done={ui.posted} onClick={reply} /></div>
                {err ? <p className="fm-msg">{refused || ui.needReply}</p> : notice ? <p className="fm-msg">{notice}</p> : null}
              </div>
            </section>
          </div>
          <aside className="cm-rail aim-rise" style={{ '--i': 2 } as MotionStyle}>
            <section className="wk-card"><div className="wk-card-h"><h2 className="wk-h3">{ui.about}</h2></div>
              <div className="cm-kv" id="cm-about"><p><b>{ui.space}</b>{` · ${t.spaceLabel}`}</p><p><b>{ui.startedBy}</b>{` · ${a.name}, ${a.staff ? ui.staff : a.team}`}</p><p><b>{ui.lastReply}</b>{` · ${last ? last.when : ui.noReplies}`}</p></div></section>
            {staff && (
              <section className="wk-card" id="cm-staffcard"><div className="wk-card-h"><h2 className="wk-h3">{ui.staffOnly}</h2><small>{ui.staffSee}</small></div>
                <div className="cm-staff" id="cm-staff">
                  <button className="wk-btn wk-btn-secondary wk-btn-sm" type="button" data-do="pin" onClick={onPin}><Icon name="pin" /><RollLabel>{t.pinned ? ui.unpin : ui.pin}</RollLabel></button>
                  <button className="wk-btn wk-btn-secondary wk-btn-sm" type="button" data-do="hide-thread" onClick={onHideThread}><RollLabel>{t.hidden ? ui.showThread : ui.hideThread}</RollLabel></button>
                </div></section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export interface StartThreadDrawerProps {
  ui: CommunityUi;
  spaces: CmSpace[];
  space: string;
  me: CmPerson;
  open: boolean;
  onClose: () => void;
  /** → Promise<id> */
  onPost: (input: { space: string; title: string; body: string }) => Promise<CmThread['id']>;
  /** Runs 700 ms after the button shows Posted. */
  onPosted: (id: CmThread['id']) => void;
}

/** onPost({ space, title, body }) → Promise<id>; onPosted(id) runs 700 ms after the button shows Posted. */
export function StartThreadDrawer({ ui, spaces, space, me, open, onClose, onPost, onPosted }: StartThreadDrawerProps) {
  const [sp, setSp] = useState(''), [title, setTitle] = useState(''), [body, setBody] = useState(''), [errs, setErrs] = useState<Partial<Record<'space' | 'title' | 'details', string>>>({}), [state, setState] = useState<AsyncState>('idle');
  const host = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (open) { setSp(space === 'all' ? '' : space); setTitle(''); setBody(''); setErrs({}); setState('idle'); } }, [open]);   // a fresh form each time it opens
  const clear = (k: 'space' | 'title' | 'details') => setErrs((e) => { const n = { ...e }; delete n[k]; return n; });
  const post = async () => {
    if (state === 'busy' || state === 'done') return;
    const t = title.replace(/\s+/g, ' ').trim(), b = body.trim();
    const bad = { ...(!sp && { space: ui.needSpace }), ...(t.length < 3 && { title: ui.needTitle }), ...(!b && { details: ui.needDetails }) };
    setErrs(bad);
    const first = (['space', 'title', 'details'] as const).find((k) => bad[k]);
    if (first) { setState('error'); host.current?.querySelector<HTMLElement>(`[data-field="${first}"] :is(input,textarea)`)?.focus(); return; }
    setState('busy');
    let id: CmThread['id'];
    try { id = await onPost({ space: sp, title: t, body: b }); } catch (e) {
      // C-22: the server's refusal, under the field it names (its own three checks), else under Details.
      const named = (e as { errors?: Partial<Record<'space' | 'title' | 'details', string>> }).errors;
      setErrs(named && Object.keys(named).length ? named : { details: e instanceof Error ? e.message : String(e) });
      setState('error'); return;
    }
    setState('done'); setTimeout(() => onPosted(id), 700);
  };
  const f = (k: 'space' | 'title' | 'details') => ({ 'data-field': k, 'data-state': errs[k] ? 'error' : undefined });
  return (
    <div data-ai="compose" id="cm-host" data-drawer={open ? 'open' : undefined} ref={host}>
      <Drawer open={open} onClose={onClose} label={ui.start} className="fm-drawer cm-drawer">
        <header className="fm-head aim-in" style={{ '--i': 0 } as MotionStyle}><div><p className="fm-kick">{ui.title}</p><h2 className="fm-title">{ui.start}</h2><p className="fm-sub">{ui.cohortReads}</p></div><button className="fm-close" type="button" onClick={onClose}>Close</button></header>
        <form className="fm-body" noValidate onSubmit={(e) => e.preventDefault()}>
          <section className="fm-sec aim-in" style={{ '--i': 1 } as MotionStyle}>
            <div className="fm-field" {...f('space')} role="radiogroup" aria-labelledby="cm-f-space"><p className="fm-label" id="cm-f-space">{ui.space}</p>
              <div className="fm-opts">{spaces.map((x) => <label className="fm-chip" key={x.id}><input type="radio" name="cm-new-space" value={x.id} checked={sp === x.id} onChange={() => { setSp(x.id); clear('space'); }} />{x.label}</label>)}</div>
              {errs.space && <p className="fm-msg">{errs.space}</p>}</div>
            <div className="fm-field" {...f('title')}><label className="fm-label" htmlFor="cm-f-title">{ui.threadTitle}</label><p className="fm-hint">{ui.titleHint}</p>
              <input className="fm-input" id="cm-f-title" type="text" maxLength={140} value={title} onChange={(e) => { setTitle(e.target.value); clear('title'); }} />{errs.title && <p className="fm-msg">{errs.title}</p>}</div>
            <div className="fm-field" {...f('details')}><label className="fm-label" htmlFor="cm-f-details">{ui.details}</label><p className="fm-hint">{ui.detailsHint}</p>
              <textarea className="fm-input" id="cm-f-details" rows={6} maxLength={4000} value={body} onChange={(e) => { setBody(e.target.value); clear('details'); }} />{errs.details && <p className="fm-msg">{errs.details}</p>}</div>
          </section>
        </form>
        <footer className="fm-foot aim-in" style={{ '--i': 2 } as MotionStyle}><p className="cm-as">{`${ui.postingAs} ${me.name} · ${me.staff ? ui.staff : me.team}`}</p><AsyncBtn cls="wk-btn-primary" state={state} label={ui.postThread} done={ui.posted} onClick={post} /></footer>
      </Drawer>
    </div>
  );
}
