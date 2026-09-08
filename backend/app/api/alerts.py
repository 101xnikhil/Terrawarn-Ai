from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.database import get_db
from app.schemas.alert import AlertResponse, AlertListResponse, AlertAcknowledgeResponse
from app.services.alert_service import alert_service
from app.services.alert_dispatcher import alert_dispatcher
from app.services.sms_service import sms_service
from app.config import settings

router = APIRouter(prefix="/alerts", tags=["Alerts"])


class SendSMSRequest(BaseModel):
    to_phone: str = "+919506758710"
    message: Optional[str] = None
    severity: Optional[str] = "CRITICAL"
    custom_action: Optional[str] = None
    node_id: Optional[str] = "LG-N01"
    alert_id: Optional[int] = None


class SmsAlertsToggleRequest(BaseModel):
    enabled: bool = True


def format_alert_response(alert) -> AlertResponse:
    reasons = [r.strip() for r in alert.trigger_reason.split(";")] if alert.trigger_reason else []
    return AlertResponse(
        id=alert.id,
        alert_id=f"ALT-{alert.id}",
        node_id=alert.node_id,
        risk_assessment_id=alert.risk_assessment_id,
        timestamp=alert.timestamp,
        severity=alert.severity,
        title=alert.title,
        message=alert.message,
        risk_score=alert.risk_score,
        risk_level=alert.risk_level,
        trigger_reason=alert.trigger_reason or "; ".join(reasons),
        trigger_reasons=reasons,
        acknowledged=alert.acknowledged,
        acknowledged_at=alert.acknowledged_at,
        created_at=getattr(alert, "created_at", None) or alert.timestamp,
        sms_sent=getattr(alert, "sms_sent", False) or False,
        sms_sent_at=getattr(alert, "sms_sent_at", None),
        sms_error=getattr(alert, "sms_error", None),
    )


@router.get("", response_model=AlertListResponse)
def list_alerts(
    severity: Optional[str] = Query(default=None, description="Filter by severity: critical, high, warning, info"),
    risk_level: Optional[str] = Query(default=None, description="Filter by risk level: LOW, MODERATE, HIGH, CRITICAL"),
    node_id: Optional[str] = Query(default=None, description="Filter by node ID"),
    acknowledged: Optional[bool] = Query(default=None, description="Filter by acknowledgment status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve safety incidents and alarm logs (Alert History)."""
    alerts = alert_service.get_alerts(
        db=db,
        severity=severity,
        risk_level=risk_level,
        node_id=node_id,
        acknowledged=acknowledged,
        limit=limit,
        offset=offset,
    )
    unack_count = alert_service.get_unacknowledged_count(db=db)
    
    formatted_alerts = [format_alert_response(a) for a in alerts]
    
    return AlertListResponse(
        count=len(formatted_alerts),
        unacknowledged_count=unack_count,
        alerts=formatted_alerts,
    )


@router.post("/sms/send", status_code=status.HTTP_200_OK)
async def send_emergency_sms(
    payload: SendSMSRequest,
    db: Session = Depends(get_db),
):
    """
    Directly triggers the actual transmission of an emergency SMS text message
    to a designated phone number or civil authority responder list.
    """
    alert_payload = None
    if payload.alert_id:
        alert = alert_service.get_alert_by_id(db=db, alert_id=payload.alert_id)
        if alert:
            alert_payload = {
                "alert_id": f"ALT-{alert.id}",
                "node_id": alert.node_id,
                "timestamp": alert.timestamp.isoformat(),
                "severity": alert.severity,
                "risk_score": alert.risk_score,
                "risk_level": alert.risk_level,
                "trigger_reasons": alert.trigger_reason,
            }

    if not alert_payload:
        alert_payload = {
            "node_id": payload.node_id or "LG-N01",
            "risk_level": payload.severity.upper() if payload.severity else "CRITICAL",
            "risk_score": 0.88 if (payload.severity and payload.severity.upper() == "CRITICAL") else 0.65,
            "trigger_reasons": ["Pore saturation elevated > 75%", "Active slope displacement detected"],
        }

    dispatch_report = await alert_dispatcher.send_manual_sms(
        to_phone=payload.to_phone,
        message=payload.message,
        severity=payload.severity or "CRITICAL",
        custom_action=payload.custom_action,
        alert_payload=alert_payload,
    )

    return {
        "status": "success",
        "message": "Emergency SMS dispatched",
        "dispatch_report": dispatch_report,
    }


@router.get("/sms/history", status_code=status.HTTP_200_OK)
def get_sms_dispatch_history(limit: int = Query(default=20, ge=1, le=100)):
    """Returns recent actual and simulated SMS transmission logs."""
    history = alert_dispatcher.get_sms_history(limit=limit)
    return {
        "count": len(history),
        "history": history,
    }


@router.get("/sms/config", status_code=status.HTTP_200_OK)
def get_sms_gateway_configuration():
    """Returns status and capabilities of the active SMS gateway subsystem."""
    has_twilio = bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER)
    has_fast2sms = bool(settings.FAST2SMS_API_KEY)
    has_webhook = bool(settings.CUSTOM_SMS_GATEWAY_URL)
    
    active_mode = "simulated_console"
    if has_twilio:
        active_mode = "twilio_rest_api"
    elif has_fast2sms:
        active_mode = "fast2sms_api"
    elif has_webhook:
        active_mode = "custom_webhook"

    return {
        "sms_enabled": settings.SMS_ENABLED,
        "active_mode": active_mode,
        "provider_setting": settings.SMS_PROVIDER,
        "providers_configured": {
            "twilio": has_twilio,
            "fast2sms": has_fast2sms,
            "custom_webhook": has_webhook,
            "simulator": True,
        },
        "emergency_contacts": settings.emergency_phones,
    }


@router.get("/sms-status", status_code=status.HTTP_200_OK)
def get_live_sms_status():
    """
    Returns live Fast2SMS Quick Route status and daily quota utilization.
    Does not expose sensitive API keys or phone numbers.
    """
    return sms_service.get_sms_status()


@router.post("/sms-status", status_code=status.HTTP_200_OK)
def set_live_sms_status(payload: SmsAlertsToggleRequest):
    """Enable or disable Fast2SMS automatic dispatch at runtime."""
    settings.SMS_ALERTS_ENABLED = bool(payload.enabled)
    settings.SMS_ENABLED = bool(payload.enabled)
    return sms_service.get_sms_status()


@router.post("/test-sms", status_code=status.HTTP_200_OK)
async def send_test_sms():
    """
    Manual dev test endpoint to verify Fast2SMS Quick Route live delivery.
    Dispatches a single test SMS to ALERT_SMS_RECIPIENTS.
    """
    recipients = settings.alert_sms_recipients_list
    if not recipients:
        return {
            "status": "error",
            "message": "No recipients configured in ALERT_SMS_RECIPIENTS",
            "recipients_count": 0,
        }

    test_message = "[TERRAWARN DEV TEST] Fast2SMS Quick Route live test dispatch."
    dispatch_res = await sms_service.send_sms(numbers=recipients, message=test_message)
    return {
        "status": "success" if dispatch_res.get("sent") else "failed",
        "recipients_count": len(recipients),
        "result": dispatch_res,
    }


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert_detail(alert_id: int, db: Session = Depends(get_db)):
    """Retrieve full details for a single alert."""
    alert = alert_service.get_alert_by_id(db=db, alert_id=alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found",
        )
    return format_alert_response(alert)


@router.post("/{alert_id}/acknowledge", response_model=AlertAcknowledgeResponse)
@router.post("/{alert_id}/ack", response_model=AlertAcknowledgeResponse)
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    """Acknowledge a safety alarm / incident."""
    alert = alert_service.acknowledge_alert(db=db, alert_id=alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found",
        )
    return AlertAcknowledgeResponse(
        id=alert.id,
        acknowledged=alert.acknowledged,
        acknowledged_at=alert.acknowledged_at,
        message="Incident acknowledged and logged",
    )
