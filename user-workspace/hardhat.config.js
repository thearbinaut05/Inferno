require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("solidity-coverage");

// Network URLs
const INFURA_API_URL = "https://mainnet.infura.io/v3/fe2c057b95cc46669a701a31ab7fcc1f";
const POLYGON_MUMBAI_URL = "https://rpc-mumbai.maticvigil.com";
const POLYGON_MAINNET_URL = "https://polygon-rpc.com";
const GAS_API_URL = "https://gas.api.infura.io/v3/fe2c057b95cc46669a701a31ab7fcc1f";

// Contract verification
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "dhfoDgvulfnTUtnIf"
          }
        }
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
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },
    polygonMumbai: {
      url: POLYGON_MUMBAI_URL,
      chainId: 80001,
      gasPrice: "auto",
      gasMultiplier: 1.2,
      accounts: ['0x1234567890123456789012345678901234567890123456789012345678901234'] // Temporary private key for testing
    },
    polygon: {
      url: POLYGON_MAINNET_URL,
      chainId: 137,
      gasPrice: "auto",
      gasMultiplier: 1.2
    },
    mainnet: {
      url: INFURA_API_URL,
      gasReporter: {
        enabled: true,
        gasPrice: {
          url: GAS_API_URL,
          token: 'ETH'
        }
      },
      chainId: 1
    }
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
