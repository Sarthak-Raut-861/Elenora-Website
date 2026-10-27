from sqlalchemy import Column, Integer, String, Boolean, Numeric, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base


class RentalPlan(Base):
    __tablename__ = "rental_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    duration_days = Column(Integer, nullable=False)
    daily_rate = Column(Numeric(10, 2), nullable=False)
    deposit_amount = Column(Numeric(10, 2), nullable=False)
    daily_fine_rate = Column(Numeric(10, 2), nullable=False)
    damage_fee = Column(Numeric(10, 2), nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    bookings = relationship("Booking", back_populates="rental_plan")