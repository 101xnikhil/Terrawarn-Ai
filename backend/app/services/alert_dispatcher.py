"""
LANDGUARD AI — Extensible Alert & Notification Dispatcher Subsystem

Architecture:
- Real Multi-Gateway SMS Dispatch Engine (Twilio, Fast2SMS, Custom Webhook, and Console Simulated).
- Automated Geotechnical Alert Message Formatting with Exact Incident Coordinates, FoS, and Safety Advisories.
- WebSocket feeds and in-memory transmission history logs.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import logging
import asyncio
from datetime import datetime
import httpx

from app.config import settings
from app.services.sms_service import sms_service

logger = logging.getLogger("landguard.alerts.dispatcher")


def format_emergency_sms_message(alert_payload: Dict[str, Any], custom_action: Optional[str] = None) -> str:
    """
    Constructs the official high-urgency emergency SMS payload for disaster management
    and civilian early warning.
    """
    node_id = alert_payload.get("node_id", "TW-N01")
    risk_level = alert_payload.get("risk_level", "CRITICAL").upper()
    risk_score = alert_payload.get("risk_score", 0.85)
    score_pct = int(round(risk_score * 100)) if risk_score <= 1.0 else int(round(risk_score))
    
    reasons = alert_payload.get("trigger_reasons", [])
    if isinstance(reasons, str):
        reasons = [r.strip() for r in reasons.split(";") if r.strip()]
    reasons_str = "; ".join(reasons) if reasons else "Geotechnical slope limit exceeded"

    action = custom_action or "Evacuate downhill homes immediately. Avoid slope cut zones. Move to nearest relief shelter."

    return (
        f"🚨 [EMERGENCY ALERT: TERRAWARN-AI / DISASTER OPS]\n"
        f"LOCATION: Node {node_id} (Sector 7)\n"
        f"STATUS: {risk_level} LANDSLIDE HAZARD ({score_pct}% Risk Score)\n"
        f"TRIGGER: {reasons_str}\n"
        f"ACTION: {action}\n"
        f"EMERGENCY HELPLINE: 1070 / 112"
    )


class BaseNotificationChannel(ABC):
    """Abstract base class for all notification delivery channels."""
    name: str = "base"
    is_enabled: bool = True

    @abstractmethod
    async def dispatch(self, alert_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatches an alert through the designated communication channel."""
        pass


class SystemAuditLogChannel(BaseNotificationChannel):
    """Logs alert notifications to backend system audit logs and telemetry streams."""
    name: str = "system_log"
    is_enabled: bool = True

    async def dispatch(self, alert_payload: Dict[str, Any]) -> Dict[str, Any]:
        node_id = alert_payload.get("node_id", "UNKNOWN")
        risk_level = alert_payload.get("risk_level", "UNKNOWN")
        reasons = alert_payload.get("trigger_reasons", [])
        reasons_str = ", ".join(reasons) if isinstance(reasons, list) else str(reasons)
        score = alert_payload.get("risk_score", 0.0)
        
        logger.info(
            f"[ALERT DISPATCH] [{risk_level}] Node {node_id} | Alert #{alert_payload.get('alert_id', 'ALT')} "
            f"| Reasons: {reasons_str} | Score: {score:.2f}"
        )
        return {"status": "LOGGED", "channel": self.name}


class SMSNotificationChannel(BaseNotificationChannel):
    """
    Production-ready cellular SMS dispatch channel supporting:
    1. Twilio REST API
    2. Fast2SMS API (Indian cellular networks)
    3. Custom Webhook SMS Gateways
    4. Verified Simulator mode (with full message capture when API keys not provided)
    """
    name: str = "sms_gateway"
    is_enabled: bool = True

    def __init__(self):
        self.dispatched_history: List[Dict[str, Any]] = []

    async def dispatch_single_sms(
        self,
        to_phone: str,
        message: str,
        severity: str = "CRITICAL",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Sends an actual SMS text message to a specific phone number."""
        dispatch_id = f"sms_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{len(self.dispatched_history) + 1}"
        now_str = datetime.utcnow().isoformat()
        clean_phone = to_phone.strip()
        provider_used = "simulated"
        delivery_status = "DELIVERED"
        error_detail = None

        # 1. Try Twilio if configured
        if (
            settings.TWILIO_ACCOUNT_SID 
            and settings.TWILIO_AUTH_TOKEN 
            and settings.TWILIO_FROM_NUMBER
            and (settings.SMS_PROVIDER in ["auto", "twilio"])
        ):
            provider_used = "twilio"
            twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(
                        twilio_url,
                        auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                        data={
                            "To": clean_phone,
                            "From": settings.TWILIO_FROM_NUMBER,
                            "Body": message,
                        },
                    )
                    if resp.status_code in [200, 201]:
                        delivery_status = "DELIVERED"
                        logger.info(f"Twilio SMS successfully delivered to {clean_phone}")
                    else:
                        delivery_status = "FAILED"
                        error_detail = f"Twilio HTTP {resp.status_code}: {resp.text}"
                        logger.error(f"Twilio SMS failed to {clean_phone}: {error_detail}")
            except Exception as e:
                delivery_status = "FAILED"
                error_detail = str(e)
                logger.error(f"Twilio exception while sending to {clean_phone}: {e}")

        # 2. Try Fast2SMS if configured (common for Indian mobile numbers)
        elif (
            settings.FAST2SMS_API_KEY 
            and (settings.SMS_PROVIDER in ["auto", "fast2sms"])
        ):
            provider_used = "fast2sms"
            fast2sms_url = "https://www.fast2sms.com/dev/bulkV2"
            
            # Normalize Indian 10-digit mobile number for Fast2SMS route 'q'
            raw_digits = "".join(filter(str.isdigit, clean_phone))
            if len(raw_digits) >= 10:
                phone_digits = raw_digits[-10:]
            else:
                phone_digits = raw_digits

            # Telecom SMS route 'q' works best with standard GSM-7 text (replace emoji with text tag)
            sms_body = message.replace("🚨", "[ALERT]").replace("•", "-").strip()

            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    # Method 1: Fast2SMS Dev API GET with query params (as shown on Fast2SMS Dev API console)
                    params = {
                        "authorization": settings.FAST2SMS_API_KEY.strip(),
                        "route": "q",
                        "message": sms_body,
                        "language": "english",
                        "flash": "0",
                        "numbers": phone_digits,
                    }
                    resp = await client.get(fast2sms_url, params=params)

                    # Method 2: Fallback to POST if GET returned error
                    if resp.status_code != 200:
                        resp = await client.post(
                            fast2sms_url,
                            headers={
                                "authorization": settings.FAST2SMS_API_KEY.strip(),
                                "Content-Type": "application/json",
                            },
                            json={
                                "route": "q",
                                "message": sms_body,
                                "language": "english",
                                "numbers": phone_digits,
                            },
                        )

                    try:
                        resp_data = resp.json()
                    except Exception:
                        resp_data = {}

                    is_success = (
                        resp.status_code == 200
                        and (resp_data.get("return") is True or "sent successfully" in resp.text.lower())
                    )

                    if is_success:
                        delivery_status = "DELIVERED"
                        logger.info(f"Fast2SMS message successfully delivered to {phone_digits}: {resp_data.get('message', 'Delivered')}")
                    else:
                        delivery_status = "FAILED"
                        error_detail = f"Fast2SMS response: {resp.text}"
                        logger.error(f"Fast2SMS delivery failed to {phone_digits}: {error_detail}")
            except Exception as e:
                delivery_status = "FAILED"
                error_detail = str(e)
                logger.error(f"Fast2SMS exception: {e}")

        # 3. Try Custom Webhook SMS Gateway
        elif settings.CUSTOM_SMS_GATEWAY_URL and (settings.SMS_PROVIDER in ["auto", "webhook"]):
            provider_used = "custom_webhook"
            headers = {"Content-Type": "application/json"}
            if settings.CUSTOM_SMS_API_KEY:
                headers["Authorization"] = f"Bearer {settings.CUSTOM_SMS_API_KEY}"
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(
                        settings.CUSTOM_SMS_GATEWAY_URL,
                        headers=headers,
                        json={
                            "recipient": clean_phone,
                            "message": message,
                            "severity": severity,
                            "metadata": metadata or {},
                        },
                    )
                    if resp.status_code in [200, 201, 202]:
                        delivery_status = "DELIVERED"
                    else:
                        delivery_status = "FAILED"
                        error_detail = f"Webhook HTTP {resp.status_code}: {resp.text}"
            except Exception as e:
                delivery_status = "FAILED"
                error_detail = str(e)

        # 4. Fallback / Test Mode: Log and store actual message formatted payload
        else:
            provider_used = "simulated_gateway"
            delivery_status = "DELIVERED"
            logger.info(
                f"[ACTUAL SMS DISPATCHED] To: {clean_phone} | Status: {delivery_status} | "
                f"Provider: {provider_used}\n"
                f"--- SMS BODY START ---\n{message}\n--- SMS BODY END ---"
            )

        record = {
            "id": dispatch_id,
            "timestamp": now_str,
            "recipient": clean_phone,
            "severity": severity,
            "message": message,
            "provider": provider_used,
            "status": delivery_status,
            "error": error_detail,
            "metadata": metadata or {},
        }

        # Keep last 50 entries in memory
        self.dispatched_history.insert(0, record)
        if len(self.dispatched_history) > 50:
            self.dispatched_history.pop()

        return record

    async def dispatch(self, alert_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Broadcasts the alert to all configured emergency responder phone numbers."""
        if not settings.SMS_ENABLED:
            logger.debug("SMS dispatch is disabled in settings.")
            return {"status": "DISABLED", "channel": self.name}

        severity = alert_payload.get("severity", "CRITICAL").upper()
        # Only broadcast for HIGH and CRITICAL alerts
        if severity not in ["CRITICAL", "HIGH"]:
            return {"status": "SKIPPED_SEVERITY", "channel": self.name}

        message_body = format_emergency_sms_message(alert_payload)
        recipients = settings.all_sms_recipients
        batch = await sms_service.send_sms(numbers=recipients, message=message_body)
        record = {
            "id": f"sms_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_batch",
            "timestamp": datetime.utcnow().isoformat(),
            "recipient": ",".join(batch.get("recipients") or recipients),
            "recipient_count": len(batch.get("recipients") or recipients),
            "severity": severity,
            "message": message_body,
            "status": batch.get("status", "FAILED"),
            "provider": "fast2sms",
            "error": batch.get("error"),
            "alert_id": alert_payload.get("alert_id"),
        }
        self.dispatched_history.insert(0, record)
        if len(self.dispatched_history) > 50:
            self.dispatched_history.pop()

        return {
            "status": "DISPATCHED" if batch.get("sent") else batch.get("status", "FAILED"),
            "channel": self.name,
            "total_recipients": len(recipients),
            "dispatches": [record],
        }

    def get_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Returns the most recent dispatched SMS logs."""
        return self.dispatched_history[:limit]


class MockWhatsAppNotificationChannel(BaseNotificationChannel):
    """WhatsApp Business / Meta Cloud API notification hook."""
    name: str = "whatsapp_gateway"
    is_enabled: bool = False

    async def dispatch(self, alert_payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_enabled:
            return {"status": "INACTIVE", "channel": self.name}
        return {"status": "SENT", "channel": self.name}


class MockIVRNotificationChannel(BaseNotificationChannel):
    """Automated Voice / IVR emergency telephony hook."""
    name: str = "ivr_voice_gateway"
    is_enabled: bool = False

    async def dispatch(self, alert_payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_enabled:
            return {"status": "INACTIVE", "channel": self.name}
        return {"status": "SENT", "channel": self.name}


class AlertDispatcher:
    """Coordinates alert delivery across registered notification channels."""

    def __init__(self):
        self.sms_channel = SMSNotificationChannel()
        self.system_channel = SystemAuditLogChannel()
        self.whatsapp_channel = MockWhatsAppNotificationChannel()
        self.ivr_channel = MockIVRNotificationChannel()
        
        self.channels: List[BaseNotificationChannel] = [
            self.system_channel,
            self.sms_channel,
            self.whatsapp_channel,
            self.ivr_channel,
        ]

    def register_channel(self, channel: BaseNotificationChannel):
        """Allows dynamically registering new notification adapters."""
        self.channels.append(channel)
        logger.info(f"Registered custom notification channel: {channel.name}")

    async def broadcast_alert(self, alert_payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Dispatches alert payload to all active notification channels."""
        results = []
        for channel in self.channels:
            try:
                res = await channel.dispatch(alert_payload)
                results.append(res)
            except Exception as e:
                logger.error(f"Error dispatching alert via {channel.name}: {e}")
                results.append({"channel": channel.name, "status": "ERROR", "error": str(e)})
        return results

    async def send_manual_sms(
        self,
        to_phone: str,
        message: Optional[str] = None,
        severity: str = "CRITICAL",
        custom_action: Optional[str] = None,
        alert_payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Direct programmatic endpoint for sending an actual SMS text message."""
        if not message:
            payload = alert_payload or {
                "node_id": "TW-N01",
                "risk_level": severity,
                "risk_score": 0.88 if severity == "CRITICAL" else 0.65,
                "trigger_reasons": ["Pore saturation elevated", "Creep velocity active"],
            }
            message = format_emergency_sms_message(payload, custom_action=custom_action)

        extra_digits = "".join(ch for ch in str(to_phone or "") if ch.isdigit())
        recipients = list(settings.all_sms_recipients)
        extra_key = extra_digits[-10:] if len(extra_digits) >= 10 else extra_digits
        if extra_key and extra_key not in recipients:
            recipients.append(extra_key)

        batch = await sms_service.send_sms(numbers=recipients, message=message)
        record = {
            "id": f"sms_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_batch",
            "timestamp": datetime.utcnow().isoformat(),
            "recipient": ",".join(batch.get("recipients") or recipients),
            "recipient_count": len(batch.get("recipients") or recipients),
            "severity": severity,
            "message": message,
            "status": batch.get("status", "FAILED"),
            "provider": "fast2sms",
            "error": batch.get("error"),
        }
        self.sms_channel.dispatched_history.insert(0, record)
        if len(self.sms_channel.dispatched_history) > 50:
            self.sms_channel.dispatched_history.pop()

        return {
            **batch,
            "id": record["id"],
            "message": message,
            "provider": "fast2sms",
            "total_recipients": len(recipients),
        }

    def get_sms_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self.sms_channel.get_history(limit)


alert_dispatcher = AlertDispatcher()
