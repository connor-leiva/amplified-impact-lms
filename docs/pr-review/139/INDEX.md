# Review files for PR #139

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.
`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container, `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel).

| file(s) | screen | width | kind | parts | cell diff |
|---|---|---|---|---|---|
| `overview-1440.ref.png.b64` | overview | 1440 | ref | 1 | 0.0013% · 19 px · dims OK |
| `overview-1440.build.png.b64` | overview | 1440 | build | 1 | 0.0013% · 19 px · dims OK |
| `overview-1440.diff.png.b64` | overview | 1440 | diff | 1 | 0.0013% · 19 px · dims OK |
| `overview-1280.ref.png.b64` | overview | 1280 | ref | 1 | 0.0015% · 19 px · dims OK |
| `overview-1280.build.png.b64` | overview | 1280 | build | 1 | 0.0015% · 19 px · dims OK |
| `overview-1280.diff.png.b64` | overview | 1280 | diff | 1 | 0.0015% · 19 px · dims OK |
| `overview-1024.ref.png.b64` | overview | 1024 | ref | 1 | 0.0021% · 25 px · dims OK |
| `overview-1024.build.png.b64` | overview | 1024 | build | 1 | 0.0021% · 25 px · dims OK |
| `overview-1024.diff.png.b64` | overview | 1024 | diff | 1 | 0.0021% · 25 px · dims OK |
| `overview-390.ref.png.b64` | overview | 390 | ref | 1 | 0.0054% · 42 px · dims OK |
| `overview-390.build.png.b64` | overview | 390 | build | 1 | 0.0054% · 42 px · dims OK |
| `overview-390.diff.png.b64` | overview | 390 | diff | 1 | 0.0054% · 42 px · dims OK |
| `learners-1440.ref.png.b64` | learners | 1440 | ref | 1 | 0.0003% · 3 px · dims OK |
| `learners-1440.build.png.b64` | learners | 1440 | build | 1 | 0.0003% · 3 px · dims OK |
| `learners-1440.diff.png.b64` | learners | 1440 | diff | 1 | 0.0003% · 3 px · dims OK |
| `learners-1280.ref.png.b64` | learners | 1280 | ref | 1 | 0.0003% · 3 px · dims OK |
| `learners-1280.build.png.b64` | learners | 1280 | build | 1 | 0.0003% · 3 px · dims OK |
| `learners-1280.diff.png.b64` | learners | 1280 | diff | 1 | 0.0003% · 3 px · dims OK |
| `learners-1024.ref.png.b64` | learners | 1024 | ref | 1 | 0.0004% · 3 px · dims OK |
| `learners-1024.build.png.b64` | learners | 1024 | build | 1 | 0.0004% · 3 px · dims OK |
| `learners-1024.diff.png.b64` | learners | 1024 | diff | 1 | 0.0004% · 3 px · dims OK |
| `learners-390.ref.png.b64` | learners | 390 | ref | 1 | 0.0004% · 3 px · dims OK |
| `learners-390.build.png.b64` | learners | 390 | build | 1 | 0.0004% · 3 px · dims OK |
| `learners-390.diff.png.b64` | learners | 390 | diff | 1 | 0.0004% · 3 px · dims OK |
| `tiers-1440.ref.png.b64` | tiers | 1440 | ref | 1 | 0.0016% · 36 px · dims OK |
| `tiers-1440.build.png.b64` | tiers | 1440 | build | 1 | 0.0016% · 36 px · dims OK |
| `tiers-1440.diff.png.b64` | tiers | 1440 | diff | 1 | 0.0016% · 36 px · dims OK |
| `tiers-1280.ref.png.b64` | tiers | 1280 | ref | 1 | 0.0017% · 36 px · dims OK |
| `tiers-1280.build.png.b64` | tiers | 1280 | build | 1 | 0.0017% · 36 px · dims OK |
| `tiers-1280.diff.png.b64` | tiers | 1280 | diff | 1 | 0.0017% · 36 px · dims OK |
| `tiers-1024.ref.png.b64` | tiers | 1024 | ref | 1 | 0.0022% · 36 px · dims OK |
| `tiers-1024.build.png.b64` | tiers | 1024 | build | 1 | 0.0022% · 36 px · dims OK |
| `tiers-1024.diff.png.b64` | tiers | 1024 | diff | 1 | 0.0022% · 36 px · dims OK |
| `tiers-390.ref.png.b64` | tiers | 390 | ref | 1 | 0.0030% · 36 px · dims OK |
| `tiers-390.build.png.b64` | tiers | 390 | build | 1 | 0.0030% · 36 px · dims OK |
| `tiers-390.diff.png.b64` | tiers | 390 | diff | 1 | 0.0030% · 36 px · dims OK |
