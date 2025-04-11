// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Bridge
 * @dev Contract for bridging tokens between networks
 */
contract Bridge is Ownable, ReentrancyGuard {
    // Events
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event TokensLocked(address indexed token, address indexed from, uint256 amount);
    event TokensUnlocked(address indexed token, address indexed to, uint256 amount);

    // Mapping to track user balances
    mapping(address => uint256) private balances;
    // Mapping to track token balances
    mapping(address => mapping(address => uint256)) private tokenBalances;

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Deposit ETH into the bridge
     */
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Must deposit some ETH");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw ETH from the bridge
     * @param to Address to withdraw to
     * @param amount Amount to withdraw
     */
    function withdraw(address to, uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(to != address(0), "Invalid address");
        
        balances[msg.sender] -= amount;
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(to, amount);
    }

    /**
     * @dev Lock tokens in the bridge
     * @param token Token address
     * @param amount Amount to lock
     */
    function lockTokens(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Must lock some tokens");
        
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        tokenBalances[token][msg.sender] += amount;
        
        emit TokensLocked(token, msg.sender, amount);
    }

    /**
     * @dev Unlock tokens from the bridge
     * @param token Token address
     * @param to Address to unlock to
     * @param amount Amount to unlock
     */
    function unlockTokens(address token, address to, uint256 amount) external nonReentrant {
        require(token != address(0), "Invalid token address");
        require(to != address(0), "Invalid address");
        require(tokenBalances[token][msg.sender] >= amount, "Insufficient balance");
        
        tokenBalances[token][msg.sender] -= amount;
        IERC20(token).transfer(to, amount);
        
        emit TokensUnlocked(token, to, amount);
    }

    /**
     * @dev Get ETH balance
     * @param account Address to check
     * @return balance Current balance
     */
    function getBalance(address account) external view returns (uint256) {
        return balances[account];
    }

    /**
     * @dev Get token balance
     * @param token Token address
     * @param account Address to check
     * @return balance Current token balance
     */
    function getTokenBalance(address token, address account) external view returns (uint256) {
        return tokenBalances[token][account];
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
}
