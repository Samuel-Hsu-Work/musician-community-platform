# Log Analyzer Script

Python script for analyzing structured JSON logs exported from Better Stack (Logtail).

## Purpose

Analyzes log files to identify:
- Error patterns and frequency
- Performance bottlenecks (slow requests)
- API endpoint statistics (P95 latency, success rates)
- Database operation performance
- User activity patterns
- Optimization recommendations

## Requirements

- Python 3.8+
- No external dependencies (uses Python standard library only)

## Usage

### 1. Export logs from Better Stack

1. Go to Better Stack dashboard → Logtail → Your Source → Logs
2. Apply filters (date range, log level, etc.)
3. Export logs as JSON format (one JSON object per line)
4. Save the file (e.g., `logs_export.json`)

### 2. Run the analyzer

```bash
# From the scripts directory
python3 log_analyzer.py --file logs_export.json

# Or with full path
python3 log_analyzer.py --file /path/to/logs_export.json
```

### 3. Review output

The script will:
- Display analysis results in the terminal
- Generate a JSON report file: `log_analysis_report_YYYYMMDD_HHMMSS.json`

## Output

The script analyzes and reports:

1. **Error Analysis**
   - Total error count
   - Most common errors
   - Endpoints with most errors

2. **Performance Analysis**
   - Slow requests (>1 second)
   - Slowest requests by duration

3. **API Statistics**
   - Request count per endpoint
   - Average response time
   - P95 latency (95th percentile)
   - Success rate

4. **Database Operations**
   - Operation frequency
   - Average duration
   - Failure rates

5. **User Activity**
   - Active user count
   - Authentication failures
   - Most active users

6. **Recommendations**
   - Actionable optimization suggestions
   - Based on detected patterns

## Example Output

```
📂 Loading log file: logs_export.json
✅ Loaded 1523 log entries

============================================================
📊 Log Analysis Report
============================================================

🔍 Analyzing errors...
Total errors: 23

Top 5 most common errors:
   12x - Database timeout
    8x - Invalid token format
    3x - Topic not found

⚡ Analyzing performance...
Slow requests (>1s): 45

Top 5 slowest requests:
   2450ms - /api/forum/topic
   1850ms - /api/auth/register

📊 API endpoint statistics...
Most accessed endpoints:
  156x - /api/forum/topic
          Avg: 320ms | P95: 850ms | Success rate: 98.7%

💡 Optimization recommendations:
1. Found 45 slow requests, suggest optimizing database queries or adding cache
2. Endpoint /api/forum/topic has average response time 320ms, suggest optimization

📁 Analysis report exported: log_analysis_report_20260111_193000.json
```

## Workflow

1. **Weekly/Monthly**: Export logs from Better Stack
2. **Analyze**: Run the script on exported logs
3. **Review**: Check errors, slow requests, patterns
4. **Action**: Fix issues, optimize slow endpoints
5. **Document**: Save insights for future reference

## Log Format

The script expects JSON logs in the following format (one JSON object per line):

```json
{"timestamp":"2024-01-11T12:00:00.000Z","level":"info","message":"API Request","type":"api_request","method":"GET","path":"/api/forum/topic","duration_ms":1250,"status_code":200,"user_id":"user_123"}
{"timestamp":"2024-01-11T12:00:01.000Z","level":"error","message":"Database timeout","type":"database","operation":"findMany","model":"Topic","duration_ms":5000,"success":false}
```

This matches the structured JSON logging format from Better Stack/Logtail.

## Notes

- The script is **offline** - it analyzes exported log files, not live data
- Compatible with Better Stack exported logs
- Works with any structured JSON logs in the same format
- No connection to Better Stack API required
