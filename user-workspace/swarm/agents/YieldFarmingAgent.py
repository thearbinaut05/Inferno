import asyncio
from typing import Dict, List, Optional
import aiohttp
from decimal import Decimal
import json

class YieldFarmingAgent:
    """Agent that manages yield farming across DeFi protocols"""
    
    def __init__(self, wallet_manager, initial_capital: float = 1000.0):
        self.wallet_manager = wallet_manager
        self.capital = initial_capital
        self.min_apy = 15.0  # Minimum 15% APY threshold
        self.protocols = {
            "aave": {
                "url": "https://api.aave.com",
                "pools": ["USDC", "ETH", "MATIC"]
            },
            "compound": {
                "url": "https://api.compound.finance",
                "pools": ["USDC", "ETH"]
            },
            "curve": {
                "url": "https://api.curve.fi",
                "pools": ["3pool", "tricrypto"]
            }
        }
        
    async def get_pool_stats(self) -> Dict[str, List[Dict]]:
        """Fetch yield farming opportunities across protocols"""
        opportunities = {}
        
        async with aiohttp.ClientSession() as session:
            for protocol, info in self.protocols.items():
                opportunities[protocol] = []
                for pool in info["pools"]:
                    try:
                        # Simulate API call to get pool stats
                        response = await session.get(
                            f"{info['url']}/v1/pools/{pool}"
                        )
                        if response.status == 200:
                            data = await response.json()
                            opportunities[protocol].append({
                                "pool": pool,
                                "apy": float(data.get("apy", 0)),
                                "tvl": float(data.get("tvl", 0)),
                                "risk_score": float(data.get("risk_score", 5))
                            })
                    except Exception as e:
                        print(f"Error fetching {protocol}/{pool} stats: {e}")
                        
        return opportunities
        
    def calculate_optimal_allocation(self, opportunities: Dict) -> List[Dict]:
        """Calculate optimal fund allocation across protocols"""
        allocations = []
        remaining_capital = self.capital
        
        # Flatten and sort opportunities by APY/risk ratio
        all_pools = []
        for protocol, pools in opportunities.items():
            for pool in pools:
                pool["protocol"] = protocol
                pool["score"] = pool["apy"] / pool["risk_score"]
                all_pools.append(pool)
                
        # Sort by score (APY/risk ratio)
        all_pools.sort(key=lambda x: x["score"], reverse=True)
        
        # Allocate funds based on score
        for pool in all_pools:
            if pool["apy"] < self.min_apy or remaining_capital <= 0:
                continue
                
            # Allocate more to higher scoring pools
            allocation = remaining_capital * (pool["score"] / sum(p["score"] for p in all_pools))
            if allocation >= 100:  # Minimum $100 allocation
                allocations.append({
                    "protocol": pool["protocol"],
                    "pool": pool["pool"],
                    "amount": allocation,
                    "expected_apy": pool["apy"]
                })
                remaining_capital -= allocation
                
        return allocations
        
    async def deploy_funds(self, allocations: List[Dict]) -> Optional[float]:
        """Deploy funds according to calculated allocations"""
        try:
            total_deployed = 0
            expected_yearly_yield = 0
            
            for allocation in allocations:
                # Simulate deploying funds to protocol
                amount = allocation["amount"]
                apy = allocation["expected_apy"]
                
                # Calculate expected yearly yield
                yearly_yield = amount * (apy / 100)
                expected_yearly_yield += yearly_yield
                total_deployed += amount
                
                print(f"Deployed ${amount:.2f} to {allocation['protocol']}/{allocation['pool']} at {apy:.2f}% APY")
                
            if total_deployed > 0:
                # Calculate platform fee (10% of yield)
                platform_fee = expected_yearly_yield * 0.1
                user_yield = expected_yearly_yield * 0.9
                
                # Update wallet with projected yields
                self.wallet_manager.add_funds("platform", platform_fee / 12)  # Monthly yield
                return user_yield / 12  # Return monthly yield estimate
                
            return None
            
        except Exception as e:
            print(f"Fund deployment error: {e}")
            return None
            
    async def monitor_and_rebalance(self):
        """Monitor yields and rebalance as needed"""
        while True:
            try:
                # Get current opportunities
                opportunities = await self.get_pool_stats()
                
                # Calculate optimal allocation
                new_allocations = self.calculate_optimal_allocation(opportunities)
                
                # Deploy/rebalance funds
                monthly_yield = await self.deploy_funds(new_allocations)
                if monthly_yield:
                    print(f"Expected monthly yield: ${monthly_yield:.2f}")
                    
                # Save allocation data
                with open("yield_farming_allocations.json", "w") as f:
                    json.dump(new_allocations, f, indent=2)
                    
                # Wait before next rebalance
                await asyncio.sleep(86400)  # Check daily
                
            except Exception as e:
                print(f"Yield farming agent error: {e}")
                await asyncio.sleep(3600)  # 1 hour cooldown on error
                
    async def run(self):
        """Main agent loop"""
        print("Starting yield farming agent...")
        await self.monitor_and_rebalance()
