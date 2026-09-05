from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime
import json
import logging
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("landguard.ws")
router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time telemetry streaming, hazard risk updates,
    and instantaneous alert notifications.
    """
    await ws_manager.connect(websocket)
    try:
        # Send initial handshake frame
        welcome_frame = {
            "type": "connection_established",
            "status": "connected",
            "message": "Terrawarn-Ai Real-Time Telemetry Stream Connected",
            "timestamp": datetime.utcnow().isoformat(),
        }
        await websocket.send_text(json.dumps(welcome_frame))

        # Keep connection open and handle client messages
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat(),
                    }))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
