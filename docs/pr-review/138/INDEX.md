# Review files for PR #138

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.
`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container, `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel).

| file(s) | screen | width | kind | parts | cell diff |
|---|---|---|---|---|---|
| `vault-1440.ref.png.b64` | vault | 1440 | ref | 1 | 0.0000% · 0 px · dims OK |
| `vault-1440.build.png.b64` | vault | 1440 | build | 1 | 0.0000% · 0 px · dims OK |
| `vault-1440.diff.png.b64` | vault | 1440 | diff | 1 | 0.0000% · 0 px · dims OK |
| `vault-1280.ref.png.b64` | vault | 1280 | ref | 1 | 0.0000% · 0 px · dims OK |
| `vault-1280.build.png.b64` | vault | 1280 | build | 1 | 0.0000% · 0 px · dims OK |
| `vault-1280.diff.png.b64` | vault | 1280 | diff | 1 | 0.0000% · 0 px · dims OK |
| `vault-1024.ref.png.b64` | vault | 1024 | ref | 1 | 0.0000% · 0 px · dims OK |
| `vault-1024.build.png.b64` | vault | 1024 | build | 1 | 0.0000% · 0 px · dims OK |
| `vault-1024.diff.png.b64` | vault | 1024 | diff | 1 | 0.0000% · 0 px · dims OK |
| `vault-390.ref.png.b64` | vault | 390 | ref | 1 | 0.0000% · 0 px · dims OK |
| `vault-390.build.png.b64` | vault | 390 | build | 1 | 0.0000% · 0 px · dims OK |
| `vault-390.diff.png.b64` | vault | 390 | diff | 1 | 0.0000% · 0 px · dims OK |
| `cohorts-sessions-1440.ref.png.b64` | cohorts-sessions | 1440 | ref | 1 | 0.0000% · 0 px · dims OK |
| `cohorts-sessions-1440.build.png.b64` | cohorts-sessions | 1440 | build | 1 | 0.0000% · 0 px · dims OK |
| `cohorts-sessions-1440.diff.png.b64` | cohorts-sessions | 1440 | diff | 1 | 0.0000% · 0 px · dims OK |
| `cohorts-sessions-1280.ref.png.b64` | cohorts-sessions | 1280 | ref | 1 | 0.0000% · 0 px · dims OK |
| `cohorts-sessions-1280.build.png.b64` | cohorts-sessions | 1280 | build | 1 | 0.0000% · 0 px · dims OK |
| `cohorts-sessions-1280.diff.png.b64` | cohorts-sessions | 1280 | diff | 1 | 0.0000% · 0 px · dims OK |
| `cohorts-sessions-1024.ref.png.b64` | cohorts-sessions | 1024 | ref | 1 | 0.0000% · 0 px · dims OK |
| `cohorts-sessions-1024.build.png.b64` | cohorts-sessions | 1024 | build | 1 | 0.0000% · 0 px · dims OK |
| `cohorts-sessions-1024.diff.png.b64` | cohorts-sessions | 1024 | diff | 1 | 0.0000% · 0 px · dims OK |
| `cohorts-sessions-390.ref.png.b64` | cohorts-sessions | 390 | ref | 1 | 0.3390% · 2766 px · dims OK |
| `cohorts-sessions-390.build.png.b64` | cohorts-sessions | 390 | build | 1 | 0.3390% · 2766 px · dims OK |
| `cohorts-sessions-390.diff.png.b64` | cohorts-sessions | 390 | diff | 1 | 0.3390% · 2766 px · dims OK |
| `announce-1440.ref.png.b64` | announce | 1440 | ref | 1 | 0.0000% · 0 px · dims OK |
| `announce-1440.build.png.b64` | announce | 1440 | build | 1 | 0.0000% · 0 px · dims OK |
| `announce-1440.diff.png.b64` | announce | 1440 | diff | 1 | 0.0000% · 0 px · dims OK |
| `announce-1280.ref.png.b64` | announce | 1280 | ref | 1 | 0.0000% · 0 px · dims OK |
| `announce-1280.build.png.b64` | announce | 1280 | build | 1 | 0.0000% · 0 px · dims OK |
| `announce-1280.diff.png.b64` | announce | 1280 | diff | 1 | 0.0000% · 0 px · dims OK |
| `announce-1024.ref.png.b64` | announce | 1024 | ref | 1 | 0.0000% · 0 px · dims OK |
| `announce-1024.build.png.b64` | announce | 1024 | build | 1 | 0.0000% · 0 px · dims OK |
| `announce-1024.diff.png.b64` | announce | 1024 | diff | 1 | 0.0000% · 0 px · dims OK |
| `announce-390.ref.png.b64` | announce | 390 | ref | 1 | 0.0000% · 0 px · dims OK |
| `announce-390.build.png.b64` | announce | 390 | build | 1 | 0.0000% · 0 px · dims OK |
| `announce-390.diff.png.b64` | announce | 390 | diff | 1 | 0.0000% · 0 px · dims OK |
