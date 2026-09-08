import React from 'react';
import { ShieldCheck, Shield, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { RiskLevel } from '../../types';
import { useI18n } from '../../i18n/LanguageContext';
import type { UIStringKey } from '../../i18n/strings';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

const RISK_LABEL: Record<RiskLevel, UIStringKey> = {
  LOW: 'RISK_LOW',
  MODERATE: 'RISK_MODERATE',
  HIGH: 'RISK_HIGH',
  CRITICAL: 'RISK_CRITICAL',
};

const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md' }) => {
  const { t } = useI18n();
  const getIcon = () => {
    switch (level) {
      case 'LOW':
        return ShieldCheck;
      case 'MODERATE':
        return Shield;
      case 'HIGH':
      case 'CRITICAL':
        return ShieldAlert;
      default:
        return Shield;
    }
  };

  const Icon = getIcon();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] space-x-1',
    md: 'px-2.5 py-1 text-xs space-x-1.5',
    lg: 'px-3 py-1.5 text-sm space-x-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const badgeClass = `badge-${level.toLowerCase()}`;

  return (
    <div className={clsx('inline-flex items-center font-bold rounded-full border', sizeClasses[size], badgeClass)}>
      <Icon className={iconSizes[size]} />
      <span>{t(RISK_LABEL[level] || 'RISK_LOW')}</span>
    </div>
  );
};

export default RiskBadge;
