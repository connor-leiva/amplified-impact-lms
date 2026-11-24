// The Week 0 Is Open celebration email (LMS-sent, once, when the course's pre-launch preview opens). Pure: no clock,
// no mail, no database.
//
// WHO. The Accelerator course roster's team owners, by the same rule as `courseRoster` (accelerator.ts): the learner's
// team, that team's accounts, and their plans, which must hold the course. A plan holds it when it is the AI
// Accelerator (kind `cohort`, bought in full or in two payments), not ended and not paused for a payment
// (`liveCoursePlan`). `courseRoster` also asks whether the course itself has opened (D-153, the first live build); this
// email goes when the preview opens, before that, so it asks only about the plan, which is the preview's own entry
// rule (`courseEntry`). An invited buyer who has never signed in is on the roster. Utah Life (an access group), Amplified
// Insiders (`membership`), the Agent Plan (`agent_plan`), the Team Plan and a $37 skill buyer (no plan) are not.
// A test account (`is_test`) is never mailed. Owners only: the email asks the reader to invite their AI Implementer.
//
// THE SWITCH. `week0_open_email` is off until a Console flip turns it on, and the flip records its time
// (`console_flags.turned_on_at`). THE RULE, the mirror of the cohort welcome's: only an enrollment that existed at that
// switch-on time gets this email (`enrolledAtSwitch`), once. One made later belongs to the cohort welcome.
//
// NEVER BOTH. Both emails say Week 0 starts now. Each job skips a row the other may already have mailed
// (`otherEmailReached`): sent, or claimed and then lost (a crash between the claim and the send may have sent it).

import type { AcceleratorPlan } from './accelerator';
import { liveCoursePlan } from './release';
import { enrolledBeforeSwitch } from './welcome';

/** The Console flag. Off until a flip turns it on. */
export const WEEK0_OPEN_FLAG = 'week0_open_email';

/** The template, and its `email_log` name. */
export const WEEK0_OPEN_TEMPLATE = 'week0-open';

/** Where the button goes: Week 0 of the learner course, on learn. */
export const WEEK0_LEARN_PATH = '/learn/week/0';

/** What `week0OpenDecision` tells the job to do with one enrollment on this tick. */
export type Week0OpenDecision = 'hold' | 'skip' | 'wait' | 'send';

/**
 * Whether an enrollment existed when the Week 0 switch came on: made at or before the switch-on time. Only such an
 * enrollment gets the Week 0 email. The same instant test as the welcome's `enrolledBeforeSwitch`, read the other way.
 */
export function enrolledAtSwitch(enrolledAt: number, switchOnAt: number): boolean {
  return enrolledBeforeSwitch(enrolledAt, switchOnAt);
}

/**
 * One enrollment on one tick.
 *
 * `enabledAt` null: the switch is off, nothing is decided (`hold`). An enrollment made after the switch-on time is
 * `skip` (it belongs to the welcome), before anything else. Before the preview opens, or with no preview date, `wait`.
 * Otherwise `send`, also when the preview opened before the switch came on: then it goes on the first tick after.
 */
export function week0OpenDecision(input: { enabledAt: number | null; now: number; enrolledAt: number; previewOpensAt: number | null }): Week0OpenDecision {
  if (input.enabledAt === null) return 'hold';
  if (!enrolledAtSwitch(input.enrolledAt, input.enabledAt)) return 'skip';
  if (input.previewOpensAt === null || input.now < input.previewOpensAt) return 'wait';
  return 'send';
}

/**
 * The course roster's owners for this email: `courseRoster`'s lookup (learner, team, the team's accounts' plans) and
 * its plan rule, without the course's own opening date, which is after the preview (see the header).
 */
export interface Week0Roster {
  has(userId: string): boolean;
}

export function week0Roster(plansByTeam: ReadonlyMap<string, readonly AcceleratorPlan[]>, teamOfLearner: ReadonlyMap<string, string | null>): Week0Roster {
  return {
    has: (userId) => {
      const team = teamOfLearner.get(userId);
      const plans = team ? plansByTeam.get(team) : undefined;
      return !!plans && liveCoursePlan(plans);
    },
  };
}

/**
 * Whether the other celebration email may already have reached this owner: it was sent, or its claim was lost (a crash
 * between the claim and the send can have sent it). Either job then skips the row, so no one gets both. A claim still
 * in flight (`claimed`) is neither: the job waits a tick, and its own claim refuses the row meanwhile.
 */
export function otherEmailReached(status: string | null | undefined, error: string | null | undefined): boolean {
  return status === 'sent' || (status === 'failed' && error === 'lost');
}
