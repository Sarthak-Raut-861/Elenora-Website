from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, Text
from datetime import datetime, timezone

from app.db.base import Base


class TrackingEvent(Base):
    __tablename__ = "tracking_events"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String, nullable=False)
    event_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    meta = Column(Text, nullable=True)  # JSON string for extra data (amount, notes, etc.)
