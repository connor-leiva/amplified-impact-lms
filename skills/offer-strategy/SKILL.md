---
name: offer-strategy
description: "Turns a listing's MLS sheet (status, days on market, price history), a CMA or comp export and an optional preapproval letter into recommended offer terms for a buyer: price from the comps, earnest money, due diligence, appraisal and financing deadlines, settlement, appraisal and financing protection, concessions, sale-of-home condition, escalation and possession, plus a risk ledger, listing agent questions and a buyer email. Reads both Utah REPC versions; general mode elsewhere. Use it whenever a buyer's agent asks what to offer, how far over or under list, how to win a multiple-offer or highest-and-best situation, whether to waive the appraisal or add earnest money, or uploads an MLS sheet and comps for their buyer, even if they never say offer strategy. Buyer side, before the offer. Not for a listing price (pricing-conversation-prep), offers a seller received (offer-comparison), a counter or addendum (counter-explainer), tour prep (showing-tour-prep) or a low appraisal (low-appraisal-response)."
metadata:
  author: Amplified Impact
  version: "1.0"
compatibility: "Works from uploaded files; no connector needed. Uses code execution (on by default) for the comp math on CSV exports and the date math. Gmail is optional, only to save the buyer email as a draft when asked."
---

# Offer Strategy

Turn a listing's MLS sheet, the comps and the buyer's preapproval letter into an offer the buyer's agent can explain line by line: a price the closed sales support, terms that fit how competitive this listing really is, and the risk behind every term that gives the seller more. Buyers lose homes by guessing low and lose deposits by waiving protections they didn't understand; this puts both trades in plain numbers before the buyer signs.

**Run, Draft, Own.** You read the MLS sheet, its price history, the comps and the letter, do the comp and date math, and sort the listing's signals. The term table, risk ledger, questions for the listing agent and buyer email are drafts the agent reads and changes first. The buyer decides the price and every term; the agent owns the advice and every money conversation; the lender confirms cash, concessions and loan timing; the broker approves escalation or any non-standard language. Wire instructions, loan and account numbers are never asked for, repeated or handled.

## 1. Gather the Inputs and Pick the Mode

- **Required:** the listing's MLS sheet with status, list date, days on market and price history (in Utah, the Agent Full Report plus the Property Activity Report from its History link), and a CMA or comp export with sold prices and close dates. With no solds, recommend the terms, put [price: needs sold comps] in the price line, flag it, and ask for a CMA.
- **Helpful:** the preapproval letter or proof of funds; anything the agent says about the listing agent's instructions (offer deadline, highest and best, preferred dates, rent-back) and the buyer's limits (top price, cash, a home to sell, must-move date).
- Read every file in full. Use what the agent says; never ask them to retype what a file holds. Anything missing gets a [placeholder], a flag at the top, and the work keeps going.
- **Pick the state** from the listing's address. In Utah, read `references/utah-offer-terms.md`, then `references/utah-repc.md` and `references/utah-forms-and-counters.md` where it points. Elsewhere, run **general mode**: name terms generically ("inspection or due diligence period," "appraisal contingency"), no Utah sections or notes, and put "State rules not checked for [state]; confirm terms with your broker and use your state's purchase contract" in the flags.
- **Pick the Utah form** the offer goes on: the December 4, 2024 REPC or the November 1, 2026 REPC (only the 2026 form from January 1, 2027). If the agent doesn't say, show both section numbers per term and ask.

## 2. Read the Listing's Position

Read `references/offer-terms.md` (section 1) and `references/comp-method.md`. From the files and the agent's message only:
- Days on market (cumulative when shown) against this comp set's median for solds
- Every price change, with dates and the total cut from the original list price
- Status history (back on market, relisted), seller-paid items in the public remarks, and the offer instructions the agent relayed
- Agent-only remarks: use them for strategy in agent-facing sections only

Call it **Competitive**, **Balanced** or **Buyer Leverage**, with the signals behind it. Never invent other offers or the seller's reasons.

## 3. Price It From the Comps

Follow `references/comp-method.md` (in Utah, also `references/utah-pricing-context.md`):
- Pick the three to five closest solds; compare above-grade and basement square footage separately; show concessions and price after concessions; bracket the listing; label older or farther sales and leave out outliers with a reason.
- Give the supported range, then one recommended offer price with the reasoning, tied to the listing's position. Place the list price and the offer against the range in plain numbers.
- Never recommend above the buyer's stated maximum or the letter's maximum. If the supported range sits above either, say so in the bottom line.
- **Appraisal check:** the dollar gap between the offer and the highest closed sale that supports the range, labeled a reference point, not a prediction.

## 4. Recommend Every Term

Read `references/offer-terms.md` (section 3) for each term. Give a table: term, recommendation, why, and (Utah) the section on the agent's form. Cover price; earnest money; due diligence length; the seller disclosure deadline; appraisal and financing deadlines (one date on the 2024 REPC, two on the 2026 REPC); settlement; possession; appraisal protection; financing protection and the earnest money at risk if the buyer cancels for financing; seller concessions (with price after concessions); sale of the buyer's home; escalation if used; and, when they apply, the FHA/VA appraisal-repair amount, lead-based paint (pre-1978), home warranty and the offer deadline.

- Express deadlines as calendar days after Acceptance. If the agent gives an expected Acceptance date, also give the dates, with the weekday. Label the set "For strategy; confirm dates with your transactions team."
- Earnest money, concession amounts and lender days come from the inputs. If they aren't there, use [earnest money amount], [concession amount from lender] or [days from lender]; never a "typical" number.
- **Appraisal and financing protection:** never recommend waiving either without the dollar risk and the line "Your lender must confirm the cash before you decide." Don't recommend a waiver at all when the letter shows too little cash to cover the gap. On FHA or VA, explain that the required amendatory clause (in Utah, the FHA/VA Loan Addendum) keeps the buyer's right to walk if the price exceeds the appraised value, so it is not an appraisal waiver.
- **Escalation:** only when the agent reports competing offers or asks. The buyer gives the starting price, increment and cap; the cap stays at or below both maximums. In Utah there is no state form: the language comes from the brokerage's approved addendum and the broker reviews it. Never draft escalation or appraisal-gap clauses.
- **Sale of the buyer's home:** if the buyer needs it, keep it and show what it costs in competitiveness.
- On the 2026 REPC, say which Section 3 boxes to check: an unchecked condition doesn't apply.

## 5. Build the Risk Ledger

One row for each term that is more competitive than the protective version: what it gives the seller, what it risks for the buyer in plain English with dollars from the inputs (math shown), and who confirms (lender, inspector, broker). Read `references/offer-terms.md` (section 4).

## 6. Draft Questions for the Listing Agent

Five to eight, from `references/offer-terms.md` (section 5), chosen for this listing. Never reveal the buyer's maximum, cash or reasons, and never ask about the seller's personal life beyond timing.

## 7. Write the Buyer Email

Write as the agent, in first person. Follow the user's voice profile when one is in the conversation (a Project's instructions such as the "My Voice" project from amplifiedimpact.io/voice-profile, their preferences, or a voice skill). Without one: warm, plain, direct.
- A Title Case subject, such as "Offer Plan For 123 Main St"
- A bolded bottom line: the recommended price, the terms that matter most, and how competitive the offer is
- **What The Sales Show:** two or three closest sales, plainly
- **The Terms I Recommend:** a short list with one reason each
- **What Each Choice Risks:** the risk ledger in two or three sentences per competitive term
- **What I Need From You:** numbered decisions, each with the time it's needed by
- One line advising against a personal letter or photos with the offer, without saying why in a way that names any group
- No promise of acceptance, appraisal or closing. Under 350 words, short paragraphs, none of "stunning," "dream home," or "don't hesitate to reach out." Sign with the agent's name or [Agent Name].
- Leave out agent-only remarks, lockbox or showing details, the seller's reasons from private remarks, loan or account numbers, and the buyer's reserves.

## 8. Guardrails

- Every fact, number, date and name comes from the uploads or the agent's message. No invented comps, offers, seller motives, market statistics, deadline norms or costs. If something is unclear or illegible, say so.
- The buyer decides; the skill recommends. No guarantees of acceptance, appraisal, loan approval or closing.
- Not the lender, appraiser, inspector, attorney or broker: route loan and cash questions to the lender, contract language to the broker, legal questions to an attorney.
- Fair housing: describe the property, the documents and the terms, never people. No comments on who a home suits, neighborhood demographics, school quality or safety; point to official sources. Advise against buyer letters and photos; never draft or quote one, and leave anything about the buyer's family, faith or background out of every part of the output.
- Privacy: loan, account and Social Security numbers, credit scores, income and balances stay out. Agent-only MLS fields never appear in client-facing text.
- No em dashes. Drafts only: never send, post, or write to a CRM. With a Gmail connector and the agent's ask, save the buyer email as a draft.

## 9. Output, In This Order

1. **Flags**, only when they apply: placeholders, general mode, which REPC form (or both), an expired or mismatched letter, a price above the buyer's maximum
2. **Bottom line for the agent** (three sentences max): the recommended price, the three terms that matter most, and how competitive the offer is
3. **Where the listing stands:** the signals and the position call
4. **Price:** closest comps table (with what was left out and why), this comp set's numbers with the math, the supported range, the recommended price, the appraisal check
5. **Recommended terms:** the table, with the dates block labeled for strategy
6. **Risk ledger**
7. **Questions for the listing agent**
8. **Buyer email**
9. **Check before sending:** every price, dollar amount, percentage, date, day count and section number in items 2 through 8, traced to its file or the agent's message, plus every placeholder
