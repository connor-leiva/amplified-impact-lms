// The Team Plan window's opener (D-187), on its own so a screen of the first portal drawn inside the learner
// shell (the Resource Vault, D-182) can ask for the window without pulling the shell in. Outside the
// learner shell nothing provides it, `useTeamPlan()` answers null, and that screen behaves as it always has.

import { createContext, useContext } from 'react';

/** What a window is about: an AI employee, a vault item, the Team Hub, or the Team Plan itself. */
export type PlanItem = { kind: 'module'; id: string } | { kind: 'resource'; id: string } | { kind: 'team-hub' } | { kind: 'plan' };

export type OpenTeamPlan = (item: PlanItem) => void;

const TeamPlanContext = createContext<OpenTeamPlan | null>(null);
export const TeamPlanProvider = TeamPlanContext.Provider;

/** Opens the Team Plan window over the page, inside the learner shell; null anywhere else. */
export const useTeamPlan = (): OpenTeamPlan | null => useContext(TeamPlanContext);
