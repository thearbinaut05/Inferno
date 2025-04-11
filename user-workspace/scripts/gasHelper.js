const axios = require('axios');

async function getGasPrice() {
    try {
        const response = await axios.get('https://gas.api.infura.io/v3/fe2c057b95cc46669a701a31ab7fcc1f');
        // Convert to wei and add a small buffer for safety
        const gasPrice = Math.floor(response.data.standard.suggestBaseFee * 1.1);
        return ethers.parseUnits(gasPrice.toString(), 'gwei');
    } catch (error) {
        console.error('Error fetching gas price:', error);
        // Fallback to network gas price
        return await ethers.provider.getGasPrice();
    }
}

module.exports = {
    getGasPrice
};
