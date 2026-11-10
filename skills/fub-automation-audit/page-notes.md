# Page Notes: FUB Automation Audit

Everything the page and its library card need that isn't in SKILL.md. Facts checked 2026-11-10; sources inline. The skill is paid (in the Amplified Skill Library), so the page shows its hero and sample with the Skill Library card; the setup words below are for the day it is free.

## One-Line Promise

Copy your Follow Up Boss action plans, automations and lead sources into one chat and see, in one place, where nothing happens, where two plans double up, and which automated texts could reach someone who never agreed to texts, with every fix written as steps you take in Follow Up Boss.

## Who It's For

Team owners, team leaders and the ops or admin person who built (or inherited) a team's Follow Up Boss action plans and automations, in any state. Most useful once a team has more than a handful of plans, an outside texting tool, or plans built by different people over the years.

## Connor's Filter: What It Adds That Follow Up Boss Doesn't

Follow Up Boss already shows each plan's steps and its Active, Engaged and Complete counts (Admin > Action Plans), each automation on its own (Admin > Automations), each source's plan and initial text (Admin > Lead Flow), and which sources have no instant response text yet (the Instant Response coverage status). The skill doesn't rebuild any of that and doesn't recommend more automated texts. What no Follow Up Boss screen gives in one place is the view across plans: which stages and sources have nothing attached, which two plans start from the same event and land on the same day, which plans keep emailing after a reply, and which automated texts, including ones from an outside texting tool, can reach a source with no documented consent. That cross-plan view is the whole product. Source for the Instant Response coverage status: "Instant Response" (updated 2026-09-01), https://help.followupboss.com/hc/en-us/articles/360014173813-Instant-Response , checked 2026-11-10.

## What to Upload, and Where It Comes From

**What we confirmed and what we could not.** We searched Follow Up Boss's help center on 2026-11-10 and found no way to export, download or print action plans or automations. Follow Up Boss's API lists action plans by name and status only, with no steps, and is marked for deprecation with Automations 2.0 (https://docs.followupboss.com/reference/actionplans-get, read 2026-11-10). So the inputs are screenshots, the browser's Print to PDF, steps copied from each plan's edit screen, or a list the owner types. We could not confirm: whether a browser's Print to PDF of the edit screen keeps every step on the page (untested in a real account), whether an Automations 2.0 automation stops on a reply, or what the automation share-link preview looks like when printed.

1. **Each action plan (required).** Admin > Action Plans, open the All Action Plans folder, click Edit on a plan. Take a screenshot (or print the page to PDF, or copy the steps) showing the name, the "Automatically pause this action plan when the lead responds" checkbox and every step. A long plan may need two screenshots. Source: "Action Plans Overview" (updated 2025-02-25), https://help.followupboss.com/hc/en-us/articles/1500008539982-Action-Plans-Overview , checked 2026-11-10.
2. **The automations list (strongly recommended).** Admin > Automations: each automation's trigger, conditions, action and whether it is enabled. Screenshots or a typed list. Only the account owner and admins can create automations, but everyone can view them. Source: "Automations Overview" (updated 2024-09-18), https://help.followupboss.com/hc/en-us/articles/360048951553-Automations-Overview , checked 2026-11-10.
3. **Lead Flow (recommended).** Admin > Lead Flow: each lead source's agent and action plan, and under each source's Advanced Settings, any Initial Text Message (the text, the delay and the sending number). Sources: "Lead Flow Overview" (updated 2024-11-15), https://help.followupboss.com/hc/en-us/articles/360014570494-Lead-Flow-Overview and "Lead Flow: Initial Text" (updated 2026-08-31), https://help.followupboss.com/hc/en-us/articles/43119269447959-Lead-Flow-Initial-Text , both checked 2026-11-10.
4. **The stage list.** Admin > Stages. Source: "Custom Stages" (updated 2024-07-05), https://help.followupboss.com/hc/en-us/articles/4402370671767-Custom-Stages , checked 2026-11-10.
5. **How each lead source asks for text consent.** A screenshot of each form's consent wording, or a sentence per source ("our Facebook form has no text wording"). Only the team knows this.
6. **Any outside texting tool.** Follow Up Boss has no drip or mass texting of its own; teams connect a partner tool (Follow Up Boss names several). A screenshot of each campaign, what starts it (usually a tag added in Follow Up Boss) and its send settings. Source: "Drip & Mass Texting Integrations" (updated 2025-04-01), https://help.followupboss.com/hc/en-us/articles/4402371439639-Drip-Mass-Texting-Integrations , checked 2026-11-10.
7. **Accounts on Automations 2.0.** After the switch, action plans become read-only automations; Admin > Automations shows each on a canvas with its trigger, time delays and actions. Screenshot each canvas. Source: "Automations 2.0 Migration" (updated 2026-05-12), https://help.followupboss.com/hc/en-us/articles/33217901299095-Automations-2-0-Migration , checked 2026-11-10.

Tip: before taking screenshots of anything that shows a lead's name or phone (a lead profile, a timeline), crop it out. The audit needs plan, template, tag and stage names, never a lead's details.

## Things to Say

1. "Here are our Follow Up Boss action plans, our automations list, and our stages and lead sources. Audit them: what's missing, what's overlapping, and are our automated texts a problem?"
2. "Screenshots of every action plan attached. Which ones don't stop when a lead replies?"
3. "Are any of our automated texts going to leads who never agreed to texts?"
4. "Which stages and lead sources have nothing attached?"
5. "Just the texting check, please."

## What Comes Back

- Flags, then a three-sentence bottom line: how many plans, automations and automated texts, the biggest risk, and the one fix to make first.
- What it used, including every missing piece and the checks it stopped.
- An inventory table: every plan, automation, Lead Flow initial text and outside texting campaign, with how it starts, what it sends by day, stop on reply, how it ends and where each row came from, plus the day math.
- Gaps: stages and lead sources with nothing attached, plans that don't stop on a reply, plans that end with no next step, long silences (your standard, or labeled defaults: 14 days in a new-lead or client plan, 90 in a nurture plan).
- Overlaps: plans started by the same event, and every day a lead would get two messages.
- Texting-consent risk: each automated text with what starts it, who it reaches, the consent capture you described and one of three results (Risk, Check, Lower risk if records hold), the federal basics with sources, and in Utah, the Sunday and holiday question.
- Template wording notes, three checks only: opt-out lines, sender identity and fair housing words.
- A ranked fix list, each fix written as clicks in Follow Up Boss (or the outside tool), with choices left to you.
- Questions for your team and a Check Before Sending list.

## What It Won't Do

- Change, pause, create, delete or apply anything in Follow Up Boss, or send anything. Every fix is a step you take.
- Say a text is legal or illegal. It says what to check and sends consent and state-law questions to your broker or an attorney.
- Invent a step, delay, trigger or template wording, or rewrite your templates.
- Route, score or reassign leads, write new drip campaigns, or recommend more automated texts.
- Clean up the database (Database Health Check), run the weekly pipeline review (FUB Pipeline Review), write the team playbook (Team Playbook Builder) or reply to one new lead (Speed-to-Lead Reply).

## What You Need

- **Claude:** a plan with skills. Claude's help center says skills work on every plan and need code execution turned on (Settings > Capabilities > Code execution and file creation, called "Create and edit files" in the newer settings), which is on by default for Free, Pro, Max and Ultra; Claude's docs list Pro and up for custom skills, so Free is unconfirmed. This skill does no code math itself. Sources as on the other skill pages: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude (checked 2026-11-08 for D-068).
- **ChatGPT version:** a ChatGPT Project with four files (instructions.md, which downloads as fub-automation-audit-instructions.md, fub-automation-audit-guide.md, outreach-rules.md and utah-texting-notes.md), plus paste.txt in the Instructions box. It reads screenshots, PDFs and text, so data analysis isn't needed. Not run inside ChatGPT.
- **Follow Up Boss:** a login that can see Admin > Action Plans, Admin > Automations and Admin > Lead Flow (owner or admin is easiest). No connector.
- **Cost:** nothing beyond your Claude or ChatGPT plan.
- **Computer:** screenshots and Print to PDF are easiest on a computer.

## Run, Draft, Own

- **Run:** reads every screenshot, page and list, builds the inventory with a source for each row, works out each step's day, finds gaps, overlaps and every automated text.
- **Draft:** the ranked fix list, the questions for the team and the template wording notes.
- **Own:** every change in Follow Up Boss and any texting tool, which sources get automated texts, the consent records and form wording, and every consent or legal question (broker or attorney).

## FAQs

**Doesn't Follow Up Boss already show this?** It shows each plan, each automation and each Lead Flow source on its own, and it flags sources with no instant response text. It doesn't line them up: which stages and sources have nothing, which two plans start from the same event and email the same lead on the same day, and which automated texts reach sources with no consent capture. That's what this adds.

**Will it change anything in Follow Up Boss?** No. It only reads what you paste or attach, and every fix comes back as steps you take. It never pauses or edits a plan, even if you ask.

**Our action plans don't have a text step. Where do automated texts come from?** In Follow Up Boss, the automatic first text is set per lead source in Lead Flow (Initial Text, also shown as Instant Response). Drip texts come from an outside tool, usually started by a tag a plan adds. The audit looks for both, so include your Lead Flow texts and any texting tool's campaigns.

**Will it tell me whether our texts are legal?** No. It tells you which automated texts can reach people with no documented consent, what to check, and the federal basics with their sources; your broker or an attorney makes the call. In Utah it adds Utah's Sunday and holiday question.

**We're on Automations 2.0. Does it work?** Yes: screenshot each automation's canvas. The fixes follow the 2.0 screens. One thing Follow Up Boss's help center doesn't say is whether a 2.0 automation stops when a lead replies, so the audit lists that as a question.

## Practice Prompt

With the four practice files attached: "Here are our Follow Up Boss action plans, our automations list, and our stages and lead sources. Audit them: what's missing, what's overlapping, and are our automated texts a problem?"

The practice files are a made-up Utah team's (Gumdrop Hollow Home Team, Example Ridge Realty): nine action plans copied from the edit screens (a .md file), a tenth printed to PDF, an automations list the owner typed (CSV), and the stages, lead sources, initial texts, consent notes and an outside texting tool's campaign (a .txt file). Look for the two plans that start together on the move to Nurture, the two closing-day emails, the three stages with nothing attached, the plan with no stop on reply, and the Facebook text and open house texts that reach people with no documented consent. Expect a result like sample.md. The audit doesn't depend on the day it runs.

## Suggested Library Keywords

follow up boss fub action plans automations automations 2.0 lead flow initial text instant response drip campaign drip texts auto text texting consent tcpa opt-out reply stop stop on reply pause on reply crm audit overlapping drips stages lead sources nurture team owner ops admin

## What Was and Wasn't Tested

Tested (evals/runs, graded in each grading.md):
- The practice set (eval 1): 14 of 14 expectations and all objective checks, kept as sample.md. Utah mode, classic Action Plans, four files including a printed PDF.
- Case 2, three typed plans with no automations or stage list, general mode (Idaho): 11 of 11 and all objective checks. It named what it couldn't check, invented no trigger, named all five text steps and explained the action plan "text" step Follow Up Boss doesn't have.
- The objective checker recomputes every day and gap the output writes out with its arithmetic.

Not tested:
- Real Follow Up Boss screenshots or a real printed edit screen (every input was made up); real Automations 2.0 canvases.
- Screenshots as the only input (the practice uses a PDF and text files).
- A real outside texting tool's export, and Follow Up Boss's own Instant Response screens.
- The ChatGPT version inside ChatGPT; Claude Free.
- A no-skill baseline and an independent second run.
- Whether a stage changed by a plan step starts a Stage Changed automation (the help center doesn't say; the audit marks it "to confirm" and gives a one-contact check).
