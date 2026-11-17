# Review files for PR #158

R2-gaps-c (D-172): the Audit Log's Export selected, and Roles & Permissions' Invite staff and Change role…. Touched screens: `audit`, `roles`, `roles-confirm`: every cell at its D-160 numbers, nothing new enforced, no approved exception (no key facts on these screens). `audit` has 0 px over the strict guard's 60 delta at every width. `roles` (321 at 1440, 1280 and 1024; 613 at 390) and `roles-confirm` (245 at 1440, 1280 and 1024) have the same pixels over the 60 delta as on #153's final head: the permission matrix's check column (one Support box the build leaves unchecked where the mockup draws Yes, R2-3b's own), which this PR doesn't touch; Invite staff, the staff rows' "…" and the dialogs add none.

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.

Measured at gaps-c's code at `b60bd25` (#153's final `320c23c` merged in through gaps-a and gaps-b), the code of this part's final head: after it come only these files and two D-172 lines in `DECISIONS.md`; the results comment's parity run at the head gives the same numbers.

## The touched screens: ref, build and diff at four widths

`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`, Chromium 153.0.8010.12, `fonts.conf`), `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel). The last column is the strict guard's (report-only): pixels where an RGB channel differs by more than 60, with their box, and pixelmatch 0.1 with `includeAA: true`.

| file(s) | screen | width | kind | parts | cell diff (the rule) | strict (report-only) |
|---|---|---|---|---|---|---|
| `audit-1440.ref.png.b64` | audit | 1440 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `audit-1440.build.png.b64` | audit | 1440 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `audit-1440.diff.png.b64` | audit | 1440 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `audit-1280.ref.png.b64` | audit | 1280 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `audit-1280.build.png.b64` | audit | 1280 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `audit-1280.diff.png.b64` | audit | 1280 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `audit-1024.ref.png.b64` | audit | 1024 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `audit-1024.build.png.b64` | audit | 1024 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `audit-1024.diff.png.b64` | audit | 1024 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `audit-390.ref.png.b64` | audit | 390 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `audit-390.build.png.b64` | audit | 390 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `audit-390.diff.png.b64` | audit | 390 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `roles-1440.ref.png.b64` | roles | 1440 | ref | 1 | 0.0190% · 272 px · dims OK · enforced, pass | Δ>60 321 px [x 1299–1343, y 812–827], AA 354 px |
| `roles-1440.build.png.b64` | roles | 1440 | build | 1 | 0.0190% · 272 px · dims OK · enforced, pass | Δ>60 321 px [x 1299–1343, y 812–827], AA 354 px |
| `roles-1440.diff.png.b64` | roles | 1440 | diff | 1 | 0.0190% · 272 px · dims OK · enforced, pass | Δ>60 321 px [x 1299–1343, y 812–827], AA 354 px |
| `roles-1280.ref.png.b64` | roles | 1280 | ref | 1 | 0.0214% · 272 px · dims OK · enforced, pass | Δ>60 321 px [x 1139–1183, y 812–827], AA 354 px |
| `roles-1280.build.png.b64` | roles | 1280 | build | 1 | 0.0214% · 272 px · dims OK · enforced, pass | Δ>60 321 px [x 1139–1183, y 812–827], AA 354 px |
| `roles-1280.diff.png.b64` | roles | 1280 | diff | 1 | 0.0214% · 272 px · dims OK · enforced, pass | Δ>60 321 px [x 1139–1183, y 812–827], AA 354 px |
| `roles-1024.ref.png.b64` | roles | 1024 | ref | 1 | 0.0267% · 272 px · dims OK · enforced, pass | Δ>60 321 px [x 891–935, y 812–827], AA 354 px |
| `roles-1024.build.png.b64` | roles | 1024 | build | 1 | 0.0267% · 272 px · dims OK · enforced, pass | Δ>60 321 px [x 891–935, y 812–827], AA 354 px |
| `roles-1024.diff.png.b64` | roles | 1024 | diff | 1 | 0.0267% · 272 px · dims OK · enforced, pass | Δ>60 321 px [x 891–935, y 812–827], AA 354 px |
| `roles-390.ref.png.b64` | roles | 390 | ref | 1 | 0.0426% · 462 px · dims OK · enforced, pass | Δ>60 613 px [x 241–356, y 2255–2276], AA 641 px |
| `roles-390.build.png.b64` | roles | 390 | build | 1 | 0.0426% · 462 px · dims OK · enforced, pass | Δ>60 613 px [x 241–356, y 2255–2276], AA 641 px |
| `roles-390.diff.png.b64` | roles | 390 | diff | 1 | 0.0426% · 462 px · dims OK · enforced, pass | Δ>60 613 px [x 241–356, y 2255–2276], AA 641 px |
| `roles-confirm-1440.ref.png.b64` | roles-confirm | 1440 | ref | 1 | 0.0203% · 263 px · dims OK · enforced, pass | Δ>60 245 px [x 1300–1344, y 812–827], AA 340 px |
| `roles-confirm-1440.build.png.b64` | roles-confirm | 1440 | build | 1 | 0.0203% · 263 px · dims OK · enforced, pass | Δ>60 245 px [x 1300–1344, y 812–827], AA 340 px |
| `roles-confirm-1440.diff.png.b64` | roles-confirm | 1440 | diff | 1 | 0.0203% · 263 px · dims OK · enforced, pass | Δ>60 245 px [x 1300–1344, y 812–827], AA 340 px |
| `roles-confirm-1280.ref.png.b64` | roles-confirm | 1280 | ref | 1 | 0.0228% · 263 px · dims OK · enforced, pass | Δ>60 245 px [x 1140–1184, y 812–827], AA 340 px |
| `roles-confirm-1280.build.png.b64` | roles-confirm | 1280 | build | 1 | 0.0228% · 263 px · dims OK · enforced, pass | Δ>60 245 px [x 1140–1184, y 812–827], AA 340 px |
| `roles-confirm-1280.diff.png.b64` | roles-confirm | 1280 | diff | 1 | 0.0228% · 263 px · dims OK · enforced, pass | Δ>60 245 px [x 1140–1184, y 812–827], AA 340 px |
| `roles-confirm-1024.ref.png.b64` | roles-confirm | 1024 | ref | 1 | 0.0285% · 263 px · dims OK · enforced, pass | Δ>60 245 px [x 892–936, y 812–827], AA 340 px |
| `roles-confirm-1024.build.png.b64` | roles-confirm | 1024 | build | 1 | 0.0285% · 263 px · dims OK · enforced, pass | Δ>60 245 px [x 892–936, y 812–827], AA 340 px |
| `roles-confirm-1024.diff.png.b64` | roles-confirm | 1024 | diff | 1 | 0.0285% · 263 px · dims OK · enforced, pass | Δ>60 245 px [x 892–936, y 812–827], AA 340 px |
| `roles-confirm-390.ref.png.b64` | roles-confirm | 390 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `roles-confirm-390.build.png.b64` | roles-confirm | 390 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `roles-confirm-390.diff.png.b64` | roles-confirm | 390 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |

## Build-only frames: every new menu, dialog and state (no mockup frame)

Menus and dialogs stay closed in the parity frames, so these have no ref: each is the app alone, captured in the same pinned container with the R2 renderer's fonts, at 1280 × 900 and 390 × 844 (the viewport), with the mockup's data (`?parity=r2`).

| file(s) | state | width | kind | parts |
|---|---|---|---|---|
| `audit-export-selected-1280.build.png.b64` | audit-export-selected | 1280 | build only | 1 |
| `audit-export-selected-390.build.png.b64` | audit-export-selected | 390 | build only | 1 |
| `roles-change-role-confirm-1280.build.png.b64` | roles-change-role-confirm | 1280 | build only | 1 |
| `roles-change-role-confirm-390.build.png.b64` | roles-change-role-confirm | 390 | build only | 1 |
| `roles-change-role-form-1280.build.png.b64` | roles-change-role-form | 1280 | build only | 1 |
| `roles-change-role-form-390.build.png.b64` | roles-change-role-form | 390 | build only | 1 |
| `roles-invite-confirm-1280.build.png.b64` | roles-invite-confirm | 1280 | build only | 1 |
| `roles-invite-confirm-390.build.png.b64` | roles-invite-confirm | 390 | build only | 1 |
| `roles-invite-form-1280.build.png.b64` | roles-invite-form | 1280 | build only | 1 |
| `roles-invite-form-390.build.png.b64` | roles-invite-form | 390 | build only | 1 |
| `roles-staff-menu-1280.build.png.b64` | roles-staff-menu | 1280 | build only | 1 |
| `roles-staff-menu-390.build.png.b64` | roles-staff-menu | 390 | build only | 1 |
