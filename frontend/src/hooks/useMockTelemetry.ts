import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveState, DataSourceMode, TelemetryReading, RiskAssessment, Alert, SystemEvent, SihDemoStateKey } from '../types';
import { getGenerator, resetGenerator, Scenario } from '../mock/generator';
import { BACKEND_URL, WS_URL, API_BASE_URL } from '../config';

interface UseMockTelemetryOptions {
  scenario?: Scenario;
  intervalMs?: number;
  enabled?: boolean;
  initialMode?: DataSourceMode;
}

interface UseMockTelemetryReturn {
  state: LiveState | null;
  isRunning: boolean;
  scenario: Scenario;
  mode: DataSourceMode;
  demoStage: 1 | 2 | 3 | 4;
  sihState: SihDemoStateKey;
  connectionState: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  securityEvents: any[];
  setMode: (mode: DataSourceMode) => void;
  setScenario: (s: Scenario) => void;
  setDemoStage: (stage: 1 | 2 | 3 | 4) => void;
  setSihState: (state: SihDemoStateKey) => void;
  setConnectionState: (cs: 'ONLINE' | 'DEGRADED' | 'OFFLINE') => void;
  simulateReplayAttack: () => void;
  simulateUnauthorizedNode: () => void;
  runDemoSequence: () => void;
  runSihSequence: () => void;
  setInterval: (ms: number) => void;
  acknowledgeAlert: (id: string) => void;
  reset: () => void;
}

// Global persistent mode state across components
let globalMode: DataSourceMode = 'DEMO';
const modeListeners: Set<(m: DataSourceMode) => void> = new Set();

export function useMockTelemetry(
  options: UseMockTelemetryOptions = {}
): UseMockTelemetryReturn {
  const { scenario: initialScenario = 'escalation', intervalMs = 3000, enabled = true, initialMode } = options;

  const generatorRef = useRef(getGenerator(initialScenario));
  const [state, setState] = useState<LiveState | null>(() => generatorRef.current.getState());
  const [scenario, setScenarioState] = useState<Scenario>(initialScenario);
  const [mode, setModeState] = useState<DataSourceMode>(initialMode || globalMode);
  const [demoStage, setDemoStageState] = useState<1 | 2 | 3 | 4>(1);
  const [connectionState, setConnectionState] = useState<'ONLINE' | 'DEGRADED' | 'OFFLINE'>('ONLINE');
  const [securityEvents, setSecurityEvents] = useState<any[]>(() => generatorRef.current.getSecurityEvents());
  const [interval, setIntervalState] = useState(intervalMs);
  const [isRunning, setIsRunning] = useState(enabled);

  const timerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Sync mode with global state
  useEffect(() => {
    const handleModeChange = (newMode: DataSourceMode) => {
      setModeState(newMode);
    };
    modeListeners.add(handleModeChange);
    return () => {
      modeListeners.delete(handleModeChange);
    };
  }, []);

  const setMode = useCallback((newMode: DataSourceMode) => {
    globalMode = newMode;
    setModeState(newMode);
    modeListeners.forEach((fn) => fn(newMode));
  }, []);

  // ─── 1. DEMO MODE (4-Stage Physical Demonstration) ────────────────────────
  useEffect(() => {
    if (mode !== 'DEMO') return;

    generatorRef.current.setDemoStage(demoStage);
    const mockState = generatorRef.current.getState();
    setState({
      ...mockState,
      mode: 'DEMO',
      isHardwareActive: false,
    });

    // Optionally connect to FastAPI demo websocket
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'demo_stage_update' && data.stage) {
            setDemoStageState(data.stage);
          }
        } catch (_) {}
      };
    } catch (_) {}

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [mode, demoStage]);

  // ─── 2. SIMULATION MODE (Synthetic Generator) ─────────────────────────────
  useEffect(() => {
    if (mode !== 'SIMULATION') return;

    // Load initial mock state
    const mockState = generatorRef.current.getState();
    setState({
      ...mockState,
      mode: 'SIMULATION',
      isHardwareActive: false,
    });

    if (!isRunning) return;

    const tick = () => {
      generatorRef.current.tick();
      const updated = generatorRef.current.getState();
      setState({
        ...updated,
        mode: 'SIMULATION',
        isHardwareActive: false,
      });
    };

    timerRef.current = globalThis.setInterval(tick, interval);
    return () => {
      if (timerRef.current) globalThis.clearInterval(timerRef.current);
    };
  }, [mode, isRunning, interval]);

  // ─── 3. LIVE HARDWARE MODE (FastAPI Backend + WebSocket) ───────────────────
  useEffect(() => {
    if (mode !== 'HARDWARE') {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    const mapApiReading = (item: any): TelemetryReading => ({
      node_id: item.node_id || 'TW-N01',
      timestamp: item.timestamp || new Date().toISOString(),
      seq_num: item.seq_num || 0,
      soil_moisture: item.soil_moisture_raw || 2000,
      soil_moisture_pct: Number(item.soil_moisture ?? item.soil_moisture_pct ?? 0),
      rainfall: item.rainfall || 0,
      rainfall_pct: item.rainfall || 0,
      rainfall_24h_mm: Number(item.rainfall_24h ?? item.rainfall_24h_mm ?? 0),
      rain_detected: item.rain_detected ?? (item.rainfall > 5),
      accel_x: item.accel_x || 0,
      accel_y: item.accel_y || 0,
      accel_z: item.accel_z || 1.0,
      gyro_x: 0,
      gyro_y: 0,
      gyro_z: 0,
      tilt_angle: Number(item.tilt_angle ?? 20),
      tilt_rate: Number(item.tilt_rate ?? 0),
      battery_mv: item.battery_mv || 3800,
      battery_pct: item.battery || 80,
      rssi_dbm: item.rssi || -65,
      snr_db: item.snr || 9.0,
      sensor_status: 'online' as const,
      is_hardware: true,
    });

    // A. Fetch latest + history from this backend (cloud XGBoost is ingested here)
    const fetchInitialData = async (silent = false) => {
      try {
        const [telemetryRes, latestRes, riskRes] = await Promise.all([
          fetch(`${API_BASE_URL}/telemetry/TW-N01/history?limit=60`).catch(() => null),
          fetch(`${API_BASE_URL}/telemetry/TW-N01`).catch(() => null),
          fetch(`${API_BASE_URL}/risk/TW-N01`).catch(() => null),
        ]);

        if (!isSubscribed) return;

        let readings: TelemetryReading[] = [];
        if (telemetryRes && telemetryRes.ok) {
          const raw = await telemetryRes.json();
          const rawList = Array.isArray(raw) ? raw : (raw?.readings || []);
          readings = rawList.map(mapApiReading).reverse();
        }

        if (latestRes && latestRes.ok) {
          const latest = mapApiReading(await latestRes.json());
          const already = readings.some((r) => r.timestamp === latest.timestamp);
          if (!already) readings.push(latest);
        }

        let currentRisk: RiskAssessment = {
          timestamp: new Date().toISOString(),
          risk_score: 0.25,
          risk_level: 'LOW',
          confidence: 0.85,
          trend: 'stable',
          fos_estimate: 1.65,
          features: {},
          shap_values: [],
          model_version: 'v0.2.0-hardware',
        };

        if (riskRes && riskRes.ok) {
          const riskData = await riskRes.json();
          currentRisk = {
            timestamp: riskData.timestamp || new Date().toISOString(),
            risk_score: riskData.risk_score || 0.25,
            risk_level: riskData.risk_level || 'LOW',
            confidence: riskData.confidence || 0.85,
            trend: 'stable',
            fos_estimate: riskData.factor_of_safety || 1.5,
            features: riskData.features || {},
            shap_values: riskData.shap_values || [],
            model_version: riskData.model_version || 'v0.2.0-hardware',
          };
        }

        if (silent) {
          const latestReading = readings[readings.length - 1];
          if (!latestReading) return;
          setState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              currentReading: latestReading,
              currentRisk,
              readingHistory: readings.length > 0 ? readings : prev.readingHistory,
              lastUpdated: new Date().toISOString(),
              isHardwareActive: true,
              mode: 'HARDWARE',
            };
          });
          return;
        }

        const latestReading = readings[readings.length - 1] || {
          node_id: 'TW-N01',
          timestamp: new Date().toISOString(),
          seq_num: 1,
          soil_moisture: 2100,
          soil_moisture_pct: 42.0,
          rainfall: 0,
          rainfall_pct: 0,
          rainfall_24h_mm: 0,
          rain_detected: false,
          accel_x: 0,
          accel_y: 0,
          accel_z: 1.0,
          gyro_x: 0,
          gyro_y: 0,
          gyro_z: 0,
          tilt_angle: 22.0,
          tilt_rate: 0.0,
          battery_mv: 3900,
          battery_pct: 85,
          rssi_dbm: -65,
          snr_db: 9.5,
          sensor_status: 'online' as const,
          is_hardware: true,
        };

        setState({
          node: {
            id: 'TW-N01',
            name: 'Physical Slope Station Alpha (ESP32 + LoRa)',
            location: {
              lat: 31.1048,
              lng: 77.1734,
              altitude_m: 2276,
              description: 'Shimla Ridge — Physical Node TW-N01 via Gateway LG-GW01',
            },
            status: 'online',
            last_seen: new Date().toISOString(),
            firmware_version: 'v0.2.0-modular',
            uptime_hours: 1.5,
            reading_interval_s: 5,
            sensors: { soil_moisture: true, accelerometer: true, rain_gauge: true },
          },
          currentReading: latestReading,
          currentRisk,
          readingHistory: readings.length > 0 ? readings : [latestReading],
          riskHistory: [currentRisk],
          alerts: [],
          events: [
            {
              id: 'evt-hw-init',
              timestamp: new Date().toISOString(),
              type: 'system',
              title: 'LIVE HARDWARE Mode Active',
              description: `Subscribed to FastAPI WebSocket (${WS_URL})`,
              severity: 'info',
            },
          ],
          isConnected: true,
          lastUpdated: new Date().toISOString(),
          mode: 'HARDWARE',
          isHardwareActive: true,
          packetsReceived: readings.length,
        });

      } catch (err) {
        console.warn('[HARDWARE] Initial fetch error:', err);
      }
    };

    fetchInitialData();
    const pollId = globalThis.setInterval(() => {
      void fetchInitialData(true);
    }, 4000);

    // B. Connect to Live WebSocket for real-time ESP32 packet streaming
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[HARDWARE-WS] Connected to FastAPI WebSocket stream.');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'telemetry' || data.telemetry) {
              const tel = data.telemetry || data;
              const risk = data.risk || null;

              const newReading: TelemetryReading = {
                node_id: tel.node_id || 'TW-N01',
                timestamp: tel.timestamp || new Date().toISOString(),
                seq_num: tel.seq_num || Date.now(),
                soil_moisture: tel.soil_moisture_raw || 2000,
                soil_moisture_pct: tel.soil_moisture || 0,
                rainfall: tel.rainfall || 0,
                rainfall_pct: tel.rainfall || 0,
                rainfall_24h_mm: tel.rainfall_24h || 0,
                rain_detected: tel.rain_detected ?? (tel.rainfall > 5),
                accel_x: tel.accel_x || 0,
                accel_y: tel.accel_y || 0,
                accel_z: tel.accel_z || 1.0,
                gyro_x: 0,
                gyro_y: 0,
                gyro_z: 0,
                tilt_angle: tel.tilt_angle || 20,
                tilt_rate: tel.tilt_rate || 0,
                battery_mv: tel.battery_mv || 3800,
                battery_pct: tel.battery || 80,
                rssi_dbm: tel.rssi || -65,
                snr_db: tel.snr || 9.0,
                sensor_status: 'online',
                is_hardware: true,
              };

              setState((prev) => {
                if (!prev) return null;
                const newHistory = [...prev.readingHistory, newReading].slice(-100);
                
                const updatedRisk: RiskAssessment = risk ? {
                  timestamp: risk.timestamp || new Date().toISOString(),
                  risk_score: risk.risk_score || 0.2,
                  risk_level: risk.risk_level || 'LOW',
                  confidence: risk.confidence || 0.85,
                  trend: prev.currentRisk ? (risk.risk_score > prev.currentRisk.risk_score + 0.02 ? 'rising' : risk.risk_score < prev.currentRisk.risk_score - 0.02 ? 'falling' : 'stable') : 'stable',
                  fos_estimate: risk.factor_of_safety || 1.5,
                  features: risk.features || {},
                  shap_values: risk.shap_values || [],
                  model_version: risk.model_version || 'v0.2.0-hardware',
                } : prev.currentRisk;

                const newRiskHistory = [...prev.riskHistory, updatedRisk].slice(-100);

                return {
                  ...prev,
                  currentReading: newReading,
                  currentRisk: updatedRisk,
                  readingHistory: newHistory,
                  riskHistory: newRiskHistory,
                  lastUpdated: new Date().toISOString(),
                  isHardwareActive: true,
                  mode: 'HARDWARE',
                  packetsReceived: prev.packetsReceived + 1,
                };
              });
            }
          } catch (e) {
            console.error('[HARDWARE-WS] Error parsing WebSocket message:', e);
          }
        };

        ws.onclose = () => {
          console.warn('[HARDWARE-WS] WebSocket closed. Retrying in 3s...');
          if (isSubscribed && mode === 'HARDWARE') {
            setTimeout(connectWebSocket, 3000);
          }
        };
      } catch (err) {
        console.error('[HARDWARE-WS] Connection error:', err);
      }
    };

    connectWebSocket();

    return () => {
      isSubscribed = false;
      globalThis.clearInterval(pollId);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [mode]);

  const setScenario = useCallback((s: Scenario) => {
    setScenarioState(s);
    generatorRef.current.setScenario(s);
  }, []);

  const setIntervalMs = useCallback((ms: number) => {
    setIntervalState(ms);
  }, []);

  const [sihState, setSihStateInternal] = useState<SihDemoStateKey>('NORMAL');

  const setSihState = useCallback((stateKey: SihDemoStateKey) => {
    setSihStateInternal(stateKey);
    generatorRef.current.setSihState(stateKey);
    const stageMap: Record<SihDemoStateKey, 1 | 2 | 3 | 4> = {
      NORMAL: 1,
      RAIN: 2,
      HEAVY_RAIN: 2,
      SATURATION: 3,
      SLOPE_MOVEMENT: 4,
      CRITICAL: 4,
    };
    setDemoStageState(stageMap[stateKey] || 1);
    setState({
      ...generatorRef.current.getState(),
      mode: 'DEMO',
    });
    // Dispatch to FastAPI backend if online
    fetch(`${API_BASE_URL}/demo/state/${stateKey}`, { method: 'POST' }).catch(() => {});
  }, []);

  const runSihSequence = useCallback(() => {
    const states: SihDemoStateKey[] = ['NORMAL', 'RAIN', 'HEAVY_RAIN', 'SATURATION', 'SLOPE_MOVEMENT', 'CRITICAL'];
    let idx = 0;
    setSihState(states[0]);
    fetch(`${API_BASE_URL}/demo/run-sih`, { method: 'POST' }).catch(() => {});

    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    demoTimerRef.current = setInterval(() => {
      idx++;
      if (idx >= states.length) {
        if (demoTimerRef.current) clearInterval(demoTimerRef.current);
        return;
      }
      setSihState(states[idx]);
    }, 4000);
  }, [setSihState]);

  const setDemoStage = useCallback((stageId: 1 | 2 | 3 | 4) => {
    const stageMap: Record<1 | 2 | 3 | 4, SihDemoStateKey> = {
      1: 'NORMAL',
      2: 'HEAVY_RAIN',
      3: 'SATURATION',
      4: 'SLOPE_MOVEMENT',
    };
    setSihState(stageMap[stageId] || 'NORMAL');
  }, [setSihState]);

  const runDemoSequence = useCallback(() => {
    runSihSequence();
  }, [runSihSequence]);

  const acknowledgeAlert = useCallback((id: string) => {
    if (mode === 'SIMULATION' || mode === 'DEMO') {
      generatorRef.current.acknowledgeAlert(id);
      setState({
        ...generatorRef.current.getState(),
        mode,
      });
    } else {
      // Hardware mode alert acknowledgment
      setState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          alerts: prev.alerts.map((a) => a.id === id ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() } : a),
        };
      });
      fetch(`${API_BASE_URL}/alerts/${id}/ack`, { method: 'POST' }).catch(() => {});
    }
  }, [mode]);

  const reset = useCallback(() => {
    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    if (mode === 'DEMO') {
      setSihState('NORMAL');
      fetch(`${API_BASE_URL}/demo/reset`, { method: 'POST' }).catch(() => {});
    } else if (mode === 'SIMULATION') {
      generatorRef.current = resetGenerator(scenario);
      setState({
        ...generatorRef.current.getState(),
        mode: 'SIMULATION',
      });
    }
  }, [mode, scenario, setSihState]);

  const simulateReplayAttack = useCallback(() => {
    const event = generatorRef.current.simulateReplayAttack();
    setSecurityEvents([...generatorRef.current.getSecurityEvents()]);
    // Dispatch to FastAPI backend if online
    fetch(`${API_BASE_URL}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: 'TW-N01',
        seq_num: event.sequence_num || 1842,
        soil_moisture: 25.0,
        rainfall: 0.0,
        tilt_angle: 22.0,
      }),
    }).catch(() => {});
  }, []);

  const simulateUnauthorizedNode = useCallback(() => {
    const event = generatorRef.current.simulateUnauthorizedNode();
    setSecurityEvents([...generatorRef.current.getSecurityEvents()]);
    fetch(`${API_BASE_URL}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: 'ROGUE-NODE-99',
        seq_num: 104,
        soil_moisture: 25.0,
        rainfall: 0.0,
        tilt_angle: 22.0,
      }),
    }).catch(() => {});
  }, []);

  return {
    state,
    isRunning,
    scenario,
    mode,
    demoStage,
    sihState,
    connectionState,
    securityEvents,
    setMode,
    setScenario,
    setDemoStage,
    setSihState,
    setConnectionState,
    simulateReplayAttack,
    simulateUnauthorizedNode,
    runDemoSequence,
    runSihSequence,
    setInterval: setIntervalMs,
    acknowledgeAlert,
    reset,
  };
}

/** Get chart-ready data from current state */
export function useChartData() {
  const generator = getGenerator();
  return generator.getChartData();
}
