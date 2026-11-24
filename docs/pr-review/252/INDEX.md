# Review files for https://github.com/connor-leiva/amplified-impact-lms/pull/252

The $37 skill buyer inside the LMS (D-241): each page of the approved mockup beside the same page of the build, at 1280 and 390. Decode with `base64 -d file.png.b64 > file.png`.

- **Mockup:** `handoff/lms-mockup/buyer.html`, the design Connor approved on Nov 24, 2026, light only.
- **Build:** the production build, with http data and both learner flags unset, as Railway builds by default. It was served by `vite preview` and every `/api` call was answered with the mockup's buyer:
  - the buyer is the made-up Alex Morgan;
  - the real catalog;
  - each locked guide's real step titles;
  - a placeholder Payment Link per cart.
- **How they were taken.** `handoff/lms-mockup/tools/pairs.ts --b64`, full page, in Chromium. Motion was reduced (every entrance at its end state), the time zone was Mountain and the clock was 2:00 PM.
- **Result.** Every pair is the same size, and no pixel differs in any of them, measured with pixelmatch at threshold 0.1.

| Files | Screen | Width | Height | Pixels that differ |
|---|---|---|---|---|
| `home-1280.mockup.png.b64`, `home-1280.build.png.b64` | Home: the skill they bought first, the locked areas, the Amplified Insiders card, skills to open next | 1280 | 1465 | 0.000% |
| `home-390.mockup.png.b64`, `home-390.build.png.b64` | The same page | 390 | 3200 | 0.000% |
| `library-1280.mockup.png.b64`, `library-1280.build.png.b64` | Skill Library: Your Skill, the upgrade band (48 locked now), every skill by set | 1280 | 2865 | 0.000% |
| `library-390.mockup.png.b64`, `library-390.build.png.b64` | The same page | 390 | 5025 | 0.000% |
| `locked-skill-1280.mockup.png.b64`, `locked-skill-1280.build.png.b64` | A locked skill (Database Health Check): Upgrade to Amplified Insiders, $169/Month first, Get This Skill, $37 beside it, the real setup steps | 1280 | 1396 | 0.000% |
| `locked-skill-390.mockup.png.b64`, `locked-skill-390.build.png.b64` | The same page | 390 | 2263 | 0.000% |
| `training-1280.mockup.png.b64`, `training-1280.build.png.b64` | Weekly Live Training, locked: Upgrade to the Agent Plan, $117/Month, and the rotation | 1280 | 1331 | 0.000% |
| `training-390.mockup.png.b64`, `training-390.build.png.b64` | The same page | 390 | 2281 | 0.000% |
| `office-hours-1280.mockup.png.b64`, `office-hours-1280.build.png.b64` | Office Hours, locked: Thursdays, 12:00 PM MT, in Amplified Insiders | 1280 | 1000 | 0.000% |
| `office-hours-390.mockup.png.b64`, `office-hours-390.build.png.b64` | The same page | 390 | 1364 | 0.000% |
| `accelerator-1280.mockup.png.b64`, `accelerator-1280.build.png.b64` | The AI Accelerator, locked: Week 0's eight steps, a hire a week, See the AI Accelerator | 1280 | 2457 | 0.000% |
| `accelerator-390.mockup.png.b64`, `accelerator-390.build.png.b64` | The same page | 390 | 3792 | 0.000% |
| `home-agent-1280.mockup.png.b64`, `home-agent-1280.build.png.b64` | Home for an agent skill buyer (Appointment Follow-Up): Amplified Insiders for Agents, $79 a month | 1280 | 1465 | 0.000% |
| `home-agent-390.mockup.png.b64`, `home-agent-390.build.png.b64` | The same page | 390 | 3122 | 0.000% |
| `library-two-1280.mockup.png.b64`, `library-two-1280.build.png.b64` | Skill Library for a buyer of two skills, the latest purchase first | 1280 | 3174 | 0.000% |
| `library-two-390.mockup.png.b64`, `library-two-390.build.png.b64` | The same page | 390 | 5697 | 0.000% |
