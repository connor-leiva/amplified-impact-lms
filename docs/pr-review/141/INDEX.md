# PR #141 review files (R2-1c part 2: Users, Search and the ⌘K palette, D-160)

Each file is one PNG as a single line of base64 (`base64 -w 0`). Decode one with `base64 -d <name>.png.b64 > <name>.png`; a file split into parts is joined first: `cat <name>.png.b64.part* | base64 -d > <name>.png`.

- `*.ref.png.b64`: the signed-off mockup render, byte for byte from `design-reference/admin-redesign-r2/ref/`.
- `*.build.png.b64`: the app, captured by `pnpm parity:admin-r2` in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`, Chromium 153.0.8010.12, `harness/fonts.conf`) at `334a13f`, the merge of part 1's new head (`095e53a`). The commits after it change only `DECISIONS.md`, `compliance/lib/admin-r2-exceptions.ts` and these files, no app code. Regenerated there: only `users-1440` and `users-1280` builds changed, by the known 2-pixel top-bar capture noise (one channel value, under the threshold; their diffs are unchanged, 0 px); every other file is byte-identical to the previous set.
- `*.diff.png.b64`: pixelmatch's output for the cell (threshold 0.1, `includeAA: false`). Differing pixels are drawn red; an image that is only a faded copy of the ref means none differ.
- `strict`: the report-only guard (`compliance/lib/admin-r2-strict.ts`): `AA` is pixelmatch at 0.1 with `includeAA: true`, `Δ>60` the pixels where any RGB channel differs by more than 60, with their box.
- `user-390` is an **approved exception** (Connor, Nov 16, 2026, 8:27 AM MST, D-160): every differing pixel is in the key facts' values (x 29–357, y 286–455), which the mockup sets at 15px on a phone and the build keeps at the 16px floor; with the mockup's 15px applied temporarily it measures 0.0000%.
- `palette-*.build.png.b64`: the app's ⌘K palette open (Ctrl+K on `/admin/workspaces`), a viewport shot (W × 900, phone 390 × 844) in the same container, `fonts.conf`, frozen clock and `?as=admin&parity=r2`, captured at `13110b5` (unchanged since). Build only: the mockup has no ref frame of the palette, so there is no ref and no diff.

| file | screen | width | size | parts | cell result | strict (report-only) |
|---|---|---|---|---|---|---|
| `users-1440.ref.png.b64` | Users (`/admin/users`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced | AA 0 px · Δ>60 0 px |
| `users-1440.build.png.b64` | Users (`/admin/users`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced | AA 0 px · Δ>60 0 px |
| `users-1440.diff.png.b64` | Users (`/admin/users`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced | AA 0 px · Δ>60 0 px |
| `users-1280.ref.png.b64` | Users (`/admin/users`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced | AA 0 px · Δ>60 0 px |
| `users-1280.build.png.b64` | Users (`/admin/users`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced | AA 0 px · Δ>60 0 px |
| `users-1280.diff.png.b64` | Users (`/admin/users`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced | AA 0 px · Δ>60 0 px |
| `users-1024.ref.png.b64` | Users (`/admin/users`) | 1024 | 1024 × 730 | 1 | PASS 0.0000% · 0 px · dims OK (1024×730), enforced | AA 0 px · Δ>60 0 px |
| `users-1024.build.png.b64` | Users (`/admin/users`) | 1024 | 1024 × 730 | 1 | PASS 0.0000% · 0 px · dims OK (1024×730), enforced | AA 0 px · Δ>60 0 px |
| `users-1024.diff.png.b64` | Users (`/admin/users`) | 1024 | 1024 × 730 | 1 | PASS 0.0000% · 0 px · dims OK (1024×730), enforced | AA 0 px · Δ>60 0 px |
| `users-390.ref.png.b64` | Users (`/admin/users`) | 390 | 390 × 1897 | 1 | PASS 0.0000% · 0 px · dims OK (390×1897), enforced | AA 0 px · Δ>60 0 px |
| `users-390.build.png.b64` | Users (`/admin/users`) | 390 | 390 × 1897 | 1 | PASS 0.0000% · 0 px · dims OK (390×1897), enforced | AA 0 px · Δ>60 0 px |
| `users-390.diff.png.b64` | Users (`/admin/users`) | 390 | 390 × 1897 | 1 | PASS 0.0000% · 0 px · dims OK (390×1897), enforced | AA 0 px · Δ>60 0 px |
| `user-1440.ref.png.b64` | User (`/admin/users/u_1042`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced | AA 0 px · Δ>60 0 px |
| `user-1440.build.png.b64` | User (`/admin/users/u_1042`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced | AA 0 px · Δ>60 0 px |
| `user-1440.diff.png.b64` | User (`/admin/users/u_1042`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced | AA 0 px · Δ>60 0 px |
| `user-1280.ref.png.b64` | User (`/admin/users/u_1042`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced | AA 0 px · Δ>60 0 px |
| `user-1280.build.png.b64` | User (`/admin/users/u_1042`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced | AA 0 px · Δ>60 0 px |
| `user-1280.diff.png.b64` | User (`/admin/users/u_1042`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced | AA 0 px · Δ>60 0 px |
| `user-1024.ref.png.b64` | User (`/admin/users/u_1042`) | 1024 | 1024 × 818 | 1 | PASS 0.0000% · 0 px · dims OK (1024×818), enforced | AA 0 px · Δ>60 0 px |
| `user-1024.build.png.b64` | User (`/admin/users/u_1042`) | 1024 | 1024 × 818 | 1 | PASS 0.0000% · 0 px · dims OK (1024×818), enforced | AA 0 px · Δ>60 0 px |
| `user-1024.diff.png.b64` | User (`/admin/users/u_1042`) | 1024 | 1024 × 818 | 1 | PASS 0.0000% · 0 px · dims OK (1024×818), enforced | AA 0 px · Δ>60 0 px |
| `user-390.ref.png.b64` | User (`/admin/users/u_1042`) | 390 | 390 × 1273 | 1 | **PASS (approved exception, D-160)** 0.3311% · 1,644 px · dims OK (390×1273), enforced at its ceiling 0.3311% · 1,644 px | AA 2,657 px · Δ>60 2,221 px [x 29–357, y 286–455] |
| `user-390.build.png.b64` | User (`/admin/users/u_1042`) | 390 | 390 × 1273 | 1 | **PASS (approved exception, D-160)** 0.3311% · 1,644 px · dims OK (390×1273), enforced at its ceiling 0.3311% · 1,644 px | AA 2,657 px · Δ>60 2,221 px [x 29–357, y 286–455] |
| `user-390.diff.png.b64` | User (`/admin/users/u_1042`) | 390 | 390 × 1273 | 1 | **PASS (approved exception, D-160)** 0.3311% · 1,644 px · dims OK (390×1273), enforced at its ceiling 0.3311% · 1,644 px | AA 2,657 px · Δ>60 2,221 px [x 29–357, y 286–455] |
| `palette-1280.build.png.b64` | ⌘K palette, open (Ctrl+K on `/admin/workspaces`) | 1280 | 1280 × 900 | 1 | build only: the mockup has the `Palette` component but no ref frame of it open, so there is no ref and no diff | — |
| `palette-390.build.png.b64` | ⌘K palette, open (Ctrl+K on `/admin/workspaces`) | 390 | 390 × 844 | 1 | build only: the mockup has the `Palette` component but no ref frame of it open, so there is no ref and no diff | — |
