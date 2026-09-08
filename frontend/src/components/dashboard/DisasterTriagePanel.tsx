import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, PhoneCall, Truck, AlertTriangle, Users, 
  ChevronRight, Building2, CheckCircle, Radio
} from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../../i18n/LanguageContext';

interface TriageItem {
  rank: number;
  district: string;
  state: string;
  priorityTier: string;
  score: number;
  recommendedDispatch: string[];
  dcContact: string;
  sdrfContact: string;
  sheltersReady: number;
  populationAtRisk: number;
}

export const DisasterTriagePanel: React.FC = () => {
  const { tx } = useI18n();
  const [triageData, setTriageData] = useState<TriageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/ner/triage')
      .then((res) => res.json())
      .then((data) => setTriageData(data || []))
      .catch((err) => console.warn('Failed to load triage data:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card overflow-hidden flex flex-col space-y-3 p-4 font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tx('Disaster Response Triage & Deployment Matrix')}
            </h3>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              {tx('Prioritized Emergency Allocation for District Disaster Management (NDRF / SDRF / BRO)')}
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-[10px] font-mono font-bold">
          {tx('LIVE TRIAGE')}
        </span>
      </div>

      <div className="space-y-2.5">
        {triageData.map((item) => {
          const isP1 = item.priorityTier.startsWith('P1');
          const isP2 = item.priorityTier.startsWith('P2');

          return (
            <div
              key={item.rank}
              className={clsx(
                "p-3 rounded-xl border text-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3",
                isP1 
                  ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40" 
                  : isP2 
                    ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40" 
                    : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-white/5"
              )}
            >
              {/* Left Details */}
              <div className="flex items-start gap-3">
                <div className={clsx(
                  "w-7 h-7 rounded-xl flex items-center justify-center font-mono font-extrabold text-xs shrink-0",
                  isP1 ? "bg-red-600 text-white" : isP2 ? "bg-amber-600 text-white" : "bg-blue-600 text-white"
                )}>
                  #{item.rank}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.district}
                    </span>
                    <span className="text-[10.5px] font-semibold text-slate-500">
                      ({item.state})
                    </span>
                    <span className={clsx(
                      "px-2 py-0.2 rounded text-[9.5px] font-mono font-bold uppercase",
                      isP1 ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                    )}>
                      {item.priorityTier.split(' - ')[0]}
                    </span>
                  </div>

                  <ul className="mt-1.5 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    {item.recommendedDispatch.map((rec, rIdx) => (
                      <li key={rIdx} className="flex items-center gap-1.5">
                        <Truck className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{tx(rec)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Contacts & Risk Stats */}
              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-2 md:pt-0 border-slate-200 dark:border-white/10 shrink-0">
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {tx('Population at Risk:')} <strong className="text-slate-800 dark:text-slate-200">{item.populationAtRisk.toLocaleString()}</strong>
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {tx('Ready Shelters:')} <strong className="text-emerald-600">{item.sheltersReady} {tx('Centers')}</strong>
                </div>
                <div className="mt-1 text-[10.5px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <PhoneCall className="w-3 h-3" />
                  <span>{item.sdrfContact}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DisasterTriagePanel;
