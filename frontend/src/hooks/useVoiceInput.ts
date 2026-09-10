import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: { transcript?: string };
  }>;
};

function getRecognitionCtor(): (new () => SpeechRec) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function speechLangFor(uiLang: string): string {
  const map: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    ne: 'ne-NP',
    as: 'as-IN',
    bn: 'bn-IN',
    ml: 'ml-IN',
    ta: 'ta-IN',
    kn: 'kn-IN',
    mni: 'en-IN',
  };
  return map[uiLang] || 'en-IN';
}

async function detectBrave(): Promise<boolean> {
  try {
    const brave = (navigator as unknown as { brave?: { isBrave?: () => Promise<boolean> } }).brave;
    if (brave?.isBrave) return Boolean(await brave.isBrave());
  } catch {
    // ignore
  }
  return /Brave/i.test(navigator.userAgent);
}

function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

export function useVoiceInput(options: {
  lang: string;
  enabled?: boolean;
  onPartial?: (transcript: string) => void;
  onFinal: (transcript: string) => void;
}) {
  const { lang, enabled = true, onPartial, onFinal } = options;
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<'record' | 'speech'>('record');

  const forceRecordRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const skipUploadRef = useRef(false);
  const sentRef = useRef(false);
  const sessionRef = useRef(0);

  const recRef = useRef<SpeechRec | null>(null);
  const wantListenRef = useRef(false);
  const lastSpeechRef = useRef('');
  const restartTimerRef = useRef<number | null>(null);

  const onFinalRef = useRef(onFinal);
  const onPartialRef = useRef(onPartial);
  const langRef = useRef(lang);
  onFinalRef.current = onFinal;
  onPartialRef.current = onPartial;
  langRef.current = lang;

  useEffect(() => {
    const canRecord = Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
    setSupported(canRecord || Boolean(getRecognitionCtor()));
    void detectBrave().then((brave) => {
      forceRecordRef.current = brave || !getRecognitionCtor();
      setEngine(forceRecordRef.current ? 'record' : 'speech');
    });
  }, []);

  const emitFinal = useCallback((raw: string) => {
    const spoken = raw.trim();
    if (!spoken || sentRef.current) return;
    sentRef.current = true;
    wantListenRef.current = false;
    lastSpeechRef.current = '';
    setInterim('');
    setTranscribing(false);
    onPartialRef.current?.('');
    onFinalRef.current(spoken);
  }, []);

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const uploadClip = useCallback(async (blob: Blob) => {
    if (skipUploadRef.current || blob.size < 800) {
      if (!skipUploadRef.current) {
        setError('Could not hear that. Hold the green mic and speak again.');
      }
      setListening(false);
      setTranscribing(false);
      return;
    }
    setTranscribing(true);
    setInterim('Hearing you…');
    onPartialRef.current?.('Hearing you…');
    const body = new FormData();
    const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    body.append('audio', blob, `clip.${ext}`);
    body.append('lang', speechLangFor(langRef.current));
    try {
      const response = await fetch(`${API_BASE_URL}/tts/transcribe`, {
        method: 'POST',
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || 'Transcription failed');
      }
      const text = String(payload.text || '').trim();
      if (!text) throw new Error('empty');
      emitFinal(text);
    } catch (err) {
      setTranscribing(false);
      setListening(false);
      setError(
        err instanceof Error && err.message && err.message !== 'empty'
          ? err.message
          : 'Could not hear that. Hold the green mic and speak again.'
      );
    }
  }, [emitFinal]);

  const startRecord = useCallback(async () => {
    if (!enabled) return;
    sentRef.current = false;
    skipUploadRef.current = false;
    chunksRef.current = [];
    setError(null);
    setInterim('Recording… speak now');
    onPartialRef.current?.('');

    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        skipUploadRef.current = true;
        try { recorderRef.current.stop(); } catch { /* replace */ }
      }
      skipUploadRef.current = false;
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      }
      const mime = pickRecorderMime();
      const recorder = mime
        ? new MediaRecorder(streamRef.current, { mimeType: mime })
        : new MediaRecorder(streamRef.current);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        setListening(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        void uploadClip(blob);
      };
      recorder.start(200);
      wantListenRef.current = true;
      setListening(true);
      setEngine('record');
    } catch (err) {
      setListening(false);
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError') {
        setError('Microphone blocked in Brave. Click the lock icon → allow Microphone, then hold the mic.');
      } else {
        setError('Could not open the microphone. Allow mic permission and try again.');
      }
    }
  }, [enabled, uploadClip]);

  const stopRecord = (commit: boolean) => {
    skipUploadRef.current = !commit;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        setListening(false);
      }
    } else {
      setListening(false);
    }
  };

  const startSpeech = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || !enabled) {
      void startRecord();
      return;
    }
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    sentRef.current = false;
    lastSpeechRef.current = '';
    try {
      recRef.current?.abort();
    } catch {
      // ignore
    }
    const rec = new Ctor();
    rec.lang = speechLangFor(lang);
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      if (sessionRef.current !== session) return;
      setListening(true);
      setError(null);
    };
    rec.onresult = (event) => {
      if (sessionRef.current !== session) return;
      let interimText = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += piece;
        else interimText += piece;
      }
      const live = (finalText || interimText).trim();
      if (live) {
        lastSpeechRef.current = live;
        setInterim(live);
        onPartialRef.current?.(live);
      }
      if (finalText.trim() && wantListenRef.current) {
        wantListenRef.current = false;
        try { rec.stop(); } catch { /* ignore */ }
        emitFinal(finalText);
      }
    };
    rec.onerror = (event) => {
      if (sessionRef.current !== session) return;
      const code = event.error || '';
      if (code === 'aborted') return;
      if (code === 'network' || code === 'service-not-allowed') {
        forceRecordRef.current = true;
        setEngine('record');
        void startRecord();
        return;
      }
      if (code === 'not-allowed') {
        setError('Microphone blocked. Click Allow in the address bar, then hold the mic.');
        wantListenRef.current = false;
        setListening(false);
        return;
      }
      if (code === 'no-speech') {
        setError('Could not hear that. Hold the green mic and speak again.');
      }
    };
    rec.onend = () => {
      if (sessionRef.current !== session) return;
      setListening(false);
      if (!sentRef.current && lastSpeechRef.current && !wantListenRef.current) {
        emitFinal(lastSpeechRef.current);
      }
    };
    recRef.current = rec;
    wantListenRef.current = true;
    setListening(true);
    setInterim('');
    setError(null);
    setEngine('speech');
    try {
      rec.start();
    } catch {
      forceRecordRef.current = true;
      void startRecord();
    }
  }, [enabled, emitFinal, lang, startRecord]);

  const start = useCallback(() => {
    if (!enabled) return;
    if (forceRecordRef.current || !getRecognitionCtor()) {
      void startRecord();
      return;
    }
    startSpeech();
  }, [enabled, startRecord, startSpeech]);

  const stop = useCallback(() => {
    wantListenRef.current = false;
    if (restartTimerRef.current != null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try { recRef.current?.abort(); } catch { /* ignore */ }
    stopRecord(false);
    setListening(false);
  }, []);

  const commit = useCallback(() => {
    wantListenRef.current = false;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      stopRecord(true);
      return;
    }
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
    if (!sentRef.current && lastSpeechRef.current) {
      emitFinal(lastSpeechRef.current);
    } else if (!lastSpeechRef.current && !transcribing) {
      setError('Could not hear that. Hold the green mic and speak again.');
    }
  }, [emitFinal, transcribing]);

  useEffect(() => {
    if (!enabled) {
      stop();
      releaseStream();
      setTranscribing(false);
    }
  }, [enabled, stop]);

  useEffect(() => () => {
    sessionRef.current += 1;
    try { recRef.current?.abort(); } catch { /* unmount */ }
    skipUploadRef.current = true;
    try { recorderRef.current?.stop(); } catch { /* unmount */ }
    releaseStream();
  }, []);

  return { supported, listening, transcribing, interim, error, engine, start, stop, commit };
}
