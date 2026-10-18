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
// plain. A bracketed span that is part of the prompt's own wording ("[VERIFY]") is listed in that
// prompt's `literal` and drawn as plain text.

export interface Prompt {
  /** The analytics name from the spec, and the DOM id stem. */
  id: 'voice_profile' | 'voice_interview' | 'carousel_creator' | 'brand_system';
  label: string;
  text: string;
  /** Bracketed spans that are the prompt's own words, not blanks to fill: drawn as plain text. */
  literal?: readonly string[];
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
  /** The header's stage label: "Part I · Voice Profile". */
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
- Build the slides in Claude Design with my design system, My Carousel Brand, for colors, fonts, logo, and headshot. If you can't use it in this chat, tell me before you design anything

Show me the slide copy for approval before you design anything. Flag anything about neighborhoods, schools, or who a place is right for, since that can raise fair housing concerns. Never invent a stat, a quote, or a client story.

About me:
- Niche: [your niche]
- Neighborhoods: [neighborhoods]
- Questions clients ask me most: [top client questions]
My brokerage: [brokerage name]

My voice profile:
[paste the profile that starts with "Write as me."]`;

/**
 * The sender the waitlist's consent names: Amplified Impact, LLC alone (Connor, 2026-10-17, D-041; it
 * named Spring B, Spring and Connor too before). One string, so it never drifts.
 */
const SENDERS = 'Amplified Impact, LLC';

export const PAGE = {
  meta: {
    title: 'AI 101 for Agents · Amplified Impact',
    description: 'The prompts and setup from the session with Spring and Connor.',
    url: 'https://learn.amplifiedimpact.io/ai101',
    siteName: 'Amplified Impact',
  },

  /** The step-through's screens, in order. Each anchor is the id of that screen's <section>. */
  screens: [
    // The two halves are Part I and Part II; the screens inside each are its steps, "1 of 4" (Connor,
    // 2026-10-08, D-037).
    { anchor: 'welcome', stage: 'Welcome', next: 'Start Part I' },
    { anchor: 'voice-profile', stage: 'Part I · Voice Profile', count: '1 of 4', next: "I'm Ready" },
    { anchor: 'voice-profile-copy', stage: 'Part I · Voice Profile', count: '2 of 4', next: 'I Have My Profile' },
    { anchor: 'voice-profile-save', stage: 'Part I · Voice Profile', count: '3 of 4', next: 'Saved It' },
    { anchor: 'voice-profile-test', stage: 'Part I · Voice Profile', count: '4 of 4', next: 'Start Part II' },
    { anchor: 'carousel-creator', stage: 'Part II · Carousel Creator', count: '1 of 5', next: "I'm on My Laptop" },
    // The design's "Brand Is Published": the brand is now built from a chat and saved, not published
    // (D-032's research; Connor chose the corrected flow on 2026-10-08). The id is the old checklist's,
    // whose first item this screen is, so a link to it still lands somewhere that makes sense.
    {
      anchor: 'carousel-creator-checklist',
      stage: 'Part II · Carousel Creator',
      count: '2 of 5',
      next: 'My Brand Is Saved',
    },
    { anchor: 'carousel-creator-about', stage: 'Part II · Carousel Creator', count: '3 of 5', next: 'Next' },
    {
      anchor: 'carousel-creator-project',
      stage: 'Part II · Carousel Creator',
      count: '4 of 5',
      next: 'Project Is Made',
    },
    {
      anchor: 'carousel-creator-first-idea',
      stage: 'Part II · Carousel Creator',
      count: '5 of 5',
      next: 'How a Week Works',
    },
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
    // Sign in first, and only then "don't have it?" (Spring's notes, 2026-10-18, D-043). The Open
    // buttons are the web apps, which a phone with the app installed may open in the app instead.
    getApp: {
      heading: 'First: sign in to ChatGPT or Claude',
      body: 'Either one works. Phone or laptop. Free.',
      open: [
        { label: 'Open ChatGPT', href: 'https://chatgpt.com/' },
        { label: 'Open Claude', href: 'https://claude.ai/' },
      ] satisfies LinkButton[],
      download: "Don't have the app yet?",
      // Each `web` href is the desktop and no-JavaScript default: the web app itself, as the design
      // has it, so a laptop on hotel Wi-Fi signs in in the browser instead of downloading an app
      // (Connor, 2026-10-08, D-037). `main.ts` swaps in the platform's store link on iPhone, iPad and
      // Android (D-032), where "get the app" means the app.
      apps: [
        {
          label: 'Get ChatGPT',
          href: {
            web: 'https://chatgpt.com/',
            ios: 'https://apps.apple.com/app/chatgpt/id6448311069',
            android: 'https://play.google.com/store/apps/details?id=com.openai.chatgpt',
          },
        },
        {
          label: 'Get Claude',
          href: {
            web: 'https://claude.ai/',
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
    // A real link to Part II's first screen, so it works without JavaScript too.
    skip: { label: 'Already have a voice profile? Skip to Part II', href: '#carousel-creator' },
  },

  // Step 1 is a choice (Spring's notes, 2026-10-18, D-043): samples you already have, or an interview
  // for the many agents who have none. The choice is remembered and picks step 2's prompt.
  samples: {
    heading: 'Pick how it learns your voice',
    intro: 'Have things you wrote or said? Use them. No samples? Do the interview instead.',
    pickLabel: 'How it learns your voice',
    samples: {
      tab: 'I Have Samples',
      title: 'Collect 10 to 15 samples of you',
      intro: 'Things you actually wrote or said. Put them in a note on your phone for now.',
      items: [
        'Captions you wrote yourself',
        'Emails and texts to clients',
        'Meeting transcripts from Zoom, Granola, Fathom or Otter',
        'Voice memos, or a transcript of you talking about your market',
      ],
      tip: 'From a meeting transcript, copy only the parts where you are the one talking.',
    },
    interview: {
      tab: 'Interview Me',
      title: 'Let it interview you',
      intro:
        "It asks one question at a time about your story, who you serve, how you talk, and what's off limits. About 30 minutes.",
      items: [
        "Five things you've already written: texts to clients, emails, or captions. Real ones, not your best ones.",
        'A two minute voice memo answering the question customers ask you most, like you would on the phone. No transcript? Answer it with the mic in the chat.',
      ],
      tip: 'Talk your answers out loud with the mic. You sound more like you when you talk than when you type.',
    },
  },

  // Step 2: the prompt for the path picked on step 1, each in its own panel.
  voiceCopy: {
    heading: 'Copy your prompt',
    samples: {
      tab: 'I Have Samples',
      lead: 'Fill in two blanks, then copy.',
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
      // The design's "Replace the last line with your samples" no longer fits: the prompt now ends with
      // ABOUT ME lines, and the samples go under them (D-036).
      then: [
        ['Paste.'],
        ['Finish the ABOUT ME lines at the bottom.'],
        ['Paste your samples under them, then send.'],
      ] as Inline[][],
      showPrompt: 'See the full prompt',
      note: `It already bans lines like "In today's market," "Let's dive in," and "game-changer." Add any others you're tired of.`,
    },
    interview: {
      tab: 'Interview Me',
      lead: 'Copy it, then answer one question at a time.',
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
      then: [
        ['Paste it and send.'],
        ['Answer each question out loud. Tap the mic and talk.'],
        ['When it asks, paste your five written pieces and your voice memo.'],
        ['At the end it writes your Voice Profile.'],
      ] as Inline[][],
      showPrompt: 'See the full prompt',
    },
  },

  // Connor's prompt (2026-10-08, D-036), word for word: a forensic-linguist profile with a QUICK CARD
  // short enough for ChatGPT's Custom instructions, and ABOUT ME lines at the end that the two fields
  // on this screen fill (`UI.lineSlots`). Its two [VERIFY] brackets are instructions to the AI, not
  // blanks for the visitor, so they are drawn as plain text (`literal`).
  voicePrompt: {
    id: 'voice_profile',
    label: 'Voice profile prompt',
    text: `I run a small business, and I want a voice profile: instructions that make AI write the way I actually write. Build it from my samples at the bottom, working like a forensic linguist. Every rule needs evidence from my samples. Sounding like me matters more than sounding polished.

If I haven't pasted any samples or spoken answers below yet, don't build anything. Reply "Ready, send your samples" and wait. Otherwise, don't ask me anything first. Build the whole thing from what's here, mark what you can't tell, and save your questions for the end. If you run out of room, stop at the end of a section and tell me to type "continue."

STEP 1. SORT THE SAMPLES
Number them S1, S2, S3 and so on, in the order I pasted them. Set aside anything that isn't really my voice:
- anything I said someone else wrote or edited
- company, franchise, or vendor boilerplate, and product or listing descriptions
- anything that reads like a template or AI: lines that could describe anyone where my other samples give a specific detail, tidy lists of three, smooth sentences with no rough edges, round or dramatic numbers, lines that belong on a mug, telling the reader what to feel, stock hooks like a real estate agent's "Thinking of buying or selling?"
If only a line or two of a sample is off, keep the sample and ignore those lines. A phrase showing up in my samples doesn't make it mine if someone else wrote it.
VOICE samples (voice memos, video transcripts) show how I talk. Learn words, rhythm, beliefs, and stories from them. Don't learn punctuation or paragraphs from them, because the app chose those, and don't treat a misheard word as my vocabulary unless it repeats.

STEP 2. FIND THE PATTERNS
Patterns, not adjectives. "Warm and approachable" is useless. "Opens with what a client said, in quotes, then answers in one line" is useful. For every rule, quote a few words from my samples, cite the samples (S2, S7), and rate it:
STRONG: in most samples. Always follow it.
MEDIUM: in at least three. Follow it by default.
LOW: once or twice. Optional, never stated as a rule.
If my samples contradict each other, don't average them and don't pick one. List the conflict under GAPS.

STEP 3. WRITE THE PROFILE
Plain text, short headings in capitals, no tables, so it pastes anywhere. Keep it to about 1,200 words, not counting the reference samples. Put it between a line reading ===== START OF PROFILE ===== and a line reading ===== END OF PROFILE =====. Where a section has no evidence, write NOT ENOUGH SAMPLES instead of guessing. Sections, in this order:

QUICK CARD
Under 1,500 characters. It has to work alone, because I'll paste it into tools with short instruction boxes. Start it with "Write as me." and one line on who I am. Then my 8 strongest rules, the top of the never list, and the facts rule.

BUILT FROM
One line: how many samples of each kind, and how many you set aside.

NEVER LIST
This outranks everything else in the profile.
Always banned, even if they show up in my samples: "In today's market," "Let's dive in," "game-changer," my industry's stock hooks (for a real estate agent, "Thinking of buying or selling?"), and every phrase I said I can't stand.
Banned unless my own writing clearly uses them: don't miss out, hidden gem, navigate, unlock, elevate, seamless, landscape, buckle up, let that sink in, at the end of the day, thrilled to announce, hope this finds you well, don't hesitate to reach out, and my industry's cliches (for a real estate agent: dream home, nestled, boasts, won't last long, your real estate journey, "whether you're a first-time buyer or a seasoned investor").
Banned constructions, unless my samples use them:
- balanced contrasts like "It's not X, it's Y." If both halves are about the same length, or the line would work as a slide title, rewrite it.
- setups that delay the point: "Here's the thing," "The best part?" "The result?" If the next sentence builds suspense instead of delivering, cut the setup.
- opening with a question ("Did you know...?")
- tidy lists of three, or three short commands in a row
- lines that sound like a quote on a graphic
- explaining what a story means right after telling it
- drumbeat fragments ("Period." "Every. Single. Time.")
- em dashes, semicolons, bold words, emoji bullets, hashtag walls
- ending on a moral, a summary, or a question just to get comments
SWAPS: words AI would reach for on my topics, each next to what I say instead (house or home, clients or buyers, y'all or you guys, $450K or $450,000).
MINE, KEEP: words that look generic but really are mine, and how often they show up.

HOW I SOUND
Ratings, short quotes, and sample numbers for each:
- sentences: length, how I mix long and short, fragments, how my paragraphs change as a post goes on
- lists: how many items I usually use
- phrases and habits I repeat, each with a cap per piece so drafts don't turn me into a caricature
- numbers and money: exact or rounded, numerals or words
- openers and closers, quoted exactly
- typography: capitals, punctuation, exclamation points, line breaks, emoji (which, where, how many), hashtags
- moves: how I explain, tell a story, give an opinion, handle an objection, deliver bad news, use humor, and earn credibility without bragging

CHANNELS
One block per channel I gave you samples for: how I open, length in words, paragraph style, emoji, sign-off, how I ask for a reply, and how strong the evidence is. If I sound different in two channels, keep them different.
A channel with no samples gets: NO SAMPLES. Ask me for one before writing here.
If there are VOICE samples, add TALKING VS. TYPING: what carries from how I talk into how I write, what stays spoken-only (fine for video scripts, wrong for anything I type), and roughly how much shorter my written version of a point is.

WHAT I BELIEVE
The opinions I actually state, numbered, each with a quote and a rating. Every opinion in a draft has to trace to one of these. Don't stretch any of them into a bigger claim than I made.

MY STORIES AND NUMBERS
The stories, client situations, and figures I mention, as I told them, with client details stripped. Drafts can reuse these. Nothing else counts as a story I've told.

RULES FOR EVERY DRAFT
Copy these into the profile word for word:
- A line that's correct but doesn't sound like me is wrong. Keep my quirks. Don't copy obvious typos.
- Never invent anything I could be quoted on: a price, rate, date, stat, quote, review, or client story. Write [VERIFY: what's needed] and list each one under the draft. Never inflate a result.
- Don't give me opinions I haven't given you. If a post needs a new take, ask me for it.
- Never use a client's story or details unless I tell you they said yes.
- Flag any line my industry's rules cover, so I can check it (for a real estate agent, anything about neighborhoods, schools, safety, or who a place is right for, under fair housing). Keep the source on any stat I give you.
- For anything bigger than one post, like a series or an email sequence, ask your questions in one batch first, then write one piece for my approval before the rest.
- My edits beat this profile. After I edit a draft, tell me in one line what rule my edit suggests, so I can add it here.

SELF-CHECK BEFORE SHOWING ANY DRAFT
Copy these into the profile word for word:
1. Anything from the never list, including a balanced "It's not X, it's Y"?
2. A line that could sit on a graphic next to anyone's face?
3. A story explained after it's told, or the reader told what to feel?
4. A tidy list of three, or a habit past its cap?
5. Anything invented: a fact, number, story, or opinion?
6. Would this read the same over a competitor's name?
Two or more yeses: rewrite from scratch instead of patching. Then match length, opener, sign-off, and emoji to the channel. Show me the draft, then any [VERIFY] items and fair housing flags, and skip the commentary.

REFERENCE SAMPLES
My BEST samples word for word, each labeled with its channel. If I didn't mark any, use the 3 most typical. Leave out client names, phone numbers, and addresses.

STEP 4. AFTER THE END LINE
Outside the profile, give me:
SET ASIDE: each sample or line you didn't learn from, and why, one line each.
GAPS: the 3 things you're least sure of, any conflicts between samples, and which samples would settle each.
QUESTIONS: up to 3, most useful first.

ABOUT ME
My name, as I sign it:
What I do:
My market, and what I'm known for:
My clients are mostly:
Where I post or write most:
Who else writes under my name (an assistant, my team, my brokerage or company, a marketing company, AI), or nobody:
Phrases I can't stand:`,
    literal: ["[VERIFY: what's needed]", '[VERIFY]'],
  } satisfies Prompt,

  // Spring's Voice Builder (2026-10-18, D-043): the interview for agents with no samples. Her questions,
  // part names and the lines under them, and her profile's sections, word for word, from her
  // "Voice Builder" document. Ours, so it runs in a chat and fits step 3: the interview's rules (one
  // question at a time, the mic, a follow-up), the mic as a stand-in for the voice memo's transcript,
  // "use only what I gave you", the START and END lines, and a QUICK CARD for ChatGPT's 1,500
  // characters, first, starting "Write as me." as the other profile does.
  interviewPrompt: {
    id: 'voice_interview',
    label: 'Voice interview prompt',
    text: `You're my Voice Builder. I run a small business, and I want a voice profile: instructions that make AI write the way I actually talk. Build it by interviewing me.

HOW TO RUN THE INTERVIEW
Ask me the questions below one at a time, in order, in the words they're written in. Wait for my answer before you ask the next one.
At the start, tell me once to talk my answers out loud with the mic if I can, because I sound more like me when I talk than when I type.
Start each part by telling me its name and the line under it.
If an answer is thin, ask one short follow-up, then move on.
Don't write anything else until all four parts are done.

PART 1: YOUR STORY
People hire people they feel they know. Your story is what makes a stranger feel like they know you.
1. Why did you get into your line of work? Tell the real reason, not the polished one.
2. What did you do before this, and what did it teach you that helps your clients now?
3. Tell me about a moment in your life that changed how you see your work. (For a real estate agent, how they see home.)
4. What's a hard thing you've walked through that your clients might be walking through too?
5. Who are the people you're doing this for?
6. What do you love about where you live? Name real places, like a park, a taco spot, or a trail.
7. What do you do when you're not working?
8. Tell me about the client story you're proudest of. What happened, and why did it matter?

PART 2: WHO YOU SERVE
You can't talk to everyone. The businesses that win pick a person and talk to them every day.
9. Think of your three favorite clients. What do they have in common?
10. What stage of life or business are the people you love working with? (For a real estate agent: first home, growing family, moving up, downsizing, or investing.)
11. What do you know better than anyone? Name the places, specialties, or kinds of customers. (A real estate agent might name cities, neighborhoods, or zip codes.)
12. What keeps your ideal client up at night about the problem you solve? (For a real estate agent, buying or selling.)
13. What do they want that they're scared to say out loud?
14. What do people always thank you for when the work is done? (For a real estate agent, at closing.)
15. What's the one thing you want to be known for in your market?

PART 3: HOW YOU TALK
This is the part that makes it sound like you. Don't skip the samples. They teach the AI more than any answer you give.
First, ask me for these two samples:
16. Five things you've already written. Texts to clients, emails, or captions you liked. Real ones, not your best ones.
17. A two minute voice memo. Pretend a customer just asked you the question you hear most. (A real estate agent might get "Is now a good time to buy?") Answer like you would on the phone, then paste in the transcript.
If I don't have a transcript, I can answer question 17 right here with the mic instead.
Then ask:
18. How would your best friend describe the way you talk?
19. Are you more funny, calm, direct, warm, or high energy? Pick two.
20. What words or sayings do you use all the time?
21. Do you use emojis? Which ones feel like you?
22. When you post, do you want people to feel inspired, informed, entertained, or cared for?

PART 4: YOUR BOUNDARIES
Knowing what isn't you matters just as much as knowing what is.
23. What words or phrases make you cringe when others in your industry use them?
24. What kind of content about your work do you never want to post?
25. What parts of your life are off limits online? Think kids, faith, health, money, or past relationships.
26. Are there topics you want to stay out of, like politics or market predictions?
27. Is there anything about how people in your industry market that you think is fake?

WHEN THE INTERVIEW IS DONE
Write my Voice Profile: one page that tells any AI tool exactly how to sound like me. Use only what I told you and pasted. Never invent a story, a client, a number, or an opinion. Learn my words, rhythm, and beliefs from everything I gave you, but learn punctuation and emoji only from what I typed or pasted, not from what I said out loud.
Plain text, short headings in capitals, no tables, so it pastes anywhere. Put it between a line reading ===== START OF PROFILE ===== and a line reading ===== END OF PROFILE =====. Sections, in this order:

QUICK CARD
Under 1,500 characters, because I'll paste it into tools with short instruction boxes. Start it with "Write as me." Then my one line, how I sound, the words I use, the words I never use, and what's off limits.

MY ONE LINE
Who I help, where, and how, in one sentence.

MY STORY
My why in three short sentences.

WHO I SERVE
My ideal client, their stage of life or business, and my areas or specialties.

WHAT THEY NEED
Their biggest worry and what they really want.

MY THREE CONTENT PILLARS
The three topics I'll post about every week.

HOW I SOUND
My two tone words, plus how long my sentences run.

WORDS I USE
Sayings and phrases that are mine.

WORDS I NEVER USE
Phrases that aren't me.

OFF LIMITS
Topics and parts of my life I keep private.

SAMPLE POST
A short caption written in my voice.

SAMPLE EMAIL
A short email opener to people I know, in my voice.

SAMPLE TEXT
A check in text to a past client in my voice.`,
  } satisfies Prompt,

  save: {
    heading: 'Save your profile so the AI remembers it',
    // The answer now carries notes after the profile (set aside, gaps, questions) that are not for
    // saving, so the screen says where the profile starts and stops (D-036).
    intro:
      'Copy your profile from the answer: everything between the START OF PROFILE and END OF PROFILE lines. Then pick the app you used.',
    pickLabel: 'The app you used',
    claude: {
      tab: 'Claude',
      // Claude's New project box asks for a name and a description first, and the description is where
      // a profile pasted too early lands. So: name it, skip the description, then Instructions (D-037).
      steps: [
        ['Open Claude Projects.'],
        ['Click ', { strong: 'New project' }, ', top right. Name it ', { strong: 'My Voice' }, '.'],
        ['Leave the description blank and click ', { strong: 'Create project' }, '.'],
        ['Paste your profile into ', { strong: 'Instructions' }, ' on the right side, not the description.'],
      ] as Inline[][],
      button: { label: 'Open Claude Projects', href: 'https://claude.ai/projects' },
      note: 'Works on free or paid Claude.',
    },
    chatgpt: {
      tab: 'ChatGPT',
      steps: [
        ['Open ChatGPT settings.'],
        ['Paste the ', { strong: 'QUICK CARD' }, ' from your profile into ', { strong: 'Custom instructions' }, '.'],
      ] as Inline[][],
      // Connor's deep link (2026-10-07): it lands on Custom instructions itself. The design's
      // `#settings/Personalization` stops one screen short.
      button: {
        label: 'Open ChatGPT Settings',
        href: 'https://chatgpt.com/settings/personalization?instructions=chatgpt',
      },
      // The full profile runs well past Custom instructions' limit; the prompt writes the QUICK CARD
      // to fit under it (D-036).
      note: 'Custom instructions hold about 1,500 characters, and the QUICK CARD is written to fit. For the full profile, use a Claude Project.',
    },
  },

  test: {
    heading: 'Test it',
    intro:
      'Ask for the same post about a client question twice: once in a plain chat, once with your profile. Put them side by side.',
    before: { label: 'Before', text: 'Generic AI' },
    after: { label: 'After', text: 'Sounds like you' },
    done: "Part I done. That's all you need in the room today.",
    phone: {
      heading: 'On your phone?',
      body: 'Part II needs a laptop and Claude Pro or higher. Email yourself this page and finish tonight.',
      // A phone-to-laptop handoff that lands on Part II. `href` is the no-JavaScript fallback;
      // `main.ts` uses the share sheet where there is one (D-032).
      button: {
        label: 'Send This to My Laptop',
        href: 'mailto:?subject=AI%20101%20for%20Agents%3A%20Part%20II%20(do%20this%20on%20your%20laptop)&body=Open%20this%20on%20your%20laptop%3A%0Ahttps%3A%2F%2Fwww.amplifiedimpact.io%2Fai101%23carousel-creator',
      },
    },
  },

  step2: {
    heading: 'Build your Carousel Creator',
    intro:
      'An AI employee is three layers: a brain, a brand, and a job. Build the first two once, and every carousel after that starts with one message.',
    layers: [
      { title: '1. The brand', body: 'Your logo, headshot, colors and fonts, set up once in Claude Design.' },
      {
        title: '2. The brain',
        body: 'A Claude Project called Carousel Creator with your voice profile and instructions.',
      },
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
        label: 'Your voice profile from Part I',
        hint: 'Everything between the START OF PROFILE and END OF PROFILE lines. Did Part I on your phone? The same chat is in your history on your laptop.',
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
      [
        'Name it ',
        { strong: 'Carousel Creator' },
        '. Leave the description blank and click ',
        { strong: 'Create project' },
        '.',
      ],
      ['Open ', { strong: 'Instructions' }, ' on the right side and paste there, not in the description.'],
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
    done: 'Part II done. Your Carousel Creator is built.',
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
    title: 'AI 101 for Agents: Part II (do this on your laptop)',
    url: 'https://www.amplifiedimpact.io/ai101#carousel-creator',
  },
  /**
   * Which saved field fills which [placeholder], per prompt. A field left empty keeps its
   * placeholder; what a visitor TYPES is never a placeholder, so a bracket they type stays text.
   * `questions` is one per line, written as a list under its label.
   */
  slots: {
    // None: the voice profile prompt's blanks are ABOUT ME lines (`lineSlots`), not brackets.
    voice_profile: {},
    voice_interview: {},
    carousel_creator: {
      '[your niche]': 'niche',
      '[neighborhoods]': 'hoods',
      '[top client questions]': 'questions',
      '[brokerage name]': 'brokerage',
      '[paste the profile that starts with "Write as me."]': 'profile',
    },
    brand_system: { '[brokerage name]': 'brokerage' },
  } as Record<string, Record<string, 'market' | 'clients' | 'niche' | 'hoods' | 'questions' | 'brokerage' | 'profile'>>,
  /**
   * Lines that end in a colon and are filled by appending the field's value after it, per prompt: the
   * voice profile prompt's ABOUT ME lines. An empty field leaves the line as written.
   */
  lineSlots: {
    voice_profile: { "My market, and what I'm known for:": 'market', 'My clients are mostly:': 'clients' },
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
