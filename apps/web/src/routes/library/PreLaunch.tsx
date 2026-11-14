// D-153: the pre-launch welcome. An AI Accelerator buyer can sign in as soon as they buy, but nothing
// paid opens until the first live build (Wednesday, Dec 2, 12:00 PM Mountain = 1:00 PM Central). Until
// then the course's modules are not in their snapshot at all, so the portal has nothing to draw and
// sign-in lands them on the Skill Library (D-150), where every paid skill reads "Coming December 2".
// This panel says why, on that page and on /course, from the instant the API reports
// (`courseOpensAt` on `GET /api/skills`, `opensAt` on `/api/course`'s 403), never a date typed here.
//
// Its own stylesheet, so neither page's (which Design is restyling, PR 77) changes. Times go through
// `fmt.*`: the viewer's zone first, the program's in parentheses.

import { fmt } from '@ai/core';
import { SUPPORT_EMAIL } from '@ai/core/offer';
import s from './PreLaunch.module.css';

export const PRE_LAUNCH = {
  title: 'You’re in the Amplified AI Accelerator.',
  starts: (when: string) => `Live sessions start ${when}. Your course and your skills open then.`,
  support: 'Questions? Email',
} as const;

/** "Wednesday, Dec 2, at 12:00 PM MT (1:00 PM CT)", in the viewer's zone, the program's after it. */
export const whenOf = (t: number): string => `${fmt.weekday(t)}, ${fmt.date(t)}, at ${fmt.time(t)}`;

export function PreLaunch({ opensAt }: { opensAt: number }) {
  return (
    <section className={s.panel} aria-labelledby="pre-launch-title" data-pre-launch>
      <h2 className={s.title} id="pre-launch-title">
        {PRE_LAUNCH.title}
      </h2>
      <p className={s.body}>{PRE_LAUNCH.starts(whenOf(opensAt))}</p>
      <p className={s.body}>
        {PRE_LAUNCH.support}{' '}
        <a className={s.link} href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </section>
  );
}
