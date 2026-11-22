/* =====================================================================================================
   NEW (Nov 21, 2026). Community, in the admin portal. Connor's account is a staff account: it opens the admin and
   nothing else, so this is where he reads the cohort's threads, replies as staff, pins, hides and deletes.
   The threads are the same made-up ones the learner mockup shows. Same primitives and CSS as the rest of this mockup.
   ===================================================================================================== */
const CME = 'cl';                                   /* the signed-in staff member */
const CMP = CM_DATA.people, CMS = CM_DATA.spaces;
let CMT = JSON.parse(JSON.stringify(CM_DATA.threads)), cmSeq = 900;
const spaceLabel = id => (CMS.find(s => s.id === id) || {}).label || id;
const lastPost = t => [...t.posts].reverse().find(p => !p.hidden) || t.posts[0];
const waiting = t => !t.hidden && !CMP[lastPost(t).by].staff;      /* the last word is a member's */
const Who = ({ id, when }) => { const p = CMP[id]; return <div className="row nw" style={{ gap: 10, minWidth: 0 }}><span className="av">{p.initials}</span><div className="col" style={{ gap: 0, minWidth: 0 }}><span className="row nw" style={{ gap: 6 }}><span className="w5 el">{p.name}</span>{p.staff && <Pill v="Staff" tone="ok" />}</span><span className="me el">{p.team}{when ? ' · ' + when : ''}</span></div></div>; };
const ThreadPills = ({ t }) => <span className="row" style={{ gap: 6 }}>{t.pinned && <Pill v="Pinned" tone="info" />}{t.hidden && <Pill v="Hidden" tone="warn" />}{waiting(t) && <Pill v="Waiting on you" tone="" />}</span>;
function useCm() { const [, bump] = useState(0); return fn => { fn(); bump(n => n + 1); }; }

function Community() {
  const { go, toast, guard, log } = useC();
  const act = useCm();
  const [tab, setTab] = useState('all'), [sp, setSp] = useState('All spaces'), [q, setQ] = useState(''), [compose, setCompose] = useState(false);
  const [d, setD] = useState({ space: 'general', title: '', body: '' });
  const F = { all: () => true, waiting, pinned: t => t.pinned, hidden: t => t.hidden };
  const rows = CMT.filter(t => F[tab](t) && (sp === 'All spaces' || spaceLabel(t.space) === sp) && (t.title + t.posts[0].body).toLowerCase().includes(q.toLowerCase()));
  const pin = t => guard('account', (t.pinned ? 'Unpin ' : 'Pin ') + 'a thread', () => act(() => { t.pinned = !t.pinned; log('community.pin', t.title, t.pinned ? 'Pinned.' : 'Unpinned.'); toast(t.pinned ? 'Pinned to the top for the cohort' : 'Unpinned'); }));
  const hide = t => guard('account', (t.hidden ? 'Show ' : 'Hide ') + 'a thread', () => act(() => { t.hidden = !t.hidden; log('community.hide', t.title, t.hidden ? 'Hidden from the cohort.' : 'Shown again.'); toast(t.hidden ? 'Hidden. Only staff can see it.' : 'The cohort can see it again'); }));
  const post = () => guard('account', 'Start a thread', () => act(() => { const id = ++cmSeq; CMT = [{ id, space: d.space, title: d.title.trim(), activity: 'just now', posts: [{ id: ++cmSeq, by: CME, when: 'Just now', body: d.body.trim() }] }, ...CMT]; setCompose(false); setD({ space: 'general', title: '', body: '' }); toast('Posted to the cohort as staff'); go('cthread', String(id)); }));
  return <div className="pg">
    <Head t="Community" d="The December 2026 Cohort's threads. You read, reply and moderate here, as staff. The cohort sees your posts with a Staff tag. Nothing is emailed." right={<GBtn k="p" ic="plus" perm="account" label="Start a thread" go={() => setCompose(true)}>Start a thread</GBtn>} />
    <Gate n={3}><Facts items={[['Threads', String(CMT.filter(t => !t.hidden).length)], ['Waiting on you', <span className="w5">{CMT.filter(waiting).length}</span>], ['Pinned', String(CMT.filter(t => t.pinned).length)], ['Hidden', String(CMT.filter(t => t.hidden).length)], ['Members', '148 in 7 teams']]} /></Gate>
    <Tabs v={tab} on={setTab} tabs={[['all', 'All', CMT.length], ['waiting', 'Waiting on you', CMT.filter(waiting).length], ['pinned', 'Pinned', CMT.filter(t => t.pinned).length], ['hidden', 'Hidden', CMT.filter(t => t.hidden).length]]} />
    <div className="row"><Find v={q} on={setQ} ph="Find a thread" /><Sel label="Space" v={sp} on={setSp} opts={['All spaces', ...CMS.map(s => s.label)]} /></div>
    <Table rows={rows} onRow={t => go('cthread', String(t.id))} empty={{ ic: 'file', t: tab === 'waiting' ? 'Nothing is waiting on you' : 'No threads here', b: tab === 'waiting' ? 'Every thread ends with a reply from staff.' : 'Change the filters, or start one.' }}
      cols={[{ k: 'title', l: 'Thread', w: 'minmax(260px,2.2fr)', ns: 1, r: t => <div className="col" style={{ gap: 0, minWidth: 0 }}><span className="w5 el">{t.title}</span><span className="me el">{t.posts[0].body.replace(/\s+/g, ' ')}</span></div> },
        { k: 'space', l: 'Space', w: '150px', hide: 'lap', r: t => <Pill v={spaceLabel(t.space)} tone="" /> },
        { k: 'by', l: 'Started by', w: 'minmax(140px,1fr)', hide: 'lap', r: t => <Two a={CMP[t.posts[0].by].name} b={CMP[t.posts[0].by].team} /> },
        { k: 'n', l: 'Replies', w: '64px', r: t => <span className="tn">{t.posts.length - 1}</span> },
        { k: 'activity', l: 'Last activity', w: '112px', ns: 1 },
        { k: 'st', l: '', w: '190px', ns: 1, r: t => <ThreadPills t={t} /> }]}
      menu={t => [{ l: 'Open thread', fn: () => go('cthread', String(t.id)) }, '-', { l: t.pinned ? 'Unpin' : 'Pin to the top', g: 1, fn: () => pin(t) }, { l: t.hidden ? 'Show to the cohort' : 'Hide from the cohort', g: 1, fn: () => hide(t) }]} />
    {compose && <Modal title="Start a thread" w={560} onClose={() => setCompose(false)} foot={<><Btn onClick={() => setCompose(false)}>Cancel</Btn><Btn k="p" disabled={!d.title.trim() || !d.body.trim()} onClick={post}>Post thread</Btn></>}>
      <label className="lab">Space<select className="in" value={d.space} onChange={e => setD({ ...d, space: e.target.value })}>{CMS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      <label className="lab">Title<input className="in" maxLength={140} value={d.title} onChange={e => setD({ ...d, title: e.target.value })} placeholder="One line" /></label>
      <label className="lab">Details<textarea className="in" rows={5} maxLength={4000} value={d.body} onChange={e => setD({ ...d, body: e.target.value })} /></label>
      <p className="me">Posts as {CMP[CME].name} · Staff. Everyone in the cohort can read it. Nothing is emailed.</p>
    </Modal>}
  </div>;
}

function CommunityThread() {
  const { route, go, toast, guard, log, setDlg } = useC();
  const act = useCm();
  const [body, setBody] = useState('');
  const t = CMT.find(x => String(x.id) === String(route.id));
  if (!t) return <NotFound />;
  const first = t.posts[0];
  const pin = () => guard('account', (t.pinned ? 'Unpin ' : 'Pin ') + 'a thread', () => act(() => { t.pinned = !t.pinned; log('community.pin', t.title, t.pinned ? 'Pinned.' : 'Unpinned.'); toast(t.pinned ? 'Pinned to the top for the cohort' : 'Unpinned'); }));
  const hide = () => guard('account', (t.hidden ? 'Show ' : 'Hide ') + 'a thread', () => act(() => { t.hidden = !t.hidden; log('community.hide', t.title, t.hidden ? 'Hidden from the cohort.' : 'Shown again.'); toast(t.hidden ? 'Hidden. Only staff can see it.' : 'The cohort can see it again'); }));
  const hidePost = p => guard('account', (p.hidden ? 'Show ' : 'Hide ') + 'a reply', () => act(() => { p.hidden = !p.hidden; log('community.hide', t.title, (p.hidden ? 'Reply hidden: ' : 'Reply shown: ') + CMP[p.by].name + '.'); toast(p.hidden ? 'Reply hidden. Only staff can see it.' : 'The cohort can see the reply again'); }));
  const del = p => guard('account', 'Delete a post', () => setDlg({ title: p === first ? 'Delete this thread?' : 'Delete this reply?', body: p === first ? 'The thread and its ' + (t.posts.length - 1) + ' replies are removed for everyone. This can’t be undone. To take it out of view and keep it, hide it instead.' : 'The reply by ' + CMP[p.by].name + ' is removed for everyone. This can’t be undone. To take it out of view and keep it, hide it instead.', cta: 'Delete', danger: true,
    yes: () => { log('community.delete', t.title, (p === first ? 'Thread' : 'Reply') + ' by ' + CMP[p.by].name + '.'); if (p === first) { CMT = CMT.filter(x => x !== t); toast('Thread deleted'); go('community'); } else act(() => { t.posts.splice(t.posts.indexOf(p), 1); toast('Reply deleted'); }); } }));
  const reply = () => guard('account', 'Reply', () => act(() => { t.posts.push({ id: ++cmSeq, by: CME, when: 'Just now', body: body.trim() }); t.activity = 'just now'; CMT = [t, ...CMT.filter(x => x !== t)]; setBody(''); toast('Reply posted as staff'); }));
  const Post = ({ p }) => <div className={'cd pd col m' + (p.hidden || (p === first && t.hidden) ? ' cmh' : '')}>
    <div className="row nw" style={{ alignItems: 'flex-start' }}><div style={{ flex: 1, minWidth: 0 }}><Who id={p.by} when={p.when + (p.edited ? ' · edited' : '')} /></div>
      {p.hidden && <Pill v="Hidden" tone="warn" />}
      <Menu rt items={[...(p === first ? [] : [{ l: p.hidden ? 'Show to the cohort' : 'Hide from the cohort', g: 1, fn: () => hidePost(p) }]), { l: p === first ? 'Delete thread' : 'Delete reply', d: 1, g: 1, fn: () => del(p) }]} /></div>
    <div className="cmb">{p.body.split(/\n\n+/).map((x, i) => <p key={i}>{x}</p>)}</div>
  </div>;
  return <div className="pg">
    <Head back={['community', 'Community']} t={t.title} meta={<span className="row" style={{ gap: 6 }}><Pill v={spaceLabel(t.space)} tone="" /><ThreadPills t={t} /></span>}
      right={<><Btn onClick={pin}>{t.pinned ? 'Unpin' : 'Pin to the top'}</Btn><Btn onClick={hide}>{t.hidden ? 'Show to the cohort' : 'Hide from the cohort'}</Btn></>} />
    <div className="gms">
      <div className="col">
        {t.hidden && <div className="note row"><I n="eye" /><span>Hidden from the cohort. Only staff can see this thread.</span></div>}
        <Post p={first} />
        {t.posts.length > 1 && <span className="me">{t.posts.length - 1} {t.posts.length === 2 ? 'reply' : 'replies'}</span>}
        {t.posts.slice(1).map(p => <Post key={p.id} p={p} />)}
        <section className="cd pd col m"><Who id={CME} />
          <textarea className="in" rows={4} maxLength={4000} aria-label="Your reply" value={body} onChange={e => setBody(e.target.value)} placeholder="Reply to the cohort" />
          <div className="row"><Btn k="p" disabled={!body.trim()} onClick={reply}>Reply as staff</Btn><span className="me">Everyone in the cohort can read it. Nothing is emailed.</span></div></section>
      </div>
      <div className="col">
        <Card t="About this thread"><div className="kvs"><KV rows={[['Space', spaceLabel(t.space)], ['Started by', <span>{CMP[first.by].name} <span className="me">· {CMP[first.by].team}</span></span>], ['Started', first.when], ['Replies', String(t.posts.length - 1)], ['Last activity', t.activity], ['The cohort sees it', t.hidden ? 'No. It is hidden.' : t.pinned ? 'Yes, pinned to the top' : 'Yes']]} /></div></Card>
        <Card t="What the cohort can do" sub="For reference."><p className="s2">Members start threads and reply, and edit or delete their own posts. They can’t pin or hide, and they never see a hidden post. Pins, hides and your deletes of someone else’s post are written to the Audit Log.</p></Card>
      </div>
    </div>
  </div>;
}

