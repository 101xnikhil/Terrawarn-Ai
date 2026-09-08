import React from 'react';
import { Globe, X } from 'lucide-react';
import { useI18n } from './LanguageContext';

const DEFAULT_DIRECT = [
  { code: 'en', name: 'English', native_name: 'English', region: 'National' },
  { code: 'hi', name: 'Hindi', native_name: 'हिन्दी', region: 'Himalayan belt' },
  { code: 'ne', name: 'Nepali', native_name: 'नेपाली', region: 'Sikkim / Darjeeling' },
  { code: 'as', name: 'Assamese', native_name: 'অসমীয়া', region: 'Assam hills' },
  { code: 'bn', name: 'Bengali', native_name: 'বাংলা', region: 'West Bengal hills' },
  { code: 'mni', name: 'Manipuri (Meitei)', native_name: 'Meitei', region: 'Manipur' },
  { code: 'ml', name: 'Malayalam', native_name: 'മലയാളം', region: 'Western Ghats — Kerala' },
  { code: 'ta', name: 'Tamil', native_name: 'தமிழ்', region: 'Western Ghats — Nilgiris' },
  { code: 'kn', name: 'Kannada', native_name: 'ಕನ್ನಡ', region: 'Western Ghats — Karnataka' },
];

const LanguageSwitcher: React.FC = () => {
  const {
    lang,
    changeLanguage,
    isTranslating,
    usedFallback,
    fallbackNote,
    dismissFallbackNote,
    toast,
    dismissToast,
    supported,
    fallbackMap,
    t,
  } = useI18n();

  const direct = supported.length ? supported : DEFAULT_DIRECT;
  const regional = Object.values(fallbackMap);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="ui-chip flex items-center gap-1.5 px-2.5 py-1.5">
        <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <select
          value={lang}
          onChange={(e) => {
            void changeLanguage(e.target.value);
          }}
          className="bg-transparent text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[180px]"
          title={t('HEADER_LANG_TITLE')}
        >
          <optgroup label={t('HEADER_DIRECT_LANGS')}>
            {direct.map((item) => (
              <option key={item.code} value={item.code}>
                {item.native_name} ({item.code.toUpperCase()})
              </option>
            ))}
          </optgroup>
          <optgroup label={t('HEADER_REGIONAL_LANGS')}>
            {regional.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name} → {item.fallbackName}
              </option>
            ))}
          </optgroup>
        </select>
        {isTranslating && (
          <span className="text-[10px] text-blue-600 dark:text-blue-300 font-semibold whitespace-nowrap">
            {t('TRANSLATION_LOADING')}
          </span>
        )}
      </div>

      {usedFallback && fallbackNote && (
        <div className="flex items-start gap-2 max-w-xs px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10.5px] text-amber-900 dark:text-amber-200">
          <span className="flex-1">{fallbackNote}</span>
          <button type="button" onClick={dismissFallbackNote} aria-label="Dismiss fallback note">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {toast && (
        <div className="flex items-start gap-2 max-w-xs px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[10.5px]">
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={dismissToast} aria-label="Dismiss toast">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
