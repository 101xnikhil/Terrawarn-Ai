import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { UI_STRINGS, UI_STRING_KEYS, UI_STRING_VALUES, type UIStringKey } from './strings';
import { FALLBACK_LANGUAGE_MAP } from './fallbackLanguages';
import { buildStaticTable } from './staticCatalog';
import { EXTRA_PACKS, EXTRA_UI_STRINGS } from './extraStrings';

const ENGLISH_TO_KEY: Record<string, UIStringKey> = UI_STRING_KEYS.reduce((acc, key) => {
  acc[UI_STRINGS[key]] = key;
  return acc;
}, {} as Record<string, UIStringKey>);

function resolveCatalogCode(code: string): string {
  return FALLBACK_LANGUAGE_MAP[code]?.fallback || code;
}

const STORAGE_KEY = 'landguard_ui_lang';

export interface SupportedLanguageMeta {
  code: string;
  name: string;
  native_name: string;
  region: string;
  is_fallback?: boolean;
}

interface TranslateResponse {
  lang: string;
  translations: string[];
  used_fallback: boolean;
  fallback_target?: string | null;
  note?: string | null;
  available: boolean;
  error?: string | null;
}

interface LanguageContextValue {
  lang: string;
  t: (key: UIStringKey) => string;
  tx: (english: string) => string;
  changeLanguage: (code: string) => Promise<void>;
  isTranslating: boolean;
  usedFallback: boolean;
  fallbackNote: string | null;
  dismissFallbackNote: () => void;
  toast: string | null;
  dismissToast: () => void;
  supported: SupportedLanguageMeta[];
  fallbackMap: typeof FALLBACK_LANGUAGE_MAP;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readStoredLang(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  } catch {
    return 'en';
  }
}

function shouldQueueTranslation(text: string): boolean {
  if (text.length < 3 || text.length > 420) return false;
  if (/^[\d.%°/+<>=\s:,;()#\-–—]+$/.test(text)) return false;
  if (/^https?:|^\/[a-z]|^\+\d/.test(text)) return false;
  return /[A-Za-z]{3,}/.test(text);
}

function initialCatalog(code: string): Record<string, string> {
  const catalog = resolveCatalogCode(code);
  if (code === 'en' || catalog === 'en') return { ...UI_STRINGS };
  return buildStaticTable(catalog, UI_STRINGS) || { ...UI_STRINGS };
}

function initialExtras(code: string): Record<string, string> {
  const catalog = resolveCatalogCode(code);
  if (code === 'en' || catalog === 'en') return {};
  return { ...(EXTRA_PACKS[catalog] || {}) };
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<string>(readStoredLang);
  const [table, setTable] = useState<Record<string, string>>(() => initialCatalog(readStoredLang()));
  const [extraTable, setExtraTable] = useState<Record<string, string>>(() => initialExtras(readStoredLang()));
  const pendingRef = useRef<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<number | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;
  const [cache] = useState<Map<string, Record<string, string>>>(() => {
    const initial = new Map<string, Record<string, string>>();
    initial.set('en', { ...UI_STRINGS });
    return initial;
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [supported, setSupported] = useState<SupportedLanguageMeta[]>([]);

  useEffect(() => {
    fetch('/api/v1/translate/languages')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data?.supported) && data.supported.length > 0) {
          setSupported(data.supported);
        } else {
          throw new Error('empty language catalog');
        }
      })
      .catch(() => {
        setSupported([
          { code: 'en', name: 'English', native_name: 'English', region: 'National' },
          { code: 'hi', name: 'Hindi', native_name: 'हिन्दी', region: 'Himalayan belt' },
          { code: 'ne', name: 'Nepali', native_name: 'नेपाली', region: 'Sikkim / Darjeeling' },
          { code: 'as', name: 'Assamese', native_name: 'অসমীয়া', region: 'Assam hills' },
          { code: 'bn', name: 'Bengali', native_name: 'বাংলা', region: 'West Bengal hills' },
          { code: 'mni', name: 'Manipuri (Meitei)', native_name: 'ꯃꯩꯇꯩꯂꯣꯟ', region: 'Manipur' },
          { code: 'ml', name: 'Malayalam', native_name: 'മലയാളം', region: 'Western Ghats — Kerala' },
          { code: 'ta', name: 'Tamil', native_name: 'தமிழ்', region: 'Western Ghats — Nilgiris' },
          { code: 'kn', name: 'Kannada', native_name: 'ಕನ್ನಡ', region: 'Western Ghats — Karnataka' },
        ]);
      });
  }, []);

  const applyEnglish = useCallback(() => {
    setTable({ ...UI_STRINGS });
    setExtraTable({});
    setUsedFallback(false);
    setFallbackNote(null);
    document.documentElement.lang = 'en';
  }, []);

  const changeLanguage = useCallback(async (code: string) => {
    setLang(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }

    if (code === 'en') {
      applyEnglish();
      setToast(null);
      return;
    }

    const mapped = FALLBACK_LANGUAGE_MAP[code];
    const catalogCode = resolveCatalogCode(code);
    document.documentElement.lang = catalogCode;

    seenRef.current.clear();
    pendingRef.current.clear();

    const cached = cache.get(code);
    if (cached) {
      setTable(cached);
      setExtraTable({
        ...(EXTRA_PACKS[catalogCode] || {}),
        ...(cache.get(`${code}::extra`) || {}),
      });
      setUsedFallback(Boolean(mapped));
      setFallbackNote(mapped ? mapped.reason : null);
      setToast(null);
      return;
    }

    const staticTable = catalogCode !== 'en'
      ? buildStaticTable(catalogCode, UI_STRINGS)
      : null;
    const extraStatic = EXTRA_PACKS[catalogCode] || {};

    if (staticTable) {
      setTable(staticTable);
      setUsedFallback(Boolean(mapped));
      setFallbackNote(mapped ? mapped.reason : null);
      setToast(null);
    }
    if (Object.keys(extraStatic).length > 0) {
      setExtraTable(extraStatic);
    }

    setIsTranslating(true);
    try {
      const res = await fetch('/api/v1/translate/ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang: code,
          strings: [...UI_STRING_VALUES, ...EXTRA_UI_STRINGS],
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: TranslateResponse = await res.json();
      if (!data.available) {
        if (staticTable) {
          cache.set(code, staticTable);
          cache.set(`${code}::extra`, extraStatic);
        } else if (!Object.keys(extraStatic).length) {
          applyEnglish();
          setToast(UI_STRINGS.TRANSLATION_UNAVAILABLE);
        }
        return;
      }
      const next: Record<string, string> = { ...(staticTable || UI_STRINGS) };
      const extraNext: Record<string, string> = { ...extraStatic };
      data.translations.forEach((value, index) => {
        if (index < UI_STRING_KEYS.length) {
          const key = UI_STRING_KEYS[index];
          if (key && value) next[key] = value;
          return;
        }
        const source = EXTRA_UI_STRINGS[index - UI_STRING_KEYS.length];
        if (source && value) extraNext[source] = value;
      });
      cache.set(code, next);
      cache.set(`${code}::extra`, extraNext);
      setTable(next);
      setExtraTable(extraNext);
      setUsedFallback(Boolean(data.used_fallback));
      setFallbackNote(data.note || (data.used_fallback ? FALLBACK_LANGUAGE_MAP[code]?.reason ?? null : null));
      setToast(null);
    } catch {
      if (staticTable || Object.keys(extraStatic).length) {
        cache.set(code, staticTable || { ...UI_STRINGS });
        cache.set(`${code}::extra`, extraStatic);
      } else {
        applyEnglish();
        setToast(UI_STRINGS.TRANSLATION_UNAVAILABLE);
      }
    } finally {
      setIsTranslating(false);
    }
  }, [applyEnglish, cache]);

  useEffect(() => {
    if (lang !== 'en') {
      void changeLanguage(lang);
    }
    // Re-run only on first mount to restore last language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = useCallback((key: UIStringKey) => {
    return table[key] || UI_STRINGS[key] || key;
  }, [table]);

  const flushPending = useCallback(async () => {
    const code = langRef.current;
    if (code === 'en') return;
    const batch = Array.from(pendingRef.current);
    pendingRef.current.clear();
    if (batch.length === 0) return;
    try {
      const res = await fetch('/api/v1/translate/ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: code, strings: batch }),
      });
      if (!res.ok) return;
      const data: TranslateResponse = await res.json();
      if (!data.available || !Array.isArray(data.translations)) return;
      setExtraTable((prev) => {
        const next = { ...prev };
        batch.forEach((source, index) => {
          const value = data.translations[index];
          if (source && value && value !== source) next[source] = value;
        });
        cache.set(`${code}::extra`, next);
        return next;
      });
    } catch {
      /* keep English until the next language change */
    }
  }, [cache]);

  const tx = useCallback((english: string) => {
    if (!english) return english;
    if (lang === 'en') return english;
    const key = ENGLISH_TO_KEY[english];
    if (key) return table[key] || english;
    const hit = extraTable[english];
    if (hit) return hit;
    if (shouldQueueTranslation(english) && !seenRef.current.has(english)) {
      seenRef.current.add(english);
      pendingRef.current.add(english);
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = window.setTimeout(() => {
        void flushPending();
      }, 400);
    }
    return english;
  }, [lang, table, extraTable, flushPending]);

  useEffect(() => {
    const catalogCode = resolveCatalogCode(lang);
    document.documentElement.lang = catalogCode === 'en' ? 'en' : catalogCode;
    const legacy = catalogCode === 'as' ? 'as' : catalogCode === 'en' ? 'en' : 'hi';
    try {
      localStorage.setItem('landguard_language', legacy);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('landguard-language-changed', { detail: legacy }));
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    t,
    tx,
    changeLanguage,
    isTranslating,
    usedFallback,
    fallbackNote,
    dismissFallbackNote: () => setFallbackNote(null),
    toast,
    dismissToast: () => setToast(null),
    supported,
    fallbackMap: FALLBACK_LANGUAGE_MAP,
  }), [lang, t, tx, changeLanguage, isTranslating, usedFallback, fallbackNote, toast, supported]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useI18n = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useI18n must be used within LanguageProvider');
  }
  return ctx;
};
