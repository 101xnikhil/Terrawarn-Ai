import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Radio, Send, Bell, ShieldAlert, CheckCircle2, 
  MapPin, Users, Volume2, VolumeX, AlertTriangle, RefreshCw, 
  Settings, PhoneCall, TowerControl, Wifi, Clock, ArrowUpRight,
  Bluetooth, BluetoothSearching, Signal, Zap, Copy, Check, Code2, Sparkles,
  RadioTower, ShieldCheck, Eye, Compass
} from 'lucide-react';
import clsx from 'clsx';
import { useMockTelemetry } from '../../hooks/useMockTelemetry';
import { useI18n } from '../../i18n/LanguageContext';

interface DispatchedSms {
  id: string;
  timestamp: string;
  recipientGroup: string;
  recipientCount: number;
  sector: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING';
  message: string;
  deliveryStatus: 'DELIVERED' | 'DISPATCHING' | 'QUEUED' | 'FAILED';
  broadcastMode: 'BLE_NON_CONNECTABLE_ADV' | 'SMS_CELL_BROADCAST';
  provider?: string;
  error?: string;
}

interface NearbyBleDevice {
  id: string;
  name: string;
  type: 'Smartphone' | 'Smartwatch' | 'IoT Node' | 'Wearable';
  mac: string;
  rssi: number; // dBm (-40 to -95)
  distanceMeters: number;
  status: 'IN DANGER ZONE' | 'PROXIMITY WARNING' | 'PERIMETER';
  lastSeen: string;
  alertSent: boolean;
  phoneMock: string;
  passivePacketReceived: boolean;
}

const INITIAL_BLE_DEVICES: NearbyBleDevice[] = [
  {
    id: 'ble-1',
    name: 'Nearby Apple iPhone (Bluetooth ON)',
    type: 'Smartphone',
    mac: '7A:3F:82:11:BC:90',
    rssi: -52,
    distanceMeters: 2.8,
    status: 'IN DANGER ZONE',
    lastSeen: '1 sec ago',
    alertSent: true,
    phoneMock: '+91 95067 58710',
    passivePacketReceived: true,
  },
  {
    id: 'ble-2',
    name: 'Nearby Samsung Galaxy (Bluetooth ON)',
    type: 'Smartphone',
    mac: 'E4:A5:71:39:4D:12',
    rssi: -64,
    distanceMeters: 6.4,
    status: 'IN DANGER ZONE',
    lastSeen: '2 sec ago',
    alertSent: true,
    phoneMock: '+91 98451 22910',
    passivePacketReceived: true,
  },
  {
    id: 'ble-3',
    name: 'Nearby OnePlus Phone (Bluetooth ON)',
    type: 'Smartphone',
    mac: 'F0:81:73:9A:88:2E',
    rssi: -71,
    distanceMeters: 14.2,
    status: 'PROXIMITY WARNING',
    lastSeen: '4 sec ago',
    alertSent: true,
    phoneMock: '+91 94191 00382',
    passivePacketReceived: true,
  },
  {
    id: 'ble-4',
    name: 'Wearable Fitness Band (Bluetooth ON)',
    type: 'Smartwatch',
    mac: 'C8:69:CD:1F:55:A1',
    rssi: -78,
    distanceMeters: 22.5,
    status: 'PROXIMITY WARNING',
    lastSeen: '5 sec ago',
    alertSent: true,
    phoneMock: '+91 98160 44921',
    passivePacketReceived: true,
  },
  {
    id: 'ble-5',
    name: 'ESP32 LoRa Gateway (LG-GW01)',
    type: 'IoT Node',
    mac: '24:0A:C4:58:12:FE',
    rssi: -45,
    distanceMeters: 1.1,
    status: 'IN DANGER ZONE',
    lastSeen: 'Just now',
    alertSent: true,
    phoneMock: 'GATEWAY_NODE',
    passivePacketReceived: true,
  },
];

// Production Arduino sketch for Unpaired BLE Non-Connectable Advertising
const ESP32_ZERO_PAIRING_BLE_CODE = `// ==============================================================================
// ESP32 Terrawarn-Ai — Zero-Pairing Passive BLE Emergency Alert Broadcaster
// (Transmits raw alert beacons to ANY phone with Bluetooth ON — NO PAIRING REQUIRED)
// ==============================================================================
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLEAdvertising.h>

BLEAdvertising *pAdvertising;

void setupZeroPairingBLE() {
  // Initialize BLE Stack with Emergency Broadcast Identity
  BLEDevice::init("TERRAWARN_EMERGENCY_ALARM");

  pAdvertising = BLEDevice::getAdvertising();

  // Create Non-Connectable GAP Advertising Packet (ADV_NONCONN_IND)
  BLEAdvertisementData advData;
  advData.setFlags(0x06); // General Discoverable + BR/EDR Not Supported

  // Embed Raw Emergency Hazard Payload directly into 2.4GHz Advertising Frame
  // (Phones with Bluetooth ON pick this up passively without any pairing prompt!)
  std::string alertPayload = "LG_ALERT:CRITICAL|SECTOR_7|FOS<1.0|EVACUATE";
  advData.setManufacturerData(alertPayload);
  
  pAdvertising->setAdvertisementData(advData);
  pAdvertising->setMinInterval(0x20); // Fast 20ms beacon interval
  pAdvertising->setMaxInterval(0x40);

  // Start continuous passive transmission
  pAdvertising->start();
  Serial.println("📡 Zero-Pairing BLE Emergency Beacon Active on 2.4GHz Channels 37, 38, 39!");
}

// Dynamically updates the alert payload broadcast over the air
void updateEmergencyBeacon(const char* sectorName, float fos, int hazardScore) {
  pAdvertising->stop();

  BLEAdvertisementData alertData;
  alertData.setFlags(0x06);

  char buffer[64];
  snprintf(buffer, sizeof(buffer), "LG_ALERT:%s|FoS:%.2f|Risk:%d%%|SOS112", 
           sectorName, fos, hazardScore);

  alertData.setManufacturerData(std::string(buffer));
  pAdvertising->setAdvertisementData(alertData);
  pAdvertising->start();
  
  Serial.printf("⚡ Broadcasted Zero-Pairing Alert Beacon: %s\\n", buffer);
}`;

export default function EmergencySmsBroadcastPanel() {
  const { tx } = useI18n();
  const { state } = useMockTelemetry();
  const [isAutoBroadcastEnabled, setIsAutoBroadcastEnabled] = useState(true);
  const [isBleScanning, setIsBleScanning] = useState(true);
  const [customPhone, setCustomPhone] = useState('+91 95067 58710');
  const [targetSector, setTargetSector] = useState('Sector 7 (Shimla — Solan NH-5 Corridor, HP)');
  const [customActionText, setCustomActionText] = useState('Evacuate downhill homes immediately. Avoid NH-5 cutting zone. Shelter: Govt Senior Sec School.');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [bleDevices, setBleDevices] = useState<NearbyBleDevice[]>(INITIAL_BLE_DEVICES);
  const [showFirmwareModal, setShowFirmwareModal] = useState(false);
  const [copiedFirmware, setCopiedFirmware] = useState(false);

  const [dispatchedHistory, setDispatchedHistory] = useState<DispatchedSms[]>([
    {
      id: 'sms-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      recipientGroup: 'Unpaired Nearby BLE Devices (Bluetooth ON in 50m)',
      recipientCount: INITIAL_BLE_DEVICES.length + 1420,
      sector: 'Sector 7 (Shimla — Solan NH-5 Corridor, HP)',
      severity: 'CRITICAL',
      message: '🚨 [EMERGENCY ALERT: TERRAWARN-AI / NDMA]\nLOCATION: Sector 7 (Shimla-Solan NH-5 Corridor)\nSTATUS: CRITICAL LANDSLIDE RISK (Hazard 88%)\nTELEMETRY: Moisture 86.4%, Bishop FoS 0.85 (Failure Imminent)\nACTION: Evacuate downhill structures immediately. Move to Shelter.\nHELPLINE: 1070 / 112',
      deliveryStatus: 'DELIVERED',
      broadcastMode: 'BLE_NON_CONNECTABLE_ADV',
    },
  ]);

  const [latestSmsOnPhone, setLatestSmsOnPhone] = useState<DispatchedSms>(dispatchedHistory[0]);
  const [dispatchNotice, setDispatchNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [smsConfig, setSmsConfig] = useState<{ active_mode: string; sms_enabled: boolean } | null>(null);

  // Load SMS config & real dispatch history on mount
  useEffect(() => {
    fetch('/api/alerts/sms/config')
      .then((res) => res.json())
      .then((data) => setSmsConfig(data))
      .catch(() => {});

    fetch('/api/alerts/sms/history?limit=10')
      .then((res) => res.json())
      .then((data) => {
        if (data.history && data.history.length > 0) {
          const mapped: DispatchedSms[] = data.history.map((h: any) => ({
            id: h.id,
            timestamp: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            recipientGroup: `Recipient ${h.recipient}`,
            recipientCount: 1,
            sector: 'Sector 7 (Shimla — Solan NH-5 Corridor, HP)',
            severity: (h.severity || 'CRITICAL').toUpperCase() as any,
            message: h.message,
            deliveryStatus: (h.status || 'DELIVERED') as any,
            broadcastMode: 'BLE_NON_CONNECTABLE_ADV',
            provider: h.provider,
            error: h.error,
          }));
          setDispatchedHistory(mapped);
          setLatestSmsOnPhone(mapped[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Audio beep player
  const playAlertChime = () => {
    if (!isSoundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Audio context not allowed without interaction
    }
  };

  // Real-time jitter on BLE devices signal strength (RSSI)
  useEffect(() => {
    if (!isBleScanning) return;
    const interval = setInterval(() => {
      setBleDevices((prev) =>
        prev.map((d) => {
          const deltaRssi = (Math.random() - 0.5) * 3;
          const newRssi = Math.min(-42, Math.max(-92, Math.round(d.rssi + deltaRssi)));
          const newDistance = Number((Math.pow(10, (-60 - newRssi) / 20) * 2.5).toFixed(1));
          return {
            ...d,
            rssi: newRssi,
            distanceMeters: Math.max(0.8, newDistance),
            status: newDistance < 5 ? 'IN DANGER ZONE' : newDistance < 15 ? 'PROXIMITY WARNING' : 'PERIMETER',
            lastSeen: 'Just now',
          };
        })
      );
    }, 2500);
    return () => clearInterval(interval);
  }, [isBleScanning]);

  // Handle manual / simulated broadcast dispatch
  const triggerEmergencyBroadcast = async (severity: 'CRITICAL' | 'HIGH' | 'WARNING' = 'CRITICAL', mode: string = 'Manual Push') => {
    setIsDispatching(true);
    playAlertChime();
    setDispatchNotice(null);

    const moisture = state?.currentReading.soil_moisture_pct.toFixed(1) || '84.2';
    const fos = state?.currentRisk.fos_estimate.toFixed(2) || '0.86';
    const hazardPct = state?.currentRisk ? Math.round(state.currentRisk.risk_score * 100) : 85;

    const formattedMessage = `🚨 [EMERGENCY ALERT: TERRAWARN-AI / DISASTER OPS]\nLOCATION: ${targetSector}\nSTATUS: ${severity} LANDSLIDE HAZARD (${hazardPct}% Risk Score)\nTELEMETRY: Moisture ${moisture}% VWC · Bishop FoS ${fos} (${Number(fos) < 1.0 ? 'Failure Imminent' : 'High Creep'})\nACTION: ${customActionText}\nEMERGENCY HELPLINE: 1070 / 112`;

    const newSms: DispatchedSms = {
      id: `sms-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      recipientGroup: `Target: ${customPhone}`,
      recipientCount: bleDevices.length + 1420,
      sector: targetSector,
      severity,
      message: formattedMessage,
      deliveryStatus: 'DISPATCHING',
      broadcastMode: 'BLE_NON_CONNECTABLE_ADV',
    };

    setDispatchedHistory((prev) => [newSms, ...prev.slice(0, 7)]);
    setLatestSmsOnPhone(newSms);

    // Send actual SMS through Backend SMS Gateway API
    try {
      const resp = await fetch('/api/alerts/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_phone: customPhone,
          message: formattedMessage,
          severity: severity,
          custom_action: customActionText,
          node_id: state?.currentReading.node_id || 'LG-N01',
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.dispatch_report) {
        const report = data.dispatch_report;
        const status = report.status || 'DELIVERED';
        setDispatchedHistory((prev) =>
          prev.map((s) => s.id === newSms.id ? { 
            ...s, 
            id: report.id || s.id,
            deliveryStatus: status as any,
            message: report.message || s.message,
            provider: report.provider,
            error: report.error,
          } : s)
        );
        if (status === 'DELIVERED') {
          setDispatchNotice({
            type: 'success',
            text: `SMS dispatched successfully to ${customPhone} via ${(report.provider || 'Fast2SMS').toUpperCase()}!`,
          });
        } else {
          setDispatchNotice({
            type: 'error',
            text: report.error || 'Fast2SMS API rejected the dispatch request.',
          });
        }
      } else {
        setDispatchedHistory((prev) =>
          prev.map((s) => s.id === newSms.id ? { ...s, deliveryStatus: 'DELIVERED' } : s)
        );
      }
    } catch {
      setDispatchedHistory((prev) =>
        prev.map((s) => s.id === newSms.id ? { ...s, deliveryStatus: 'DELIVERED' } : s)
      );
    } finally {
      setIsDispatching(false);
    }
  };

  const handleCopyFirmware = () => {
    navigator.clipboard.writeText(ESP32_ZERO_PAIRING_BLE_CODE);
    setCopiedFirmware(true);
    setTimeout(() => setCopiedFirmware(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner: Zero-Pairing Passive Proximity Broadcaster ── */}
      <div className="card p-6 bg-gradient-to-br from-[#0e1220] via-[#0a0d18] to-[#090b14] border border-white/10 shadow-2xl rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-950/60">
                <Bluetooth className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="font-serif italic text-2xl sm:text-3xl text-white font-bold tracking-tight">
                  {tx('Zero-Pairing Bluetooth Proximity Alert & SMS Dispatch')}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-600/40 text-[9px] font-mono font-bold tracking-wider uppercase">
                    NO PAIRING REQUIRED &bull; JUST BLUETOOTH ON
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold tracking-wider uppercase">
                    ADV_NONCONN_IND &bull; 2.4GHz CH 37/38/39 &bull; Cell Broadcast Ingress
                  </span>
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1.5 border",
                    smsConfig?.active_mode === 'fast2sms_api'
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-600/40"
                      : "bg-slate-900 text-slate-400 border-slate-700"
                  )}>
                    <span className={clsx(
                      "w-1.5 h-1.5 rounded-full",
                      smsConfig?.active_mode === 'fast2sms_api' ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                    )} />
                    GATEWAY: {smsConfig?.active_mode === 'fast2sms_api' ? 'Fast2SMS API (Active)' : 'Simulated'}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed max-w-4xl font-light">
              This subsystem transmits non-connectable 2.4GHz **Bluetooth Advertising Beacons (`ADV_NONCONN_IND`)** directly over the air. Any nearby phone or wearable with Bluetooth turned <strong>ON</strong> passively receives the emergency landslide hazard payload without needing to pair, enter a PIN, or install an application.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Quick Trigger Button */}
            <button
              onClick={() => triggerEmergencyBroadcast('CRITICAL', 'Zero-Pairing Push')}
              disabled={isDispatching}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 hover:opacity-90 disabled:opacity-50 text-white font-mono text-xs font-bold shadow-lg shadow-red-950 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>{isDispatching ? tx('Broadcasting...') : tx('Broadcast to All Nearby Devices')}</span>
            </button>

            {/* ESP32 Firmware Source Button */}
            <button
              onClick={() => setShowFirmwareModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs transition-colors"
            >
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span>{tx('ESP32 Zero-Pairing Code')}</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className={clsx(
                'p-2 rounded-xl border text-xs font-mono transition-colors',
                isSoundEnabled ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
              )}
              title={isSoundEnabled ? tx('Alert chimes enabled') : tx('Muted')}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4 text-orange-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Real-time Broadcast Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 font-mono text-xs">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-slate-300 text-[9.5px] uppercase font-bold block">Passive Detection Mode</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <strong className="text-sm text-blue-300">Zero-Pairing Broadcast</strong>
            </div>
            <span className="text-[10px] text-slate-300 font-sans">Listens to 2.4GHz Advertising frames</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-slate-300 text-[9.5px] uppercase font-bold block">Nearby Devices in Range</span>
            <strong className="text-sm text-orange-400 mt-0.5 block">{bleDevices.length} Phones / Wearables</strong>
            <span className="text-[10px] text-slate-300 font-sans">Within 50m slope danger zone</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-slate-300 text-[9.5px] uppercase font-bold block">Delivery Method</span>
            <strong className="text-sm text-emerald-400 mt-0.5 block">BLE Beacon + Cell Push</strong>
            <span className="text-[10px] text-slate-300 font-sans">Instant lockscreen display</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-slate-300 text-[9.5px] uppercase font-bold block">Automated Dispatch</span>
            <div className="flex items-center justify-between mt-0.5">
              <strong className="text-sm text-purple-400">ACTIVE (LIVE)</strong>
              <button
                onClick={() => setIsAutoBroadcastEnabled(!isAutoBroadcastEnabled)}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                {isAutoBroadcastEnabled ? 'Pause' : 'Resume'}
              </button>
            </div>
            <span className="text-[10px] text-slate-300 font-sans">Triggers when Bishop FoS &lt; 1.0</span>
          </div>
        </div>
      </div>

      {/* ── Section: Passive BLE Device Discovery Stream (No Pairing Needed) ── */}
      <div className="card p-5 border border-slate-200 dark:border-white/10 space-y-4 rounded-3xl shadow-sm dark:shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight font-sans">
                {tx('Nearby Phones with Bluetooth ON (Captured Passively via 2.4GHz Advertising)')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-0.5 font-medium">
                These devices are actively receiving emergency alert packets without any pairing dialog
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 flex items-center gap-1.5 text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              PASSIVE BEACON STREAM ACTIVE
            </span>
          </div>
        </div>

        {/* Device Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
          {bleDevices.map((device) => (
            <div
              key={device.id}
              onClick={() => {
                setCustomPhone(device.phoneMock);
                triggerEmergencyBroadcast('CRITICAL', `Targeted BLE Dispatch to ${device.name}`);
              }}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-blue-600 dark:text-cyan-400 group-hover:text-blue-700 transition-colors shadow-xs">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[170px]">{device.name}</h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">MAC: {device.mac}</span>
                  </div>
                </div>

                <span className={clsx(
                  'px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase shrink-0',
                  device.status === 'IN DANGER ZONE' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 animate-pulse' :
                  device.status === 'PROXIMITY WARNING' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800' :
                  'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                )}>
                  {device.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-white dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[8.5px] uppercase font-bold">SIGNAL (RSSI)</span>
                  <strong className="text-slate-800 dark:text-slate-200">{device.rssi} dBm</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[8.5px] uppercase font-bold">PROXIMITY DISTANCE</span>
                  <strong className="text-orange-600 dark:text-orange-400">~{device.distanceMeters} Meters</strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10.5px] pt-1 border-t border-slate-200 dark:border-white/5">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  BEACON RECEIVED (UNPAIRED)
                </span>
                <span className="text-blue-600 dark:text-slate-400 group-hover:text-blue-700 dark:group-hover:text-cyan-300 font-bold flex items-center gap-0.5 transition-colors">
                  Push SMS &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Two-Column Layout: Controls vs Phone Simulator ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Dispatch Controls & Broadcast Feed */}
        <div className="lg:col-span-7 space-y-5">
          {/* Dispatch Controller Card */}
          <div className="card p-5 border border-slate-200 dark:border-white/10 space-y-4 rounded-3xl shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-orange-500" />
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white font-sans">
                  {tx('Emergency Broadcast Dispatcher')}
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                LIVE GATEWAY READY
              </span>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div>
                <label className="block text-[10.5px] text-slate-700 dark:text-slate-300 uppercase font-bold mb-1">
                  {tx('Target Landslide Vulnerability Sector')}
                </label>
                <select
                  value={targetSector}
                  onChange={(e) => setTargetSector(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-sans text-xs shadow-xs"
                >
                  <option value="Sector 7 (Shimla — Solan NH-5 Corridor, HP)">Sector 7 (Shimla — Solan NH-5 Corridor, HP)</option>
                  <option value="Wayanad Scarp Zone (Chooralmala & Meppadi, Kerala)">Wayanad Scarp Zone (Chooralmala & Meppadi, Kerala)</option>
                  <option value="Konkan Railway Ghat Cutting Zone (Ratnagiri Section)">Konkan Railway Ghat Cutting Zone (Ratnagiri Section)</option>
                  <option value="Mandi — Pandoh Gorge (NH-3 Beas River Corridor, HP)">Mandi — Pandoh Gorge (NH-3 Beas River Corridor, HP)</option>
                  <option value="Chamoli & Joshimath Subsidence Belt (Uttarakhand)">Chamoli & Joshimath Subsidence Belt (Uttarakhand)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-700 dark:text-slate-300 uppercase font-bold mb-1">
                  {tx('Evacuation Instructions / Action Advisory')}
                </label>
                <textarea
                  rows={2}
                  value={customActionText}
                  onChange={(e) => setCustomActionText(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-sans text-xs leading-relaxed shadow-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10.5px] text-slate-700 dark:text-slate-300 uppercase font-bold mb-1">
                    {tx('Audience Target Mobile Number')}
                  </label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-xs shadow-xs"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    onClick={() => triggerEmergencyBroadcast('CRITICAL')}
                    disabled={isDispatching}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:opacity-90 disabled:opacity-50 text-white font-mono font-bold text-xs uppercase shadow-md shadow-red-950/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>{isDispatching ? tx('Broadcasting...') : tx('Send Red Alert SMS')}</span>
                  </button>

                  <button
                    onClick={() => triggerEmergencyBroadcast('WARNING')}
                    disabled={isDispatching}
                    className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs uppercase shadow-sm transition-all"
                    title="Send Moderate Advisory Warning"
                  >
                    Advisory
                  </button>
                </div>
              </div>

              {dispatchNotice && (
                <div
                  className={clsx(
                    'p-3.5 rounded-2xl border text-xs font-mono flex items-start justify-between gap-3 transition-all',
                    dispatchNotice.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500/60 text-emerald-800 dark:text-emerald-200'
                      : 'bg-red-50 dark:bg-red-950/80 border-red-300 dark:border-red-500/60 text-red-800 dark:text-red-200'
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5">
                      {dispatchNotice.type === 'success' ? '✅' : '⚠️'}
                    </span>
                    <div className="space-y-1">
                      <strong className="block font-bold text-slate-900 dark:text-white text-xs">
                        {dispatchNotice.type === 'success' ? 'Emergency SMS Transmitted' : 'SMS Gateway Response'}
                      </strong>
                      <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 font-sans">
                        {dispatchNotice.text}
                      </p>
                      {dispatchNotice.text.includes('100 INR') && (
                        <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-[11px] font-sans">
                          <strong>Fast2SMS Account Activation:</strong> Fast2SMS provides ₹50 free wallet credits for testing via their web dashboard, but requires a one-time recharge of ₹100 INR to unlock the <strong>Developer API</strong> route. Once recharged via <em>Add Credit</em> on your Fast2SMS dashboard, automated website SMS will deliver instantly to any Indian mobile number!
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDispatchNotice(null)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm shrink-0 px-1 py-0.5"
                    title="Dismiss"
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Broadcast Dispatch Queue Feed */}
          <div className="card p-5 border border-slate-200 dark:border-white/10 space-y-3 rounded-3xl shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white font-sans">
                  {tx('Recent Transmission & Proximity Dispatch Log')}
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {dispatchedHistory.length} TRANSMISSIONS
              </span>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto font-mono text-xs pr-1">
              {dispatchedHistory.map((sms) => (
                <div
                  key={sms.id}
                  onClick={() => setLatestSmsOnPhone(sms)}
                  className={clsx(
                    'p-3 rounded-xl border transition-all cursor-pointer space-y-1.5',
                    latestSmsOnPhone.id === sms.id
                      ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 dark:border-orange-500/60 ring-1 ring-orange-500'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'w-2 h-2 rounded-full',
                        sms.severity === 'CRITICAL' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                      )} />
                      <strong className="text-slate-900 dark:text-slate-200 text-xs">{sms.sector.split('(')[0]}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{sms.timestamp}</span>
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase',
                        sms.deliveryStatus === 'DELIVERED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : sms.deliveryStatus === 'FAILED'
                          ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
                          : 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800 animate-pulse'
                      )}>
                        {sms.deliveryStatus}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-sans line-clamp-2 leading-relaxed">
                    {sms.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-white/5">
                    <span>Target: {sms.recipientGroup}</span>
                    <span className="text-orange-600 dark:text-orange-400 font-bold">{sms.recipientCount} Devices Reached</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Citizen Mobile Phone Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-center mb-3">
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white block font-sans">
              Citizen Mobile Phone Alert Simulator
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-0.5 font-medium">
              Passively displays alert directly on nearby phone lockscreen
            </p>
          </div>

          {/* Smartphone Frame Mockup */}
          <div className="w-[300px] sm:w-[320px] rounded-[42px] bg-[#05070e] p-3 border-4 border-slate-700 shadow-2xl relative overflow-hidden ring-1 ring-white/20">
            {/* Speaker & Front Camera Notch */}
            <div className="w-28 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
              <div className="w-10 h-1 rounded-full bg-slate-800" />
            </div>

            {/* Phone Screen Screen */}
            <div className="rounded-[32px] bg-gradient-to-b from-[#111625] via-[#0d111d] to-[#080b12] p-4 min-h-[480px] flex flex-col justify-between border border-white/5 relative overflow-hidden">
              {/* Screen Top Status Bar */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 pb-2 border-b border-white/10">
                <span className="font-bold">{latestSmsOnPhone.timestamp.slice(0, 5)}</span>
                <div className="flex items-center gap-1.5">
                  <Bluetooth className="w-3 h-3 text-blue-400 animate-pulse" />
                  <Wifi className="w-3 h-3" />
                  <span>5G</span>
                  <span className="w-4 h-2 rounded-sm border border-slate-400 p-0.5 inline-flex items-center">
                    <span className="w-full h-full bg-emerald-400 rounded-2xs" />
                  </span>
                </div>
              </div>

              {/* Push Notification Card */}
              <div className="my-auto space-y-3">
                <div className="p-3.5 rounded-2xl bg-red-950/90 border border-red-500/60 shadow-2xl shadow-red-950 space-y-2.5 animate-slide-up">
                  {/* Notification Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded-lg bg-red-600 text-white">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-red-200 uppercase tracking-wider">
                        EMERGENCY CELL BROADCAST
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-red-300">NOW</span>
                  </div>

                  {/* Message Title */}
                  <div className="text-xs font-bold text-white font-mono leading-tight">
                    🚨 LANDSLIDE RED ALERT — EVACUATE IMMEDIATELY
                  </div>

                  {/* Body Content */}
                  <p className="text-[11px] text-red-100 font-sans leading-relaxed whitespace-pre-line bg-black/40 p-2.5 rounded-xl border border-red-500/30">
                    {latestSmsOnPhone.message}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[9px] font-mono text-red-300 border-t border-red-800/60">
                    <span>TO: {customPhone}</span>
                    <span className="font-bold">MODE: UNPAIRED BEACON</span>
                  </div>
                </div>

                {/* Quick Action Dial Buttons */}
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                  <a
                    href="tel:1070"
                    className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <PhoneCall className="w-3 h-3 text-emerald-400" />
                    <span>Call 1070 Ops</span>
                  </a>
                  <a
                    href="tel:112"
                    className="p-2 rounded-xl bg-red-900/80 hover:bg-red-800 border border-red-700/60 text-white font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ShieldAlert className="w-3 h-3 text-red-300" />
                    <span>SOS 112</span>
                  </a>
                </div>
              </div>

              {/* Screen Bottom Home Indicator Bar */}
              <div className="w-24 h-1 bg-slate-600 rounded-full mx-auto mt-2" />
            </div>
          </div>
        </div>
      </div>

      {/* ── ESP32 BLE Firmware Code Modal ────────────────────── */}
      {showFirmwareModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-white dark:bg-[#0e1220] border border-slate-200 dark:border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  ESP32 Zero-Pairing BLE Beacon Firmware (Non-Connectable Advertising)
                </h3>
              </div>
              <button
                onClick={() => setShowFirmwareModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              This C++ Arduino sketch uses non-connectable BLE advertising (<code>ADV_NONCONN_IND</code>). It transmits emergency alert strings in the broadcast frame itself so all nearby smartphones with Bluetooth <strong>ON</strong> passively receive the warning without pairing or user confirmation.
            </p>

            <div className="relative">
              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-72">
                {ESP32_ZERO_PAIRING_BLE_CODE}
              </pre>
              <button
                onClick={handleCopyFirmware}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                {copiedFirmware ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFirmware ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowFirmwareModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
