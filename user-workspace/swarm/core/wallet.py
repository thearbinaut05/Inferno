import stripe
from datetime import datetime
import json

class WalletManager:
    def __init__(self):
        self.wallets = {}
        
    def create_wallet(self, user_id: str, initial_balance: float = 25.0):
        """Create a new wallet with optional signup bonus"""
        if user_id in self.wallets:
            return self.wallets[user_id]
            
        self.wallets[user_id] = {
            "balance": initial_balance,
            "invested": 0,
            "platform_fee": 0,
            "transactions": [],
            "created_at": datetime.now().isoformat(),
            "last_active": datetime.now().isoformat()
        }
        return self.wallets[user_id]
        
    def add_funds(self, user_id: str, amount: float):
        """Add funds to user wallet"""
        if user_id not in self.wallets:
            self.create_wallet(user_id)
            
        self.wallets[user_id]["balance"] += amount
        self.wallets[user_id]["transactions"].append({
            "type": "deposit",
            "amount": amount,
            "timestamp": datetime.now().isoformat()
        })
        
    def deduct_funds(self, user_id: str, amount: float):
        """Remove funds from user wallet"""
        if user_id not in self.wallets:
            raise ValueError("Wallet not found")
            
        if self.wallets[user_id]["balance"] < amount:
            raise ValueError("Insufficient funds")
            
        self.wallets[user_id]["balance"] -= amount
        self.wallets[user_id]["transactions"].append({
            "type": "withdrawal",
            "amount": amount,
            "timestamp": datetime.now().isoformat()
        })
        
    def get_balance(self, user_id: str):
        """Get current wallet balance"""
        if user_id not in self.wallets:
            raise ValueError("Wallet not found")
        return self.wallets[user_id]["balance"]
        
    def invest_idle_funds(self, user_id: str, percentage: float = 0.8):
        """Move idle funds to investment pool"""
        if user_id not in self.wallets:
            raise ValueError("Wallet not found")
            
        wallet = self.wallets[user_id]
        if wallet["balance"] > 50:  # Only invest if balance > $50
            invest_amount = wallet["balance"] * percentage
            wallet["balance"] -= invest_amount
            wallet["invested"] += invest_amount
            wallet["transactions"].append({
                "type": "investment",
                "amount": invest_amount,
                "timestamp": datetime.now().isoformat()
            })
            
    def save_to_file(self):
        """Persist wallet data to file"""
        with open("wallets.json", "w") as f:
            json.dump(self.wallets, f)
            
    def load_from_file(self):
        """Load wallet data from file"""
        try:
            with open("wallets.json", "r") as f:
                self.wallets = json.load(f)
        except FileNotFoundError:
            self.wallets = {}
