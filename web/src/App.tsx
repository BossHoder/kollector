import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './contexts/ToastContext';
import { OfflineBanner } from './components/ui/OfflineBanner';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <SocketProvider>
          <OfflineBanner />
          <RouterProvider router={router} />
        </SocketProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
