# Phase 08: Integrations: Email, File Storage, Video, Zoom and Scheduled Jobs

**Goal.** Replace every simulated side effect in the mockup with a real one, without changing any UI. The table below maps each simulated behavior to its production replacement.

**Ships when:** `pnpm gate 8` is green, using integration tests with fake transports plus one staging smoke test per provider.

| Mockup simulation | Production behavior |
|---|---|
| Toast "Invite sent to …" | Email via Resend (`team-invite`, `staff-invite`) carrying a 7-day invite link |
| "Send Now" announcement | In-app banner and/or Resend email to the audience |
| Automated Reminders toggles | Scheduled jobs: 24 h and 1 h before each session, Replay ready, Build not finished 48 h after its session, Weekly digest |
| File download | A presigned GET URL from the Railway Storage Bucket, 302 redirect |
| Vault upload drop zone | A presigned PUT URL plus `POST /api/mutate/uploadResource` with `storageKey` |
| Fake player | A real HLS player (Mux or another HLS host) behind the same `VideoEngine` interface |
| Zoom link always present | The Zoom URL is revealed only inside the join window, by `GET /api/sessions/:id/join` |
| "Opening Zoom: …" toast | `window.open(url, '_blank', 'noopener')` |
| Nudge / Remind | Email via Resend (`nudge`, `build-reminder`) |

## 8.1 Email (Resend)

```bash
pnpm --filter @ai/api add resend @react-email/components
```
- `apps/api/src/email/transport.ts` exposes `send({template, to, data})`. In `NODE_ENV=test` it writes to an in-memory outbox (served at `/api/test/outbox`). In development it logs to the console.
- Templates live in `apps/api/src/email/templates/*.tsx` (React Email). Build them with the same tokens as **inline hex values**, resolved from `tokens.css` light mode by `scripts/email-tokens.mjs`, because email clients don't support CSS variables or `oklch`.
- Each email has a 560 px content column, Hanken Grotesk with a system-sans fallback, the H1 at 26/32, body text at 14/20 and one primary button styled like `Button primary`.

| Template | Subject (exact) | Trigger |
|---|---|---|
| `sign-in` | `Your Amplified Impact sign-in link` | `POST /api/auth/request` |
| `team-invite` | `{inviter} invited you to {team} on Amplified Impact` | effect from `inviteMember` |
| `staff-invite` | `You’ve been added to the Amplified Impact admin console` | effect from `inviteStaff` |
| `announcement` | `{title}` | `sendAnnouncement` with the `email` channel (now or scheduled) |
| `session-24h` / `session-1h` | `Tomorrow: Session {n} · {title}` / `Starting in 1 hour: Session {n} · {title}` | scheduler, when the reminder is on |
| `replay-ready` | `Replay is up: Session {n} · {title}` | `publishReplay`, when the reminder is on |
| `build-reminder` | `Finish your {employee}` | `remindMembers`, `nudgeLearners`, and the 48 h job |
| `weekly-digest` | `Your team this week` | scheduler, Mondays at 08:00 CT, when the reminder is on |

Session times in emails use `fmt.when` with the **recipient's** saved zone, and fall back to CT.

## 8.2 File storage (Railway Storage Bucket, S3-compatible)

```bash
pnpm --filter @ai/api add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```
`apps/api/src/storage.ts`
```ts
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const s3 = new S3Client({ region: process.env.S3_REGION ?? 'auto', endpoint: process.env.S3_ENDPOINT, forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
const Bucket = process.env.S3_BUCKET!;
export const presignGet = (key: string, filename: string) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket, Key: key, ResponseContentDisposition: `attachment; filename="${filename}"` }), { expiresIn: 300 });
export const presignPut = (key: string, contentType: string) =>
  getSignedUrl(s3, new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), { expiresIn: 600 });
```
Routes:
- `GET /api/files/resource/:id`: checks access with `canAccess`-style tier rules, runs `downloadResource`, then 302-redirects to `presignGet`.
- `GET /api/files/module/:moduleId/:fileName`: the same check, for skill files and per-employee resources.
- `POST /api/files/upload-url {contentType, size}`: staff with `curriculum` only. It caps `size` at 25 MB, allows `application/json`, `application/pdf`, `text/markdown` and `application/zip`, and returns `{ key, url }`.

On the web side, the build kit and vault `Download` buttons navigate to these routes instead of creating Blobs. Fixture mode keeps the prototype's Blob behavior.

## 8.3 Video replays

`VideoEngine` interface (phase 05):
```ts
export interface VideoEngine { play(): void; pause(): void; seek(t: number): void; setRate(r: 1 | 1.25 | 1.5 | 2): void;
  onTime(cb: (t: number) => void): () => void; onEnded(cb: () => void): () => void; }
```
- **Fixture:** `TickerEngine`, which advances 0.25 s × rate every 250 ms.
- **Production:** `HlsEngine` wraps a hidden `<video>` with `hls.js` (or native HLS on Safari). The poster, controls, captions and chapter rail are **our** UI from SCREENS §3.2. Never show the provider's player chrome.
- Admin `publishReplay` takes `{ playbackUrl, durationSec, transcriptVtt? }`. Parse WebVTT into `transcript: [seconds, text][]`. Chapters remain `checklist[i].t`.
- Optional Zoom import: subscribe to the Zoom `recording.completed` webhook, verify its signature, download the MP4 to the bucket, hand it to the video host, then call `publishReplay` when processing finishes. Until then, `replay = 'processing'`, which drives the `ended_processing` card variant.

## 8.4 Zoom join window (server-enforced)

- `scopeSnapshot` blanks `session.zoom` for learners.
- `GET /api/sessions/:id/join` returns `{ url }` only if the learner can access the session's AI Employee and `joinMode(session, now) !== 'disabled'`. Otherwise it returns `409 { error: 'Join opens 15 min before' }`.
- The web `JoinButton.onJoin` fetches this endpoint, then calls `window.open(url, '_blank', 'noopener')`.
- `goLive` and `endSession` stay manual admin actions. An optional Zoom webhook (`meeting.started` / `meeting.ended`) can call them automatically.

## 8.5 Scheduler

Run the scheduler in-process in the API service, guarded by a Postgres advisory lock so only one replica executes jobs.
```ts
// apps/api/src/jobs/scheduler.ts
export function startScheduler() {
  setInterval(async () => {
    await db.transaction(async (tx) => {
      const [{ locked }] = await tx.execute(sql`select pg_try_advisory_xact_lock(4242) as locked`);
      if (!locked) return;
      const now = clock.now();
      await runDue(tx, now, [sessionReminders, replayReady, buildNotFinished48h, weeklyDigest, scheduledAnnouncements]);
    });
  }, 60_000);
}
```
- Every job is idempotent. Record sends in a `job_runs(job, key, sent_at)` table with a unique `(job, key)`. For example, the key `session-24h:dec26-s3:u_jamie` is sent once.
- `scheduledAnnouncements` flips `status: 'scheduled' → 'sent'` at `at`. The in-app banner appears from that moment, and email goes out if the channel is set.
- Scheduled AI Employees need no job. `isOpen(m, now)` already opens them at `opens`.

---

## Gate 8: Ship Checklist

Automated (`apps/api/test/integrations/*.test.ts`, fake transports, `FIXED_NOW`):
- `inviteMember` puts exactly one `team-invite` email for the invitee in the outbox, with the exact subject, and its link verifies.
- A `sendAnnouncement` with the email channel and `audience: 'team'` sends to Team-tier learners only. In-app-only sends no email.
- The scheduler at `2026-12-08T13:00 CT` sends `session-24h` for Session 3 to each eligible learner once. Running it twice sends nothing new.
- `GET /api/sessions/dec26-s3/join` returns 409 at 12:44 CT and 200 with the URL at 12:46 CT. Jamie gets 403 for `dec26-s4` (Team tier).
- Downloading a Team-tier resource as Jamie returns 403. As Alex it returns 302 to a presigned URL whose `X-Amz-Expires` is ≤ 300.
- `upload-url` rejects 26 MB and `text/html` with 422.
- The WebVTT parser round-trips the Marketing transcript fixture.
- Email templates render snapshots (`@react-email/render` → HTML) that contain the exact subject and the CTA label.

Manual (staging, recorded in the PR):
- [ ] A real invite email arrives and its link signs in.
- [ ] A real file uploads to the bucket and downloads.
- [ ] A real replay plays with captions and chapter seeking.
- [ ] Join opens Zoom in a new tab only within the window.
