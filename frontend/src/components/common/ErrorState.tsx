import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n/LanguageContext';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ title = 'Error', message, onRetry }) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[200px] bg-red-50/70 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-500/20">
      <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-white dark:bg-[#121a2b] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-medium transition-colors border border-slate-200 dark:border-white/10"
        >
          {t('TRY_AGAIN')}
        </button>
      )}
    </div>
  );
};

export default ErrorState;
