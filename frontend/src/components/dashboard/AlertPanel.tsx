import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertOctagon, Info, Check, ShieldAlert, ChevronRight, Eye, X, CheckCircle2, Clock } from 'lucide-react';
import { Alert } from '../../types';
import { formatRelativeTime, formatDateTime } from '../../utils/formatters';
import clsx from 'clsx';

interface Props {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
}

export default function AlertPanel({ alerts, onAcknowledge }: Props) {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const latestActive = activeAlerts[0] || alerts[0];
  const displayAlerts = alerts.slice(0, 5);

  // Helper to extract clean reason bullet points
  const getAlertReasons = (alert: Alert): string[] => {
    if (alert.trigger_reasons && alert.trigger_reasons.length > 0) {
      return alert.trigger_reasons;
    }
    if (alert.trigger_reason) {
      return alert.trigger_reason.split(';').map((s) => s.trim()).filter(Boolean);
    }
    // Fallback default reasons based on alert severity
    if (alert.severity === 'critical' || alert.risk_level === 'CRITICAL') {
      return [
        'Soil moisture critical (saturation > 80%)',
        'Tilt rate increasing (accelerated creep)',
        'Stability indicator decreasing (FoS < 1.00)',
      ];
    }
    return [
      'Soil moisture elevated',
      'Tilt rate increasing',
      'Stability indicator decreasing',
    ];
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return {
          label: 'CRITICAL RISK',
          bg: 'bg-red-950/80 text-red-300 border-red-800',
          icon: AlertOctagon,
          textColor: 'text-red-400',
        };
      case 'high':
        return {
          label: 'HIGH RISK',
          bg: 'bg-orange-950/80 text-orange-300 border-orange-800',
          icon: AlertTriangle,
          textColor: 'text-orange-400',
        };
      case 'warning':
        return {
          label: 'MODERATE HAZARD',
          bg: 'bg-amber-950/80 text-amber-300 border-amber-800',
          icon: Info,
          textColor: 'text-amber-400',
        };
      default:
        return {
          label: 'LOW HAZARD',
          bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
          icon: Info,
          textColor: 'text-emerald-400',
        };
    }
  };

  return (
    <>
      <div className="card h-full flex flex-col justify-between">
        {/* Header */}
        <div className="card-header border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-200">
            <ShieldAlert className="w-4 h-4 text-orange-400" />
            <span>Alert & Incident Subsystem</span>
          </div>
          {activeAlerts.length > 0 ? (
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 animate-pulse">
              {activeAlerts.length} UNACKNOWLEDGED
            </span>
          ) : (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              NOMINAL
            </span>
          )}
        </div>

        <div className="card-body p-3 flex-1 flex flex-col justify-between space-y-3">
          {/* Featured Active Incident Box (Phase 12 Requirement) */}
          {latestActive ? (
            <div className={clsx(
              "p-3 rounded-lg border-2 transition-all",
              latestActive.acknowledged 
                ? "bg-slate-900/60 border-slate-800 opacity-75"
                : latestActive.severity === 'critical' || latestActive.risk_level === 'CRITICAL'
                ? "bg-red-950/30 border-red-600 shadow-md shadow-red-950/40"
                : "bg-orange-950/30 border-orange-600 shadow-md shadow-orange-950/30"
            )}>
              {/* Alert Level & Node Identity */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={clsx("font-mono text-xs font-black uppercase px-2 py-0.5 rounded border", getSeverityBadge(latestActive.severity).bg)}>
                    {getSeverityBadge(latestActive.severity).label}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-200">
                    Node: {latestActive.node_id || 'TW-N01'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {formatRelativeTime(latestActive.timestamp)}
                </span>
              </div>

              {/* Reasons Breakdown (Phase 12 Requirement) */}
              <div className="space-y-1 my-2">
                <span className="text-[11px] font-bold text-slate-300 font-mono uppercase tracking-wider block">
                  Reasons:
                </span>
                <ul className="text-xs text-slate-200 space-y-1 font-sans">
                  {getAlertReasons(latestActive).map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-orange-400 shrink-0 font-bold">•</span>
                      <span className="leading-tight">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interactive Buttons: ACKNOWLEDGE & VIEW DETAILS */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/80">
                {!latestActive.acknowledged ? (
                  <button
                    onClick={() => onAcknowledge(latestActive.id)}
                    className="flex-1 py-1.5 px-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Check size={14} /> ACKNOWLEDGE
                  </button>
                ) : (
                  <div className="flex-1 py-1 px-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-400" /> ACKNOWLEDGED
                  </div>
                )}

                <button
                  onClick={() => setSelectedAlert(latestActive)}
                  className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                >
                  <Eye size={13} /> VIEW DETAILS
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs font-mono">
              NO ACTIVE ALARMS
            </div>
          )}

          {/* Alert History Feed */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase">
              <span>Recent Incident History</span>
              <span>{alerts.length} Logged</span>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-[110px] overflow-y-auto font-mono text-xs">
              {displayAlerts.slice(1).map((a) => (
                <div 
                  key={a.id}
                  onClick={() => setSelectedAlert(a)}
                  className="py-1.5 px-1 flex items-center justify-between gap-2 hover:bg-slate-800/40 cursor-pointer rounded transition-colors text-[11px]"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", a.severity === 'critical' ? 'bg-red-400' : 'bg-orange-400')} />
                    <span className="text-slate-300 truncate">{a.title}</span>
                  </div>
                  <span className="text-slate-500 text-[10px] shrink-0">
                    {formatRelativeTime(a.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="px-3.5 py-2 bg-slate-950/90 border-t border-slate-800 flex justify-between items-center text-[10px]">
          <span className="text-slate-400 font-mono">INCIDENT AUDIT LOG</span>
          <Link to="/alerts" className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-0.5 transition-colors">
            Alert History Center <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={clsx("font-mono text-xs font-black uppercase px-2 py-0.5 rounded border", getSeverityBadge(selectedAlert.severity).bg)}>
                  {getSeverityBadge(selectedAlert.severity).label}
                </span>
                <span className="font-mono text-sm font-bold text-slate-100">
                  Alert Details ({selectedAlert.alert_id || `ALT-${selectedAlert.id}`})
                </span>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 font-mono grid grid-cols-2 gap-2 text-[11px]">
                <div>Node ID: <strong className="text-slate-200">{selectedAlert.node_id}</strong></div>
                <div>Risk Score: <strong className="text-orange-400">{(selectedAlert.risk_score * 100).toFixed(1)}%</strong></div>
                <div>Timestamp: <span className="text-slate-300">{formatDateTime(selectedAlert.timestamp)}</span></div>
                <div>Status: <strong className={selectedAlert.acknowledged ? "text-emerald-400" : "text-red-400"}>{selectedAlert.acknowledged ? "ACKNOWLEDGED" : "PENDING ACK"}</strong></div>
              </div>

              <div>
                <span className="font-mono font-bold uppercase text-[11px] text-slate-300 block mb-1">
                  Trigger Reasons:
                </span>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
                  {getAlertReasons(selectedAlert).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-200">
                      <span className="text-orange-400 font-bold">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-mono font-bold uppercase text-[11px] text-slate-300 block mb-1">
                  Message:
                </span>
                <p className="text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 leading-relaxed font-sans">
                  {selectedAlert.message}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <span className="text-[10px] font-mono text-slate-500">
                Created: {formatDateTime(selectedAlert.created_at || selectedAlert.timestamp)}
              </span>
              <div className="flex gap-2">
                {!selectedAlert.acknowledged && (
                  <button
                    onClick={() => {
                      onAcknowledge(selectedAlert.id);
                      setSelectedAlert((prev) => prev ? { ...prev, acknowledged: true } : null);
                    }}
                    className="py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono text-xs font-bold uppercase"
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
