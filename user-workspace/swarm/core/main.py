from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import stripe
import os
from dotenv import load_dotenv
import json
import asyncio
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')

app = FastAPI()

# Store user wallets in memory (replace with DB in production)
wallets = {}

class SwarmAgent:
    def __init__(self, user_id):
        self.user_id = user_id
        self.balance = 0
        self.tasks_completed = 0
        self.last_active = datetime.now()
    
    async def run(self):
        while True:
            try:
                # Simulate work and earnings
                await asyncio.sleep(5)  # 5 second work cycle
                earned = 0.10  # $0.10 per task
                
                # Update balances
                wallets[self.user_id]["balance"] += earned * 0.9  # 90% to user
                wallets[self.user_id]["platform_fee"] += earned * 0.1  # 10% to platform
                
                self.tasks_completed += 1
                self.last_active = datetime.now()
                
                # Auto-reinvest if balance > $50
                if wallets[self.user_id]["balance"] > 50:
                    await self.reinvest()
                    
            except Exception as e:
                print(f"Agent error: {e}")
                await asyncio.sleep(1)
                
    async def reinvest(self):
        """Simulate AI trading with user's idle balance"""
        invest_amount = wallets[self.user_id]["balance"] * 0.8
        wallets[self.user_id]["invested"] += invest_amount
        wallets[self.user_id]["balance"] -= invest_amount

@app.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if event.type == "checkout.session.completed":
        session = event.data.object
        user_id = session.client_reference_id
        
        # Create virtual card for user
        card = stripe.issuing.Card.create(
            cardholder=user_id,
            currency="usd",
            type="virtual",
        )
        
        # Initialize user wallet if needed
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
