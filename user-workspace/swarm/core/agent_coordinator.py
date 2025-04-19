import asyncio
from typing import Dict, List
import json
from datetime import datetime
import logging

from ..agents.FlashLoanAgent import FlashLoanAgent
from ..agents.YieldFarmingAgent import YieldFarmingAgent
from ..agents.MEVAgent import MEVAgent
from .wallet import WalletManager
from .trader import AITrader
from ..utils.logger import setup_logger

from swarm.utils.logger import get_logger

logger = get_logger("agent_coordinator")

class AgentCoordinator:
    """Coordinates multiple revenue-generating agents for maximum returns"""
    
    def __init__(self, wallet_manager: WalletManager):
        self.wallet_manager = wallet_manager
        self.agents = {}
        self.performance_metrics = {}
        self.active = False
        
        # Configure initial capital allocation
        self.capital_allocation = {
            "flash_loan": 0.3,  # 30% to flash loans
            "yield_farming": 0.4,  # 40% to yield farming
            "mev": 0.3  # 30% to MEV
        }
        
    async def initialize_agents(self, total_capital: float):
        """Initialize all agent types with allocated capital"""
        try:
            # Flash Loan Agent
            flash_loan_capital = total_capital * self.capital_allocation["flash_loan"]
            self.agents["flash_loan"] = FlashLoanAgent(
                self.wallet_manager,
                initial_capital=flash_loan_capital
            )
            
            # Yield Farming Agent
            yield_farming_capital = total_capital * self.capital_allocation["yield_farming"]
            self.agents["yield_farming"] = YieldFarmingAgent(
                self.wallet_manager,
                initial_capital=yield_farming_capital
            )
            
            # MEV Agent
            mev_capital = total_capital * self.capital_allocation["mev"]
            self.agents["mev"] = MEVAgent(
                self.wallet_manager,
                initial_capital=mev_capital
            )
            
            logger.info(f"Initialized agents with total capital: ${total_capital:,.2f}")
            
        except Exception as e:
            logger.error(f"Error initializing agents: {e}")
            raise
            
    async def monitor_performance(self):
        """Monitor and record agent performance metrics"""
        while self.active:
            try:
                current_metrics = {
                    agent_type: {
                        "capital": agent.capital,
                        "profit_24h": await self.calculate_24h_profit(agent_type),
                        "active_positions": await self.get_active_positions(agent_type),
                        "success_rate": await self.calculate_success_rate(agent_type)
                    }
                    for agent_type, agent in self.agents.items()
                }
                
                self.performance_metrics[datetime.now().isoformat()] = current_metrics
                
                # Save metrics to file
                with open("agent_performance.json", "w") as f:
                    json.dump(self.performance_metrics, f, indent=2)
                    
                # Adjust allocations if needed
                await self.optimize_allocations()
                
                await asyncio.sleep(3600)  # Update every hour
                
            except Exception as e:
                logger.error(f"Performance monitoring error: {e}")
                await asyncio.sleep(300)  # Retry after 5 minutes
                
    async def optimize_allocations(self):
        """Optimize capital allocation based on performance"""
        try:
            # Calculate 24h ROI for each agent
            roi_data = {}
            for agent_type, metrics in self.performance_metrics.items():
                if metrics.get("profit_24h"):
                    roi = metrics["profit_24h"] / metrics["capital"]
                    roi_data[agent_type] = roi
                    
            if roi_data:
                # Adjust allocations favoring better performing strategies
                total_roi = sum(roi_data.values())
                new_allocations = {
                    agent_type: (roi / total_roi)
                    for agent_type, roi in roi_data.items()
                }
                
                # Apply changes gradually (20% shift per adjustment)
                for agent_type in self.capital_allocation:
                    current = self.capital_allocation[agent_type]
                    target = new_allocations[agent_type]
                    self.capital_allocation[agent_type] = current + (
                        (target - current) * 0.2
                    )
                    
                logger.info(f"Updated capital allocations: {self.capital_allocation}")
                
        except Exception as e:
            logger.error(f"Allocation optimization error: {e}")
            
    async def calculate_24h_profit(self, agent_type: str) -> float:
        """Calculate 24-hour profit for an agent type"""
        try:
            wallet = self.wallet_manager.get_wallet(agent_type)
            return wallet.get("profit_24h", 0)
        except Exception:
            return 0
            
    async def get_active_positions(self, agent_type: str) -> int:
        """Get number of active positions for an agent"""
        try:
            if agent_type == "yield_farming":
                return len(self.agents[agent_type].active_pools)
            elif agent_type == "flash_loan":
                return self.agents[agent_type].active_loans
            elif agent_type == "mev":
                return len(self.agents[agent_type].pending_opportunities)
            return 0
        except Exception:
            return 0
            
    async def calculate_success_rate(self, agent_type: str) -> float:
        """Calculate success rate of agent operations"""
        try:
            agent = self.agents[agent_type]
            if hasattr(agent, 'total_attempts') and agent.total_attempts > 0:
                return agent.successful_operations / agent.total_attempts
            return 0
        except Exception:
            return 0
            
    async def start_all_agents(self):
        """Start all agent operations"""
        self.active = True
        
        try:
            # Start performance monitoring
            asyncio.create_task(self.monitor_performance())
            
            # Start all agents
            tasks = []
            for agent_type, agent in self.agents.items():
                logger.info(f"Starting {agent_type} agent...")
                tasks.append(asyncio.create_task(agent.run()))
                
            # Wait for all agents
            await asyncio.gather(*tasks)
            
        except Exception as e:
            logger.error(f"Error starting agents: {e}")
            self.active = False
            raise
            
    async def stop_all_agents(self):
        """Stop all agent operations"""
        self.active = False
        
        try:
            # Stop all agents
            for agent_type, agent in self.agents.items():
                logger.info(f"Stopping {agent_type} agent...")
                if hasattr(agent, 'stop'):
                    await agent.stop()
                    
            # Save final performance metrics
            with open("final_performance.json", "w") as f:
                json.dump(self.performance_metrics, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error stopping agents: {e}")
            raise
            
    async def get_total_profit(self) -> float:
        """Calculate total profit across all agents"""
        try:
            total = 0
            for agent_type in self.agents:
                total += await self.calculate_24h_profit(agent_type)
            return total
        except Exception as e:
            logger.error(f"Error calculating total profit: {e}")
            return 0
            
    async def reinvest_profits(self):
        """Reinvest profits back into the system"""
        while self.active:
            try:
                total_profit = await self.get_total_profit()
                if total_profit > 0:
                    # Reinvest 80% of profits
                    reinvestment = total_profit * 0.8
                    
                    # Distribute according to current allocation
                    for agent_type, allocation in self.capital_allocation.items():
                        amount = reinvestment * allocation
                        if amount > 0:
                            self.agents[agent_type].capital += amount
                            logger.info(
                                f"Reinvested ${amount:,.2f} into {agent_type}"
                            )
                            
                await asyncio.sleep(86400)  # Reinvest daily
                
            except Exception as e:
                logger.error(f"Reinvestment error: {e}")
                await asyncio.sleep(3600)  # Retry after 1 hour
