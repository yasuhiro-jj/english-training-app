"""
Railway / monorepo entrypoint.

Railpack often runs from the repository root and expects:
  - requirements.txt at the root
  - an ASGI app importable as `main:app`

The actual backend lives in `backend/main.py`, so we re-export it here.
"""

import os
import sys

# Ensure `backend/app` is importable as top-level `app`
_HERE = os.path.dirname(__file__)
_BACKEND_DIR = os.path.join(_HERE, "backend")
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from backend.main import app  # noqa: E402,F401

