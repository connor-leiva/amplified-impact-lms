// Every word on /post-closing-client-care that is its own: the landing page for Post-Closing Client Care
// (`skills/post-closing-client-care/`, version 1.0), a skill that turns one closed deal (a TC's closing
// email, a Sisu or Follow Up Boss transaction record, or the agent's notes), the agent's notes about the
// client, the agent's vendor list and review links into the client's first year: flags, a bottom line, a
// dated plan (closing day, week 1, day 30, day 90, month 6, then the first anniversary handed to Sphere
// Touch Plan), the card text and thank-you email, a review request asked the same way of every client,
// vendor introductions only from the agent's own list, a property tax reminder that points to the county,
// the Follow Up Boss steps and Check before sending. What every skill page says the same way is in
// `skill-page.ts` (D-052). The skill is paid (in the Amplified Skill Library, agent set), so the page is
// drawn with its hero, its sample and the Skill Library card in place of the sign-up and the setup (D-082,
// automatic from the catalog through `skill`); the free words and the setup below stay for the day it is
// free.
//
// The words come from the skill itself (SKILL.md and references/client-care-guide.md,
// reviews-and-vendors.md, utah-client-care.md and the shared outreach-rules.md), its page notes and its
// graded runs (eval 1 on the practice files 11 of 11, eval 2 11 of 11, eval 3 10 of 10, each with its
// objective checks), so the page promises what the skill does. The sample is sample.md, the graded run on
// the practice files, cut only by whole flags, rows, drafts and items; every draft it shows is whole. Its
// straight quotes and apostrophes are written curly, as on every page.
//
// What the page holds to, as SKILL.md does: drafts only, never sent, never written to a CRM, no action
// plan started. Texts only for clients who agreed to texts. One review ask for every client, no reward of
// any kind for a review (16 CFR 465.4 bars the rating-tied kind; the rest is a conservative default), no
// gating (16 CFR 255.2). Only the agent's own
// vendors, every relationship said, none that pays for referrals (RESPA Section 8), an affiliated business
// with its disclosure first. No tax, legal or insurance advice: the county assessor or a professional.
// Nothing from the notes about health, money or family, no price, nothing invented.
//
// Calls left open, and how the page handles them:
//   - Connor's filter: Follow Up Boss action plans can already schedule post-close touches. The page says
//     so (the first FAQ) and says the skill's part is the writing from this deal's facts plus the review
//     and vendor rules; the Follow Up Boss part is setup steps only.
//   - The email footer: every email, the thank-you and the vendor introductions included, carries
//     outreach-rules.md's full footer (the opt-out, the postal address and the marketing line). That is
//     Connor's conservative default, as are no reward of any kind for a review and no call on a Sunday
//     or a legal holiday; the FAQ says they can be calibrated with the agent's own legal counsel. The
//     sample shows the footer as written, and its day 90 call is on neither a Sunday nor a holiday.
//   - Utah's primary residential exemption changes on January 1, 2027 (S.B. 238): the page says only that
//     the reminder points to the county and mentions the change, never a percentage, a deadline or who
//     qualifies. Only Salt Lake and Davis County assessor pages were read; the page names no county.
//   - Zillow's review rules couldn't be read (its pages block direct reads); the page cites Google and the
//     FTC only.
//   - The Follow Up Boss facts (classic action plans and Automations 2.0) come from its help center as
//     gathered for FUB Automation Audit and Sphere Touch Plan; no live account was tried, and the page
//     calls them steps to set up, never tested.
//   - The sibling skills tc-file-audit and seller-listing-update may not be registered yet, so the page
//     links only Sphere Touch Plan and names the others in plain words.
//
// The practice set is four files, attached file by file. `setupMinutes` is an estimate (page-notes gives
// none): 10, as the other skill pages with a ChatGPT version say for the same shared steps.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const POST_CLOSING_CLIENT_CARE: Guide = skillPage({
  slug: 'post-closing-client-care',
  skill: 'post-closing-client-care',
  title: 'Post-Closing Client Care',

  meta: {
    title: 'Post-Closing Client Care: A Free AI Skill · Amplified Impact',
    description:
      'Attach your TC’s closing email and your notes and get your client’s first year: a dated plan, the card, the thank-you, a review request you can send every client, introductions to your own vendors and a property tax reminder. A free skill for Claude and ChatGPT. It never sends anything or changes your CRM.',
  },

  // Non-breaking spaces keep the audience on one line at phone width, as /sphere-touch-plan does.
  eyebrow: 'Free AI Skill · For Agents',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Attach your TC’s closing email and your notes, and the AI hands back your client’s whole first year: a dated plan, the card, the thank-you, a review request you can send every client, introductions to your own vendors and a property tax reminder.',
  outcome: { n: '03', title: 'Care for the First Year', body: 'A dated plan, and the card and emails to read and send.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI drafts the card and the emails. It never sends anything or changes your CRM.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page). The run date
    // moves the closing-day touches, so the note gives the deal's date.
    prompt:
      'We just closed on 1482 W Fakewater Ln. Here’s my TC’s closing email, my notes, my vendor list and my review links. I’m Sam Testerfield with Example Ridge Realty. Build Taylor and Jamie’s first year.',
    note: [
      'There are four files: a made-up TC’s closing email, the agent’s notes, a vendor list and the review links, for a made-up agent, Sam. The made-up deal recorded on Tuesday, November 10, 2026. On a later day, the AI flags the closing-day touches as past and moves them up, so your answer will differ from the sample. Every name, address and number in them is made up. ',
    ],
  },

  real: {
    // SKILL.md, section 1 (the deal, the notes, the optional vendor list and review links).
    body: ['Start a new chat the same way, attach your TC’s closing email or paste your Sisu or Follow Up Boss record, add your notes, your vendor list and your review links, and say this.'],
    prompt: 'We just closed. Here’s my TC’s email and my notes. Build their first year.',
    note: [
      'Write any relationship next to a vendor on your list (“my brother-in-law,” “my brokerage owns part of it”), and the AI says it in the email. Before anything goes out, check every date, name and link in the ',
      { strong: 'Check before sending' },
      ' list.',
    ],
  },

  chatgpt: { paste: chatgptPaste('post-closing-client-care') },

  sections: [
    {
      // sample.md (eval 1 on the practice files, 11 of 11 checks), shortened, in the output's own order
      // and its own words, cut only by whole flags, rows, drafts and items: three of the four flags, the
      // bottom line, the whole plan table, the card, the thank-you email, the review request email and
      // Taylor's text, the vendor email, the day 30 email (each whole), the classic Follow Up Boss steps,
      // and part of Check before sending. What I Used and the Automations 2.0 steps are left out.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI hands back',
      body: 'What the AI wrote from the practice files: a made-up TC’s closing email, the agent’s notes, a vendor list and the review links, for a made-up agent, Sam Testerfield of Example Ridge Realty. It’s the same set you practise on in setup.',
      title: 'First Year: Taylor and Jamie Mockwood, 1482 W Fakewater Ln',
      note: 'Made-up example, run the day the deal recorded. Shortened: three of the four flags, What I Used, the Automations 2.0 steps and part of Check before sending left out. The bottom line, the plan and each draft shown are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Closing date:' },
            ' Taylor and Jamie signed on Monday, November 9, 2026 and the deal funded and recorded on Tuesday, November 10, 2026 (Kit’s email). The plan uses Tuesday, November 10, the day ownership changed and the keys were released.',
          ],
        },
        {
          p: [
            { strong: 'Texts: Taylor only.' },
            ' Your notes say Taylor signed your text consent form with the buyer intake on 8/14/2026, and Jamie said email only, no texts. Taylor gets the texts; Jamie gets email.',
          ],
        },
        {
          p: [
            { strong: 'Left out on purpose:' },
            ' 2 of your notes hold health, money or family details. None of it is in the plan or the drafts. Read them yourself before you decide what to say in person. The price, loan, commission and wire lines in Kit’s email are left out too.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Taylor and Jamie Mockwood closed on their first home, 1482 W Fakewater Ln in Pretend Springs, today, Tuesday, November 10, 2026. Their first year runs from tonight’s card through a call on Monday, February 8, 2027 and a check-in on Tuesday, May 11, 2027, and on Wednesday, November 10, 2027 they join your sphere plan. Do this first: write the card to go with the framed sketch and the pie tonight, and send the thank-you and the painter and fence names, because Taylor wants the front room painted before the couch is delivered.',
          ],
        },
        { h: 'Your first-year plan' },
        {
          table: {
            caption: 'Every date from the closing date',
            head: ['Touch', 'Date', 'What', 'Channel', 'From the notes'],
            rows: [
              [
                'Closing day',
                'Tuesday, November 10, 2026',
                'The card with the framed sketch and the pie; the thank-you email; the vendor introductions (Taylor asked for a painter)',
                'Card, hand-delivered tonight; email to both',
                'The maple, the morning light, Waffles; the front room and the side fence',
              ],
              ['Week 1', 'Tuesday, November 17, 2026', 'The review request, the same ask every client gets', 'Email to both; text to Taylor', 'Their first week in the house'],
              ['Day 30', 'Thursday, December 10, 2026', 'A check-in and the property tax reminder (Davis County)', 'Email to both', 'How the front room turned out'],
              ['Day 90', 'Monday, February 8, 2027', 'A call', 'Call Taylor or Jamie', 'Jamie’s plans for the vegetable garden in the spring'],
              ['Month 6', 'Tuesday, May 11, 2027', 'A check-in', 'Text to Taylor; email to Jamie', 'The garden, and whether the side fence is still on for summer'],
              [
                'First anniversary',
                'Wednesday, November 10, 2027',
                'Handed to sphere-touch-plan: Taylor and Jamie join your sphere plan as past clients',
                'Set up in sphere-touch-plan',
                '',
              ],
            ],
          },
        },
        { h: 'Closing day' },
        { p: [{ strong: 'Card text' }, ' (tonight, with the framed sketch and the pie)'] },
        {
          p: [
            'Taylor and Jamie, Welcome home! I hope that south-facing kitchen window gives you the morning light you fell for, and that Waffles gets plenty of time in the backyard. Enjoy the sketch and the pie, and thank you for trusting me with your first home. Sam',
          ],
        },
        { p: [{ strong: 'Thank-you email' }, ' (tonight, to Taylor and Jamie)'] },
        {
          email: {
            subject: 'Thank You, And Welcome Home',
            body: [
              'Hi Taylor and Jamie,',
              'Congratulations: 1482 W Fakewater Ln is officially yours. Thank you for trusting me with your first home.',
              'The big maple in the backyard and the morning light through the south-facing kitchen window are what sold you on this one, and I hope they’re even better now that they’re yours.',
              'I’ll check in next Tuesday, November 17, to see how the move is going. Until then, if anything about the house comes up, call me.',
              'Sam Testerfield',
              'Example Ridge Realty',
              'To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from Sam Testerfield, Example Ridge Realty.',
            ],
          },
        },
        { h: 'Review request' },
        { p: [{ strong: 'Email' }, ' (Tuesday, November 17, 2026, to Taylor and Jamie)'] },
        {
          email: {
            subject: 'Would You Share How It Went?',
            body: [
              'Hi Taylor and Jamie,',
              'I hope your first week at 1482 W Fakewater Ln has gone smoothly.',
              'I ask every client the same favor after closing: would you write an honest review of what it was like to work with me? Whatever your experience was, it helps the next person choosing an agent, and it helps me get better.',
              'Google: https://example.com/reviews/google/sam-testerfield',
              'Zillow: https://example.com/reviews/zillow/sam-testerfield',
              'A few sentences on either one is plenty. Thank you either way.',
              'Sam Testerfield',
              'Example Ridge Realty',
              'To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from Sam Testerfield, Example Ridge Realty.',
            ],
          },
        },
        {
          p: [
            { strong: 'Text to Taylor' },
            ' (Tuesday, November 17, 2026, between 8 a.m. and 8 p.m. Consent: your notes, “Taylor signed our text consent form with the buyer intake on 8/14/2026.”)',
          ],
        },
        {
          p: [
            'Hi Taylor, it’s Sam Testerfield with Example Ridge Realty. Hope week one at Fakewater went well! I ask every client: would you write an honest review of working with me? https://example.com/reviews/google/sam-testerfield Reply STOP to opt out.',
          ],
        },
        { p: ['No text to Jamie: your notes say email only, no texts.'] },
        { h: 'Vendor introductions' },
        { p: [{ strong: 'Email' }, ' (tonight, Tuesday, November 10, 2026, to Taylor and Jamie; Taylor asked for a painter)'] },
        {
          email: {
            subject: 'A Painter For The Front Room, And A Fence Company For Later',
            body: [
              'Hi Taylor and Jamie,',
              'Here’s the painter Taylor asked about, so the front room can be done before the couch is delivered, plus a fence company for when you’re ready to replace the side fence next summer.',
              'Painting: Sample Summit Painting, Dale Fakerson, 801-555-0142. Full disclosure: Dale is my brother-in-law.',
              'Fencing: Example Fence Co., Pat Postwell, 801-555-0167. They do vinyl and wood fences.',
              'I don’t receive anything for referring either one, and you’re free to use anyone you like.',
              'Sam Testerfield',
              'Example Ridge Realty',
              'To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from Sam Testerfield, Example Ridge Realty.',
            ],
          },
        },
        {
          p: [
            'Not introduced: Pretend Gardens Landscaping (Jamie plans to plant the garden herself, so it’s a talking point, not a job) and the rest of your list (nothing in the notes calls for them).',
          ],
        },
        { h: 'Property tax reminder' },
        { p: [{ strong: 'Day 30 email' }, ' (Thursday, December 10, 2026, to Taylor and Jamie)'] },
        {
          email: {
            subject: 'A Property Tax Form To Watch For',
            body: [
              'Hi Taylor and Jamie,',
              'One month in! I hope the front room came out the way you wanted.',
              'One thing to watch your mail for: Utah gives a lower taxable value to a home its owners live in as their primary residence, and after a sale the county assessor may send the new owners a form about it. If a form from the Davis County Assessor about your home’s primary residential exemption arrives, fill it out and return it by the date on the form.',
              'Utah’s process changes on January 1, 2027, so if no form arrives, a quick call to the assessor’s office can tell you whether to file anything for 2027. Next summer’s valuation notice will show whether the exemption is on your home.',
              'Davis County Assessor: https://www.daviscountyutah.gov/assessor/primary-residence',
              'Questions about your taxes are best for the assessor’s office or a tax professional.',
              'Sam Testerfield',
              'Example Ridge Realty',
              'To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from Sam Testerfield, Example Ridge Realty.',
            ],
          },
        },
        { h: 'Set it up in Follow Up Boss' },
        {
          p: [
            { strong: 'Classic account (Admin > Action Plans).' },
            ' An admin creates a plan named “First Year After Closing” with five Create Task steps (tasks, not automatic emails, so each touch stays personal): run 0 days after, “Closing day: card and thank-you email”; 7 days after the previous step, “Week 1: review request, the same ask for every client”; 23 days after, “Day 30: check-in; buyers get the property tax reminder”; 60 days after, “Day 90: call”; 92 days after, “Month 6: check-in.” That’s days 0, 7, 30, 90 and 182, the same dates as the plan above. Tonight, start it by hand on the profile you keep for the Mockwoods. If Taylor and Jamie are two contacts, start it on one, so the tasks don’t double.',
          ],
        },
        { h: 'Check before sending' },
        {
          items: [
            'Dates: the closing date is Tuesday, November 10, 2026, from “Funded and recorded: Tuesday, 11/10/2026, 2:14 PM.” Week 1 is the closing date plus 7 days, Tuesday, November 17, 2026; day 30, Thursday, December 10, 2026; day 90, Monday, February 8, 2027; month 6, plus 182 days, Tuesday, May 11, 2027.',
            '“I don’t receive anything for referring either one” comes from your list’s header (“I don’t take referral fees or anything else from anyone on this list”). Confirm it’s still true for both before you send.',
            'Review links: open each once to check it lands on your profile. Send this same ask to every client, whatever you expect them to say.',
            'Texts: keep Taylor’s written consent record. Send each text by hand, one at a time, between 8 a.m. and 8 p.m. Mountain. No texts to Jamie.',
            'Email footer: fill [Unsubscribe Link] and [Sender Postal Address], and confirm the wording with your broker. Every email carries the full footer, the thank-you and the vendor email included. That’s a conservative default.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", items 1 to 10, in its order; page-notes.md, "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: touches already past and moved up, a reward for a review left out (and why), a request to ask only happy clients answered with the same ask for everyone, a vendor who pays for referrals left out, a vendor your brokerage owns part of that needs its disclosure form first, no text consent, and a line saying notes about health, money or family were left out on purpose.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: who closed what and when, the first year in one line, and what to do first.',
        },
        {
          title: 'What the AI used',
          body: 'The names, the side, the property, the closing date and the county, and where each one came from, plus who agreed to texts.',
        },
        {
          title: 'Your first-year plan',
          body: 'Closing day, week 1, day 30, day 90 and month 6, each with its weekday and date worked out from the closing date and a talking point from your notes. The first anniversary hands your client to Sphere Touch Plan.',
        },
        {
          title: 'The card and the thank-you',
          body: 'A handwritten card in a few sentences and a thank-you email, each built from what your client loved about the home. No asks in either.',
        },
        {
          title: 'A review request',
          body: 'The same ask for every client, with your review links: an email, and a text for anyone who agreed to texts. No stars, no reward.',
        },
        {
          title: 'Vendor introductions',
          body: 'Only vendors on your own list, only for what your client asked about or plans, with every relationship on your list said in plain words.',
        },
        {
          title: 'A property tax reminder',
          body: 'For a buyer, a day 30 email that points to the county assessor about the home’s exemption. It never says whether they qualify or what they’ll save.',
        },
        {
          title: 'What to set up in Follow Up Boss',
          body: 'A plan of five tasks on days 0, 7, 30, 90 and 182, for a classic action plan or Automations 2.0, and the home anniversary handoff. Steps you or an admin take.',
        },
        {
          title: 'Check before sending',
          body: 'Every date as the closing date plus a number of days, where every fact came from, each vendor as your list shows it, each review link, each text’s consent record and your email footer.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads and drafts. You decide and send.',
      items: [
        {
          label: 'Run',
          title: 'The AI works out the year',
          body: 'Reads the closing email or record and your notes, works out every date from the closing date, reads who agreed to texts, and matches your notes to your vendor list.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The plan, the card, the thank-you, the review request, the vendor introductions, the property tax reminder and the Follow Up Boss steps. Nothing goes out until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'What your client hears and when, every consent record, your vendor list and every relationship behind it, any disclosure form, the gift, and every tax, legal or insurance question. The AI never changes your CRM.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need". No ChatGPT Free numbers, and no prices.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner turns on skills and code execution',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro.',
        },
        {
          title: 'The closed deal',
          body: 'Your TC’s closing email, a Sisu or Follow Up Boss record, or your own notes: names, the property, the closing date, buyer or seller.',
          tag: '“Where to get your files” shows how',
        },
        {
          title: 'Your notes about the client',
          body: 'What they loved about the home, what they plan, what they asked you for, the gift, and who agreed to texts. A few lines is enough.',
        },
        {
          title: 'Your vendor list and review links',
          body: 'Both optional. Write any relationship next to a vendor. Without a list, the AI introduces no one.',
        },
        {
          title: 'No connector',
          body: 'You attach or paste files. Nothing connects to your CRM, and nothing in it changes.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From" (Google Business Profile Help,
      // checked 2026-11-10). Attaching in Claude is /appointment-follow-up's (Claude's help center,
      // "Uploading files to Claude", checked 2026-11-08). No Sisu or Zillow click path was checked, so
      // none is given.
      kind: 'list',
      heading: 'Where to get your files',
      items: [
        {
          title: 'Your TC’s closing email',
          body: 'Open it, select all, copy, and paste it into the chat, or save it as a PDF and attach it. The AI leaves the price, commission, wire and loan lines out of everything it writes.',
        },
        {
          title: 'A Sisu or Follow Up Boss record',
          body: 'Open the transaction in Sisu, or the person’s profile in Follow Up Boss, and copy the page text or take a screenshot. Include any text consent field and the close date.',
        },
        {
          title: 'Your vendor list',
          body: 'Any form works: a doc, a sheet or a note. Write any relationship next to the vendor, such as “my brother-in-law,” “my brokerage owns part of it” or “pays a referral fee.”',
        },
        {
          title: 'Your Google review link',
          body: 'Go to your Business Profile, click Read Reviews, then Get more reviews (the share icon), then Copy. Google makes the QR code only on a computer.',
        },
        {
          title: 'Other review links',
          body: 'Use the review request link you already send for Zillow or any other site.',
        },
        {
          title: 'Attaching a file in Claude',
          body: 'Click the + at the lower left of the chat box, then Add files or photos. Pick the file and click Open. Or drag the file into the chat.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your files, then paste these words with them. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'With your files attached',
          items: [
            'We just closed. Here’s my TC’s email and my notes. Build their first year.',
            'Closed with the Samplesons last Friday and I’m behind. Sisu record attached.',
            'Here’s my vendor list. They asked for a painter and a plumber.',
          ],
        },
        {
          label: 'When someone said yes to texts',
          items: ['Taylor said yes to texts by email this morning. Add Taylor’s texts.'],
        },
        {
          label: 'Just one piece',
          items: ['Just the card and the thank-you, please.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "Connor's Filter" and FAQ.
          q: 'Follow Up Boss can already schedule these touches. Why this?',
          a: [
            'It can, and the AI tells you how to set that up: a plan of tasks on days 0, 7, 30, 90 and 182. What it adds is the writing, from this deal’s own facts, like the maple they loved or the painter they asked for, and the review and vendor rules Follow Up Boss doesn’t know.',
          ],
        },
        {
          // page-notes.md, FAQ; references/reviews-and-vendors.md, Reviews.
          q: 'Can I give a gift card for a five-star review?',
          a: [
            'No. The FTC’s review rule bars any reward tied to what a review says (16 CFR 465.4), and Google bars any reward for a review at all. The AI leaves the reward out and drafts an ask you can send every client. It offers no reward of any kind for a review: no gift, gift card, discount, drawing or donation, before or after, tied to the rating or not. A closing gift is fine, as long as it’s a thank-you for the closing and never tied to a review.',
          ],
        },
        {
          // page-notes.md, FAQ; references/reviews-and-vendors.md, Reviews (16 CFR 255.2).
          q: 'Why does it draft the review ask for a client who was unhappy?',
          a: [
            'Asking only the clients you expect to be happy is called review gating. The FTC’s Endorsement Guides give it as an example of a practice that can be deceptive, and Google bars it. Every client gets the same ask. Whether and when to send it is still your call.',
          ],
        },
        {
          // page-notes.md, FAQ; references/reviews-and-vendors.md, Vendors (RESPA Section 8).
          q: 'My painter is my brother-in-law. Can I still recommend him?',
          a: [
            'Yes. The AI says so in the email, in plain words, and tells your client they’re free to use anyone. It won’t introduce a vendor your list says pays you for referrals: RESPA Section 8 bars that for settlement services, and your broker decides the rest. An insurance agency or lender your brokerage owns part of needs your brokerage’s Affiliated Business Arrangement Disclosure first.',
          ],
        },
        {
          // page-notes.md, FAQ and "Tested and Not Tested"; references/utah-client-care.md.
          q: 'What does it say about property taxes, and what about my state?',
          a: [
            'For a Utah buyer, the day 30 email says to watch for the county assessor’s form about the home’s primary residential exemption and return it by the date on it, notes that Utah’s process changes on January 1, 2027, and links the county. It never says whether they qualify or what they’ll save. Outside Utah, it says to ask the county assessor whether an application is needed, and that state rules weren’t checked. We tested it on made-up Utah and Idaho closings, not yet on real files or inside ChatGPT, so run the practice files first.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, Guardrails (Conservative defaults); outreach-rules.md, Conservative
          // Defaults.
          q: 'Why is it stricter than the law?',
          a: [
            'A few rules are our conservative defaults, stricter than the law in places. Every email carries the full footer (an opt-out, your postal address and a line saying it’s a marketing email), the thank-you and the vendor introductions included. No reward of any kind for a review, before or after, tied to the rating or not. And no call or voicemail on a Sunday or a legal holiday. You can calibrate them with your own legal counsel: tell the AI the rule your counsel approved, and it follows that and says so in Check before sending.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'First anniversary coming up? ',
        { link: 'Sphere Touch Plan', href: '/sphere-touch-plan', sameTab: true },
        ' keeps past clients in touch after year one, with a plan by tier and this week’s messages.',
      ],
    },
  ],

  unlockKey: 'pccc-unlocked',
});
