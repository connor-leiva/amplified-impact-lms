// Every word on /expired-fsbo-outreach that is its own: the landing page for Expired and FSBO Outreach, a
// skill (`skills/expired-fsbo-outreach/`, version 1.0) that turns a list of expired listings (an MLS
// export) or for-sale-by-owner listings (a REDX, Vulcan7 or Landvoice export, or the agent's own list)
// into flags, a bottom line, an agent-only list sorted by the export's own facts with each row's open
// channels, a first touch for every owner who may be contacted (a letter, or an email when the list has
// one), a call opener only where the number was shown scrubbed against Do Not Call, a door-knock note, a
// dated touch plan and Check before sending. What every skill page says the same way is in
// `skill-page.ts` (D-052).
//
// It is paid (the agent set of the Amplified Skill Library), so the page is drawn with its hero and
// sample and the Skill Library card in place of the sign-up and the setup (D-082, automatic from the
// catalog through `skill`). The free words and the setup below stay for the day it is free.
//
// The words come from the skill itself (SKILL.md, references/expired-fsbo-guide.md,
// ethics-and-fair-housing.md and utah-calling-rules.md), its page notes, and its graded runs (the
// practice run 14 of 14, eval 1 12 of 12, eval 2 10 of 10), so the page promises what the skill does.
// The sample is sample.md, the graded practice run, cut only by whole flags, rows, sections and
// sentences; each draft it shows is whole.
//
// Connor's filter, as page-notes.md says it: REDX, Vulcan7 and Landvoice already supply lists, scripts
// and dialers. The page sells what they don't: a first touch from each listing's own facts, and
// compliance checked row by row. It names those vendors only as places a list comes from.
//
// What the page holds to, as SKILL.md does: drafts only, never sent, mailed or dialed. No draft for a
// listing that may still be under a listing agreement, or a FSBO ad that says no agents. Call openers
// only for scrubbed numbers; no texts without written consent. Nothing about why a listing expired, the
// prior agent, a buyer or a price. The home is described, never the owner.
//
// Calls left open, and how the page handles them:
//   - Canceled listings: held until the agent confirms no agreement is in effect, although
//     UtahRealEstate.com uses Canceled only for a terminated agreement. The page says a Canceled listing
//     waits for the agent's confirmation and why (DECISIONS entry asks Connor).
//   - Utah's Sunday and holiday limit (Utah Code 13-25a-103) exempts a licensee acting within the
//     license (13-25a-111). The skill keeps Sundays and Utah holidays call-free anyway, as a conservative
//     default (Connor, 2026-11-10), and in general mode Sundays and the federal holidays (5 U.S.C.
//     6103). The page says both and that a user can calibrate the defaults with their own legal counsel.
//     The sample's "No calls" line was edited to match sample.md after the graded run.
//   - Vendor click paths: only Landvoice's was found (its blog, June 23, 2022). REDX's, Vulcan7's and
//     the MLS's export paths were not confirmed, so the page names no menu for them.
//   - Whether UtahRealEstate.com treats an owner letter that cites its own listing's MLS facts as
//     advertising that needs its disclaimer was not confirmed; the page doesn't raise it (Check before
//     sending carries the MLS questions).
//   - Real exports, an XLSX, more than 15 owners, a voice QUICK CARD, Claude Free and the ChatGPT
//     Project inside ChatGPT were not tested; the page says so, as the other skill pages do.
//
// The practice set is two files (the MLS export and the FSBO export), attached file by file. The sample
// depends on the run date (Tuesday, November 10, 2026: Wednesday was Veterans Day), and the practice note
// says so. `setupMinutes` is an estimate (page-notes gives none): 10, as the other skill pages with a
// ChatGPT version say for the same shared steps. The note points to Pricing Conversation Prep, for an
// owner who books a listing appointment (listing-appointment-prep, the sibling in SKILL.md, has no page
// yet).
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const EXPIRED_FSBO_OUTREACH: Guide = skillPage({
  slug: 'expired-fsbo-outreach',
  skill: 'expired-fsbo-outreach',
  title: 'Expired and FSBO Outreach',

  meta: {
    title: 'Expired and FSBO Outreach: A Free AI Skill · Amplified Impact',
    description:
      'Upload your expired list or your FSBO list, and get a personal first letter for every owner you may contact, a call opener only where the number was scrubbed against Do Not Call, a door-knock note and a two-week plan. A free skill for Claude and ChatGPT.',
  },

  // Non-breaking spaces keep the audience on one line at phone width, as /counter-explainer does.
  eyebrow: 'Free AI Skill · For Listing Agents',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Upload your expired list or your FSBO list, and the AI hands back a personal first letter for every owner you may contact, built from that listing’s own facts. Listings that may still be under contract with another brokerage are held out, and calls go only to numbers scrubbed against Do Not Call.',
  outcome: { n: '03', title: 'Reach Out the Right Way', body: 'A first touch for every owner, and a two-week plan.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI drafts every letter and opener. It never sends, mails or dials anything.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophe, as on every page). The run date
    // changes the plan and who gets a call, so the note gives the sample's date.
    prompt:
      'Here’s my expired export from the MLS and a FSBO list from my lead service. I’m Avery Testwood with Example Ridge Realty. Draft my first touches and a touch plan.',
    note: [
      'There are two files: a made-up MLS export of expired listings and a made-up FSBO list from a lead service, both in Salt Lake County. You’re playing the agent, Avery. Every name, address and number in them is made up. The sample was run on Tuesday, November 10, 2026. Run on another day, the plan’s dates and who gets a call opener change.',
    ],
  },

  real: {
    // SKILL.md, section 1 (the list) and section 3 (calls only after a scrub).
    body: ['Start a new chat the same way, attach your expired export or your FSBO list, and say this.'],
    prompt: 'Here’s my expired list. Draft my first touches and a touch plan.',
    note: [
      'If you scrubbed the numbers against the Do Not Call Registry and your team’s list, say so, and the AI adds call openers for the numbers that came back clear. Before anything goes out, check every date and fact in the ',
      { strong: 'Check before sending' },
      ' list, and search the MLS for each address in case it relisted.',
    ],
  },

  chatgpt: { paste: chatgptPaste('expired-fsbo-outreach') },

  sections: [
    {
      // sample.md (the practice run, 14 of 14 checks), shortened, in the output's own order and its own
      // words, cut only by whole flags, rows, columns, sections and sentences: five of ten flags, the
      // bottom line, four of eight expired rows (without the "#" sort column) and three of seven
      // held-out rows, one whole owner section (letter, call opener and door-knock note) and one whole
      // email, the touch plan table with its no-calls line, and five of seventeen rows of Check before
      // sending.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI hands back',
      body: 'What the AI wrote from the practice files: a made-up MLS expired export and a made-up FSBO list for a made-up agent, Avery. It’s the same set you practise on in setup.',
      title: 'Expired and FSBO Outreach: Salt Lake County, Tuesday, November 10',
      note: 'Made-up example. Shortened: five of the ten flags, four of the eight expired rows, three of the seven held-out rows, two of the thirteen first touches and five rows of Check before sending. The bottom line, the plan and each draft shown are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Held out, no drafts (6 rows).' },
            ' Withdrawn: 7720 S Placeholder Peak Ln (MLS row 2) and 618 E Sample Spruce Ave (MLS row 7). A Withdrawn listing may still be under a listing agreement, so contacting the owner could interfere with another brokerage’s agreement (NAR Article 16, Standard of Practice 16-4). Canceled: 2950 W Mockup Mesa Dr (MLS row 4) and 7342 S Placeholder Pond Dr (MLS row 10), held until you confirm with a fresh MLS search or the listing brokerage that no agreement is in effect. 1033 E Fakewood Cir (MLS row 9) says Expired, but its expiration date is Monday, November 30, after today: check it in the MLS first. 4410 S Mockup Maple Dr (FSBO row 6): the ad says it is “Also listed on the MLS through Example Flat Fee Realty,” so it is listed with a brokerage.',
          ],
        },
        {
          p: [
            { strong: 'Skipped: Quinn Mockley, 5521 S Fictional Fox Ln (FSBO row 2).' },
            ' The ad says “NO AGENTS PLEASE. Principals only.” No letter, call or knock.',
          ],
        },
        {
          p: [
            { strong: 'Calls: 5 owners.' },
            ' Robin and Casey Samplestone (MLS row 1), Mockridge Family Trust (MLS row 12), Alex Mockford (MLS row 8), Jordan Exampleby (FSBO row 5) and Drew Samplewright (FSBO row 1): each number is marked Clean, checked Monday, November 9. No call for the other 8: Jamie Placeholder’s check (MLS row 6) is from Wednesday, September 2, 69 days ago, so rescrub first; Sam Testerly (MLS row 3) and Morgan Testley (FSBO row 3) are marked DNC; Riley Notreal (MLS row 13) and Lou Placeholder (FSBO row 7) have a blank DNC status; the Fakeworths (MLS row 11), Example Holdings LLC (MLS row 5) and Casey Fakington (FSBO row 4) have no phone. Rescrub Jamie’s number, and if it comes back clean, ask me for a call opener.',
          ],
        },
        {
          p: [
            { strong: 'No texts.' },
            ' Nothing in either file shows any owner’s written consent to marketing texts. A phone number from a lead service or a tax record isn’t consent.',
          ],
        },
        {
          p: [
            { strong: 'Agent-only fields set aside.' },
            ' Private Remarks on 4 MLS rows (access, showing and owner details). None of it is in any draft.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Of 20 rows, 13 owners may be contacted (8 expired, 5 FSBO); 6 are held out because they may still be under a listing agreement or the data disagrees, and 1 FSBO said no agents. Below are 10 letters, 3 emails, 5 call openers and 12 door-knock notes, and no texts. Call Robin and Casey Samplestone first, today by 8 PM Mountain, because their listing expired Sunday and no calls go out Wednesday, Veterans Day.',
          ],
        },
        { h: 'The list (agent only)' },
        {
          table: {
            caption: 'Expired: who to contact, in order, 4 of 8 rows',
            head: ['Row', 'Address', 'Expired', 'Days on market', 'Price (original to final)', 'Channels open', 'Why'],
            rows: [
              ['6', '9087 S Testview Ct, South Jordan', 'Monday, November 9', '63', '$725,000 to $699,000 (down $26,000, worked out)', 'Letter, knock', 'No call: DNC check 69 days old, rescrub first'],
              ['1', '1184 E Sample Ridge Dr, Sandy', 'Sunday, November 8', '127', '$615,000 to $589,000 (down $26,000, worked out)', 'Letter, call, knock', 'Clean, checked Monday, November 9'],
              ['5', '3321 S Mockup Meadow Dr, West Jordan', 'Thursday, November 5', '94', '$559,000 to $529,000 (down $30,000, worked out)', 'Letter (office address)', 'No call: no phone. No knock: owner mails elsewhere'],
              ['3', '455 W Fictional Fork Rd, Riverton', 'Sunday, November 1', '182', '$474,900, no change', 'Letter, knock', 'No call: marked DNC'],
            ],
          },
        },
        {
          table: {
            caption: 'Held out and skipped: no drafts, 3 of 7 rows',
            head: ['List and row', 'Address', 'Status', 'Reason'],
            rows: [
              ['MLS 2', '7720 S Placeholder Peak Ln, Draper', 'Withdrawn', 'May still be under a listing agreement (Article 16, SOP 16-4)'],
              ['MLS 4', '2950 W Mockup Mesa Dr, Herriman', 'Canceled', 'Held until you confirm no agreement is in effect (fresh MLS search, or ask the listing brokerage, Sample Crest Realty)'],
              ['FSBO 2', '5521 S Fictional Fox Ln, Taylorsville', 'FSBO', 'Skipped: the ad says “NO AGENTS PLEASE. Principals only.”'],
            ],
          },
        },
        { h: 'First touches' },
        { p: [{ strong: '2. Robin and Casey Samplestone: 1184 E Sample Ridge Dr, Sandy (EXPIRED: LETTER, CALL, KNOCK)' }] },
        { p: [{ strong: 'Letter' }, ' (mail to: Robin and Casey Samplestone, 1184 E Sample Ridge Dr, Sandy, UT 84094)'] },
        { p: ['Hi Robin and Casey,'] },
        {
          p: [
            'I’m Avery Testwood with Example Ridge Realty. I saw that the listing for your home at 1184 E Sample Ridge Dr expired on Sunday, November 8, after 127 days on the market.',
          ],
        },
        {
          p: [
            'If you still plan to sell your 4-bedroom home, I’d like to hear what matters most to you and show you how I would market its 2,840 square feet. If you’ve already made other plans, or you’re working with an agent again, please set this aside.',
          ],
        },
        { p: ['You can reach me at [Agent Phone] or [Agent Email].'] },
        { p: ['Avery Testwood, Example Ridge Realty'] },
        { p: [{ strong: 'Call opener' }, ' (today, Tuesday, November 10, by 8 PM Mountain, or Thursday, November 12; dialed by hand, live)'] },
        {
          items: [
            '“Hi, is this Robin or Casey? This is Avery Testwood with Example Ridge Realty. I’m calling because I saw your listing on Sample Ridge Dr expired on Sunday. Are you still thinking about selling?”',
            'If yes: “What matters most to you in the next step?” Listen. Then: “Could I stop by this week and show you how I’d market it?”',
            'If no, or not now: “Thanks for telling me. I won’t keep calling.” No more calls in this plan.',
            'If they ask not to be called: thank them, end the call, and add the number to your internal do-not-call list today.',
            'Voicemail: “Hi Robin and Casey, it’s Avery Testwood with Example Ridge Realty, about your home on Sample Ridge Dr. My number is [Agent Phone].”',
          ],
        },
        { p: [{ strong: 'Door-knock note' }, ' (Saturday, November 14, daytime, only if you haven’t spoken)'] },
        {
          items: [
            'At the door: “Hi, I’m Avery Testwood with Example Ridge Realty. I sent you a note about your home, and wanted to say hello in person and leave my card.”',
            'Left at the door if no one answers, never in the mailbox: “Sorry I missed you. I stopped by about your home on Sample Ridge Dr. Avery Testwood, Example Ridge Realty, [Agent Phone].”',
          ],
        },
        { p: [{ strong: '12. Drew Samplewright: 3389 S Example Creek Rd, Murray (FSBO: EMAIL, CALL, KNOCK), the email' }] },
        {
          email: {
            subject: 'Your Home At 3389 S Example Creek Rd',
            body: [
              'Hi Drew,',
              'I’m Avery Testwood with Example Ridge Realty. I saw your ad on a FSBO website for 3389 S Example Creek Rd: the updated kitchen, the new roof in 2024, the fenced yard and the RV parking.',
              'If you’d like a second set of hands with marketing, showings or the paperwork, I’d be glad to talk. If you’d rather keep selling it yourself, I understand, and I hope it goes smoothly.',
              'You can reach me at [Agent Phone] or by replying here.',
              'Avery Testwood, Example Ridge Realty',
              'This is a marketing email from Avery Testwood, Example Ridge Realty. To stop these emails, reply UNSUBSCRIBE. [Sender Postal Address]',
            ],
          },
        },
        { h: 'Touch plan' },
        {
          table: {
            caption: 'Two weeks, Tuesday, November 10 to Tuesday, November 24',
            head: ['Touch', 'When', 'Letter or email owners (8)', 'Call owners (5)', 'Knock'],
            rows: [
              ['1', 'Today, Tuesday, November 10', 'Mail the 10 letters; send the 3 emails', 'First call, by 8 PM', ''],
              ['2', 'Thursday, November 12, and Saturday, November 14', '', 'Second call Thursday, only if you haven’t spoken', 'Saturday daytime: the 12 knock homes (not Example Holdings LLC); skip any you’ve already spoken with'],
              ['3', 'Tuesday, November 17', 'Follow-up note (letter, or email for the 3 email owners)', 'Follow-up note, and a third call only if you haven’t spoken', ''],
              ['4', 'Tuesday, November 24', 'Last note', 'Last note; no calls', ''],
            ],
          },
        },
        {
          p: [
            { strong: 'No calls or voicemails on:' },
            ' Wednesday, November 11 (Veterans Day) and Sundays, November 15 and 22. They are Utah legal holidays, and this plan keeps them call-free for the whole team, licensed or not, as a conservative default. Utah’s Sunday and holiday limit (Utah Code 13-25a-103) doesn’t apply to a licensee acting within the license (13-25a-111), but it does to anyone calling who isn’t licensed. Keep it unless your own legal counsel approves a different rule.',
          ],
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 5 of 17 rows',
            head: ['Item', 'Where it’s from'],
            rows: [
              ['Days on market: 63, 127, 45, 101, 94, 120, 182, 158', 'MLS export, Days on Market, same rows'],
              ['Calls: rows 1, 12 and 8 (MLS) and 5 and 1 (FSBO)', 'Phone DNC Status “Clean,” DNC Checked 2026-11-09. Confirm the scrub date (31 days or less when you dial) and check each number against your internal do-not-call list'],
              ['No texts', 'Neither file shows written consent to marketing texts'],
              ['Before mailing: search the MLS for every address', 'A listing can relist between the export and the mail. Drop any that has'],
              ['Example Ridge Realty in every letter and email', 'Utah Admin. Code R162-2f-401h: the brokerage name as on the Division of Real Estate’s records'],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", items 1 to 6, in its order; page-notes.md, "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: every row held out and why (Withdrawn, Canceled, Temporarily Off Market, relisted, dates that disagree, a FSBO listed with a flat-fee brokerage), FSBO ads that said no agents, who can get a call and why the rest can’t, why there are no texts, and anything you asked for that it left out.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: how many owners you may contact, how many letters, emails, call openers and door-knock notes, and the one thing to do first.',
        },
        {
          title: 'Your list, sorted, for you',
          body: 'Expireds by expiration date, newest first, then days on market. FSBOs by ad date, oldest first. Each row shows the price change, worked out, and which channels are open and why. Held-out rows sit in their own table with the reason.',
        },
        {
          title: 'A first touch for every owner',
          body: 'A letter, or an email with an unsubscribe footer when your list has one, built from that listing’s own facts. A call opener only where calling is allowed, and a door-knock note. The drafts follow your voice profile, if you made one with our free guide.',
        },
        {
          title: 'A two-week touch plan',
          body: 'Three or four touches with dates. No calls on Sundays or legal holidays: Utah’s in Utah, federal ones elsewhere. Every touch stops for an owner who says no or relists.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, day count and fact in the drafts with its row and column, the scrub date behind each call, the MLS search for relists, and the placeholders to fill.',
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
          title: 'The AI checks every row',
          body: 'Decides who you may contact and which channels are open, and says why. Sorts by the export’s own facts. Works out price changes. Dates the plan around Sundays and holidays.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'Every letter, email, call opener, door-knock note and follow-up note. Nothing is sent, mailed or dialed until you do it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'The Do Not Call scrub and your internal list. Any texting consent. The MLS search for relists. Every price conversation, whether to knock, the fair housing review and every send. Ethics questions go to your broker.',
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
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro. The ChatGPT version works from a list you upload or paste.',
          tag: 'Free ChatGPT has upload limits. Pasting works too.',
        },
        {
          title: 'A computer, once',
          body: 'Add the skill on claude.ai or in the Claude desktop app, or set up the Project on the ChatGPT website. After that, Claude uses the skill on your phone too. Exporting a list is easiest on a computer.',
        },
        {
          title: 'Your list',
          body: 'An MLS export of expired listings, a FSBO export from your lead service, or your own spreadsheet. You don’t retype anything.',
          tag: '“Where to get your list” shows how',
        },
        {
          title: 'A Do Not Call scrub',
          body: 'A Do Not Call column in your export, or your own scrub against the Registry and your team’s list. Without one, you get letters and door-knock notes, and no call openers.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond the plans you already have, your MLS and the lead service you already use. No connectors.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From": Landvoice's blog (June 23, 2022,
      // checked 2026-11-10). REDX's, Vulcan7's and the MLS's click paths were not confirmed, so no menu is
      // named for them. Attaching in Claude is Claude's help center, as /open-house-follow-up has it. The
      // calling line is page-notes.md's "Calling, in one line" (the shared outreach-rules.md and the guide).
      kind: 'list',
      heading: 'Where to get your list',
      items: [
        {
          title: 'Your MLS',
          body: 'Search for Expired listings in your area and dates, and export the results to a CSV or Excel file. Withdrawn and Canceled rows can stay in; the AI holds them out. If your export adds owner names, mailing addresses and phones from tax records, the AI uses them.',
        },
        {
          title: 'Landvoice',
          body: 'Open one of your lists, then Print/Export in the top menu, then CSV. Landvoice marks the numbers on the Do Not Call Registry, and the AI reads that mark.',
        },
        {
          title: 'REDX or Vulcan7',
          body: 'Use the export in your lead manager (Vortex, for REDX). Both say they mark or filter Do Not Call numbers, and the AI reads that mark. We haven’t confirmed their menus.',
        },
        {
          title: 'Your own list',
          body: 'A spreadsheet or a pasted list: the address, the owner, the phone if you have it, where you found it, what the ad says and the date. Without a Do Not Call column, there are no call openers until you scrub.',
        },
        {
          title: 'Attaching a file in Claude',
          body: 'Click the + at the lower left of the chat box, then Add files or photos. Pick the files and click Open. Or drag the files into the chat.',
        },
        {
          title: 'Before you call anyone',
          body: 'Call only numbers your list marks as not on the Do Not Call Registry, checked within 31 days, or that you scrubbed yourself against the Registry and your team’s list. Expired and FSBO owners are covered when you call to list their home. No texts without their written consent.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your list or paste it in, then paste these words with it. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'With an expired export attached',
          items: ['Here’s my expired export from the MLS. Draft my first touches and a touch plan.'],
        },
        {
          label: 'With a FSBO list attached',
          items: ['My FSBO list from REDX is attached. Write the letters and a two-week plan.'],
        },
        {
          label: 'After you scrub the numbers',
          items: ['I scrubbed these numbers against the Do Not Call Registry and our team’s list this morning. Add call openers for the ones that came back clear.'],
        },
        {
          label: 'Just one piece, or more',
          items: ['Just the letters, please.', 'Here’s the next batch.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, FAQ and "Why This and Not the Lead Service's Scripts".
          q: 'My lead service already gives me scripts. Why this?',
          a: [
            'Those scripts are the same for everyone. The AI writes a first touch for each owner from that listing’s own facts, and checks every row: what may still be under a listing agreement, which numbers were scrubbed, which ad said no agents. Keep using your dialer for the calls it allows.',
          ],
        },
        {
          // page-notes.md, FAQ; references/ethics-and-fair-housing.md (NAR Article 16, SOP 16-4) and
          // utah-calling-rules.md (UtahRealEstate.com's status definitions), checked 2026-11-10.
          q: 'Why won’t it write to a Withdrawn or Canceled listing?',
          a: [
            'A Withdrawn listing is still under a listing agreement, in UtahRealEstate.com’s own words, and the REALTOR Code of Ethics (Article 16 and Standard of Practice 16-4) bars soliciting a listing that’s exclusively listed with another broker. A Canceled listing is often re-entered by the same brokerage, so it waits until you confirm no agreement is in effect. Questions go to your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; the guide's channel rule and the shared outreach-rules.md.
          q: 'Why didn’t I get call openers?',
          a: [
            'A call to list someone’s home is a telephone solicitation, and the Do Not Call rules cover expired and FSBO owners. The AI writes openers only for numbers your list marks as not on the Registry, checked within 31 days, or that you tell it you scrubbed against the Registry and your team’s list. Scrub, tell it, and it adds them.',
          ],
        },
        {
          // page-notes.md, FAQ; utah-calling-rules.md (Utah Code 13-25a-103 and 13-25a-111, checked
          // 2026-11-10).
          q: 'Can I call on a Sunday in Utah?',
          a: [
            'Utah’s law limits solicitation calls on Sundays and Utah legal holidays (Utah Code 13-25a-103), but it exempts a licensed agent acting within the license (13-25a-111). The plan still keeps Sundays and Utah holidays call-free, so one rule covers everyone on your team, licensed or not. To change that, ask your own legal counsel.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, Guardrails ("Conservative defaults"); the shared outreach-rules.md,
          // Conservative Defaults.
          q: 'Why is it stricter than the law?',
          a: [
            'It uses our conservative defaults. No calls or voicemails go on a Sunday or a legal holiday, even where Utah exempts a licensed agent. Outside Utah, that means Sundays and the federal holidays, and it tells you it didn’t check your state’s. Every email carries the full footer: the line that says it’s a marketing email, the way to opt out and your postal address. You can calibrate these with your own legal counsel: tell the AI what your counsel approved, and it follows that and says so in Check Before Sending.',
          ],
        },
        {
          // page-notes.md, FAQ; references/ethics-and-fair-housing.md (Articles 15 and 12).
          q: 'Why won’t it say the last agent overpriced it, or that I have a buyer?',
          a: [
            'Your list doesn’t say why a home didn’t sell, and the REALTOR Code of Ethics bars misleading statements about other agents (Article 15) and asks for a true picture in every solicitation (Article 12). So the letters stay on the home and on what you’d do. If you ask for either angle, the AI leaves it out and tells you why.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Tested and Not Tested"; SKILL.md, Location.
          q: 'Which plan do I need, and what was tested?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. In ChatGPT, a Project on Free, Go, Plus or Pro. We tested the skill in Claude on three made-up lists: an MLS export with a FSBO list in Utah, an expired export the agent had scrubbed, and an agent’s own FSBO list in Idaho with no Do Not Call information. Outside Utah, it tells you your state’s rules weren’t checked. We haven’t tried it inside ChatGPT or on a real MLS or lead service export yet, so run the practice files first.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Booked a listing appointment with one of these owners? ',
        { link: 'Pricing Conversation Prep', href: '/pricing-conversation-prep', sameTab: true },
        ' turns your CMA into a list price, a talk track and answers to objections.',
      ],
    },
  ],

  unlockKey: 'efso-unlocked',
});
