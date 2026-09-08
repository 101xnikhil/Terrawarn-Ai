import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[200px] border border-dashed border-slate-300 dark:border-white/10 rounded-2xl bg-white dark:bg-[#0c1220]">
      {icon && <div className="text-slate-400 dark:text-slate-500 mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2 tracking-tight">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
