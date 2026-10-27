from sqlalchemy import Column, Integer, ForeignKey, Enum, Numeric, String, DateTime
from datetime import datetime, timezone
import enum

from app.db.base import Base


class PaymentType(str, enum.Enum):
    deposit = "deposit"
    rent = "rent"
    fine = "fine"
    deposit_refund = "deposit_refund"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)

    type = Column(Enum(PaymentType), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)

    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)

    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )