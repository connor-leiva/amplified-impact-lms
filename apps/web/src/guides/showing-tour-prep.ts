// Every word on /showing-tour-prep that is its own: the landing page for Showing Tour Prep, a free skill
// (`skills/showing-tour-prep/`, version 1.0) that turns the MLS agent-detail sheets for a buyer's showing
// tour into tour prep: flags, a bottom line, a Tour at a Glance table, home by home notes, a one-page
// buyer tour sheet, a separate agent-only page and Check before sending. What every skill page says the
// same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md), its page notes, its graded runs (three evals and the
// practice run, all passed, plus a second reviewer's runs of eval 2 and the practice set) and the build
// and review reports, so the page promises what the skill does. Buyer side only. The core promise, said
// plainly in the lede and the first FAQ: agent-only MLS fields (agent or private remarks, showing
// instructions, occupancy, names and phone numbers) never go on the buyer tour sheet, and lockbox, gate
// and alarm codes are never repeated anywhere, the agent-only page included. Fit is judged only against
// the buyer's stated criteria; schools, safety and who lives nearby go to official sources. The note
// points to Offer Strategy, for deciding what to offer.
//
// What the page leaves out or hedges, and why:
//   - No routing or scheduling: SKILL.md, section 9. The page says the showing service (ShowingTime is
//     the example) and the MLS's routing report do that, and the AI keeps the agent's order.
//   - ChatGPT Free's upload and per-message limits came from search excerpts and OpenAI's pricing page
//     (help.openai.com did not load for the review), so the page states no numbers for them: it says
//     Free limits uploads and how much fits in a message, and what that means.
//   - Claude Free: the help center lists skills on every plan, the docs on Pro and up, and no run used
//     Free. The page says both. The ChatGPT version was not run inside ChatGPT.
//   - The name of UtahRealEstate.com's report that holds Agent Remarks is unconfirmed (page-notes.md), so
//     the page says to pick the full report with Agent Remarks and Showing Information, and gives the
//     support line from page-notes.md.
//   - Real (redacted) MLS reports, scans and photos, and tours of more than six homes were not tested.
//     The page says the test sheets were made up and asks for PDFs.
//   - No phone-app claim: page-notes.md doesn't make one for this skill.
//
// The practice set is four MLS sheet PDFs and a Follow Up Boss note, attached file by file.
// `setupMinutes` is an estimate (page-notes gives none): 10, as the other skill pages with a ChatGPT
// version say for the same steps.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const SHOWING_TOUR_PREP: Guide = skillPage({
  slug: 'showing-tour-prep',
  title: 'Showing Tour Prep',

  meta: {
    title: 'Showing Tour Prep: A Free AI Skill · Amplified Impact',
    description:
      'Upload the MLS sheets for your next showings and get a one-page tour sheet for your buyers, plus a separate agent-only page with questions for each listing agent. Private remarks and lockbox codes stay off the buyer’s sheet. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Buyer’s Agents',
  // page-notes.md, "One-Line Promise", with the actor named and SKILL.md's rule for codes: kept off the
  // buyer's sheet, and never repeated anywhere.
  lede: 'Upload the MLS sheets for tomorrow’s showings, and the AI hands back a one-page tour sheet your buyers can hold and a separate agent-only page, with private remarks, showing instructions and lockbox codes kept off anything your buyers see.',
  outcome: { n: '03', title: 'Hand Over the Tour Sheet', body: 'One page for your buyers, and an agent-only page for you.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI reads and sorts. You run the tour.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophe, as on every page). The Follow Up
    // Boss note in the set gives the tour date and time.
    prompt:
      'I’m showing these four homes to Sam and Alex tomorrow at 4. MLS sheets and my Follow Up Boss note are attached. Prep me and make a tour sheet I can hand them.',
    note: [
      'There are five files: four MLS sheets and a Follow Up Boss note. Every name, address, code and number in them is made up. ',
    ],
  },

  real: {
    // SKILL.md, section 1: an MLS sheet for each home is required, the agent version is best; the buyer's
    // criteria, the tour date and the loan type are optional and used when given.
    body: [
      'Start a new chat the same way, attach the MLS sheet for each home on the tour (the agent version, with agent remarks and showing instructions), and say this.',
    ],
    prompt: 'Here are the MLS sheets for my showings tomorrow. Prep me and make a tour sheet I can hand my buyers.',
    // SKILL.md, sections 1 and 6 (criteria and the buyer agreement), and section 10, item 7.
    note: [
      'Add the tour time and your buyers’ must-haves to the message, or paste your Follow Up Boss note. The AI checks each home against them. Tell the AI if your buyer agreement is signed. Before anything goes out, check every price, date, size and fee in the ',
      { strong: 'Check before sending' },
      ' list against the MLS sheets.',
    ],
  },

  chatgpt: { paste: chatgptPaste('showing-tour-prep') },

  sections: [
    {
      // sample.md (the practice run), shortened, in the output's own order and its own words, cut only by
      // whole parts, rows, columns, items and sentences: the three flags; the bottom line; Tour at a Glance
      // with 3 of its 11 columns (# and Address shortened to the number and the city); home 2's first,
      // second and fifth things to look at and its red flags; the tour sheet's heading, home 4 and the
      // official-sources line; the agent-only page's Before the Tour and home 4 (its first, second and
      // fourth questions); and two lines of Check before sending. Home 4 is the tenant-occupied home whose
      // agent remarks hold the lockbox and alarm codes and the offer deadline, so the excerpt shows what
      // stays off the buyer's page. There is no email in this output.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a tour prep looks like',
      body: 'What the AI wrote from the practice files: four made-up homes in Utah, made-up buyers and a made-up Follow Up Boss note. They’re the same files you practise on in setup.',
      title: 'Tour Prep: Monday, November 9, 2026, 4:00 PM (Sam and Alex Placeholder)',
      note: 'Made-up example. Shortened: a few parts, and one home on the tour sheet and the agent-only page.',
      blocks: [
        { h: 'Flags' },
        {
          items: [
            'Buyer agreement: your note says the Exclusive Buyer-Broker Agreement went out by e-sign on 11/05 and isn’t signed yet. Get it signed before the tour (in person or live virtual).',
            'One showing needs notice today. See the Agent-Only Page, home 4.',
            'FHA: one sheet doesn’t list FHA in its Terms (home 2).',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'No home meets every must-have: Spanish Fork checks the most boxes (bedrooms, baths, a 3-car garage, a garden yard and an unfinished basement) but is $24,900 over the $600,000 budget, and West Jordan meets the bedrooms, baths, garage, budget and HOA, with yard space to check. Sandy’s sheet lists cash or conventional only (they’re FHA) and a 1-car garage, and the Murray condo has no garage or yard and rental restrictions. Before 4:00 PM Monday: get the buyer agreement signed and send the one notice on the Agent-Only Page today.',
          ],
        },
        { h: 'Tour at a glance' },
        {
          table: {
            caption: '3 of its 11 columns',
            head: ['Home', 'Price', 'Above grade / basement sq ft'],
            rows: [
              // A no-break space after each number, so it never sits alone on a line at 390 pixels.
              ['1.\u00a0Murray', '$379,900', '1,320 / no basement (2nd floor unit)'],
              ['2.\u00a0Sandy', '$489,900', '1,220 / 1,180 (60% finished)'],
              ['3.\u00a0Spanish Fork', '$624,900', '2,410 / 1,205 (0% finished)'],
              ['4.\u00a0West Jordan', '$575,000', '1,560 / 1,040 (100% finished)'],
            ],
          },
        },
        { h: 'Home by home: 2. 1187 E Placeholder Pine Ave, Sandy' },
        { p: [{ strong: 'Look at in person' }] },
        {
          items: [
            'Built 1968 (before 1978): look at painted surfaces for peeling or chipping, and ask for the federal lead-based paint disclosure and pamphlet.',
            'The single-pane aluminum windows.',
            'Basement bedroom: look for an escape window. See what’s unfinished (40%).',
          ],
        },
        { p: [{ strong: 'Red flags in the remarks' }] },
        {
          items: [
            '“Estate sale, sold as-is. Seller will not make any repairs.” The person signing for the estate may never have lived there, so disclosures may be thin. The seller won’t fix things. Under the Utah REPC’s as-is clause the buyer can still inspect, as long as the offer includes the Due Diligence Condition.',
            'Terms: Cash, Conventional. FHA isn’t listed. Ask the listing agent, and have the buyers’ lender weigh in.',
            'Two price cuts totaling $40,000; 51 days on MLS.',
            'The public remarks also describe who the home suits; that wording isn’t repeated here or on the tour sheet.',
          ],
        },
        { h: 'Buyer tour sheet (share this page)' },
        { p: [{ strong: 'Tour Sheet: Monday, November 9, 2026' }] },
        { p: ['Prepared by Taylor Example for Sam and Alex'] },
        { p: [{ strong: '4. 752 W Sample Ridge Rd, West Jordan' }] },
        {
          p: [
            '$575,000 | 4 beds (3 up, 1 down) | 2 full and 1 half bath up, 1 three-quarter bath down | 1,560 sq ft above grade + 1,040 sq ft finished basement | 0.17 acres | Built 1999 | HOA $45 a month (common areas)',
          ],
        },
        {
          p: [
            'Good to know: kitchen updated 2022, roof 2021. Basement bedroom has an egress window per the listing.',
          ],
        },
        { p: ['Look for: room for a garden in the fenced yard; the updated kitchen.'] },
        {
          p: [
            'From your list: Meets: bedrooms, baths, 2-car garage, under $600,000, HOA under $250. Check: garden space, the HOA’s rental rules.',
          ],
        },
        // No-break spaces hold the rating scale together, so it wraps as one piece, never after the 1.
        { p: ['Notes: ____________________ My\u00a0rating:\u00a01\u00a0\u00a02\u00a0\u00a03\u00a0\u00a04\u00a0\u00a05'] },
        {
          p: [
            'Questions about schools, safety, flood zones or the area: the school district, the local police department and FEMA’s flood maps are the official sources, and I’m glad to help you find them.',
          ],
        },
        { h: 'Agent-only page: do not share or forward' },
        { p: [{ strong: 'Before the tour' }] },
        {
          items: [
            'Get the buyer agreement signed before 4:00 PM Monday (sent 11/05, not signed per your note).',
            'Home 4 needs 24 hours’ notice to the tenant. For a 4:00 PM Monday showing, that notice goes out by 4:00 PM today, Sunday.',
            'Home 1 needs 2 hours’ notice and home 3 needs 1 hour, through Aligned Showings.',
            'Left out for fair housing: your note says they asked about schools. That wasn’t assessed; the tour sheet points to the school district.',
          ],
        },
        { p: [{ strong: '4. 752 W Sample Ridge Rd, West Jordan' }] },
        {
          items: [
            'Access and showing notes: tenant occupied; confirm with the tenant 24 hours ahead (contact on the MLS sheet, not repeated here). Lockbox location and code, and the alarm code, are on the MLS sheet (not repeated here).',
            'What the agent remarks say: the tenant is there through 12/31/2026. Multiple offers are expected; offers are due Monday 11/16/2026 at 5:00 PM. The seller prefers settlement after 01/05/2027.',
            'Worth sharing? If the buyers like it, they’ll need to decide within a week, and settlement would be in January. Tell them there’s a deadline and take the terms to offer-strategy.',
          ],
        },
        { p: [{ strong: 'Questions for the listing agent' }] },
        {
          items: [
            'Is the 11/16 5:00 PM deadline firm, and how many offers do you expect?',
            'Can you send the HOA’s CC&Rs, including any rental rules?',
            'Will the tenant be out before a January settlement?',
          ],
        },
        { h: 'Check before sending' },
        {
          items: [
            'Home 4: $575,000; 4 beds; 2 full and 1 half above grade plus 1 three-quarter down; 980 plus 580 = 1,560 sq ft above grade; 1,040 sq ft basement, 100% finished (Levels); 0.17 acres; built 1999; HOA $45 monthly (HOA); kitchen 2022, roof 2021, egress window (Features, Public Remarks).',
            'Agent-only check: the tour sheet holds no agent remarks, showing instructions, occupancy, access details, codes, names or phone numbers.',
          ],
        },
      ],
    },
    {
      // SKILL.md, section 10, "Output, In This Order", in its order.
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: a buyer agreement not confirmed, a home that isn’t Active, a showing notice due before the tour, financing terms that leave out your buyer’s loan type, sheets printed before today, missing or client-version sheets, and blanks for you to fill.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: how many homes, the one or two things to handle before the tour, and which homes meet the most of your buyers’ stated criteria.',
        },
        {
          title: 'Tour at a glance',
          body: 'One table, a row per home: status, price, beds and baths by level, above-grade and basement square feet kept apart, year built, HOA per month, days on market and price changes.',
        },
        {
          title: 'Home by home',
          body: 'The rest of each home’s facts, three to six things to look at in person, red flags in the public remarks (like as-is, a short sale, rental caps, water shares or price cuts), and fit against your buyers’ stated criteria.',
        },
        {
          title: 'A buyer tour sheet',
          body: 'One page to share, with the homes in your order: public facts, what to look for, fit, and a notes and rating line for each home. It ends by pointing your buyers to official sources for schools, safety and flood zones.',
        },
        {
          title: 'An agent-only page',
          body: 'Not for sharing. What has to happen before the tour, like a showing notice that must go out today. For each home: access notes (never the codes), what the agent remarks say and mean for your buyers, and up to six questions for the listing agent.',
        },
        {
          title: 'Check before sending',
          body: 'Every price, date, size, fee and quoted remark on the tour sheet and in the questions, with the sheet and field it came from.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own (its opening and section 9), and page-notes.md's.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads and sorts. You run the tour.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the reading',
          body: 'Reads every MLS sheet to its last page, sorts public fields from agent-only ones, does the math (price changes, monthly HOA dues), and checks each home against your buyers’ stated criteria.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The buyer tour sheet and the questions for each listing agent. Nothing reaches your buyers or a listing agent until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'The tour order and appointments, through your showing service. What to tell your buyers about anything agent-only. Whether to write an offer, and on what terms. Compensation, and fair housing judgment calls. Payment and banking details: the AI never handles them.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need", and its sources (checked 2026-11-08). No ChatGPT Free limits as
      // numbers. Team plans have skills on by default; an owner controls them on Team and Enterprise.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. Claude’s help center lists skills on every plan, Free included.',
          tag: 'Team or Enterprise: an owner controls skills',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on free ChatGPT too.',
          tag: 'Free ChatGPT has upload limits',
        },
        {
          title: 'A computer',
          body: 'To set it up once, on claude.ai, in the Claude desktop app or on the ChatGPT website. Saving MLS reports as PDFs is easiest on a computer too.',
        },
        {
          title: 'MLS sheets, as PDFs',
          body: 'The agent version of your MLS report for each home, with agent remarks and showing instructions. One PDF per home, or one PDF with every home. A client version works too, but your agent-only page will have less on it.',
          tag: 'Required, from your MLS',
        },
        {
          title: 'Your buyers’ criteria',
          body: 'Optional. Type them in your message, like “3+ beds, under $550k, a garage,” or paste your Follow Up Boss note into the chat.',
        },
        {
          title: 'No connectors, no extra cost',
          body: 'A connector links the AI to another app, like your CRM. This skill needs none, and never writes to your CRM. Nothing to pay beyond your Claude or ChatGPT plan.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From": UtahRealEstate.com's Support
      // Center ("Creating a Custom Report") and its Rules and Regulations Reference Guide (revised
      // February 11, 2026); Claude's help center, "Upload files to Claude". All checked 2026-11-08. The
      // report's exact name on the menu is unconfirmed, so the page says so and gives the support line.
      kind: 'list',
      heading: 'Where to get your MLS sheets',
      items: [
        {
          title: 'On UtahRealEstate.com',
          body: 'Run your search and check the box for each home on the tour. Open the View Reports drop-down and pick the full report that includes Agent Remarks and Showing Information. Print it or save it as a PDF.',
        },
        {
          title: 'Not sure which report?',
          body: 'We couldn’t confirm the report names on that menu. UtahRealEstate.com support can tell you which one includes Agent Remarks: 801-676-5400.',
        },
        {
          title: 'On another MLS',
          body: 'Use the agent (not client) full report for each home, saved as a PDF.',
        },
        {
          title: 'Why the agent version',
          body: 'On UtahRealEstate.com, showing instructions, lockbox and alarm codes, occupancy and contact details go only in the member-only Agent Remarks field. The AI needs to see them to keep them off your buyers’ page and to build yours.',
        },
        {
          title: 'To attach them in Claude',
          body: 'Click + in the lower left of the chat box, choose Add files or photos, pick the files and click Open. Or drag them into the chat. Claude takes up to 20 files in a chat.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", with curly apostrophes, without the one tied to an Arizona tour,
      // with "these" for "these four" in the first, and "the buyers" for a made-up name.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach the MLS sheets, and paste. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with the MLS sheets attached',
          items: [
            'Showing these tomorrow at 4. Prep me and make a tour sheet for the buyers.',
            'Make a one-page tour sheet I can print for my buyers. Keep the agent stuff off it.',
          ],
        },
        {
          label: 'With your buyers’ criteria',
          items: [
            'Here are Saturday’s MLS sheets and my Follow Up Boss note on the buyers. What should I ask each listing agent?',
            'Which of these homes fit their list: 3 beds, a garage, under $550k?',
          ],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md, sections 2 and 8; page-notes.md's FAQ and "Privacy".
          q: 'Will my buyers see the private remarks or the lockbox codes?',
          a: [
            'Not on the tour sheet. Agent remarks, showing instructions, occupancy, and owner or tenant names and phone numbers go only on your agent-only page. Lockbox, gate and alarm codes aren’t repeated anywhere, not even there. Your page just says “code is on the MLS sheet; not repeated here.” If the private remarks hold something your buyers should know, like a special assessment, your agent-only page says so. It suggests you ask the listing agent for the document and check with your broker on how to share it. Your uploaded MLS sheets still hold everything, so share the tour sheet, never the chat.',
          ],
        },
        {
          // SKILL.md, sections 6 and 9; page-notes.md's FAQ (24 CFR 100.70 on steering).
          q: 'My buyers asked about schools. Why doesn’t the AI answer?',
          a: [
            'Commenting on schools, safety or who lives nearby can steer buyers, which fair housing law prohibits. The AI checks each home only against your buyers’ stated criteria about the home itself. The tour sheet points your buyers to the school district, the local police department and FEMA’s flood maps instead. The AI also never repeats a listing’s line about who a home suits.',
          ],
        },
        {
          // SKILL.md, section 1; page-notes.md's FAQ (NAR, "Written Buyer Agreements 101").
          q: 'Why does the AI flag the buyer agreement?',
          a: [
            'Since August 17, 2024, NAR’s MLS policy has required a signed written buyer agreement before you tour a home with a buyer, in person or live virtual. If your message or note doesn’t say it’s signed, the AI reminds you at the top. It never states the agreement’s terms or a fee.',
          ],
        },
        {
          // SKILL.md, section 1 (Utah mode and general mode); page-notes.md, "Who It's For" and "Not
          // tested"; eval 3 (two Arizona sheets from a different layout).
          q: 'Does it work outside Utah?',
          a: [
            'Yes, from your MLS sheets alone. The skill is built for Utah first: it knows water shares, HOA rental caps, the REPC’s as-is clause and radon. In another state, the AI works only from your sheets and says at the top that state rules weren’t checked. We tested it on made-up sheets laid out like real agent reports, not on real ones yet, so your MLS may label fields differently.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Not tested". ChatGPT Free's limits without numbers: they
          // came from search excerpts and the pricing page. The practice set is five files, plus four
          // for the Project.
          q: 'Which plan do I need?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s docs list them on Pro and up. If your Free account shows no way to add a skill, that’s why. In ChatGPT, a Project works on the free plan, but free ChatGPT limits how many files you can upload a day and how much text fits in one message. So on free ChatGPT, setup and practice can take more than one day, and a big tour may not fit in one message: save the tour’s sheets as one PDF. We haven’t tried the skill on Claude’s free plan or inside ChatGPT yet, so run the practice files first.',
          ],
        },
        {
          // page-notes.md, "What It Will Not Do"; SKILL.md, section 9.
          q: 'What won’t the AI do?',
          a: [
            'The AI won’t plan the route, book showings or confirm appointments. Your showing service, like ShowingTime, and your MLS’s routing report already do that, and the AI keeps the homes in the order you give. It won’t say what to offer, call a home overpriced or a good deal, or estimate repair costs. It never sends anything or writes to your CRM, and it leaves bank account and wire details out of what it writes.',
          ],
        },
      ],
    },
    {
      // skills/offer-strategy/SKILL.md: a listing's MLS sheet, comps and an optional preapproval letter
      // become recommended offer terms for a buyer.
      kind: 'note',
      body: [
        'Deciding what to offer on one of the homes? ',
        { link: 'Offer Strategy', href: '/offer-strategy', sameTab: true },
        ' turns its MLS sheet and your comps into recommended offer terms.',
      ],
    },
  ],

  unlockKey: 'stp-unlocked',
});
