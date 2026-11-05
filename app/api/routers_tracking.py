from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.dependencies import get_current_user
from app.core.logger import tracking_logger
from app.core.rate_limiter import limiter
from app.core.rbac import require_roles
from app.db.session import get_db
from app.models.allocations import Allocation
from app.models.asset import Asset
from app.models.bookings import Booking
from app.models.category import Category
from app.models.tracking import TrackingEvent
from app.models.user import User, UserRole
from app.schemas.tracking import (
    RecentActivityItem,
    TrackingEventResponse,
    TrackingPageResponse,
)

router = APIRouter(prefix="/tracking", tags=["Tracking"])


@router.get("/bookings/{booking_id}", response_model=TrackingPageResponse)
@limiter.limit("45/minute")
async def get_booking_tracking(
    booking_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    b_res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = b_res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role not in [UserRole.admin, UserRole.staff] and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view tracking for this booking")

    # Find associated asset: either allocated or requested
    asset = None
    alloc_res = await db.execute(select(Allocation).where(Allocation.booking_id == booking_id))
    alloc = alloc_res.scalars().first()
    if alloc:
        asset_res = await db.execute(select(Asset).where(Asset.id == alloc.asset_id))
        asset = asset_res.scalars().first()
    elif booking.requested_asset_id:
        asset_res = await db.execute(select(Asset).where(Asset.id == booking.requested_asset_id))
        asset = asset_res.scalars().first()

    # Find category
    category_name = None
    if booking.category_id:
        cat_res = await db.execute(select(Category).where(Category.id == booking.category_id))
        cat = cat_res.scalars().first()
        if cat:
            category_name = cat.name
    elif asset and asset.category_id:
        cat_res = await db.execute(select(Category).where(Category.id == asset.category_id))
        cat = cat_res.scalars().first()
        if cat:
            category_name = cat.name

    # Fetch events
    events_res = await db.execute(
        select(TrackingEvent)
        .where(TrackingEvent.booking_id == booking_id)
        .order_by(TrackingEvent.event_at.asc())
    )
    events = events_res.scalars().all()

    creator_ids = {ev.created_by for ev in events if ev.created_by}
    user_map = {}
    if creator_ids:
        u_res = await db.execute(select(User).where(User.id.in_(creator_ids)))
        user_map = {u.id: u.full_name for u in u_res.scalars().all()}

    enriched_events = [
        TrackingEventResponse(
            id=ev.id,
            booking_id=ev.booking_id,
            event_type=ev.event_type,
            event_at=ev.event_at,
            description=ev.description,
            created_by=ev.created_by,
            created_by_name=user_map.get(ev.created_by),
            meta=ev.meta,
        )
        for ev in events
    ]

    return TrackingPageResponse(
        booking_id=booking.id,
        asset_name=asset.name if asset else None,
        asset_image_url=asset.image_url if asset else None,
        asset_category=category_name,
        current_status=booking.status.value if hasattr(booking.status, "value") else str(booking.status),
        pickup_date=booking.pickup_date.isoformat(),
        due_date=booking.due_date.isoformat(),
        events=enriched_events,
    )


@router.get("/admin/recent-activity", response_model=list[RecentActivityItem])
@limiter.limit("30/minute")
async def get_recent_activity(
    request: Request,
    limit: int = 10,
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.staff])),
    db: AsyncSession = Depends(get_db)
):
    events_res = await db.execute(
        select(TrackingEvent).order_by(TrackingEvent.event_at.desc()).limit(limit)
    )
    events = events_res.scalars().all()

    items = []
    for ev in events:
        # Load asset info via booking
        asset_name = None
        asset_image_url = None

        b_res = await db.execute(select(Booking).where(Booking.id == ev.booking_id))
        b = b_res.scalars().first()
        if b:
            alloc_res = await db.execute(select(Allocation).where(Allocation.booking_id == b.id))
            alloc = alloc_res.scalars().first()
            if alloc:
                a_res = await db.execute(select(Asset).where(Asset.id == alloc.asset_id))
                a = a_res.scalars().first()
                if a:
                    asset_name = a.name
                    asset_image_url = a.image_url
            elif b.requested_asset_id:
                a_res = await db.execute(select(Asset).where(Asset.id == b.requested_asset_id))
                a = a_res.scalars().first()
                if a:
                    asset_name = a.name
                    asset_image_url = a.image_url

        creator_name = None
        if ev.created_by:
            u_res = await db.execute(select(User).where(User.id == ev.created_by))
            u = u_res.scalars().first()
            if u:
                creator_name = u.full_name

        items.append(
            RecentActivityItem(
                event_id=ev.id,
                booking_id=ev.booking_id,
                event_type=ev.event_type,
                event_at=ev.event_at,
                description=ev.description,
                asset_name=asset_name,
                asset_image_url=asset_image_url,
                created_by_name=creator_name,
            )
        )

    return items

