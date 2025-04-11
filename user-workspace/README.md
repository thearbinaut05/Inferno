# AtomicFlashSwap V2

An enhanced implementation of flash loan-powered atomic swaps using Aave V3 protocol.

## Features

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

## Installation

```bash
npm install
```

## Configuration

1. Set up environment variables:
```env
PRIVATE_KEY=your_private_key
POLYGON_RPC_URL=your_polygon_rpc_url
MUMBAI_RPC_URL=your_mumbai_rpc_url
```

2. Configure network settings in `hardhat.config.js`

## Testing

Run the test suite:
```bash
npx hardhat test
```

Run specific test file:
```bash
npx hardhat test test/AtomicFlashSwapV2.test.js
```

## Deployment

1. Test deployment (Mumbai):
```bash
npx hardhat run scripts/testDeploymentV2.js --network mumbai
```

2. Deploy contract:
```bash
npx hardhat run scripts/deployWithFlashLoanV2.js --network polygon
```

## Usage

1. Execute flash swap:
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

## Contract Addresses

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
