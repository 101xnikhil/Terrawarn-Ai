import React from 'react';
import { Brain, Cpu, ArrowUpRight, ArrowDownRight, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { RiskAssessment } from '../../types';
import clsx from 'clsx';
import { useI18n } from '../../i18n/LanguageContext';

interface Props {
  risk: RiskAssessment | null;
}

export default function AIExplanation({ risk }: Props) {
  const { tx } = useI18n();
  if (!risk) {
    return (
      <div className="card h-full min-h-[280px] flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <Cpu className="w-6 h-6 animate-pulse mb-2 text-slate-400" />
        <span className="text-xs">{tx('Awaiting AI explainability inference...')}</span>
      </div>
    );
  }

  // Sort factors by absolute impact magnitude
  const sortedShap = [...(risk.shap_values || [])].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  const top3 = sortedShap.slice(0, 3);

  // Helper to convert technical contributions to clear plain language
  const formatHumanImpact = (displayName: string, contribution: number, value: number) => {
    const isRiskDriver = contribution > 0;
    
    if (displayName.toLowerCase().includes('factor of safety')) {
      if (value < 1.0) {
        return { text: 'decreasing stability (failure threshold reached)', isNegativeForSafety: true };
      } else if (value < 1.3) {
        return { text: 'decreasing stability (approaching threshold)', isNegativeForSafety: true };
      } else {
        return { text: 'providing stability margin', isNegativeForSafety: false };
      }
    }

    if (displayName.toLowerCase().includes('moisture')) {
      return isRiskDriver
        ? { text: 'increasing risk (pore pressure saturation)', isNegativeForSafety: true }
        : { text: 'stabilizing slope (low moisture saturation)', isNegativeForSafety: false };
    }

    if (displayName.toLowerCase().includes('rain')) {
      return isRiskDriver
        ? { text: 'increasing risk (precipitation load)', isNegativeForSafety: true }
        : { text: 'stabilizing (dry condition)', isNegativeForSafety: false };
    }

    if (displayName.toLowerCase().includes('tilt') || displayName.toLowerCase().includes('creep') || displayName.toLowerCase().includes('angle')) {
      return isRiskDriver
        ? { text: 'increasing risk (accelerating creep velocity)', isNegativeForSafety: true }
        : { text: 'within nominal angle bounds', isNegativeForSafety: false };
    }

    return isRiskDriver 
      ? { text: 'increasing risk', isNegativeForSafety: true }
      : { text: 'stabilizing factor', isNegativeForSafety: false };
  };

  return (
    <div className="card h-full flex flex-col justify-between">
      {/* Header */}
      <div className="card-header border-b border-[#f1f5f9] dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-800 dark:text-white">
          <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-xs uppercase tracking-wider font-sans">
            {tx('AI Hazard Explainability (SHAP)')}
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-100 dark:border-blue-800">
          {tx('SHAP Analysis')}
        </span>
      </div>

      <div className="card-body flex-1 flex flex-col justify-between space-y-3.5">
        {/* Core Question Header */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wide">
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>{tx('Why is the current risk')} {risk.risk_level}?</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5 font-sans">
            {tx('Top geotechnical factors identified by XGBoost & Bishop limit equilibrium model:')}
          </div>
        </div>

        {/* Top 3 Contributing Factors in plain human language */}
        <div className="space-y-2">
          {top3.map((shap, idx) => {
            const humanExp = formatHumanImpact(shap.display_name, shap.contribution, shap.value);
            const isDriver = shap.contribution > 0;

            return (
              <div 
                key={idx} 
                className={clsx(
                  "p-2.5 rounded-xl border text-xs transition-all",
                  isDriver 
                    ? "bg-red-50/60 dark:bg-red-950/40 border-red-100 dark:border-red-900/50 text-slate-800 dark:text-slate-100" 
                    : "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50 text-slate-800 dark:text-slate-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-400 dark:text-slate-400">{idx + 1}.</span>
                    <span className="text-slate-900 dark:text-white">{shap.display_name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-300 font-normal">
                      ({shap.value.toFixed(1)})
                    </span>
                  </div>
                  <span className={clsx("text-[11px] font-bold flex items-center gap-0.5", isDriver ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                    {isDriver ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {isDriver ? `+${shap.contribution.toFixed(2)}` : shap.contribution.toFixed(2)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-200 font-sans mt-0.5 ml-4">
                  — <span className={isDriver ? "text-red-700 dark:text-red-300 font-medium" : "text-emerald-700 dark:text-emerald-300 font-medium"}>{tx(humanExp.text)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prototype Validation Note */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl p-2.5 text-[10.5px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>{tx('Edge AI Model')}</strong> — {tx('Gray-box physics coupling with 100% offline SHAP TreeExplainer running on local edge gateway.')}
          </span>
        </div>
      </div>

      {/* Footer Model Tag */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-t border-[#f1f5f9] dark:border-white/10 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-300 font-sans">
        <span>XGBoost + SHAP TreeExplainer</span>
        <span className="text-blue-600 dark:text-blue-400 font-semibold">Confidence: {Math.round(risk.confidence * 100)}%</span>
      </div>
    </div>
  );
}
