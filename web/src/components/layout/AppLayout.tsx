/**
 * AppLayout component
 *
 * Layout for authenticated app pages
 * - Full header with navigation
 * - Connection status banner
 * - Main content area
 * - Toast container
 */

import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { ConnectionBanner } from './ConnectionBanner';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/contexts/ToastContext';

export function AppLayout() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="min-h-screen flex flex-col bg-background-dark text-white antialiased">
      <Header />
      <ConnectionBanner />

      {/* Main Content */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
