"""
Vercel (Python runtime) entrypoint for the Deep Speak backend.

The FastAPI application itself lives in `backend/main.py` and is already
re-exported by the repository-root `main.py` (the Railway / Railpack
entrypoint). This module simply re-exports that same `app` so Vercel can
serve it as a serverless function. The Railway startup path
(root `main.py` + root `requirements.txt`) is untouched.
"""

import os
import sys

# Make the repository root importable so `main` (the root entrypoint)
# resolves exactly as it does on Railway. The root entrypoint itself puts
# `backend/` on sys.path before importing the real application.
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from main import app  # noqa: E402,F401
