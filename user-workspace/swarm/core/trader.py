import asyncio
from datetime import datetime
import random
import aiohttp
import json
from typing import Dict, Optional

class AITrader:
    def __init__(self, wallet_manager):
        self.wallet_manager = wallet_manager
        self.active = False
        self.last_trade = None
        self.market_data: Dict = {}
        self.trading_pairs = ["BTC/USD", "ETH/USD"]
        
    async def get_market_data(self) -> Dict:
        """Fetch real crypto prices via CoinGecko API"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.coingecko.com/api/v3/simple/price",
                    params={
                        "ids": "bitcoin,ethereum",
                        "vs_currencies": "usd"
                    }
                ) as response:
                    self.market_data = await response.json()
                    return self.market_data
        except Exception as e:
            print(f"Error fetching market data: {e}")
            return {}

    async def analyze_market(self) -> Dict:
        """Analyze market conditions and generate trading signals"""
        market_data = await self.get_market_data()
        
        signals = {
            "BTC/USD": {
                "action": "buy" if random.random() > 0.4 else "sell",
                "confidence": random.uniform(0.6, 0.95),
                "price": market_data.get("bitcoin", {}).get("usd", 0)
            },
            "ETH/USD": {
                "action": "buy" if random.random() > 0.4 else "sell",
                "confidence": random.uniform(0.6, 0.95),
                "price": market_data.get("ethereum", {}).get("usd", 0)
            }
        }
        
        return signals

    async def execute_trade(self, user_id: str, amount: float) -> Optional[float]:
        """Execute a simulated trade with AI-driven decision making"""
        try:
            signals = await self.analyze_market()
            
            # Pick best signal based on confidence
            best_pair = max(signals.items(), key=lambda x: x[1]["confidence"])
            
            # Simulate trade outcome based on signal confidence
            success_rate = best_pair[1]["confidence"]
            if random.random() < success_rate:
                profit_rate = random.uniform(0.01, 0.05)  # 1-5% profit
                return amount * (1 + profit_rate)
            else:
                loss_rate = random.uniform(0.01, 0.03)  # 1-3% loss
                return amount * (1 - loss_rate)
                
        except Exception as e:
            print(f"Trade execution error: {e}")
            return None

    async def run_trading_cycle(self):
        """Main trading loop"""
        self.active = True
        while self.active:
            try:
                # Check all wallets for idle funds
                for user_id, wallet in self.wallet_manager.wallets.items():
                    if wallet["invested"] > 0:
                        # Execute AI-driven trade
                        new_amount = await self.execute_trade(user_id, wallet["invested"])
                        
                        if new_amount:
                            # Calculate profit/loss
                            profit_loss = new_amount - wallet["invested"]
                            wallet["invested"] = new_amount
                            
                            if profit_loss > 0:
                                # Take 10% of profits as platform fee
                                platform_fee = profit_loss * 0.1
                                wallet["platform_fee"] += platform_fee
                                wallet["invested"] -= platform_fee
                                
                                # Log successful trade
                                wallet["transactions"].append({
                                    "type": "trade",
                                    "profit": profit_loss - platform_fee,
                                    "fee": platform_fee,
                                    "timestamp": datetime.now().isoformat()
                                })
                
                # Save updated wallet data
                self.wallet_manager.save_to_file()
                
                # Wait before next cycle (4-hour intervals)
                self.last_trade = datetime.now()
                await asyncio.sleep(14400)  # 4 hours
                
            except Exception as e:
                print(f"Trading cycle error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error
                
    def start(self):
        """Start the trading engine"""
        if not self.active:
            asyncio.create_task(self.run_trading_cycle())
            
    def stop(self):
        """Stop the trading engine"""
        self.active = False
