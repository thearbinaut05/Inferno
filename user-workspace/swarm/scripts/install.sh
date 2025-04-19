echo "🔥 Installing BlackBox Swarm Prime..."

apt update && apt upgrade -y
apt install python python-dev openssl git -y

python -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

mkdir -p data

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from example"
    echo "⚠️ Please edit .env with your Stripe keys"
fi

chmod +x scripts/*.sh

echo "✅ BlackBox Swarm Prime installed successfully!"
echo "Edit .env file with your Stripe keys"
echo "Run 'bash scripts/start.sh' to begin"
=======
echo "🔥 Installing BlackBox Swarm Prime..."

apt update && apt upgrade -y
apt install python python-dev openssl git -y

python -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

mkdir -p data

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from example"
    echo "⚠️ Please edit .env with your Stripe keys"
fi

chmod +x scripts/*.sh

echo "✅ BlackBox Swarm Prime installed successfully!"
echo "Edit .env file with your Stripe keys"
echo "Run 'bash scripts/start.sh' to begin"
>>>>>>> 4f330f01e0a526c436ddb0eafebc08542a45a47f
