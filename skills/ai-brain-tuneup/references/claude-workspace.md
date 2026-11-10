# Claude Workspace: What It Holds and How to Copy Each Piece

Last verified: 2026-11-10, against Claude's Help Center (support.claude.com). Each fact names its article and the article's own "updated" date. Claude's menus move: when a click path here doesn't match the screen, follow the screen and say so in Flags.

## The Pieces

| Piece | What it reaches | Where it lives |
|---|---|---|
| Project instructions | Every chat in that project | The project's page, "Set project instructions" |
| Project knowledge | Every chat in that project | The project's page, right side |
| Memory | Chats outside projects; each project also has its own | Settings > Your Claude, "Manage" next to Your memory |
| Instructions for Claude | Every conversation on the account | Settings > Your Claude > Instructions |
| Custom styles, or the skills they became | Chats where the style or skill is used | The style menu, or Customize > Skills |

## Projects

- "Projects allow you to create self-contained workspaces with their own chat histories and knowledge bases." Every plan has them; Free users can create up to five. (What are projects?, updated 2026-10-30: https://support.claude.com/en/articles/9517075-what-are-projects)
- A project's name and description: "Claude will not have access to these details." So nothing the AI needs should live only there. (How can I create and manage projects?, updated 2026-11-06: https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects)
- Context is not shared across chats in a project "unless the information is added into the project knowledge base." (Same article.)
- A new version of projects is in beta, rolling out in stages starting with Claude Code, to some Pro, Max and Ultra users. In it, every thread starts with the project's files, repositories, instructions and memory, and projects moved to it keep their instructions, files and chat history. (What are projects?) This skill was not tested on the new version.

## Project Instructions

- To set them: open the project, click "Set project instructions," add the instructions and click "Save instructions." "Claude will use these instructions for all the chats within the project." (How can I create and manage projects?)
- Project instructions apply only to chats within that project. (Understanding Claude's personalization features, updated 2026-10-23: https://support.claude.com/en/articles/10185728-understanding-claude-s-personalization-features)
- **To copy them for a tune-up:** open the same instructions box, select all the text, copy it, and paste it into the tune-up chat or a .txt file. The help center describes no copy or export button for instructions.
- **To paste a rewrite:** open the same box, replace the text, and click "Save instructions."

## Project Knowledge

- The knowledge base is on the right side of the project's main page. Click "+" to add documents, text files or code snippets. "Anything you upload to this space will be used across all of your chats within that project." (How can I create and manage projects?)
- On paid plans, when project knowledge nears the context window limit, Claude turns on RAG mode, which holds up to 10x more and retrieves "only the most relevant information" for each question instead of loading every file. (Retrieval augmented generation (RAG) for projects, updated 2026-10-30: https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects) So in a large project, an old file can be the one Claude happens to retrieve.
- Project files: 30 MB each, any number as long as the total fits the context window, text extraction only (except multimodal PDFs). Chat uploads: 500 MB each, up to 20 files per chat. Document types listed: PDF, DOCX, CSV, TXT, HTML, ODT, RTF, EPUB, JSON and XLSX (XLSX needs code execution on). (Upload files to Claude, updated 2026-07-23: https://support.claude.com/en/articles/8241126-upload-files-to-claude) Markdown isn't on the list: if a .md file won't attach, paste its text or save it as .txt.
- **To copy them for a tune-up:** attach the original files from your computer. The help center doesn't describe downloading a file back out of a project, and Claude's data export "doesn't include the original files you uploaded." (Export your Claude data, updated 2026-11-09: https://support.claude.com/en/articles/9450526-export-your-claude-data)

## Memory

All from Use Claude's chat search and memory to build on previous context (updated 2026-11-05: https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context) unless noted.
- Claude "saves memory as a set of individual topics as you chat." You can also say "remember this." Memory is on by default for Free, Pro, Max and Ultra; on Team and Enterprise, owners control whether it's available.
- **To view and edit:** Settings > Your Claude, select "Manage" next to Your memory (Settings > Memory in the older layout). Everything is listed under Topics. Select a topic to read it, use the edit icon to change it, or select "Delete" to remove it. You can also tell Claude in a chat what to remember, change or forget.
- **Project memory:** each project has its own. In a project, Claude uses that project's memory plus memory from chats outside projects, but not other projects' memory. To keep a project's memory fully separate, turn off "Use account memory" under Memory on the project's page.
- Never saved, even if asked: government ID numbers, criminal history, financial account numbers and immigration status. Sensitive topics (health, race, religious beliefs, politics and similar) stay out unless "Include sensitive topics in memory" is on. Phone numbers and email addresses are not on the never-saved list.
- Deleting a conversation doesn't remove the memory entries made from it; delete the memory itself.
- **Memory off for one chat:** start a new chat, click "+" in the message box, click "Memory" to turn it off, then send the first message. Claude won't use memory in that chat or save anything from it, and the chat stays in your history. It can't be changed once the chat starts.
- "Pause memory" keeps what's saved but stops using and adding to it. "Reset memory" permanently deletes all memories, including project memories.
- **Legacy layout:** a few Team and Enterprise organizations still have Memory under Settings > Capabilities ("View and manage memory"). (Import and export your memory from Claude, updated 2026-11-02: https://support.claude.com/en/articles/12123587-import-and-export-your-memory-from-claude) The old daily memory summary was replaced by individual entries on July 10, 2026. (Release notes: https://support.claude.com/en/articles/12138966-release-notes)
- **To copy it for a tune-up:** open Settings > Your Claude, "Manage" next to Your memory, and copy each topic; or ask Claude in a chat, "Write out your memories of me verbatim, exactly as they appear in your memory," and copy the answer into a .txt file. (Import and export your memory from Claude) For a project's memory, ask that question in a chat inside the project.
- **Data export:** Settings > Privacy > "Export data," on the web or desktop app; the download link comes by email and expires 24 hours after it's created. "All memory data is included in data exports." (Export your Claude data; the memory article.) The export also holds every chat, so don't attach it whole to a tune-up.

## Instructions for Claude (Account-Wide)

- Click your initials in the lower left, then "Settings," then "Your Claude" ("Account" in the older layout), then "Instructions" ("Instructions for Claude" in the older layout). "Any instructions you add here will be applied to all of your conversations with Claude." Global instructions from Claude Cowork are part of it in the new Claude experience. (Understanding Claude's personalization features)
- These reach every chat, inside projects too, so a line here can fight a project's instructions.
- **To copy them:** open the box, select all, copy. **To change them:** edit the box there.

## Custom Styles, and the Skills They Became

- On 2026-11-10 the help center's styles article (https://support.claude.com/en/articles/10181068) returned "not found," and the personalization article names skills, not styles, as the way to "adjust the tone and format of Claude's responses." (Understanding Claude's personalization features) The incognito article still lists "custom styles" as profile information Claude can use. (Use incognito chats: https://support.claude.com/en/articles/12260368-use-incognito-chats)
- **Not confirmed on the help center** (search results and secondary sources only, 2026-11-10): custom styles were moved into skills automatically, arrive switched off, and appear in Customize > Skills under a name made from the style's name. Check your own account.
- Skills: every skill is listed in Customize > Skills; click one to view its details, and use its switch to turn it on or off. (Use skills in Claude: https://support.claude.com/en/articles/12512180-use-skills-in-claude)
- **To copy a style for a tune-up:** if your chat box still has a style menu, open the style and copy its instructions. If it became a skill, open Customize > Skills, click it, and copy what its details show. If you can't see the wording, say what the style does in a sentence; the tune-up will mark it as your description, not the style's own words.

## Running the Tune-Up

- Use a new chat outside the project being tuned: project instructions apply to every chat in the project, so inside it the old instructions would steer the audit.
- Turn Memory off for that chat first (the "+" menu, before the first message), so nothing from the audit, including details flagged for removal, is saved to memory.
