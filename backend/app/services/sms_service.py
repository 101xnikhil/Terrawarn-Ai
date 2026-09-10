import logging
from datetime import datetime, date
from typing import List, Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.alert import Alert

logger = logging.getLogger("landguard.services.sms")

FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


class SMSService:
    """
    Lightweight, resilient Fast2SMS Quick SMS ('q' route) alert delivery service.
    
    Adheres to offline-first and best-effort principles:
    - Never raises exceptions that could block core telemetry or ingestion.
    - Single batch dispatch for all recipients to conserve daily quota.
    - Tracks daily sends in-memory with automatic midnight reset.
    - Gracefully handles quota exhaustion, disabled flag, or API errors.
    """

    def __init__(self):
        self._sent_today_count: int = 0
        self._counter_date: date = datetime.utcnow().date()

    def _reset_counter_if_new_day(self) -> None:
        """Resets the daily send counter when crossing UTC midnight."""
        today = datetime.utcnow().date()
        if today != self._counter_date:
            self._sent_today_count = 0
            self._counter_date = today

    @property
    def sent_today_count(self) -> int:
        self._reset_counter_if_new_day()
        return self._sent_today_count

    def get_sms_status(self) -> Dict[str, Any]:
        """
        Exposes high-level telemetry for dashboard/settings monitoring.
        Never exposes the API key or raw recipient phone numbers.
        """
        self._reset_counter_if_new_day()
        recipients = settings.all_sms_recipients
        sent = self._sent_today_count
        max_quota = settings.SMS_MAX_PER_DAY
        remaining = max(0, max_quota - sent)

        return {
            "enabled": bool(settings.SMS_ALERTS_ENABLED),
            "recipients_count": len(recipients),
            "min_severity": settings.SMS_MIN_SEVERITY.upper(),
            "sent_today": sent,
            "max_per_day": max_quota,
            "quota_remaining": remaining,
        }

    async def send_sms(self, numbers: List[str], message: str) -> Dict[str, Any]:
        """
        Transmits an SMS text message to one or more Indian phone numbers
        using Fast2SMS Quick Route ('q').
        
        Returns a structured result dict:
        {
            "sent": bool,
            "status": "DELIVERED" | "FAILED" | "DISABLED" | "QUOTA_EXCEEDED" | "NO_RECIPIENTS",
            "recipients": List[str],
            "response": Optional[Dict[str, Any]],
            "error": Optional[str],
        }
        """
        # 1. Feature Flag Check
        if not settings.SMS_ALERTS_ENABLED:
            logger.debug("Fast2SMS live alert skipped: SMS_ALERTS_ENABLED is False.")
            return {
                "sent": False,
                "status": "DISABLED",
                "recipients": numbers,
                "error": "SMS alerts are disabled in configuration",
            }

        # 2. Config & Key Check
        api_key = settings.FAST2SMS_API_KEY.strip()
        if not api_key:
            logger.warning("Fast2SMS live alert skipped: FAST2SMS_API_KEY is not configured.")
            return {
                "sent": False,
                "status": "DISABLED",
                "recipients": numbers,
                "error": "Fast2SMS API key is not configured",
            }

        # 3. Recipients Check & Normalization
        clean_numbers = []
        for num in numbers:
            digits = "".join(ch for ch in str(num) if ch.isdigit())
            if len(digits) >= 10:
                clean_numbers.append(digits[-10:])
            elif digits:
                clean_numbers.append(digits)

        if not clean_numbers:
            logger.warning("Fast2SMS alert skipped: No valid 10-digit recipients provided.")
            return {
                "sent": False,
                "status": "NO_RECIPIENTS",
                "recipients": numbers,
                "error": "No valid 10-digit recipient phone numbers",
            }

        # 4. Daily Quota Check
        self._reset_counter_if_new_day()
        if self._sent_today_count >= settings.SMS_MAX_PER_DAY:
            logger.warning(
                f"Fast2SMS daily quota limit reached ({self._sent_today_count}/{settings.SMS_MAX_PER_DAY}). "
                "Skipping SMS dispatch."
            )
            return {
                "sent": False,
                "status": "QUOTA_EXCEEDED",
                "recipients": clean_numbers,
                "error": f"Daily SMS quota limit reached ({settings.SMS_MAX_PER_DAY}/day)",
            }

        # 5. Build Payload (Fast2SMS Quick Route 'q')
        # Sanitize message to standard GSM-7 characters
        sanitized_msg = message.replace("🚨", "[ALERT]").replace("•", "-").strip()
        numbers_str = ",".join(clean_numbers)

        headers = {
            "authorization": api_key,
            "Content-Type": "application/json",
        }
        json_body = {
            "route": "q",
            "message": sanitized_msg,
            "language": "english",
            "flash": "0",
            "numbers": numbers_str,
        }

        # 6. Execute Dispatch with 1 Network Failure Retry
        last_error = None
        resp_data = None
        success = False

        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.post(FAST2SMS_URL, headers=headers, json=json_body)
                    
                    try:
                        resp_data = resp.json()
                    except Exception:
                        resp_data = {"raw_text": resp.text}

                    # Fast2SMS indicates success if resp.status_code == 200 and return is True
                    if resp.status_code == 200 and (
                        resp_data.get("return") is True
                        or "sent successfully" in resp.text.lower()
                    ):
                        success = True
                        self._sent_today_count += 1
                        logger.info(
                            f"Fast2SMS batch delivered to {len(clean_numbers)} recipients: {resp_data.get('message')}"
                        )
                        return {
                            "sent": True,
                            "status": "DELIVERED",
                            "recipients": clean_numbers,
                            "response": resp_data,
                            "error": None,
                        }
                    else:
                        # Validation, authentication, or account quota error (Do NOT retry on API logical rejection)
                        err_msg = resp_data.get("message") if isinstance(resp_data, dict) else resp.text
                        last_error = f"Fast2SMS error (HTTP {resp.status_code}): {err_msg}"
                        logger.warning(f"Fast2SMS delivery rejected: {last_error}")
                        break

            except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as net_err:
                last_error = f"Network connection error: {net_err}"
                logger.warning(f"Fast2SMS attempt {attempt + 1} network failure: {net_err}")
                if attempt == 0:
                    import asyncio
                    await asyncio.sleep(1.0)
            except Exception as ex:
                last_error = f"Unexpected dispatch exception: {ex}"
                logger.error(f"Fast2SMS unexpected error: {ex}")
                break

        return {
            "sent": False,
            "status": "FAILED",
            "recipients": clean_numbers,
            "response": resp_data,
            "error": last_error,
        }

    async def send_alert_sms(self, alert: Alert, db: Optional[Session] = None) -> None:
        """
        High-level alert dispatcher:
        - Evaluates if alert severity meets SMS_MIN_SEVERITY.
        - Composes concise SMS payload (<160 chars).
        - Dispatches batch to ALERT_SMS_RECIPIENTS.
        - Persists sms_sent, sms_sent_at, and sms_error on the Alert model.
        """
        # 1. Severity Gate Check
        # Ranking: CRITICAL > HIGH > WARNING / MODERATE > INFO / LOW
        severity_ranks = {
            "CRITICAL": 4,
            "HIGH": 3,
            "WARNING": 2,
            "MODERATE": 2,
            "INFO": 1,
            "LOW": 1,
        }
        alert_sev = (alert.severity or "CRITICAL").upper()
        min_sev = settings.SMS_MIN_SEVERITY.upper()

        alert_rank = severity_ranks.get(alert_sev, 1)
        min_rank = severity_ranks.get(min_sev, 3)

        if alert_rank < min_rank:
            logger.debug(
                f"Alert #{alert.id} severity {alert_sev} is below threshold {min_sev}. Skipping SMS."
            )
            return

        # 2. Check Recipients
        recipients = settings.all_sms_recipients
        if not recipients:
            err_msg = "No recipients configured in ALERT_SMS_RECIPIENTS"
            logger.debug(f"Alert #{alert.id}: {err_msg}")
            self._update_alert_status(alert.id, sent=False, error=err_msg, db=db)
            return

        # 3. Format Short SMS Payload (strictly under 160 chars)
        risk_pct = int(round(alert.risk_score * 100)) if alert.risk_score <= 1.0 else int(round(alert.risk_score))
        fos_str = f" FoS={alert.risk_result.factor_of_safety:.2f}" if getattr(alert, "risk_result", None) and alert.risk_result.factor_of_safety else ""
        
        # Example format (approx 125-140 chars):
        # [TERRAWARN ALERT] CRITICAL hazard on TW-N01! FoS=0.88 Risk=88%. Immediate evacuation advised. Helpline: 1070/112
        message = (
            f"[TERRAWARN ALERT] {alert_sev} hazard on {alert.node_id}!{fos_str} "
            f"Risk={risk_pct}%. Immediate caution. Emergency: 1070/112"
        )
        if len(message) > 160:
            message = message[:157] + "..."

        # 4. Dispatch SMS
        result = await self.send_sms(numbers=recipients, message=message)

        # 5. Persist delivery status on Alert
        sent = result.get("sent", False)
        error = result.get("error") if not sent else None
        self._update_alert_status(alert.id, sent=sent, error=error, db=db)

    def _update_alert_status(
        self,
        alert_id: int,
        sent: bool,
        error: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> None:
        """Updates alert record in database with delivery outcome."""
        owns_session = False
        session = db
        if session is None:
            session = SessionLocal()
            owns_session = True

        try:
            db_alert = session.query(Alert).filter(Alert.id == alert_id).first()
            if db_alert:
                db_alert.sms_sent = sent
                if sent:
                    db_alert.sms_sent_at = datetime.utcnow()
                    db_alert.sms_error = None
                else:
                    db_alert.sms_error = error
                session.commit()
        except Exception as ex:
            logger.error(f"Failed to update alert #{alert_id} SMS delivery status: {ex}")
            try:
                session.rollback()
            except Exception:
                pass
        finally:
            if owns_session:
                session.close()


sms_service = SMSService()
