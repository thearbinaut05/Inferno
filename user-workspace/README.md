# AtomicFlashSwap V2

An enhanced implementation of flash loan-powered atomic swaps using Aave V3 protocol, with advanced gas optimization and deployment features.

## Core Features

- **Security Enhancements**
  - Reentrancy protection
  - Emergency pause functionality
  - Token whitelist system
  - Slippage protection
  - Minimum delay between executions

- **Gas Optimizations**
  - Custom errors
  - Optimized storage usage
  - Efficient token approval pattern

- **Enhanced Functionality**
  - Detailed event logging
  - Transaction timestamp tracking
  - Configurable slippage tolerance
  - Improved error handling

## Gas Optimization Features

- **Dynamic Gas Price Estimation**
  - Real-time gas price fetching from Polygon Gas Station
  - Multiple priority levels (safe, standard, fast)
  - Configurable safety margins
  - Fallback mechanisms for reliable operation

- **Deployment Cost Estimation**
  - Accurate deployment cost prediction
  - Token whitelisting cost calculation
  - Method-specific gas estimation
  - Batch operation optimization

- **Smart Contract Optimization**
  - Custom errors for gas efficiency
  - Optimized storage patterns
  - Efficient approval mechanisms
  - Gas-conscious state updates

## Installation

```bash
npm install
npm install web3 node-fetch # Required for gas estimation features
```

## Configuration

1. Set up environment variables:
```env
PRIVATE_KEY=your_private_key
POLYGON_RPC_URL=your_polygon_rpc_url
MUMBAI_RPC_URL=your_mumbai_rpc_url
```

2. Configure network settings in `hardhat.config.js`

## Gas Estimation & Testing

Test gas estimation features:
```bash
npx hardhat run scripts/testGasEstimation.js --network mumbai
```

Run the test suite:
```bash
npx hardhat test
```

Run specific test file:
```bash
npx hardhat test test/AtomicFlashSwapV2.test.js
```

## Deployment

### Deployment Process

1. Pre-deployment Checks
```bash
# Test deployment and estimate costs
npx hardhat run scripts/testDeploymentV2.js --network mumbai

# Run gas estimation tests
npx hardhat run scripts/testGasEstimation.js --network mumbai
```

2. Deploy Contract
```bash
# Deploy with standard settings
npx hardhat run scripts/deployWithFlashLoanV2.js --network polygon

# Deploy with gas optimization
npx hardhat run scripts/deployWithGasEstimation.js --network polygon
```

## Usage

### Gas-Optimized Deployment
```bash
# Deploy with gas optimization
npx hardhat run scripts/deployWithGasEstimation.js --network polygon
```

### Execute Flash Swap
```javascript
const { executeFlashSwap } = require('./scripts/executeFlashSwapV2');

await executeFlashSwap(
    contractAddress,
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    deployData
);
```

### Gas Estimation Utilities
```javascript
const { 
    getOptimalGasPrice,
    estimateDeploymentGas,
    estimateMethodGas,
    suggestBatchSize
} = require('./scripts/gasHelper');

// Get optimal gas price
const gasPrice = await getOptimalGasPrice({
    priority: 'fast',
    margin: 20 // 20% safety margin
});

// Estimate deployment costs
const estimation = await estimateDeploymentGas(
    ContractFactory,
    constructorArgs,
    { margin: 20 }
);

// Estimate method gas
const methodGas = await estimateMethodGas(
    contract,
    'methodName',
    methodArgs,
    { margin: 20 }
);

// Get batch size recommendations
const batchInfo = await suggestBatchSize(
    contract,
    'methodName',
    items,
    { maxGasPerBlock: 30000000 }
);
```

## Network Addresses

### Polygon Mainnet
- AAVE Pool: `0x794a61358D6845594F94dc1DB02A252b5b4814aD`
- USDC: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- WETH: `0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619`
- WBTC: `0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6`

### Polygon Mumbai
- AAVE Pool: `0x0b913A76beFF3887d35073b8e5530755D60F78C7`
- USDC: `0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747`
- WETH: `0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa`
- WBTC: `0x0d787a4a1548f673ed375445535a6c7A1EE56180`

## Security Considerations

1. **Token Whitelist**
   - Only whitelisted tokens can be used in flash swaps
   - Owner can manage whitelist through `setTokenWhitelist`

2. **Slippage Protection**
   - Configurable slippage tolerance (default 0.5%)
   - Transactions revert if slippage exceeds tolerance

3. **Execution Delay**
   - Minimum delay between flash swaps (6 hours)
   - Prevents rapid successive executions

4. **Emergency Controls**
   - Contract can be paused by owner
   - Token rescue functionality for emergency withdrawals

## Events

1. **FlashSwapExecuted**
   ```solidity
   event FlashSwapExecuted(
       address indexed tokenIn,
       address indexed tokenOut,
       uint256 amountIn,
       uint256 amountOut,
       uint256 timestamp
   );
   ```

2. **FlashLoanExecuted**
   ```solidity
   event FlashLoanExecuted(
       address indexed asset,
       uint256 amount,
       uint256 premium,
       uint256 timestamp
   );
   ```

3. **TokenWhitelisted**
   ```solidity
   event TokenWhitelisted(
       address indexed token,
       bool status
   );
   ```

## Error Codes

- `InvalidToken`: Invalid token address
- `InvalidAmount`: Invalid amount specified
- `ExcessiveSlippage`: Slippage exceeds tolerance
- `Unauthorized`: Unauthorized access attempt
- `TooEarlyExecution`: Minimum delay not met
- `FailedDeployment`: Deployment operation failed
- `FailedTransfer`: Token transfer failed

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT
