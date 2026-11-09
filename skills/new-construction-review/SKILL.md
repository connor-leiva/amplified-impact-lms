---
name: new-construction-review
description: Reviews a home builder's purchase agreement for the buyer's agent before the buyer signs. Reads the contract, addenda (incentive, options, deposits, lot reservation) and any plat, HOA or district documents, then returns the top three risks, a money-at-risk table showing when each payment turns nonrefundable, every key term as written (completion, inspections, warranty, arbitration, financing, incentives, districts, registration), what the form lacks next to the Utah REPC, questions for the builder's rep, attorney items and a buyer email. Use it whenever an agent uploads a builder contract or incentive addendum, or asks what to flag before signing on a new build, to-be-built, spec or quick move-in home, a lot hold, builder deposits, a builder incentive or preferred lender, even if they never say new construction. Buyer side. Not for offer terms from comps (offer-strategy), an inspection report (due-diligence-review), a counter on a REPC (counter-explainer) or a low appraisal (low-appraisal-response).
compatibility: Works from uploaded PDFs (builder purchase agreement, addenda, incentive terms, plat, HOA or special district documents); no connector needed. Claude skills run with code execution on, which is on by default for individual plans. Gmail is optional, only to save the buyer email as a draft when the agent asks.
metadata:
  author: Amplified Impact
  version: "1.0"
---

# New Construction Review

A builder's purchase agreement is the builder's own contract, written by its attorneys. It is not the REPC, so the protections a buyer counts on in a resale deal are there only if the builder wrote them in. This skill reads every page, puts the money at risk and the dates in one place, compares the form with the state REPC, and drafts the questions and the buyer email, so the agent walks into the signing with the real terms in plain English.

Why it matters: deposits can go straight to the builder and turn nonrefundable in steps, incentives can hinge on the builder's lender and a closing date, and a lot can sit inside a special district whose tax shows up only in a plat note or the title commitment. Most of this can't be fixed after the buyer signs.

Run, Draft, Own: the skill reads every document in full, builds the money table, does the date and dollar math and compares the form on its own. The questions for the builder's rep, the attorney list and the buyer email are drafts the agent reads first. The buyer and agent own whether to sign, every dollar and option choice, the lender choice and every money conversation; contract changes go to a real estate attorney, loan questions to lenders, title and district questions to the title company. Wire instructions and account numbers are never asked for, repeated or handled.

## 1. Gather the Documents and Pick the Mode

Work from the uploads. The usual set:
- The builder's purchase agreement (required; if it's missing, ask for it and stop)
- Every addendum and exhibit: incentive or promotion, option or design selections, deposit schedule, lot reservation, community or HOA disclosure, Affiliated Business Arrangement Disclosure, warranty booklet, broker participation or registration policy
- Optional: the recorded plat or plat notes, CC&Rs, HOA budget, a special district or public infrastructure district (PID) notice, the title commitment
- From the agent's message: the buyer's plans, anything the sales rep promised, the lender the buyer wants, when the buyer was registered. Use what's offered; don't ask for it.

Never ask the agent to type what a document contains. If a date or amount is missing, use a [placeholder], flag it at the top and keep going. List every document the contract refers to that wasn't uploaded (warranty booklet, CC&Rs, disclosures).

Pick the mode from the contract or the address:
- **Utah mode:** read `references/utah-new-construction.md`. Compare against the November 1, 2026 REPC (`references/utah-repc-2026.md`), the form required from January 1, 2027, unless the agent says the brokerage still uses the December 4, 2024 form (`references/utah-repc.md`). Use one form's section numbers only. Read `references/utah-property-notes.md` for PIDs, water, HOA rental rules and reinvestment fees.
- **General mode (any other state):** skip every utah-* file and say near the top: "State rules were not checked; this follows the uploaded contract only." Compare against the standard protections list in `references/review-guide.md`. Federal notes (RESPA, ILSA, loan program rules) apply in every state.

Name the build stage: to be built, under construction (which stage) or completed (spec, quick move-in). It decides which inspections are still possible and how close the dates are.

## 2. Read the Contract Term by Term

Read `references/review-guide.md` for the reading order, the checklist and what to watch for in each term. Read every page: builders put deposit, warranty, claim-deadline and arbitration terms deep in the body and in exhibits, and an addendum's conflict clause can override the body.

For each key term, capture what the contract says, quoting where wording matters, with the page and section: price and anything that can change it; deposits and when they become nonrefundable; completion timeline, extensions and delay remedies; change orders and upgrade payments; inspection rights (pre-drywall and final, by a third-party inspector); walkthrough and punch list; warranty terms as written; dispute resolution; financing and appraisal terms; incentives and their conditions; HOA and CC&Rs; special districts or assessments; buyer agent registration rules; default remedies on both sides. Write "Not addressed" when the contract is silent; that is a finding too. Never call a term standard, typical, illegal or unenforceable.

## 3. Build the Money-at-Risk Table

List every payment before closing: earnest money, deposits, lot premium deposits, option or design payments, change order payments and fees. For each: amount, when it's due, who holds it (title escrow, a brokerage trust account or the builder), when it turns nonrefundable and what gets it back. Check each refund clause (builder default, builder cancellation, loan denial) against the contract's own terms: if it returns only "deposits" while option or design payments are named separately, write "Not clear" for those payments and put it on the attorney list. Add the running total at risk at each step, with the math shown, computed in code. If the builder holds the money and may spend it on construction, say so plainly. Never estimate an amount the documents don't state.

## 4. Describe Lender-Tied Incentives

Read `references/lender-incentives-respa.md`.
- State the incentive amount, what it may pay for and every condition: lender, title or escrow company, application deadline, closing date, what happens if the buyer switches lenders, and any forfeiture of an unused amount.
- Show the dollar difference between meeting and not meeting the conditions, only from amounts the documents state, with the math.
- Check the RESPA points in the reference: is an Affiliated Business Arrangement Disclosure in the stack, does it name the relationship and estimated charges, does any document require a particular title company, and does the incentive read as optional. Write these as questions for the builder's rep and items for the attorney. Never conclude that anything violates RESPA.
- Describe, don't advise. Never say which lender to use, whether the incentive is worth it, or compare rates or loan costs. The buyer's lenders can lay out the full cost of each option side by side, and the lender confirms how much of the incentive the loan program allows.

## 5. Compare With the REPC (or the Standard Protections)

Use the comparison table in `references/utah-new-construction.md` (general mode: the list in the review guide). For each protection the builder form lacks or weakens, one line: what the REPC gives (with its section), what this contract says (with its page), and what it means in dollars or days. Builders may use their own counsel-prepared forms, so present gaps as things to understand or ask about, not terms the builder must accept.

## 6. Review the Lot, the HOA and Any Special District

- From the plat, the title commitment or a district disclosure: the district's name, its maximum levy, any current levy or annual amount, fees and bonds, each with its page. Never estimate a tax. In Utah mode, apply the PID notes, including the annual cost disclosure due at or before closing, and say to ask for it now.
- HOA: dues, setup or capitalization fees, any reinvestment fee, the builder's control of the board and when it ends, rental and use restrictions, landscaping or architectural deadlines.
- Plat notes: easements, soils or geotechnical notes, drainage, canals, water service. Report them as written and route them to the builder, the title company or a licensed specialist.

## 7. Questions, Attorney Items and Key Dates

Read `references/drafting-guide.md`.
- **Questions for the builder's rep:** specific and tied to a page. Every promise the agent mentions that isn't in the documents becomes "please put this in the contract or an addendum."
- **For a real estate attorney:** each clause the buyer may want explained or changed, described in plain words. Never draft clause language. This is not legal advice.
- **Key dates:** from the documents only, labeled "For strategy; confirm dates with your transactions team." Count calendar days from today. If the signing or lot hold deadline is within 48 hours, put it first, in bold.
- **Registration:** the builder's rule as written, whether the agent's message shows it was met, and the compensation terms as written (no math). Check them against `references/buyer-agreements.md`: the brokerage can't take more than the buyer agreement allows.

## 8. Write the Buyer Email

Write as the agent, in first person. Follow the user's voice profile when one is in the conversation (a Project's instructions such as the "My Voice" project from amplifiedimpact.io/voice-profile, their preferences, or a voice skill). Without one: warm, plain, direct. Use the drafting guide's format: a Title Case subject, a bolded bottom line, the money at risk by step, what's different from a resale contract, the incentive's conditions, and numbered next steps with dates, including attorney review before signing. Under 350 words, short paragraphs, none of "stunning," "dream home" or "don't hesitate to reach out." Don't tell the buyer whether to sign or which lender to use. Sign with the agent's name if known; otherwise [Agent Name].

## 9. Guardrails

- Every fact, number, date and name comes from the uploads or the agent's message. No invented costs, taxes, dates, warranty terms or quotes. If something is unclear or illegible, say so.
- Not the attorney, the lender, the title officer, the inspector or the builder. No legal conclusions, no loan advice, no diagnosis past what a document says. Route by role.
- No guarantees about completion dates, price, appraisal, incentive approval or the builder's answers.
- Fair housing: describe the home, the lot and the documents, never the people in the community or who the home suits. No comments on demographics, school quality or safety; point to official sources.
- Privacy: leave out loan, account and Social Security numbers and personal financial details. If a document contains wire instructions, say only that it does and that wiring is confirmed directly with the title company; never repeat them.
- Drafts only. Never send, post or write to a CRM. With a Gmail connector and the agent's ask, create a Gmail draft.

## 10. Output, In This Order

1. **Flags**, only when they apply: a deadline within 48 hours (bold), placeholders used, general mode, referenced documents not uploaded, which REPC version the comparison uses
2. **Bottom line for the agent** (three sentences max): the top three risks, each with its dollar amount or date
3. **Documents reviewed:** one line each, with pages and dates, and the build stage
4. **Money at risk:** the table, with the running total
5. **Key terms:** term, what the contract says, page, and a flag where it matters
6. **Incentive and lender conditions** (when there is an incentive)
7. **What this form lacks next to the REPC** (general mode: next to the standard protections)
8. **Lot, HOA and special district**
9. **Questions for the builder's rep**
10. **For a real estate attorney**
11. **Key dates** (for strategy)
12. **Buyer email**
13. **Check before sending:** every date, dollar amount, page reference and quoted term in items 4 to 12, each with where to verify it
