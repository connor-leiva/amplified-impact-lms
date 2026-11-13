// Who may make their own account by email (D-148, D-151): the addresses a link may be sent to before
// any account exists, and whose account is made when that link is spent (which is what proves the
// address). Everyone else still needs a purchase or an invite (§ 7.5: an unknown address is sent nothing).
//
//   - An access group's address (D-148): an @liveutah.com one.
//   - D-151: an address that signed up on a FREE skill's page (the "Get 5 Free Skills" set). Its
//     guided setup is in learn now, behind a free account: the sign-up stores the lead row as before
//     (the GoHighLevel sync is unchanged), and that row is what lets the address have an account.
//
// Read-only. Nothing here sends an email: the caller sends only the link the person asked for.

import { and, eq, inArray } from 'drizzle-orm';
import { isFreeGrokTemplate } from '@ai/core/grok-templates';
import { GUIDED_PAGES, skillIdOfPage } from '@ai/core/skill-guides';
import { isFreeSkill } from '@ai/core/skills';
import type { Database } from '../db/client';
import { ai101Waitlist } from '../db/schema';
import { groupsOf, normalizeAddress } from './access-groups';

/** The free skills' and templates' pages: a sign-up there earns a free account (D-151). */
export const FREE_GUIDED_PAGES: readonly string[] = GUIDED_PAGES.filter((page) => {
  const id = skillIdOfPage(page);
  return id !== null && (isFreeSkill(id) || isFreeGrokTemplate(id));
});

/** Whether the address signed up on a free skill's page. */
export async function hasFreeSignUp(db: Pick<Database, 'select'>, email: string): Promise<boolean> {
  if (!FREE_GUIDED_PAGES.length) return false;
  const [row] = await db
    .select({ id: ai101Waitlist.id })
    .from(ai101Waitlist)
    .where(and(eq(ai101Waitlist.email, normalizeAddress(email)), inArray(ai101Waitlist.source, [...FREE_GUIDED_PAGES])))
    .limit(1);
  return !!row;
}

/** Whether a link may go to this address before it has an account: a group's, or a free sign-up's. */
export async function selfServeAddress(db: Database, email: string, now: number): Promise<boolean> {
  return (await groupsOf(db, email, now)).length > 0 || (await hasFreeSignUp(db, email));
}
