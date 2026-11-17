# PR #159 review files (R2-4b: Billing refund and void with confirm tokens; seat tier gated, D-164)

Each file is one PNG as a single line of base64 (`base64 -w 0`). Decode one with `base64 -d <name>.png.b64 > <name>.png`; a file split into parts is joined first: `cat <name>.png.b64.part* | base64 -d > <name>.png`.

- `billing-<w>.ref|build|diff.png.b64`: Billing's Summary, the enforced cell, unchanged by this PR: the signed-off mockup render (byte for byte from `design-reference/admin-redesign-r2/ref/`), the app captured by `pnpm parity:admin-r2` in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`, Chromium 153.0.8010.12, `harness/fonts.conf`) at `7e89fadade0d67de35a78a5a2eadb7813071bfcb`, and pixelmatch's diff (threshold 0.1, `includeAA: false`; differing pixels red, a faded copy of the ref means none). The strict counts are D-160 R2-3a's report-only guard: `AA` is pixelmatch with `includeAA: true`, `Δ>60` the pixels with an RGB channel off by more than 60.
- `<dialog or menu>-<w>.build.png.b64`: build only. The refund and void dialogs and the seat-tier item have no ref frame in the mockup (its `Confirm` has no ref; the spec's additions are built from R2 parts), so no parity cell and no diff. Captured from the fixture build (`?as=admin`, the frozen clock, America/Phoenix) with the host's Playwright Chromium at `7e89fadade0d67de35a78a5a2eadb7813071bfcb`. The commit that adds these files changes no app code.
- **Eye check:** the dialogs are the mockup's `Confirm` (title, sentence, Reason, "This action is audit-logged.", Cancel, the danger action) plus the spec's parts inside it; the actions and the seat tier are items in the Invoices "…" the mockup draws. Nothing is drawn on a framed page that the mockup doesn't draw.

| file | screen | width | size | parts | cell result |
|---|---|---|---|---|---|
| `billing-1440.ref.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 1440 | 1440 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1440×1027), enforced; strict AA 0 px · Δ>60 0 px |
| `billing-1440.build.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 1440 | 1440 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1440×1027), enforced; strict AA 0 px · Δ>60 0 px |
| `billing-1440.diff.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 1440 | 1440 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1440×1027), enforced; strict AA 0 px · Δ>60 0 px |
| `billing-1280.ref.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 1280 | 1280 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1280×1027), enforced; strict AA 0 px · Δ>60 0 px |
| `billing-1280.build.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 1280 | 1280 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1280×1027), enforced; strict AA 0 px · Δ>60 0 px |
| `billing-1280.diff.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 1280 | 1280 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1280×1027), enforced; strict AA 0 px · Δ>60 0 px |
| `billing-1024.ref.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 1024 | 1024 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1024×1027), enforced; strict AA 0 px · Δ>60 0 px |
| `billing-1024.build.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 1024 | 1024 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1024×1027), enforced; strict AA 0 px · Δ>60 0 px |
| `billing-1024.diff.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 1024 | 1024 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1024×1027), enforced; strict AA 0 px · Δ>60 0 px |
| `billing-390.ref.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 390 | 390 × 1728 | 1 | PASS 0.0000% · 0 px · dims OK (390×1728), enforced; strict AA 0 px · Δ>60 0 px |
| `billing-390.build.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 390 | 390 × 1728 | 1 | PASS 0.0000% · 0 px · dims OK (390×1728), enforced; strict AA 0 px · Δ>60 0 px |
| `billing-390.diff.png.b64` | Billing, Summary (`/admin/billing`): unchanged by this PR | 390 | 390 × 1728 | 1 | PASS 0.0000% · 0 px · dims OK (390×1728), enforced; strict AA 0 px · Δ>60 0 px |
| `refund-dialog-1280.build.png.b64` | Refund dialog, preview with its consequences (Invoices → "Refund…") | 1280 | 1280 × 900 | 1 | n/a (no ref frame) |
| `refund-dialog-390.build.png.b64` | Refund dialog, preview with its consequences (Invoices → "Refund…") | 390 | 390 × 844 | 1 | n/a (no ref frame) |
| `refund-expired-1280.build.png.b64` | Refund dialog, error: 410 `confirm_expired` with "Start again" (`?console-state=action_expired`) | 1280 | 1280 × 900 | 1 | n/a (no ref frame) |
| `refund-expired-390.build.png.b64` | Refund dialog, error: 410 `confirm_expired` with "Start again" (`?console-state=action_expired`) | 390 | 390 × 844 | 1 | n/a (no ref frame) |
| `void-dialog-1280.build.png.b64` | Void dialog, preview with its consequences (Invoices → "Void invoice…") | 1280 | 1280 × 900 | 1 | n/a (no ref frame) |
| `void-dialog-390.build.png.b64` | Void dialog, preview with its consequences (Invoices → "Void invoice…") | 390 | 390 × 844 | 1 | n/a (no ref frame) |
| `void-scope-1280.build.png.b64` | Void dialog, error: 503 `stripe_permission_missing`, Write on Invoices (`?console-state=action_scope`) | 1280 | 1280 × 900 | 1 | n/a (no ref frame) |
| `void-scope-390.build.png.b64` | Void dialog, error: 503 `stripe_permission_missing`, Write on Invoices (`?console-state=action_scope`) | 390 | 390 × 844 | 1 | n/a (no ref frame) |
| `seat-tier-1280.build.png.b64` | Invoices → a Team Plan invoice's "…" → "Change seat tier…": drawn disabled, its reason in words (the gate, spec § 15) | 1280 | 1280 × 900 | 1 | n/a (no ref frame) |
| `seat-tier-390.build.png.b64` | Invoices → a Team Plan invoice's "…" → "Change seat tier…": drawn disabled, its reason in words (the gate, spec § 15) | 390 | 390 × 844 | 1 | n/a (no ref frame) |
