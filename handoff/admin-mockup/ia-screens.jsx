
/* =====================================================================================================
   NEW (Nov 25): Program, Cohort, People, Utah Life and Revenue. Sample data is made up.
   The model: a PROGRAM is what you teach. A COHORT is one group going through it. PEOPLE is everyone
   with a sign-in, sorted by how they got in. Every number on these screens opens the list it counts.
   ===================================================================================================== */

/* Admin times are Mountain (learners see Central, one hour later), so a time that learners see shows both. */
const ACC_WEEKS = [
  { n: 0, t: 'Foundations', o: 'The office is ready for its first hire.', st: 'Published', steps: 8, min: 170, opens: 'Sun, Nov 29', build: null, kit: 7 },
  { n: 1, t: 'Where the Money Goes', o: 'A year of spend on one standard chart.', st: 'Published', steps: 7, min: 150, opens: 'Sun, Nov 29', build: 'Wed, Dec 2', kit: 5 },
  { n: 2, t: 'Leads That Pay', o: 'Every lead source ranked by what it returns.', st: 'Scheduled', steps: 7, min: 160, opens: 'Sun, Dec 6', build: 'Wed, Dec 9', kit: 4 },
  { n: 3, t: 'Numbers on the 5th', o: 'A monthly report that builds itself.', st: 'Draft', steps: 6, min: 140, opens: 'Sun, Dec 13', build: 'Wed, Dec 16', kit: 3 },
  { n: 4, t: 'Protect the Pipeline', o: 'No file goes quiet without someone knowing.', st: 'Draft', steps: 5, min: 120, opens: 'Sun, Jan 3', build: 'Wed, Jan 6', kit: 2 },
  { n: 5, t: 'Coach from Evidence', o: 'One-on-ones that start from the numbers.', st: 'Draft', steps: 4, min: 90, opens: 'Sun, Jan 10', build: 'Wed, Jan 13', kit: 2 },
  { n: 6, t: 'Delegate an Outcome', o: 'A hire that owns a result, not a task.', st: 'Draft', steps: 3, min: 60, opens: 'Sun, Jan 17', build: 'Wed, Jan 20', kit: 0 },
  { n: 7, t: 'Make the Workflow Repeatable', o: 'What worked, written down so it runs again.', st: 'Draft', steps: 0, min: 0, opens: 'Sun, Jan 24', build: 'Wed, Jan 27', kit: 0 },
  { n: 8, t: 'Sustain and Expand', o: 'The next three hires, in order.', st: 'Draft', steps: 0, min: 0, opens: 'Sun, Jan 31', build: 'Wed, Feb 3', kit: 0 },
];
const W0_STEPS = [
  ['Fill In Your Intake and Name Your AI Implementer', ['Owner'], '10 min', 'Intake in, AI Implementer invited, stack card sent back.'],
  ['Watch the Orientation', ['Owner', 'AI Implementer'], '30 min', 'Both know how a week runs and what a hire is.'],
  ['Start Your Time Baseline', ['Owner'], '20 min', 'Six tasks timed per occurrence, or marked not done today.'],
  ['Get Your AI Ready', ['AI Implementer'], '20 min', 'Paid plan, training off, skills on, both cohort skills pass their self-test.'],
  ['Set Up Your AI Brain', ['Owner', 'AI Implementer'], '30 min', 'A new chat knows the business.'],
  ['Connect Your Data', ['AI Implementer'], '30 min', 'Each green source answers a test question.'],
  ['Lock the Guardrails', ['AI Implementer'], '10 min', 'Every write tool blocked except drafts and saves.'],
  ['Run the Ready Check and Your Test Hire', ['AI Implementer'], '20 min', 'Ready Check is green and the test hire ran.'],
];
const WK_STEPS = [
  ['Read the Week and Pick Your Data', ['Owner'], '15 min', 'The export this week needs is in the AI Office.'],
  ['Join the Live Build', ['Owner', 'AI Implementer'], '1 hr 30 min', 'The hire ran once on your own data.'],
  ['Run It Again on Your Own', ['AI Implementer'], '30 min', 'A second run matches the first.'],
  ['Check the Output with the Rubric', ['Owner'], '15 min', 'Every rubric line is a yes or has a note.'],
  ['Turn In Your Report', ['AI Implementer'], '10 min', 'The report is turned in from the step.'],
  ['Bring One Question to Office Hours', ['Owner', 'AI Implementer'], '1 hr', 'The question is posted or asked live.'],
  ['Mark the Hire as Deployed', ['Owner'], '5 min', 'The week shows Deployed.'],
];
const ACC_SES = [
  { n: 1, t: 'Map Your Spend Live Build', k: 'Live build', wk: 1, d: 'Wed, Dec 2', zoom: 'Ready', inv: 'Sent' },
  { n: 2, t: 'Map Your Spend Office Hours', k: 'Office hours', wk: 1, d: 'Thu, Dec 3', zoom: 'Ready', inv: 'Sent' },
  { n: 3, t: 'Lead Source Review Live Build', k: 'Live build', wk: 2, d: 'Wed, Dec 9', zoom: 'No link yet', inv: 'Scheduled' },
  { n: 4, t: 'Lead Source Review Office Hours', k: 'Office hours', wk: 2, d: 'Thu, Dec 10', zoom: 'No link yet', inv: 'Scheduled' },
  { n: 5, t: 'Numbers on the 5th Live Build', k: 'Live build', wk: 3, d: 'Wed, Dec 16', zoom: 'No link yet', inv: 'Draft' },
  { n: 6, t: 'Numbers on the 5th Office Hours', k: 'Office hours', wk: 3, d: 'Thu, Dec 17', zoom: 'No link yet', inv: 'Draft' },
  { n: 7, t: 'Protect the Pipeline Live Build', k: 'Live build', wk: 4, d: 'Wed, Jan 6', zoom: 'No link yet', inv: 'Draft' },
  { n: 8, t: 'Protect the Pipeline Office Hours', k: 'Office hours', wk: 4, d: 'Thu, Jan 7', zoom: 'No link yet', inv: 'Draft' },
];
/* the cohort's teams: the same seven the intake screens use */
const ACC_CT = [
  { id: 'ws_northline', n: 'Northline Realty', owner: 'Alex Morgan', seats: 3, in: 3, pay: 'Paid in full', intake: 'Submitted', w0: 8, last: 'Today, 9:14 AM' },
  { id: 'ws_sampleteam', n: 'Sample Team', owner: 'Jordan Avery', seats: 3, in: 3, pay: 'Paid in full', intake: 'Submitted', w0: 6, last: 'Yesterday, 3:02 PM' },
  { id: 'ws_copperbasin', n: 'Copper Basin Realty', owner: 'Devon Achterberg', seats: 1, in: 1, pay: '1 of 2 payments', intake: 'Submitted', w0: 4, last: 'Yesterday, 2:15 PM' },
  { id: 'ws_halemarlowe', n: 'Hale & Marlowe Realty', owner: 'Jordan Hale', seats: 2, in: 2, pay: 'Paid in full', intake: 'Draft', w0: 2, last: 'Nov 20, 2:11 PM' },
  { id: 'ws_lantern', n: 'Lantern Street Partners', owner: 'Tessa Lindqvist', seats: 2, in: 2, pay: '1 of 2 payments', intake: 'Draft', w0: 1, last: 'Nov 17, 8:05 AM' },
  { id: 'ws_northshore', n: 'Northshore Group', owner: 'Elena Vargas', seats: 2, in: 2, pay: 'Paid in full', intake: 'Not started', w0: 0, last: 'Nov 12, 8:52 AM' },
  { id: 'ws_redcliff', n: 'Red Cliff Collective', owner: 'Noor Haddad', seats: 2, in: 0, pay: 'Paid in full', intake: 'Not started', w0: 0, last: 'Never signed in' },
];
const ACC_CL = [
  { id: 'u_2001', n: 'Alex Morgan', e: 'alex@northlinerealty.example', team: 'Northline Realty', role: 'Owner', w0: 8, last: 'Today, 9:14 AM', st: 'Active' },
  { id: 'u_2002', n: 'Jordan Avery', e: 'jordan@sampleteam.example', team: 'Sample Team', role: 'Owner', w0: 6, last: 'Yesterday, 3:02 PM', st: 'Active' },
  { id: 'u_2003', n: 'Dana Whitlock', e: 'dana@sampleteam.example', team: 'Sample Team', role: 'AI Implementer', w0: 6, last: 'Yesterday, 1:40 PM', st: 'Active' },
  { id: 'u_1090', n: 'Devon Achterberg', e: 'devon@copperbasin.example', team: 'Copper Basin Realty', role: 'Owner and AI Implementer', w0: 4, last: 'Yesterday, 2:15 PM', st: 'Active' },
  { id: 'u_1061', n: 'Jordan Hale', e: 'jordan@halemarlowe.example', team: 'Hale & Marlowe Realty', role: 'Owner', w0: 2, last: 'Nov 20, 2:11 PM', st: 'Active' },
  { id: 'u_1118', n: 'Tessa Lindqvist', e: 'tessa@lanternstreet.example', team: 'Lantern Street Partners', role: 'Owner', w0: 1, last: 'Nov 17, 8:05 AM', st: 'Active' },
  { id: 'u_1042', n: 'Elena Vargas', e: 'elena@northshoregroup.example', team: 'Northshore Group', role: 'Owner', w0: 0, last: 'Nov 12, 8:52 AM', st: 'Active' },
  { id: 'u_1077', n: 'Noor Haddad', e: 'noor@redcliffcollective.example', team: 'Red Cliff Collective', role: 'Owner', w0: 0, last: 'Never', st: 'Invited' },
];
/* how each person got in. One primary audience each, so the counts add up to everyone. */
const AUD = [['acc', 'Accelerator', 15, 'var(--for)'], ['team', 'Team Plan', 39, '#2E9A63'], ['agent', 'Agent Plan', 46, '#6FD3A5'], ['ins', 'Insiders', 6, '#3B74D6'], ['skill', 'Skill buyers', 11, '#D99A1C'], ['ul', 'Utah Life', 31, '#9AA39E']];
const AUD_ALL = AUD.reduce((a, x) => a + x[2], 0);
const audOf = k => (AUD.find(a => a[0] === k) || [])[1];
const PPL = [
  ...ACC_CL.map(p => ({ ...p, a: 'acc' })),
  { id: 'u_1043', n: 'Marcus Oyelaran', e: 'marcus@northshoregroup.example', team: 'Northshore Group', role: 'Agent', a: 'team', last: 'Yesterday, 4:31 PM', st: 'Active' },
  { id: 'u_1125', n: 'Priya Raman', e: 'priya@fourthmeridian.example', team: 'Fourth Meridian', role: 'Owner', a: 'team', last: 'Nov 2, 4:40 PM', st: 'Canceled' },
  { id: 'u_1104', n: 'Sam Whitlock', e: 'sam@tidewaterproperty.example', team: '', role: 'Member', a: 'ins', last: 'Nov 18, 9:03 AM', st: 'Past due' },
  { id: 'ul1', n: 'Utah Life agent', e: 'a•••••@liveutah.com', team: '', role: 'Agent', a: 'ul', last: 'Today, 8:02 AM', st: 'Active' },
  { id: 'ul2', n: 'Utah Life agent', e: 'c•••@liveutah.com', team: '', role: 'Agent', a: 'ul', last: 'Yesterday, 5:47 PM', st: 'Active' },
  { id: 'ul3', n: 'Utah Life agent', e: 'j••••••@liveutah.com', team: '', role: 'Agent', a: 'ul', last: 'Nov 19, 11:20 AM', st: 'Active' },
];
const ULA = [['a•••••@liveutah.com', 'Nov 12', 'Today, 8:02 AM', 9], ['c•••@liveutah.com', 'Nov 12', 'Yesterday, 5:47 PM', 14], ['j••••••@liveutah.com', 'Nov 12', 'Nov 19, 11:20 AM', 4], ['m••••@liveutah.com', 'Nov 12', 'Nov 18, 2:36 PM', 6], ['r•••••••@liveutah.com', 'Nov 13', 'Nov 17, 9:11 AM', 3], ['s•••@liveutah.com', 'Nov 13', 'Nov 13, 4:05 PM', 2], ['t••••••@liveutah.com', 'Nov 14', 'Nov 14, 10:30 AM', 1], ['k••••@liveutah.com', 'Nov 16', 'Never opened a skill', 0]];
const TEAMS2 = [
  { id: 'ws_northline', n: 'Northline Realty', owner: 'Alex Morgan', p: ['Accelerator'], seats: '3 of 3', money: 'Paid in full', st: 'Active' },
  { id: 'ws_sampleteam', n: 'Sample Team', owner: 'Jordan Avery', p: ['Accelerator'], seats: '3 of 3', money: 'Paid in full', st: 'Active' },
  { id: 'ws_copperbasin', n: 'Copper Basin Realty', owner: 'Devon Achterberg', p: ['Accelerator'], seats: '1 of 1', money: '1 of 2 payments', st: 'Active' },
  { id: 'ws_northshore', n: 'Northshore Group', owner: 'Elena Vargas', p: ['Accelerator', 'Team Plan'], seats: '33 of 41', money: '$1,495 a month', st: 'Active' },
  { id: 'ws_halemarlowe', n: 'Hale & Marlowe Realty', owner: 'Jordan Hale', p: ['Accelerator', 'Team Plan'], seats: '15 of 16', money: '$695 a month', st: 'Active' },
  { id: 'ws_redcliff', n: 'Red Cliff Collective', owner: 'Noor Haddad', p: ['Accelerator', 'Agent Plan'], seats: '46 of 50', money: '$1,450 a month', st: 'Active' },
  { id: 'ws_lantern', n: 'Lantern Street Partners', owner: 'Tessa Lindqvist', p: ['Accelerator', 'Team Plan'], seats: '6 of 16', money: '1 of 2 payments', st: 'Trialing' },
  { id: 'ws_fourthmeridian', n: 'Fourth Meridian', owner: 'Priya Raman', p: ['Team Plan'], seats: '0 of 16', money: '$0', st: 'Canceled' },
];

/* ---------- shared pieces ---------- */
/* Facts where each one opens the list it counts. [label, value, where it goes, full width] */
function LFacts({ items }) {
  const { go } = useC();
  return <div className="cd fx">{items.map(([k, v, to, full], i) => to
    ? <button key={i} className={'fxl' + (full ? ' fxw' : '')} onClick={() => typeof to === 'function' ? to() : go(...[].concat(to))}><span className="me">{k}</span><span className="w5 el">{v}</span><I n="chev" s={12} w={2.2} /></button>
    : <div key={i} className={full ? 'fxw' : undefined}><span className="me">{k}</span><span className="w5 el">{v}</span></div>)}</div>;
}
/* A section list down the left: one section on screen at a time. A select on a phone. */
function Rail({ items, v, on }) {
  const { ph } = useC();
  if (ph) return <select className="in" style={{ width: '100%' }} aria-label="Section" value={v} onChange={e => on(e.target.value)}>{items.map(([k, l, c]) => <option key={k} value={k}>{l}{c !== undefined ? ' · ' + c : ''}</option>)}</select>;
  return <nav className="srl" aria-label="Sections">{items.map(([k, l, c]) => <button key={k} className={'srb' + (v === k ? ' on' : '')} aria-current={v === k ? 'true' : undefined} onClick={() => on(k)}><span className="el">{l}</span>{c !== undefined && <span className="tn">{c}</span>}</button>)}</nav>;
}
/* progress toward a whole: always green, full when done (the kit's Bar turns amber near a seat cap) */
const PBar = ({ v, max }) => <span className="bar"><i style={{ width: (v / max) * 100 + '%' }} /></span>;
const Fld = ({ l, at, children }) => <label className="lab">{l}{at && <span className="fat">Learners see it on {at}</span>}{children}</label>;
function Lines({ l, at, v, touch }) {
  const [rows, set] = useState(v);
  const upd = r => { set(r); touch(); };
  return <div className="lab"><span>{l}</span>{at && <span className="fat">Learners see it on {at}</span>}
    <div className="lns">{rows.map((r, i) => <div key={i} className="ln"><span className="grp" aria-hidden="true"><I n="grip" s={14} /></span><input className="in" aria-label={l + ', line ' + (i + 1)} value={r} onChange={e => upd(rows.map((x, j) => j === i ? e.target.value : x))} /><button type="button" className="ib" aria-label={'Remove line ' + (i + 1)} onClick={() => upd(rows.filter((x, j) => j !== i))}><I n="x" s={14} /></button></div>)}</div>
    <button type="button" className="b q" style={{ alignSelf: 'flex-start', marginLeft: -10 }} onClick={() => upd([...rows, ''])}><I n="plus" />Add a line</button></div>;
}
const StepWho = ({ v }) => <span className="row" style={{ gap: 4 }}>{v.map(x => <span key={x} className={'pl' + (x === 'Owner' ? ' info' : ' ok')}>{x}</span>)}</span>;
const Wn = ({ n, st }) => <span className={'wn' + (st === 'Draft' ? ' off' : '')}>{n}</span>;
const ctOf = t => { const m = String(t).match(/(\d+):(\d+) (AM|PM)/); if (!m) return t; const h = (+m[1] % 12) + (m[3] === 'PM' ? 12 : 0) + 1; return ((h + 11) % 12 + 1) + ':' + m[2] + ' ' + (h % 24 >= 12 ? 'PM' : 'AM'); };
const When = ({ d, t = '12:00 PM' }) => <div className="col" style={{ gap: 0 }}><span className="el">{d} · {t} MT</span><span className="me">{ctOf(t)} CT for learners</span></div>;

/* ---------- Program › Course settings: what every week shares ---------- */
const GLOSS = [['AI Employee', 'A piece of work your AI does on a schedule, with a seat card.', 'hire, AI hire', 'Week 0 · Step 2'], ['AI Implementer', 'The person on your team who sets the hires up and keeps them running.', 'implementer', 'Week 0 · Step 1'], ['AI Brain', 'What your AI knows about your business before you ask it anything.', 'brain', 'Week 0 · Step 5'], ['Seat card', 'One page: what a hire does, for whom, and what it never touches.', '', 'Week 1 · Step 2'], ['Playbook card', 'How to run a hire, check it and fix it.', 'playbook', 'Week 1 · Step 2'], ['Guardrails', 'The settings that stop your AI from sending or changing anything on its own.', '', 'Week 0 · Step 7'], ['Ready Check', 'A short test that says your setup is ready for a hire.', '', 'Week 0 · Step 8'], ['Stack card', 'The tools your team runs on, on one page.', '', 'Week 0 · Step 1'], ['Time baseline', 'How long six tasks take today, so you can see what changed.', 'baseline', 'Week 0 · Step 3'], ['Evidence packet', 'What you turn in to show a hire works.', 'evidence', 'Week 1 · Step 5']];
const WORDS0 = [['locked.opens', 'Opens {date}', 'Learners'], ['locked.utah_life', 'Not included with Utah Life access', 'Learners'], ['community.nothing_emailed', 'Nothing is emailed.', 'Learners'], ['turnin.goes_to', 'Goes to Connor\'s team. Nothing is emailed.', 'Learners'], ['week.done', 'Deployed', 'Learners'], ['staff.preview', 'Previewing as a learner. Nothing you do here is saved.', 'Staff']];
function CourseSet() {
  const { route, go, guard, toast, ph } = useC();
  const [sec, setSec] = useState(route.tab || 'intro'), [dirty, setDirty] = useState(false), [k, setK] = useState(0), [q, setQ] = useState(''), [au, setAu] = useState('Everyone'), [ed, setEd] = useState(null);
  useEffect(() => { if (route.tab) setSec(route.tab); }, [route.tab]);
  const touch = () => setDirty(true);
  const names = { intro: 'Course intro', roles: 'Roles', rules: 'Rules and support', before: 'Before Week 1', after: 'After the cohort', join: 'Joining and community', glossary: 'Glossary', words: 'Words' };
  const save = () => guard('build', 'Save course settings', () => { setDirty(false); toast(names[sec] + ' saved'); });
  const T = (l, at, v, rows) => <Fld l={l} at={at}>{rows ? <textarea className="in" rows={rows} defaultValue={v} onChange={touch} /> : <input className="in" defaultValue={v} onChange={touch} />}</Fld>;
  const words = WORDS0.filter(w => (w[0] + w[1]).toLowerCase().includes(q.toLowerCase()) && (au === 'Everyone' || w[2] === au));
  return <div className="pg">
    <Head t="Course settings" d="What every cohort shares: the intro, the rules, the pages before and after, the glossary and the words learners see. Anything that names a date, a weekday or a number of weeks is filled in from the cohort." 
      right={<Btn ic="eye" onClick={() => toast('Opens the learner preview of the course')}>Preview</Btn>} />
    <div className="srg" key={k}>
      <div className="col">
        <Rail v={sec} on={v => { setSec(v); }} items={[['intro', 'Course intro'], ['roles', 'Roles'], ['rules', 'Rules and support'], ['before', 'Before Week 1'], ['after', 'After the cohort'], ['join', 'Joining and community'], ['glossary', 'Glossary', GLOSS.length], ['words', 'Words', WORDS0.length]]} />
        {!ph && <div className="note col s"><span className="w5">Looking for dates?</span><span className="me">A cohort's dates, its promise, how often it meets and when its emails send are on the cohort.</span><button className="lk a" style={{ alignSelf: 'flex-start' }} onClick={() => go('cohortset')}>Open the cohort's Settings</button></div>}
      </div>
      <div className="col">
        {sec === 'intro' && <Card t="Course intro" sub="The first thing a new learner reads."><div className="col">
          {T('Course title', 'Home', 'Amplified AI Accelerator')}
          <FromCohort l="The promise" at="Home, under the title" v={COH.promise} />
          <FromCohort l="How it works" at="Home" lines={howOf(COH)} />
          {T('Instructor', 'Home and each live build', 'Connor Leiva')}
        </div></Card>}
        {sec === 'roles' && <Card t="Roles" sub="The two seats every team fills."><div className="col">
          {T('The owner\'s role', 'Home and Week 0', 'You decide what the hire is for and whether its work is good enough to use.', 3)}
          {T('The AI Implementer\'s role', 'Home and Week 0', 'You set the hire up, run it, and keep it running. On a small team this can be the owner.', 3)}
        </div></Card>}
        {sec === 'rules' && <Card t="Rules and support" sub="What we will and won't do, and where to get help."><div className="col">
          {T('Scope', 'Home', 'We build the hires in this course. We don\'t set up your CRM or your books.', 2)}
          {T('Support', 'Home and Get help', 'Ask in the Community first. For anything private, email the team.', 2)}
          <Lines l="Office hours rules" at="each Office hours row" touch={touch} v={['Bring one question.', 'Share your screen, not your client\'s name.', 'If we can\'t fix it in ten minutes, we take it to a thread.']} />
          <Lines l="Evidence" at="Reference" touch={touch} v={['The report the hire made.', 'The rubric, filled in.', 'One sentence on what you would change.']} />
          {T('Missed a week', 'Reference', 'Watch the replay, run the hire, and turn it in. Nothing locks behind you.', 2)}
          <FromCohort l="Holiday note" at="the Schedule" v={COH.holiday || 'None. Every week has its sessions.'} />
        </div></Card>}
        {sec === 'before' && <Card t="Before Week 1" sub="What a team reads between buying and the first live build."><div className="col">
          <Lines l="Intake" at="Week 0 · Step 1" touch={touch} v={['Fill in the intake before {first live build}.', 'Name your AI Implementer and invite them.']} />
          <p className="me">Words in braces are filled in from the cohort. For the {COH.n}, {'{first live build}'} reads {firstBuildOf(COH)}.</p>
          {T('Practice set note', 'Week 0', 'Use the practice set until your own export is ready. It is made-up data.', 2)}
          <Lines l="Safe sharing" at="Week 0 and the Community" touch={touch} v={['No client names in a thread.', 'No passwords or keys, ever.', 'Screenshots with numbers are fine. Screenshots with people are not.']} />
        </div></Card>}
        {sec === 'after' && <Card t="After the cohort" sub="What a team reads when its last week is done."><div className="col">
          <Lines l="Graduation" at="the last week" touch={touch} v={['{weeks of building} hires deployed.', 'A seat card and a playbook card for each.', 'Your next three hires, in order.']} />
          {T('Graduation note', 'the last week', 'You keep everything you built, and the portal stays open to you.', 2)}
          <Lines l="Paths" at="the last week" touch={touch} v={['Keep going with the Team Plan.', 'Bring your agents in on the Agent Plan.']} />
          {T('No paywall', 'the last week', 'Nothing you built here locks when the cohort ends.', 2)}
        </div></Card>}
        {sec === 'join' && <Card t="Joining and community" sub="The button that takes a learner into a live session, and where the cohort talks."><div className="col">
          <div className="g2">{T('Join label', 'the top bar, 15 minutes before a session', 'Join on Zoom')}{T('Community link', 'Home, until the built-in Community replaces it', '')}</div>
          {T('Join note', 'under the Join button', 'Opens 15 minutes before we start.', 2)}
          <p className="me">The cohort's own threads are in <button className="lk a" onClick={() => go('community')}>Community</button>. Leave the link empty to show only that.</p>
        </div></Card>}
        {sec === 'glossary' && <Table title="Glossary" right={<GBtn ic="plus" perm="build" label="Add a term" go={() => setEd(['', '', '', ''])}>Add a term</GBtn>} rows={GLOSS} onRow={g => setEd(g)}
          cols={[{ k: 0, l: 'Term', w: '170px', r: g => <span className="w5 el" style={{ display: 'block' }}>{g[0]}</span> }, { k: 1, l: 'Short definition', w: 'minmax(240px,2fr)', r: g => <span className="s2 cl2">{g[1]}</span> }, { k: 2, l: 'Also matches', w: '130px', hide: 'lap', r: g => g[2] || <span className="mu">None</span> }, { k: 3, l: 'First used', w: '140px', ns: 1 }]}
          card={g => <><span className="w6" style={{ fontSize: 17 }}>{g[0]}</span><p className="s2">{g[1]}</p><span className="me">First used: {g[3]}</span></>} />}
        {sec === 'words' && <><div className="row"><Find v={q} on={setQ} ph="Find a line" /><Sel label="Who reads it" v={au} on={setAu} opts={['Everyone', 'Learners', 'Staff']} /></div>
          <Table title="Words" right={<GBtn ic="plus" perm="build" label="Add a line" go={() => setEd(['', '', 'Learners', 'word'])}>Add a line</GBtn>} rows={words} onRow={w => setEd([...w, 'word'])} empty={{ ic: 'file', t: 'No line matches', b: 'Try fewer letters.' }}
            cols={[{ k: 1, l: 'What it says', w: 'minmax(240px,2fr)', r: w => <span className="w5 cl2">{w[1]}</span> }, { k: 0, l: 'Key', w: 'minmax(190px,1fr)', mo: 1, hide: 'lap' }, { k: 2, l: 'Who reads it', w: '112px', r: w => <Pill v={w[2]} tone={w[2] === 'Staff' ? '' : 'info'} /> }]}
            card={w => <><span className="w6">{w[1]}</span><span className="me mo">{w[0]}</span><Pill v={w[2]} tone={w[2] === 'Staff' ? '' : 'info'} /></>} />
          <p className="me">Short lines the portal shows in fixed places. A week's own words are in the week.</p></>}
        {dirty && <div className="svb"><span className="w5" style={{ flex: 1 }}>Unsaved changes to {names[sec]}</span><Btn onClick={() => { setDirty(false); setK(k + 1); }}>Discard</Btn><Btn k="p" onClick={save}>Save changes</Btn></div>}
      </div>
    </div>
    {ed && <Modal title={ed[3] === 'word' ? (ed[0] || 'New line') : (ed[0] || 'New term')} w={560} onClose={() => setEd(null)} foot={<><Btn onClick={() => setEd(null)}>Cancel</Btn><Btn k="p" onClick={() => guard('build', 'Save', () => { setEd(null); toast('Saved'); })}>Save</Btn></>}>
      {ed[3] === 'word' ? <><label className="lab">Key<input className="in mo" defaultValue={ed[0]} placeholder="locked.opens" /></label><label className="lab">What it says<textarea className="in" rows={3} defaultValue={ed[1]} /></label><label className="lab">Who reads it<select className="in" defaultValue={ed[2]}><option>Learners</option><option>Staff</option></select></label></>
        : <><label className="lab">Term<input className="in" defaultValue={ed[0]} /></label><label className="lab">Short definition<textarea className="in" rows={2} defaultValue={ed[1]} /></label><label className="lab">Also matches<input className="in" defaultValue={ed[2]} placeholder="Other words to underline, separated by commas" /></label></>}
    </Modal>}
  </div>;
}

/* ---------- People › People: everyone with a sign-in, by how they got in ---------- */
function AudChips({ v, on, all = true }) {
  return <div className="chs" role="group" aria-label="Audience">{(all ? [['all', 'Everyone', AUD_ALL], ...AUD] : AUD).map(a => <button key={a[0]} className={'ch' + (v === a[0] ? ' on' : '')} aria-pressed={v === a[0]} onClick={() => on(a[0])}>{a[3] && <i style={{ background: a[3] }} />}{a[1]}<span className="tn">{a[2]}</span></button>)}</div>;
}
function PeoplePg() {
  const { route, go, toast } = useC();
  const [a, setA] = useState(route.tab || 'all'), [q, setQ] = useState('');
  useEffect(() => { if (route.tab) setA(route.tab); }, [route.tab]);
  const rows = PPL.filter(p => (a === 'all' || p.a === a) && (p.n + p.e + p.team).toLowerCase().includes(q.toLowerCase()));
  const open = p => p.a === 'ul' ? go('groups') : go('user', p.id);
  return <div className="pg">
    <AudChips v={a} on={setA} />
    <div className="row"><Find v={q} on={setQ} ph="Find a person by name or email" /><span className="sp" /><Btn ic="download" onClick={() => toast('Export started')}>Export</Btn></div>
    <Table rows={rows} onRow={open} empty={{ ic: 'users', t: 'No one matches', b: 'Try another audience or fewer letters.' }}
      cols={[{ k: 'n', l: 'Person', w: 'minmax(220px,1.5fr)', r: p => <Two a={p.n} b={p.e} /> }, { k: 'a', l: 'Got in through', w: '136px', r: p => <span className="pl aud"><i style={{ background: AUD.find(x => x[0] === p.a)[3] }} />{audOf(p.a)}</span> },
        { k: 'team', l: 'Team', w: 'minmax(160px,1fr)', hide: 'lap', r: p => p.team ? p.team : <span className="mu">On their own</span> }, { k: 'role', l: 'Seat', w: '204px', hide: 'lap' }, { k: 'last', l: 'Last active', w: '150px', ns: 1 }, { k: 'st', l: 'Status', w: '104px', r: p => <St v={p.st} tone={p.st === 'Invited' ? 'warn' : undefined} /> }]}
      menu={p => [{ l: p.a === 'ul' ? 'Open Utah Life' : 'Open person', fn: () => open(p) }, ...(p.a === 'acc' ? [{ l: 'See them in the cohort', fn: () => go('enrolled', null, 'learners') }] : [])]} />
    <p className="me">Showing {rows.length} of {a === 'all' ? AUD_ALL : AUD.find(x => x[0] === a)[2]}. This list is for the account: sign-in, plan and seat. To see how a cohort is doing, open <button className="lk a" onClick={() => go('enrolled')}>the cohort's People tab</button>.</p>
  </div>;
}

/* ---------- People › Teams: accounts with more than one seat ---------- */
function TeamsPg() {
  const { go } = useC();
  const [q, setQ] = useState(''), [p, setP] = useState('All products');
  const rows = TEAMS2.filter(t => (t.n + t.owner).toLowerCase().includes(q.toLowerCase()) && (p === 'All products' || t.p.includes(p)));
  return <div className="pg">
    <Head t="Teams" d="Every team account and what it holds. Someone on their own (an Insider, a skill buyer, a Utah Life agent) is a person, not a team, so they are under Everyone." />
    <div className="row"><Find v={q} on={setQ} ph="Find a team or its owner" /><Sel label="Product" v={p} on={setP} opts={['All products', 'Accelerator', 'Team Plan', 'Agent Plan']} /></div>
    <Table rows={rows} onRow={t => go('workspace', t.id)} empty={{ ic: 'workspaces', t: 'No team matches' }}
      cols={[{ k: 'n', l: 'Team', w: 'minmax(200px,1.4fr)', r: t => <Two a={t.n} b={t.owner} /> }, { k: 'p', l: 'Holds', w: 'minmax(190px,1fr)', ns: 1, r: t => <span className="row" style={{ gap: 4 }}>{t.p.map(x => <span key={x} className={'pl' + (x === 'Accelerator' ? ' ok' : ' info')}>{x}</span>)}</span> },
        { k: 'seats', l: 'Seats used', w: '110px', r: t => <span className="tn">{t.seats}</span> }, { k: 'money', l: 'Paying', w: '150px', hide: 'lap' }, { k: 'st', l: 'Status', w: '104px', r: t => <St v={t.st} /> }]}
      menu={t => [{ l: 'Open team', fn: () => go('workspace', t.id) }, ...(t.p.includes('Accelerator') ? [{ l: 'See them in the cohort', fn: () => go('enrolled') }] : [])]} />
    <p className="me">31 Utah Life agents and 17 people on their own are not listed here. <button className="lk a" onClick={() => go('groups')}>Utah Life</button> · <button className="lk a" onClick={() => go('people')}>Everyone</button></p>
  </div>;
}

/* ---------- People › Utah Life: an access group, in its own area ---------- */
function Groups() {
  const { go, guard, toast, setDlg, log } = useC();
  const [q, setQ] = useState('');
  return <div className="pg">
    <Head t="Utah Life" meta={<Pill v="Access group" tone="" />} d="Agents with a liveutah.com address get the Agent Plan's skills at no charge. They are counted here: not in a cohort, not as teams, and not in revenue."
      right={<><Btn ic="download" onClick={() => toast('Export started')}>Export</Btn><Menu items={[{ l: 'Add an address outside the domain…', g: 1, fn: () => guard('account', 'Add an address', () => toast('Adds one address to the group')) }, '-', { l: 'End access…', d: 1, g: 1, fn: () => guard('account', 'End Utah Life access', () => setDlg({ title: 'End Utah Life access?', body: '31 agents lose the Agent Plan\'s skills right away. Their accounts stay, with nothing to open.', cta: 'End access', danger: 1, needReason: 1, yes: r => { log('access_group.end', 'Utah Life', r); toast('Access ended'); } })) }]} /></>} />
    <LFacts items={[['Agents signed in', '31'], ['Active, last 30 days', '24'], ['Gets', 'Agent Plan skills, free', ['course', null, 'words'], 1], ['Who qualifies', 'A verified @liveutah.com address', null, 1], ['Since', 'Thu, Nov 12, 2026'], ['Ends', 'No end date']]} />
    <div className="gms">
      <div className="col">
        <div className="row"><Find v={q} on={setQ} ph="Find an agent by email" /></div>
        <Table title="Agents" rows={ULA.filter(r => r[0].includes(q.toLowerCase()))}
          cols={[{ k: 0, l: 'Agent', w: 'minmax(200px,1.5fr)', r: r => <Two a="Utah Life agent" b={r[0]} /> }, { k: 1, l: 'First sign-in', w: '120px', ns: 1 }, { k: 2, l: 'Last active', w: '170px', ns: 1 }, { k: 3, l: 'Skills opened', w: '110px', num: 1 }]} />
        <p className="me">Showing 8 of 31. Addresses are masked in this mockup.</p>
      </div>
      <div className="col">
        <Card t="What they can open"><div className="col m">
          <div className="row nw" style={{ gap: 10 }}><span className="mt"><I n="check" /></span><span className="col" style={{ gap: 0 }}><span className="w5">The Agent Plan's skills</span><span className="me">Every agent skill, and each new one as it is released</span></span></div>
          <div className="row nw" style={{ gap: 10 }}><span className="mt off"><I n="lock" /></span><span className="col" style={{ gap: 0 }}><span className="w5">Not the Accelerator, not team skills</span><span className="me">A locked skill says "Not included with Utah Life access"</span></span></div>
          <button className="lk a" style={{ alignSelf: 'flex-start' }} onClick={() => go('course', null, 'words')}>Change that line in Words</button></div></Card>
        <Card t="Most opened" sub="Last 30 days"><div className="col m">{[['Appointment Follow-Up', 22], ['Repair Request Response', 19], ['Listing Description Writer', 11], ['Speed to Lead Reply', 7]].map(s => <div key={s[0]} className="rdy" style={{ cursor: 'default' }}><span className="el" style={{ flex: '0 0 176px' }}>{s[0]}</span><PBar v={s[1]} max={24} /><span className="tn w5 rdn" style={{ minWidth: 24 }}>{s[1]}</span></div>)}</div></Card>
        <Card t="Where they are counted"><div className="kvs"><KV rows={[['Overview', 'Shown, kept apart from learners'], ['A cohort', 'Never. They are not in one.'], ['Teams', 'Never. Each is one person.'], ['Revenue', 'Never. The access is free.']]} /></div></Card>
      </div>
    </div>
  </div>;
}

/* ---------- Revenue › Summary: what came in, what is still owed, what repeats ---------- */
const REV = {
  'All time': { c: '$82,694', cs: 'Since Aug 2026', t: '$90,194' },
  'This month': { c: '$53,160', cs: 'Nov 1 to Nov 24', t: '$60,660' },
};
const RV_MONTHS = [['Aug', 7480, 0], ['Sep', 9917, 0], ['Oct', 12137, 0], ['Nov', 53160, 0], ['Dec', 0, 19929], ['Jan', 0, 12429]];
const RV_PROD = [
  ['AI Accelerator', 'December 2026 · 7 of 15 seats', '$45,000', '$7,500', '$52,500', 'One-time', ['enrolled']],
  ['Team Plan', '7 teams · 39 people', '$19,395', '$0', '$19,395', '$6,465', ['billing', null, 'subs']],
  ['Agent Plan', '46 agents', '$16,146', '$0', '$16,146', '$5,382', ['billing', null, 'subs']],
  ['Insiders', '6 members', '$1,746', '$0', '$1,746', '$582', ['billing', null, 'subs']],
  ['Skills', '11 bought', '$407', '$0', '$407', 'One-time', ['billing', null, 'invoices']],
];
const RV_NEXT = [
  ['Thu, Dec 3', 'Hale & Marlowe Realty', 'Team Plan renewal', '$695', 'Scheduled', 'ws_halemarlowe'],
  ['Fri, Dec 4', 'Tidewater Property Co.', 'Insiders, second try', '$97', 'Retrying', 'ws_tidewater'],
  ['Sun, Dec 6', 'Red Cliff Collective', 'Agent Plan renewal', '$1,450', 'Scheduled', 'ws_redcliff'],
  ['Tue, Dec 8', 'Northshore Group', 'Team Plan renewal', '$1,495', 'Scheduled', 'ws_northshore'],
  ['Wed, Dec 30', 'Copper Basin Realty', 'Accelerator, payment 2 of 2', '$3,750', 'Scheduled', 'ws_copperbasin'],
  ['Wed, Dec 30', 'Lantern Street Partners', 'Accelerator, payment 2 of 2', '$3,750', 'Scheduled', 'ws_lantern'],
];
function Revenue() {
  const { go, ph } = useC();
  const [per, setPer] = useState('All time');
  const r = REV[per], max = Math.max(...RV_MONTHS.map(m => m[1] + m[2]));
  const usd = n => '$' + n.toLocaleString('en-US');
  return <div className="pg">
    <Head t="Revenue" right={<Sel label="Period" v={per} on={setPer} opts={['All time', 'This month']} />} />
    <div className="g5">
      <Stat l="Cash collected" v={r.c} sub={r.cs} go={() => go('billing', null, 'invoices')} />
      <Stat l="Still to collect" v="$7,500" sub={ph ? '2 payments · Dec 30' : '2 payments · Wed, Dec 30'} tone="info" go={() => document.getElementById('rv-next') && document.getElementById('rv-next').scrollIntoView({ behavior: 'smooth', block: 'start' })} />
      <Stat l="Total revenue" v={r.t} sub="Collected + still to collect" go={() => go('billing', null, 'customers')} />
      <Stat l="MRR" v="$12,429" sub="59 subscriptions" tone="ok" go={() => go('billing', null, 'subs')} />
      <Stat l="Failed payments" v="3" sub="Needs review" tone="bad" go={() => go('billing', null, 'failed')} />
    </div>
    <div className="gms">
      <Card t="Cash by month" sub="Collected, and what Stripe already has on the calendar" right={!ph && <span className="row" style={{ gap: 12 }}><span className="lg"><i style={{ background: 'var(--for)' }} />Collected</span><span className="lg"><i className="hat" />On the calendar</span></span>}>
        <div className="rvc" role="img" aria-label="Cash collected by month from August to November, and what is scheduled for December and January.">{RV_MONTHS.map(m => { const v = m[1] + m[2]; return <div key={m[0]} className="rvm"><span className="tn me">{usd(v)}</span><span className="rvb"><i className={m[2] ? 'hat' : ''} style={{ height: Math.max(4, (v / max) * 100) + '%' }} /></span><span className={'w5' + (m[0] === 'Nov' ? '' : ' mu')}>{m[0]}</span></div>; })}</div>
        {ph && <div className="row" style={{ gap: 12, marginTop: 12 }}><span className="lg"><i style={{ background: 'var(--for)' }} />Collected</span><span className="lg"><i className="hat" />On the calendar</span></div>}
        <p className="me" style={{ marginTop: 12 }}>December counts two second payments ($7,500) and this month's renewals. It is not a forecast of new sales.</p>
      </Card>
      <div className="col">
        <Card t="AI Accelerator" sub="December 2026 Cohort" right={<Btn onClick={() => { setCur('dec26'); go('enrolled'); }}>People</Btn>}><div className="col m">
          <button className="rdy" onClick={() => go('enrolled')}><span style={{ flex: '0 0 96px' }}>Seats sold</span><Bar v={7} max={15} fx /><span className="tn w5 rdn">7 of 15</span></button>
          <div className="kvs"><KV rows={[['Paid in full', '5 teams · $37,500'], ['On two payments', '2 teams · $7,500 in, $7,500 to come'], ['Refunds', 'None']]} /></div></div></Card>
        <Card t="Refunds" sub="Last 30 days" right={<Btn onClick={() => go('billing', null, 'refunds')}>Open</Btn>}><span className="fig">$695</span><p className="me">1 refund · Fourth Meridian · Nov 1</p></Card>
      </div>
    </div>
    <Table title="By product" rows={[RV_PROD[0], ...COHORTS.filter(c => c.id !== 'dec26').map(c => ['AI Accelerator', c.n.replace(' Cohort', '') + ' · ' + c.teams.length + ' of ' + c.cap + ' seats', '$0', '$0', '$0', 'One-time', ['enrolled'], c.id]), ...RV_PROD.slice(1)]} onRow={p => { if (p[0] === 'AI Accelerator') setCur(p[7] || 'dec26'); go(...p[6]); }}
      cols={[{ k: 0, l: 'Product', w: 'minmax(160px,1.4fr)', r: p => <Two a={p[0]} b={p[1]} /> }, { k: 2, l: 'Collected', w: '110px', num: 1 }, { k: 3, l: 'Still to collect', w: '120px', num: 1, hide: 'lap' }, { k: 4, l: 'Total', w: '110px', num: 1, r: p => <span className="w5">{p[4]}</span> }, { k: 5, l: 'MRR', w: '100px', num: 1 }]} />
    <div id="rv-next"><Table title="Coming in" right={<span className="me">Next 60 days · $11,237</span>} rows={RV_NEXT} onRow={p => go('workspace', p[5])}
      cols={[{ k: 0, l: 'When', w: '120px', ns: 1 }, { k: 1, l: 'From', w: 'minmax(180px,1.3fr)', r: p => <span className="w5 el" style={{ display: 'block' }}>{p[1]}</span> }, { k: 2, l: 'For', w: 'minmax(190px,1.3fr)', hide: 'lap' }, { k: 3, l: 'Amount', w: '96px', num: 1 }, { k: 4, l: 'Status', w: '112px', r: p => <St v={p[4]} /> }]} /></div>
  </div>;
}

/* ---------- Overview: who is counted as a learner ---------- */
function AudCard() {
  const { go } = useC();
  return <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Who has a sign-in</h2><span className="me">{AUD_ALL} people, each counted once. Utah Life agents are kept out of the learner count and out of revenue.</span></div><Btn onClick={() => go('people')}>People</Btn></div>
    <div className="cdb col m"><div className="aub" aria-hidden="true">{AUD.map(a => <i key={a[0]} style={{ flex: a[2], background: a[3] }} />)}</div>
      <div className="aul">{AUD.map(a => <button key={a[0]} className="auk" onClick={() => a[0] === 'ul' ? go('groups') : a[0] === 'acc' ? go('enrolled', null, 'learners') : go('people', null, a[0])}><i style={{ background: a[3] }} /><span className="col" style={{ gap: 0 }}><span className="w5 tn">{a[2]}</span><span className="me">{a[1]}</span></span></button>)}</div></div></section>;
}
