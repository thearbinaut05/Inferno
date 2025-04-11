const { getGasPrice } = require('./gasHelper');

// Aave Pool addresses
const AAVE_POOL_ADDRESSES = {
    polygon: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    polygonMumbai: "0x0b913A76beFF3887d35073b8e5530755D60F78C7"
};

// USDC addresses
const USDC_ADDRESSES = {
    polygon: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    polygonMumbai: "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747"
};

// Whitelisted tokens for initial setup
const WHITELISTED_TOKENS = {
    polygon: [
        "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
        "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // WETH
        "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6"  // WBTC
    ],
    polygonMumbai: [
        "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747", // USDC
        "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa", // WETH
        "0x0d787a4a1548f673ed375445535a6c7A1EE56180"  // WBTC
    ]
};

async function waitForTransaction(tx) {
    console.log(`Waiting for transaction ${tx.hash} to be mined...`);
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    return receipt;
}

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with the account:", deployer.address);
        console.log("Account balance:", (await deployer.getBalance()).toString());

        // Get network specific addresses
        const network = hre.network.name;
        const aavePoolAddress = AAVE_POOL_ADDRESSES[network];
        const usdcAddress = USDC_ADDRESSES[network];
        const whitelistedTokens = WHITELISTED_TOKENS[network];

        if (!aavePoolAddress || !usdcAddress || !whitelistedTokens) {
            throw new Error(`Network ${network} not supported`);
        }

        // Get optimal gas price
        const gasPrice = await getGasPrice();
        console.log("Using gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

        // Deploy AtomicFlashSwapV2
        console.log("\nDeploying AtomicFlashSwapV2...");
        const AtomicFlashSwapV2 = await ethers.getContractFactory("AtomicFlashSwapV2");
        const atomicFlashSwap = await AtomicFlashSwapV2.deploy(
            deployer.address,
            aavePoolAddress,
            { gasPrice }
        );
        await waitForTransaction(atomicFlashSwap.deployTransaction);
        console.log("AtomicFlashSwapV2 deployed to:", atomicFlashSwap.address);

        // Whitelist tokens
        console.log("\nWhitelisting tokens...");
        for (const token of whitelistedTokens) {
            console.log(`Whitelisting token: ${token}`);
            const tx = await atomicFlashSwap.setTokenWhitelist(token, true, { gasPrice });
            await waitForTransaction(tx);
        }

        // Set initial slippage tolerance (0.5%)
        console.log("\nSetting initial slippage tolerance...");
        const tx = await atomicFlashSwap.setSlippageTolerance(50, { gasPrice });
        await waitForTransaction(tx);

        // Prepare deployment data for other contracts
        const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary");
        const rebalanceLibraryData = RebalanceLibrary.interface.encodeDeploy();

        const AgentCustomization = await ethers.getContractFactory("AgentCustomization");
        const agentCustomizationData = AgentCustomization.interface.encodeDeploy([
            deployer.address,
            1,
            1,
            1
        ]);

        // Calculate required flash loan amount (estimate gas * gas price)
        const estimatedGas = await ethers.provider.estimateGas({
            data: rebalanceLibraryData
        });
        const flashLoanAmount = estimatedGas.mul(gasPrice);

        // Execute flash loan for deployment
        console.log("\nExecuting flash loan for deployment...");
        const flashSwapTx = await atomicFlashSwap.flashSwap(
            usdcAddress,
            ethers.ZeroAddress,
            flashLoanAmount,
            0,
            rebalanceLibraryData,
            { gasPrice }
        );
        await waitForTransaction(flashSwapTx);

        // Log deployment summary
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("AtomicFlashSwapV2:", atomicFlashSwap.address);
        console.log("Network:", network);
        console.log("Aave Pool:", aavePoolAddress);
        console.log("Whitelisted Tokens:", whitelistedTokens.join(", "));
        console.log("Initial Slippage Tolerance: 0.5%");
        
        // Verify final balance
        console.log("\nFinal account balance:", (await deployer.getBalance()).toString());
        console.log("Deployment completed successfully!");

        // Return contract addresses for verification
        return {
            AtomicFlashSwapV2: atomicFlashSwap.address,
            AavePool: aavePoolAddress,
            USDC: usdcAddress
        };
    } catch (error) {
        console.error("Error during deployment:");
        console.error(error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
