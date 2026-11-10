# Team Workspaces in Claude and ChatGPT: What Each Plan Can Do

Last verified: 2026-11-10. Claude facts were read on support.claude.com that day. ChatGPT facts come from search excerpts of OpenAI's help center on 2026-11-10, because help.openai.com blocks direct reads; where two versions of an OpenAI page disagreed, both are given. Help centers change often: before a rollout, open the linked page and check the step.

Every fact below has its source at the end of its line. The plan table under "What This Means for a Team Brain" is this skill's own guidance built from those facts, not a vendor statement.

## Claude

### Projects (every plan)

- A project is a workspace with its own chats, knowledge base and instructions. Projects are available to all users, including Free; Free users can create up to five projects. [1]
- On paid plans (Pro, Max, Ultra, Team, Enterprise), project knowledge scales with retrieval (RAG) when it nears the context limit. [1]
- Claude's personalization article says project instructions are for paid plans only, while its projects article says projects are on every plan. Treat project instructions on Free as unconfirmed. [1] [4]
- To create one: Projects in the left sidebar (or claude.ai/projects), then "+ New Project", then a name and description (Claude can't see the name or description). [2]
- To set instructions: on the project page, "Set project instructions", then "Save instructions". They apply to every chat in that project. [2]
- To add knowledge: the knowledge base is on the right side of the project page; click "+" to add documents or text. [2]
- Archive: the three dots at the upper right of the project. Archiving keeps sharing settings, members and knowledge. [2] [3]

### Sharing a Project (Team and Enterprise Only)

- Project sharing is limited to Team and Enterprise plans. On Free, Pro, Max and Ultra there is no project sharing: each person's projects are their own. [1] [3]
- When creating a project on Team or Enterprise, choose "Keep it private" or "Share with your broader organization." [2]
- To share: the "Share" button to the right of the project name. General access is "Everyone at [your organization]" or "Only people invited." Add people by name or email, or paste a list. [3]
- Permission levels: "Can view" means a member sees the contents, knowledge and instructions and can chat in the project, but cannot edit it. "Can edit" means a member can change the instructions and knowledge and update member settings. [3]
- Chats inside a project are private by default, even in a project everyone can see. Sharing a project does not expose anyone's chats. [3]
- To remove someone: a member with "Can edit" opens the Share menu, selects that member's role, and chooses "Remove access." [3]
- Sharing with a group of people is Enterprise only, and in beta. [3]
- Owners can turn off project sharing for the whole organization (on Enterprise, also for specific roles). When it is off, existing shares remain, public projects become private, and no one can add new people. [3]

### Where Each Person's Own Layer Goes

- Account-wide instructions: click your initials at the lower left, then Settings, then "Your Claude", then "Instructions" (older layout: Account, "Instructions for Claude"). They apply to all of that person's conversations. [4]
- Project instructions apply only inside their project. [4]
- The help center does not say which wins when a person's account-wide instructions and a project's instructions disagree. [4]

### Memory

- Each project has its own memory. Inside a project, Claude uses that project's memory plus the person's memory from chats outside projects, but not other projects' memory. To keep a project's memory fully separate, turn off "Use account memory" under Memory on the project's page. [5]
- To turn memory on for yourself: Settings, then "Your Claude", then "Generate memory from chats" (older layout: Settings, Memory). [5]
- On Team and Enterprise, owners control memory in Organization settings, then Capabilities. In organizations created on or after October 31, 2026, memory starts on for members; in older organizations it is off until each member turns it on. Owners cannot view or edit members' memories. [5]
- The help center does not say whether a shared project's memory is visible to the other members. [5]

### Training

- Free, Pro, Max and Ultra: each person's setting decides whether chats help train models (Settings, then Privacy, the switch that starts "Help improve"). Team and Enterprise chats are not used for training by default. [6] [7] (Checked 2026-11-08 for the other skill pages.)

### The Team Plan

- A Team plan needs at least two members and holds up to 150 seats. Seats are Standard or Premium, and a team can mix them. Members get everything in Pro, including projects, plus access to "projects, knowledge bases, and collaboration features." [8]

## ChatGPT

### Projects and Sharing

- ChatGPT Team was renamed ChatGPT Business on August 29, 2025. Features stayed the same. [9]
- To make a project: New project in the left sidebar, a name, then Create project. Instructions: the three dots (•••) at the top right of the project, Project settings, the Instructions box, Save. Files go on the project's Sources tab. [10] (These steps as Amplified's other skill pages give them, checked 2026-10-22.)
- Project sharing is on every plan. Free, Go, Plus and Pro users invite individuals. Business, Enterprise and Edu users can invite individuals or workspace groups, or share a workspace link. [10]
- Access levels: "Can edit" members can update instructions, add or remove files and invite others. "Can chat" members can see and use the project's chats, files and instructions but cannot invite others. [10]
- Members of a shared project see the project's chats, files and member list. Anything typed into a chat in a shared project is visible to everyone in it. [10]
- A shared project switches to project-only memory and does not use any member's custom instructions or memories from outside the project. [10]
- Limits per project, by plan, as one version of the help page gives them: Free up to 5 files and 5 collaborators; Plus and Go up to 25 files and 10 collaborators; Pro up to 40 files and 100 collaborators; Business, Enterprise and Edu up to 40 files and 100 collaborators. Another version of the page gives different numbers for some plans. Check the page before relying on a limit. [10]
- Training: individual plans use Settings, then Data controls, "Improve the model for everyone." [11] (Checked 2026-11-08 for the other skill pages.) OpenAI says it does not train on ChatGPT Business, Enterprise or Edu data by default, unless the customer opts in (for example through feedback). [12]

## What This Means for a Team Brain

This is the skill's own guidance, built from the facts above.

| The team's plan | One shared team project? | Agents' access | Where each agent's personal layer goes | Watch for |
|---|---|---|---|---|
| Claude Team or Enterprise | Yes | Agents "Can view"; the leader and ops "Can edit" | Settings, Your Claude, Instructions (applies in every chat, the team project included), or pasted at the top of a chat | Agents' chats in the project stay private. Which instructions win in a conflict is not documented, so the team instructions say the team lines win. |
| Claude Free, Pro, Max or Ultra (each agent pays for their own) | No: no sharing on these plans | Each agent makes their own project from the same pack | That agent's own project instructions, under the team block, or Settings, Your Claude, Instructions | The leader hands out the files and every update. Copies drift. Free: five projects at most, retrieval only on paid plans, project instructions unconfirmed. |
| ChatGPT Business, Enterprise or Edu | Yes | Agents "Can chat"; the leader and ops "Can edit" | In the shared project, pasted at the top of a chat (custom instructions do not reach it); in the agent's own project for client work, under the team instructions | Every member sees every chat in the project. Client work goes in each agent's own project, never in the shared one. |
| ChatGPT Free, Go, Plus or Pro | Yes, by invite, with lower limits | Same as above | Same as above | Free: 5 files and 5 collaborators per project (one version of the page). Trim the pack to fit. |

## Not Confirmed

- Which wins in Claude when account-wide instructions and project instructions disagree.
- Whether a shared Claude project's memory is visible to other members.
- Whether Claude Free supports project instructions.
- ChatGPT's per-plan file and collaborator limits (two versions of the page disagree).
- Every ChatGPT fact was read through search excerpts, not the page itself.

## Sources

1. Claude Help Center, "What are projects?", read 2026-11-10: https://support.claude.com/en/articles/9517075-what-are-projects
2. Claude Help Center, "How can I create and manage projects?", read 2026-11-10: https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects
3. Claude Help Center, "Project visibility and sharing", read 2026-11-10: https://support.claude.com/en/articles/9519189-project-visibility-and-sharing
4. Claude Help Center, "Understanding Claude's personalization features", read 2026-11-10: https://support.claude.com/en/articles/10185728-understanding-claude-s-personalization-features
5. Claude Help Center, "Use Claude's chat search and memory to build on previous context", read 2026-11-10: https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context
6. Claude Privacy Center, "How do I change my model improvement privacy settings?", checked 2026-11-08: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings
7. Claude Privacy Center, "Is my data used for model training?", checked 2026-11-08: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
8. Claude Help Center, "What is the Team plan?", read 2026-11-10: https://support.claude.com/en/articles/9266767-what-is-the-team-plan
9. OpenAI Help Center, "ChatGPT Team is now ChatGPT Business", search excerpt 2026-11-10: https://help.openai.com/en/articles/12111915-chatgpt-team-is-now-chatgpt-business
10. OpenAI Help Center, "Projects in ChatGPT", search excerpts 2026-11-10: https://help.openai.com/en/articles/10169521-projects-in-chatgpt
11. OpenAI Help Center, "Data Controls FAQ", checked 2026-11-08 for the other skill pages: https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt
12. OpenAI, "Business data privacy, security, and compliance", search excerpt 2026-11-10: https://openai.com/business-data/
