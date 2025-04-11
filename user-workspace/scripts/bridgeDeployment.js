const { ethers } = require("hardhat");
const Web3 = require('web3');
const fetch = require('node-fetch');
const fs = require('fs');

// Faucet URLs and configurations
const FAUCETS = {
    goerli: [
        'https://faucet.goerli.mudit.blog',
        'https://goerli-faucet.slock.it',
        'https://faucet.goerli.io'
    ],
    mumbai: [
        'https://faucet.polygon.technology',
        'https://mumbaifaucet.com'
    ]
};

async function deployBridge() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const Bridge = await ethers.getContractFactory("Bridge");
    const bridge = await Bridge.deploy();

    console.log("Bridge deployed to:", bridge.address);
    return bridge.address;
}

async function createNewAccount() {
    const web3 = new Web3('https://goerli.infura.io/v3/fe2c057b95cc46669a701a31ab7fcc1f');
    const newAccount = web3.eth.accounts.create();
    console.log("New Ethereum address:", newAccount.address);
    return newAccount;
}

async function requestFaucet(faucetUrl, address) {
    try {
        const response = await fetch(faucetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address })
        });
        const data = await response.json();
        console.log(`Faucet response from ${faucetUrl}: ${JSON.stringify(data)}`);
    } catch (error) {
        console.warn(`Failed to request from ${faucetUrl}:`, error.message);
    }
}

async function requestTestTokens(account, network = 'goerli') {
    console.log(`Requesting test tokens for ${account} on ${network}...`);
    const faucets = FAUCETS[network];

    if (!faucets) {
        throw new Error(`No faucets configured for network: ${network}`);
    }

    for (const faucet of faucets) {
        await requestFaucet(faucet, account);
        // Wait between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 60000));
    }
}

async function bridgeTokens(bridgeAddress, newAccount) {
    const bridge = await ethers.getContractAt("Bridge", bridgeAddress);
    const mainnetAddress = '0xE2Cb20b711b2406167601a22c391E773313DA335';
    const balance = await bridge.getBalance(newAccount.address);

    if (balance.gt(0)) {
        const withdrawTx = await bridge.connect(newAccount).withdraw(mainnetAddress, balance);
        await withdrawTx.wait();
        console.log(`Bridged ${ethers.utils.formatEther(balance)} ETH to ${mainnetAddress}`);
    } else {
        console.log("No tokens to bridge");
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

        // Save the new account's address and private key securely
        const accountInfo = {
            address: newAccount.address,
            privateKey: newAccount.privateKey,
            createdAt: new Date().toISOString()
        };
        
        const filename = `new_account_${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(accountInfo, null, 2));
        console.log(`Account details saved to ${filename}`);

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
            newAccountAddress: newAccount.address
        };
    } catch (error) {
        console.error("Error during deployment and setup:", error);
        process.exit(1);
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
    bridgeTokens
};
