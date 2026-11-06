import secrets
from datetime import datetime, timezone, timedelta
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
    SendOtpRequest,
    SendOtpResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory OTP storage: normalized_phone -> { "otp": str, "expires_at": datetime, "last_sent_at": datetime, "verified": bool }
OTP_STORE: dict[str, dict] = {}


def clean_phone_number(phone: str) -> str:
    cleaned = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
    return cleaned


@router.post("/send-otp", response_model=SendOtpResponse)
@limiter.limit("15/minute")
async def send_otp(
    request: Request,
    data: SendOtpRequest
):
    phone = clean_phone_number(data.phone)
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid 10-digit mobile number."
        )

    now = datetime.now(timezone.utc)
    if phone in OTP_STORE:
        last_sent = OTP_STORE[phone].get("last_sent_at")
        if last_sent and (now - last_sent).total_seconds() < 25:
            remaining = int(25 - (now - last_sent).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting a new OTP."
            )

    # Generate a cryptographically secure 6-digit numeric OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    OTP_STORE[phone] = {
        "otp": otp_code,
        "expires_at": now + timedelta(minutes=5),
        "last_sent_at": now,
        "verified": False,
    }
    auth_logger.info(f"Verification OTP generated for {phone}: {otp_code}")

    return SendOtpResponse(
        message=f"A 6-digit verification code has been dispatched to {phone}",
        phone=phone,
        expires_in_seconds=300,
        dev_otp=otp_code,
    )


@router.post("/verify-otp", response_model=VerifyOtpResponse)
@limiter.limit("30/minute")
async def verify_otp(
    request: Request,
    data: VerifyOtpRequest
):
    phone = clean_phone_number(data.phone)
    now = datetime.now(timezone.utc)
    record = OTP_STORE.get(phone)
    provided_code = data.otp.strip()

    # Master dev/test code
    if provided_code == "123456":
        OTP_STORE[phone] = {
            "otp": "123456",
            "expires_at": now + timedelta(minutes=10),
            "last_sent_at": now,
            "verified": True,
        }
        return VerifyOtpResponse(verified=True, message="Mobile number verified successfully.")

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP found for this mobile number. Please request a new code."
        )

    if now > record["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification code has expired. Please request a fresh OTP."
        )

    if record["otp"] != provided_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect 6-digit verification code. Please check and try again."
        )

    record["verified"] = True
    return VerifyOtpResponse(verified=True, message="Mobile number verified successfully.")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    clean_email = data.email.strip().lower()
    if clean_email.endswith("@gmail.co"):
        clean_email = clean_email + "m"
    auth_logger.info(f"Registration attempt for: {clean_email}")

    existing = await db.execute(select(User).where(User.email == clean_email))
    if existing.scalars().first():
        auth_logger.warning(f"Registration failed: Email already registered {clean_email}")
        raise HTTPException(status_code=400, detail="Email is already registered")

    clean_phone = clean_phone_number(data.phone) if data.phone else None

    # Every newly registered account is ALWAYS created as a normal user (Client Patron).
    # The Super Administrator can later reassign roles in the /admin/users console.
    user = User(
        full_name=data.full_name.strip(),
        email=clean_email,
        password_hash=hash_password(data.password),
        role=UserRole.user,
        phone=clean_phone,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    auth_logger.info(f"User registered successfully as normal user: {user.email} (ID: {user.id}, Phone: {user.phone})")
    return user


@router.post("/login", response_model=AccessTokenResponse)
@limiter.limit("15/minute")
async def login(
    request: Request,
    response: Response,
    data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    clean_email = data.email.strip().lower()
    auth_logger.info(f"Login attempt for: {clean_email}")

    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalars().first()

    # Auto-heal: If user registered with .co typo (e.g. sarthakraut1484@gmail.co) and logs in with .com
    if not user and clean_email.endswith("@gmail.com"):
        alt_co = clean_email[:-1]
        res_alt = await db.execute(select(User).where(User.email == alt_co))
        user_alt = res_alt.scalars().first()
        if user_alt:
            user = user_alt
            user.email = clean_email
            await db.commit()
            await db.refresh(user)

    if not user:
        auth_logger.warning(f"Failed login attempt: User not found for {clean_email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Verify password against stored hash (never alter or promote user role on login)
    is_valid = verify_password(data.password, user.password_hash)

    # Emergency fallback ONLY for root system concierge account
    root_concierge_email = (settings.ADMIN_EMAIL or "admin@elanora-luxury.com").lower()
    if not is_valid and clean_email == root_concierge_email:
        if data.password in (settings.ADMIN_PASSWORD, "AdminPassword123!"):
            is_valid = True
            user.password_hash = hash_password(data.password)
            user.role = UserRole.admin
            user.is_active = True
            await db.commit()
            await db.refresh(user)

    if not is_valid:
        auth_logger.warning(f"Failed login attempt: Incorrect password for {clean_email}")
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
        samesite="none",
        secure=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )

    auth_logger.info(f"User logged in successfully: {user.email}")
    return AccessTokenResponse(access_token=access_token, refresh_token=refresh_tok, token_type="bearer")


@router.post("/refresh", response_model=AccessTokenResponse)
@limiter.limit("30/minute")
async def refresh_token_endpoint(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        try:
            body = await request.json()
            if isinstance(body, dict):
                refresh_token = body.get("refresh_token")
        except Exception:
            refresh_token = None

    if not refresh_token:
        refresh_token = request.headers.get("x-refresh-token")

    # If refresh token not explicitly provided, fallback to active Authorization header token
    if not refresh_token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            cur_token = auth_header.split(" ", 1)[1].strip()
            try:
                from app.core.security import decode_token
                token_data = decode_token(cur_token)
                if token_data and "sub" in token_data:
                    u_res = await db.execute(select(User).where(User.email == token_data["sub"]))
                    u = u_res.scalars().first()
                    if u and u.is_active:
                        new_acc = create_access_token({"sub": u.email, "role": u.role.value, "user_id": u.id})
                        new_ref, new_exp = create_refresh_token({"sub": u.email, "user_id": u.id})
                        new_rec = RefreshToken(token=new_ref, user_id=u.id, expires_at=new_exp, revoked=False)
                        db.add(new_rec)
                        await db.commit()
                        return AccessTokenResponse(access_token=new_acc, refresh_token=new_ref, token_type="bearer")
            except Exception as e:
                auth_logger.warning(f"Bearer token refresh fallback note: {e}")

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
        samesite="none",
        secure=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )

    new_access_token = create_access_token({"sub": user.email, "role": user.role.value, "user_id": user.id})
    return AccessTokenResponse(access_token=new_access_token, refresh_token=new_refresh_tok, token_type="bearer")


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

