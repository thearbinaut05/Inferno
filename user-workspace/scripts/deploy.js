async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy RebalanceLibrary first
    const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary");
    const rebalanceLibrary = await RebalanceLibrary.deploy();
    console.log("RebalanceLibrary deployed to:", rebalanceLibrary.address);

    // Deploy AtomicFlashSwap with deployer as owner
    const AtomicFlashSwap = await ethers.getContractFactory("AtomicFlashSwap");
    const atomicFlashSwap = await AtomicFlashSwap.deploy(deployer.address);
    console.log("AtomicFlashSwap deployed to:", atomicFlashSwap.address);

    // Deploy AgentCustomization with deployer as owner and initial parameters
    const AgentCustomization = await ethers.getContractFactory("AgentCustomization");
    const agentCustomization = await AgentCustomization.deploy(
        deployer.address,  // initialOwner
        1,                 // fibonacciBase
        1,                 // exponentThreshold
        1                  // riskFactor
    );
    console.log("AgentCustomization deployed to:", agentCustomization.address);

    // Log all deployment addresses for frontend configuration
    console.log("\nDeployment Summary:");
    console.log("--------------------");
    console.log("RebalanceLibrary:", rebalanceLibrary.address);
    console.log("AtomicFlashSwap:", atomicFlashSwap.address);
    console.log("AgentCustomization:", agentCustomization.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
