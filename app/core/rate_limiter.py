from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.extension import _rate_limit_exceeded_handler
from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.logger import rate_limit_logger

# Global limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"]
)


async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded errors with logging
    """
    client_ip = get_remote_address(request)
    rate_limit_logger.warning(
        f"Rate limit exceeded - IP: {client_ip}, Path: {request.url.path}, "
        f"Method: {request.method}, Limit: {exc.detail}"
    )
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded"},
    )


def setup_rate_limiter(app):
    """
    Attach SlowAPI rate limiting to FastAPI app
    """

    app.state.limiter = limiter

    app.add_exception_handler(
        RateLimitExceeded,
        custom_rate_limit_exceeded_handler
    )

    app.add_middleware(SlowAPIMiddleware)