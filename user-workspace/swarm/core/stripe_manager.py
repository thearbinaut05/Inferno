import stripe
import os
from typing import Dict, Optional
from datetime import datetime
import json

class StripeManager:
    def __init__(self):
        self.api_key = os.getenv('STRIPE_SECRET_KEY')
        self.webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        stripe.api_key = self.api_key
        self.cards = {}  # Store card info by user_id
        
    async def create_customer(self, user_id: str, email: str) -> Dict:
        """Create a new Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email,
                metadata={"user_id": user_id}
            )
            return {
                "customer_id": customer.id,
                "email": customer.email,
                "created": customer.created
            }
        except stripe.error.StripeError as e:
            print(f"Error creating customer: {e}")
            raise
            
    async def create_virtual_card(self, user_id: str, customer_id: str) -> Dict:
        """Create a virtual card for the user"""
        try:
            # Create cardholder
            cardholder = stripe.issuing.Cardholder.create(
                type="individual",
                name=f"User {user_id}",
                email=customer_id,  # Use customer email
                status="active",
                metadata={"user_id": user_id}
            )
            
            # Create virtual card
            card = stripe.issuing.Card.create(
                cardholder=cardholder.id,
                currency="usd",
                type="virtual",
                status="active"
            )
            
            # Store card info
            self.cards[user_id] = {
                "card_id": card.id,
                "last4": card.last4,
                "exp_month": card.exp_month,
                "exp_year": card.exp_year,
                "created": datetime.now().isoformat()
            }
            
            return self.cards[user_id]
            
        except stripe.error.StripeError as e:
            print(f"Error creating virtual card: {e}")
            raise
            
    async def process_payment(self, amount: float, currency: str = "usd", 
                            customer_id: Optional[str] = None, 
                            card_id: Optional[str] = None) -> Dict:
        """Process a payment using Stripe"""
        try:
            payment_intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to cents
                currency=currency,
                customer=customer_id,
                payment_method_types=["card"],
                payment_method=card_id if card_id else None,
                confirm=True if card_id else False
            )
            
            return {
                "id": payment_intent.id,
                "amount": payment_intent.amount / 100,  # Convert back to dollars
                "status": payment_intent.status,
                "created": datetime.fromtimestamp(payment_intent.created).isoformat()
            }
            
        except stripe.error.StripeError as e:
            print(f"Payment processing error: {e}")
            raise
            
    async def handle_webhook(self, payload: bytes, signature: str) -> Dict:
        """Handle incoming Stripe webhooks"""
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            
            # Handle specific events
            if event.type == "charge.succeeded":
                charge = event.data.object
                user_id = charge.metadata.get("user_id")
                if user_id and user_id in self.cards:
                    self.cards[user_id]["last_charge"] = {
                        "amount": charge.amount / 100,
                        "timestamp": datetime.now().isoformat()
                    }
                    
            elif event.type == "issuing_card.created":
                card = event.data.object
                user_id = card.metadata.get("user_id")
                if user_id:
                    self.cards[user_id] = {
                        "card_id": card.id,
                        "last4": card.last4,
                        "exp_month": card.exp_month,
                        "exp_year": card.exp_year,
                        "created": datetime.now().isoformat()
                    }
            
            return {"status": "success", "type": event.type}
            
        except stripe.error.SignatureVerificationError as e:
            print(f"Invalid webhook signature: {e}")
            raise
        except Exception as e:
            print(f"Webhook handling error: {e}")
            raise
            
    def save_cards(self):
        """Save card data to file"""
        with open("cards.json", "w") as f:
            json.dump(self.cards, f)
            
    def load_cards(self):
        """Load card data from file"""
        try:
            with open("cards.json", "r") as f:
                self.cards = json.load(f)
        except FileNotFoundError:
            self.cards = {}
            
    def get_card_details(self, user_id: str) -> Optional[Dict]:
        """Get stored card details for a user"""
        return self.cards.get(user_id)
