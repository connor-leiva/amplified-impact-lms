
/* =====================================================================================================
   Four pages with tabs, the home page, and the curriculum. A page's tab is one of yesterday's pages, so
   nothing was drawn twice: inside a tab, a page's own title is dropped and its own tabs become a
   segmented control (see Head and Tabs).
   ===================================================================================================== */
const AreaCtx = createContext(0);
const SOLO = { Overview: 1, Program: 1, Cohort: 1, People: 1, Revenue: 1 };
const AREAS = {
  program: [['curriculum', 'Curriculum'], ['settings', 'Course settings'], ['vault', 'Resource Vault']],
  cohort: [['overview', 'Overview'], ['schedule', 'Schedule'], ['people', 'People'], ['submissions', 'Submissions'], ['community', 'Community'], ['announcements', 'Announcements'], ['settings', 'Settings']],
  people: [['everyone', 'Everyone'], ['teams', 'Teams'], ['utah', 'Utah Life'], ['masquerade', 'Masquerade']],
  revenue: [['summary', 'Summary'], ['payments', 'Payments'], ['plans', 'Plans & upgrades'], ['usage', 'Usage']],
};
const AREA_TABS = Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k, v.map(t => t[0])]));
/* yesterday's page names still work: each one is a tab now */
const ALIAS = { course: ['program', 'settings'], vault: ['program', 'vault'], sessions: ['cohort', 'schedule'], enrolled: ['cohort', 'people'], forms: ['cohort', 'submissions'], community: ['cohort', 'community'], announce: ['cohort', 'announcements'], cohortset: ['cohort', 'settings'],
  teamsall: ['people', 'teams'], groups: ['people', 'utah'], masquerade: ['people', 'masquerade'], billing: ['revenue', 'payments'], tiers: ['revenue', 'plans'], usage: ['revenue', 'usage'] };
const routeOf = (s, id, tab) => ALIAS[s] ? { s: ALIAS[s][0], tab: ALIAS[s][1], sub: tab, id } : AREA_TABS[s] ? (AREA_TABS[s].includes(tab) ? { s, tab, id } : { s, tab: AREA_TABS[s][0], sub: tab, id }) : { s, id, tab };
const aliasOf = r => Object.keys(ALIAS).find(k => ALIAS[k][0] === r.s && ALIAS[k][1] === r.tab);

function Area({ k, t, meta, d, right, counts = {}, children }) {
  const c = useC(), tab = AREA_TABS[k].includes(c.route.tab) ? c.route.tab : AREA_TABS[k][0];
  return <div className="pg area">
    <Head t={t} meta={meta} d={d} right={right} />
    <Tabs v={tab} on={v => c.go(k, null, v)} tabs={AREAS[k].map(([id, l]) => counts[id] === undefined ? [id, l] : [id, l, counts[id]])} />
    <AreaCtx.Provider value={1}><Ctx.Provider value={{ ...c, route: { ...c.route, tab: c.route.sub, sub: undefined } }}><div className="atb" key={tab + '/' + (c.route.sub || '')}>{children(tab)}</div></Ctx.Provider></AreaCtx.Provider>
  </div>;
}

function ProgramArea() {
  return <Area k="program" t={<span className="row nw" style={{ gap: 10 }}><PTile s={28} />{PRG.n}</span>} meta={<Pill v="Program" tone="" />} d="What you teach. A week is built once here, and every cohort that runs it gets the same week on its own dates." counts={{ curriculum: LIB.length }}>
    {tab => tab === 'settings' ? <CourseSet /> : tab === 'vault' ? <Vault /> : <Curriculum3 />}</Area>;
}
function CohortArea() {
  const { go, toast, started } = useC();
  const openEnroll = useEnroll(), full = !!COH.full, wait = full ? CMT.filter(waiting).length : 0;
  return <Area k="cohort" t={<CohortPick big />} meta={<St v={started && full ? 'Active' : COH.st} />} d={PRG.n + ' · ' + shapeOf(COH) + ' · opens ' + COH.opens}
    right={<>{!COH.enroll && <GBtn k="p" perm="account" label="Open enrollment" go={openEnroll}>Open enrollment</GBtn>}<Btn ic="eye" onClick={() => toast('Opens the learner preview of this cohort')}>Preview</Btn><Menu items={[{ l: 'New cohort…', fn: () => go('newcohort') }, { l: 'All settings', fn: () => go('cohortset') }]} /></>}
    counts={{ schedule: SES.length, people: CT.length, community: wait || undefined }}>
    {tab => tab === 'schedule' ? <CohortSchedule /> : tab === 'people' ? <CohortPeople /> : tab === 'submissions' ? <CohortSubs /> : tab === 'community' ? (full ? <Community /> : <QuietTab b="This cohort's threads start when its first members are in." />) : tab === 'announcements' ? (full ? <Announce /> : <QuietTab b="Nothing has been sent to this cohort." />) : tab === 'settings' ? <CohortSettings /> : <CohortOverview />}</Area>;
}
function PeopleArea() {
  return <Area k="people" t="People" d="Everyone with a sign-in, across every product. Each person is counted once, under how they got in." counts={{ everyone: AUD_ALL, teams: TEAMS2.length, utah: 31 }}>
    {tab => tab === 'teams' ? <TeamsPg /> : tab === 'utah' ? <Groups /> : tab === 'masquerade' ? <Masquerade /> : <PeoplePg />}</Area>;
}
function RevenueArea() {
  return <Area k="revenue" t="Revenue" d="What has come in, what is still owed on a payment plan, and what repeats every month. Every figure is from Stripe and opens the payments behind it." counts={{ plans: 2 }}>
    {tab => tab === 'payments' ? <Billing /> : tab === 'plans' ? <Tiers /> : tab === 'usage' ? <Usage /> : <Revenue />}</Area>;
}

/* a field that is filled in from the cohort, shown where the course's shared words are edited */
const FromCohort = ({ l, at, v, lines }) => { const { go } = useC(); return <div className="lab"><span>{l}</span>{at && <span className="fat">Learners see it on {at}</span>}
  <div className="cfb"><span className="pl info">From the cohort</span>{lines ? <ul className="cfl">{lines.map(x => <li key={x}>{x}</li>)}</ul> : <span style={{ fontWeight: 400 }}>{v}</span>}<button type="button" className="lk a" onClick={() => go('cohortset')}>{COH.n.replace(' Cohort', '')} › Settings</button></div></div>; };

/* ---------- Program › Curriculum: the weeks, built once ---------- */
function Curriculum3() {
  const { go, guard, toast, setDlg, log, ph } = useC();
  const pub = w => guard('build', 'Publish ' + w.t, () => setDlg({ title: 'Publish ' + w.t + '?', body: 'Each cohort that runs it gets it on its own date. Until then learners see its title and outcome, locked.', cta: 'Publish', yes: () => { w.st = 'Published'; syncCur(); log('module.publish', w.t, ''); POKE(); toast(w.t + ' is published'); } }));
  const used = id => COHORTS.map(c => { const r = c.run.find(x => x.id === id); return r && [c, r]; }).filter(Boolean);
  const drafts = LIB.filter(w => w.st === 'Draft').length;
  return <div className="col">
    <section className="cd">
      <div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Weeks</h2><span className="me">{LIB.length - drafts} published and {drafts} in draft. Open a week to build it.</span></div><GBtn k="p" ic="plus" perm="build" label="Add a week" go={() => toast('Adds a week at the end as a draft and opens it')}>Add a week</GBtn></div>
      <div className="wkl">{LIB.map(w => { const u = used(w.id); return <div key={w.id} className="wkr">
        {!ph && <span className="grp" title="Drag to reorder" aria-hidden="true"><I n="grip" s={14} /></span>}
        <Wn n={w.id} st={w.st} />
        <button className="wkm" onClick={() => go('week', String(w.id))}><span className="w5 el">{w.t}</span><span className="me el">{w.o}</span></button>
        <div className="wkc"><span className="tn">{w.steps ? w.steps + ' steps' : 'No steps yet'}</span><span className="me">{w.min ? Math.floor(w.min / 60) + ' hr ' + (w.min % 60 ? (w.min % 60) + ' min' : '') : 'Not built'}</span></div>
        <div className="wkc wkd">{u.length ? u.map(([c, r]) => <button key={c.id} className="lk el uin" onClick={() => { setCur(c.id); go('cohort'); }}>{c.n.replace(' Cohort', '')} · Week {r.n}</button>) : <span className="me">No cohort runs it</span>}</div>
        <div className="wks">{w.st === 'Draft' ? <Btn disabled={!w.steps} title={w.steps ? undefined : 'Add a step first'} onClick={() => pub(w)}>Publish</Btn> : <St v="Published" />}</div>
        <Menu items={[{ l: 'Open week', ic: 'builder', fn: () => go('week', String(w.id)) }, { l: 'Preview as a learner', ic: 'eye', fn: () => toast('Opens the learner preview of ' + w.t) }, { l: 'Duplicate', g: 1, fn: () => guard('build', 'Duplicate ' + w.t, () => toast('Duplicated as a draft. Use it when one cohort needs its own version of a week.')) }, '-', w.st === 'Draft' ? { l: 'Publish', g: 1, fn: () => pub(w) } : { l: 'Unpublish', g: 1, d: 1, fn: () => guard('build', 'Unpublish', () => toast('Hidden from learners in every cohort. Their progress is kept.')) }]} />
      </div>; })}</div>
    </section>
    <div className="set2">
      <Card t="Cohorts that run it" right={<Btn ic="plus" onClick={() => go('newcohort')}>New</Btn>}><div className="col m">{COHORTS.map(c => <button key={c.id} className="rnw" onClick={() => { setCur(c.id); go('cohort'); }}><PTile /><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{c.n}</span><span className="me">{c.pick.length} weeks · opens {c.opens}</span></span><I n="chev" s={12} w={2.2} /></button>)}
        <p className="me">A cohort picks its weeks from this list and gives them dates. Change a week here and every cohort that runs it gets the change.</p></div></Card>
      <Card t="Shared by every week"><div className="kvs"><KV rows={[
        ['Course pages', <button className="lk a" onClick={() => go('course')}>Intro, rules, before and after</button>],
        ['Glossary', <button className="lk a" onClick={() => go('course', null, 'glossary')}>10 terms</button>],
        ['Words', <button className="lk a" onClick={() => go('course', null, 'words')}>6 lines learners see</button>],
        ['Resource Vault', <button className="lk a" onClick={() => go('vault')}>{LIB.reduce((a, w) => a + w.kit, 0)} kit files</button>]]} /></div></Card>
    </div>
  </div>;
}

/* ---------- Program › Curriculum › a week: the builder, one section at a time ---------- */
function WeekEdit() {
  const { route, go, guard, toast, ph } = useC();
  const w = LIB.find(x => String(x.id) === String(route.id)) || LIB[0], wi = LIB.indexOf(w);
  const steps = (w.id === 0 ? W0_STEPS : WK_STEPS).slice(0, w.steps);
  const [sec, setSec] = useState(route.tab || 'steps'), [dirty, setDirty] = useState(false), [k, setK] = useState(0);
  const touch = () => setDirty(true);
  const used = COHORTS.map(c => { const r = c.run.find(x => x.id === w.id); return r && { c, r }; }).filter(Boolean), mine = used.find(u => u.c === COH);
  const ses = mine ? SES.filter(s => widOf(s) === w.id) : [];
  const save = () => guard('build', 'Save ' + w.t, () => { setDirty(false); toast(w.t + ' saved' + (used.length > 1 ? ' for ' + used.length + ' cohorts' : '')); });
  return <div className="pg">
    <Head back={['program', 'Curriculum']} t={w.t} meta={<St v={w.st} />} d={w.o}
      right={<><span className="row nw" style={{ gap: 0 }}><button className="ib" aria-label="Previous week" disabled={wi === 0} onClick={() => go('week', String(LIB[wi - 1].id))}><I n="back" /></button><button className="ib" aria-label="Next week" disabled={wi === LIB.length - 1} onClick={() => go('week', String(LIB[wi + 1].id))}><span style={{ display: 'flex', transform: 'scaleX(-1)' }}><I n="back" /></span></button></span><Btn ic="eye" onClick={() => toast('Opens the learner preview of ' + w.t)}>Preview</Btn><Btn k="p" disabled={!dirty} onClick={save}>Save changes</Btn></>} />
    <div className="srg" key={k}>
      <Rail v={sec} on={setSec} items={[['basics', 'Basics'], ['steps', 'Steps', steps.length], ['page', 'Course page'], ['live', 'Live sessions', ses.length], ['cards', 'Hire cards', w.id === 0 ? 0 : 3], ['kit', 'Kit', w.kit]]} />
      <div className="col">
        {sec === 'basics' && <Card t="Basics" sub="What the week is called and what it is for."><div className="col">
          <Fld l="Title" at="the sidebar and the week page"><input className="in" defaultValue={w.t} onChange={touch} /></Fld>
          <Fld l="Outcome" at="the week page, under the title"><input className="in" defaultValue={w.o} onChange={touch} /></Fld>
          <div className="lab"><span>Where it runs</span><span className="fat">A week's number and its date come from the cohort, not from the week.</span>
            {used.length ? <div className="col m">{used.map(u => <button key={u.c.id} className="rnw uir" onClick={() => { setCur(u.c.id); go('cohort'); }}><span className="wn sm pk">{u.r.n}</span><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">Week {u.r.n} of the {u.c.n}</span><span className="me">Opens {u.r.opens} · 12:00 PM MT{u.r.build ? ' · meets ' + u.r.build : ''}</span></span><I n="chev" s={12} w={2.2} /></button>)}</div> : <div className="note"><span className="s2">No cohort runs this week yet. Add it from a cohort's Overview, under The run.</span></div>}</div>
        </div></Card>}
        {sec === 'steps' && <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Steps</h2><span className="me">{steps.length ? 'In order. A learner ticks each one off.' : 'This week has no steps yet.'}</span></div><GBtn ic="plus" perm="build" label="Add a step" go={() => { touch(); toast('Adds a step at the end and opens it'); }}>Add a step</GBtn></div>
          {steps.length ? <div className="wkl">{steps.map((s, i) => <div key={i} className="wkr stp">
            {!ph && <span className="grp" aria-hidden="true"><I n="grip" s={14} /></span>}<span className="wn sm">{i + 1}</span>
            <button className="wkm" onClick={() => toast('Opens the step: its words, who does it, its time, and its Claude and ChatGPT paths')}><span className="w5 el">{s[0]}</span><span className="me el">Done when: {s[3]}</span></button>
            <div className="wkc"><StepWho v={s[1]} /></div><div className="wks tn">{s[2]}</div>
            <Menu items={[{ l: 'Edit step', fn: () => toast('Opens the step') }, { l: 'Move up', fn: touch }, { l: 'Move down', fn: touch }, '-', { l: 'Remove step', d: 1, g: 1, fn: () => guard('build', 'Remove step', touch) }]} /></div>)}</div>
            : <Empty ic="curriculum" t="No steps yet" b="Add the first step, or duplicate a built week and change it." cta="Add a step" on={() => toast('Adds a step and opens it')} />}
        </section>}
        {sec === 'page' && <Card t="Course page" sub="The words on this week's page, above its steps."><div className="col">
          <Fld l="What you will build" at="the week page"><textarea className="in" rows={3} defaultValue={w.o + ' By Friday it has run on your own numbers at least twice.'} onChange={touch} /></Fld>
          <Lines l="Before you start" at="the week page" touch={touch} v={['Last year\'s numbers exported and saved in your AI Office.', 'Both of you can open the cohort skills.']} />
          <Fld l="What done looks like" at="Reference"><textarea className="in" rows={2} defaultValue="The report is turned in, and you can say what you would change next month." onChange={touch} /></Fld>
          <p className="me">What every week shares (the course intro, the rules, the glossary) is in <button className="lk a" onClick={() => go('course')}>Course settings</button>.</p>
        </div></Card>}
        {sec === 'live' && <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Live sessions</h2><span className="me">Sessions belong to the cohort. This week only says what happens in them.</span></div><Btn onClick={() => go('sessions')}>Open Schedule</Btn></div>
          {ses.length ? <div className="wkl">{ses.map(s => <div key={s.n} className="wkr stp"><span className="mt"><I n={s.k === 'Live build' ? 'play' : 'community'} /></span><button className="wkm" onClick={() => go('sessions')}><span className="w5 el">{s.t}</span><span className="me el">{s.d} · {s.time || '12:00 PM'} MT · {ctOf(s.time || '12:00 PM')} CT for learners</span></button><div className="wks"><St v={s.zoom === 'Ready' ? 'Ready' : 'Waiting'} /></div></div>)}</div>
            : <div className="cdb"><p className="s2">{w.id === 0 ? 'The setup week is self-paced. It has no sessions.' : mine ? 'The ' + COH.n + ' has no sessions for this week yet. ' : 'The ' + COH.n + ' doesn\'t run this week. '}{w.id > 0 && mine && <button className="lk a" onClick={() => go('sessions')}>Add them in Schedule</button>}</p></div>}
          {w.id > 0 && <div className="cdb" style={{ borderTop: '1px solid var(--line)' }}><Lines l="Run of show" at="the live build's row on the week page" touch={touch} v={['0:00 What we are building and why', '0:10 Build it together, step by step', '1:00 Run it on your own data', '1:20 What to turn in by Friday']} /></div>}
        </section>}
        {sec === 'cards' && <Card t="Hire cards" sub="The three cards a learner keeps from the week.">{w.id === 0 ? <p className="s2">The setup week has no hire. Cards start with the first building week.</p> : <div className="col m">{[['Seat card', 'What this hire does, for whom, and what it never touches.', 'Written'], ['Playbook card', 'How to run it, check it and fix it.', w.st === 'Draft' ? 'Empty' : 'Written'], ['Sample output', 'One finished report, from made-up numbers.', w.st === 'Draft' ? 'Empty' : 'Written']].map(c => <button key={c[0]} className="rnw" onClick={() => toast('Opens the ' + c[0].toLowerCase())}><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{c[0]}</span><span className="me">{c[1]}</span></span><Pill v={c[2]} tone={c[2] === 'Written' ? 'ok' : ''} /><I n="chev" s={12} w={2.2} /></button>)}</div>}</Card>}
        {sec === 'kit' && <Card t="Kit" sub="The skills and files this week hands out." right={<GBtn ic="plus" perm="build" label="Add to the kit" go={() => toast('Pick from the Resource Vault, or upload')}>Add</GBtn>}>{w.kit ? <div className="col m">{['Map Your Spend skill', 'Lead Source Review skill', 'Week checklist', 'Report template', 'Rubric', 'Sample week', 'Time baseline'].slice(0, w.kit).map((f, i) => <div key={f} className="row nw" style={{ gap: 10 }}><span className="mt"><I n={i < 2 ? 'bolt' : 'file'} /></span><span className="w5 el" style={{ flex: 1 }}>{f}</span><span className="me">{i < 2 ? 'Skill' : 'File'}</span></div>)}<p className="me">Files live in the <button className="lk a" onClick={() => go('vault')}>Resource Vault</button>. A week only points at them.</p></div> : <p className="s2">Nothing in this week's kit yet.</p>}</Card>}
        {dirty && <div className="svb"><span className="w5" style={{ flex: 1 }}>Unsaved changes to {w.t}</span><Btn onClick={() => { setDirty(false); setK(k + 1); }}>Discard</Btn><Btn k="p" onClick={save}>Save changes</Btn></div>}
      </div>
    </div>
  </div>;
}

/* ---------- Overview: the four things, each a link, and what needs you across all of them ---------- */
function Home() {
  const { go, started, ph } = useC();
  const openEnroll = useEnroll();
  const full = !!COH.full, dr = LIB.filter(w => w.st === 'Draft').length, short = COH.n.replace(' Cohort', '');
  const todo = full ? [] : todoOf(COH, go, openEnroll).filter(t => !t[2]);
  const at = (c, fn) => () => { setCur(c.id); fn(); };
  const groups = [...COHORTS.map(c => [c.n + (c.st === 'Draft' ? ' · Draft' : ''), (c.full ? needsOf(go) : todoOf(c, go, openEnroll).filter(t => !t[2]).map(t => ['cohorts', t[0], t[1], t[3], 'warn'])).map(r => [r[0], r[1], r[2], at(c, r[3]), r[4]])]),
    ['Payments and system', [['billing', '3 payments failed', 'Stripe is retrying one. Two need a new card.', () => go('billing', null, 'failed'), 'bad'], ['tiers', '2 teams asked to move up a plan', 'Both from the Agent Plan to the Team Plan.', () => go('tiers'), ''], ['incidents', '1 incident is open', 'Open it in Operations.', () => go('incidents'), 'bad']]]].filter(g => g[1].length);
  const needN = groups.reduce((a, g) => a + g[1].length, 0);
  const tiles = [
    ['Program', 'curriculum', 'AI Accelerator', LIB.length + ' weeks · ' + (LIB.length - dr) + ' published, ' + dr + ' in draft', 'program'],
    ['Cohort', 'cohorts', short, full ? (started ? 'Week 2 of 8' : 'Opens ' + COH.opens) + ' · ' + CT.length + ' of ' + COH.cap + ' seats' : 'Draft · ' + todo.length + ' left before it opens', 'cohort'],
    ['People', 'learners', AUD_ALL + ' with a sign-in', '15 in the cohort · 31 Utah Life, kept apart', 'people'],
    ['Revenue', 'billing', '$82,694 collected', '$7,500 still to collect · $12,429 a month', 'revenue'],
  ];
  const soon = COHORTS.flatMap(c => c.ses.slice(0, 2).map(s => ({ ...s, c }))).slice(0, 4);
  return <div className="pg">
    <Head t="Overview" d="What you teach, who is going through it, who has a sign-in, and what has been paid. Each one opens its page." />
    <div className="thr">{tiles.map(t => <button key={t[0]} className="cd thl" onClick={() => go(t[4])}><span className="tlk"><span className="mt"><I n={t[1]} /></span><span>{t[0]}</span><I n="chev" s={12} w={2.2} /></span><span className="fig el">{t[2]}</span><span className="me">{t[3]}</span></button>)}</div>
    <div className="gms">
      <div className="col">
        <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Needs you</h2><span className="me">Across the cohort, payments and the system</span></div><span className="pl warn">{needN}</span></div>
          <div className="wkl">{groups.map(g => <Fragment key={g[0]}><div className="ngl">{g[0]}</div>{g[1].map(n => <button key={g[0] + n[1]} className="nyr" onClick={n[3]}><span className={'mt' + (n[4] ? ' ' + n[4] : '')}><I n={n[0]} /></span><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{n[1]}</span><span className="me">{n[2]}</span></span><I n="chev" s={12} w={2.2} /></button>)}</Fragment>)}</div></section>
        <AudCard />
      </div>
      <div className="col">
        <Card t="Cohorts" right={<Btn ic="plus" onClick={() => go('newcohort')}>New cohort</Btn>}><div className="col m">{COHORTS.map(c => <button key={c.id} className="rnw" onClick={() => { setCur(c.id); go('cohort'); }}><PTile /><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{c.n}</span><span className="me el">{c.pick.length} weeks · {meetsOf(c)} · opens {c.opens}</span></span><St v={c.st} /></button>)}</div></Card>
        <Card t="Coming up" right={<Btn onClick={() => go('sessions')}>Schedule</Btn>}><div className="col m">{soon.map(s => <button key={s.c.id + s.n} className="rnw" onClick={() => { setCur(s.c.id); go('sessions'); }}><span className="dt"><b>{s.d.split(' ')[2]}</b><span>{s.d.split(' ')[1]}</span></span><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{s.t}</span><span className="me el">{s.d.split(',')[0]} · {s.time || '12:00 PM'} MT{COHORTS.length > 1 ? ' · ' + s.c.n.replace(' Cohort', '') : ''}</span></span>{s.zoom !== 'Ready' && <span className="pl warn">No link</span>}</button>)}</div></Card>
      </div>
    </div>
  </div>;
}

/* ---------- the breadcrumb: Admin / the page / its tab / what is open ---------- */
const DETAIL = { week: 'curriculum', weekcards: 'curriculum', cthread: 'community', workspace: 'teams', user: 'everyone', as: 'masquerade' };
const TODAY = { curriculum: 'Curriculum (today)', builder: 'Module Builder (today)', cohorts: 'Cohorts & Sessions (today)', learners: 'Learners & Teams (today)', workspaces: 'Workspaces (today)', users: 'Users (today)', overview0: 'Overview (today)' };
const hereOf = r => r.s === 'week' ? (LIB.find(w => String(w.id) === String(r.id)) || {}).t : r.s === 'weekcards' ? 'Week Builder' : r.s === 'cthread' ? (CMT.find(x => String(x.id) === String(r.id)) || {}).title : r.s === 'workspace' ? (WS.find(x => x.id === r.id) || {}).n : r.s === 'user' ? (USERS.find(x => x.id === r.id) || {}).n : r.s === 'as' ? 'Learner view' : r.s === 'newcohort' ? 'New cohort' : r.s === 'incident' ? r.id : '';
function Crumbs() {
  const { route, go } = useC();
  const par = PARENT[route.s], key = par || route.s, item = NAV.flatMap(g => g[1]).find(n => n[0] === key), grp = item && NAV.find(g => g[1].includes(item))[0];
  const tk = par ? DETAIL[route.s] : route.tab, tabL = AREAS[key] && tk ? (AREAS[key].find(t => t[0] === tk) || [])[1] : null, here = par ? hereOf(route) || 'Detail' : null;
  const L = (l, fn) => <button className="lk" style={{ fontWeight: 400, color: 'var(--f3)' }} onClick={fn}>{l}</button>, S = <span aria-hidden="true">/</span>;
  return <nav className="bc" aria-label="Breadcrumb"><span>Admin</span>
    {grp && !SOLO[grp] && <>{S}<span>{grp}</span></>}
    {item ? <>{S}{tabL || here ? L(item[1], () => go(item[0])) : <b>{item[1]}</b>}</> : <>{S}<b>{TODAY[route.s] || 'Page'}</b></>}
    {tabL && <>{S}{here ? L(tabL, () => go(key, null, tk)) : <b>{tabL}</b>}</>}
    {here && <>{S}<b className="el">{here}</b></>}
  </nav>;
}
