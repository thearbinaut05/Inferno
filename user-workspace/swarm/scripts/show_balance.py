import sys
import json

def load_wallets():
    try:
        with open("wallets.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print("No wallets.json file found.")
        return {}

def show_balance(user_id):
    wallets = load_wallets()
    if user_id in wallets:
        balance = wallets[user_id].get("balance", 0)
        print(f"Balance for user {user_id}: ${balance:.2f}")
    else:
        print(f"No wallet found for user {user_id}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python show_balance.py <user_id>")
        sys.exit(1)
    user_id = sys.argv[1]
    show_balance(user_id)
