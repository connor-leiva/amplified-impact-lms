# Review files for PR #151

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.
`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container (an element screenshot of `[data-r2-shell]`, `?as=admin&parity=r2`, the frozen clock, `fonts.conf`), `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel). `build only` files are the fixture build in Chromium on the host, for an eye check: the typed flip confirm (a viewport shot) and the production empty states (`?console-state=empty`: no deploy token; no `pg_stat_statements`), which have no mockup frame.

| file(s) | screen | width | kind | parts | cell diff |
|---|---|---|---|---|---|
| `integrations-1440.ref.png.b64` | integrations | 1440 | ref | 1 | 0.0000% · 0 px · dims OK |
| `integrations-1440.build.png.b64` | integrations | 1440 | build | 1 | 0.0000% · 0 px · dims OK |
| `integrations-1440.diff.png.b64` | integrations | 1440 | diff | 1 | 0.0000% · 0 px · dims OK |
| `integrations-1280.ref.png.b64` | integrations | 1280 | ref | 1 | 0.0000% · 0 px · dims OK |
| `integrations-1280.build.png.b64` | integrations | 1280 | build | 1 | 0.0000% · 0 px · dims OK |
| `integrations-1280.diff.png.b64` | integrations | 1280 | diff | 1 | 0.0000% · 0 px · dims OK |
| `integrations-1024.ref.png.b64` | integrations | 1024 | ref | 1 | 0.0000% · 0 px · dims OK |
| `integrations-1024.build.png.b64` | integrations | 1024 | build | 1 | 0.0000% · 0 px · dims OK |
| `integrations-1024.diff.png.b64` | integrations | 1024 | diff | 1 | 0.0000% · 0 px · dims OK |
| `integrations-390.ref.png.b64` | integrations | 390 | ref | 1 | 0.0000% · 0 px · dims OK |
| `integrations-390.build.png.b64` | integrations | 390 | build | 1 | 0.0000% · 0 px · dims OK |
| `integrations-390.diff.png.b64` | integrations | 390 | diff | 1 | 0.0000% · 0 px · dims OK |
| `deploys-1440.ref.png.b64` | deploys | 1440 | ref | 1 | 0.0000% · 0 px · dims OK |
| `deploys-1440.build.png.b64` | deploys | 1440 | build | 1 | 0.0000% · 0 px · dims OK |
| `deploys-1440.diff.png.b64` | deploys | 1440 | diff | 1 | 0.0000% · 0 px · dims OK |
| `deploys-1280.ref.png.b64` | deploys | 1280 | ref | 1 | 0.0000% · 0 px · dims OK |
| `deploys-1280.build.png.b64` | deploys | 1280 | build | 1 | 0.0000% · 0 px · dims OK |
| `deploys-1280.diff.png.b64` | deploys | 1280 | diff | 1 | 0.0000% · 0 px · dims OK |
| `deploys-1024.ref.png.b64` | deploys | 1024 | ref | 1 | 0.0000% · 0 px · dims OK |
| `deploys-1024.build.png.b64` | deploys | 1024 | build | 1 | 0.0000% · 0 px · dims OK |
| `deploys-1024.diff.png.b64` | deploys | 1024 | diff | 1 | 0.0000% · 0 px · dims OK |
| `deploys-390.ref.png.b64` | deploys | 390 | ref | 1 | 0.0685% · 415 px · dims OK |
| `deploys-390.build.png.b64` | deploys | 390 | build | 1 | 0.0685% · 415 px · dims OK |
| `deploys-390.diff.png.b64` | deploys | 390 | diff | 1 | 0.0685% · 415 px · dims OK |
| `db-1440.ref.png.b64` | db | 1440 | ref | 1 | 0.0000% · 0 px · dims OK |
| `db-1440.build.png.b64` | db | 1440 | build | 1 | 0.0000% · 0 px · dims OK |
| `db-1440.diff.png.b64` | db | 1440 | diff | 1 | 0.0000% · 0 px · dims OK |
| `db-1280.ref.png.b64` | db | 1280 | ref | 1 | 0.0000% · 0 px · dims OK |
| `db-1280.build.png.b64` | db | 1280 | build | 1 | 0.0000% · 0 px · dims OK |
| `db-1280.diff.png.b64` | db | 1280 | diff | 1 | 0.0000% · 0 px · dims OK |
| `db-1024.ref.png.b64` | db | 1024 | ref | 1 | 0.0000% · 0 px · dims OK |
| `db-1024.build.png.b64` | db | 1024 | build | 1 | 0.0000% · 0 px · dims OK |
| `db-1024.diff.png.b64` | db | 1024 | diff | 1 | 0.0000% · 0 px · dims OK |
| `db-390.ref.png.b64` | db | 390 | ref | 1 | 0.0000% · 0 px · dims OK |
| `db-390.build.png.b64` | db | 390 | build | 1 | 0.0000% · 0 px · dims OK |
| `db-390.diff.png.b64` | db | 390 | diff | 1 | 0.0000% · 0 px · dims OK |
| `flags-1440.ref.png.b64` | flags | 1440 | ref | 1 | 0.0000% · 0 px · dims OK |
| `flags-1440.build.png.b64` | flags | 1440 | build | 1 | 0.0000% · 0 px · dims OK |
| `flags-1440.diff.png.b64` | flags | 1440 | diff | 1 | 0.0000% · 0 px · dims OK |
| `flags-1280.ref.png.b64` | flags | 1280 | ref | 1 | 0.0000% · 0 px · dims OK |
| `flags-1280.build.png.b64` | flags | 1280 | build | 1 | 0.0000% · 0 px · dims OK |
| `flags-1280.diff.png.b64` | flags | 1280 | diff | 1 | 0.0000% · 0 px · dims OK |
| `flags-1024.ref.png.b64` | flags | 1024 | ref | 1 | 0.0000% · 0 px · dims OK |
| `flags-1024.build.png.b64` | flags | 1024 | build | 1 | 0.0000% · 0 px · dims OK |
| `flags-1024.diff.png.b64` | flags | 1024 | diff | 1 | 0.0000% · 0 px · dims OK |
| `flags-390.ref.png.b64` | flags | 390 | ref | 1 | 0.1979% · 1290 px · dims OK (not enforced) |
| `flags-390.build.png.b64` | flags | 390 | build | 1 | 0.1979% · 1290 px · dims OK (not enforced) |
| `flags-390.diff.png.b64` | flags | 390 | diff | 1 | 0.1979% · 1290 px · dims OK (not enforced) |
| `db-slow-unavailable-1280.build.png.b64` | db-slow-unavailable | 1280 | build only | 1 | no mockup frame |
| `db-slow-unavailable-390.build.png.b64` | db-slow-unavailable | 390 | build only | 1 | no mockup frame |
| `deploys-not-configured-1280.build.png.b64` | deploys-not-configured | 1280 | build only | 1 | no mockup frame |
| `deploys-not-configured-390.build.png.b64` | deploys-not-configured | 390 | build only | 1 | no mockup frame |
| `flip-confirm-1280.build.png.b64` | flip-confirm | 1280 | build only | 1 | no mockup frame |
| `flip-confirm-390.build.png.b64` | flip-confirm | 390 | build only | 1 | no mockup frame |
