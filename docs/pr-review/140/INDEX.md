# Review files for PR #140

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.
`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container, `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel). A `roles-confirm` build is the app's viewport frame placed 16px in on the stage grey, exactly where the harness's ref has its frame (D-160 R2-3b, editable Roles).

The last column is the strict guard's (D-160 R2-3a, report-only): pixels where an RGB channel differs by more than 60, and pixelmatch 0.1 with `includeAA: true`.

| file(s) | screen | width | kind | parts | cell diff (the rule) | strict (report-only) |
|---|---|---|---|---|---|---|
| `audit-1440.ref.png.b64` | audit | 1440 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `audit-1440.build.png.b64` | audit | 1440 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `audit-1440.diff.png.b64` | audit | 1440 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `audit-1280.ref.png.b64` | audit | 1280 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `audit-1280.build.png.b64` | audit | 1280 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `audit-1280.diff.png.b64` | audit | 1280 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `audit-1024.ref.png.b64` | audit | 1024 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `audit-1024.build.png.b64` | audit | 1024 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `audit-1024.diff.png.b64` | audit | 1024 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `audit-390.ref.png.b64` | audit | 390 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `audit-390.build.png.b64` | audit | 390 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `audit-390.diff.png.b64` | audit | 390 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `roles-1440.ref.png.b64` | roles | 1440 | ref | 1 | 0.0190% · 272 px · dims OK · enforced, pass | strict: Δ>60 321 px, AA 354 px |
| `roles-1440.build.png.b64` | roles | 1440 | build | 1 | 0.0190% · 272 px · dims OK · enforced, pass | strict: Δ>60 321 px, AA 354 px |
| `roles-1440.diff.png.b64` | roles | 1440 | diff | 1 | 0.0190% · 272 px · dims OK · enforced, pass | strict: Δ>60 321 px, AA 354 px |
| `roles-1280.ref.png.b64` | roles | 1280 | ref | 1 | 0.0214% · 272 px · dims OK · enforced, pass | strict: Δ>60 321 px, AA 354 px |
| `roles-1280.build.png.b64` | roles | 1280 | build | 1 | 0.0214% · 272 px · dims OK · enforced, pass | strict: Δ>60 321 px, AA 354 px |
| `roles-1280.diff.png.b64` | roles | 1280 | diff | 1 | 0.0214% · 272 px · dims OK · enforced, pass | strict: Δ>60 321 px, AA 354 px |
| `roles-1024.ref.png.b64` | roles | 1024 | ref | 1 | 0.0267% · 272 px · dims OK · enforced, pass | strict: Δ>60 321 px, AA 354 px |
| `roles-1024.build.png.b64` | roles | 1024 | build | 1 | 0.0267% · 272 px · dims OK · enforced, pass | strict: Δ>60 321 px, AA 354 px |
| `roles-1024.diff.png.b64` | roles | 1024 | diff | 1 | 0.0267% · 272 px · dims OK · enforced, pass | strict: Δ>60 321 px, AA 354 px |
| `roles-390.ref.png.b64` | roles | 390 | ref | 1 | 0.0426% · 462 px · dims OK · enforced, pass | strict: Δ>60 613 px, AA 641 px |
| `roles-390.build.png.b64` | roles | 390 | build | 1 | 0.0426% · 462 px · dims OK · enforced, pass | strict: Δ>60 613 px, AA 641 px |
| `roles-390.diff.png.b64` | roles | 390 | diff | 1 | 0.0426% · 462 px · dims OK · enforced, pass | strict: Δ>60 613 px, AA 641 px |
| `roles-confirm-1440.ref.png.b64` | roles-confirm | 1440 | ref | 1 | 0.0203% · 263 px · dims OK · enforced, pass | strict: Δ>60 245 px, AA 340 px |
| `roles-confirm-1440.build.png.b64` | roles-confirm | 1440 | build | 1 | 0.0203% · 263 px · dims OK · enforced, pass | strict: Δ>60 245 px, AA 340 px |
| `roles-confirm-1440.diff.png.b64` | roles-confirm | 1440 | diff | 1 | 0.0203% · 263 px · dims OK · enforced, pass | strict: Δ>60 245 px, AA 340 px |
| `roles-confirm-1280.ref.png.b64` | roles-confirm | 1280 | ref | 1 | 0.0228% · 263 px · dims OK · enforced, pass | strict: Δ>60 245 px, AA 340 px |
| `roles-confirm-1280.build.png.b64` | roles-confirm | 1280 | build | 1 | 0.0228% · 263 px · dims OK · enforced, pass | strict: Δ>60 245 px, AA 340 px |
| `roles-confirm-1280.diff.png.b64` | roles-confirm | 1280 | diff | 1 | 0.0228% · 263 px · dims OK · enforced, pass | strict: Δ>60 245 px, AA 340 px |
| `roles-confirm-1024.ref.png.b64` | roles-confirm | 1024 | ref | 1 | 0.0285% · 263 px · dims OK · enforced, pass | strict: Δ>60 245 px, AA 340 px |
| `roles-confirm-1024.build.png.b64` | roles-confirm | 1024 | build | 1 | 0.0285% · 263 px · dims OK · enforced, pass | strict: Δ>60 245 px, AA 340 px |
| `roles-confirm-1024.diff.png.b64` | roles-confirm | 1024 | diff | 1 | 0.0285% · 263 px · dims OK · enforced, pass | strict: Δ>60 245 px, AA 340 px |
| `roles-confirm-390.ref.png.b64` | roles-confirm | 390 | ref | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `roles-confirm-390.build.png.b64` | roles-confirm | 390 | build | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
| `roles-confirm-390.diff.png.b64` | roles-confirm | 390 | diff | 1 | 0.0000% · 0 px · dims OK · enforced, pass | strict: Δ>60 0 px, AA 0 px |
