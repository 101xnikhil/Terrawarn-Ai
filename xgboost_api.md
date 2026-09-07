# 🌲 Terrawarn-Ai — XGBoost Server API Integration Guide

This guide explains how to connect your **already created XGBoost Server API** into the Terrawarn-Ai monitoring platform so that live sensor readings (from ESP32 hardware or the Lab Simulator) are evaluated by your model, displayed on the live mission control dashboard, and used to trigger real-time alerts.

---

## 🏗️ Architecture & Data Flow

You have two integration patterns available:

### Pattern A: Pull / Microservice Pattern (Recommended)
Terrawarn-Ai receives telemetry, computes geotechnical Factor of Safety (Bishop mechanics), and calls your **XGBoost Server API** via HTTP POST:

```
┌────────────────────────┐
│ ESP32 Hardware / Sim   │
│ (Moisture, Rain, Tilt) │
└───────────┬────────────┘
            │ Telemetry
            ▼
┌────────────────────────────────────────────────────────┐
│           Terrawarn-Ai Backend (Port 8000)             │
│  1. Ingests telemetry packet                           │
│  2. Computes Geotechnical Factor of Safety (FoS)       │
│  3. POSTs features to your XGBoost Server API          │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP POST (features JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│       Your External XGBoost Server API                 │
│       (e.g., http://localhost:5001/predict)            │
│  • Runs model.predict_proba()                          │
│  • Computes risk probability & hazard tier             │
│  • Returns JSON { "risk_score": 0.85, ... }            │
└───────────────────────────┬────────────────────────────┘
                            │ Response JSON
                            ▼
┌────────────────────────────────────────────────────────┐
│           Terrawarn-Ai Backend (Port 8000)             │
│  • Blends XGBoost prediction with physics rules        │
│  • Commits result to Database (PostgreSQL / SQLite)    │
│  • Dispatches Fast2SMS / Twilio alert if CRITICAL/HIGH │
│  • Broadcasts WebSocket frame (/ws/telemetry)          │
└───────────────────────────┬────────────────────────────┘
                            │ WebSocket
                            ▼
┌────────────────────────────────────────────────────────┐
│           React Live Mission Control UI (Port 5173)    │
│  • Live Risk Meter & Hazard Badge (CRITICAL / HIGH)    │
│  • SHAP Explainability Breakdown Card                  │
│  • Interactive Leaflet GIS Map Pin                     │
└────────────────────────────────────────────────────────┘
```

---

### Pattern B: Push / Webhook Pattern
If your XGBoost server runs in the cloud (GCP Cloud Run, AWS Lambda, edge gateway) and you want it to directly push predictions into Terrawarn-Ai:

Your server simply makes an HTTP POST to:
```
POST http://127.0.0.1:8000/api/blynk/webhook
```
Terrawarn-Ai will automatically store the prediction, alert rescue teams, and stream it to the live dashboard.

---

## ⚙️ How to Configure Pattern A (Environment Variable)

### Step 1: Add your API URL to `.env`
Open your `.env` file (in project root or `backend/.env`) and set `XGBOOST_API_URL`:

```ini
# External XGBoost Server API Endpoint
XGBOOST_API_URL="http://127.0.0.1:5001/predict"
XGBOOST_TIMEOUT_SECONDS=4.0
```

> **Note:** If `XGBOOST_API_URL` is empty, Terrawarn-Ai automatically uses the built-in local gray-box model bundle (`ml/models/xgboost_bundle.joblib`). Setting `XGBOOST_API_URL` immediately redirects all inference to your custom server API.

---

## 📡 Request & Response Specifications

### 1. Request Payload Sent to Your XGBoost API
When telemetry arrives, Terrawarn-Ai sends an HTTP `POST` with `Content-Type: application/json`:

```json
{
  "soil_moisture": 68.4,
  "rainfall": 18.5,
  "rainfall_24h": 62.0,
  "slope_angle": 28.5,
  "tilt_rate": 0.042,
  "factor_of_safety": 0.92,
  "features": [68.4, 18.5, 62.0, 28.5, 0.042, 0.92]
}
```

#### Feature Dictionary:
| Field | Type | Unit | Description |
|---|---|---|---|
| `soil_moisture` | `float` | `%` | Volumetric soil moisture content (0–100%) |
| `rainfall` | `float` | `mm/h` | Current rainfall intensity rate |
| `rainfall_24h` | `float` | `mm` | Cumulative precipitation over the past 24 hours |
| `slope_angle` | `float` | `degrees` | Slope dip / inclination angle (e.g. 15°–45°) |
| `tilt_rate` | `float` | `deg/min` | Ground displacement velocity / angular creep rate |
| `factor_of_safety` | `float` | `ratio` | Geotechnical Limit Equilibrium Bishop FoS (< 1.0 = failure) |
| `features` | `list[float]` | `array` | Same 6 features ordered as a float array for convenience |

---

### 2. Expected Response from Your XGBoost API
Your server should return a JSON object with HTTP status `200`:

```json
{
  "risk_score": 0.85,
  "risk_level": "CRITICAL",
  "confidence": 0.92,
  "factor_of_safety": 0.92,
  "model_version": "v1.0-custom-xgboost",
  "top_factors": [
    {
      "feature": "factor_of_safety",
      "display_name": "Factor of Safety (FoS)",
      "value": 0.92,
      "impact": "positive",
      "contribution": 0.28
    },
    {
      "feature": "soil_moisture",
      "display_name": "Soil Moisture",
      "value": 68.4,
      "impact": "positive",
      "contribution": 0.22
    }
  ]
}
```

#### Supported Key Variations:
Terrawarn-Ai automatically normalizes and accepts any of these common formats:
- **Score:** `risk_score` (0.0–1.0 or 0–100), `risk_score_normalized`, `probability`, or `risk_prob`.
- **Level:** `risk_level` (`"LOW"`, `"MODERATE"`, `"HIGH"`, `"CRITICAL"`). If omitted, Terrawarn-Ai automatically assigns the level based on score & FoS.
- **Explainability:** `top_factors` or `shap_values` (optional, fallback generated automatically if omitted).

---

## 🧪 Testing Your Integration

### 1. Check Engine Connection Status
Check which predictor is active:
```bash
curl -s http://127.0.0.1:8000/api/risk/status/engine
```
**Expected Output (when connected to your API):**
```json
{
  "status": "online",
  "active_predictor": "RemoteXGBoostPredictor",
  "remote_api_configured": true,
  "remote_api_url": "http://127.0.0.1:5001/predict",
  "timeout_seconds": 4.0
}
```

---

### 2. Test On-Demand Prediction via Swagger UI or curl
You can send test sensor parameters directly to the live backend:
```bash
curl -X POST http://127.0.0.1:8000/api/risk/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "soil_moisture": 72.0,
    "rainfall": 25.0,
    "rainfall_24h": 85.0,
    "slope_angle": 34.0,
    "tilt_rate": 0.05
  }'
```
Or open Swagger documentation in your browser:
👉 **[http://127.0.0.1:8000/docs#/Risk/evaluate_risk_realtime_api_risk_evaluate_post](http://127.0.0.1:8000/docs#/Risk/evaluate_risk_realtime_api_risk_evaluate_post)**

---

## 🐍 Boilerplate: Example XGBoost Server API

If your model is saved as an XGBoost file (`model.json`, `xgboost.joblib`, `model.pkl`) and you need a standalone FastAPI service to host it, here is a complete standalone server:

```python
# serve_xgboost.py
# Run with: uvicorn serve_xgboost:app --port 5001
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import joblib

app = FastAPI(title="Custom XGBoost Inference API")

# Load model weights (adjust path as needed)
# model = joblib.load("my_xgboost_model.joblib")

class InferenceRequest(BaseModel):
    soil_moisture: float
    rainfall: float
    rainfall_24h: float
    slope_angle: float
    tilt_rate: float
    factor_of_safety: Optional[float] = 1.2
    features: Optional[List[float]] = None

@app.post("/predict")
def predict(req: InferenceRequest):
    # Vector: [soil_moisture, rainfall, rainfall_24h, slope_angle, tilt_rate, factor_of_safety]
    feats = np.array([[
        req.soil_moisture,
        req.rainfall,
        req.rainfall_24h,
        req.slope_angle,
        req.tilt_rate,
        req.factor_of_safety or 1.2,
    ]])

    # Execute model prediction (or your custom pipeline)
    # prob = float(model.predict_proba(feats)[0][1])
    
    # Example heuristic calculation if model not loaded:
    prob = min(0.99, (req.soil_moisture / 100) * 0.4 + (req.rainfall_24h / 80) * 0.4 + max(0, 1.4 - (req.factor_of_safety or 1.2)) * 0.3)
    
    level = "CRITICAL" if prob >= 0.75 else "HIGH" if prob >= 0.50 else "MODERATE" if prob >= 0.25 else "LOW"

    return {
        "risk_score": round(prob, 3),
        "risk_level": level,
        "confidence": 0.91,
        "factor_of_safety": req.factor_of_safety,
        "model_version": "v1.0-custom-xgboost",
    }
```

---

## 🌐 Connecting to an XGBoost Server on Another Device

Yes, you can run the XGBoost server on a **different laptop, desktop, Raspberry Pi, or cloud server**!

### Scenario A: Both Devices on the Same Wi-Fi / Hotspot / LAN

#### Step 1: On the OTHER Device (where XGBoost is running)
1. **Find its Local IP address:**
   - **Windows:** Open Command Prompt (`cmd`) and type `ipconfig`. Look for `IPv4 Address` (e.g., `192.168.1.45` or `10.x.x.x`).
   - **Mac / Linux:** Open Terminal and run `ifconfig` or `ip a`. Look for `inet` under Wi-Fi/en0 (e.g., `192.168.1.45`).

2. **Ensure your server is listening on `0.0.0.0` (not just `127.0.0.1`):**
   - **FastAPI / Uvicorn:**
     ```bash
     uvicorn main:app --host 0.0.0.0 --port 5001
     ```
   - **Flask:**
     ```python
     app.run(host="0.0.0.0", port=5001)
     ```
   *(Binding to `0.0.0.0` allows requests coming from other machines on the network).*

3. **Check Firewall:** If the other machine is Windows, make sure Windows Firewall allows Python/Uvicorn to receive inbound connections on that port.

### 🎛️ Reconfigure Directly from the Web UI (Zero Restarts!)

You can now change the server IP directly inside the **Terrawarn-Ai Mission Control Dashboard**:

1. Open your browser and go to **Settings**:
   👉 **`http://localhost:5173/settings`**
2. Scroll to the **"External / Cloud XGBoost Server Integration"** card.
3. Paste your new IP / URL (e.g., `http://34.131.240.174:8000`).
4. Click **"Test Connection"**:
   - Terrawarn-Ai will ping your server in real time.
   - It validates health (`healthy`), detects the active model (`prototype-xgboost-v1`), and measures network latency (e.g., `279ms`).
5. Click **"Save & Connect"**:
   - The new IP is saved and activated immediately.
6. **(Optional) Live Auto-Stream:**
   - Click **"Start Auto-Stream"** to continuously stream live sensor readings and XGBoost predictions into the dashboard every 3–5 seconds!

### Scenario B: The Other Device is in a Different Location / Over the Internet

If the other device is not on the same Wi-Fi, you can use **ngrok** (free tool) to give it a public HTTPS URL.

#### On the OTHER Device:
1. Install and start ngrok:
   ```bash
   ngrok http 5001
   ```
2. ngrok will output a public forwarding URL:
   ```
   Forwarding  https://abc1-23-45-67.ngrok-free.app -> http://localhost:5001
   ```

#### On THIS Device:
Put the ngrok URL into your `.env`:
```ini
XGBOOST_API_URL="https://abc1-23-45-67.ngrok-free.app/predict"
```
That's it! Terrawarn-Ai will securely route inference requests across the internet to the other device.

---

### Scenario C: The Other Device Pushes Data into Terrawarn-Ai
The other device can also act as an active client and push its predictions directly to this machine:

- This machine's local IP is accessible on port `8000`.
- The other device makes an HTTP POST to:
  ```
  http://<THIS_MACHINE_IP>:8000/api/blynk/webhook
  ```
- With JSON payload:
  ```json
  {
    "node_id": "LG-N01",
    "soil_moisture": 70.0,
    "rainfall_24h": 50.0,
    "tilt_angle": 28.0,
    "tilt_rate": 0.03,
    "risk_score": 0.85,
    "risk_level": "CRITICAL",
    "factor_of_safety": 0.95
  }
  ```

---

## 💡 Summary Checklist
1. **Host your XGBoost API** on the other device and bind to `0.0.0.0`.
2. Add `XGBOOST_API_URL="http://<OTHER_IP>:5001/predict"` (or ngrok URL) to your `.env`.
3. Check `http://127.0.0.1:8000/api/risk/status/engine` to verify connection.
4. Watch live predictions stream into the **React Mission Control Dashboard** (`http://localhost:5173`)!
