---
name: offer-comparison
description: "Puts every offer a listing received side by side for the seller. Reads each contract and addenda, each preapproval or proof of funds and any title net sheet, then returns the top two offers for the seller's priorities, a side-by-side table (price after concessions, seller-paid amounts, earnest money and walk-away dates, loan, appraisal, deadlines, sale-of-home, escalation math, possession), gaps for the broker (missing pages, signatures, initials), a certainty-versus-price read, questions for buyers' agents, counter options and a seller email. Reads each offer's own Utah REPC form; general mode elsewhere. Sets buyer letters aside. Use it whenever a listing agent uploads two or more offers, or says multiple offers, highest and best came in, or which offer should my sellers take, even if they never say offer comparison. Listing side. Not for one counter or addendum (counter-explainer), your buyer's offer (offer-strategy), a repair request (repair-request-response) or a list price (pricing-conversation-prep)."
metadata:
  author: Amplified Impact
  version: "1.0"
compatibility: "Works from uploaded files; no connector needed. Uses code execution (on by default) for the price, concession, escalation and date math. Gmail is optional, only to save the seller email as a draft when asked."
---

# Offer Comparison

Put every offer on one page so the listing agent can show the seller what each buyer is really offering: the price after the money the seller gives back, how likely each deal is to close, how long each buyer can still walk away with the deposit, and what the seller trades between the top two. Sellers tend to pick the biggest number on page one; the offer that actually closes is often decided by the appraisal terms, the letter, the deadlines and an addendum on page nine.

**Run, Draft, Own.** You read every page of every offer and letter, line up the terms, do the price, concession, escalation and date math, and flag gaps. The ranking, questions for buyers' agents, counter options and seller email are drafts the agent reads and changes first. The seller decides which offer to accept, counter or reject, and every price and dollar amount; the agent advises; the broker rules on missing signatures, validity, escalation language and any counter sent to more than one buyer; title confirms the net. Wire instructions, loan and account numbers are never asked for, repeated or handled.

## 1. Gather the Offers and the Seller's Priorities

- **Required:** two or more offers, each with its purchase contract and every addendum. With only one offer, say this skill compares offers, and point to counter-explainer for one counter or addendum.
- **Expected with each offer:** the preapproval letter or proof of funds. If one is missing, keep going: mark that offer's letter row [no letter uploaded], lower its certainty, flag it at the top, and ask for it in the questions.
- **Optional:** a title company's seller net sheet; the listing's MLS sheet (list price, list date).
- **From the agent's message:** the seller's priorities (net, certainty, closing date, possession, fewest repairs), the expected Acceptance date, the seller's must-have dates. Use them; never ask the agent to retype what a file holds. If priorities aren't given, write [Seller priorities], rank on price after concessions and certainty equally, and flag it.
- Read every page of every PDF, start to finish: checkboxes, blanks, handwritten changes, initials, signatures with dates, page numbers ("Page 3 of 6"), footers, and every addendum. Match each page to its offer by address, buyer names and Offer Reference Date. Claude reads page images (checkboxes, initials, signatures) only in PDFs of 100 pages or fewer: if one file runs longer, say those marks may not have been read and ask for each offer as its own PDF.
- **Label the offers A, B, C** in the order received (or uploaded). Use the letters, not buyer names, everywhere after the offer set list. The comparison is about terms.
- **Buyer letters and photos:** set aside any letter, photo, video link or personal note from a buyer, and personal details in a cover email. Note only that it was there (offer, file, page) and that it was set aside. Never summarize, quote, describe or weigh it.
- Files marked "PRACTICE FILE" are a practice run: say so in the flags.

## 2. Check Each Offer's Form and the State

Read `references/comparison-guide.md` for how to read each row, and in Utah `references/utah-offer-comparison.md`.
- **Each offer's own footer decides its section numbers.** "EFFECTIVE DECEMBER 4, 2024": `references/utah-repc.md`. "EFFECTIVE NOVEMBER 1, 2026": `references/utah-repc-2026.md` (separate Appraisal and Financing Deadlines, concessions in Section 2.2, a next-business-day rule for earnest money and Settlement dates on a weekend or legal holiday). Offers on different forms in one set are normal through December 31, 2026: cite each offer's sections from its own form and never mix them. From January 1, 2027, flag any offer on the December 4, 2024 form for the broker.
- Any other footer, a builder or attorney form, or a form you can't identify: read every term from the upload and say no reference form was used.
- **Outside Utah:** general mode. Take every term, deadline and counting rule from the documents, use the form's own term names, skip all Utah notes and section numbers, and put "State rules were not checked for [state]; confirm with your broker" in the flags.
- For counters and acceptance, read `references/utah-forms-and-counters.md` (Utah) or take the rules from the uploaded form.

## 3. Flag Gaps, Without Ruling on Them

List for the agent to resolve with the broker: missing pages (a gap in "Page X of Y"), missing buyer signatures or initials, an addendum listed in the contract but not attached (an FHA/VA addendum for an FHA or VA loan, a sale-of-home addendum when that box is checked, a title company earnest money addendum when the deposit goes to title), an addendum version that doesn't match its REPC, an addendum signed by only one of two buyers, blank boxes that matter, payment lines that don't add up to the price, the same money written in two places, terms that conflict between the contract and an addendum, a letter that doesn't match the offer's loan type, price or dates, and an offer already past its own acceptance deadline. Never say whether an offer is valid.

## 4. Build the Side-by-Side Table

One column per offer; every row from `references/comparison-guide.md` section 2, with the Utah section from that offer's form. Cover: price; seller concessions; price after concessions; buyer-brokerage contribution as written (with dollars at that price); other seller-paid amounts with a cap (home warranty, FHA or VA appraisal repairs, termite); price less seller-paid amounts written in the offer; earnest money (amount, holder, delivery date); walk-away windows (the last date the buyer can cancel with the whole deposit back for any reason, on a low appraisal, and on the sale-of-home condition, plus the dollars the seller keeps on a financing cancellation); loan type and down payment; appraisal condition and any gap coverage; financing condition; Seller Disclosure, Due Diligence, appraisal, financing and Settlement deadlines (each a date with its weekday and days after the expected Acceptance); sale of the buyer's home; escalation; inclusions and exclusions; possession or rent-back; other addenda; the letter (lender, date, expiration, program, maximum, what was verified, conditions); offer expiration with time left.

- Do all arithmetic and date counts in code, and check every "highest," "lowest" or "only" claim against all offers before writing it.
- Settlement and possession dates against the seller's must-have dates, including the day they can move into their next home: say which offers fit, and where possession at Recording would have the sellers out well before then, say so and note the later-possession or rent-back question. When the seller's date is a closing, funding or move date, show the latest Closing too: on both Utah forms, funding and Recording can come up to four calendar days after Settlement (2024 form 3.2, 2026 form 9.2); elsewhere, take it from the form.
- Check each offer's acceptance deadline against the expected Acceptance date. Any offer that lapses before that date goes in the flags, with a question asking its agent for a written extension.
- **Net:** without a net sheet, no listing commission, title, escrow, payoff or proration math. Show the price less seller-paid amounts written in the offer, labeled "not a net," and suggest asking title for a net sheet on the finalists. With a net sheet, follow `references/comparison-guide.md` section 5.

## 5. Do the Escalation Math From the Clause Text Only

Follow `references/comparison-guide.md` section 4. Quote the clause's trigger, increment, cap, which offers count, what it measures against (purchase price or a defined net), the proof required and any appraisal terms. Compute the escalated price against every competing offer exactly as the clause defines it, with the math shown, and check it against the cap and the buyer's letter maximum. Where the clause is unclear or two clauses point at each other, show each reading and send it to the broker. Never rewrite the clause or draft one. Whether and how to share a competing offer as proof goes to the broker.

## 6. Read Certainty Against Price

For each offer, list what raises or lowers the chance it closes on time, from the documents only (`references/comparison-guide.md` section 3), and give it a plain call (higher, middle or lower certainty within this set) with the reasons. Then rank against the seller's stated priorities and name the top two, the dollar difference between them (price after concessions, and the seller-paid amounts), and what the seller gives up in certainty, dates or possession to take the higher number. No guarantees of closing, appraisal or loan approval.

## 7. Draft Questions, Counter Options and the Seller Email

- **Questions for each buyer's agent:** two to five per offer, from the gaps, the letter and the terms (`references/comparison-guide.md` section 7). Never share one buyer's terms with another without the seller's approval and broker guidance.
- **Counter options:** read `references/comparison-guide.md` section 6 (and in Utah the multiple-offer notes in `references/utah-offer-comparison.md`). Lay out accept as written, counter one offer (name the terms, with [amount] or [date] wherever the seller hasn't decided), a highest-and-best round, backups, and reject, with what each gains and risks and what happens to the other offers. Counters to more than one buyer at once go to the broker first. No counter price of your own, and no clause text: requested changes in plain words for the approved form. End with a [Seller's decision] line.
- **Highest-and-best note**, only when the agent says the seller chose that round: a short note to the buyers' agents that the seller has received multiple offers and invites each buyer's highest and best by [time and date], with nothing about any other offer's price, terms or buyers. It goes out only with the seller's approval, on the brokerage's multiple-offer form when it uses one.
- **Seller email:** in the agent's voice. Follow the user's voice profile when one is in the conversation (a Project's instructions such as the "My Voice" project from amplifiedimpact.io/voice-profile, their preferences, or a voice skill); without one, warm, plain, direct. A Title Case subject, such as "Your Offers On 123 Main St, Side By Side"; a bolded bottom line with the top two and the decision deadline; a short table of each offer's price, price after concessions, financing and Settlement Deadline; what separates the top two; the options; what I need from you and by when. Offers by letter, not buyer names. No buyer letter content or buyer personal details, no loan or account numbers, no promises, and no claim that a request already went out ("I'll ask," not "I've asked"). Under 400 words, short paragraphs, none of "stunning," "dream home," or "don't hesitate to reach out." Sign with the agent's name or [Agent Name].
- With a Gmail connector and the agent's ask, save the email as a draft. Never send.

## 8. Guardrails

- Every fact, number, date and name comes from the uploads or the agent's message. No invented comps, appraisal values, closing costs, commissions or market statistics. Unclear or illegible: say so and use a placeholder.
- The seller decides; the skill compares and ranks. Not the lender, appraiser, attorney, title officer or broker: loan questions to the buyer's lender through the buyer's agent, contract validity and non-standard language to the broker, legal questions to a real estate attorney, net figures to title.
- Loan programs cap seller concessions: the buyer's lender confirms the amount. Never state a cap.
- Dates are for strategy: label them "For strategy; confirm dates with your transactions team."
- Fair housing: compare terms, never buyers. No comments on who the buyers are, their families, background or reasons for moving. Buyer letters and photos stay out of every part of the output.
- Privacy: leave out loan, account and Social Security numbers, account balances beyond what the comparison needs, credit scores and income. Never ask for, repeat or handle wire instructions or account or routing numbers.
- No em dashes. Drafts only: never send, post, or write to a CRM.

## 9. Output, In This Order

1. **Flags**, only when they apply: practice run, missing letters or pages, signatures, set-aside letters and photos, form versions, general mode, placeholders, an offer expiring within 24 hours, already lapsed or lapsing before the expected Acceptance date
2. **Bottom line for the agent** (three sentences max): the top two offers for the seller's priorities and why, the dollar difference, and the response deadline
3. **The offer set:** one line per offer: letter, buyer names, buyer's agent, form version, pages, letter attached, acceptance deadline
4. **Side-by-side table**
5. **Escalation math**, when any offer escalates
6. **Certainty versus price:** each offer's factors and call, then the ranking and the trade between the top two
7. **Gaps to resolve with your broker**
8. **Questions for each buyer's agent**
9. **Counter options**, then the highest-and-best note when the seller chose that round
10. **Seller email**
11. **Check before sending:** every price, dollar amount, percentage, date, day count and section number in items 2 through 10, with the offer, file and page to check it against, plus every placeholder
