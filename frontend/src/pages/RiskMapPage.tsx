import React, { useState, useMemo, useEffect } from 'react';
import { useMockTelemetry } from '../hooks/useMockTelemetry';
import LoadingState from '../components/common/LoadingState';
import PrototypeLabel from '../components/common/PrototypeLabel';
import { 
  MapContainer, TileLayer, Marker, Popup, ZoomControl, Circle, 
  Polyline, Polygon, Tooltip, useMap 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { RISK_COLORS, RISK_TEXT_CLASSES, RiskLevel } from '../types';
import { formatTimeShort, formatPercent, formatRSSI, formatBattery, formatDegrees } from '../utils/formatters';
import { 
  MapPin, Mountain, Radio, Droplets, CloudRain, Activity, Layers, 
  Compass, ShieldAlert, ShieldCheck, Crosshair, Navigation, Locate, 
  AlertTriangle, Home, Globe, Filter, CheckCircle2, ChevronRight,
  ExternalLink, Eye, Info, Sparkles, Volume2, VolumeX, Maximize2, 
  Minimize2, Route, History, Zap, BellRing, Check, X, ArrowUpRight,
  Shield, Tag, Camera
} from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/LanguageContext';
import ReportIncidentModal from '../components/reports/ReportIncidentModal';

// Fix Leaflet marker asset paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Station, Shelter & GIS Data Models ─────────────────────────
export interface MapStation {
  id: string;
  name: string;
  sector: string;
  region: 'Himalayas' | 'Western Ghats' | 'Garhwal' | 'Railways' | 'Northeast';
  state: string;
  lat: number;
  lng: number;
  altitude_m: number;
  isLiveHardware?: boolean;
  geology: string;
  cohesion_kpa: number;
  friction_deg: number;
  slope_height_m: number;
  risk_level: RiskLevel;
  risk_score: number;
  fos_estimate: number;
  soil_moisture_pct: number;
  rainfall_24h_mm: number;
  tilt_angle: number;
  tilt_rate: number;
  rssi_dbm: number;
  snr_db: number;
  battery_pct: number;
  battery_mv: number;
  status: 'ONLINE' | 'ACTIVE' | 'DEGRADED';
  hazardRadius_m: number;
  actionProtocol: string;
  installDate: string;
}

export interface EmergencyShelter {
  id: string;
  name: string;
  sector: string;
  lat: number;
  lng: number;
  capacity: number;
  type: string;
  facilities: string;
  associatedNodeId: string;
}

export interface EvacuationRoute {
  id: string;
  stationId: string;
  shelterId: string;
  name: string;
  distance_km: number;
  est_walk_min: number;
  gradient_pct: number;
  coordinates: [number, number][];
  safetyClearance: string;
}

export interface HistoricalLandslideScar {
  id: string;
  name: string;
  location: string;
  year: number;
  date: string;
  polygon: [number, number][];
  volume_m3: string;
  casualties: string;
  triggerRainfall: string;
  mechanism: string;
  remediation: string;
}

// ─── 8 Pan-India Geotechnical Stations ─────────────────────────
const PAN_INDIA_STATIONS: MapStation[] = [
  {
    id: 'TW-N01',
    name: 'Slope Monitor Alpha',
    sector: 'Shimla Ridge — Northern face, Sector 7',
    region: 'Himalayas',
    state: 'Himachal Pradesh',
    lat: 31.1048,
    lng: 77.1734,
    altitude_m: 2276,
    isLiveHardware: true,
    geology: 'Fractured Jutogh Group quartz-mica schists with colluvial overburden',
    cohesion_kpa: 14.5,
    friction_deg: 28.5,
    slope_height_m: 42,
    risk_level: 'MODERATE',
    risk_score: 0.27,
    fos_estimate: 0.97,
    soil_moisture_pct: 22.2,
    rainfall_24h_mm: 0.0,
    tilt_angle: 21.8,
    tilt_rate: -0.059,
    rssi_dbm: -63,
    snr_db: 9.2,
    battery_pct: 82,
    battery_mv: 3780,
    status: 'ONLINE',
    hazardRadius_m: 1200,
    actionProtocol: 'Continuous LoRa Ingestion & Automated Quick SMS Cell Broadcast (<1.2s)',
    installDate: '15 Jan 2024',
  },
  {
    id: 'LG-N02',
    name: 'Chooralmala Debris Sentinel',
    sector: 'Chooralmala & Meppadi Basin, Sector 4',
    region: 'Western Ghats',
    state: 'Kerala',
    lat: 11.5434,
    lng: 76.1362,
    altitude_m: 940,
    geology: 'Saturated porous lateritic overburden resting on sloping impermeable charnockite',
    cohesion_kpa: 8.2,
    friction_deg: 24.0,
    slope_height_m: 65,
    risk_level: 'CRITICAL',
    risk_score: 0.93,
    fos_estimate: 0.82,
    soil_moisture_pct: 86.4,
    rainfall_24h_mm: 214.5,
    tilt_angle: 32.6,
    tilt_rate: 0.195,
    rssi_dbm: -74,
    snr_db: 7.1,
    battery_pct: 91,
    battery_mv: 4020,
    status: 'ACTIVE',
    hazardRadius_m: 1900,
    actionProtocol: 'CRITICAL WARNING: Community Evacuation Sirens & CAP SMS Order Broadcast',
    installDate: '02 Aug 2024',
  },
  {
    id: 'LG-N03',
    name: 'Joshimath Sinking Gauge',
    sector: 'Sunil & Manohar Bagh Slopes, Sector 2',
    region: 'Garhwal',
    state: 'Uttarakhand',
    lat: 30.5562,
    lng: 79.5674,
    altitude_m: 1980,
    geology: 'Ancient landslide debris mass undergoing basal shear creep with aquifer seepage',
    cohesion_kpa: 11.0,
    friction_deg: 26.5,
    slope_height_m: 55,
    risk_level: 'HIGH',
    risk_score: 0.71,
    fos_estimate: 1.08,
    soil_moisture_pct: 54.2,
    rainfall_24h_mm: 48.0,
    tilt_angle: 27.4,
    tilt_rate: 0.098,
    rssi_dbm: -69,
    snr_db: 8.5,
    battery_pct: 76,
    battery_mv: 3710,
    status: 'ACTIVE',
    hazardRadius_m: 1400,
    actionProtocol: 'HIGH HAZARD: Deep Drainage Pumps Armed & Structural Settlement Alert',
    installDate: '10 Feb 2023',
  },
  {
    id: 'LG-N04',
    name: 'Konkan Rail Cutting Node',
    sector: 'Ratnagiri Deep Ghat Cutting, Sector 9',
    region: 'Railways',
    state: 'Maharashtra',
    lat: 17.2934,
    lng: 73.4124,
    altitude_m: 320,
    geology: 'Weathered Deccan Traps basalt columnar jointing adjacent to main track cut',
    cohesion_kpa: 18.0,
    friction_deg: 34.0,
    slope_height_m: 28,
    risk_level: 'MODERATE',
    risk_score: 0.44,
    fos_estimate: 1.32,
    soil_moisture_pct: 63.8,
    rainfall_24h_mm: 86.0,
    tilt_angle: 23.1,
    tilt_rate: 0.042,
    rssi_dbm: -61,
    snr_db: 10.4,
    battery_pct: 88,
    battery_mv: 3950,
    status: 'ACTIVE',
    hazardRadius_m: 1050,
    actionProtocol: 'Railway Automatic Track Signal Interlock Armed (<1.2s Fail-Safe Stop)',
    installDate: '24 May 2024',
  },
  {
    id: 'LG-N05',
    name: 'Mandi Beas River Sentry',
    sector: 'Pandoh Dam Aut NH-3 Corridor, Sector 5',
    region: 'Himalayas',
    state: 'Himachal Pradesh',
    lat: 31.7088,
    lng: 76.9318,
    altitude_m: 920,
    geology: 'Aggressive river toe scouring on loose alluvial boulders & fluvio-glacial deposits',
    cohesion_kpa: 9.5,
    friction_deg: 27.0,
    slope_height_m: 48,
    risk_level: 'HIGH',
    risk_score: 0.69,
    fos_estimate: 1.06,
    soil_moisture_pct: 73.0,
    rainfall_24h_mm: 122.0,
    tilt_angle: 28.5,
    tilt_rate: 0.115,
    rssi_dbm: -67,
    snr_db: 8.8,
    battery_pct: 83,
    battery_mv: 3820,
    status: 'ACTIVE',
    hazardRadius_m: 1350,
    actionProtocol: 'NH-3 Highway Traffic Management Automated Red Signal Diversion',
    installDate: '18 Aug 2023',
  },
  {
    id: 'LG-N06',
    name: 'Munnar Pettimudi Scarp Node',
    sector: 'Pettimudi Tea Plantation Scarp, Sector 3',
    region: 'Western Ghats',
    state: 'Kerala',
    lat: 10.0889,
    lng: 77.0595,
    altitude_m: 1620,
    geology: 'Granite gneiss sheet joints with permeable weathered topsoil layer',
    cohesion_kpa: 16.0,
    friction_deg: 32.0,
    slope_height_m: 35,
    risk_level: 'LOW',
    risk_score: 0.16,
    fos_estimate: 1.62,
    soil_moisture_pct: 42.0,
    rainfall_24h_mm: 32.0,
    tilt_angle: 18.6,
    tilt_rate: 0.012,
    rssi_dbm: -58,
    snr_db: 11.2,
    battery_pct: 95,
    battery_mv: 4120,
    status: 'ONLINE',
    hazardRadius_m: 900,
    actionProtocol: 'STABILITY NOMINAL: Regular 5-minute LoRa Telemetry Sweep Active',
    installDate: '14 Sep 2024',
  },
  {
    id: 'LG-N07',
    name: 'Darjeeling Hill Cart Node',
    sector: 'Tindharia Cutting Corridor, Sector 8',
    region: 'Himalayas',
    state: 'West Bengal',
    lat: 26.8532,
    lng: 88.3361,
    altitude_m: 1450,
    geology: 'Daling group phyllites, fractured talc schists and steep tea terrace excavations',
    cohesion_kpa: 12.0,
    friction_deg: 29.0,
    slope_height_m: 52,
    risk_level: 'HIGH',
    risk_score: 0.64,
    fos_estimate: 1.16,
    soil_moisture_pct: 69.5,
    rainfall_24h_mm: 98.0,
    tilt_angle: 25.8,
    tilt_rate: 0.088,
    rssi_dbm: -71,
    snr_db: 7.9,
    battery_pct: 79,
    battery_mv: 3750,
    status: 'ACTIVE',
    hazardRadius_m: 1250,
    actionProtocol: 'Hill Cart Road Heavy Vehicle Traffic Restriction Advisory Active',
    installDate: '08 Mar 2024',
  },
  {
    id: 'LG-N08',
    name: 'Guwahati Nilachal Sentry',
    sector: 'Kamakhya Hill Road Cutting, Sector 6',
    region: 'Northeast',
    state: 'Assam',
    lat: 26.1664,
    lng: 91.7061,
    altitude_m: 180,
    geology: 'Archean granite gneiss basement topped by loose red weathered sandy clay',
    cohesion_kpa: 19.5,
    friction_deg: 35.0,
    slope_height_m: 22,
    risk_level: 'LOW',
    risk_score: 0.12,
    fos_estimate: 1.78,
    soil_moisture_pct: 31.5,
    rainfall_24h_mm: 10.0,
    tilt_angle: 14.2,
    tilt_rate: 0.006,
    rssi_dbm: -55,
    snr_db: 12.0,
    battery_pct: 98,
    battery_mv: 4180,
    status: 'ONLINE',
    hazardRadius_m: 750,
    actionProtocol: 'STABILITY NOMINAL: Baseline Urban Slopeline Inspection Standard',
    installDate: '12 Apr 2024',
  },
  {
    id: 'LG-N09',
    name: 'Cherrapunji Mega-Rain Sentry',
    sector: 'Sohra Escarpment Scarp, Sector 10',
    region: 'Northeast',
    state: 'Meghalaya',
    lat: 25.2702,
    lng: 91.7323,
    altitude_m: 1430,
    geology: 'Shella formation bedded sandstone overlying cavernous Sylhet limestone',
    cohesion_kpa: 14.5,
    friction_deg: 31.0,
    slope_height_m: 78,
    risk_level: 'CRITICAL',
    risk_score: 0.91,
    fos_estimate: 0.86,
    soil_moisture_pct: 94.2,
    rainfall_24h_mm: 286.4,
    tilt_angle: 34.1,
    tilt_rate: 0.178,
    rssi_dbm: -72,
    snr_db: 7.5,
    battery_pct: 88,
    battery_mv: 3980,
    status: 'ACTIVE',
    hazardRadius_m: 2100,
    actionProtocol: 'CRITICAL HAZARD: Sohra Escarpment Siren Active & Mawkdok Gorge Evac',
    installDate: '15 Jan 2024',
  },
  {
    id: 'LG-N10',
    name: 'Tawang Sela Pass Strategic Sentry',
    sector: 'Sela West Approach Cutting, Sector 11',
    region: 'Northeast',
    state: 'Arunachal Pradesh',
    lat: 27.5861,
    lng: 91.8654,
    altitude_m: 2750,
    geology: 'High-altitude weathered gneissic scree and glacial moraine overburden',
    cohesion_kpa: 10.5,
    friction_deg: 28.5,
    slope_height_m: 62,
    risk_level: 'HIGH',
    risk_score: 0.74,
    fos_estimate: 1.05,
    soil_moisture_pct: 62.5,
    rainfall_24h_mm: 45.0,
    tilt_angle: 29.2,
    tilt_rate: 0.108,
    rssi_dbm: -78,
    snr_db: 6.2,
    battery_pct: 74,
    battery_mv: 3690,
    status: 'ACTIVE',
    hazardRadius_m: 1600,
    actionProtocol: 'NH-13 Strategic Corridor Defense Escort Armed (<3.5h Clearance)',
    installDate: '22 Apr 2024',
  },
  {
    id: 'LG-N11',
    name: 'Dima Hasao Haflong Hill Sentry',
    sector: 'Jatinga Escarpment Rail Cutting, Sector 12',
    region: 'Northeast',
    state: 'Assam',
    lat: 25.1789,
    lng: 93.0245,
    altitude_m: 510,
    geology: 'Surma group sheared siltstones and saturated montmorillonite swelling clays',
    cohesion_kpa: 7.8,
    friction_deg: 22.0,
    slope_height_m: 46,
    risk_level: 'CRITICAL',
    risk_score: 0.88,
    fos_estimate: 0.91,
    soil_moisture_pct: 86.4,
    rainfall_24h_mm: 154.2,
    tilt_angle: 31.8,
    tilt_rate: 0.145,
    rssi_dbm: -69,
    snr_db: 8.8,
    battery_pct: 84,
    battery_mv: 3870,
    status: 'ACTIVE',
    hazardRadius_m: 1800,
    actionProtocol: 'NH-27 / Lumding Railway Track Subsidence Interlock Triggered',
    installDate: '10 Jun 2023',
  },
  {
    id: 'LG-N12',
    name: 'Noney Tupul Disaster Corridor Sentry',
    sector: 'Ijei River Pier Approach Scarp, Sector 13',
    region: 'Northeast',
    state: 'Manipur',
    lat: 24.8123,
    lng: 93.6421,
    altitude_m: 420,
    geology: 'Disalkali shale bedrock covered by loose debris slump mass abutting river channel',
    cohesion_kpa: 8.5,
    friction_deg: 23.5,
    slope_height_m: 70,
    risk_level: 'CRITICAL',
    risk_score: 0.94,
    fos_estimate: 0.81,
    soil_moisture_pct: 89.1,
    rainfall_24h_mm: 162.0,
    tilt_angle: 33.7,
    tilt_rate: 0.188,
    rssi_dbm: -75,
    snr_db: 7.0,
    battery_pct: 81,
    battery_mv: 3790,
    status: 'ACTIVE',
    hazardRadius_m: 2200,
    actionProtocol: 'IMMEDIATE EMERGENCY: Ijei River Backwater Impoundment Alert Active',
    installDate: '05 Sep 2022',
  },
];

// ─── 5 Designated Emergency Evacuation Shelters ────────────────
const EMERGENCY_SHELTERS: EmergencyShelter[] = [
  {
    id: 'SHELTER-01',
    name: 'Shimla Ridge Assembly Ground',
    sector: 'Sector 7 (Shimla)',
    lat: 31.1065,
    lng: 77.1760,
    capacity: 1500,
    type: 'Designated Safe Zone',
    facilities: 'Medical Triage, Satellite Comms, Potable Water',
    associatedNodeId: 'TW-N01',
  },
  {
    id: 'SHELTER-02',
    name: 'Meppadi High School Relief Hub',
    sector: 'Sector 4 (Wayanad)',
    lat: 11.5510,
    lng: 76.1320,
    capacity: 1200,
    type: 'NDRF Base Camp',
    facilities: 'Helipad Approach, Emergency Kitchen, Trauma Unit',
    associatedNodeId: 'LG-N02',
  },
  {
    id: 'SHELTER-03',
    name: 'Joshimath Auli High-Ground Base',
    sector: 'Sector 2 (Chamoli)',
    lat: 30.5310,
    lng: 79.5710,
    capacity: 650,
    type: 'IAF Evac Base',
    facilities: 'Heated Shelters, IAF Helicopter Pad, Army Medical Post',
    associatedNodeId: 'LG-N03',
  },
  {
    id: 'SHELTER-04',
    name: 'Khed Railway Safe Siding Depot',
    sector: 'Sector 9 (Konkan)',
    lat: 17.3050,
    lng: 73.4020,
    capacity: 1800,
    type: 'Railway Safe Haven',
    facilities: 'Emergency Passenger Relief Rake, Rail Comms, Diesel Gen',
    associatedNodeId: 'LG-N04',
  },
  {
    id: 'SHELTER-05',
    name: 'Kurseong Civil Defense Safe Ground',
    sector: 'Sector 8 (Darjeeling)',
    lat: 26.8790,
    lng: 88.2780,
    capacity: 500,
    type: 'Civil Defense Post',
    facilities: 'Blankets, Emergency Rations, Mountain Rescue Crew',
    associatedNodeId: 'LG-N07',
  },
  {
    id: 'SHELTER-06',
    name: 'Sohra Ramakrishna Mission Relief Hub',
    sector: 'Sector 10 (Cherrapunji)',
    lat: 25.2750,
    lng: 91.7380,
    capacity: 2200,
    type: 'Regional Disaster Triage Center',
    facilities: 'Medical Trauma Unit, High-Frequency Wireless, Emergency Kitchen',
    associatedNodeId: 'LG-N09',
  },
  {
    id: 'SHELTER-07',
    name: 'Tawang Sela Base Transit Camp',
    sector: 'Sector 11 (Tawang)',
    lat: 27.5920,
    lng: 91.8710,
    capacity: 900,
    type: 'BRO Defense Waystation',
    facilities: 'Helipad Clearance, Heated Quarters, Oxygen Cylinders',
    associatedNodeId: 'LG-N10',
  },
  {
    id: 'SHELTER-08',
    name: 'Haflong District Indoor Sports Complex',
    sector: 'Sector 12 (Dima Hasao)',
    lat: 25.1850,
    lng: 93.0290,
    capacity: 3500,
    type: 'District Evacuation Center',
    facilities: 'Water Filtration Tank, Satellite Internet, NDRF Staging Ground',
    associatedNodeId: 'LG-N11',
  },
  {
    id: 'SHELTER-09',
    name: 'Noney Higher Secondary Relief School',
    sector: 'Sector 13 (Noney, Manipur)',
    lat: 24.8180,
    lng: 93.6490,
    capacity: 1400,
    type: 'State Relief Haven',
    facilities: 'Disaster Cell, First Aid Station, Amphibious Rescue Unit',
    associatedNodeId: 'LG-N12',
  },
];

// ─── Georeferenced Evacuation Corridors (Polylines) ────────────
const EVACUATION_ROUTES: EvacuationRoute[] = [
  {
    id: 'EVAC-01',
    stationId: 'TW-N01',
    shelterId: 'SHELTER-01',
    name: 'Shimla North Ridge Crest Safe Corridor',
    distance_km: 1.2,
    est_walk_min: 14,
    gradient_pct: 6.2,
    safetyClearance: '100% stable bedrock ridge avoiding steep colluvial scarps',
    coordinates: [
      [31.1048, 77.1734],
      [31.1054, 77.1746],
      [31.1060, 77.1755],
      [31.1065, 77.1760]
    ]
  },
  {
    id: 'EVAC-02',
    stationId: 'LG-N02',
    shelterId: 'SHELTER-02',
    name: 'Meppadi High Ground River Bypass Route',
    distance_km: 1.8,
    est_walk_min: 24,
    gradient_pct: 8.5,
    safetyClearance: 'Elevated tea-terrace ridge safe from Chooralmala flood channels',
    coordinates: [
      [11.5434, 76.1362],
      [11.5458, 76.1348],
      [11.5482, 76.1335],
      [11.5510, 76.1320]
    ]
  },
  {
    id: 'EVAC-03',
    stationId: 'LG-N03',
    shelterId: 'SHELTER-03',
    name: 'Joshimath-Auli Uphill Mountain Retreat Spur',
    distance_km: 3.4,
    est_walk_min: 48,
    gradient_pct: 14.0,
    safetyClearance: 'Retreat pathway ascending into solid granite gneisses towards helipad',
    coordinates: [
      [30.5562, 79.5674],
      [30.5480, 79.5690],
      [30.5400, 79.5700],
      [30.5310, 79.5710]
    ]
  },
  {
    id: 'EVAC-04',
    stationId: 'LG-N04',
    shelterId: 'SHELTER-04',
    name: 'Konkan Rail Alignment Safety Escape',
    distance_km: 2.1,
    est_walk_min: 26,
    gradient_pct: 3.8,
    safetyClearance: 'Reinforced trackside ballast path to emergency siding',
    coordinates: [
      [17.2934, 73.4124],
      [17.2980, 73.4080],
      [17.3020, 73.4050],
      [17.3050, 73.4020]
    ]
  },
  {
    id: 'EVAC-05',
    stationId: 'LG-N05',
    shelterId: 'SHELTER-01',
    name: 'Pandoh-Aut River Cliff Ascent',
    distance_km: 2.4,
    est_walk_min: 32,
    gradient_pct: 9.0,
    safetyClearance: 'Elevated highway diversion road above Beas flood line',
    coordinates: [
      [31.7088, 76.9318],
      [31.7130, 76.9350],
      [31.7160, 76.9380],
      [31.7200, 76.9400]
    ]
  },
  {
    id: 'EVAC-07',
    stationId: 'LG-N07',
    shelterId: 'SHELTER-05',
    name: 'Hill Cart Road Upper Escape Spine',
    distance_km: 4.6,
    est_walk_min: 52,
    gradient_pct: 7.5,
    safetyClearance: 'Upper ridgeline pedestrian trail clear of toe excavation zones',
    coordinates: [
      [26.8532, 88.3361],
      [26.8620, 88.3150],
      [26.8710, 88.2950],
      [26.8790, 88.2780]
    ]
  },
  {
    id: 'EVAC-08',
    stationId: 'LG-N09',
    shelterId: 'SHELTER-06',
    name: 'Sohra Plateau Upper Escarpment Trail',
    distance_km: 1.6,
    est_walk_min: 22,
    gradient_pct: 5.4,
    safetyClearance: 'Elevated limestone plateau pathway away from steep canyon waterfall cliffs',
    coordinates: [
      [25.2702, 91.7323],
      [25.2720, 91.7350],
      [25.2750, 91.7380]
    ]
  },
  {
    id: 'EVAC-09',
    stationId: 'LG-N10',
    shelterId: 'SHELTER-07',
    name: 'Sela Pass East Ridge Evacuation Track',
    distance_km: 2.1,
    est_walk_min: 35,
    gradient_pct: 11.2,
    safetyClearance: 'Hardened military communication route ascending to sheltered ridge',
    coordinates: [
      [27.5861, 91.8654],
      [27.5890, 91.8680],
      [27.5920, 91.8710]
    ]
  },
  {
    id: 'EVAC-10',
    stationId: 'LG-N11',
    shelterId: 'SHELTER-08',
    name: 'Haflong Town Hill Crest Evacuation Avenue',
    distance_km: 2.4,
    est_walk_min: 30,
    gradient_pct: 6.8,
    safetyClearance: 'Paved district road running along stable sandstone watershed divider',
    coordinates: [
      [25.1789, 93.0245],
      [25.1820, 93.0270],
      [25.1850, 93.0290]
    ]
  },
  {
    id: 'EVAC-11',
    stationId: 'LG-N12',
    shelterId: 'SHELTER-09',
    name: 'Tupul Valley High Bank Escape Spur',
    distance_km: 1.9,
    est_walk_min: 28,
    gradient_pct: 9.5,
    safetyClearance: 'Stepped uphill earthen bund ascending safe above Ijei backwater channel',
    coordinates: [
      [24.8123, 93.6421],
      [24.8150, 93.6450],
      [24.8180, 93.6490]
    ]
  }
];

// ─── 6 Documented Historical Landslide Scars ────────────────────
const HISTORICAL_SCARS: HistoricalLandslideScar[] = [
  {
    id: 'SCAR-01',
    name: 'Wayanad Chooralmala Mega Debris Avalanche',
    location: 'Chooralmala & Mundakkai, Wayanad, Kerala',
    year: 2024,
    date: 'July 30, 2024',
    volume_m3: '8,600,000 m³',
    casualties: '400+ casualties, 2 townships destroyed',
    triggerRainfall: '572 mm cumulative in 48h (Cloudburst burst event)',
    mechanism: 'Liquefaction of porous lateritic overburden on smooth impermeable charnockite bedrock slip plane.',
    remediation: 'Multi-depth borehole piezometer network, subsurface drainage adits, and permanent early warning sirens.',
    polygon: [
      [11.5490, 76.1320],
      [11.5450, 76.1390],
      [11.5390, 76.1380],
      [11.5380, 76.1330],
      [11.5430, 76.1300]
    ]
  },
  {
    id: 'SCAR-02',
    name: 'Shimla Summer Hill Shiv Temple Slide',
    location: 'Summer Hill, Shimla, Himachal Pradesh',
    year: 2023,
    date: 'August 14, 2023',
    volume_m3: '35,000 m³',
    casualties: '20 casualties, World Heritage rail washed away',
    triggerRainfall: '154 mm in 24 hours atop 10-day saturated soil',
    mechanism: 'Overburden saturation of Jutogh quartz-mica schists triggering rotational retrogressive slip down Summer Hill ravine.',
    remediation: 'Micropile walls with tiebacks, stepped gabion check dams, and LoRa edge displacement sensors.',
    polygon: [
      [31.1070, 77.1680],
      [31.1060, 77.1720],
      [31.1010, 77.1700],
      [31.1020, 77.1650]
    ]
  },
  {
    id: 'SCAR-03',
    name: 'Joshimath Sunil Subsidence Graben',
    location: 'Sunil & Manohar Bagh, Chamoli, Uttarakhand',
    year: 2023,
    date: 'January 2023',
    volume_m3: 'Structural settlement affecting 860+ structures',
    casualties: 'Full civic evacuation of vulnerable wards',
    triggerRainfall: 'Antecedent aquifer breach & toe erosion by Alaknanda',
    mechanism: 'Reactivation of ancient landslide debris fan mass through toe scour and excessive building terrace load.',
    remediation: 'Strict construction moratorium, deep horizontal drainage, toe boulder rip-rap armor.',
    polygon: [
      [30.5620, 79.5620],
      [30.5580, 79.5740],
      [30.5500, 79.5710],
      [30.5530, 79.5590]
    ]
  },
  {
    id: 'SCAR-04',
    name: 'Munnar Pettimudi Debris Avalanche',
    location: 'Pettimudi, Idukki District, Kerala',
    year: 2020,
    date: 'August 6, 2020',
    volume_m3: '1,200,000 m³',
    casualties: '66 casualties in plantation quarters',
    triggerRainfall: '610 mm in 72 hours',
    mechanism: 'High-elevation crown detachment on Rajamala ridge channeling into a debris flow traveling 1.5 km.',
    remediation: 'Hazard zoning exclusion, catchment reforestation, acoustic emission landslide monitors.',
    polygon: [
      [10.0950, 77.0540],
      [10.0920, 77.0650],
      [10.0820, 77.0630],
      [10.0840, 77.0520]
    ]
  },
  {
    id: 'SCAR-05',
    name: 'Manipur Tupul Railway Yard Catastrophic Debris Flow',
    location: 'Tupul Station, Noney District, Manipur',
    year: 2022,
    date: 'June 30, 2022',
    volume_m3: '1,300,000 m³',
    casualties: '58 casualties including 107 Territorial Army personnel',
    triggerRainfall: '380 mm in 72 hours after 3 weeks continuous monsoon rain',
    mechanism: 'Basal rotational shearing in saturated disalkali shale formation causing sudden mountain flank collapse choking Ijei River.',
    remediation: 'Bio-engineering river embankment, concrete cribbing retaining walls, automatic soil-moisture acoustic tripwire.',
    polygon: [
      [24.8160, 93.6380],
      [24.8140, 93.6460],
      [24.8090, 93.6440],
      [24.8100, 93.6360]
    ]
  },
  {
    id: 'SCAR-06',
    name: 'Dima Hasao New Haflong Station Washout',
    location: 'New Haflong & Jatinga, Dima Hasao, Assam',
    year: 2022,
    date: 'May 16, 2022',
    volume_m3: '950,000 m³',
    casualties: 'Railway junction buried, entire district cut off for 60 days',
    triggerRainfall: '412 mm in 48 hours',
    mechanism: 'Massive regolith slope slumping along hill cutting depositing 15 feet of liquid mud across railway tracks.',
    remediation: 'Horizontal drain pipes, reinforced concrete soil nailing, satellite InSAR displacement monitoring.',
    polygon: [
      [25.1820, 93.0200],
      [25.1800, 93.0280],
      [25.1740, 93.0260],
      [25.1760, 93.0180]
    ]
  }
];

// ─── Web Audio Sonar Ping Synthesizer ──────────────────────────
const playSonarPing = (freq = 784, duration = 0.12) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio contexts require user interaction, ignore if blocked
  }
};

// ─── Camera Controller Helper ──────────────────────────────────
const MapCameraController: React.FC<{ target: { center: [number, number]; zoom: number } | null }> = ({ target }) => {
  const map = useMap();
  React.useEffect(() => {
    if (target) {
      map.flyTo(target.center, target.zoom, { duration: 1.3, easeLinearity: 0.25 });
    }
  }, [target, map]);
  return null;
};

// ─── 2D Bishop Geotechnical Subsurface Cross-Section Visualizer ───
const SlopeCrossSectionDiagram: React.FC<{ station: MapStation }> = ({ station }) => {
  if (!station) return null;
  const soilMoisture = station.soil_moisture_pct ?? 30;
  const waterHeightPct = Math.min(95, Math.max(15, soilMoisture));
  const fos = station.fos_estimate ?? 1.5;
  const isCritical = fos < 1.0;
  const isWarning = fos >= 1.0 && fos < 1.25;
  const arcColor = isCritical ? '#ef4444' : isWarning ? '#f97316' : '#10b981';
  const geologyText = (station.geology || 'Schist').split(' ')[0];

  return (
    <div className="space-y-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
          <Mountain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>2D Bishop Circular Slip Profile</span>
        </div>
        <span className={clsx(
          "px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border",
          isCritical 
            ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
            : isWarning
            ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
        )}>
          {isCritical ? "ACTIVE FAILURE ARC" : isWarning ? "SHEAR YIELD RISK" : "EQUILIBRIUM NOMINAL"}
        </span>
      </div>

      {/* SVG Cross-Section Canvas */}
      <div className="relative w-full h-44 rounded-xl bg-gradient-to-b from-sky-50 to-slate-100 dark:from-[#060b13] dark:to-[#0f172a] border border-slate-200 dark:border-white/10 overflow-hidden shadow-inner">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          <defs>
            {/* Soil texture pattern */}
            <pattern id="soilPattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.8" fill="#a16207" opacity="0.3" />
              <circle cx="7" cy="7" r="0.8" fill="#a16207" opacity="0.3" />
            </pattern>
            {/* Bedrock hatch */}
            <pattern id="rockHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#64748b" strokeWidth="1.2" opacity="0.35" />
            </pattern>
            {/* Water gradient */}
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* 1. Bedrock Basement (Base Layer) */}
          <path d="M 0 160 L 120 160 L 260 190 L 400 190 L 400 200 L 0 200 Z" fill="#334155" />
          <path d="M 0 160 L 120 160 L 260 190 L 400 190 L 400 200 L 0 200 Z" fill="url(#rockHatch)" />
          <text x="14" y="190" fill="#94a3b8" fontSize="9" fontWeight="700" fontFamily="sans-serif">BEDROCK BASEMENT ({geologyText})</text>

          {/* 2. Colluvial Overburden Soil Layer */}
          <path d="M 0 50 L 140 50 L 280 160 L 400 160 L 400 190 L 260 190 L 120 160 L 0 160 Z" fill="#b45309" fillOpacity="0.25" />
          <path d="M 0 50 L 140 50 L 280 160 L 400 160 L 400 190 L 260 190 L 120 160 L 0 160 Z" fill="url(#soilPattern)" />

          {/* 3. Phreatic Surface / Water Table (Dynamic with soil moisture) */}
          <path 
            d={`M 0 ${120 - (waterHeightPct * 0.55)} Q 140 ${110 - (waterHeightPct * 0.45)}, 280 ${170 - (waterHeightPct * 0.15)} L 400 ${170 - (waterHeightPct * 0.1)} L 400 190 L 0 190 Z`} 
            fill="url(#waterGrad)" 
          />
          <path 
            d={`M 0 ${120 - (waterHeightPct * 0.55)} Q 140 ${110 - (waterHeightPct * 0.45)}, 280 ${170 - (waterHeightPct * 0.15)} L 400 ${170 - (waterHeightPct * 0.1)}`} 
            stroke="#0284c7" 
            strokeWidth="1.5" 
            strokeDasharray="4, 3" 
            fill="none" 
          />
          <text x="290" y={155 - (waterHeightPct * 0.15)} fill="#0284c7" fontSize="8" fontWeight="800" fontFamily="sans-serif">
            Phreatic Table (u = {(waterHeightPct * 0.48).toFixed(1)} kPa)
          </text>

          {/* 4. Slope Surface Geometry Line */}
          <path d="M 0 50 L 140 50 L 280 160 L 400 160" stroke="#0f172a" strokeWidth="2.5" fill="none" className="dark:stroke-slate-200" />
          
          {/* 5. Bishop Limit Equilibrium Failure Slip Arc */}
          <path 
            d="M 120 50 Q 180 170, 300 160" 
            stroke={arcColor} 
            strokeWidth="3" 
            strokeDasharray={isCritical ? "4, 3" : undefined}
            fill="none" 
          />

          {/* 6. Shear Stress Vectors on Failure Arc */}
          <polygon points="210,135 220,130 216,139" fill={arcColor} />
          <text x="140" y="125" fill={arcColor} fontSize="9" fontWeight="900" fontFamily="sans-serif">
            Bishop Slip Arc (FoS {station.fos_estimate.toFixed(2)})
          </text>

          {/* 7. Installed Sensor Node Position & Inclinometer Anchor */}
          <line x1="210" y1="105" x2="210" y2="135" stroke="#2563eb" strokeWidth="2.5" />
          <circle cx="210" cy="105" r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="210" cy="105" r="9" fill="#2563eb" fillOpacity="0.25" className="animate-ping" />
          <text x="222" y="103" fill="#2563eb" fontSize="9" fontWeight="800" fontFamily="monospace">
            {station.id} (Tilt: {station.tilt_angle.toFixed(1)}°)
          </text>

          {/* Crest and Toe Annotations */}
          <text x="110" y="42" fill="#64748b" fontSize="8" fontWeight="700" fontFamily="sans-serif">Slope Crest</text>
          <text x="310" y="175" fill="#64748b" fontSize="8" fontWeight="700" fontFamily="sans-serif">Toe Resistance</text>
        </svg>

        {/* Dynamic Parameter Overlay Badge */}
        <div className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-[9.5px] font-mono shadow-xs">
          <div className="text-slate-500 dark:text-slate-400">c&apos;: <strong className="text-slate-800 dark:text-slate-200">{station.cohesion_kpa} kPa</strong> &middot; &phi;&apos;: <strong className="text-slate-800 dark:text-slate-200">{station.friction_deg}&deg;</strong></div>
          <div className="text-slate-500 dark:text-slate-400">Slope H: <strong className="text-slate-800 dark:text-slate-200">{station.slope_height_m} m</strong></div>
        </div>
      </div>

      {/* Geotechnical Formula Breakdown */}
      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10.5px] text-slate-600 dark:text-slate-300">
        <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-700">
          <span>Bishop Simplified Limit Equation</span>
          <span className={clsx("font-bold", isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-emerald-500")}>
            FoS = {station.fos_estimate.toFixed(2)}
          </span>
        </div>
        <p className="text-[10px] mt-1 text-slate-500 dark:text-slate-400">
          Calculates ratio of total resisting shear forces to destabilizing gravity moments along slice bases under transient pore water thrust.
        </p>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────
const RiskMapPage: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { state } = useMockTelemetry();
  
  const [selectedNodeId, setSelectedNodeId] = useState<string>('TW-N01');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  
  // Default to Street (OpenStreetMap) so all Indian location and city names are immediately visible!
  const [activeBaseLayer, setActiveBaseLayer] = useState<'street' | 'satellite' | 'topo'>('street');
  
  const { t, tx } = useI18n();
  // Layer visibility toggles - Location Names enabled by default!
  const [showLocationNames, setShowLocationNames] = useState<boolean>(true);
  const [showGeofences, setShowGeofences] = useState<boolean>(true);
  const [showShelters, setShowShelters] = useState<boolean>(true);
  const [showEvacRoutes, setShowEvacRoutes] = useState<boolean>(true);
  const [showHistoricalScars, setShowHistoricalScars] = useState<boolean>(true);
  const [showRoadStatus, setShowRoadStatus] = useState<boolean>(true);
  const [showCitizenReports, setShowCitizenReports] = useState<boolean>(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Live dynamic feeds from backend
  const [roadCorridors, setRoadCorridors] = useState<any[]>([]);
  const [citizenReports, setCitizenReports] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/ner/roads')
      .then((res) => res.json())
      .then((data) => setRoadCorridors(data.corridors || []))
      .catch((e) => console.warn('Failed to load roads:', e));

    fetch('/api/reports?limit=30')
      .then((res) => res.json())
      .then((data) => setCitizenReports(data.reports || []))
      .catch((e) => console.warn('Failed to load citizen reports:', e));
  }, []);

  // Filter & Audio states
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL_HIGH'>('ALL');
  const [targetCamera, setTargetCamera] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<'telemetry' | 'crossSection'>('telemetry');
  
  // Emergency Drill Trigger Feedback Toast
  const [drillSuccessToast, setDrillSuccessToast] = useState<string | null>(null);

  if (!state) {
    return <LoadingState message="Initializing geospatial GIS engine..." />;
  }

  // Merge live hardware telemetry into TW-N01 dynamically
  const stations: MapStation[] = useMemo(() => {
    return PAN_INDIA_STATIONS.map((st) => {
      if (st.id === 'TW-N01' && state) {
        return {
          ...st,
          risk_level: state.currentRisk.risk_level,
          risk_score: state.currentRisk.risk_score,
          fos_estimate: state.currentRisk.fos_estimate,
          soil_moisture_pct: state.currentReading.soil_moisture_pct,
          rainfall_24h_mm: state.currentReading.rainfall_24h_mm,
          tilt_angle: state.currentReading.tilt_angle,
          tilt_rate: state.currentReading.tilt_rate,
          rssi_dbm: state.currentReading.rssi_dbm,
          snr_db: state.currentReading.snr_db,
          battery_pct: state.currentReading.battery_pct,
          battery_mv: state.currentReading.battery_mv,
        };
      }
      return st;
    });
  }, [state]);

  // Filtered stations based on active region and severity
  const visibleStations = useMemo(() => {
    return stations.filter((st) => {
      const matchRegion = 
        selectedRegion === 'ALL' 
          ? true 
          : (selectedRegion === 'Northeast' || selectedRegion === 'NER')
            ? (st.region === 'Northeast' || ['Assam', 'Sikkim', 'Meghalaya', 'Arunachal Pradesh', 'Manipur', 'Nagaland', 'Mizoram'].includes(st.state))
            : st.region === selectedRegion;
      const matchSeverity = filterSeverity === 'ALL' || (st.risk_level === 'CRITICAL' || st.risk_level === 'HIGH');
      return matchRegion && matchSeverity;
    });
  }, [stations, selectedRegion, filterSeverity]);

  // Current active inspected station
  const activeStation = useMemo(() => {
    return stations.find((s) => s.id === selectedNodeId) || stations[0] || PAN_INDIA_STATIONS[0];
  }, [stations, selectedNodeId]);

  // Associated nearest shelter
  const activeShelter = useMemo(() => {
    return (activeStation && EMERGENCY_SHELTERS.find((sh) => sh.associatedNodeId === activeStation.id)) || EMERGENCY_SHELTERS[0];
  }, [activeStation]);

  // Associated evacuation route for active station
  const activeEvacRoute = useMemo(() => {
    return activeStation ? EVACUATION_ROUTES.find((r) => r.stationId === activeStation.id) : undefined;
  }, [activeStation]);

  // Station Marker Icon Generator
  const getStationMarkerIcon = (station: MapStation, isSelected: boolean) => {
    const color = RISK_COLORS[station?.risk_level] || '#10b981';
    const isPulsing = station?.risk_level === 'HIGH' || station?.risk_level === 'CRITICAL';
    const initials = (station?.id || 'LG-XX').replace('LG-', '');
    
    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; cursor: pointer;">
          ${isPulsing ? `<div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background-color: ${color}; opacity: 0.55; animation: radarPing 1.8s infinite;"></div>` : ''}
          <div style="
            width: 26px; 
            height: 26px; 
            background-color: ${color}; 
            border-radius: 50%; 
            border: ${isSelected ? '3px solid #38bdf8' : '2px solid #ffffff'};
            box-shadow: 0 0 ${isSelected ? '16px' : '8px'} ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 800;
            font-family: monospace;
            z-index: 10;
          ">${initials}</div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  };

  // Shelter Marker Icon Generator
  const getShelterMarkerIcon = () => {
    return L.divIcon({
      className: 'custom-shelter-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; cursor: pointer;">
          <div style="
            width: 24px; 
            height: 24px; 
            background-color: #059669; 
            border-radius: 8px; 
            border: 2px solid #ffffff;
            box-shadow: 0 0 12px rgba(5, 150, 105, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #ffffff;
            z-index: 8;
          ">🛡️</div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  // Citizen / Field Crowdsourced Incident Marker Generator
  const getCitizenReportMarkerIcon = (rep: any) => {
    const isCritical = rep.severity === 'CRITICAL';
    const isHigh = rep.severity === 'HIGH';
    const color = isCritical ? '#ef4444' : isHigh ? '#f59e0b' : '#2563eb';
    return L.divIcon({
      className: 'custom-citizen-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; cursor: pointer;">
          <div style="
            width: 26px; 
            height: 26px; 
            background-color: ${color}; 
            border-radius: 8px; 
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            color: #ffffff;
            z-index: 9;
          ">📸</div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  };

  const handleSelectStation = (st: MapStation) => {
    setSelectedNodeId(st.id);
    setTargetCamera({ center: [st.lat, st.lng], zoom: 14 });
    if (isAudioEnabled) {
      const freq = st.risk_level === 'CRITICAL' ? 988 : st.risk_level === 'HIGH' ? 880 : 659;
      playSonarPing(freq, 0.15);
    }
  };

  const handleResetToAllIndia = () => {
    setSelectedRegion('ALL');
    setTargetCamera({ center: [22.5, 82.0], zoom: 5 });
    if (isAudioEnabled) playSonarPing(523, 0.1);
  };

  const handleFocusNER = () => {
    setSelectedRegion('Northeast');
    setTargetCamera({ center: [26.1664, 91.7061], zoom: 7.5 });
    if (isAudioEnabled) playSonarPing(659, 0.15);
  };

  const handleTriggerEmergencyDrill = (st: MapStation) => {
    if (isAudioEnabled) playSonarPing(1174, 0.25);
    setDrillSuccessToast(`CAP Alert Drill Activated for ${st.name}! Cell broadcast simulated to authorities (${st.sector}) via Fast2SMS Quick Route.`);
    setTimeout(() => setDrillSuccessToast(null), 6000);
  };

  return (
    <div className={clsx(
      "space-y-3 font-sans transition-all duration-300",
      isFullScreen 
        ? "fixed inset-0 z-[9990] bg-[#080c14] p-4 flex flex-col h-screen" 
        : "flex flex-col h-[calc(100vh-8.5rem)]"
    )}>
      {/* ── Section Header (matches Metrics page format) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
            {t('MAP_TITLE')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300 font-normal mt-0.5">
            {t('MAP_SUB')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetToAllIndia}
            className={clsx(
              "px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5",
              selectedRegion === 'ALL'
                ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                : "bg-white dark:bg-[#0f172a] border-[#e5e9f2] dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-blue-600"
            )}
          >
            <span>🇮🇳 All India</span>
          </button>
          <button
            onClick={handleFocusNER}
            className={clsx(
              "px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5",
              selectedRegion === 'Northeast'
                ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                : "bg-white dark:bg-[#0f172a] border-[#e5e9f2] dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-blue-600"
            )}
          >
            <span>🏔️ Focus NER</span>
          </button>
        </div>
      </div>

      {/* ── IMD Monsoon Weather & Meteorological Warning Ticker ──── */}
      <div className="bg-blue-50/90 dark:bg-gradient-to-r dark:from-blue-900/40 dark:via-sky-900/30 dark:to-slate-900/40 border border-blue-200 dark:border-blue-500/20 rounded-2xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
          </span>
          <span className="font-bold text-blue-900 dark:text-blue-300 tracking-wide text-[11px] uppercase">
            IMD National Geospatial Warning Service
          </span>
          <span className="hidden md:inline text-blue-300 dark:text-slate-500">|</span>
          <span className="hidden md:inline text-slate-700 dark:text-slate-300 text-[11px]">
            Western Ghats Monsoon Surge Active &middot; Antecedent Rainfall Index (ARI-7): <strong className="text-blue-900 dark:text-white font-bold">86.4% Threshold</strong> &middot; Cloudburst Watch: Himachal &amp; Garhwal
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Audio Sonar Synthesizer Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsAudioEnabled(!isAudioEnabled);
              if (!isAudioEnabled) playSonarPing(880, 0.15);
            }}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all shadow-xs",
              isAudioEnabled 
                ? "bg-blue-600 text-white border-blue-500 shadow-sm" 
                : "bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
            title="Toggle Web Audio Telemetry Sonar Feedback"
          >
            {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
            <span>Sonar FX: {isAudioEnabled ? 'ON' : 'MUTED'}</span>
          </button>

          {/* Full Screen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-semibold transition-all shadow-xs"
            title="Toggle Fullscreen GIS Command Mode"
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />}
            <span className="hidden sm:inline">{isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* ── Top Header & Map Controls (Original Title & Layout) ─── */}
      <div className="card p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight uppercase">
                GEOSPATIAL SLOPE RISK MAP
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 text-[10px] font-mono font-bold">
                {visibleStations.length} Sectors Active
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Georeferenced monitoring stations, physical slope inclination sectors, and early warning boundaries.
            </p>
          </div>
        </div>

        {/* Basemap Switcher & Quick Navigation */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Basemap Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/90 p-1 border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setActiveBaseLayer('street')}
              className={clsx(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all",
                activeBaseLayer === 'street'
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              )}
              title="Standard Cartographic Map with Cities, Towns, Roads & State Names"
            >
              <span>🗺️ {t('CITIES_ROADS')}</span>
            </button>
            <button
              onClick={() => setActiveBaseLayer('satellite')}
              className={clsx(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all",
                activeBaseLayer === 'satellite'
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              )}
              title="High-Resolution Satellite Orthophoto with Place Name Overlay"
            >
              <span>🛰️ {t('SATELLITE')}</span>
            </button>
            <button
              onClick={() => setActiveBaseLayer('topo')}
              className={clsx(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all",
                activeBaseLayer === 'topo'
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              )}
              title="Topographic Relief & Mountain Elevation Contours"
            >
              <span>⛰️ {t('TOPO')}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetToAllIndia}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-all border border-slate-200 dark:border-slate-700"
            title="Reset map view to show all Indian landslide corridors"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{tx('Pan-India')}</span>
          </button>

          <button
            type="button"
            onClick={handleFocusNER}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold transition-all border border-purple-200 dark:border-purple-700"
            title="Focus on North Eastern Region corridors (Assam, Sikkim, Meghalaya, Arunachal, Manipur)"
          >
            <Navigation className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>{tx('NER Corridors')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectStation(stations[0])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold transition-all border border-blue-200 dark:border-blue-700"
            title="Jump to primary live hardware station"
          >
            <Crosshair className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t('LIVE_NODE')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-xs"
            title="Submit geo-tagged field incident report (cracks, rockfall, blocked road)"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
            <span>{t('REPORT_HAZARD')}</span>
          </button>
        </div>
      </div>

      {/* ── Interactive Station Selector Bar & Layer Toggles ────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-1 shrink-0">
        {/* Scrollable Node Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {stations.map((st) => {
            const isSelected = st.id === selectedNodeId;
            const color = RISK_COLORS[st.risk_level] || '#10b981';
            return (
              <button
                key={st.id}
                onClick={() => handleSelectStation(st)}
                className={clsx(
                  "shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                  isSelected
                    ? "bg-[#2563eb] text-white border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02]"
                    : "bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10"
                )}
              >
                <span 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: isSelected ? '#ffffff' : color }}
                />
                <span className="font-mono">{st.id}</span>
                <span className="truncate max-w-[120px] font-normal">{st.name}</span>
                {st.isLiveHardware && (
                  <span className={clsx("px-1 py-0.2 text-[8.5px] rounded font-mono font-bold uppercase", isSelected ? "bg-white/25 text-white" : "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300")}>
                    LIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Layer Checkboxes - with Location Names toggle */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto text-[11px] font-semibold text-slate-800 dark:text-slate-200">
          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 px-2.5 py-1 rounded-xl shadow-2xs">
            <input
              type="checkbox"
              checked={showLocationNames}
              onChange={(e) => setShowLocationNames(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>{tx('Location Names')}</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 px-2.5 py-1 rounded-xl shadow-2xs">
            <input
              type="checkbox"
              checked={showRoadStatus}
              onChange={(e) => setShowRoadStatus(e.target.checked)}
              className="rounded text-amber-600 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <Route className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>{tx('Road Status')} ({roadCorridors.length})</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 px-2.5 py-1 rounded-xl shadow-2xs">
            <input
              type="checkbox"
              checked={showCitizenReports}
              onChange={(e) => setShowCitizenReports(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <Camera className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>{tx('Field Reports')} ({citizenReports.length})</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 px-2.5 py-1 rounded-xl shadow-2xs">
            <input
              type="checkbox"
              checked={showGeofences}
              onChange={(e) => setShowGeofences(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span>{tx('Hazard Radii')}</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 px-2.5 py-1 rounded-xl shadow-2xs">
            <input
              type="checkbox"
              checked={showEvacRoutes}
              onChange={(e) => setShowEvacRoutes(e.target.checked)}
              className="rounded text-sky-600 focus:ring-0"
            />
            <span>{tx('Evac Routes')}</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 px-2.5 py-1 rounded-xl shadow-2xs">
            <input
              type="checkbox"
              checked={showShelters}
              onChange={(e) => setShowShelters(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-0"
            />
            <span>{tx('Shelters')}</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 px-2.5 py-1 rounded-xl shadow-2xs">
            <input
              type="checkbox"
              checked={showHistoricalScars}
              onChange={(e) => setShowHistoricalScars(e.target.checked)}
              className="rounded text-rose-600 focus:ring-0"
            />
            <span>{tx('Scars')}</span>
          </label>

          {/* Region Filter */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-white dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
          >
            <option value="ALL">All Sectors ({PAN_INDIA_STATIONS.length})</option>
            <option value="Northeast">North Eastern Region ({PAN_INDIA_STATIONS.filter(s => s.region === 'Northeast' || ['Assam', 'Sikkim', 'Meghalaya', 'Arunachal Pradesh', 'Manipur'].includes(s.state)).length})</option>
            <option value="Himalayas">Himalayas (HP &amp; WB)</option>
            <option value="Western Ghats">Western Ghats (Kerala)</option>
            <option value="Garhwal">Garhwal (Uttarakhand)</option>
            <option value="Railways">Railways (Konkan)</option>
          </select>
        </div>
      </div>

      {/* ── Emergency Drill Feedback Banner ─────────────────────── */}
      {drillSuccessToast && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{drillSuccessToast}</span>
          </div>
          <button onClick={() => setDrillSuccessToast(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Main Map + Inspector Split ──────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Map Viewport (3 cols) */}
        <div className="lg:col-span-3 relative rounded-2xl overflow-hidden border border-[#e5e9f2] dark:border-white/10 shadow-sm h-full flex flex-col bg-white dark:bg-[#080c14] isolate z-0">
          <MapContainer 
            center={[activeStation.lat, activeStation.lng]} 
            zoom={13} 
            scrollWheelZoom={true} 
            zoomControl={false}
            className={clsx(
              "h-full w-full",
              activeBaseLayer === 'satellite' ? "satellite-tiles" : activeBaseLayer === 'topo' ? "topo-tiles" : ""
            )}
            style={{ height: '100%', width: '100%' }}
          >
            {/* Dynamic Camera Glide */}
            <MapCameraController target={targetCamera} />

            {/* Bottom-left zoom controls styled for dark mode */}
            <ZoomControl position="bottomleft" />

            {/* Dynamic Basemap Layer - Standardized 100% English Language Worldwide */}
            {activeBaseLayer === 'street' && (
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
              />
            )}

            {activeBaseLayer === 'satellite' && (
              <>
                <TileLayer
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                {/* 100% English Boundary & Place Name Reference Labels */}
                <TileLayer
                  attribution='Labels &copy; Esri &mdash; English Place Names &amp; Boundaries'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                />
              </>
            )}

            {activeBaseLayer === 'topo' && (
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, METI, NRCAN'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              />
            )}

            {/* ── 1. Documented Historical Landslide Scars ───────── */}
            {showHistoricalScars && HISTORICAL_SCARS.map((scar) => (
              <Polygon
                key={scar.id}
                positions={scar.polygon}
                pathOptions={{
                  color: '#f43f5e',
                  fillColor: '#f43f5e',
                  fillOpacity: 0.28,
                  weight: 2,
                  dashArray: '5, 5',
                }}
              >
                <Popup>
                  <div className="p-1.5 text-slate-900 dark:text-slate-100 font-sans min-w-[240px] text-xs">
                    <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-900 pb-1 mb-1 text-rose-600 dark:text-rose-400 font-bold">
                      <span>🌋 Historical Disaster Scar</span>
                      <span className="font-mono text-[10px]">{scar.year}</span>
                    </div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{scar.name}</div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5">{scar.location} &middot; {scar.date}</div>

                    <div className="grid grid-cols-2 gap-1.5 mt-2 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl text-[10px]">
                      <div><strong>Volume:</strong> {scar.volume_m3}</div>
                      <div><strong>Impact:</strong> {scar.casualties}</div>
                      <div className="col-span-2"><strong>Precipitation:</strong> {scar.triggerRainfall}</div>
                    </div>

                    <p className="mt-2 text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                      <strong>Root Mechanism:</strong> {scar.mechanism}
                    </p>
                  </div>
                </Popup>
              </Polygon>
            ))}

            {/* ── 2. Hazard Geofence Perimeters (Translucent Rings) ── */}
            {showGeofences && visibleStations.map((st) => {
              const color = RISK_COLORS[st.risk_level] || '#10b981';
              const isSelected = st.id === selectedNodeId;
              return (
                <Circle
                  key={`geofence-${st.id}`}
                  center={[st.lat, st.lng]}
                  radius={st.hazardRadius_m}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: isSelected ? 0.24 : 0.12,
                    weight: isSelected ? 2.5 : 1.5,
                    dashArray: st.risk_level === 'CRITICAL' ? '4, 4' : undefined,
                  }}
                >
                  <Popup>
                    <div className="p-1 text-slate-900 dark:text-slate-100 font-sans text-xs min-w-[200px]">
                      <div className="font-bold flex justify-between items-center border-b pb-1 mb-1">
                        <span>Hazard Geofence Perimeter</span>
                        <span className="font-mono text-blue-600 font-bold">{st.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        Impact Buffer Radius: <strong>{st.hazardRadius_m} meters</strong>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Status: <strong className={RISK_TEXT_CLASSES[st.risk_level]}>{st.risk_level} SEVERITY ZONE</strong>
                      </div>
                    </div>
                  </Popup>
                </Circle>
              );
            })}

            {/* ── 3. Evacuation Corridors (Animated Vector Polylines) ── */}
            {showEvacRoutes && EVACUATION_ROUTES.map((route) => {
              const isSelected = route.stationId === selectedNodeId;
              return (
                <Polyline
                  key={route.id}
                  positions={route.coordinates}
                  pathOptions={{
                    color: isSelected ? '#38bdf8' : '#059669',
                    weight: isSelected ? 4 : 2.5,
                    opacity: isSelected ? 1 : 0.65,
                    dashArray: '8, 8',
                    className: isSelected ? 'evac-corridor-animated' : undefined,
                  }}
                >
                  <Popup>
                    <div className="p-1 text-slate-900 dark:text-slate-100 font-sans min-w-[230px] text-xs">
                      <div className="flex items-center justify-between border-b pb-1 mb-1 font-bold text-sky-600 dark:text-sky-400">
                        <span>🛡️ Evacuation Pathway</span>
                        <span className="font-mono text-[10px]">{route.id}</span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">{route.name}</div>
                      <div className="grid grid-cols-2 gap-1 my-1.5 bg-sky-50 dark:bg-sky-950/40 p-1.5 rounded-lg text-[10.5px]">
                        <div>Distance: <strong>{route.distance_km} km</strong></div>
                        <div>Walk Time: <strong>~{route.est_walk_min} min</strong></div>
                      </div>
                      <p className="text-[10px] text-slate-500">{route.safetyClearance}</p>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

            {/* ── 4. Monitoring Station Markers with Location Tooltips ── */}
            {visibleStations.map((st) => {
              const isSelected = st.id === selectedNodeId;
              return (
                <Marker 
                  key={st.id} 
                  position={[st.lat, st.lng]} 
                  icon={getStationMarkerIcon(st, isSelected)}
                  eventHandlers={{
                    click: () => handleSelectStation(st),
                  }}
                >
                  {/* Permanent / Dynamic Location Name Badge */}
                  {showLocationNames && (
                    <Tooltip 
                      permanent 
                      direction="bottom" 
                      offset={[0, 14]} 
                      className="station-location-label"
                    >
                      <span>📍 {st.name} ({st.state})</span>
                    </Tooltip>
                  )}

                  {/* Clean Original Popup Format from media screenshot */}
                  <Popup>
                    <div className="p-1 text-slate-900 dark:text-slate-100 font-sans min-w-[220px]">
                      <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-1 mb-1.5">
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">{st.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{st.sector}</div>
                        </div>
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-xs ml-2 shrink-0">{st.id}</span>
                      </div>

                      <div className="space-y-1 text-xs font-mono my-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400 font-sans">Risk Level:</span>
                          <span className={clsx("font-bold", RISK_TEXT_CLASSES[st.risk_level])}>{st.risk_level}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400 font-sans">Hazard Score:</span>
                          <strong className="text-slate-900 dark:text-slate-100">{(st.risk_score * 100).toFixed(0)}%</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400 font-sans">FoS Ratio:</span>
                          <strong className="text-slate-900 dark:text-slate-100">{st.fos_estimate.toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400 font-sans">Soil Moisture:</span>
                          <strong className="text-blue-600 dark:text-blue-400">{st.soil_moisture_pct.toFixed(1)}%</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400 font-sans">Precipitation:</span>
                          <strong className="text-blue-600 dark:text-blue-400">{st.rainfall_24h_mm.toFixed(1)} mm</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectStation(st)}
                        className="w-full mt-1.5 py-1 rounded-lg bg-[#2563eb] text-white font-sans text-[11px] font-bold shadow-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-1"
                      >
                        <span>Select &amp; Inspect Station</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* ── 5. Emergency Safe Shelters with Location Tooltips ── */}
            {showShelters && EMERGENCY_SHELTERS.map((sh) => (
              <Marker
                key={sh.id}
                position={[sh.lat, sh.lng]}
                icon={getShelterMarkerIcon()}
              >
                {showLocationNames && (
                  <Tooltip 
                    permanent 
                    direction="bottom" 
                    offset={[0, 14]} 
                    className="station-location-label"
                  >
                    <span>🛡️ {sh.name.split(' ')[0]} Safe Hub</span>
                  </Tooltip>
                )}
                <Popup>
                  <div className="p-1 text-slate-900 dark:text-slate-100 font-sans min-w-[210px] text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold border-b border-slate-200 dark:border-slate-700 pb-1 mb-1">
                      <span>🛡️ Safe Evacuation Point</span>
                      <span className="text-[10px] font-mono text-slate-500">({sh.id})</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white mb-0.5">{sh.name}</div>
                    <div className="text-[10.5px] text-slate-600 dark:text-slate-300 mb-1.5">{sh.sector}</div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[10.5px] space-y-0.5">
                      <div>Capacity: <strong className="text-emerald-800 dark:text-emerald-300 font-mono">{sh.capacity} Persons</strong></div>
                      <div>Type: <strong>{sh.type}</strong></div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Facilities: {sh.facilities}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* ── 6. Vulnerable Road Corridors (Vector Polyline Network) ── */}
            {showRoadStatus && roadCorridors.map((c, idx) => {
              const positions = c.path || c.coordinates;
              if (!positions || !Array.isArray(positions) || positions.length === 0) return null;
              const isBlocked = c.status === 'BLOCKED';
              const isRestricted = c.status === 'RESTRICTED';
              const color = isBlocked ? '#ef4444' : isRestricted ? '#f59e0b' : '#10b981';
              const corridorCode = c.corridor || c.code || `Corridor-${idx + 1}`;
              const key = c.corridor || c.id || `corridor-${idx}`;
              const blockageReason = c.hazardCause || c.blockage_reason;
              const clearingEta = c.clearanceEstHours ? `~${c.clearanceEstHours}h` : c.clearing_eta;
              const detourRoute = c.alternateRoute || c.detour_route;
              const stretch = c.impactedSection || c.stretch;

              return (
                <Polyline
                  key={key}
                  positions={positions}
                  pathOptions={{
                    color: color,
                    weight: isBlocked ? 6 : 4,
                    opacity: 0.88,
                    dashArray: isBlocked ? '6, 6' : undefined,
                  }}
                >
                  {showLocationNames && (
                    <Tooltip permanent direction="top" className="station-location-label">
                      <span>{corridorCode}: {c.status}</span>
                    </Tooltip>
                  )}
                  <Popup>
                    <div className="p-1.5 text-slate-900 dark:text-slate-100 font-sans min-w-[240px] text-xs">
                      <div className="flex items-center justify-between border-b pb-1 mb-1 font-bold">
                        <span className="font-mono text-sm font-extrabold" style={{ color }}>{corridorCode}</span>
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          isBlocked ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300" :
                          isRestricted ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" :
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                        )}>
                          {c.status}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{c.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{c.state}{stretch ? ` · ${stretch}` : ''}</div>

                      {blockageReason && (
                        <div className="mt-2 p-1.5 bg-red-50 dark:bg-red-950/40 rounded-lg text-red-700 dark:text-red-300 text-[10.5px]">
                          <strong>Blockage Cause:</strong> {blockageReason}
                          {clearingEta && <div className="text-[10px] text-red-500 mt-0.5 font-medium">ETA: {clearingEta}</div>}
                        </div>
                      )}

                      {detourRoute && (
                        <div className="mt-1.5 p-1.5 bg-sky-50 dark:bg-sky-950/40 rounded-lg text-sky-800 dark:text-sky-300 text-[10.5px]">
                          <strong>Alternate Detour:</strong> {detourRoute}
                        </div>
                      )}

                      {(c.critical_infrastructure || c.responsibleAuthority) && (
                        <div className="mt-2 text-[10px] text-slate-500 border-t pt-1">
                          <strong>Authority:</strong> {c.responsibleAuthority || c.critical_infrastructure}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

            {/* ── 7. Citizen & Field Official Crowdsourced Incident Reports ── */}
            {showCitizenReports && citizenReports.map((rep, idx) => {
              if (!rep || typeof rep.latitude !== 'number' || typeof rep.longitude !== 'number') return null;
              const categoryStr = (rep.category || rep.hazard_category || 'GROUND_CRACKS').replace('_', ' ');
              const isVerified = Boolean(rep.is_verified || rep.verified);
              const reporterRole = (rep.reporter_type || rep.reporter_role || 'CITIZEN').replace('_', ' ');
              const key = rep.report_id || rep.id || `report-${idx}`;

              return (
                <Marker
                  key={key}
                  position={[rep.latitude, rep.longitude]}
                  icon={getCitizenReportMarkerIcon(rep)}
                >
                  {showLocationNames && (
                    <Tooltip permanent direction="top" className="station-location-label">
                      <span>📸 {rep.location_name}</span>
                    </Tooltip>
                  )}
                  <Popup>
                    <div className="p-1.5 text-slate-900 dark:text-slate-100 font-sans min-w-[230px] max-w-[280px] text-xs">
                      <div className="flex items-center justify-between border-b pb-1 mb-1 font-bold">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                          {categoryStr}
                        </span>
                        <span className={clsx(
                          "text-[9.5px] px-1.5 py-0.5 rounded font-bold uppercase",
                          isVerified ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                        )}>
                          {isVerified ? "✓ Verified" : "Pending Verification"}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 dark:text-white text-xs mt-1">
                        {rep.location_name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {rep.district}, {rep.state}
                        {rep.highway_corridor && <span className="ml-1 font-mono font-bold text-blue-600">({rep.highway_corridor})</span>}
                      </div>

                      {rep.photo_url && (
                        <div className="mt-1.5 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 max-h-32">
                          <img 
                            src={rep.photo_url} 
                            alt={rep.location_name}
                            className="w-full h-28 object-cover" 
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        </div>
                      )}

                      <p className="mt-1.5 text-[10.5px] text-slate-700 dark:text-slate-300 leading-tight">
                        {rep.description}
                      </p>

                      <div className="mt-2 pt-1 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[9.5px] text-slate-500 dark:text-slate-400">
                        <span>By: <strong>{rep.reporter_name || 'Anonymous'}</strong> ({reporterRole})</span>
                        <span className={clsx(
                          "font-bold uppercase",
                          rep.severity === 'CRITICAL' ? 'text-red-500' : rep.severity === 'HIGH' ? 'text-amber-500' : 'text-blue-500'
                        )}>
                          {rep.severity}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map Floating Coordinates Tag (Original Beloved Format) */}
          <div className="absolute top-4 left-4 z-[1000] bg-white/95 dark:bg-[#0f172a]/95 border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 shadow-md text-xs text-slate-800 dark:text-slate-200 font-sans">
            <div>Coordinates: <strong className="text-blue-700 dark:text-blue-400 font-mono">{activeStation.lat.toFixed(6)}° N, {activeStation.lng.toFixed(6)}° E</strong></div>
            <div className="text-slate-700 dark:text-slate-300 text-[11px] mt-0.5 font-medium">Elevation: <strong className="text-slate-900 dark:text-slate-100">{activeStation.altitude_m}m ASL</strong> · {activeStation.sector}</div>
          </div>

          {/* Map Floating Legend (Original Beloved Format) */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xs border border-slate-300 dark:border-white/10 rounded-xl p-3 shadow-lg font-sans text-xs">
            <h4 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
              Hazard Tier Legend
            </h4>
            <div className="space-y-1 text-[11px] font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-slate-800 dark:text-slate-200">LOW (0.00 – 0.25)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <span className="text-slate-800 dark:text-slate-200">MODERATE (0.25 – 0.50)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                <span className="text-slate-800 dark:text-slate-200">HIGH (0.50 – 0.75)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <span className="text-slate-800 dark:text-slate-200">CRITICAL (0.75 – 1.00)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Node Inspector Side Panel (Original Beloved Layout) ─── */}
        <div className="card flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="card-header flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Station Inspector
              </span>
              <span className={clsx(
                "badge text-[10px]",
                activeStation.isLiveHardware ? "badge-elite" : "badge-blue"
              )}>
                {activeStation.isLiveHardware ? "Active" : "Active Node"}
              </span>
            </div>

            {/* Inspector Navigation Tabs: Telemetry vs 2D Subsurface Physics */}
            <div className="grid grid-cols-2 border-b border-slate-100 dark:border-white/10 text-xs font-semibold">
              <button
                onClick={() => setInspectorTab('telemetry')}
                className={clsx(
                  "py-2 px-3 border-b-2 transition-all flex items-center justify-center gap-1",
                  inspectorTab === 'telemetry'
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                <Radio className="w-3 h-3" />
                <span>Sensor Channels</span>
              </button>
              <button
                onClick={() => setInspectorTab('crossSection')}
                className={clsx(
                  "py-2 px-3 border-b-2 transition-all flex items-center justify-center gap-1",
                  inspectorTab === 'crossSection'
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                <Mountain className="w-3 h-3" />
                <span>2D Slip Physics</span>
              </button>
            </div>
            
            <div className="card-body p-4 space-y-4 text-xs">
              {/* Selected Node Identity (Original Beloved Format) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/10">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Monitoring Station</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{activeStation.name}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-bold font-mono mt-0.5">{activeStation.id}</div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-sans mt-1">{activeStation.sector}</div>
              </div>

              {/* TAB 1: Live Telemetry Channels */}
              {inspectorTab === 'telemetry' ? (
                <>
                  {/* Live Hazard Score (Original Beloved Format) */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-white/10">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                      <span>Stability Rating</span>
                      <span className={clsx("font-bold", RISK_TEXT_CLASSES[activeStation.risk_level])}>
                        {activeStation.risk_level}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1 font-mono">
                      <span className={clsx("text-2xl font-extrabold", RISK_TEXT_CLASSES[activeStation.risk_level])}>
                        {(activeStation.risk_score * 100).toFixed(0)}%
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-sans">
                        FoS: <strong className="text-slate-800 dark:text-slate-200 font-mono">{activeStation.fos_estimate.toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Physical Sensor Readouts (Original Beloved Format) */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                    <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                      Live Sensor Channels
                    </div>
                    
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-white/10">
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                        <Droplets className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Soil Moisture:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{activeStation.soil_moisture_pct.toFixed(1)}%</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-white/10">
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                        <CloudRain className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> 24h Rain:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{activeStation.rainfall_24h_mm.toFixed(1)} mm</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-white/10">
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                        <Mountain className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Slope Angle:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{formatDegrees(activeStation.tilt_angle)}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-white/10">
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                        <Activity className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" /> Creep Rate:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{activeStation.tilt_rate.toFixed(3)} °/m</span>
                    </div>
                  </div>

                  {/* Radio & Power (Original Beloved Format) */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/10 text-[11px]">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500 dark:text-slate-400 font-sans">LoRa Link RSSI:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{formatRSSI(activeStation.rssi_dbm)}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500 dark:text-slate-400 font-sans">Battery Level:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{activeStation.battery_pct}% ({formatBattery(activeStation.battery_mv)})</span>
                    </div>
                  </div>
                </>
              ) : (
                /* TAB 2: 2D Bishop Subsurface Cross-Section Diagram */
                <SlopeCrossSectionDiagram station={activeStation} />
              )}

              {/* Designated Safe Shelter & Route Info */}
              <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-[10.5px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide text-[9.5px]">{tx('Designated Safe Shelter')}</span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold">{activeShelter.capacity} Cap</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-xs">{activeShelter.name}</div>
                {activeEvacRoute && (
                  <div className="text-sky-700 dark:text-sky-300 font-medium text-[10px] mt-1 flex items-center gap-1">
                    <Route className="w-3 h-3 text-sky-500" />
                    <span>Route: {activeEvacRoute.distance_km} km &middot; ~{activeEvacRoute.est_walk_min} min walk</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setTargetCamera({ center: [activeShelter.lat, activeShelter.lng], zoom: 15 })}
                  className="mt-2 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all flex items-center justify-center gap-1 shadow-2xs"
                >
                  <Navigation className="w-3 h-3" />
                  <span>{tx('Fly to Shelter Coordinates')}</span>
                </button>
              </div>

              {/* Emergency Alert Drill Simulation Button */}
              <button
                type="button"
                onClick={() => handleTriggerEmergencyDrill(activeStation)}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-500/20"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{tx('Simulate Emergency SMS Drill')}</span>
              </button>
            </div>
          </div>

          {/* Side Panel Footer (Original Beloved Format) */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-white/10 text-[10px] text-slate-500 dark:text-slate-400 flex justify-between font-sans">
            <span>Last seen: {formatTimeShort(state.currentReading.timestamp)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Synced</span>
          </div>
        </div>
      </div>

      {/* Citizen & Field Hazard Incident Reporting Modal */}
      {isReportModalOpen && (
        <ReportIncidentModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onReportSubmitted={() => {
            fetch('/api/reports?limit=30')
              .then((res) => res.json())
              .then((data) => setCitizenReports(data.reports || []))
              .catch((e) => console.warn('Failed to refresh reports:', e));
            setIsReportModalOpen(false);
          }}
          defaultCoords={[activeStation.lat, activeStation.lng]}
        />
      )}
    </div>
  );
};

export default RiskMapPage;
