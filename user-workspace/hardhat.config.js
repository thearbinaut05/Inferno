require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");

// Network URLs
const POLYGON_MUMBAI_URL = "https://rpc-mumbai.maticvigil.com";
const POLYGON_MAINNET_URL = "https://polygon-rpc.com";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337,
      forking: {
        url: POLYGON_MAINNET_URL,
        enabled: true
      }
    },
    polygonMumbai: {
      url: POLYGON_MUMBAI_URL,
      chainId: 80001,
      gasPrice: "auto",
      accounts: ['0x1234567890123456789012345678901234567890123456789012345678901234'] // Test private key
    }
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
  }
};
