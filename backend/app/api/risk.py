from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from pydantic import BaseModel, Field

from app.database import get_db
from app.schemas.risk import RiskResponse, RiskHistoryResponse
from app.services.telemetry_service import telemetry_service
from app.models.risk import RiskResult

router = APIRouter(prefix="/risk", tags=["Risk"])


def _format_risk_response(risk: RiskResult) -> RiskResponse:
    shap_data = json.loads(risk.shap_values) if risk.shap_values else None
    feat_data = json.loads(risk.features_json) if risk.features_json else None
    
    return RiskResponse(
        id=risk.id,
        node_id=risk.node_id,
        telemetry_id=risk.telemetry_id,
        timestamp=risk.timestamp,
        factor_of_safety=risk.factor_of_safety,
        risk_score=risk.risk_score,
        risk_level=risk.risk_level,
        confidence=risk.confidence,
        trend=risk.trend,
        shap_values=shap_data,
        features=feat_data,
        model_version=risk.model_version,
    )


class RiskEvaluateRequest(BaseModel):
    soil_moisture: float = Field(default=45.0, description="Volumetric Soil Moisture (%)")
    rainfall: float = Field(default=10.0, description="Rainfall intensity rate (mm/h)")
    rainfall_24h: float = Field(default=35.0, description="Cumulative 24h rainfall (mm)")
    slope_angle: float = Field(default=25.0, description="Slope inclination dip angle (deg)")
    tilt_rate: float = Field(default=0.01, description="Tilt velocity (deg/min)")


@router.get("/status/engine")
def get_ml_engine_status():
    """Retrieve active ML risk engine configuration (Remote XGBoost vs Local ML vs Physics)."""
    from app.config import settings
    from app.services.risk_engine import risk_engine
    
    predictor_type = "heuristic_physics"
    remote_url = getattr(settings, "XGBOOST_API_URL", "")
    if risk_engine.ml_predictor is not None:
        predictor_type = type(risk_engine.ml_predictor).__name__

    return {
        "status": "online",
        "active_predictor": predictor_type,
        "remote_api_configured": bool(remote_url),
        "remote_api_url": remote_url if remote_url else None,
        "timeout_seconds": getattr(settings, "XGBOOST_TIMEOUT_SECONDS", 4.0),
    }


@router.post("/evaluate")
def evaluate_risk_realtime(req: RiskEvaluateRequest):
    """
    On-demand risk prediction endpoint for XGBoost integration testing.
    Evaluates sensor parameters through the active XGBoost/Gray-box pipeline and returns real-time risk scores + SHAP values.
    """
    from app.services.risk_engine import risk_engine
    result = risk_engine.evaluate(
        soil_moisture_pct=req.soil_moisture,
        rainfall_pct=req.rainfall,
        rainfall_24h_mm=req.rainfall_24h,
        slope_angle_deg=req.slope_angle,
        tilt_rate_deg_min=req.tilt_rate,
    )
    return result


@router.get("/{node_id}", response_model=RiskResponse)
def get_latest_risk(node_id: str, db: Session = Depends(get_db)):
    """Retrieve the most recent AI hazard risk assessment for a given node."""
    risk = telemetry_service.get_latest_risk(db=db, node_id=node_id)
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No risk assessments found for node '{node_id}'",
        )
    return _format_risk_response(risk)


@router.get("/{node_id}/history", response_model=RiskHistoryResponse)
def get_risk_history(
    node_id: str,
    limit: int = Query(default=100, ge=1, le=500, description="Max risk assessments to return"),
    db: Session = Depends(get_db),
):
    """Retrieve historical hazard risk trajectory for a given node."""
    assessments = telemetry_service.get_risk_history(db=db, node_id=node_id, limit=limit)
    formatted = [_format_risk_response(r) for r in assessments]
    return RiskHistoryResponse(
        node_id=node_id,
        count=len(formatted),
        assessments=formatted,
    )
