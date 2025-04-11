const { ethers } = require("hardhat");
const fetch = require('node-fetch');

// Gas price API endpoints
const GAS_APIS = {
    polygon: {
        url: 'https://gasstation.polygon.technology/v2',
        mainnet: true
    },
    mumbai: {
        url: 'https://gasstation-testnet.polygon.technology/v2',
        mainnet: false
    }
};

// Gas price safety margins (in percentage)
const GAS_MARGINS = {
    SAFE: 20,      // 20% buffer for normal transactions
    URGENT: 50,    // 50% buffer for urgent transactions
    MAX: 100       // 100% buffer for critical transactions
};

/**
 * Fetches current gas prices from Polygon Gas Station
 * @param {string} network - 'polygon' or 'mumbai'
 * @returns {Promise<Object>} Gas price data
 */
async function fetchGasPrice(network) {
    try {
        const api = GAS_APIS[network];
        if (!api) {
            throw new Error(`Unsupported network: ${network}`);
        }

        const response = await fetch(api.url);
        const data = await response.json();

        return {
            safeLow: ethers.utils.parseUnits(data.safeLow.maxFee.toFixed(2), 'gwei'),
            standard: ethers.utils.parseUnits(data.standard.maxFee.toFixed(2), 'gwei'),
            fast: ethers.utils.parseUnits(data.fast.maxFee.toFixed(2), 'gwei'),
            estimatedBaseFee: ethers.utils.parseUnits(data.estimatedBaseFee.toFixed(2), 'gwei'),
            maxPriorityFee: ethers.utils.parseUnits(data.fast.maxPriorityFee.toFixed(2), 'gwei')
        };
    } catch (error) {
        console.warn('Failed to fetch gas price from API:', error.message);
        return null;
    }
}

/**
 * Gets optimal gas price with fallback mechanisms
 * @param {Object} options - Configuration options
 * @param {string} options.priority - 'safe', 'standard', or 'fast'
 * @param {number} options.margin - Custom safety margin percentage
 * @returns {Promise<BigNumber>} Optimal gas price
 */
async function getOptimalGasPrice(options = {}) {
    const network = hre.network.name;
    const { priority = 'standard', margin = GAS_MARGINS.SAFE } = options;

    // Try to get gas price from API first
    const gasPrices = await fetchGasPrice(network);
    
    if (gasPrices) {
        let basePrice;
        switch (priority) {
            case 'safe':
                basePrice = gasPrices.safeLow;
                break;
            case 'fast':
                basePrice = gasPrices.fast;
                break;
            default:
                basePrice = gasPrices.standard;
        }

        // Add safety margin
        return basePrice.mul(100 + margin).div(100);
    }

    // Fallback to provider's getGasPrice
    console.log('Using provider gas price estimation as fallback');
    const providerGasPrice = await ethers.provider.getGasPrice();
    return providerGasPrice.mul(100 + margin).div(100);
}

/**
 * Estimates total gas cost for a contract deployment
 * @param {Object} contract - Contract factory
 * @param {Array} args - Constructor arguments
 * @param {Object} options - Gas price options
 * @returns {Promise<Object>} Gas estimation details
 */
async function estimateDeploymentGas(contract, args, options = {}) {
    // Get deployment bytecode
    const deploymentData = contract.interface.encodeDeploy(args);
    const bytecode = contract.bytecode + deploymentData.slice(2);

    // Estimate gas for deployment
    const estimatedGas = await ethers.provider.estimateGas({
        data: bytecode
    });

    // Get optimal gas price
    const gasPrice = await getOptimalGasPrice(options);

    // Calculate total cost
    const totalCost = estimatedGas.mul(gasPrice);

    return {
        estimatedGas,
        gasPrice,
        totalCost,
        formattedCost: ethers.utils.formatEther(totalCost)
    };
}

/**
 * Estimates gas for contract interaction
 * @param {Contract} contract - Deployed contract instance
 * @param {string} method - Method name
 * @param {Array} args - Method arguments
 * @param {Object} options - Gas price options
 * @returns {Promise<Object>} Gas estimation details
 */
async function estimateMethodGas(contract, method, args, options = {}) {
    // Estimate gas for method
    const estimatedGas = await contract.estimateGas[method](...args);

    // Get optimal gas price
    const gasPrice = await getOptimalGasPrice(options);

    // Calculate total cost
    const totalCost = estimatedGas.mul(gasPrice);

    return {
        estimatedGas,
        gasPrice,
        totalCost,
        formattedCost: ethers.utils.formatEther(totalCost)
    };
}

/**
 * Suggests optimal batch size for multiple transactions
 * @param {Contract} contract - Contract instance
 * @param {string} method - Method name to batch
 * @param {Array} items - Array of items to process
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Batch size recommendations
 */
async function suggestBatchSize(contract, method, items, options = {}) {
    const { maxGasPerBlock = 30000000, targetGasPerTx = 2000000 } = options;

    // Estimate gas for a single transaction
    const singleGas = await contract.estimateGas[method](items[0]);
    
    // Calculate optimal batch size
    const optimalSize = Math.floor(targetGasPerTx / singleGas);
    const maxSize = Math.floor(maxGasPerBlock / singleGas);

    return {
        recommended: optimalSize,
        maximum: maxSize,
        gasPerItem: singleGas,
        totalItems: items.length,
        estimatedBatches: Math.ceil(items.length / optimalSize)
    };
}

module.exports = {
    getOptimalGasPrice,
    estimateDeploymentGas,
    estimateMethodGas,
    suggestBatchSize,
    GAS_MARGINS
};
