# Builds AdminMock.jsx: the repo's signed-off admin mockup (design-reference/admin-redesign-r2/AdminRedesign.jsx,
# unchanged) plus the new screens in new-screens.jsx, wired in with the exact-string edits below.
import json
SRC='/home/claude/connor-leiva/amplified-impact-lms/design-reference/admin-redesign-r2/AdminRedesign.jsx'
s=open(SRC,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:90]); s=s.replace(a,b)
form=json.load(open('/home/claude/wk/pkg/src/forms/week-0-intake.json',encoding='utf-8'))['intake']
sections=[{'title':x['title'],'questions':[{k:q[k] for k in ('id','label','kind','required','options') if k in q} for q in x['questions']]} for x in form['sections']]
north=json.load(open('/home/claude/wk/pkg/src/forms/week-0-intake.samples.json',encoding='utf-8'))['submitted']['answers']
new=open('new-screens.jsx',encoding='utf-8').read()+open('community-screens.jsx',encoding='utf-8').read()
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
.fl{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.fl li{display:flex;align-items:center;gap:8px;min-width:0}
.fl svg{flex:none;color:var(--f3)}
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
/* the program's own tile (program-logo.ts, variant "tile"), never under 32px */
.sw img.tile{width:32px;height:32px;border-radius:0;background:none}
/* in the rail the switcher sits on the same centre line as the logo and the icons */
.sb>.menu{display:flex}.sb .sw{margin:0 8px 8px}.sb.rail>.menu{justify-content:center}.sb.rail .sw{margin:0 0 8px;width:36px}.ph .sw img.tile{width:36px;height:36px}
"""
i=s.index('const CSS'); j=s.index('`',i); k=s.index('`;',j+1)
s=s[:k]+css_add+s[k:]
open('AdminMock.jsx','w',encoding='utf-8').write(s)
print('AdminMock.jsx',len(s))
