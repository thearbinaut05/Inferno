#!/data/data/com.termux/files/usr/bin/bash

if [ -f "blackbox_swarm.log" ]; then
    echo "📊 Monitoring BlackBox Swarm Prime logs..."
    tail -f blackbox_swarm.log
else
    echo "❌ Log file not found. Is the swarm running?"
    exit 1
fi
