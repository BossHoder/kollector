/**
 * ProcessingOverlay component
 *
 * Overlay shown when an asset is being processed by AI
 * Displays a pulsing animation and status message
 */

interface ProcessingOverlayProps {
  /** Status message to display */
  message?: string;
  /** Whether to show a full-screen overlay */
  fullScreen?: boolean;
}

export function ProcessingOverlay({
  message = 'Đang phân tích...',
  fullScreen = false,
}: ProcessingOverlayProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      {/* Pulsing animation */}
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>

      {/* AI Icon */}
      <span className="material-symbols-outlined text-4xl text-primary animate-pulse">
        auto_awesome
      </span>

      {/* Message */}
      <p className="text-white font-medium text-center">{message}</p>

      {/* Sub-message */}
      <p className="text-text-secondary text-sm text-center max-w-xs">
        AI đang phân tích hình ảnh của bạn. Quá trình này có thể mất vài giây.
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background-dark/90 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-surface-dark/90 backdrop-blur-sm flex items-center justify-center rounded-xl">
      {content}
    </div>
  );
}
