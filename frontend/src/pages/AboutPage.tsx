import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, HeartPulse, Microscope, Cpu, ShieldCheck, 
  ExternalLink, Github, Linkedin, Mail, Edit3, Trash2, Plus, 
  Check, X, Sparkles, Award, Layers, Terminal, Activity, Waves,
  Radio, Gauge, ShieldAlert, Wifi, Zap, CheckCircle2, ArrowRight, BookOpen
} from 'lucide-react';
import clsx from 'clsx';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  specialization: string;
  bio: string;
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
    color: 'bg-rose-50 border-rose-200 text-rose-700',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    tag: 'BIOMEDICAL EMBEDDED',
    summary: 'A portable, low-power telemetry device for continuous multi-lead cardiac electrophysiology monitoring with automated edge arrhythmia classification.',
    highlights: [
      'Engineered analog front-end with AD8232 biopotential transducer & driven-right-leg (DRL) circuit for 50Hz/60Hz powerline noise suppression.',
      'Implemented Pan-Tompkins real-time QRS complex detection and Wavelet Transform (DWT) baseline wander removal directly on ESP32 microcontrollers.',
      'Built a high-precision live cardiac waveform streaming dashboard with automated tachycardia, bradycardia, and PVC event alerts.',
      'Bluetooth Low Energy (BLE) and Wi-Fi dual-link telemetry with offline local buffering during emergency transport.',
    ],
    stack: ['ESP32', 'AD8232 ECG Transducer', 'Pan-Tompkins Algorithm', 'FastAPI', 'WebSockets', 'React Recharts'],
    metrics: [
      { label: 'Sampling Rate', val: '250 Hz' },
      { label: 'QRS Accuracy', val: '98.4%' },
      { label: 'Latency', val: '< 15 ms' },
      { label: 'Battery', val: '18+ Hours' },
    ],
  },
  {
    id: 'proj-microplastics',
    title: 'AI & Optical Microplastics Detection & Spectroscopic Classification System',
    category: 'Environmental AI & Microscopic Computer Vision',
    icon: Microscope,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    tag: 'COMPUTER VISION & SPECTROSCOPY',
    summary: 'An automated microscopic imaging and fluorescence spectroscopy platform for identifying, sizing, and classifying synthetic microplastic polymers in aquatic samples.',
    highlights: [
      'Built a low-cost automated darkfield microscopic imaging rig using Raspberry Pi HQ Camera and Nile Red fluorescent stain excitation.',
      'Trained a custom YOLOv8 + EfficientNet convolutional neural network to detect particles down to 10 micrometers with 96.2% precision.',
      'Automated polymer morphological profiling (fibers, fragments, beads, films) with instant density per liter computation.',
      'Created an environmental GIS map displaying regional waterway contamination heatmaps for pollution remediation teams.',
    ],
    stack: ['Python', 'PyTorch / YOLOv8', 'OpenCV', 'Fluorescence Spectroscopy', 'Raspberry Pi', 'React GIS'],
    metrics: [
      { label: 'Resolution', val: '10 μm' },
      { label: 'Classification F1', val: '96.2%' },
      { label: 'Throughput', val: '45 Samples/hr' },
      { label: 'Polymers', val: '8 Types' },
    ],
  },
];

const ARCHITECTURE_PILLARS = [
  {
    title: 'Ultra-Low Cost Bill of Materials',
    value: '< $18 USD',
    desc: 'BOM based on mass-market ESP32, capacitive moisture V2, FC-37, and MPU6050, 95% cheaper than commercial geotechnical stations ($3,000+).',
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  {
    title: '100% Offline Edge Autonomy',
    value: 'Zero Cloud',
    desc: 'Local SQLite WAL database, FastAPI server, and XGBoost AI model operate continuously during complete cloud/grid power blackouts.',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  {
    title: 'Gray-Box Hybrid Intelligence',
    value: 'Physics + ML',
    desc: 'Couples infinite slope Bishop Limit Equilibrium safety factor (FoS) calculations with XGBoost SHAP TreeExplainer feature attributions.',
    icon: Activity,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
  },
  {
    title: 'Multi-Channel Public Warning',
    value: '< 1.2s Latency',
    desc: 'Zero-pairing 2.4GHz BLE emergency beacons, Common Alerting Protocol (CAP) SMS cell broadcast, and LoRa long-range mesh dispatch.',
    icon: Radio,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
  },
];

export default function AboutPage() {
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
    setFormGithub(member.github || '');
    setFormLinkedin(member.linkedin || '');
    setFormEmail(member.email || '');
    setEditingMemberId(member.id);
    setIsAddingMember(true);
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
    <div className="space-y-8 font-sans pb-16">
      {/* ── Section Header (matches Metrics page format) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
              About Terrawarn-Ai
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700 text-[10px] font-bold">
              Autonomous Early Warning System
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-400 font-medium hidden sm:inline">· Smart India Hackathon</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300 font-normal mt-0.5">
            An ultra-low-cost, offline-first IoT & Edge AI telemetry system engineered to prevent catastrophic landslide fatalities
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </div>

      {/* ── Section 2: Core Engineering Pillars ──────────────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
            Architectural Pillars
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300 font-normal">
            Four key technical differentiators powering real-time slope hazard forecasting
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ARCHITECTURE_PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div key={i} className="card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Pillar #{i + 1}</span>
                    <div className={clsx("p-2 rounded-xl border", pillar.bg, pillar.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                    {pillar.title}
                  </h3>
                  <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 font-mono mb-2">
                    {pillar.value}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2 border-t border-slate-100 dark:border-white/10">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Meet Our Engineering Team ────────────── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
              Research & Engineering Team
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300 font-normal">
              Directly type and customize your team roster, roles, and profiles
            </p>
          </div>

          <button
            onClick={handleStartAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>

        {/* Team Member Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <div key={member.id} className="card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-12 h-12 rounded-2xl bg-gradient-to-tr text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0", member.avatarColor)}>
                      {member.name.slice(0, 2).toUpperCase()}
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

              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-white/10 text-xs text-slate-500 dark:text-slate-300">
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

      {/* ── Section 4: Previous Engineering Works ────────────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
            Previous Engineering Works & Research Portfolio
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300 font-normal">
            Prior biomedical and computer vision systems built by our research team
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {PREVIOUS_PROJECTS.map((proj) => {
            const Icon = proj.icon;
            return (
              <div key={proj.id} className="card p-6 flex flex-col justify-between">
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

                  {/* Highlights */}
                  <div className="space-y-1.5">
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

            <form onSubmit={handleSaveMember} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Full Name *</label>
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
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Role Title</label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="e.g. IoT Lead"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Specialization</label>
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
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Short Biography & Achievements</label>
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
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={formGithub}
                    onChange={(e) => setFormGithub(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={formLinkedin}
                    onChange={(e) => setFormLinkedin(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Email Address</label>
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
