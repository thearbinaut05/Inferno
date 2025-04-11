const { ethers } = require("hardhat");
const { getGasPrice } = require('./gasHelper');

// Token addresses on Polygon/Mumbai
const TOKENS = {
    polygon: {
        USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
        WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6"
    },
    polygonMumbai: {
        USDC: "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747",
        WETH: "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa",
        WBTC: "0x0d787a4a1548f673ed375445535a6c7A1EE56180"
    }
};

async function waitForTransaction(tx, description) {
    console.log(`Waiting for ${description} transaction ${tx.hash} to be mined...`);
    const receipt = await tx.wait();
    console.log(`${description} confirmed in block ${receipt.blockNumber}`);
    return receipt;
}

async function executeFlashSwap(
    contractAddress,
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    deployData
) {
    try {
        const [signer] = await ethers.getSigners();
        console.log("Executing flash swap with account:", signer.address);

        // Get network
        const network = hre.network.name;
        console.log("Network:", network);

        // Get optimal gas price
        const gasPrice = await getGasPrice();
        console.log("Using gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

        // Connect to the contract
        const AtomicFlashSwapV2 = await ethers.getContractFactory("AtomicFlashSwapV2");
        const flashSwap = AtomicFlashSwapV2.attach(contractAddress);

        // Verify token whitelist status
        const isTokenInWhitelisted = await flashSwap.whitelistedTokens(tokenIn);
        const isTokenOutWhitelisted = await flashSwap.whitelistedTokens(tokenOut);

        if (!isTokenInWhitelisted || !isTokenOutWhitelisted) {
            console.error("Error: Tokens not whitelisted");
            console.log("TokenIn whitelisted:", isTokenInWhitelisted);
            console.log("TokenOut whitelisted:", isTokenOutWhitelisted);
            return;
        }

        // Check if contract is paused
        const isPaused = await flashSwap.paused();
        if (isPaused) {
            console.error("Error: Contract is paused");
            return;
        }

        // Get current slippage tolerance
        const slippageTolerance = await flashSwap.slippageTolerance();
        console.log("Current slippage tolerance:", slippageTolerance.toString(), "basis points");

        // Calculate minimum amount out with slippage
        const minAmountOut = amountOut.mul(10000 - slippageTolerance).div(10000);
        console.log("Minimum amount out with slippage:", ethers.formatUnits(minAmountOut, 18));

        // Estimate gas for the flash swap
        const estimatedGas = await flashSwap.estimateGas.flashSwap(
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            deployData,
            { gasPrice }
        );
        console.log("Estimated gas:", estimatedGas.toString());

        // Execute flash swap
        console.log("\nExecuting flash swap...");
        console.log("Token In:", tokenIn);
        console.log("Token Out:", tokenOut);
        console.log("Amount In:", ethers.formatUnits(amountIn, 18));
        console.log("Expected Amount Out:", ethers.formatUnits(amountOut, 18));

        const tx = await flashSwap.flashSwap(
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            deployData,
            {
                gasPrice,
                gasLimit: estimatedGas.mul(120).div(100) // Add 20% buffer
            }
        );

        // Wait for transaction confirmation
        const receipt = await waitForTransaction(tx, "Flash swap");

        // Get event logs
        const flashSwapEvent = receipt.logs
            .filter(log => flashSwap.interface.parseLog(log))
            .find(log => log.topics[0] === flashSwap.interface.getEventTopic('FlashSwapExecuted'));

        if (flashSwapEvent) {
            const parsedEvent = flashSwap.interface.parseLog(flashSwapEvent);
            console.log("\nFlash Swap Details:");
            console.log("Token In:", parsedEvent.args.tokenIn);
            console.log("Token Out:", parsedEvent.args.tokenOut);
            console.log("Amount In:", ethers.formatUnits(parsedEvent.args.amountIn, 18));
            console.log("Amount Out:", ethers.formatUnits(parsedEvent.args.amountOut, 18));
            console.log("Timestamp:", new Date(parsedEvent.args.timestamp.toNumber() * 1000).toISOString());
        }

        console.log("\nFlash swap executed successfully!");
        return receipt;

    } catch (error) {
        console.error("Error executing flash swap:");
        console.error(error);
        throw error;
    }
}

// Example usage
async function main() {
    const network = hre.network.name;
    const networkTokens = TOKENS[network];

    if (!networkTokens) {
        throw new Error(`Network ${network} not supported`);
    }

    // Example parameters
    const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
    const tokenIn = networkTokens.USDC;
    const tokenOut = networkTokens.WETH;
    const amountIn = ethers.parseUnits("1000", 6); // 1000 USDC
    const amountOut = ethers.parseEther("0.5"); // 0.5 WETH
    const deployData = "0x"; // Example empty deployment data

    await executeFlashSwap(
        contractAddress,
        tokenIn,
        tokenOut,
        amountIn,
        amountOut,
        deployData
    );
}

// Export for external usage
module.exports = {
    executeFlashSwap
};

// Execute if running directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
