import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { repo } from '../../data/boot';
import { masquerade } from '../../data/masquerade';
import type { MasqueradeState } from '../../data/masquerade';
import type { Viewer } from '../../data/repository';
import {
  cleanLearnerPrefs,
  learnerSidebar,
  learnerTheme,
  loadPrefs,
  saveLearnerPrefs,
  setLearnerScope,
} from '../../lib/prefs';
import type { LearnerPrefs } from '../../lib/prefs';

// D-185: the learner shell's theme and desktop sidebar, remembered per person.
//
// WHERE THEY LIVE. The API already keeps a person's theme (`users.prefs`, `PATCH /api/me/prefs`, § 7.5),
// and now their sidebar beside it; the device keeps a copy by user id (`lib/prefs.ts`), which is what
// draws the first frame and all there is in fixture mode. On mount the shell reads the API's and, unless
// the person has already chosen in this visit, takes it. Each choice is written to both.
//
// NOT WRITTEN TO THE API: in a staff member's preview tab (its learner is no one) and during a masquerade
// (look only, D-162: the API would refuse it). The device still remembers the choice for that tab.
//
// While mounted the shell is the "learner scope" (`setLearnerScope`): the root's `data-theme`, which the
// design tokens read, follows this person's choice; as it unmounts, the device's own theme comes back, so
// today's portal is drawn exactly as before.

/** The person the choices belong to: the learner, or the staff member looking at the portal. */
export const prefsOwner = (viewer: Viewer): string =>
  viewer.actor.kind === 'learner' ? viewer.actor.userId : viewer.actor.staffId;

/** Whether this tab may store a choice through the API (http mode, a real person, no masquerade). */
export function writesThrough(viewer: Viewer, source: 'fixture' | 'http', mq: MasqueradeState): boolean {
  return source === 'http' && !viewer.preview && mq.status === 'none';
}

/** The masquerade state once the first answer is in. */
function settledMasquerade(): Promise<MasqueradeState> {
  const now = masquerade.get();
  if (now.status !== 'unknown') return Promise.resolve(now);
  return new Promise((resolve) => {
    const off = masquerade.subscribe(() => {
      const st = masquerade.get();
      if (st.status === 'unknown') return;
      off();
      resolve(st);
    });
  });
}

export interface LearnerPrefsApi {
  theme: 'light' | 'dark';
  sidebar: 'full' | 'rail';
  set: (patch: LearnerPrefs) => void;
}

export function useLearnerPrefs(viewer: Viewer): LearnerPrefsApi {
  const owner = prefsOwner(viewer);
  const read = useCallback(() => {
    const p = loadPrefs();
    return { theme: learnerTheme(owner, p), sidebar: learnerSidebar(owner, p) };
  }, [owner]);
  const [state, setState] = useState(read);
  const chosen = useRef(false);

  // The root's theme follows this person while the shell is on screen (before paint, so no flash).
  useLayoutEffect(() => {
    setLearnerScope(owner);
    setState(read());
    return () => setLearnerScope(null);
  }, [owner, read]);

  useEffect(() => {
    const onPrefs = () => setState(read());
    window.addEventListener('ai-prefs', onPrefs);
    return () => window.removeEventListener('ai-prefs', onPrefs);
  }, [read]);

  // What the API keeps for this person, unless they have chosen in this visit already.
  useEffect(() => {
    if (repo.source !== 'http' || viewer.preview) return;
    let live = true;
    Promise.resolve()
      .then(() => repo.prefs())
      .then((stored) => {
        if (!live || chosen.current) return;
        const mine = cleanLearnerPrefs(stored);
        if (mine.theme || mine.sidebar) saveLearnerPrefs(owner, mine);
      })
      .catch(() => {
        /* the device's copy stands */
      });
    return () => {
      live = false;
    };
  }, [owner, viewer.preview]);

  const set = useCallback(
    (patch: LearnerPrefs) => {
      chosen.current = true;
      saveLearnerPrefs(owner, patch);
      if (repo.source !== 'http' || viewer.preview) return;
      void settledMasquerade()
        .then((mq) => (writesThrough(viewer, repo.source, mq) ? repo.savePrefs(cleanLearnerPrefs(patch)) : undefined))
        .catch(() => {
          /* best effort, as the device's preferences are: the device remembers it */
        });
    },
    [owner, viewer],
  );

  return { ...state, set };
}
