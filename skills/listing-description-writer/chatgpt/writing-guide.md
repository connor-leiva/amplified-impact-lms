# Writing Guide: From Listing Facts to Remarks, Headlines and a Caption

How to turn a listing's facts into copy the agent can paste, without adding anything the facts don't say. No state facts here: Utah's MLS and advertising rules are in `utah-mls-and-advertising.md`, and the fair housing review is in `fair-housing-review.md`.

## 1. Where the Facts Come From

| Input | What it usually holds | How much to trust it |
|---|---|---|
| MLS input sheet or listing worksheet (the brokerage's form, or a printout of the MLS input screen) | Every field: price, rooms by level, square feet, year built, lot, garage, systems, HOA, inclusions, schools, plus agent-only fields | The main source. Still check it against the others. |
| Seller's notes or questionnaire | What the seller loves, updates and years, what stays, the seller's own descriptions | The seller's words. Plain, checkable facts are usable and marked "seller's notes." Claims in the categories below need support or the agent's confirmation. |
| Feature list | Finishes, updates, inclusions | Same as seller's notes, unless the agent wrote it from documents. |
| Public records (county parcel or assessor printout) | Year built, lot size, square feet as the county records them, parcel number | Official, but often out of date (a finished basement the county hasn't recorded). A conflict is a flag, not a winner. |
| An old or pasted description | Wording from a past listing or the agent's draft | Never a source of facts by itself: the home may have changed. Review its wording; use a fact from it only when a current input confirms it. |
| The agent's message | The go-live date, the MLS, the character limit, the agent's and brokerage's names, what to stress | Use as given. |

Read every page of every file, including handwritten-looking notes and the last page. A worksheet's agent-only fields are often on page 2.

## 2. Build the Fact Sheet First

Before writing a word, list each fact you might use with its source ("4 bedrooms: worksheet, Rooms by Level"). Then:

- **Set aside agent-only fields**, and never use them in any draft, even rephrased: private remarks, agent remarks, broker remarks, confidential remarks, showing instructions, appointment or notice rules, lockbox type, location or code, gate, alarm or door codes, occupancy (owner occupied, vacant, tenant occupied) and lease terms, owner or tenant names and phone numbers, the seller's reasons for selling or personal situation, offer instructions and deadlines, and any offer of compensation.
- **Conflicts:** when two inputs disagree (square feet, bedroom count, lot size, year built, an HOA fee), use neither number in the drafts, write around it ("a finished basement with a bedroom and a three-quarter bath"), and flag both numbers with their sources for the agent to resolve.
- **Missing:** when a fact the drafts need is missing (the list price for the caption, the agent's name), write a [placeholder] and list it in Flags. Never ask the agent to retype what a file already says.

## 3. Never Invent

Use only what the inputs state. Every one of these needs a source in the inputs, word for word in substance:

- Features, finishes and materials ("quartz," "hardwood," "vaulted")
- Square footage, lot size, room sizes
- Upgrades and their years ("new roof," "updated kitchen," "2022")
- Views ("mountain views," "city lights")
- Distances and commute times ("0.3 miles," "10 minutes to downtown")
- Schools: never named, never rated
- HOA amenities and what the dues cover
- Condition and adjectives that make a claim: "move-in ready," "oversized," "private," "quiet," "updated," "brand new," "low maintenance"

**The seller's own facts.** The seller's notes and feature list are inputs, not inventions. A plain fact about the home that the seller would know (a finish, an inclusion, the year of an update, what stays) can go in when no other input contradicts it or leaves it open. Mark it "seller's notes" in Facts I Used and in Check before sending, so the agent confirms it with the seller.

**Not used until you confirm.** These stay out of the drafts, listed in Flags with what would confirm each one (an invoice, a permit, the HOA's minutes, the agent's own measurement):
- Anything another input contradicts or leaves open: the seller says "new roof in 2021," but the worksheet's roof field says no year was given on the disclosure.
- A distance, commute time or view stated only by the seller, with no measurement or worksheet field behind it ("about 5 minutes to the freeway," "mountain views from every room").
- A square footage, lot size or room count that differs from the worksheet or the public records (that's a conflict: section 2).
- A plan or a promise: an amenity the HOA "approved" or "is adding" is left out until it exists.
- Subjective size or quality words, even from the seller ("huge," "best on the street"): describe the feature itself ("walk-in pantry").

## 4. Public Remarks

- **Limit first.** Use the character limit the agent gives, or the one on the worksheet. Count every character, spaces and punctuation included, with code (Python `len()` on the exact text), and write the count under the draft: "912 of 1,000 characters." No limit given: keep it under 1,000 characters (a working target, not an MLS rule), give the count, and flag "Confirm your MLS's Public Remarks limit."
- **Shape:** an opening sentence with the strongest two or three facts; the layout level by level (main, upper, basement); updates with their years; outdoor space, garage and parking; HOA dues and what they cover when there is an HOA; then a named place with a stated distance, if the inputs give one. Plain sentences. No exclamation points unless the voice profile uses them.
- **Never in public remarks:** names (agent, brokerage, team, builder, owner), phone numbers, emails, websites or virtual tour links, showing or lockbox wording, occupancy, compensation. In Utah mode these are MLS rules; elsewhere, many MLSs have the same rules, so say "confirm with your MLS."
- **No school names, no school or safety claims, nothing about who the home suits.** The MLS has its own school fields; boundaries change.
- **Prices:** the list price only if the agent wants it in the copy (most MLSs show it in its own field). Never a price opinion ("priced to sell," "below appraisal").
- **Words to avoid:** "stunning," "dream home," "won't last," "must see," and empty claims ("one of a kind," "the best").

## 5. Headlines

Two options, in Title Case, each under 60 characters with its count. Lead with a property fact, not a person ("Sandy Rambler With a Finished Basement and RV Parking"). These are for a flyer, a website, a property site or the start of a post; if the agent's MLS or portal has a headline field, its limit rules: confirm it.

## 6. Social Caption

- For Instagram or Facebook: a first line that stops the scroll with a property fact, two or three short lines on the best features, the price only if the inputs give it, and one line on what's next (the go-live, open house or showing date only if the inputs give it; otherwise "Message me for details").
- The last line names the agent and the brokerage ("[Agent Name], [Brokerage Name]" when not given). In Utah mode, the brokerage name rule is in `utah-mls-and-advertising.md`; outside Utah, say state advertising rules were not checked and to confirm with the broker.
- At most three hashtags, from the city and the property type only (#SandyUtah, #UtahRambler). Never a hashtag about people (#familyhome, #starterhome for "young couples").
- 60 to 120 words. Same facts as the remarks, nothing new. No emojis unless the voice profile uses them.
- **Status words must be true.** "Just listed" only once it's on the MLS; "coming soon" only for a listing that isn't live yet, with the Utah public marketing flag in Utah mode.
- If it's another agent's listing, follow that MLS's rules for advertising it (Utah: `utah-mls-and-advertising.md`).

## 7. Facts I Used

A short list, one line per fact in the drafts: the fact and its source ("Quartz counters, 2022: seller's notes; matches worksheet Updates"). Keep it to what the drafts actually use. Then one line each for what was left out on purpose: "Agent-only fields (private remarks, showing instructions, lockbox, occupancy) were not used," and any fact set aside for a conflict.

## 8. Check Before Sending

The last section. List, for the agent to check before pasting or posting:
- Every number in the drafts (price, beds, baths, square feet, years, lot size, HOA dues, distances), each with its source
- Every named place and every feature claim, with its source
- The character counts against the limit, and whether the limit was given or still needs confirming
- Every open [placeholder]
- A last line: "Agent-only check: the public remarks hold no names, contact details, links, showing or lockbox details, occupancy or compensation, and the caption names only you and your brokerage."

## 9. Voice

Follow the user's voice profile when one is in the conversation (a Project's instructions such as the "My Voice" project from amplifiedimpact.io/voice-profile, their preferences, or a voice skill). It changes tone, never facts. Without one: warm, plain, direct. No em dashes.
