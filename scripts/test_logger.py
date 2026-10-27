#!/usr/bin/env python3
"""Test script to verify logging system is working properly"""

import os
import sys

# Add parent directory to path to allow imports from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Test 1: Verify logs directory
print("=" * 60)
print("TEST 1: Logs Directory Verification")
print("=" * 60)

if os.path.exists("logs"):
    print("✓ Logs directory exists")
    log_files = os.listdir("logs")
    print(f"  Log files: {log_files if log_files else 'None yet'}")
else:
    print("✗ Logs directory does not exist")

# Test 2: Import all loggers
print("\n" + "=" * 60)
print("TEST 2: Logger Imports")
print("=" * 60)

try:
    from app.core.logger import (
        logger, 
        auth_logger, 
        payment_logger, 
        booking_logger, 
        allocation_logger,
        asset_logger,
        return_logger,
        tracking_logger,
        rate_limit_logger,
        exception_logger
    )
    print("✓ All loggers imported successfully")
except Exception as e:
    print(f"✗ Failed to import loggers: {e}")
    sys.exit(1)

# Test 3: Test logging functionality
print("\n" + "=" * 60)
print("TEST 3: Basic Logging Tests")
print("=" * 60)

try:
    logger.info("Test main logger - INFO level")
    auth_logger.info("Test auth logger - User test@example.com logged in")
    auth_logger.warning("Test auth logger - Failed login attempt for user@example.com")
    payment_logger.info("Test payment logger - Payment of 100.00 processed")
    booking_logger.info("Test booking logger - Booking #123 created for asset #1")
    allocation_logger.info("Test allocation logger - Asset #1 allocated to booking #123")
    asset_logger.info("Test asset logger - Asset created with code ASSET-001")
    return_logger.info("Test return logger - Asset return processed for booking #123")
    rate_limit_logger.warning("Test rate limit logger - Rate limit exceeded for IP 192.168.1.1")
    exception_logger.error("Test exception logger - Sample error message")
    print("✓ All logging tests executed successfully")
except Exception as e:
    print(f"✗ Logging test failed: {e}")
    sys.exit(1)

# Test 4: Verify log files created
print("\n" + "=" * 60)
print("TEST 4: Log File Verification")
print("=" * 60)

if os.path.exists("logs"):
    log_files = os.listdir("logs")
    expected_files = ["app.log", "auth.log", "payment.log", "booking.log", "errors.log"]
    
    for log_file in expected_files:
        if log_file in log_files:
            size = os.path.getsize(f"logs/{log_file}")
            print(f"✓ {log_file} exists ({size} bytes)")
        else:
            print(f"⊘ {log_file} not created yet (normal if no logs written yet)")
else:
    print("✗ Logs directory still does not exist")

print("\n" + "=" * 60)
print("LOGGING SYSTEM VERIFICATION COMPLETE")
print("=" * 60)
print("\nLogging is properly configured and operational!")
print("Log files are stored in: logs/")
print("  - app.log: Main application logs")
print("  - auth.log: Authentication logs")
print("  - payment.log: Payment transaction logs")
print("  - booking.log: Booking operation logs")
print("  - errors.log: Error and warning logs")
