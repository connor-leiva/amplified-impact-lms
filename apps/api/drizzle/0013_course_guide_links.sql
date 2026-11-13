-- D-151: the AI Accelerator's week prompts link each skill's guided setup in learn, where it now is,
-- instead of its www page, which only previews it. A one-time rewrite of the rows the curriculum seeded
-- (`db:curriculum:ensure` only seeds a course that is missing, so it never rewrites them). Each link is
-- its own line (`- <title>: <url>`), so it is matched with the line break after it: `/ai-brain-setup`
-- never matches inside a longer address. /voice-profile is not a skill and stays on www. Running it
-- again changes nothing.
UPDATE "modules" SET "prompt" = replace("prompt", 'https://www.amplifiedimpact.io/ai-brain-setup' || chr(10), 'https://learn.amplifiedimpact.io/skill-library/ai-brain-setup' || chr(10)) WHERE "id" LIKE 'accelerator-week-%';
--> statement-breakpoint
UPDATE "modules" SET "prompt" = replace("prompt", 'https://www.amplifiedimpact.io/team-ai-brain' || chr(10), 'https://learn.amplifiedimpact.io/skill-library/team-ai-brain' || chr(10)) WHERE "id" LIKE 'accelerator-week-%';
--> statement-breakpoint
UPDATE "modules" SET "prompt" = replace("prompt", 'https://www.amplifiedimpact.io/lead-source-roi' || chr(10), 'https://learn.amplifiedimpact.io/skill-library/lead-source-roi' || chr(10)) WHERE "id" LIKE 'accelerator-week-%';
--> statement-breakpoint
UPDATE "modules" SET "prompt" = replace("prompt", 'https://www.amplifiedimpact.io/morning-brief' || chr(10), 'https://learn.amplifiedimpact.io/skill-library/morning-brief' || chr(10)) WHERE "id" LIKE 'accelerator-week-%';
--> statement-breakpoint
UPDATE "modules" SET "prompt" = replace("prompt", 'https://www.amplifiedimpact.io/l10-meeting-prep' || chr(10), 'https://learn.amplifiedimpact.io/skill-library/l10-meeting-prep' || chr(10)) WHERE "id" LIKE 'accelerator-week-%';
--> statement-breakpoint
UPDATE "modules" SET "prompt" = replace("prompt", 'https://www.amplifiedimpact.io/fub-pipeline-review' || chr(10), 'https://learn.amplifiedimpact.io/skill-library/fub-pipeline-review' || chr(10)) WHERE "id" LIKE 'accelerator-week-%';
--> statement-breakpoint
UPDATE "modules" SET "prompt" = replace("prompt", 'https://www.amplifiedimpact.io/agent-1on1-prep' || chr(10), 'https://learn.amplifiedimpact.io/skill-library/agent-1on1-prep' || chr(10)) WHERE "id" LIKE 'accelerator-week-%';
--> statement-breakpoint
UPDATE "modules" SET "prompt" = replace("prompt", 'https://www.amplifiedimpact.io/team-playbook-builder' || chr(10), 'https://learn.amplifiedimpact.io/skill-library/team-playbook-builder' || chr(10)) WHERE "id" LIKE 'accelerator-week-%';
--> statement-breakpoint
UPDATE "modules" SET "prompt" = replace("prompt", 'https://www.amplifiedimpact.io/new-agent-onboarding-plan' || chr(10), 'https://learn.amplifiedimpact.io/skill-library/new-agent-onboarding-plan' || chr(10)) WHERE "id" LIKE 'accelerator-week-%';
