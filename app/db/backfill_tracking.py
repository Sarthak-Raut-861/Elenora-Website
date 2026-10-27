"""
One-off backfill script — creates tracking_events for all existing bookings
based on their current state and related records (payments, allocations,
returns, dry cleaning requests).

Run with:
    venv/Scripts/python.exe -m app.db.backfill_tracking
"""
import asyncio
from datetime import timezone
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
import app.models  # noqa: F401 — registers all ORM models

from app.models.bookings import Booking, BookingStatus
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.models.allocations import Allocation
from app.models.returns import Return
from app.models.dry_cleaning import DryCleaningRequest, DryCleaningStatus
from app.models.tracking import TrackingEvent


def _utc(dt):
    """Ensure datetime is timezone-aware UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _add(db: AsyncSession, booking_id: int, event_type: str, event_at, description: str):
    db.add(TrackingEvent(
        booking_id=booking_id,
        event_type=event_type,
        event_at=_utc(event_at),
        description=description,
        created_by=None,
    ))


async def backfill(db: AsyncSession):
    # Clear any existing events to avoid duplicates on re-run
    await db.execute(delete(TrackingEvent))
    await db.flush()

    bookings_result = await db.execute(select(Booking).order_by(Booking.id))
    bookings = bookings_result.scalars().all()

    for booking in bookings:
        bid = booking.id
        created = _utc(booking.created_at)

        # ── 1. booking_confirmed — always, at booking.created_at ──────────────
        _add(db, bid, "booking_confirmed", created,
             f"Your booking #{bid} has been confirmed")

        # ── 2. deposit_paid — look for a paid deposit payment ─────────────────
        dep_result = await db.execute(
            select(Payment).where(
                Payment.booking_id == bid,
                Payment.type == PaymentType.deposit,
                Payment.status == PaymentStatus.paid,
            ).order_by(Payment.id)
        )
        dep = dep_result.scalars().first()
        if dep:
            _add(db, bid, "deposit_paid", _utc(dep.created_at),
                 f"Security deposit of ₹{dep.amount} received")

        # ── 3. asset_allocated — look for allocation record ───────────────────
        alloc_result = await db.execute(
            select(Allocation).where(Allocation.booking_id == bid)
        )
        alloc = alloc_result.scalar_one_or_none()
        if alloc:
            _add(db, bid, "asset_allocated", _utc(alloc.allocated_at),
                 "Admin has allocated your asset")
            # ready_for_pickup fires right after allocation
            _add(db, bid, "ready_for_pickup", _utc(alloc.allocated_at),
                 f"Visit the center to pick up your item on {booking.pickup_date}")

        # ── 4. rent_paid ───────────────────────────────────────────────────────
        rent_result = await db.execute(
            select(Payment).where(
                Payment.booking_id == bid,
                Payment.type == PaymentType.rent,
                Payment.status == PaymentStatus.paid,
            ).order_by(Payment.id)
        )
        rent = rent_result.scalars().first()
        if rent:
            _add(db, bid, "rent_paid", _utc(rent.created_at),
                 f"Total rent of ₹{rent.amount} paid successfully")

        # ── 5. picked_up — if status is picked_up / overdue / ready_for_pickup
        #       / returned, the asset was picked up.
        #       Use rent payment time + 1s if available, else pickup_date.
        picked_up_statuses = {
            BookingStatus.picked_up,
            BookingStatus.overdue,
            BookingStatus.ready_for_pickup,
            BookingStatus.returned,
        }
        if booking.status in picked_up_statuses:
            from datetime import datetime, timedelta
            if rent:
                pickup_dt = _utc(rent.created_at) + timedelta(seconds=1)
            else:
                pickup_dt = datetime.combine(booking.pickup_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            _add(db, bid, "picked_up", pickup_dt, "Asset handed over to you")

        # ── 6. overdue ────────────────────────────────────────────────────────
        if booking.status == BookingStatus.overdue:
            from datetime import datetime, timedelta
            due_dt = datetime.combine(booking.due_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            _add(db, bid, "overdue", due_dt,
                 "Booking is overdue — please return the item")

        # ── 7. return_requested ───────────────────────────────────────────────
        if booking.status in {BookingStatus.ready_for_pickup, BookingStatus.returned}:
            ret_result = await db.execute(
                select(Return).where(Return.booking_id == bid)
            )
            ret = ret_result.scalar_one_or_none()
            # Place return_requested 1 second before the return record
            from datetime import timedelta
            req_at = (_utc(ret.created_at) - timedelta(seconds=1)) if ret else created
            _add(db, bid, "return_requested", req_at,
                 "You requested to return the item")

        # ── 8. returned ───────────────────────────────────────────────────────
        ret_result2 = await db.execute(
            select(Return).where(Return.booking_id == bid)
        )
        ret2 = ret_result2.scalar_one_or_none()
        if ret2:
            _add(db, bid, "returned", _utc(ret2.created_at),
                 "Item returned successfully")

            # ── 9. sent_dry_cleaning ──────────────────────────────────────────
            dc_result = await db.execute(
                select(DryCleaningRequest).where(
                    DryCleaningRequest.booking_id == bid
                ).order_by(DryCleaningRequest.id)
            )
            dc = dc_result.scalars().first()
            if dc and dc.sent_at:
                _add(db, bid, "sent_dry_cleaning", _utc(dc.sent_at),
                     "Item sent to dry cleaning facility")

                # ── 10. dry_cleaning_done ─────────────────────────────────────
                if dc.status == DryCleaningStatus.completed and dc.completed_at:
                    _add(db, bid, "dry_cleaning_done", _utc(dc.completed_at),
                         "Item cleaned and back in inventory")

        # ── cancelled / rejected ──────────────────────────────────────────────
        if booking.status == BookingStatus.cancelled:
            _add(db, bid, "booking_cancelled", created,
                 "Booking has been cancelled")

    await db.commit()
    print(f"Backfilled tracking events for {len(bookings)} bookings.")


async def main():
    async with AsyncSessionLocal() as db:
        await backfill(db)


if __name__ == "__main__":
    asyncio.run(main())
