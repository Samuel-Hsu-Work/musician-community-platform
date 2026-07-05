"""Minimal worker script for local testing. Requires python-worker/.env."""

import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("API_URL", "http://localhost:3001")
CRON_SECRET = os.getenv("CRON_SECRET")


def require_cron_secret() -> str:
    if not CRON_SECRET:
        print(
            "CRON_SECRET is required. Copy .env.example to .env and set a shared secret.",
            file=sys.stderr,
        )
        sys.exit(1)
    return CRON_SECRET


def generate_topic() -> None:
    secret = require_cron_secret()
    try:
        response = requests.post(
            f"{API_URL}/api/cron/generate-topic",
            headers={"x-cron-secret": secret},
            timeout=30,
        )
        if response.status_code == 200:
            print("Topic generation response:", response.json())
        else:
            print(f"Topic generation failed: {response.status_code} - {response.text}")
    except requests.exceptions.Timeout:
        print("Request timeout")
    except requests.exceptions.ConnectionError:
        print(f"Cannot connect to backend: {API_URL}")
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    generate_topic()
