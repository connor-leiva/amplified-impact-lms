import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useNavigate, useParams } from 'react-router';
import { COMMUNITY_ERRORS } from '@ai/core/community';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Menu } from '../../components/r2/Menu';
import type { MenuEntry } from '../../components/r2/Menu';
import { Confirm } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Avatar, KV, PageHead, Pill, TextArea, k } from '../../components/r2/kit';
import { Icon } from '../../components/Icon';
import { useToaster } from '../../components/primitives/Toaster';
import { COMMUNITY_CHANGED, ConsoleError } from '../../data/console';
import { useNow } from '../../data/hooks';
import { useAdminChrome, useRecordCrumb } from '../../shell/admin/chrome';
import { ThreadPills } from './Community';
import { Denied, NotFound } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsoleRecord } from './useConsoleData';
import { COMMUNITY_COPY, COMMUNITY_HOME, COMMUNITY_WRITE_CAP, communityThreadVM, whoOf } from './community.vm';
import type { PostVM, WhoVM } from './community.vm';
import type { CommunityThread } from '@ai/core/community';
import s from './Community.module.css';

// /admin/community/:id (D-238, B-45): the handoff mockup's `CommunityThread()`. Every post, hidden ones marked; Reply
// as staff; Pin to the top or Unpin, Hide from the cohort or Show to the cohort; Hide and Delete on a post, Delete
// behind the admin's confirm; About this thread. Through the Community's own routes, each write the mockup's
// `guard('account', …)`, its refusal the server's own sentence.

const C = COMMUNITY_COPY;
const T = COMMUNITY_COPY.thread;

/** The mockup's `Who`: the avatar, the name with the Staff tag, and "team · when". */
function Who({ who, when }: { who: WhoVM; when?: string }) {
  return (
    <div className={clsx(k.row, k.nw)} style={{ gap: 10, minWidth: 0 }}>
      <Avatar initials={who.initials} />
      <div className={clsx(k.col, k.col0)} style={{ minWidth: 0 }}>
        <span className={clsx(k.row, k.nw)} style={{ gap: 6 }}>
          <span className={clsx(k.w5, k.el)}>{who.name}</span>
          {who.staff ? <Pill tone="ok">{C.pills.staff}</Pill> : null}
        </span>
        <span className={clsx(k.me, k.el)}>{who.team + (when ? ` · ${when}` : '')}</span>
      </div>
    </div>
  );
}

type Asking = { post: PostVM } | null;

export function Component() {
  const { id = '' } = useParams();
  const gate = useConsoleGate('community');
  const navigate = useNavigate();
  const now = useNow();
  const { toast } = useAdminChrome();
  const toaster = useToaster();
  const api = gate.kind === 'ready' ? gate.api : null;
  const [reads, setReads] = useState(0);
  const rec = useConsoleRecord(api, (a) => a.communityThread(id), `${id}:${reads}`);
  // A write reads the thread again: the last one stays on screen (for this thread) until the new one lands.
  const kept = useRef<CommunityThread | null>(null);
  if (rec.data) kept.current = rec.data;
  const data = rec.data ?? (kept.current && String(kept.current.thread.id) === id ? kept.current : null);
  const vm = useMemo(() => (data ? communityThreadVM(data, now) : null), [data, now]);
  const [body, setBody] = useState('');
  const [replyError, setReplyError] = useState('');
  const [asking, setAsking] = useState<Asking>(null);
  const [busy, setBusy] = useState(false);
  useRecordCrumb(vm?.title ?? null);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;
  if (rec.status === 'error' && rec.failure === 'not_found') return <NotFound />;
  if (gate.kind === 'error')
    return (
      <Page>
        <LoadError failure={gate.failure} retry={gate.retry} />
      </Page>
    );
  if (rec.status === 'error' && rec.failure)
    return (
      <Page>
        <LoadError failure={rec.failure} retry={rec.retry} />
      </Page>
    );
  if (!vm || !data || gate.kind !== 'ready')
    return (
      <Page>
        <div role="status" aria-busy="true" aria-label="Loading" />
      </Page>
    );

  const role = gate.me.role ?? '';
  const canWrite = gate.me.caps.includes(COMMUNITY_WRITE_CAP);
  const me = whoOf(data.people, data.me);
  const guarded = (label: string, go: () => void) => (canWrite ? go() : toast(C.guard(role, label)));
  const changed = () => {
    setReads((n) => n + 1);
    window.dispatchEvent(new Event(COMMUNITY_CHANGED));
  };
  const failed = (e: unknown) => toaster.toast(e instanceof ConsoleError ? e.message : COMMUNITY_ERRORS.saveFailed, 'warn');
  const done = (words: string) => () => {
    toast(words);
    changed();
  };

  const pin = () =>
    guarded(vm.pinned ? C.guards.unpin : C.guards.pin, () =>
      void gate.api.setThread(vm.id, { pinned: !vm.pinned }).then(done(vm.pinned ? C.toast.unpinned : C.toast.pinned), failed),
    );
  const hide = () =>
    guarded(vm.hidden ? C.guards.show : C.guards.hide, () =>
      void gate.api.setThread(vm.id, { hidden: !vm.hidden }).then(done(vm.hidden ? C.toast.shown : C.toast.hidden), failed),
    );
  const hidePost = (p: PostVM) =>
    guarded(p.hidden ? C.guards.showReply : C.guards.hideReply, () =>
      void gate.api.setPost(p.id, { hidden: !p.hidden }).then(done(p.hidden ? C.toast.replyShown : C.toast.replyHidden), failed),
    );
  const del = (p: PostVM) => guarded(C.guards.delete, () => setAsking({ post: p }));
  const confirmDelete = (p: PostVM) =>
    gate.api.deletePost(p.id).then(({ thread }) => {
      setAsking(null);
      if (thread) {
        toast(C.toast.threadDeleted);
        window.dispatchEvent(new Event(COMMUNITY_CHANGED));
        navigate(COMMUNITY_HOME);
      } else done(C.toast.replyDeleted)();
    }, (e: unknown) => {
      setAsking(null);
      failed(e);
    });
  const reply = () =>
    guarded(C.guards.reply, () => {
      if (busy) return;
      setBusy(true);
      setReplyError('');
      gate.api
        .replyThread(vm.id, body.trim())
        .then(
          () => {
            setBody('');
            done(C.toast.replied)();
          },
          (e: unknown) => {
            // The reply box's own check in its words, under the field; anything else in the error toast.
            if (e instanceof ConsoleError && e.message === COMMUNITY_ERRORS.needReply) setReplyError(e.message);
            else failed(e);
          },
        )
        .finally(() => setBusy(false));
    });

  const postMenu = (p: PostVM): MenuEntry[] => [
    ...(p.first ? [] : [{ label: p.hidden ? C.menu.show : C.menu.hide, onSelect: () => hidePost(p) }]),
    { label: p.first ? T.deleteThread : T.deleteReply, danger: true, onSelect: () => del(p) },
  ];
  const post = (p: PostVM) => (
    <div key={p.id} className={clsx(k.cd, s.post, (p.hidden || (p.first && vm.hidden)) && s.hiddenPost)}>
      <div className={clsx(k.row, k.nw)} style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Who who={p.who} when={p.when} />
        </div>
        {p.hidden ? <Pill tone="warn">{C.pills.hidden}</Pill> : null}
        <Menu
          label={T.more}
          placement="right"
          items={postMenu(p)}
          trigger={(t) => (
            <button type="button" className={k.ib} aria-label={T.more} onClick={t.toggle} {...t.props}>
              <Icon name="r2More" size={16} strokeWidth={2.6} />
            </button>
          )}
        />
      </div>
      <div className={s.body}>
        {p.paragraphs.map((x, i) => (
          <p key={i}>{x}</p>
        ))}
      </div>
    </div>
  );

  const first = vm.posts[0];
  return (
    <Page>
      <PageHead
        back={{ to: COMMUNITY_HOME, label: T.back }}
        title={vm.title}
        meta={
          <span className={k.row} style={{ gap: 6 }}>
            <Pill tone="neutral">{vm.space}</Pill>
            <ThreadPills pinned={vm.pinned} hidden={vm.hidden} waiting={vm.waiting} />
          </span>
        }
        right={
          <>
            <Button header onClick={pin}>
              {vm.pinned ? C.menu.unpin : C.menu.pin}
            </Button>
            <Button header onClick={hide}>
              {vm.hidden ? C.menu.show : C.menu.hide}
            </Button>
          </>
        }
      />
      <div className={k.gms}>
        <div className={clsx(k.col)}>
          {vm.hidden ? (
            <div className={clsx(k.note, k.row)}>
              <Icon name="r2Eye" size={16} strokeWidth={1.75} />
              <span>{T.hiddenNote}</span>
            </div>
          ) : null}
          {first ? post(first) : null}
          {vm.replies ? <span className={k.me}>{T.replies(vm.replies)}</span> : null}
          {vm.posts.slice(1).map(post)}
          <section className={clsx(k.cd, s.post)}>
            <Who who={me} />
            <TextArea
              rows={4}
              maxLength={4000}
              aria-label={T.replyLabel}
              aria-invalid={replyError ? true : undefined}
              value={body}
              placeholder={T.replyPlaceholder}
              onChange={(e) => setBody(e.target.value)}
            />
            {replyError ? <span className={s.err}>{replyError}</span> : null}
            <div className={k.row}>
              <Button kind="primary" disabled={!body.trim() || busy} onClick={reply}>
                {T.reply}
              </Button>
              <span className={k.me}>{T.replyNote}</span>
            </div>
          </section>
        </div>
        <div className={k.col}>
          <Card title={T.about}>
            <KV
              stacked
              rows={[
                { label: T.aboutRows.space, value: vm.space },
                {
                  label: T.aboutRows.by,
                  value: (
                    <span>
                      {vm.starter.name} <span className={k.me}>· {vm.starter.team}</span>
                    </span>
                  ),
                },
                { label: T.aboutRows.started, value: vm.started },
                { label: T.aboutRows.replies, value: String(vm.replies) },
                { label: T.aboutRows.activity, value: vm.activity },
                { label: T.aboutRows.sees, value: vm.sees },
              ]}
            />
          </Card>
          <Card title={T.cohort} sub={T.cohortSub}>
            <p className={clsx(k.p, k.s2)}>{T.cohortBody}</p>
          </Card>
        </div>
      </div>
      {asking ? (
        <Confirm
          title={asking.post.first ? T.confirm.threadTitle : T.confirm.replyTitle}
          body={asking.post.first ? T.confirm.thread(vm.replies) : T.confirm.reply(asking.post.who.name)}
          cta={T.confirm.cta}
          danger
          onClose={() => setAsking(null)}
          onConfirm={() => void confirmDelete(asking.post)}
        />
      ) : null}
    </Page>
  );
}

export default Component;
