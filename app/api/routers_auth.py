from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.logger import auth_logger
from app.core.rate_limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_refresh_token,
)
from app.db.session import get_db
from app.models.token import RefreshToken
from app.models.user import User, UserRole
from app.schemas.auth import (
    AccessTokenResponse,
    ChangePassword,
    UserLogin,
    UserRegister,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    auth_logger.info(f"Registration attempt for: {data.email}")

    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalars().first():
        auth_logger.warning(f"Registration failed: Email already registered {data.email}")
        raise HTTPException(status_code=400, detail="Email is already registered")

    user = User(
        full_name=data.full_name.strip(),
        email=data.email.lower().strip(),
        password_hash=hash_password(data.password),
        role=UserRole.user,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    auth_logger.info(f"User registered successfully: {user.email} (ID: {user.id})")
    return user


@router.post("/login", response_model=AccessTokenResponse)
@limiter.limit("15/minute")
async def login(
    request: Request,
    response: Response,
    data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    auth_logger.info(f"Login attempt for: {data.email}")

    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalars().first()

    if not user or not verify_password(data.password, user.password_hash):
        auth_logger.warning(f"Failed login attempt for: {data.email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active:
        auth_logger.warning(f"Inactive account login attempt: {data.email}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    access_token = create_access_token({"sub": user.email, "role": user.role.value, "user_id": user.id})
    refresh_tok, expires_at = create_refresh_token({"sub": user.email, "user_id": user.id})

    # Store refresh token
    token_record = RefreshToken(
        token=refresh_tok,
        user_id=user.id,
        expires_at=expires_at,
        revoked=False
    )
    db.add(token_record)
    await db.commit()

    # Set HTTP-only refresh cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_tok,
        httponly=True,
        samesite="lax",
        secure=False,  # Can set True in production behind HTTPS
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )

    auth_logger.info(f"User logged in successfully: {user.email}")
    return AccessTokenResponse(access_token=access_token, token_type="bearer")


@router.post("/refresh", response_model=AccessTokenResponse)
@limiter.limit("30/minute")
async def refresh_token_endpoint(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        # Fallback to authorization header or json body if present
        try:
            body = await request.json()
            if isinstance(body, dict):
                refresh_token = body.get("refresh_token")
        except Exception:
            refresh_token = None

    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")

    payload = verify_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    email = payload.get("sub")
    tok_res = await db.execute(
        select(RefreshToken).where(RefreshToken.token == refresh_token, RefreshToken.revoked == False)
    )
    stored_token = tok_res.scalars().first()
    if not stored_token or stored_token.is_expired():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is revoked or expired")

    user_res = await db.execute(select(User).where(User.email == email))
    user = user_res.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not active or not found")

    # Rotate refresh token
    stored_token.revoked = True
    new_refresh_tok, new_expires_at = create_refresh_token({"sub": user.email, "user_id": user.id})
    new_token_record = RefreshToken(
        token=new_refresh_tok,
        user_id=user.id,
        expires_at=new_expires_at,
        revoked=False
    )
    db.add(new_token_record)
    await db.commit()

    # Set new HTTP-only refresh cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_tok,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )

    new_access_token = create_access_token({"sub": user.email, "role": user.role.value, "user_id": user.id})
    return AccessTokenResponse(access_token=new_access_token, token_type="bearer")


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        tok_res = await db.execute(select(RefreshToken).where(RefreshToken.token == refresh_token))
        tok = tok_res.scalars().first()
        if tok:
            tok.revoked = True
            await db.commit()

    response.delete_cookie(key="refresh_token")
    return {"detail": "Logged out successfully"}


@router.post("/change-password")
async def change_password(
    data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    if len(data.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters")

    current_user.password_hash = hash_password(data.new_password)
    current_user.updated_at = datetime.now(timezone.utc)

    # Invalidate all active refresh tokens for this user
    tok_stmt = select(RefreshToken).where(RefreshToken.user_id == current_user.id, RefreshToken.revoked == False)
    tok_res = await db.execute(tok_stmt)
    for t in tok_res.scalars().all():
        t.revoked = True

    await db.commit()

    auth_logger.info(f"Password changed for user {current_user.email}")
    return {"detail": "Password updated successfully"}

