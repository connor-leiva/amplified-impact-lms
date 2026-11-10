# Claude Workspace: Where Each Piece Goes

Last verified: 2026-11-10, from Claude's help center (support.claude.com), read directly that day; sources at the end, each with what it says. Menus change. If a click path here doesn't match what the user sees, trust the screen, say so, and tell them which help article to check.

## The Places, Side by Side

| Place | What it does | Where it applies | Plans | How to get there |
|---|---|---|---|---|
| **Instructions** (account-wide; "Instructions for Claude" in the older layout) | General instructions "applied to all of your conversations with Claude" | Every chat, inside and outside projects | Every plan (the article states no plan limit) | Click your initials in the lower left corner, then Settings, then Your Claude (Account in the older layout). Paste under Instructions. Direct link: claude.ai/settings/personalization |
| **Project instructions** | "Custom directions" Claude "will use ... for all the chats within the project" | Only chats in that project | Projects are on every plan, Free included; Free holds a maximum of five projects | claude.ai/projects, + New Project, name it, create it. On the project page, click Set project instructions, paste, then Save instructions |
| **Project knowledge** (the project's files) | Files "used across all of your chats within that project" as background | Only chats in that project | Every plan. Paid plans (Pro, Max, Ultra, Team, Enterprise) get RAG, which expands capacity "by up to 10x" as knowledge nears the context limit | The knowledge base is on the right side of the project page. Click +, then upload the file |
| **Memory** | Claude saves "a set of individual topics as you chat"; you can also tell it "remember this" | Account memory: every chat. Project memory: that project (it also uses account memory) | On by default for Free, Pro, Max and Ultra (web, desktop, mobile). Team and Enterprise: owners control whether it's available | Review in Settings, Your Claude, then Manage next to Your memory (Settings, Memory in the older layout). Each saved item is a Topic you can read, edit or delete |
| **Styles** | Being retired: the help center now points to skills for tone and format | | | Don't build a style. Voice goes in Instructions (below) |
| **Skills** | Repeatable jobs, like this one | Any chat where the skill is on | The help center lists every plan; Claude's docs list Pro and up | Customize, Skills |

## Facts That Shape the Setup

**Projects**
- "Projects are available to all users, including those with free Claude accounts. Free users can create a maximum of five projects." (What are projects?; How can I create and manage projects?)
- When you create a project you give it "a name and description (note that Claude will not have access to these details)." So nothing useful goes in the name or description.
- "Context is not shared across chats within a project unless the information is added into the project knowledge base." So business facts go in the knowledge file, not in one chat.
- One line in "Understanding Claude's personalization features" says project instructions are for "paid plans only," while the projects articles say projects are on every plan. On Free, if Set project instructions doesn't appear, paste the Project Instructions block at the top of the About My Business file instead and say so.
- Sharing a project is Team and Enterprise only (Can view, Can edit). A shared team brain is the team-ai-brain skill's job, not this one.
- A new version of projects is in beta for some Pro, Max and Ultra users, starting in Claude Code. Existing projects that are moved keep their "instructions, files, full chat history, and scheduled tasks." The steps here are for the current version.

**Project knowledge files**
- Supported documents: PDF, DOCX, CSV, TXT, HTML, ODT, RTF, EPUB, JSON and XLSX (XLSX needs code execution on). Project files: 30MB per file; the number is "unlimited, but total content must fit within Claude's context window" (RAG lifts that on paid plans). Project files are "text extraction only (except for multimodal PDFs)." (Upload files to Claude)
- So the About My Business block is saved as a plain text file named About My Business.txt.

**Instructions (account-wide)**
- "Any instructions you add here will be applied to all of your conversations with Claude." Examples the help center gives: "Your preferred approaches or methods," "Common terms or concepts you use," "Typical scenarios you encounter," "General communication instructions." (Understanding Claude's personalization features)
- That is why How I Like to Work, and the voice QUICK CARD, go here: every chat and every skill sees them.

**Memory**
- Claude saves memory "as you chat," and "you can also tell Claude to 'remember this' to save something directly." You can "tell Claude what you'd like it to remember, change, or forget."
- "Each project has its own memory. While working in a project, Claude uses the project's memory alongside your memory from chats outside of projects, but not memory from other projects." To keep a project's memory separate, turn off "Use account memory" under Memory on the project's page. So the Facts to Remember go in a chat outside any project, where every project can use them.
- To turn memory off for one chat: click + in the message box and turn off Memory before the first message.
- "By default, Claude does not store topics related to personal or sensitive subject matter, like your health, race, ethnicity, religious beliefs, politics, gender identity, and other similar areas."
- "Some information is never saved to memory, even if you ask. This includes government ID numbers, criminal history, financial account numbers, and immigration status." Passwords and client contact details are not on that list, so the skill keeps them out itself.
- "When a conversation is deleted ... memory entries generated from it aren't removed, but you can delete individual memories while memory is on." So after a password or client detail lands in a chat, deleting the chat isn't enough: check Settings, Your Claude, Manage next to Your memory, and delete any topic that holds it.
- Team and Enterprise: owners turn memory on or off for the organization (Organization settings, Capabilities). In organizations created on or after October 31, 2026, memory starts on for each member; in older ones, it's off until the member turns it on. Turning it off for the organization deletes everyone's memory. When memory is off, the facts still live in the About My Business file.
- Searching past chats is paid plans only (Pro, Max, Ultra, Team, Enterprise). Incognito chats (every plan) aren't saved to memory or history.

**Styles**
- "Understanding Claude's personalization features" now lists three features: Instructions, Project instructions and Skills, and says "Use skills when you want to customize how Claude formats and delivers its responses." A help article titled "Styles are moving to skills" (support.claude.com/en/articles/10181068) showed in search results on 2026-11-10, with excerpts saying custom styles are migrated to skills, start turned off, and are turned on in Customize, Skills; the page itself returned "not found" when read, so those details come from search excerpts only. Don't put anything in a style.

## Where the Voice Profile Goes

- Amplified Impact's voice profile guide (amplifiedimpact.io/voice-profile) saves the full profile in the Instructions of a Claude project named My Voice, and its QUICK CARD (under 1,500 characters, starting "Write as me.") is written to work alone in short instruction boxes.
- This setup puts the QUICK CARD, unchanged, at the end of the How I Like to Work block in account-wide Instructions, so every chat, in every project, writes in the user's voice. The My Voice project stays as it is for long writing. If the user wants the full profile in the AI Brain project too, they can save it as My Voice Profile.txt and add it to the project's files.
- No QUICK CARD: point to amplifiedimpact.io/voice-profile and say to paste the QUICK CARD at the end of How I Like to Work when it's done.

## Sources (all read 2026-11-10)

- What are projects? (projects on every plan, Free up to five; RAG on paid plans; sharing on Team and Enterprise; the new beta version): https://support.claude.com/en/articles/9517075-what-are-projects
- How can I create and manage projects? (+ New Project; name and description not seen by Claude; "+" for knowledge; Set project instructions, Save instructions; project memory): https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects
- Understanding Claude's personalization features (Instructions in Settings, Your Claude; project instructions; skills for tone and format): https://support.claude.com/en/articles/10185728-understanding-claude-s-personalization-features
- Use Claude's chat search and memory to build on previous context (memory plans, topics, "remember this," project memory, sensitive topics, never-saved items, Team and Enterprise controls): https://support.claude.com/en/articles/11817273-use-claudes-chat-search-and-memory-to-build-on-previous-context
- Retrieval augmented generation (RAG) for projects (paid plans; up to 10x): https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects
- Upload files to Claude (file types; project files 30MB each): https://support.claude.com/en/articles/8241126-uploading-files-to-claude
- Styles are moving to skills (search excerpts only; the page returned not found when read): https://support.claude.com/en/articles/10181068-styles-are-moving-to-skills
- Use skills in Claude (skills by plan): https://support.claude.com/en/articles/12512180-use-skills-in-claude
- The voice profile guide's save step (My Voice project, the QUICK CARD for short boxes): amplifiedimpact.io/voice-profile
