import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from '../src/components/AppShell.jsx';
import { WeekPage } from '../src/WeekPage.jsx';
import { SchedulePage } from '../src/SchedulePage.jsx';
import { LockedWeekPage } from '../src/LockedWeekPage.jsx';
import { FormDrawer, useForm } from '../src/components/FormDrawer.jsx';
import { CommunityPage, StartThreadDrawer, ThreadPage } from '../src/components/Community.jsx';
import { TurnInDrawer } from '../src/components/TurnIn.jsx';
import { MockBar } from '../src/components/MockBar.jsx';
import { communitySamples, intakeForm, intakeSamples, sampleIsLocked, sampleLabels, sampleLockedWeek, sampleNow, sampleSchedule, sampleShell, sampleWeek, turnInSamples, withForm } from '../src/sample-data.js';
import '../src/motion/ai-motion.css';   // Amplified Impact Motion v1 (brand file, unchanged), loaded first like in the mockup
import '../src/lms.tokens.css';
import '../src/lms.css';
import '../src/mock-bar.css';           // mockup-only

// /harness/            the mockup's full page: MOCKUP bar, shell, week overview.   #schedule  #community  #thread-2  #week-1 (locked)
// /harness/?lms        as the LMS ships it: no MOCKUP bar. &state=s7|s8|deployed the learner's state, &form=new|draft|submitted
//                      the intake's, &clock=soon|live|ended|nextday the moment around the first live build,
//                      &turnin=report|checkpoint|turned opens the Turn in drawer (in the LMS the step's button does), &as=cl a staff viewer.
// Everything below the imports stands in for the API, with the mockup's timings. None of it ships.
const q = new URLSearchParams(location.search);
const lms = q.has('lms');
const start = { preview: q.get('state') || 's1', clock: q.get('clock') || 'today', logo: q.get('logo') || 'app', form: q.get('form') || 'draft', as: q.get('as') || 'am' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = (o) => new Date().toLocaleString('en-US', o);
const copy = (x) => JSON.parse(JSON.stringify(x));
const CU = communitySamples.ui, PEOPLE = communitySamples.people, SPACES = communitySamples.spaces;
const subsOf = (k) => { const st = turnInSamples.states[k]; return { can: st.can, subs: Object.fromEntries(st.subs.map((id) => [id, { ...turnInSamples.sent }])) }; };
/** One file's upload, played: 14 % every 120 ms. window.__holdUploads = 0.42 stops it there (the pixel test uses it). */
const upload = (file, onProgress) => new Promise((done) => { let p = 0; const run = () => { const hold = window.__holdUploads; p = Math.min(1, p + 0.14); if (hold && p >= hold) p = hold; onProgress(p); if (p >= 1) return done(); if (!(hold && p >= hold)) setTimeout(run, 120); }; run(); });

function App() {
  const [seed, setSeed] = useState({ preview: start.preview, n: 0 });   // n remounts <WeekPage> when a Preview button is used
  const [picked, setPicked] = useState(start);
  const [hash, setHash] = useState(location.hash);
  const [formOpen, setFormOpen] = useState(false);
  const f = useForm({ form: intakeForm, initial: intakeSamples[start.form], onSave: () => wait(450), onSubmit: () => wait(900), onDownloadPdf: () => wait(900) });
  const [threads, setThreads] = useState(() => copy(communitySamples.threads)), [space, setSpace] = useState('all'), [composing, setComposing] = useState(false);
  const [ti, setTi] = useState({ can: true, subs: {} }), [askId, setAskId] = useState(null), [tiKey, setTiKey] = useState(0);
  const launch = (k) => { setTi(subsOf(k)); setAskId(turnInSamples.states[k].ask); setTiKey((n) => n + 1); };   // the step's button, in the LMS
  useEffect(() => { if (turnInSamples.states[q.get('turnin')]) launch(q.get('turnin')); }, []);
  const next = useRef(100);
  useEffect(() => { const on = () => { setHash(location.hash); scrollTo(0, 0); }; addEventListener('hashchange', on); return () => removeEventListener('hashchange', on); }, []);
  const me = picked.as, staff = !!PEOPLE[me].staff;
  const pick = (g, v) => {
    setPicked((p) => ({ ...p, [g]: v }));
    if (g === 'preview') setSeed((s) => ({ preview: v, n: s.n + 1 }));
    if (g === 'form') { setFormOpen(false); f.reset(intakeSamples[v]); }
    if (g === 'turnin') launch(v);
    if (g === 'as') { setComposing(false); setAskId(null); }
    if (g === 'clock') setAskId(null);
  };
  const tm = /^#thread-(\d+)$/.exec(hash), lk = /^#week-([1-8])$/.exec(hash), lockedN = lk && sampleIsLocked(+lk[1], picked.clock) ? +lk[1] : 0;
  const view = hash === '#schedule' ? 'schedule' : hash === '#community' ? 'community' : tm ? 'thread' : lk ? 'locked' : 'week';
  useEffect(() => { if (lk && !lockedN) location.hash = '#schedule'; }, [hash, picked.clock]);   // an open week past Week 0 isn't drawn here
  const now = sampleNow(picked.clock);
  const shownOf = (t) => (staff ? t.posts.slice(1) : t.posts.slice(1).filter((x) => !x.hidden));
  const thread = tm && threads.find((t) => t.id === +tm[1] && (staff || !t.hidden));
  useEffect(() => { if (view === 'thread' && !thread) location.hash = '#community'; }, [view, thread]);
  const change = (id, fn) => setThreads((ts) => ts.map((t) => (t.id === id ? fn(copy(t)) : t)));
  const onPost = (id, fn) => change(thread.id, (t) => { fn(t, t.posts.find((x) => x.id === id)); return t; });
  const week = () => {
    return withForm(sampleWeek(seed.preview), f, () => setFormOpen(true));
  };
  const base = sampleShell(picked.preview, picked.clock);
  const shell = { ...base, logo: { ...base.logo, use: picked.logo }, account: { initials: PEOPLE[me].initials, aria: 'Your account' }, here: lockedN ? sampleLockedWeek(lockedN).title : { schedule: 'Schedule', community: 'Community', thread: 'Community', week: 'Foundations' }[view] };
  return (
    <>
      {!lms && <MockBar picked={picked} onPick={pick} />}
      <AppShell shell={shell} current={view === 'week' ? 'week-0' : view === 'locked' ? `week-${lk[1]}` : view === 'thread' ? 'community' : view} hideNext={view === 'schedule'} now={now}>
        {view === 'schedule' && <SchedulePage schedule={sampleSchedule(picked.preview, picked.clock)} now={now} />}
        {view === 'locked' && !!lockedN && <LockedWeekPage key={lockedN} week={sampleLockedWeek(lockedN)} now={now} />}
        {view === 'community' && (
          <CommunityPage ui={CU} spaces={SPACES} space={space} onSpace={setSpace} people={PEOPLE} onStart={() => setComposing(true)}
            threads={threads.filter((t) => (staff || !t.hidden) && (space === 'all' || t.space === space)).map((t) => ({ id: t.id, href: `#thread-${t.id}`, space: t.space, title: t.title, pinned: t.pinned, hidden: t.hidden, activity: t.activity, replies: shownOf(t).length, excerpt: t.posts[0].body.replace(/\s+/g, ' '), by: t.posts[0].by }))} />
        )}
        {view === 'thread' && thread && (
          <ThreadPage key={thread.id} ui={CU} people={PEOPLE} me={me} staff={staff} backHref="#community"
            thread={{ ...thread, spaceLabel: SPACES.find((x) => x.id === thread.space).label, posts: [thread.posts[0], ...shownOf(thread)] }}
            onReply={async (body) => { await wait(600); setThreads((ts) => { const t = copy(ts.find((x) => x.id === thread.id)); t.posts.push({ id: next.current++, by: me, when: CU.justNow, body, fresh: true }); t.activity = CU.justNow.toLowerCase(); return [t, ...ts.filter((x) => x.id !== t.id)]; }); }}
            onEdit={(id, body) => onPost(id, (t, x) => { x.body = body; x.edited = true; })}
            onHidePost={(id) => onPost(id, (t, x) => { x.hidden = !x.hidden; })}
            onDelete={(id) => { if (id === thread.posts[0].id) { setThreads((ts) => ts.filter((t) => t.id !== thread.id)); location.hash = '#community'; } else onPost(id, (t, x) => { t.posts.splice(t.posts.indexOf(x), 1); }); }}
            onPin={() => change(thread.id, (t) => { t.pinned = !t.pinned; return t; })}
            onHideThread={() => change(thread.id, (t) => { t.hidden = !t.hidden; return t; })} />
        )}
        {view === 'week' && <WeekPage key={seed.n} week={week()} labels={sampleLabels} onDeploy={(on) => setPicked((p) => ({ ...p, preview: on ? 'deployed' : 's8' }))} />}
      </AppShell>
      <FormDrawer f={f} open={formOpen} onClose={() => setFormOpen(false)} />
      <StartThreadDrawer ui={CU} spaces={SPACES} space={space} me={PEOPLE[me]} open={composing} onClose={() => setComposing(false)}
        onPost={async ({ space: sp, title, body }) => { await wait(700); const id = next.current++; setThreads((ts) => [{ id, space: sp, title, activity: CU.justNow.toLowerCase(), posts: [{ id: next.current++, by: me, when: CU.justNow, body }] }, ...ts]); return id; }}
        onPosted={(id) => { setComposing(false); location.hash = '#thread-' + id; }} />
      {<TurnInDrawer key={tiKey} ui={turnInSamples.ui} asks={turnInSamples.asks} subs={ti.subs} can={ti.can} askId={askId} onClose={() => setAskId(null)} upload={upload}
        onSubmit={async (id, { files, note, minutes }) => { await wait(900); setTi((t) => ({ ...t, subs: { ...t.subs, [id]: { files: files.map((x) => ({ name: x.name, size: x.size })), note, minutes, by: PEOPLE[me].name,
          when: stamp({ weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + stamp({ hour: 'numeric', minute: '2-digit' }), short: stamp({ month: 'short', day: 'numeric' }) } } })); }} />}
    </>
  );
}
createRoot(document.getElementById('root')).render(<App />);
