from pydantic import BaseModel, ConfigDict
from datetime import datetime


class AllocationCreate(BaseModel):
    asset_id: int


class AllocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    asset_id: int
    allocated_by: int
    allocated_at: datetime
