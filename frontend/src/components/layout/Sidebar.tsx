import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Radio, Map, Handshake, Briefcase, 
  Settings, Bell, Shield, Cpu, Flame, Layers, GitFork,
  Camera
} from 'lucide-react';
import clsx from 'clsx';
import ThemeToggle from '../common/ThemeToggle';
import { useI18n } from '../../i18n/LanguageContext';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const { t } = useI18n();

  const navItems = [
    { name: t('NAV_METRICS'), path: '/', icon: LayoutDashboard, tooltip: t('NAV_METRICS') },
    { name: t('NAV_STATION_TELEMETRY'), path: '/sensor', icon: GitFork, tooltip: t('NAV_STATION_TELEMETRY') },
    { name: t('NAV_GEOSPATIAL_GIS'), path: '/map', icon: Map, tooltip: t('NAV_GEOSPATIAL_GIS') },
    { name: t('NAV_FIELD_REPORTS'), path: '/reports', icon: Camera, tooltip: t('NAV_FIELD_REPORTS') },
    { name: t('NAV_ALERTS'), path: '/alerts', icon: Bell, tooltip: t('NAV_ALERTS') },
    { name: t('NAV_ANALYTICS'), path: '/analytics', icon: Handshake, tooltip: t('NAV_ANALYTICS') },
    { name: t('NAV_ABOUT'), path: '/about', icon: Briefcase, tooltip: t('NAV_ABOUT') },
  ];

  const isSettingsActive = location.pathname === '/settings';
  const isAlertsActive = location.pathname === '/alerts';

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 z-40 h-screen transition-transform bg-white/88 dark:bg-[#0f172a]/88 backdrop-blur-xl border-r border-[#e2e8f0] dark:border-white/[0.07] flex flex-col justify-between items-center py-5',
        'w-16 sm:w-16',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Top Logo */}
      <div className="flex flex-col items-center gap-6 w-full">
        <Link to="/" className="group p-1" title={t('FOOTER_BRAND')}>
          <div className="w-9 h-9 rounded-xl bg-[#253DA1] dark:bg-[#2563eb] flex items-center justify-center shadow-[0_8px_16px_-10px_rgba(37,61,161,0.7)] group-hover:scale-[1.04] transition-transform duration-150">
            <span className="font-extrabold text-[13px] text-white tracking-tighter">TW</span>
          </div>
        </Link>

        {/* Navigation Icons */}
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onToggle()}
                title={item.tooltip}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'w-10 h-10 rounded-[11px] flex items-center justify-center transition-all duration-150 relative group',
                  isActive
                    ? 'bg-[#2563eb] text-white shadow-[0_8px_18px_-10px_rgba(37,99,235,0.9)]'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                )}
              >
                {isActive && (
                  <span className="absolute -left-[9px] w-[3px] h-5 rounded-full bg-[#2563eb] dark:bg-[#60a5fa]" />
                )}
                <Icon className="w-5 h-5 stroke-[2]" />
                
                {/* Tooltip on hover */}
                <span className="nav-tooltip absolute left-14 bg-[#0b1220] dark:bg-[#121a2b] text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap z-50 shadow-lg border border-white/10">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Icons (Theme Toggle, Settings, Notification Bell, User Avatar) */}
      <div className="flex flex-col items-center gap-2.5 w-full px-2">
        <ThemeToggle className="w-10 h-10 rounded-xl" />

        <Link
          to="/settings"
          title={t('NAV_SETTINGS')}
          aria-current={isSettingsActive ? 'page' : undefined}
          className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
            isSettingsActive
              ? 'bg-[#2563eb] text-white shadow-[0_10px_20px_-10px_rgba(37,99,235,0.95)]'
              : 'text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06]'
          )}
        >
          <Settings className="w-5 h-5 stroke-[1.8]" />
        </Link>

        <Link
          to="/alerts"
          title={t('NAV_ALERTS_CENTER')}
          aria-current={isAlertsActive ? 'page' : undefined}
          className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative',
            isAlertsActive
              ? 'bg-[#2563eb] text-white shadow-[0_10px_20px_-10px_rgba(37,99,235,0.95)]'
              : 'text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06]'
          )}
        >
          <Bell className="w-5 h-5 stroke-[1.8]" />
          <span className="w-2 h-2 rounded-full bg-[#ef4444] absolute top-2 right-2 ring-2 ring-white dark:ring-[#0c1220]" />
        </Link>

        {/* User Avatar Circle */}
        <div 
          className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer shadow-sm"
          title="Terrawarn-Ai Operator"
        >
          <span>TW</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
