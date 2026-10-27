from sqlalchemy import Column, Integer, ForeignKey, DateTime
from datetime import datetime, timezone

from app.db.base import Base


class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, index=True)

    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False,index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)

    allocated_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    allocated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )