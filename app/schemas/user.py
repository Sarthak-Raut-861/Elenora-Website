from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional
from app.models.user import UserRole
from app.models.bookings import BookingStatus
from app.models.payment import PaymentType, PaymentStatus
from app.schemas.rental_plan import RentalPlanResponse

class UserCreateAdmin(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.user
    phone: str | None = None

class UserUpdate(BaseModel):
    full_name: str | None = None
    phone : str | None = None

class UserUpdateAdmin(BaseModel):
    full_name: str | None = None
    phone : str | None = None

class UserRoleUpdate(BaseModel):
    role: UserRole  # now accepts admin | user | dry_cleaner

class UserActivate(BaseModel):
    is_active: bool


class UserHistoryUser(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    phone: str | None = None


class UserHistorySummary(BaseModel):
    total_bookings: int
    active_bookings: int
    total_deposit_paid: Decimal
    total_rent_paid: Decimal
    total_fine_paid: Decimal
    total_deposit_refunded: Decimal

    @field_serializer(
        "total_deposit_paid",
        "total_rent_paid",
        "total_fine_paid",
        "total_deposit_refunded",
    )
    def serialize_decimal(self, value: Decimal):
        return float(value)


class UserBookingHistoryItem(BaseModel):
    id: int
    rental_plan_id: int
    rental_plan: Optional[RentalPlanResponse] = None
    category_id: Optional[int] = None
    requested_asset_id: Optional[int] = None
    status: BookingStatus
    pickup_date: date
    due_date: date
    deposit_amount: Decimal
    rent_amount: Decimal
    created_at: datetime

    @field_serializer("deposit_amount", "rent_amount")
    def serialize_decimal(self, value: Decimal):
        return float(value)

    class Config:
        from_attributes = True


class UserPaymentHistoryItem(BaseModel):
    id: int
    booking_id: int
    type: PaymentType
    status: PaymentStatus
    amount: Decimal
    created_at: datetime

    @field_serializer("amount")
    def serialize_decimal(self, value: Decimal):
        return float(value)


class UserHistoryResponse(BaseModel):
    user: UserHistoryUser
    aadhaar_number: str | None = None
    pan_number: str | None = None
    summary: UserHistorySummary
    bookings: list[UserBookingHistoryItem]
    payments: list[UserPaymentHistoryItem]

