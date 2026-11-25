# Builds AdminMock.jsx: the repo's signed-off admin mockup (design-reference/admin-redesign-r2/AdminRedesign.jsx,
# unchanged) plus the new screens in new-screens.jsx, wired in with the exact-string edits below.
import json
# the repo's reference as it was at main @ 0ebeb97 (Nov 20). The repo's copy has since taken the sidebar (D-239), so the edits below are made to this copy.
SRC='AdminRedesign.0ebeb97.jsx'
s=open(SRC,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:90]); s=s.replace(a,b)
form=json.load(open('/home/claude/wk/pkg/src/forms/week-0-intake.json',encoding='utf-8'))['intake']
sections=[{'title':x['title'],'questions':[{k:q[k] for k in ('id','label','kind','required','options') if k in q} for q in x['questions']]} for x in form['sections']]
north=json.load(open('/home/claude/wk/pkg/src/forms/week-0-intake.samples.json',encoding='utf-8'))['submitted']['answers']
new=open('new-screens.jsx',encoding='utf-8').read()+open('community-screens.jsx',encoding='utf-8').read()+open('ia-screens.jsx',encoding='utf-8').read()+open('p3-model.jsx',encoding='utf-8').read()+open('p3-cohort.jsx',encoding='utf-8').read()+open('p3-areas.jsx',encoding='utf-8').read()
cm=json.load(open('/home/claude/wk/pkg/src/data/community.samples.json',encoding='utf-8'))
data="const INTAKE_FORM = "+json.dumps({'sections':sections},ensure_ascii=False)+";\nconst NORTHLINE = "+json.dumps(north,ensure_ascii=False)+";\nconst CM_DATA = "+json.dumps({k:cm[k] for k in ("people","spaces","threads")},ensure_ascii=False)+";\n"
# logos as imports esbuild inlines: the academy app lockup (the rail shows the same file through a 26px window, its
# "ai": Connor, Nov 21), and the Accelerator's own tile, rendered from the repo's apps/web/src/home/program-logo.ts
rep("function Wordmark({ short, h = 22 }) {", "function WordmarkOld({ short, h = 22 }) {")
rep('<span className="tile">AA</span>', '<img className="tile" src={LOGO_ACCELERATOR} width={32} height={32} alt="" />')
rep("const GIC = {", "function Wordmark({ short }) { return <span className={'wm' + (short ? ' wm-ai' : '')}><img src={LOGO_APP} width={161} height={34} alt=\"Amplified Impact Academy\" /></span>; }\nconst GIC = {")
i=s.index('import '); j=s.index('\n',i)
s=s[:j+1]+"import LOGO_APP from './logos/amplified-impact-academy-app.svg';\nimport LOGO_ACCELERATOR from './logos/program-accelerator-tile.svg';\n"+s[j+1:]
# data: the two teams the sample-data rule allows written answers for
rep("const WS = [\n", "const WS = [\n  { id: 'ws_northline', n: 'Northline Realty', plan: 'AI Accelerator', used: 2, cap: 2, st: 'Active', last: 'Dec 10, 9:14 AM', owner: 'Alex Morgan', mrr: 'One-time', cus: 'cus_Rn1Nrthlne08', sub: '—' },\n  { id: 'ws_sampleteam', n: 'Sample Team', plan: 'AI Accelerator', used: 2, cap: 2, st: 'Active', last: 'Dec 9, 3:02 PM', owner: 'Jordan Avery', mrr: 'One-time', cus: 'cus_Rs2SmplTm09', sub: '—' },\n")
rep("const USERS = [\n", "const USERS = [\n  { id: 'u_2001', n: 'Alex Morgan', e: 'alex@northlinerealty.example', ws: 'Northline Realty', role: 'Team owner', tier: 'Team', last: 'Dec 10, 9:14 AM', st: 'Active', pr: 1, of: 2 },\n  { id: 'u_2002', n: 'Jordan Avery', e: 'jordan@sampleteam.example', ws: 'Sample Team', role: 'Team owner', tier: 'Team', last: 'Dec 9, 3:02 PM', st: 'Active', pr: 1, of: 2 },\n  { id: 'u_2003', n: 'Dana Whitlock', e: 'dana@sampleteam.example', ws: 'Sample Team', role: 'Operations lead', tier: 'Team', last: 'Dec 9, 1:40 PM', st: 'Active', pr: 1, of: 2 },\n")
# Learners & Teams: two new tabs
rep("const [tab, setTab] = useState('learners'), [q, setQ] = useState(''), [tier, setTier] = useState('All tiers');", "const { route } = useC();\n  const [tab, setTab] = useState(route.tab || 'learners'), [q, setQ] = useState(''), [tier, setTier] = useState('All tiers');")
rep("tabs={[['learners', 'Learners', 148], ['teams', 'Teams', 7]]} />", "tabs={[['learners', 'Learners', 148], ['teams', 'Teams', 7], ['intake', 'Intake', IR.filter(r => r.st === 'Submitted').length + ' of ' + IR.length], ['turnedin', 'Turned in', TI0.length]]} />\n    {tab === 'intake' && <IntakeTab />}\n    {tab === 'turnedin' && <TurnedInTab />}")
# Workspace: two new tabs, and the GHL card above Staff notes
rep("  const [tab, setTab] = useState('members');\n  const [notes, setNotes]", "  const [tab, setTab] = useState(route.tab || 'members');\n  const [notes, setNotes]")
rep("tabs={[['members', 'Members', mem.length], ['plan', 'Plan & entitlements'],", "tabs={[['members', 'Members', mem.length], ['intake', 'Intake'], ['turnedin', 'Turned in', TI0.filter(x => x.ws === w.id).length || undefined], ['plan', 'Plan & entitlements'],")
rep("        {tab === 'plan' && <Gate><Card><KV rows={[['Plan', w.plan],", "        {tab === 'intake' && <WsIntake w={w} />}\n        {tab === 'turnedin' && <WsTurnedIn w={w} />}\n        {tab === 'plan' && <Gate><Card><KV rows={[['Plan', w.plan],")
rep("      <Card t=\"Staff notes\" sub=\"Internal. Never shown to the workspace.\"><div className=\"col m\">", "      <div className=\"col\">{tab === 'intake' && <WsGhl w={w} />}<Card t=\"Staff notes\" sub=\"Internal. Never shown to the workspace.\"><div className=\"col m\">")
rep("{notes.map((n, i) => <div key={i} className=\"note col s\"><span><span className=\"w5\">{n[0]}</span> <span className=\"me\">· {n[1]}</span></span><p className=\"s2\">{n[2]}</p></div>)}\n      </div></Card>\n    </div>", "{notes.map((n, i) => <div key={i} className=\"note col s\"><span><span className=\"w5\">{n[0]}</span> <span className=\"me\">· {n[1]}</span></span><p className=\"s2\">{n[2]}</p></div>)}\n      </div></Card></div>\n    </div>")
# routes
rep("const PARENT = { workspace: 'workspaces',", "const PARENT = { weekcards: 'curriculum', cthread: 'community', workspace: 'workspaces',")
rep("['Support', [['learners', 'Learners & Teams'],", "['Support', [['learners', 'Learners & Teams'], ['forms', 'Forms & Submissions'], ['community', 'Community'],")
rep("const P = {\n", "const P = {\n  community: 'M4 5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3.5V16H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', forms: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',\n")
rep("const SCREENS = { overview: Overview,", data+new+"const SCREENS = { weekcards: WeekCards, forms: Forms, community: Community, cthread: CommunityThread, overview: Overview,")
rep("const [route, setRoute] = useState({ s: 'curriculum' });", "const [route, setRoute] = useState({ s: 'overview' });\n  const [navm, setNavm] = useState('focus'); NAVM = navm;")
# ---- the sidebar proposal (Nov 21): six rows, one open. "Sidebar: today" in the black bar shows prod's nav as it is ----
rep("/* ---------- shell ---------- */\nfunction Sidebar(", "let NAVM = 'focus';\n/* ---------- shell ---------- */\nfunction Sidebar(")
rep("  const [open, setOpen] = useState({ Health: 1, Build: 1 });\n", "  const [open, setOpen] = useState({ Health: 1, Build: 1, Support: 1, Operations: 1 });   // prod today: everything open but Revenue\n  const [peek, setPeek] = useState(undefined);   // proposal: the one group opened by hand (null: all shut); undefined: the group you are in\n  useEffect(() => { setPeek(undefined); }, [active]);\n  const wait = CMT.filter(waiting).length;\n  const badge = n => n[0] === 'community' ? (wait ? wait + ' waiting' : '') : n[0] === 'incidents' && n[3] ? n[3] + (n[3] === '1' ? ' incident' : ' incidents') : n[0] === 'tiers' && n[3] ? n[3] + ' requests' : n[3];\n")
rep("        return <div key={g}><button className={'ng' + (op ? ' op' : '')}", """        if (NAVM === 'focus') { const opn = peek === undefined ? has : peek === g, roll = vis.find(n => badge(n));
          return <div key={g}><button className={'gx' + (has ? ' has' : '') + (opn ? ' op' : '')} aria-expanded={opn} onClick={() => setPeek(opn ? null : g)}><I n={GIC[g]} /><span className="el">{g}</span>{!opn && roll && <span className={'rb' + (roll[0] === 'incidents' ? ' bad' : '')}>{badge(roll)}</span>}<span className="cv"><I n="chev" s={12} w={2.2} /></span></button>
            <div className={'gw' + (opn ? ' op' : '')}><div className="gwi"><div className="gkids">{vis.map(n => <button key={n[0]} tabIndex={opn ? 0 : -1} className={'gk' + (active === n[0] ? ' on' : '')} aria-current={active === n[0] ? 'page' : undefined} onClick={() => go(n[0])}><span className="el">{n[1]}</span>{badge(n) && <span className={'ct' + (n[0] === 'incidents' ? ' bad' : '')}>{badge(n)}</span>}</button>)}</div></div></div></div>; }
        return <div key={g}><button className={'ng' + (op ? ' op' : '')}""")
rep("<nav className=\"nav\" aria-label=\"Admin\">", "<nav className={'nav' + (NAVM === 'focus' && !r ? ' snf' : '')} aria-label=\"Admin\">")
rep("<button onClick={() => setPal(true)}>⌘K palette</button>", "<span className=\"sg\" role=\"group\" aria-label=\"Sidebar\">{[['today', 'Sidebar: today'], ['focus', 'Sidebar: proposed']].map(([k, l]) => <button key={k} className={navm === k ? 'on' : ''} onClick={() => setNavm(k)}>{l}</button>)}</span>\n      <button onClick={() => setPal(true)}>⌘K palette</button>")
rep("const pick = v => go(v, { workspace: 'ws_northshore', user: 'u_1042', incident: 'INC-0007' }[v]);", "const NEW = { 'n:community': ['community'], 'n:cthread': ['cthread', '2'], 'n:cthread-hidden': ['cthread', '5'], 'n:forms': ['forms'], 'n:forms-ti': ['forms', null, 'turnedin'], 'n:intake': ['learners', null, 'intake'], 'n:turnedin': ['learners', null, 'turnedin'], 'n:ws-intake': ['workspace', 'ws_northline', 'intake'], 'n:ws-failed': ['workspace', 'ws_copperbasin', 'intake'], 'n:ws-draft': ['workspace', 'ws_halemarlowe', 'intake'], 'n:ws-turnedin': ['workspace', 'ws_sampleteam', 'turnedin'], 'n:weekcards': ['weekcards'] };\n  const newKey = Object.keys(NEW).find(k => NEW[k][0] === route.s && (NEW[k][1] || null) === (route.id || null) && (NEW[k][2] || undefined) === route.tab);\n  const pick = v => NEW[v] ? go(...NEW[v]) : go(v, { workspace: 'ws_northshore', user: 'u_1042', incident: 'INC-0007' }[v]);")
rep("<select aria-label=\"Screen\" value={route.s} onChange={e => pick(e.target.value)}>", "<select aria-label=\"Screen\" value={newKey || route.s} onChange={e => pick(e.target.value)}>\n        <optgroup label=\"NEW: community\"><option value=\"n:community\">Community</option><option value=\"n:cthread\">Community › a thread</option><option value=\"n:cthread-hidden\">Community › a hidden thread</option></optgroup><optgroup label=\"NEW: forms, uploads, GHL\"><option value=\"n:forms\">Forms &amp; Submissions › Intake</option><option value=\"n:forms-ti\">Forms &amp; Submissions › Turned in</option><option value=\"n:intake\">Learners &amp; Teams › Intake</option><option value=\"n:ws-intake\">Workspace › Intake (submitted)</option><option value=\"n:ws-failed\">Workspace › Intake (GHL failed)</option><option value=\"n:ws-draft\">Workspace › Intake (draft)</option><option value=\"n:turnedin\">Learners &amp; Teams › Turned in</option><option value=\"n:ws-turnedin\">Workspace › Turned in</option><option value=\"n:weekcards\">Week Builder: what changes</option></optgroup>")
rep("<span style={{ fontWeight: 600 }}>Mockup</span>", "<span style={{ fontWeight: 600 }}>Mockup · admin · new screens are first in the list · sample data is made up</span>")
rep("{route.s === 'as' ? 'Learner view' : route.s === 'workspace' ?", "{route.s === 'as' ? 'Learner view' : route.s === 'weekcards' ? 'Week Builder' : route.s === 'cthread' ? (CMT.find(x => String(x.id) === String(route.id)) || {}).title : route.s === 'workspace' ?")
# ---- the sidebar collapsing and opening in motion (Nov 22), the learner sidebar's move with the brand's own timings ----
rep("const { useState, useEffect, useRef, createContext, useContext, Fragment } = React;", "const { useState, useEffect, useLayoutEffect, useRef, createContext, useContext, Fragment } = React;")
rep("  const r = rail && !drawer;\n  return <aside className={'sb' + (r ? ' rail' : '')}>", """  // Collapse and expand travel. Three things, so the width and the layout can change at different moments:
  //   nar   the column is 64px wide        r   the rail's layout (one icon per group)        anim   'collapsing' | 'expanding' while it moves
  // Closing: the column narrows (380 ms, the system's curve) and the logo's window closes to "ai" with it; for the first 160 ms
  // the open layout stays and its words fade; then the layout becomes the rail and the logo tile, the group icons, the collapse
  // button and the avatar glide to their places (240 ms, FLIP), arriving with the edge. Opening: the layout opens at once behind
  // the edge, those glide back out (380 ms, no overshoot), the words fade in and the column springs open (560 ms).
  // Only a click on the button travels: a viewport change, the phone menu and reduced motion switch at once.
  const want = !!rail && !drawer;
  const [r, setLay] = useState(want), [nar, setNar] = useState(want), [anim, setAnim] = useState(null);
  const sbEl = useRef(null), flipFrom = useRef(null), byHand = useRef(false), t1 = useRef(0), t2 = useRef(0), was = useRef(want);
  const ms = v => parseFloat(getComputedStyle(sbEl.current).getPropertyValue(v)), cv = v => getComputedStyle(sbEl.current).getPropertyValue(v).trim();
  const rects = () => { const m = {}; sbEl.current.querySelectorAll('[data-fl]').forEach(el => { m[el.dataset.fl] = el.getBoundingClientRect(); }); return m; };
  useEffect(() => {
    if (was.current === want) return; was.current = want; clearTimeout(t1.current); clearTimeout(t2.current);
    const hand = byHand.current; byHand.current = false;
    if (!hand || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { flipFrom.current = null; setAnim(null); setNar(want); setLay(want); return; }
    if (want) { setNar(true); setAnim('collapsing');
      t1.current = setTimeout(() => { flipFrom.current = { before: rects(), dur: '--aim-dur-base' }; setLay(true); }, ms('--aim-dur-quick'));
      t2.current = setTimeout(() => setAnim(null), ms('--aim-dur-move') + 80);
    } else { flipFrom.current = r ? { before: rects(), dur: '--aim-dur-move' } : null; setLay(false); setNar(false); setAnim('expanding'); t2.current = setTimeout(() => setAnim(null), ms('--aim-dur-spring') + 80); }
  }, [want]);
  useLayoutEffect(() => {
    const f = flipFrom.current; if (!f) return; flipFrom.current = null;
    sbEl.current.querySelectorAll('[data-fl]').forEach(el => { el.getAnimations().forEach(x => x.cancel()); const a = f.before[el.dataset.fl], b = el.getBoundingClientRect(); if (!a || !a.width || !b.width) return;
      const dx = a.left - b.left, dy = a.top - b.top; if (!dx && !dy) return;
      try { el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: ms(f.dur), easing: cv('--aim-ease') }); } catch (err) {} });
  }, [r]);
  useEffect(() => () => { clearTimeout(t1.current); clearTimeout(t2.current); }, []);
  return <aside ref={sbEl} className={'sb' + (r ? ' rail' : '') + (nar ? ' nar' : '') + (anim ? ' a-' + anim : '') + (NAVM === 'focus' ? ' nm-focus' : '')}>""")
rep('<div className="sb-top"><Wordmark short={r} />', '<div className="sb-top"><Wordmark short={nar} />')
rep('<img className="tile" src={LOGO_ACCELERATOR} width={32} height={32} alt="" />{!r &&', '<img className="tile" data-fl="tile" src={LOGO_ACCELERATOR} width={32} height={32} alt="" />{!r &&')
rep("""<button className={'ni' + (has ? ' on' : '')} title={g} aria-label={g + ' menu'} aria-expanded={o} onClick={t}><I n={GIC[g]} /></button>""", """<button className={'ni' + (has ? ' on' : '')} title={g} aria-label={g + ' menu'} aria-expanded={o} onClick={t}><span className="fl" data-fl={g}><I n={GIC[g]} /></span></button>""")
rep("""onClick={() => setPeek(opn ? null : g)}><I n={GIC[g]} /><span className="el">{g}</span>""", """onClick={() => setPeek(opn ? null : g)}><span className="fl" data-fl={g}><I n={GIC[g]} /></span><span className="el">{g}</span>""")
rep("""onClick={() => setRail(!r)}><I n="panel" />{!r && 'Collapse sidebar'}</button>}""", """onClick={() => { byHand.current = true; setRail(!nar); }}><span className="fl" data-fl="panel"><I n="panel" /></span>{!r && <span className="lb">Collapse sidebar</span>}</button>}""")
rep("""<span className="av">{ini(staff.n)}</span>{!r && <span className="col" style={{ gap: 0 }}>""", """<span className="av" data-fl="av">{ini(staff.n)}</span>{!r && <span className="col" style={{ gap: 0 }}>""")
# ---- Nov 25, third pass: four pages with tabs (Program, Cohort, People, Revenue). The sidebar reads as the through
# line. Six of today's pages are replaced and stay reachable from the Screen list, to compare. ----
# the sidebar: Overview and the four pages are single rows; the system pages stay in two groups under a hairline
_i=s.index('const NAV = ['); _j=s.index('\n];',_i)+3
s=s[:_i]+r'''const NAV = [
  ['Overview', [['overview', 'Overview']]],
  ['Program', [['program', 'Program']]],
  ['Cohort', [['cohort', 'Cohort']]],
  ['People', [['people', 'People']]],
  ['Revenue', [['revenue', 'Revenue']]],
  ['Operations', [['health', 'System Health'], ['incidents', 'Incidents', 0, '1'], ['audit', 'Audit Log'], ['api', 'API & Webhooks'], ['jobs', 'Scheduled Jobs'], ['email', 'Email Log'], ['integrations', 'Integrations', 'ops'], ['deploys', 'Deploys & Commits', 'ops'], ['db', 'DB Health', 'ops'], ['flags', 'Environment Flags', 'ops']]],
  ['Access', [['roles', 'Roles & Permissions', 'ops']]],
];'''+s[_j:]
_i=s.index('const PARENT = {'); _j=s.index('};',_i)+2
s=s[:_i]+"const PARENT = { newcohort: 'cohort', week: 'program', weekcards: 'program', cthread: 'cohort', workspace: 'people', user: 'people', incident: 'incidents', as: 'people' };"+s[_j:]
_i=s.index('const GIC = {'); _j=s.index('};',_i)+2
s=s[:_i]+"const GIC = { Overview: 'overview', Program: 'curriculum', Cohort: 'cohorts', People: 'learners', Revenue: 'billing', Operations: 'health', Access: 'roles' };"+s[_j:]
rep("const I = ({ n, s = 16, w }) =>", "Object.assign(P, { program: P.curriculum, course: P.builder, cohort: P.cohorts, sessions: P.play, enrolled: P.learners, people: P.users, teamsall: P.workspaces, groups: P.roles, revenue: P.usage });\nconst I = ({ n, s = 16, w }) =>")
rep("const SCREENS = { weekcards: WeekCards,", "const SCREENS = { program: ProgramArea, cohort: CohortArea, people: PeopleArea, revenue: RevenueArea, newcohort: NewCohort, week: WeekEdit, overview0: Overview, weekcards: WeekCards,")
rep("overview: Overview, health: Health,", "overview: Home, health: Health,")
rep("const [route, setRoute] = useState({ s: 'overview' });", "const [route, setRoute] = useState({ s: 'overview' });\n  const [, pk] = useState(0); POKE = () => pk(x => x + 1);")
rep("[started, setStarted] = useState(true);", "[started, setStarted] = useState(false);")
# yesterday's page names still work: each is a tab of one of the four pages now
rep("const go = (s, id, tab) => { setRoute({ s, id, tab });", "const go = (s, id, tab) => { setRoute(routeOf(s, id, tab));")
rep("<select aria-label=\"Screen\" value={newKey || route.s}", "<select aria-label=\"Screen\" value={newKey || aliasOf(route) || route.s}")
# inside a tab, a page drops its own title, and its own tabs become a segmented control
rep("function Head({ t, d, right, back, meta }) {\n  const { go, ph } = useC();", "function Head({ t, d, right, back, meta }) {\n  const { go, ph } = useC();\n  if (useContext(AreaCtx)) return d || right ? <div className=\"shd\">{d ? <p className=\"s2\">{d}</p> : <span />}{right && <div className=\"row\">{right}</div>}</div> : null;")
rep("function Tabs({ tabs, v, on }) {\n  const { ph } = useC();", "function Tabs({ tabs, v, on }) {\n  const { ph } = useC();\n  if (useContext(AreaCtx) && !ph) return <div className=\"sgm stb\" role=\"tablist\">{tabs.map(([k, l, c]) => <button key={k} type=\"button\" role=\"tab\" aria-selected={v === k} className={v === k ? 'on' : ''} onClick={() => on(k)}>{l}{c !== undefined && <span className=\"tn\">{c}</span>}</button>)}</div>;")
# the sidebar's single rows, its switcher and its counts
_i=s.index('<Menu lf trigger={(t, o) => <button className="sw" aria-expanded={o} aria-label="Switch cohort.'); _e="fn: () => go('cohorts') }]} />"; _j=s.index(_e,_i)+len(_e)
s=s[:_i]+'<CtxSwitch r={r} />'+s[_j:]
rep("        if (r) return <Menu key={g} rt trigger=", """        if (SOLO[g] && r) return <button key={g} className={'ni' + (has ? ' on' : '')} title={g} aria-label={g} aria-current={has ? 'page' : undefined} onClick={() => go(vis[0][0])}><span className="fl" data-fl={g}><I n={GIC[g]} /></span></button>;
        if (SOLO[g]) return <button key={g} className={'gx solo' + (has ? ' has' : '')} aria-current={has ? 'page' : undefined} onClick={() => go(vis[0][0])}><span className="fl" data-fl={g}><I n={GIC[g]} /></span><span className="el">{g}</span>{badge(vis[0]) && <span className={'rb' + (vis[0][0] === 'cohort' && COH.st === 'Draft' ? ' dr' : '')}>{badge(vis[0])}</span>}</button>;
        if (r) return <Menu key={g} rt trigger=""")
rep("return <div key={g}><button className={'gx' + (has ? ' has' : '') + (opn ? ' op' : '')}", "return <div key={g} className={g === 'Operations' ? 'gsep' : undefined}><button className={'gx' + (has ? ' has' : '') + (opn ? ' op' : '')}")
_i=s.index('  const badge = n =>'); _j=s.index('\n',_i)
s=s[:_i]+"  const badge = n => n[0] === 'program' ? (LIB.filter(w => w.st === 'Draft').length ? LIB.filter(w => w.st === 'Draft').length + ' draft' : '') : n[0] === 'cohort' ? (COH.full ? (wait ? wait + ' waiting' : '') : COH.st === 'Draft' ? 'Draft' : '') : n[0] === 'revenue' ? '3 failed' : n[0] === 'incidents' && n[3] ? n[3] + (n[3] === '1' ? ' incident' : ' incidents') : n[3];"+s[_j:]
# the command palette knows the four pages' tabs, and weeks by name
rep("['Pages', NAV.flatMap(g => g[1]).filter(n => m(n[1]) && (!n[2] || can(n[2]))).map(n => ({ ic: n[0], l: n[1], to: [n[0]] }))],", "['Pages', [...NAV.flatMap(g => g[1]).filter(n => m(n[1]) && (!n[2] || can(n[2]))).map(n => ({ ic: n[0], l: n[1], to: [n[0]] })), ...Object.entries(AREAS).flatMap(([k, ts]) => ts.map(t => ({ ic: k, l: k[0].toUpperCase() + k.slice(1) + ' › ' + t[1], to: [k, null, t[0]] }))).filter(x => s && m(x.l))]],")
rep("['Workspaces', WS.filter(w => m(w.n + w.plan)).map(w => ({ ic: 'workspaces', l: w.n, r: w.plan, to: ['workspace', w.id] }))],", "['Teams', WS.filter(w => m(w.n + w.plan)).map(w => ({ ic: 'workspaces', l: w.n, r: w.plan, to: ['workspace', w.id] }))],")
rep("['AI Employees', mods.filter(k => m(k.n)).map(k => ({ ic: 'curriculum', l: k.n, r: k.st, to: ['builder', k.id] }))],", "['Weeks', LIB.filter(w => m(w.t)).map(w => ({ ic: 'curriculum', l: w.t, r: w.st, to: ['week', String(w.id)] }))],")
rep('placeholder="Search users, workspaces, AI Employees, invoices, pages"', 'placeholder="Search people, teams, weeks, invoices, pages"')
# the breadcrumb follows the same four pages
_i=s.rindex('<nav className="bc" aria-label="Breadcrumb">'); _j=s.index('</nav>',_i)+6
s=s[:_i]+'<Crumbs />'+s[_j:]
# the mockup's own bar: the Screen list, and no sidebar switch (the six-row sidebar is live now)
rep("""<span className="sg" role="group" aria-label="Sidebar">{[['today', 'Sidebar: today'], ['focus', 'Sidebar: proposed']].map(([k, l]) => <button key={k} className={navm === k ? 'on' : ''} onClick={() => setNavm(k)}>{l}</button>)}</span>""", "")
rep('''<optgroup label="NEW: community">''', '''<optgroup label="NEW: the four pages"><option value="overview">Overview</option><option value="program">Program › Curriculum</option><option value="n:week">Program › a week</option><option value="course">Program › Course settings</option><option value="vault">Program › Resource Vault</option><option value="cohort">Cohort › Overview</option><option value="sessions">Cohort › Schedule</option><option value="enrolled">Cohort › People</option><option value="forms">Cohort › Submissions</option><option value="community">Cohort › Community</option><option value="announce">Cohort › Announcements</option><option value="cohortset">Cohort › Settings</option><option value="people">People › Everyone</option><option value="teamsall">People › Teams</option><option value="groups">People › Utah Life</option><option value="masquerade">People › Masquerade</option><option value="revenue">Revenue › Summary</option><option value="billing">Revenue › Payments</option><option value="tiers">Revenue › Plans &amp; upgrades</option><option value="usage">Revenue › Usage</option></optgroup><optgroup label="NEW: set up the January cohort"><option value="newcohort">New cohort: six weeks, twice a week</option><option value="n:jan">Skip ahead: January, created</option></optgroup><optgroup label="Today's pages, replaced"><option value="overview0">Overview (today)</option><option value="curriculum">Curriculum (today)</option><option value="builder">Module Builder (today)</option><option value="cohorts">Cohorts &amp; Sessions (today)</option><option value="learners">Learners &amp; Teams (today)</option><option value="workspaces">Workspaces (today)</option><option value="users">Users (today)</option></optgroup><optgroup label="Earlier rounds: community">''')
rep('''<optgroup label="NEW: forms, uploads, GHL">''', '''<optgroup label="Earlier rounds: forms, uploads, GHL">''')
rep("{NAV.map(g => <optgroup key={g[0]} label={g[0]}>{g[1].map(n => <option key={n[0]} value={n[0]}>{n[1]}</option>)}</optgroup>)}", "{NAV.filter(g => !SOLO[g[0]]).map(g => <optgroup key={g[0]} label={g[0]}>{g[1].map(n => <option key={n[0]} value={n[0]}>{n[1]}</option>)}</optgroup>)}")
rep("const NEW = { 'n:community': ['community'],", "const NEW = { 'n:week': ['week', '1'], 'n:community': ['community'],")
rep("const pick = v => NEW[v] ? go(...NEW[v]) :", "const pick = v => v === 'n:jan' ? (seedJan(), go('cohort')) : NEW[v] ? go(...NEW[v]) :")
rep("back={['workspaces', 'Workspaces']}", "back={['teamsall', 'Teams']}")
rep("back={['users', 'Users']}", "back={['people', 'People']}")
rep('<option value="workspace">Workspace detail</option><option value="user">User detail</option>', '<option value="workspace">People › a team</option><option value="user">People › a person</option>')
# Billing keeps its lists as Revenue › Payments; its Summary is Revenue › Summary. A team's page goes back to Teams.
rep("const [tab, setTab] = useState(route.tab || 'summary');\n  const ro = !can('refund');", "const [tab, setTab] = useState(route.tab || 'customers');\n  useEffect(() => { if (route.tab) setTab(route.tab); }, [route.tab]);\n  const ro = !can('refund');")
rep("tabs={[['summary', 'Summary'], ['customers', 'Customers'],", "tabs={[['customers', 'Customers'],")
rep('''d="An operations view of Stripe. Prices, Payment Links, and the Accelerator cap are product rules and are not edited here." />''', '''d="The lists behind the money, from Stripe. Prices and Payment Links are made in Stripe and are not edited here." />''')
rep('''<Head t="Tiers & Upgrades" d="December 2026 Cohort revenue $148,445 · 104 Agent licenses · 7 teams" />''', '''<Head t="Plans & upgrades" d="What each plan costs and holds, and the teams asking to move between them." />''')
rep('''d="What the cohort has told you and sent you, added up. For one team's answers or files, open Learners & Teams."''', '''d="What the cohort has told you and sent you, added up. For one team's answers or files, open the team."''')
# fonts come with the page, not from Google
a=s.index("if (!document.getElementById('arx-font'))"); b=s.index("const el = stage.current;",a)
s=s[:a]+s[b:]
# the few classes the new screens add, in this mockup's own variables
css_add = """
/* added (Nov 2026) for the intake and turned-in screens */
.qa{display:grid;grid-template-columns:minmax(150px,220px) minmax(0,1fr);gap:8px 20px;padding:14px 20px;border-top:1px solid var(--line)}
.qa p{margin:0;max-width:720px}
.ph .qa{grid-template-columns:minmax(0,1fr);padding:14px 16px}
.qkv{display:grid;grid-template-columns:minmax(0,1fr);gap:4px;margin:0}
.qkv dt{color:var(--f3);display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.qkv dd{margin:0 0 14px;min-width:0;overflow-wrap:break-word;max-width:720px}
.qkv dd:last-child{margin-bottom:0}
.fls{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.fls li{display:flex;align-items:center;gap:8px;min-width:0}
.fls svg{flex:none;color:var(--f3)}
.rq{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px 0 8px 22px;border-top:1px solid var(--line)}
.rq>span:last-child{flex:none;color:var(--f2)}
.ty{display:grid;grid-template-columns:minmax(0,1fr) 72px 20px;align-items:center;gap:10px;color:var(--f2)}
.ty .tn{text-align:right;color:var(--ink)}
/* the question reader: the form's questions on the left, every team's answer to the chosen one on the right */
.qr{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);align-items:start}
.ql{display:flex;flex-direction:column;gap:1px;padding:8px;border-right:1px solid var(--line);position:relative;max-height:520px;overflow-y:auto;scrollbar-width:thin;align-self:stretch}
.qls{padding:14px 10px 4px;font-size:var(--m);line-height:var(--ml);color:var(--f3)}
.qls:first-child{padding-top:6px}
.qli{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;width:100%;padding:7px 10px;border:0;background:none;border-radius:8px;font:inherit;line-height:20px;color:var(--f2);text-align:left;cursor:pointer}
.qli>.tn{flex:none;font-size:var(--m);color:var(--f3)}
.qli:hover{background:var(--sub);color:var(--ink)}
.qli.on{background:var(--tint);color:var(--for);font-weight:500}
.qli.on>.tn{color:var(--for)}
.qrh{display:flex;flex-direction:column;gap:2px;padding:16px 20px 18px}
.qrh h3{margin:0;font:600 var(--sh)/22px Geist,sans-serif;color:var(--ink)}
.qrd>.qa:last-child{border-bottom:0}
.cdh .ib:disabled{opacity:.35;cursor:default;background:none}
.ph .qr{grid-template-columns:minmax(0,1fr)}
.ph .ql{border-right:0;border-bottom:1px solid var(--line);max-height:264px}
.ph .qli{padding:11px 10px}
/* community: a post's words, and a post or thread only staff can see */
.cmb{display:grid;gap:10px;max-width:720px}.cmb p{margin:0;overflow-wrap:break-word}
.cmh{background:var(--hov);border-style:dashed}
/* the logo is one image; the rail shows it through a 26px window: its "ai". The window closes with the column */
.wm{display:flex;flex:none;position:relative;left:0;width:161px;overflow:hidden}.wm img{display:block;flex:none}
.sb .wm-ai{width:26px;left:2.5px}
.sb.rail .sb-top{justify-content:flex-start;padding:0 16px}
/* the sidebar collapsing and opening, in the brand's motion (Amplified Impact Motion v1: the same tokens the learner sidebar uses) */
.ax{--aim-ease:cubic-bezier(.2,.7,.2,1);--aim-ease-spring:cubic-bezier(.3,1.3,.6,1);--aim-dur-quick:160ms;--aim-dur-base:240ms;--aim-dur-move:380ms;--aim-dur-spring:560ms}
@supports (animation-timing-function:linear(0,1)){.ax{--aim-ease-spring:linear(0,0.011,0.041,0.087,0.143,0.208,0.278,0.351,0.425,0.497,0.567,0.634,0.696,0.754,0.807,0.854,0.895,0.932,0.963,0.989,1.011,1.029,1.043,1.053,1.06,1.065,1.067,1.068,1.067,1.065,1.062,1.058,1.053,1.048,1.043,1.038,1.033,1.029,1.024,1.02,1.016,1.013,1.009,1.007,1.004,1.002,1)}}
.sb.nar{width:64px}
.fl{display:flex;flex:none}
.sb.a-collapsing{transition:width var(--aim-dur-move) var(--aim-ease);overflow:clip}
.sb.a-expanding{transition:width var(--aim-dur-spring) var(--aim-ease-spring);overflow:clip}
.sb[class*=" a-"] .wm{transition:width var(--aim-dur-move) var(--aim-ease),left var(--aim-dur-move) var(--aim-ease)}
/* each layout keeps its own width whatever the column is doing, so nothing inside re-wraps or drifts on the way; the edge clips it */
.sb[class*=" a-"]:not(.rail)>*{min-width:243px}
.sb[class*=" a-"].rail>*{max-width:63px}
.sb.a-collapsing:not(.rail) :is(.gx>.el,.gx .rb,.gx .cv,.gw,.sw>.col,.sw>.mu,.lb,.uc>.col,.ng,.nav:not(.snf) .ni){opacity:0;transition:opacity var(--aim-dur-quick) var(--aim-ease)}
.sb.a-collapsing:not(.rail) .sw{border-color:transparent;background-color:transparent;transition:border-color var(--aim-dur-quick) var(--aim-ease),background-color var(--aim-dur-quick) var(--aim-ease)}
.sb.a-collapsing:not(.rail) :is(.gx.has,.gk.on){background-color:transparent;transition:background-color var(--aim-dur-quick) var(--aim-ease)}
@keyframes sbfade{from{opacity:0}}
@keyframes sbbox{from{border-color:transparent;background-color:transparent}}
.sb.a-expanding :is(.gx>.el,.gx .rb,.gx .cv,.gw,.sw>.col,.sw>.mu,.lb,.uc>.col,.ng,.nav:not(.snf) .ni){animation:sbfade var(--aim-dur-base) var(--aim-ease) backwards}
.sb.a-expanding .sw{animation:sbbox var(--aim-dur-base) var(--aim-ease) backwards}
/* today's nav has no icon in common between its two layouts, so there the rail's icons fade in */
.sb.a-collapsing.rail:not(.nm-focus) .nav .ni{animation:sbfade var(--aim-dur-base) var(--aim-ease) backwards}
.sb.rail .ni.on{transition:background-color var(--aim-dur-base) var(--aim-ease)}
@media (prefers-reduced-motion:reduce){.sb,.sb .wm{transition:none!important}}
/* the sidebar proposal: six rows, one open. A group is a row with its icon; its pages hang from it on a guide line, as the learner sidebar's Weeks do */
.nav.snf{padding:6px 8px 16px}
.gx{display:flex;align-items:center;gap:10px;width:100%;height:var(--cp);padding:0 8px;margin-top:2px;border:0;background:none;border-radius:8px;font-size:calc(var(--t) - 1px);font-weight:500;color:var(--ink);cursor:pointer;text-align:left;white-space:nowrap}
.ph .gx{font-size:16px}
.gx>.fl{color:var(--f2)}
.gx:hover{background:var(--sub)}
.gx.has,.gx.has>.fl{color:var(--for)}
.gx.has:not(.op){background:var(--tint)}
.gx>.el{flex:none}.gx .rb{margin-left:auto;font-size:12px;font-weight:400;color:var(--f3);min-width:0;overflow:hidden;text-overflow:ellipsis}.gx .rb.bad{color:var(--bad);font-weight:500}
.ph .gx .rb{font-size:16px}
.gx .cv{margin-left:auto;display:flex;color:var(--f3)}.gx .rb+.cv{margin-left:8px}
.gx .cv svg{transition:transform .2s ease}.gx.op .cv svg{transform:rotate(90deg)}
.gw{display:grid;grid-template-rows:0fr;transition:grid-template-rows .2s ease}.gw.op{grid-template-rows:1fr}
.gwi{overflow:hidden;min-height:0;visibility:hidden;transition:visibility 0s .2s}.gw.op .gwi{visibility:visible;transition-delay:0s}
.gkids{margin:2px 0 6px 15.5px;padding-left:10px;border-left:1px solid var(--line);display:flex;flex-direction:column;gap:1px}
.gk{display:flex;align-items:center;gap:8px;width:100%;height:calc(var(--c) - 2px);padding:0 8px;border:0;background:none;border-radius:7px;font-size:calc(var(--t) - 1px);font-weight:400;color:var(--f2);cursor:pointer;text-align:left;white-space:nowrap}
.ph .gk{font-size:16px;height:var(--c)}
.gk:hover{background:var(--sub);color:var(--ink)}
.gk.on{background:var(--tint);color:var(--for);font-weight:500}
.gk .ct{margin-left:auto;font-size:11px;font-weight:500;color:var(--f2);background:var(--sf);border:1px solid var(--line);border-radius:999px;padding:0 6px;line-height:16px}.gk .ct.bad{color:var(--bad);border-color:var(--badb);background:var(--badb)}
.ph .gk .ct{font-size:16px;line-height:24px;padding:0 8px}
@media (prefers-reduced-motion:reduce){.gw,.gwi,.gx .cv svg{transition:none}}
/* ---- Nov 25: program, cohort, people, revenue ---- */
/* a fact that opens the list it counts */
.fx>.fxl{background:var(--sf);border:0;padding:12px 34px 12px 20px;display:flex;flex-direction:column;gap:2px;flex:1 0 auto;max-width:100%;white-space:nowrap;text-align:left;cursor:pointer;position:relative;color:inherit;transition:background-color .12s}
.fx>.fxl:hover{background:var(--hov)}.fx>.fxl>svg{position:absolute;right:14px;top:50%;margin-top:-6px;color:var(--line2);transition:color .12s,transform .12s}.fx>.fxl:hover>svg{color:var(--for);transform:translateX(2px)}
.ph .fx>.fxl{padding:12px 26px 12px 12px;min-width:0}.ph .fx>.fxl>span{max-width:100%;overflow:hidden;text-overflow:ellipsis}.ph .fx>.fxl>span:nth-child(2){font-size:15px}.ph .fx>.fxl>svg{right:8px}
.ph .fx>.fxl:last-child:nth-child(odd){grid-column:1/-1}.ph .fx>.fxw{grid-column:1/-1}
.stat{transition:border-color .12s,box-shadow .12s}button.stat{cursor:pointer;position:relative}button.stat:hover{border-color:var(--line2);box-shadow:0 2px 8px rgba(21,33,29,.06)}
button.stat::after{content:"";position:absolute;right:14px;top:18px;width:6px;height:6px;border-right:1.5px solid var(--line2);border-top:1.5px solid var(--line2);transform:rotate(45deg);transition:border-color .12s}button.stat:hover::after{border-color:var(--for)}
/* the cohort picker: in a page's title on This cohort, beside it elsewhere */
.cpk{display:inline-flex;align-items:center;gap:8px;height:var(--c);padding:0 8px 0 6px;border:1px solid var(--line2);border-radius:8px;background:var(--sf);font-size:calc(var(--t) - 1px);font-weight:500;color:var(--ink);cursor:pointer;max-width:100%;box-shadow:0 1px 1px rgba(21,33,29,.04)}
.cpk:hover{background:var(--hov)}.cpk>svg{color:var(--f3);flex:none}.cpk img{border-radius:5px;flex:none}
.cpk.big{height:auto;padding:2px 8px 2px 0;margin:-2px 0;border-color:transparent;background:none;box-shadow:none;font:inherit;letter-spacing:inherit;border-radius:8px;gap:6px}
.cpk.big:hover{background:var(--sub)}.cpk.big:hover>svg{color:var(--ink)}
.hd h1 .menu{max-width:100%}
/* a section list down the left, one section on screen at a time */
.srg{display:grid;grid-template-columns:216px minmax(0,1fr);gap:24px;align-items:start}.ph .srg{grid-template-columns:minmax(0,1fr);gap:16px}
.srl{display:flex;flex-direction:column;gap:1px;position:sticky;top:0}
.srb{display:flex;align-items:center;gap:8px;height:var(--c);padding:0 10px;border:0;background:none;border-radius:8px;font-size:calc(var(--t) - 1px);color:var(--f2);cursor:pointer;text-align:left}
.srb:hover{background:var(--sub);color:var(--ink)}.srb.on{background:var(--tint);color:var(--for);font-weight:500}.srb .el{flex:1}.srb .tn{font-size:var(--m);color:var(--f3);font-weight:400}
.fat{font-weight:400;font-size:var(--m);line-height:var(--ml);color:var(--f3);margin-top:-4px}
textarea.in{height:auto;padding:8px 10px;line-height:var(--tl);resize:vertical}
.lns{display:flex;flex-direction:column;gap:6px}.ln{display:flex;align-items:center;gap:4px}.ln .in{flex:1;font-weight:400}
.grp{display:flex;align-items:center;justify-content:center;width:20px;height:var(--c);color:var(--line2);cursor:grab;flex:none}.wkr:hover .grp,.ln:hover .grp{color:var(--f3)}
/* a week, a step, anything in an ordered list that opens */
.wkl{display:flex;flex-direction:column}.wkl>*+*{border-top:1px solid var(--line)}
.wkr{display:flex;align-items:center;gap:12px;padding:10px 12px 10px 8px;min-height:60px}.ph .wkr{flex-wrap:wrap;padding:12px 12px 12px 16px;gap:8px 12px}
.wkr.stp{padding-left:12px}.wkr:hover{background:var(--hov)}
.wn{width:28px;height:28px;border-radius:8px;background:var(--tint);color:var(--for);font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;flex:none;font-variant-numeric:tabular-nums}
.wn.off{background:var(--sub);color:var(--f3)}.wn.sm{width:24px;height:24px;border-radius:6px;font-size:12px;background:var(--sub);color:var(--f2)}
.wkm{flex:1 1 220px;min-width:0;display:flex;flex-direction:column;border:0;background:none;padding:0;text-align:left;cursor:pointer;color:inherit;border-radius:4px}
.wkm:hover .w5{color:var(--for);text-decoration:underline;text-decoration-color:var(--mint);text-underline-offset:3px}
.wkc{flex:0 0 104px;display:flex;flex-direction:column;min-width:0;font-size:calc(var(--t) - 1px)}.wkc.wkd{flex-basis:172px}.stp .wkc{flex:0 0 196px}.stp .wkc .row{flex-wrap:nowrap}.ph .stp .wkc{flex:1 1 auto}.wks{flex:0 0 96px;display:flex;justify-content:flex-start;font-size:calc(var(--t) - 1px)}
.lap .wkc{flex-basis:120px}.lap .wkc.wkd{display:none}
.rdn{flex:none;white-space:nowrap;text-align:right;min-width:44px}
/* on a phone a row is two lines: what it is and its menu, then when and where it stands */
.ph .wkr .wn{order:0}.ph .wkm{order:1;flex:1 1 calc(100% - 100px)}.ph .wkr>.menu{order:2}.ph .wkc{display:none}.ph .wkc.wkd,.ph .stp .wkc{display:flex;order:3;flex:1 1 auto;margin-left:40px}.ph .stp .wkc{margin-left:36px}.ph .wks{order:4;flex:0 0 auto;align-items:center}
.ph .chs{flex-wrap:nowrap;overflow-x:auto;margin:0 -16px;padding:0 16px 2px;scrollbar-width:none}.ph .chs::-webkit-scrollbar{display:none}.ph .ch{flex:none}
/* a row that opens something: a card's link row, a needs-you row, a readiness row */
.rnw,.nyr,.rdy{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;text-align:left;cursor:pointer;color:inherit;font-size:calc(var(--t) - 1px)}
.rnw{padding:8px;margin:-4px -8px;width:calc(100% + 16px);border-radius:8px}.rnw:hover{background:var(--sub)}.rnw>svg:last-child,.nyr>svg:last-child{color:var(--line2);flex:none}.rnw:hover>svg:last-child,.nyr:hover>svg:last-child{color:var(--for)}
.rnw img{border-radius:8px;flex:none}
.nyr{padding:12px 16px 12px 20px;min-height:60px}.nyr:hover{background:var(--hov)}.nyr.rn{min-height:52px;padding-block:8px}
.nyr.now{background:linear-gradient(90deg,var(--tint),transparent 60%)}
.mt.bad{background:var(--badb);color:var(--bad)}.mt.warn{background:var(--warnb);color:var(--warn)}.mt.off{background:var(--sub);color:var(--f3)}
.rdy{padding:6px 8px;margin:-2px -8px;width:calc(100% + 16px);border-radius:8px;gap:10px}.rdy:hover{background:var(--sub)}
.dt{width:36px;height:40px;border-radius:8px;border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;line-height:1}.dt b{font-size:15px;font-weight:600}.dt span{font-size:10px;color:var(--f3);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
/* unsaved changes: one bar, at the bottom of what you are editing */
.svb{position:sticky;bottom:16px;display:flex;align-items:center;gap:8px;padding:10px 12px 10px 16px;background:var(--ink);color:#F4F2EC;border-radius:12px;box-shadow:0 8px 24px rgba(21,33,29,.18);font-size:calc(var(--t) - 1px);z-index:3}
.svb .b{border-color:#47534E;background:#202D28;color:#F4F2EC;box-shadow:none}.svb .b:hover{background:#2A3832}.svb .b.p{background:var(--mint);border-color:var(--mint);color:var(--ink)}.svb .b.p:hover{background:#86DDB5}
/* audiences: chips to filter by, a bar to see the split */
.chs{display:flex;flex-wrap:wrap;gap:6px}
.ch{display:inline-flex;align-items:center;gap:7px;height:var(--c);padding:0 12px;border:1px solid var(--line2);border-radius:999px;background:var(--sf);font-size:calc(var(--t) - 1px);font-weight:500;color:var(--f2);cursor:pointer}
.ch:hover{color:var(--ink);background:var(--hov)}.ch.on{background:var(--ink);border-color:var(--ink);color:#fff}.ch i,.pl.aud i,.auk>i,.lg i{width:8px;height:8px;border-radius:2px;flex:none;display:block}
.ch .tn{font-weight:400;color:var(--f3)}.ch.on .tn{color:#C9D2CD}
.aub{display:flex;gap:2px;height:10px;border-radius:5px;overflow:hidden}.aub i{display:block;min-width:4px}
.aul{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}.lap .aul{grid-template-columns:repeat(3,minmax(0,1fr))}.ph .aul{grid-template-columns:repeat(2,minmax(0,1fr))}
.auk{display:flex;align-items:flex-start;gap:8px;padding:8px;margin:0 -8px 0 0;border:0;background:none;border-radius:8px;text-align:left;cursor:pointer;color:inherit}.auk:hover{background:var(--sub)}.auk>i{margin-top:8px}.auk .w5{font-size:17px;line-height:24px}
/* revenue: cash by month */
.rvc{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;align-items:end;height:300px}.ph .rvc{gap:6px;height:180px}
.rvm{display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;min-width:0}.rvb{flex:1;width:100%;max-width:72px;display:flex;align-items:flex-end;border-bottom:1px solid var(--line)}
.rvb i{display:block;width:100%;border-radius:6px 6px 0 0;background:var(--for)}
.hat{background:repeating-linear-gradient(135deg,#BFE3D0 0 6px,#E7F1EB 6px 12px)!important}
.lg{display:inline-flex;align-items:center;gap:6px;font-size:var(--m);color:var(--f2)}.ph .rvm .me{font-size:11px}
/* ---- Nov 25, second pass: offerings, a new offering, setup, a new cohort ---- */
.ptl{display:flex;align-items:center;justify-content:center;flex:none;border:1.5px dashed var(--line2);background:var(--hov);color:var(--f3);font-weight:600;line-height:1}
.nyr.ofr{min-height:72px;gap:16px}.ofc{flex:0 0 220px;font-size:calc(var(--t) - 1px)}.lap .ofc:nth-of-type(2){display:none}.ph .nyr.ofr{flex-wrap:wrap}.ph .ofc{flex:1 1 100%;padding-left:56px}
.sgm{display:inline-flex;border:1px solid var(--line2);border-radius:8px;overflow:hidden;background:var(--sf);align-self:flex-start}
.ph .sgm button{padding:0 9px}.sgm button{white-space:nowrap;height:var(--c);padding:0 12px;border:0;border-right:1px solid var(--line2);background:none;font-size:calc(var(--t) - 1px);font-weight:500;color:var(--f2);cursor:pointer}.sgm button:last-child{border-right:0}
.sgm button:hover{background:var(--hov)}.sgm button.on{background:var(--tint);color:var(--for)}
.stp2{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line2);border-radius:8px;background:var(--sf);align-self:flex-start;height:var(--c)}.stp2 b{min-width:28px;text-align:center;font-weight:600}.stp2 .ib{height:calc(var(--c) - 2px);font-size:16px}.stp2 .ib:disabled{opacity:.35;cursor:default}
.slt .in{flex:1 1 0;min-width:0;font-weight:400}.ph .slt{flex-wrap:wrap}.ph .slt .in{flex:1 1 40%}
.ckr{display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:calc(var(--t) - 1px)}.ckr input{margin:3px 0 0;width:16px;height:16px;accent-color:var(--for);flex:none}
.opt{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border:1px solid var(--line2);border-radius:10px;background:var(--sf);text-align:left;cursor:pointer;color:inherit;font-size:calc(var(--t) - 1px)}
.opt:hover{background:var(--hov)}.opt.on{border-color:var(--for);box-shadow:0 0 0 1px var(--for);background:var(--tint)}
.skf{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden}.skf>div{background:var(--sf);padding:10px 12px;display:flex;flex-direction:column}.skf b{font-size:20px;line-height:26px;font-weight:600}
.skl,.ncl{display:flex;flex-direction:column;gap:6px}.skw{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.skc{display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:6px;background:var(--tint);color:var(--for);font-size:var(--m);font-weight:500;white-space:nowrap}
.skc.alt{background:var(--infob);color:var(--info)}.skc.off{background:var(--sub);color:var(--f3)}.skc.bad{background:var(--badb);color:var(--bad)}
.ncl{max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:10px 12px;gap:10px;font-weight:400}.ncw{display:flex;align-items:flex-start;gap:10px}
.thn{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;color:var(--f2);font-size:calc(var(--t) - 1px)}
.tdc{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--line2);display:flex;align-items:center;justify-content:center;flex:none;color:#fff}
.tdo.ok .tdc{background:#2E9A63;border-color:#2E9A63}.tdo.ok .w5{color:var(--f2);font-weight:400}div.tdo{cursor:default}div.tdo:hover{background:none}
/* the program's own tile (program-logo.ts, variant "tile"), never under 32px */
.sw img.tile{width:32px;height:32px;border-radius:0;background:none}
/* in the rail the switcher sits on the same centre line as the logo and the icons */
.sb>.menu{display:flex}.sb .sw{margin:0 8px 8px}.sb.rail>.menu{justify-content:center}.sb.rail .sw{margin:0 0 8px;width:36px}.ph .sw img.tile{width:36px;height:36px}
"""
css_add += r"""/* ---- third pass: four pages with tabs ---- */
.area>.atb{display:flex;flex-direction:column;gap:20px;min-width:0}.ph .area>.atb{gap:16px}
.area .atb .pg{padding:0;max-width:none;margin:0}
.shd{display:flex;gap:12px 16px;align-items:center;justify-content:space-between;flex-wrap:wrap}.shd>p{max-width:720px;margin:0}.shd .b{height:var(--cp);padding:0 14px}
.sgm.stb{flex:none}.sgm .tn{margin-left:6px;font-weight:400;color:var(--f3)}.sgm button.on .tn{color:var(--for)}
.area>.tabs{overflow-x:auto;scrollbar-width:none}.area>.tabs .tab{white-space:nowrap;flex:none}
/* the sidebar's single rows, and the hairline above the system pages */
.gx.solo .rb{margin-left:auto}.gx .rb.dr{color:var(--warn)}
.gsep{margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}
/* Overview: the four things, each a link */
.thr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.lap .thr{grid-template-columns:repeat(2,minmax(0,1fr))}.ph .thr{grid-template-columns:minmax(0,1fr);gap:12px}
.thl{display:flex;flex-direction:column;gap:4px;align-items:stretch;text-align:left;padding:14px 16px 16px;cursor:pointer;color:inherit;transition:border-color .12s,box-shadow .12s;min-width:0}
.thl:hover{border-color:var(--line2);box-shadow:0 2px 8px rgba(21,33,29,.06)}
.tlk{display:flex;align-items:center;gap:8px;font-size:var(--m);font-weight:500;color:var(--f2);margin-bottom:6px}.tlk .mt{width:24px;height:24px;border-radius:6px}.tlk .mt svg{width:14px;height:14px}
.tlk>svg:last-child{margin-left:auto;color:var(--line2);transition:color .12s,transform .12s}.thl:hover .tlk>svg:last-child{color:var(--for);transform:translateX(2px)}
.thl .fig{font-size:20px;line-height:28px}.thl .me{white-space:normal}
/* a cohort's settings: two columns of cards */
.set2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}.lap .set2,.ph .set2{grid-template-columns:minmax(0,1fr)}
.cfx{display:grid;grid-template-columns:116px minmax(0,1fr);gap:4px 16px;font-size:calc(var(--t) - 1px)}.ph .cfx{grid-template-columns:minmax(0,1fr)}
.cfl{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:2px;font-weight:400}
.cfb{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:12px 14px;border:1px dashed var(--line2);border-radius:10px;background:var(--hov);font-size:calc(var(--t) - 1px)}
/* picking a cohort's weeks from the program's */
.wpl{display:flex;flex-direction:column}.wpl>*+*{border-top:1px solid var(--line)}
.wpk{display:flex;align-items:center;gap:12px;padding:10px 20px;min-height:56px;cursor:pointer;font-size:calc(var(--t) - 1px)}.wpk:hover{background:var(--hov)}.ph .wpk{padding:10px 16px;flex-wrap:wrap}
.wpk input{width:16px;height:16px;accent-color:var(--for);flex:none;margin:0}.wpk:not(.on) .w5,.wpk:not(.on) .me{color:var(--f3)}.wpk:not(.on) .w5{font-weight:400}
.wn.sm.pk{background:var(--tint);color:var(--for)}
.ewl{display:flex;flex-direction:column;gap:6px;margin-top:2px}.ewr{display:grid;grid-template-columns:24px minmax(0,1fr) 150px 150px;gap:8px;align-items:center;font-weight:400}.ewf{display:block;min-width:0}.ewf .in{min-width:0;width:100%}.ewk{display:none}
.ewh{color:var(--f3);font-size:var(--m);line-height:var(--ml)}
.ph .ewh{display:none}.ph .ewl{gap:14px}.ph .ewr{grid-template-columns:24px minmax(0,1fr);row-gap:6px}.ph .ewf{grid-column:2;display:grid;grid-template-columns:64px minmax(0,1fr);align-items:center}.ph .ewk{display:block;color:var(--f3)}
.ncl.free{max-height:none}
.skc.wrn{background:var(--warnb);color:var(--warn)}
.ngl{padding:8px 20px;font-size:var(--m);line-height:var(--ml);font-weight:500;color:var(--f3);background:var(--hov)}.ph .ngl{padding:8px 16px}
.lk.uin{font-weight:400;color:var(--f2)}.uir{margin:0;width:100%;border:1px solid var(--line);padding:8px 12px}
"""
i=s.index('const CSS'); j=s.index('`',i); k=s.index('`;',j+1)
s=s[:k]+css_add+s[k:]
open('AdminMock.jsx','w',encoding='utf-8').write(s)
print('AdminMock.jsx',len(s))
