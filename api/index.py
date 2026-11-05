import sys
import os

# Ensure project root is in sys.path regardless of execution environment
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app.main import app

# Export ASGI app instance for Vercel Serverless Function
__all__ = ["app"]
