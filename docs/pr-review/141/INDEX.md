# PR #141 review files (R2-1c part 2: Users, Search and the ⌘K palette, D-160)

Each file is one PNG as a single line of base64 (`base64 -w 0`). Decode one with `base64 -d <name>.png.b64 > <name>.png`; a file split into parts is joined first: `cat <name>.png.b64.part* | base64 -d > <name>.png`.

- `*.ref.png.b64`: the signed-off mockup render, byte for byte from `design-reference/admin-redesign-r2/ref/`.
- `*.build.png.b64`: the app, captured by `pnpm parity:admin-r2` in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`, Chromium 153.0.8010.12, `harness/fonts.conf`) at `13110b5fd30d05f88c6312bac62d7aee71b0aa8e`. The commit that adds these files changes no app code.
- `*.diff.png.b64`: pixelmatch's output for the cell (threshold 0.1, `includeAA: false`). Differing pixels are drawn red; an image that is only a faded copy of the ref means none differ.
- `palette-*.build.png.b64`: the app's ⌘K palette open (Ctrl+K on `/admin/workspaces`), a viewport shot (W × 900, phone 390 × 844) in the same container, `fonts.conf`, frozen clock and `?as=admin&parity=r2`. Build only: the mockup has no ref frame of the palette, so there is no ref and no diff.

| file | screen | width | size | parts | cell result |
|---|---|---|---|---|---|
| `users-1440.ref.png.b64` | Users (`/admin/users`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced |
| `users-1440.build.png.b64` | Users (`/admin/users`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced |
| `users-1440.diff.png.b64` | Users (`/admin/users`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced |
| `users-1280.ref.png.b64` | Users (`/admin/users`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced |
| `users-1280.build.png.b64` | Users (`/admin/users`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced |
| `users-1280.diff.png.b64` | Users (`/admin/users`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced |
| `users-1024.ref.png.b64` | Users (`/admin/users`) | 1024 | 1024 × 730 | 1 | PASS 0.0000% · 0 px · dims OK (1024×730), enforced |
| `users-1024.build.png.b64` | Users (`/admin/users`) | 1024 | 1024 × 730 | 1 | PASS 0.0000% · 0 px · dims OK (1024×730), enforced |
| `users-1024.diff.png.b64` | Users (`/admin/users`) | 1024 | 1024 × 730 | 1 | PASS 0.0000% · 0 px · dims OK (1024×730), enforced |
| `users-390.ref.png.b64` | Users (`/admin/users`) | 390 | 390 × 1897 | 1 | PASS 0.0000% · 0 px · dims OK (390×1897), enforced |
| `users-390.build.png.b64` | Users (`/admin/users`) | 390 | 390 × 1897 | 1 | PASS 0.0000% · 0 px · dims OK (390×1897), enforced |
| `users-390.diff.png.b64` | Users (`/admin/users`) | 390 | 390 × 1897 | 1 | PASS 0.0000% · 0 px · dims OK (390×1897), enforced |
| `user-1440.ref.png.b64` | User (`/admin/users/u_1042`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced |
| `user-1440.build.png.b64` | User (`/admin/users/u_1042`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced |
| `user-1440.diff.png.b64` | User (`/admin/users/u_1042`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced |
| `user-1280.ref.png.b64` | User (`/admin/users/u_1042`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced |
| `user-1280.build.png.b64` | User (`/admin/users/u_1042`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced |
| `user-1280.diff.png.b64` | User (`/admin/users/u_1042`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced |
| `user-1024.ref.png.b64` | User (`/admin/users/u_1042`) | 1024 | 1024 × 818 | 1 | PASS 0.0000% · 0 px · dims OK (1024×818), enforced |
| `user-1024.build.png.b64` | User (`/admin/users/u_1042`) | 1024 | 1024 × 818 | 1 | PASS 0.0000% · 0 px · dims OK (1024×818), enforced |
| `user-1024.diff.png.b64` | User (`/admin/users/u_1042`) | 1024 | 1024 × 818 | 1 | PASS 0.0000% · 0 px · dims OK (1024×818), enforced |
| `user-390.ref.png.b64` | User (`/admin/users/u_1042`) | 390 | 390 × 1273 | 1 | FAIL 0.3311% · 1644 px · dims OK (390×1273), not enforced |
| `user-390.build.png.b64` | User (`/admin/users/u_1042`) | 390 | 390 × 1273 | 1 | FAIL 0.3311% · 1644 px · dims OK (390×1273), not enforced |
| `user-390.diff.png.b64` | User (`/admin/users/u_1042`) | 390 | 390 × 1273 | 1 | FAIL 0.3311% · 1644 px · dims OK (390×1273), not enforced |
| `palette-1280.build.png.b64` | ⌘K palette, open (Ctrl+K on `/admin/workspaces`) | 1280 | 1280 × 900 | 1 | build only: the mockup has the `Palette` component but no ref frame of it open, so there is no ref and no diff |
| `palette-390.build.png.b64` | ⌘K palette, open (Ctrl+K on `/admin/workspaces`) | 390 | 390 × 844 | 1 | build only: the mockup has the `Palette` component but no ref frame of it open, so there is no ref and no diff |
