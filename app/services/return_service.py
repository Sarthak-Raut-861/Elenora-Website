from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.returns import Return
from app.models.bookings import Booking, BookingStatus
from app.models.rental_plan import RentalPlan
from app.models.allocations import Allocation
from app.models.asset import Asset, AssetStatus
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.models.dry_cleaning import DryCleaningRequest, DryCleaningStatus
from app.models.tracking import TrackingEvent


def _log_tracking_event(
    db: AsyncSession,
    booking_id: int,
    event_type: str,
    description: str,
    created_by: int | None = None
):
    event = TrackingEvent(
        booking_id=booking_id,
        event_type=event_type,
        event_at=datetime.now(timezone.utc),
        description=description,
        created_by=created_by,
    )
    db.add(event)


async def process_return(
    db: AsyncSession,
    booking_id: int,
    admin_id: int,
    returned_at: date,
    damage_amount: Decimal = Decimal("0"),
    damage_notes: str | None = None,
    send_for_dry_cleaning: bool = False,
) -> Return:
    # 1. Fetch booking
    booking_res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = booking_res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status in [BookingStatus.returned, BookingStatus.cancelled]:
        raise HTTPException(status_code=400, detail=f"Booking is already in '{booking.status}' status")

    if booking.order_type == "buy":
        raise HTTPException(
            status_code=400,
            detail="Cannot process return for an outright purchase (Buy to Own)"
        )

    if booking.status not in [BookingStatus.picked_up, BookingStatus.overdue, BookingStatus.return_requested, BookingStatus.rent_paid]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot process return for booking in status '{booking.status}'. Garment must have been picked up."
        )

    # 2. Fetch rental plan for fine calculation
    plan_res = await db.execute(select(RentalPlan).where(RentalPlan.id == booking.rental_plan_id))
    plan = plan_res.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Associated rental plan not found")

    # 3. Calculate days late and fines
    days_late = max(0, (returned_at - booking.due_date).days)
    fine_amount = Decimal(str(days_late)) * Decimal(str(plan.daily_fine_rate))

    # Check if security deposit was actually paid
    dep_payment_res = await db.execute(
        select(Payment).where(
            Payment.booking_id == booking_id,
            Payment.type == PaymentType.deposit,
            Payment.status == PaymentStatus.paid
        )
    )
    deposit_payment = dep_payment_res.scalars().first()
    actual_deposit_paid = deposit_payment.amount if deposit_payment else Decimal("0")

    # 4. Total deductions and net deposit refund
    total_deductions = fine_amount + Decimal(str(damage_amount))
    deposit_refund_amount = max(Decimal("0"), actual_deposit_paid - total_deductions)

    # 5. Create Return record
    return_record = Return(
        booking_id=booking_id,
        returned_at=returned_at,
        days_late=days_late,
        fine_amount=fine_amount,
        damage_amount=damage_amount,
        damage_notes=damage_notes,
        deposit_refunded=deposit_refund_amount > 0,
        processed_by=admin_id,
    )
    db.add(return_record)

    # 6. Record payment entries
    if fine_amount > 0:
        fine_payment = Payment(
            booking_id=booking_id,
            type=PaymentType.fine,
            amount=fine_amount,
            status=PaymentStatus.paid,
            created_at=datetime.now(timezone.utc),
        )
        db.add(fine_payment)

    if deposit_refund_amount > 0:
        refund_payment = Payment(
            booking_id=booking_id,
            type=PaymentType.deposit_refund,
            amount=deposit_refund_amount,
            status=PaymentStatus.paid,
            created_at=datetime.now(timezone.utc),
        )
        db.add(refund_payment)

    # 7. Update Booking status
    booking.status = BookingStatus.returned

    # 8. Locate allocated asset
    alloc_res = await db.execute(select(Allocation).where(Allocation.booking_id == booking_id))
    alloc = alloc_res.scalars().first()
    asset = None
    if alloc:
        asset_res = await db.execute(select(Asset).where(Asset.id == alloc.asset_id))
        asset = asset_res.scalars().first()

    # 9. Handle Dry Cleaning or restore Asset availability
    if send_for_dry_cleaning and asset:
        asset.is_in_dry_cleaning = True
        asset.status = AssetStatus.returned

        dc_req = DryCleaningRequest(
            asset_id=asset.id,
            booking_id=booking_id,
            status=DryCleaningStatus.pending,
            priority="urgent" if damage_amount > 0 else "normal",
            notes=damage_notes or "Post-rental sanitization inspection",
        )
        db.add(dc_req)

        _log_tracking_event(
            db,
            booking_id=booking_id,
            event_type="sent_dry_cleaning",
            description="Item dispatched to partner sanitization facility",
            created_by=admin_id,
        )
    elif asset:
        asset.status = AssetStatus.available
        asset.is_in_dry_cleaning = False

    # 10. Log return tracking event
    _log_tracking_event(
        db,
        booking_id=booking_id,
        event_type="returned",
        description=f"Item returned. Late days: {days_late}, Deductions: ₹{total_deductions}, Net Refund: ₹{deposit_refund_amount}",
        created_by=admin_id,
    )

    await db.commit()
    await db.refresh(return_record)
    return return_record

