#!/bin/bash

echo "🔍 Monitoring MCP Server OAuth logs..."
echo "Press Ctrl+C to stop"
echo ""
echo "=================================="

# Follow the log file and highlight important lines
tail -f /tmp/mcp-server.log | while read line; do
    if [[ $line == *"[OAuth]"* ]]; then
        echo "🔐 $line"
    elif [[ $line == *"ERROR"* ]] || [[ $line == *"error"* ]]; then
        echo "❌ $line"
    elif [[ $line == *"✅"* ]] || [[ $line == *"success"* ]]; then
        echo "✅ $line"
    else
        echo "$line"
    fi
done

