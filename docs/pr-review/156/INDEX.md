# Review files for PR #156

R2-gaps-a (D-172): Curriculum's Duplicate, and the Module Builder's Add step, Duplicate step and Remove step. Touched screens: `curriculum`, `builder`: every cell at its D-160 numbers, 0 px over the strict guard's 60 delta, nothing new enforced, no approved exception (no key facts on either screen).

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.

Measured at gaps-a's code at `31caeb3` (the merge of #153's final `320c23c`), the code of this part's final head: the commit that adds these files changes only `docs/pr-review/156/`.

## The touched screens: ref, build and diff at four widths

`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`, Chromium 153.0.8010.12, `fonts.conf`), `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel). The last column is the strict guard's (report-only): pixels where an RGB channel differs by more than 60, with their box, and pixelmatch 0.1 with `includeAA: true`.

| file(s) | screen | width | kind | parts | cell diff (the rule) | strict (report-only) |
|---|---|---|---|---|---|---|
| `curriculum-1440.ref.png.b64` | curriculum | 1440 | ref | 1 | 0.0010% · 17 px · dims OK · enforced, pass | Δ>60 0 px, AA 22 px |
| `curriculum-1440.build.png.b64` | curriculum | 1440 | build | 1 | 0.0010% · 17 px · dims OK · enforced, pass | Δ>60 0 px, AA 22 px |
| `curriculum-1440.diff.png.b64` | curriculum | 1440 | diff | 1 | 0.0010% · 17 px · dims OK · enforced, pass | Δ>60 0 px, AA 22 px |
| `curriculum-1280.ref.png.b64` | curriculum | 1280 | ref | 1 | 0.0012% · 17 px · dims OK · enforced, pass | Δ>60 0 px, AA 22 px |
| `curriculum-1280.build.png.b64` | curriculum | 1280 | build | 1 | 0.0012% · 17 px · dims OK · enforced, pass | Δ>60 0 px, AA 22 px |
| `curriculum-1280.diff.png.b64` | curriculum | 1280 | diff | 1 | 0.0012% · 17 px · dims OK · enforced, pass | Δ>60 0 px, AA 22 px |
| `curriculum-1024.ref.png.b64` | curriculum | 1024 | ref | 1 | 0.0015% · 17 px · dims OK · enforced, pass | Δ>60 0 px, AA 22 px |
| `curriculum-1024.build.png.b64` | curriculum | 1024 | build | 1 | 0.0015% · 17 px · dims OK · enforced, pass | Δ>60 0 px, AA 22 px |
| `curriculum-1024.diff.png.b64` | curriculum | 1024 | diff | 1 | 0.0015% · 17 px · dims OK · enforced, pass | Δ>60 0 px, AA 22 px |
| `curriculum-390.ref.png.b64` | curriculum | 390 | ref | 1 | 0.0007% · 8 px · dims OK · enforced, pass | Δ>60 0 px, AA 80 px |
| `curriculum-390.build.png.b64` | curriculum | 390 | build | 1 | 0.0007% · 8 px · dims OK · enforced, pass | Δ>60 0 px, AA 80 px |
| `curriculum-390.diff.png.b64` | curriculum | 390 | diff | 1 | 0.0007% · 8 px · dims OK · enforced, pass | Δ>60 0 px, AA 80 px |
| `builder-1440.ref.png.b64` | builder | 1440 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `builder-1440.build.png.b64` | builder | 1440 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `builder-1440.diff.png.b64` | builder | 1440 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `builder-1280.ref.png.b64` | builder | 1280 | ref | 1 | 0.0001% · 1 px · dims OK · enforced, pass | Δ>60 0 px, AA 3 px |
| `builder-1280.build.png.b64` | builder | 1280 | build | 1 | 0.0001% · 1 px · dims OK · enforced, pass | Δ>60 0 px, AA 3 px |
| `builder-1280.diff.png.b64` | builder | 1280 | diff | 1 | 0.0001% · 1 px · dims OK · enforced, pass | Δ>60 0 px, AA 3 px |
| `builder-1024.ref.png.b64` | builder | 1024 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `builder-1024.build.png.b64` | builder | 1024 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `builder-1024.diff.png.b64` | builder | 1024 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `builder-390.ref.png.b64` | builder | 390 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `builder-390.build.png.b64` | builder | 390 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |
| `builder-390.diff.png.b64` | builder | 390 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | Δ>60 0 px, AA 0 px |

## Build-only frames: every new menu, dialog and state (no mockup frame)

Menus and dialogs stay closed in the parity frames, so these have no ref: each is the app alone, captured in the same pinned container with the R2 renderer's fonts, at 1280 × 900 and 390 × 844 (the viewport), with the mockup's data (`?parity=r2`).

| file(s) | state | width | kind | parts |
|---|---|---|---|---|
| `curriculum-duplicated-1280.build.png.b64` | curriculum-duplicated | 1280 | build only | 1 |
| `curriculum-duplicated-390.build.png.b64` | curriculum-duplicated | 390 | build only | 1 |
| `curriculum-row-menu-1280.build.png.b64` | curriculum-row-menu | 1280 | build only | 1 |
| `curriculum-row-menu-390.build.png.b64` | curriculum-row-menu | 390 | build only | 1 |
| `builder-add-step-1280.build.png.b64` | builder-add-step | 1280 | build only | 1 |
| `builder-add-step-390.build.png.b64` | builder-add-step | 390 | build only | 1 |
| `builder-remove-step-confirm-1280.build.png.b64` | builder-remove-step-confirm | 1280 | build only | 1 |
| `builder-remove-step-confirm-390.build.png.b64` | builder-remove-step-confirm | 390 | build only | 1 |
| `builder-step-menu-1280.build.png.b64` | builder-step-menu | 1280 | build only | 1 |
| `builder-step-menu-390.build.png.b64` | builder-step-menu | 390 | build only | 1 |
