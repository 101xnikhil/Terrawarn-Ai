import React, { useState, useEffect } from 'react';
import { 
  Play, RotateCcw, ShieldAlert, AlertTriangle, Droplets, CloudRain, 
  Mountain, Activity, CheckCircle2, ChevronRight, Sparkles, Clock, 
  FlaskConical, ArrowRight, Zap, Layers, Flame, Sliders, ShieldCheck
} from 'lucide-react';
import { RiskAssessment, RiskLevel, TelemetryReading, DemoStageId, SihDemoStateKey } from '../../types';
import clsx from 'clsx';
import { useI18n } from '../../i18n/LanguageContext';
import type { UIStringKey } from '../../i18n/strings';

interface Props {
  currentStage?: DemoStageId;
  currentSihState?: SihDemoStateKey;
  onSelectStage?: (stage: DemoStageId) => void;
  onSelectSihState?: (state: SihDemoStateKey) => void;
  onRunAuto: () => void;
  onReset: () => void;
  reading: TelemetryReading;
  risk: RiskAssessment;
  events?: Array<{
    id: string;
    timestamp: string;
    event?: string;
    title?: string;
    description: string;
    severity?: string;
    stage?: number;
  }>;
}

interface SihStateConfig {
  key: SihDemoStateKey;
  label: string;
  sublabel: string;
  riskLevel: RiskLevel;
  riskColor: string;
  dotColor: string;
  activeGlow: string;
  icon: React.ComponentType<{ className?: string }>;
  expectedMoisture: string;
  expectedRain: string;
  expectedTilt: string;
  expectedFos: string;
  summary: string;
  badge: string;
}

const SIH_STATES: SihStateConfig[] = [
  {
    key: 'NORMAL',
    label: 'DRY BASELINE',
    sublabel: 'Dry Soil Nominal Stability',
    riskLevel: 'LOW',
    riskColor: 'text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/70',
    dotColor: 'bg-emerald-500',
    activeGlow: 'ring-2 ring-emerald-500 shadow-md shadow-emerald-100 dark:shadow-emerald-950/50',
    icon: Mountain,
    expectedMoisture: '18.5%',
    expectedRain: '0 mm/h',
    expectedTilt: '21.8°',
    expectedFos: '> 1.80',
    summary: 'Baseline dry soil with nominal shear stability. Stable tilt angle, zero rainfall.',
    badge: '1. STABLE',
  },
  {
    key: 'RAIN',
    label: 'PRECIPITATION',
    sublabel: 'Rain Ingress Commences',
    riskLevel: 'LOW',
    riskColor: 'text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/70',
    dotColor: 'bg-blue-500',
    activeGlow: 'ring-2 ring-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-950/50',
    icon: CloudRain,
    expectedMoisture: '38.0%',
    expectedRain: '35 mm/h',
    expectedTilt: '22.1°',
    expectedFos: '1.45',
    summary: 'Precipitation starts; rain gauge active, surface moisture infiltration begins.',
    badge: '2. INGRESS',
  },
  {
    key: 'HEAVY_RAIN',
    label: 'DOWNPOUR',
    sublabel: 'Intense Monsoon Load',
    riskLevel: 'MODERATE',
    riskColor: 'text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/70',
    dotColor: 'bg-amber-500',
    activeGlow: 'ring-2 ring-amber-500 shadow-md shadow-amber-100 dark:shadow-amber-950/50',
    icon: CloudRain,
    expectedMoisture: '58.0%',
    expectedRain: '75 mm/h',
    expectedTilt: '22.8°',
    expectedFos: '1.28',
    summary: 'Heavy downpour event; moisture threshold crossed, pore pressure begins rising.',
    badge: '3. DOWNPOUR',
  },
  {
    key: 'SATURATION',
    label: 'SATURATION',
    sublabel: 'Pore-Water Saturation',
    riskLevel: 'HIGH',
    riskColor: 'text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/70',
    dotColor: 'bg-orange-500',
    activeGlow: 'ring-2 ring-orange-500 shadow-md shadow-orange-100 dark:shadow-orange-950/50',
    icon: Droplets,
    expectedMoisture: '84.0%',
    expectedRain: '85 mm/h',
    expectedTilt: '25.2°',
    expectedFos: '1.08',
    summary: 'Extensive pore-water saturation; effective normal stress drops, HIGH RISK alert triggered.',
    badge: '4. SATURATED',
  },
  {
    key: 'SLOPE_MOVEMENT',
    label: 'DISPLACEMENT',
    sublabel: 'Angular Shear & Creep',
    riskLevel: 'CRITICAL',
    riskColor: 'text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-600 bg-rose-50 dark:bg-rose-950/70',
    dotColor: 'bg-rose-500',
    activeGlow: 'ring-2 ring-rose-500 shadow-md shadow-rose-100 dark:shadow-rose-950/50',
    icon: Activity,
    expectedMoisture: '91.0%',
    expectedRain: '80 mm/h',
    expectedTilt: '31.5°',
    expectedFos: '0.92',
    summary: 'Active angular tilt displacement on MPU6050 (+0.16°/min). Limit equilibrium failure FoS < 1.0.',
    badge: '5. CREEP ANOMALY',
  },
  {
    key: 'CRITICAL',
    label: 'FAILURE ALARM',
    sublabel: 'Limit Equilibrium Failure',
    riskLevel: 'CRITICAL',
    riskColor: 'text-red-800 dark:text-red-200 border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-950/70',
    dotColor: 'bg-red-500',
    activeGlow: 'ring-2 ring-red-500 shadow-lg shadow-red-100 dark:shadow-red-950/50 animate-pulse',
    icon: ShieldAlert,
    expectedMoisture: '96.0%',
    expectedRain: '92 mm/h',
    expectedTilt: '38.4°',
    expectedFos: '< 0.70',
    summary: 'Catastrophic slope shear failure. Automated railway stoppage and evacuation active.',
    badge: '6. EVACUATION',
  },
];

const REQUIRED_MILESTONES = [
  { id: 'm1', stateKey: 'RAIN', label: 'Rainfall detected', desc: 'Precipitation sensor triggered' },
  { id: 'm2', stateKey: 'HEAVY_RAIN', label: 'Moisture threshold crossed', desc: 'Soil moisture > 45% threshold' },
  { id: 'm3', stateKey: 'SATURATION', label: 'Stability indicator decreased', desc: 'Factor of Safety degraded below 1.25' },
  { id: 'm4', stateKey: 'SLOPE_MOVEMENT', label: 'Tilt anomaly detected', desc: 'Rapid angular movement on MPU6050' },
  { id: 'm5', stateKey: 'CRITICAL', label: 'HIGH RISK ALERT', desc: 'Critical evacuation alert dispatched' },
];

export default function PhysicalDemoPanel({
  currentStage = 1,
  currentSihState = 'NORMAL',
  onSelectStage,
  onSelectSihState,
  onRunAuto,
  onReset,
  reading,
  risk,
  events = [],
}: Props) {
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const { t, tx } = useI18n();
  const riskKey = (level: RiskLevel): UIStringKey => (
    level === 'CRITICAL' ? 'RISK_CRITICAL' : level === 'HIGH' ? 'RISK_HIGH' : level === 'MODERATE' ? 'RISK_MODERATE' : 'RISK_LOW'
  );

  const resolvedStateKey: SihDemoStateKey = currentSihState || (
    currentStage === 1 ? 'NORMAL' :
    currentStage === 2 ? 'HEAVY_RAIN' :
    currentStage === 3 ? 'SATURATION' : 'SLOPE_MOVEMENT'
  );

  const activeStateConfig = SIH_STATES.find((s) => s.key === resolvedStateKey) || SIH_STATES[0];

  const handleStateClick = (stateKey: SihDemoStateKey) => {
    if (onSelectSihState) {
      onSelectSihState(stateKey);
    } else if (onSelectStage) {
      const stageMap: Record<SihDemoStateKey, DemoStageId> = {
        NORMAL: 1,
        RAIN: 2,
        HEAVY_RAIN: 2,
        SATURATION: 3,
        SLOPE_MOVEMENT: 4,
        CRITICAL: 4,
      };
      onSelectStage(stageMap[stateKey] || 1);
    }
  };

  const handleStartAuto = () => {
    setIsAutoRunning(true);
    onRunAuto();
    setCountdown(24);
  };

  useEffect(() => {
    if (!isAutoRunning || countdown === null) return;
    if (countdown <= 0) {
      setIsAutoRunning(false);
      setCountdown(null);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isAutoRunning, countdown]);

  const stateIndex = SIH_STATES.findIndex((s) => s.key === resolvedStateKey);

  return (
    <div className="card p-5 space-y-4">
      {/* ── Top Header: Geotechnical Hazard Scenario Controller ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#f1f5f9] dark:border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800 shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-[#0f172a] dark:text-white tracking-tight">
                {tx('Geotechnical Scenario & Telemetry Controller')}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                {tx('Interactive Lab Suite')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tx('Test dynamic pore-water pressure spikes, shear angle changes, and automated emergency response protocols.')}
            </p>
          </div>
        </div>

        {/* Station Mode Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-800 dark:text-white block text-[10.5px]">
              {tx('Active Simulation Pipeline')}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {tx('Synchronized with Local Physics & XGBoost AI')}
            </span>
          </div>
        </div>
      </div>

      {/* ── 6 Controllable State Buttons ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{tx('Select Geotechnical Condition (Click to trigger):')}</span>
          </div>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
            {tx('Active:')} [{tx(activeStateConfig.label)}]
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SIH_STATES.map((s) => {
            const Icon = s.icon;
            const isActive = resolvedStateKey === s.key;

            return (
              <button
                key={s.key}
                onClick={() => handleStateClick(s.key)}
                className={clsx(
                  "p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group focus:outline-none",
                  isActive
                    ? `${s.riskColor} ${s.activeGlow}`
                    : "bg-white dark:bg-slate-800/90 border-[#e5e9f2] dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-slate-700/60"
                )}
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={clsx("w-2 h-2 rounded-full", s.dotColor, isActive && "animate-ping")} />
                    <span className={clsx(
                      "text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase border",
                      s.riskLevel === 'CRITICAL' ? 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' :
                      s.riskLevel === 'HIGH' ? 'bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' :
                      s.riskLevel === 'MODERATE' ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                      'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    )}>
                      {t(riskKey(s.riskLevel))}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 dark:text-white tracking-tight mt-1">
                    {tx(s.label)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-300 leading-tight mt-0.5 truncate">
                    {tx(s.sublabel)}
                  </div>
                </div>

                {/* Metrics Preview */}
                <div className="mt-3 pt-2 border-t border-slate-200/70 dark:border-white/10 text-[9.5px] font-mono grid grid-cols-2 gap-0.5 text-slate-500 dark:text-slate-300">
                  <div>VWC: <strong className="text-slate-800 dark:text-white font-bold">{s.expectedMoisture}</strong></div>
                  <div>Rain: <strong className="text-slate-800 dark:text-white font-bold">{s.expectedRain}</strong></div>
                  <div>Tilt: <strong className="text-slate-800 dark:text-white font-bold">{s.expectedTilt}</strong></div>
                  <div>FoS: <strong className="text-slate-800 dark:text-white font-bold">{s.expectedFos}</strong></div>
                </div>

                {/* Active Indicator */}
                {isActive && (
                  <div className="mt-2 text-center py-0.5 rounded bg-blue-600 text-[9px] font-bold text-white shadow-xs">
                    {tx('CURRENT ACTIVE')}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Control Bar + Milestone Event Timeline Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
        {/* Left: Interactive Demo Actions */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
              {tx('Automated Scenario Sequencer')}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-300 font-sans">
              {tx('Runs continuous rainfall-to-failure progression automatically across all 6 geotechnical phases.')}
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleStartAuto}
              disabled={isAutoRunning}
              className={clsx(
                "w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm",
                isAutoRunning
                  ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 animate-pulse cursor-not-allowed"
                  : "bg-[#2563eb] hover:bg-blue-700 text-white"
              )}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isAutoRunning ? `${tx('Run Automated Progression')} (${countdown}s)` : tx('Run Automated Progression')}</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const prevIdx = Math.max(0, stateIndex - 1);
                  handleStateClick(SIH_STATES[prevIdx].key);
                }}
                disabled={stateIndex <= 0}
                className="flex-1 py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                ◀ {tx('Prev Step')}
              </button>
              <button
                onClick={() => {
                  const nextIdx = Math.min(SIH_STATES.length - 1, stateIndex + 1);
                  handleStateClick(SIH_STATES[nextIdx].key);
                }}
                disabled={stateIndex >= SIH_STATES.length - 1}
                className="flex-1 py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                {tx('Next Step')} ▶
              </button>
              <button
                onClick={onReset}
                className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                title={tx('Reset to Dry Baseline')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right (2 Cols): Event Timeline Milestones */}
        <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  {tx('Geotechnical Event Timeline & Thresholds')}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-300 font-bold">
                {tx('MONITORING LOG')}
              </span>
            </div>

            {/* 5 Required Milestone Trackers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {REQUIRED_MILESTONES.map((m, idx) => {
                const triggerIndex = SIH_STATES.findIndex((s) => s.key === m.stateKey);
                const isTriggered = stateIndex >= triggerIndex;
                const isCurrent = resolvedStateKey === m.stateKey;

                return (
                  <div
                    key={m.id}
                    className={clsx(
                      "p-2.5 rounded-xl border text-xs flex flex-col justify-between transition-all",
                      isTriggered
                        ? isCurrent
                          ? "bg-blue-100/70 dark:bg-blue-950/80 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                        : "bg-slate-100/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/10 text-slate-500 dark:text-slate-300 opacity-90"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[9px] font-bold text-slate-400 dark:text-slate-400">#{idx + 1}</span>
                        {isTriggered ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-500 inline-block" />
                        )}
                      </div>
                      <div className="font-bold text-[11px] leading-tight text-slate-900 dark:text-white">
                        "{tx(m.label)}"
                      </div>
                    </div>
                    <div className="text-[9.5px] text-slate-500 dark:text-slate-300 font-sans mt-1">
                      {tx(m.desc)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-300 font-sans">
            <span>Limit Equilibrium Infinite Slope Stability + XGBoost Hybrid Coupling</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold uppercase">STATE {stateIndex + 1} OF 6: [{activeStateConfig.label}]</span>
          </div>
        </div>
      </div>
    </div>
  );
}
