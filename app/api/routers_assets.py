from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import re
import os
import uuid
import shutil
import io

try:
    from PIL import Image, ImageOps
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

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

# Standardized uploads folder (ensures consistency between local, container, and cloud environments)
UPLOAD_DIR = "/tmp/uploads" if os.getenv("VERCEL") else os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def detect_image_extension(content_type: str | None, filename: str | None, contents: bytes) -> str | None:
    """Detect image extension supporting all standard formats (JPG, PNG, WEBP, AVIF, HEIC, GIF, BMP, SVG, TIFF, ICO)."""
    # 1. Direct MIME type mapping
    ct = (content_type or "").lower().strip()
    mime_map = {
        # JPEG
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/pjpeg": ".jpg",
        "image/jfif": ".jpg",
        # PNG
        "image/png": ".png",
        "image/x-png": ".png",
        # WEBP
        "image/webp": ".webp",
        # AVIF
        "image/avif": ".avif",
        # HEIC / HEIF (Apple iPhone photos)
        "image/heic": ".heic",
        "image/heif": ".heif",
        "image/heic-sequence": ".heic",
        "image/heif-sequence": ".heif",
        # GIF
        "image/gif": ".gif",
        # BMP
        "image/bmp": ".bmp",
        "image/x-ms-bmp": ".bmp",
        # TIFF
        "image/tiff": ".tiff",
        "image/x-tiff": ".tiff",
        # SVG
        "image/svg+xml": ".svg",
        "image/svg": ".svg",
        # ICO
        "image/x-icon": ".ico",
        "image/vnd.microsoft.icon": ".ico",
        "image/ico": ".ico",
    }
    if ct in mime_map:
        return mime_map[ct]

    # 2. Filename extension fallback
    if filename:
        _, ext = os.path.splitext(filename.lower())
        ext_map = {
            ".jpg": ".jpg", ".jpeg": ".jpg", ".jfif": ".jpg", ".jpe": ".jpg",
            ".png": ".png",
            ".webp": ".webp",
            ".avif": ".avif",
            ".heic": ".heic", ".heif": ".heif",
            ".gif": ".gif",
            ".bmp": ".bmp",
            ".tiff": ".tiff", ".tif": ".tiff",
            ".svg": ".svg",
            ".ico": ".ico",
        }
        if ext in ext_map:
            return ext_map[ext]

    # 3. Magic bytes / header inspection fallback
    if len(contents) >= 4:
        # JPEG: FF D8 FF
        if contents[:3] == b"\xff\xd8\xff":
            return ".jpg"
        # PNG: 89 50 4E 47 0D 0A 1A 0A
        if contents[:8] == b"\x89PNG\r\n\x1a\n":
            return ".png"
        # GIF: GIF87a or GIF89a
        if contents[:6] in (b"GIF87a", b"GIF89a"):
            return ".gif"
        # WEBP: RIFF....WEBP
        if len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
            return ".webp"
        # BMP: BM
        if contents[:2] == b"BM":
            return ".bmp"
        # TIFF: II*\x00 or MM\x00*
        if contents[:4] in (b"II*\x00", b"MM\x00*"):
            return ".tiff"
        # SVG / XML text
        header_text = contents[:250].lstrip().lower()
        if header_text.startswith(b"<?xml") or header_text.startswith(b"<svg") or b"<svg" in header_text:
            return ".svg"
        # HEIC / AVIF ftyp box
        if len(contents) >= 12 and contents[4:8] == b"ftyp":
            ftyp_brand = contents[8:12].lower()
            if ftyp_brand in (b"avif", b"avis"):
                return ".avif"
            if ftyp_brand in (b"heic", b"heix", b"hevc", b"heim", b"heis", b"heif", b"mif1", b"msf1"):
                return ".heic"

    # 4. Fallback for any image/* MIME subtype
    if ct.startswith("image/"):
        subtype = ct.split("/", 1)[1].split(";")[0].strip()
        subtype = re.sub(r"[^a-zA-Z0-9]", "", subtype)
        if subtype:
            return f".{subtype}"

    return None


# POST /assets/upload-images - admin/staff uploads multiple image files at once
@router.post("/upload-images")
@limiter.limit("120/minute")
async def upload_multiple_asset_images(
    request: Request,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.staff]))
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided for upload")

    uploaded_urls = []
    skipped_files = []

    for file in files:
        try:
            contents = await file.read()
            if not contents:
                continue

            if len(contents) > 35 * 1024 * 1024:
                skipped_files.append(f"{file.filename or 'file'} (>35MB)")
                continue

            ext = detect_image_extension(file.content_type, file.filename, contents)
            if not ext:
                skipped_files.append(f"{file.filename or 'file'} (unsupported image format)")
                continue

            filename = f"{uuid.uuid4().hex}{ext}"
            filepath = os.path.join(UPLOAD_DIR, filename)

            saved = False
            if HAS_PIL and ext not in (".svg", ".heic", ".heif", ".ico"):
                try:
                    with Image.open(io.BytesIO(contents)) as img:
                        img = ImageOps.exif_transpose(img)
                        img.save(filepath)
                        saved = True
                except Exception:
                    saved = False

            if not saved:
                with open(filepath, "wb") as buffer:
                    buffer.write(contents)

            uploaded_urls.append(f"/uploads/{filename}")
        except Exception as e:
            skipped_files.append(f"{file.filename or 'file'} ({str(e)})")

    if not uploaded_urls and skipped_files:
        raise HTTPException(
            status_code=400,
            detail=f"Could not upload image(s): {', '.join(skipped_files)}. Supported formats: JPG, PNG, WEBP, AVIF, HEIC, GIF, BMP, SVG, TIFF."
        )

    return {"image_urls": uploaded_urls, "skipped": skipped_files}


# POST /assets/upload-image - admin uploads an image file
@router.post("/upload-image")
@limiter.limit("120/minute")
async def upload_asset_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.staff]))
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if len(contents) > 35 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image file size cannot exceed 35 MB")

    ext = detect_image_extension(file.content_type, file.filename, contents)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload an image file (JPG, PNG, WEBP, AVIF, HEIC, GIF, BMP, SVG, TIFF)."
        )

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    saved = False
    if HAS_PIL and ext not in (".svg", ".heic", ".heif", ".ico"):
        try:
            with Image.open(io.BytesIO(contents)) as img:
                img = ImageOps.exif_transpose(img)
                img.save(filepath)
                saved = True
        except Exception:
            saved = False

    if not saved:
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
