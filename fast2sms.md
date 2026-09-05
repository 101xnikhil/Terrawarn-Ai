# 📱 Fast2SMS Integration & Mobile Number Setup Guide

This guide explains how the **Fast2SMS** cellular alert system works in **Terrawarn-Ai**, how it integrates with the live dashboard, and how you can feed/configure the mobile numbers to receive real emergency SMS notifications.

---

## 1. How Fast2SMS Works in Terrawarn-Ai

Terrawarn-Ai uses **Fast2SMS Bulk V2 API** (`https://www.fast2sms.com/dev/bulkV2`) with the high-speed **Quick SMS Route (`q`)** to broadcast real-time landslide emergency warnings to Indian mobile phones (+91).

```
   ┌─────────────────────────────────────────────────────────────┐
   │                  PHYSICAL / SIMULATED SENSORS                │
   │      (Soil Moisture VWC, Tilt IMU, Pore Pressure, Rain)      │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │             TERRAWARN-AI GEOTECHNICAL RISK ENGINE            │
   │      Evaluates Bishop Factor of Safety (FoS) & Risk Score   │
   │           Trigger: Hazard Level ≥ HIGH or CRITICAL           │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │            FASTAPI BACKEND ALERT DISPATCHER SUBSYSTEM        │
   │  - Sanitizes message into standard GSM-7 telecom characters  │
   │  - Enforces daily rate-limiting & quota safety ceilings     │
   │  - Formats 10-digit Indian numbers (+91 stripped for API)    │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                    FAST2SMS CLOUD GATEWAY                    │
   │            POST /dev/bulkV2  (Route 'q' Quick SMS)          │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │          INDIAN CELLULAR NETWORKS (Jio / Airtel / Vi / BSNL) │
   │       Target mobile receives SMS alert in ~2 to 5 seconds    │
   └─────────────────────────────────────────────────────────────┘
```

### Key Highlights:
- **Zero Blocking / Offline-First**: SMS delivery is asynchronous. If the internet drops or Fast2SMS quota is exhausted, local edge telemetry, WebSockets, and database persistence continue running smoothly without lag.
- **Telecom-Compliant Length**: Messages are kept under 160 characters so they deliver as a single, urgent push notification.
- **Automatic Character Sanitization**: Emojis like `🚨` are automatically converted to `[ALERT]` to guarantee delivery on standard Indian GSM-7 carrier networks.

---

## 2. How to Feed the Mobile Numbers to Send SMS

There are **three ways** to feed mobile numbers into Terrawarn-Ai:

---

### Method A: Live Dashboard UI (Interactive / Instant Push)
Use this method if you want to test live dispatch immediately with any phone number directly from the web browser.

1. Start the application (if not already running):
   ```bash
   ./start.sh
   ```
2. Open your browser and go to the **Alerts Center**:
   👉 **`http://localhost:5173/alerts`**
3. Scroll down to the **Emergency Alert Dispatcher** card on the right-hand side.
4. Locate the **Audience Target Mobile Number** input box:
   - Enter your 10-digit Indian mobile number (e.g. `9506758710` or `+91 95067 58710`).
5. (Optional) Customize the **Evacuation Directive** text.
6. Click **"Send Red Alert SMS"** (for CRITICAL hazard) or **"Advisory"** (for WARNING).
7. The system immediately:
   - Transmits the SMS via Fast2SMS to the phone number you entered.
   - Shows a green success toast with provider confirmation (`DELIVERED via FAST2SMS`).
   - Adds the message to the live dispatch audit log and interactive mobile phone preview.

---

### Method B: Environment Configuration (`.env`) for Automated Incident Alerts
Use this method so the system automatically sends SMS to district authorities, engineers, or yourself whenever sensor readings detect a real `HIGH` or `CRITICAL` hazard.

Open `/Users/divyshresthvishwakarma/Downloads/Sih22/.env` (and `backend/.env`):

```env
# ─────────────────────────────────────────────────────────────
# EMERGENCY SMS GATEWAY CONFIGURATION
# ─────────────────────────────────────────────────────────────
SMS_ENABLED=true
SMS_PROVIDER="fast2sms"

# Fast2SMS API Key from https://www.fast2sms.com/dev/bulkV2
FAST2SMS_API_KEY="YOUR_FAST2SMS_API_KEY_HERE"

# Automated Emergency Alert Recipients (Comma-separated Indian numbers)
ALERT_SMS_RECIPIENTS="+919506758710, +919876543210"

# Master toggle for threshold-triggered background SMS
SMS_ALERTS_ENABLED=true

# Minimum severity to trigger SMS (HIGH or CRITICAL)
SMS_MIN_SEVERITY="HIGH"

# Daily safety quota to prevent balance drain (e.g. 20 messages/day)
SMS_MAX_PER_DAY=20

# Designated Emergency Contacts
EMERGENCY_PHONE_NUMBERS="+919506758710"
```

#### Number Formatting Rules for `ALERT_SMS_RECIPIENTS`:
- You can provide a single number: `ALERT_SMS_RECIPIENTS="+919506758710"`
- Or multiple numbers separated by commas: `ALERT_SMS_RECIPIENTS="+919506758710, +919876543210, +919123456780"`
- Numbers can be written with `+91`, `91`, or simply the 10 digits (`9506758710`). The backend automatically extracts and normalizes the last 10 digits for the Fast2SMS Quick Route API.

---

### Method C: Programmatic REST API
You can also trigger an emergency SMS from any external script, physical IoT gateway, or curl command:

```bash
curl -X POST http://127.0.0.1:8000/api/alerts/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to_phone": "+919506758710",
    "message": "[TERRAWARN ALERT] Critical slope movement detected at Sector 7. Immediate evacuation advised. Helpline: 1070/112",
    "severity": "CRITICAL",
    "custom_action": "Evacuate downhill structures immediately.",
    "node_id": "LG-N01"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Emergency SMS dispatched",
  "dispatch_report": {
    "id": "sms-1725562145000",
    "status": "DELIVERED",
    "recipient": "+919506758710",
    "provider": "fast2sms",
    "message": "[TERRAWARN ALERT] Critical slope movement detected at Sector 7...",
    "error": null
  }
}
```

---

## 3. Fast2SMS Account & API Setup

### Step 1: Create an Account
1. Visit [https://www.fast2sms.com](https://www.fast2sms.com) and sign up with your mobile number.
2. Verify your OTP to log in to your dashboard.

### Step 2: Get Your API Key
1. In the left navigation menu, click **Dev API**.
2. Copy your **API Authorization Key**.
3. Paste it into your `.env` file under `FAST2SMS_API_KEY`:
   ```env
   FAST2SMS_API_KEY="FMdlq542KHUgJ1i6rI7BcNPkGub3hVRs9Do0WyeQC8nxOYXEpaVPUGjO6ksFJepW39KlcRYIh5w0HDZA"
   ```

### ⚠️ IMPORTANT: Fast2SMS Developer API Route Activation
> Fast2SMS provides ₹50 in free promotional wallet balance for web console testing. However, per Indian telecom (TRAI) anti-spam regulations, **automated HTTP API calls (Dev API)** require a one-time minimum wallet recharge of **₹100 INR**.
>
> If your API calls return an error mentioning *"Route not active"* or *"Recharge required"*:
> 1. Log in to your Fast2SMS Dashboard.
> 2. Click **Add Credit / Recharge Wallet**.
> 3. Add ₹100 via UPI / Card.
> 4. Once recharged, the Quick Route Dev API is permanently unlocked for live automated SMS to any Indian mobile number!

---

## 4. Monitoring Quota & Status in the Dashboard

You can inspect the live status of your Fast2SMS cellular gateway directly inside the dashboard:

1. Navigate to **Hardware & Settings**:
   👉 **`http://localhost:5173/settings`**
2. Scroll to **Section 4: Fast2SMS Live Cellular Alerting (Quick SMS Route)**:
   - **Status**: `DISPATCH ACTIVE` (or `DISABLED` if turned off in `.env`).
   - **Configured Recipients**: Displays how many recipient numbers are configured in `.env`.
   - **Trigger Severity**: Threshold level (`HIGH & CRITICAL`).
   - **Daily Free Plan Cap**: Shows how many SMS messages have been sent today vs. the daily limit (e.g. `2 / 20 sent`, resets midnight UTC).
   - **Quota Progress Bar**: Color-coded bar (Green $\rightarrow$ Yellow $\rightarrow$ Red) preventing accidental over-dispatching.

---

## 5. Instant Test Command (One-Click Verification)

To quickly verify that Fast2SMS is delivering messages without triggering a full landslide simulation, run this command in your terminal:

```bash
curl -X POST http://127.0.0.1:8000/api/alerts/test-sms
```

This will send a test message:
`"[TERRAWARN DEV TEST] Fast2SMS Quick Route live test dispatch."` to the numbers specified in your `ALERT_SMS_RECIPIENTS` environment variable and return the Fast2SMS gateway delivery receipt.

---

## 6. Summary of Key Files

| File | Purpose |
|------|---------|
| [`.env`](file:///Users/divyshresthvishwakarma/Downloads/Sih22/.env) | Root configuration for `FAST2SMS_API_KEY`, `ALERT_SMS_RECIPIENTS`, and quota limits |
| [`backend/.env`](file:///Users/divyshresthvishwakarma/Downloads/Sih22/backend/.env) | Backend runtime environment variables |
| [`backend/app/services/alert_dispatcher.py`](file:///Users/divyshresthvishwakarma/Downloads/Sih22/backend/app/services/alert_dispatcher.py) | Formats emergency SMS and calls Fast2SMS HTTP API |
| [`backend/app/services/sms_service.py`](file:///Users/divyshresthvishwakarma/Downloads/Sih22/backend/app/services/sms_service.py) | Manages Fast2SMS Quick Route 'q', daily quota tracking, and recipient normalization |
| [`backend/app/api/alerts.py`](file:///Users/divyshresthvishwakarma/Downloads/Sih22/backend/app/api/alerts.py) | REST API endpoints (`/api/alerts/sms/send`, `/api/alerts/test-sms`, `/api/alerts/sms/config`) |
| [`EmergencySmsBroadcastPanel.tsx`](file:///Users/divyshresthvishwakarma/Downloads/Sih22/frontend/src/components/dashboard/EmergencySmsBroadcastPanel.tsx) | Live dashboard interactive UI for entering numbers and sending real-time SMS |
| [`SettingsPage.tsx`](file:///Users/divyshresthvishwakarma/Downloads/Sih22/frontend/src/pages/SettingsPage.tsx) | Live Fast2SMS gateway status and daily quota progress bar |
