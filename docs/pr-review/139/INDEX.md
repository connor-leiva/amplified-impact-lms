# Review files for PR #139

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.
`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container, `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel).
`strict` is the report-only guard added after the eye check (D-160 R2-3a, `compliance/lib/admin-r2-strict.ts`): `AA` is pixelmatch at 0.1 with `includeAA: true`, `Δ>60` the pixels where any RGB channel differs by more than 60. Staff & Roles has no mockup frame, so it has a build image only and no parity cell.

| file(s) | screen | width | kind | parts | cell diff | strict (report-only) |
|---|---|---|---|---|---|---|
| `overview-1440.ref.png.b64` | overview | 1440 | ref | 1 | 0.0013% · 19 px · dims OK | AA 59 px · Δ>60 0 px |
| `overview-1440.build.png.b64` | overview | 1440 | build | 1 | 0.0013% · 19 px · dims OK | AA 59 px · Δ>60 0 px |
| `overview-1440.diff.png.b64` | overview | 1440 | diff | 1 | 0.0013% · 19 px · dims OK | AA 59 px · Δ>60 0 px |
| `overview-1280.ref.png.b64` | overview | 1280 | ref | 1 | 0.0015% · 19 px · dims OK | AA 56 px · Δ>60 0 px |
| `overview-1280.build.png.b64` | overview | 1280 | build | 1 | 0.0015% · 19 px · dims OK | AA 56 px · Δ>60 0 px |
| `overview-1280.diff.png.b64` | overview | 1280 | diff | 1 | 0.0015% · 19 px · dims OK | AA 56 px · Δ>60 0 px |
| `overview-1024.ref.png.b64` | overview | 1024 | ref | 1 | 0.0021% · 25 px · dims OK | AA 70 px · Δ>60 0 px |
| `overview-1024.build.png.b64` | overview | 1024 | build | 1 | 0.0021% · 25 px · dims OK | AA 70 px · Δ>60 0 px |
| `overview-1024.diff.png.b64` | overview | 1024 | diff | 1 | 0.0021% · 25 px · dims OK | AA 70 px · Δ>60 0 px |
| `overview-390.ref.png.b64` | overview | 390 | ref | 1 | 0.0054% · 42 px · dims OK | AA 98 px · Δ>60 0 px |
| `overview-390.build.png.b64` | overview | 390 | build | 1 | 0.0054% · 42 px · dims OK | AA 98 px · Δ>60 0 px |
| `overview-390.diff.png.b64` | overview | 390 | diff | 1 | 0.0054% · 42 px · dims OK | AA 98 px · Δ>60 0 px |
| `learners-1440.ref.png.b64` | learners | 1440 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `learners-1440.build.png.b64` | learners | 1440 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `learners-1440.diff.png.b64` | learners | 1440 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `learners-1280.ref.png.b64` | learners | 1280 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `learners-1280.build.png.b64` | learners | 1280 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `learners-1280.diff.png.b64` | learners | 1280 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `learners-1024.ref.png.b64` | learners | 1024 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `learners-1024.build.png.b64` | learners | 1024 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `learners-1024.diff.png.b64` | learners | 1024 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `learners-390.ref.png.b64` | learners | 390 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `learners-390.build.png.b64` | learners | 390 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `learners-390.diff.png.b64` | learners | 390 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-1440.ref.png.b64` | tiers | 1440 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-1440.build.png.b64` | tiers | 1440 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-1440.diff.png.b64` | tiers | 1440 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-1280.ref.png.b64` | tiers | 1280 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-1280.build.png.b64` | tiers | 1280 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-1280.diff.png.b64` | tiers | 1280 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-1024.ref.png.b64` | tiers | 1024 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-1024.build.png.b64` | tiers | 1024 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-1024.diff.png.b64` | tiers | 1024 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-390.ref.png.b64` | tiers | 390 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-390.build.png.b64` | tiers | 390 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `tiers-390.diff.png.b64` | tiers | 390 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px · Δ>60 0 px |
| `staff-1440.build.png.b64` | staff (Staff & Roles, `/admin/staff`) | 1440 | build | 1 | no mockup frame: no parity cell | — |
| `staff-390.build.png.b64` | staff (Staff & Roles, `/admin/staff`) | 390 | build | 1 | no mockup frame: no parity cell | — |
