import React, { useState } from 'react';
import { 
  X, MapPin, Camera, AlertTriangle, ShieldCheck, 
  Send, RefreshCw, CheckCircle, Navigation, Radio, UploadCloud
} from 'lucide-react';
import clsx from 'clsx';
import { useOfflineSync } from '../../utils/offlineSync';
import { useLanguage } from '../../utils/i18n';
import { useI18n } from '../../i18n/LanguageContext';
import type { UIStringKey } from '../../i18n/strings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultCoords?: [number, number];
  onReportSubmitted?: () => void;
}

const CATEGORIES = [
  { id: 'GROUND_CRACKS', label: 'Tension Cracks / Ground Fissures', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
  { id: 'SLOPE_SLUMP', label: 'Active Slope Slump / Mudflow', icon: Radio, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200' },
  { id: 'ROCKFALL', label: 'Boulder / Rockfall on Highway', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
  { id: 'BLOCKED_ROAD', label: 'Blocked Highway / Inundation', icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200' },
  { id: 'RIVER_DAMMING', label: 'River Damming / Debris Flow', icon: ShieldCheck, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
];

const NER_STATES = [
  'Assam', 'Sikkim', 'Meghalaya', 'Arunachal Pradesh', 
  'Nagaland', 'Manipur', 'Mizoram', 'Tripura'
];

export const ReportIncidentModal: React.FC<Props> = ({ isOpen, onClose, defaultCoords, onReportSubmitted }) => {
  const { isOnline, queueReport } = useOfflineSync();
  const { t } = useLanguage();
  const { t: tUi, tx } = useI18n();
  const categoryKey: Record<string, UIStringKey> = {
    GROUND_CRACKS: 'CAT_CRACKS',
    SLOPE_SLUMP: 'CAT_SLUMP',
    ROCKFALL: 'CAT_ROCKFALL',
    BLOCKED_ROAD: 'CAT_BLOCKED',
    RIVER_DAMMING: 'CAT_RIVER',
  };

  const [lat, setLat] = useState<number>(defaultCoords ? defaultCoords[0] : 26.1445);
  const [lng, setLng] = useState<number>(defaultCoords ? defaultCoords[1] : 91.7362);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [state, setState] = useState<string>('Assam');
  const [highwayCorridor, setHighwayCorridor] = useState<string>('NH-27');
  const [category, setCategory] = useState<string>('GROUND_CRACKS');
  const [severity, setSeverity] = useState<string>('HIGH');
  const [description, setDescription] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [reporterType, setReporterType] = useState<string>('CITIZEN');
  const [reporterName, setReporterName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
        setIsDetectingGps(false);
      },
      (err) => {
        console.warn('GPS detection failed:', err);
        setIsDetectingGps(false);
        alert('Could not auto-detect GPS. Please verify coordinates manually.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName.trim() || !description.trim()) {
      alert('Please fill in location name and description');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      latitude: lat,
      longitude: lng,
      elevation_m: 650.0,
      location_name: locationName.trim(),
      district: district.trim() || 'NER Regional District',
      state,
      highway_corridor: highwayCorridor,
      category,
      severity,
      description: description.trim(),
      photo_url: photoPreview || undefined,
      reporter_type: reporterType,
      reporter_name: reporterName.trim() || 'Anonymous Resident',
      contact_phone: contactPhone.trim() || undefined,
    };

    if (!isOnline) {
      // Buffer locally in offline queue
      queueReport(payload);
      setIsSubmitting(false);
      setSubmitSuccessMsg('Network Offline: Report buffered locally in secure storage. Auto-sync will record it to database on connection.');
      onReportSubmitted?.();
      setTimeout(() => {
        setSubmitSuccessMsg(null);
        onClose();
      }, 2000);
      return;
    }

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdReport = await res.json();
        setIsSubmitting(false);
        setSubmitSuccessMsg(`Report #${createdReport.report_id} saved to PostgreSQL database! Recorded with timestamp and forwarded to DDMA.`);
        onReportSubmitted?.();
        setTimeout(() => {
          setSubmitSuccessMsg(null);
          onClose();
        }, 1800);
      } else {
        throw new Error('API server returned error');
      }
    } catch (err) {
      // Fallback to offline queue
      queueReport(payload);
      setIsSubmitting(false);
      setSubmitSuccessMsg('Network transmission failed: Report stored in offline buffer. It will sync to database automatically.');
      onReportSubmitted?.();
      setTimeout(() => {
        setSubmitSuccessMsg(null);
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                {tUi('REPORT_INCIDENT')} &middot; North Eastern Region
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Crowdsourced geo-tagged hazard reporting for citizens, BRO, and field officers.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {submitSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 text-xs font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{submitSuccessMsg}</span>
            </div>
          )}

          {/* Offline Warning Tag */}
          {!isOnline && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 font-medium">
                <Radio className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>{tx('Operating in Low-Network / Offline Mode. Report will be saved to local storage.')}</span>
              </div>
              <span className="font-bold text-[10px] uppercase bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                Buffer Ready
              </span>
            </div>
          )}

          {/* 1. Category Selector */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase text-[10.5px]">
              Hazard Type observed:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={clsx(
                      "p-2.5 rounded-xl border text-left transition-all flex items-center gap-2",
                      isSelected
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold shadow-xs ring-1 ring-blue-500"
                        : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium"
                    )}
                  >
                    <Icon className={clsx("w-4 h-4 shrink-0", isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-400")} />
                    <span className="text-[11px] leading-tight">{categoryKey[cat.id] ? tUi(categoryKey[cat.id]) : cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Geolocation & Highway Corridor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-white/10">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[10.5px]">GPS Coordinates:</span>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={isDetectingGps}
                  className="flex items-center gap-1 text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Navigation className="w-3 h-3" />
                  <span>{isDetectingGps ? 'Locking...' : 'Auto-Detect GPS'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  placeholder={tx('Latitude')}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value))}
                  placeholder={tx('Longitude')}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase text-[10.5px]">
                Corridor / Highway Link:
              </label>
              <select
                value={highwayCorridor}
                onChange={(e) => setHighwayCorridor(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-semibold text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="NH-10">NH-10 (Sevoke – Teesta – Gangtok)</option>
                <option value="NH-27">NH-27 (Lumding – Haflong – Silchar)</option>
                <option value="NH-29">NH-29 (Dimapur – Kohima – Imphal)</option>
                <option value="NH-13">NH-13 (Bomdila – Sela Pass – Tawang)</option>
                <option value="NH-102B">NH-102B (Tupul Railway Cut Corridor)</option>
                <option value="Shillong-Sohra">Shillong – Mawkdok – Cherrapunji</option>
                <option value="OTHER">Other Rural / Village Road</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase text-[10.5px]">
                Specific Location Name:
              </label>
              <input
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g., 29th Mile Teesta Scour or Mahur Ghat KM 45"
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase text-[10.5px]">
                  State:
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500"
                >
                  {NER_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase text-[10.5px]">
                  District:
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Dima Hasao"
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Severity & Description */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[10.5px]">
                Severity Estimate:
              </label>
              <div className="flex items-center gap-2">
                {['MODERATE', 'HIGH', 'CRITICAL'].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase transition-all",
                      severity === sev
                        ? sev === 'CRITICAL' ? 'bg-red-600 text-white shadow-xs' : sev === 'HIGH' ? 'bg-amber-600 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    )}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase text-[10.5px]">
                Observation Description:
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe ground deformation, crack width, sounds of grinding stones, culvert water coloration, blocked traffic, or threatened homes..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 4. Photo Upload Preview */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase text-[10.5px]">
              {t('uploadPhoto')}:
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 flex items-center gap-2 font-semibold transition-all shadow-2xs">
                <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{tx('Select Photo / Video')}</span>
                <input type="file" accept="image/*,video/*" onChange={handlePhotoSelect} className="hidden" />
              </label>
              {photoPreview && (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-blue-500 shadow-sm">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setPhotoPreview(null)}
                    className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 5. Reporter Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Reporter Role:
              </label>
              <select
                value={reporterType}
                onChange={(e) => setReporterType(e.target.value)}
                className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-xs"
              >
                <option value="CITIZEN">Local Citizen / Resident</option>
                <option value="FIELD_OFFICER">PWD / District Field Officer</option>
                <option value="BRO_PATROL">Border Roads (BRO) Patrol</option>
                <option value="SDRF">SDRF / Police First Responder</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Name (Optional):
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder={tx('Your Name')}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Contact Phone:
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98XXX XXXXX"
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t('submitting')}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{tUi('SUBMIT_REPORT')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportIncidentModal;
