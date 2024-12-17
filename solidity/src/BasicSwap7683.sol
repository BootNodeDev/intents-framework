// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import { GasRouter } from "@hyperlane-xyz/client/GasRouter.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { TypeCasts } from "@hyperlane-xyz/libs/TypeCasts.sol";

import { Base7683 } from "./Base7683.sol";
import { OrderData, OrderEncoder } from "./libs/OrderEncoder.sol";
import { Hyperlane7683Message } from "./libs/Hyperlane7683Message.sol";

import {
    GaslessCrossChainOrder,
    OnchainCrossChainOrder,
    ResolvedCrossChainOrder,
    Output,
    FillInstruction,
    IOriginSettler,
    IDestinationSettler
} from "./ERC7683/IERC7683.sol";

abstract contract BasicSwap7683 is Base7683 {
    // ============ Libraries ============
    using SafeERC20 for IERC20;

    // ============ Constants ============
    bytes32 public constant SETTLED = "SETTLED";
    bytes32 public constant REFUNDED = "REFUNDED";

    // ============ Public Storage ============

    // ============ Upgrade Gap ============

    uint256[47] private __GAP;

    // ============ Events ============
    event Refund(bytes32[] orderIds);
    event Settled(bytes32 orderId, address receiver);
    event Refunded(bytes32 orderId, address receiver);

    // ============ Errors ============

    error InvalidOrderOrigin();
    error InvalidOrderType(bytes32 orderType);
    error InvalidOriginDomain(uint32 originDomain);
    error InvalidOrderId();
    error OrderFillExpired();
    error InvalidOrderDomain();
    error OrderFillNotExpired();
    error InvalidDomain();
    error InvalidSender();

    // ============ Modifiers ============

    // ============ Constructor ============

    constructor(address _permit2) Base7683(_permit2) { }

    // ============ Initializers ============

    // ============ External Functions ============

    function refund(GaslessCrossChainOrder[] memory _orders) external payable {
        bytes32[] memory orderIds = new bytes32[](_orders.length);
        for (uint256 i = 0; i < _orders.length; i += 1) {
            orderIds[i] = _refundOrder(_orders[i].orderData);
        }

        _dispatchRefund(OrderEncoder.decode(_orders[0].orderData).originDomain, orderIds);

        emit Refund(orderIds);
    }

    function refund(OnchainCrossChainOrder[] memory _orders) external payable {
        bytes32[] memory orderIds = new bytes32[](_orders.length);
        for (uint256 i = 0; i < _orders.length; i += 1) {
            orderIds[i] = _refundOrder(_orders[i].orderData);
        }

        _dispatchRefund(OrderEncoder.decode(_orders[0].orderData).originDomain, orderIds);

        emit Refund(orderIds);
    }

    // ============ Internal Functions ============

    function _settleOrders(bytes32[] calldata _orderIds, bytes[] memory ordersFillerData) internal override {
        uint32 originDomain = OrderEncoder.decode(ordersFillerData[0]).originDomain;

        _dispatchSettle(OrderEncoder.decode(ordersFillerData[0]).originDomain, _orderIds, ordersFillerData);
    }

    /**
     * @dev There is no need to check for if order destinationDomain is the _handle origin since it is checked when
     * filling the order and only filled orders can be settled. Regarding the originDomain it gets checked indirectly
     * on _handle with if (orderStatus[_orderIds[i]] != OPENED) continue;
     */
    function _handleSettleOrder(bytes32 _orderId, bytes32 _receiver) internal {
        ResolvedCrossChainOrder memory resolvedOrder = abi.decode(orders[_orderId], (ResolvedCrossChainOrder));

        OrderData memory orderData = OrderEncoder.decode(resolvedOrder.fillInstructions[0].originData);

        orderStatus[_orderId] = SETTLED;

        address receiver = TypeCasts.bytes32ToAddress(_receiver);

        emit Settled(_orderId, receiver);

        IERC20(TypeCasts.bytes32ToAddress(orderData.inputToken)).safeTransfer(receiver, orderData.amountIn);
    }

    /**
     * @dev There is no need to check for if order destinationDomain is the _handle origin since it is checked on
     * _refundOrder when the refund is requested. Regarding the originDomain it gets checked indirectly
     * on _handle with if (orderStatus[_orderIds[i]] != OPENED) continue;
     */
    function _handleRefundOrder(bytes32 _orderId) internal {
        ResolvedCrossChainOrder memory resolvedOrder = abi.decode(orders[_orderId], (ResolvedCrossChainOrder));

        OrderData memory orderData = OrderEncoder.decode(resolvedOrder.fillInstructions[0].originData);

        orderStatus[_orderId] = REFUNDED;

        address orderSender = TypeCasts.bytes32ToAddress(orderData.sender);

        emit Refunded(_orderId, orderSender);

        IERC20(TypeCasts.bytes32ToAddress(orderData.inputToken)).safeTransfer(orderSender, orderData.amountIn);
    }

    function _refundOrder(bytes memory _orderData) internal virtual returns (bytes32 orderId) {
        OrderData memory orderData = OrderEncoder.decode(_orderData);
        orderId = OrderEncoder.id(orderData);

        if (orderStatus[orderId] != UNKNOWN) revert InvalidOrderStatus();
        if (block.timestamp <= orderData.fillDeadline) revert OrderFillNotExpired();
        if (orderData.destinationDomain != _localDomain()) revert InvalidOrderDomain();
        // _mustHaveRemoteCounterpart(orderData.originDomain);

        orderStatus[orderId] = REFUNDED;
        return orderId;
    }

    // function _mustHaveRemoteCounterpart(uint32 _domain) internal view virtual returns (bytes32) {
    //     return _mustHaveRemoteRouter(_domain);
    // }

    function _resolveOrder(GaslessCrossChainOrder memory order)
        internal
        view
        virtual
        override
        returns (ResolvedCrossChainOrder memory, bytes32 orderId, uint256 nonce)
    {
        return _resolvedOrder(order.orderDataType, order.user, order.openDeadline, order.fillDeadline, order.orderData);
    }

    /**
     * @dev To be implemented by the inheriting contract with specific logic fot the orderDataType and orderData
     */
    function _resolveOrder(OnchainCrossChainOrder memory order)
        internal
        view
        virtual
        override
        returns (ResolvedCrossChainOrder memory, bytes32 orderId, uint256 nonce)
    {
        return _resolvedOrder(order.orderDataType, msg.sender, type(uint32).max, order.fillDeadline, order.orderData);
    }

    function _resolvedOrder(
        bytes32 _orderType,
        address _sender,
        uint32 _openDeadline,
        uint32 _fillDeadline,
        bytes memory _orderData
    )
        internal
        view
        returns (ResolvedCrossChainOrder memory resolvedOrder, bytes32 orderId, uint256 nonce)
    {
        if (_orderType != OrderEncoder.orderDataType()) revert InvalidOrderType(_orderType);

        // IDEA: _orderData should not be directly typed as OrderData, it should contain information that is not
        // present on the type used for open the order. So _fillDeadline and _user should be passed as arguments
        OrderData memory orderData = OrderEncoder.decode(_orderData);

        if (orderData.originDomain != _localDomain()) revert InvalidOriginDomain(orderData.originDomain);

        // bytes32 destinationSettler = _mustHaveRemoteCounterpart(orderData.destinationDomain);

        // enforce fillDeadline into orderData
        orderData.fillDeadline = _fillDeadline;
        // enforce sender into orderData
        orderData.sender = TypeCasts.addressToBytes32(_sender);

        // this can be used by the filler to approve the tokens to be spent on destination
        Output[] memory maxSpent = new Output[](1);
        maxSpent[0] = Output({
            token: orderData.outputToken,
            amount: orderData.amountOut,
            recipient: orderData.destinationSettler,
            chainId: orderData.destinationDomain
        });

        // this can be used by the filler know how much it can expect to receive
        Output[] memory minReceived = new Output[](1);
        minReceived[0] = Output({
            token: orderData.inputToken,
            amount: orderData.amountIn,
            recipient: bytes32(0),
            chainId: orderData.originDomain
        });

        // this can be user by the filler to know how to fill the order
        FillInstruction[] memory fillInstructions = new FillInstruction[](1);
        fillInstructions[0] = FillInstruction({
            destinationChainId: orderData.destinationDomain,
            destinationSettler: orderData.destinationSettler,
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

        orderId = OrderEncoder.id(orderData);
        nonce = orderData.senderNonce;
    }

    function _fillOrder(bytes32 _orderId, bytes calldata _originData, bytes calldata) internal override {
        OrderData memory orderData = OrderEncoder.decode(_originData);

        if (_orderId != OrderEncoder.id(orderData)) revert InvalidOrderId();
        if (block.timestamp > orderData.fillDeadline) revert OrderFillExpired();
        if (orderData.destinationDomain != _localDomain()) revert InvalidOrderDomain();

        IERC20(TypeCasts.bytes32ToAddress(orderData.outputToken)).safeTransferFrom(
            msg.sender, TypeCasts.bytes32ToAddress(orderData.recipient), orderData.amountOut
        );
    }

    function _dispatchSettle(
        uint32 _originDomain,
        bytes32[] memory _orderIds,
        bytes[] memory _ordersFillerData
    )
        internal
        virtual;

    function _dispatchRefund(uint32 _originDomain, bytes32[] memory _orderIds) internal virtual;
}
