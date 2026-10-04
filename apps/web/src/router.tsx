import { createBrowserRouter, Navigate } from 'react-router';

const devRoutes = import.meta.env.DEV || import.meta.env.VITE_ENABLE_STATES === 'true';

// Phase 04 adds AppShell and every portal/admin route beneath it; phase 07 adds /sign-in and
// /invite/:token. Only the routes that exist are mounted, so there is never placeholder UI.
export const router = createBrowserRouter([
  ...(devRoutes
    ? [
        { path: '/__tokens', lazy: () => import('./routes/__tokens') },
        { path: '*', element: <Navigate to="/__tokens" replace /> },
      ]
    : [{ path: '*', element: null }]),
]);
