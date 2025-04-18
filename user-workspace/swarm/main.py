import asyncio
import os
from dotenv import load_dotenv
from core.swarm import SwarmManager
from utils.logger import setup_logger
from utils.safety_checks import pre_launch_safety_check

load_dotenv()

async def main():
    logger = setup_logger()
    
    if not pre_launch_safety_check():
        logger.error("Safety check failed! Aborting.")
        return
    
    initial_agents = int(os.getenv('INITIAL_AGENTS', '1'))
    swarm = SwarmManager(initial_agents=initial_agents)
    
    logger.info("BlackBox Swarm Prime launching...")
    
    try:
        await swarm.run_forever()
    except KeyboardInterrupt:
        logger.info("Shutdown signal received. Cleaning up...")
        await swarm.shutdown()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        await swarm.emergency_shutdown()

if __name__ == "__main__":
    asyncio.run(main())
