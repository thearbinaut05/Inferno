async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            
            // Update UI
            const connectButton = document.getElementById('connectWallet');
            connectButton.innerHTML = `${account.substring(0, 6)}...${account.substring(38)}`;
            connectButton.classList.remove('bg-blue-500', 'hover:bg-blue-600');
            connectButton.classList.add('bg-green-500', 'hover:bg-green-600');

            // Setup contract interactions
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            // Store the signer and account in window object for easy access
            window.userWallet = {
                account: account,
                signer: signer,
                provider: provider
            };

            // Emit event for other parts of the application
            window.dispatchEvent(new CustomEvent('walletConnected', { 
                detail: { account: account }
            }));

            return account;
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Failed to connect wallet. Please try again.');
        }
    } else {
        alert('Please install MetaMask to use this application!');
    }
}

// Handle account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', function (accounts) {
        if (accounts.length === 0) {
            // User disconnected their wallet
            const connectButton = document.getElementById('connectWallet');
            connectButton.innerHTML = 'Connect Wallet';
            connectButton.classList.remove('bg-green-500', 'hover:bg-green-600');
            connectButton.classList.add('bg-blue-500', 'hover:bg-blue-600');
            
            delete window.userWallet;
            
            window.dispatchEvent(new CustomEvent('walletDisconnected'));
        } else {
            // Account changed, update UI
            const connectButton = document.getElementById('connectWallet');
            connectButton.innerHTML = `${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
        }
    });

    window.ethereum.on('chainChanged', function (chainId) {
        // Handle chain changes - reload the page
        window.location.reload();
    });
}
