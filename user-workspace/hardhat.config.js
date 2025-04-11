require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-ignition");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

const INFURA_API_URL = "https://mainnet.infura.io/v3/fe2c057b95cc46669a701a31ab7fcc1f";
const PRIVATE_KEY = "0xdfd7089febbacf7ba0bc227dafffa9fc08a93fd68e424f1cef23656c";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },
    mainnet: {
      url: INFURA_API_URL,
      accounts: [PRIVATE_KEY],
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
