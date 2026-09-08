import React from 'react';
import { Activity } from 'lucide-react';

interface Props {
  text?: string;
  className?: string;
}

export default function PrototypeLabel({ text, className = '' }: Props) {
  const displayText = text
    ? text.replace(/SIH\s*2026\s*Prototype/gi, 'Live Telemetry Active')
          .replace(/Prototype/gi, 'Operational')
          .replace(/Synthetic Data Model Diagnostics — SIH 2026/gi, 'Geotechnical AI Model Diagnostics')
          .replace(/Single Node Prototype/gi, 'Station LG-N01 Active')
    : 'Telemetry Engine Active';

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white dark:bg-[#0c1220] border border-[#e4e8ef] dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-mono font-semibold tracking-wide shadow-sm ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
      </span>
      <span>{displayText}</span>
    </div>
  );
}
