/**
 * ConnectionBanner Component
 *
 * Shows a banner when socket connection is lost or reconnecting
 * Displays at the top of the screen with appropriate status message
 * Can be dismissed by the user
 */

import { useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';

export function ConnectionBanner() {
  const { status } = useSocket();
  const [dismissed, setDismissed] = useState(false);

  // Only show banner for error state (disconnected is normal when logged out)
  // Don't show for 'connecting' or 'disconnected' - only for explicit errors
  if (status === 'connected' || status === 'disconnected' || status === 'connecting') {
    return null;
  }

  // If user dismissed the banner, don't show until status changes
  if (dismissed) {
    return null;
  }

  const bannerConfig = {
    reconnecting: {
      bgColor: 'bg-yellow-500/10 border-yellow-500/30',
      textColor: 'text-yellow-400',
      icon: 'sync',
      iconClass: 'animate-spin',
      message: 'Đang kết nối lại...',
    },
    error: {
      bgColor: 'bg-amber-500/10 border-amber-500/30',
      textColor: 'text-amber-400',
      icon: 'info',
      iconClass: '',
      message: 'Cập nhật realtime tạm thời không khả dụng.',
    },
  };

  const config = bannerConfig[status as keyof typeof bannerConfig];

  if (!config) return null;

  return (
    <div
      className={`fixed top-16 left-0 right-0 z-50 px-4 py-2 border-b ${config.bgColor}`}
      role="alert"
      data-testid="connection-banner"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
        <span
          className={`material-symbols-outlined text-[18px] ${config.textColor} ${config.iconClass}`}
          aria-hidden="true"
        >
          {config.icon}
        </span>
        <span className={`text-sm font-medium ${config.textColor}`}>
          {config.message}
        </span>
        <button
          onClick={() => setDismissed(true)}
          className={`ml-2 ${config.textColor} hover:opacity-70 transition-opacity`}
          aria-label="Đóng"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}
