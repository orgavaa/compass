"""Centralised sys.path extension for compass-net imports.

compass-net lives alongside the compass package and is not an installed
distribution package (it has a hyphen in the directory name, so Python
cannot discover it via normal package lookup). Until it has its own
pyproject.toml and is pip-installed as a path dependency, we extend
sys.path at import time.

This module centralises that extension so it happens exactly once
regardless of import order, and provides a single place to update if
the directory layout ever changes.

Long-term fix: add a pyproject.toml to compass-net, declare it as a
path dependency here (``compass-net @ file:./compass-net``), and remove
this module entirely.
"""

from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_NET_DIR = _REPO_ROOT / "compass-net"
_NET_DATA_DIR = _NET_DIR / "data"


def ensure_importable() -> None:
    """Add compass-net and compass-net/data to sys.path if not already present.

    Idempotent — safe to call multiple times.
    """
    for p in (str(_NET_DATA_DIR), str(_NET_DIR)):
        if p not in sys.path:
            sys.path.insert(0, p)
