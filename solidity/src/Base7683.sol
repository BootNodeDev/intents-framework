// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;


import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { TypeCasts } from "@hyperlane-xyz/libs/TypeCasts.sol";
import { IPermit2, ISignatureTransfer } from "@uniswap/permit2/src/interfaces/IPermit2.sol";

import {
    GaslessCrossChainOrder,
    OnchainCrossChainOrder,
    ResolvedCrossChainOrder,
    Output,
    FillInstruction,
    IOriginSettler,
    IDestinationSettler
} from "./ERC7683/IERC7683.sol";
import { OrderData, OrderEncoder } from "./libs/OrderEncoder.sol";

abstract contract Base7683 is IOriginSettler, IDestinationSettler {
    // ============ Libraries ============
    using SafeERC20 for IERC20;

    // ============ Constants ============

    IPermit2 public immutable PERMIT2;

    enum OrderStatus {
        UNFILLED,
        OPENED,
        FILLED,
        SETTLED,
        REFUNDED
    }

    bytes32 public constant GASLESS_CROSS_CHAIN_ORDER_TYPEHASH = keccak256(
        "GaslessCrossChainOrder(address originSettler,address user,uint256 nonce,uint64 originChainId,uint32 openDeadline,uint32 fillDeadline,bytes32 orderDataType,bytes orderData)"
    );

    string public constant witnessTypeString = "GaslessCrossChainOrder witness)GaslessCrossChainOrder(address originSettler,address user,uint256 nonce,uint64 originChainId,uint32 openDeadline,uint32 fillDeadline,bytes32 orderDataType,bytes orderData)TokenPermissions(address token,uint256 amount)";

    // ============ Public Storage ============

    mapping(address sender => uint256 nonce) public senderNonce;

    mapping(bytes32 orderId => OrderData orderData) public orders;

    mapping(bytes32 orderId => address filler) public orderFiller;

    mapping(bytes32 orderId => OrderStatus status) public orderStatus;

    // ============ Upgrade Gap ============

    uint256[47] private __GAP;

    // ============ Events ============

    event Filled(bytes32 orderId, bytes originData, bytes fillerData);

    // ============ Errors ============

    error OrderOpenExpired();
    error InvalidOrderType(bytes32 orderType);
    error InvalidSenderNonc();
    error InvalidOriginDomain(uint32 originDomain);
    error InvalidOrderId();
    error OrderFillExpired();
    error InvalidOrderDomain();
    error InvalidOrderStatus();
    error InvalidSenderNonce();

    // ============ Constructor ============

    constructor(address _permit2) {
        PERMIT2 = IPermit2(_permit2);
    }

    // ============ Initializers ============

    // ============ External Functions ============

    /// @notice Opens a gasless cross-chain order on behalf of a user.
    /// @dev To be called by the filler.
    /// @dev This method must emit the Open event
    /// @param order The GaslessCrossChainOrder definition
    /// @param signature The user's signature over the order
    /// @param originFillerData Any filler-defined data required by the settler
    function openFor(
        GaslessCrossChainOrder calldata order,
        bytes calldata signature,
        bytes calldata originFillerData
    )
        external
    {
        if (order.openDeadline > block.timestamp) revert OrderOpenExpired();

        (ResolvedCrossChainOrder memory resolvedOrder, OrderData memory orderData) =
            _resolvedOrder(order.orderDataType, order.user, order.orderData, order.openDeadline, order.fillDeadline);

        bytes32 orderId = _getOrderId(orderData);

        orders[orderId] = orderData;
        orderStatus[orderId] = OrderStatus.OPENED;
        senderNonce[order.user] += 1;

        _permitTransferFrom(order, signature, address(this));

        emit Open(orderId, resolvedOrder);
    }

    /// @notice Opens a cross-chain order
    /// @dev To be called by the user
    /// @dev This method must emit the Open event
    /// @param order The OnchainCrossChainOrder definition
    function open(OnchainCrossChainOrder calldata order) external {
        (ResolvedCrossChainOrder memory resolvedOrder, OrderData memory orderData) = _resolvedOrder(
            order.orderDataType,
            msg.sender,
            order.orderData,
            type(uint32).max, // there is no open deadline for onchain orders since the user is opening it the order
            order.fillDeadline
        );

        bytes32 orderId = _getOrderId(orderData);

        orders[orderId] = orderData;
        orderStatus[orderId] = OrderStatus.OPENED;
        senderNonce[msg.sender] += 1;

        IERC20(TypeCasts.bytes32ToAddress(orderData.inputToken)).safeTransferFrom(
            msg.sender, address(this), orderData.amountIn
        );

        emit Open(orderId, resolvedOrder);
    }

    /// @notice Resolves a specific GaslessCrossChainOrder into a generic ResolvedCrossChainOrder
    /// @dev Intended to improve standardized integration of various order types and settlement contracts
    /// @param order The GaslessCrossChainOrder definition
    /// NOT USED originFillerData Any filler-defined data required by the settler
    /// @return resolvedOrder ResolvedCrossChainOrder hydrated order data including the inputs and outputs of the order
    function resolveFor(
        GaslessCrossChainOrder calldata order,
        bytes calldata
    )
        public
        view
        returns (ResolvedCrossChainOrder memory resolvedOrder)
    {
        (resolvedOrder,) =
            _resolvedOrder(order.orderDataType, order.user, order.orderData, order.openDeadline, order.fillDeadline);
    }

    /// @notice Resolves a specific OnchainCrossChainOrder into a generic ResolvedCrossChainOrder
    /// @dev Intended to improve standardized integration of various order types and settlement contracts
    /// @param order The OnchainCrossChainOrder definition
    /// @return resolvedOrder ResolvedCrossChainOrder hydrated order data including the inputs and outputs of the order
    function resolve(OnchainCrossChainOrder calldata order)
        public
        view
        returns (ResolvedCrossChainOrder memory resolvedOrder)
    {
        (resolvedOrder,) = _resolvedOrder(
            order.orderDataType,
            msg.sender,
            order.orderData,
            type(uint32).max, // there is no open deadline for onchain orders since the user is opening it the order
            order.fillDeadline
        );
    }

    /// @notice Fills a single leg of a particular order on the destination chain
    /// @param _orderId Unique order identifier for this order
    /// @param _originData Data emitted on the origin to parameterize the fill
    /// NOT USED fillerData Data provided by the filler to inform the fill or express their preferences
    function fill(bytes32 _orderId, bytes calldata _originData, bytes calldata) external virtual {
        OrderData memory orderData = OrderEncoder.decode(_originData);

        if (_orderId != _getOrderId(orderData)) revert InvalidOrderId();
        if (orderData.fillDeadline > block.timestamp) revert OrderFillExpired();
        if (orderData.destinationDomain != _localDomain()) revert InvalidOrderDomain();
        _mustHaveRemoteCounterpart(orderData.originDomain);
        if (orderStatus[_orderId] != OrderStatus.UNFILLED) revert InvalidOrderStatus();

        orders[_orderId] = orderData;
        orderStatus[_orderId] = OrderStatus.FILLED;
        orderFiller[_orderId] = msg.sender;

        emit Filled(_orderId, _originData, new bytes(0));

        IERC20(TypeCasts.bytes32ToAddress(orderData.outputToken)).safeTransferFrom(
            msg.sender, TypeCasts.bytes32ToAddress(orderData.recipient), orderData.amountOut
        );
    }

    // ============ Internal Functions ============

    function _getOrderId(OrderData memory orderData) internal pure returns (bytes32) {
        return OrderEncoder.id(orderData);
    }

    function _resolvedOrder(
        bytes32 _orderType,
        address _sender,
        bytes memory _orderData,
        uint32 _openDeadline,
        uint32 _fillDeadline
    )
        internal
        view
        returns (ResolvedCrossChainOrder memory resolvedOrder, OrderData memory orderData)
    {
        if (_orderType != OrderEncoder.orderDataType()) revert InvalidOrderType(_orderType);

        orderData = OrderEncoder.decode(_orderData);

        if (orderData.originDomain != _localDomain()) revert InvalidOriginDomain(orderData.originDomain);
        if (orderData.senderNonce != senderNonce[_sender]) revert InvalidSenderNonce();
        bytes32 destinationSettler = _mustHaveRemoteCounterpart(orderData.destinationDomain);

        // enforce fillDeadline into orderData
        orderData.fillDeadline = _fillDeadline;

        Output[] memory maxSpent = new Output[](1);
        maxSpent[0] = Output({
            token: orderData.outputToken,
            amount: orderData.amountOut,
            recipient: orderData.recipient,
            chainId: orderData.destinationDomain
        });

        Output[] memory minReceived = new Output[](1);
        minReceived[0] = Output({
            token: orderData.inputToken,
            amount: orderData.amountIn,
            recipient: bytes32(0),
            chainId: orderData.originDomain
        });

        FillInstruction[] memory fillInstructions = new FillInstruction[](1);
        fillInstructions[0] = FillInstruction({
            destinationChainId: orderData.destinationDomain,
            destinationSettler: destinationSettler,
            originData: OrderEncoder.encode(orderData)
        });

        resolvedOrder = ResolvedCrossChainOrder({
            user: _sender,
            originChainId: _localDomain(),
            openDeadline: _openDeadline,
            fillDeadline: _fillDeadline,
            minReceived: minReceived,
            maxSpent: maxSpent,
            fillInstructions: fillInstructions
        });
    }

    function _permitTransferFrom(GaslessCrossChainOrder calldata order, bytes calldata signature, address receiver) internal {
        OrderData memory orderData = OrderEncoder.decode(order.orderData);

        PERMIT2.permitWitnessTransferFrom(
            ISignatureTransfer.PermitTransferFrom({
                permitted: ISignatureTransfer.TokenPermissions({
                  token: TypeCasts.bytes32ToAddress(orderData.inputToken),
                  amount: orderData.amountIn
                }),
                nonce: order.nonce,
                deadline: order.openDeadline
            }),
            ISignatureTransfer.SignatureTransferDetails({to: receiver, requestedAmount: orderData.amountIn}),
            order.user,
            _witnessHash(order),
            witnessTypeString,
            signature
        );
    }

    function _witnessHash(GaslessCrossChainOrder calldata order) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                GASLESS_CROSS_CHAIN_ORDER_TYPEHASH,
                order.originSettler,
                order.user,
                order.nonce,
                order.originChainId,
                order.openDeadline,
                order.fillDeadline,
                order.orderDataType,
                order.orderData
            )
        );
    }

    function _mustHaveRemoteCounterpart(uint32 _domain) internal virtual view returns (bytes32);

    function _localDomain() internal virtual view returns (uint32);
}
