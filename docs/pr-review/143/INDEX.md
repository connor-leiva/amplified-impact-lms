# Review files for PR #143 (Masquerade 3b, D-162)

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`. Every file is under 700 KB.

## The R2 parity cells: `masquerade` and `as`

`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container (Chromium 153.0.8010.12, `fonts.conf`) at the merge of #142's final head and main, and `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel). The strict columns are the harness's report-only guard: `AA` is the same comparison with `includeAA: true`, and `Δ>60` counts pixels where any RGB channel differs by more than 60, with their bounding box.

| file(s) | screen | width | kind | parts | cell diff | strict |
|---|---|---|---|---|---|---|
| `masquerade-1440.ref.png.b64` | masquerade | 1440 | ref | 1 | 0.0000% · 0 px · 1440 × 763 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `masquerade-1440.build.png.b64` | masquerade | 1440 | build | 1 | 0.0000% · 0 px · 1440 × 763 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `masquerade-1440.diff.png.b64` | masquerade | 1440 | diff | 1 | 0.0000% · 0 px · 1440 × 763 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `masquerade-1280.ref.png.b64` | masquerade | 1280 | ref | 1 | 0.0000% · 0 px · 1280 × 763 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `masquerade-1280.build.png.b64` | masquerade | 1280 | build | 1 | 0.0000% · 0 px · 1280 × 763 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `masquerade-1280.diff.png.b64` | masquerade | 1280 | diff | 1 | 0.0000% · 0 px · 1280 × 763 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `masquerade-1024.ref.png.b64` | masquerade | 1024 | ref | 1 | 0.0000% · 0 px · 1024 × 783 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `masquerade-1024.build.png.b64` | masquerade | 1024 | build | 1 | 0.0000% · 0 px · 1024 × 783 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `masquerade-1024.diff.png.b64` | masquerade | 1024 | diff | 1 | 0.0000% · 0 px · 1024 × 783 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `masquerade-390.ref.png.b64` | masquerade | 390 | ref | 1 | 0.0000% · 0 px · 390 × 1842 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `masquerade-390.build.png.b64` | masquerade | 390 | build | 1 | 0.0000% · 0 px · 390 × 1842 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `masquerade-390.diff.png.b64` | masquerade | 390 | diff | 1 | 0.0000% · 0 px · 390 × 1842 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-1440.ref.png.b64` | as | 1440 | ref | 1 | 0.0000% · 0 px · 1440 × 737 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-1440.build.png.b64` | as | 1440 | build | 1 | 0.0000% · 0 px · 1440 × 737 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-1440.diff.png.b64` | as | 1440 | diff | 1 | 0.0000% · 0 px · 1440 × 737 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-1280.ref.png.b64` | as | 1280 | ref | 1 | 0.0000% · 0 px · 1280 × 737 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-1280.build.png.b64` | as | 1280 | build | 1 | 0.0000% · 0 px · 1280 × 737 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-1280.diff.png.b64` | as | 1280 | diff | 1 | 0.0000% · 0 px · 1280 × 737 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-1024.ref.png.b64` | as | 1024 | ref | 1 | 0.0000% · 0 px · 1024 × 439 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-1024.build.png.b64` | as | 1024 | build | 1 | 0.0000% · 0 px · 1024 × 439 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-1024.diff.png.b64` | as | 1024 | diff | 1 | 0.0000% · 0 px · 1024 × 439 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-390.ref.png.b64` | as | 390 | ref | 1 | 0.0000% · 0 px · 390 × 408 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-390.build.png.b64` | as | 390 | build | 1 | 0.0000% · 0 px · 390 × 408 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |
| `as-390.diff.png.b64` | as | 390 | diff | 1 | 0.0000% · 0 px · 390 × 408 · dims OK | AA 0 px (0.0000%) · Δ>60 0 px |

## Build-only shots (no mockup frame, so no ref, no diff and no pixel gate)

The fixture build (`pnpm --filter @ai/web preview:fixture`, captured by the host's Playwright Chromium) with a session the fixture simulates, at W×900 (W×844 on a phone), the clock frozen at Thu, Dec 10, 2026, 9:30 AM MST. For the eye check: each draws only the mockup's parts (the `.mq` banner, `ReasonModal`, the blocked modal, and the paused page's R2 head, card and rules), with no other chrome.

| file(s) | what | width | kind | parts |
|---|---|---|---|---|
| `banner-learner-1280.build.png.b64` | the banner on a learner page (the Dashboard, `?masquerade=demo`), viewport | 1280 | build | 1 |
| `banner-learner-390.build.png.b64` | the banner on a learner page (the Dashboard, `?masquerade=demo`), viewport | 390 | build | 1 |
| `paused-1280.build.png.b64` | the paused Console (`/admin/workspaces/ws_northshore` during a session), full page | 1280 | build | 1 |
| `paused-390.build.png.b64` | the paused Console (`/admin/workspaces/ws_northshore` during a session), full page | 390 | build | 1 |
| `reason-dialog-1280.build.png.b64` | the reason dialog (Start, from `/admin/masquerade`, a valid reason typed), viewport | 1280 | build | 1 |
| `reason-dialog-390.build.png.b64` | the reason dialog (Start, from `/admin/masquerade`, a valid reason typed), viewport | 390 | build | 1 |
| `blocked-dialog-1280.build.png.b64` | the blocked dialog (a refused write on the Vault, `?masquerade=demo`), viewport | 1280 | build | 1 |
| `blocked-dialog-390.build.png.b64` | the blocked dialog (a refused write on the Vault, `?masquerade=demo`), viewport | 390 | build | 1 |
