# The admin sidebar beside the mockup (D-239)

The app's fixture build (`?parity=r2`, the mockup's own data) on the left, `handoff/admin-mockup/dist/index.html`
("Sidebar: proposed") on the right, rendered alike (Chromium 153, the R2 renderer's fonts).

| File | What |
|---|---|
| `1440-overview.png`, `1280-overview.png` | Overview: Health open, its page current |
| `1440-operations-opened.png`, `1280-operations-opened.png` | Operations opened by hand: Health shuts and keeps the tint |
| `1440-all-shut.png`, `1280-all-shut.png` | Health's own row clicked shut: every group shut |
| `1440-rail.png`, `1024-rail.png` | The rail: collapsed by hand at 1440, by default at 1024 |
| `1440-rail-flyout.png`, `1024-rail-flyout.png` | Operations' fly-out, drawn outside the rail |
| `390-drawer.png` | The phone's drawer: the same rows, no toggle |
| `travel-collapse-8x.png` | The collapse slowed 8×, at 40, 120, 180, 240, 320 and 460 ms: the app above, the mockup below |
| `travel-expand-8x.png` | The expand slowed 8×, at 40, 120, 240, 380, 500 and 720 ms: the app above, the mockup below |

Two differences are expected:

- **"3 waiting" on Support** is the mockup's Community row (R-3). Until R-3 is in, nothing is waiting.
- **The icons' colour.** The mockup draws every sidebar icon in `--f3`: its new file list is also named `.fl`, and
  its `.fl svg` rule reaches the sidebar. The reference and the app draw them `--f2`, forest on the group holding the
  page, as the spec says (D-239).

## Admin › Support › Community (D-238)

The same build at the mockup's "now" (`?now=2026-11-20T21:20:00.000Z`, Central time), the app left and the mockup
right: `community-1440.png`, `thread-1440.png`, `community-390.png` and `thread-390.png`. Expected differences: the
sidebar's data (the fixture's counts and staff member, Casey Lin, where the mockup has Connor Leiva) and the mockup's
Forms & Submissions row, which is not part of this work.
