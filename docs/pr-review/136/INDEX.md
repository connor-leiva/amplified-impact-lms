# PR #136 review files (Admin redesign R2-1c part 1, D-160)

Each file is one PNG as a single line of base64 (`base64 -w 0`). Decode one with `base64 -d <name>.png.b64 > <name>.png`; a file split into parts is joined first: `cat <name>.png.b64.part* | base64 -d > <name>.png`.

- `*.ref.png.b64`: the signed-off mockup render, byte for byte from `design-reference/admin-redesign-r2/ref/`.
- `*.build.png.b64`: the app, captured by `pnpm parity:admin-r2` in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`, Chromium 153.0.8010.12, `harness/fonts.conf`) at `9e9fa6b640f473f2aed14a91769ee7622d91bbb0`, the merge that restacks this PR on the updated #126 (R2-3b underneath). The commits after it change only `DECISIONS.md` and these files, no app code.
- `*.diff.png.b64`: pixelmatch's output for the cell (threshold 0.1, `includeAA: false`). Differing pixels are drawn red; an image that is only a faded copy of the ref means none differ.

Cells in this part: `workspaces` × 1440 / 1280 / 1024 / 390 and `workspace-detail` × 1440 / 1280 / 1024 are enforced and PASS at 0.0000%, 0 px, dimensions identical. `workspace-detail-390` is built and reported, not enforced: 0.3811% (1,993 px), dimensions identical, every differing pixel in the key-facts values (y 276–435), which the mockup sets at 15px on a phone, under the 16px phone floor the build keeps. 1024 is included for the 64px rail and the table's narrower fit (Owner folds into the name cell).

Regenerated after the restack (Nov 16, 2026): the three `workspaces` builds at 1440, 1280 and 1024 differ from the previous capture by 2 pixels each, one channel value, in the top bar (y 16–36), under pixelmatch's threshold (their diffs are unchanged, 0 px). Every other file here is byte-identical to the previous set.

| file | screen | width | size | parts | cell result |
|---|---|---|---|---|---|
| `workspaces-1280.ref.png.b64` | Workspaces (`/admin/workspaces`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced |
| `workspaces-1280.build.png.b64` | Workspaces (`/admin/workspaces`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced |
| `workspaces-1280.diff.png.b64` | Workspaces (`/admin/workspaces`) | 1280 | 1280 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1280×737), enforced |
| `workspaces-1024.ref.png.b64` | Workspaces (`/admin/workspaces`) | 1024 | 1024 × 678 | 1 | PASS 0.0000% · 0 px · dims OK (1024×678), enforced |
| `workspaces-1024.build.png.b64` | Workspaces (`/admin/workspaces`) | 1024 | 1024 × 678 | 1 | PASS 0.0000% · 0 px · dims OK (1024×678), enforced |
| `workspaces-1024.diff.png.b64` | Workspaces (`/admin/workspaces`) | 1024 | 1024 × 678 | 1 | PASS 0.0000% · 0 px · dims OK (1024×678), enforced |
| `workspaces-390.ref.png.b64` | Workspaces (`/admin/workspaces`) | 390 | 390 × 1921 | 1 | PASS 0.0000% · 0 px · dims OK (390×1921), enforced |
| `workspaces-390.build.png.b64` | Workspaces (`/admin/workspaces`) | 390 | 390 × 1921 | 1 | PASS 0.0000% · 0 px · dims OK (390×1921), enforced |
| `workspaces-390.diff.png.b64` | Workspaces (`/admin/workspaces`) | 390 | 390 × 1921 | 1 | PASS 0.0000% · 0 px · dims OK (390×1921), enforced |
| `workspace-detail-1280.ref.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 1280 | 1280 × 748 | 1 | PASS 0.0000% · 0 px · dims OK (1280×748), enforced |
| `workspace-detail-1280.build.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 1280 | 1280 × 748 | 1 | PASS 0.0000% · 0 px · dims OK (1280×748), enforced |
| `workspace-detail-1280.diff.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 1280 | 1280 × 748 | 1 | PASS 0.0000% · 0 px · dims OK (1280×748), enforced |
| `workspace-detail-1024.ref.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 1024 | 1024 × 748 | 1 | PASS 0.0000% · 0 px · dims OK (1024×748), enforced |
| `workspace-detail-1024.build.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 1024 | 1024 × 748 | 1 | PASS 0.0000% · 0 px · dims OK (1024×748), enforced |
| `workspace-detail-1024.diff.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 1024 | 1024 × 748 | 1 | PASS 0.0000% · 0 px · dims OK (1024×748), enforced |
| `workspace-detail-390.ref.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 390 | 390 × 1341 | 1 | FAIL 0.3811% · 1993 px · dims OK (390×1341), not enforced |
| `workspace-detail-390.build.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 390 | 390 × 1341 | 1 | FAIL 0.3811% · 1993 px · dims OK (390×1341), not enforced |
| `workspace-detail-390.diff.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 390 | 390 × 1341 | 1 | FAIL 0.3811% · 1993 px · dims OK (390×1341), not enforced |
| `workspaces-1440.ref.png.b64` | Workspaces (`/admin/workspaces`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced |
| `workspaces-1440.build.png.b64` | Workspaces (`/admin/workspaces`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced |
| `workspaces-1440.diff.png.b64` | Workspaces (`/admin/workspaces`) | 1440 | 1440 × 737 | 1 | PASS 0.0000% · 0 px · dims OK (1440×737), enforced |
| `workspace-detail-1440.ref.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 1440 | 1440 × 748 | 1 | PASS 0.0000% · 0 px · dims OK (1440×748), enforced |
| `workspace-detail-1440.build.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 1440 | 1440 × 748 | 1 | PASS 0.0000% · 0 px · dims OK (1440×748), enforced |
| `workspace-detail-1440.diff.png.b64` | Workspace (`/admin/workspaces/ws_northshore`) | 1440 | 1440 × 748 | 1 | PASS 0.0000% · 0 px · dims OK (1440×748), enforced |
