import os
import json
import time
import logging
from typing import Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session

from app.config import settings

logger = logging.getLogger("landguard.xgboost_client")

CONFIG_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "xgboost_config.json",
)


class XGBoostClientService:
    """
    Manages external XGBoost server connectivity, dynamic reconfiguration,
    health probes, and real-time cloud telemetry ingestion.
    """

    def __init__(self):
        self._last_synced_at: Optional[str] = None
        self._last_error: Optional[str] = None
        self._cached_server_info: Optional[Dict[str, Any]] = None
        self._ensure_config()

    def _clean_url(self, raw_url: str) -> str:
        """Strips /docs, /openapi.json, and trailing slashes for clean base URL."""
        cleaned = raw_url.strip()
        if not cleaned:
            return ""
        if not cleaned.startswith("http://") and not cleaned.startswith("https://"):
            cleaned = f"http://{cleaned}"
        cleaned = cleaned.rstrip("/")
        for suffix in ["/docs", "/openapi.json"]:
            if cleaned.endswith(suffix):
                cleaned = cleaned[:-len(suffix)].rstrip("/")
        return cleaned

    def _ensure_config(self):
        """Initializes default configuration file if not already present."""
        if not os.path.exists(CONFIG_FILE_PATH):
            default_url = getattr(settings, "XGBOOST_API_URL", "").strip() or "http://34.131.240.174:8000"
            init_data = {
                "api_url": self._clean_url(default_url),
                "timeout_seconds": float(getattr(settings, "XGBOOST_TIMEOUT_SECONDS", 5.0)),
                "auto_stream_enabled": False,
                "auto_stream_interval_seconds": 5,
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            try:
                with open(CONFIG_FILE_PATH, "w") as f:
                    json.dump(init_data, f, indent=2)
            except Exception as e:
                logger.warning(f"Failed to create {CONFIG_FILE_PATH}: {e}")

    def get_config(self) -> Dict[str, Any]:
        """Returns current dynamic XGBoost server configuration."""
        self._ensure_config()
        try:
            with open(CONFIG_FILE_PATH, "r") as f:
                data = json.load(f)
                data["api_url"] = self._clean_url(data.get("api_url", ""))
                data["last_synced_at"] = self._last_synced_at
                data["last_error"] = self._last_error
                data["server_info"] = self._cached_server_info
                return data
        except Exception as e:
            logger.error(f"Failed reading {CONFIG_FILE_PATH}: {e}")
            return {
                "api_url": self._clean_url(getattr(settings, "XGBOOST_API_URL", "http://34.131.240.174:8000")),
                "timeout_seconds": 5.0,
                "auto_stream_enabled": False,
                "auto_stream_interval_seconds": 5,
                "last_synced_at": self._last_synced_at,
                "last_error": str(e),
                "server_info": None,
            }

    def save_config(
        self,
        api_url: str,
        timeout_seconds: float = 5.0,
        auto_stream_enabled: bool = False,
        auto_stream_interval_seconds: int = 5,
    ) -> Dict[str, Any]:
        """Saves updated server configuration to persistent store and updates runtime."""
        cleaned_url = self._clean_url(api_url)
        config_data = {
            "api_url": cleaned_url,
            "timeout_seconds": max(1.0, float(timeout_seconds)),
            "auto_stream_enabled": bool(auto_stream_enabled),
            "auto_stream_interval_seconds": max(2, int(auto_stream_interval_seconds)),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        try:
            with open(CONFIG_FILE_PATH, "w") as f:
                json.dump(config_data, f, indent=2)
            logger.info(f"Saved persistent XGBoost server configuration: {cleaned_url}")
        except Exception as e:
            logger.error(f"Failed to write {CONFIG_FILE_PATH}: {e}")

        # Update runtime Settings instance
        settings.XGBOOST_API_URL = cleaned_url
        settings.XGBOOST_TIMEOUT_SECONDS = config_data["timeout_seconds"]

        # Update GrayBoxRiskEngine active predictor
        try:
            from app.services.risk_engine.risk_engine import risk_engine, RemoteXGBoostPredictor
            if cleaned_url:
                risk_engine.ml_predictor = RemoteXGBoostPredictor(
                    cleaned_url,
                    timeout=config_data["timeout_seconds"],
                )
                logger.info(f"Re-bound risk_engine predictor to {cleaned_url}")
        except Exception as e:
            logger.warning(f"Could not re-bind risk_engine predictor: {e}")

        return self.get_config()

    async def test_connection(self, raw_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Tests connectivity to a given XGBoost Server IP / URL.
        Measures latency, verifies endpoints (/api/health, /api/demo/telemetry, /predict).
        """
        target_url = self._clean_url(raw_url or self.get_config().get("api_url", ""))
        if not target_url:
            return {
                "ok": False,
                "error": "No IP or URL provided. Please enter a valid server URL (e.g. http://34.131.240.174:8000)",
                "target_url": "",
            }

        start_time = time.time()
        diagnostics: Dict[str, Any] = {
            "ok": False,
            "target_url": target_url,
            "latency_ms": 0,
            "server_title": None,
            "server_version": None,
            "health_status": None,
            "model_version": None,
            "has_telemetry_stream": False,
            "has_predict_endpoint": False,
            "sample_telemetry": None,
            "error": None,
        }

        async with httpx.AsyncClient(timeout=4.0) as client:
            # 1. Probe health / root
            try:
                health_resp = await client.get(f"{target_url}/api/health")
                if health_resp.status_code == 200:
                    diagnostics["health_status"] = health_resp.json().get("status", "healthy")
                else:
                    root_resp = await client.get(f"{target_url}/")
                    diagnostics["health_status"] = "online" if root_resp.status_code == 200 else f"HTTP {root_resp.status_code}"
            except Exception as e:
                diagnostics["error"] = f"Could not reach {target_url}: {e}"
                diagnostics["latency_ms"] = int((time.time() - start_time) * 1000)
                self._last_error = str(e)
                return diagnostics

            # Measure latency
            diagnostics["latency_ms"] = max(1, int((time.time() - start_time) * 1000))

            # 2. Probe openapi / title info
            try:
                info_resp = await client.get(f"{target_url}/openapi.json")
                if info_resp.status_code == 200:
                    info_data = info_resp.json()
                    diagnostics["server_title"] = info_data.get("info", {}).get("title")
                    diagnostics["server_version"] = info_data.get("info", {}).get("version")
            except Exception:
                pass

            # 3. Probe telemetry stream (/api/demo/telemetry)
            try:
                stream_resp = await client.get(f"{target_url}/api/demo/telemetry")
                if stream_resp.status_code == 200:
                    stream_data = stream_resp.json()
                    diagnostics["has_telemetry_stream"] = True
                    diagnostics["sample_telemetry"] = stream_data.get("telemetry")
                    diagnostics["model_version"] = stream_data.get("risk", {}).get("model_version")
                    diagnostics["sample_risk"] = stream_data.get("risk")
            except Exception:
                pass

            # 4. Probe /predict endpoint
            try:
                predict_resp = await client.post(
                    f"{target_url}/predict",
                    json={"soil_moisture": 50.0, "rainfall": 10.0, "rainfall_24h": 30.0, "slope_angle": 25.0, "tilt_rate": 0.01, "factor_of_safety": 1.2},
                )
                if predict_resp.status_code in [200, 201]:
                    diagnostics["has_predict_endpoint"] = True
                    if not diagnostics["model_version"]:
                        diagnostics["model_version"] = predict_resp.json().get("model_version")
            except Exception:
                pass

            diagnostics["ok"] = True
            self._last_error = None
            self._cached_server_info = {
                "title": diagnostics["server_title"] or "TerraWarn AI API",
                "version": diagnostics["server_version"] or "0.1.0",
                "model_version": diagnostics["model_version"] or "prototype-xgboost-v1",
                "latency_ms": diagnostics["latency_ms"],
                "last_tested_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }

        return diagnostics

    async def fetch_and_ingest(self, db: Session) -> Dict[str, Any]:
        """
        Fetches live reading from the configured XGBoost server, runs physics + ML pipeline,
        persists to database, and broadcasts to connected frontend WebSocket clients.
        """
        cfg = self.get_config()
        target_url = cfg.get("api_url")
        if not target_url:
            raise ValueError("No XGBoost server URL configured. Set it in Settings.")

        endpoint = f"{target_url}/api/demo/telemetry"
        async with httpx.AsyncClient(timeout=cfg.get("timeout_seconds", 5.0)) as client:
            resp = await client.get(endpoint)
            resp.raise_for_status()
            cloud_data = resp.json()

        telem = cloud_data.get("telemetry", {})
        risk = cloud_data.get("risk", {})

        from app.schemas.telemetry import TelemetryCreate
        from app.services.telemetry_service import telemetry_service

        telemetry_in = TelemetryCreate(
            node_id=telem.get("node_id", "LG-N01"),
            soil_moisture=float(telem.get("soil_moisture", 45.0)),
            rainfall=float(telem.get("rainfall_1h", 0.0)),
            rainfall_24h=float(telem.get("rainfall_24h", 0.0)),
            rain_detected=float(telem.get("rainfall_1h", 0.0)) > 0.5,
            tilt_angle=float(telem.get("tilt_angle", 20.0)),
            tilt_rate=float(telem.get("tilt_rate", 0.0)),
            battery=92.0,
            rssi=-62,
        )

        telemetry, risk_result, alert = await telemetry_service.process_and_store_telemetry(
            db=db,
            data=telemetry_in,
        )

        # Overwrite with external XGBoost model risk attributes
        if risk:
            raw_score = float(risk.get("risk_score", 0.0))
            risk_result.risk_score = raw_score / 100.0 if raw_score > 1.0 else raw_score
            risk_result.risk_level = risk.get("risk_level", risk_result.risk_level)
            risk_result.model_version = risk.get("model_version", "prototype-xgboost-v1")
            db.commit()

        self._last_synced_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        return {
            "status": "success",
            "source": endpoint,
            "telemetry_id": telemetry.id,
            "node_id": telemetry.node_id,
            "cloud_telemetry": telem,
            "cloud_risk": risk,
            "factor_of_safety": risk_result.factor_of_safety,
            "alert_generated": alert is not None,
            "synced_at": self._last_synced_at,
        }


# Singleton service instance
xgboost_client = XGBoostClientService()
