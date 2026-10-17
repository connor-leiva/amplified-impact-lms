// Every word on /voice-profile: the AI 101 workshop's voice profile setup on its own, as a free lead
// magnet Spring posts, gated on an email opt-in. DECISIONS.md D-040.
//
// It is /ai101's Part I with the Carousel Creator taken out. The steps themselves (the samples, the
// prompt and its two blanks, saving it, testing it) are /ai101's own content, imported, not copied,
// so the prompt and the instructions can never drift between the two pages. What is this page's own
// is below: its welcome, the gate, the "Get the app" screen as a step of its own, and the last screen,
// without Part II's laptop handoff.
//
// House rules, as on /ai101: no em dashes, short plain sentences.

import { PAGE as AI101, type Inline, type Screen } from '../ai101/content';

/**
 * Who the opt-in agrees to hear from: Amplified Impact, LLC, as on every sign-up (D-041), though Spring
 * posts this one. `CONSENT.guides` in `src/legal/content.ts` quotes the line built from this, and a
 * test holds the two equal.
 */
export const VOICE_SENDERS = 'Amplified Impact, LLC';

export const VOICE = {
  slug: 'voice-profile',

  meta: {
    title: 'Sounds Like You: Your AI Voice Profile · Amplified Impact',
    description:
      'Teach ChatGPT or Claude to write the way you actually write. The voice profile setup from AI 101 for Agents, free, one screen at a time.',
    url: 'https://www.amplifiedimpact.io/voice-profile',
    siteName: 'Amplified Impact',
  },

  /** Where the visitor's place and fields are kept, apart from /ai101's. */
  stateKey: 'voice-profile-v1',
  /** Where this device's opt-in is remembered. */
  unlockKey: 'vp-unlocked',

  screens: [
    { anchor: 'welcome', stage: 'Welcome', next: 'Start' },
    { anchor: 'get-the-app', stage: 'Before You Start', next: "I'm Signed In" },
    { anchor: 'voice-profile', stage: 'Voice Profile', count: '1 of 4', next: 'I Have My Samples' },
    { anchor: 'voice-profile-copy', stage: 'Voice Profile', count: '2 of 4', next: 'I Have My Profile' },
    { anchor: 'voice-profile-save', stage: 'Voice Profile', count: '3 of 4', next: 'Saved It' },
    // The last screen: no Next, so the footer shows Start Over.
    { anchor: 'voice-profile-test', stage: 'Voice Profile', count: '4 of 4' },
  ] satisfies Screen[],

  nav: AI101.nav,

  welcome: {
    logoAlt: 'Amplified Impact',
    eyebrow: 'Free Guide · AI 101 for Agents',
    title: 'Sounds Like You',
    intro:
      'Teach ChatGPT or Claude your voice once, and every post, email and caption it drafts starts out sounding like you. One step at a time, on your phone or laptop. Free.',
  },

  /** The opt-in, on the welcome screen. Every screen after it opens once the visitor signs up. */
  gate: {
    heading: 'Get the free setup',
    body: 'Tell us where to send updates, and the steps are yours.',
    fields: { firstName: 'First name', email: 'Email' },
    button: 'Get the Setup',
    // Submitting is the opt-in: email consent and agreement to the Terms and Privacy Policy.
    legal: [
      'By signing up, you agree to our ',
      { link: 'Terms of Service', href: '/terms' },
      ' and ',
      { link: 'Privacy Policy', href: '/privacy' },
      ` and to emails from ${VOICE_SENDERS}. Unsubscribe anytime.`,
    ] as Inline[],
    success: "You're in. Tap Start to begin.",
    /** The id the no-JavaScript 303 lands on: the steps, which the CSS then shows with `:target`. */
    unlockedAnchor: 'unlocked',
  },

  /** /ai101's welcome card, as a screen of its own after the gate. */
  getApp: AI101.welcome.getApp,

  samples: AI101.samples,
  voiceCopy: AI101.voiceCopy,
  voicePrompt: AI101.voicePrompt,
  save: AI101.save,

  test: {
    heading: AI101.test.heading,
    intro: AI101.test.intro,
    before: AI101.test.before,
    after: AI101.test.after,
    // In place of /ai101's "Part I done. That's all you need in the room today." and its laptop
    // handoff to Part II, which this page does not have.
    done: 'Done. Your voice profile is set up.',
  },
} as const;
