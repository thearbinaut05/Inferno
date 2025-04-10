// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library RebalanceLibrary {
    function fibonacci(uint256 n) internal pure returns (uint256) {
        require(n > 0, "Input must be positive");
        if (n == 1) return 0;
        if (n == 2) return 1;
        uint256 a = 0;
        uint256 b = 1;
        for (uint256 i = 2; i < n; i++) {
            uint256 c = a + b;
            a = b;
            b = c;
        }
        return b;
    }

    function nearestExponent(uint256 value) internal pure returns (uint256) {
        // Logic to compute the nearest exponent approximation
        // Placeholder for actual implementation
        return value; // Replace with actual logic
    }
}
