// Every word on /terms and /privacy, the public legal pages behind the /ai101 waitlist and, since
// 2026-10-13, the free guides' opt-ins (/task-sync-starter, D-038; /ops-time-audit, D-039;
// /voice-profile, D-040; /reel-editor, D-045).
//
// Both pages are Connor's own text, word for word, since 2026-10-18 (D-042): one Terms of Service and
// one Privacy Policy for every Amplified Impact service, not only these pages. Only their quotation
// marks and apostrophes are typeset. The versions before them (2026-10-08 to 2026-10-17) were drafted
// by an AI assistant for Connor's review. A lawyer's read is still recommended. `DRAFT` turns the
// "Draft for review" notice and the `noindex` back on, and `render.test.ts` refuses to turn it off
// while any placeholder is left.
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

/**
 * Who a mobile number is shared with, said ONCE so the Terms and the Privacy Policy cannot disagree
 * (they did, in the first draft: "anyone" on one page, "any other third party or affiliate" on the
 * other). The sentence 10DLC campaign vetting looks for, in both of Connor's pages (D-042); the
 * Privacy Policy follows it with where opt-in data does go.
 */
export const SMS_SHARING =
  'No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.';

/**
 * Every sign-up form's consent wording, VERBATIM: the record of what a visitor agreed to, beside the
 * pages they agreed to. Other files render the forms, and their tests hold each form to these
 * strings; `render.test.ts` holds these to literals typed out in the test. The pages quoted them
 * until Connor's own Terms (D-042), which do not. If a form's wording changes, change it here in the
 * same commit.
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

/** The SMS program's name, as the Terms give it (D-042). */
export const SMS_PROGRAM = 'Amplified Impact Updates';

// --- The facts ------------------------------------------------------------------------------------
// One constant per fact, so the same fact reads the same everywhere it appears. Supplied by Connor on
// 2026-10-08; the company's state of formation, Utah, came with Connor's own pages (D-042), whose
// sentences carry the rest (the liability cap, the retention periods).

const P = {
  aiName: 'Amplified Impact, LLC',
  contactEmail: 'admin@amplifiedimpact.io',
  privacyEmail: 'admin@amplifiedimpact.io',
  address: '1173 N Shepard Crk Pkwy Ste A, Farmington, UT 84025',
  venue: 'the state courts in Davis County, Utah, or the federal court for the District of Utah',
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
  | { ul: readonly (string | readonly Inline[])[] };

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
   * True when every section heading carries its own number ("1. Who We Are"), as both pages' do
   * because their sentences cite them ("as Section 8 explains"). The contents list then adds none.
   */
  numberedHeadings?: true;
  /** A bold notice above the intro: the Terms' warning about arbitration. */
  notice?: string;
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
// Connor's text, word for word (D-042). Numbered headings, as the policy's are, because its sentences
// cite them ("Section 24 requires you").

export const TERMS: LegalDoc = {
  path: '/terms',
  title: 'Terms of Service | Amplified Impact',
  description: 'The terms that govern your use of everything Amplified Impact offers.',
  heading: 'Terms of Service',
  numberedHeadings: true,
  notice:
    'Please read these terms carefully. Section 24 requires you and Amplified Impact to resolve most disputes through individual binding arbitration instead of in court or in a class action, and it explains how to opt out within 30 days.',
  intro: [
    'These Terms of Service govern your use of everything Amplified Impact offers. Our ',
    { link: 'Privacy Policy', href: '/privacy' },
    ' explains how we handle personal information and is part of these terms.',
  ],
  sections: [
    {
      id: 'who-we-are',
      heading: '1. Who We Are and Key Terms',
      blocks: [
        {
          ul: [
            [
              { strong: '“Amplified Impact,” “we,” “us,” and “our”' },
              ` mean ${P.aiName}, a Utah limited liability company.`,
            ],
            [
              { strong: '“Affiliated Companies”' },
              ' means any company that controls, is controlled by, or is under common control with Amplified Impact, and any company owned or controlled, in whole or in part, by anyone who directly or indirectly holds an ownership interest in Amplified Impact.',
            ],
            [
              { strong: '“Services”' },
              ' means our websites (including amplifiedimpact.io and its subdomains), courses, programs, coaching, consulting and implementation services, workshops, bootcamps, webinars, live and virtual events, communities, memberships, guides, templates, tools, and the emails, text messages, and other communications we send.',
            ],
            [
              { strong: '“Materials”' },
              ' means the content we provide through the Services, including videos, recordings, slides, workbooks, guides, templates, prompts, scripts, checklists, frameworks, software, and tools.',
            ],
            [
              { strong: '“You”' },
              ' means the person using the Services and, if you use them for a company or team, that company or team.',
            ],
          ],
        },
      ],
    },
    {
      id: 'agreeing',
      heading: '2. Agreeing to These Terms',
      blocks: [
        {
          p: 'These terms are a binding agreement between you and Amplified Impact. You accept them when you check a box or click a button that refers to them, create an account, sign up, make a purchase, join a session or event, or otherwise use the Services. If you do not agree, do not use the Services.',
        },
        {
          p: 'You must be at least 18 and able to form a binding contract. If you accept these terms for a company, you confirm that you have authority to bind it.',
        },
        {
          p: 'The Services are designed for professional and business development, and you agree that you are using them for business or professional purposes.',
        },
      ],
    },
    {
      id: 'offer-terms',
      heading: '3. Offer Terms',
      blocks: [
        {
          p: 'Some offerings come with additional terms, such as an enrollment or program agreement, event terms, a proposal or statement of work, or terms shown at checkout (“Offer Terms”). Offer Terms are part of these terms. If Offer Terms conflict with these terms, the Offer Terms control for that offering.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '4. Changes to the Services and These Terms',
      blocks: [
        {
          p: 'We may change, suspend, or discontinue any part of the Services at any time, including content, features, formats, schedules, presenters, and pricing for future purchases. If we discontinue a paid offering before you receive what you paid for, we will provide a comparable substitute or a prorated refund, at our choice.',
        },
        {
          p: 'We may update these terms. When we do, we will post the new version on this page and change the date and version at the top. If a change is material, we will notify you by email or a notice in the Services before it takes effect. Changes apply going forward, and a change to Section 24 will not apply to a dispute that arose before we posted it. If you keep using the Services after a change takes effect, the updated terms apply to you.',
        },
      ],
    },
    {
      id: 'accounts',
      heading: '5. Accounts and Access',
      blocks: [
        {
          ul: [
            'Give us accurate information and keep it current.',
            'Keep your login secure. You are responsible for all activity under your account.',
            'Access is personal to you, or limited to the number of users included in your purchase. Do not share your login or let anyone else use your access.',
            'We may monitor for shared or unauthorized access, and we may suspend or end access that violates this section without a refund.',
          ],
        },
      ],
    },
    {
      id: 'payments',
      heading: '6. Purchases and Payments',
      blocks: [
        { h3: 'Paying for the Services' },
        {
          p: 'You agree to pay all fees for the Services you buy, plus any applicable taxes. You authorize us and our payment processors to charge your payment method for those fees, including any recurring or installment payments you choose. Prices are in U.S. dollars unless we say otherwise.',
        },
        { h3: 'Payment Plans' },
        {
          p: 'A payment plan is a way to pay the full price over time. It is not a subscription you can cancel. You owe every installment, even if you stop using the Services.',
        },
        {
          p: 'If a payment fails and you do not fix it within 7 days after we notify you, we may suspend your access until your account is current and may require the remaining balance to be paid at once. To the extent the law allows, you will also owe interest on overdue amounts at the lesser of 1.5% per month or the highest rate the law allows, plus reasonable costs of collection, including attorneys’ fees.',
        },
        { h3: 'Subscriptions and Memberships' },
        {
          p: `Subscriptions and memberships renew automatically at the then-current price for the same billing period until you cancel. You can cancel at any time in your account settings, where available, or by emailing ${P.contactEmail}. Cancellation takes effect at the end of the current billing period, and you keep access until then. We will tell you about a price change before it applies to you and send any renewal reminders the law requires.`,
        },
        { h3: 'Refunds' },
        {
          p: 'Unless the Offer Terms for a purchase include a refund policy or guarantee, all sales are final and non-refundable, including if you do not use or finish what you bought. If Offer Terms include a refund policy or guarantee, you must meet its conditions and deadline to qualify. Nothing in this section limits a refund the law requires.',
        },
        { h3: 'Payment Disputes and Chargebacks' },
        {
          p: `If you have a billing problem, contact us first at ${P.contactEmail} so we can fix it. If you file a chargeback or payment dispute instead, we may suspend your access while it is open, and we may give your payment provider records of your purchase, your agreement to these terms, and your use of the Services. A chargeback does not cancel your obligation to pay for Services you bought.`,
        },
        { h3: 'Promotions and Pricing Errors' },
        {
          p: 'Discounts, promo codes, bonuses, and other promotions are subject to their stated terms, have no cash value, and cannot be combined unless we say so. We may correct pricing errors and cancel orders affected by them, refunding any amount charged.',
        },
      ],
    },
    {
      id: 'programs',
      heading: '7. Programs, Sessions, and Events',
      blocks: [
        {
          ul: [
            [
              { strong: 'Schedules.' },
              ' Dates, times, formats, presenters, and agendas may change. We will tell you about significant changes as soon as practical.',
            ],
            [
              { strong: 'Live and virtual sessions.' },
              ' You are responsible for your own internet connection and equipment, and we are not responsible for outages of third-party platforms. Replays are available only when the Offer Terms include them or we choose to provide them, and they may be available for a limited time.',
            ],
            [
              { strong: 'Access period.' },
              ' Access to digital Materials lasts for the period stated in the Offer Terms. If no period is stated, access lasts as long as we continue to offer that content. “Lifetime access” means the lifetime of the product, not of the buyer.',
            ],
            [
              { strong: 'One-on-one sessions.' },
              ' Unless the Offer Terms say otherwise, a session you miss or cancel with less than 24 hours’ notice may be forfeited.',
            ],
            [
              { strong: 'Event cancellations.' },
              ' If we cancel an event and do not reschedule it, we will refund the registration fee you paid for it or, if you prefer, apply it to a future offering. If we postpone an event, your registration moves to the new date unless the Offer Terms provide other options. We are not responsible for travel, lodging, or other costs you incur.',
            ],
            [
              { strong: 'Registrations are personal.' },
              ' You may transfer a registration only with our written approval.',
            ],
          ],
        },
        { h3: 'In-Person Events' },
        {
          p: 'You are responsible for your own conduct, safety, and belongings, and you agree to follow venue rules and our staff’s instructions. We may remove anyone who acts in a disruptive, unsafe, or inappropriate way, without a refund.',
        },
        {
          p: 'Attending an in-person event involves risks, including travel and venue risks, and you voluntarily accept them. To the fullest extent the law allows, you release Amplified Impact and its Affiliated Companies from claims arising from your attendance, except claims caused by our gross negligence or willful misconduct.',
        },
      ],
    },
    {
      id: 'recordings',
      heading: '8. Recordings and Your Likeness',
      blocks: [
        {
          p: 'We may record calls, sessions, events, and community activity, including video, audio, screen shares, chat, and transcripts, and we may take photos and video at in-person events. Recordings may be made or processed with AI tools.',
        },
        {
          p: 'By joining or attending, you consent to being recorded and photographed. You grant Amplified Impact and its Affiliated Companies a worldwide, royalty-free, perpetual, irrevocable license to use, edit, reproduce, and share recordings and photos that include your name, image, likeness, voice, and what you say or share, in any media and for any lawful purpose, including replays, course Materials, promotion, and advertising, without payment or further approval.',
        },
        {
          p: 'If you do not want to appear, turn off your camera, use a display name that does not identify you, and do not speak or post in the chat. At an in-person event, tell our staff when you arrive. If you ask us in writing before a session not to use your likeness in promotion, we will make reasonable efforts to honor that request.',
        },
        {
          p: 'You may not record, photograph, stream, or capture any part of the Services yourself without our written permission.',
        },
      ],
    },
    {
      id: 'testimonials',
      heading: '9. Testimonials and Feedback',
      blocks: [
        {
          p: 'If you give us a testimonial, review, story, or result, whether in writing, on video, in a survey, or in a session or community, you allow Amplified Impact and its Affiliated Companies to use it with your name, image, likeness, and business name, in any media and for any lawful purpose, without payment. We may edit it for length and clarity without changing its meaning. You confirm that it is true and reflects your honest experience. If we give you anything of value in connection with a testimonial, we will disclose that as the law requires.',
        },
        {
          p: 'If you send us ideas, suggestions, or feedback, we may use them for any purpose without any obligation to you.',
        },
      ],
    },
    {
      id: 'intellectual-property',
      heading: '10. Intellectual Property and Your License',
      blocks: [
        {
          p: 'The Services and Materials, including our names, logos, frameworks, methods, curriculum, and content, belong to Amplified Impact or its licensors and are protected by intellectual property laws. We reserve all rights we do not expressly grant.',
        },
        {
          p: 'When you buy or receive access to Materials, we grant you a limited, personal, non-exclusive, non-transferable, revocable license to access and use them for your own business during your access period, under these terms.',
        },
        {
          p: [
            { strong: 'Using templates and prompts.' },
            ' You may copy, adapt, and use templates, prompts, scripts, checklists, and similar Materials inside your own business, including with your own team, and you may keep the systems, content, and automations you build with them. Using our prompts and templates in AI tools the way we teach is allowed. You may not sell, license, or give them to anyone outside your business, or use them to build products or services for others.',
          ],
        },
        { p: [{ strong: 'What you may not do.' }, ' Without our written permission, you may not:'] },
        {
          ul: [
            'Copy, share, sell, resell, rent, license, publish, or distribute Materials, or post them publicly or in other groups.',
            'Teach, present, or package our Materials, frameworks, or curriculum as your own, or use them to create a competing course, program, or product.',
            'Use Materials to train, fine-tune, or improve any AI model, or put Materials into an AI tool to copy, summarize for others, or repackage them.',
            'Scrape, crawl, or use bots or other automated means to access or copy the Services.',
            'Remove copyright, trademark, or other notices.',
            'Reverse engineer or try to extract the source code of our software or tools, except where the law allows it.',
            'Use our names, logos, or trademarks.',
          ],
        },
        {
          p: 'If you violate this section, we may end your access without a refund and pursue any remedy available, including an injunction.',
        },
      ],
    },
    {
      id: 'your-content',
      heading: '11. Your Content and Data',
      blocks: [
        {
          p: 'You keep ownership of the content you submit or share through the Services, such as posts, comments, questions, files, and assignments (“Your Content”). You grant us a worldwide, non-exclusive, royalty-free, perpetual, transferable, and sublicensable license to host, store, copy, use, adapt, display, and share Your Content to operate, provide, improve, and promote the Services. You confirm that you have the rights to Your Content and that it does not violate the law or anyone else’s rights. We may remove Your Content at our discretion.',
        },
        {
          p: 'Do not upload or share personal information about your clients, leads, or other people unless you have the right to share it and it is needed. If you give us access to your systems or data for consulting or implementation work, you confirm that you have the rights and consents needed, and the Offer Terms for that engagement govern how we handle that data.',
        },
      ],
    },
    {
      id: 'conduct',
      heading: '12. Community and Conduct Rules',
      blocks: [
        {
          p: 'When you use the Services, including communities, chats, sessions, and events, you agree not to:',
        },
        {
          ul: [
            'Harass, threaten, bully, or discriminate against anyone, or post hateful, obscene, or abusive content.',
            'Spam, or use the Services to recruit, solicit, or sell to other participants, unless we allow it in that space.',
            'Share anyone else’s confidential or personal information without permission.',
            'Post anything illegal, infringing, misleading, or harmful, including malware.',
            'Impersonate anyone or misrepresent your affiliation with anyone.',
            'Interfere with or disrupt the Services or other people’s use of them.',
          ],
        },
        { p: 'We may remove content and suspend or remove anyone who breaks these rules, without a refund.' },
      ],
    },
    {
      id: 'confidentiality',
      heading: '13. Confidentiality',
      blocks: [
        {
          p: 'In group programs, communities, and sessions, you may learn confidential information about other participants and their businesses. Keep it confidential and use it only to take part in the Services. We cannot guarantee that other participants will do the same, so share only what you are comfortable sharing.',
        },
        {
          p: 'Non-public information we share with you, such as unreleased Materials, internal systems, and business information, is confidential. Do not share it outside your business.',
        },
      ],
    },
    {
      id: 'education-only',
      heading: '14. Education Only, No Professional Advice',
      blocks: [
        {
          p: 'The Services are for education and information. They are not legal, tax, accounting, financial, investment, compliance, or other professional advice, and they do not create an attorney-client, fiduciary, or similar relationship. Talk with qualified professionals about your situation before you act.',
        },
      ],
    },
    {
      id: 'no-guarantee',
      heading: '15. No Guarantee of Results',
      blocks: [
        {
          p: 'We do not promise or guarantee any result, including income, revenue, sales, leads, savings, time saved, or business growth.',
        },
        {
          p: 'Results, numbers, examples, or stories in our Services or marketing, including those of our team, our Affiliated Companies, or our clients, are not necessarily typical and are not a promise of what you will achieve. They reflect specific circumstances that may not apply to you.',
        },
        {
          p: 'Your results depend on many factors, including your experience, effort, skills, market conditions, business model, and the tools you use, and you may achieve no results at all. You are solely responsible for your decisions and their outcomes.',
        },
      ],
    },
    {
      id: 'ai-and-third-party-services',
      heading: '16. AI Tools and Third-Party Services',
      blocks: [
        {
          p: 'AI tools can produce content that is inaccurate, incomplete, biased, outdated, or inappropriate. Review and verify everything an AI tool produces before you use, publish, or send it. You are responsible for how you use AI and its output.',
        },
        {
          p: 'The Services may feature, recommend, link to, or integrate with tools we do not own or control, such as AI platforms, software, CRMs, social networks, and app stores. Their own terms and privacy policies apply, they may charge fees, and they may change or stop working at any time. We are not responsible for third-party tools, and a change to one does not entitle you to a refund.',
        },
        {
          p: 'We may earn a commission or other benefit when you buy through some of our links or recommendations, and we will disclose that as the law requires.',
        },
      ],
    },
    {
      id: 'your-business',
      heading: '17. Your Responsibilities for Your Business',
      blocks: [
        {
          p: 'You are solely responsible for your business and for following all laws, regulations, licensing rules, and platform terms that apply to you. That includes the rules on advertising and marketing, calls and text messages, email, consumer data and privacy, anti-discrimination, and any professional license you hold.',
        },
        {
          p: 'Be careful with client and consumer information. Put it into an AI tool or share it with anyone only if the law, your contracts, and the brokerage, employer, or company policies that apply to you allow it.',
        },
      ],
    },
    {
      id: 'communications',
      heading: '18. Communications From Us and Our Affiliated Companies',
      blocks: [
        { p: 'By giving us your contact information or using the Services, you agree to receive:' },
        {
          ul: [
            'Service messages about your account, purchases, sessions, and these terms.',
            'Marketing emails and other communications from Amplified Impact and our Affiliated Companies about programs, events, products, services, resources, and opportunities.',
          ],
        },
        {
          p: `You can unsubscribe from marketing emails at any time with the link in any email. To stop marketing emails from all of our Affiliated Companies at once, email ${P.contactEmail}. You may still receive service messages about Services you use.`,
        },
        {
          p: 'You agree that we may provide agreements, notices, receipts, and other records electronically, and that they satisfy any legal requirement that they be in writing.',
        },
        { p: 'Text messages are optional and covered by Section 19.' },
      ],
    },
    {
      id: 'text-messages',
      heading: '19. Text Message Program',
      blocks: [
        {
          p: 'Texts are optional. You receive them only if you opt in, for example by checking an SMS box or texting a keyword to us. You do not have to agree to texts to buy anything.',
        },
        {
          ul: [
            [{ strong: 'Program name:' }, ` ${SMS_PROGRAM}.`],
            [{ strong: 'Sender:' }, ' Amplified Impact.'],
            [
              { strong: 'What we send:' },
              ' Texts about our programs, events, resources, and offers, including programs and events we offer with our Affiliated Companies, plus reminders and account updates. Some texts are marketing. Texts may be sent using automated technology.',
            ],
            [{ strong: 'How often:' }, ' Message frequency varies.'],
            [{ strong: 'Cost:' }, ' Msg & data rates may apply. Your mobile plan decides what you pay.'],
            [
              { strong: 'To stop:' },
              ' Reply STOP to any text. CANCEL, END, QUIT, UNSUBSCRIBE, REVOKE, and OPT OUT also work, and so does telling us another reasonable way. We may send one final text to confirm you are opted out.',
            ],
            [{ strong: 'For help:' }, ` Reply HELP to any text, or email ${P.contactEmail}.`],
            [{ strong: 'Carriers:' }, ' Carriers are not liable for delayed or undelivered messages.'],
            [
              { strong: 'Your number:' },
              ' If you change or give up your mobile number, reply STOP first or tell us, so we do not text the next person who gets it.',
            ],
          ],
        },
        {
          p: [
            'We handle mobile numbers as our ',
            { link: 'Privacy Policy', href: '/privacy#text-messages' },
            ` describes. ${SMS_SHARING}`,
          ],
        },
      ],
    },
    {
      id: 'disclaimers',
      heading: '20. Disclaimers',
      blocks: [
        {
          p: [
            {
              strong:
                'THE SERVICES AND MATERIALS ARE PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE FULLEST EXTENT THE LAW ALLOWS, AMPLIFIED IMPACT AND ITS AFFILIATED COMPANIES DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, AND UNINTERRUPTED OR ERROR-FREE OPERATION. WE DO NOT WARRANT THAT ANY STRATEGY, SYSTEM, TOOL, OR MATERIAL WILL PRODUCE ANY RESULT OR WORK FOR YOUR BUSINESS.',
            },
          ],
        },
      ],
    },
    {
      id: 'liability',
      heading: '21. Limits on Our Liability',
      blocks: [
        { p: [{ strong: 'TO THE FULLEST EXTENT THE LAW ALLOWS:' }] },
        {
          p: [
            {
              strong:
                '(A) AMPLIFIED IMPACT, ITS AFFILIATED COMPANIES, AND THEIR OWNERS, MANAGERS, EMPLOYEES, CONTRACTORS, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITIES, ARISING FROM OR RELATED TO THE SERVICES OR THESE TERMS, EVEN IF ADVISED THAT SUCH DAMAGES WERE POSSIBLE; AND',
            },
          ],
        },
        {
          p: [
            {
              strong:
                '(B) THE TOTAL LIABILITY OF ALL OF THEM, COMBINED, FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICES OR THESE TERMS WILL NOT EXCEED THE GREATER OF THE AMOUNT YOU PAID US FOR THE SERVICES GIVING RISE TO THE CLAIM IN THE 12 MONTHS BEFORE THE CLAIM AROSE, OR ONE HUNDRED DOLLARS ($100).',
            },
          ],
        },
        { p: 'Some places do not allow certain limits on liability, so some of these limits may not apply to you.' },
      ],
    },
    {
      id: 'indemnification',
      heading: '22. Indemnification',
      blocks: [
        {
          p: 'You will defend, indemnify, and hold harmless Amplified Impact, its Affiliated Companies, and their owners, managers, employees, contractors, and agents from all claims, losses, liabilities, damages, costs, and expenses, including reasonable attorneys’ fees, arising from:',
        },
        {
          ul: [
            'Your use of the Services.',
            'Your Content.',
            'Your violation of these terms, any law, or anyone’s rights.',
            'Your business, including any marketing, messages, content, AI tools, systems, or automations you create or use, whether or not you learned about them through the Services.',
          ],
        },
      ],
    },
    {
      id: 'termination',
      heading: '23. Suspension and Termination',
      blocks: [
        {
          p: 'We may suspend or end your access to any or all of the Services at any time if you breach these terms or any Offer Terms, fail to pay, file a chargeback, harm or threaten other participants or our team, or create legal risk for us. Unless the law requires otherwise, you will not receive a refund in those cases, and any unpaid balance remains due.',
        },
        {
          p: 'You may stop using the Services at any time. Stopping does not cancel payments you already owe, including remaining installments under a payment plan.',
        },
        {
          p: 'Sections that by their nature should survive will survive the end of these terms or your access, including those on payments, intellectual property, Your Content, confidentiality, disclaimers, limits on liability, indemnification, and dispute resolution.',
        },
      ],
    },
    {
      id: 'arbitration',
      heading: '24. Dispute Resolution and Arbitration',
      blocks: [
        { h3: 'Try to Resolve It First' },
        {
          p: `Before starting arbitration or a lawsuit, you agree to email ${P.contactEmail} with your name, contact information, a description of the dispute, and the relief you want, and to try in good faith to resolve it with us for 30 days. We will do the same before bringing a claim against you.`,
        },
        { h3: 'Binding Individual Arbitration' },
        {
          p: 'If we cannot resolve it, you and Amplified Impact agree that any dispute, claim, or controversy arising out of or relating to these terms, the Services, or our communications with you, including claims about text messages, calls, or emails, will be resolved by final and binding arbitration on an individual basis. This includes disputes about whether a claim must be arbitrated, which the arbitrator decides, except that a court decides disputes about the class action waiver below.',
        },
        {
          p: 'The American Arbitration Association (AAA) will administer the arbitration under its applicable rules, before a single arbitrator. Hearings may take place by video or phone, or in Davis County, Utah, unless the arbitrator decides otherwise. Fees are paid as the AAA rules provide. The Federal Arbitration Act governs this section.',
        },
        { h3: 'Exceptions' },
        {
          p: 'Either party may bring an individual claim in small claims court if it qualifies. Either party may also ask a court for an injunction or other equitable relief to stop infringement or misuse of intellectual property, or unauthorized access to the Services.',
        },
        { h3: 'No Class Actions and No Jury' },
        {
          p: 'You and Amplified Impact may bring claims only individually, and not as a plaintiff or class member in any class, collective, consolidated, or representative proceeding. The arbitrator may not combine claims or award relief to anyone other than the parties to that arbitration. If a court finds this waiver unenforceable for a claim, that claim must be severed and decided in court, and the rest of this section still applies.',
        },
        { p: [{ strong: 'YOU AND AMPLIFIED IMPACT WAIVE ANY RIGHT TO A JURY TRIAL.' }] },
        { h3: 'Opting Out' },
        {
          p: `You can opt out of this arbitration agreement by emailing ${P.contactEmail} within 30 days after you first accept these terms. Include your name, email address, and a clear statement that you opt out of arbitration. Opting out does not affect any other part of these terms.`,
        },
        { h3: 'Affiliated Companies and Time Limit' },
        {
          p: 'Our Affiliated Companies, and their owners, managers, employees, contractors, and agents, may enforce this section for claims involving them. To the extent the law allows, any claim must be brought within one year after it arose, or it is permanently barred.',
        },
      ],
    },
    {
      id: 'governing-law',
      heading: '25. Governing Law and Venue',
      blocks: [
        {
          p: `Utah law governs these terms, without regard to its conflict of law rules, except that the Federal Arbitration Act governs Section 24. Any claim that is not arbitrated must be brought only in ${P.venue}, and you and we consent to their jurisdiction.`,
        },
      ],
    },
    {
      id: 'copyright',
      heading: '26. Copyright Complaints',
      blocks: [
        {
          p: `If you believe something in the Services infringes your copyright, send a notice to ${P.contactEmail} that includes:`,
        },
        {
          ul: [
            'Your name and contact information.',
            'The copyrighted work you believe is infringed.',
            'The material you believe infringes it, and where it appears.',
            'A statement that you believe in good faith that the use is not authorized.',
            'A statement, under penalty of perjury, that your notice is accurate and that you own the copyright or are authorized to act for the owner.',
            'Your physical or electronic signature.',
          ],
        },
        { p: 'We may remove material in response and may end the access of repeat infringers.' },
      ],
    },
    {
      id: 'general',
      heading: '27. General Terms',
      blocks: [
        {
          ul: [
            [
              { strong: 'Entire agreement.' },
              ' These terms, any Offer Terms, and our Privacy Policy are the entire agreement between you and Amplified Impact about the Services.',
            ],
            [
              { strong: 'Severability.' },
              ' If any part of these terms is found unenforceable, it will be enforced to the maximum extent possible, and the rest stays in effect.',
            ],
            [
              { strong: 'No waiver.' },
              ' Our failure to enforce any part of these terms is not a waiver of our right to do so later.',
            ],
            [
              { strong: 'Assignment.' },
              ' You may not transfer these terms or your rights under them without our written consent. We may transfer them, including to an Affiliated Company or in a merger, acquisition, or sale of assets.',
            ],
            [
              { strong: 'Events beyond our control.' },
              ' We are not responsible for delays or failures caused by events beyond our reasonable control, such as internet or third-party platform outages, natural disasters, government action, or an emergency affecting a presenter.',
            ],
            [
              { strong: 'Third-party beneficiaries.' },
              ' Our Affiliated Companies, and their owners, managers, employees, contractors, and agents, are intended beneficiaries of Sections 7, 8, 9, 20, 21, 22, and 24. No one else is.',
            ],
            [
              { strong: 'Relationship.' },
              ' These terms do not create a partnership, joint venture, employment, agency, or fiduciary relationship.',
            ],
            [
              { strong: 'Interpretation.' },
              ' Headings are for convenience only. “Including” means “including without limitation.”',
            ],
            [
              { strong: 'Notices.' },
              ` We may send notices to the email address on your account or purchase. Send notices to us at ${P.contactEmail}, and send legal notices to the mailing address below as well.`,
            ],
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: '28. Contact Us',
      blocks: [{ p: `Questions about these terms? Email ${P.contactEmail} or write to ${P.aiName}, ${P.address}.` }],
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
        {
          p: `${SMS_SHARING} Text messaging originator opt-in data and consent will not be shared with any third parties, except the aggregators and providers that deliver our text messages.`,
        },
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
