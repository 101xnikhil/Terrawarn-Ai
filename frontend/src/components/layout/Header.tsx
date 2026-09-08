import React, { useState } from 'react';
import { Menu, Calendar, ChevronDown, Bell, Radio, FlaskConical, Cpu, Layers, Wifi, WifiOff, CloudUpload } from 'lucide-react';
import clsx from 'clsx';
import { useMockTelemetry } from '../../hooks/useMockTelemetry';
import ThemeToggle from '../common/ThemeToggle';
import LanguageSwitcher from '../../i18n/LanguageSwitcher';
import { useOfflineSync } from '../../utils/offlineSync';
import { useI18n } from '../../i18n/LanguageContext';

interface HeaderProps {
  title: string;
  alertCount: number;
  isConnected: boolean;
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, alertCount, isConnected, onMenuToggle }) => {
  const { mode, setMode, state } = useMockTelemetry();
  const { isOnline, pendingCount, triggerManualSync } = useOfflineSync();
  const { t } = useI18n();
  const [selectedAggregate, setSelectedAggregate] = useState<'node' | 'selected'>('selected');
  const [selectedTeam, setSelectedTeam] = useState('All sectors (2)');

  return (
    <header className="sticky top-0 z-30 glass-bar pt-3 pb-2 px-4 sm:px-6 lg:px-8 transition-all">
      <div className="max-w-[1600px] w-full mx-auto flex flex-col">
      {/* Primary Top Row: Title on Left, All Controls on the Same Line on Right */}
      <div className="flex items-start sm:items-center justify-between gap-4 w-full">
        {/* Left: Mobile Toggle + Huge Bold Page Title */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onMenuToggle}
            className="lg:hidden text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus:outline-none p-2 rounded-xl bg-white dark:bg-[#0c1220] border border-[#e4e8ef] dark:border-white/10 shadow-sm"
            aria-label={t('TOGGLE_NAV')}
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="text-2xl sm:text-3xl font-black text-[#0b1220] dark:text-white tracking-tight shrink-0">
            {title}
          </h1>
        </div>

        {/* Right Controls - All in the exact same horizontal line */}
        <div className="flex items-center justify-end flex-wrap gap-2 sm:gap-2.5 font-sans text-xs min-w-0">
          {/* Offline / Low Network Sync Status */}
          <button
            onClick={() => {
              if (pendingCount > 0) {
                triggerManualSync();
              }
            }}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-xs",
              !isOnline
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                : pendingCount > 0
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 cursor-pointer"
                  : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            )}
            title={!isOnline ? "Low Network Mode: Local Buffer Active" : pendingCount > 0 ? "Click to Sync Pending Reports" : "Cloud Synchronized"}
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">{t('HEADER_OFFLINE')}</span>
                {pendingCount > 0 && <span className="px-1.5 py-0.2 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white rounded-full text-[10px] font-mono font-bold">{pendingCount}</span>}
              </>
            ) : pendingCount > 0 ? (
              <>
                <CloudUpload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
                <span className="hidden sm:inline">{t('HEADER_SYNC')} ({pendingCount})</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">{t('HEADER_ONLINE')}</span>
              </>
            )}
          </button>

          {/* Teams / Sector Dropdown */}
          <div className="hidden md:flex items-center gap-1.5 text-slate-600 dark:text-slate-200 font-semibold">
            <span>{t('HEADER_SECTOR')}</span>
            <div className="relative">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="appearance-none bg-white dark:bg-[#0c1220] border border-[#e4e8ef] dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-100 font-semibold py-1.5 pl-3 pr-7 rounded-xl cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
              >
                <option value="All sectors (2)">{t('HEADER_ALL_SECTORS')}</option>
                <option value="Sector 7 (Shimla NH-5)">{t('HEADER_SECTOR_SHIMLA')}</option>
                <option value="Wayanad Scarp Zone">{t('HEADER_SECTOR_WAYANAD')}</option>
                <option value="Konkan Ghat Section">{t('HEADER_SECTOR_KONKAN')}</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Aggregate by Segmented Control */}
          <div className="hidden lg:flex items-center gap-1.5 text-slate-600 dark:text-slate-200 font-semibold">
            <span>{t('HEADER_AGGREGATE')}</span>
            <div className="segmented-control">
              <button
                onClick={() => setSelectedAggregate('node')}
                className={clsx(
                  'segmented-item',
                  selectedAggregate === 'node' ? 'segmented-item-active' : 'hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {t('HEADER_NODE')}
              </button>
              <button
                onClick={() => setSelectedAggregate('selected')}
                className={clsx(
                  'segmented-item',
                  selectedAggregate === 'selected' ? 'segmented-item-active' : 'hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {t('HEADER_SELECTED_NODES')}
              </button>
            </div>
          </div>

          {/* Date Range Pill */}
          <div className="hidden xl:flex items-center gap-2 bg-white dark:bg-[#0c1220] border border-[#e4e8ef] dark:border-white/10 px-3 py-1.5 rounded-xl font-medium text-slate-700 dark:text-slate-100 shadow-sm text-xs">
            <span>01/01/2026 - 28/08/2026</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Mode Selector Pill (Same line as all other controls) */}
          <div className="flex items-center bg-white dark:bg-[#0c1220] border border-[#e4e8ef] dark:border-white/10 p-0.5 rounded-xl shadow-xs">
            <button
              onClick={() => setMode('DEMO')}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                mode === 'DEMO' ? 'bg-[#2563eb] text-white shadow-xs' : 'text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
              )}
            >
              {t('HEADER_LAB_SIM')}
            </button>
            <button
              onClick={() => setMode('HARDWARE')}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                mode === 'HARDWARE' ? 'bg-[#ef4444] text-white shadow-xs' : 'text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
              )}
            >
              {t('HEADER_ESP32')}
            </button>
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle />
        </div>
      </div>

      {/* Multilingual Selector - Placed down below on the right */}
      <div className="flex justify-end pt-2 pb-0.5 pr-0.5">
        <LanguageSwitcher />
      </div>
      </div>
    </header>
  );
};

export default Header;
