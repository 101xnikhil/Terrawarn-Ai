/**
 * Hyper-local / tribal languages that current LLMs cannot reliably produce.
 * Selecting one of these codes is redirected to the mapped fallback language.
 */
export interface FallbackLanguage {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  fallback: string;
  fallbackName: string;
  reason: string;
}

export const FALLBACK_LANGUAGE_MAP: Record<string, FallbackLanguage> = {
  gbm: {
    code: 'gbm',
    name: 'Garhwali',
    nativeName: 'गढ़वळि',
    region: 'Uttarakhand (Garhwal Himalaya)',
    fallback: 'hi',
    fallbackName: 'Hindi',
    reason: 'Shown in Hindi — Garhwali is not reliably supported by LLMs',
  },
  kfy: {
    code: 'kfy',
    name: 'Kumaoni',
    nativeName: 'कुमाऊँनी',
    region: 'Uttarakhand (Kumaon Himalaya)',
    fallback: 'hi',
    fallbackName: 'Hindi',
    reason: 'Shown in Hindi — Kumaoni is not reliably supported by LLMs',
  },
  him: {
    code: 'him',
    name: 'Pahari / Western Pahari',
    nativeName: 'पहाड़ी',
    region: 'Himachal Pradesh hill districts',
    fallback: 'hi',
    fallbackName: 'Hindi',
    reason: 'Shown in Hindi — Pahari is not reliably supported by LLMs',
  },
  kns: {
    code: 'kns',
    name: 'Kinnauri',
    nativeName: 'किन्नौरी',
    region: 'Himachal Pradesh (Kinnaur, Spiti)',
    fallback: 'hi',
    fallbackName: 'Hindi',
    reason: 'Shown in Hindi — Kinnauri is not reliably supported by LLMs',
  },
  doi: {
    code: 'doi',
    name: 'Dogri',
    nativeName: 'डोगरी',
    region: 'Jammu hills / HP border',
    fallback: 'hi',
    fallbackName: 'Hindi',
    reason: 'Shown in Hindi — Dogri is not reliably supported by LLMs',
  },
  kha: {
    code: 'kha',
    name: 'Khasi',
    nativeName: 'Ka Ktien Khasi',
    region: 'Meghalaya (Khasi & Jaintia Hills)',
    fallback: 'en',
    fallbackName: 'English',
    reason: 'Shown in English — Khasi is not reliably supported by LLMs',
  },
  grt: {
    code: 'grt',
    name: 'Garo',
    nativeName: 'A·chik',
    region: 'Meghalaya (Garo Hills)',
    fallback: 'en',
    fallbackName: 'English',
    reason: 'Shown in English — Garo is not reliably supported by LLMs',
  },
  lus: {
    code: 'lus',
    name: 'Mizo',
    nativeName: 'Mizo ṭawng',
    region: 'Mizoram',
    fallback: 'en',
    fallbackName: 'English',
    reason: 'Shown in English — Mizo is not reliably supported by LLMs',
  },
  lep: {
    code: 'lep',
    name: 'Lepcha',
    nativeName: 'Róng',
    region: 'Sikkim (Dzongu) & Darjeeling',
    fallback: 'ne',
    fallbackName: 'Nepali',
    reason: 'Shown in Nepali — Lepcha is not reliably supported by LLMs',
  },
  tsj: {
    code: 'tsj',
    name: 'Bhutia',
    nativeName: 'འབྲས་ལྗོངས་སྐད',
    region: 'Sikkim & Kalimpong Hills',
    fallback: 'ne',
    fallbackName: 'Nepali',
    reason: 'Shown in Nepali — Bhutia is not reliably supported by LLMs',
  },
  njz: {
    code: 'njz',
    name: 'Nyishi',
    nativeName: 'Nyishi',
    region: 'Arunachal Pradesh (Papum Pare, East Kameng)',
    fallback: 'en',
    fallbackName: 'English',
    reason: 'Shown in English — Nyishi is not reliably supported by LLMs',
  },
  adi: {
    code: 'adi',
    name: 'Adi',
    nativeName: 'Adi',
    region: 'Arunachal Pradesh (Siang)',
    fallback: 'en',
    fallbackName: 'English',
    reason: 'Shown in English — Adi is not reliably supported by LLMs',
  },
};
