# TerraWarn — Product Specification & Information Architecture (v1)

**Product:** TerraWarn operator console (slope early warning)  
**Primary user:** DDMA / EOC operator in India during monsoon  
**Secondary user:** Jury / evaluators inspecting the DEMO harness  
**Audience lock:** A only. Citizen reporting and research-demo chrome are secondary and stay off primary nav.  
**Aesthetic lane:** Field Ops Instrument — ink/slate `#080c14` / `#0f172a`, severity green/yellow/orange/red, JetBrains Mono for numbers, Plus Jakarta for UI, Instrument Serif **only** for ALARM headlines.

This document locks IA before further UI rebuilds (Overview, Map, Alerts, Nodes). Assumptions are listed; no open questions.

---

## 1. Jobs to be done

### JTBD 1 — Situational awareness (0–3 s)
When rainfall or slope movement escalates, the operator must see **one gestalt status** (`SAFE` / `WATCH` / `WARNING` / `ALARM`), how long it has held, and the mandated action — without scrolling.

### JTBD 2 — Triage (3–30 s)
Isolate the worst three slopes, read FoS + 24h rain + movement, and jump to `/map?node=`.

### JTBD 3 — Provenance (audit)
Know whether packets are live hardware or a simulation harness, which model version produced a score, and when the last sample arrived (IST).

---

## 2. Severity taxonomy

Severity is **never color-only**. Every chip is icon + uppercase noun + NWS-style action verb.

| Severity | Accent | Icon | Action | FoS | Operator protocol |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SAFE | `#10b981` | ShieldCheck | MONITOR | FoS ≥ 1.30 | Routine telemetry. No traffic restriction. |
| WATCH | `#eab308` | Eye | BE AWARE | 1.15 ≤ FoS < 1.30 | Saturation elevated. Spot-check tension cracks. |
| WARNING | `#f97316` | AlertTriangle | PREPARE | 1.00 ≤ FoS < 1.15 | Creep accelerating. Pre-position response; stage detours. |
| ALARM | `#ef4444` | AlertOctagon | ACT NOW | FoS < 1.00 | Limit equilibrium violated. Field action per local SOP. |

**Physics override:** FoS < 1.00 (Bishop infinite-slope) forces `ALARM` and overrides the ML score.

**Never show Evacuate on SAFE or WATCH.**

Siren / railway-stoppage language is **SIMULATION-only** unless a live, tested actuator is connected.

---

## 3. Information architecture

Primary nav is **exactly four** destinations:

```
TerraWarn
├── /              Overview     gestalt + top risks + latest alerts
├── /map           Map          full-bleed canvas + docked ops panel
├── /alerts        Alerts       action-first inbox
└── /nodes         Nodes        station list
    └── /nodes/:id              node detail
│
Secondary (not in primary nav)
├── /reports       Field reports (optional; citizen path)
├── /settings      Operator prefs + gated Developer
├── /about         Method + disclaimer
├── /docs/hardware Node BOM & radio notes
└── /docs/model    Model card (Prompt 10)
```

Settings remains a utility icon, not a fifth nav destination.

### Exact redirects

| Requested | Canonical | Why |
| :--- | :--- | :--- |
| `/gis` | `/map` | Duplicate geospatial lane |
| `/metrics` | `/` | KPI home is Overview |
| `/dashboard` | `/` | Canonical home |
| `/analytics` | `/` | Time-series lives on Overview + node detail |
| `/sensor` | `/nodes` | Plural hardware noun |
| `/node` | `/nodes` | Singular alias |

Implemented in `frontend/src/App.tsx` (client) and `vercel.json` (platform).

---

## 4. Keep / cut

### Keep (core loop)
1. Map + nodes + risk overlay + always-on legend
2. Alert list: severity, time (IST), place, action, source
3. Node detail: moisture / rain / tilt / FoS + last-seen
4. Persistent DEMO vs LIVE banner
5. Provenance footer + legal disclaimer
6. Field reports as an optional secondary route (not primary audience)

### Cut or hard-gate (P0)
1. Neural TTS / “Listen in HD Voice” on primary alert UX
2. Terrawarn GeoBot on Dashboard / Map / global chrome
3. About → prior biomedical / microplastics portfolios
4. Editable team roster on About
5. Hardware BOM essay on About → `/docs/hardware`
6. Duplicate geospatial / analytics nav
7. “IMD National Geospatial Warning Service” and Assamese IMD agency skin
8. “Mission Control” / “Neural” / “Elite” product naming
9. Blynk pin map, GCP deploy snippets, XGBoost server IP on **default** Settings
10. Railway-stoppage / automated siren claims unless `SIMULATION`-badged and true

---

## 5. Trust rules (non-negotiable)

1. Never impersonate IMD, NDMA, DDMA, or SDMA. Cite them as **data sources** with outbound links and observation time.
2. Every FoS / hazard % shows model version · data window · last evaluated · demo|live.
3. Synthetic 6-phase progression is labeled **SIMULATION**.
4. SMS / siren / railway claims are demo-only unless a real, tested path exists.
5. Footer: *Not an official government warning. In an emergency call local services (112).*
6. GSI / IMD / SDMA appear as links, never as product identity.

---

## 6. Assumptions (Prompt 1 — no open questions)

1. **Audience A (DDMA/EOC)** is the only chrome we optimize. `/reports` stays reachable for field officers; it is not a fifth primary tab.
2. Default ingest is the **DEMO / SIMULATION harness** until a live ESP32 gateway is selected. The banner is honest about that.
3. Weather panels consume `/api/ner/weather-forecast` (or fallback empty). Copy cites IMD as source; it does not claim to *be* IMD.
4. XGBoost weights on the public demo are **demo weights** unless Developer mode points at a live inference URL.
5. SMS Fast2SMS is a **drill** path by default. Developer mode is required to see keys and pin maps.
6. `/docs/model` is specified here and shipped in Prompt 10. ProvenanceFooter links `/about` until then.
7. Light theme remains available; Field Ops Dark (`#080c14`) is the canonical lane.
8. Platform redirects in `vercel.json` plus React `<Navigate>` cover both hard refresh and in-app links.
9. GeoBot / TTS source files may remain on disk but must not mount on Overview, Map, or global layout.
10. Judges viewing DEMO mode are served by the same four-item nav plus the Demo banner — no separate “pitch” IA.

---

## 7. Follow-on UI rebuilds (do not merge into this lock)

| Prompt | Surface |
| :--- | :--- |
| 3 | Overview gestalt home |
| 4 | Map + docked ops panel |
| 5 | Alerts inbox |
| 6 | Nodes list + detail |
| 7 | Reports (optional) |
| 8 | Settings operator / developer split (gate starts in Prompt 2) |
| 9 | Design-system anti-slop pass |
| 10 | `/docs/model` model card |
| 11 | QA ship gate |
