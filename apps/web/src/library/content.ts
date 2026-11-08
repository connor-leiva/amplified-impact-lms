// Every word on /library, the free library: one page that lists every guide, skill and setup on the
// site, so people can find them without a link from a talk or a DM. DECISIONS.md D-050.
//
// THIS IS THE ONE FILE TO EDIT WHEN THE LIBRARY CHANGES. To list something new, add one record to
// `ENTRIES`. The filter pills are worked out from the records, so a new tool or topic gets its pill by
// being used, and a pill nothing uses never shows. `render.test.ts` fails when a guide in the API's
// `GUIDE_SLUGS` has no record here, so a new guide cannot ship missing from the library.
//
// House rules, as on /ai101: no em dashes, short plain sentences.

/** The AI apps a resource works in. The label is what the pill and the card say. */
export const TOOLS = { claude: 'Claude', chatgpt: 'ChatGPT' } as const;
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
} as const;
export type Topic = keyof typeof TOPICS;

export interface Entry {
  title: string;
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
}

export const ENTRIES: readonly Entry[] = [
  {
    title: 'Team Playbook Builder',
    description: 'Upload your team’s SOPs and training calls and get back a playbook your agents add to their own Claude, with the source behind every answer, plus the gaps and conflicts to fix. Set it up on a computer, with a Claude plan that can add skills.',
    kind: 'Claude Skill',
    href: '/team-playbook-builder',
    tools: ['claude'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-08',
    keywords: 'team playbook, SOP, SOPs, onboarding, agent onboarding, new agent questions, team policies, policy manual, agent handbook, team knowledge base, onboarding assistant, training transcripts, pond rules, lead routing, transaction handoff, fee schedule, team leader, ops, Claude skill builder',
  },
  {
    title: 'Recruiting Prep',
    description: 'Upload your recruit list and get it back with the duplicates merged, every agent tiered by production, and first-touch drafts for each tier, or prep one recruiting coffee from a candidate’s production. Set it up once on a computer, in Claude or ChatGPT.',
    kind: 'Claude Skill',
    href: '/recruiting-prep',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-08',
    keywords: 'recruiting recruit list agent recruiting mls production report brokermetrics sisu recruiting gohighlevel follow up boss top producers team leader recruiter appointment setter recruiting coffee value proposition objections split cap first-touch email tiers duplicates',
  },
  {
    title: 'Database Health Check',
    description: 'Upload your CRM export and get a health report, a cleanup list for your VA, and the groups worth calling or emailing this month, with the messages drafted. Easiest on a computer. The skill never changes your CRM.',
    kind: 'Claude Skill',
    href: '/database-health-check',
    tools: ['claude', 'chatgpt'],
    topics: ['skills', 'team-ops'],
    added: '2026-11-08',
    keywords: 'crm cleanup database health check audit follow up boss fub export dedupe duplicates merge smart lists ponds past clients sphere soi nurture stale leads never contacted re-engagement team leader owner ops va worklist kw command gohighlevel brivity',
  },
  // Not on the site yet. Set `href` to its page when it goes up. The words are from the README of the
  // `content-opportunity-research` skill, taken to be this one (D-050).
  {
    title: 'Content Strategist',
    description: "Find out what to post next on Instagram, based on what's outperforming in your niche this week.",
    kind: 'Claude Skill',
    href: null,
    tools: ['claude'],
    topics: ['skills', 'content'],
    added: '2026-10-28',
    keywords: 'instagram reels ideas hooks research outliers social media marketing',
  },
  {
    title: "Retool, Don't Replace",
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
    description:
      'Build your AI voice profile in ChatGPT or Claude, free. Then a Carousel Creator that turns one idea into a branded Instagram carousel: that part needs a laptop and Claude Pro or higher.',
    kind: 'Workshop Kit',
    href: '/ai101',
    tools: ['claude', 'chatgpt'],
    topics: ['setup', 'content', 'prompts'],
    added: '2026-10-07',
    keywords: 'carousels carousel creator instagram social media posts design brand agents beginner workshop expcon',
  },
];

export const LIBRARY = {
  meta: {
    title: 'The Free Library · Amplified Impact',
    description:
      'Free guides, Claude skills and setups for real estate teams. Most ask for your name and email, then they are yours.',
    url: 'https://www.amplifiedimpact.io/library',
    siteName: 'Amplified Impact',
  },
  logoAlt: 'Amplified Impact',
  eyebrow: 'The Free Library',
  title: 'Put AI to work on your team.',
  // Said here so a card that opens on a sign-up form is no surprise: five of the six live pages ask.
  lede: 'Free guides, Claude skills and setups for real estate teams. Most ask for your name and email, then they are yours.',
  // Never seen: it names the list for a screen reader, under the page's one heading.
  listHeading: 'Everything in the library',
  filters: {
    label: 'Filter the library',
    tool: 'By AI tool',
    topic: 'By topic',
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
} as const;
