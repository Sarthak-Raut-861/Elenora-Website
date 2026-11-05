from pydantic import BaseModel, field_serializer, ConfigDict
from app.models.payment import PaymentType, PaymentStatus
from datetime import datetime
from decimal import Decimal

class CreateOrderRequest(BaseModel):
    payment_type: PaymentType

class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int # amount in paise for Razorpay
    currency: str = "INR"
    key: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    type: PaymentType
    amount: Decimal
    status: PaymentStatus
    razorpay_order_id: str | None = None
    razorpay_payment_id: str | None = None
    created_at: datetime

    @field_serializer("amount")
    def serialize_decimal(self, value: Decimal):
        return float(value)
