import React, { useState } from 'react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { useMockTelemetry } from '../hooks/useMockTelemetry';
import { 
  Info, Sliders, ShieldCheck, Sparkles, RefreshCw, Radio, 
  Bluetooth, Zap, ShieldAlert, CheckCircle2, ChevronRight, Activity,
  Layers, Volume2, Send, Clock, Mountain, Droplets, CloudRain, Cpu, Battery
} from 'lucide-react';
import clsx from 'clsx';
import PhysicalDemoPanel from '../components/dashboard/PhysicalDemoPanel';
import BlynkIntegrationPanel from '../components/dashboard/BlynkIntegrationPanel';
import EmergencySmsBroadcastPanel from '../components/dashboard/EmergencySmsBroadcastPanel';
import AIExplanation from '../components/dashboard/AIExplanation';
import DeviceHealth from '../components/dashboard/DeviceHealth';
import SecurityPanel from '../components/dashboard/SecurityPanel';
import LoadingState from '../components/common/LoadingState';
import { WeatherForecastWidget } from '../components/dashboard/WeatherForecastWidget';
import { DisasterTriagePanel } from '../components/dashboard/DisasterTriagePanel';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/LanguageContext';
import type { UIStringKey } from '../i18n/strings';

// Helper for generating smooth weekly curve points based on actual telemetry
const generateTelemetryCurve = (currentVal: number, variance: number) => {
  return [
    { name: 'W.01', val: Math.max(0, Number((currentVal * 0.85 + Math.sin(0.5) * variance).toFixed(1))) },
    { name: 'W.05', val: Math.max(0, Number((currentVal * 1.1 + Math.sin(1.8) * variance).toFixed(1))) },
    { name: 'W.12', val: Math.max(0, Number((currentVal * 0.9 + Math.sin(3.0) * variance).toFixed(1))) },
    { name: 'W.20', val: Math.max(0, Number((currentVal * 1.25 + Math.sin(4.2) * variance).toFixed(1))) },
    { name: 'W.32', val: Math.max(0, Number((currentVal * 0.75 + Math.sin(5.5) * variance).toFixed(1))) },
    { name: 'W.40', val: Math.max(0, Number((currentVal * 0.95 + Math.sin(6.8) * variance).toFixed(1))) },
    { name: 'W.48', val: Math.max(0, Number((currentVal * 1.15 + Math.sin(8.1) * variance).toFixed(1))) },
    { name: 'W.52', val: Number(currentVal.toFixed(1)) },
  ];
};

const DashboardPage: React.FC = () => {
  const { 
    state, 
    scenario, 
    setScenario, 
    reset, 
    acknowledgeAlert, 
    mode, 
    setMode,
    demoStage,
    setDemoStage,
    sihState,
    setSihState,
    runSihSequence,
    securityEvents,
    simulateReplayAttack,
    simulateUnauthorizedNode,
  } = useMockTelemetry();

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { t } = useI18n();
  const badgeLabel = (label: 'Critical' | 'Medium' | 'Elite' | 'Low'): UIStringKey => (
    label === 'Critical' ? 'BADGE_CRITICAL' : label === 'Medium' ? 'BADGE_MEDIUM' : label === 'Elite' ? 'BADGE_ELITE' : 'BADGE_LOW'
  );

  const [groupBy, setGroupBy] = useState<'Day' | 'Week' | 'Month'>('Week');
  const [showScenarioDrawer, setShowScenarioDrawer] = useState(true);
  const [showSmsPanel, setShowSmsPanel] = useState(false);
  const [showSecurityDrawer, setShowSecurityDrawer] = useState(false);

  if (!state) {
    return <LoadingState message={t('CONNECTING_GATEWAY')} />;
  }

  const reading = state.currentReading;
  const risk = state.currentRisk;

  // Real-time curve points synchronized with active reading values
  const fosCurve = [
    { name: 'W.01', val: 1.85 },
    { name: 'W.05', val: 1.72 },
    { name: 'W.12', val: 1.64 },
    { name: 'W.20', val: 1.80 },
    { name: 'W.32', val: 1.45 },
    { name: 'W.40', val: 1.68 },
    { name: 'W.48', val: 1.55 },
    { name: 'W.52', val: Number(risk.fos_estimate.toFixed(2)) },
  ];

  const moistureCurve = generateTelemetryCurve(reading.soil_moisture_pct, 6);
  const rainCurve = generateTelemetryCurve(reading.rainfall_24h_mm, 4);
  const tiltCurve = generateTelemetryCurve(reading.tilt_angle, 2);
  const loraCurve = generateTelemetryCurve(Math.abs(reading.rssi_dbm), 3);
  const hazardCurve = generateTelemetryCurve(risk.risk_score * 100, 8);
  const porePressureCurve = generateTelemetryCurve(reading.soil_moisture_pct * 0.45, 3);
  const smsReachCurve = generateTelemetryCurve(1420, 120);

  const fosStatus = risk.fos_estimate < 1.0 
    ? { label: 'Critical', badgeClass: 'badge-low' }
    : risk.fos_estimate < 1.3 
    ? { label: 'Medium', badgeClass: 'badge-medium' }
    : { label: 'Elite', badgeClass: 'badge-elite' };

  const moistureStatus = reading.soil_moisture_pct > 80 
    ? { label: 'Low', badgeClass: 'badge-low' }
    : reading.soil_moisture_pct > 50 
    ? { label: 'Medium', badgeClass: 'badge-medium' }
    : { label: 'Elite', badgeClass: 'badge-elite' };

  const rainStatus = reading.rainfall_24h_mm > 60 
    ? { label: 'Low', badgeClass: 'badge-low' }
    : reading.rainfall_24h_mm > 25 
    ? { label: 'Medium', badgeClass: 'badge-medium' }
    : { label: 'Elite', badgeClass: 'badge-elite' };

  const creepStatus = Math.abs(reading.tilt_rate) > 0.05 
    ? { label: 'Low', badgeClass: 'badge-low' }
    : { label: 'Elite', badgeClass: 'badge-elite' };

  return (
    <div className="space-y-7 pb-16 font-sans">
      {/* ── Section 1: Geotechnical Status (4 KPI Cards in exact visual layout) ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
              {t('GEOTECH_STATUS')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300 font-normal">
              {t('GEOTECH_STATUS_SUB')}
            </p>
            {mode === 'HARDWARE' && (
              <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cloud XGBoost live · Moisture {reading.soil_moisture_pct.toFixed(1)}% · Rain {reading.rainfall_24h_mm.toFixed(1)} mm · Risk {(risk.risk_score > 1 ? risk.risk_score : risk.risk_score * 100).toFixed(1)}% {risk.risk_level}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowScenarioDrawer(!showScenarioDrawer)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all",
                showScenarioDrawer 
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                  : "bg-white dark:bg-[#0f172a] border-[#e5e9f2] dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
              )}
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{showScenarioDrawer ? t('HIDE_LAB_SCENARIOS') : t('SHOW_LAB_SCENARIOS')}</span>
            </button>

            <button
              onClick={() => setShowSmsPanel(!showSmsPanel)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all",
                showSmsPanel 
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                  : "bg-white dark:bg-[#0f172a] border-[#e5e9f2] dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
              )}
            >
              <Bluetooth className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{showSmsPanel ? t('HIDE_SMS_HUB') : t('SHOW_SMS_HUB')}</span>
            </button>
          </div>
        </div>

        {/* 4 Cards Grid Row matching the exact screenshot layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Bishop Factor of Safety (Cycle Time layout style) */}
          <div className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-slate-700 dark:text-white font-semibold text-xs">
                  <span>{t('BISHOP_FOS')}</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 cursor-pointer" />
                </div>
                <span className={clsx('badge', fosStatus.badgeClass)}>
                  {t(badgeLabel(fosStatus.label as 'Critical' | 'Medium' | 'Elite' | 'Low'))}
                </span>
              </div>

              <div className="mt-2.5">
                <span className="stat-huge">
                  {risk.fos_estimate.toFixed(2)} FoS
                </span>
              </div>
            </div>

            {/* 4 Multi-Color Sub-Metric Indicator Bars Underneath */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
              <div className="grid grid-cols-4 gap-1.5 h-1 rounded-full overflow-hidden mb-2">
                <div className="bg-[#2563eb] h-full" title="Pore Water Saturation" />
                <div className="bg-[#ef4444] h-full" title="Angular Creep Velocity" />
                <div className="bg-[#f59e0b] h-full" title="Slope Dip Angle" />
                <div className="bg-[#10b981] h-full" title="Limit Equilibrium Index" />
              </div>

              <div className="grid grid-cols-4 gap-1 text-[9.5px] text-slate-500 dark:text-slate-300 font-medium">
                <div>
                  <span className="block text-slate-400 dark:text-slate-300">{t('PORE_WATER')}</span>
                  <strong className="text-slate-700 dark:text-white font-bold">{reading.soil_moisture_pct.toFixed(0)}%</strong>
                </div>
                <div>
                  <span className="block text-slate-400 dark:text-slate-300">{t('CREEP_RATE')}</span>
                  <strong className="text-slate-700 dark:text-white font-bold">{Math.abs(reading.tilt_rate).toFixed(3)}°</strong>
                </div>
                <div>
                  <span className="block text-slate-400 dark:text-slate-300">{t('SLOPE_DIP')}</span>
                  <strong className="text-slate-700 dark:text-white font-bold">{reading.tilt_angle.toFixed(1)}°</strong>
                </div>
                <div>
                  <span className="block text-slate-400 dark:text-slate-300">{t('STABILITY')}</span>
                  <strong className="text-slate-700 dark:text-white font-bold">{risk.fos_estimate.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Soil Moisture (Deploy Frequency layout style) */}
          <div className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-slate-700 dark:text-white font-semibold text-xs">
                  <span>{t('SOIL_MOISTURE_VWC')}</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 cursor-pointer" />
                </div>
                <span className={clsx('badge', moistureStatus.badgeClass)}>
                  {t(badgeLabel(moistureStatus.label as 'Critical' | 'Medium' | 'Elite' | 'Low'))}
                </span>
              </div>

              <div className="mt-2.5">
                <span className="stat-huge">
                  {reading.soil_moisture_pct.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500 dark:text-slate-200 font-medium">
              <span>{reading.soil_moisture} ADC sensor reading nominal</span>
            </div>
          </div>

          {/* Card 3: Precipitation 24h (MTTR layout style) */}
          <div className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-slate-700 dark:text-white font-semibold text-xs">
                  <span>{t('PRECIPITATION_24H')}</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 cursor-pointer" />
                </div>
                <span className={clsx('badge', rainStatus.badgeClass)}>
                  {t(badgeLabel(rainStatus.label as 'Critical' | 'Medium' | 'Elite' | 'Low'))}
                </span>
              </div>

              <div className="mt-2.5">
                <span className="stat-huge">
                  {reading.rainfall_24h_mm.toFixed(1)} mm
                </span>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500 dark:text-slate-200 font-medium">
              <span>Rate: {reading.rainfall_pct.toFixed(0)}% ({reading.rain_detected ? 'Precip Active' : 'Dry Condition'})</span>
            </div>
          </div>

          {/* Card 4: Displacement Velocity (Change Failure Rate layout style) */}
          <div className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-slate-700 dark:text-white font-semibold text-xs">
                  <span>{t('DISPLACEMENT_VELOCITY')}</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 cursor-pointer" />
                </div>
                <span className={clsx('badge', creepStatus.badgeClass)}>
                  {t(badgeLabel(creepStatus.label as 'Critical' | 'Medium' | 'Elite' | 'Low'))}
                </span>
              </div>

              <div className="mt-2.5">
                <span className="stat-huge">
                  {reading.tilt_rate >= 0 ? `+${reading.tilt_rate.toFixed(3)}` : reading.tilt_rate.toFixed(3)}°/m
                </span>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500 dark:text-slate-200 font-medium">
              <span>{Math.abs(reading.tilt_rate) > 0.05 ? 'Angular creep alert triggered' : '0 displacement anomalies detected'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Lab Scenario Controller (Collapsible) ─── */}
      {showScenarioDrawer && (
        <div className="animate-slide-up">
          <PhysicalDemoPanel
            currentStage={demoStage}
            currentSihState={sihState}
            onSelectStage={(s) => setDemoStage(s)}
            onSelectSihState={(st) => setSihState(st)}
            onRunAuto={runSihSequence}
            onReset={reset}
            reading={reading}
            risk={risk}
            events={state.events}
          />
        </div>
      )}

      {/* ── Zero-Pairing Bluetooth Proximity Dispatcher (Collapsible) ── */}
      {showSmsPanel && (
        <div className="animate-slide-up">
          <EmergencySmsBroadcastPanel />
        </div>
      )}

      {/* ── Section 2: Trends (Real-Time Curves & Sparklines) ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
              {t('TRENDS')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300 font-normal">
              {t('TRENDS_SUB')}
            </p>
          </div>

          {/* Group by: Day | Week | Month */}
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-200 font-medium text-xs">
            <span>{t('GROUP_BY')}</span>
            <div className="segmented-control">
              {(['Day', 'Week', 'Month'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setGroupBy(period)}
                  className={clsx(
                    'segmented-item',
                    groupBy === period ? 'segmented-item-active' : 'hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {period === 'Day' ? t('GROUP_DAY') : period === 'Week' ? t('GROUP_WEEK') : t('GROUP_MONTH')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top Trends Grid: Left Big Chart (~55%) + Right 2x2 Sparklines Grid (~45%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Chart (Left 7 Cols) */}
          <div className="lg:col-span-7 card p-5 flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-slate-800 dark:text-white font-bold text-sm">
                  <span>{t('BISHOP_STABILITY_CHART')}</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                </div>
                <span className={clsx('badge', fosStatus.badgeClass)}>
                  {t(badgeLabel(fosStatus.label as 'Critical' | 'Medium' | 'Elite' | 'Low'))}
                </span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-0.5">
                Current: <strong className="text-slate-700 dark:text-white font-bold">{risk.fos_estimate.toFixed(2)} FoS</strong> · Limit Equilibrium Stability
              </div>
            </div>

            {/* Main Smooth Royal-Blue Curve Chart */}
            <div className="w-full h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fosCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: isDark ? '#cbd5e1' : '#64748b', fontWeight: 500 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    domain={[0, 2.5]}
                    ticks={[0.0, 0.5, 1.0, 1.5, 2.0]} 
                    tickFormatter={(v) => `${v.toFixed(1)}`} 
                    tick={{ fontSize: 11, fill: isDark ? '#cbd5e1' : '#64748b', fontWeight: 500 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: isDark ? '#0f172a' : '#ffffff', 
                      borderRadius: '12px', 
                      border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e2e8f0', 
                      color: isDark ? '#f8fafc' : '#0f172a',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
                    }}
                    formatter={(val: number) => [`${val.toFixed(2)} FoS`, 'Factor of Safety']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="val" 
                    stroke="#2563eb" 
                    strokeWidth={2.5} 
                    dot={false} 
                    activeDot={{ r: 5, fill: '#2563eb' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right 2x2 Mini Trend Cards (5 Cols) */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mini Trend 1: Soil Moisture */}
            <div className="card p-3.5 flex flex-col justify-between h-[172px]">
              <div>
                <div className="flex items-center gap-1 text-slate-800 dark:text-white font-bold text-xs">
                  <span>{t('SOIL_MOISTURE_VWC')}</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-300 font-medium">
                  Live: <strong className="text-slate-700 dark:text-white font-bold">{reading.soil_moisture_pct.toFixed(1)}%</strong>
                </div>
              </div>

              <div className="w-full h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moistureCurve} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Line type="monotone" dataKey="val" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mini Trend 2: Rain Ingress */}
            <div className="card p-3.5 flex flex-col justify-between h-[172px]">
              <div>
                <div className="flex items-center gap-1 text-slate-800 dark:text-white font-bold text-xs">
                  <span>{t('PRECIPITATION_24H')}</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-300 font-medium">
                  Live: <strong className="text-slate-700 dark:text-white font-bold">{reading.rainfall_24h_mm.toFixed(1)} mm</strong>
                </div>
              </div>

              <div className="w-full h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rainCurve} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Line type="monotone" dataKey="val" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mini Trend 3: Slope Incline */}
            <div className="card p-3.5 flex flex-col justify-between h-[172px]">
              <div>
                <div className="flex items-center gap-1 text-slate-800 dark:text-white font-bold text-xs">
                  <span>{t('SLOPE_INCLINE_DIP')}</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-300 font-medium">
                  Live: <strong className="text-slate-700 dark:text-white font-bold">{reading.tilt_angle.toFixed(1)}°</strong>
                </div>
              </div>

              <div className="w-full h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tiltCurve} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Line type="monotone" dataKey="val" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mini Trend 4: LoRa Telemetry Link */}
            <div className="card p-3.5 flex flex-col justify-between h-[172px]">
              <div>
                <div className="flex items-center gap-1 text-slate-800 dark:text-white font-bold text-xs">
                  <span>{t('LORA_TELEMETRY')}</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-300 font-medium">
                  Live: <strong className="text-slate-700 dark:text-white font-bold">{reading.rssi_dbm} dBm</strong>
                </div>
              </div>

              <div className="w-full h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={loraCurve} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Line type="monotone" dataKey="val" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row of Trends: 3 Cards across matching the screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Bottom Card 1: Hazard Probability */}
          <div className="card p-5 flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-slate-800 dark:text-white font-bold text-xs">
                  <span>{t('HAZARD_PROBABILITY')}</span>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className={clsx('badge', risk.risk_level === 'CRITICAL' ? 'badge-low' : risk.risk_level === 'HIGH' ? 'badge-medium' : 'badge-elite')}>
                  {risk.risk_level}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-0.5">
                Current Risk: <strong className="text-slate-700 dark:text-white font-bold">{(risk.risk_score * 100).toFixed(0)}%</strong> · Conf: {(risk.confidence * 100).toFixed(0)}%
              </div>
            </div>

            <div className="w-full h-32 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hazardCurve} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Line type="monotone" dataKey="val" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Card 2: Pore-Water Saturation */}
          <div className="card p-5 flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-slate-800 dark:text-white font-bold text-xs">
                  <span>{t('PORE_WATER_INDEX')}</span>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="badge badge-medium">
                  Matrix
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-0.5">
                Saturation: <strong className="text-slate-700 dark:text-white font-bold">{(reading.soil_moisture_pct * 0.45).toFixed(1)} kPa</strong>
              </div>
            </div>

            <div className="w-full h-32 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={porePressureCurve} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Line type="monotone" dataKey="val" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Card 3: Cell Broadcast & Proximity Reach */}
          <div className="card p-5 flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-slate-800 dark:text-white font-bold text-xs">
                  <span>{t('SMS_REACH')}</span>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="badge badge-blue">
                  Active
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-0.5">
                Estimated Geo-Fence: <strong className="text-slate-700 dark:text-white font-bold">1,420 Devices</strong>
              </div>
            </div>

            <div className="w-full h-32 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={smsReachCurve} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: isDark ? '#cbd5e1' : '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Line type="monotone" dataKey="val" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: AI Explainability & Live Node Health ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
        <div className="lg:col-span-2">
          <AIExplanation risk={risk} />
        </div>
        <div className="lg:col-span-1">
          <DeviceHealth node={state.node} reading={reading} />
        </div>
      </div>

      {/* ── Section 4: North Eastern Region Weather Forecast & Disaster Triage ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
            {t('WEATHER_TRIAGE_TITLE')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300 font-normal">
            {t('WEATHER_TRIAGE_SUB')}
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <WeatherForecastWidget />
          <DisasterTriagePanel />
        </div>
      </div>

      {/* ── Section 5: Blynk IoT Cloud & Hardware Gateway ─────── */}
      <BlynkIntegrationPanel reading={reading} risk={risk} />
    </div>
  );
};

export default DashboardPage;
