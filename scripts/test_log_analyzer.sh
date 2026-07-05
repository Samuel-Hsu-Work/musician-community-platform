#!/bin/bash

# 日誌分析器測試腳本
# 用途：快速測試腳本功能是否正常

echo "🧪 日誌分析器測試腳本"
echo "======================================"

# 檢查 Python 版本
echo ""
echo "1️⃣ 檢查 Python 版本..."
python_version=$(python3 --version 2>&1)
echo "✅ $python_version"

if ! command -v python3 &> /dev/null; then
    echo "❌ 錯誤：找不到 Python 3"
    exit 1
fi

# 檢查必要文件
echo ""
echo "2️⃣ 檢查必要文件..."

if [ ! -f "log_analyzer.py" ]; then
    echo "❌ 錯誤：找不到 log_analyzer.py"
    exit 1
fi
echo "✅ log_analyzer.py 存在"

if [ ! -f "test_logs.json" ]; then
    echo "⚠️  警告：找不到 test_logs.json，將創建測試文件"
    
    # 創建測試日誌
    cat > test_logs.json << 'EOF'
{"timestamp":"2024-10-07T12:00:00.000Z","level":"info","message":"API Request","type":"api_request","method":"GET","path":"/api/forum/topic","duration_ms":1250,"status_code":200,"user_id":"user_123"}
{"timestamp":"2024-10-07T12:00:01.000Z","level":"error","message":"Database timeout","type":"database","operation":"find","collection":"ForumPost","duration_ms":5000,"success":false}
{"timestamp":"2024-10-07T12:00:02.000Z","level":"info","message":"API Request","type":"api_request","method":"POST","path":"/api/forum/comments","duration_ms":320,"status_code":201,"user_id":"user_456"}
{"timestamp":"2024-10-07T12:00:03.000Z","level":"info","message":"API Request","type":"api_request","method":"GET","path":"/api/forum/topic","duration_ms":2450,"status_code":200,"user_id":"user_789"}
{"timestamp":"2024-10-07T12:00:04.000Z","level":"error","message":"Topic not found","type":"api_request_error","path":"/api/forum/comments","status_code":404}
EOF
    echo "✅ 已創建 test_logs.json"
else
    echo "✅ test_logs.json 存在"
fi

# 運行分析
echo ""
echo "3️⃣ 運行日誌分析..."
echo "======================================"
python3 log_analyzer.py --file test_logs.json

# 檢查結果
echo ""
echo "4️⃣ 檢查輸出文件..."

report_file=$(ls -t log_analysis_report_*.json 2>/dev/null | head -1)

if [ -z "$report_file" ]; then
    echo "❌ 錯誤：未生成報告文件"
    exit 1
fi

echo "✅ 找到報告文件: $report_file"

# 驗證 JSON 格式
if python3 -c "import json; json.load(open('$report_file'))" 2>/dev/null; then
    echo "✅ 報告文件 JSON 格式正確"
else
    echo "❌ 錯誤：報告文件 JSON 格式錯誤"
    exit 1
fi

# 顯示報告摘要
echo ""
echo "5️⃣ 報告摘要..."
python3 << EOF
import json
with open('$report_file', 'r') as f:
    report = json.load(f)
    print(f"📊 總日誌數: {report['total_logs']}")
    print(f"❌ 錯誤數: {report['total_errors']}")
    print(f"🐌 慢請求數: {report['slow_requests']}")
    print(f"📈 API 端點數: {len(report['api_stats'])}")
EOF

# 測試完成
echo ""
echo "======================================"
echo "✅ 測試完成！所有功能正常運行"
echo ""
echo "你可以開始使用："
echo "  python3 log_analyzer.py --file your_logs.json"
echo ""