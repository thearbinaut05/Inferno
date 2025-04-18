from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import stripe
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime
import json

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
logger = setup_logger("main_app")

@app.on_event("startup")
async def startup_event():
    """Initialize system on startup"""
    try:
        # Load existing wallets
        wallet_manager.load_from_file()
        
        # Initialize agents with platform wallet
        platform_wallet = wallet_manager.get_wallet("platform")
        if platform_wallet:
            initial_capital = platform_wallet.get("balance", 10000)
            await agent_coordinator.initialize_agents(initial_capital)
            
            # Start agent coordinator
            asyncio.create_task(agent_coordinator.start_all_agents())
            logger.info("Agent coordinator started successfully")
            
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    try:
        await agent_coordinator.stop_all_agents()
        wallet_manager.save_to_file()
        logger.info("System shutdown completed")
    except Exception as e:
        logger.error(f"Shutdown error: {e}")

@app.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        # Process webhook
        result = await stripe_manager.handle_webhook(payload, sig_header)
        
        if result.get("type") == "checkout.session.completed":
            session = result["data"]["object"]
            user_id = session["client_reference_id"]
            
            # Create virtual card
            card = await stripe_manager.create_virtual_card(
                user_id,
                session["customer"]
            )
            
            # Initialize user wallet with signup bonus
        if user_id not in wallets:
            wallets[user_id] = {
                "balance": 25.00,  # $25 signup bonus
                "card_id": card.id,
                "platform_fee": 0,
                "invested": 0,
                "agents": []
            }
            
            # Spawn initial agent
            agent = SwarmAgent(user_id)
            wallets[user_id]["agents"].append(agent)
            asyncio.create_task(agent.run())
    
    return JSONResponse({"status": "success"})

@app.get("/wallet/{user_id}")
async def get_wallet(user_id: str):
    if user_id not in wallets:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallets[user_id]

@app.post("/connect")
async def stripe_connect():
    account = stripe.Account.create(type="express")
    return {"account_link": account.url}

# Startup Tasks
@app.on_event("startup")
async def startup_event():
    # Initialize platform wallet
    wallets["platform"] = {
        "balance": 0,
        "platform_fee": 0,
        "invested": 0,
        "agents": []
    }
