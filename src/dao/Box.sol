// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract Box {
    address public immutable timelock;
    uint256 private _value;

    event ValueChanged(uint256 indexed value);

    error NotTimelock();
    error ZeroAddress();

    modifier onlyTimelock() {
        _onlyTimelock();
        _;
    }

    function _onlyTimelock() internal view {
        if (msg.sender != timelock) revert NotTimelock();
    }

    constructor(address _timelock) {
        if (_timelock == address(0)) revert ZeroAddress();
        timelock = _timelock;
    }

    // -------------------------
    // GOVERNED STATE CHANGE
    // -------------------------
    function store(uint256 value) external onlyTimelock {
        _value = value;
        emit ValueChanged(value);
    }

    function retrieve() external view returns (uint256) {
        return _value;
    }
}
