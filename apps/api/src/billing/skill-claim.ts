// An email-keyed skill purchase becomes the signed-in learner's row. Sign-in calls this. A purchase
// that learner already holds is left for the email row to stay, so the unique pair is not broken.

import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { skillPurchases, users } from '../db/schema';

export async function claimSkillPurchases(db: Database, userId: string): Promise<number> {
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const email = user?.email.trim().toLowerCase();
  if (!email) return 0;
  const updated = await db
    .update(skillPurchases)
    .set({ userId })
    .where(
      and(
        isNull(skillPurchases.userId),
        sql`lower(${skillPurchases.email}) = ${email}`,
        sql`not exists (select 1 from ${skillPurchases} owned where owned.user_id = ${userId} and owned.skill_id = ${skillPurchases.skillId})`,
      ),
    )
    .returning({ id: skillPurchases.id });
  return updated.length;
}
