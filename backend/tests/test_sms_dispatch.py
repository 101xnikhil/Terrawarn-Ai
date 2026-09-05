import pytest
import asyncio
from app.services.alert_dispatcher import alert_dispatcher, format_emergency_sms_message, SMSNotificationChannel
from app.config import settings


def test_format_emergency_sms_message():
    alert_payload = {
        "node_id": "LG-N01",
        "risk_level": "CRITICAL",
        "risk_score": 0.92,
        "trigger_reasons": ["Pore pressure saturation > 80%", "Tilt creep acceleration"],
    }
    msg = format_emergency_sms_message(alert_payload)
    
    assert "EMERGENCY ALERT: TERRAWARN-AI" in msg
    assert "LG-N01" in msg
    assert "CRITICAL LANDSLIDE HAZARD" in msg
    assert "92% Risk Score" in msg
    assert "Pore pressure saturation > 80%" in msg
    assert "1070 / 112" in msg


def test_sms_channel_dispatch_single():
    async def _run():
        orig_key = settings.FAST2SMS_API_KEY
        try:
            settings.FAST2SMS_API_KEY = ""
            channel = SMSNotificationChannel()
            result = await channel.dispatch_single_sms(
                to_phone="+919506758710",
                message="Test Emergency Message",
                severity="CRITICAL",
            )
            assert result["recipient"] == "+919506758710"
            assert result["status"] == "DELIVERED"
            assert result["message"] == "Test Emergency Message"
            assert len(channel.dispatched_history) >= 1
        finally:
            settings.FAST2SMS_API_KEY = orig_key
    
    asyncio.run(_run())


def test_alert_dispatcher_broadcast_critical():
    async def _run():
        alert_payload = {
            "alert_id": "ALT-99",
            "node_id": "LG-N01",
            "severity": "critical",
            "risk_level": "CRITICAL",
            "risk_score": 0.95,
            "trigger_reasons": ["Bishop FoS < 1.0", "Active Shear"],
        }
        results = await alert_dispatcher.broadcast_alert(alert_payload)
        assert len(results) >= 2
        
        sms_res = next((r for r in results if r.get("channel") == "sms_gateway"), None)
        assert sms_res is not None
        assert sms_res["status"] == "DISPATCHED"
        assert sms_res["total_recipients"] >= 1
    
    asyncio.run(_run())


def test_api_send_emergency_sms(client):
    payload = {
        "to_phone": "+919506758710",
        "severity": "CRITICAL",
        "custom_action": "Move to higher ground immediately.",
        "node_id": "LG-N01",
    }
    response = client.post("/api/alerts/sms/send", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "dispatch_report" in data
    assert data["dispatch_report"]["recipient"] == "+919506758710"
    assert "Move to higher ground immediately." in data["dispatch_report"]["message"]


def test_api_sms_history_and_config(client):
    # Test Config
    config_res = client.get("/api/alerts/sms/config")
    assert config_res.status_code == 200
    config_data = config_res.json()
    assert "sms_enabled" in config_data
    assert "active_mode" in config_data
    assert "providers_configured" in config_data

    # Test History
    history_res = client.get("/api/alerts/sms/history?limit=5")
    assert history_res.status_code == 200
    history_data = history_res.json()
    assert "history" in history_data
    assert history_data["count"] >= 1


def test_blynk_webhook_critical_generates_alert_and_sms(client):
    # Trigger critical readings: high moisture & tilt displacement
    critical_payload = {
        "node_id": "LG-N01",
        "soil_moisture": 88.0,
        "rainfall": 60.0,
        "rainfall_24h": 55.0,
        "tilt_angle": 32.0,
        "tilt_rate": 0.06,
        "battery": 82.0,
        "rssi": -60,
    }
    response = client.post("/api/blynk/webhook", json=critical_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert data["risk_level"] in ["CRITICAL", "HIGH"]
    assert data["factor_of_safety"] < 1.10
    assert data["alert_generated"] is True
    assert "alert" in data
    assert data["alert"]["sms_dispatch"] == "DISPATCHED_TO_RESCUE_TEAMS"
