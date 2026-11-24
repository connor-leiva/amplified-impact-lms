# Review files for https://github.com/connor-leiva/amplified-impact-lms/pull/256

The operator is the AI Implementer (D-242): every surface the rename changes, at 1280 and 390. Decode with `base64 -d file.png.b64 > file.png`.

- **Build:** this branch, served the way Railway serves it: the web app built with `VITE_LEARNER_V2=true VITE_STEP_PAGE_V6=true VITE_DATA_SOURCE=http`, from the API (`apps/api/src/server.ts`) on a local Postgres.
- **Data:** a database shaped like production before this deploy: `seedProduction`, then every earlier data step. Then the deploy's own `pnpm --filter @ai/api db:curriculum:ensure` ran `2026-11-24-ai-implementer` (10 records, Step 1's line named for staff). The learner is the seeded test learner, the made-up Alex Morgan, a Team Owner with two seats; the reset scripts in `compliance/lms-v3/` set up their Week 0 and opened Week 1. Added for these screens only, on that local database: an invited Operations Lead (Jordan Lee, made up), the intake's kit row, and the old-words answer for "Whose AI account runs your hires?".
- **How they were taken.** Playwright in Chromium, 1x, time zone America/Chicago. Full page for the learner pages; the viewport for drawers and admin edit views.
- **Not shown:** the seat card drawer (Weeks 1 and 2 have no seat card button until staff set one, D-235), Preview as Learner at 390 (the button isn't in the phone layout), and the PDFs (covered by `apps/api/test/intake-pdf.test.ts`).

| File | Screen | Width | Height |
|---|---|---|---|
| `learner-week0-1280.png.b64` | Week 0 page: the "Owners and AI Implementers" tag, the Owner / AI Implementer filter, each step's role tag, step 1 "Fill In Your Intake and Name Your AI Implementer" | 1280 | 2457 |
| `learner-week0-390.png.b64` | Week 0 page: the "Owners and AI Implementers" tag, the Owner / AI Implementer filter, each step's role tag, step 1 "Fill In Your Intake and Name Your AI Implementer" | 390 | 4445 |
| `learner-week0-filter-1280.png.b64` | The step list filtered to the AI Implementer: "N steps for the AI Implementer, about …" | 616 | 876 |
| `learner-week0-filter-390.png.b64` | The step list filtered to the AI Implementer: "N steps for the AI Implementer, about …" | 358 | 1456 |
| `learner-week0-reference-1280.png.b64` | The Reference accordion "Owner and AI Implementer", open | 616 | 515 |
| `learner-week0-reference-390.png.b64` | The Reference accordion "Owner and AI Implementer", open | 358 | 581 |
| `learner-step1-1280.png.b64` | Week 0 Step 1's page | 1280 | 1360 |
| `learner-step1-390.png.b64` | Week 0 Step 1's page | 390 | 2735 |
| `learner-intake-1280.png.b64` | The intake drawer: "Week 0 · Step 1 · Owner and AI Implementer", and the intro with "Your AI Implementer is a person on your team, not software." | 1280 | 900 |
| `learner-intake-390.png.b64` | The intake drawer: "Week 0 · Step 1 · Owner and AI Implementer", and the intro with "Your AI Implementer is a person on your team, not software." | 390 | 844 |
| `learner-intake-section-1280.png.b64` | The intake's "Your AI Implementer" section: "Who is your AI Implementer?" | 1280 | 900 |
| `learner-intake-section-390.png.b64` | The intake's "Your AI Implementer" section: "Who is your AI Implementer?" | 390 | 844 |
| `learner-intake-account-1280.png.b64` | "Whose AI account runs your hires?": the team's answer, stored as "The operator's account (our default)", shows as "The AI Implementer's account (our default)" | 1280 | 900 |
| `learner-intake-account-390.png.b64` | "Whose AI account runs your hires?": the team's answer, stored as "The operator's account (our default)", shows as "The AI Implementer's account (our default)" | 390 | 844 |
| `learner-week1-step1-1280.png.b64` | Week 1 Step 1: the AI Implementer tag on each item, the AI Implementer's progress line, the renamed body | 1280 | 2260 |
| `learner-week1-step1-390.png.b64` | Week 1 Step 1: the AI Implementer tag on each item, the AI Implementer's progress line, the renamed body | 390 | 5642 |
| `learner-schedule-1280.png.b64` | Schedule: "Owner … · AI Implementer …" on each week | 1280 | 2350 |
| `learner-schedule-390.png.b64` | Schedule: "Owner … · AI Implementer …" on each week | 390 | 3740 |
| `learner-account-1280.png.b64` | Account: "AI Implementer invite sent …, not accepted yet" and "Your AI Implementer gets the second seat." | 1280 | 900 |
| `learner-account-390.png.b64` | Account: "AI Implementer invite sent …, not accepted yet" and "Your AI Implementer gets the second seat." | 390 | 1432 |
| `admin-week0-course-card-1280.png.b64` | Week Builder, Week 0: the Course page card | 721 | 265 |
| `admin-week0-course-card-390.png.b64` | Week Builder, Week 0: the Course page card | 343 | 511 |
| `admin-week0-course-edit-1280.png.b64` | Week Builder, Course page edit: "AI Implementer line" and "AI Implementer time" | 1280 | 900 |
| `admin-week0-course-edit-390.png.b64` | Week Builder, Course page edit: "AI Implementer line" and "AI Implementer time" | 390 | 844 |
| `admin-week0-intake-card-1280.png.b64` | Week Builder, Week 0: the Intake card | 721 | 115 |
| `admin-week0-intake-card-390.png.b64` | Week Builder, Week 0: the Intake card | 343 | 155 |
| `admin-week0-intake-edit-1280.png.b64` | Week Builder, Intake edit: the "Your AI Implementer" section and its questions | 1280 | 900 |
| `admin-week0-intake-edit-390.png.b64` | Week Builder, Intake edit: the "Your AI Implementer" section and its questions | 390 | 844 |
| `admin-week0-preview-1280.png.b64` | Preview as Learner, the "AI Implementer" tab | 1280 | 900 |
| `admin-week1-1280.png.b64` | Week Builder, Week 1: the steps | 1280 | 900 |
| `admin-week1-390.png.b64` | Week Builder, Week 1: the steps | 390 | 844 |
| `admin-course-settings-1280.png.b64` | Course Settings, Shared pages: "The AI Implementer’s role" with the line | 1280 | 900 |
| `admin-course-settings-390.png.b64` | Course Settings, Shared pages: "The AI Implementer’s role" with the line | 390 | 844 |
| `admin-glossary-1280.png.b64` | Course Settings, Glossary: the term "AI Implementer" (id operator), its short and long lines with the line, aliases "your AI Implementer" and "AI Implementers" | 1280 | 900 |
| `admin-glossary-390.png.b64` | Course Settings, Glossary: the term "AI Implementer" (id operator), its short and long lines with the line, aliases "your AI Implementer" and "AI Implementers" | 390 | 844 |
