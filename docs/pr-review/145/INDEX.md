# PR #145 review files (R2-4a-2: /admin/billing on R2, D-163)

Each file is one PNG as a single line of base64 (`base64 -w 0`). Decode one with `base64 -d <name>.png.b64 > <name>.png`; a file split into parts is joined first: `cat <name>.png.b64.part* | base64 -d > <name>.png`.

- `billing-<w>.ref.png.b64`: the signed-off mockup render, byte for byte from `design-reference/admin-redesign-r2/ref/`.
- `billing-<w>.build.png.b64`: the app, captured by `pnpm parity:admin-r2` in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`, Chromium 153.0.8010.12, `harness/fonts.conf`) at `8467e7980f58c031e77c57e70ab4c9401645e864`. The commit that adds these files changes no app code.
- `billing-<w>.diff.png.b64`: pixelmatch's output (threshold 0.1, `includeAA: false`). Differing pixels are drawn red; an image that is only a faded copy of the ref means none differ.
- `billing-<tab>-<w>.build.png.b64`: the other five tabs, build only (the mockup has refs of the Summary only), captured the parity way (the fixture build, `?as=admin&parity=r2`, the frozen clock, the frame element) with the host's Playwright Chromium.

| file | screen | width | size | parts | cell result |
|---|---|---|---|---|---|
| `billing-1440.ref.png.b64` | Billing, Summary (`/admin/billing`) | 1440 | 1440 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1440×1027), enforced |
| `billing-1440.build.png.b64` | Billing, Summary (`/admin/billing`) | 1440 | 1440 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1440×1027), enforced |
| `billing-1440.diff.png.b64` | Billing, Summary (`/admin/billing`) | 1440 | 1440 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1440×1027), enforced |
| `billing-1280.ref.png.b64` | Billing, Summary (`/admin/billing`) | 1280 | 1280 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1280×1027), enforced |
| `billing-1280.build.png.b64` | Billing, Summary (`/admin/billing`) | 1280 | 1280 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1280×1027), enforced |
| `billing-1280.diff.png.b64` | Billing, Summary (`/admin/billing`) | 1280 | 1280 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1280×1027), enforced |
| `billing-1024.ref.png.b64` | Billing, Summary (`/admin/billing`) | 1024 | 1024 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1024×1027), enforced |
| `billing-1024.build.png.b64` | Billing, Summary (`/admin/billing`) | 1024 | 1024 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1024×1027), enforced |
| `billing-1024.diff.png.b64` | Billing, Summary (`/admin/billing`) | 1024 | 1024 × 1027 | 1 | PASS 0.0000% · 0 px · dims OK (1024×1027), enforced |
| `billing-390.ref.png.b64` | Billing, Summary (`/admin/billing`) | 390 | 390 × 1728 | 1 | PASS 0.0000% · 0 px · dims OK (390×1728), enforced |
| `billing-390.build.png.b64` | Billing, Summary (`/admin/billing`) | 390 | 390 × 1728 | 1 | PASS 0.0000% · 0 px · dims OK (390×1728), enforced |
| `billing-390.diff.png.b64` | Billing, Summary (`/admin/billing`) | 390 | 390 × 1728 | 1 | PASS 0.0000% · 0 px · dims OK (390×1728), enforced |
| `billing-customers-1280.build.png.b64` | Billing, Customers (`/admin/billing/customers`) | 1280 | 1280 × 705 | 1 | build only: the mockup has no ref frame of this tab |
| `billing-customers-390.build.png.b64` | Billing, Customers (`/admin/billing/customers`) | 390 | 390 × 1473 | 1 | build only: the mockup has no ref frame of this tab |
| `billing-subscriptions-1280.build.png.b64` | Billing, Subscriptions (`/admin/billing/subscriptions`) | 1280 | 1280 × 705 | 1 | build only: the mockup has no ref frame of this tab |
| `billing-subscriptions-390.build.png.b64` | Billing, Subscriptions (`/admin/billing/subscriptions`) | 390 | 390 × 1354 | 1 | build only: the mockup has no ref frame of this tab |
| `billing-invoices-1280.build.png.b64` | Billing, Invoices (`/admin/billing/invoices`) | 1280 | 1280 × 705 | 1 | build only: the mockup has no ref frame of this tab |
| `billing-invoices-390.build.png.b64` | Billing, Invoices (`/admin/billing/invoices`) | 390 | 390 × 1606 | 1 | build only: the mockup has no ref frame of this tab |
| `billing-failed-1280.build.png.b64` | Billing, Failed payments (`/admin/billing/failed`) | 1280 | 1280 × 705 | 1 | build only: the mockup has no ref frame of this tab |
| `billing-failed-390.build.png.b64` | Billing, Failed payments (`/admin/billing/failed`) | 390 | 390 × 934 | 1 | build only: the mockup has no ref frame of this tab |
| `billing-refunds-1280.build.png.b64` | Billing, Refunds (`/admin/billing/refunds`) | 1280 | 1280 × 705 | 1 | build only: the mockup has no ref frame of this tab |
| `billing-refunds-390.build.png.b64` | Billing, Refunds (`/admin/billing/refunds`) | 390 | 390 × 510 | 1 | build only: the mockup has no ref frame of this tab |

## Strict counts (report-only)

The strict guard (D-160 R2-3a, `compliance/lib/admin-r2-strict.ts`) at the same capture: `AA` is pixelmatch at 0.1 with `includeAA: true`; `Δ>60` the pixels where any RGB channel differs by more than 60, with their box. Nothing to explain: 0 px everywhere.

| cell | AA | Δ>60 |
|---|---|---|
| billing-1440 | 0 px (0.0000%) | 0 px |
| billing-1280 | 0 px (0.0000%) | 0 px |
| billing-1024 | 0 px (0.0000%) | 0 px |
| billing-390 | 0 px (0.0000%) | 0 px |

**Eye check.** The Summary draws exactly the mockup's chrome at all four widths. The five list tabs have no ref frame (build only); their rows' "…" appears only where the mockup's code draws one (Invoices, Failed payments).
