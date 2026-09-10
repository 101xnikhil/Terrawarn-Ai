from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


class NodeBase(BaseModel):
    name: str = Field(default="Slope Monitor Station", max_length=128)
    latitude: float = Field(default=31.1048, ge=-90.0, le=90.0)
    longitude: float = Field(default=77.1734, ge=-180.0, le=180.0)
    altitude_m: float = Field(default=2276.0)
    description: Optional[str] = Field(default="Sector 7 — Northern Ridge Face")
    status: str = Field(default="online")
    firmware_version: str = Field(default="v0.1.3-proto")


class NodeCreate(NodeBase):
    node_id: str = Field(min_length=2, max_length=32, description="Unique node identifier, e.g. TW-N01")


class NodeUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude_m: Optional[float] = None
    description: Optional[str] = None
    status: Optional[str] = None
    firmware_version: Optional[str] = None


class NodeResponse(NodeBase):
    model_config = ConfigDict(from_attributes=True)

    node_id: str
    created_at: datetime
    updated_at: datetime
    last_seen: datetime
