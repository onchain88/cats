import { ethers } from 'ethers';
import contractABI from './config/abi/OnchainCats.abi.json';
import deployedAddresses21201 from './config/deployed-addresses-21201.json';
import deployedAddresses80002 from './config/deployed-addresses-80002.json';
import deployedAddresses137 from './config/deployed-addresses-137.json';
import { RPC_URLS } from './config.js';

// Network configurations
const NETWORKS = {
    21201: {
        name: 'Blocknet',
        addresses: deployedAddresses21201,
        symbol: 'SYS',
        rpcUrl: RPC_URLS[21201]
    },
    80002: {
        name: 'Amoy Testnet',
        addresses: deployedAddresses80002,
        symbol: 'POL',
        rpcUrl: RPC_URLS[80002]
    },
    137: {
        name: 'Polygon',
        addresses: deployedAddresses137,
        symbol: 'POL',
        rpcUrl: RPC_URLS[137]
    }
};

// Default to Polygon for read-only operations
const DEFAULT_CHAIN_ID = 137;

let currentNetwork = null;
let CONTRACT_ADDRESS = null;

let provider;
let signer;
let contract;
let readOnlyContract;
let userAddress;
let isAdmin = false;
let currentRoyaltyReceiver = '';
let currentRoyaltyPercentage = 0;
let nativeTokenSymbol = 'ETH';
let currentTokenId = null;

const connectWalletButton = document.getElementById('connectWallet');
const nftDisplay = document.getElementById('nftDisplay');
const loadingIndicator = document.getElementById('loadingIndicator');
const nftIdInput = document.getElementById('nftIdInput');
const searchButton = document.getElementById('searchButton');
const adminPanel = document.getElementById('adminPanel');
const adminToggle = document.getElementById('adminToggle');
const bottomNav = document.getElementById('bottomNav');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const bottomBuyBtn = document.getElementById('bottomBuyBtn');
const sendModal = document.getElementById('sendModal');
const sendNftName = document.getElementById('sendNftName');
const sendToAddress = document.getElementById('sendToAddress');
const confirmSendBtn = document.getElementById('confirmSendBtn');
const cancelSendBtn = document.getElementById('cancelSendBtn');

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask to use this dApp!');
        return;
    }

    try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Check current network
        const chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
        
        // If not on a supported network, switch to Polygon
        if (!NETWORKS[chainId]) {
            await switchToPolygon();
            return;
        }
        
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        
        currentNetwork = NETWORKS[chainId];
        CONTRACT_ADDRESS = currentNetwork.addresses.OnchainCats;
        nativeTokenSymbol = currentNetwork.symbol;
        
        // Update token symbol display
        updateTokenSymbolDisplay();
        
        contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
        
        connectWalletButton.classList.add('connected');
        connectWalletButton.title = 'Wallet Connected';
        
        await checkAdminStatus();
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet');
    }
}

async function switchToPolygon() {
    const polygonChainId = '0x89'; // 137 in hex
    
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: polygonChainId }],
        });
        // Reconnect after switching
        await connectWallet();
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: polygonChainId,
                        chainName: 'Polygon',
                        nativeCurrency: {
                            name: 'POL',
                            symbol: 'POL',
                            decimals: 18
                        },
                        rpcUrls: ['https://polygon-rpc.com/'],
                        blockExplorerUrls: ['https://polygonscan.com/']
                    }],
                });
                // Reconnect after adding
                await connectWallet();
            } catch (addError) {
                console.error('Error adding Polygon network:', addError);
                alert('Failed to add Polygon network to MetaMask');
            }
        } else {
            console.error('Error switching to Polygon:', switchError);
            alert('Failed to switch to Polygon network');
        }
    }
}

async function checkAdminStatus() {
    try {
        const virtualOwner = await contract.virtualOwner();
        isAdmin = virtualOwner.toLowerCase() === userAddress.toLowerCase();
        
        if (isAdmin) {
            adminToggle.style.display = 'block';
            adminPanel.classList.add('collapsed');
            setupAdminControls();
            await loadAdminRoyaltyInfo();
            await loadContractBalance();
            await loadDefaultPrice();
        } else {
            adminToggle.style.display = 'none';
            adminPanel.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}


function updateTokenSymbolDisplay() {
    // Update all elements that show ETH
    const ethElements = document.querySelectorAll('[data-token-symbol]');
    ethElements.forEach(el => {
        el.textContent = nativeTokenSymbol;
    });
    
    // Update specific elements
    const priceLabel = document.querySelector('label[for="newPrice"]');
    if (priceLabel) {
        priceLabel.textContent = `Set Price (${nativeTokenSymbol}):`;
    }
}

async function loadDefaultPrice() {
    try {
        const price = await contract.price();
        
        // Set default price in admin form if admin
        if (isAdmin) {
            document.getElementById('newPrice').value = ethers.formatEther(price);
        }
    } catch (error) {
        console.error('Error loading default price:', error);
    }
}

async function loadAdminRoyaltyInfo() {
    try {
        // Use a sample sale price of 1 ETH to get royalty info
        const samplePrice = ethers.parseEther("1");
        const [receiver, amount] = await contract.royaltyInfo(0, samplePrice);
        
        // Calculate percentage from amount
        const percentage = (Number(amount) * 100 / Number(samplePrice)).toFixed(2);
        
        const percentageElement = document.getElementById('currentRoyaltyPercentage');
        const receiverElement = document.getElementById('currentRoyaltyReceiver');
        
        if (receiver !== ethers.ZeroAddress && amount > 0n) {
            percentageElement.textContent = percentage;
            receiverElement.textContent = `${receiver.slice(0, 6)}...${receiver.slice(-4)}`;
            currentRoyaltyReceiver = receiver;
            currentRoyaltyPercentage = percentage;
            document.getElementById('copyRoyaltyAddress').style.display = 'inline-block';
            
            // Set default values in form
            document.getElementById('royaltyReceiver').value = receiver;
            document.getElementById('royaltyPercentage').value = percentage;
        } else {
            percentageElement.textContent = '0';
            receiverElement.textContent = 'Not set';
            currentRoyaltyReceiver = '';
            currentRoyaltyPercentage = 0;
            document.getElementById('copyRoyaltyAddress').style.display = 'none';
            
            // Clear form values
            document.getElementById('royaltyReceiver').value = '';
            document.getElementById('royaltyPercentage').value = '';
        }
    } catch (error) {
        console.error('Error loading royalty info:', error);
        document.getElementById('currentRoyaltyPercentage').textContent = 'Error';
        document.getElementById('currentRoyaltyReceiver').textContent = 'Error';
    }
}

function setupAdminControls() {
    document.getElementById('setPriceBtn').addEventListener('click', setPrice);
    document.getElementById('airdropBtn').addEventListener('click', airdrop);
    document.getElementById('setRoyaltyBtn').addEventListener('click', setRoyalty);
    document.getElementById('withdrawBtn').addEventListener('click', withdraw);
    document.getElementById('copyRoyaltyAddress').addEventListener('click', copyRoyaltyAddress);
    adminToggle.addEventListener('click', toggleAdminPanel);
}

function toggleAdminPanel() {
    const isCollapsed = adminPanel.classList.contains('collapsed');
    
    if (isCollapsed) {
        adminPanel.classList.remove('collapsed');
        adminPanel.style.display = 'block';
        adminToggle.textContent = 'Admin Panel ▲';
        adminToggle.classList.add('open');
    } else {
        adminPanel.classList.add('collapsed');
        adminPanel.style.display = 'none';
        adminToggle.textContent = 'Admin Panel ▼';
        adminToggle.classList.remove('open');
    }
}

async function loadContractBalance() {
    try {
        const balance = await provider.getBalance(CONTRACT_ADDRESS);
        document.getElementById('contractBalance').textContent = ethers.formatEther(balance);
    } catch (error) {
        console.error('Error loading contract balance:', error);
        document.getElementById('contractBalance').textContent = 'Error';
    }
}

function copyRoyaltyAddress() {
    if (currentRoyaltyReceiver) {
        navigator.clipboard.writeText(currentRoyaltyReceiver).then(() => {
            const btn = document.getElementById('copyRoyaltyAddress');
            btn.classList.add('copied');
            setTimeout(() => {
                btn.classList.remove('copied');
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy address');
        });
    }
}

async function setPrice() {
    const newPriceInput = document.getElementById('newPrice');
    const newPrice = newPriceInput.value;
    
    if (!newPrice || newPrice <= 0) {
        alert('Please enter a valid price');
        return;
    }
    
    try {
        const priceInWei = ethers.parseEther(newPrice);
        const tx = await contract.setPrice(priceInWei);
        await tx.wait();
        alert('Price updated successfully!');
        await loadDefaultPrice();
    } catch (error) {
        console.error('Error setting price:', error);
        alert('Failed to set price: ' + error.message);
    }
}

async function airdrop() {
    const tokenIdInput = document.getElementById('airdropTokenId');
    const addressInput = document.getElementById('airdropAddress');
    const tokenId = tokenIdInput.value;
    const recipient = addressInput.value;
    
    if (!tokenId || tokenId < 1 || tokenId > 10000) {
        alert('Please enter a valid token ID between 1 and 10000');
        return;
    }
    
    if (!ethers.isAddress(recipient)) {
        alert('Please enter a valid recipient address');
        return;
    }
    
    try {
        const tx = await contract.airdrop(recipient, tokenId);
        await tx.wait();
        alert(`Successfully airdropped NFT #${tokenId} to ${recipient}`);
        tokenIdInput.value = '';
        addressInput.value = '';
    } catch (error) {
        console.error('Error airdropping:', error);
        alert('Failed to airdrop: ' + error.message);
    }
}

async function setRoyalty() {
    const receiverInput = document.getElementById('royaltyReceiver');
    const percentageInput = document.getElementById('royaltyPercentage');
    const receiver = receiverInput.value;
    const percentage = percentageInput.value;
    
    if (!ethers.isAddress(receiver)) {
        alert('Please enter a valid receiver address');
        return;
    }
    
    if (!percentage || percentage < 0 || percentage > 100) {
        alert('Please enter a valid percentage between 0 and 100');
        return;
    }
    
    try {
        // Convert percentage to basis points (e.g., 2.5% = 250)
        const feeNumerator = Math.floor(parseFloat(percentage) * 100);
        const tx = await contract.setRoyalty(receiver, feeNumerator);
        await tx.wait();
        alert(`Royalty set successfully: ${percentage}% to ${receiver}`);
        receiverInput.value = '';
        percentageInput.value = '';
        await loadAdminRoyaltyInfo();
    } catch (error) {
        console.error('Error setting royalty:', error);
        alert('Failed to set royalty: ' + error.message);
    }
}

async function withdraw() {
    try {
        const tx = await contract.withdraw();
        await tx.wait();
        alert('Funds withdrawn successfully!');
        await loadContractBalance();
    } catch (error) {
        console.error('Error withdrawing:', error);
        alert('Failed to withdraw: ' + error.message);
    }
}

// Initialize read-only contract on page load
async function initReadOnlyContract() {
    currentNetwork = NETWORKS[DEFAULT_CHAIN_ID];
    CONTRACT_ADDRESS = currentNetwork.addresses.OnchainCats;
    nativeTokenSymbol = currentNetwork.symbol;
    
    const readOnlyProvider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
    readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, readOnlyProvider);
    
    updateTokenSymbolDisplay();
}

async function searchNFT(tokenId = null) {
    if (tokenId === null) {
        tokenId = nftIdInput.value;
    }
    
    if (tokenId === '' || tokenId < 1 || tokenId > 10000) {
        alert('Please enter a valid NFT ID between 1 and 10000');
        return;
    }
    
    // Use read-only contract if wallet not connected
    const contractToUse = contract || readOnlyContract;
    if (!contractToUse) {
        alert('Contract not initialized. Please refresh the page.');
        return;
    }
    
    loadingIndicator.style.display = 'block';
    nftDisplay.innerHTML = '';
    bottomNav.style.display = 'none';
    
    try {
        const exists = await contractToUse.exists(tokenId);
        if (!exists) {
            nftDisplay.innerHTML = '<p class="error">This NFT ID does not exist</p>';
            loadingIndicator.style.display = 'none';
            return;
        }
        
        const isAvailable = await contractToUse.isAvailable(tokenId);
        let owner = null;
        let tokenURI = null;
        
        if (!isAvailable) {
            owner = await contractToUse.ownerOf(tokenId);
        }
        
        try {
            tokenURI = await contractToUse.tokenURI(tokenId);
        } catch (error) {
            console.log('Could not fetch tokenURI');
        }
        
        currentTokenId = parseInt(tokenId);
        nftIdInput.value = currentTokenId;
        const price = await contractToUse.price();
        displayNFT(currentTokenId, isAvailable, owner, tokenURI, price);
        updateBottomNav(isAvailable);
        bottomNav.style.display = 'flex';
    } catch (error) {
        console.error('Error searching NFT:', error);
        nftDisplay.innerHTML = '<p class="error">Failed to load NFT information</p>';
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

function displayNFT(tokenId, isAvailable, owner, tokenURI, price) {
    const card = document.createElement('div');
    card.className = 'nft-card';
    
    let imageContent = '<div style="font-size: 120px;">🐱</div>';
    let metadata = null;
    
    if (tokenURI && tokenURI.startsWith('data:')) {
        try {
            const json = JSON.parse(atob(tokenURI.split(',')[1]));
            metadata = json;
            if (json.image) {
                imageContent = `<img src="${json.image}" alt="Cat #${tokenId}">`;
            }
        } catch (e) {
            console.log('Could not parse token metadata');
        }
    }
    
    let attributesHTML = '';
    if (metadata && metadata.attributes && Array.isArray(metadata.attributes)) {
        attributesHTML = '<div class="attributes">';
        metadata.attributes.forEach(attr => {
            attributesHTML += `
                <div class="attribute">
                    <span class="attr-name">${attr.trait_type}:</span>
                    <span class="attr-value">${attr.value}</span>
                </div>
            `;
        });
        attributesHTML += '</div>';
    }
    
    const copyIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>`;
    
    const isOwner = userAddress && owner && owner.toLowerCase() === userAddress.toLowerCase();
    
    card.innerHTML = `
        <div class="nft-image">
            ${imageContent}
        </div>
        <div class="nft-info">
            <div class="nft-id">${metadata?.name || `Cat #${tokenId}`}</div>
            ${metadata?.description ? `<div class="nft-description">${metadata.description}</div>` : ''}
            ${attributesHTML}
            ${isAvailable ? 
                `<div class="nft-price">PRICE: ${ethers.formatEther(price)} ${nativeTokenSymbol}</div>` :
                `<div class="nft-status sold">
                    <span>Owned by</span>
                    <span class="owner-info">
                        <span class="owner-address">${owner.slice(0, 6)}...${owner.slice(-4)}</span>
                        <button class="copy-btn" onclick="copyAddress('${owner}')" title="Copy address">
                            ${copyIcon}
                        </button>
                    </span>
                </div>`
            }
            ${isAvailable ? 
                `<button class="buy-button" onclick="buyNFT(${tokenId})">Buy Now</button>` :
                isOwner ?
                    `<button class="buy-button send-button" onclick="openSendModal(${tokenId}, '${metadata?.name || `Cat #${tokenId}`}')">Send</button>` :
                    `<button class="buy-button" disabled>Sold</button>`
            }
        </div>
    `;
    
    nftDisplay.appendChild(card);
}

window.copyAddress = function(address) {
    navigator.clipboard.writeText(address).then(() => {
        const btn = event.target.closest('.copy-btn');
        btn.classList.add('copied');
        setTimeout(() => {
            btn.classList.remove('copied');
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy address');
    });
}

window.openSendModal = function(tokenId, nftName) {
    sendNftName.textContent = nftName;
    sendToAddress.value = '';
    sendModal.style.display = 'flex';
    sendToAddress.focus();
    
    confirmSendBtn.onclick = () => sendNFT(tokenId);
}

async function sendNFT(tokenId) {
    const recipient = sendToAddress.value.trim();
    
    if (!ethers.isAddress(recipient)) {
        alert('Please enter a valid recipient address');
        return;
    }
    
    if (recipient.toLowerCase() === userAddress.toLowerCase()) {
        alert('Cannot send to your own address');
        return;
    }
    
    confirmSendBtn.disabled = true;
    confirmSendBtn.textContent = 'Sending...';
    
    try {
        const tx = await contract.transferFrom(userAddress, recipient, tokenId);
        await tx.wait();
        
        alert(`Successfully sent NFT #${tokenId} to ${recipient}`);
        sendModal.style.display = 'none';
        await searchNFT(tokenId);
    } catch (error) {
        console.error('Error sending NFT:', error);
        alert('Failed to send NFT: ' + error.message);
    } finally {
        confirmSendBtn.disabled = false;
        confirmSendBtn.textContent = 'Send';
    }
}

window.buyNFT = async function(tokenId) {
    if (!signer) {
        alert('Please connect your wallet first');
        return;
    }
    
    const buyButton = nftDisplay.querySelector('.buy-button');
    buyButton.disabled = true;
    buyButton.textContent = 'Processing...';
    
    try {
        const price = await contract.price();
        const tx = await contract.buy(tokenId, { value: price });
        
        buyButton.textContent = 'Confirming...';
        await tx.wait();
        
        alert(`Successfully purchased Cat #${tokenId}!`);
        await searchNFT(tokenId);
        updateBottomNav(false);
    } catch (error) {
        console.error('Error buying NFT:', error);
        alert('Failed to buy NFT: ' + error.message);
        buyButton.disabled = false;
        buyButton.textContent = 'Buy Now';
    }
}

function updateBottomNav(isAvailable) {
    prevBtn.disabled = currentTokenId <= 1;
    nextBtn.disabled = currentTokenId >= 10000;
    
    // Show buy button only if wallet is connected
    if (!contract) {
        bottomBuyBtn.style.display = 'none';
    } else {
        bottomBuyBtn.style.display = 'block';
        if (isAvailable) {
            bottomBuyBtn.textContent = 'Buy Now';
            bottomBuyBtn.disabled = false;
            bottomBuyBtn.classList.add('buy-btn');
        } else {
            bottomBuyBtn.textContent = 'Sold';
            bottomBuyBtn.disabled = true;
            bottomBuyBtn.classList.add('buy-btn');
        }
    }
}

async function navigatePrev() {
    if (currentTokenId > 1) {
        await searchNFT(currentTokenId - 1);
    }
}

async function navigateNext() {
    if (currentTokenId < 10000) {
        await searchNFT(currentTokenId + 1);
    }
}

async function bottomBuyNFT() {
    if (currentTokenId) {
        await buyNFT(currentTokenId);
    }
}

connectWalletButton.addEventListener('click', connectWallet);
searchButton.addEventListener('click', () => searchNFT());
prevBtn.addEventListener('click', navigatePrev);
nextBtn.addEventListener('click', navigateNext);
bottomBuyBtn.addEventListener('click', bottomBuyNFT);
cancelSendBtn.addEventListener('click', () => {
    sendModal.style.display = 'none';
});

nftIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchNFT();
    }
});

window.addEventListener('load', async () => {
    // Initialize read-only contract for non-wallet users
    await initReadOnlyContract();
    
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                connectWalletButton.classList.remove('connected');
                connectWalletButton.title = 'Connect Wallet';
                nftDisplay.innerHTML = '';
                contract = null;
                signer = null;
                userAddress = null;
            } else {
                location.reload();
            }
        });
        
        window.ethereum.on('chainChanged', () => {
            location.reload();
        });
    }
});