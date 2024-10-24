// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import { TypeCasts } from "@hyperlane-xyz/libs/TypeCasts.sol";
import { Router } from "@hyperlane-xyz/client/Router.sol";

abstract contract BaseRouter is Router {
    // ============ Libraries ============

    using TypeCasts for address;
    using TypeCasts for bytes32;

    // ============ Constants ============

    // ============ Public Storage ============

    // ============ Upgrade Gap ============

    uint256[47] private __GAP;

    // ============ Events ============

    // ============ Constructor ============

    constructor(address _mailbox) Router(_mailbox) { }

    // ============ Initializers ============

    /**
     * @notice Initializes the contract with HyperlaneConnectionClient contracts
     * @param _customHook used by the Router to set the hook to override with
     * @param _interchainSecurityModule The address of the local ISM contract
     * @param _owner The address with owner privileges
     * @param _domains The domains of the remote Application Routers assuming all of them has the same address as this
     * contract
     */
    function _BaseRouter_initialize(
        address _customHook,
        address _interchainSecurityModule,
        address _owner,
        uint32[] calldata _domains
    )
        internal
        onlyInitializing
    {
        _MailboxClient_initialize(_customHook, _interchainSecurityModule, _owner);

        _enrollRemoteDomains(_domains);
    }

    // ============ External Functions ============

    /**
     * @notice Register the address of a Router contract with the same address as this for the same Application on a
     * remote chain
     * @param _domain The domain of the remote Application Router
     */
    function enrollRemoteDomain(uint32 _domain) external virtual onlyOwner {
        _enrollRemoteRouter(_domain, TypeCasts.addressToBytes32(address(this)));
    }

    /**
     * @notice Batch version of `enrollRemoteDomain`
     * @param _domains The domains of the remote Application Routers
     */
    function enrollRemoteDomains(uint32[] calldata _domains) external virtual onlyOwner {
        _enrollRemoteDomains(_domains);
    }

    /**
     * @notice Returns the gas payment required to dispatch a given messageBody to the given domain's router with gas
     * limit override.
     * @param _destination The domain of the destination router.
     * @param _messageBody The message body to be dispatched.
     * @param _hookMetadata The hook metadata to override with for the hook set by the owner
     */
    function quoteGasPayment(
        uint32 _destination,
        bytes memory _messageBody,
        bytes memory _hookMetadata
    )
        external
        view
        returns (uint256 _gasPayment)
    {
        return _Router_quoteDispatch(_destination, _messageBody, _hookMetadata, address(hook));
    }

    function _enrollRemoteDomains(uint32[] calldata _domains) internal virtual {
        uint256 length = _domains.length;
        bytes32 thisAddress = TypeCasts.addressToBytes32(address(this));
        for (uint256 i = 0; i < length; i += 1) {
            _enrollRemoteRouter(_domains[i], thisAddress);
        }
    }

}
