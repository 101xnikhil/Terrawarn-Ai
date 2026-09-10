from fastapi import APIRouter, Depends, HTTPException, Query, Header, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.database import get_db
from app.schemas.telemetry import TelemetryCreate, TelemetryResponse, TelemetryHistoryResponse
from app.schemas.risk import RiskResponse
from app.services.telemetry_service import telemetry_service
from app.services.security_service import security_service
from app.services.mock_generator import mock_generator

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(
    payload: TelemetryCreate,
    request: Request,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    """
    Ingest a telemetry packet from an ESP32 LoRa Gateway or simulation feeder.
    Executes:
    1. Edge security & API key validation
    2. Device authorization & replay attack verification (Phase 14)
    3. Persist reading -> evaluate physics risk -> check alerts -> broadcast WebSocket.
    """
    client_ip = request.client.host if request.client else None

    # 1. API Key Check
    if not security_service.validate_api_key(x_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Gateway API Key (X-API-Key)",
        )

    # 2. Cybersecurity & Replay Attack Prevention
    is_allowed, action, reason = security_service.check_telemetry_security(
        db=db,
        node_id=payload.node_id,
        seq_num=payload.seq_num,
        client_ip=client_ip,
    )

    if not is_allowed:
        if action == "REJECTED_REPLAY":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"REJECT — REPLAY DETECTED: {reason}",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"REJECT — UNAUTHORIZED: {reason}",
        )

    # 3. Process and Store
    telemetry, risk_result, alert = await telemetry_service.process_and_store_telemetry(
        db=db,
        data=payload,
    )

    shap_data = json.loads(risk_result.shap_values) if risk_result.shap_values else None

    return {
        "status": "success",
        "action": action,
        "telemetry_id": telemetry.id,
        "node_id": telemetry.node_id,
        "seq_num": telemetry.seq_num,
        "timestamp": telemetry.timestamp.isoformat(),
        "risk": {
            "id": risk_result.id,
            "factor_of_safety": risk_result.factor_of_safety,
            "risk_score": risk_result.risk_score,
            "risk_level": risk_result.risk_level,
            "confidence": risk_result.confidence,
            "trend": risk_result.trend,
            "shap_values": shap_data,
            "model_version": risk_result.model_version,
        },
        "alert": {
            "id": alert.id,
            "severity": alert.severity,
            "title": alert.title,
            "message": alert.message,
        } if alert else None,
    }


@router.post("/sync", status_code=status.HTTP_200_OK)
async def sync_offline_buffer(
    payload_batch: List[TelemetryCreate],
    request: Request,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    """
    Offline Synchronization Endpoint (Phase 13).
    Flushes cached telemetry frames buffered by the LoRa Gateway during an offline/disconnected period.
    """
    client_ip = request.client.host if request.client else None
    if not security_service.validate_api_key(x_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Gateway API Key (X-API-Key)",
        )

    ingested_count = 0
    rejected_replays = 0
    alerts_triggered = 0

    for item in payload_batch:
        is_allowed, action, _ = security_service.check_telemetry_security(
            db=db,
            node_id=item.node_id,
            seq_num=item.seq_num,
            client_ip=client_ip,
        )
        if not is_allowed:
            if action == "REJECTED_REPLAY":
                rejected_replays += 1
            continue

        telemetry, risk_res, alert = await telemetry_service.process_and_store_telemetry(
            db=db,
            data=item,
        )
        ingested_count += 1
        if alert:
            alerts_triggered += 1

    return {
        "status": "sync_completed",
        "total_received": len(payload_batch),
        "ingested_count": ingested_count,
        "rejected_replays": rejected_replays,
        "alerts_triggered": alerts_triggered,
    }


@router.get("/{node_id}", response_model=TelemetryResponse)
def get_latest_telemetry(node_id: str, db: Session = Depends(get_db)):
    """Retrieve the most recent telemetry packet for a given node."""
    reading = telemetry_service.get_latest_telemetry(db=db, node_id=node_id)
    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No telemetry readings found for node '{node_id}'",
        )
    return reading


@router.get("/{node_id}/history", response_model=TelemetryHistoryResponse)
def get_telemetry_history(
    node_id: str,
    limit: int = Query(default=100, ge=1, le=1000, description="Max readings to return"),
    db: Session = Depends(get_db),
):
    """Retrieve time-series telemetry history for a given node."""
    readings = telemetry_service.get_telemetry_history(db=db, node_id=node_id, limit=limit)
    return TelemetryHistoryResponse(
        node_id=node_id,
        count=len(readings),
        readings=readings,
    )


@router.post("/mock/generate")
async def generate_mock_telemetry(
    scenario: str = Query(default="escalation", description="dry_stable | moderate_rain | heavy_rain | crisis | escalation"),
    count: int = Query(default=1, ge=1, le=50, description="Number of readings to generate"),
    node_id: str = Query(default="TW-N01"),
    db: Session = Depends(get_db),
):
    """Generates synthetic telemetry readings for simulation & testing."""
    results = []
    for _ in range(count):
        mock_generator.node_id = node_id
        reading_payload = mock_generator.generate_reading(scenario=scenario)
        telemetry, risk_res, alert = await telemetry_service.process_and_store_telemetry(
            db=db,
            data=reading_payload,
        )
        results.append({
            "telemetry_id": telemetry.id,
            "soil_moisture": telemetry.soil_moisture,
            "tilt_angle": telemetry.tilt_angle,
            "risk_score": risk_res.risk_score,
            "risk_level": risk_res.risk_level,
            "factor_of_safety": risk_res.factor_of_safety,
            "alert_created": alert.id if alert else None,
        })
    return {"status": "generated", "count": len(results), "readings": results}
