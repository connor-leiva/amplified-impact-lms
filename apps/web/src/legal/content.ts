// Every word on /terms and /privacy, the public legal pages behind the /ai101 waitlist and, since
// 2026-10-13, the free guides' opt-ins (/task-sync-starter, D-038; /ops-time-audit, D-039;
// /voice-profile, D-040).
//
// The Privacy Policy is Connor's own text, word for word, since 2026-10-18 (D-042): one policy for
// every Amplified Impact service, not only these pages. Only its quotation marks and apostrophes are
// typeset, as the Terms' are. The Terms were drafted by an AI assistant, not a lawyer, for Connor's
// review; Connor supplied every fact the draft had left as a [bracketed placeholder] on 2026-10-08
// (the entities, names, contact, address, governing law and the liability cap). Where the two pages
// overlap (who "we" are, how texts are opted into, what happens to a mobile number) the Terms follow
// the policy. A lawyer's read is still recommended. `DRAFT` turns the "Draft for review" notice and
// the `noindex` back on, and `render.test.ts` refuses to turn it off while any placeholder is left.
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
export const LEGAL_VERSION = '2026-10-18';

/** When these words take effect, as a machine date and as the page shows it. */
export const EFFECTIVE = { iso: '2026-10-18', label: 'October 18, 2026' } as const;

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
 * other). The Privacy Policy's own words since D-042: the two sentences 10DLC campaign vetting looks
 * for, no third parties or affiliates for marketing, and opt-in data only to the text providers.
 */
export const SMS_SHARING =
  'No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties, except the aggregators and providers that deliver our text messages.';

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
// 2026-10-08; the company's state of formation, Utah, came with the Privacy Policy (D-042), whose own
// sentences give the retention periods.

const P = {
  aiName: 'Amplified Impact, LLC',
  contactEmail: 'admin@amplifiedimpact.io',
  privacyEmail: 'admin@amplifiedimpact.io',
  address: '1173 N Shepard Crk Pkwy Ste A, Farmington, UT 84025',
  lawState: 'the State of Utah',
  venue: 'the state courts in Davis County, Utah, or the federal court for the District of Utah',
  liabilityCap: 'one hundred dollars ($100)',
} as const;

// --- Types ---------------------------------------------------------------------------------------

/**
 * A run of inline copy. A string is text; `{ strong }` is bold; `{ link, href }` is a link. Links
 * with an `href` starting `/` stay in this tab; the only off-site links, the Privacy Policy's ad
 * opt-out pages, open in a new one.
 */
export type Inline = string | { strong: string } | { link: string; href: string };

/** One block of a section. */
export type Block =
  /** A subheading inside the section. */
  | { h3: string }
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
  /**
   * True when every section heading carries its own number ("1. Who We Are"), as the Privacy
   * Policy's do because its sentences cite them. The table of contents then adds no numbers.
   */
  numberedHeadings?: true;
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
        // The Privacy Policy's own sentence, so the two pages mean the same company (D-042).
        { p: `“Amplified Impact,” “we,” “us,” and “our” mean ${P.aiName}, a Utah limited liability company.` },
        {
          p:
            'When we email or text you about our programs, these terms apply to those messages too. “You” ' +
            'means the person using our pages, joining the waitlist, or getting a guide.',
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
          p: 'Texts are optional. You get them only if you opt in, for example by checking the SMS box on the waitlist form or texting a keyword to us. You do not have to agree to texts to join the waitlist or to buy anything.',
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
// Connor's text, word for word (D-042). Its headings are numbered because its sentences point at
// them ("as Section 8 explains").

export const PRIVACY: LegalDoc = {
  path: '/privacy',
  title: 'Privacy Policy | Amplified Impact',
  description:
    'How Amplified Impact collects, uses, shares, and protects personal information, and the choices you have.',
  heading: 'Privacy Policy',
  numberedHeadings: true,
  intro: [
    'This Privacy Policy explains how Amplified Impact collects, uses, shares, and protects personal information, and the choices you have. It is part of our ',
    { link: 'Terms of Service', href: '/terms' },
    '.',
  ],
  sections: [
    {
      id: 'who-we-are',
      heading: '1. Who We Are and What This Policy Covers',
      blocks: [
        { p: `“Amplified Impact,” “we,” “us,” and “our” mean ${P.aiName}, a Utah limited liability company.` },
        {
          p: '“Affiliated Companies” means any company that controls, is controlled by, or is under common control with Amplified Impact, and any company owned or controlled, in whole or in part, by anyone who directly or indirectly holds an ownership interest in Amplified Impact.',
        },
        {
          p: 'This policy applies to personal information we collect, online or offline, through our “Services.” The Services are our websites (including amplifiedimpact.io and its subdomains), courses, programs, coaching, consulting and implementation services, workshops, webinars, live and virtual events, communities, memberships, guides, templates, tools, and the emails, text messages, and other communications we send.',
        },
        { p: 'This policy does not apply to:' },
        {
          ul: [
            'Websites, platforms, and tools we do not own or control, even if we link to them or use them to deliver the Services.',
            'Personal information we handle for a client while providing consulting or implementation services, such as contact records in a client’s CRM. We process that information on the client’s behalf under our agreement with them, and the client’s own privacy practices apply to it.',
          ],
        },
        {
          p: 'By using the Services or giving us personal information, you acknowledge that we will handle your information as this policy describes.',
        },
      ],
    },
    {
      id: 'information-we-collect',
      heading: '2. Information We Collect',
      blocks: [
        {
          p: 'We collect information you give us, information collected automatically when you use the Services, and information from other sources.',
        },
        { h3: 'Information You Give Us' },
        { p: 'What we collect depends on how you interact with us. It can include:' },
        {
          ul: [
            [{ strong: 'Contact details,' }, ' such as your name, email address, mobile number, and mailing address.'],
            [
              { strong: 'Professional details,' },
              ' such as your company or brokerage, role, team size, market, license or certification details, and information about your business that you choose to share.',
            ],
            [{ strong: 'Account details,' }, ' such as your username, password, and profile.'],
            [
              { strong: 'Purchase details,' },
              ' such as what you bought, prices, billing information, and payment status. Our payment processors handle card numbers and other payment credentials. We do not store full card numbers.',
            ],
            [{ strong: 'Responses' }, ' to forms, applications, quizzes, assessments, surveys, and intake questions.'],
            [
              { strong: 'Content you share,' },
              ' such as questions, comments, posts, assignments, files, and messages, including what you say or share in live sessions, communities, and chats.',
            ],
            [
              { strong: 'Recordings' },
              ' of calls, sessions, and events you take part in, which can include your name, image, voice, and what you say or share, along with transcripts and summaries of them.',
            ],
            [{ strong: 'Testimonials, reviews, and feedback' }, ' you give us.'],
            [
              { strong: 'Consent records.' },
              ' When you agree to our terms or to receive messages, we record what you agreed to, including the words shown to you, the page or form, the date and time, and the version of our terms and this policy in effect.',
            ],
          ],
        },
        { h3: 'Information Collected Automatically' },
        {
          p: 'When you visit our websites, open our emails, or use our online tools, we and our service providers may collect:',
        },
        {
          ul: [
            [
              { strong: 'Device and connection information,' },
              ' such as IP address, browser, device type, and operating system.',
            ],
            [
              { strong: 'Usage information,' },
              ' such as pages viewed, links clicked, the page that referred you, and the dates and times of your visits.',
            ],
            [{ strong: 'Approximate location,' }, ' based on your IP address.'],
            [
              { strong: 'Campaign information,' },
              ' such as a tag in the link or QR code that brought you to us, so we know which campaign, post, or event you came from.',
            ],
            [
              { strong: 'Email and message engagement,' },
              ' such as whether a message was delivered or opened and which links were clicked.',
            ],
            [{ strong: 'Platform activity,' }, ' such as logins, lessons viewed, progress, and completion.'],
          ],
        },
        { p: 'We collect some of this with cookies and similar technologies, as Section 8 explains.' },
        {
          p: 'Some of our tools save what you type, or your progress, only in your browser’s storage on your device. That information is not sent to us, and clearing your browser data removes it.',
        },
        { h3: 'Information From Other Sources' },
        { p: 'We may receive information about you from:' },
        {
          ul: [
            'Our Affiliated Companies.',
            'Partners who co-host, sponsor, or present an event or program with us.',
            'Social media platforms, when you follow, comment on, or message our accounts, including through automated messaging tools.',
            'Service providers that help us run the Services, such as payment, scheduling, video meeting, and course platforms.',
            'Publicly available sources, such as business websites, professional profiles, and public licensing records.',
          ],
        },
        { h3: 'Sensitive Information' },
        {
          p: 'We do not ask for sensitive information, such as Social Security numbers, financial account numbers, health information, or precise location, unless we need it for a purpose we explain at the time, such as tax reporting for a payment we make to you. Please do not share sensitive information about yourself or anyone else in sessions, communities, forms, or messages.',
        },
      ],
    },
    {
      id: 'how-we-use-information',
      heading: '3. How We Use Information',
      blocks: [
        { p: 'We use personal information to run our business and provide the Services, including to:' },
        {
          ul: [
            'Provide the Services, including creating accounts, processing registrations and payments, delivering content, hosting sessions and events, and providing support.',
            'Send service messages about your account, purchases, schedules, and changes to our terms or policies.',
            'Send marketing from us and our Affiliated Companies, as Section 5 describes.',
            'Recommend programs and resources that fit you, for example based on your quiz or assessment results.',
            'Learn which campaigns, links, posts, and events bring people to us, and measure our marketing and advertising.',
            'Improve the Services and develop new courses, curriculum, content, and tools, including by reviewing questions, feedback, and recordings.',
            'Create replays, course materials, and promotional content from recordings, as our Terms of Service describe.',
            'Keep records of your consents and opt-outs, and honor them.',
            'Prevent fraud and abuse, secure the Services, enforce our terms, and resolve disputes, including payment disputes.',
            'Comply with the law and respond to lawful requests.',
            'Create de-identified or aggregated information, which we may use for any lawful purpose.',
            'Do anything else we describe when we collect the information, or that you agree to.',
          ],
        },
      ],
    },
    {
      id: 'ai-and-automated-tools',
      heading: '4. AI and Automated Tools',
      blocks: [
        {
          p: 'We use artificial intelligence and automation to run our business and deliver the Services. We and our service providers may use AI tools to transcribe, summarize, and organize calls and sessions; sort and respond to messages; draft communications; personalize recommendations; and analyze how the Services are used. When a third-party AI provider processes information for us, its own terms and privacy commitments also apply.',
        },
        {
          p: `Some messages from us, including emails, texts, direct messages, and chat replies, may be written or sent with the help of AI or automation. You can ask at any time whether you are communicating with a person, or ask to reach one, by emailing ${P.privacyEmail}.`,
        },
      ],
    },
    {
      id: 'marketing',
      heading: '5. Marketing From Us and Our Affiliated Companies',
      blocks: [
        {
          p: 'When you give us your contact information, for example by signing up, registering, buying, downloading a resource, completing a quiz or form, or attending an event, you agree to receive emails and other marketing communications from Amplified Impact and our Affiliated Companies. These communications may cover programs, events, products, services, resources, and opportunities.',
        },
        {
          p: 'To make this possible, we may share your name, email address, and other information you give us, except your mobile number, with our Affiliated Companies. Each Affiliated Company uses that information under its own privacy policy.',
        },
        {
          p: `You can unsubscribe from marketing emails at any time with the link in any email. Each sender keeps its own list, so to stop marketing emails from all of them, email ${P.privacyEmail} and we will pass your request to our Affiliated Companies. We may still send you service messages about Services you use.`,
        },
        { p: 'Text messages work differently, as Section 6 explains.' },
      ],
    },
    {
      id: 'text-messages',
      heading: '6. Text Messages',
      blocks: [
        {
          p: 'Texts are optional. We text only people who opt in, for example by checking an SMS box or texting a keyword to us. You never have to agree to texts to buy anything.',
        },
        {
          p: [
            'Texts come from Amplified Impact. They may cover our programs, events, resources, and offers, including programs and events we offer with our Affiliated Companies. Message frequency varies, and message and data rates may apply. Reply STOP to opt out or HELP for help. Our ',
            { link: 'Terms of Service', href: '/terms#text-messages' },
            ' include our full text message terms.',
          ],
        },
        {
          p: 'We use your mobile number and text consent only to send the texts you agreed to, keep a record of your consent and any opt-out, and run our text program. If you give us a mobile number without opting in to texts, we do not send marketing texts to it.',
        },
        { p: SMS_SHARING },
      ],
    },
    {
      id: 'sharing',
      heading: '7. How We Share Information',
      blocks: [
        { p: 'We share personal information only as this policy describes:' },
        {
          ul: [
            [
              { strong: 'Affiliated Companies,' },
              ' for the marketing described in Section 5, and to help us provide the Services and run our business.',
            ],
            [
              { strong: 'Service providers' },
              ' that work for us, such as website and database hosting, CRM and marketing automation, email and text delivery, payment processing, course and community platforms, scheduling, video meetings, recording and transcription, AI tools, analytics, customer support, and contractors who help deliver the Services. They may use the information only to do that work.',
            ],
            [
              { strong: 'Partners in a joint offering.' },
              ' When you register for an event or program we offer with a co-host, sponsor, or partner, we may share your registration information with that partner, as we tell you when you register.',
            ],
            [
              { strong: 'Other participants.' },
              ' In group sessions, events, and communities, other participants can see your name, image, and what you share. Recordings may be shared as our Terms of Service describe.',
            ],
            [
              { strong: 'Advertising and analytics partners,' },
              ' through cookies and similar technologies, as Section 8 explains.',
            ],
            [
              { strong: 'A buyer or successor,' },
              ' if we are involved in a merger, acquisition, financing, reorganization, sale of assets, or similar transaction. Information we transfer remains subject to this policy.',
            ],
            [
              { strong: 'Legal and safety needs,' },
              ' when we believe sharing is required by law or legal process, or needed to protect the rights, property, or safety of Amplified Impact or anyone else.',
            ],
            [{ strong: 'With your consent' }, ' or at your direction.'],
          ],
        },
        {
          p: 'We may share de-identified or aggregated information for any lawful purpose. We do not sell personal information in exchange for money.',
        },
        {
          p: 'All of the categories above exclude text messaging originator opt-in data and consent, which we share only as Section 6 allows.',
        },
      ],
    },
    {
      id: 'cookies',
      heading: '8. Cookies and Similar Technologies',
      blocks: [
        {
          p: 'We and our service providers may use cookies, pixels, tags, local storage, and similar technologies to run our websites, remember your preferences, understand how the Services are used, and measure and improve our marketing. Some may come from analytics and advertising partners, such as Google and Meta, which may collect information about your activity across websites over time and use it to show you ads.',
        },
        { p: 'You have choices:' },
        {
          ul: [
            [{ strong: 'Browser settings.' }, ' You can block or delete cookies, though some features may not work.'],
            [
              { strong: 'Ad choices.' },
              ' You can opt out of interest-based ads from many companies at ',
              { link: 'optout.aboutads.info', href: 'https://optout.aboutads.info' },
              ' and ',
              { link: 'optout.networkadvertising.org', href: 'https://optout.networkadvertising.org' },
              ', and adjust ad settings in your Google and Meta accounts.',
            ],
            [
              { strong: 'Google Analytics.' },
              ' You can opt out with Google’s ',
              { link: 'browser add-on', href: 'https://tools.google.com/dlpage/gaoptout' },
              '.',
            ],
            [
              { strong: 'Browser signals.' },
              ' Where the law requires, we treat a Global Privacy Control signal as a request to opt out of targeted advertising for that browser. We do not respond to Do Not Track signals.',
            ],
          ],
        },
      ],
    },
    {
      id: 'your-choices',
      heading: '9. Your Choices and Rights',
      blocks: [
        {
          ul: [
            [{ strong: 'Emails.' }, ` Use the unsubscribe link in any marketing email, or email ${P.privacyEmail}.`],
            [
              { strong: 'Texts.' },
              ' Reply STOP to any text. CANCEL, END, QUIT, UNSUBSCRIBE, REVOKE, and OPT OUT also work, and so does telling us another reasonable way.',
            ],
            [
              { strong: 'Both.' },
              ' Unsubscribing from email does not stop texts, and replying STOP does not stop emails. To stop both, do both, or email us.',
            ],
            [{ strong: 'Calls.' }, ' Ask us to add your number to our internal do-not-call list.'],
            [{ strong: 'Account information.' }, ' Update it in your account settings where available, or email us.'],
          ],
        },
        { p: 'Depending on where you live, you may have the right to:' },
        {
          ul: [
            'Know what personal information we have about you and get a copy of it.',
            'Correct inaccurate information.',
            'Delete your information.',
            'Opt out of targeted advertising, the sale of personal information, or certain profiling.',
            'Learn what personal information we shared with third parties for their direct marketing.',
            'Appeal our decision on your request.',
          ],
        },
        {
          p: `To make a request, email ${P.privacyEmail}. We may need to confirm your identity first, and an authorized agent may make a request for you where the law allows. These rights have exceptions, and some may not apply to you. We will not discriminate against you for using them. If we decline your request, you can appeal by replying to our decision or by emailing us with “Privacy Appeal” in the subject line.`,
        },
        {
          p: 'If you ask us to delete your information, we keep a short record that you opted out, so we do not contact you again by mistake.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '10. How Long We Keep Information',
      blocks: [
        {
          p: 'We keep personal information as long as we need it for the purposes in this policy, including to provide the Services, keep business, tax, and accounting records, resolve disputes, and enforce our agreements, and longer when the law requires. In general:',
        },
        {
          ul: [
            [
              { strong: 'Marketing list information:' },
              ' while you are on our lists and for up to two years after your last interaction with us, unless you ask us to delete it sooner.',
            ],
            [
              { strong: 'Purchase and account records:' },
              ' while you have an account or access, and after that for as long as tax and accounting rules require.',
            ],
            [
              { strong: 'Consent and opt-out records:' },
              ' at least five years after you give or withdraw consent, even after you leave our lists, so we can show we honored your choices.',
            ],
            [
              { strong: 'Recordings and community content:' },
              ' as long as the related program, replay, or content remains available, unless we remove them sooner.',
            ],
            [{ strong: 'Server logs:' }, ' generally up to 30 days.'],
          ],
        },
      ],
    },
    {
      id: 'security',
      heading: '11. Security',
      blocks: [
        {
          p: `We use reasonable administrative, technical, and physical safeguards to protect personal information, including encrypted connections and limiting access to the people and providers who need it. No method of transmission or storage is completely secure, so we cannot guarantee security. Protect your password, and tell us right away at ${P.privacyEmail} if you think your account has been compromised.`,
        },
      ],
    },
    {
      id: 'children',
      heading: '12. Children',
      blocks: [
        {
          p: `The Services are for adults. They are not meant for anyone under 18, and we do not knowingly collect personal information from anyone under 18. If you believe a child has given us information, email ${P.privacyEmail} and we will delete it.`,
        },
      ],
    },
    {
      id: 'international-users',
      heading: '13. International Users',
      blocks: [
        {
          p: 'We are based in the United States. We and our service providers store and process information in the United States and other countries, where data protection laws may differ from those where you live. By using the Services, you understand that your information will be processed in those places.',
        },
      ],
    },
    {
      id: 'other-websites',
      heading: '14. Other Websites and Tools',
      blocks: [
        {
          p: 'The Services link to and recommend websites, platforms, and tools we do not own or control, such as AI platforms, social networks, payment processors, and app stores. Their own privacy policies apply when you use them, and we are not responsible for their practices.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '15. Changes to This Policy',
      blocks: [
        {
          p: 'We may update this policy. When we do, we will post the new version on this page and change the date and version at the top. If we make a material change, we will notify you by email or a notice in the Services before it takes effect. If a change affects how we use information we already have, we will get your consent where the law requires it.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '16. Contact Us',
      blocks: [{ p: `Questions or requests? Email ${P.privacyEmail} or write to ${P.aiName}, ${P.address}.` }],
    },
  ],
};

/** Both pages, in footer order. */
export const LEGAL_DOCS = [TERMS, PRIVACY] as const;
