// Every word on /listing-description-writer that is its own: the landing page for Listing Description
// Writer (`skills/listing-description-writer/`, version 1.0), a skill that turns a listing's own
// documents (an MLS input sheet or listing worksheet, the seller's notes, a feature list, a county
// record, or wording the agent already has) into flags, a bottom line, a fair housing review, MLS public
// remarks with a character count, two headlines, a social caption, Facts I Used and Check before
// sending. What every skill page says the same way is in `skill-page.ts` (D-052). It is in the Amplified
// Skill Library (paid, D-082), so the live page shows the hero and the sample with the Skill Library
// card in place of the sign-up and the setup; the setup words below stay here for the day it is free.
//
// The words come from the skill itself (SKILL.md and references/writing-guide.md,
// fair-housing-review.md and utah-mls-and-advertising.md), its page notes and its graded runs (two evals
// and the practice run, all passed, 2026-11-10), so the page promises what the skill does. The sample
// is sample.md, the graded practice run, cut only by whole items, rows and sentences; the review table,
// the remarks, the headlines and the caption are whole.
//
// What the page holds to, as SKILL.md does: drafts only, never posted or entered in the MLS. Every fact
// from the documents, never invented: no features, finishes, square footage, upgrades, views,
// distances, commute times, schools or HOA amenities they don't state. No private remarks, showing or
// lockbox details or occupancy in anything public. Properties, never people: no school, safety or
// neighborhood claims, and school and safety questions go to official sources.
//
// Calls left open, and how the page handles them:
//   - The Public Remarks character limit: UtahRealEstate.com's rules guide (revised February 11, 2026)
//     doesn't state one, and no official source found one. The page never gives a number for any MLS.
//     It says the skill keeps remarks under 1,000 characters only as a working target, and to confirm
//     the limit (SKILL.md, step 3).
//   - Utah's public marketing rule: the page says only what references/utah-mls-and-advertising.md
//     quotes from UtahRealEstate.com's guide (Rule 1.0.2: a sign, a post or an email blast is public
//     marketing, and the listing must be on the MLS within one business day). The practice run's
//     Monday, November 16 is its own weekday count, marked "confirm with your broker" in the sample.
//   - "Walking distance": the skill's review list is stricter than the law on purpose and says which
//     items are style cautions (fair-housing-review.md). The FAQ says so. HUD's 1995 advertising memo
//     is no longer on HUD's site, so nothing here relies on it.
//   - Reviewing the agent's own wording was tested on a headline idea (the practice run), not on a full
//     set of the agent's remarks; the FAQ says so. General mode (outside Utah), the ChatGPT Project
//     inside ChatGPT and real worksheets were not tested; the page says so.
//   - No connectors, so no connector step and no link to Customize > Connectors.
//
// It works in Claude (a skill) and in ChatGPT (a Project), from uploaded or pasted documents. The
// practice set is one PDF, a three-page worksheet with the sellers' notes on its last page.
// `setupMinutes` is an estimate (page-notes gives none): 10, as the other skill pages with a ChatGPT
// version say for the same shared steps. The note points to Pricing Conversation Prep, the sibling for
// pricing the listing (SKILL.md's description and its Stay in Lane guardrail).
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const LISTING_DESCRIPTION_WRITER: Guide = skillPage({
  slug: 'listing-description-writer',
  skill: 'listing-description-writer',
  title: 'Listing Description Writer',

  meta: {
    title: 'Listing Description Writer: A Free AI Skill · Amplified Impact',
    description:
      'Attach your listing worksheet and the seller’s notes, and get MLS public remarks, two headlines and a social caption written only from your documents, with a fair housing review of every line. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Listing Agents',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Attach your listing worksheet and the seller’s notes, and the AI hands back MLS public remarks, two headlines and a social caption, written only from what your documents say, with every line about people instead of the home caught and rewritten.',
  outcome: { n: '03', title: 'Paste With Confidence', body: 'Remarks, headlines and a caption, each fact sourced.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI drafts the copy. It never posts anything or touches your MLS.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page).
    prompt:
      'Here’s my listing worksheet for Example Aspen Way, with the sellers’ notes. Write the MLS remarks, headlines and an Instagram caption.',
    note: [
      'There’s one file: a made-up listing worksheet for a home in Sandy, with the sellers’ notes on its last page. You’re playing the listing agent, Riley. Every name, address and number in it is made up. ',
    ],
  },

  real: {
    // SKILL.md, section 1 (the inputs) and section 3 (the limit the agent gives); writing-guide.md,
    // section 6 (the caption ends with the agent's and brokerage's names).
    body: [
      'Start a new chat the same way, attach your listing worksheet and the seller’s notes (and the county record, if you have it), and say this.',
    ],
    prompt:
      'Here’s my listing worksheet and the seller’s notes. Write the MLS remarks, headlines and an Instagram caption.',
    note: [
      'Add your MLS’s Public Remarks character limit, your name and your brokerage to the message. Before you paste anything, check every number and feature in the ',
      { strong: 'Check before sending' },
      ' list against your worksheet.',
    ],
  },

  chatgpt: { paste: chatgptPaste('listing-description-writer') },

  sections: [
    {
      // sample.md (the practice run, 10 of 10 checks), shortened, in the output's own order and its own
      // words, cut only by whole items, rows and sentences: all four flags (the timing flag without its
      // last sentence), the bottom line, the whole Fair Housing Review (its table's rows as paragraphs),
      // the whole remarks, both headlines, the whole caption, four of twelve Facts I Used, and five of
      // fifteen rows of Check before sending.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI hands back',
      body: 'What the AI wrote from the practice file: a made-up listing worksheet for a home in Sandy, Utah, with the made-up sellers’ notes. It’s the same file you practise on in setup.',
      title: 'Listing Copy: 1184 E Example Aspen Way, Sandy',
      note: 'Made-up example. Shortened: one sentence cut from the timing flag, and a few lines kept from Facts I Used and Check before sending. The review, the remarks, the headlines and the caption are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Character limit not given.' },
            ' The worksheet’s Public Remarks limit line is blank. The remarks below run 742 characters. Confirm the limit in UtahRealEstate.com’s listing input screen, or ask Member Services at 801-676-5400, Ext. 2, and tell me if I need to trim.',
          ],
        },
        {
          p: [
            { strong: 'Not used until you confirm:' },
            ' the new roof in 2021. The sellers’ notes say it, but the worksheet’s roof field says no year was given on the seller disclosure, and the disclosure’s updates list doesn’t include a roof. Ask the sellers for the roofing invoice or permit; once you’ve confirmed it, tell me and I’ll add it.',
          ],
        },
        {
          p: [
            { strong: 'Timing (Utah): the Coming Soon sign starts the clock.' },
            ' The sign goes up Friday, November 13, but the listing goes live Thursday, November 19. Under UtahRealEstate.com’s Clear Cooperation and Public Marketing Rule, a yard sign is public marketing, and the listing must be on the MLS within one business day after it: Monday, November 16, counting weekdays. Talk to your broker about moving the go-live up or holding the sign.',
          ],
        },
        {
          p: [
            { strong: 'Fair housing review:' },
            ' 3 items flagged: 2 in the sellers’ notes and your headline idea on the worksheet. Each is cut or rewritten below.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'A 1987 rambler on 0.21 acres in Sandy, with gated RV parking, a back gate to the Example Creek Trail and a basement family room with a gas fireplace, written only from your worksheet and the parts of the sellers’ notes it supports. The headline idea and two lines of the sellers’ notes describe people rather than the home, so they’re rewritten or cut, and the 2021 roof stays out until you confirm it. Before anything goes public, sort out the sign date with your broker: the sign on Friday, November 13 means the listing has to be on the MLS by Monday, November 16.',
          ],
        },
        { h: 'Fair Housing Review' },
        // The review's three rows, each drawn as one paragraph (wording, from, why, rewrite), so all four
        // columns read on a phone; the words are the table's own.
        {
          p: [
            { strong: '“Family-Friendly Rambler Near Great Schools!”' },
            ' From your headline idea (worksheet, Marketing). ',
            { strong: 'Why:' },
            ' “Family-friendly” signals a preference for households with children (familial status). “Great schools” is a school quality claim the listing can’t support, and it can steer buyers. ',
            { strong: 'Rewrite:' },
            ' “Sandy Rambler With Gated RV Parking And A Trail Gate” (headline 1 below). If a buyer asks about schools, point them to the school district’s boundary lookup.',
          ],
        },
        {
          p: [
            { strong: '“Perfect for a young family, there are kids all over this street.”' },
            ' From the sellers’ notes. ',
            { strong: 'Why:' },
            ' Describes who should live there and who lives on the street (familial status). ',
            { strong: 'Rewrite:' },
            ' Cut. The features behind it stay: four bedrooms, a fully fenced backyard, the covered patio.',
          ],
        },
        {
          p: [
            { strong: '“Easy walk to the church on the corner”' },
            ' From the sellers’ notes. ',
            { strong: 'Why:' },
            ' Names a place of worship as a selling point (religion), and “easy walk” assumes how a buyer gets around. No distance is given. ',
            { strong: 'Rewrite:' },
            ' Cut. Keep the property fact from the same line: “a back gate to the Example Creek Trail.”',
          ],
        },
        {
          p: [
            'My drafts: checked against the same list, nothing flagged. They name no schools (the worksheet’s school fields carry those) and say nothing about who the home suits.',
          ],
        },
        { p: ['Final fair housing judgment is yours and your broker’s.'] },
        { h: 'Public Remarks' },
        {
          p: [
            'A 1987 rambler on a 0.21-acre lot in Sandy, with gated RV parking, a back gate to the Example Creek Trail and a basement family room with a gas fireplace. The main level has a vaulted living room, a kitchen with quartz counters (2022) and a gas range, a dining area, laundry, LVP floors (2022), two bedrooms, a full bath and a three-quarter bath. Downstairs are two more bedrooms, a three-quarter bath, the family room and storage; the basement is 90% finished. Outside are a covered patio, a fully fenced backyard, garden boxes that stay, and automatic sprinklers front and back. Brick and vinyl exterior. Two-car attached garage, central air, gas forced-air heat and a water heater replaced in 2020. Refrigerator, washer and dryer included.',
          ],
        },
        { p: ['742 characters (counted with code, spaces included). Limit not given: confirm it.'] },
        { h: 'Headlines' },
        {
          items: [
            'Sandy Rambler With Gated RV Parking And A Trail Gate (52 characters)',
            'Four Bedrooms, A Quartz Kitchen And A Covered Patio (51 characters)',
          ],
        },
        { h: 'Social caption' },
        { p: [{ strong: 'For Instagram, to post on Thursday, November 19, once the listing is live:' }] },
        {
          p: [
            'Just listed in Sandy: a 1987 rambler on 0.21 acres with gated RV parking and a back gate to the Example Creek Trail.',
          ],
        },
        {
          p: [
            'Quartz counters and LVP floors on the main level (2022), a vaulted living room, and a basement family room with a gas fireplace. Four bedrooms, three baths, a covered patio and a fully fenced backyard with garden boxes that stay.',
          ],
        },
        { p: ['Offered at $639,900. Message me for details or a showing.'] },
        { p: ['Riley Sampleton, Example Peak Realty'] },
        { p: ['#SandyUtah #UtahRambler'] },
        { p: ['80 words. The last line names your brokerage, as Utah law asks of an ad.'] },
        { h: 'Facts I Used' },
        {
          items: [
            'Four bedrooms (two main, two basement); a full bath and a three-quarter bath on the main, a three-quarter bath in the basement; three baths in all: worksheet, Rooms by Level',
            'Quartz counters (2022), LVP on the main level (2022), water heater (2020): worksheet, Updates from the seller disclosure; the sellers’ notes say the same',
            'Covered patio, fully fenced backyard, back gate to the Example Creek Trail, garden boxes: worksheet, Outdoor',
            'Everything in the agent-only fields (agent remarks, showing instructions and the lockbox, occupancy, the owners’ names and the contacts): left out on purpose',
          ],
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 5 of 15 rows',
            head: ['Item in the drafts', 'Source'],
            rows: [
              ['0.21 acres', 'Worksheet, Lot Size'],
              ['90% finished basement', 'Worksheet, Rooms by Level, Basement'],
              ['Quartz counters, 2022; LVP floors, 2022', 'Worksheet, Updates (from the seller disclosure)'],
              ['$639,900 (caption)', 'Worksheet, List Price'],
              [
                'Friday, November 13 and Monday, November 16 (flag only)',
                'Worksheet, Coming Soon sign; one business day after Friday, counting weekdays: confirm with your broker',
              ],
            ],
          },
        },
        {
          p: [
            'Agent-only check: the public remarks hold no names, contact details, links, showing or lockbox details, occupancy or compensation, and the caption names only you and your brokerage.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", items 1 to 8, in its order; page-notes.md, "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: placeholders, the character limit to confirm, claims held back until you confirm them (a roof year the disclosure doesn’t give, a drive time nobody measured, an HOA amenity that’s only planned), conflicts between your documents with both numbers, the Utah public marketing timing, and a note when the home is outside Utah.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: what the listing is, what the copy leads with, and the one thing to do before you paste.',
        },
        {
          title: 'A fair housing review',
          body: 'Every line from the seller, from you and from the AI’s own drafts that describes people instead of the home, quoted once, with where it came from, why it was flagged, and a rewrite. The final call is yours and your broker’s.',
        },
        {
          title: 'MLS public remarks',
          body: 'Written only from your documents, with the character count against your MLS’s limit. No names, links, showing details, occupancy or school names.',
        },
        {
          title: 'Two headlines',
          body: 'In Title Case, each under 60 characters with its count, each leading with a feature of the home.',
        },
        {
          title: 'A social caption',
          body: 'For Instagram or Facebook: the same facts and nothing new, the price only if your documents give it, a few place hashtags, and your name and brokerage on the last line.',
        },
        {
          title: 'Facts I used',
          body: 'Each fact in the copy with the document and field it came from, and what was left out on purpose.',
        },
        {
          title: 'Check before sending',
          body: 'Every number, year, measurement, place and feature in the copy, with its source, plus the character counts.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads and drafts. You decide and paste.',
      items: [
        {
          label: 'Run',
          title: 'The AI reads every page',
          body: 'Builds a fact sheet with a source for each fact, sets aside the agent-only fields, compares your worksheet with the county record, counts characters with code, and reviews every line for fair housing.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The public remarks, the headlines, the caption and every rewrite. Nothing is posted or entered in your MLS until you paste it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Every fact with your seller, your MLS’s limit and rules, the list price, when marketing starts, whether to post, and the final fair housing call with your broker.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need" and "Install". No ChatGPT Free upload limits as numbers, and no
      // prices.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. The AI uses code to count characters. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner turns on skills and code execution',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro. The ChatGPT version works from documents you attach or paste.',
          tag: 'Free ChatGPT has upload limits. Pasting works too.',
        },
        {
          title: 'A computer, once',
          body: 'Add the skill on claude.ai or in the Claude desktop app, or set up the Project on the ChatGPT website. After that, Claude uses the skill on your phone too.',
        },
        {
          title: 'Your listing documents',
          body: 'Your listing worksheet or MLS input sheet, and the seller’s notes or a feature list. The county record and wording you already have are optional. You don’t retype anything.',
          tag: '“Where your documents come from” shows what helps',
        },
        {
          title: 'No connectors',
          body: 'Nothing to connect. Attach the files or paste the text into the chat.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond the plans you already have.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From". Attaching in Claude is
      // page-notes.md's "How to attach files in Claude" (Claude's help center, checked 2026-11-08).
      kind: 'list',
      heading: 'Where your documents come from',
      items: [
        {
          title: 'Your listing worksheet',
          body: 'Your brokerage’s listing input worksheet, or a printout or PDF of your MLS’s listing input screen before you submit it. If you can’t find how to print a draft listing, ask your office or your MLS’s support line.',
        },
        {
          title: 'The seller’s notes',
          body: 'The seller questionnaire, an email from the seller, or your notes from the listing appointment. Paste an email straight into the chat.',
        },
        {
          title: 'A feature list',
          body: 'Whatever lists updates with their years, like the updates on the seller disclosure or a list the seller wrote.',
        },
        {
          title: 'The county record, if you want it',
          body: 'Your county assessor’s parcel page, printed to PDF. The AI uses it to catch square footage and year conflicts, and never puts the county’s value in your copy.',
        },
        {
          title: 'Wording you already have',
          body: 'Your headline idea, remarks you wrote, or an old description. The AI reviews it for fair housing and checks every claim in it against your documents.',
        },
        {
          title: 'Your MLS’s character limit',
          body: 'Tell the AI your MLS’s Public Remarks limit if you know it. If you don’t, it keeps the remarks under 1,000 characters and flags the limit for you to confirm. Limits differ by MLS.',
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
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your documents or paste them in, then paste these words with them. Change the names to yours. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'With your worksheet and the seller’s notes attached',
          items: [
            'Here’s my listing worksheet and the seller’s notes. Write the MLS remarks, headlines and an Instagram caption.',
            'Keep the public remarks under 1,000 characters. I’m Riley Sampleton with Example Peak Realty.',
          ],
        },
        {
          label: 'Checking wording you already have',
          items: [
            'Here are the remarks I wrote. Check them for fair housing and anything the worksheet doesn’t support.',
            'The seller sent this email with what they want said. What can I use, and how do I explain the rest?',
          ],
        },
        {
          label: 'Just one piece',
          items: ['Just the Facebook caption, please. It goes live Friday.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "What It Will Not Do"; SKILL.md, section 7.
          q: 'What won’t it do?',
          a: [
            'The AI won’t post anything, enter anything in your MLS or write to your CRM. It won’t add a feature, finish, square footage, upgrade, view, distance, commute time, school or HOA amenity your documents don’t state. It keeps private remarks, showing instructions, lockbox codes, occupancy, owner names and the seller’s reasons for selling out of everything public. It won’t say who a home suits, name a school or a place of worship, or make a safety or neighborhood claim. It won’t suggest a list price. And it won’t decide a fair housing question: it flags and explains, and you and your broker decide.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 2; writing-guide.md, section 3.
          q: 'Why did it leave out something my seller told me?',
          a: [
            'Because another document contradicts it or leaves it open (the disclosure gives no roof year), nobody measured it (a drive time), it isn’t built yet (an HOA amenity that’s only planned), or it describes people instead of the home. The AI lists each one at the top, with what would let you add it back, like an invoice, a permit or your own measurement. Plain facts your seller would know, like the year the carpet went in, are used and marked for you to confirm.',
          ],
        },
        {
          // page-notes.md, FAQ; fair-housing-review.md ("The Law in One Paragraph", "What to Flag").
          q: 'Why won’t it say “walking distance” or “great schools”?',
          a: [
            'Federal fair housing law reaches statements in ads that show a preference based on a protected class, like familial status, religion or disability, and Utah’s law adds more. “Great schools” is a school quality claim, and “walking distance” assumes how a buyer gets around. So the AI gives the measured distance from your documents instead, and points school and safety questions to the school district and the police department. Some items on its list are style cautions rather than violations, and the review says which. It always quotes the flagged wording once, in the review, so you can explain the change to your seller.',
          ],
        },
        {
          // page-notes.md, FAQ; utah-mls-and-advertising.md ("Character limit").
          q: 'What’s my MLS’s character limit?',
          a: [
            'It depends on your MLS, so tell the AI yours. UtahRealEstate.com’s rules guide doesn’t give a number. Without one, the AI keeps the remarks under 1,000 characters, counts them with code, and flags the limit for you to confirm in your listing input screen.',
          ],
        },
        {
          // page-notes.md, FAQ; utah-mls-and-advertising.md ("Public Marketing Starts a Clock").
          q: 'Can I post the caption before the listing is on the MLS?',
          a: [
            'In Utah, a post, a yard sign or an email blast is public marketing. Under UtahRealEstate.com’s Clear Cooperation and Public Marketing Rule, the listing then has to be on the MLS within one business day. The AI flags it when your sign or post comes before your MLS date, and writes the caption for the day the listing goes live. Questions go to your broker.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Tested and Not Tested".
          q: 'Does it work outside Utah, and what was tested?',
          a: [
            'Outside Utah, the AI applies the federal fair housing rules and the same agent-only rules, and tells you it didn’t check your state’s or your MLS’s rules. We tested it in Claude on three made-up Utah listings: a rambler with a Coming Soon sign, a two-story whose county record disagreed about the basement, and a condo whose seller asked for lines about who should live there. We haven’t tried it inside ChatGPT, outside Utah, on a full set of remarks you wrote, or on real listing files yet, so run the practice file first.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Pricing the listing first? ',
        { link: 'Pricing Conversation Prep', href: '/pricing-conversation-prep', sameTab: true },
        ' turns your CMA into a price you can defend, a talk track and answers to your seller’s objections.',
      ],
    },
  ],

  unlockKey: 'ldw-unlocked',
});
