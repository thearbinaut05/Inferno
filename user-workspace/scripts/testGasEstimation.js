const { ethers } = require("hardhat");
const {
    getOptimalGasPrice,
    estimateDeploymentGas,
    estimateMethodGas,
    GAS_MARGINS
} = require('./gasHelper');

// Network-specific configurations
const NETWORK_CONFIG = {
    polygon: {
        aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        tokens: {
            USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
            WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6"
        }
    },
    mumbai: {
        aavePool: "0x0b913A76beFF3887d35073b8e5530755D60F78C7",
        tokens: {
            USDC: "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747",
            WETH: "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa",
            WBTC: "0x0d787a4a1548f673ed375445535a6c7A1EE56180"
        }
    }
};

async function testGasPrices() {
    console.log("\nTesting gas price estimation...");
    
    // Test different priority levels
    const priorities = ['safe', 'standard', 'fast'];
    for (const priority of priorities) {
        const gasPrice = await getOptimalGasPrice({
            priority,
            margin: GAS_MARGINS.SAFE
        });
        console.log(`${priority.toUpperCase()} gas price:`, ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
    }

    // Test with different margins
    const margins = [GAS_MARGINS.SAFE, GAS_MARGINS.URGENT, GAS_MARGINS.MAX];
    for (const margin of margins) {
        const gasPrice = await getOptimalGasPrice({ margin });
        console.log(`Gas price with ${margin}% margin:`, ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
    }
}

async function testDeploymentEstimation() {
    console.log("\nTesting deployment gas estimation...");

    const [deployer] = await ethers.getSigners();
    const network = hre.network.name;
    const networkConfig = NETWORK_CONFIG[network];

    if (!networkConfig) {
        throw new Error(`Unsupported network: ${network}`);
    }

    // Get contract factory
    const AtomicFlashSwapV2 = await ethers.getContractFactory("AtomicFlashSwapV2");

    // Test deployment estimation with different margins
    const margins = [GAS_MARGINS.SAFE, GAS_MARGINS.URGENT, GAS_MARGINS.MAX];
    for (const margin of margins) {
        const estimation = await estimateDeploymentGas(
            AtomicFlashSwapV2,
            [deployer.address, networkConfig.aavePool],
            { margin }
        );

        console.log(`\nDeployment estimation with ${margin}% margin:`);
        console.log('Estimated gas:', estimation.estimatedGas.toString());
        console.log('Gas price:', ethers.utils.formatUnits(estimation.gasPrice, 'gwei'), 'gwei');
        console.log('Total cost:', estimation.formattedCost, 'MATIC');
    }
}

async function testMethodEstimation() {
    console.log("\nTesting method gas estimation...");

    const [deployer] = await ethers.getSigners();
    const network = hre.network.name;
    const networkConfig = NETWORK_CONFIG[network];

    // Deploy a test contract
    const AtomicFlashSwapV2 = await ethers.getContractFactory("AtomicFlashSwapV2");
    const contract = await AtomicFlashSwapV2.deploy(deployer.address, networkConfig.aavePool);
    await contract.deployed();

    // Test different methods
    const methods = [
        {
            name: 'setTokenWhitelist',
            args: [networkConfig.tokens.USDC, true]
        },
        {
            name: 'setSlippageTolerance',
            args: [50] // 0.5%
        },
        {
            name: 'flashSwap',
            args: [
                networkConfig.tokens.USDC,
                networkConfig.tokens.WETH,
                ethers.utils.parseUnits('100', 6), // 100 USDC
                ethers.utils.parseEther('0.05'), // 0.05 WETH
                '0x' // Empty deployment data
            ]
        }
    ];

    for (const method of methods) {
        console.log(`\nEstimating gas for ${method.name}:`);
        
        try {
            const estimation = await estimateMethodGas(
                contract,
                method.name,
                method.args,
                { margin: GAS_MARGINS.SAFE }
            );

            console.log('Estimated gas:', estimation.estimatedGas.toString());
            console.log('Gas price:', ethers.utils.formatUnits(estimation.gasPrice, 'gwei'), 'gwei');
            console.log('Total cost:', estimation.formattedCost, 'MATIC');
        } catch (error) {
            console.log('Estimation failed:', error.message);
        }
    }
}

async function testFullDeployment() {
    console.log("\nTesting full deployment process...");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Current balance:", ethers.utils.formatEther(balance), "MATIC");

    // Get deployment estimation
    const AtomicFlashSwapV2 = await ethers.getContractFactory("AtomicFlashSwapV2");
    const network = hre.network.name;
    const networkConfig = NETWORK_CONFIG[network];

    const deploymentEstimation = await estimateDeploymentGas(
        AtomicFlashSwapV2,
        [deployer.address, networkConfig.aavePool],
        { margin: GAS_MARGINS.SAFE }
    );

    console.log("\nDeployment cost estimation:");
    console.log("Gas required:", deploymentEstimation.estimatedGas.toString());
    console.log("Gas price:", ethers.utils.formatUnits(deploymentEstimation.gasPrice, 'gwei'), "gwei");
    console.log("Total cost:", deploymentEstimation.formattedCost, "MATIC");

    // Estimate token whitelisting costs
    const mockContract = await AtomicFlashSwapV2.deploy(
        deployer.address,
        networkConfig.aavePool,
        { gasPrice: deploymentEstimation.gasPrice }
    );

    let totalWhitelistCost = ethers.BigNumber.from(0);
    for (const [symbol, address] of Object.entries(networkConfig.tokens)) {
        const estimation = await estimateMethodGas(
            mockContract,
            'setTokenWhitelist',
            [address, true],
            { margin: GAS_MARGINS.SAFE }
        );
        
        console.log(`\nWhitelisting ${symbol} cost estimation:`);
        console.log("Gas required:", estimation.estimatedGas.toString());
        console.log("Total cost:", estimation.formattedCost, "MATIC");
        
        totalWhitelistCost = totalWhitelistCost.add(estimation.totalCost);
    }

    const totalCost = deploymentEstimation.totalCost.add(totalWhitelistCost);
    console.log("\nTotal deployment process cost estimation:");
    console.log("Base deployment:", deploymentEstimation.formattedCost, "MATIC");
    console.log("Token whitelisting:", ethers.utils.formatEther(totalWhitelistCost), "MATIC");
    console.log("Total cost:", ethers.utils.formatEther(totalCost), "MATIC");

    if (balance.lt(totalCost)) {
        console.log("\n⚠️ WARNING: Insufficient funds for deployment");
        console.log("Required:", ethers.utils.formatEther(totalCost), "MATIC");
        console.log("Available:", ethers.utils.formatEther(balance), "MATIC");
    } else {
        console.log("\n✅ Sufficient funds available for deployment");
        console.log("Required:", ethers.utils.formatEther(totalCost), "MATIC");
        console.log("Available:", ethers.utils.formatEther(balance), "MATIC");
    }
}

async function main() {
    try {
        await testGasPrices();
        await testDeploymentEstimation();
        await testMethodEstimation();
        await testFullDeployment();
        
        console.log("\nAll gas estimation tests completed successfully!");
    } catch (error) {
        console.error("Error during gas estimation testing:", error);
        process.exit(1);
    }
}

// Execute if running directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = {
    testGasPrices,
    testDeploymentEstimation,
    testMethodEstimation,
    testFullDeployment
};
