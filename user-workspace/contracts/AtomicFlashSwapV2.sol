// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IFlashLoanSimpleReceiver.sol";
import "./interfaces/IPool.sol";

/**
 * @title AtomicFlashSwapV2
 * @dev Enhanced version of AtomicFlashSwap with additional security features and optimizations
 */
contract AtomicFlashSwapV2 is Ownable, ReentrancyGuard, Pausable, IFlashLoanSimpleReceiver {
    // Immutable addresses
    address public immutable AAVE_POOL;
    
    // Constants
    uint16 private constant REFERRAL_CODE = 0;
    uint256 private constant CALLBACK_SUCCESS = 1;
    uint256 private constant MINIMUM_DELAY = 6 hours;
    
    // State variables
    mapping(address => uint256) public tokenBalances;
    mapping(address => bool) public whitelistedTokens;
    uint256 public slippageTolerance = 50; // 0.5%
    uint256 public lastExecutionTime;
    
    // Events
    event FlashSwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );
    
    event FlashLoanExecuted(
        address indexed asset,
        uint256 amount,
        uint256 premium,
        uint256 timestamp
    );
    
    event TokenWhitelisted(address indexed token, bool status);
    event SlippageToleranceUpdated(uint256 oldValue, uint256 newValue);
    
    // Custom errors
    error InvalidToken();
    error InvalidAmount();
    error ExcessiveSlippage();
    error Unauthorized();
    error TooEarlyExecution();
    error FailedDeployment();
    error FailedTransfer();

    /**
     * @dev Constructor to initialize the contract
     * @param initialOwner Address of the contract owner
     * @param _aavePool Address of the Aave lending pool
     */
    constructor(
        address initialOwner,
        address _aavePool
    ) Ownable(initialOwner) {
        if (_aavePool == address(0)) revert InvalidToken();
        AAVE_POOL = _aavePool;
    }

    /**
     * @dev Executes the flash loan operation
     * @param asset Address of the borrowed asset
     * @param amount Amount of the borrowed asset
     * @param premium Flash loan premium
     * @param initiator Address that initiated the flash loan
     * @param params Additional parameters for the operation
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override nonReentrant returns (bool) {
        if (msg.sender != AAVE_POOL) revert Unauthorized();
        if (initiator != address(this)) revert Unauthorized();

        // Decode deployment parameters
        (address targetContract, bytes memory deployData) = abi.decode(
            params,
            (address, bytes)
        );

        // Execute the deployment
        (bool success, ) = targetContract.call(deployData);
        if (!success) revert FailedDeployment();

        // Approve repayment with exact amount
        uint256 amountToRepay = amount + premium;
        IERC20(asset).approve(msg.sender, 0); // Clear previous allowance
        IERC20(asset).approve(msg.sender, amountToRepay);

        emit FlashLoanExecuted(asset, amount, premium, block.timestamp);
        return true;
    }

    /**
     * @dev Initiates a flash swap operation
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input token
     * @param amountOut Expected amount of output token
     * @param deployData Deployment data for the operation
     */
    function flashSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bytes calldata deployData
    ) external onlyOwner nonReentrant whenNotPaused {
        // Input validation
        if (!whitelistedTokens[tokenIn] || !whitelistedTokens[tokenOut]) 
            revert InvalidToken();
        if (amountIn == 0 || amountOut == 0) 
            revert InvalidAmount();
        if (block.timestamp < lastExecutionTime + MINIMUM_DELAY)
            revert TooEarlyExecution();

        // Check slippage
        uint256 minAmountOut = (amountOut * (10000 - slippageTolerance)) / 10000;
        if (IERC20(tokenOut).balanceOf(address(this)) < minAmountOut)
            revert ExcessiveSlippage();

        // Prepare flash loan parameters
        bytes memory params = abi.encode(tokenOut, deployData);
        
        // Update state
        lastExecutionTime = block.timestamp;

        // Request flash loan
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            tokenIn,
            amountIn,
            params,
            REFERRAL_CODE
        );

        emit FlashSwapExecuted(
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            block.timestamp
        );
    }

    /**
     * @dev Rescues tokens stuck in the contract
     * @param token Address of the token to rescue
     */
    function rescue(
        address token
    ) external onlyOwner nonReentrant {
        if (token == address(0)) revert InvalidToken();
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance == 0) revert InvalidAmount();
        
        if (!IERC20(token).transfer(owner(), balance)) 
            revert FailedTransfer();
    }

    /**
     * @dev Updates the whitelist status of a token
     * @param token Token address to update
     * @param status New whitelist status
     */
    function setTokenWhitelist(
        address token,
        bool status
    ) external onlyOwner {
        if (token == address(0)) revert InvalidToken();
        whitelistedTokens[token] = status;
        emit TokenWhitelisted(token, status);
    }

    /**
     * @dev Updates the slippage tolerance
     * @param newTolerance New slippage tolerance value (in basis points)
     */
    function setSlippageTolerance(
        uint256 newTolerance
    ) external onlyOwner {
        if (newTolerance > 1000) revert InvalidAmount(); // Max 10%
        uint256 oldTolerance = slippageTolerance;
        slippageTolerance = newTolerance;
        emit SlippageToleranceUpdated(oldTolerance, newTolerance);
    }

    /**
     * @dev Pauses the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Allows the contract to receive ETH
     */
    receive() external payable {}
}
