from sqlalchemy import Column, Integer, ForeignKey, Date, DateTime, Numeric, Boolean, String
from datetime import datetime, timezone

from app.db.base import Base


class Return(Base):
    __tablename__ = "returns"

    id = Column(Integer, primary_key=True, index=True)

    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)

    returned_at = Column(Date, nullable=False)

    days_late = Column(Integer, nullable=False, default=0)
    fine_amount = Column(Numeric(10, 2), nullable=False, default=0)
    damage_amount = Column(Numeric(10, 2), nullable=False, default=0)
    damage_notes = Column(String, nullable=True)

    deposit_refunded = Column(Boolean, default=False, nullable=False)

    processed_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )