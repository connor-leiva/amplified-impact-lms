# Review files for https://github.com/connor-leiva/amplified-impact-lms/pull/252

**The design, for approval:** what a signed-in $37 skill buyer sees inside the LMS. These are Playwright captures of the mockup `handoff/lms-mockup/buyer.html`, not of the app.
- **How they were taken.** `node handoff/lms-mockup/tools/capture.mjs --b64`, full page, in Chromium. The MOCKUP bar is hidden, motion is reduced so every entrance is at its end state, and the clock is fixed at 2:00 PM for the greeting.
- **Who the buyer is.** The buyer is the mockup's made-up Alex Morgan, who bought Team P&L Review (an owner skill) unless the row says otherwise.
- **How to open one.** Decode with `base64 -d file.png.b64 > file.png`.

| File | Screen | Width |
|---|---|---|
| `home-1280.png.b64` | Home: their skill first (Open the Setup Guide; Claude, ChatGPT and practice downloads), "Also in the Academy" locked areas, the Amplified Insiders card, skills to open next | 1280 |
| `home-390.png.b64` | The same page | 390 |
| `home-1280-dark.png.b64` | Home in the Dark theme | 1280 |
| `home-390-dark.png.b64` | The same, dark | 390 |
| `library-1280.png.b64` | Skill Library: Your Skill on top, the upgrade band (48 locked now), every skill by set, five per set until Show All | 1280 |
| `library-390.png.b64` | The same page | 390 |
| `library-1280-dark.png.b64` | Skill Library, dark | 1280 |
| `library-390-dark.png.b64` | The same, dark | 390 |
| `locked-skill-1280.png.b64` | A locked skill (Database Health Check): Upgrade to Amplified Insiders, $169/Month first, Get This Skill, $37 beside it, the lead and the real setup steps, Claude and ChatGPT as equal tabs | 1280 |
| `locked-skill-390.png.b64` | The same page | 390 |
| `locked-skill-1280-dark.png.b64` | A locked skill, dark | 1280 |
| `locked-skill-390-dark.png.b64` | The same, dark | 390 |
| `training-1280.png.b64` | Weekly Live Training, locked: Upgrade to the Agent Plan, $117/Month, and the 4-week rotation | 1280 |
| `training-390.png.b64` | The same page | 390 |
| `training-1280-dark.png.b64` | Weekly Live Training, dark | 1280 |
| `training-390-dark.png.b64` | The same, dark | 390 |
| `office-hours-1280.png.b64` | Office Hours, locked: Thursdays, 12:00 PM MT, in Amplified Insiders | 1280 |
| `office-hours-390.png.b64` | The same page | 390 |
| `office-hours-1280-dark.png.b64` | Office Hours, dark | 1280 |
| `office-hours-390-dark.png.b64` | The same, dark | 390 |
| `accelerator-1280.png.b64` | The AI Accelerator, locked: Week 0's eight steps and the hires, week by week | 1280 |
| `accelerator-390.png.b64` | The same page | 390 |
| `accelerator-1280-dark.png.b64` | The AI Accelerator, dark | 1280 |
| `accelerator-390-dark.png.b64` | The same, dark | 390 |
| `home-agent-1280.png.b64` | Home for an agent skill buyer (Appointment Follow-Up): Amplified Insiders for Agents, $79 a month | 1280 |
| `home-agent-390.png.b64` | The same page | 390 |
| `library-two-1280.png.b64` | Skill Library for a buyer of two skills (Team P&L Review, FUB Pipeline Review) | 1280 |
| `library-two-390.png.b64` | The same page | 390 |
