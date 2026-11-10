# FUB Automation Audit: Gumdrop Hollow Home Team, Example Ridge Realty

*Made-up example: what the skill returned for the four practice files and the practice prompt, run on 2026-11-10 and graded in evals/runs/practice/grading.md (14 of 14 expectations). Every team, person, portal, tool and plan in it is made up. The audit doesn't depend on the day it runs.*

Prompt: "Here are our Follow Up Boss action plans, our automations list, and our stages and lead sources. Audit them: what's missing, what's overlapping, and are our automated texts a problem?"

## Flags

1. **Texting-consent risk:** two automated texts can reach leads with no documented text consent: the Facebook Lead Ads initial text (your form has "no wording about texts on it") and Sample Drip Texter's Open House 3 Text (the oh-text tag goes on every open house visitor, but the consent box is optional). The Facebook text also names no sender and has no opt-out line.
2. **Consent not described:** the HomeFinder Example initial text ("not sure what their form says about texting"). It reaches new leads, so it is treated as a risk until you confirm.
3. **Utah mode:** the team is in Draper, Utah, so the Utah notes apply. Utah's solicitation law limits Sunday and legal holiday solicitations to people who gave prior express consent, though a licensee acting within the license is exempt (Utah Code 13-25a-111); whether it reaches texts was not confirmed. Your open houses are on Saturdays and Sundays, and the Open House 3 Text sends 7 days a week.
4. **Two links to confirm:** a stage changed by an action plan step is treated here as starting that stage's automation (Follow Up Boss's help center doesn't say). Both overlaps below depend on it.
5. **Version:** classic Action Plans and Automations (your copies show "Run X days after the previous step" and the pause checkbox).

## Bottom Line

Gumdrop Hollow runs 10 action plans, 7 automations (6 on) and 4 automated text flows with 6 text steps between them. The biggest risk is automated texts reaching leads nobody documented consent for: every Facebook Lead Ads lead gets a text with no sender and no opt-out line, and every open house visitor gets the Open House 3 Text whether or not they checked "OK to text me." The first fix: decide what happens to the Facebook Lead Ads initial text (Admin > Lead Flow, Facebook Lead Ads, Advanced Settings).

## What I Used

- **PRACTICE Gumdrop Hollow action plans, copied from FUB.md** ("action plans.md" below, plans numbered in file order): 9 action plans, each with where it's used, the three checkboxes and every step.
- **PRACTICE Action plan Open House Visitor, printed.pdf** ("printed PDF" below), page 1: the tenth plan, its checkboxes, 6 steps and the wording of the email template Thanks for Stopping By.
- **PRACTICE Gumdrop Hollow automations list.csv** ("automations list.csv" below, rows numbered under the header): 7 automations (trigger, conditions, action, on or off), typed by you.
- **PRACTICE Gumdrop Hollow stages, lead sources and texting.txt** ("stages, lead sources and texting.txt" below): the stage list, 6 Lead Flow sources, the 3 initial texts word for word, how each source gets text consent, and the Sample Drip Texter campaign word for word.
- **Version:** classic. **Mode:** Utah (Draper, Utah), with `utah-texting-notes.md`.
- **Day math:** every copy says "Run X days after the previous step," so each step's day from the start is the previous step's day plus X, shown below.
- **Defaults used** (you gave no standard of your own): a long silence is more than 14 days between steps in a new-lead, active-client or transaction plan, and more than 90 days in a nurture, past client or sphere plan.
- **Gaps:** no wording for any email template except Thanks for Stopping By, so only that one was checked for wording. No screenshot of Sample Drip Texter's settings beyond your note.

## Inventory

| # | Name | Kind | How it starts | What it sends, by day | Stop on reply | Ends with | Source |
|---|---|---|---|---|---|---|---|
| 1 | New Website Lead | Action plan | Lead Flow: Website (IDX) | Emails: days 0, 2, 7, 14. Tasks (calls): days 0, 1, 4, 21 | On | Day 30: stage to Nurture, tag nurture | action plans.md, plan 1 |
| 2 | Portal Buyer 14 Day | Action plan | Lead Flow: HomeFinder Example | Emails: days 0, 3, 7, 14. Tasks (calls): days 0, 1 | On | Day 14: email "Last Note From Me" | action plans.md, plan 2 |
| 3 | Facebook Seller Lead | Action plan | Lead Flow: Facebook Lead Ads | Emails: days 0, 2, 5, 10, 20. Task (call): day 1 | Off | Day 30: stage to Nurture | action plans.md, plan 3 |
| 4 | Open House Visitor | Action plan | Lead Flow: Sample SignIn App | Tag oh-text: day 0 (starts row 21). Emails: days 0, 3, 7. Tasks: days 1, 14 | On | Day 14: task "Decide: Active Client or Nurture?" | printed PDF, page 1 |
| 5 | Long-Term Nurture | Action plan | Automation Nurture Drip (row 11) | Emails: days 0, 30, 150, 300. Tasks (calls): days 210, 365 | On | Day 365: task "Call: one-year check-in" | action plans.md, plan 4 |
| 6 | Monthly Market Email | Action plan | Automation Market Email (row 12) | Emails: days 0, 30, 60, 90, 120, 150. Task: day 150 | Off | Day 150: task "Review: keep them on the market email?" | action plans.md, plan 5 |
| 7 | Under Contract to Close | Action plan | Automation Under Contract (row 13) | Emails: days 0, 30. Tasks: days 0, 3, 10, 20 | Off | Day 30: email "Happy Closing Day!", stage to Closed | action plans.md, plan 6 |
| 8 | Closing Day Thank You | Action plan | Automation Closed Thank You (row 14) | Emails: days 0, 14. Task: day 7 | On | Day 28: stage to Past Client | action plans.md, plan 7 |
| 9 | Past Client Care | Action plan | Automation Past Client (row 15) | Emails: days 60, 120, 270. Tasks: days 0, 180, 360 | On | Day 360: task "Call: annual check-in" | action plans.md, plan 8 |
| 10 | Home Anniversary | Action plan | Automation Home Anniversary (row 16) | Email: day 0. Task (call): day 0 | On | Day 0: task "Call to say happy anniversary" | action plans.md, plan 9 |
| 11 | Nurture Drip | Automation | Stage changed to Nurture; no conditions | Starts Long-Term Nurture | n/a | n/a | automations list.csv, row 1 |
| 12 | Market Email | Automation | Tag added: nurture; condition: Email is good | Starts Monthly Market Email | n/a | n/a | automations list.csv, row 2 |
| 13 | Under Contract | Automation | Stage changed to Under Contract; no conditions | Starts Under Contract to Close | n/a | n/a | automations list.csv, row 3 |
| 14 | Closed Thank You | Automation | Stage changed to Closed; no conditions | Starts Closing Day Thank You | n/a | n/a | automations list.csv, row 4 |
| 15 | Past Client | Automation | Stage changed to Past Client; no conditions | Starts Past Client Care | n/a | n/a | automations list.csv, row 5 |
| 16 | Home Anniversary | Automation | Calendar date: Closing Anniversary, 0 days after; condition: Stage is Past Client; runs every year | Starts Home Anniversary | n/a | n/a | automations list.csv, row 6 |
| 17 | Back On Site | Automation, **off** | Property Viewed; condition: Stage is Nurture | Would add a note and notify the agent ("Turned off in August") | n/a | n/a | automations list.csv, row 7 |
| 18 | Website (IDX) initial text | Initial text (Lead Flow) | New Website (IDX) lead | Text: 5 minutes after, from the agent's FUB number | n/a | n/a | stages, lead sources and texting.txt |
| 19 | HomeFinder Example initial text | Initial text (Lead Flow) | New HomeFinder Example lead | Text: 2 minutes after, from the agent's FUB number | n/a | n/a | stages, lead sources and texting.txt |
| 20 | Facebook Lead Ads initial text | Initial text (Lead Flow) | New Facebook Lead Ads lead | Text: 1 minute after, from the agent's FUB number | n/a | n/a | stages, lead sources and texting.txt |
| 21 | Open House 3 Text | Outside texting campaign (Sample Drip Texter) | Tag oh-text added in FUB (row 4, day 0) | Texts: day 0 (1 hour after the tag), day 2, day 6 | Not shown | Day 6 text | stages, lead sources and texting.txt |

**Day math, each step's day from the start** (FUB counts each step from the one before):
- New Website Lead: 0, 0, 1, 2 (1 + 1), 4 (2 + 2), 7 (4 + 3), 14 (7 + 7), 21 (14 + 7), 30 (21 + 9), 30 (30 + 0).
- Portal Buyer 14 Day: 0, 0, 1, 3 (1 + 2), 7 (3 + 4), 14 (7 + 7).
- Facebook Seller Lead: 0, 1, 2 (1 + 1), 5 (2 + 3), 10 (5 + 5), 20 (10 + 10), 30 (20 + 10).
- Open House Visitor: 0, 0, 1, 3 (1 + 2), 7 (3 + 4), 14 (7 + 7).
- Long-Term Nurture: 0, 30, 150 (30 + 120), 210 (150 + 60), 300 (210 + 90), 365 (300 + 65).
- Monthly Market Email: 0, 30, 60 (30 + 30), 90 (60 + 30), 120 (90 + 30), 150 (120 + 30), 150 (150 + 0).
- Under Contract to Close: 0, 0, 3, 10 (3 + 7), 20 (10 + 10), 30 (20 + 10), 30 (30 + 0).
- Closing Day Thank You: 0, 7, 14 (7 + 7), 28 (14 + 14).
- Past Client Care: 0, 60, 120 (60 + 60), 180 (120 + 60), 270 (180 + 90), 360 (270 + 90).
- Home Anniversary: 0, 0.

## Gaps

**Stages with nothing attached** (from the stage list against the automations list):
- **Hot Prospect:** no automation starts on it.
- **Active Client:** no automation starts on it.
- **Sphere:** no automation starts on it. (Home Anniversary's condition is Stage is Past Client, so Sphere contacts don't get it either.)
- Lead: new leads are covered by Lead Flow; nothing starts when a contact is moved back to Lead.
- Nurture is covered by Nurture Drip; Back On Site is off, so it adds nothing. Under Contract, Closed and Past Client each have an automation. Trash has nothing, as expected.

**Lead sources with nothing attached** (Lead Flow): **Referral** and **Sign Call**, each with "Action plan: none." Your notes say agents call these by hand, so this may be on purpose.

**Stop on reply off:**
- **Facebook Seller Lead:** off, and it sends 5 emails (days 0, 2, 5, 10, 20). A seller who replies keeps getting them.
- **Monthly Market Email:** off, and it sends 6 emails. It also keeps going when Long-Term Nurture pauses on a reply, because each plan has its own setting.
- **Under Contract to Close:** off. It is mostly tasks for a current client (2 emails, 4 tasks), so this may be on purpose. Asked below.
- **Open House 3 Text:** not shown. Your note doesn't say whether Sample Drip Texter stops the campaign when a visitor replies. Asked below.

**Ends with no next step:** **Portal Buyer 14 Day** ends on day 14 with the email "Last Note From Me." No stage change, tag or task follows, so a portal lead who never replied has nothing after day 14. Every other plan ends with a stage change or a task.

**Long silence** (default for nurture plans: more than 90 days): **Long-Term Nurture** has 120 days between Quick Check-In (day 30) and Spring Market Note (day 150). No other plan passes its default: the longest gaps are 9 days in New Website Lead (21 to 30), 10 in Facebook Seller Lead and Under Contract to Close, 14 in Closing Day Thank You, 30 in Monthly Market Email and 90 in Past Client Care. Home Anniversary is a calendar-date plan and is skipped.

## Overlaps

**1. Nurture: two plans start the same day.** New Website Lead's day 30 does two things: step 9 changes the stage to Nurture (30 = 21 + 9) and step 10 adds the tag nurture (30 + 0).
- The tag starts Market Email, which starts Monthly Market Email (when Email is good). Follow Up Boss's own recipe for starting two plans relies on a tag added by a plan step, so this link holds.
- The stage change starts Nurture Drip, which starts Long-Term Nurture. **To confirm:** the help center doesn't say a stage changed by a plan step starts an automation.
- Same-day emails, counting from the day both start:

| Day | Long-Term Nurture | Monthly Market Email |
|---|---|---|
| 0 | Staying in Touch | This Month in the Market |
| 30 | Quick Check-In | This Month in the Market |
| 150 | Spring Market Note | This Month in the Market |

Both day 0 emails go out right after the plans start; the day 30 and day 150 pairs both go around 9 a.m. This reaches only website leads who never replied for 30 days (New Website Lead pauses on a reply). Facebook Seller Lead's day 30 changes the stage only, with no tag, so its leads start Long-Term Nurture alone.

**2. Closing day: two closing emails.** Under Contract to Close sends "Happy Closing Day!" on day 30 (20 + 10) and changes the stage to Closed the same day (30 + 0). The stage change starts Closed Thank You, which starts Closing Day Thank You, whose day 0 email is "Happy Closing Day." The client gets two closing-day emails on day 30. **To confirm:** the same stage-change link as above. Also, the plan sends that email and moves the contact to Closed 30 days after Under Contract, whatever the real closing date is. Asked below.

**One flow by design, not overlaps** (listed so you see the same-day messages):
- Website (IDX), HomeFinder Example and Facebook Lead Ads: each source's initial text (5, 2 and 1 minutes after) and its plan's day 0 email reach a new lead within minutes of each other.
- Open House Visitor: the Thanks for Stopping By email right away and the Open House 3 Text day 0 text an hour after the tag, then a text on day 2, an email on day 3, a text on day 6 and an email on day 7.

No chain passes Follow Up Boss's limit of 4 action plan emails to one contact a day.

## Texting-Consent Risk

| Automated text | What starts it, and who it reaches | Consent capture (your notes) | Result |
|---|---|---|---|
| Website (IDX) initial text | Every new Website (IDX) lead, 5 minutes after | Documented: a checkbox the lead has to check to register, with text wording naming Gumdrop Hollow Home Team at Example Ridge Realty | **Lower risk if records hold.** Confirm the wording with your broker and that each lead's record (date, number, wording) is kept. |
| HomeFinder Example initial text | Every new HomeFinder Example lead, 2 minutes after | Not described: "not sure what their form says about texting" | **Check**, treated as a risk until confirmed because it reaches new leads. Find out what HomeFinder Example's form says about texts and whose name it gives. |
| Facebook Lead Ads initial text | Every new Facebook Lead Ads lead, 1 minute after | Not documented: "There's no wording about texts on it." | **Risk:** it reaches leads with no documented consent. |
| Open House 3 Text (days 0, 2, 6) | Every visitor the Sample SignIn App sends: Open House Visitor adds oh-text on day 0 and "runs on all of them" | Partly documented: an optional box, "OK to text me about this home and others"; "Some visitors check it and some don't." | **Risk:** it reaches the visitors who didn't check the box. |

**Wording and timing:**
- Website (IDX): names the agent ({Agent First Name}), the team and the brokerage; ends "Reply STOP to opt out." Fine.
- HomeFinder Example: names the agent ({Agent First Name}) and the team; **no opt-out line.**
- Facebook Lead Ads: **no sender** (no agent, team or brokerage) and **no opt-out line.**
- Open House 3 Text: day 0 names the agent and team, **no opt-out line**; day 2 has **no sender and no opt-out line**; day 6 names the agent, team and brokerage and ends "Reply STOP to opt out."
- Follow Up Boss holds initial texts from 9 p.m. to 8 a.m. in the assigned agent's time zone, not the lead's, and its help center describes no Sunday or holiday hold. Sample Drip Texter sends 8 a.m. to 9 p.m. Mountain, 7 days a week; the house window ends at 8 p.m.
- **Utah:** Utah's solicitation law limits Sunday and legal holiday solicitations to people who gave prior express consent (Utah Code 13-25a-103(3)), though Utah Code 13-25a-111 exempts a licensee acting within the license, and whether it reaches texts was not confirmed. Ask your broker. It matters for the three texts whose consent isn't documented for everyone: the Open House 3 Text day 0 text goes out on the open house day, a Sunday for every Sunday open house; the HomeFinder Example and Facebook Lead Ads initial texts go out whenever a lead arrives, Sundays and holidays included.
- **Manual text tasks:** none in the plans. Your notes say agents text Referral and Sign Call contacts by hand only when the person says it's OK; the same consent rule applies before a first marketing text, and a spoken OK isn't a written record.

**The basics** (from `outreach-rules.md`, Last verified 2026-11-08; a plain-language summary, not legal advice):
- A marketing text sent with an autodialer needs the person's prior express written consent (47 CFR 64.1200(a)(2)). That is a signed written agreement that clearly authorizes the messages, includes the phone number, and says signing isn't a condition of buying anything; an e-signature can count (64.1200(f)(9)).
- A phone number in the CRM or on a lead form is not consent. An established business relationship doesn't replace written consent.
- Whether a texting tool counts as an autodialer is a legal question (Facebook v. Duguid, 2021). The house rule: no documented consent, no automated text.
- A person can opt out by any reasonable means; "stop," "quit," "end," "revoke," "opt out," "cancel" and "unsubscribe" always count, honored within 10 business days (in effect since April 11, 2025). Follow Up Boss's keywords stop its texts automatically, but "revoke" and "opt out" are not on its list, so the team honors those by hand. From November 25, 2026 (FCC 26-67), a sender may name one opt-out method and must disclose it in each text, and an opt-out from a marketing message stops all marketing calls and texts from that sender.
- Each text names the sender, the business, and a phone number or address (64.1200(d)(4)).
- Quiet hours: no solicitations before 8 a.m. or after 9 p.m. in the recipient's time zone (64.1200(c)(1)); the house window is 8 a.m. to 8 p.m. No texts to numbers on the National Do Not Call Registry unless an exception applies.
- Confirm with your broker or an attorney.

## Template Wording

Only the templates whose wording you sent were checked: the 3 initial texts, the 3 Open House 3 Text messages, and Thanks for Stopping By.
- **Facebook Lead Ads initial text:** "Hi {Contact First Name}! Saw you asked what your home is worth. When's a good time to chat?" Add the sender and an opt-out line, as your Website (IDX) text already does: "this is {Agent First Name} with Gumdrop Hollow Home Team at Example Ridge Realty" and "Reply STOP to opt out."
- **HomeFinder Example initial text:** add "Reply STOP to opt out." at the end.
- **Open House 3 Text, day 0:** add "Reply STOP to opt out." **Day 2:** "Hi {first name}, did the home catch your eye? I can send you similar ones." Add the agent and team, and "Reply STOP to opt out."
- **Thanks for Stopping By (fair housing):** "This neighborhood is perfect for young families, with great schools nearby." Both phrases describe people and schools, not the home. Delete the sentence; the next one already describes the home ("a fenced backyard, a finished basement and a two-car garage"). For schools, point visitors to the official school district sources.
- Action plan emails get Follow Up Boss's unsubscribe wording automatically, so none is flagged for it.

## Fix List

Ranked. Every step is yours to take; this audit changed nothing. Editing a plan reaches only contacts who haven't reached that step yet.

1. **Facebook Lead Ads initial text (Risk; no sender, no opt-out).** Your choice:
   - Turn it off until consent is in place: Admin > Lead Flow, Facebook Lead Ads, Advanced Settings, the Initial Text Message, the trash icon, then Save.
   - Or keep it only after your Facebook form carries text consent wording your broker approves; then add the sender and opt-out line (same path: edit the Initial Text Message, Save).
2. **Open House 3 Text reaches visitors who didn't check the box (Risk).** Your choice:
   - Admin > Action Plans, Open House Visitor, Edit, delete step 1 (Add tag(s): oh-text), Save. The hosting agent then adds the oh-text tag by hand only to visitors who checked "OK to text me."
   - Or ask Sample SignIn App's support whether it can mark visitors who checked the box (a tag, for example). If it can, Follow Up Boss's Lead Flow rules can start a different plan for tagged leads; ask Follow Up Boss support to help set it up.
   - Either way, in Sample Drip Texter (outside Follow Up Boss): add "Reply STOP to opt out." to the day 0 and day 2 texts and the sender to day 2, end the send window at 8 p.m., and ask your broker about Sundays.
3. **HomeFinder Example initial text (Check, treated as a risk until confirmed; no opt-out).** Admin > Lead Flow, HomeFinder Example, Advanced Settings, the Initial Text Message: add "Reply STOP to opt out.", Save. Ask HomeFinder Example what its form says about texts and whose name it gives. If it names no text consent for your team, treat this text like item 1 (same Lead Flow path).
4. **Thanks for Stopping By (fair housing words).** It sends automatically on day 0 of Open House Visitor. Admin > Email Templates, Thanks for Stopping By, edit it, delete the neighborhood sentence quoted under Template Wording, and save. A template edit changes it in every plan that uses it.
5. **Nurture overlap (two plans, same-day emails on days 0, 30 and 150).** First confirm on one contact who reached day 30 of New Website Lead: open each plan's details on the lead profile; a plan an automation started says "Plan started via [Automation Name] automation." Then your choice:
   - Admin > Action Plans, New Website Lead, Edit, delete step 10 (Add tag(s): nurture), Save, so only Long-Term Nurture starts.
   - Or Admin > Automations, turn off Market Email in the Enabled column, and add the nurture tag by hand where you want the market email.
6. **Two closing-day emails.** Confirm the stage link as in item 5. Then your choice: Admin > Action Plans, Under Contract to Close, Edit, delete step 6 (Happy Closing Day!), Save; or Admin > Action Plans, Closing Day Thank You, Edit, delete step 1 (Happy Closing Day), Save.
7. **Stop on reply off.** Admin > Action Plans, Facebook Seller Lead, Edit, check "Automatically pause this action plan when the lead responds," Save. Do the same for Monthly Market Email. Under Contract to Close: your call (question 3).
8. **Referral and Sign Call have no plan.** If either should start one: Admin > Lead Flow, the source, set its action plan. If agents work them by hand on purpose, leave them.
9. **Portal Buyer 14 Day ends with no next step.** Admin > Action Plans, Portal Buyer 14 Day, Edit, add a last step, such as "Run [days] days after the previous step: Change stage" to the stage you use for these leads, or "Create task: decide what's next," Save.
10. **Hot Prospect, Active Client and Sphere have nothing attached.** If a stage should start a plan: Admin > Automations, + Add Automation, trigger Stage Changed to that stage, action: the plan, Save and Enable. No new automated texts.
11. **Long-Term Nurture's 120-day silence.** If you want a touch sooner: Admin > Action Plans, Long-Term Nurture, Edit, add a step between step 2 and step 3 or shorten step 3's run, Save.
12. **Confirm:** the Website (IDX) consent records (date, number, wording) for each lead, and the company name and address in Admin > Company, which Follow Up Boss's email unsubscribe footer uses.

## Questions for the Team

1. What does HomeFinder Example's lead form say about texts, and whose name does it give? (Your note: "not sure what their form says about texting.")
2. Can Sample SignIn App tell Follow Up Boss which visitors checked "OK to text me"? (Your note: "The app sends every visitor to FUB the same way.")
3. Under Contract to Close has stop on reply off, and it sends "Happy Closing Day!" and moves the contact to Closed 30 days after Under Contract. Is the setting on purpose, and does day 30 match your real closing dates?
4. Should a website lead who reaches Nurture get both Long-Term Nurture and Monthly Market Email? (New Website Lead, steps 9 and 10.)
5. Referral and Sign Call have no plan, and Hot Prospect, Active Client and Sphere start nothing. On purpose?
6. Does Sample Drip Texter hold texts on Sundays and Utah legal holidays, and does it stop the campaign when a visitor replies? Your note says it sends 7 days a week, until 9 p.m.

## Check Before Sending

Before you share this audit or change anything in Follow Up Boss:
- **Plan names, steps and days:** from action plans.md (plans 1 to 9) and the printed PDF (Open House Visitor), with the day math under the inventory. Check each "Run X days" against the plan's Edit screen.
- **Automations, triggers and conditions:** from automations list.csv, rows 1 to 7, as you typed them. Back On Site is off (row 7).
- **Lead Flow sources, plans, initial texts and delays (5, 2 and 1 minutes):** from stages, lead sources and texting.txt. Check each against Admin > Lead Flow, Advanced Settings.
- **Quoted text:** the 3 initial texts and the 3 Open House 3 Text messages from stages, lead sources and texting.txt; the Thanks for Stopping By sentence from the printed PDF.
- **Consent capture by source:** your notes in stages, lead sources and texting.txt. Confirm each form's wording and that records are kept.
- **Same-day emails, days 0, 30 and 150; closing emails, day 30:** these depend on the stage-change link marked "to confirm."
- **Defaults:** 14 and 90 days, the house defaults, not your standard.
- **Counts:** 10 action plans, 7 automations (6 on), 6 sources, 9 stages, 6 automated text steps (3 initial texts and 3 campaign texts).
- **Before relying on any consent judgment:** consent records for every texting source, a Do Not Call scrub, quiet hours in the lead's time zone, Sample Drip Texter's own settings, the company name and address in Admin > Company, and the Utah Sunday and holiday question (Utah Code 13-25a-103(3)). Confirm with your broker or an attorney.
