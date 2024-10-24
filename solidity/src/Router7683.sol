// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import { BaseRouter as Router} from "./BaseRouter.sol";
import { Base7683 } from "./Base7683.sol";

contract Router7683 is Router, Base7683 {
    // ============ Libraries ============

    // ============ Constants ============

    // ============ Public Storage ============

    // ============ Upgrade Gap ============

    uint256[47] private __GAP;

    // ============ Events ============

    // ============ Errors ============

    // ============ Modifiers ============

    // ============ Constructor ============

    constructor(address _mailbox, address _permit2) Router(_mailbox) Base7683(_permit2) { }

    // ============ Initializers ============

    /**
     * @notice Initializes the contract with HyperlaneConnectionClient contracts
     * @param _customHook used by the Router to set the hook to override with
     * @param _interchainSecurityModule The address of the local ISM contract
     * @param _owner The address with owner privileges
     * @param _domains The domains of the remote Application Routers
     */
    function initialize(
        address _customHook,
        address _interchainSecurityModule,
        address _owner,
        uint32[] calldata _domains
    )
        external
        initializer
    {
        _BaseRouter_initialize(_customHook, _interchainSecurityModule, _owner, _domains);
    }

    // ============ External Functions ============

    // TODO - implement interchain settlement functions

    // ============ Internal Functions ============

    function _handle(uint32 _origin, bytes32 _sender, bytes calldata _message) internal virtual override {
        // TODO - handle settlement
    }

    function _mustHaveRemoteCounterpart(uint32 _domain) internal virtual override view returns (bytes32) {
        return _mustHaveRemoteRouter(_domain);
    }

    function _localDomain() internal view override returns (uint32) {
        return localDomain;
    }
}
