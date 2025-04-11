const { getGasPrice } = require('./gasHelper');

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

        // Get optimal gas price
        const gasPrice = await getGasPrice();
        console.log("Using gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

        // Deploy RebalanceLibrary first
        console.log("\nDeploying RebalanceLibrary...");
        const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary");
        const rebalanceLibrary = await RebalanceLibrary.deploy({ gasPrice });
        await waitForTransaction(rebalanceLibrary.deployTransaction);
        console.log("RebalanceLibrary deployed to:", rebalanceLibrary.address);

        // Deploy AtomicFlashSwap with deployer as owner
        console.log("\nDeploying AtomicFlashSwap...");
        const AtomicFlashSwap = await ethers.getContractFactory("AtomicFlashSwap");
        const atomicFlashSwap = await AtomicFlashSwap.deploy(deployer.address, { gasPrice });
        await waitForTransaction(atomicFlashSwap.deployTransaction);
        console.log("AtomicFlashSwap deployed to:", atomicFlashSwap.address);

        // Deploy AgentCustomization with deployer as owner and initial parameters
        console.log("\nDeploying AgentCustomization...");
        const AgentCustomization = await ethers.getContractFactory("AgentCustomization");
        const agentCustomization = await AgentCustomization.deploy(
            deployer.address,  // initialOwner
            1,                 // fibonacciBase
            1,                 // exponentThreshold
            1,                 // riskFactor
            { gasPrice }
        );
        await waitForTransaction(agentCustomization.deployTransaction);
        console.log("AgentCustomization deployed to:", agentCustomization.address);

        // Log all deployment addresses for frontend configuration
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("RebalanceLibrary:", rebalanceLibrary.address);
        console.log("AtomicFlashSwap:", atomicFlashSwap.address);
        console.log("AgentCustomization:", agentCustomization.address);

        // Verify final deployer balance
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
