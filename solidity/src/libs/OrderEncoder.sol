// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

struct OrderData {
    bytes32 sender;
    bytes32 recipient;
    bytes32 inputToken;
    bytes32 outputToken;
    uint256 amountIn;
    uint256 amountOut;
    uint256 senderNonce;
    uint32 originDomain;
    uint32 destinationDomain;
    uint32 fillDeadline;
    bytes data;
}

library OrderEncoder {
    bytes constant ORDER_DATA_TYPE = abi.encodePacked(
        "OrderData(",
        "bytes32 sender,",
        "bytes32 recipient,",
        "bytes32 inputToken,",
        "bytes32 outputToken,",
        "uint256 amountIn,",
        "uint256 amountOut,",
        "uint256 senderNonce,",
        "uint32 originDomain,",
        "uint32 destinationDomain,",
        "uint32 fillDeadline,",
        "bytes data)"
    );

    bytes32 constant ORDER_DATA_TYPE_HASH = keccak256(ORDER_DATA_TYPE);

    function orderDataType() internal pure returns (bytes32) {
        return ORDER_DATA_TYPE_HASH;
    }

    function id(OrderData memory order) internal pure returns (bytes32) {
        return keccak256(encode(order));
    }

    function encode(OrderData memory order) internal pure returns (bytes memory) {
        return abi.encode(
            order.sender,
            order.recipient,
            order.inputToken,
            order.outputToken,
            order.amountIn,
            order.amountOut,
            order.senderNonce,
            order.originDomain,
            order.destinationDomain,
            order.fillDeadline,
            order.data
        );
    }

    function decode(bytes memory orderBytes) internal pure returns (OrderData memory) {
        (
            bytes32 sender,
            bytes32 recipient,
            bytes32 inputToken,
            bytes32 outputToken,
            uint256 amountIn,
            uint256 amountOut,
            uint256 senderNonce,
            uint32 originDomain,
            uint32 destinationDomain,
            uint32 fillDeadline,
            bytes memory data
        ) = abi.decode(orderBytes, (bytes32, bytes32, bytes32, bytes32, uint256, uint256, uint256, uint32, uint32, uint32, bytes));

        return OrderData(
            sender,
            recipient,
            inputToken,
            outputToken,
            amountIn,
            amountOut,
            senderNonce,
            originDomain,
            destinationDomain,
            fillDeadline,
            data
        );
    }
}
