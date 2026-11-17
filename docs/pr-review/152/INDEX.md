# Review files for https://github.com/connor-leiva/amplified-impact-lms/pull/152 (D-167)

Each file is one line of base64 (`base64 -w 0`); decode with `base64 -d file.b64 > file.png` (join `.partN` files in order first). Ref is the signed-off mockup's render (`design-reference/admin-redesign-r2/ref/`), build is this branch's capture in the pinned container (`pnpm parity:admin-r2`, `fonts.conf`), diff is pixelmatch's (threshold 0.1, `includeAA: false`; red = a differing pixel).

Captured at `9d4210cce70c6496c547d56a970fd02758a9c373`, PR 8 with 7b (#147) and main merged; every commit after it only adds these files and D-167's figures. Cell diff is the enforced rule (≤0.1% with identical dimensions); strict is the report-only guard (`includeAA: true` pixels, and pixels with an RGB channel delta over 60 with their bounding box).

**Eye check:** `incidents` at all four widths and `incident` at 1440, 1280 and 1024 are pixel-identical to the refs, 0 px in the enforced and the strict pass, so nothing is drawn that the mockup does not draw (the "Add note" link an earlier build drew in the Timeline card head is gone). `incident-390` differs only in the key-facts values (strict box x 30–303, y 316–475): 15px in the mockup on a phone, 16px here; with 15px applied in the container it measures 0 px (then reverted). Not enforced; not an approved exception.

| File | Screen | Width | Kind | Parts | Cell diff | Strict |
|---|---|---|---|---|---|---|
| `incidents-1440.ref.png.b64` | incidents | 1440 | ref | 1 | 0.0000% · 0 px · 1440×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incidents-1440.build.png.b64` | incidents | 1440 | build | 1 | 0.0000% · 0 px · 1440×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incidents-1440.diff.png.b64` | incidents | 1440 | diff | 1 | 0.0000% · 0 px · 1440×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incidents-1280.ref.png.b64` | incidents | 1280 | ref | 1 | 0.0000% · 0 px · 1280×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incidents-1280.build.png.b64` | incidents | 1280 | build | 1 | 0.0000% · 0 px · 1280×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incidents-1280.diff.png.b64` | incidents | 1280 | diff | 1 | 0.0000% · 0 px · 1280×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incidents-1024.ref.png.b64` | incidents | 1024 | ref | 1 | 0.0000% · 0 px · 1024×470 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incidents-1024.build.png.b64` | incidents | 1024 | build | 1 | 0.0000% · 0 px · 1024×470 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incidents-1024.diff.png.b64` | incidents | 1024 | diff | 1 | 0.0000% · 0 px · 1024×470 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incidents-390.ref.png.b64` | incidents | 390 | ref | 1 | 0.0000% · 0 px · 390×885 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incidents-390.build.png.b64` | incidents | 390 | build | 1 | 0.0000% · 0 px · 390×885 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incidents-390.diff.png.b64` | incidents | 390 | diff | 1 | 0.0000% · 0 px · 390×885 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incident-1440.ref.png.b64` | incident | 1440 | ref | 1 | 0.0000% · 0 px · 1440×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incident-1440.build.png.b64` | incident | 1440 | build | 1 | 0.0000% · 0 px · 1440×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incident-1440.diff.png.b64` | incident | 1440 | diff | 1 | 0.0000% · 0 px · 1440×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incident-1280.ref.png.b64` | incident | 1280 | ref | 1 | 0.0000% · 0 px · 1280×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incident-1280.build.png.b64` | incident | 1280 | build | 1 | 0.0000% · 0 px · 1280×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incident-1280.diff.png.b64` | incident | 1280 | diff | 1 | 0.0000% · 0 px · 1280×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incident-1024.ref.png.b64` | incident | 1024 | ref | 1 | 0.0000% · 0 px · 1024×548 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incident-1024.build.png.b64` | incident | 1024 | build | 1 | 0.0000% · 0 px · 1024×548 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incident-1024.diff.png.b64` | incident | 1024 | diff | 1 | 0.0000% · 0 px · 1024×548 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `incident-390.ref.png.b64` | incident | 390 | ref | 1 | 0.3235% · 1,369 px · 390×1085 · dims OK · not enforced | AA 2254 px (0.5327%) · Δ>60 1875 px [x 30–303, y 316–475] |
| `incident-390.build.png.b64` | incident | 390 | build | 1 | 0.3235% · 1,369 px · 390×1085 · dims OK · not enforced | AA 2254 px (0.5327%) · Δ>60 1875 px [x 30–303, y 316–475] |
| `incident-390.diff.png.b64` | incident | 390 | diff | 1 | 0.3235% · 1,369 px · 390×1085 · dims OK · not enforced | AA 2254 px (0.5327%) · Δ>60 1875 px [x 30–303, y 316–475] |
