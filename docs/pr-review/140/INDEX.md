# Review files for PR #140

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.
`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container, `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel).

| file(s) | screen | width | kind | parts | cell diff |
|---|---|---|---|---|---|
| `audit-1440.ref.png.b64` | audit | 1440 | ref | 1 | 0.0002% · 3 px · dims OK |
| `audit-1440.build.png.b64` | audit | 1440 | build | 1 | 0.0002% · 3 px · dims OK |
| `audit-1440.diff.png.b64` | audit | 1440 | diff | 1 | 0.0002% · 3 px · dims OK |
| `audit-1280.ref.png.b64` | audit | 1280 | ref | 1 | 0.0003% · 3 px · dims OK |
| `audit-1280.build.png.b64` | audit | 1280 | build | 1 | 0.0003% · 3 px · dims OK |
| `audit-1280.diff.png.b64` | audit | 1280 | diff | 1 | 0.0003% · 3 px · dims OK |
| `audit-1024.ref.png.b64` | audit | 1024 | ref | 1 | 0.0004% · 3 px · dims OK |
| `audit-1024.build.png.b64` | audit | 1024 | build | 1 | 0.0004% · 3 px · dims OK |
| `audit-1024.diff.png.b64` | audit | 1024 | diff | 1 | 0.0004% · 3 px · dims OK |
| `audit-390.ref.png.b64` | audit | 390 | ref | 1 | 0.0855% · 741 px · dims OK |
| `audit-390.build.png.b64` | audit | 390 | build | 1 | 0.0855% · 741 px · dims OK |
| `audit-390.diff.png.b64` | audit | 390 | diff | 1 | 0.0855% · 741 px · dims OK |
| `roles-1440.ref.png.b64` | roles | 1440 | ref | 1 | 0.2070% · 2966 px · dims OK · FAIL (over 0.1%) |
| `roles-1440.build.png.b64` | roles | 1440 | build | 1 | 0.2070% · 2966 px · dims OK · FAIL (over 0.1%) |
| `roles-1440.diff.png.b64` | roles | 1440 | diff | 1 | 0.2070% · 2966 px · dims OK · FAIL (over 0.1%) |
| `roles-1280.ref.png.b64` | roles | 1280 | ref | 1 | 0.2329% · 2966 px · dims OK · FAIL (over 0.1%) |
| `roles-1280.build.png.b64` | roles | 1280 | build | 1 | 0.2329% · 2966 px · dims OK · FAIL (over 0.1%) |
| `roles-1280.diff.png.b64` | roles | 1280 | diff | 1 | 0.2329% · 2966 px · dims OK · FAIL (over 0.1%) |
| `roles-1024.ref.png.b64` | roles | 1024 | ref | 1 | 0.2911% · 2966 px · dims OK · FAIL (over 0.1%) |
| `roles-1024.build.png.b64` | roles | 1024 | build | 1 | 0.2911% · 2966 px · dims OK · FAIL (over 0.1%) |
| `roles-1024.diff.png.b64` | roles | 1024 | diff | 1 | 0.2911% · 2966 px · dims OK · FAIL (over 0.1%) |
| `roles-390.ref.png.b64` | roles | 390 | ref | 1 | 0.5026% · 5453 px · dims OK · FAIL (over 0.1%) |
| `roles-390.build.png.b64` | roles | 390 | build | 1 | 0.5026% · 5453 px · dims OK · FAIL (over 0.1%) |
| `roles-390.diff.png.b64` | roles | 390 | diff | 1 | 0.5026% · 5453 px · dims OK · FAIL (over 0.1%) |
| `roles-confirm-1440.ref.png.b64` | roles-confirm | 1440 | ref | 1 | not built (no build or diff) |
| `roles-confirm-1280.ref.png.b64` | roles-confirm | 1280 | ref | 1 | not built (no build or diff) |
| `roles-confirm-1024.ref.png.b64` | roles-confirm | 1024 | ref | 1 | not built (no build or diff) |
| `roles-confirm-390.ref.png.b64` | roles-confirm | 390 | ref | 1 | not built (no build or diff) |
