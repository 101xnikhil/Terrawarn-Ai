export interface LocationProfile {
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

export interface KnowledgeDoc {
  id: string;
  title: string;
  keywords: string[];
  body: string;
  followUps: string[];
  locationId?: string;
}

export interface LiveContext {
  moisture: number;
  rain24h: number;
  tilt: number;
  tiltRate: number;
  fos: number;
  riskLevel: string;
  riskScore: number;
}

export interface RagAction {
  label: string;
  prompt: string;
}

export interface RagAnswer {
  text: string;
  headline: string;
  mood: 'calm' | 'watch' | 'alert';
  locationId?: string;
  showLiveCard: boolean;
  sources: string[];
  followUps: string[];
  actions: RagAction[];
}

export interface RagMemory {
  lastUser?: string;
  lastBot?: string;
  lastLocationId?: string;
  lastFollowUps?: string[];
}

export const REGIONAL_LOCATIONS: LocationProfile[] = [
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
    historicalDisasters: 'August 2023 Summer Hill Shiv Temple slide, multiple NH-5 blockages at Chakki Mor',
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

const LOCATION_ALIASES: Record<string, string[]> = {
  'loc-wayanad': ['wayanad', 'meppadi', 'chooralmala', 'kerala', 'वायनाड', 'केरल'],
  'loc-shimla': ['shimla', 'solan', 'nh-5', 'himachal', 'शिमला', 'सोलन'],
  'loc-konkan': ['konkan', 'railway', 'train', 'goa', 'कोंकण'],
  'loc-mandi': ['mandi', 'pandoh', 'aut', 'beas', 'मंडी'],
  'loc-chamoli': ['joshimath', 'chamoli', 'uttarakhand', 'जोशीमठ', 'चमोली'],
  'loc-munnar': ['munnar', 'pettimudi', 'मुन्नार'],
};

const EXTRA_DOCS: KnowledgeDoc[] = [
  {
    id: 'doc-live',
    title: 'Live station TW-N01 telemetry',
    keywords: [
      'live', 'current', 'status', 'station', 'tw-n01', 'lg-n01', 'now', 'reading',
      'moisture', 'rain', 'tilt', 'fos', 'स्थिति', 'स्टेशन', 'लाइव',
    ],
    body: 'Station TW-N01 on Sector 7 reports live soil moisture, 24-hour rainfall, slope tilt, creep rate, Bishop Factor of Safety, and XGBoost risk. Switch the header to ESP32 to show cloud-synced values.',
    followUps: [
      'Is the slope currently safe to travel on NH-5?',
      'What rainfall would push this station to CRITICAL?',
      'Explain Bishop Factor of Safety in simple words',
    ],
  },
  {
    id: 'doc-physics',
    title: 'Why landslides recur',
    keywords: ['recur', 'repeat', 'why', 'cause', 'mechanism', 'pore', 'fos', 'shear', 'physics', 'क्यों', 'बार बार'],
    body: 'Landslides recur on the same slopes because residual friction after a first failure is lower than peak strength, rain raises pore-water pressure and drops effective stress, road cuts remove toe support, and water keeps using the same underground paths. FoS below 1.0 means shear demand exceeds resistance.',
    followUps: [
      'Explain Bishop Factor of Safety in simple words',
      'How does Terrawarn warn people before failure?',
      'Compare Wayanad with the Shimla NH-5 corridor',
    ],
  },
  {
    id: 'doc-fos',
    title: 'Bishop Factor of Safety',
    keywords: ['bishop', 'factor', 'safety', 'fos', 'simple', 'explain', 'सुरक्षा'],
    body: 'Bishop FoS is resisting strength divided by driving force on the slip surface. Above 1.3 the slope has a buffer. Between 1.0 and 1.3 we treat it as a warning. Below 1.0 the soil can start moving. Terrawarn watches moisture and tilt so FoS is not a one-time lab number.',
    followUps: [
      'What is the current live risk at TW-N01?',
      'Why do landslides happen in the same place again?',
    ],
  },
  {
    id: 'doc-alerts',
    title: 'SMS and public warning',
    keywords: ['sms', 'alert', 'fast2sms', 'phone', 'broadcast', 'helpline', 'evacuate', 'siren', 'अलर्ट', 'एसएमएस'],
    body: 'Terrawarn sends Fast2SMS Quick Route texts to Indian numbers on HIGH or CRITICAL. Use Alerts → Send Red Alert SMS for a one-shot number, or ALERT_SMS_RECIPIENTS in .env for automatic dispatch. Helplines are 1070 and 112. The red cell-broadcast card on the website is a mockup; phones receive a normal SMS.',
    followUps: [
      'What is the current live risk at TW-N01?',
      'What should people do when they get a red alert SMS?',
    ],
  },
  {
    id: 'doc-action',
    title: 'What to do in a red alert',
    keywords: ['evacuate', 'action', 'safe', 'travel', 'people', 'do', 'now', 'team', 'field'],
    body: 'If risk is HIGH or CRITICAL: stay off cut slopes and NH-5 hairpins, move upslope or to designated shelters, keep phones on for SMS, and call 1070 or 112. Field teams should not stand at the toe. Confirm moisture, rain, and tilt on the dashboard before sending a second alert.',
    followUps: [
      'How does the SMS warning actually reach phones?',
      'Show me the current live station status',
    ],
  },
  {
    id: 'doc-xgboost',
    title: 'Cloud XGBoost risk model',
    keywords: ['xgboost', 'model', 'ml', 'cloud', 'predict', 'shap', 'ai'],
    body: 'The cloud TerraWarn API at 34.131.240.174 scores live moisture, rain, and tilt with prototype-xgboost-v1. Settings Sync or Auto-Stream ingests that packet. Overview shows it only in ESP32 mode. Physics FoS can still override a low ML score if the slope is mechanically unsafe.',
    followUps: [
      'Show me the current live station status',
      'Why do landslides happen in the same place again?',
    ],
  },
];

const STOP = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'how', 'what',
  'why', 'when', 'where', 'this', 'that', 'with', 'from', 'about', 'tell', 'give',
  'please', 'me', 'our', 'your', 'into', 'over', 'under',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function locationDocs(): KnowledgeDoc[] {
  return REGIONAL_LOCATIONS.map((loc) => ({
    id: loc.id,
    title: loc.name,
    keywords: [
      loc.name.toLowerCase(),
      loc.state.toLowerCase(),
      loc.region.toLowerCase(),
      ...loc.name.toLowerCase().split(/[\s,—-]+/),
      ...(LOCATION_ALIASES[loc.id] || []),
    ],
    body: `${loc.name} in ${loc.state} is ${loc.riskLevel} risk. Trigger rainfall ${loc.triggerRainfallThreshold}. Soil: ${loc.soilType}. Bedrock: ${loc.bedrock}. Recurrence: ${loc.recurrencePeriod}. Past events: ${loc.historicalDisasters}. Cause: ${loc.recurringCause} Mitigation: ${loc.mitigationStrategy}.`,
    followUps: [
      `What should field teams do right now in ${loc.state}?`,
      'Compare this corridor with the live TW-N01 station',
    ],
    locationId: loc.id,
  }));
}

function scoreDoc(queryTokens: string[], rawQuery: string, doc: KnowledgeDoc): number {
  const hay = `${doc.title} ${doc.keywords.join(' ')} ${doc.body}`.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (hay.includes(token)) score += 2;
    if (doc.keywords.some((k) => k.includes(token) || token.includes(k))) score += 3;
  }
  if (rawQuery.toLowerCase().includes(doc.title.split(' ')[0].toLowerCase())) score += 4;
  return score;
}

export function retrieveKnowledge(query: string, limit = 3): KnowledgeDoc[] {
  const tokens = tokenize(query);
  const ranked = [...locationDocs(), ...EXTRA_DOCS]
    .map((doc) => ({ doc, score: scoreDoc(tokens, query, doc) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.doc);
  return ranked;
}

function fosPlain(fos: number): string {
  if (fos < 1) return 'below 1.0 — shear can start';
  if (fos < 1.3) return 'in the watch band — the safety margin is thin';
  return 'still above the warning line';
}

function liveBrief(live: LiveContext): { headline: string; text: string; mood: 'calm' | 'watch' | 'alert' } {
  const mood = liveMood(live);
  if (mood === 'alert') {
    return {
      mood,
      headline: 'Do not treat this slope as safe.',
      text: `TW-N01 is ${live.riskLevel}. Factor of safety is ${live.fos.toFixed(2)} — ${fosPlain(live.fos)}. Stay off cut slopes, keep the phone on for SMS, and call 1070 or 112 if ground starts moving.`,
    };
  }
  if (mood === 'watch') {
    return {
      mood,
      headline: 'Watch band — travel with care.',
      text: `TW-N01 is ${live.riskLevel}. FoS ${live.fos.toFixed(2)} is thin. Moisture ${live.moisture.toFixed(1)}%, rain ${live.rain24h.toFixed(1)} mm, tilt ${live.tilt.toFixed(1)}°. I can open SMS steps or a corridor brief next.`,
    };
  }
  return {
    mood,
    headline: 'Slope still has a buffer.',
    text: `TW-N01 is ${live.riskLevel}. FoS ${live.fos.toFixed(2)} is above the warning line. Moisture ${live.moisture.toFixed(1)}% and rain ${live.rain24h.toFixed(1)} mm. Ask if you want SMS, FoS, or a district brief.`,
  };
}

function expandVoiceCommand(raw: string, memory: RagMemory = {}): string {
  const q = raw.trim().toLowerCase();
  if (!q) return raw;

  if (/^(yes|yeah|yep|haan|ha|ok|okay|sure|tell me|more|go on|continue|हाँ|हां|ठीक)$/i.test(q)) {
    return memory.lastFollowUps?.[0] || raw;
  }

  if (/\b(it|there|that place|same|wahan|yahan|वहाँ|वहां|यहाँ)\b/.test(q) && memory.lastLocationId) {
    const loc = REGIONAL_LOCATIONS.find((l) => l.id === memory.lastLocationId);
    if (loc) return `${raw} ${loc.name} ${loc.state}`;
  }

  if (/^(status|situation|live|safe|risk|update|स्थिति|लाइव)$/i.test(q)) {
    return 'What is the current live geotechnical stability and risk level at station TW-N01?';
  }
  if (/\b(sms|alert|evacuate|helpline|1070|112|एसएमएस|अलर्ट)\b/.test(q) && q.length < 48) {
    return 'How does Terrawarn send SMS alerts and what should people do?';
  }
  if (/\b(fos|bishop|safety|factor)\b/.test(q) && q.length < 48) {
    return 'Explain Bishop Factor of Safety in simple words';
  }
  return raw;
}

function liveMood(live: LiveContext): 'calm' | 'watch' | 'alert' {
  if (live.fos < 1 || live.riskLevel === 'CRITICAL' || live.riskLevel === 'HIGH') return 'alert';
  if (live.fos < 1.3 || live.riskLevel === 'MODERATE') return 'watch';
  return 'calm';
}

function actionSet(...rows: RagAction[]): RagAction[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.prompt)) return false;
    seen.add(row.prompt);
    return true;
  }).slice(0, 4);
}

export function answerWithRag(query: string, live: LiveContext, memory: RagMemory = {}): RagAnswer {
  const expanded = expandVoiceCommand(query, memory);
  const q = expanded.toLowerCase();
  const greeting = /\b(hi|hello|hey|namaste|namaskar|yo|हैलो|नमस्ते)\b/.test(q) && q.length < 48;
  const wantsLive =
    /\b(live|current|now|status|station|tw-n01|lg-n01|safe|travel|nh-5|स्थिति|लाइव)\b/.test(q) ||
    retrieveKnowledge(expanded, 1)[0]?.id === 'doc-live';

  const hits = retrieveKnowledge(expanded, 3);
  const locationHit = greeting
    ? undefined
    : hits.find((h) => h.locationId) ||
      (memory.lastLocationId && (hits.length === 0 || /\b(it|there|same|wahan|yahan)\b/.test(q))
        ? { locationId: memory.lastLocationId } as KnowledgeDoc
        : undefined);
  const loc = locationHit?.locationId
    ? REGIONAL_LOCATIONS.find((l) => l.id === locationHit.locationId)
    : undefined;

  let headline = 'Here is what I have.';
  let text = '';
  let showLiveCard = false;
  let mood: 'calm' | 'watch' | 'alert' = 'calm';
  let sources: string[] = [];
  let actions: RagAction[] = [];
  let locationId: string | undefined;

  if (greeting) {
    headline = 'Hey — GeoBot here.';
    text = 'Hold the green mic, type, or tap a path. I retrieve corridor briefs and ground them in live TW-N01 numbers.';
    actions = actionSet(
      { label: 'Is it safe right now?', prompt: 'Is the slope currently safe to travel on NH-5?' },
      { label: 'Wayanad brief', prompt: 'Tell me about the recurring landslide risks and causes in Wayanad, Kerala.' },
      { label: 'SMS alerts', prompt: 'How does Terrawarn send SMS alerts and what should people do?' },
      { label: 'Live numbers', prompt: 'What is the current live geotechnical stability and risk level at station TW-N01?' },
    );
  } else if (wantsLive && !loc) {
    const brief = liveBrief(live);
    headline = brief.headline;
    text = brief.text;
    mood = brief.mood;
    showLiveCard = true;
    sources = ['TW-N01 live buffer'];
    actions = actionSet(
      { label: 'What should I do?', prompt: 'What should people do when they get a red alert SMS?' },
      { label: 'SMS alerts', prompt: 'How does Terrawarn send SMS alerts and what should people do?' },
      { label: 'Why FoS matters', prompt: 'Explain Bishop Factor of Safety in simple words' },
      { label: 'Wayanad brief', prompt: 'Tell me about the recurring landslide risks and causes in Wayanad, Kerala.' },
    );
  } else if (hits.length === 0) {
    headline = loc ? `Still on ${loc.name.split(' ')[0]}.` : 'I caught that.';
    text = loc
      ? `We can stay on ${loc.name}. Ask for the rainfall trigger, what field teams should do, or compare with live TW-N01.`
      : 'Try “is it safe?”, Wayanad, Shimla, SMS alerts, or live station status.';
    locationId = loc?.id;
    mood = loc && (loc.riskLevel === 'CRITICAL' || loc.riskLevel === 'HIGH') ? 'watch' : 'calm';
    actions = actionSet(
      { label: 'Live status', prompt: 'What is the current live geotechnical stability and risk level at station TW-N01?' },
      { label: 'Wayanad', prompt: 'Tell me about the recurring landslide risks and causes in Wayanad, Kerala.' },
      { label: 'Why slides recur', prompt: 'What are the main scientific reasons landslides happen in the same specific locations repeatedly?' },
    );
  } else {
    const primary = hits[0];
    sources = hits.map((h) => h.title);
    locationId = loc?.id;
    if (loc) {
      headline = loc.name.split(/[—(]/)[0].trim();
      text = `${loc.name} is ${loc.riskLevel} risk. ${loc.recurringCause} Trigger rain ${loc.triggerRainfallThreshold}.`;
      mood = loc.riskLevel === 'CRITICAL' || loc.riskLevel === 'HIGH' ? 'alert' : 'watch';
      if (wantsLive || /\b(compare|now|today|safe|status)\b/.test(q)) {
        const brief = liveBrief(live);
        text = `${text}\n\nLive TW-N01 right now: ${brief.text}`;
        showLiveCard = true;
        mood = brief.mood === 'alert' || mood === 'alert' ? 'alert' : brief.mood;
      }
      actions = actionSet(
        { label: 'What should teams do?', prompt: `What should field teams do right now in ${loc.state}?` },
        { label: 'Compare with TW-N01', prompt: 'Compare this corridor with the live TW-N01 station' },
        { label: 'SMS warning', prompt: 'How does Terrawarn send SMS alerts and what should people do?' },
      );
    } else {
      headline = primary.title;
      text = primary.body;
      if (wantsLive || /\b(compare|now|today|safe|status)\b/.test(q)) {
        const brief = liveBrief(live);
        headline = brief.headline;
        text = `${brief.text}\n\n${primary.body}`;
        showLiveCard = true;
        mood = brief.mood;
      }
      actions = actionSet(
        ...(primary.followUps || []).map((prompt) => ({
          label: prompt.length > 28 ? `${prompt.slice(0, 26)}…` : prompt,
          prompt,
        })),
        { label: 'Live numbers', prompt: 'What is the current live geotechnical stability and risk level at station TW-N01?' },
      );
    }
  }

  const followUps = actions.map((a) => a.prompt);

  return {
    text: text.trim(),
    headline,
    mood,
    locationId,
    showLiveCard,
    sources,
    followUps,
    actions,
  };
}

export function findLocation(id?: string): LocationProfile | undefined {
  return REGIONAL_LOCATIONS.find((loc) => loc.id === id);
}
