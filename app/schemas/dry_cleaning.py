from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from app.models.dry_cleaning import DryCleaningStatus


# ── Dry Cleaner Directory ────────────────────────────────────────────────────

class DryCleanerCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    specializations: Optional[List[str]] = None
    turnaround_days: int = 2
    price_per_item: Optional[Decimal] = None


class DryCleanerUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    specializations: Optional[List[str]] = None
    turnaround_days: Optional[int] = None
    price_per_item: Optional[Decimal] = None
    is_active: Optional[bool] = None


class DryCleanerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    specializations: Optional[List[str]] = None
    rating: Optional[float] = None
    total_jobs: int
    is_active: bool
    turnaround_days: int
    price_per_item: Optional[float] = None
    created_at: datetime


# ── Dry Cleaning Requests ────────────────────────────────────────────────────

class DryCleaningRequestCreate(BaseModel):
    asset_id: int
    booking_id: Optional[int] = None
    dry_cleaner_name: Optional[str] = None
    dry_cleaner_id: Optional[int] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    priority: str = "normal"
    expected_by: Optional[date] = None


class DryCleaningRequestUpdate(BaseModel):
    dry_cleaner_name: Optional[str] = None
    dry_cleaner_id: Optional[int] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    cleaner_notes: Optional[str] = None
    status: Optional[DryCleaningStatus] = None
    priority: Optional[str] = None
    expected_by: Optional[date] = None
    actual_cost: Optional[Decimal] = None
    rating: Optional[int] = None


class AssetInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    asset_code: str
    image_url: Optional[str] = None


class BookingUserInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str


class DryCleaningRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    booking_id: Optional[int] = None
    status: DryCleaningStatus
    priority: str = "normal"
    sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expected_by: Optional[date] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    cleaner_notes: Optional[str] = None
    dry_cleaner_name: Optional[str] = None
    dry_cleaner_id: Optional[int] = None
    actual_cost: Optional[float] = None
    rating: Optional[int] = None
    created_at: datetime

    # Enriched fields
    asset: Optional[AssetInfo] = None
    returned_by: Optional[BookingUserInfo] = None
    returned_at: Optional[str] = None
    dry_cleaner: Optional[DryCleanerResponse] = None
