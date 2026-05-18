// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title NFTRentalVault
/// @notice ERC-4626 vault accepting GovernanceToken as asset.
///         ERC-1155 NFT holders can stake their NFT to earn a yield boost.
///         Owner (Timelock) can inject yield rewards.
contract NFTRentalVault is ERC4626, Ownable, ReentrancyGuard, IERC1155Receiver {
    IERC1155 public immutable nftContract;
    uint256 public immutable boostedNftId;

    /// @notice boost numerator - e.g. 12 = 120% of base shares
    uint256 public boostBps = 1200;
    uint256 public constant BASE_BPS = 1000;

    struct Rental {
        address renter;
        uint256 stakedAt;
    }

    // tokenId => Rental (only boostedNftId is accepted)
    mapping(uint256 => Rental) public rentals;
    // renter => is currently renting
    mapping(address => bool) public isRenting;

    event NFTStaked(address indexed renter, uint256 indexed nftId);
    event NFTUnstaked(address indexed renter, uint256 indexed nftId);
    event YieldInjected(uint256 indexed amount);
    event BoostUpdated(uint256 indexed newBoostBps);

    error WrongNft();
    error AlreadyStaked();
    error NotRenter();
    error BoostBelowBase();

    constructor(IERC20 asset_, IERC1155 nftContract_, uint256 boostedNftId_, address owner_)
        ERC4626(asset_)
        ERC20("NFT Rental Vault Share", "vSHARE")
        Ownable(owner_)
    {
        nftContract = nftContract_;
        boostedNftId = boostedNftId_;
    }

    // -- NFT rental --------------------------------------------

    /// @notice Stake an NFT to activate yield boost on your deposits
    function stakeNFT(uint256 nftId) external nonReentrant {
        if (nftId != boostedNftId) revert WrongNft();
        if (isRenting[msg.sender]) revert AlreadyStaked();

        isRenting[msg.sender] = true;
        rentals[nftId] = Rental({renter: msg.sender, stakedAt: block.timestamp});
        nftContract.safeTransferFrom(msg.sender, address(this), nftId, 1, "");

        emit NFTStaked(msg.sender, nftId);
    }

    /// @notice Unstake NFT and return it to renter
    function unstakeNFT(uint256 nftId) external nonReentrant {
        if (rentals[nftId].renter != msg.sender) revert NotRenter();

        delete rentals[nftId];
        isRenting[msg.sender] = false;
        nftContract.safeTransferFrom(address(this), msg.sender, nftId, 1, "");

        emit NFTUnstaked(msg.sender, nftId);
    }

    // -- yield -------------------------------------------------

    /// @notice Owner (Timelock) injects yield by depositing extra assets
    function injectYield(uint256 amount) external onlyOwner {
        SafeERC20.safeTransferFrom(IERC20(asset()), msg.sender, address(this), amount);
        emit YieldInjected(amount);
    }

    function setBoostBps(uint256 newBoostBps) external onlyOwner {
        if (newBoostBps < BASE_BPS) revert BoostBelowBase();
        boostBps = newBoostBps;
        emit BoostUpdated(newBoostBps);
    }

    // -- ERC-4626 overrides (boost) ----------------------------

    /// @notice Boosted users get more shares on deposit
    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view override returns (uint256) {
        uint256 base = super._convertToShares(assets, rounding);
        if (isRenting[msg.sender]) {
            return (base * boostBps) / BASE_BPS;
        }
        return base;
    }

    function previewDeposit(uint256 assets) public view override returns (uint256) {
        uint256 base = super.previewDeposit(assets);
        return base;
    }

    /// @notice Apply boost when minting shares for a specific receiver
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        if (isRenting[receiver]) {
            shares = (shares * boostBps) / BASE_BPS;
        }
        super._deposit(caller, receiver, assets, shares);
    }

    // -- ERC-1155 receiver -------------------------------------

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }
}
