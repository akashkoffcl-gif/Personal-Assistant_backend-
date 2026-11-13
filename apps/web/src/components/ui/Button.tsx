import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7653D6] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px] min-w-[44px]';

    const sizeClasses = {
      sm: 'text-xs px-3 py-2 gap-1.5 min-h-[44px]',
      md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
      lg: 'text-base px-6 py-3 gap-2.5 min-h-[48px]',
    };

    const variantClasses = {
      primary:
        'bg-[#7653D6] text-white hover:bg-[#6742C5] active:bg-[#5636A9] shadow-[0_2px_8px_rgba(118,83,214,0.25)]',
      secondary:
        'bg-[#FFFFFF] text-[#202033] border border-[#EAE7F1] hover:bg-[#F7F5FC] hover:border-[#DAD6E5] active:bg-[#EAE7F1]',
      danger:
        'bg-[#DC4B55] text-white hover:bg-[#C4384E] active:bg-[#A92A3E] shadow-[0_2px_8px_rgba(220,75,85,0.25)]',
      ghost:
        'bg-transparent text-[#202033] hover:bg-[#F7F5FC] hover:text-[#7653D6]',
      outline:
        'bg-transparent border border-[#7653D6] text-[#7653D6] hover:bg-[#7653D6]/10 active:bg-[#7653D6]/20',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
