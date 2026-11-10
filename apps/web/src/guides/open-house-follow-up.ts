// Every word on /open-house-follow-up that is its own: the landing page for Open House Follow-Up, a
// skill (`skills/open-house-follow-up/`, version 1.0) that turns one open house's sign-in sheet (a
// sign-in app's export, a Google Form, a typed list or a photo of a paper sheet) and the agent's notes
// into flags, a bottom line, an agent-only visitor list, a follow-up for every visitor (an email, and a
// text only for a visitor who said yes to texts), a seller update (a Listing Agent Update when the agent
// hosted a teammate's listing), dated next steps and Check before sending. What every skill page says
// the same way is in `skill-page.ts` (D-052).
//
// It is paid (the agent set of the Amplified Skill Library), so the page is drawn with its hero and
// sample and the Skill Library card in place of the sign-up and the setup (D-082, automatic from the
// catalog through `skill`). The free words and the setup below stay for the day it is free.
//
// The words come from the skill itself (SKILL.md, references/open-house-guide.md and
// fair-housing-and-representation.md, utah-open-house-notes.md), its page notes, and its graded runs
// (the practice run 13 of 13, eval 1 12 of 12 after one fix, eval 2 9 of 9), so the page promises what
// the skill does. The sample is sample.md, the graded practice run, cut only by whole flags, rows,
// sections, steps and sentences; every draft it shows is whole, footer included.
//
// What the page holds to, as SKILL.md does: drafts only, never sent, never written to a CRM. A visitor
// who says they have an agent gets a thank-you only, and their questions go through their agent. Texts
// only for a visitor who checked a consent box or whom the agent says agreed; a phone number is never
// consent. The home is described, never the visitors, and never who the home suits. No price advice to
// the sellers, and no visitor names in their update.
//
// Calls left open, and how the page handles them:
//   - Represented visitors: the page cites the REALTOR Code of Ethics (Article 16) and Utah's licensing
//     rule only as the references state them (fair-housing-and-representation.md and
//     utah-open-house-notes.md, checked 2026-11-10), and sends questions to the broker. Whether a
//     brokerage wants even a thank-you sent to another agent's client is left to the agent ("Own").
//   - Email footers: every visitor email carries an opt-out and [Sender Postal Address], and the ones
//     that offer services carry a marketing line (the shared outreach-rules.md, CAN-SPAM). The page says
//     only that every email has an opt-out footer; the marketing line on one-to-one follow-ups is
//     Connor's call (DECISIONS entry).
//   - Utah's Sunday and holiday limit on solicitation calls (Utah Code 13-25a-103): the section speaks
//     of calls, and whether it reaches texts was not confirmed. The page says "limits on solicitation
//     calls" and nothing about texts.
//   - A photo of a real handwritten sheet, real sign-in app exports, an XLSX and more than 12 visitors
//     were not tested. The photo is in "Where to get your sign-in sheet", marked untested, and not in
//     "What to say". Claude Free and the ChatGPT Project inside ChatGPT are untested too; the page says
//     both, as the other skill pages do.
//   - Curb Hero's click path is its help center's (checked 2026-11-10); no other sign-in app's was
//     checked, so the page names no other app's menu.
//
// The practice set is two files (the sign-in export and the notes), attached file by file.
// `setupMinutes` is an estimate (page-notes gives none): 10, as the other skill pages with a ChatGPT
// version say for the same shared steps. The note points to Appointment Follow-Up, for a visitor who
// becomes an appointment (it is in SKILL.md's "Not for" line and already a page).
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const OPEN_HOUSE_FOLLOW_UP: Guide = skillPage({
  slug: 'open-house-follow-up',
  skill: 'open-house-follow-up',
  title: 'Open House Follow-Up',

  meta: {
    title: 'Open House Follow-Up: A Free AI Skill · Amplified Impact',
    description:
      'Upload your open house sign-in sheet and your notes, and get a follow-up for every visitor and a recap for your sellers. Visitors with an agent get a thank-you only, and texts go only to visitors who said yes to texts. A free skill for Claude and ChatGPT.',
  },

  // Non-breaking spaces keep the audience on one line at phone width, as /appointment-follow-up does.
  eyebrow: 'Free AI Skill · For Open House Hosts',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Upload your open house sign-in sheet and your notes, and the AI hands back a follow-up for every visitor and a recap for your sellers. Every visitor who has an agent gets a thank-you only, and texts go only to the visitors who said yes to texts.',
  outcome: { n: '03', title: 'Follow Up the Same Day', body: 'A draft for every visitor and a recap for your sellers.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI drafts every follow-up. It never sends anything or changes your CRM.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophe, as on every page). The run date
    // changes the "written later" flags, so the note gives the open house's date.
    prompt:
      'Here’s the sign-in export and my notes from my open house. I’m Riley Sampleton with Example Peak Realty, the listing agent. Write my follow-ups and the seller update.',
    note: [
      'There are two files: a made-up sign-in export from a Sunday open house on November 8, 2026, and the agent’s notes. You’re playing the listing agent, Riley. Every name, address and number in them is made up. Run on a later day, the AI flags the promises that are already due. ',
    ],
  },

  real: {
    // SKILL.md, section 1 (the sheet and the notes) and section 4 (a teammate's listing).
    body: ['Start a new chat the same way, attach your sign-in sheet and your notes, and say this.'],
    prompt: 'Here’s my open house sign-in sheet and my notes. Write my follow-ups and the seller update.',
    note: [
      'If you hosted a teammate’s listing, say so, and the AI writes the update to the listing agent. Before anything goes out, check every date, count and name in the ',
      { strong: 'Check before sending' },
      ' list, and send a text only to a visitor who said yes to texts.',
    ],
  },

  chatgpt: { paste: chatgptPaste('open-house-follow-up') },

  sections: [
    {
      // sample.md (the practice run, 13 of 13 checks), shortened, in the output's own order and its own
      // words, cut only by whole flags, rows, sections, steps and sentences: five of eight flags, the
      // bottom line, five of ten visitor rows, three of nine visitor sections (each whole, footer
      // included), the whole seller update, four of nine next steps, and five of twenty-seven rows of
      // Check before sending. "pricing-conversation-prep" is written as the page's name, Pricing
      // Conversation Prep, as /appointment-follow-up does.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI hands back',
      body: 'What the AI wrote from the practice files: a made-up sign-in export and notes from a made-up agent, Riley, after a Sunday open house. It’s the same set you practise on in setup.',
      title: 'Open House Follow-Up: 2468 Sample Aspen Ln, Sunday, November 8',
      note: 'Made-up example, run two days after the open house. Shortened: five of the eight flags, five of the ten visitors in the list, three of the nine visitor sections, four next steps and five rows of Check before sending. The bottom line, the drafts shown and the seller update are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Two visitors have an agent: thank-you only.' },
            ' Quinn Placeholder (agent: Taylor Samplewood) and Sage Sampleford (agent: Drew Fakeman). Their emails thank them and offer nothing else. Quinn’s water heater question goes to Taylor.',
          ],
        },
        {
          p: [
            { strong: 'Texting consent:' },
            ' “Consent To Text” is Yes for five visitors. Texts are drafted for three: Morgan Exampleton, Casey Mockwood and Lee Samplesmith. Quinn consented but has an agent, so Quinn gets one thank-you, by email. Kendall Mockingham consented but left no phone number: email only. Everyone else is email only. A phone number on the sheet isn’t consent.',
          ],
        },
        {
          p: [
            { strong: 'No draft: Blake Fakington (row 9).' },
            ' A phone number only, no email, and “Consent To Text” is No.',
          ],
        },
        {
          p: [
            { strong: 'Left out of the seller update:' },
            ' your note about dropping the price. That conversation is yours with Robin and Kerry; Pricing Conversation Prep helps you prepare it.',
          ],
        },
        {
          p: [
            { strong: 'Left out on purpose (fair housing):' },
            ' descriptions of visitors, a note about who the home suits, and a question about who lives in the area. The drafts and the update describe the home only.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Sunday’s open house at 2468 Sample Aspen Ln had 11 sign-ins from 10 visitors (you counted about 12 groups), and 2 of them have an agent. Below are 9 emails, 3 texts and the update for Robin and Kerry; Blake gets no draft. Send the sellers’ update and get the HOA details for Morgan first, because both were due before today.',
          ],
        },
        { h: 'Visitor list (agent only)' },
        {
          table: {
            caption: 'Visitor list, 5 of 10 visitors',
            head: ['Row', 'Visitor', 'Agent', 'Text consent', 'Drafts', 'Timeframe', 'From your notes (the home)'],
            rows: [
              ['1, 11', 'Morgan Exampleton', 'No', 'Yes', 'Email, text', '0-3 Months', 'Loved the kitchen; asked about the HOA fee and what it covers; you promised it by Monday'],
              ['2', 'Quinn Placeholder', 'HAS AN AGENT: Taylor Samplewood', 'Yes', 'Email, thank-you only', '3-6 Months', 'Asked the water heater’s age; you said you’d get it to Taylor'],
              ['4', 'Jordan Testwell', 'Unknown (blank)', 'Blank', 'Email', 'Not given', 'Quick walk-through'],
              ['9', 'Blake Fakington', 'No', 'No', 'None: no email, no consent', '0-3 Months', 'Asked if the HOA allows an RV in the driveway'],
              ['10', 'Kendall Mockingham', 'No', 'Yes, but no phone', 'Email', '6-12 Months', 'Liked the garden boxes; asked if the washer and dryer stay'],
            ],
          },
        },
        { h: 'Visitor drafts' },
        { p: [{ strong: '1. Morgan Exampleton: NO AGENT, TEXT OK' }] },
        {
          email: {
            subject: 'Thanks For Coming To 2468 Sample Aspen Ln',
            body: [
              'Hi Morgan,',
              'Thanks for coming to the open house at 2468 Sample Aspen Ln on Sunday, and for coming back for a second look. I’m glad the kitchen stood out.',
              'You asked about the HOA fee and what it covers. I’m getting those details from the sellers and will send them as soon as I have them.',
              'If you have other questions or want to see it again, just reply here. And if you’re touring other homes, I’d be glad to help.',
              'Riley',
              'This is a marketing email from Riley Sampleton, Example Peak Realty. To stop these emails, reply UNSUBSCRIBE. [Sender Postal Address]',
            ],
          },
        },
        { p: ['Consent: “Consent To Text: Yes” on the sheet (rows 1 and 11).'] },
        {
          p: [
            'Hi Morgan, it’s Riley Sampleton with Example Peak Realty. Thanks for coming to 2468 Sample Aspen Ln on Sunday. I’m getting the HOA details you asked about and will email them. [Agent Phone]. Reply STOP to opt out.',
          ],
        },
        { p: [{ strong: '2. Quinn Placeholder: HAS AN AGENT (Taylor Samplewood), THANK-YOU ONLY' }] },
        {
          email: {
            subject: 'Thanks For Visiting 2468 Sample Aspen Ln',
            body: [
              'Hi Quinn,',
              'Thanks for coming to the open house at 2468 Sample Aspen Ln on Sunday. I’ll get the water heater’s age to Taylor Samplewood, so you’ll hear it from Taylor.',
              'Riley',
              'To stop these emails, reply UNSUBSCRIBE. [Sender Postal Address]',
            ],
          },
        },
        { p: [{ strong: '4. Jordan Testwell: AGENT STATUS UNKNOWN, EMAIL ONLY' }] },
        {
          email: {
            subject: 'Thanks For Coming To 2468 Sample Aspen Ln',
            body: [
              'Hi Jordan,',
              'Thanks for walking through the open house at 2468 Sample Aspen Ln on Sunday.',
              'If any questions about the home come up, just reply here. And if you’re not already working with an agent, I’d be glad to help.',
              'Riley',
              'This is a marketing email from Riley Sampleton, Example Peak Realty. To stop these emails, reply UNSUBSCRIBE. [Sender Postal Address]',
            ],
          },
        },
        { h: 'Seller update' },
        {
          email: {
            subject: 'Sunday’s Open House At 2468 Sample Aspen Ln: Recap',
            body: [
              'Hi Robin and Kerry,',
              'Here’s how Sunday went. 10 visitors signed in (11 sign-ins, because one came back for a second look), and I counted about 12 groups, so some didn’t sign in. 2 said they’re working with an agent. On timing, 3 said 0 to 3 months, 3 said 3 to 6 months, 2 said 6 to 12 months, 1 said just looking, and 1 didn’t say.',
              'What visitors liked: the kitchen island, the light in the front room, the backyard and its garden boxes, and the trail access out back.',
              'What gave people pause: two groups said the second bedroom is small, and one visitor said the price seemed high for the square footage.',
              'Questions to answer, when you can:',
              'The HOA fee and what it covers',
              'How old the furnace is',
              'How old the water heater is',
              'Whether the HOA allows an RV in the driveway',
              'Whether the washer and dryer stay',
              'One visitor asked for a second look, this evening, Tuesday, November 10, and I’m setting it up.',
              'Riley',
            ],
          },
        },
        { h: 'Next steps' },
        {
          items: [
            'You, today, Tuesday, November 10: confirm the Sunday-night recap to Robin and Kerry went out. If it didn’t, send the update above now (promised Sunday, November 8).',
            'You, today: the HOA details for Morgan were due Monday, November 9. Get the HOA fee and what it covers from Robin and Kerry (it’s the first question in the update), then send it to Morgan.',
            'You, today, between 8 AM and 8 PM Mountain: send the 9 emails and the texts to Morgan, Casey and Lee.',
            'You, once Robin and Kerry answer: the water heater’s age goes to Taylor Samplewood, Quinn’s agent, not to Quinn. The washer and dryer answer goes to Kendall.',
          ],
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 5 of 27 rows',
            head: ['Item', 'Where it’s from'],
            rows: [
              ['11 sign-ins, 10 visitors', 'Sheet: 11 rows; rows 1 and 11 are Morgan Exampleton (same email and phone)'],
              ['About 12 groups', 'Notes: “I counted about 12 groups, a couple didn’t sign in”'],
              ['Monday, November 9 (Morgan’s HOA details)', 'Resolved from “Told Morgan I’d send it by Monday.” Already past; the email gives no new date'],
              [
                'Consent for each text',
                'Morgan (rows 1 and 11), Casey (row 5), Lee (row 8): “Consent To Text: Yes.” Confirm your sign-in form’s consent wording named you or Example Peak Realty and text messages, and keep that record with the date and number',
              ],
              ['[Agent Phone], [Sender Postal Address]', 'Fill in your real phone number and postal address'],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", items 1 to 7, in its order; page-notes.md, "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: how the sheet’s columns were read, every visitor who has an agent, who can get a text and why the rest can’t, visitors with no draft and why, duplicate sign-ins, promises already due when you run it a day or more later, a teammate’s listing, your own price opinion left out of the update, an open house outside Utah, and a line saying something was left out on purpose.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: the open house, the count, how many drafts of each kind, and the one thing to send first.',
        },
        {
          title: 'A visitor list, for you',
          body: 'One row per visitor: whether they have an agent, whether they said yes to texts, which drafts they get, their timeframe, and what your notes say about the home.',
        },
        {
          title: 'A follow-up for every visitor',
          body: 'An email under 120 words with a subject that names the home and an opt-out at the bottom, plus a text for each visitor who said yes to texts, with where that yes came from. A visitor who has an agent gets a thank-you only. The drafts follow your voice profile, if you made one with our free guide.',
        },
        {
          title: 'A seller update',
          body: 'The count from the sheet, what visitors liked, what gave them pause, and the questions to answer, under 200 words and with no visitor names. When you hosted a teammate’s listing, it goes to the listing agent instead.',
        },
        {
          title: 'Next steps, with dates',
          body: 'Promises already due come first. Then when to send the drafts, every promise from your notes, and the answers to send through a visitor’s agent.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, count, name, promise and quoted comment in the drafts, with where it came from, and the consent behind every text.',
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
          title: 'The AI reads every row and every note',
          body: 'Merges duplicate sign-ins. Sorts each visitor by whether they have an agent and whether they said yes to texts. Counts for the update. Turns “Tuesday” into a date.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'Every visitor email and text, and the seller update. Nothing reaches a visitor, your sellers or your CRM until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Who gets a text, and the consent records. Whether to contact a visitor who has an agent at all. Every price conversation with your sellers, the fair housing review and the Do Not Call check. Ethics and representation questions go to your broker.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need" and "Install", worded as /appointment-follow-up words the shared
      // plan facts. No ChatGPT Free upload limits as numbers, and no prices.
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
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro. The ChatGPT version works from a sheet and notes you upload or paste.',
          tag: 'Free ChatGPT has upload limits. Pasting works too.',
        },
        {
          title: 'A computer, once',
          body: 'Add the skill on claude.ai or in the Claude desktop app, or set up the Project on the ChatGPT website. After that, Claude uses the skill on your phone too. Exporting a sign-in sheet is easiest on a computer.',
        },
        {
          title: 'Your sign-in sheet',
          body: 'An export from your sign-in app, a Google Form’s responses, a typed list, or a photo of a paper sheet. You don’t retype anything.',
          tag: '“Where to get your sign-in sheet” shows how',
        },
        {
          title: 'Your notes',
          body: 'What visitors liked, asked and were promised, typed or dictated after the open house. The follow-ups are only as specific as your notes.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond the plans you already have and the sign-in app you already use. No connectors.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From": Curb Hero's and Google's help
      // centers, checked 2026-11-10. No other sign-in app's menu was checked, so none is named. Attaching
      // in Claude is Claude's help center ("Uploading files to Claude", checked 2026-11-10). The texting
      // line is page-notes.md's "Texting, in one line" (the shared outreach-rules.md).
      kind: 'list',
      heading: 'Where to get your sign-in sheet',
      items: [
        {
          title: 'Curb Hero',
          body: 'Open My Leads. Tap the filter icon at the top right to pick the listing. Tap the share icon at the top right and send the leads to yourself. They arrive as a CSV file.',
        },
        {
          title: 'Another sign-in app',
          body: 'Use its export or download for that listing’s sign-ins, as a CSV or Excel file. Column names vary. The AI reads them and tells you how it read them.',
        },
        {
          title: 'A Google Form',
          body: 'Open the form in Google Forms and select Responses. Select the More icon, then Download responses (.csv).',
        },
        {
          title: 'A paper sheet',
          body: 'Take a clear photo of each page, flat, in good light, with every row in frame. When a letter in an email address is hard to read, the AI marks it for you to check instead of guessing. We haven’t tested a real handwritten sheet yet.',
        },
        {
          title: 'A typed list',
          body: 'Paste it into the chat: each visitor’s name, email and phone, and whether they have an agent or said yes to texts, if you know.',
        },
        {
          title: 'Your notes',
          body: 'Type or dictate them after the open house: what each visitor liked, asked and was promised. Attach them or paste them in.',
        },
        {
          title: 'Attaching a file in Claude',
          body: 'Click the + at the lower left of the chat box, then Add files or photos. Pick the files and click Open. Or drag the files into the chat.',
        },
        {
          title: 'Before you text anyone',
          body: 'Text only visitors who checked a consent box that named you or your brokerage, or who told you yes and you have a record of it. A phone number on the sheet isn’t consent. Every text the AI drafts ends with “Reply STOP to opt out.”',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", without the photo (untested).
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your sheet and notes or paste them in, then paste these words with them. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'After the open house, with the sheet and notes attached',
          items: ['Here’s my open house sign-in export and my notes. Write my follow-ups and the seller update.'],
        },
        {
          label: 'With a typed list',
          items: ['Saturday’s open house. I typed up the sign-in sheet below. Do the follow-ups and a quick update for my sellers.'],
        },
        {
          label: 'When you hosted a teammate’s listing',
          items: ['I held this open house for my teammate’s listing. Write the update to the listing agent.'],
        },
        {
          label: 'Just one piece',
          items: ['Just the seller update, please.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "What It Will Not Do"; SKILL.md, Guardrails.
          q: 'What won’t it do?',
          a: [
            'The AI won’t send, text or post anything, or write to your CRM. It won’t recommend a price or a price change to your sellers, or pass on your own price opinion: a visitor’s comment on the price goes in as feedback only. It won’t name visitors or share their contact details in the seller update. It won’t make up what a visitor said, liked or asked. If your sign-in app already sent an automatic thank-you, these are your personal follow-ups.',
          ],
        },
        {
          // page-notes.md, FAQ; references/fair-housing-and-representation.md (NAR Article 16, checked
          // 2026-11-10) and utah-open-house-notes.md (R162-2f-401b(1)(k)).
          q: 'Why does a visitor with an agent only get a thank-you?',
          a: [
            'The REALTOR Code of Ethics (Article 16) bars soliciting another agent’s client, and its standards send dealings with that client through their agent. Utah’s licensing rules also bar trying to take on a client you know is already represented. So the AI thanks them, offers nothing else, and sends any question they asked to their agent. It does this even when your notes say nothing is signed. Questions go to your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; the shared outreach-rules.md (TCPA and CAN-SPAM, checked 2026-11-08).
          q: 'Can I text everyone who left a phone number?',
          a: [
            'No. Marketing texts need the person’s consent, and a number on a sign-in sheet isn’t consent. A checked consent box whose wording named you or your brokerage counts, or a yes you can show. Everyone else gets an email. Every text names you and your brokerage and ends with “Reply STOP to opt out.” Every email ends with a way to opt out. Questions about texting rules go to your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; references/fair-housing-and-representation.md (42 U.S.C. 3604 and Utah
          // Code 57-21-5).
          q: 'Why won’t it write “perfect for a young family”?',
          a: [
            'Federal and Utah fair housing law bar statements that show a preference about who should live in a home. So the AI describes the home, leaves out how your notes describe visitors, and tells you, without repeating it, when it left a remark out. Questions about schools or safety get official sources, never an opinion. Fair housing questions go to your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 5 (Location); utah-open-house-notes.md.
          q: 'Does it work outside Utah?',
          a: [
            'Yes. Outside Utah, the thank-you-only rule, fair housing and the federal texting rules still apply, and the AI tells you it didn’t check your state’s rules. The Utah notes, Utah’s licensing rule and its Sunday and holiday limits on solicitation calls, switch on only for a Utah open house.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Tested and Not Tested".
          q: 'Which plan do I need, and what was tested?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan. In ChatGPT, a Project on Free, Go, Plus or Pro. We tested the skill in Claude on three made-up open houses: a sign-in app export, a Google Form export for a teammate’s listing, and a typed list. We haven’t tried it inside ChatGPT, on a photo of a real handwritten sheet, or on a real sign-in app’s export yet, so run the practice files first.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Booked a meeting with a visitor? ',
        { link: 'Appointment Follow-Up', href: '/appointment-follow-up', sameTab: true },
        ' turns that appointment’s transcript into the recap email and a Follow Up Boss note.',
      ],
    },
  ],

  unlockKey: 'ohfu-unlocked',
});
