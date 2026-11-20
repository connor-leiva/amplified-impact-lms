import './styles/fonts';
import './styles/tokens.css';
import './styles/global.css';
import './styles/polish.css'; // D-203: button hover and focus, after the generated link rule
import './styles/lms.css'; // D-156: the LMS's type and tap targets, never www's

import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { bootPrefs } from './lib/prefs';
import { isFixture } from './data/boot'; // chooses the data source before anything renders
import { guardRestoredPages, onSignOut } from './data/session';
import { installStaleChunkRecovery, routerDestination } from './lib/stale-chunk';
import { RateLimitedError } from './data/http';

// D-170: a tab opened before a deploy reloads once when a screen's file is gone, instead of showing
// "Unexpected Application Error!" (`lib/stale-chunk.ts`), and lands on the screen it was opening.
// Vite's `vite:preloadError` arrives in a later task than this line, so the router's first lazy load,
// started as `./router` was imported, is covered.
installStaleChunkRecovery({ navigatingTo: () => routerDestination(router) });

bootPrefs();

// The snapshot is the app's single server state. It never goes stale on its own: the repository
// pushes changes (cross-tab storage in fixture mode, SSE in http mode) and the hook invalidates.
// D-224: a 429 is retried up to three times after the wait the limiter names (`RateLimitedError`), so a busy
// minute delays a page instead of crashing it; anything else is retried once, as before.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: (failures, error) => (error instanceof RateLimitedError ? failures < 3 : failures < 1),
      retryDelay: (attempt, error) => (error instanceof RateLimitedError ? Math.min(error.retryAfterMs, 30_000) : Math.min(1000 * 2 ** attempt, 30_000)),
    },
  },
});

const root = createRoot(document.getElementById('root')!);

// D-152: Sign Out forgets the viewer in this page before it leaves for /sign-in. Unmounting first
// means nothing is left watching the cache, so emptying it starts no request, and no signed-in screen
// stays in a page the back-forward cache keeps.
onSignOut(() => {
  root.unmount();
  queryClient.clear();
});
// A signed-in page Back brings out of that cache is shown again only once the session is still live.
// http mode only: fixture mode has no session to ask about.
if (!isFixture) guardRestoredPages();

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
);
