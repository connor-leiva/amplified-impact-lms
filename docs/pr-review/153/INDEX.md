# Review files for https://github.com/connor-leiva/amplified-impact-lms/pull/153 (D-169)

Each file is one PNG as base64 text on one line (`base64 -d < file > file.png`). A file split into `.partN` files is one PNG: join the parts in order, then decode.

- `health`: the R2 mockup ref, the build (fixture build, `?as=admin&parity=r2`, frozen clock, pinned container, `fonts.conf`, an element screenshot of `[data-r2-shell]`) and the pixelmatch diff, at each width. The % is that cell's parity result.
- `build`: `/admin/build`, the Build hub. No mockup frame, so build only (fixture build, the Owner).
- `health-production`: `/admin/health?console-sample=off`, production's composition (spec § 7.1's tiles, Seat pressure, Recent deploys) from the same fixture data. No mockup frame for it, so build only.

| file | screen | width | parts | cell diff |
|---|---|---|---|---|
| `health-1440.ref.png.b64` | health | 1440 | 1 | 0.0000% (0 px), dims OK |
| `health-1440.build.png.b64` | health | 1440 | 1 | 0.0000% (0 px), dims OK |
| `health-1440.diff.png.b64` | health | 1440 | 1 | 0.0000% (0 px), dims OK |
| `health-1280.ref.png.b64` | health | 1280 | 1 | 0.0000% (0 px), dims OK |
| `health-1280.build.png.b64` | health | 1280 | 1 | 0.0000% (0 px), dims OK |
| `health-1280.diff.png.b64` | health | 1280 | 1 | 0.0000% (0 px), dims OK |
| `health-1024.ref.png.b64` | health | 1024 | 1 | 0.0000% (0 px), dims OK |
| `health-1024.build.png.b64` | health | 1024 | 1 | 0.0000% (0 px), dims OK |
| `health-1024.diff.png.b64` | health | 1024 | 1 | 0.0000% (0 px), dims OK |
| `health-390.ref.png.b64` | health | 390 | 1 | 0.0000% (0 px), dims OK |
| `health-390.build.png.b64` | health | 390 | 1 | 0.0000% (0 px), dims OK |
| `health-390.diff.png.b64` | health | 390 | 1 | 0.0000% (0 px), dims OK |
| `build-1280.build.png.b64` | build | 1280 | 1 | no mockup frame (build only) |
| `build-390.build.png.b64` | build | 390 | 2 | no mockup frame (build only) |
| `health-production-1280.build.png.b64` | health-production | 1280 | 1 | no mockup frame (build only) |
| `health-production-390.build.png.b64` | health-production | 390 | 1 | no mockup frame (build only) |
