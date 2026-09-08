import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import SensorNodePage from './pages/SensorNodePage';
import AlertsPage from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import RiskMapPage from './pages/RiskMapPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import CitizenReportsPage from './pages/CitizenReportsPage';
import { useMockTelemetry } from './hooks/useMockTelemetry';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './i18n/LanguageContext';
import type { Alert } from './types';

const App: React.FC = () => {
  const { state } = useMockTelemetry();
  
  const unacknowledgedCount = state ? state.alerts.filter((a: Alert) => !a.acknowledged).length : 0;
  const isConnected = state ? state.isConnected : false;

  return (
    <ThemeProvider>
      <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout alertCount={unacknowledgedCount} isConnected={isConnected} />}>
          {/* Primary Routes */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sensor" element={<SensorNodePage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/map" element={<RiskMapPage />} />
          <Route path="/reports" element={<CitizenReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Path Aliases for Seamless Navigation */}
          <Route path="/node" element={<SensorNodePage />} />
          <Route path="/nodes" element={<SensorNodePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/metrics" element={<DashboardPage />} />
          <Route path="/gis" element={<RiskMapPage />} />

          {/* Catch-all Wildcard Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
