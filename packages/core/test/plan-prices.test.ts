import { describe, expect, it } from 'vitest';
import { AGENT_INSIDERS_MONTHLY_PRICE, INSIDERS_MONTHLY_PRICE, insidersSentence } from '../src/plan-prices';

describe('plan prices', () => {
  it('names Insiders for Agents on an agent skill, and Insiders on the others', () => {
    expect(insidersSentence('agent')).toBe(`Amplified Insiders for Agents unlocks every agent skill for ${AGENT_INSIDERS_MONTHLY_PRICE}.`);
    expect(insidersSentence('owner_ops')).toBe(`Amplified Insiders unlocks every skill for ${INSIDERS_MONTHLY_PRICE}.`);
    expect(insidersSentence('both')).toBe(insidersSentence('owner_ops'));
    expect(AGENT_INSIDERS_MONTHLY_PRICE).toBe('$79/Month');
    expect(INSIDERS_MONTHLY_PRICE).toBe('$169/Month');
  });
});
