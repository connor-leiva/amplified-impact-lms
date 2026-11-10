// Every word on /market-update-email that is its own: the landing page for Market Update Email, a skill
// (`skills/market-update-email/`, version 1.0) that turns the MLS statistics an agent supplies (a monthly
// market report PDF, a stats CSV export, or numbers pasted in) into a monthly market update email for
// their database, a matching social post and a Numbers I Used table: flags, a bottom line, what it used,
// the table, the email, the post and Check before sending. What every skill page says the same way is in
// `skill-page.ts` (D-052). The skill is paid (the Amplified Skill Library, agent set), so the built page
// shows its hero and sample with the Skill Library card in place of the sign-up and setup (D-082,
// automatic from the catalog once `market-update-email` is in `SKILL_CATALOG` and not in `FREE_SKILLS`).
// The free words and the setup stay here for the day it is free.
//
// The words come from the skill itself (SKILL.md and references/market-math.md, writing-guide.md and
// utah-market-update-rules.md), its page notes, and its graded runs (the practice run and three evals,
// all passed), so the page promises what the skill does. The sample is sample.md, the graded practice
// run, cut only by whole items, rows and sentences; its email and post are whole. The email's bullets
// are its lines, one paragraph each, as on /appointment-follow-up.
//
// What the page holds to, as SKILL.md does: drafts only, never sent or posted. Only the numbers the
// agent supplies, each with its source and period, and the arithmetic shown for anything computed. No
// forecasts of prices or rates, never "a good time to buy or sell". No schools, safety or demographic
// claims. An odd row is flagged, never fixed or guessed around.
//
// Calls left open, and how the page handles them:
//   - Where the numbers come from: the page names RapidStats (UtahRealEstate.com's own help article),
//     InfoSparks (ShowingTime's knowledge base) and RPR (RPR's blog) as page-notes.md checked them on
//     2026-11-10. RapidStats' download file type isn't named by its help article, so the page says
//     "print it to PDF" as the fallback. None of these real reports was run through the skill; the page
//     says so.
//   - MLS rules on AI tools: some MLSs limit giving their data to AI tools (outreach-rules.md's
//     examples). The page tells the agent to check their MLS's rules; no UtahRealEstate.com rule was
//     found either way.
//   - The source line: UtahRealEstate.com's Rule 13.1 wording and NAR's model rule, as the skill's
//     references quote them. Other MLSs' wording is left to the broker.
//   - Gmail drafts: SKILL.md allows one when asked, but no run tested it, so the page doesn't offer it.
//   - Claude Free: the help center lists skills on every plan, the docs on Pro and up, as every skill
//     page says. The ChatGPT version was not run inside ChatGPT; the page says so.
//
// It works in Claude (a skill) and in ChatGPT (a Project), from an uploaded report or export or pasted
// numbers. The practice set is two files (the report PDF and its CSV). `setupMinutes` is an estimate
// (page-notes gives none): 10, as the other skill pages with a ChatGPT version say for the same shared
// steps. The note points to Pricing Conversation Prep, the sibling for pricing one listing (SKILL.md's
// description); the other siblings it names (listing-description-writer, sphere-touch-plan) may not
// have pages yet, so the page links none of them.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const MARKET_UPDATE_EMAIL: Guide = skillPage({
  slug: 'market-update-email',
  skill: 'market-update-email',
  title: 'Market Update Email',

  meta: {
    title: 'Market Update Email: A Free AI Skill · Amplified Impact',
    description:
      'Attach your MLS’s monthly market report or stats export and get back a market update email for your database, a matching social post, and a table showing where every number came from. The AI drafts; you read and send. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Agents Who Send a Monthly Update',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Attach your MLS’s monthly market report or stats export, and the AI hands back a market update email for your database, a matching social post, and a table showing where every number came from.',
  outcome: { n: '03', title: 'Send the Numbers', body: 'An email and a post to read and send, with every figure traced to your report.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI drafts the email and the post. It never sends or posts anything.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page).
    prompt: 'Here’s my MLS’s October report for Sampleton County and the stats export. I’m Riley Sampleton with Example Peak Realty. Write my October market update email and a social post.',
    note: [
      'There are two files: a made-up MLS market report for a made-up county, as a PDF, and the same figures as a stats export. Attach both. You’re playing the agent, Riley. Every name and number in them is made up. ',
    ],
  },

  real: {
    // SKILL.md, section 1 (a report, an export or pasted numbers) and section 6 (Check before sending).
    body: ['Start a new chat the same way, attach your MLS’s monthly report or stats export, or paste the numbers, and say this.'],
    prompt: 'Here’s my MLS’s report for last month. Write my market update email and a social post.',
    note: [
      'If the report doesn’t show your name and brokerage, add them to your message. Before anything goes out, check every number against the ',
      { strong: 'Numbers I Used' },
      ' table and your report, and the source line against your MLS’s rules.',
    ],
  },

  chatgpt: { paste: chatgptPaste('market-update-email') },

  sections: [
    {
      // sample.md (the practice run, 12 of 12 checks), shortened, in the output's own order and its own
      // words, cut only by whole items, rows, columns and sentences: three of the five flags, the bottom
      // line, six of the 23 rows of Numbers I Used (without its "Where it's from" and "Period and area"
      // columns, which don't fit a phone), the whole email and post, three of the ten Check before
      // sending rows and the first sentence of two of its notes. What I Used and the not-used list are
      // left out. Straight apostrophes and quotes become curly ones, as on every page.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI hands back',
      body: 'What the AI wrote from the practice files: a made-up MLS report and stats export for a made-up county, for a made-up agent, Riley Sampleton. They’re the same files you practise on in setup.',
      title: 'Market Update: Sampleton County, October 2026',
      note: 'Made-up example. Shortened: two of the five flags and What I Used are left out, and a few rows are kept from Numbers I Used (without its source and period columns) and Check before sending. The bottom line, email and post are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Property type:' },
            ' you didn’t name one, so the drafts lead with single-family homes (301 closed sales in October 2026, against 109 townhomes and condos) and give townhomes and condos one sentence.',
          ],
        },
        {
          p: [
            { strong: 'Small sample:' },
            ' Fakeburg (report p. 2) had 6 closed sales in October 2025 and 3 in October 2026. Its 13.3% median price change and 50.0% sales change stay out of the drafts.',
          ],
        },
        {
          p: [
            { strong: 'Left out on purpose:' },
            ' the Example Peaks MLS Board’s quote on page 2. It forecasts rates and buyer demand and tells sellers when to list, which no figure in the report supports.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Sampleton County single-family homes, October 2026 against October 2025: the median sale price was $505,000 (up 3.3%) and 301 homes sold (down 5.3%), while active listings rose 14.5% to 1,198 and the median days on market went from 31 to 38. Both drafts use only page 1 of the report, which the export matches figure for figure. Before sending, confirm your MLS’s source-line wording and that “Example Peak Realty” matches the Division of Real Estate’s records.',
          ],
        },
        { h: 'Numbers I Used' },
        {
          table: {
            caption: 'Numbers I Used, 6 of 23 rows',
            head: ['#', 'Figure in the drafts', 'Value', 'Arithmetic'],
            rows: [
              ['N1', 'Median sale price, single-family', '$505,000', 'As stated'],
              ['N3', 'Change in median sale price', 'up 3.3%', '(505,000 minus 489,000) ÷ 489,000 × 100 = 3.27%, shown as 3.3%; matches the report'],
              ['N7', 'Change in closed sales', 'down 5.3%', '(301 minus 318) ÷ 318 × 100 = minus 5.35%, shown as 5.3%; matches the report'],
              ['N13', 'Change in active listings', 'up 14.5%', '(1,198 minus 1,046) ÷ 1,046 × 100 = 14.53%, shown as 14.5%; matches the report'],
              ['N14', 'Months of supply', '4.0', '1,198 active listings ÷ 301 closed sales = 3.98, shown as 4.0'],
              ['N18', 'Change in list-to-sale ratio', '0.8 points lower', '97.6 minus 98.4 = minus 0.8 points'],
            ],
          },
        },
        { h: 'Email draft' },
        {
          email: {
            subject: 'Sampleton County Homes In October 2026: What The Numbers Show',
            body: [
              'Hi [First Name],',
              'Here’s what Sampleton County’s single-family market did in October 2026, compared with October 2025.',
              'The median sale price was $505,000, up 3.3% from $489,000.',
              '301 homes sold, 17 fewer than the 318 a year earlier (down 5.3%).',
              'Homes that sold took a median of 38 days to go under contract, 7 days longer than last October’s 31.',
              'There were 1,198 active listings at the end of the month, up 14.5% from 1,046. At October’s pace of sales, that’s 4.0 months of supply, against 3.3 a year earlier.',
              'Homes sold for 97.6% of their final list price on average, 0.8 points lower than the 98.4% of a year earlier.',
              'Townhomes and condos: the median sale price was $358,500, down 1.0% from $362,000, with 109 sales against 118.',
              'In short: the median single-family price was higher than a year ago, homes took longer to sell, and buyers had more listings to choose from.',
              'If you’d like these numbers for your own neighborhood, reply and I’ll pull them.',
              'Riley Sampleton',
              'Example Peak Realty',
              'Based on information from Example Peaks MLS for the period October 1, 2025 through October 31, 2026. Figures may change as late sales are reported.',
              'To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link].',
              '[Sender Postal Address]',
              'This is a marketing email from Riley Sampleton, Example Peak Realty.',
            ],
          },
        },
        { h: 'Social post draft' },
        { p: ['Sampleton County single-family homes, October 2026:'] },
        { p: ['Median sale price: $505,000, up 3.3% from October 2025.'] },
        { p: ['Median days on market: 38, up from 31.'] },
        { p: ['Active listings at month end: 1,198, up 14.5%.'] },
        { p: ['Homes took longer to sell than a year ago, and buyers had more to choose from.'] },
        { p: ['Want the numbers for your street? Send me a message.'] },
        { p: ['Riley Sampleton, Example Peak Realty'] },
        { p: ['Source: Example Peaks MLS, October 2025 and October 2026.'] },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 3 of 10 rows',
            head: ['Item in the drafts', 'Where it’s from'],
            rows: [
              ['October 1, 2025 through October 31, 2026 (source line)', 'Report p. 2 source line: the two periods, October 1 to 31 of each year'],
              ['$505,000 and $489,000', 'N1, N2: report p. 1'],
              ['3.3%, 5.3%, 14.5%, 1.0%', 'N3, N7, N13, N21: computed, each matching the report’s own change'],
            ],
          },
        },
        {
          p: [
            { strong: 'Source line:' },
            ' confirm Example Peaks MLS’s required wording with your broker.',
          ],
        },
        {
          p: [
            { strong: 'Brokerage name:' },
            ' “Example Peak Realty” must match your brokerage’s name on the Utah Division of Real Estate’s records.',
          ],
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
          body: 'Only when they apply: a row that looks wrong, with what it was compared with; a figure the drafts would need that isn’t in your file; a small sample; placeholders to fill; an area outside Utah; and what was left out on purpose, like a forecast in the report.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: the area and month, the two or three figures that matter most, and the one thing to check before sending.',
        },
        {
          title: 'What it used',
          body: 'The MLS, the area, the property types, the months compared and the date the report was current as of.',
        },
        {
          title: 'The Numbers I Used table',
          body: 'Every figure in the email and the post, numbered, with where it came from, its period and area, and the arithmetic for anything computed: percent changes, months of supply and list-to-sale ratios. Then the figures it didn’t use, and why.',
        },
        {
          title: 'An email draft',
          body: 'A subject that names the area and month, 250 words or fewer, signed with your name and brokerage, with your MLS’s source line and an unsubscribe and address footer. It follows your voice profile, if you made one with our free guide.',
        },
        {
          title: 'A social post',
          body: 'For Instagram, Facebook or LinkedIn, 120 words or fewer, with the same figures, your brokerage name and a short source line.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, dollar amount and percentage in the drafts with its row in the table and its page in your report, plus the placeholders, the source line and your brokerage name.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads, checks and drafts. You decide and send.',
      items: [
        {
          label: 'Run',
          title: 'The AI checks every number',
          body: 'Reads your report or export, checks every row for figures that look wrong or are missing, and works out percent changes, months of supply and list-to-sale ratios in code, showing each step.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The email and the social post. Nothing goes to your database or your social accounts until you send or post it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'What goes out and to whom, confirming any odd figure with your MLS, the source line your MLS requires, your brokerage name, your unsubscribe setup, any opinion about the market, and any fair housing judgment. Rate questions go to a lender. The AI never asks for, repeats or handles wire instructions or account numbers.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need" and "Install". No ChatGPT Free upload limits as numbers, and no prices.
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
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro. The ChatGPT version works from a report or export you upload, or numbers you paste.',
          tag: 'Free ChatGPT has upload limits. Pasting works too.',
        },
        {
          title: 'A computer, once',
          body: 'Add the skill on claude.ai or in the Claude desktop app, or set up the Project on the ChatGPT website. After that, Claude uses the skill on your phone too.',
        },
        {
          title: 'Your MLS’s numbers',
          body: 'The monthly market report or stats export for your area, or the figures pasted in with the area, month and source. You don’t retype anything a file shows.',
          tag: '“Where to get your numbers” shows how',
        },
        {
          title: 'Your email tool and social accounts',
          body: 'You send and post yourself. Most email tools add the unsubscribe link and your address; the draft has placeholders for both in case yours doesn’t.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond the plans you already have. No connectors needed.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From": each vendor's help article,
      // checked 2026-11-10. Attaching in Claude is page-notes.md's "How to attach files in Claude". The
      // MLS rule line is page-notes.md's "Before you upload MLS data anywhere".
      kind: 'list',
      heading: 'Where to get your numbers',
      items: [
        {
          title: 'UtahRealEstate.com: RapidStats',
          body: 'On your MLS Dashboard, go to Exclusive Member Benefits and click the RapidStats logo. In the menu on the left, open a tab such as Market Summary or Sold Listings, pick a Residential report, and click View. Download or print the report. If there’s no download, print it to PDF.',
        },
        {
          title: 'MLSs with InfoSparks',
          body: 'In your MLS, select the ShowingTime MarketStats icon on the dashboard, homepage or tools menu (it differs by MLS). To share data, choose static data, then a printable PDF or a .csv file.',
        },
        {
          title: 'RPR',
          body: 'At narrpr.com, click Research, then Residential Market Activity Search. Enter your area and choose Create Market Activity Report. Click Customize to pick the timeframe, choose download, and click Run Report.',
        },
        {
          title: 'Your board’s monthly report',
          body: 'Attach the PDF as it came. Association reports, like the Utah Association of REALTORS’ monthly reports for members, work the same way.',
        },
        {
          title: 'Just the numbers',
          body: 'Paste them into the chat with the area, the month and where they’re from. Without those, the drafts carry placeholders for you to fill.',
        },
        {
          title: 'Attaching a file in Claude',
          body: 'Click the + at the lower left of the chat box, then Add files or photos. Pick the file and click Open. Or drag the file into the chat.',
        },
        {
          title: 'Check your MLS’s rules first',
          body: 'Some MLSs limit giving their data to software or AI tools. Check your MLS’s rules before you upload a report or export. Questions go to your broker.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your report or export or paste the numbers, then paste these words with it. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'With your report or export attached',
          items: ['Here’s my MLS’s October report. Write my market update email and a social post.', 'Stats export attached for Testerville. Compare to last October.'],
        },
        {
          label: 'With the numbers pasted in',
          items: ['Here are my board’s numbers for this month. Write the email.'],
        },
        {
          label: 'Just one piece, or one kind of home',
          items: ['Just the Instagram caption.', 'Townhomes and condos only, please.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, FAQ; references/writing-guide.md, "Describe, Never Predict".
          q: 'Why won’t it say it’s a good time to buy or sell?',
          a: [
            'Because no number in a monthly report says what happens next. A forecast in your email is a claim you can’t back up, and “a great time to buy before rates drop” is a rate prediction, which belongs with a lender. The AI writes what the numbers did in the month named, and offers you a true sentence the numbers support instead.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 5 (Fair housing; quotes and forecasts in the report).
          q: 'My report has a quote from the board, or national numbers. Why isn’t it in the email?',
          a: [
            'Quotes in market reports often forecast prices or rates, and some mention schools, safety or who lives in an area, which fair housing rules keep out of advertising. National figures and mortgage rates aren’t about your area. The AI lists what it left out, so you can decide.',
          ],
        },
        {
          // page-notes.md, FAQ; references/market-math.md, "Odd Rows and Odd Figures".
          q: 'What happens with a row that looks wrong?',
          a: [
            'The AI tells you which row, which figure, and what it compared it with, and leaves the whole row out until you confirm it with your MLS. It never guesses a replacement. If the row was last year’s month, it compares with last month instead and says so.',
          ],
        },
        {
          // page-notes.md, FAQ; references/utah-market-update-rules.md (Rule 13.1) and writing-guide.md
          // (NAR's model rule).
          q: 'Do I need the source line at the bottom?',
          a: [
            'Most MLS rules ask for one when you advertise with their data. UtahRealEstate.com requires “Based on information from UtahRealEstate.com for the period [date] through [date],” and the National Association of REALTORS’ model MLS rule uses the same form. The AI fills it in from your report. Confirm your MLS’s wording with your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 1 (Location).
          q: 'Does it work outside Utah?',
          a: [
            'Yes. Outside Utah, the AI uses the same source line form and tells you it didn’t check your state’s advertising rules or your MLS’s own rules. In Utah, it also follows the rule that every ad names your brokerage clearly, as it appears on the Division of Real Estate’s records.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Tested and Not Tested".
          q: 'Which plan do I need, and what was tested?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan. In ChatGPT, a Project on Free, Go, Plus or Pro. We tested the skill in Claude on four made-up cases: a report and export for a Utah county, a report from outside Utah with a forecast in it, an export with a wrong row and a missing figure, and numbers pasted with a request to call it a great time to buy. We haven’t tried it inside ChatGPT or on real MLS reports yet, so run the practice files first.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Pricing one listing instead? ',
        { link: 'Pricing Conversation Prep', href: '/pricing-conversation-prep', sameTab: true },
        ' turns your CMA into a price you can defend, a talk track and answers to your seller’s objections.',
      ],
    },
  ],

  unlockKey: 'mue-unlocked',
});
