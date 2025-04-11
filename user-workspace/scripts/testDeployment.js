const { ethers } = require("hardhat");

async function main() {
    try {
        console.log("Starting deployment test on Polygon Mumbai...");

        // Get the test MATIC faucet URL
        console.log("\nTo get test MATIC, visit:");
        console.log("1. Mumbai Faucet: https://faucet.polygon.technology/");
        console.log("2. Alchemy Faucet: https://mumbaifaucet.com/");

        // Get test USDC faucet
        console.log("\nTo get test USDC, visit:");
        console.log("Polygon Mumbai USDC Faucet: https://faucet.circle.com/");

        const [deployer] = await ethers.getSigners();
        console.log("\nDeployer address:", deployer.address);
        const balance = await deployer.getBalance();
        console.log("MATIC Balance:", ethers.formatEther(balance), "MATIC");

        // Check USDC balance
        const USDC_ADDRESS = "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747";
        const USDC = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        const usdcBalance = await USDC.balanceOf(deployer.address);
        console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");

        // Verify Aave Pool connection
        const AAVE_POOL = "0x0b913A76beFF3887d35073b8e5530755D60F78C7";
        const pool = await ethers.getContractAt("IPool", AAVE_POOL);
        try {
            await pool.ADDRESSES_PROVIDER();
            console.log("\nAave Pool connection successful!");
        } catch (error) {
            console.error("Error connecting to Aave Pool:", error.message);
        }

        // Estimate gas costs
        const AtomicFlashSwap = await ethers.getContractFactory("AtomicFlashSwap");
        const deploymentGas = await ethers.provider.estimateGas(
            AtomicFlashSwap.getDeployTransaction(deployer.address, AAVE_POOL)
        );
        
        const gasPrice = await ethers.provider.getGasPrice();
        const estimatedCost = deploymentGas.mul(gasPrice);
        
        console.log("\nEstimated deployment costs:");
        console.log("Gas units:", deploymentGas.toString());
        console.log("Gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
        console.log("Total cost:", ethers.formatEther(estimatedCost), "MATIC");

        if (balance.lt(estimatedCost)) {
            console.log("\n⚠️ WARNING: Insufficient MATIC for deployment");
            console.log("Please get more MATIC from the faucet");
        } else {
            console.log("\n✅ Sufficient funds for deployment");
        }

    } catch (error) {
        console.error("\nTest failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
