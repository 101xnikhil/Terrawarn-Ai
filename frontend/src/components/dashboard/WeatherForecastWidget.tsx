import React, { useState, useEffect } from 'react';
import { 
  CloudRain, CloudLightning, Activity, Wind, AlertCircle, 
  Droplets, ShieldAlert, ArrowUpRight, Radio, RefreshCw 
} from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../../i18n/LanguageContext';

interface ForecastStation {
  station: string;
  state: string;
  ari7_pct: number;
  ari_status: string;
  rain_24h_obs_mm: number;
  rain_24h_forecast_mm: number;
  rain_48h_forecast_mm: number;
  rain_72h_forecast_mm: number;
  alert_level: string;
  cloudburst_risk: string;
  soil_saturation_pct: number;
}

interface RadarInfo {
  name: string;
  type: string;
  peak_reflectivity_dbz: number;
  status: string;
  echoTop_km: number;
}

export const WeatherForecastWidget: React.FC = () => {
  const { tx } = useI18n();
  const [stations, setStations] = useState<ForecastStation[]>([]);
  const [radars, setRadars] = useState<RadarInfo[]>([]);
  const [synopticText, setSynopticText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ner/weather-forecast');
      if (res.ok) {
        const data = await res.json();
        setStations(data.stations || []);
        setRadars(data.dopplerRadars || []);
        setSynopticText(data.synopticOverview || '');
      }
    } catch (e) {
      console.warn('Failed to fetch IMD weather data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  return (
    <div className="card overflow-hidden flex flex-col space-y-3 p-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            <CloudLightning className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tx('IMD Weather-Linked Landslide Forecast (72h Model)')}
            </h3>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              {tx('Antecedent Rainfall Index (ARI-7) · Doppler Radar Reflectivity')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchWeather}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          title={tx('Refresh Radar Feeds')}
        >
          <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin text-blue-600")} />
        </button>
      </div>

      {/* Synoptic Overview Banner */}
      {synopticText && (
        <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200 flex items-center gap-2">
          <Wind className="w-4 h-4 text-blue-600 shrink-0" />
          <span><strong>{tx('Synoptic Guidance:')}</strong> {tx(synopticText)}</span>
        </div>
      )}

      {/* Radar Reflectivity Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {radars.map((rad, i) => (
          <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-[11px] text-slate-900 dark:text-white">{rad.name}</div>
              <div className="text-[10px] text-slate-500">{rad.type} &middot; Echo Top: {rad.echoTop_km}km</div>
            </div>
            <div className="text-right">
              <span className={clsx(
                "px-2 py-0.5 rounded-md font-mono font-bold text-[11px]",
                rad.peak_reflectivity_dbz >= 50 ? "bg-red-500 text-white" : rad.peak_reflectivity_dbz >= 40 ? "bg-amber-500 text-white" : "bg-blue-500 text-white"
              )}>
                {rad.peak_reflectivity_dbz} dBZ
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Station Forecasts Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {stations.map((st, idx) => {
          const isCritical = st.alert_level === 'RED';
          const isOrange = st.alert_level === 'ORANGE';

          return (
            <div 
              key={idx} 
              className={clsx(
                "p-3 rounded-xl border text-xs flex flex-col justify-between transition-all",
                isCritical 
                  ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40" 
                  : isOrange 
                    ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40" 
                    : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-white/5"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[170px]">
                    {st.station}
                  </span>
                  <span className={clsx(
                    "px-2 py-0.2 rounded text-[9.5px] font-mono font-bold uppercase",
                    isCritical ? "bg-red-600 text-white" : isOrange ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
                  )}>
                    {st.alert_level} ALERT
                  </span>
                </div>

                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mb-2">
                  {st.state} &middot; Saturation: <strong className="text-slate-800 dark:text-slate-200">{st.soil_saturation_pct}%</strong>
                </div>

                {/* ARI-7 Gauge Bar */}
                <div className="space-y-1 my-2">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-600 dark:text-slate-400">ARI-7 Index:</span>
                    <strong className={isCritical ? "text-rose-600 font-bold" : isOrange ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                      {st.ari7_pct}%
                    </strong>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={clsx("h-full rounded-full transition-all duration-500", isCritical ? "bg-red-600" : isOrange ? "bg-amber-500" : "bg-emerald-500")}
                      style={{ width: `${Math.min(st.ari7_pct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Precipitation Forecast Breakdown */}
                <div className="grid grid-cols-3 gap-1 bg-white/80 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200/60 dark:border-white/5 text-[10px] text-center font-mono">
                  <div>
                    <div className="text-slate-400 text-[9px]">24h Rain</div>
                    <div className="font-bold text-blue-700 dark:text-blue-300 mt-0.5">{st.rain_24h_forecast_mm} mm</div>
                  </div>
                  <div className="border-x border-slate-100 dark:border-white/10">
                    <div className="text-slate-400 text-[9px]">48h Rain</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{st.rain_48h_forecast_mm} mm</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[9px]">72h Rain</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{st.rain_72h_forecast_mm} mm</div>
                  </div>
                </div>
              </div>

              {/* Cloudburst indicator tag */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 dark:text-slate-400">Cloudburst Surge:</span>
                <span className={clsx(
                  "font-bold uppercase",
                  st.cloudburst_risk === 'CRITICAL' ? 'text-red-600' : st.cloudburst_risk === 'HIGH' ? 'text-amber-600' : 'text-slate-600 dark:text-slate-400'
                )}>
                  {st.cloudburst_risk}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeatherForecastWidget;
