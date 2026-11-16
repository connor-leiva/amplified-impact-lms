# Review files for PR #137

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.
`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container, `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel).

| file(s) | screen | width | kind | parts | cell diff |
|---|---|---|---|---|---|
| `curriculum-1440.ref.png.b64` | curriculum | 1440 | ref | 1 | 0.0010% · 17 px · dims OK |
| `curriculum-1440.build.png.b64` | curriculum | 1440 | build | 1 | 0.0010% · 17 px · dims OK |
| `curriculum-1440.diff.png.b64` | curriculum | 1440 | diff | 1 | 0.0010% · 17 px · dims OK |
| `curriculum-1280.ref.png.b64` | curriculum | 1280 | ref | 1 | 0.0012% · 17 px · dims OK |
| `curriculum-1280.build.png.b64` | curriculum | 1280 | build | 1 | 0.0012% · 17 px · dims OK |
| `curriculum-1280.diff.png.b64` | curriculum | 1280 | diff | 1 | 0.0012% · 17 px · dims OK |
| `curriculum-1024.ref.png.b64` | curriculum | 1024 | ref | 1 | 0.0015% · 17 px · dims OK |
| `curriculum-1024.build.png.b64` | curriculum | 1024 | build | 1 | 0.0015% · 17 px · dims OK |
| `curriculum-1024.diff.png.b64` | curriculum | 1024 | diff | 1 | 0.0015% · 17 px · dims OK |
| `curriculum-390.ref.png.b64` | curriculum | 390 | ref | 1 | 0.0007% · 8 px · dims OK |
| `curriculum-390.build.png.b64` | curriculum | 390 | build | 1 | 0.0007% · 8 px · dims OK |
| `curriculum-390.diff.png.b64` | curriculum | 390 | diff | 1 | 0.0007% · 8 px · dims OK |
| `builder-1440.ref.png.b64` | builder | 1440 | ref | 1 | 0.0000% · 0 px · dims OK |
| `builder-1440.build.png.b64` | builder | 1440 | build | 1 | 0.0000% · 0 px · dims OK |
| `builder-1440.diff.png.b64` | builder | 1440 | diff | 1 | 0.0000% · 0 px · dims OK |
| `builder-1280.ref.png.b64` | builder | 1280 | ref | 1 | 0.0001% · 1 px · dims OK |
| `builder-1280.build.png.b64` | builder | 1280 | build | 1 | 0.0001% · 1 px · dims OK |
| `builder-1280.diff.png.b64` | builder | 1280 | diff | 1 | 0.0001% · 1 px · dims OK |
| `builder-1024.ref.png.b64` | builder | 1024 | ref | 1 | 0.0000% · 0 px · dims OK |
| `builder-1024.build.png.b64` | builder | 1024 | build | 1 | 0.0000% · 0 px · dims OK |
| `builder-1024.diff.png.b64` | builder | 1024 | diff | 1 | 0.0000% · 0 px · dims OK |
| `builder-390.ref.png.b64` | builder | 390 | ref | 1 | 0.0000% · 0 px · dims OK |
| `builder-390.build.png.b64` | builder | 390 | build | 1 | 0.0000% · 0 px · dims OK |
| `builder-390.diff.png.b64` | builder | 390 | diff | 1 | 0.0000% · 0 px · dims OK |
