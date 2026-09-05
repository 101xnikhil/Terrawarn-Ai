import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, MapPin, AlertTriangle, ShieldCheck, CheckCircle, 
  Clock, Filter, RefreshCw, Radio, Phone, User, ExternalLink,
  ChevronRight, ArrowUpRight, UploadCloud, Layers, Calendar,
  Database, Search, Eye, Check, X, Shield, Navigation
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useOfflineSync, getQueuedReports, flushOfflineReports, QueuedCitizenReport } from '../utils/offlineSync';
import { useLanguage } from '../utils/i18n';
import ReportIncidentModal from '../components/reports/ReportIncidentModal';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

interface ReportItem {
  id: number;
  report_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  elevation_m?: number;
  location_name: string;
  district: string;
  state: string;
  highway_corridor?: string;
  category: string;
  severity: string;
  description: string;
  photo_url?: string;
  reporter_type: string;
  reporter_name?: string;
  contact_phone?: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  status: string;
  is_offline_synced: boolean;
  is_local_queued?: boolean; // In offline buffer
}

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  GROUND_CRACKS: { 
    label: 'Tension Cracks / Ground Fissures', 
    color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: AlertTriangle 
  },
  SLOPE_SLUMP: { 
    label: 'Active Slope Slump / Mudflow', 
    color: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    icon: Radio 
  },
  ROCKFALL: { 
    label: 'Boulder / Rockfall on Highway', 
    color: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    icon: AlertTriangle 
  },
  BLOCKED_ROAD: { 
    label: 'Blocked Road / Debris Inundation', 
    color: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800',
    icon: AlertTriangle 
  },
  RIVER_DAMMING: { 
    label: 'River Damming / Debris Flow', 
    color: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: ShieldCheck 
  },
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
  MODERATE: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800',
  HIGH: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
  CRITICAL: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 animate-pulse',
};

const formatFullDate = (iso: string): { date: string; time: string; relative: string } => {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return { date, time, relative: formatRelativeTime(iso) };
  } catch (e) {
    return { date: iso, time: '', relative: '' };
  }
};

const CitizenReportsPage: React.FC = () => {
  const { t } = useLanguage();
  const { isOnline, pendingCount, isSyncing, triggerManualSync } = useOfflineSync();

  const [dbReports, setDbReports] = useState<ReportItem[]>([]);
  const [queuedItems, setQueuedItems] = useState<QueuedCitizenReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [verifiedFilter, setVerifiedFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePhotoModal, setActivePhotoModal] = useState<ReportItem | null>(null);
  const [detailModalReport, setDetailModalReport] = useState<ReportItem | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Fetch reports from PostgreSQL / Neon DB
  const fetchDbReports = async () => {
    setLoading(true);
    try {
      let url = '/api/reports?limit=100';
      if (selectedState !== 'ALL') url += `&state=${encodeURIComponent(selectedState)}`;
      if (selectedSeverity !== 'ALL') url += `&severity=${selectedSeverity}`;
      if (verifiedFilter === 'VERIFIED') url += '&verified_only=true';

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDbReports(data.reports || []);
      } else {
        console.warn('Backend returned non-OK status:', res.status);
      }
    } catch (err) {
      console.warn('Failed to load reports from database:', err);
    } finally {
      setLoading(false);
      setQueuedItems(getQueuedReports());
    }
  };

  // Attempt automatic flush if pending items exist
  useEffect(() => {
    if (getQueuedReports().length > 0) {
      flushOfflineReports().then(({ synced }) => {
        if (synced > 0) {
          setNotificationToast(`Synced ${synced} field report(s) to cloud database!`);
          setTimeout(() => setNotificationToast(null), 5000);
          fetchDbReports();
        }
      });
    }
    fetchDbReports();
  }, [selectedState, selectedSeverity, verifiedFilter]);

  // Combine database reports and local queued buffer
  const allReports = useMemo<ReportItem[]>(() => {
    // Map queued items into ReportItem format
    const localMapped: ReportItem[] = queuedItems.map((item, idx) => ({
      id: -(idx + 1),
      report_id: item.localId,
      timestamp: item.queuedAt,
      latitude: item.latitude,
      longitude: item.longitude,
      elevation_m: item.elevation_m || 0.0,
      location_name: item.location_name,
      district: item.district,
      state: item.state,
      highway_corridor: item.highway_corridor,
      category: item.category,
      severity: item.severity,
      description: item.description,
      photo_url: item.photo_url,
      reporter_type: item.reporter_type,
      reporter_name: item.reporter_name,
      contact_phone: item.contact_phone,
      is_verified: false,
      status: 'PENDING_SYNC',
      is_offline_synced: false,
      is_local_queued: true,
    }));

    // Filter by search query if provided
    let combined = [...localMapped, ...dbReports];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      combined = combined.filter((r) => 
        r.location_name.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q) ||
        (r.highway_corridor && r.highway_corridor.toLowerCase().includes(q)) ||
        r.description.toLowerCase().includes(q) ||
        (r.reporter_name && r.reporter_name.toLowerCase().includes(q)) ||
        r.report_id.toLowerCase().includes(q)
      );
    }
    return combined;
  }, [dbReports, queuedItems, searchQuery]);

  // Quick verify handler (District Authority action)
  const handleVerifyReport = async (reportId: string) => {
    setVerifyingId(reportId);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_verified: true,
          verified_by: 'District Disaster Management Authority (DDMA)',
          status: 'VERIFIED',
        }),
      });

      if (res.ok) {
        setNotificationToast(`Report ${reportId} verified and recorded in DDMA registry!`);
        setTimeout(() => setNotificationToast(null), 4000);
        fetchDbReports();
      } else {
        alert('Failed to update verification status on database');
      }
    } catch (e) {
      console.error('Failed to verify report:', e);
    } finally {
      setVerifyingId(null);
    }
  };

  // KPI Statistics
  const totalReports = allReports.length;
  const blockedRoadCount = allReports.filter((r) => r.category === 'BLOCKED_ROAD').length;
  const verifiedCount = allReports.filter((r) => r.is_verified).length;
  const criticalCount = allReports.filter((r) => r.severity === 'CRITICAL').length;

  return (
    <div className="space-y-4 font-sans animate-fade-in pb-12">
      {/* ── Notification Toast ──────────────────────────────────── */}
      {notificationToast && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{notificationToast}</span>
          </div>
          <button onClick={() => setNotificationToast(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Section Header (matches Metrics page format) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
              {t('citizenFieldReports')}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-mono font-bold flex items-center gap-1">
              <Database className="w-3 h-3" />
              <span>Neon PostgreSQL Synced</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300 font-normal mt-0.5">
            Live ground observations of slope cracks, boulder roll, and road blockages saved to central database with exact timestamps
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Offline Sync Status Badge */}
          <div className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs",
            isOnline 
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" 
              : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
          )}>
            <Radio className={clsx("w-3.5 h-3.5", !isOnline && "animate-pulse")} />
            <span>{isOnline ? (pendingCount > 0 ? `Cloud Live (${pendingCount} Queued)` : 'Cloud Live') : `Offline Buffer (${pendingCount} Queued)`}</span>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={async () => {
                  const res = await triggerManualSync();
                  if (res.synced > 0) {
                    setNotificationToast(`Successfully uploaded ${res.synced} cached report(s) to database!`);
                    fetchDbReports();
                  }
                }}
                disabled={isSyncing}
                className="ml-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
              >
                <UploadCloud className="w-3 h-3" />
                <span>{isSyncing ? '...' : 'Sync'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{t('reportIncidentBtn')}</span>
          </button>
        </div>
      </div>

      {/* ── Summary KPI Tiles ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3.5 bg-white dark:bg-slate-900 border-l-4 border-l-blue-600">
          <div className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400">Total Ground Reports</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-1">{totalReports}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Crowdsourced &amp; BRO Patrols</div>
        </div>

        <div className="card p-3.5 bg-white dark:bg-slate-900 border-l-4 border-l-rose-600">
          <div className="text-[10.5px] uppercase font-bold text-rose-600 dark:text-rose-400">Active Road Blockages</div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-1">{blockedRoadCount}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">NH-10 &amp; NH-27 Corridor Impacts</div>
        </div>

        <div className="card p-3.5 bg-white dark:bg-slate-900 border-l-4 border-l-amber-500">
          <div className="text-[10.5px] uppercase font-bold text-amber-600 dark:text-amber-400">Critical Severity</div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">{criticalCount}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Imminent Slide &amp; Evac Hazard</div>
        </div>

        <div className="card p-3.5 bg-white dark:bg-slate-900 border-l-4 border-l-emerald-600">
          <div className="text-[10.5px] uppercase font-bold text-emerald-600 dark:text-emerald-400">DDMA Verified</div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{verifiedCount}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Confirmed by District Authorities</div>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────── */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Keyword Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location, road, reporter, or ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 font-semibold text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All NER States</option>
            <option value="Assam">Assam</option>
            <option value="Sikkim">Sikkim</option>
            <option value="Meghalaya">Meghalaya</option>
            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
            <option value="Manipur">Manipur</option>
            <option value="Nagaland">Nagaland</option>
            <option value="Mizoram">Mizoram</option>
            <option value="Tripura">Tripura</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 font-semibold text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MODERATE">Moderate</option>
            <option value="LOW">Low</option>
          </select>

          {/* Verification Filter */}
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 font-semibold text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Verification Statuses</option>
            <option value="VERIFIED">DDMA Verified Only</option>
            <option value="PENDING">Pending Review Only</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchDbReports}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          <RefreshCw className={clsx("w-3.5 h-3.5 text-blue-600", loading && "animate-spin")} />
          <span>Refresh Database</span>
        </button>
      </div>

      {/* ── Reports Grid ─────────────────────────────────────────── */}
      {loading && allReports.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Querying PostgreSQL database...</p>
          <p className="text-xs text-slate-400 mt-1">Fetching geo-tagged observations with date, time, and coordinates.</p>
        </div>
      ) : allReports.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No field reports match your filter criteria.</p>
          <p className="text-xs text-slate-400 mt-1">Be the first to report ground cracks or slope hazards in this sector.</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Submit First Ground Report</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allReports.map((report) => {
            const catInfo = CATEGORY_LABELS[report.category] || { 
              label: report.category.replace('_', ' '), 
              color: 'bg-slate-100 text-slate-700 border-slate-200',
              icon: AlertTriangle 
            };
            const sevColor = SEVERITY_COLORS[report.severity] || 'text-slate-700 bg-slate-100 border-slate-200';
            const { date, time, relative } = formatFullDate(report.timestamp);

            return (
              <div 
                key={report.report_id} 
                className={clsx(
                  "card overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all border",
                  report.is_local_queued 
                    ? "border-amber-400 dark:border-amber-600 bg-amber-50/10" 
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900"
                )}
              >
                <div>
                  {/* Photo Thumbnail if present */}
                  {report.photo_url ? (
                    <div 
                      onClick={() => setActivePhotoModal(report)}
                      className="w-full h-44 relative bg-slate-100 dark:bg-slate-900 cursor-pointer group overflow-hidden"
                    >
                      <img 
                        src={report.photo_url} 
                        alt={report.location_name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end justify-between p-3">
                        <span className="text-[10px] text-white font-mono font-bold flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                          <Camera className="w-3 h-3 text-rose-400" /> Click to enlarge
                        </span>
                        <span className="text-[10px] text-white font-mono bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                          {relative}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-between px-4 text-slate-500 dark:text-slate-400 text-xs border-b border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-2 font-semibold">
                        <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Field Georeferenced Observation</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{relative}</span>
                    </div>
                  )}

                  <div className="p-4 space-y-3 text-xs">
                    {/* Header Badges: Report ID + Category + Severity */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold text-[10.5px] text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                          #{report.report_id}
                        </span>
                        {report.is_local_queued && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold border border-amber-300 dark:border-amber-700 animate-pulse">
                            Offline Buffer
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={clsx("px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase", sevColor)}>
                          {report.severity}
                        </span>
                      </div>
                    </div>

                    {/* Prominent Category Tag */}
                    <div className={clsx("px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5", catInfo.color)}>
                      <catInfo.icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{catInfo.label}</span>
                    </div>

                    {/* Location & Corridor */}
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                        {report.location_name}
                      </h3>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 flex-wrap">
                        <MapPin className="w-3 h-3 text-rose-600 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{report.district}, {report.state}</span>
                        {report.highway_corridor && (
                          <span className="ml-1 px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded font-mono font-bold text-[10px] border border-blue-200 dark:border-blue-800">
                            🛣️ {report.highway_corridor}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Observation Description */}
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                      "{report.description}"
                    </p>

                    {/* Exact Date & Time Readout (Prominent) */}
                    <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-1.5 text-[10.5px]">
                      <div className="flex items-center justify-between text-blue-900 dark:text-blue-200 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Date Recorded:</span>
                        </span>
                        <strong className="font-mono text-xs text-blue-950 dark:text-white">{date}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Timestamp:</span>
                        </span>
                        <strong className="font-mono">{time}</strong>
                      </div>
                    </div>

                    {/* Geo Coordinates & Elevation */}
                    <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 flex justify-between bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-lg border border-slate-100 dark:border-white/5">
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-slate-400" />
                        <span>{report.latitude.toFixed(4)}° N, {report.longitude.toFixed(4)}° E</span>
                      </span>
                      <span>Elev: <strong>{report.elevation_m}m ASL</strong></span>
                    </div>

                    {/* Reporter Information */}
                    <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block leading-none">
                            {report.reporter_name || 'Anonymous Resident'}
                          </span>
                          <span className="text-[9.5px] text-slate-500 uppercase font-mono mt-0.5 block">
                            {report.reporter_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {report.contact_phone && (
                        <a 
                          href={`tel:${report.contact_phone}`}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-[10px] font-mono font-semibold"
                          title="Contact reporter"
                        >
                          <Phone className="w-3 h-3 text-blue-500" />
                          <span>{report.contact_phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Verification Status & Action Button */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
                  {report.is_verified ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span>DDMA Verified</span>
                        {report.verified_by && (
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-normal truncate max-w-[140px]">
                            by {report.verified_by}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Review Pending</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    {/* Detail Inspector Button */}
                    <button
                      type="button"
                      onClick={() => setDetailModalReport(report)}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 border border-slate-200 dark:border-white/10 shadow-2xs cursor-pointer"
                      title="Inspect Full Geological Payload"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Live Verification Trigger Button */}
                    {!report.is_verified && !report.is_local_queued && (
                      <button
                        type="button"
                        onClick={() => handleVerifyReport(report.report_id)}
                        disabled={verifyingId === report.report_id}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] transition-all flex items-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
                        title="Confirm ground-truth and mark verified in DDMA registry"
                      >
                        <Shield className="w-3 h-3" />
                        <span>{verifyingId === report.report_id ? 'Verifying...' : 'Verify'}</span>
                      </button>
                    )}

                    {/* View on Map Link */}
                    <Link
                      to={`/map?lat=${report.latitude}&lng=${report.longitude}`}
                      className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 shadow-2xs"
                      title="Jump to sector on GIS Map"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Photo Enlarge Modal ──────────────────────────────────── */}
      {activePhotoModal && (
        <div 
          onClick={() => setActivePhotoModal(null)}
          className="fixed inset-0 z-[10001] bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer animate-fade-in font-sans"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-3 bg-slate-800 flex items-center justify-between border-b border-white/10">
              <div>
                <span className="font-mono text-xs text-blue-400 font-bold">#{activePhotoModal.report_id}</span>
                <span className="text-white font-bold text-xs ml-2">{activePhotoModal.location_name}</span>
              </div>
              <button 
                onClick={() => setActivePhotoModal(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden flex items-center justify-center bg-black">
              <img 
                src={activePhotoModal.photo_url} 
                alt={activePhotoModal.location_name} 
                className="max-h-[70vh] w-auto object-contain" 
              />
            </div>
            <div className="p-3 bg-slate-800/90 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
              <span>Recorded: <strong>{formatFullDate(activePhotoModal.timestamp).date} at {formatFullDate(activePhotoModal.timestamp).time}</strong></span>
              <span>GPS: <strong>{activePhotoModal.latitude.toFixed(4)}° N, {activePhotoModal.longitude.toFixed(4)}° E</strong></span>
              <span className="font-mono text-emerald-400">Status: {activePhotoModal.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Detailed Payload Inspector Modal ──────────────────────── */}
      {detailModalReport && (
        <div 
          onClick={() => setDetailModalReport(null)}
          className="fixed inset-0 z-[10001] bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer animate-fade-in font-sans"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl max-w-xl w-full shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">
                  DATABASE RECORD #{detailModalReport.report_id}
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                  {detailModalReport.location_name}
                </h3>
              </div>
              <button 
                onClick={() => setDetailModalReport(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                <div><strong>State:</strong> {detailModalReport.state}</div>
                <div><strong>District:</strong> {detailModalReport.district}</div>
                <div><strong>Highway:</strong> {detailModalReport.highway_corridor || 'N/A'}</div>
                <div><strong>Elevation:</strong> {detailModalReport.elevation_m}m ASL</div>
                <div><strong>Severity:</strong> <span className="font-bold text-red-500">{detailModalReport.severity}</span></div>
                <div><strong>Category:</strong> {detailModalReport.category}</div>
                <div className="col-span-2"><strong>GPS:</strong> {detailModalReport.latitude}° N, {detailModalReport.longitude}° E</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Observation Narrative:</div>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{detailModalReport.description}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Database Metadata:</div>
                <div><strong>Recorded Timestamp:</strong> {detailModalReport.timestamp}</div>
                <div><strong>Reporter:</strong> {detailModalReport.reporter_name} ({detailModalReport.reporter_type})</div>
                <div><strong>Phone Contact:</strong> {detailModalReport.contact_phone || 'None provided'}</div>
                <div><strong>Verification Status:</strong> {detailModalReport.is_verified ? `Verified by ${detailModalReport.verified_by}` : 'Pending Verification'}</div>
                <div><strong>Storage Engine:</strong> PostgreSQL / Neon Serverless (table: citizen_reports)</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setDetailModalReport(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Incident Submission Modal ─────────────────────────────── */}
      <ReportIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReportSubmitted={() => {
          fetchDbReports();
        }}
      />
    </div>
  );
};

export default CitizenReportsPage;
