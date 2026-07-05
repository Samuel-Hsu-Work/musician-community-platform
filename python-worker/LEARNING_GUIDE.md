# Step-by-Step Guide: Building the Python Worker

This guide explains how to build the Python worker from scratch.

## Understanding What the Worker Does

The Python worker is a **scheduled task** that:
1. Runs continuously (24/7)
2. Calls your backend API every hour
3. Triggers the backend to generate a new forum topic
4. Handles errors gracefully

---

## Step 1: Import Required Libraries

```python
import schedule  # For scheduling (runs function every hour)
import requests  # For HTTP requests (calls backend API)
import time      # For waiting between checks
import os        # For reading environment variables
from datetime import datetime  # For timestamps
```

**Why each library:**
- `schedule`: Makes it easy to run functions on a schedule (every hour, day, etc.)
- `requests`: Simple way to make HTTP requests (like `fetch` in JavaScript)
- `time`: Lets us pause execution (`time.sleep(60)` waits 60 seconds)
- `os`: Access environment variables (configuration)
- `datetime`: Get current date/time for logging

---

## Step 2: Configure the Worker

```python
API_URL = os.getenv('API_URL', 'http://localhost:3001')
CRON_SECRET = os.getenv('CRON_SECRET', 'your-secret-key')
```

**What this does:**
- Reads environment variables
- `API_URL`: Where your backend is (local or production)
- `CRON_SECRET`: Secret key for authentication (must match backend)

**Environment Variables:**
- Set in `.env` file (local development)
- Set in Render dashboard (production deployment)

---

## Step 3: Create the Main Function

```python
def generate_topic():
    """Call backend API to generate a topic"""
    try:
        print(f"🕐 {datetime.now()} - Generating topic...")
        
        # Make POST request
        response = requests.post(
            f'{API_URL}/api/cron/generate-topic',
            headers={
                'x-cron-secret': CRON_SECRET,
                'Content-Type': 'application/json'
            },
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Success!")
        else:
            print(f"❌ Failed: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to backend")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
```

**How it works:**
1. Makes HTTP POST request to `/api/cron/generate-topic`
2. Includes authentication header (`x-cron-secret`)
3. Waits up to 30 seconds for response
4. Checks if successful (HTTP 200)
5. Handles errors (connection errors, timeouts, etc.)

---

## Step 4: Schedule the Function

```python
schedule.every().hour.do(generate_topic)
```

**What this does:**
- Schedules `generate_topic()` to run every hour
- Other options:
  - `schedule.every(10).minutes.do(func)` - Every 10 minutes
  - `schedule.every().day.do(func)` - Every day
  - `schedule.every().monday.do(func)` - Every Monday

---

## Step 5: Create the Main Loop

```python
if __name__ == "__main__":
    print("🚀 Worker started!")
    
    # Run immediately (don't wait 1 hour)
    generate_topic()
    
    # Keep checking every 60 seconds
    while True:
        schedule.run_pending()  # Run any scheduled tasks that are due
        time.sleep(60)          # Wait 60 seconds before checking again
```

**How it works:**
1. `if __name__ == "__main__"`: Only runs when you execute the file directly
2. `generate_topic()`: Runs immediately on startup
3. `while True`: Infinite loop (runs forever)
4. `schedule.run_pending()`: Checks if it's time to run scheduled tasks
5. `time.sleep(60)`: Waits 60 seconds before checking again

**Why 60 seconds?**
- We check every minute if it's time to run
- More efficient than checking every second
- Still accurate enough for hourly scheduling

---

## Complete Flow Diagram

```
Start Worker
    ↓
Read Configuration (API_URL, CRON_SECRET)
    ↓
Run generate_topic() immediately
    ↓
[LOOP FOREVER]
    ↓
Check if it's time to run generate_topic() (every hour)
    ↓
If yes → Call backend API → Generate topic
    ↓
Wait 60 seconds
    ↓
Repeat loop
```

---

## How to Test Locally

1. **Install dependencies:**
   ```bash
   cd python-worker
   pip install -r requirements.txt
   ```

2. **Create `.env` file:**
   ```env
   API_URL=http://localhost:3001
   CRON_SECRET=change-me-cron-secret
   ```

3. **Make sure backend is running:**
   ```bash
   cd ../backend
   npm run dev
   ```

4. **Run worker:**
   ```bash
   cd python-worker
   python worker_simple.py
   ```

5. **What you'll see:**
   ```
   🚀 Worker started!
   📍 API: http://localhost:3001
   ⏰ Schedule: Every hour
   
   🕐 2026-01-12 10:00:00 - Generating topic...
   ✅ Success! Topic: Music Theory Discussion
   ```

6. **Stop worker:**
   - Press `Ctrl+C`

---

## Key Concepts Explained

### 1. Environment Variables
- Store configuration (API URL, secrets)
- Different values for local vs production
- Keep secrets out of code

### 2. HTTP Requests
- `requests.post()` sends POST request
- `headers` include authentication
- `timeout=30` prevents hanging forever

### 3. Scheduling
- `schedule` library makes it easy
- Runs function at specified intervals
- More user-friendly than cron

### 4. Error Handling
- `try/except` catches errors
- Prevents worker from crashing
- Logs errors for debugging

---

## Comparison: Simple vs Full Version

**Simple (`worker_simple.py`):**
- ✅ Minimal code
- ✅ Easy to understand
- ✅ No optional dependencies
- ❌ No error tracking (Sentry)

**Full (`worker.py`):**
- ✅ Error tracking with Sentry
- ✅ More detailed logging
- ✅ Health checks
- ❌ More complex
- ❌ Requires Sentry SDK

**Recommended:** Start with `worker_simple.py` to understand, then use `worker.py` for production.

---

## Next Steps

1. Read `worker_simple.py` - Clean, minimal version
2. Read `worker_explained.py` - Same code with detailed comments
3. Read `worker.py` - Full production version with Sentry
4. Test locally with your backend
5. Deploy to Render as Background Worker
