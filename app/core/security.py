from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import bcrypt
import uuid

from app.core.config import settings


def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


# JWT Access Token functions
def create_access_token(
    data: dict,
    expire_minutes: int = settings.ACCESS_TOKEN_EXPIRE_MINUTES
):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire, "jti": uuid.uuid4().hex})

    return jwt.encode(
        to_encode,
        settings.ACCESS_TOKEN_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )


def verify_access_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.ACCESS_TOKEN_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        return None


# JWT Refresh Token functions
def create_refresh_token(
    data: dict,
    expire_days: int = settings.REFRESH_TOKEN_EXPIRE_DAYS
) -> tuple[str, datetime]:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=expire_days)
    to_encode.update({"exp": expire, "jti": uuid.uuid4().hex})

    token = jwt.encode(
        to_encode,
        settings.REFRESH_TOKEN_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return token, expire


def verify_refresh_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.REFRESH_TOKEN_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        return None
