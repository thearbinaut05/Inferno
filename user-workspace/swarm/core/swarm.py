import asyncio
import os
from agents.core_agent import CoreAgent
from core.tracker import ValueTracker
from core.task_queue import TaskQueue
from utils.logger import get_logger

class SwarmManager:
    def __init__(self, initial_agents=1):
        self.agents = []
        self.tracker = ValueTracker()
        self.task_queue = TaskQueue()
        self.logger = get_logger("swarm_manager")
        self.is_running = False
        self.total_value = 0.0
        self.live_mode = os.getenv('STRIPE_LIVE_MODE', 'false').lower() == 'true'
        self.spawn_threshold = float(os.getenv('SPAWN_THRESHOLD', '100'))
        self.max_agents = int(os.getenv('MAX_AGENTS', '10'))
        self.initial_agents = initial_agents
        
    async def initialize(self):
        for i in range(self.initial_agents):
            await self.spawn_agent()
        self.is_running = True
        
    async def spawn_agent(self):
        if len(self.agents) >= self.max_agents:
            self.logger.warning(f"Max agents limit ({self.max_agents}) reached")
            return False
            
        agent_id = len(self.agents) + 1
        agent = CoreAgent(agent_id, self.live_mode)
        await agent.initialize()
        self.agents.append(agent)
        self.logger.info(f"Spawned agent {agent.id}")
        return True
        
    async def run_forever(self):
        await self.initialize()
        
        while self.is_running:
            self.task_queue.generate_tasks(5)
            
            for agent in self.agents:
                if task := self.task_queue.get_next():
                    asyncio.create_task(self._run_agent_task(agent, task))
            
            if self.total_value / len(self.agents) > self.spawn_threshold:
                await self.spawn_agent()
            
            self.log_status()
            
            await asyncio.sleep(1)
            
    async def _run_agent_task(self, agent, task):
        result = await agent.run_task(task['type'], task['params'])
        self.tracker.log_task(agent.id, task, result)
        if result.get('success'):
            self.total_value += result.get('value', 0.0)
            
    def log_status(self):
        self.logger.info(f"Swarm status: {len(self.agents)} agents, ${self.total_value:.2f} value generated")
        
    async def shutdown(self):
        self.logger.info("Initiating graceful shutdown...")
        self.is_running = False
        await asyncio.sleep(2)
        self.logger.info("Shutdown complete")
        
    async def emergency_shutdown(self):
        self.logger.warning("Emergency shutdown triggered!")
        self.is_running = False
