// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Bridge.sol";

/**
 * @title BridgeAttacker
 * @dev Contract to test reentrancy protection of the Bridge contract
 */
contract BridgeAttacker {
    Bridge public bridge;
    uint256 public attackCount;
    uint256 public constant ATTACK_ROUNDS = 3;

    event AttackStarted(uint256 amount);
    event AttackRound(uint256 round, uint256 balance);
    event AttackCompleted(uint256 finalBalance);

    constructor(address _bridge) {
        bridge = Bridge(_bridge);
    }

    // Function to start the attack
    function attack() external payable {
        require(msg.value > 0, "Need ETH to attack");
        emit AttackStarted(msg.value);

        // Initial deposit
        bridge.deposit{value: msg.value}();

        // Attempt withdrawal to trigger reentrancy
        bridge.withdraw(address(this), msg.value);
    }

    // Fallback function to attempt reentrancy
    receive() external payable {
        emit AttackRound(attackCount, address(this).balance);

        if (attackCount < ATTACK_ROUNDS) {
            attackCount++;
            // Try to withdraw again
            bridge.withdraw(address(this), msg.value);
        }
    }

    // Function to check attack results
    function getAttackStatus() external view returns (
        uint256 attackerBalance,
        uint256 bridgeBalance,
        uint256 rounds
    ) {
        return (
            address(this).balance,
            address(bridge).balance,
            attackCount
        );
    }

    // Function to withdraw stolen funds
    function withdraw(address to) external {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = to.call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit AttackCompleted(balance);
    }
}
