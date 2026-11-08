// Every word on /appointment-follow-up that is its own: the landing page for Appointment Follow-Up, a
// free skill (`skills/appointment-follow-up/`, version 1.0) that turns one client appointment's
// transcript (a buyer consult or a listing appointment, in person, by phone or on video) into the
// follow-up an agent writes that night: flags, a bottom line, what it heard, a recap email, a text when
// a client asked for one, a Follow Up Boss note with a suggested Timeframe to Move, dated next steps,
// personal note ideas and Check before sending. What every skill page says the same way is in
// `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md and references/follow-up-guide.md and
// fair-housing-and-privacy.md), its page notes, its graded runs (three evals and the practice run, all
// passed, plus a second reviewer's runs of eval 3 and the practice) and the build and review reports, so
// the page promises what the skill does. The sample is sample.md, the graded practice run, cut only by
// whole items, rows and sentences; its email and text are whole. The email's bullets are its lines, one
// paragraph each, as on /counter-explainer.
//
// What the page holds to, as SKILL.md does: drafts only, never sent, never written to a CRM. No remark
// about who lives in an area, and no area ruled out for that reason; schools and safety get official
// sources. No loan balances, credit, income, debts, sale proceeds or health details anywhere; the
// preapproval amount only in the Follow Up Boss note, never in the email. Every price as each person
// said it, never a new one.
//
// Calls left open, and how the page handles them:
//   - Recording consent: the page says only what page-notes.md and the shared utah-property-notes.md
//     ("Recording a Conversation") say: Utah lets you record a conversation you're part of; some states,
//     such as Washington, need everyone's consent; with anyone in another state, ask everyone first;
//     questions go to the broker. Outside Utah the skill says the state's rules weren't checked. It
//     never rules on whether a recording was legal.
//   - Granola: the connector reads the transcript only on a paid Granola plan; on the free plan Claude
//     gets 30 days of notes, not the transcript (page-notes.md, Granola's MCP page). The phone apps are
//     free. No prices on the page (Granola's Business price is in page-notes.md, not here). The
//     connector on a live meeting is untested, and the page says so.
//   - Gmail drafts: SKILL.md allows one when asked, but no run tested it. The page mentions it once, as
//     untested, and never in "What to say".
//   - Claude Free: the help center lists skills on every plan, the docs on Pro and up, and no run used
//     Free. ChatGPT Free's upload limits are not stated as numbers. The ChatGPT version was not run
//     inside ChatGPT, and no real transcript has been tested; the page says both.
//   - No direct link to Customize > Connectors: no source checked one, so that step has no button.
//
// It works in Claude (a skill) and in ChatGPT (a Project), from a pasted or uploaded transcript. The
// practice set is one transcript file. `setupMinutes` is an estimate (page-notes gives none): 10, as the
// other skill pages with a ChatGPT version say for the same shared steps. The note points to Pricing
// Conversation Prep, the sibling for preparing the price talk before a listing appointment (SKILL.md's
// description).
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const APPOINTMENT_FOLLOW_UP: Guide = skillPage({
  slug: 'appointment-follow-up',
  title: 'Appointment Follow-Up',

  meta: {
    title: 'Appointment Follow-Up: A Free AI Skill · Amplified Impact',
    description:
      'Attach the transcript from a buyer consult or listing appointment and get back a recap email, a Follow Up Boss note ready to paste, and next steps with real dates. The AI drafts; you read and send. A free skill for Claude and ChatGPT.',
  },

  // Non-breaking spaces keep the audience on one line at phone width, as /counter-explainer does.
  eyebrow: 'Free AI Skill · For Buyer’s and Listing Agents',
  // page-notes.md, "One-Line Promise", with the actor named. The flags lead "What you get back".
  lede: 'Attach or paste the transcript from tonight’s buyer consult or listing appointment, and the AI hands back your recap email, a Follow Up Boss note ready to paste, and next steps with real dates.',
  outcome: { n: '03', title: 'Follow Up Tonight', body: 'An email to read and send, a note to paste, and dated next steps.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI drafts the email and the note. It never sends anything or changes your CRM.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page). The note
    // is shown in both apps, so how to attach a file in Claude is in "Where to get your transcript".
    prompt: 'This is my buyer consult with Morgan and Casey Testwood from tonight. I’m Riley Sampleton. Write my follow-up.',
    note: [
      'There’s one file: the transcript of a made-up buyer consult on Zoom, dated Sunday, November 8, 2026. You’re playing the agent, Riley. Every name, address and number in it is made up. ',
    ],
  },

  // page-notes.md, "Install" (the connector path) and "What to Upload" (Granola's plans, from Granola's
  // MCP page, checked 2026-11-08). Connect and sign-in as /inbox-meeting-follow-through has them.
  extraClaudeSteps: [
    {
      title: 'Connect Granola',
      body: [
        'Optional, if you take notes with Granola, a meeting notes app. A connector links Claude to another app, so Claude can read your meeting itself. Open ',
        { strong: 'Customize > Connectors' },
        ', click ',
        { strong: '+' },
        ', find ',
        { strong: 'Granola' },
        ', and click ',
        { strong: 'Connect' },
        '. Sign in to Granola when it asks.',
      ],
      note: [
        'Once it’s connected, you can skip attaching: say “Follow up on my appointment with” and your client’s name. Claude reads the full transcript only on a paid Granola plan. On Granola’s free plan, Claude gets your notes from the last 30 days but not the transcript, works from the notes, and says so at the top of its answer. So on the free plan, copy the transcript out of Granola and paste it into the chat instead. We haven’t tested the connector on a live meeting yet.',
      ],
    },
  ],

  real: {
    // SKILL.md, section 1 (an uploaded or pasted transcript or notes; the Granola connector) and
    // section 4 (the email is signed with the agent's name from the conversation, else [Agent Name]).
    body: ['Start a new chat the same way, attach your appointment’s transcript or paste it into the chat, and say this.'],
    prompt: 'Here’s the transcript from tonight’s appointment. Write my follow-up.',
    note: [
      'If the transcript doesn’t show your name, add it to your message, and the AI signs the email with it. Before anything goes out, check every date, price and name in the ',
      { strong: 'Check before sending' },
      ' list against the transcript.',
    ],
  },

  chatgpt: { paste: chatgptPaste('appointment-follow-up') },

  sections: [
    {
      // sample.md (the practice run, 12 of 12 checks), shortened, in the output's own order and its own
      // words, cut only by whole items, rows and sentences: all four flags (the buyer agreement flag
      // without its Utah forms sentence), the bottom line, three of the priorities and two more lines of
      // What I Heard, the whole email and text, seven of the note's thirteen lines and its paste line,
      // five of nine next steps (numbers dropped), and five of sixteen rows of Check before sending.
      // "pricing-conversation-prep" is written as the page's name, Pricing Conversation Prep.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI hands back',
      body: 'What the AI wrote from the practice file: a made-up buyer consult on Zoom between a made-up agent, Riley, and made-up buyers, Morgan and Casey Testwood. It’s the same file you practise on in setup.',
      title: 'Follow-Up: Testwood Buyer Consult, Sunday, November 8',
      note: 'Made-up example. Shortened: one sentence cut from the flags, and a few lines kept from What I Heard, the Follow Up Boss note, the next steps and Check before sending. The bottom line, email and text are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Buyer agreement: discussed, not signed yet.' },
            ' You’re sending it through DocuSign tonight, Sunday, November 8. As you described it, it runs three months, through February 8. The first tour is ',
            { strong: 'Saturday, November 14, at 10:00 AM' },
            ', so it needs both signatures before then.',
          ],
        },
        {
          p: [
            { strong: 'Preapproval: done, with a condition.' },
            ' Preapproved with Dana Fakerson at Placeholder Mortgage, conventional, letter dated October 30. Dana said it assumes the townhome sells first (2:35). They said yes to your calling Dana tomorrow, Monday, November 9, about buying before the townhome sells (2:41 to 2:55).',
          ],
        },
        {
          p: [
            { strong: 'Speakers:' },
            ' Granola’s desktop app on a Zoom call labels you “Microphone” and both Testwoods “System audio” (they shared one laptop). Worked out from context: Morgan at 0:25 and 1:40, Casey at 0:42 and 4:36 (confirmed by “That’s Casey” at 4:40, where Morgan asks for email). Lines that can’t be pinned to one of them are written as the Testwoods’.',
          ],
        },
        {
          p: [
            { strong: 'Left out on purpose:' },
            ' a health detail about the family member moving in (the need is written as home features), and the balance owed on the townhome.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Move-up buyer consult with Morgan and Casey Testwood on Zoom (Sunday, November 8): they need four bedrooms with a main-floor bedroom and full bath, somewhere between Herriman and Lehi, around $650,000 with $700,000 as the top, in by the end of February with March 1 as the hard date, and they have a townhome to sell. Next is the townhome walk-through Tuesday, November 10, at 6:30 PM, then a tour of three homes Saturday, November 14, at 10:00 AM. Do this first: send the buyer agreement tonight and call Dana tomorrow, because selling first or buying first shapes everything else.',
          ],
        },
        { h: 'What I heard' },
        { p: [{ strong: 'Their priorities, in their words:' }] },
        {
          items: [
            '“Four bedrooms minimum. And one of them has to be on the main floor with a full bathroom close by.” (1:10)',
            '“Backing onto Bangerter, or any big road” is a deal-breaker: “the noise is the worst.” (1:56)',
            '“No HOA if we can help it. Or a small one.” (2:03)',
          ],
        },
        {
          p: [
            { strong: 'Questions:' },
            ' Morgan asked whether the south end of Riverton is safe. You pointed to the police department’s crime map and the district’s boundary lookup instead of an opinion (3:21 to 3:47).',
          ],
        },
        {
          p: [{ strong: 'Contact:' }, ' Casey wants texts (“I never check email,” 4:36); Morgan wants email (4:40).'],
        },
        { h: 'Recap email' },
        {
          email: {
            subject: 'Next Steps: Tuesday At The Townhome And Saturday’s Tour',
            body: [
              'Morgan and Casey,',
              'Thanks for tonight. Here’s what I heard matters most:',
              'Four bedrooms, with one on the main floor and a full bath close by, and no steps (or one) to get in',
              'A two-car garage and a yard with room for raised beds',
              'Nothing backing onto Bangerter or another busy road, and no HOA or a light one',
              'Riverton, South Jordan or the west side of West Jordan, around $650,000, with $700,000 as the top',
              'In by the end of February, with March 1 as the real deadline',
              'What I’m doing:',
              'Sending the buyer agreement through DocuSign tonight. Please read it and sign before Saturday, November 14.',
              'Calling Dana on Monday, November 9, about buying before the townhome sells',
              'Setting up your search by Monday night, November 9: texts for Casey, email for Morgan',
              'Sending Saturday’s addresses on Thursday, November 12',
              'The police department’s crime map and the district’s boundary lookup: [Add links]',
              'Tuesday, November 10, at 6:30 PM, I’ll walk through the townhome and bring the recent sales from your complex.',
              'Saturday, November 14, at 10:00 AM, we’ll tour three homes.',
              '[Personal note: add by voice]',
              'Riley',
            ],
          },
        },
        { h: 'Text version (to Casey, who asked for texts)' },
        {
          p: [
            'Hi Casey, it’s Riley: I’ll see you both at the townhome Tuesday, Nov 10, at 6:30 PM. Then we tour three homes Saturday, Nov 14, at 10:00 AM.',
          ],
        },
        { h: 'Follow Up Boss note' },
        {
          items: [
            'Buyer consult, Zoom, Sun Nov 8, 2026. Morgan and Casey Testwood.',
            'Motivation: Out of room in 3-bed townhome (Example Ridge Way, Herriman); household growing in the new year.',
            'Criteria: 4+ bed, one on the main with full bath nearby; no-step or one-step entry (level garage OK); 2+ car garage; yard for raised beds. Riverton, South Jordan, west West Jordan. No backing onto Bangerter or big roads. No HOA or a small one. Around 650,000; 700,000 top with townhome sold.',
            'Financing: Preapproved, conventional, Placeholder Mortgage, Dana Fakerson; letter Oct 30 for 690,000; assumes townhome sells first.',
            'Buyer agreement: Discussed, not signed. DocuSign Sun Nov 8; 3 months through Feb 8, as stated. Sign before first tour.',
            'Next step: Tue Nov 10, 6:30 PM, townhome walk-through. Sat Nov 14, 10:00 AM, tour 3 homes.',
            'Suggested Timeframe to Move: 3-6 months',
          ],
        },
        { p: ['Paste it into the note box on the Testwoods’ profile and click Create Note.'] },
        { h: 'Next steps' },
        {
          items: [
            'You, tonight, Sunday, November 8: send the buyer agreement through DocuSign. DocuSign arrives by email and Casey said “I never check email,” so a quick text that it’s waiting helps it get signed before Saturday.',
            'You, Monday, November 9: call Dana Fakerson at Placeholder Mortgage about buying before the townhome sells.',
            'You, before Tuesday: pull the recent sales from their complex. If you use Pricing Conversation Prep, run it on that CMA so the townhome range is ready.',
            'Morgan and Casey, before Saturday, November 14: read and sign the buyer agreement.',
            'You and the Testwoods, Saturday, November 14, 10:00 AM: tour three homes. Meeting place [not set].',
          ],
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 5 of 16 rows',
            head: ['Item', 'Where it’s from'],
            rows: [
              [
                '“tonight” (email)',
                'Appointment Sunday, November 8, 2026, 6:30 PM, from the transcript header. Right only if sent the same night',
              ],
              [
                'Tuesday, November 10, 6:30 PM',
                'Resolved from “Can you do Tuesday? After six is best” and “Tuesday at 6:30 at your place?” / “Works.” (3:14 to 3:20)',
              ],
              ['$650,000 and $700,000', '“around 650. 700 is the absolute top” (2:17), read as thousands'],
              ['690,000 and October 30 (FUB note only)', '2:26'],
              ['Dana Fakerson, Placeholder Mortgage', '2:26, as heard; confirm spelling'],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", items 1 to 9, in its order; page-notes.md, "What Comes Back".
      // Timeframe to Move is Follow Up Boss's own field (references/follow-up-guide.md).
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: no signed buyer agreement before a planned tour, with the date to sign by; a preapproval that’s pending or missing; a promise already due when you ask the next day; speakers the transcript couldn’t tell apart; an appointment outside Utah; a recording note; and a line saying something was left out on purpose.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: what kind of appointment, where it landed, the next step with its date, and the one thing to do first.',
        },
        {
          title: 'What the AI heard',
          body: 'Who was there and when; your client’s priorities in their own words, each with its time in the transcript; motivation, timeline and concerns; every price exactly as each person said it; and every promise made on both sides.',
        },
        {
          title: 'A recap email',
          body: 'From you, to your clients by first name, under 200 words, with a subject that names the next step. Every day in it carries its date. It follows your voice profile, if you made one with our free guide, and leaves a [Personal note: add by voice] line for you to fill in.',
        },
        {
          title: 'A text, when asked',
          body: 'Two sentences on the next step, only when a client asked in the appointment to be texted.',
        },
        {
          title: 'A Follow Up Boss note',
          body: 'Facts only, one labeled line per topic, ready to paste on the contact. It suggests a Timeframe to Move, the Follow Up Boss field for when the client plans to move. It pastes into any CRM’s notes the same way.',
        },
        {
          title: 'Next steps, with dates',
          body: 'Who does what, with the weekday and date, in date order. Every promise from the appointment becomes a step.',
        },
        {
          title: 'Personal note ideas',
          body: 'For you only: one or two details your client shared, like a pet or a trip.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, time, price, name and promise in the drafts, with the line in the transcript it came from.',
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
          title: 'The AI reads the whole transcript',
          body: 'Works out who said what, even when two people share one label. Turns “next Saturday” into a weekday and date. Checks for a signed buyer agreement and a preapproval.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The recap email, the text, the Follow Up Boss note and the next steps. Nothing reaches your client or your CRM until you send it or paste it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Every price and money decision, the buyer agreement and its terms, whether to text a client, what goes into your CRM, and any fair housing judgment. Loan questions go to the lender, and legal and contract questions to your broker. The AI never asks for, repeats or handles wire instructions or account numbers.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need" and "Install", and the build report's needs. No ChatGPT Free
      // upload limits as numbers, and no prices.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, that’s why.',
          tag: 'Team or Enterprise: an owner turns on skills and code execution',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro. The ChatGPT version works from a transcript you paste or upload.',
          tag: 'Free ChatGPT has upload limits. Pasting works too.',
        },
        {
          title: 'A computer, once',
          body: 'Add the skill on claude.ai or in the Claude desktop app, or set up the Project on the ChatGPT website. After that, Claude uses the skill on your phone too. Copying a transcript out of Granola’s desktop app or a Zoom file is easiest on a computer.',
        },
        {
          title: 'Your appointment’s transcript',
          body: 'From Granola, Zoom, an iPhone call recording or Voice Memos, or your own notes. Attach it as a file or paste it into the chat. You don’t retype anything.',
          tag: '“Where to get your transcript” shows how',
        },
        {
          title: 'Connectors, if you want',
          body: 'A connector links Claude to another app. With Granola connected, Claude reads your meeting itself. With Gmail connected, Claude can save the email as a Gmail draft when you ask. Neither is needed, and we haven’t tested either one yet.',
          tag: 'Granola transcripts need a paid Granola plan',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond the plans you already have. Granola’s phone apps are free. For the Granola connector to read transcripts, you need a paid Granola plan. Zoom transcripts need Zoom Pro or higher, with cloud recording.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From", and "Recording, in one line":
      // each vendor's help center and the shared utah-property-notes.md, checked 2026-11-08. Attaching in
      // Claude is page-notes.md's "How to attach files in Claude" (Claude's help center). Granola's
      // training switch is page-notes.md, "What You Need", Privacy.
      kind: 'list',
      heading: 'Where to get your transcript',
      items: [
        {
          title: 'Granola on a computer',
          body: 'Open the meeting note. Click the transcript button, the waveform bars to the left of the “Ask anything” bar (close Chat first if it’s open). Click the copy icon at the top right of the transcript, then paste it into the chat.',
        },
        {
          title: 'Granola on a phone',
          body: 'For in-person appointments. Open the note, tap the three dots (...) at the top right, then View transcript, and share it from there. Speakers show as Speaker A and Speaker B.',
        },
        {
          title: 'Zoom',
          body: 'In the Zoom web portal, click Recordings & Transcripts, then Cloud recordings, then the meeting. Download the audio transcript (a .vtt file). It needs a Pro, Business, Education or Enterprise account, with cloud recording and audio transcription turned on before the meeting. If the file won’t upload, open it in any text editor and paste the text into the chat.',
        },
        {
          title: 'iPhone call recording',
          body: 'For a phone appointment with one other person. During the call in the Phone app, tap the more button, then Call Recording. You both hear that the call is being recorded. Afterward, open Notes, then Call Recordings. Tap the note, tap the recording, then Copy Transcript. Not offered in every country or language.',
        },
        {
          title: 'iPhone Voice Memos',
          body: 'For in-person appointments. Open the recording, tap the more button, then Copy Transcript.',
        },
        {
          title: 'Your own notes',
          body: 'Paste them in. The follow-up is only as complete as your notes.',
        },
        {
          title: 'Attaching a file in Claude',
          body: 'Click the + at the lower left of the chat box, then Add files or photos. Pick the file and click Open. Or drag the file into the chat.',
        },
        {
          title: 'Granola’s own training switch',
          body: 'Transcripts hold your clients’ names and details. On a computer, click your workspace name at the bottom left of Granola, then Settings, then Preferences. Turn off “Use my data to improve models for everyone.” Granola’s Android app doesn’t have this switch yet.',
        },
        {
          title: 'Before you record',
          body: 'Utah lets you record a conversation you’re part of. Some states, such as Washington, require everyone’s consent. So when anyone on the call is in another state, ask everyone first. Questions go to your broker.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", without "Make the email a Gmail draft" (untested).
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your transcript or paste it in, then paste these words with it. Change the names to yours. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'After the appointment, with the transcript attached',
          items: ['Here’s tonight’s buyer consult. Write my follow-up.', 'Zoom transcript attached. They’re relocating from out of state.'],
        },
        {
          label: 'In Claude, with Granola connected (nothing to attach)',
          items: ['Recap my listing appointment with the Samplesons and give me the FUB note.'],
        },
        {
          label: 'When the price is still open',
          items: ['They want to list higher than I recommended. Write a recap that keeps the price question open.'],
        },
        {
          label: 'Just one piece',
          items: ['Just the FUB note, please.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "What It Will Not Do"; SKILL.md, sections 1, 3 and 7 (drafts only, a Gmail
          // draft when asked, prices as stated, the buyer agreement, calls through FUB's own calling).
          q: 'What won’t it do?',
          a: [
            'The AI won’t send, text or post anything, or write to your CRM. You paste the note into Follow Up Boss yourself: the note box on the contact, then ',
            { strong: 'Create Note' },
            '. With Gmail connected in Claude, Claude can save the email as a Gmail draft when you ask, and still won’t send it. We haven’t tested that yet. The AI won’t suggest a list price or split the difference between your number and your seller’s: it records each price as it was said. It won’t draft or explain your buyer agreement’s terms, or state a compensation figure nobody said. For a call made through Follow Up Boss’s own calling, which already has a summary, you get only the email and next steps.',
          ],
        },
        {
          // page-notes.md, FAQ and "What It Will Not Do"; references/fair-housing-and-privacy.md.
          q: 'Why won’t it put my client’s comment about the neighborhood in my notes?',
          a: [
            'Your notes and emails are your own written statements, and a CRM note is a lasting record your team can read. Federal and Utah fair housing law both reach statements that show a preference based on a protected class. So the AI keeps your record to property features, and tells you, without repeating it, that it left a remark out. Questions about schools or safety get official sources, never an opinion. The AI also leaves out loan balances, credit scores, income, debts, sale proceeds and health details. The preapproval amount goes only in your Follow Up Boss note, never in the email. Fair housing questions go to your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 2.
          q: 'My transcript just says “Me” and “Them” (or “Speaker A”).',
          a: [
            'That’s normal. Two people on one laptop share a label, and an in-person meeting recorded on a laptop puts nearly everyone on “Me.” The AI works out who said what from names and context, and tells you when it can’t, especially for prices and promises.',
          ],
        },
        {
          // page-notes.md, FAQ and "Recording, in one line"; utah-property-notes.md, "Recording a
          // Conversation"; SKILL.md, section 7 (Recording).
          q: 'Is it okay to record my appointments?',
          a: [
            'In Utah, you can record a conversation you’re part of. Some states, such as Washington, require everyone’s consent, so when anyone on the call is in another state, ask everyone first. The AI notes where the transcript shows you asked, and flags it when someone was in another state or nobody was told about the notetaker. Outside Utah, it tells you your state’s recording rules weren’t checked. It never rules on whether a recording was legal. Questions go to your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 3 (Location); buyer-agreements.md (NAR, since August 17,
          // 2024, live virtual tours included).
          q: 'Does it work outside Utah?',
          a: [
            'Yes. Outside Utah, the AI checks the buyer agreement against NAR’s MLS rule (a signed agreement before any tour, live video tours included) and points you to your broker. It tells you it didn’t check your state’s rules. The Utah notes, the Utah Association of REALTORS buyer agreement forms and Utah’s recording rule, switch on only for a Utah appointment.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Tested and Not Tested".
          q: 'Which plan do I need, and what was tested?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account shows no way to add a skill, that’s why. In ChatGPT, a Project on Free, Go, Plus or Pro. Free ChatGPT has upload limits, so if a file won’t upload, paste the transcript as text. The Granola connector reads your transcript only on a paid Granola plan. We tested the skill in Claude on four made-up appointments. We haven’t tried it inside ChatGPT, with the Granola connector on a live meeting, or on real appointment transcripts yet, so run the practice file first.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Getting ready for a listing appointment? ',
        { link: 'Pricing Conversation Prep', href: '/pricing-conversation-prep', sameTab: true },
        ' turns your CMA into a price you can defend, a talk track and answers to your seller’s objections.',
      ],
    },
  ],

  unlockKey: 'afu-unlocked',
});
