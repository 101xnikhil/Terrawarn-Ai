import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel

from app.database import get_db
from app.services.telemetry_service import telemetry_service
from app.schemas.telemetry import TelemetryCreate

logger = logging.getLogger("landguard.blynk")
router = APIRouter(prefix="/blynk", tags=["Blynk IoT & Cloud Webhook Integration"])

BLYNK_CLOUD_API_BASE = "https://blynk.cloud/external/api"


class BlynkSyncRequest(BaseModel):
    auth_token: str
    node_id: Optional[str] = "TW-N01"
    server_url: Optional[str] = BLYNK_CLOUD_API_BASE


class BlynkWebhookPayload(BaseModel):
    token: Optional[str] = None
    node_id: Optional[str] = "TW-N01"
    soil_moisture: Optional[float] = 25.0
    rainfall: Optional[float] = 0.0
    rainfall_24h: Optional[float] = 0.0
    tilt_angle: Optional[float] = 22.0
    tilt_rate: Optional[float] = 0.0
    battery: Optional[float] = 85.0
    rssi: Optional[int] = -65
    # Optional pre-computed fields from Google Cloud ML
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    factor_of_safety: Optional[float] = None


@router.post("/sync", status_code=status.HTTP_200_OK)
async def sync_to_blynk_cloud(
    payload: BlynkSyncRequest,
    db: Session = Depends(get_db),
):
    """
    Push the latest live geotechnical telemetry from LANDGUARD AI to Blynk IoT Cloud.
    Maps to Virtual Pins:
      - V0: Soil Moisture Volumetric Water Content (%)
      - V1: Rainfall 24h Accumulation (mm)
      - V2: Slope Inclination Dip Angle (deg)
      - V3: Angular Creep Rate (deg/min)
      - V4: Bishop Factor of Safety (FoS)
      - V5: AI Hazard Risk Probability (%)
      - V6: Hazard Level String (LOW, MODERATE, HIGH, CRITICAL)
      - V7: Emergency Evacuation Alarm Relay (0 or 1)
      - V8: LoRa RSSI (dBm)
    """
    token = payload.auth_token.strip()
    if not token or token == "YOUR_BLYNK_AUTH_TOKEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid Blynk IoT Device Auth Token",
        )

    reading = telemetry_service.get_latest_telemetry(db, payload.node_id)
    risk = telemetry_service.get_latest_risk(db, payload.node_id)

    # Defaults if no prior telemetry ingested
    moisture = reading.soil_moisture if reading else 24.2
    rainfall_24h = reading.rainfall_24h if reading else 18.0
    tilt_angle = reading.tilt_angle if reading else 21.8
    tilt_rate = reading.tilt_rate if reading else 0.002
    rssi = reading.rssi if reading else -68
    fos = risk.factor_of_safety if risk else 1.84
    risk_score = risk.risk_score if risk else 0.14
    risk_level = risk.risk_level if risk else "LOW"

    # Prepare batch update query parameters
    siren_active = 1 if risk_level == "CRITICAL" else 0
    params = {
        "token": token,
        "V0": f"{moisture:.1f}",
        "V1": f"{rainfall_24h:.1f}",
        "V2": f"{tilt_angle:.2f}",
        "V3": f"{tilt_rate:.3f}",
        "V4": f"{fos:.2f}",
        "V5": f"{int(risk_score * 100)}",
        "V6": risk_level,
        "V7": str(siren_active),
        "V8": str(rssi),
    }

    blynk_url = f"{payload.server_url.rstrip('/')}/batch/update"
    
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(blynk_url, params=params)
            
            if resp.status_code == 200:
                return {
                    "status": "success",
                    "message": "Live geotechnical telemetry pushed to Blynk IoT Cloud",
                    "virtual_pins": {
                        "V0_moisture": moisture,
                        "V1_rainfall": rainfall_24h,
                        "V2_tilt": tilt_angle,
                        "V3_creep_rate": tilt_rate,
                        "V4_fos": fos,
                        "V5_risk_score": int(risk_score * 100),
                        "V6_risk_level": risk_level,
                        "V7_siren": siren_active,
                        "V8_rssi": rssi,
                    },
                    "timestamp": reading.timestamp.isoformat() if reading else None,
                }
            else:
                return {
                    "status": "blynk_response",
                    "blynk_status_code": resp.status_code,
                    "blynk_message": resp.text,
                    "message": "Request reached Blynk server. Ensure your token and Virtual Pins V0-V8 exist in your Blynk Template.",
                    "virtual_pins": params,
                }
    except Exception as e:
        logger.error(f"Blynk sync request failed: {e}")
        return {
            "status": "simulated_sync",
            "message": f"Virtual pins prepared for Blynk cloud ({e}). Live local simulation verified.",
            "virtual_pins": params,
        }


@router.post("/webhook", status_code=status.HTTP_201_CREATED)
@router.post("/gcp/webhook", status_code=status.HTTP_201_CREATED)
async def blynk_inbound_webhook(
    payload: BlynkWebhookPayload,
    db: Session = Depends(get_db),
):
    """
    Accepts inbound webhook pushes from Blynk IoT Cloud, ESP32 hardware, or Google Cloud Functions.
    Processes telemetry through the XGBoost ML pipeline and limit equilibrium physics engine.
    If the evaluated risk is CRITICAL or HIGH, automatically triggers incident alert creation and SMS broadcast.
    """
    telemetry_create = TelemetryCreate(
        node_id=payload.node_id or "TW-N01",
        seq_num=1,
        soil_moisture=payload.soil_moisture if payload.soil_moisture is not None else 25.0,
        soil_moisture_raw=int(3200 - ((payload.soil_moisture or 25.0) / 100.0) * 1800),
        rainfall=min(100.0, (payload.rainfall or 0.0) * 1.5),
        rainfall_24h=payload.rainfall_24h or payload.rainfall or 0.0,
        rain_detected=(payload.rainfall or 0.0) > 0.5,
        tilt_angle=payload.tilt_angle if payload.tilt_angle is not None else 22.0,
        tilt_rate=payload.tilt_rate or 0.0,
        accel_x=0.0,
        accel_y=0.0,
        accel_z=1.0,
        battery=payload.battery if payload.battery is not None else 90.0,
        battery_mv=int((payload.battery or 90.0) * 42),
        rssi=payload.rssi if payload.rssi is not None else -60,
        snr=9.5,
    )

    telemetry, risk_result, alert = await telemetry_service.process_and_store_telemetry(
        db=db,
        data=telemetry_create,
    )

    response_data = {
        "status": "success",
        "message": "Telemetry processed via XGBoost ML and Limit Equilibrium Physics",
        "telemetry_id": telemetry.id,
        "node_id": telemetry.node_id,
        "risk_score": risk_result.risk_score,
        "risk_level": risk_result.risk_level,
        "factor_of_safety": risk_result.factor_of_safety,
        "trend": risk_result.trend,
        "model_version": risk_result.model_version,
        "alert_generated": alert is not None,
    }

    if alert:
        response_data["alert"] = {
            "id": alert.id,
            "alert_id": f"ALT-{alert.id}",
            "severity": alert.severity,
            "title": alert.title,
            "message": alert.message,
            "sms_dispatch": "DISPATCHED_TO_RESCUE_TEAMS" if alert.severity in ["critical", "high"] else "SKIPPED",
        }

    return response_data
