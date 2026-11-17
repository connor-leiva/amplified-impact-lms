# PR #149 review files (D-165)

Base64 text, one line each (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file's parts concatenate in order first (`cat x.part1 x.part2 | base64 -d`). Ref: `design-reference/admin-redesign-r2/ref/`; build and diff: `pnpm parity:admin-r2` in the pinned container at this branch's final code head (ba570b9). Strict counts: pixelmatch with `includeAA:true` (AA) and pixels with an RGB channel delta over 60 (Δ>60), with their box.

| File | Screen | Width | Kind | Parts | Cell diff (pass rule) and strict counts (report-only) |
|---|---|---|---|---|---|
| `api-1440.ref.png.b64` | api | 1440 | ref | 1 | 0.0122% (158 px), dims OK; strict: AA 384 px (0.0297%), Δ>60 0 px |
| `api-1440.build.png.b64` | api | 1440 | build | 1 | 0.0122% (158 px), dims OK; strict: AA 384 px (0.0297%), Δ>60 0 px |
| `api-1440.diff.png.b64` | api | 1440 | diff | 1 | 0.0122% (158 px), dims OK; strict: AA 384 px (0.0297%), Δ>60 0 px |
| `api-1280.ref.png.b64` | api | 1280 | ref | 1 | 0.0138% (158 px), dims OK; strict: AA 384 px (0.0334%), Δ>60 0 px |
| `api-1280.build.png.b64` | api | 1280 | build | 1 | 0.0138% (158 px), dims OK; strict: AA 384 px (0.0334%), Δ>60 0 px |
| `api-1280.diff.png.b64` | api | 1280 | diff | 1 | 0.0138% (158 px), dims OK; strict: AA 384 px (0.0334%), Δ>60 0 px |
| `api-1024.ref.png.b64` | api | 1024 | ref | 1 | 0.0178% (158 px), dims OK; strict: AA 384 px (0.0434%), Δ>60 0 px |
| `api-1024.build.png.b64` | api | 1024 | build | 1 | 0.0178% (158 px), dims OK; strict: AA 384 px (0.0434%), Δ>60 0 px |
| `api-1024.diff.png.b64` | api | 1024 | diff | 1 | 0.0178% (158 px), dims OK; strict: AA 384 px (0.0434%), Δ>60 0 px |
| `api-390.ref.png.b64` | api | 390 | ref | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |
| `api-390.build.png.b64` | api | 390 | build | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |
| `api-390.diff.png.b64` | api | 390 | diff | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |
| `jobs-1440.ref.png.b64` | jobs | 1440 | ref | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |
| `jobs-1440.build.png.b64` | jobs | 1440 | build | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |
| `jobs-1440.diff.png.b64` | jobs | 1440 | diff | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |
| `jobs-1280.ref.png.b64` | jobs | 1280 | ref | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |
| `jobs-1280.build.png.b64` | jobs | 1280 | build | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |
| `jobs-1280.diff.png.b64` | jobs | 1280 | diff | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |
| `jobs-1024.ref.png.b64` | jobs | 1024 | ref | 1 | 0.0000% (0 px), dims OK; strict: AA 1 px (0.0001%), Δ>60 0 px |
| `jobs-1024.build.png.b64` | jobs | 1024 | build | 1 | 0.0000% (0 px), dims OK; strict: AA 1 px (0.0001%), Δ>60 0 px |
| `jobs-1024.diff.png.b64` | jobs | 1024 | diff | 1 | 0.0000% (0 px), dims OK; strict: AA 1 px (0.0001%), Δ>60 0 px |
| `jobs-390.ref.png.b64` | jobs | 390 | ref | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |
| `jobs-390.build.png.b64` | jobs | 390 | build | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |
| `jobs-390.diff.png.b64` | jobs | 390 | diff | 1 | 0.0000% (0 px), dims OK; strict: AA 0 px (0.0000%), Δ>60 0 px |

**Eye check** (Shepherd, Nov 16, 1:25 PM): build and ref side by side at all eight cells. Neither screen draws chrome the mockup doesn't: no page-level "…", button, label or badge. The app-only items live in surfaces the mockup draws (the rows' "…" menus: "View in Stripe"; the production billing row's spec line under its name, which the mockup's fixture data doesn't carry). Δ>60 is 0 px in every cell. The AA count's 384 px on `api` at the desktop widths is the same anti-aliasing the pass rule already sees (158 px): the edge of the Error rate column's "%" glyphs, x 1271–1280 at 1440, every row.
