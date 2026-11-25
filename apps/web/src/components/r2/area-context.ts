import { createContext, useContext } from 'react';

// D-253 (R-5 Phase 1): a page drawn inside one of the four pages' tabs (the mockup's `AreaCtx`). There it shows its
// title once: the page keeps its description, its status and its actions and drops its own `h1` (`PageHead`), its own
// tabs become a segmented control (`Tabs`, not on a phone), and its column loses its own padding (`Page`).

const AreaContext = createContext(false);

export const AreaProvider = AreaContext.Provider;
export const useInArea = (): boolean => useContext(AreaContext);
