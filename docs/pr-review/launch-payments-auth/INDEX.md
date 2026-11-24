# Review files for the Week 0 launch audit, PR A (payments and auth, D-244)

The only screen this PR changes is the Team Hub's invite form (H-12). H-1, H-4 and H-16 change server behavior only and are covered by tests.

- **Build:** the fixture build (`pnpm --filter @ai/web build:fixture`), served by `vite preview`, viewed as the seeded Team Owner (`/team?as=owner`, Alex Morgan, Northline Realty Team).
- **Steps:** Invite Member, Work Email `Natasha@HarborPine.com` (Natasha Reed already owns Harbor & Pine Group, in other capitals), Role Operations Lead, Send Invite.
- **How they were taken:** Playwright, Chromium, device scale factor 2, reduced motion, time zone Mountain.

| File | Screen | Width | What it shows |
|---|---|---|---|
| `h12-invite-existing-account-1280.png` | Team Hub › Invite a Team Member | 1280 | The new inline error under the role cards: "That email already has an Amplified Impact account. Invite them with a different email, or write to support@amplifiedimpact.io." Before this PR the same submit reached the database's unique email and answered 500 (in production the form showed nothing), or, in other capitals, made a second account. |
| `h12-invite-existing-account-390.png` | The same dialog on a phone | 390 | The same error, wrapped inside the dialog's gutter. |
