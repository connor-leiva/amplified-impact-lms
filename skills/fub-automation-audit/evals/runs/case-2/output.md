# FUB Automation Audit: Sample Valley Brokers

Prompt: "Here are our three FUB action plans. Can you check them for gaps, overlaps and texting risk? I don't have the automations handy."

## Flags

1. **Texting-consent risk:** your notes don't say how any source asks for text consent, so all 5 automated text steps are a Check, and each one reaches new leads, so each is treated as a risk until you confirm the consent capture: the Buyer 5 Text (days 0, 2 and 4, every Example Home Search lead), the Seller Value Plan's day 0 text, and the Open House Thanks text (every visitor you start the plan on).
2. **Missing inputs:** no automations list and no stage list. Not checked: stages with nothing attached, overlaps between automations, whether the Buyer Speed Plan's day 30 move to Nurture starts anything, and what starts the Seller Value Plan.
3. **A trigger not confirmed:** the Seller Value Plan. Your note: "I think it's when someone gets the seller tag, not sure."
4. **A text step Follow Up Boss doesn't have:** the Seller Value Plan lists "Day 0: Text." Follow Up Boss action plans have no text step of their own; see Texting-Consent Risk.
5. **Day reading assumed:** your plans say "Day 0," "Day 3," and so on, not "after the previous step." I read each as days from the start. Follow Up Boss counts each step from the one before, so check this on each plan's Edit screen.
6. **General mode:** Meridian, Idaho. State rules were not checked.
7. **Version:** classic Action Plans ("Pause when lead responds").

## Bottom Line

You sent 3 action plans with 5 automated text steps between them (4 from Sample Drip Texter, 1 whose sending tool isn't shown) and no automations or stage list. The biggest risk is that every text goes to new leads with no consent capture described, and 3 of the 5 name no sender and carry no opt-out line. The first fix: confirm how Example Home Search's form asks for text consent before the Buyer 5 Text keeps starting for every website lead.

## What I Used

- **Our 3 action plans, typed from FUB.txt** ("3 action plans.txt" below, plans numbered as you numbered them): the Buyer Speed Plan, the Seller Value Plan and the Open House Thank You, each with where it's used, the pause setting and its steps; the Buyer 5 Text and Open House Thanks wording from Sample Drip Texter; your note on lead sources (Example Home Search, open houses, referrals).
- **Version:** classic. **Mode:** general (Meridian, Idaho); state rules were not checked.
- **Day reading:** "Day N" read as days from the start (Flag 5). If they are really "days after the previous step," the days and silences below change.
- **Defaults used** (no standard of yours given): a long silence is more than 14 days between steps in a new-lead plan. All three plans are read as new-lead plans: Buyer Speed Plan runs from Lead Flow, Open House Thank You goes on new visitors, and the Seller Value Plan's first email is "Your Home Value."
- **Not provided, and what it stopped:**
  - Automations list: stages with nothing attached, overlaps between automations, whether the Nurture stage or any tag starts another plan, and what starts the Seller Value Plan.
  - Stage list: stages with nothing attached.
  - Lead Flow list: whether open houses and referrals have a plan on Lead Flow (your note says you start Open House Thank You by hand).
  - Consent notes: how each source asks for text consent.
  - Sample Drip Texter's settings: send window, days of the week, and whether a campaign stops on a reply.
  - Email template wording: none sent, so only the text wording was checked.

## Inventory

| # | Name | Kind | How it starts | What it sends, by day | Stop on reply | Ends with | Source |
|---|---|---|---|---|---|---|---|
| 1 | Buyer Speed Plan | Action plan | Lead Flow: Example Home Search | Tag drip-buyer: day 0 (starts row 4). Emails: days 0, 3, 10. Task (call): day 1 | On ("yes") | Day 30: stage to Nurture | 3 action plans.txt, plan 1 |
| 2 | Seller Value Plan | Action plan | An automation; which one is not shown. Your note: "I think it's when someone gets the seller tag, not sure." Not confirmed | Emails: days 0, 21, 60. Text: day 0. Task (call): day 7 | Not shown ("didn't check") | Day 60: email "Ready When You Are" | 3 action plans.txt, plan 2 |
| 3 | Open House Thank You | Action plan | By hand, on each visitor after an open house | Tag oh-thanks: day 0 (starts row 5). Email: days 0, 5. Task (call): day 2 | On ("yes") | Day 5: email "Similar Homes" | 3 action plans.txt, plan 3 |
| 4 | Buyer 5 Text | Outside texting campaign (Sample Drip Texter) | Tag drip-buyer, added on day 0 of the Buyer Speed Plan | Texts: days 0, 2, 4 | Not shown | Day 4 text | 3 action plans.txt, plan 1 |
| 5 | Open House Thanks | Outside texting campaign (Sample Drip Texter) | Tag oh-thanks, added on day 0 of Open House Thank You | Text: one, when not shown | Not shown | The one text | 3 action plans.txt, plan 3 |

## Gaps

**Stages with nothing attached:** not checked. No stage list or automations list.

**Lead sources with nothing attached:** partly checked. Example Home Search starts the Buyer Speed Plan. Open houses have Open House Thank You, started by hand. Referrals: no plan is shown; without the Lead Flow list I can't tell whether that's a gap.

**Stop on reply:**
- **Seller Value Plan:** not shown ("didn't check"). It sends 3 emails and a text, so check it.
- Buyer 5 Text and Open House Thanks: not shown, because they run in Sample Drip Texter. Whether a reply stops them depends on that tool's settings.

**Ends with no next step:**
- **Seller Value Plan:** ends on day 60 with the email "Ready When You Are." Nothing follows.
- **Open House Thank You:** ends on day 5 with the email "Similar Homes." Nothing follows.
- Buyer Speed Plan ends with a stage change to Nurture, which counts as a next step; whether Nurture starts anything wasn't checked (no automations list).

**Long silence** (default for new-lead plans: more than 14 days):
- **Buyer Speed Plan:** 20 days (30 - 10) between "Still Searching?" on day 10 and the stage change on day 30.
- **Seller Value Plan:** 39 days (60 - 21) between "What Buyers Are Paying Near You" on day 21 and "Ready When You Are" on day 60. Its other gaps are 7 days (7 - 0) and 14 days (21 - 7).
- Open House Thank You: no gap over 3 days.

## Overlaps

- **Between automations:** not checked. No automations list. If the seller tag or the Nurture stage starts more than one plan, that's where an overlap would be.
- **Among the three plans:** none found. Each starts from a different event (Lead Flow, an automation, by hand).
- **One flow by design, not overlaps** (listed so you see the same-day messages):
  - Buyer Speed Plan with the Buyer 5 Text: an email and a text on day 0, a text on day 2, an email on day 3, a text on day 4.
  - Seller Value Plan: an email and a text on day 0.
  - Open House Thank You with the Open House Thanks text: an email and a text on day 0.

## Texting-Consent Risk

| Automated text | What starts it, and who it reaches | Consent capture | Result |
|---|---|---|---|
| Buyer 5 Text, day 0 | Tag drip-buyer on day 0 of the Buyer Speed Plan: every new Example Home Search lead | Not described | **Check**, treated as a risk until confirmed |
| Buyer 5 Text, day 2 | Same | Not described | **Check**, treated as a risk until confirmed |
| Buyer 5 Text, day 4 | Same | Not described | **Check**, treated as a risk until confirmed |
| Seller Value Plan, day 0 text | Whoever the plan's automation starts on (trigger not confirmed); how the text is sent is not shown | Not described | **Check**, treated as a risk until confirmed |
| Open House Thanks | Tag oh-thanks on day 0 of Open House Thank You: every visitor you start the plan on | Not described | **Check**, treated as a risk until confirmed |

**The Seller Value Plan's text step.** Follow Up Boss's action plans have no text step of their own: the actions are tasks, emails, stage changes, notes, tags, collaborators and pausing plans. So "Day 0: Text" is one of two things, and I can't tell which from the copy:
- an old initial text saved in the plan, which Follow Up Boss sends only when Lead Flow applied the plan, not when an automation started it. Your note says an automation starts this plan, so it may not be sending at all; or
- a step from another tool, such as Sample Drip Texter.
It stays in this check until you say which.

**Wording and timing:**
- Buyer 5 Text, day 0: names the agent ({agent name}) and Sample Valley Brokers, and ends "Reply STOP to opt out." Fine.
- Buyer 5 Text, day 2 ("Any homes catch your eye yet?") and day 4 ("I can send you new listings before they hit the big sites. Want them?"): **no sender and no opt-out line.**
- Seller Value Plan text: names the agent and Sample Valley Brokers; **no opt-out line.**
- Open House Thanks ("Thanks for coming by the open house today! Let me know if you have questions."): **no sender and no opt-out line.**
- Send times: not shown for any of them. The house window is 8 a.m. to 8 p.m. in the lead's time zone.
- Manual text tasks: none. The tasks are calls.

**The basics** (from `outreach-rules.md`, Last verified 2026-11-08; a plain-language summary, not legal advice):
- A marketing text sent with an autodialer needs the person's prior express written consent (47 CFR 64.1200(a)(2)): a signed written agreement that clearly authorizes the messages, includes the phone number, and says signing isn't a condition of buying anything (64.1200(f)(9)).
- A phone number on a lead form is not consent. Whether a texting tool counts as an autodialer is a legal question (Facebook v. Duguid, 2021); the house rule is no documented consent, no automated text.
- Opt-out by any reasonable means; "stop," "quit," "end," "revoke," "opt out," "cancel" and "unsubscribe" always count, honored within 10 business days. From November 25, 2026 (FCC 26-67), a sender may name one opt-out method and must disclose it in each text.
- Each text names the sender, the business, and a phone number or address (64.1200(d)(4)).
- Quiet hours: no solicitations before 8 a.m. or after 9 p.m. in the recipient's time zone (64.1200(c)(1)); the house window ends at 8 p.m. No texts to numbers on the National Do Not Call Registry unless an exception applies.
- State rules were not checked. Confirm with your broker or an attorney.

## Template Wording

Only text wording was sent, so only texts were checked. No fair housing words were found in them.
- Buyer 5 Text, day 2 and day 4: add the agent and Sample Valley Brokers, and "Reply STOP to opt out." (your day 0 text already has both).
- Seller Value Plan text: add "Reply STOP to opt out." wherever this text is set up.
- Open House Thanks: add the agent and Sample Valley Brokers, and "Reply STOP to opt out."

## Fix List

Ranked. Every step is yours to take; this audit changed nothing. Editing a plan reaches only contacts who haven't reached that step yet.

1. **Buyer 5 Text (every Example Home Search lead; consent not described).** Find out whether the Example Home Search form carries text consent wording that names Sample Valley Brokers, and confirm it with your broker. Until then, your choice:
   - Admin > Action Plans, Buyer Speed Plan, Edit, delete the day 0 step "Add tag drip-buyer," Save. New leads then get no campaign texts.
   - Or keep it, once the form's wording is confirmed.
   Either way, in Sample Drip Texter (outside Follow Up Boss): add the sender and "Reply STOP to opt out." to the day 2 and day 4 texts.
2. **Open House Thanks (every visitor you start it on; consent not described; no sender, no opt-out).** Your choice:
   - Admin > Action Plans, Open House Thank You, Edit, delete the day 0 step "Add tag oh-thanks," Save, and add the oh-thanks tag by hand only for visitors with written text consent.
   - Or keep it for every visitor only if your sign-in sheet carries text consent wording your broker approves.
   In Sample Drip Texter: add the sender and "Reply STOP to opt out." to the text.
3. **The Seller Value Plan's text.** Find out how it's sent. If it's an old initial text and an automation starts the plan, Follow Up Boss doesn't send it, and you can ignore it. If it's set up in another tool, add "Reply STOP to opt out." there and confirm consent as in item 1.
4. **Seller Value Plan, stop on reply not shown.** Admin > Action Plans, Seller Value Plan, Edit. If "Automatically pause this action plan when the lead responds" isn't checked, check it and Save.
5. **Plans that end with no next step.** Admin > Action Plans, then Seller Value Plan or Open House Thank You, Edit, add a last step, such as "Run [days] days after the previous step: Change stage" or "Create task: decide what's next," Save.
6. **Long silences** (against the 14-day default). If you want a touch sooner: Admin > Action Plans, Buyer Speed Plan, Edit, add a step between "Still Searching?" and the stage change; and Seller Value Plan, Edit, add a step between "What Buyers Are Paying Near You" and "Ready When You Are." Save each.
7. **Send the rest for a full audit:** the automations list (Admin > Automations: each one's trigger, conditions, action, on or off), the stage list (Admin > Stages), the Lead Flow list (Admin > Lead Flow), how each source asks for text consent, and Sample Drip Texter's send settings.

## Questions for the Team

1. Which automation starts the Seller Value Plan, and on what trigger? (Your note: "I think it's when someone gets the seller tag, not sure.")
2. How is the Seller Value Plan's "Day 0: Text" sent? (Follow Up Boss action plans have no text step.)
3. Does the Example Home Search form, or your open house sign-in, ask for text consent? What does it say?
4. Is the Seller Value Plan's "Pause when lead responds" checked? (Your note: "didn't check.")
5. Do your plans say "Day 3" or "Run 3 days after the previous step" on the Edit screen?
6. When does Sample Drip Texter send, and does it stop a campaign when someone replies?
7. Do referrals get a plan on Lead Flow?

## Check Before Sending

Before you share this audit or change anything in Follow Up Boss:
- **Plan names, steps and days:** from Our 3 action plans, typed from FUB.txt, plans 1 to 3. Each "Day N" read as days from the start (to confirm on the Edit screen).
- **The Seller Value Plan's trigger:** not confirmed; only your note.
- **Quoted text:** the Buyer 5 Text days 0, 2 and 4, the Seller Value Plan's text and the Open House Thanks text, as you copied them.
- **Silences:** 20 days (30 - 10) and 39 days (60 - 21), against the 14-day house default, not your own standard.
- **Counts:** 3 action plans, 5 automated text steps.
- **Not checked:** stages, automations, Lead Flow beyond Example Home Search, Sample Drip Texter's settings, email template wording, and state rules.
- **Before relying on any consent judgment:** consent records for every source that gets an automated text, a Do Not Call scrub, quiet hours in the lead's time zone, and your state's rules. Confirm with your broker or an attorney.
