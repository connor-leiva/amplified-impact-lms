# Review files for PR #126

API only; no screens changed; no review images.

Console 2a (D-158) adds the support-record API (workspaces, users, staff notes, the staff password reset, the users export and search) and migration `0017_staff_notes`. It changes no file under `apps/web/`, so there is no screen to compare with the mockup. The results comment carries `pnpm parity:admin-r2` for every built cell, with the strict counts, as a regression check.
