"""Migrate discrimination model checkpoints from pickle to native format.

Pickle files are not forward-portable across Python/scikit-learn/xgboost
version boundaries. This script converts the shipped .pkl checkpoints to
XGBoost native JSON (for XGBoost models) or LightGBM text (for LightGBM
models), which are stable across library versions.

Run once after updating Python or ML library versions:

    python compass-net/scripts/migrate_disc_model_format.py

Output files are written alongside the originals:
    compass-net/checkpoints/disc_xgb.json      (XGBoost native JSON)
    compass-net/checkpoints/disc_xgb_v2.json   (XGBoost native JSON)

The LearnedDiscriminationScorer loader already prefers the .json file
when it exists alongside a .pkl, so no other changes are required.
"""

from __future__ import annotations

import pickle
import sys
from pathlib import Path

CHECKPOINTS = Path(__file__).resolve().parent.parent / "checkpoints"
TARGETS = [
    CHECKPOINTS / "disc_xgb.pkl",
    CHECKPOINTS / "disc_xgb_v2.pkl",
]


def migrate_one(pkl_path: Path) -> None:
    print(f"Loading {pkl_path.name} ...")
    with open(pkl_path, "rb") as f:
        checkpoint = pickle.load(f)

    # Unwrap checkpoint dict if present
    if isinstance(checkpoint, dict) and "model" in checkpoint:
        model = checkpoint["model"]
        meta = {k: v for k, v in checkpoint.items() if k != "model"}
    else:
        # Legacy FeatureDiscriminationModel wrapper
        sys.path.insert(0, str(CHECKPOINTS.parent))
        try:
            from models.discrimination_model import FeatureDiscriminationModel  # type: ignore[import]
            model = checkpoint
            meta = {}
        except ImportError:
            print(f"  SKIP {pkl_path.name}: cannot import FeatureDiscriminationModel")
            return

    backend = type(model).__module__.split(".")[0]
    print(f"  Detected backend: {backend}  model type: {type(model).__name__}")

    if backend == "xgboost" or hasattr(model, "save_model"):
        out_path = pkl_path.with_suffix(".json")
        model.save_model(str(out_path))
        print(f"  Saved XGBoost JSON → {out_path.name}")

        # Persist metadata alongside the model
        if meta:
            import json
            meta_path = pkl_path.with_name(pkl_path.stem + "_meta.json")
            with open(meta_path, "w") as mf:
                json.dump({k: str(v) if not isinstance(v, (int, float, str, bool)) else v
                           for k, v in meta.items()}, mf, indent=2)
            print(f"  Saved metadata → {meta_path.name}")

    elif backend == "lightgbm" or hasattr(model, "booster_"):
        out_path = pkl_path.with_suffix(".txt")
        model.booster_.save_model(str(out_path))
        print(f"  Saved LightGBM text → {out_path.name}")

    else:
        print(f"  SKIP {pkl_path.name}: unknown backend '{backend}', cannot convert")
        return

    print(f"  Done. Original .pkl kept for reference.")


def main() -> None:
    any_found = False
    for pkl_path in TARGETS:
        if not pkl_path.exists():
            print(f"Not found, skipping: {pkl_path}")
            continue
        any_found = True
        try:
            migrate_one(pkl_path)
        except Exception as exc:
            print(f"  ERROR converting {pkl_path.name}: {exc}")

    if not any_found:
        print("No checkpoint files found in", CHECKPOINTS)
        sys.exit(1)

    print("\nMigration complete.")
    print("Verify the .json/.txt files load correctly, then you can optionally")
    print("remove the .pkl files to avoid pickle compatibility issues in future.")


if __name__ == "__main__":
    main()
