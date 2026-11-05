from pydantic import BaseModel, field_validator, field_serializer, ConfigDict
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from app.models.bookings import BookingStatus
from app.schemas.rental_plan import RentalPlanResponse


class UserBasicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    phone: Optional[str] = None


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

class BuyOrderCreate(BaseModel):
    asset_id: int
    size: Optional[str] = None
    color: Optional[str] = None
    delivery_date: Optional[date] = None
    shipping_address: Optional[str] = None
    contact_phone: Optional[str] = None


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    rental_plan_id: int
    category_id: Optional[int] = None
    requested_asset_id: Optional[int] = None
    allocated_asset_id: Optional[int] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    status: BookingStatus
    order_type: Optional[str] = "rent"
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

    @field_serializer("aadhaar_number")
    def mask_aadhaar(self, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        clean = "".join(ch for ch in str(value) if ch.isdigit())
        if len(clean) >= 4:
            return f"XXXXXXXX{clean[-4:]}"
        return "XXXXXXXX"

    @field_serializer("pan_number")
    def mask_pan(self, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        clean = str(value).strip().upper()
        if len(clean) == 10:
            return f"{clean[:2]}XXXXXX{clean[-1]}"
        return "XXXXXX"


class BookingListResponse(BaseModel):
    bookings : List[BookingResponse]


class BlockedDateRange(BaseModel):
    booking_id: int
    from_date: date
    to_date: date


class BlockedDateRangesResponse(BaseModel):
    asset_id: int
    blocked_ranges: List[BlockedDateRange]
