// /learn/community and /learn/community/:id (D-231): the cohort Community, the mockup's pages
// (`lms-v3/Community.tsx`) fed by `GET /api/community` and `GET /api/community/:id` (`lms-v3/community.vm.ts`).
//
// For a learner v3 draws for, and for staff (`communityFor`); anyone else goes Home, as the address did before. Every
// change goes to the API, and the page draws what the next read returns; an edit, a hide, a pin and a delete show at
// once and are put back if the server refuses. Nothing is emailed and nothing notifies anyone.
//
// C-22's states, each in a slot the mockup has: a list or a thread that can't load, a thread that's gone and a viewer
// who isn't in the cohort say so in the list's empty slot (`.cm-empty`); a refused thread under its field in the
// drawer; a refused reply under the reply box; a refused edit, hide, pin or delete in the reply box's message slot.
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { learnerOf } from '@ai/core/learner';
import {
  COMMUNITY_ERRORS,
  COMMUNITY_PATH,
  communityPostDeletePath,
  communityPostPath,
  communityRepliesPath,
  communityThreadPath,
} from '@ai/core/community';
import type { CommunityList, CommunityThread } from '@ai/core/community';
import { useLearn } from './data';
import { learnHome } from './routes';
import { CommunityPage, StartThreadDrawer, ThreadPage } from './lms-v3/Community';
import { COMMUNITY_KEY, send, threadKey, useCommunityList, useCommunityThread } from './lms-v3/community.data';
import type { CommunityLoad } from './lms-v3/community.data';
import { COMMUNITY_UI, learnCommunityThread, listMessage, peopleProps, threadProps, threadRows } from './lms-v3/community.vm';
import { learnCommunity } from './lms-v3/shell.vm';
import { communityFor } from './lms-v3/v3';

/** C-22: the words for a read that didn't come back. */
const messageOf = (load: Exclude<CommunityLoad<unknown>, { kind: 'loading' | 'ready' }>): string =>
  load.kind === 'missing' ? COMMUNITY_ERRORS.missing : load.kind === 'not-member' ? COMMUNITY_ERRORS.notMember : COMMUNITY_ERRORS.loadFailed;

/** The list's page with a message in its empty slot, and nothing else to draw. */
function Unavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <CommunityPage ui={listMessage(COMMUNITY_UI, message)} spaces={[]} space="all" onSpace={onRetry} threads={[]} people={{}} onStart={onRetry} />;
}

function List({ now }: { now: number }) {
  const load = useCommunityList();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [space, setSpace] = useState('all');
  const [composing, setComposing] = useState(false);
  const retry = () => void qc.invalidateQueries({ queryKey: COMMUNITY_KEY });
  if (load.kind === 'loading') return null;
  if (load.kind !== 'ready') return <Unavailable message={messageOf(load)} onRetry={retry} />;
  const data = load.data;
  const people = peopleProps(data.people);
  return (
    <>
      <CommunityPage ui={COMMUNITY_UI} spaces={data.spaces} space={space} onSpace={setSpace} threads={threadRows(data, space, now)} people={people} onStart={() => setComposing(true)} />
      <StartThreadDrawer
        ui={COMMUNITY_UI}
        spaces={data.spaces}
        space={space}
        me={people[data.me] ?? { name: '', team: '', initials: '' }}
        open={composing}
        onClose={() => setComposing(false)}
        onPost={async (input) => {
          const { id } = await send<{ id: number }>('POST', COMMUNITY_PATH, input);
          void qc.invalidateQueries({ queryKey: COMMUNITY_KEY });
          return id;
        }}
        onPosted={(id) => {
          setComposing(false);
          navigate(learnCommunityThread(id));
        }}
      />
    </>
  );
}

function Thread({ id, now }: { id: string; now: number }) {
  const load = useCommunityThread(id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [fresh, setFresh] = useState<ReadonlySet<number | string>>(new Set());
  const [notice, setNotice] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: COMMUNITY_KEY });
  if (load.kind === 'loading') return null;
  if (load.kind !== 'ready') return <Unavailable message={messageOf(load)} onRetry={() => navigate(learnCommunity())} />;
  const data = load.data;
  const t = data.thread;
  // An edit, a hide or a pin shows at once (as the mockup's does); the next read has the last word, and a refusal says
  // why where the reply box's message goes.
  const change = (fn: (x: CommunityThread['thread']) => CommunityThread['thread'], write: () => Promise<unknown>) => {
    setNotice('');
    qc.setQueryData<CommunityLoad<CommunityThread>>(threadKey(id), (old) => (old?.kind === 'ready' ? { kind: 'ready', data: { ...old.data, thread: fn(old.data.thread) } } : old));
    write().then(
      () => void refresh(),
      (e: unknown) => {
        setNotice(e instanceof Error ? e.message : COMMUNITY_ERRORS.saveFailed);
        void refresh();
      },
    );
  };
  const post = (postId: number | string, fn: (p: CommunityThread['thread']['posts'][number]) => CommunityThread['thread']['posts'][number] | null) =>
    (x: CommunityThread['thread']) => ({ ...x, posts: x.posts.flatMap((p) => (p.id === postId ? (fn(p) ?? []) : [p])) });
  return (
    <ThreadPage
      ui={COMMUNITY_UI}
      thread={threadProps(data, now, fresh)}
      people={peopleProps(data.people)}
      me={data.me}
      staff={data.staff}
      backHref={learnCommunity()}
      notice={notice}
      onReply={async (body) => {
        setNotice('');
        const r = await send<{ id: number }>('POST', communityRepliesPath(t.id), { body });
        setFresh((f) => new Set([...f, r.id]));
        await refresh();
      }}
      onEdit={(postId, body) => change(post(postId, (p) => ({ ...p, body, edited: true })), () => send('PATCH', communityPostPath(postId), { body }))}
      onHidePost={(postId) => {
        const hidden = !t.posts.find((p) => p.id === postId)?.hidden;
        change(post(postId, (p) => ({ ...p, hidden })), () => send('PATCH', communityPostPath(postId), { hidden }));
      }}
      onDelete={(postId) => {
        // The first post is the thread: it goes, with its replies, and the list opens (the mockup's).
        if (t.posts[0]?.id === postId) {
          setNotice('');
          send('POST', communityPostDeletePath(postId), {}).then(
            () => {
              // The list drops it before it opens, so it never shows there while the next read comes.
              qc.setQueryData<CommunityLoad<CommunityList>>(COMMUNITY_KEY, (old) =>
                old?.kind === 'ready' ? { kind: 'ready', data: { ...old.data, threads: old.data.threads.filter((x) => x.id !== t.id) } } : old,
              );
              navigate(learnCommunity());
              void refresh();
            },
            (e: unknown) => setNotice(e instanceof Error ? e.message : COMMUNITY_ERRORS.saveFailed),
          );
          return;
        }
        change(post(postId, () => null), () => send('POST', communityPostDeletePath(postId), {}));
      }}
      onPin={() => change((x) => ({ ...x, pinned: !t.pinned }), () => send('PATCH', communityThreadPath(t.id), { pinned: !t.pinned }))}
      onHideThread={() => change((x) => ({ ...x, hidden: !t.hidden }), () => send('PATCH', communityThreadPath(t.id), { hidden: !t.hidden }))}
    />
  );
}

export function Component() {
  const { db, viewer, now } = useLearn();
  const { id } = useParams();
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  if (!communityFor(viewer, me)) return <Navigate to={learnHome()} replace />;
  return id ? <Thread key={id} id={id} now={now} /> : <List now={now} />;
}

export default Component;
