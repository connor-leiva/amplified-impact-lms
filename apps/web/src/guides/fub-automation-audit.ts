// Every word on /fub-automation-audit that is its own: the landing page for FUB Automation Audit, a skill
// (`skills/fub-automation-audit/`, version 1.0) that reads a real estate team's Follow Up Boss action plans,
// automations, Lead Flow, stages, lead sources and any outside texting tool, from screenshots, a page printed
// to PDF, steps copied from each plan's edit screen or a typed list (Follow Up Boss has no export for plans),
// and hands back flags, a bottom line, an inventory of every plan, automation and automated text with its
// source, the gaps, the overlaps, the texting-consent risk, three template wording checks, a ranked fix list
// written as steps in Follow Up Boss, questions for the team and Check Before Sending. What every skill page
// says the same way is in `skill-page.ts` (D-052).
//
// The skill is paid (in the Amplified Skill Library, not in `FREE_SKILLS`), so the built page shows its
// hero and sample with the Skill Library card in place of the sign-up and the setup, and `content.ts`
// takes "Free" off its title, description and eyebrow (D-082). The words below are written as a free
// page, for the day Connor names it free, as every skill page's are.
//
// The words come from the skill itself (SKILL.md and references/fub-inputs.md, audit-rules.md and
// utah-texting-notes.md), its page notes, and its graded runs (the practice set at 14 of 14 and case 2, three
// typed plans with no automations list, at 11 of 11, both passing the objective checks), so the page
// promises what the skill does. The sample is sample.md, the graded practice run, cut only by whole rows,
// columns, items and sentences; in the fix list, each item's options are joined into one line.
//
// What the page holds to, as SKILL.md does: read only, never changes, pauses or creates anything in Follow
// Up Boss and never sends anything; never invents a step, delay or trigger; never says a text is legal or
// illegal; no new automated texts recommended; the owner makes every change. Every Follow Up Boss click path
// is page-notes.md's, each from Follow Up Boss's help center, checked 2026-11-10.
//
// Calls left open, and how the page handles them:
//   - Connor's filter: Follow Up Boss already shows each plan, automation and Lead Flow source on its own,
//     and flags sources with no instant response text. The FAQ says so and says what this adds (the view
//     across plans: gaps by stage and source, overlaps, consent risk). Connor confirms it earns its place.
//   - No export: Follow Up Boss's help center shows no way to export plans, and its API lists plan names
//     only. The page says to screenshot or copy each plan, and never promises an export.
//   - Whether a stage changed by a plan step starts a Stage Changed automation is not in the help center;
//     the skill marks those links "to confirm," and the sample keeps the marker.
//   - Utah's Sunday and holiday rule (Utah Code 13-25a-103(3)): 13-25a-111 exempts a licensee acting
//     within the license, and whether the rule reaches texts was not confirmed.
//     The page names it only as a question for the broker.
//   - Not tested, said once in the FAQ: real Follow Up Boss screenshots, Automations 2.0 canvases, the
//     ChatGPT version inside ChatGPT.
//
// `setupMinutes` is an estimate (page-notes gives none): 10, as on the other skill pages with a ChatGPT
// version. The practice set is four files, attached one by one. The note points to Database Health Check,
// the sibling for the contacts themselves (SKILL.md's description names it).
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const FUB_AUTOMATION_AUDIT: Guide = skillPage({
  slug: 'fub-automation-audit',
  skill: 'fub-automation-audit',
  title: 'FUB Automation Audit',

  meta: {
    title: 'FUB Automation Audit: A Free AI Skill · Amplified Impact',
    description:
      'Copy your Follow Up Boss action plans, automations and lead sources into one chat and see where nothing happens, where two plans double up, and which automated texts could reach someone who never agreed to texts. A free skill for Claude and ChatGPT. It only reads.',
  },

  eyebrow: 'Free AI Skill · For Team Owners and Ops',
  // page-notes.md, "One-Line Promise".
  lede: 'Copy your Follow Up Boss action plans, automations and lead sources into one chat and see, in one place, where nothing happens, where two plans double up, and which automated texts could reach someone who never agreed to texts.',
  outcome: { n: '03', title: 'See Every Plan at Once', body: 'Gaps, overlaps and texting risks, each fix written as steps you take.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one only reads what you attach and never changes anything in Follow Up Boss.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word.
    prompt: 'Here are our Follow Up Boss action plans, our automations list, and our stages and lead sources. Audit them: what’s missing, what’s overlapping, and are our automated texts a problem?',
    note: [
      'There are four files for a made-up Utah team: nine action plans copied from Follow Up Boss, a tenth printed to PDF, an automations list the owner typed, and the team’s stages, lead sources, first texts and consent notes. Every name in them is made up. Look for the two plans that start together, the two closing-day emails, and the texts that reach people with no documented consent.',
    ],
  },

  real: {
    body: ['Start a new chat the same way, attach your own screenshots or copies, and say this.'],
    prompt: 'Here are our Follow Up Boss action plans, our automations list, and our stages and lead sources. Audit them: what’s missing, what’s overlapping, and are our automated texts a problem?',
    // page-notes.md, "What to Upload": Follow Up Boss's "Action Plans Overview" (updated 2025-02-25),
    // checked 2026-11-10. The other inputs are in "Where to get each piece," below.
    note: [
      'Follow Up Boss has no export for action plans, so screenshot each one: click ',
      { strong: 'Admin > Action Plans' },
      ', then ',
      { strong: 'Edit' },
      ' on a plan, and capture the pause checkbox and every step. Before you change anything, check the ',
      { strong: 'Check before sending' },
      ' list against your screens.',
    ],
  },

  chatgpt: { paste: chatgptPaste('fub-automation-audit') },

  sections: [
    {
      // sample.md (the practice run, 14 of 14), shortened, in the output's own order and words, cut only by
      // whole rows, columns, items and sentences: the bottom line in full; one What I Used line; seven of
      // the inventory's 21 rows in four of its eight columns; four of the five gap headings (stop on reply
      // shows in the inventory and the fixes); the first overlap with its table and the second overlap's
      // first three sentences; the consent table in two of its four columns and the Utah line; two template
      // wording lines; four fixes, each with its options joined into one line; and three check lines. Left
      // out: Flags (the bottom line carries them), the day math, the basics block, the questions and the
      // rest of each section.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What an automation audit looks like',
      body: 'What Claude wrote from the practice files: a made-up Utah team’s action plans, automations, stages, lead sources and texting notes. They’re the same files you practise on in setup.',
      title: 'FUB Automation Audit: Gumdrop Hollow Home Team, Example Ridge Realty',
      note: 'Made-up example. Shortened: seven of 21 inventory rows, parts of most sections, four of 12 fixes, and three rows of the check list.',
      blocks: [
        { h: 'Bottom line' },
        {
          p: [
            'Gumdrop Hollow runs 10 action plans, 7 automations (6 on) and 4 automated text flows with 6 text steps between them. The biggest risk is automated texts reaching leads nobody documented consent for: every Facebook Lead Ads lead gets a text with no sender and no opt-out line, and every open house visitor gets the Open House 3 Text whether or not they checked “OK to text me.” The first fix: decide what happens to the Facebook Lead Ads initial text (Admin > Lead Flow, Facebook Lead Ads, Advanced Settings).',
          ],
        },
        { h: 'What I used' },
        {
          p: [
            'Day math: every copy says “Run X days after the previous step,” so each step’s day from the start is the previous step’s day plus X, shown below.',
          ],
        },
        { h: 'Inventory' },
        {
          table: {
            caption: 'Seven of 21 rows',
            head: ['Name', 'How it starts', 'Stop on reply', 'Ends with'],
            rows: [
              ['New Website Lead', 'Lead Flow: Website (IDX)', 'On', 'Day 30: stage to Nurture, tag nurture'],
              ['Portal Buyer 14 Day', 'Lead Flow: HomeFinder Example', 'On', 'Day 14: email “Last Note From Me”'],
              ['Facebook Seller Lead', 'Lead Flow: Facebook Lead Ads', 'Off', 'Day 30: stage to Nurture'],
              ['Open House Visitor', 'Lead Flow: Sample SignIn App', 'On', 'Day 14: task “Decide: Active Client or Nurture?”'],
              ['Long-Term Nurture', 'Automation Nurture Drip (row 11)', 'On', 'Day 365: task “Call: one-year check-in”'],
              ['Monthly Market Email', 'Automation Market Email (row 12)', 'Off', 'Day 150: task “Review: keep them on the market email?”'],
              ['Under Contract to Close', 'Automation Under Contract (row 13)', 'Off', 'Day 30: email “Happy Closing Day!”, stage to Closed'],
            ],
          },
        },
        { h: 'Gaps' },
        { p: [{ strong: 'Stages with nothing attached' }, ' (from the stage list against the automations list):'] },
        {
          items: [
            'Hot Prospect: no automation starts on it.',
            'Active Client: no automation starts on it.',
            'Sphere: no automation starts on it. (Home Anniversary’s condition is Stage is Past Client, so Sphere contacts don’t get it either.)',
          ],
        },
        {
          p: [
            { strong: 'Lead sources with nothing attached' },
            ' (Lead Flow): Referral and Sign Call, each with “Action plan: none.” Your notes say agents call these by hand, so this may be on purpose.',
          ],
        },
        {
          p: [
            { strong: 'Ends with no next step: ' },
            'Portal Buyer 14 Day ends on day 14 with the email “Last Note From Me.” No stage change, tag or task follows, so a portal lead who never replied has nothing after day 14.',
          ],
        },
        {
          p: [
            { strong: 'Long silence' },
            ' (default for nurture plans: more than 90 days): Long-Term Nurture has 120 days between Quick Check-In (day 30) and Spring Market Note (day 150).',
          ],
        },
        { h: 'Overlaps' },
        {
          p: [
            { strong: 'Nurture: two plans start the same day. ' },
            'New Website Lead’s day 30 does two things: step 9 changes the stage to Nurture (30 = 21 + 9) and step 10 adds the tag nurture (30 + 0). The tag starts Market Email, which starts Monthly Market Email (when Email is good). The stage change starts Nurture Drip, which starts Long-Term Nurture. To confirm: the help center doesn’t say a stage changed by a plan step starts an automation.',
          ],
        },
        {
          table: {
            caption: 'Same-day emails, counting from the day both start',
            head: ['Day', 'Long-Term Nurture', 'Monthly Market Email'],
            rows: [
              ['0', 'Staying in Touch', 'This Month in the Market'],
              ['30', 'Quick Check-In', 'This Month in the Market'],
              ['150', 'Spring Market Note', 'This Month in the Market'],
            ],
          },
        },
        {
          p: [
            { strong: 'Closing day: two closing emails. ' },
            'Under Contract to Close sends “Happy Closing Day!” on day 30 (20 + 10) and changes the stage to Closed the same day (30 + 0). The stage change starts Closed Thank You, which starts Closing Day Thank You, whose day 0 email is “Happy Closing Day.” The client gets two closing-day emails on day 30.',
          ],
        },
        { h: 'Texting-consent risk' },
        {
          table: {
            caption: 'Each automated text and its result',
            head: ['Automated text', 'Result'],
            rows: [
              ['Website (IDX) initial text', 'Lower risk if records hold. Confirm the wording with your broker and that each lead’s record (date, number, wording) is kept.'],
              ['HomeFinder Example initial text', 'Check, treated as a risk until confirmed because it reaches new leads. Find out what HomeFinder Example’s form says about texts and whose name it gives.'],
              ['Facebook Lead Ads initial text', 'Risk: it reaches leads with no documented consent.'],
              ['Open House 3 Text (days 0, 2, 6)', 'Risk: it reaches the visitors who didn’t check the box.'],
            ],
          },
        },
        {
          p: [
            { strong: 'Utah: ' },
            'Utah’s solicitation law limits Sunday and legal holiday solicitations to people who gave prior express consent (Utah Code 13-25a-103(3)), though Utah Code 13-25a-111 exempts a licensee acting within the license, and whether it reaches texts was not confirmed. Ask your broker.',
          ],
        },
        { h: 'Template wording' },
        {
          items: [
            'Facebook Lead Ads initial text: “Hi {Contact First Name}! Saw you asked what your home is worth. When’s a good time to chat?” Add the sender and an opt-out line, as your Website (IDX) text already does: “this is {Agent First Name} with Gumdrop Hollow Home Team at Example Ridge Realty” and “Reply STOP to opt out.”',
            'Thanks for Stopping By (fair housing): “This neighborhood is perfect for young families, with great schools nearby.” Both phrases describe people and schools, not the home. Delete the sentence; the next one already describes the home (“a fenced backyard, a finished basement and a two-car garage”).',
          ],
        },
        { h: 'Fix list' },
        {
          items: [
            '1. Facebook Lead Ads initial text (Risk; no sender, no opt-out). Your choice: turn it off until consent is in place: Admin > Lead Flow, Facebook Lead Ads, Advanced Settings, the Initial Text Message, the trash icon, then Save. Or keep it only after your Facebook form carries text consent wording your broker approves; then add the sender and opt-out line (same path: edit the Initial Text Message, Save).',
            '2. Open House 3 Text reaches visitors who didn’t check the box (Risk). Your choice: Admin > Action Plans, Open House Visitor, Edit, delete step 1 (Add tag(s): oh-text), Save. The hosting agent then adds the oh-text tag by hand only to visitors who checked “OK to text me.” Either way, in Sample Drip Texter (outside Follow Up Boss): add “Reply STOP to opt out.” to the day 0 and day 2 texts and the sender to day 2, end the send window at 8 p.m., and ask your broker about Sundays.',
            '5. Nurture overlap (two plans, same-day emails on days 0, 30 and 150). Admin > Action Plans, New Website Lead, Edit, delete step 10 (Add tag(s): nurture), Save, so only Long-Term Nurture starts. Or Admin > Automations, turn off Market Email in the Enabled column, and add the nurture tag by hand where you want the market email.',
            '7. Stop on reply off. Admin > Action Plans, Facebook Seller Lead, Edit, check “Automatically pause this action plan when the lead responds,” Save. Do the same for Monthly Market Email.',
          ],
        },
        { h: 'Check before sending' },
        {
          items: [
            'Plan names, steps and days: from action plans.md (plans 1 to 9) and the printed PDF (Open House Visitor), with the day math under the inventory. Check each “Run X days” against the plan’s Edit screen.',
            'Same-day emails, days 0, 30 and 150; closing emails, day 30: these depend on the stage-change link marked “to confirm.”',
            'Before relying on any consent judgment: consent records for every texting source, a Do Not Call scrub, quiet hours in the lead’s time zone, Sample Drip Texter’s own settings, the company name and address in Admin > Company, and the Utah Sunday and holiday question (Utah Code 13-25a-103(3)). Confirm with your broker or an attorney.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'A bottom line',
          body: 'Three sentences at most: how many plans, automations and automated texts you run, the biggest risk, and the one fix to make first.',
        },
        {
          title: 'What the AI used',
          body: 'Each file and what it held, and anything missing, with the checks it couldn’t run without it. No automations list means no check for stages with nothing attached.',
        },
        {
          title: 'Every plan in one table',
          body: 'Each action plan, automation, Lead Flow first text and outside texting campaign: how it starts, what it sends by day, whether it stops on a reply, how it ends, and which file or screenshot each row came from.',
        },
        {
          title: 'Gaps',
          body: 'Stages and lead sources with nothing attached, plans that keep going after a reply, plans that end with no next step, and long silences between steps, against your standard or a labeled default.',
        },
        {
          title: 'Overlaps',
          body: 'Plans that start from the same event, and every day a lead would get two messages, laid side by side.',
        },
        {
          title: 'Texting-consent risk',
          body: 'Each automated text with what starts it, who it can reach, the consent capture you described, and one of three results. The federal basics with their sources, and in Utah, the Sunday and holiday question. It never says a text is legal or illegal.',
        },
        {
          title: 'Three wording checks',
          body: 'Opt-out lines, who the text is from, and fair housing words, on the templates you include. It quotes the line and suggests the smallest change. It never rewrites your templates.',
        },
        {
          title: 'A ranked fix list',
          body: 'Consent risks first, each fix written as the clicks you make in Follow Up Boss or your texting tool. Where there’s a choice, you get the options.',
        },
        {
          title: 'Check before sending',
          body: 'Every name, day, trigger and quote to confirm against your screens, plus the consent items for your broker.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI lines it up. You make the changes. Your broker answers the consent questions.',
      items: [
        {
          label: 'Run',
          title: 'The AI reads and sorts',
          body: 'Reads every screenshot, page and list, works out each step’s day, and finds the gaps, the overlaps and every automated text.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The ranked fix list, the questions for your team and the wording notes. Nothing is changed or sent.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Every change in Follow Up Boss and your texting tool, which sources get automated texts, the consent records and form wording. Consent and legal questions go to your broker or an attorney.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need". No ChatGPT limits as numbers.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills on. Claude’s help center lists skills on every plan, Free included, but we haven’t tested Free.',
          tag: 'Team or Enterprise: an owner turns on code execution',
        },
        {
          title: 'Or a ChatGPT plan',
          body: 'The ChatGPT version goes in a Project, a folder in ChatGPT that keeps instructions and files together. It reads screenshots, PDFs and text.',
        },
        {
          title: 'A Follow Up Boss login',
          body: 'One that can see Admin > Action Plans, Automations and Lead Flow. An owner or admin login is easiest.',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app. You don’t need one: the skill reads what you attach and never changes anything in Follow Up Boss.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload": every click path from Follow Up Boss's help center, checked
      // 2026-11-10 (Action Plans Overview, Automations Overview, Lead Flow Overview, Lead Flow: Initial Text,
      // Custom Stages, Drip & Mass Texting Integrations, Automations 2.0 Migration).
      kind: 'list',
      heading: 'Where to get each piece',
      items: [
        {
          title: 'Your action plans',
          body: 'Admin > Action Plans, then Edit on each plan. Screenshot it, print the page to PDF, or copy the steps. Make sure the pause checkbox and every step show. Follow Up Boss has no export for action plans.',
        },
        {
          title: 'Your automations',
          body: 'Admin > Automations: each one’s trigger, conditions, action, and whether it’s on. Screenshots or a typed list both work.',
        },
        {
          title: 'Lead Flow',
          body: 'Admin > Lead Flow: each lead source’s action plan, and under Advanced Settings, any first text it sends.',
        },
        {
          title: 'Your stages',
          body: 'Admin > Stages. A screenshot or a typed list.',
        },
        {
          title: 'How each source asks for text consent',
          body: 'A screenshot of each form’s consent wording, or one sentence per source. Only your team knows this.',
        },
        {
          title: 'Any outside texting tool',
          body: 'Follow Up Boss has no drip texting of its own. If you use another tool, screenshot each campaign, what starts it, and its send settings.',
        },
        {
          title: 'On Automations 2.0?',
          body: 'Your action plans became automations. Screenshot each automation in Admin > Automations, with its trigger, time delays and actions.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat, attach your screenshots or copies, and paste. In ChatGPT, start the chat inside the Project. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with everything attached',
          items: [
            'Here are our Follow Up Boss action plans, our automations list, and our stages and lead sources. Audit them: what’s missing, what’s overlapping, and are our automated texts a problem?',
          ],
        },
        {
          label: 'With just some of it',
          items: [
            'Screenshots of every action plan attached. Which ones don’t stop when a lead replies?',
            'Are any of our automated texts going to leads who never agreed to texts?',
          ],
        },
        {
          label: 'In the same chat, after the audit',
          items: ['Which stages and lead sources have nothing attached?', 'Just the texting check, please.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "Connor's Filter" and FAQ; "Instant Response" (updated 2026-09-01), checked 2026-11-10.
          q: 'Doesn’t Follow Up Boss already show this?',
          a: [
            'It shows each plan, each automation and each Lead Flow source on its own, and it flags sources with no first text. It doesn’t line them up: which stages and sources have nothing, which two plans start from the same event and email the same lead on the same day, and which automated texts reach sources with no consent capture. That’s what this adds.',
          ],
        },
        {
          // SKILL.md, Guardrails.
          q: 'Will it change anything in Follow Up Boss?',
          a: [
            'No. It only reads what you attach, and every fix comes back as steps you take. It never pauses or edits a plan, even if you ask.',
          ],
        },
        {
          // page-notes.md, FAQ; Lead Flow: Initial Text and Drip & Mass Texting Integrations.
          q: 'Our action plans don’t have a text step. Where do automated texts come from?',
          a: [
            'In Follow Up Boss, the automatic first text is set per lead source in ',
            { strong: 'Admin > Lead Flow' },
            ', under Advanced Settings. Drip texts come from an outside tool, usually started by a tag a plan adds. The audit looks for both, so include your Lead Flow texts and any texting tool’s campaigns.',
          ],
        },
        {
          // SKILL.md, step 5 and Guardrails; references/utah-texting-notes.md.
          q: 'Will it tell me whether our texts are legal?',
          a: [
            'No. It tells you which automated texts can reach people with no documented consent, what to check, and the federal basics with their sources. Your broker or an attorney makes the call. In Utah it adds one question for your broker: whether Utah’s Sunday and holiday limit on solicitations reaches texts, given the exemption for licensees acting within their license.',
          ],
        },
        {
          // page-notes.md, "What Was and Wasn't Tested".
          q: 'Has it been tried on a real account?',
          a: [
            'Not yet. It was tested on made-up plans copied the way Follow Up Boss’s edit screen shows them, a plan printed to PDF, and three typed plans with no automations list. We haven’t tried real screenshots, Automations 2.0 screens, or the ChatGPT version inside ChatGPT. Follow Up Boss’s help center doesn’t say whether a 2.0 automation stops when a lead replies, so the audit asks.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Want to clean up the contacts themselves? ',
        { link: 'Database Health Check', href: '/database-health-check', sameTab: true },
        ' is built for that.',
      ],
    },
  ],

  unlockKey: 'fubaa-unlocked',
});
