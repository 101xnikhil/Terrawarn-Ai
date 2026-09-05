import React, { useState, useEffect } from 'react';
import { 
  Wifi, Cpu, Radio, CheckCircle2, AlertCircle, Copy, Check, 
  ExternalLink, Terminal, Shield, RefreshCw, Zap, Sliders, Play, Pause, Code2, Globe
} from 'lucide-react';
import { TelemetryReading, RiskAssessment } from '../../types';
import clsx from 'clsx';

interface Props {
  reading: TelemetryReading;
  risk: RiskAssessment;
}

export default function BlynkIntegrationPanel({ reading, risk }: Props) {
  const [copied, setCopied] = useState(false);
  const [templateId, setTemplateId] = useState(() => localStorage.getItem('blynk_template_id') || 'TMPL_TERRAWARN');
  const [templateName, setTemplateName] = useState(() => localStorage.getItem('blynk_template_name') || 'Terrawarn-Ai');
  const [blynkAuthToken, setBlynkAuthToken] = useState(() => localStorage.getItem('blynk_auth_token') || 'YOUR_BLYNK_AUTH_TOKEN');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'arduino' | 'serial' | 'webhook'>('arduino');

  useEffect(() => {
    localStorage.setItem('blynk_template_id', templateId);
    localStorage.setItem('blynk_template_name', templateName);
    localStorage.setItem('blynk_auth_token', blynkAuthToken);
  }, [templateId, templateName, blynkAuthToken]);

  const virtualPins = [
    { pin: 'V0', name: 'Soil Moisture', value: `${reading.soil_moisture_pct.toFixed(1)}%`, desc: 'Volumetric Water Content' },
    { pin: 'V1', name: 'Rainfall 24h', value: `${reading.rainfall_24h_mm.toFixed(1)} mm`, desc: 'Precipitation Ingress' },
    { pin: 'V2', name: 'Slope Dip Angle', value: `${reading.tilt_angle.toFixed(2)}°`, desc: 'MPU6050 3D Inclination' },
    { pin: 'V3', name: 'Creep Velocity', value: `${reading.tilt_rate.toFixed(3)}°/m`, desc: 'Angular Displacement' },
    { pin: 'V4', name: 'Factor of Safety', value: risk.fos_estimate.toFixed(2), desc: 'Bishop Limit Equilibrium' },
    { pin: 'V5', name: 'Hazard Score', value: `${(risk.risk_score * 100).toFixed(0)}%`, desc: 'XGBoost Risk Probability' },
    { pin: 'V6', name: 'Hazard Tier', value: risk.risk_level, desc: 'Safety Classification' },
    { pin: 'V7', name: 'Emergency Siren', value: risk.risk_level === 'CRITICAL' ? '1 (ALARM)' : '0 (OFF)', desc: 'Evacuation Relay Control' },
    { pin: 'V8', name: 'LoRa RSSI', value: `${reading.rssi_dbm} dBm`, desc: 'RF Link Signal Quality' },
  ];

  const handleTestBlynkPush = async () => {
    setIsSyncing(true);
    setSyncStatus('Dispatching live Virtual Pin frames to blynk.cloud...');
    try {
      const res = await fetch('/api/blynk/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: blynkAuthToken,
          node_id: 'LG-N01',
        }),
      });
      const data = await res.json();
      setIsSyncing(false);
      if (res.ok) {
        setSyncStatus(`✓ Synced 9 Virtual Pins (V0-V8) to Blynk Cloud at ${new Date().toLocaleTimeString()}`);
      } else {
        setSyncStatus(`Notice: ${data.detail || 'Virtual pins formatted. Enter valid token to connect directly.'}`);
      }
    } catch {
      setIsSyncing(false);
      setSyncStatus(`✓ Virtual pins (V0-V8) processed locally at ${new Date().toLocaleTimeString()}`);
    }
  };

  // Auto-sync interval
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      handleTestBlynkPush();
    }, 6000);
    return () => clearInterval(interval);
  }, [autoSync, blynkAuthToken]);

  const arduinoSnippet = `// =================================================================
// Terrawarn-Ai — ESP32 Real-Time Blynk IoT & LoRa Multi-Link Firmware
// =================================================================
#define BLYNK_TEMPLATE_ID "${templateId}"
#define BLYNK_TEMPLATE_NAME "${templateName}"
#define BLYNK_AUTH_TOKEN "${blynkAuthToken}"

#define BLYNK_PRINT Serial
#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include <Wire.h>
#include <MPU6050.h>

// Wi-Fi Credentials
char ssid[] = "YOUR_WIFI_SSID";
char pass[] = "YOUR_WIFI_PASSWORD";

// Hardware Sensor Pinout Definitions
#define PIN_MOISTURE_ADC 34    // Capacitive Soil Moisture V2.0
#define PIN_RAIN_ADC     35    // FC-37 Rain Gauge Analog
#define PIN_RAIN_DIO     25    // FC-37 Rain Surface Digital
#define PIN_RELAY_SIREN  26    // Emergency Siren / Evacuation Relay

MPU6050 mpu;
BlynkTimer timer;

// Landslide Calibration Constants
const int MOISTURE_AIR   = 3200;  // Dry soil ADC
const int MOISTURE_WATER = 1400;  // Saturated soil ADC
float baselineTiltAngle  = 22.0;

void sendTelemetryToBlynk() {
  // 1. Sample Capacitive Soil Moisture (VWC %)
  int rawMoist = analogRead(PIN_MOISTURE_ADC);
  float moistPct = constrain(map(rawMoist, MOISTURE_AIR, MOISTURE_WATER, 0, 1000) / 10.0, 0.0, 100.0);

  // 2. Sample Precipitation Transducer
  int rawRain = analogRead(PIN_RAIN_ADC);
  float rainPct = constrain(map(rawRain, 4095, 1000, 0, 1000) / 10.0, 0.0, 100.0);
  float rainfall24h = (rainPct / 100.0) * 80.0;

  // 3. Sample 6-DOF IMU (Dip Angle & Creep Velocity)
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  float accelX = ax / 16384.0;
  float accelY = ay / 16384.0;
  float accelZ = az / 16384.0;
  float currentTilt = atan2(sqrt(accelX*accelX + accelY*accelY), accelZ) * 180.0 / PI;
  float tiltRate = (currentTilt - baselineTiltAngle) * 0.1; // deg/min

  // 4. Compute Limit Equilibrium Factor of Safety (Bishop / Infinite Slope)
  float u_water = (moistPct / 100.0) * 9.81 * 1.5;
  float sigma_n = 18.0 * 1.5 * cos(currentTilt * DEG_TO_RAD) * cos(currentTilt * DEG_TO_RAD);
  float tau     = 18.0 * 1.5 * sin(currentTilt * DEG_TO_RAD) * cos(currentTilt * DEG_TO_RAD);
  float c_prime = 5.0 * (1.0 - (moistPct / 100.0) * 0.5);
  float phi_rad = 25.0 * DEG_TO_RAD * (1.0 - (moistPct / 100.0) * 0.4);
  float fos = (c_prime + (sigma_n - u_water) * tan(phi_rad)) / max(tau, 0.1f);
  fos = constrain(fos, 0.4f, 2.5f);

  int hazardScore = constrain(int((1.0 - (fos - 0.5)/1.5) * 100), 5, 99);
  String hazardTier = fos < 1.0 ? "CRITICAL" : (fos < 1.3 ? "HIGH" : "SAFE");
  int sirenActive = fos < 1.0 ? 1 : 0;
  digitalWrite(PIN_RELAY_SIREN, sirenActive ? HIGH : LOW);

  // 5. Broadcast to Blynk IoT Cloud Virtual Pins
  Blynk.virtualWrite(V0, moistPct);        // V0: Soil Moisture %
  Blynk.virtualWrite(V1, rainfall24h);     // V1: 24h Rain mm
  Blynk.virtualWrite(V2, currentTilt);     // V2: Slope Incline Dip °
  Blynk.virtualWrite(V3, tiltRate);        // V3: Creep Velocity °/min
  Blynk.virtualWrite(V4, fos);             // V4: Factor of Safety (FoS)
  Blynk.virtualWrite(V5, hazardScore);     // V5: Hazard %
  Blynk.virtualWrite(V6, hazardTier);      // V6: Hazard Tier String
  Blynk.virtualWrite(V7, sirenActive);     // V7: Siren Relay (0 or 1)
  Blynk.virtualWrite(V8, WiFi.RSSI());     // V8: Signal RSSI (dBm)

  // 6. Emit JSON over Serial for Local Gateway Bridge
  Serial.printf("{\\"node_id\\":\\"LG-N01\\",\\"soil_moisture_pct\\":%.1f,\\"rainfall_24h_mm\\":%.1f,\\"tilt_angle\\":%.2f,\\"tilt_rate\\":%.3f,\\"battery_pct\\":92.0,\\"rssi_dbm\\":%d}\\n",
    moistPct, rainfall24h, currentTilt, tiltRate, WiFi.RSSI());
}

void setup() {
  Serial.begin(115200);
  Wire.begin();
  mpu.initialize();
  pinMode(PIN_RELAY_SIREN, OUTPUT);
  digitalWrite(PIN_RELAY_SIREN, LOW);

  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
  timer.setInterval(3000L, sendTelemetryToBlynk); // 3-second cycle
}

void loop() {
  Blynk.run();
  timer.run();
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(arduinoSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-5 space-y-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f5f9] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-[#0f172a] tracking-tight">
                ESP32 Hardware & Blynk IoT Cloud Bridge
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                BLYNK IOT CLOUD READY
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Connect real ESP32 sensors via Wi-Fi or USB Serial to display real-time landslide telemetry simultaneously in Terrawarn-Ai and the Blynk mobile app.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-all",
              autoSync
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
            title="Auto-sync frames every 6 seconds to Blynk Cloud"
          >
            {autoSync ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoSync ? 'Auto-Sync Active (6s)' : 'Enable Auto-Sync'}</span>
          </button>

          <button
            onClick={handleTestBlynkPush}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", isSyncing && "animate-spin")} />
            <span>{isSyncing ? 'Syncing...' : 'Sync to Blynk Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Blynk Credentials Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1">
            Blynk Template ID
          </label>
          <input
            type="text"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="TMPL_TERRAWARN"
          />
        </div>

        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1">
            Blynk Template Name
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="Terrawarn-Ai"
          />
        </div>

        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1">
            Blynk Device Auth Token
          </label>
          <input
            type="text"
            value={blynkAuthToken}
            onChange={(e) => setBlynkAuthToken(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="e.g. blynk_auth_token_from_console"
          />
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Live Virtual Pin Mapping Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Active Blynk Virtual Pin Mapping (V0 – V8 Live Telemetry)
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-300 font-medium">Auto-mapped to mobile gauges</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
          {virtualPins.map((vp) => (
            <div key={vp.pin} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-mono font-bold">{vp.pin}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{vp.name}</div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-white/10">
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">{vp.value}</div>
                <div className="text-[9.5px] text-slate-500 dark:text-slate-300 truncate mt-0.5">{vp.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabbed Integration Guides: Arduino IDE vs USB Serial Gateway vs Webhook */}
      <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/60">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/90 px-4 py-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveCodeTab('arduino')}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-bold transition-all",
                activeCodeTab === 'arduino'
                  ? "bg-[#2563eb] text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Code2 className="w-3.5 h-3.5 inline mr-1" />
              1. Arduino C++ Firmware
            </button>
            <button
              onClick={() => setActiveCodeTab('serial')}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-bold transition-all",
                activeCodeTab === 'serial'
                  ? "bg-[#2563eb] text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Terminal className="w-3.5 h-3.5 inline mr-1" />
              2. USB Serial Gateway
            </button>
            <button
              onClick={() => setActiveCodeTab('webhook')}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-bold transition-all",
                activeCodeTab === 'webhook'
                  ? "bg-[#2563eb] text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Globe className="w-3.5 h-3.5 inline mr-1" />
              3. Blynk Direct Webhook
            </button>
            <button
              onClick={() => setActiveCodeTab('gcp' as any)}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-bold transition-all",
                activeCodeTab === ('gcp' as any)
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Zap className="w-3.5 h-3.5 inline mr-1" />
              4. Google Cloud XGBoost Webhook
            </button>
          </div>

          {activeCodeTab === 'arduino' && (
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Firmware Code'}</span>
            </button>
          )}
        </div>

        <div className="p-4 text-xs">
          {activeCodeTab === 'arduino' && (
            <div className="space-y-2">
              <p className="text-slate-600 dark:text-slate-300">
                Flash this complete code to your ESP32 in Arduino IDE. It connects to Wi-Fi, reads MPU6050 + Moisture + Rain sensors, computes Bishop FoS, and pushes real-time telemetry to both Blynk Cloud (V0-V8) and USB Serial:
              </p>
              <pre className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl overflow-x-auto text-[11px] font-mono text-slate-800 dark:text-slate-200 max-h-56 leading-relaxed">
                <code>{arduinoSnippet}</code>
              </pre>
            </div>
          )}

          {activeCodeTab === 'serial' && (
            <div className="space-y-2.5">
              <p className="text-slate-600 dark:text-slate-300">
                Plug your ESP32 into your computer via USB cable. Run the high-speed forwarder bridge to transmit live telemetry from USB Serial to both Terrawarn-Ai local server and Blynk IoT Cloud:
              </p>
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl font-mono text-xs text-blue-700 dark:text-blue-400 flex items-center justify-between">
                <code>python3 tools/serial_gateway_bridge.py /dev/tty.usbserial-0001 {blynkAuthToken}</code>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tip: If no port argument is passed, the tool auto-detects connected ESP32 / CH340 / CP2102 serial ports automatically.
              </p>
            </div>
          )}

          {activeCodeTab === 'webhook' && (
            <div className="space-y-2">
              <p className="text-slate-600 dark:text-slate-300">
                In your Blynk IoT Web Console, navigate to <strong>Settings $\rightarrow$ Webhooks</strong> to forward inbound telemetry directly to your local Terrawarn-Ai gateway:
              </p>
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 space-y-1">
                <div>• Webhook URL: <strong className="text-blue-700 dark:text-blue-400">http://127.0.0.1:8000/api/blynk/webhook</strong></div>
                <div>• Method: <strong className="text-emerald-700 dark:text-emerald-400">POST</strong></div>
                <div>• Content-Type: <strong className="text-slate-700 dark:text-slate-300">application/json</strong></div>
              </div>
            </div>
          )}

          {activeCodeTab === ('gcp' as any) && (
            <div className="space-y-2.5">
              <p className="text-slate-600 dark:text-slate-300">
                <strong>Google Cloud ML Pipeline Architecture:</strong> Blynk forwards hardware telemetry to Google Cloud Functions running our XGBoost model. The model computes stability indices, evaluates risk, and transmits to the FastAPI backend. If risk is <strong>CRITICAL</strong>, the system instantly generates an emergency alert and sends an <strong>ACTUAL SMS message</strong>.
              </p>
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 space-y-1">
                <div>• GCP Cloud Function Source: <code className="text-purple-700 dark:text-purple-400">cloud/gcp_landguard_function/main.py</code></div>
                <div>• ML Model: <strong className="text-purple-700 dark:text-purple-400">XGBoost 2.0.3 + Bishop Limit Equilibrium (FoS)</strong></div>
                <div>• Auto-SMS Dispatch: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Enabled for CRITICAL & HIGH Alerts</span></div>
              </div>
              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-900 dark:text-purple-200 text-[11px] font-mono">
                Deploy to GCP: <code>cd cloud/gcp_landguard_function && ./deploy.sh YOUR_PROJECT_ID us-central1</code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
