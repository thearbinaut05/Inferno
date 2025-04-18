import os
import sys

def pre_launch_safety_check():
    print("=== BlackBox Swarm Safety Check ===")
    
    if not os.path.exists('.env'):
        print("❌ .env file not found. Copy from .env.example")
        return False
    
    live_mode = os.getenv('STRIPE_LIVE_MODE', 'false').lower() == 'true'
    if live_mode:
        print("⚠️ WARNING: STRIPE_LIVE_MODE is enabled!")
        print("This will charge real credit cards!")
        response = input("Continue? (y/N): ")
        if response.lower() != 'y':
            return False
    
    required_vars = ['STRIPE_SECRET_KEY', 'INITIAL_AGENTS', 'SPAWN_THRESHOLD']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        return False
    
    print("✅ Safety check passed!")
    return True

def check_stripe_safety():
    live_mode = os.getenv('STRIPE_LIVE_MODE', 'false').lower() == 'true'
    if live_mode:
        daily_limit = float(os.getenv('DAILY_CHARGE_LIMIT', '1000'))
        if os.getenv('REQUIRE_CONFIRMATION', 'true').lower() == 'true':
            pass
