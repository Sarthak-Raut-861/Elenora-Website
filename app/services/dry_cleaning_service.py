from datetime import datetime, date, timezone
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.dry_cleaning import DryCleaningRequest, DryCleaner, DryCleaningStatus
from app.models.asset import Asset, AssetStatus
from app.models.bookings import Booking
from app.models.user import User, UserRole
from app.models.returns import Return
from app.models.tracking import TrackingEvent
from app.schemas.dry_cleaning import DryCleanerCreate, DryCleanerUpdate


def _cleaner_to_dict(cleaner: DryCleaner) -> dict:
    specs = [s.strip() for s in cleaner.specializations.split(",") if s.strip()] if cleaner.specializations else []
    return {
        "id": cleaner.id,
        "name": cleaner.name,
        "contact_person": cleaner.contact_person,
        "phone": cleaner.phone,
        "email": cleaner.email,
        "address": cleaner.address,
        "specializations": specs,
        "rating": float(cleaner.rating) if cleaner.rating is not None else 5.0,
        "total_jobs": cleaner.total_jobs or 0,
        "is_active": cleaner.is_active,
        "turnaround_days": cleaner.turnaround_days or 2,
        "price_per_item": float(cleaner.price_per_item) if cleaner.price_per_item is not None else None,
        "created_at": cleaner.created_at,
    }


async def _enrich_request(db: AsyncSession, req: DryCleaningRequest) -> dict:
    # Asset info
    asset_res = await db.execute(select(Asset).where(Asset.id == req.asset_id))
    asset = asset_res.scalars().first()
    asset_info = None
    if asset:
        asset_info = {
            "id": asset.id,
            "name": asset.name,
            "asset_code": asset.asset_code,
            "image_url": asset.image_url,
        }

    # Booking & User info
    booking = None
    if req.booking_id:
        booking_res = await db.execute(select(Booking).where(Booking.id == req.booking_id))
        booking = booking_res.scalars().first()
    user_info = None
    returned_at_str = None
    if booking:
        user_res = await db.execute(select(User).where(User.id == booking.user_id))
        user = user_res.scalars().first()
        if user:
            user_info = {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
            }

        ret_res = await db.execute(select(Return).where(Return.booking_id == booking.id))
        ret = ret_res.scalars().first()
        if ret and ret.returned_at:
            returned_at_str = ret.returned_at.isoformat()

    # Dry cleaner info
    cleaner_info = None
    if req.dry_cleaner_id:
        c_res = await db.execute(select(DryCleaner).where(DryCleaner.id == req.dry_cleaner_id))
        c = c_res.scalars().first()
        if c:
            cleaner_info = _cleaner_to_dict(c)

    return {
        "id": req.id,
        "asset_id": req.asset_id,
        "booking_id": req.booking_id,
        "status": req.status,
        "priority": req.priority,
        "sent_at": req.sent_at,
        "completed_at": req.completed_at,
        "expected_by": req.expected_by,
        "notes": req.notes,
        "admin_notes": req.admin_notes,
        "cleaner_notes": req.cleaner_notes,
        "dry_cleaner_name": req.dry_cleaner_name,
        "dry_cleaner_id": req.dry_cleaner_id,
        "actual_cost": float(req.actual_cost) if req.actual_cost is not None else None,
        "rating": req.rating,
        "created_at": req.created_at,
        "asset": asset_info,
        "returned_by": user_info,
        "returned_at": returned_at_str,
        "dry_cleaner": cleaner_info,
    }


def _log_tracking_event(db: AsyncSession, booking_id: int | None, event_type: str, description: str):
    if not booking_id:
        return
    event = TrackingEvent(
        booking_id=booking_id,
        event_type=event_type,
        event_at=datetime.now(timezone.utc),
        description=description,
    )
    db.add(event)


# ── Dry Cleaners Directory ───────────────────────────────────────────────────

async def list_dry_cleaners(db: AsyncSession, active_only: bool = False) -> list[dict]:
    query = select(DryCleaner).order_by(DryCleaner.name)
    if active_only:
        query = query.where(DryCleaner.is_active == True)
    res = await db.execute(query)
    cleaners = res.scalars().all()
    return [_cleaner_to_dict(c) for c in cleaners]


async def create_dry_cleaner(db: AsyncSession, data: DryCleanerCreate) -> dict:
    specs = ",".join(data.specializations) if data.specializations else None
    cleaner = DryCleaner(
        name=data.name,
        contact_person=data.contact_person,
        phone=data.phone,
        email=data.email,
        address=data.address,
        specializations=specs,
        turnaround_days=data.turnaround_days,
        price_per_item=data.price_per_item,
        is_active=True,
    )
    db.add(cleaner)
    await db.commit()
    await db.refresh(cleaner)
    return _cleaner_to_dict(cleaner)


async def update_dry_cleaner(db: AsyncSession, cleaner_id: int, data: DryCleanerUpdate) -> dict:
    res = await db.execute(select(DryCleaner).where(DryCleaner.id == cleaner_id))
    cleaner = res.scalars().first()
    if not cleaner:
        raise HTTPException(status_code=404, detail="Dry cleaner not found")

    dump = data.model_dump(exclude_unset=True)
    if "specializations" in dump:
        cleaner.specializations = ",".join(dump["specializations"]) if dump["specializations"] else None
    if "name" in dump: cleaner.name = dump["name"]
    if "contact_person" in dump: cleaner.contact_person = dump["contact_person"]
    if "phone" in dump: cleaner.phone = dump["phone"]
    if "email" in dump: cleaner.email = dump["email"]
    if "address" in dump: cleaner.address = dump["address"]
    if "turnaround_days" in dump: cleaner.turnaround_days = dump["turnaround_days"]
    if "price_per_item" in dump: cleaner.price_per_item = dump["price_per_item"]
    if "is_active" in dump: cleaner.is_active = dump["is_active"]

    await db.commit()
    await db.refresh(cleaner)
    return _cleaner_to_dict(cleaner)


async def delete_dry_cleaner(db: AsyncSession, cleaner_id: int):
    res = await db.execute(select(DryCleaner).where(DryCleaner.id == cleaner_id))
    cleaner = res.scalars().first()
    if not cleaner:
        raise HTTPException(status_code=404, detail="Dry cleaner not found")
    await db.delete(cleaner)
    await db.commit()


# ── Dry Cleaning Requests ────────────────────────────────────────────────────

async def list_pending_send(db: AsyncSession) -> list[dict]:
    query = select(DryCleaningRequest).where(
        DryCleaningRequest.status == DryCleaningStatus.pending
    ).order_by(DryCleaningRequest.created_at.desc())
    res = await db.execute(query)
    reqs = res.scalars().all()
    return [await _enrich_request(db, r) for r in reqs]


async def list_dry_cleaning_requests(
    db: AsyncSession, status: DryCleaningStatus | None = None
) -> list[dict]:
    query = select(DryCleaningRequest).order_by(DryCleaningRequest.created_at.desc())
    if status:
        query = query.where(DryCleaningRequest.status == status)
    res = await db.execute(query)
    reqs = res.scalars().all()
    return [await _enrich_request(db, r) for r in reqs]


async def list_dry_cleaning_requests_for_cleaner(db: AsyncSession, current_user: User | None = None) -> list[dict]:
    query = select(DryCleaningRequest).where(
        DryCleaningRequest.status.in_([DryCleaningStatus.sent, DryCleaningStatus.in_progress])
    ).order_by(DryCleaningRequest.created_at.desc())

    if current_user and current_user.role == UserRole.dry_cleaner:
        cleaner_res = await db.execute(select(DryCleaner).where(DryCleaner.email == current_user.email.lower()))
        cleaner = cleaner_res.scalars().first()
        if cleaner:
            query = query.where(DryCleaningRequest.dry_cleaner_id == cleaner.id)

    res = await db.execute(query)
    reqs = res.scalars().all()
    return [await _enrich_request(db, r) for r in reqs]


async def create_dry_cleaning_request(
    db: AsyncSession,
    asset_id: int,
    booking_id: int | None = None,
    dry_cleaner_name: str | None = None,
    dry_cleaner_id: int | None = None,
    notes: str | None = None,
    admin_notes: str | None = None,
    priority: str = "normal",
    expected_by: date | None = None,
) -> dict:
    req = DryCleaningRequest(
        asset_id=asset_id,
        booking_id=booking_id,
        dry_cleaner_name=dry_cleaner_name,
        dry_cleaner_id=dry_cleaner_id,
        notes=notes,
        admin_notes=admin_notes,
        priority=priority,
        expected_by=expected_by,
        status=DryCleaningStatus.sent if (dry_cleaner_id or dry_cleaner_name) else DryCleaningStatus.pending,
        sent_at=datetime.now(timezone.utc) if (dry_cleaner_id or dry_cleaner_name) else None,
    )
    db.add(req)

    # Mark asset as in dry cleaning
    asset_res = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = asset_res.scalars().first()
    if asset:
        asset.is_in_dry_cleaning = True

    _log_tracking_event(
        db,
        booking_id=booking_id,
        event_type="sent_dry_cleaning",
        description=f"Item dispatched for specialized fabric sanitization ({priority} priority)",
    )

    await db.commit()
    await db.refresh(req)
    return await _enrich_request(db, req)


async def update_dry_cleaning_request(db: AsyncSession, request_id: int, data: dict) -> dict:
    res = await db.execute(select(DryCleaningRequest).where(DryCleaningRequest.id == request_id))
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Dry cleaning request not found")

    for k, v in data.items():
        if hasattr(req, k):
            setattr(req, k, v)

    await db.commit()
    await db.refresh(req)
    return await _enrich_request(db, req)


async def mark_in_progress(db: AsyncSession, request_id: int, current_user: User | None = None) -> dict:
    res = await db.execute(select(DryCleaningRequest).where(DryCleaningRequest.id == request_id))
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Dry cleaning request not found")

    if current_user and current_user.role == UserRole.dry_cleaner:
        cleaner_res = await db.execute(select(DryCleaner).where(DryCleaner.email == current_user.email.lower()))
        cleaner = cleaner_res.scalars().first()
        if cleaner and req.dry_cleaner_id and req.dry_cleaner_id != cleaner.id:
            raise HTTPException(status_code=403, detail="Not authorized to manage this cleaning job")

    req.status = DryCleaningStatus.in_progress
    await db.commit()
    await db.refresh(req)
    return await _enrich_request(db, req)


async def mark_cleaning_done(
    db: AsyncSession,
    request_id: int,
    cleaner_notes: str | None = None,
    actual_cost: Decimal | None = None,
    rating: int | None = None,
    current_user: User | None = None,
) -> dict:
    res = await db.execute(select(DryCleaningRequest).where(DryCleaningRequest.id == request_id))
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Dry cleaning request not found")

    if current_user and current_user.role == UserRole.dry_cleaner:
        cleaner_res = await db.execute(select(DryCleaner).where(DryCleaner.email == current_user.email.lower()))
        cleaner = cleaner_res.scalars().first()
        if cleaner and req.dry_cleaner_id and req.dry_cleaner_id != cleaner.id:
            raise HTTPException(status_code=403, detail="Not authorized to manage this cleaning job")

    req.status = DryCleaningStatus.completed
    req.completed_at = datetime.now(timezone.utc)
    if cleaner_notes is not None:
        req.cleaner_notes = cleaner_notes
    if actual_cost is not None:
        req.actual_cost = actual_cost
    if rating is not None:
        req.rating = rating

    # Revert asset back to available and clear dry-cleaning flag
    asset_res = await db.execute(select(Asset).where(Asset.id == req.asset_id))
    asset = asset_res.scalars().first()
    if asset:
        asset.is_in_dry_cleaning = False
        asset.status = AssetStatus.available

    # Update dry cleaner total jobs counter
    if req.dry_cleaner_id:
        cleaner_res = await db.execute(select(DryCleaner).where(DryCleaner.id == req.dry_cleaner_id))
        cleaner = cleaner_res.scalars().first()
        if cleaner:
            cleaner.total_jobs = (cleaner.total_jobs or 0) + 1

    _log_tracking_event(
        db,
        booking_id=req.booking_id,
        event_type="dry_cleaning_done",
        description="Atelier garment sanitized, certified, and returned to vault",
    )

    await db.commit()
    await db.refresh(req)
    return await _enrich_request(db, req)

