// A replay's saved playback position (SCREENS § 3.2): `localStorage['ai-lms-pos-' + moduleId]`, the
// prototype's key. Moved here from `routes/portal/EmployeeDetail.tsx` unchanged (D-183), so the learner
// portal v2's week page saves and restores the same position as the AI Employee page, every 5 seconds of
// playback and on page hide. Best effort: blocked storage starts from the top and saves nothing.

/** Every engine tick is 250 ms, so 20 of them is the 5 s the position-save interval asks for. */
export const SAVE_EVERY = 20;

export const posKey = (id: string) => `ai-lms-pos-${id}`;

export function loadPos(id: string): number {
  try {
    return Number(localStorage.getItem(posKey(id))) || 0;
  } catch {
    return 0; // private mode, blocked storage — start from the top
  }
}

export function savePos(id: string, t: number): void {
  try {
    localStorage.setItem(posKey(id), String(Math.floor(t)));
  } catch {
    /* best-effort, exactly as the prototype treats it */
  }
}
