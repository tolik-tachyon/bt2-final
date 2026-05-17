// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Treasury {
    using SafeERC20 for IERC20;
    address public immutable timelock;

    error NotTimelock();
    error TimelockEmpty();
    error ZeroAddress();
    error TransferFailed();

    modifier onlyTimelock() {
        _onlyTimelock();
        _;
    }

    function _onlyTimelock() internal view {
        if (msg.sender != timelock) revert NotTimelock();
    }

    constructor(address _timelock) {
        if (_timelock == address(0)) revert TimelockEmpty();
        timelock = _timelock;
    }

    // -------------------------
    // ETH
    // -------------------------
    receive() external payable {}

    function withdrawETH(address payable to, uint256 amount) external onlyTimelock {
        if (to == address(0)) revert ZeroAddress();
        // SLITHER-NOTE:
        //     it's custom implementation of withdrawETH,
        //     so it expected to perform low-level call
        // slither-disable-next-line low-level-calls
        (bool success,) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    // -------------------------
    // ERC20
    // -------------------------
    function withdrawToken(address token, address to, uint256 amount) external onlyTimelock {
        IERC20(token).safeTransfer(to, amount);
    }
}
