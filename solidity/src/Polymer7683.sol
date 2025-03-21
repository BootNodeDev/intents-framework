// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import { ICrossL2ProverV2 } from "@polymerdao/prover-contracts/interfaces/ICrossL2ProverV2.sol";
import { OrderData, OrderEncoder } from "./libs/OrderEncoder.sol";
import { BasicSwap7683 } from "./BasicSwap7683.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { TypeCasts } from "@hyperlane-xyz/libs/TypeCasts.sol";

/**
 * @title Polymer7683
 * @author PolymerLabs
 * @notice This contract builds on top of BasicSwap7683 as a messaging layer using Polymer.
 * @dev It integrates with the Polymer protocol for cross-chain event verification.
 */
contract Polymer7683 is BasicSwap7683, Ownable {
    // ============ Constants ============
    string public constant CLIENT_TYPE = "polymer"; // Used for proof verification

    // ============ Public Storage ============
    ICrossL2ProverV2 public immutable prover;
    uint256 public immutable localChainId;
    mapping(uint256 => address) public destinationContracts;


    // ============ Events ============
    /**
     * @notice Event emitted when a destination contract is updated
     * @param chainId The chain ID for the destination
     * @param contractAddress The new contract address
     */
    event DestinationContractUpdated(uint256 indexed chainId, address contractAddress);

    // ============ Errors ============
    error InvalidProof();
    error InvalidChainId();
    error InvalidEmitter();
    error InvalidEventData();
    error InvalidDestinationContract();
    error UnregisteredDestinationChain();
    error SettlementFailed();

    // ============ Constructor ============
    /**
     * @notice Initializes the Polymer7683 contract with the specified Prover and PERMIT2 address.
     * @param _prover The address of the Polymer CrossL2Prover contract
     * @param _permit2 The address of the permit2 contract
     * @param _localChainId The chain ID of the chain this contract is deployed on
     */
    constructor(
        ICrossL2ProverV2 _prover,
        address _permit2,
        uint256 _localChainId
    ) BasicSwap7683(_permit2) {
        prover = _prover;
        localChainId = _localChainId;
    }

    // ============ Admin Functions ============
    function setDestinationContract(uint256 chainId, address contractAddress) external onlyOwner {
        if (contractAddress == address(0)) revert InvalidDestinationContract();
        destinationContracts[chainId] = contractAddress;
        emit DestinationContractUpdated(chainId, contractAddress);
    }

    // ============ External Functions ============
    /**
     * @notice Process a settlement proof from a destination chain
     * @param eventProof The proof of the Fill event from the destination chain
     * @param eventProof The proof of the Fill event from the destination chain
     */
    function handleSettlementWithProof(bytes calldata eventProof) external {
        // Verify event using Polymer prover
        (
            uint32 provenChainId,
            address emitter,
            ,  // topics
            bytes memory data
        ) = prover.validateEvent(eventProof);

        // Verify destination contract is registered for the proven chain
        address expectedEmitter = destinationContracts[provenChainId];
        if (expectedEmitter == address(0)) revert UnregisteredDestinationChain();

        // Validate emitter matches registered destination
        if (emitter != expectedEmitter) revert InvalidEmitter();

        // Decode data from the Filled event format
        (bytes32 eventOrderId, bytes memory originData, bytes memory fillerData) = abi.decode(data, (bytes32, bytes, bytes));

        // Process settlement with the message origin, sender, order ID, and receiver
        _handleSettleOrder(
            provenChainId,
            TypeCasts.addressToBytes32(emitter),
            eventOrderId,
            abi.decode(fillerData, (bytes32))
        );

        // _handleSettleOrder checks eligibility with
        // _checkOrderEligibility and simply returns early without
        // reverting if the order isn't eligible. we need to check if
        // the order was settled successfully and revert if not.
        if (orderStatus[eventOrderId] != SETTLED) revert SettlementFailed();
    }

    /**
     * @notice Process a refund proof from a destination chain
     * @param orderId The order ID being refunded
     * @param eventProof The proof of the Refund event from the destination chain
     */
    function handleRefundWithProof(bytes32 orderId, bytes calldata eventProof) external {
        // Verify event using Polymer prover
        (
            uint32 provenChainId,
            address emitter,
            ,  // topics
            bytes memory data
        ) = prover.validateEvent(eventProof);

        // Verify destination contract is registered for the proven chain
        address expectedEmitter = destinationContracts[provenChainId];
        if (expectedEmitter == address(0)) revert UnregisteredDestinationChain();

        // Validate emitter matches registered destination
        if (emitter != expectedEmitter) revert InvalidEmitter();

        // Decode refund-specific data and validate order ID
        bytes32[] memory eventOrderIds = abi.decode(data, (bytes32[]));
        bool found = false;
        for (uint256 i = 0; i < eventOrderIds.length; i++) {
            if (eventOrderIds[i] == orderId) {
                found = true;
                break;
            }
        }
        if (!found) revert InvalidEventData();

        // Process refund with message origin, sender, and order ID
        _handleRefundOrder(
            provenChainId,
            TypeCasts.addressToBytes32(emitter),
            orderId
        );
        
        // Check if order was successfully refunded
        if (orderStatus[orderId] != REFUNDED) revert SettlementFailed();
    }

    // ============ Internal Functions ============

    /**
     * @notice Dispatches a settlement instruction by emitting a Filled event that will be proven on the origin chain
     * @param _originDomain The domain to which the settlement message is sent
     * @param _orderIds The IDs of the orders to settle
     * @param _ordersFillerData The filler data for the orders
     */
    function _dispatchSettle(
        uint32 _originDomain,
        bytes32[] memory _orderIds,
        bytes[] memory _ordersFillerData
    ) internal override {
        // No-op as the Filled event is already emitted in Base7683's fill method
    }

    /**
     * @notice Dispatches a refund instruction by emitting a Refund event that will be proven on the origin chain
     * @param _originDomain The domain to which the refund message is sent
     * @param _orderIds The IDs of the orders to refund
     */
    function _dispatchRefund(
        uint32 _originDomain,
        bytes32[] memory _orderIds
    ) internal override {
        // No-op as Refund event is already emitted in Base7683's refund method
    }

    /**
     * @notice Retrieves the local domain identifier
     * @return The local domain ID (chain ID)
     */
    function _localDomain() internal view override returns (uint32) {
        return uint32(localChainId);
    }

}
