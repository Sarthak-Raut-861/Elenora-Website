import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

# Rotating file handler setup
LOG_FILE = os.path.join(LOG_DIR, "app.log")
AUTH_LOG_FILE = os.path.join(LOG_DIR, "auth.log")
PAYMENT_LOG_FILE = os.path.join(LOG_DIR, "payment.log")
BOOKING_LOG_FILE = os.path.join(LOG_DIR, "booking.log")
ERROR_LOG_FILE = os.path.join(LOG_DIR, "errors.log")

# Detailed formatter with milliseconds
detailed_formatter = logging.Formatter(
    "%(asctime)s.%(msecs)03d | %(levelname)-8s | %(name)s | %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# Simple formatter for console
console_formatter = logging.Formatter(
    "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)


def _create_rotating_handler(log_file, max_bytes=5*1024*1024, backup_count=5, formatter=detailed_formatter):
    """Helper function to create rotating file handlers."""
    handler = RotatingFileHandler(
        log_file,
        maxBytes=max_bytes,
        backupCount=backup_count
    )
    handler.setFormatter(formatter)
    return handler


def _setup_logger(name, log_file=None, level=logging.INFO):
    """Setup a logger with file and console handlers."""
    logger_instance = logging.getLogger(name)
    logger_instance.setLevel(level)
    logger_instance.propagate = False
    
    # Avoid duplicate handlers
    if logger_instance.handlers:
        return logger_instance
    
    # Console handler (all loggers)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(console_formatter)
    logger_instance.addHandler(console_handler)
    
    # File handler (if specified)
    if log_file:
        file_handler = _create_rotating_handler(log_file)
        logger_instance.addHandler(file_handler)
    
    return logger_instance


# Main logger
logger = _setup_logger("asset_tracking", LOG_FILE)

# Module-specific loggers
auth_logger = _setup_logger("asset_tracking.auth", AUTH_LOG_FILE)
payment_logger = _setup_logger("asset_tracking.payment", PAYMENT_LOG_FILE)
booking_logger = _setup_logger("asset_tracking.booking", BOOKING_LOG_FILE)
error_logger = _setup_logger("asset_tracking.errors", ERROR_LOG_FILE, level=logging.WARNING)

# Additional module loggers (reuse main log file)
allocation_logger = _setup_logger("asset_tracking.allocation", LOG_FILE)
asset_logger = _setup_logger("asset_tracking.asset", LOG_FILE)
return_logger = _setup_logger("asset_tracking.return", LOG_FILE)
tracking_logger = _setup_logger("asset_tracking.tracking", LOG_FILE)
rate_limit_logger = _setup_logger("asset_tracking.rate_limit", LOG_FILE, level=logging.WARNING)
exception_logger = _setup_logger("asset_tracking.exception", ERROR_LOG_FILE, level=logging.ERROR)


# Utility function for structured logging
def log_user_action(logger_instance, level, action, user_id=None, user_email=None, details=None):
    """
    Structured logging for user actions.
    Prevents logging of sensitive information.
    """
    user_info = ""
    if user_email:
        user_info = f"[User: {user_email}] "
    elif user_id:
        user_info = f"[UserId: {user_id}] "
    
    message = f"{user_info}{action}"
    if details:
        message += f" | {details}"
    
    logger_instance.log(level, message)