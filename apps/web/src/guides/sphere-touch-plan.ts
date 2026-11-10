// Every word on /sphere-touch-plan that is its own: the landing page for Sphere Touch Plan
// (`skills/sphere-touch-plan/`, version 1.0), a skill that turns an agent's sphere and past client list
// (a Follow Up Boss People export, another CRM's export or a spreadsheet) into a 12-month touch plan by
// tier and this week's texts, emails and call notes, each tied to something real in the list, plus what
// to set up in Follow Up Boss so it does the reminding. What every skill page says the same way is in
// `skill-page.ts` (D-052). The skill is paid (in the Amplified Skill Library, agent set), so the page
// is drawn with the Skill Library card in place of the sign-up and the setup (D-082); the free words and
// the setup below stay for the day it is free.
//
// The words come from the skill itself (SKILL.md and references/touch-plan-guide.md, fub-setup.md and
// the shared outreach-rules.md), its page notes and its graded runs (the practice run 12 of 12, eval 1
// 14 of 14, eval 2 11 of 11), so the page promises what the skill does. The sample is sample.md, the
// graded practice run, cut only by whole items, rows and drafts; each draft shown is whole. Its straight
// quotes and apostrophes are written curly, as on every page.
//
// What the page holds to, as SKILL.md does: drafts only, never sent, never written to a CRM. Texts only
// for people the list or the agent shows agreed to texts in writing; a phone number is never consent.
// Nothing from the notes about health, money or family status, no deal prices, nothing invented.
//
// Calls left open, and how the page handles them:
//   - The cadence (Past Clients 12 touches a year, Close Sphere 6, Wider Sphere 4) and the weekly share
//     are house defaults, not Connor's: the page says "a default you can change" and gives no cadence
//     as advice.
//   - Every email carries the full footer from outreach-rules.md (the opt-out, the postal address and
//     the marketing line), even a personal anniversary note: Connor's conservative default. The sample
//     shows it as written.
//   - A yes from an open house sign-in gets a text with a check first (as Database Health Check does,
//     D-053's open call): its wording must name the agent or the team. A portal or shared lead's yes
//     that names only the portal gets no text until the broker confirms (a conservative default). The
//     sample shows the check, not a ruling.
//   - Calls and voicemails skip Sundays and the federal legal holidays (a conservative default; state
//     holidays weren't checked). The sample's two calls skip Wednesday, November 11 and Sunday,
//     November 15. The FAQ says these defaults can be calibrated with the agent's own legal counsel.
//   - Utah's calling and texting rules were not checked (no utah-*.md); the page says state rules are
//     the broker's and that the skill says when they weren't checked.
//   - The Follow Up Boss date automation facts come from search excerpts of its help center (the site
//     blocks direct reads), checked 2026-11-10, and no live account was tried. The page names the steps
//     only as "what to set up," never as tested.
//   - Birthdays are ignored on purpose (no ages); the page doesn't mention them.
//   - The sibling skills it names in its description (Open House Follow-Up, Post-Closing Client Care) may
//     not be registered yet, so the page links only Database Health Check and describes the others in
//     plain words.
//
// `setupMinutes` is an estimate (page-notes gives none): 10, as the other skill pages with a ChatGPT
// version say for the same shared steps.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const SPHERE_TOUCH_PLAN: Guide = skillPage({
  slug: 'sphere-touch-plan',
  skill: 'sphere-touch-plan',
  title: 'Sphere Touch Plan',

  meta: {
    title: 'Sphere Touch Plan: A Free AI Skill · Amplified Impact',
    description:
      'Upload your sphere or past client list and get a year of touches by tier, plus this week’s texts, emails and call notes, each tied to something real in your list. Texts only for people who said yes to texts. A free skill for Claude and ChatGPT. It never sends anything or changes your CRM.',
  },

  // Non-breaking spaces keep the audience on one line at phone width, as /appointment-follow-up does.
  eyebrow: 'Free AI Skill · For Agents',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Upload your sphere or past client list, and the AI hands back a year of touches by tier plus this week’s texts, emails and call notes, each one tied to something real in your list.',
  outcome: { n: '03', title: 'Stay in Touch', body: 'A year of touches, and this week’s messages to read and send.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI drafts your messages. It never sends anything or changes your CRM.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page).
    prompt: 'Here’s my Follow Up Boss export. I’m Rowan Mockford with Pretend Peak Realty. Build my 12-month touch plan and draft this week’s touches.',
    note: [
      'There’s one file: a made-up Follow Up Boss export of 34 contacts for a made-up agent, Rowan Mockford. Every name, email, phone number and note in it is made up. The sample on this page was run on Tuesday, November 10, 2026. On another day, the week and who’s due change, so your answer will differ. ',
    ],
  },

  real: {
    // SKILL.md, section 1; references/fub-setup.md, "Getting the Export" (Follow Up Boss's "Export
    // Contacts to a Spreadsheet" and "Users, Roles & Permissions", checked 2026-11-08).
    body: ['Start a new chat the same way, attach your own export or spreadsheet, and say this.'],
    prompt: 'Here’s my Follow Up Boss export. Build my 12-month touch plan and draft this week’s touches.',
    note: [
      'To export from Follow Up Boss, open ',
      { strong: 'People > All People' },
      ', check the box next to ',
      { strong: 'Name' },
      ', choose ',
      { strong: 'Select All' },
      ', click ',
      { strong: 'Export' },
      ' (the downward arrow), check ',
      { strong: 'Export All Columns' },
      ', then click ',
      { strong: 'Yes, Export People' },
      '. Only the Account Owner, or someone the owner gave the Can Export permission, can export. If that isn’t you, ask your owner for a file of your contacts.',
    ],
  },

  chatgpt: { paste: chatgptPaste('sphere-touch-plan') },

  sections: [
    {
      // sample.md (the practice run, 12 of 12 checks), shortened, in the output's own order and its own
      // words, cut only by whole items, rows and drafts: four of the seven flags (three of the five
      // consent items), the bottom line, the whole 12-month table and its touches-a-year line, 8 of the
      // 14 rows of this week's touches, 4 of the 14 drafts (each whole), the third of the four setup
      // steps, and part of Check before sending.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI hands back',
      body: 'What the AI wrote from the practice file: a made-up Follow Up Boss export of 34 contacts for a made-up agent, Rowan Mockford of Pretend Peak Realty. It’s the same file you practise on in setup.',
      title: 'Sphere Touch Plan: Rowan Mockford, Week of November 10',
      note: 'Made-up example. Shortened: four of the seven flags, 8 of 14 rows of this week’s touches, 4 of 14 drafts, one of four setup steps and part of Check before sending, with What I Used, the share math and Not This Week left out. The bottom line, the plan and each draft shown are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Texts only where a written yes is on file.' },
            ' Six people due this week have a written yes in Text Consent and get a text: Gwen Tallowmere, Kit Lollibrand, Lars Thistlewood, Ned Puddlefoot, Ava Pennywhistle and Opal Rindlestock. Everyone else gets an email, or a call note when there’s no email.',
          ],
        },
        { p: [{ strong: 'Consent that doesn’t count, or needs a check:' }] },
        {
          items: [
            'Ned Puddlefoot: Text Consent says “Yes - open house sign-in 2023-10-04.” That counts only if the sign-in sheet had text consent wording that named you or Pretend Peak Realty. Check the sheet before you send Ned’s text. If it didn’t, don’t send it; ask me for an email instead.',
            'Milo Grumbleton: Text Consent says “Yes - verbal at closing.” A verbal yes isn’t a written record, so Milo gets an email.',
            'Dev Quillfeather: a written yes, but tagged Do Not Text. The opt-out wins. Email.',
          ],
        },
        {
          p: [
            { strong: 'First year after closing:' },
            ' Iris Lumbergate (closed May 20, 2026) and Jade Pocketridge (closed September 30, 2026). Use post-closing-client-care for them. Each joins this plan on their first anniversary.',
          ],
        },
        {
          p: [
            { strong: 'Left out on purpose:' },
            ' the notes on 6 contacts hold health, money or family details. None of it is in the plan or the drafts. Read those notes yourself before you reach out.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Your plan holds 28 people: 14 past clients, 6 close sphere and 8 wider sphere, with Iris and Jade joining after their first year. This week has 14 touches (6 texts, 6 emails and 2 call notes): nine any day this week (the two calls skip Wednesday, November 11, Veterans Day, and Sunday), starting with Gwen, who is back from Lisbon, and five closing anniversaries from Thursday, November 12 to Monday, November 16. Do this first: check that Ned’s open house sign-in sheet had text consent wording, then work the nine.',
          ],
        },
        { h: 'Your 12-month touch plan' },
        {
          table: {
            caption: 'The default cadence, by tier',
            head: ['Month', 'Past Clients (14)', 'Close Sphere (6)', 'Wider Sphere (8)'],
            rows: [
              ['November 2026', 'Personal check-in', 'Personal check-in', 'Personal check-in'],
              ['December 2026', 'Handwritten note', '-', '-'],
              ['January 2027', 'Call', 'Call', '-'],
              ['February 2027', 'Home value review offer', '-', 'Home value review offer'],
              ['March 2027', 'Personal check-in', 'Handwritten note', '-'],
              ['April 2027', 'Call', '-', '-'],
              ['May 2027', 'Handwritten note', 'Personal check-in', 'Personal check-in'],
              ['June 2027', 'Personal check-in', '-', '-'],
              ['July 2027', 'Call', 'Call', '-'],
              ['August 2027', 'Home value review offer', '-', 'Handwritten note'],
              ['September 2027', 'Personal check-in', 'Personal check-in', '-'],
              ['October 2027', 'Call', '-', '-'],
            ],
          },
        },
        {
          p: [
            { strong: 'Touches a year:' },
            ' Past Clients 12 (4 calls), Close Sphere 6 (2 calls), Wider Sphere 4.',
          ],
        },
        { h: 'This week’s touches' },
        {
          table: {
            caption: 'This week’s touches, 8 of 14 rows',
            head: ['Send', 'Contact', 'Tier', 'Why now', 'Channel, and why'],
            rows: [
              [
                'This week, first',
                'Gwen Tallowmere',
                'Close Sphere',
                'Note, October 30, 2026: in Lisbon until Nov 9, wants a painter recommendation once she’s back. No touch since',
                'Text: “Yes - signed sphere form 2024-02-11”',
              ],
              ['This week, not Wednesday, November 11 or Sunday, November 15', 'Pia Snickerdoodle', 'Past Clients', 'Rotation: no communication on record', 'Call note: no email, Text Consent blank'],
              ['This week', 'Milo Grumbleton', 'Past Clients', 'Rotation: last touch December 2, 2024', 'Email: consent is verbal only'],
              ['Thursday, November 12', 'Ben Thimblewick', 'Past Clients', 'Home anniversary, 7 years (Home Anniversary 2019-11-12)', 'Email: Text Consent blank'],
              ['Friday, November 13', 'Dev Quillfeather', 'Past Clients', 'First home anniversary (Deal Close Date 2025-11-13)', 'Email: tagged Do Not Text'],
              ['Saturday, November 14', 'Ava Pennywhistle', 'Past Clients', 'Home anniversary, 3 years (Deal Close Date 2023-11-14)', 'Text: “Yes - signed buyer form 2023-09-02”'],
              [
                'Sunday, November 15',
                'Opal Rindlestock',
                'Past Clients',
                '2 years since the sale of Teacup Way (Deal Close Date 2024-11-15, Seller)',
                'Text: “Yes - signed listing form 2024-08-01”',
              ],
              [
                'Monday, November 16',
                'Elle Marrowby',
                'Past Clients',
                'Home anniversary, 4 years (Deal Close Date 2022-11-16)',
                'Email: Text Consent “Revoked - replied STOP 2026-08-19”',
              ],
            ],
          },
        },
        { h: 'Drafts' },
        { p: [{ strong: 'Gwen Tallowmere: text' }] },
        {
          items: [
            'Why now: note from October 30, 2026: “Traveling in Lisbon until Nov 9. Wants a painter recommendation for her living room once she’s back.”',
            'Channel: text. Text Consent: “Yes - signed sphere form 2024-02-11.”',
          ],
        },
        {
          p: [
            'Hi Gwen, it’s Rowan Mockford with Pretend Peak Realty. Welcome home from Lisbon! Still looking for a painter for the living room? I’m happy to send you a couple of names. Reply STOP to opt out.',
          ],
        },
        { p: [{ strong: 'Pia Snickerdoodle: call note' }] },
        {
          items: [
            'Why now: rotation, no communication on record. Note from July 7, 2025: “Restoring a 1968 pickup in the garage.”',
            'Channel: call. No email on file, and Text Consent is blank.',
          ],
        },
        {
          items: [
            'Opener: “Hi Pia, it’s Rowan Mockford with Pretend Peak Realty. I was thinking about that 1968 pickup you’re restoring in the garage.”',
            'Ask: “How’s it coming along?”',
            'Then: “And if anything on the house comes up, I’m always glad to help or send a name.”',
            'Voicemail: “Hi Pia, it’s Rowan Mockford with Pretend Peak Realty, calling to say hi and hear how the pickup’s coming along. Call me back at [Agent Phone] whenever it’s easy.”',
          ],
        },
        { p: [{ strong: 'Ben Thimblewick: email' }] },
        {
          items: [
            'Send: Thursday, November 12.',
            'Why now: home anniversary, 7 years (Home Anniversary 2019-11-12). Note from November 12, 2024: “Finished the basement theater room.” The December 18, 2025 note is left out on purpose.',
            'Channel: email. Text Consent is blank.',
          ],
        },
        {
          email: {
            subject: 'Happy 7 Years In Your Home',
            body: [
              'Hi Ben,',
              'Seven years ago this week we closed on your home. Happy home anniversary!',
              'A couple of years ago you’d just finished the basement theater room, and I hope it’s still the best seat in the house. What’s next on your list for the place?',
              'If you need a name for any of it, I’m glad to help.',
              'Rowan Mockford',
              'Pretend Peak Realty',
              'To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from Rowan Mockford, Pretend Peak Realty.',
            ],
          },
        },
        { p: [{ strong: 'Opal Rindlestock: text' }] },
        {
          items: [
            'Send: Sunday, November 15, between 8 a.m. and 8 p.m. her time (her address is in Boise, Idaho).',
            'Why now: 2 years since the sale of Teacup Way (Deal Close Date 2024-11-15, Seller tag). Note from November 15, 2024: “Sold Teacup Way; moving to Boise.” It was a sale, so this isn’t a “home anniversary.”',
            'Channel: text. Text Consent: “Yes - signed listing form 2024-08-01.”',
          ],
        },
        {
          p: [
            'Hi Opal, it’s Rowan Mockford with Pretend Peak Realty. Two years ago this week we closed on Teacup Way. How is Boise treating you? Reply STOP to opt out.',
          ],
        },
        { h: 'Set it up in Follow Up Boss' },
        {
          p: [
            { strong: 'Home anniversaries.' },
            ' You already have a Home Anniversary field (only Ben’s is filled). Ask your Account Owner to check it’s a Date field with Occurs Every Year (Admin > Custom Fields), then fill it for your other past clients from their Deal Close Date; every date is in Check Before Sending and the export. An admin then makes an action plan whose first step is a task, “Home anniversary: send a personal note,” and an automation (Admin > Automations): the Calendar Date trigger, Home Anniversary, “is in 0 days,” start that action plan, and “Run automation multiple times per person” so it repeats every year. It starts at 8 AM in your company time zone. An action plan started by an automation doesn’t send its first text, so the task reminds you and you send by hand.',
          ],
        },
        { h: 'Check before sending' },
        {
          items: [
            'Texts: a written consent record for Gwen, Kit, Lars, Ned, Ava and Opal that names you or Pretend Peak Realty and their number. For Ned, the sign-in sheet needs text consent wording that names you or Pretend Peak Realty. Send each one by hand, one at a time, from your own number.',
            'Do Not Call: scrub every number you’ll call or text (including Pia’s and Hattie’s) against the National Do Not Call Registry and your own do-not-call list, unless your broker confirms an exception applies. Follow Up Boss has no built-in scrub.',
            'Quiet hours: calls and texts between 8 a.m. and 8 p.m. in each person’s time zone. Texts go weekends included (Ava’s is Saturday, Opal’s Sunday). Calls never go on a Sunday or a legal holiday, a conservative default: Pia’s and Hattie’s skip Wednesday, November 11 (Veterans Day) and Sunday, November 15.',
            'State rules: Utah’s and other states’ calling and texting rules weren’t checked, and neither were state holidays. Confirm with your broker.',
          ],
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
          body: 'Only when they apply: who can’t get a text and why, a yes that doesn’t count (a verbal one) or needs a check (an open house sign-in), clients in their first year after closing, anyone who opted out of everything, and a line saying notes about health, money or family were left out on purpose.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: who’s in your plan, how many touches are due this week and how, and the one thing to do first.',
        },
        {
          title: 'What the AI used',
          body: 'The columns it read, today’s date and this week’s window, and how it sorted your list into Past Clients, Close Sphere and Wider Sphere. Your own tiers come first.',
        },
        {
          title: 'Your 12-month touch plan',
          body: 'A table of the next 12 months by tier, with the kind of touch each month: a personal check-in, a handwritten note, a call or a home value review offer. A default you can change. Closing anniversaries take that month’s spot.',
        },
        {
          title: 'This week’s touches',
          body: 'Who’s due and why: a closing anniversary, a note that asked for a follow-up, or the people you’ve gone longest without talking to, spread evenly over the month. Each one with its channel and the day to send.',
        },
        {
          title: 'The drafts',
          body: 'Texts only for people with a written yes, emails for everyone else, and call notes for people with only a phone number. Each one mentions something real from your list. They follow your voice profile, if you made one with our free guide.',
        },
        {
          title: 'Not this week',
          body: 'Who’s later this month, who’s already done, who’s in their first year after closing, and who opted out.',
        },
        {
          title: 'What to set up in Follow Up Boss',
          body: 'So Follow Up Boss does the reminding: a Text Consent field, a Smart List per tier, a yearly Home Anniversary date with an automation that starts a task for you, and an action plan of tasks per tier. Plain words instead for another CRM or a spreadsheet.',
        },
        {
          title: 'Check before sending',
          body: 'Every anniversary date and where it came from, every fact a draft mentions and its note, the consent record for each text, the Do Not Call scrub, quiet hours, the unsubscribe link and your postal address.',
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
          title: 'The AI sorts your list',
          body: 'Reads the list, sorts it into tiers, finds closing anniversaries and notes that asked for a follow-up, picks this week’s people, and works out who can get a text.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The 12-month plan, the Follow Up Boss setup steps, and this week’s texts, emails and call notes. Nothing goes out until you send it, by hand, one at a time.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Who’s in which tier, every consent record and the Do Not Call scrub, setting up Follow Up Boss, what each person hears and when, and any personal detail you add. The AI never changes your CRM.',
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
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro. A big export needs data analysis, which Free ChatGPT limits.',
        },
        {
          title: 'A computer, once',
          body: 'Add the skill on claude.ai or in the Claude desktop app, or set up the Project on the ChatGPT website. Follow Up Boss saves your export to your computer, so that’s the easy place to attach it.',
        },
        {
          title: 'Your contact list',
          body: 'A Follow Up Boss export, another CRM’s export, or a spreadsheet. Closing dates, notes, tags for your tiers and a texting consent field make it work best.',
          tag: '“Where to get your list” shows how',
        },
        {
          title: 'No connector',
          body: 'You attach a file. Nothing connects to your CRM, and nothing in it changes.',
        },
        {
          title: 'Your consent records',
          body: 'The AI drafts a text only for people your list shows agreed to texts in writing, or that you say agreed. Keep the signed form or the written reply for each one.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where It Comes From" (Follow Up Boss's help center, checked
      // 2026-11-08) and references/fub-setup.md. Attaching in Claude is /appointment-follow-up's
      // (Claude's help center, "Uploading files to Claude", checked 2026-11-08).
      kind: 'list',
      heading: 'Where to get your list',
      items: [
        {
          title: 'Follow Up Boss',
          body: 'Open People, then All People. Check the box next to Name and choose Select All. Click Export (the downward arrow), check Export All Columns, then click Yes, Export People. A CSV file downloads right away. Exporting never changes your contacts.',
        },
        {
          title: 'If you can’t export',
          body: 'Only the Account Owner, or someone the owner gave the Can Export permission, can export. The owner gets an email each time anyone does. On a team, ask your owner for a file of your contacts.',
        },
        {
          title: 'Turn on Last Communication first',
          body: 'On the People page, click Columns at the upper right and check Last Communication. Follow Up Boss doesn’t say whether it comes through in the export. Without it, the AI picks in the order of your file and tells you so.',
        },
        {
          title: 'Tags for your tiers',
          body: 'Tags such as Past Client, Sphere A and Sphere B tell the AI who’s who. Without them, it sorts by stage and asks you about anyone it can’t place.',
        },
        {
          title: 'A Text Consent field',
          body: 'Follow Up Boss has no consent column of its own. Teams use a custom field or a tag, filled only from written records, with the date and where each yes came from. No field, no text drafts.',
        },
        {
          title: 'Another CRM or a spreadsheet',
          body: 'Export every contact with every column your CRM allows, or download your spreadsheet as a CSV. The AI reads columns by name, so names, emails, phones, closing dates and notes are enough to start.',
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
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your list, then paste these words with it. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'With your list attached',
          items: [
            'Here’s my Follow Up Boss export. Build my 12-month touch plan and draft this week’s touches.',
            'Who in my sphere should I reach out to this week, and what should I say?',
            'Here’s my past client spreadsheet. Any home anniversaries coming up?',
          ],
        },
        {
          label: 'When someone said yes to texts',
          items: ['Hank told me by email that texting is fine. Text him this week.'],
        },
        {
          label: 'Just one piece',
          items: ['Just this week’s texts, please.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "What It Won't Do" and FAQ; SKILL.md, sections 8 and 9.
          q: 'Follow Up Boss already has action plans. Why this?',
          a: [
            'Follow Up Boss reminds you when a date comes around. It doesn’t decide who’s due this week or write a message that mentions the pottery studio from February. The AI tells you what to set up in Follow Up Boss so it does the reminding: a yearly Home Anniversary date with an automation, Smart Lists and action plans of tasks. Then it does the part Follow Up Boss can’t: picking and drafting.',
          ],
        },
        {
          // page-notes.md, FAQ; references/touch-plan-guide.md, Channel; outreach-rules.md, Texts.
          q: 'Why didn’t it write a text to everyone?',
          a: [
            'Texts go only to people your list shows agreed to texts in writing, or that you say agreed. A phone number isn’t consent, and neither is a verbal yes. That follows the federal texting rules and Follow Up Boss’s own compliance page, which says its texting is for one-to-one conversations with people who expect to hear from you. Everyone else gets an email or a call note. Every text ends with “Reply STOP to opt out,” and you send each one by hand.',
          ],
        },
        {
          // page-notes.md, FAQ; references/touch-plan-guide.md, "What a Draft May Mention".
          q: 'Why did it leave out what I wrote in my notes?',
          a: [
            'Notes about health, money or family, like a surgery, a refinance, a divorce or a baby, stay out of every draft, even when your notes say them. A message that brings them up can land badly, and some are protected under fair housing law. The AI counts them in one line so you can read them yourself and decide what to say in person. It also never invents a birthday, a kid, a pet or a hobby your list doesn’t name.',
          ],
        },
        {
          // page-notes.md, "What It Won't Do" (the siblings in SKILL.md's description, in plain words).
          q: 'What won’t it do?',
          a: [
            'The AI won’t send, schedule or post anything, or change your CRM: no tags, stages, notes or action plans. It won’t put a number on a home’s value or the market. It isn’t built to clean up your CRM, follow up on one appointment, follow up with open house visitors, or handle a client’s first year after closing. It points first-year clients out so you can care for them separately.',
          ],
        },
        {
          // page-notes.md, "Tested and Not Tested" and "What You Need"; outreach-rules.md, State Laws.
          q: 'What was tested, and what about my state?',
          a: [
            'We tested the skill in Claude on a made-up Follow Up Boss export, the same export with a voice profile, and a made-up spreadsheet with no consent column. We haven’t tried it inside ChatGPT, on a real export, or set up the Follow Up Boss steps in a live account yet, so run the practice file first. The texting, calling and email rules it uses are federal, plus Florida, Maryland and Oklahoma. It tells you when your state’s rules, Utah’s included, weren’t checked. Questions go to your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, Guardrails (Conservative defaults); outreach-rules.md, Conservative
          // Defaults.
          q: 'Why is it stricter than the law?',
          a: [
            'A few rules are our conservative defaults, stricter than the law in places. Every email carries the full footer (an opt-out, your postal address and a line saying it’s a marketing email), even a personal note to a past client. No call or voicemail goes on a Sunday or a federal legal holiday. And a yes that names only a portal, a lead company or “real estate professionals” gets no text until your broker confirms it covers you. You can calibrate them with your own legal counsel: tell the AI the rule your counsel approved, and it follows that and says so in Check before sending.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'CRM a mess? ',
        { link: 'Database Health Check', href: '/database-health-check', sameTab: true },
        ' finds duplicates, stale leads and past clients nobody has called, with a cleanup list for your VA.',
      ],
    },
  ],

  unlockKey: 'sph-unlocked',
});
