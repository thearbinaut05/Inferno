// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/access/Ownable.sol";

contract AgentCustomization is Ownable {
    uint256 public fibonacciBase;
    uint256 public exponentThreshold;
    uint256 public riskFactor;

    event ParametersUpdated(uint256 fibonacciBase, uint256 exponentThreshold, uint256 riskFactor);

    constructor(uint256 _fibonacciBase, uint256 _exponentThreshold, uint256 _riskFactor) {
        fibonacciBase = _fibonacciBase;
        exponentThreshold = _exponentThreshold;
        riskFactor = _riskFactor;
    }

    function updateParameters(uint256 _fibonacciBase, uint256 _exponentThreshold, uint256 _riskFactor) external onlyOwner {
        fibonacciBase = _fibonacciBase;
        exponentThreshold = _exponentThreshold;
        riskFactor = _riskFactor;

        emit ParametersUpdated(fibonacciBase, exponentThreshold, riskFactor);
    }
}
