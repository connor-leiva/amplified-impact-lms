# Audit Rules

How to read the inputs and build each part of the audit. Follow Up Boss facts (timing, send times, what triggers what) are in `fub-inputs.md`; texting law basics are in `outreach-rules.md`.

## 1. Reading the Inputs

- **For every plan:** its name; how it starts (a Lead Flow source, an automation by name, by hand, or "not shown"); stop on reply (on, off, or "not shown"); every step in order, with its timing and action exactly as shown; template names; template wording only where the input shows it.
- **For every automation:** its name, trigger, conditions, action, on or off, and runs once or every time when shown. An automation that is off attaches nothing; list it and say it is off.
- **Day math.** When the copy says "X days after the previous step" (Follow Up Boss's own wording), a step's day from the start is the previous step's day plus X. Write it with the arithmetic: "day 150 (30 + 120)." When the copy says "Day N" with no "after the previous step," read it as day N from the start, say so in What I Used, and list it in Check Before Sending, because Follow Up Boss counts each step from the one before. Never switch readings inside one plan without saying so. Automations 2.0 delays in hours or minutes stay as written ("2 hours after the trigger").
- **Step types:** Email, Text, Task, Stage change, Tag, Note, Pause, Collaborator, Other. Call a step a Text only when the input says a text goes out by itself (a Lead Flow initial text, a texting tool's campaign, or a step the owner labeled as a text). A task such as "Text the lead" is a Task the agent does: list it as a manual text task.
- **A "text" step in a classic action plan:** Follow Up Boss's action plans have no text step of their own (`fub-inputs.md`). Say so, say the two things it can be (an old initial text, which Follow Up Boss sends only when Lead Flow applied the plan, or a step copied from another tool), and ask which. Still list it as an automated text in the consent check until the team says otherwise.
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
5. **Assumed links:** a stage changed by a plan step is treated as starting a Stage Changed automation (`fub-inputs.md`); mark each such link "to confirm" and give the one-contact check.
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
- **Utah mode:** add the lines in `utah-texting-notes.md`. **General mode:** "State rules were not checked."

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
