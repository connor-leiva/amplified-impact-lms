// Every word on /terms and /privacy, the public legal pages behind the /ai101 waitlist and, since
// 2026-10-13, the free guides' opt-ins (/task-sync-starter, D-038; /ops-time-audit, D-039;
// /voice-profile, D-040).
//
// Drafted by an AI assistant, not a lawyer, for Connor's review; he supplied every fact the draft had
// left as a [bracketed placeholder] on 2026-10-08 (the entities, names, contact, address, governing
// law and the liability cap) and asked for recommended retention periods, which became the standard
// below. A lawyer's read is still recommended. `DRAFT` turns the "Draft for review" notice and the
// `noindex` back on, and `render.test.ts` refuses to turn it off while any placeholder is left.
//
// THIS IS THE ONLY FILE TO EDIT WHEN THE WORDS CHANGE. `render.ts` turns it into HTML at build
// time. Nothing here is markup: copy is structured (`Inline`, `Block`) so that a `<` typed into this
// file always reaches the page as a `<`, never as a tag.
//
// House rules for the copy: no em dashes, short plain sentences.
//
// When the words change in a way a reader would care about, change `LEGAL_VERSION` and `EFFECTIVE`
// too. The waitlist can record the version a visitor agreed to.

/** The version string shown on both pages. A date, so a record of "agreed to 2026-10-08" reads. */
export const LEGAL_VERSION = '2026-10-17';

/** When these words take effect, as a machine date and as the page shows it. */
export const EFFECTIVE = { iso: '2026-10-17', label: 'October 17, 2026' } as const;

/**
 * True until a person has reviewed the pages and filled every placeholder. While true, both pages
 * say they are a draft and ask search engines not to index them.
 */
export const DRAFT: boolean = false;

/**
 * Who sends the emails and texts, exactly as every sign-up names it: the waitlist, its SMS box and
 * every free guide (D-041). Amplified Impact, LLC alone; until 2026-10-17 the waitlist named Spring B
 * and its affiliated companies, Spring and Connor too, and the PDF guides Amplified Impact and Connor.
 * The pages hold their own copies (`src/ai101`, `src/guides`, `src/voice`), and tests hold them equal.
 */
export const SENDERS = 'Amplified Impact, LLC';

/** Every free guide, as these pages name them. */
const GUIDE_NAMES =
  'the Task Sync Starter Kit at /task-sync-starter, The Ops Time Audit at /ops-time-audit, and the AI Voice Profile Setup at /voice-profile';

/**
 * Who a mobile number is shared with, said ONCE so the Terms and the Privacy Policy cannot disagree
 * (they did, in the first draft: "anyone" on one page, "any other third party or affiliate" on the
 * other). One sender since D-041, which settles D-035's question of one campaign for several.
 */
export const SMS_SHARING = `Your consent covers texts from ${SENDERS}. We use your mobile number and your consent only to send the texts you agreed to, and share them only with the service providers that deliver our texts. We never share your mobile number or your text consent with any other third party or affiliate for their own marketing.`;

/**
 * The waitlist form's consent wording, VERBATIM. Another file renders the form; these pages quote
 * it so a reader can see exactly what they agreed to. If the form's wording changes, change it here
 * in the same commit. `render.test.ts` holds both strings to literals typed out in the test.
 */
export const CONSENT = {
  /** The label of the optional, unchecked SMS checkbox. */
  sms:
    `Text me about the December agent track and other programs from ${SENDERS} at the number above. ` +
    `Messages may be sent using automated technology. Consent isn't required to join or to buy anything. Message frequency varies. ` +
    `Msg & data rates may apply. Reply STOP to opt out or HELP for help.`,
  /** The line under the Join button. */
  join:
    `By joining, you agree to our Terms of Service and Privacy Policy and to emails about the December ` +
    `agent track and other programs from ${SENDERS}. Unsubscribe anytime.`,
  /** The line under every free guide's button (D-038, D-039, D-040). Those pages have no SMS box. */
  guides: `By signing up, you agree to our Terms of Service and Privacy Policy and to emails from ${SENDERS}. Unsubscribe anytime.`,
} as const;

/** The SMS program's name, as carriers see it registered. */
export const SMS_PROGRAM = 'Amplified Impact updates';

// --- The facts ------------------------------------------------------------------------------------
// One constant per fact, so the same fact reads the same everywhere it appears. Supplied by Connor on
// 2026-10-08, except the three retention periods, which he asked to be recommended and made the
// standard: the waitlist while someone is on it and two years after the last contact; consent and
// opt-out records for five years (TCPA claims can be brought for four); logs for up to 30 days.
// Neither LLC's state of formation was given, so the entity sentences name the company only.

const P = {
  aiName: 'Amplified Impact, LLC',
  sbName: 'SB Coaching, LLC',
  contactEmail: 'admin@amplifiedimpact.io',
  privacyEmail: 'admin@amplifiedimpact.io',
  address: '1173 N Shepard Crk Pkwy Ste A, Farmington, UT 84025',
  lawState: 'the State of Utah',
  venue: 'the state courts in Davis County, Utah, or the federal court for the District of Utah',
  liabilityCap: 'one hundred dollars ($100)',
  retention: 'as long as you stay on the list and up to two years after we last hear from you',
  consentRetention: 'five years after you give or withdraw them',
  logRetention: 'up to 30 days',
} as const;

// --- Types ---------------------------------------------------------------------------------------

/**
 * A run of inline copy. A string is text; `{ strong }` is bold; `{ link, href }` is a link. Links
 * with an `href` starting `/` stay in this tab; there are no off-site links on these pages.
 */
export type Inline = string | { strong: string } | { link: string; href: string };

/** One block of a section. */
export type Block =
  /** A paragraph. */
  | { p: string | readonly Inline[] }
  /** A bulleted list; each item is one line of inline copy. */
  | { ul: readonly (string | readonly Inline[])[] }
  /** The form's own words, quoted, with a short label saying where they appear. */
  | { quote: string; label: string };

export interface Section {
  /** The section's anchor, and the stem of its heading's id. Linked to from the other page. */
  id: string;
  heading: string;
  blocks: readonly Block[];
}

export interface LegalDoc {
  /** The page's URL path, which is also how the footer marks the current page. */
  path: '/terms' | '/privacy';
  /** The <title>. */
  title: string;
  description: string;
  heading: string;
  intro: readonly Inline[];
  sections: readonly Section[];
}

/** Text shared by both pages: the header link, the table of contents, the footer, the draft note. */
export const CHROME = {
  logoLabel: 'Amplified Impact: back to the AI 101 workshop page',
  effective: 'Effective',
  version: 'Version',
  tocLabel: 'On this page',
  draft:
    'Draft for review. This page is not in effect yet. Text in [brackets] is a placeholder that still needs to be filled in.',
  footerLabel: 'Legal and site links',
  footerLinks: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'AI 101 workshop page', href: '/ai101' },
  ],
  footerContact: `Questions? Email ${P.contactEmail}.`,
} as const;

// --- Terms of Service ----------------------------------------------------------------------------

export const TERMS: LegalDoc = {
  path: '/terms',
  title: 'Terms of Service | Amplified Impact',
  description:
    'The terms for the AI 101 workshop page, the December waitlist, our free guides, and the emails and texts that follow.',
  heading: 'Terms of Service',
  intro: [
    `These terms cover the free AI 101 workshop page at /ai101, its December waitlist, our free guides (${GUIDE_NAMES}), and the emails and text messages we send to people on our lists. When you join the waitlist or get a guide, you agree to them. Our `,
    { link: 'Privacy Policy', href: '/privacy' },
    ' explains what we collect and how we use it.',
  ],
  sections: [
    {
      id: 'who-we-are',
      heading: 'Who we are',
      blocks: [
        { p: `“Amplified Impact” means ${P.aiName}.` },
        {
          p:
            `“Spring B” means ${P.sbName}. Its “affiliated companies” are the companies that ` +
            'control Spring B, are controlled by Spring B, or are under common control with it.',
        },
        {
          p:
            '“We,” “us,” and “our” mean Amplified Impact and Spring B and its affiliated companies. When we ' +
            'email or text you about our programs, these terms apply to those messages too. “You” means the ' +
            'person using our pages, joining the waitlist, or getting a guide.',
        },
      ],
    },
    {
      id: 'workshop-page',
      heading: 'The AI 101 workshop page',
      blocks: [
        {
          p: 'The page is free. It shares prompts, setup steps, and ideas from the AI 101 session for real estate agents. It is for education only.',
        },
        {
          ul: [
            'We do not promise any result. Your leads, listings, and income depend on you and your market.',
            'AI tools make mistakes. Read and check everything an AI tool writes for you before you use it, post it, or send it.',
            'You are responsible for what you publish and send. That includes following fair housing laws, real estate advertising rules, your MLS rules, your brokerage’s policies, and the laws on calls and texts, like the Telephone Consumer Protection Act (TCPA).',
            'Be careful with client information. Only put it into an AI tool if the law and your brokerage allow it.',
            'Nothing on the page is legal, tax, financial, or compliance advice.',
          ],
        },
        {
          p: 'You may use and change the prompts for your own business. Please do not sell them, or publish the page or its prompts as your own.',
        },
      ],
    },
    {
      id: 'third-party-services',
      heading: 'Third-party services',
      blocks: [
        {
          p: 'The page points you to tools we do not own or control, like ChatGPT, Claude, Canva, and the app stores. Their own terms and privacy policies apply when you use them. We are not responsible for them. Some of them charge a fee, so check their prices and terms before you sign up.',
        },
      ],
    },
    {
      id: 'waitlist',
      heading: 'The December waitlist',
      blocks: [
        {
          p: `When you join the waitlist, you agree to these terms and our Privacy Policy. You also agree to get emails about the December agent track and other programs from ${SENDERS}.`,
        },
        { quote: CONSENT.join, label: 'The words under the Join button' },
        {
          ul: [
            'Joining is free. It does not enroll you in a program or commit you to buy anything.',
            'We will share program details, dates, and prices later. We may change or cancel a program.',
            'Please use your real name and an email address that is yours.',
            'You can leave at any time. See Emails and Text messages below.',
          ],
        },
      ],
    },
    {
      id: 'free-guides',
      heading: 'Free guides',
      blocks: [
        {
          p: `Our free guides are ${GUIDE_NAMES}. When you get one, you agree to these terms and our Privacy Policy. You also agree to get emails from ${SENDERS}.`,
        },
        { quote: CONSENT.guides, label: 'The words under the button on each guide’s page' },
        {
          ul: [
            'Getting a guide is free. It does not enroll you in a program or commit you to buy anything.',
            'The guides are for education only. What these terms say about the workshop page applies to them too: we do not promise any result, AI tools make mistakes, you are responsible for what you send and publish, and nothing in them is legal, tax, financial, or compliance advice.',
            'You may use and change a guide for your own business. Please do not sell it, or publish it as your own.',
            'The guide pages have no SMS box. Getting a guide never signs you up for texts.',
            'You can stop our emails at any time. See Emails below.',
          ],
        },
      ],
    },
    {
      id: 'emails',
      heading: 'Emails',
      blocks: [
        {
          p: `Every email we send about our programs has an unsubscribe link. Use it to stop those emails at any time, or email ${P.contactEmail}.`,
        },
        {
          p: 'Unsubscribing from email does not stop texts. Replying STOP to a text does not stop emails. To stop both, do both.',
        },
      ],
    },
    {
      id: 'text-messages',
      heading: 'Text messages (SMS)',
      blocks: [
        {
          p: 'Texts are optional. You get them only if you give a mobile number and check the SMS box on the waitlist form. You do not have to agree to texts to join the waitlist or to buy anything.',
        },
        { quote: CONSENT.sms, label: 'The words next to the SMS box' },
        {
          ul: [
            [{ strong: 'Program name: ' }, `${SMS_PROGRAM}.`],
            [
              { strong: 'What we send: ' },
              `Texts about the December agent track and other programs from ${SENDERS}, like program news, session reminders, and invitations to enroll. Some are marketing. They may be sent using automated technology.`,
            ],
            [{ strong: 'How often: ' }, 'Message frequency varies.'],
            [{ strong: 'Cost: ' }, 'Msg & data rates may apply. Your mobile plan decides what you pay.'],
            [
              { strong: 'To stop: ' },
              'Reply STOP to any text. Replies like CANCEL, END, QUIT, UNSUBSCRIBE, REVOKE, or OPT OUT work too, and so does telling us another reasonable way. We may send one last text to confirm you are opted out.',
            ],
            [{ strong: 'For help: ' }, `Reply HELP to any text, or email ${P.contactEmail}.`],
            [{ strong: 'Carriers: ' }, 'Carriers are not liable for delayed or undelivered messages.'],
            [
              { strong: 'Your number: ' },
              'If you change or give up your mobile number, reply STOP first or tell us, so we do not text the next person who gets it.',
            ],
          ],
        },
        {
          p: [
            'We handle mobile numbers as our ',
            { link: 'Privacy Policy', href: '/privacy#text-messages' },
            ` says. ${SMS_SHARING}`,
          ],
        },
      ],
    },
    {
      id: 'disclaimers',
      heading: 'Disclaimers',
      blocks: [
        {
          p: 'We provide our pages, the prompts, the guides, and our messages “as is” and “as available.” To the fullest extent the law allows, we make no promises of any kind, stated or implied. That includes any promise that any of them is accurate, free of errors, always available, or right for your purpose.',
        },
      ],
    },
    {
      id: 'liability',
      heading: 'Limits on our liability',
      blocks: [
        {
          p: 'To the fullest extent the law allows, we are not liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, data, or business, that come from our pages, the prompts, the guides, the waitlist, or our messages.',
        },
        { p: `Our total liability for any claim about these things is limited to ${P.liabilityCap}.` },
        { p: 'Some places do not allow these limits. If you live in one, some of them may not apply to you.' },
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to these terms',
      blocks: [
        {
          p: 'We may update these terms. When we do, we will post the new version on this page and change the date and version at the top. If a change is significant, we will tell you by email.',
        },
        { p: 'If you stay on the list after a change takes effect, the new terms apply to you.' },
      ],
    },
    {
      id: 'governing-law',
      heading: 'Governing law',
      blocks: [
        {
          p: `The laws of ${P.lawState} govern these terms, without regard to its conflict of law rules. Any dispute goes to ${P.venue}, unless the law where you live gives you another choice.`,
        },
      ],
    },
    {
      id: 'general',
      heading: 'General',
      blocks: [
        {
          p: 'If a court finds part of these terms cannot be enforced, the rest still applies. These terms and our Privacy Policy are the whole agreement between you and us about our pages, the guides, and the waitlist.',
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contact us',
      blocks: [{ p: `Questions about these terms? Email ${P.contactEmail} or write to us at ${P.address}.` }],
    },
  ],
};

// --- Privacy Policy ------------------------------------------------------------------------------

export const PRIVACY: LegalDoc = {
  path: '/privacy',
  title: 'Privacy Policy | Amplified Impact',
  description:
    'What the AI 101 workshop page and our free guide pages collect, how we use it, who we share it with, and your choices.',
  heading: 'Privacy Policy',
  intro: [
    'This policy explains what we collect on the AI 101 workshop page at /ai101 and the pages for our free guides (/task-sync-starter, /ops-time-audit and /voice-profile), how we use it, who we share it with, and your choices. It covers those pages, the December waitlist, the guides, and the emails and texts we send to people on our lists. “We,” “us,” and “our” mean Amplified Impact and Spring B and its affiliated companies, as our ',
    { link: 'Terms of Service', href: '/terms#who-we-are' },
    ' define them.',
  ],
  sections: [
    {
      id: 'what-we-collect',
      heading: 'What we collect',
      blocks: [
        { p: 'When you join the December waitlist, we collect what you give us:' },
        {
          ul: [
            'Your first name.',
            'Your email address.',
            'Your brokerage, if you add it.',
            'Your mobile number, if you add it.',
            'If you check the SMS box, a record of your consent: the exact words shown next to the box, and the date and time you agreed.',
            'A short tag from the link you used, if it had one. For example, the QR code at the session adds one, so we know you came from there.',
            'The date and time you joined, and the version of our Terms of Service and this policy that you agreed to.',
          ],
        },
        { p: 'When you get one of our free guides, we collect:' },
        {
          ul: [
            'Your first name.',
            'Your email address.',
            'Which guide you got.',
            'A short tag from the link you used, if it had one. For example, the link we send in Instagram messages adds one.',
            'The date and time you got the guide, and the version of our Terms of Service and this policy that you agreed to.',
          ],
        },
        { p: 'The guide pages do not ask for a mobile number.' },
        {
          p: 'Like most websites, our servers and our hosting provider keep basic technical logs of each request. These include your IP address, the page you asked for, and the time. We use them to run the site and keep it secure, not for marketing.',
        },
      ],
    },
    {
      id: 'what-we-do-not-collect',
      heading: 'What we do not collect',
      blocks: [
        {
          ul: [
            'What you type into the fields that fill in the prompts, like your “About you” answers, and your progress on the page are saved in your own browser’s storage, so they are there when you come back. They are never sent to us. Clearing your browser’s data for the site removes them.',
            'When you copy a prompt, it goes to your device’s clipboard, not to us.',
            'On a guide’s page, your browser remembers that you got the guide, so what it opened is there when you come back. That note stays in your browser and is never sent to us.',
            'Our pages load nothing from other companies. They have no analytics, no tracking cookies, no ad pixels, and no outside fonts.',
          ],
        },
        {
          p: 'Our pages link to other sites, like ChatGPT, Claude, Canva, and the app stores. When you follow a link, that site’s own privacy policy applies.',
        },
      ],
    },
    {
      id: 'how-we-use-it',
      heading: 'How we use it',
      blocks: [
        {
          ul: [
            `To email you about the December agent track and other programs from ${SENDERS}.`,
            `If you got a guide, to email you about it and about our other programs and resources from ${SENDERS}.`,
            'To text you about the same programs, but only if you checked the SMS box.',
            'To keep a record of your consent and your opt-outs, so we can honor them.',
            'To learn which links and events bring people to our lists, using the link tag.',
            'To run and secure the site, and to follow the law.',
          ],
        },
      ],
    },
    {
      id: 'text-messages',
      heading: 'Text messages',
      blocks: [
        {
          p: 'We use your mobile number only to send the texts you agreed to and to keep a record of that agreement. If you give a number but do not check the SMS box, we keep it with your sign-up and never text it. We never sell or rent mobile numbers.',
        },
        {
          p: SMS_SHARING,
        },
        {
          p: [
            'Reply STOP to any text to opt out, or HELP for help. Our ',
            { link: 'text message terms', href: '/terms#text-messages' },
            ' have the details.',
          ],
        },
      ],
    },
    {
      id: 'sharing',
      heading: 'Who we share it with',
      blocks: [
        {
          ul: [
            'Service providers that do work for us. They host the site and its database (for example, Railway), deliver email (for example, Resend), and keep our contact list and send our emails and texts (a customer relationship tool, for example GoHighLevel). We give them only what they need for that work.',
            'Others, when the law requires it, or to protect our rights or anyone’s safety.',
            'A buyer or successor, if our business is sold or merged. This policy would still apply to your information.',
          ],
        },
        { p: 'We do not sell your personal information, and we do not share it for targeted advertising.' },
      ],
    },
    {
      id: 'retention',
      heading: 'How long we keep it',
      blocks: [
        {
          p: `We keep your waitlist and guide sign-up information for ${P.retention}, or until you ask us to delete it.`,
        },
        {
          p: `We keep records of your consent and your opt-outs for ${P.consentRetention}, even after you leave the list, so we can show that we honored them.`,
        },
        { p: `Technical logs are kept for ${P.logRetention}.` },
      ],
    },
    {
      id: 'your-choices',
      heading: 'Your choices and rights',
      blocks: [
        {
          ul: [
            'To stop emails, use the unsubscribe link in any email.',
            'To stop texts, reply STOP to any text.',
            `To see, correct, or delete your information, email ${P.privacyEmail}. We may need to confirm it is you first.`,
            'Depending on where you live, you may have more rights under state law. Contact us and we will help.',
          ],
        },
        {
          p: 'If you ask us to delete your information, we will keep a short record that you opted out, so we do not contact you again by mistake.',
        },
      ],
    },
    {
      id: 'security',
      heading: 'Security',
      blocks: [
        {
          p: 'We use reasonable safeguards to protect your information. The site uses encrypted connections (HTTPS), and we limit access to the people and providers who need it. No method is perfect, so we cannot promise complete security.',
        },
      ],
    },
    {
      id: 'children',
      heading: 'Children',
      blocks: [
        {
          p: `Our pages, the guides, and the waitlist are for adults. They are not meant for anyone under 18, and we do not knowingly collect information from anyone under 18. If you think a child gave us information, email ${P.privacyEmail} and we will delete it.`,
        },
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to this policy',
      blocks: [
        {
          p: 'We may update this policy. When we do, we will post the new version on this page and change the date and version at the top. If a change is significant, we will tell you by email.',
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contact us',
      blocks: [{ p: `Questions or requests? Email ${P.privacyEmail} or write to us at ${P.address}.` }],
    },
  ],
};

/** Both pages, in footer order. */
export const LEGAL_DOCS = [TERMS, PRIVACY] as const;
