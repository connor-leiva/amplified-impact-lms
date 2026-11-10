# FUB Automation Audit Guide

Part 1 is where each input comes from in Follow Up Boss and how Follow Up Boss runs plans and texts. Part 2 is the audit rules: reading the inputs, the inventory, gaps, overlaps, the texting-consent check, template wording, the fix list and Check Before Sending.

# Part 1: Where the Inputs Come From and How Follow Up Boss Runs Them

Last verified: 2026-11-10, against Follow Up Boss's help center (help.followupboss.com) and its API reference. Each fact names its article and the article's own "updated" date. Follow Up Boss changes; when the owner's screen differs from this file, the screen wins and the difference goes in Check Before Sending.

## There Is No Export of Plans or Automations

- A search of Follow Up Boss's help center on 2026-11-10 found no article on exporting, downloading or printing action plans or automations. Treat it as "no export found," not as a certainty.
- Follow Up Boss's API lists action plans by id, created, updated, name and status only, with no steps, and says that endpoint is "planned for deprecation as part of the Automations 2.0 rollout." It is not a way for an owner to get the steps out.
- So the inputs arrive as screenshots, a page printed to PDF from the browser, steps copied from each plan's edit screen, a list the owner types, or a CSV the owner made. Every one of these works. Never ask the owner to retype what a screenshot or file already shows.

## Where Each Input Comes From

Classic accounts (Action Plans and Automations):
1. **The plan list:** Admin > Action Plans, the All Action Plans folder. Columns: Name, Active (contacts it is running on), Engaged (contacts who replied to a plan email), Complete, Category, Actions (View, Edit, Duplicate, Share, Delete). (Action Plans Overview, updated 2025-02-25)
2. **Each plan:** Admin > Action Plans, the plan, Edit. It shows the name, the checkbox "Automatically pause this action plan when the lead responds," "Include all email addresses for email steps," "Share with everyone," and every step as "Run: X days after the previous step" plus the action: create task, send email, change stage, add note, add tag(s), remove tag(s), remove all tags, add or remove collaborators, pause all other action plans, or pause a specific action plan. (Action Plans Overview)
3. **Email templates in plans:** Admin > Email Templates (text templates: Admin > Text Templates), where a template is opened and edited. The template folders include a standard folder of the templates used in action plans; hovering shows which plans use each one. (How to Use Merge Fields, updated 2025-02-25; Folders for Action Plans and Templates, updated 2024-07-05)
4. **Automations:** Admin > Automations, each automation: its trigger or triggers, conditions, action, whether it runs once per person or every time, and the Enabled toggle. (Automations Overview, updated 2024-09-18)
5. **Lead Flow:** Admin > Lead Flow: each lead source with its agent or group, lender and action plan; a source's Advanced Settings hold its rules and any Initial Text Message (the text, the delay in minutes, the sending number). (Lead Flow Overview, updated 2024-11-15; Lead Flow: Initial Text, updated 2026-08-31)
6. **Stages:** Admin > Stages. Lead, Closed and Trash are system stages that can't be renamed or deleted. (Custom Stages, updated 2024-07-05)
7. **Lead sources:** the sources listed on Admin > Lead Flow.
8. **Texts sent from outside Follow Up Boss:** Follow Up Boss has no drip or mass texting of its own; teams connect a partner tool for drip, AI or mass texts. (Drip & Mass Texting Integrations, updated 2025-04-01) The campaign's steps and what starts it (usually a tag added in Follow Up Boss) live in that tool, so they come as a screenshot or the owner's copy.
9. **Text consent, by source:** only the owner knows how each source asks for consent. A screenshot of each form's consent wording, or the owner's description.

Automations 2.0 accounts: Admin > Automations shows each automation on a canvas: a trigger, then Controls (Conditions, Time Delay in days, hours or minutes) and Actions. Lead Flow assigns an automation to each source instead of an action plan. (Automations 2.0 Overview, updated 2026-07-22; Automations 2.0: Lead Flow Overview, updated 2025-12-01)

## Classic or Automations 2.0

- When an account switches to Automations 2.0, every action plan is converted to an automation and the old plans become read-only: they can be paused, resumed or deleted, not edited, created or started. Lead Flow then starts automations. Only the account owner can switch, and it can't be undone. (Automations 2.0 Migration, updated 2026-05-12)
- Automations 2.0 triggers: Stage Change, Tag Added, Deal Stage Change, Inquiry, Property Saved, Property Viewed, Calendar Date, Appointment, and Manual (needed to apply an automation by hand, in bulk, or from Lead Flow). Actions: Send Email, Reassign Agent or Lender, Add or Remove Collaborators, Add or Remove Tags, Create Task, Change Stage, Add Note, Pause Action Plans, Pause Automations, Run Automation. There is no text action. (Automations 2.0 Overview; Automations 2.0: Manual Trigger, updated 2026-05-12)
- Not confirmed in the help center: whether an Automations 2.0 automation stops by itself when the lead replies. In a 2.0 account, write stop on reply as "not confirmed for Automations 2.0" and ask the team.
- Not confirmed: whether Follow Up Boss's unsubscribe footer is added to emails sent by Automations 2.0. The help center says 2.0 emails are "sent from the account's connected email."

## How Follow Up Boss Runs Plans (the facts the audit relies on)

- **Step timing:** each step runs X days after the previous step, so a step's day from the start is the sum of every run up to it. (Action Plans Overview)
- **Send times:** an email set for day 0 sends right after the plan is applied; emails due on later days send around 9 a.m.; non-email steps post around 5 a.m., in the user's time zone setting. A Calendar Date automation starts its plan at 8 a.m. in the company time zone. (Action Plans Overview; Automations Triggered by a Date, updated 2024-09-11)
- **Email cap:** at most 4 action plan emails go to one contact in a day. (Action Plans Overview; Manually Assigning Action Plans, updated 2025-02-25)
- **Stop on reply:** with the checkbox on, the plan pauses when the contact replies by email or text, or after a call over 2.5 minutes through Follow Up Boss calling or its mobile app. A call logged by hand on the desktop does not pause it. (Action Plans Overview)
- **Edits:** editing a plan's steps or a template changes it for every contact who hasn't reached that step yet; a template edit changes it in every plan that uses it. (Action Plans Overview, FAQ)
- **Email opt-out:** opt-out wording is added automatically to every action plan and batch email and can't be edited; it uses the company information in Admin > Company. A contact who unsubscribes is tagged "unsubscribed" and gets no more action plan emails; one-to-one emails still go. (Unsubscribing from Marketing Emails, updated 2025-02-25)
- **Lead Flow:** one action plan starts per source for new leads. A second plan needs a tag step in the first plan and an automation on that tag (Follow Up Boss's own recipe), which shows that a tag added by a plan step starts a Tag Added automation. (Lead Flow: How to Start Two Action Plans, updated 2024-11-15)
- **A stage changed by a plan step:** the help center doesn't say whether it starts a Stage Changed automation. The audit treats it as starting one and lists it to confirm. To confirm on one contact: open the plan's details on the lead profile; a plan an automation started says "Plan started via [Automation Name] automation." (Automations Overview)
- **Classic automations:** they don't run on new leads (imported, added by hand, or a web lead); a tag sent with the lead's first event doesn't trigger them, but Advanced Lead Flow Rules can use that tag to start a different action plan; mass actions don't trigger them; by default each runs once per contact; if the same plan is already running or paused on the contact, nothing happens. (Automations Overview)
- **Mass apply:** classic action plans can't be mass applied. Automations 2.0 with a Manual trigger can be, by the owner or an admin. (Action Plans Overview; Automations 2.0: Mass Actions, updated 2026-05-12)
- **Pausing other plans:** a plan step can pause all other action plans, or one named plan. (Action Plans Overview)
- **Smart Actions (beta):** with Follow Up Boss calling, call recording and the Zillow two-way integration, its Automatic mode can move early Zillow stages by itself. The help center doesn't say whether that starts a stage-change automation. (Smart Actions, updated 2026-08-28)

## Automated Texts in Follow Up Boss

- **The Initial Text (also shown as Instant Response):** Follow Up Boss's own automated text. One first text per Lead Flow source rule, sent X minutes after the lead arrives, from the assigned agent's Follow Up Boss number (or the company number, or a team inbox number). It goes only to leads who registered on the website or made a property, general or seller inquiry, or visited an open house. If an agent texts first, it is skipped. Nothing turns on by itself; an owner or admin enables it. (Lead Flow: Initial Text; Instant Response, updated 2026-09-01)
- **Quiet hours:** initial texts are not sent from 9 p.m. to 8 a.m. in the assigned agent's local time; they queue to 8 a.m., and contact before then cancels them. That is the agent's time zone, not the lead's. The help center describes no Sunday or holiday hold. (After Hours Queued Text Messages, updated 2025-06-16; Instant Response)
- **Old action plan texts:** an initial text inside an action plan is not sent when an automation started the plan, only when Lead Flow applied it. (Automations Overview) Those texts were moved to Lead Flow, and their wording sits in the text template folder "Initial Text Messages - Lead Flow." (Lead Flow: Initial Text, FAQ) A "text" step in a classic plan copy is therefore either one of these or a step the owner wrote down from another tool: ask which.
- **One-to-one texting:** Follow Up Boss says its texting is for one-to-one conversations, "not for mass texting, drip texting, or spamming." (Calling and Texting Compliance, updated 2025-07-18)
- **Text opt-out keywords:** STOP, STOPALL, UNSUBSCRIBE, CANCEL, END or QUIT stops texts from every Follow Up Boss number on the account, including action plan and appointment reminder texts. (Texting Opt-in/Opt-Out, updated 2025-02-25) The federal list in `outreach-rules.md` also counts "revoke" and "opt out," and any reasonable way of saying stop; the team has to honor those by hand.
- **Follow Up Boss's own guidance, not legal advice:** "Filling out a form on a website is NOT an opt-in unless opt-in verbiage is present on the form"; a first text should introduce the agent and company and carry opt-out wording such as "Reply STOP to unsubscribe"; don't keep texting a lead who never replied. (Calling and Texting Compliance)

## Sources (all checked 2026-11-10)

- Action Plans Overview (updated 2025-02-25): https://help.followupboss.com/hc/en-us/articles/1500008539982-Action-Plans-Overview
- Manually Assigning Action Plans (updated 2025-02-25): https://help.followupboss.com/hc/en-us/articles/360014257253-Manually-Assigning-Action-Plans
- How to Use Merge Fields (updated 2025-02-25): https://help.followupboss.com/hc/en-us/articles/360014569454-How-to-Use-Merge-Fields
- Folders for Action Plans and Templates (updated 2024-07-05): https://help.followupboss.com/hc/en-us/articles/4403701382679-Folders-for-Action-Plans-and-Templates
- Automations Overview (updated 2024-09-18): https://help.followupboss.com/hc/en-us/articles/360048951553-Automations-Overview
- Automations Triggered by a Date (updated 2024-09-11): https://help.followupboss.com/hc/en-us/articles/12662110564503-Automations-Triggered-by-a-Date
- Automations 2.0 Overview (updated 2026-07-22): https://help.followupboss.com/hc/en-us/articles/33056241868311-Automations-2-0-Overview
- Automations 2.0 Migration (updated 2026-05-12): https://help.followupboss.com/hc/en-us/articles/33217901299095-Automations-2-0-Migration
- Automations 2.0: Manual Trigger (updated 2026-05-12): https://help.followupboss.com/hc/en-us/articles/33217440838679-Automations-2-0-Manual-Trigger
- Automations 2.0: Mass Actions (updated 2026-05-12): https://help.followupboss.com/hc/en-us/articles/33056540122775-Automations-2-0-Mass-Actions
- Automations 2.0: Lead Flow Overview (updated 2025-12-01): https://help.followupboss.com/hc/en-us/articles/36130830114839-Automations-2-0-Lead-Flow-Overview
- Lead Flow Overview (updated 2024-11-15): https://help.followupboss.com/hc/en-us/articles/360014570494-Lead-Flow-Overview
- Lead Flow: How to Start Two Action Plans (updated 2024-11-15): https://help.followupboss.com/hc/en-us/articles/12976895241623-Lead-Flow-How-to-Start-Two-Action-Plans
- Lead Flow: Initial Text (updated 2026-08-31): https://help.followupboss.com/hc/en-us/articles/43119269447959-Lead-Flow-Initial-Text
- Instant Response (updated 2026-09-01): https://help.followupboss.com/hc/en-us/articles/360014173813-Instant-Response
- After Hours Queued Text Messages (updated 2025-06-16): https://help.followupboss.com/hc/en-us/articles/360014174673-After-Hours-Queued-Text-Messages
- Custom Stages (updated 2024-07-05): https://help.followupboss.com/hc/en-us/articles/4402370671767-Custom-Stages
- Drip & Mass Texting Integrations (updated 2025-04-01): https://help.followupboss.com/hc/en-us/articles/4402371439639-Drip-Mass-Texting-Integrations
- Calling and Texting Compliance (updated 2025-07-18): https://help.followupboss.com/hc/en-us/articles/4409243718039-Calling-and-Texting-Compliance
- Texting Opt-in/Opt-Out (updated 2025-02-25): https://help.followupboss.com/hc/en-us/articles/360022160813-Texting-Opt-in-Opt-Out
- Unsubscribing from Marketing Emails (updated 2025-02-25): https://help.followupboss.com/hc/en-us/articles/11469480193687-Unsubscribing-from-Marketing-Emails
- Smart Actions (updated 2026-08-28): https://help.followupboss.com/hc/en-us/articles/37957434220055-Smart-Actions
- Follow Up Boss API, actionPlans (read 2026-11-10): https://docs.followupboss.com/reference/actionplans-get

# Part 2: Audit Rules

How to read the inputs and build each part of the audit. Follow Up Boss facts (timing, send times, what triggers what) are in Part 1; texting law basics are in `outreach-rules.md`.

## 1. Reading the Inputs

- **For every plan:** its name; how it starts (a Lead Flow source, an automation by name, by hand, or "not shown"); stop on reply (on, off, or "not shown"); every step in order, with its timing and action exactly as shown; template names; template wording only where the input shows it.
- **For every automation:** its name, trigger, conditions, action, on or off, and runs once or every time when shown. An automation that is off attaches nothing; list it and say it is off.
- **Day math.** When the copy says "X days after the previous step" (Follow Up Boss's own wording), a step's day from the start is the previous step's day plus X. Write it with the arithmetic: "day 150 (30 + 120)." When the copy says "Day N" with no "after the previous step," read it as day N from the start, say so in What I Used, and list it in Check Before Sending, because Follow Up Boss counts each step from the one before. Never switch readings inside one plan without saying so. Automations 2.0 delays in hours or minutes stay as written ("2 hours after the trigger").
- **Step types:** Email, Text, Task, Stage change, Tag, Note, Pause, Collaborator, Other. Call a step a Text only when the input says a text goes out by itself (a Lead Flow initial text, a texting tool's campaign, or a step the owner labeled as a text). A task such as "Text the lead" is a Task the agent does: list it as a manual text task.
- **A "text" step in a classic action plan:** Follow Up Boss's action plans have no text step of their own (Part 1). Say so, say the two things it can be (an old initial text, which Follow Up Boss sends only when Lead Flow applied the plan, or a step copied from another tool), and ask which. Still list it as an automated text in the consent check until the team says otherwise.
- **Unreadable or missing:** a word or number you can't read is [illegible]; a trigger, condition or setting the input doesn't show is "not shown." Never fill either in. If the owner's note guesses ("I think the seller tag starts it"), quote the guess as theirs and mark it not confirmed.
- **Source of every row:** the file name plus the plan number, page, row or screenshot number; "your message" for what the owner said in the chat.

## 2. The Inventory

One table, one row for each action plan, automation, Lead Flow initial text and outside texting campaign:

| # | Name | Kind | How it starts | What it sends, by day | Stop on reply | Ends with | Source |

- **Kind:** Action plan, Automation, Initial text (Lead Flow), Outside texting campaign.
- **What it sends, by day:** emails and texts with their days, then tasks; for example "Emails: days 0, 2, 7. Tasks: days 0, 1 (calls)." The day math goes in a note under the table or in the plan's detail when it isn't plain.
- **Ends with:** the last step and its day, such as "day 30: stage to Nurture, tag nurture."
- After the table, one line per plan only where something needs explaining (a reading assumed, a step that can't be read).

## 3. Gaps

Name each with the evidence and its source.

1. **Stages with nothing attached:** a stage on the stage list that no enabled automation has as its Stage Changed trigger. Lead Flow covers new leads in Lead; say whether anything starts when a contact is moved back to Lead. Trash is expected to have nothing: say so once, don't flag it. Without the automations list, this check can't be done: say so.
2. **Lead sources with nothing attached:** a source on Lead Flow with no plan or automation. Without the Lead Flow list or a lead source list, say it wasn't checked.
3. **No stop on reply:** a plan with the pause checkbox off or not shown. Off on a plan that sends emails or texts is a gap. Off on a plan that is mostly tasks for a current client may be on purpose: say so and ask.
4. **A plan that ends with no next step:** its last step is an email, a text or a note, and nothing hands the contact on. A next step is a stage change, a tag that an enabled automation listens for (match the tag name exactly), a step that starts or pauses another plan, or a task asking a person to call or decide. A tag nobody listens for is not a next step; say so. Without the automations list, a closing tag can't be checked: say so.
5. **Long silence:** the days between two steps in a row (any kind) above the team's own standard when the owner gave one. Otherwise, the defaults, labeled "default": more than 14 days in a plan for new leads, active clients or a transaction (started by Lead Flow, or by a lead, prospect, active client, under contract or closed stage), and more than 90 days in a nurture, past client or sphere plan. A plan you can't place: say which default you used. Calendar Date plans are skipped.

## 4. Overlaps

1. **Same trigger:** two or more enabled automations, Lead Flow entries or outside campaigns that start from the same event: the same stage change, the same tag, the same source, or one plan step day that both changes a stage and adds a tag that each start an automation. Show the chain from the event to each plan.
2. **Two messages the same day:** for each overlap, lay the plans side by side from the shared start and list every day where two or more emails or texts reach the same contact, with each plan, step and day math. Two day 0 emails both go out right away; later emails both go around 9 a.m.
3. **Past the 4 email cap:** Follow Up Boss sends at most 4 action plan emails to one contact a day. Say so only when a chain would pass it.
4. **Not an overlap:** the same plan triggered again (Follow Up Boss doesn't restart a plan that is running or paused); a plan whose day 0 step pauses the others (say that it does); a classic automation on a brand-new lead or on a tag the lead arrived with (it doesn't run); one flow by design, such as a source's initial text with its own plan, or a plan and the outside campaign its own tag step starts. List a flow's same-day messages once, under that flow, so the owner sees them, without calling them an overlap.
5. **Assumed links:** a stage changed by a plan step is treated as starting a Stage Changed automation (Part 1); mark each such link "to confirm" and give the one-contact check.
6. **Without the automations list:** say overlaps between automations weren't checked; check only Lead Flow and what the plans show.

## 5. Texting-Consent Risk

For every automated text (each Lead Flow initial text, each outside campaign step, each step the input labels as a text):

- **What starts it,** and every source or stage it can reach. A tag added for everyone from a source reaches everyone from that source.
- **Consent capture for each source it reaches,** as the inputs describe it: documented (the form's text consent wording is quoted or described), not documented (the form has no text wording), or not described. A phone number, a portal sending the lead, an inquiry, or the Initial Text being switched on is never consent.
- **Portal-only consent (a conservative default, `outreach-rules.md`):** wording that names only a portal, a lead company or "real estate professionals," and not the team or brokerage, counts as not documented for the team. The result is Risk, and the fix is no automated text to that source until the broker confirms the consent covers the team. When a portal or lead company source's consent isn't described, the Check asks whose name its wording gives.
- **The result,** one of three, with the reason:
  - **Risk:** it can reach leads with no documented consent, portal-only consent included.
  - **Check:** consent capture isn't described for at least one source it reaches. A Check on a text that reaches new leads is treated as a risk until the owner confirms the consent capture, and ranks with the risks in the fix list.
  - **Lower risk if records hold:** it reaches only sources whose forms carry text consent wording; confirm the wording and that records are kept.
- Treat every automated text to a new lead as a risk unless its trigger reaches only leads with documented consent. Never say legal, illegal, compliant, a violation or "allowed": say what to check.
- **Wording and timing:** does each text name the sender (the agent and the team or brokerage; a merge field that fills the agent's name counts, so say which one) and carry an opt-out line? When does it send? Follow Up Boss's queue uses the agent's time zone, not the lead's; an outside tool's window is whatever its settings say ("not shown" if the input doesn't say).
- **Manual text tasks:** one line listing them: the agent sends each one by hand, and the same consent rule applies before a first marketing text.
- **The basics block,** once, from `outreach-rules.md`, with its Last verified date: a marketing text sent with an autodialer needs prior express written consent (47 CFR 64.1200(a)(2)); what that consent is (a signed written agreement that authorizes the messages, gives the number, and says signing isn't a condition of buying, 64.1200(f)(9)); a phone number is not consent; whether a texting tool is an autodialer is a legal question (Facebook v. Duguid), so the house rule is no documented consent, no automated text; opt-out by any reasonable means, the seven words, honored within 10 business days, and what changes on November 25, 2026 (FCC 26-67); the sender's identity (64.1200(d)(4)); quiet hours 8 a.m. to 9 p.m. in the recipient's time zone (64.1200(c)(1)), with 8 p.m. as the house end time; the National Do Not Call Registry. Then: "Confirm with your broker or an attorney."
- **Utah mode:** add the lines in `utah-texting-notes.md` (Utah only). **General mode:** "State rules were not checked."

## 6. Template Wording: Three Checks Only

Only on templates whose wording is in the inputs. Quote the line once and suggest the smallest change. Never rewrite a template, and never comment on tone, length or sales copy.

1. **Opt-out and footer:** every automated text carries an opt-out line, such as "Reply STOP to opt out." Action plan emails get Follow Up Boss's unsubscribe wording automatically, so don't flag a missing unsubscribe line in them; add one Check Before Sending line to confirm the company name and address in Admin > Company, which that footer uses. Under the house's conservative defaults (`outreach-rules.md`), every email also carries a plain line that says it is a marketing email, such as "This is a marketing email from {Agent Name}, [Team or Brokerage Name]." Follow Up Boss's unsubscribe wording doesn't say that. Where an email template's wording is in the inputs and has no such line, recommend adding it to the template. It is a recommendation, not a legal finding: never call the email noncompliant. Email templates whose wording isn't in the inputs get one Check Before Sending line to look for it.
2. **Sender identity:** every automated text names the agent and the team or brokerage.
3. **Fair housing words:** words about people, schools or safety instead of the property, such as "perfect for families," "young families," "family-friendly," "great schools," "good schools," "safe neighborhood," "safe area," "exclusive," "integrated," "no kids," "adults only," "bachelor pad," "walking distance to church" or any place of worship. Suggest deleting the phrase or replacing it with a fact about the property, and pointing to official sources for schools. A word that only describes a feature ("family room," "walk-in closet") is fine.

## 7. The Fix List

Rank, highest first:
1. Automated texts that can reach leads with no documented consent, then Checks on texts to new leads (treated as risks until confirmed).
2. Automated texts with no sender or no opt-out line; fair housing words in a template that sends by itself.
3. Overlaps that send two messages on the same day, or past the 4 email cap.
4. Plans that send emails or texts with stop on reply off.
5. Lead sources with nothing attached.
6. Plans that end with no next step.
7. Active stages with nothing attached, then other stages.
8. Long silences.
9. Recommended under the conservative defaults, not findings: the marketing line missing from an email template.
10. Things only a person can confirm (consent not described, a day reading assumed, stop on reply not shown, a link marked "to confirm").

Each fix is one numbered item: what is wrong and where the audit found it, then the clicks in Follow Up Boss, in the account's version. When the fix is a choice (which of two plans keeps running, whether a source should get an automated text at all), give the options and say the owner decides. When the change is in an outside tool, say so and name the Follow Up Boss step that starts it. Remind once that editing a plan reaches only contacts who haven't reached that step yet. Never write that a change was made.

Click paths, classic:
- Turn on stop on reply: Admin > Action Plans, find the plan, Edit, check "Automatically pause this action plan when the lead responds," Save.
- Change or remove a step: Admin > Action Plans, find the plan, Edit, change or delete the step, Save.
- Change or remove an initial text: Admin > Lead Flow, the source, Advanced Settings, the Initial Text Message: edit it, or click the trash icon; then Save.
- Give a source a plan: Admin > Lead Flow, the source, set its action plan.
- Turn an automation off: Admin > Automations, the toggle in the Enabled column.
- Add a condition: Admin > Automations, the automation, + Add Conditions, then Save.
- Change a template's wording: Admin > Email Templates (or Text Templates), the template, edit it, and save. A template edit changes it in every plan that uses it.

Automations 2.0: Admin > Automations, the automation, edit the step or condition, Save Changes; its status (Active or Disabled) turns it on or off; Lead Flow sets each source's automation.

## 8. Questions for the Team

Each question names the input that raised it: a consent capture not described, a trigger guessed, a stop-on-reply setting not shown, a "Day N" reading, a stage with nothing attached that may be on purpose, a link marked "to confirm," an outside tool's send window.

## 9. Check Before Sending

Before the owner shares the audit or changes anything in Follow Up Boss: every plan, automation and template name; every day with its arithmetic; every trigger, condition and tag; every quoted line; every count; each with its source. Then every reading assumed, the consent records for each texting source, a Do Not Call scrub, quiet hours in the lead's time zone, the company name and address in Admin > Company, the marketing line in each email template, the outside tool's own settings, the state rules (the Utah lines, or "state rules were not checked"), and "confirm with your broker or an attorney" for every consent question.
