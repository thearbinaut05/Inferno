from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import stripe
import os
from dotenv import load_dotenv
import asyncio
import json
from datetime import datetime
import logging

from .wallet import WalletManager
from .stripe_manager import StripeManager
from .agent_coordinator import AgentCoordinator
from ..utils.logger import setup_logger

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Blackbox Swarm Prime")

# Initialize components
wallet_manager = WalletManager()
stripe_manager = StripeManager()
agent_coordinator = AgentCoordinator(wallet_manager)

# Setup logging
from swarm.utils.logger import get_logger

logger = get_logger("main")

@app.on_event("startup")
async def startup_event():
    """Initialize system on startup"""
    try:
        # Load existing wallets
        wallet_manager.load_from_file()
        
        # Initialize agents with platform wallet balance
        platform_balance = wallet_manager.get_balance("platform")
        if platform_balance > 0:
            await agent_coordinator.initialize_agents(platform_balance)
            await agent_coordinator.start_all_agents()
            
        logger.info("System initialized successfully")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    try:
        await agent_coordinator.stop_all_agents()
        wallet_manager.save_to_file()
        logger.info("System shutdown complete")
    except Exception as e:
        logger.error(f"Shutdown error: {e}")

@app.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        # Process webhook
        result = await stripe_manager.handle_webhook(
            await request.body(),
            request.headers.get("stripe-signature")
        )
        
        # Handle successful payments
        if result.get("type") == "charge.succeeded":
            user_id = result["data"]["object"]["metadata"].get("user_id")
            amount = result["data"]["object"]["amount"] / 100  # Convert cents to dollars
            
            # Create virtual card if needed
            if not stripe_manager.get_card_details(user_id):
                await stripe_manager.create_virtual_card(
                    user_id,
                    result["data"]["object"]["customer"]
                )
            
            # Update wallet
            wallet_manager.add_funds(user_id, amount)
            
            # Start agents if platform wallet has funds
            platform_balance = wallet_manager.get_balance("platform")
            if platform_balance > 0 and not agent_coordinator.active:
                await agent_coordinator.initialize_agents(platform_balance)
                await agent_coordinator.start_all_agents()
                
        return JSONResponse({"status": "success"})
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/connect")
async def stripe_connect():
    """Start Stripe Connect onboarding"""
    try:
        return await stripe_manager.create_connect_account()
    except Exception as e:
        logger.error(f"Connect error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/wallet/{user_id}")
async def get_wallet(user_id: str):
    """Get wallet details and performance metrics"""
    try:
        wallet = wallet_manager.get_wallet(user_id)
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
            
        # Get virtual card details
        card = stripe_manager.get_card_details(user_id)
        
        # Get agent performance if platform wallet
        performance = None
        if user_id == "platform":
            performance = agent_coordinator.performance_metrics
            
        return {
            "wallet": wallet,
            "card": card,
            "performance": performance
        }
        
    except Exception as e:
        logger.error(f"Wallet retrieval error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/metrics")
async def get_metrics():
    """Get system-wide performance metrics"""
    try:
        metrics = {
            "total_profit": await agent_coordinator.get_total_profit(),
            "active_agents": len(agent_coordinator.agents),
            "wallet_count": len(wallet_manager.wallets),
            "performance": agent_coordinator.performance_metrics
        }
        return metrics
    except Exception as e:
        logger.error(f"Metrics retrieval error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/reinvest")
async def trigger_reinvestment():
    """Manually trigger profit reinvestment"""
    try:
        if not agent_coordinator.active:
            raise HTTPException(
                status_code=400,
                detail="Agent coordinator not active"
            )
            
        await agent_coordinator.reinvest_profits()
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Reinvestment error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/status")
async def get_status():
    """Get system status and health metrics"""
    try:
        return {
            "status": "running" if agent_coordinator.active else "stopped",
            "agent_count": len(agent_coordinator.agents),
            "total_wallets": len(wallet_manager.wallets),
            "platform_balance": wallet_manager.get_balance("platform"),
            "last_metrics_update": max(
                agent_coordinator.performance_metrics.keys(),
                default=None
            )
        }
    except Exception as e:
        logger.error(f"Status check error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Error Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
