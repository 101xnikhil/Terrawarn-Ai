import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Bot, User, Sparkles, Volume2, VolumeX, 
  MapPin, AlertTriangle, Activity, Waves, Layers, RotateCcw,
  Compass, ShieldCheck, ChevronRight, Zap, Search, Globe, Mountain,
  CloudRain, ShieldAlert, ArrowUpRight, BookOpen, Filter,
  Square, Play, Pause, Radio, ChevronDown, Check
} from 'lucide-react';
import clsx from 'clsx';
import { useMockTelemetry } from '../../hooks/useMockTelemetry';
import { ttsService, CURATED_VOICES } from '../../services/ttsService';

interface LocationProfile {
  id: string;
  name: string;
  region: 'Himalayas' | 'Western Ghats' | 'Garhwal' | 'Railway / Highway';
  state: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  coordinates: string;
  elevation: string;
  soilType: string;
  bedrock: string;
  triggerRainfallThreshold: string;
  recurrencePeriod: string;
  historicalDisasters: string;
  recurringCause: string;
  mitigationStrategy: string;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  locationCard?: LocationProfile;
  liveTelemetryCard?: boolean;
}

const REGIONAL_LOCATIONS: LocationProfile[] = [
  {
    id: 'loc-wayanad',
    name: 'Wayanad (Chooralmala & Meppadi)',
    region: 'Western Ghats',
    state: 'Kerala',
    riskLevel: 'CRITICAL',
    coordinates: '11.5434° N, 76.1362° E',
    elevation: '700 – 1,150 m MSL',
    soilType: 'Lateritic clay-sand with high hydraulic conductivity',
    bedrock: 'Charnockite & Hornblende Gneiss',
    triggerRainfallThreshold: '> 250 mm / 24 hours',
    recurrencePeriod: 'Every 2 – 4 years during extreme monsoon spells',
    historicalDisasters: 'July 2024 Mega Debris Avalanche (400+ casualties), 2019 Puthumala Landslide',
    recurringCause: 'Hyper-concentrated torrential cloudbursts saturating porous laterite overburden resting on smooth, impermeable sloping bedrock.',
    mitigationStrategy: 'Borehole piezometers, deep subsurface horizontal drainage pipes, and community early warning sirens.',
  },
  {
    id: 'loc-shimla',
    name: 'Shimla — Solan Corridor (NH-5 & Sector 7)',
    region: 'Himalayas',
    state: 'Himachal Pradesh',
    riskLevel: 'CRITICAL',
    coordinates: '31.1048° N, 77.1734° E',
    elevation: '1,800 – 2,200 m MSL',
    soilType: 'Colluvial talus and fractured micaceous silt',
    bedrock: 'Jutogh Group Phyllites and Quartzites',
    triggerRainfallThreshold: '> 140 mm / 24 hours',
    recurrencePeriod: 'Annual recurring event during July–August monsoons',
    historicalDisasters: 'August 2023 Summer Hill Shiv Temple slide, multiple NH-5 blockades at Chakki Mor',
    recurringCause: 'Steep road widening cutting away natural toe resistance, high antecedent pore-water pressure, and overloaded building terraces.',
    mitigationStrategy: 'Reinforced soil retaining walls, micropiles, toe-buttress gabions, and LoRa edge tiltmeters.',
  },
  {
    id: 'loc-konkan',
    name: 'Konkan Railway Ghat Cutting Zone',
    region: 'Railway / Highway',
    state: 'Maharashtra / Goa',
    riskLevel: 'HIGH',
    coordinates: '17.2934° N, 73.4124° E',
    elevation: '150 – 600 m MSL',
    soilType: 'Weathered red clayey laterite',
    bedrock: 'Stratified Deccan Traps Basalt',
    triggerRainfallThreshold: '> 180 mm / 24 hours',
    recurrencePeriod: 'Recurring every monsoon season',
    historicalDisasters: 'Periodic monsoon boulders & rotational mudslides disrupting Mumbai–Goa train traffic',
    recurringCause: 'High pore-water pressure along basalt lithological contacts during continuous Western Ghat deluges.',
    mitigationStrategy: 'Automated railway track signal interlocks, high-tensile rockfall netting, and slope sensor arrays.',
  },
  {
    id: 'loc-mandi',
    name: 'Mandi — Pandoh — Aut Gorge (NH-3)',
    region: 'Himalayas',
    state: 'Himachal Pradesh',
    riskLevel: 'HIGH',
    coordinates: '31.7088° N, 76.9318° E',
    elevation: '850 – 1,400 m MSL',
    soilType: 'Loose alluvial & fluvio-glacial boulders',
    bedrock: 'Granitic gneiss and mica-schist',
    triggerRainfallThreshold: '> 160 mm / 24 hours',
    recurrencePeriod: '1 – 2 years during heavy monsoon swells',
    historicalDisasters: 'July–August 2023 Beas river deluge sweeping away NH-3 carriageways and tunnel approaches',
    recurringCause: 'Aggressive river toe scouring by the swollen Beas River liquefying saturated overburden slopes.',
    mitigationStrategy: 'Heavy rip-rap river armouring, rock bolt anchoring, and acoustic emission displacement sensors.',
  },
  {
    id: 'loc-chamoli',
    name: 'Joshimath — Chamoli Subsidizing Slopes',
    region: 'Garhwal',
    state: 'Uttarakhand',
    riskLevel: 'CRITICAL',
    coordinates: '30.5562° N, 79.5674° E',
    elevation: '1,890 – 2,180 m MSL',
    soilType: 'Ancient landslide debris & unconsolidated scree',
    bedrock: 'Vaikrita Central Crystallines (Gneiss & Quartz-mica schist)',
    triggerRainfallThreshold: '> 120 mm / 24 hours (or continuous winter snowmelt)',
    recurrencePeriod: 'Chronic continuous land subsidence',
    historicalDisasters: 'January 2023 Joshimath Land Sinking Crisis, 2021 Rishi Ganga Flash Deluge',
    recurringCause: 'Perched old landslide mass undergoing gradual basal shear sliding due to inadequate town drainage and aquifer breaching.',
    mitigationStrategy: 'Complete underground drainage network, strict construction moratorium, and continuous InSAR + Tilt telemetry.',
  },
  {
    id: 'loc-munnar',
    name: 'Munnar — Pettimudi Tea Estate Slopes',
    region: 'Western Ghats',
    state: 'Kerala',
    riskLevel: 'HIGH',
    coordinates: '10.0889° N, 77.0595° E',
    elevation: '1,500 – 1,750 m MSL',
    soilType: 'High-organic lateritic humus and sandy loam',
    bedrock: 'Granite-Gneiss with sheet jointing',
    triggerRainfallThreshold: '> 220 mm / 24 hours',
    recurrencePeriod: '3 – 5 years during intense Southwest monsoons',
    historicalDisasters: 'August 2020 Pettimudi Debris Avalanche (66 fatalities)',
    recurringCause: 'Planar slip along steep joint planes triggered when intense rain infiltrates weathered tea plantation topsoil.',
    mitigationStrategy: 'Deep-rooted vetiver grass bio-engineering, rainfall intensity gauges, and automated cell-broadcast SMS.',
  },
];

const PRESET_QUESTIONS = [
  { label: '🏔️ Live Station Status', prompt: 'What is the current live geotechnical stability and risk level at station LG-N01?' },
  { label: '📍 Wayanad Disaster', prompt: 'Tell me about the recurring landslide risks and causes in Wayanad, Kerala.' },
  { label: '🛣️ Shimla NH-5 Risk', prompt: 'Why do landslides happen repeatedly along the Shimla-Solan NH-5 corridor?' },
  { label: '🚂 Railway Cuttings', prompt: 'How does Terrawarn-Ai protect rail corridors in the Konkan and Ghat sectors?' },
  { label: '❓ Why landslides recur?', prompt: 'What are the main scientific reasons landslides happen in the same specific locations repeatedly?' },
];

export default function VirtualChatbotModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'locations'>('chat');
  const [inputQuery, setInputQuery] = useState('');
  const [isTtsEnabled, setIsTtsEnabled] = useState(() => {
    try {
      return localStorage.getItem('terrawarn_tts_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [selectedVoice, setSelectedVoice] = useState(() => ttsService.getSelectedVoice());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePlayingMsgId, setActivePlayingMsgId] = useState<string | null>(null);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('ALL');
  const [locationSearchTerm, setLocationSearchTerm] = useState('');

  const { state } = useMockTelemetry();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'bot',
      text: "Hello! I am Terrawarn GeoBot — your interactive Geotechnical AI Assistant. I provide real-time updates on active slope situations, explain why recurring landslides happen, and analyze vulnerable high-risk geographic corridors across India.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    const unsub = ttsService.onSpeakingChange((speaking) => {
      setIsSpeaking(speaking);
      if (!speaking) setActivePlayingMsgId(null);
    });
    return () => {
      unsub();
      ttsService.stop();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      ttsService.stop();
      setShowVoiceMenu(false);
    }
  }, [isOpen]);

  const speakText = (text: string, msgId?: string) => {
    if (!isTtsEnabled) return;
    if (activePlayingMsgId === msgId && isSpeaking) {
      ttsService.stop();
      setActivePlayingMsgId(null);
      return;
    }
    setActivePlayingMsgId(msgId || 'latest');
    ttsService.speak(
      text,
      selectedVoice,
      () => setActivePlayingMsgId(null),
      (err) => {
        console.warn('Neural TTS playback error:', err);
        setActivePlayingMsgId(null);
      }
    );
  };

  const handleSend = (customPrompt?: string) => {
    const query = (customPrompt || inputQuery).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputQuery('');

    // Generate intelligent AI geotechnical response
    setTimeout(() => {
      const response = generateBotResponse(query);
      setMessages((prev) => [...prev, response]);
      if (isTtsEnabled) {
        speakText(response.text, response.id);
      }
    }, 450);
  };

  const generateBotResponse = (query: string): ChatMessage => {
    const q = query.toLowerCase();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Current Live Telemetry & Station Situation
    if (q.includes('current') || q.includes('live') || q.includes('station') || q.includes('lg-n01') || q.includes('situation') || q.includes('status')) {
      const reading = state?.currentReading;
      const risk = state?.currentRisk;
      
      const text = `📊 **Current Live Geotechnical Situation (Station LG-N01, Sector 7)**\n\n` +
        `• **Hazard Risk Level**: **${risk?.risk_level || 'LOW'}** (${((risk?.risk_score || 0.14) * 100).toFixed(0)}% Probability)\n` +
        `• **Bishop Factor of Safety (FoS)**: **${(risk?.fos_estimate || 1.84).toFixed(2)}** (${(risk?.fos_estimate || 1.84) < 1.0 ? 'CRITICAL - Shear failure imminent' : (risk?.fos_estimate || 1.84) < 1.3 ? 'WARNING - Pore pressure rising' : 'STABLE'})\n` +
        `• **Soil Moisture (VWC)**: **${(reading?.soil_moisture_pct || 24.2).toFixed(1)}%** | **24h Rainfall**: **${(reading?.rainfall_24h_mm || 18.0).toFixed(1)} mm**\n` +
        `• **Slope Incline & Creep Rate**: **${(reading?.tilt_angle || 21.8).toFixed(1)}°** (Rate: ${((reading?.tilt_rate || 0.002)).toFixed(3)}°/min)\n\n` +
        `💡 *Real-time LoRa 433MHz telemetry is transmitting normally at 10-second intervals.*`;

      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text,
        timestamp,
        liveTelemetryCard: true,
      };
    }

    // 2. Wayanad Specific
    if (q.includes('wayanad') || q.includes('meppadi') || q.includes('chooralmala') || q.includes('kerala')) {
      const loc = REGIONAL_LOCATIONS.find((l) => l.id === 'loc-wayanad')!;
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `📍 **Wayanad Corridor (Chooralmala & Meppadi) — Geotechnical Disaster Profile**\n\n` +
          `Wayanad experiences severe **hyper-concentrated debris avalanches** during intense 24h rainfall (>250mm). The disaster mechanism occurs because a highly porous, organic-rich laterite overburden (1.5–3m depth) rests on smooth, impermeable Charnockite bedrock. Rapid saturation creates a fluidized basal slip plane with extreme downhill velocity.`,
        timestamp,
        locationCard: loc,
      };
    }

    // 3. Shimla / Solan NH-5
    if (q.includes('shimla') || q.includes('solan') || q.includes('nh-5') || q.includes('himachal') || q.includes('summer hill')) {
      const loc = REGIONAL_LOCATIONS.find((l) => l.id === 'loc-shimla')!;
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `📍 **Shimla — Solan NH-5 Corridor — Geotechnical Disaster Profile**\n\n` +
          `The Shimla hills consist of fractured Jutogh Group phyllites and colluvium. Road widening has cut away the natural slope toe support, while heavy monsoon cloudbursts trigger deep-seated rotational slides and mud deluges. Terrawarn-Ai monitors both pore pressure and tilt acceleration to warn highway authorities before road collapse.`,
        timestamp,
        locationCard: loc,
      };
    }

    // 4. Konkan Railway
    if (q.includes('railway') || q.includes('konkan') || q.includes('train') || q.includes('track') || q.includes('cutting')) {
      const loc = REGIONAL_LOCATIONS.find((l) => l.id === 'loc-konkan')!;
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `📍 **Konkan Railway Deep Cuttings — Rockfall & Mudslide Protection**\n\n` +
          `Deep artificial railway cuttings through weathered Deccan Traps basalt experience sudden boulder falls and planar mudslides during heavy Western Ghats monsoon deluges. Terrawarn-Ai's LoRa mesh triggers automated railway track signal interlocks (<1.2s latency) to stop high-speed passenger trains before entering hazardous slip sections.`,
        timestamp,
        locationCard: loc,
      };
    }

    // 5. Why landslides recur
    if (q.includes('recur') || q.includes('repeat') || q.includes('why') || q.includes('cause') || q.includes('possibility') || q.includes('mechanism')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `🔬 **Why Landslides Recur at Specific Locations (Geotechnical Mechanics):**\n\n` +
          `1. **Pre-Existing Weak Shear Planes**: Once a slope has failed previously, its internal friction angle $\\phi'$ drops permanently from peak to residual shear strength.\n` +
          `2. **Pore-Water Pressure Saturation**: Ingressing rain fills soil voids ($u_w > 0$), reducing effective normal stress ($\\sigma' = \\sigma - u$) until shear stress exceeds shear resistance ($FoS < 1.0$).\n` +
          `3. **Anthropogenic Toe Scouring**: Road excavations and construction cut away the resisting toe mass of the slope, making the slope statically unstable.\n` +
          `4. **Hydrological Channeling**: Natural subterranean drainage paths funnel water into the exact same slip zones year after year.\n\n` +
          `💡 *Terrawarn-Ai tracks these factors continuously via multi-sensor fusion (Capacitive Moisture VWC + 6-Axis IMU Creep Velocity + Infinite Slope FoS).*`,
        timestamp,
      };
    }

    // Default Fallback
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `🤖 I analyzed your query about: "${query}".\n\n` +
        `You can ask me about:\n` +
        `• **Current Live Telemetry** at station LG-N01 (Moisture, Rainfall, Slope Incline, Bishop FoS)\n` +
        `• **Specific Location Vulnerabilities** (Wayanad, Shimla, Konkan Railway, Chamoli, Mandi, Munnar)\n` +
        `• **Scientific Failure Mechanisms** (How pore pressure decreases limit equilibrium stability)\n` +
        `• **Automated Public Warning** (Zero-Pairing BLE Beacons & CAP-compliant SMS Broadcast)`,
      timestamp,
    };
  };

  const selectLocationForAnalysis = (loc: LocationProfile) => {
    setActiveTab('chat');
    handleSend(`Provide in-depth geotechnical hazard analysis for ${loc.name} (${loc.state})`);
  };

  const toggleTts = () => {
    const next = !isTtsEnabled;
    setIsTtsEnabled(next);
    try {
      localStorage.setItem('terrawarn_tts_enabled', String(next));
    } catch {
      // Storage quota
    }
    if (!next) {
      ttsService.stop();
      setActivePlayingMsgId(null);
    }
  };

  const handleSelectVoice = (voiceId: string) => {
    setSelectedVoice(voiceId);
    ttsService.setSelectedVoice(voiceId);
    setShowVoiceMenu(false);
    const voiceObj = CURATED_VOICES.find((v) => v.id === voiceId);
    if (isTtsEnabled && voiceObj) {
      ttsService.speak(
        `Neural voice active. Connected to ${voiceObj.name.split(' ')[0]}.`,
        voiceId
      );
    }
  };

  const filteredLocations = REGIONAL_LOCATIONS.filter((loc) => {
    const matchesRegion = selectedRegionFilter === 'ALL' || loc.region === selectedRegionFilter;
    const matchesSearch = loc.name.toLowerCase().includes(locationSearchTerm.toLowerCase()) || 
                          loc.state.toLowerCase().includes(locationSearchTerm.toLowerCase()) ||
                          loc.soilType.toLowerCase().includes(locationSearchTerm.toLowerCase());
    return matchesRegion && matchesSearch;
  });

  return (
    <>
      {/* ── Floating Chatbot Widget Trigger Button ────────────── */}
      <div className="fixed bottom-6 right-6 z-[9998] flex items-center gap-2">
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border border-[#e5e9f2] dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xl animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Ask Terrawarn GeoBot</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 relative group',
            isOpen 
              ? 'bg-slate-800 text-white rotate-90' 
              : 'bg-[#2563eb] text-white hover:scale-105 shadow-blue-500/30'
          )}
          aria-label="Open Landslide AI Assistant"
          title="Open Terrawarn Virtual AI Assistant"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <Bot className="w-7 h-7 transition-transform group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-600 border-2 border-white dark:border-[#0f172a]"></span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* ── Chatbot Modal Window ─────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[500px] h-[660px] max-h-[88vh] z-[9999] bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl border border-[#e5e9f2] dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up font-sans">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 flex items-center justify-center shadow-xs">
                <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base text-slate-900 dark:text-white font-bold tracking-tight leading-none">
                    Terrawarn GeoBot
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 text-[9.5px] font-bold">
                    AI AUDIENCE COPILOT
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Geotechnical Intelligence & Location Advisory
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 relative">
              {/* Voice Selector Dropdown Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Select Neural Voice"
                >
                  <Radio className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="max-w-[70px] sm:max-w-[110px] truncate font-medium">
                    {CURATED_VOICES.find((v) => v.id === selectedVoice)?.name.split(' ')[0] || 'Voice'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Voice Selection Popover */}
                {showVoiceMenu && (
                  <div className="absolute right-0 top-10 w-72 p-2 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-2xl z-[10000] space-y-1 animate-fade-in font-sans">
                    <div className="px-2 py-1 border-b border-slate-100 dark:border-white/10 mb-1 flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                        Neural TTS Voices
                      </span>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                        HD AUDIO
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {CURATED_VOICES.map((v) => {
                        const isSelected = v.id === selectedVoice;
                        return (
                          <button
                            key={v.id}
                            onClick={() => handleSelectVoice(v.id)}
                            className={clsx(
                              'w-full text-left p-2 rounded-xl text-xs transition-colors flex items-start justify-between gap-2',
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            )}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold">{v.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block line-clamp-1">
                                {v.description}
                              </span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* TTS Voice Readout Toggle */}
              <button
                onClick={toggleTts}
                className={clsx(
                  'p-2 rounded-xl border text-xs transition-colors flex items-center gap-1',
                  isTtsEnabled
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                )}
                title={isTtsEnabled ? 'Neural voice active (Click to mute)' : 'Enable neural voice narration'}
              >
                {isTtsEnabled ? <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Speaking Indicator Banner */}
          {isSpeaking && (
            <div className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/70 border-b border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-300 animate-fade-in font-sans">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <span className="w-1 h-3 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-4 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  <span className="w-1 h-3.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                </div>
                <span className="font-semibold text-xs">
                  Neural Audio Playing: {CURATED_VOICES.find((v) => v.id === selectedVoice)?.name.split(' ')[0]}
                </span>
              </div>
              <button
                onClick={() => ttsService.stop()}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10.5px] transition-colors"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          )}

          {/* Navigation Sub-Tabs: Chat vs Location Explorer */}
          <div className="flex items-center border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 gap-2 text-xs font-sans">
            <button
              onClick={() => setActiveTab('chat')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all font-bold',
                activeTab === 'chat'
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Interactive Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('locations')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all font-bold',
                activeTab === 'locations'
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Location Risk Database ({REGIONAL_LOCATIONS.length})</span>
            </button>
          </div>

          {/* ── TAB 1: Chat Stream ────────────────────────────── */}
          {activeTab === 'chat' && (
            <>
              {/* Preset Question Pills */}
              <div className="px-3 py-2 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 flex gap-1.5 overflow-x-auto no-scrollbar">
                {PRESET_QUESTIONS.map((pq, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(pq.prompt)}
                    className="shrink-0 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-2xs"
                  >
                    {pq.label}
                  </button>
                ))}
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
                {messages.map((msg) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div
                      key={msg.id}
                      className={clsx('flex gap-2.5', isBot ? 'items-start' : 'items-end justify-end')}
                    >
                      {isBot && (
                        <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4 text-blue-600" />
                        </div>
                      )}

                      <div className={clsx('space-y-1.5 max-w-[88%]', isBot ? 'text-left' : 'text-right')}>
                        <div
                          className={clsx(
                            'p-3.5 rounded-2xl leading-relaxed whitespace-pre-line shadow-xs',
                            isBot
                              ? 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700'
                              : 'bg-[#2563eb] text-white font-medium'
                          )}
                        >
                          {msg.text}

                          {/* Optional Live Telemetry Mini-Card */}
                          {msg.liveTelemetryCard && state && (
                            <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5 font-mono text-[10px]">
                              <div className="flex items-center justify-between text-slate-500 dark:text-slate-300 font-sans">
                                <span>STATION: LG-N01</span>
                                <span className="text-[#10b981] font-bold">LIVE TELEMETRY</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-center pt-1">
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                  <span className="text-slate-500 dark:text-slate-300 block text-[9px] font-sans">MOISTURE VWC</span>
                                  <strong className="text-slate-900 dark:text-slate-100 text-xs">{state.currentReading.soil_moisture_pct.toFixed(1)}%</strong>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                  <span className="text-slate-500 dark:text-slate-300 block text-[9px] font-sans">BISHOP FoS</span>
                                  <strong className={clsx("text-xs", state.currentRisk.fos_estimate < 1.0 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400')}>
                                    {state.currentRisk.fos_estimate.toFixed(2)}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Optional Location Profile Card */}
                          {msg.locationCard && (
                            <div className="mt-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 space-y-2 text-[10.5px] text-slate-700 dark:text-slate-300 text-left shadow-sm">
                              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold text-xs">
                                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <span>{msg.locationCard.name}</span>
                                </div>
                                <span className={clsx(
                                   'px-2 py-0.5 rounded-full text-[9px] font-bold border',
                                  msg.locationCard.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-800' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                                )}>
                                  {msg.locationCard.riskLevel}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[9.5px] text-slate-500 dark:text-slate-300 font-mono">
                                <div><strong className="text-slate-700 dark:text-slate-200 font-sans">GPS:</strong> {msg.locationCard.coordinates}</div>
                                <div><strong className="text-slate-700 dark:text-slate-200 font-sans">Elevation:</strong> {msg.locationCard.elevation}</div>
                                <div><strong className="text-slate-700 dark:text-slate-200 font-sans">Trigger Rain:</strong> {msg.locationCard.triggerRainfallThreshold}</div>
                                <div><strong className="text-slate-700 dark:text-slate-200 font-sans">Recurrence:</strong> {msg.locationCard.recurrencePeriod}</div>
                              </div>

                              <div className="text-slate-700 dark:text-slate-300 font-sans text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
                                <div><strong className="text-blue-700 dark:text-blue-400">Geology:</strong> {msg.locationCard.soilType} over {msg.locationCard.bedrock}</div>
                                <div><strong className="text-blue-700 dark:text-blue-400">Disasters:</strong> {msg.locationCard.historicalDisasters}</div>
                                <div><strong className="text-blue-700 dark:text-blue-400">Mitigation:</strong> {msg.locationCard.mitigationStrategy}</div>
                              </div>
                            </div>
                          )}

                          {/* Individual Message TTS Playback Button */}
                          {isBot && (
                            <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-200/60 dark:border-white/10">
                              <button
                                type="button"
                                onClick={() => speakText(msg.text, msg.id)}
                                className={clsx(
                                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border',
                                  activePlayingMsgId === msg.id && isSpeaking
                                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 font-bold'
                                    : 'bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 shadow-2xs'
                                )}
                                title={activePlayingMsgId === msg.id && isSpeaking ? 'Stop speech' : 'Listen with Neural Voice'}
                              >
                                {activePlayingMsgId === msg.id && isSpeaking ? (
                                  <>
                                    <Square className="w-3 h-3 fill-current" />
                                    <span>Stop Voice</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    <span>Listen in HD Voice</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        <span className="text-[9.5px] font-mono text-slate-400 block px-1">
                          {msg.timestamp}
                        </span>
                      </div>

                      {!isBot && (
                        <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-[#0f172a] flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask about live situation, Wayanad, Shimla, recurring triggers..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim()}
                  className="w-10 h-10 rounded-xl bg-[#2563eb] hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shadow-sm transition-all shrink-0"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {/* ── TAB 2: Location Risk Database ────────────────── */}
          {activeTab === 'locations' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
              {/* Region Filter Bar & Search */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search locations, soil, states (e.g. Wayanad, Shimla, Konkan)..."
                    value={locationSearchTerm}
                    onChange={(e) => setLocationSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto no-scrollbar text-[10.5px]">
                  {['ALL', 'Western Ghats', 'Himalayas', 'Garhwal', 'Railway / Highway'].map((reg) => (
                    <button
                      key={reg}
                      onClick={() => setSelectedRegionFilter(reg)}
                      className={clsx(
                        'px-3 py-1 rounded-xl border shrink-0 transition-colors font-semibold',
                        selectedRegionFilter === reg
                          ? 'bg-[#2563eb] text-white border-blue-600 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      )}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Cards List */}
              <div className="space-y-3">
                {filteredLocations.map((loc) => (
                  <div
                    key={loc.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-[#e5e9f2] dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500 transition-all space-y-2 group shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>{loc.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-300 mt-0.5 font-mono">
                          {loc.state} &middot; {loc.coordinates} ({loc.elevation})
                        </div>
                      </div>

                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase shrink-0',
                        loc.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-800' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                      )}>
                        {loc.riskLevel}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                      {loc.recurringCause}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[10px]">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        🌧️ Trigger: {loc.triggerRainfallThreshold}
                      </span>

                      <button
                        onClick={() => selectLocationForAnalysis(loc)}
                        className="flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold transition-all border border-blue-200 dark:border-blue-700"
                      >
                        <span>Analyze</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
