# TerraWarn — Design System & Component Inventory (v1)

**Aesthetic Lane:** Field Ops Instrument  
**Paired spec:** `docs/PRODUCT.md` (IA, severity, redirects, cut list)  
**Design Philosophy:** Linear restraint + Felt cartography + Stripe documentation clarity. Built for low cognitive load under high operational stress.

**Assumption:** Tokens below are the only severity accents. No purple AI glow, mesh gradients, or generic zinc+violet shadcn defaults on primary surfaces.

---

## 1. Tokens

Canonical dark lane is Field Ops Dark. Light theme remains available; do not invent a third palette.

| Token | Light | Dark (canonical) | Use |
| :--- | :--- | :--- | :--- |
| `--surface-ground` | `#f4f6fa` | `#080c14` | App shell |
| `--surface-card` | `#ffffff` | `#0f172a` | Cards, drawers |
| `--surface-elevated` | `#f8fafc` | `#162032` | Popovers, dock |
| `--surface-border` | `#e2e8f0` | `rgba(255,255,255,0.08)` | Hairline only |
| `--text-primary` | `#0f172a` | `#f8fafc` | Titles, FoS |
| `--text-secondary` | `#475569` | `#e2e8f0` | Body |
| `--text-muted` | `#64748b` | `#a1a1aa` | Meta, IST |
| `--severity-safe` | `#10b981` | `#10b981` | SAFE / MONITOR |
| `--severity-watch` | `#eab308` | `#eab308` | WATCH / BE AWARE |
| `--severity-warning` | `#f97316` | `#f97316` | WARNING / PREPARE |
| `--severity-alarm` | `#ef4444` | `#ef4444` | ALARM / ACT NOW |

**Type**

- UI: Plus Jakarta Sans (`--font-sans`)
- Telemetry / FoS / clocks: JetBrains Mono (`--font-mono`)
- Instrument Serif (`--font-serif`) **only** on ALARM headlines

**Motion:** 120–180 ms, `--ease-out`. No scroll-jack. Honor `prefers-reduced-motion`.

**Borders:** 1px hairline. No glassmorphism wallpaper. No jumping card shadows.

---

## 2. Severity language (never color-only)

Every chip is **icon + uppercase noun + NWS action verb**.

| Severity | Icon | Action | FoS |
| :--- | :--- | :--- | :--- |
| SAFE | ShieldCheck | MONITOR | ≥ 1.30 |
| WATCH | Eye | BE AWARE | 1.15–1.30 |
| WARNING | AlertTriangle | PREPARE | 1.00–1.15 |
| ALARM | AlertOctagon | ACT NOW | < 1.00 |

Physics override: FoS < 1.00 forces ALARM over the ML score. Never show Evacuate on SAFE or WATCH.

Implemented in `frontend/src/ops/severity.ts` + `StatusPill`.

---

## 3. Component inventory

Build these as custom Field Ops skins (not generic AI-SaaS cards).

| Component | Job |
| :--- | :--- |
| `StatusPill` | Icon + label + action; `sm` / `md` |
| `DemoBanner` | Persistent DEMO vs LIVE strip |
| `LastSyncBar` | Last packet time IST + node count + refresh |
| `RiskCard` | FoS / 24h rain / movement → `/map?node=` |
| `AlertRow` | Action-first headline, sector, IST, source, FoS |
| `MapLegend` | Always-on 4-tier + “worst wins on overlap” |
| `NodePeek` | Map select drawer: KPIs + last-seen |
| `ProvenanceFooter` | Sensors · model · weather source · last sync IST · disclaimer |
| `EmptyState` | “All monitored slopes within baseline — next check {IST}” |
| `ErrorState` | Offline / retry; never a blank pane |
| `ActionSheet` | Mobile primary CTA (Active alerts) |

Every data panel has **empty / loading (skeleton) / error / success**.

---

## 4. Layout rules

**Overview (`/`)**  
LastSyncBar → large gestalt SAFE|WATCH|WARNING|ALARM + action + since → 3 RiskCards → latest 5 AlertRows → online/offline node strip → ProvenanceFooter. No SHAP, BOM, GeoBot, TTS, or chart museum.

**Map (`/map`)**  
Full-bleed Leaflet. Dock 320–380px (Alerts | Nodes | Layers). Always-on legend. ≤4 layers (Risk, Nodes, Rain 24h, Reports). `as of {IST}`. Esc closes peek. Mobile = bottom sheet. Deep links `/map?node=&alert=`.

**Alerts (`/alerts`)**  
GDACS-grade inbox. Sort severity then recency. Filters: severity, sector, source, window. Detail drawer: what / why (≤3 drivers) / checklist / provenance / SIMULATION|DRILL badge.

**Nodes (`/nodes`, `/nodes/:id`)**  
List: name, sector, severity, FoS, last_seen, online. Detail: KPI tiles with units + 24h sparklines + “How to read FoS” disclosure.

**Chrome**  
Primary nav ≤4 (Overview · Map · Alerts · Nodes). Settings is a utility icon. No GeoBot / TTS on Overview, Map, or global layout.

---

## 5. Trust chrome

- DEMO vs LIVE is always visible when not on real hardware.
- Every FoS / hazard % shows model version · data window · last evaluated · demo|live.
- Cite IMD / GSI / SDMA as outbound sources with observation time. Never impersonate them.
- Footer: *Not an official government warning. In an emergency call local services (112).*
- Blind test: Overview + Map with logo cropped must not look like generic purple AI SaaS.

---

## 6. Anti-slop checklist

- [ ] Severity never color-only
- [ ] No mesh gradients / purple glow / “Neural” / “Elite”
- [ ] Instrument Serif only on ALARM headlines
- [ ] Hairline borders, 150–180 ms motion
- [ ] WCAG 2.2 AA contrast on chips and text
- [ ] Empty / loading / error designed first
