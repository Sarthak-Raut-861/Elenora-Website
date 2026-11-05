from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class TrackingEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    event_type: str
    event_at: datetime
    description: Optional[str] = None
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None  # enriched
    meta: Optional[str] = None


class TrackingPageResponse(BaseModel):
    booking_id: int
    asset_name: Optional[str] = None
    asset_image_url: Optional[str] = None
    asset_category: Optional[str] = None
    current_status: str
    pickup_date: str
    due_date: str
    events: list[TrackingEventResponse]


class RecentActivityItem(BaseModel):
    event_id: int
    booking_id: int
    event_type: str
    event_at: datetime
    description: Optional[str] = None
    asset_name: Optional[str] = None
    asset_image_url: Optional[str] = None
    created_by_name: Optional[str] = None
