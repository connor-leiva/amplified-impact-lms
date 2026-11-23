// Monthly prices, as of Nov 23, 2026. One module so the pricing change and the skill email
// state the same numbers. Import these names rather than writing the amounts again.

/** Amplified Insiders, the owner and operations membership. */
export const INSIDERS_MONTHLY_PRICE = '$169/Month';

/** Amplified Insiders for Agents. */
export const AGENT_INSIDERS_MONTHLY_PRICE = '$79/Month';

export type SkillSet = 'owner_ops' | 'agent' | 'both';

/**
 * The soft Insiders line on a skill purchase email.
 * An agent skill names Insiders for Agents. An owner and operations skill, or one in both sets,
 * names Insiders.
 */
export function insidersSentence(sets: SkillSet): string {
  if (sets === 'agent') return `Amplified Insiders for Agents unlocks every agent skill for ${AGENT_INSIDERS_MONTHLY_PRICE}.`;
  return `Amplified Insiders unlocks every skill for ${INSIDERS_MONTHLY_PRICE}.`;
}
