// Every word on /speed-to-lead-reply that is its own: the landing page for Speed to Lead Reply, a skill
// (`skills/speed-to-lead-reply/`, version 1.0) that turns one new online lead (a Follow Up Boss new-lead
// notification or profile, a portal's lead email, a website registration or a Facebook lead form, pasted
// or as a screenshot) and the listing sheet, if the agent has one, into flags, a bottom line, the consent
// read, a first text only when the record shows the lead agreed to texts, a first email that answers what
// the lead asked from the listing only, a call opener and a 20-second voicemail, day 1 and day 3 touches
// and Check before sending. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// It is paid (the agent set of the Amplified Skill Library), so the page is drawn with its hero and
// sample and the Skill Library card in place of the sign-up and the setup (D-082, automatic from the
// catalog through `skill`). The free words and the setup below stay for the day it is free.
//
// The words come from the skill itself (SKILL.md, references/lead-reply-guide.md and
// utah-lead-reply-notes.md), its page notes, and its graded runs (the practice run 10 of 10 after two
// fixes, eval 1 11 of 11, eval 2 11 of 11 after one fix, eval 3 6 of 6, and the two other practice leads
// 6 of 6 and 5 of 5), so the page promises what the skill does. The sample is sample.md, the graded
// practice run, cut only by whole flags, sections, rows and sentences; every draft it shows is whole.
//
// What the page holds to, as SKILL.md does: drafts only, never sent, never written to Follow Up Boss. A
// text only when the lead record shows the lead agreed to texts, or the agent says so; a phone number is
// never consent; a STOP reply, Do Not Text or Do Not Call closes texts for good. No availability claim,
// no opinion on schools, safety or neighbors, no showing promised before a written buyer agreement, no
// fact the listing doesn't show. A lead who has an agent gets a polite reply only.
//
// Calls left open, and how the page handles them:
//   - Follow Up Boss action plans and Instant Response: the page says only what page-notes.md says, as
//     advice (pause the plan on the lead, or let it run and send after it; Follow Up Boss skips its
//     automatic first text when the agent texts first). The Instant Response and action plan facts come
//     from search excerpts of Follow Up Boss's help center (it blocks direct reads), and page-notes.md
//     says so. Connor's filter: the skill is the personal reply beside the automation, not a rebuild.
//   - Portal consent: the page never says a portal's form covers the agent's texts. It says to ask the
//     broker and tell the AI, as the skill's CHECK FIRST read does.
//   - Sundays and legal holidays: no call or voicemail lands on one, even with consent that covers calls
//     and even though Utah Code 13-25a-111 exempts a licensee acting within the license. It moves to the
//     next day that is neither; texts to a TEXT OK lead and emails keep their day. Utah mode uses Utah's
//     legal holidays, general mode Sundays and the federal ones (5 U.S.C. 6103). A conservative default.
//   - The email footer: every email, the first reply and every touch, carries the opt-out line, the
//     postal address and "This is a marketing email from [Agent Name], [Brokerage Name].", even though the
//     lead asked to hear back. A conservative default; Check before sending says to confirm the wording.
//   - The three conservative defaults (the footer, the call-free Sundays and holidays, no text on
//     portal-only consent until the broker confirms) are stricter than the law in places. The FAQ "Why is
//     it stricter than the law?" names them and says you can calibrate them with your own legal counsel.
//   - Real Follow Up Boss, portal and Facebook files, screenshots, ChatGPT itself and Claude Free were not
//     tested; the page says so, as the other skill pages do. The notification layouts in the practice files
//     are realistic, not copies, and no vendor click path for a notification is given.
//
// The practice set is four files (three new leads and one listing sheet); the practice prompt uses the
// first lead and the listing sheet, attached file by file. `setupMinutes` is an estimate (page-notes gives
// none): 10, as the other skill pages with a ChatGPT version say for the same shared steps. The note points
// to Appointment Follow-Up, for the lead who books a meeting (it is in SKILL.md's "Not for" line and is
// already a page).
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const SPEED_TO_LEAD_REPLY: Guide = skillPage({
  slug: 'speed-to-lead-reply',
  skill: 'speed-to-lead-reply',
  title: 'Speed to Lead Reply',

  meta: {
    title: 'Speed to Lead Reply: A Free AI Skill · Amplified Impact',
    description:
      'Paste in a new online lead and get a personal first reply you can send in two minutes: a text only if they agreed to texts, an email that answers what they asked from the listing, a call opener, a voicemail and two follow-ups. A free skill for Claude and ChatGPT. It never sends anything or changes your CRM.',
  },

  // Non-breaking spaces keep the audience on one line at phone width, as /open-house-follow-up does.
  eyebrow: 'Free AI Skill · For Agents With Online Leads',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Paste in a new lead the second it lands, and the AI hands back a personal first reply you can send in two minutes: a text only if they agreed to texts, an email that answers what they actually asked, a call opener and voicemail, and two follow-ups.',
  outcome: { n: '03', title: 'Reply in Two Minutes', body: 'A text, an email and a call that answer what the lead asked.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI drafts the reply. It never sends anything or changes your CRM.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page). The run date
    // changes the touch dates, so the note gives the lead's date.
    prompt:
      'Here’s a new lead that just came in from my website, and the listing sheet for the home they asked about. I’m Riley Sampleton with Example Peak Realty. Write my first reply.',
    note: [
      'Attach two of the four files: the website registration for Avery Testington and the listing sheet for 4120 S Placeholder Pines Ln. The made-up lead came in on Tuesday, November 10, 2026, and you’re playing the agent, Riley. Every name, address and number in them is made up. On a later day, the AI flags that the lead came in earlier and dates the follow-ups from your today. The other two leads are there to try next. ',
    ],
  },

  real: {
    // SKILL.md, section 1 (the lead and the listing) and section 2 (the consent read).
    body: ['Start a new chat the same way, paste in your new lead or attach a screenshot of it, add the listing sheet if you have one, and say this.'],
    prompt: 'New lead just came in. Listing sheet attached. Write my first reply.',
    note: [
      'Before anything goes out, check the consent quote and every fact in the ',
      { strong: 'Check before sending' },
      ' list, and send a text only when the record shows the lead said yes to texts.',
    ],
  },

  chatgpt: { paste: chatgptPaste('speed-to-lead-reply') },

  sections: [
    {
      // sample.md (the practice run, 10 of 10 checks), shortened, in the output's own order and its own
      // words, cut only by whole flags, sections, rows and sentences: three of five flags, the bottom line,
      // the consent read without its opt-out line, the whole first text with its consent line, the whole
      // email, the call opener and voicemail (without the agent's note between them), day 1's text and email
      // (whole), and five of seventeen rows of Check before sending.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI hands back',
      body: 'What the AI wrote from the practice files: a made-up website lead and the listing sheet for the home they asked about, for a made-up agent, Riley. It’s the same set you practise on in setup.',
      title: 'First Reply: Avery Testington, 4120 S Placeholder Pines Ln',
      note: 'Made-up example, run the day the lead came in. Shortened: three of the five flags, Day 1’s text and email only (Day 1’s call and all of Day 3 left out), and five rows of Check before sending. The bottom line, the text, the email, the call opener and the voicemail are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Action plan already running.' },
            ' “Website Buyer, 14 Day” started at 9:43 AM and sent its automatic email (“Thanks for registering with Example Peak Realty!”) at 9:43 AM. Nothing below repeats it. Your call: pause the plan on Avery’s profile in Follow Up Boss so its emails don’t land between your personal touches, or let it run and send this right after it.',
          ],
        },
        {
          p: [
            { strong: 'Saturday’s showing.' },
            ' Avery asked to see it “this Saturday” (Saturday, November 14). No draft promises it: a written buyer agreement comes first.',
          ],
        },
        {
          p: [
            { strong: 'Left out on purpose:' },
            ' what Avery said about who might stay in the basement, Avery’s website activity and saved search, the agent-only remarks and showing instructions, and the school fields.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Avery Testington registered on your website at 9:41 AM asking whether the basement at 4120 S Placeholder Pines Ln has its own entrance, whether the backyard is fenced, and to see it Saturday. Both answers are yes on the listing sheet: send the text now, then the email, and call right after.',
          ],
        },
        { h: 'Consent read' },
        {
          p: [
            { strong: 'What the record shows:' },
            ' the registration form, as submitted Tue, Nov 10, 2026 9:41 AM: “[X] I agree to receive calls and text messages from Example Peak Realty and its agents at the phone number above about my home search, including messages sent by automated means. Consent is not a condition of any purchase. Msg and data rates may apply. Reply STOP to opt out.”',
          ],
        },
        {
          p: [
            { strong: 'Read: TEXT OK.' },
            ' The box is checked, the line covers text messages (and calls), it names Example Peak Realty and its agents, and the record has a mobile number.',
          ],
        },
        { p: [{ strong: 'Allows:' }, ' text, call and email.'] },
        { h: 'First text' },
        {
          p: [
            'Consent: “I agree to receive calls and text messages from Example Peak Realty and its agents at the phone number above about my home search” (registration form, checked, Tue, Nov 10, 2026 9:41 AM)',
          ],
        },
        {
          p: [
            'Hi Avery, it’s Riley Sampleton with Example Peak Realty. Yes, the basement at 4120 S Placeholder Pines Ln has its own exterior door, and the backyard is fully fenced. I’m emailing you the details now. Is today a good day for a quick call? Reply STOP to opt out.',
          ],
        },
        { h: 'First email' },
        {
          email: {
            subject: 'Your Questions About 4120 S Placeholder Pines Ln',
            body: [
              'Hi Avery,',
              'Thanks for asking about 4120 S Placeholder Pines Ln. Here’s what the listing shows:',
              'Basement entrance: yes. The finished basement has its own exterior door on the north side, along with a kitchenette, a bedroom and a three-quarter bath.',
              'Backyard: fully fenced, with a 6-foot vinyl fence, a lawn and a covered patio.',
              'Saturday: I’d be glad to set up a showing. Before we tour, we’ll sign a written buyer agreement together. It’s short, and I’ll walk you through it. The home showed as active on the listing sheet this morning, and I’ll confirm it’s still available and what times work on Saturday, November 14.',
              'Would a quick call today work to go over it?',
              'Riley Sampleton',
              'Example Peak Realty | [Agent Phone]',
              'To stop these emails, reply UNSUBSCRIBE. [Sender Postal Address]',
              'This is a marketing email from Riley Sampleton, Example Peak Realty.',
            ],
          },
        },
        { h: 'Call opener and voicemail' },
        {
          p: [
            { strong: 'Call opener:' },
            ' Hi Avery, this is Riley Sampleton with Example Peak Realty. I’m calling about your questions on 4120 S Placeholder Pines Ln. The basement does have its own exterior door, and the backyard is fully fenced. What has you looking in Riverton?',
          ],
        },
        {
          p: [
            { strong: 'Voicemail:' },
            ' Hi Avery, it’s Riley Sampleton with Example Peak Realty, calling about 4120 S Placeholder Pines Ln. Yes to both questions: the basement has its own exterior door, and the backyard is fully fenced. I also sent an email and a text. Call or text me at [Agent Phone].',
          ],
        },
        { h: 'Day 1: Wednesday, November 11' },
        {
          p: [
            { strong: 'Text:' },
            ' Hi Avery, it’s Riley with Example Peak Realty. One more from the listing: the basement bedroom has an egress window. Anything else I can find out? Reply STOP to opt out.',
          ],
        },
        {
          email: {
            subject: 'One More Detail On 4120 S Placeholder Pines Ln',
            body: [
              'Hi Avery,',
              'One more detail from the listing: the main floor has an office with French doors, and the kitchen’s quartz counters were updated in 2022.',
              'If you’d still like to see it Saturday, November 14, reply here and I’ll send the buyer agreement and confirm times.',
              'Riley Sampleton',
              'Example Peak Realty | [Agent Phone]',
              'To stop these emails, reply UNSUBSCRIBE. [Sender Postal Address]',
              'This is a marketing email from Riley Sampleton, Example Peak Realty.',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 5 of 17 rows',
            head: ['Item', 'Where it’s from'],
            rows: [
              [
                'Basement has its own exterior door on the north side',
                'Listing sheet, Interior: “Basement Entrance: Separate, exterior door on the north side”; Public Remarks',
              ],
              ['Fully fenced, 6-foot vinyl; lawn and covered patio', 'Listing sheet, Exterior: “Fencing: Full, vinyl, 6 ft”; “Backyard: Lawn, covered patio”'],
              [
                '“showed as active on the listing sheet this morning”',
                'Listing sheet: “Status: Active,” Agent Full Report printed 11/10/2026 9:50 AM. Confirm it’s still available before you send',
              ],
              [
                'Consent for the texts',
                'Registration form line quoted above, checked, Tue, Nov 10, 2026 9:41 AM, naming Example Peak Realty and its agents. Keep that record with its date and number',
              ],
              [
                'Buyer agreement',
                'Before any showing, sign your brokerage’s current buyer agreement (in Utah, usually UAR’s Exclusive Buyer-Broker Agreement and Agency Disclosure); confirm with your broker',
              ],
            ],
          },
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
          body: 'Only when they apply: a lead who replied STOP or is marked Do Not Text or Do Not Call, consent your broker should check, an automatic message or action plan that already went out, a lead who has an agent, a lead outside 8 AM to 8 PM, a call moved off a Sunday or legal holiday, a lead outside Utah, and a line saying something was left out on purpose.',
        },
        {
          title: 'A bottom line',
          body: 'Two sentences: who the lead is and what they asked, and what to send first, by when.',
        },
        {
          title: 'The consent read',
          body: 'What the lead record says about texts, quoted word for word, or that it says nothing. Then what that allows: text, call and email, or call and email only, and why.',
        },
        {
          title: 'A first text, only with consent',
          body: 'With the consent line quoted above it. It names you and your brokerage, answers their question in a line, and ends with “Reply STOP to opt out.”',
        },
        {
          title: 'A first email',
          body: 'Under 150 words, with a subject that names the home or their question. It answers each question from the listing only, or says you’ll find out, and ends with a way to opt out, your postal address and a line saying it’s a marketing email. It follows your voice profile, if you made one with our free guide.',
        },
        {
          title: 'A call opener and voicemail',
          body: 'An opener that says who you are and why you’re calling in the first sentence, and a voicemail of about 20 seconds that you leave yourself.',
        },
        {
          title: 'Two follow-ups',
          body: 'Day 1 and day 3, with dates, in the same channels. Each one brings one new fact from the listing or the answer you promised.',
        },
        {
          title: 'Check before sending',
          body: 'Every fact in the drafts with the listing field it came from, every date, each promise, the consent quote, the send window and the Do Not Call check.',
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
          title: 'The AI reads the whole lead',
          body: 'Quotes what the record says about texts. Finds automatic messages that already went out. Answers from the listing. Works out the send times and the follow-up dates.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The text, the email, the call opener, the voicemail and the two follow-ups. Nothing reaches the lead or your CRM until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Whether to text at all, and the consent records. The Do Not Call check. Every price and availability answer, the buyer agreement, and any change to Follow Up Boss, like pausing an action plan. The fair housing call. Questions go to your broker.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need" and "Install", worded as /open-house-follow-up words the shared plan
      // facts. No ChatGPT Free upload limits as numbers, and no prices.
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
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro. The ChatGPT version works from a lead you paste in.',
          tag: 'Free ChatGPT has upload limits. Pasting works too.',
        },
        {
          title: 'A computer, once',
          body: 'Add the skill on claude.ai or in the Claude desktop app, or set up the Project on the ChatGPT website. After that, Claude uses the skill on your phone too, which is where a new lead usually finds you.',
        },
        {
          title: 'The new lead',
          body: 'The Follow Up Boss notification or profile, the portal’s lead email, or a screenshot. Paste it in. You don’t retype anything.',
          tag: '“Where to get your lead” shows how',
        },
        {
          title: 'The listing, if you have it',
          body: 'Your MLS printout or listing sheet. Without one, the AI uses only what the lead email shows and offers to find out the rest.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond the plans you already have. No connectors.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From", and "Texting, in one line". The
      // People path and the orange number are Follow Up Boss's help center (checked 2026-11-08); no
      // notification or portal click path was checked, so none is given. Attaching in Claude is Claude's
      // help center ("Uploading files to Claude", checked 2026-11-10).
      kind: 'list',
      heading: 'Where to get your lead',
      items: [
        {
          title: 'The Follow Up Boss notification',
          body: 'Copy the whole new-lead email or app alert and paste it into the chat, or take a screenshot.',
        },
        {
          title: 'The lead’s profile in Follow Up Boss',
          body: 'Open People, then All People, then the lead’s name. Copy the contact details, the inquiry, the tags, any Text Consent field and the latest timeline, or take a screenshot. The timeline shows automatic texts and emails that already went out. A phone number shown in orange means the lead texted STOP.',
        },
        {
          title: 'A portal’s lead email',
          body: 'From Zillow, Realtor.com or another site. Copy the whole email, including anything under the message, and paste it in.',
        },
        {
          title: 'Your website or a Facebook lead form',
          body: 'Use the Follow Up Boss record if they flow in there. Include the form’s checkbox lines and disclaimer: their exact wording decides whether a text gets drafted.',
        },
        {
          title: 'The listing',
          body: 'Attach your MLS printout or listing sheet as a PDF, or paste the listing. Agent-only fields are fine to include. The AI keeps them out of the drafts.',
        },
        {
          title: 'Attaching a file in Claude',
          body: 'Click the + at the lower left of the chat box, then Add files or photos. Pick the files and click Open. Or drag the files into the chat.',
        },
        {
          title: 'Before you text anyone',
          body: 'Text only a lead whose record shows they said yes to texts from you or your brokerage, or who told you yes and you have a record of it. A phone number on a lead isn’t consent. Every text the AI drafts ends with “Reply STOP to opt out.”',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), paste in your lead or attach a screenshot, then paste these words with it. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'When a lead comes in',
          items: ['New lead from my website. Listing sheet attached. Write my first reply.', 'Here’s a Zillow lead. I don’t have the listing sheet. What do I send?'],
        },
        {
          label: 'After hours',
          items: ['This lead came in at 9 PM. What can I send tonight?'],
        },
        {
          label: 'When the lead told you yes to texts',
          items: ['She told me on the phone she’s fine with texts. Write the text.'],
        },
        {
          label: 'Just one piece',
          items: ['Just the text, please.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, FAQ; references/lead-reply-guide.md, "Automatic Messages and Action Plans"
          // (Follow Up Boss's help center through search excerpts, 2026-11-10).
          q: 'Follow Up Boss already sends an automatic first message. How does this work with it?',
          a: [
            'The automatic message is the same for every lead. This answers what this lead asked, from the listing, with the consent read first. If your account uses Follow Up Boss’s Instant Response and you text first, Follow Up Boss skips its automatic first text, so the lead gets one first text, not two. If it already went out, your text says you’re writing personally. For an action plan running on the lead, you choose: pause it on the lead in Follow Up Boss so its emails don’t land between your personal follow-ups, or let it run and send this right after it. Your admin can also set action plans to pause when a lead responds. The AI only advises. It never pauses or changes anything.',
          ],
        },
        {
          // page-notes.md, FAQ; the shared outreach-rules.md (TCPA, checked 2026-11-08).
          q: 'The lead gave me their phone number. Why no text?',
          a: [
            'Marketing texts need the person’s consent, and a phone number isn’t consent. A checked box or consent line that covers texts and names you or your brokerage counts, or a yes you can show. A lead who replied STOP, or is marked Do Not Text or Do Not Call, never gets a text, even if an older form said yes. Every text ends with “Reply STOP to opt out.” Questions about texting rules go to your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 2 (CHECK FIRST).
          q: 'The portal says the buyer agreed to be contacted. Can I text them?',
          a: [
            'The portal’s own consent wording usually isn’t in the lead email, and it may name the portal or “real estate professionals” rather than you. Ask your broker whether it covers your texts. Until they confirm, no text (a conservative default). If it does, tell the AI, and it drafts the text.',
          ],
        },
        {
          // page-notes.md, FAQ; references/lead-reply-guide.md, "Fair Housing" (42 U.S.C. 3604, Utah Code
          // 57-21-5, the Utah School Report Card).
          q: 'They asked “Is it a safe area, and how are the schools?” Why won’t it answer?',
          a: [
            'Federal and Utah fair housing law reach statements that show a preference about who lives in an area. So the AI gives no opinion and names no schools. It points to public sources: the school district’s boundary map, the state’s school report card (in Utah, the Utah School Report Card) and the local police department’s crime map, and offers to send the district map. Fair housing questions go to your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; references/lead-reply-guide.md, "Touring" (NAR, checked 2026-11-10) and
          // utah-lead-reply-notes.md (R162-2f-401a(2), 13-25a-103(3)).
          q: 'They asked to see it Saturday. Why doesn’t it book the showing?',
          a: [
            'Since August 17, 2024, NAR’s MLS policy has required a signed written agreement with a buyer before touring a home, in person or by live video. Answering their questions doesn’t need one. So the reply offers to set it up and says the buyer agreement comes first. The AI also moves a follow-up call or voicemail off a Sunday or a legal holiday, even when the lead’s consent covers calls. Outside Utah, it tells you it didn’t check your state’s rules. Questions go to your broker.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, Guardrails ("Conservative defaults"); the shared outreach-rules.md,
          // "Conservative Defaults".
          q: 'Why is it stricter than the law?',
          a: [
            'A few of its rules are our conservative defaults, and they go further than the law in places. Every email carries the full footer: a way to opt out, your postal address and a line saying it’s a marketing email, even to a lead who asked to hear back. No call or voicemail lands on a Sunday or a legal holiday, even with consent, and even though Utah exempts licensees. It moves to the next day that isn’t one. And consent that names only a portal or “real estate professionals” gets no text until your broker confirms it covers you. You can calibrate these with your own legal counsel. Tell the AI the rule your counsel approved, and it follows that and notes it in Check before sending.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Tested and Not Tested".
          q: 'Which plan do I need, and what was tested?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan. In ChatGPT, a Project on Free, Go, Plus or Pro. We tested the skill in Claude on six made-up leads: website registrations with and without consent, portal leads, a lead who replied STOP, and a lead who already has an agent. We haven’t tried it inside ChatGPT, on screenshots, or on real Follow Up Boss or portal emails yet, so run the practice files first.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Lead booked a meeting? ',
        { link: 'Appointment Follow-Up', href: '/appointment-follow-up', sameTab: true },
        ' turns that appointment’s transcript into the recap email and a Follow Up Boss note.',
      ],
    },
  ],

  unlockKey: 'stlr-unlocked',
});
