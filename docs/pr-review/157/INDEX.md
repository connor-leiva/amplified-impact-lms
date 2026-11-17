# Review files for PR #157

R2-gaps-b (D-172): the Resource Vault's Download, Edit details and Attached to; Cohorts & Sessions' Add session and Attach replay; Announcements' Save draft, Edit and Duplicate. Touched screens: `vault`, `cohorts-sessions`, `announce`: every cell at its D-160 numbers, nothing new enforced. `cohorts-sessions-390` is decision A's approved exception (#138, the 15px key facts) at its recorded ceiling, unchanged; it is this PR's only cell with pixels over the strict guard's 60 delta (3,827, the key-facts strip, the same as on #153's final head), and every other cell has 0.

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.

Measured at gaps-b's code at `326d2a2` (#153's final `320c23c` merged in through gaps-a), the code of this part's final head: the commit that adds these files changes only `docs/pr-review/157/`.

## The touched screens: ref, build and diff at four widths

`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`, Chromium 153.0.8010.12, `fonts.conf`), `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel). The last column is the strict guard's (report-only): pixels where an RGB channel differs by more than 60, with their box, and pixelmatch 0.1 with `includeAA: true`.

| file(s) | screen | width | kind | parts | cell diff (the rule) | strict (report-only) |
|---|---|---|---|---|---|---|
| `vault-1440.ref.png.b64` | vault | 1440 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `vault-1440.build.png.b64` | vault | 1440 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `vault-1440.diff.png.b64` | vault | 1440 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `vault-1280.ref.png.b64` | vault | 1280 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `vault-1280.build.png.b64` | vault | 1280 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `vault-1280.diff.png.b64` | vault | 1280 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `vault-1024.ref.png.b64` | vault | 1024 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `vault-1024.build.png.b64` | vault | 1024 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `vault-1024.diff.png.b64` | vault | 1024 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `vault-390.ref.png.b64` | vault | 390 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `vault-390.build.png.b64` | vault | 390 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `vault-390.diff.png.b64` | vault | 390 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `cohorts-sessions-1440.ref.png.b64` | cohorts-sessions | 1440 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `cohorts-sessions-1440.build.png.b64` | cohorts-sessions | 1440 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `cohorts-sessions-1440.diff.png.b64` | cohorts-sessions | 1440 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `cohorts-sessions-1280.ref.png.b64` | cohorts-sessions | 1280 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `cohorts-sessions-1280.build.png.b64` | cohorts-sessions | 1280 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `cohorts-sessions-1280.diff.png.b64` | cohorts-sessions | 1280 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `cohorts-sessions-1024.ref.png.b64` | cohorts-sessions | 1024 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `cohorts-sessions-1024.build.png.b64` | cohorts-sessions | 1024 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `cohorts-sessions-1024.diff.png.b64` | cohorts-sessions | 1024 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `cohorts-sessions-390.ref.png.b64` | cohorts-sessions | 390 | ref | 1 | 0.3390% · 2,766 px · dims OK · enforced, pass | Δ>60 3,827 px [x 29–297, y 276–510], AA 4,566 px |
| `cohorts-sessions-390.build.png.b64` | cohorts-sessions | 390 | build | 1 | 0.3390% · 2,766 px · dims OK · enforced, pass | Δ>60 3,827 px [x 29–297, y 276–510], AA 4,566 px |
| `cohorts-sessions-390.diff.png.b64` | cohorts-sessions | 390 | diff | 1 | 0.3390% · 2,766 px · dims OK · enforced, pass | Δ>60 3,827 px [x 29–297, y 276–510], AA 4,566 px |
| `announce-1440.ref.png.b64` | announce | 1440 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `announce-1440.build.png.b64` | announce | 1440 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `announce-1440.diff.png.b64` | announce | 1440 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `announce-1280.ref.png.b64` | announce | 1280 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `announce-1280.build.png.b64` | announce | 1280 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `announce-1280.diff.png.b64` | announce | 1280 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `announce-1024.ref.png.b64` | announce | 1024 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `announce-1024.build.png.b64` | announce | 1024 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `announce-1024.diff.png.b64` | announce | 1024 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `announce-390.ref.png.b64` | announce | 390 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `announce-390.build.png.b64` | announce | 390 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `announce-390.diff.png.b64` | announce | 390 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |

## Build-only frames: every new menu, dialog and state (no mockup frame)

Menus and dialogs stay closed in the parity frames, so these have no ref: each is the app alone, captured in the same pinned container with the R2 renderer's fonts, at 1280 × 900 and 390 × 844 (the viewport), with the mockup's data (`?parity=r2`).

| file(s) | state | width | kind | parts |
|---|---|---|---|---|
| `vault-edit-details-1280.build.png.b64` | vault-edit-details | 1280 | build only | 1 |
| `vault-edit-details-390.build.png.b64` | vault-edit-details | 390 | build only | 1 |
| `vault-hover-download-1280.build.png.b64` | vault-hover-download | 1280 | build only | 1 |
| `vault-row-menu-1280.build.png.b64` | vault-row-menu | 1280 | build only | 1 |
| `vault-row-menu-390.build.png.b64` | vault-row-menu | 390 | build only | 1 |
| `cohorts-add-session-1280.build.png.b64` | cohorts-add-session | 1280 | build only | 1 |
| `cohorts-add-session-390.build.png.b64` | cohorts-add-session | 390 | build only | 1 |
| `cohorts-attach-replay-1280.build.png.b64` | cohorts-attach-replay | 1280 | build only | 1 |
| `cohorts-attach-replay-390.build.png.b64` | cohorts-attach-replay | 390 | build only | 1 |
| `cohorts-session-menu-1280.build.png.b64` | cohorts-session-menu | 1280 | build only | 1 |
| `cohorts-session-menu-390.build.png.b64` | cohorts-session-menu | 390 | build only | 1 |
| `announce-edit-1280.build.png.b64` | announce-edit | 1280 | build only | 1 |
| `announce-edit-390.build.png.b64` | announce-edit | 390 | build only | 1 |
| `announce-new-save-draft-1280.build.png.b64` | announce-new-save-draft | 1280 | build only | 1 |
| `announce-new-save-draft-390.build.png.b64` | announce-new-save-draft | 390 | build only | 1 |
| `announce-row-menu-1280.build.png.b64` | announce-row-menu | 1280 | build only | 1 |
| `announce-row-menu-390.build.png.b64` | announce-row-menu | 390 | build only | 1 |
