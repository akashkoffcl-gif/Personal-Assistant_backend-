import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-dashed border-[#DAD6E5] ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#F7F5FC] border border-[#EAE7F1] flex items-center justify-center text-[#7653D6] mb-3">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-bold text-[#202033] mb-1">{title}</h4>
      <p className="text-xs text-[#626176] max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
