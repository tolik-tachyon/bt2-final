// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";

import {GovernanceToken} from "src/dao/GovernanceToken.sol";
import {TokenVesting}    from "src/dao/TokenVesting.sol";
import {MyGovernor}      from "src/dao/MyGovernor.sol";
import {Treasury}        from "src/dao/Treasury.sol";
import {Box}             from "src/dao/Box.sol";

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        // 1. GOVERNANCE TOKEN

        address team = msg.sender;
        address treasuryAddr = msg.sender;
        address airdrop = msg.sender;
        address liquidity = msg.sender;

        GovernanceToken token = new GovernanceToken(
            team,
            treasuryAddr,
            airdrop,
            liquidity
        );

        // 2. TOKEN VESTING (FIXED)

        TokenVesting vesting = new TokenVesting(
            address(token),
            team,
            block.timestamp
        );

        // 3. TIMELOCK

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](1);
        executors[0] = address(0);

        TimelockController timelock = new TimelockController(
            // NOTE: 10 seconds - for testing purposes.
            //       Should be changed to bigger value, like 2 days.
            10, 
            proposers,
            executors,
            msg.sender
        );

        // 4. GOVERNOR

        MyGovernor governor = new MyGovernor(token, timelock);

        timelock.grantRole(
            timelock.PROPOSER_ROLE(),
            address(governor)
        );

        timelock.grantRole(
            timelock.EXECUTOR_ROLE(),
            address(0)
        );

        // 5. TREASURY + BOX

        Treasury treasury = new Treasury(address(timelock));
        Box box = new Box(address(timelock));

        // 6. OUTPUT

        console.log("=== DAO DEPLOYED ===");
        console.log("TOKEN_ADDR=%s",    address(token));
        console.log("VESTING_ADDR=%s",  address(vesting));
        console.log("GOVERNOR_ADDR=%s", address(governor));
        console.log("TIMELOCK_ADDR=%s", address(timelock));
        console.log("TREASURY_ADDR=%s", address(treasury));
        console.log("BOX_ADDR=%s",      address(box));

        vm.stopBroadcast();
    }
}
