from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime


class RentalPlanCreate(BaseModel):
    name: str
    duration_days: int
    daily_rate: Decimal
    deposit_amount: Decimal
    daily_fine_rate: Decimal
    damage_fee: Decimal = Decimal('0')


class RentalPlanUpdate(BaseModel):
    name: str | None = None
    duration_days: int | None = None
    daily_rate: Decimal | None = None
    deposit_amount: Decimal | None = None
    daily_fine_rate: Decimal | None = None
    damage_fee: Decimal | None = None
    is_active: bool | None = None


class RentalPlanResponse(BaseModel):
    id: int
    name: str
    duration_days: int
    daily_rate: Decimal
    deposit_amount: Decimal
    daily_fine_rate: Decimal
    damage_fee: Decimal
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True