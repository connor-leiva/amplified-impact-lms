# Review files for https://github.com/connor-leiva/amplified-impact-lms/pull/254

Playwright captures of D-246 (Download Your Answers (PDF), and the admin's Download PDF), at device scale 2. Decode with `base64 -d file.png.b64 > file.png`.

Captured from local fixture builds at commit `c8d0123`, with the learner reads answered as the API would: the course from the deployed seed with the Week 0 intake (and the fixture's database given the same Accelerator modules, so the steps carry their ids), and the team's intake submitted Thu, Nov 19, 4:02 PM CT with the package's sample answers (`handoff/lms-v3/src/forms/week-0-intake.samples.json`). The admin is the Console fixture's Northshore Group (`?as=admin`).

| File | Screen | Width |
|---|---|---|
| `drawer-submitted-1280.png.b64` | v3 week page, the intake drawer submitted: Download Your Answers (PDF) on the "Intake submitted." banner, Download PDF still in the foot (learner v2 + `VITE_LMS_V3=true`) | 1280 |
| `drawer-submitted-390.png.b64` | The same drawer | 390 |
| `intake-page-submitted-1280.png.b64` | `/learn/week/0/intake` (learner v2, v3 off), submitted, scrolled to the end: Download Your Answers (PDF) beside Submit | 1280 |
| `intake-page-submitted-390.png.b64` | The same page | 390 |
| `admin-workspace-intake-1280.png.b64` | Admin › Workspaces › Northshore Group: Download PDF beside View intake on the Intake card | 1280 |
| `admin-workspace-intake-390.png.b64` | The same page | 390 |
| `week-kit-1280.png.b64` | v3 Week 0 kit: the intake's "Week 0 Intake Form" form row ("Step 1 · Submitted Nov 19", View) with no static PDF on the week (the seed has none) | 1280 |
| `week-kit-390.png.b64` | The same kit | 390 |
