import React from 'react';
import { SensorNode, TelemetryReading } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';
import { CheckCircle2, XCircle, Cpu, Radio, BatteryMedium } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../../i18n/LanguageContext';

interface Props {
  node: SensorNode | null;
  reading: TelemetryReading | null;
}

export default function DeviceHealth({ node, reading }: Props) {
  const { tx } = useI18n();
  if (!node) {
    return (
      <div className="card h-full min-h-[220px] flex items-center justify-center p-4 text-slate-400 text-xs">
        <Cpu className="w-5 h-5 animate-pulse mr-2" /> {tx('Initializing Node Diagnostics...')}
      </div>
    );
  }

  const batteryPct = reading?.battery_pct ?? 0;
  const batteryColor = batteryPct > 50 ? 'bg-[#10b981]' : (batteryPct > 20 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]');

  const SensorItem = ({ label, ok }: { label: string; ok: boolean }) => (
    <div className="flex items-center justify-between text-[11px] py-1.5 border-b border-slate-100 dark:border-white/10 last:border-0 font-medium">
      <span className="text-slate-600 dark:text-slate-200">{label}</span>
      {ok ? (
        <span className="flex items-center gap-1 text-[#10b981] font-bold text-[10.5px]">
          <CheckCircle2 size={13} /> {tx('OK')}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[#ef4444] font-bold text-[10.5px]">
          <XCircle size={13} /> {tx('FAIL')}
        </span>
      )}
    </div>
  );

  return (
    <div className="card h-full flex flex-col justify-between">
      {/* Header */}
      <div className="card-header border-b border-[#f1f5f9] dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-800 dark:text-white">
          <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-xs uppercase tracking-wider">{tx('Node Diagnostics')}</span>
        </div>
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          {node.id}
        </span>
      </div>

      <div className="card-body p-4 flex-1 flex flex-col justify-between space-y-3.5">
        {/* Core System Properties */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-white/10">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-wider block">{tx('Firmware')}</span>
            <span className="text-slate-800 dark:text-white font-mono text-xs font-bold">{node.firmware_version}</span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-wider block">{tx('Uptime')}</span>
            <span className="text-slate-800 dark:text-white font-mono text-xs font-bold">{node.uptime_hours.toFixed(1)} hrs</span>
          </div>
          <div className="col-span-2 pt-1.5 border-t border-slate-200/80 dark:border-white/10 flex justify-between items-center text-[10px]">
            <span className="text-slate-400 dark:text-slate-300 font-semibold">{tx('LAST TELEMETRY INGEST:')}</span>
            <span className="font-mono text-slate-700 dark:text-slate-100 font-bold">{formatRelativeTime(node.last_seen)}</span>
          </div>
        </div>

        {/* Sensor Bus Status */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300 mb-1">
            {tx('Sensor Hardware Channels')}
          </div>
          <SensorItem label={tx('Capacitive Moisture V2 (ADC)')} ok={node.sensors.soil_moisture} />
          <SensorItem label={tx('MPU6050 6-DOF IMU (I²C)')} ok={node.sensors.accelerometer} />
          <SensorItem label={tx('FC-37 Rain Surface (ADC/DIO)')} ok={node.sensors.rain_gauge} />
        </div>

        {/* Power Subsystem */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/10">
          <div className="flex justify-between text-[11px] font-mono mb-1.5">
            <span className="text-slate-500 dark:text-slate-300 flex items-center gap-1">
              <BatteryMedium className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300" />
              {tx('Li-Ion Cell:')}
            </span>
            <span className="text-slate-800 dark:text-white font-bold">
              {batteryPct}% <span className="text-slate-400 dark:text-slate-300 font-normal">({reading ? (reading.battery_mv / 1000).toFixed(2) : '--'}V)</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-300 ${batteryColor}`} style={{ width: `${batteryPct}%` }} />
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-t border-[#f1f5f9] dark:border-white/10 flex justify-between items-center text-[10px] font-sans text-slate-500 dark:text-slate-300">
        <span>{tx('Sampling Rate: 10s')}</span>
        <span className="text-[#10b981] font-semibold">{tx('RF Link Active')}</span>
      </div>
    </div>
  );
}
