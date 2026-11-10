// Every word on /recruiting-prep that is its own: the landing page for Recruiting Prep, a free skill
// (`skills/recruiting-prep/`, version 1.0) that preps a real estate team's agent recruiting in two modes.
// List mode turns the recruit list a team already has (an MLS agent production report, a BrokerMetrics,
// Sisu, GoHighLevel or Follow Up Boss export, or a tracker, often mixed) into one de-duplicated list
// tiered by production, with why-now signals, owners by tier, first-touch drafts and a clean CSV.
// Appointment mode preps one recruiting coffee from a candidate's production and the team's own offer.
// What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md and its references), its page notes, its graded runs
// (three evals and the practice run, all passed, plus a reviewer's second runs of case 3 and the
// practice) and the build and review reports, so the page promises what the skill does. For team
// leaders, recruiters and appointment setters: Connor presents it at the Forum, November 13 to 15.
//
// What the page holds to, as SKILL.md does: tiers on production only, never on anything personal; no
// income, earnings or revenue-share projection, ever; nothing negative about a candidate's brokerage;
// every recruiting text and email treated as marketing, with texts only for documented consent. MLS
// data rules vary by MLS, so the page says to check yours.
//
// Calls left open, and how the page handles them:
//   - Whether a recruiting text counts as telemarketing in a given state is Connor's open question. The
//     page says only what page-notes.md and references/outreach-rules.md say: the federal answer isn't
//     settled, the drafts follow every marketing text rule anyway, and state rules differ.
//   - Gmail drafts: SKILL.md allows them when asked, but no run tested a connector, and Claude's pages
//     disagree on whether its Gmail connector writes drafts (see due-diligence-review.ts). The page
//     promises no Gmail draft. Google Drive, Microsoft 365 and Granola are named as optional, read only
//     and untested.
//   - Claude Free: the help center lists skills on every plan, the docs Pro and up, and no run used Free.
//     ChatGPT Free's file and upload numbers came only from search excerpts, so the page's own words state
//     none of them. The ChatGPT version was not run inside ChatGPT, and no real MLS, BrokerMetrics, Sisu
//     or GoHighLevel export was tested; the page says both.
//
// `setupMinutes` is an estimate (page-notes gives none): 10, as the other skill pages with a ChatGPT
// version say for the same shared steps. The practice set is two files, attached one by one. The note
// points to Team Playbook Builder, for an agent who has already joined (page-notes.md, "What It Won't
// Do").
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const RECRUITING_PREP: Guide = skillPage({
  slug: 'recruiting-prep',
  title: 'Recruiting Prep',

  meta: {
    title: 'Recruiting Prep: A Free AI Skill · Amplified Impact',
    description:
      'Upload your recruit list and get it back with the duplicates merged and the list tiered by production, plus a first-touch email for each tier. Or prep one recruiting coffee from a candidate’s production. A free skill for Claude and ChatGPT.',
  },

  // Non-breaking spaces keep the audience on one line at phone width, as /counter-explainer does.
  eyebrow: 'Free AI Skill · For\u00a0Team\u00a0Leaders\u00a0and\u00a0Recruiters',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Upload the recruit list you already have, and the AI hands it back clean and tiered by production, with a first message for each tier. Or upload one candidate’s production and walk into your recruiting coffee prepared.',
  outcome: { n: '03', title: 'Know Who to Call First', body: 'A clean list by tier, drafts you read first, and prep for each coffee.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one drafts for you and never sends anything.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page), and what the
    // workbook and one-pager hold.
    prompt:
      'Here’s our recruit list (the MLS export and our own list are two tabs) and our value proposition one-pager. Organize and tier the list and draft first-touch messages. Then prep me for my coffee with Marisol Quillpocket on Tuesday, November 10 at 11.',
    note: [
      'There are two files: a workbook with two tabs (an MLS export and a team’s own recruit list) and that team’s value proposition. Every name, number and address in them is made up. Look for the duplicates merged, the opt-out left out of every draft, and a results claim in the value proposition flagged for your broker. ',
    ],
  },

  real: {
    // SKILL.md, section 1: any export or spreadsheet, mixed; the roster and the offer document are optional.
    body: [
      'Start a new chat the same way, attach your own recruit list (one file or several, mixed is fine) and your value proposition if you have one, and say this.',
    ],
    prompt: 'Here’s our recruit list. Clean it up, tier it, and give me first-touch messages for each tier.',
    // SKILL.md, section 1 (the MLS flag) and section 8 (Check before sending).
    note: [
      'Before you upload an MLS report, check that your MLS’s rules allow using it for recruiting and putting it into an AI tool. “Where to get your list,” below, shows how to export it. Before anything goes out, check every name, number and date in the ',
      { strong: 'Check before sending' },
      ' list against your files.',
    ],
  },

  chatgpt: { paste: chatgptPaste('recruiting-prep') },

  sections: [
    {
      // sample.md (the practice run, 12 of 12 checks), shortened, in the output's own order and its own
      // words, cut only by whole items, rows, columns and sentences: the opening line, the bottom line,
      // five of seven flags, what was merged, the tiers (three of six columns), four of eight why-now
      // signals, the consent line, the Growing angle and email, one text, then the coffee: the profile,
      // the needs, four of ten discovery questions and the don't-ask list, the terms as written, one of
      // eight objections and its "Never" line, and five lines of the check list. Drawn to read on a
      // phone without hiding a column: the merge table as a list, the why-now ID, agent and level in one
      // column, the profile's totals turned on their side (its listing and buyer rows left to the side mix
      // and average price lines under it, which give 14 and 8), and the email's signature and footer lines
      // joined into one paragraph each.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a recruiting prep looks like',
      body: 'What the AI wrote from the practice files: a made-up team’s recruit list (an MLS export and their own list) and their value proposition. They’re the same files you practise on in setup.',
      title: 'Recruiting Prep: Harborlight Example Team',
      note: 'Made-up example. Shortened: one first-touch email of four, one text of two, one objection of eight, and parts of the rest. The follow-up email is left out.',
      blocks: [
        {
          p: [
            'Two parts: your recruit list, organized and tiered with first-touch drafts, then your coffee with Marisol Quillpocket on Tuesday, November 10 at 11.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'The two tabs hold 102 rows and 83 unique agents: using your one-pager’s levels, 5 are Established (25+ sides), 14 Growing (12 to 24) and 49 Building (0 to 11), with 14 more on Our List but not in the MLS report and 1 opted out. Start with the 5 Established agents and the 14 Growing ones, where your listing coordinator is the clearest offer. For Marisol, a listing-heavy Growing agent up 5 sides on last year, the conversation is about what a listing takes from her today and what your listing coordinator would take off her plate.',
          ],
        },
        { h: 'Flags' },
        {
          items: [
            'MLS data check: the MLS Export tab is a Bayside Example MLS Agent Production Report. Confirm your MLS rules allow using it for recruiting and putting it into an AI tool.',
            'A claim to take to your broker: your one-pager says “Agents who join Harborlight close 40% more transactions in their first year.” That’s a results claim about what agents will achieve. I left it out of every draft and answer; have your broker review it before it goes in front of a recruit.',
            'At your brokerage: R020 Dev Crumpetnook’s MLS office is Marigold Example Realty, your brokerage. No roster was uploaded, so I kept them in the tiers but out of the drafts. Tell me if they’re not on your team.',
            'Notes left out: 22 rows on Our List have notes. I didn’t read them into tiers, angles or drafts, and they’re not in the CSV. 1 row holds personal details (kinds: family or familial status, personal finances); consider deleting it from Our List.',
            'State rules: your one-pager’s address is in North Carolina. State texting rules were checked only for Florida, Maryland and Oklahoma, so North Carolina’s own rules were not checked: confirm with your broker.',
          ],
        },
        { h: 'What was merged' },
        { p: ['102 rows minus 19 merges = ', { strong: '83 unique agents' }, '.'] },
        {
          items: [
            'Same MLS agent ID, 2 merges: one row pasted twice (BSX50219, Kit Parsniptoes: identical, kept once) and one agent under two offices (BSX50439, Joss Cloversnout: rows added together).',
            'Same email, 9 merges: 8 Our List rows matched to MLS agents, plus 1 Our List row entered twice (capitalized email).',
            'Same phone and last name, 8 merges: Our List rows with no email, matched by cell number.',
          ],
        },
        {
          p: [
            'No possible duplicates. ',
            { strong: 'Opted out (1): ' },
            'R083 Yara Cloversprout (“STOP” on Our List) stays in the CSV as Do not contact and gets no draft.',
          ],
        },
        { h: 'Tiers' },
        {
          p: [
            { strong: 'Your one-pager’s levels' },
            ' (“What You Get, By Where You Are”), applied to Total Sides in the MLS report:',
          ],
        },
        {
          table: {
            caption: 'Agents by level',
            head: ['Level', 'Agents', 'Sides'],
            rows: [
              ['Established (25+ sides)', '5', '185'],
              ['Growing (12 to 24 sides)', '14', '239'],
              ['Building (0 to 11 sides)', '49', '260'],
              ['Not tiered (Our List only, no MLS data)', '14', ''],
              ['Do not contact', '1', ''],
            ],
          },
        },
        {
          p: [
            'Our List’s “Approx Units” are self-reported, so they’re in the CSV under Units Not Used but never set a level.',
          ],
        },
        { h: 'Why now' },
        {
          p: [
            'From the files only. “Up” and “down” use a default threshold: a change of 25% or more and at least 3 sides against the MLS report’s prior 12 months.',
          ],
        },
        {
          table: {
            caption: 'Four of eight signals',
            head: ['Agent', 'What the data shows'],
            rows: [
              [
                'R005 Dev Tansymuffin, Established',
                'Our List says Pinecrest Example Homes (last touch 2026-04-20); the MLS report shows Copperleaf Example Real Estate. Also up: 26 sides against 18.',
              ],
              ['R007 Marisol Quillpocket, Growing', 'Up: 22 sides against 17'],
              ['R018 Gwen Mittennoggin, Growing', 'Down: 12 against 16'],
              ['R060 Rafe Kettlesprout, Building', 'New production: 2 sides, 0 in the prior 12 months'],
            ],
          },
        },
        {
          p: [
            'An office that differs between your list and the MLS can also mean your list is out of date. Confirm it before you bring it up, and never in a first-touch message.',
          ],
        },
        { h: 'Angles and first-touch drafts' },
        {
          p: [
            'Each angle comes from your one-pager’s offer for that level. Drafts use [First Name] only: no one’s production, office or move.',
          ],
        },
        {
          p: [
            { strong: 'Text consent: ' },
            '3 contacts have documented consent (a signed opt-in or form with a date): R007 Marisol Quillpocket (Growing; you’re already meeting her, so no first touch), R022 Uma Marblebottom (Building) and R074 Flo Noodlebloom (not tiered). R065 Kit Parsniptoes has a bare “yes” with no record named: no text until you confirm one. Everyone else: email only.',
          ],
        },
        {
          p: [
            { strong: 'Angle (your one-pager, Growing): ' },
            'time back on listings. A listing coordinator who handles photos, launch and listing paperwork, plus a marketing budget for your sphere.',
          ],
        },
        {
          email: {
            subject: 'Comparing Notes On Listing Support',
            body: [
              'Hi [First Name],',
              'I’m [Agent Name] with the Harborlight Example Team at Marigold Example Realty. I’d like to hear what a listing takes from you, start to finish, and share how we handle it.',
              'Agents at your level on our team get a listing coordinator who handles photos, launch and listing paperwork, along with a marketing budget for their sphere.',
              'Would a 20-minute coffee work this month?',
              '[Agent Name], [Title], Harborlight Example Team, Marigold Example Realty, [Agent Phone]',
              'This is a recruiting message from [Agent Name], Harborlight Example Team at Marigold Example Realty. To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. Harborlight Example Team, 77 Lantern Way, Suite 4, Seabright Example, NC',
            ],
          },
        },
        {
          p: [
            { strong: 'Building text (only to R022 Uma Marblebottom): ' },
            '“Hi [First Name], it’s [Agent First and Last Name] with the Harborlight Example Team at Marigold Example Realty. Would you be up for coffee to talk about the support we give agents on every deal? [Agent Phone]. Reply STOP to opt out.”',
          ],
        },
        { h: 'Coffee with Marisol Quillpocket, Tuesday, November 10, 11 a.m.' },
        {
          p: [
            'From the MLS Export tab (Bayside Example MLS, closed 11/01/2025 to 10/31/2026). Agent MLS ID BSX50999, Copperleaf Example Real Estate.',
          ],
        },
        {
          table: {
            caption: 'Production profile',
            head: ['', 'Total sides', 'Total volume'],
            rows: [
              ['This period', '22', '$9,033,500'],
              ['Prior 12 months', '17', '$6,429,000'],
              ['Change', '+5 (5 / 17 = 29%)', '+$2,604,500 ($2,604,500 / $6,429,000 = 41%)'],
            ],
          },
        },
        {
          items: [
            'Side mix: 14 / 22 = 64% listing sides. Listing heavy.',
            'Average sale price: $9,033,500 / 22 = $410,614. Listing sides $5,688,500 / 14 = $406,321; buyer sides $3,345,000 / 8 = $418,125.',
          ],
        },
        { h: 'What agents at this level usually need' },
        {
          p: [
            { strong: 'From your one-pager, “Growing (12 to 24 sides)”: ' },
            '“Everything above, plus a listing coordinator who handles photos, launch and listing paperwork. Your own marketing budget of $1,500 a year for your sphere. Priority on team listing leads in your area.”',
          ],
        },
        {
          p: [
            { strong: 'General guidance, not from your documents: ' },
            'a listing-heavy agent at this level often cares most about time back on listings, the economics of split, cap and fees, and keeping control of their own name and database.',
          ],
        },
        { h: 'Discovery questions' },
        {
          items: [
            '“What’s working best in your business right now?”',
            '“Listings look like a big part of your business. What does a listing take from you, start to finish?”',
            '“What does the next 12 months look like if everything goes right?”',
            '“How does your current agreement handle your listings and pending deals if you move? That’s one to check with your broker or your own attorney.”',
          ],
        },
        {
          p: [
            { strong: 'Don’t ask, and don’t write down if she volunteers it: ' },
            'age or retirement plans, marriage or partner, children, pregnancy or family plans, health, religion, national origin or citizenship, race, sexual orientation or gender identity, or personal finances.',
          ],
        },
        { h: 'Terms as written' },
        {
          p: [
            'From your one-pager, “Splits, Cap and Fees,” word for word. Hand this over if she asks for your numbers; she runs them with her own accountant or advisor, and I won’t run them for her.',
          ],
        },
        {
          p: [
            '“Team-generated leads: 50/50. Your own leads and sphere: 80/20 to you. Team cap: $18,000 a year in team split; after cap, your own leads are 100% to you and team leads are 70/30. Transaction fee: $395 per closed side, paid at closing. Marigold Example Realty’s brokerage fees are separate and set by the brokerage.”',
          ],
        },
        { h: 'Objections and answers' },
        {
          p: [
            { strong: 'Split: “My split is better where I am.” ' },
            '“That’s fair, and it matters.” Ask: “Beyond your split, what do you pay for yourself today: a coordinator, photos, marketing?” Answer from the one-pager: “Team-generated leads: 50/50. Your own leads and sphere: 80/20 to you.” And at her level that includes a listing coordinator, a transaction coordinator on every deal and a marketing budget for her sphere. Next step: offer the terms in writing so she can compare them with her own accountant or advisor. Don’t run the numbers on her business.',
          ],
        },
        {
          p: [
            'Never: a “you’d make more” number, a lead count, or anything negative about Copperleaf Example Real Estate or her broker.',
          ],
        },
        { h: 'Check before sending' },
        {
          items: [
            'Texts: 2 first-touch texts (R022, R074); check each consent record names your team or brokerage and the number. R065 held for a record; R020 held until you confirm they’re not on your team.',
            'Before any call or text: scrub against the National Do Not Call Registry and your internal list; R083 is Do not contact.',
            'Quiet hours: texts only between 8 a.m. and 8 p.m. in the recipient’s local time, and no calls or voicemails on a Sunday or a legal holiday.',
            'Email: a working [Unsubscribe Link] (live at least 30 days). The postal address on your one-pager has no ZIP code; add it so it’s a complete postal address.',
            'North Carolina: state texting and telemarketing rules were not checked; confirm with your broker.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order": list mode's nine parts, then appointment mode's, with the bottom
      // line, flags and Check before sending said once for both (as SKILL.md runs them when asked for both).
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'A bottom line',
          body: 'Three sentences at most. For a list: how many unique agents, how many in each tier, and the first calls to make. For a coffee: who the candidate is by production, what they likely need, and the one thing to learn.',
        },
        {
          title: 'Flags',
          body: 'The check that your MLS’s rules allow this use, blanks for you to fill, files that disagree, notes left out, state rules, and any earnings or results claim in your documents for your broker to review.',
        },
        {
          title: 'What was merged',
          body: 'Rows read from each file, unique agents out, and how each merge was made. Possible duplicates are listed for a person to check, not merged. Agents on your roster come off, opt-outs stay as Do not contact, and agents at your own brokerage are held from drafts.',
        },
        {
          title: 'Tiers by production',
          body: 'Your team’s tiers, the levels in your value proposition, or default tiers from the spread of production on your list, labeled as defaults with the cut points shown. Counts, sides and volume for each. A tracker’s self-reported numbers never set a tier.',
        },
        {
          title: 'Why now, and owners by tier',
          body: 'Signals from the data only: production up or down, new production, or an office change, each with its source and never a guess about someone’s life. Then the owners your files already assign, or suggestions by role from your roster.',
        },
        {
          title: 'First-touch drafts',
          body: 'For each tier, the reason to reach out and one email. A text only for contacts your file shows have documented consent. No draft mentions anyone’s production or office move.',
        },
        {
          title: 'The organized list',
          body: 'A CSV file that opens as a spreadsheet: one row per agent, every source row traced, and no notes column.',
        },
        {
          title: 'For a coffee: a production profile',
          body: 'The candidate’s last 12 months from their file: sides, volume, listing and buyer split, and average price with the math shown, against the year before when the file has it.',
        },
        {
          title: 'What they likely need, and what to ask',
          body: 'Needs from your value proposition first, quoting the section. Anything else is labeled general guidance. Open discovery questions, and a list of personal topics not to ask about.',
        },
        {
          title: 'Your offer and your terms',
          body: 'Each likely need against what your value proposition says, or “Not in your documents.” Your split, cap and fees quoted word for word, when your files or your message state them, with no math.',
        },
        {
          title: 'Objections and a follow-up email',
          body: 'Likely objections answered from your documents, with a blank where they’re silent. A follow-up email in business terms only, with an unsubscribe line.',
        },
        {
          title: 'Check before sending',
          body: 'Every number, date, name and quoted term traced to its file, plus consent counts, the Do Not Call scrub, quiet hours, and your unsubscribe link and postal address.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own and page-notes.md's, in the page's words; SKILL.md, Guardrails, for the
      // bank, wire and Social Security line.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI sorts and drafts. You decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the sorting',
          body: 'Reads every file in full, merges the duplicates, does the production math with code, not by eye, tiers the list, finds the signals in the data, and sorts out who has documented text consent.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The first-touch emails, texts only for contacts with documented consent, the discovery questions, the objection answers and the follow-up email. Nothing goes out until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Who to recruit, who calls them, and any offer. Every split, cap and fee. Texting consent, the Do Not Call scrub, the MLS rules check, and the fair housing and fair treatment review of anything that goes out. The AI never asks for or repeats bank, wire or Social Security numbers.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need" and "What to Upload", and the build report's needs (connectors,
      // accounts and cost). No ChatGPT Free limits as numbers: they came only from search excerpts.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on, so Claude can merge and tier your list with code. Claude’s help center lists skills on every plan, Free included. Claude’s developer docs list them on Pro and up, so if your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner turns on code execution',
        },
        {
          title: 'Or a ChatGPT plan',
          body: 'The ChatGPT version goes in a Project, a folder in ChatGPT that keeps instructions and files together. To merge and tier the list, it needs data analysis, the ChatGPT tool that works with spreadsheets. ChatGPT’s free plan limits data analysis.',
          tag: 'Free ChatGPT limits uploads and data analysis',
        },
        {
          title: 'A computer',
          body: 'Setting up a skill is easiest on a computer. It’s also the easy way to export your list from your MLS or recruiting tool and attach it.',
        },
        {
          title: 'Your recruit list',
          body: 'An MLS agent production report, a BrokerMetrics, Sisu, GoHighLevel or Follow Up Boss export, or your own tracker. Mixed is fine. Your roster and your value proposition (what your team offers agents, in writing) help, but aren’t needed.',
          tag: 'Excel, CSV, PDF or Word. Nothing to retype.',
        },
        {
          title: 'Connectors, if you want',
          body: 'A connector links Claude to another app. With Google Drive or Microsoft 365, Claude can read your value proposition there. With Granola, Claude can read a recruiting meeting’s notes. All read only, Claude only, and not tested yet.',
          tag: 'Granola transcripts need its Business or Enterprise plan',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude or ChatGPT plan and the MLS access or recruiting tool you already use.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where It Comes From": each vendor's help center, checked
      // 2026-11-08. No MLS has one click path, so the page sends people to their MLS's help desk.
      kind: 'list',
      heading: 'Where to get your list',
      items: [
        {
          title: 'An MLS agent production report',
          body: 'Every MLS builds these differently. Ask your MLS’s help desk how to export agent production for the last 12 months as Excel or CSV. Check your MLS’s rules on using it for recruiting first.',
        },
        {
          title: 'BrokerMetrics',
          body: 'Open the Overview or Contact Information grid, then click File, then Export. The file holds the agents and columns on screen.',
        },
        {
          title: 'Sisu Recruiting & Onboarding',
          body: 'On the Recruits page, click the Download icon on the right. It saves the recruits on screen as a spreadsheet.',
        },
        {
          title: 'GoHighLevel',
          body: 'Click Opportunities in the left sidebar, then the three dots at the top right, then Export Opportunities. Or open a Smart List, click its three dots, then Export.',
        },
        {
          title: 'Follow Up Boss',
          body: 'Open People, then All People, and filter to your recruits. Check the box next to Name and choose Select All. Click Export (the downward arrow), check the box to export all columns, then click Yes, Export People. The account owner can export, and anyone the owner gives Can Export.',
        },
        {
          title: 'Your own tracker',
          body: 'Attach the Excel or CSV as it is. From a Google Sheet, click File, then Download, and choose Microsoft Excel or CSV.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", all five.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your files, and paste. Change the names, days and tiers to yours. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'A recruit list, with your files attached',
          items: [
            'Here’s our MLS production report and our recruiting tracker. Clean it up, tier it, and give me first-touch messages for each tier.',
            'Here’s our GoHighLevel recruiting pipeline. Our tiers: A is 20 or more closings, B is 10 to 19, C is under 10. Split them between Avery and Jordan.',
          ],
        },
        {
          label: 'In the same chat, with your roster attached',
          items: ['Here’s our roster too. Take our own agents off and tell me who should work which tier.'],
        },
        {
          label: 'One recruiting coffee',
          items: [
            'I’m having coffee with Dana on Thursday. Here’s her MLS production page and our value proposition. Prep me.',
            'Here are my notes from coffee with Dana. Write the follow-up email.',
          ],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md, Guardrails; page-notes.md, "What It Won't Do".
          q: 'What won’t it do?',
          a: [
            'The AI never tiers, ranks or writes about anyone by age, family, pregnancy, marital status, health, religion, national origin or any other personal trait, even if your notes or your message mention one. It never reads a notes column into anything. It never says anything negative about a candidate’s current brokerage, team or broker. It never sends a message or changes Follow Up Boss, Sisu or GoHighLevel: drafts only. License transfer, contract and tax questions go to your broker, attorney or CPA.',
          ],
        },
        {
          // page-notes.md, FAQ; references/recruiting-guardrails.md (FTC, 87 FR 13951).
          q: 'The candidate wants to know what they’d make with us. Can the AI run the numbers?',
          a: [
            'No, not even from their own production. In the FTC’s cases, a claim about what someone will earn needs a reasonable basis, and whether that reaches a team’s recruiting pitch isn’t settled. So the AI stays out of it entirely. When your files state your split, cap and fees, the AI lays them out word for word, so the candidate can run their own numbers with their own advisor. It also flags any earnings, results or lifestyle claim in your own documents for your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; references/outreach-rules.md, "Recruiting Texts to Agents" and the state
          // notes. It never says a recruiting text is not telemarketing.
          q: 'Will it text my recruits?',
          a: [
            'No. The AI never sends anything. It drafts texts only for contacts your file shows have documented consent, like a signed form or a dated opt-in. Anyone with a bare “yes” waits until you confirm a written record. Every text names you and your team and ends with ',
            { strong: 'Reply STOP to opt out' },
            '. Every email has an unsubscribe line and your postal address. Whether federal telemarketing rules reach a recruiting text isn’t settled, so the drafts follow every marketing text rule anyway. State rules differ: the AI adds notes for Florida, Maryland and Oklahoma, and says any other state wasn’t checked. Confirm yours with your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, Guardrails ("Conservative defaults"); the shared outreach-rules.md,
          // Conservative Defaults.
          q: 'Why is it stricter than the law?',
          a: [
            'It uses our conservative defaults. Every email carries the full footer: the line that says it’s a recruiting message, the way to opt out and your postal address. No calls or voicemails go on a Sunday or a legal holiday. A consent record that names only a portal, a lead company or “real estate professionals,” and not your team or brokerage, means no text until your broker confirms it covers you. You can calibrate these with your own legal counsel: tell the AI what your counsel approved, and it follows that and says so in Check before sending.',
          ],
        },
        {
          // page-notes.md, FAQ (Bay East 12.11.1; MLS Now Rule 7.3).
          q: 'Can I upload my MLS’s production report?',
          a: [
            'Check your MLS’s rules first. They vary. Bay East’s MLS rules expressly allow using MLS information to recruit agents to another brokerage. MLS Now’s rules bar giving MLS information to software vendors or online AI tools without a separate license. The AI flags this whenever a file comes from your MLS. Your broker can help you read your MLS’s rules.',
          ],
        },
        {
          // page-notes.md, FAQ.
          q: 'We don’t have tiers or a value proposition.',
          a: [
            'That’s fine. The AI builds default tiers from the spread of production on your own list and labels them as defaults. The drafts get a blank for your offer, and every line about what a candidate needs is labeled general guidance. Tell the AI your tiers, or upload your value proposition, and the AI redoes them in the same chat.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "What Was and Wasn't Tested".
          q: 'Which plan do I need, and what was tested?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account shows no way to add a skill, you need a paid plan. In ChatGPT, a Project with data analysis. Free ChatGPT has limits on uploads and data analysis. We tested the skill in Claude, on made-up lists. We haven’t tried it on Claude’s free plan, inside ChatGPT, on a real export from an MLS or a recruiting tool, or on a list over a few hundred rows yet. So run the practice files first, and the first time you use your own list, check “What was merged” against your file.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Onboarding an agent who just joined? ',
        { link: 'Team Playbook Builder', href: '/team-playbook-builder', sameTab: true },
        ' turns your team’s SOPs into a playbook your new agent can ask.',
      ],
    },
  ],

  unlockKey: 'rp-unlocked',
});
