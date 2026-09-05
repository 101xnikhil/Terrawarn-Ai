/**
 * Terrawarn-Ai — Mock Telemetry Generator
 *
 * Generates realistic, time-varying sensor data for the prototype dashboard.
 * Data evolves smoothly over time with noise, simulating a real slope sensor.
 *
 * ⚠️ PROTOTYPE: All data is synthetic. Not for real-world use.
 */

import {
  TelemetryReading,
  RiskAssessment,
  RiskLevel,
  ShapValue,
  Alert,
  SensorNode,
  SystemEvent,
  LiveState,
  ChartDataPoint,
  SecurityEvent,
  SihDemoStateKey,
} from '../types';
import { clamp, getRiskLevel } from '../utils/formatters';

// ─── Scenario Definitions ────────────────────────────────────

export type Scenario = 'dry_stable' | 'moderate_rain' | 'heavy_rain' | 'crisis' | 'escalation' | 'physical_demo';

interface ScenarioParams {
  moisture: { base: number; amplitude: number; trend: number };
  rainfall: { base: number; amplitude: number; trend: number };
  tilt: { base: number; drift: number; noise: number };
  description: string;
}

const SCENARIOS: Record<Scenario, ScenarioParams> = {
  dry_stable: {
    moisture: { base: 20, amplitude: 3, trend: 0 },
    rainfall: { base: 2, amplitude: 2, trend: 0 },
    tilt: { base: 22, drift: 0, noise: 0.05 },
    description: 'Dry and stable conditions',
  },
  moderate_rain: {
    moisture: { base: 45, amplitude: 5, trend: 0.02 },
    rainfall: { base: 30, amplitude: 10, trend: 0.01 },
    tilt: { base: 23, drift: 0.001, noise: 0.08 },
    description: 'Moderate rainfall, gradual saturation',
  },
  heavy_rain: {
    moisture: { base: 70, amplitude: 5, trend: 0.05 },
    rainfall: { base: 65, amplitude: 15, trend: 0.03 },
    tilt: { base: 25, drift: 0.005, noise: 0.12 },
    description: 'Heavy rainfall, rising moisture',
  },
  crisis: {
    moisture: { base: 90, amplitude: 3, trend: 0.02 },
    rainfall: { base: 85, amplitude: 8, trend: 0.01 },
    tilt: { base: 30, drift: 0.02, noise: 0.2 },
    description: 'Critical conditions — saturated soil, active movement',
  },
  escalation: {
    moisture: { base: 25, amplitude: 5, trend: 0.15 },
    rainfall: { base: 10, amplitude: 8, trend: 0.12 },
    tilt: { base: 22, drift: 0.008, noise: 0.1 },
    description: 'Escalating from dry to crisis over time',
  },
  physical_demo: {
    moisture: { base: 20, amplitude: 2, trend: 0.2 },
    rainfall: { base: 0, amplitude: 5, trend: 0.25 },
    tilt: { base: 22, drift: 0.015, noise: 0.1 },
    description: 'Controlled laboratory prototype demonstration (4-stage physical experiment)',
  },
};

// ─── Node Definition ─────────────────────────────────────────

const MOCK_NODE: SensorNode = {
  id: 'LG-N01',
  name: 'Slope Monitor Alpha',
  location: {
    lat: 31.1048,
    lng: 77.1734,
    altitude_m: 2276,
    description: 'Shimla Ridge — Northern face, Sector 7',
  },
  status: 'online',
  last_seen: new Date().toISOString(),
  firmware_version: 'v0.1.3-proto',
  uptime_hours: 72.5,
  reading_interval_s: 10,
  sensors: {
    soil_moisture: true,
    accelerometer: true,
    rain_gauge: true,
  },
};

// ─── Generator State ─────────────────────────────────────────

class MockTelemetryGenerator {
  private scenario: Scenario = 'escalation';
  private tickCount = 0;
  private seqNum = 1000;
  private moistureState = 25;
  private rainfallState = 10;
  private tiltState = 22;
  private tiltPrev = 22;
  private rainfall24hAccum = 0;
  private readingHistory: TelemetryReading[] = [];
  private riskHistory: RiskAssessment[] = [];
  private alerts: Alert[] = [];
  private events: SystemEvent[] = [];
  private alertIdCounter = 1;
  private eventIdCounter = 1;
  private demoStage: 1 | 2 | 3 | 4 = 1;
  private lastRiskLevel: RiskLevel = 'LOW';
  private securityEvents: SecurityEvent[] = [];

  constructor(scenario: Scenario = 'escalation') {
    this.scenario = scenario;
    this.initializeHistory();
    this.initializeSecurityEvents();
  }

  private initializeSecurityEvents() {
    const now = new Date();
    this.securityEvents = [
      {
        id: 'sec-101',
        timestamp: new Date(now.getTime() - 45000).toISOString(),
        node_id: 'LG-N01',
        sequence_num: 1840,
        action: 'ACCEPTED',
        reason: 'Valid authorized telemetry frame accepted (Sequence #1840).',
        client_ip: '192.168.4.15',
      },
      {
        id: 'sec-102',
        timestamp: new Date(now.getTime() - 30000).toISOString(),
        node_id: 'LG-N01',
        sequence_num: 1841,
        action: 'ACCEPTED',
        reason: 'Valid authorized telemetry frame accepted (Sequence #1841).',
        client_ip: '192.168.4.15',
      },
      {
        id: 'sec-103',
        timestamp: new Date(now.getTime() - 15000).toISOString(),
        node_id: 'LG-N01',
        sequence_num: 1842,
        action: 'ACCEPTED',
        reason: 'Valid authorized telemetry frame accepted (Sequence #1842).',
        client_ip: '192.168.4.15',
      },
    ];
  }

  getSecurityEvents(): SecurityEvent[] {
    return this.securityEvents;
  }

  simulateReplayAttack(): SecurityEvent {
    const lastSeq = this.seqNum > 0 ? this.seqNum : 1842;
    const now = new Date().toISOString();
    const event: SecurityEvent = {
      id: `sec-${Date.now()}`,
      timestamp: now,
      node_id: 'LG-N01',
      sequence_num: lastSeq,
      action: 'REJECTED_REPLAY',
      reason: `REPLAY DETECTED — Duplicate sequence #${lastSeq} rejected by edge gateway.`,
      client_ip: '192.168.4.15',
    };
    this.securityEvents.unshift(event);
    if (this.securityEvents.length > 50) this.securityEvents.pop();
    return event;
  }

  simulateUnauthorizedNode(): SecurityEvent {
    const now = new Date().toISOString();
    const event: SecurityEvent = {
      id: `sec-${Date.now()}`,
      timestamp: now,
      node_id: 'ROGUE-NODE-99',
      sequence_num: 104,
      action: 'REJECTED_UNAUTHORIZED',
      reason: "Unauthorized device ID 'ROGUE-NODE-99' blocked by IoT firewall.",
      client_ip: '192.168.4.88',
    };
    this.securityEvents.unshift(event);
    if (this.securityEvents.length > 50) this.securityEvents.pop();
    return event;
  }

  setScenario(scenario: Scenario) {
    this.scenario = scenario;
    this.tickCount = 0;
  }

  private currentSihState: SihDemoStateKey = 'NORMAL';

  getDemoStage(): 1 | 2 | 3 | 4 {
    return this.demoStage;
  }

  getSihState(): SihDemoStateKey {
    return this.currentSihState;
  }

  setSihState(stateKey: SihDemoStateKey) {
    this.currentSihState = stateKey;
    this.scenario = 'physical_demo';
    const now = new Date().toISOString();

    if (stateKey === 'NORMAL') {
      this.demoStage = 1;
      this.moistureState = 18.5;
      this.rainfallState = 0;
      this.rainfall24hAccum = 0;
      this.tiltState = 21.8;
      this.tiltPrev = 21.8;
      this.events.unshift({
        id: `evt-demo-${this.eventIdCounter++}`,
        timestamp: now,
        type: 'system',
        title: 'NORMAL: Baseline Stability',
        description: 'Dry stable soil (18.5% moisture). Nominal slope angle (21.8°). FoS > 1.8. Risk: LOW.',
        severity: 'info',
      });
    } else if (stateKey === 'RAIN') {
      this.demoStage = 2;
      this.moistureState = 38.0;
      this.rainfallState = 35.0;
      this.rainfall24hAccum = 18.0;
      this.tiltState = 22.1;
      this.tiltPrev = 22.0;
      this.events.unshift({
        id: `evt-demo-${this.eventIdCounter++}`,
        timestamp: now,
        type: 'risk_change',
        title: 'Rainfall detected',
        description: 'Light to moderate rainfall initiated. Precipitation rate 35%, rain gauge active.',
        severity: 'info',
      });
    } else if (stateKey === 'HEAVY_RAIN') {
      this.demoStage = 2;
      this.moistureState = 58.0;
      this.rainfallState = 75.0;
      this.rainfall24hAccum = 55.0;
      this.tiltState = 22.8;
      this.tiltPrev = 22.5;
      this.events.unshift({
        id: `evt-demo-${this.eventIdCounter++}`,
        timestamp: now,
        type: 'risk_change',
        title: 'Moisture threshold crossed',
        description: 'Heavy rainfall event. Soil moisture crossed 55% threshold. Infiltration accelerating.',
        severity: 'warning',
      });
    } else if (stateKey === 'SATURATION') {
      this.demoStage = 3;
      this.moistureState = 84.0;
      this.rainfallState = 85.0;
      this.rainfall24hAccum = 85.0;
      this.tiltState = 25.2;
      this.tiltPrev = 24.8;
      this.events.unshift({
        id: `evt-demo-${this.eventIdCounter++}`,
        timestamp: now,
        type: 'risk_change',
        title: 'Stability indicator decreased',
        description: 'Pore-water pressure high. Geotechnical Factor of Safety degraded to ~1.08. HIGH RISK.',
        severity: 'high',
      });
      // Generate HIGH alert
      const highAlert: Alert = {
        id: `ALT-${this.alertIdCounter++}`,
        node_id: MOCK_NODE.id,
        timestamp: now,
        severity: 'high',
        title: `🟠 HIGH RISK ALERT: Saturated Slope at ${MOCK_NODE.id}`,
        message: 'Elevated pore-pressure and soil saturation. Factor of Safety = 1.08. Heightened surveillance active.',
        risk_score: 0.65,
        risk_level: 'HIGH',
        trigger_reason: 'Soil moisture elevated; Stability indicator decreasing',
        trigger_reasons: ['Soil moisture elevated', 'Stability indicator decreasing'],
        acknowledged: false,
        created_at: now,
      };
      this.alerts.unshift(highAlert);
    } else if (stateKey === 'SLOPE_MOVEMENT') {
      this.demoStage = 4;
      this.moistureState = 91.0;
      this.rainfallState = 80.0;
      this.rainfall24hAccum = 95.0;
      this.tiltState = 31.5;
      this.tiltPrev = 28.0;
      this.events.unshift({
        id: `evt-demo-${this.eventIdCounter++}`,
        timestamp: now,
        type: 'alert',
        title: 'Tilt anomaly detected',
        description: 'Active slope movement detected. Spatial dip shifted to 31.5° (+0.16°/min creep velocity).',
        severity: 'critical',
      });
      // Generate CRITICAL alert
      const critAlert: Alert = {
        id: `ALT-${this.alertIdCounter++}`,
        node_id: MOCK_NODE.id,
        timestamp: now,
        severity: 'critical',
        title: `🔴 CRITICAL HAZARD ALERT: Active Slope Movement at ${MOCK_NODE.id}`,
        message: 'Active kinematic tilt displacement detected. Factor of Safety = 0.92 (FoS < 1.00). Immediate alert dispatched.',
        risk_score: 0.82,
        risk_level: 'CRITICAL',
        trigger_reason: 'Soil moisture elevated; Tilt rate increasing; Stability indicator decreasing',
        trigger_reasons: ['Soil moisture elevated', 'Tilt rate increasing', 'Stability indicator decreasing'],
        acknowledged: false,
        created_at: now,
      };
      this.alerts.unshift(critAlert);
    } else if (stateKey === 'CRITICAL') {
      this.demoStage = 4;
      this.moistureState = 96.0;
      this.rainfallState = 92.0;
      this.rainfall24hAccum = 115.0;
      this.tiltState = 38.4;
      this.tiltPrev = 32.0;
      this.events.unshift({
        id: `evt-demo-${this.eventIdCounter++}`,
        timestamp: now,
        type: 'alert',
        title: 'HIGH RISK ALERT',
        description: 'Imminent slope failure. Limit equilibrium collapse (FoS: 0.65). Automated emergency sirens active.',
        severity: 'critical',
      });
      const maxAlert: Alert = {
        id: `ALT-${this.alertIdCounter++}`,
        node_id: MOCK_NODE.id,
        timestamp: now,
        severity: 'critical',
        title: `🔴 EMERGENCY ALARM: Imminent Slope Collapse at ${MOCK_NODE.id}`,
        message: 'Severe structural displacement (38.4°). Factor of Safety = 0.65. Automated railway stoppage and evacuation active.',
        risk_score: 0.95,
        risk_level: 'CRITICAL',
        trigger_reason: 'Soil moisture critical; Tilt rate accelerating; Stability indicator failure',
        trigger_reasons: ['Soil moisture critical', 'Tilt rate accelerating', 'Stability indicator failure'],
        acknowledged: false,
        created_at: now,
      };
      this.alerts.unshift(maxAlert);
    }

    this.tick();
  }

  setDemoStage(stageId: 1 | 2 | 3 | 4) {
    const stageMap: Record<1 | 2 | 3 | 4, SihDemoStateKey> = {
      1: 'NORMAL',
      2: 'HEAVY_RAIN',
      3: 'SATURATION',
      4: 'SLOPE_MOVEMENT',
    };
    this.setSihState(stageMap[stageId] || 'NORMAL');
  }

  getNode(): SensorNode {
    return {
      ...MOCK_NODE,
      last_seen: new Date().toISOString(),
      status: 'online',
    };
  }

  /** Generate the next telemetry reading */
  tick(): { reading: TelemetryReading; risk: RiskAssessment; newAlert?: Alert; event: SystemEvent } {
    const params = SCENARIOS[this.scenario];
    this.tickCount++;
    this.seqNum++;
    const t = this.tickCount;

    // ── Evolve sensor values with smooth transitions + noise ──
    const moistureTarget =
      params.moisture.base +
      params.moisture.amplitude * Math.sin(t * 0.05) +
      params.moisture.trend * t;
    this.moistureState += (clamp(moistureTarget, 0, 100) - this.moistureState) * 0.1 + gaussian() * 1.5;
    this.moistureState = clamp(this.moistureState, 0, 100);

    const rainfallTarget =
      params.rainfall.base +
      params.rainfall.amplitude * Math.sin(t * 0.07 + 1) +
      params.rainfall.trend * t;
    this.rainfallState += (clamp(rainfallTarget, 0, 100) - this.rainfallState) * 0.15 + gaussian() * 2;
    this.rainfallState = clamp(this.rainfallState, 0, 100);

    this.tiltPrev = this.tiltState;
    const tiltTarget = params.tilt.base + params.tilt.drift * t;
    this.tiltState += (tiltTarget - this.tiltState) * 0.05 + gaussian() * params.tilt.noise;
    this.tiltState = clamp(this.tiltState, 0, 90);

    const tiltRate = (this.tiltState - this.tiltPrev) * 6; // per minute (assuming 10s interval)

    // Accumulate 24h rainfall (simplified)
    this.rainfall24hAccum = clamp(
      this.rainfall24hAccum + this.rainfallState * 0.01 + gaussian() * 0.5,
      0,
      200
    );

    // ── Build reading ──
    const now = new Date().toISOString();
    const moistureRaw = Math.round((1 - this.moistureState / 100) * 3200 + 900);
    const rainRaw = Math.round((1 - this.rainfallState / 100) * 3095 + 1000);

    // Accelerometer from tilt angle
    const tiltRad = (this.tiltState * Math.PI) / 180;
    const ax = Math.sin(tiltRad) + gaussian() * 0.01;
    const az = Math.cos(tiltRad) + gaussian() * 0.01;
    const ay = gaussian() * 0.02;

    const reading: TelemetryReading = {
      node_id: 'LG-N01',
      timestamp: now,
      seq_num: this.seqNum,
      soil_moisture: moistureRaw,
      soil_moisture_pct: round2(this.moistureState),
      rainfall: rainRaw,
      rainfall_pct: round2(this.rainfallState),
      rainfall_24h_mm: round2(this.rainfall24hAccum),
      rain_detected: this.rainfallState > 10,
      accel_x: round3(ax),
      accel_y: round3(ay),
      accel_z: round3(az),
      gyro_x: round3(gaussian() * 0.5),
      gyro_y: round3(gaussian() * 0.5),
      gyro_z: round3(gaussian() * 0.3),
      tilt_angle: round2(this.tiltState),
      tilt_rate: round3(tiltRate),
      battery_mv: Math.round(clamp(3800 - t * 0.3 + gaussian() * 10, 3200, 4200)),
      battery_pct: Math.round(clamp(85 - t * 0.05, 20, 100)),
      rssi_dbm: Math.round(-65 + gaussian() * 5),
      snr_db: round1(9.5 + gaussian() * 1.5),
      sensor_status: 'online',
    };

    // ── Compute risk assessment ──
    const risk = this.computeRisk(reading, tiltRate);

    // ── Generate alert if threshold crossed ──
    let newAlert: Alert | undefined;
    if (
      (risk.risk_level === 'HIGH' || risk.risk_level === 'CRITICAL') &&
      this.lastRiskLevel !== risk.risk_level
    ) {
      const currentAlertId = this.alertIdCounter++;
      const reasons: string[] = [];
      if (reading.soil_moisture_pct >= 45) reasons.push('Soil moisture elevated');
      if (Math.abs(tiltRate) >= 0.01) reasons.push('Tilt rate increasing');
      if (risk.fos_estimate < 1.3) reasons.push('Stability indicator decreasing');
      if (reasons.length === 0) {
        reasons.push('Soil moisture elevated', 'Tilt rate increasing', 'Stability indicator decreasing');
      }

      newAlert = {
        id: `alert-${currentAlertId}`,
        alert_id: `ALT-${currentAlertId}`,
        timestamp: now,
        created_at: now,
        severity: risk.risk_level === 'CRITICAL' ? 'critical' : 'high',
        title:
          risk.risk_level === 'CRITICAL'
            ? '🔴 CRITICAL: Immediate slope failure alert'
            : '🟠 HIGH: Elevated landslide risk detected',
        message: this.generateAlertMessage(risk),
        node_id: 'LG-N01',
        risk_score: risk.risk_score,
        risk_level: risk.risk_level,
        trigger_reason: reasons.join('; '),
        trigger_reasons: reasons,
        acknowledged: false,
      };
      this.alerts.unshift(newAlert);
      if (this.alerts.length > 50) this.alerts.pop();
    }
    this.lastRiskLevel = risk.risk_level;

    // ── System event ──
    const event: SystemEvent = {
      id: `evt-${this.eventIdCounter++}`,
      timestamp: now,
      type: newAlert ? 'alert' : risk.risk_level !== this.lastRiskLevel ? 'risk_change' : 'reading',
      title: newAlert
        ? `Alert: ${risk.risk_level}`
        : `Reading #${this.seqNum}`,
      description: `Moisture ${reading.soil_moisture_pct.toFixed(1)}% · Tilt ${reading.tilt_angle.toFixed(1)}° · Risk ${(risk.risk_score * 100).toFixed(0)}%`,
      severity: newAlert?.severity,
    };
    this.events.unshift(event);
    if (this.events.length > 100) this.events.pop();

    // ── Update history ──
    this.readingHistory.push(reading);
    if (this.readingHistory.length > 360) this.readingHistory.shift();
    this.riskHistory.push(risk);
    if (this.riskHistory.length > 360) this.riskHistory.shift();

    return { reading, risk, newAlert, event };
  }

  /** Get the full live state */
  getState(): LiveState {
    const latestReading = this.readingHistory[this.readingHistory.length - 1];
    const latestRisk = this.riskHistory[this.riskHistory.length - 1];

    return {
      node: this.getNode(),
      currentReading: latestReading,
      currentRisk: latestRisk,
      readingHistory: [...this.readingHistory],
      riskHistory: [...this.riskHistory],
      alerts: [...this.alerts],
      events: [...this.events],
      isConnected: true,
      lastUpdated: new Date().toISOString(),
      mode: 'SIMULATION',
      isHardwareActive: false,
      packetsReceived: this.readingHistory.length,
    };
  }

  /** Get chart-ready data points */
  getChartData(): ChartDataPoint[] {
    return this.readingHistory.map((r, i) => ({
      time: new Date(r.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      timestamp: new Date(r.timestamp).getTime(),
      soil_moisture: r.soil_moisture_pct,
      rainfall: r.rainfall_pct,
      tilt_angle: r.tilt_angle,
      tilt_rate: r.tilt_rate,
      risk_score: this.riskHistory[i]?.risk_score ?? 0,
      fos: this.riskHistory[i]?.fos_estimate ?? 1.5,
    }));
  }

  acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledged_at = new Date().toISOString();
    }
  }

  // ── Private methods ──────────────────────────────────────────

  private computeRisk(reading: TelemetryReading, tiltRate: number): RiskAssessment {
    const moisture = reading.soil_moisture_pct;
    const rain = reading.rainfall_pct;
    const tilt = reading.tilt_angle;
    const cumulRain = this.rainfall24hAccum;

    // ── Simplified Factor of Safety (infinite slope model) ──
    const beta = (tilt * Math.PI) / 180;
    const c_base = 5; // kPa
    const phi_base = 25; // degrees
    const gamma_sat = 18; // kN/m³
    const gamma_w = 9.81;
    const z = 1.5; // m

    // Moisture-dependent reduction
    const moistureFactor = 1 - 0.4 * (moisture / 100);
    const c = c_base * moistureFactor;
    const phi = (phi_base * moistureFactor * Math.PI) / 180;

    const numerator = c + (gamma_sat - gamma_w) * z * Math.cos(beta) ** 2 * Math.tan(phi);
    const denominator = gamma_sat * z * Math.sin(beta) * Math.cos(beta);
    const fos = denominator > 0 ? numerator / denominator : 3.0;

    // ── Risk score from features (simplified XGBoost proxy) ──
    // Weighted combination normalized to 0–1
    const moistureContrib = moisture / 100;
    const rainContrib = rain / 100;
    const cumulRainContrib = clamp(cumulRain / 100, 0, 1);
    const tiltContrib = clamp((tilt - 15) / 30, 0, 1);
    const tiltRateContrib = clamp(Math.abs(tiltRate) / 0.5, 0, 1);
    const fosContrib = clamp(1 - (fos - 0.5) / 2, 0, 1);
    const interactionContrib = (moistureContrib * rainContrib);

    const riskScore = clamp(
      moistureContrib * 0.22 +
        cumulRainContrib * 0.20 +
        fosContrib * 0.20 +
        tiltContrib * 0.12 +
        rainContrib * 0.10 +
        tiltRateContrib * 0.08 +
        interactionContrib * 0.08,
      0,
      1
    );

    const riskLevel = getRiskLevel(riskScore);

    // ── Trend ──
    const recentScores = this.riskHistory.slice(-10).map((r) => r.risk_score);
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (recentScores.length >= 3) {
      const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      if (riskScore > avg + 0.03) trend = 'rising';
      else if (riskScore < avg - 0.03) trend = 'falling';
    }

    // ── SHAP values (simulated) ──
    const shapValues: ShapValue[] = [
      {
        feature: 'soil_moisture_pct',
        display_name: 'Soil Moisture',
        value: moisture,
        contribution: round3(moistureContrib * 0.22 - 0.04),
      },
      {
        feature: 'cumulative_rain_1h',
        display_name: 'Cumulative Rainfall',
        value: cumulRain,
        contribution: round3(cumulRainContrib * 0.20 - 0.03),
      },
      {
        feature: 'fos_estimate',
        display_name: 'Factor of Safety',
        value: fos,
        contribution: round3(fosContrib * 0.20 - 0.03),
      },
      {
        feature: 'tilt_angle_deg',
        display_name: 'Slope Angle',
        value: tilt,
        contribution: round3(tiltContrib * 0.12 - 0.02),
      },
      {
        feature: 'rain_intensity_pct',
        display_name: 'Rain Intensity',
        value: rain,
        contribution: round3(rainContrib * 0.10 - 0.02),
      },
      {
        feature: 'tilt_rate_deg_per_min',
        display_name: 'Tilt Rate',
        value: Math.abs(tiltRate),
        contribution: round3(tiltRateContrib * 0.08 - 0.01),
      },
      {
        feature: 'moisture_rain_interaction',
        display_name: 'Moisture × Rain',
        value: moisture * rain,
        contribution: round3(interactionContrib * 0.08 - 0.01),
      },
    ].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return {
      timestamp: new Date().toISOString(),
      risk_score: round3(riskScore),
      risk_level: riskLevel,
      confidence: round2(clamp(0.72 + gaussian() * 0.05, 0.5, 0.95)),
      trend,
      fos_estimate: round2(fos),
      features: {
        soil_moisture_pct: moisture,
        tilt_angle_deg: tilt,
        tilt_rate_deg_per_min: tiltRate,
        rain_intensity_pct: rain,
        cumulative_rain_1h: cumulRain,
        fos_estimate: fos,
        moisture_rain_interaction: moisture * rain,
      },
      shap_values: shapValues,
      model_version: 'v0.1-synthetic',
    };
  }

  private generateAlertMessage(risk: RiskAssessment): string {
    const factors = risk.shap_values
      .filter((s) => s.contribution > 0)
      .slice(0, 3)
      .map((s) => `${s.display_name}: ${s.value.toFixed(1)}`)
      .join(', ');
    return `Risk score ${(risk.risk_score * 100).toFixed(0)}% (FoS: ${risk.fos_estimate.toFixed(2)}). Key factors: ${factors}. This is a PROTOTYPE assessment from synthetic data.`;
  }

  private initializeHistory() {
    // Pre-fill 30 data points so charts aren't empty on load
    for (let i = 0; i < 30; i++) {
      this.tick();
    }
  }
}

// ─── Utility Functions ───────────────────────────────────────

function gaussian(): number {
  // Box-Muller transform for normal distribution
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ─── Singleton Export ────────────────────────────────────────

let generatorInstance: MockTelemetryGenerator | null = null;

export function getGenerator(scenario: Scenario = 'escalation'): MockTelemetryGenerator {
  if (!generatorInstance) {
    generatorInstance = new MockTelemetryGenerator(scenario);
  }
  return generatorInstance;
}

export function resetGenerator(scenario: Scenario = 'escalation'): MockTelemetryGenerator {
  generatorInstance = new MockTelemetryGenerator(scenario);
  return generatorInstance;
}

export { MockTelemetryGenerator };
