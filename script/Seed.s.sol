// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";

import {GameToken} from "src/amm/GameToken.sol";
import {Equestria1155} from "src/amm/Equestria1155.sol";

contract Seed is Script {
    function run() external {
        address me = vm.envAddress("WALLET_ADDR");
        vm.startBroadcast();

        GameToken(vm.envAddress("TOKEN_A_ADDR")).mint(me, 10_000 ether);
        GameToken(vm.envAddress("TOKEN_B_ADDR")).mint(me, 10_000 ether);

        uint256[] memory ids    = new uint256[](6);
        uint256[] memory values = new uint256[](6);
        ids[0]=1; values[0]=500;
        ids[1]=2; values[1]=500;
        ids[2]=3; values[2]=1000;
        ids[3]=4; values[3]=500;
        ids[4]=5; values[4]=500;
        ids[5]=6; values[5]=500;
        Equestria1155(vm.envAddress("NFT_ADDR")).mintBatch(me, ids, values, "");

        vm.stopBroadcast();
    }
}
