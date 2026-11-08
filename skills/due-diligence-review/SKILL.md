---
name: due-diligence-review
description: Reviews a buyer’s due diligence documents on a Utah home purchase (home inspection report, Seller Property Condition Disclosure, HOA documents, radon or sewer scope reports, title commitment) and turns them into one risk summary, a draft objection list the agent approves before the Due Diligence Deadline, and a plain-English email to the buyer. Use this whenever a buyer’s agent uploads or mentions an inspection report, seller disclosures, CC&Rs, an HOA budget or reserve study, a radon or sewer scope result, or asks what to ask the seller to fix, what to object to, or whether an inspection finding is a big deal, even if they never say “due diligence.” Buyer side only. Not for a listing agent responding to a buyer’s objection.
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Due Diligence Review

Turn the due diligence stack into three things the buyer's agent can act on today: what actually matters, what to ask the seller for, and what to tell the buyer. The agent makes every call. This skill does the reading, sorting, and drafting.

Why it matters: under the Utah REPC, the buyer has to cancel or deliver a written objection by 5:00 PM Mountain Time on the Due Diligence Deadline, or the due diligence results are treated as approved. Real problems hide deep in long inspection reports and HOA packets, and those documents usually arrive with only days to spare.

The contract mechanics here are Utah-specific. If the property is outside Utah, say so, skip the timeline section, and review the documents only.

## 1. Gather the Documents

Work from whatever is uploaded. The typical set:
- Home inspection report (required; if it's missing, ask for it and stop)
- Seller Property Condition Disclosure
- HOA documents: CC&Rs, bylaws, rules, current budget, reserve study, recent board minutes, payoff or resale information
- Specialty reports: radon, sewer scope, roof, structural, HVAC, mold
- Commitment for Title Insurance
- The signed REPC and any addenda (for the Due Diligence Deadline and any changed timing)

Never ask the agent to type something a document already contains. If the Due Diligence Deadline isn't in an upload or the agent's message, keep going, use [Due Diligence Deadline] as a placeholder, and flag it at the top of the output.

If the agent mentions the buyer's plans (renting the home out, finishing the basement, parking an RV or trailer, running a business from home), check the findings and HOA rules against them. Don't ask for plans that weren't offered.

For long documents, read the inspector's summary first, then the full report section behind every summary item, then scan the rest for findings the summary left out, because inspectors sometimes put significant items only in the body. In HOA packets, start with the budget, the reserve study, the last 12 months of minutes, and the leasing and use sections of the CC&Rs and rules.

## 2. Build the Issue List

Read `references/review-guide.md` for the severity tiers and what to look for in each document type.

For every finding, capture:
- What the document says, quoting the inspector where exact wording matters, with the page or section
- Tier: 1 Safety and Health, 2 Major System or Structure, 3 Repair and Maintenance, 4 Informational
- Recommended action: ask the seller (repair, credit, or price), get a licensed specialist's evaluation, or note only
- Cost, only if a document states one. Otherwise write "needs bid." Never estimate a cost.

Keep the inspector's own severity rating when they give one. If you rank an item differently, say why in one line.

## 3. Cross-Check the Documents Against Each Other

This is where the review earns its keep. Look for:
- The disclosure says no known issue, but the inspection shows evidence of one (water staining, patched drywall, signs of prior repair). Frame it as a question for the listing agent, never an accusation. Sellers often don't know.
- Ages or conditions of major systems that conflict between the listing, the disclosure, and the inspection
- "Further evaluation recommended" items that haven't been done and could still fit before the deadline
- No radon test on file. Flag it: Utah DEQ reports that roughly 1 in 3 tested Utah homes come in above the EPA action level, so the buyer should consider testing.
- HOA rules that conflict with the buyer's stated plans
- Title commitment exceptions that look unusual (unreleased liens, judgments, easements across the usable lot). Flag these for the title officer; don't interpret their legal effect.

## 4. Draft the Objection List

Read `references/objection-writing.md` before drafting.

- **Recommended ask:** Tier 1 items and the Tier 2 items worth negotiating. A short list of real issues gets better responses than a long list that includes every loose outlet cover.
- **Held back:** everything else, each with a one-line reason, so the agent can move items between the lists.
- Write each item so it's specific, tied to a report page, and asks for one remedy: a repair by a licensed contractor with paid invoices before settlement, a seller credit, or a price reduction. Use neutral language that can go straight into the team's objection form or addendum.
- If you suggest a credit, note that loan programs cap seller concessions and the agent should confirm the amount with the buyer's lender. Don't state the caps.

## 5. Lay Out the Timeline

Read `references/utah-repc.md`, then show:
- Calendar days left from today until the Due Diligence Deadline (5:00 PM Mountain Time)
- The negotiation window if the objection is delivered on a given date: the Response Period end and the end of the buyer's cancellation window, computed from the uploaded REPC or the standard terms
- A note on every date: "Confirm against the signed REPC with the transactions team." The transactions team owns the official calendar. This timeline is for negotiating strategy only.

If the deadline is within 48 hours, put that first, in bold. If the deadline has passed, don't draft an objection as if it were timely. Tell the agent to talk to their team leader and the transactions team right away, because the due diligence condition may already be treated as approved.

## 6. Write the Buyer Email

Write as the agent, in first person. Warm, calm, and specific: no alarm, no minimizing.
- Subject line in Title Case, such as "Inspection Results And Next Steps For 123 Main St"
- Open with a bolded bottom line: the overall read, plus the decision the buyer needs to make and by when
- **What Needs Attention:** Tier 1 and 2 items in plain English, one or two sentences each
- **What's Normal For A Home This Age:** Tier 3 and 4 summed up in a sentence or two, not listed
- **Next Steps:** numbered, each with the date it's needed by
- Keep it under 300 words
- Don't tell the buyer whether to buy. Lay out the options: proceed as is, ask for repairs or a credit, or cancel by the deadline.
- Sign with the agent's name if you know it; otherwise use [Agent Name]

## 7. Guardrails

- Every fact comes from the documents. No invented findings, costs, page numbers, or dates. If something is unclear or illegible, say so.
- This skill isn't the inspector, a contractor, an attorney, or the lender. Don't diagnose past what the report says. Send health questions (radon, mold) to certified professionals, legal questions to the title officer or a real estate attorney, and loan questions to the lender.
- Fair housing: describe the property and the documents, never the people who live in the community or who the home would suit. No comments on neighborhood demographics, school quality, or safety.
- Leave out the seller's personal information, loan numbers, and account numbers.
- Drafts only. If a Gmail connector is available and the agent asks for a draft, create a draft. Never send.

## 8. Output, In This Order

1. **Bottom line for the agent** (three sentences max): the overall read, the count of Tier 1 and 2 items, and the days left to the deadline
2. **Issue list**, grouped by tier (Tier 4 can be a one-line count unless the agent asks for detail)
3. **Questions for the listing agent**, from the cross-check
4. **HOA findings**, only if HOA documents were provided
5. **Draft objection list:** recommended ask first, then held back
6. **Timeline**
7. **Buyer email**
8. **Check before sending:** every date, dollar amount, page reference, and quoted finding in items 5 through 7, for the agent to verify against the documents
