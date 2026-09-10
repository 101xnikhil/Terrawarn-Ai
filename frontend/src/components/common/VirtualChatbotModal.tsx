import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Bot, User, Sparkles, Volume2, VolumeX, 
  MapPin, AlertTriangle, Activity, Waves, Layers, RotateCcw,
  Compass, ShieldCheck, ChevronRight, Zap, Search, Globe, Mountain,
  CloudRain, ShieldAlert, ArrowUpRight, BookOpen, Filter,
  Square, Play, Pause, Radio, ChevronDown, Check, Mic, MicOff
} from 'lucide-react';
import clsx from 'clsx';
import { useMockTelemetry } from '../../hooks/useMockTelemetry';
import { ttsService, CURATED_VOICES } from '../../services/ttsService';
import { useI18n } from '../../i18n/LanguageContext';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import {
  REGIONAL_LOCATIONS,
  answerWithRag,
  findLocation,
  type LocationProfile,
  type RagAction,
} from '../../services/geobotRag';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  headline?: string;
  mood?: 'calm' | 'watch' | 'alert';
  locationCard?: LocationProfile;
  liveTelemetryCard?: boolean;
  ragSources?: string[];
  followUps?: string[];
  actions?: RagAction[];
}


const PRESET_QUESTIONS = [
  { label: 'Is it safe?', prompt: 'Is the slope currently safe to travel on NH-5?' },
  { label: 'Live TW-N01', prompt: 'What is the current live geotechnical stability and risk level at station TW-N01?' },
  { label: 'Wayanad', prompt: 'Tell me about the recurring landslide risks and causes in Wayanad, Kerala.' },
  { label: 'Shimla NH-5', prompt: 'Why do landslides happen repeatedly along the Shimla-Solan NH-5 corridor?' },
  { label: 'SMS alerts', prompt: 'How does Terrawarn send SMS alerts and what should people do?' },
];

export default function VirtualChatbotModal() {
  const { t, tx, lang } = useI18n();
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
  const [voiceLoopOn, setVoiceLoopOn] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const voiceLoopRef = useRef(false);
  const holdStartedAt = useRef(0);
  const messagesRef = useRef<ChatMessage[]>([]);

  const { state } = useMockTelemetry();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handleSendRef = useRef<(prompt?: string) => void>(() => {});

  const {
    supported: voiceSupported,
    listening,
    transcribing,
    interim,
    error: voiceError,
    engine: voiceEngine,
    start: startListening,
    stop: stopListening,
    commit: commitListening,
  } = useVoiceInput({
    lang,
    enabled: isOpen,
    onPartial: (spoken) => {
      if (typeof spoken === 'string') setInputQuery(spoken);
    },
    onFinal: (spoken) => {
      setInputQuery('');
      handleSendRef.current(spoken);
    },
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'bot',
      headline: 'Hey — GeoBot here.',
      text: 'Hold the green mic, type, or tap a path. I retrieve corridor briefs and ground them in live TW-N01 numbers.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mood: 'calm',
      followUps: [
        'Is the slope currently safe to travel on NH-5?',
        'Tell me about the recurring landslide risks and causes in Wayanad, Kerala.',
        'How does Terrawarn send SMS alerts and what should people do?',
      ],
      actions: [
        { label: 'Is it safe?', prompt: 'Is the slope currently safe to travel on NH-5?' },
        { label: 'Wayanad brief', prompt: 'Tell me about the recurring landslide risks and causes in Wayanad, Kerala.' },
        { label: 'SMS alerts', prompt: 'How does Terrawarn send SMS alerts and what should people do?' },
        { label: 'Live numbers', prompt: 'What is the current live geotechnical stability and risk level at station TW-N01?' },
      ],
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isThinking]);

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
    voiceLoopRef.current = voiceLoopOn;
  }, [voiceLoopOn]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      ttsService.stop();
      stopListening();
      setShowVoiceMenu(false);
      setVoiceLoopOn(false);
      setIsThinking(false);
      setVoiceHint(null);
    }
  }, [isOpen, stopListening]);

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
      () => {
        setActivePlayingMsgId(null);
        if (voiceLoopRef.current) {
          window.setTimeout(() => {
            startListening();
            setVoiceHint(tx('Tap the mic if listening did not start'));
          }, 450);
        }
      },
      (err) => {
        console.warn('Neural TTS playback error:', err);
        setActivePlayingMsgId(null);
        if (voiceLoopRef.current) {
          window.setTimeout(() => {
            startListening();
            setVoiceHint(tx('Tap the mic if listening did not start'));
          }, 450);
        }
      }
    );
  };

  const generateBotResponse = (query: string): ChatMessage => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const hist = messagesRef.current;
    const lastBot = [...hist].reverse().find((m) => m.sender === 'bot');
    const lastUser = [...hist].reverse().find((m) => m.sender === 'user');
    const rag = answerWithRag(query, {
      moisture: state?.currentReading?.soil_moisture_pct ?? 24.2,
      rain24h: state?.currentReading?.rainfall_24h_mm ?? 18,
      tilt: state?.currentReading?.tilt_angle ?? 21.8,
      tiltRate: state?.currentReading?.tilt_rate ?? 0.002,
      fos: state?.currentRisk?.fos_estimate ?? 1.84,
      riskLevel: state?.currentRisk?.risk_level ?? 'LOW',
      riskScore: state?.currentRisk?.risk_score ?? 0.14,
    }, {
      lastUser: lastUser?.text,
      lastBot: lastBot?.text,
      lastLocationId: lastBot?.locationCard?.id,
      lastFollowUps: lastBot?.followUps,
    });

    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: rag.text,
      headline: rag.headline,
      mood: rag.mood,
      timestamp,
      liveTelemetryCard: rag.showLiveCard,
      locationCard: findLocation(rag.locationId),
      ragSources: rag.sources,
      followUps: rag.followUps,
      actions: rag.actions,
    };
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
    setIsThinking(true);
    setVoiceHint(null);
    stopListening();

    window.setTimeout(() => {
      const response = generateBotResponse(query);
      setMessages((prev) => [...prev, response]);
      setIsThinking(false);
      if (isTtsEnabled) {
        speakText([response.headline, response.text].filter(Boolean).join('. '), response.id);
      } else if (voiceLoopRef.current) {
        window.setTimeout(() => {
          startListening();
          setVoiceHint(tx('Your turn — hold the mic and speak'));
        }, 400);
      }
    }, 280);
  };

  handleSendRef.current = handleSend;

  const startMic = () => {
    ttsService.stop();
    setVoiceHint(null);
    startListening();
  };

  const onMicPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (transcribing) return;
    if (!voiceSupported) {
      setVoiceHint(tx('Allow the microphone, then hold the green mic.'));
      return;
    }
    if (listening) {
      holdStartedAt.current = -1;
      return;
    }
    holdStartedAt.current = Date.now();
    startMic();
  };

  const onMicPointerUp = () => {
    if (holdStartedAt.current === -1) {
      commitListening();
      return;
    }
    if (listening && Date.now() - holdStartedAt.current >= 400) {
      commitListening();
    }
  };

  const toggleVoiceLoop = () => {
    const next = !voiceLoopOn;
    setVoiceLoopOn(next);
    if (next) {
      startMic();
      setVoiceHint(tx('Listening — say status, Wayanad, or is it safe?'));
    } else {
      stopListening();
      setVoiceHint(null);
    }
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
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/92 dark:bg-[#0f172a]/92 backdrop-blur-md border border-[#e2e8f0] dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-lg animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>{t('GEOBOT_ASK')}</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 relative group',
            isOpen 
              ? 'bg-slate-800 text-white rotate-90' 
              : 'bg-[#2563eb] text-white hover:scale-[1.03] shadow-[0_14px_28px_-14px_rgba(37,99,235,0.8)]'
          )}
          aria-label={t('GEOBOT_OPEN')}
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
        <div className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[500px] h-[660px] max-h-[88vh] z-[9999] bg-white/92 dark:bg-[#0c1220]/92 backdrop-blur-2xl border border-[#e4e8ef] dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up font-sans">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-white/[0.07] bg-gradient-to-r from-slate-50/90 via-white to-blue-50/60 dark:from-[#121a2b]/80 dark:via-[#0c1220] dark:to-[#121a2b]/80 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-[0_8px_20px_-10px_rgba(37,99,235,0.9)]">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-[#0c1220]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] text-slate-900 dark:text-white font-bold tracking-tight leading-none truncate">
                    {t('GEOBOT_TITLE')}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  {listening ? tx('Listening… speak now') : isSpeaking ? tx('Speaking') : tx('On watch at TW-N01')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 relative">
              <button
                  type="button"
                  onClick={toggleVoiceLoop}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-2xs',
                    voiceLoopOn
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                  title={tx('Hands-free voice')}
                >
                  {voiceLoopOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{tx('Voice mode')}</span>
                </button>

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

          {(listening || transcribing || voiceError || voiceHint) && (
            <div className={clsx(
              'px-3.5 py-1.5 border-b flex items-center justify-between text-[11px] animate-fade-in font-sans',
              voiceError
                ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
            )}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={clsx('w-2 h-2 rounded-full shrink-0', listening || transcribing ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
                <span className="font-semibold truncate">
                  {transcribing
                    ? tx('Hearing you…')
                    : listening
                    ? (interim || (voiceEngine === 'record' ? tx('Recording… speak, then release') : tx('Listening… speak now')))
                    : (voiceError || voiceHint)}
                </span>
              </div>
              {listening && (
                <button
                  type="button"
                  onClick={commitListening}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] transition-colors shrink-0"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>{tx('Send voice')}</span>
                </button>
              )}
            </div>
          )}

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
              <span>{tx('Interactive Chat')}</span>
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
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 font-sans text-xs bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.06),transparent_42%)]">
                {messages.map((msg) => {
                  const isBot = msg.sender === 'bot';
                  const chips = msg.actions?.length
                    ? msg.actions
                    : (msg.followUps || []).map((prompt) => ({ label: prompt, prompt }));
                  const fos = state?.currentRisk?.fos_estimate ?? 1.2;
                  const fosPct = Math.min(100, Math.max(8, (fos / 2) * 100));
                  return (
                    <div
                      key={msg.id}
                      className={clsx('flex gap-2', isBot ? 'items-start' : 'items-end justify-end')}
                    >
                      {isBot && (
                        <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div className={clsx('space-y-1.5 max-w-[90%]', isBot ? 'text-left' : 'text-right')}>
                        <div
                          className={clsx(
                            'rounded-3xl leading-relaxed shadow-sm',
                            isBot
                              ? 'bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-white/10 p-3.5'
                              : 'bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white font-medium px-3.5 py-2.5 rounded-br-lg'
                          )}
                        >
                          {isBot && msg.headline && (
                            <p className={clsx(
                              'text-[13px] font-bold tracking-tight mb-1.5',
                              msg.mood === 'alert' ? 'text-rose-600 dark:text-rose-400' : msg.mood === 'watch' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                            )}>
                              {msg.headline}
                            </p>
                          )}
                          <p className={clsx('whitespace-pre-line text-[12px]', isBot ? 'text-slate-600 dark:text-slate-300' : 'text-white')}>
                            {msg.text}
                          </p>

                          {msg.liveTelemetryCard && state && (
                            <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-[#0b1220] border border-slate-200 dark:border-white/10 p-2.5 text-left">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500">TW-N01 · Sector 7</span>
                                <span className={clsx(
                                  'px-1.5 py-0.5 rounded-full text-[9px] font-bold',
                                  msg.mood === 'alert' ? 'bg-rose-100 text-rose-700' : msg.mood === 'watch' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                )}>
                                  {msg.mood === 'alert' ? 'ALERT' : msg.mood === 'watch' ? 'WATCH' : state.currentRisk.risk_level}
                                </span>
                              </div>
                              <div className="grid grid-cols-4 gap-1.5 text-center">
                                {[
                                  ['VWC', `${state.currentReading.soil_moisture_pct.toFixed(1)}%`],
                                  ['Rain', `${state.currentReading.rainfall_24h_mm.toFixed(1)}`],
                                  ['Tilt', `${state.currentReading.tilt_angle.toFixed(1)}°`],
                                  ['FoS', state.currentRisk.fos_estimate.toFixed(2)],
                                ].map(([k, v]) => (
                                  <div key={k} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 py-1.5">
                                    <span className="block text-[8.5px] font-bold text-slate-400">{k}</span>
                                    <strong className={clsx('text-[11px]', k === 'FoS' && fos < 1 ? 'text-rose-600' : 'text-slate-900 dark:text-white')}>{v}</strong>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className={clsx('h-full rounded-full', fos < 1 ? 'bg-rose-500' : fos < 1.3 ? 'bg-amber-400' : 'bg-emerald-500')}
                                  style={{ width: `${fosPct}%` }}
                                />
                              </div>
                              <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                                {fos < 1
                                  ? tx('Shear can start — stay off the cut.')
                                  : fos < 1.3
                                  ? tx('Safety margin is thin. Keep phones on for SMS.')
                                  : tx('Buffer is still above the warning line.')}
                              </p>
                            </div>
                          )}

                          {msg.locationCard && (
                            <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#0b1220] border border-blue-100 dark:border-blue-900/40 space-y-2 text-[10.5px] text-slate-700 dark:text-slate-300 text-left">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold text-xs">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>{msg.locationCard.name}</span>
                                </div>
                                <span className={clsx(
                                   'px-2 py-0.5 rounded-full text-[9px] font-bold border',
                                  msg.locationCard.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                                )}>
                                  {msg.locationCard.riskLevel}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 text-[9.5px] text-slate-500">
                                <div>{tx('Trigger Rain:')} {msg.locationCard.triggerRainfallThreshold}</div>
                                <div>{tx('Recurrence:')} {msg.locationCard.recurrencePeriod}</div>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{msg.locationCard.recurringCause}</p>
                            </div>
                          )}

                          {isBot && chips.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {chips.map((chip) => (
                                <button
                                  key={chip.prompt}
                                  type="button"
                                  onClick={() => handleSend(chip.prompt)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100"
                                >
                                  {chip.label}
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              ))}
                            </div>
                          )}

                          {isBot && (
                            <div className="flex items-center justify-between gap-2 pt-2 mt-2.5 border-t border-slate-100 dark:border-white/10">
                              <div className="flex flex-wrap gap-1 min-w-0">
                                {(msg.ragSources || []).slice(0, 2).map((src) => (
                                  <span key={src} className="truncate max-w-[140px] px-1.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-900 text-[9px] font-medium text-slate-400">
                                    {src}
                                  </span>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => speakText([msg.headline, msg.text].filter(Boolean).join('. '), msg.id)}
                                className={clsx(
                                  'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold border shrink-0',
                                  activePlayingMsgId === msg.id && isSpeaking
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-white/10'
                                )}
                              >
                                {activePlayingMsgId === msg.id && isSpeaking ? <Square className="w-3 h-3 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                                <span>{activePlayingMsgId === msg.id && isSpeaking ? tx('Stop Voice') : tx('Listen')}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <span className="text-[9px] font-mono text-slate-400 block px-1">
                          {msg.timestamp}
                        </span>
                      </div>

                      {!isBot && (
                        <div className="w-8 h-8 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {isThinking && (
                  <div className="flex gap-2 items-start">
                    <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="px-3.5 py-2.5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '120ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '240ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 border-t border-slate-100 dark:border-white/10 bg-white/95 dark:bg-[#0f172a] space-y-2"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onPointerDown={onMicPointerDown}
                    onPointerUp={onMicPointerUp}
                    onPointerCancel={onMicPointerUp}
                    onClick={(event) => event.preventDefault()}
                    className={clsx(
                      'w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-all',
                      listening || transcribing
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-[0_0_0_6px_rgba(16,185,129,0.18)] scale-105'
                        : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                    )}
                    title={tx('Hold to talk, or tap to listen')}
                    aria-label={tx('Hold to talk, or tap to listen')}
                    aria-pressed={listening}
                  >
                    {listening ? (
                      <span className="flex items-end gap-0.5 h-5">
                        <span className="w-0.5 h-2 bg-white rounded-full animate-pulse" />
                        <span className="w-0.5 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '90ms' }} />
                        <span className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '180ms' }} />
                        <span className="w-0.5 h-5 bg-white rounded-full animate-pulse" style={{ animationDelay: '40ms' }} />
                      </span>
                    ) : transcribing ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="text"
                    placeholder={transcribing ? tx('Hearing you…') : listening ? tx('Speak now — then release the mic') : tx('Ask GeoBot anything…')}
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-sans"
                  />
                  <button
                    type="submit"
                    disabled={!inputQuery.trim()}
                    className="w-11 h-11 rounded-2xl bg-[#2563eb] hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shadow-sm transition-all shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 px-1">
                  {tx('Hold the mic to talk · tap a chip to continue')}
                </p>
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
