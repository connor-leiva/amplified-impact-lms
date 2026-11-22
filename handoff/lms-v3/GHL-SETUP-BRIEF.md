# GHL setup for the Week 0 Intake: a brief for Claude in Chrome

**Who this is for.** Claude in Chrome, working in Connor Leiva's HighLevel (GHL) account while Connor watches.
**What it is for.** The LMS is about to send each team's Week 0 Intake answers to that team owner's contact in GHL.
GHL needs somewhere to put them: 23 contact custom fields in one folder. This brief creates those and nothing else.

## Before you start (Connor)

1. Open Chrome signed in to GHL, **in the sub-account the LMS syncs to** (the one whose id is the LMS's
   `GHL_LOCATION_ID`). If you have more than one sub-account, say which one out loud before Claude starts.
2. Your GHL user needs permission to manage custom fields (an admin does).
3. Paste this whole file to Claude in Chrome, or attach it.
4. Don't paste the LMS's GHL token anywhere. Nothing here needs it.

## Rules for Claude in Chrome

- **Create only.** Do not rename, edit, move or delete any field, folder, tag, contact, workflow, pipeline or
  association that already exists. Do not create a test contact. Do not send anything.
- **Check the sub-account's name first** and say it back to Connor before the first click.
- If a field with the same name already exists, **don't make a second one.** Note it in the report and move on.
- A field's type can't be changed after it is created. Check the type before you save each one.
- If a screen doesn't look the way this brief describes, stop and tell Connor what you see. Don't guess.
- When you finish, change nothing else. Give the report in the last section.

## Step 1. Make the folder

Settings → Custom Fields. Set the object to **Contact**. Open the **Folders** tab → **Create folder** → name it
exactly `AI Accelerator Intake` → Create.

## Step 2. Create the 23 fields

For each row: Settings → Custom Fields (object: Contact) → add a field → choose the **Type** → enter the **Field
name** exactly as written → put it in the folder `AI Accelerator Intake` → save. Leave placeholder and every other
option at its default. GHL builds the field's key from the name, which is why the names are short and plain.

| # | Field name (type it exactly) | Type | It will hold the answer to |
|---|---|---|---|
| 1 | AI Intake Name | Single Line | Your name and email. |
| 2 | AI Intake Team | Single Line | Your team's name and brokerage. |
| 3 | AI Intake Size | Single Line | Team size (how many agents and staff today). |
| 4 | AI Intake Lead Desk | Single Line | Who leads your lead desk? |
| 5 | AI Intake Cadence | Multi Line | Your weekly meeting cadence (meetings, day and time, who runs each). |
| 6 | AI Intake One On Ones | Multi Line | Do you hold 1:1s with your agents? |
| 7 | AI Intake Operator | Single Line | Who is your operator? |
| 8 | AI Intake Operator Name | Single Line | Their name and email. |
| 9 | AI Intake Invited | Single Line | Have you invited them in the portal yet? |
| 10 | AI Intake AI | Single Line | Which AI will your team use for the course? |
| 11 | AI Intake Plan | Single Line | Which plan are you on, or will you be on by Monday, November 30? |
| 12 | AI Intake Account | Single Line | Whose AI account runs your hires? |
| 13 | AI Intake ChatGPT Admin | Single Line | On ChatGPT only: does that person have admin access to your ChatGPT workspace? |
| 14 | AI Intake Books | Single Line | Your accounting system. |
| 15 | AI Intake Books Close | Multi Line | Who owns your accounting and reports, and what day do your books usually close each month? |
| 16 | AI Intake Sisu | Multi Line | Do you use Sisu? |
| 17 | AI Intake CRM | Multi Line | Your CRM. |
| 18 | AI Intake Google | Single Line | Email, calendar and files: is your team on Google Workspace? |
| 19 | AI Intake Google Other | Single Line | If you are not on Google, what do you use? |
| 20 | AI Intake Tasks | Multi Line | Where your tasks live. |
| 21 | AI Intake Problems | Multi Line | Three recurring problems you'd like off your plate. |
| 22 | AI Intake Access | Multi Line | Known access restrictions. |
| 23 | AI Intake Submitted On | Date Picker | (set by the LMS when the team submits) |

Choices ("Claude" or "ChatGPT", the plan, yes or no) are **Single Line** on purpose, not dropdowns: the LMS writes the
chosen option's words, and a text field keeps working when an option is added to the form later.

## Step 3. Check your work

- The folder `AI Accelerator Intake` holds exactly 23 fields.
- Every one is on the **Contact** object.
- 8 are Multi Line, 1 is Date Picker, the rest are Single Line, as in the table.

## Step 4. Look, don't touch (two things to report)

1. **Tags.** Is there already a tag named `ai-intake-submitted`? Just report yes or no. The LMS creates it the first
   time it is used, so don't add it.
2. **Linking two contacts.** The LMS will also link a team's operator to the team's owner as a related contact,
   labelled "Team owner" and "Operator". Look in Settings for where contact-to-contact associations or labels are
   managed. Report whether that screen exists in this sub-account and what it is called. **Don't create one:** the
   LMS creates it itself once.

## Step 5. Report back

Reply with one table, a row per field, read from the field list on screen:

| Field name | Field key | Type | Folder |
|---|---|---|---|

The **field key** is the part GHL shows as `contact.something` (or inside `{{ }}`). Copy each one exactly: the
LMS's setup looks the fields up by key to get their ids, so a correct key is all it needs. If the screen also shows a
field id, add it as a fifth column; if not, leave it out.

Then answer: which sub-account you worked in; the two things from Step 4; any field you did not create and why;
anything on screen that surprised you.

## After this (Connor)

Save the report in the AI Office and give it to Claude Code. Claude Code turns the keys into the ids the LMS needs
(the `GHL_FIELD_INTAKE_…` settings), runs the sync in dry-run so you can see one payload, and only then turns it on.
