import React from 'react';
import { useMockTelemetry } from '../hooks/useMockTelemetry';
import { getGenerator } from '../mock/generator';
import LoadingState from '../components/common/LoadingState';
import PrototypeLabel from '../components/common/PrototypeLabel';
import { 
  LineChart, Line, AreaChart, Area, ComposedChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { RISK_COLORS } from '../types';
import { formatTimeShort } from '../utils/formatters';
import { BarChart3, TrendingUp, Cpu, Table, Activity } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/LanguageContext';

const AnalyticsPage: React.FC = () => {
  const { state } = useMockTelemetry();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { t, tx } = useI18n();
  
  if (!state) {
    return <LoadingState message={t('LOADING')} />;
  }
  
  const chartData = getGenerator().getChartData();
  const { currentRisk, readingHistory } = state;

  // Compute summary statistics
  const calcStats = (arr: number[]) => {
    if (arr.length === 0) return { min: 0, max: 0, avg: 0, cur: 0 };
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const cur = arr[arr.length - 1];
    return { min, max, avg, cur };
  };

  const moistureStats = calcStats(readingHistory.map(r => r.soil_moisture_pct));
  const rainStats = calcStats(readingHistory.map(r => r.rainfall_24h_mm));
  const tiltStats = calcStats(readingHistory.map(r => r.tilt_angle));
  const tiltRateStats = calcStats(readingHistory.map(r => r.tilt_rate));
  const riskStats = calcStats(state.riskHistory.map(r => r.risk_score * 100));
  const fosStats = calcStats(state.riskHistory.map(r => r.fos_estimate));

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* ── Section Header (matches Metrics page format) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
            {t('ANALYTICS_TITLE')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300 font-normal mt-0.5">
            {t('ANALYTICS_SUB')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0f172a] border border-[#e5e9f2] dark:border-white/10 text-xs font-semibold shadow-xs">
            <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-slate-700 dark:text-slate-200">Model: <strong>XGBoost 2.0.3</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0f172a] border border-[#e5e9f2] dark:border-white/10 text-xs font-semibold shadow-xs">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-slate-700 dark:text-slate-200">Horizon: <strong>52 Weeks</strong></span>
          </div>
        </div>
      </div>

      {/* Summary Statistics Table */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <Table className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-xs uppercase tracking-wider">{t('STATS_SUMMARY')} (Buffer: {readingHistory.length} Samples)</span>
          </div>
          <span className="font-mono text-[10.5px] font-bold text-slate-500 dark:text-slate-400">10s Telemetry Interval</span>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-white/10 text-[10px] uppercase text-slate-500 dark:text-slate-300 font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">{t('COL_METRIC')}</th>
                <th className="py-3 px-4">{t('COL_UNIT')}</th>
                <th className="py-3 px-4">{t('COL_CURRENT')}</th>
                <th className="py-3 px-4">{t('COL_MIN')}</th>
                <th className="py-3 px-4">{t('COL_MAX')}</th>
                <th className="py-3 px-4">{t('COL_MEAN')}</th>
                <th className="py-3 px-4">{t('COL_STATUS')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10 font-mono">
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-white">{t('METRIC_VWC')}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">%</td>
                <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">{moistureStats.cur.toFixed(1)}%</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{moistureStats.min.toFixed(1)}%</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{moistureStats.max.toFixed(1)}%</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{moistureStats.avg.toFixed(1)}%</td>
                <td className="py-3 px-4">
                  <span className={moistureStats.cur > 80 ? "badge badge-low" : moistureStats.cur > 50 ? "badge badge-medium" : "badge badge-elite"}>
                    {moistureStats.cur > 80 ? t('BADGE_CRITICAL') : moistureStats.cur > 50 ? t('STATUS_ELEVATED') : t('STATUS_NOMINAL')}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-white">{t('METRIC_RAIN')}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">mm</td>
                <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">{rainStats.cur.toFixed(1)} mm</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{rainStats.min.toFixed(1)} mm</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{rainStats.max.toFixed(1)} mm</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{rainStats.avg.toFixed(1)} mm</td>
                <td className="py-3 px-4">
                  <span className={rainStats.cur > 50 ? "badge badge-low" : "badge badge-elite"}>
                    {rainStats.cur > 50 ? t('STATUS_HEAVY') : t('STATUS_NORMAL')}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-white">{t('METRIC_DIP')}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">°</td>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">{tiltStats.cur.toFixed(2)}°</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{tiltStats.min.toFixed(2)}°</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{tiltStats.max.toFixed(2)}°</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{tiltStats.avg.toFixed(2)}°</td>
                <td className="py-3 px-4"><span className="badge badge-elite">{t('BADGE_ACTIVE')}</span></td>
              </tr>
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-white">{tx('Tilt Displacement Rate')}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">°/min</td>
                <td className="py-3 px-4 font-bold text-orange-600 dark:text-orange-400">{tiltRateStats.cur.toFixed(3)}</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{tiltRateStats.min.toFixed(3)}</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{tiltRateStats.max.toFixed(3)}</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{tiltRateStats.avg.toFixed(3)}</td>
                <td className="py-3 px-4">
                  <span className={Math.abs(tiltRateStats.cur) > 0.05 ? "badge badge-low" : "badge badge-elite"}>
                    {Math.abs(tiltRateStats.cur) > 0.05 ? tx('Creep Detected') : tx('Stable')}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-white">{tx('Factor of Safety (FoS)')}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">ratio</td>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{fosStats.cur.toFixed(2)}</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{fosStats.min.toFixed(2)}</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{fosStats.max.toFixed(2)}</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{fosStats.avg.toFixed(2)}</td>
                <td className="py-3 px-4">
                  <span className={fosStats.cur < 1.0 ? "badge badge-low" : fosStats.cur < 1.3 ? "badge badge-medium" : "badge badge-elite"}>
                    {fosStats.cur < 1.0 ? tx('Failure Imminent') : fosStats.cur < 1.3 ? tx('Warning') : tx('Stable')}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Soil Moisture & Rainfall Time Series */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Soil Moisture Chart */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              {tx('Soil Moisture Time-Series & Thresholds')}
            </h3>
            <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">{moistureStats.cur.toFixed(1)}%</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'} vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={formatTimeShort} stroke="#94a3b8" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0', 
                    color: isDark ? '#f8fafc' : '#0f172a', 
                    fontSize: '11px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Soil Moisture']}
                />
                <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical (80%)', fill: '#ef4444', fontSize: 9 }} />
                <Line type="monotone" dataKey="soil_moisture" stroke="#2563eb" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rainfall Accumulation */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              {tx('24-Hour Precipitation Accumulation (mm)')}
            </h3>
            <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">{rainStats.cur.toFixed(1)} mm</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'} vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={formatTimeShort} stroke="#94a3b8" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }} tickFormatter={(val) => `${val}mm`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0', 
                    color: isDark ? '#f8fafc' : '#0f172a', 
                    fontSize: '11px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} mm`, 'Rainfall']}
                />
                <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Heavy Threshold (50mm)', fill: '#ef4444', fontSize: 9 }} />
                <Area type="monotone" dataKey="rainfall" fill="#3b82f6" stroke="#2563eb" fillOpacity={0.18} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid: Hazard Risk Probability vs. Geotechnical Factor of Safety */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Probability Trend */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              {tx('AI Hazard Risk Score Probability Trajectory')}
            </h3>
            <span className="font-mono text-xs text-orange-600 font-bold">{(currentRisk.risk_score * 100).toFixed(0)}%</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'} vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={formatTimeShort} stroke="#94a3b8" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }} />
                <YAxis domain={[0, 1]} stroke="#94a3b8" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0', 
                    color: isDark ? '#f8fafc' : '#0f172a', 
                    fontSize: '11px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
                  }}
                  formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Risk Score']}
                />
                <ReferenceLine y={0.75} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical (0.75)', fill: '#ef4444', fontSize: 9 }} />
                <ReferenceLine y={0.50} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'High (0.50)', fill: '#f97316', fontSize: 9 }} />
                <Line type="monotone" dataKey="risk_score" stroke="#f97316" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Factor of Safety (FoS) */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              {tx('Factor of Safety (FoS) Infinite Slope Limit Equilibrium')}
            </h3>
            <span className="font-mono text-xs text-emerald-600 font-bold">{currentRisk.fos_estimate.toFixed(2)}</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'} vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={formatTimeShort} stroke="#94a3b8" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }} domain={[0, 3]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0', 
                    color: isDark ? '#f8fafc' : '#0f172a', 
                    fontSize: '11px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
                  }}
                  formatter={(value: number) => [value.toFixed(2), 'FoS Ratio']}
                />
                <ReferenceLine y={1.0} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" label={{ value: 'Limit Equilibrium (1.0)', fill: '#ef4444', fontSize: 9 }} />
                <ReferenceLine y={1.3} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Safety Target (1.3)', fill: '#f59e0b', fontSize: 9 }} />
                <Line type="monotone" dataKey="fos" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SHAP Feature Importance Decomposition */}
      <div className="card">
        <div className="card-header flex items-center justify-between border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-xs uppercase tracking-wider">{tx('SHAP Global Feature Attribution Weights')}</span>
          </div>
          <span className="font-mono text-[10.5px] font-bold text-slate-500 dark:text-slate-400">TreeExplainer Kernel</span>
        </div>
        <div className="card-body h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart layout="vertical" data={currentRisk.shap_values} margin={{ top: 5, right: 30, left: 140, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'} horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }} />
              <YAxis dataKey="display_name" type="category" stroke="#94a3b8" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 500 }} className="text-slate-700 dark:text-slate-200" width={160} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0', 
                  color: isDark ? '#f8fafc' : '#0f172a', 
                  fontSize: '11px', 
                  borderRadius: '12px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
                }}
                formatter={(value: number) => [value > 0 ? `+${value.toFixed(3)}` : value.toFixed(3), 'SHAP Impact']}
              />
              <ReferenceLine x={0} stroke="#94a3b8" />
              <Bar dataKey="contribution" fill="#2563eb" barSize={16} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {currentRisk.shap_values.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.contribution > 0 ? '#f97316' : '#10b981'} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
