# Bridge Contract

This contract allows users to deposit and withdraw ETH and ERC20 tokens, facilitating a bridging mechanism between networks.

## Features

- **Deposit ETH**: Users can deposit ETH into the bridge.
- **Withdraw ETH**: Users can withdraw their deposited ETH.
- **Lock Tokens**: Users can lock ERC20 tokens in the bridge.
- **Unlock Tokens**: Users can unlock their ERC20 tokens from the bridge.
- **Event Logging**: Emits events for deposits, withdrawals, and token locking/unlocking.

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. Set up environment variables in a `.env` file:
   ```env
   INFURA_PROJECT_ID=your_infura_project_id
   ```

2. Configure network settings in `hardhat.config.js`.

## Testing

Run the test suite:
```bash
npx hardhat test
```

Run specific test file:
```bash
npx hardhat test test/Bridge.test.js
```

## Deployment

1. Deploy the Bridge contract:
```bash
npx hardhat run scripts/bridgeDeployment.js --network <network-name>
```

2. Create a new Ethereum account:
```bash
npx hardhat run scripts/bridgeDeployment.js --network <network-name>
```

3. Request test tokens for the new account:
```bash
npx hardhat run scripts/bridgeDeployment.js --network <network-name>
```

4. Bridge tokens using the new account:
```bash
npx hardhat run scripts/bridgeDeployment.js --network <network-name>
```

## Usage

### Deposit ETH
```solidity
function deposit() external payable;
```

### Withdraw ETH
```solidity
function withdraw(address to, uint256 amount) external;
```

### Lock Tokens
```solidity
function lockTokens(address token, uint256 amount) external;
```

### Unlock Tokens
```solidity
function unlockTokens(address token, address to, uint256 amount) external;
```

## Events

- `Deposited(address indexed from, uint256 amount)`
- `Withdrawn(address indexed to, uint256 amount)`
- `TokensLocked(address indexed token, address indexed from, uint256 amount)`
- `TokensUnlocked(address indexed token, address indexed to, uint256 amount)`

## Security Considerations

- Ensure that only the owner can call sensitive functions.
- Implement checks to prevent reentrancy attacks.

## License

MIT
