import argparse
import json
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Minimal smoke test for the local AI processing service."
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="AI service base URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--image-url",
        help="Public image URL to send to /analyze. If omitted, only /health is checked.",
    )
    parser.add_argument(
        "--category",
        default="sneaker",
        help="Category to send with --image-url (default: sneaker)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=15.0,
        help="Request timeout in seconds for each call (default: 15)",
    )
    return parser.parse_args()


def print_response(title: str, response: httpx.Response) -> None:
    print(f"{title}: HTTP {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except ValueError:
        print(response.text)


def main() -> int:
    load_dotenv(dotenv_path=Path(__file__).with_name(".env"))
    args = parse_args()

    try:
        with httpx.Client(base_url=args.base_url, timeout=args.timeout) as client:
            health_response = client.get("/health")
            print_response("GET /health", health_response)

            if not health_response.is_success:
                return 1

            if not args.image_url:
                return 0

            analyze_response = client.post(
                "/analyze",
                json={
                    "image_url": args.image_url,
                    "category": args.category,
                },
            )
            print_response("POST /analyze", analyze_response)
            return 0 if analyze_response.is_success else 1
    except httpx.HTTPError as exc:
        print(f"Smoke test failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
