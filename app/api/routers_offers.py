from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.core.rbac import require_roles
from app.core.rate_limiter import limiter
from app.db.session import get_db
from app.models.offer import Offer
from app.models.category import Category
from app.models.asset import Asset
from app.models.user import User, UserRole
from app.schemas.offer import OfferCreate, OfferUpdate, OfferResponse

router = APIRouter(prefix="/offers", tags=["offers"])


def _serialize_offer(offer: Offer) -> OfferResponse:
    return OfferResponse(
        id=offer.id,
        title=offer.title,
        description=offer.description,
        scope=offer.scope,
        category_id=offer.category_id,
        asset_id=offer.asset_id,
        apply_to=offer.apply_to,
        discount_type=offer.discount_type,
        discount_value=offer.discount_value,
        custom_buy_price=offer.custom_buy_price,
        custom_rental_price=offer.custom_rental_price,
        badge_text=offer.badge_text,
        is_active=offer.is_active,
        created_at=offer.created_at,
        expires_at=offer.expires_at,
        category_name=offer.category.name if offer.category else None,
        asset_name=offer.asset.name if offer.asset else None,
    )


# GET /offers/ - list all offers (admin or public query)
@router.get("/", response_model=list[OfferResponse])
@limiter.limit("60/minute")
async def list_offers(
    request: Request,
    include_inactive: bool = True,
    db: AsyncSession = Depends(get_db)
):
    query = select(Offer).options(selectinload(Offer.category), selectinload(Offer.asset))
    if not include_inactive:
        query = query.where(Offer.is_active == True)
    query = query.order_by(Offer.created_at.desc())

    result = await db.execute(query)
    offers = result.scalars().all()
    return [_serialize_offer(o) for o in offers]


# GET /offers/active - public endpoint for client boutique to get currently applied offers
@router.get("/active", response_model=list[OfferResponse])
@limiter.limit("60/minute")
async def get_active_offers(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Offer)
        .options(selectinload(Offer.category), selectinload(Offer.asset))
        .where(Offer.is_active == True)
        .order_by(Offer.created_at.desc())
    )
    result = await db.execute(query)
    offers = result.scalars().all()
    return [_serialize_offer(o) for o in offers]


# POST /offers/ - create new special offer (admin or staff)
@router.post("/", response_model=OfferResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_offer(
    request: Request,
    data: OfferCreate,
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.staff])),
    db: AsyncSession = Depends(get_db)
):
    # Validate category if scope == category
    if data.scope == "category" and data.category_id:
        cat = await db.get(Category, data.category_id)
        if not cat:
            raise HTTPException(status_code=404, detail="Selected category not found")

    # Validate asset if scope == asset
    if data.scope == "asset" and data.asset_id:
        ast = await db.get(Asset, data.asset_id)
        if not ast:
            raise HTTPException(status_code=404, detail="Selected asset not found")

    offer = Offer(
        title=data.title.strip(),
        description=data.description.strip() if data.description else None,
        scope=data.scope,
        category_id=data.category_id if data.scope == "category" else None,
        asset_id=data.asset_id if data.scope == "asset" else None,
        apply_to=data.apply_to,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        custom_buy_price=data.custom_buy_price,
        custom_rental_price=data.custom_rental_price,
        badge_text=data.badge_text.strip() if data.badge_text else "SPECIAL OFFER",
        is_active=data.is_active,
        expires_at=data.expires_at,
    )
    db.add(offer)
    await db.commit()
    await db.refresh(offer)

    # Re-fetch with relationships loaded
    result = await db.execute(
        select(Offer).options(selectinload(Offer.category), selectinload(Offer.asset)).where(Offer.id == offer.id)
    )
    loaded_offer = result.scalars().first()
    return _serialize_offer(loaded_offer or offer)


# PATCH /offers/{offer_id} - update offer or toggle active status
@router.patch("/{offer_id}", response_model=OfferResponse)
@limiter.limit("20/minute")
async def update_offer(
    offer_id: int,
    request: Request,
    data: OfferUpdate,
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.staff])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Offer).options(selectinload(Offer.category), selectinload(Offer.asset)).where(Offer.id == offer_id)
    )
    offer = result.scalars().first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(offer, field, val)

    await db.commit()
    await db.refresh(offer)

    # Re-query with relationships
    res = await db.execute(
        select(Offer).options(selectinload(Offer.category), selectinload(Offer.asset)).where(Offer.id == offer.id)
    )
    return _serialize_offer(res.scalars().first() or offer)


# DELETE /offers/{offer_id} - delete an offer
@router.delete("/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("20/minute")
async def delete_offer(
    offer_id: int,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.staff])),
    db: AsyncSession = Depends(get_db)
):
    offer = await db.get(Offer, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    await db.delete(offer)
    await db.commit()
    return None
