#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Log Analysis Script - Complete Version
Purpose: Analyze log files to identify error patterns and performance bottlenecks
Usage: python scripts/log_analyzer.py --file logs.json

Features:
1. Error Analysis: Count error types and frequency
2. Performance Analysis: Identify slow requests, calculate response times
3. API Statistics: Calculate averages, P95, success rates
4. Database Analysis: Track operation duration and failure rates
5. Generate Recommendations: Provide optimization suggestions based on data
6. Export Report: Save analysis as JSON file
"""

import json
import argparse
from collections import defaultdict, Counter
from datetime import datetime
import statistics


class LogAnalyzer:
    """Log Analyzer Class"""
    
    def __init__(self, log_file):
        """
        Initialize analyzer
        
        Args:
            log_file: Path to log file
        """
        self.log_file = log_file
        self.logs = []           # Store all logs
        self.errors = []         # Store error logs
        self.slow_requests = []  # Store slow requests (>1 second)
        
        # Store statistics for each API endpoint
        self.api_stats = defaultdict(lambda: {
            'count': 0,                # Request count
            'durations': [],           # All response times
            'status_codes': Counter()  # Status code distribution
        })
    
    def load_logs(self):
        """
        Load log file
        
        Returns:
            bool: True if successful, False if failed
        """
        print(f"📂 Loading log file: {self.log_file}")
        
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                # Read line by line to avoid high memory usage for large files
                for line in f:
                    try:
                        # Strip whitespace and parse JSON
                        log = json.loads(line.strip())
                        self.logs.append(log)
                    except json.JSONDecodeError:
                        # Skip invalid lines
                        continue
            
            print(f"✅ Loaded {len(self.logs)} log entries\n")
            return True
            
        except FileNotFoundError:
            print(f"❌ File not found: {self.log_file}")
            return False
    
    def analyze_errors(self):
        """
        Analyze error logs
        
        Statistics:
        1. Total error count
        2. Most common error types
        3. API endpoints with most errors
        """
        print("🔍 Analyzing errors...")
        
        error_types = Counter()      # Error message → count
        error_endpoints = Counter()  # API endpoint → error count
        
        for log in self.logs:
            level = log.get('level', '').lower()
            log_type = log.get('type', '')
            
            # Identify error logs
            if level == 'error' or log_type == 'api_request_error':
                self.errors.append(log)
                
                # Count error messages
                error_msg = log.get('message', '')
                error_types[error_msg] += 1
                
                # Count error endpoints
                path = log.get('path', 'unknown')
                error_endpoints[path] += 1
        
        print(f"Total errors: {len(self.errors)}")
        
        # Display top 5 most common errors
        if error_types:
            print("\nTop 5 most common errors:")
            for error, count in error_types.most_common(5):
                # Only show first 80 characters
                print(f"  {count:3d}x - {error[:80]}")
        
        # Display endpoints with most errors
        if error_endpoints:
            print("\nEndpoints with most errors:")
            for endpoint, count in error_endpoints.most_common(5):
                print(f"  {count:3d}x - {endpoint}")
    
    def analyze_performance(self):
        """
        Analyze performance issues
        
        Statistics:
        1. Slow request count (>1 second)
        2. Slowest requests
        3. Performance data for each endpoint
        """
        print("\n⚡ Analyzing performance...")
        
        for log in self.logs:
            # Only analyze API requests
            if log.get('type') == 'api_request':
                path = log.get('path', 'unknown')
                duration = log.get('duration_ms', 0)
                status = log.get('status_code', 0)
                
                # Collect statistics
                self.api_stats[path]['count'] += 1
                self.api_stats[path]['durations'].append(duration)
                self.api_stats[path]['status_codes'][status] += 1
                
                # Identify slow requests (> 1 second)
                if duration > 1000:
                    self.slow_requests.append({
                        'path': path,
                        'duration': duration,
                        'timestamp': log.get('timestamp')
                    })
        
        print(f"Slow requests (>1s): {len(self.slow_requests)}")
        
        # Display slowest requests
        if self.slow_requests:
            print("\nTop 5 slowest requests:")
            sorted_slow = sorted(
                self.slow_requests,
                key=lambda x: x['duration'],
                reverse=True
            )[:5]
            
            for req in sorted_slow:
                print(f"  {req['duration']:6.0f}ms - {req['path']}")
    
    def analyze_api_endpoints(self):
        """
        Analyze API endpoint statistics
        
        Calculates:
        1. Average response time
        2. P95 latency (95th percentile response time)
        3. Success rate
        """
        print("\n📊 API endpoint statistics...")
        
        endpoint_summary = []
        
        for path, stats in self.api_stats.items():
            if stats['durations']:
                # Calculate average response time
                avg_duration = statistics.mean(stats['durations'])
                
                # Calculate P95 (95th percentile)
                # 95% of requests have response time less than this value
                p95_duration = statistics.quantiles(
                    stats['durations'], 
                    n=20  # Divide into 20 parts
                )[18]  # 19th division point = 95%
                
                # Calculate success rate (2xx status codes)
                success_count = sum(
                    count 
                    for status, count in stats['status_codes'].items()
                    if 200 <= status < 300
                )
                success_rate = success_count / stats['count'] * 100
                
                endpoint_summary.append({
                    'path': path,
                    'count': stats['count'],
                    'avg_ms': avg_duration,
                    'p95_ms': p95_duration,
                    'success_rate': success_rate
                })
        
        # Sort by request count (most accessed first)
        endpoint_summary.sort(key=lambda x: x['count'], reverse=True)
        
        print("\nMost accessed endpoints:")
        for ep in endpoint_summary[:10]:
            print(f"  {ep['count']:4d}x - {ep['path']}")
            print(f"          Avg: {ep['avg_ms']:.0f}ms | "
                  f"P95: {ep['p95_ms']:.0f}ms | "
                  f"Success rate: {ep['success_rate']:.1f}%")
    
    def analyze_database_operations(self):
        """
        Analyze database operations
        
        Statistics:
        1. Operation frequency
        2. Average duration
        3. Failure rate
        """
        print("\n💾 Database operation analysis...")
        
        db_ops = defaultdict(lambda: {
            'count': 0,
            'durations': [],
            'failures': 0
        })
        
        for log in self.logs:
            if log.get('type') == 'database':
                operation = log.get('operation', 'unknown')
                model = log.get('model', 'unknown')
                key = f"{model}.{operation}"
                
                db_ops[key]['count'] += 1
                db_ops[key]['durations'].append(log.get('duration_ms', 0))
                
                if not log.get('success', True):
                    db_ops[key]['failures'] += 1
        
        if db_ops:
            print("\nDatabase operation statistics:")
            for op, stats in sorted(
                db_ops.items(), 
                key=lambda x: x[1]['count'], 
                reverse=True
            )[:10]:
                avg_duration = statistics.mean(stats['durations'])
                failure_rate = (stats['failures'] / stats['count'] * 100)
                
                print(f"  {op:30s} - {stats['count']:4d}x | "
                      f"Avg: {avg_duration:.0f}ms | "
                      f"Failure rate: {failure_rate:.1f}%")
    
    def analyze_user_activity(self):
        """
        Analyze user activity
        
        Statistics:
        1. Active user count
        2. Authentication failure count
        3. Most active users
        """
        print("\n👥 User activity analysis...")
        
        user_actions = Counter()
        auth_failures = 0
        
        for log in self.logs:
            user_id = log.get('user_id')
            if user_id:
                user_actions[user_id] += 1
            
            if log.get('type') == 'security':
                auth_failures += 1
        
        print(f"Active users: {len(user_actions)}")
        print(f"Authentication failures: {auth_failures}")
        
        if user_actions:
            print("\nMost active users:")
            for user_id, count in user_actions.most_common(5):
                print(f"  User {user_id}: {count} actions")
    
    def generate_recommendations(self):
        """
        Generate optimization recommendations
        
        Based on analysis results, provide actionable optimization directions
        """
        print("\n💡 Optimization recommendations:")
        recommendations = []
        
        # Recommendation 1: Check slow requests
        if len(self.slow_requests) > 10:
            recommendations.append(
                f"Found {len(self.slow_requests)} slow requests, "
                "suggest optimizing database queries or adding cache"
            )
        
        # Recommendation 2: Check error rate
        if self.errors:
            error_rate = len(self.errors) / len(self.logs) * 100
            if error_rate > 5:
                recommendations.append(
                    f"High error rate ({error_rate:.1f}%), "
                    "suggest checking error logs and fixing issues"
                )
        
        # Recommendation 3: Check specific endpoint performance
        for path, stats in self.api_stats.items():
            if stats['durations']:
                avg = statistics.mean(stats['durations'])
                if avg > 500:
                    recommendations.append(
                        f"Endpoint {path} has average response time {avg:.0f}ms, suggest optimization"
                    )
        
        if recommendations:
            for i, rec in enumerate(recommendations, 1):
                print(f"{i}. {rec}")
        else:
            print("✅ System running well, no optimization recommendations")
    
    def export_report(self, output_file):
        """
        Export analysis report
        
        Args:
            output_file: Output file path
        """
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'total_logs': len(self.logs),
            'total_errors': len(self.errors),
            'slow_requests': len(self.slow_requests),
            'api_stats': {
                path: {
                    'count': stats['count'],
                    'avg_ms': (
                        statistics.mean(stats['durations']) 
                        if stats['durations'] else 0
                    ),
                    'status_codes': dict(stats['status_codes'])
                }
                for path, stats in self.api_stats.items()
            }
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n📁 Analysis report exported: {output_file}")
    
    def run_analysis(self):
        """
        Execute complete analysis workflow
        
        Calls all analysis methods in logical order
        """
        # Load logs
        if not self.load_logs():
            return
        
        print("="*60)
        print("📊 Log Analysis Report")
        print("="*60)
        
        # Execute all analyses
        self.analyze_errors()
        self.analyze_performance()
        self.analyze_api_endpoints()
        self.analyze_database_operations()
        self.analyze_user_activity()
        self.generate_recommendations()
        
        # Export report
        output_file = f"log_analysis_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        self.export_report(output_file)


def main():
    """
    Script entry point
    
    Handles command line arguments and executes analysis
    """
    parser = argparse.ArgumentParser(
        description='Log analysis tool - Analyze error patterns and performance issues',
        epilog='Example: python log_analyzer.py --file logs/app.log'
    )
    
    parser.add_argument(
        '--file',
        required=True,
        help='Log file path (JSON format, one JSON object per line)'
    )
    
    args = parser.parse_args()
    
    # Create analyzer and execute
    analyzer = LogAnalyzer(args.file)
    analyzer.run_analysis()


if __name__ == "__main__":
    main()
