# Page Notes: Team Playbook Builder

Everything the page and its library card need that isn't in SKILL.md. Click paths were checked on 2026-11-08 against each vendor's help center; links are with each one.

## One-Line Promise

Upload your team's SOPs and get back a Claude skill your agents install, so they get your team's answer, with the section it came from, instead of texting you.

## Who It's For

Team leaders, owners and ops staff on real estate teams, any state, any brokerage. It came from the Forum survey: one leader asked for "an onboarding specialist any agent could ask real estate or SOP questions," and agent training the leader doesn't have to run was one of the two most-asked post-Forum requests (4 of 12). The leader runs this skill once; agents install what it builds.

## What to Upload, and Where It Comes From

Any mix of these, up to 20 files in one chat (Claude's limit per chat; 500 MB per file). Help Center: https://support.claude.com/en/articles/8241126-uploading-files-to-claude (checked 2026-11-08 by Amplified's vendor review).

- **Policy manual, SOPs, onboarding checklists, fee schedules, brand rules, tech how-tos.** Upload the PDF, Word or Excel file as it is.
- **Google Docs:** open the doc, then File > Download, and choose PDF or Microsoft Word (.docx). Source: https://support.google.com/docs/answer/49114 (checked 2026-11-08).
- **Google Drive without downloading:** with the Google Drive connector, click + in the chat, choose "Add from Google Drive," and search or paste the doc's link. Source: https://support.claude.com/en/articles/10166901-use-google-workspace-connectors (checked 2026-11-08). Drive reads text only, not images inside docs.
- **OneDrive or SharePoint:** connect Microsoft 365 under Customize > Connectors (find Microsoft 365, click Add), then ask Claude to read the folder. Available on every Claude plan. Source: https://support.claude.com/en/articles/15183774-connect-to-microsoft-365 (checked 2026-11-08 by Amplified's vendor review).
- **ClickUp Docs:** connect ClickUp from Customize > Connectors; its directory listing says it reaches ClickUp tasks, docs and Chat. Source: https://claude.com/marketplace/connectors/clickup (checked 2026-11-08). Exporting a ClickUp Doc to PDF is also possible, but ClickUp's help center blocked our check on 2026-11-08, so the page should send people to the connector, or to ClickUp support for export steps.
- **Training call recordings (Zoom):** in the Zoom web portal, click Recordings & Transcripts, open the Cloud recordings tab, and click the meeting's name; the audio transcript is a VTT file in the list of recording files. Needs a Pro, Business, Education or Enterprise Zoom account with cloud recording and audio transcription on. Source: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0064927 (checked 2026-11-08).
- **Other transcripts (Otter, Fathom, Granola):** a text export or a copy of the transcript works. We didn't check those vendors' export menus; the page should say "export or copy the transcript as text" without a click path.

## Things to Say to It

1. "Build our team playbook from these documents."
2. "Here's our agent handbook and onboarding checklist. My agents keep texting me the same questions. Make them something they can install."
3. "The fee schedule applies to every agent on the team." (Compensation stays out until the leader says this.)
4. "Use the policy manual's pond rule." (Settles a conflict; the skill rebuilds as version 1.1.)
5. "Here's our current playbook ZIP and the new lead routing SOP. Update it."
6. "We're on a Claude Team plan. What's the best way to get this to my agents?"

## What Comes Back

- A bottom line and the decisions it needs from the leader
- The playbook skill as a ZIP named after the team (for example `lantern-lane-example-team-playbook.zip`), already checked against Claude's upload rules
- Conflicts between documents, quoted side by side
- Gaps: the questions new agents ask that the documents don't answer, the three they'll hit first on top, plus documents the SOPs mention that weren't uploaded
- Stale sections (older than 12 months) and items for the broker to review
- A log of what was left out (personal data, individual compensation), by location only
- A 25-question test set: 20 the playbook should answer, 5 it should send to a person
- A draft message to agents with install steps, and sharing steps matched to the leader's Claude plan
- Check before sending: every number, date and dollar amount in the playbook with its source

The playbook itself answers agents only from the team's documents, ends every answer with the document and section, warns when a section is more than 12 months old, shows both sides of an unresolved conflict, and sends contract, legal and compliance questions to the broker.

## What It Won't Do

- Write a policy the documents don't have, or pick a winner when two documents disagree
- Include anyone's individual split, deal or personal details, phone numbers, codes, passwords, or wire and account numbers
- Include a fee or split schedule unless the leader says it applies to every agent
- Answer contract, legal, compliance, tax or brokerage-wide questions (the playbook routes those to the broker or the brokerage)
- Send the message to agents, share or provision the skill, or write to Drive, ClickUp or the CRM
- Replace Follow Up Boss, Sisu or the transactions team: it explains the team's written rules; it doesn't route leads, score agents or keep deal deadlines

## What the Person Needs

- **The leader:** a Claude account with code execution on (on by default for Free, Pro, Max and Ultra: Settings > Capabilities > "Code execution and file creation," called "Create and edit files" in the updated settings). Skills require it. Source: https://support.claude.com/en/articles/12512180-use-skills-in-claude (checked 2026-11-08).
- **Each agent:** their own Claude account, or a seat on the team's Claude Team or Enterprise plan. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; the claude.com docs and Anthropic's platform docs leave Free out. The page should say skills are on paid plans and "may also work on Free."
- **Connectors:** optional (Google Drive, Microsoft 365, ClickUp), read only.
- **Cost:** nothing beyond the Claude plan. No other accounts.
- **Time:** one chat for the leader; about two minutes per agent to install, or none if an owner provisions it on a Team or Enterprise plan.

## Run / Draft / Own

- **Run:** reads every document, sorts it by topic, finds conflicts, gaps and stale sections, strips personal data, and checks and packages the skill.
- **Draft:** the playbook, the test set, and the message to agents, all for the leader to read first.
- **Own:** every policy, which version wins a conflict, whether a fee schedule applies to everyone, sharing the skill, and any decision about a person.

## FAQs

**Does my agents' data or my SOP text get used to train AI?** On Free, Pro, Max and Ultra, that depends on each person's setting: Settings > Privacy > "Help Improve our AI models." On Team and Enterprise, chats aren't used for training by default. Sources: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings and https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training (checked 2026-11-08 by Amplified's vendor review). The playbook itself holds only team policies: no client data, no personal contact details.

**What happens when a policy changes?** Upload the current playbook ZIP and the changed document and say "update it." The skill raises the version and lists what changed. On a Team or Enterprise plan, a shared skill updates for everyone at their next use; on individual accounts, each agent deletes the old version and uploads the new one (the Help Center doesn't describe replacing a skill in place).

**My documents disagree with each other. Will it guess?** No. It quotes both, asks you to choose, and until you do, the playbook shows agents both versions and tells them to ask you.

**Can agents who use ChatGPT use it?** Not this version. The playbook is a Claude skill, and ChatGPT can't install one. See "Why There's No ChatGPT Version."

**We're not in Utah. Does it work?** Yes. Everything comes from your own documents, so it works in any state and with any brokerage. It doesn't check your documents against state law; it flags items for your broker instead.

## Practice Prompt

Attach the five practice files and say:

"Build our team playbook from these five documents. The fee schedule applies to every agent on the team."

What to look for: it catches the pond rule conflict (10 days versus 14), lists pay timing and time off as the gaps, flags the 2024 onboarding checklist as stale, holds two outdated buyer steps for the broker, and leaves out the one agent's individual split. sample.md is that run.

## Why There's No ChatGPT Version

The job's output is a Claude skill that agents install, and ChatGPT can't install or run one, so a ChatGPT Project version of the builder would hand the leader something agents can't use. Custom GPTs retire on December 11, 2026 (https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq), and shared ChatGPT Projects are small on Free (5 files and 5 collaborators; https://help.openai.com/en/articles/6825453-chatgpt-release-notes), both checked 2026-11-08 by Amplified's vendor review. A later version could also export the playbook as a shared ChatGPT Project for teams on paid ChatGPT plans; that's an open question for Connor.

## Suggested Library Keywords

team playbook, SOP, onboarding, agent onboarding, team policies, policy manual, agent handbook, new agent questions, team knowledge base, onboarding assistant, Follow Up Boss pond rules, transaction handoff, team leader, ops, Claude skill builder

## What Was Tested, and What Wasn't

**Tested (2026-11-08):**
- The practice set (five documents: one conflict, two obvious gaps, one individual split, plus a stale checklist, outdated buyer steps, phone numbers and a door code): passed 12 of 12 checks
- Eval 1, five documents from another team with a closing gift conflict and two gaps: passed 11 of 11; a no-skill baseline passed 2 of 11 (it picked a winner in the conflict, wrote policy for both gaps, and gave the wrong upload path)
- Eval 2, individual splits, an unconfirmed fee schedule, phone numbers, a personal email, an alarm code and trust account numbers: passed 9 of 9 after three fixes
- Eval 3, a team name containing "Claudette," a May 2024 manual, a training call that changes a rule, and a Team plan: passed 8 of 8 after two fixes
- Every generated playbook passed the skill's own check script and the repo's SKILL.md rules (scripts/skills.mjs frontmatter parsing), and each ZIP has one folder at its root

**Not tested:**
- Uploading a generated ZIP to a live claude.ai account (no account in the build environment). The ZIPs follow every documented rule, and Amplified's own skills upload in the same format.
- Asking questions of an installed playbook (the 25-question test sets are written, not run)
- Google Drive, Microsoft 365 and ClickUp connector reads (no connected accounts); scanned image-only PDFs; sets over 20 files
- Utah Life's real onboarding documents (the handoff's private fixture), which Connor hasn't sent yet
- Whether claude.ai accepts a description that contains the word "claude" inside a team's name (the documented reserved-word rule covers only the name)
