#!/usr/bin/env python3
"""
Log Analyzer - Explained Version with Step-by-Step Comments
============================================================
This script analyzes JSON log files to find errors and performance issues.

Step-by-Step Explanation:
1. Load logs from file (JSON format, one object per line)
2. Analyze errors (count, types, locations)
3. Analyze performance (slow requests, response times)
4. Generate statistics and recommendations
5. Export report (optional)
"""

import json
import argparse
from collections import Counter, defaultdict
import statistics
from datetime import datetime

# ============================================================================
# STEP 1: UNDERSTANDING THE LOG FORMAT
# ============================================================================
"""
Logs are in JSON format, one JSON object per line.
Example:
  {"timestamp":"2024-01-11T12:00:00Z","level":"error","message":"Failed","type":"api_request","path":"/api/users","duration_ms":2500}
  {"timestamp":"2024-01-11T12:00:01Z","level":"info","message":"Success","type":"api_request","path":"/api/forum/topics","duration_ms":150}

We need to:
1. Read each line
2. Parse JSON
3. Analyze the data
"""

# ============================================================================
# STEP 2: LOAD LOGS FROM FILE
# ============================================================================
def load_logs(log_file):
    """
    Load logs from file
    
    Args:
        log_file: Path to log file
        
    Returns:
        list: List of log entries (dictionaries)
    """
    logs = []
    
    print(f"📂 Loading: {log_file}")
    
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            # Read line by line (important for large files)
            for line in f:
                line = line.strip()  # Remove whitespace
                
                if not line:  # Skip empty lines
                    continue
                
                try:
                    # Parse JSON from this line
                    log = json.loads(line)
                    logs.append(log)
                except json.JSONDecodeError:
                    # Skip invalid JSON lines
                    continue
        
        print(f"✅ Loaded {len(logs)} log entries\n")
        return logs
        
    except FileNotFoundError:
        print(f"❌ File not found: {log_file}")
        return []

# ============================================================================
# STEP 3: ANALYZE ERRORS
# ============================================================================
def analyze_errors(logs):
    """
    Find and analyze error logs
    
    What we're looking for:
    - Logs with level="error"
    - Count how many errors
    - Find most common error messages
    - Find which endpoints have errors
    """
    print("🔍 Analyzing errors...")
    
    errors = []
    error_messages = Counter()  # Count occurrences of each error message
    error_endpoints = Counter()  # Count errors per endpoint
    
    # Go through each log
    for log in logs:
        level = log.get('level', '').lower()
        
        # Check if it's an error
        if level == 'error':
            errors.append(log)
            
            # Count error message
            message = log.get('message', 'Unknown error')
            error_messages[message] += 1
            
            # Count which endpoint has the error
            path = log.get('path', 'unknown')
            error_endpoints[path] += 1
    
    # Print results
    print(f"  Total errors: {len(errors)}")
    
    if error_messages:
        print("\n  Top 5 error messages:")
        for msg, count in error_messages.most_common(5):
            print(f"    {count:3d}x - {msg[:70]}")
    
    if error_endpoints:
        print("\n  Endpoints with errors:")
        for endpoint, count in error_endpoints.most_common(5):
            print(f"    {count:3d}x - {endpoint}")
    
    return errors

# ============================================================================
# STEP 4: ANALYZE PERFORMANCE (SLOW REQUESTS)
# ============================================================================
def analyze_performance(logs):
    """
    Find slow API requests
    
    What we're looking for:
    - API requests that took longer than 1 second (1000ms)
    - Which endpoints are slow
    - Average response times
    """
    print("\n⚡ Analyzing performance...")
    
    slow_requests = []  # Requests > 1 second
    endpoint_times = defaultdict(list)  # Store all response times per endpoint
    
    for log in logs:
        # Only look at API request logs
        if log.get('type') != 'api_request':
            continue
        
        duration = log.get('duration_ms', 0)
        path = log.get('path', 'unknown')
        
        # Store response time for this endpoint
        endpoint_times[path].append(duration)
        
        # Check if it's slow (> 1 second = 1000ms)
        if duration > 1000:
            slow_requests.append({
                'path': path,
                'duration': duration,
                'timestamp': log.get('timestamp')
            })
    
    # Print results
    print(f"  Slow requests (>1s): {len(slow_requests)}")
    
    if slow_requests:
        # Sort by duration (slowest first)
        sorted_slow = sorted(slow_requests, key=lambda x: x['duration'], reverse=True)
        
        print("\n  Top 5 slowest requests:")
        for req in sorted_slow[:5]:
            print(f"    {req['duration']:6.0f}ms - {req['path']}")
    
    # Calculate average response times per endpoint
    print("\n  Average response times:")
    endpoint_avgs = {}
    for path, times in endpoint_times.items():
        if times:
            avg = statistics.mean(times)
            endpoint_avgs[path] = avg
    
    # Sort by average time (slowest first)
    for path, avg in sorted(endpoint_avgs.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"    {path:30s} - {avg:.0f}ms avg")
    
    return slow_requests

# ============================================================================
# STEP 5: MAIN ANALYSIS FUNCTION
# ============================================================================
def run_analysis(log_file):
    """
    Run complete analysis workflow
    
    Steps:
    1. Load logs
    2. Analyze errors
    3. Analyze performance
    4. Print summary
    """
    # Load logs
    logs = load_logs(log_file)
    
    if not logs:
        return
    
    print("="*60)
    print("📊 LOG ANALYSIS REPORT")
    print("="*60)
    print()
    
    # Run analyses
    errors = analyze_errors(logs)
    slow_requests = analyze_performance(logs)
    
    # Summary
    print("\n" + "="*60)
    print("📋 SUMMARY")
    print("="*60)
    print(f"Total logs analyzed: {len(logs)}")
    print(f"Errors found: {len(errors)}")
    print(f"Slow requests found: {len(slow_requests)}")
    print("\n✅ Analysis complete!")

# ============================================================================
# STEP 6: COMMAND LINE INTERFACE
# ============================================================================
def main():
    """
    Main entry point - handles command line arguments
    """
    parser = argparse.ArgumentParser(
        description='Analyze log files',
        epilog='Example: python log_analyzer_explained.py --file logs.json'
    )
    
    parser.add_argument(
        '--file',
        required=True,
        help='Path to log file (JSON format, one object per line)'
    )
    
    args = parser.parse_args()
    
    # Run analysis
    run_analysis(args.file)

# ============================================================================
# ENTRY POINT
# ============================================================================
if __name__ == "__main__":
    main()
