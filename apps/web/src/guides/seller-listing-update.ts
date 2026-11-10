// Every word on /seller-listing-update that is its own: the landing page for Seller Listing Update, a
// skill (`skills/seller-listing-update/`, version 1.0) that turns one listing's week of showing
// feedback (a ShowingTime Listing Activity Report, a BrokerBay or other export, or a paste), the
// numbers the agent supplies (Zillow, Realtor.com and MLS views and saves, days on market, last week's
// numbers) and the agent's notes into flags, a bottom line, the week in numbers with the arithmetic,
// what buyers' agents said by theme, questions for the agent's price conversation, the seller email, a
// text when a seller prefers texts, next week's plan and Check before sending. What every skill page
// says the same way is in `skill-page.ts` (D-052).
//
// It is paid (the agent set of the Amplified Skill Library), so the page is drawn with its hero and
// sample and the Skill Library card in place of the sign-up and the setup (D-082, automatic from the
// catalog through `skill`). The free words and the setup below stay for the day it is free.
//
// The words come from the skill itself (SKILL.md, references/update-guide.md,
// fair-housing-and-feedback.md and utah-seller-update-notes.md), its page notes, and its graded runs
// (the practice run 13 of 13 after one fix, eval 1 13 of 13, eval 2 8 of 8), so the page promises
// what the skill does. The sample is sample.md, the graded practice run, cut only by whole flags,
// rows, sections, items and sentences; the bottom line, the email and the text are whole.
//
// What the page holds to, as SKILL.md does: drafts only, never sent. Never an invented showing,
// comment, number or trend; a week with no feedback says so. Never a price recommendation: the price
// conversation is the agent's, and the page points to Pricing Conversation Prep for it. A comment about
// who the buyers are, the neighbors, schools or safety is left out whole and flagged to the agent.
// Showing agents are anonymous unless the agent asks; buyers are never named.
//
// Calls left open, and how the page handles them:
//   - Connor's filter: ShowingTime and BrokerBay already send feedback to sellers on their own
//     (ShowingTime's "Publish Automatically" setting; BrokerBay's "Receive automated feedback on your
//     property"). The page says so in an FAQ and names what the skill adds: one weekly update across
//     every source, in the agent's voice, with the problem comments caught. Whether that earns its
//     place is Connor's call (DECISIONS entry).
//   - BrokerBay's export path was not found in its help center, and no real ShowingTime, BrokerBay,
//     Zillow or Realtor.com file was tried. The page gives only the click paths the vendors publish
//     (ShowingTime and Zillow, checked 2026-11-10), says the Realtor.com path comes from its 2023 agent
//     blog, and says real files weren't tested.
//   - The Gmail draft (an optional connector) was not tested, so the page never promises one.
//   - Claude Free and the ChatGPT Project inside ChatGPT are untested; the page says both, as the other
//     skill pages do.
//
// The practice set is three files (the export, the stats printout and the notes), attached file by
// file. `setupMinutes` is an estimate (page-notes gives none): 10, as the other skill pages with a
// ChatGPT version say for the same shared steps. The note points to Pricing Conversation Prep (named
// in SKILL.md's "Not for" line and already a page) and Open House Follow-Up (the sibling for one open
// house's recap).
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const SELLER_LISTING_UPDATE: Guide = skillPage({
  slug: 'seller-listing-update',
  skill: 'seller-listing-update',
  title: 'Seller Listing Update',

  meta: {
    title: 'Seller Listing Update: A Free AI Skill · Amplified Impact',
    description:
      'Upload this week’s showing feedback, your listing numbers and your notes, and get the weekly update for your sellers in your voice. Every number is checked against last week, and comments that shouldn’t reach a seller are caught first. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Listing Agents',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Upload this week’s showing feedback, your listing numbers and your notes, and the AI hands back the weekly update for your sellers in your voice. Every number is checked against last week, and every comment that shouldn’t reach a seller is caught first.',
  outcome: { n: '03', title: 'Send the Weekly Update', body: 'An email in your voice, every number traced, the price call left to you.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI drafts the update. It never sends anything or recommends a price.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page).
    prompt:
      'Here’s this week’s showing feedback export, my listing stats and my notes for 1427 E Sample Willow Dr. I’m Dana Sampleford with Example Ridge Realty. Write the weekly update for Pat and Lee.',
    note: [
      'There are three files: a made-up showing feedback export for the week of November 2 to 8, 2026, a one-page listing stats printout, and the agent’s notes. You’re playing the listing agent, Dana. Every name, address and number in them is made up. ',
    ],
  },

  real: {
    // SKILL.md, section 1 (the inputs) and section 3 (last week's numbers).
    body: ['Start a new chat the same way, attach this week’s showing feedback, your listing numbers and your notes, and say this.'],
    prompt: 'Here’s this week’s showing feedback, my listing numbers and my notes. Write the weekly update for my sellers.',
    note: [
      'Add last week’s numbers if you have them, or nothing gets compared. Before anything goes out, check every number and quote in the ',
      { strong: 'Check before sending' },
      ' list, and fill in any line in brackets.',
    ],
  },

  chatgpt: { paste: chatgptPaste('seller-listing-update') },

  sections: [
    {
      // sample.md (the practice run, 13 of 13 checks), shortened, in the output's own order and its own
      // words, cut only by whole flags, rows, sections, items and sentences: five of ten flags, the
      // bottom line, five of ten rows of the numbers table, three of five themes, three of five price
      // questions and the closing line, the whole email and text, the plan, and five of twenty-seven rows
      // of Check before sending. "pricing-conversation-prep" is written as the page's name, Pricing
      // Conversation Prep, as /open-house-follow-up does.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI hands back',
      body: 'What the AI wrote from the practice files: a made-up week of showing feedback, a stats printout and notes from a made-up listing agent, Dana. It’s the same set you practise on in setup.',
      title: 'Seller Listing Update: 1427 E Sample Willow Dr, November 2 to 8',
      note: 'Made-up example. Shortened: five of the ten flags, five of the ten rows of numbers, three of the five themes, three of the five price questions and five rows of Check before sending. The bottom line, the email and the text are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Two showings sent no feedback:' },
            ' Tuesday, November 3, 4:00 PM and Sunday, November 8, 1:00 PM (“Feedback Status: Requested”).',
          ],
        },
        {
          p: [
            { strong: 'Left out on purpose (fair housing):' },
            ' the comment from the Saturday, November 7, 10:30 AM showing. Its interest and price ratings are still counted. The export shows “Published To Homeowner: No,” so it hasn’t gone to Pat and Lee through the showing service; keep it held. Whether they hear any of it is your call with your broker.',
          ],
        },
        {
          p: [
            { strong: 'Possible defect:' },
            ' the Saturday, November 7, 2:00 PM showing agent reported a water stain on the basement ceiling. It’s in the email as written, with the question your notes planned for Pat and Lee. Once they know, whether it changes their disclosure is a question for your broker.',
          ],
        },
        {
          p: [
            { strong: 'Pat’s question about Zillow saves:' },
            ' the email gives the numbers (19 this week, 27 last week) and leaves [Your answer] for whether it means something is wrong. The files can’t answer that.',
          ],
        },
        {
          p: [
            { strong: 'Showing agents:' },
            ' not named in the email or the text (the default). Say so if you want them named.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Seven showings this week (nine last week), feedback from five, and the price opinions split Too High 2, About Right 2, No Opinion 1. Showings, Zillow views and saves, and Realtor.com views were all lower than last week, and MLS views were higher. Before sending, decide what Pat and Lee hear about the water stain and write your answer to Pat’s question.',
          ],
        },
        { h: 'The week in numbers' },
        {
          table: {
            caption: 'The week in numbers, 5 of 10 rows',
            head: ['Metric', 'This week (Nov 2 to 8)', 'Last week (Oct 26 to Nov 1)', 'Change, with the arithmetic', 'Source'],
            rows: [
              ['Showings (completed)', '7', '9', '2 fewer: 7 minus 9 = minus 2; 2 divided by 9 = 22.2% down', 'Export: 7 rows “Completed”; printout, both columns'],
              ['Feedback received', '5 of 7 showings', '6', '1 fewer: 5 minus 6 = minus 1; 1 divided by 6 = 16.7% down', 'Export: 5 completed rows “Received”; printout, both columns'],
              ['Price opinion', 'Too High 2, About Right 2, No Opinion 1', 'Not supplied', 'None', 'Export, Price Opinion'],
              ['Zillow saves', '19', '27', '8 fewer: 19 minus 27 = minus 8; 8 divided by 27 = 29.6% down', 'Printout'],
              ['MLS listing views', '64', '59', '5 more: 64 minus 59 = 5; 5 divided by 59 = 8.5% up', 'Printout'],
            ],
          },
        },
        { h: 'What buyers’ agents said' },
        {
          p: [
            '5 responses from 7 showings. 4 comments are used below; the comment from the Saturday, November 7, 10:30 AM showing is left out (see Flags). Counts are out of those 4 comments.',
          ],
        },
        { p: [{ strong: 'Price (1 of 4)' }] },
        {
          items: [
            '“My buyers felt it’s about $15,000 high next to what sold on Sample Birch Way.” (Wednesday, November 4, 6:15 PM; Not Interested, Too High)',
            'Price opinions on all 5 responses: Too High 2, About Right 2, No Opinion 1.',
          ],
        },
        { p: [{ strong: 'Condition and updates (3 of 4)' }] },
        {
          items: [
            '“Loved the updated kitchen and how big the backyard is.” (Monday, November 2, 5:30 PM)',
            '“Clean and shows well.” (Wednesday, November 4, 6:15 PM)',
            '“There’s a water stain on the basement ceiling under the main floor bathroom. Otherwise they liked the finished basement.” (Saturday, November 7, 2:00 PM; possible defect, see Flags)',
          ],
        },
        { p: [{ strong: 'Interest and next steps (1 of 4)' }] },
        {
          items: [
            '“They may want a second look this weekend.” (Friday, November 6, 5:00 PM; Very Interested). Your notes: nothing booked yet.',
          ],
        },
        { h: 'Questions for your price conversation' },
        { p: ['For you only. Facts only; the price call is yours.'] },
        {
          items: [
            'Of the 5 price opinions, 2 said Too High, 2 said About Right and 1 gave no opinion; 2 showings sent no feedback. What do the sales since the October 16 list date show against the $574,900 list price?',
            'One showing agent put it “about $15,000 high next to what sold on Sample Birch Way” (Wednesday, November 4, 6:15 PM). Are those Sample Birch Way sales in your CMA, and how do they compare with this home?',
            'Pat asked whether the drop in Zillow saves means something is wrong. What will you tell Pat and Lee?',
          ],
        },
        {
          p: [
            'Before the call on Thursday, November 12, run Pricing Conversation Prep on an updated CMA with this week’s feedback.',
          ],
        },
        { h: 'Seller email' },
        {
          email: {
            subject: 'Your Weekly Update For 1427 E Sample Willow Dr: November 2 To 8',
            body: [
              'Hi Pat and Lee,',
              'Here’s the week of November 2 to 8: 7 showings and feedback from 5.',
              'The week in numbers:',
              'Showings: 7 (9 last week)',
              'Feedback received: 5 of 7 showings',
              'Zillow page views: 412 (538 last week)',
              'Zillow saves: 19 (27 last week)',
              'Realtor.com page views: 167 (201 last week)',
              'MLS listing views: 64 (59 last week)',
              'Days on market: 23 as of Sunday, November 8',
              'What buyers’ agents said:',
              'One said: “Loved the updated kitchen and how big the backyard is.”',
              'One said: “Clean and shows well.”',
              'One said: “Buyers really liked the main floor layout and all the natural light.” Those buyers “may want a second look.” Nothing is booked yet.',
              'One said: “The second bedroom felt small for them.”',
              'One said: “Road noise in the backyard was noticeable.”',
              'One reported “a water stain on the basement ceiling under the main floor bathroom.” What do you know about it?',
              'On price: of the 5 who answered, 2 said Too High, 2 said About Right and 1 gave no opinion. One said their buyers felt it’s “about $15,000 high next to what sold on Sample Birch Way.”',
              'Pat, you asked whether the drop in Zillow saves means something is wrong. Saves were 19 this week and 27 last week. [Your answer]',
              'Next week:',
              'Wednesday, November 11: new twilight photos of the backyard',
              'Thursday, November 12, 6:00 PM: our pricing check-in call',
              'Saturday, November 14, 1 to 3 PM: open house',
              'Dana',
            ],
          },
        },
        { h: 'Text version' },
        { p: ['To Pat (your notes say Pat likes a quick text):'] },
        {
          p: [
            'Hi Pat, your weekly update for Sample Willow is in your email. 7 showings this week and feedback from 5. Next up: backyard photos Wednesday, November 11, and our call Thursday, November 12 at 6:00 PM. Dana',
          ],
        },
        { h: 'Next week’s plan' },
        {
          items: [
            'Now, in the email: ask Pat and Lee about the water stain (you).',
            'Wednesday, November 11: new twilight photos of the backyard (you).',
            'Thursday, November 12, 6:00 PM (confirm PM): pricing check-in call (you, Pat and Lee).',
            'Saturday, November 14, 1 to 3 PM (confirm): open house (you).',
          ],
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 5 of 27 rows',
            head: ['Item', 'Where it’s from'],
            rows: [
              ['7 showings', 'Export: 7 rows “Completed” (Nov 2, 3, 4, 6, 7 twice, 8); printout: “Showings (completed)” 7'],
              ['“about $15,000 high next to what sold on Sample Birch Way”', 'Export, Wednesday, November 4, 6:15 PM'],
              ['Thursday, November 12, 6:00 PM', 'Notes: “Pricing check-in call with Pat and Lee Thursday the 12th at 6.” PM assumed: confirm'],
              ['Left out: the comment from Saturday, November 7, 10:30 AM', 'Its Somewhat Interested and Too High ratings are counted above; “Published To Homeowner: No”'],
              ['[Your answer]', 'Yours to write before sending'],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", items 1 to 9, in its order; page-notes.md, "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: the week it used, showings with no feedback, no numbers from last week, Zillow totals and 30-day counts, numbers that disagree, comments left out for fair housing (by date and time only, and whether your showing service already sent them), a possible defect a showing agent reported, your sellers’ price question, your own price view left out, lines for you to fill in, and a listing outside Utah.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: the week, the two or three facts that matter, and the one thing to do before sending.',
        },
        {
          title: 'The week in numbers',
          body: 'Showings, feedback, ratings, portal views and saves, MLS views and days on market. Each one sits next to last week’s, only when you gave it, with the arithmetic and where the number came from.',
        },
        {
          title: 'What buyers’ agents said',
          body: 'Grouped by theme, with exact counts and the showing agents’ exact words. No buyers named, and showing agents named only if you ask.',
        },
        {
          title: 'Questions for your price conversation',
          body: 'For you only. The price opinions, every price comment and the numbers that changed, as questions to take into your CMA. No recommended price.',
        },
        {
          title: 'The seller email',
          body: 'From you, 250 words or fewer, with a subject that names the home and the week. The drafts follow your voice profile, if you made one with our free guide.',
        },
        {
          title: 'A text, if a seller prefers texts',
          body: 'Two or three short lines: the week and the next dated step. No quotes and no price talk.',
        },
        {
          title: 'Next week’s plan',
          body: 'Only what your notes say, with each day turned into a date.',
        },
        {
          title: 'Check before sending',
          body: 'Every number, quote and date in the drafts, with where it came from, and every comment left out, by its date and time.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads, counts and drafts. You decide and send.',
      items: [
        {
          label: 'Run',
          title: 'The AI reads every row and every number',
          body: 'Sets the week. Counts showings, feedback and ratings. Does the math against last week. Groups the comments by theme, and sets aside the ones that can’t go to a seller.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The seller email, and a text when a seller prefers texts. Nothing reaches your sellers until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'The price conversation and any price recommendation. Which feedback your sellers hear, with your broker. Whether to name showing agents. Next week’s plan, any disclosure question a comment raises, and every send.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need" and "Install", worded as /open-house-follow-up words the shared
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
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro. The ChatGPT version works from files you upload or numbers you paste.',
          tag: 'Free ChatGPT has upload limits. Pasting works too.',
        },
        {
          title: 'A computer, once',
          body: 'Add the skill on claude.ai or in the Claude desktop app, or set up the Project on the ChatGPT website. After that, Claude uses the skill on your phone too. Downloading a showing report is easiest on a computer.',
        },
        {
          title: 'This week’s feedback',
          body: 'From ShowingTime, BrokerBay, another showing service or your own spreadsheet, as a file or pasted in. You don’t retype anything.',
          tag: '“Where to get your feedback and numbers” shows how',
        },
        {
          title: 'Your numbers and notes',
          body: 'The views, saves and days on market you want in the update, last week’s if you have them, and your notes: what your sellers asked and next week’s plan.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond the plans you already have and the showing service you already use. No connectors.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From": ShowingTime's help center
      // (SmartMLS) and Zillow's, checked 2026-11-10. BrokerBay has no public export article, so no menu is
      // named. Realtor.com's path is its 2023 agent blog. Attaching in Claude is Claude's help center
      // ("Uploading files to Claude", checked 2026-11-10).
      kind: 'list',
      heading: 'Where to get your feedback and numbers',
      items: [
        {
          title: 'ShowingTime',
          body: 'Open Reports, then Listing Activity Report, and pick the listing. Click Change Date Range and set the week. Download it as a PDF. Use the agent version.',
        },
        {
          title: 'BrokerBay or another showing service',
          body: 'Export or copy the listing’s showings and feedback for the week, as a file or pasted in. Column names vary. The AI reads them and tells you how it read them. We haven’t tested a real BrokerBay export yet.',
        },
        {
          title: 'Zillow, for a Showcase listing',
          body: 'Open the listing, click Showcase & Media, then Performance on the left. Share Report downloads a PDF. These are totals since the listing went live, so the AI subtracts last week’s total to get this week’s number.',
        },
        {
          title: 'Zillow, for any listing',
          body: 'The views and saves on the listing’s own Zillow page. Zillow counts the last 30 days there, so the AI reports them that way and never compares them week to week.',
        },
        {
          title: 'Realtor.com',
          body: 'The Listings tab of your Realtor.com Pro dashboard shows how the listing is performing. We took this path from Realtor.com’s agent blog and haven’t checked it in a live account.',
        },
        {
          title: 'Your MLS',
          body: 'Its listing views and days on market, as your MLS labels them. Paste them in or attach a printout.',
        },
        {
          title: 'Last week’s numbers',
          body: 'Last week’s update, a stats sheet you keep, or a line in your notes. Without them, nothing gets compared.',
        },
        {
          title: 'Attaching a file in Claude',
          body: 'Click the + at the lower left of the chat box, then Add files or photos. Pick the files and click Open. Or drag the files into the chat.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your feedback, numbers and notes or paste them in, then paste these words with them. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'Every week, with the files attached',
          items: ['Here’s this week’s showing feedback, my listing stats and my notes. Write the weekly update for my sellers.'],
        },
        {
          label: 'A slow week with a price question',
          items: ['Only two showings and no feedback this week, and my seller asked if we should drop the price. Write the update.'],
        },
        {
          label: 'When your sellers want names',
          items: ['Name the showing agents this time; my sellers want to know who came through.'],
        },
        {
          label: 'Just one piece',
          items: ['Just the email, please.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "Why This, When the Showing Service Already Emails the Sellers" and its FAQ;
          // references/fair-housing-and-feedback.md (ShowingTime's Publish Automatically and hold for
          // review; BrokerBay's seller features), checked 2026-11-10.
          q: 'My showing service already emails my sellers the feedback. Why this?',
          a: [
            'ShowingTime and BrokerBay can send each response to your sellers as it comes in, word for word. This writes one weekly update across your showing service, Zillow, Realtor.com, your MLS and your notes, in your voice, with the numbers checked against last week and next week’s plan. It also catches the comments that shouldn’t reach a seller, and tells you when one may already have gone out. ShowingTime can hold feedback for your review before it’s published; ask your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 5 and Guardrails.
          q: 'Why won’t it tell my sellers whether to lower the price?',
          a: [
            'Price is your call and your sellers’, made from a CMA, not from a week of feedback. The update gives the price opinions and comments exactly as they came in, and puts the facts in front of you as questions. ',
            { link: 'Pricing Conversation Prep', href: '/pricing-conversation-prep', sameTab: true },
            ' turns an updated CMA into that conversation.',
          ],
        },
        {
          // page-notes.md, FAQ; references/fair-housing-and-feedback.md (42 U.S.C. 3604, NAR Standard of
          // Practice 10-1) and utah-seller-update-notes.md (Utah Code 57-21-5).
          q: 'Why did it leave out a showing agent’s comment?',
          a: [
            'It said something about who the buyers are, who lives nearby, the schools or safety. Federal and Utah fair housing law bar statements that show a preference about who should live in a home, and the REALTOR Code of Ethics says not to volunteer the racial, religious or ethnic makeup of a neighborhood. Your update is your own written statement, so the whole comment stays out, and you get its date and time to decide with your broker. Its interest and price ratings still count.',
          ],
        },
        {
          // page-notes.md, FAQ; references/update-guide.md (Zillow's Showcase FAQ, checked 2026-11-10).
          q: 'Why are my Zillow numbers different from the listing page?',
          a: [
            'Zillow’s listing page counts the last 30 days. Zillow’s Showcase performance counts from the day the listing went live. The AI turns Showcase totals into weekly numbers by subtracting, shows the math, and never compares a 30-day count week to week.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 7 (Location); utah-seller-update-notes.md.
          q: 'Does it work outside Utah?',
          a: [
            'Yes. Outside Utah, fair housing and everything else still apply, and the AI tells you it didn’t check your state’s rules. In Utah it also leaves out comments about sexual orientation, gender identity and source of income, which Utah adds to the federal list.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Tested and Not Tested".
          q: 'Which plan do I need, and what was tested?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan. In ChatGPT, a Project on Free, Go, Plus or Pro. We tested the skill in Claude on three made-up weeks: a full week in Utah, a full week in Idaho from a BrokerBay-style export, and a slow week with no feedback and a price question. We haven’t tried it inside ChatGPT, or on a real ShowingTime, BrokerBay, Zillow or Realtor.com file yet, so run the practice files first.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Getting ready to talk price? ',
        { link: 'Pricing Conversation Prep', href: '/pricing-conversation-prep', sameTab: true },
        ' turns your CMA into a price you can defend. Recapping one open house? Try ',
        { link: 'Open House Follow-Up', href: '/open-house-follow-up', sameTab: true },
        '.',
      ],
    },
  ],

  unlockKey: 'slu-unlocked',
});
