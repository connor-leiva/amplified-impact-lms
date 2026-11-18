# Learner portal v2: the signed-off mockup

The visual source of truth for the learner build brief's PRs 5 to 9 (the learner shell, Home, the week
overview and step player, Account, the native Skill Library, Schedule and the phone pass). It is Connor's
Claude Design export, "Amplified Impact LMS · Learner Portal Redesign", uploaded Nov 18, 2026.

**The mockup wins on visuals; the spec wins on content and safety** (the brief). Its text shows the OLD
Weeks 0 to 3: course words come from the database (the builder and the seed), never from these files.

## What is here

Each file is one artboard, unpacked from the export and saved as the DOM the export renders: its markup
and its CSS, as drawn. The export's embedded fonts are replaced by the repo's own Geist and Geist Mono
(`design-reference/fonts/geist.css`), and each file renders pixel for pixel the same as the original
artboard (checked at its width when it was added). Open one in a browser from this folder.

The CSS says where it comes from: the learner frame is built on the admin R2 system
(`design-reference/admin-redesign-r2/`, `apps/web/src/styles/r2.css`), with pieces marked LEARNER new to
this side and built only from R2 tokens.

| File | Artboard | Size |
|---|---|---|
| `01_1-home-before-launch-1440.html` | 1 · Home, before launch · 1440 | 1440 × 1228 |
| `02_1-home-before-launch-390.html` | 1 · Home, before launch · 390 | 390 × 2792 |
| `03_9-phone-menu-390.html` | 9 · Phone menu · 390 | 390 × 844 |
| `04_1-home-live-build-1440.html` | 1 · Home, live build · 1440 | 1440 × 1230 |
| `05_1-home-live-build-390.html` | 1 · Home, live build · 390 | 390 × 2922 |
| `06_2-ai-brain-six-steps-1440.html` | 2 · AI Brain, six steps · 1440 | 1440 × 1099 |
| `07_2-ai-brain-six-steps-390.html` | 2 · AI Brain, six steps · 390 | 390 × 2139 |
| `08_2-step-3-set-up-your-ai-brain-1440.html` | 2 · Step 3, set up your AI Brain · 1440 | 1440 × 1552 |
| `09_2-step-3-set-up-your-ai-brain-390.html` | 2 · Step 3, set up your AI Brain · 390 | 390 × 2876 |
| `10_3-schedule-weeks-1440.html` | 3 · Schedule, weeks · 1440 | 1440 × 1609 |
| `11_3-schedule-weeks-390.html` | 3 · Schedule, weeks · 390 | 390 × 2803 |
| `12_7-schedule-calendar-1440.html` | 7 · Schedule, calendar · 1440 | 1440 × 1142 |
| `13_7-schedule-calendar-390.html` | 7 · Schedule, calendar · 390 | 390 × 2411 |
| `14_4-morning-brief-locked-preview-1440.html` | 4 · Morning Brief, locked preview · 1440 | 1440 × 944 |
| `15_4-morning-brief-locked-preview-390.html` | 4 · Morning Brief, locked preview · 390 | 390 × 2244 |
| `16_5-skill-library-1440.html` | 5 · Skill library · 1440 | 1440 × 3319 |
| `17_5-skill-library-390.html` | 5 · Skill library · 390 | 390 × 3871 |
| `18_6-tc-file-audit-locked-preview-1440.html` | 6 · TC File Audit, locked preview · 1440 | 1440 × 909 |
| `19_6-tc-file-audit-locked-preview-390.html` | 6 · TC File Audit, locked preview · 390 | 390 × 2029 |
| `20_8-account-1440.html` | 8 · Account · 1440 | 1440 × 1251 |
| `21_8-account-390.html` | 8 · Account · 390 | 390 × 2365 |

## How the app uses it

Built alongside the current learner portal, behind a flag that is off by default (PR 5). The current
portal and its parity goldens (`design-reference/*.dc.html`, `compliance/goldens/`) are untouched until
a later PR retires them with a DECISIONS.md entry.
