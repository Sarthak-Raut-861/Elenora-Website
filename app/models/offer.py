from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base


class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    scope = Column(String, default="sitewide", nullable=False)  # "sitewide", "category", "asset"
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    apply_to = Column(String, default="both", nullable=False)  # "both", "buy", "rent"
    discount_type = Column(String, default="percentage", nullable=False)  # "percentage", "fixed_amount", "custom_price"
    discount_value = Column(Float, default=0.0, nullable=False)
    custom_buy_price = Column(Float, nullable=True)
    custom_rental_price = Column(Float, nullable=True)
    badge_text = Column(String, default="SPECIAL OFFER", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Optional relationships
    category = relationship("Category", lazy="joined")
    asset = relationship("Asset", lazy="joined")
