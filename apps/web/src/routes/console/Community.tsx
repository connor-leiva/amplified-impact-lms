import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useNavigate, useParams } from 'react-router';
import { COMMUNITY_ERRORS } from '@ai/core/community';
import { Button } from '../../components/r2/Button';
import type { MenuEntry } from '../../components/r2/Menu';
import { Modal } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Facts, Find, PageHead, Pill, Sel, Skel, Tabs, TextArea, Two, k } from '../../components/r2/kit';
import { useToaster } from '../../components/primitives/Toaster';
import { COMMUNITY_CHANGED, ConsoleError } from '../../data/console';
import { cohortLabel } from '../../data/admin-shell';
import { useDb, useNow } from '../../data/hooks';
import { useAdminChrome } from '../../shell/admin/chrome';
import { useViewportWidth } from '../../shell/hooks';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useConsoleRecord } from './useConsoleData';
import {
  COMMUNITY_COPY as C,
  COMMUNITY_TABS,
  COMMUNITY_WRITE_CAP,
  communityCounts,
  communityRows,
  filterCommunity,
  threadHref,
} from './community.vm';
import type { CommunityRowVM, CommunityTab } from './community.vm';
import type { CommunityList } from '@ai/core/community';
import s from './Community.module.css';

// /admin/community (D-238, B-45): the handoff mockup's `Community()`. The cohort's threads for staff: the facts, the
// tabs (All, Waiting on you, Pinned, Hidden), find and space, a row's Pin and Hide, and Start a thread. It reads and
// writes through the Community's own routes (D-231) with the staff session; the server audits pin, hide and delete.
// Every write is the mockup's `guard('account', …)`; a refusal is the server's own sentence, in the error toast.

/** The thread's state as the mockup's `ThreadPills`: Pinned, Hidden, Waiting on you. */
export function ThreadPills({ pinned, hidden, waiting }: { pinned: boolean; hidden: boolean; waiting: boolean }) {
  return (
    <span className={k.row} style={{ gap: 6 }}>
      {pinned ? <Pill tone="info">{C.pills.pinned}</Pill> : null}
      {hidden ? <Pill tone="warn">{C.pills.hidden}</Pill> : null}
      {waiting ? <Pill tone="neutral">{C.pills.waiting}</Pill> : null}
    </span>
  );
}

const NO_DRAFT = { space: 'general', title: '', body: '' };
type Field = 'space' | 'title' | 'details';
/** The server's sentences for a new thread, by the field each is about (the API answers one at a time). */
const FIELD_OF: Record<string, Field> = {
  [COMMUNITY_ERRORS.needSpace]: 'space',
  [COMMUNITY_ERRORS.needTitle]: 'title',
  [COMMUNITY_ERRORS.needDetails]: 'details',
};

export function Component() {
  // D-253: Cohort › Community (`/admin/cohort/:cohortId/community`). The threads are the Community's (D-231). R-5 audit
  // (D-267): the cohort in the address's own threads, its waiting count and its people, and a thread started here is
  // that cohort's.
  const { cohortId = '' } = useParams();
  const gate = useConsoleGate('community');
  const navigate = useNavigate();
  const db = useDb();
  const cohort = db.cohorts.find((c) => c.id === cohortId) ?? null;
  const now = useNow();
  const { toast } = useAdminChrome();
  const toaster = useToaster();
  const phone = useViewportWidth() < 768;
  const api = gate.kind === 'ready' ? gate.api : null;
  const [reads, setReads] = useState(0);
  // R-5 audit (D-267): this cohort's threads (`?cohort=`), and its people in the facts.
  const rec = useConsoleRecord(api, (a) => a.community(cohortId), `${cohortId}:${reads}`);
  const [tab, setTab] = useState<CommunityTab>('all');
  const [space, setSpace] = useState('');
  const [q, setQ] = useState('');
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState(NO_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);

  // A write reads the list again: the last list stays on screen until the new one lands, so nothing flashes.
  const kept = useRef<CommunityList | null>(null);
  if (rec.data) kept.current = rec.data;
  const list = rec.data ?? kept.current;
  const rows = useMemo(() => (list ? communityRows(list, now, cohortId) : []), [list, now, cohortId]);
  const counts = useMemo(() => communityCounts(rows), [rows]);
  const shown = useMemo(() => filterCommunity(rows, tab, space, q), [rows, tab, space, q]);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;

  const role = gate.kind === 'ready' ? (gate.me.role ?? '') : '';
  const canWrite = gate.kind === 'ready' && gate.me.caps.includes(COMMUNITY_WRITE_CAP);
  const meName = gate.kind === 'ready' && list ? (list.people[list.me]?.name ?? '') : '';
  /** The mockup's `guard('account', label, fn)`. */
  const guarded = (label: string, go: () => void) => (canWrite ? go() : toast(C.guard(role, label)));
  const changed = () => {
    setReads((n) => n + 1);
    window.dispatchEvent(new Event(COMMUNITY_CHANGED));
  };
  const failed = (e: unknown) => toaster.toast(e instanceof ConsoleError ? e.message : COMMUNITY_ERRORS.saveFailed, 'warn');
  const setThread = (r: CommunityRowVM, change: { pinned: boolean } | { hidden: boolean }, done: string) =>
    api?.setThread(r.id, change).then(() => {
      toast(done);
      changed();
    }, failed);
  const pin = (r: CommunityRowVM) =>
    guarded(r.pinned ? C.guards.unpin : C.guards.pin, () => void setThread(r, { pinned: !r.pinned }, r.pinned ? C.toast.unpinned : C.toast.pinned));
  const hide = (r: CommunityRowVM) =>
    guarded(r.hidden ? C.guards.show : C.guards.hide, () => void setThread(r, { hidden: !r.hidden }, r.hidden ? C.toast.shown : C.toast.hidden));
  const close = () => {
    setCompose(false);
    setDraft(NO_DRAFT);
    setErrors({});
  };
  const post = () =>
    guarded(C.guards.start, () => {
      if (!api || busy) return;
      setBusy(true);
      api
        .startThread({ space: draft.space, title: draft.title.trim(), body: draft.body.trim() }, cohortId)
        .then(
          ({ id }) => {
            close();
            toast(C.toast.posted);
            window.dispatchEvent(new Event(COMMUNITY_CHANGED));
            navigate(threadHref(cohortId, id));
          },
          (e: unknown) => {
            const field = e instanceof ConsoleError ? FIELD_OF[e.message] : undefined;
            if (field) setErrors({ [field]: (e as ConsoleError).message });
            else failed(e);
          },
        )
        .finally(() => setBusy(false));
    });

  const spaces = list?.spaces ?? [];
  const cols: Column<CommunityRowVM>[] = [
    {
      key: 'title',
      label: C.columns.thread,
      width: 'minmax(260px,2.2fr)',
      noSort: true,
      value: (r) => r.title,
      cell: (r) => (
        <div className={clsx(k.col, k.col0)} style={{ minWidth: 0 }}>
          <span className={clsx(k.w5, k.el)}>{r.title}</span>
          <span className={clsx(k.me, k.el)}>{r.excerpt}</span>
        </div>
      ),
    },
    { key: 'space', label: C.columns.space, width: '150px', hideLap: true, value: (r) => r.space, cell: (r) => <Pill tone="neutral">{r.space}</Pill> },
    { key: 'by', label: C.columns.by, width: 'minmax(140px,1fr)', hideLap: true, value: (r) => r.by.name, cell: (r) => <Two a={r.by.name} b={r.by.team} /> },
    { key: 'n', label: C.columns.replies, width: '64px', value: (r) => r.replies, cell: (r) => <span className={k.tn}>{r.replies}</span> },
    { key: 'activity', label: C.columns.activity, width: '112px', noSort: true, value: (r) => r.activity },
    { key: 'st', label: '', width: '190px', noSort: true, value: () => '', cell: (r) => <ThreadPills pinned={r.pinned} hidden={r.hidden} waiting={r.waiting} /> },
  ];
  const menu = (r: CommunityRowVM): MenuEntry[] => [
    { label: C.menu.open, onSelect: () => navigate(r.href) },
    'separator',
    { label: r.pinned ? C.menu.unpin : C.menu.pin, onSelect: () => pin(r) },
    { label: r.hidden ? C.menu.show : C.menu.hide, onSelect: () => hide(r) },
  ];
  const empty = tab === 'waiting' ? C.empty.waiting : C.empty.other;

  return (
    <Page>
      <PageHead
        title={C.title}
        description={C.description(cohort ? cohortLabel(cohort) : '')}
        right={
          <Button
            header
            kind="primary"
            icon={canWrite ? 'r2Plus' : 'r2Lock'}
            title={canWrite ? undefined : C.locked}
            onClick={() => guarded(C.guards.start, () => setCompose(true))}
          >
            {C.start}
          </Button>
        }
      />
      {gate.kind === 'error' ? (
        <LoadError failure={gate.failure} retry={gate.retry} />
      ) : rec.status === 'error' && rec.failure ? (
        <LoadError failure={rec.failure} retry={rec.retry} />
      ) : (
        <>
          {list ? (
            <Facts
              items={[
                { label: C.facts.threads, value: String(counts.threads) },
                { label: C.facts.waiting, value: <span className={k.w5}>{counts.waiting}</span> },
                { label: C.facts.pinned, value: String(counts.pinned) },
                { label: C.facts.hidden, value: String(counts.hidden) },
                { label: C.facts.members, value: list.members ? C.members(list.members) : '' },
              ]}
            />
          ) : (
            <Skel lines={3} />
          )}
          <Tabs
            label={C.tabsLabel}
            phone={phone}
            value={tab}
            onChange={setTab}
            tabs={COMMUNITY_TABS.map((t) => ({ id: t, label: C.tabs[t], count: t === 'all' ? counts.all : counts[t] }))}
          />
          <div className={k.row}>
            <Find value={q} onChange={setQ} placeholder={C.find} />
            <Sel aria-label={C.space} value={space} onChange={(e) => setSpace(e.target.value)}>
              <option value="">{C.allSpaces}</option>
              {spaces.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.label}
                </option>
              ))}
            </Sel>
          </div>
          <Table
            label={C.title}
            cols={cols}
            rows={shown}
            rowKey={(r) => r.key}
            loading={!list && (rec.status === 'loading' || gate.kind === 'loading')}
            onRow={(r) => navigate(r.href)}
            menu={menu}
            empty={{ icon: 'r2File', title: empty.title, body: empty.body }}
          />
        </>
      )}
      {compose ? (
        <Modal
          title={C.compose.title}
          width={560}
          onClose={close}
          foot={
            <>
              <Button onClick={close}>{C.compose.cancel}</Button>
              <Button kind="primary" disabled={!draft.title.trim() || !draft.body.trim() || busy} onClick={post}>
                {C.compose.post}
              </Button>
            </>
          }
        >
          <label className={s.lab}>
            {C.compose.space}
            <Sel value={draft.space} onChange={(e) => setDraft({ ...draft, space: e.target.value })} aria-invalid={errors.space ? true : undefined}>
              {spaces.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.label}
                </option>
              ))}
            </Sel>
            {errors.space ? <span className={s.err}>{errors.space}</span> : null}
          </label>
          <label className={s.lab}>
            {C.compose.titleLabel}
            <input
              className={k.in}
              maxLength={140}
              value={draft.title}
              placeholder={C.compose.titlePlaceholder}
              aria-invalid={errors.title ? true : undefined}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            {errors.title ? <span className={s.err}>{errors.title}</span> : null}
          </label>
          <label className={s.lab}>
            {C.compose.details}
            <TextArea
              rows={5}
              maxLength={4000}
              value={draft.body}
              aria-invalid={errors.details ? true : undefined}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            {errors.details ? <span className={s.err}>{errors.details}</span> : null}
          </label>
          <p className={clsx(k.p, k.me)}>{C.compose.note(meName)}</p>
        </Modal>
      ) : null}
    </Page>
  );
}

export default Component;
