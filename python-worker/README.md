# Python Worker

Python worker for MusicTalks that triggers one AI daily discussion topic per UTC calendar day (00:00 UTC).

## Setup

1. **Create and activate virtual environment** (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables**:
   Create a `.env` file in the python-worker directory (copy from `.env.example`):
   ```bash
   cp .env.example .env
   # Edit .env — CRON_SECRET must match backend's CRON_SECRET
   ```

3. **Run the worker**:
   ```bash
   # Make sure virtual environment is activated
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python worker.py
   ```

## Configuration

- **Topic Generation**: Once per UTC day at 00:00 UTC (backend skips if topic already exists)
- **Health Check**: Runs every hour
- **API Endpoint**: `POST /api/cron/generate-topic`
- **Authentication**: Uses `x-cron-secret` header

## Environment Variables

- `API_URL`: Backend API URL (default: `http://localhost:3001`)
- `CRON_SECRET`: Secret key for authenticating with the backend API
- `SENTRY_DSN`: Optional Sentry DSN for error tracking
- `NODE_ENV`: Environment name (default: `production`)

## Deployment

This worker can be deployed separately from your backend, for example:
- As a separate service on Render
- On a VPS or cloud instance
- Using a process manager like PM2 or Supervisor

Make sure the worker can reach your backend API URL and has the correct `CRON_SECRET` configured.
