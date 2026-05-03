/**
 * React Router v7 configuration
 *
 * Routes structure:
 * - Public routes: /login, /register
 * - Protected routes: /app/* (requires authentication)
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AdminRoute } from '@/components/layout/AdminRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';

// Lazy load pages to improve initial bundle size
import { lazy, Suspense } from 'react';

// Page loading fallback
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">Đang tải trang...</p>
      </div>
    </div>
  );
}

// Lazy loaded pages - will be created in later phases
const LoginPage = lazy(() =>
  import('@/pages/public/LoginPage').then(m => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('@/pages/public/RegisterPage').then(m => ({ default: m.RegisterPage }))
);
const AssetsPage = lazy(() =>
  import('@/pages/app/AssetsPage').then(m => ({ default: m.AssetsPage }))
);
const AssetDetailPage = lazy(() =>
  import('@/pages/app/AssetDetailPage').then(m => ({ default: m.AssetDetailPage }))
);
const UploadPage = lazy(() =>
  import('@/pages/app/UploadPage').then(m => ({ default: m.UploadPage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/app/SettingsPage').then(m => ({ default: m.SettingsPage }))
);
const HomePage = lazy(() =>
  import('@/pages/public/HomePage').then(m => ({ default: m.HomePage }))
);
const AdminOverviewPage = lazy(() =>
  import('@/pages/admin/AdminOverviewPage').then(m => ({ default: m.AdminOverviewPage }))
);
const AdminSubscriptionsPage = lazy(() =>
  import('@/pages/admin/AdminSubscriptionsPage').then(m => ({ default: m.AdminSubscriptionsPage }))
);
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage }))
);
const AdminOperationsPage = lazy(() =>
  import('@/pages/admin/AdminOperationsPage').then(m => ({ default: m.AdminOperationsPage }))
);

// Wrap lazy components with Suspense
function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // Public routes
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/login',
        element: withSuspense(LoginPage),
      },
      {
        path: '/register',
        element: withSuspense(RegisterPage),
      },
    ],
  },

  // Protected app routes
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: withSuspense(AssetsPage),
      },
      {
        path: 'assets/:assetId',
        element: withSuspense(AssetDetailPage),
      },
      {
        path: 'upload',
        element: withSuspense(UploadPage),
      },
      {
        path: 'settings',
        element: withSuspense(SettingsPage),
      },
    ],
  },

  // Protected admin routes
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: withSuspense(AdminOverviewPage),
      },
      {
        path: 'subscriptions',
        element: withSuspense(AdminSubscriptionsPage),
      },
      {
        path: 'users',
        element: withSuspense(AdminUsersPage),
      },
      {
        path: 'operations',
        element: withSuspense(AdminOperationsPage),
      },
    ],
  },

  // Root redirect
  {
    path: '/',
    element: withSuspense(HomePage),
  },

  // Catch-all redirect to login
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
