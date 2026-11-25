/* =====================================================================================================
   NEW (Nov 20, 2026). How the LMS's intake form, Turn in and the GHL sync reach the admin portal.
   Drawn with this mockup's own primitives (Head, Tabs, Table, Card, KV, Facts, St, Pill, Btn) and its CSS.
   The few classes added for these screens are at the end of CSS, marked "added".
   Made-up sample data: Northline Realty (Alex Morgan) and the skills' Sample Team (Jordan Avery, Dana Whitlock)
   carry the written answers; the other rows are this mockup's own teams.
   ===================================================================================================== */
const QS = INTAKE_FORM.sections.flatMap(s => s.questions.map(q => ({ ...q, sec: s.title })));
const QN = QS.length;
const SAMPLE_TEAM = { name: 'Jordan Avery, jordan@sampleteam.example', team: 'Sample Team', size: '6 agents, 2 staff', 'lead-desk': 'Dana Whitlock', cadence: 'Tuesday 8:30 AM team meeting. Jordan runs it.', 'one-on-ones': 'Monthly, with every agent.', operator: 'A teammate', 'operator-name': 'Dana Whitlock, dana@sampleteam.example', invited: 'Yes', ai: 'ChatGPT', plan: 'ChatGPT Business', account: "The operator's account (our default)", 'chatgpt-admin': 'Yes', books: 'QuickBooks Online', 'books-close': 'Dana owns them. They close by the 10th.', sisu: 'No.', crm: 'Follow Up Boss.', google: 'Yes', 'google-other': '', tasks: 'A shared Google Sheet.', problems: 'Leads from the portal go cold over the weekend. Nobody knows what last month made until the 20th. Listing checklists live in three places.', access: 'None that we know of.' };
/* st: Submitted | Draft | Not started.  ghl: Synced | Pending | Failed | '' (nothing to send yet) */
const IR = [
  { id: 'ws_northline', n: 'Northline Realty', owner: 'Alex Morgan', st: 'Submitted', when: 'Nov 19, 4:02 PM', by: 'Alex Morgan', done: 21, op: 'A teammate', opn: 'Operations lead', ghl: 'Synced', a: NORTHLINE },
  { id: 'ws_sampleteam', n: 'Sample Team', owner: 'Jordan Avery', st: 'Submitted', when: 'Nov 18, 10:15 AM', by: 'Jordan Avery', done: 21, op: 'A teammate', opn: 'Dana Whitlock', ghl: 'Synced', a: SAMPLE_TEAM },
  { id: 'ws_copperbasin', n: 'Copper Basin Realty', owner: 'Devon Achterberg', st: 'Submitted', when: 'Nov 20, 9:40 AM', by: 'Devon Achterberg', done: 20, op: "I'm both", opn: 'The owner', ghl: 'Failed', a: { operator: "I'm both", ai: 'Claude', plan: 'Claude Pro', google: 'No', 'google-other': 'Microsoft 365', books: 'Xero', sisu: 'Yes.', crm: 'Lofty.', problems: 'Follow-up on old leads. Month-end numbers. Agent onboarding.' } },
  { id: 'ws_halemarlowe', n: 'Hale & Marlowe Realty', owner: 'Jordan Hale', st: 'Draft', when: 'Saved Nov 20, 2:11 PM', by: 'Jordan Hale', done: 9, op: '', opn: '', ghl: '', a: { ai: 'Claude', plan: 'Not on a paid plan yet', google: 'Yes', books: 'QuickBooks Online' } },
  { id: 'ws_lantern', n: 'Lantern Street Partners', owner: 'Tessa Lindqvist', st: 'Draft', when: 'Saved Nov 17, 8:05 AM', by: 'Tessa Lindqvist', done: 4, op: '', opn: '', ghl: '', a: { ai: 'ChatGPT' } },
  { id: 'ws_northshore', n: 'Northshore Group', owner: 'Elena Vargas', st: 'Not started', when: '', by: '', done: 0, op: '', opn: '', ghl: '', a: {} },
  { id: 'ws_redcliff', n: 'Red Cliff Collective', owner: 'Noor Haddad', st: 'Not started', when: '', by: '', done: 0, op: '', opn: '', ghl: '', a: {} },
];
/* "To sort out": what a team's answers say has to be fixed before the first build. Worked out from the answers.
   Sisu and the CRM are written answers today, so those two are read by rule: an answer that starts with "No" is not
   on Sisu; an answer that doesn't name Follow Up Boss (or FUB) is not on FUB. A question left blank raises no flag. */
const FLAGS = [
  ['No operator named', r => !r.a.operator],
  ['Operator not invited', r => r.a.operator === 'A teammate' && r.a.invited === 'Not yet'],
  ['Not on a paid plan yet', r => r.a.plan === 'Not on a paid plan yet'],
  ['Not on Google', r => r.a.google === 'No'],
  ['Not on Sisu', r => /^\s*no\b/i.test(r.a.sisu || '')],
  ['Not on FUB', r => !!r.a.crm && !/follow up boss|\bfub\b/i.test(r.a.crm)],
];
IR.forEach(r => { r.flags = r.st === 'Not started' ? [] : FLAGS.filter(f => f[1](r)).map(f => f[0]); });
const IST = { Submitted: 'ok', Draft: 'warn', 'Not started': '' };
const GHL_ERR = '401 Unauthorized from GHL API';
/* Turned in. st is staff-only: Received | Picked for a live read | Reviewed. The team never sees it. */
const TI0 = [
  { id: 'sub_3', ws: 'ws_sampleteam', team: 'Sample Team', kind: 'Checkpoint', wk: 'Week 1 · Step 6', files: [['Seat card (made up).pdf', '184 KB'], ['First run (made up).png', '2.4 MB']], minutes: 'about 20 a day', note: 'First run was Tuesday. (Made-up note.)', by: 'Dana Whitlock', when: 'Fri, Dec 4 · 9:05 AM', st: 'Received' },
  { id: 'sub_2', ws: 'ws_northline', team: 'Northline Realty', kind: 'Report for a live read', wk: 'Week 1 · Step 4', files: [['Map Your Spend report (made up).html', '184 KB']], minutes: '', note: 'Please look at advertising. (Made-up note.)', by: 'Alex Morgan', when: 'Thu, Dec 3 · 4:02 PM', st: 'Picked for a live read' },
  { id: 'sub_1', ws: 'ws_sampleteam', team: 'Sample Team', kind: 'Report for a live read', wk: 'Week 1 · Step 4', files: [['Map Your Spend report (made up).pdf', '1.2 MB']], minutes: '', note: '', by: 'Dana Whitlock', when: 'Thu, Dec 3 · 11:20 AM', st: 'Reviewed' },
  { id: 'sub_0', ws: 'ws_copperbasin', team: 'Copper Basin Realty', kind: 'Report for a live read', wk: 'Week 1 · Step 4', files: [['Spend map (made up).xlsx', '96 KB']], minutes: '', note: 'Our software line looks high. (Made-up note.)', by: 'Devon Achterberg', when: 'Wed, Dec 2 · 6:48 PM', st: 'Received' },
];
const TST = { Received: '', 'Picked for a live read': 'info', Reviewed: 'ok' };
const TSTS = Object.keys(TST);
const Ghl = ({ v }) => v ? <St v={v} tone={v === 'Synced' ? 'ok' : v === 'Failed' ? 'bad' : 'warn'} /> : <span className="mu">—</span>;
const FileList = ({ files }) => <ul className="fls">{files.map(f => <li key={f[0]}><I n="file" /><button className="lk">{f[0]}</button><span className="me">{f[1]}</span></li>)}</ul>;

/* Learners & Teams › Intake: every team's Week 0 Intake, by team or one question across the cohort */
function IntakeTab() {
  const { go, toast, guard, log } = useC();
  const [f, setF] = useState('All statuses'), [fl, setFl] = useState('All flags');
  const rows = IR.filter(r => (f === 'All statuses' || r.st === f) && (fl === 'All flags' || r.flags.includes(fl)));
  const sync = r => guard('account', 'Sync to GHL', () => { log('intake.ghl_sync', r.n, 'Queued by staff.'); toast('Queued. GHL updates within a minute.'); });
  return <>
    <div className="row"><Sel label="Status" v={f} on={setF} opts={['All statuses', 'Submitted', 'Draft', 'Not started']} /><Sel label="To sort out" v={fl} on={setFl} opts={['All flags', ...FLAGS.map(x => x[0])]} />
      <span className="sp" /><button className="lk" onClick={() => go('forms')}>See the answers added up</button></div>
    <Table rows={rows} onRow={r => go('workspace', r.id, 'intake')} empty={{ ic: 'file', t: 'No team matches', b: 'Change the filters.' }}
      cols={[{ k: 'n', l: 'Team', w: 'minmax(170px,1.2fr)', r: r => <Two a={r.n} b={r.owner} /> },
        { k: 'st', l: 'Status', w: '164px', r: r => <div className="col" style={{ gap: 2, alignItems: 'flex-start' }}><Pill v={r.st} tone={IST[r.st]} />{r.when && <span className="me">{r.when}</span>}</div> },
        { k: 'done', l: 'Answered', w: '136px', r: r => <span className="row nw" style={{ gap: 10 }}><Bar v={r.done} max={QN} v2={0} /><span className="tn" style={{ minWidth: 56, textAlign: 'right', flex: 'none', whiteSpace: 'nowrap' }}>{r.done} of {QN}</span></span> },
        { k: 'opn', l: 'Operator', w: 'minmax(110px,.8fr)', hide: 'lap', r: r => r.opn || <span className="mu">—</span> },
        { k: 'ai', l: 'AI', w: '140px', hide: 'lap', r: r => r.a.ai ? <Two a={r.a.ai} b={r.a.plan || 'Plan not answered'} /> : <span className="mu">—</span> },
        { k: 'flags', l: 'To sort out', w: 'minmax(190px,1.2fr)', ns: 1, r: r => r.flags.length ? <span className="col" style={{ gap: 4, alignItems: 'flex-start' }}>{r.flags.map(x => <Pill key={x} v={x} tone="warn" />)}</span> : <span className="mu">{r.st === 'Submitted' ? 'Nothing' : '—'}</span> },
        { k: 'ghl', l: 'GHL', w: '92px', r: r => <Ghl v={r.ghl} /> }]}
      menu={r => [{ l: 'Open responses', fn: () => go('workspace', r.id, 'intake') }, { l: 'Download PDF', ic: 'download', off: r.st === 'Not started', fn: () => toast('PDF downloaded') }, '-', { l: r.ghl === 'Failed' ? 'Retry GHL sync' : 'Sync to GHL again', ic: 'refresh', g: 1, off: r.st !== 'Submitted', fn: () => sync(r) }]} />
  </>;
}

/* Forms & Submissions (Support): the cohort added up. One team's answers and files live in Learners & Teams. */
const TEAMS = IR.length;
const Tally = ({ t, rows, total }) => <section className="cd pd col s"><span className="w5">{t}</span>{rows.map(x => <div key={x[0]} className="ty"><span className="el">{x[0]}</span><Bar v={x[1]} max={total} v2={0} /><span className="tn">{x[1]}</span></div>)}</section>;
function FormsIntake() {
  const { go, toast, ph } = useC();
  const [q, setQ] = useState('problems');
  const n = k => IR.filter(r => r.st === k).length;
  const cur = QS.find(x => x.id === q), qi = QS.indexOf(cur);
  const ql = useRef(null);
  /* keep the chosen question in view inside its list (the list scrolls, the page doesn't move) */
  useEffect(() => { const box = ql.current, el = box && box.querySelector('.on'); if (!el) return; const top = el.offsetTop, bot = top + el.offsetHeight; if (top < box.scrollTop) box.scrollTop = top - 8; else if (bot > box.scrollTop + box.clientHeight) box.scrollTop = bot - box.clientHeight + 8; }, [q, ph]);
  const count = (id, o) => IR.filter(r => r.a[id] === o).length;
  const opts = id => { const x = QS.find(y => y.id === id); return [...x.options.map(o => [o, count(id, o)]).filter(y => y[1]), ['Not answered', IR.filter(r => !r.a[id]).length]]; };
  const by = (id, yes, test) => { const ans = IR.filter(r => r.a[id]); const y = ans.filter(r => test(r.a[id])).length; return [[yes, y], ['Something else', ans.length - y], ['Not answered', TEAMS - ans.length]]; };
  const tally = cur.options ? cur.options.map(o => [o, count(q, o)]).filter(x => x[1]) : null;
  const sort = FLAGS.map(f => [f[0], IR.filter(r => r.flags.includes(f[0]))]).filter(x => x[1].length);
  return <>
    <Gate n={3}><Facts items={[['Form', 'Week 0 Intake · ' + QN + ' questions'], ['Submitted', n('Submitted') + ' of ' + TEAMS + ' teams'], ['In draft', String(n('Draft'))], ['Not started', String(n('Not started'))], ['Due', 'Mon, Nov 30'], ['GHL', <span className="row nw" style={{ gap: 12 }}><St v="2 synced" tone="ok" /><St v="1 failed" tone="bad" /></span>]]} /></Gate>
    <Card t="To sort out before Wed, Dec 2" sub="From the answers so far. A question left blank raises nothing." right={<Btn onClick={() => go('learners', null, 'intake')}>Open the teams</Btn>} pad={false}>
      {sort.map(x => <div key={x[0]} className="qa"><span><Pill v={x[0]} tone="warn" /></span><div className="row" style={{ gap: '4px 14px' }}><span className="w5 tn">{x[1].length} {x[1].length === 1 ? 'team' : 'teams'}</span>{x[1].map(r => <button key={r.id} className="lk" onClick={() => go('workspace', r.id, 'intake')}>{r.n}</button>)}</div></div>)}
    </Card>
    <div className="g3">
      <Tally t="AI" total={TEAMS} rows={opts('ai')} />
      <Tally t="Plan" total={TEAMS} rows={opts('plan')} />
      <Tally t="Operator" total={TEAMS} rows={opts('operator')} />
      <Tally t="Google Workspace" total={TEAMS} rows={opts('google')} />
      <Tally t="Sisu" total={TEAMS} rows={[['Yes', IR.filter(r => r.a.sisu && !/^\s*no\b/i.test(r.a.sisu)).length], ['No', IR.filter(r => /^\s*no\b/i.test(r.a.sisu || '')).length], ['Not answered', IR.filter(r => !r.a.sisu).length]]} />
      <Tally t="CRM" total={TEAMS} rows={by('crm', 'Follow Up Boss', v => /follow up boss|\bfub\b/i.test(v))} />
    </div>
    <section className="cd">
      <div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Read one question across the cohort</h2>{!ph && <span className="me">Pick a question. Every team's answer is beside it.</span>}</div>
        <span className="row nw" style={{ gap: 4, flex: 'none' }}><span className="me tn" style={{ whiteSpace: 'nowrap', marginRight: 4 }}>{qi + 1} of {QN}</span>
          <button className="ib" aria-label="Previous question" disabled={qi === 0} onClick={() => setQ(QS[qi - 1].id)}><I n="up" /></button>
          <button className="ib" aria-label="Next question" disabled={qi === QN - 1} onClick={() => setQ(QS[qi + 1].id)}><I n="down" /></button></span></div>
      <div className="qr">
        <nav className="ql" aria-label="Questions" ref={ql}>{INTAKE_FORM.sections.map(s => <Fragment key={s.title}><div className="qls">{s.title}</div>
          {s.questions.map(x => <button key={x.id} className={'qli' + (x.id === q ? ' on' : '')} aria-current={x.id === q ? 'true' : undefined} onClick={() => setQ(x.id)}><span>{x.label}</span><span className="tn">{IR.filter(r => r.a[x.id]).length}/{TEAMS}</span></button>)}</Fragment>)}</nav>
        <div className="qrd">
          <div className="qrh"><h3>{cur.label}</h3><span className="me">{cur.sec}{cur.required ? ' · Required' : ''} · {IR.filter(r => r.a[q]).length} of {TEAMS} teams answered</span>
            {tally && <div className="row" style={{ gap: 8, marginTop: 6 }}>{tally.map(t => <Pill key={t[0]} tone="">{t[0]} <b className="tn">{t[1]}</b></Pill>)}</div>}</div>
          {IR.map(r => <div key={r.id} className="qa"><div className="col" style={{ gap: 0, alignItems: 'flex-start' }}><button className="lk w5" style={{ textAlign: 'left' }} onClick={() => go('workspace', r.id, 'intake')}>{r.n}</button><span className="me">{r.owner}</span></div>
            <div>{r.a[q] ? <p>{r.a[q]}</p> : <span className="mu">{r.st === 'Not started' ? 'Not started' : 'Not answered'}</span>}</div></div>)}
        </div>
      </div>
    </section>
  </>;
}
const ASKS = [['Week 1', 'Report for a live read', 'Step 4'], ['Week 1', 'Checkpoint', 'Step 6']];
function FormsTurnedIn() {
  const { go } = useC();
  const rows = ASKS.map(a => { const subs = TI0.filter(x => x.kind === a[1]); const teams = [...new Set(subs.map(x => x.ws))]; return { a, subs, teams, not: IR.filter(r => !teams.includes(r.id)) }; });
  return <>
    <Gate n={3}><Facts items={[['Open week', 'Week 1 · Where the Money Goes'], ['Turned in', TI0.length + ' from ' + new Set(TI0.map(x => x.ws)).size + ' of ' + TEAMS + ' teams'], ['Not looked at yet', <span className="w5">{TI0.filter(r => r.st === 'Received').length}</span>], ['Picked for a live read', String(TI0.filter(r => r.st === 'Picked for a live read').length)], ['Reviewed', String(TI0.filter(r => r.st === 'Reviewed').length)]]} /></Gate>
    <Table title="What each week asks for" rows={rows} onRow={() => go('learners', null, 'turnedin')}
      cols={[{ k: 'a', l: 'Ask', w: 'minmax(190px,1.3fr)', r: x => <Two a={x.a[1]} b={x.a[0] + ' · ' + x.a[2]} /> },
        { k: 'teams', l: 'Teams turned in', w: '190px', r: x => <span className="row nw" style={{ gap: 10 }}><Bar v={x.teams.length} max={TEAMS} v2={0} /><span className="tn" style={{ minWidth: 48, textAlign: 'right', flex: 'none', whiteSpace: 'nowrap' }}>{x.teams.length} of {TEAMS}</span></span> },
        { k: 'r', l: 'Not looked at', w: '112px', r: x => <span className="tn">{x.subs.filter(s => s.st === 'Received').length}</span> },
        { k: 'p', l: 'Picked', w: '80px', r: x => <span className="tn">{x.subs.filter(s => s.st === 'Picked for a live read').length}</span> },
        { k: 'v', l: 'Reviewed', w: '88px', r: x => <span className="tn">{x.subs.filter(s => s.st === 'Reviewed').length}</span> },
        { k: 'not', l: 'Not turned in yet', w: 'minmax(220px,1.6fr)', ns: 1, hide: 'lap', r: x => <span className="me el" style={{ display: 'block' }}>{x.not.map(r => r.n).join(', ')}</span> }]}
      menu={() => [{ l: 'Open the submissions', fn: () => go('learners', null, 'turnedin') }]} />
    <p className="me">Each file, its note and its status are in Learners &amp; Teams › Turned in. Only staff see a status.</p>
  </>;
}
function Forms() {
  const { route, toast } = useC();
  const [tab, setTab] = useState(route.tab || 'intake');
  return <div className="pg">
    <Head t="Forms & Submissions" d="What the cohort has told you and sent you, added up. For one team's answers or files, open Learners & Teams." right={<Btn ic="download" onClick={() => toast('Exported ' + TEAMS + ' teams as CSV')}>Export CSV</Btn>} />
    <Tabs v={tab} on={setTab} tabs={[['intake', 'Intake', IR.filter(r => r.st === 'Submitted').length + ' of ' + TEAMS], ['turnedin', 'Turned in', TI0.length]]} />
    {tab === 'intake' ? <FormsIntake /> : <FormsTurnedIn />}
  </div>;
}

/* Learners & Teams › Turned in: every file a team has sent, newest first */
function TurnedInTab() {
  const { go, toast, guard, log } = useC();
  const [rows, setRows] = useState(TI0), [kind, setKind] = useState('All kinds'), [st, setSt] = useState('All statuses');
  const set = (r, v) => guard('account', 'Mark ' + v, () => { setRows(x => x.map(y => y.id === r.id ? { ...y, st: v } : y)); log('submission.status', r.team, v + '.'); toast('Marked ' + v.toLowerCase() + '. The team is not told.'); });
  const L = rows.filter(r => (kind === 'All kinds' || r.kind === kind) && (st === 'All statuses' || r.st === st));
  return <>
    <Gate n={3}><Facts items={[['Week', 'Week 1 · Where the Money Goes'], ['Turned in', rows.length + ' from 3 teams'], ['Reports for a live read', String(rows.filter(r => r.kind !== 'Checkpoint').length)], ['Checkpoints', String(rows.filter(r => r.kind === 'Checkpoint').length)], ['Not looked at yet', <span className="w5">{rows.filter(r => r.st === 'Received').length}</span>]]} /></Gate>
    <div className="row"><Sel label="Week" v="Week 1" on={() => {}} opts={['Week 1', 'All weeks']} /><Sel label="Kind" v={kind} on={setKind} opts={['All kinds', 'Report for a live read', 'Checkpoint']} /><Sel label="Status" v={st} on={setSt} opts={['All statuses', ...TSTS]} /><span className="sp" /><span className="me">Only staff see the status. Teams see what they sent.</span></div>
    <Table rows={L} onRow={r => go('workspace', r.ws, 'turnedin')} empty={{ ic: 'file', t: 'Nothing turned in yet', b: 'Files appear here when a team uses Turn in on a step.' }}
      cols={[{ k: 'team', l: 'Team', w: 'minmax(150px,1.1fr)', r: r => <Two a={r.team} b={r.by} /> },
        { k: 'kind', l: 'What', w: '178px', r: r => <Two a={r.kind} b={r.wk} /> },
        { k: 'files', l: 'Files', w: 'minmax(170px,1.3fr)', ns: 1, r: r => <Two a={r.files[0][0]} b={r.files.length > 1 ? '+ ' + (r.files.length - 1) + ' more' : r.files[0][1]} /> },
        { k: 'note', l: 'Note', w: 'minmax(140px,1.2fr)', hide: 'lap', ns: 1, r: r => r.note ? <span className="el" style={{ display: 'block' }}>{r.note}</span> : <span className="mu">—</span> },
        { k: 'when', l: 'Turned in', w: '150px', ns: 1 },
        { k: 'st', l: 'Status', w: '166px', r: r => <Pill v={r.st} tone={TST[r.st]} /> }]}
      menu={r => [{ l: 'Download files', ic: 'download', fn: () => toast(r.files.length + (r.files.length === 1 ? ' file' : ' files') + ' downloaded') }, { l: 'Open team', fn: () => go('workspace', r.ws, 'turnedin') }, '-', ...TSTS.map(v => ({ l: 'Mark ' + v.toLowerCase(), g: 1, on: r.st === v, fn: () => set(r, v) }))]} />
  </>;
}

/* Workspace › Intake: one team's answers, as the team wrote them */
function WsIntake({ w }) {
  const { toast, startMasq } = useC();
  const r = IR.find(x => x.id === w.id);
  if (!r || r.st === 'Not started') return <div className="cd"><Empty ic="file" t="No intake yet" b="This team hasn't opened the Week 0 Intake. It is due Mon, Nov 30." /></div>;
  const miss = QS.filter(x => x.required && !r.a[x.id]);
  return <div className="col">
    <div className="cd pd"><div className="row"><Pill v={r.st} tone={IST[r.st]} /><span className="w5">{r.st === 'Submitted' ? 'Submitted ' + r.when + ' by ' + r.by : r.when + ' by ' + r.by}</span><span className="me">{r.done} of {QN} answered</span><span className="sp" /><Btn ic="download" onClick={() => toast('PDF downloaded')}>Download PDF</Btn></div>
      {r.st === 'Draft' && miss.length > 0 && <p className="me" style={{ marginTop: 10 }}>Still needed before they can submit: {miss.map(x => x.label.replace(/\.$/, '')).join(' · ')}</p>}
      <p className="me" style={{ marginTop: 10 }}>These are the team's own words. You can't edit them here.</p></div>
    {INTAKE_FORM.sections.map(s => <Card key={s.title} t={s.title} sub={s.questions.filter(x => r.a[x.id]).length + ' of ' + s.questions.length + ' answered'}><dl className="qkv">{s.questions.map(x => <Fragment key={x.id}><dt>{x.label}{x.required && !r.a[x.id] && <Pill v="Required" tone="warn" />}</dt><dd>{r.a[x.id] || <span className="mu">Not answered</span>}</dd></Fragment>)}</dl></Card>)}
  </div>;
}
/* Workspace › the GHL card beside the answers: where they went, and a way to send them again */
function WsGhl({ w }) {
  const { toast, guard, log } = useC();
  const r = IR.find(x => x.id === w.id);
  if (!r || !r.ghl) return <Card t="GHL" sub="Where this team's answers go."><p className="mu">Nothing is sent until the team submits.</p></Card>;
  const bad = r.ghl === 'Failed';
  const both = r.op === "I'm both";
  return <Card t="GHL" sub="Where this team's answers went."><div className="col m">
    <div className="kvs"><KV rows={[['Status', <Ghl v={r.ghl} />], bad ? ['Error', <span style={{ color: 'var(--bad)' }}>{GHL_ERR}</span>] : ['Last sync', r.when.replace('Nov 19, 4:02', 'Nov 19, 4:03').replace('Nov 18, 10:15', 'Nov 18, 10:16')], bad ? ['Tried', '3 times. Next try at 2:40 PM.'] : ['Fields written', r.done + ' answers and the submitted date'],
      ['Owner’s contact', <button className="lk">{r.owner}</button>], ['Operator’s contact', both ? 'None. The owner is the operator.' : bad ? 'Not created yet' : <span><button className="lk">{r.opn}</button> <span className="me">· related to the owner as Operator</span></span>], ['Tag', <span className="mo">ai-intake-submitted</span>]]} /></div>
    <div className="row"><Btn ic="refresh" onClick={() => guard('account', 'Sync to GHL', () => { log('intake.ghl_sync', w.n, 'Queued by staff.'); toast('Queued. GHL updates within a minute.'); })}>{bad ? 'Retry now' : 'Sync again'}</Btn></div>
  </div></Card>;
}
/* Workspace › Turned in: this team's files, with the staff-only status */
function WsTurnedIn({ w }) {
  const { toast, guard, log } = useC();
  const [rows, setRows] = useState(TI0.filter(x => x.ws === w.id));
  if (!rows.length) return <div className="cd"><Empty ic="file" t="Nothing turned in yet" b="Files appear here when this team uses Turn in on a step." /></div>;
  return <div className="col">{rows.map(r => <Card key={r.id} t={r.kind} sub={r.wk + ' · turned in ' + r.when + ' by ' + r.by}
    right={<Sel label="Status" v={r.st} opts={TSTS} on={v => guard('account', 'Mark ' + v, () => { setRows(x => x.map(y => y.id === r.id ? { ...y, st: v } : y)); log('submission.status', w.n, v + '.'); toast('Marked ' + v.toLowerCase() + '. The team is not told.'); })} />}>
    <div className="kvs"><KV rows={[['Files', <FileList files={r.files} />], ...(r.minutes ? [['Minutes the hire took over', r.minutes]] : []), [r.kind === 'Checkpoint' ? 'Anything Connor should know?' : 'What should Connor look at?', r.note || <span className="mu">No note</span>]]} /></div>
  </Card>)}<p className="me">Only staff see the status. The team sees what they sent and when.</p></div>;
}

/* Build › Curriculum › a week: the three cards these features add to the Week Builder */
function WeekCards() {
  const { go, toast, guard } = useC();
  const [req, setReq] = useState(Object.fromEntries(QS.map(x => [x.id, !!x.required])));
  const [open, setOpen] = useState(INTAKE_FORM.sections[0].title);
  const nreq = Object.values(req).filter(Boolean).length;
  return <div className="pg">
    <Head back={['curriculum', 'Curriculum']} t="Week Builder: what changes" d="Three cards. The intake's questions gain a Required switch. A step's checklist item can ask for a file. And each week shows what teams have sent." />
    <div className="g2" style={{ alignItems: 'start' }}>
      <Card t="Week 0 Intake" sub={QN + ' questions · ' + nreq + ' required'} right={<Btn k="q" onClick={() => toast('Question editor opens here')}>Edit questions</Btn>}>
        <div className="col m">
          <p className="me">A required question has to be answered before a team can submit. Operator, AI, plan and Google also drive personalization, so they stay required.</p>
          {INTAKE_FORM.sections.map(s => <div key={s.title} className="col s">
            <button className="lk w5 row nw" style={{ gap: 6, alignSelf: 'flex-start' }} aria-expanded={open === s.title} onClick={() => setOpen(open === s.title ? '' : s.title)}><I n={open === s.title ? 'chevd' : 'chev'} />{s.title}<span className="me" style={{ fontWeight: 400 }}>{s.questions.filter(x => req[x.id]).length} of {s.questions.length} required</span></button>
            {open === s.title && s.questions.map(x => { const lock = ['operator', 'ai', 'plan', 'google'].includes(x.id); return <label key={x.id} className="rq"><span>{x.label}<span className="me"> · {x.kind === 'choice' ? 'Choice' : x.kind === 'long' ? 'Long answer' : 'Short answer'}</span></span>
              <span className="row nw" style={{ gap: 8 }}>{lock && <I n="lock" />}<input type="checkbox" className="chk" checked={req[x.id]} disabled={lock} aria-label={'Required: ' + x.label} onChange={e => guard('build', 'Change a question', () => setReq({ ...req, [x.id]: e.target.checked }))} />Required</span></label>; })}
          </div>)}
        </div>
      </Card>
      <div className="col">
        <Card t="Turn in" sub="Week 1 · what this week asks teams to send" right={<GBtn perm="build" label="Add an ask" go={() => toast('Pick a step and a checklist item')} ic="plus">Add</GBtn>}>
          <div className="col m">
            {[['Report for a live read', 'Step 4 · on the box “Submit your report for a live read, or bring one question”', 'PDF, HTML, PNG, JPG, Excel or CSV · up to 5 files, 25 MB each'], ['Checkpoint', 'Step 6 · on the box “Send your checkpoint”', 'Also asks for the minutes the hire took over']].map(a => <div key={a[0]} className="note col s"><span className="row"><span className="w5">{a[0]}</span><span className="sp" /><Pill v="Upload" tone="info" /></span><span className="s2">{a[1]}</span><span className="me">{a[2]}</span></div>)}
            <p className="me">Set on a step's checklist item: its action becomes Upload, with a kind. The learner sees a Turn in button on that box.</p>
          </div>
        </Card>
        <Card t="Submissions" sub="Week 1 · what teams have sent" right={<Btn onClick={() => go('learners', null, 'turnedin')}>Open all</Btn>}>
          <KV rows={[['Turned in', TI0.length + ' from 3 teams'], ['Not looked at yet', String(TI0.filter(r => r.st === 'Received').length)], ['Picked for a live read', String(TI0.filter(r => r.st === 'Picked for a live read').length)]]} />
        </Card>
      </div>
    </div>
  </div>;
}

