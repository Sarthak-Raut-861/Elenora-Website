from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.asset import AssetStatus    

class AssetCreate(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None
    category_id: int
    quantity: int = 1
    listing_type: str = "both"
    buy_price: float | None = None
    rental_price: float | None = None
    sizes: str | None = "XS,S,M,L,XL"
    color_variants: str | None = None
    gallery_images: str | None = None
    video_url: str | None = None

class AssetUpdate(BaseModel):   
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    category_id: int | None = None
    status: AssetStatus | None = None
    is_active: bool | None = None
    is_in_dry_cleaning: bool | None = None
    listing_type: str | None = None
    buy_price: float | None = None
    rental_price: float | None = None
    sizes: str | None = None
    color_variants: str | None = None
    gallery_images: str | None = None
    video_url: str | None = None
    update_all_units: bool | None = False

class AssetStockAdd(BaseModel):
    quantity: int = 1

class AssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    asset_code: str
    description: str | None = None
    image_url: str | None = None
    category_id: int
    status: AssetStatus
    created_at: datetime
    is_active: bool
    is_in_dry_cleaning: bool
    listing_type: str | None = "both"
    buy_price: float | None = None
    rental_price: float | None = None
    sizes: str | None = "XS,S,M,L,XL"
    color_variants: str | None = None
    gallery_images: str | None = None
    video_url: str | None = None
