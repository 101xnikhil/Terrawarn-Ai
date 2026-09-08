import React from 'react';
import { Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n/LanguageContext';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message }) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center p-8 h-full min-h-[220px]">
      <div className="w-12 h-12 rounded-2xl border border-[#e4e8ef] dark:border-white/10 bg-white dark:bg-[#0c1220] shadow-card dark:shadow-card-dark flex items-center justify-center mb-4">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{message ?? t('LOADING')}</p>
    </div>
  );
};

export default LoadingState;
