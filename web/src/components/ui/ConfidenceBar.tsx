/**
 * ConfidenceBar component
 *
 * Visual indicator for AI confidence scores
 * Shows a filled bar with percentage label
 */

interface ConfidenceBarProps {
  /** Confidence value between 0 and 1 */
  value: number;
  /** Optional label to display */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage text */
  showPercentage?: boolean;
  /** Color variant based on confidence level */
  colorByValue?: boolean;
}

export function ConfidenceBar({
  value,
  label,
  size = 'md',
  showPercentage = true,
  colorByValue = true,
}: ConfidenceBarProps) {
  // Clamp value between 0 and 1
  const normalizedValue = Math.min(1, Math.max(0, value));
  const percentage = Math.round(normalizedValue * 100);

  // Determine color based on confidence level
  const getColor = () => {
    if (!colorByValue) return 'bg-primary';
    
    if (normalizedValue >= 0.8) return 'bg-green-500';
    if (normalizedValue >= 0.6) return 'bg-yellow-500';
    if (normalizedValue >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className="text-sm text-text-secondary min-w-[80px]">{label}</span>
      )}
      
      <div className="flex-1 flex items-center gap-2">
        <div
          className={`flex-1 bg-[#111817] rounded-full overflow-hidden ${sizeClasses[size]}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {showPercentage && (
          <span className="text-sm font-medium text-white min-w-[40px] text-right">
            {percentage}%
          </span>
        )}
      </div>
    </div>
  );
}
