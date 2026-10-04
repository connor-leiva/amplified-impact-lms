// Seed data, ported verbatim from design-reference/lms-data.js (baseSeed, seed, blankModule).
// Every id, string, number and timestamp matches the reference; packages/core/test/fixtures/seed-*.json
// are the authoritative output. Two deliberate deviations from the reference, required by core's purity
// rule: blankModule takes `now` instead of calling Date.now(), and the private T/S/six/ids6/built/wip
// helpers are kept so the generated values stay identical.
import { CATEGORIES, DB_V, EXEC_CATEGORIES } from './constants';
import { canAccess } from './status';
import { ZERO_BASE } from './types';
import type {
  ActivityEvent,
  AIEmployee,
  Announcement,
  Db,
  Learner,
  LearnerRole,
  Phase,
  Progress,
  Resource,
  Session,
  Step,
  Tier,
} from './types';

const T = (s: string): number => Date.parse(s.length <= 16 ? s + ':00-06:00' : s);
const S = (text: string, ch: string, mins: number, t: number, hint = ''): Omit<Step, 'id'> => ({ text, ch, mins, t, hint });
const six = (arr: Omit<Step, 'id'>[]): Step[] => arr.map((s, i) => ({ id: 'c' + (i + 1), ...s }));

export const blankModule = (order: number, now: number): AIEmployee => ({
  id: 'm' + now.toString(36), name: 'New AI Employee', short: 'New', tier: 'agent', icon: 'home', forWho: 'all agents',
  headline: '', outcome: '', outputs: ['', '', ''], platform: 'Claude Project', runLabel: 'Run on an Example', build: 30, session: null, status: 'draft', opens: null, order, dur: 0, transcript: [],
  notes: '', instructor: 'Jordan Hale',
  prompt: '# Role\nYou are the ___ AI Employee for {{TEAM_NAME}}.\n\n# Inputs\n- \n\n# Outputs\n1. \n\n# Rules\n- Follow the Fair Housing Act in every output.\n',
  files: [], resources: [],
  checklist: six([S('Create the Claude Project', 'Create the Project', 3, 240), S('Paste the system prompt into Project Instructions', 'Add the System Prompt', 5, 600), S('Upload your source files', 'Load Your Files', 5, 1100), S('Add the skill files to the project knowledge', 'Add the Skills', 5, 1500), S('Run the test prompt', 'Run the Test', 6, 2200), S('Check the output against the rubric', 'Check the Output', 6, 2800)]),
});

// ---------- Seed ----------
const ids6 = (n: number): string[] => Array.from({ length: n }, (_, i) => 'c' + (i + 1));
const built = (at: string, dep: string | null, extra: Partial<Progress> = {}): Progress => ({ steps: ids6(6), builtAt: T(at), deployedAt: dep ? T(dep) : null, runtime: dep ? 'deployed' : null, ...extra });
const wip = (n: number): Progress => ({ steps: ids6(n), builtAt: null, deployedAt: null, runtime: null });
const SESSION_TITLES = ['The Autonomous Agent', 'Speed to Lead', 'The Living Database', 'The Meeting That Runs Itself', 'Numbers on Autopilot', 'Contract to Close'];
const mkSessions = (cid: string, ci: number, days: string[]): Session[] => days.map((d, i) => ({
  id: `${cid}-s${i + 1}`, cohortId: cid, n: i + 1, title: SESSION_TITLES[i]!, start: T(d + 'T13:00'), mins: 75,
  zoom: `https://zoom.us/j/${8841200610 + i * 1371 + ci * 97}`, live: false, attended: null, replay: null, views: 0,
}));
const res = (id: string, title: string, desc: string, cat: string, type: string, tier: Tier, size: string, dl: number, upd: string, exec = false): Resource => ({ id, title, desc, cat, type, tier, size, dl, updated: T(upd), exec, status: 'published' });

function baseSeed(): Db {
  const sessions = [
    ...mkSessions('dec26', 0, ['2026-12-01', '2026-12-03', '2026-12-09', '2026-12-10', '2026-12-15', '2026-12-17']),
    ...mkSessions('feb27', 1, ['2027-02-02', '2027-02-04', '2027-02-09', '2027-02-11', '2027-02-16', '2027-02-18']),
    ...mkSessions('apr27', 2, ['2027-04-06', '2027-04-08', '2027-04-13', '2027-04-15', '2027-04-20', '2027-04-22']),
  ];
  Object.assign(sessions[0]!, { attended: 121, replay: 'ready', views: 312 });
  Object.assign(sessions[1]!, { attended: 109, replay: 'ready', views: 188 });
  sessions[2]!.movedFrom = T('2026-12-08T13:00');

  const modules: AIEmployee[] = [
    {
      id: 'marketing', name: 'Marketing AI Employee', short: 'Marketing', tier: 'agent', icon: 'megaphone',
      forWho: 'listing agents & marketing coordinators',
      headline: 'Launch every listing in minutes, compliant on every channel.',
      outcome: 'Paste an MLS listing → Fair-Housing-checked description, 5 social posts, 1 email.',
      outputs: ['Fair-Housing-checked MLS description', '5 social posts in your brand voice', '1 just-listed email'],
      platform: 'Claude Project', runLabel: 'Run on a Listing',
      build: 45, session: 1, status: 'published', opens: null, order: 1, dur: 3504, instructor: 'Jordan Hale',
      transcript: [
        [12, "Welcome in. Today we're hiring your first AI employee, and by the end of this session it will be working for you."],
        [95, 'An AI employee is three things: a job description, a set of skills, and a way to check its work.'],
        [300, 'Start by creating a Claude Project. Name it after the job, not the tool.'],
        [390, 'The system prompt is the job description. It tells Claude who it works for, what good looks like, and what it must never do.'],
        [512, 'Notice the compliance section sits at the top. Fair housing rules are not optional, so they come before style.'],
        [1120, 'Upload your last three listing descriptions so it learns your brand voice instead of sounding generic.'],
        [1402, 'The skill files teach it repeatable jobs: the launch packet and the compliance check.'],
        [1935, 'Now paste the test listing. The packet comes back as an MLS description, five social posts and one email.'],
        [2440, 'The compliance check flags steering language, like describing a neighborhood as perfect for young families.'],
        [2610, 'If it flags something, it explains which rule applies and suggests a compliant rewrite.'],
        [2990, "Your checklist is on the page. Don't mark the last step verified until the test listing passes the compliance check."],
        [3260, 'Question from the chat: can this post directly to Instagram? Not yet. That comes in the Operations module.'],
      ],
      notes: 'Run the compliance check on every public-facing output, including social captions. Keep your brand voice file under 2,000 words; longer files dilute the style signal. If your MLS has a character limit, add it to the Output rules section before you test.',
      prompt: `# Role
You are the Marketing AI Employee for {{TEAM_NAME}}, a real estate team in {{MARKET}}.
You produce listing marketing that is accurate, on-brand and compliant.

# Compliance (always first)
- Follow the Fair Housing Act. Describe the property and amenities, never people.
- Flag steering language (e.g. "perfect for young families", "safe neighborhood").
- Follow MLS rules: no contact info in public remarks; stay under {{MLS_CHAR_LIMIT}} characters.

# Inputs
- Listing details: address, price, beds/baths, square footage, features
- Brand voice file: three past listing descriptions
- Weekly market snapshot: inventory, days on market, price changes

# Outputs
1. MLS description that passes the compliance check
2. 5 social posts in the brand voice
3. 1 just-listed email

# Output rules
- Lead with the strongest feature. No exclamation marks.
- Run the compliance check before returning anything. List any flags first.`,
      files: [
        { name: 'listing-launch-packet.skill.json', type: 'JSON', size: '4 KB', desc: 'MLS copy, social posts and email from one listing', steps: ['Extract property facts', 'Draft MLS public remarks', 'Draft 5 social posts', 'Draft just-listed email', 'Run fair-housing-check'] },
        { name: 'fair-housing-check.skill.yaml', type: 'YAML', size: '2 KB', desc: 'Flags steering language and suggests rewrites', steps: ['Scan for protected-class references', 'Flag steering phrases', 'Cite the rule', 'Suggest a compliant rewrite'] },
        { name: 'Brand Voice Intake', type: 'Notion', size: 'Template', desc: 'Tone, phrases to use and phrases to avoid', steps: ['Paste 3 past listing descriptions', 'List 5 words that sound like you', 'List phrases you never use'] },
      ],
      resources: [{ name: 'Session 1 Slides', type: 'PDF', size: '4.2 MB' }, { name: 'Test Listing: 1418 Alder Ct', type: 'PDF', size: '180 KB' }, { name: 'Fair Housing Quick Reference', type: 'PDF', size: '320 KB' }],
      checklist: six([
        S('Create a Claude Project named “Marketing AI Employee”', 'Create the Project', 5, 300, 'Projects keep the prompt and skill files together.'),
        S('Paste the system prompt into Project Instructions', 'Add the System Prompt', 8, 390, 'Replace {{TEAM_NAME}}, {{MARKET}} and {{MLS_CHAR_LIMIT}} first.'),
        S('Upload your last 3 listing descriptions', 'Teach It Your Voice', 8, 1120, 'This becomes the brand voice file.'),
        S('Add both skill files to the project knowledge', 'Add the Skills', 6, 1402),
        S('Run the test prompt with the sample listing', 'Run the Test Listing', 10, 1935, 'Test listing: 1418 Alder Ct, in the build kit.'),
        S('Confirm the compliance check flags the test phrase', 'Check Compliance', 8, 2440, 'Expect a flag on “perfect for young families.”'),
      ]),
      runDemo: {
        input: '1418 Alder Ct · $649,000 · 4 bd · 3 ba · 2,380 sq ft\nUpdated kitchen with quartz counters, vaulted living room, fenced yard backing to the greenbelt. Walk to the Alder Creek trail. Perfect for young families.',
        sections: [
          ['Compliance check', '1 flag fixed. “Perfect for young families” describes people, not the property (Fair Housing Act, familial status). Rewritten as “Room to spread out, with a fenced yard.”'],
          ['MLS description', 'Vaulted ceilings and a quartz kitchen open onto a fenced yard that backs to the greenbelt. Four bedrooms and three baths across 2,380 sq ft, with room to spread out and a short walk to the Alder Creek trail.'],
          ['5 social posts', '1. Just listed: 1418 Alder Ct. Vaulted ceilings, quartz kitchen, greenbelt views.\n2. Morning coffee, trail access, nobody behind you. 1418 Alder Ct is live.\n3. 4 bd · 3 ba · 2,380 sq ft. Fenced yard on the greenbelt. Tour this weekend.\n4. The kitchen was redone top to bottom: quartz, new cabinetry, room for a crowd.\n5. Open house Saturday 11–2 at 1418 Alder Ct. Bring your questions.'],
          ['1 email', 'Subject: Just listed: 1418 Alder Ct\nA greenbelt lot, a renovated kitchen and room to spread out. Reply to book a private tour before Saturday’s open house.'],
        ],
      },
    },
    {
      id: 'sales', name: 'Sales AI Employee', short: 'Sales', tier: 'agent', icon: 'zap', forWho: 'buyer & listing agents',
      headline: 'Answer every new lead in under five minutes.',
      outcome: 'Paste a new lead → a first reply in your voice, 2 objection responses, a consult brief.',
      outputs: ['First reply drafted within 5 minutes', 'Two objection responses: empathetic and direct', 'One-page consultation brief'],
      platform: 'Claude Project + CRM webhook', runLabel: 'Run on a Lead',
      build: 30, session: 2, status: 'published', opens: null, order: 2, dur: 3390, instructor: 'Jordan Hale',
      transcript: [
        [18, 'The first agent to reply usually gets the conversation. Today we make five minutes your default.'],
        [430, 'The responder prompt has one job: a short, human first reply that asks a single question.'],
        [702, 'Match the channel. If they texted, you text. If they came through the portal, reply in the portal.'],
        [1130, 'Paste an objection and you get two replies back: one empathetic, one direct.'],
        [1865, "Consultation prep pulls the lead's activity into a one-page brief with three questions to ask."],
        [2630, 'The webhook is what makes this automatic. Your CRM sends the new lead and Claude drafts the reply.'],
      ],
      notes: 'Most CRMs can send a webhook when a lead is created; the setup guide for each platform is in the Resource Vault. Keep the first reply to one question. Longer first replies get fewer responses.',
      prompt: `# Role
You are the Sales AI Employee for {{AGENT_NAME}} at {{TEAM_NAME}}.
You respond to new leads fast and help the agent win the consultation.

# Speed to lead
- Draft a first response within 5 minutes of a new lead notification.
- Match the channel the lead used (text, email or portal message).
- Ask one qualifying question: timeline, financing or location.

# Objection handling
- When the agent pastes an objection, return 2 replies: one empathetic, one direct.
- Never promise pricing, timelines or outcomes.

# Consultation prep
- Summarize the lead's activity, likely needs and 3 questions to ask.

# Guardrails
- Fair housing applies to every message. Never reference protected classes.
- Hand off to the agent if the lead asks for legal or lending advice.`,
      files: [
        { name: 'speed-to-lead.skill.json', type: 'JSON', size: '3 KB', desc: 'First-reply drafts by channel, under 5 minutes', steps: ['Read lead source and channel', 'Draft first reply', 'Ask one qualifying question', 'Log reply time'] },
        { name: 'objection-library.skill.yaml', type: 'YAML', size: '6 KB', desc: '24 common objections with two reply styles', steps: ['Match objection type', 'Draft empathetic reply', 'Draft direct reply'] },
        { name: 'Buyer Consult Prep', type: 'Notion', size: 'Template', desc: 'One-page pre-call brief', steps: ['Lead summary', 'Likely needs', '3 questions to ask'] },
      ],
      resources: [{ name: 'Session 2 Slides', type: 'PDF', size: '3.8 MB' }, { name: 'Lead Webhook Payload Sample', type: 'JSON', size: '1 KB' }],
      checklist: six([
        S('Create the “Sales AI Employee” Claude Project', 'Create the Project', 3, 240),
        S('Paste the system prompt and set your name and team', 'Add the System Prompt', 5, 430),
        S('Upload your buyer consultation deck', 'Add Your Consult Deck', 4, 980),
        S('Add the objection library skill file', 'Objection Handling', 4, 1130),
        S('Connect the new-lead webhook from your CRM', 'Connect the Webhook', 8, 2630, 'Guide: CRM New-Lead Webhook Setup, in the Resource Vault.'),
        S('Send a test lead and get a reply in under 5 minutes', 'Test Speed to Lead', 6, 2900),
      ]),
      runDemo: {
        input: 'New lead · Zillow · Maya Reyes\n“Is 1418 Alder Ct still available? We’d want to see it this week.”',
        sections: [
          ['First reply', 'Hi Maya, it’s Alex with Northline. 1418 Alder Ct is available and I can show it Thursday or Saturday. Which works better?'],
          ['2 objection responses', 'If “We’re not ready to talk to an agent yet”:\nEmpathetic: Totally fair. I can send the disclosures and recent sales nearby so you can look on your own time.\nDirect: Happy to keep it light. A 15-minute tour is the fastest way to know if it’s worth a second look.'],
          ['Consult brief', 'Viewed 4 listings in Alder Creek this week, all 4 bd under $675k. Likely needs: a yard and trail access. Ask about timeline, pre-approval and must-haves.'],
        ],
      },
    },
    {
      id: 'database', name: 'Database AI Employee', short: 'Database', tier: 'agent', icon: 'database', forWho: 'agents with a sphere of 200+ contacts',
      headline: 'Keep your sphere warm without sounding automated.',
      outcome: 'Upload your contact export → 10 weekly check-ins, a 3-touch reactivation sequence, anniversary notes.',
      outputs: ['10 personal check-ins every week', '3-touch reactivation for quiet contacts', 'Home anniversary notes on schedule'],
      platform: 'Claude Project', runLabel: 'Run on Your Contacts',
      build: 40, session: 3, status: 'published', opens: null, order: 3, dur: 0, instructor: 'Jordan Hale', transcript: [],
      notes: 'Clean your export before the session: remove duplicates and contacts without a close date or last-touch date. The prompt ranks check-ins by time since last touch, so missing dates push contacts to the bottom.',
      prompt: `# Role
You are the Database AI Employee for {{AGENT_NAME}}.
You keep past clients and sphere contacts engaged without sounding automated.

# Inputs
- Contact export (CSV): name, address, close date, last touch, tags
- Personal notes the agent keeps for each contact

# Workflows
1. Reactivation: 3-touch sequence for contacts with no touch in 12+ months
2. Check-ins: 10 personal check-in messages per week, ranked by priority
3. Anniversaries: home anniversary note that offers a value update

# Rules
- Reference one specific detail from the notes in every message.
- Never mention a contact's home value unless they asked for it.
- Output a table: contact, channel, message, send date.`,
      files: [
        { name: 'reactivation-sequence.skill.json', type: 'JSON', size: '5 KB', desc: '3-touch sequence for contacts quiet 12+ months', steps: ['Filter contacts by last touch', 'Draft touch 1', 'Draft touch 2', 'Draft touch 3'] },
        { name: 'anniversary-workflow.skill.yaml', type: 'YAML', size: '3 KB', desc: 'Home anniversary notes scheduled by close date', steps: ['Find anniversaries in the next 30 days', 'Draft note', 'Schedule send date'] },
        { name: 'Sphere Segmentation SOP', type: 'Notion', size: 'Template', desc: 'Tagging rules for A, B and C contacts', steps: ['Define A/B/C criteria', 'Tag contacts', 'Set touch cadence'] },
      ],
      resources: [{ name: 'Session 3 Slides', type: 'PDF', size: 'Posted after the session' }],
      checklist: six([
        S('Export your contacts from your CRM as CSV', 'Export Your Contacts', 6, 240, 'Include close date and last-touch date.'),
        S('Create the “Database AI Employee” Claude Project', 'Create the Project', 3, 600),
        S('Paste the system prompt', 'Add the System Prompt', 5, 840),
        S('Upload your contact export and personal notes', 'Load Your Sphere', 8, 1500),
        S('Add the reactivation and anniversary skill files', 'Add the Skills', 6, 2100),
        S("Generate this week's 10 check-ins and send 2", 'Send your first check-ins', 12, 2700),
      ]),
    },
    {
      id: 'meetings', name: 'Meetings AI Employee', short: 'Meetings', tier: 'team', icon: 'mic', forWho: 'team leaders & ops leads',
      headline: 'Every leadership meeting ends with decisions, owners and next week’s agenda.',
      outcome: 'Paste a meeting transcript → decisions, owners and due dates, next week’s agenda.',
      outputs: ['Decisions, risks and open questions from any transcript', 'Action items with an owner and due date', 'Next week’s agenda, built from open items'],
      platform: 'Claude Project', runLabel: 'Run on a Transcript',
      build: 35, session: 4, status: 'published', opens: null, order: 4, dur: 0, instructor: 'Jordan Hale', transcript: [],
      notes: 'Bring one real leadership meeting transcript to the session. Recorded team meetings work too.',
      prompt: `# Role
You are the Meetings AI Employee for the leadership team at {{TEAM_NAME}}.

# Inputs
- Meeting transcript (any recorder's text export)
- Last week's scorecard and open action items

# Outputs
1. Atomized summary: decisions, open questions, risks
2. Action items: owner, due date, definition of done
3. Next week's agenda, built from open items and scorecard misses

# Rules
- Quote the transcript when recording a decision.
- If an action item has no owner, list it under "Needs an owner".`,
      files: [
        { name: 'transcript-atomizer.skill.json', type: 'JSON', size: '4 KB', desc: 'Decisions, risks and questions from any transcript', steps: ['Split transcript by topic', 'Extract decisions', 'Extract open questions', 'Extract risks'] },
        { name: 'leadership-agenda.skill.yaml', type: 'YAML', size: '2 KB', desc: 'Builds next week’s agenda from open items', steps: ['Pull open action items', 'Add scorecard misses', 'Time-box agenda'] },
        { name: 'Weekly Leadership Meeting', type: 'Notion', size: 'Template', desc: 'Agenda, scorecard and issues list', steps: ['Scorecard', 'Issues', 'Decisions', 'Action items'] },
      ],
      resources: [{ name: 'Session 4 Slides', type: 'PDF', size: 'Posted after the session' }],
      checklist: six([
        S('Create the “Meetings AI Employee” Claude Project', 'Create the Project', 3, 240),
        S('Paste the system prompt', 'Add the System Prompt', 5, 600),
        S('Add the transcript atomizer and agenda skill files', 'Add the Skills', 5, 1100),
        S("Upload last week's meeting transcript", 'Load a real meeting', 6, 1500),
        S('Review decisions and action items against your notes', 'Check the Summary', 8, 2200),
        S("Generate next week's agenda and share it with your team", 'Ship the agenda', 8, 2800),
      ]),
    },
    {
      id: 'finance', name: 'Finance AI Employee', short: 'Finance', tier: 'team', icon: 'dollar', forWho: 'team owners & finance leads',
      headline: 'Know your net commission and margin on every deal.',
      outcome: 'Upload a Sisu export → net commission by agent, categorized expenses, margin flags.',
      outputs: ['Gross and net commission by agent, month to date', 'Expenses mapped to your P&L categories', 'Flags on any deal under your margin threshold'],
      platform: 'Claude Project + Sisu export', runLabel: 'Run on a Sisu Export',
      build: 50, session: 5, status: 'published', opens: null, order: 5, dur: 0, instructor: 'Jordan Hale', transcript: [],
      notes: 'Export closed deals from Sisu for the last 90 days before the session. Have your P&L category list ready.',
      prompt: `# Role
You are the Finance AI Employee for {{TEAM_NAME}}.

# Inputs
- Sisu closed-deal export: agent, side, price, commission, splits
- Monthly expense export from your bookkeeping software

# Outputs
1. Commission tracker: gross and net commission by agent, month to date
2. Expense categorization mapped to your P&L categories
3. Deal margin report: flag any deal under {{MIN_MARGIN}}% net margin

# Rules
- Show your math for every total.
- Never change source numbers. Flag mismatches instead.`,
      files: [
        { name: 'sisu-commission-tracker.skill.json', type: 'JSON', size: '6 KB', desc: 'Gross and net commission by agent', steps: ['Load Sisu export', 'Apply splits', 'Summarize by agent'] },
        { name: 'pnl-categories.skill.yaml', type: 'YAML', size: '3 KB', desc: 'Maps expenses to your P&L categories', steps: ['Load expense export', 'Match categories', 'Flag unknowns'] },
        { name: 'Monthly Close Checklist', type: 'Notion', size: 'Template', desc: 'Month-end close for real estate teams', steps: ['Reconcile commissions', 'Categorize expenses', 'Review margins'] },
      ],
      resources: [{ name: 'Session 5 Slides', type: 'PDF', size: 'Posted after the session' }],
      checklist: six([
        S('Export closed deals from Sisu (last 90 days)', 'Export from Sisu', 6, 240),
        S('Create the “Finance AI Employee” Claude Project', 'Create the Project', 3, 600),
        S('Paste the system prompt and set your margin threshold', 'Add the System Prompt', 6, 900),
        S('Upload your P&L category list and expense export', 'Load Your Books', 10, 1500),
        S("Reconcile last month's commissions against Sisu", 'Reconcile commissions', 15, 2200),
        S('Review the deal margin report and flag 1 deal', 'Review Margins', 10, 2900),
      ]),
    },
    {
      id: 'operations', name: 'Operations AI Employee', short: 'Operations', tier: 'team', icon: 'workflow', forWho: 'ops leads & transaction coordinators',
      headline: 'Nothing slips between contract and close.',
      outcome: 'Upload an executed contract → a deadline timeline, milestone emails, a 30-day onboarding plan.',
      outputs: ['Contract-to-close timeline with every contingency', 'Milestone emails for lender, title and client', '30-day onboarding plan for new agents'],
      platform: 'Claude Project', runLabel: 'Run on a Contract',
      build: 45, session: 6, status: 'scheduled', opens: T('2026-12-14T09:00'), order: 6, dur: 0, instructor: 'Jordan Hale', transcript: [],
      notes: 'Bring one executed purchase contract with personal details redacted.',
      prompt: `# Role
You are the Operations AI Employee for {{TEAM_NAME}}.

# Inputs
- Executed purchase contract (PDF)
- Team transaction checklist and vendor list

# Outputs
1. Contract-to-close timeline with every contingency deadline
2. TC emails for each milestone: lender, title, inspector, client
3. New agent onboarding checklist for the first 30 days

# Rules
- Take dates only from the contract. If a date is missing, ask.
- Cite the contract section for every deadline.`,
      files: [
        { name: 'c2c-timeline.skill.json', type: 'JSON', size: '5 KB', desc: 'Deadline calendar from an executed contract', steps: ['Extract contract dates', 'Build contingency timeline', 'Cite sections'] },
        { name: 'tc-email-templates.skill.yaml', type: 'YAML', size: '4 KB', desc: 'Milestone emails for every party', steps: ['Lender update', 'Title order', 'Inspection scheduling', 'Client update'] },
        { name: 'Agent Onboarding (30 days)', type: 'Notion', size: 'Template', desc: 'First-month plan for new agents', steps: ['Week 1 setup', 'Week 2 shadowing', 'Week 3–4 first leads'] },
      ],
      resources: [{ name: 'Session 6 Slides', type: 'PDF', size: 'Posted after the session' }],
      checklist: six([
        S('Create the “Operations AI Employee” Claude Project', 'Create the Project', 3, 240),
        S('Paste the system prompt', 'Add the System Prompt', 5, 600),
        S('Upload your transaction checklist and vendor list', 'Load Your Checklist', 7, 1100),
        S('Add the timeline and TC email skill files', 'Add the Skills', 5, 1500),
        S('Generate a timeline from a recent contract', 'Build a Timeline', 15, 2200),
        S('Send the first TC milestone email from the draft', 'Send a Milestone Email', 10, 2800),
      ]),
    },
  ];

  const U = (id: string, name: string, email: string, tier: Tier, role: LearnerRole, teamId: string | null, joined: string, last: string, progress: Record<string, Progress>, status: 'active' | 'invited' = 'active'): Learner => ({ id, name, email, tier, role, teamId, cohortId: 'dec26', joined: T(joined), last: T(last), status, progress });
  const users = [
    U('u_jamie', 'Jamie Ortiz', 'jamie@ortizhomes.com', 'agent', 'Agent', null, '2026-11-18T09:00', '2026-12-07T09:58', {
      marketing: built('2026-12-02T15:05', '2026-12-02T15:20', { lastRun: { at: T('2026-12-05T16:10'), title: 'Listing Launch Packet · 1418 Alder Ct', preview: 'Vaulted ceilings and a quartz kitchen open onto a fenced yard that backs to the greenbelt. Four bedrooms and three baths across 2,380 sq ft…' } }),
      sales: wip(3),
    }),
    U('u_alex', 'Alex Morgan', 'alex@northlinerealty.com', 'team', 'Team Owner', 'northline', '2026-11-12T10:00', '2026-12-07T10:31', {
      marketing: built('2026-12-01T16:50', '2026-12-01T17:05', { lastRun: { at: T('2026-12-06T09:30'), title: 'Listing Launch Packet · 3307 Juniper Ln', preview: 'A corner lot with mature oaks, a chef’s kitchen and a primary suite on the main floor. Five bedrooms across 3,140 sq ft…' } }),
      sales: built('2026-12-04T11:20', '2026-12-04T11:40', { lastRun: { at: T('2026-12-07T08:12'), title: 'First Reply · Zillow Lead, Maya R.', preview: 'Hi Maya, it’s Alex with Northline. 1418 Alder Ct is available and I can show it Thursday or Saturday. Which works better?' } }),
      database: wip(2),
    }),
    U('u_priya', 'Priya Shah', 'priya@northlinerealty.com', 'team', 'Operations Lead', 'northline', '2026-11-13T10:00', '2026-12-07T08:12', { marketing: built('2026-12-02T10:00', '2026-12-02T10:15'), meetings: wip(2) }),
    U('u_sarah', 'Sarah Collins', 'sarah@northlinerealty.com', 'team', 'Sales Agent', 'northline', '2026-11-14T10:00', '2026-12-07T10:04', { marketing: built('2026-12-02T13:10', '2026-12-02T13:30'), database: built('2026-12-07T09:50', '2026-12-07T10:04'), sales: wip(2) }),
    U('u_michael', 'Michael Grant', 'michael@northlinerealty.com', 'team', 'Sales Agent', 'northline', '2026-11-14T10:00', '2026-12-05T16:20', { marketing: wip(4) }),
    U('u_devon', 'Devon Price', 'devon@northlinerealty.com', 'team', 'Sales Agent', 'northline', '2026-11-16T10:00', '2026-12-06T19:45', { marketing: built('2026-12-01T19:50', '2026-12-01T20:10'), sales: built('2026-12-06T19:30', '2026-12-06T19:45', { runtime: 'needs_attention', issue: 'CRM webhook stopped responding' }) }),
    U('u_lena', 'Lena Brooks', 'lena@northlinerealty.com', 'team', 'Sales Agent', 'northline', '2026-11-20T10:00', '2026-11-29T12:00', {}),
    U('u_rosa', 'Rosa Delgado', 'rosa@delgadorealty.com', 'agent', 'Agent', null, '2026-11-15T10:00', '2026-12-07T08:40', { marketing: built('2026-12-01T15:40', '2026-12-01T16:00'), sales: built('2026-12-03T17:40', '2026-12-03T18:00'), database: built('2026-12-07T08:20', '2026-12-07T08:40') }),
    U('u_kenji', 'Kenji Watanabe', 'kenji@watanaberealty.com', 'agent', 'Agent', null, '2026-11-21T10:00', '2026-12-06T16:12', { marketing: built('2026-12-03T09:00', '2026-12-03T09:20'), sales: wip(1) }),
    U('u_natasha', 'Natasha Reed', 'natasha@harborpine.com', 'team', 'Team Owner', 'harbor', '2026-11-10T10:00', '2026-12-07T07:55', { marketing: built('2026-12-01T15:10', '2026-12-01T15:30'), sales: built('2026-12-03T16:50', '2026-12-03T17:10'), database: built('2026-12-06T10:40', '2026-12-06T11:00'), meetings: built('2026-12-07T07:40', '2026-12-07T07:55', { runtime: 'paused' }) }),
    U('u_claire', 'Claire Dubois', 'claire@harborpine.com', 'team', 'Operations Lead', 'harbor', '2026-11-11T10:00', '2026-12-06T14:30', { marketing: built('2026-12-02T08:40', '2026-12-02T09:00'), meetings: built('2026-12-06T14:10', '2026-12-06T14:30') }),
    U('u_omar', 'Omar Haddad', 'omar@haddadhomes.com', 'agent', 'Agent', null, '2026-11-24T10:00', '2026-11-26T12:00', {}),
    U('u_ben', 'Ben Foster', 'ben@fosterproperties.com', 'agent', 'Agent', null, '2026-11-25T10:00', '2026-12-04T13:00', { marketing: wip(2) }),
    U('u_marcus', 'Marcus Lee', 'marcus@keystonecollective.com', 'team', 'Team Owner', 'keystone', '2026-11-19T10:00', '2026-12-05T10:00', { marketing: built('2026-12-02T17:40', '2026-12-02T18:00'), sales: wip(1) }),
  ];

  return {
    v: DB_V,
    cohorts: [
      { id: 'dec26', name: 'December 2026', start: T('2026-12-01T13:00'), end: T('2027-01-08T17:00'), weeks: 6, status: 'live', capacity: 200, enrolled: 148, cadence: 'Tue & Thu · 1:00 PM CT' },
      { id: 'feb27', name: 'February 2027', start: T('2027-02-02T13:00'), end: T('2027-03-12T17:00'), weeks: 6, status: 'enrolling', capacity: 200, enrolled: 37, cadence: 'Tue & Thu · 1:00 PM CT' },
      { id: 'apr27', name: 'April 2027', start: T('2027-04-06T13:00'), end: T('2027-05-14T17:00'), weeks: 6, status: 'draft', capacity: 200, enrolled: 0, cadence: 'Tue & Thu · 1:00 PM CT' },
    ],
    sessions, modules, users,
    teams: [
      { id: 'northline', name: 'Northline Realty Team', ownerId: 'u_alex', seats: 7 },
      { id: 'harbor', name: 'Harbor & Pine Group', ownerId: 'u_natasha', seats: 7 },
      { id: 'keystone', name: 'Keystone Collective', ownerId: 'u_marcus', seats: 7 },
    ],
    resources: [
      res('r1', 'Fair Housing Language Checker', 'Claude Project that flags steering language before anything goes public.', CATEGORIES[0]!, 'Claude Project', 'agent', '18 KB', 412, '2026-12-01T09:00'),
      res('r2', 'MLS Public Remarks Rules', 'Character limits and prohibited content for 14 major MLS boards.', CATEGORIES[0]!, 'PDF guide', 'agent', '1.2 MB', 287, '2026-11-28T09:00'),
      res('r3', 'Steering Language Reference', 'Phrases to avoid, why each one is a risk, and compliant rewrites.', CATEGORIES[0]!, 'PDF guide', 'agent', '640 KB', 356, '2026-11-28T09:00'),
      res('r4', 'Expired & FSBO Outreach Scripts', 'Call, text and letter scripts with a follow-up cadence.', CATEGORIES[1]!, 'Prompt pack', 'agent', '24 KB', 198, '2026-12-03T09:00'),
      res('r5', 'Open House Follow-up Sequence', '5-touch workflow triggered by sign-in sheet entries.', CATEGORIES[1]!, 'Workflow JSON', 'agent', '9 KB', 164, '2026-12-03T09:00'),
      res('r6', 'Speed-to-Lead Text Library', 'First replies for portal, website and sign-call leads.', CATEGORIES[1]!, 'Prompt pack', 'agent', '12 KB', 241, '2026-12-03T09:00'),
      res('r7', 'Sphere Reactivation Scripts', 'Openers for contacts you have not spoken to in a year or more.', CATEGORIES[1]!, 'Prompt pack', 'agent', '15 KB', 133, '2026-12-05T09:00'),
      res('r8', 'CRM New-Lead Webhook Setup', 'Step-by-step webhook setup for the most common real estate CRMs.', CATEGORIES[2]!, 'PDF guide', 'agent', '2.1 MB', 219, '2026-12-02T09:00'),
      res('r9', 'Sisu Closed-Deal Export to Claude', 'Workflow that sends closed deals to the Finance AI Employee.', CATEGORIES[2]!, 'Workflow JSON', 'team', '7 KB', 61, '2026-12-04T09:00'),
      res('r10', 'Sisu Scorecard Webhook', 'Pushes weekly agent scorecards into your leadership agenda.', CATEGORIES[2]!, 'Workflow JSON', 'team', '6 KB', 48, '2026-12-04T09:00'),
      res('r11', 'Contract-to-Close Timeline Template', 'Claude Project that builds a deadline calendar from a contract.', CATEGORIES[3]!, 'Claude Project', 'team', '21 KB', 39, '2026-12-05T09:00'),
      res('r12', 'TC Milestone Email Pack', 'Emails for lender, title, inspector and client at each milestone.', CATEGORIES[3]!, 'Prompt pack', 'agent', '18 KB', 174, '2026-12-05T09:00'),
      res('r13', 'Inspection Deadline Tracker', 'Workflow that alerts the TC 48 hours before each contingency.', CATEGORIES[3]!, 'Workflow JSON', 'team', '8 KB', 27, '2026-12-06T09:00'),
      res('x1', 'Team Operating System SOP', 'How the team runs: roles, scorecards and meeting cadence.', EXEC_CATEGORIES[0]!, 'Notion template', 'team', 'Template', 44, '2026-12-01T09:00', true),
      res('x2', 'Agent Accountability SOP', 'Weekly 1:1 structure built on leading indicators.', EXEC_CATEGORIES[0]!, 'Notion template', 'team', 'Template', 31, '2026-12-01T09:00', true),
      res('x3', 'Weekly Leadership Meeting Framework', '60-minute agenda: scorecard, issues, decisions.', EXEC_CATEGORIES[1]!, 'Notion template', 'team', 'Template', 52, '2026-12-02T09:00', true),
      res('x4', 'Quarterly Planning Agenda', 'Half-day planning session with pre-work prompts.', EXEC_CATEGORIES[1]!, 'PDF guide', 'team', '820 KB', 23, '2026-12-02T09:00', true),
      res('x5', 'Sisu to Sheets P&L Sync', 'Workflow that keeps your P&L sheet current from Sisu.', EXEC_CATEGORIES[2]!, 'Workflow JSON', 'team', '11 KB', 36, '2026-12-04T09:00', true),
      res('x6', 'Commission Split Calculator', 'Claude Project for split, cap and fee scenarios.', EXEC_CATEGORIES[2]!, 'Claude Project', 'team', '16 KB', 41, '2026-12-04T09:00', true),
    ],
    announcements: [
      { id: 'a1', sessionId: 'dec26-s3', title: 'Session 3 moved to Wed Dec 9 · 1:00 PM CT', body: '', severity: 'warning', action: 'calendar', actionLabel: 'Update Calendar', audience: 'all', channels: ['inapp', 'email'], status: 'sent', at: T('2026-12-06T15:00'), opens: 0.71 },
      { id: 'a2', title: 'Replay is up: Session 2 · Speed to Lead', body: 'The replay, chapters and transcript are on the Sales AI Employee page.', severity: 'info', action: null, actionLabel: '', audience: 'all', channels: ['email'], status: 'sent', at: T('2026-12-03T17:30'), opens: 0.64 },
      { id: 'a3', title: 'Weekly team progress digest', body: 'Who has built, who is stuck, and what to review before Thursday.', severity: 'info', action: null, actionLabel: '', audience: 'owners', channels: ['email'], status: 'scheduled', at: T('2026-12-11T08:00'), opens: null },
    ],
    dismissed: {},
    reminders: [
      { id: 'rm1', label: '24 hours before each live session', channel: 'Email', on: true },
      { id: 'rm2', label: '1 hour before each live session', channel: 'Email + SMS', on: true },
      { id: 'rm3', label: 'Replay is ready', channel: 'Email', on: true },
      { id: 'rm4', label: 'Build not finished 48 hours after its session', channel: 'Email', on: true },
      { id: 'rm5', label: 'Weekly progress digest for team owners', channel: 'Email', on: false },
    ],
    tiers: [
      { id: 'agent', name: 'Agent', price: 995, seats: 1, blurb: 'For individual agents building their own AI Employees.', features: ['Marketing, Sales and Database AI Employees', 'Live sessions and replays', 'System prompts, skill files and checklists', 'Resource & Compliance Vault'] },
      { id: 'team', name: 'Team', price: 4995, seats: 7, blurb: 'For teams that want every seat building, plus the leadership AI Employees.', features: ['All 6 AI Employees', '7 seats: owner, ops lead and up to 5 agents', 'Team Hub with progress tracking', 'Executive Build Vault'] },
    ],
    requests: [
      { id: 'ur1', userId: 'u_kenji', name: 'Kenji Watanabe', email: 'kenji@watanaberealty.com', source: 'Team tier page', at: T('2026-12-06T16:12'), status: 'new' },
      { id: 'ur2', userId: 'u_rosa', name: 'Rosa Delgado', email: 'rosa@delgadorealty.com', source: 'Executive Build Vault', at: T('2026-12-05T09:30'), status: 'contacted' },
      { id: 'ur3', userId: null, name: 'Amara Okafor', email: 'amara@okaforhomegroup.com', source: 'Sales call', at: T('2026-12-02T11:00'), status: 'converted' },
    ],
    staff: [
      { id: 'st1', name: 'Casey Lin', email: 'casey@amplifiedimpact.com', role: 'Owner', last: T('2026-12-07T10:40') },
      { id: 'st2', name: 'Jordan Hale', email: 'jordan@amplifiedimpact.com', role: 'Instructor', last: T('2026-12-07T09:15') },
      { id: 'st3', name: 'Maya Chen', email: 'maya@amplifiedimpact.com', role: 'Content Editor', last: T('2026-12-06T17:20') },
      { id: 'st4', name: 'Luis Romero', email: 'luis@amplifiedimpact.com', role: 'Support', last: T('2026-12-07T08:05') },
    ],
    perms: {
      Owner: { curriculum: 1, publish: 1, cohorts: 1, viewLearners: 1, seats: 1, announce: 1, billing: 1, staff: 1 },
      Admin: { curriculum: 1, publish: 1, cohorts: 1, viewLearners: 1, seats: 1, announce: 1, billing: 1, staff: 0 },
      Instructor: { curriculum: 1, publish: 0, cohorts: 1, viewLearners: 1, seats: 0, announce: 1, billing: 0, staff: 0 },
      'Content Editor': { curriculum: 1, publish: 0, cohorts: 0, viewLearners: 1, seats: 0, announce: 0, billing: 0, staff: 0 },
      Support: { curriculum: 0, publish: 0, cohorts: 0, viewLearners: 1, seats: 1, announce: 0, billing: 0, staff: 0 },
    },
    base: {
      learners: 134, agent: 99, teamSeats: 35, teams: 4,
      mod: { marketing: [88, 27, 19], sales: [54, 38, 42], database: [21, 30, 83], meetings: [6, 9, 20], finance: [2, 5, 28], operations: [0, 0, 35] },
      daily: [0, 41, 78, 102, 131, 158, 171],
    },
    activity: [
      { id: 'e1', t: T('2026-12-07T10:04'), who: 'Sarah Collins', what: 'deployed Database AI Employee', tone: 'success' },
      { id: 'e2', t: T('2026-12-07T08:40'), who: 'Rosa Delgado', what: 'deployed Database AI Employee', tone: 'success' },
      { id: 'e3', t: T('2026-12-07T07:55'), who: 'Natasha Reed', what: 'deployed Meetings AI Employee', tone: 'success' },
      { id: 'e4', t: T('2026-12-06T19:45'), who: 'Devon Price', what: 'deployed Sales AI Employee', tone: 'success' },
      { id: 'e5', t: T('2026-12-06T16:12'), who: 'Kenji Watanabe', what: 'requested a Team tier upgrade', tone: 'warn' },
      { id: 'e6', t: T('2026-12-06T15:00'), who: 'Casey Lin', what: 'moved Session 3 to Wed Dec 9', tone: 'info' },
    ],
  };
}

export function seed(phase: Phase = 'live'): Db {
  const db = baseSeed();
  if (phase === 'week0') {
    db.users.forEach(u => { u.progress = {}; u.last = u.joined; });
    db.sessions.forEach(s => { s.attended = null; s.replay = null; s.views = 0; });
    const s3 = db.sessions.find(s => s.id === 'dec26-s3')!; s3.start = s3.movedFrom!; delete s3.movedFrom;
    db.cohorts[0]!.status = 'enrolling';
    db.announcements = []; db.requests = db.requests.filter(q => q.status === 'converted');
    db.base.mod = Object.fromEntries(Object.entries(db.base.mod).map(([k, v]) => [k, [0, 0, v[0] + v[1] + v[2]]])) as Record<string, [number, number, number]>;
    db.base.daily = [0];
    db.activity = db.users.slice(0, 6).map((u, i): ActivityEvent => ({ id: 'w' + i, t: u.joined, who: u.name, what: 'joined the December 2026 Cohort', tone: 'info' })).sort((a, b) => b.t - a.t);
  }
  if (phase === 'post') {
    const att = [121, 109, 116, 98, 92, 104], views = [402, 311, 287, 164, 151, 173];
    db.sessions.filter(s => s.cohortId === 'dec26').forEach((s, i) => Object.assign(s, { attended: att[i], replay: 'ready', views: views[i] }));
    const durs: Record<string, number> = { database: 3420, meetings: 3180, finance: 3600, operations: 3300 };
    db.modules.forEach(m => { if (!m.dur) m.dur = durs[m.id] || 3300; if (m.status === 'scheduled') { m.status = 'published'; m.opens = null; } m.resources = m.resources.map(r => /posted after/i.test(r.size) ? { ...r, size: '3.6 MB' } : r); });
    const day = (m: AIEmployee, i: number): number => T(`2026-12-${String(2 + i * 3).padStart(2, '0')}T16:00`);
    db.users.forEach(u => {
      if (u.id === 'u_omar') { u.progress = { marketing: wip(2) }; return; }
      if (u.id === 'u_lena') { u.progress = { marketing: wip(5) }; return; }
      db.modules.forEach((m, i) => {
        if (!canAccess(u, m)) return;
        const p = u.progress[m.id];
        if (!p || !p.deployedAt) { const t = new Date(day(m, i)).toISOString().slice(0, 16); u.progress[m.id] = built(t, t); }
        else if (p.runtime === 'paused' || p.runtime === 'needs_attention') { p.runtime = 'deployed'; delete p.issue; }
      });
      u.last = T('2027-01-11T15:00');
    });
    db.cohorts[0]!.status = 'completed'; db.cohorts[1]!.enrolled = 112;
    db.announcements = db.announcements.filter(a => a.id !== 'a1').map((a): Announcement => a.status === 'scheduled' ? { ...a, status: 'sent', opens: 0.58 } : a);
    db.base.mod = { marketing: [118, 8, 8], sales: [101, 17, 16], database: [92, 22, 20], meetings: [28, 4, 3], finance: [25, 6, 4], operations: [22, 8, 5] };
    db.base.daily = Array.from({ length: 43 }, (_, i) => Math.round(386 * (1 - Math.exp(-i / 9))));
    db.activity = [
      { id: 'p1', t: T('2027-01-12T09:40'), who: 'Jamie Ortiz', what: 'ran Marketing AI Employee on a listing', tone: 'info' },
      { id: 'p2', t: T('2027-01-11T15:00'), who: 'Natasha Reed', what: 'resumed Meetings AI Employee', tone: 'success' },
      { id: 'p3', t: T('2027-01-08T17:00'), who: 'Casey Lin', what: 'closed the December 2026 Cohort', tone: 'info' },
      { id: 'p4', t: T('2027-01-06T11:00'), who: 'Alex Morgan', what: 'deployed Operations AI Employee', tone: 'success' },
    ];
  }
  db.phase = phase;
  return db;
}

export const seedForDatabase = (phase: Phase = 'live'): Db => ({ ...seed(phase), base: ZERO_BASE });
