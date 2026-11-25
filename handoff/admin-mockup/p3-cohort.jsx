
/* =====================================================================================================
   The Cohort page's tabs: Overview, Schedule, People, Submissions, Community, Announcements, Settings.
   Each one is about the cohort picked in the page's title (and in the sidebar's switcher).
   ===================================================================================================== */
const QuietTab = ({ t, b }) => <section className="cd"><Empty ic="cohorts" t={t || 'Nothing here yet'} b={b} /></section>;
/* what needs staff before the next live build (a running cohort), in one list. Overview shows the same rows. */
/* 'Sun, Nov 29' as a date field's value. The sample runs from November 2026 into 2027. */
const isoOf = d => { const m = String(d || '').match(/(\w+), (\w+) (\d+)/); if (!m) return ''; const mi = MON.indexOf(m[2]); return new Date(Date.UTC(mi > 9 ? 2026 : 2027, mi, +m[3])).toISOString().slice(0, 10); };
function needsOf(go) {
  return [
    ['forms', '2 teams haven\'t started their intake', 'Northshore Group and Red Cliff Collective. It is due before Wed, Dec 2.', () => go('forms', null, 'teams'), 'bad'],
    ['integrations', '1 intake didn\'t reach GHL', 'Copper Basin Realty. Retry from the team\'s Intake tab.', () => go('workspace', 'ws_copperbasin', 'intake'), 'bad'],
    ['community', '3 threads are waiting on you', 'The last word in each is a member\'s.', () => go('community'), 'warn'],
    ['cohorts', '6 sessions have no Zoom link', 'The next one without a link is Wed, Dec 9.', () => go('sessions'), 'warn'],
    ['billing', '2 second payments are on the calendar', '$3,750 each, on Wed, Dec 30.', () => go('revenue'), ''],
  ];
}
/* what is left before a draft cohort can open. [what, where it stands, done, where to fix it] */
function todoOf(c, go, openEnroll) {
  const run = runOf(c).filter(w => w.id > 0), pub = run.filter(w => w.st !== 'Draft'), clash = c.ses.filter(s => s.clash), zoom = c.ses.filter(s => s.zoom === 'Ready');
  return [
    ['Shape', shapeOf(c) + (c.week0 ? ', after a setup week' : ''), true, () => go('cohortset')],
    ['Its weeks', pub.length + ' of ' + run.length + ' are published' + (run.length - pub.length ? '. The rest are still drafts in the curriculum.' : ''), pub.length === run.length, () => go('program')],
    ['Sessions', c.ses.length + ' on the calendar' + (clash.length ? '. ' + clash.length + ' are at the same time as December\'s ' + [...new Set(clash.map(s => s.clash))].join(' and ') + '.' : ''), !clash.length, () => go('sessions')],
    ['Zoom links', zoom.length + ' of ' + c.ses.length + ' sessions have one', zoom.length === c.ses.length, () => go('sessions')],
    ['Price', c.price ? c.price + (c.two ? ', or two payments' : '') + ' · ' + c.cap + ' seats' : 'Not set. A team can\'t check out without one.', !!c.price, () => go('cohortset')],
    ['Words learners see', c.read ? 'The promise and how it works, written from this cohort\'s shape' : 'The promise and how it works are written from this cohort\'s shape. Read them once.', !!c.read, () => { c.read = true; go('cohortset'); }],
    ['Open enrollment', c.enroll ? 'A team that buys a seat is placed here' : 'Off. Turn it on when the rest is done.', !!c.enroll, openEnroll],
  ];
}
function useEnroll() {
  const { guard, setDlg, log, toast } = useC();
  return () => guard('account', 'Open enrollment', () => !COH.price ? toast('Set a price first. A team can\'t check out without one.') : setDlg({ title: 'Open enrollment for the ' + COH.n + '?', body: 'From now on, a team that buys a seat is placed in this cohort, up to ' + COH.cap + ' seats. They get the welcome email and can start the setup week on ' + COH.opens + '.', cta: 'Open enrollment', yes: () => { COH.enroll = true; COH.st = 'Scheduled'; log('cohort.enrollment_open', COH.n, ''); POKE(); toast('Enrollment is open'); } }));
}
/* the dialog that picks which of the program's weeks this cohort runs */
function WeeksDlg({ onClose }) {
  const { guard, toast, log } = useC();
  const [p, setP] = useState(COH.pick);
  const save = () => guard('build', 'Change this cohort\'s weeks', () => { if (COH.full) toast('Saved. Weeks that are already open stay as they are.'); else { reshape(COH, { pick: p }); syncCur(); POKE(); toast(COH.n + ' now runs ' + p.length + ' weeks. Its sessions are laid out again.'); } log('cohort.weeks', COH.n, p.length + ' weeks'); onClose(); });
  return <Modal title={'The weeks the ' + COH.n + ' runs'} w={620} onClose={onClose} foot={<><Btn onClick={onClose}>Cancel</Btn><Btn k="p" onClick={save}>Save</Btn></>}>
    <p className="s2">Pick from the program's weeks. What a week teaches is the same for every cohort. Its date is this cohort's.</p>
    <div className="cd" style={{ boxShadow: 'none' }}><WeekPick pick={p} on={setP} /></div>
    <p className="me">{p.length} weeks of building{COH.week0 ? ', after the setup week' : ''}. {p.length !== COH.pick.length ? 'The promise says ' + COH.promise.split('.')[0].toLowerCase() + '. Change it in Settings if it no longer fits.' : ''}</p>
  </Modal>;
}

/* ---------- Cohort › Overview: what needs you, the run, and how ready the group is ---------- */
function CohortOverview() {
  const { go, started, ph } = useC();
  const [wk, setWk] = useState(false);
  const openEnroll = useEnroll();
  const full = !!COH.full, first = SES[0], nowN = started && full ? 2 : WEEKS[0].n;
  const need = full ? needsOf(go) : null, todo = full ? null : todoOf(COH, go, openEnroll), left = todo ? todo.filter(t => !t[2]).length : 0;
  return <div className="col">
    <LFacts items={[
      ['Opens', ph ? COH.opens : COH.opens + ' · 12:00 PM MT', () => go('cohortset')],
      ['Shape', COH.pick.length + ' weeks · ' + meetsOf(COH), () => go('cohortset')],
      ['Teams', CT.length + ' of ' + COH.cap + ' seats', () => go('enrolled')],
      ['Learners', full ? '15 · 13 signed in' : String(CL.length), () => go('enrolled', null, 'learners')],
      ['Next session', first ? (started && full ? 'Wed, Dec 9' : first.d) : 'None yet', () => go('sessions')],
    ]} />
    <div className="gms">
      <div className="col">
        {todo ? <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Before it opens</h2><span className="me">{todo.length - left} of {todo.length} done</span></div>{left > 0 ? <span className="pl warn">{left} left</span> : <span className="pl ok">Ready</span>}</div>
          <div className="wkl">{todo.map(t => <button key={t[0]} className={'nyr tdo' + (t[2] ? ' ok' : '')} onClick={t[3]}><span className="tdc">{t[2] && <I n="check" s={12} w={2.6} />}</span><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{t[0]}</span><span className="me">{t[1]}</span></span><I n="chev" s={12} w={2.2} /></button>)}</div></section>
          : <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Needs you</h2><span className="me">Before the next live build</span></div><span className="pl warn">{need.length}</span></div>
            <div className="wkl">{need.map(n => <button key={n[1]} className="nyr" onClick={n[3]}><span className={'mt' + (n[4] ? ' ' + n[4] : '')}><I n={n[0]} /></span><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{n[1]}</span><span className="me">{n[2]}</span></span><I n="chev" s={12} w={2.2} /></button>)}</div></section>}
        <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>The run</h2><span className="me">The weeks this cohort takes, when each opens, and when you meet</span></div><GBtn perm="build" label="Change this cohort's weeks" go={() => setWk(true)}>Change weeks</GBtn></div>
          <div className="wkl run">{WEEKS.map(w => { const now = w.n === nowN; return <button key={w.id} className={'nyr rn' + (now ? ' now' : '')} onClick={() => go('week', String(w.id))}><Wn n={w.n} st={w.st} /><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{w.t}</span><span className="me el">Opens {w.opens}{w.build ? ' · ' + (full ? 'Live build ' : 'Meets ') + w.build : ' · Self-paced'}</span></span>{now ? <span className="pl ok">{started && full ? 'This week' : 'Opens first'}</span> : w.st === 'Draft' ? <span className={'pl' + (w.steps ? '' : ' warn')}>{w.steps ? 'Draft' : 'Not built yet'}</span> : !ph && <span className="me">Published</span>}<I n="chev" s={12} w={2.2} /></button>; })}</div></section>
      </div>
      <div className="col">
        {full ? <Card t="Readiness" sub="Out of 7 teams"><div className="col m">{[['Signed in', 6, ['enrolled']], ['Intake submitted', 3, ['forms', null, 'teams']], ['Week 0 done', 1, ['enrolled']], ['Paid in full', 5, ['revenue']]].map(r => <button key={r[0]} className="rdy" onClick={() => go(...r[2])}><span style={{ flex: '0 0 116px' }}>{r[0]}</span><PBar v={r[1]} max={7} /><span className="tn w5 rdn">{r[1]} of 7</span></button>)}</div></Card>
          : <Card t="Seats" right={<Btn onClick={() => go('enrolled')}>People</Btn>}><div className="col m"><div className="rdy" style={{ cursor: 'default' }}><span style={{ flex: '0 0 96px' }}>Seats taken</span><PBar v={CT.length} max={COH.cap} /><span className="tn w5 rdn">{CT.length} of {COH.cap}</span></div><p className="me">{COH.enroll ? 'Enrollment is open. A team that buys a seat lands here.' : 'No one yet. Enrollment is closed.'}</p></div></Card>}
        <Card t="Coming up" right={<Btn onClick={() => go('sessions')}>Schedule</Btn>}><div className="col m">{SES.length ? SES.slice(started && full ? 2 : 0, started && full ? 5 : 3).map(s => <button key={s.n} className="rnw" onClick={() => go('sessions')}><span className="dt"><b>{s.d.split(' ')[2]}</b><span>{s.d.split(' ')[1]}</span></span><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{s.t}</span><span className="me">{s.d.split(',')[0]} · {s.time || '12:00 PM'} MT</span></span>{s.clash ? <span className="pl warn">Same time</span> : s.zoom !== 'Ready' && <span className="pl warn">No link</span>}</button>) : <p className="s2">No sessions yet.</p>}</div></Card>
        <Card t="This cohort's shape" right={<Btn onClick={() => go('cohortset')}>Settings</Btn>}><div className="kvs"><KV rows={[['Promise', COH.promise], ['Meets', COH.pattern.map(s => s[0] + ' ' + s[2].toLowerCase()).join(' and ')], ['Seats', COH.cap + ' teams'], ['Price', COH.price ? COH.price + (COH.two ? ', or two payments' : '') : <span className="pl warn">Not set</span>]]} /></div></Card>
      </div>
    </div>
    {wk && <WeeksDlg onClose={() => setWk(false)} />}
  </div>;
}

/* ---------- Cohort › Schedule: every session, in one place ---------- */
function CohortSchedule() {
  const { go, guard, toast, log } = useC();
  const [f, setF] = useState('All sessions');
  const total = COH.pick.length * COH.pattern.length, wkOf = s => WEEKS.find(w => w.n === s.wk) || { t: '' };
  const noZoom = SES.filter(s => s.zoom !== 'Ready').length, clash = SES.filter(s => s.clash).length, noSes = WEEKS.filter(w => w.id > 0 && !SES.some(s => s.wk === w.n));
  const next = d => { const m = d.match(/(\w+), (\w+) (\d+)/), mi = MON.indexOf(m[2]); return dfmt(new Date(Date.UTC(mi > 9 ? 2026 : 2027, mi, +m[3] + 1))); };
  const fill = () => guard('build', 'Add the missing sessions', () => { noSes.forEach(w => { if (!w.build) return; COH.pattern.forEach((sl, i) => SES.push({ n: SES.length + 1, t: w.t + ' · ' + sl[2], k: sl[2], wk: w.n, wid: w.id, d: i ? next(w.build) : w.build, time: sl[1], zoom: 'No link yet', inv: 'Draft' })); }); log('cohort.sessions_fill', COH.n, noSes.length + ' weeks'); POKE(); toast(noSes.length * COH.pattern.length + ' sessions added from the cohort\'s rhythm'); });
  const rows = SES.filter(s => f === 'All sessions' || (f === 'Without a Zoom link' ? s.zoom !== 'Ready' : f === 'Same time as another cohort' ? s.clash : s.k === (f === 'Live builds' ? 'Live build' : 'Office hours')));
  return <div className="col">
    <LFacts items={[['On the calendar', SES.length + ' of ' + total + ' sessions'], ['Rhythm', COH.pattern.map(s => s[0] + ' ' + s[2].toLowerCase()).join(' and '), () => go('cohortset')], ['Without a Zoom link', String(noZoom), () => setF('Without a Zoom link')], clash ? ['Same time as another cohort', String(clash), () => setF('Same time as another cohort')] : ['Next', SES[0] ? SES[0].d + ' · ' + (SES[0].time || '12:00 PM') + ' MT' : 'None yet']]} />
    {noSes.length > 0 && <div className="note row" style={{ gap: 10 }}><I n="cohorts" /><span style={{ flex: 1, minWidth: 200 }}><b>Weeks {noSes[0].n} to {noSes[noSes.length - 1].n} have no sessions yet.</b> The rhythm is {COH.pattern.map(s => DOWF[s[0]] + ' ' + s[2].toLowerCase()).join(' and ')}, so they can be laid out for you.</span><GBtn perm="build" label="Add the missing sessions" go={fill}>Add {noSes.length * COH.pattern.length} sessions</GBtn></div>}
    <div className="row"><Sel label="Kind" v={f} on={setF} opts={['All sessions', 'Live builds', 'Office hours', 'Without a Zoom link', ...(clash ? ['Same time as another cohort'] : [])]} /><span className="sp" /><GBtn k="p" ic="plus" perm="build" label="Add session" go={() => toast('Session editor opens here')}>Add session</GBtn></div>
    <Table rows={rows} onRow={s => toast('Opens ' + s.t)} empty={{ ic: 'cohorts', t: 'No sessions match', b: 'Try another filter.' }}
      cols={[{ k: 't', l: 'Session', w: 'minmax(240px,1.6fr)', r: s => <Two a={s.t} b={s.k} /> }, { k: 'd', l: 'When', w: '210px', ns: 1, r: s => <When d={s.d} t={s.time || '12:00 PM'} /> },
        { k: 'wk', l: 'Week', w: 'minmax(200px,1.2fr)', hide: 'lap', r: s => <button className="lk a el" onClick={e => { e.stopPropagation(); go('week', String(widOf(s))); }}>Week {s.wk} · {wkOf(s).t}</button> },
        { k: 'zoom', l: 'Zoom link', w: '150px', r: s => s.clash ? <span className="pl warn">Same time as Dec</span> : s.zoom === 'Ready' ? <St v="Ready" /> : <span className="pl warn">No link yet</span> }, { k: 'inv', l: 'Reminder', w: '112px', r: s => <St v={s.inv} /> }]}
      menu={s => [{ l: 'Edit session', g: 1, fn: () => guard('build', 'Edit ' + s.t, () => toast('Session editor opens here')) }, { l: 'Copy join link', fn: () => toast('Join link copied') }, { l: 'Open the week', fn: () => go('week', String(widOf(s))) }, { l: 'Attach replay', g: 1, fn: () => guard('build', 'Attach replay', () => toast('Replay picker opens here')) }]} />
    <p className="me">Sessions are edited here and nowhere else. A week shows its sessions but doesn't change them. Times are Mountain, with Central under each for what learners see.</p>
  </div>;
}

/* ---------- Cohort › People: the teams and learners in this cohort, and how each is doing ---------- */
function CohortPeople() {
  const { route, go } = useC();
  const [tab, setTab] = useState(route.tab === 'learners' ? 'learners' : 'teams'), [q, setQ] = useState('');
  const f = r => (r.n + (r.owner || '') + (r.team || '')).toLowerCase().includes(q.toLowerCase());
  const W0 = ({ v }) => <span className="row nw" style={{ gap: 10 }}><PBar v={v} max={8} /><span className="tn" style={{ flex: 'none', minWidth: 42, textAlign: 'right' }}>{v} of 8</span></span>;
  if (!CT.length) return <QuietTab t="No one is enrolled yet" b={COH.enroll ? 'Enrollment is open. The first team to buy a seat shows up here.' : 'Enrollment is closed. Open it from Overview, and a team that buys a seat is placed here.'} />;
  return <div className="col">
    <div className="row"><Tabs v={tab} on={setTab} tabs={[['teams', 'Teams', CT.length + ' of ' + COH.cap], ['learners', 'Learners', 15]]} /><Find v={q} on={setQ} ph={tab === 'teams' ? 'Find a team' : 'Find a person'} /></div>
    {tab === 'teams' && <Table rows={CT.filter(f)} onRow={t => go('workspace', t.id)}
      cols={[{ k: 'n', l: 'Team', w: 'minmax(200px,1.5fr)', r: t => <Two a={t.n} b={t.owner} /> }, { k: 'seats', l: 'People', w: '120px', r: t => <span className="tn">{t.in} of {t.seats} signed in</span> },
        { k: 'pay', l: 'Paid', w: '140px', hide: 'lap', r: t => t.pay === 'Paid in full' ? <St v="Paid" /> : <span className="pl info">{t.pay}</span> },
        { k: 'intake', l: 'Intake', w: '120px', r: t => <St v={t.intake} tone={t.intake === 'Submitted' ? 'ok' : t.intake === 'Draft' ? 'warn' : 'off'} /> },
        { k: 'w0', l: 'Week 0', w: '150px', r: t => <W0 v={t.w0} /> }, { k: 'last', l: 'Last active', w: '150px', ns: 1, hide: 'lap' }]}
      menu={t => [{ l: 'Open team', fn: () => go('workspace', t.id) }, { l: 'Read their intake', fn: () => go('workspace', t.id, 'intake') }, { l: 'What they turned in', fn: () => go('workspace', t.id, 'turnedin') }]} />}
    {tab === 'learners' && <><Table rows={CL.filter(f)} onRow={u => go('user', u.id)}
      cols={[{ k: 'n', l: 'Learner', w: 'minmax(210px,1.5fr)', r: u => <Two a={u.n} b={u.e} /> }, { k: 'team', l: 'Team', w: 'minmax(160px,1fr)', r: u => <button className="lk el" onClick={e => { e.stopPropagation(); go('workspace', CT.find(t => t.n === u.team).id); }}>{u.team}</button> },
        { k: 'role', l: 'Seat', w: '190px', hide: 'lap' }, { k: 'w0', l: 'Week 0', w: '150px', r: u => <W0 v={u.w0} /> }, { k: 'last', l: 'Last active', w: '150px', ns: 1, r: u => u.st === 'Invited' ? <span className="pl warn">Invited, not signed in</span> : u.last }]} />
      <p className="me">Showing 8 of 15. The other seven are teammates who joined from an invite.</p></>}
    <p className="me">This is the cohort's roster: who is in it and how far along they are. For a sign-in, a plan or a seat, open the person or the team.</p>
  </div>;
}

/* ---------- Cohort › Submissions: what the cohort told you (intake) and sent you (turned in) ---------- */
function CohortSubs() {
  const { route, toast } = useC();
  const [v, setV] = useState({ teams: 'teams', turnedin: 'asks', files: 'files' }[route.tab] || 'intake');
  if (!COH.full) return <QuietTab b="Intake answers and turned-in files show up here once teams are enrolled." />;
  return <div className="col">
    <div className="row"><Tabs v={v} on={setV} tabs={[['intake', 'Intake, added up'], ['teams', 'Intake, team by team', IR.filter(r => r.st === 'Submitted').length + ' of ' + IR.length], ['asks', 'Turned in, by step'], ['files', 'Turned in, every file', TI0.length]]} /><span className="sp" /><Btn ic="download" onClick={() => toast('Exported as CSV')}>Export CSV</Btn></div>
    {v === 'intake' && <FormsIntake />}{v === 'teams' && <IntakeTab />}{v === 'asks' && <FormsTurnedIn />}{v === 'files' && <TurnedInTab />}
  </div>;
}

/* ---------- Cohort › Settings: its shape, its dates, its seats and price, the words that come from them ---------- */
function CohortSettings() {
  const { go, guard, toast, setDlg, log } = useC();
  const [dates, setDates] = useState(false), [shape, setShape] = useState(null), [wk, setWk] = useState(false), [pr, setPr] = useState(null);
  const openEnroll = useEnroll(), full = !!COH.full, how = howOf(COH);
  const saveShape = () => guard('build', 'Save the shape', () => { if (full) toast('Saved. Sessions that haven\'t happened are laid out again.'); else { reshape(COH, { pick: shape.pick, pattern: shape.slots.map(s => [...s]), week0: shape.week0 }); syncCur(); POKE(); toast('Shape saved. ' + COH.ses.length + ' sessions are on the calendar.'); } log('cohort.shape', COH.n, shapeOf(COH)); setShape(null); });
  return <div className="col">
    <div className="set2">
      <div className="col">
        <Card t="Shape" sub="How long it runs and how often you meet" right={<GBtn perm="build" label="Edit the shape" go={() => setShape({ pick: [...COH.pick], slots: COH.pattern.map(s => [...s]), week0: COH.week0 })}>Edit</GBtn>}>
          <div className="kvs"><KV rows={[['Length', COH.pick.length + ' weeks of building' + (COH.week0 ? ', after a setup week' : '')], ...COH.pattern.map((s, i) => [i ? 'And' : 'Meets', slotLine(s)]), ['Its weeks', <button className="lk a" onClick={() => setWk(true)}>{COH.pick.length} of the program's {LIB.length - 1}</button>], ['Hosts', COH.hosts]]} /></div>
          <p className="me" style={{ marginTop: 12 }}>Change the shape and the sessions that haven't happened are laid out again. Past sessions keep their dates.</p></Card>
        <Card t="Dates and release" right={<GBtn perm="build" label="Edit dates and release" go={() => setDates(true)}>Edit</GBtn>}><div className="kvs"><KV rows={[['Week 1 opens', COH.w1 + ' · 12:00 PM MT'], ['A week opens', 'Every Sunday · 12:00 PM MT · 1:00 PM CT for learners'], [COH.week0 ? 'Setup week opens' : 'Preview opens', full ? 'Mon, Nov 23 · 9:00 AM MT' : COH.opens + ' · 12:00 PM MT'], ['Welcome email', full ? 'Sun, Nov 29 · 12:00 PM MT' : 'When a team is enrolled'], ['Session reminders', 'The day before and an hour before, in MT and CT'], ['Time zone', 'Mountain in the admin. Learners see Central.']]} /></div></Card>
      </div>
      <div className="col">
        <Card t="Enrollment" right={<St v={COH.enroll ? 'Open' : 'Closed'} tone={COH.enroll ? 'ok' : 'off'} />}>
          <div className="kvs"><KV rows={[['Seats', <button className="lk a" onClick={() => go('enrolled')}>{CT.length} of {COH.cap} taken</button>], ['A seat is', 'A team: an owner and an AI Implementer'], ['Price', COH.price ? COH.price : <span className="pl warn">Not set</span>], ['Two payments', COH.two ? 'Offered. Half at checkout, half 30 days later.' : 'Not offered'], ['Who lands here', 'A team that buys a seat while enrollment is open']]} /></div>
          <div className="row" style={{ marginTop: 12 }}>{COH.enroll ? <GBtn perm="account" label="Close enrollment" go={() => setDlg({ title: 'Close enrollment for the ' + COH.n + '?', body: 'No new team can buy a seat in this cohort. The ' + CT.length + ' already in it are not affected.', cta: 'Close enrollment', yes: () => { COH.enroll = false; log('cohort.enrollment_close', COH.n, ''); POKE(); toast('Enrollment is closed'); } })}>Close enrollment</GBtn> : <GBtn k="p" perm="account" label="Open enrollment" go={openEnroll}>Open enrollment</GBtn>}<GBtn perm="account" label="Set the price" go={() => setPr({ v: COH.price || '', two: COH.two })}>{COH.price ? 'Change the price' : 'Set the price'}</GBtn></div></Card>
        <Card t="Words from this cohort" sub="Written from its shape, so they are right for this group. Learners see them on Home and the Schedule."><div className="col m">
          <div className="cfx"><span className="me">Name</span><span>{COH.n}</span></div>
          <div className="cfx"><span className="me">The promise</span><span>{COH.promise}</span></div>
          <div className="cfx"><span className="me">How it works</span><ul className="cfl">{how.map(h => <li key={h}>{h}</li>)}</ul></div>
          <div className="cfx"><span className="me">Holiday note</span><span>{COH.holiday || 'None. Every week has its sessions.'}</span></div>
          <div className="row"><GBtn perm="build" label="Edit this cohort's words" go={() => { COH.read = true; POKE(); toast('Opens these four as fields. The portal fills them in from the shape until you change one.'); }}>Edit words</GBtn><button className="lk a" onClick={() => go('course')}>What every cohort shares is in Course settings</button></div>
        </div></Card>
        <Card t="Clean-up"><div className="col m">
          <div className="row nw" style={{ gap: 12 }}><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">Delete turned-in files</span><span className="me">Removes every file teams turned in. The record that they turned it in stays.</span></span><GBtn perm="build" label="Delete turned-in files" go={() => setDlg({ title: 'Delete this cohort\'s turned-in files?', body: 'Every file teams turned in is removed for good. The record that they turned it in stays.', cta: 'Delete files', danger: 1, needReason: 1, yes: r => { log('cohort.files_delete', COH.n, r); toast('Turned-in files deleted'); } })}>Delete…</GBtn></div>
          <div className="row nw" style={{ gap: 12 }}><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">Archive this cohort</span><span className="me">Hides it from the switcher when it is over. Its people, files and payments are kept.</span></span><GBtn perm="build" label="Archive this cohort" go={() => toast(full ? 'A cohort can be archived after its last session, Thu, Feb 4.' : 'Archived cohorts move to the bottom of the switcher.')}>Archive…</GBtn></div>
        </div></Card>
      </div>
    </div>
    {shape && <Modal title={'Shape of the ' + COH.n} w={640} onClose={() => setShape(null)} foot={<><Btn onClick={() => setShape(null)}>Cancel</Btn><Btn k="p" onClick={saveShape}>Save shape</Btn></>}>
      <ShapeFields f={shape} up={p => setShape({ ...shape, ...p })} />
      <div className="lab"><span>What this makes</span><PlanList pl={planOf({ start: COH.start, week0: shape.week0, pick: shape.pick, pattern: shape.slots })} /></div>
    </Modal>}
    {wk && <WeeksDlg onClose={() => setWk(false)} />}
    {pr && <Modal title={'Price for a seat in the ' + COH.n} w={520} onClose={() => setPr(null)} foot={<><Btn onClick={() => setPr(null)}>Cancel</Btn><Btn k="p" disabled={!pr.v.trim()} onClick={() => guard('account', 'Set the price', () => { COH.price = pr.v.trim(); COH.two = pr.two; log('cohort.price', COH.n, COH.price); setPr(null); POKE(); toast('Price saved'); })}>Save price</Btn></>}>
      <label className="lab">Price for a seat<input className="in" value={pr.v} placeholder="$0,000" onChange={e => setPr({ ...pr, v: e.target.value })} style={{ maxWidth: 160 }} /></label>
      <label className="ckr"><input type="checkbox" checked={pr.two} onChange={e => setPr({ ...pr, two: e.target.checked })} /><span className="col" style={{ gap: 0 }}><span className="w5">Offer two payments</span><span className="me">Half at checkout, half 30 days later. Revenue shows the second half as still to collect.</span></span></label>
      <p className="me">Saving makes this cohort's own checkout in Stripe, so every buyer and every dollar is filed under it.</p>
    </Modal>}
    {dates && <Modal title="Dates and release" w={560} onClose={() => setDates(false)} foot={<><Btn onClick={() => setDates(false)}>Cancel</Btn><Btn k="p" onClick={() => guard('build', 'Save dates and release', () => { setDates(false); log('cohort.plan_save', COH.n, ''); toast('Dates and release saved'); })}>Save</Btn></>}>
      <div className="g2"><label className="lab">Week 1 opens<input className="in" type="date" defaultValue={COH.start} /></label><label className="lab">A week opens at (MT)<input className="in" type="time" defaultValue="12:00" /></label></div>
      <div className="g2"><label className="lab">{COH.week0 ? 'Setup week opens' : 'Preview opens'}<input className="in" type="date" defaultValue={full ? '2026-11-23' : isoOf(COH.opens)} /></label><label className="lab">Time (MT)<input className="in" type="time" defaultValue={full ? '09:00' : '12:00'} /></label></div>
      <p className="me">To move the whole cohort, change when Week 1 opens. Every week and session after it moves by the same number of days.</p>
      <div className="lab"><span>Each week</span><span className="fat">Move one week on its own, for a holiday break. Its sessions that haven't happened move with it.</span>
        <div className="ewl"><div className="ewr ewh" aria-hidden="true"><span /><span /><span>Opens</span><span>Due</span></div>
          {WEEKS.map(w => { const o = isoOf(w.opens); return <div key={w.id} className="ewr"><span className="wn sm">{w.n}</span><span className="el ewt">{w.t}</span><label className="ewf"><span className="ewk">Opens</span>{w.id === 0 ? <span className="me">Set above</span> : <input className="in" type="date" aria-label={'Week ' + w.n + ' opens'} defaultValue={o} />}</label><label className="ewf"><span className="ewk">Due</span><input className="in" type="date" aria-label={'Week ' + w.n + ' is due'} defaultValue={w.id === 0 ? isoOf(firstBuildOf(COH)) : o ? dadd(dparse(o), 6).toISOString().slice(0, 10) : ''} /></label></div>; })}</div></div>
    </Modal>}
  </div>;
}
