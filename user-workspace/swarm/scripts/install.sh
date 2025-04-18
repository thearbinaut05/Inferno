#!/data/data/com.termux/files/usr/bin/bash

echo "Installing Blackbox Swarm Prime..."

# Update package lists
pkg update -y && pkg upgrade -y

# Install Python and pip
pkg install python -y

# Install required system packages
pkg install git curl openssl -y

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
pip install fastapi uvicorn stripe python-dotenv aiohttp

# Create necessary directories
mkdir -p ~/.swarm/data

# Create .env file template
cat > ~/.swarm/.env << EOL
STRIPE_SECRET_KEY=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
STRIPE_PUBLISHABLE_KEY=pk_live_51R4gD2LKSRNiN8vTUDaEIYy9SOA6o5hfK0D30iheBMQWkoggipk7oQZOIGKCDhlLVYlENrUk3JwOzXyzZQ92sVim00hOMTAOda
STRIPE_WEBHOOK_SECRET=whsec_LG6Mm1l0dLmOBeAPMA1x56BbCxpZqag5
EOL

# Install screen for background processes
pkg install screen -y

echo "Installation complete! Run './scripts/start.sh' to launch the swarm."
