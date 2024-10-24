// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { Test } from "forge-std/Test.sol";
import { console2 } from "forge-std/console2.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {DeployPermit2} from "@uniswap/permit2/test/utils/DeployPermit2.sol";
import { TypeCasts } from "@hyperlane-xyz/libs/TypeCasts.sol";

import {
    GaslessCrossChainOrder,
    OnchainCrossChainOrder,
    ResolvedCrossChainOrder,
    Output,
    FillInstruction
} from "../src/ERC7683/IERC7683.sol";
import { OrderData, OrderEncoder } from "../src/libs/OrderEncoder.sol";
import { Base7683 } from "../src/Router7683.sol";

contract Base7683ForTest is Base7683 {
    bytes32 public counterpart;

    constructor(address _permit2) Base7683(_permit2) {}

    function setCounterpart(bytes32 _counterpart) public {
        counterpart = _counterpart;
    }

    function _mustHaveRemoteCounterpart(uint32 _domain) internal virtual override view returns (bytes32) {
        return counterpart;
    }

    function _localDomain() internal virtual override view returns (uint32) {
        return 1;
    }

    function localDomain() public view returns (uint32) {
        return _localDomain();
    }
}

contract Base7683Test is Test, DeployPermit2 {
    Base7683ForTest internal base;
    address permit2;
    ERC20 internal inputToken;
    ERC20 internal outputToken;

    address internal kakaroto = makeAddr("kakaroto");
    address internal karpincho = makeAddr("karpincho");
    address internal vegeta = makeAddr("vegeta");
    address internal counterpart = makeAddr("counterpart");

    uint32 internal origin = 1;
    uint32 internal destination = 2;
    uint256 internal amount = 100;

    function setUp() public {
        inputToken = new ERC20("Input Token", "IN");
        outputToken = new ERC20("Output Token", "OUT");
        permit2 = deployPermit2();
        base = new Base7683ForTest(permit2);
        base.setCounterpart(TypeCasts.addressToBytes32(counterpart));
    }

    function prepareOrderData() internal returns (OrderData memory) {
        return OrderData({
            sender: TypeCasts.addressToBytes32(kakaroto),
            recipient: TypeCasts.addressToBytes32(karpincho),
            inputToken: TypeCasts.addressToBytes32(address(inputToken)),
            outputToken: TypeCasts.addressToBytes32(address(outputToken)),
            amountIn: amount,
            amountOut: amount,
            senderNonce: base.senderNonce(kakaroto),
            originDomain: origin,
            destinationDomain: destination,
            fillDeadline: uint32(block.timestamp + 100),
            data: new bytes(0)
        });
    }

    function prepareOnchainOrder(OrderData memory orderData, uint32 fillDeadline, bytes32 orderDataType) internal returns (OnchainCrossChainOrder memory) {
        return OnchainCrossChainOrder({
            fillDeadline: fillDeadline,
            orderDataType: orderDataType,
            orderData: OrderEncoder.encode(orderData)
        });
    }

    function prepareGaslessOrder(OrderData memory orderData, uint32 openDeadline, uint32 fillDeadline, bytes32 orderDataType) internal returns (GaslessCrossChainOrder memory) {
        return GaslessCrossChainOrder({
            originSettler: address(base),
            user: kakaroto,
            nonce: base.senderNonce(kakaroto),
            originChainId: uint64(origin),
            openDeadline: openDeadline,
            fillDeadline: fillDeadline,
            orderDataType: orderDataType,
            orderData: OrderEncoder.encode(orderData)
        });
    }

    // open

    // openFor

    // resolve
    function test_resolve_works(uint32 _fillDeadline) public {
        OrderData memory orderData = prepareOrderData();
        OnchainCrossChainOrder memory order = prepareOnchainOrder(orderData, _fillDeadline, OrderEncoder.orderDataType());

        vm.prank(karpincho);
        ResolvedCrossChainOrder memory resolvedOrder = base.resolve(order);

        assertEq(resolvedOrder.maxSpent.length, 1);
        assertEq(resolvedOrder.maxSpent[0].token, TypeCasts.addressToBytes32(address(outputToken)));
        assertEq(resolvedOrder.maxSpent[0].amount, amount);
        assertEq(resolvedOrder.maxSpent[0].recipient, TypeCasts.addressToBytes32(karpincho));
        assertEq(resolvedOrder.maxSpent[0].chainId, destination);

        assertEq(resolvedOrder.minReceived.length, 1);
        assertEq(resolvedOrder.minReceived[0].token, TypeCasts.addressToBytes32(address(inputToken)));
        assertEq(resolvedOrder.minReceived[0].amount, amount);
        assertEq(resolvedOrder.minReceived[0].recipient, bytes32(0));
        assertEq(resolvedOrder.minReceived[0].chainId, origin);

        assertEq(resolvedOrder.fillInstructions.length, 1);
        assertEq(resolvedOrder.fillInstructions[0].destinationChainId, destination);
        assertEq(resolvedOrder.fillInstructions[0].destinationSettler, base.counterpart());

        orderData.fillDeadline = _fillDeadline;
        assertEq(resolvedOrder.fillInstructions[0].originData, OrderEncoder.encode(orderData));

        assertEq(resolvedOrder.user, karpincho);
        assertEq(resolvedOrder.originChainId, base.localDomain());
        assertEq(resolvedOrder.openDeadline, type(uint32).max);
        assertEq(resolvedOrder.fillDeadline, _fillDeadline);
    }

    // resolveFor
    function test_resolveFor_works(uint32 _fillDeadline, uint32 _openDeadline) public {
        OrderData memory orderData = prepareOrderData();
        GaslessCrossChainOrder memory order = prepareGaslessOrder(orderData, _openDeadline, _fillDeadline, OrderEncoder.orderDataType());

        vm.prank(karpincho);
        ResolvedCrossChainOrder memory resolvedOrder = base.resolveFor(order, new bytes(0));

        assertEq(resolvedOrder.maxSpent.length, 1);
        assertEq(resolvedOrder.maxSpent[0].token, TypeCasts.addressToBytes32(address(outputToken)));
        assertEq(resolvedOrder.maxSpent[0].amount, amount);
        assertEq(resolvedOrder.maxSpent[0].recipient, TypeCasts.addressToBytes32(karpincho));
        assertEq(resolvedOrder.maxSpent[0].chainId, destination);

        assertEq(resolvedOrder.minReceived.length, 1);
        assertEq(resolvedOrder.minReceived[0].token, TypeCasts.addressToBytes32(address(inputToken)));
        assertEq(resolvedOrder.minReceived[0].amount, amount);
        assertEq(resolvedOrder.minReceived[0].recipient, bytes32(0));
        assertEq(resolvedOrder.minReceived[0].chainId, origin);

        assertEq(resolvedOrder.fillInstructions.length, 1);
        assertEq(resolvedOrder.fillInstructions[0].destinationChainId, destination);
        assertEq(resolvedOrder.fillInstructions[0].destinationSettler, base.counterpart());

        orderData.fillDeadline = _fillDeadline;
        assertEq(resolvedOrder.fillInstructions[0].originData, OrderEncoder.encode(orderData));

        assertEq(resolvedOrder.user, kakaroto);
        assertEq(resolvedOrder.originChainId, base.localDomain());
        assertEq(resolvedOrder.openDeadline, _openDeadline);
        assertEq(resolvedOrder.fillDeadline, _fillDeadline);
    }

    // fill
}
