import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Lock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Key, Radio, Terminal } from 'lucide-react';
import { SecurityEvent } from '../../types';
import { formatTime, formatRelativeTime } from '../../utils/formatters';
import clsx from 'clsx';
import { useI18n } from '../../i18n/LanguageContext';

interface Props {
  events: SecurityEvent[];
  onSimulateReplay: () => void;
  onSimulateUnauthorized: () => void;
}

export default function SecurityPanel({ events, onSimulateReplay, onSimulateUnauthorized }: Props) {
  const { tx } = useI18n();
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const filteredEvents = events.filter((e) => {
    if (filterAction === 'ALL') return true;
    return e.action === filterAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ACCEPTED':
        return {
          label: 'ACCEPT',
          icon: CheckCircle2,
          className: 'bg-emerald-950 text-emerald-300 border-emerald-800',
        };
      case 'REJECTED_REPLAY':
        return {
          label: 'REJECT — REPLAY DETECTED',
          icon: AlertTriangle,
          className: 'bg-red-950 text-red-300 border-red-800 animate-pulse',
        };
      case 'REJECTED_UNAUTHORIZED':
        return {
          label: 'REJECT — UNAUTHORIZED',
          icon: XCircle,
          className: 'bg-purple-950 text-purple-300 border-purple-800',
        };
      default:
        return {
          label: action,
          icon: ShieldAlert,
          className: 'bg-amber-950 text-amber-300 border-amber-800',
        };
    }
  };

  return (
    <div className="card h-full flex flex-col justify-between">
      {/* Header */}
      <div className="card-header border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span className="font-bold">{tx('Edge Cybersecurity & Replay Defense Guard')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> REPLAY GUARD: ACTIVE
          </span>
        </div>
      </div>

      <div className="card-body p-3.5 flex-1 flex flex-col justify-between space-y-3">
        {/* Security Posture Status Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
          <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 block">DEVICE ID WHITELIST</span>
            <strong className="text-slate-200">LG-N01 .. LG-N04</strong>
          </div>
          <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 block">REPLAY DETECTION</span>
            <strong className="text-emerald-400">SEQUENCE WATERMARK</strong>
          </div>
          <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 block">MESSAGE INTEGRITY</span>
            <strong className="text-cyan-400">CRC-16 CCITT (0xAA)</strong>
          </div>
          <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 block">GATEWAY INGEST AUTH</span>
            <strong className="text-slate-200">X-API-KEY / LOCAL REST</strong>
          </div>
        </div>

        {/* Interactive Threat Simulation Toolbar (For Demonstrator / SIH Evaluator) */}
        <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[11px] font-mono font-bold text-slate-300">{tx('Live Attack Simulator:')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSimulateReplay}
              className="px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 text-[10px] font-mono font-bold uppercase transition-colors"
              title="Test Replay Attack: Transmits duplicate sequence number 1842"
            >
              {tx('Simulate Replay Attack (Seq #1842)')}
            </button>
            <button
              onClick={onSimulateUnauthorized}
              className="px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800 text-[10px] font-mono font-bold uppercase transition-colors"
              title="Test Rogue Device: Transmits with unregistered ID ROGUE-NODE-99"
            >
              {tx('Simulate Rogue Node')}
            </button>
          </div>
        </div>

        {/* Security Audit Events Stream */}
        <div className="space-y-1.5 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>AUDIT LOG STREAM ({filteredEvents.length} Events)</span>
            <div className="flex gap-1">
              {['ALL', 'ACCEPTED', 'REJECTED_REPLAY', 'REJECTED_UNAUTHORIZED'].map((act) => (
                <button
                  key={act}
                  onClick={() => setFilterAction(act)}
                  className={clsx(
                    "px-1.5 py-0.5 rounded text-[9px] uppercase font-mono transition-colors",
                    filterAction === act
                      ? "bg-cyan-700 text-white font-bold"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {act === 'REJECTED_REPLAY' ? 'REPLAY' : act === 'REJECTED_UNAUTHORIZED' ? 'UNAUTH' : act}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg overflow-y-auto max-h-[160px] bg-slate-950/60 font-mono text-xs">
            {filteredEvents.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">
                {tx('NO SECURITY EVENTS RECORDED')}
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const badge = getActionBadge(evt.action);
                const BadgeIcon = badge.icon;
                return (
                  <div key={evt.id} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-start sm:items-center gap-2 min-w-0">
                      <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 flex items-center gap-1", badge.className)}>
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] text-slate-200 truncate">
                          Node: <strong className="text-cyan-300">{evt.node_id}</strong>
                          {evt.sequence_num !== undefined && (
                            <span className="text-slate-400 ml-1.5">| Seq: <strong className="text-slate-100">#{evt.sequence_num}</strong></span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5 line-clamp-1">
                          {evt.reason}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatTime(evt.timestamp)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3.5 py-1.5 bg-slate-950/90 border-t border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-400">
        <span>SECURITY COMPLIANCE: SIH-2026 PROTOTYPE LEVEL</span>
        <span className="text-cyan-400">Threat Model in docs/SECURITY.md</span>
      </div>
    </div>
  );
}
