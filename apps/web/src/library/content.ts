// Every word on /library, the library: one page that lists every guide, skill and setup on the
// site, so people can find them without a link from a talk or a DM. DECISIONS.md D-050.
//
// THIS IS THE ONE FILE TO EDIT WHEN THE LIBRARY CHANGES. To list something new, add one record to
// `ENTRIES`. The filter pills are worked out from the records, so a new tool or topic gets its pill by
// being used, and a pill nothing uses never shows. `render.test.ts` fails when a guide in the API's
// `GUIDE_SLUGS` has no record here, so a new guide cannot ship missing from the library.
//
// House rules, as on /ai101: no em dashes, short plain sentences.

import type { GrokCollection } from '@ai/core/grok-templates';

/**
 * The AI apps a resource works in. The label is what the pill and the card say. Grok Bot runs the
 * Grok Bot templates (D-100), which are not Claude Skills.
 */
export const TOOLS = { claude: 'Claude', chatgpt: 'ChatGPT', grok: 'Grok Bot' } as const;
export type Tool = keyof typeof TOOLS;

/**
 * What a resource is about, or what kind of thing it is. In this order on the page. A topic shows only
 * when a card uses it, and a new one is added only when several cards would (D-052): the buyer side,
 * the listing side and contracts each have six or more skills.
 */
export const TOPICS = {
  skills: 'Claude Skills',
  setup: 'Setup',
  prompts: 'Copy and Paste Prompts',
  content: 'Content',
  'team-ops': 'Team Ops',
  buyers: 'Buyer Side',
  listings: 'Listing Side',
  contracts: 'Contracts and Offers',
  // The Grok Bot shelf's two collections (D-100), eight templates each.
  bookkeeping: 'Bookkeeping',
  transactions: 'Transactions',
} as const;
export type Topic = keyof typeof TOPICS;

/**
 * The free five, in Spring's order (the overnight brief: "Free five: AI Brain Setup; Sounds Like You: AI
 * Voice Profile; AI Brain Tune-Up; Perfect Week; Inbox and Meeting Follow-Through"), by page. Four are
 * `FREE_SKILLS`; the voice profile is a guide. A test holds the two lists together.
 */
export const FREE_FIVE: readonly string[] = ['ai-brain-setup', 'voice-profile', 'ai-brain-tuneup', 'perfect-week', 'inbox-meeting-follow-through'];

/** Spring's Track filter: Real Estate or General, so a Mortgage or Coaching track can come later. */
export const TRACKS = { 'real-estate': 'Real Estate', general: 'General' } as const;
export type Track = keyof typeof TRACKS;

/**
 * The General track, by page: the free five ("for anyone, agent, team owner or not in real estate at
 * all") and the general skills Spring names ("voice profile, meeting follow-through, P&L review, L10
 * prep"). Everything else is Real Estate. [OPEN: Spring and Connor may move more here.]
 */
export const GENERAL_TRACK: readonly string[] = [...FREE_FIVE, 'team-pnl-review', 'l10-meeting-prep'];

/** Spring's Who filter: Agents or Team Owners. */
export const WHO = { agents: 'Agents', owners: 'Team Owners' } as const;
export type Who = keyof typeof WHO;

/**
 * Who a guide that is not in a catalog is for (D-115): Spring's Free Resources table tags each one
 * agent or team owner. A skill's or template's comes from its set in its catalog.
 */
export const GUIDE_WHO: Readonly<Record<string, readonly Who[]>> = {
  'voice-profile': ['agents', 'owners'],
  ai101: ['agents'],
  'ops-time-audit': ['owners'],
  'task-sync-starter': ['owners'],
  retool: ['owners'],
};

/**
 * "Who it's for" on a lead: one role. Never contradicts the catalog's set (a test holds them together):
 * an agent-only skill is never for a Team owner, and an owner and ops skill is never for an Agent.
 */
export const FOR_ROLES = ['Agent', 'Team owner', 'Ops/admin', 'Broker', 'Anyone'] as const;
export type ForRole = (typeof FOR_ROLES)[number];

/**
 * THE LEAD: what every card, skill page and the platform's Skill Library say first, above any setup
 * (Spring, via Connor, 2026-11-12: "every skill lead with the problem it solves, in simple language
 * that a 4th grader could understand"). Spring's plan says the same: "tell people what the skill does
 * for them before it tells them how to use it" (docs/SPRING-PLAN.md).
 *
 * TO EDIT ONE: change its `problem`, `outcome` or `forRole` in `ENTRIES` below. Nothing else changes.
 * The rules, which `render.test.ts` checks:
 *   - 4th grade reading level: short words, short sentences. Contractions are good.
 *   - No jargon: never MCP, API, prompt, connector or token. No hype, and no made-up numbers or results.
 *   - It drafts. You check. Never say it sends, posts or decides.
 *   - No em dashes or en dashes.
 */
export const LEAD = {
  problem: 'The problem',
  outcome: 'What it does for you',
  forRole: 'Who it’s for',
  /** Over the step-by-step setup, below the lead, on the skill page and in the platform. */
  setup: 'Set it up',
} as const;

/** One entry's lead: the three fields `LEAD` labels. */
export type Lead = Pick<Entry, 'problem' | 'outcome' | 'forRole'>;

export interface Entry {
  title: string;
  /** The pain this fixes, in the buyer's words: one or two short sentences (`LEAD`). */
  problem: string;
  /** What they get, not how it works: one plain sentence (`LEAD`). */
  outcome: string;
  /** Who it's for: one role (`LEAD`). */
  forRole?: ForRole;
  /** One or two plain sentences on what the reader gets. */
  description: string;
  /** The small label on the card: what kind of thing this is. */
  kind: string;
  /** The page, on this site. `null` is not live yet: the card shows "Coming soon" and links nowhere. */
  href: string | null;
  tools: readonly Tool[];
  topics: readonly Topic[];
  /** When it went up, `YYYY-MM-DD`: what the sort goes by. A card with no page yet sorts last either way. */
  added: string;
  /** Other words someone would search for it by, beyond what the card says. Never shown. */
  keywords: string;
  /**
   * A Grok Bot template's collection (D-100): the card goes on the Grok Bot shelf, under it, rather
   * than in the main list.
   */
  collection?: GrokCollection;
  /** One more tag on the card, for who it is for above all: "For Brokers". */
  audience?: string;
}

export const ENTRIES: readonly Entry[] = [
  {
    // The AI Accelerator's week 7 flagship (D-109). Paid: in the Library, not one of the free skills.
    title: 'New Agent Onboarding Plan',
    problem: 'Every new agent gets a different start, based on who has time that week. Steps get missed, and nobody is sure who owns what.',
    outcome: 'It writes down how you train new agents once, then gives each new hire a first month with dates and a name on every step.',
    forRole: 'Team owner',
    description: 'Write down how your team brings a new agent up to standard, once: your standards, who does what, your checkpoints and your first 30 days, with three tests and a runbook. Then get each new hire’s first 30 days dated and owned, with every gap and conflict shown to you, not filled in. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/new-agent-onboarding-plan',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-11',
    keywords: 'onboarding new agent onboarding new hire new agent first 30 days 30 day plan 30-60-90 ramp ramp-up new agent checklist onboarding checklist agent handbook standards checkpoints mentor shadowing role-play lead rotation license transfer fair housing course role change runbook three tests safe failure accelerator week 7 team leader ops operator',
  },
  {
    // The AI Accelerator's week 2 flagship (D-108): a Grok Bot template first, with the same brief for
    // Claude and a ChatGPT Project. One skill with three ways in, so it is in the main list, not on the
    // Grok Bot shelf, whose templates have no Claude or ChatGPT version.
    title: 'Morning Brief',
    problem: 'You start the day in your inbox and react to whoever is loudest. By lunch, the big things still haven’t moved.',
    outcome: 'It hands you one page each morning with your top three, the choices waiting on you and who owns each next step.',
    forRole: 'Team owner',
    description: 'One page every weekday morning: your top three, the decisions waiting on you, and who owns each next step, from this week’s numbers and your task list. Anything with no owner or no date gets flagged, never filled in. A Grok Bot template that runs on its own, or the same brief in Claude or a ChatGPT Project.',
    kind: 'Grok Bot Template',
    href: '/morning-brief',
    tools: ['grok', 'claude', 'chatgpt'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-11',
    keywords: 'morning brief daily brief daily priorities top three what needs my attention owner priorities decisions exceptions next actions who owns what accountability loose ends unowned commitments someone should follow up task register task list clickup asana google sheets meeting transcript granola lead-source roi fub pipeline review follow up boss scorecard team owner operator ai accelerator week 2 grok bot routine',
  },
  {
    title: 'AI Brain Setup',
    problem: 'Every time you open AI, you start from zero. You explain your business again, and the answers still sound like they’re for someone else.',
    outcome: 'It asks you a few questions, then sets up your AI so it already knows you, your work and how you like things done.',
    forRole: 'Anyone',
    description: 'Answer a few questions about your business and get your Claude setup back, ready to paste: your instructions, an About My Business file, the facts to remember, and exactly where each one goes. Nothing about your clients and no passwords. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/ai-brain-setup',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'setup'],
    added: '2026-11-10',
    keywords: 'ai brain claude setup set up claude claude project project instructions project knowledge project files memory claude memory custom instructions instructions for claude personal preferences context onboarding getting started first skill foundation about my business how i like to work voice profile quick card compliance block fair housing tcpa follow up boss fub utah team leader chatgpt project',
  },
  {
    title: 'AI Brain Tune-Up',
    problem: 'Your AI used to work well. Now it mixes up old facts and skips what you told it, and you can’t tell why.',
    outcome: 'It finds the old, mixed-up and fuzzy lines in your AI’s setup and hands you clean ones to paste back in.',
    forRole: 'Anyone',
    description: 'Paste in your AI’s project instructions, files and memory and see every stale, conflicting, vague or missing line, quoted, with clean instructions to paste back in and a memory list to keep, change or remove. It changes nothing itself. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/ai-brain-tuneup',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'setup'],
    added: '2026-11-10',
    keywords: 'ai brain tune up tune-up audit claude project project instructions project knowledge knowledge files memory claude memory chatgpt memory custom instructions instructions for claude custom style styles stale instructions conflicting instructions ai keeps getting it wrong drift clean up voice profile quick card compliance lines fair housing texting consent drafts only workspace context calibrate',
  },
  {
    title: 'Team AI Brain',
    problem: 'Every agent on your team uses AI their own way. The answers don’t match your scripts, your brand or your rules.',
    outcome: 'It builds one shared AI setup from your team’s own documents, so every agent starts with the same scripts, brand and rules.',
    forRole: 'Team owner',
    description: 'Turn your team’s SOPs, scripts, brand guide, compliance notes, roles list and Follow Up Boss lead flow into one shared AI workspace: project instructions with your compliance and brand lines locked in, knowledge files that each name their source, a personal layer each agent fills in, and a rollout for your plan. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/team-ai-brain',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops', 'setup'],
    added: '2026-11-10',
    keywords: 'team ai brain shared project team project claude team plan claude projects project instructions project knowledge knowledge files shared context ai workspace team standards brand guide compliance lines fair housing texting consent tcpa sops call scripts roles list follow up boss lead flow personal layer voice profile quick card rollout chatgpt business shared chatgpt project team leader ops',
  },
  {
    title: 'Post-Closing Client Care',
    problem: 'After closing day, it’s easy to go quiet. Then a year goes by, and your client hasn’t heard from you.',
    outcome: 'It plans your client’s first year after closing and drafts the card, the thank-you and the review ask for you to send.',
    forRole: 'Agent',
    description: 'Attach your TC’s closing email and your notes and get your client’s first year after closing: a dated plan, the card and thank-you, a review request you send every client the same way, introductions to your own vendors and a property tax reminder that points to the county. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/post-closing-client-care',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'buyers', 'listings'],
    added: '2026-11-10',
    keywords: 'post-closing after closing closing follow-up past client care client care first year closing gift thank-you card thank-you email review request ask for a review google review zillow review five-star review review gating ftc review rule vendor list preferred vendors referral fee respa affiliated business disclosure homestead exemption primary residential exemption property tax county assessor follow up boss fub action plan automations 2.0 home anniversary tc closing email sisu text consent',
  },
  {
    title: 'TC File Audit',
    problem: 'A file goes to your broker with a page missing or a form not signed. Now it’s a scramble, and a deadline is close.',
    outcome: 'It finds what’s missing or unsigned in a file before your broker does, and drafts the notes to fix it.',
    forRole: 'Ops/admin',
    description: 'Attach one transaction file’s document list, the contract’s key dates, your brokerage’s checklist and your notes, and see what’s missing, what’s unsigned and what’s due this week, with days remaining counted and the asks to the agent and broker drafted. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/tc-file-audit',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops', 'contracts'],
    added: '2026-11-10',
    keywords: 'transaction coordinator tc file audit transaction file checklist compliance review broker review missing documents unsigned addendum signatures initials skyslope dotloop brokermint lone wolf contract to close deadlines key dates repc utah due diligence deadline settlement deadline seller disclosure deadline earnest money receipt wire fraud ops lead team owner',
  },
  {
    title: 'Agent 1:1 Prep',
    problem: 'You walk into a coaching meeting with an agent and wing it. You can’t remember what they promised last time.',
    outcome: 'It shows where the agent stands on their own goal, what they promised last time and what to ask.',
    forRole: 'Team owner',
    description: 'Attach one agent’s monthly numbers, their goals and your notes from last time, and walk into your coaching one-on-one with the pace math written out against their own goal, last time’s commitments carried forward and the questions to ask. Facts, not judgments. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/agent-1on1-prep',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-10',
    keywords: 'one-on-one one on one 1:1 1 on 1 coaching agent coaching coaching session accountability accountability meeting check-in team leader coach sisu agent accountability report pacer pace pacing goals business plan prorated goal year to date appointments set appointments met signed under contract closings gci commitments agenda recap follow up boss',
  },
  {
    title: 'Expired and FSBO Outreach',
    problem: 'You have a list of expired listings and homes for sale by owner. Writing a real note to each owner takes forever, so the list just sits.',
    outcome: 'It drafts a personal first letter for each owner you’re allowed to contact, using facts from their own listing.',
    forRole: 'Agent',
    description: 'Upload your expired list or FSBO list and get a personal first letter for every owner you may contact, built from that listing’s own facts, plus call openers only for scrubbed numbers, door-knock notes and a two-week plan. Listings that may still be under a listing agreement are held out. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/expired-fsbo-outreach',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'listings'],
    added: '2026-11-10',
    keywords: 'expired listings expireds expired listing letter fsbo for sale by owner fsbo letters prospecting letters listing leads redx vulcan7 landvoice vortex mls export door knocking cold calling call script do not call dnc scrub tcpa touch plan withdrawn canceled article 16 seller leads',
  },
  {
    title: 'Listing Appointment Prep',
    problem: 'Your listing appointment is coming up, and your notes are all over the place. You don’t want to walk in unready.',
    outcome: 'It turns your notes into a one-page plan, the questions to ask, a marketing plan and a net sheet for the seller.',
    forRole: 'Agent',
    description: 'Attach your first-call notes, the seller’s questionnaire and your listing presentation before a listing appointment, and get a one-page plan, the questions to ask, a marketing plan from your own menu, a seller net sheet at your own prices and answers to “what’s your commission.” Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/listing-appointment-prep',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'listings'],
    added: '2026-11-10',
    keywords: 'listing appointment listing presentation pre-listing seller appointment seller net sheet net sheet estimated proceeds title fee sheet commission what is your commission buyer agent compensation nar settlement listing agreement marketing plan marketing menu seller questionnaire follow up boss note fsbo wait for spring objections why you county record mls history square footage fair housing',
  },
  {
    title: 'Seller Listing Update',
    problem: 'Your sellers want to hear how it’s going every week. Pulling the showing feedback and numbers together takes longer than it should.',
    outcome: 'It drafts this week’s update for your sellers in your voice and catches any comment a seller shouldn’t see.',
    forRole: 'Agent',
    description: 'Upload this week’s showing feedback, your listing numbers and your notes, and get the weekly update for your sellers in your voice, with every number checked against last week and any comment that shouldn’t reach a seller caught first. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/seller-listing-update',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'listings'],
    added: '2026-11-10',
    keywords: 'seller update weekly seller update weekly listing update tuesday update listing report seller report showing feedback recap showingtime brokerbay listing activity report zillow views saves realtor.com days on market price feedback price question listing agent fair housing',
  },
  {
    title: 'FUB Automation Audit',
    problem: 'Your Follow Up Boss plans have piled up over the years. Some leads get two texts, some get none, and you’re not sure who said yes to texts.',
    outcome: 'It reads your plans and shows the gaps, the double-ups and the texting risks, with each fix written as steps.',
    forRole: 'Ops/admin',
    description: 'Copy your Follow Up Boss action plans, automations and lead sources into one chat and see where nothing happens, where two plans double up, and which automated texts could reach someone who never agreed to texts, with each fix written as steps you take. It only reads. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/fub-automation-audit',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-10',
    keywords: 'follow up boss fub action plans automations automations 2.0 lead flow initial text instant response drip campaign drip texts auto text texting consent tcpa opt-out reply stop stop on reply pause on reply crm audit overlapping drips stages lead sources nurture team owner ops admin',
  },
  {
    title: 'Speed to Lead Reply',
    problem: 'A new lead comes in while you’re busy. By the time you write back, they’ve already talked to someone else.',
    outcome: 'It drafts a personal first reply right away, so you can be the first to answer.',
    forRole: 'Agent',
    description: 'Paste in a new online lead and get a personal first reply you can send in two minutes: a text only if they agreed to texts, an email that answers what they asked from the listing, a call opener and voicemail, and two follow-ups. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/speed-to-lead-reply',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'buyers'],
    added: '2026-11-10',
    keywords: 'speed to lead new lead lead reply first reply first response online lead internet lead zillow lead realtor.com lead website lead idx registration facebook lead form follow up boss fub action plan instant response text consent tcpa reply stop do not call call script voicemail buyer agreement fair housing schools is it available',
  },
  {
    title: 'FUB Pipeline Review',
    problem: 'Your pipeline meeting turns into scrolling through Follow Up Boss together. Deals sit in the same stage for weeks, and nobody asks why.',
    outcome: 'It counts every stage, flags what needs a choice this week and gives you a question for each agent.',
    forRole: 'Team owner',
    description: 'Attach this week’s Follow Up Boss export (plus last week’s and your Deals report, if you have them) and walk into your pipeline meeting with every stage counted and aged, a dated list of what needs a decision this week, conversion with its math and a question for each agent. It only reads. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/fub-pipeline-review',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-10',
    keywords: 'follow up boss fub pipeline review pipeline meeting weekly pipeline sales meeting lead follow-up stale leads aging last communication deals past close date expected close date appointment set met with customer stage movement what moved conversion by lead source conversion by agent smart list people export deals report sisu team leader ops',
  },
  {
    title: 'Sphere Touch Plan',
    problem: 'You know you should stay in touch with past clients and friends. But the weeks fly by, and you don’t reach out.',
    outcome: 'It plans a year of check-ins and drafts this week’s texts, emails and call notes, each tied to something real.',
    forRole: 'Agent',
    description: 'Upload your sphere or past client list and get a year of touches by tier, plus this week’s texts, emails and call notes, each tied to something real in your list. Texts only for people who said yes to texts. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/sphere-touch-plan',
    tools: ['claude', 'chatgpt'],
    topics: ['skills'],
    added: '2026-11-10',
    keywords: 'sphere of influence sphere soi past clients past client follow up stay in touch touch plan 12 month touch plan 33 touch database nurture home anniversary closing anniversary client care follow up boss fub smart list action plan text consent tcpa do not call personal notes check-in referrals',
  },
  {
    title: 'Open House Follow-Up',
    problem: 'You meet a lot of people at an open house. Days later, the sign-in sheet is still in your car and nobody has heard from you.',
    outcome: 'It drafts a follow-up for every visitor and a recap for your sellers, for you to read and send.',
    forRole: 'Agent',
    description: 'Upload your open house sign-in sheet and your notes and get a follow-up for every visitor and a recap for your sellers, as drafts you read and send. Visitors with an agent get a thank-you only, and texts go only to visitors who said yes. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/open-house-follow-up',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'listings', 'buyers'],
    added: '2026-11-10',
    keywords: 'open house follow-up sign-in sheet sign in sheet sign-in export curb hero google form visitor follow-up thank-you email seller update listing agent update open house feedback represented buyer text consent tcpa reply stop fair housing same-day',
  },
  {
    title: 'L10 Meeting Prep',
    problem: 'Getting ready for your weekly L10 takes too long, and you still walk in without the numbers.',
    outcome: 'It reads your scorecard, flags what’s off and writes the agenda before you sit down.',
    forRole: 'Team owner',
    description: 'Attach your scorecard, rocks, to-dos and issues list from Ninety, Bloom Growth or a spreadsheet, and walk into your weekly L10 with the agenda timed, every number checked against its own goal, empty cells flagged for their owners and a suggested IDS order. It only reads. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/l10-meeting-prep',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-10',
    keywords: 'l10 level 10 meeting eos traction integrator visionary scorecard measurables rocks to-dos issues list ids headlines ninety bloom growth traction tools weekly leadership meeting meeting prep team leader ops',
  },
  {
    title: 'Market Update Email',
    problem: 'A market email each month keeps you in front of people. But turning the stats into a good read takes too long.',
    outcome: 'It turns your local market numbers into an email and a social post, and shows where each number came from.',
    forRole: 'Agent',
    description: 'Upload your MLS’s monthly market report or stats export, or paste the numbers, and get a market update email for your database, a matching social post and a table showing where every number came from, as drafts you read and send. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/market-update-email',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'content'],
    added: '2026-11-10',
    keywords: 'market update monthly market update market report market stats mls statistics newsletter monthly newsletter database email local market update monthly indicators rapidstats infosparks showingtime rpr median sale price days on market months of supply inventory list-to-sale ratio sale-to-list closed sales new listings social post instagram caption facebook post source line mls disclaimer can-spam fair housing',
  },
  {
    title: 'Listing Description Writer',
    problem: 'Writing the listing description takes longer than it should. And one wrong word can turn into a fair housing problem.',
    outcome: 'It writes the listing remarks, two headlines and a social post from your notes, and checks every line for fair housing.',
    forRole: 'Agent',
    description: 'Attach your listing worksheet and the seller’s notes, and get MLS public remarks, two headlines and a social caption written only from your documents, with a fair housing review of every line. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/listing-description-writer',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'listings', 'content'],
    added: '2026-11-10',
    keywords: 'listing description mls remarks public remarks property description listing copy headline instagram caption facebook caption just listed coming soon seller questionnaire seller notes listing worksheet mls input character limit fair housing walking distance family friendly primary bedroom utahrealestate clear cooperation agent remarks private remarks',
  },
  {
    title: 'New Construction Review',
    problem: 'Builder contracts are long and written for the builder. Your buyer is about to sign, and you’re not sure what they’re giving up.',
    outcome: 'It shows the money at risk, what’s different from the standard contract and what to ask the builder before your buyer signs.',
    forRole: 'Agent',
    description: 'Upload the builder’s purchase agreement and its addenda before your buyer signs, and see the money at risk, what differs from the REPC, what the incentive really requires, and questions for the builder and an attorney. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/new-construction-review',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'buyers', 'contracts'],
    added: '2026-11-08',
    keywords: 'new construction builder contract new build to-be-built spec home lot reservation builder incentive preferred lender respa earnest money nonrefundable deposit change orders arbitration public infrastructure district plat hoa repc buyer email',
  },
  {
    title: 'Team P&L Review',
    problem: 'You get your profit and loss report every month, but you’re not sure what it’s telling you. You just hope the bottom line looks OK.',
    outcome: 'It shows what you kept, where the money went and what looks wrong, in plain words, with questions for your bookkeeper.',
    forRole: 'Team owner',
    description: 'Upload your team’s P&L from QuickBooks or Xero and see what you kept, where the money went, what changed and what looks wrong, with every calculation shown and questions for your bookkeeper, CPA and broker. It only reads. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/team-pnl-review',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-08',
    keywords: 'p&l profit and loss quickbooks xero bookkeeper company dollar gci agent splits margin expense review cost per closing lead source roi duplicate charges owner brief team finances team leader owner',
  },
  {
    title: 'Low Appraisal Response',
    problem: 'The appraisal came in low, and now the deal could fall apart. Everyone is upset, and the clock is running.',
    outcome: 'It finds what the report may have gotten wrong, lays out each side’s options and drafts your next message.',
    forRole: 'Agent',
    description: 'Upload the appraisal that came in under the contract price, the contract and your comps, and get the gap, what the report got wrong, whether a reconsideration is worth asking for, each side’s options, the deadline and the drafts. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/low-appraisal-response',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'buyers', 'listings', 'contracts'],
    added: '2026-11-08',
    keywords: "low appraisal appraisal came in low appraisal gap reconsideration of value rov notice of appraised value tidewater fha appraisal va appraisal conventional appraisal comparable sales basement square footage appraisal deadline utah repc appraisal condition buyer's agent listing agent",
  },
  {
    title: 'Showing Tour Prep',
    problem: 'Before a showing tour, you dig through listing sheets and copy notes by hand. One slip, and a lockbox code ends up in front of your buyer.',
    outcome: 'It makes a clean one-page tour sheet for your buyers, plus a private page of questions just for you.',
    forRole: 'Agent',
    description: 'Upload the MLS sheets for a showing tour and get a one-page tour sheet for your buyers, with private remarks and lockbox codes kept off it, plus an agent-only page of questions for each listing agent. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/showing-tour-prep',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'buyers'],
    added: '2026-11-08',
    keywords: 'showing tour showing tour tour sheet buyer tour mls sheet agent full report private remarks showing instructions lockbox listing agent questions buyer criteria water shares rental cap hoa as-is estate sale buyer agent utah fair housing',
  },
  {
    title: 'Appointment Follow-Up',
    problem: 'You had a great meeting, but the recap and the notes take time you don’t have. So the follow-up goes out late, or not at all.',
    outcome: 'It turns what was said in the meeting into a recap email, a Follow Up Boss note and next steps with dates.',
    forRole: 'Agent',
    description: 'Attach the transcript from a buyer consult or listing appointment and get a recap email, a Follow Up Boss note ready to paste and dated next steps, as drafts you read and send. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/appointment-follow-up',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'buyers', 'listings'],
    added: '2026-11-08',
    keywords: 'appointment follow-up buyer consultation listing appointment recap email follow up boss note fub granola zoom transcript call recording next steps buyer agreement preapproval timeframe to move fair housing',
  },
  {
    title: 'Pricing Conversation Prep',
    problem: 'Talking price with a seller is hard. You have the numbers, but you’re not sure how to say it so they hear it.',
    outcome: 'It turns your CMA into a suggested price, a talk track and answers to the pushback you’re likely to hear.',
    forRole: 'Agent',
    description: 'Upload your CMA before a listing appointment or a price reduction talk, and get a recommended price with a range, a talk track, answers to likely objections and a one-page seller summary. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/pricing-conversation-prep',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'listings'],
    added: '2026-11-08',
    keywords: 'cma comps pricing list price listing appointment price reduction seller objections zillow talk track days on market square footage appraisal',
  },
  {
    title: 'Offer Comparison',
    problem: 'Your sellers got more than one offer, and each one is written a different way. It’s hard to compare them fairly.',
    outcome: 'It lines up every offer side by side, term by term, and drafts a clear email so your sellers can decide.',
    forRole: 'Agent',
    description: 'Upload every offer your sellers received, with each buyer’s lender letter, and get them side by side term by term, escalation math from each clause, gaps for your broker, questions for the buyers’ agents and an email for your sellers. Your sellers decide. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/offer-comparison',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'listings', 'contracts'],
    added: '2026-11-08',
    keywords: 'multiple offers compare offers offer comparison highest and best which offer should my seller take escalation clause escalation addendum appraisal gap cash offer fha offer seller concessions sale of home contingency earnest money proof of funds preapproval letter net sheet seller net backup offer counteroffer repc new repc 2026 listing agent seller email love letter',
  },
  {
    title: 'Offer Strategy',
    problem: 'Your buyer loves the house and asks what to offer. You want more to go on than a gut feeling.',
    outcome: 'It suggests an offer term by term, shows the risk of each term in dollars and drafts a note to your buyer.',
    forRole: 'Agent',
    description: 'Upload the listing’s MLS sheet, your comps and your buyer’s preapproval letter, and get a recommended offer, term by term, with the risk behind each term in dollars and an email for your buyer. Your buyer decides. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/offer-strategy',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'buyers', 'contracts'],
    added: '2026-11-08',
    keywords: 'offer write an offer buyer offer offer price how much over list under list multiple offers highest and best escalation clause appraisal gap waive appraisal earnest money due diligence period seller concessions closing costs fha offer sale of home contingency repc new repc 2026 preapproval letter comps risk ledger buyer email',
  },
  {
    title: 'Counter Explainer',
    problem: 'A counteroffer comes back with changes. It’s easy to miss one, and your client wants to know what it all means.',
    outcome: 'It shows exactly what changed, even the changes nobody pointed out, and drafts a plain note for your client.',
    forRole: 'Agent',
    description: 'Upload the contract and a new counter or addendum, and see exactly what changed, including any change nobody mentioned, the response deadline and a draft for your client. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/counter-explainer',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'buyers', 'listings', 'contracts'],
    added: '2026-11-08',
    keywords: "counteroffer counter addendum repc utah repc contract changes what changed negotiation settlement date due diligence deadline seller concessions closing costs extension explain to client buyer's agent listing agent transaction",
  },
  {
    title: 'Repair Request Response',
    problem: 'The buyer sent a long repair list, and your seller is upset. You need to know what’s fair to agree to.',
    outcome: 'It sorts what to agree to and what to push back on, adds up the cost from your bids and drafts your reply.',
    forRole: 'Agent',
    description: 'Upload the buyer’s repair request, the inspection report and your contractor bids, and get your seller’s answer: what to agree to, what to push back on, the cost from your bids, the real deadline and the drafts to send. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/repair-request-response',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'listings', 'contracts'],
    added: '2026-11-08',
    keywords: 'repair request inspection response buyer objection due diligence repair addendum seller response listing agent counter credit contractor bid seller disclosure repc utah negotiation',
  },
  {
    title: 'Due Diligence Review',
    problem: 'The inspection report is long, and your buyer is nervous. You need to know what really matters before time runs out.',
    outcome: 'It pulls out what matters, what to ask the seller for and how many days are left, and drafts an email to your buyer.',
    forRole: 'Agent',
    description: 'Upload the inspection report and the rest of your due diligence documents, and get back what matters, what to ask the seller for, the days left and an email for your buyer. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/due-diligence-review',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'buyers', 'contracts'],
    added: '2026-11-08',
    keywords: 'due diligence inspection report home inspection objection repair request buyers agent seller disclosure hoa documents ccrs cc&rs reserve study special assessment rental cap radon sewer scope title commitment utah repc due diligence deadline earnest money buyer email',
  },
  {
    title: 'Inbox and Meeting Follow-Through',
    problem: 'Your inbox is full, and your meetings ended with promises. Things slip, and you don’t find out until someone asks.',
    outcome: 'It hands you the choices only you can make, drafts your replies and lists the promises you haven’t kept yet.',
    forRole: 'Anyone',
    description: 'Claude goes through your inbox and yesterday’s meetings and hands back the decisions only you can make, drafted replies and hand-offs, and the promises you haven’t kept, with any wire-change email flagged first. Claude reads and drafts but never sends. Set it up on a computer, with a Claude plan that can add skills.',
    kind: 'Claude Skill',
    href: '/inbox-meeting-follow-through',
    tools: ['claude'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-08',
    keywords: 'inbox email triage gmail outlook microsoft 365 granola zoom teams otter fathom transcript meeting notes action items follow up follow-through commitments delegation hand-offs promises accountability wire fraud friday rollup morning daily pass team leaders owners ops',
  },
  {
    title: 'Perfect Week',
    problem: 'Your calendar is packed, your to-do list keeps growing, and the week never fits.',
    outcome: 'It plans a week that actually fits your hours, and nothing goes on your calendar until you say yes.',
    forRole: 'Anyone',
    description: 'Claude turns your calendar and task list into a week that fits inside your working hours, with a summary for your manager. Nothing goes on your calendar until you say yes, and Claude never invites anyone. Set it up on a computer, with a Claude plan that can add skills.',
    kind: 'Claude Skill',
    href: '/perfect-week',
    tools: ['claude'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-08',
    keywords: 'time blocking time block calendar schedule ideal week plan my week weekly planning too many meetings behind overwhelmed work-life balance prospecting recruiting time team leaders ops delegate hand off time management google calendar outlook ics clickup todoist asana tasks productivity',
  },
  {
    title: 'Content Strategist',
    problem: 'You know you should post more videos, but you never know what to talk about. So you post nothing.',
    outcome: 'Each week it finds what’s working in your niche and gives you up to five video ideas built on your own stories.',
    forRole: 'Agent',
    description: 'Every week, see which Instagram reels in your niche beat their creator’s usual numbers, and get up to five talking-head ideas built on your own stories. Set it up on a computer, with a Claude plan that can add skills and a free Apify account.',
    kind: 'Claude Skill',
    href: '/content-strategist',
    tools: ['claude'],
    topics: ['skills', 'content'],
    added: '2026-11-08',
    keywords: 'instagram reels content ideas what to post talking-head video ideas hooks outliers competitor research content strategy weekly brief creators hashtags apify social media marketing',
  },
  {
    title: 'Team Playbook Builder',
    problem: 'Your agents ask you the same questions over and over. The answers are in old files nobody reads.',
    outcome: 'It turns your team’s own files into a playbook your agents can ask, and it shows where each answer came from.',
    forRole: 'Team owner',
    description: 'Upload your team’s SOPs, policy manual and training call transcripts, and get back a playbook your agents add to their own Claude, with the source behind every answer, plus the gaps, the conflicts and 25 test questions. Set it up on a computer. You and each agent need a Claude plan that can add skills.',
    kind: 'Claude Skill',
    href: '/team-playbook-builder',
    tools: ['claude'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-08',
    keywords: 'team playbook, SOP, SOPs, SOP bot, onboarding, agent onboarding, new agent questions, team policies, policy manual, agent handbook, team knowledge base, onboarding assistant, training transcripts, pond rules, lead routing, transaction handoff, fee schedule, team leader, ops, Claude skill builder',
  },
  {
    title: 'Recruiting Prep',
    problem: 'Your recruit list is messy, with the same names twice and no clear order. You don’t know who to call first.',
    outcome: 'It cleans up your list, sorts it by who sells the most and drafts a first email for each group.',
    forRole: 'Team owner',
    description: 'Upload your recruit list and get it back with the duplicates merged and the list tiered by production, plus a first-touch email for each tier. Or prep one recruiting coffee from a candidate’s production. Set it up once on a computer, in Claude or a ChatGPT Project.',
    kind: 'Claude Skill',
    href: '/recruiting-prep',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-08',
    keywords: 'recruiting recruit list agent recruiting mls production report brokermetrics sisu recruiting gohighlevel follow up boss top producers team leader recruiter appointment setter recruiting coffee value proposition objections split cap first-touch email tiers duplicates',
  },
  {
    title: 'Database Health Check',
    problem: 'Your database is full of old, messy contacts. You know there are people worth calling in there, but you can’t see who.',
    outcome: 'It shows who’s worth calling or emailing this month, drafts the messages and makes a cleanup list for your assistant.',
    forRole: 'Team owner',
    description: 'Upload your CRM export and get a health report, a cleanup list for your VA, and the groups worth calling or emailing this month, with the messages drafted. Easiest on a computer. The skill never changes your CRM.',
    kind: 'Claude Skill',
    href: '/database-health-check',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-08',
    keywords: 'crm cleanup database health check audit follow up boss fub export dedupe duplicates merge smart lists ponds past clients sphere soi nurture stale leads never contacted re-engagement team leader owner ops va worklist kw command gohighlevel brivity',
  },
  {
    title: "Retool, Don't Replace",
    problem: 'Your ops person is buried in busywork. You don’t want to replace them, just free them up.',
    outcome: 'It helps you map their week, build your first AI employee and plan a month to hand off the busywork.',
    forRole: 'Team owner',
    description: "Map your ops leader's week, build your first AI employee, and plan a 30-day retool.",
    kind: 'Workshop Kit',
    href: '/retool',
    tools: ['claude', 'chatgpt'],
    topics: ['team-ops', 'prompts'],
    added: '2026-10-22',
    keywords:
      'task map time audit ops leader operations transaction coordinator tc contract-to-close team owners hire hiring 101 session talk',
  },
  {
    title: 'Reel Editor',
    problem: 'You filmed a video, but editing it into a Reel feels like a second job. So it sits on your phone.',
    outcome: 'It edits your talking video into a finished Reel with cuts, captions and music.',
    forRole: 'Agent',
    description:
      'Upload a talking-head video and Claude hands back a finished Reel: cuts, captions, graphics, sound effects and music. Needs a paid Claude plan to finish in one go.',
    kind: 'Claude Skill',
    href: '/reel-editor',
    tools: ['claude'],
    topics: ['skills', 'content'],
    added: '2026-10-20',
    keywords: 'reels tiktok shorts video editing editor instagram social media captions',
  },
  {
    title: 'Sounds Like You: Your AI Voice Profile',
    problem: 'Everything AI writes for you sounds like a robot, not like you. So you end up rewriting it.',
    outcome: 'It teaches your AI to write the way you really talk, one step at a time.',
    forRole: 'Anyone',
    description: 'Teach ChatGPT or Claude to write the way you actually write, one screen at a time.',
    kind: 'Setup Guide',
    href: '/voice-profile',
    tools: ['claude', 'chatgpt'],
    topics: ['setup', 'content', 'prompts'],
    added: '2026-10-17',
    keywords: 'writing tone brand emails captions posts sound like me 101',
  },
  {
    title: 'The Ops Time Audit',
    problem: 'Your week is full of small tasks that add up. You can feel the time slipping, but you can’t see where it goes.',
    outcome: 'It helps you see how many hours a week go to work AI could already be doing.',
    forRole: 'Team owner',
    description: "Find out how many hours a week you're burning on work AI should already be doing.",
    kind: 'Guide',
    href: '/ops-time-audit',
    tools: ['claude'],
    topics: ['team-ops', 'prompts'],
    added: '2026-10-14',
    keywords: 'time tracking hours automate automation operations crm calendar team owners',
  },
  {
    title: 'Task Sync Starter Kit',
    problem: 'Your team meetings end with lots of promises. A week later, nobody remembers who said they’d do what.',
    outcome: 'It turns every promise from your meetings into a task with an owner, a due date and a next step.',
    forRole: 'Team owner',
    description: 'Turn every promise from your team meetings into a task with an owner, a due date and the next step.',
    kind: 'Starter Kit',
    href: '/task-sync-starter',
    tools: ['claude'],
    topics: ['team-ops', 'setup', 'prompts'],
    added: '2026-10-13',
    keywords: 'meetings notes to-do todo tasks follow up accountability email scheduled operations team owners',
  },
  {
    title: 'AI 101 for Agents',
    problem: 'You keep hearing you should use AI, but you don’t know where to start. It all feels like a lot.',
    outcome: 'It helps you teach AI to write like you, then turn one idea into a branded Instagram carousel.',
    forRole: 'Agent',
    description:
      'Build your AI voice profile in ChatGPT or Claude, free. Then a Carousel Creator that turns one idea into a branded Instagram carousel: that part needs a laptop and Claude Pro or higher.',
    kind: 'Workshop Kit',
    href: '/ai101',
    tools: ['claude', 'chatgpt'],
    topics: ['setup', 'content', 'prompts'],
    added: '2026-10-07',
    keywords: 'carousels carousel creator instagram social media posts design brand agents beginner workshop expcon',
  },
  // The Grok Bot shelf (D-100): not Claude Skills. In `GROK_TEMPLATES` order, bookkeeping first.
  {
    title: 'Weekly Card & Bank Audit',
    problem: 'Charges pile up on your business cards with no category and no receipt. Then tax time turns into a guessing game.',
    outcome: 'Each week it checks your cards and bank against QuickBooks and lists any charge that needs a category or a receipt.',
    forRole: 'Ops/admin',
    description: 'Every Monday, it checks your business cards and operating account against QuickBooks Online and lists uncategorized charges, duplicates, personal spend and missing receipts, each with a proposed category. No expense reports needed. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/card-bank-feed-audit',
    tools: ['grok'],
    topics: ['bookkeeping', 'team-ops'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine card audit bank feed credit card quickbooks qbo uncategorized transactions duplicate charges personal spend receipts gmail chart of accounts weekly bookkeeping expense report',
    collection: 'bookkeeping',
  },
  {
    title: 'Commission Tie-Out',
    problem: 'A commission check lands, but you’re not sure it matches the split, the cap and the fees. Small mistakes slip by.',
    outcome: 'Each week it checks every closing’s deposit against what you should have been paid and shows any dollar that’s off.',
    forRole: 'Ops/admin',
    description: 'Every Tuesday, it checks each closing’s deposit in QuickBooks Online against the CDA, the split, the cap and the fees, and shows every dollar that does not match. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/commission-tie-out',
    tools: ['grok'],
    topics: ['bookkeeping', 'team-ops'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine commission tie out cda commission disbursement deposit split cap franchise fee referral fee quickbooks qbo brokerage statement variance closing',
    collection: 'bookkeeping',
  },
  {
    title: 'Team Split & Payout Journals',
    problem: 'Every pay period, someone works out each agent’s split, cap and fees by hand. One slip, and an agent gets paid wrong.',
    outcome: 'It drafts the payout entries in QuickBooks for each pay period, and nothing posts until you approve each line.',
    forRole: 'Ops/admin',
    description: 'It drafts the split, cap, desk fee and payable entries for each pay period in QuickBooks Online, then waits. Nothing posts until you approve each line. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/team-payout-journals',
    tools: ['grok'],
    topics: ['bookkeeping', 'team-ops'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine team payout journal entries agent payables split cap crossing desk fee override 1099 agents quickbooks qbo pay period approve post',
    collection: 'bookkeeping',
  },
  {
    title: 'Month-End Close Packet',
    problem: 'Closing the books each month means chasing loose ends in a lot of places. It drags on, so you see your real numbers late.',
    outcome: 'Each month it builds one packet with your accounts matched up, the loose ends listed and your profit by agent or lead source.',
    forRole: 'Ops/admin',
    description: 'On the 3rd of every month, it builds one close packet from QuickBooks Online: reconciliations, leftover uncategorized items, deals that closed but have not paid, and a P&L by agent or lead source. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/month-end-close',
    tools: ['grok'],
    topics: ['bookkeeping', 'team-ops'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine month end close packet reconciliation bank rec uncategorized accrual pending closings profit and loss p&l by agent lead source quickbooks qbo monthly books',
    collection: 'bookkeeping',
  },
  {
    title: 'Trust & Earnest Money Watch',
    problem: 'If you hold client money, your trust account has to match to the penny. A small mix-up can turn into a big problem.',
    outcome: 'Each week it checks that the trust bank, QuickBooks and each deal’s record agree, and flags anything that looks off.',
    forRole: 'Broker',
    description: 'For brokerages that hold client funds. Every Friday, it checks that the trust bank, QuickBooks Online and the per-deal ledger agree, and flags commingling, aging funds and closed files not at zero. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/trust-earnest-watch',
    tools: ['grok'],
    topics: ['bookkeeping', 'team-ops'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine trust account earnest money escrow three-way reconciliation commingling broker brokerage utah division of real estate trust bank ledger quickbooks qbo',
    collection: 'bookkeeping',
    audience: 'For Brokers',
  },
  {
    title: '1099 Vendor & Agent Readiness',
    problem: 'Every January, you chase agents and vendors for tax forms you should have had all year.',
    outcome: 'It keeps track of who you paid and who sent a W-9 all year, so 1099 season is a quick check, not a scramble.',
    forRole: 'Ops/admin',
    description: 'It tracks who you paid in QuickBooks Online, who sent a W-9 and who is over the IRS threshold, so January is a check, not a scramble. It never files the forms and never shows a TIN. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/vendor-1099-readiness',
    tools: ['grok'],
    topics: ['bookkeeping', 'team-ops'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine 1099 1099-nec w-9 vendors contractors photographers tc stagers coaches 1099 agents irs threshold year end january quickbooks qbo',
    collection: 'bookkeeping',
  },
  {
    title: 'Quarterly Tax & Profit-First Set-Aside',
    problem: 'Tax bills sneak up on you, and the money isn’t set aside. Then you’re scrambling to cover them.',
    outcome: 'Each month it shows how much to move into tax, profit and savings, at the rates you or your CPA set.',
    forRole: 'Team owner',
    description: 'On the 5th of every month, it shows what to move into tax, profit and reserve at the rates you or your CPA set, and how close the next IRS estimate date is. It never invents a tax rate. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/quarterly-tax-profit-first',
    tools: ['grok'],
    topics: ['bookkeeping', 'team-ops'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine quarterly taxes estimated tax set aside profit first reserve savings irs 1040-es commission income self employed producing agent cpa quickbooks qbo',
    collection: 'bookkeeping',
  },
  {
    title: 'Lead-Source ROI',
    problem: 'You pay for leads every month, but you’re not sure which ones pay you back. So you keep paying for all of them.',
    outcome: 'Each month it puts what you spent on each lead source next to what closed, so you can see which ones pay off.',
    forRole: 'Team owner',
    description: 'On the 5th of every month, it puts your lead spend in QuickBooks Online next to what closed in Follow Up Boss, by source. Untagged spend and closings with no source get called out. GCI is never estimated. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/lead-source-roi',
    tools: ['grok'],
    topics: ['bookkeeping', 'team-ops'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine lead source roi return on investment zillow realtor.com google facebook ads open houses sphere cost per closing gci follow up boss fub quickbooks qbo marketing spend',
    collection: 'bookkeeping',
  },
  {
    title: 'Contract-to-Close Deadline Tracker',
    problem: 'Every file has its own deadlines, and they’re easy to lose track of. Missing one can put a deal at risk.',
    outcome: 'Every morning it lists what’s late, what’s due today and what’s due soon, across all your files.',
    forRole: 'Ops/admin',
    description: 'Every morning, it lists what’s overdue, due today and due in the next three days across your files, with the date math shown. Utah REPC-first, with a general mode. It works from a spreadsheet too. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/contract-to-close-deadlines',
    tools: ['grok'],
    topics: ['transactions', 'contracts'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine contract to close deadlines due diligence settlement earnest money seller disclosure repc utah daily digest transaction coordinator tc dotloop skyslope brokermint lone wolf',
    collection: 'transactions',
  },
  {
    title: 'New Contract Intake',
    problem: 'A new contract comes in, and someone has to pull out every date and dollar by hand. That’s where mistakes start.',
    outcome: 'It reads the contract and drafts the tracker row and a first task list the same day.',
    forRole: 'Ops/admin',
    description: 'Drop in a ratified contract and it pulls out the price, the earnest money, the contingencies and the deadlines, then proposes the tracker row and a first task list the same day. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/new-contract-intake',
    tools: ['grok'],
    topics: ['transactions', 'contracts'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine new contract intake ratified contract purchase agreement repc utah tracker task list earnest money contingencies deadlines transaction coordinator tc',
    collection: 'transactions',
  },
  {
    title: 'Missing-Documents File Audit',
    problem: 'Files go to broker review with a page missing or a signature left off. Then they come back, and the clock keeps running.',
    outcome: 'Every weekday it checks each file against your own checklist and lists what’s missing or unsigned before review.',
    forRole: 'Ops/admin',
    description: 'Every weekday, it checks each file against your brokerage’s own checklist and says what’s missing or unsigned before anyone submits it for broker review. It never submits a file. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/missing-documents-audit',
    tools: ['grok'],
    topics: ['transactions', 'contracts'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine missing documents file audit broker checklist compliance review unsigned documents transaction file dotloop skyslope brokermint transaction coordinator tc',
    collection: 'transactions',
  },
  {
    title: 'Weekly Client & Agent Status Updates',
    problem: 'Clients and agents keep asking where things stand. Writing each update by hand takes time you don’t have.',
    outcome: 'Every Monday it drafts a client note and an agent note for each open file, using only the facts on file.',
    forRole: 'Ops/admin',
    description: 'Every Monday, it drafts a client note and an agent note for each active file, from documented facts only. Nothing is sent until you say which draft. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/weekly-status-updates',
    tools: ['grok'],
    topics: ['transactions', 'contracts'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine weekly status update client update agent update email drafts transaction progress under contract transaction coordinator tc',
    collection: 'transactions',
  },
  {
    title: 'Stalled Lender, Title & Escrow Follow-Up',
    problem: 'The appraisal, the title work or the loan has gone quiet, and nobody noticed. Now closing is close, and things are stuck.',
    outcome: 'Every weekday it spots what should have moved by now and drafts the follow-up email.',
    forRole: 'Ops/admin',
    description: 'Every weekday, it spots appraisal, title, financing, HOA and earnest money items that should have moved and drafts the follow-up email. It never invents a stall. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/stalled-item-follow-up',
    tools: ['grok'],
    topics: ['transactions', 'contracts'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine stalled items follow up lender title escrow appraisal title commitment hoa documents earnest money receipt chase email transaction coordinator tc',
    collection: 'transactions',
  },
  {
    title: 'Closing-Week Checklist',
    problem: 'Closing week is busy, and small things fall through the cracks. One missed step can push the closing back.',
    outcome: 'Every morning it runs a closing-week checklist for each file and adds a reminder to watch for wire fraud.',
    forRole: 'Ops/admin',
    description: 'Every morning, it runs a seven-day checklist for each file about to close, with a wire-fraud reminder that never touches wire instructions. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/closing-week-checklist',
    tools: ['grok'],
    topics: ['transactions', 'contracts'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine closing week checklist settlement walk-through clear to close closing disclosure cd keys wire fraud transaction coordinator tc',
    collection: 'transactions',
  },
  {
    title: 'Listing-to-Live Launch Checklist',
    problem: 'A listing goes live with a missing disclosure or the wrong photo. Now you’re fixing it in front of everyone.',
    outcome: 'Every weekday it checks each new listing for disclosures, photos, the sign and the lockbox before it goes live.',
    forRole: 'Agent',
    description: 'Every weekday, it checks each listing in pre-launch for disclosures, photos, remarks, the sign, the lockbox and coming-soon rules, before anyone hits publish. It never publishes to the MLS. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/listing-to-live',
    tools: ['grok'],
    topics: ['transactions', 'listings'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine listing launch checklist listing to live coming soon disclosures photos remarks sign lockbox mls listing coordinator listing agent',
    collection: 'transactions',
  },
  {
    title: 'Post-Close File Closeout',
    problem: 'After closing, the last steps get skipped. The file isn’t archived, nobody asks for a review and the client is never marked as a past client.',
    outcome: 'It drafts the commission request, the archive, the review ask and the past client update, and waits for your OK on each.',
    forRole: 'Ops/admin',
    description: 'After settlement, it drafts the CDA request, the archive, the review ask and the move to Past Client in your CRM. Nothing is sent or changed until you approve each step. Download the template, add it to Grok Bot and save the routine it recommends.',
    kind: 'Grok Bot',
    href: '/post-close-file-closeout',
    tools: ['grok'],
    topics: ['transactions', 'contracts'],
    added: '2026-11-10',
    keywords: 'grok grok bot template scheduled routine post close file closeout cda commission request archive review request past client crm follow up boss after closing transaction coordinator tc',
    collection: 'transactions',
  },
];

/**
 * A page's lead, by its path without the slash ("tc-file-audit"): what its card says first, so its
 * page and the platform's Skill Library say exactly the same words. `undefined` for a page no card
 * links to.
 */
export function leadFor(page: string): Lead | undefined {
  const e = ENTRIES.find((x) => x.href === `/${page}`);
  return e ? { problem: e.problem, outcome: e.outcome, ...(e.forRole ? { forRole: e.forRole } : {}) } : undefined;
}

export const LIBRARY = {
  meta: {
    // "The Library", not "The Free Library": most of it is paid now, and each free item says so on its
    // own card (Connor, 2026-11-11, D-103). The homepage's nav says the same (D-102).
    title: 'The Library · Amplified Impact',
    description:
      'Claude skills, Grok Bot templates, guides and setups for real estate teams. 5 skills are free for anyone. The rest come with a plan.',
    url: 'https://www.amplifiedimpact.io/library',
    siteName: 'Amplified Impact',
  },
  logoAlt: 'Amplified Impact',
  eyebrow: 'The Library',
  title: 'Put AI to work on your team.',
  // Spring's plan: "Show all 56 so people see the depth. Make 5 free and lock everything else" (D-115).
  // "Amplified Skill Library" is a retired product name, so the lede says "a plan".
  lede: 'Claude skills, Grok Bot templates, guides and setups for real estate teams. 5 skills are free for anyone. The rest come with a plan.',
  /** The free five, first on the page (D-115). "Get 5 Free Skills" lands here (`/library?show=free`). */
  free: {
    heading: 'Start with 5 free skills',
    body: 'Free for anyone, in real estate or not. They make AI useful in your day first. Each one asks for your name and email.',
  },
  // The full list's heading, over its filters (the v2 mockup shows it).
  listHeading: 'Everything in the library',
  filters: {
    label: 'Filter the library',
    tool: 'By AI tool',
    topic: 'By topic',
    track: 'By track',
    who: 'For',
    all: 'All',
    search: 'Search',
    searchPlaceholder: 'Try a task, like reels or meetings',
    sort: 'Sort by',
    newest: 'Newest first',
    oldest: 'Oldest first',
  },
  /** With no script, every card shows, so this is the count of all of them. The script's words match. */
  count: (n: number) => `Showing ${n} ${n === 1 ? 'resource' : 'resources'}`,
  empty: 'Nothing matches that.',
  clear: 'Clear filters',
  soon: 'Coming soon',
  /**
   * What a card says about getting it (D-115): one of the free five, a free guide or kit (a lead magnet,
   * Spring's "Free Resources", separate from the five), or locked, which a lock beside it says too, in
   * the arrow's place. Which skills are locked is the catalog's call (`FREE_SKILLS` in
   * `@ai/core/skills`), read through the skill's page.
   */
  access: { free: 'Free', resource: 'Free Resource', locked: 'Locked' },
  /**
   * The library's general note, under everything (D-101): the compliance rules in the skills and
   * templates are the house's conservative defaults (Connor, 2026-11-10), each also said on its page.
   */
  note: 'The texting, email, calling, review and commission rules in these skills and templates are conservative defaults, stricter than the law in places. Calibrate them with your own legal counsel.',
  /**
   * The Grok Bot shelf (D-100), under the main list: its templates in two collections, in
   * `GROK_COLLECTIONS` order. The words are the README's collection intros, in this page's voice.
   */
  grok: {
    heading: 'Grok Bot',
    body: 'Templates for Grok Bot, not Claude Skills. Each one is a skill you add to Grok Bot once, with a routine that runs it on a schedule. They read and draft, and change nothing until you approve.',
    collections: {
      bookkeeping: {
        heading: 'Bookkeeping',
        body: 'Your books shouldn’t depend on expense reports you never file. These run against QuickBooks Online. They watch the card, tie out commissions, draft payout journals, close the month, keep 1099s and tax set-asides from sneaking up on you, and show which lead sources pay.',
      },
      transactions: {
        heading: 'Transactions',
        body: 'Deadlines don’t care which software your team picked. These watch the contract, Utah REPC or otherwise, and draft the next move. They work with Dotloop, SkySlope, Brokermint, Lone Wolf, Paperless Pipeline, Open to Close, or a shared sheet and an inbox.',
      },
    },
  },
} as const;
