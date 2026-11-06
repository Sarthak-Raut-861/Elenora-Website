from pydantic import BaseModel, ConfigDict
from datetime import datetime


class OfferCreate(BaseModel):
    title: str
    description: str | None = None
    scope: str = "sitewide"  # "sitewide", "category", "asset"
    category_id: int | None = None
    asset_id: int | None = None
    apply_to: str = "both"  # "both", "buy", "rent"
    discount_type: str = "percentage"  # "percentage", "fixed_amount", "custom_price"
    discount_value: float = 0.0
    custom_buy_price: float | None = None
    custom_rental_price: float | None = None
    badge_text: str = "SPECIAL OFFER"
    is_active: bool = True
    expires_at: datetime | None = None


class OfferUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    scope: str | None = None
    category_id: int | None = None
    asset_id: int | None = None
    apply_to: str | None = None
    discount_type: str | None = None
    discount_value: float | None = None
    custom_buy_price: float | None = None
    custom_rental_price: float | None = None
    badge_text: str | None = None
    is_active: bool | None = None
    expires_at: datetime | None = None


class OfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    scope: str
    category_id: int | None = None
    asset_id: int | None = None
    apply_to: str
    discount_type: str
    discount_value: float
    custom_buy_price: float | None = None
    custom_rental_price: float | None = None
    badge_text: str
    is_active: bool
    created_at: datetime
    expires_at: datetime | None = None
    category_name: str | None = None
    asset_name: str | None = None

