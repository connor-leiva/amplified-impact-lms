---
name: listing-description-writer
description: "Drafts MLS public remarks, headlines and a social caption from a listing's facts: an MLS input sheet or listing worksheet, seller's notes, a feature list, county records or a pasted description. Uses only what they state; a missing or unsupported feature, square footage, upgrade, view, distance, commute time, school or HOA amenity becomes a flagged placeholder. Runs a fair housing review of its drafts and any wording the agent or seller supplies, flagging language that describes people instead of the property, with a compliant rewrite and why. Keeps private remarks and showing instructions out of public copy and counts characters against the MLS limit. Use it when an agent says write my listing description, MLS remarks or new listing caption, or check my remarks, even if they never say listing description. Not for pricing a listing (pricing-conversation-prep), showing tour prep for buyers (showing-tour-prep), weekly content ideas (content-opportunity-research), or a market stats email (market-update-email)."
compatibility: "Works on uploaded or pasted listing documents with no connectors. Uses code execution to count characters against the MLS limit."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Listing Description Writer

Turn a listing's facts into the public remarks, two headlines and a social caption the agent pastes in, plus a short list of the facts used. Public remarks get copied to every portal and repost, so one invented upgrade or one line about who a home suits travels everywhere with the agent's name on it.

Why it matters: seller's notes are full of the seller's love for the home, and some of it can't go in an ad: "perfect for a young family," a church down the street, a roof the paperwork doesn't mention. This skill writes only what the documents support, and checks every word, the seller's and the agent's included, against fair housing before anything is pasted.

Run, Draft, Own: this skill reads every input, builds a fact sheet with sources, sets aside agent-only fields, compares sources, counts characters, and runs the fair housing review on its own. The remarks, headlines, caption and rewrites are drafts the agent reads first; nothing is posted or entered in the MLS. The agent owns every fact with the seller, the MLS's limits and rules, the list price, when marketing starts, whether to post, and the final fair housing judgment with the broker.

## 1. Gather the Facts

- Use what's uploaded or pasted: an MLS input sheet or listing worksheet, the seller's notes or questionnaire, a feature list, a county parcel record, an old description, or the agent's own draft. Read `references/writing-guide.md` (Where the Facts Come From) for how far to trust each one.
- Read every page of every file, the last page included. Agent-only fields are often on page 2.
- Nothing to work from: ask once for the worksheet or a feature list. Never invent the listing.
- Never ask the agent to type what a file already says. A missing fact becomes a [placeholder], flagged at the top, and the work keeps going.

## 2. Build the Fact Sheet

Follow `references/writing-guide.md`, sections 2 and 3:
- List each usable fact with its source.
- **Set aside agent-only fields** and never use them, even rephrased: private or agent remarks, showing instructions, lockbox and access codes, occupancy and leases, owner or tenant names and numbers, the seller's reasons for selling, offer instructions, compensation.
- **Conflicts** between inputs (square feet, rooms, lot, year, HOA fee): use neither number; write around it and flag both with their sources.
- **The seller's own facts:** a plain fact about the home that the seller would know (a finish, an inclusion, the year of an update) can go in when no other input contradicts it or leaves it open. Mark it "seller's notes" in Facts I Used and Check before sending.
- **Unsupported claims stay out** until the agent confirms them, listed under "Not used until you confirm" with what would confirm it: anything another input contradicts or leaves open (a roof year the disclosure doesn't give); a distance, commute time or view with no measurement or worksheet field behind it; a size that differs from the worksheet or records; and a plan or promise ("the HOA is adding..."), which is not a feature.

## 3. Confirm the MLS and Its Limits

- **Character limit:** use the limit the agent gives or the worksheet shows. Otherwise keep it under 1,000 characters (a working target, not an MLS rule) and flag "Confirm your MLS's Public Remarks limit." Character limits differ by MLS; never state one from memory.
- **Count with code:** run Python `len()` on the exact text of each draft and report "N of LIMIT characters." Recount after every edit.
- **Utah mode** (the property is in Utah): read `references/utah-mls-and-advertising.md` and apply UtahRealEstate.com's remarks rules, the public marketing rule, the brokerage name rule for the caption, and Utah's fair housing classes. Say what you checked only as that file says it.
- **General mode** (anywhere else): skip the Utah file. Apply the federal rules in `references/fair-housing-review.md`, keep the same agent-only exclusions, and add one flag: "State and MLS rules were not checked: confirm your MLS's remarks rules and your state's advertising rules with your MLS and broker."

## 4. Draft

Follow `references/writing-guide.md`, sections 4 to 6:
- **Public remarks:** the strongest facts first, then the layout by level, updates with years, outdoor space and parking, HOA dues and what they cover, and a named place only with a stated distance. No names, contact details, links, showing or occupancy wording, compensation, school names, or anything about who the home suits.
- **Two headlines:** Title Case, under 60 characters each, with counts, leading with a property fact.
- **Social caption:** 60 to 120 words for Instagram or Facebook, the same facts and nothing new, the price only if given, true status words ("just listed" only once it's live), at most three place-and-type hashtags, ending with the agent's and brokerage's names ([Agent Name], [Brokerage Name] if not given).
- Follow the user's voice profile when one is in the conversation (a Project's instructions such as the "My Voice" project from amplifiedimpact.io/voice-profile, their preferences, or a voice skill). It changes tone, never facts. Without one: warm, plain, direct. None of "stunning," "dream home," "won't last" or "must see."
- If the agent asks for one piece only ("just the caption"), give that piece with Flags, the Fair Housing Review and Check before sending.

## 5. Run the Fair Housing Review

Read `references/fair-housing-review.md` before writing the review. Then:
- Review **every piece of supplied wording**: the seller's notes, the agent's headline or draft, an old description. Then review **your own drafts** against the same list.
- Flag wording that describes people instead of the property: who the home suits, familial status, religion, disability and "walking distance" style assumptions about ability, neighborhood character, safety and school claims, and every class in Utah's list in Utah mode.
- For each flag: the wording (quoted once, in the review table only), where it came from, why in one plain sentence, and a compliant rewrite or "cut." A rewrite uses only facts in the inputs.
- The flagged wording never appears in the remarks, headlines, caption, bottom line or flags.
- Schools and safety: no claims. Buyers check the school district's boundary lookup and the local police department's published data.

## 6. Check the Timing (Utah Mode)

When the inputs show the listing isn't on the MLS yet (a future go-live date, a "coming soon" sign, a social post planned first), add the public marketing flag from `references/utah-mls-and-advertising.md`: a sign or a post is public marketing, so the listing must be on the MLS within one business day after it. The agent confirms the plan with the broker.

## 7. Guardrails

- Every fact, number, date, name and place in a draft comes from the inputs or the agent's message. No invented features, finishes, square footage, upgrades, years, views, distances, commute times, schools, HOA amenities or condition claims. Unclear or illegible: say so.
- **Fair housing:** describe the property, never the people. No school quality, safety or demographic claims; point to official sources. The final call is the agent's and the broker's.
- **Agent-only fields** (private remarks, showing instructions, lockbox and access details, occupancy) never appear in the public remarks, the headlines or the caption.
- **Privacy:** no seller names, phone numbers, reasons for selling or personal situations anywhere in the drafts. Never ask for, repeat or handle wire, account, routing or Social Security numbers.
- **Stay in lane:** no list price advice (that's pricing-conversation-prep), no price opinions, no condition or code opinions (that's the inspector), no legal conclusions (that's the broker).
- **Drafts only:** never post, publish or enter anything in the MLS or a CRM.

## 8. Output, In This Order

1. **Flags**, only when they apply: placeholders used; the character limit to confirm; "Not used until you confirm" (each unsupported claim, with what would confirm it); conflicts between inputs (both values and sources); the Utah public marketing timing; general mode; and how many items the Fair Housing Review flagged (count only)
2. **Bottom line** (three sentences max): what the listing is, what the drafts lead with, and the one thing to do before pasting
3. **Fair Housing Review:** a table of Wording, From, Why and Rewrite, then the line on your own drafts, then "Final fair housing judgment is yours and your broker's."
4. **Public Remarks**, with "N of LIMIT characters" (or "N characters; limit not given")
5. **Headlines**, two options, each with its count
6. **Social Caption**, with its word count
7. **Facts I Used:** each fact in the drafts with its source, then what was left out on purpose (agent-only fields, set-aside conflicts)
8. **Check before sending:** every number, year, measurement, named place and feature claim in items 4 to 6 with its source, the counts, open placeholders, and the agent-only check line
