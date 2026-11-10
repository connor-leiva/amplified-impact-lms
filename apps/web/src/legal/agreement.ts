// /agreement: the subscription agreement every offer order records (DECISIONS.md D-072).
//
// A DRAFT FOR SPRING'S ATTORNEY. The spec has the attorney approve this text before the carts open on
// Thursday, Nov 12; until then the page says it is a draft, asks search engines not to index it, and
// highlights every [bracketed placeholder]. It covers what the spec lists: the plan terms, automatic
// renewal, the agent plan's 3-month minimum, cancel and keep, no refunds with a seat that can move to
// the next cohort, access to the client's data, and the client's responsibility for the texts and
// calls they send (TCPA). Replace the words here; `AGREEMENT_VERSION` changes with them, and the API's
// copy (`apps/api/src/billing/checkout.ts`) is held equal by a test, because every order records it.
//
// House rules for the copy, as on /terms: no em dashes, short plain sentences.

import type { LegalDoc } from './content';

/** Recorded on every order. A date, with `-draft` until the attorney's text replaces this one. */
export const AGREEMENT_VERSION = '2026-11-12-draft';
export const AGREEMENT_EFFECTIVE = { iso: '2026-11-12', label: 'November 12, 2026' } as const;

const CONTACT = 'admin@amplifiedimpact.io';

export const AGREEMENT: LegalDoc = {
  path: '/agreement',
  title: 'Subscription Agreement | Amplified Impact',
  description: 'The terms of the Skill Library, the Core Cohort and the Agent Team Plan.',
  heading: 'Subscription Agreement',
  numberedHeadings: true,
  draft: true,
  version: AGREEMENT_VERSION,
  effective: AGREEMENT_EFFECTIVE,
  notice:
    'This agreement renews automatically for plans with a monthly charge. You can cancel a monthly charge as Section 5 explains. Payments are not refundable, as Section 6 explains.',
  intro: [
    'This Subscription Agreement covers the plans you buy from Amplified Impact, LLC on our offer page or through our payment links. It adds to our ',
    { link: 'Terms of Service', href: '/terms' },
    ' and our ',
    { link: 'Privacy Policy', href: '/privacy' },
    ', which also apply. Where this agreement and the Terms of Service differ about a plan, this agreement governs.',
  ],
  sections: [
    {
      id: 'plans',
      heading: '1. The Plans',
      blocks: [
        { p: 'A plan gives your team access to parts of the Amplified Impact platform at learn.amplifiedimpact.io, a number of logins and the live sessions listed below. The offer page and your Stripe receipt show the price you paid.' },
        {
          ul: [
            [{ strong: 'Skill Library.' }, ' The owner and operations skills, plus the new skills released while your membership is paid. Office hours for 30 days, then while your membership is paid.'],
            [{ strong: 'Core Cohort.' }, ' Both skill sets, eight weekly live builds for cohort one starting Tuesday, December 1, 2026, weekly office hours, and 90 days of new skills and office hours after the last build.'],
            [{ strong: 'Agent Team Plan.' }, ' The agent skills, a recorded core path for new hires and a weekly live agent coaching session, for up to 15 agents or for 16 to 40 agents, as you chose.'],
          ],
        },
        { p: 'Session dates, times and hosts can change. We will tell you ahead of any change by email.' },
      ],
    },
    {
      id: 'accounts',
      heading: '2. Your Account and Logins',
      blocks: [
        { p: 'The person who buys a plan is the owner of the account. The owner can add the logins the plan includes from the Team Hub. Each login is for one named person and may not be shared.' },
        { p: 'Logins for plans bought by November 15, 2026 are sent on Monday, November 16, 2026. After that, they are sent within minutes of payment.' },
      ],
    },
    {
      id: 'billing',
      heading: '3. Payment and Automatic Renewal',
      blocks: [
        { p: 'Stripe processes every payment. By checking out, you authorize us to charge the payment method you saved for the charges you agreed to at checkout:' },
        {
          ul: [
            [{ strong: 'Skill Library.' }, ' The library price today, then the monthly membership starting on day 31, each month until you cancel.'],
            [{ strong: 'Core Cohort in two payments.' }, ' The second payment one month after the first. The payments stop after the second one.'],
            [{ strong: 'Core Cohort membership.' }, ' If you chose to continue after the 90 days, the monthly membership from that date until you cancel.'],
            [{ strong: 'Agent Team Plan.' }, ' Nothing today. The monthly price starting Tuesday, January 26, 2027, each month until you cancel, subject to Section 4.'],
          ],
        },
        { p: 'Stripe emails a reminder before a free period ends and a receipt for each charge. If a charge fails, Stripe retries it and asks you to update your card. Prices for later periods are the prices at checkout unless we give you 30 days of notice of a change.' },
      ],
    },
    {
      id: 'minimum',
      heading: '4. The Agent Team Plan Minimum',
      blocks: [
        { p: 'The Agent Team Plan has a minimum term of three monthly payments, starting January 26, 2027. To cancel before the third payment, write to ' + CONTACT + '. Cancelling before then does not end the payments due for the minimum term [attorney to confirm].' },
      ],
    },
    {
      id: 'cancel',
      heading: '5. Cancelling, and What You Keep',
      blocks: [
        { p: `You can cancel a monthly charge at any time by writing to ${CONTACT}. Cancelling stops the next charge. Your plan stays open to the end of the period you paid for.` },
        { p: 'When a plan ends, you keep every skill released before the end of the last period you paid for. You do not get skills released after that date, and live sessions end with that period.' },
      ],
    },
    {
      id: 'refunds',
      heading: '6. No Refunds',
      blocks: [
        { p: 'Payments are not refundable. A Core Cohort seat can move to the next cohort once, if you ask in writing before the first live build of the cohort you bought [attorney to confirm].' },
        { p: 'If we refund a payment for any reason, the plan it paid for ends on the day of the refund, along with its access.' },
      ],
    },
    {
      id: 'data',
      heading: '7. Your Data',
      blocks: [
        { p: 'Skills run in your own Claude or ChatGPT account, on files you choose to give them. We do not receive the contents of those files or of your CRM. On the platform, we keep the account details, progress and support messages our Privacy Policy describes.' },
        { p: 'If you share files with us for a live build, we use them only to help your team during that build and delete them when the cohort ends [attorney to confirm].' },
      ],
    },
    {
      id: 'tcpa',
      heading: '8. Your Messages to Your Clients',
      blocks: [
        { p: 'Skills draft emails, texts and call scripts. You decide what is sent. You are responsible for every message your team sends, and for following the laws that apply to it, including the Telephone Consumer Protection Act, state calling and texting laws, fair housing laws and your brokerage rules. Get consent before you text or call anyone with automated technology.' },
      ],
    },
    {
      id: 'general',
      heading: '9. Everything Else',
      blocks: [
        { p: 'We can update this agreement for new purchases. Changes to a plan you already bought take effect only with 30 days of notice. The Terms of Service cover the rest, including how disputes are resolved.' },
        { p: `Questions about this agreement: ${CONTACT}.` },
      ],
    },
  ],
};
