import { useState, useEffect } from 'react';

export type SupportedLanguage = 'en' | 'hi' | 'as';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳' },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Brand & Header
    appTitle: 'Terrawarn-Ai',
    appSubtitle: 'NER Geotechnical Early Warning System',
    missionControl: 'Mission Control & Metrics',
    stationTelemetry: 'Station Telemetry',
    geospatialGis: 'Geospatial Sector GIS',
    alertsIncidents: 'Alerts & Incidents',
    geotechnicalAnalytics: 'Geotechnical Analytics',
    citizenFieldReports: 'Citizen & Field Reports',
    settings: 'Hardware & Settings',
    about: 'About Terrawarn-Ai',
    
    // Status & Weather
    imdWarningTicker: 'IMD National Geospatial Warning Service',
    monsoonAlert: 'Western Ghats & North Eastern Monsoon Surge Active',
    cloudburstWatch: 'Cloudburst Watch: Dima Hasao, Khasi Hills & Sikkim',
    ariThreshold: 'Antecedent Rainfall Index (ARI-7)',
    
    // Road Connectivity
    roadConnectivity: 'NER Road Connectivity Status',
    corridorOpen: 'OPEN',
    corridorRestricted: 'RESTRICTED',
    corridorBlocked: 'BLOCKED',
    alternateDetour: 'Alternate Detour',
    estClearance: 'Est. Clearance',
    
    // Risk & Physics
    riskLow: 'LOW',
    riskModerate: 'MODERATE',
    riskHigh: 'HIGH',
    riskCritical: 'CRITICAL',
    factorOfSafety: 'Factor of Safety (FoS)',
    stabilityRating: 'Stability Rating',
    
    // Incident Reporting
    reportIncidentBtn: 'Report Slope Hazard',
    reportTitle: 'Citizen & Field Ground-Truth Incident Portal',
    reportSubtitle: 'Crowdsource photo & geo-tagged observations of tension cracks, mudflows, and blocked highways across the North Eastern Region.',
    uploadPhoto: 'Upload Photo / Video Proof',
    gpsCoordinates: 'GPS Coordinates',
    categoryCracks: 'Tension Cracks / Ground Fissures',
    categorySlump: 'Active Slope Slump / Mudflow',
    categoryRockfall: 'Boulder / Rockfall on Highway',
    categoryBlockedRoad: 'Blocked Highway / Debris Inundation',
    categoryRiverDamming: 'River Damming / Impoundment',
    submitReport: 'Submit Incident to DDMA',
    submitting: 'Ingesting Report...',
    offlineBuffered: 'Offline Buffer: Report stored locally. Auto-syncs when online.',
    
    // SMS Alerts
    smsAlertHeader: 'EMERGENCY LANDSLIDE ALERT',
    evacuateImmediately: 'Evacuate immediately to designated safe shelter.',
  },
  
  hi: {
    // Brand & Header
    appTitle: 'टेरावार्न-एआई (Terrawarn-Ai)',
    appSubtitle: 'पूर्वोत्तर भूस्खलन पूर्व चेतावनी प्रणाली',
    missionControl: 'मिशन कंट्रोल एवं मेट्रिक्स',
    stationTelemetry: 'स्टेशन टेलीमेट्री',
    geospatialGis: 'भू-स्थानिक जीआईएस मानचित्र',
    alertsIncidents: 'चेतावनी एवं आपातकालीन घटनाएं',
    geotechnicalAnalytics: 'भू-तकनीकी विश्लेषण',
    citizenFieldReports: 'नागरिक एवं फील्ड रिपोर्ट',
    settings: 'हार्डवेयर एवं सेटिंग्स',
    about: 'टेरावार्न-एआई (Terrawarn-Ai) के बारे में',
    
    // Status & Weather
    imdWarningTicker: 'आईएमडी राष्ट्रीय भू-स्थानिक चेतावनी सेवा',
    monsoonAlert: 'पूर्वोत्तर एवं पश्चिमी घाट में तीव्र मानसून सक्रिय',
    cloudburstWatch: 'बादल फटने की चेतावनी: दीमा हसाओ, खासी हिल्स एवं सिक्किम',
    ariThreshold: 'पूर्ववर्ती वर्षा सूचकांक (ARI-7)',
    
    // Road Connectivity
    roadConnectivity: 'पूर्वोत्तर राजमार्ग संपर्क स्थिति',
    corridorOpen: 'खुला है',
    corridorRestricted: 'सीमित / सावधानी',
    corridorBlocked: 'पूर्णतः अवरुद्ध',
    alternateDetour: 'वैकल्पिक मार्ग',
    estClearance: 'अनुमानित निकासी समय',
    
    // Risk & Physics
    riskLow: 'निम्न',
    riskModerate: 'मध्यम',
    riskHigh: 'उच्च',
    riskCritical: 'अति-गंभीर',
    factorOfSafety: 'सुरक्षा कारक (FoS)',
    stabilityRating: 'स्थिरता दर',
    
    // Incident Reporting
    reportIncidentBtn: 'ढलान खतरे की सूचना दें',
    reportTitle: 'नागरिक एवं फील्ड भूस्खलन रिपोर्टिंग पोर्टल',
    reportSubtitle: 'पूर्वोत्तर क्षेत्र में दरारों, मिट्टी के कटाव और अवरुद्ध सड़कों की भू-टैग की गई तस्वीरें और विवरण दर्ज करें।',
    uploadPhoto: 'तस्वीर या वीडियो साक्ष्य अपलोड करें',
    gpsCoordinates: 'जीपीएस निर्देशांक',
    categoryCracks: 'जमीन में दरारें / भू-विदारण',
    categorySlump: 'ढलान धंसना / कीचड़ का बहाव',
    categoryRockfall: 'राजमार्ग पर बोल्डर / चट्टान गिरना',
    categoryBlockedRoad: 'अवरुद्ध राजमार्ग / मलबे का जमाव',
    categoryRiverDamming: 'नदी का रुकना / अस्थायी जलाशय',
    submitReport: 'आपदा प्रबंधन प्राधिकरण को भेजें',
    submitting: 'रिपोर्ट भेजी जा रही है...',
    offlineBuffered: 'ऑफ़लाइन बफर: रिपोर्ट स्थानीय रूप से सुरक्षित है। नेटवर्क मिलने पर स्वतः सिंक होगी।',
    
    // SMS Alerts
    smsAlertHeader: 'आपातकालीन भूस्खलन चेतावनी',
    evacuateImmediately: 'तुरंत निकटतम सुरक्षित शरण स्थल की ओर प्रस्थान करें।',
  },
  
  as: {
    // Brand & Header
    appTitle: 'টেৰাৱাৰ্ন-এআই (Terrawarn-Ai)',
    appSubtitle: 'উত্তৰ-পূৰ্বাঞ্চল ভূমিস্খলন আগতীয়া সতৰ্কবাৰ্তা ব্যৱস্থা',
    missionControl: 'মিছন কণ্ট্ৰল আৰু পৰিসংখ্যা',
    stationTelemetry: 'ষ্টেচন টেলিমেট্ৰী',
    geospatialGis: 'ভৌগোলিক GIS মানচিত্ৰ',
    alertsIncidents: 'সতৰ্কবাৰ্তা আৰু জৰুৰীকালীন ঘটনা',
    geotechnicalAnalytics: 'ভূতাত্ত্বিক বিশ্লেষণ',
    citizenFieldReports: 'ৰাইজ আৰু ফিল্ড প্ৰতিবেদন',
    settings: 'হাৰ্ডৱেৰ আৰু ছেটিংছ',
    about: 'টেৰাৱাৰ্ন-এআই (Terrawarn-Ai) সম্পৰ্কে',
    
    // Status & Weather
    imdWarningTicker: 'IMD ৰাষ্ট্ৰীয় ভূ-স্থানিক সতৰ্কবাৰ্তা সেৱা',
    monsoonAlert: 'উত্তৰ-পূৰ্বাঞ্চলত প্ৰৱল বাৰিষাৰ সক্ৰিয়তা',
    cloudburstWatch: 'মেঘভঙা বৰষুণৰ সতৰ্কতা: ডিমা হাচাও, খাচী পাহাৰ আৰু ছিকিম',
    ariThreshold: 'পূৰ্বৱৰ্তী বৰষুণ সূচক (ARI-7)',
    
    // Road Connectivity
    roadConnectivity: 'উত্তৰ-পূৰ্বাঞ্চল পথ যোগাযোগ স্থিতি',
    corridorOpen: 'খোলা আছে',
    corridorRestricted: 'নিয়ন্ত্ৰিত / সতৰ্কতা',
    corridorBlocked: 'সম্পূৰ্ণ বন্ধ',
    alternateDetour: 'বিকল্প পথ',
    estClearance: 'আনুমানিক মুকলি সময়',
    
    // Risk & Physics
    riskLow: 'কম',
    riskModerate: 'মধ্যম',
    riskHigh: 'উচ্চ',
    riskCritical: 'অতি বিপজ্জনক',
    factorOfSafety: 'সুৰক্ষা গুণাংক (FoS)',
    stabilityRating: 'স্থিৰতাৰ মাত্ৰা',
    
    // Incident Reporting
    reportIncidentBtn: 'বিপদৰ খবৰ দিয়ক',
    reportTitle: 'ৰাইজ আৰু ফিল্ড বিষয়াৰ বাবে ভূমিস্খলন প্ৰতিবেদন প’ৰ্টেল',
    reportSubtitle: 'উত্তৰ-পূৰ্বাঞ্চলৰ পাহাৰীয়া অঞ্চলত ফাট মেলা, মাটি খহা আৰু পথ বন্ধ হোৱাৰ ফটোসহ প্ৰতিবেদন প্ৰেৰণ কৰক।',
    uploadPhoto: 'ফটো বা ভিডিঅ’ প্ৰমাণ আপলোড কৰক',
    gpsCoordinates: 'GPS স্থানাংক',
    categoryCracks: 'মাটি ফাট মেলা / ভূ-স্খলনৰ আৰম্ভণি',
    categorySlump: 'সক্ৰিয় মাটি খহা / বোকাপানীৰ প্ৰবাহ',
    categoryRockfall: 'ৰাজপথত শিল বাগৰি পৰা',
    categoryBlockedRoad: 'পথ অৱৰোধ / পাহাৰৰ জাবৰ জমা হোৱা',
    categoryRiverDamming: 'নদীৰ গতিৰোধ / কৃত্ৰিম বানৰ শংকা',
    submitReport: 'বিপৰ্যয় ব্যৱস্থাপনা প্ৰাধিকাৰীলৈ প্ৰেৰণ কৰক',
    submitting: 'প্ৰতিবেদন জমা হৈ আছে...',
    offlineBuffered: 'অফলাইন সংৰক্ষণ: প্ৰতিবেদন সংৰক্ষিত হৈছে। নেটৱৰ্ক পালেই স্বয়ংক্ৰিয়ভাৱে ছিংক হ’ব।',
    
    // SMS Alerts
    smsAlertHeader: 'জৰুৰীকালীন ভূমিস্খলন সতৰ্কবাৰ্তা',
    evacuateImmediately: 'অনুগ্ৰহ কৰি পলম নকৰি নিৰাপদ আশ্ৰয়স্থললৈ স্থানান্তৰিত হওক।',
  },
};

const LANGUAGE_STORAGE_KEY = 'landguard_language';

export function getInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage;
  if (saved && (saved === 'en' || saved === 'hi' || saved === 'as')) {
    return saved;
  }
  return 'en';
}

export function setLanguagePreference(lang: SupportedLanguage): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent('landguard-language-changed', { detail: lang }));
}

export function useLanguage() {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getInitialLanguage());

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<SupportedLanguage>;
      if (customEvent.detail) {
        setCurrentLang(customEvent.detail);
      }
    };

    window.addEventListener('landguard-language-changed', handleLangChange);
    return () => window.removeEventListener('landguard-language-changed', handleLangChange);
  }, []);

  const changeLanguage = (lang: SupportedLanguage) => {
    setCurrentLang(lang);
    setLanguagePreference(lang);
  };

  const t = (key: string): string => {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.en[key] || key;
  };

  return {
    currentLang,
    changeLanguage,
    t,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

/**
 * Generates an SMS warning string in the selected language for Fast2SMS Quick Route dispatch.
 */
export function generateMultilingualSms(
  lang: SupportedLanguage,
  sector: string,
  riskLevel: string,
  shelterName: string
): string {
  if (lang === 'hi') {
    return `[आपात चेतावनी] ${sector} पर ${riskLevel} भूस्खलन खतरा। तुरंत ${shelterName} शरण स्थल जाएं। - Terrawarn-Ai DDMA`;
  }
  if (lang === 'as') {
    return `[জৰুৰী সতৰ্কতা] ${sector} ত ${riskLevel} ভূমিস্খলনৰ শংকা। অনুগ্ৰহ কৰি অবিলম্বে ${shelterName} লৈ যাওক। - Terrawarn-Ai DDMA`;
  }
  return `[CRITICAL ALERT] ${riskLevel} Landslide Risk at ${sector}. Evacuate immediately to ${shelterName}. - Terrawarn-Ai DDMA`;
}
