from pydantic import BaseModel, field_serializer, Field
from datetime import date, datetime
from decimal import Decimal


# REQUEST SCHEMA

class ReturnCreate(BaseModel):
    returned_at: date
    damage_amount: Decimal = Field(default=Decimal('0'), ge=Decimal('0'))
    damage_notes: str | None = None
    send_for_dry_cleaning: bool = False

# RESPONSE SCHEMA

class ReturnResponse(BaseModel):
    id: int
    booking_id: int
    returned_at: date
    days_late: int
    fine_amount: Decimal
    damage_amount: Decimal
    damage_notes: str | None
    deposit_refunded: bool
    processed_by: int
    created_at: datetime

    @field_serializer("fine_amount", "damage_amount")
    def serialize_decimal(self, value: Decimal):
        return float(value)

    class Config:
        from_attributes = True