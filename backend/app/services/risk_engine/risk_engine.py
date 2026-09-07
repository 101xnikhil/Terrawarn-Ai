from typing import Dict, Any, List, Optional
import os
import json
import logging

from app.services.risk_engine.config import RiskEngineConfig, default_config
from app.services.risk_engine.physics import GeotechnicalPhysicsEngine
from app.services.risk_engine.features import FeatureEngineeringPipeline

logger = logging.getLogger("landguard.risk_engine")


class RemoteXGBoostPredictor:
    """
    HTTP Client adapter for external XGBoost Server APIs.
    Communicates via REST with external microservices (FastAPI, Flask, Cloud Run, Docker).
    """
    def __init__(self, api_url: str, timeout: float = 4.0):
        self.api_url = api_url.strip()
        self.timeout = timeout
        self.model_version = "remote-xgboost-api"

    def predict(
        self,
        soil_moisture: float,
        rainfall: float,
        rainfall_24h: float,
        slope_angle: float,
        tilt_rate: float,
        factor_of_safety: float,
    ) -> Dict[str, Any]:
        import httpx
        payload = {
            "soil_moisture": float(soil_moisture),
            "rainfall": float(rainfall),
            "rainfall_24h": float(rainfall_24h),
            "slope_angle": float(slope_angle),
            "tilt_rate": float(tilt_rate),
            "factor_of_safety": float(factor_of_safety),
            "features": [
                float(soil_moisture),
                float(rainfall),
                float(rainfall_24h),
                float(slope_angle),
                float(tilt_rate),
                float(factor_of_safety),
            ],
        }
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(self.api_url, json=payload)
            resp.raise_for_status()
            data = resp.json()

            raw_score = (
                data.get("risk_score_normalized")
                if data.get("risk_score_normalized") is not None
                else (
                    data.get("risk_score")
                    if data.get("risk_score") is not None
                    else data.get("probability", data.get("risk_prob", 0.5))
                )
            )
            score_norm = float(raw_score)
            if score_norm > 1.0:
                score_norm = round(score_norm / 100.0, 3)
            else:
                score_norm = round(score_norm, 3)

            risk_level = data.get("risk_level")
            if not risk_level:
                if score_norm >= 0.75 or factor_of_safety < 1.0:
                    risk_level = "CRITICAL"
                elif score_norm >= 0.50 or factor_of_safety < 1.2:
                    risk_level = "HIGH"
                elif score_norm >= 0.25:
                    risk_level = "MODERATE"
                else:
                    risk_level = "LOW"

            return {
                "risk_score": int(round(score_norm * 100)),
                "risk_score_normalized": score_norm,
                "risk_level": risk_level,
                "confidence": float(data.get("confidence", 0.88)),
                "factor_of_safety": float(data.get("factor_of_safety", factor_of_safety)),
                "top_factors": data.get("top_factors") or data.get("shap_values") or [],
                "model_version": data.get("model_version", self.model_version),
            }


class GrayBoxRiskEngine:
    """
    Modular Gray-Box Landslide Hazard Risk Engine.
    
    Architecture:
    Layer 1: Geotechnical Physics Layer (Infinite Slope FoS + Limit Equilibrium Mechanics)
    Layer 2: Hydro-Kinematic Feature Engineering Pipeline
    Layer 3: Hybrid Risk Scoring & Categorical Hazard Classification
    Layer 4: Explainable AI Attribution (SHAP-compatible contribution breakdown)
    Layer 5: Machine Learning (Gradient Boosted Trees) Integration Layer
    """

    def __init__(self, config: Optional[RiskEngineConfig] = None):
        self.config = config or default_config
        self.physics = GeotechnicalPhysicsEngine(self.config.geotechnical)
        self.features = FeatureEngineeringPipeline()
        self.ml_predictor = None
        self._init_ml_predictor()

    def _init_ml_predictor(self):
        """Initializes ML predictor: prefers remote XGBoost API if configured, otherwise local bundle."""
        try:
            from app.config import settings
            remote_url = getattr(settings, "XGBOOST_API_URL", "").strip()
            if remote_url:
                self.ml_predictor = RemoteXGBoostPredictor(
                    remote_url,
                    timeout=getattr(settings, "XGBOOST_TIMEOUT_SECONDS", 4.0),
                )
                logger.info(f"Connected GrayBoxRiskEngine to Remote XGBoost API at {remote_url}")
                return
        except Exception as e:
            logger.warning(f"Note on XGBOOST_API_URL config: {e}")

        try:
            from ml.inference.predictor import predictor
            if predictor.model is not None:
                self.ml_predictor = predictor
                logger.info("Successfully connected local ML predictor to GrayBoxRiskEngine.")
        except Exception as e:
            logger.info(f"ML predictor optional initialization note: {e}")

    def register_ml_model(self, model: Any):
        """Allows plugging in an external trained model downstream."""
        self.ml_predictor = model
        logger.info(f"Registered external downstream ML model: {type(model).__name__}")

    def evaluate(
        self,
        soil_moisture_pct: float,
        rainfall_pct: float = 0.0,
        rainfall_24h_mm: float = 0.0,
        slope_angle_deg: Optional[float] = None,
        tilt_angle_deg: Optional[float] = None,
        tilt_rate_deg_min: Optional[float] = None,
        tilt_rate: Optional[float] = None,
        recent_scores: Optional[List[float]] = None,
        historical_readings: Optional[List[Dict[str, float]]] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Executes the full gray-box risk pipeline:
        1. Calculates limit equilibrium Factor of Safety
        2. Generates hydro-kinematic & interaction feature vector
        3. Computes normalized composite risk probability score (and ML inference if available)
        4. Classifies categorical hazard tier (LOW/MODERATE/HIGH/CRITICAL)
        5. Computes trend trajectory and SHAP feature attributions
        """
        # Resolve aliased argument names
        angle = slope_angle_deg if slope_angle_deg is not None else (tilt_angle_deg if tilt_angle_deg is not None else 20.0)
        rate = tilt_rate_deg_min if tilt_rate_deg_min is not None else (tilt_rate if tilt_rate is not None else 0.0)

        # Step 1: Physics Limit Equilibrium Layer
        physics_metrics = self.physics.compute_stability_metrics(
            soil_moisture_pct=soil_moisture_pct,
            slope_angle_deg=angle,
        )
        fos = physics_metrics["factor_of_safety"]

        # Step 2: Feature Engineering Layer
        feature_vector = self.features.extract_features(
            soil_moisture_pct=soil_moisture_pct,
            rainfall_pct=rainfall_pct,
            rainfall_24h_mm=rainfall_24h_mm,
            slope_angle_deg=angle,
            tilt_rate_deg_min=rate,
            factor_of_safety=fos,
            historical_readings=historical_readings,
        )

        # Step 3: Scoring Layer
        w = self.config.weights
        heuristic_score = (
            feature_vector["moisture_norm"] * w.get("soil_moisture", 0.24)
            + feature_vector["rain_24h_norm"] * w.get("rainfall_24h", 0.20)
            + feature_vector["fos_vulnerability_index"] * w.get("factor_of_safety", 0.24)
            + feature_vector["tilt_norm"] * w.get("tilt_angle", 0.12)
            + feature_vector["rain_rate_norm"] * w.get("rainfall_rate", 0.08)
            + feature_vector["tilt_rate_norm"] * w.get("tilt_rate", 0.07)
            + feature_vector["moisture_rain_interaction"] * w.get("interaction_moisture_rain", 0.05)
        )

        confidence = 0.88
        top_factors = []
        shap_values = []

        # If ML predictor is active, invoke inference and real SHAP attributions
        if self.ml_predictor is not None:
            try:
                ml_res = self.ml_predictor.predict(
                    soil_moisture=soil_moisture_pct,
                    rainfall=rainfall_pct,
                    rainfall_24h=rainfall_24h_mm,
                    slope_angle=angle,
                    tilt_rate=rate,
                    factor_of_safety=fos,
                )
                ml_score = ml_res["risk_score_normalized"]
                confidence = ml_res["confidence"]
                top_factors = ml_res.get("top_factors", [])
                # Blend physics heuristic & ML model prediction (50% / 50%)
                composite_score = 0.50 * heuristic_score + 0.50 * ml_score
            except Exception as e:
                logger.warning(f"ML Predictor evaluation fallback: {e}")
                composite_score = heuristic_score
        else:
            composite_score = heuristic_score

        # Enforce boundary: if FoS < 1.0, minimum risk score is 0.75
        if fos < 1.00:
            composite_score = max(0.75, composite_score)

        risk_score = round(max(0.0, min(1.0, composite_score)), 3)

        # Step 4: Hazard Tier Classification
        thresholds = self.config.thresholds
        if risk_score >= thresholds.score_critical_limit or fos <= thresholds.fos_critical_limit:
            risk_level = "CRITICAL"
        elif risk_score >= thresholds.score_high_limit or fos <= thresholds.fos_high_limit:
            risk_level = "HIGH"
        elif risk_score >= thresholds.score_moderate_limit or fos <= thresholds.fos_moderate_limit:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        # Step 5: Slope Movement Trend Trajectory
        trend = "stable"
        if recent_scores and len(recent_scores) >= 3:
            avg_recent = sum(recent_scores[-5:]) / len(recent_scores[-5:])
            if risk_score > avg_recent + 0.03:
                trend = "rising"
            elif risk_score < avg_recent - 0.03:
                trend = "falling"

        # Step 6: Format SHAP-compatible feature attributions
        if not shap_values and top_factors:
            shap_values = [
                {
                    "feature": f["feature"],
                    "display_name": f["display_name"],
                    "value": f["raw_value"],
                    "impact": f["impact"],
                    "contribution": f["contribution"],
                }
                for f in top_factors
            ]
        elif not shap_values:
            shap_values = [
                {
                    "feature": "soil_moisture",
                    "display_name": "Volumetric Soil Moisture",
                    "value": feature_vector["soil_moisture_pct"],
                    "impact": "positive" if feature_vector["soil_moisture_pct"] > 50 else "negative",
                    "contribution": round(feature_vector["moisture_norm"] * w.get("soil_moisture", 0.24) - 0.04, 3),
                },
                {
                    "feature": "rainfall_24h",
                    "display_name": "24h Cumulative Precipitation",
                    "value": feature_vector["rainfall_24h_mm"],
                    "impact": "positive" if feature_vector["rainfall_24h_mm"] > 30 else "negative",
                    "contribution": round(feature_vector["rain_24h_norm"] * w.get("rainfall_24h", 0.20) - 0.03, 3),
                },
                {
                    "feature": "factor_of_safety",
                    "display_name": "Factor of Safety (FoS)",
                    "value": feature_vector["factor_of_safety"],
                    "impact": "positive" if fos < 1.2 else "negative",
                    "contribution": round(feature_vector["fos_vulnerability_index"] * w.get("factor_of_safety", 0.24) - 0.03, 3),
                },
                {
                    "feature": "slope_angle",
                    "display_name": "Slope Dip Angle",
                    "value": feature_vector["slope_angle_deg"],
                    "impact": "positive" if feature_vector["slope_angle_deg"] > 25 else "negative",
                    "contribution": round(feature_vector["tilt_norm"] * w.get("tilt_angle", 0.12) - 0.02, 3),
                },
                {
                    "feature": "rainfall_rate",
                    "display_name": "Rainfall Intensity",
                    "value": feature_vector["rainfall_pct"],
                    "impact": "positive" if feature_vector["rainfall_pct"] > 20 else "negative",
                    "contribution": round(feature_vector["rain_rate_norm"] * w.get("rainfall_rate", 0.08) - 0.01, 3),
                },
                {
                    "feature": "tilt_rate",
                    "display_name": "Creep Displacement Velocity",
                    "value": abs(feature_vector["tilt_rate_deg_min"]),
                    "impact": "positive" if abs(feature_vector["tilt_rate_deg_min"]) > 0.01 else "negative",
                    "contribution": round(feature_vector["tilt_rate_norm"] * w.get("tilt_rate", 0.07) - 0.01, 3),
                },
            ]
            shap_values.sort(key=lambda s: abs(s["contribution"]), reverse=True)

        return {
            "factor_of_safety": fos,
            "physics_risk_score": risk_score,
            "risk_score": risk_score,
            "physics_risk_level": risk_level,
            "risk_level": risk_level,
            "confidence": confidence,
            "trend": trend,
            "features": feature_vector,
            "shap_values": shap_values,
            "top_factors": top_factors or shap_values,
            "stability_details": physics_metrics,
            "model_version": self.config.model_version,
            "model_name": self.config.model_name,
            "is_synthetic_demonstration": True,
        }

    def compute_risk(self, *args, **kwargs):
        return self.evaluate(*args, **kwargs)


# Global singleton instance
risk_engine = GrayBoxRiskEngine()
