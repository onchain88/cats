// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOnchainCats {
    event Approval(indexed address owner, indexed address approved, indexed uint256 tokenId);
    event ApprovalForAll(indexed address owner, indexed address operator, bool approved);
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);
    event ConsecutiveTransfer(indexed uint256 fromTokenId, uint256 toTokenId, indexed address from, indexed address to);
    event MetadataUpdate(uint256 _tokenId);
    event OwnershipTransferred(indexed address previousOwner, indexed address newOwner);
    event PriceChanged(uint256 newPrice);
    event Purchased(indexed address buyer, indexed uint256 tokenId);
    event RoyaltyChanged(address receiver, uint96 feeNumerator);
    event Transfer(indexed address from, indexed address to, indexed uint256 tokenId);

    function MAX_SUPPLY() external view returns (uint256);
    function approve(address to, uint256 tokenId) external payable;
    function balanceOf(address owner) external view returns (uint256);
    function buy(uint256 tokenId) external payable;
    function buyMultiple(uint256[] tokenIds) external payable;
    function catMetadata() external view returns (address);
    function contractURI() external view returns (string);
    function getApproved(uint256 tokenId) external view returns (address);
    function initialMint(uint256 quantity) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function isAvailable(uint256 tokenId) external view returns (bool);
    function name() external view returns (string);
    function notifyCollectionExists() external;
    function owner() external view returns (address);
    function ownerOf(uint256 tokenId) external view returns (address);
    function price() external view returns (uint256);
    function renounceOwnership() external;
    function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address receiver, uint256 amount);
    function safeTransferFrom(address from, address to, uint256 tokenId) external payable;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes _data) external payable;
    function setApprovalForAll(address operator, bool approved) external;
    function setPrice(uint256 _newPrice) external;
    function setRoyalty(address receiver, uint96 feeNumerator) external;
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
    function symbol() external view returns (string);
    function tokenURI(uint256 tokenId) external view returns (string);
    function totalSupply() external view returns (uint256 result);
    function transferFrom(address from, address to, uint256 tokenId) external payable;
    function transferOwnership(address newOwner) external;
    function updateMetadata(uint256 tokenId) external;
    function updateMetadataRange(uint256 fromTokenId, uint256 toTokenId) external;
    function withdraw() external;
}
