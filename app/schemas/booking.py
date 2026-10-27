from pydantic import BaseModel, field_validator, field_serializer
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from app.models.bookings import BookingStatus
from app.schemas.rental_plan import RentalPlanResponse


class UserBasicResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    rental_plan_id: int
    pickup_date: date
    category_id: Optional[int] = None
    requested_asset_id: Optional[int] = None
    aadhaar_number: str
    pan_number: str

    @field_validator("aadhaar_number", mode="before")
    @classmethod
    def validate_aadhaar_number(cls, value: str) -> str:
        normalized = "".join(ch for ch in str(value) if ch.isdigit())
        if len(normalized) != 12:
            raise ValueError("Aadhaar must be exactly 12 digits")
        return normalized

    @field_validator("pan_number", mode="before")
    @classmethod
    def validate_pan_number(cls, value: str) -> str:
        normalized = "".join(ch for ch in str(value).upper() if ch.isalnum())
        if len(normalized) != 10:
            raise ValueError("PAN must be 10 characters")

        if not (
            normalized[:5].isalpha()
            and normalized[5:9].isdigit()
            and normalized[9].isalpha()
        ):
            raise ValueError("PAN format must be like ABCDE1234F")

        return normalized

class BookingResponse(BaseModel):
    id: int
    user_id: int
    rental_plan_id: int
    category_id: Optional[int] = None
    requested_asset_id: Optional[int] = None
    allocated_asset_id: Optional[int] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    status: BookingStatus
    pickup_date: date
    due_date: date
    deposit_amount: Decimal
    rent_amount: Decimal
    created_at: datetime

    user: UserBasicResponse
    rental_plan: RentalPlanResponse

    @field_serializer("deposit_amount", "rent_amount")
    def serialize_decimal(self, value: Decimal):
        return float(value)

    class Config:
        from_attributes = True

class BookingListResponse(BaseModel):
    bookings : List[BookingResponse]


class BlockedDateRange(BaseModel):
    booking_id: int
    from_date: date
    to_date: date


class BlockedDateRangesResponse(BaseModel):
    asset_id: int
    blocked_ranges: List[BlockedDateRange]