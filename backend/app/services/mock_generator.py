import random
import math
from datetime import datetime
from typing import Dict, Any, Optional
from app.schemas.telemetry import TelemetryCreate


class MockTelemetryGenerator:
    """
    Generates synthetic IoT telemetry packets simulating
    geological and environmental sensor response.
    """

    def __init__(self, node_id: str = "TW-N01"):
        self.node_id = node_id
        self.seq_num = 1000
        self.tick_count = 0
        self.moisture_state = 25.0
        self.rainfall_24h_accum = 5.0
        self.tilt_state = 22.0
        self.tilt_prev = 22.0

    def generate_reading(self, scenario: str = "escalation") -> TelemetryCreate:
        self.tick_count += 1
        self.seq_num += 1
        t = self.tick_count

        if scenario == "dry_stable":
            target_moisture = 20.0 + 3.0 * math.sin(t * 0.1)
            target_rain = 0.0
            target_tilt = 22.0
            noise_tilt = 0.04
        elif scenario == "moderate_rain":
            target_moisture = 48.0 + 6.0 * math.sin(t * 0.1)
            target_rain = 35.0 + 10.0 * math.sin(t * 0.15)
            target_tilt = 23.5
            noise_tilt = 0.08
        elif scenario == "heavy_rain":
            target_moisture = 72.0 + 5.0 * math.sin(t * 0.1)
            target_rain = 75.0 + 12.0 * math.sin(t * 0.12)
            target_tilt = 26.0 + 0.01 * t
            noise_tilt = 0.12
        elif scenario == "crisis":
            target_moisture = 92.0 + 3.0 * math.sin(t * 0.1)
            target_rain = 90.0 + 5.0 * math.sin(t * 0.1)
            target_tilt = 32.0 + 0.05 * t
            noise_tilt = 0.25
        else:  # escalation
            target_moisture = min(95.0, 25.0 + t * 1.5)
            target_rain = min(90.0, 10.0 + t * 1.8)
            target_tilt = min(35.0, 22.0 + t * 0.25)
            noise_tilt = 0.10

        # Evolve continuous states
        self.moisture_state += (target_moisture - self.moisture_state) * 0.15 + random.gauss(0, 0.8)
        self.moisture_state = max(5.0, min(100.0, self.moisture_state))

        rain_pct = max(0.0, min(100.0, target_rain + random.gauss(0, 1.5)))
        self.rainfall_24h_accum = max(0.0, min(250.0, self.rainfall_24h_accum + rain_pct * 0.05))

        self.tilt_prev = self.tilt_state
        self.tilt_state += (target_tilt - self.tilt_state) * 0.10 + random.gauss(0, noise_tilt)
        self.tilt_state = max(5.0, min(65.0, self.tilt_state))

        tilt_rate = (self.tilt_state - self.tilt_prev) * 6.0  # scaled to °/min

        # Accelerometer derivations
        rad = math.radians(self.tilt_state)
        ax = math.sin(rad) + random.gauss(0, 0.01)
        az = math.cos(rad) + random.gauss(0, 0.01)
        ay = random.gauss(0, 0.01)

        raw_adc = int((1.0 - (self.moisture_state / 100.0)) * 3200 + 900)

        return TelemetryCreate(
            node_id=self.node_id,
            timestamp=datetime.utcnow(),
            soil_moisture=round(self.moisture_state, 1),
            soil_moisture_raw=raw_adc,
            rainfall=round(rain_pct, 1),
            rainfall_24h=round(self.rainfall_24h_accum, 1),
            rain_detected=rain_pct > 10.0,
            tilt_angle=round(self.tilt_state, 2),
            tilt_rate=round(tilt_rate, 3),
            accel_x=round(ax, 3),
            accel_y=round(ay, 3),
            accel_z=round(az, 3),
            gyro_x=round(random.gauss(0, 0.2), 2),
            gyro_y=round(random.gauss(0, 0.2), 2),
            gyro_z=round(random.gauss(0, 0.1), 2),
            battery=round(max(20.0, min(100.0, 95.0 - t * 0.02)), 0),
            battery_mv=int(3850 - t * 0.2 + random.gauss(0, 5)),
            rssi=int(-65 + random.gauss(0, 4)),
            snr=round(9.5 + random.gauss(0, 1.0), 1),
            seq_num=self.seq_num,
        )


mock_generator = MockTelemetryGenerator()
