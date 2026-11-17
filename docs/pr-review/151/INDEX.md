# Review files for PR #151

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.
The strict pass (D-160 R2-3a, report-only) counts with `includeAA: true` and the pixels whose RGB channels differ by more than 60, with their bounding box. `deploys-390` and `flags-390` count only inside their key-facts strip, 16px here and 15px in the mockup on a phone; with the mockup's 15px applied temporarily both measure 0 px, AA 0 and 0 over 60.
`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container (an element screenshot of `[data-r2-shell]`, `?as=admin&parity=r2`, the frozen clock, `fonts.conf`), `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel). `build only` files are the fixture build in Chromium on the host, for an eye check: the typed flip confirm (a viewport shot) and the production empty states (`?console-state=empty`: no deploy token; no `pg_stat_statements`), which have no mockup frame.

| file(s) | screen | width | kind | parts | cell diff | strict pass (report-only) |
|---|---|---|---|---|---|---|
| `integrations-1440.ref.png.b64` | integrations | 1440 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `integrations-1440.build.png.b64` | integrations | 1440 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `integrations-1440.diff.png.b64` | integrations | 1440 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `integrations-1280.ref.png.b64` | integrations | 1280 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `integrations-1280.build.png.b64` | integrations | 1280 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `integrations-1280.diff.png.b64` | integrations | 1280 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `integrations-1024.ref.png.b64` | integrations | 1024 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `integrations-1024.build.png.b64` | integrations | 1024 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `integrations-1024.diff.png.b64` | integrations | 1024 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `integrations-390.ref.png.b64` | integrations | 390 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `integrations-390.build.png.b64` | integrations | 390 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `integrations-390.diff.png.b64` | integrations | 390 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `deploys-1440.ref.png.b64` | deploys | 1440 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `deploys-1440.build.png.b64` | deploys | 1440 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `deploys-1440.diff.png.b64` | deploys | 1440 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `deploys-1280.ref.png.b64` | deploys | 1280 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `deploys-1280.build.png.b64` | deploys | 1280 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `deploys-1280.diff.png.b64` | deploys | 1280 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `deploys-1024.ref.png.b64` | deploys | 1024 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `deploys-1024.build.png.b64` | deploys | 1024 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `deploys-1024.diff.png.b64` | deploys | 1024 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `deploys-390.ref.png.b64` | deploys | 390 | ref | 1 | 0.0685% · 415 px · dims OK | AA 728 px (0.1201%) · Δ>60 600 px [x 118–287, y 226–373] |
| `deploys-390.build.png.b64` | deploys | 390 | build | 1 | 0.0685% · 415 px · dims OK | AA 728 px (0.1201%) · Δ>60 600 px [x 118–287, y 226–373] |
| `deploys-390.diff.png.b64` | deploys | 390 | diff | 1 | 0.0685% · 415 px · dims OK | AA 728 px (0.1201%) · Δ>60 600 px [x 118–287, y 226–373] |
| `db-1440.ref.png.b64` | db | 1440 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `db-1440.build.png.b64` | db | 1440 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `db-1440.diff.png.b64` | db | 1440 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `db-1280.ref.png.b64` | db | 1280 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `db-1280.build.png.b64` | db | 1280 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `db-1280.diff.png.b64` | db | 1280 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `db-1024.ref.png.b64` | db | 1024 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `db-1024.build.png.b64` | db | 1024 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `db-1024.diff.png.b64` | db | 1024 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `db-390.ref.png.b64` | db | 390 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `db-390.build.png.b64` | db | 390 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `db-390.diff.png.b64` | db | 390 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `flags-1440.ref.png.b64` | flags | 1440 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `flags-1440.build.png.b64` | flags | 1440 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `flags-1440.diff.png.b64` | flags | 1440 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `flags-1280.ref.png.b64` | flags | 1280 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `flags-1280.build.png.b64` | flags | 1280 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `flags-1280.diff.png.b64` | flags | 1280 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `flags-1024.ref.png.b64` | flags | 1024 | ref | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `flags-1024.build.png.b64` | flags | 1024 | build | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `flags-1024.diff.png.b64` | flags | 1024 | diff | 1 | 0.0000% · 0 px · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `flags-390.ref.png.b64` | flags | 390 | ref | 1 | 0.1979% · 1290 px · dims OK (approved exception, D-160: ceiling 0.1979% · 1290 px) | AA 2044 px (0.3136%) · Δ>60 1672 px [x 30–250, y 240–328] |
| `flags-390.build.png.b64` | flags | 390 | build | 1 | 0.1979% · 1290 px · dims OK (approved exception, D-160: ceiling 0.1979% · 1290 px) | AA 2044 px (0.3136%) · Δ>60 1672 px [x 30–250, y 240–328] |
| `flags-390.diff.png.b64` | flags | 390 | diff | 1 | 0.1979% · 1290 px · dims OK (approved exception, D-160: ceiling 0.1979% · 1290 px) | AA 2044 px (0.3136%) · Δ>60 1672 px [x 30–250, y 240–328] |
| `db-slow-unavailable-1280.build.png.b64` | db-slow-unavailable | 1280 | build only | 1 | no mockup frame | — |
| `db-slow-unavailable-390.build.png.b64` | db-slow-unavailable | 390 | build only | 1 | no mockup frame | — |
| `deploys-not-configured-1280.build.png.b64` | deploys-not-configured | 1280 | build only | 1 | no mockup frame | — |
| `deploys-not-configured-390.build.png.b64` | deploys-not-configured | 390 | build only | 1 | no mockup frame | — |
| `flip-confirm-1280.build.png.b64` | flip-confirm | 1280 | build only | 1 | no mockup frame | — |
| `flip-confirm-390.build.png.b64` | flip-confirm | 390 | build only | 1 | no mockup frame | — |
