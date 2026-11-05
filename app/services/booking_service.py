from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.bookings import Booking, BookingStatus
from app.models.rental_plan import RentalPlan
from app.models.asset import Asset, AssetStatus
from app.models.category import Category
from app.models.allocations import Allocation
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.models.tracking import TrackingEvent
from app.models.user import User, UserRole
from app.schemas.booking import BookingCreate, BuyOrderCreate


def _log_tracking_event(
    db: AsyncSession,
    booking_id: int,
    event_type: str,
    description: str,
    created_by: int | None = None,
    meta: str | None = None
):
    event = TrackingEvent(
        booking_id=booking_id,
        event_type=event_type,
        event_at=datetime.now(timezone.utc),
        description=description,
        created_by=created_by,
        meta=meta
    )
    db.add(event)


async def create_booking(db: AsyncSession, current_user: User, data: BookingCreate) -> Booking:
    # 1. Validate rental plan
    plan_result = await db.execute(select(RentalPlan).where(RentalPlan.id == data.rental_plan_id))
    plan = plan_result.scalars().first()
    if not plan or not plan.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental plan not found or inactive")

    # 2. Validate category if provided
    if data.category_id:
        cat_result = await db.execute(select(Category).where(Category.id == data.category_id))
        if not cat_result.scalars().first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    # 3. Validate requested asset if provided
    if data.requested_asset_id:
        asset_result = await db.execute(select(Asset).where(Asset.id == data.requested_asset_id))
        asset = asset_result.scalars().first()
        if not asset or not asset.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requested asset not found or retired")
        if asset.is_in_dry_cleaning:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Requested asset is currently undergoing professional sanitization")

    # 4. Dates and amounts
    pickup_date = data.pickup_date
    today = date.today()
    if pickup_date < today:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pickup date cannot be in the past")

    due_date = pickup_date + timedelta(days=plan.duration_days)
    rent_amount = Decimal(str(plan.daily_rate)) * Decimal(str(plan.duration_days))
    deposit_amount = Decimal(str(plan.deposit_amount))

    # 4b. Concurrency & double-booking check
    if data.requested_asset_id:
        overlap_query = (
            select(Booking)
            .outerjoin(Allocation, Booking.id == Allocation.booking_id)
            .where(
                (Booking.requested_asset_id == data.requested_asset_id) | (Allocation.asset_id == data.requested_asset_id),
                Booking.status.not_in([BookingStatus.cancelled, BookingStatus.returned]),
                Booking.pickup_date <= due_date,
                Booking.due_date >= pickup_date,
            )
        )
        overlap_res = await db.execute(overlap_query)
        if overlap_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The requested piece is already reserved for the selected date range."
            )

    # 5. Create Booking
    booking = Booking(
        user_id=current_user.id,
        rental_plan_id=plan.id,
        category_id=data.category_id,
        requested_asset_id=data.requested_asset_id,
        aadhaar_number=data.aadhaar_number,
        pan_number=data.pan_number,
        status=BookingStatus.pending,
        order_type="rent",
        pickup_date=pickup_date,
        due_date=due_date,
        deposit_amount=deposit_amount,
        rent_amount=rent_amount,
    )
    db.add(booking)
    await db.flush()

    # 6. Add tracking event
    size_str = f"Size: {data.size}" if getattr(data, "size", None) else ""
    _log_tracking_event(
        db,
        booking_id=booking.id,
        event_type="booking_confirmed",
        description=f"Your booking #{booking.id} has been created and is pending concierge approval" + (f" ({size_str})" if size_str else ""),
        created_by=current_user.id,
        meta=f"Rental Booking | {size_str}".strip(" |")
    )

    await db.commit()
    await db.refresh(booking)
    return booking


async def create_buy_order(db: AsyncSession, current_user: User, data: BuyOrderCreate) -> Booking:
    # 1. Fetch asset or any available unit of this product
    asset_result = await db.execute(select(Asset).where(Asset.id == data.asset_id))
    asset = asset_result.scalars().first()
    if not asset or not asset.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Piece not found or retired from manifest")

    # If this specific unit is not available, check for any alternative in-stock unit of the same piece
    if asset.status != AssetStatus.available or asset.is_in_dry_cleaning:
        alt_result = await db.execute(
            select(Asset).where(
                Asset.name.ilike(asset.name),
                Asset.category_id == asset.category_id,
                Asset.is_active == True,
                Asset.status == AssetStatus.available,
                Asset.is_in_dry_cleaning == False,
            )
        )
        alt_asset = alt_result.scalars().first()
        if alt_asset:
            asset = alt_asset
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{asset.name}' is currently out of stock."
            )

    # 2. Get or create Direct Purchase plan
    plan_result = await db.execute(select(RentalPlan).where(RentalPlan.name == "Direct Purchase (Buy to Own)"))
    buy_plan = plan_result.scalars().first()
    if not buy_plan:
        buy_plan = RentalPlan(
            name="Direct Purchase (Buy to Own)",
            duration_days=0,
            daily_rate=Decimal("0"),
            deposit_amount=Decimal("0"),
            daily_fine_rate=Decimal("0"),
            damage_fee=Decimal("0"),
            is_active=True
        )
        db.add(buy_plan)
        await db.flush()

    # 3. Determine purchase price
    purchase_price = Decimal(str(asset.buy_price)) if asset.buy_price is not None else Decimal("8999")
    purchase_date = data.delivery_date or date.today()

    # 4. Create booking record for buy order
    booking = Booking(
        user_id=current_user.id,
        rental_plan_id=buy_plan.id,
        category_id=asset.category_id,
        requested_asset_id=asset.id,
        aadhaar_number="XXXXXXXX9999",
        pan_number="BUYXXXXXXO",
        status=BookingStatus.allocated,  # directly allocated to buyer
        order_type="buy",
        pickup_date=purchase_date,
        due_date=purchase_date,
        deposit_amount=Decimal("0"),
        rent_amount=purchase_price,
    )
    db.add(booking)
    await db.flush()

    # 5. Allocate physical asset to buyer
    asset.status = AssetStatus.allocated
    allocation = Allocation(
        booking_id=booking.id,
        asset_id=asset.id,
        allocated_by=current_user.id
    )
    db.add(allocation)

    # 6. Create completed payment record for buy purchase
    payment = Payment(
        booking_id=booking.id,
        amount=purchase_price,
        type=PaymentType.rent,
        status=PaymentStatus.paid,
    )
    db.add(payment)

    # 7. Add tracking event
    size_str = f"Size: {data.size}" if data.size else "Tailored Fit"
    color_str = f"Color: {data.color}" if data.color else "Signature Shade"
    meta_info = f"Buy Order | {size_str} | {color_str}"
    if data.contact_phone:
        meta_info += f" | Phone: {data.contact_phone}"
    if data.shipping_address:
        meta_info += f" | Address: {data.shipping_address}"
    _log_tracking_event(
        db,
        booking_id=booking.id,
        event_type="buy_order_placed",
        description=f"Purchase order confirmed for {asset.name} ({size_str}, {color_str}) — ₹{purchase_price:,.2f}",
        created_by=current_user.id,
        meta=meta_info
    )

    await db.commit()
    await db.refresh(booking)
    return booking


async def get_user_bookings(db: AsyncSession, current_user: User) -> list[Booking]:
    query = (
        select(Booking)
        .where(Booking.user_id == current_user.id)
        .order_by(Booking.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


async def get_all_bookings(db: AsyncSession) -> list[Booking]:
    query = select(Booking).order_by(Booking.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


async def get_blocked_date_ranges_for_asset(db: AsyncSession, asset_id: int) -> list[dict]:
    # Active bookings where asset is either requested or allocated
    query = (
        select(Booking)
        .outerjoin(Allocation, Booking.id == Allocation.booking_id)
        .where(
            (Booking.requested_asset_id == asset_id) | (Allocation.asset_id == asset_id),
            Booking.status.not_in([BookingStatus.cancelled, BookingStatus.returned])
        )
    )
    result = await db.execute(query)
    bookings = result.scalars().all()

    ranges = []
    for b in bookings:
        ranges.append({
            "booking_id": b.id,
            "from_date": b.pickup_date,
            "to_date": b.due_date,
        })
    return ranges


async def refresh_booking_statuses(db: AsyncSession) -> dict:
    today = date.today()
    picked_up_ids = []
    overdue_ids = []

    # 1. Rent paid bookings whose pickup date has arrived
    rent_paid_res = await db.execute(
        select(Booking).where(
            Booking.status == BookingStatus.rent_paid,
            Booking.pickup_date <= today
        )
    )
    for b in rent_paid_res.scalars().all():
        b.status = BookingStatus.picked_up
        picked_up_ids.append(b.id)
        _log_tracking_event(db, b.id, "picked_up", "Booking auto-marked as picked up on scheduled date")

    # 2. Picked up bookings whose due date has passed
    picked_up_res = await db.execute(
        select(Booking).where(
            Booking.status == BookingStatus.picked_up,
            Booking.due_date < today
        )
    )
    for b in picked_up_res.scalars().all():
        b.status = BookingStatus.overdue
        overdue_ids.append(b.id)
        _log_tracking_event(db, b.id, "overdue", "Rental due date has passed; booking marked overdue")

    await db.commit()
    return {"picked_up": picked_up_ids, "overdue": overdue_ids}


async def mark_picked_up(booking_id: int, db: AsyncSession, admin_id: int) -> Booking:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status not in [BookingStatus.allocated, BookingStatus.rent_paid, BookingStatus.ready_for_pickup]:
        raise HTTPException(status_code=400, detail=f"Cannot mark picked up from status '{booking.status}'")

    booking.status = BookingStatus.picked_up

    # Update allocated asset
    alloc_res = await db.execute(select(Allocation).where(Allocation.booking_id == booking_id))
    alloc = alloc_res.scalars().first()
    if alloc:
        asset_res = await db.execute(select(Asset).where(Asset.id == alloc.asset_id))
        asset = asset_res.scalars().first()
        if asset:
            asset.status = AssetStatus.picked_up

    _log_tracking_event(
        db,
        booking_id=booking.id,
        event_type="picked_up",
        description="Asset handed over to client; rental active" if booking.order_type != "buy" else "Purchased asset handed over to client",
        created_by=admin_id
    )

    await db.commit()
    await db.refresh(booking)
    return booking


async def cancel_booking(db: AsyncSession, current_user: User, booking_id: int) -> Booking:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role != UserRole.admin and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    if booking.status in [BookingStatus.picked_up, BookingStatus.returned, BookingStatus.cancelled]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel booking with status '{booking.status}'")

    booking.status = BookingStatus.cancelled

    # Check paid payments and record deposit refund if applicable
    p_res = await db.execute(
        select(Payment).where(Payment.booking_id == booking_id, Payment.status == PaymentStatus.paid)
    )
    paid_payments = p_res.scalars().all()
    total_paid = sum(
        (p.amount for p in paid_payments if p.type in [PaymentType.deposit, PaymentType.rent]),
        Decimal("0")
    )
    if total_paid > 0:
        refund_record = Payment(
            booking_id=booking_id,
            type=PaymentType.deposit_refund,
            amount=total_paid,
            status=PaymentStatus.paid,
            created_at=datetime.now(timezone.utc)
        )
        db.add(refund_record)

    # Release any allocated asset
    alloc_res = await db.execute(select(Allocation).where(Allocation.booking_id == booking_id))
    alloc = alloc_res.scalars().first()
    if alloc:
        asset_res = await db.execute(select(Asset).where(Asset.id == alloc.asset_id))
        asset = asset_res.scalars().first()
        if asset:
            asset.status = AssetStatus.available

    _log_tracking_event(
        db,
        booking_id=booking.id,
        event_type="cancelled",
        description="Booking cancelled",
        created_by=current_user.id
    )

    await db.commit()
    await db.refresh(booking)
    return booking


async def request_return(db: AsyncSession, current_user: User, booking_id: int) -> Booking:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role != UserRole.admin and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to request return for this booking")

    if booking.order_type == "buy":
        raise HTTPException(status_code=400, detail="Cannot request return for outright purchase (Buy to Own)")

    if booking.status not in [BookingStatus.picked_up, BookingStatus.overdue, BookingStatus.rent_paid]:
        raise HTTPException(status_code=400, detail=f"Cannot request return for status '{booking.status}'")

    booking.status = BookingStatus.return_requested

    _log_tracking_event(
        db,
        booking_id=booking.id,
        event_type="return_requested",
        description="Client initiated return request; awaiting atelier concierge inspection",
        created_by=current_user.id
    )

    await db.commit()
    await db.refresh(booking)
    return booking
