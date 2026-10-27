from sqlalchemy import Column, Integer, ForeignKey, DateTime, Date, Enum, Text, String, Numeric, Boolean
from datetime import datetime, timezone
import enum

from app.db.base import Base


class DryCleaningStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    in_progress = "in_progress"
    completed = "completed"


class DryCleaningPriority(str, enum.Enum):
    low = "low"
    normal = "normal"
    urgent = "urgent"


class DryCleaner(Base):
    __tablename__ = "dry_cleaners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact_person = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    specializations = Column(String, nullable=True)  # comma-separated: "Silk,Embroidery"
    rating = Column(Numeric(3, 2), nullable=True, default=5.0)
    total_jobs = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    turnaround_days = Column(Integer, nullable=False, default=2)
    price_per_item = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class DryCleaningRequest(Base):
    __tablename__ = "dry_cleaning_requests"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    status = Column(Enum(DryCleaningStatus), nullable=False, default=DryCleaningStatus.pending)
    priority = Column(String, nullable=False, default="normal")
    sent_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expected_by = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    cleaner_notes = Column(Text, nullable=True)
    dry_cleaner_name = Column(String, nullable=True)
    dry_cleaner_id = Column(Integer, ForeignKey("dry_cleaners.id"), nullable=True)
    actual_cost = Column(Numeric(10, 2), nullable=True)
    rating = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
