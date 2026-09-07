// Open-Source Neural Text-To-Speech Service for Terrawarn-Ai
// Integrates high-fidelity Microsoft Edge Neural TTS with zero-latency caching
// and graceful offline fallback.

import { API_BASE_URL } from '../config';

export interface NeuralVoice {
  id: string;
  name: string;
  locale: string;
  gender: string;
  tag: string;
  description: string;
}

export const CURATED_VOICES: NeuralVoice[] = [
  {
    id: 'en-US-ChristopherNeural',
    name: 'Christopher (Tactical Commander)',
    locale: 'en-US',
    gender: 'Male',
    tag: 'DEEP & AUTHORITATIVE',
    description: 'Deep, commanding neural male voice tailored for geotechnical disaster warnings.',
  },
  {
    id: 'en-US-AriaNeural',
    name: 'Aria (Studio Assistant)',
    locale: 'en-US',
    gender: 'Female',
    tag: 'STUDIO CLARITY',
    description: 'Crisp, articulate studio-grade female voice for explanations and briefings.',
  },
  {
    id: 'en-IN-NeerjaExpressiveNeural',
    name: 'Neerja (Regional Expert)',
    locale: 'en-IN',
    gender: 'Female',
    tag: 'INDIAN EXPRESSIVE',
    description: 'Natural Indian English voice with authentic regional geographical cadence.',
  },
  {
    id: 'en-IN-PrabhatNeural',
    name: 'Prabhat (Disaster Officer)',
    locale: 'en-IN',
    gender: 'Male',
    tag: 'INDIAN PROFESSIONAL',
    description: 'Professional Indian English male voice for emergency operation centers.',
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy (Broadcast Anchor)',
    locale: 'en-US',
    gender: 'Male',
    tag: 'NEWS BROADCAST',
    description: 'Calm, authoritative radio news tone suitable for status situation reports.',
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia (Scientific Advisor)',
    locale: 'en-GB',
    gender: 'Female',
    tag: 'BRITISH SCIENTIFIC',
    description: 'Crisp British English voice for scientific slope stability discussions.',
  },
];

export const DEFAULT_VOICE_ID = 'en-US-ChristopherNeural';

class TTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private activeAbortController: AbortController | null = null;
  private selectedVoiceId: string = DEFAULT_VOICE_ID;
  private isSpeakingInternal: boolean = false;
  private listeners: Set<(speaking: boolean) => void> = new Set();

  constructor() {
    try {
      const saved = localStorage.getItem('terrawarn_tts_voice');
      if (saved && CURATED_VOICES.some((v) => v.id === saved)) {
        this.selectedVoiceId = saved;
      }
    } catch {
      // localStorage disabled or restricted
    }
  }

  public getSelectedVoice(): string {
    return this.selectedVoiceId;
  }

  public setSelectedVoice(voiceId: string) {
    this.selectedVoiceId = voiceId;
    try {
      localStorage.setItem('terrawarn_tts_voice', voiceId);
    } catch {
      // Storage quota or restriction
    }
  }

  public getVoices(): NeuralVoice[] {
    return CURATED_VOICES;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingInternal;
  }

  public onSpeakingChange(cb: (speaking: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private setSpeaking(state: boolean) {
    this.isSpeakingInternal = state;
    this.listeners.forEach((cb) => cb(state));
  }

  public stop() {
    // 1. Abort any in-flight fetch
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }

    // 2. Stop and release HTML5 Audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // 3. Revoke active blob URL to prevent memory leaks
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    // 4. Cancel fallback Web Speech API if active
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.setSpeaking(false);
  }

  public async speak(
    rawText: string,
    voiceId?: string,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ): Promise<void> {
    this.stop();

    const voice = voiceId || this.selectedVoiceId;
    const cleanText = this.cleanTextForSpeech(rawText);
    if (!cleanText) return;

    this.setSpeaking(true);
    this.activeAbortController = new AbortController();

    try {
      // Call open-source Neural TTS API endpoint
      const response = await fetch(`${API_BASE_URL}/tts/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice: voice,
          rate: '+0%',
        }),
        signal: this.activeAbortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Neural TTS API error: HTTP ${response.status}`);
      }

      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      this.currentBlobUrl = blobUrl;

      const audio = new Audio(blobUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        this.stop();
        if (onEnd) onEnd();
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error, falling back to local speech:', e);
        this.fallbackSpeech(cleanText, onEnd, onError);
      };

      await audio.play();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User manually cancelled or interrupted speech
        return;
      }
      console.warn('Neural TTS request failed, employing fallback speech engine:', err);
      this.fallbackSpeech(cleanText, onEnd, onError);
    }
  }

  private fallbackSpeech(
    text: string,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.setSpeaking(false);
      if (onError) onError(new Error('No TTS engine available.'));
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 300));
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select most natural voice available locally
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.includes('Google') ||
          v.name.includes('Natural') ||
          v.name.includes('Samantha') ||
          v.name.includes('Alex')
      );
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        this.setSpeaking(false);
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        this.setSpeaking(false);
        if (onError) onError(new Error(`Fallback speech error: ${e.error}`));
      };

      window.speechSynthesis.speak(utterance);
    } catch (e: any) {
      this.setSpeaking(false);
      if (onError) onError(e);
    }
  }

  public cleanTextForSpeech(text: string): string {
    if (!text) return '';

    return text
      // 1. Remove markdown links [title](url) -> title
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // 2. Remove code blocks
      .replace(/```[^`]*```/g, '')
      .replace(/`[^`]*`/g, '')
      // 3. Remove LaTeX formulas
      .replace(/\$\s*\\phi'?\s*\$/g, 'friction angle')
      .replace(/\$\s*\\sigma_?[nu]?'?\s*\$/g, 'effective normal stress')
      .replace(/\$\s*u_?w?\s*\$/g, 'pore water pressure')
      .replace(/\$\s*\\tau\s*\$/g, 'shear stress')
      .replace(/\$[^$]+\$/g, '')
      // 4. Clean parenthetical acronym repetitions
      .replace(/\([Ff][Oo][Ss]\)/gi, '')
      .replace(/\([Vv][Ww][Cc]\)/gi, '')
      // 5. Expand scientific acronyms and units
      .replace(/\bFoS\b/g, 'Factor of Safety')
      .replace(/\bVWC\b/g, 'Volumetric Water Content')
      .replace(/\bIMU\b/g, 'I M U')
      .replace(/\bLoRa\b/g, 'Lora')
      .replace(/\bStation\s+LG-N0(\d)\b/g, 'Station L G N 0 $1')
      .replace(/\bLG-N0(\d)\b/g, 'Station L G N 0 $1')
      .replace(/°\/min/g, ' degrees per minute')
      .replace(/°C/g, ' degrees Celsius')
      .replace(/°/g, ' degrees')
      .replace(/(\d+(?:\.\d+)?)\s*mm\b/g, '$1 millimeters')
      .replace(/(\d+(?:\.\d+)?)\s*kPa\b/g, '$1 kilopascals')
      .replace(/(\d+(?:\.\d+)?)\s*km\b/g, '$1 kilometers')
      // 6. Natural speech punctuation replacements
      .replace(/\|/g, ', ')
      .replace(/\s*•\s*/g, '. ')
      .replace(/[*#_~>]/g, ' ')
      // 7. Strip non-ASCII emojis
      .replace(/[^\x00-\x7F]+/g, ' ')
      // 8. Collapse spaces
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const ttsService = new TTSService();
