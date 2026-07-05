# Step-by-Step Guide: Building the Log Analyzer Script

This guide explains how to build the log analyzer from scratch.

## Understanding What the Script Does

The log analyzer script:
1. Reads a JSON log file (one JSON object per line)
2. Analyzes errors (counts, types, locations)
3. Analyzes performance (finds slow requests)
4. Generates statistics and recommendations
5. Exports a report (optional)

---

## Step 1: Import Required Libraries

```python
import json          # For parsing JSON log entries
import argparse      # For command line arguments (--file)
from collections import Counter, defaultdict  # For counting
import statistics    # For calculating averages, percentiles
```

**Why each library:**
- `json`: Parse JSON log entries
- `argparse`: Handle command line arguments (`--file logs.json`)
- `Counter`: Count occurrences (error messages, endpoints)
- `defaultdict`: Group data by keys (endpoints → response times)
- `statistics`: Calculate averages, percentiles (P95)

---

## Step 2: Load Logs from File

```python
def load_logs(log_file):
    logs = []
    
    with open(log_file, 'r') as f:
        for line in f:
            log = json.loads(line.strip())
            logs.append(log)
    
    return logs
```

**How it works:**
1. Opens the log file
2. Reads line by line (important for large files)
3. Parses each line as JSON
4. Collects all logs into a list

**Log format (one JSON object per line):**
```json
{"timestamp":"2024-01-11T12:00:00Z","level":"error","message":"Failed","path":"/api/users","duration_ms":2500}
{"timestamp":"2024-01-11T12:00:01Z","level":"info","message":"Success","path":"/api/forum/topics","duration_ms":150}
```

---

## Step 3: Analyze Errors

```python
def analyze_errors(logs):
    errors = []
    error_messages = Counter()
    
    for log in logs:
        if log.get('level') == 'error':
            errors.append(log)
            error_messages[log.get('message')] += 1
    
    print(f"Total errors: {len(errors)}")
    print("Top errors:")
    for msg, count in error_messages.most_common(5):
        print(f"  {count}x - {msg}")
```

**What it does:**
1. Loops through all logs
2. Finds logs with `level="error"`
3. Counts how many times each error message appears
4. Shows the top 5 most common errors

**Key concept: Counter**
- `Counter` automatically counts occurrences
- `.most_common(5)` gets the top 5 most frequent

---

## Step 4: Analyze Performance (Slow Requests)

```python
def analyze_performance(logs):
    slow_requests = []
    
    for log in logs:
        if log.get('type') == 'api_request':
            duration = log.get('duration_ms', 0)
            
            if duration > 1000:  # Slower than 1 second
                slow_requests.append({
                    'path': log.get('path'),
                    'duration': duration
                })
    
    # Sort by duration (slowest first)
    sorted_slow = sorted(slow_requests, key=lambda x: x['duration'], reverse=True)
    
    print("Top 5 slowest requests:")
    for req in sorted_slow[:5]:
        print(f"  {req['duration']}ms - {req['path']}")
```

**What it does:**
1. Looks for API request logs (`type="api_request"`)
2. Checks `duration_ms` (response time in milliseconds)
3. Finds requests slower than 1000ms (1 second)
4. Sorts by duration (slowest first)
5. Shows top 5 slowest requests

**Key concept: Filtering and Sorting**
- Filter: Only look at API requests with `duration_ms > 1000`
- Sort: Order by duration (highest first)
- Slice: Take only first 5 with `[:5]`

---

## Step 5: Calculate Statistics (Advanced)

```python
from collections import defaultdict
import statistics

def analyze_endpoints(logs):
    endpoint_times = defaultdict(list)  # endpoint → [times]
    
    for log in logs:
        if log.get('type') == 'api_request':
            path = log.get('path')
            duration = log.get('duration_ms', 0)
            endpoint_times[path].append(duration)
    
    # Calculate averages
    for path, times in endpoint_times.items():
        avg = statistics.mean(times)
        print(f"{path}: {avg:.0f}ms average")
```

**What it does:**
1. Groups response times by endpoint
2. Calculates average response time per endpoint
3. Shows which endpoints are slowest on average

**Key concept: defaultdict**
- `defaultdict(list)` automatically creates empty list for new keys
- Groups data: `endpoint_times['/api/users'] = [100, 200, 150]`

---

## Step 6: Command Line Arguments

```python
import argparse

def main():
    parser = argparse.ArgumentParser(description='Analyze log files')
    parser.add_argument('--file', required=True, help='Log file path')
    args = parser.parse_args()
    
    logs = load_logs(args.file)
    analyze_errors(logs)
    analyze_performance(logs)
```

**How it works:**
- `argparse` handles command line: `python script.py --file logs.json`
- `args.file` contains the file path
- Makes the script usable from command line

---

## Complete Simple Version (Core Only)

```python
import json
import argparse

def analyze_logs(log_file):
    # Load logs
    logs = []
    with open(log_file, 'r') as f:
        for line in f:
            logs.append(json.loads(line.strip()))
    
    # Find errors
    errors = [log for log in logs if log.get('level') == 'error']
    
    # Find slow requests
    slow = [log for log in logs 
            if log.get('type') == 'api_request' 
            and log.get('duration_ms', 0) > 1000]
    
    # Print results
    print(f"Errors: {len(errors)}")
    print(f"Slow requests: {len(slow)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', required=True)
    args = parser.parse_args()
    analyze_logs(args.file)
```

That's the core - about 20 lines!

---

## Core vs Optional Features

### CORE (~50-80 lines)
- Load logs from file
- Count errors
- Find slow requests
- Print basic statistics

### OPTIONAL (~300+ lines)
- Detailed error analysis (error types, endpoints)
- Performance statistics (averages, P95, percentiles)
- Database operation analysis
- User activity analysis
- Recommendations generation
- Report export (JSON)
- Advanced statistics (quantiles, success rates)

---

## Key Concepts Explained

### 1. JSON Log Format
- One JSON object per line (NDJSON format)
- Each log is a dictionary with keys like `level`, `message`, `duration_ms`
- Easy to parse line-by-line

### 2. Filtering
```python
errors = [log for log in logs if log.get('level') == 'error']
```
- List comprehension: create new list with filtered items
- Only keep logs where condition is true

### 3. Counting
```python
from collections import Counter
counts = Counter([1, 2, 2, 3, 3, 3])
# counts = {3: 3, 2: 2, 1: 1}
```
- `Counter` automatically counts occurrences
- `.most_common(5)` gets top 5

### 4. Grouping
```python
from collections import defaultdict
groups = defaultdict(list)
groups['endpoint1'].append(100)  # Auto-creates list
```
- Group data by key (e.g., endpoint → response times)
- Useful for calculating averages per group

### 5. Sorting
```python
sorted(items, key=lambda x: x['duration'], reverse=True)
```
- Sort by a specific field
- `reverse=True` for descending order

---

## Comparison: Simple vs Full Version

**Simple (`log_analyzer_simple.py`):**
- ✅ Basic error counting
- ✅ Find slow requests
- ✅ ~80 lines
- ✅ Easy to understand
- ❌ No advanced statistics
- ❌ No report export

**Full (`log_analyzer.py`):**
- ✅ All features from simple
- ✅ Advanced statistics (P95, percentiles)
- ✅ Database analysis
- ✅ User activity analysis
- ✅ Recommendations
- ✅ Report export
- ❌ ~400 lines
- ❌ More complex

---

## How to Use

### Test Locally:

1. **Create a test log file** (`test_logs.json`):
```json
{"level":"error","message":"Database timeout","path":"/api/users","duration_ms":5000}
{"level":"info","message":"Success","type":"api_request","path":"/api/forum/topics","duration_ms":150}
{"level":"error","message":"Invalid token","path":"/api/auth/login","duration_ms":200}
{"level":"info","type":"api_request","path":"/api/forum/topics","duration_ms":2500}
```

2. **Run the simple version**:
```bash
python3 log_analyzer_simple.py --file test_logs.json
```

3. **Run the explained version**:
```bash
python3 log_analyzer_explained.py --file test_logs.json
```

4. **Run the full version**:
```bash
python3 log_analyzer.py --file test_logs.json
```

---

## Next Steps

1. Read `log_analyzer_simple.py` - Clean, minimal version
2. Read `log_analyzer_explained.py` - Same code with detailed comments
3. Read `log_analyzer.py` - Full production version
4. Test with sample log files
5. Try modifying to add your own analysis features
