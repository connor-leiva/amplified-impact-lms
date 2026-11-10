---
name: seller-listing-update
description: "Turns one listing's week of showing feedback (a ShowingTime report, a BrokerBay or other export, or a paste), the agent's numbers (Zillow, Realtor.com or MLS views and saves, days on market, last week's) and the agent's notes into the weekly seller update: the numbers with the arithmetic, comments by theme with no buyers named, questions for the agent's price conversation, and the seller email (and a text if they prefer texts). Never invents feedback, a number or a trend, never recommends a price, and drops comments about people, schools, safety or neighborhood demographics and flags them. Use it when an agent says write my seller update, weekly listing update, Tuesday update or showing feedback recap, or uploads a feedback export, even if they never say seller listing update. Not for one open house's visitors and recap (open-house-follow-up), setting a list price from a CMA (pricing-conversation-prep), the MLS remarks (listing-description-writer), or listing appointment prep (listing-appointment-prep)."
compatibility: "Works on uploaded or pasted files with no connectors. Uses code execution (on by default) to read a CSV or PDF and run the counts and the arithmetic. Optional: the Gmail connector, only to save the seller email as a draft when the agent asks."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Seller Listing Update

Turn one listing's week into the update the listing agent sends the sellers: the numbers against last week, what buyers' agents said, and next week's plan, in the agent's voice. ShowingTime and BrokerBay can already send sellers each response as it arrives; this is the one personal weekly narrative across every source, with the comments that must never reach a seller caught first.

Why it matters: sellers read a weekly update closely and act on it. One invented trend, one comment about who the buyers are or what the schools are like, or one line that sounds like a price recommendation, and the update does harm. The price conversation stays the agent's.

## 1. Get the Inputs

- **Showing feedback:** a ShowingTime Listing Activity Report (PDF, agent version), a BrokerBay or other showing service export, a spreadsheet, or a pasted list. Read `references/update-guide.md` (Where the Inputs Come From, Reading the Feedback Columns).
- **Listing numbers:** only what the agent supplies: a dashboard printout, a Zillow performance PDF, a stats CSV or numbers in the notes (portal views and saves, MLS views, days on market, last week's numbers). Never look up, estimate or remember a number.
- **The agent's notes:** the sellers' names and questions, how each seller likes to hear (email, text), anything that happened off the export, and next week's plan. They are the only source for the plan.
- **Nothing to work from:** ask once for the feedback export, with the one-line source from the guide. If the agent says there were no showings, write the update from the numbers and the notes and say so.
- **Missing facts** (address, sellers' first names, the week, the agent's name): use [Property Address], [Seller Names] and so on, flag it at the top, and keep going. Never ask the agent to type what the files already hold.
- Read every row, every page and every line of the notes before writing.

## 2. Set the Week and Count

Follow "Counting" in the guide, in code when code execution is on.
- **The week:** the agent's dates, else the report's range, else Monday to Sunday of the latest week in the export. A row outside the week is left out of every count and listed in Flags.
- **Showings** are completed appointments. Cancelled, declined, requested and no-show appointments get their own line, never counted as showings.
- **Feedback received:** "5 of 7 showings." A request with no response is not feedback.
- **Ratings:** tally interest and price opinions exactly as labeled. Never average a scale or blend labels.
- **Disagreements** (the notes against the export, two dashboards): give both with their sources and flag it. Never pick one.
- **No feedback this week:** say so plainly. Never fill the gap from another week or from impressions.

## 3. Compare With Last Week

Follow "Comparing With Last Week" in the guide.
- Compare only when last week's number is supplied for the same metric, source and kind of period. Show the arithmetic for each: this week minus last week, and the percent to one decimal.
- **Cumulative totals** (Zillow Showcase, since the listing went live): subtract the end-of-week totals to get each week's count, and show the subtraction. **Rolling counts** (the Zillow listing page's last 30 days): report with the as-of date; never compare them week to week or call them this week's.
- **No last-week numbers:** no comparisons anywhere, and a flag that says so.
- Say more, fewer, up or down. Never "trend," a market label or a forecast. Two weeks make a change, not a trend.

## 4. Sort What Buyers' Agents Said

Read `references/fair-housing-and-feedback.md` first, and in Utah mode `references/utah-seller-update-notes.md`.
- Group the comments by theme (the guide's list), count exactly ("2 of 5 responses"), and quote the words exactly. Never paraphrase a comment into something it didn't say, and never join two into one quote.
- **Anonymous by default:** "one showing agent said." Name a showing agent only when the agent asks, and never their buyers or contact details.
- **Left out:** any comment about who the buyers are (family, kids, age, religion, race, national origin, disability, sex), who lives in the area, schools or safety. The whole comment goes, never quoted in part or paraphrased; its ratings still count. Flag it by the showing's date and time only, and say whether the export shows it was already published to the sellers.
- **Trimmed:** a sentence about the buyers' money or plans (budget, lender, preapproval). Cut it with "..." and flag it.
- **A possible defect** (a stain, a leak, a crack, a smell): keep it as written, with no diagnosis, and flag that disclosure questions go to the broker.
- **Interest signals** are quoted as written: "may want a second look" is never "coming back."

## 5. Questions for the Agent's Price Conversation

For the agent only. Facts only, each as a question the agent can take into a CMA: the price opinion tally, every price comment quoted with its showing date, the numbers that changed, days on market, and any seller question about price, first. No recommended price, range or change, and no "the market is telling us." Point to `pricing-conversation-prep` with an updated CMA. If the notes hold the agent's own price view, it stays out of the seller drafts, and a flag says so.

## 6. Draft the Seller Email and the Text

Use the shapes in the guide.
- From the agent, first person, to the sellers by first name. A Title Case subject that names the address and the week. 250 words or fewer from "Hi" through the sign-off. Plain words ("days on market," not "DOM").
- Order: the week in a sentence or two; the numbers (last week's in parentheses only when supplied); what buyers' agents said, by theme with a few exact quotes; price as the facts; the sellers' questions answered only from the inputs; next week's plan.
- **A seller's question about price:** acknowledge it in their words and leave "[Your answer on price]" for the agent. Any other question the inputs can't answer gets a [placeholder]. Never answer from outside the inputs ("nothing to worry about").
- Every day named carries its date ("Saturday, November 14"). None of "stunning," "dream home," "don't hesitate to reach out," "touch base" or "circle back."
- Follow the user's voice profile when one is in the conversation (a Project's instructions such as the "My Voice" project from amplifiedimpact.io/voice-profile, their preferences, or a voice skill), including its sign-off. Without one: warm, plain, direct. Sign with the user's name; otherwise [Agent Name].
- **Text:** only when the agent or the notes say a seller prefers texts, to that seller: 320 characters or fewer, the week in one line and the next dated step, no feedback quotes and no price talk.

## 7. Plan, Dates and Location

- **Next week's plan:** only the items in the notes, in date order, with who does each. Add nothing (no open house, price change or new photos the notes don't name). No plan in the notes: [Next week's plan], flagged.
- Resolve every relative date against the week and today's date, write the weekday and date, and list each in Check before sending with the words it came from. A time with no AM or PM is flagged.
- **Utah mode** when the listing is in Utah. Otherwise general mode: skip the Utah notes and say "State rules were not checked."

## Run, Draft, Own

- **Run:** reads every row and number, sets the week, counts showings, feedback and ratings, does the arithmetic against last week, groups comments by theme, and sets aside the comments that can't go to a seller.
- **Draft:** the seller email and the text, for the agent to read first. Nothing is sent.
- **Own:** the agent owns the price conversation and any price recommendation, which feedback the sellers hear (the left-out comments included, with the broker), whether to name showing agents, next week's plan, disclosure questions a comment raises (with the broker), and every send.

## Guardrails

- **Never invent a showing, a comment, a number or a trend.** Every fact, number, date, name and quote comes from the inputs or the agent's message. A number the email needs and the inputs lack becomes a [placeholder] or the sentence goes.
- **No price advice:** never recommend a price, a range, a reduction or holding, and never call the price right or wrong. Price opinions are the showing agents', quoted and counted.
- **Fair housing:** describe the home, never the buyers or the neighbors. No schools, safety or demographics, even when the sellers ask; the agent points to official sources.
- **Privacy:** no buyer names, money details or contact details; agent-only fields (showing instructions, lockbox, private remarks) never reach the sellers. Never ask for, repeat or handle wire, account, routing or Social Security numbers.
- **Stay in lane:** not the broker, attorney, appraiser or inspector. Disclosure questions go to the broker.
- **Drafts only:** never send, text, post or write to a CRM or the showing service. With the Gmail connector and the agent's ask, a Gmail draft.
- No em dashes or en dashes anywhere.

## Output, In This Order

1. **Flags**, only when they apply: the week used and any rows outside it, how columns were read, showings with no feedback, no feedback at all, no last-week numbers, cumulative or rolling numbers, inputs that disagree, "Left out on purpose" (by date and time, and whether already published), trimmed comments, a possible defect, the sellers' price question, the agent's own price view left out, showing agents named or not, placeholders, times with no AM or PM, and general mode
2. **Bottom line for the agent** (three sentences max): the week, the two or three facts that matter, and the one thing to do before sending
3. **The week in numbers:** a table with metric, this week, last week (when supplied), change with the arithmetic, and the source
4. **What buyers' agents said:** by theme, with exact counts and quotes, each with its showing date and time
5. **Questions for your price conversation** (agent only)
6. **Seller email**
7. **Text version**, only when a seller prefers texts
8. **Next week's plan**, from the notes, dated
9. **Check before sending:** every number with its source and arithmetic, every quote with its showing, every date with the words it came from, every left-out comment by date and time, every placeholder, and whether showing agents are named

If the agent asks for only one piece ("just the email"), give it with the flags and Check before sending.
