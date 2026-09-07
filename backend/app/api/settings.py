from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.database import get_db
from app.services.xgboost_client import xgboost_client

router = APIRouter(prefix="/settings/xgboost", tags=["XGBoost Dynamic Server Configuration"])


class XGBoostConfigUpdate(BaseModel):
    api_url: str = Field(description="Base URL or IP of the XGBoost server (e.g. http://34.131.240.174:8000)")
    timeout_seconds: Optional[float] = Field(default=5.0, ge=1.0, le=30.0, description="HTTP connection timeout in seconds")
    auto_stream_enabled: Optional[bool] = Field(default=False, description="Enable automatic polling from cloud server")
    auto_stream_interval_seconds: Optional[int] = Field(default=5, ge=2, le=60, description="Polling interval in seconds")


class XGBoostTestRequest(BaseModel):
    api_url: str = Field(description="URL or IP to test")


@router.get("")
def get_xgboost_config():
    """Retrieve the current dynamic XGBoost server configuration and cached diagnostics."""
    return xgboost_client.get_config()


@router.post("")
def update_xgboost_config(payload: XGBoostConfigUpdate):
    """
    Update the XGBoost server IP / URL dynamically.
    Instantly reconfigures the risk engine and persists the configuration across restarts.
    """
    updated = xgboost_client.save_config(
        api_url=payload.api_url,
        timeout_seconds=payload.timeout_seconds or 5.0,
        auto_stream_enabled=payload.auto_stream_enabled or False,
        auto_stream_interval_seconds=payload.auto_stream_interval_seconds or 5,
    )
    return {
        "status": "success",
        "message": f"XGBoost server configured to {updated['api_url']}",
        "config": updated,
    }


@router.post("/test")
async def test_xgboost_connection(payload: XGBoostTestRequest):
    """
    Probes an XGBoost server IP / URL without saving.
    Checks health, response latency, openapi info, and active model version.
    """
    result = await xgboost_client.test_connection(raw_url=payload.api_url)
    return result


@router.post("/sync")
async def sync_xgboost_reading(db: Session = Depends(get_db)):
    """
    Pulls 1 live telemetry packet and XGBoost prediction from the configured server,
    commits it to the database, triggers alerts if necessary, and broadcasts over WebSocket.
    """
    try:
        res = await xgboost_client.fetch_and_ingest(db)
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to sync telemetry from configured XGBoost server: {e}",
        )
