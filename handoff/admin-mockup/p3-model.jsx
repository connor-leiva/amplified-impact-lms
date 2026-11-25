
/* =====================================================================================================
   Nov 25, third pass: four pages with tabs. The sidebar reads as the through line:
   PROGRAM (what you teach) · COHORT (one group going through it) · PEOPLE (who has a sign-in) · REVENUE.
   A cohort owns its SHAPE: how many weeks, which ones, how often it meets, its seats and its price. A
   start date turns the shape into dates and sessions. The program owns what each week teaches. So a new
   cohort with a different promise is a form, not a code change. Sample data is made up.
   ===================================================================================================== */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DOWF = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NUMW = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const dparse = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(Date.UTC(y || 2027, (m || 1) - 1, d || 1)); };
const dadd = (d, n) => new Date(d.getTime() + n * 864e5);
const dfmt = d => DOW[d.getUTCDay()] + ', ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate();
const HOLI = { '2027-01-01': 'New Year\'s Day', '2027-01-18': 'Martin Luther King Jr. Day', '2027-02-15': 'Presidents\' Day', '2027-05-31': 'Memorial Day' };

/* the program: what you teach. Its weeks are a library a cohort picks from. */
const PRG = { id: 'acc', n: 'Amplified AI Accelerator', logo: LOGO_ACCELERATOR };
const LIB = ACC_WEEKS.map(w => ({ id: w.n, t: w.t, o: w.o, st: w.st === 'Draft' ? 'Draft' : 'Published', steps: w.steps, min: w.min, kit: w.kit }));
const libOf = id => LIB.find(w => w.id === id) || { id, t: 'Week', o: '', st: 'Draft', steps: 0, min: 0, kit: 0 };
const PTile = ({ s = 32 }) => <img className="tile" src={PRG.logo} width={s} height={s} alt="" style={{ width: s, height: s, flex: 'none', borderRadius: Math.round(s * 0.22) }} />;

/* the December cohort's Wednesday build and Thursday office hours are both at 12:00 PM MT through Thu, Feb 4 */
const DEC_LAST = dparse('2027-02-04');
const clashOf = s => s.time === '12:00 PM' && (s.day === 'Wed' || s.day === 'Thu') && s.date <= DEC_LAST ? (s.day === 'Wed' ? 'live build' : 'office hours') : '';

const COHORTS = [{
  id: 'dec26', n: 'December 2026 Cohort', st: 'Scheduled', enroll: true, full: true, read: true, promise: 'Nine weeks. One hire a week. Built live, on your own numbers.',
  week0: true, pick: [1, 2, 3, 4, 5, 6, 7, 8], pattern: [['Wed', '12:00 PM', 'Live build', '1 hr 30 min'], ['Thu', '12:00 PM', 'Office hours', '1 hr']], cap: 15, price: '$7,500', two: true, hosts: 'Connor Leiva',
  start: '2026-11-29', opens: 'Sun, Nov 29', w1: 'Sun, Nov 29', ends: 'Thu, Feb 4', holiday: 'No sessions the weeks of Dec 21 and Dec 28. Week 4 opens Sun, Jan 3.',
  run: ACC_WEEKS.map(w => ({ id: w.n, n: w.n, opens: w.opens, build: w.build })), ses: ACC_SES, teams: ACC_CT, learners: ACC_CL,
}];
let CUR = 'dec26', POKE = () => {}, COH = COHORTS[0], WEEKS = [], SES = [], CT = [], CL = [];
const runOf = c => c.run.map(r => ({ ...libOf(r.id), ...r }));
function syncCur() { COH = COHORTS.find(c => c.id === CUR) || COHORTS[0]; WEEKS = runOf(COH); SES = COH.ses; CT = COH.teams; CL = COH.learners; }
syncCur();
function setCur(id) { CUR = id; syncCur(); POKE(); }

/* the shape, in words */
const meetsOf = c => c.pattern.length === 1 ? 'once a week' : c.pattern.length === 2 ? 'twice a week' : c.pattern.length + ' times a week';
const shapeOf = c => c.pick.length + ' weeks of building · ' + meetsOf(c);
const slotLine = s => DOWF[s[0]] + ' · ' + s[1] + ' MT · ' + s[2] + ' · ' + s[3];
const autoPromise = n => (NUMW[n] || n) + ' weeks of building. One hire a week. Built live, on your own numbers.';
const howOf = c => { const b = c.pattern.filter(s => s[2] === 'Live build').map(s => DOWF[s[0]]), o = c.pattern.filter(s => s[2] === 'Office hours').map(s => DOWF[s[0]]);
  return ['A week opens on Sunday.', b.length ? 'We build its hire together on ' + b.join(' and ') + '.' : 'There is no live build. You work through the week on your own.', 'You run it on your own data and turn in what it made.', o.length ? 'Office hours are ' + o.join(' and ') + '.' : null].filter(Boolean); };
const firstBuildOf = c => { const s = c.ses.find(x => x.k === 'Live build') || c.ses[0]; return s ? s.d : 'the first session'; };
const widOf = s => s.wid === undefined ? s.wk : s.wid;

/* A shape and a start date make a calendar: when each week opens, and every session in it.
   f: { start (the day Week 1 opens), week0, pick (the weeks, by id, in order), pattern } */
function planOf(f) {
  const w1 = dparse(f.start), rows = [];
  if (f.week0) rows.push({ id: 0, n: 0, open: dadd(w1, -7), ses: [] });
  f.pick.forEach((id, i) => { const open = dadd(w1, 7 * i);
    const ses = f.pattern.map(sl => { let d = open; while (DOW[d.getUTCDay()] !== sl[0]) d = dadd(d, 1); return { day: sl[0], date: d, d: dfmt(d), time: sl[1], k: sl[2], len: sl[3], hol: HOLI[d.toISOString().slice(0, 10)] }; });
    rows.push({ id, n: i + 1, open, ses }); });
  return rows;
}
/* lay a cohort out (again) from its shape */
function reshape(c, patch) {
  Object.assign(c, patch);
  const pl = planOf(c), ses = [];
  pl.forEach(w => w.ses.forEach(s => ses.push({ n: ses.length + 1, t: libOf(w.id).t + ' · ' + s.k, k: s.k, wk: w.n, wid: w.id, d: s.d, time: s.time, zoom: 'No link yet', inv: 'Draft', clash: clashOf(s), hol: s.hol })));
  c.run = pl.map(w => ({ id: w.id, n: w.n, opens: dfmt(w.open), build: w.ses.map(s => s.d).join(' and ') || null }));
  c.ses = ses; c.opens = dfmt(pl[0].open); c.w1 = dfmt(dparse(c.start)); c.ends = ses.length ? ses[ses.length - 1].d : '';
  return c;
}
function makeCohort(f) {
  const c = reshape({ id: 'c' + (COHORTS.length + 1), n: f.n, st: 'Draft', enroll: false, full: false, read: false, promise: f.promise, cap: +f.cap || 15, price: (f.price || '').trim(), two: !!f.two, hosts: f.hosts, holiday: '', teams: [], learners: [] },
    { start: f.start, week0: f.week0, pick: [...f.pick], pattern: f.slots.map(s => [...s]) });
  COHORTS.push(c); return c;
}
/* Connor's example: six weeks of building, twice a week, starting in early January */
const JAN_F = { n: null, promise: null, from: 'dec26', week0: true, pick: [1, 2, 3, 4, 5, 6], slots: [['Tue', '12:00 PM', 'Live build', '1 hr 30 min'], ['Thu', '12:00 PM', 'Office hours', '1 hr']], start: '2027-01-03', cap: 15, price: '', two: true, hosts: 'Connor Leiva and Spring' };
/* the Screen list's shortcut: the January cohort, already created from those defaults */
function seedJan() { let c = COHORTS.find(x => x.id !== 'dec26'); if (!c) c = makeCohort({ ...JSON.parse(JSON.stringify(JAN_F)), n: 'January 2027 Cohort', promise: autoPromise(6) }); CUR = c.id; syncCur(); }

/* ---------- which cohort: the sidebar's switcher, and the same choice in the Cohort page's title ---------- */
function CtxSwitch({ r }) {
  const { go, route } = useC();
  const items = COHORTS.map(c => ({ l: c.n + (c.st === 'Draft' ? ' · Draft' : ''), on: c === COH, fn: () => { setCur(c.id); if (route.s !== 'cohort' && route.s !== 'overview') go('cohort'); } }));
  items.push('-', { l: 'New cohort…', fn: () => go('newcohort') });
  return <Menu lf trigger={(t, o) => <button className="sw" aria-expanded={o} aria-label={'Switch cohort. ' + PRG.n + ', ' + COH.n} title={r ? PRG.n + ' · ' + COH.n : undefined} onClick={t}><span data-fl="tile" style={{ display: 'flex', flex: 'none' }}><PTile /></span>{!r && <><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5 el sw1">{PRG.n}</span><span className="el sw2">{COH.n}</span></span><span className="mu" style={{ display: 'flex' }}><I n="updown" s={14} /></span></>}</button>} items={items} />;
}
function CohortPick({ big }) {
  const { go } = useC();
  const items = COHORTS.map(c => ({ l: c.n + (c.st === 'Draft' ? ' · Draft' : ''), on: c === COH, fn: () => setCur(c.id) }));
  items.push('-', { l: 'New cohort…', fn: () => go('newcohort') });
  return <Menu lf trigger={(t, o) => <button className={'cpk' + (big ? ' big' : '')} aria-expanded={o} aria-label={'Switch cohort. ' + COH.n} onClick={t}>{!big && <PTile s={20} />}<span className="el">{COH.n}</span><I n="updown" s={big ? 18 : 14} /></button>} items={items} />;
}

/* ---------- pieces the new-cohort page and the cohort's settings share ---------- */
const Seg = ({ v, on, opts }) => <span className="sgm" role="group">{opts.map(o => <button key={o[0]} type="button" className={v === o[0] ? 'on' : ''} aria-pressed={v === o[0]} onClick={() => on(o[0])}>{o[1]}</button>)}</span>;
/* how long and how often. f: { pick, slots, week0 } */
function ShapeFields({ f, up }) {
  const ids = LIB.filter(w => w.id > 0).map(w => w.id);
  const weeks = n => { let p = [...f.pick]; while (p.length > n) p.pop(); while (p.length < n) { const nx = ids.find(id => !p.includes(id)); if (nx === undefined) break; p.push(nx); } up({ pick: ids.filter(id => p.includes(id)) }); };
  const slot = (i, j, v) => up({ slots: f.slots.map((s, k) => k === i ? s.map((x, m) => m === j ? v : x) : s) });
  const times = n => up({ slots: Array.from({ length: n }, (x, i) => f.slots[i] || [['Tue', 'Thu', 'Fri'][i] || 'Fri', '12:00 PM', i ? 'Office hours' : 'Live build', i ? '1 hr' : '1 hr 30 min']) });
  return <div className="col">
    <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
      <div className="lab"><span>Weeks of building</span><span className="stp2"><button type="button" className="ib" aria-label="One week fewer" disabled={f.pick.length <= 1} onClick={() => weeks(f.pick.length - 1)}>−</button><b className="tn">{f.pick.length}</b><button type="button" className="ib" aria-label="One week more" disabled={f.pick.length >= ids.length} title={f.pick.length >= ids.length ? 'The curriculum has ' + ids.length + ' building weeks. Add one there first.' : undefined} onClick={() => weeks(f.pick.length + 1)}>+</button></span></div>
      <div className="lab"><span>You meet</span><Seg v={f.slots.length} on={times} opts={[[1, 'Once a week'], [2, 'Twice a week'], [3, 'Three times']]} /></div>
    </div>
    <div className="lab"><span>When</span><span className="fat">Mountain time. Learners see Central, one hour later.</span>
      <div className="lns">{f.slots.map((s, i) => <div key={i} className="ln slt"><Sel label={'Day ' + (i + 1)} v={DOWF[s[0]]} on={v => slot(i, 0, v.slice(0, 3))} opts={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']} /><Sel label={'Time ' + (i + 1)} v={s[1]} on={v => slot(i, 1, v)} opts={['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM']} /><Sel label={'Kind ' + (i + 1)} v={s[2]} on={v => slot(i, 2, v)} opts={['Live build', 'Office hours', 'Working session']} /></div>)}</div></div>
    <label className="ckr"><input type="checkbox" checked={f.week0} onChange={e => up({ week0: e.target.checked })} /><span className="col" style={{ gap: 0 }}><span className="w5">Start with a setup week</span><span className="me">Week 0, self-paced, opens a week before Week 1. Teams fill in their intake and get their AI ready.</span></span></label>
  </div>;
}
/* which of the program's weeks the cohort runs. They keep the curriculum's order. */
function WeekPick({ pick, on }) {
  const ids = LIB.filter(w => w.id > 0).map(w => w.id);
  return <div className="wpl">{LIB.filter(w => w.id > 0).map(w => { const i = pick.indexOf(w.id), onn = i >= 0;
    return <label key={w.id} className={'wpk' + (onn ? ' on' : '')}><input type="checkbox" checked={onn} disabled={onn && pick.length === 1} onChange={() => on(ids.filter(id => id === w.id ? !onn : pick.includes(id)))} />
      <span className={'wn sm' + (onn ? ' pk' : '')}>{onn ? i + 1 : '–'}</span><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{w.t}</span><span className="me el">{w.o}</span></span>
      {w.st !== 'Draft' ? <span className="pl ok">Published</span> : <span className={'pl' + (w.steps ? '' : ' warn')}>{w.steps ? 'Draft · ' + w.steps + ' steps' : 'Not built yet'}</span>}</label>; })}</div>;
}
/* the calendar a shape makes, week by week */
function PlanList({ pl, free }) {
  return <div className={'ncl' + (free ? ' free' : '')}>{pl.map(w => <div key={w.id} className="ncw"><span className="wn sm pk">{w.n}</span><span className="col" style={{ gap: 4, flex: 1, minWidth: 0 }}><span className="w5 el">{libOf(w.id).t}</span><span className="me">Opens {dfmt(w.open)}</span>
    <span className="row" style={{ gap: 6 }}>{w.ses.length ? w.ses.map((s, i) => <span key={i} className={'skc' + (clashOf(s) ? ' wrn' : s.k === 'Live build' ? '' : ' alt')} title={clashOf(s) ? 'Same time as the December 2026 Cohort\'s ' + clashOf(s) : s.hol || undefined}>{s.d.replace(',', '')} · {s.time.replace(':00', '')} · {s.k}</span>) : <span className="skc off">Self-paced</span>}</span></span></div>)}</div>;
}

/* ---------- Cohort › New cohort: say its shape and when it starts; see what that makes ---------- */
function NewCohort() {
  const { go, guard, toast, log, ph } = useC();
  const [f, setF] = useState(() => JSON.parse(JSON.stringify(JAN_F)));
  const up = p => setF({ ...f, ...p });
  const s0 = dparse(f.start), autoN = MONF[s0.getUTCMonth()] + ' ' + s0.getUTCFullYear() + ' Cohort', name = f.n === null ? autoN : f.n, promise = f.promise === null ? autoPromise(f.pick.length) : f.promise;
  const pl = planOf({ ...f, pattern: f.slots }), all = pl.flatMap(w => w.ses), cl = all.filter(clashOf), last = all[all.length - 1], hol = all.filter(s => s.hol);
  const drafts = f.pick.filter(id => libOf(id).st === 'Draft');
  const create = () => guard('build', 'Create cohort', () => { const c = makeCohort({ ...f, n: name.trim() || autoN, promise }); log('cohort.create', c.n, shapeOf(c)); setCur(c.id); toast(c.n + ' is created as a draft. ' + c.ses.length + ' sessions are on the calendar.'); go('cohort'); });
  return <div className="pg">
    <Head back={['cohort', 'Cohort']} t="New cohort" d="One group going through the program. Say how long it runs, how often you meet and when it starts. The portal lays out the weeks and the sessions. You can change any of it afterwards." />
    <div className="gms">
      <div className="col">
        <Card t="The cohort"><div className="col">
          <div className="g2"><label className="lab">Name<input className="in" value={name} onChange={e => up({ n: e.target.value })} /></label>
            <div className="lab"><span>Start from</span><Sel label="Start from" v={f.from ? 'December 2026 Cohort' : 'A blank cohort'} on={v => up({ from: v === 'A blank cohort' ? '' : 'dec26' })} opts={['December 2026 Cohort', 'A blank cohort']} /></div></div>
          <label className="lab">The promise<span className="fat">One line. Learners see it on Home, under the program's name.</span><input className="in" value={promise} onChange={e => up({ promise: e.target.value })} /></label>
          {f.from && <p className="me">Copied from December: its seats, its intake form, its emails and its community rules. Nothing about December changes.</p>}
        </div></Card>
        <Card t="Its shape" sub="How long it runs and how often you meet"><ShapeFields f={f} up={up} /></Card>
        <Card t="When it starts"><div className="g2"><label className="lab">Week 1 opens<input className="in" type="date" value={f.start} onChange={e => e.target.value && up({ start: e.target.value })} /></label>
          <div className="lab"><span>That makes</span><span className="s2" style={{ fontWeight: 400 }}>{f.week0 ? 'The setup week opens ' + dfmt(dadd(s0, -7)) + '. ' : ''}{all[0] ? 'The first session is ' + all[0].d + ' and the last is ' + last.d + '.' : 'No sessions yet.'}</span></div></div></Card>
        <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>What it covers</h2><span className="me">Pick from the program's weeks. They keep the curriculum's order.</span></div><span className="pl ok">{f.pick.length} of {LIB.length - 1} weeks</span></div>
          <WeekPick pick={f.pick} on={p => up({ pick: p })} />
          {drafts.length > 0 && <div className="cdb" style={{ borderTop: '1px solid var(--line)' }}><p className="me">{drafts.length} of these {drafts.length === 1 ? 'is' : 'are'} still {drafts.length === 1 ? 'a draft' : 'drafts'} in the curriculum. A draft week stays locked for learners until it is published. <button className="lk a" onClick={() => go('program')}>Open the curriculum</button></p></div>}
        </section>
        <Card t="Seats and price"><div className="col">
          <div className="g2"><label className="lab">Seats<span className="fat">A seat is a team: an owner and an AI Implementer.</span><input className="in" type="number" min="1" value={f.cap} onChange={e => up({ cap: e.target.value })} style={{ maxWidth: 120 }} /></label>
            <label className="lab">Price for a seat<span className="fat">Leave it empty for now and set it before you open enrollment.</span><input className="in" value={f.price} placeholder="Not set" onChange={e => up({ price: e.target.value })} style={{ maxWidth: 160 }} /></label></div>
          <label className="ckr"><input type="checkbox" checked={f.two} onChange={e => up({ two: e.target.checked })} /><span className="col" style={{ gap: 0 }}><span className="w5">Offer two payments</span><span className="me">Half at checkout, half 30 days later. Revenue shows the second half as still to collect.</span></span></label>
          <label className="lab">Hosts<input className="in" value={f.hosts} onChange={e => up({ hosts: e.target.value })} /></label>
        </div></Card>
      </div>
      <div className="col" style={ph ? undefined : { position: 'sticky', top: 0 }}>
        <section className="cd"><div className="cdb col">
          <div className="row nw" style={{ gap: 12, alignItems: 'flex-start' }}><PTile s={40} /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w6" style={{ fontSize: 16 }}>{name || autoN}</span><span className="me">{PRG.n}</span></div></div>
          <div className="skf"><div><b className="tn">{f.pick.length}</b><span className="me">weeks of building</span></div><div><b className="tn">{all.length}</b><span className="me">sessions</span></div><div><b className="tn">{f.cap || 0}</b><span className="me">team seats</span></div></div>
          <PlanList pl={pl} free />
          {cl.length > 0 && <div className="note row" style={{ gap: 10, borderColor: '#EBD9A8', background: 'var(--warnb)', alignItems: 'flex-start' }}><I n="incidents" /><span style={{ flex: 1, minWidth: 180 }}><b>{cl.length} sessions are at the same time as December's.</b> Its Wednesday build and Thursday office hours are at 12:00 PM MT through Thu, Feb 4. Pick another day or hour, or keep them if you mean to run them together.</span></div>}
          {hol.length > 0 && <div className="note row" style={{ gap: 10, alignItems: 'flex-start' }}><I n="cohorts" /><span style={{ flex: 1, minWidth: 180 }}>{hol.map(s => s.d + ' is ' + s.hol).join('. ')}.</span></div>}
          <GBtn k="p" perm="build" label="Create cohort" go={create}>Create cohort</GBtn>
          <p className="me">Creates a draft. No one is enrolled, nothing is for sale and no one is emailed.</p>
        </div></section>
      </div>
    </div>
  </div>;
}
