import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, 
  Cpu, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Zap, 
  Play, 
  Square, 
  ExternalLink, 
  Save, 
  Activity, 
  Sliders 
} from 'lucide-react';
import clsx from 'clsx';

interface XGBoostConfig {
  api_url: string;
  timeout_seconds: number;
  auto_stream_enabled: boolean;
  auto_stream_interval_seconds: number;
  last_synced_at: string | null;
  last_error: string | null;
  server_info: {
    title?: string;
    version?: string;
    model_version?: string;
    latency_ms?: number;
    last_tested_at?: string;
  } | null;
}

interface TestResult {
  ok: boolean;
  target_url: string;
  latency_ms: number;
  server_title?: string;
  server_version?: string;
  health_status?: string;
  model_version?: string;
  has_telemetry_stream?: boolean;
  sample_telemetry?: any;
  sample_risk?: any;
  error?: string;
}

const XGBoostServerConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<XGBoostConfig>({
    api_url: 'http://34.131.240.174:8000',
    timeout_seconds: 5,
    auto_stream_enabled: false,
    auto_stream_interval_seconds: 5,
    last_synced_at: null,
    last_error: null,
    server_info: null,
  });

  const [inputUrl, setInputUrl] = useState('http://34.131.240.174:8000');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isAutoStreaming, setIsAutoStreaming] = useState(false);
  const [streamCount, setStreamCount] = useState(0);

  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load current configuration
  const loadConfig = async () => {
    try {
      const res = await fetch('/api/settings/xgboost');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data.api_url) {
          setInputUrl(data.api_url);
        }
      }
    } catch (e) {
      console.warn('Failed to load XGBoost server config:', e);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Handle Test Connection
  const handleTest = async (overrideUrl?: string) => {
    const urlToTest = overrideUrl || inputUrl;
    setIsTesting(true);
    setTestResult(null);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/settings/xgboost/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_url: urlToTest }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({
        ok: false,
        target_url: urlToTest,
        latency_ms: 0,
        error: e?.message || 'Network error or connection refused',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Handle Save Configuration
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/settings/xgboost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_url: inputUrl,
          timeout_seconds: config.timeout_seconds,
          auto_stream_enabled: isAutoStreaming,
          auto_stream_interval_seconds: config.auto_stream_interval_seconds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setSaveMessage('Configuration saved and active!');
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        setSaveMessage('Failed to save configuration.');
      }
    } catch (e: any) {
      setSaveMessage(`Error saving: ${e?.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Manual Single Sync
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await fetch('/api/settings/xgboost/sync', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        const risk = data.cloud_risk || {};
        setSyncFeedback(`Synced reading: Risk ${risk.risk_score || 0}% (${risk.risk_level || 'LOW'}) · Model: ${risk.model_version || 'prototype-xgboost-v1'}`);
        setStreamCount((c) => c + 1);
        setConfig((prev) => ({
          ...prev,
          last_synced_at: new Date().toISOString(),
        }));
      } else {
        setSyncFeedback(`Sync failed: ${data.detail || 'Bad Gateway'}`);
      }
    } catch (e: any) {
      setSyncFeedback(`Sync error: ${e?.message || e}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Auto-streaming loop
  useEffect(() => {
    if (isAutoStreaming) {
      handleSyncNow();
      const intervalMs = Math.max(2000, (config.auto_stream_interval_seconds || 5) * 1000);
      streamTimerRef.current = setInterval(() => {
        handleSyncNow();
      }, intervalMs);
    } else {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    }

    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
      }
    };
  }, [isAutoStreaming, config.auto_stream_interval_seconds]);

  return (
    <section className="card">
      <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2 text-slate-800 dark:text-white">
          <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-xs uppercase tracking-wider">
            External / Cloud XGBoost Server Integration
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAutoStreaming ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold animate-pulse">
              <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              LIVE AUTO-STREAMING ({streamCount})
            </span>
          ) : testResult?.ok ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {testResult.model_version || 'Connected'} ({testResult.latency_ms}ms)
            </span>
          ) : (
            <span className="badge badge-elite text-[10px]">RECONFIGURABLE</span>
          )}
        </div>
      </div>

      <div className="card-body space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
          Connect Terrawarn-Ai to an external machine learning service running on another device, cloud VM, or local IP. Whenever your server IP changes, simply update the URL below to reconnect dynamically without restarting.
        </p>

        {/* Server URL Input & Presets */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
            XGBoost Server IP / URL:
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://34.131.240.174:8000"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleTest()}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Zap className={clsx("w-3.5 h-3.5 text-amber-500", isTesting && "animate-spin")} />
                <span>{isTesting ? 'Pinging...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save & Connect'}</span>
              </button>
            </div>
          </div>

          {/* Quick IP Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Quick Presets:</span>
            <button
              type="button"
              onClick={() => {
                setInputUrl('http://34.131.240.174:8000');
                handleTest('http://34.131.240.174:8000');
              }}
              className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono font-medium hover:underline cursor-pointer"
            >
              ☁️ Cloud VM (34.131.240.174:8000)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputUrl('http://127.0.0.1:5001');
                handleTest('http://127.0.0.1:5001');
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono font-medium hover:underline cursor-pointer"
            >
              💻 Localhost (127.0.0.1:5001)
            </button>
            <a
              href={`${inputUrl.replace(/\/$/, '')}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 ml-auto"
            >
              <span>Swagger Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Save Confirmation Banner */}
        {saveMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* Test Diagnostics Card */}
        {testResult && (
          <div className={clsx(
            "p-3.5 rounded-xl border text-xs space-y-2.5 transition-all",
            testResult.ok
              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100"
              : "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-950 dark:text-red-100"
          )}>
            <div className="flex items-center justify-between font-bold">
              <div className="flex items-center gap-2">
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span>
                  {testResult.ok ? 'Connection Verified Successfully' : 'Connection Failed'}
                </span>
              </div>
              <span className="font-mono text-[11px]">
                {testResult.latency_ms > 0 ? `Latency: ${testResult.latency_ms}ms` : ''}
              </span>
            </div>

            {testResult.ok ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block">Server Title</span>
                  <strong className="text-slate-800 dark:text-slate-200 truncate block">
                    {testResult.server_title || 'TerraWarn AI API'}
                  </strong>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block">Model Version</span>
                  <strong className="text-blue-600 dark:text-blue-400 truncate block">
                    {testResult.model_version || 'prototype-xgboost-v1'}
                  </strong>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block">Health Status</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 truncate block">
                    {testResult.health_status || 'healthy'}
                  </strong>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block">Telemetry Stream</span>
                  <strong className={testResult.has_telemetry_stream ? "text-emerald-600" : "text-amber-600"}>
                    {testResult.has_telemetry_stream ? 'Available' : 'Custom'}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="text-red-700 dark:text-red-300 font-mono text-[11px]">
                {testResult.error}
              </p>
            )}

            {testResult.sample_telemetry && (
              <div className="text-[10.5px] font-mono text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/40 p-2 rounded-lg">
                <span>Sample Ingestion: </span>
                <span>Moisture: <strong>{testResult.sample_telemetry.soil_moisture}%</strong></span> | 
                <span> Rain: <strong>{testResult.sample_telemetry.rainfall_24h}mm</strong></span> | 
                <span> Tilt: <strong>{testResult.sample_telemetry.tilt_angle}°</strong></span> | 
                <span> Predicted Risk: <strong className="text-amber-600">{testResult.sample_risk?.risk_score || 0}% ({testResult.sample_risk?.risk_level || 'LOW'})</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Live Stream & Action Controls */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                Feed Live Predictions to Dashboard
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Poll sensor readings and XGBoost hazard scores into your Mission Control in real time.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-blue-400 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5 text-blue-600", isSyncing && "animate-spin")} />
                <span>{isSyncing ? 'Syncing...' : 'Sync 1 Reading'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAutoStreaming(!isAutoStreaming)}
                className={clsx(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer",
                  isAutoStreaming
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                {isAutoStreaming ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop Auto-Stream</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Auto-Stream</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sync Feedback Message */}
          {syncFeedback && (
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-[11px] font-mono">
              {syncFeedback}
            </div>
          )}

          {/* Interval Selector when Auto-Streaming */}
          <div className="flex items-center gap-3 pt-1 text-xs text-slate-600 dark:text-slate-300">
            <span className="text-[11px] font-medium">Stream Interval:</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              {[3, 5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, auto_stream_interval_seconds: sec }));
                  }}
                  className={clsx(
                    "px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer",
                    config.auto_stream_interval_seconds === sec
                      ? "bg-blue-600 text-white border-blue-600 font-bold"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-slate-200"
                  )}
                >
                  {sec}s
                </button>
              ))}
            </div>
            {config.last_synced_at && (
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 ml-auto font-mono">
                Last synced: {new Date(config.last_synced_at).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default XGBoostServerConfigPanel;
