// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IPool.sol";
import "../interfaces/IFlashLoanSimpleReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockAavePool is IPool {
    address private constant MOCK_ADDRESS_PROVIDER = address(0x1234567890123456789012345678901234567890);
    uint16 private constant MOCK_REFERRAL_CODE = 0;

    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external override {
        require(referralCode == MOCK_REFERRAL_CODE, "Invalid referral code");
        
        // Transfer tokens to receiver (simulating flash loan)
        IERC20(asset).transfer(receiverAddress, amount);

        // Calculate premium (0.09% as per Aave v3)
        uint256 premium = (amount * 9) / 10000;

        // Execute operation on receiver
        bool success = IFlashLoanSimpleReceiver(receiverAddress).executeOperation(
            asset,
            amount,
            premium,
            msg.sender,
            params
        );
        require(success, "Flash loan execution failed");

        // Verify repayment
        require(
            IERC20(asset).balanceOf(address(this)) >= amount + premium,
            "Flash loan not repaid"
        );
    }

    function ADDRESSES_PROVIDER() external pure override returns (address) {
        return MOCK_ADDRESS_PROVIDER;
    }

    // Helper function to receive tokens for testing
    function mockReceiveTokens(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }
}
