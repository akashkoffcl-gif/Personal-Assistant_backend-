import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-[10px] font-semibold px-2 py-0.5 rounded-full',
    md: 'text-xs font-bold px-2.5 py-1 rounded-full',
  };

  const variantClasses = {
    primary: 'bg-[#7653D6]/10 text-[#7653D6] border border-[#7653D6]/20',
    success: 'bg-[#16A36A]/10 text-[#16A36A] border border-[#16A36A]/20',
    warning: 'bg-[#E5A12B]/10 text-[#B7791F] border border-[#E5A12B]/20',
    danger: 'bg-[#DC4B55]/10 text-[#DC4B55] border border-[#DC4B55]/20',
    info: 'bg-[#3985DB]/10 text-[#3985DB] border border-[#3985DB]/20',
    neutral: 'bg-[#F7F5FC] text-[#626176] border border-[#EAE7F1]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 leading-none select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
