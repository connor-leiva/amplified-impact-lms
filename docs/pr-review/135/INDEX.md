# PR #135 review files (Admin redesign R2-1b, D-160)

Each file is one PNG as a single line of base64 (`base64 -w 0`). Decode one with `base64 -d <name>.png.b64 > <name>.png`. None is split into parts.

- `*.ref.png.b64`: the signed-off mockup render, byte for byte from `design-reference/admin-redesign-r2/ref/`.
- `*.build.png.b64`: the app, captured by `pnpm parity:admin-r2` in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`, Chromium 153.0.8010.12, `harness/fonts.conf`) at `c08a965`. The commit that adds these files changes no app code.
- `*.diff.png.b64`: pixelmatch's output for the cell (threshold 0.1, `includeAA: false`). Differing pixels are drawn red; an image that is only a faded copy of the ref means none differ.
- The shell shots are the same build, opened with the parity fixture (`?as=admin&parity=r2`, clock frozen at Thu Dec 10, 2026, 9:30 AM MST) in the same container. The mockup has no ref for these states, so they have no cell.

Cells: 8 enforced (`missing` and `denied` × 1440 / 1280 / 1024 / 390), all PASS at 0.0000%, 0 px, dimensions identical. The other 116 cells of `parity:admin-r2` are "not built".

| file | screen | width | size | parts | cell result |
|---|---|---|---|---|---|
| `missing-1440.ref.png.b64` | Console 404 (`/admin/no-such-page`) | 1440 | 1440 × 609 | 1 | 0.0000% · 0 px · dims OK (1440×609) |
| `missing-1440.build.png.b64` | Console 404 (`/admin/no-such-page`) | 1440 | 1440 × 609 | 1 | 0.0000% · 0 px · dims OK (1440×609) |
| `missing-1440.diff.png.b64` | Console 404 (`/admin/no-such-page`) | 1440 | 1440 × 609 | 1 | 0.0000% · 0 px · dims OK (1440×609) |
| `missing-1280.ref.png.b64` | Console 404 (`/admin/no-such-page`) | 1280 | 1280 × 609 | 1 | 0.0000% · 0 px · dims OK (1280×609) |
| `missing-1280.build.png.b64` | Console 404 (`/admin/no-such-page`) | 1280 | 1280 × 609 | 1 | 0.0000% · 0 px · dims OK (1280×609) |
| `missing-1280.diff.png.b64` | Console 404 (`/admin/no-such-page`) | 1280 | 1280 × 609 | 1 | 0.0000% · 0 px · dims OK (1280×609) |
| `missing-1024.ref.png.b64` | Console 404 (`/admin/no-such-page`) | 1024 | 1024 × 439 | 1 | 0.0000% · 0 px · dims OK (1024×439) |
| `missing-1024.build.png.b64` | Console 404 (`/admin/no-such-page`) | 1024 | 1024 × 439 | 1 | 0.0000% · 0 px · dims OK (1024×439) |
| `missing-1024.diff.png.b64` | Console 404 (`/admin/no-such-page`) | 1024 | 1024 × 439 | 1 | 0.0000% · 0 px · dims OK (1024×439) |
| `missing-390.ref.png.b64` | Console 404 (`/admin/no-such-page`) | 390 | 390 × 404 | 1 | 0.0000% · 0 px · dims OK (390×404) |
| `missing-390.build.png.b64` | Console 404 (`/admin/no-such-page`) | 390 | 390 × 404 | 1 | 0.0000% · 0 px · dims OK (390×404) |
| `missing-390.diff.png.b64` | Console 404 (`/admin/no-such-page`) | 390 | 390 × 404 | 1 | 0.0000% · 0 px · dims OK (390×404) |
| `denied-1440.ref.png.b64` | Denied (`/admin/denied`, fixture only) | 1440 | 1440 × 609 | 1 | 0.0000% · 0 px · dims OK (1440×609) |
| `denied-1440.build.png.b64` | Denied (`/admin/denied`, fixture only) | 1440 | 1440 × 609 | 1 | 0.0000% · 0 px · dims OK (1440×609) |
| `denied-1440.diff.png.b64` | Denied (`/admin/denied`, fixture only) | 1440 | 1440 × 609 | 1 | 0.0000% · 0 px · dims OK (1440×609) |
| `denied-1280.ref.png.b64` | Denied (`/admin/denied`, fixture only) | 1280 | 1280 × 609 | 1 | 0.0000% · 0 px · dims OK (1280×609) |
| `denied-1280.build.png.b64` | Denied (`/admin/denied`, fixture only) | 1280 | 1280 × 609 | 1 | 0.0000% · 0 px · dims OK (1280×609) |
| `denied-1280.diff.png.b64` | Denied (`/admin/denied`, fixture only) | 1280 | 1280 × 609 | 1 | 0.0000% · 0 px · dims OK (1280×609) |
| `denied-1024.ref.png.b64` | Denied (`/admin/denied`, fixture only) | 1024 | 1024 × 439 | 1 | 0.0000% · 0 px · dims OK (1024×439) |
| `denied-1024.build.png.b64` | Denied (`/admin/denied`, fixture only) | 1024 | 1024 × 439 | 1 | 0.0000% · 0 px · dims OK (1024×439) |
| `denied-1024.diff.png.b64` | Denied (`/admin/denied`, fixture only) | 1024 | 1024 × 439 | 1 | 0.0000% · 0 px · dims OK (1024×439) |
| `denied-390.ref.png.b64` | Denied (`/admin/denied`, fixture only) | 390 | 390 × 404 | 1 | 0.0000% · 0 px · dims OK (390×404) |
| `denied-390.build.png.b64` | Denied (`/admin/denied`, fixture only) | 390 | 390 × 404 | 1 | 0.0000% · 0 px · dims OK (390×404) |
| `denied-390.diff.png.b64` | Denied (`/admin/denied`, fixture only) | 390 | 390 × 404 | 1 | 0.0000% · 0 px · dims OK (390×404) |
| `sidebar-collapsed-1280.build.png.b64` | Shell, sidebar at its defaults: Health and Build open, Operations closed with "1 incident" (viewport) | 1280 | 1280 × 900 | 1 | no ref: the mockup has no frame for this state |
| `sidebar-expanded-1280.build.png.b64` | Shell, sidebar with every group opened (whole frame) | 1280 | 1280 × 1153 | 1 | no ref: the mockup has no frame for this state |
| `sidebar-rail-flyout-1024.build.png.b64` | Shell, the 64px rail with the Operations flyout open (viewport) | 1024 | 1024 × 900 | 1 | no ref: the mockup has no frame for this state |
| `sidebar-phone-drawer-390.build.png.b64` | Shell, the phone drawer open (viewport) | 390 | 390 × 844 | 1 | no ref: the mockup has no frame for this state |
| `shell-legacy-overview-1280.build.png.b64` | An old screen (Overview) in the R2 frame with the transitional geometry: 248px sidebar, 56px top bar (viewport) | 1280 | 1280 × 900 | 1 | no ref: the mockup has no frame for this state |
