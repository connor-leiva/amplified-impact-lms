# Review files for PR B, the admin console's launch-audit fixes (D-247)

The Week 0 launch audit's H-5 to H-9: what changed on screen in the admin console and the Team Hub, and the two emails Resend Invite and Send Nudge now send, at 1280 and 390.

- **Build.** The dev server (`VITE_DATA_SOURCE=http`, `VITE_LEARNER_V2=true`) on a local API and Postgres: the demo seed, then the course (`db:curriculum`), and one invited learner added (Nina Park, Northline Realty Team). Signed in as Casey Lin (Owner), Maya Chen (Content Editor, Publish modules off, as seeded) and Alex Morgan (Team Owner).
- **Email.** "Sent" states ran with the API in test mode, which puts each email in the test outbox. "Not set up" states ran with the API in development mode, which sends no email. The emails are rendered by the template registry as the transport sends them. The wordmark's hosted URL can't be reached from the sandbox, so it was served from `apps/web/public/brand/`, the same file.
- **Held and failed requests.** Save's in-flight state holds the request for three seconds in Playwright. The 429 and the network failure are a Playwright route answering with the limiter's own body, or failing the request.
- **How.** Playwright, Chromium, device scale factor 2, reduced motion, Mountain Time. Viewport shots at 1280×800 and 390×844; the Settings card is a crop; the emails are full page.

| File | Screen | Width | What it shows |
|---|---|---|---|
| `builder-saving-1280.png` | Module Builder, Week 0 | 1280 | H-6: Save changes is disabled while the save is on its way |
| `builder-saving-390.png` | The same | 390 | The same, on a phone |
| `builder-saving-status-1280.png` | Module Builder, Settings card (crop) | 1280 | H-6: the Status menu is disabled while the save is on its way |
| `builder-saving-status-390.png` | The same | 390 | The same, on a phone |
| `builder-409-1280.png` | Module Builder, Week 0 | 1280 | H-6: another tab saved first; this tab's Save is refused (409). The message is shown inline and as a toast. The draft ("Week 0 (this tab, 1280)") is still on screen |
| `builder-409-390.png` | The same | 390 | The same, on a phone |
| `builder-publish-notice-1280.png` | Module Builder, Week 0, as a Content Editor | 1280 | H-8: the notice up front: saving a published or scheduled week needs the "Publish modules" permission |
| `builder-publish-notice-390.png` | The same | 390 | The same, on a phone |
| `builder-publish-refused-1280.png` | The same, after Save | 1280 | H-8 with H-7: the server's 403 says which permission is missing and who has it, inline and as a toast. Nothing was saved |
| `builder-publish-refused-390.png` | The same | 390 | The same, on a phone |
| `error-toast-429-1280.png` | Curriculum › Duplicate | 1280 | H-7: a rate-limited action shows the limiter's own words as an error toast (it used to fail silently) |
| `error-toast-429-390.png` | The same | 390 | The same, on a phone |
| `error-toast-network-1280.png` | Curriculum › Duplicate | 1280 | H-7: a request that never reached the server shows "Something went wrong. Try again." |
| `error-toast-network-390.png` | The same | 390 | The same, on a phone |
| `learners-nudge-sent-1280.png` | Learners & Teams, Jamie Ortiz's details | 1280 | H-9: Send Nudge sent the nudge email: "Nudge sent to Jamie Ortiz" |
| `learners-nudge-sent-390.png` | The same | 390 | The same, on a phone |
| `learners-invite-sent-1280.png` | Learners & Teams, Nina Park's details (invite pending) | 1280 | H-9: Resend Invite sent a fresh set-password link: "Invite resent to nina@northlinerealty.com" |
| `learners-invite-sent-390.png` | The same | 390 | The same, on a phone |
| `learners-nudge-off-1280.png` | Learners & Teams, Jamie Ortiz's details | 1280 | H-9: on a server with no email set up, the toast says nothing was sent |
| `learners-nudge-off-390.png` | The same | 390 | The same, on a phone |
| `announce-send-now-sent-1280.png` | Announcements, after Send now with In-app and email | 1280 | H-9: the email went to everyone the banner reaches, and the toast says how many |
| `announce-send-now-sent-390.png` | The same | 390 | The same, on a phone |
| `announce-send-now-off-1280.png` | The same, with no email set up | 1280 | H-9: the banner is live, and the toast says no email went out |
| `announce-send-now-off-390.png` | The same | 390 | The same, on a phone |
| `teamhub-resend-invite-1280.png` | Team Hub (`/learn/team`), as the Team Owner, Nina Park's details | 1280 | H-9: a Team Owner's Resend Invite sends the same email (it used to only show the toast) |
| `teamhub-resend-invite-390.png` | The same | 390 | The same, on a phone |
| `email-invite-1280.png` | The Resend Invite email (`learner-invite`) | 1280 | The $37 skill email's design: the address they sign in with, and Set Your Password (72 hours) |
| `email-invite-390.png` | The same | 390 | The same, on a phone (the address wraps rather than scroll) |
| `email-nudge-1280.png` | The Send Nudge email (`learner-nudge`) | 1280 | The same design: Pick up where you left off, and Sign In |
| `email-nudge-390.png` | The same | 390 | The same, on a phone |
| `email-purchase-reference-1280.png` | The $37 skill purchase email, unchanged | 1280 | For comparison. Its output is byte for byte what main renders (`branded-html.test.ts` holds the hashes) |
| `email-purchase-reference-390.png` | The same | 390 | The same, on a phone |
