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
python -m swarm.core.main
