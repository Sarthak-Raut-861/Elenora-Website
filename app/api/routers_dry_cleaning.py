from decimal import Decimal
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from datetime import date

from app.db.session import get_db
from app.core.rbac import require_roles
from app.core.rate_limiter import limiter
from app.models.user import UserRole, User
from app.models.dry_cleaning import DryCleaningStatus
from app.schemas.dry_cleaning import (
    DryCleaningRequestCreate,
    DryCleaningRequestUpdate,
    DryCleaningRequestResponse,
    DryCleanerCreate,
    DryCleanerUpdate,
    DryCleanerResponse,
)
from app.services.dry_cleaning_service import (
    list_dry_cleaning_requests,
    create_dry_cleaning_request,
    mark_cleaning_done,
    update_dry_cleaning_request,
    list_pending_send,
    mark_in_progress,
    list_dry_cleaning_requests_for_cleaner,
    list_dry_cleaners,
    create_dry_cleaner,
    update_dry_cleaner,
    delete_dry_cleaner,
)

router = APIRouter(prefix="/dry-cleaning", tags=["Dry Cleaning"])


# ── Dry Cleaner Directory (admin only) ───────────────────────────────────────

@router.get("/cleaners", response_model=list[DryCleanerResponse])
@limiter.limit("30/minute")
async def get_cleaners(
    request: Request,
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    return await list_dry_cleaners(db, active_only)


@router.post("/cleaners", response_model=DryCleanerResponse, status_code=201)
async def add_cleaner(
    data: DryCleanerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    return await create_dry_cleaner(db, data)


@router.patch("/cleaners/{cleaner_id}", response_model=DryCleanerResponse)
async def edit_cleaner(
    cleaner_id: int,
    data: DryCleanerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    return await update_dry_cleaner(db, cleaner_id, data)


@router.delete("/cleaners/{cleaner_id}", status_code=204)
async def remove_cleaner(
    cleaner_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    await delete_dry_cleaner(db, cleaner_id)


# ── Admin request endpoints ──────────────────────────────────────────────────

@router.get("/pending-send", response_model=list[DryCleaningRequestResponse])
async def get_pending_send(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    return await list_pending_send(db)


@router.get("/", response_model=list[DryCleaningRequestResponse])
async def get_all_requests(
    status: DryCleaningStatus | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.dry_cleaner])),
):
    return await list_dry_cleaning_requests(db, status)


@router.post("/", response_model=DryCleaningRequestResponse, status_code=201)
async def send_to_dry_cleaner(
    data: DryCleaningRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    return await create_dry_cleaning_request(
        db,
        asset_id=data.asset_id,
        booking_id=data.booking_id,
        dry_cleaner_name=data.dry_cleaner_name,
        dry_cleaner_id=data.dry_cleaner_id,
        notes=data.notes,
        admin_notes=data.admin_notes,
        priority=data.priority,
        expected_by=data.expected_by,
    )


@router.patch("/{request_id}", response_model=DryCleaningRequestResponse)
async def update_request(
    request_id: int,
    data: DryCleaningRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    return await update_dry_cleaning_request(
        db, request_id,
        {k: v for k, v in data.model_dump().items() if v is not None},
    )


# ── Portal endpoints (admin OR dry_cleaner) ──────────────────────────────────

@router.get("/portal/my-jobs", response_model=list[DryCleaningRequestResponse])
async def get_my_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.dry_cleaner])),
):
    return await list_dry_cleaning_requests_for_cleaner(db)


@router.post("/{request_id}/start", response_model=DryCleaningRequestResponse)
async def start_cleaning(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.dry_cleaner])),
):
    return await mark_in_progress(db, request_id)


class CompletePayload(BaseModel):
    cleaner_notes: Optional[str] = None
    actual_cost: Optional[Decimal] = None
    rating: Optional[int] = None


@router.post("/{request_id}/complete", response_model=DryCleaningRequestResponse)
async def complete_cleaning(
    request_id: int,
    payload: CompletePayload = CompletePayload(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.dry_cleaner])),
):
    return await mark_cleaning_done(
        db, request_id,
        cleaner_notes=payload.cleaner_notes,
        actual_cost=payload.actual_cost,
        rating=payload.rating,
    )
