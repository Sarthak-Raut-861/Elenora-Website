from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from app.core.logger import exception_logger


async def http_exception_handler(request: Request, exc: HTTPException):
    # Log HTTP exceptions
    exception_logger.warning(
        f"HTTP Exception - Status: {exc.status_code}, Detail: {exc.detail}, "
        f"Path: {request.url.path}, Method: {request.method}, "
        f"Client: {request.client.host if request.client else 'Unknown'}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log unhandled exceptions with full traceback
    exception_logger.error(
        f"Unhandled Exception - Type: {type(exc).__name__}, Message: {str(exc)}, "
        f"Path: {request.url.path}, Method: {request.method}, "
        f"Client: {request.client.host if request.client else 'Unknown'}",
        exc_info=True
    )
    # In production, do NOT expose internal error details
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


def register_exception_handlers(app: FastAPI):
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
