#!/bin/bash
# This script will periodically call a Python script to save wallet data to disk
# Usage: ./save_wallets_periodically.sh &

while true; do
    # Call a Python script or command to save wallet data
    python3 -c "from swarm.core.wallet import WalletManager; WalletManager().save_to_file()"
    sleep 300  # Save every 5 minutes
done
