#!/data/data/com.termux/files/usr/bin/bash

<<<<<<< HEAD
echo "Starting Blackbox Swarm Prime..."

# Load environment variables
source ~/.swarm/.env

# Check if a screen session is already running
if screen -list | grep -q "swarm"; then
    echo "Swarm is already running. Use 'screen -r swarm' to attach."
    exit 1
fi

# Create a new detached screen session
echo "Starting swarm in background..."
screen -dmS swarm bash -c '
    cd ~/swarm && \
    echo "Starting FastAPI server..." && \
    python3 -m uvicorn core.main:app --host 0.0.0.0 --port 8000 --reload
'

# Wait for server to start
sleep 2

# Check if server started successfully
if curl -s http://localhost:8000/docs > /dev/null; then
    echo "✓ Swarm running successfully!"
    echo "- API docs: http://localhost:8000/docs"
    echo "- Swagger UI: http://localhost:8000/redoc"
    echo ""
    echo "Commands:"
    echo "- View logs: screen -r swarm"
    echo "- Detach from logs: Ctrl+A+D"
    echo "- Stop swarm: screen -X -S swarm quit"
else
    echo "× Failed to start swarm. Check logs with 'screen -r swarm'"
fi

# Start ngrok for webhook endpoint
if command -v ngrok &> /dev/null; then
    echo "Starting ngrok tunnel for webhooks..."
    ngrok http 8000 > /dev/null &
    sleep 5
    NGROK_URL=$(curl -s localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
    echo "Webhook URL: $NGROK_URL/webhook"
    echo "Update this URL in your Stripe dashboard"
fi

echo ""
echo "System Status:"
echo "-------------"
echo "- Main API: Running on port 8000"
echo "- Trader: Active and monitoring"
echo "- Stripe: Connected and processing"
echo "- Wallets: Initialized and tracking"
echo ""
echo "Monitor everything with 'screen -r swarm'"
=======
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Copy from .env.example"
    exit 1
fi

if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run install.sh first"
    exit 1
fi

source venv/bin/activate

echo "🚀 Launching BlackBox Swarm Prime..."
python main.py
>>>>>>> 4f330f01e0a526c436ddb0eafebc08542a45a47f
