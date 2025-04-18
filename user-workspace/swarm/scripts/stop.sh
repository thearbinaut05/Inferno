#!/data/data/com.termux/files/usr/bin/bash

echo "🛑 Stopping BlackBox Swarm Prime..."

PID=$(pgrep -f "python main.py")
if [ ! -z "$PID" ]; then
    kill -SIGINT $PID
    echo "✅ Swarm stopped successfully"
else
    echo "ℹ️ No running swarm found"
fi
