from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime
from typing import Optional, List, Dict, Any


class TelemetryCreate(BaseModel):
    node_id: str = Field(min_length=1, max_length=32, description="Node identifier, e.g. TW-N01")
    timestamp: Optional[datetime] = Field(default=None, description="UTC reading timestamp")
    
    # Telemetry measurements (flat format)
    soil_moisture: float = Field(ge=0.0, le=100.0, description="Calibrated moisture % (0-100)")
    soil_moisture_raw: Optional[int] = Field(default=None, ge=0, le=4095, description="Raw ADC count")
    rainfall: float = Field(default=0.0, ge=0.0, le=100.0, description="Current rainfall intensity %")
    rainfall_24h: float = Field(default=0.0, ge=0.0, description="Cumulative 24h precipitation in mm")
    rain_detected: Optional[bool] = Field(default=False)
    
    tilt_angle: float = Field(ge=0.0, le=90.0, description="Slope inclination dip in degrees")
    tilt_rate: float = Field(default=0.0, description="Displacement rate in °/min")
    accel_x: Optional[float] = Field(default=0.0)
    accel_y: Optional[float] = Field(default=0.0)
    accel_z: Optional[float] = Field(default=1.0)
    gyro_x: Optional[float] = Field(default=0.0)
    gyro_y: Optional[float] = Field(default=0.0)
    gyro_z: Optional[float] = Field(default=0.0)
    
    battery: float = Field(default=100.0, ge=0.0, le=100.0, description="Battery percentage")
    battery_mv: Optional[int] = Field(default=3800, ge=0, le=5000, description="Battery voltage in mV")
    rssi: int = Field(default=-70, ge=-130, le=0, description="LoRa RSSI in dBm")
    snr: float = Field(default=9.0, description="LoRa SNR in dB")
    seq_num: Optional[int] = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def parse_nested_or_flat(cls, data: Any) -> Any:
        """Allow both flat JSON format and enveloped/nested sensor format."""
        if isinstance(data, dict) and "sensors" in data:
            sensors = data.get("sensors", {})
            soil = sensors.get("soil_moisture", {})
            accel = sensors.get("accelerometer", {})
            gyro = sensors.get("gyroscope", {})
            tilt = sensors.get("tilt", {})
            rain = sensors.get("rain", {})
            battery_obj = data.get("battery", {})
            net_obj = data.get("network", {})
            
            flattened = {
                "node_id": data.get("node_id", "TW-N01"),
                "timestamp": data.get("timestamp", datetime.utcnow()),
                "seq_num": data.get("seq_num"),
                "soil_moisture": soil.get("pct", 0.0),
                "soil_moisture_raw": soil.get("raw"),
                "rainfall": rain.get("intensity_pct", 0.0),
                "rainfall_24h": rain.get("accum_24h_mm", rain.get("intensity_pct", 0.0)),
                "rain_detected": rain.get("detected", False),
                "tilt_angle": tilt.get("angle_deg", 0.0),
                "tilt_rate": tilt.get("rate_deg_min", 0.0),
                "accel_x": accel.get("x_g", 0.0),
                "accel_y": accel.get("y_g", 0.0),
                "accel_z": accel.get("z_g", 1.0),
                "gyro_x": gyro.get("x_dps", 0.0),
                "gyro_y": gyro.get("y_dps", 0.0),
                "gyro_z": gyro.get("z_dps", 0.0),
                "battery": battery_obj.get("level_pct", 100.0),
                "battery_mv": battery_obj.get("voltage_mv", 3800),
                "rssi": net_obj.get("rssi_dbm", -70),
                "snr": net_obj.get("snr_db", 9.0),
            }
            return flattened
        return data


class TelemetryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    node_id: str
    timestamp: datetime
    soil_moisture: float
    soil_moisture_raw: Optional[int] = None
    rainfall: float
    rainfall_24h: float
    rain_detected: Optional[bool] = False
    tilt_angle: float
    tilt_rate: float
    accel_x: Optional[float] = None
    accel_y: Optional[float] = None
    accel_z: Optional[float] = None
    gyro_x: Optional[float] = None
    gyro_y: Optional[float] = None
    gyro_z: Optional[float] = None
    battery: float
    battery_mv: Optional[int] = None
    rssi: int
    snr: float
    seq_num: Optional[int] = None


class TelemetryHistoryResponse(BaseModel):
    node_id: str
    count: int
    readings: List[TelemetryResponse]
