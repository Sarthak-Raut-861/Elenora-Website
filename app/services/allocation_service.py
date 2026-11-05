from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.allocations import Allocation
from app.models.bookings import Booking, BookingStatus
from app.models.asset import Asset, AssetStatus
from app.models.tracking import TrackingEvent


def _log_tracking_event(
    db: AsyncSession,
    booking_id: int,
    event_type: str,
    description: str,
    created_by: int | None = None,
):
    event = TrackingEvent(
        booking_id=booking_id,
        event_type=event_type,
        event_at=datetime.now(timezone.utc),
        description=description,
        created_by=created_by,
    )
    db.add(event)


async def allocate_asset(
    db: AsyncSession,
    booking_id: int,
    asset_id: int,
    allocated_by: int
) -> Allocation:
    # 1. Fetch booking
    booking_res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = booking_res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status not in [BookingStatus.booked, BookingStatus.pending]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot allocate asset to booking with status '{booking.status}' (must be 'booked' or 'pending')"
        )

    # 2. Fetch asset
    asset_res = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = asset_res.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if not asset.is_active or asset.is_in_dry_cleaning:
        raise HTTPException(status_code=400, detail="Asset is inactive or undergoing sanitization")

    if asset.status != AssetStatus.available:
        raise HTTPException(
            status_code=400,
            detail=f"Asset is not currently available for allocation (current status: {asset.status.value})"
        )

    # Check for date conflicts on active allocations
    overlap_query = (
        select(Booking)
        .join(Allocation, Booking.id == Allocation.booking_id)
        .where(
            Allocation.asset_id == asset_id,
            Booking.id != booking_id,
            Booking.status.not_in([BookingStatus.cancelled, BookingStatus.returned]),
            Booking.pickup_date <= booking.due_date,
            Booking.due_date >= booking.pickup_date,
        )
    )
    overlap_res = await db.execute(overlap_query)
    if overlap_res.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="Asset is already allocated to another client for overlapping dates"
        )

    # 3. Create or update allocation
    alloc_stmt = select(Allocation).where(Allocation.booking_id == booking_id)
    existing_alloc_res = await db.execute(alloc_stmt)
    existing_alloc = existing_alloc_res.scalars().first()

    if existing_alloc:
        # Free previous asset if different
        if existing_alloc.asset_id != asset_id:
            old_asset_res = await db.execute(select(Asset).where(Asset.id == existing_alloc.asset_id))
            old_asset = old_asset_res.scalars().first()
            if old_asset and old_asset.status == AssetStatus.allocated:
                old_asset.status = AssetStatus.available
        existing_alloc.asset_id = asset_id
        existing_alloc.allocated_by = allocated_by
        existing_alloc.allocated_at = datetime.now(timezone.utc)
        allocation = existing_alloc
    else:
        allocation = Allocation(
            booking_id=booking_id,
            asset_id=asset_id,
            allocated_by=allocated_by,
            allocated_at=datetime.now(timezone.utc)
        )
        db.add(allocation)

    # 4. Update statuses
    booking.status = BookingStatus.allocated
    asset.status = AssetStatus.allocated

    # 5. Tracking event
    _log_tracking_event(
        db,
        booking_id=booking_id,
        event_type="asset_allocated",
        description=f"Curator assigned piece {asset.name} ({asset.asset_code}) to your reservation",
        created_by=allocated_by
    )

    await db.commit()
    await db.refresh(allocation)
    return allocation


async def reject_booking_request(db: AsyncSession, booking_id: int) -> Booking:
    booking_res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = booking_res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status in [BookingStatus.returned, BookingStatus.cancelled, BookingStatus.picked_up]:
        raise HTTPException(status_code=400, detail=f"Cannot reject booking in status '{booking.status}'")

    # Release allocated asset if any
    alloc_res = await db.execute(select(Allocation).where(Allocation.booking_id == booking_id))
    alloc = alloc_res.scalars().first()
    if alloc:
        asset_res = await db.execute(select(Asset).where(Asset.id == alloc.asset_id))
        asset = asset_res.scalars().first()
        if asset:
            asset.status = AssetStatus.available
        await db.delete(alloc)

    booking.status = BookingStatus.cancelled

    _log_tracking_event(
        db,
        booking_id=booking.id,
        event_type="cancelled",
        description="Booking rejected by atelier administration"
    )

    await db.commit()
    await db.refresh(booking)
    return booking

