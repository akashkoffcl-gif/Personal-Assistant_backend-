import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'interactive' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseClasses = 'rounded-2xl transition-all duration-200';

    const variantClasses = {
      default: 'bg-white border border-[#EAE7F1] shadow-[0_4px_16px_-2px_rgba(32,32,51,0.04)]',
      subtle: 'bg-[#F7F5FC] border border-[#EAE7F1]',
      interactive:
        'bg-white border border-[#EAE7F1] shadow-[0_4px_16px_-2px_rgba(32,32,51,0.04)] hover:border-[#DAD6E5] hover:shadow-[0_8px_24px_-4px_rgba(86,54,169,0.08)] hover:-translate-y-0.5 cursor-pointer',
      elevated: 'bg-white border border-[#DAD6E5] shadow-[0_12px_32px_-4px_rgba(32,32,51,0.08)]',
    };

    const paddingClasses = {
      none: 'p-0',
      sm: 'p-3 sm:p-4',
      md: 'p-4 sm:p-5',
      lg: 'p-6 sm:p-8',
    };

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
