const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    const atomicFlashSwapAddress = "YOUR_ATOMIC_FLASH_SWAP_CONTRACT_ADDRESS"; // Replace with actual deployed address
    const atomicFlashSwap = await ethers.getContractAt("AtomicFlashSwap", atomicFlashSwapAddress);

    const tokenIn = "TOKEN_IN_ADDRESS"; // Replace with actual token address
    const tokenOut = "TOKEN_OUT_ADDRESS"; // Replace with actual token address
    const amountIn = ethers.utils.parseUnits("1.0", 18); // Example amount
    const amountOut = ethers.utils.parseUnits("0.9", 18); // Example amount

    const tx = await atomicFlashSwap.flashSwap(tokenIn, tokenOut, amountIn, amountOut);
    await tx.wait();

    console.log("Flash swap executed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
