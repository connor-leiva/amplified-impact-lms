# Review files for PR #143

Base64 text, one line per file (`base64 -w 0`). Decode with `base64 -d <file> > out.png`; a split file is joined first: `cat <file>.part1 <file>.part2 | base64 -d > out.png`.
`ref` is the signed-off mockup (`design-reference/admin-redesign-r2/ref/`), `build` the app as `pnpm parity:admin-r2` captured it in the pinned container, `diff` pixelmatch's output (threshold 0.1, `includeAA: false`; red = differing pixel).

| file(s) | screen | width | kind | parts | cell diff |
|---|---|---|---|---|---|
| `masquerade-1440.ref.png.b64` | masquerade | 1440 | ref | 1 | 0.0000% · 0 px · dims OK |
| `masquerade-1440.build.png.b64` | masquerade | 1440 | build | 1 | 0.0000% · 0 px · dims OK |
| `masquerade-1440.diff.png.b64` | masquerade | 1440 | diff | 1 | 0.0000% · 0 px · dims OK |
| `masquerade-1280.ref.png.b64` | masquerade | 1280 | ref | 1 | 0.0000% · 0 px · dims OK |
| `masquerade-1280.build.png.b64` | masquerade | 1280 | build | 1 | 0.0000% · 0 px · dims OK |
| `masquerade-1280.diff.png.b64` | masquerade | 1280 | diff | 1 | 0.0000% · 0 px · dims OK |
| `masquerade-1024.ref.png.b64` | masquerade | 1024 | ref | 1 | 0.0000% · 0 px · dims OK |
| `masquerade-1024.build.png.b64` | masquerade | 1024 | build | 1 | 0.0000% · 0 px · dims OK |
| `masquerade-1024.diff.png.b64` | masquerade | 1024 | diff | 1 | 0.0000% · 0 px · dims OK |
| `masquerade-390.ref.png.b64` | masquerade | 390 | ref | 1 | 0.0000% · 0 px · dims OK |
| `masquerade-390.build.png.b64` | masquerade | 390 | build | 1 | 0.0000% · 0 px · dims OK |
| `masquerade-390.diff.png.b64` | masquerade | 390 | diff | 1 | 0.0000% · 0 px · dims OK |
| `as-1440.ref.png.b64` | as | 1440 | ref | 1 | 0.0000% · 0 px · dims OK |
| `as-1440.build.png.b64` | as | 1440 | build | 1 | 0.0000% · 0 px · dims OK |
| `as-1440.diff.png.b64` | as | 1440 | diff | 1 | 0.0000% · 0 px · dims OK |
| `as-1280.ref.png.b64` | as | 1280 | ref | 1 | 0.0000% · 0 px · dims OK |
| `as-1280.build.png.b64` | as | 1280 | build | 1 | 0.0000% · 0 px · dims OK |
| `as-1280.diff.png.b64` | as | 1280 | diff | 1 | 0.0000% · 0 px · dims OK |
| `as-1024.ref.png.b64` | as | 1024 | ref | 1 | 0.0000% · 0 px · dims OK |
| `as-1024.build.png.b64` | as | 1024 | build | 1 | 0.0000% · 0 px · dims OK |
| `as-1024.diff.png.b64` | as | 1024 | diff | 1 | 0.0000% · 0 px · dims OK |
| `as-390.ref.png.b64` | as | 390 | ref | 1 | 0.0000% · 0 px · dims OK |
| `as-390.build.png.b64` | as | 390 | build | 1 | 0.0000% · 0 px · dims OK |
| `as-390.diff.png.b64` | as | 390 | diff | 1 | 0.0000% · 0 px · dims OK |

## Build-only shots (no mockup frame, so no ref and no diff)

The fixture build (`pnpm --filter @ai/web preview:fixture`, captured by the host's Playwright Chromium) with a session the fixture simulates, at W×900 (W×844 on a phone), the clock frozen at Thu, Dec 10, 2026, 9:30 AM MST.

| file(s) | what | width | kind | parts | cell diff |
|---|---|---|---|---|---|
| `banner-learner-1280.build.png.b64` | the banner on a learner page (the Dashboard, `?masquerade=demo`), viewport | 1280 | build | 1 | no mockup frame (not a parity cell) |
| `banner-learner-390.build.png.b64` | the banner on a learner page (the Dashboard, `?masquerade=demo`), viewport | 390 | build | 1 | no mockup frame (not a parity cell) |
| `paused-1280.build.png.b64` | the paused Console (`/admin/workspaces/ws_northshore` during a session), full page | 1280 | build | 1 | no mockup frame (not a parity cell) |
| `paused-390.build.png.b64` | the paused Console (`/admin/workspaces/ws_northshore` during a session), full page | 390 | build | 1 | no mockup frame (not a parity cell) |
| `reason-dialog-1280.build.png.b64` | the reason dialog (Start, from `/admin/masquerade`, a valid reason typed), viewport | 1280 | build | 1 | no mockup frame (not a parity cell) |
| `reason-dialog-390.build.png.b64` | the reason dialog (Start, from `/admin/masquerade`, a valid reason typed), viewport | 390 | build | 1 | no mockup frame (not a parity cell) |
| `blocked-dialog-1280.build.png.b64` | the blocked dialog (a refused write on the Vault, `?masquerade=demo`), viewport | 1280 | build | 1 | no mockup frame (not a parity cell) |
| `blocked-dialog-390.build.png.b64` | the blocked dialog (a refused write on the Vault, `?masquerade=demo`), viewport | 390 | build | 1 | no mockup frame (not a parity cell) |
