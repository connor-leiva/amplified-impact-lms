// Every word on /ai101: the eXpCon 2026 kit page for "Sounds Like You, Looks Like You: AI 101 for
// Agents". DECISIONS.md D-028.
//
// THIS IS THE ONLY FILE TO EDIT WHEN THE COPY OR THE PROMPTS CHANGE. `render.ts` turns it into the
// page's HTML at build time, and nothing in this file knows about markup, so an edit here never
// touches layout code.
//
// The prompts are copied to the visitor's clipboard EXACTLY as written between the backticks:
// line breaks, straight quotes and the [bracketed placeholders] included. Keep them flush-left, and
// keep the opening backtick on the same line as the first word and the closing backtick right after
// the last character, or the copied text gains a blank line or indentation. `render.test.ts` fails
// on leading or trailing whitespace.
//
// [Square brackets] in a prompt are highlighted on the page as placeholders; the copied text stays
// plain. Square brackets are not used for anything else in the prompts.

export interface Prompt {
  /** The analytics name from the spec, and the DOM id stem. */
  id: 'voice_profile' | 'carousel_creator';
  label: string;
  text: string;
}

export interface ChecklistItem {
  /** Persisted in localStorage under `ai101-checklist`. Rename one and its saved tick is dropped. */
  id: string;
  text: string;
}

export const PAGE = {
  meta: {
    title: 'AI 101 for Agents: Prompts and Setup | Amplified Impact',
    description: 'The prompts and setup from the session with Spring and Connor.',
    url: 'https://learn.amplifiedimpact.io/ai101',
    siteName: 'Amplified Impact',
  },

  header: {
    eyebrow: 'eXpCon 2026 · AI 101 for Agents',
    title: 'Sounds Like You, Looks Like You',
    subhead: 'The prompts and setup from the session with Spring and Connor.',
    jumpLinksLabel: 'On this page',
    jumpLinks: [
      { label: 'Voice profile prompt', target: 'voice-profile-prompt' },
      { label: 'Carousel Creator', target: 'carousel-creator' },
      { label: 'December waitlist', target: 'waitlist' },
    ],
  },

  voiceProfile: {
    anchor: 'voice-profile',
    heading: 'Step 1: Your AI voice profile',
    intro: 'Works in free ChatGPT or Claude, on a phone or a laptop. Voice memos count as samples.',
    steps: [
      'Collect 10 to 15 samples of you: captions you actually wrote, emails, or a transcript of you talking about your market.',
      'Paste them in with the voice profile prompt below. It maps your tone, sentence length, go-to phrases, and how you open and close.',
      `Add a never list: the lines that make every agent's feed sound the same, like "In today's market," "Let's dive in," and "Thinking of buying or selling?"`,
      `Save it where your AI keeps instructions: a Claude Project, a custom GPT, or ChatGPT's custom instructions.`,
      'Test it: the same post about a client question, from generic AI and from your profile, side by side.',
    ],
    prompt: {
      id: 'voice_profile',
      label: 'Voice profile prompt',
      text: `Below are samples of how I write and talk. Study them and build my voice profile.

Describe my tone, sentence length, go-to phrases, how I open and close a post, how I use emoji and punctuation, and words I never use.

Add a NEVER list that includes: "In today's market," "Thinking of buying or selling?" "Let's dive in," "game-changer," and anything that sounds like every other agent's feed.

Write the profile as instructions I can save and reuse, starting with "Write as me."

I'm a real estate agent in [city or market]. My clients are mostly [buyers, sellers, or both].

My samples:
[paste 10 to 15 samples]`,
    } satisfies Prompt,
  },

  carouselCreator: {
    anchor: 'carousel-creator',
    heading: 'Step 2: Your Carousel Creator',
    intro:
      'Needs a laptop and a paid Claude plan (Pro or higher). An AI employee is three layers: a brain, a brand, and a job. Build the first two once, and every carousel after that starts with one message.',
    layers: {
      columns: ['Layer', 'Where it lives', 'What goes in'],
      rows: [
        [
          '1. The brand',
          'A design system in Claude Design, set up once at claude.ai/design',
          'Logo, headshot, brand colors, fonts, two or three posts you love, and your brokerage name',
        ],
        [
          '2. The brain',
          'A Claude Project called Carousel Creator',
          'Your voice profile, the carousel instructions, and a short file of your niche, neighborhoods, and top client questions',
        ],
        [
          '3. The job',
          'A new conversation in the Project, once a week',
          'One idea from a pillar: a client question, a market stat, a lesson, or a take on industry news',
        ],
      ],
    },
    checklistHeading: 'Setup checklist',
    checklist: [
      {
        id: 'design-system',
        text: 'Set up your design system at claude.ai/design with your logo, headshot, brand colors, fonts, two or three posts you love, and your brokerage name.',
      },
      { id: 'create-project', text: 'Create a Claude Project called Carousel Creator.' },
      {
        id: 'paste-instructions',
        text: `Paste the Carousel Creator instructions below into the Project's instructions and fill in the bracketed parts.`,
      },
      { id: 'add-voice-profile', text: 'Add your voice profile to the Project.' },
      { id: 'add-niche-file', text: 'Add a short file with your niche, neighborhoods, and top client questions.' },
      { id: 'first-idea', text: 'Start a new conversation in the Project and send one idea.' },
    ] satisfies ChecklistItem[],
    prompt: {
      id: 'carousel_creator',
      label: 'Carousel Creator instructions',
      text: `You're my Carousel Creator. Write as me, using my voice profile.

When I give you one idea (a client question, a market stat, a lesson from my week, or a take on industry news), make an Instagram carousel:
- 7 slides, portrait 4:5
- Slide 1: a scroll-stopping hook, 8 words max
- Slides 2 to 5: one idea per slide, 25 words max, moving from the problem, to what most people get wrong, to what I'd do instead
- Slide 6: the proof, using only a stat or story I gave you
- Slide 7: an invitation to comment or DM me, plus my brokerage name per my state's advertising rules
- Use my design system for colors, fonts, logo, and headshot

Show me the slide copy for approval before you design anything. Flag anything about neighborhoods, schools, or who a place is right for, since that can raise fair housing concerns. Never invent a stat, a quote, or a client story.

About me: [niche, neighborhoods, and the questions clients ask me most]. My brokerage: [brokerage name].`,
    } satisfies Prompt,
    weekHeading: 'How a week works',
    week: [
      'Open the Carousel Creator and send one idea, like "A buyer asked if they should wait for rates to drop."',
      'It drafts the slide copy in your voice. You edit and approve it.',
      'Claude builds the carousel in Claude Design on your design system. Adjust anything in plain English or on the canvas.',
      'Export: send to Canva and download images for Instagram, or export a PDF for LinkedIn.',
      'Post it and answer every comment and DM yourself.',
    ],
  },

  ownership: {
    anchor: 'four-things',
    // As written in the spec, confirmed by the presenters on 2026-10-06.
    heading: 'Four things never leave Own',
    intro: 'AI can draft. These stay with you.',
    items: [
      'Fair housing review of anything about neighborhoods, schools, or who a place is right for',
      `Your state's advertising rules, like brokerage identification on every post`,
      `Your MLS's rules on using market stats, including attribution`,
      'Consent before any automated text, under TCPA',
    ],
  },

  sprint: {
    anchor: 'sprint',
    heading: 'The 30-day authority sprint',
    intro: 'One carousel a week, rotating the pillars, with a 30-minute approval block.',
    weeks: [
      { week: 'Week 1', pillar: 'Market' },
      { week: 'Week 2', pillar: 'Method' },
      { week: 'Week 3', pillar: 'Me' },
      { week: 'Week 4', pillar: 'Market' },
    ],
    outro: 'Track conversations started, not likes.',
  },

  waitlist: {
    anchor: 'waitlist',
    heading: 'Join the December waitlist',
    body: 'Both builds open the December agent track.',
    fields: {
      firstName: { label: 'First Name' },
      email: { label: 'Email' },
      brokerage: { label: 'Brokerage', optional: 'Optional' },
    },
    button: 'Join the waitlist',
    consent: `We'll email you about the December agent track. Unsubscribe anytime.`,
    success: `You're on the list.`,
  },
} as const;

/**
 * The strings the page's script needs at runtime. A separate export so the bundled script carries
 * these few lines and not the whole page (`main.ts` imports only this).
 */
export const UI = {
  copy: 'Copy prompt',
  copied: 'Copied',
  /** Announced through the polite live region, e.g. "Voice profile prompt copied". */
  copiedAnnouncement: (label: string) => `${label} copied`,
  /** When neither the Clipboard API nor execCommand works: the text is selected instead. */
  copyFailedAnnouncement: (label: string) => `${label} is selected. Copy it from your device's menu.`,
  errors: {
    firstName: 'Enter your first name.',
    // The sign-in screen's wording, so the product says this one thing one way.
    email: 'Enter a valid email address.',
    generic: 'Something went wrong. Try again.',
  },
} as const;
