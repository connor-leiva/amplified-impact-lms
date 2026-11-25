# Paste this to Claude Code

Build the admin restructure (R-5). Start with Phase 0 only.

1. Copy the attached `admin-mockup` folder over `handoff/admin-mockup/`. Keep what is already there and not in the
   folder: your `compare/`, and `build.mjs`, which is unchanged and was left out so the zip can go by email.
   Commit it as is.
2. Read `handoff/admin-mockup/ADMIN-RESTRUCTURE-SPEC.md` end to end. Then open
   `handoff/admin-mockup/dist/index.html` and walk the two "NEW" groups in the Screen list.
3. Do Phase 0: write `handoff/admin-mockup/PLAN.md` and the December test from section 1 of the spec. Open one
   pull request with those two things and stop. I will read the plan before any other phase starts.

What outranks everything else:

- December is live. After every phase its outputs are identical. Section 1 says how to prove it.
- One phase per pull request, in the spec's order. Phases 1 and 2 can run side by side.
- Don't start Phase 5 (selling a seat) until I have answered Q-21 and Q-22 in section 8.
- Never create or change a Stripe price, a Payment Link, or anything in GoHighLevel.
- Take the next free decision numbers after D-252. The spec names none.
- Where the spec and the mockup disagree, or the code contradicts the spec, stop and tell me.
