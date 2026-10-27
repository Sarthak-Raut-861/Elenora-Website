from sqlalchemy import Column, Integer, ForeignKey, Date, DateTime, Enum, Numeric, String
from datetime import datetime, timezone
import enum

from sqlalchemy.orm import relationship

from app.db.base import Base


class BookingStatus(str, enum.Enum):
    pending = "pending"
    booked = "booked"
    allocated = "allocated"
    rent_paid = "rent_paid"       # rent paid, pickup date still in the future
    picked_up = "picked_up"       # pickup date has arrived/passed
    ready_for_pickup = "ready_for_pickup"
    return_requested = "return_requested"  # user has requested return, awaiting admin processing
    returned = "returned"
    overdue = "overdue"
    cancelled = "cancelled"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rental_plan_id = Column(Integer, ForeignKey("rental_plans.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    requested_asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    aadhaar_number = Column(String(12), nullable=True)
    pan_number = Column(String(10), nullable=True)

    status = Column(Enum(BookingStatus), nullable=False, default=BookingStatus.pending)

    pickup_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)

    deposit_amount = Column(Numeric(10, 2), nullable=False)
    rent_amount = Column(Numeric(10, 2), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    user = relationship("User")
    rental_plan = relationship("RentalPlan", back_populates="bookings")
    category = relationship("Category")
    requested_asset = relationship("Asset", foreign_keys=[requested_asset_id])