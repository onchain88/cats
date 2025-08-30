import { ethers } from 'ethers';
import contractABI from './config/abi/OnchainCats.abi.json';
import deployedAddresses from './config/deployed-addresses-21201.json';

const CONTRACT_ADDRESS = deployedAddresses.OnchainCats;
const NETWORK_ID = 21201;
const NETWORK_NAME = 'Blocknet';

let provider;
let signer;
let contract;
let userAddress;
let isAdmin = false;

const connectWalletButton = document.getElementById('connectWallet');
const walletInfo = document.getElementById('walletInfo');
const nftDisplay = document.getElementById('nftDisplay');
const loadingIndicator = document.getElementById('loadingIndicator');
const totalSupplyElement = document.getElementById('totalSupply');
const nftPriceElement = document.getElementById('nftPrice');
const nftIdInput = document.getElementById('nftIdInput');
const searchButton = document.getElementById('searchButton');
const adminPanel = document.getElementById('adminPanel');

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask to use this dApp!');
        return;
    }

    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== NETWORK_ID) {
            alert(`Please switch to ${NETWORK_NAME} network (Chain ID: ${NETWORK_ID})`);
            return;
        }
        
        contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
        
        connectWalletButton.textContent = 'Connected';
        connectWalletButton.disabled = true;
        walletInfo.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        
        await checkAdminStatus();
        await loadContractData();
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet');
    }
}

async function checkAdminStatus() {
    try {
        const virtualOwner = await contract.virtualOwner();
        isAdmin = virtualOwner.toLowerCase() === userAddress.toLowerCase();
        
        if (isAdmin) {
            adminPanel.style.display = 'block';
            setupAdminControls();
        } else {
            adminPanel.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

async function loadContractData() {
    try {
        const totalSupply = await contract.totalSupply();
        const price = await contract.price();
        
        totalSupplyElement.textContent = totalSupply.toString();
        nftPriceElement.textContent = ethers.formatEther(price);
    } catch (error) {
        console.error('Error loading contract data:', error);
    }
}

function setupAdminControls() {
    document.getElementById('setPriceBtn').addEventListener('click', setPrice);
    document.getElementById('airdropBtn').addEventListener('click', airdrop);
    document.getElementById('withdrawBtn').addEventListener('click', withdraw);
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
        await loadContractData();
        newPriceInput.value = '';
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
    
    if (!tokenId || tokenId < 0 || tokenId > 9999) {
        alert('Please enter a valid token ID');
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

async function withdraw() {
    try {
        const tx = await contract.withdraw();
        await tx.wait();
        alert('Funds withdrawn successfully!');
    } catch (error) {
        console.error('Error withdrawing:', error);
        alert('Failed to withdraw: ' + error.message);
    }
}

async function searchNFT() {
    const tokenId = nftIdInput.value;
    
    if (tokenId === '' || tokenId < 0 || tokenId > 9999) {
        alert('Please enter a valid NFT ID between 0 and 9999');
        return;
    }
    
    if (!contract) {
        alert('Please connect your wallet first');
        return;
    }
    
    loadingIndicator.style.display = 'block';
    nftDisplay.innerHTML = '';
    
    try {
        const exists = await contract.exists(tokenId);
        if (!exists) {
            nftDisplay.innerHTML = '<p class="error">This NFT ID does not exist</p>';
            loadingIndicator.style.display = 'none';
            return;
        }
        
        const isAvailable = await contract.isAvailable(tokenId);
        let owner = null;
        let tokenURI = null;
        
        if (!isAvailable) {
            owner = await contract.ownerOf(tokenId);
        }
        
        try {
            tokenURI = await contract.tokenURI(tokenId);
        } catch (error) {
            console.log('Could not fetch tokenURI');
        }
        
        displayNFT(tokenId, isAvailable, owner, tokenURI);
    } catch (error) {
        console.error('Error searching NFT:', error);
        nftDisplay.innerHTML = '<p class="error">Failed to load NFT information</p>';
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

function displayNFT(tokenId, isAvailable, owner, tokenURI) {
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
    
    card.innerHTML = `
        <div class="nft-image">
            ${imageContent}
        </div>
        <div class="nft-info">
            <div class="nft-id">${metadata?.name || `Cat #${tokenId}`}</div>
            ${metadata?.description ? `<div class="nft-description">${metadata.description}</div>` : ''}
            ${attributesHTML}
            <div class="nft-status ${isAvailable ? 'available' : 'sold'}">
                ${isAvailable ? 'Available' : `Owned by ${owner.slice(0, 6)}...${owner.slice(-4)}`}
            </div>
            ${isAvailable ? 
                `<button class="buy-button" onclick="buyNFT(${tokenId})">Buy Now</button>` :
                `<button class="buy-button" disabled>Sold</button>`
            }
        </div>
    `;
    
    nftDisplay.appendChild(card);
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
        searchNFT();
    } catch (error) {
        console.error('Error buying NFT:', error);
        alert('Failed to buy NFT: ' + error.message);
        buyButton.disabled = false;
        buyButton.textContent = 'Buy Now';
    }
}

connectWalletButton.addEventListener('click', connectWallet);
searchButton.addEventListener('click', searchNFT);

nftIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchNFT();
    }
});

window.addEventListener('load', async () => {
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                connectWalletButton.textContent = 'Connect Wallet';
                connectWalletButton.disabled = false;
                walletInfo.textContent = '';
                nftDisplay.innerHTML = '';
            } else {
                location.reload();
            }
        });
        
        window.ethereum.on('chainChanged', () => {
            location.reload();
        });
    }
});