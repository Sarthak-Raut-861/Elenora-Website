from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.db.base import Base


class AssetStatus(str, enum.Enum):
    available = "available"
    booked = "booked"
    allocated = "allocated"
    ready_for_pickup = "ready_for_pickup"
    picked_up = "picked_up"
    returned = "returned"
    overdue = "overdue"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column(String, nullable=False, unique=True, index=True) 
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    status = Column(Enum(AssetStatus), nullable=False, default=AssetStatus.available)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)  # added
    is_in_dry_cleaning = Column(Boolean, default=False, nullable=False)

    # Relationships
    category = relationship("Category", back_populates="assets")