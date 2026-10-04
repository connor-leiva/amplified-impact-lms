import './styles/fonts';
import './styles/tokens.css';
import './styles/global.css';

import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { bootPrefs } from './lib/prefs';
import './data/boot'; // chooses the data source before anything renders

bootPrefs();

// The snapshot is the app's single server state. It never goes stale on its own: the repository
// pushes changes (cross-tab storage in fixture mode, SSE in http mode) and the hook invalidates.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
);
