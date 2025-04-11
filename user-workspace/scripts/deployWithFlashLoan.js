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

        if (!aavePoolAddress || !usdcAddress) {
            throw new Error(`Network ${network} not supported`);
        }

        // Get optimal gas price
        const gasPrice = await getGasPrice();
        console.log("Using gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

        // Deploy AtomicFlashSwap first
        console.log("\nDeploying AtomicFlashSwap...");
        const AtomicFlashSwap = await ethers.getContractFactory("AtomicFlashSwap");
        const atomicFlashSwap = await AtomicFlashSwap.deploy(
            deployer.address,
            aavePoolAddress,
            { gasPrice }
        );
        await waitForTransaction(atomicFlashSwap.deployTransaction);
        console.log("AtomicFlashSwap deployed to:", atomicFlashSwap.address);

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
            ethers.constants.AddressZero,
            flashLoanAmount,
            0,
            rebalanceLibraryData,
            { gasPrice }
        );
        await waitForTransaction(flashSwapTx);

        // Log deployment summary
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("AtomicFlashSwap:", atomicFlashSwap.address);
        console.log("Network:", network);
        console.log("Aave Pool:", aavePoolAddress);
        
        // Verify final balance
        console.log("\nFinal account balance:", (await deployer.getBalance()).toString());
        console.log("Deployment completed successfully!");
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
