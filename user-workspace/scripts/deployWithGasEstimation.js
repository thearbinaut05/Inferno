const { ethers } = require("hardhat");
const Web3 = require('web3');
const fetch = require('node-fetch');
const fs = require('fs');

// Network-specific addresses
const NETWORK_CONFIG = {
    polygon: {
        aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        weth: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
        wbtc: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
        rpc: "https://polygon-rpc.com"
    },
    mumbai: {
        aavePool: "0x0b913A76beFF3887d35073b8e5530755D60F78C7",
        usdc: "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747",
        weth: "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa",
        wbtc: "0x0d787a4a1548f673ed375445535a6c7A1EE56180",
        rpc: "https://rpc-mumbai.maticvigil.com"
    }
};

async function createDeploymentWallet() {
    console.log("\nCreating deployment wallet...");
    const network = harden.network.name;
    const web3 = new Web3(NETWORK_CONFIG[network].rpc);
    const account = web3.eth.accounts.create();
    
    // Save wallet details securely
    const walletInfo = {
        address: account.address,
        privateKey: account.privateKey,
        network: network,
        timestamp: new Date().toISOString()
    };

    const filename = `deployment-wallet-${network}-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(walletInfo, null, 2));
    console.log(`Deployment wallet created and saved to ${filename}`);
    
    return account;
}

async function requestTestTokens(address, network) {
    if (network !== 'mumbai') return;

    console.log("\nRequesting test tokens from faucets...");
    const faucets = [
        'https://faucet.polygon.technology',
        'https://faucet.quickswap.exchange',
        'https://faucet.matic.network'
    ];

    for (const faucet of faucets) {
        try {
            console.log(`Requesting tokens from ${faucet}...`);
            const response = await fetch(`${faucet}/api/getTokens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, network: 'mumbai' })
            });
            console.log(`Response from ${faucet}:`, await response.text());
            // Wait between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 10000));
        } catch (error) {
            console.warn(`Failed to request from ${faucet}:`, error.message);
        }
    }
}

async function estimateDeploymentCosts(signer, networkConfig) {
    console.log("\nEstimating deployment costs...");
    
    const AtomicFlashSwapV2 = await ethers.getContractFactory("AtomicFlashSwapV2");
    const deploymentData = AtomicFlashSwapV2.interface.encodeDeploy([
        signer.address,
        networkConfig.aavePool
    ]);

    // Estimate gas for contract deployment
    const deploymentGas = await ethers.provider.estimateGas({
        data: deploymentData
    });

    // Get current gas price with 20% buffer for volatility
    const gasPrice = (await ethers.provider.getGasPrice()).mul(120).div(100);
    
    // Calculate total deployment cost
    const deploymentCost = deploymentGas.mul(gasPrice);
    
    // Estimate gas for token whitelisting
    const mockContract = await AtomicFlashSwapV2.deploy(
        signer.address,
        networkConfig.aavePool,
        { gasPrice }
    );
    
    const whitelistGas = await mockContract.estimateGas.setTokenWhitelist(
        networkConfig.usdc,
        true
    );

    // Calculate total cost for whitelisting all tokens
    const tokensToWhitelist = [networkConfig.usdc, networkConfig.weth, networkConfig.wbtc];
    const totalWhitelistGas = whitelistGas.mul(tokensToWhitelist.length);
    const whitelistCost = totalWhitelistGas.mul(gasPrice);

    const totalCost = deploymentCost.add(whitelistCost);

    console.log("\nEstimated deployment costs:");
    console.log(`Base deployment: ${ethers.utils.formatEther(deploymentCost)} MATIC`);
    console.log(`Token whitelisting: ${ethers.utils.formatEther(whitelistCost)} MATIC`);
    console.log(`Total estimated cost: ${ethers.utils.formatEther(totalCost)} MATIC`);

    return { deploymentGas, gasPrice, totalCost };
}

async function deployContract(signer, networkConfig, gasPrice) {
    console.log("\nDeploying AtomicFlashSwapV2...");
    const AtomicFlashSwapV2 = await ethers.getContractFactory("AtomicFlashSwapV2");
    
    const contract = await AtomicFlashSwapV2.deploy(
        signer.address,
        networkConfig.aavePool,
        { gasPrice }
    );

    console.log(`Deployment transaction hash: ${contract.deployTransaction.hash}`);
    await contract.deployed();
    console.log(`Contract deployed to: ${contract.address}`);

    // Whitelist tokens
    console.log("\nWhitelisting tokens...");
    const tokens = [
        { symbol: 'USDC', address: networkConfig.usdc },
        { symbol: 'WETH', address: networkConfig.weth },
        { symbol: 'WBTC', address: networkConfig.wbtc }
    ];

    for (const token of tokens) {
        console.log(`Whitelisting ${token.symbol}...`);
        const tx = await contract.setTokenWhitelist(token.address, true, { gasPrice });
        await tx.wait();
        console.log(`${token.symbol} whitelisted successfully`);
    }

    // Set initial slippage tolerance (0.5%)
    console.log("\nSetting initial slippage tolerance...");
    const slippageTx = await contract.setSlippageTolerance(50, { gasPrice });
    await slippageTx.wait();

    return contract;
}

async function verifyDeployment(contract, networkConfig) {
    console.log("\nVerifying deployment...");

    // Verify contract owner
    const owner = await contract.owner();
    console.log(`Contract owner: ${owner}`);

    // Verify AAVE pool
    const aavePool = await contract.AAVE_POOL();
    console.log(`AAVE pool address: ${aavePool}`);

    // Verify whitelisted tokens
    const tokens = [
        { symbol: 'USDC', address: networkConfig.usdc },
        { symbol: 'WETH', address: networkConfig.weth },
        { symbol: 'WBTC', address: networkConfig.wbtc }
    ];

    console.log("\nVerifying whitelisted tokens:");
    for (const token of tokens) {
        const isWhitelisted = await contract.whitelistedTokens(token.address);
        console.log(`${token.symbol}: ${isWhitelisted ? 'Whitelisted' : 'Not whitelisted'}`);
    }

    // Verify slippage tolerance
    const slippage = await contract.slippageTolerance();
    console.log(`\nSlippage tolerance: ${slippage}bp (${slippage/100}%)`);

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: contract.address,
        owner: owner,
        aavePool: aavePool,
        whitelistedTokens: tokens.reduce((acc, token) => ({
            ...acc,
            [token.symbol]: token.address
        }), {}),
        deploymentTime: new Date().toISOString()
    };

    const filename = `deployment-info-${hre.network.name}-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment information saved to ${filename}`);
}

async function main() {
    try {
        const network = hre.network.name;
        const networkConfig = NETWORK_CONFIG[network];
        
        if (!networkConfig) {
            throw new Error(`Unsupported network: ${network}`);
        }

        console.log(`Deploying to ${network.toUpperCase()}`);
        console.log("Network configuration:", networkConfig);

        // Get or create deployment wallet
        const [deployer] = await ethers.getSigners();
        console.log("\nDeployer address:", deployer.address);
        const balance = await deployer.getBalance();
        console.log("Current balance:", ethers.utils.formatEther(balance), "MATIC");

        // Request test tokens if on testnet
        if (network === 'mumbai') {
            await requestTestTokens(deployer.address, network);
        }

        // Estimate deployment costs
        const { gasPrice, totalCost } = await estimateDeploymentCosts(
            deployer,
            networkConfig
        );

        // Check if we have sufficient funds
        if (balance.lt(totalCost)) {
            throw new Error(`Insufficient funds. Need ${ethers.utils.formatEther(totalCost)} MATIC but have ${ethers.utils.formatEther(balance)} MATIC`);
        }

        // Deploy contract
        const contract = await deployContract(deployer, networkConfig, gasPrice);

        // Verify deployment
        await verifyDeployment(contract, networkConfig);

        console.log("\nDeployment completed successfully!");
        return {
            network,
            contractAddress: contract.address,
            deployerAddress: deployer.address
        };

    } catch (error) {
        console.error("\nDeployment failed:", error);
        process.exit(1);
    }
}

// Execute deployment
if (require.main === module) {
    main()
        .then((result) => {
            console.log("\nDeployment Result:", result);
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = {
    deployContract,
    estimateDeploymentCosts,
    createDeploymentWallet,
    requestTestTokens
};
