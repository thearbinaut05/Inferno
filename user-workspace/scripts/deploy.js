async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const AtomicFlashSwap = await ethers.getContractFactory("AtomicFlashSwap");
    const atomicFlashSwap = await AtomicFlashSwap.deploy();
    console.log("AtomicFlashSwap deployed to:", atomicFlashSwap.address);

    const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary");
    const rebalanceLibrary = await RebalanceLibrary.deploy();
    console.log("RebalanceLibrary deployed to:", rebalanceLibrary.address);

    const AgentCustomization = await ethers.getContractFactory("AgentCustomization");
    const agentCustomization = await AgentCustomization.deploy(1, 1, 1); // Initial parameters
    console.log("AgentCustomization deployed to:", agentCustomization.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
