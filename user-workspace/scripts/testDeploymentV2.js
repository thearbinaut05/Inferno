const { ethers } = require("hardhat");

async function main() {
    try {
        console.log("Starting V2 deployment test on Polygon Mumbai...");

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

        // Test token whitelist
        const WHITELISTED_TOKENS = [
            "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747", // USDC
            "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa", // WETH
            "0x0d787a4a1548f673ed375445535a6c7A1EE56180"  // WBTC
        ];

        // Estimate gas costs for V2
        const AtomicFlashSwapV2 = await ethers.getContractFactory("AtomicFlashSwapV2");
        const deploymentGas = await ethers.provider.estimateGas(
            AtomicFlashSwapV2.getDeployTransaction(deployer.address, AAVE_POOL)
        );
        
        const gasPrice = await ethers.provider.getGasPrice();
        const estimatedCost = deploymentGas.mul(gasPrice);
        
        console.log("\nEstimated V2 deployment costs:");
        console.log("Gas units:", deploymentGas.toString());
        console.log("Gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
        console.log("Base deployment cost:", ethers.formatEther(estimatedCost), "MATIC");

        // Estimate additional costs for token whitelisting
        const mockContract = await AtomicFlashSwapV2.deploy(deployer.address, AAVE_POOL);
        const whitelistGas = await mockContract.estimateGas.setTokenWhitelist(WHITELISTED_TOKENS[0], true);
        const totalWhitelistGas = whitelistGas.mul(WHITELISTED_TOKENS.length);
        const whitelistCost = totalWhitelistGas.mul(gasPrice);

        console.log("\nAdditional costs for whitelisting tokens:");
        console.log("Gas per token:", whitelistGas.toString());
        console.log("Total whitelist cost:", ethers.formatEther(whitelistCost), "MATIC");

        const totalCost = estimatedCost.add(whitelistCost);
        console.log("\nTotal estimated cost:", ethers.formatEther(totalCost), "MATIC");

        if (balance.lt(totalCost)) {
            console.log("\n⚠️ WARNING: Insufficient MATIC for deployment");
            console.log("Required:", ethers.formatEther(totalCost), "MATIC");
            console.log("Available:", ethers.formatEther(balance), "MATIC");
            console.log("Please get more MATIC from the faucet");
        } else {
            console.log("\n✅ Sufficient funds for deployment");
            console.log("Required:", ethers.formatEther(totalCost), "MATIC");
            console.log("Available:", ethers.formatEther(balance), "MATIC");
        }

        // Test flash loan parameters
        console.log("\nTesting flash loan parameters...");
        const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary");
        const rebalanceLibraryData = RebalanceLibrary.interface.encodeDeploy();
        
        try {
            const flashLoanAmount = deploymentGas.mul(gasPrice);
            await mockContract.estimateGas.flashSwap(
                USDC_ADDRESS,
                ethers.ZeroAddress,
                flashLoanAmount,
                0,
                rebalanceLibraryData
            );
            console.log("✅ Flash loan parameters validation successful");
        } catch (error) {
            console.error("❌ Flash loan parameters validation failed:", error.message);
        }

        console.log("\nTest deployment checks completed!");

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
