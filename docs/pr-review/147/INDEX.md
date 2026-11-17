# Review files for https://github.com/connor-leiva/amplified-impact-lms/pull/147 (D-166)

Each file is one line of base64 (`base64 -w 0`); decode with `base64 -d file.b64 > file.png` (join `.partN` files in order first). Ref is the signed-off mockup's render (`design-reference/admin-redesign-r2/ref/`), build is this branch's capture in the pinned container (`pnpm parity:admin-r2`), diff is pixelmatch's (threshold 0.1, `includeAA: false`).

Captured in the pinned container (`pnpm parity:admin-r2`, `fonts.conf`) at `4822fc04084352dbe6c4e49c48fd030cb9426054`, 7b with #149 (`6e941cd`) and 7a merged; every commit after it only adds review files. Cell diff is the enforced rule (pixelmatch 0.1, `includeAA: false`, ≤0.1% with identical dimensions); strict is the report-only guard (`includeAA: true` pixels, and pixels with an RGB channel delta over 60 with their bounding box).

**Eye check:** `email` and `usage` are pixel-identical to the refs at all four widths (0 px in both the enforced and the strict pass), so nothing is drawn that the mockup does not draw. The two tabs have no mockup frame; they are the mockup's own parts (its `g4` of `Stat`s, its `Table` with Subject, Template, Status, Sent; Template drops at laptop width as the mockup's `hide: 'lap'`), with no added chrome.

| File | Screen | Width | Kind | Parts | Cell diff | Strict |
|---|---|---|---|---|---|---|
| `email-1440.ref.png.b64` | email | 1440 | ref | 1 | 0.0000% · 0 px · 1440×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `email-1440.build.png.b64` | email | 1440 | build | 1 | 0.0000% · 0 px · 1440×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `email-1440.diff.png.b64` | email | 1440 | diff | 1 | 0.0000% · 0 px · 1440×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `email-1280.ref.png.b64` | email | 1280 | ref | 1 | 0.0000% · 0 px · 1280×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `email-1280.build.png.b64` | email | 1280 | build | 1 | 0.0000% · 0 px · 1280×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `email-1280.diff.png.b64` | email | 1280 | diff | 1 | 0.0000% · 0 px · 1280×897 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `email-1024.ref.png.b64` | email | 1024 | ref | 1 | 0.0000% · 0 px · 1024×678 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `email-1024.build.png.b64` | email | 1024 | build | 1 | 0.0000% · 0 px · 1024×678 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `email-1024.diff.png.b64` | email | 1024 | diff | 1 | 0.0000% · 0 px · 1024×678 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `email-390.ref.png.b64` | email | 390 | ref | 1 | 0.0000% · 0 px · 390×1679 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `email-390.build.png.b64` | email | 390 | build | 1 | 0.0000% · 0 px · 390×1679 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `email-390.diff.png.b64` | email | 390 | diff | 1 | 0.0000% · 0 px · 390×1679 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-1440.ref.png.b64` | usage | 1440 | ref | 1 | 0.0000% · 0 px · 1440×1199 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-1440.build.png.b64` | usage | 1440 | build | 1 | 0.0000% · 0 px · 1440×1199 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-1440.diff.png.b64` | usage | 1440 | diff | 1 | 0.0000% · 0 px · 1440×1199 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-1280.ref.png.b64` | usage | 1280 | ref | 1 | 0.0000% · 0 px · 1280×1199 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-1280.build.png.b64` | usage | 1280 | build | 1 | 0.0000% · 0 px · 1280×1199 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-1280.diff.png.b64` | usage | 1280 | diff | 1 | 0.0000% · 0 px · 1280×1199 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-1024.ref.png.b64` | usage | 1024 | ref | 1 | 0.0000% · 0 px · 1024×1199 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-1024.build.png.b64` | usage | 1024 | build | 1 | 0.0000% · 0 px · 1024×1199 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-1024.diff.png.b64` | usage | 1024 | diff | 1 | 0.0000% · 0 px · 1024×1199 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-390.ref.png.b64` | usage | 390 | ref | 1 | 0.0000% · 0 px · 390×2030 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-390.build.png.b64` | usage | 390 | build | 1 | 0.0000% · 0 px · 390×2030 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `usage-390.diff.png.b64` | usage | 390 | diff | 1 | 0.0000% · 0 px · 390×2030 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `workspace-usage-tab-1280.build.png.b64` | workspace-usage-tab (build only, no mockup frame) | 1280 | build | 1 | n/a | n/a |
| `workspace-usage-tab-390.build.png.b64` | workspace-usage-tab (build only, no mockup frame) | 390 | build | 1 | n/a | n/a |
| `user-emails-tab-1280.build.png.b64` | user-emails-tab (build only, no mockup frame) | 1280 | build | 1 | n/a | n/a |
| `user-emails-tab-390.build.png.b64` | user-emails-tab (build only, no mockup frame) | 390 | build | 1 | n/a | n/a |
