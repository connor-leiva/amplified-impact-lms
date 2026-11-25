// D-259: which pages print the learner portal's times. Connor, Nov 25: "Times everywhere in the learner portal use one
// line: '12:00 PM MT / 1:00 PM CT'." With LMS v3 on (the build flag, D-225), every page but the admin console's does:
// the v3 frame and the pages inside it, the buyer's LMS, and the pages outside a shell (the Skill Library, a guide,
// /course). With it off nothing changes, so today's pages, the reference's goldens and `parity:learner` keep `fmt`'s
// rule (the viewer's zone first, CT in parentheses), and so does the admin console either way.
//
// The router's root (`shell/MasqueradeRoot.tsx`) sets it as it renders, before any page does, so every time on a page
// reads the same way: the style is `fmt`'s, like the viewer's zone, and one address always has the same one.
import type { TimeStyle } from '@ai/core';
import { LMS_V3 } from '../routes/learn/lms-v3/v3';

/** The time style for a page: the learner portal's one line with LMS v3 on, anywhere but the admin console. */
export function timeStyleFor(admin: boolean, v3: boolean = LMS_V3): TimeStyle {
  return v3 && !admin ? 'mtct' : 'viewer';
}
