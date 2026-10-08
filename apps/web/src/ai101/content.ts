// Every word on /ai101: the eXpCon 2026 workshop page for "Sounds Like You, Looks Like You: AI 101
// for Agents". DECISIONS.md D-028, D-032 and D-034.
//
// THIS IS THE ONLY FILE TO EDIT WHEN THE COPY OR THE PROMPTS CHANGE. `render.ts` turns it into the
// page's HTML at build time, and nothing in this file knows about markup, so an edit here never
// touches layout code.
//
// THE PAGE IS A STEP-THROUGH (D-034). `screens` is the order: with JavaScript, one screen at a time,
// with a progress header and a Back / Next footer; without it, every screen in order on one page.
// The words are Connor's workshop design ("AI 101 for Agents - Workshop", Claude Design, 2026-10-08),
// verbatim, except where a comment here says otherwise.
//
// The prompts are copied to the visitor's clipboard EXACTLY as written between the backticks, once
// the fields that fill them are applied: line breaks, straight quotes and the [bracketed
// placeholders] included. Keep them flush-left, the opening backtick on the same line as the first
// word and the closing backtick right after the last character. `render.test.ts` fails on leading or
// trailing whitespace.
//
// [Square brackets] in a prompt are highlighted on the page as placeholders; the copied text stays
// plain. Square brackets are not used for anything else in the prompts.

export interface Prompt {
  /** The analytics name from the spec, and the DOM id stem. */
  id: 'voice_profile' | 'carousel_creator' | 'brand_system';
  label: string;
  text: string;
}

/**
 * A run of inline copy. A plain string is text; each object is one of the few kinds of markup the
 * page makes, and `render.ts` escapes every string inside it. Copy is STRUCTURED rather than written
 * as HTML so that a `<` typed into this file always arrives on the page as a `<`.
 *
 *   { strong }  bold text
 *   { link }    an inline text link. `sameTab` keeps it in this tab (the page's own files).
 */
export type Inline = string | { strong: string } | { link: string; href: string; sameTab?: boolean };

/** A "Copy & open" button: copies a prompt, then opens `href` in a new tab. */
export interface CopyOpen {
  label: string;
  /** The app's name, for the two-tap fallback's "Copied. Open {app}". */
  app: string;
  href: string;
  /** What the toast says once the prompt is on the clipboard. */
  toast: string;
}

/** A link drawn as a button. */
export interface LinkButton {
  label: string;
  href: string;
}

/** One screen of the step-through, in order. */
export interface Screen {
  /** The screen's id: an anchor a QR code, a slide or an email can point at. */
  anchor: string;
  /** The header's stage label: "Step 1 · Voice Profile". */
  stage: string;
  /** "1 of 4", or nothing. */
  count?: string;
  /** The footer's big green button. None on the last screen, which has Start Over instead. */
  next?: string;
}

/** A labelled field whose value fills a prompt's [placeholder] as it is typed. */
export interface FillField {
  /** The key it is saved under, and its `data-field`. */
  name: 'market' | 'clients' | 'niche' | 'hoods' | 'questions' | 'brokerage' | 'profile';
  label: string;
  /** Lighter text after the label. */
  hint?: string;
  placeholder: string;
  /** A textarea of this many rows, or a single-line input. */
  rows?: number;
}

/**
 * The Carousel Creator instructions, as the design assembles them with every field empty: an
 * "About me" block of placeholders and a "My voice profile" slot, each filled from "Tell it about
 * you" (`UI.slots`).
 */
const CAROUSEL_INSTRUCTIONS = `You're my Carousel Creator. Write as me, using my voice profile.

When I give you one idea (a client question, a market stat, a lesson from my week, or a take on industry news), make an Instagram carousel:
- 7 slides, portrait 4:5
- Slide 1: a scroll-stopping hook, 8 words max
- Slides 2 to 5: one idea per slide, 25 words max, moving from the problem, to what most people get wrong, to what I'd do instead
- Slide 6: the proof, using only a stat or story I gave you
- Slide 7: an invitation to comment or DM me, plus my brokerage name per my state's advertising rules
- Use my design system for colors, fonts, logo, and headshot

Show me the slide copy for approval before you design anything. Flag anything about neighborhoods, schools, or who a place is right for, since that can raise fair housing concerns. Never invent a stat, a quote, or a client story.

About me:
- Niche: [your niche]
- Neighborhoods: [neighborhoods]
- Questions clients ask me most: [top client questions]
My brokerage: [brokerage name]

My voice profile:
[paste the profile that starts with "Write as me."]`;

/** The senders the waitlist's consent names (Connor, 2026-10-08). One string, so it never drifts. */
const SENDERS = 'Amplified Impact, Spring B and its affiliated companies, Spring, and Connor';

export const PAGE = {
  meta: {
    title: 'AI 101 for Agents · Amplified Impact',
    description: 'The prompts and setup from the session with Spring and Connor.',
    url: 'https://learn.amplifiedimpact.io/ai101',
    siteName: 'Amplified Impact',
  },

  /** The step-through's screens, in order. Each anchor is the id of that screen's <section>. */
  screens: [
    { anchor: 'welcome', stage: 'Welcome', next: 'Start Step 1' },
    { anchor: 'voice-profile', stage: 'Step 1 · Voice Profile', count: '1 of 4', next: 'I Have My Samples' },
    { anchor: 'voice-profile-copy', stage: 'Step 1 · Voice Profile', count: '2 of 4', next: 'I Have My Profile' },
    { anchor: 'voice-profile-save', stage: 'Step 1 · Voice Profile', count: '3 of 4', next: 'Saved It' },
    { anchor: 'voice-profile-test', stage: 'Step 1 · Voice Profile', count: '4 of 4', next: 'Start Step 2' },
    { anchor: 'carousel-creator', stage: 'Step 2 · Carousel Creator', count: '1 of 5', next: "I'm on My Laptop" },
    // The design's "Brand Is Published": the brand is now built from a chat and saved, not published
    // (D-032's research; Connor chose the corrected flow on 2026-10-08). The id is the old checklist's,
    // whose first item this screen is, so a link to it still lands somewhere that makes sense.
    { anchor: 'carousel-creator-checklist', stage: 'Step 2 · Carousel Creator', count: '2 of 5', next: 'My Brand Is Saved' },
    { anchor: 'carousel-creator-about', stage: 'Step 2 · Carousel Creator', count: '3 of 5', next: 'Next' },
    { anchor: 'carousel-creator-project', stage: 'Step 2 · Carousel Creator', count: '4 of 5', next: 'Project Is Made' },
    { anchor: 'carousel-creator-first-idea', stage: 'Step 2 · Carousel Creator', count: '5 of 5', next: 'How a Week Works' },
    { anchor: 'carousel-creator-week', stage: 'Your Week', next: 'Last Thing' },
    { anchor: 'waitlist', stage: 'December Waitlist' },
  ] satisfies Screen[],

  nav: {
    label: 'Steps',
    back: 'Back',
    restart: 'Start Over',
  },

  welcome: {
    logoAlt: 'Amplified Impact',
    eyebrow: 'eXpCon 2026 · AI 101 for Agents',
    title: 'Sounds Like You, Looks Like You',
    intro:
      "The prompts and setup from the session with Spring and Connor. One screen at a time. Tap the big green button when you're ready for the next one.",
    getApp: {
      heading: 'First: get the app and sign in',
      body: 'Either one works. Phone or laptop. Free.',
      // Each `web` href is the desktop and no-JavaScript default; `main.ts` swaps in the platform's
      // store link on iPhone, iPad and Android (D-032). The design links the web apps; the store
      // links are what "get the app" means on the phones in the room.
      apps: [
        {
          label: 'Get ChatGPT',
          href: {
            web: 'https://chatgpt.com/download',
            ios: 'https://apps.apple.com/app/chatgpt/id6448311069',
            android: 'https://play.google.com/store/apps/details?id=com.openai.chatgpt',
          },
        },
        {
          label: 'Get Claude',
          href: {
            web: 'https://claude.com/download',
            ios: 'https://apps.apple.com/us/app/claude-by-anthropic/id6473753684',
            android: 'https://play.google.com/store/apps/details?id=com.anthropic.claude',
          },
        },
      ],
    },
    buildsLead: "Today you'll build two things:",
    builds: [
      { name: 'Your AI voice profile.', detail: ' Phone or laptop, free.' },
      { name: 'Your Carousel Creator.', detail: ' Laptop, Claude Pro or higher.' },
    ],
    // A real link to Step 2's screen, so it works without JavaScript too.
    skip: { label: 'Already have a voice profile? Skip to Step 2', href: '#carousel-creator' },
  },

  samples: {
    heading: 'Collect 10 to 15 samples of you',
    intro: 'Things you actually wrote or said. Put them in a note on your phone for now.',
    items: ['Captions you wrote yourself', 'Emails to clients', 'A transcript of you talking about your market'],
    tip: 'Voice memos count as samples.',
  },

  voiceCopy: {
    heading: 'Fill in two blanks, then copy',
    fields: [
      { name: 'market', label: 'Your city or market', placeholder: 'Farmington, CT' },
      { name: 'clients', label: 'Your clients are mostly', placeholder: 'buyers, sellers, or both' },
    ] satisfies FillField[],
    // Copy, then open a BLANK chat. Never a `?q=` prefill: ChatGPT's sends the prompt before the
    // brackets are filled in, and Claude's shows a "Use caution" banner (D-032).
    open: [
      {
        label: 'Copy & Open ChatGPT',
        app: 'ChatGPT',
        href: 'https://chatgpt.com/',
        toast: 'Copied. Paste it into the new ChatGPT chat.',
      },
      {
        label: 'Copy & Open Claude',
        app: 'Claude',
        href: 'https://claude.ai/new',
        toast: 'Copied. Paste it into the new Claude chat.',
      },
    ] satisfies CopyOpen[],
    thenHeading: 'Then, in the new chat:',
    then: [['Paste.'], ['Replace the last line with your samples.'], ['Send.']] as Inline[][],
    showPrompt: 'See the full prompt',
    note: `It already bans lines like "In today's market," "Let's dive in," and "Thinking of buying or selling?" Add any others you're tired of.`,
  },

  voicePrompt: {
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

  save: {
    heading: 'Save your profile so the AI remembers it',
    intro: 'Copy the answer the AI gave you (it starts with "Write as me."). Then pick the app you used.',
    pickLabel: 'The app you used',
    claude: {
      tab: 'Claude',
      steps: [
        ['Open Claude Projects.'],
        ['Click ', { strong: 'New project' }, ', top right.'],
        ["Paste your profile into the Project's ", { strong: 'Instructions' }, '.'],
      ] as Inline[][],
      button: { label: 'Open Claude Projects', href: 'https://claude.ai/projects' },
      note: 'Works on free or paid Claude.',
    },
    chatgpt: {
      tab: 'ChatGPT',
      steps: [['Open ChatGPT settings.'], ['Paste your profile into ', { strong: 'Custom instructions' }, '.']] as Inline[][],
      // Connor's deep link (2026-10-07): it lands on Custom instructions itself. The design's
      // `#settings/Personalization` stops one screen short.
      button: { label: 'Open ChatGPT Settings', href: 'https://chatgpt.com/settings/personalization?instructions=chatgpt' },
      note: 'Free plans hold about 1,500 characters there. If your profile is longer, use a Claude Project.',
    },
  },

  test: {
    heading: 'Test it',
    intro:
      'Ask for the same post about a client question twice: once in a plain chat, once with your profile. Put them side by side.',
    before: { label: 'Before', text: 'Generic AI' },
    after: { label: 'After', text: 'Sounds like you' },
    done: "Step 1 done. That's all you need in the room today.",
    phone: {
      heading: 'On your phone?',
      body: 'Step 2 needs a laptop and Claude Pro or higher. Email yourself this page and finish tonight.',
      // A phone-to-laptop handoff that lands on Step 2. `href` is the no-JavaScript fallback;
      // `main.ts` uses the share sheet where there is one (D-032).
      button: {
        label: 'Send This to My Laptop',
        href: 'mailto:?subject=AI%20101%20for%20Agents%3A%20Step%202%20(do%20this%20on%20your%20laptop)&body=Open%20this%20on%20your%20laptop%3A%0Ahttps%3A%2F%2Fwww.amplifiedimpact.io%2Fai101%23carousel-creator',
      },
    },
  },

  step2: {
    heading: 'Build your Carousel Creator',
    intro:
      'An AI employee is three layers: a brain, a brand, and a job. Build the first two once, and every carousel after that starts with one message.',
    layers: [
      { title: '1. The brand', body: 'Your logo, headshot, colors and fonts, set up once in Claude Design.' },
      { title: '2. The brain', body: 'A Claude Project called Carousel Creator with your voice profile and instructions.' },
      { title: '3. The job', body: 'Once a week, send it one idea.' },
    ],
    warning: 'Do this on a laptop, with Claude Pro or higher.',
  },

  // The design's "Upload these to Claude Design ... turn on Published" is replaced by the flow that
  // saves a brand every chat can use (D-032): Claude Design builds a design system from a chat only
  // when asked, so this screen brings the ask. Paste FIRST, then attach: a screenshot taken or
  // attached through the clipboard would replace the prompt Copy & Open just put there.
  brand: {
    heading: 'Set up your brand',
    open: {
      label: 'Copy & Open Claude',
      app: 'Claude',
      href: 'https://claude.ai/new',
      toast: 'Copied. Paste it into the new Claude chat.',
    } satisfies CopyOpen,
    thenHeading: 'Then, in the new chat:',
    then: [
      ['Paste. Put in your brokerage name. Know your brand colors or fonts? Add them at the end.'],
      ['Attach your logo, your headshot, and screenshots of two or three posts you love.'],
      ['Send.'],
    ] as Inline[][],
    tip: "Don't know your color codes or fonts? Skip them. Claude builds your palette and type from what you upload.",
    showPrompt: 'See the full prompt',
    lastClick: [
      { strong: 'Last click:' },
      ' check that it is saved as ',
      { strong: 'My Carousel Brand' },
      '. Not listed? In the same chat, say: Save this as a design system called My Carousel Brand.',
    ] as Inline[],
    check: { label: 'See My Design Systems', href: 'https://claude.ai/settings/design-systems' },
    capabilities: [
      "If Claude says it can't make designs, turn on Cloud code execution and file creation in ",
      { link: 'Settings, then Capabilities', href: 'https://claude.ai/settings/capabilities' },
      '.',
    ] as Inline[],
  },

  // Anthropic publishes no prompt for building a design system from a chat, so this one is ours,
  // from its setup article's inputs and tips (D-032).
  brandPrompt: {
    id: 'brand_system',
    label: 'Brand prompt',
    text: `Build a reusable design system for my real estate brand from the files I attached: my logo, my headshot, and screenshots of posts I like.

If I list brand colors or fonts at the end of this message, use them exactly. Otherwise, pull my colors and fonts from these files, and if they don't show clear colors or fonts, pick a simple palette and font pairing that fits my logo and the look of those posts. Save my logo and headshot as brand assets and use them exactly as they are.

Set it up for Instagram carousels at 4:5 (1080 x 1350) and LinkedIn PDF carousels. My brokerage is [brokerage name]. Every design must show it clearly, as real estate advertising rules require.

Name it My Carousel Brand. Then show me the colors, fonts, and one sample slide.`,
  } satisfies Prompt,

  about: {
    heading: 'Tell it about you',
    intro: 'All optional. Whatever you type goes into the instructions on the next screen.',
    fields: [
      { name: 'niche', label: 'Your niche', placeholder: 'First time buyers' },
      { name: 'hoods', label: 'Neighborhoods you know best', placeholder: 'Farmington, Unionville' },
      {
        name: 'questions',
        label: 'Questions clients ask you most',
        hint: 'One per line',
        placeholder: 'Should I wait for rates to drop?',
        rows: 3,
      },
      { name: 'brokerage', label: 'Brokerage name, exactly as it must appear in ads', placeholder: 'eXp Realty' },
      {
        name: 'profile',
        label: 'Your voice profile from Step 1',
        hint: 'Starts with "Write as me." Did Step 1 on your phone? The same chat is in your history on your laptop.',
        placeholder: 'Write as me. …',
        rows: 4,
      },
    ] satisfies FillField[],
  },

  project: {
    heading: 'Make the Project',
    open: {
      label: 'Copy Instructions & Open Claude',
      app: 'Claude',
      href: 'https://claude.ai/projects',
      toast: 'Copied. Make the Project, then paste into Instructions.',
    } satisfies CopyOpen,
    thenHeading: 'Then, in Claude:',
    then: [
      ['Click ', { strong: 'New project' }, ', top right.'],
      ['Name it ', { strong: 'Carousel Creator' }, '. Click ', { strong: 'Create project' }, '.'],
      ['Open ', { strong: 'Instructions' }, ' on the right side and paste.'],
    ] as Inline[][],
    showPrompt: 'See the full instructions',
  },

  carouselPrompt: {
    id: 'carousel_creator',
    label: 'Carousel Creator instructions',
    text: CAROUSEL_INSTRUCTIONS,
  } satisfies Prompt,

  firstIdea: {
    heading: 'Send your first idea',
    intro: 'Start a new chat in the Project. Tap one to copy it, paste it in, and finish the thought.',
    starters: [
      'A buyer asked if they should wait for rates to drop.',
      `Here's a market stat I want to explain:`,
      'A lesson from my week:',
      'My take on this industry news:',
    ],
    chipTag: 'Copy',
    toast: 'Copied. Paste it into the Project chat and finish the thought.',
    done: 'Step 2 done. Your Carousel Creator is built.',
  },

  week: {
    heading: 'How a week works',
    steps: [
      'Open the Carousel Creator and send one idea.',
      'It drafts the slide copy in your voice. You edit and approve it.',
      'Claude builds the carousel in Claude Design. Adjust anything in plain English or on the canvas.',
      'Export: send to Canva and download images for Instagram, or export a PDF for LinkedIn.',
      'Post it and answer every comment and DM yourself.',
    ],
  },

  ownership: {
    anchor: 'four-things',
    heading: 'Four things you own',
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
    body: 'One carousel a week, with a 30-minute approval block. Track conversations started, not likes.',
    weeks: [
      { week: 'Wk 1', pillar: 'Market' },
      { week: 'Wk 2', pillar: 'Method' },
      { week: 'Wk 3', pillar: 'Me' },
      { week: 'Wk 4', pillar: 'Market' },
    ],
    // A real file for Apple and Outlook, served as text/calendar by the API so iOS offers "Add to
    // Calendar" (D-032), and one recurring Google event. Both start Monday, October 12, 2026.
    calendar: {
      apple: { label: 'Apple or Outlook', href: '/ai101/carousel-sprint.ics' },
      google: {
        label: 'Google Calendar',
        href: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Carousel%20Creator%3A%20weekly%20approval%20block&dates=20261012T090000/20261012T093000&recur=RRULE%3AFREQ%3DWEEKLY%3BCOUNT%3D4&details=Week%201%20Market%2C%20Week%202%20Method%2C%20Week%203%20Me%2C%20Week%204%20Market.%20Open%20your%20Carousel%20Creator%20Project%20at%20https%3A%2F%2Fclaude.ai%2Fprojects%20and%20send%20one%20idea%20from%20this%20week%27s%20pillar.%20Track%20conversations%20started%2C%20not%20likes.',
      },
    },
  },

  waitlist: {
    anchor: 'waitlist',
    logoAlt: 'Amplified Impact',
    eyebrow: 'December Agent Track',
    heading: 'Join the December waitlist',
    body: 'Both builds open the December agent track.',
    // Placeholders as the design draws them; each is also the field's (visually hidden) label.
    fields: {
      firstName: 'First name',
      email: 'Email',
      // Not in the design: texts need a number (Connor, 2026-10-08). Optional, like brokerage.
      phone: 'Mobile number (optional)',
      brokerage: 'Brokerage (optional)',
    },
    // SMS consent: separate, unchecked, optional (Connor's choice, 2026-10-08). The wording carries
    // what US carriers look for: who sends, what about, automated, not required, frequency, rates,
    // STOP and HELP, and that agreeing is not a condition of joining or of any purchase (TCPA's prior
    // express written consent). The API stores it, word for word, with the sign-up (it holds its own
    // copy; a test holds the two equal). Do not change it while visitors may have the page open: a
    // tab loaded before the change would submit, and be stored with, the new words.
    sms: `Text me about the December agent track and other programs from ${SENDERS} at the number above. Messages may be sent using automated technology. Consent isn't required to join or to buy anything. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help.`,
    button: 'Join the Waitlist',
    // Joining is the email consent and the agreement to the Terms (Connor, 2026-10-08). In place of
    // the design's "We'll email you about the December agent track. Unsubscribe anytime."
    legal: [
      'By joining, you agree to our ',
      { link: 'Terms of Service', href: '/terms' },
      ' and ',
      { link: 'Privacy Policy', href: '/privacy' },
      ` and to emails about the December agent track and other programs from ${SENDERS}. Unsubscribe anytime.`,
    ] as Inline[],
    success: "You're on the list. We'll email you about the December agent track.",
  },
} as const;

/**
 * The strings the page's script needs at runtime. A separate export so the bundled script carries
 * these few lines and not the whole page (`main.ts` imports only this).
 */
export const UI = {
  /** The two-tap fallback's armed label: the first tap copied, the second opens. */
  copiedThenOpen: (app: string) => `Copied. Open ${app}`,
  /** When neither the Clipboard API nor execCommand works: the prompt is shown and selected. */
  copyFailed: "Couldn't copy automatically. The prompt is selected below: copy it, then tap again.",
  /** A starter chip that could not copy: its words are selected instead. */
  chipCopyFailed: "Couldn't copy automatically. The words are selected: copy them from your device's menu.",
  /** How long the toast stays up, as the design has it. */
  toastMs: 3200,
  /** `navigator.share`'s payload for "Send This to My Laptop". */
  share: {
    title: 'AI 101 for Agents: Step 2 (do this on your laptop)',
    url: 'https://www.amplifiedimpact.io/ai101#carousel-creator',
  },
  /**
   * Which saved field fills which [placeholder], per prompt. A field left empty keeps its
   * placeholder; what a visitor TYPES is never a placeholder, so a bracket they type stays text.
   * `questions` is one per line, written as a list under its label.
   */
  slots: {
    voice_profile: { '[city or market]': 'market', '[buyers, sellers, or both]': 'clients' },
    carousel_creator: {
      '[your niche]': 'niche',
      '[neighborhoods]': 'hoods',
      '[top client questions]': 'questions',
      '[brokerage name]': 'brokerage',
      '[paste the profile that starts with "Write as me."]': 'profile',
    },
    brand_system: { '[brokerage name]': 'brokerage' },
  } as Record<string, Record<string, 'market' | 'clients' | 'niche' | 'hoods' | 'questions' | 'brokerage' | 'profile'>>,
  /** How a list of questions is written in place of its placeholder. */
  questionItem: '\n  - ',
  errors: {
    firstName: 'Enter your first name.',
    // The sign-in screen's wording, so the product says this one thing one way.
    email: 'Enter a valid email address.',
    phone: 'Enter a valid mobile number.',
    phoneForTexts: 'Add your mobile number to get texts.',
    generic: 'Something went wrong. Try again.',
  },
} as const;
