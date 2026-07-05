# python-worker/worker.py
import schedule
import requests
import time
import os
from datetime import datetime, timezone
import sentry_sdk
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Sentry
sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    environment=os.getenv('NODE_ENV', 'production'),
    traces_sample_rate=1.0,  # 100% trace all transactions (production can reduce to 0.1-0.2)
    profiles_sample_rate=1.0,  # Performance profiling sample rate
)

# Get configuration from environment variables
API_URL = os.getenv('API_URL', 'http://localhost:3001')
CRON_SECRET = os.getenv('CRON_SECRET')

if not CRON_SECRET:
    raise SystemExit(
        'CRON_SECRET is required. Copy python-worker/.env.example to .env '
        'and set the same value as backend CRON_SECRET.'
    )

_last_daily_run_utc_date = None


def generate_topic():
    """Call backend API to generate a topic"""
    # Create Sentry transaction tracking
    with sentry_sdk.start_transaction(op="cron_job", name="generate_topic"):
        try:
            print(f"🕐 {datetime.now(timezone.utc).isoformat()} - Starting topic generation...")

            # Add breadcrumb logging
            sentry_sdk.add_breadcrumb(
                category='worker',
                message='Starting topic generation',
                level='info',
            )

            # Call backend API
            response = requests.post(
                f'{API_URL}/api/cron/generate-topic',
                headers={
                    'x-cron-secret': CRON_SECRET,
                    'Content-Type': 'application/json'
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                skipped = result.get('data', {}).get('skipped')
                if skipped:
                    print(f"ℹ️ Daily topic already exists for today (UTC): {result}")
                else:
                    print(f"✅ Topic generated successfully: {result}")

                # Log success breadcrumb
                sentry_sdk.add_breadcrumb(
                    category='worker',
                    message='Topic generation completed',
                    level='info',
                    data=result
                )
            else:
                print(f"❌ Generation failed: {response.status_code} - {response.text}")

                # Capture non-200 status codes as errors
                sentry_sdk.capture_message(
                    f"Topic generation failed with status {response.status_code}",
                    level='error',
                    extras={
                        'status_code': response.status_code,
                        'response_text': response.text,
                        'api_url': API_URL
                    }
                )

        except requests.exceptions.Timeout as e:
            print(f"❌ Request timeout: {str(e)}")
            sentry_sdk.capture_exception(e)

        except requests.exceptions.ConnectionError as e:
            print(f"❌ Cannot connect to backend: {API_URL}")
            sentry_sdk.capture_exception(e)

        except requests.exceptions.RequestException as e:
            print(f"❌ Request error: {str(e)}")
            sentry_sdk.capture_exception(e)

        except Exception as e:
            print(f"❌ Unexpected error occurred: {str(e)}")
            sentry_sdk.capture_exception(e)


def run_daily_topic_if_due():
    """Generate at most one daily topic per UTC calendar day (00:00 UTC)."""
    global _last_daily_run_utc_date

    now = datetime.now(timezone.utc)
    date_key = now.strftime('%Y-%m-%d')

    if now.hour != 0 or now.minute != 0:
        return

    if _last_daily_run_utc_date == date_key:
        return

    _last_daily_run_utc_date = date_key
    generate_topic()


def health_check():
    """Health check"""
    try:
        print(f"💓 Worker running - {datetime.now(timezone.utc).isoformat()}")

        # Add breadcrumb
        sentry_sdk.add_breadcrumb(
            category='health_check',
            message='Health check executed',
            level='info',
        )

    except Exception as e:
        print(f"❌ Health check failed: {str(e)}")
        sentry_sdk.capture_exception(e)


# Check every minute for the UTC midnight window
schedule.every(1).minutes.do(run_daily_topic_if_due)

# Health check every hour
schedule.every().hour.do(health_check)

if __name__ == "__main__":
    try:
        print("🚀 Python Worker started successfully!")
        print(f"📍 Target API: {API_URL}")
        print("⏰ Schedule: Generate topic daily at 00:00 UTC")
        print(f"🔍 Sentry monitoring: {'Enabled' if os.getenv('SENTRY_DSN') else 'Disabled'}")

        # Send startup event to Sentry
        sentry_sdk.capture_message(
            "Python Worker started successfully",
            level='info',
            extras={
                'api_url': API_URL,
                'schedule': 'Daily at 00:00 UTC'
            }
        )

        # Catch-up on startup if today's UTC topic is missing (backend is idempotent)
        generate_topic()

        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

    except KeyboardInterrupt:
        print("\n👋 Worker shutting down normally")
        sentry_sdk.capture_message("Worker shutdown", level='info')

    except Exception as e:
        print(f"❌ Worker encountered a critical error: {str(e)}")
        sentry_sdk.capture_exception(e)
        raise
    finally:
        # Ensure Sentry sends all events
        sentry_sdk.flush(timeout=2)
