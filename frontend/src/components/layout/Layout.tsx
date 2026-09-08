import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import VirtualChatbotModal from '../common/VirtualChatbotModal';
import ErrorBoundary from '../common/ErrorBoundary';
import { useI18n } from '../../i18n/LanguageContext';

interface LayoutProps {
  alertCount?: number;
  isConnected?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ alertCount = 0, isConnected = true }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { t } = useI18n();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/':
      case '/dashboard':
      case '/metrics':
        return t('PAGE_METRICS');
      case '/sensor':
      case '/node':
      case '/nodes':
        return t('PAGE_STATION_TELEMETRY');
      case '/alerts':
        return t('PAGE_ALERTS');
      case '/analytics':
        return t('PAGE_ANALYTICS');
      case '/map':
      case '/gis':
        return t('PAGE_GIS');
      case '/reports':
        return t('PAGE_REPORTS');
      case '/settings':
        return t('PAGE_SETTINGS');
      case '/about':
        return t('PAGE_ABOUT');
      default:
        return t('PAGE_METRICS');
    }
  };

  return (
    <div className="app-shell min-h-screen text-[#0b1220] dark:text-[#f4f6fb] flex overflow-x-hidden transition-colors duration-200">
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/55 backdrop-blur-[2px] z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 lg:ml-16 transition-all duration-300">
        <Header 
          title={getPageTitle(location.pathname)} 
          alertCount={alertCount} 
          isConnected={isConnected}
          onMenuToggle={toggleSidebar} 
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:px-8 lg:py-7 max-w-[1600px] w-full mx-auto">
          <div key={location.pathname} className="page-enter">
            <ErrorBoundary fallbackTitle={t('PAGE_ERROR')} fallbackMessage={t('PAGE_ERROR_MSG')}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
        
        {/* Global Virtual Chatbot AI Assistant */}
        <VirtualChatbotModal />

        <footer className="border-t border-[#e2e8f0] dark:border-white/[0.07] bg-white/75 dark:bg-[#0f172a]/75 backdrop-blur-md px-6 py-3 text-xs font-sans text-slate-500 dark:text-slate-400 transition-colors">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"></span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{t('FOOTER_BRAND')}</span>
              <span className="text-slate-400 dark:text-slate-400">· {t('FOOTER_TAGLINE')}</span>
            </div>
            <div className="text-slate-500 dark:text-slate-300 text-[11px]">
              {t('FOOTER_STACK')}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-300">
              <span>{t('FOOTER_BLYNK')}</span>
              <span>&bull;</span>
              <span className="text-[#10b981] font-semibold">{t('FOOTER_ONLINE')}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
