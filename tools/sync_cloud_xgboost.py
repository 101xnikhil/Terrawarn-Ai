#!/usr/bin/env python3
"""
Terrawarn-Ai — Cloud XGBoost Continuous Stream Syncer
Pulls live telemetry & XGBoost predictions from http://34.131.240.174:8000/api/demo/telemetry
and feeds them into the local Terrawarn-Ai Mission Control dashboard in real time.

Usage:
    python tools/sync_cloud_xgboost.py
    python tools/sync_cloud_xgboost.py --interval 5 --cloud-url http://34.131.240.174:8000/api/demo/telemetry
"""

import time
import sys
import argparse
import httpx

DEFAULT_CLOUD_URL = "http://34.131.240.174:8000/api/demo/telemetry"
DEFAULT_LOCAL_URL = "http://127.0.0.1:8000/api/demo/sync-cloud"


def sync_cloud_stream(cloud_url: str, local_sync_url: str, interval: float):
    print("=" * 75)
    print("  🌐 TERRAWARN-AI — CLOUD XGBOOST TELEMETRY SYNC")
    print(f"  Cloud Server: {cloud_url}")
    print(f"  Local Target: {local_sync_url}")
    print(f"  Sync Interval: {interval}s")
    print("=" * 75)

    client = httpx.Client(timeout=8.0)
    count = 0

    try:
        while True:
            count += 1
            try:
                # Trigger local sync endpoint which pulls and commits to DB
                resp = client.post(local_sync_url)
                if resp.status_code == 200:
                    data = resp.json()
                    telem = data.get("cloud_telemetry", {})
                    risk = data.get("cloud_risk", {})
                    score = risk.get("risk_score", 0.0)
                    level = risk.get("risk_level", "UNKNOWN")
                    moist = telem.get("soil_moisture", 0.0)
                    rain = telem.get("rainfall_24h", 0.0)
                    tilt = telem.get("tilt_angle", 0.0)

                    color = "\033[92m" if level == "LOW" else "\033[93m" if level == "MODERATE" else "\033[91m"
                    reset = "\033[0m"

                    print(f"[{count:03d}] {color}● {level:<8}{reset} | Score: {score:>5}% | Moisture: {moist:>5.1f}% | Rain24h: {rain:>5.1f}mm | Tilt: {tilt:>5.2f}° | Node: {telem.get('node_id', 'LG-N01')}")
                else:
                    print(f"[{count:03d}] ⚠️ Error {resp.status_code}: {resp.text[:100]}")
            except Exception as e:
                print(f"[{count:03d}] ⚠️ Connection issue: {e}")

            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n⏹️ Stopped cloud sync stream.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync live XGBoost telemetry from cloud server")
    parser.add_argument("--cloud-url", default=DEFAULT_CLOUD_URL, help="Cloud API endpoint")
    parser.add_argument("--local-url", default=DEFAULT_LOCAL_URL, help="Local sync endpoint")
    parser.add_argument("--interval", type=float, default=6.0, help="Poll interval in seconds")
    args = parser.parse_args()

    sync_cloud_stream(args.cloud_url, args.local_url, args.interval)
