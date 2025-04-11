const { ethers } = require("hardhat");
const Web3 = require('web3');
const fetch = require('node-fetch');
const fs = require('fs');

// Network configurations
const NETWORKS = {
    goerli: {
        rpc: 'https://goerli.infura.io/v3/fe2c057b95cc46669a701a31ab7fcc1f',
        faucets: [
            'https://faucet.goerli.mudit.blog',
            'https://goerli-faucet.slock.it',
            'https://faucet.goerli.io'
        ],
        gasLimit: 3000000,
        confirmations: 2
    },
    mumbai: {
        rpc: 'https://rpc-mumbai.maticvigil.com',
        faucets: [
            'https://faucet.polygon.technology',
            'https://mumbaifaucet.com'
        ],
        gasLimit: 5000000,
        confirmations: 5
    }
};

async function estimateDeploymentGas() {
    const Bridge = await ethers.getContractFactory("Bridge");
    const deploymentGas = await ethers.provider.estimateGas(
        Bridge.getDeployTransaction().data
    );
    
    // Get current gas price with 20% buffer
    const gasPrice = (await ethers.provider.getGasPrice()).mul(120).div(100);
    
    return {
        estimatedGas: deploymentGas,
        gasPrice: gasPrice,
        totalCost: deploymentGas.mul(gasPrice)
    };
}

async function deployBridge() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    
    // Get deployment cost estimation
    const { estimatedGas, gasPrice, totalCost } = await estimateDeploymentGas();
    console.log("\nEstimated deployment costs:");
    console.log("Gas units:", estimatedGas.toString());
    console.log("Gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("Total cost:", ethers.utils.formatEther(totalCost), "ETH");

    // Check if we have sufficient funds
    const balance = await deployer.getBalance();
    if (balance.lt(totalCost)) {
        throw new Error(`Insufficient funds. Need ${ethers.utils.formatEther(totalCost)} ETH but have ${ethers.utils.formatEther(balance)} ETH`);
    }

    // Deploy contract
    const Bridge = await ethers.getContractFactory("Bridge");
    const bridge = await Bridge.deploy({
        gasLimit: estimatedGas.mul(120).div(100), // Add 20% buffer
        gasPrice
    });

    console.log("Bridge deployment transaction:", bridge.deployTransaction.hash);
    await bridge.deployed();
    console.log("Bridge deployed to:", bridge.address);

    return bridge.address;
}

async function createNewAccount() {
    const network = hre.network.name;
    const web3 = new Web3(NETWORKS[network].rpc);
    
    console.log("\nCreating new account...");
    const account = web3.eth.accounts.create();
    
    // Save account details securely
    const accountInfo = {
        network,
        address: account.address,
        privateKey: account.privateKey,
        createdAt: new Date().toISOString()
    };

    const filename = `account_${network}_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(accountInfo, null, 2));
    console.log(`Account details saved to ${filename}`);

    return account;
}

async function requestFaucet(faucetUrl, address) {
    try {
        console.log(`\nRequesting tokens from ${faucetUrl}...`);
        const response = await fetch(faucetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Response from ${faucetUrl}:`, data);
        return true;
    } catch (error) {
        console.warn(`Failed to request from ${faucetUrl}:`, error.message);
        return false;
    }
}

async function requestTestTokens(account) {
    const network = hre.network.name;
    const networkConfig = NETWORKS[network];

    if (!networkConfig) {
        throw new Error(`Unsupported network: ${network}`);
    }

    console.log(`\nRequesting test tokens for ${account} on ${network}...`);
    let successfulRequests = 0;

    for (const faucet of networkConfig.faucets) {
        const success = await requestFaucet(faucet, account);
        if (success) successfulRequests++;
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 60000));
    }

    if (successfulRequests === 0) {
        throw new Error("Failed to request tokens from any faucet");
    }

    return successfulRequests;
}

async function bridgeTokens(bridgeAddress, account) {
    try {
        const bridge = await ethers.getContractAt("Bridge", bridgeAddress);
        const mainnetAddress = '0xE2Cb20b711b2406167601a22c391E773313DA335';
        
        // Get current balance
        const balance = await bridge.getBalance(account.address);
        console.log(`Current bridge balance: ${ethers.utils.formatEther(balance)} ETH`);

        if (balance.gt(0)) {
            // Estimate gas for withdrawal
            const gasEstimate = await bridge.estimateGas.withdraw(mainnetAddress, balance);
            const gasPrice = await ethers.provider.getGasPrice();
            
            // Add 20% buffer to gas estimate
            const gasLimit = gasEstimate.mul(120).div(100);
            
            console.log("\nWithdrawal transaction details:");
            console.log("Gas limit:", gasLimit.toString());
            console.log("Gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");

            // Execute withdrawal
            const withdrawTx = await bridge.connect(account).withdraw(
                mainnetAddress,
                balance,
                {
                    gasLimit,
                    gasPrice
                }
            );

            console.log("Withdrawal transaction:", withdrawTx.hash);
            const receipt = await withdrawTx.wait();
            console.log(`Successfully bridged ${ethers.utils.formatEther(balance)} ETH to ${mainnetAddress}`);
            
            return receipt;
        } else {
            console.log("No tokens available to bridge");
            return null;
        }
    } catch (error) {
        console.error("Error during token bridging:", error);
        throw error;
    }
}

async function main() {
    try {
        // Step 1: Deploy the bridge contract
        console.log("\nStep 1: Deploying bridge contract...");
        const bridgeAddress = await deployBridge();

        // Step 2: Create a new Ethereum account
        console.log("\nStep 2: Creating new Ethereum account...");
        const newAccount = await createNewAccount();

        // Step 3: Request test tokens for the new account
        console.log("\nStep 3: Requesting test tokens...");
        await requestTestTokens(newAccount.address);

        // Step 4: Bridge tokens using the new account
        console.log("\nStep 4: Bridging tokens...");
        const wallet = new ethers.Wallet(newAccount.privateKey, ethers.provider);
        await bridgeTokens(bridgeAddress, wallet);

        console.log("\nDeployment and setup completed successfully!");
        return {
            bridgeAddress,
            newAccountAddress: newAccount.address,
            network: hre.network.name
        };
    } catch (error) {
        console.error("\nError during deployment and setup:", error);
        throw error;
    }
}

// Execute if running directly
if (require.main === module) {
    main()
        .then((result) => {
            console.log("\nFinal Result:", result);
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = {
    deployBridge,
    createNewAccount,
    requestTestTokens,
    bridgeTokens,
    estimateDeploymentGas
};
