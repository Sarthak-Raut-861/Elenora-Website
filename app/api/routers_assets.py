from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import re
import os
import uuid
import shutil

from app.utils.asset_utils import generate_asset_code
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.rbac import require_roles
from app.core.rate_limiter import limiter
from app.core.logger import asset_logger
from app.db.session import get_db
from app.models.asset import Asset, AssetStatus
from app.models.category import Category
from app.models.user import User, UserRole
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetStockAdd

router = APIRouter(prefix="/assets", tags=["assets"])


# POST /assets/upload-images - admin/staff uploads multiple image files at once
@router.post("/upload-images")
@limiter.limit("20/minute")
async def upload_multiple_asset_images(
    request: Request,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.staff]))
):
    allowed_types = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    uploads_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    uploaded_urls = []
    for file in files:
        if not file.content_type or file.content_type.lower() not in allowed_types:
            continue
        contents = await file.read()
        if len(contents) > 12 * 1024 * 1024:
            continue
        ext = allowed_types[file.content_type.lower()]
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(uploads_dir, filename)
        with open(filepath, "wb") as buffer:
            buffer.write(contents)
        uploaded_urls.append(f"/uploads/{filename}")

    return {"image_urls": uploaded_urls}


# POST /assets/upload-image - admin uploads an image file
@router.post("/upload-image")
@limiter.limit("20/minute")
async def upload_asset_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.staff]))
):
    allowed_types = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    if not file.content_type or file.content_type.lower() not in allowed_types:
        raise HTTPException(status_code=400, detail="Uploaded file must be a PNG, JPG, or WEBP image")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image file size cannot exceed 10 MB")

    uploads_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    ext = allowed_types[file.content_type.lower()]
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(uploads_dir, filename)

    with open(filepath, "wb") as buffer:
        buffer.write(contents)

    return {"image_url": f"/uploads/{filename}"}


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
            status=AssetStatus.available,
            listing_type=data.listing_type or "both",
            buy_price=data.buy_price,
            rental_price=data.rental_price,
            sizes=data.sizes or "XS,S,M,L,XL",
            color_variants=data.color_variants,
            gallery_images=data.gallery_images or "[]",
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
    listing_type: str | None = None,
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

    if listing_type is not None:
        if listing_type.lower() == "rent":
            query = query.where(Asset.listing_type.in_(["rent", "both"]))
        elif listing_type.lower() == "buy":
            query = query.where(Asset.listing_type.in_(["buy", "both"]))

    if status is not None:
        if current_user and current_user.role == UserRole.admin:
            query = query.where(Asset.status == status)

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
    if data.listing_type is not None:
        asset.listing_type = data.listing_type
    if data.buy_price is not None:
        asset.buy_price = data.buy_price
    if data.rental_price is not None:
        asset.rental_price = data.rental_price
    if data.sizes is not None:
        asset.sizes = data.sizes
    if data.color_variants is not None:
        asset.color_variants = data.color_variants
    if data.gallery_images is not None:
        asset.gallery_images = data.gallery_images

    db.add(asset)

    # If update_all_units is requested, sync common product properties across all units of this style
    if getattr(data, 'update_all_units', False):
        sister_result = await db.execute(
            select(Asset).where(
                Asset.name.ilike(asset.name),
                Asset.category_id == asset.category_id,
                Asset.id != asset.id
            )
        )
        for sister in sister_result.scalars().all():
            if data.name is not None: sister.name = data.name
            if data.description is not None: sister.description = data.description
            if data.image_url is not None: sister.image_url = data.image_url
            if data.category_id is not None: sister.category_id = data.category_id
            if data.listing_type is not None: sister.listing_type = data.listing_type
            if data.buy_price is not None: sister.buy_price = data.buy_price
            if data.rental_price is not None: sister.rental_price = data.rental_price
            if data.sizes is not None: sister.sizes = data.sizes
            if data.color_variants is not None: sister.color_variants = data.color_variants
            if data.gallery_images is not None: sister.gallery_images = data.gallery_images
            db.add(sister)

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
        return Response(status_code=status.HTTP_204_NO_CONTENT)

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

    # Delete dry cleaning requests that reference this asset
    from app.models.dry_cleaning import DryCleaningRequest
    dc_result = await db.execute(
        select(DryCleaningRequest).where(DryCleaningRequest.asset_id == asset_id)
    )
    for dc in dc_result.scalars().all():
        await db.delete(dc)

    await db.flush()
    await db.delete(asset)
    await db.commit()


# POST /assets/{asset_id}/add-stock - admin adds additional units to an existing product style
@router.post("/{asset_id}/add-stock", response_model=list[AssetResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def add_asset_stock(
    asset_id: int,
    request: Request,
    data: AssetStockAdd,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    slug = re.sub(r'\s+', '-', asset.name.strip().upper())
    slug = re.sub(r'[^A-Z0-9-]', '', slug)

    result = await db.execute(
        select(func.count()).where(Asset.asset_code.like(f"{slug}-%"))
    )
    existing_count = result.scalar()

    created_assets = []
    for i in range(data.quantity):
        asset_code = generate_asset_code(asset.name, existing_count + i + 1)
        new_asset = Asset(
            asset_code=asset_code,
            name=asset.name,
            description=asset.description,
            image_url=asset.image_url,
            category_id=asset.category_id,
            status=AssetStatus.available,
            listing_type=asset.listing_type,
            buy_price=asset.buy_price,
            rental_price=asset.rental_price,
            sizes=asset.sizes,
            color_variants=asset.color_variants,
            gallery_images=asset.gallery_images,
        )
        db.add(new_asset)
        created_assets.append(new_asset)

    await db.commit()
    for a in created_assets:
        await db.refresh(a)

    asset_logger.info(f"Added {len(created_assets)} units to {asset.name} by {current_user.email}")
    return created_assets


# DELETE /assets/group/{asset_id} - admin hard deletes all units of this product piece
@router.delete("/group/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset_group(
    asset_id: int,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    from app.models.allocations import Allocation
    from app.models.bookings import Booking
    from app.models.dry_cleaning import DryCleaningRequest

    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    target = result.scalars().first()
    if not target:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    group_result = await db.execute(
        select(Asset).where(
            Asset.name.ilike(target.name),
            Asset.category_id == target.category_id
        )
    )
    units = group_result.scalars().all()

    for unit in units:
        bookings_result = await db.execute(
            select(Booking).where(Booking.requested_asset_id == unit.id)
        )
        for booking in bookings_result.scalars().all():
            booking.requested_asset_id = None

        allocs_result = await db.execute(
            select(Allocation).where(Allocation.asset_id == unit.id)
        )
        for alloc in allocs_result.scalars().all():
            await db.delete(alloc)

        dc_result = await db.execute(
            select(DryCleaningRequest).where(DryCleaningRequest.asset_id == unit.id)
        )
        for dc in dc_result.scalars().all():
            await db.delete(dc)

        await db.flush()
        await db.delete(unit)

    await db.commit()
    asset_logger.info(f"Deleted product style group '{target.name}' ({len(units)} units) by {current_user.email}")
