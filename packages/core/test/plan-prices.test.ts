import { describe, expect, it } from 'vitest';
import { AGENT_INSIDERS_MONTHLY_PRICE, INSIDERS_MONTHLY_PRICE, insidersSentence, skillUpsellBody } from '../src/plan-prices';

describe('plan prices', () => {
  it('names Insiders for Agents on an agent skill, and Insiders on the others', () => {
    expect(insidersSentence('agent')).toBe(`Amplified Insiders for Agents unlocks every agent skill for ${AGENT_INSIDERS_MONTHLY_PRICE}.`);
    expect(insidersSentence('owner_ops')).toBe(`Amplified Insiders unlocks every skill for ${INSIDERS_MONTHLY_PRICE}.`);
    expect(insidersSentence('both')).toBe(insidersSentence('owner_ops'));
    expect(AGENT_INSIDERS_MONTHLY_PRICE).toBe('$79/Month');
    expect(INSIDERS_MONTHLY_PRICE).toBe('$169/Month');
    expect(skillUpsellBody('Team P&L Review', 'owner_ops')).toBe(
      'Team P&L Review is one skill in the library. Amplified Insiders opens all of them for $169/Month, so the next job you want AI to handle already has a skill waiting.',
    );
    expect(skillUpsellBody('Team P&L Review', 'both')).toBe(skillUpsellBody('Team P&L Review', 'owner_ops'));
    expect(skillUpsellBody('Appointment Follow-Up', 'agent')).toBe(
      'Appointment Follow-Up is one agent skill in the library. Amplified Insiders for Agents opens every agent skill for $79/Month, so the next job you want AI to handle already has a skill waiting.',
    );
  });
});
