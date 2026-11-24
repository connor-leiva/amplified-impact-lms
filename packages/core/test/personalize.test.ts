import { describe, expect, it } from 'vitest';
import { conditionMet, isBothAnswer } from '../src/checklist';
import { prefillStack } from '../src/stack';
import { autoCheckItems, operatorItems, pathFromAnswers } from '../src/personalize';

const answers = {
  operator: "I'm both",
  ai: 'ChatGPT',
  plan: 'Claude Team',
  google: 'No',
};

describe('intake conditions (D-199)', () => {
  it('hides when the operator is both, and leaves an unknown field alone', () => {
    expect(conditionMet({ field: 'operator', equals: 'both' }, answers)).toBe(true);
    expect(conditionMet({ field: 'operator', equals: 'both' }, { operator: 'both' })).toBe(true);
    expect(conditionMet({ field: 'operator', equals: 'both' }, { operator: 'A teammate' })).toBe(false);
    expect(conditionMet({ field: 'operator', equals: 'both' }, { operator: 'I’m both' })).toBe(true);
    expect(conditionMet({ field: 'operator', equals: 'both' }, { operator: " I'M BOTH " })).toBe(true);
    expect(isBothAnswer("I'm both")).toBe(true);
    expect(isBothAnswer('I am')).toBe(false);
    expect(isBothAnswer(['I’m both'])).toBe(false);
    expect(isBothAnswer(undefined)).toBe(false);
    expect(conditionMet({ field: 'nope', equals: 'Yes' }, answers)).toBe(false);
    expect(conditionMet({ field: 'ai', equals: 'ChatGPT' }, undefined)).toBe(false);
    expect(conditionMet(undefined, answers)).toBe(false);
  });

  it('collapses a team plan and checks that item, and checks accept once an operator has joined', () => {
    const steps = [
      {
        moduleId: 'accelerator-week-0',
        id: 'c1',
        paths: {
          claude: {
            blocks: [
              { type: 'check' as const, id: 's1-invite', title: 'Invite', hideIf: { field: 'operator', equals: 'both' } },
              { type: 'check' as const, id: 's1-accept', title: 'Accept', role: 'operator' as const },
              { type: 'check' as const, id: 's1-plan', title: 'Plan', collapseIf: { field: 'plan', equals: 'Claude Team' }, collapsedNote: 'Covered.' },
              { type: 'callout' as const, kind: 'heads_up' as const, text: 'Not on Google.', showIf: { field: 'google', equals: 'No' } },
            ],
          },
        },
      },
    ];
    expect(autoCheckItems(steps, answers, true).map((row) => row.itemId)).toEqual(['s1-accept', 's1-plan']);
    expect(autoCheckItems(steps, {}, false)).toEqual([]);
    expect(autoCheckItems(steps, { plan: 'ChatGPT Business' }, false).map((row) => row.itemId)).toEqual([]);
    const business = [{ ...steps[0]!, paths: { claude: { blocks: [{ type: 'check' as const, id: 's1-plan', title: 'Plan', collapseIf: { field: 'plan', equals: 'ChatGPT Business' } }] } } }];
    expect(autoCheckItems(business, { plan: 'ChatGPT Business' }, false).map((row) => row.itemId)).toEqual(['s1-plan']);
    expect(operatorItems(steps).map((row) => row.itemId)).toEqual(['s1-accept']);
  });

  it('defaults the path from the intake, and a saved choice wins', () => {
    expect(pathFromAnswers('ChatGPT', undefined)).toBe('chatgpt');
    expect(pathFromAnswers('Claude', undefined)).toBe('claude');
    expect(pathFromAnswers('ChatGPT', 'claude')).toBe('claude');
    expect(pathFromAnswers('Something else', undefined)).toBeNull();
  });

  it('maps the intake onto the stack card the same way the card does', () => {
    const content = {
      exampleLabel: 'Made up',
      exampleTeam: 'Northline Realty',
      example: [],
      sources: [
        { id: 'books', name: 'Books', green: 'Connected', yellow: 'Export' },
        { id: 'closings', name: 'Closings', green: 'Connected', yellow: 'Export' },
        { id: 'leads', name: 'Leads', green: 'Connected', yellow: 'Export' },
        { id: 'email', name: 'Email', green: 'Google', yellow: 'Another path' },
      ],
    };
    const rows = prefillStack(content, { books: 'QuickBooks Online', sisu: 'Yes, admin', crm: 'Follow Up Boss', google: 'Yes' });
    expect(rows.find((row) => row.source === 'Books')).toMatchObject({ tool: 'QuickBooks Online' });
    expect(rows.find((row) => row.source === 'Closings')?.tool).toBe('Yes, admin');
    expect(rows.find((row) => row.source === 'Leads')?.tool).toBe('Follow Up Boss');
    expect(rows.find((row) => row.source === 'Email')).toMatchObject({ plan: 'green' });
  });
});
