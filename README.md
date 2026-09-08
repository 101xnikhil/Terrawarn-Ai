# 🛡️ LANDGUARD AI
### Edge IoT & Gray-Box Physics-Informed AI Early Warning System for Rainfall-Induced Landslides

[![Smart India Hackathon](https://img.shields.io/badge/SIH-2026_Prototype-blue.svg?style=flat-square)](https://sih.gov.in/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB.svg?style=flat-square&logo=react)](https://reactjs.org/)
[![XGBoost](https://img.shields.io/badge/ML-XGBoost_%2B_TreeSHAP-EB5424.svg?style=flat-square)](https://xgboost.readthedocs.io/)
[![LoRa](https://img.shields.io/badge/Wireless-LoRa_433MHz-orange.svg?style=flat-square)](https://www.semtech.com/lora)
[![Offline-First](https://img.shields.io/badge/Architecture-100%25_Offline--First-success.svg?style=flat-square)](docs/SECURITY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

> **⚠️ Scientific Transparency Notice:**  
> *LANDGUARD AI is an engineering prototype designed for laboratory demonstration and research benchmarking. Operational field deployment requires geotechnical borehole soil-characterization surveys, shear box testing, and localized rainfall-threshold calibration.*

---

## 📌 Table of Contents
1. [Overview & Problem Statement](#-overview--problem-statement)
2. [Key Innovations & Architecture](#-key-innovations--architecture)
3. [Subsystem Breakdown](#-subsystem-breakdown)
   - [A. Edge Transducers & Wireless LoRa Ingestion](#a-edge-transducers--wireless-lora-ingestion)
   - [B. Gray-Box Geotechnical Physics Engine](#b-gray-box-geotechnical-physics-engine)
   - [C. XGBoost AI & Local SHAP Explainability](#c-xgboost-ai--local-shap-explainability)
   - [D. Incident Command & Multi-Tier Alerting](#d-incident-command--multi-tier-alerting)
   - [E. Edge Cybersecurity & Monotonic Sequence Watermarking](#e-edge-cybersecurity--monotonic-sequence-watermarking)
4. [Hardware Bill of Materials (BOM)](#-hardware-bill-of-materials-bom)
5. [Quickstart Guide](#-quickstart-guide)
   - [One-Click Launcher (`start.sh`)](#1-one-click-launcher-recommended)
   - [Manual Two-Terminal Execution](#2-manual-two-terminal-execution)
6. [SIH Judging 6-State Demo Mode](#-sih-judging-6-state-demo-mode)
7. [Repository Structure](#-repository-structure)
8. [Automated Verification & Bench Testing](#-automated-verification--bench-testing)
9. [UI Localization (Ollama, landslide-belt languages)](#-ui-localization-ollama-landslide-belt-languages)
10. [Anticipated Jury Q&A](#-anticipated-jury-qa)

---

## 🌍 Overview & Problem Statement

Landslides along Indian transportation corridors (Western Ghats, Konkan Railway, Himalayan NH highways) cause recurrent loss of life, track misalignment, and economic stoppage during the South Asian monsoon. 

Existing solutions suffer from critical operational limitations:
- **Satellite InSAR / Optical Radar:** High latency (revisit times of 3–12 days); blind during heavy cloud cover.
- **Commercial Inclinometer Boreholes:** Prohibitively expensive (₹2,00,000+ per borehole); complex wired maintenance.
- **Pure Black-Box AI:** Prone to hallucination, false positives from wildlife/wind impulse noise, and unexplainable alerts.

**LANDGUARD AI** solves this with a **ruggedized, low-cost ($18 BOM), 100% offline-first edge monitoring node** that integrates:
1. Multi-parametric IoT sensing (Volumetric soil moisture, rain intensity, 3D IMU kinematics).
2. Real-time **Limit Equilibrium Infinite Slope Stability (Bishop/Fellenius Factor of Safety)**.
3. **XGBoost Gradient Boosted Classifier** with strict physics boundary constraints.
4. **SHAP (SHapley Additive exPlanations)** for clear geotechnical causality.
5. Zero internet dependency — operates completely on local edge hardware.

---

## 🏗️ Key Innovations & Architecture

```
                                  LANDGUARD AI SYSTEM TOPOLOGY
                                  
 ┌──────────────────────┐        433MHz LoRa        ┌──────────────────────┐
 │   ESP32 SENSOR NODE  │ ────────────────────────> │ ESP32 LORA GATEWAY   │
 │ • Capacitive V2.0 VWC│   32-Byte Packed Struct   │ • SX1278 SPI Driver  │
 │ • FC-37 Rain Gauge   │   CCITT-16 CRC + Seq No   │ • CCITT-16 Validator │
 │ • MPU6050 6-Axis IMU │ <──────────────────────── │ • Stop-and-Wait ACK  │
 │ • LiFePO4 Solar Node │     "ACK:LG-N01:seq"      │ • 256-Frame Ring Buf │
 └──────────────────────┘                           └──────────┬───────────┘
                                                               │ Local HTTP / Serial
                                                               ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                   LOCAL FASTAPI EDGE APPLICATION (Zero Cloud)           │
 │                                                                         │
 │  1. Ingestion & Security Guard:                                         │
 │     • Node Registry Whitelist (LG-N01..LG-N04)                          │
 │     • Monotonic Sequence Watermarking (409 Conflict Replay Defense)     │
 │                                                                         │
 │  2. Gray-Box Geotechnical Physics Engine:                               │
 │     • Pore-Water Pressure: u = r_u * gamma * z * cos^2(beta)            │
 │     • Factor of Safety: FoS = [c' + (sigma_n - u)*tan(phi')] / tau      │
 │                                                                         │
 │  3. XGBoost Hazard Ensemble:                                            │
 │     • Features: [Moisture, Rain, Rain24h, Tilt, TiltRate, FoS]          │
 │     • Physics Rule: FoS < 1.00 ==> Risk >= 0.75 (CRITICAL)              │
 │     • SHAP Explainability: Local Feature Attributions (+/- contribution)│
 │                                                                         │
 │  4. Data Persistence & Real-Time Sync:                                  │
 │     • SQLite (WAL Mode, zero network dependencies)                      │
 │     • Bi-Directional WebSocket Broadcast (/ws/telemetry)                │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │ WebSocket / REST
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │              REACT MISSION CONTROL DASHBOARD (100% Localhost)           │
 │                                                                         │
 │ • Real-Time Telemetry Cards (VWC %, Rain mm, Dip Angle °, Creep Rate)   │
 │ • Geotechnical Gauge (Factor of Safety with Bishop Equilibrium state)   │
 │ • XGBoost Risk Meter (LOW -> MODERATE -> HIGH -> CRITICAL)              │
 │ • SHAP Feature Attribution Inspector ("Why is risk level X?")           │
 │ • Incident Command & Alert Acknowledgment Strip                         │
 │ • Leaflet GIS Sector Map & Signal Diagnostic Metrics (RSSI / SNR)       │
 │ • SIH 2026 Interactive 6-State Judging Demo Controller                  │
 └─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Subsystem Breakdown

### A. Edge Transducers & Wireless LoRa Ingestion
- **Capacitive Soil Moisture V2.0:** Corrosion-free volumetric water content (VWC) measurement (Air baseline: `3200 ADC`, Saturated: `1100 ADC`).
- **FC-37 Tipping Bucket Interface:** Dual-channel rain intensity detection and 24-hour cumulative precipitation tracking.
- **MPU6050 6-Axis IMU:** Digital Low-Pass Filtered (DLPF 10Hz) accelerometer/gyroscope calculating 3D spatial dip angle $\beta = \arccos\left(\frac{a_z}{\sqrt{a_x^2 + a_y^2 + a_z^2}}\right)$ and angular velocity $\frac{\Delta\beta}{\Delta t}$ (°/min).
- **LoRa 433MHz 32-Byte Packed Struct:** High airtime efficiency (~12ms per packet) with magic preamble (`0xAA`), sequence numbering, float packing, and CCITT-16 CRC.

### B. Gray-Box Geotechnical Physics Engine
Implements the infinite slope limit equilibrium model with pore-water pressure coupling:

$$\text{FoS} = \frac{c' + (\sigma_n - u)\tan\phi'}{\gamma z \sin\beta \cos\beta}$$

Where:
- $c'$ = Effective soil cohesion ($8.5\text{ kPa}$)
- $\phi'$ = Internal friction angle ($28^\circ$)
- $\gamma$ = Bulk unit soil weight ($18.5\text{ kN/m}^3$)
- $z$ = Shear slip surface depth ($1.5\text{ m}$)
- $\beta$ = Real-time slope inclination from IMU
- $u$ = Dynamic pore-water pressure derived from volumetric moisture saturation

| Factor of Safety ($\text{FoS}$) | Geotechnical Stability State | Operational Threshold |
| :--- | :--- | :--- |
| $\text{FoS} \ge 1.30$ | **Stable Slope** | Nominal routine monitoring |
| $1.00 \le \text{FoS} < 1.30$ | **Marginally Stable** | Heightened surveillance; moisture threshold crossed |
| $\text{FoS} < 1.00$ | **Limit Equilibrium Failure** | Shear stress exceeds shear strength; imminent collapse |

### C. XGBoost AI & Local SHAP Explainability
- **Feature Vector (6D):** `[soil_moisture_pct, rainfall_pct, rainfall_24h_mm, tilt_angle, tilt_rate, factor_of_safety]`.
- **Hybrid Coupling:** If $\text{FoS} < 1.00$, the system enforces a strict physical boundary condition: $\text{risk\_score} \ge 0.75$ and classification level = `CRITICAL`.
- **SHAP (SHapley Additive exPlanations):** Every inference decomposes the prediction into human-readable causal contributions (e.g., *“Factor of Safety (0.88) added +20.7% to risk; Soil Moisture (84%) added +14.2%”*).

### D. Incident Command & Multi-Tier Alerting
- **Alert Levels:** `LOW` $\rightarrow$ `MODERATE` $\rightarrow$ `HIGH` $\rightarrow$ `CRITICAL`.
- **Deduplication & Anti-Spam:** 2-minute cooldown per severity tier with full audit logging.
- **Railway Interlock Ready:** Designed to interface directly with railway signal section control (red signal relay) and disaster management SMS/sirens.

### E. Edge Cybersecurity & Monotonic Sequence Watermarking
- **Device Whitelist:** Strict node ID verification (`LG-N01`..`LG-N04`). Unauthorized nodes are rejected with `403 Forbidden`.
- **Monotonic Sequence Watermark:** Replayed packet sequences are dropped with `409 Conflict: REJECT — REPLAY DETECTED`.
- Full threat model documented in [`docs/SECURITY.md`](docs/SECURITY.md).

---

## 💰 Hardware Bill of Materials (BOM)

| Component | Specification | Approximate Cost (INR) | Approximate Cost (USD) |
| :--- | :--- | :--- | :--- |
| **Microcontroller** | ESP32-WROOM-32 (Dual-core 240MHz, 520KB SRAM) | ₹350 | $4.20 |
| **Wireless Transceiver** | SX1278 LoRa 433MHz SPI Module | ₹400 | $4.80 |
| **Moisture Transducer** | Capacitive Soil Moisture Sensor v2.0 (Corrosion-resistant) | ₹120 | $1.45 |
| **IMU Kinematics** | MPU6050 6-Axis Accelerometer / Gyroscope (I2C) | ₹150 | $1.80 |
| **Precipitation Sensor** | FC-37 Rain Intensity Sensor + LM393 Comparator | ₹80 | $0.95 |
| **Power Supply** | 3.2V 18650 LiFePO4 Cell (1500mAh) + TP5000 Solar Charger | ₹300 | $3.60 |
| **Solar Harvesting** | 5V 1W Monocrystalline Solar Panel | ₹100 | $1.20 |
| **Enclosure** | IP66 Weatherproof Polycarbonate Junction Box | ₹150 | $1.80 |
| **TOTAL PER SENSOR NODE** | — | **₹1,650** | **~$19.80** |

*Compare with commercial imported borehole inclinometer stations costing ₹2,00,000+ ($2,400+).*

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.9+** with virtual environment support
- **Node.js 18+** and **npm**

---

### 1. One-Click Launcher (Recommended)

To clear any stale background ports and launch both the backend and frontend simultaneously:

```bash
# Clone or navigate to the repository
cd /Users/divyshresthvishwakarma/Downloads/Sih22

# Run the automated launch script
./start.sh
```

- 🌐 **Mission Control UI:** [http://localhost:5173](http://localhost:5173)
- 🔌 **FastAPI Backend Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- 🩺 **API Health Check:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### 2. Manual Two-Terminal Execution

#### Terminal 1 — Backend (FastAPI + SQLite + XGBoost):
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### Terminal 2 — Frontend (React + Vite):
```bash
cd frontend
npm run dev -- --port 5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎮 SIH Judging 6-State Demo Mode

To demonstrate the complete lifecycle to evaluators in **3 to 5 minutes**, LANDGUARD AI includes an interactive state controller on the dashboard:

```
┌────────────┐  ┌──────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  ┌──────────────┐
│ [ NORMAL ] │  │ [ RAIN ] │  │ [ HEAVY RAIN ] │  │ [ SATURATION ] │  │ [ SLOPE MOVEMENT ] │  │ [ CRITICAL ] │
└────────────┘  └──────────┘  └────────────────┘  └────────────────┘  └────────────────────┘  └──────────────┘
```

| State Button | Soil Moisture | Rain Intensity | Slope Dip Angle | Factor of Safety | Risk Level | Pipeline Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`[ NORMAL ]`** | **18.5%** | **0.0 mm/h** | **21.8°** | `1.85` | **LOW (2%)** | Baseline stable monitoring active |
| **`[ RAIN ]`** | **38.0%** | **35.0 mm/h** | **22.1°** | `1.45` | **LOW (21%)** | Event: *"Rainfall detected"* |
| **`[ HEAVY RAIN ]`** | **58.0%** | **75.0 mm/h** | **22.8°** | `1.28` | **MODERATE (51%)** | Event: *"Moisture threshold crossed"* |
| **`[ SATURATION ]`** | **84.0%** | **85.0 mm/h** | **25.2°** | `1.08` | **HIGH (65%)** | 🟠 **HIGH RISK ALERT** generated |
| **`[ SLOPE MOVEMENT ]`** | **91.0%** | **80.0 mm/h** | **31.5°** | `0.92` | **CRITICAL (82%)** | 🔴 **CRITICAL HAZARD ALARM** (FoS < 1.0) |
| **`[ CRITICAL ]`** | **96.0%** | **92.0 mm/h** | **38.4°** | `0.65` | **CRITICAL (95%)** | 🚨 **EMERGENCY EVACUATION SIREN** |

> 📖 **Full Presentation Script:** Follow the minute-by-minute judging guide in [`docs/SIH_DEMO_SCRIPT.md`](docs/SIH_DEMO_SCRIPT.md).

---

## 📂 Repository Structure

```
Sih22/
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── api/                    # REST & WebSocket Routers (Health, Nodes, Telemetry, Risk, Alerts, Demo, Security)
│   │   ├── models/                 # SQLAlchemy DB Models (Node, Telemetry, RiskResult, Alert, SecurityEvent)
│   │   ├── schemas/                # Pydantic v2 Request/Response Schemas
│   │   ├── services/               # Core Logic (Physics Engine, Risk Engine, Alert Dispatcher, Demo Service)
│   │   ├── config.py               # Application Settings & Environment Variables
│   │   ├── database.py             # SQLite WAL-mode Connection Manager
│   │   └── main.py                 # FastAPI Application Factory & Lifespan Hooks
│   ├── tests/                      # Pytest Test Suite (52 tests across all subsystems)
│   └── requirements.txt            # Python Backend Dependencies
├── frontend/                       # React 18 + Vite Mission Control Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/          # UI Panels (SensorCards, RiskCard, LiveCharts, AIExplanation, PhysicalDemoPanel, SecurityPanel)
│   │   │   ├── common/             # Global Widgets (VirtualChatbotModal, StatusBadge)
│   │   │   └── layout/             # Header, Sidebar, Footer, Navigation
│   │   ├── hooks/                  # useMockTelemetry (Live WebSocket & Mock State Synchronization)
│   │   ├── pages/                  # SPA Views (Dashboard, SensorStation, Alerts, Analytics, Map, Settings, About)
│   │   ├── types/                  # TypeScript Interfaces & Enums
│   │   └── config.ts               # Dynamic API/WebSocket URL Resolver
│   ├── package.json                # Frontend NPM Dependencies
│   └── vite.config.ts              # Vite Build Configuration
├── firmware/                       # Microcontroller Firmware Source
│   ├── sensor-node/                # ESP32 Sensor Station (LoRa Transmitter, IMU kinematics, Sleep Cycle)
│   └── gateway/                    # ESP32 LoRa Gateway (LoRa Receiver, Ring Buffer, HTTP Dispatcher)
├── ml/                             # Machine Learning & Geotechnical Pipeline
│   ├── models/                     # XGBoost Model Artifacts (.json & .pkl)
│   ├── inference/                  # Predictor Class, Bishop Equilibrium & TreeSHAP Attributions
│   └── training/                   # Physics-Informed Synthetic Dataset Generator & Train Script
├── tools/                          # Command-Line Testing & Presentation Tools
│   ├── bench_test.py               # 8-Step Full System Hardware Integration Bench
│   ├── sih_demo_runner.py          # 6-State Automated SIH Presentation CLI
│   └── physical_demo_runner.py     # 4-Stage Laboratory Experiment CLI
├── docs/                           # Technical Specifications & Documentation
│   ├── SIH_DEMO_SCRIPT.md          # 5-Minute Live Judging Presentation Script
│   ├── SECURITY.md                 # Cybersecurity Threat Model & Replay Defense Architecture
│   └── DEPLOYMENT.md               # Localhost & Cloud Deployment Guide
├── start.sh                        # One-Click Port Cleanup & Application Launcher
└── README.md                       # Main Project Documentation
```

---

## 🧪 Automated Verification & Bench Testing

### 1. Run Complete 52-Test Backend Pytest Suite
```bash
cd backend
PYTHONPATH=..:. .venv/bin/pytest
# Expected: 52 passed in <1.0s
```

### 2. Run Hardware Integration Bench Suite
```bash
python3 tools/bench_test.py
# Validates: Soil calibration -> IMU kinematics -> Rain gauge -> LoRa 32B frame -> Gateway ACK -> XGBoost/SHAP -> WebSocket
```

### 3. Run CLI SIH Demo Sequence
```bash
python3 tools/sih_demo_runner.py
# Automatically steps through NORMAL -> RAIN -> HEAVY RAIN -> SATURATION -> SLOPE MOVEMENT -> CRITICAL
```

### 4. Build Frontend for Production
```bash
cd frontend
npm run build
# Compiles clean TypeScript bundle with zero errors
```

---

## 🌐 UI Localization (Ollama, landslide-belt languages)

The operator dashboard is translated **at runtime** by a **local Ollama LLM** (no cloud translation API). English remains the source of truth in `frontend/src/i18n/strings.ts`. Switching language sends the catalog in one batch to `POST /api/v1/translate/ui`. If Ollama is down or times out, the UI stays in English and shows a non-blocking toast.

**Prerequisite:** `ollama serve` with a multilingual model, e.g. `ollama pull llama3.2` (default) or `gemma2:9b`. Config: `OLLAMA_HOST` (default `http://localhost:11434`), `OLLAMA_MODEL`, `TRANSLATION_TIMEOUT_SECONDS=8`.

### Directly translated (LLM-supported)

These codes are sent to the model. They cover the Himalayan belt, Northeast hill states, and Western Ghats:

| Code | Language | Landslide-prone coverage |
|------|----------|--------------------------|
| `en` | English | National / fallback |
| `hi` | Hindi | Uttarakhand, Himachal Pradesh, general Himalayan belt |
| `ne` | Nepali | Sikkim, Darjeeling hills |
| `as` | Assamese | Assam hills, NE gateway |
| `bn` | Bengali | Darjeeling, West Bengal hills |
| `mni` | Manipuri (Meitei) | Manipur |
| `ml` | Malayalam | Western Ghats — Kerala |
| `ta` | Tamil | Western Ghats — Nilgiris, Tamil Nadu |
| `kn` | Kannada | Western Ghats — Karnataka |

### Regional languages (shown via documented fallback — **not** sent to the LLM)

Hyper-local and tribal languages are **not reliably produced** by current open LLMs. The picker lists them under “Regional languages (approximate)”. Selecting one **redirects** to the mapped language and returns `used_fallback: true` so the UI can show an honest note (e.g. “Shown in Hindi — Garhwali is not reliably supported by LLMs”).

| Requested | ISO | Fallback | Why |
|-----------|-----|----------|-----|
| Garhwali | `gbm` | Hindi (`hi`) | Central Pahari; no reliable LLM coverage |
| Kumaoni | `kfy` | Hindi (`hi`) | Central Pahari; no reliable LLM coverage |
| Pahari / Western Pahari | `him` | Hindi (`hi`) | Dialect cluster; LLM syntax is unreliable |
| Kinnauri | `kns` | Hindi (`hi`) | Tibeto-Burman; no open corpus |
| Dogri | `doi` | Hindi (`hi`) | Hill Indo-Aryan; fragmented LLM output |
| Khasi | `kha` | English (`en`) | Austroasiatic; Meghalaya admin English (Assamese secondary) |
| Garo | `grt` | English (`en`) | Meghalaya Garo Hills; admin English (Assamese secondary) |
| Mizo | `lus` | English (`en`) | Mizoram emergency comms typically English |
| Lepcha | `lep` | Nepali (`ne`) | Sikkim/Darjeeling indigenous; no reliable LLM |
| Bhutia | `tsj` | Nepali (`ne`) | Sikkim/Kalimpong Tibetic; no reliable LLM |
| Nyishi | `njz` | English (`en`) | Arunachal Tani; state admin English (Hindi secondary) |
| Adi | `adi` | English (`en`) | Arunachal Tani; state admin English (Hindi secondary) |

Source of truth for the map: `backend/app/services/translation_service.py` (`FALLBACK_LANGUAGE_MAP`) and `frontend/src/i18n/fallbackLanguages.ts`. Language catalog API: `GET /api/v1/translate/languages`.

---

## 💡 Anticipated Jury Q&A

<details>
<summary><strong>Q1: How does LANDGUARD AI operate during total network or power outages?</strong></summary>

> **Answer:** The system is 100% offline-first. Sensor nodes harvest solar energy and communicate with the local gateway over 433MHz LoRa (range up to 5km line-of-sight). The gateway connects directly to a local edge laptop over LAN or USB Serial. All physics calculations, XGBoost inference, and SQLite storage occur entirely on localhost with zero internet dependency.
</details>

<details>
<summary><strong>Q2: Why combine Geotechnical Physics (FoS) with Machine Learning (XGBoost)?</strong></summary>

> **Answer:** Pure physics models struggle with non-linear multi-day rainfall accumulation and transient micro-creep dynamics. Pure black-box ML models can overfit or hallucinate under unseen conditions. Our Gray-Box architecture computes the infinite slope limit equilibrium Factor of Safety ($\text{FoS}$) as an explicit feature and enforces a hard physics boundary ($\text{FoS} < 1.0 \implies \text{Risk} \ge 0.75$), preventing physically impossible predictions.
</details>

<details>
<summary><strong>Q3: How do you prevent false alarms caused by wind, passing animals, or footsteps?</strong></summary>

> **Answer:** We employ multi-transducer correlation filtering. An alarm is never triggered by isolated IMU vibration alone. High-hazard warnings require correlated evidence: sustained elevated volumetric soil moisture (>75%), cumulative rainfall load (>50mm), and directional angular creep over a 10-second rolling window.
</details>

<details>
<summary><strong>Q4: What is required to transition this prototype to real-world operational deployment?</strong></summary>

> **Answer:** Before field deployment on a specific hillside:
> 1. Conduct borehole soil core sampling to determine localized cohesion ($c'$) and internal friction angle ($\phi'$).
> 2. Calibrate regional antecedent precipitation index (API) curves against historical IMD/USGS rainfall data.
> 3. Encase sensor nodes in cast-aluminum IP67 hermetic enclosures with anchored ground anchors.
</details>

---

## 📜 License & Acknowledgments

- Built for the **Smart India Hackathon (SIH 2026)**.
- Distributed under the **MIT License**. See `LICENSE` for details.
- Geotechnical formulations based on Bishop (1955) and Fellenius (1936) infinite slope limit-equilibrium principles.
