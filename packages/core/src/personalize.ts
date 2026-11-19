// D-199: what the team's intake does to a week. No intake, or a field the intake does not
// have, changes nothing. The rules are the course's own hideIf, collapseIf and showIf.

import { conditionMet } from './checklist';
import type { PathBlock } from './course-types';

export const ACCEPT_ITEM_ID = 's1-accept';

export interface PersonalStep {
  moduleId: string;
  id: string;
  paths?: { claude?: { blocks: readonly PathBlock[] }; chatgpt?: { blocks: readonly PathBlock[] } };
}

function blocksOf(step: PersonalStep): readonly PathBlock[] {
  return [...(step.paths?.claude?.blocks ?? []), ...(step.paths?.chatgpt?.blocks ?? [])];
}

/** Items a saved intake or a joined operator checks on their own. */
export function autoCheckItems(
  steps: readonly PersonalStep[],
  answers: Readonly<Record<string, string | string[]>> | undefined,
  operatorJoined: boolean,
): { moduleId: string; stepId: string; itemId: string }[] {
  const out: { moduleId: string; stepId: string; itemId: string }[] = [];
  const seen = new Set<string>();
  for (const step of steps) {
    for (const block of blocksOf(step)) {
      if (block.type !== 'check') continue;
      const hit = (operatorJoined && block.id === ACCEPT_ITEM_ID) || conditionMet(block.collapseIf, answers);
      const key = `${step.moduleId}:${step.id}:${block.id}`;
      if (!hit || seen.has(key)) continue;
      seen.add(key);
      out.push({ moduleId: step.moduleId, stepId: step.id, itemId: block.id });
    }
  }
  return out;
}

/** Operator-role items, so the owner can be shown that person's count and nothing else. */
export function operatorItems(steps: readonly PersonalStep[]): { moduleId: string; stepId: string; itemId: string }[] {
  const out: { moduleId: string; stepId: string; itemId: string }[] = [];
  const seen = new Set<string>();
  for (const step of steps) {
    for (const block of blocksOf(step)) {
      if (block.type !== 'check' || block.role !== 'operator') continue;
      const key = `${step.moduleId}:${step.id}:${block.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ moduleId: step.moduleId, stepId: step.id, itemId: block.id });
    }
  }
  return out;
}

/** A remembered path wins. Otherwise the intake's AI, when it names Claude or ChatGPT. */
export function pathFromAnswers(ai: unknown, saved: unknown): 'claude' | 'chatgpt' | null {
  if (saved === 'claude' || saved === 'chatgpt') return saved;
  if (ai === 'ChatGPT') return 'chatgpt';
  if (ai === 'Claude') return 'claude';
  return null;
}
