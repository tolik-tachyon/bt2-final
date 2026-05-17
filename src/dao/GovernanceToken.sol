// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit, Nonces} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract GovernanceToken is ERC20, ERC20Permit, ERC20Votes {
    uint256 public constant TOTAL_SUPPLY = 1_000_000 ether;

    address public immutable teamVesting;
    address public immutable treasury;
    address public immutable airdrop;
    address public immutable liquidity;

    error ZeroAddressTeamVesting();
    error ZeroAddressTreasury();
    error ZeroAddressAirdrop();
    error ZeroAddressLiquidity();

    constructor(address _teamVesting, address _treasury, address _airdrop, address _liquidity)
        ERC20("GovernanceToken", "GOV")
        ERC20Permit("GovernanceToken")
    {
        if (_teamVesting == address(0)) revert ZeroAddressTeamVesting();
        if (_treasury == address(0)) revert ZeroAddressTreasury();
        if (_airdrop == address(0)) revert ZeroAddressAirdrop();
        if (_liquidity == address(0)) revert ZeroAddressLiquidity();
        teamVesting = _teamVesting;
        treasury = _treasury;
        airdrop = _airdrop;
        liquidity = _liquidity;

        _mint(_teamVesting, (TOTAL_SUPPLY * 40) / 100); // 40%
        _mint(_treasury, (TOTAL_SUPPLY * 30) / 100); // 30%
        _mint(_airdrop, (TOTAL_SUPPLY * 20) / 100); // 20%
        _mint(_liquidity, (TOTAL_SUPPLY * 10) / 100); // 10%
    }

    // =====================================================
    // REQUIRED OVERRIDES (OZ v5 FIXED)
    // =====================================================

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
