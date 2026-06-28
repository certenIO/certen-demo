// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {DemoUpgradeable} from "../src/DemoUpgradeable.sol";
import {DemoTreasury} from "../src/DemoTreasury.sol";

/**
 * @title DeployDemo
 * @notice Deploys the two demo contracts and wires them to the Certen authorizer.
 *
 *         The authorizer defaults to the broadcasting EOA (msg.sender) so the script
 *         works out of the box, but for a real demo you set CERTEN_AUTHORIZER to the
 *         account Certen controls — only that account can then upgrade / withdraw.
 *
 *         After deploy, copy the printed DemoUpgradeable / DemoTreasury addresses into
 *         the seed manifest (CONTRACT_DEMO_UPGRADEABLE / CONTRACT_DEMO_TREASURY) so the
 *         orchestrator's live execution leg knows what to call.
 */
contract DeployDemo is Script {
    function run() external {
        address authorizer = vm.envOr("CERTEN_AUTHORIZER", msg.sender);
        string memory initialVersion = vm.envOr("DEMO_INITIAL_VERSION", string("6.0"));
        uint256 initialBalance = vm.envOr("DEMO_TREASURY_BALANCE", uint256(250_000_000));

        vm.startBroadcast();

        DemoUpgradeable upgradeable = new DemoUpgradeable(authorizer, initialVersion);
        DemoTreasury treasury = new DemoTreasury(authorizer, initialBalance);

        vm.stopBroadcast();

        console2.log("CERTEN_AUTHORIZER:          ", authorizer);
        console2.log("DemoUpgradeable deployed at: ", address(upgradeable));
        console2.log("  initial version:          ", initialVersion);
        console2.log("DemoTreasury deployed at:    ", address(treasury));
        console2.log("  initial balance:          ", initialBalance);
    }
}
