# Follow Up Boss: The Export and What to Set Up

What the agent needs to get the list out of Follow Up Boss, and what to set up inside it so Follow Up Boss does the reminding. Nothing in this project sets anything up or writes to the CRM: these are instructions for the agent, or for the Account Owner or an admin where Follow Up Boss requires one.

Last verified: 2026-11-10. The export, Smart List, action plan and texting facts were checked against Follow Up Boss's help center on 2026-11-08 (for another Amplified Impact tool). The date-field and automation facts were checked on 2026-11-10; help.followupboss.com blocks direct reads, so they come from search excerpts of the two articles listed under Sources. Follow Up Boss changes its screens often: when a click path here and the user's screen disagree, trust the screen and say so.

## Getting the Export

- Who can export: the Account Owner by default. Only the owner can give other users the Can Export permission (Admin > Teams, the Can Export checkbox). The owner gets an email each time anyone exports. An agent on a team without Can Export asks the owner for the file, or for the permission.
- Steps: People > All People, check the box next to Name and choose Select All, click Export (the downward arrow), check Export All Columns, then Yes, Export People. A CSV downloads at once. Exporting never removes or changes contacts.
- All People holds every contact the user can see: an agent sees only their assigned, collaborator and pond contacts; an admin sees the whole account.
- Without Export All Columns, the file holds only the name and the columns in the current view.
- The help center does not say whether Last Communication, Last Activity or custom fields (such as Home Anniversary or Text Consent) come through in an all-columns export. Use them when the file has them. If Last Communication is missing, say so: the rotation then goes in file order.
- Follow Up Boss has no consent column of its own. Teams that track texting consent use a custom field or a tag, which exports with the contact.

## What to Set Up (the Agent's Instructions)

### 1. A Text Consent field, if there isn't one

- The Account Owner adds a custom field (Admin > Custom Fields), such as "Text Consent," and fills it only from written records: the date and where the yes came from ("Yes - signed buyer form 2023-09-02").
- A website form or an open house sign-in counts only if it had text consent wording (Follow Up Boss's compliance page says a website form is not an opt-in unless it has opt-in wording).
- Tags for opt-outs: Do Not Text, Do Not Call, Do Not Email (Follow Up Boss suggests these itself) and Unsubscribed (Follow Up Boss adds it when someone unsubscribes from marketing email).
- Contacts who text STOP, STOPALL, UNSUBSCRIBE, CANCEL, END or QUIT are opted out of texts from every Follow Up Boss number on the account; their number shows in orange on the profile.

### 2. One Smart List per tier, for who is due

- Create one: People > All People > Filters, add filters, then + New List, name it, choose who to share it with, Save List. Each filter narrows the list.
- Filters to use: Tags (include, exclude), Stage, Last Communication ("was more than" a number of days ago), Email (is good), Phone (is good), and custom fields.
- Suggested lists, filled with the tier names the export actually uses:
  - "Past Clients: Due": Tags include Past Client (or Stage includes the past-client stages), Last Communication was more than 30 days ago.
  - "Close Sphere: Due": Tags include the close tier's tag, Last Communication was more than 60 days ago.
  - "Wider Sphere: Due": Tags include the wider tier's tag, Last Communication was more than 90 days ago.
  - "Text OK": Text Consent contains Yes; Tags exclude Do Not Text and Do Not Call.
- Every account already has a default Past Clients Smart List (Stage includes Closed, Last Communication more than 90 days ago). Say so when it overlaps.
- To catch people never contacted, add a second list with Last Communication is empty.

### 3. A recurring Home Anniversary date, and an automation that reminds the agent

- The Account Owner creates the field: Admin > Custom Fields > Add Custom Field, a name such as "Home Anniversary," Field Type Date, and check Occurs Every Year. Recurring dates show on the Follow Up Boss calendar in purple.
- Fill it with each past client's closing date. The output's anniversary list (Check Before Sending) has every date the export holds, so nothing has to be looked up.
- An admin creates an action plan (Admin > Action Plans) whose first step is a task for the agent: "Home anniversary: send a personal note." Use a task, not an automatic email or text, so the message stays personal.
- An admin creates the automation (Admin > Automations): the Calendar Date trigger, the Home Anniversary field, "is in 0 days" (or a few days earlier, so a card arrives on the day), the action that starts that action plan, and "Run automation multiple times per person" so it repeats every year.
- The action plan starts at 8 AM on the trigger date, in the time zone on the company settings page.
- An action plan's initial text message does not send when an automation starts the plan. Texts stay manual anyway.

### 4. An action plan of tasks for each tier

- An admin creates one action plan per tier (Admin > Action Plans) made of tasks, one per planned touch in the 12-month plan (call, personal check-in, handwritten note, home value review). Delays between steps are set in days (about 30 days for a month).
- Action plans can send drip emails, create tasks and change a stage. For a sphere, tasks are better than automatic emails: the agent writes each touch from the drafts here.
- Action plans cannot be applied in bulk. Start one on each contact, or ask the owner or an admin about an automation (Admin > Automations) that starts it.

### Texting in Follow Up Boss

- Follow Up Boss's compliance page says its texting is for one-to-one conversations with people who expect to hear from you, not mass or drip texting, and warns against pasting the same text lead by lead. Each text draft here is a starting point the agent makes their own and sends by hand.
- Follow Up Boss has no built-in Do Not Call scrub; its help center points to an integration for that.
- Batch and action plan emails get Follow Up Boss's own unsubscribe footer, from the company information in Admin > Company. Keep one working opt-out and check that Admin > Company shows the real postal address.

## Other CRMs and Spreadsheets

- Another CRM: tell the agent to export every contact with every column their CRM allows, and to confirm the steps in that CRM's help center (not checked here). Give the setup in plain words: a saved list per tier, a yearly date field with a reminder, a consent field, and a task series per tier, using that CRM's name for each if the agent gives it.
- A spreadsheet: give the 12-month plan and this week's drafts, and suggest two columns to add (Last Touch and Text Consent, with the date and source of each yes) so the next run can rotate by oldest touch and draft texts. Never suggest re-keying the list into a CRM as part of this.

## Sources

Checked 2026-11-08 (as cited in Amplified Impact's Follow Up Boss export notes), with each article's own last update:

- Export Contacts to a Spreadsheet (2026-04-21): https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet
- Users, Roles & Permissions (2025-09-25): https://help.followupboss.com/hc/en-us/articles/4402370636567-Users-Roles-Permissions
- Smart Lists Overview (2026-07-22): https://help.followupboss.com/hc/en-us/articles/1500008374882-Smart-Lists-Overview
- Filter Definitions (2026-07-22): https://help.followupboss.com/hc/en-us/articles/360025651313-Filter-Definitions
- Default Smart Lists (2026-07-22): https://help.followupboss.com/hc/en-us/articles/4420635737239-Default-Smart-Lists
- Tags (2025-09-25): https://help.followupboss.com/hc/en-us/articles/360015171474-Tags
- Action Plans Overview (2025-02-25): https://help.followupboss.com/hc/en-us/articles/1500008539982-Action-Plans-Overview
- Texting Opt-in/Opt-Out (2025-02-25): https://help.followupboss.com/hc/en-us/articles/360022160813-Texting-Opt-in-Opt-Out
- Unsubscribing from Marketing Emails (2025-02-25): https://help.followupboss.com/hc/en-us/articles/11469480193687-Unsubscribing-from-Marketing-Emails
- Calling and Texting Compliance (2025-07-18): https://help.followupboss.com/hc/en-us/articles/4409243718039-Calling-and-Texting-Compliance
- Call Lists (2025-02-25): https://help.followupboss.com/hc/en-us/articles/360014082414-Call-Lists

Checked 2026-11-10 through search excerpts (the help center blocks direct reads):

- Automations Triggered by a Date: https://help.followupboss.com/hc/en-us/articles/12662110564503-Automations-Triggered-by-a-Date (the Date field with Occurs Every Year, the Calendar Date trigger, "is in 0 days," "Run automation multiple times per person," the 8 AM start in the company time zone, the initial text not sent when an automation starts a plan, owner-only custom fields, admins for action plans and automations)
- Never Miss a Birthday or Anniversary: https://help.followupboss.com/hc/en-us/articles/360025684874-Never-Miss-a-Birthday-or-Anniversary (Admin > Custom Fields > Add Custom Field, an action plan holding the anniversary step, yearly or one-time, recurring dates in purple on the calendar)
- Action plan delays in days: https://help.followupboss.com/hc/en-us/articles/1500008539982 (search excerpt: delays by minutes or hours are a feature request)

Not confirmed here (say "confirm with Follow Up Boss support" if it matters): whether custom fields and Last Communication come through in an all-columns export; whether the Calendar Date trigger can use the built-in Deal Close Date rather than a custom field; whether an import can fill Home Anniversary for existing contacts.
