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
  id: 'voice_profile' | 'carousel_creator' | 'brand_system';
  label: string;
  text: string;
}

/**
 * A run of inline copy. A plain string is text; each object is one of the few kinds of markup the
 * page makes, and `render.ts` escapes every string inside it. Copy is STRUCTURED rather than written
 * as HTML so that a `<` typed into this file always arrives on the page as a `<`.
 *
 *   { strong }  bold text (weight 600; the page loads no 700)
 *   { link }    an inline text link, opening in a new tab
 *   { button }  a link drawn as a secondary button, opening in a new tab. With `phone`, phones
 *               (a coarse pointer or a narrow viewport) see that text in place of the button.
 */
export type Inline =
  | string
  | { strong: string }
  | { link: string; href: string }
  | { button: string; href: string; phone?: string };

/** A numbered step: plain text, or a lead line with a bulleted list of options under it. */
export type Step = string | { lead: string; options: readonly (readonly Inline[])[] };

export interface ChecklistItem {
  /** Persisted in localStorage under `ai101-checklist`. Rename one and its saved tick is dropped. */
  id: string;
  /** The checkbox's label: the sentence a visitor ticks off. */
  title: readonly Inline[];
  /** What to do, under the label and OUTSIDE it, so tapping a link here never ticks the box. */
  detail?: readonly Inline[];
  /** More of the same, under a block render.ts puts after `detail` (item 1's brand prompt). */
  after?: readonly Inline[];
}

/** A "Copy & open" button: copies a prompt, then opens `href` in a new tab. */
export interface CopyOpen {
  label: string;
  /** The app's name, for the two-tap fallback's "Copied. Open {app}". */
  app: string;
  href: string;
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

  // Below the jump links, above Step 1. Each `web` href is the desktop and no-JavaScript default;
  // `main.ts` swaps in the platform's store link on iPhone, iPad and Android.
  getApp: {
    lead: 'Before we start: get the app and sign in.',
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

  voiceProfile: {
    anchor: 'voice-profile',
    heading: 'Step 1: Your AI voice profile',
    badge: 'Phone or laptop · Free',
    intro: 'Works in free ChatGPT or Claude, on a phone or a laptop. Voice memos count as samples.',
    // Items 1, 2, 3 and 5 are the presenters' words and are not edited (D-032). Item 4 names where
    // each app keeps instructions and links straight to it. "Custom GPT" is gone on purpose: free
    // ChatGPT cannot create one, and this step promises free.
    steps: [
      'Collect 10 to 15 samples of you: captions you actually wrote, emails, or a transcript of you talking about your market.',
      'Paste them in with the voice profile prompt below. It maps your tone, sentence length, go-to phrases, and how you open and close.',
      `Add a never list: the lines that make every agent's feed sound the same, like "In today's market," "Let's dive in," and "Thinking of buying or selling?"`,
      {
        lead: 'Save it where your AI keeps instructions:',
        options: [
          [
            { strong: 'Claude (free or paid):' },
            ` make a Project and paste it into the Project's Instructions. `,
            { button: 'Open Claude Projects', href: 'https://claude.ai/projects' },
            ' Click New project, top right.',
          ],
          [
            { strong: 'ChatGPT:' },
            ' paste it into Custom instructions. ',
            {
              button: 'Open ChatGPT settings',
              // Lands on Custom instructions itself, so there is no "scroll down and click" step (Connor,
              // 2026-10-07). A web settings route, so phones get the app's path instead.
              href: 'https://chatgpt.com/settings/personalization?instructions=chatgpt',
              phone: 'In the app: Settings, then Personalization, then Custom instructions.',
            },
            ' Free plans hold about 1,500 characters there, so if your profile is longer, use a Claude Project.',
          ],
        ],
      },
      'Test it: the same post about a client question, from generic AI and from your profile, side by side.',
    ] satisfies Step[],
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
    // Copy, then open a BLANK chat. Never a `?q=` prefill: ChatGPT's sends the prompt before the
    // brackets are filled in, and Claude's shows a "Use caution" banner (D-032).
    promptOpen: [
      { label: 'Copy & open ChatGPT', app: 'ChatGPT', href: 'https://chatgpt.com/' },
      { label: 'Copy & open Claude', app: 'Claude', href: 'https://claude.ai/new' },
    ] satisfies CopyOpen[],
    promptHint: 'Paste it into a new chat, fill in the brackets, add your samples, then send.',
  },

  carouselCreator: {
    anchor: 'carousel-creator',
    heading: 'Step 2: Your Carousel Creator',
    badge: 'Laptop · Claude Pro or higher',
    intro:
      'Needs a laptop and a paid Claude plan (Pro or higher). An AI employee is three layers: a brain, a brand, and a job. Build the first two once, and every carousel after that starts with one message.',
    // A phone-to-laptop handoff. `href` is the no-JavaScript fallback; `main.ts` uses the share sheet
    // where there is one.
    sendToLaptop: {
      label: 'Send this to my laptop',
      href: 'mailto:?subject=AI%20101%20Carousel%20Creator%20setup&body=https%3A%2F%2Fwww.amplifiedimpact.io%2Fai101%23carousel-creator',
    },
    layers: {
      columns: ['Layer', 'Where it lives', 'What goes in'],
      rows: [
        [
          '1. The brand',
          // Built from a chat and kept in Settings > Design systems, where every chat can use it (D-032).
          [
            'A design system in Claude Design, built once from a Claude chat and kept in your ',
            { link: 'design systems', href: 'https://claude.ai/settings/design-systems' },
          ],
          'Logo, headshot, two or three posts you love, and your brokerage name. Colors and fonts only if you have them.',
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
    // Four steps, each ending in one tap or one paste (D-032). The ids that kept their meaning kept
    // their id, so a tick saved before the change survives it.
    checklist: [
      {
        id: 'design-system',
        title: [{ strong: 'Set up your brand in Claude Design.' }],
        // Since Sept 16, 2026 Claude Design runs inside a regular Claude chat, and it builds a saved
        // design system only when asked to (Anthropic's setup article, "From a chat"). Files dropped
        // into a new design are reference for that one design. So the step brings the ask: render.ts
        // draws `brandPrompt` between `detail` and `after`. The standalone app's "Published" toggle is
        // gone from the copy: it covers only projects started at claude.ai/design (D-032).
        // Paste FIRST, then attach: a screenshot taken or attached through the clipboard would replace
        // the prompt that Copy & open just put there.
        detail: [
          `Tap Copy & open Claude below, paste the prompt into the new chat, and put in your brokerage name. Know your brand colors or fonts? Add them at the end. Don't know them? Skip it. Then attach your logo, your headshot, and screenshots of two or three posts you love, and send it.`,
        ],
        // What a saved brand looks like, and what to say when it is not there: whether the prompt
        // saves a system every time is not something the Help Center promises (D-032).
        after: [
          `Claude pulls your palette and type from what you upload. Look over what it shows you and say what to change in plain English. Then check that your brand is saved. It should be listed as My Carousel Brand. `,
          { button: 'See my design systems', href: 'https://claude.ai/settings/design-systems' },
          ` Not listed? In the same chat, say: Save this as a design system called My Carousel Brand. If Claude says it can't make designs, turn on Cloud code execution and file creation in `,
          { link: 'Settings, then Capabilities', href: 'https://claude.ai/settings/capabilities' },
          '.',
        ],
      },
      {
        id: 'about-you',
        title: [{ strong: 'Fill in About you below' }, ' and paste in your voice profile from Step 1.'],
        detail: ['Did Step 1 on your phone? The same chat is in your history on your laptop.'],
      },
      {
        id: 'create-project',
        title: [{ strong: 'Copy the instructions and make the Project.' }],
        // render.ts draws `projectOpen` at the start of this detail.
        detail: [
          ' Click New project (top right), name it Carousel Creator, and click Create project. Then open Instructions on the right side of the Project and paste.',
        ],
      },
      // render.ts draws `starters` under this one.
      { id: 'first-idea', title: [{ strong: 'Start a new chat in the Project and send one idea.' }] },
    ] satisfies ChecklistItem[],
    // Checklist item 1's ask. Anthropic publishes no prompt for building a design system from a chat,
    // so this one is ours, from its setup article's inputs and tips (D-032).
    brandPrompt: {
      id: 'brand_system',
      label: 'Brand prompt',
      text: `Build a reusable design system for my real estate brand from the files I attached: my logo, my headshot, and screenshots of posts I like.

If I list brand colors or fonts at the end of this message, use them exactly. Otherwise, pull my colors and fonts from these files, and if they don't show clear colors or fonts, pick a simple palette and font pairing that fits my logo and the look of those posts. Save my logo and headshot as brand assets and use them exactly as they are.

Set it up for Instagram carousels at 4:5 (1080 x 1350) and LinkedIn PDF carousels. My brokerage is [brokerage name]. Every design must show it clearly, as real estate advertising rules require.

Name it My Carousel Brand. Then show me the colors, fonts, and one sample slide.`,
    } satisfies Prompt,
    brandPromptOpen: [{ label: 'Copy & open Claude', app: 'Claude', href: 'https://claude.ai/new' }] satisfies CopyOpen[],
    projectOpen: {
      label: 'Copy & open Claude Projects',
      app: 'Claude Projects',
      href: 'https://claude.ai/projects',
    } satisfies CopyOpen,
    // Under checklist item 4. Tap one to copy it, then paste it into the Project's chat.
    starters: [
      'A buyer asked if they should wait for rates to drop.',
      `Here's a market stat I want to explain:`,
      'A lesson from my week:',
      'My take on this industry news:',
    ],
    startersHint: 'Tap one to copy it, paste it into the Project chat, and finish the thought.',
    // Directly above the instructions. Every field is optional; what is typed is written into the
    // instructions' last line, live, so what a visitor sees is what they copy.
    aboutYou: {
      heading: 'About you',
      // Says what the panel does: Connor asked what it was for, so a visitor would too (2026-10-07).
      intro: 'What you type here fills in the instructions below, ready to copy. It stays on this device. All fields are optional.',
      fields: [
        { name: 'niche', label: 'Your niche', kind: 'text', placeholder: 'e.g., first-time buyers, relocation, luxury' },
        {
          name: 'neighborhoods',
          label: 'Neighborhoods you know best',
          kind: 'text',
          placeholder: 'e.g., the three or four areas you sell most',
        },
        {
          name: 'questions',
          label: 'Questions clients ask you most',
          kind: 'textarea',
          rows: 3,
          placeholder: 'One per line',
        },
        { name: 'brokerage', label: 'Brokerage name, exactly as it must appear in ads', kind: 'text' },
        {
          name: 'voice',
          label: 'Your voice profile from Step 1',
          kind: 'textarea',
          rows: 6,
          placeholder: 'Paste the profile that starts with "Write as me."',
        },
      ],
      clear: 'Clear',
    },
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
    // A real file for Apple and Outlook, served as text/calendar by the API (D-032), and one
    // recurring Google event, whose link cannot change the title week to week.
    calendar: {
      lead: 'Add the sprint to your calendar:',
      apple: { label: 'Apple or Outlook', href: '/ai101/carousel-sprint.ics' },
      google: {
        label: 'Google Calendar',
        href: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Carousel%20Creator%3A%20weekly%20approval%20block&dates=20261012T090000/20261012T093000&recur=RRULE%3AFREQ%3DWEEKLY%3BCOUNT%3D4&details=Week%201%20Market%2C%20Week%202%20Method%2C%20Week%203%20Me%2C%20Week%204%20Market.%20Open%20your%20Carousel%20Creator%20Project%20at%20https%3A%2F%2Fclaude.ai%2Fprojects%20and%20send%20one%20idea%20from%20this%20week%27s%20pillar.%20Track%20conversations%20started%2C%20not%20likes.',
      },
    },
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
  /** Announced through the polite live region after any copy. */
  copiedAnnouncement: 'Copied to clipboard.',
  /** The two-tap fallback's armed label: the first tap copied, the second opens. */
  copiedThenOpen: (app: string) => `Copied. Open ${app}`,
  /** When neither the Clipboard API nor execCommand works: the text is selected instead. */
  copyFailedAnnouncement: (label: string) => `${label} is selected. Copy it from your device's menu.`,
  /** `navigator.share`'s payload for "Send this to my laptop". */
  share: {
    title: 'AI 101 for Agents: Carousel Creator setup',
    url: 'https://www.amplifiedimpact.io/ai101#carousel-creator',
  },
  /**
   * How "About you" is written into the Carousel Creator instructions' last line. Each `[bracket]`
   * stays until its field has a value; the original line stays untouched until any of the first
   * four fields has one.
   */
  aboutYou: {
    aboutMe: 'About me:',
    lines: {
      niche: '- Niche: ',
      neighborhoods: '- Neighborhoods: ',
      questions: '- Questions clients ask me most: ',
      brokerage: 'My brokerage: ',
    },
    placeholders: {
      niche: '[your niche]',
      neighborhoods: '[your neighborhoods]',
      questions: '[top client questions]',
      brokerage: '[brokerage name]',
    },
    questionJoin: '; ',
    voiceHeading: 'My voice profile:',
  },
  errors: {
    firstName: 'Enter your first name.',
    // The sign-in screen's wording, so the product says this one thing one way.
    email: 'Enter a valid email address.',
    generic: 'Something went wrong. Try again.',
  },
} as const;
