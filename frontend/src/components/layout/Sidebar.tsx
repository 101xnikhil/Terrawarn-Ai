import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart2, Radio, Map, Target, Handshake, Briefcase, 
  Settings, Bell, Users, Shield, Cpu, Flame, Layers, GitFork,
  Camera
} from 'lucide-react';
import clsx from 'clsx';
import ThemeToggle from '../common/ThemeToggle';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Metrics', path: '/', icon: BarChart2, tooltip: 'Mission Control & Metrics' },
    { name: 'Station Telemetry', path: '/sensor', icon: GitFork, tooltip: 'Telemetry Nodes' },
    { name: 'Geospatial Sector GIS', path: '/map', icon: Users, tooltip: 'Geospatial Map' },
    { name: 'Field Reports', path: '/reports', icon: Camera, tooltip: 'Citizen & Field Incident Reports' },
    { name: 'Alerts & Incidents', path: '/alerts', icon: Target, tooltip: 'Alerts & Incidents' },
    { name: 'Geotechnical Analytics', path: '/analytics', icon: Handshake, tooltip: 'Analytics & Physics' },
    { name: 'About Terrawarn-Ai', path: '/about', icon: Briefcase, tooltip: 'About & Documentation' },
  ];

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 z-40 h-screen transition-transform bg-white dark:bg-[#0f172a] border-r border-[#e5e9f2] dark:border-white/10 flex flex-col justify-between items-center py-4',
        'w-16 sm:w-16',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Top Logo */}
      <div className="flex flex-col items-center gap-6 w-full">
        <Link to="/" className="group p-1" title="Terrawarn-Ai">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#10b981] via-[#06b6d4] to-[#2563eb] p-0.5 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white dark:bg-[#0f172a] rounded-[9px] flex items-center justify-center">
              <span className="font-extrabold text-sm text-[#2563eb] dark:text-[#38bdf8] tracking-tighter">TW</span>
            </div>
          </div>
        </Link>

        {/* Navigation Icons */}
        <nav className="flex flex-col items-center gap-3 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onToggle()}
                title={item.tooltip}
                className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 relative group',
                  isActive
                    ? 'bg-[#2563eb] text-white shadow-sm shadow-blue-500/30'
                    : 'text-slate-400 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                )}
              >
                <Icon className="w-5 h-5 stroke-[2]" />
                
                {/* Tooltip on hover */}
                <span className="absolute left-14 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium px-2 py-1 rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md border border-slate-700/50">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Icons (Theme Toggle, Settings, Notification Bell, User Avatar) */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <ThemeToggle className="w-10 h-10 rounded-xl" />

        <Link
          to="/settings"
          title="Hardware & Settings"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
        >
          <Settings className="w-5 h-5 stroke-[1.8]" />
        </Link>

        <Link
          to="/alerts"
          title="Alerts Center"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors relative"
        >
          <Bell className="w-5 h-5 stroke-[1.8]" />
          <span className="w-2 h-2 rounded-full bg-[#ef4444] absolute top-2 right-2 ring-2 ring-white dark:ring-[#0f172a]" />
        </Link>

        {/* User Avatar Circle */}
        <div 
          className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer shadow-sm"
          title="Terrawarn-Ai Operator"
        >
          <span>TW</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
