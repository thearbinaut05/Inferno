# Blackbox Swarm Prime

An advanced self-replicating agent swarm system with Stripe integration, virtual card issuance, and AI-driven trading capabilities.

## Features

- **Agent Swarm System**
  - Self-replicating agents
  - Parallel task execution
  - Automatic scaling based on performance
  - Revenue sharing (90% user / 10% platform)

- **Stripe Integration**
  - Virtual card issuance
  - Automated payment processing
  - Webhook handling
  - Secure transaction management

- **AI Trading Engine**
  - Automated market analysis
  - Real-time cryptocurrency price tracking
  - Risk-managed trading strategies
  - Profit reinvestment system

- **Wallet Management**
  - User balance tracking
  - Transaction history
  - Investment pool management
  - Automated fee collection

## Installation

### On Termux

1. Clone the repository:
```bash
git clone https://github.com/yourusername/blackbox-swarm-prime.git
cd blackbox-swarm-prime
```

2. Run the installation script:
```bash
chmod +x swarm/scripts/install.sh
./swarm/scripts/install.sh
```

3. Start the system:
```bash
chmod +x swarm/scripts/start.sh
./swarm/scripts/start.sh
```

### System Requirements

- Python 3.8+
- Termux (for Android deployment)
- Active internet connection
- Stripe account with API keys

## Configuration

1. Update your Stripe API keys in `~/.swarm/.env`:
```env
STRIPE_SECRET_KEY=your_secret_key
STRIPE_PUBLISHABLE_KEY=your_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

2. Configure webhook URL in Stripe dashboard:
- Use the ngrok URL provided during startup
- Add `/webhook` endpoint to the URL
- Enable relevant webhook events

## Architecture

### Core Components

1. **Main API (`core/main.py`)**
   - FastAPI server
   - Route handling
   - Agent coordination

2. **Wallet System (`core/wallet.py`)**
   - Balance management
   - Transaction tracking
   - Investment pooling

3. **Trading Engine (`core/trader.py`)**
   - Market analysis
   - Trade execution
   - Profit distribution

4. **Stripe Manager (`core/stripe_manager.py`)**
   - Payment processing
   - Virtual card management
   - Webhook handling

## API Endpoints

- `POST /connect` - Start Stripe Connect onboarding
- `POST /webhook` - Handle Stripe events
- `GET /wallet/{user_id}` - Get wallet details
- `POST /invest` - Start investment cycle

## Growth Metrics

The system is designed for exponential growth:
- Initial agent multiplication: 7.923x per hour
- Revenue sharing: 90% user / 10% platform
- Auto-reinvestment threshold: $50
- Trading cycles: Every 4 hours

## Monitoring

1. View logs:
```bash
screen -r swarm
```

2. Detach from logs:
```
Ctrl+A+D
```

3. Stop the system:
```bash
screen -X -S swarm quit
```

## Security

- All Stripe keys are stored securely in `.env`
- Virtual cards are issued with strict spending limits
- Trading engine includes risk management
- All transactions are logged and monitored

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please create an issue in the repository.

## Disclaimer

This system involves real money and trading. Use at your own risk and ensure compliance with all relevant regulations and laws in your jurisdiction.
