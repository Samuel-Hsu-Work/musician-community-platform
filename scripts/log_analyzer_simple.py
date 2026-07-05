#!/usr/bin/env python3
"""
Log Analyzer - Simple Clean Version
====================================
Analyzes JSON log files to find errors and slow requests.

Core functionality:
1. Load log file (JSON format, one line per log)
2. Count errors
3. Find slow requests (>1 second)
4. Show statistics

Usage: python log_analyzer_simple.py --file logs.json
"""

import json
import argparse

# ============================================================================
# CONFIGURATION
# ============================================================================
SLOW_THRESHOLD_MS = 1000  # Requests slower than 1 second are considered "slow"

# ============================================================================
# MAIN FUNCTION - Analyze Logs
# ============================================================================
def analyze_logs(log_file):
    """
    Analyze log file and print results
    
    Steps:
    1. Load logs from file
    2. Count errors
    3. Find slow requests
    4. Print summary
    """
    print(f"📂 Loading: {log_file}\n")
    
    logs = []
    errors = []
    slow_requests = []
    
    # Step 1: Load logs
    try:
        with open(log_file, 'r') as f:
            for line in f:
                try:
                    log = json.loads(line.strip())
                    logs.append(log)
                except:
                    continue  # Skip invalid lines
    except FileNotFoundError:
        print(f"❌ File not found: {log_file}")
        return
    
    print(f"✅ Loaded {len(logs)} log entries\n")
    
    # Step 2: Find errors
    for log in logs:
        level = log.get('level', '').lower()
        if level == 'error':
            errors.append(log)
    
    # Step 3: Find slow requests
    for log in logs:
        if log.get('type') == 'api_request':
            duration = log.get('duration_ms', 0)
            if duration > SLOW_THRESHOLD_MS:
                slow_requests.append({
                    'path': log.get('path', 'unknown'),
                    'duration': duration
                })
    
    # Step 4: Print results
    print("="*50)
    print("📊 ANALYSIS RESULTS")
    print("="*50)
    
    print(f"\n🔍 Errors: {len(errors)}")
    if errors:
        print("  Top errors found (showing first 5)")
        error_messages = {}
        for error in errors[:5]:
            msg = error.get('message', 'Unknown error')
            error_messages[msg] = error_messages.get(msg, 0) + 1
        for msg, count in list(error_messages.items())[:5]:
            print(f"    {count}x - {msg[:60]}")
    
    print(f"\n⚡ Slow Requests (>1s): {len(slow_requests)}")
    if slow_requests:
        print("  Top 5 slowest:")
        sorted_slow = sorted(slow_requests, key=lambda x: x['duration'], reverse=True)[:5]
        for req in sorted_slow:
            print(f"    {req['duration']:.0f}ms - {req['path']}")
    
    print("\n✅ Analysis complete!")

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Analyze log files')
    parser.add_argument('--file', required=True, help='Log file path')
    args = parser.parse_args()
    
    analyze_logs(args.file)
