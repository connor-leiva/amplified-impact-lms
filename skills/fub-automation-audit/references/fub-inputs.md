# Follow Up Boss: Where the Inputs Come From and How FUB Runs Them

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
