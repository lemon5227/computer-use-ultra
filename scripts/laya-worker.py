#!/usr/bin/env python3
"""Persistent JSONL bridge for the local Laya decision engine."""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any


def fake_response(request: dict[str, Any]) -> dict[str, Any]:
    criteria = request.get("questions", {}).get("action", {}).get("criteria", {})
    choice = "DONE" if "DONE" in criteria else next(iter(criteria), "BLOCKED")
    probabilities = {key: 1.0 if key == choice else 0.0 for key in criteria}
    return {
        "answers": {
            "action": {
                "type": "choice",
                "choice": choice,
                "probabilities": probabilities,
                "confidence": 1.0,
            }
        }
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fake", action="store_true")
    parser.add_argument("--model", default=None)
    args = parser.parse_args()

    router = None
    if not args.fake:
        try:
            from laya import Router

            router = Router(max_loaded=1)
        except Exception as error:  # pragma: no cover - exercised by CLI smoke tests
            print(f"Laya initialization failed: {error}", file=sys.stderr, flush=True)
            return 1

    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            request = json.loads(line)
            if args.fake:
                response = fake_response(request)
            else:
                predict_kwargs = {"model": args.model} if args.model else {}
                response = router.predict(request["state"], request["questions"], **predict_kwargs)
            print(json.dumps(response, ensure_ascii=False, separators=(",", ":")), flush=True)
        except Exception as error:
            print(json.dumps({"error": str(error)}, ensure_ascii=False, separators=(",", ":")), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
