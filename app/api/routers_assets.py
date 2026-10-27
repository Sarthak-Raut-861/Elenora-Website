from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import re
from app.utils.asset_utils import generate_asset_code
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.rbac import require_roles
from app.core.rate_limiter import limiter
from app.core.logger import asset_logger
from app.db.session import get_db
from app.models.asset import Asset, AssetStatus
from app.models.category import Category
from app.models.user import User, UserRole
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse

router = APIRouter(prefix="/assets", tags=["assets"])


# POST /assets/ - admin creates assets (single or bulk)
@router.post("/", response_model=list[AssetResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_asset(
    request: Request,
    data: AssetCreate,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    asset_logger.info(f"Asset creation initiated - Name: {data.name}, Quantity: {data.quantity}, Category: {data.category_id}, Admin: {current_user.email}")
    
    # Check if category exists
    result = await db.execute(select(Category).where(Category.id == data.category_id))
    if not result.scalars().first():
        asset_logger.warning(f"Asset creation failed - Category not found: {data.category_id}, Admin: {current_user.email}")
        raise HTTPException(status_code=404, detail="Category not found")

    # Generate slug from name
    slug = re.sub(r'\s+', '-', data.name.strip().upper())
    slug = re.sub(r'[^A-Z0-9-]', '', slug)

    # Count existing assets with same slug prefix
    result = await db.execute(
        select(func.count()).where(Asset.asset_code.like(f"{slug}-%"))
    )
    existing_count = result.scalar()

    # Create assets in bulk
    created_assets = []
    for i in range(data.quantity):
        asset_code = generate_asset_code(data.name, existing_count + i + 1)
        asset = Asset(
            asset_code=asset_code,
            name=data.name,
            description=data.description,
            image_url=data.image_url,
            category_id=data.category_id,
            status=AssetStatus.available
        )
        db.add(asset)
        created_assets.append(asset)

    await db.commit()
    for asset in created_assets:
        await db.refresh(asset)

    asset_logger.info(f"Assets created successfully - Count: {len(created_assets)}, Name: {data.name}, Admin: {current_user.email}, Codes: {[a.asset_code for a in created_assets]}")
    return created_assets


# GET /assets/ - filtered list (PUBLIC - no auth required)
@router.get("/", response_model=list[AssetResponse])
@limiter.limit("30/minute")
async def get_all_assets(
    request: Request,
    name: str | None = None,
    category_name: str | None = None,
    status: AssetStatus | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    query = select(Asset).join(Category, Asset.category_id == Category.id)

    # Public users see all active assets (any status) so the frontend can
    # compute correct available/total counts per asset group.
    # Admin sees everything including inactive and dry-cleaning assets.
    if current_user is None or current_user.role != UserRole.admin:
        query = query.where(Asset.is_active == True)

    if name is not None:
        query = query.where(Asset.name.ilike(f"%{name}%"))

    if category_name is not None:
        query = query.where(Category.name.ilike(f"%{category_name}%"))

    if status is not None:
        if current_user and current_user.role == UserRole.admin:
            query = query.where(Asset.status == status)
        # users can't filter by status — they always see available only

    result = await db.execute(query)
    return result.scalars().all()


# GET /assets/{asset_id} - get single asset (PUBLIC)
@router.get("/{asset_id}", response_model=AssetResponse)
@limiter.limit("30/minute")
async def get_asset(
    asset_id: int,
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    query = select(Asset).where(Asset.id == asset_id)

    # users can only see active assets
    if current_user is None or current_user.role != UserRole.admin:
        query = query.where(Asset.is_active == True)

    result = await db.execute(query)
    asset = result.scalars().first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


# PATCH /assets/{asset_id} - admin edits an asset
@router.patch("/{asset_id}", response_model=AssetResponse)
@limiter.limit("20/minute")
async def update_asset(
    asset_id: int,
    request: Request,
    data: AssetUpdate,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    asset_logger.info(f"Asset update initiated - AssetId: {asset_id}, Admin: {current_user.email}")
    
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalars().first()

    if not asset:
        asset_logger.warning(f"Asset update failed - Asset not found: {asset_id}, Admin: {current_user.email}")
        raise HTTPException(status_code=404, detail="Asset not found")

    if data.name is not None:
        asset.name = data.name
    if data.description is not None:
        asset.description = data.description
    if data.image_url is not None:
        asset.image_url = data.image_url
    if data.category_id is not None:
        cat = await db.execute(select(Category).where(Category.id == data.category_id))
        if not cat.scalars().first():
            asset_logger.warning(f"Asset update failed - Category not found: {data.category_id}, AssetId: {asset_id}, Admin: {current_user.email}")
            raise HTTPException(status_code=404, detail="Category not found")
        asset.category_id = data.category_id
    if data.status is not None:
        asset.status = data.status
    if data.is_active is not None:
        asset.is_active = data.is_active
    if data.is_in_dry_cleaning is not None:
        asset.is_in_dry_cleaning = data.is_in_dry_cleaning

    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    
    asset_logger.info(f"Asset updated successfully - AssetId: {asset_id}, Code: {asset.asset_code}, Admin: {current_user.email}")
    return asset


# DELETE /assets/{asset_id} - admin hard deletes
@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: int,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    from app.models.allocations import Allocation
    from app.models.bookings import Booking

    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalars().first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Null out bookings that reference this asset as requested_asset
    bookings_result = await db.execute(
        select(Booking).where(Booking.requested_asset_id == asset_id)
    )
    for booking in bookings_result.scalars().all():
        booking.requested_asset_id = None

    # Delete allocations that reference this asset
    allocs_result = await db.execute(
        select(Allocation).where(Allocation.asset_id == asset_id)
    )
    for alloc in allocs_result.scalars().all():
        await db.delete(alloc)

    await db.flush()
    await db.delete(asset)
    await db.commit()