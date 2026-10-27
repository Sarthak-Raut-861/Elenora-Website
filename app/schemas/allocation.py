from pydantic import BaseModel
from datetime import datetime


class AllocationCreate(BaseModel):
    asset_id: int


class AllocationResponse(BaseModel):
    id: int
    booking_id: int
    asset_id: int
    allocated_by: int
    allocated_at: datetime

    class Config:
        from_attributes = True