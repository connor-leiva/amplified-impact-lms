# PR #136 review files (Admin redesign R2-1c part 1, D-160)

Each file is one PNG as a single line of base64 (`base64 -w 0`). Decode one with `base64 -d <name>.png.b64 > <name>.png`; a file split into parts is joined first: `cat <name>.png.b64.part* | base64 -d > <name>.png`.

- `*.ref.png.b64`: the signed-off mockup render, byte for byte from `design-reference/admin-redesign-r2/ref/`.
- `*.build.png.b64`: the app, captured by `pnpm parity:admin-r2` in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`, Chromium 153.0.8010.12, `harness/fonts.conf`) at `cba5305`, the merge of #126's new head (`12c50bf`: `main` 46dc5ae with #140, and `0017_staff_notes`). The commits after it change only `DECISIONS.md`, `compliance/lib/admin-r2-exceptions.ts` and these files, no app code.
- `*.diff.png.b64`: pixelmatch's output for the cell (threshold 0.1, `includeAA: false`). Differing pixels are drawn red; an image that is only a faded copy of the ref means none differ.
- `strict`: the report-only guard (`compliance/lib/admin-r2-strict.ts`): `AA` is pixelmatch at 0.1 with `includeAA: true`, `Δ>60` the pixels where any RGB channel differs by more than 60, with their box.

Cells in this part, all enforced: `workspaces` × 1440 / 1280 / 1024 / 390 and `workspace-detail` × 1440 / 1280 / 1024 PASS at 0.0000%, 0 px, dimensions identical, 0 over 60. `workspace-detail-390` is an **approved exception** (Connor, Nov 16, 2026, 8:27 AM MST, D-160): 0.3811% (1,993 px), dimensions identical, every differing pixel in the key facts' values (x 30–356, y 276–435), which the mockup sets at 15px on a phone and the build keeps at the 16px floor; with the mockup's 15px applied temporarily it measures 0.0000%. 1024 is included for the 64px rail and the table's narrower fit (Owner folds into the name cell).

Regenerated at `cba5305` (Nov 16, 2026): the three `workspaces` builds at 1440, 1280 and 1024 differ from the previous set by the same 2 top-bar pixels as before (one channel value, under the threshold; their diffs are unchanged, 0 px), the run-to-run capture noise already noted. Every other file is byte-identical to the previous set.

| file(s) | screen | width | kind | parts | cell diff | strict (report-only) |
|---|---|---|---|---|---|---|
| `workspaces-1440.ref.png.b64` | workspaces | 1440 | ref | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspaces-1440.build.png.b64` | workspaces | 1440 | build | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspaces-1440.diff.png.b64` | workspaces | 1440 | diff | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspaces-1280.ref.png.b64` | workspaces | 1280 | ref | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspaces-1280.build.png.b64` | workspaces | 1280 | build | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspaces-1280.diff.png.b64` | workspaces | 1280 | diff | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspaces-1024.ref.png.b64` | workspaces | 1024 | ref | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspaces-1024.build.png.b64` | workspaces | 1024 | build | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspaces-1024.diff.png.b64` | workspaces | 1024 | diff | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspaces-390.ref.png.b64` | workspaces | 390 | ref | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspaces-390.build.png.b64` | workspaces | 390 | build | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspaces-390.diff.png.b64` | workspaces | 390 | diff | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspace-detail-1440.ref.png.b64` | workspace-detail | 1440 | ref | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspace-detail-1440.build.png.b64` | workspace-detail | 1440 | build | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspace-detail-1440.diff.png.b64` | workspace-detail | 1440 | diff | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspace-detail-1280.ref.png.b64` | workspace-detail | 1280 | ref | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspace-detail-1280.build.png.b64` | workspace-detail | 1280 | build | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspace-detail-1280.diff.png.b64` | workspace-detail | 1280 | diff | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspace-detail-1024.ref.png.b64` | workspace-detail | 1024 | ref | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspace-detail-1024.build.png.b64` | workspace-detail | 1024 | build | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspace-detail-1024.diff.png.b64` | workspace-detail | 1024 | diff | 1 | 0.0000% · 0 px · dims OK · PASS | AA 0 px · Δ>60 0 px |
| `workspace-detail-390.ref.png.b64` | workspace-detail | 390 | ref | 1 | 0.3811% · 1,993 px · dims OK · **PASS (approved exception, D-160)**, ceiling 0.3811% · 1,993 px | AA 3,269 px · Δ>60 2,698 px [x 30–356, y 276–435] |
| `workspace-detail-390.build.png.b64` | workspace-detail | 390 | build | 1 | 0.3811% · 1,993 px · dims OK · **PASS (approved exception, D-160)**, ceiling 0.3811% · 1,993 px | AA 3,269 px · Δ>60 2,698 px [x 30–356, y 276–435] |
| `workspace-detail-390.diff.png.b64` | workspace-detail | 390 | diff | 1 | 0.3811% · 1,993 px · dims OK · **PASS (approved exception, D-160)**, ceiling 0.3811% · 1,993 px | AA 3,269 px · Δ>60 2,698 px [x 30–356, y 276–435] |
