// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IFlashLoanSimpleReceiver.sol";
import "./interfaces/IPool.sol";

contract AtomicFlashSwap is Ownable, IFlashLoanSimpleReceiver {
    address public immutable AAVE_POOL;
    mapping(address => uint256) public tokenBalances;

    event FlashSwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium);

    constructor(address initialOwner, address _aavePool) Ownable(initialOwner) {
        AAVE_POOL = _aavePool;
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == AAVE_POOL, "Caller must be Aave pool");
        require(initiator == address(this), "Initiator must be this contract");

        // Decode deployment parameters from flash loan params
        (address targetContract, bytes memory deployData) = abi.decode(params, (address, bytes));

        // Execute the deployment
        (bool success, ) = targetContract.call(deployData);
        require(success, "Deployment failed");

        // Approve repayment
        uint256 amountToRepay = amount + premium;
        IERC20(asset).approve(msg.sender, amountToRepay);

        emit FlashLoanExecuted(asset, amount, premium);
        return true;
    }

    function flashSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bytes calldata deployData
    ) external onlyOwner {
        require(amountIn > 0, "Invalid amountIn");
        require(amountOut > 0, "Invalid amountOut");

        // Prepare flash loan parameters
        bytes memory params = abi.encode(tokenOut, deployData);

        // Request flash loan from Aave
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            tokenIn,
            amountIn,
            params,
            0 // referral code
        );

        emit FlashSwapExecuted(tokenIn, tokenOut, amountIn, amountOut);
    }

    // Function to handle incoming tokens
    function rescue(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to rescue");
        IERC20(token).transfer(owner(), balance);
    }

    // Function to handle incoming ETH
    receive() external payable {}
}
