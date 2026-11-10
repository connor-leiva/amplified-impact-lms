# AI Brain Tune-Up: Listing Writer (Quinn Exampleberg, Pretend Pines Realty)

Prompt: "Here's my Listing Writer project: the instructions, my custom style, the one knowledge file and my memory. It's mostly fine, I think. Tune it up."

Pieces received: Project instructions; Style: Quinn Casual (copied from the style itself); Knowledge: Seller Update Template (updated August 3, 2026); Memory, written out by Claude on November 9, 2026 (items M1 to M6). Run on November 10, 2026.

## Flags

1. **Private detail found:** one client's phone number, in memory (M6). It is flagged for removal below and not repeated anywhere in this tune-up.
2. **Compliance lines:** all three of yours are there (project instructions, lines 25 to 27) and stay word for word. No house lines were added.
3. **Voice profile kept:** your QUICK CARD (project instructions, lines 12 to 23) is copied into the rewrite character for character.
4. **One decision is yours:** formal or casual for client emails (finding 2). The rewrite holds a placeholder for it.
5. **Placeholders:** 1 in the rewrite, listed in Check Before Sending with its question.
6. **Your style:** Claude's help center no longer has a styles article (checked November 10, 2026), and styles may have become skills. If yours did, it's in Customize > Skills, with its own switch.
7. **Not received, so not checked:** Instructions for Claude (Settings > Your Claude > Instructions). A line there reaches this project too.
8. **App:** Claude.

## Bottom Line

This workspace is in good shape: 2 findings (1 privacy, 1 conflict), your three compliance lines and your QUICK CARD are all there, and the rewrite changes only the tone line and adds your CRM and transaction coordinator from memory. The one real problem is tone: your instructions say formal for all client emails while your Quinn Casual style says casual, so emails change with whether the style is on. Fix first: delete the memory item with your seller's phone number, then choose formal or casual and change the other piece to match.

## Findings

| # | Type | Exact line | Where it lives | Why it matters |
|---|---|---|---|---|
| 1 | Privacy | "Quinn is listing the Sampleton home on Example Bluff Drive. The seller, Kit Sampleton, wants calls only, at [client phone number removed]." | Memory, M6 | A client's phone number in memory can surface in any chat, inside this project or outside it. Client contact details belong in Follow Up Boss, not in the AI's memory. |
| 2 | Conflict | "Write in a formal tone for all client emails." against "Always write in a casual tone." | Project instructions, line 8; Style: Quinn Casual, line 1 (lines 2 and 3 pull the same way) | Both can't be followed, so client emails come back formal or casual depending on whether the style is on. Your QUICK CARD ("Short sentences. One idea each." and "Plain words over real estate jargon.") is neither formal nor casual, so it doesn't settle it: you decide. |

### Missing

| What's missing | Where I looked | Why it matters | Question for you |
|---|---|---|---|
| Your CRM and transaction coordinator, in the instructions | Found in memory: "Quinn uses Follow Up Boss." (M5) and "Quinn's transaction coordinator is Rory Fakewell." (M2) | Instructions are the one piece every chat in the project reads in full; memory can be paused or turned off for a chat. | None: moved into the rewrite from memory. Check both in Check Before Sending. |

## Ranked Fix List

1. **Delete the seller's phone number from memory** (finding 1). Settings > Your Claude, "Manage" next to Your memory, open the topic with the Sampleton listing, and select "Delete." Or, in a regular chat in this project with memory on, say "Forget the Sampleton listing details and the seller's phone number." Deleting a chat doesn't remove memory made from it, so delete the memory itself.
2. **Compliance:** nothing to fix. Your drafts-only, fair housing and texting lines (lines 25 to 27) stay word for word.
3. **Decide formal or casual** (finding 2).
   - Formal: fill the placeholder with "formal," then turn the Quinn Casual style off for client emails or reword its first line (in the style menu, or in Customize > Skills if it became a skill).
   - Casual: fill the placeholder with "casual" and leave the style as it is.
4. **Stale facts:** none found.
5. **Missing basics:** your CRM and transaction coordinator move into the instructions from memory. Check both names.
6. **Vague lines:** none found.

Then run the tune-up again next month, or sooner when drafts start drifting.

## Rewritten Project Instructions

Paste this into the project's instructions box ("Set project instructions"), replacing what's there, and click "Save instructions." Answer the [placeholder] first.

```text
# Listing Writer

I'm Quinn Exampleberg, a listing agent with Pretend Pines Realty in St. George, Utah. Most of my sellers are in Washington County.
Transaction coordinator: Rory Fakewell.
CRM: Follow Up Boss.

## Jobs
- When I paste a listing worksheet, write MLS public remarks under 1,000 characters, a headline and one Instagram caption.
- When I paste showing feedback, draft the weekly seller update email.
- Seller updates go out every Friday.

## How to write
- Write in a [formal or casual? These instructions say formal; your Quinn Casual style says casual. Pick one.] tone for all client emails.
- Use numerals for prices and square footage.
- Sign client emails: Quinn Exampleberg, Pretend Pines Realty

## My voice
QUICK CARD
Write as me. I'm Quinn, a listing agent in St. George who tells sellers the truth, kindly.
1. Lead with the one thing the seller needs to know.
2. Short sentences. One idea each.
3. Exact numbers: $489,000, not "under 500."
4. Name the next step and the day it happens.
5. No hype words: stunning, nestled, boasts, dream home.
6. At most one question, at the end.
7. Plain words over real estate jargon.
8. Never invent a number, a date or a buyer's comment.
Never: em dashes, exclamation points, emoji.
Facts: if I didn't give it to you, write [VERIFY] and ask.

## Rules
- Drafts only. Never send or post anything for me.
- Fair housing: describe the home, never the people who might live there. No schools, safety or "perfect for families."
- Only draft a text to a seller who told me texting is okay, and end marketing texts with "Reply STOP to opt out."
```

## Clean Memory List

Nothing was changed in your memory. Make these changes in Settings > Your Claude, "Manage" next to Your memory (Topics: select a topic, then the edit icon or "Delete"), or by telling Claude in a regular chat with memory on.

| # | Memory item | Action | New wording | Why |
|---|---|---|---|---|
| M1 | "Quinn Exampleberg is a listing agent with Pretend Pines Realty in St. George, Utah." | Keep | | True, and it matches the instructions. |
| M2 | "Quinn's transaction coordinator is Rory Fakewell." | Keep | | True, and now also in the instructions. |
| M3 | "Quinn sends seller updates on Fridays." | Keep | | True, and it matches line 6 of the instructions. |
| M4 | "Quinn likes MLS remarks that open with the view or the lot." | Keep | | A standing preference for the MLS job. |
| M5 | "Quinn uses Follow Up Boss." | Keep | | True, and now also in the instructions. |
| M6 | "Quinn is listing the Sampleton home on Example Bluff Drive. The seller, Kit Sampleton, wants calls only, at [client phone number removed]." | Remove | | Finding 1: a client's phone number and deal details. They belong in Follow Up Boss. |

## Before and After Diff

Two spaces: unchanged. "- ": removed. "+ ": added. Blank lines left out.

```diff
  # Listing Writer
  I'm Quinn Exampleberg, a listing agent with Pretend Pines Realty in St. George, Utah. Most of my sellers are in Washington County.
+ Transaction coordinator: Rory Fakewell.
+ CRM: Follow Up Boss.
  ## Jobs
  - When I paste a listing worksheet, write MLS public remarks under 1,000 characters, a headline and one Instagram caption.
  - When I paste showing feedback, draft the weekly seller update email.
  - Seller updates go out every Friday.
  ## How to write
- - Write in a formal tone for all client emails.
+ - Write in a [formal or casual? These instructions say formal; your Quinn Casual style says casual. Pick one.] tone for all client emails.
  - Use numerals for prices and square footage.
  - Sign client emails: Quinn Exampleberg, Pretend Pines Realty
  ## My voice
  QUICK CARD
  Write as me. I'm Quinn, a listing agent in St. George who tells sellers the truth, kindly.
  1. Lead with the one thing the seller needs to know.
  2. Short sentences. One idea each.
  3. Exact numbers: $489,000, not "under 500."
  4. Name the next step and the day it happens.
  5. No hype words: stunning, nestled, boasts, dream home.
  6. At most one question, at the end.
  7. Plain words over real estate jargon.
  8. Never invent a number, a date or a buyer's comment.
  Never: em dashes, exclamation points, emoji.
  Facts: if I didn't give it to you, write [VERIFY] and ask.
  ## Rules
  - Drafts only. Never send or post anything for me.
  - Fair housing: describe the home, never the people who might live there. No schools, safety or "perfect for families."
  - Only draft a text to a seller who told me texting is okay, and end marketing texts with "Reply STOP to opt out."
```

## Check Before Sending

Before you paste anything:
- **Facts moved into the rewrite, each with its source:**
  - "Transaction coordinator: Rory Fakewell.": memory M2.
  - "CRM: Follow Up Boss.": memory M5.
- **Placeholders in the rewrite, with the question:**
  - [formal or casual? These instructions say formal; your Quinn Casual style says casual. Pick one.]
- **Decision waiting on you:** formal or casual for client emails (finding 2, both options in fix 3), and the matching change to the other piece.
- **Private details removed:** one client phone number, memory M6. Delete it in memory (fix 1); it may also sit in the chat where you first shared it.
- **Compliance lines kept, word for word:** "Drafts only. Never send or post anything for me." (line 25), the fair housing line (line 26) and the texting line (line 27). **Added:** none.
- **Voice profile:** your QUICK CARD (lines 12 to 23) is in the rewrite character for character, including its own "[VERIFY]" line, which is yours, not a placeholder from this tune-up.
- **The diff:** checked both ways. Its unchanged and added lines read exactly as the rewrite, and its unchanged and removed lines read exactly as your original instructions.
- **Lines skipped as copy headers:** the "PRACTICE FILE" line at the top of each file, and in the memory copy, the question you asked and "What Claude wrote back:".
- **Where each piece goes:** the rewrite into the project's instructions box, then "Save instructions"; the memory change in Settings > Your Claude, "Manage" next to Your memory; the style change in the style menu, or in Customize > Skills if your style became a skill.
- **Not checked:** Instructions for Claude (not received).
