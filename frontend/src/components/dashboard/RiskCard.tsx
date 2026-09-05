import React from 'react';
import { ShieldAlert, ShieldCheck, Shield, AlertTriangle, TrendingUp, TrendingDown, Minus, Activity, Gauge, Sparkles } from 'lucide-react';
import { RiskAssessment, RiskLevel } from '../../types';
import clsx from 'clsx';
import { RISK_GLOW_CLASSES } from '../../types';

interface Props {
  risk: RiskAssessment | null;
}

export default function RiskCard({ risk }: Props) {
  if (!risk) {
    return (
      <div className="card h-full min-h-[340px] flex flex-col items-center justify-center p-6 text-center rounded-3xl">
        <Activity className="w-8 h-8 text-slate-600 animate-pulse mb-3" />
        <span className="text-sm font-medium text-slate-400 font-mono">Awaiting AI Telemetry Ingestion...</span>
        <span className="text-xs text-slate-600 mt-1 font-mono">Initializing gray-box risk pipeline</span>
      </div>
    );
  }

  const scorePct = Math.round(risk.risk_score * 100);
  const glowClass = RISK_GLOW_CLASSES[risk.risk_level] || '';

  const levelConfig: Record<RiskLevel, {
    label: string;
    action: string;
    colorText: string;
    colorBg: string;
    colorBorder: string;
    strokeGradient: string;
    icon: typeof ShieldCheck;
    badgeClass: string;
  }> = {
    LOW: {
      label: 'NOMINAL STABILITY',
      action: 'Standard Routine Surveillance — Slope shear forces within safe limits',
      colorText: 'text-emerald-800 dark:text-emerald-300',
      colorBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      colorBorder: 'border-emerald-300 dark:border-emerald-500/40',
      strokeGradient: '#10b981',
      icon: ShieldCheck,
      badgeClass: 'badge-low',
    },
    MODERATE: {
      label: 'ELEVATED SURVEILLANCE',
      action: 'Advisory Alert — Precipitation accumulation & pore pressure rising',
      colorText: 'text-amber-800 dark:text-amber-300',
      colorBg: 'bg-amber-50 dark:bg-amber-950/40',
      colorBorder: 'border-amber-300 dark:border-amber-500/40',
      strokeGradient: '#f59e0b',
      icon: Shield,
      badgeClass: 'badge-moderate',
    },
    HIGH: {
      label: 'HIGH WARNING TIER',
      action: 'Warning Active — Significant angular creep & matrix saturation',
      colorText: 'text-orange-800 dark:text-orange-300',
      colorBg: 'bg-orange-50 dark:bg-orange-950/40',
      colorBorder: 'border-orange-300 dark:border-orange-500/50',
      strokeGradient: '#f97316',
      icon: AlertTriangle,
      badgeClass: 'badge-high',
    },
    CRITICAL: {
      label: 'CRITICAL EMERGENCY',
      action: 'Emergency Siren Active — Limit equilibrium failure imminent (FoS < 1.0)',
      colorText: 'text-red-800 dark:text-red-300',
      colorBg: 'bg-red-50 dark:bg-red-950/50',
      colorBorder: 'border-red-300 dark:border-red-500/60',
      strokeGradient: '#ef4444',
      icon: ShieldAlert,
      badgeClass: 'badge-critical',
    },
  };

  const config = levelConfig[risk.risk_level];
  const LevelIcon = config.icon;
  const TrendIcon = risk.trend === 'rising' ? TrendingUp : risk.trend === 'falling' ? TrendingDown : Minus;

  const fos = risk.fos_estimate;
  const fosStatus = fos < 1.0 ? { label: 'FAILURE IMMINENT (FoS < 1.0)', color: 'text-red-400' }
    : fos < 1.3 ? { label: 'MARGINAL (1.0–1.3)', color: 'text-amber-400' }
    : { label: 'STABLE (> 1.3)', color: 'text-emerald-400' };

  // SVG Gauge calculations
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scorePct / 100) * circumference;

  return (
    <div className={clsx("card h-full flex flex-col justify-between rounded-3xl relative overflow-hidden transition-all duration-300 shadow-2xl", glowClass)}>
      {/* Top Header */}
      <div className="card-header border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LevelIcon className={clsx("w-4 h-4", config.colorText)} />
          <span className="text-slate-100 font-mono">Hazard Assessment Engine</span>
        </div>
        <span className={clsx("badge", config.badgeClass)}>
          {risk.risk_level}
        </span>
      </div>

      <div className="card-body flex-1 flex flex-col justify-between py-4 space-y-3.5">
        {/* Risk Percentage & Circular SVG Arc Meter */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className={clsx("text-6xl font-black font-mono tracking-tight tabular-nums", config.colorText)}>
                {scorePct}
              </span>
              <span className={clsx("text-2xl font-bold font-mono", config.colorText)}>%</span>
            </div>
            <div className="text-xs font-bold text-slate-200 font-mono tracking-wide mt-1">
              {config.label}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Confidence: <strong className="text-slate-200">{(risk.confidence * 100).toFixed(0)}%</strong>
            </div>
          </div>

          {/* Glowing Circular Gauge */}
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-slate-900 stroke-current"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={config.strokeGradient}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out drop-shadow-md"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <TrendIcon className={clsx("w-4 h-4 mb-0.5", risk.trend === 'rising' ? 'text-red-400' : risk.trend === 'falling' ? 'text-emerald-400' : 'text-slate-400')} />
              <span className="text-[9px] font-mono font-bold uppercase text-slate-300">{risk.trend}</span>
            </div>
          </div>
        </div>

        {/* 4-Segment Hazard Level Meter */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-4 gap-1.5 h-2">
            <div className={clsx(
              "rounded-full transition-all duration-300",
              risk.risk_level === 'LOW' ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 ring-1 ring-emerald-400" : "bg-emerald-950/60 border border-emerald-900/40"
            )} />
            <div className={clsx(
              "rounded-full transition-all duration-300",
              risk.risk_level === 'MODERATE' ? "bg-amber-500 shadow-sm shadow-amber-500/50 ring-1 ring-amber-400" : "bg-amber-950/60 border border-amber-900/40"
            )} />
            <div className={clsx(
              "rounded-full transition-all duration-300",
              risk.risk_level === 'HIGH' ? "bg-orange-500 shadow-sm shadow-orange-500/50 ring-1 ring-orange-400" : "bg-orange-950/60 border border-orange-900/40"
            )} />
            <div className={clsx(
              "rounded-full transition-all duration-300",
              risk.risk_level === 'CRITICAL' ? "bg-red-500 shadow-sm shadow-red-500/50 ring-1 ring-red-400" : "bg-red-950/60 border border-red-900/40"
            )} />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5">
            <span className={risk.risk_level === 'LOW' ? 'text-emerald-400 font-bold' : ''}>NOMINAL (0-25)</span>
            <span className={risk.risk_level === 'MODERATE' ? 'text-amber-400 font-bold' : ''}>ADVISORY (25-50)</span>
            <span className={risk.risk_level === 'HIGH' ? 'text-orange-400 font-bold' : ''}>WARNING (50-75)</span>
            <span className={risk.risk_level === 'CRITICAL' ? 'text-red-400 font-bold' : ''}>CRITICAL (75-100)</span>
          </div>
        </div>

        {/* Geotechnical Stability Indicator (FoS) */}
        <div className="bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl p-3 font-mono shadow-xs">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              Bishop Factor of Safety (FoS)
            </span>
            <span className={clsx("font-black text-base tabular-nums", fosStatus.color)}>
              {fos.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Infinite slope limit equilibrium</span>
            <span className={clsx("font-bold", fosStatus.color)}>{fosStatus.label}</span>
          </div>
        </div>

        {/* Action / Operational Advisory Recommendation */}
        <div className={clsx("px-3.5 py-2.5 rounded-2xl border text-xs font-mono leading-relaxed shadow-xs", config.colorBg, config.colorBorder, config.colorText)}>
          <span className="font-bold uppercase tracking-wider block text-[9.5px] opacity-90 mb-0.5">Response Protocol:</span>
          {config.action}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-black/60 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400">
        <span>Engine: <strong className="text-slate-800 dark:text-slate-200">XGBoost v0.2-Physics</strong></span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          Physics-ML Calibrated
        </span>
      </div>
    </div>
  );
}
