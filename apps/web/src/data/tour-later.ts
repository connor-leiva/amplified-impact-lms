// D-252: the LMS tour's Watch Later, for this browser session only. Nothing is sent: the key lives in sessionStorage,
// so the tour opens again in a new tab or browser session, and Sign Out clears it (`session.ts`), so it opens again on
// the next sign-in in the same tab. Storage that throws (a private window, blocked site data) reads as "not pressed".

/** The key for one learner: `ai:lms-tour:later:<userId>`. */
export const TOUR_LATER_PREFIX = 'ai:lms-tour:later:';
export const tourLaterKey = (userId: string): string => `${TOUR_LATER_PREFIX}${userId}`;

/** Whether this learner pressed Watch Later in this browser session. */
export function tourLater(userId: string): boolean {
  try {
    return sessionStorage.getItem(tourLaterKey(userId)) === '1';
  } catch {
    return false;
  }
}

/** Watch Later: remember it for the rest of this browser session. */
export function setTourLater(userId: string): void {
  try {
    sessionStorage.setItem(tourLaterKey(userId), '1');
  } catch {
    /* storage refused: the tour stays closed for this page load only */
  }
}

/** Sign Out: forget every learner's Watch Later in this tab. */
export function forgetTourLater(): void {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(TOUR_LATER_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    /* nothing stored, nothing to forget */
  }
}
