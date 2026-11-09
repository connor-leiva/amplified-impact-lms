// Every word on /offer-comparison that is its own: the landing page for Offer Comparison, a free skill
// (`skills/offer-comparison/`, version 1.0) that puts every offer a listing received side by side for
// the sellers: flags, a bottom line, the offer set, a side-by-side table with each term's section from
// that offer's own REPC, the escalation math from each clause's text, a certainty-versus-price read,
// gaps for the broker, questions for each buyer's agent, counter options, a seller email and Check
// before sending. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md), its page notes, its graded runs (three evals and the
// practice run, all passed, plus two independent reviewers' reruns) and the build and review reports, so
// the page promises what the skill does. Listing side, once offers are in. The skill names the top two
// for the sellers' priorities and shows the trade; it never picks the winner. The sellers decide, and
// the page says so in the opt-in, the outcome step, the tiles and the FAQ. The note points to Counter
// Explainer for what a counter or addendum changes once the sellers respond.
//
// What the page leaves out or hedges, and why:
//   - No net, commission or title-fee figure without a title net sheet (SKILL.md, section 4; eval 1,
//     where the no-skill baseline invented a 3% commission). The sample keeps the "not a net" label.
//   - ChatGPT Free's limits as numbers (3 file uploads a day, about 12 pages of text per message):
//     page-notes.md cites OpenAI's own pages for them (the ChatGPT Free Tier FAQ and chatgpt.com/pricing).
//     Attach offers in the chat, not as Project files (OpenAI's PDF FAQ, per page-notes.md). OpenAI's
//     pages disagree on reading images in PDFs, so the page says to check initials and signatures by eye.
//   - Gmail is optional (only to save the seller email as a draft) and untested, so no prompt asks for a
//     draft, and the connector tile says the AI writes the email in the chat to copy.
//   - Claude Free: the help center lists skills on every plan, the docs on Pro and up, and no run used
//     Free. The page says both. The ChatGPT version was not run inside ChatGPT.
//   - Real offer packets (scans, handwriting, e-signature certificates) were not tested; every file was
//     made up. The page claims nothing about real files beyond what to upload.
//   - Buyer letters and photos: set aside, never summarized or weighed (SKILL.md, sections 1 and 8; NAR
//     on buyer letters). The sample names only where the letter was.
//   - No "Where to get your files" section: the Gmail and Outlook download paths stay in page-notes.md;
//     the files tile and the real-files step say what to attach and to keep each offer its own PDF.
//
// The practice set is eight PDFs (four offers, each with its letter), attached file by file (a Claude
// chat takes 20). `setupMinutes` is an estimate (page-notes gives none): 10, as the other skill pages
// with a ChatGPT version say for the same steps.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const OFFER_COMPARISON: Guide = skillPage({
  slug: 'offer-comparison',
  title: 'Offer Comparison',

  meta: {
    title: 'Offer Comparison: A Free AI Skill · Amplified Impact',
    description:
      'Upload every offer your sellers received, with each buyer’s lender letter, and get one side-by-side page: what each buyer is really offering, how likely each one is to close, the top two for your sellers’ priorities and a seller email. Your sellers decide. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Listing Agents',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Upload every offer your sellers received, with each buyer’s lender letter, and the AI hands back one side-by-side page: what each buyer is really offering, how likely each one is to close, the top two for your sellers’ priorities, and a seller email you can send after a read.',
  outcome: { n: '03', title: 'Let Your Sellers Decide', body: 'Every offer side by side, the top two, and an email that explains the trade.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI compares the offers from your files. Your sellers decide.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page).
    prompt:
      'Four offers came in on 1457 E Imaginary Aspen Way and I’m meeting my sellers, Jamie and Alex, tomorrow morning. They care most about the deal actually closing, they need to close by Friday, December 18 because they’re buying out of state, and they’d like two days after recording to move out. If they accept, it’ll be Monday, November 9. All four offers and their letters are attached. Which ones should they focus on?',
    // page-notes.md, "Practice Prompt": what the set holds.
    note: [
      'There are eight files: four offers, each with its buyer’s preapproval letter or proof of funds. One offer has a buyer letter as its last page, so you can see the AI set it aside. Every name, address and number in them is made up. ',
    ],
  },

  real: {
    // SKILL.md, section 1: two or more offers with every addendum required, letters expected, a net
    // sheet optional; each offer as its own PDF (page images read only up to 100 pages).
    body: [
      'Start a new chat the same way. Attach each offer as its own PDF, with every addendum, and each buyer’s preapproval letter or proof of funds. Add a seller net sheet from title if you have one. Then say this.',
    ],
    // page-notes.md, "Things to Say", the first, without the [address] to fill in.
    prompt: 'These offers came in on my listing. My sellers want the most money and need to close by [date]. Which two should we focus on?',
    // SKILL.md, section 1 ("From the agent's message", "Buyer letters and photos") and section 9, item 11;
    // page-notes.md, "Privacy before you upload".
    note: [
      'Add your sellers’ priorities (most money, certainty, a closing date, time to move out, fewest repairs), the day they’d accept and any must-have dates, like the day they can move into their next home. You don’t need to type anything that’s in your files, or remove a buyer letter first. Never upload wire instructions. Before anything goes out, check every price, date and section number in the ',
      { strong: 'Check before sending' },
      ' list against the offers.',
    ],
  },

  chatgpt: { paste: chatgptPaste('offer-comparison') },

  sections: [
    {
      // sample.md (the practice run), shortened, in the output's own order and its own words, cut only by
      // whole parts, rows, items and sentences: five of the seven flags; the bottom line; five of the
      // side-by-side table's 24 rows, turned to one offer per row (each cell's words kept, joined as
      // sentences) so the table is two columns and doesn't scroll sideways at 390 pixels; four of the
      // escalation math's lines; the ranking and the trade between B and A; two of the four gaps and the
      // validity line; three of the eleven questions; the seller email without its table; two rows of
      // Check before sending. Left out: the offer set, the counter options and the other rows.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What an offer comparison looks like',
      body: 'What the AI wrote from the practice files: four made-up offers on a made-up listing in Utah, with made-up lender letters and a made-up buyer letter. They’re the same files you practise on in setup.',
      title: 'Offer Comparison: 1457 E Imaginary Aspen Way',
      note: 'Made-up example. Shortened: a few lines from each part, one offer per row in the table, and the seller email without its table.',
      blocks: [
        { h: 'Flags' },
        {
          items: [
            'Practice run: every file is marked “PRACTICE FILE: made-up example.”',
            'Three offers lapse Monday, November 9: C at 12:00 PM, A at 5:00 PM, B at 8:00 PM. D lapses Tuesday, November 10 at 5:00 PM.',
            'Offer A: the Escalation Addendum is signed by Morgan Testcase only; Riley Testcase’s signature line is blank. For the broker.',
            'Set aside, unread for this comparison: a letter to the sellers with a photo, included as the last page of Offer D (page 9). It is not summarized or weighed anywhere below.',
            'No net sheet uploaded, so there’s no net below. Ask title for a net sheet on the two finalists.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'For a deal that closes, by December 18, with two days to move out, the top two are ',
            { strong: 'B ($568,000 cash, closes December 1)' },
            ' and ',
            { strong: 'A ($587,000 after its escalation, conventional, closes December 15)' },
            '. A is $19,000 more after concessions and $21,460 more after what each offer asks the sellers to pay, but it carries a loan and an appraisal (with $10,000 of gap coverage), while B has neither. Jamie and Alex need to decide by ',
            { strong: 'Monday at 5:00 PM' },
            ' to keep A, and by noon if they want C in the running.',
          ],
        },
        { h: 'Side-by-side table' },
        {
          table: {
            caption: '5 of its 24 rows, one offer per row',
            head: ['Offer', 'Price, after concessions, less seller-paid amounts, Settlement, possession'],
            rows: [
              [
                'A (2026 REPC)',
                '$580,000 base; escalates to $587,000. After concessions: $587,000. Less seller-paid amounts: $575,260. Settlement: Tue, Dec 15. Possession: 2 calendar days after Recording, fits.',
              ],
              [
                'B (2024 REPC)',
                '$568,000 cash. After concessions: $568,000. Less seller-paid amounts: $553,800. Settlement: Tue, Dec 1. Possession: 3 calendar days after Recording, fits, with a day to spare.',
              ],
              [
                'C (2026 REPC)',
                '$585,000, $12,000 in concessions. After concessions: $573,000. Less seller-paid amounts: $557,775, and up to $4,000 less if FHA repairs and termite work reach their caps. Settlement: Fri, Dec 18. Possession: upon Recording, doesn’t fit.',
              ],
              [
                'D (2024 REPC)',
                '$590,000, $5,000 in concessions. After concessions: $585,000. Less seller-paid amounts: $572,550. Settlement: Fri, Jan 15, 2027, 28 days late. Possession: 2 calendar days after Recording, fits.',
              ],
            ],
          },
        },
        {
          p: [
            { strong: 'Price less seller-paid amounts written in the offer' },
            ' is not a net: the listing commission, title and escrow fees, the payoff and prorations aren’t in it. Dates are for strategy; confirm dates with your transactions team.',
          ],
        },
        { h: 'Escalation math (Offer A)' },
        {
          items: [
            'Increment: $2,000 more than the highest Purchase Price in any Competing Offer received before the sellers accept A. Cap: $600,000.',
            'Excluded: any offer conditioned on the sale of the competing buyer’s property. D is excluded.',
            'Result: $585,000 (C) plus $2,000 = $587,000, under the $600,000 cap.',
            'The $587,000 depends on C, which lapses at noon Monday. If your broker reads the clause as not counting a lapsed offer, A stays at $580,000. For your broker.',
          ],
        },
        { h: 'Certainty versus price' },
        {
          items: [
            'B: the most certain, closes first, and gives 3 days’ possession.',
            'A: the highest price that fits the dates ($587,000), with a strong letter, at the cost of a loan and an appraisal.',
            'C: fits the date with no margin and doesn’t give the possession time.',
            'D: doesn’t fit the date.',
          ],
        },
        {
          p: [
            { strong: 'The trade between B and A:' },
            ' taking A instead of B adds $19,000 in price after concessions and $21,460 after each offer’s own seller-paid amounts. What it costs: a loan approval and an appraisal at $587,000, instead of cash with no conditions after November 16, and a December 15 close instead of December 1.',
          ],
        },
        { h: 'Gaps to resolve with your broker' },
        {
          items: [
            'Offer A, Escalation Addendum: signed by Morgan Testcase only; Riley Testcase’s signature line is blank.',
            'Offer D: Settlement Deadline of January 15, 2027 is after the sellers’ December 18 date.',
          ],
        },
        { p: ['I’m not ruling on whether any offer is valid as written.'] },
        { h: 'Questions for each buyer’s agent' },
        {
          items: [
            'A: Riley Testcase hasn’t signed the Escalation Addendum. Can both buyers sign it?',
            'B: Is your buyer set to finish inspections by Monday, November 16?',
            'C: Would your buyer agree to possession 2 calendar days after Recording?',
          ],
        },
        { p: ['No question shares another offer’s price or terms; that waits for the sellers’ approval and broker guidance.'] },
        { h: 'Seller email' },
        {
          email: {
            subject: 'Your Four Offers On 1457 E Imaginary Aspen Way, Side By Side',
            body: [
              'Hi Jamie and Alex,',
              'Bottom line: for an offer that closes by December 18 and gives you two days to move out, I’d focus on B, a $568,000 cash offer that closes December 1, and A, which comes to $587,000 with a loan and closes December 15. Three of the offers expire Monday, the first at noon, so let’s talk Monday morning.',
              'What separates A and B: A is $19,000 more. B is cash, so there’s no loan or appraisal that could hold things up, and after November 16 the buyer’s $15,000 deposit is at risk if they walk. A has a strong loan approval, and its offer has the buyers covering up to $10,000 if the appraisal comes in low (that page still needs the second buyer’s signature), but a loan and an appraisal still have to come through.',
              'C needs $12,000 back toward the buyer’s costs, settles on your last possible day (the loan can fund and record up to four days after that), and doesn’t give you time to move out. D can’t close until January 15 and depends on the buyers selling their home.',
              'Your options: accept B, accept A, counter one of them, or ask the top offers for their highest and best.',
              'What I need from you: a call Monday morning, before C expires at noon and A at 5:00 PM.',
              'These numbers aren’t your net. Once we narrow it to two, I’ll get net sheets from title so you can see what you’d walk away with.',
              '[Agent Name]',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: '2 of its 14 rows',
            head: ['Item', 'Where to check it'],
            rows: [
              [
                'A escalation: $2,000, $600,000 cap, sale-of-home and escalating offers excluded, $10,000 appraisal coverage, one buyer signature',
                '01 Offer - Testcase, page 8',
              ],
              ['Closing up to four days after Settlement (funding and Recording)', '2026 REPC 9.2; 2024 REPC 3.2'],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, section 9, "Output, In This Order", in its order, with sections 3 to 7 for what each holds.
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: missing pages, signatures, initials or letters, a buyer letter or photo set aside, which REPC form each offer is on, and any offer about to lapse or lapsing before your sellers would accept. Outside Utah, a note that state rules weren’t checked.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: the top two offers for your sellers’ priorities and why, the dollar difference, and the response deadline.',
        },
        {
          title: 'The offer set',
          body: 'One line per offer: its letter, the buyers, the buyer’s agent, the form, the pages, the lender letter and the acceptance deadline. After that, offers go by letter, not buyer names.',
        },
        {
          title: 'A side-by-side table',
          body: 'One column per offer: price, concessions, price after concessions, what each offer asks your sellers to pay, earnest money and the last day each buyer can walk away with it, loan, appraisal and gap coverage, every deadline with its weekday, sale of the buyer’s home, escalation, possession and the letter. In Utah, each term carries the section number from that offer’s own REPC. Settlement and possession are checked against your sellers’ dates, including the day they can move into their next home.',
        },
        {
          title: 'Escalation math',
          body: 'When an offer escalates: the clause quoted and applied exactly as written, with the math shown and checked against the cap and the buyer’s letter. If the wording can be read two ways, both results, for your broker.',
        },
        {
          title: 'Certainty versus price',
          body: 'What raises or lowers each offer’s chance of closing on time, from the documents only. Then a ranking for your sellers’ priorities and what they trade between the top two, in dollars, dates and possession.',
        },
        {
          title: 'Gaps for your broker',
          body: 'Missing pages, signatures and initials, an addendum the contract lists but that isn’t attached, terms that conflict, and an offer past its deadline. The AI never says whether an offer is valid.',
        },
        {
          title: 'Questions for each buyer’s agent',
          body: 'Two to five per offer, from the gaps, the letter and the terms. None shares another buyer’s terms.',
        },
        {
          title: 'Counter options',
          body: 'Accept, counter one offer, highest and best, a backup or reject, with what each gains and risks. Blanks where your sellers haven’t decided, no counter price of its own, and no contract wording. A highest-and-best note to the buyers’ agents only when your sellers choose that round.',
        },
        {
          title: 'A seller email',
          body: 'Written as you, under 400 words, with offers by letter: the bottom line, a short table, what separates the top two, the options and what you need from your sellers. Nothing from a buyer letter.',
        },
        {
          title: 'Check before sending',
          body: 'Every price, dollar amount, date, day count and section number, traced to its offer, file and page, plus every blank to fill.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own (its opening and sections 7 and 8), and page-notes.md's.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI compares. Your sellers decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the reading and math',
          body: 'Reads every page of every offer, addendum and letter, and lines up the terms. Does the math: price after concessions, what each offer asks your sellers to pay, escalation results from each clause, earnest money at risk, and the day and weekday of every deadline. Flags missing pages, signatures, initials and letters.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The ranking, the questions for each buyer’s agent, the counter options, the highest-and-best note and the seller email. Nothing reaches your sellers or a buyer’s agent until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours and your sellers’',
          body: 'Your sellers decide which offer to accept, counter or reject, and every price and dollar amount. You own the advice. Your broker rules on missing signatures, validity, escalation wording, sharing a competing offer as proof and any counter to more than one buyer. Title confirms the net. Your transactions team keeps the official dates. Wire instructions and account numbers: the AI never asks for them or repeats them.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need", and its sources (checked 2026-11-08). Gmail is optional and
      // untested, so it isn't offered here.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on, so Claude can do the price, concession, escalation and date math. Claude’s help center lists skills on every plan, Free included.',
          tag: 'Team or Enterprise: an owner controls skills',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro. Free ChatGPT allows 3 file uploads a day, so use Go or Plus, or Claude, for a full offer set.',
          tag: 'Attach offers in the chat, not the Project',
        },
        {
          title: 'A computer',
          body: 'To set it up once, on claude.ai, in the Claude desktop app or on the ChatGPT website. Downloading the offer PDFs from your email is easiest on a computer too.',
        },
        {
          title: 'Your files',
          body: 'Two or more offers, each with every addendum, each as its own PDF. Each buyer’s preapproval letter or proof of funds is expected. A seller net sheet from title is optional.',
          tag: 'Two or more offers required',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app, like Gmail. This skill needs none. The AI writes the seller email in the chat for you to copy.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude or ChatGPT plan. A net sheet, if you want one, comes from your title officer.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", with curly apostrophes, the first with its [date] kept and its
      // [address] dropped.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach the offers and their letters, and paste. Change any number or day to yours. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with the offers attached',
          items: [
            'Four offers came in. My sellers want the most money and need to close by [date]. Which two should we focus on?',
            'One buyer didn’t send a preapproval. Compare them anyway and tell me what to ask for.',
          ],
        },
        {
          label: 'With a net sheet or an escalation',
          items: [
            'Here are the offers and the net sheet title ran on the first one. Which nets my seller the most?',
            'Two of these escalate. Where do they actually land?',
          ],
        },
        {
          label: 'Once your sellers choose',
          items: ['My sellers chose highest and best. Draft the note to the buyers’ agents.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md's FAQ; SKILL.md, sections 6 and 8.
          q: 'Will it tell my sellers which offer to take?',
          a: [
            'No. It names the top two for the priorities you give it and shows exactly what your sellers trade between them, in dollars, dates and certainty. It never picks the winner. Your sellers decide.',
          ],
        },
        {
          // page-notes.md's FAQ; SKILL.md, section 4; evals 1 and 2.
          q: 'Can it tell me what my sellers will net?',
          a: [
            'Only from a title net sheet. Without one, it does no commission, title fee, payoff or proration math. It shows the price after concessions and the price less what each offer asks your sellers to pay, labeled “not a net,” and suggests asking title for net sheets on the finalists. With a net sheet, it uses it for the offer it was run on and estimates the others from it, labeled as estimates for title to confirm.',
          ],
        },
        {
          // page-notes.md's FAQ; SKILL.md, section 5; evals 1 and 3.
          q: 'How does it handle escalation clauses?',
          a: [
            'It quotes the clause and applies it exactly as written: which offers count, whether it measures price or a defined net, and the cap. It shows the math and checks the result against the buyer’s letter. When two clauses point at each other or the wording can be read two ways, it shows both results and sends the question to your broker. It never rewrites a clause or drafts one.',
          ],
        },
        {
          // page-notes.md's FAQ; SKILL.md, sections 1 and 8 (fair housing).
          q: 'What if a buyer sends a love letter?',
          a: [
            'The AI sets it aside, notes that it was there and keeps it out of the comparison and the email. You don’t need to remove it first. Letters often carry personal details about the buyers, which is a fair housing risk if they sway the choice. The AI compares terms, never buyers.',
          ],
        },
        {
          // SKILL.md, sections 1 and 3; page-notes.md, "What to Upload" (Claude reads page images only in
          // PDFs of 100 pages or fewer).
          q: 'What if a page or signature is missing?',
          a: [
            'The AI lists it for you to take to your broker: a gap in “Page X of Y,” a blank signature or initial line, or an addendum the contract lists but that isn’t attached. It never says whether an offer is valid. Keep each offer as its own PDF: Claude reads checkboxes, initials and signatures from the page images only in PDFs of 100 pages or fewer.',
          ],
        },
        {
          // page-notes.md's FAQ; SKILL.md, section 2 (UAR's notice and both REPCs, checked 2026-11-08).
          q: 'Which REPC does it use?',
          a: [
            'Each offer’s own. Until December 31, 2026, an offer set can mix the December 4, 2024 and November 1, 2026 forms, and their section numbers differ. The AI reads each offer’s footer and cites its sections from that form, never mixing them. From January 1, 2027, it flags any offer still on the old form. In another state, it takes every term from your files and says state rules weren’t checked.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Not tested"; ChatGPT Free's numbers from OpenAI's own pages
          // (the ChatGPT Free Tier FAQ and chatgpt.com/pricing), as page-notes.md cites them.
          q: 'Which plan do I need?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan. In ChatGPT, a Project on Free, Go, Plus or Pro. Free ChatGPT allows 3 file uploads a day and about 12 pages of text per message, which is small for a full offer set, so use Go or Plus, or Claude. Attach the offers in the chat, not as Project files, and check every initial and signature line yourself. We tested the skill in Claude. We haven’t tried it on Claude’s free plan or inside ChatGPT yet, so run the practice files first.',
          ],
        },
        {
          // page-notes.md, "What It Won't Do"; SKILL.md, section 8.
          q: 'What won’t the AI do?',
          a: [
            'The AI won’t decide for your sellers or promise a closing, an appraisal or a loan approval. It never invents commissions, closing costs or market numbers, never states a loan program’s concession cap (the buyer’s lender confirms it), and never writes contract wording. It won’t share one buyer’s terms with another, or suggest countering several buyers at once without your broker. It leaves loan and account numbers out and never asks for or repeats wire instructions. It doesn’t keep your official deadline calendar, and it never sends anything.',
          ],
        },
      ],
    },
    {
      // skills/counter-explainer: one counter or addendum, what it changes (SKILL.md's description names it
      // for that).
      kind: 'note',
      body: [
        'Got a counter or addendum back after your sellers respond? ',
        { link: 'Counter Explainer', href: '/counter-explainer', sameTab: true },
        ' shows what it changes.',
      ],
    },
  ],

  unlockKey: 'oc-unlocked',
});
