# compliance/goldens

These files are the **test oracle**. They are captured from the unmodified `design-reference/`
prototype by `pnpm compliance:capture` and nothing else.

- `<scenario>.<region>.png` — the pixels the reference renders
- `<scenario>.<region>.json` — the copy + typography fingerprint (compared exactly)

## Rules (CLAUDE.md › Non-negotiables)

- **Never edit these by hand.**
- **Never regenerate them to make a failing test pass.** A failing parity test means the app is
  wrong, not the golden.
- Regenerate only when `design-reference/` itself changes, or when `@playwright/test` is
  deliberately upgraded — in the same PR as that change.
- The CI `goldens` job re-captures and requires a zero git diff, which proves they are
  reproducible from the reference.

## Platform note

Pixel goldens depend on the Chromium build and the host's font rasterization. The authoritative
set is captured in the pinned Playwright container:

```
pnpm compliance:docker compliance:capture
```

Goldens captured on a developer's Windows or macOS machine are useful for local feedback but will
not byte-match the Linux container. If `compliance/goldens/PROVENANCE.txt` says `local`, the set is
dev-only and the CI `goldens` job will replace it.
