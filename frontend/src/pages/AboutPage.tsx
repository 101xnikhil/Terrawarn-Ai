import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, HeartPulse, Microscope, Cpu, ShieldCheck, 
  ExternalLink, Github, Linkedin, Mail, Edit3, Trash2, Plus, 
  Check, X, Sparkles, Award, Layers, Terminal, Activity, Waves,
  Radio, Gauge, ShieldAlert, Wifi, Zap, CheckCircle2, ArrowRight, BookOpen,
  AlertTriangle, Binary, Database, Clock, Lock, Server, Bell,
  DollarSign, TrendingUp, Compass, ChevronRight, FileText,
  Camera, Upload, Image as ImageIcon
} from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../i18n/LanguageContext';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  specialization: string;
  bio: string;
  photo?: string;
  github?: string;
  linkedin?: string;
  email?: string;
  avatarColor: string;
}

const DEFAULT_MEMBERS: TeamMember[] = [
  {
    id: 'mem-1',
    name: 'Aman Nasim Khan',
    role: 'Team Lead & IoT Systems Architect',
    specialization: 'IoT Firmware, LoRa Protocols, Sensor Transducers & Hardware Integration',
    bio: 'Specializes in edge computing, embedded sensor networks, low-power telemetry protocols, and real-time geotechnical instrumentation systems.',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    email: 'amannasim@example.com',
    avatarColor: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'mem-2',
    name: 'Divyshreshth Vishwakarma',
    role: 'Full Stack & Machine Learning Lead',
    specialization: 'XGBoost Ensembles, Physics-Informed ML, SHAP Explainability & Time-Series Analytics',
    bio: 'Focused on developing gray-box hybrid models coupling limit equilibrium geotechnical mechanics with gradient boosted decision trees for real-time hazard forecasting.',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    email: 'divyshreshth@example.com',
    avatarColor: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'mem-3',
    name: 'Team Member 3',
    role: 'Full-Stack Systems & Cloud Architect',
    specialization: 'FastAPI Backend, SQLite WAL Ingestion, Real-Time WebSockets & React Control Room',
    bio: 'Designs high-concurrency offline-first edge software architectures, telemetry visualization dashboards, and mission control user interfaces.',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    email: 'member3@example.com',
    avatarColor: 'from-purple-600 to-indigo-600',
  },
  {
    id: 'mem-4',
    name: 'Team Member 4',
    role: 'Research Analyst & Geotechnical Specialist',
    specialization: 'Soil Mechanics, Slope Stability Verification & Sensor Calibration',
    bio: 'Directs physical laboratory simulation modeling, Bishop/Fellenius mathematical safety validation, and emergency response workflows.',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    email: 'member4@example.com',
    avatarColor: 'from-amber-600 to-orange-600',
  },
];

const PREVIOUS_PROJECTS = [
  {
    id: 'proj-ecg',
    title: 'IoT-Enabled Real-Time ECG Monitoring & Arrhythmia Detection System',
    category: 'Biomedical Telemetry & Electrophysiology Signal Processing',
    icon: HeartPulse,
    color: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800',
    tag: 'BIOMEDICAL EMBEDDED',
    summary: 'A portable, low-power telemetry device for continuous multi-lead cardiac electrophysiology monitoring with automated edge arrhythmia classification.',
    highlights: [
      'Engineered analog front-end with AD8232 biopotential transducer & driven-right-leg (DRL) circuit for 50Hz/60Hz powerline noise suppression.',
      'Implemented Pan-Tompkins real-time QRS complex detection and Wavelet Transform (DWT) baseline wander removal directly on ESP32 microcontrollers.',
      'Built a high-precision live cardiac waveform streaming dashboard with automated tachycardia, bradycardia, and PVC event alerts.',
      'Bluetooth Low Energy (BLE) and Wi-Fi dual-link telemetry with offline local buffering during emergency transport.',
    ],
  },
  {
    id: 'proj-microplastics',
    title: 'AI & Optical Microplastics Detection & Spectroscopic Classification System',
    category: 'Environmental AI & Microscopic Computer Vision',
    icon: Microscope,
    color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    tag: 'COMPUTER VISION & SPECTROSCOPY',
    summary: 'An automated microscopic imaging and fluorescence spectroscopy platform for identifying, sizing, and classifying synthetic microplastic polymers in aquatic samples.',
    highlights: [
      'Built a low-cost automated darkfield microscopic imaging rig using Raspberry Pi HQ Camera and Nile Red fluorescent stain excitation.',
      'Trained a custom YOLOv8 + EfficientNet convolutional neural network to detect particles down to 10 micrometers with 96.2% precision.',
      'Automated polymer morphological profiling (fibers, fragments, beads, films) with instant density per liter computation.',
      'Created an environmental GIS map displaying regional waterway contamination heatmaps for pollution remediation teams.',
    ],
  },
];

const ARCHITECTURE_PILLARS = [
  {
    title: 'Ultra-Low Cost Bill of Materials',
    value: '< $18 USD',
    desc: 'BOM based on mass-market ESP32, capacitive moisture V2, FC-37, and MPU6050, 95% cheaper than commercial geotechnical stations ($3,000+).',
    icon: Zap,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50',
  },
  {
    title: '100% Offline Edge Autonomy',
    value: 'Zero Cloud',
    desc: 'Local SQLite WAL database, FastAPI server, and XGBoost AI model operate continuously during complete cloud/grid power blackouts.',
    icon: ShieldCheck,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50',
  },
  {
    title: 'Gray-Box Hybrid Intelligence',
    value: 'Physics + ML',
    desc: 'Couples infinite slope Bishop Limit Equilibrium safety factor (FoS) calculations with XGBoost SHAP TreeExplainer feature attributions.',
    icon: Activity,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50',
  },
  {
    title: 'Multi-Channel Public Warning',
    value: '< 1.2s Latency',
    desc: 'Zero-pairing 2.4GHz BLE emergency beacons, Common Alerting Protocol (CAP) SMS cell broadcast, and LoRa long-range mesh dispatch.',
    icon: Radio,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800/50',
  },
];

const SYSTEM_METRICS = [
  {
    label: 'Hardware BOM Per Node',
    value: '$17.60',
    unit: 'USD (~₹1,450)',
    subtext: '95% reduction vs $3,000+ borehole inclinometers',
    icon: DollarSign,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'Edge Autonomy Guarantee',
    value: '100%',
    unit: 'Offline-First',
    subtext: 'Zero reliance on cellular towers or cloud backhaul',
    icon: ShieldCheck,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
  },
  {
    label: 'Public Warning Latency',
    value: '< 1.2s',
    unit: 'Mesh to Alert',
    subtext: 'Direct 2.4GHz BLE beacons + local siren dispatch',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  },
  {
    label: 'Gray-Box Safety Invariant',
    value: 'FoS < 1.0',
    unit: 'Deterministic Override',
    subtext: 'Physics rule overrides ML to eliminate false negatives',
    icon: Activity,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
  },
];

const TELEMETRY_PIPELINE = [
  {
    step: '01',
    title: 'Multi-Parametric Transducer Array',
    tag: 'Edge Sensor Array',
    badge: '10s Duty Cycle',
    icon: Cpu,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40',
    desc: 'Capacitive V2.0 probe measures volumetric soil water content (VWC %), tipping FC-37 monitors rainfall onset and rate, and MPU6050 6-axis IMU detects subterranean shear slip & slope dip angle.',
    points: [
      'Corrosion-resistant capacitive moisture V2.0',
      'Continuous precipitation tipping gauge (FC-37)',
      'Sub-millimeter 3D tilt & creep rate kinematics (MPU6050)',
    ],
  },
  {
    step: '02',
    title: 'Resilient 433MHz LoRa Mesh Network',
    tag: 'Telemetry Transport',
    badge: '5 km Line-of-Sight',
    icon: Radio,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40',
    desc: 'Transmits tightly packed 32-byte C binary telemetry frames across mountainous terrain without cellular networks. Stop-and-wait ACK and CCITT-16 CRC ensure zero corrupted packets.',
    points: [
      '32-byte packed binary struct serialization',
      'Monotonic sequence watermarking (anti-replay guard)',
      'Ultra-low power RF transmission (+20 dBm boost)',
    ],
  },
  {
    step: '03',
    title: 'Gray-Box Physics + XGBoost Engine',
    tag: 'Edge Intelligence',
    badge: 'Zero-Cloud Inference',
    icon: Layers,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40',
    desc: 'Continuously solves infinite slope Bishop limit equilibrium mechanics for Factor of Safety (FoS). Coupled with an XGBoost decision forest featuring SHAP explainability for causality analysis.',
    points: [
      'Real-time Bishop limit equilibrium FoS calculation',
      'Gradient boosted decision trees trained on terrain dynamics',
      'TreeSHAP feature attributions for regulatory transparency',
    ],
  },
  {
    step: '04',
    title: 'Multi-Tier Autonomous Alerting',
    tag: 'Public Defense',
    badge: '< 1.2s Dispatch',
    icon: Bell,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/40',
    desc: 'Autonomous emergency dispatch without cloud reliance: broadcasts zero-pairing 2.4GHz BLE beacons directly to nearby rail maintenance crews, triggers audible sirens, and dispatches CAP-standard SMS.',
    points: [
      'Zero-pairing 2.4GHz BLE emergency beacons',
      'Common Alerting Protocol (CAP) SMS cell broadcast',
      'Solar-backed 110dB audio-visual field sirens',
    ],
  },
];

const HARDWARE_BOM = [
  {
    component: 'ESP32-WROOM-32D Edge MCU',
    spec: 'Dual-Core 240MHz, 520KB SRAM, Deep-Sleep Low Power',
    role: 'Sensor ADC acquisition, packet framing, LoRa orchestration',
    cost: '$3.20',
  },
  {
    component: 'Capacitive Soil Moisture Probe V2.0',
    spec: 'Analog voltage (corrosion-proof PCB trace, 0–100% VWC)',
    role: 'Monitors soil pore-water saturation and subterranean wetting front',
    cost: '$1.10',
  },
  {
    component: 'FC-37 Precipitation Rain Gauge',
    spec: 'Gold/nickel substrate with LM393 dual comparator',
    role: 'Monitors surface precipitation onset and rainfall intensity',
    cost: '$0.80',
  },
  {
    component: 'MPU6050 6-Axis Motion Transducer',
    spec: 'Digital Motion Processor (DMP), ±2g-16g / ±250-2000°/s',
    role: 'Detects micro-seismic slope creep, dip angle & shear strain velocity',
    cost: '$1.40',
  },
  {
    component: 'SX1278 433MHz LoRa Transceiver',
    spec: '+20 dBm RF output, -148 dBm sensitivity, SPI interface',
    role: 'Long-range mesh wireless telemetry transmission without cellular',
    cost: '$2.50',
  },
  {
    component: 'LiFePO4 3.2V 3200mAh + 6V Solar Unit',
    spec: 'TP5000 solar charging circuit, 2,000+ thermal cycle life',
    role: 'Ensures continuous autonomous field power during prolonged monsoons',
    cost: '$4.80',
  },
  {
    component: 'IP67 Ruggedized Weatherproof Enclosure',
    spec: 'UV-stabilized polycarbonate shell with IP68 seal glands',
    role: 'Protects internal electronics from rockfall, moisture, and dust',
    cost: '$3.80',
  },
];

export default function AboutPage() {
  const { tx } = useI18n();
  const [members, setMembers] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('landguard_team_members');
      return saved ? JSON.parse(saved) : DEFAULT_MEMBERS;
    } catch {
      return DEFAULT_MEMBERS;
    }
  });

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formSpec, setFormSpec] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formGithub, setFormGithub] = useState('');
  const [formLinkedin, setFormLinkedin] = useState('');
  const [formEmail, setFormEmail] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('landguard_team_members', JSON.stringify(members));
    } catch {
      // Storage quota
    }
  }, [members]);

  const handleStartAdd = () => {
    setFormName('');
    setFormRole('');
    setFormSpec('');
    setFormBio('');
    setFormPhoto('');
    setFormGithub('');
    setFormLinkedin('');
    setFormEmail('');
    setEditingMemberId(null);
    setIsAddingMember(true);
  };

  const handleStartEdit = (member: TeamMember) => {
    setFormName(member.name);
    setFormRole(member.role);
    setFormSpec(member.specialization);
    setFormBio(member.bio);
    setFormPhoto(member.photo || '');
    setFormGithub(member.github || '');
    setFormLinkedin(member.linkedin || '');
    setFormEmail(member.email || '');
    setEditingMemberId(member.id);
    setIsAddingMember(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      alert('Selected image exceeds 2.5MB. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingMemberId) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingMemberId
            ? {
                ...m,
                name: formName.trim(),
                role: formRole.trim() || 'Core Engineer',
                specialization: formSpec.trim() || 'Hardware & Software Engineering',
                bio: formBio.trim() || 'Contributor to Terrawarn-Ai Early Warning System.',
                photo: formPhoto.trim(),
                github: formGithub.trim(),
                linkedin: formLinkedin.trim(),
                email: formEmail.trim(),
              }
            : m
        )
      );
    } else {
      const colors = [
        'from-blue-600 to-indigo-600',
        'from-emerald-600 to-teal-600',
        'from-purple-600 to-indigo-600',
        'from-amber-600 to-orange-600',
      ];
      const newMember: TeamMember = {
        id: `mem-${Date.now()}`,
        name: formName.trim(),
        role: formRole.trim() || 'Core Engineer',
        specialization: formSpec.trim() || 'Hardware & Software Engineering',
        bio: formBio.trim() || 'Contributor to Terrawarn-Ai Early Warning System.',
        photo: formPhoto.trim(),
        github: formGithub.trim(),
        linkedin: formLinkedin.trim(),
        email: formEmail.trim(),
        avatarColor: colors[members.length % colors.length],
      };
      setMembers((prev) => [...prev, newMember]);
    }

    setIsAddingMember(false);
    setEditingMemberId(null);
  };

  const handleDeleteMember = (id: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="space-y-10 font-sans pb-20">
      {/* ── Section 1: Hero Showcase & Mission Profile ────────────── */}
      <div className="card p-6 sm:p-8 relative overflow-hidden bg-gradient-to-br from-white via-white to-blue-50/50 dark:from-[#0f172a] dark:via-[#0f172a] dark:to-blue-950/20 border border-slate-200 dark:border-white/10 shadow-sm">
        {/* Glow backdrop accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
              {tx('Autonomous Edge Early Warning System')}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60 text-xs font-semibold">
              {tx('100% Offline Edge Autonomy')}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-medium">
              Mission Profile v2.6
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0f172a] dark:text-white tracking-tight mb-3">
            {tx('Terrawarn-Ai Geotechnical Telemetry & Hazard Forecasting')}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-4xl leading-relaxed font-normal mb-6">
            {tx('Engineered to safeguard critical transit corridors, mountain rail lines, and vulnerable slope communities from catastrophic rainfall-triggered mass wasting events. Terrawarn-Ai bridges the divide between costly commercial geotechnical stations ($3,000+) and high-latency satellite radar by integrating an ultra-low-cost ($17.60 BOM) autonomous sensor node mesh with real-time Bishop Limit Equilibrium geotechnical physics and explainable XGBoost machine learning.')}
          </p>

          {/* 4 Key Spec Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
            {SYSTEM_METRICS.map((metric, i) => {
              const Icon = metric.icon;
              return (
                <div 
                  key={i} 
                  className="card-subtle p-4 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {tx(metric.label)}
                    </span>
                    <div className={clsx("p-1.5 rounded-lg border", metric.bg)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                        {metric.value}
                      </span>
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {metric.unit}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      {tx(metric.subtext)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Section 2: Architectural Pillars ─────────────────────── */}
      <div>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
              {tx('Architectural Pillars')}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700 text-[10px] font-bold">
              {tx('Core Engineering')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300 font-normal mt-0.5">
            {tx('Four key technical differentiators powering real-time slope hazard forecasting')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ARCHITECTURE_PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div key={i} className="card p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Pillar #{i + 1}</span>
                    <div className={clsx("p-2 rounded-xl border", pillar.bg, pillar.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                    {tx(pillar.title)}
                  </h3>
                  <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 font-mono mb-2">
                    {pillar.value}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2 border-t border-slate-100 dark:border-white/10">
                  {tx(pillar.desc)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: End-to-End Early Warning Pipeline ─────────── */}
      <div>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
              {tx('Telemetry & Early Warning Pipeline')}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 text-[10px] font-bold">
              {tx('End-to-End Flow')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300 font-normal mt-0.5">
            {tx('How continuous mountain sensor telemetry transforms into life-saving emergency alerts in seconds')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TELEMETRY_PIPELINE.map((pipe, idx) => {
            const Icon = pipe.icon;
            return (
              <div 
                key={idx} 
                className="card p-5 flex flex-col justify-between relative group hover:border-blue-400 dark:hover:border-blue-500/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-extrabold text-sm px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      STEP {pipe.step}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/40">
                      {tx(pipe.badge)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className={clsx("p-1.5 rounded-lg border shrink-0", pipe.bg, pipe.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {tx(pipe.title)}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    {tx(pipe.desc)}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/10">
                  <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    {tx('Key Implementations:')}
                  </span>
                  <ul className="space-y-1 text-[11.5px] text-slate-700 dark:text-slate-300">
                    {pipe.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <span>{tx(pt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 4: Geotechnical Physics & Explainable AI ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Physics Engine Card */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {tx('Bishop Limit Equilibrium Physics')}
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{tx('Infinite Slope Stability & FoS Modeling')}</p>
                </div>
              </div>
              <span className="badge bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700 text-[10px] font-bold">
                PHYSICS CORE
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Rainfall-induced landslides occur when rainwater infiltration elevates pore-water pressure inside soil pores, reducing effective normal stress and shear strength along subterranean slip planes until gravitational shear forces induce slope failure.
            </p>

            {/* Geotechnical Mathematical Equation Box */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs border border-slate-800 dark:border-slate-700 mb-4 space-y-1.5">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-sans font-bold">
                Infinite Slope Safety Factor Equation:
              </div>
              <div className="text-blue-400 font-bold text-sm tracking-wide">
                FoS = [ c' + (σₙ - u) · tan(φ') ] / τ
              </div>
              <div className="text-emerald-400 text-[11px]">
                u = rᵤ · γ · z · cos²(β)
              </div>
              <div className="pt-2 text-[10.5px] text-slate-400 font-sans leading-relaxed border-t border-slate-800">
                <span className="text-slate-200 font-semibold">Where:</span> c' = soil cohesion, σₙ = normal stress, u = pore water pressure, φ' = internal friction angle, β = slope dip, and τ = driving gravitational shear stress.
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Strict Physical Boundary Override:</strong> If calculated FoS &lt; 1.00, the edge system automatically triggers a CRITICAL risk level (Risk ≥ 0.75), overriding pure AI predictions to eliminate false negatives.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Continuous Dynamic Pore Tracking:</strong> Translates rapid volumetric water saturation swings into instantaneous pore-pressure surges before physical surface cracks appear.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Explainable AI & SHAP Attribution Card */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400">
                  <Binary className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {tx('XGBoost & TreeSHAP Explainability')}
                  </h3>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">{tx('Local Feature Attribution & Scientific Causality')}</p>
                </div>
              </div>
              <span className="badge bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700 text-[10px] font-bold">
                EXPLAINABLE AI
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Black-box neural networks often fail regulatory safety scrutiny because civil defense authorities cannot verify why an evacuation alarm was triggered. Terrawarn-Ai utilizes gradient-boosted decision trees paired with exact TreeSHAP attribution.
            </p>

            {/* SHAP Contribution Visual Breakdown */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 mb-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>{tx('Real-Time Feature Risk Attribution')}</span>
                <span>{tx('SHAP Impact')}</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div>
                  <div className="flex justify-between text-[11.5px] font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                    <span>24h Cumulative Precipitation Infiltration</span>
                    <span className="text-rose-600 dark:text-rose-400 font-mono">+0.38 (High Risk)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: '78%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11.5px] font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                    <span>Soil Volumetric Water Content (VWC Saturation)</span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono">+0.26 (Elevated)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '56%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11.5px] font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                    <span>MPU6050 3D Angular Shear Tilt Rate</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono">+0.18 (Warning)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: '38%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11.5px] font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                    <span>Geotechnical Cohesion Baseline (Dry Soil Matrix)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">-0.15 (Stabilizing)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Auditable Geotechnical Decisions:</strong> Emergency commanders instantly understand the physical causation driving elevated risk levels rather than blindly trusting an AI score.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 5: Hardware BOM & Economic Cost Advantage ────── */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
                {tx('Hardware Bill of Materials & Economic Viability')}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 text-[10px] font-bold">
                $17.60 Total BOM
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 font-normal mt-0.5">
              {tx('Democratizing geotechnical slope safety: deploying 100+ dense edge nodes for the cost of a single commercial station')}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
              {tx('95% Cost Reduction')}
            </span>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-4">{tx('Component & Transducer')}</th>
                <th className="py-3 px-4 hidden md:table-cell">{tx('Technical Specifications')}</th>
                <th className="py-3 px-4">{tx('Geotechnical Telemetry Role')}</th>
                <th className="py-3 px-4 text-right">{tx('Unit Cost')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
              {HARDWARE_BOM.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                    {tx(item.component)}
                  </td>
                  <td className="py-2.5 px-4 hidden md:table-cell font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {item.spec}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                    {tx(item.role)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {item.cost}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t-2 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                <td className="py-3 px-4" colSpan={2}>
                  {tx('Total Terrawarn-Ai Edge Node Bill of Materials (BOM)')}
                </td>
                <td className="py-3 px-4 hidden md:table-cell text-slate-500 dark:text-slate-400 text-[11px]">
                  Commercial borehole inclinometers: $3,000.00 – $5,000.00+
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                  $17.60 USD
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 6: TerraSentinal Team Roster ──────────────────── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
                {tx('Team TerraSentinal')}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700 text-[10px] font-bold">
                {members.length} Researchers
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 font-normal mt-0.5">
              {tx('Directly type and customize your team roster, roles, and profiles')}
            </p>
          </div>

          <button
            onClick={handleStartAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>{tx('Add Team Member')}</span>
          </button>
        </div>

        {/* Team Member Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <div key={member.id} className="card p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0 w-12 h-12">
                      {member.photo ? (
                        <img 
                          src={member.photo} 
                          alt={member.name} 
                          className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-slate-200 dark:border-white/10"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={clsx(
                          "w-12 h-12 rounded-2xl bg-gradient-to-tr text-white flex items-center justify-center font-bold text-base shadow-sm", 
                          member.avatarColor,
                          member.photo ? "hidden" : "flex"
                        )}
                      >
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">{member.name}</h3>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{member.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(member)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                      title="Edit Member"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200 mb-3">
                  <span className="font-bold text-[10.5px] text-slate-400 dark:text-slate-300 uppercase tracking-wider block mb-0.5">Specialization:</span>
                  {member.specialization}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {member.bio}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3 mt-3 border-t border-slate-100 dark:border-white/10 text-xs text-slate-500 dark:text-slate-300">
                {member.github && (
                  <a href={member.github} target="_blank" rel="noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors">
                    <Github className="w-3.5 h-3.5" /> <span>GitHub</span>
                  </a>
                )}
                {member.linkedin && (
                  <a href={member.linkedin} target="_blank" rel="noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors">
                    <Linkedin className="w-3.5 h-3.5" /> <span>LinkedIn</span>
                  </a>
                )}
                {member.email && (
                  <a href={`mailto:${member.email}`} className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors">
                    <Mail className="w-3.5 h-3.5" /> <span>Email</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Previous Engineering Works ────────────── */}
      <div>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
              Previous Engineering Works & Research Portfolio
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700 text-[10px] font-bold">
              Research History
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300 font-normal mt-0.5">
            Prior biomedical telemetry and computer vision systems built by our research engineering team
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {PREVIOUS_PROJECTS.map((proj) => {
            const Icon = proj.icon;
            return (
              <div key={proj.id} className="card p-6 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={clsx("badge font-bold text-[10px]", proj.badgeColor)}>
                      {proj.tag}
                    </span>
                    <div className={clsx("p-2 rounded-xl border", proj.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 leading-snug">
                    {proj.title}
                  </h3>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3">{proj.category}</p>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {proj.summary}
                  </p>

                  <div className="space-y-1.5 mb-4">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider block">Key Technical Achievements:</span>
                    <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-200">
                      {proj.highlights.map((h, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Team Member Form Modal ──────────────────────────── */}
      {isAddingMember && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-[#e5e9f2] dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingMemberId ? 'Edit Team Member Profile' : 'Add New Team Member'}
              </h3>
              <button
                onClick={() => setIsAddingMember(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3.5 text-xs font-sans">
              {/* Photo Upload & Preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-200">
                  Profile Photo
                </label>
                
                <div className="flex items-center gap-3.5">
                  {/* Avatar Preview */}
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-300 dark:border-white/10 flex items-center justify-center">
                    {formPhoto ? (
                      <img src={formPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-400 dark:text-slate-500 flex flex-col items-center">
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span className="text-[8.5px] font-bold">NO PHOTO</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Button and URL inputs */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563eb] hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handlePhotoUpload} 
                          className="hidden" 
                        />
                      </label>

                      {formPhoto && (
                        <button
                          type="button"
                          onClick={() => setFormPhoto('')}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={formPhoto.startsWith('data:image') ? '(Image uploaded from device)' : formPhoto}
                        onChange={(e) => {
                          if (!e.target.value.startsWith('(Image uploaded')) {
                            setFormPhoto(e.target.value);
                          }
                        }}
                        placeholder="Or paste URL (e.g. https://github.com/user.png or /team/aman.jpg)"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
                  💡 Select a photo from your computer, or paste any image URL / GitHub avatar.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">{tx('Full Name *')}</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Aman Nasim Khan"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">{tx('Role Title')}</label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="e.g. IoT Lead"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">{tx('Specialization')}</label>
                  <input
                    type="text"
                    value={formSpec}
                    onChange={(e) => setFormSpec(e.target.value)}
                    placeholder="e.g. Embedded C++ & LoRa"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">{tx('Short Biography & Achievements')}</label>
                <textarea
                  rows={3}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="Details of research contributions..."
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">{tx('GitHub URL')}</label>
                  <input
                    type="url"
                    value={formGithub}
                    onChange={(e) => setFormGithub(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">{tx('LinkedIn URL')}</label>
                  <input
                    type="url"
                    value={formLinkedin}
                    onChange={(e) => setFormLinkedin(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">{tx('Email Address')}</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="name@..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingMember(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
                >
                  Save Team Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
