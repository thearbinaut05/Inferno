const { ethers } = require("hardhat");

async function main() {
    const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545"); // Replace with your node URL
    const blockNumber = await provider.getBlockNumber();
    console.log("Connected to the blockchain. Current block number:", blockNumber);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
