import React from 'react';
import { useMockTelemetry } from '../hooks/useMockTelemetry';
import LoadingState from '../components/common/LoadingState';
import PrototypeLabel from '../components/common/PrototypeLabel';
import { Server, Settings, Database, RefreshCw, AlertTriangle, Cpu, Layers, ShieldCheck, Sliders, Radio, CheckCircle2, Wifi, FlaskConical, MessageSquare, PhoneCall, Sun, Moon, Monitor } from 'lucide-react';
import { Scenario } from '../mock/generator';
import clsx from 'clsx';
import BlynkIntegrationPanel from '../components/dashboard/BlynkIntegrationPanel';
import { useTheme } from '../context/ThemeContext';

const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { 
    state, 
    scenario, 
    setScenario, 
    setInterval: setUpdateInterval, 
    reset, 
    mode, 
    setMode, 
    demoStage, 
    setDemoStage,
    connectionState,
    setConnectionState,
  } = useMockTelemetry();
  
  const [smsStatus, setSmsStatus] = React.useState<{
    enabled: boolean;
    recipients_count: number;
    min_severity: string;
    sent_today: number;
    max_per_day: number;
    quota_remaining: number;
  } | null>(null);

  React.useEffect(() => {
    fetch('/api/alerts/sms-status')
      .then((r) => r.json())
      .then((data) => setSmsStatus(data))
      .catch(() => {});
  }, []);
  
  if (!state) return <LoadingState message="Loading system configuration..." />;

  const isHardware = mode === 'HARDWARE';
  const isDemo = mode === 'DEMO';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans">
      {/* ── Section Header (matches Metrics page format) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
            Hardware & Ingestion Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300 font-normal mt-0.5">
            Configure telemetry ingestion: Real ESP32 Sensors via LoRa Gateway, Fast2SMS Cellular, or Geotechnical Scenarios
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Gateway: <strong>Online</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-xs">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Fast2SMS: <strong>{smsStatus?.enabled ? 'Active' : 'Configured'}</strong></span>
          </div>
        </div>
      </div>

      {/* Section 0: UI Theme & Mission Control Appearance */}
      <section className="card p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Appearance & Interface Theme
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Active: <strong className="text-slate-800 dark:text-slate-200 uppercase font-mono">{theme}</strong>
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Select your preferred display theme. Dark mode provides an ergonomic, low-light operations room experience with high-contrast safety indicators.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light Theme */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={clsx(
              "p-4 rounded-xl border text-left flex flex-col justify-between transition-all",
              theme === 'light'
                ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-500/20"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <Sun className="w-5 h-5 text-amber-500" />
              {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Light Theme</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">High-key daylight visibility</div>
            </div>
          </button>

          {/* Dark Theme */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={clsx(
              "p-4 rounded-xl border text-left flex flex-col justify-between transition-all",
              theme === 'dark'
                ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-500/20"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <Moon className="w-5 h-5 text-blue-400" />
              {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Dark Mission Control</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Deep obsidian operations room</div>
            </div>
          </button>

          {/* System Default */}
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={clsx(
              "p-4 rounded-xl border text-left flex flex-col justify-between transition-all",
              theme === 'system'
                ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-500/20"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <Monitor className="w-5 h-5 text-purple-400" />
              {theme === 'system' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">System Default</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Synchronized with OS preference</div>
            </div>
          </button>
        </div>
      </section>

      {/* Section 1: Data Source Mode Switcher */}
      <section className="card">
        <div className="card-header flex items-center justify-between border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-xs uppercase tracking-wider">Telemetry Data Ingestion Source</span>
          </div>
          <span className={clsx(
            "badge text-[10px]",
            isDemo ? "badge-blue" : isHardware ? "badge-low" : "badge-medium"
          )}>
            Current Mode: {mode}
          </span>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mode 1: Physical Demonstration */}
            <div
              onClick={() => setMode('DEMO')}
              className={clsx(
                "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                isDemo
                  ? "bg-blue-50/50 dark:bg-blue-950/40 border-blue-500 shadow-sm"
                  : "bg-white dark:bg-slate-900/60 border-[#e5e9f2] dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700 opacity-80"
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical className={clsx("w-5 h-5", isDemo ? "text-blue-600 dark:text-blue-400 animate-pulse" : "text-slate-400")} />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">FIELD SCENARIO</span>
                  </div>
                  {isDemo && (
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-[10px] font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-sans leading-relaxed">
                  Controlled geotechnical progression: Dry soil baseline $\rightarrow$ Precipitation $\rightarrow$ Pore saturation $\rightarrow$ Shear displacement.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
                <div>• Progression: <span className="text-slate-800 dark:text-slate-200 font-semibold">6 Continuous States</span></div>
                <div>• Active State: <span className="text-blue-600 dark:text-blue-400 font-bold">Stage {demoStage}</span></div>
                <div>• Endpoint: <span className="text-slate-800 dark:text-slate-200">/api/demo/state</span></div>
              </div>
            </div>

            {/* Mode 2: Real ESP32 Hardware */}
            <div
              onClick={() => setMode('HARDWARE')}
              className={clsx(
                "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                isHardware
                  ? "bg-red-50/50 dark:bg-red-950/40 border-red-500 shadow-sm"
                  : "bg-white dark:bg-slate-900/60 border-[#e5e9f2] dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700 opacity-80"
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className={clsx("w-5 h-5", isHardware ? "text-red-600 dark:text-red-400 animate-pulse" : "text-slate-400")} />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">LIVE HARDWARE</span>
                  </div>
                  {isHardware && (
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-sans leading-relaxed">
                  Receives real sensor packets from the physical <strong>ESP32 Sensor Node (LG-N01)</strong> over LoRa via <strong>LG-GW01</strong> gateway.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
                <div>• Ingest URL: <span className="text-slate-800 dark:text-slate-200">/api/telemetry</span></div>
                <div>• Stream URL: <span className="text-slate-800 dark:text-slate-200">/ws/telemetry</span></div>
                <div>• Protocol: <span className="text-slate-800 dark:text-slate-200">LoRa 433MHz + Wi-Fi</span></div>
              </div>
            </div>

            {/* Mode 3: Synthetic Simulation */}
            <div
              onClick={() => setMode('SIMULATION')}
              className={clsx(
                "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                mode === 'SIMULATION'
                  ? "bg-amber-50/50 dark:bg-amber-950/40 border-amber-500 shadow-sm"
                  : "bg-white dark:bg-slate-900/60 border-[#e5e9f2] dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700 opacity-80"
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className={clsx("w-5 h-5", mode === 'SIMULATION' ? "text-amber-600 dark:text-amber-400" : "text-slate-400")} />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">SIMULATION</span>
                  </div>
                  {mode === 'SIMULATION' && (
                    <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-mono text-[10px] font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-sans leading-relaxed">
                  Generates smooth continuous synthetic environmental and geological time-series profiles with controllable parameters.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
                <div>• Profile: <span className="text-slate-800 dark:text-slate-200 font-semibold">{scenario}</span></div>
                <div>• Rate: <span className="text-slate-800 dark:text-slate-200">3.0s interval</span></div>
                <div>• Engine: <span className="text-slate-800 dark:text-slate-200">Gray-Box FoS</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blynk IoT Cloud Hardware Integration */}
      <BlynkIntegrationPanel reading={state.currentReading} risk={state.currentRisk} />

      {/* Section 2: Offline Connection State Tester */}
      <section className="card">
        <div className="card-header flex items-center justify-between border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-wider">Offline-First Operational Network Tester</span>
          </div>
          <span className={clsx(
            "badge font-mono text-[10px]",
            connectionState === 'ONLINE' ? "badge-elite" :
            connectionState === 'DEGRADED' ? "badge-medium" : "badge-low"
          )}>
            STATUS: {connectionState}
          </span>
        </div>
        <div className="card-body space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 font-sans">
            Terrawarn-Ai operates completely offline on local compute with zero cloud or internet dependency. Use the controls below to test gateway buffering and local edge processing during network degradation or total offline conditions:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <button
              onClick={() => setConnectionState('ONLINE')}
              className={clsx(
                "p-3 rounded-xl border text-left transition-all",
                connectionState === 'ONLINE'
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <div className="font-bold text-sm font-sans">1. ONLINE</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-1">Normal real-time LoRa stream & WebSocket broadcast.</p>
            </button>

            <button
              onClick={() => setConnectionState('DEGRADED')}
              className={clsx(
                "p-3 rounded-xl border text-left transition-all",
                connectionState === 'DEGRADED'
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 text-amber-900 dark:text-amber-200 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <div className="font-bold text-sm font-sans">2. DEGRADED</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-1">High packet latency / sporadic frame loss simulation.</p>
            </button>

            <button
              onClick={() => setConnectionState('OFFLINE')}
              className={clsx(
                "p-3 rounded-xl border text-left transition-all",
                connectionState === 'OFFLINE'
                  ? "bg-red-50 dark:bg-red-950/40 border-red-400 dark:border-red-500 text-red-900 dark:text-red-200 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <div className="font-bold text-sm font-sans">3. OFFLINE</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-1">Zero internet. Gateway ring buffers; local DB & AI stay live.</p>
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Geotechnical Soil Parameters (FoS) */}
      <section className="card">
        <div className="card-header flex items-center justify-between border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-xs uppercase tracking-wider">Geotechnical Soil & Limit Equilibrium Model Parameters</span>
          </div>
          <span className="font-mono text-[10.5px] font-bold text-slate-500 dark:text-slate-300">Skempton-DeLory Model</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/10">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider block font-sans">Effective Cohesion (c')</span>
              <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">5.00 kPa</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">Colluvium baseline</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/10">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider block font-sans">Friction Angle (φ')</span>
              <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">25.0°</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">Internal shear angle</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/10">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider block font-sans">Saturated Unit Weight</span>
              <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">18.0 kN/m³</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">γ_sat soil mass</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/10">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider block font-sans">Slip Depth (z)</span>
              <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">1.50 m</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">Failure shear plane</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-sans leading-relaxed">
            Note: The physics engine applies dynamic degradation of cohesion $c'$ and friction angle $\phi'$ proportionally as volumetric soil moisture increases from baseline to saturation, computing continuous Factor of Safety ($FoS$) approximations.
          </p>
        </div>
      </section>

      {/* Section 4: Fast2SMS Cellular Alerting (Quick SMS Route) */}
      <section className="card">
        <div className="card-header flex items-center justify-between border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-wider">Fast2SMS Live Cellular Alerting (Quick SMS Route)</span>
          </div>
          <span className={clsx(
            "badge text-[10px]",
            smsStatus?.enabled ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700" : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
          )}>
            {smsStatus?.enabled ? "DISPATCH ACTIVE" : "DISABLED"}
          </span>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/10">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase block font-sans">Status</span>
              <strong className={clsx("text-sm mt-1 block", smsStatus?.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300")}>
                {smsStatus?.enabled ? "Enabled" : "Disabled"}
              </strong>
              <span className="text-[10px] text-slate-500 dark:text-slate-300 font-sans">Automatic push</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/10">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase block font-sans">Configured Recipients</span>
              <strong className="text-sm text-slate-900 dark:text-slate-100 mt-1 block font-mono">
                {smsStatus ? `${smsStatus.recipients_count} Official${smsStatus.recipients_count === 1 ? '' : 's'}` : "Loading..."}
              </strong>
              <span className="text-[10px] text-slate-500 dark:text-slate-300 font-sans">Batch delivered</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/10">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase block font-sans">Trigger Severity</span>
              <strong className="text-sm text-orange-600 dark:text-orange-400 mt-1 block font-mono">
                &ge; {smsStatus?.min_severity || "HIGH"}
              </strong>
              <span className="text-[10px] text-slate-500 dark:text-slate-300 font-sans">HIGH &amp; CRITICAL</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/10">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase block font-sans">Daily Free Plan Cap</span>
              <strong className="text-sm text-blue-600 dark:text-blue-400 mt-1 block font-mono">
                {smsStatus ? `${smsStatus.sent_today} / ${smsStatus.max_per_day}` : "Loading..."}
              </strong>
              <span className="text-[10px] text-slate-500 dark:text-slate-300 font-sans">
                {smsStatus ? `${smsStatus.quota_remaining} remaining today` : "Resets midnight UTC"}
              </span>
            </div>
          </div>

          {/* Quota Progress Bar */}
          {smsStatus && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-300">
                <span>Daily Quota Usage ({smsStatus.sent_today} of {smsStatus.max_per_day} sent)</span>
                <span>{Math.round((smsStatus.sent_today / Math.max(1, smsStatus.max_per_day)) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className={clsx(
                    "h-full rounded-full transition-all duration-500",
                    smsStatus.sent_today >= smsStatus.max_per_day
                      ? "bg-red-500"
                      : smsStatus.sent_today >= smsStatus.max_per_day * 0.75
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, Math.round((smsStatus.sent_today / Math.max(1, smsStatus.max_per_day)) * 100))}%` }}
                />
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-slate-300 font-sans leading-relaxed">
            <strong>Offline-First Best-Effort Delivery:</strong> Fast2SMS Quick SMS is decoupled from primary telemetry processing. In the event of no internet connectivity, gateway failure, or daily quota exhaustion, alerts are still logged to local SQLite and broadcast via WebSockets without blocking.
          </p>
        </div>
      </section>

      {/* Section 5: System Runtime Metadata */}
      <section className="card">
        <div className="card-header flex items-center justify-between border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-xs uppercase tracking-wider">System Runtime & Architecture</span>
          </div>
          <span className="badge badge-elite text-[10px]">ONLINE</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase block">Application</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold mt-0.5 block">Terrawarn-Ai</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase block">Version</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold mt-0.5 block">v0.2.0-modular</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase block">AI Model</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold mt-0.5 block">XGBoost 2.0.3</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase block">Explainer</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold mt-0.5 block">SHAP TreeExplainer</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
