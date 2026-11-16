# PR #149 review files (D-165)

Base64 text, one line each (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file's parts concatenate in order first (`cat x.part1 x.part2 | base64 -d`). Ref: `design-reference/admin-redesign-r2/ref/`; build and diff: `pnpm parity:admin-r2` in the pinned container at this branch's head.

| File | Screen | Width | Kind | Parts | Cell diff |
|---|---|---|---|---|---|
| `api-1440.ref.png.b64` | api | 1440 | ref | 1 | 0.0122% (158 px), dims OK |
| `api-1440.build.png.b64` | api | 1440 | build | 1 | 0.0122% (158 px), dims OK |
| `api-1440.diff.png.b64` | api | 1440 | diff | 1 | 0.0122% (158 px), dims OK |
| `api-1280.ref.png.b64` | api | 1280 | ref | 1 | 0.0138% (158 px), dims OK |
| `api-1280.build.png.b64` | api | 1280 | build | 1 | 0.0138% (158 px), dims OK |
| `api-1280.diff.png.b64` | api | 1280 | diff | 1 | 0.0138% (158 px), dims OK |
| `api-1024.ref.png.b64` | api | 1024 | ref | 1 | 0.0178% (158 px), dims OK |
| `api-1024.build.png.b64` | api | 1024 | build | 1 | 0.0178% (158 px), dims OK |
| `api-1024.diff.png.b64` | api | 1024 | diff | 1 | 0.0178% (158 px), dims OK |
| `api-390.ref.png.b64` | api | 390 | ref | 1 | 0.0000% (0 px), dims OK |
| `api-390.build.png.b64` | api | 390 | build | 1 | 0.0000% (0 px), dims OK |
| `api-390.diff.png.b64` | api | 390 | diff | 1 | 0.0000% (0 px), dims OK |
| `jobs-1440.ref.png.b64` | jobs | 1440 | ref | 1 | 0.0000% (0 px), dims OK |
| `jobs-1440.build.png.b64` | jobs | 1440 | build | 1 | 0.0000% (0 px), dims OK |
| `jobs-1440.diff.png.b64` | jobs | 1440 | diff | 1 | 0.0000% (0 px), dims OK |
| `jobs-1280.ref.png.b64` | jobs | 1280 | ref | 1 | 0.0000% (0 px), dims OK |
| `jobs-1280.build.png.b64` | jobs | 1280 | build | 1 | 0.0000% (0 px), dims OK |
| `jobs-1280.diff.png.b64` | jobs | 1280 | diff | 1 | 0.0000% (0 px), dims OK |
| `jobs-1024.ref.png.b64` | jobs | 1024 | ref | 1 | 0.0000% (0 px), dims OK |
| `jobs-1024.build.png.b64` | jobs | 1024 | build | 1 | 0.0000% (0 px), dims OK |
| `jobs-1024.diff.png.b64` | jobs | 1024 | diff | 1 | 0.0000% (0 px), dims OK |
| `jobs-390.ref.png.b64` | jobs | 390 | ref | 1 | 0.0000% (0 px), dims OK |
| `jobs-390.build.png.b64` | jobs | 390 | build | 1 | 0.0000% (0 px), dims OK |
| `jobs-390.diff.png.b64` | jobs | 390 | diff | 1 | 0.0000% (0 px), dims OK |
