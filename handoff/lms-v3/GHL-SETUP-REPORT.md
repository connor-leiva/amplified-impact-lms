# GHL setup for the Week 0 Intake: done. Handoff to Claude Code

**Status (Fri Nov 20, 2026):** the 23 contact custom fields exist in GHL. Claude in Chrome created them from
`GHL-SETUP-BRIEF.md` while Connor watched. Its report is at the end of this file, unedited.

## Checked against the spec

- **All 23 fields are there, with exactly the keys the spec expects** (`IMPLEMENTATION-SPEC.md`, Appendix A), in the
  same order: 23 of 23 match.
- **Types match:** 14 Single line, 8 Multi line, 1 date. All on Contact, in the folder `AI Accelerator Intake`.
- **Sub-account:** Amplified Impact LLC (Farmington, Utah), location id (left out of this public copy; it is in Connor’s records).
- **No field ids yet.** GHL's field list doesn't show them. You get them from the keys (step 2 below).

## What Claude Code does next (spec Phase 8)

1. **Confirm the location before anything else.** The LMS's `GHL_LOCATION_ID` must equal (left out of this public copy; it is in Connor’s records). If
   it doesn't, stop and tell Connor: the fields are in this sub-account and nowhere else. (The README describes a
   move between two locations. If that move is still ahead, the fields have to exist in the new one too.)
2. **Turn keys into ids.** Extend `pnpm --filter @ai/api ghl:setup` to read the location's custom fields once, match
   the 23 keys below, and print the `GHL_FIELD_INTAKE_*` lines for Connor to paste into Railway. Read-only. If a key
   is missing, name it and print nothing. The token needs to be able to read custom fields
   (`locations/customFields.readonly`); if it can't, say so, don't work around it.
3. **The date.** GHL has no date-only type any more: `AI Intake Submitted On` is a "Date & time" field set to
   collect a date. It is the same type as the existing AI Purchase Date field, which the LMS already fills with
   `chicagoDate()` (`YYYY-MM-DD`, America/Chicago). Send the submitted date the same way, through the same function.
4. **Never blank a field.** `ghl.ts` sends a value only when there is one, so an existing contact's field is never
   cleared. The intake sync follows that rule too: an unanswered question is simply not sent. (Appendix A used to say
   an empty answer clears the field. That was wrong for this repo and is corrected.)
5. **The owner-to-operator link.** GHL's screen for it exists (Settings → Objects → Contacts → Associations) and
   takes a contact-to-contact pair with two labels. None exists yet. Create "Team owner" / "Operator" once, through
   the API, on first run, as Phase 8 step 3 says. The token needs the association scopes; if it lacks them, stop and
   tell Connor.
6. **The tag.** `ai-intake-submitted` doesn't exist yet; it is created on first use. **Hold it until Connor answers
   Q-18:** GHL already has a tag `intake-accelerator`, created Nov 11, that the LMS's code never mentions. He decides
   whether the two mean the same thing.
7. **Dry run first,** as the spec says: one payload shown to Connor with values redacted, then on.

## The keys, and the setting each one fills

| Field key in GHL | LMS setting for its id |
|---|---|
| `contact.ai_intake_name` | `GHL_FIELD_INTAKE_NAME` |
| `contact.ai_intake_team` | `GHL_FIELD_INTAKE_TEAM` |
| `contact.ai_intake_size` | `GHL_FIELD_INTAKE_SIZE` |
| `contact.ai_intake_lead_desk` | `GHL_FIELD_INTAKE_LEAD_DESK` |
| `contact.ai_intake_cadence` | `GHL_FIELD_INTAKE_CADENCE` |
| `contact.ai_intake_one_on_ones` | `GHL_FIELD_INTAKE_ONE_ON_ONES` |
| `contact.ai_intake_operator` | `GHL_FIELD_INTAKE_OPERATOR` |
| `contact.ai_intake_operator_name` | `GHL_FIELD_INTAKE_OPERATOR_NAME` |
| `contact.ai_intake_invited` | `GHL_FIELD_INTAKE_INVITED` |
| `contact.ai_intake_ai` | `GHL_FIELD_INTAKE_AI` |
| `contact.ai_intake_plan` | `GHL_FIELD_INTAKE_PLAN` |
| `contact.ai_intake_account` | `GHL_FIELD_INTAKE_ACCOUNT` |
| `contact.ai_intake_chatgpt_admin` | `GHL_FIELD_INTAKE_CHATGPT_ADMIN` |
| `contact.ai_intake_books` | `GHL_FIELD_INTAKE_BOOKS` |
| `contact.ai_intake_books_close` | `GHL_FIELD_INTAKE_BOOKS_CLOSE` |
| `contact.ai_intake_sisu` | `GHL_FIELD_INTAKE_SISU` |
| `contact.ai_intake_crm` | `GHL_FIELD_INTAKE_CRM` |
| `contact.ai_intake_google` | `GHL_FIELD_INTAKE_GOOGLE` |
| `contact.ai_intake_google_other` | `GHL_FIELD_INTAKE_GOOGLE_OTHER` |
| `contact.ai_intake_tasks` | `GHL_FIELD_INTAKE_TASKS` |
| `contact.ai_intake_problems` | `GHL_FIELD_INTAKE_PROBLEMS` |
| `contact.ai_intake_access` | `GHL_FIELD_INTAKE_ACCESS` |
| `contact.ai_intake_submitted_on` | `GHL_FIELD_INTAKE_SUBMITTED_ON` |

---

## Claude in Chrome's report (unedited)

I'll check which sub-account this tab is in first, then build the folder and the 23 fields and report back.

You're in **Amplified Impact LLC** (Farmington, Utah), location id (left out of this public copy; it is in Connor’s records). Contacts here already have the LMS's `lms-…` tags, so this looks like the sub-account the LMS syncs to, and I'll work here. Your contacts view has unsaved changes, so I'll leave that tab alone and do this in a new one. If this is the wrong sub-account, stop me now.

I created all 23 fields. They're on the Contact object, in a new folder called **AI Accelerator Intake**, and the folder shows 23 fields. There are 8 Multi line, 14 Single line and 1 date field.

| Field name | Field key | Type | Folder |
|---|---|---|---|
| AI Intake Name | `contact.ai_intake_name` | Single line | AI Accelerator Intake |
| AI Intake Team | `contact.ai_intake_team` | Single line | AI Accelerator Intake |
| AI Intake Size | `contact.ai_intake_size` | Single line | AI Accelerator Intake |
| AI Intake Lead Desk | `contact.ai_intake_lead_desk` | Single line | AI Accelerator Intake |
| AI Intake Cadence | `contact.ai_intake_cadence` | Multi line | AI Accelerator Intake |
| AI Intake One On Ones | `contact.ai_intake_one_on_ones` | Multi line | AI Accelerator Intake |
| AI Intake Operator | `contact.ai_intake_operator` | Single line | AI Accelerator Intake |
| AI Intake Operator Name | `contact.ai_intake_operator_name` | Single line | AI Accelerator Intake |
| AI Intake Invited | `contact.ai_intake_invited` | Single line | AI Accelerator Intake |
| AI Intake AI | `contact.ai_intake_ai` | Single line | AI Accelerator Intake |
| AI Intake Plan | `contact.ai_intake_plan` | Single line | AI Accelerator Intake |
| AI Intake Account | `contact.ai_intake_account` | Single line | AI Accelerator Intake |
| AI Intake ChatGPT Admin | `contact.ai_intake_chatgpt_admin` | Single line | AI Accelerator Intake |
| AI Intake Books | `contact.ai_intake_books` | Single line | AI Accelerator Intake |
| AI Intake Books Close | `contact.ai_intake_books_close` | Multi line | AI Accelerator Intake |
| AI Intake Sisu | `contact.ai_intake_sisu` | Multi line | AI Accelerator Intake |
| AI Intake CRM | `contact.ai_intake_crm` | Multi line | AI Accelerator Intake |
| AI Intake Google | `contact.ai_intake_google` | Single line | AI Accelerator Intake |
| AI Intake Google Other | `contact.ai_intake_google_other` | Single line | AI Accelerator Intake |
| AI Intake Tasks | `contact.ai_intake_tasks` | Multi line | AI Accelerator Intake |
| AI Intake Problems | `contact.ai_intake_problems` | Multi line | AI Accelerator Intake |
| AI Intake Access | `contact.ai_intake_access` | Multi line | AI Accelerator Intake |
| AI Intake Submitted On | `contact.ai_intake_submitted_on` | Date & time | AI Accelerator Intake |

The field list doesn't show field IDs, so I left that column out.

**Sub-account:** Amplified Impact LLC (Farmington, Utah), location id (left out of this public copy; it is in Connor’s records). I did the work in a separate tab and have closed it. Your contacts tab and its unsaved view changes weren't touched.

**Step 4**
- **Tag `ai-intake-submitted`:** No, it doesn't exist yet.
- **Linking two contacts:** Yes, that screen exists. It's the **Associations** tab under Settings → Objects → Contacts. Right now it only has GHL's two built-in links, contact to opportunity and contact to company. There's no contact-to-contact link yet. I opened **Create association** just to look: Contacts is one of the choices, and it accepts a pair of labels, so "Team owner" and "Operator" will fit. I cancelled it without saving.

**Fields I didn't create:** None.

**Surprises**
- **There's no "Date Picker" type in GHL anymore.** The only date type is "Date & time". As you chose, AI Intake Submitted On is set to collect a date only, which is the default. GHL's own Date of birth field shows as "Date & time" too. Claude Code should check that the LMS sends a date with no time. If the LMS already fills in your AI Purchase Date field, which is the same type, the same date format should work here.
- **There's already a tag called `intake-accelerator`** (created Nov 11). If it was meant to mark the same thing as `ai-intake-submitted`, decide which to keep before the LMS creates the new tag.

Nothing else was changed.
