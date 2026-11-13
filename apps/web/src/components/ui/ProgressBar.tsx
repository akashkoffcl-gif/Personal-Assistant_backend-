import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  className = '',
  ariaLabel = 'Progress',
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantColors = {
    primary: 'bg-[#7653D6]',
    success: 'bg-[#16A36A]',
    warning: 'bg-[#E5A12B]',
    danger: 'bg-[#DC4B55]',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-[#626176] mb-1">
          <span>{ariaLabel}</span>
          <span>{clampedValue}%</span>
        </div>
      )}
      <div
        className={`w-full bg-[#EAE7F1] rounded-full overflow-hidden ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className={`${variantColors[variant]} h-full rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};
