// Homepage v3's words, exactly as `docs/design/home-v3/copy.md` gives them (Connor approved the copy;
// Spring reviews every new word, listed in `spring-new-words.md`). Mono labels are written in sentence
// case: the stylesheet sets them in capitals, as copy.md notes.
//
// Not here, on purpose: figures that already have a source. The hero's 100 and 700+ are the proof
// line's (`HOME.proof`, split by `splitProof`), its 58 is the Library's count (`ENTRIES.length`, as
// /library counts it), and "Made-up example" is the kit's (`KIT.example`).

/** One AI employee on the hero's badge: its tab, its name and role, four facts, and what it has ready. */
export interface Badge {
  key: 'owners' | 'agents' | 'ops';
  tab: string;
  name: string;
  role: string;
  facts: readonly (readonly [string, string])[];
  readyAt: string;
  ready: readonly string[];
}

export const HERO = {
  eyebrow: 'AI coaching, training and ready-to-run skills',
  /** The headline's three lines, as the mockup breaks them. */
  title: ['Your next', 'employee doesn’t', 'need a desk.'],
  lead: 'We teach owners, ops leads and agents to put AI to work. You get live coaching plus ready-to-run skills that do real jobs in your business, in your voice. Built inside a 100-agent real estate team, for agents and teams like yours.',
  primary: { label: 'Get 5 Free Skills', href: '#free' },
  secondary: { label: 'See the Programs', href: '#programs' },
  kicker: 'AI employee',
  tabsLabel: 'Meet an AI employee',
  badges: [
    {
      key: 'owners',
      tab: 'Owners',
      name: 'Morning Brief',
      role: 'For team owners',
      facts: [
        ['Reports to', 'You'],
        ['Start date', 'Today'],
        ['Shift', 'Every morning, 6:00 AM'],
        ['Lunch', 'Skips it'],
      ],
      readyAt: 'Ready at 6:00 AM',
      ready: ['3 things need you today', '2 deals haven’t moved this week', 'Every next step has an owner', '4 replies drafted for your yes'],
    },
    {
      key: 'agents',
      tab: 'Agents',
      name: 'Speed to Lead Reply',
      role: 'For agents',
      facts: [
        ['Reports to', 'You'],
        ['Sounds like', 'You, on a good day'],
        ['Shift', 'Every new lead'],
        ['Sends', 'After your yes'],
      ],
      readyAt: 'New lead at 9:12 PM',
      ready: ['First reply drafted, in your voice', 'Call opener ready for the morning', '2 follow-ups lined up', 'Nothing sent without your yes'],
    },
    {
      key: 'ops',
      tab: 'Ops',
      name: 'Commission Tie-Out',
      role: 'For ops leads',
      facts: [
        ['Reports to', 'Your ops lead'],
        ['Desk', 'Not needed'],
        ['Shift', 'Every closing'],
        ['Rounding', 'Never'],
      ],
      readyAt: 'After today’s closing',
      ready: ['Deposit matched to the CDA', 'Split and cap checked', 'Fees tied out', '1 difference flagged for you'],
    },
  ] as const satisfies readonly Badge[],
  /** The stat strip's labels, under the proof line's two figures and the Library's count. */
  stats: {
    agents: 'Agents on the team where it was built',
    homes: 'Homes that team closes a year',
    library: 'Skills, guides and templates',
  },
} as const;

/**
 * S2. Connor's decision (Nov 12, C9): no video; a real still photo in its place, which he is choosing.
 * The heading and caption are copy.md's; the video's own words (its length, the player, the
 * "Spring on camera" bubble) are gone with it. Until the photo is chosen the section is pending
 * (`video-still`), so these words show only in a preview, beside an empty slot: never a stock or AI image.
 */
export const STILL = {
  title: 'Watch it run in a real business.',
  caption:
    'No stock footage. No demo account. This is Spring opening the reports, briefs and follow-ups that run her 100-agent team every morning.',
  /** Preview only: what the empty slot says, and its name for screen readers. */
  slot: 'Photo to come · Connor is choosing a real still',
  slotLabel: 'Placeholder for a real photo of Spring’s morning, still being chosen',
} as const;
